import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { HardwareExperience } from "./HardwareExperience";
import { HardwareEvidence } from "./HardwareEvidence";
import { HardwareRequestError, type HardwareReader } from "./hardware-client";
import { acquisition, hardwareFixture, partialHardware, unknownHardware, complete } from "./test/hardware-fixtures";
import { Asset360 } from "./Asset360";
import { App } from "./App";
import { NexusShell } from "./NexusShell";
import { demoSnapshot } from "./demo-provider";
import type { InventoryProvider } from "./asset-model";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });
const ready = () => screen.findByRole("heading", { name: "Procesadores", level: 3 });
it("moves component focus without changing the canonical asset route or fetching again", async () => {
  window.history.replaceState(null, "", "#assets/SYNTH-ASSET-1?section=hardware&return=%23assets");
  const reader = vi.fn<HardwareReader>().mockResolvedValue(hardwareFixture());
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={reader} />); await ready();
  const hash = window.location.hash;
  await userEvent.click(within(screen.getByRole("navigation", { name: "Componentes de hardware" })).getByRole("button", { name: /Volúmenes/ }));
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Volúmenes lógicos", level: 3 }));
  expect(window.location.hash).toBe(hash); expect(reader).toHaveBeenCalledTimes(1);
});
it("replays only the decorative signature and expands technical detail with native keyboard semantics", async () => {
  const reader = vi.fn<HardwareReader>().mockResolvedValue(hardwareFixture());
  const { container } = render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={reader} />); await ready();
  const oldSvg = container.querySelector(".nexus-confluence svg");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    expect((screen.getByRole("button", { name: "Firma Confluencia estática · movimiento reducido" }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector(".nexus-confluence svg")).toBe(oldSvg);
  } else {
    await userEvent.click(screen.getByRole("button", { name: "Reproducir firma Confluencia" }));
    expect(container.querySelector(".nexus-confluence svg")).not.toBe(oldSvg);
  }
  expect(reader).toHaveBeenCalledTimes(1);
  const summary = container.querySelector<HTMLElement>(".nexus-hardware-technical summary")!;
  summary.focus(); await userEvent.keyboard("{Enter}");
  expect((summary.parentElement as HTMLDetailsElement).open).toBe(true);
});
it("does not advertise a replay when reduced motion is requested", async () => {
  const original = window.matchMedia.bind(window);
  vi.spyOn(window, "matchMedia").mockImplementation(query => query === "(prefers-reduced-motion: reduce)" ? { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList : original(query));
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => hardwareFixture()} />); await ready();
  expect(screen.queryByRole("button", { name: "Reproducir firma Confluencia" })).toBeNull();
  expect((screen.getByRole("button", { name: "Firma Confluencia estática · movimiento reducido" }) as HTMLButtonElement).disabled).toBe(true);
});
it("uses readable operational text and disables spatial motion when the browser requests it", async () => {
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => hardwareFixture()} />); await ready();
  for (const selector of [".nexus-hardware-kicker", ".nexus-hardware-fields dt", ".nexus-hardware-evidence", ".nexus-confluence > span"]) {
    expect(parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize)).toBeGreaterThanOrEqual(14);
  }
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    expect(getComputedStyle(document.querySelector(".nexus-confluence svg")!).transform).toBe("none");
    expect(getComputedStyle(document.querySelector(".nexus-confluence-lines path")!).animationName).toBe("none");
  }
});
it("keeps the local indicator aligned after section changes and records real transition frames", async () => {
  const provider: InventoryProvider = async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.map(asset => ({ ...asset, dataMode: "live" })) });
  const reader: HardwareReader = async () => hardwareFixture("DEMO-0002");
  const view = render(<Asset360 assetId="DEMO-0002" section="hardware" mode="live" provider={provider} hardwareReader={reader} />);
  await ready();
  const indicator = view.container.querySelector<HTMLElement>(".nexus-asset-nav-indicator")!;
  await new Promise<void>(done => requestAnimationFrame(() => done()));
  view.rerender(<Asset360 assetId="DEMO-0002" section="evidence" mode="live" provider={provider} hardwareReader={reader} />);
  await screen.findByRole("heading", { name: "Evidencia y fuentes", level: 2 });
  const samples: { ms: number; x: number }[] = [];
  const start = performance.now();
  await new Promise<void>(done => {
    const sample = () => {
      samples.push({ ms: Math.round(performance.now() - start), x: indicator.getBoundingClientRect().x });
      if (performance.now() - start < 350) requestAnimationFrame(sample); else done();
    };
    requestAnimationFrame(sample);
  });
  const active = screen.getByRole("navigation", { name: "Secciones de Asset 360" }).querySelector<HTMLElement>('[aria-current="page"]')!;
  expect(Math.abs(indicator.getBoundingClientRect().x - active.getBoundingClientRect().x)).toBeLessThan(1);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) expect(getComputedStyle(indicator).transitionDuration).toBe("0s");
  console.info("Hardware navigation motion", JSON.stringify({ reduced, samples }));
});
it("omits the instance label when the optional source instance is absent", async () => {
  const { sourceInstanceId: _instance, ...source } = acquisition.sourceReferences[0];
  const { container } = render(<HardwareEvidence value={{ ...acquisition, sourceReferences: [source] }} />);
  await userEvent.click(screen.getByText(/Evidencia y fechas/));
  expect(screen.getByText("Autoridad: trusted")).toBeTruthy();
  expect(container.textContent).not.toMatch(/Instancia:|undefined|null/);
  expect(screen.getByText(/Registro SYNTH-RECORD/)).toBeTruthy();
  expect(screen.getByText("Observación original")).toBeTruthy();
});
it("preserves the declared source instance and authority in evidence", async () => {
  render(<HardwareEvidence value={acquisition} />);
  await userEvent.click(screen.getByText(/Evidencia y fechas/));
  expect(screen.getByText("Instancia: synthetic-hardware-ui · Autoridad: trusted")).toBeTruthy();
});
it("shows distinct CPUs, equal-capacity DDR modules, physical media and actual logical usage", async () => {
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => hardwareFixture()} />); await ready();
  expect(screen.getByText("CPU sintética A")).toBeTruthy(); expect(screen.getByText("CPU sintética B")).toBeTruthy();
  expect(screen.getAllByText("8 GiB")).toHaveLength(2);
  for (const label of ["DDR3", "DDR4", "DDR5", "SSD SATA sintético", "SSD NVMe sintético", "HDD sintético"]) expect(screen.getByText(label)).toBeTruthy();
  const volume = screen.getByRole("region", { name: "Volúmenes lógicos" });
  expect(within(volume).getByRole("meter").getAttribute("value")).toBe(String(300 * 1024 ** 3));
  expect(within(volume).getByText("Sin asociación física verificable")).toBeTruthy();
  await userEvent.click(screen.getAllByText("Evidencia y fechas", { exact: false })[0]!);
  expect(screen.getAllByText("Recopilado por NEXUS").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Observación original").length).toBeGreaterThan(0);
});
it("keeps partial sums and missing coverage explicit", async () => {
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => partialHardware()} />); await ready();
  expect(screen.getByText(/no representa un total verificado/)).toBeTruthy();
  expect(screen.getByText("Consulta parcial sin registros disponibles.")).toBeTruthy();
  await userEvent.click(screen.getAllByText(/Ver brechas de cobertura/)[0]!);
  expect(screen.getByText(/memoryModules.capacityBytes/)).toBeTruthy();
});
it("distinguishes unknown capacity, complete empty inventory and zero volume without a fake meter", async () => {
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => unknownHardware()} />); await ready();
  expect(screen.getAllByText("Desconocida").length).toBeGreaterThan(0); expect(screen.getAllByText("0 B")).toHaveLength(2);
  expect(screen.getByText("Consulta completa sin registros.")).toBeTruthy(); expect(screen.queryByRole("meter")).toBeNull();
});
it("renders not applicable, not requested and unauthorized coverage without inventing records", async () => {
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => ({ ...hardwareFixture(), processors: { state: "not_applicable" }, memoryModules: { state: "not_requested" }, physicalStorageDevices: { state: "unavailable", reason: "unauthorized" } })} />); await ready();
  expect(screen.getByText("Esta categoría no aplica al alcance declarado.")).toBeTruthy();
  expect(screen.getByText("Esta categoría no fue solicitada.")).toBeTruthy();
  expect(screen.getByText("La fuente no autorizó la consulta")).toBeTruthy();
  expect(screen.queryByText("CPU sintética A")).toBeNull();
});
it("aborts a pending request on unmount", async () => {
  let signal!: AbortSignal;
  const view = render(<HardwareExperience assetId="id" mode="live" reader={async (_id, incoming) => { signal = incoming; return new Promise(() => {}); }} />);
  await waitFor(() => expect(signal).toBeTruthy()); view.unmount(); expect(signal.aborted).toBe(true);
});
it.each(["authentication", "forbidden", "not_found", "incompatible"] as const)("does not retry %s or expose internal errors", async kind => {
  render(<HardwareExperience assetId="id" mode="live" reader={async () => { throw new HardwareRequestError(kind); }} />);
  await screen.findByRole("alert"); expect(screen.queryByRole("button", { name: "Reintentar hardware" })).toBeNull();
  expect(screen.queryByText("Hardware request unavailable")).toBeNull();
});
it("retries a transient failure without losing the asset identity", async () => {
  const reader = vi.fn<HardwareReader>().mockRejectedValueOnce(new HardwareRequestError("unavailable")).mockResolvedValue(hardwareFixture());
  render(<HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={reader} />);
  await userEvent.click(await screen.findByRole("button", { name: "Reintentar hardware" })); await ready(); expect(reader).toHaveBeenCalledTimes(2);
});
it("rejects another asset before rendering its components", async () => {
  render(<HardwareExperience assetId="wrong" mode="live" reader={async () => hardwareFixture()} />);
  await screen.findByText("Respuesta de hardware incompatible"); expect(screen.queryByText("CPU sintética A")).toBeNull();
});
it("aborts on identity change and ignores a stale response even when the reader ignores abort", async () => {
  let resolve!: (value: unknown) => void; let oldSignal!: AbortSignal;
  const reader: HardwareReader = async (id, signal) => id === "old" ? new Promise(done => { resolve = done; oldSignal = signal; }) : hardwareFixture(id);
  const view = render(<HardwareExperience assetId="old" mode="live" reader={reader} />);
  await waitFor(() => expect(oldSignal).toBeTruthy()); expect(screen.getByRole("status", { name: "Cargando hardware" })).toBeTruthy();
  view.rerender(<HardwareExperience assetId="new" mode="live" reader={reader} />); await ready(); expect(oldSignal.aborted).toBe(true);
  resolve({ ...hardwareFixture("old"), processors: complete([]) });
  await waitFor(() => expect(screen.getByText("CPU sintética A")).toBeTruthy()); view.unmount();
});
it("aborts on leaving Hardware and never requests on inactive tabs or Demo", async () => {
  const provider: InventoryProvider = async () => ({ ...demoSnapshot, assets: demoSnapshot.assets.map(asset => ({ ...asset, dataMode: "live" })) });
  const reader = vi.fn<HardwareReader>().mockImplementation(async (_id, signal) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))));
  const view = render(<Asset360 assetId="DEMO-0002" section="inventory" mode="live" provider={provider} hardwareReader={reader} />);
  await screen.findByRole("heading", { name: "Inventario", level: 2 }); expect(reader).not.toHaveBeenCalled();
  view.rerender(<Asset360 assetId="DEMO-0002" section="hardware" mode="live" provider={provider} hardwareReader={reader} />);
  await waitFor(() => expect(reader).toHaveBeenCalledTimes(1)); const signal = reader.mock.calls[0]![1];
  view.rerender(<Asset360 assetId="DEMO-0002" section="evidence" mode="live" provider={provider} hardwareReader={reader} />); expect(signal.aborted).toBe(true);
  view.rerender(<Asset360 assetId="DEMO-0002" section="hardware" hardwareReader={reader} />);
  await screen.findByText("Hardware V2 disponible en Live"); expect(reader).toHaveBeenCalledTimes(1);
});
it("retains hardware deep links, return state, focus and history restoration in Demo", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002?section=hardware&return=%23assets%3Fq%3DDemo");
  render(<App />); const heading = await screen.findByRole("heading", { name: "Hardware", level: 2 });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(getComputedStyle(heading).outlineWidth).toBe("2px");
  expect(getComputedStyle(heading).outlineStyle).toBe("solid");
  expect(getComputedStyle(heading).outlineOffset).toBe("4px");
  const nav = screen.getByRole("navigation", { name: "Secciones de Asset 360" });
  expect(within(nav).getByRole("link", { name: "Hardware" }).getAttribute("aria-current")).toBe("page");
  await userEvent.click(within(nav).getByRole("link", { name: "Evidencia y fuentes" })); await screen.findByRole("heading", { name: "Evidencia y fuentes", level: 2 });
  expect(new URLSearchParams(window.location.hash.split("?")[1]).get("return")).toBe("#assets?q=Demo");
  window.history.back(); await screen.findByRole("heading", { name: "Hardware", level: 2 });
  window.history.forward(); await screen.findByRole("heading", { name: "Evidencia y fuentes", level: 2 });
});
it("limits large collections without merging unknown identities", async () => {
  const inventory = hardwareFixture(); if (inventory.processors.state !== "complete") throw new Error("fixture");
  render(<HardwareExperience assetId={inventory.assetId} mode="live" reader={async () => ({ ...inventory, processors: complete(Array.from({ length: 25 }, () => inventory.processors.state === "complete" ? inventory.processors.items[0]! : null)) })} />);
  await ready(); expect(screen.getAllByText("CPU sintética A")).toHaveLength(12);
  await userEvent.click(screen.getByRole("button", { name: "Mostrar más procesadores" })); expect(screen.getAllByText("CPU sintética A")).toHaveLength(24);
});
it.each(["light", "dark"])("has no axe violations and reflows at 320px in %s", async theme => {
  await page.viewport(320, 900); localStorage.setItem("igx-nexus:theme", theme);
  render(<NexusShell view="asset" mode="live"><HardwareExperience assetId="SYNTH-ASSET-1" mode="live" reader={async () => hardwareFixture()} /></NexusShell>); await ready();
  expect((await axe.run(document.body, { rules: { "region": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
});
