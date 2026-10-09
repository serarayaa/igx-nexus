import { useEffect, useState, type ReactNode } from "react";
import { Boxes, CalendarClock, LayoutDashboard, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck, SlidersHorizontal, Sun } from "lucide-react";
import { AppHeader, AppShell, AppSidebar, Badge, IconButton } from "@igx-nexus/ui";
import mark from "../../../assets/branding/refinements/shell-3/mark-b.svg?raw";
import "./shell.css";
import {
  NAVIGATION_STORAGE_KEY,
  readNavigationPreference,
  DENSITY_STORAGE_KEY,
  THEME_STORAGE_KEY,
  persistPreference,
  readDensityPreference,
  readThemePreference,
  resolveInitialDensity,
  resolveInitialTheme,
  type NexusDensity,
  type NexusTheme,
  type PreferenceStorage,
} from "./shell-preferences";

type NexusView = "dashboard" | "health" | "lifecycle" | "assets" | "asset" | "relations" | "label" | "qr";
type NexusDataMode = "demo" | "live";

const viewLabels: Record<NexusView, string> = {
  dashboard: "Technology Overview",
  health: "Calidad de datos",
  lifecycle: "Lifecycle & Investment",
  assets: "Activos",
  asset: "Asset 360",
  relations: "Technology Map",
  label: "Etiqueta de activo",
  qr: "Resolver QR demo",
};

function browserStorage(): PreferenceStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

export function NexusShell({ children, view = "dashboard", mode = "demo" }: { children: ReactNode; view?: NexusView; mode?: NexusDataMode }) {
  const [theme, setTheme] = useState<NexusTheme>(() => resolveInitialTheme(readThemePreference(browserStorage()), systemPrefersDark()));
  const [density, setDensity] = useState<NexusDensity>(() => resolveInitialDensity(readDensityPreference(browserStorage())));
  const [presentation, setPresentation] = useState(() => readNavigationPreference(browserStorage()));
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => { setNavigationOpen(false); }, [view]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
    document.documentElement.style.colorScheme = theme;
  }, [theme, density]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) setNavigationOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const toggleTheme = () => {
    setTheme(current => {
      const next: NexusTheme = current === "light" ? "dark" : "light";
      persistPreference(browserStorage(), THEME_STORAGE_KEY, next);
      return next;
    });
  };

  const toggleDensity = () => {
    setDensity(current => {
      const next: NexusDensity = current === "comfortable" ? "compact" : "comfortable";
      persistPreference(browserStorage(), DENSITY_STORAGE_KEY, next);
      return next;
    });
  };

  const assetsCurrent = view === "assets" || view === "asset" || view === "relations" || view === "label" || view === "qr";
  const live = mode === "live";
  const modeLabel = live ? "LIVE LAB" : "DEMO";
  const modeDescription = live
    ? "Datos servidos por NEXUS API desde el provider Live configurado."
    : "Datos sintéticos. Sin conexión a fuentes corporativas.";

  return <AppShell className="nexus-shell-3" navigationPresentation={presentation} isNavigationOpen={navigationOpen} onNavigationOpenChange={setNavigationOpen}
    header={<AppHeader
      title={<span className="nexus-workspace-context"><span className="nexus-workspace-label">Workspace</span><span className="nexus-workspace-name">{viewLabels[view]}</span><span key={view} className="nexus-workspace-signal" aria-hidden="true" /></span>}
      context={<span className="nexus-header-product"><span className="nexus-header-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark }} /><strong>NEXUS</strong><span className="nexus-header-scope">Technology Intelligence · Chile</span></span>}
      actions={<>
        <span className="nexus-shell-mode"><Badge>{modeLabel}</Badge></span>
        <IconButton variant="secondary" aria-label={theme === "light" ? "Activar tema oscuro" : "Activar tema claro"} onPress={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</IconButton>
        <IconButton variant="secondary" aria-label={density === "comfortable" ? "Activar densidad compacta" : "Activar densidad cómoda"} onPress={toggleDensity}><SlidersHorizontal /></IconButton>
      </>}
    />}
    sidebar={<AppSidebar
      brand={<div className="nexus-brand">
        <a className="nexus-brand-home" href="#overview" aria-label="IGX NEXUS, inicio" onClick={() => setNavigationOpen(false)}>
          <span className="nexus-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mark }} />
          <span className="nexus-brand-lockup"><strong>IGX NEXUS</strong><span>by Innergex</span></span>
        </a>
        <div className="nexus-rail-toggle"><IconButton variant="secondary"
          aria-label={presentation === "expanded" ? "Contraer navegación" : "Expandir navegación"}
          aria-expanded={presentation === "expanded"}
          onPress={() => setPresentation(current => {
            const next = current === "expanded" ? "rail" : "expanded";
            persistPreference(browserStorage(), NAVIGATION_STORAGE_KEY, next);
            return next;
          })}>{presentation === "expanded" ? <PanelLeftClose /> : <PanelLeftOpen />}</IconButton></div>
      </div>}
      footer={<div className="nexus-source-context"><div><Badge>{modeLabel}</Badge><strong>{live ? "Provider Live" : "Dataset Demo"}</strong></div><p>{modeDescription}</p>{live && <p>El shell muestra sólo superficies con cobertura Live útil implementada; nunca sustituye datos Live por Demo.</p>}</div>}
    >
      <p className="nexus-nav-heading">Espacios de trabajo</p>
      <a className="nexus-nav-link" title="Overview" href="#overview" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><LayoutDashboard aria-hidden="true" /><span className="nexus-nav-label">Overview</span></a>
      <a className="nexus-nav-link" title="Activos" href="#assets" aria-current={assetsCurrent ? "page" : undefined} onClick={() => setNavigationOpen(false)}><Boxes aria-hidden="true" /><span className="nexus-nav-label">Activos</span></a>
      <a className="nexus-nav-link" title="Lifecycle & Investment" href="#lifecycle" aria-current={view === "lifecycle" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><CalendarClock aria-hidden="true" /><span className="nexus-nav-label">Lifecycle &amp; Investment</span></a>
      {!live && <a className="nexus-nav-link" title="Calidad de datos" href="#health" aria-current={view === "health" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><ShieldCheck aria-hidden="true" /><span className="nexus-nav-label">Calidad de datos</span></a>}
    </AppSidebar>}>

    {children}
  </AppShell>;
}
