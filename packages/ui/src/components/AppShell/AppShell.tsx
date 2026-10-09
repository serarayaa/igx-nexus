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
  /** Desktop presentation only; mobile always uses the complete drawer. */
  navigationPresentation?: "expanded" | "rail";
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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function focusButton(container: HTMLDivElement | null) {
  container?.querySelector<HTMLButtonElement>("button")?.focus();
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => element.getAttribute("aria-hidden") !== "true"
    && element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== "hidden");
}

function focusFirstElement(container: HTMLElement | null) {
  getFocusableElements(container)[0]?.focus();
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
  navigationPresentation = "expanded",
}: AppShellProps) {
  const reactId = useId();
  const navigationId = `igx-app-navigation-${reactId}`;
  const [uncontrolledNavigationOpen, setUncontrolledNavigationOpen] =
    useState(defaultNavigationOpen);
  const isNavigationOpen =
    controlledNavigationOpen ?? uncontrolledNavigationOpen;

  const navigationRef = useRef<HTMLElement>(null);
  const openTriggerRef = useRef<HTMLDivElement>(null);
  const closeTriggerRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const wasNavigationOpenRef = useRef(false);

  const setNavigationOpen = (nextOpen: boolean) => {
    if (controlledNavigationOpen === undefined) {
      setUncontrolledNavigationOpen(nextOpen);
    }

    onNavigationOpenChange?.(nextOpen);
  };

  useEffect(() => {
    const wasNavigationOpen = wasNavigationOpenRef.current;
    wasNavigationOpenRef.current = isNavigationOpen;

    const backgroundElements = [
      skipLinkRef.current,
      headerRowRef.current,
      mainRef.current,
    ].filter((element): element is HTMLElement => element !== null);
    const previousBodyOverflow = document.body.style.overflow;

    if (isNavigationOpen) {
      // Sacar el foco del trigger antes de volver inerte su contenedor evita
      // que el navegador lo descarte hacia <body>.
      focusFirstElement(navigationRef.current);

      backgroundElements.forEach((element) => {
        element.setAttribute("inert", "");
      });
      document.body.style.overflow = "hidden";
    } else if (wasNavigationOpen) {
      if (openTriggerRef.current?.getClientRects().length) {
        focusButton(openTriggerRef.current);
      } else {
        // Desktop breakpoint hides the mobile trigger; keep focus in visible navigation.
        focusFirstElement(navigationRef.current);
      }
    }

    return () => {
      backgroundElements.forEach((element) => {
        element.removeAttribute("inert");
      });

      if (isNavigationOpen) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [isNavigationOpen]);

  useEffect(() => {
    if (!isNavigationOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setNavigationOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const navigation = navigationRef.current;
      const focusableElements = getFocusableElements(navigation);
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (!navigation || !firstFocusable || !lastFocusable) {
        return;
      }

      const activeElement = document.activeElement;

      if (!navigation.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastFocusable : firstFocusable).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isNavigationOpen]);

  return (
    <div className={joinClasses("igx-app-shell", className)} data-navigation={navigationPresentation}>
      <a
        ref={skipLinkRef}
        className="igx-app-shell__skip-link"
        href={`#${mainId}`}
      >
        {skipLinkLabel}
      </a>

      <aside
        ref={navigationRef}
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

      <div
        ref={headerRowRef}
        className="igx-app-shell__header-row"
      >
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

      <main
        ref={mainRef}
        id={mainId}
        className="igx-app-shell__main"
        tabIndex={-1}
      >
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
