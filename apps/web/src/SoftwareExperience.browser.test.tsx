import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { SoftwareExperience } from "./SoftwareExperience";
import { SoftwareInventory } from "./SoftwareInventory";
import { SoftwareRequestError, type SoftwareReader } from "./software-client";
import { useSoftware } from "./use-software";
import { softwareComplete, softwareFixture, partialSoftware, unknownSoftware } from "./test/software-fixtures";
import { Asset360 } from "./Asset360";
import { App } from "./App";
import { NexusShell } from "./NexusShell";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";
afterEach(async () => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });
const ready = () => screen.findByRole("heading", { name: "Software instalado", level: 3 });
const provider: InventoryProvider = async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.map(asset => ({ ...asset, dataMode: "live" })) });
it("renders multiple OS installations without assigning a primary and preserves repeated software observations", async () => {
  render(<SoftwareExperience assetId="SYNTH ASSET" mode="live" reader={async () => softwareFixture()} />); await ready();
  expect(screen.getByText("Sistema sintético A")).toBeTruthy(); expect(screen.getByText("Sistema sintético B")).toBeTruthy();
  expect(screen.getAllByText("Programa repetido sintético")).toHaveLength(2);
  expect(screen.getByRole("status").textContent).toContain("145 instalaciones cargadas · 145 coincidencias · 25 visibles");
  expect(screen.getAllByText("2026-09-01 · día calendario, sin hora").length).toBeGreaterThan(0);
  expect(screen.getByText(/08:00 UTC · timestamp/)).toBeTruthy();
  await userEvent.click(screen.getByText("Evidencia instalación 1"));
  const installation = within(screen.getByText("Evidencia instalación 1").closest("details")!);
  expect(installation.getByText("SYNTH-INSTALL-1")).toBeTruthy();
  const acquisition = installation.getByText("Evidencia de la instalación"); await userEvent.click(acquisition);
  const evidence = within(acquisition.closest("details")!);
  expect(evidence.getByText("SYNTH-RESPONSE")).toBeTruthy(); expect(evidence.getByText("Sin fecha original verificable")).toBeTruthy();
  expect(evidence.getAllByText("Assets/Computer/42/SoftwareInstallation")).toHaveLength(2);
});
it("searches, filters, sorts and pages only loaded records without fetching again", async () => {
  const reader = vi.fn<SoftwareReader>().mockResolvedValue(softwareFixture());
  render(<SoftwareExperience assetId="SYNTH ASSET" mode="live" reader={reader} />); await ready();
  await userEvent.click(screen.getByRole("button", { name: "Siguiente" })); expect(screen.getByRole("status").textContent).toContain("Página 2 de 6");
  await userEvent.fill(screen.getByRole("searchbox", { name: "Buscar instalaciones" }), "repetido");
  expect(screen.getByRole("status").textContent).toContain("2 coincidencias · 2 visibles · Página 1 de 1");
  await userEvent.selectOptions(screen.getByLabelText("Editor"), "publisher:Editor Norte"); expect(screen.getByRole("status").textContent).toContain("1 coincidencias");
  await userEvent.fill(screen.getByRole("searchbox"), "missing-synthetic"); expect(screen.getByText(/Sin coincidencias en los registros cargados/)).toBeTruthy();
  await userEvent.fill(screen.getByRole("searchbox"), ""); await userEvent.selectOptions(screen.getByLabelText("Editor"), "all");
  const order = screen.getByRole("button", { name: "Software" }); order.focus(); await userEvent.keyboard("{Enter}");
  expect(order.closest("th")!.getAttribute("aria-sort")).toBe("descending"); expect(reader).toHaveBeenCalledTimes(1);
});
it("keeps partial empty, coverage gaps, unresolved catalogue and pagination uncertainty explicit", async () => {
  render(<SoftwareExperience assetId="SYNTH ASSET" mode="live" reader={async () => partialSoftware()} />); await ready();
  expect(screen.getByText(/Consulta parcial sin instalaciones disponibles/)).toBeTruthy();
  // Unresolved names sort last; presentation paging must still expose their acquired records.
  for (let index = 0; index < 5; index++) await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(screen.getByText("Software no resuelto")).toBeTruthy();
  await userEvent.click(screen.getAllByText(/Brechas de cobertura/)[1]!); expect(screen.getByText("installations.software")).toBeTruthy();
  await userEvent.click(screen.getAllByText("Alcance y paginación de la adquisición")[1]!); expect(screen.getByText("Desconocido")).toBeTruthy();
  expect(screen.getAllByText(/La ausencia de continuación no demuestra agotamiento/).length).toBe(2);
});
it.each(["complete", "partial", "unavailable", "not_applicable", "not_requested"] as const)("distinguishes empty/absent coverage %s", async state => {
  const section = state === "complete" ? softwareComplete([]) : state === "partial" ? { ...softwareComplete([]), state: "partial" as const, gaps: [{ fieldPath: "installations", reason: "source_error" as const }] } : state === "unavailable" ? { state, reason: "source_error" as const } : { state };
  render(<SoftwareInventory inventory={{ ...unknownSoftware(), installations: section }} />);
  const software = within(screen.getByRole("region", { name: "Software instalado" }));
  const label = { complete: /Consulta completa sin instalaciones/, partial: /Consulta parcial sin instalaciones/, unavailable: /La fuente no pudo/, not_applicable: /no aplica/, not_requested: /no fue consultada/ }[state];
  expect(software.getByText(label)).toBeTruthy(); expect(software.queryByRole("table")).toBeNull();
});
it.each(["authentication", "forbidden", "not_found", "incompatible", "network", "unavailable"] as const)("renders safe %s errors with correct retry policy", async kind => {
  render(<SoftwareExperience assetId="id" mode="live" reader={async () => { throw new SoftwareRequestError(kind); }} />);
  await screen.findByRole("alert"); expect(screen.queryByText("Software request unavailable")).toBeNull();
  expect(Boolean(screen.queryByRole("button", { name: "Reintentar sistema y software" }))).toBe(kind === "network" || kind === "unavailable");
});
it("retries successfully and rejects a response for another asset", async () => {
  const reader = vi.fn<SoftwareReader>().mockRejectedValueOnce(new SoftwareRequestError("unavailable")).mockResolvedValueOnce(softwareFixture("id"));
  const view = render(<SoftwareExperience assetId="id" mode="live" reader={reader} />);
  await userEvent.click(await screen.findByRole("button", { name: "Reintentar sistema y software" })); await ready(); expect(reader).toHaveBeenCalledTimes(2);
  view.rerender(<SoftwareExperience assetId="wrong" mode="live" reader={async () => softwareFixture("other")} />);
  await screen.findByText("Respuesta de software incompatible"); expect(screen.queryByText("Sistema sintético A")).toBeNull();
});
it("hook discards previous identity synchronously and ignores late responses despite an uncooperative reader", async () => {
  let release!: (value: unknown) => void; let oldSignal!: AbortSignal;
  const reader: SoftwareReader = async (id, signal) => id === "old" ? new Promise(done => { release = done; oldSignal = signal; }) : softwareFixture(id);
  function Harness({ id }: { id: string }) { const { state } = useSoftware(id, reader); return <p>{state.status === "ready" ? state.inventory.assetId : state.status}</p>; }
  const view = render(<Harness id="old" />); await waitFor(() => expect(oldSignal).toBeTruthy());
  view.rerender(<Harness id="new" />); await screen.findByText("new"); expect(oldSignal.aborted).toBe(true);
  release(softwareFixture("old")); await waitFor(() => expect(screen.queryByText("old")).toBeNull()); view.unmount();
});
it("hides already loaded software immediately while a new asset is pending and aborts on unmount", async () => {
  let signal!: AbortSignal;
  const reader: SoftwareReader = async (id, incoming) => id === "old" ? softwareFixture(id) : new Promise(() => { signal = incoming; });
  function Harness({ id }: { id: string }) { const { state } = useSoftware(id, reader); return <p>{state.status === "ready" ? state.inventory.assetId : state.status}</p>; }
  const view = render(<Harness id="old" />); await screen.findByText("old");
  view.rerender(<Harness id="new" />); expect(screen.queryByText("old")).toBeNull(); expect(screen.getByText("loading")).toBeTruthy();
  await waitFor(() => expect(signal).toBeTruthy()); view.unmount(); expect(signal.aborted).toBe(true);
});
it("uses the literal canonical ID with an interior space through Asset 360", async () => {
  const reader = vi.fn<SoftwareReader>().mockImplementation(async id => softwareFixture(id));
  const canonical: InventoryProvider = async () => ({ ...demoSnapshot, assets: [{ ...demoSnapshot.assets[0]!, id: "SYNTH ASSET", dataMode: "live" }] });
  render(<Asset360 assetId="SYNTH ASSET" section="software" mode="live" provider={canonical} softwareReader={reader} />); await ready();
  expect(reader).toHaveBeenCalledExactlyOnceWith("SYNTH ASSET", expect.any(AbortSignal));
  expect(screen.getByRole("link", { name: "Sistema y software" }).getAttribute("href")).toBe("#assets/SYNTH%20ASSET?section=software");
});
it("never reads in inactive sections or Demo and aborts when leaving Software", async () => {
  const reader = vi.fn<SoftwareReader>().mockImplementation(async (_id, signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))));
  const view = render(<Asset360 assetId="DEMO-0002" section="inventory" mode="live" provider={provider} softwareReader={reader} />);
  await screen.findByRole("heading", { name: "Inventario", level: 2 }); expect(reader).not.toHaveBeenCalled();
  view.rerender(<Asset360 assetId="DEMO-0002" section="software" mode="live" provider={provider} softwareReader={reader} />);
  await waitFor(() => expect(reader).toHaveBeenCalledTimes(1)); const signal = reader.mock.calls[0]![1];
  view.rerender(<Asset360 assetId="DEMO-0002" section="hardware" mode="demo" softwareReader={reader} />); expect(signal.aborted).toBe(true);
  view.rerender(<Asset360 assetId="DEMO-0002" section="software" mode="demo" softwareReader={reader} />);
  await screen.findByText("Sistema y software disponible en Live"); expect(reader).toHaveBeenCalledTimes(1);
});
it("preserves software deep links, return to Explorer, keyboard focus and back/forward", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002?section=software&return=%23assets%3Fq%3DDemo");
  render(<App />); const heading = await screen.findByRole("heading", { name: "Sistema y software", level: 2 });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(getComputedStyle(heading).outlineWidth).toBe("2px");
  const nav = within(screen.getByRole("navigation", { name: "Secciones de Asset 360" }));
  expect(nav.getByRole("link", { name: "Sistema y software" }).getAttribute("aria-current")).toBe("page");
  await userEvent.click(nav.getByRole("link", { name: "Hardware" })); await screen.findByRole("heading", { name: "Hardware", level: 2 });
  window.history.back(); await screen.findByRole("heading", { name: "Sistema y software", level: 2 });
  window.history.forward(); await screen.findByRole("heading", { name: "Hardware", level: 2 });
  expect(screen.getByRole("link", { name: "Volver a investigación" }).getAttribute("href")).toBe("#assets?q=Demo");
});
it.each([["light", "comfortable"], ["light", "compact"], ["dark", "comfortable"], ["dark", "compact"]] as const)("has no axe violations or global overflow with 145 installations at mobile width in %s/%s", async (theme, density) => {
  await page.viewport(320, 900); localStorage.setItem("igx-nexus:theme", theme); localStorage.setItem("igx-nexus:density", density);
  render(<NexusShell view="asset" mode="live"><Asset360 assetId="DEMO-0002" section="software" mode="live" provider={provider} softwareReader={async id => softwareFixture(id)} /></NexusShell>); await ready();
  const nav = screen.getByRole("navigation", { name: "Secciones de Asset 360" });
  const active = within(nav).getByRole("link", { name: "Sistema y software" });
  expect(active.getBoundingClientRect().left).toBeGreaterThanOrEqual(nav.getBoundingClientRect().left - 1);
  expect(active.getBoundingClientRect().right).toBeLessThanOrEqual(nav.getBoundingClientRect().right + 1);
  // Offscreen hash-router links are routes, not skip links. Keep every other rule on them,
  // and keep skip-link validation enabled for the actual Shell skip link.
  axe.configure({ rules: [{ id: "skip-link", selector: 'a[href]:not(.nexus-asset-local-nav a)' }] });
  try { expect((await axe.run(document.body, { rules: { region: { enabled: false } } })).violations).toEqual([]); }
  finally { axe.reset(); }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
});
