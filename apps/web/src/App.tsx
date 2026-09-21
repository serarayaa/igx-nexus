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
import { demoRelationshipInventoryProvider } from "./demo-relationship-provider";
import type { InventoryProvider } from "./asset-model";
import { assetSectionHash, routeFromHash, type AppRoute, type AssetSection } from "./navigation-model";

type InventoryMode = "demo" | "live";

function configuredInventoryProvider(): { mode: InventoryMode; provider: InventoryProvider } {
  const mode = import.meta.env.VITE_NEXUS_DATA_MODE?.trim() || "demo";
  if (mode === "demo") return { mode, provider: demoProvider };
  if (mode === "live") return { mode, provider: liveProvider };
  throw new Error("VITE_NEXUS_DATA_MODE must be demo or live");
}

const inventory = configuredInventoryProvider();

function savedRoute(): AppRoute | null {
  const value: unknown = window.history.state?.nexusRoute;
  if (!value || typeof value !== "object" || !("view" in value)) return null;
  const route = value as Partial<AppRoute> & { view?: unknown; assetId?: unknown; locator?: unknown; section?: unknown };
  if (route.view === "dashboard" || route.view === "assets" || route.view === "health") return { view: route.view };
  if (route.view === "asset" && typeof route.assetId === "string" && route.assetId) {
    const section: AssetSection = route.section === "inventory" || route.section === "evidence" || route.section === "relationships"
      ? route.section
      : "summary";
    return { view: "asset", assetId: route.assetId, section };
  }
  if ((route.view === "label" || route.view === "relations") && typeof route.assetId === "string" && route.assetId) {
    return { view: route.view, assetId: route.assetId };
  }
  if (route.view === "qr" && typeof route.locator === "string" && route.locator) {
    return { view: "qr", locator: route.locator };
  }
  return null;
}

function normalizeRouteForMode(route: AppRoute | null, mode: InventoryMode): AppRoute {
  if (mode === "demo") return route ?? { view: "dashboard" };
  if (route?.view === "dashboard" || route?.view === "asset" || route?.view === "assets") return route;
  return { view: "dashboard" };
}

function routeTitle(route: AppRoute): string {
  if (route.view === "dashboard") return "Technology Overview";
  if (route.view === "health") return "CMDB Health";
  if (route.view === "assets") return "Activos";
  if (route.view === "asset") return `Asset ${route.assetId}`;
  if (route.view === "label") return `Etiqueta ${route.assetId}`;
  if (route.view === "relations") return `Relaciones ${route.assetId}`;
  return "Resolver QR demo";
}

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => normalizeRouteForMode(
    routeFromHash(window.location.hash) ?? savedRoute(),
    inventory.mode,
  ));

  useEffect(() => {
    const onHashChange = () => {
      const parsed = routeFromHash(window.location.hash) ?? savedRoute() ?? route;
      const next = normalizeRouteForMode(parsed, inventory.mode);
      window.history.replaceState({ ...window.history.state, nexusRoute: next }, "");
      setRoute(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [route]);

  useEffect(() => {
    if (inventory.mode !== "live") return;
    const expectedHash = route.view === "asset"
      ? assetSectionHash(route.assetId, route.section)
      : route.view === "assets" ? "#assets" : "#overview";
    if (window.location.hash !== expectedHash) {
      window.history.replaceState({ ...window.history.state, nexusRoute: route }, "", expectedHash);
    }
  }, [route]);

  useEffect(() => {
    document.title = `${routeTitle(route)} · IGX NEXUS`;
    // Asset 360 gestiona su propio foco para distinguir cambios de CI y de sección contextual.
    if (route.view === "asset") return;
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
    ? <DashboardContent provider={inventory.provider} mode={inventory.mode} />
    : route.view === "health"
      ? <CmdbHealth />
    : route.view === "assets"
      ? <AssetExplorer provider={inventory.provider} mode={inventory.mode} />
      : route.view === "asset"
        ? <Asset360
            assetId={route.assetId}
            section={route.section}
            mode={inventory.mode}
            provider={inventory.provider}
            {...(inventory.mode === "demo" ? { relationshipProvider: demoRelationshipInventoryProvider } : {})}
          />
        : route.view === "relations"
          ? <RelationshipGraph assetId={route.assetId} />
        : route.view === "label"
          ? <LabelDesigner assetId={route.assetId} />
          : <DemoQrResolver locator={route.locator} />;

  return <NexusShell view={route.view} mode={inventory.mode}>{content}</NexusShell>;
}
