import { afterEach, expect, it, vi } from "vitest";
import { validateHardwareInventoryV2 } from "@igx-nexus/types";
import { hardwareErrorMessages, parseHardwareResponse, requestHardware } from "./hardware-client";
import { hardwareFixture, partialHardware, unknownHardware } from "./test/hardware-fixtures";

afterEach(() => vi.unstubAllGlobals());
it.each([hardwareFixture(), partialHardware(), unknownHardware()])("validates synthetic scenarios using the canonical validator", inventory => {
  expect(validateHardwareInventoryV2(inventory)).toEqual([]);
  expect(parseHardwareResponse(inventory, inventory.assetId)).toBe(inventory);
});
it("encodes the exact canonical ID and preserves session, cache and abort conventions", async () => {
  const signal = new AbortController().signal;
  const response = hardwareFixture("asset/with ?#á");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
  vi.stubGlobal("fetch", fetch);
  expect(await requestHardware(response.assetId, signal)).toEqual(response);
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/v2/technology/assets/asset%2Fwith%20%3F%23%C3%A1/hardware", { method: "GET", headers: { accept: "application/json" }, credentials: "same-origin", cache: "no-store", signal });
});
it.each([[401, "authentication"], [403, "forbidden"], [404, "not_found"], [503, "unavailable"]] as const)("classifies HTTP %s without exposing backend messages", async (status, kind) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private GLPI error", { status })));
  await expect(requestHardware("id", new AbortController().signal)).rejects.toMatchObject({ kind, message: "Hardware request unavailable" });
  expect(hardwareErrorMessages[kind].retry).toBe(status === 503);
});
it("rejects malformed JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad json")));
  await expect(requestHardware("id", new AbortController().signal)).rejects.toMatchObject({ kind: "incompatible" });
});
it.each([null, {}, { ...hardwareFixture(), contractVersion: "0.2" }, { ...hardwareFixture(), assetId: "other" }])("rejects malformed contracts and another asset", value => {
  expect(() => parseHardwareResponse(value, "SYNTH-ASSET-1")).toThrow("Hardware request unavailable");
});
it("distinguishes a network failure from cancellation", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
  await expect(requestHardware("id", new AbortController().signal)).rejects.toMatchObject({ kind: "network" });
  const controller = new AbortController(); controller.abort();
  await expect(requestHardware("id", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
});
