import type { HardwareSectionV2, MemoryModuleV2 } from "@igx-nexus/types";
const number = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });
export function hardwareBytes(value: number | null): string {
  if (value === null) return "Desconocida";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const index = value === 0 ? 0 : Math.min(4, Math.floor(Math.log(value) / Math.log(1024)));
  return `${number.format(value / 1024 ** index)} ${units[index]}`;
}
export function memoryCapacity(section: HardwareSectionV2<MemoryModuleV2>) {
  if (section.state !== "complete" && section.state !== "partial") return { value: null, total: false, missing: null };
  const capacities = section.items.map(item => item.capacityBytes);
  const known = capacities.filter((value): value is number => value !== null);
  const sum = known.reduce((total, value) => total + value, 0);
  return { value: known.length && Number.isSafeInteger(sum) ? sum : null, total: Number.isSafeInteger(sum) && section.state === "complete" && known.length === capacities.length && capacities.length > 0, missing: capacities.length - known.length };
}
export function volumeUsage(capacity: number | null, available: number | null) {
  if (capacity === null || available === null || capacity <= 0 || available < 0 || available > capacity) return null;
  return { used: capacity - available, percent: (capacity - available) / capacity * 100 };
}
