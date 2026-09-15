import { createHash } from "node:crypto";
import {
  technologySchemaVersion,
  validateTechnologySnapshot,
  type AssetIdentifier,
  type EvidenceReference,
  type ProvenanceRecord,
  type SourceReference,
  type TechnologyAsset,
  type TechnologyAttributeValue,
  type TechnologySnapshot,
} from "@igx-nexus/types";
import type { TechnologyProvider, TechnologyProviderDescriptor } from "./provider.js";

export const glpiApiVersions = ["v2.3"] as const;
export type GlpiApiVersion = (typeof glpiApiVersions)[number];

export type GlpiQueryValue = string | number | boolean;
export type GlpiQuery = Readonly<Record<string, GlpiQueryValue>>;

export interface GlpiApiTransport {
  get(path: string, query?: GlpiQuery): Promise<unknown>;
}

export type GlpiAccessTokenProvider = () => Promise<string>;

export interface GlpiFetchTransportOptions {
  readonly baseUrl: string;
  readonly accessTokenProvider: GlpiAccessTokenProvider;
  readonly apiVersion?: GlpiApiVersion;
  readonly requestTimeoutMs?: number;
  readonly allowInsecureHttp?: boolean;
  readonly fetchImpl?: typeof fetch;
}

export interface GlpiTechnologyProviderOptions {
  readonly transport: GlpiApiTransport;
  readonly pageSize?: number;
  readonly maxRecords?: number;
  readonly now?: () => Date;
}

export class GlpiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GlpiConfigurationError";
  }
}

export class GlpiAuthenticationError extends Error {
  constructor() {
    super("GLPI access token is unavailable");
    this.name = "GlpiAuthenticationError";
  }
}

export class GlpiRequestError extends Error {
  readonly statusCode?: number;

  constructor(message = "GLPI request failed", statusCode?: number) {
    super(message);
    this.name = "GlpiRequestError";
    if (statusCode !== undefined) this.statusCode = statusCode;
  }
}

export class GlpiPayloadError extends Error {
  constructor(message = "GLPI returned an incompatible payload") {
    super(message);
    this.name = "GlpiPayloadError";
  }
}

export class GlpiPaginationError extends Error {
  constructor(message = "GLPI pagination exceeded the configured safety bound") {
    super(message);
    this.name = "GlpiPaginationError";
  }
}

interface GlpiNamedReference {
  readonly id?: number;
  readonly name?: string;
  readonly completename?: string;
}

export interface GlpiComputerRecord {
  readonly id: number;
  readonly name?: string;
  readonly serial?: string;
  readonly otherserial?: string;
  readonly uuid?: string;
  readonly is_deleted?: boolean;
  readonly is_dynamic?: boolean;
  readonly date_creation?: string;
  readonly date_mod?: string;
  readonly last_inventory_update?: string;
  readonly last_boot?: string;
  readonly status?: GlpiNamedReference;
  readonly entity?: GlpiNamedReference;
  readonly manufacturer?: GlpiNamedReference;
  readonly location?: GlpiNamedReference;
  readonly type?: GlpiNamedReference;
  readonly model?: GlpiNamedReference;
}

const DEFAULT_GLPI_API_VERSION: GlpiApiVersion = "v2.3";
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_RECORDS = 10_000;
const COMPUTER_COLLECTION_PATH = "Assets/Computer";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function parseNamedReference(value: unknown): GlpiNamedReference | undefined {
  if (!isRecord(value)) return undefined;
  const id = optionalInteger(value.id);
  const name = optionalString(value.name);
  const completename = optionalString(value.completename);
  if (id === undefined && name === undefined && completename === undefined) return undefined;
  return Object.freeze({
    ...(id === undefined ? {} : { id }),
    ...(name === undefined ? {} : { name }),
    ...(completename === undefined ? {} : { completename }),
  });
}

