import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import { demoLocatorForAsset } from "./qr-locator";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("recorre Overview → Explorer → Asset 360 → QR → Graph → Health conservando identidad y preferencias", async () => {
  window.history.replaceState(null, "", "#overview");
  render(<App />);

  const dashboardHeading = await screen.findByRole("heading", { name: "Technology Overview", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(dashboardHeading));
  await userEvent.click(screen.getByRole("button", { name: "Activar tema oscuro" }));
  await userEvent.click(screen.getByRole("button", { name: "Activar densidad compacta" }));
  await userEvent.click(screen.getByRole("link", { name: "Explorar activos" }));

  const explorerHeading = await screen.findByRole("heading", { name: "Explorador de activos", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(explorerHeading));
  await page.getByRole("searchbox", { name: "Buscar activos" }).fill("SYNTH-SN-000013");
  expect(await screen.findByText("1 de 240 activos")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Consola Demo Supervisión Norte" }));

  const assetHeading = await screen.findByRole("heading", { name: "Consola Demo Supervisión Norte", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(assetHeading));
  expect(screen.getByText("Dataset sintético / provider demo")).toBeTruthy();
  const assetHealth = screen.getByRole("region", { name: "CMDB Health" });
  expect(await within(assetHealth).findByRole("link", { name: "Ver CMDB Health global" })).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Diseñar etiqueta" }));

  const labelHeading = await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(labelHeading));
  const locator = demoLocatorForAsset("DEMO-0013");
  const payload = `https://nexus-demo.invalid/q/${locator}`;
  expect(screen.getByText(locator)).toBeTruthy();
  expect(screen.getByText(payload)).toBeTruthy();
  expect(payload).not.toContain("SYNTH-SN-000013");
  expect(payload).not.toContain("demo-cl-0013");
  await userEvent.click(screen.getByRole("link", { name: "Probar resolución demo" }));

  const resolverHeading = await screen.findByRole("heading", { name: "Resolver QR demo", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(resolverHeading));
  expect(screen.getByText("DEMO-0013")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Abrir Asset 360" }));
  await screen.findByRole("heading", { name: "Consola Demo Supervisión Norte", level: 1 });
  await userEvent.click(screen.getByRole("link", { name: "Abrir grafo de relaciones" }));

  const graphHeading = await screen.findByRole("heading", { name: "Grafo de Relaciones", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(graphHeading));
  expect(screen.getByText("5 relaciones visibles")).toBeTruthy();
  const depth = screen.getByRole("combobox", { name: "Profundidad" });
  await userEvent.selectOptions(depth, "1");
  expect(await screen.findByText("2 relaciones visibles")).toBeTruthy();
  await userEvent.selectOptions(depth, "2");
  expect(await screen.findByText("5 relaciones visibles")).toBeTruthy();
  const visual = screen.getByLabelText("Mapa visual de relaciones");
  await userEvent.click(within(visual).getByRole("button", { name: "Switch Demo Celda Norte" }));
  const selection = screen.getByRole("region", { name: "Switch Demo Celda Norte" });
  expect(within(selection).getByRole("link", { name: "Enfocar este CI" })).toBeTruthy();

  await userEvent.click(screen.getByRole("link", { name: "Calidad de datos" }));
  const healthHeading = await screen.findByRole("heading", { name: "CMDB Health", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(healthHeading));
  expect(screen.getByRole("heading", { name: "Score de registros CI", level: 2 })).toBeTruthy();
  const coverageHeading = screen.getByRole("heading", { name: "Cobertura de evidencia", level: 2 });
  const coveragePanel = coverageHeading.parentElement;
  expect(coveragePanel).toBeTruthy();
  expect(within(coveragePanel!).getByText("96 %")).toBeTruthy();
  expect(within(coveragePanel!).getByText("240 de 240 CI evaluados · 100 %")).toBeTruthy();
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.dataset.density).toBe("compact");
}, 60000);
