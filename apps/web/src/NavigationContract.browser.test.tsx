import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { App } from "./App";
import { Asset360 } from "./Asset360";
import { AssetExplorer } from "./AssetExplorer";
import { demoSnapshot } from "./demo-provider";
import { buildContextualAssetLink, buildInvestigationLink, changeRepresentation, parseInvestigationHash, selectionAvailability } from "./navigation-state";
import { routeFromHash } from "./navigation-model";
import { useInvestigationNavigation, writeInvestigationState } from "./use-investigation-navigation";
import "@igx-nexus/ui/styles.css";

const asset = demoSnapshot.assets[0]!;
afterEach(async () => { cleanup(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });

/** Test-only semantic adapter, not a new production Workspace or graph renderer. */
function JourneyHarness() {
  const navigation = useInvestigationNavigation();
  const { state, update } = navigation;
  const hash = useSyncExternalStore(callback => {
    for (const event of ["hashchange", "popstate", "nexus:navigation"]) window.addEventListener(event, callback);
    return () => { for (const event of ["hashchange", "popstate", "nexus:navigation"]) window.removeEventListener(event, callback); };
  }, () => window.location.hash);
  const route = routeFromHash(hash);
  if (route?.view === "dashboard") return <main><h1>Overview fixture</h1><a href={buildInvestigationLink({ query: asset.name })}>Investigar</a></main>;
  if (route?.view === "asset") return <main><Asset360 assetId={route.assetId} section={route.section} /></main>;
  return <HarnessRepresentation state={state} update={update} />;
}

function HarnessRepresentation({ state, update }: Pick<ReturnType<typeof useInvestigationNavigation>, "state" | "update">) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [state.view]);
  return <main>
    <h1 tabIndex={-1} ref={heading}>{state.view === "table" ? "Table fixture" : "Graph fixture"}</h1>
    <label>Filtro de dominio<select value={state.filters.domain} onChange={event => update({ ...state, filters: { ...state.filters, domain: event.target.value }, page: 1 })}><option value="">Todos</option><option value={asset.domain}>{asset.domain}</option><option value="REMOVED">REMOVED</option></select></label>
    <button aria-pressed={state.selectedId === asset.id} onClick={() => update({ ...state, selectedId: asset.id })}>Seleccionar CI</button>
    <button onClick={() => update(changeRepresentation(state, state.view === "table" ? "graph" : "table"))}>Cambiar representación</button>
    <p role="status">{selectionAvailability(state, demoSnapshot, [])}</p>
    <a href={buildContextualAssetLink(asset.id, state)}>Abrir Asset 360</a>
    <pre aria-label="Contexto">{JSON.stringify(state)}</pre>
  </main>;
}

it("Overview → filtro → selección → Graph → Asset 360 → Back/Forward recupera el mismo contexto", async () => {
  window.history.replaceState(null, "", "#overview");
  render(<JourneyHarness />);
  await userEvent.click(screen.getByRole("link", { name: "Investigar" }));
  await screen.findByRole("heading", { name: "Table fixture" });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: asset.domain } });
  await userEvent.click(screen.getByRole("button", { name: "Seleccionar CI" }));
  await userEvent.click(screen.getByRole("button", { name: "Cambiar representación" }));
  await screen.findByRole("heading", { name: "Graph fixture" });
  expect(document.activeElement).toBe(screen.getByRole("heading"));
  expect(screen.getByRole("status").textContent).toBe("outside-graph");
  const origin = window.location.hash;
  await userEvent.click(screen.getByRole("link", { name: "Abrir Asset 360" }));
  await screen.findByRole("heading", { name: asset.name, level: 1 });
  expect(screen.getByRole("link", { name: "Volver a investigación" }).getAttribute("href")).toBe(origin);
  window.history.back();
  await screen.findByRole("heading", { name: "Graph fixture" });
  expect(window.location.hash).toBe(origin);
  expect(parseInvestigationHash(origin).state.selectedId).toBe(asset.id);
  window.history.back();
  await screen.findByRole("heading", { name: "Table fixture" });
  expect(parseInvestigationHash(window.location.hash).state.selectedId).toBe(asset.id);
  window.history.forward();
  await screen.findByRole("heading", { name: "Graph fixture" });
});

