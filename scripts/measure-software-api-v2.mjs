// Synthetic only. Build API/Types first. Never reads environment credentials or contacts GLPI.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createGlpiSoftwareAdapter } from "../services/api/dist/glpi-software.js";
import { createGlpiTechnologyProvider } from "../services/api/dist/glpi.js";
import { activeSoftwareOperations, defaultSoftwareOperationLimits, guardSoftwareTransport, runSoftwareOperation } from "../services/api/dist/software-operation.js";
import { buildApp } from "../services/api/dist/app.js";
import { loadConfig } from "../services/api/dist/config.js";
import { createRuntimeTechnologyServices } from "../services/api/dist/glpi-runtime.js";

const output = resolve(process.argv[2] ?? ".tmp/pr8-audit");
await mkdir(output, { recursive: true });
const results = [];
const osPath = "Assets/Computer/42/OSInstallation";
const installPath = "Assets/Computer/42/SoftwareInstallation";
const at = "2026-10-13T12:00:00.000Z";
function fixture({ installations = 1, products = 1, versions = 1, snapshotRecords = 1, pageSize = 100, empty = false, delayMs = 0, nonCancelable = false, partial = false } = {}) {
  const collections = {
    "Assets/Computer": Array.from({ length: snapshotRecords }, (_, i) => ({ id: 42 + i })),
    [osPath]: empty ? [] : [{ id: 1, operatingsystem: { id: 1, name: "SYNTHETIC-OS" }, date_install: at }],
    [installPath]: Array.from({ length: empty ? 0 : installations }, (_, i) => ({ id: i + 1, softwareversion: { id: 100000 + (i % products) * versions + (i % versions) }, date_install: "2026-10-01" })),
    "Assets/Software": Array.from({ length: products }, (_, i) => ({ id: i + 1, name: `SYNTHETIC-${i}` })),
  };
  for (let i = 0; i < products; i++) collections[`Assets/Software/${i + 1}/Version`] = Array.from({ length: versions }, (_, j) => ({ id: 100000 + i * versions + j, name: `SYNTHETIC-v${j}`, software: { id: i + 1 } }));
  const metrics = { calls: 0, returnedRecords: 0, pending: 0, peakPending: 0, heapPeakBytes: process.memoryUsage().heapUsed, paths: [] };
  const transport = guardSoftwareTransport({ async get(path, query = {}, context) {
    metrics.calls++; metrics.pending++; metrics.peakPending = Math.max(metrics.peakPending, metrics.pending);
    metrics.paths.push({ path, start: query.start, limit: query.limit });
    try {
      if (delayMs) await new Promise((done, reject) => {
        const signal = context?.signal;
        const abort = () => { clearTimeout(timer); reject(new Error("Synthetic cancellation")); };
        const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); done(); }, delayMs);
        if (!nonCancelable && signal) {
          if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
        }
      });
      if (partial && path === "Assets/Software/2/Version") throw new Error("Synthetic operational catalogue failure");
      const page = (collections[path] ?? []).slice(Number(query.start), Number(query.start) + Number(query.limit));
      metrics.returnedRecords += page.length;
      return page;
    } finally {
      metrics.pending--; metrics.heapPeakBytes = Math.max(metrics.heapPeakBytes, process.memoryUsage().heapUsed);
    }
  } });
  const provider = createGlpiTechnologyProvider({ transport, pageSize, sourceInstanceId: "synthetic-benchmark", now: () => new Date(at) });
  const adapter = createGlpiSoftwareAdapter({ transport, pageSize, sourceInstanceId: "synthetic-benchmark", now: () => new Date(at) });
  const work = async () => adapter.getInventory((await provider.getSnapshot()).assets[0]);
  return { work, metrics };
}
async function measure(name, config, limits = defaultSoftwareOperationLimits) {
  const memoryBefore = process.memoryUsage();
  const { work, metrics } = fixture(config);
  const started = performance.now();
  let inventory; let error;
  try { inventory = await runSoftwareOperation(work, limits); } catch (failure) { error = failure.constructor.name; }
  const durationMs = performance.now() - started;
  const pendingAtResponse = metrics.pending; const activeAtResponse = activeSoftwareOperations();
  const countAtResponse = metrics.calls;
  while (metrics.pending || activeSoftwareOperations()) await new Promise(done => setTimeout(done, 5));
  const memoryAfter = process.memoryUsage();
  assert.equal(metrics.calls, countAtResponse, "No new calls after completion/timeout");
  assert(metrics.calls <= limits.maxRequests);
  assert(metrics.returnedRecords <= limits.maxRecords + 1, "One rejected exhaustion probe is allowed");
  results.push({ name, limits, syntheticDelayMsPerCall: config.delayMs ?? 0, durationMs,
    drainDurationMs: performance.now() - started, calls: metrics.calls, returnedRecords: metrics.returnedRecords,
    pendingAtResponse, activeAtResponse, pendingAfterDrain: metrics.pending, activeAfterDrain: activeSoftwareOperations(),
    heapBeforeBytes: memoryBefore.heapUsed, heapAfterBytes: memoryAfter.heapUsed, heapPeakSampleBytes: Math.max(metrics.heapPeakBytes, memoryBefore.heapUsed, memoryAfter.heapUsed),
    rssBeforeBytes: memoryBefore.rss, rssAfterBytes: memoryAfter.rss,
    operatingSystems: inventory?.operatingSystems.state, installations: inventory?.installations.state,
    installationCount: inventory?.installations.items?.length, gapCount: inventory?.installations.gaps?.length ?? 0, error,
    trace: metrics.paths,
  });
  if (inventory) assert.equal(inventory.installations.items.length, config.empty ? 0 : config.installations ?? 1);
}
await measure("empty", { empty: true });
await measure("one-product-one-version", {});
await measure("145-installations-paginated-synthetic", { installations: 145 });
await measure("20-products-20-versions", { installations: 145, products: 20, versions: 20 });
await measure("100-products-10-versions-budget", { installations: 145, products: 100, versions: 10 });
await measure("partial-catalogue", { installations: 145, products: 3, versions: 2, partial: true });
await measure("10000-computers-snapshot-request-budget", { snapshotRecords: 10000, installations: 145 });
await measure("aggregate-20000-record-budget-page1000", { installations: 145, products: 100, versions: 1000, pageSize: 1000 });
await measure("20ms-responses", { installations: 145, products: 20, versions: 20, delayMs: 20 });
await measure("100ms-responses-total-deadline", { installations: 145, products: 100, versions: 10, delayMs: 100 });
await measure("non-cancelable-timeout-retains-slot", { delayMs: 100, nonCancelable: true }, { ...defaultSoftwareOperationLimits, deadlineMs: 20 });

