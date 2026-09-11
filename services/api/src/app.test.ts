import { technologySchemaVersion } from "@igx-nexus/types";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import type { ApiConfig } from "./config.js";

const testConfig: ApiConfig = {
  environment: "test",
  host: "127.0.0.1",
  port: 3100,
  logLevel: "silent",
};

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
});
