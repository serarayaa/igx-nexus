import { useId } from "react";
import { Button } from "@igx-nexus/ui";
import {
  assetClassLabel,
  criticalityLabels,
  lifecycleLabels,
  taxonomyStateLabels,
  technologyRoleLabel,
  typeLabels,
  type AssetCriticality,
  type AssetTaxonomyState,
  type AssetType,
  type InventorySnapshot,
  type Lifecycle,
} from "./asset-model";
import {
  facetOptions,
  filterKeys,
  freshnessLabels,
  hasFacetCoverage,
  NO_VALUE,
  type ExplorerFilters as Filters,
  type ExplorerQuery,
  type FilterKey,
  type Freshness,
} from "./explorer-model";

export const filterLabels: Record<FilterKey, string> = {
  domain: "Dominio",
  assetClass: "Clase",
  role: "Rol",
  lifecycle: "Lifecycle",
  source: "Fuente",
  taxonomyState: "Estado taxonómico",
  reviewRequired: "Revisión requerida",
  compatibilityFallback: "Proyección de compatibilidad",
  context: "Contexto operacional",
  type: "Tipo de inventario",
  location: "Sitio",
  manufacturer: "Fabricante",
  criticality: "Criticidad",
  freshness: "Frescura",
};

function sourceLabel(value: string): string {
  if (value.startsWith("custom:")) return "Custom · " + value.slice("custom:".length);
  return value.toLocaleUpperCase("es-CL");
}

function valueLabel(key: FilterKey, value: string): string {
  if (value === NO_VALUE) {
    if (key === "location") return "Sin ubicación";
    if (key === "manufacturer") return "Sin fabricante";
    if (key === "context") return "Sin contexto";
    if (key === "source") return "Sin fuente";
    return "Sin dato";
  }
  if (key === "type") return typeLabels[value as AssetType] ?? value;
  if (key === "lifecycle") return lifecycleLabels[value as Lifecycle] ?? value;
  if (key === "freshness") return freshnessLabels[value as Freshness] ?? value;
  if (key === "criticality") return criticalityLabels[value as AssetCriticality] ?? value;
  if (key === "assetClass") return assetClassLabel(value as Parameters<typeof assetClassLabel>[0]);
  if (key === "role") return technologyRoleLabel(value as Parameters<typeof technologyRoleLabel>[0]);
  if (key === "taxonomyState") return taxonomyStateLabels[value as AssetTaxonomyState] ?? value;
  if (key === "reviewRequired") return value === "yes" ? "Sí" : "No";
  if (key === "compatibilityFallback") return value === "yes" ? "Sí" : "No";
  if (key === "source") return sourceLabel(value);
  return value;
}

export function ExplorerFilters({ snapshot, query, onChange, onClear }: {
  snapshot: InventorySnapshot;
  query: ExplorerQuery;
  onChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
}) {
  const id = useId();
  const filters: Filters = query.filters;
  const active = filterKeys.filter(key => filters[key]);
  const visible = filterKeys.filter(key => hasFacetCoverage(snapshot, key) || Boolean(filters[key]));
  const primary = filterKeys.slice(0, 4).filter(key => visible.includes(key));
  const secondary = filterKeys.slice(4).filter(key => visible.includes(key));

  function focusFilter(key: FilterKey) {
    const select = document.getElementById(`${id}-${key}`);
    const disclosure = select?.closest("details");
    if (disclosure) disclosure.open = true;
    select?.focus();
  }

  function renderFilter(key: FilterKey) {
    const options = facetOptions(snapshot, query, key);
    return <label key={key} className="nexus-select-field" htmlFor={`${id}-${key}`}>
      <span>{filterLabels[key]}</span>
      <select id={`${id}-${key}`} value={filters[key]} onChange={e => onChange(key, e.target.value)}>
        <option value="">Todos</option>
        {filters[key] && !options.some(option => option.value === filters[key]) && <option value={filters[key]}>{valueLabel(key, filters[key])} · sin coincidencias actuales</option>}
        {options.map(option => <option key={option.value} value={option.value}>
          {valueLabel(key, option.value)} ({option.count})
        </option>)}
      </select>
    </label>;
  }

  return <section aria-label="Filtros de activos" className="nexus-explorer-filters">
    <div className="nexus-explorer-filter-grid">
      {primary.map(renderFilter)}
    </div>

    {secondary.length > 0 && <details className="nexus-explorer-more-filters">
      <summary>Más filtros{active.some(key => secondary.includes(key)) ? " · con filtros activos" : ""}</summary>
      <div className="nexus-explorer-filter-grid">{secondary.map(renderFilter)}</div>
    </details>}

    {active.length > 0 && <div className="nexus-filter" role="group" aria-label="Filtros activos">
      {active.map(key => <Button key={key} size="sm" variant="secondary"
        aria-label={`Quitar filtro ${filterLabels[key]}: ${valueLabel(key, filters[key])}`}
        onPress={() => {
          onChange(key, "");
          focusFilter(key);
        }}>
        {filterLabels[key]}: {valueLabel(key, filters[key])} <span aria-hidden="true">×</span>
      </Button>)}
      <Button size="sm" variant="secondary" onPress={() => {
        onClear();
        document.getElementById(`${id}-${primary[0] ?? "domain"}`)?.focus();
      }}>Limpiar filtros</Button>
    </div>}
  </section>;
}
