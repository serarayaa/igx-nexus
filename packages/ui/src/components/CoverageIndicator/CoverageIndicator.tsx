import { CircleDashed, CircleHelp, ScanLine } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export interface CoverageIndicatorProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  covered: number | null;
  total: number | null;
  /** Visible denominator context, e.g. "activos con propietario". */
  scope: string;
}
export function CoverageIndicator({ covered, total, scope, className, ...props }: CoverageIndicatorProps) {
  const valid = covered !== null && total !== null && Number.isSafeInteger(covered) && Number.isSafeInteger(total) && total > 0 && covered >= 0 && covered <= total;
  const complete = valid && covered === total;
  const Icon = valid ? (complete ? ScanLine : CircleDashed) : CircleHelp;
  const label = valid ? `${covered}/${total} · ${Math.floor(covered / total * 100)}% · Cobertura ${complete ? "completa" : "parcial"}` : "Cobertura desconocida";
  return <span {...props} className={["igx-semantic-badge", "igx-coverage-indicator", className].filter(Boolean).join(" ")} data-coverage={valid ? (complete ? "complete" : "partial") : "unknown"}>
    <Icon aria-hidden="true" /><span>{label} · {scope}</span>
  </span>;
}
