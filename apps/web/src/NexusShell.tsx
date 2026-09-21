import { useEffect, useState, type ReactNode } from "react";
import { Boxes, LayoutDashboard, Moon, ShieldCheck, SlidersHorizontal, Sun } from "lucide-react";
import { AppHeader, AppShell, AppSidebar, Badge, IconButton } from "@igx-nexus/ui";
import logo from "../../../assets/branding/igx-nexus-logo.png";
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

type NexusView = "dashboard" | "health" | "assets" | "asset" | "relations" | "label" | "qr";
type NexusDataMode = "demo" | "live";

const viewLabels: Record<NexusView, string> = {
  dashboard: "Technology Overview",
  health: "Calidad de datos",
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

  return <AppShell isNavigationOpen={navigationOpen} onNavigationOpenChange={setNavigationOpen}
    header={<AppHeader
      title={viewLabels[view]}
      context="IGX NEXUS · Innergex Chile"
      actions={<>
        <span className="nexus-shell-mode"><Badge>{modeLabel}</Badge></span>
        <IconButton variant="secondary" aria-label={theme === "light" ? "Activar tema oscuro" : "Activar tema claro"} onPress={toggleTheme}>{theme === "light" ? <Moon /> : <Sun />}</IconButton>
        <IconButton variant="secondary" aria-label={density === "comfortable" ? "Activar densidad compacta" : "Activar densidad cómoda"} onPress={toggleDensity}><SlidersHorizontal /></IconButton>
      </>}
    />}
    sidebar={<AppSidebar
      brand={<div className="nexus-brand"><img src={logo} alt="IGX NEXUS by Innergex" width="180" /><span>Technology Intelligence</span></div>}
      footer={<div className="nexus-source-context"><div><Badge>{modeLabel}</Badge><strong>{live ? "Provider Live" : "Dataset Demo"}</strong></div><p>{modeDescription}</p>{live && <p>El shell muestra sólo superficies con cobertura Live útil implementada; nunca sustituye datos Live por Demo.</p>}</div>}
    >
      <p className="nexus-nav-heading">Espacios de trabajo</p>
      <a className="nexus-nav-link" href="#overview" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><LayoutDashboard aria-hidden="true" />Overview</a>
      <a className="nexus-nav-link" href="#assets" aria-current={assetsCurrent ? "page" : undefined} onClick={() => setNavigationOpen(false)}><Boxes aria-hidden="true" />Activos</a>
      {!live && <a className="nexus-nav-link" href="#health" aria-current={view === "health" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><ShieldCheck aria-hidden="true" />Calidad de datos</a>}
    </AppSidebar>}>

    {children}
  </AppShell>;
}
