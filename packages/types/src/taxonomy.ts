import {
  itTechnologyAssetClasses,
  itTechnologyRoles,
  operationalContextKinds,
  otTechnologyAssetClasses,
  otTechnologyRoles,
  technologyAssetClasses,
  technologyDomains,
  technologyTaxonomyVersion,
  taxonomyClassificationMethods,
  taxonomyClassificationStates,
  type OperationalContextReference,
  type TaxonomyDecision,
  type TechnologyAssetClass,
  type TechnologyDomain,
  type TechnologyRole,
  type TechnologyTaxonomyAssessment,
} from "./model.js";

export interface TaxonomyValidationIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

const itClasses = new Set<string>(itTechnologyAssetClasses);
const otClasses = new Set<string>(otTechnologyAssetClasses);
const itRoles = new Set<string>(itTechnologyRoles);
const otRoles = new Set<string>(otTechnologyRoles);

export function assetClassBelongsToDomain(
  domain: TechnologyDomain,
  assetClass: TechnologyAssetClass,
): boolean {
  return domain === "IT" ? itClasses.has(assetClass) : otClasses.has(assetClass);
}

export function technologyRoleBelongsToDomain(
  domain: TechnologyDomain,
  role: TechnologyRole,
): boolean {
  if (role.startsWith("custom:")) return role.slice("custom:".length).trim().length > 0;
  return domain === "IT" ? itRoles.has(role) : otRoles.has(role);
}

export function validateTaxonomyDecision<T extends string>(
  decision: TaxonomyDecision<T>,
  allowedValues: readonly string[],
  path: string,
  allowCustom = false,
): readonly TaxonomyValidationIssue[] {
  const issues: TaxonomyValidationIssue[] = [];
  if (!taxonomyClassificationStates.includes(decision.state)) {
    issues.push({ code: "taxonomy.state_invalid", path: `${path}.state`, message: "unsupported classification state" });
    return issues;
  }

  if (!decision.ruleId.trim()) {
    issues.push({ code: "taxonomy.rule_required", path: `${path}.ruleId`, message: "classification ruleId is required" });
  }

  if (decision.state === "classified") {
    const known = allowedValues.includes(decision.value);
    const custom = allowCustom && decision.value.startsWith("custom:") && decision.value.slice("custom:".length).trim().length > 0;
    if (!known && !custom) {
      issues.push({ code: "taxonomy.value_invalid", path: `${path}.value`, message: "unsupported classification value" });
    }
    if (!taxonomyClassificationMethods.includes(decision.method)) {
      issues.push({ code: "taxonomy.method_invalid", path: `${path}.method`, message: "unsupported classification method" });
    }
    return issues;
  }

  if (decision.reviewRequired !== true) {
    issues.push({ code: "taxonomy.review_required", path: `${path}.reviewRequired`, message: "unresolved classifications require human review" });
  }
  if (!decision.reasonCode.trim()) {
    issues.push({ code: "taxonomy.reason_required", path: `${path}.reasonCode`, message: "unresolved classifications require a reasonCode" });
  }
  if (decision.state === "conflict" && decision.value !== undefined) {
    const known = allowedValues.includes(decision.value);
    const custom = allowCustom && decision.value.startsWith("custom:") && decision.value.slice("custom:".length).trim().length > 0;
    if (!known && !custom) {
      issues.push({ code: "taxonomy.value_invalid", path: `${path}.value`, message: "unsupported conflicting candidate value" });
    }
  }
  return issues;
}

export function validateTechnologyTaxonomyAssessment(
  assessment: TechnologyTaxonomyAssessment,
): readonly TaxonomyValidationIssue[] {
  const issues: TaxonomyValidationIssue[] = [];
  if (assessment.taxonomyVersion !== technologyTaxonomyVersion) {
    issues.push({ code: "taxonomy.version_invalid", path: "taxonomyVersion", message: `taxonomyVersion must be ${technologyTaxonomyVersion}` });
  }
  issues.push(...validateTaxonomyDecision(assessment.domain, technologyDomains, "domain"));
  issues.push(...validateTaxonomyDecision(assessment.assetClass, technologyAssetClasses, "assetClass"));
  issues.push(...validateTaxonomyDecision(assessment.role, [...itTechnologyRoles, ...otTechnologyRoles], "role", true));

  if (assessment.domain.state === "classified" && assessment.assetClass.state === "classified") {
    if (!assetClassBelongsToDomain(assessment.domain.value, assessment.assetClass.value)) {
      issues.push({
        code: "taxonomy.domain_class_mismatch",
        path: "assetClass.value",
        message: "assetClass is not valid for the classified domain",
      });
    }
  }
  if (assessment.domain.state === "classified" && assessment.role.state === "classified") {
    if (!technologyRoleBelongsToDomain(assessment.domain.value, assessment.role.value)) {
      issues.push({
        code: "taxonomy.domain_role_mismatch",
        path: "role.value",
        message: "role is not valid for the classified domain",
      });
    }
  }
  return issues;
}

export function validateOperationalContextReference(
  context: OperationalContextReference,
  path = "operationalContext",
): readonly TaxonomyValidationIssue[] {
  const issues: TaxonomyValidationIssue[] = [];
  if (!context.id.trim()) {
    issues.push({ code: "context.id_required", path: `${path}.id`, message: "operational context id is required" });
  }
  const known = operationalContextKinds.includes(context.kind as (typeof operationalContextKinds)[number]);
  const custom = context.kind.startsWith("custom:") && context.kind.slice("custom:".length).trim().length > 0;
  if (!known && !custom) {
    issues.push({ code: "context.kind_invalid", path: `${path}.kind`, message: "operational context kind must be known or custom:<name>" });
  }
  if (context.displayName !== undefined && !context.displayName.trim()) {
    issues.push({ code: "context.name_empty", path: `${path}.displayName`, message: "displayName cannot be empty when provided" });
  }
  return issues;
}
