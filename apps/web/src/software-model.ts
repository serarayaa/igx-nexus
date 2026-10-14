import type { SoftwareInstallationDateV2, SoftwareInstallationV2 } from "@igx-nexus/types";
export function softwareInstallationDate(value: SoftwareInstallationDateV2 | null): string {
  if (!value) return "No informada";
  return value.precision === "date" ? `${value.value} · día calendario, sin hora` : `${new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC", hourCycle: "h23" }).format(new Date(value.value))} UTC · timestamp`;
}
export type SoftwareSort = "name" | "publisher" | "version";
export function softwareRows(items: readonly SoftwareInstallationV2[], query: string, publisher: string, sort: SoftwareSort, direction: "ascending" | "descending") {
  const search = query.toLocaleLowerCase("es-CL").trim(); // Search text only; canonical fields and IDs are never changed.
  const field = (item: SoftwareInstallationV2) => sort === "name" ? item.software?.name : sort === "publisher" ? item.software?.publisher : item.version?.value;
  return items.map((item, index) => ({ item, index })).filter(({ item }) => {
    const editor = item.software?.publisher;
    const matchesPublisher = publisher === "all" || (publisher === "unknown" ? editor == null : publisher === `publisher:${editor}`);
    return matchesPublisher && [item.software?.name, editor, item.version?.value, item.version?.architecture, item.installationId, item.software?.softwareId, item.version?.versionId].some(value => (value ?? "").toLocaleLowerCase("es-CL").includes(search));
  }).sort((a, b) => {
    const left = field(a.item), right = field(b.item);
    if (left == null && right != null) return 1;
    if (right == null && left != null) return -1;
    return (left ?? "").localeCompare(right ?? "", "es-CL", { numeric: false }) * (direction === "ascending" ? 1 : -1) || a.index - b.index;
  });
}
