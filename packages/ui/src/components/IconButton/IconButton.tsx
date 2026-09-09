import type { ReactNode } from "react";

import {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "../Button/Button.js";

export interface IconButtonProps
  extends Omit<ButtonProps, "aria-label" | "children"> {
  "aria-label": string;
  children: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function IconButton({
  children,
  className,
  ...props
}: IconButtonProps) {
  const classes = ["igx-icon-button", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Button {...props} className={classes}>
      <span className="igx-icon-button__icon" aria-hidden="true">
        {children}
      </span>
    </Button>
  );
}
