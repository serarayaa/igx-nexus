import {
  CircleCheck,
  CircleMinus,
  CircleX,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type StatusBadgeStatus =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical";

export interface StatusBadgeProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children: ReactNode;
  status: StatusBadgeStatus;
}

const STATUS_ICONS: Record<StatusBadgeStatus, LucideIcon> = {
  neutral: CircleMinus,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  critical: OctagonAlert,
};

export function StatusBadge({
  children,
  status,
  className,
  ...props
}: StatusBadgeProps) {
  const StatusIcon = STATUS_ICONS[status];
  const classes = [
    "igx-status-badge",
    `igx-status-badge--${status}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span {...props} className={classes}>
      <StatusIcon className="igx-status-badge__icon" aria-hidden="true" />
      <span className="igx-status-badge__label">{children}</span>
    </span>
  );
}
