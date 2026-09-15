import { useEffect, useState } from "react";
import { DashboardContent } from "./Dashboard";
import { AssetExplorer } from "./AssetExplorer";
import { Asset360 } from "./Asset360";
import { DemoQrResolver } from "./DemoQrResolver";
import { LabelDesigner } from "./LabelDesigner";
import { RelationshipGraph } from "./RelationshipGraph";
import { CmdbHealth } from "./CmdbHealth";
import { NexusShell } from "./NexusShell";
import { demoProvider } from "./demo-provider";
import { liveProvider } from "./live-provider";
import type { InventoryProvider } from "./asset-model";
import { routeFromHash, type AppRoute } from "./navigation-model";

function configuredInventoryProvider(): { mode: "demo" | "live"; provider: InventoryProvider } {
  const mode = import.meta.env.VITE_NEXUS_DATA_MODE?.trim() || "demo";
  if (mode === "demo") return { mode, provider: demoProvider };
  if (mode === "live") return { mode, provider: liveProvider };
  throw new Error("VITE_NEXUS_DATA_MODE must be demo or live");
}

const inventory = configuredInventoryProvider();

function savedRoute(): AppRoute | null {
  const value: unknown = window.history.state?.nexusRoute;
  if (!value || typeof value !== "object" || !("view" in value)) return null;
  const route = value as Partial<AppRoute> & { view?: unknown; assetId?: unknown; locator?: unknown };
  if (route.view === "dashboard" || route.view === "assets" || route.view === "health") return { view: route.view };
  if ((route.view === "asset" || route.view === "label" || route.view === "relations") && typeof route.assetId === "string" && route.assetId) {
    return { view: route.view, assetId: route.assetId };
  }
  if (route.view === "qr" && typeof route.locator === "string" && route.locator) {
    return { view: "qr", locator: route.locator };
  }
  return null;
}

function routeTitle(route: AppRoute): string {
  if (route.view === "dashboard") return "Panel principal";
  if (route.view === "health") return "CMDB Health";
  if (route.view === "assets") return "Activos";
  if (route.view === "asset") return `Asset ${route.assetId}`;
  if (route.view === "label") return `Etiqueta ${route.assetId}`;
  if (route.view === "relations") return `Relaciones ${route.assetId}`;
  return "Resolver QR demo";
}

export function App() {
  const defaultRoute: AppRoute = inventory.mode === "live" ? { view: "assets" } : { view: "dashboard" };
  const [route, setRoute] = useState<AppRoute>(() => routeFromHash(window.location.hash) ?? savedRoute() ?? defaultRoute);

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
    document.title = `${routeTitle(route)} · IGX NEXUS`;
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
    : route.view === "health"
      ? <CmdbHealth />
    : route.view === "assets"
      ? <AssetExplorer provider={inventory.provider} mode={inventory.mode} />
      : route.view === "asset"
        ? <Asset360 assetId={route.assetId} provider={inventory.provider} />
        : route.view === "relations"
          ? <RelationshipGraph assetId={route.assetId} />
        : route.view === "label"
          ? <LabelDesigner assetId={route.assetId} />
          : <DemoQrResolver locator={route.locator} />;

  return <NexusShell view={route.view}>{content}</NexusShell>;
}
