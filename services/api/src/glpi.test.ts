import { describe, expect, it } from "vitest";
import {
  GlpiAuthenticationError,
  GlpiConfigurationError,
  GlpiPaginationError,
  GlpiPayloadError,
  GlpiRequestError,
  createGlpiFetchTransport,
  createGlpiTechnologyProvider,
  mapGlpiComputerToTechnologyAsset,
  parseGlpiComputerRecord,
  type GlpiApiTransport,
  type GlpiQuery,
} from "./glpi.js";

const OBSERVED_AT = "2026-09-15T12:00:00.000Z";
const SOURCE_INSTANCE_ID = "glpi-test";

function computer(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    name: "ITSTGO42",
    serial: "SER-42",
    otherserial: "IGX-0042",
    uuid: "9d566efc-7600-4ad9-9937-2ea8a03514ea",
    is_deleted: false,
    is_dynamic: true,
    date_creation: "2026-01-02T10:00:00+00:00",
    date_mod: "2026-09-15T11:55:00+00:00",
    last_inventory_update: "2026-09-15T11:50:00+00:00",
    last_boot: "2026-09-15T09:00:00+00:00",
    status: { id: 1, name: "Active" },
    entity: { id: 0, name: "Root entity", completename: "Root entity" },
    manufacturer: { id: 7, name: "Dell" },
    location: { id: 3, name: "Santiago" },
    type: { id: 9, name: "Notebook" },
    model: { id: 11, name: "Latitude" },
    ...overrides,
  };
}

