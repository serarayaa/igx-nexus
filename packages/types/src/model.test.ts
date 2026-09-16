import { describe, expect, it } from "vitest";
import {
  sourceReferenceKey,
  technologySchemaVersion,
  type Observation,
  type SourceReference,
  type TechnologyAsset,
  type TechnologyRelationship,
  type TechnologySnapshot,
} from "./model.js";
import {
  isIsoTimestamp,
  validateObservation,
  validateTechnologyAsset,
  validateTechnologyRelationship,
  validateTechnologySnapshot,
} from "./validation.js";

const glpi: SourceReference = {
  source: "glpi",
  externalId: "Computer/412",
  entityType: "Computer",
  sourceScope: "Innergex/Chile",
  observedAt: "2026-09-11T15:00:00Z",
  authority: "authoritative",
};

const intune: SourceReference = {
  source: "intune",
  externalId: "managedDevice/lab-75",
  entityType: "managedDevice",
  observedAt: "2026-09-11T15:02:00Z",
  authority: "trusted",
};

function itAsset(overrides: Partial<TechnologyAsset> = {}): TechnologyAsset {
  return {
    id: "NEXUS-IT-0001",
    displayName: "Notebook laboratorio 75",
    domain: "IT",
    assetClass: "endpoint",
    role: "user_endpoint",
    lifecycle: "active",
    criticality: "medium",
    identifiers: [
      { kind: "hostname", value: "LAB-75", source: glpi },
      { kind: "serial_number", value: "SYNTH-LIVE-LAB-75", source: glpi },
    ],
    sourceReferences: [glpi, intune],
    attributes: {
      manufacturer: "Dell",
      model: "Pro 14",
      memoryGiB: 16,
      managed: true,
    },
    provenance: [
      {
        fieldPath: "attributes.model",
        source: glpi,
        observedAt: "2026-09-11T15:00:00Z",
        ingestedAt: "2026-09-11T15:05:00Z",
        authority: "authoritative",
        confidence: 1,
      },
    ],
    ...overrides,
  };
}

function otAsset(): TechnologyAsset {
  const source: SourceReference = {
    source: "demo",
    externalId: "OT-LAB-PLC-01",
    entityType: "SyntheticOTAsset",
    observedAt: "2026-09-11T15:00:00Z",
    authority: "observed",
  };
  return {
    id: "NEXUS-OT-0001",
    displayName: "PLC laboratorio sintético",
    domain: "OT",
    assetClass: "controller",
    role: "control",
    lifecycle: "active",
    criticality: "high",
    identifiers: [{ kind: "custom:controller-id", value: "PLC-DEMO-01", source }],
    sourceReferences: [source],
    attributes: { zone: "OT-LAB", safetyImpact: false },
    provenance: [],
  };
}

function snapshot(overrides: Partial<TechnologySnapshot> = {}): TechnologySnapshot {
  return {
    schemaVersion: technologySchemaVersion,
    asOf: "2026-09-11T15:15:00Z",
    assets: [itAsset()],
    relationships: [],
    observations: [],
    ...overrides,
  };
}

