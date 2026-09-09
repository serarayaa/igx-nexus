import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { App } from "./App";
import { demoLocatorForAsset } from "./qr-locator";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

afterEach(async () => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  await page.viewport(1440, 1000);
});

it("abre el diseñador desde Asset 360 y mueve el foco al heading final", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002");
  render(<App />);
  await screen.findByRole("heading", { name: "Desktop Demo 0002", level: 1 });
  await userEvent.click(screen.getByRole("link", { name: "Diseñar etiqueta" }));
  const heading = await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  expect(window.location.hash).toBe("#assets/DEMO-0002/label");
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(screen.getByText("50 × 25 mm · 203 DPI · 400 × 200 px")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Descargar SVG" })).toBeTruthy();
});

it("cambia perfil, DPI y contenido visible sin alterar el payload", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/label");
  const { container } = render(<App />);
  await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  const expectedLocator = demoLocatorForAsset("DEMO-0002");
  expect(screen.getByText(expectedLocator)).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Formato de etiqueta"), { target: { value: "60x40" } });
  fireEvent.change(screen.getByLabelText("DPI de impresión"), { target: { value: "300" } });
  expect(await screen.findByText("60 × 40 mm · 300 DPI · 709 × 472 px")).toBeTruthy();
  expect(container.querySelector('svg[data-label-profile="60x40"][data-dpi="300"]')).toBeTruthy();

  await userEvent.click(screen.getByRole("checkbox", { name: "Asset Tag" }));
  expect(container.querySelector(".nexus-label-output")?.textContent).toContain("DEMO-TAG-0002");
  expect(screen.getByText(expectedLocator)).toBeTruthy();
});

it("mantiene exactamente la misma salida física al cambiar light/dark", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/label");
  const { container } = render(<App />);
  await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  const output = container.querySelector(".nexus-label-output")!;
  const lightSvg = output.innerHTML;
  await userEvent.click(screen.getByRole("button", { name: "Activar tema oscuro" }));
  await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  expect(output.innerHTML).toBe(lightSvg);
  expect(output.querySelector('rect[fill="#fff"]')).toBeTruthy();
  expect(output.querySelector('g[fill="#000"]')).toBeTruthy();
});

it("simula locator → identidad NEXUS, enfoca la resolución y abre Asset 360", async () => {
  const locator = demoLocatorForAsset("DEMO-0002");
  window.history.replaceState(null, "", `#q/${locator}`);
  render(<App />);
  const heading = await screen.findByRole("heading", { name: "Resolver QR demo", level: 1 });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  expect(screen.getByText("DEMO-0002")).toBeTruthy();
  expect(screen.getByText("Autorización").parentElement?.textContent).toContain("No simulada");
  await userEvent.click(screen.getByRole("link", { name: "Abrir Asset 360" }));
  expect(await screen.findByRole("heading", { name: "Desktop Demo 0002", level: 1 })).toBeTruthy();
});

it("maneja activo y locator desconocidos sin inventar asociaciones", async () => {
  window.history.replaceState(null, "", "#assets/NO-EXISTE/label");
  const rendered = render(<App />);
  expect(await screen.findByText("Activo no encontrado")).toBeTruthy();
  rendered.unmount();
  window.history.replaceState(null, "", "#q/demo-no-existe-123456789");
  render(<App />);
  expect(await screen.findByText("QR no reconocido")).toBeTruthy();
});

it("pasa axe y reflow en viewports de demo", async () => {
  window.history.replaceState(null, "", "#assets/DEMO-0002/label");
  const { container } = render(<App />);
  await screen.findByRole("heading", { name: "Diseñar etiqueta", level: 1 });
  for (const width of [1440, 768, 390, 320]) {
    await page.viewport(width, 1000);
    const result = await axe.run(container, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    expect(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }))).toEqual([]);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  }
}, 60000);
