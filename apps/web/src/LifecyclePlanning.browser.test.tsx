import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import type { TechnologyAsset } from "@igx-nexus/types";
import { App } from "./App";
import { LifecyclePlanning } from "./LifecyclePlanning";
import { NexusShell } from "./NexusShell";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const ready = () => screen.findByRole("table", { name: "Hitos lifecycle que requieren revisión" });
const shell = (props: Parameters<typeof LifecyclePlanning>[0] = {}) =>
  <NexusShell view="lifecycle" mode={props.mode ?? "demo"}><LifecyclePlanning {...props} /></NexusShell>;

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("expone Lifecycle como workspace propio con horizontes 3/6/12/24 y evidencia explícita", async () => {
  window.history.replaceState(null, "", "#lifecycle");
  render(<App />);
  await ready();

  expect(document.title).toBe("Lifecycle & Investment · IGX NEXUS");
  expect(screen.getByRole("heading", { name: "Lifecycle & Investment", level: 1 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Cobertura y vencimientos", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Hitos que requieren revisión", level: 2 })).toBeTruthy();

  const nav = screen.getByRole("navigation", { name: "Navegación principal" });
  expect(within(nav).getByRole("link", { name: "Lifecycle & Investment" }).getAttribute("aria-current")).toBe("page");

  for (const months of [3, 6, 12, 24]) {
    expect(screen.getByRole("button", { name: `${months} meses` })).toBeTruthy();
  }
  expect(screen.getByRole("button", { name: "12 meses" }).getAttribute("aria-pressed")).toBe("true");
  await userEvent.click(screen.getByRole("button", { name: "3 meses" }));
  expect(screen.getByRole("button", { name: "3 meses" }).getAttribute("aria-pressed")).toBe("true");

  expect(screen.getAllByText("Garantía").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Fin de vida (EOL)").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Fin de soporte (EOS)").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Objetivo de reemplazo").length).toBeGreaterThan(0);
  expect(screen.getByText(/Investment significa planificación temporal, no presupuesto/i)).toBeTruthy();
  expect(screen.getByText(/no asigna CAPEX, precios, vida útil estándar/i)).toBeTruthy();
});

it("Live conserva coverage unavailable cuando la fuente no entrega hitos y nunca cae a Demo", async () => {
  const presentation = demoSnapshot.assets[1]!;
  const canonical = demoSnapshot.canonical!;
  const canonicalAsset = canonical.assets[1]!;
  const lifecyclePrefix = "attributes.nexus.lifecycle.";
  const liveAsset: TechnologyAsset = {
    ...canonicalAsset,
    attributes: Object.fromEntries(
      Object.entries(canonicalAsset.attributes).filter(([key]) => !key.startsWith("nexus.lifecycle.")),
    ),
    provenance: canonicalAsset.provenance.filter(record => !record.fieldPath.startsWith(lifecyclePrefix)),
  };
  const liveSnapshot: InventorySnapshot = {
    asOf: canonical.asOf,
    assets: [{ ...presentation, dataMode: "live", warrantyEnds: null }],
    canonical: {
      ...canonical,
      assets: [liveAsset],
      relationships: [],
      observations: [],
    },
  };

  render(shell({ mode: "live", inventoryProvider: async () => liveSnapshot }));
  await ready();

  expect(screen.getAllByText(/0 de 1 activos con fecha y provenance válidos/i)).toHaveLength(4);
  expect(screen.getAllByText("0 % cobertura")).toHaveLength(4);
  expect(screen.getByText("No hay hitos vencidos, dentro del horizonte o con evidencia inválida para este corte.")).toBeTruthy();
  expect(screen.getAllByText(/LIVE LAB/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/demo-v0.2/)).toBeNull();
});

it("un provider de presentación sin snapshot canónico permanece explícitamente unavailable", async () => {
  const legacy: InventoryProvider = async () => ({
    asOf: demoSnapshot.asOf,
    assets: [demoSnapshot.assets[0]!],
  });
  render(shell({ inventoryProvider: legacy }));
  expect(await screen.findByText("Sin evidencia lifecycle canónica")).toBeTruthy();
  expect(screen.getByText(/no un TechnologySnapshot canónico/i)).toBeTruthy();
  expect(screen.queryByRole("table", { name: "Hitos lifecycle que requieren revisión" })).toBeNull();
});

it("expone loading, error y retry sin publicar errores internos", async () => {
  const provider = vi.fn<InventoryProvider>()
    .mockRejectedValueOnce(new Error("TOKEN INTERNO"))
    .mockResolvedValueOnce(demoSnapshot);
  render(shell({ inventoryProvider: provider }));

  expect(screen.getByText("Calculando Lifecycle & Investment")).toBeTruthy();
  expect(await screen.findByText("No se pudo calcular Lifecycle & Investment")).toBeTruthy();
  expect(screen.queryByText("TOKEN INTERNO")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await ready();
  expect(provider).toHaveBeenCalledTimes(2);
});

it("cancela una solicitud obsoleta e ignora su respuesta tardía", async () => {
  let resolveOld!: (snapshot: InventorySnapshot) => void;
  let oldSignal!: AbortSignal;
  const old: InventoryProvider = signal => {
    oldSignal = signal;
    return new Promise(resolve => { resolveOld = resolve; });
  };
  const view = render(shell({ inventoryProvider: old }));
  await waitFor(() => expect(oldSignal).toBeDefined());

  view.rerender(shell({ inventoryProvider: async () => demoSnapshot }));
  await ready();
  expect(oldSignal.aborted).toBe(true);

  resolveOld({ asOf: demoSnapshot.asOf, assets: [] });
  await waitFor(() => expect(screen.queryByText("El inventario está vacío")).toBeNull());
});

it("pasa axe y reflow en desktop y 320 px, light/dark", async () => {
  const { container } = render(shell());
  await ready();

  for (const width of [1440, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) {
        await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      }
      const result = await axe.run(container, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
      });
      expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  }
}, 30000);
