import { validateHardwareInventoryV2 } from "@igx-nexus/types";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGlpiHardwareAdapter, GlpiHardwareAnchorError, type GlpiHardwareAdapter } from "./glpi-hardware.js";
import { createGlpiLiveTechnologyProvider } from "./glpi-provider.js";
import { GlpiConfigurationError, GlpiRequestError, mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord, type GlpiApiTransport } from "./glpi.js";
import { createRuntimeTechnologyServices } from "./glpi-runtime.js";
import type { TechnologyProvider } from "./provider.js";
import type { AuthenticationProvider } from "./security.js";

const at = "2026-10-08T12:00:00.000Z";
const instance = "synthetic-hardware-api";
const asset = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42, name: "SYNTHETIC-ASSET" }), at, instance);
const path = (id = asset.id) => `/api/v2/technology/assets/${encodeURIComponent(id)}/hardware`;
const authentication = (allowed = true): AuthenticationProvider => ({ async authenticate() {
  return { subject: "synthetic-user", kind: "user", authSource: "synthetic", roles: [], permissions: new Set(allowed ? ["technology:read" as const] : []) };
} });
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; });

function readers(override?: GlpiApiTransport["get"]) {
  const get = vi.fn<GlpiApiTransport["get"]>(override ?? (async (route, query) => {
    if (route === "Assets/Computer") return query?.start === 0 ? [{ id: 42, name: "SYNTHETIC-ASSET" }] : [];
    if (route === "Assets/Computer/42/Component/Processor") return query?.start === 0 ? [{ id: 1, nbcores: 4, nbthreads: 8 }] : [];
    return [];
  }));
  const options = { transport: { get }, sourceInstanceId: instance, now: () => new Date(at) };
  const technologyProvider = createGlpiLiveTechnologyProvider(options);
  const hardwareAdapter = createGlpiHardwareAdapter(options);
  return { get, technologyProvider, hardwareAdapter };
}
async function live(technologyProvider: TechnologyProvider, hardwareAdapter?: GlpiHardwareAdapter, authenticationProvider = authentication()) {
  app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), technologyProvider,
    ...(hardwareAdapter ? { hardwareAdapter } : {}), authenticationProvider });
  return app;
}