export function parseGlpiComputerRecord(value: unknown): GlpiComputerRecord {
  if (!isRecord(value)) throw new GlpiPayloadError();
  const id = optionalInteger(value.id);
  if (id === undefined || id < 0) throw new GlpiPayloadError("GLPI Computer record requires a non-negative integer id");

  const name = optionalString(value.name);
  const serial = optionalString(value.serial);
  const otherserial = optionalString(value.otherserial);
  const uuid = optionalString(value.uuid);
  const isDeleted = optionalBoolean(value.is_deleted);
  const isDynamic = optionalBoolean(value.is_dynamic);
  const dateCreation = optionalString(value.date_creation);
  const dateModified = optionalString(value.date_mod);
  const lastInventoryUpdate = optionalString(value.last_inventory_update);
  const lastBoot = optionalString(value.last_boot);
  const status = parseNamedReference(value.status);
  const entity = parseNamedReference(value.entity);
  const manufacturer = parseNamedReference(value.manufacturer);
  const location = parseNamedReference(value.location);
  const type = parseNamedReference(value.type);
  const model = parseNamedReference(value.model);

  return Object.freeze({
    id,
    ...(name === undefined ? {} : { name }),
    ...(serial === undefined ? {} : { serial }),
    ...(otherserial === undefined ? {} : { otherserial }),
    ...(uuid === undefined ? {} : { uuid }),
    ...(isDeleted === undefined ? {} : { is_deleted: isDeleted }),
    ...(isDynamic === undefined ? {} : { is_dynamic: isDynamic }),
    ...(dateCreation === undefined ? {} : { date_creation: dateCreation }),
    ...(dateModified === undefined ? {} : { date_mod: dateModified }),
    ...(lastInventoryUpdate === undefined ? {} : { last_inventory_update: lastInventoryUpdate }),
    ...(lastBoot === undefined ? {} : { last_boot: lastBoot }),
    ...(status === undefined ? {} : { status }),
    ...(entity === undefined ? {} : { entity }),
    ...(manufacturer === undefined ? {} : { manufacturer }),
    ...(location === undefined ? {} : { location }),
    ...(type === undefined ? {} : { type }),
    ...(model === undefined ? {} : { model }),
  });
}

function parseComputerCollection(payload: unknown): readonly GlpiComputerRecord[] {
  if (!Array.isArray(payload)) {
    throw new GlpiPayloadError("GLPI Computer collection must be a JSON array");
  }
  return Object.freeze(payload.map((record) => parseGlpiComputerRecord(record)));
}

function validateBoundedInteger(value: number, name: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new GlpiConfigurationError(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function normalizeGlpiBaseUrl(rawBaseUrl: string, allowInsecureHttp: boolean): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl);
  } catch {
    throw new GlpiConfigurationError("GLPI baseUrl must be an absolute URL");
  }

  if (parsed.protocol !== "https:" && !(allowInsecureHttp && parsed.protocol === "http:")) {
    throw new GlpiConfigurationError("GLPI baseUrl must use https unless insecure HTTP is explicitly enabled for a lab");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new GlpiConfigurationError("GLPI baseUrl must not include credentials, query parameters or fragments");
  }
  if (parsed.pathname.toLowerCase().endsWith("/api.php") || parsed.pathname.toLowerCase().endsWith("/api.php/")) {
    throw new GlpiConfigurationError("GLPI baseUrl must point to the GLPI root, not api.php");
  }
  if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
  return parsed;
}

function validateApiPath(path: string): string {
  const normalized = path.trim();
  if (!normalized || normalized.startsWith("/") || normalized.includes("..") || !/^[A-Za-z0-9/_-]+$/.test(normalized)) {
    throw new GlpiConfigurationError("GLPI API path is invalid");
  }
  return normalized;
}

function normalizeAccessToken(token: string): string {
  const normalized = token.trim();
  if (!normalized || /[\r\n]/.test(normalized)) throw new GlpiAuthenticationError();
  return normalized;
}

async function getAccessToken(provider: GlpiAccessTokenProvider): Promise<string> {
  try {
    return normalizeAccessToken(await provider());
  } catch (error) {
    if (error instanceof GlpiAuthenticationError) throw error;
    throw new GlpiAuthenticationError();
  }
}

