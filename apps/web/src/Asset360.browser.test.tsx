import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { Asset360 } from "./Asset360";
import { NexusShell } from "./NexusShell";
import { assetClassLabel, technologyRoleLabel, type InventoryProvider, type InventorySnapshot } from "./asset-model";
import { demoRelationshipSnapshot } from "./demo-relationship-provider";
import { demoSnapshot } from "./demo-provider";
import type { RelationshipInventoryProvider } from "./relationship-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const assetHeading = () => screen.findByRole("heading", { name: "Desktop Demo 0002", level: 1 });
const explorerTable = () => screen.findByRole("table", { name: "Inventario de activos demo" });

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("abre Asset 360 en Resumen con identidad estable, calidad separada y acciones contextuales", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  render(<App />);
  const heading = await assetHeading();

  expect(screen.getByText(/Identidad NEXUS DEMO-0002/)).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  const nav = screen.getByRole("navigation", { name: "Secciones de Asset 360" });
  expect(within(nav).getByRole("link", { name: "Resumen" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("heading", { name: "Resumen", level: 2 })).toBeTruthy();
  expect(screen.getByText("Dataset sintético / provider demo")).toBeTruthy();

  const quality = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(quality).findByText("Confiable")).toBeTruthy();
  expect(within(quality).getByText(/no mide el estado físico/i)).toBeTruthy();
  expect(screen.getByRole("region", { name: "Señal técnica" })).toBeTruthy();

  expect(screen.getByRole("link", { name: "Diseñar etiqueta" }).getAttribute("href")).toBe("#assets/DEMO-0002/label");
  expect(screen.getByRole("link", { name: "Abrir Technology Map" }).getAttribute("href")).toBe("#assets/DEMO-0002/relations");
  await waitFor(() => expect(document.activeElement).toBe(heading));
});

it("navega a Inventario, restaura foco y presenta taxonomía/contexto sin mezclar legacy type", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  render(<App />);
  await assetHeading();

  await userEvent.click(screen.getByRole("link", { name: "Inventario" }));
  const inventoryHeading = await screen.findByRole("heading", { name: "Inventario", level: 2 });
  expect(window.location.hash).toBe("#assets/DEMO-0002?section=inventory");
  await waitFor(() => expect(document.activeElement).toBe(inventoryHeading));

  const identity = screen.getByRole("region", { name: "Identidad" });
  expect(within(identity).getByText("SYNTH-SN-000002")).toBeTruthy();
  const taxonomy = screen.getByRole("region", { name: "Taxonomía y contexto" });
  const asset = demoSnapshot.assets.find(candidate => candidate.id === "DEMO-0002")!;
  expect(within(taxonomy).getByText(assetClassLabel(asset.assetClass))).toBeTruthy();
  expect(within(taxonomy).getByText(technologyRoleLabel(asset.role))).toBeTruthy();
  expect(within(taxonomy).getByText("Clasificada", { selector: "span" })).toBeTruthy();
  expect(within(taxonomy).queryByText("Proyección de compatibilidad")).toBeNull();

  const assignment = screen.getByRole("region", { name: "Asignación y ubicación" });
  expect(within(assignment).getByText("Responsable Demo 2")).toBeTruthy();
  expect(within(assignment).getByText("Oficina Demo Centro")).toBeTruthy();
  const hardware = screen.getByRole("region", { name: "Hardware" });
  expect(within(hardware).getByText("Fabricante Demo A")).toBeTruthy();
  expect(within(hardware).getByText("Modelo Demo Escritorio 2")).toBeTruthy();
});

it("deep link de Evidencia conserva fechas por fuente y declara cobertura parcial de provenance", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002?section=evidence");
  render(<App />);
  await assetHeading();
  const evidenceHeading = await screen.findByRole("heading", { name: "Evidencia y fuentes", level: 2 });
  await waitFor(() => expect(document.activeElement).toBe(evidenceHeading));

  const source = screen.getByRole("region", { name: "Referencias de fuente" });
  expect(within(source).getByRole("table", { name: "Fuentes conocidas para Desktop Demo 0002" })).toBeTruthy();
  expect(within(source).getByText("demo")).toBeTruthy();
  expect(within(source).getByText(/evidencia sintética/i)).toBeTruthy();
  const coverage = screen.getByRole("region", { name: "Cobertura de provenance" });
  expect(within(coverage).getByText("Cobertura parcial en la Web")).toBeTruthy();
  expect(within(coverage).getByText(/no inventa authority, confidence ni claims/i)).toBeTruthy();
});

