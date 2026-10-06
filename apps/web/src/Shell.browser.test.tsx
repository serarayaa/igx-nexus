import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { NexusShell } from "./NexusShell";
import { DENSITY_STORAGE_KEY, THEME_STORAGE_KEY } from "./shell-preferences";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";
import { assetReturnHash, buildContextualAssetLink, parseInvestigationHash } from "./navigation-state";

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
  expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Activos" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Calidad de datos" })).toBeTruthy();
  expect(screen.queryByText("En este panel")).toBeNull();
  expect(screen.queryByRole("link", { name: "Calidad y frescura" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Garantías y lifecycle" })).toBeNull();
  expect(document.querySelector(".nexus-shell-mode")?.textContent).toContain("DEMO");
  expect(screen.getByText("Dataset Demo")).toBeTruthy();
});

it("presenta Live como contexto de fuente con Overview compartido y sin superficies Demo exclusivas", () => {
  render(<NexusShell view="assets" mode="live"><h1>Inventario Live</h1></NexusShell>);

  expect(document.querySelector(".nexus-shell-mode")?.textContent).toContain("LIVE LAB");
  expect(screen.getByText("Provider Live")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Activos" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Overview" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Calidad de datos" })).toBeNull();
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

it("reducir navegación persiste sólo disposición y preserva investigación y foco", async () => {
  const origin = "#assets?view=graph&q=router&f.domain=OT&selected=NEXUS-42&root=NEXUS-24&depth=1&type=uses";
  window.history.replaceState(null, "", origin);
  render(<NexusShell view="assets"><h1>Inventario</h1></NexusShell>);
  const control = screen.getByLabelText("Reducir navegación");
  await userEvent.click(control);
  expect(window.location.hash).toBe(origin);
  expect(screen.getByRole("link", { name: "Activos" }).getAttribute("href")).toBe(origin);
  expect(document.querySelector(".igx-app-shell")?.getAttribute("data-collapsed")).toBe("true");
  expect(document.activeElement).toBe(screen.getByLabelText("Expandir navegación"));
  expect(window.localStorage.getItem("igx-nexus:navigation-collapsed")).toBe("true");
  cleanup();
  render(<NexusShell view="assets"><h1>Inventario</h1></NexusShell>);
  expect(screen.getByLabelText("Expandir navegación")).toBeTruthy();
  window.history.replaceState(null, "", window.location.pathname);
});

it("enlace global Activos desde Asset360 consume return validado sin historia paralela", () => {
  const origin = parseInvestigationHash("#assets?q=router&f.domain=OT&selected=NEXUS-42").state;
  const hash = buildContextualAssetLink("NEXUS-42", origin);
  window.history.replaceState(null, "", hash);
  render(<NexusShell view="asset"><h1>Asset 360</h1></NexusShell>);
  expect(screen.getByRole("link", { name: "Activos" }).getAttribute("href")).toBe(assetReturnHash(hash));
  expect(window.location.hash).toBe(hash);
  window.history.replaceState(null, "", window.location.pathname);
});

it("drawer a320 aísla fondo, retiene Tab/ShiftTab y restaura scroll/foco", async () => {
  await page.viewport(320, 800);
  render(<NexusShell><h1>Contenido</h1></NexusShell>);
  const open = screen.getByRole("button", { name: "Abrir navegación" });
  await userEvent.click(open);
  const dialog = screen.getByRole("dialog", { name: "Navegación de la aplicación" });
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(screen.getByRole("main").hasAttribute("inert")).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(dialog.contains(document.activeElement)).toBe(true);
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar navegación" }));
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(document.activeElement).toBe(open));
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
});

it("tablet mantiene rail etiquetado y resize no cambia query ni selección", async () => {
  const hash = "#assets?q=OT&selected=NEXUS-42";
  window.history.replaceState(null, "", hash);
  await page.viewport(768, 1000);
  render(<NexusShell view="assets"><h1>Activos</h1></NexusShell>);
  expect(screen.queryByRole("button", { name: "Abrir navegación" })).toBeNull();
  expect(screen.getByRole("link", { name: "Lifecycle & Investment" })).toBeTruthy();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(768);
  await page.viewport(320, 800);
  expect(window.location.hash).toBe(hash);
  expect(screen.getByRole("button", { name: "Abrir navegación" })).toBeTruthy();
  window.history.replaceState(null, "", window.location.pathname);
});

it("skip link mueve foco sin reemplazar el fragmento de investigación", async () => {
  const hash = "#assets?q=OT&f.domain=OT&selected=NEXUS-42";
  window.history.replaceState(null, "", hash);
  render(<NexusShell view="assets"><h1>Activos</h1></NexusShell>);
  const skip=screen.getByRole("link", {name:"Saltar al contenido principal"});
  skip.focus();
  await userEvent.keyboard("{Enter}");
  expect(document.activeElement).toBe(screen.getByRole("main"));
  expect(window.location.hash).toBe(hash);
  window.history.replaceState(null, "", window.location.pathname);
});
