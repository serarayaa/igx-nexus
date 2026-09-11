import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { CmdbHealth } from "./CmdbHealth";
import { Asset360 } from "./Asset360";
import { NexusShell } from "./NexusShell";
import { demoSnapshot } from "./demo-provider";
import { demoRelationshipSnapshot } from "./demo-relationship-provider";
import type { InventoryProvider, InventorySnapshot } from "./asset-model";
import type { RelationshipInventoryProvider, RelationshipSnapshot } from "./relationship-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

const specimen = { ...demoSnapshot.assets[1]!, lastSeen: demoSnapshot.asOf };
const perfect: InventorySnapshot = { ...demoSnapshot, assets: [specimen] };
const healthyProvider: InventoryProvider = async () => perfect;
const noRelationships: RelationshipInventoryProvider = async () => ({ ...demoRelationshipSnapshot, relationships: [] });
const ready = () => screen.findByRole("heading", { name: "Score de registros CI" });
const shell = (props: Parameters<typeof CmdbHealth>[0] = {}) => <NexusShell view="health"><CmdbHealth {...props} /></NexusShell>;

afterEach(async () => { cleanup(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });

it("Dashboard → Health → Asset 360 conserva historial, título y resumen individual", async () => {
  window.history.replaceState(null, "", "#overview");
  render(<App />);
  const links = await screen.findAllByRole("link", { name: "CMDB Health" });
  await userEvent.click(links[links.length - 1]!);
  await ready();
  expect(document.title).toBe("CMDB Health · IGX NEXUS");
  const sidebar = screen.getByRole("link", { name: "CMDB Health" });
  expect(sidebar.getAttribute("aria-current")).toBe("page");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Estado Health" }), "healthy");
  const rows = screen.getByRole("region", { name: "Localizar registros y revisar causas" });
  const assetLink = within(rows).getAllByRole("link")[0]!;
  const name = assetLink.textContent;
  await userEvent.click(assetLink);
  await screen.findByRole("heading", { name: name!, level: 1 });
  const health = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(health).findByText("Confiable")).toBeTruthy();
  expect(within(health).getByRole("link", { name: "Ver CMDB Health global" }).getAttribute("href")).toBe("#health");
  window.history.back(); await ready();
  window.history.forward(); await screen.findByRole("heading", { name: name!, level: 1 });
});

it("deep link, causas, filtros AND, paginación y restablecer funcionan", async () => {
  window.history.replaceState(null, "", "#health"); render(<App />); await ready();
  expect(screen.getByText(/240 de 240 CI evaluados/)).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
  expect(screen.getByText("240 CI coinciden · Página 2 de 12")).toBeTruthy();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Causa" }), "observation_unknown");
  expect(screen.getByText("12 CI coinciden · Página 1 de 1")).toBeTruthy();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Dimensión con señales" }), "freshness");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tipo de activo" }), "Monitor");
  expect(screen.getByText("3 CI coinciden · Página 1 de 1")).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Restablecer filtros" }));
  expect(screen.getByText("240 CI coinciden · Página 1 de 12")).toBeTruthy();
  const causes = screen.getByRole("region", { name: "Principales señales de calidad" });
  await userEvent.click(within(causes).getByRole("button", { name: /Observación desconocida/ }));
  expect(screen.getByText("12 CI coinciden · Página 1 de 1")).toBeTruthy();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Localizar registros y revisar causas" })));
});

