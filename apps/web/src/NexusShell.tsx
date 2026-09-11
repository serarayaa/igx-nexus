import { useEffect, useState, type ReactNode } from "react";
import { Boxes, CalendarClock, LayoutDashboard, Moon, Network, ShieldCheck, SlidersHorizontal, Sun } from "lucide-react";
import { AppHeader, AppShell, AppSidebar, Badge, IconButton } from "@igx-nexus/ui";
import logo from "../../../assets/branding/igx-nexus-logo.png";

type NexusView = "dashboard" | "health" | "assets" | "asset" | "relations" | "label" | "qr";

export function NexusShell({ children, view = "dashboard" }: { children: ReactNode; view?: NexusView }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => { setNavigationOpen(false); }, [view]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = density;
  }, [theme, density]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => { if (desktop.matches) setNavigationOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  const assetsCurrent = view === "assets" || view === "asset" || view === "relations" || view === "label" || view === "qr";

  return <AppShell isNavigationOpen={navigationOpen} onNavigationOpenChange={setNavigationOpen}
    header={<AppHeader title="The Technology Map" context="Innergex Chile" actions={<>
      <IconButton variant="secondary" aria-label={theme === "light" ? "Activar tema oscuro" : "Activar tema claro"} onPress={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon /> : <Sun />}</IconButton>
      <IconButton variant="secondary" aria-label={density === "comfortable" ? "Activar densidad compacta" : "Activar densidad cómoda"} onPress={() => setDensity(density === "comfortable" ? "compact" : "comfortable")}><SlidersHorizontal /></IconButton>
    </>} />}
    sidebar={<AppSidebar brand={<div className="nexus-brand"><img src={logo} alt="IGX NEXUS by Innergex" width="180" /><span>Inteligencia de activos</span></div>} footer={<><Badge>Demo local</Badge><p>Datos sintéticos. Sin conexión a fuentes corporativas.</p></>}>
      <a className="nexus-nav-link" href="#overview" aria-current={view === "dashboard" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><LayoutDashboard aria-hidden="true" />Panel principal</a>
      <a className="nexus-nav-link" href="#assets" aria-current={assetsCurrent ? "page" : undefined} onClick={() => setNavigationOpen(false)}><Boxes aria-hidden="true" />Activos</a>
      <a className="nexus-nav-link" href="#health" aria-current={view === "health" ? "page" : undefined} onClick={() => setNavigationOpen(false)}><ShieldCheck aria-hidden="true" />CMDB Health</a>
      {view === "dashboard" && <><p className="nexus-nav-heading">En este panel</p>
      <a className="nexus-nav-link" href="#quality" onClick={() => setNavigationOpen(false)}><ShieldCheck aria-hidden="true" />Calidad y frescura</a>
      <a className="nexus-nav-link" href="#lifecycle" onClick={() => setNavigationOpen(false)}><CalendarClock aria-hidden="true" />Garantías y lifecycle</a>
      <a className="nexus-nav-link" href="#next-views" onClick={() => setNavigationOpen(false)}><Network aria-hidden="true" />Recorrido de la demo</a>
      </>}
    </AppSidebar>}>

    {children}
  </AppShell>;
}
