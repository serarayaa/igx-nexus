import { technologySchemaVersion, technologyTaxonomyVersion, type TechnologySnapshot } from "@igx-nexus/types";

/** Full wire fixture: optional fields are deliberate regression coverage, not production data. */
export function canonicalSnapshotFixture(): TechnologySnapshot {
  const at = "2026-09-23T12:00:00.000Z";
  const source = { source: "glpi", sourceInstanceId: "glpi-primary", externalId: "123", entityType: "Computer", sourceScope: "Assets/Computer", observedAt: at, authority: "authoritative" } as const;
  const evidence = [{ kind: "api_response", reference: "fixture:computer/123", label: "Synthetic evidence", observedAt: at }] as const;
  const provenance = [{ fieldPath: "displayName", source, observedAt: at, ingestedAt: at, authority: "authoritative", derivation: "observed", confidence: 1, evidence }] as const;
  return {
    schemaVersion: technologySchemaVersion, asOf: at,
    assets: [{
      id: "NXS-CONTRACT", displayName: "Contract fixture", domain: "IT", assetClass: "endpoint", role: "user_endpoint",
      taxonomy: { taxonomyVersion: technologyTaxonomyVersion,
        domain: { state: "classified", value: "IT", method: "observed", reviewRequired: false, ruleId: "fixture.domain", reasonCode: "observed" },
        assetClass: { state: "classified", value: "endpoint", method: "normalized", reviewRequired: false, ruleId: "fixture.class" },
        role: { state: "classified", value: "user_endpoint", method: "manual", reviewRequired: false, ruleId: "fixture.role" } },
      operationalContexts: [{ id: "site-1", kind: "site", displayName: "Synthetic site", source }],
      lifecycle: "active", criticality: "medium",
      identifiers: [{ kind: "serial_number", value: "SER-CONTRACT-123", source }], sourceReferences: [source], provenance,
      attributes: { "glpi.itemType": "Computer", "glpi.lastInventoryUpdate": "2026-08-24T12:00:00Z", "fixture.values": [1, "value", true, null], "fixture.null": null },
    }],
    relationships: [{ id: "relationship-1", sourceAssetId: "NXS-CONTRACT", targetAssetId: "external-ci", type: "depends_on", direction: "directed", status: "active", observedAt: null,
      evidence: [{ source, observedAt: null, authority: "observed", derivation: "manual", confidence: 0.5, evidence }] }],
    observations: [{ id: "observation-1", assetId: "NXS-CONTRACT", category: "metric", name: "battery.capacity.percent", value: { kind: "number", value: 80, unit: "%" }, observedAt: at, ingestedAt: at, source, authority: "observed", confidence: 0.9, evidence }],
  };
}