describe("canonical technology model", () => {
  it("keeps canonical identity independent from multiple upstream references", () => {
    const asset = itAsset();
    expect(asset.id).toBe("NEXUS-IT-0001");
    expect(asset.sourceReferences.map((reference) => reference.source)).toEqual(["glpi", "intune"]);
    expect(validateTechnologyAsset(asset)).toEqual([]);
  });

  it("models OT as an explicit domain and role instead of a peripheral subtype", () => {
    const asset = otAsset();
    expect(asset.domain).toBe("OT");
    expect(asset.assetClass).toBe("controller");
    expect(asset.role).toBe("control");
    expect(validateTechnologyAsset(asset)).toEqual([]);
  });

  it("accepts namespaced custom roles and source systems", () => {
    const customSource: SourceReference = {
      source: "custom:plant-registry",
      externalId: "asset-17",
      observedAt: "2026-09-11T15:00:00-03:00",
      authority: "trusted",
    };
    const asset = itAsset({
      role: "custom:engineering-workstation",
      sourceReferences: [customSource],
      identifiers: [],
      provenance: [],
    });
    expect(validateTechnologyAsset(asset)).toEqual([]);
  });

  it("rejects duplicate source references without collapsing different systems", () => {
    const duplicate = { ...glpi, observedAt: "2026-09-11T15:10:00Z" };
    const issues = validateTechnologyAsset(itAsset({ sourceReferences: [glpi, intune, duplicate] }));
    expect(issues.some((entry) => entry.code === "asset.source_duplicate")).toBe(true);
    expect(sourceReferenceKey(glpi)).not.toBe(sourceReferenceKey(intune));
    expect(sourceReferenceKey(glpi)).toBe(sourceReferenceKey(duplicate));
  });

  it("does not treat hostname or serial as canonical identity", () => {
    const asset = itAsset({
      identifiers: [
        { kind: "hostname", value: "SAME-NAME", source: glpi },
        { kind: "serial_number", value: "SERIAL-01", source: glpi },
      ],
    });
    expect(asset.id).toBe("NEXUS-IT-0001");
    expect(asset.identifiers.map((identifier) => identifier.value)).toContain("SAME-NAME");
    expect(validateTechnologyAsset(asset)).toEqual([]);
  });

  it("requires provenance claims to link to an asset source reference", () => {
    const alienSource: SourceReference = {
      source: "dell",
      externalId: "service-tag/other",
      observedAt: "2026-09-11T15:00:00Z",
      authority: "trusted",
    };
    const asset = itAsset({
      provenance: [{
        fieldPath: "attributes.model",
        source: alienSource,
        observedAt: "2026-09-11T15:00:00Z",
        authority: "trusted",
      }],
    });
    expect(validateTechnologyAsset(asset).some((entry) => entry.code === "provenance.source_unlinked")).toBe(true);
  });
});

describe("timestamps and observations", () => {
  it("requires explicit timezone in ISO timestamps", () => {
    expect(isIsoTimestamp("2026-09-11T15:00:00Z")).toBe(true);
    expect(isIsoTimestamp("2026-09-11T15:00:00-03:00")).toBe(true);
    expect(isIsoTimestamp("2026-09-11T15:00:00.123456789Z")).toBe(true);
    expect(isIsoTimestamp("2026-09-11T15:00:00")).toBe(false);
    expect(isIsoTimestamp("11/09/2026 15:00")).toBe(false);
  });

  it("rejects timestamps that Date.parse would otherwise normalize or accept too loosely", () => {
    expect(isIsoTimestamp("2026-02-29T15:00:00Z")).toBe(false);
    expect(isIsoTimestamp("2024-02-29T15:00:00Z")).toBe(true);
    expect(isIsoTimestamp("2026-04-31T15:00:00Z")).toBe(false);
    expect(isIsoTimestamp("2026-09-11T24:00:00Z")).toBe(false);
    expect(isIsoTimestamp("2026-09-11T15:00:00+14:01")).toBe(false);
    expect(isIsoTimestamp("2026-09-11T15:00:00+14:00")).toBe(true);
  });

  it("models battery capacity as a typed temporal observation", () => {
    const observation: Observation = {
      id: "OBS-001",
      assetId: "NEXUS-IT-0001",
      category: "metric",
      name: "battery.capacity.percent",
      value: { kind: "number", value: 71, unit: "percent" },
      observedAt: "2026-09-11T15:10:00Z",
      ingestedAt: "2026-09-11T15:11:00Z",
      source: intune,
      authority: "trusted",
      confidence: 1,
    };
    expect(validateObservation(observation)).toEqual([]);
    expect(observation.value).toEqual({ kind: "number", value: 71, unit: "percent" });
  });

  it("models event evidence without inventing a Device Health score", () => {
    const observation: Observation = {
      id: "OBS-HANG-001",
      assetId: "NEXUS-IT-0001",
      category: "event",
      name: "application.hang",
      value: { kind: "string", value: "example.exe" },
      observedAt: "2026-09-11T15:10:00Z",
      source: {
        source: "windows",
        externalId: "event/System/1002",
        observedAt: "2026-09-11T15:10:00Z",
        authority: "observed",
      },
      authority: "observed",
      evidence: [{ kind: "event_log", reference: "Application/1002" }],
    };
    expect(validateObservation(observation)).toEqual([]);
    expect("score" in observation).toBe(false);
  });

  it("rejects invalid timestamps and non-finite numeric observations", () => {
    const observation: Observation = {
      id: "OBS-BAD",
      assetId: "NEXUS-IT-0001",
      category: "metric",
      name: "battery.capacity.percent",
      value: { kind: "number", value: Number.NaN, unit: "percent" },
      observedAt: "yesterday",
      source: { ...intune, observedAt: "also-invalid" },
      authority: "trusted",
    };
    const issues = validateObservation(observation);
    expect(issues.some((entry) => entry.code === "timestamp.invalid")).toBe(true);
    expect(issues.some((entry) => entry.code === "observation.number_invalid")).toBe(true);
  });
});

