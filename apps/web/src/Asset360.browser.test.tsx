import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { Asset360 } from "./Asset360";
import { NexusShell } from "./NexusShell";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const assetHeading = () => screen.findByRole("heading", { name: "Desktop Demo 0002", level: 1 });
const explorerTable = () => screen.findByRole("table", { name: "Inventario de activos demo" });

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("abre un deep link y muestra identidad, contexto y calidad del registro", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  render(<App />);
  await assetHeading();

  expect(screen.getByText("DEMO-0002")).toBeTruthy();
  const assignment = screen.getByRole("region", { name: "Asignación y ubicación" });
  expect(within(assignment).getByText("Responsable Demo 2")).toBeTruthy();
  expect(within(assignment).getByText("Oficina Demo Centro")).toBeTruthy();
  expect(screen.getByText("Fabricante Demo A")).toBeTruthy();
  expect(screen.getByText("Modelo Demo Escritorio 2")).toBeTruthy();
  expect(screen.getByText("SYNTH-SN-000002")).toBeTruthy();

  const lifecycle = screen.getByRole("region", { name: "Estado y ciclo de vida" });
  expect(within(lifecycle).getByText("Activo en inventario")).toBeTruthy();
  const warranty = screen.getByRole("region", { name: "Garantía" });
  expect(within(warranty).getByText("Vencida")).toBeTruthy();
  const quality = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(quality).findByText("Confiable")).toBeTruthy();
  const source = screen.getByRole("region", { name: "Fuente de datos" });
  expect(within(source).getByText("Dataset sintético / provider demo")).toBeTruthy();

  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Abrir grafo de relaciones" }).getAttribute("href")).toBe("#assets/DEMO-0002/relations");
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Desktop Demo 0002", level: 1 })));
});

it("presenta datos parciales sin inventar información", async () => {
  render(<NexusShell view="asset"><Asset360 assetId="DEMO-0001" /></NexusShell>);
  await screen.findByRole("heading", { name: "Notebook Demo 0001", level: 1 });

  const identity = screen.getByRole("region", { name: "Identidad" });
  expect(within(identity).getAllByText("No informado")).toHaveLength(1);
  const assignment = screen.getByRole("region", { name: "Asignación y ubicación" });
  expect(within(assignment).getAllByText("No informado")).toHaveLength(2);
  const warranty = screen.getByRole("region", { name: "Garantía" });
  expect(within(warranty).getByText("Desconocida")).toBeTruthy();
  const quality = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(quality).findByText("Observación desconocida")).toBeTruthy();
  expect(within(quality).getByText("Falta responsable")).toBeTruthy();
  expect(within(quality).getByText("Falta ubicación")).toBeTruthy();
  expect(within(quality).getByText("Falta serial")).toBeTruthy();
});

