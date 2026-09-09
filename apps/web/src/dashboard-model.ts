import { ageInDays, isFresh, type AssetSummary, type InventorySnapshot } from "./asset-model";
export { DAY, ageInDays, isFresh, typeLabels, lifecycleLabels } from "./asset-model";
export type { Domain, AssetType, Lifecycle } from "./asset-model";
import type { Domain } from "./asset-model";
export type DashboardAsset = AssetSummary;
export type DashboardSnapshot = InventorySnapshot<AssetSummary>;
export type DashboardProvider = (signal: AbortSignal) => Promise<DashboardSnapshot>;
export function warrantyDays(asset: DashboardAsset, asOf: string): number | null {
  const age = ageInDays(asset.warrantyEnds, asOf);
  return age === null ? null : -age;
}
export function summarize(snapshot: DashboardSnapshot, domain: Domain | "all") {
  const assets = snapshot.assets.filter(a => domain === "all" || a.domain === domain);
  const active = assets.filter(a => a.lifecycle !== "retired");
  const fresh = active.filter(a => isFresh(a, snapshot.asOf)).length;
  const complete = active.filter(a => a.owner?.trim() && a.location?.trim()).length;
  const due = active.filter(a => { const days = warrantyDays(a, snapshot.asOf); return days !== null && days >= 0 && days <= 90; });
  const expired = active.filter(a => { const days = warrantyDays(a, snapshot.asOf); return days !== null && days < 0; }).length;
  const unknownWarranty = active.filter(a => warrantyDays(a, snapshot.asOf) === null).length;
  const critical = active.filter(a => a.critical);
  const criticalStale = critical.filter(a => !isFresh(a, snapshot.asOf)).length;
  const countBy = (key: "type" | "location" | "lifecycle" | "domain") => {
    const counts = new Map<string, number>();
    for (const asset of assets) { const label = asset[key] ?? "Sin ubicación"; counts.set(label, (counts.get(label) ?? 0) + 1); }
    return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  };
  return { assets, active, fresh, complete, due, expired, unknownWarranty, critical, criticalStale, countBy };
}
export function percentage(value: number, total: number): string {
  return total === 0 ? "Sin datos" : new Intl.NumberFormat("es-CL", { style: "percent", maximumFractionDigits: 0 }).format(value / total);
}
