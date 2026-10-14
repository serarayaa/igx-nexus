import {
  isIsoTimestamp, sourceReferenceKey, validateNetworkInventoryV2, validateSourceReference,
  type HardwareCoverageGap, type HardwareCoverageReason, type NetworkCardAttachmentV2,
  type NetworkCardDefinitionV2, type NetworkInventoryV2, type NetworkSectionV2,
  type SourceReference, type TechnologyAsset,
} from "@igx-nexus/types";
import {
  GlpiAuthenticationError, GlpiConfigurationError, GlpiPayloadError, GlpiRequestError,
  type GlpiApiTransport, type GlpiQuery,
} from "./glpi.js";

export const glpiNetworkSections = ["networkCards"] as const;
export type GlpiNetworkSection = typeof glpiNetworkSections[number];
export class GlpiNetworkAnchorError extends GlpiConfigurationError {
  constructor() { super("Network requires one unambiguous GLPI Computer source reference in the configured instance"); this.name = "GlpiNetworkAnchorError"; }
}
export interface GlpiNetworkAdapterOptions {
  readonly transport: GlpiApiTransport;
  readonly sourceInstanceId: string;
  readonly pageSize?: number;
  /** Includes the terminal empty probe; short pages do not prove exhaustion. */
  readonly maxPages?: number;
  readonly maxRecords?: number;
  readonly maxCatalogueRequests?: number;
  readonly requestTimeoutMs?: number;
  readonly enrichCatalogue?: boolean;
  readonly now?: () => Date;
}
export interface GlpiNetworkAdapter {
  getInventory(asset: TechnologyAsset, sections?: readonly GlpiNetworkSection[]): Promise<NetworkInventoryV2>;
}
type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => v !== null && typeof v === "object" && !Array.isArray(v);
function id(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1) throw new GlpiPayloadError();
  return v;
}
function text(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new GlpiPayloadError();
  return v.trim() ? v : null;
}
function ref(v: unknown): Row | null {
  if (v === undefined || v === null) return null;
  if (!object(v)) throw new GlpiPayloadError();
  if (v.id !== undefined && v.id !== null && v.id !== 0) id(v.id);
  return v;
}
const refId = (v: Row | null): number | null => v?.id === undefined || v.id === null || v.id === 0 ? null : id(v.id);
function refName(v: unknown): string | null { return text(ref(v)?.name); }
function reason(error: unknown): HardwareCoverageReason {
  if (error instanceof GlpiAuthenticationError || (error instanceof GlpiRequestError && [401, 403].includes(error.statusCode ?? 0))) return "unauthorized";
  if (error instanceof GlpiRequestError && [405, 501].includes(error.statusCode ?? 0)) return "unsupported";
  return "source_error";
}
function bound(v: number, max: number, min = 1): number {
  if (!Number.isSafeInteger(v) || v < min || v > max) throw new GlpiConfigurationError("Invalid GLPI network safety bound");
  return v;
}

