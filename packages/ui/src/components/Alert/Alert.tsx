import {
  CircleCheck,
  CircleX,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type AlertTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "critical";

export type AlertAnnounce = "off" | "polite" | "assertive";

export interface AlertProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "title" | "role" | "aria-live"
  > {
  title: string;
  children?: ReactNode;
  tone?: AlertTone;
  announce?: AlertAnnounce;
}

const ALERT_ICONS: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleX,
  critical: OctagonAlert,
};

export function Alert({
  title,
  children,
  tone = "info",
  announce = "off",
  className,
  ...props
}: AlertProps) {
  const AlertIcon = ALERT_ICONS[tone];
  const classes = ["igx-alert", `igx-alert--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  const announceProps =
    announce === "polite"
      ? ({ role: "status", "aria-live": "polite" } as const)
      : announce === "assertive"
        ? ({ role: "alert", "aria-live": "assertive" } as const)
        : {};

  return (
    <div {...props} {...announceProps} className={classes}>
      <AlertIcon className="igx-alert__icon" aria-hidden="true" />
      <div className="igx-alert__content">
        <div className="igx-alert__title">{title}</div>
        {children ? <div className="igx-alert__body">{children}</div> : null}
      </div>
    </div>
  );
}
