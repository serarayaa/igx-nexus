import {
  technologyTaxonomyVersion,
  validateTechnologyTaxonomyAssessment,
  type ClassifiedTaxonomyDecision,
  type TaxonomyClassificationMethod,
  type TaxonomyDecision,
  type TechnologyAssetClass,
  type TechnologyDomain,
  type TechnologyRole,
  type TechnologyTaxonomyAssessment,
} from "@igx-nexus/types";

export interface GlpiTaxonomyInput {
  readonly itemType: string;
  readonly sourceType?: string;
}

export interface GlpiLegacyTaxonomyProjection {
  readonly domain: TechnologyDomain;
  readonly assetClass: TechnologyAssetClass;
  readonly role: TechnologyRole;
  readonly compatibilityFallback: boolean;
  readonly ruleId: string;
}

export class TaxonomyMappingError extends Error {
  readonly issueCodes: readonly string[];

  constructor(issueCodes: readonly string[]) {
    super("Technology taxonomy mapping produced an invalid assessment");
    this.name = "TaxonomyMappingError";
    this.issueCodes = Object.freeze([...new Set(issueCodes)].sort());
  }
}

function classified<T extends string>(
  value: T,
  method: TaxonomyClassificationMethod,
  ruleId: string,
  reviewRequired = false,
  reasonCode?: string,
): ClassifiedTaxonomyDecision<T> {
  return Object.freeze({
    state: "classified",
    value,
    method,
    reviewRequired,
    ruleId,
    ...(reasonCode === undefined ? {} : { reasonCode }),
  });
}

function unknown<T extends string>(ruleId: string, reasonCode: string): TaxonomyDecision<T> {
  return Object.freeze({ state: "unknown", reviewRequired: true, ruleId, reasonCode });
}

function unclassified<T extends string>(ruleId: string, reasonCode: string): TaxonomyDecision<T> {
  return Object.freeze({ state: "unclassified", reviewRequired: true, ruleId, reasonCode });
}

function normalizeSourceType(sourceType: string | undefined): string | undefined {
  if (sourceType === undefined) return undefined;
  const normalized = sourceType.trim().toLocaleLowerCase("en-US").replace(/[\s_-]+/g, " ");
  return normalized || undefined;
}

function assessment(
  domain: TaxonomyDecision<TechnologyDomain>,
  assetClass: TaxonomyDecision<TechnologyAssetClass>,
  role: TaxonomyDecision<TechnologyRole>,
): TechnologyTaxonomyAssessment {
  const value: TechnologyTaxonomyAssessment = Object.freeze({
    taxonomyVersion: technologyTaxonomyVersion,
    domain,
    assetClass,
    role,
  });
  const issues = validateTechnologyTaxonomyAssessment(value);
  if (issues.length > 0) throw new TaxonomyMappingError(issues.map((issue) => issue.code));
  return value;
}

const IT_ENDPOINT_TYPES = new Set(["laptop", "notebook", "desktop", "workstation"]);
const IT_SERVER_TYPES = new Set(["server", "physical server"]);
const OT_ENGINEERING_TYPES = new Set(["engineering workstation", "industrial workstation"]);
const OT_HMI_TYPES = new Set(["hmi", "human machine interface", "operator station"]);
const OT_HISTORIAN_TYPES = new Set(["historian", "historian server"]);

/**
 * Clasifica evidencia GLPI sin equiparar ItemType con assetClass.
 *
 * GLPI no define un vocabulario universal para ComputerType: los valores son
 * administrables por cada instancia. Por eso sólo normalizamos aliases explícitos
 * conocidos y nunca usamos nombre/modelo/fabricante como heurística escondida.
 * Un Type ausente queda `unknown`; un Type presente sin regla queda
 * `unclassified`. Ambos requieren revisión humana.
 */
