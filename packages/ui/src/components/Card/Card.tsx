import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type CardVariant = "base" | "muted" | "elevated";
export type CardPadding = "sm" | "md" | "lg";

export interface CardProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
}

export function Card({
  children,
  variant = "base",
  padding = "md",
  className,
  ...props
}: CardProps) {
  const classes = [
    "igx-card",
    `igx-card--${variant}`,
    `igx-card--padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classes}>
      {children}
    </div>
  );
}
