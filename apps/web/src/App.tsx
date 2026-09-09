import { useEffect, useState } from "react";
import { DashboardContent } from "./Dashboard";
import { AssetExplorer } from "./AssetExplorer";
import { NexusShell } from "./NexusShell";

type View = "dashboard" | "assets";
function savedView(): View | null {
  const value: unknown = window.history.state?.nexusView;
  return value === "assets" || value === "dashboard" ? value : null;
}
function viewFromHash(hash: string): View | null {
  if (hash === "#assets") return "assets";
  if (["", "#overview", "#quality", "#lifecycle", "#next-views"].includes(hash)) return "dashboard";
  // Anclas como el skip link no cambian la vista actual.
  return null;
}
export function App() {
  const [view, setView] = useState<View>(() => viewFromHash(window.location.hash) ?? savedView() ?? "dashboard");
  useEffect(() => {
    const onHashChange = () => {
      const next = viewFromHash(window.location.hash) ?? savedView() ?? view;
      // Recordar la vista de las anclas internas permite Atrás/Adelante tras el skip link.
      window.history.replaceState({ nexusView: next }, "");
      setView(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [view]);
  useEffect(() => {
    document.title = `${view === "assets" ? "Activos" : "Panel principal"} · IGX NEXUS`;
    // Después del commit y de la restauración del drawer, anunciar la vista nueva.
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [view]);
  return <NexusShell view={view}>{view === "assets" ? <AssetExplorer /> : <DashboardContent />}</NexusShell>;
}