export function createGlpiFetchTransport(options: GlpiFetchTransportOptions): GlpiApiTransport {
  const apiVersion = options.apiVersion ?? DEFAULT_GLPI_API_VERSION;
  if (!glpiApiVersions.includes(apiVersion)) {
    throw new GlpiConfigurationError(`Unsupported GLPI API version: ${String(apiVersion)}`);
  }
  const timeoutMs = validateBoundedInteger(
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    "GLPI requestTimeoutMs",
    100,
    60_000,
  );
  const baseUrl = normalizeGlpiBaseUrl(options.baseUrl, options.allowInsecureHttp ?? false);
  const apiBaseUrl = new URL(`api.php/${apiVersion}/`, baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  return Object.freeze({
    async get(path: string, query: GlpiQuery = {}) {
      const endpoint = new URL(validateApiPath(path), apiBaseUrl);
      for (const [key, value] of Object.entries(query)) endpoint.searchParams.set(key, String(value));
      const token = await getAccessToken(options.accessTokenProvider);

      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "GET",
          headers: Object.freeze({
            accept: "application/json",
            authorization: `Bearer ${token}`,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new GlpiRequestError();
      }

      if (!response.ok) {
        throw new GlpiRequestError(`GLPI request failed with HTTP ${response.status}`, response.status);
      }

      try {
        return await response.json();
      } catch {
        throw new GlpiPayloadError("GLPI response was not valid JSON");
      }
    },
  });
}

function canonicalAssetId(sourceScope: string, externalId: string): string {
  const digest = createHash("sha256").update(`glpi\u0000${sourceScope}\u0000${externalId}`).digest("hex").slice(0, 32);
  return `NXS-${digest.toUpperCase()}`;
}

function addAttribute(
  attributes: Record<string, TechnologyAttributeValue>,
  key: string,
  value: TechnologyAttributeValue | undefined,
): void {
  if (value !== undefined) attributes[key] = value;
}

function addNamedReferenceAttributes(
  attributes: Record<string, TechnologyAttributeValue>,
  prefix: string,
  value: GlpiNamedReference | undefined,
): void {
  if (!value) return;
  addAttribute(attributes, `${prefix}.id`, value.id);
  addAttribute(attributes, `${prefix}.name`, value.name);
  addAttribute(attributes, `${prefix}.completename`, value.completename);
}

function inferredMappingProvenance(
  fieldPath: "domain" | "assetClass" | "role",
  source: SourceReference,
  evidence: EvidenceReference,
  observedAt: string,
): ProvenanceRecord {
  return Object.freeze({
    fieldPath,
    source,
    observedAt,
    authority: "inferred",
    evidence: Object.freeze([evidence]),
  });
}

export function mapGlpiComputerToTechnologyAsset(
  record: GlpiComputerRecord,
  observedAt: string,
): TechnologyAsset {
  const source: SourceReference = Object.freeze({
    source: "glpi",
    externalId: String(record.id),
    entityType: "Computer",
    sourceScope: COMPUTER_COLLECTION_PATH,
    observedAt,
    authority: "authoritative",
  });
  const evidence: EvidenceReference = Object.freeze({
    kind: "api_response",
    reference: `glpi:${DEFAULT_GLPI_API_VERSION}:${COMPUTER_COLLECTION_PATH}/${record.id}`,
    label: "GLPI Computer record",
    observedAt,
  });

  const identifiers: AssetIdentifier[] = [];
  if (record.serial) identifiers.push(Object.freeze({ kind: "serial_number", value: record.serial, source }));
  if (record.otherserial) identifiers.push(Object.freeze({ kind: "asset_tag", value: record.otherserial, source }));
  if (record.uuid) identifiers.push(Object.freeze({ kind: "hardware_uuid", value: record.uuid, source }));

  const attributes: Record<string, TechnologyAttributeValue> = {};
  addAttribute(attributes, "glpi.itemType", "Computer");
  addAttribute(attributes, "glpi.isDeleted", record.is_deleted);
  addAttribute(attributes, "glpi.isDynamic", record.is_dynamic);
  addAttribute(attributes, "glpi.dateCreation", record.date_creation);
  addAttribute(attributes, "glpi.dateModified", record.date_mod);
  addAttribute(attributes, "glpi.lastInventoryUpdate", record.last_inventory_update);
  addAttribute(attributes, "glpi.lastBoot", record.last_boot);
  addNamedReferenceAttributes(attributes, "glpi.status", record.status);
  addNamedReferenceAttributes(attributes, "glpi.entity", record.entity);
  addNamedReferenceAttributes(attributes, "glpi.manufacturer", record.manufacturer);
  addNamedReferenceAttributes(attributes, "glpi.location", record.location);
  addNamedReferenceAttributes(attributes, "glpi.type", record.type);
  addNamedReferenceAttributes(attributes, "glpi.model", record.model);

  const displayName = record.name ?? `GLPI Computer ${record.id}`;
  const provenance: ProvenanceRecord[] = [
    Object.freeze({
      fieldPath: "displayName",
      source,
      observedAt,
      authority: record.name ? "authoritative" : "inferred",
      evidence: Object.freeze([evidence]),
    }),
    inferredMappingProvenance("domain", source, evidence, observedAt),
    inferredMappingProvenance("assetClass", source, evidence, observedAt),
    inferredMappingProvenance("role", source, evidence, observedAt),
    Object.freeze({
      fieldPath: "attributes",
      source,
      observedAt,
      authority: "authoritative",
      evidence: Object.freeze([evidence]),
    }),
  ];

  return Object.freeze({
    id: canonicalAssetId(COMPUTER_COLLECTION_PATH, String(record.id)),
    displayName,
    domain: "IT",
    assetClass: "compute",
    role: "custom:glpi-computer",
    lifecycle: "unknown",
    criticality: "unknown",
    identifiers: Object.freeze(identifiers),
    sourceReferences: Object.freeze([source]),
    attributes: Object.freeze(attributes),
    provenance: Object.freeze(provenance),
  });
}

async function readAllComputers(
  transport: GlpiApiTransport,
  pageSize: number,
  maxRecords: number,
): Promise<readonly GlpiComputerRecord[]> {
  const records: GlpiComputerRecord[] = [];
  const seenIds = new Set<number>();
  let start = 0;

  while (records.length < maxRecords) {
    const requestLimit = Math.min(pageSize, maxRecords - records.length);
    const page = parseComputerCollection(
      await transport.get(COMPUTER_COLLECTION_PATH, { start, limit: requestLimit }),
    );
    if (page.length === 0) break;

    for (const record of page) {
      if (seenIds.has(record.id)) {
        throw new GlpiPaginationError("GLPI pagination returned a duplicate Computer id");
      }
      seenIds.add(record.id);
      records.push(record);
    }

    start += page.length;
  }

  if (records.length >= maxRecords) {
    const probe = parseComputerCollection(await transport.get(COMPUTER_COLLECTION_PATH, { start: records.length, limit: 1 }));
    if (probe.length > 0) throw new GlpiPaginationError();
  }

  return Object.freeze(records);
}

const glpiDescriptor: TechnologyProviderDescriptor = Object.freeze({
  id: "live.glpi.v2.3",
  mode: "live",
  displayName: "GLPI 11 High-Level API",
  availability: "ready",
  capabilities: Object.freeze(["technology.snapshot.read"] as const),
  sourceSystems: Object.freeze(["glpi"] as const),
});

export function createGlpiTechnologyProvider(options: GlpiTechnologyProviderOptions): TechnologyProvider {
  const pageSize = validateBoundedInteger(options.pageSize ?? DEFAULT_PAGE_SIZE, "GLPI pageSize", 1, 1_000);
  const maxRecords = validateBoundedInteger(options.maxRecords ?? DEFAULT_MAX_RECORDS, "GLPI maxRecords", 1, 100_000);
  const now = options.now ?? (() => new Date());

  return Object.freeze({
    descriptor: glpiDescriptor,
    async getSnapshot() {
      const asOf = now().toISOString();
      const records = await readAllComputers(options.transport, pageSize, maxRecords);
      const snapshot: TechnologySnapshot = Object.freeze({
        schemaVersion: technologySchemaVersion,
        asOf,
        assets: Object.freeze(records.map((record) => mapGlpiComputerToTechnologyAsset(record, asOf))),
        relationships: Object.freeze([]),
        observations: Object.freeze([]),
      });
      const errors = validateTechnologySnapshot(snapshot).filter((issue) => issue.severity === "error");
      if (errors.length > 0) throw new GlpiPayloadError("GLPI adapter produced an invalid TechnologySnapshot");
      return snapshot;
    },
  });
}
