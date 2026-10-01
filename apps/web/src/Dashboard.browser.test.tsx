import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { Dashboard } from "./Dashboard";
import { demoSnapshot } from "./demo-provider";
import type { DashboardProvider, DashboardSnapshot } from "./dashboard-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => { cleanup(); await page.viewport(1440, 1000); });
const ready = () => screen.findByRole("table", { name: "Próximos vencimientos de garantía" });

it("prioriza atención, mantiene el alcance IT/OT y conserva preferencias del shell", async () => {
  render(<Dashboard />); await ready();
  expect(screen.getByRole("heading", { name: "Technology Overview", level: 1 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Requiere atención", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Estado resumido", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "IT / OT Intelligence", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Endpoint Experience", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Proactive Findings", level: 2 })).toBeTruthy();
  expect(screen.getByText("240 de 240")).toBeTruthy();
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
  expect(screen.getByText("Cargando Technology Overview")).toBeTruthy();
  await waitFor(() => expect(provider).toHaveBeenCalledOnce());
  reject(new Error("detalle interno no publicable"));
  await screen.findByRole("alert");
  expect(screen.queryByText("detalle interno no publicable")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await ready(); expect(provider).toHaveBeenCalledTimes(2);
});

it("distingue inventario vacío de un filtro sin resultados", async () => {
  render(<Dashboard provider={async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.filter(a => a.domain === "IT") })} />);
  await ready(); await userEvent.click(screen.getByRole("button", { name: "OT" }));
  await screen.findByText("No hay activos para este alcance");
  expect(screen.queryByRole("table")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Ver todos los activos" }));
  await ready();

  cleanup();
  render(<Dashboard provider={async () => ({ ...demoSnapshot, assets: [] })} />);
  await screen.findByText("El inventario está vacío");
  expect(screen.getByRole("button", { name: "Volver a cargar" })).toBeTruthy();
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
  await waitFor(() => expect(screen.queryByText("El inventario está vacío")).toBeNull());
});

it("reemplaza el recorrido promocional por drill-downs operacionales existentes", async () => {
  render(<Dashboard />); await ready();
  expect(screen.queryByText("Recorrido de la demo")).toBeNull();
  expect(screen.getByRole("link", { name: /Explorar activos/ }).getAttribute("href")).toBe("#assets");
  expect(screen.getAllByRole("link", { name: /Lifecycle & Investment/ }).some(link => link.getAttribute("href") === "#lifecycle")).toBe(true);
  expect(screen.getByRole("link", { name: /^Calidad de datos$/ }).getAttribute("href")).toBe("#health");
  expect(screen.queryByRole("link", { name: "Technology Map" })).toBeNull();
  expect(screen.getByText(/No constituyen un risk score/)).toBeTruthy();
});

it("no asigna una compatibility projection a una cohorte IT/OT cuando Taxonomy v2 está unresolved", async () => {
  const presentation = demoSnapshot.assets[0]!;
  const canonical = demoSnapshot.canonical!;
  const canonicalAsset = canonical.assets[0]!;
  const liveSnapshot: DashboardSnapshot = {
    asOf: canonical.asOf,
    assets: [{ ...presentation, domain: "IT" }],
    canonical: {
      ...canonical,
      assets: [{
        ...canonicalAsset,
        domain: "IT",
        taxonomy: {
          ...canonicalAsset.taxonomy!,
          domain: {
            state: "unclassified",
            reviewRequired: true,
            ruleId: "test.compatibility-only",
            reasonCode: "no-domain-evidence",
          },
        },
      }],
      relationships: [],
      observations: [],
    },
  };

  render(<Dashboard mode="live" provider={async () => liveSnapshot} />);
  await screen.findByRole("heading", { name: "IT / OT Intelligence", level: 2 });
  expect(screen.getByText("0 de 1")).toBeTruthy();
  expect(screen.getByText(/sin clasificar 1/)).toBeTruthy();

  await userEvent.click(screen.getByRole("button", { name: "IT" }));
  expect(await screen.findByText("No hay activos para este alcance")).toBeTruthy();
  expect(screen.getByText(/No hay activos con domain Taxonomy v2 classified como IT/)).toBeTruthy();
});

