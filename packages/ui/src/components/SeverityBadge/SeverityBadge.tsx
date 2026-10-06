import { CircleCheck, CircleX, Clock, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export type SeverityState = "healthy" | "attention" | "degraded" | "critical" | "stale";
export interface SeverityBadgeProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** A condition already determined by a source; never derived from coverage. */
  state: SeverityState;
}
const states: Record<SeverityState, { label: string; icon: LucideIcon }> = {
  healthy: { label: "Saludable", icon: CircleCheck },
  attention: { label: "Requiere atención", icon: TriangleAlert },
  degraded: { label: "Degradado", icon: CircleX },
  critical: { label: "Crítico", icon: OctagonAlert },
  stale: { label: "Desactualizado", icon: Clock },
};
export function SeverityBadge({ state, className, ...props }: SeverityBadgeProps) {
  const { label, icon: Icon } = states[state];
  return <span {...props} className={["igx-semantic-badge", "igx-severity-badge", className].filter(Boolean).join(" ")} data-severity={state}>
    <Icon aria-hidden="true" /><span>{label}</span>
  </span>;
}
