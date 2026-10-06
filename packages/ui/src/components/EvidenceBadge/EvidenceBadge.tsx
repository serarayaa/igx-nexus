import { CircleDashed, CircleHelp, CircleSlash, Eye, GitBranch, Pencil, SlidersHorizontal, Split, type LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export type EvidenceState = "observed" | "inferred" | "manual" | "normalized" | "unknown" | "unavailable" | "partial" | "conflict";
export interface EvidenceBadgeProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  state: EvidenceState;
}
const states: Record<EvidenceState, { label: string; icon: LucideIcon }> = {
  observed: { label: "Observado", icon: Eye },
  inferred: { label: "Inferido", icon: GitBranch },
  manual: { label: "Manual", icon: Pencil },
  normalized: { label: "Normalizado", icon: SlidersHorizontal },
  unknown: { label: "Desconocido", icon: CircleHelp },
  unavailable: { label: "No disponible", icon: CircleSlash },
  partial: { label: "Evidencia parcial", icon: CircleDashed },
  conflict: { label: "Conflicto de evidencia", icon: Split },
};
export function EvidenceBadge({ state, className, ...props }: EvidenceBadgeProps) {
  const { label, icon: Icon } = states[state];
  return <span {...props} className={["igx-semantic-badge", "igx-evidence-badge", className].filter(Boolean).join(" ")} data-evidence={state}>
    <Icon aria-hidden="true" /><span>{label}</span>
  </span>;
}
