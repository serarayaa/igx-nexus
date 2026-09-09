import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { RelationshipGraph } from "./RelationshipGraph";
import { NexusShell } from "./NexusShell";
import { demoRelationshipSnapshot } from "./demo-relationship-provider";
import { demoSnapshot } from "./demo-provider";
import type { RelationshipProvider } from "./relationship-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const ready = () => screen.findByRole("heading", { name: "Grafo de Relaciones", level: 1 });

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("resuelve el deep link, selecciona nodos y navega en ambas direcciones", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/relations");
  render(<App />);
  await ready();
  expect(document.title).toContain("Relaciones DEMO-0002");
  expect(screen.getByText("5 relaciones visibles")).toBeTruthy();
  const visual = screen.getByLabelText("Mapa visual de relaciones");
  await userEvent.click(within(visual).getByRole("button", { name: "Switch Demo 0003" }));
  const selection = screen.getByRole("region", { name: "Switch Demo 0003" });
  expect(within(selection).getByText("4 relaciones visibles para el nodo seleccionado.")).toBeTruthy();
  expect(within(selection).getByRole("link", { name: "Abrir Asset 360" }).getAttribute("href")).toBe("#assets/DEMO-0003");
  await userEvent.click(within(selection).getByRole("link", { name: "Enfocar este CI" }));
  expect(await screen.findByText(/Mapa centrado en Switch Demo 0003/)).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Switch Demo 0003" }));
  expect(await screen.findByRole("heading", { name: "Switch Demo 0003", level: 1 })).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Abrir grafo de relaciones" }));
  await ready();
});

it("ofrece lista semántica equivalente y filtros de valor", async () => {
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" /></NexusShell>);
  await ready();
  const accessible = screen.getByRole("region", { name: "Relaciones en formato accesible" });
  expect(within(accessible).getByText("Dependencia upstream")).toBeTruthy();
  expect(within(accessible).getByText("Relaciones de segundo nivel")).toBeTruthy();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo de relación" }), "uses");
  expect(screen.getByText("1 relación visible")).toBeTruthy();
  expect(within(accessible).getByText("Desktop Demo 0002", { exact: false })).toBeTruthy();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Dirección" }), "downstream");
  expect(await screen.findByText("Sin relaciones para estos filtros")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
  expect(await screen.findByText("5 relaciones visibles")).toBeTruthy();
});

it("maneja error, retry, activo inexistente, inventario vacío y activo sin relaciones", async () => {
  const provider = vi.fn<RelationshipProvider>().mockRejectedValueOnce(new Error("secreto")).mockResolvedValueOnce(demoRelationshipSnapshot);
  const view = render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={provider} /></NexusShell>);
  expect(await screen.findByText("No se pudo cargar el mapa")).toBeTruthy();
  expect(screen.queryByText("secreto")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await ready();
  expect(provider).toHaveBeenCalledTimes(2);

  view.rerender(<NexusShell view="relations"><RelationshipGraph assetId="NO-EXISTE" /></NexusShell>);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();
  view.rerender(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" inventoryProvider={async () => ({ ...demoSnapshot, assets: [] })} /></NexusShell>);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();
  view.rerender(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={async () => ({ ...demoRelationshipSnapshot, relationships: [] })} /></NexusShell>);
  expect(await screen.findByText("Activo sin relaciones")).toBeTruthy();
});

it("comunica referencias incompletas y no crea enlaces falsos", async () => {
  const incomplete: RelationshipProvider = async () => ({ ...demoRelationshipSnapshot, relationships: [{ ...demoRelationshipSnapshot.relationships[0]!, id: "MISSING", targetId: "DEMO-MISSING" }] });
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={incomplete} /></NexusShell>);
  await ready();
  expect(screen.getByText("Relaciones incompletas")).toBeTruthy();
  const list = screen.getByRole("region", { name: "Relaciones en formato accesible" });
  expect(within(list).getByText("DEMO-MISSING")).toBeTruthy();
  expect(within(list).queryByRole("link", { name: /CI no disponible/ })).toBeNull();
});

it("pasa axe y evita overflow en desktop, tablet y móvil con ambos temas", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/relations");
  const { container } = render(<App />);
  await ready();
  for (const width of [1440, 768, 390, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
      expect(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  }
}, 60000);

it("permite recorrer y activar nodos con teclado", async () => {
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" /></NexusShell>);
  await ready();
  const node = screen.getByRole("button", { name: "Switch Demo 0003" });
  node.focus();
  await userEvent.keyboard("{Enter}");
  await waitFor(() => expect(node.getAttribute("aria-pressed")).toBe("true"));
  expect(document.activeElement).toBe(node);
});