it("loading, fallo seguro y retry de relaciones", async () => {
  const provider = vi.fn<RelationshipInventoryProvider>().mockRejectedValueOnce(new Error("TOKEN INTERNO")).mockResolvedValueOnce(demoRelationshipSnapshot);
  render(shell({ relationshipProvider: provider }));
  expect(screen.getByText("Calculando CMDB Health")).toBeTruthy();
  expect(await screen.findByText("No se pudo calcular CMDB Health")).toBeTruthy();
  expect(screen.queryByText("TOKEN INTERNO")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" })); await ready(); expect(provider).toHaveBeenCalledTimes(2);
});

it("maneja inventario vacío y preserva relaciones huérfanas", async () => {
  render(shell({ inventoryProvider: async () => ({ ...demoSnapshot, assets: [] }) }));
  expect(await screen.findByText("El inventario está vacío")).toBeTruthy();
  expect(screen.queryByText("0 / 100")).toBeNull();
  expect(screen.getByText(/18 relaciones sin ningún extremo/)).toBeTruthy();
});

it("inventario sin problemas no inventa findings; filtro vacío es recuperable", async () => {
  render(shell({ inventoryProvider: healthyProvider, relationshipProvider: noRelationships })); await ready();
  const causes=screen.getByRole("region",{name:"Principales señales de calidad"});
  expect(within(causes).getByText(/No se detectaron señales/)).toBeTruthy();
  await userEvent.selectOptions(screen.getByRole("combobox",{name:"Estado Health"}),"degraded");
  expect(await screen.findByText("Sin registros para estos filtros")).toBeTruthy();
  await userEvent.click(screen.getByRole("button",{name:"Ver todos los registros"}));
  expect(screen.getByText("1 CI coinciden · Página 1 de 1")).toBeTruthy();
});

it("datos degradados explican por qué y qué revisar", async () => {
  render(shell({ inventoryProvider: async () => ({ ...perfect, assets: [{ ...specimen, serial: null, manufacturer: null, model: null, lastSeen: "2025-01-01", warrantyEnds: "2026-02-30" }] }), relationshipProvider: noRelationships }));
  await ready();
  const results=screen.getByRole("region",{name:"Localizar registros y revisar causas"});
  expect(within(results).getByText("Degradado", { selector: "span" })).toBeTruthy();
  await userEvent.click(within(results).getByText(/Revisar todas las causas y acciones/));
  expect(within(results).getByText(/Verificar el calendario/)).toBeTruthy();
  expect(within(results).getAllByText("Falta serial").length).toBeGreaterThan(0);
});

it("rechaza cortes incompatibles con error seguro", async () => {
  render(shell({ relationshipProvider: async () => ({ ...demoRelationshipSnapshot, asOf: "2026-09-01" }) }));
  expect(await screen.findByText("No se pudo calcular CMDB Health")).toBeTruthy();
  expect(screen.queryByText("incompatible snapshot cuts")).toBeNull();
});

it("cancela e ignora una respuesta obsoleta aunque el provider ignore abort", async () => {
  let resolveOld!: (snapshot: InventorySnapshot) => void;
  let signal: AbortSignal | undefined;
  const old: InventoryProvider = s => { signal = s; return new Promise(resolve => { resolveOld=resolve; }); };
  const view=render(shell({ inventoryProvider: old, relationshipProvider: noRelationships }));
  await waitFor(()=>expect(signal).toBeDefined());
  view.rerender(shell({ inventoryProvider: healthyProvider, relationshipProvider: noRelationships }));
  await ready(); expect(signal!.aborted).toBe(true);
  resolveOld({ ...demoSnapshot, assets: [] });
  await waitFor(()=>expect(screen.queryByText("El inventario está vacío")).toBeNull());
  expect(screen.getByText(/1 de 1 CI evaluados/)).toBeTruthy();
});

it("cancela ambos providers al desmontar y descarta rechazos tardíos", async () => {
  const signals: AbortSignal[]=[]; let rejectOld!: (error: Error)=>void;
  const inventoryProvider: InventoryProvider = signal=>{ signals.push(signal); return Promise.resolve(perfect); };
  const relationshipProvider: RelationshipInventoryProvider = signal=>{ signals.push(signal); return new Promise<RelationshipSnapshot>((_,reject)=>{rejectOld=reject;}); };
  const view=render(shell({ inventoryProvider, relationshipProvider }));
  await waitFor(()=>expect(signals).toHaveLength(2)); view.unmount();
  expect(signals.every(s=>s.aborted)).toBe(true); rejectOld(new Error("late internal error"));
});

it("Asset 360 conserva ficha ante fallo de Health, reintenta y tolera fechas inválidas", async () => {
  const relationProvider=vi.fn<RelationshipInventoryProvider>().mockRejectedValueOnce(new Error("internal")).mockResolvedValueOnce({ ...demoRelationshipSnapshot, relationships: [] });
  const provider: InventoryProvider=async()=>({ ...perfect,assets:[{...specimen,lastSeen:"invalid",warrantyEnds:"2026-02-30"}] });
  render(<NexusShell view="asset"><Asset360 assetId={specimen.id} provider={provider} relationshipProvider={relationProvider} /></NexusShell>);
  await screen.findByRole("heading",{name:specimen.name,level:1});
  expect(await screen.findByText("No se pudo calcular CMDB Health")).toBeTruthy();
  expect(screen.getByRole("region",{name:"Identidad"})).toBeTruthy();
  await userEvent.click(screen.getByRole("button",{name:"Reintentar Health"}));
  const health=screen.getByRole("region",{name:"CMDB Health"});
  expect(await within(health).findByText("Observación inválida o futura")).toBeTruthy();
  expect(within(health).getByText("Fecha de garantía inválida")).toBeTruthy();
});

it("navegación por teclado, foco y disclosure conservan contexto", async () => {
  render(shell({ inventoryProvider:healthyProvider,relationshipProvider:noRelationships })); await ready();
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole("heading",{name:"CMDB Health",level:1})));
  const button=screen.getByRole("button",{name:"Ver Confiable: 1 CI"}); button.focus(); await userEvent.keyboard("{Enter}");
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole("heading",{name:"Localizar registros y revisar causas"})));
  const state=screen.getByRole("combobox",{name:"Estado Health"}); state.focus();
  expect(getComputedStyle(state).outlineStyle).not.toBe("none");
  await userEvent.keyboard("{Tab}"); expect(document.activeElement).toBe(screen.getByRole("combobox",{name:"Dimensión con señales"}));
  const disclosure=screen.getByText("Reglas, pesos y límites de la evaluación"); disclosure.focus(); await userEvent.keyboard("{Enter}");
  expect(disclosure.closest("details")?.open).toBe(true);
});

it("axe y reflow en 1440/768/390/320, ambos temas y densidades", async () => {
  window.history.replaceState(null,"","#health"); const {container}=render(<App />); await ready();
  for(const width of [1440,768,390,320]) {
    await page.viewport(width,1000);
    for(const theme of ["light","dark"]) {
      if(document.documentElement.dataset.theme!==theme) await userEvent.click(screen.getByRole("button",{name:theme==="dark"?"Activar tema oscuro":"Activar tema claro"}));
      for(const density of ["comfortable","compact"]) {
        if(document.documentElement.dataset.density!==density) await userEvent.click(screen.getByRole("button",{name:density==="compact"?"Activar densidad compacta":"Activar densidad cómoda"}));
        const a=await axe.run(container,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}});
        expect(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      }
    }
  }
},120000);
