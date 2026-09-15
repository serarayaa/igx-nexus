import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { demoTechnologyProvider, type TechnologyProvider } from "./provider.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("NEXUS API provider mode", () => {
  it("exposes safe demo provider metadata and remains ready", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }) });

    const descriptor = await app.inject({ method: "GET", url: "/api/v1/provider" });
    expect(descriptor.statusCode).toBe(200);
    expect(descriptor.json()).toEqual({
      id: "demo.canonical.v0.2",
      mode: "demo",
      displayName: "Canonical Demo Provider",
      availability: "ready",
      capabilities: ["technology.snapshot.read"],
      sourceSystems: ["demo"],
    });

    const readiness = await app.inject({ method: "GET", url: "/ready" });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toMatchObject({
      status: "ready",
      providerMode: "demo",
      providerAvailability: "ready",
    });
  });

  it("keeps liveness up but fails readiness when live mode has no implementation", async () => {
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    app = await buildApp({ config });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      status: "ok",
      providerMode: "live",
      providerAvailability: "unavailable",
    });

    const readiness = await app.inject({ method: "GET", url: "/ready" });
    expect(readiness.statusCode).toBe(503);
    expect(readiness.json()).toMatchObject({
      status: "not_ready",
      providerMode: "live",
      providerAvailability: "unavailable",
    });

    const descriptor = await app.inject({ method: "GET", url: "/api/v1/provider" });
    expect(descriptor.json()).toEqual({
      id: "live.unconfigured",
      mode: "live",
      displayName: "Live Provider",
      availability: "unavailable",
      capabilities: [],
      sourceSystems: [],
    });
    expect(descriptor.body).not.toContain("DEMO-0007");
    expect(descriptor.body).not.toContain("DEMO-0013");
  });

  it("becomes ready when a matching live provider is injected at composition time", async () => {
    const liveProvider: TechnologyProvider = {
      descriptor: {
        id: "test.live",
        mode: "live",
        displayName: "Test Live Provider",
        availability: "ready",
        capabilities: ["technology.snapshot.read"],
        sourceSystems: ["custom:test"],
      },
      async getSnapshot() {
        return demoTechnologyProvider.getSnapshot();
      },
    };

    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    app = await buildApp({ config, technologyProvider: liveProvider });

    expect((await app.inject({ method: "GET", url: "/ready" })).statusCode).toBe(200);
    expect((await app.inject({ method: "GET", url: "/api/v1/provider" })).json()).toMatchObject({
      id: "test.live",
      mode: "live",
      availability: "ready",
      sourceSystems: ["custom:test"],
    });
  });

  it("documents provider metadata in OpenAPI without changing the API v1 root contract", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }) });

    const root = await app.inject({ method: "GET", url: "/api/v1" });
    expect(root.json()).toEqual({
      service: "nexus-api",
      serviceVersion: "0.2.0-dev",
      apiVersion: "v1",
      technologySchemaVersion: "0.2",
    });

    const openApi = (await app.inject({ method: "GET", url: "/openapi.json" })).json<{
      paths?: Record<string, unknown>;
    }>();
    expect(openApi.paths).toHaveProperty("/api/v1/provider");
  });
});