describe("GLPI record parsing and canonical mapping", () => {
  it("parses a GLPI Computer payload defensively", () => {
    const parsed = parseGlpiComputerRecord(computer());
    expect(parsed.id).toBe(42);
    expect(parsed.status).toEqual({ id: 1, name: "Active" });
    expect(parsed.location?.name).toBe("Santiago");
  });

  it("rejects records without a valid numeric id", () => {
    expect(() => parseGlpiComputerRecord({ name: "missing-id" })).toThrow(GlpiPayloadError);
    expect(() => parseGlpiComputerRecord({ id: -1 })).toThrow(GlpiPayloadError);
    expect(() => parseGlpiComputerRecord(null)).toThrow(GlpiPayloadError);
  });

  it("promotes only timezone-qualified GLPI timestamps and preserves ambiguous source values", () => {
    const asset = mapGlpiComputerToTechnologyAsset(
      parseGlpiComputerRecord(computer({
        date_creation: "2026-01-02T10:00:00-03:00",
        date_mod: "0000-00-00 00:00:00",
        last_inventory_update: "2026-10-05 12:00:00",
        last_boot: "2026-02-30T09:00:00Z",
      })),
      OBSERVED_AT,
      SOURCE_INSTANCE_ID,
    );

    expect(asset.attributes["glpi.dateCreation"]).toBe("2026-01-02T10:00:00-03:00");
    expect(asset.attributes["glpi.raw.dateCreation"]).toBeUndefined();

    expect(asset.attributes["glpi.dateModified"]).toBeUndefined();
    expect(asset.attributes["glpi.raw.dateModified"]).toBe("0000-00-00 00:00:00");

    expect(asset.attributes["glpi.lastInventoryUpdate"]).toBeUndefined();
    expect(asset.attributes["glpi.raw.lastInventoryUpdate"]).toBe("2026-10-05 12:00:00");

    expect(asset.attributes["glpi.lastBoot"]).toBeUndefined();
    expect(asset.attributes["glpi.raw.lastBoot"]).toBe("2026-02-30T09:00:00Z");
  });

  it("keeps generic Notebook hardware taxonomically unclassified while preserving the legacy scalar bridge", () => {
    const asset = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord(computer()), OBSERVED_AT, SOURCE_INSTANCE_ID);

    expect(asset.id).toMatch(/^NXS-[A-F0-9]{32}$/);
    expect(asset.displayName).toBe("ITSTGO42");
    expect(asset.domain).toBe("IT");
    expect(asset.assetClass).toBe("endpoint");
    expect(asset.role).toBe("user_endpoint");
    expect(asset.taxonomy).toMatchObject({
      taxonomyVersion: "2",
      domain: { state: "unclassified", reviewRequired: true, ruleId: "glpi.computer.type.generic-hardware" },
      assetClass: { state: "unclassified", reviewRequired: true, ruleId: "glpi.computer.type.generic-hardware" },
      role: { state: "unclassified", reviewRequired: true, ruleId: "glpi.computer.type.generic-hardware" },
    });
    expect(asset.lifecycle).toBe("unknown");
    expect(asset.criticality).toBe("unknown");
    expect(asset.operationalContexts).toBeUndefined();
    expect(asset.identifiers).toEqual([
      expect.objectContaining({ kind: "serial_number", value: "SER-42" }),
      expect.objectContaining({ kind: "asset_tag", value: "IGX-0042" }),
      expect.objectContaining({ kind: "hardware_uuid", value: "9d566efc-7600-4ad9-9937-2ea8a03514ea" }),
    ]);
    expect(asset.sourceReferences).toEqual([
      expect.objectContaining({ source: "glpi", sourceInstanceId: SOURCE_INSTANCE_ID, externalId: "42", entityType: "Computer", authority: "authoritative" }),
    ]);
    expect(asset.attributes).toMatchObject({
      "glpi.itemType": "Computer",
      "glpi.isDynamic": true,
      "glpi.status.name": "Active",
      "glpi.entity.name": "Root entity",
      "glpi.manufacturer.name": "Dell",
      "glpi.location.name": "Santiago",
      "glpi.type.name": "Notebook",
      "glpi.model.name": "Latitude",
      "nexus.taxonomy.version": "2",
      "nexus.taxonomy.domain.state": "unclassified",
      "nexus.taxonomy.assetClass.ruleId": "glpi.computer.type.generic-hardware",
      "nexus.taxonomy.compatibilityProjection": true,
    });
    expect(asset.provenance[0]?.evidence?.[0]?.reference).toBe(`glpi:${SOURCE_INSTANCE_ID}:v2.3:Assets/Computer/42`);
    expect(asset.provenance.find((entry) => entry.fieldPath === "assetClass")?.derivation).toBe("inferred");
  });

  it("maps an explicit HMI source type to OT taxonomy while retaining review-required evidence", () => {
    const asset = mapGlpiComputerToTechnologyAsset(
      parseGlpiComputerRecord(computer({ type: { id: 19, name: "HMI" } })),
      OBSERVED_AT,
      SOURCE_INSTANCE_ID,
    );
    expect(asset.domain).toBe("OT");
    expect(asset.assetClass).toBe("operator_interface");
    expect(asset.role).toBe("supervision");
    expect(asset.taxonomy).toMatchObject({
      domain: { state: "classified", value: "OT", method: "normalized", reviewRequired: true },
      assetClass: { state: "classified", value: "operator_interface", reviewRequired: true },
      role: { state: "classified", value: "supervision", method: "inferred", reviewRequired: true },
    });
    expect(asset.attributes["nexus.taxonomy.compatibilityProjection"]).toBe(false);
  });

  it("namespaces canonical identity by stable GLPI source instance", () => {
    const record = parseGlpiComputerRecord(computer({ id: 123 }));
    const chile = mapGlpiComputerToTechnologyAsset(record, OBSERVED_AT, "glpi-chile");
    const canada = mapGlpiComputerToTechnologyAsset(record, OBSERVED_AT, "glpi-canada");

    expect(chile.id).not.toBe(canada.id);
    expect(chile.sourceReferences[0]).toMatchObject({ sourceInstanceId: "glpi-chile" });
    expect(canada.sourceReferences[0]).toMatchObject({ sourceInstanceId: "glpi-canada" });
    expect(chile.provenance[0]?.evidence?.[0]?.reference).toContain("glpi-chile");
    expect(canada.provenance[0]?.evidence?.[0]?.reference).toContain("glpi-canada");
  });

  it("keeps canonical identity stable for the same GLPI source record", () => {
    const first = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord(computer()), OBSERVED_AT, SOURCE_INSTANCE_ID);
    const second = mapGlpiComputerToTechnologyAsset(
      parseGlpiComputerRecord(computer({ name: "renamed", serial: "SER-CHANGED" })),
      "2026-09-16T12:00:00.000Z",
      SOURCE_INSTANCE_ID,
    );
    expect(second.id).toBe(first.id);
  });

  it("keeps missing ComputerType taxonomically unknown while preserving the legacy scalar bridge", () => {
    const asset = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 8 }), OBSERVED_AT, SOURCE_INSTANCE_ID);
    expect(asset.displayName).toBe("GLPI Computer 8");
    expect(asset.domain).toBe("IT");
    expect(asset.assetClass).toBe("endpoint");
    expect(asset.role).toBe("user_endpoint");
    expect(asset.lifecycle).toBe("unknown");
    expect(asset.criticality).toBe("unknown");
    expect(asset.provenance[0]?.authority).toBe("inferred");
    expect(asset.taxonomy?.domain).toMatchObject({
      state: "unknown",
      reviewRequired: true,
      ruleId: "glpi.computer.type.missing",
    });
    expect(asset.taxonomy?.assetClass.state).toBe("unknown");
    expect(asset.taxonomy?.role.state).toBe("unknown");
    expect(asset.attributes).toMatchObject({
      "nexus.taxonomy.domain.state": "unknown",
      "nexus.taxonomy.compatibilityProjection": true,
      "nexus.taxonomy.projectionRuleId": "glpi.computer.compatibility-projection",
    });
    expect(asset.provenance.find((entry) => entry.fieldPath === "domain")?.authority).toBe("inferred");
  });

  it("keeps a present but unmapped GLPI ComputerType unclassified instead of inventing IT semantics", () => {
    const asset = mapGlpiComputerToTechnologyAsset(
      parseGlpiComputerRecord(computer({ type: { id: 91, name: "Plant Special PC" } })),
      OBSERVED_AT,
      SOURCE_INSTANCE_ID,
    );
    expect(asset.taxonomy?.domain).toMatchObject({ state: "unclassified", reviewRequired: true });
    expect(asset.taxonomy?.assetClass.state).toBe("unclassified");
    expect(asset.taxonomy?.role.state).toBe("unclassified");
    expect(asset.attributes["nexus.taxonomy.compatibilityProjection"]).toBe(true);
  });
});

