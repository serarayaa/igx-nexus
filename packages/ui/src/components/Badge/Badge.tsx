import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type BadgeTone = "neutral" | "accent";

export interface BadgeProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children: ReactNode;
  tone?: BadgeTone;
}

export function Badge({
  children,
  tone = "neutral",
  className,
  ...props
}: BadgeProps) {
  const classes = [
    "igx-badge",
    `igx-badge--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span {...props} className={classes}>
      {children}
    </span>
  );
}
