import { describe, expect, it } from "vitest";
import {
  classifyGlpiTaxonomy,
  projectGlpiTaxonomyForLegacyScalars,
  resolvedTaxonomyValue,
  TaxonomyMappingError,
} from "./taxonomy.js";

describe("GLPI → NEXUS taxonomy mapping", () => {
  it("normalizes an explicit Notebook type without equating item type to asset class", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Notebook" });
    expect(result.domain).toMatchObject({ state: "classified", value: "IT", method: "inferred", reviewRequired: true });
    expect(result.assetClass).toMatchObject({ state: "classified", value: "endpoint", method: "normalized" });
    expect(result.role).toMatchObject({ state: "classified", value: "user_endpoint", reviewRequired: true });
    expect(projectGlpiTaxonomyForLegacyScalars(result)).toMatchObject({
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      compatibilityFallback: false,
    });
  });

  it("separates a GLPI Server source type from endpoint classification", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Server" });
    expect(result.domain).toMatchObject({ state: "classified", value: "IT", reviewRequired: true });
    expect(result.assetClass).toMatchObject({ state: "classified", value: "server" });
    expect(result.role).toMatchObject({ state: "classified", value: "infrastructure_service", reviewRequired: true });
  });

  it("recognizes an OT engineering workstation without treating it as a common IT endpoint", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Engineering Workstation" });
    expect(result.domain).toMatchObject({ state: "classified", value: "OT" });
    expect(result.assetClass).toMatchObject({ state: "classified", value: "industrial_compute" });
    expect(result.role).toMatchObject({ state: "classified", value: "engineering_workstation" });
  });

  it("normalizes HMI and historian as different class/role combinations", () => {
    const hmi = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "HMI" });
    expect(hmi.assetClass).toMatchObject({ state: "classified", value: "operator_interface" });
    expect(hmi.role).toMatchObject({ state: "classified", value: "supervision", reviewRequired: true });

    const historian = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Historian" });
    expect(historian.assetClass).toMatchObject({ state: "classified", value: "industrial_compute" });
    expect(historian.role).toMatchObject({ state: "classified", value: "historian" });
  });

  it("keeps a Computer without Type unknown instead of asserting IT", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer" });
    expect(result.domain).toMatchObject({ state: "unknown", reviewRequired: true, ruleId: "glpi.computer.type.missing" });
    expect(result.assetClass.state).toBe("unknown");
    expect(result.role.state).toBe("unknown");
    expect(() => resolvedTaxonomyValue(result.domain, "domain")).toThrow(TaxonomyMappingError);

    expect(projectGlpiTaxonomyForLegacyScalars(result)).toEqual({
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      compatibilityFallback: true,
      ruleId: "glpi.computer.compatibility-projection",
    });
  });

  it("keeps a present but unmapped ComputerType unclassified", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Plant Special PC" });
    expect(result.domain).toMatchObject({ state: "unclassified", reviewRequired: true, ruleId: "glpi.computer.type.unmapped" });
    expect(result.assetClass.state).toBe("unclassified");
    expect(result.role.state).toBe("unclassified");
    expect(projectGlpiTaxonomyForLegacyScalars(result).compatibilityFallback).toBe(true);
  });

  it("does not invent taxonomy for future GLPI item types without a mapping rule", () => {
    const result = classifyGlpiTaxonomy({ itemType: "NetworkEquipment", sourceType: "Switch" });
    expect(result.domain.state).toBe("unclassified");
    expect(result.assetClass.state).toBe("unclassified");
    expect(result.role.state).toBe("unclassified");
    expect(() => resolvedTaxonomyValue(result.assetClass, "assetClass")).toThrow(TaxonomyMappingError);
  });
});
