import { Badge, DataTable, StatusBadge, type DataTableColumn, type DataTableSort } from "@igx-nexus/ui";
import { lifecycleLabels, typeLabels, type Asset } from "./asset-model";
import { freshnessLabels, freshnessOf } from "./explorer-model";
import { assetHash } from "./navigation-model";

const dateFormat = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "UTC" });
const stateTones = {
  assigned: "success",
  stock: "info",
  repair: "warning",
  retired: "neutral",
  planned: "info",
  in_stock: "info",
  active: "success",
  maintenance: "warning",
  disposed: "neutral",
  unknown: "neutral",
} as const;

export function AssetTable({ rows, asOf, sort, onSortChange, showTechnical, caption = "Inventario de activos demo" }: {
  rows: readonly Asset[];
  asOf: string;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
  showTechnical: boolean;
  caption?: string;
}) {
  const columns: readonly DataTableColumn<Asset>[] = [
    { id: "name", header: "Activo", isRowHeader: true, isSortable: true, cell: a => <div className="nexus-asset-identity">
      <strong><a className="nexus-asset-link" href={assetHash(a.id)}>{a.name}</a></strong><span className="nexus-id nexus-muted">{a.id}</span>
      {a.critical && <span className="nexus-muted">Criticidad: crítico</span>}
      {showTechnical && <dl className="nexus-asset-technical">
        <div><dt>Hostname</dt><dd>{a.hostname ?? "Sin hostname"}</dd></div>
        <div><dt>Serial</dt><dd>{a.serial ?? "Sin serial"}</dd></div>
        <div><dt>Etiqueta</dt><dd>{a.assetTag ?? "Sin etiqueta"}</dd></div>
        <div><dt>IP</dt><dd>{a.ipAddress ?? "Sin IP"}</dd></div>
      </dl>}
    </div> },
    { id: "type", header: "Tipo / dominio", isSortable: true, cell: a => <div className="nexus-asset-cell"><span>{typeLabels[a.type]}</span><Badge>{a.domain}</Badge></div> },
    { id: "owner", header: "Responsable", isSortable: true, cell: a => a.owner ?? "Sin responsable" },
    { id: "location", header: "Sitio", isSortable: true, cell: a => a.location ?? "Sin ubicación" },
    { id: "manufacturer", header: "Fabricante / modelo", isSortable: true, cell: a => <div className="nexus-asset-cell"><span>{a.manufacturer ?? "Sin fabricante"}</span><span className="nexus-muted">{a.model ?? "Sin modelo"}</span></div> },
    { id: "lifecycle", header: "Estado", isSortable: true, cell: a => <StatusBadge status={stateTones[a.lifecycle]}>{lifecycleLabels[a.lifecycle]}</StatusBadge> },
    { id: "lastSeen", header: "Última observación", isSortable: true, cell: a => {
      const freshness = freshnessOf(a, asOf);
      return <div className="nexus-asset-cell">{freshness !== "unknown" && a.lastSeen && <time dateTime={a.lastSeen}>{dateFormat.format(new Date(a.lastSeen))}</time>}<span className="nexus-muted">{freshnessLabels[freshness]}</span></div>;
    } },
  ];
  return <DataTable className="nexus-asset-table" caption={caption} columns={columns} rows={rows} getRowKey={a => a.id} sort={sort} onSortChange={onSortChange} />;
}