it("deep link de Relaciones presenta claims incidentes y navegación semántica al otro CI", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002?section=relationships");
  render(<App />);
  await assetHeading();
  const relationshipsHeading = await screen.findByRole("heading", { name: "Relaciones", level: 2 });
  await waitFor(() => expect(document.activeElement).toBe(relationshipsHeading));

  const region = screen.getByRole("region", { name: "Relaciones" });
  const list = await within(region).findByRole("list");
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(within(region).getAllByRole("link", { name: "Abrir CI relacionado" })).toHaveLength(2);
  expect(within(region).getByRole("link", { name: "Abrir Technology Map" }).getAttribute("href")).toBe("#assets/DEMO-0002/relations");
  expect(within(region).getByText(/no demuestra impacto ni causalidad/i)).toBeTruthy();
});

it("presenta datos parciales sin inventar información", async () => {
  const view = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0001" section="inventory" /></NexusShell>);
  await screen.findByRole("heading", { name: "Notebook Demo 0001", level: 1 });
  const inventoryHeading = await screen.findByRole("heading", { name: "Inventario", level: 2 });
  await waitFor(() => expect(document.activeElement).toBe(inventoryHeading));

  const identity = screen.getByRole("region", { name: "Identidad" });
  expect(within(identity).getAllByText("No informado").length).toBeGreaterThan(0);
  const assignment = screen.getByRole("region", { name: "Asignación y ubicación" });
  expect(within(assignment).getAllByText("No informado")).toHaveLength(2);

  view.rerender(<NexusShell view="asset"><Asset360 assetId="DEMO-0001" section="summary" /></NexusShell>);
  const quality = await screen.findByRole("region", { name: "CMDB Health" });
  expect(await within(quality).findByText("Observación desconocida")).toBeTruthy();
  expect(within(quality).getByText("Falta responsable")).toBeTruthy();
  expect(within(quality).getByText("Falta ubicación")).toBeTruthy();
  expect(within(quality).getByText("Falta serial")).toBeTruthy();
});