it("filter A → filter B → Back restores filter A; replace search does not add keystroke entries", async () => {
  window.history.replaceState({ unrelated: true }, "", "#assets");
  render(<JourneyHarness />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: asset.domain } });
  const first = window.location.hash;
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "REMOVED" } });
  window.history.back();
  await waitFor(() => expect(window.location.hash).toBe(first));
  const length = window.history.length;
  for (const search of ["a", "ab", "abc"]) writeInvestigationState({ ...parseInvestigationHash(first).state, search }, "replace");
  expect(window.history.length).toBe(length);
  expect(window.history.state.unrelated).toBe(true);
});

it("deep link, remount and responsive preserve state without encoding focus or viewport", async () => {
  const origin = "#assets?view=graph&q=OT&selected=REMOVED&root=REMOVED&page=4&f.domain=REMOVED";
  window.history.replaceState(null, "", origin);
  const mounted = render(<JourneyHarness />);
  expect(screen.getByRole("status").textContent).toBe("missing");
  await page.viewport(320, 800);
  expect(window.location.hash).toBe(origin);
  mounted.unmount(); render(<JourneyHarness />);
  expect(screen.getByRole("status").textContent).toBe("missing");
  expect(window.location.hash).toBe(origin);
});

it("production Explorer URL adapter restores search after Asset 360 contextual return and section change", async () => {
  window.history.replaceState(null, "", buildInvestigationLink({ query: "SYNTH-SN-000002" }));
  render(<App />);
  await screen.findByRole("table", { name: "Inventario de activos demo" });
  expect(screen.getByRole("searchbox").getAttribute("value")).toBe("SYNTH-SN-000002");
  const link = document.querySelector<HTMLAnchorElement>("[data-asset-link]")!;
  const id = link.dataset.assetLink;
  await userEvent.click(link);
  await screen.findByRole("link", { name: "Volver a investigación" });
  window.history.back();
  await screen.findByRole("table", { name: "Inventario de activos demo" });
  expect(parseInvestigationHash(window.location.hash).state.selectedId).toBe(id);
  window.history.forward();
  await screen.findByRole("link", { name: "Volver a investigación" });
  await userEvent.click(screen.getByRole("link", { name: "Evidencia y fuentes" }));
  const returnLink = await screen.findByRole("link", { name: "Volver a investigación" });
  expect(returnLink.getAttribute("href")).toContain("q=SYNTH-SN-000002");
  await userEvent.click(returnLink);
  await screen.findByRole("table", { name: "Inventario de activos demo" });
  expect(parseInvestigationHash(window.location.hash).state.selectedId).toBe(id);
  await waitFor(() => expect(document.activeElement?.getAttribute("data-asset-link")).toBe(id));
});

it("direct Asset 360 missing entity has safe inventory return even with malicious origin", async () => {
  window.history.replaceState(null, "", "#assets/REMOVED?return=https%3A%2F%2Fevil.example");
  render(<App />);
  await screen.findByText("Activo no encontrado");
  expect(screen.getByRole("link", { name: "Volver al inventario" }).getAttribute("href")).toBe("#assets");
});

it("stale page clamps once and stale facet stays visible without dropping selected CI", async () => {
  window.history.replaceState(null, "", "#assets?f.domain=REMOVED&page=999&selected=REMOVED");
  render(<App />);
  await screen.findByText("No hay activos que coincidan");
  await waitFor(() => expect(window.location.hash).toBe("#assets?f.domain=REMOVED&selected=REMOVED"));
  expect(screen.getByRole("combobox", { name: "Dominio" }).getAttribute("value") ?? (screen.getByRole("combobox", { name: "Dominio" }) as HTMLSelectElement).value).toBe("REMOVED");
  expect(screen.getByText(/CI no disponible en el inventario actual/)).toBeTruthy();
});

it("URL mode cannot turn Live into Demo and a mismatched snapshot fails closed", async () => {
  window.history.replaceState(null, "", "#assets?mode=demo&q=Demo&selected=DEMO-0001");
  render(<AssetExplorer navigation mode="live" provider={async () => demoSnapshot} />);
  await screen.findByText("No se pudo cargar el inventario");
  expect(screen.queryByRole("table")).toBeNull();
  expect(window.location.hash).toContain("mode=demo");
  expect(screen.getByText(/Inventario todavía no disponible/)).toBeTruthy();
});
