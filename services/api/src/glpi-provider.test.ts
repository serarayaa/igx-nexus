import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGlpiLiveTechnologyProvider } from "./glpi-provider.js";
import type { GlpiApiTransport } from "./glpi.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("GLPI Live TechnologyProvider readiness", () => {
  it("uses a bounded read-only probe and reports ready when GLPI responds with a valid collection", async () => {
    const calls: Array<{ path: string; query: unknown }> = [];
    const transport: GlpiApiTransport = {
      async get(path, query = {}) {
        calls.push({ path, query });
        return [];
      },
    };
    const provider = createGlpiLiveTechnologyProvider({ transport });

    await expect(provider.checkAvailability?.()).resolves.toBe("ready");
    expect(calls).toEqual([{ path: "Assets/Computer", query: { start: 0, limit: 1 } }]);
  });

  it("fails readiness closed when connectivity/auth or payload validation fails", async () => {
    const throwing = createGlpiLiveTechnologyProvider({
      transport: { async get() { throw new Error("upstream detail that must not escape readiness"); } },
    });
    const wrongShape = createGlpiLiveTechnologyProvider({
      transport: { async get() { return { data: [] }; } },
    });
    const invalidRecord = createGlpiLiveTechnologyProvider({
      transport: { async get() { return [{ name: "missing-id" }]; } },
    });

    await expect(throwing.checkAvailability?.()).resolves.toBe("unavailable");
    await expect(wrongShape.checkAvailability?.()).resolves.toBe("unavailable");
    await expect(invalidRecord.checkAvailability?.()).resolves.toBe("unavailable");
  });

  it("makes /ready reflect GLPI runtime availability without taking /health down", async () => {
    const provider = createGlpiLiveTechnologyProvider({
      transport: { async get() { throw new Error("GLPI unavailable"); } },
    });
    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      technologyProvider: provider,
    });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", providerMode: "live" });

    const readiness = await app.inject({ method: "GET", url: "/ready" });
    expect(readiness.statusCode).toBe(503);
    expect(readiness.json()).toMatchObject({
      status: "not_ready",
      providerMode: "live",
      providerAvailability: "unavailable",
    });
  });

  it("returns /ready 200 when the GLPI probe is valid", async () => {
    const provider = createGlpiLiveTechnologyProvider({
      transport: { async get() { return []; } },
    });
    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      technologyProvider: provider,
    });

    const readiness = await app.inject({ method: "GET", url: "/ready" });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json()).toMatchObject({
      status: "ready",
      providerMode: "live",
      providerAvailability: "ready",
    });
  });
});
