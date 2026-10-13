import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activeSoftwareOperations, guardSoftwareTransport, guardSoftwareOAuthFetch, runSoftwareOperation, SoftwareBudgetError, SoftwareDeadlineError, SoftwareSaturationError, type SoftwareOperationLimits } from "./software-operation.js";
import { createGlpiSoftwareAdapter } from "./glpi-software.js";
import { createGlpiTechnologyProvider, mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord, type GlpiApiTransport } from "./glpi.js";
import { createRuntimeTechnologyServices } from "./glpi-runtime.js";
import { loadConfig } from "./config.js";

const limits: SoftwareOperationLimits = { deadlineMs: 100, maxRequests: 100, maxRecords: 100, maxConcurrent: 2 };
const asset = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42 }), "2026-10-13T12:00:00Z", "synthetic");
const osPath = "Assets/Computer/42/OSInstallation";
const installPath = "Assets/Computer/42/SoftwareInstallation";
const productPath = "Assets/Software";
const versionPath = "Assets/Software/10/Version";
const row = { id: 1, softwareversion: { id: 20 }, date_install: "2026-10-01" };
const lists: Record<string, unknown[]> = { [osPath]: [], [installPath]: [row], [productPath]: [{ id: 10, name: "SYNTHETIC" }], [versionPath]: [{ id: 20, name: "v1" }] };
const environment = { NEXUS_GLPI_INSTANCE_ID: "synthetic", NEXUS_GLPI_BASE_URL: "https://synthetic.invalid", NEXUS_GLPI_OAUTH_CLIENT_ID: "synthetic", NEXUS_GLPI_SERVICE_USERNAME: "synthetic" };
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => vi.useFakeTimers());
afterEach(async () => { await Promise.resolve(); vi.useRealTimers(); expect(activeSoftwareOperations()).toBe(0); });

