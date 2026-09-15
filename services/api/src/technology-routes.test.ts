import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import {
  demoTechnologyProvider,
  ProviderUnavailableError,
  type TechnologyProvider,
} from "./provider.js";
import type { AuthenticationProvider } from "./security.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

const readerAuthenticationProvider: AuthenticationProvider = Object.freeze({
  async authenticate() {
    return Object.freeze({
      subject: "test-reader",
      kind: "service" as const,
      authSource: "test",
      roles: Object.freeze(["reader"]),
      permissions: new Set(["technology:read"] as const),
    });
  },
});

describe("Technology snapshot route", () => {
  it("denies unauthenticated access to canonical asset data", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }) });

    const response = await app.inject({ method: "GET", url: "/api/v1/technology/snapshot" });
    expect(response.statusCode).toBe(401);
    expect(response.body).not.toContain("DEMO-0007");
  });

  it("returns the canonical snapshot to technology readers", async () => {
    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test" }),
      authenticationProvider: readerAuthenticationProvider,
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/technology/snapshot" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      schemaVersion: "0.2",
      assets: [{ id: "DEMO-0007" }, { id: "DEMO-0013" }],
    });
  });

  it("maps an explicitly unavailable provider to a safe 503", async () => {
    const unavailableProvider: TechnologyProvider = {
      descriptor: {
        id: "test.unavailable",
        mode: "live",
        displayName: "Unavailable test provider",
        availability: "ready",
        capabilities: ["technology.snapshot.read"],
        sourceSystems: ["custom:test"],
      },
      async getSnapshot() {
        throw new ProviderUnavailableError();
      },
    };
    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      authenticationProvider: readerAuthenticationProvider,
      technologyProvider: unavailableProvider,
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/technology/snapshot" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: "TECHNOLOGY_PROVIDER_UNAVAILABLE" });
  });

  it("documents the protected snapshot route in OpenAPI", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }) });
    const openApi = (await app.inject({ method: "GET", url: "/openapi.json" })).json<{
      paths?: Record<string, unknown>;
    }>();
    expect(openApi.paths).toHaveProperty("/api/v1/technology/snapshot");
  });
});
