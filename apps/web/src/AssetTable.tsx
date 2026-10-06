import { Badge, DataTable, StatusBadge, type DataTableColumn, type DataTableSort, type StatusBadgeStatus } from "@igx-nexus/ui";
import {
  assetClassLabel,
  criticalityLabels,
  lifecycleLabels,
  taxonomyStateLabels,
  technologyRoleLabel,
  type Asset,
  type AssetCriticality,
  type AssetTaxonomyState,
} from "./asset-model";
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
} as const satisfies Record<Asset["lifecycle"], StatusBadgeStatus>;

const criticalityTones = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "critical",
  unknown: "neutral",
} as const satisfies Record<AssetCriticality, StatusBadgeStatus>;

const taxonomyTones = {
  classified: "success",
  unknown: "neutral",
  unclassified: "warning",
  conflict: "critical",
} as const satisfies Record<AssetTaxonomyState, StatusBadgeStatus>;

function sourceLabel(source: string): string {
  return source.startsWith("custom:")
    ? source.slice("custom:".length)
    : source.toLocaleUpperCase("es-CL");
}

export function AssetTable({ rows, asOf, sort, onSortChange, showTechnical, assetLink = assetHash, onAssetNavigate, caption = "Inventario de activos demo" }: {
  rows: readonly Asset[];
  asOf: string;
  sort: DataTableSort;
  onSortChange: (sort: DataTableSort) => void;
  showTechnical: boolean;
  caption?: string;
  assetLink?: (assetId: string) => string;
  onAssetNavigate?: (assetId: string) => void;
}) {
  const columns: readonly DataTableColumn<Asset>[] = [
    {
      id: "name",
      header: "Activo",
      isRowHeader: true,
      isSortable: true,
      cell: asset => <div className="nexus-asset-identity">
        <strong><a className="nexus-asset-link" data-asset-link={asset.id} href={assetLink(asset.id)} onClick={event => {
          if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onAssetNavigate?.(asset.id);
        }}>{asset.name}</a></strong>
        <span className="nexus-id nexus-muted">{asset.id}</span>
        {showTechnical && <dl className="nexus-asset-technical">
          <div><dt>Hostname</dt><dd>{asset.hostname ?? "Sin hostname"}</dd></div>
          <div><dt>Serial</dt><dd>{asset.serial ?? "Sin serial"}</dd></div>
          <div><dt>Etiqueta</dt><dd>{asset.assetTag ?? "Sin etiqueta"}</dd></div>
          <div><dt>IP</dt><dd>{asset.ipAddress ?? "Sin IP"}</dd></div>
        </dl>}
      </div>,
    },
    {
      id: "assetClass",
      header: "Clasificación",
      isSortable: true,
      cell: asset => {
        const state = asset.taxonomyState ?? "unknown";
        const contexts = asset.operationalContexts ?? [];
        return <div className="nexus-asset-cell nexus-asset-classification">
          <div className="nexus-asset-classification-head"><Badge>{asset.domain}</Badge><strong>{assetClassLabel(asset.assetClass)}</strong></div>
          <span>{technologyRoleLabel(asset.role)}</span>
          {asset.taxonomyCompatibilityFallback
            ? <StatusBadge status="warning">Proyección de compatibilidad</StatusBadge>
            : <StatusBadge status={taxonomyTones[state]}>{taxonomyStateLabels[state]}{asset.taxonomyReviewRequired ? " · revisar" : ""}</StatusBadge>}
          {contexts.length > 0 && <span className="nexus-muted">Contexto: {contexts.map(context => context.displayName || context.id).join(", ")}</span>}
        </div>;
      },
    },
    {
      id: "lifecycle",
      header: "Lifecycle / criticidad",
      isSortable: true,
      cell: asset => {
        const criticality = asset.criticality ?? (asset.critical ? "critical" : "medium");
        return <div className="nexus-asset-cell">
          <StatusBadge status={stateTones[asset.lifecycle]}>{lifecycleLabels[asset.lifecycle]}</StatusBadge>
          <StatusBadge status={criticalityTones[criticality]}>Criticidad {criticalityLabels[criticality].toLocaleLowerCase("es-CL")}</StatusBadge>
        </div>;
      },
    },
    {
      id: "source",
      header: "Fuente / freshness",
      isSortable: true,
      cell: asset => {
        const freshness = freshnessOf(asset, asOf);
        return <div className="nexus-asset-cell">
          <div className="nexus-asset-source-list">
            {(asset.sourceSystems?.length ? asset.sourceSystems : ["Sin fuente"]).map(source => <Badge key={source}>{sourceLabel(source)}</Badge>)}
          </div>
          {freshness !== "unknown" && asset.lastSeen && <time dateTime={asset.lastSeen}>{dateFormat.format(new Date(asset.lastSeen))}</time>}
          <span className="nexus-muted">{freshnessLabels[freshness]}</span>
        </div>;
      },
    },
    {
      id: "owner",
      header: "Responsable / sitio",
      isSortable: true,
      cell: asset => <div className="nexus-asset-cell">
        <span>{asset.owner ?? "Sin responsable"}</span>
        <span className="nexus-muted">{asset.location ?? "Sin ubicación"}</span>
      </div>,
    },
    {
      id: "manufacturer",
      header: "Fabricante / modelo",
      isSortable: true,
      cell: asset => <div className="nexus-asset-cell">
        <span>{asset.manufacturer ?? "Sin fabricante"}</span>
        <span className="nexus-muted">{asset.model ?? "Sin modelo"}</span>
      </div>,
    },
  ];

  return <DataTable
    className="nexus-asset-table"
    caption={caption}
    columns={columns}
    rows={rows}
    getRowKey={asset => asset.id}
    sort={sort}
    onSortChange={onSortChange}
  />;
}
