import {
  isIsoTimestamp, sourceReferenceKey, validateSoftwareInventoryV2, validateSourceReference,
  type SourceReference, type TechnologyAsset, type HardwareCoverageGap, type HardwareCoverageReason,
  type SoftwareInventoryV2, type SoftwareSectionV2, type SoftwareInstallationV2,
  type SoftwareIdentityV2, type SoftwareVersionV2, type OperatingSystemInstallationV2,
} from "@igx-nexus/types";
import { GlpiAuthenticationError, GlpiConfigurationError, GlpiPayloadError, GlpiRequestError, type GlpiApiTransport, type GlpiQuery } from "./glpi.js";

export const glpiSoftwareSections = ["operatingSystems", "installations"] as const;
export type GlpiSoftwareSection = typeof glpiSoftwareSections[number];
export class GlpiSoftwareAnchorError extends GlpiConfigurationError {
  constructor() { super("Software requires one unambiguous GLPI Computer source reference"); this.name = "GlpiSoftwareAnchorError"; }
}
export interface GlpiSoftwareAdapterOptions {
  readonly transport: GlpiApiTransport;
  readonly sourceInstanceId: string;
  readonly pageSize?: number;
  readonly maxPages?: number;
  readonly maxRecords?: number;
  /** Shared budget for all product/version catalogue pages within one inventory. */
  readonly maxCatalogueRequests?: number;
  readonly requestTimeoutMs?: number;
  readonly now?: () => Date;
}
type Row = Record<string, unknown>;
type AcquiredRow = { row: Row; source: SourceReference };
type Collection = { rows: AcquiredRow[]; sources: SourceReference[]; gaps: HardwareCoverageGap[]; exhausted: boolean; contiguous: boolean; consumed: number };
const object = (v: unknown): v is Row => v !== null && typeof v === "object" && !Array.isArray(v);
function text(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new GlpiPayloadError();
  return v.trim() ? v : null;
}
function id(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 1) throw new GlpiPayloadError();
  return v;
}
function ref(v: unknown): Row | null {
  if (v === undefined || v === null) return null;
  if (!object(v)) throw new GlpiPayloadError();
  if (v.id !== undefined && v.id !== null && v.id !== 0) id(v.id);
  if (v.name !== undefined) text(v.name);
  return v;
}
const refId = (v: Row | null): number | null => v?.id === undefined || v.id === null || v.id === 0 ? null : id(v.id);
const refName = (v: unknown): string | null => text(ref(v)?.name);
function reason(error: unknown): HardwareCoverageReason {
  if (error instanceof GlpiAuthenticationError || (error instanceof GlpiRequestError && [401, 403].includes(error.statusCode ?? 0))) return "unauthorized";
  if (error instanceof GlpiRequestError && [405, 501].includes(error.statusCode ?? 0)) return "unsupported";
  return "source_error";
}
function bound(v: number, max: number): number {
  if (!Number.isSafeInteger(v) || v < 1 || v > max) throw new GlpiConfigurationError("Invalid GLPI software safety bound");
  return v;
}

