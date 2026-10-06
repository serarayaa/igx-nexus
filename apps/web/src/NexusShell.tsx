import { useEffect, useState, type ReactNode } from "react";
import { Boxes, CalendarClock, LayoutDashboard, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck, SlidersHorizontal, Sun } from "lucide-react";
import { ApplicationMark, AppHeader, AppShell, AppSidebar, Badge, IconButton } from "@igx-nexus/ui";
import { assetReturnHash, buildInvestigationLink } from "./navigation-state";
import { useInvestigationNavigation } from "./use-investigation-navigation";
import "./shell-v3.css";
import {
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return browserStorage()?.getItem("igx-nexus:navigation-collapsed") === "true"; } catch { return false; }
  });
  const investigation = useInvestigationNavigation();
  const assetsHref = view === "assets" ? investigation.canonicalHash
    : view === "asset" ? assetReturnHash(window.location.hash) ?? buildInvestigationLink({})
    : buildInvestigationLink({});

  useEffect(() => { setNavigationOpen(false); }, [view]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
    document.documentElement.style.colorScheme = theme;
  }, [theme, density]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
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

  const toggleCollapsed = () => setCollapsed(current => {
    persistPreference(browserStorage(), "igx-nexus:navigation-collapsed", String(!current));
    return !current;
  });

  return <AppShell className="nexus-shell-v3" isNavigationCollapsed={collapsed} isNavigationOpen={navigationOpen} onNavigationOpenChange={setNavigationOpen}
    header={<AppHeader
      title={viewLabels[view]}
      context={<><span className="nexus-mobile-identity"><ApplicationMark size={16} />IGX NEXUS <span>by Innergex</span></span><span className="nexus-desktop-context">{assetsCurrent ? "Tecnología" : view === "dashboard" ? "Monitor" : "Operaciones"}</span></>}
      actions={<>
        <span className="nexus-shell-mode" title={modeDescription}><Badge>{modeLabel}</Badge><span className="nexus-mode-detail">{live ? "Fuente configurada" : "Datos sintéticos"}</span></span>
        <IconButton variant="secondary" aria-label={theme === "light" ? "Activar tema oscuro" : "Activar tema claro"} onPress={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</IconButton>
        <IconButton variant="secondary" aria-label={density === "comfortable" ? "Activar densidad compacta" : "Activar densidad cómoda"} onPress={toggleDensity}><SlidersHorizontal /></IconButton>
      </>}
    />}
    sidebar={<AppSidebar
      brand={<a href="#overview" className="nexus-brand" aria-label="IGX NEXUS, inicio"><ApplicationMark size={32} /><span className="nexus-brand-wordmark"><strong>IGX NEXUS</strong><span>by Innergex</span></span></a>}
      footer={<div className="nexus-source-context"><div><Badge>{modeLabel}</Badge><strong>{live ? "Provider Live" : "Dataset Demo"}</strong></div><p>{modeDescription}</p>{live && <p>El shell muestra sólo superficies con cobertura Live útil implementada; nunca sustituye datos Live por Demo.</p>}</div>}
    >
      <p className="nexus-nav-heading">Espacios de trabajo</p>
      <a className="nexus-nav-link" href="#overview" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><LayoutDashboard aria-hidden="true" />Overview</a>
      <p className="nexus-nav-heading nexus-nav-group">Tecnología</p>
      <a className="nexus-nav-link" href={assetsHref} aria-current={assetsCurrent ? "page" : undefined} onClick={() => setNavigationOpen(false)}><Boxes aria-hidden="true" />Activos</a>
      <p className="nexus-nav-heading nexus-nav-group">Operaciones</p>
      <a className="nexus-nav-link" href="#lifecycle" aria-current={view === "lifecycle" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><CalendarClock aria-hidden="true" />Lifecycle &amp; Investment</a>
      {!live && <a className="nexus-nav-link" href="#health" aria-current={view === "health" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><ShieldCheck aria-hidden="true" />Calidad de datos</a>}
      <div className="nexus-collapse-control"><IconButton aria-label={collapsed ? "Expandir navegación" : "Reducir navegación"} aria-pressed={collapsed} variant="secondary" onPress={toggleCollapsed}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</IconButton></div>
    </AppSidebar>}>

    {children}
  </AppShell>;
}