describe("Software operation — bounded work and retained resource slots", () => {
  it("expires monotonically before the first call", async () => {
    const get = vi.fn(async () => []);
    let tick = 0;
    await expect(runSoftwareOperation(() => guardSoftwareTransport({ get }).get("Assets/Computer"), limits, () => tick++ * 101)).rejects.toBeInstanceOf(SoftwareDeadlineError);
    expect(get).not.toHaveBeenCalled();
  });
  it("accounts snapshot, catalogue and token requests in one shared budget", async () => {
    const get = vi.fn<GlpiApiTransport["get"]>(async (path, query) => {
      if (path === "Assets/Computer") return query?.start === 0 ? [{ id: 42 }] : [];
      return (lists[path] ?? []).slice(Number(query?.start), Number(query?.start) + Number(query?.limit));
    });
    const transport = guardSoftwareTransport({ get });
    const provider = createGlpiTechnologyProvider({ transport, sourceInstanceId: "synthetic" });
    const adapter = createGlpiSoftwareAdapter({ transport, sourceInstanceId: "synthetic" });
    const result = await runSoftwareOperation(async () => {
      const tokenFetch = guardSoftwareOAuthFetch(vi.fn(async () => Response.json({})) as typeof fetch);
      await tokenFetch("https://synthetic.invalid/token");
      const snapshot = await provider.getSnapshot();
      return adapter.getInventory(snapshot.assets[0]!);
    }, { ...limits, maxRequests: 5 });
    expect(get).toHaveBeenCalledTimes(4); // + one OAuth = 5; no catalogue call can start.
    expect(result.operatingSystems.state).toBe("complete");
    expect(result.installations.state).toBe("partial");
    if (result.installations.state !== "partial") throw new Error("Expected partial");
    expect(result.installations.items).toHaveLength(1);
    expect(result.installations.gaps).toContainEqual({ fieldPath: installPath, reason: "pagination_incomplete" });
  });
  it.each([false, true])("exact request budget accepts complete work; one less stays partial (short=%s)", async short => {
    const get = vi.fn<GlpiApiTransport["get"]>(async (path, query) => (lists[path] ?? []).slice(Number(query?.start), Number(query?.start) + Number(query?.limit)));
    const adapter = createGlpiSoftwareAdapter({ transport: guardSoftwareTransport({ get }), sourceInstanceId: "synthetic" });
    const result = await runSoftwareOperation(() => adapter.getInventory(asset), { ...limits, maxRequests: short ? 6 : 7 });
    expect(get).toHaveBeenCalledTimes(short ? 6 : 7);
    expect(result.installations.state).toBe(short ? "partial" : "complete");
    if (result.installations.state !== "partial" && result.installations.state !== "complete") throw new Error("Expected collected");
    expect(result.installations.items).toHaveLength(1);
  });
  it("record budget accepts exact capacity and verified empty probes", async () => {
    const get = vi.fn<GlpiApiTransport["get"]>(async (_path, query) => query?.start === 0 ? [{ id: 1 }] : []);
    const transport = guardSoftwareTransport({ get });
    const result = await runSoftwareOperation(async () => {
      await transport.get("Assets/Computer", { start: 0, limit: 100 });
      return transport.get("Assets/Computer", { start: 1, limit: 100 });
    }, { ...limits, maxRecords: 1 });
    expect(result).toEqual([]);
    expect(get.mock.calls.map(call => call[1]?.limit)).toEqual([1, 1]);
  });
  it("aggregate record bound preserves actual page limits in acquisition provenance", async () => {
    const get = vi.fn<GlpiApiTransport["get"]>(async (path, query) => (lists[path] ?? []).slice(Number(query?.start), Number(query?.start) + Number(query?.limit)));
    const adapter = createGlpiSoftwareAdapter({ transport: guardSoftwareTransport({ get }), sourceInstanceId: "synthetic" });
    const result = await runSoftwareOperation(() => adapter.getInventory(asset), { ...limits, maxRecords: 2 });
    expect(result.installations.state).toBe("partial");
    if (result.installations.state !== "partial") throw new Error("Expected partial");
    expect(result.installations.items).toHaveLength(1);
    const productCalls = get.mock.calls.filter(call => call[0] === productPath);
    expect(productCalls.map(call => call[1]?.limit)).toEqual([1, 1]);
    expect(result.installations.gaps).toContainEqual({ fieldPath: versionPath, reason: "pagination_incomplete" });
    expect(result.installations.sourceReferences[0]!.externalId).toContain("limit=2");
  });
  it("snapshot budget exhaustion fails rather than authorizing against a truncated snapshot", async () => {
    const get = vi.fn<GlpiApiTransport["get"]>(async (_path, query) => [{ id: Number(query?.start) + 1 }]);
    const provider = createGlpiTechnologyProvider({ transport: guardSoftwareTransport({ get }), sourceInstanceId: "synthetic" });
    await expect(runSoftwareOperation(() => provider.getSnapshot(), { ...limits, maxRecords: 1 })).rejects.toBeInstanceOf(SoftwareBudgetError);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls.map(call => call[1]?.limit)).toEqual([1, 1]);
  });
  it("rejects records beyond aggregate capacity and prevents subsequent calls", async () => {
    const get = vi.fn(async () => [{ id: 1 }]);
    const transport = guardSoftwareTransport({ get });
    await runSoftwareOperation(async () => {
      await transport.get("a", { limit: 10 });
      await expect(transport.get("b", { limit: 10 })).rejects.toBeInstanceOf(SoftwareBudgetError);
      await expect(transport.get("c")).rejects.toBeInstanceOf(SoftwareBudgetError);
    }, { ...limits, maxRecords: 1 });
    expect(get).toHaveBeenCalledTimes(2); // second is one-record exhaustion probe, rejected.
  });
  it.each([osPath, versionPath])("deadline during %s retains slot until non-cancelable transport settles", async slowPath => {
    vi.useFakeTimers();
    const late = deferred<unknown>();
    const get = vi.fn<GlpiApiTransport["get"]>(async (path, query) => {
      if (path === slowPath) return slowPath === osPath && query?.start === 0 ? [{ id: 1 }] : late.promise;
      return (lists[path] ?? []).slice(Number(query?.start), Number(query?.start) + Number(query?.limit));
    });
    const adapter = createGlpiSoftwareAdapter({ transport: guardSoftwareTransport({ get }), sourceInstanceId: "synthetic" });
    const pending = runSoftwareOperation(() => adapter.getInventory(asset), limits);
    const assertion = expect(pending).rejects.toBeInstanceOf(SoftwareDeadlineError);
    await vi.advanceTimersByTimeAsync(101); await assertion;
    const count = get.mock.calls.length;
    expect(activeSoftwareOperations()).toBe(1);
    late.resolve([{ id: 99 }]);
    await vi.runAllTimersAsync();
    expect(get).toHaveBeenCalledTimes(count);
    expect(activeSoftwareOperations()).toBe(0);
  });
  it("two simultaneous operations saturate without a queue and release after drain", async () => {
    vi.useFakeTimers();
    const one = deferred<unknown>(); const two = deferred<unknown>();
    const transport = guardSoftwareTransport({ get: vi.fn().mockReturnValueOnce(one.promise).mockReturnValueOnce(two.promise) });
    const first = runSoftwareOperation(() => transport.get("a"), limits);
    const second = runSoftwareOperation(() => transport.get("b"), limits);
    expect(activeSoftwareOperations()).toBe(2);
    await expect(runSoftwareOperation(async () => "queued", limits)).rejects.toBeInstanceOf(SoftwareSaturationError);
    const assertions = [expect(first).rejects.toBeInstanceOf(SoftwareDeadlineError), expect(second).rejects.toBeInstanceOf(SoftwareDeadlineError)];
    await vi.advanceTimersByTimeAsync(101); await Promise.all(assertions);
    expect(activeSoftwareOperations()).toBe(2);
    await expect(runSoftwareOperation(async () => "queued", limits)).rejects.toBeInstanceOf(SoftwareSaturationError);
    one.resolve([]); two.resolve([]); await vi.runAllTimersAsync();
    expect(activeSoftwareOperations()).toBe(0);
    expect(await runSoftwareOperation(async () => "released", limits)).toBe("released");
  });
  it("optional abort cooperates and releases after cancellation actually settles", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const transport = guardSoftwareTransport({ get: async (_path, _query, context) => new Promise((_resolve, reject) => {
      context!.signal!.addEventListener("abort", () => { aborted = true; reject(new Error("synthetic abort")); }, { once: true });
    }) });
    const pending = runSoftwareOperation(() => transport.get("a"), limits);
    const assertion = expect(pending).rejects.toBeInstanceOf(SoftwareDeadlineError);
    await vi.advanceTimersByTimeAsync(101); await assertion;
    expect(aborted).toBe(true); expect(activeSoftwareOperations()).toBe(0);
  });
  it("per-call adapter timeout cannot release an underlying non-cancelable request", async () => {
    vi.useFakeTimers(); const late = deferred<unknown>();
    const transport = guardSoftwareTransport({ get: async () => late.promise });
    const adapter = createGlpiSoftwareAdapter({ transport, sourceInstanceId: "synthetic", requestTimeoutMs: 10 });
    const pending = runSoftwareOperation(() => adapter.getInventory(asset, ["operatingSystems"]), limits);
    const assertion = expect(pending).rejects.toBeInstanceOf(SoftwareDeadlineError);
    await vi.advanceTimersByTimeAsync(11); await assertion;
    expect(activeSoftwareOperations()).toBe(1);
    late.resolve([]); await vi.runAllTimersAsync(); expect(activeSoftwareOperations()).toBe(0);
  });
  it("unrelated consumers of the same transport have no software budget", async () => {
    const get = vi.fn(async () => [1, 2, 3]); const transport = guardSoftwareTransport({ get });
    expect(await transport.get("outside")).toEqual([1, 2, 3]);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("shared OAuth may finish for v1/Hardware after Software deadline without starting expired GLPI calls", async () => {
    const token = deferred<Response>();
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/token")) return token.promise;
      return Response.json(url.searchParams.get("start") === "0" ? [{ id: 42 }] : []);
    });
    const services = createRuntimeTechnologyServices(loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), {
      environment, credentialSource: async () => ({ clientSecret: "synthetic", password: "synthetic" }), fetchImpl,
    })!;
    const software = runSoftwareOperation(() => services.technologyProvider.getSnapshot(), limits);
    const assertion = expect(software).rejects.toBeInstanceOf(SoftwareDeadlineError);
    await vi.advanceTimersByTimeAsync(0);
    const unrelated = services.technologyProvider.getSnapshot();
    await vi.advanceTimersByTimeAsync(101); await assertion;
    expect(activeSoftwareOperations()).toBe(1);
    token.resolve(Response.json({ token_type: "Bearer", expires_in: 3600, access_token: "synthetic-token" }));
    expect((await unrelated).assets).toHaveLength(1);
    await vi.runAllTimersAsync();
    expect(fetchImpl).toHaveBeenCalledTimes(3); // one shared token + two v1 pages; no expired data request.
    expect(activeSoftwareOperations()).toBe(0);
  });
  it("OAuth budget exhaustion is not misclassified as upstream authorization failure", async () => {
    const fetchImpl = vi.fn(async () => Response.json({}));
    const services = createRuntimeTechnologyServices(loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" }), {
      environment, credentialSource: async () => ({ clientSecret: "synthetic", password: "synthetic" }), fetchImpl,
    })!;
    await expect(runSoftwareOperation(() => services.technologyProvider.getSnapshot(), { ...limits, maxRequests: 1 })).rejects.toBeInstanceOf(SoftwareBudgetError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
