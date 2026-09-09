import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Inbox,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export type DataTableCellAlign = "start" | "center" | "end";
export type DataTableSortDirection = "ascending" | "descending";

export interface DataTableSort {
  columnId: string;
  direction: DataTableSortDirection;
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: DataTableCellAlign;
  isRowHeader?: boolean;
  isSortable?: boolean;
}

export interface DataTableProps<T> {
  caption: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  showCaption?: boolean;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  selectionMode?: "none" | "multiple";
  selectedKeys?: ReadonlySet<string>;
  defaultSelectedKeys?: Iterable<string>;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  getSelectionLabel?: (row: T) => string;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  className?: string;
}

type AriaSortValue = "ascending" | "descending" | "none";

function sortIcon(direction?: DataTableSortDirection) {
  if (direction === "ascending") {
    return <ArrowUp aria-hidden="true" />;
  }

  if (direction === "descending") {
    return <ArrowDown aria-hidden="true" />;
  }

  return <ChevronsUpDown aria-hidden="true" />;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  showCaption = false,
  sort,
  onSortChange,
  selectionMode = "none",
  selectedKeys,
  defaultSelectedKeys,
  onSelectionChange,
  getSelectionLabel,
  isLoading = false,
  loadingMessage = "Cargando datos…",
  emptyMessage = "No hay datos para mostrar.",
  errorMessage,
  className,
}: DataTableProps<T>) {
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(
    () => new Set<string>(defaultSelectedKeys ?? []),
  );
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectable = selectionMode === "multiple";
  const effectiveSelectedKeys = selectedKeys ?? internalSelectedKeys;
  const visibleRowKeys = rows.map(getRowKey);
  const selectedVisibleCount = visibleRowKeys.reduce(
    (count, rowKey) => count + (effectiveSelectedKeys.has(rowKey) ? 1 : 0),
    0,
  );
  const allRowsSelected =
    selectable &&
    visibleRowKeys.length > 0 &&
    selectedVisibleCount === visibleRowKeys.length;
  const someRowsSelected =
    selectable && selectedVisibleCount > 0 && !allRowsSelected;
  const classes = ["igx-data-table", className].filter(Boolean).join(" ");
  const stateColSpan = columns.length + (selectable ? 1 : 0);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someRowsSelected;
    }
  }, [someRowsSelected]);

  function updateSelection(nextSelectedKeys: Set<string>) {
    if (selectedKeys === undefined) {
      setInternalSelectedKeys(nextSelectedKeys);
    }

    onSelectionChange?.(nextSelectedKeys);
  }

  function toggleAllRows(checked: boolean) {
    const nextSelectedKeys = new Set(effectiveSelectedKeys);

    for (const rowKey of visibleRowKeys) {
      if (checked) {
        nextSelectedKeys.add(rowKey);
      } else {
        nextSelectedKeys.delete(rowKey);
      }
    }

    updateSelection(nextSelectedKeys);
  }

  function toggleRow(rowKey: string, checked: boolean) {
    const nextSelectedKeys = new Set(effectiveSelectedKeys);

    if (checked) {
      nextSelectedKeys.add(rowKey);
    } else {
      nextSelectedKeys.delete(rowKey);
    }

    updateSelection(nextSelectedKeys);
  }

  function getAriaSort(column: DataTableColumn<T>): AriaSortValue | undefined {
    if (!column.isSortable) {
      return undefined;
    }

    if (sort?.columnId !== column.id) {
      return "none";
    }

    return sort.direction;
  }

  function handleSort(columnId: string) {
    if (!onSortChange) {
      return;
    }

    const direction: DataTableSortDirection =
      sort?.columnId === columnId && sort.direction === "ascending"
        ? "descending"
        : "ascending";

    onSortChange({ columnId, direction });
  }

  function renderStateRow() {
    if (errorMessage !== undefined) {
      return (
        <tr>
          <td className="igx-data-table__state-cell" colSpan={stateColSpan}>
            <div className="igx-data-table__state" role="alert">
              <TriangleAlert aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          </td>
        </tr>
      );
    }

    if (isLoading) {
      return (
        <tr>
          <td className="igx-data-table__state-cell" colSpan={stateColSpan}>
            <div className="igx-data-table__state" role="status">
              <LoaderCircle aria-hidden="true" />
              <span>{loadingMessage}</span>
            </div>
          </td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td className="igx-data-table__state-cell" colSpan={stateColSpan}>
            <div className="igx-data-table__state">
              <Inbox aria-hidden="true" />
              <span>{emptyMessage}</span>
            </div>
          </td>
        </tr>
      );
    }

    return rows.map((row) => {
      const rowKey = getRowKey(row);
      const isSelected = selectable && effectiveSelectedKeys.has(rowKey);
      const selectionLabel =
        getSelectionLabel?.(row) ?? `Seleccionar fila ${rowKey}`;

      return (
        <tr key={rowKey} data-selected={isSelected ? "true" : undefined}>
          {selectable ? (
            <td className="igx-data-table__selection-cell">
              <label className="igx-data-table__selection-control">
                <input
                  type="checkbox"
                  checked={isSelected}
                  aria-label={selectionLabel}
                  onChange={(event) => toggleRow(rowKey, event.target.checked)}
                />
              </label>
            </td>
          ) : null}

          {columns.map((column) => {
            const content = column.cell(row);
            const align = column.align ?? "start";

            if (column.isRowHeader) {
              return (
                <th
                  key={column.id}
                  scope="row"
                  data-align={align}
                  className="igx-data-table__row-header"
                >
                  {content}
                </th>
              );
            }

            return (
              <td key={column.id} data-align={align}>
                {content}
              </td>
            );
          })}
        </tr>
      );
    });
  }

  return (
    <div className={classes}>
      <div
        className="igx-data-table__scroller"
        role="region"
        aria-label={caption}
        tabIndex={0}
      >
        <table aria-busy={isLoading}>
          <caption
            className={
              showCaption
                ? "igx-data-table__caption"
                : "igx-data-table__caption igx-data-table__caption--hidden"
            }
          >
            {caption}
          </caption>
          <thead>
            <tr>
              {selectable ? (
                <th scope="col" className="igx-data-table__selection-cell">
                  <label className="igx-data-table__selection-control">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allRowsSelected}
                      aria-label="Seleccionar todas las filas"
                      onChange={(event) => toggleAllRows(event.target.checked)}
                    />
                  </label>
                </th>
              ) : null}

              {columns.map((column) => {
                const ariaSort = getAriaSort(column);
                const isActiveSort = sort?.columnId === column.id;
                const align = column.align ?? "start";

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    data-align={align}
                  >
                    {column.isSortable && onSortChange ? (
                      <button
                        type="button"
                        className="igx-data-table__sort-button"
                        onClick={() => handleSort(column.id)}
                      >
                        <span>{column.header}</span>
                        <span
                          className="igx-data-table__sort-icon"
                          aria-hidden="true"
                        >
                          {sortIcon(isActiveSort ? sort?.direction : undefined)}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{renderStateRow()}</tbody>
        </table>
      </div>
    </div>
  );
}
