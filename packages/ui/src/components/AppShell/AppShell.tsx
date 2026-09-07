import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Menu, X } from "lucide-react";

import { IconButton } from "../IconButton/IconButton.js";

export interface AppShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
  mainId?: string;
  skipLinkLabel?: string;
  openNavigationLabel?: string;
  closeNavigationLabel?: string;
  isNavigationOpen?: boolean;
  defaultNavigationOpen?: boolean;
  onNavigationOpenChange?: (isOpen: boolean) => void;
}

export interface AppHeaderProps {
  title: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface AppSidebarProps {
  children: ReactNode;
  brand?: ReactNode;
  footer?: ReactNode;
  navigationLabel?: string;
  className?: string;
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function focusButton(container: HTMLDivElement | null) {
  container?.querySelector<HTMLButtonElement>("button")?.focus();
}

export function AppShell({
  header,
  sidebar,
  children,
  className,
  mainId = "igx-main-content",
  skipLinkLabel = "Saltar al contenido principal",
  openNavigationLabel = "Abrir navegación",
  closeNavigationLabel = "Cerrar navegación",
  isNavigationOpen: controlledNavigationOpen,
  defaultNavigationOpen = false,
  onNavigationOpenChange,
}: AppShellProps) {
  const reactId = useId();
  const navigationId = `igx-app-navigation-${reactId}`;
  const [uncontrolledNavigationOpen, setUncontrolledNavigationOpen] =
    useState(defaultNavigationOpen);
  const isNavigationOpen =
    controlledNavigationOpen ?? uncontrolledNavigationOpen;

  const openTriggerRef = useRef<HTMLDivElement>(null);
  const closeTriggerRef = useRef<HTMLDivElement>(null);
  const wasNavigationOpenRef = useRef(false);

  const setNavigationOpen = (nextOpen: boolean) => {
    if (controlledNavigationOpen === undefined) {
      setUncontrolledNavigationOpen(nextOpen);
    }

    onNavigationOpenChange?.(nextOpen);
  };

  useEffect(() => {
    if (isNavigationOpen) {
      focusButton(closeTriggerRef.current);
    } else if (wasNavigationOpenRef.current) {
      focusButton(openTriggerRef.current);
    }

    wasNavigationOpenRef.current = isNavigationOpen;
  }, [isNavigationOpen]);

  useEffect(() => {
    if (!isNavigationOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavigationOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isNavigationOpen]);

  return (
    <div className={joinClasses("igx-app-shell", className)}>
      <a className="igx-app-shell__skip-link" href={`#${mainId}`}>
        {skipLinkLabel}
      </a>

      <aside
        id={navigationId}
        className="igx-app-shell__navigation"
        data-open={isNavigationOpen ? "true" : "false"}
      >
        <div
          className="igx-app-shell__navigation-close"
          ref={closeTriggerRef}
        >
          <IconButton
            aria-label={closeNavigationLabel}
            variant="secondary"
            onPress={() => setNavigationOpen(false)}
          >
            <X />
          </IconButton>
        </div>
        {sidebar}
      </aside>

      <div
        className="igx-app-shell__scrim"
        data-open={isNavigationOpen ? "true" : "false"}
        aria-hidden="true"
        onClick={() => setNavigationOpen(false)}
      />

      <div className="igx-app-shell__header-row">
        <div className="igx-app-shell__navigation-open" ref={openTriggerRef}>
          <IconButton
            aria-label={openNavigationLabel}
            aria-controls={navigationId}
            aria-expanded={isNavigationOpen}
            variant="secondary"
            onPress={() => setNavigationOpen(true)}
          >
            <Menu />
          </IconButton>
        </div>
        {header}
      </div>

      <main id={mainId} className="igx-app-shell__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

export function AppHeader({
  title,
  context,
  actions,
  className,
}: AppHeaderProps) {
  return (
    <header className={joinClasses("igx-app-header", className)}>
      <div className="igx-app-header__identity">
        {context ? (
          <div className="igx-app-header__context">{context}</div>
        ) : null}
        <div className="igx-app-header__title">{title}</div>
      </div>
      {actions ? <div className="igx-app-header__actions">{actions}</div> : null}
    </header>
  );
}

export function AppSidebar({
  children,
  brand,
  footer,
  navigationLabel = "Navegación principal",
  className,
}: AppSidebarProps) {
  return (
    <div className={joinClasses("igx-app-sidebar", className)}>
      {brand ? <div className="igx-app-sidebar__brand">{brand}</div> : null}
      <nav className="igx-app-sidebar__nav" aria-label={navigationLabel}>
        {children}
      </nav>
      {footer ? <div className="igx-app-sidebar__footer">{footer}</div> : null}
    </div>
  );
}