describe("Hardware HTTP V2 — synthetic integration and security", () => {
  it.each(["missing", "ambiguous", "foreign"])("classifies only anchor failure %s as hidden 404", async (kind) => {
    const r = readers();
    const broken = { ...asset, sourceReferences: kind === "missing" ? [] : kind === "ambiguous" ? [...asset.sourceReferences, ...asset.sourceReferences] : asset.sourceReferences.map((s) => ({ ...s, sourceInstanceId: "synthetic-foreign" })) };
    await expect(r.hardwareAdapter.getInventory(broken)).rejects.toBeInstanceOf(GlpiHardwareAnchorError);
    await live(r.technologyProvider, { async getInventory() { return r.hardwareAdapter.getInventory(broken); } });
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "ASSET_NOT_FOUND", message: "Asset not found" });
    expect(response.body).not.toMatch(/unambiguous|GLPI|synthetic-foreign/);
  });
  it.each([new GlpiConfigurationError("SYNTHETIC-INTERNAL-CONFIG"), new Error("SYNTHETIC-OPERATIONAL-ERROR")])("classifies operational errors as sanitized 503: %s", async (error) => {
    const r = readers();
    await live(r.technologyProvider, { async getInventory() { throw error; } });
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(response.body).not.toContain("SYNTHETIC");
  });
  it("treats an invalid acquisition clock as operational 503, not an unknown asset", async () => {
    const r = readers();
    const adapter = createGlpiHardwareAdapter({ transport: { get: r.get }, sourceInstanceId: instance, now: () => new Date(NaN) });
    await live(r.technologyProvider, adapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toMatch(/Invalid|time|clock/);
  });
  it("resolves exact canonical identity, validates hardware and preserves v1", async () => {
    const r = readers();
    await live(r.technologyProvider, r.hardwareAdapter);
    const before = await app!.inject({ url: "/api/v1/technology/snapshot" });
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(validateHardwareInventoryV2(response.json())).toEqual([]);
    expect(response.json()).toMatchObject({ contractVersion: "2", assetId: asset.id, processors: { state: "complete", items: [{ cores: 4, threads: 8, componentId: null, observedAt: null }] } });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect((await app!.inject({ url: "/api/v1/technology/snapshot" })).json()).toEqual(before.json());
    expect(before.json().schemaVersion).toBe("0.2");
    expect(r.get.mock.calls.some(([route]) => route === "Assets/Computer/42/Component/Processor")).toBe(true);
    expect(r.get.mock.calls.some(([route]) => route.includes(asset.id))).toBe(false);
  });
  it.each(["42", "glpi:other-instance:Computer:42", "synthetic-missing"])("hides missing or out-of-scope canonical ID %s identically", async (id) => {
    const r = readers(); await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path(id) });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "ASSET_NOT_FOUND", message: "Asset not found" });
    expect(r.get.mock.calls.every(([route]) => route === "Assets/Computer")).toBe(true);
  });
  it("resolves a preserved canonical anchor without reconstructing its ID", async () => {
    const r = readers();
    const technologyProvider: TechnologyProvider = { ...r.technologyProvider, async getSnapshot() {
      const snapshot = await r.technologyProvider.getSnapshot();
      return { ...snapshot, assets: snapshot.assets.map((value) => ({ ...value, id: "SYNTHETIC-CANONICAL-ANCHOR" })) };
    } };
    await live(technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path("SYNTHETIC-CANONICAL-ANCHOR") });
    expect(response.statusCode).toBe(200);
    expect(response.json().assetId).toBe("SYNTHETIC-CANONICAL-ANCHOR");
    expect(r.get.mock.calls.some(([route]) => route === "Assets/Computer/42/Component/Processor")).toBe(true);
  });
  it("hides an anchor outside the configured adapter instance before hardware I/O", async () => {
    const r = readers();
    const foreign = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42 }), at, "synthetic-other-instance");
    const technologyProvider: TechnologyProvider = { ...r.technologyProvider, async getSnapshot() {
      return { ...(await r.technologyProvider.getSnapshot()), assets: [foreign] };
    } };
    await live(technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path(foreign.id) });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: "ASSET_NOT_FOUND", message: "Asset not found" });
    expect(r.get.mock.calls.every(([route]) => route === "Assets/Computer")).toBe(true);
  });
  it.each([401, 403])("denies NEXUS HTTP %s before any provider access", async (status) => {
    const r = readers(); await live(r.technologyProvider, r.hardwareAdapter, status === 401 ? { async authenticate() { return null; } } : authentication(false));
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(status); expect(r.get).not.toHaveBeenCalled();
  });
  it.each(["instance=other", "entity=99", "sourceScope=other", "sections=processors"])("rejects client-selected scope %s", async (query) => {
    const r = readers(); await live(r.technologyProvider, r.hardwareAdapter);
    expect((await app!.inject({ url: `${path()}?${query}` })).statusCode).toBe(400);
    expect(r.get).not.toHaveBeenCalled();
  });
  it("does not fabricate Demo hardware even if an adapter is injected", async () => {
    const hardwareAdapter = { getInventory: vi.fn() };
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }), authenticationProvider: authentication(), hardwareAdapter });
    expect((await app.inject({ url: path() })).statusCode).toBe(503);
    expect(hardwareAdapter.getInventory).not.toHaveBeenCalled();
  });
  it("returns controlled 503 for unconfigured Live without Demo fallback", async () => {
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), authenticationProvider: authentication() });
    const response = await app.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(response.body).not.toContain("demo");
  });
  it("requires a hardware reader even for a ready Live provider", async () => {
    const r = readers(); await live(r.technologyProvider);
    expect((await app!.inject({ url: path() })).statusCode).toBe(503);
    expect(r.get).not.toHaveBeenCalled();
  });
  it.each([401, 403, 503])("sanitizes GLPI snapshot failure %s", async (status) => {
    const r = readers(async () => { throw new GlpiRequestError("SYNTHETIC-TOKEN https://internal.invalid", status); });
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toMatch(/SYNTHETIC-TOKEN|internal\.invalid|42/);
  });
  it.each([401, 403])("does not publish other hardware after upstream section HTTP %s", async (status) => {
    const base = readers();
    const r = readers(async (route, query) => {
      if (route.endsWith("/Memory")) throw new GlpiRequestError("SYNTHETIC-SECRET", status);
      return base.get(route, query);
    });
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toMatch(/processors|cores|SYNTHETIC-SECRET/);
  });
  it("publishes explicit partial coverage after a late 503", async () => {
    const base = readers();
    const r = readers(async (route, query) => {
      if (route.endsWith("/Processor") && query?.start === 1) throw new GlpiRequestError("SYNTHETIC-SECRET", 503);
      return base.get(route, query);
    });
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(response.json().processors).toMatchObject({ state: "partial", items: [{ cores: 4 }], gaps: [{ fieldPath: "processors", reason: "source_error" }] });
    expect(validateHardwareInventoryV2(response.json())).toEqual([]);
    expect(response.body).not.toContain("SYNTHETIC-SECRET");
  });
  it("retains a valid section alongside an explicit incompatible section", async () => {
    const base = readers();
    const r = readers(async (route, query) => route.endsWith("/Memory") ? { incompatible: true } : base.get(route, query));
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(response.json().memoryModules).toEqual({ state: "unavailable", reason: "source_error" });
    expect(response.json().processors.state).toBe("complete");
    expect(validateHardwareInventoryV2(response.json())).toEqual([]);
  });
  it("discards the response after catalogue authorization failure", async () => {
    const base = readers();
    const r = readers(async (route, query) => {
      if (route.endsWith("/Component/Memory")) return query?.start === 0 ? [{ id: 2, memory: { id: 12 } }] : [];
      if (route === "Components/Memory/12") throw new GlpiRequestError("SYNTHETIC-SECRET", 403);
      return base.get(route, query);
    });
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toMatch(/processors|sourceReferences|SYNTHETIC-SECRET/);
  });
  it("publishes complete empty sections with acquisition evidence", async () => {
    const base = readers();
    const r = readers(async (route, query) => route === "Assets/Computer" ? base.get(route, query) : []);
    await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(response.json().processors).toMatchObject({ state: "complete", items: [], collectedAt: at, observedAt: null });
    expect(response.json().processors.sourceReferences).toHaveLength(1);
  });
  it.each(["malformed", "503"])("does not turn total source failure %s into empty success", async (failure) => {
    const base = readers();
    const r = readers(async (route, query) => {
      if (route === "Assets/Computer") return base.get(route, query);
      if (failure === "503") throw new GlpiRequestError("SYNTHETIC-SECRET", 503);
      return { incompatible: true };
    });
    await live(r.technologyProvider, r.hardwareAdapter);
    expect((await app!.inject({ url: path() })).statusCode).toBe(503);
  });
  it.each(["invalid", "wrong-asset"])("validates adapter output before publishing: %s", async (failure) => {
    const r = readers();
    await live(r.technologyProvider, { async getInventory(value) {
      const result = await r.hardwareAdapter.getInventory(value);
      return { ...result, ...(failure === "wrong-asset" ? { assetId: "synthetic-other" } : { processors: { state: "complete", items: [] } }) } as typeof result;
    } });
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(503); expect(response.body).not.toContain("synthetic-other");
  });
  it("documents the secure v2 operation in OpenAPI", async () => {
    const r = readers(); await live(r.technologyProvider, r.hardwareAdapter);
    const response = await app!.inject({ url: "/openapi.json" });
    expect(response.json().paths["/api/v2/technology/assets/{assetId}/hardware"].get.security).toEqual([{ nexusBearer: [] }]);
  });
  it("describes reusable coverage variants, acquisition and component fields in OpenAPI", async () => {
    const r = readers(); await live(r.technologyProvider, r.hardwareAdapter);
    const doc = (await app!.inject({ url: "/openapi.json" })).json();
    const resolve = (schema: any): any => schema.$ref ? resolve(doc.components.schemas[schema.$ref.split("/").at(-1)]) : schema;
    const operation = doc.paths["/api/v2/technology/assets/{assetId}/hardware"].get;
    const inventory = resolve(operation.responses["200"].content["application/json"].schema);
    expect(inventory.properties.contractVersion.enum).toEqual(["2"]);
    expect(inventory.required).toEqual(expect.arrayContaining(["assetId", "processors", "logicalVolumes", "peripheralConnections"]));
    const sections = ["processors", "memoryModules", "physicalStorageDevices", "logicalVolumes", "peripherals", "peripheralConnections"];
    const fields = [["cores", "threads", "baseFrequency"], ["capacityBytes", "technology", "speed", "slot"], ["medium", "protocol", "interface"], ["physicalDeviceIds", "availableBytes", "fileSystem"], ["detectionId", "managedAssetId"], ["detectionId", "connectionType", "port"]];
    sections.forEach((name, index) => {
      const section = resolve(inventory.properties[name]);
      const variants = section.oneOf.map(resolve);
      expect(variants.map((variant: any) => variant.properties.state.enum[0])).toEqual(["complete", "partial", "unavailable", "not_applicable", "not_requested"]);
      const complete = variants[0]; const partial = variants[1];
      expect(complete.required).toEqual(expect.arrayContaining(["items", "collectedAt", "observedAt", "sourceReferences"]));
      expect(complete.properties.sourceReferences.minItems).toBe(1);
      expect(complete.additionalProperties).toBe(false);
      expect(partial.properties.gaps.minItems).toBe(1);
      expect(resolve(partial.properties.gaps.items).properties.reason.enum).toContain("pagination_incomplete");
      expect(variants[2].required).toContain("reason");
      expect(variants[2].properties).not.toHaveProperty("items");
      const item = resolve(complete.properties.items.items);
      expect(Object.keys(item.properties)).toEqual(expect.arrayContaining(fields[index]!));
      expect(item.required).toEqual(expect.arrayContaining(["collectedAt", "observedAt", "sourceReferences", "provenance"]));
      expect(resolve(item.properties.sourceReferences.items).properties).toHaveProperty("sourceInstanceId");
      expect(resolve(item.properties.provenance.items).properties).toHaveProperty("fieldPath");
      expect(item.properties.observedAt.nullable).toBe(true);
    });
    expect(JSON.stringify(inventory)).not.toContain('"type":"null"');
    expect(JSON.stringify(doc.components.schemas)).not.toContain('"type":"null"');
  });
  it("serializes known measurements and full evidence without losing canonical fields", async () => {
    const r = readers();
    const inventory = await r.hardwareAdapter.getInventory(asset);
    if (inventory.processors.state !== "complete") throw new Error("Synthetic fixture incomplete");
    const original = inventory.processors.items[0]!;
    const source = original.sourceReferences[0]!;
    const expected = { ...inventory, processors: { ...inventory.processors, items: [{ ...original,
      baseFrequency: { value: 3200, unit: "MHz" as const }, maxFrequency: { value: 4, unit: "GHz" as const },
      identifiers: [{ kind: "serial_number" as const, value: "SYNTHETIC-SERIAL", source }],
      provenance: [{ fieldPath: "cores", source, observedAt: at, authority: "observed" as const, derivation: "observed" as const, evidence: [{ kind: "api_response" as const, reference: "synthetic-response" }] }],
    }] } };
    expect(validateHardwareInventoryV2(expected)).toEqual([]);
    await live(r.technologyProvider, { async getInventory() { return expected; } });
    const response = await app!.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expected);
  });
  it("wires runtime snapshot and hardware through one configured OAuth transport", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/token")) return Response.json({ token_type: "Bearer", expires_in: 3600, access_token: "SYNTHETIC-TOKEN" });
      expect(init?.headers).toMatchObject({ authorization: "Bearer SYNTHETIC-TOKEN" });
      if (url.includes("/Assets/Computer?")) return Response.json(new URL(url).searchParams.get("start") === "0" ? [{ id: 42 }] : []);
      return Response.json([]);
    });
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    const services = createRuntimeTechnologyServices(config, { environment: {
      NEXUS_GLPI_INSTANCE_ID: instance, NEXUS_GLPI_BASE_URL: "https://synthetic.invalid", NEXUS_GLPI_OAUTH_CLIENT_ID: "synthetic-client", NEXUS_GLPI_SERVICE_USERNAME: "synthetic-service",
    }, credentialSource: async () => ({ clientSecret: "synthetic-secret", password: "synthetic-password" }), fetchImpl });
    app = await buildApp({ config, ...services, authenticationProvider: authentication() });
    const response = await app.inject({ url: path() });
    expect(response.statusCode).toBe(200);
    expect(fetchImpl.mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(1);
  });
});
