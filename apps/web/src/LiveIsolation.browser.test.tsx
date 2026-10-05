import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Asset360 } from "./Asset360";
import { AssetExplorer } from "./AssetExplorer";
import { Dashboard } from "./Dashboard";
import { LifecyclePlanning } from "./LifecyclePlanning";
import { NexusShell } from "./NexusShell";
import { RelationshipGraph } from "./RelationshipGraph";
import { demoProvider, demoSnapshot } from "./demo-provider";
import type { InventoryProvider } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(() => cleanup());

it("fails closed when AssetExplorer Live receives the Demo provider", async () => {
  render(<NexusShell mode="live" view="assets"><AssetExplorer mode="live" provider={demoProvider} /></NexusShell>);
  expect(await screen.findByText("No se pudo cargar el inventario")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Inventario de activos Live" })).toBeNull();
  expect(screen.queryByText("240 de 240 activos")).toBeNull();
});

it("fails closed when a wrapped provider returns the Demo snapshot under Live", async () => {
  const wrappedDemo: InventoryProvider = async () => demoSnapshot;
  render(<NexusShell mode="live" view="assets"><AssetExplorer mode="live" provider={wrappedDemo} /></NexusShell>);
  expect(await screen.findByText("No se pudo cargar el inventario")).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Inventario de activos Live" })).toBeNull();
});

it("fails closed across all Live inventory surfaces when given the Demo provider", async () => {
  const dashboard = render(<Dashboard mode="live" provider={demoProvider} />);
  expect(await screen.findByText("No se pudo cargar Technology Overview")).toBeTruthy();
  dashboard.unmount();

  const asset = render(
    <NexusShell mode="live" view="asset">
      <Asset360 assetId="DEMO-0002" mode="live" provider={demoProvider} />
    </NexusShell>,
  );
  expect(await screen.findByText("No se pudo cargar el activo")).toBeTruthy();
  asset.unmount();

  const lifecycle = render(
    <NexusShell mode="live" view="lifecycle">
      <LifecyclePlanning mode="live" inventoryProvider={demoProvider} />
    </NexusShell>,
  );
  expect(await screen.findByText("No se pudo calcular Lifecycle & Investment")).toBeTruthy();
  lifecycle.unmount();

  render(
    <NexusShell mode="live" view="relations">
      <RelationshipGraph assetId="DEMO-0002" mode="live" inventoryProvider={demoProvider} />
    </NexusShell>,
  );
  expect(await screen.findByText("No se pudo cargar el inventario")).toBeTruthy();
  expect(screen.queryByLabelText("Mapa visual de relaciones")).toBeNull();
});
