import { describe, expect, it } from "vitest";
import {
  classifyGlpiTaxonomy,
  projectGlpiTaxonomyForLegacyScalars,
  resolvedTaxonomyValue,
  TaxonomyMappingError,
} from "./taxonomy.js";

describe("GLPI → NEXUS taxonomy mapping", () => {
  it("keeps generic Notebook hardware unclassified instead of asserting IT semantics", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Notebook" });
    expect(result.domain).toMatchObject({
      state: "unclassified",
      reviewRequired: true,
      ruleId: "glpi.computer.type.generic-hardware",
    });
    expect(result.assetClass.state).toBe("unclassified");
    expect(result.role.state).toBe("unclassified");
    expect(projectGlpiTaxonomyForLegacyScalars(result)).toEqual({
      domain: "IT",
      assetClass: "endpoint",
      role: "user_endpoint",
      compatibilityFallback: true,
      ruleId: "glpi.computer.compatibility-projection",
    });
  });

  it("keeps generic Server hardware unclassified because it may participate in IT or OT", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Server" });
    expect(result.domain).toMatchObject({ state: "unclassified", ruleId: "glpi.computer.type.generic-hardware" });
    expect(result.assetClass.state).toBe("unclassified");
    expect(result.role.state).toBe("unclassified");
  });

  it("recognizes an explicit OT engineering workstation but requires review of configurable source vocabulary", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Engineering Workstation" });
    expect(result.domain).toMatchObject({ state: "classified", value: "OT", reviewRequired: true });
    expect(result.assetClass).toMatchObject({ state: "classified", value: "industrial_compute", reviewRequired: true });
    expect(result.role).toMatchObject({ state: "classified", value: "engineering_workstation", reviewRequired: true });
  });

  it("normalizes HMI and historian as different OT class/role combinations with review state", () => {
    const hmi = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "HMI" });
    expect(hmi.domain).toMatchObject({ state: "classified", value: "OT", reviewRequired: true });
    expect(hmi.assetClass).toMatchObject({ state: "classified", value: "operator_interface", reviewRequired: true });
    expect(hmi.role).toMatchObject({ state: "classified", value: "supervision", reviewRequired: true });

    const historian = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Historian" });
    expect(historian.domain).toMatchObject({ state: "classified", value: "OT", reviewRequired: true });
    expect(historian.assetClass).toMatchObject({ state: "classified", value: "industrial_compute", reviewRequired: true });
    expect(historian.role).toMatchObject({ state: "classified", value: "historian", reviewRequired: true });
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
