import { describe, expect, it } from "vitest";
import { classifyGlpiTaxonomy, resolvedTaxonomyValue, TaxonomyMappingError } from "./taxonomy.js";

describe("GLPI → NEXUS taxonomy mapping", () => {
  it("normalizes an explicit Notebook type without equating item type to asset class", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Notebook" });
    expect(result.domain).toMatchObject({ state: "classified", value: "IT", method: "inferred" });
    expect(result.assetClass).toMatchObject({ state: "classified", value: "endpoint", method: "normalized" });
    expect(result.role).toMatchObject({ state: "classified", value: "user_endpoint", reviewRequired: true });
  });

  it("separates a GLPI Server source type from endpoint classification", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Server" });
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
    expect(hmi.role).toMatchObject({ state: "classified", value: "supervision" });

    const historian = classifyGlpiTaxonomy({ itemType: "Computer", sourceType: "Historian" });
    expect(historian.assetClass).toMatchObject({ state: "classified", value: "industrial_compute" });
    expect(historian.role).toMatchObject({ state: "classified", value: "historian" });
  });

  it("keeps the current Computer-only Live vertical explicit as a review-required compatibility rule", () => {
    const result = classifyGlpiTaxonomy({ itemType: "Computer" });
    expect(result.domain).toMatchObject({ value: "IT", reviewRequired: true, ruleId: "glpi.computer.compatibility-default" });
    expect(result.assetClass).toMatchObject({ value: "endpoint", reviewRequired: true });
    expect(result.role).toMatchObject({ value: "user_endpoint", reviewRequired: true });
  });

  it("does not invent taxonomy for future GLPI item types without a mapping rule", () => {
    const result = classifyGlpiTaxonomy({ itemType: "NetworkEquipment", sourceType: "Switch" });
    expect(result.domain.state).toBe("unclassified");
    expect(result.assetClass.state).toBe("unclassified");
    expect(result.role.state).toBe("unclassified");
    expect(() => resolvedTaxonomyValue(result.assetClass, "assetClass")).toThrow(TaxonomyMappingError);
  });
});
