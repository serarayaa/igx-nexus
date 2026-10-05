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

const ready = () => screen.findByRole("heading", { name: "Technology Map", level: 1 });

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("resuelve deep link, comparte scope por URL, selecciona nodos y permite reenfocar", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/relations?depth=1&type=depends_on");
  render(<App />);
  await ready();
  expect(document.title).toContain("Technology Map DEMO-0002");
  expect(screen.getByText("1 relación visible")).toBeTruthy();
  expect((screen.getByRole("combobox", { name: "Profundidad" }) as HTMLSelectElement).value).toBe("1");
  expect((screen.getByRole("combobox", { name: "Tipo de relación" }) as HTMLSelectElement).value).toBe("depends_on");

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Profundidad" }), "2");
  await waitFor(() => expect(window.location.hash).toContain("type=depends_on"));
  await waitFor(() => expect(window.location.hash).not.toContain("depth=1"));

  await userEvent.click(screen.getByRole("button", { name: "Switch Demo 0003" }));
  await waitFor(() => expect(window.location.hash).toContain("selected=DEMO-0003"));
  const selection = screen.getByRole("region", { name: "Switch Demo 0003" });
  expect(within(selection).getByText("Dispositivo de red", { exact: false })).toBeTruthy();
  expect(within(selection).getByRole("link", { name: "Abrir Asset 360" }).getAttribute("href")).toBe("#assets/DEMO-0003");
  await userEvent.click(within(selection).getByRole("button", { name: "Enfocar este CI" }));
  expect(await screen.findByText(/Scope centrado en Switch Demo 0003/)).toBeTruthy();
});

it("ofrece vista semántica equivalente y filtros sin lenguaje causal", async () => {
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" /></NexusShell>);
  await ready();
  const accessible = screen.getByRole("region", { name: "Relaciones en formato semántico" });
  expect(within(accessible).getByText("Dependencias upstream")).toBeTruthy();
  expect(within(accessible).getByText("Relaciones de segundo nivel")).toBeTruthy();
  expect(screen.getByText(/no demuestra causalidad ni blast radius/i)).toBeTruthy();

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo de relación" }), "uses");
  expect(await screen.findByText("1 relación visible")).toBeTruthy();
  expect(within(accessible).getByText("Desktop Demo 0002", { exact: false })).toBeTruthy();

  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Perspectiva" }), "downstream");
  expect(await screen.findByText("Sin relaciones para estos filtros")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
  expect(await screen.findByText("5 relaciones visibles")).toBeTruthy();
});

it("mantiene identidad cuando falla la cobertura relacional y permite retry", async () => {
  const provider = vi.fn<RelationshipProvider>().mockRejectedValueOnce(new Error("secreto")).mockResolvedValueOnce(demoRelationshipSnapshot);
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={provider} /></NexusShell>);
  await ready();
  expect(await screen.findByText("No se pudo cargar la cobertura relacional")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Desktop Demo 0002" })).toBeTruthy();
  expect(screen.queryByText("secreto")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar relaciones" }));
  expect(await screen.findByText("5 relaciones visibles")).toBeTruthy();
  expect(provider).toHaveBeenCalledTimes(2);
});

it("maneja activo inexistente, inventario vacío y ausencia real de relaciones", async () => {
  const view = render(<NexusShell view="relations"><RelationshipGraph assetId="NO-EXISTE" /></NexusShell>);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();

  view.rerender(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" inventoryProvider={async () => ({ ...demoSnapshot, assets: [] })} /></NexusShell>);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();

  view.rerender(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={async () => ({ ...demoRelationshipSnapshot, relationships: [] })} /></NexusShell>);
  await ready();
  expect(await screen.findByText("Sin relaciones registradas")).toBeTruthy();
});

it("Live comparte la IA sin caer a fixtures Demo", async () => {
  const liveSnapshot = {
    ...demoSnapshot,
    assets: demoSnapshot.assets.map(asset => ({ ...asset, dataMode: "live" as const })),
  };
  render(<NexusShell view="relations" mode="live"><RelationshipGraph assetId="DEMO-0002" mode="live" inventoryProvider={async () => liveSnapshot} /></NexusShell>);
  await ready();
  expect(screen.getByText("Relaciones no disponibles en este provider")).toBeTruthy();
  expect(screen.getByText(/No se usan fixtures Demo como fallback/)).toBeTruthy();
  expect(screen.queryByLabelText("Mapa visual de relaciones")).toBeNull();
});

it("comunica endpoints incompletos y no crea enlaces falsos", async () => {
  const incomplete: RelationshipProvider = async () => ({
    ...demoRelationshipSnapshot,
    relationships: [{ ...demoRelationshipSnapshot.relationships[0]!, id: "MISSING", targetId: "DEMO-MISSING" }],
  });
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={incomplete} /></NexusShell>);
  await ready();
  expect(screen.getByText("Referencias fuera del inventario disponible")).toBeTruthy();
  const list = screen.getByRole("region", { name: "Relaciones en formato semántico" });
  expect(within(list).getByText("DEMO-MISSING")).toBeTruthy();
  expect(within(list).queryByRole("link", { name: /CI no disponible/ })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: /CI no disponible DEMO-MISSING/ }));
  expect(screen.getByRole("region", { name: "CI no disponible" })).toBeTruthy();
});

it("expone fuente y fecha desconocida sin inventar freshness relacional", async () => {
  const unknownDate: RelationshipProvider = async () => ({
    ...demoRelationshipSnapshot,
    relationships: [{ ...demoRelationshipSnapshot.relationships[0]!, observedAt: null }],
  });
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" relationshipProvider={unknownDate} /></NexusShell>);
  await ready();
  const list = screen.getByRole("region", { name: "Relaciones en formato semántico" });
  expect(within(list).getByText("Fuente: demo")).toBeTruthy();
  expect(within(list).getByText("Observada: Sin fecha verificable")).toBeTruthy();
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

it("permite recorrer y activar nodos con teclado sin perder foco", async () => {
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" /></NexusShell>);
  await ready();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Technology Map", level: 1 })));
  const node = screen.getByRole("button", { name: "Switch Demo 0003" });
  node.focus();
  await userEvent.keyboard("{Enter}");
  await waitFor(() => expect(node.getAttribute("aria-pressed")).toBe("true"));
  expect(document.activeElement).toBe(node);
});

it("recorta las aristas antes de los centros de los nodos", async () => {
  render(<NexusShell view="relations"><RelationshipGraph assetId="DEMO-0002" /></NexusShell>);
  await ready();
  const edge = document.querySelector<SVGLineElement>('[data-relationship-id="DEMO-REL-001"]');
  expect(edge).not.toBeNull();
  expect([edge?.getAttribute("x1"), edge?.getAttribute("y1")]).not.toEqual(["50", "50"]);
  expect([edge?.getAttribute("x2"), edge?.getAttribute("y2")]).not.toEqual(["50", "14"]);
  expect(edge?.getAttribute("marker-end")).toBe("url(#relationship-arrow)");
});
