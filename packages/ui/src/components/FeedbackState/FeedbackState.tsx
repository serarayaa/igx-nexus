import { Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  label?: string;
  size?: SpinnerSize;
  className?: string;
}

export interface FeedbackStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

function stateClasses(
  base: string,
  compact: boolean,
  className?: string,
) {
  return [
    "igx-feedback-state",
    base,
    compact ? "igx-feedback-state--compact" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Spinner({
  label = "Cargando",
  size = "md",
  className,
}: SpinnerProps) {
  const classes = ["igx-spinner", `igx-spinner--${size}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} role="status" aria-label={label}>
      <LoaderCircle aria-hidden="true" />
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
}: FeedbackStateProps) {
  return (
    <div
      className={stateClasses("igx-feedback-state--empty", compact, className)}
      role="status"
    >
      <span className="igx-feedback-state__icon" aria-hidden="true">
        <Inbox />
      </span>
      <div className="igx-feedback-state__content">
        <strong className="igx-feedback-state__title">{title}</strong>
        {description ? (
          <div className="igx-feedback-state__description">{description}</div>
        ) : null}
        {action ? <div className="igx-feedback-state__action">{action}</div> : null}
      </div>
    </div>
  );
}

export function LoadingState({
  title,
  description,
  compact = false,
  className,
}: Omit<FeedbackStateProps, "action">) {
  return (
    <div
      className={stateClasses("igx-feedback-state--loading", compact, className)}
      role="status"
      aria-live="polite"
    >
      <span
        className="igx-feedback-state__icon igx-feedback-state__icon--spinning"
        aria-hidden="true"
      >
        <LoaderCircle />
      </span>
      <div className="igx-feedback-state__content">
        <strong className="igx-feedback-state__title">{title}</strong>
        {description ? (
          <div className="igx-feedback-state__description">{description}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
  compact = false,
  className,
}: FeedbackStateProps) {
  return (
    <div
      className={stateClasses("igx-feedback-state--error", compact, className)}
      role="alert"
    >
      <span className="igx-feedback-state__icon" aria-hidden="true">
        <TriangleAlert />
      </span>
      <div className="igx-feedback-state__content">
        <strong className="igx-feedback-state__title">{title}</strong>
        {description ? (
          <div className="igx-feedback-state__description">{description}</div>
        ) : null}
        {action ? <div className="igx-feedback-state__action">{action}</div> : null}
      </div>
    </div>
  );
}