it("muestra un activo Live sin inventar Health, QR ni relaciones", async () => {
  const liveSnapshot: InventorySnapshot = {
    asOf: "2026-09-15T16:00:00.000Z",
    assets: [{
      id: "NXS-LAB",
      name: "LAB-ENDPOINT",
      type: "Computer",
      domain: "IT",
      lifecycle: "unknown",
      critical: false,
      criticality: "unknown",
      owner: null,
      location: null,
      lastSeen: "2026-09-15T15:58:00.000Z",
      warrantyEnds: null,
      hostname: null,
      serial: "SERIAL-TEST",
      assetTag: null,
      manufacturer: "Vendor",
      model: "Model",
      ipAddress: null,
      dataMode: "live",
      sourceSystems: ["glpi"],
      sourceObservedAt: "2026-09-15T15:59:00.000Z",
    }],
  };
  const provider: InventoryProvider = async () => liveSnapshot;

  render(<NexusShell view="asset"><Asset360 assetId="NXS-LAB" provider={provider} /></NexusShell>);
  await screen.findByRole("heading", { name: "LAB-ENDPOINT", level: 1 });

  expect(screen.getByText("ASSET 360 · INNERGEX CHILE · LIVE")).toBeTruthy();
  const lifecycle = screen.getByRole("region", { name: "Estado y ciclo de vida" });
  expect(within(lifecycle).getByText("No determinada por la fuente")).toBeTruthy();
  expect(within(lifecycle).getByText("Criticidad Desconocida")).toBeTruthy();

  const source = screen.getByRole("region", { name: "Fuente y evidencia" });
  expect(within(source).getByText("glpi")).toBeTruthy();
  expect(within(source).getByText(/Web consume exclusivamente NEXUS API/)).toBeTruthy();

  expect(screen.queryByRole("region", { name: "CMDB Health" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Etiqueta y QR" })).toBeNull();
  const relations = screen.getByRole("region", { name: "Relaciones" });
  expect(within(relations).getByText("Sin evidencia live todavía")).toBeTruthy();
  expect(within(relations).queryByRole("link", { name: "Abrir grafo de relaciones" })).toBeNull();
});

it("navega Explorer → Asset 360 → Explorer y respeta Atrás/Adelante", async () => {
  window.history.replaceState(null, "", "#assets");
  render(<App />);
  await explorerTable();

  await userEvent.click(screen.getByRole("link", { name: "Desktop Demo 0002" }));
  await assetHeading();
  expect(window.location.hash).toBe("#assets/DEMO-0002");

  window.history.back();
  await explorerTable();
  window.history.forward();
  await assetHeading();
});

it("maneja un activo inexistente y permite volver al inventario", async () => {
  window.history.replaceState(null, "", "#assets/NO-EXISTE");
  render(<App />);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Volver al inventario" }));
  await explorerTable();
});

it("muestra error y permite reintentar sin filtrar detalles internos", async () => {
  const provider = vi.fn<InventoryProvider>()
    .mockRejectedValueOnce(new Error("backend secreto"))
    .mockResolvedValueOnce(demoSnapshot);
  render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);

  expect(await screen.findByText("No se pudo cargar el activo")).toBeTruthy();
  expect(screen.queryByText("backend secreto")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await assetHeading();
  expect(provider).toHaveBeenCalledTimes(2);
});

it("maneja inventario vacío y cancela la carga al desmontar", async () => {
  let capturedSignal: AbortSignal | undefined;
  const empty: InventorySnapshot = { asOf: demoSnapshot.asOf, assets: [] };
  const provider: InventoryProvider = async (signal) => {
    capturedSignal = signal;
    return empty;
  };
  const rendered = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);
  expect(await screen.findByText("El inventario está vacío")).toBeTruthy();
  rendered.unmount();
  expect(capturedSignal?.aborted).toBe(true);
});

it("descarta una respuesta obsoleta al cambiar rápidamente de activo", async () => {
  const resolvers: Array<(snapshot: InventorySnapshot) => void> = [];
  const provider: InventoryProvider = () => new Promise((resolve) => resolvers.push(resolve));
  const rendered = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0001" provider={provider} /></NexusShell>);
  await waitFor(() => expect(resolvers).toHaveLength(1));
  rendered.rerender(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);
  await waitFor(() => expect(resolvers).toHaveLength(2));

  resolvers[0]!(demoSnapshot);
  resolvers[1]!(demoSnapshot);
  await assetHeading();
  expect(screen.queryByRole("heading", { name: "Notebook Demo 0001", level: 1 })).toBeNull();
});

it("pasa axe y no desborda en light/dark y ambas densidades", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  const { container } = render(<App />);
  await assetHeading();
  for (const width of [1440, 768, 390, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      for (const density of ["comfortable", "compact"]) {
        if (document.documentElement.dataset.density !== density) await userEvent.click(screen.getByRole("button", { name: density === "compact" ? "Activar densidad compacta" : "Activar densidad cómoda" }));
        const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
        expect(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      }
    }
  }
}, 60000);
