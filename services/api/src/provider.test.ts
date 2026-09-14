import { describe, expect, it } from "vitest";
import { technologySchemaVersion, validateTechnologySnapshot, type TechnologyProvider as Never } from "@igx-nexus/types";
import {
  ProviderConfigurationError,
  ProviderUnavailableError,
  demoTechnologyProvider,
  publicProviderDescriptor,
  resolveTechnologyProvider,
  unavailableLiveTechnologyProvider,
  type TechnologyProvider,
} from "./provider.js";

void (0 as unknown as Never);

describe("Technology Provider contract", () => {
  it("exposes a valid canonical synthetic snapshot in demo mode", async () => {
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
    expect(snapshot.assets.map((asset) => asset.id)).toEqual(["DEMO-0007", "DEMO-0013"]);
    expect(snapshot.assets.every((asset) => asset.sourceReferences.every((ref) => ref.source === "demo"))).toBe(true);
    expect(validateTechnologySnapshot(snapshot).filter((issue) => issue.severity === "error")).toEqual([]);
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
