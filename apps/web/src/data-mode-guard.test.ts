import { describe, expect, it } from "vitest";
import type { InventoryProvider } from "./asset-model";
import { demoProvider, demoSnapshot } from "./demo-provider";
import {
  assertSnapshotMatchesMode,
  resolveProviderForMode,
  type ModeAwareInventoryProviderProps,
  type ModeAwareProviderProps,
} from "./data-mode-guard";

describe("data mode guard", () => {
  it("keeps Demo defaults available", async () => {
    const provider = resolveProviderForMode("demo", undefined, demoProvider);
    await expect(provider(new AbortController().signal)).resolves.toBe(demoSnapshot);
  });

  it("fails closed when Live omits the provider", async () => {
    const provider = resolveProviderForMode("live", undefined, demoProvider);
    await expect(provider(new AbortController().signal)).rejects.toThrow(
      "Live mode requires an explicit non-Demo inventory provider",
    );
  });

  it("fails closed when Live explicitly receives the Demo provider", async () => {
    const provider = resolveProviderForMode("live", demoProvider, demoProvider);
    await expect(provider(new AbortController().signal)).rejects.toThrow(
      "Live mode requires an explicit non-Demo inventory provider",
    );
  });

  it("rejects wrapped Demo snapshots under Live", () => {
    expect(() => assertSnapshotMatchesMode("live", demoSnapshot)).toThrow(
      "Live inventory provider returned Demo-labelled assets",
    );
  });

  it("accepts explicitly Live-labelled snapshots", () => {
    const snapshot = {
      ...demoSnapshot,
      assets: demoSnapshot.assets.map(asset => ({ ...asset, dataMode: "live" as const })),
    };
    expect(assertSnapshotMatchesMode("live", snapshot)).toBe(snapshot);
  });

  it("requires a provider at type level whenever mode may be Live", () => {
    const demoProps: ModeAwareProviderProps<InventoryProvider> = {};
    const dynamicMode: "demo" | "live" = "demo";
    const dynamicProps: ModeAwareProviderProps<InventoryProvider> = { mode: dynamicMode, provider: demoProvider };
    const inventoryProps: ModeAwareInventoryProviderProps<InventoryProvider> = {};

    // @ts-expect-error Live mode requires an explicit provider.
    const invalidLiveProps: ModeAwareProviderProps<InventoryProvider> = { mode: "live" };
    // @ts-expect-error Live mode requires an explicit inventoryProvider.
    const invalidLiveInventoryProps: ModeAwareInventoryProviderProps<InventoryProvider> = { mode: "live" };

    expect([demoProps, dynamicProps, inventoryProps, invalidLiveProps, invalidLiveInventoryProps]).toHaveLength(5);
  });
});
