import { afterEach, expect, it, vi } from "vitest";
import { validateSoftwareInventoryV2 } from "@igx-nexus/types";
import { parseSoftwareResponse, requestSoftware, softwareErrorMessages } from "./software-client";
import { partialSoftware, softwareFixture, unknownSoftware } from "./test/software-fixtures";
import { softwareInstallationDate, softwareRows } from "./software-model";
import { assetSectionHash, routeFromHash } from "./navigation-model";
afterEach(() => vi.unstubAllGlobals());
it.each([softwareFixture(), partialSoftware(), unknownSoftware()])("validates synthetic contracts without transforming fields", inventory => {
  expect(validateSoftwareInventoryV2(inventory)).toEqual([]); expect(parseSoftwareResponse(inventory, inventory.assetId)).toBe(inventory);
});
it("encodes the literal ID, same origin credentials, no store and AbortSignal without query parameters", async () => {
  const inventory = softwareFixture("SYNTH ASSET/?#á"); const signal = new AbortController().signal;
  const fetch = vi.fn().mockResolvedValue(Response.json(inventory)); vi.stubGlobal("fetch", fetch);
  expect(await requestSoftware(inventory.assetId, signal)).toEqual(inventory);
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/v2/technology/assets/SYNTH%20ASSET%2F%3F%23%C3%A1/software", { method: "GET", headers: { accept: "application/json" }, credentials: "same-origin", cache: "no-store", signal });
});
it.each([[401, "authentication"], [403, "forbidden"], [404, "not_found"], [503, "unavailable"]] as const)("classifies HTTP %s without reading upstream error body", async (status, kind) => {
  const response = new Response("SYNTH-PRIVATE-UPSTREAM", { status }); const json = vi.spyOn(response, "json");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(requestSoftware("SYNTH ASSET", new AbortController().signal)).rejects.toMatchObject({ kind, message: "Software request unavailable" });
  expect(json).not.toHaveBeenCalled(); expect(softwareErrorMessages[kind].retry).toBe(status === 503);
});
it.each([null, {}, { ...softwareFixture(), assetId: "other" }, { ...softwareFixture(), contractVersion: "0.2" }])("rejects incompatible responses and other identities", async value => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(value)));
  await expect(requestSoftware("SYNTH ASSET", new AbortController().signal)).rejects.toMatchObject({ kind: "incompatible" });
});
it("rejects malformed JSON and distinguishes cancellation from network errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json")));
  await expect(requestSoftware("id", new AbortController().signal)).rejects.toMatchObject({ kind: "incompatible" });
  const fetch = vi.fn().mockRejectedValue(new Error("SYNTH-private")); vi.stubGlobal("fetch", fetch);
  await expect(requestSoftware("id", new AbortController().signal)).rejects.toMatchObject({ kind: "network" });
  fetch.mockClear(); const controller = new AbortController(); controller.abort();
  await expect(requestSoftware("id", controller.signal)).rejects.toMatchObject({ name: "AbortError" }); expect(fetch).not.toHaveBeenCalled();
});
it("rejects a late body after cancellation even if the transport ignores abort", async () => {
  let release!: (value: unknown) => void;
  const body = new Promise(resolve => { release = resolve; });
  const json = vi.fn(() => body); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json }));
  const controller = new AbortController(); const pending = requestSoftware("SYNTH ASSET", controller.signal);
  await vi.waitFor(() => expect(json).toHaveBeenCalledOnce()); controller.abort();
  const assertion = expect(pending).rejects.toMatchObject({ name: "AbortError" }); release(softwareFixture()); await assertion;
});
it("preserves date precision and presents timestamps with an explicit UTC criterion", () => {
  expect(softwareInstallationDate({ precision: "date", value: "2026-09-01" })).toBe("2026-09-01 · día calendario, sin hora");
  expect(softwareInstallationDate({ precision: "timestamp", value: "2026-09-01T10:00:00+02:00" })).toContain("08:00 UTC · timestamp");
  expect(softwareInstallationDate(null)).toBe("No informada");
});
it("filters and sorts a copy, preserves repeated observations and literal versions", () => {
  const section = softwareFixture().installations; if (section.state !== "complete") throw new Error("fixture");
  const before = JSON.stringify(section.items);
  expect(softwareRows(section.items, "repetido", "all", "name", "ascending")).toHaveLength(2);
  expect(softwareRows(section.items, "", "publisher:Editor Norte", "publisher", "descending").every(({ item }) => item.software?.publisher === "Editor Norte")).toBe(true);
  expect(softwareRows(section.items, "SYNTH-INSTALL-145", "all", "version", "ascending")).toHaveLength(1);
  expect(softwareRows(section.items, "", "unknown", "name", "ascending")).toHaveLength(49);
  expect(softwareRows(section.items, "no-match", "all", "name", "ascending")).toEqual([]);
  expect(JSON.stringify(section.items)).toBe(before);
  const one = section.items[0]!, two = section.items[1]!;
  const versions = [{ ...one, version: { ...one.version!, value: "2" } }, { ...two, version: { ...two.version!, value: "10" } }];
  expect(softwareRows(versions, "", "all", "version", "ascending").map(({ item }) => item.version!.value)).toEqual(["10", "2"]);
});
it("round trips software deep links with an interior space without changing Hardware routes", () => {
  expect(routeFromHash(assetSectionHash("SYNTH ASSET", "software"))).toEqual({ view: "asset", assetId: "SYNTH ASSET", section: "software" });
  expect(assetSectionHash("SYNTH ASSET", "hardware")).toBe("#assets/SYNTH%20ASSET?section=hardware");
});