it("mantiene Overview Live honesto ante cobertura parcial y nunca muestra hallazgos Demo", async () => {
  const liveSnapshot: DashboardSnapshot = {
    asOf: "2026-09-21T12:00:00.000Z",
    assets: [{
      id: "NEXUS-LIVE-1",
      type: "Computer",
      domain: "IT",
      lifecycle: "active",
      critical: false,
      owner: null,
      location: null,
      lastSeen: null,
      warrantyEnds: null,
    }],
  };

  render(<Dashboard mode="live" provider={async () => liveSnapshot} />);
  await screen.findByText("Cobertura Live");
  expect(screen.getByRole("heading", { name: "Technology Overview", level: 1 })).toBeTruthy();
  expect(screen.getByText("Cobertura de freshness incompleta")).toBeTruthy();
  expect(screen.queryByText("Datos básicos presentes")).toBeNull();
  expect(screen.queryByRole("table", { name: "Próximos vencimientos de garantía" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Calidad de datos" })).toBeNull();
  expect(screen.getAllByRole("link", { name: /Lifecycle & Investment/ }).some(link => link.getAttribute("href") === "#lifecycle")).toBe(true);
  const itOtHeading = screen.getByRole("heading", { name: "IT / OT Intelligence", level: 2 });
  expect(itOtHeading).toBeTruthy();
  const itOtSection = itOtHeading.closest("section");
  expect(itOtSection).toBeTruthy();
  expect(within(itOtSection!).getByText("Sin evidencia canónica")).toBeTruthy();
  expect(screen.getAllByText(/no se infieren/i).length).toBeGreaterThan(0);
});

it("presenta Endpoint Experience como evidencia con coverage, no como Device Health", async () => {
  render(<Dashboard />);
  await ready();
  const heading = screen.getByRole("heading", { name: "Endpoint Experience", level: 2 });
  const section = heading.closest("section");
  expect(section).toBeTruthy();
  const view = within(section!);
  expect(view.getByText("Confiabilidad de aplicaciones")).toBeTruthy();
  expect(view.getByText("Reinicios")).toBeTruthy();
  expect(view.getByText("Startup")).toBeTruthy();
  expect(view.getByText("Batería")).toBeTruthy();
  expect(view.getByText(/Endpoint Experience no es CMDB Health, Device Health, risk score ni diagnóstico causal/)).toBeTruthy();
});

it("presenta findings como patrón e hipótesis investigable, no como causa o score", async () => {
  render(<Dashboard />);
  await ready();

  const heading = screen.getByRole("heading", { name: "Proactive Findings", level: 2 });
  const section = heading.closest("section");
  expect(section).toBeTruthy();
  const view = within(section!);

  expect(view.getByText(/Evidence → pattern → hypothesis/)).toBeTruthy();
  expect(view.getByText(/Un finding propone una investigación; no demuestra causa, riesgo ni severidad/)).toBeTruthy();
  expect(view.getByText(/Confidence expresa soporte de evidencia del patrón; nunca probabilidad causal/)).toBeTruthy();
  expect(view.getAllByRole("link", { name: "Abrir Asset 360" }).length).toBeGreaterThan(0);
  expect(view.queryByText(/root cause demostrada/i)).toBeNull();
});

it("mantiene Live sin observations como unavailable en vez de fabricar cero eventos", async () => {
  const canonical = demoSnapshot.canonical!;
  const canonicalAsset = canonical.assets.find(asset =>
    asset.taxonomy?.assetClass.state === "classified"
    && asset.taxonomy.assetClass.value === "endpoint"
    && asset.lifecycle === "active",
  )!;
  const presentation = demoSnapshot.assets.find(asset => asset.id === canonicalAsset.id)!;
  const liveSnapshot: DashboardSnapshot = {
    asOf: canonical.asOf,
    assets: [presentation],
    canonical: {
      ...canonical,
      assets: [canonicalAsset],
      relationships: [],
      observations: [],
    },
  };

  render(<Dashboard mode="live" provider={async () => liveSnapshot} />);
  const heading = await screen.findByRole("heading", { name: "Endpoint Experience", level: 2 });
  const section = heading.closest("section");
  expect(section).toBeTruthy();
  const view = within(section!);
  expect(view.getAllByText("No disponible").length).toBeGreaterThan(0);
  expect(view.queryByText(/0 eventos/)).toBeNull();

  const findingsHeading = screen.getByRole("heading", { name: "Proactive Findings", level: 2 });
  const findingsSection = findingsHeading.closest("section");
  expect(findingsSection).toBeTruthy();
  const findingsView = within(findingsSection!);
  expect(findingsView.getByText("Reglas no evaluables")).toBeTruthy();
  expect(findingsView.queryByRole("link", { name: "Abrir Asset 360" })).toBeNull();
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
