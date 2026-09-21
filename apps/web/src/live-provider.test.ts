import { describe, expect, it } from "vitest";
import { projectCanonicalSnapshot } from "./live-provider";

const canonicalComputer = {
  schemaVersion: "0.2",
  asOf: "2026-09-15T16:00:00.000Z",
  assets: [
    {
      id: "NXS-TEST",
      displayName: "LAB-ENDPOINT",
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      lifecycle: "unknown",
      criticality: "unknown",
      identifiers: [
        { kind: "serial_number", value: "SERIAL-TEST" },
        { kind: "asset_tag", value: "TAG-TEST" },
      ],
      sourceReferences: [
        { source: "glpi", externalId: "1", observedAt: "2026-09-15T15:59:00.000Z", authority: "authoritative" },
      ],
      attributes: {
        "glpi.itemType": "Computer",
        "glpi.lastInventoryUpdate": "2026-09-15T15:58:00.000Z",
        "glpi.manufacturer.name": "Vendor",
        "glpi.model.name": "Model",
        "glpi.location.name": "Lab",
        "nexus.taxonomy.domain.state": "classified",
        "nexus.taxonomy.domain.reviewRequired": false,
        "nexus.taxonomy.assetClass.state": "classified",
        "nexus.taxonomy.assetClass.reviewRequired": false,
        "nexus.taxonomy.role.state": "classified",
        "nexus.taxonomy.role.reviewRequired": false,
        "nexus.taxonomy.compatibilityProjection": false,
      },
      provenance: [],
    },
  ],
  relationships: [],
  observations: [],
};

describe("Live Web provider projection", () => {
  it("projects GLPI canonical data without inventing missing fields", () => {
    const snapshot = projectCanonicalSnapshot(canonicalComputer);
    expect(snapshot).toEqual({
      asOf: "2026-09-15T16:00:00.000Z",
      assets: [expect.objectContaining({
        id: "NXS-TEST",
        name: "LAB-ENDPOINT",
        type: "Computer",
        lifecycle: "unknown",
        criticality: "unknown",
        assetClass: "endpoint",
        role: "user_endpoint",
        taxonomyState: "classified",
        taxonomyReviewRequired: false,
        taxonomyCompatibilityFallback: false,
        serial: "SERIAL-TEST",
        assetTag: "TAG-TEST",
        manufacturer: "Vendor",
        model: "Model",
        location: "Lab",
        lastSeen: "2026-09-15T15:58:00.000Z",
        owner: null,
        hostname: null,
        ipAddress: null,
        warrantyEnds: null,
        dataMode: "live",
        sourceSystems: ["glpi"],
        sourceObservedAt: "2026-09-15T15:59:00.000Z",
      })],
    });
  });


  it("keeps compatibility projection visibly unresolved instead of presenting it as classified", () => {
    const fallback = structuredClone(canonicalComputer);
    fallback.assets[0]!.attributes["nexus.taxonomy.domain.state"] = "unclassified";
    fallback.assets[0]!.attributes["nexus.taxonomy.domain.reviewRequired"] = true;
    fallback.assets[0]!.attributes["nexus.taxonomy.assetClass.state"] = "unclassified";
    fallback.assets[0]!.attributes["nexus.taxonomy.assetClass.reviewRequired"] = true;
    fallback.assets[0]!.attributes["nexus.taxonomy.role.state"] = "unclassified";
    fallback.assets[0]!.attributes["nexus.taxonomy.role.reviewRequired"] = true;
    fallback.assets[0]!.attributes["nexus.taxonomy.compatibilityProjection"] = true;

    const asset = projectCanonicalSnapshot(fallback).assets[0]!;
    expect(asset).toEqual(expect.objectContaining({
      assetClass: "endpoint",
      role: "user_endpoint",
      taxonomyState: "unclassified",
      taxonomyReviewRequired: true,
      taxonomyCompatibilityFallback: true,
    }));
  });

  it("fails closed for unsupported asset types", () => {
    const unsupported = structuredClone(canonicalComputer);
    unsupported.assets[0]!.attributes["glpi.itemType"] = "NetworkEquipment";
    expect(() => projectCanonicalSnapshot(unsupported)).toThrow(/supports only GLPI Computer/);
  });

  it("rejects canonical payloads without source references", () => {
    const invalid = structuredClone(canonicalComputer);
    invalid.assets[0]!.sourceReferences = [];
    expect(() => projectCanonicalSnapshot(invalid)).toThrow(/sourceReferences/);
  });
});
