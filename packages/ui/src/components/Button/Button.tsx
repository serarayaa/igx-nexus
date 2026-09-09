import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";

export type ButtonVariant = "primary" | "secondary";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<AriaButtonProps, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const classes = [
    "igx-button",
    `igx-button--${variant}`,
    `igx-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <AriaButton {...props} className={classes} />;
}
