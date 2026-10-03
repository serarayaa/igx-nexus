import { parseTechnologySnapshot } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGlpiLiveTechnologyProvider } from "./glpi-provider.js";
import type { GlpiApiTransport } from "./glpi.js";
import type { TechnologyProvider } from "./provider.js";
import type { AuthenticationProvider } from "./security.js";

const OBSERVED_AT = "2026-10-03T12:00:00.000Z";
const SOURCE_INSTANCE_ID = "glpi-ci";

const readerAuthenticationProvider: AuthenticationProvider = Object.freeze({
  async authenticate() {
    return Object.freeze({
      subject: "ci-reader",
      kind: "service" as const,
      authSource: "ci",
      roles: Object.freeze(["reader"]),
      permissions: new Set(["technology:read"] as const),
    });
  },
});

function glpiComputer() {
  return {
    id: 42,
    name: "CI-HMI-42",
    serial: "SYNTH-CI-42",
    otherserial: "CI-ASSET-0042",
    uuid: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    is_deleted: false,
    is_dynamic: true,
    date_creation: "2026-01-02T10:00:00+00:00",
    date_mod: "2026-10-03T11:55:00+00:00",
    last_inventory_update: "2026-10-03T11:50:00+00:00",
    last_boot: "2026-10-03T09:00:00+00:00",
    status: { id: 1, name: "Active" },
    entity: { id: 0, name: "Synthetic root", completename: "Synthetic root" },
    manufacturer: { id: 7, name: "Synthetic Vendor" },
    location: { id: 3, name: "Synthetic Lab" },
    type: { id: 19, name: "HMI" },
    model: { id: 11, name: "Synthetic Model" },
  };
}

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) await app.close();
  app = undefined;
});

describe("Backend vertical integration contract", () => {
  it("preserves GLPI evidence across provider -> API JSON -> strict canonical parser", async () => {
    const calls: Array<{ readonly path: string; readonly start: number; readonly limit: number }> = [];
    const transport: GlpiApiTransport = {
      async get(path, query = {}) {
        const start = Number(query.start ?? 0);
        const limit = Number(query.limit ?? 0);
        calls.push({ path, start, limit });
        return start === 0 ? [glpiComputer()] : [];
      },
    };

    const provider = createGlpiLiveTechnologyProvider({
      transport,
      sourceInstanceId: SOURCE_INSTANCE_ID,
      pageSize: 10,
      maxRecords: 10,
      now: () => new Date(OBSERVED_AT),
    });

    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      authenticationProvider: readerAuthenticationProvider,
      technologyProvider: provider,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/technology/snapshot",
    });
    expect(response.statusCode).toBe(200);

    const wirePayload: unknown = JSON.parse(response.body);
    const snapshot = parseTechnologySnapshot(wirePayload);
    expect(snapshot.schemaVersion).toBe("0.2");
    expect(snapshot.asOf).toBe(OBSERVED_AT);
    expect(snapshot.assets).toHaveLength(1);
    expect(snapshot.relationships).toEqual([]);
    expect(snapshot.observations).toEqual([]);

    const asset = snapshot.assets[0]!;
    expect(asset).toMatchObject({
      displayName: "CI-HMI-42",
      domain: "OT",
      assetClass: "operator_interface",
      role: "supervision",
      operationalContexts: [],
    });
    expect(asset.taxonomy).toMatchObject({
      taxonomyVersion: "2",
      domain: { state: "classified", value: "OT", method: "normalized", reviewRequired: true },
      assetClass: { state: "classified", value: "operator_interface", reviewRequired: true },
      role: { state: "classified", value: "supervision", method: "inferred", reviewRequired: true },
    });
    expect(asset.sourceReferences).toEqual([
      expect.objectContaining({
        source: "glpi",
        sourceInstanceId: SOURCE_INSTANCE_ID,
        externalId: "42",
        authority: "authoritative",
      }),
    ]);
    expect(asset.provenance.length).toBeGreaterThan(0);
    expect(asset.provenance.some(record => record.fieldPath === "domain")).toBe(true);
    expect(asset.provenance.some(record => record.fieldPath === "assetClass")).toBe(true);
    expect(asset.attributes["glpi.itemType"]).toBe("Computer");
    expect(asset.attributes["glpi.location.name"]).toBe("Synthetic Lab");

    const rawAsset = (wirePayload as { assets: Array<Record<string, unknown>> }).assets[0]!;
    expect(Object.hasOwn(rawAsset, "taxonomy")).toBe(true);
    expect(Object.hasOwn(rawAsset, "operationalContexts")).toBe(true);
    expect(Object.hasOwn(rawAsset, "sourceReferences")).toBe(true);
    expect(Object.hasOwn(rawAsset, "provenance")).toBe(true);

    expect(calls).toEqual([
      { path: "Assets/Computer", start: 0, limit: 10 },
      { path: "Assets/Computer", start: 1, limit: 9 },
    ]);
  });

  it("fails closed when a provider returns an incompatible runtime contract", async () => {
    const invalidProvider: TechnologyProvider = {
      descriptor: {
        id: "ci.invalid",
        mode: "live",
        displayName: "Invalid CI provider",
        availability: "ready",
        capabilities: ["technology.snapshot.read"],
        sourceSystems: ["custom:ci"],
      },
      async getSnapshot() {
        return {
          schemaVersion: "invented-version",
          asOf: "not-a-date",
          assets: [],
          relationships: [],
          observations: [],
        } as unknown as Awaited<ReturnType<TechnologyProvider["getSnapshot"]>>;
      },
    };

    app = await buildApp({
      config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }),
      authenticationProvider: readerAuthenticationProvider,
      technologyProvider: invalidProvider,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/technology/snapshot",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({
      code: "INTERNAL_ERROR",
      statusCode: 500,
      message: "Internal server error",
    });
    expect(response.body).not.toContain("invented-version");
    expect(response.body).not.toContain("not-a-date");
  });
});
