import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { NexusShell } from "./NexusShell";
import { DENSITY_STORAGE_KEY, THEME_STORAGE_KEY } from "./shell-preferences";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";

function resetShellState() {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.density;
  document.documentElement.style.removeProperty("color-scheme");
}

afterEach(async () => {
  cleanup();
  resetShellState();
  await page.viewport(1440, 1000);
});

it("separa navegación global de anchors contextuales en Demo", () => {
  render(<NexusShell view="dashboard" mode="demo"><h1>Contenido demo</h1></NexusShell>);

  expect(screen.getByText("Espacios de trabajo")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Panel principal" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Activos" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "CMDB Health" })).toBeTruthy();
  expect(screen.queryByText("En este panel")).toBeNull();
  expect(screen.queryByRole("link", { name: "Calidad y frescura" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Garantías y lifecycle" })).toBeNull();
  expect(screen.getByLabelText("Origen de datos: DEMO")).toBeTruthy();
  expect(screen.getByText("Dataset Demo")).toBeTruthy();
});

it("presenta Live como contexto de fuente sin sustituir superficies Demo", () => {
  render(<NexusShell view="assets" mode="live"><h1>Inventario Live</h1></NexusShell>);

  expect(screen.getByLabelText("Origen de datos: LIVE LAB")).toBeTruthy();
  expect(screen.getByText("Provider Live")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Activos" }).getAttribute("aria-current")).toBe("page");
  expect(screen.queryByRole("link", { name: "Panel principal" })).toBeNull();
  expect(screen.queryByRole("link", { name: "CMDB Health" })).toBeNull();
  expect(screen.getByText(/nunca sustituye datos Live por Demo/i)).toBeTruthy();
});

it("recupera y persiste tema y densidad sin convertirlos en estado de ruta", async () => {
  window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
  window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");

  render(<NexusShell view="assets" mode="demo"><h1>Activos</h1></NexusShell>);

  const themeToggle = screen.getByRole("button", { name: "Activar tema claro" });
  const densityToggle = screen.getByRole("button", { name: "Activar densidad cómoda" });
  expect(themeToggle).toBeTruthy();
  expect(densityToggle).toBeTruthy();

  await userEvent.click(themeToggle);
  await userEvent.click(densityToggle);

  expect(screen.getByRole("button", { name: "Activar tema oscuro" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Activar densidad compacta" })).toBeTruthy();
  expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("comfortable");
});

it("mantiene foco, Escape y restauración en navegación móvil", async () => {
  await page.viewport(390, 844);
  render(<NexusShell view="dashboard" mode="demo"><h1>Contenido demo</h1></NexusShell>);

  const open = screen.getByRole("button", { name: "Abrir navegación" });
  await userEvent.click(open);
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar navegación" })));

  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(open));
  expect(open.getAttribute("aria-expanded")).toBe("false");
});

it("mantiene un árbol accesible sin violaciones axe obvias", async () => {
  render(<NexusShell view="assets" mode="demo"><h1>Activos</h1></NexusShell>);
  const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});
