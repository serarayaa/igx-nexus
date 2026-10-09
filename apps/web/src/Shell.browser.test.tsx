import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { NexusShell } from "./NexusShell";
import { DENSITY_STORAGE_KEY, THEME_STORAGE_KEY, NAVIGATION_STORAGE_KEY } from "./shell-preferences";
import "@igx-nexus/ui/styles.css";
import "./dashboard.css";
import "./asset-360.css";

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

it("collapses to a labelled rail without changing route, selection, content or source context", async () => {
  await page.viewport(1440, 1000);
  window.history.replaceState(null, "", "#assets?q=synthetic&selected=DEMO-0002");
  render(<NexusShell view="asset" mode="live"><h1>Activo sintético</h1><input aria-label="Trabajo conservado" defaultValue="nota" /></NexusShell>);
  const hash = window.location.hash;
  await userEvent.click(screen.getByRole("button", { name: "Contraer navegación" }));
  expect(document.querySelector(".igx-app-shell")?.getAttribute("data-navigation")).toBe("rail");
  expect(window.localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBe("rail");
  expect(screen.getByRole("link", { name: "Activos" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Overview" }).getAttribute("href")).toBe("#overview");
  expect(screen.getByRole("link", { name: "IGX NEXUS, inicio" })).toBeTruthy();
  expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("nota");
  expect(window.location.hash).toBe(hash);
  expect(document.querySelector(".nexus-shell-mode")?.textContent).toContain("LIVE LAB");
  const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
  cleanup();
  render(<NexusShell view="assets"><h1>Restaurado</h1></NexusShell>);
  expect(screen.getByRole("button", { name: "Expandir navegación" }).getAttribute("aria-expanded")).toBe("false");
  await userEvent.click(screen.getByRole("button", { name: "Expandir navegación" }));
  expect(window.localStorage.getItem(NAVIGATION_STORAGE_KEY)).toBe("expanded");
});

it("keeps a full mobile drawer even when desktop rail is saved, traps focus and unlocks background", async () => {
  window.localStorage.setItem(NAVIGATION_STORAGE_KEY, "rail");
  await page.viewport(320, 844);
  const { rerender } = render(<NexusShell view="dashboard"><h1>Contenido</h1></NexusShell>);
  const open = screen.getByRole("button", { name: "Abrir navegación" });
  await userEvent.click(open);
  const close = screen.getByRole("button", { name: "Cerrar navegación" });
  await waitFor(() => expect(document.activeElement).toBe(close));
  expect(document.querySelector("main")?.hasAttribute("inert")).toBe(true);
  expect(document.body.style.overflow).toBe("hidden");
  await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "Calidad de datos" }));
  await userEvent.keyboard("{Tab}");
  expect(document.activeElement).toBe(close);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  const link = screen.getByRole("link", { name: "Activos" });
  expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(getComputedStyle(link.querySelector("span")!).clipPath).toBe("none");
  await userEvent.click(link);
  expect(open.getAttribute("aria-expanded")).toBe("false");
  expect(document.querySelector("main")?.hasAttribute("inert")).toBe(false);
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(window.location.hash).toBe("#assets");
  rerender(<NexusShell view="assets"><h1>Activos</h1></NexusShell>);
  expect(link.getAttribute("aria-current")).toBe("page");
});

it("closes mobile navigation on desktop breakpoint without leaving inert content", async () => {
  await page.viewport(390, 844);
  render(<NexusShell><h1>Contenido</h1></NexusShell>);
  await userEvent.click(screen.getByRole("button", { name: "Abrir navegación" }));
  await page.viewport(1440, 1000);
  await waitFor(() => expect(document.querySelector("main")?.hasAttribute("inert")).toBe(false));
  expect(document.body.style.overflow).not.toBe("hidden");
  expect(document.querySelector(".igx-app-shell__navigation")?.getAttribute("data-open")).toBe("false");
  expect(document.activeElement).toBe(screen.getByRole("link", { name: "IGX NEXUS, inicio" }));
});

it("reflows the long workspace title and all global controls at 320px", async () => {
  await page.viewport(320, 844);
  render(<NexusShell view="lifecycle"><h1>Contenido</h1></NexusShell>);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
  const title = document.querySelector(".igx-app-header__title")!;
  expect(title.querySelector(".nexus-workspace-name")?.textContent).toBe("Lifecycle & Investment");
  expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(320);
  expect(document.querySelector(".nexus-header-product strong")!.getBoundingClientRect().height).toBeGreaterThan(0);
  for (const button of document.querySelectorAll<HTMLButtonElement>(".igx-app-header button")) {
    expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(320);
  }
  const result = await axe.run(document.body, { rules: { region: { enabled: false } } });
  expect(result.violations).toEqual([]);
});

it("identifies NEXUS in the header without adding a heading and integrates the desktop control", async () => {
  await page.viewport(1440, 1000);
  render(<NexusShell view="assets"><h1>Inventario</h1></NexusShell>);
  const header = screen.getByRole("banner");
  expect(header.querySelector(".nexus-header-product strong")?.textContent).toBe("NEXUS");
  expect(header.querySelector("h1, h2, h3")).toBeNull();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  const brand = screen.getByRole("link", { name: "IGX NEXUS, inicio" }).getBoundingClientRect();
  const toggle = screen.getByRole("button", { name: "Contraer navegación" }).getBoundingClientRect();
  expect(toggle.left).toBeGreaterThanOrEqual(brand.right);
  expect(toggle.top).toBeLessThan(brand.bottom);
  expect(toggle.height).toBeGreaterThanOrEqual(44);
  expect(header.querySelector(".nexus-shell-mode")?.textContent).toContain("DEMO");
});

it("signals workspace changes only in the header, preserving content, focus, scroll and route", async () => {
  await page.viewport(1440, 1000);
  window.history.replaceState({ audit: "preserved" }, "", "#assets?q=synthetic");
  const content = <><h1>Contenido conservado</h1><input aria-label="Nota conservada" defaultValue="borrador" /><div style={{ height: 2000 }} /></>;
  const { rerender } = render(<NexusShell view="assets">{content}</NexusShell>);
  const main = screen.getByRole("main");
  const field = screen.getByRole("textbox") as HTMLInputElement;
  field.value = "edición local";
  window.scrollTo(0, 420);
  field.focus({ preventScroll: true });
  const scroll = window.scrollY;
  const signal = document.querySelector(".nexus-workspace-signal");
  rerender(<NexusShell view="lifecycle">{content}</NexusShell>);
  expect(screen.getByRole("main")).toBe(main);
  expect(screen.getByRole("textbox")).toBe(field);
  expect(field.value).toBe("edición local");
  expect(document.activeElement).toBe(field);
  expect(window.scrollY).toBe(scroll);
  expect(window.location.hash).toBe("#assets?q=synthetic");
  expect(window.history.state).toEqual({ audit: "preserved" });
  const nextSignal = document.querySelector(".nexus-workspace-signal")!;
  expect(nextSignal).not.toBe(signal);
  expect(nextSignal.getAttribute("aria-hidden")).toBe("true");
  expect(getComputedStyle(nextSignal).animationName).toBe(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "nexus-workspace-arrive");
  expect(main.getAnimations({ subtree: true })).toHaveLength(0);
  rerender(<NexusShell view="lifecycle">{content}</NexusShell>);
  expect(document.querySelector(".nexus-workspace-signal")).toBe(nextSignal);
  window.scrollTo(0, 0);
});

it("keeps shell states understandable under the actual browser motion and forced-color preferences", async () => {
  await page.viewport(1440, 1000);
  render(<NexusShell view="assets"><h1>Contenido</h1></NexusShell>);
  const active = screen.getByRole("link", { name: "Activos" });
  expect(active.getAttribute("aria-current")).toBe("page");
  expect(getComputedStyle(active, "::before").transform).not.toBe("none");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    expect(getComputedStyle(active).transitionDuration).toBe("0s");
    expect(getComputedStyle(active, "::before").transitionDuration).toBe("0s");
    expect(getComputedStyle(document.querySelector(".nexus-mark path")!).animationName).toBe("none");
  }
  if (window.matchMedia("(forced-colors: active)").matches) {
    expect(getComputedStyle(active).textDecorationLine).toContain("underline");
    expect(getComputedStyle(active).outlineStyle).toBe("solid");
    expect(getComputedStyle(active).outlineWidth).toBe("2px");
  }
  await userEvent.click(screen.getByRole("button", { name: "Contraer navegación" }));
  expect(screen.getByRole("button", { name: "Expandir navegación" })).toBeTruthy();
  expect(active.getAttribute("aria-current")).toBe("page");
});

function contrast(a: string, b: string) {
  const luminance = (value: string) => {
    const [r, g, b] = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
    return r! * .2126 + g! * .7152 + b! * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
it.each(["light", "dark"])("verifies navigation text, mark and selection contrast in %s", async theme => {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  render(<NexusShell view="asset"><section className="nexus-asset-360"><h1>Contenido</h1></section></NexusShell>);
  if (window.matchMedia("(forced-colors: active)").matches) return; // System colors verified separately.
  const plane = getComputedStyle(document.querySelector(".igx-app-shell__navigation")!).backgroundColor;
  const active = screen.getByRole("link", { name: "Activos" });
  const style = getComputedStyle(active);
  expect(style.color).toBe(getComputedStyle(document.querySelector(".igx-app-shell__navigation")!).color);
  expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(getComputedStyle(screen.getByRole("link", { name: "Overview" })).color, plane)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(getComputedStyle(document.querySelector(".nexus-nav-heading")!).color, plane)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(getComputedStyle(document.querySelector(".nexus-mark")!).color, plane)).toBeGreaterThanOrEqual(3);
  expect(contrast(getComputedStyle(active, "::before").backgroundColor, plane)).toBeGreaterThanOrEqual(3);
});