it("Live mantiene fallback taxonómico explícito, fuentes independientes y cero datos sintéticos", async () => {
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
      assetClass: "endpoint",
      role: "user_endpoint",
      taxonomyState: "unclassified",
      taxonomyReviewRequired: true,
      taxonomyCompatibilityFallback: true,
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
      sourceSystems: ["glpi", "intune"],
      sourceObservedAt: "2026-09-15T15:59:00.000Z",
      sourceReferences: [
        { source: "glpi", observedAt: "2026-09-15T15:59:00.000Z" },
        { source: "intune", observedAt: "2026-09-14T15:57:00.000Z" },
      ],
    }],
  };
  const provider: InventoryProvider = async () => liveSnapshot;

  const view = render(<NexusShell view="asset"><Asset360 assetId="NXS-LAB" mode="live" provider={provider} /></NexusShell>);
  await screen.findByRole("heading", { name: "LAB-ENDPOINT", level: 1 });
  expect(screen.getByText("ASSET 360 · INNERGEX CHILE · LIVE")).toBeTruthy();
  expect(screen.getByText("Dominio IT · compatibilidad")).toBeTruthy();
  expect(screen.getByText("Taxonomía por revisar")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "CMDB Health" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Diseñar etiqueta" })).toBeNull();
  expect(screen.getByRole("link", { name: "Abrir Technology Map" }).getAttribute("href")).toBe("#assets/NXS-LAB/relations");

  view.rerender(<NexusShell view="asset"><Asset360 assetId="NXS-LAB" section="inventory" mode="live" provider={provider} /></NexusShell>);
  const taxonomy = await screen.findByRole("region", { name: "Taxonomía y contexto" });
  expect(within(taxonomy).getByText("Proyección de compatibilidad")).toBeTruthy();
  expect(within(taxonomy).getByRole("note").textContent).toMatch(/no equivalen a una clasificación resuelta/i);

  view.rerender(<NexusShell view="asset"><Asset360 assetId="NXS-LAB" section="evidence" mode="live" provider={provider} /></NexusShell>);
  const source = await screen.findByRole("region", { name: "Referencias de fuente" });
  const sourceTable = within(source).getByRole("table");
  const glpiRow = within(sourceTable).getByRole("row", { name: /glpi/i });
  const intuneRow = within(sourceTable).getByRole("row", { name: /intune/i });
  const glpiDate = within(glpiRow).getAllByRole("cell")[1]?.textContent;
  const intuneDate = within(intuneRow).getAllByRole("cell")[1]?.textContent;
  expect(glpiDate).toBeTruthy();
  expect(intuneDate).toBeTruthy();
  expect(glpiDate).not.toBe(intuneDate);

  view.rerender(<NexusShell view="asset"><Asset360 assetId="NXS-LAB" section="relationships" mode="live" provider={provider} /></NexusShell>);
  const relationships = await screen.findByRole("region", { name: "Relaciones" });
  expect(within(relationships).getByText("Sin cobertura de relaciones Live")).toBeTruthy();
  expect(within(relationships).getByText(/no sustituye esta ausencia con relaciones sintéticas/i)).toBeTruthy();
  expect(within(relationships).getByRole("link", { name: "Abrir Technology Map" }).getAttribute("href")).toBe("#assets/NXS-LAB/relations");
});

it("Atrás/Adelante restaura sección contextual sin recargar el CI", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  const provider = vi.fn<InventoryProvider>().mockResolvedValue(demoSnapshot);
  render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);
  await assetHeading();
  expect(provider).toHaveBeenCalledTimes(1);

  // La navegación por hash se valida de extremo a extremo con App.
  cleanup();
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  render(<App />);
  await assetHeading();
  await userEvent.click(screen.getByRole("link", { name: "Inventario" }));
  await screen.findByRole("heading", { name: "Inventario", level: 2 });
  window.history.back();
  await screen.findByRole("heading", { name: "Resumen", level: 2 });
  expect(window.location.hash).toBe("#assets/DEMO-0002");
  window.history.forward();
  await screen.findByRole("heading", { name: "Inventario", level: 2 });
  expect(window.location.hash).toBe("#assets/DEMO-0002?section=inventory");
});

it("navega Explorer → Asset 360 → Explorer y conserva identidad", async () => {
  window.history.replaceState(null, "", "#assets");
  render(<App />);
  await explorerTable();
  await userEvent.click(screen.getByRole("link", { name: "Desktop Demo 0002" }));
  await assetHeading();
  expect(window.location.hash).toBe("#assets/DEMO-0002?return=%23assets%3Fselected%3DDEMO-0002");
  window.history.back();
  await explorerTable();
  window.history.forward();
  await assetHeading();
});

it("maneja activo inexistente, inventario vacío, error y retry sin filtrar detalles internos", async () => {
  const provider = vi.fn<InventoryProvider>()
    .mockRejectedValueOnce(new Error("backend secreto"))
    .mockResolvedValueOnce(demoSnapshot);
  const rendered = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);

  expect(await screen.findByText("No se pudo cargar el activo")).toBeTruthy();
  expect(screen.queryByText("backend secreto")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  await assetHeading();
  expect(provider).toHaveBeenCalledTimes(2);

  rendered.rerender(<NexusShell view="asset"><Asset360 assetId="NO-EXISTE" provider={async () => demoSnapshot} /></NexusShell>);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();

  rendered.rerender(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={async () => ({ asOf: demoSnapshot.asOf, assets: [] })} /></NexusShell>);
  expect(await screen.findByText("El inventario está vacío")).toBeTruthy();
});

