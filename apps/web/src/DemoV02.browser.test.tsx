import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "./App";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("valida el recorrido integrado de Technology Intelligence v0.2 en Demo", async () => {
  window.history.replaceState(null, "", "#overview");
  render(<App />);

  const overview = await screen.findByRole("heading", { name: "Technology Overview", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(overview));
  expect(screen.getByText("Datos sintéticos · escenario de demostración")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "IT / OT Intelligence", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Endpoint Experience", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Proactive Findings", level: 2 })).toBeTruthy();

  const findingsHeading = screen.getByRole("heading", { name: "Proactive Findings", level: 2 });
  const findingsSection = findingsHeading.closest("section");
  expect(findingsSection).toBeTruthy();
  const findingsView = within(findingsSection!);
  const researchDisclosures = findingsView.getAllByText("Investigar conocimiento");
  expect(researchDisclosures.length).toBeGreaterThan(0);
  const researchDetails = researchDisclosures[0]!.closest("details");
  expect(researchDetails).toBeTruthy();
  await userEvent.click(researchDisclosures[0]!);
  const researchView = within(researchDetails!);
  expect(researchView.getByText("Pregunta de investigación")).toBeTruthy();
  expect(researchView.getAllByText("Synthetic fixture").length).toBeGreaterThan(0);
  expect(researchView.getAllByText("Execution allowed: no").length).toBeGreaterThan(0);

  const lifecycleLink = screen.getAllByRole("link", { name: /Lifecycle & Investment/ })
    .find(link => link.getAttribute("href") === "#lifecycle");
  expect(lifecycleLink).toBeTruthy();
  await userEvent.click(lifecycleLink!);

  const lifecycle = await screen.findByRole("heading", { name: "Lifecycle & Investment", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(lifecycle));
  expect(screen.getByRole("heading", { name: "Planificación respaldada por evidencia", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Cobertura y vencimientos", level: 2 })).toBeTruthy();
  expect(screen.getByRole("table", { name: "Hitos lifecycle que requieren revisión" })).toBeTruthy();

  await userEvent.click(screen.getByRole("link", { name: /^Activos$/ }));
  const explorer = await screen.findByRole("heading", { name: "Explorador de activos", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(explorer));
  await page.getByRole("searchbox", { name: "Buscar activos" }).fill("SYNTH-SN-000013");
  expect(await screen.findByText("1 de 240 activos")).toBeTruthy();
  await userEvent.click(screen.getByRole("link", { name: "Consola Demo Supervisión Norte" }));

  const asset = await screen.findByRole("heading", { name: "Consola Demo Supervisión Norte", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(asset));
  expect(screen.getByText("Dataset sintético / provider demo")).toBeTruthy();
  expect(screen.getAllByText("OT").length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole("link", { name: "Abrir Technology Map" }));
  const map = await screen.findByRole("heading", { name: "Technology Map", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(map));
  expect(screen.getByText("5 relaciones visibles")).toBeTruthy();
  expect(screen.getByLabelText("Mapa visual de relaciones")).toBeTruthy();

  await userEvent.click(screen.getByRole("link", { name: "Calidad de datos" }));
  const quality = await screen.findByRole("heading", { name: "CMDB Health", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(quality));
  expect(screen.getByRole("heading", { name: "Score de registros CI", level: 2 })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Cobertura de evidencia", level: 2 })).toBeTruthy();

  expect(screen.queryByText("LIVE LAB · NEXUS API")).toBeNull();
}, 60000);
