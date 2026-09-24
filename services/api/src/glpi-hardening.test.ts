import { describe, expect, it } from "vitest";
import {
  GlpiAuthenticationError,
  GlpiPaginationError,
  createGlpiFetchTransport,
  createGlpiTechnologyProvider,
  mapGlpiComputerToTechnologyAsset,
  parseGlpiComputerRecord,
  type GlpiApiTransport,
} from "./glpi.js";

const OBSERVED_AT = "2026-09-15T12:00:00.000Z";
const SOURCE_INSTANCE_ID = "glpi-test";

describe("GLPI adapter hardening", () => {
  it("normalizes failures from the token provider instead of leaking its message", async () => {
    const transport = createGlpiFetchTransport({
      baseUrl: "https://glpi.example.test",
      accessTokenProvider: async () => {
        throw new Error("vault path secret/innergex/glpi should never escape");
      },
      fetchImpl: async () => new Response("[]", { status: 200 }),
    });

    let failure: unknown;
    try {
      await transport.get("Assets/Computer");
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(GlpiAuthenticationError);
    expect((failure as Error).message).toBe("GLPI access token is unavailable");
    expect((failure as Error).message).not.toContain("secret/innergex/glpi");
  });

  it("keeps paginating when the upstream returns fewer rows than the requested limit", async () => {
    const ids = [1, 2, 3];
    const queries: unknown[] = [];
    const transport: GlpiApiTransport = {
      async get(_path, query = {}) {
        queries.push(query);
        const start = Number(query.start ?? 0);
        const id = ids[start];
        return id === undefined ? [] : [{ id, name: `PC-${id}` }];
      },
    };

    const provider = createGlpiTechnologyProvider({
      transport,
      sourceInstanceId: SOURCE_INSTANCE_ID,
      pageSize: 100,
      maxRecords: 10,
      now: () => new Date(OBSERVED_AT),
    });
    const snapshot = await provider.getSnapshot();

    expect(snapshot.assets.map((asset) => asset.displayName)).toEqual(["PC-1", "PC-2", "PC-3"]);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.domain.state === "unknown")).toBe(true);
    expect(snapshot.assets.every((asset) => asset.attributes["nexus.taxonomy.compatibilityProjection"] === true)).toBe(true);
    expect(queries).toEqual([
      { start: 0, limit: 10 },
      { start: 1, limit: 9 },
      { start: 2, limit: 8 },
      { start: 3, limit: 7 },
    ]);
  });

  it("rejects an upstream page that contains more rows than the requested limit", async () => {
    const transport: GlpiApiTransport = {
      async get() {
        return [{ id: 1 }, { id: 2 }, { id: 3 }];
      },
    };
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: SOURCE_INSTANCE_ID, pageSize: 2, maxRecords: 10 });
    await expect(provider.getSnapshot()).rejects.toBeInstanceOf(GlpiPaginationError);
  });

  it("marks a compatibility scalar as inferred instead of raw GLPI truth", () => {
    const asset = mapGlpiComputerToTechnologyAsset(
      parseGlpiComputerRecord({ id: 9, name: "CONTROL-PC" }),
      OBSERVED_AT,
      SOURCE_INSTANCE_ID,
    );

    expect(asset.taxonomy?.domain.state).toBe("unknown");
    expect(asset.attributes["nexus.taxonomy.compatibilityProjection"]).toBe(true);
    for (const fieldPath of ["domain", "assetClass", "role"]) {
      expect(asset.provenance).toContainEqual(
        expect.objectContaining({
          fieldPath,
          authority: "inferred",
          derivation: "inferred",
          source: expect.objectContaining({ source: "glpi", externalId: "9" }),
        }),
      );
    }
  });
});
