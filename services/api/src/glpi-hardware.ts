import {
  isIsoTimestamp, memoryTechnologies, sourceReferenceKey, validateHardwareInventoryV2, validateSourceReference,
  type HardwareComponentV2, type HardwareInventoryV2, type HardwareSectionV2,
  type ProcessorV2, type MemoryModuleV2, type PhysicalStorageDeviceV2, type LogicalVolumeV2,
  type HardwareCoverageGap, type HardwareCoverageReason, type SourceReference, type TechnologyAsset,
} from "@igx-nexus/types";
import { GlpiAuthenticationError, GlpiConfigurationError, GlpiPayloadError, GlpiRequestError, type GlpiApiTransport } from "./glpi.js";

export const glpiHardwareSections = ["processors", "memoryModules", "physicalStorageDevices", "logicalVolumes"] as const;
export type GlpiHardwareSection = (typeof glpiHardwareSections)[number];
/** Compatible subtype: identity anchor failures, not operational configuration failures. */
export class GlpiHardwareAnchorError extends GlpiConfigurationError {
  constructor() {
    super("Hardware requires one unambiguous GLPI Computer source reference");
    this.name = "GlpiHardwareAnchorError";
  }
}
type ComponentKind = "Processor" | "Memory" | "HardDrive";
type Row = Readonly<Record<string, unknown>>;
export interface GlpiHardwareAdapterOptions {
  readonly transport: GlpiApiTransport;
  readonly sourceInstanceId: string;
  readonly pageSize?: number;
  readonly maxPages?: number;
  readonly maxRecords?: number;
  readonly now?: () => Date;
}
export interface GlpiHardwareAdapter {
  getInventory(asset: TechnologyAsset, sections?: readonly GlpiHardwareSection[]): Promise<HardwareInventoryV2>;
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const missing = (v: unknown) => v === undefined || v === null || v === "";
function string(v: unknown): string | null {
  if (missing(v)) return null;
  if (typeof v !== "string") throw new GlpiPayloadError();
  return v.trim() || null;
}
function integer(v: unknown): number | null {
  if (missing(v)) return null;
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) throw new GlpiPayloadError();
  return v;
}
function id(v: unknown): number {
  const n = integer(v);
  if (n === null || n === 0) throw new GlpiPayloadError();
  return n;
}
function reference(v: unknown): Row | null {
  if (v === undefined || v === null) return null;
  if (!object(v)) throw new GlpiPayloadError();
  if (v.id !== undefined) integer(v.id);
  if (v.name !== undefined) string(v.name);
  if (v.designation !== undefined) string(v.designation);
  return v;
}
function name(v: unknown): string | null { return string(reference(v)?.name); }
/** GLPI size/capacity/totalsize fields are MiB, confirmed in GLPI 11.0.11 source. No rounding. */
export function glpiMiBToBytes(v: unknown): number | null {
  const n = integer(v);
  if (n === null) return null;
  const bytes = n * 1_048_576;
  if (!Number.isSafeInteger(bytes)) throw new GlpiPayloadError();
  return bytes;
}
/** GLPI's importer strips MHz/MT/s; only a retained explicit unit is defensible. */
function ramSpeed(v: unknown): MemoryModuleV2["speed"] {
  const raw = string(v);
  if (raw === null) return null;
  const match = /^(\d+(?:\.\d+)?)\s*(MHz|MT\/s)$/.exec(raw);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) throw new GlpiPayloadError();
  return { value, unit: match[2] as "MHz" | "MT/s" };
}
function errorReason(error: unknown): HardwareCoverageReason {
  if (error instanceof GlpiAuthenticationError || (error instanceof GlpiRequestError && (error.statusCode === 401 || error.statusCode === 403))) return "unauthorized";
  if (error instanceof GlpiRequestError && (error.statusCode === 405 || error.statusCode === 501)) return "unsupported";
  // These verified collection/detail endpoints are not optional single-record resources.
  // A 404 may mean missing Computer, stale association, wrong request or API version: never an empty collection.
  return "source_error";
}
function bounded(v: number, max: number): number {
  if (!Number.isSafeInteger(v) || v < 1 || v > max) throw new GlpiConfigurationError("Invalid GLPI hardware safety bound");
  return v;
}
function validateRow(v: unknown, computerId: number, kind: ComponentKind | "Volume"): Row {
  if (!object(v)) throw new GlpiPayloadError();
  id(v.id);
  if (v.itemtype !== undefined && v.itemtype !== "Computer") throw new GlpiPayloadError();
  if (v.items_id !== undefined && integer(v.items_id) !== computerId) throw new GlpiPayloadError();
  for (const key of ["is_deleted", "is_dynamic"]) if (v[key] !== undefined && typeof v[key] !== "boolean") throw new GlpiPayloadError();
  for (const key of ["serial", "otherserial", "busID", "name", "device", "mount_point", "frequency", "date_creation", "date_mod"]) if (v[key] !== undefined) string(v[key]);
  for (const key of ["size", "capacity", "total_size", "free_size", "nbcores", "nbthreads"]) if (v[key] !== undefined) integer(v[key]);
  if (kind === "Volume") reference(v.filesystem);
  else reference(v[kind === "HardDrive" ? "hard_drive" : kind.toLowerCase()]);
  return v;
}