/** Internal read-only adapter. No runtime/provider composition or public route is added. */
export function createGlpiSoftwareAdapter(options: GlpiSoftwareAdapterOptions): {
  getInventory(asset: TechnologyAsset, sections?: readonly GlpiSoftwareSection[]): Promise<SoftwareInventoryV2>;
} {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.sourceInstanceId)) throw new GlpiConfigurationError("Invalid GLPI software source instance");
  const pageSize = bound(options.pageSize ?? 100, 1000);
  const maxPages = bound(options.maxPages ?? 100, 10000);
  const maxRecords = bound(options.maxRecords ?? 10000, 100000);
  const maxCatalogueRequests = bound(options.maxCatalogueRequests ?? 500, 2000);
  const timeout = bound(options.requestTimeoutMs ?? 10000, 60000);
  const stamp = () => {
    try {
      const at = (options.now ?? (() => new Date()))().toISOString();
      if (isIsoTimestamp(at)) return at;
    } catch { /* Operational clock failure, never an identity failure. */ }
    throw new GlpiConfigurationError("Invalid GLPI software collection clock");
  };
  const source = (path: string, externalId: string, entityType: string): SourceReference => ({
    source: "glpi", sourceInstanceId: options.sourceInstanceId, sourceScope: path,
    externalId, entityType, observedAt: stamp(), authority: "authoritative",
  });
  const evidence = (s: SourceReference) => ({ collectedAt: stamp(), observedAt: null, sourceReferences: [s], provenance: [] });
  async function get(path: string, query: GlpiQuery): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        options.transport.get(path, query),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new GlpiRequestError()), timeout); }),
      ]);
    } finally { clearTimeout(timer); }
  }
  return {
    async getInventory(asset, sections = glpiSoftwareSections) {
      if (!asset.id.trim() || asset.id !== asset.id.trim() || sections.some(s => !glpiSoftwareSections.includes(s))) throw new GlpiConfigurationError("Invalid software inventory request");
      const anchors = asset.sourceReferences.filter(s => s.source === "glpi" && s.entityType === "Computer" && s.sourceScope === "Assets/Computer" && s.sourceInstanceId === options.sourceInstanceId);
      if (anchors.length !== 1 || validateSourceReference(anchors[0]!).length || !/^[1-9]\d*$/.test(anchors[0]!.externalId)) throw new GlpiSoftwareAnchorError();
      const computerId = Number(anchors[0]!.externalId);
      if (!Number.isSafeInteger(computerId)) throw new GlpiSoftwareAnchorError();
      stamp();
      let catalogueRequests = 0;
      async function collect(path: string, kind: string, catalogue = false): Promise<Collection> {
        const result: Collection = { rows: [], sources: [], gaps: [], exhausted: false, contiguous: true, consumed: 0 };
        const seen = new Set<number>();
        let last = 0;
        for (let page = 0; page < maxPages && result.consumed < maxRecords; page++) {
          const start = result.consumed;
          const limit = Math.min(pageSize, maxRecords - start);
          if (catalogue && catalogueRequests >= maxCatalogueRequests) break;
          let payload: unknown;
          try {
            if (catalogue) catalogueRequests++;
            payload = await get(path, { start, limit, sort: "id:asc" });
            if (!Array.isArray(payload) || payload.length > limit) throw new GlpiPayloadError();
          } catch (error) {
            if (error instanceof GlpiConfigurationError || reason(error) === "unauthorized") throw error;
            result.gaps.push({ fieldPath: path, reason: reason(error) });
            return result;
          }
          result.sources.push(source(path, `${kind}?start=${start}&limit=${limit}&sort=id:asc`, `${kind}Collection`));
          if (payload.length === 0) { result.exhausted = true; return result; }
          let rows: Row[];
          try {
            rows = payload.map(v => { if (!object(v)) throw new GlpiPayloadError(); id(v.id); return v; });
            const ids = rows.map(v => id(v.id));
            if (ids.some((n, i) => seen.has(n) || n <= (i ? ids[i - 1]! : last))) throw new GlpiPayloadError();
          } catch {
            result.contiguous = false;
            result.gaps.push({ fieldPath: path, reason: "pagination_incomplete" });
            return result;
          }
          for (const row of rows) {
            const n = id(row.id); seen.add(n); last = n;
            result.rows.push({ row, source: source(path, String(n), kind) });
          }
          result.consumed += payload.length;
          // Even a short page must be followed by a verified empty page.
        }
        result.gaps.push({ fieldPath: path, reason: "pagination_incomplete" });
        return result;
      }
      type Catalogue = { versions: Map<number, { product: SoftwareIdentityV2; version: SoftwareVersionV2 }>; gaps: HardwareCoverageGap[] };
      let catalogue: Promise<Catalogue> | undefined;
      async function loadCatalogue(): Promise<Catalogue> {
        const products = await collect("Assets/Software", "Software", true);
        const result: Catalogue = { versions: new Map(), gaps: [...products.gaps] };
        const ambiguous = new Set<number>();
        for (const acquired of products.rows) {
          const productId = id(acquired.row.id);
          let product: SoftwareIdentityV2;
          try {
            if (acquired.row.is_deleted !== undefined && typeof acquired.row.is_deleted !== "boolean") throw new GlpiPayloadError();
            if (acquired.row.is_deleted === true) continue;
            product = { ...evidence(acquired.source), softwareId: sourceReferenceKey(acquired.source), name: text(acquired.row.name), publisher: refName(acquired.row.manufacturer) };
          } catch (error) {
            if (error instanceof GlpiConfigurationError) throw error;
            result.gaps.push({ fieldPath: `Assets/Software/${productId}`, reason: "source_error" }); continue;
          }
          const versions = await collect(`Assets/Software/${productId}/Version`, "SoftwareVersion", true);
          result.gaps.push(...versions.gaps);
          for (const acquiredVersion of versions.rows) {
            const versionId = id(acquiredVersion.row.id);
            try {
              const linked = refId(ref(acquiredVersion.row.software));
              if (linked !== null && linked !== productId) throw new GlpiPayloadError();
              const version: SoftwareVersionV2 = { ...evidence(acquiredVersion.source), versionId: sourceReferenceKey({ ...acquiredVersion.source, sourceScope: "SoftwareVersion" }), value: text(acquiredVersion.row.name), architecture: text(acquiredVersion.row.arch) };
              if (result.versions.has(versionId) || ambiguous.has(versionId)) {
                result.versions.delete(versionId); ambiguous.add(versionId); throw new GlpiPayloadError();
              }
              result.versions.set(versionId, { product, version });
            } catch (error) {
              if (error instanceof GlpiConfigurationError) throw error;
              result.gaps.push({ fieldPath: `SoftwareVersion/${versionId}`, reason: "source_error" });
            }
          }
          // collect() reports a budget gap only when another page/collection is needed.
          // Exactly exhausting the budget after the final empty page is not a gap.
        }
        return result;
      }
      function installedAt(value: unknown, os: boolean): SoftwareInstallationV2["installedAt"] {
        const v = text(value);
        if (v === null) return null;
        if (os ? isIsoTimestamp(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) && isIsoTimestamp(`${v}T00:00:00Z`)) return { precision: os ? "timestamp" : "date", value: v };
        throw new GlpiPayloadError();
      }
      async function read(section: GlpiSoftwareSection): Promise<SoftwareSectionV2<OperatingSystemInstallationV2 | SoftwareInstallationV2>> {
        if (!sections.includes(section)) return { state: "not_requested" };
        const os = section === "operatingSystems";
        const kind = os ? "OSInstallation" : "SoftwareInstallation";
        const path = `Assets/Computer/${computerId}/${kind}`;
        try {
          const collected = await collect(path, kind);
          if (collected.sources.length === 0) return { state: "unavailable", reason: collected.gaps[0]?.reason ?? "source_error" };
          const gaps = [...collected.gaps];
          let catalogueGapsAdded = false;
          const items: (OperatingSystemInstallationV2 | SoftwareInstallationV2)[] = [];
          for (const { row, source: itemSource } of collected.rows) {
            try {
              if ((row.itemtype !== undefined && row.itemtype !== "Computer") || (row.items_id !== undefined && row.items_id !== computerId)) throw new GlpiPayloadError();
              if (os && row.is_deleted !== undefined && typeof row.is_deleted !== "boolean") throw new GlpiPayloadError();
              if (!os && row.is_dynamic !== undefined && typeof row.is_dynamic !== "boolean") throw new GlpiPayloadError();
              if (os && row.is_deleted === true) { collected.contiguous = false; gaps.push({ fieldPath: `${section}.sourceRecords.${row.id}`, reason: "not_observed" }); continue; }
              const common = { ...evidence(itemSource), installationId: sourceReferenceKey(itemSource), installedAt: installedAt(row.date_install, os) };
              let mapped: OperatingSystemInstallationV2 | SoftwareInstallationV2;
              if (os) {
                const system = ref(row.operatingsystem);
                const systemId = refId(system);
                mapped = { ...common, operatingSystemId: systemId === null ? null : sourceReferenceKey({ ...itemSource, externalId: String(systemId), entityType: "OperatingSystem", sourceScope: "OperatingSystem" }),
                  name: text(system?.name), version: refName(row.version), edition: refName(row.edition), architecture: refName(row.architecture), servicePack: refName(row.servicepack), kernelVersion: refName(row.kernel_version) };
              } else {
                const versionRef = ref(row.softwareversion);
                const versionId = refId(versionRef);
                let version: SoftwareVersionV2 | null = versionRef ? { ...evidence(itemSource), versionId: versionId === null ? null : sourceReferenceKey({ ...itemSource, externalId: String(versionId), entityType: "SoftwareVersion", sourceScope: "SoftwareVersion" }), value: text(versionRef.name), architecture: null } : null;
                let software: SoftwareIdentityV2 | null = null;
                if (versionId !== null) {
                  catalogue ??= loadCatalogue();
                  const resolved = await catalogue;
                  if (!catalogueGapsAdded) { gaps.push(...resolved.gaps); catalogueGapsAdded = true; }
                  const match = resolved.versions.get(versionId);
                  if (match) { software = match.product; version = match.version; }
                  else gaps.push({ fieldPath: `${section}.sourceRecords.${row.id}.software`, reason: "not_observed" });
                }
                mapped = { ...common, version, software };
              }
              const candidate: SoftwareInventoryV2 = { contractVersion: "2", assetId: asset.id, operatingSystems: { state: "not_requested" }, installations: { state: "not_requested" },
                [section]: { state: "complete", collectedAt: stamp(), observedAt: null, sourceReferences: [itemSource], items: [mapped], pagination: null } };
              if (validateSoftwareInventoryV2(candidate).some(i => i.severity === "error")) throw new GlpiPayloadError();
              items.push(mapped);
            } catch (error) {
              if (error instanceof GlpiConfigurationError || reason(error) === "unauthorized") throw error;
              collected.contiguous = false;
              gaps.push({ fieldPath: `${section}.sourceRecords.${row.id}`, reason: reason(error) });
            }
          }
          const uniqueGaps = [...new Map(gaps.map(g => [`${g.fieldPath}:${g.reason}`, g])).values()];
          const metadata = { collectedAt: stamp(), observedAt: null, sourceReferences: collected.sources,
            pagination: collected.contiguous ? { offset: 0, retrieved: items.length, total: collected.exhausted ? items.length : null, nextOffset: null } : null };
          return uniqueGaps.length ? { state: "partial", items, gaps: uniqueGaps, ...metadata } : { state: "complete", items, ...metadata };
        } catch (error) {
          if (error instanceof GlpiConfigurationError) throw error;
          return { state: "unavailable", reason: reason(error) };
        }
      }
      // Independent sections; authorization in one never exposes its previously acquired rows.
      const operatingSystems = await read("operatingSystems") as SoftwareSectionV2<OperatingSystemInstallationV2>;
      const installations = await read("installations") as SoftwareSectionV2<SoftwareInstallationV2>;
      const inventory: SoftwareInventoryV2 = { contractVersion: "2", assetId: asset.id, operatingSystems, installations };
      if (validateSoftwareInventoryV2(inventory).some(i => i.severity === "error")) throw new GlpiPayloadError("GLPI software adapter produced invalid inventory");
      return inventory;
    },
  };
}
