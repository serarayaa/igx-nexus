import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import {
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

  it("returns the complete canonical demo snapshot to technology readers", async () => {
    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test" }),
      authenticationProvider: readerAuthenticationProvider,
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/technology/snapshot" });
    expect(response.statusCode).toBe(200);
    const body = response.json<{
      schemaVersion: string;
      assets: readonly { id: string }[];
    }>();
    expect(body.schemaVersion).toBe("0.2");
    expect(body.assets).toHaveLength(240);
    expect(body.assets[0]?.id).toBe("DEMO-0001");
    expect(body.assets[6]?.id).toBe("DEMO-0007");
    expect(body.assets[12]?.id).toBe("DEMO-0013");
    expect(body.assets[239]?.id).toBe("DEMO-0240");
  });

  it("maps an unavailable provider to a safe, masked 503", async () => {
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
    expect(response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      statusCode: 503,
      message: "Internal server error",
    });
    expect(response.body).not.toContain("TECHNOLOGY_PROVIDER_UNAVAILABLE");
  });

  it("documents the protected snapshot route in OpenAPI", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }) });
    const openApi = (await app.inject({ method: "GET", url: "/openapi.json" })).json<{
      paths?: Record<string, unknown>;
    }>();
    expect(openApi.paths).toHaveProperty("/api/v1/technology/snapshot");
  });
});