describe("GLPI read-only fetch transport", () => {
  it("pins v2.3, sends only GET and keeps the bearer token out of the URL", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), ...(init === undefined ? {} : { init }) });
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    };

    const transport = createGlpiFetchTransport({
      baseUrl: "http://127.0.0.1:8080/glpi",
      allowInsecureHttp: true,
      accessTokenProvider: async () => "test-access-token",
      fetchImpl,
    });

    await transport.get("Assets/Computer", { start: 0, limit: 100 });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:8080/glpi/api.php/v2.3/Assets/Computer?start=0&limit=100");
    expect(calls[0]?.url).not.toContain("test-access-token");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe("Bearer test-access-token");
    expect(calls[0]?.init?.redirect).toBe("error");
  });

  it("rejects insecure or malformed base URLs unless a lab opts in explicitly", () => {
    const token = async () => "token";
    expect(() => createGlpiFetchTransport({ baseUrl: "http://glpi.example.test", accessTokenProvider: token })).toThrow(
      GlpiConfigurationError,
    );
    expect(() =>
      createGlpiFetchTransport({ baseUrl: "https://user:pass@glpi.example.test", accessTokenProvider: token }),
    ).toThrow(GlpiConfigurationError);
    expect(() => createGlpiFetchTransport({ baseUrl: "https://glpi.example.test/api.php", accessTokenProvider: token })).toThrow(
      GlpiConfigurationError,
    );
  });

  it("fails closed when the access token provider returns no usable token", async () => {
    const transport = createGlpiFetchTransport({
      baseUrl: "https://glpi.example.test",
      accessTokenProvider: async () => "   ",
      fetchImpl: async () => new Response("[]", { status: 200 }),
    });
    await expect(transport.get("Assets/Computer")).rejects.toBeInstanceOf(GlpiAuthenticationError);
  });

  it("returns safe HTTP errors without leaking upstream response bodies", async () => {
    const transport = createGlpiFetchTransport({
      baseUrl: "https://glpi.example.test",
      accessTokenProvider: async () => "token",
      fetchImpl: async () => new Response('{"secret":"do-not-leak"}', { status: 403 }),
    });

    let failure: unknown;
    try {
      await transport.get("Assets/Computer");
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(GlpiRequestError);
    expect((failure as Error).message).toBe("GLPI request failed with HTTP 403");
    expect((failure as Error).message).not.toContain("do-not-leak");
  });

  it("rejects non-JSON successful responses", async () => {
    const transport = createGlpiFetchTransport({
      baseUrl: "https://glpi.example.test",
      accessTokenProvider: async () => "token",
      fetchImpl: async () => new Response("not-json", { status: 200 }),
    });
    await expect(transport.get("Assets/Computer")).rejects.toBeInstanceOf(GlpiPayloadError);
  });
});

