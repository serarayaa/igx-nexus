import { useId } from "react";
import { Button } from "@igx-nexus/ui";
import { lifecycleLabels, typeLabels, type InventorySnapshot, type AssetType, type Lifecycle } from "./asset-model";
import { facetValues, filterKeys, freshnessLabels, NO_VALUE, type ExplorerFilters as Filters, type FilterKey, type Freshness } from "./explorer-model";

export const filterLabels: Record<FilterKey, string> = {
  domain: "Dominio", type: "Tipo", lifecycle: "Estado", location: "Sitio", manufacturer: "Fabricante", critical: "Criticidad", freshness: "Frescura",
};
function valueLabel(key: FilterKey, value: string): string {
  if (value === NO_VALUE) return key === "location" ? "Sin ubicación" : "Sin fabricante";
  if (key === "type") return typeLabels[value as AssetType];
  if (key === "lifecycle") return lifecycleLabels[value as Lifecycle];
  if (key === "freshness") return freshnessLabels[value as Freshness];
  if (key === "critical") return value === "yes" ? "Críticos" : "No críticos";
  return value;
}

export function ExplorerFilters({ snapshot, filters, onChange, onClear }: {
  snapshot: InventorySnapshot; filters: Filters; onChange: (key: FilterKey, value: string) => void; onClear: () => void;
}) {
  const id = useId();
  const active = filterKeys.filter(key => filters[key]);
  function focusFilter(key: FilterKey) {
    const select = document.getElementById(`${id}-${key}`);
    const disclosure = select?.closest("details");
    if (disclosure) disclosure.open = true;
    select?.focus();
  }
  function renderFilter(key: FilterKey) {
    return <label key={key} className="nexus-select-field" htmlFor={`${id}-${key}`}>
      <span>{filterLabels[key]}</span>
      <select id={`${id}-${key}`} value={filters[key]} onChange={e => onChange(key, e.target.value)}>
        <option value="">Todos</option>
        {[...new Set([...facetValues(snapshot, key), ...(filters[key] ? [filters[key]] : [])])].map(value => <option key={value} value={value}>{valueLabel(key, value)}</option>)}
      </select>
    </label>;
  }
  return <section aria-label="Filtros de activos" className="nexus-explorer-filters">
    <div className="nexus-explorer-filter-grid">
      {filterKeys.slice(0, 4).map(renderFilter)}
    </div>
    <details className="nexus-explorer-more-filters">
      <summary>Más filtros{active.some(key => filterKeys.slice(4).includes(key)) ? " · con filtros activos" : ""}</summary>
      <div className="nexus-explorer-filter-grid">{filterKeys.slice(4).map(renderFilter)}</div>
    </details>
    {active.length > 0 && <div className="nexus-filter" role="group" aria-label="Filtros activos">
      {active.map(key => <Button key={key} size="sm" variant="secondary" aria-label={`Quitar filtro ${filterLabels[key]}: ${valueLabel(key, filters[key])}`} onPress={() => {
        onChange(key, "");
        focusFilter(key);
      }}>{filterLabels[key]}: {valueLabel(key, filters[key])} <span aria-hidden="true">×</span></Button>)}
      <Button size="sm" variant="secondary" onPress={() => { onClear(); document.getElementById(`${id}-domain`)?.focus(); }}>Limpiar filtros</Button>
    </div>}
  </section>;
}
