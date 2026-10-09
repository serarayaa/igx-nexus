import { useId, type ReactNode } from "react";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface ContentSectionProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  className?: string;
  /** Distinguishes regions with repeated headings without changing heading text. */
  ariaLabel?: string;
}

export interface ToolbarProps {
  ariaLabel: string;
  primary?: ReactNode;
  secondary?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  const classes = ["igx-page-header", className].filter(Boolean).join(" ");

  return (
    <header className={classes}>
      <div className="igx-page-header__content">
        {eyebrow !== undefined ? (
          <div className="igx-page-header__eyebrow">{eyebrow}</div>
        ) : null}
        <h1 className="igx-page-header__title">{title}</h1>
        {description !== undefined ? (
          <div className="igx-page-header__description">{description}</div>
        ) : null}
        {meta !== undefined ? (
          <div className="igx-page-header__meta">{meta}</div>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="igx-page-header__actions">{actions}</div>
      ) : null}
    </header>
  );
}

export function ContentSection({
  children,
  title,
  description,
  actions,
  headingLevel = 2,
  className,
  ariaLabel,
}: ContentSectionProps) {
  const headingId = useId();
  const classes = ["igx-content-section", className]
    .filter(Boolean)
    .join(" ");
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <section
      className={classes}
      {...(ariaLabel ? { "aria-label": ariaLabel } : title !== undefined ? { "aria-labelledby": headingId } : {})}
    >
      {title !== undefined || description !== undefined || actions !== undefined ? (
        <div className="igx-content-section__header">
          <div className="igx-content-section__heading-group">
            {title !== undefined ? (
              <Heading id={headingId} className="igx-content-section__title">
                {title}
              </Heading>
            ) : null}
            {description !== undefined ? (
              <div className="igx-content-section__description">
                {description}
              </div>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="igx-content-section__actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className="igx-content-section__body">{children}</div>
    </section>
  );
}

export function Toolbar({
  ariaLabel,
  primary,
  secondary,
  className,
}: ToolbarProps) {
  const classes = ["igx-toolbar", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="group" aria-label={ariaLabel}>
      {primary !== undefined ? (
        <div className="igx-toolbar__primary">{primary}</div>
      ) : null}
      {secondary !== undefined ? (
        <div className="igx-toolbar__secondary">{secondary}</div>
      ) : null}
    </div>
  );
}
