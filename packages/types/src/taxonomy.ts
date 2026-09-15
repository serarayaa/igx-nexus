import {
  itTechnologyAssetClasses,
  itTechnologyRoles,
  operationalContextKinds,
  otTechnologyAssetClasses,
  otTechnologyRoles,
  technologyDomains,
  technologyTaxonomyVersion,
  taxonomyClassificationMethods,
  taxonomyClassificationStates,
  v2TechnologyAssetClasses,
  type OperationalContextReference,
  type TaxonomyDecision,
  type TechnologyAsset,
  type TechnologyAssetClass,
  type TechnologyDomain,
  type TechnologyRole,
  type TechnologySnapshot,
  type TechnologyTaxonomyAssessment,
} from "./model.js";
import { validateSourceReference } from "./validation.js";

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
      issues.push({ code: "taxonomy.value_invalid", path: `${path}.value`, message: "unsupported v2 classification value" });
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
  if (decision.state === "conflict") {
    if (decision.value !== undefined) {
      const known = allowedValues.includes(decision.value);
      const custom = allowCustom && decision.value.startsWith("custom:") && decision.value.slice("custom:".length).trim().length > 0;
      if (!known && !custom) {
        issues.push({ code: "taxonomy.value_invalid", path: `${path}.value`, message: "unsupported conflicting candidate value" });
      }
    }
    if (decision.method !== undefined && !taxonomyClassificationMethods.includes(decision.method)) {
      issues.push({ code: "taxonomy.method_invalid", path: `${path}.method`, message: "unsupported classification method" });
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
  issues.push(...validateTaxonomyDecision(assessment.assetClass, v2TechnologyAssetClasses, "assetClass"));
  issues.push(...validateTaxonomyDecision(assessment.role, [...itTechnologyRoles, ...otTechnologyRoles], "role", true));

  if (assessment.domain.state === "classified" && assessment.assetClass.state === "classified") {
    if (!assetClassBelongsToDomain(assessment.domain.value, assessment.assetClass.value)) {
      issues.push({ code: "taxonomy.domain_class_mismatch", path: "assetClass.value", message: "assetClass is not valid for the classified domain" });
    }
  }
  if (assessment.domain.state === "classified" && assessment.role.state === "classified") {
    if (!technologyRoleBelongsToDomain(assessment.domain.value, assessment.role.value)) {
      issues.push({ code: "taxonomy.domain_role_mismatch", path: "role.value", message: "role is not valid for the classified domain" });
    }
  }
  return issues;
}

/**
 * Valida la proyección escalar de un asset v2.
 *
 * Mientras V02-010/V02-011 mantienen los campos escalares legacy obligatorios,
 * una decisión `unknown`, `unclassified` o `conflict` puede convivir con una
 * proyección de compatibilidad. Sólo una decisión `classified` afirma un valor
 * taxonómico y, por lo tanto, debe coincidir exactamente con el scalar proyectado.
 */
export function validateAssetTaxonomyProjection(
  asset: TechnologyAsset,
  path = "asset",
): readonly TaxonomyValidationIssue[] {
  if (!asset.taxonomy) return [];
  const issues = validateTechnologyTaxonomyAssessment(asset.taxonomy).map((issue) => ({
    ...issue,
    path: `${path}.taxonomy.${issue.path}`,
  }));
  const comparisons: readonly ["domain" | "assetClass" | "role", string][] = [
    ["domain", asset.domain],
    ["assetClass", asset.assetClass],
    ["role", asset.role],
  ];
  for (const [field, projectedValue] of comparisons) {
    const decision = asset.taxonomy[field];
    if (decision.state === "classified" && decision.value !== projectedValue) {
      issues.push({ code: "taxonomy.projection_mismatch", path: `${path}.${field}`, message: "canonical value does not match classified taxonomy assessment" });
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
  if (context.source !== undefined) {
    validateSourceReference(context.source, `${path}.source`).forEach((sourceIssue) => {
      issues.push({ code: sourceIssue.code, path: sourceIssue.path, message: sourceIssue.message });
    });
  }
  return issues;
}

/**
 * Gate v2 aditivo: snapshots legacy siguen siendo válidos para `validateTechnologySnapshot`,
 * mientras providers que declaran taxonomía v2 usan además este gate estricto.
 */
export function validateTechnologySnapshotTaxonomy(
  snapshot: TechnologySnapshot,
): readonly TaxonomyValidationIssue[] {
  const issues: TaxonomyValidationIssue[] = [];
  snapshot.assets.forEach((asset, assetIndex) => {
    const path = `snapshot.assets[${assetIndex}]`;
    if (!asset.taxonomy) {
      issues.push({ code: "taxonomy.assessment_required", path: `${path}.taxonomy`, message: "v2 provider asset requires taxonomy assessment" });
    } else {
      issues.push(...validateAssetTaxonomyProjection(asset, path));
    }
    (asset.operationalContexts ?? []).forEach((context, contextIndex) => {
      issues.push(...validateOperationalContextReference(context, `${path}.operationalContexts[${contextIndex}]`));
    });
  });
  return issues;
}
