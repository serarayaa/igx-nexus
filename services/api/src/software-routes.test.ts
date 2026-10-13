import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { validateSoftwareInventoryV2, type SoftwareInventoryV2 } from "@igx-nexus/types";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createGlpiSoftwareAdapter } from "./glpi-software.js";
import { createGlpiHardwareAdapter } from "./glpi-hardware.js";
import { createGlpiLiveTechnologyProvider } from "./glpi-provider.js";
import { createRuntimeTechnologyServices } from "./glpi-runtime.js";
import { GlpiRequestError, type GlpiApiTransport } from "./glpi.js";
import { guardSoftwareTransport, activeSoftwareOperations } from "./software-operation.js";
import type { TechnologyProvider } from "./provider.js";
import type { AuthenticationProvider } from "./security.js";
import type { GlpiSoftwareAdapter } from "./software-routes.js";

const instance = "synthetic-software-http";
const at = "2026-10-13T12:00:00.000Z";
const osPath = "Assets/Computer/42/OSInstallation";
const installPath = "Assets/Computer/42/SoftwareInstallation";
const productPath = "Assets/Software";
const versionPath = "Assets/Software/10/Version";
const installation = (id: number) => ({ id, softwareversion: { id: 20 }, date_install: "2026-10-01" });
const os = { id: 1, operatingsystem: { id: 2, name: "SYNTH-OS" }, date_install: "2026-10-01T10:00:00+02:00" };
const authentication = (allowed = true): AuthenticationProvider => ({ async authenticate() {
  return { subject: "synthetic-user", kind: "user", authSource: "synthetic", roles: [], permissions: new Set(allowed ? ["technology:read" as const] : []) };
} });
let app: FastifyInstance | undefined;
afterEach(async () => { await app?.close(); app = undefined; expect(activeSoftwareOperations()).toBe(0); });

function readers(override?: GlpiApiTransport["get"], installations: unknown[] = [installation(1)]) {
  const lists: Record<string, unknown[]> = {
    "Assets/Computer": [{ id: 42, name: "SYNTH-ASSET" }], [osPath]: [os], [installPath]: installations,
    [productPath]: [{ id: 10, name: "SYNTH-PRODUCT" }], [versionPath]: [{ id: 20, name: "SYNTH-VERSION", software: { id: 10 } }],
  };
  const get = vi.fn<GlpiApiTransport["get"]>(override ?? (async (path, query) => (lists[path] ?? []).slice(Number(query?.start), Number(query?.start) + Number(query?.limit))));
  const options = { transport: guardSoftwareTransport({ get }), sourceInstanceId: instance, now: () => new Date(at) };
  return { get, technologyProvider: createGlpiLiveTechnologyProvider(options), softwareAdapter: createGlpiSoftwareAdapter(options), hardwareAdapter: createGlpiHardwareAdapter(options) };
}
async function live(technologyProvider: TechnologyProvider, softwareAdapter?: GlpiSoftwareAdapter, authenticationProvider = authentication()) {
  app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), technologyProvider,
    ...(softwareAdapter ? { softwareAdapter } : {}), authenticationProvider });
  return app;
}
const path = (id: string) => `/api/v2/technology/assets/${encodeURIComponent(id)}/software`;
async function id(r: ReturnType<typeof readers>) { return (await r.technologyProvider.getSnapshot()).assets[0]!.id; }

