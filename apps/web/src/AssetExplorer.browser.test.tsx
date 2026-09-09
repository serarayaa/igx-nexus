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

it("combina filtros, muestra los activos y permite quitar cada filtro", async () => {
  mount(); await ready(); filter("Dominio", "OT"); filter("Estado", "assigned");
  const expected = demoSnapshot.assets.filter(a => a.domain === "OT" && a.lifecycle === "assigned").length;
  expect(screen.getByText(`${expected} de 240 activos`)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Quitar filtro Dominio: OT" }));
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Dominio" }));
  expect((screen.getByRole("combobox", { name: "Estado" }) as HTMLSelectElement).value).toBe("assigned");
  await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
  expect(screen.getByText("240 de 240 activos")).toBeTruthy();
});

it("recupera búsqueda y filtros sin coincidencias", async () => {
  mount(); await ready(); filter("Dominio", "OT"); filter("Tipo", "Phone");
  expect(screen.getByText("No hay activos que coincidan")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer búsqueda y filtros" }));
  await ready(); expect(document.activeElement).toBe(screen.getByRole("searchbox"));
  await search("imposible-sin-coincidencias");
  expect(screen.getByText("0 de 240 activos")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" })); await ready();
});

it("opera filtros adicionales con teclado y recupera foco al quitar uno cerrado", async () => {
  mount(); await ready();
  const disclosure = screen.getByText("Más filtros", { selector: "summary" });
  disclosure.focus(); await userEvent.keyboard("{Enter}");
  await userEvent.tab();
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Fabricante" }));
  await userEvent.keyboard("{Home}{ArrowDown}");
  await userEvent.tab();
  expect((screen.getByRole("combobox", { name: "Fabricante" }) as HTMLSelectElement).value).toBe("Fabricante Demo A");
  filter("Criticidad", "yes"); filter("Frescura", "fresh");
  const expected = demoSnapshot.assets.filter(a => a.manufacturer === "Fabricante Demo A" && a.critical && a.lastSeen && (Date.parse(demoSnapshot.asOf) - Date.parse(a.lastSeen)) / 86400000 <= 7).length;
  expect(screen.getByText(`${expected} de 240 activos`)).toBeTruthy();
  await userEvent.click(screen.getByText("Más filtros · con filtros activos", { selector: "summary" }));
  await userEvent.click(screen.getByRole("button", { name: "Quitar filtro Criticidad: Críticos" }));
  expect(document.activeElement).toBe(screen.getByRole("combobox", { name: "Criticidad" }));
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
  expect(first()).toContain("Desktop Demo 0002");
  screen.getByRole("button", { name: "Activo" }).focus();
  await userEvent.keyboard("{Enter}");
  expect(first()).toContain("Teléfono Demo 0238");
  await userEvent.keyboard(" ");
  expect(first()).toContain("Desktop Demo 0002");
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

it("navega Dashboard → Activos con teclado, conserva tema y funciona el skip link", async () => {
  render(<App />); await screen.findByRole("heading", { name: "Panel principal", level: 1 });
  await userEvent.click(screen.getByRole("button", { name: "Activar tema oscuro" }));
  screen.getByRole("link", { name: "Activos" }).focus(); await userEvent.keyboard("{Enter}");
  await ready();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Explorador de activos" })));
  expect(document.documentElement.dataset.theme).toBe("dark");
  screen.getByRole("link", { name: "Saltar al contenido principal" }).focus(); await userEvent.keyboard("{Enter}");
  expect(screen.getByRole("heading", { name: "Explorador de activos" })).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("main"));
  await userEvent.click(screen.getByRole("link", { name: "Panel principal" }));
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
  await userEvent.click(screen.getByRole("link", { name: "Panel principal" }));
  await screen.findByRole("heading", { name: "Panel principal", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Panel principal", level: 1 })));
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(false);
});
