import {
  technologySchemaVersion,
  validateTechnologySnapshot,
  validateTechnologySnapshotTaxonomy,
} from "@igx-nexus/types";
import { describe, expect, it } from "vitest";
import {
  ProviderConfigurationError,
  ProviderUnavailableError,
  demoTechnologyProvider,
  publicProviderDescriptor,
  resolveTechnologyProvider,
  unavailableLiveTechnologyProvider,
  type TechnologyProvider,
} from "./provider.js";

describe("Technology Provider contract", () => {
  it("exposes the complete valid canonical synthetic snapshot in demo mode", async () => {
    const provider = resolveTechnologyProvider("demo");
    const snapshot = await provider.getSnapshot();

    expect(provider).toBe(demoTechnologyProvider);
    expect(provider.descriptor).toMatchObject({
      mode: "demo",
      availability: "ready",
      sourceSystems: ["demo"],
      capabilities: ["technology.snapshot.read"],
    });
    expect(snapshot.schemaVersion).toBe(technologySchemaVersion);
    expect(snapshot.assets).toHaveLength(240);
    expect(snapshot.assets.map((asset) => asset.id)).toEqual(
      Array.from({ length: 240 }, (_, index) => `DEMO-${String(index + 1).padStart(4, "0")}`),
    );
    expect(snapshot.assets.every((asset) => asset.sourceReferences.every((ref) => ref.source === "demo"))).toBe(true);
    expect(snapshot.assets.every((asset) => asset.taxonomy?.taxonomyVersion === "2")).toBe(true);
    expect(validateTechnologySnapshot(snapshot).filter((issue) => issue.severity === "error")).toEqual([]);
    expect(validateTechnologySnapshotTaxonomy(snapshot)).toEqual([]);
  });

  it("preserves the intended IT and OT hero semantics", async () => {
    const snapshot = await demoTechnologyProvider.getSnapshot();
    const byId = new Map(snapshot.assets.map((asset) => [asset.id, asset]));

    expect(byId.get("DEMO-0007")).toMatchObject({
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      lifecycle: "active",
      criticality: "medium",
    });
    expect(byId.get("DEMO-0013")).toMatchObject({
      domain: "OT",
      assetClass: "operator_interface",
      role: "supervision",
      lifecycle: "active",
      criticality: "critical",
    });
  });

  it("fails closed in live mode instead of silently falling back to demo", async () => {
    const provider = resolveTechnologyProvider("live");

    expect(provider).toBe(unavailableLiveTechnologyProvider);
    expect(provider.descriptor).toMatchObject({
      mode: "live",
      availability: "unavailable",
      capabilities: [],
      sourceSystems: [],
    });
    await expect(provider.getSnapshot()).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("accepts an injected provider only when its descriptor matches configured mode", () => {
    const injected: TechnologyProvider = {
      descriptor: {
        id: "test.live",
        mode: "live",
        displayName: "Test Live Provider",
        availability: "ready",
        capabilities: ["technology.snapshot.read"],
        sourceSystems: ["custom:test"],
      },
      async getSnapshot() {
        return demoTechnologyProvider.getSnapshot();
      },
    };

    expect(resolveTechnologyProvider("live", injected)).toBe(injected);
    expect(() => resolveTechnologyProvider("demo", injected)).toThrow(ProviderConfigurationError);
  });

  it("rejects a ready provider that cannot read the canonical snapshot", () => {
    const invalid: TechnologyProvider = {
      descriptor: {
        id: "invalid.live",
        mode: "live",
        displayName: "Invalid",
        availability: "ready",
        capabilities: [],
        sourceSystems: [],
      },
      async getSnapshot() {
        return demoTechnologyProvider.getSnapshot();
      },
    };

    expect(() => resolveTechnologyProvider("live", invalid)).toThrow(ProviderConfigurationError);
  });

  it("returns only the explicit public descriptor fields", () => {
    const descriptor = publicProviderDescriptor(demoTechnologyProvider.descriptor);
    expect(descriptor).toEqual({
      id: "demo.canonical.v0.2",
      mode: "demo",
      displayName: "Canonical Demo Provider",
      availability: "ready",
      capabilities: ["technology.snapshot.read"],
      sourceSystems: ["demo"],
    });
  });
});