describe("Software HTTP V2 — synthetic security, serialization and compatibility", () => {
  it.each([401, 403])("returns %s before snapshot or any GLPI call", async status => {
    const r = readers();
    await live(r.technologyProvider, r.softwareAdapter, status === 401 ? { async authenticate() { return null; } } : authentication(false));
    const response = await app!.inject({ url: path("synthetic") });
    expect(response.statusCode).toBe(status); expect(r.get).not.toHaveBeenCalled();
    expect(response.headers["cache-control"]).toBe("no-store"); expect(response.json().requestId).toBe(response.headers["x-request-id"]);
  });
  it("publishes validated OS/software preserving precision, provenance, nulls and every canonical field", async () => {
    const r = readers(); const assetId = await id(r);
    const original = await r.softwareAdapter.getInventory((await r.technologyProvider.getSnapshot()).assets[0]!);
    if (original.installations.state !== "complete") throw new Error("Expected complete fixture");
    const first = original.installations.items[0]!; const source = first.sourceReferences[0]!;
    const expected: SoftwareInventoryV2 = { ...original, installations: { ...original.installations, items: [{ ...first,
      provenance: [{ fieldPath: "installedAt", source, observedAt: at, authority: "observed", derivation: "observed", evidence: [{ kind: "api_response", reference: "synthetic-only" }] }],
    }] } };
    expect(validateSoftwareInventoryV2(expected)).toEqual([]);
    await live(r.technologyProvider, { async getInventory() { return expected; } });
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(200); expect(response.json()).toEqual(expected);
    expect(response.json().operatingSystems.items[0].installedAt.precision).toBe("timestamp");
    expect(response.json().installations.items[0].installedAt.precision).toBe("date");
    expect(response.json().installations.items[0].software.publisher).toBeNull();
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("returns complete empty collections only with acquired sources", async () => {
    const r = readers(async (route, query) => route === "Assets/Computer" && query?.start === 0 ? [{ id: 42 }] : []);
    const assetId = await id(r); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(200); expect(validateSoftwareInventoryV2(response.json())).toEqual([]);
    for (const name of ["operatingSystems", "installations"]) expect(response.json()[name]).toMatchObject({ state: "complete", items: [], pagination: { retrieved: 0, total: 0 }, sourceReferences: [expect.anything()] });
  });
  it.each(["missing", "42", "glpi:other:Computer:42"])("hides absent/foreign canonical identity %s", async assetId => {
    const r = readers(); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(404); expect(response.json().code).toBe("ASSET_NOT_FOUND");
    expect(r.get.mock.calls.every(([route]) => route === "Assets/Computer")).toBe(true);
  });
  it.each(["missing", "ambiguous", "foreign", "invalid"])("rejects %s Computer anchor before software I/O", async kind => {
    const r = readers(); const snapshot = await r.technologyProvider.getSnapshot(); const original = snapshot.assets[0]!;
    const source = original.sourceReferences[0]!;
    const changed = { ...original, provenance: [], sourceReferences: kind === "missing" ? [{ ...source, entityType: "Monitor", sourceScope: "Assets/Monitor" }] : kind === "ambiguous" ? [source, { ...source, externalId: "43" }] : [{ ...source, ...(kind === "foreign" ? { sourceInstanceId: "foreign" } : { externalId: "not-an-id" }) }] };
    const provider = { ...r.technologyProvider, async getSnapshot() { return { ...snapshot, assets: [changed] }; } };
    r.get.mockClear(); await live(provider, r.softwareAdapter);
    const response = await app!.inject({ url: path(original.id) });
    expect(response.statusCode).toBe(404);
    expect(r.get).not.toHaveBeenCalled(); expect(response.body).not.toMatch(/foreign|not-an-id|unambiguous/);
  });
  it("preserves a canonical ID unrelated to source ID or hostname", async () => {
    const r = readers(); const snapshot = await r.technologyProvider.getSnapshot();
    const provider = { ...r.technologyProvider, async getSnapshot() { return { ...snapshot, assets: snapshot.assets.map(asset => ({ ...asset, id: "SYNTHETIC-CANONICAL" })) }; } };
    await live(provider, r.softwareAdapter);
    const response = await app!.inject({ url: path("SYNTHETIC-CANONICAL") });
    expect(response.statusCode).toBe(200); expect(response.json().assetId).toBe("SYNTHETIC-CANONICAL");
    expect(r.get.mock.calls.some(([route]) => route === installPath)).toBe(true);
  });
  it.each(["SYNTH ASSET", "SYNTH  ASSET", "SYNTH\tASSET", "X"])("resolves canonical ID %j literally without normalizing interior whitespace", async assetId => {
    const r = readers(); const snapshot = await r.technologyProvider.getSnapshot();
    const asset = { ...snapshot.assets[0]!, id: assetId };
    const provider = { ...r.technologyProvider, async getSnapshot() { return { ...snapshot, assets: [asset] }; } };
    const getInventory = vi.fn(r.softwareAdapter.getInventory);
    await live(provider, { getInventory });
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(200);
    expect(response.json().assetId).toBe(assetId);
    expect(validateSoftwareInventoryV2(response.json())).toEqual([]);
    expect(getInventory).toHaveBeenCalledExactlyOnceWith(asset);
    getInventory.mockClear(); r.get.mockClear();
    for (const differentId of new Set([`${assetId} OTHER`, assetId.replace(/\s/g, ""), assetId.replace(/\s+/g, " ")])) {
      if (differentId === assetId) continue;
      const absent = await app!.inject({ url: path(differentId) });
      expect(absent.statusCode).toBe(404);
    }
    expect(getInventory).not.toHaveBeenCalled();
    expect(r.get).not.toHaveBeenCalled(); // Fixed authorized snapshot; no source calls on a different canonical ID.
  });
  it.each(["provider=demo", "instance=foreign", "entity=1", "scope=Assets/Software", "sections=installations", "unknown=1"])("rejects query %s before provider read", async query => {
    const r = readers(); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: `${path("synthetic")}?${query}` });
    expect(response.statusCode).toBe(400); expect(r.get).not.toHaveBeenCalled();
  });
  it("rejects oversized asset parameters", async () => {
    const r = readers(); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path("x".repeat(1025)) });
    expect(response.statusCode).toBe(414); expect(r.get).not.toHaveBeenCalled();
  });
  it.each([" ", "\t", " SYNTH ASSET", "SYNTH ASSET ", " SYNTH ASSET ", "\tSYNTH ASSET", "SYNTH ASSET\t", "SYNTH ASSET\n", "SYNTH ASSET\r\n", "\u00a0SYNTH ASSET", "SYNTH ASSET\u00a0"])("rejects blank or untrimmed asset parameter %j with 400 before any provider read", async assetId => {
    const r = readers(); const getSnapshot = vi.fn(r.technologyProvider.getSnapshot);
    await live({ ...r.technologyProvider, getSnapshot }, r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(400); expect(r.get).not.toHaveBeenCalled();
    expect(getSnapshot).not.toHaveBeenCalled();
  });
  it("rejects an empty assetId route segment before any provider read", async () => {
    const r = readers(); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path("") });
    expect(response.statusCode).toBe(400); expect(r.get).not.toHaveBeenCalled();
  });
  it("Demo never fabricates Live availability", async () => {
    const r = readers(); app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test" }), softwareAdapter: r.softwareAdapter, authenticationProvider: authentication() });
    const response = await app.inject({ url: path("DEMO-0007") });
    expect(response.statusCode).toBe(503); expect(r.get).not.toHaveBeenCalled();
  });
  it.each(["missing-adapter", "unavailable", "snapshot-error"])("sanitizes %s", async failure => {
    const r = readers(); const assetId = await id(r);
    const provider = failure === "unavailable" ? { ...r.technologyProvider, descriptor: { ...r.technologyProvider.descriptor, availability: "unavailable" as const } }
      : failure === "snapshot-error" ? { ...r.technologyProvider, async getSnapshot(): Promise<never> { throw new Error("SYNTH-SECRET"); } } : r.technologyProvider;
    await live(provider, failure === "missing-adapter" ? undefined : r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(503); expect(response.json()).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(response.body).not.toContain("SYNTH-SECRET");
  });
  it.each([401, 403])("discards already acquired OS/software after upstream catalogue %s", async status => {
    const r = readers(); const assetId = await id(r); const original = r.get.getMockImplementation()!;
    r.get.mockImplementation(async (route, query) => {
      if (route === versionPath && query?.start !== 0) throw new GlpiRequestError("SYNTH-UPSTREAM-SECRET", status);
      return original(route, query);
    });
    await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(503); expect(response.body).not.toMatch(/SYNTH|operatingSystems|installations|sourceReferences/);
  });
  it.each(["catalogue", "transport", "unresolved"])("keeps valid OS and explicit partial software: %s", async failure => {
    const r = readers(); const assetId = await id(r); const original = r.get.getMockImplementation()!;
    r.get.mockImplementation(async (route, query) => {
      if (failure === "transport" && route === installPath && query?.start !== 0) throw new Error("synthetic network");
      if (failure === "catalogue" && route === versionPath && query?.start !== 0) throw new GlpiRequestError("synthetic", 503);
      if (failure === "unresolved" && route === versionPath) return [];
      return original(route, query);
    });
    await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path(assetId) });
    expect(response.statusCode).toBe(200); expect(response.json().installations.state).toBe("partial");
    expect(response.json().installations.gaps.length).toBeGreaterThan(0); expect(response.json().installations.items).toHaveLength(1);
    expect(validateSoftwareInventoryV2(response.json())).toEqual([]);
    if (failure === "unresolved") expect(response.json().installations.items[0].software).toBeNull();
  });
  it.each(["invalid", "wrong-asset", "both-unavailable"])("rejects incompatible output %s", async failure => {
    const r = readers(); const assetId = await id(r);
    await live(r.technologyProvider, { async getInventory(asset) {
      const inventory = await r.softwareAdapter.getInventory(asset);
      return { ...inventory, ...(failure === "wrong-asset" ? { assetId: "wrong" } : failure === "invalid" ? { installations: { state: "complete", items: [] } } : { installations: { state: "unavailable", reason: "source_error" }, operatingSystems: { state: "unavailable", reason: "source_error" } }) } as SoftwareInventoryV2;
    } });
    const response = await app!.inject({ url: path(assetId) }); expect(response.statusCode).toBe(503);
  });
  it("serializes gaps, null pagination and unresolved version without losing evidence", async () => {
    const r = readers(undefined, [{ id: 1, softwareversion: null }, { id: 2, date_install: "invalid" }]);
    const asset = (await r.technologyProvider.getSnapshot()).assets[0]!;
    const expected = await r.softwareAdapter.getInventory(asset);
    await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: path(asset.id) });
    expect(response.statusCode).toBe(200); expect(response.json()).toEqual(expected);
    expect(response.json().installations).toMatchObject({ state: "partial", pagination: null, items: [{ software: null, version: null, installedAt: null }] });
  });
  it("generates reusable OpenAPI 3.0.3 schemas for every Software field and coverage variant", async () => {
    const r = readers(); await live(r.technologyProvider, r.softwareAdapter);
    const response = await app!.inject({ url: "/openapi.json" }); expect(response.statusCode).toBe(200);
    const doc = response.json(); expect(doc.openapi).toBe("3.0.3");
    const operation = doc.paths["/api/v2/technology/assets/{assetId}/software"].get;
    expect(operation.security).toEqual([{ nexusBearer: [] }]);
    expect(Object.keys(operation.responses)).toEqual(["200", "400", "401", "403", "404", "503"]);
    const resolve = (schema: any): any => schema.$ref ? resolve(doc.components.schemas[schema.$ref.split("/").at(-1)]) : schema;
    const inventory = resolve(operation.responses[200].content["application/json"].schema);
    expect(inventory.required).toEqual(["contractVersion", "assetId", "operatingSystems", "installations"]);
    for (const name of ["operatingSystems", "installations"]) {
      const variants = resolve(inventory.properties[name]).oneOf.map(resolve);
      expect(variants.map((variant: any) => variant.properties.state.enum[0])).toEqual(["complete", "partial", "unavailable", "not_applicable", "not_requested"]);
      expect(variants[1].properties.gaps.minItems).toBe(1);
      const item = resolve(variants[0].properties.items.items);
      expect(item.required).toEqual(expect.arrayContaining(["installationId", "installedAt", "collectedAt", "observedAt", "sourceReferences", "provenance"]));
      expect(item.properties.installedAt.anyOf).toHaveLength(2);
      expect(resolve(item.properties.sourceReferences.items).properties).toHaveProperty("sourceInstanceId");
      expect(resolve(item.properties.provenance.items).properties).toHaveProperty("evidence");
    }
    for (const name of ["SoftwareIdentityV2", "SoftwareVersionV2", "SoftwarePaginationV2", "SoftwareInstallationDateV2"]) expect(Object.values(doc.components.schemas).some((schema: any) => schema.title === name)).toBe(true);
    expect(JSON.stringify(doc.components.schemas)).not.toContain('"type":"null"');
    expect(JSON.stringify(inventory)).not.toContain('"type":"null"');
    expect(JSON.stringify(doc)).not.toContain('"type":"null"');
  });
  it("uses one runtime OAuth identity and transport; preserves Hardware, v1 and snapshot 0.2", async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/token")) return Response.json({ token_type: "Bearer", expires_in: 3600, access_token: "SYNTH-TOKEN" });
      expect(init?.headers).toMatchObject({ authorization: "Bearer SYNTH-TOKEN" });
      return Response.json(url.pathname.endsWith("/Assets/Computer") && url.searchParams.get("start") === "0" ? [{ id: 42 }] : []);
    });
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    const services = createRuntimeTechnologyServices(config, { now: () => Date.parse(at), environment: { NEXUS_GLPI_INSTANCE_ID: instance, NEXUS_GLPI_BASE_URL: "https://synthetic.invalid", NEXUS_GLPI_OAUTH_CLIENT_ID: "synthetic-client", NEXUS_GLPI_SERVICE_USERNAME: "synthetic-service" }, credentialSource: async () => ({ clientSecret: "synthetic", password: "synthetic" }), fetchImpl })!;
    app = await buildApp({ config, ...services, authenticationProvider: authentication() });
    const snapshot = (await app.inject({ url: "/api/v1/technology/snapshot" })).json(); const assetId = snapshot.assets[0].id;
    expect((await app.inject({ url: path(assetId) })).statusCode).toBe(200);
    expect((await app.inject({ url: path(assetId).replace(/software$/, "hardware") })).statusCode).toBe(200);
    expect((await app.inject({ url: "/api/v1/technology/snapshot" })).json()).toEqual(snapshot);
    expect(snapshot.schemaVersion).toBe("0.2"); expect(fetchImpl.mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(1);
  });
  it("rejects saturation with sanitized 503, preserves other routes and releases after timeout drain", async () => {
    const r = readers(); const assetId = await id(r); const original = r.get.getMockImplementation()!;
    let release!: (value: unknown) => void;
    const late = new Promise<unknown>(resolve => { release = resolve; });
    r.get.mockImplementation(async (route, query, context) => route === osPath ? late : original(route, query, context));
    app = await buildApp({ config: loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), ...r,
      softwareOperationLimits: { deadlineMs: 100, maxRequests: 64, maxRecords: 20000, maxConcurrent: 1 }, authenticationProvider: authentication() });
    await app.ready();
    const first = app.inject({ url: path(assetId) });
    // inject is lazy until then() is attached.
    const started = first.then(response => response);
    await vi.waitFor(() => expect(r.get.mock.calls.some(([route]) => route === osPath)).toBe(true));
    const saturated = await app.inject({ url: path(assetId) });
    expect(saturated.statusCode).toBe(503); expect(saturated.json().code).toBe("INTERNAL_ERROR");
    expect((await app.inject({ url: "/api/v1/technology/snapshot" })).statusCode).toBe(200);
    expect((await app.inject({ url: path(assetId).replace(/software$/, "hardware") })).statusCode).toBe(200);
    expect((await started).statusCode).toBe(503);
    expect(activeSoftwareOperations()).toBe(1);
    expect((await app.inject({ url: path(assetId) })).statusCode).toBe(503);
    const softwareCalls = r.get.mock.calls.filter(([route]) => route === osPath || route === installPath).length;
    release([]); await vi.waitFor(() => expect(activeSoftwareOperations()).toBe(0));
    expect(r.get.mock.calls.filter(([route]) => route === osPath || route === installPath)).toHaveLength(softwareCalls);
    r.get.mockImplementation(original);
    expect((await app.inject({ url: path(assetId) })).statusCode).toBe(200);
  });
  it("does not start OAuth or GLPI after slow credential loading outlives the operation", async () => {
    let release!: (value: { clientSecret: string; password: string }) => void;
    const credentials = new Promise<{ clientSecret: string; password: string }>(resolve => { release = resolve; });
    const fetchImpl = vi.fn(async () => Response.json([]));
    const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
    const services = createRuntimeTechnologyServices(config, { environment: { NEXUS_GLPI_INSTANCE_ID: instance, NEXUS_GLPI_BASE_URL: "https://synthetic.invalid", NEXUS_GLPI_OAUTH_CLIENT_ID: "synthetic", NEXUS_GLPI_SERVICE_USERNAME: "synthetic", NEXUS_SOFTWARE_DEADLINE_MS: "20", NEXUS_SOFTWARE_MAX_CONCURRENT: "1" }, credentialSource: () => credentials, fetchImpl })!;
    app = await buildApp({ config, ...services, authenticationProvider: authentication() });
    const response = await app.inject({ url: path("synthetic") });
    expect(response.statusCode).toBe(503); expect(activeSoftwareOperations()).toBe(1); expect(fetchImpl).not.toHaveBeenCalled();
    release({ clientSecret: "synthetic", password: "synthetic" });
    await vi.waitFor(() => expect(activeSoftwareOperations()).toBe(0)); expect(fetchImpl).not.toHaveBeenCalled();
  });
});