export function classifyGlpiTaxonomy(input: GlpiTaxonomyInput): TechnologyTaxonomyAssessment {
  const itemType = input.itemType.trim();
  const sourceType = normalizeSourceType(input.sourceType);

  if (itemType !== "Computer") {
    return assessment(
      unclassified("glpi.item-type.unsupported", "glpi_item_type_not_mapped"),
      unclassified("glpi.item-type.unsupported", "glpi_item_type_not_mapped"),
      unclassified("glpi.item-type.unsupported", "glpi_item_type_not_mapped"),
    );
  }

  if (sourceType && IT_ENDPOINT_TYPES.has(sourceType)) {
    return assessment(
      classified("IT", "inferred", "glpi.computer.type.it-endpoint", true, "domain_inferred_from_configurable_glpi_type"),
      classified("endpoint", "normalized", "glpi.computer.type.it-endpoint"),
      classified("user_endpoint", "inferred", "glpi.computer.type.it-endpoint", true, "functional_role_requires_review"),
    );
  }

  if (sourceType && IT_SERVER_TYPES.has(sourceType)) {
    return assessment(
      classified("IT", "inferred", "glpi.computer.type.it-server", true, "domain_inferred_from_configurable_glpi_type"),
      classified("server", "normalized", "glpi.computer.type.it-server"),
      classified("infrastructure_service", "inferred", "glpi.computer.type.it-server", true, "server_function_not_observed"),
    );
  }

  if (sourceType && OT_ENGINEERING_TYPES.has(sourceType)) {
    return assessment(
      classified("OT", "normalized", "glpi.computer.type.ot-engineering"),
      classified("industrial_compute", "normalized", "glpi.computer.type.ot-engineering"),
      classified("engineering_workstation", "normalized", "glpi.computer.type.ot-engineering"),
    );
  }

  if (sourceType && OT_HMI_TYPES.has(sourceType)) {
    return assessment(
      classified("OT", "normalized", "glpi.computer.type.ot-hmi"),
      classified("operator_interface", "normalized", "glpi.computer.type.ot-hmi"),
      classified("supervision", "inferred", "glpi.computer.type.ot-hmi", true, "hmi_function_requires_review"),
    );
  }

  if (sourceType && OT_HISTORIAN_TYPES.has(sourceType)) {
    return assessment(
      classified("OT", "normalized", "glpi.computer.type.ot-historian"),
      classified("industrial_compute", "normalized", "glpi.computer.type.ot-historian"),
      classified("historian", "normalized", "glpi.computer.type.ot-historian"),
    );
  }

  if (sourceType === undefined) {
    return assessment(
      unknown("glpi.computer.type.missing", "computer_domain_not_observed"),
      unknown("glpi.computer.type.missing", "computer_class_not_observed"),
      unknown("glpi.computer.type.missing", "computer_role_not_observed"),
    );
  }

  return assessment(
    unclassified("glpi.computer.type.unmapped", "glpi_computer_type_not_mapped"),
    unclassified("glpi.computer.type.unmapped", "glpi_computer_type_not_mapped"),
    unclassified("glpi.computer.type.unmapped", "glpi_computer_type_not_mapped"),
  );
}

/**
 * Puente temporal para los consumidores V02-008/V02-011 que aún requieren los
 * scalars `domain/assetClass/role`. La verdad taxonómica vive en `assessment`:
 * si alguna dimensión no está resuelta, el scalar conserva el comportamiento Live
 * histórico pero queda marcado explícitamente como fallback de compatibilidad.
 */
export function projectGlpiTaxonomyForLegacyScalars(
  value: TechnologyTaxonomyAssessment,
): GlpiLegacyTaxonomyProjection {
  if (
    value.domain.state === "classified"
    && value.assetClass.state === "classified"
    && value.role.state === "classified"
  ) {
    return Object.freeze({
      domain: value.domain.value,
      assetClass: value.assetClass.value,
      role: value.role.value,
      compatibilityFallback: false,
      ruleId: "glpi.taxonomy.resolved-projection",
    });
  }

  return Object.freeze({
    domain: "IT",
    assetClass: "endpoint",
    role: "user_endpoint",
    compatibilityFallback: true,
    ruleId: "glpi.computer.compatibility-projection",
  });
}

export function resolvedTaxonomyDecision<T extends string>(
  decision: TaxonomyDecision<T>,
  field: "domain" | "assetClass" | "role",
): ClassifiedTaxonomyDecision<T> {
  if (decision.state !== "classified") {
    throw new TaxonomyMappingError([`taxonomy.${field}_unresolved`]);
  }
  return decision;
}

export function resolvedTaxonomyValue<T extends string>(
  decision: TaxonomyDecision<T>,
  field: "domain" | "assetClass" | "role",
): T {
  return resolvedTaxonomyDecision(decision, field).value;
}
