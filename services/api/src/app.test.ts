import { technologySchemaVersion } from "@igx-nexus/types";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const testConfig = loadConfig({ NEXUS_API_ENV: "test" });

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("NEXUS API runtime", () => {
  it("builds without opening a network listener", async () => {
    app = await buildApp({ config: testConfig });
    expect(app.server.listening).toBe(false);
  });

  it.each([
    ["/health", "ok"],
    ["/ready", "ready"],
  ])("serves %s", async (url, status) => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: "GET", url });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status,
      service: "nexus-api",
      apiVersion: "v1",
      technologySchemaVersion,
    });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("exposes versioned API metadata backed by canonical contracts", async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: "GET", url: "/api/v1" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "nexus-api",
      serviceVersion: "0.2.0-dev",
      apiVersion: "v1",
      technologySchemaVersion,
    });
  });

  it("generates OpenAPI from registered runtime routes", async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: "GET", url: "/openapi.json" });
    const document = response.json<Record<string, unknown>>() as {
      openapi?: string;
      paths?: Record<string, unknown>;
      info?: { title?: string };
    };

    expect(response.statusCode).toBe(200);
    expect(document.openapi).toBe("3.0.3");
    expect(document.info?.title).toBe("IGX NEXUS API");
    expect(document.paths).toHaveProperty("/health");
    expect(document.paths).toHaveProperty("/ready");
    expect(document.paths).toHaveProperty("/api/v1");
  });

  it("normalizes 404 responses and correlates request IDs", async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: "GET", url: "/missing" });
    const body = response.json<{ requestId: string }>();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      code: "ROUTE_NOT_FOUND",
      statusCode: 404,
      message: "Route not found",
    });
    expect(body.requestId).toBe(response.headers["x-request-id"]);
  });

  it("does not leak internal error details", async () => {
    app = await buildApp({ config: testConfig });
    app.get("/__test/error", async () => {
      throw new Error("synthetic secret detail");
    });

    const response = await app.inject({ method: "GET", url: "/__test/error" });
    const rawBody = response.body;

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      statusCode: 500,
      message: "Internal server error",
    });
    expect(rawBody).not.toContain("synthetic secret detail");
  });

  it("adds API security headers without pretending TLS termination", async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({ method: "GET", url: "/api/v1" });

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBeTruthy();
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });

  it("denies cross-origin access by default", async () => {
    app = await buildApp({ config: testConfig });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { origin: "http://127.0.0.1:3000" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows only configured CORS origins and strict preflight", async () => {
    const config = loadConfig({
      NEXUS_API_ENV: "test",
      NEXUS_API_CORS_ORIGINS: "http://127.0.0.1:3000",
    });
    app = await buildApp({ config });

    const allowed = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { origin: "http://127.0.0.1:3000" },
    });
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:3000");
    expect(allowed.headers["access-control-allow-credentials"]).toBeUndefined();

    const denied = await app.inject({
      method: "GET",
      url: "/api/v1",
      headers: { origin: "http://evil.example" },
    });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();

    const preflight = await app.inject({
      method: "OPTIONS",
      url: "/api/v1",
      headers: {
        origin: "http://127.0.0.1:3000",
        "access-control-request-method": "GET",
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:3000");
  });

  it("normalizes oversized payload errors", async () => {
    const config = loadConfig({
      NEXUS_API_ENV: "test",
      NEXUS_API_BODY_LIMIT_BYTES: "1024",
    });
    app = await buildApp({ config });
    app.post("/__test/body", async (request) => ({ body: request.body }));

    const response = await app.inject({
      method: "POST",
      url: "/__test/body",
      payload: { value: "x".repeat(2_000) },
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      statusCode: 413,
      message: "Request payload too large",
    });
  });

  it("rate limits API routes while keeping liveness/readiness exempt", async () => {
    const config = loadConfig({
      NEXUS_API_ENV: "test",
      NEXUS_API_RATE_LIMIT_MAX: "1",
      NEXUS_API_RATE_LIMIT_WINDOW_MS: "60000",
    });
    app = await buildApp({ config });

    expect((await app.inject({ method: "GET", url: "/api/v1" })).statusCode).toBe(200);
    const limited = await app.inject({ method: "GET", url: "/api/v1" });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toMatchObject({
      code: "RATE_LIMITED",
      statusCode: 429,
      message: "Too many requests",
    });

    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/ready" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/ready" })).statusCode).toBe(200);
  });
});
