import {
  technologySchemaVersion,
  technologyTaxonomyVersion,
  validateTechnologySnapshot,
  type SourceSystem,
  type TechnologyAsset,
  type TechnologySnapshot,
} from "@igx-nexus/types";

export const providerModes = ["demo", "live"] as const;
export type ProviderMode = (typeof providerModes)[number];

export const providerCapabilities = ["technology.snapshot.read"] as const;
export type ProviderCapability = (typeof providerCapabilities)[number];
export type ProviderAvailability = "ready" | "unavailable";

export interface TechnologyProviderDescriptor {
  readonly id: string;
  readonly mode: ProviderMode;
  readonly displayName: string;
  readonly availability: ProviderAvailability;
  readonly capabilities: readonly ProviderCapability[];
  readonly sourceSystems: readonly SourceSystem[];
}

export interface TechnologyProvider {
  readonly descriptor: TechnologyProviderDescriptor;
  getSnapshot(): Promise<TechnologySnapshot>;
  /** Readiness probe opcional para providers con dependencias aguas arriba. */
  checkAvailability?(): Promise<ProviderAvailability>;
}

export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigurationError";
  }
}

export class ProviderUnavailableError extends Error {
  constructor() {
    super("Technology provider is unavailable");
    this.name = "ProviderUnavailableError";
  }
}

const DEMO_AS_OF = "2026-09-09T12:00:00.000Z";

function demoSource(externalId: string) {
  return Object.freeze({
    source: "demo" as const,
    externalId,
    entityType: "asset",
    sourceScope: "demo-v0.1",
    observedAt: DEMO_AS_OF,
    authority: "trusted" as const,
  });
}

function demoAsset(
  id: string,
  displayName: string,
  domain: TechnologyAsset["domain"],
  assetClass: TechnologyAsset["assetClass"],
  role: TechnologyAsset["role"],
  criticality: TechnologyAsset["criticality"],
): TechnologyAsset {
  const source = demoSource(id);
  const ruleId = `demo.v0.1.${domain.toLocaleLowerCase("en-US")}`;
  return Object.freeze({
    id,
    displayName,
    domain,
    assetClass,
    role,
    taxonomy: Object.freeze({
      taxonomyVersion: technologyTaxonomyVersion,
      domain: Object.freeze({ state: "classified", value: domain, method: "normalized", reviewRequired: false, ruleId }),
      assetClass: Object.freeze({ state: "classified", value: assetClass, method: "normalized", reviewRequired: false, ruleId }),
      role: Object.freeze({ state: "classified", value: role, method: "normalized", reviewRequired: false, ruleId }),
    }),
    lifecycle: "active",
    criticality,
    operationalContexts: Object.freeze([]),
    identifiers: Object.freeze([
      Object.freeze({ kind: "asset_tag" as const, value: `DEMO-TAG-${id.slice(-4)}`, source }),
    ]),
    sourceReferences: Object.freeze([source]),
    attributes: Object.freeze({ dataset: "demo-v0.1", synthetic: true }),
    provenance: Object.freeze([
      Object.freeze({
        fieldPath: "displayName",
        source,
        observedAt: DEMO_AS_OF,
        authority: "trusted" as const,
      }),
      Object.freeze({ fieldPath: "domain", source, observedAt: DEMO_AS_OF, authority: "trusted" as const, derivation: "normalized" as const }),
      Object.freeze({ fieldPath: "assetClass", source, observedAt: DEMO_AS_OF, authority: "trusted" as const, derivation: "normalized" as const }),
      Object.freeze({ fieldPath: "role", source, observedAt: DEMO_AS_OF, authority: "trusted" as const, derivation: "normalized" as const }),
    ]),
  });
}

function createCanonicalDemoSnapshot(): TechnologySnapshot {
  const snapshot: TechnologySnapshot = Object.freeze({
    schemaVersion: technologySchemaVersion,
    asOf: DEMO_AS_OF,
    assets: Object.freeze([
      demoAsset("DEMO-0007", "Notebook Demo Ingeniería", "IT", "endpoint", "user_endpoint", "medium"),
      demoAsset("DEMO-0013", "Consola Demo Supervisión Norte", "OT", "operator_interface", "supervision", "critical"),
    ]),
    relationships: Object.freeze([]),
    observations: Object.freeze([]),
  });

  const errors = validateTechnologySnapshot(snapshot).filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    throw new ProviderConfigurationError("Canonical demo provider produced an invalid TechnologySnapshot");
  }
  return snapshot;
}

const demoDescriptor: TechnologyProviderDescriptor = Object.freeze({
  id: "demo.canonical.v0.2",
  mode: "demo",
  displayName: "Canonical Demo Provider",
  availability: "ready",
  capabilities: Object.freeze(["technology.snapshot.read"] as const),
  sourceSystems: Object.freeze(["demo"] as const),
});

const unavailableLiveDescriptor: TechnologyProviderDescriptor = Object.freeze({
  id: "live.unconfigured",
  mode: "live",
  displayName: "Live Provider",
  availability: "unavailable",
  capabilities: Object.freeze([] as const),
  sourceSystems: Object.freeze([] as const),
});

export const demoTechnologyProvider: TechnologyProvider = Object.freeze({
  descriptor: demoDescriptor,
  async getSnapshot() {
    return createCanonicalDemoSnapshot();
  },
});

export const unavailableLiveTechnologyProvider: TechnologyProvider = Object.freeze({
  descriptor: unavailableLiveDescriptor,
  async getSnapshot() {
    throw new ProviderUnavailableError();
  },
});

function assertDescriptor(provider: TechnologyProvider, mode: ProviderMode): void {
  const descriptor = provider.descriptor;
  if (descriptor.mode !== mode) {
    throw new ProviderConfigurationError(
      `Configured provider mode ${descriptor.mode} does not match requested mode ${mode}`,
    );
  }

  if (!descriptor.id.trim() || !descriptor.displayName.trim()) {
    throw new ProviderConfigurationError("Provider descriptor requires non-empty id and displayName");
  }

  if (descriptor.availability === "ready" && !descriptor.capabilities.includes("technology.snapshot.read")) {
    throw new ProviderConfigurationError("Ready provider must declare technology.snapshot.read capability");
  }
}

export function resolveTechnologyProvider(
  mode: ProviderMode,
  injectedProvider?: TechnologyProvider,
): TechnologyProvider {
  if (injectedProvider) {
    assertDescriptor(injectedProvider, mode);
    return injectedProvider;
  }

  const provider = mode === "demo" ? demoTechnologyProvider : unavailableLiveTechnologyProvider;
  assertDescriptor(provider, mode);
  return provider;
}

export async function technologyProviderAvailability(provider: TechnologyProvider): Promise<ProviderAvailability> {
  if (provider.descriptor.availability !== "ready" || !provider.checkAvailability) {
    return provider.descriptor.availability;
  }

  try {
    const availability = await provider.checkAvailability();
    return availability === "ready" || availability === "unavailable" ? availability : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function publicProviderDescriptor(
  descriptor: TechnologyProviderDescriptor,
): TechnologyProviderDescriptor {
  return Object.freeze({
    id: descriptor.id,
    mode: descriptor.mode,
    displayName: descriptor.displayName,
    availability: descriptor.availability,
    capabilities: Object.freeze([...descriptor.capabilities]),
    sourceSystems: Object.freeze([...descriptor.sourceSystems]),
  });
}