/** Internal, additive reader; identity comes from the existing asset, never from component shape. */
export function createGlpiHardwareAdapter(options: GlpiHardwareAdapterOptions): GlpiHardwareAdapter {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.sourceInstanceId)) throw new GlpiConfigurationError("Invalid GLPI hardware source instance");
  const pageSize = bounded(options.pageSize ?? 100, 1000);
  const maxPages = bounded(options.maxPages ?? 100, 10000);
  const maxRecords = bounded(options.maxRecords ?? 10000, 100000);
  const stamp = () => {
    const at = (options.now ?? (() => new Date()))().toISOString();
    if (!isIsoTimestamp(at)) throw new GlpiConfigurationError("Invalid GLPI hardware collection clock");
    return at;
  };
  const source = (path: string, externalId: string, entityType: string, at: string): SourceReference => ({
    source: "glpi", sourceInstanceId: options.sourceInstanceId, sourceScope: path,
    externalId, entityType, observedAt: at, authority: "authoritative",
  });
  return {
    async getInventory(asset, sections = glpiHardwareSections) {
      if (!asset.id.trim() || sections.some((s) => !glpiHardwareSections.includes(s))) throw new GlpiConfigurationError("Invalid hardware inventory request");
      const anchors = asset.sourceReferences.filter((s) => s.source === "glpi" && s.sourceInstanceId === options.sourceInstanceId && s.entityType === "Computer" && s.sourceScope === "Assets/Computer");
      if (anchors.length !== 1 || validateSourceReference(anchors[0]!).length || !/^[1-9]\d*$/.test(anchors[0]!.externalId)) throw new GlpiHardwareAnchorError();
      const computerId = Number(anchors[0]!.externalId);
      if (!Number.isSafeInteger(computerId) || computerId < 1) throw new GlpiHardwareAnchorError();
      const requested = new Set(sections);
      // Catalogue entries can be shared by distinct physical components. Cache detail, never merge items.
      const details = new Map<string, Promise<{ row: Row; source: SourceReference }>>();
      async function detail(kind: ComponentKind, ref: Row): Promise<{ row: Row; source: SourceReference }> {
        const detailId = id(ref.id);
        const path = `Components/${kind}/${detailId}`;
        let pending = details.get(path);
        if (!pending) {
          pending = (async () => {
            const row = await options.transport.get(path);
            if (!object(row) || id(row.id) !== detailId) throw new GlpiPayloadError();
            for (const key of ["designation", "frequency"]) if (row[key] !== undefined) string(row[key]);
            for (const key of ["manufacturer", "model", "type", "interface"]) if (row[key] !== undefined) reference(row[key]);
            return { row, source: source(path, String(detailId), kind, stamp()) };
          })();
          details.set(path, pending);
        }
        return pending;
      }
      async function read<T extends ProcessorV2 | MemoryModuleV2 | PhysicalStorageDeviceV2 | LogicalVolumeV2>(section: GlpiHardwareSection, kind: ComponentKind | "Volume"): Promise<HardwareSectionV2<T>> {
        if (!requested.has(section)) return { state: "not_requested" };
        const path = kind === "Volume" ? `Assets/Computer/${computerId}/Volume` : `Assets/Computer/${computerId}/Component/${kind}`;
        const items: T[] = [];
        const sources: SourceReference[] = [];
        const gaps: HardwareCoverageGap[] = [];
        const seen = new Set<number>();
        let lastSeenId = 0;
        let start = 0;
        let pages = 0;
        let finished = false;
        let at = stamp();
        while (pages < maxPages && start < maxRecords) {
          const limit = Math.min(pageSize, maxRecords - start);
          let rows: readonly Row[];
          try {
            const payload = await options.transport.get(path, { start, limit, sort: "id:asc" });
            at = stamp();
            if (!Array.isArray(payload)) throw new GlpiPayloadError();
            if (payload.length > limit) { gaps.push({ fieldPath: section, reason: "pagination_incomplete" }); break; }
            rows = payload.map((v) => validateRow(v, computerId, kind));
            const ids = rows.map((r) => id(r.id));
            if (new Set(ids).size !== ids.length || ids.some((n, i) => seen.has(n) || (i > 0 && n <= ids[i - 1]!) || (i === 0 && n <= lastSeenId))) {
              gaps.push({ fieldPath: section, reason: "pagination_incomplete" }); break;
            }
          } catch (error) {
            const reason = errorReason(error);
            if (reason === "unauthorized") return { state: "unavailable", reason };
            gaps.push({ fieldPath: section, reason }); break;
          }
          const pageSource = source(path, `Computer/${computerId}?start=${start}&limit=${limit}&sort=id:asc`, `${kind}Collection`, at);
          sources.push(pageSource);
          pages++;
          if (rows.length === 0) { finished = true; break; }
          for (const row of rows) {
            seen.add(id(row.id));
            lastSeenId = id(row.id);
            start++;
            // Deleted associations are outside the requested current-inventory scope.
            if (row.is_deleted === true) continue;
            const itemSource = source(path, String(row.id), kind === "Volume" ? "Volume" : `${kind}Item`, at);
            const sourceReferences = [itemSource];
            let catalogue: Row | null = null;
            const ref = kind === "Volume" ? null : reference(row[kind === "HardDrive" ? "hard_drive" : kind.toLowerCase()]);
            if (ref?.id !== undefined && ref.id !== 0) {
              try { const resolved = await detail(kind as ComponentKind, ref); catalogue = resolved.row; sourceReferences.push(resolved.source); }
              catch (error) {
                const reason = errorReason(error);
                if (reason === "unauthorized") return { state: "unavailable", reason };
                gaps.push({ fieldPath: `${section}.sourceRecords.${row.id}.catalogue`, reason });
              }
            }
            const common: HardwareComponentV2 = {
              collectedAt: stamp(), observedAt: null, sourceReferences, provenance: [], componentId: null,
              manufacturer: catalogue ? name(catalogue.manufacturer) : null,
              model: (catalogue ? name(catalogue.model) ?? string(catalogue.designation) : null) ?? string(ref?.designation),
              identifiers: [
                ...(string(row.serial) ? [{ kind: "serial_number" as const, value: string(row.serial)!, source: itemSource }] : []),
                ...(string(row.otherserial) ? [{ kind: "asset_tag" as const, value: string(row.otherserial)!, source: itemSource }] : []),
              ],
            };
            try {
              let mapped: ProcessorV2 | MemoryModuleV2 | PhysicalStorageDeviceV2 | LogicalVolumeV2;
              if (kind === "Processor") {
                mapped = { ...common, cores: integer(row.nbcores) || null, threads: integer(row.nbthreads) || null, baseFrequency: null, maxFrequency: null };
              } else if (kind === "Memory") {
                const technology = catalogue ? name(catalogue.type) : null;
                mapped = { ...common, capacityBytes: glpiMiBToBytes(row.size), technology: memoryTechnologies.includes(technology as typeof memoryTechnologies[number]) ? technology as MemoryModuleV2["technology"] : null,
                  formFactor: null, speed: catalogue ? ramSpeed(catalogue.frequency) : null, slot: string(row.busID) };
              } else if (kind === "HardDrive") {
                const transportName = catalogue ? name(catalogue.interface) : null;
                mapped = { ...common, capacityBytes: glpiMiBToBytes(row.capacity), medium: null,
                  protocol: transportName === "NVMe" ? "NVMe" : null,
                  interface: ["SATA", "PCIe", "SAS", "USB"].includes(transportName ?? "") ? transportName as PhysicalStorageDeviceV2["interface"] : null, formFactor: null };
              } else {
                mapped = { collectedAt: at, observedAt: null, sourceReferences, provenance: [],
                  volumeId: sourceReferenceKey(itemSource), name: string(row.name), physicalDeviceIds: null,
                  capacityBytes: glpiMiBToBytes(row.total_size), availableBytes: glpiMiBToBytes(row.free_size), fileSystem: name(row.filesystem) };
              }
              // Validate the item using the canonical validator, without a parallel invariant system.
              const candidate = { contractVersion: "2", assetId: asset.id, processors: { state: "not_requested" }, memoryModules: { state: "not_requested" }, physicalStorageDevices: { state: "not_requested" }, logicalVolumes: { state: "not_requested" }, peripherals: { state: "not_requested" }, peripheralConnections: { state: "not_requested" },
                [section]: { state: "complete", collectedAt: at, observedAt: null, sourceReferences: [pageSource], items: [mapped] } };
              if (validateHardwareInventoryV2(candidate).some((i) => i.severity === "error")) throw new GlpiPayloadError();
              items.push(mapped as T);
            } catch { gaps.push({ fieldPath: `${section}.sourceRecords.${row.id}`, reason: "source_error" }); }
          }
          // A short page is not proof of exhaustion: GLPI may enforce a smaller limit.
        }
        if (!finished && gaps.length === 0) gaps.push({ fieldPath: section, reason: "pagination_incomplete" });
        if (sources.length === 0) return { state: "unavailable", reason: gaps[0]?.reason ?? "source_error" };
        at = stamp();
        return gaps.length ? { state: "partial", items, gaps, collectedAt: at, observedAt: null, sourceReferences: sources }
          : { state: "complete", items, collectedAt: at, observedAt: null, sourceReferences: sources };
      }
      const inventory: HardwareInventoryV2 = {
        contractVersion: "2", assetId: asset.id,
        processors: await read<ProcessorV2>("processors", "Processor"),
        memoryModules: await read<MemoryModuleV2>("memoryModules", "Memory"),
        physicalStorageDevices: await read<PhysicalStorageDeviceV2>("physicalStorageDevices", "HardDrive"),
        logicalVolumes: await read<LogicalVolumeV2>("logicalVolumes", "Volume"),
        peripherals: { state: "not_requested" }, peripheralConnections: { state: "not_requested" },
      };
      if (validateHardwareInventoryV2(inventory).some((i) => i.severity === "error")) throw new GlpiPayloadError("GLPI hardware adapter produced invalid inventory");
      return inventory;
    },
  };
}
