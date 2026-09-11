import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { Dashboard } from "./Dashboard";
import { demoSnapshot } from "./demo-provider";
import type { DashboardProvider, DashboardSnapshot } from "./dashboard-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => { cleanup(); await page.viewport(1440, 1000); });
const ready = () => screen.findByRole("table", { name: "Próximos vencimientos de garantía" });

it("filtra IT/OT y cambia tema y densidad con controles accesibles", async () => {
  render(<Dashboard />); await ready();
  await userEvent.click(screen.getByRole("button", { name: "OT" }));
  expect(screen.getByRole("button", { name: "OT" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("41 activos en el alcance OT.")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Activar tema oscuro" }));
  await userEvent.click(screen.getByRole("button", { name: "Activar densidad compacta" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.dataset.density).toBe("compact");
});

it("expone loading, error y recuperación sin filtrar mensajes internos", async () => {
  let reject!: (reason: Error) => void;
  const provider = vi.fn<DashboardProvider>().mockImplementationOnce(() => new Promise<DashboardSnapshot>((_, fail) => { reject = fail; })).mockResolvedValue(demoSnapshot);
  render(<Dashboard provider={provider} />);
  expect(screen.getByText("Cargando resumen de activos")).toBeTruthy();
  await waitFor(() => expect(provider).toHaveBeenCalledOnce());
  reject(new Error("detalle interno no publicable"));
  await screen.findByRole("alert");
  expect(screen.queryByText("detalle interno no publicable")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await ready(); expect(provider).toHaveBeenCalledTimes(2);
});

it("muestra estado vacío y permite salir de un filtro sin resultados", async () => {
  render(<Dashboard provider={async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.filter(a => a.domain === "IT") })} />);
  await ready(); await userEvent.click(screen.getByRole("button", { name: "OT" }));
  await screen.findByText("No hay activos para este alcance");
  expect(screen.queryByRole("table")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Ver todos los activos" }));
  await ready();
});

it("cancela solicitudes anteriores e ignora respuestas fuera de orden", async () => {
  let resolveOld!: (snapshot: DashboardSnapshot) => void;
  let oldSignal!: AbortSignal;
  const old: DashboardProvider = signal => { oldSignal = signal; return new Promise(resolve => { resolveOld = resolve; }); };
  const view = render(<Dashboard provider={old} />);
  await waitFor(() => expect(oldSignal).toBeDefined());
  view.rerender(<Dashboard provider={async () => demoSnapshot} />);
  await ready(); expect(oldSignal.aborted).toBe(true);
  resolveOld({ ...demoSnapshot, assets: [] });
  await waitFor(() => expect(screen.queryByText("No hay activos para este alcance")).toBeNull());
});

it("expone un recorrido de demo sobre capacidades ya integradas", async () => {
  render(<Dashboard />); await ready();
  expect(screen.getAllByText("Recorrido de la demo").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole("link", { name: "Explorar activos" }).getAttribute("href")).toBe("#assets");
  expect(screen.getByRole("link", { name: "Asset 360° hero OT" }).getAttribute("href")).toBe("#assets/DEMO-0013");
  expect(screen.getByRole("link", { name: "QR y etiquetado" }).getAttribute("href")).toBe("#assets/DEMO-0013/label");
  expect(screen.getByRole("link", { name: "Technology Map" }).getAttribute("href")).toBe("#assets/DEMO-0013/relations");
  expect(screen.getAllByRole("link", { name: "CMDB Health" }).some(link => link.getAttribute("href") === "#health")).toBe(true);
  expect(screen.getByText("Locator opaco")).toBeTruthy();
  expect(screen.getByText("Calidad explicable")).toBeTruthy();
  expect(screen.queryByText("CMDB-009 · integrado")).toBeNull();
});

it("pasa axe en light/dark y no desborda el viewport móvil", async () => {
  const { container } = render(<Dashboard />); await ready();
  for (const width of [1440, 768, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
      expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  }
}, 30000);

it("navega con teclado y libera el fondo al pasar del drawer móvil a escritorio", async () => {
  await page.viewport(390, 844); render(<Dashboard />); await ready();
  const open = screen.getByRole("button", { name: "Abrir navegación" });
  await userEvent.click(open);
  const close = await screen.findByRole("button", { name: "Cerrar navegación" });
  await waitFor(() => expect(document.activeElement).toBe(close));
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(open));
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(false);
  await userEvent.click(open); await page.viewport(1440, 1000);
  await waitFor(() => expect(screen.getByRole("main").hasAttribute("inert")).toBe(false));
});
