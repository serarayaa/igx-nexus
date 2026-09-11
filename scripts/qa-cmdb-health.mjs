/** Browser QA against the production build. Synthetic data only; writes temporary CI evidence. */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const server = spawn(process.execPath, [new URL("../node_modules/vite/bin/vite.js", import.meta.url).pathname, "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
  cwd: new URL("../apps/web/", import.meta.url), stdio: ["ignore", "pipe", "inherit"],
});
// Vite may be hoisted; run the root binary with the Web working directory.
let browser;
const failures = [];
try {
  await Promise.race([
    new Promise((resolve, reject) => {
      server.stdout.on("data", data => { if (data.toString().includes("4173")) resolve(); });
      server.once("exit", code => reject(new Error(`preview exited: ${code}`)));
    }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error("preview timeout")), 15000); timer.unref(); }),
  ]);
  browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", error => failures.push(error.message));
  await mkdir("qa-artifacts", { recursive: true });
  const checks = [];
  const ensureTheme = async theme => {
    const current = await page.evaluate(() => document.documentElement.dataset.theme);
    if (current !== theme) {
      await page.getByRole("button", { name: theme === "dark" ? "Activar tema oscuro" : "Activar tema claro" }).click();
    }
    await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, theme);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme, `theme ${theme}`);
  };
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.goto("http://127.0.0.1:4173/#health");
      await page.getByRole("heading", { name: "Score de registros CI" }).waitFor();
      await ensureTheme(theme);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width} ${theme}`);
      await page.screenshot({ path: `qa-artifacts/health-${width}-${theme}.png`, fullPage: false });
      checks.push(`reflow ${width} ${theme}`);
    }
  }
  // CMDB-012: real catalog across every consumer, including longer OT names.
  const routes = [
    ["overview", "Panel principal"], ["assets", "Explorador de activos"],
    ["assets/DEMO-0013", "Consola Demo Supervisión Norte"],
    ["assets/DEMO-0013/label", "Diseñar etiqueta"],
    ["assets/DEMO-0013/relations", "Grafo de Relaciones"],
    ["assets/DEMO-0020", "Estación Demo Por revisar"],
  ];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [route, title] of routes) {
      await page.goto(`http://127.0.0.1:4173/#${route}`);
      await page.getByRole("heading", { name: title, level: 1, exact: true }).waitFor();
      for (const theme of ["light", "dark"]) {
        await ensureTheme(theme);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `dataset overflow ${route} ${width} ${theme}`);
        await page.screenshot({ path: `qa-artifacts/dataset-${route.replaceAll("/", "-")}-${width}-${theme}.png` });
        checks.push(`dataset ${route} ${width} ${theme}`);
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto("http://127.0.0.1:4173/#overview");
  await page.getByRole("button", { name: /Abrir navegación/ }).click();
  await page.getByRole("link", { name: "CMDB Health", exact: true }).first().click();
  await page.getByRole("heading", { name: "Score de registros CI" }).waitFor();
  assert(await page.getByRole("link", { name: "CMDB Health", exact: true, includeHidden: true }).getAttribute("aria-current") === "page");
  checks.push("mobile navigation drawer → Health");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.getByRole("combobox", { name: "Estado Health", exact: true }).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  assert(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none"));
  assert(await page.evaluate(() => matchMedia("(forced-colors: active)").matches && matchMedia("(prefers-reduced-motion: reduce)").matches));
  await page.screenshot({ path: "qa-artifacts/health-forced-colors.png" });
  checks.push("forced-colors + reduced-motion + keyboard focus");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:4173/#assets/DEMO-0013/relations");
  const otNode = page.getByRole("button", { name: "Switch Demo Celda Norte", exact: true });
  await otNode.focus();
  await otNode.press("Enter");
  assert.equal(await otNode.getAttribute("aria-pressed"), "true");
  await page.screenshot({ path: "qa-artifacts/dataset-ot-forced-colors.png" });
  checks.push("OT graph forced-colors + reduced-motion + keyboard selection");
  await page.setViewportSize({ width: 320, height: 1000 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "OT forced-colors reflow");
  await page.screenshot({ path: "qa-artifacts/dataset-ot-forced-colors-320.png" });
  // Restore Health before checking its existing 200% text contract.
  await page.goto("http://127.0.0.1:4173/#health");
  await page.getByRole("heading", { name: "Score de registros CI" }).waitFor();
  await page.emulateMedia({ forcedColors: "none", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "200% text reflow");
  checks.push("320px + 200% text enlargement");
  await page.goto("http://127.0.0.1:4173/#assets/DEMO-0001");
  const health = page.getByRole("region", { name: "CMDB Health", exact: true });
  await health.getByText("Observación desconocida", { exact: true }).waitFor();
  await health.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "qa-artifacts/asset-health-320.png" });
  assert.deepEqual(failures, []);
  await writeFile("qa-artifacts/checks.json", JSON.stringify({ checks, pageErrors: failures }, null, 2));
  console.log(JSON.stringify({ checks, pageErrors: failures }, null, 2));
} finally {
  await browser?.close();
  if (server.exitCode === null) { server.kill("SIGTERM"); await once(server, "exit"); }
}