it("fallo de relaciones no elimina la identidad y permite reintentar sólo esa evidencia", async () => {
  const relationships = vi.fn<RelationshipInventoryProvider>()
    .mockRejectedValueOnce(new Error("relationship secret"))
    .mockResolvedValueOnce(demoRelationshipSnapshot);
  render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" section="relationships" relationshipProvider={relationships} /></NexusShell>);
  await assetHeading();

  expect(screen.getByText(/Identidad NEXUS DEMO-0002/)).toBeTruthy();
  expect(await screen.findByText("No se pudieron cargar las relaciones")).toBeTruthy();
  expect(screen.queryByText("relationship secret")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar relaciones" }));
  const region = screen.getByRole("region", { name: "Relaciones" });
  expect((await within(region).findAllByRole("listitem"))).toHaveLength(2);
  expect(relationships).toHaveBeenCalledTimes(2);
});

it("diferencia endpoint relacional fuera de inventario y fecha desconocida sin fabricar navegación", async () => {
  const base = demoRelationshipSnapshot.relationships.find(relationship => relationship.sourceId === "DEMO-0002" || relationship.targetId === "DEMO-0002")!;
  const missingId = "DEMO-MISSING";
  const relationshipProvider: RelationshipInventoryProvider = async () => ({
    ...demoRelationshipSnapshot,
    relationships: [{
      ...base,
      sourceId: "DEMO-0002",
      targetId: missingId,
      direction: "directed",
      type: "depends_on",
      observedAt: null,
    }],
  });

  render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" section="relationships" relationshipProvider={relationshipProvider} /></NexusShell>);
  await assetHeading();
  const region = screen.getByRole("region", { name: "Relaciones" });
  expect(await within(region).findByText(`CI no disponible ${missingId}`)).toBeTruthy();
  expect(within(region).getByText("Endpoint fuera del inventario")).toBeTruthy();
  expect(within(region).getByText("Sin fecha verificable")).toBeTruthy();
  expect(within(region).queryByRole("link", { name: "Abrir CI relacionado" })).toBeNull();
});

it("cancela carga al desmontar y descarta una respuesta obsoleta al cambiar de CI", async () => {
  let capturedSignal: AbortSignal | undefined;
  const pending: InventoryProvider = signal => {
    capturedSignal = signal;
    return new Promise<InventorySnapshot>(() => undefined);
  };
  const pendingView = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={pending} /></NexusShell>);
  await waitFor(() => expect(capturedSignal).toBeDefined());
  pendingView.unmount();
  expect(capturedSignal?.aborted).toBe(true);

  const resolvers: Array<(snapshot: InventorySnapshot) => void> = [];
  const provider: InventoryProvider = () => new Promise(resolve => resolvers.push(resolve));
  const rendered = render(<NexusShell view="asset"><Asset360 assetId="DEMO-0001" provider={provider} /></NexusShell>);
  await waitFor(() => expect(resolvers).toHaveLength(1));
  rendered.rerender(<NexusShell view="asset"><Asset360 assetId="DEMO-0002" provider={provider} /></NexusShell>);
  await waitFor(() => expect(resolvers).toHaveLength(2));
  resolvers[0]!(demoSnapshot);
  resolvers[1]!(demoSnapshot);
  await assetHeading();
  expect(screen.queryByRole("heading", { name: "Notebook Demo 0001", level: 1 })).toBeNull();
});

it("pasa axe y no desborda en todas las secciones, temas y densidades", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  const { container } = render(<App />);
  await assetHeading();

  for (const section of ["Resumen", "Inventario", "Evidencia y fuentes", "Relaciones"]) {
    if (section !== "Resumen") {
      await userEvent.click(screen.getByRole("link", { name: section }));
      await screen.findByRole("heading", { name: section, level: 2 });
    }
    for (const width of [1440, 320]) {
      await page.viewport(width, 1000);
      for (const theme of ["light", "dark"]) {
        if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
        for (const density of ["comfortable", "compact"]) {
          if (document.documentElement.dataset.density !== density) await userEvent.click(screen.getByRole("button", { name: density === "compact" ? "Activar densidad compacta" : "Activar densidad cómoda" }));
          const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
          expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([]);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
        }
      }
    }
  }
}, 120000);
