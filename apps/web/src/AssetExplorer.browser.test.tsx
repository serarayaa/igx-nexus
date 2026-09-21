import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { AssetExplorer } from "./AssetExplorer";
import { NexusShell } from "./NexusShell";
import { App } from "./App";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => { cleanup(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });
const ready = () => screen.findByRole("table", { name: "Inventario de activos demo" });
const mount = (provider?: InventoryProvider) => render(<NexusShell view="assets"><AssetExplorer {...(provider ? { provider } : {})} /></NexusShell>);
const search = (value: string) => page.getByRole("searchbox", { name: "Buscar activos" }).fill(value);
const filter = (name: string, value: string) => fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });

it("busca por serial, revela identidad técnica y limpia manteniendo el foco", async () => {
  mount(); await ready(); await search("  synth-sn-000002  ");
  expect(screen.getByText("1 de 240 activos")).toBeTruthy();
  expect(within(await ready()).getAllByRole("row")).toHaveLength(2);
  await userEvent.click(screen.getByRole("checkbox", { name: "Mostrar identificación técnica" }));
  expect(screen.getByText("SYNTH-SN-000002")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
  expect(screen.getByText("240 de 240 activos")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("searchbox"));
});

it("combina Domain, Class, Role y Lifecycle y permite quitar cada faceta", async () => {
  mount(); await ready();
  filter("Dominio", "OT");
  filter("Clase", "operator_interface");
  filter("Rol", "supervision");
  filter("Lifecycle", "assigned");
  const expected = demoSnapshot.assets.filter(asset =>
    asset.domain === "OT" &&
    asset.assetClass === "operator_interface" &&
    asset.role === "supervision" &&
    asset.lifecycle === "assigned").length;
  expect(screen.getByText(`${expected} de 240 activos`)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Quitar filtro Dominio: OT" }));
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Dominio" }));
  expect((screen.getByRole("combobox", { name: "Clase" }) as HTMLSelectElement).value).toBe("operator_interface");
  await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(screen.getByText("240 de 240 activos")).toBeTruthy();
});

it("recupera búsqueda y filtros sin coincidencias", async () => {
  mount(); await ready();
  filter("Dominio", "OT");
  await userEvent.click(screen.getByText("Más filtros", { selector: "summary" }));
  filter("Tipo de inventario", "Phone");
  expect(screen.getByText("No hay activos que coincidan")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer búsqueda y filtros" }));
  await ready(); expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  await search("imposible-sin-coincidencias");
  expect(screen.getByText("0 de 240 activos")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" })); await ready();
});

it("opera facetas de fuente/taxonomía con teclado, counts y recuperación de foco", async () => {
  mount(); await ready();
  const disclosure = screen.getByText("Más filtros", { selector: "summary" });
  disclosure.focus();
  await userEvent.keyboard("{Enter}");
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Fuente" }));
  expect(screen.getByRole("option", { name: /DEMO \(240\)/ })).toBeTruthy();
  filter("Fuente", "demo");
  filter("Estado taxonómico", "classified");
  filter("Revisión requerida", "no");
  filter("Criticidad", "critical");
  const expected = demoSnapshot.assets.filter(asset => asset.criticality === "critical").length;
  expect(screen.getByText(`${expected} de 240 activos`)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Quitar filtro Criticidad: Crítica" }));
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Criticidad" }));
});


it("expone cobertura canónica y permite buscar por clase, rol y fuente", async () => {
  mount(); await ready();
  expect(screen.getByRole("heading", { name: "Cobertura de investigación", level: 2 })).toBeTruthy();
  expect(screen.getByText("Domain · Class · Role")).toBeTruthy();
  await search("operator interface supervision demo");
  const expected = demoSnapshot.assets.filter(asset => asset.assetClass === "operator_interface" && asset.role === "supervision").length;
  expect(screen.getByText(`${expected} de 240 activos`)).toBeTruthy();
});

it("pagina, anuncia el rango y vuelve a la primera página al buscar, filtrar u ordenar", async () => {
  mount(); await ready();
  await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(screen.getByText(/Mostrando 26–50/)).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByText("240 de 240 activos").parentElement);
  filter("Dominio", "IT");
  expect(screen.getByRole("button", { name: "Página 1, página actual" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Página siguiente" })); await search("demo");
  expect(screen.getByRole("button", { name: "Página 1, página actual" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  await userEvent.click(screen.getByRole("button", { name: "Activo" }));
  expect(screen.getByRole("columnheader", { name: "Activo" }).getAttribute("aria-sort")).toBe("descending");
  expect(screen.getByRole("button", { name: "Página 1, página actual" })).toBeTruthy();
  filter("Activos por página", "50");
  expect(within(await ready()).getAllByRole("row")).toHaveLength(51);
});

it("ordena realmente las filas mediante teclado y conserva aria-sort", async () => {
  mount(); const table = await ready();
  const first = () => within(table).getAllByRole("rowheader")[0]!.textContent;
  expect(first()).toContain("Consola Demo Laboratorio Norte");
  screen.getByRole("button", { name: "Activo" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(first()).toContain("Teléfono Demo Reserva");
  await userEvent.keyboard(" ");
  expect(first()).toContain("Consola Demo Laboratorio Norte");
  expect(screen.getByRole("columnheader", { name: "Activo" }).getAttribute("aria-sort")).toBe("ascending");
});

it("expone loading, error y retry sin revelar detalles internos", async () => {
  let reject!: (reason: Error) => void;
  const provider = vi.fn<InventoryProvider>().mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; })).mockResolvedValue(demoSnapshot);
  mount(provider); expect(screen.getByText("Cargando inventario de activos")).toBeTruthy();
  await waitFor(() => expect(provider).toHaveBeenCalledOnce());
  await act(async () => reject(new Error("secreto interno")));
  await screen.findByRole("alert"); expect(screen.queryByText("secreto interno")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" })); await ready();
  expect(provider).toHaveBeenCalledTimes(2);
});

it("maneja dataset vacío y recarga", async () => {
  const provider = vi.fn<InventoryProvider>().mockResolvedValueOnce({ ...demoSnapshot, assets: [] }).mockResolvedValue(demoSnapshot);
  mount(provider); await screen.findByText("El inventario está vacío");
  expect(screen.queryByRole("searchbox")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Volver a cargar" })); await ready();
});

it("cancela, ignora respuestas obsoletas y aborta al desmontar", async () => {
  let resolveOld!: (snapshot: InventorySnapshot) => void;
  let signal!: AbortSignal;
  const old: InventoryProvider = value => { signal = value; return new Promise(resolve => { resolveOld = resolve; }); };
  const view = render(<AssetExplorer provider={old} />);
  await waitFor(() => expect(signal).toBeDefined());
  view.rerender(<AssetExplorer provider={async () => demoSnapshot} />); await ready();
  expect(signal.aborted).toBe(true);
  await act(async () => resolveOld({ ...demoSnapshot, assets: [] }));
  expect(screen.queryByText("El inventario está vacío")).toBeNull();
  view.rerender(<AssetExplorer provider={old} />);
  await waitFor(() => expect(signal.aborted).toBe(false));
  view.unmount(); expect(signal.aborted).toBe(true);
  await act(async () => resolveOld(demoSnapshot));
});


it("mantiene Live honesto cuando la taxonomía usa compatibility fallback", async () => {
  const provider: InventoryProvider = async () => ({
    asOf: "2026-09-21T12:00:00.000Z",
    assets: [{
      id: "NEXUS-LIVE-1",
      name: "Endpoint Live Lab",
      type: "Computer",
      domain: "IT",
      lifecycle: "unknown",
      critical: false,
      criticality: "unknown",
      owner: null,
      location: "Live Lab",
      lastSeen: null,
      warrantyEnds: null,
      hostname: "live-lab-01",
      serial: "LIVE-SERIAL-1",
      assetTag: null,
      manufacturer: "Vendor",
      model: "Model",
      ipAddress: null,
      dataMode: "live",
      assetClass: "endpoint",
      role: "user_endpoint",
      taxonomyState: "unclassified",
      taxonomyReviewRequired: true,
      taxonomyCompatibilityFallback: true,
      sourceSystems: ["glpi"],
      sourceObservedAt: "2026-09-21T11:55:00.000Z",
    }],
  });

  render(<NexusShell mode="live" view="assets"><AssetExplorer mode="live" provider={provider} /></NexusShell>);
  await screen.findByRole("table", { name: "Inventario de activos Live" });
  expect(screen.getByText(/1 activo usa una proyección escalar de compatibilidad/)).toBeTruthy();
  const liveTable = screen.getByRole("table", { name: "Inventario de activos Live" });
  expect(within(liveTable).getByText("Proyección de compatibilidad")).toBeTruthy();
  expect(screen.getByText("Sin cobertura del provider")).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "Contexto operacional" })).toBeNull();
  await userEvent.click(screen.getByText("Más filtros", { selector: "summary" }));
  filter("Fuente", "glpi");
  filter("Estado taxonómico", "unclassified");
  expect(screen.getByText("1 de 1 activos")).toBeTruthy();
});

it("pasa axe light/dark y comfortable/compact a 1440, 768 y 320 px con detalles", async () => {
  const { container } = mount(); await ready();
  await userEvent.click(screen.getByRole("checkbox", { name: "Mostrar identificación técnica" }));
  await userEvent.click(screen.getByText("Más filtros", { selector: "summary" }));
  for (const width of [1440, 768, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      for (const density of ["comfortable", "compact"]) {
        if (document.documentElement.dataset.density !== density) await userEvent.click(screen.getByRole("button", { name: density === "compact" ? "Activar densidad compacta" : "Activar densidad cómoda" }));
        const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
        expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      }
    }
  }
}, 60000);

it("navega Overview → Activos con teclado, conserva tema y funciona el skip link", async () => {
  render(<App />); await screen.findByRole("heading", { name: "Technology Overview", level: 1 });
  await userEvent.click(screen.getByRole("button", { name: "Activar tema oscuro" }));
  screen.getByRole("link", { name: "Activos" }).focus(); await userEvent.keyboard("{Enter}");
  await ready();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Explorador de activos" })));
  expect(document.documentElement.dataset.theme).toBe("dark");
  screen.getByRole("link", { name: "Saltar al contenido principal" }).focus(); await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("heading", { name: "Explorador de activos" })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("main"));
  await userEvent.click(screen.getByRole("link", { name: "Overview" }));
  await screen.findByRole("table", { name: "Próximos vencimientos de garantía" });
  window.history.back();
  await ready();
  window.history.forward();
  await screen.findByRole("table", { name: "Próximos vencimientos de garantía" });
});

it("abre un enlace directo y navega desde el drawer sin perder el foco", async () => {
  window.history.replaceState(null, "", "#assets"); await page.viewport(390, 844);
  render(<App />); await ready();
  await userEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar navegación" })));
  await userEvent.click(screen.getByRole("link", { name: "Overview" }));
  await screen.findByRole("heading", { name: "Technology Overview", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Technology Overview", level: 1 })));
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(false);
});