describe("canonical relationships", () => {
  const evidence = [{
    source: glpi,
    observedAt: "2026-09-11T15:00:00Z",
    authority: "trusted" as const,
    confidence: 0.9,
  }];

  it("accepts directed dependency evidence", () => {
    const relationship: TechnologyRelationship = {
      id: "REL-001",
      sourceAssetId: "NEXUS-IT-0001",
      targetAssetId: "NEXUS-IT-0002",
      type: "depends_on",
      direction: "directed",
      status: "active",
      observedAt: "2026-09-11T15:00:00Z",
      evidence,
    };
    expect(validateTechnologyRelationship(relationship)).toEqual([]);
  });

  it("rejects self relationships and incompatible direction", () => {
    const relationship: TechnologyRelationship = {
      id: "REL-BAD",
      sourceAssetId: "NEXUS-IT-0001",
      targetAssetId: "NEXUS-IT-0001",
      type: "connected_to",
      direction: "directed",
      status: "active",
      observedAt: "2026-09-11T15:00:00Z",
      evidence,
    };
    const issues = validateTechnologyRelationship(relationship);
    expect(issues.some((entry) => entry.code === "relationship.self_reference")).toBe(true);
    expect(issues.some((entry) => entry.code === "relationship.direction_invalid")).toBe(true);
  });
});

describe("technology snapshot", () => {
  it("requires the explicit canonical schema version", () => {
    expect(validateTechnologySnapshot(snapshot())).toEqual([]);
    const incompatible = { ...snapshot(), schemaVersion: "0.1" } as unknown as TechnologySnapshot;
    expect(validateTechnologySnapshot(incompatible).some((entry) => entry.code === "snapshot.schema_version_invalid")).toBe(true);
  });

  it("surfaces unresolved imported evidence as warnings instead of hiding it", () => {
    const relationship: TechnologyRelationship = {
      id: "REL-ORPHAN",
      sourceAssetId: "NEXUS-IT-0001",
      targetAssetId: "NEXUS-MISSING",
      type: "depends_on",
      direction: "directed",
      status: "unknown",
      observedAt: "2026-09-11T15:00:00Z",
      evidence: [{ source: glpi, observedAt: "2026-09-11T15:00:00Z", authority: "observed" }],
    };
    const observation: Observation = {
      id: "OBS-ORPHAN",
      assetId: "NEXUS-MISSING",
      category: "state",
      name: "lifecycle.observed",
      value: { kind: "string", value: "active" },
      observedAt: "2026-09-11T15:00:00Z",
      source: glpi,
      authority: "observed",
    };
    const issues = validateTechnologySnapshot(snapshot({
      relationships: [relationship],
      observations: [observation],
    }));
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "snapshot.relationship_endpoint_missing", severity: "warning" }),
      expect.objectContaining({ code: "snapshot.observation_asset_missing", severity: "warning" }),
    ]));
  });

  it("detects duplicate canonical ids", () => {
    const issues = validateTechnologySnapshot(snapshot({
      assets: [itAsset(), itAsset({ displayName: "Duplicado" })],
    }));
    expect(issues.some((entry) => entry.code === "snapshot.asset_id_duplicate")).toBe(true);
  });
});