/** Internal read-only reader. Not registered in runtime, routes or snapshot 0.2. */
export function createGlpiNetworkAdapter(options: GlpiNetworkAdapterOptions): GlpiNetworkAdapter {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.sourceInstanceId)) throw new GlpiConfigurationError("Invalid GLPI network source instance");
  if (options.enrichCatalogue !== undefined && typeof options.enrichCatalogue !== "boolean") throw new GlpiConfigurationError("Invalid GLPI network enrichment option");
  const pageSize = bound(options.pageSize ?? 100, 1000);
  const maxPages = bound(options.maxPages ?? 100, 10000);
  const maxRecords = bound(options.maxRecords ?? 10000, 100000);
  const maxCatalogueRequests = bound(options.maxCatalogueRequests ?? 500, 2000, 0);
  const timeout = bound(options.requestTimeoutMs ?? 10000, 60000);
  const stamp = () => {
    try { const at = (options.now ?? (() => new Date()))().toISOString(); if (isIsoTimestamp(at)) return at; }
    catch { /* Clock failures are operational configuration errors, not missing data. */ }
    throw new GlpiConfigurationError("Invalid GLPI network collection clock");
  };
  const source = (scope: string, externalId: string, entityType: string): SourceReference => ({
    source: "glpi", sourceInstanceId: options.sourceInstanceId, sourceScope: scope, externalId,
    entityType, observedAt: stamp(), authority: "authoritative",
  });
  const evidence = (s: SourceReference) => ({ collectedAt: stamp(), observedAt: null, sourceReferences: [s], provenance: [] });
  const checked = (assetId: string, networkCards: NetworkSectionV2<NetworkCardAttachmentV2>): NetworkInventoryV2 => {
    const inventory: NetworkInventoryV2 = { contractVersion: "2", assetId, networkCards };
    if (validateNetworkInventoryV2(inventory).some(i => i.severity === "error")) throw new GlpiPayloadError("GLPI network adapter produced invalid inventory");
    return inventory;
  };
  return {
    async getInventory(asset, sections = glpiNetworkSections) {
      if (typeof asset.id !== "string" || !asset.id.trim() || asset.id !== asset.id.trim() || sections.some(s => !glpiNetworkSections.includes(s))) throw new GlpiConfigurationError("Invalid network inventory request");
      // Multiple Computer anchors, including across instances, are ambiguous; never choose one silently.
      const anchors = asset.sourceReferences.filter(s => s.source === "glpi" && s.entityType === "Computer");
      let computerId: number;
      try {
        if (anchors.length !== 1 || anchors[0]!.sourceScope !== "Assets/Computer" || anchors[0]!.sourceInstanceId !== options.sourceInstanceId || validateSourceReference(anchors[0]!).length || !/^[1-9]\d*$/.test(anchors[0]!.externalId)) throw new GlpiNetworkAnchorError();
        computerId = id(Number(anchors[0]!.externalId));
      } catch { throw new GlpiNetworkAnchorError(); }
      if (!sections.includes("networkCards")) return checked(asset.id, { state: "not_requested" });
      stamp();
      const path = `Assets/Computer/${computerId}/Component/NetworkCard`;
      const items: NetworkCardAttachmentV2[] = [];
      const sources: SourceReference[] = [];
      const gaps: HardwareCoverageGap[] = [];
      const seen = new Set<number>();
      const definitionIds = new Map<string, number>();
      let consumed = 0, lastId = 0, catalogueRequests = 0;
      let exhausted = false, contiguous = true, timedOut = false;
      // Sequential requests per inventory. Timeout aborts the transport and prevents further I/O
      // in this inventory even if a custom transport ignores cancellation and settles late.
      async function get(route: string, query: GlpiQuery = {}): Promise<unknown> {
        if (timedOut) throw new GlpiRequestError();
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            options.transport.get(route, query, { signal: controller.signal }),
            new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new GlpiRequestError()); }, timeout); }),
          ]);
        } finally { clearTimeout(timer); }
      }
      const details = new Map<number, NetworkCardDefinitionV2 | HardwareCoverageReason>();
      try {
        for (let page = 0; page < maxPages; page++) {
          // At exactly maxRecords, allow only a terminal probe. Never retain another record.
          const limit = Math.min(pageSize, Math.max(1, maxRecords - consumed));
          let payload: unknown;
          try {
            payload = await get(path, { start: consumed, limit, sort: "id:asc" });
            if (!Array.isArray(payload) || payload.length > limit) throw new GlpiPayloadError();
          } catch (error) {
            if (error instanceof GlpiConfigurationError || reason(error) === "unauthorized") throw error;
            gaps.push({ fieldPath: "networkCards", reason: reason(error) }); break;
          }
          const pageSource = source(path, `Computer/${computerId}?start=${consumed}&limit=${limit}&sort=id:asc`, "NetworkCardCollection");
          sources.push(pageSource);
          if (payload.length === 0) { exhausted = true; break; }
          if (consumed === maxRecords) { gaps.push({ fieldPath: "networkCards", reason: "pagination_incomplete" }); break; }
          let rows: Row[];
          try {
            rows = payload.map(v => { if (!object(v)) throw new GlpiPayloadError(); id(v.id); return v; });
            const ids = rows.map(v => id(v.id));
            if (ids.some((n, i) => seen.has(n) || n <= (i ? ids[i - 1]! : lastId))) throw new GlpiPayloadError();
          } catch {
            contiguous = false;
            gaps.push({ fieldPath: "networkCards", reason: "pagination_incomplete" }); break;
          }
          for (const row of rows) {
            const n = id(row.id); seen.add(n); lastId = n; consumed++;
            try {
              if ((row.itemtype !== undefined && row.itemtype !== "Computer") || (row.items_id !== undefined && id(row.items_id) !== computerId)) throw new GlpiPayloadError();
              for (const key of ["is_deleted", "is_dynamic"]) if (row[key] !== undefined && typeof row[key] !== "boolean") throw new GlpiPayloadError();
              if (row.is_deleted === true) { contiguous = false; gaps.push({ fieldPath: `networkCards.sourceRecords.${n}`, reason: "not_observed" }); continue; }
              const embedded = ref(row.network_card);
              const definitionId = refId(embedded);
              const itemSource = source(path, String(n), "NetworkCardItem");
              const mapped: NetworkCardAttachmentV2 = {
                ...evidence(itemSource), attachmentId: sourceReferenceKey(itemSource),
                definitionId: definitionId === null ? null : sourceReferenceKey(source(`Components/NetworkCard/${definitionId}`, String(definitionId), "NetworkCard")),
                designation: text(embedded?.designation), macAddress: text(row.mac), busId: text(row.busID), definition: null,
              };
              checked(asset.id, { state: "complete", collectedAt: stamp(), observedAt: null, sourceReferences: [pageSource], items: [mapped], pagination: null });
              items.push(mapped);
              if (definitionId !== null) definitionIds.set(mapped.attachmentId!, definitionId);
            } catch (error) {
              if (error instanceof GlpiConfigurationError) throw error;
              contiguous = false; gaps.push({ fieldPath: `networkCards.sourceRecords.${n}`, reason: "source_error" });
            }
          }
          // Server-capped short pages must also be followed by an explicit empty response.
        }
        if (!exhausted && gaps.length === 0) gaps.push({ fieldPath: "networkCards", reason: "pagination_incomplete" });
        if (sources.length === 0) return checked(asset.id, { state: "unavailable", reason: gaps[0]?.reason ?? "source_error" });
        if (options.enrichCatalogue) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i]!;
            if (item.definitionId === null) continue;
            // Retain the validated raw reference separately; never parse/reconstruct canonical IDs.
            const definitionId = definitionIds.get(item.attachmentId!)!;
            let detail = details.get(definitionId);
            if (detail === undefined) {
              if (catalogueRequests >= maxCatalogueRequests) detail = "pagination_incomplete";
              else if (timedOut) detail = "source_error";
              else {
                catalogueRequests++;
                try {
                  const route = `Components/NetworkCard/${definitionId}`;
                  const row = await get(route);
                  if (!object(row) || id(row.id) !== definitionId) throw new GlpiPayloadError();
                  detail = {
                    ...evidence(source(route, String(definitionId), "NetworkCard")), definitionId: item.definitionId,
                    designation: text(row.designation), manufacturer: refName(row.manufacturer), model: refName(row.model),
                    defaultMacAddress: text(row.mac_default), bandwidthLabel: text(row.bandwidth),
                  };
                  checked(asset.id, { state: "complete", collectedAt: stamp(), observedAt: null, sourceReferences: [sources[0]!], items: [{ ...item, definition: detail }], pagination: null });
                } catch (error) {
                  if (error instanceof GlpiConfigurationError || reason(error) === "unauthorized") throw error;
                  detail = reason(error);
                }
              }
              details.set(definitionId, detail);
            }
            if (typeof detail === "string") gaps.push({ fieldPath: `networkCards.items[${i}].definition`, reason: detail });
            else items[i] = { ...item, definition: detail };
          }
        }
        const metadata = { collectedAt: stamp(), observedAt: null, sourceReferences: sources,
          pagination: contiguous ? { offset: 0, retrieved: items.length, total: exhausted ? consumed : null, nextOffset: null } : null };
        return checked(asset.id, gaps.length ? { state: "partial", items, gaps, ...metadata } : { state: "complete", items, ...metadata });
      } catch (error) {
        if (error instanceof GlpiConfigurationError) throw error;
        return checked(asset.id, { state: "unavailable", reason: reason(error) });
      }
    },
  };
}
