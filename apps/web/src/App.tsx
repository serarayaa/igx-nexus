import { useEffect, useState } from "react";
import { DashboardContent } from "./Dashboard";
import { AssetExplorer } from "./AssetExplorer";
import { Asset360 } from "./Asset360";
import { NexusShell } from "./NexusShell";
import { routeFromHash, type AppRoute } from "./navigation-model";

function savedRoute(): AppRoute | null {
  const value: unknown = window.history.state?.nexusRoute;
  if (!value || typeof value !== "object" || !("view" in value)) return null;
  const route = value as Partial<AppRoute> & { view?: unknown; assetId?: unknown };
  if (route.view === "dashboard" || route.view === "assets") return { view: route.view };
  if (route.view === "asset" && typeof route.assetId === "string" && route.assetId) {
    return { view: "asset", assetId: route.assetId };
  }
  return null;
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(window.location.hash) ?? savedRoute() ?? { view: "dashboard" });

  useEffect(() => {
    const onHashChange = () => {
      const next = routeFromHash(window.location.hash) ?? savedRoute() ?? route;
      window.history.replaceState({ ...window.history.state, nexusRoute: next }, "");
      setRoute(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [route]);

  useEffect(() => {
    const title = route.view === "dashboard" ? "Panel principal" : route.view === "assets" ? "Activos" : `Asset ${route.assetId}`;
    document.title = `${title} · IGX NEXUS`;
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus();
      } else {
        document.querySelector<HTMLElement>("main")?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [route]);

  const content = route.view === "dashboard"
    ? <DashboardContent />
    : route.view === "assets"
      ? <AssetExplorer />
      : <Asset360 assetId={route.assetId} />;

  return <NexusShell view={route.view}>{content}</NexusShell>;
}