describe("GLPI TechnologyProvider", () => {
  it("rejects endpoint-shaped values as GLPI source instance identity", () => {
    const transport: GlpiApiTransport = { async get() { return []; } };
    expect(() => createGlpiTechnologyProvider({
      transport,
      sourceInstanceId: "https://glpi.example",
    })).toThrow(GlpiConfigurationError);
  });

  it("paginates with start/limit until an empty page and emits a valid live snapshot", async () => {
    const queries: GlpiQuery[] = [];
    const transport: GlpiApiTransport = {
      async get(path, query = {}) {
        expect(path).toBe("Assets/Computer");
        queries.push(query);
        const start = Number(query.start ?? 0);
        if (start === 0) return [computer({ id: 1, name: "ONE" }), computer({ id: 2, name: "TWO" })];
        if (start === 2) return [computer({ id: 3, name: "THREE" })];
        return [];
      },
    };

    const provider = createGlpiTechnologyProvider({
      transport,
      sourceInstanceId: SOURCE_INSTANCE_ID,
      pageSize: 2,
      maxRecords: 10,
      now: () => new Date(OBSERVED_AT),
    });
    const snapshot = await provider.getSnapshot();

    expect(provider.descriptor).toMatchObject({
      id: "live.glpi.v2.3",
      mode: "live",
      availability: "ready",
      capabilities: ["technology.snapshot.read"],
      sourceSystems: ["glpi"],
    });
    expect(queries).toEqual([
      { start: 0, limit: 2 },
      { start: 2, limit: 2 },
      { start: 3, limit: 2 },
    ]);
    expect(snapshot.schemaVersion).toBe("0.2");
    expect(snapshot.asOf).toBe(OBSERVED_AT);
    expect(snapshot.assets.map((asset) => asset.displayName)).toEqual(["ONE", "TWO", "THREE"]);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.taxonomyVersion === "2")).toBe(true);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.domain.state === "unclassified")).toBe(true);
    expect(snapshot.assets.every((asset) => asset.attributes["nexus.taxonomy.compatibilityProjection"] === true)).toBe(true);
    expect(snapshot.relationships).toEqual([]);
    expect(snapshot.observations).toEqual([]);
  });

  it("accepts unresolved taxonomy as explicit review state instead of failing the provider", async () => {
    const transport: GlpiApiTransport = {
      async get(_path, query = {}) {
        return Number(query.start ?? 0) === 0 ? [{ id: 77, name: "UNKNOWN-TYPE" }] : [];
      },
    };
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: SOURCE_INSTANCE_ID, pageSize: 1, maxRecords: 10, now: () => new Date(OBSERVED_AT) });
    const snapshot = await provider.getSnapshot();
    expect(snapshot.assets[0]?.taxonomy?.domain.state).toBe("unknown");
    expect(snapshot.assets[0]?.attributes["nexus.taxonomy.compatibilityProjection"]).toBe(true);
  });

  it("fails instead of accepting duplicate ids across pages", async () => {
    const transport: GlpiApiTransport = {
      async get(_path, query = {}) {
        return Number(query.start ?? 0) === 0
          ? [computer({ id: 1 }), computer({ id: 2 })]
          : [computer({ id: 2 })];
      },
    };
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: SOURCE_INSTANCE_ID, pageSize: 2, maxRecords: 10 });
    await expect(provider.getSnapshot()).rejects.toBeInstanceOf(GlpiPaginationError);
  });

  it("fails closed when GLPI returns an object instead of the documented collection array", async () => {
    const transport: GlpiApiTransport = { async get() { return { data: [computer()] }; } };
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: SOURCE_INSTANCE_ID });
    await expect(provider.getSnapshot()).rejects.toBeInstanceOf(GlpiPayloadError);
  });

  it("enforces a maximum record bound rather than silently truncating the snapshot", async () => {
    const transport: GlpiApiTransport = {
      async get(_path, query = {}) {
        const start = Number(query.start ?? 0);
        if (start === 0) return [computer({ id: 1 }), computer({ id: 2 })];
        if (start === 2) return [computer({ id: 3 })];
        return [];
      },
    };
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: SOURCE_INSTANCE_ID, pageSize: 2, maxRecords: 2 });
    await expect(provider.getSnapshot()).rejects.toBeInstanceOf(GlpiPaginationError);
  });
});
