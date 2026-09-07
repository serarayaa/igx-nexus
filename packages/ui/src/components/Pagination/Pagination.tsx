import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../Button/Button.js";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  className?: string;
}

type PaginationItem = number | "ellipsis";

function buildItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([
    1,
    totalPages,
    page - 1,
    page,
    page + 1,
  ]);
  const ordered = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const items: PaginationItem[] = [];

  ordered.forEach((value, index) => {
    const previous = ordered[index - 1];

    if (previous !== undefined && value - previous > 1) {
      items.push("ellipsis");
    }

    items.push(value);
  });

  return items;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  ariaLabel = "Paginación",
  className,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(page, 1), safeTotalPages);
  const items = buildItems(currentPage, safeTotalPages);
  const classes = ["igx-pagination", className].filter(Boolean).join(" ");

  return (
    <nav className={classes} aria-label={ariaLabel}>
      <span className="igx-pagination__summary">
        Página {currentPage} de {safeTotalPages}
      </span>
      <ul className="igx-pagination__list">
        <li>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={currentPage === 1}
            aria-label="Página anterior"
            onPress={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
            <span className="igx-pagination__direction-label">Anterior</span>
          </Button>
        </li>

        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <li
                key={`ellipsis-${index}`}
                className="igx-pagination__ellipsis"
                aria-hidden="true"
              >
                …
              </li>
            );
          }

          const isCurrent = item === currentPage;

          return (
            <li key={item}>
              <Button
                variant={isCurrent ? "primary" : "secondary"}
                size="sm"
                aria-current={isCurrent ? "page" : undefined}
                aria-label={
                  isCurrent ? `Página ${item}, página actual` : `Página ${item}`
                }
                onPress={() => {
                  if (!isCurrent) {
                    onPageChange(item);
                  }
                }}
              >
                {item}
              </Button>
            </li>
          );
        })}

        <li>
          <Button
            variant="secondary"
            size="sm"
            isDisabled={currentPage === safeTotalPages}
            aria-label="Página siguiente"
            onPress={() => onPageChange(currentPage + 1)}
          >
            <span className="igx-pagination__direction-label">Siguiente</span>
            <ChevronRight aria-hidden="true" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}
