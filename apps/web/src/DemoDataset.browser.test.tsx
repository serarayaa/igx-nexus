import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { demoHeroes, demoDataset } from "./demo-dataset";
import { demoLocatorForAsset } from "./qr-locator";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => { cleanup(); window.history.replaceState(null, "", window.location.pathname); await page.viewport(1440, 1000); });

it.each(demoHeroes)("opens documented hero $assetId with the shared identity and Health", async ({ assetId }) => {
  const asset = demoDataset.inventory.assets.find(a => a.id === assetId)!;
  window.history.replaceState(null, "", `#assets/${assetId}`);
  render(<App />);
  const heading = await screen.findByRole("heading", { name: asset.name, level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  const health = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(health).findByRole("link", { name: "Ver CMDB Health global" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Diseñar etiqueta" }).getAttribute("href")).toBe(`#assets/${assetId}/label`);
});

it("keeps identity through Explorer → Asset 360 → label → resolver → Asset 360", async () => {
  window.history.replaceState(null, "", "#assets"); render(<App />);
  await screen.findByRole("table", { name: "Inventario de activos demo" });
  await page.getByRole("searchbox", { name: "Buscar activos" }).fill("SYNTH-SN-000013");
  await userEvent.click(screen.getByRole("link", { name: "Consola Demo Supervisión Norte" }));
  await screen.findByRole("heading", { name: "Consola Demo Supervisión Norte", level: 1 });
  await userEvent.click(screen.getByRole("link", { name: "Diseñar etiqueta" }));
  const labelHeading = await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(labelHeading));
  const locator = demoLocatorForAsset("DEMO-0013");
  expect(screen.getByText(locator)).toBeTruthy();
  const resolver = document.querySelector<HTMLAnchorElement>(`a[href="#q/${locator}"]`);
  expect(resolver).not.toBeNull();
  await userEvent.click(resolver!);
  await screen.findByRole("heading", { name: "Resolver QR demo", level: 1 });
  expect(screen.getByText("DEMO-0013")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Abrir Asset 360" }));
  await screen.findByRole("heading", { name: "Consola Demo Supervisión Norte", level: 1 });
});

it("filters actual degraded records and drills down to actionable causes", async () => {
  window.history.replaceState(null, "", "#health"); render(<App />);
  await screen.findByRole("heading", { name: "Score de registros CI" });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Estado Health" }), "degraded");
  expect(screen.getByText("12 CI coinciden · Página 1 de 1")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Estación Demo Por revisar" }));
  await screen.findByRole("heading", { name: "Estación Demo Por revisar", level: 1 });
  const health = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(health).findByText("Degradado", { selector: "span" })).toBeTruthy();
  expect(within(health).getByText("Falta serial")).toBeTruthy();
  expect(within(health).getByText("Falta asset tag")).toBeTruthy();
});

it("keeps the OT graph legible and accessible in both themes and all demo widths", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0013/relations");
  const { container } = render(<App />);
  await screen.findByRole("heading", { name: "Technology Map", level: 1 });
  expect(screen.getByText("5 relaciones visibles")).toBeTruthy();
  for (const width of [1440, 768, 390, 320]) {
    await page.viewport(width, 1000);
    for (const theme of ["light", "dark"]) {
      if (document.documentElement.dataset.theme !== theme) await userEvent.click(screen.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }));
      const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
      expect(result.violations.map(v => v.id)).toEqual([]);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    }
  }
}, 60000);