{
  const one = fixture({ delayMs: 20 }); const two = fixture({ delayMs: 20 }); const three = fixture({ delayMs: 20 });
  const started = performance.now();
  const operations = [one, two, three].map(value => runSoftwareOperation(value.work));
  const outcomes = await Promise.allSettled(operations);
  results.push({ name: "three-simultaneous-default-cap-two", durationMs: performance.now() - started,
    outcomes: outcomes.map(value => value.status === "fulfilled" ? "complete" : value.reason.constructor.name),
    calls: [one, two, three].map(value => value.metrics.calls), activeAfterDrain: activeSoftwareOperations(), memory: process.memoryUsage() });
  assert.deepEqual(outcomes.map(value => value.status), ["fulfilled", "fulfilled", "rejected"]);
  assert.equal(three.metrics.calls, 0); assert.equal(activeSoftwareOperations(), 0);
}

// Export the actual generated HTTP/OpenAPI document without a network listener.
{
  const config = loadConfig({ NEXUS_API_ENV: "test", NEXUS_PROVIDER_MODE: "live" });
  let calls = 0; let tokenCalls = 0;
  const services = createRuntimeTechnologyServices(config, { now: () => Date.parse(at),
    environment: { NEXUS_GLPI_INSTANCE_ID: "synthetic-benchmark", NEXUS_GLPI_BASE_URL: "https://synthetic.invalid", NEXUS_GLPI_OAUTH_CLIENT_ID: "synthetic", NEXUS_GLPI_SERVICE_USERNAME: "synthetic" },
    credentialSource: async () => ({ clientSecret: "synthetic", password: "synthetic" }),
    fetchImpl: async input => {
      calls++; const url = new URL(String(input));
      if (url.pathname.endsWith("/token")) { tokenCalls++; return Response.json({ token_type: "Bearer", expires_in: 3600, access_token: "synthetic-token" }); }
      return Response.json(url.pathname.endsWith("/Assets/Computer") && url.searchParams.get("start") === "0" ? [{ id: 42 }] : []);
    },
  });
  const app = await buildApp({ config, ...services, authenticationProvider: { async authenticate() { return { subject: "synthetic", kind: "user", authSource: "synthetic", roles: [], permissions: new Set(["technology:read"]) }; } } });
  try {
    const doc = (await app.inject({ url: "/openapi.json" })).json();
    await writeFile(resolve(output, "openapi.json"), JSON.stringify(doc, null, 2));
    // Use the canonical ID algorithm only in the synthetic client fixture, not in route resolution.
    const { mapGlpiComputerToTechnologyAsset, parseGlpiComputerRecord } = await import("../services/api/dist/glpi.js");
    const asset = mapGlpiComputerToTechnologyAsset(parseGlpiComputerRecord({ id: 42 }), at, "synthetic-benchmark");
    const started = performance.now();
    const response = await app.inject({ url: `/api/v2/technology/assets/${asset.id}/software` });
    assert.equal(response.statusCode, 200); assert.equal(tokenCalls, 1);
    results.push({ name: "runtime-http-empty-cold-oauth", calls, tokenCalls, status: response.statusCode, durationMs: performance.now() - started, body: response.json(), headers: response.headers });
  } finally { await app.close(); }
}
const report = { node: process.version, platform: process.platform, architecture: process.arch, syntheticOnly: true,
  memoryMethod: "Process heap/RSS snapshots; sampled heap peak at transport completions, not an allocator high-water mark. Shared process and GC noise; no forced GC.",
  results };
await writeFile(resolve(output, "measurements.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
