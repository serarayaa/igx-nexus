import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { before, after, test } from "node:test";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 3018;
const url = `http://127.0.0.1:${port}`;
let server;
let browser;
before(async () => {
  server = spawn(process.execPath, [resolve(root, "../../node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: root, windowsHide: true, env: { ...process.env, VITE_NEXUS_DATA_MODE: "demo" }, stdio: "ignore" });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Navigation refresh test server exited before readiness");
    try { if ((await fetch(url)).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, "test server ready");
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (server && server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
});

test("physical refresh preserves Explorer URL and Asset 360 contextual return", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${url}/#assets?q=SYNTH-SN-000002`);
    await page.getByRole("table", { name: "Inventario de activos demo" }).waitFor();
    assert.equal(await page.getByRole("searchbox").inputValue(), "SYNTH-SN-000002");
    await page.reload();
    await page.getByRole("table", { name: "Inventario de activos demo" }).waitFor();
    assert.equal(await page.getByRole("searchbox").inputValue(), "SYNTH-SN-000002");
    await page.getByRole("link", { name: "Desktop Demo 0002", exact: true }).click();
    await page.getByRole("heading", { name: "Desktop Demo 0002", level: 1 }).waitFor();
    await page.getByRole("link", { name: "Evidencia y fuentes", exact: true }).click();
    await page.reload();
    const returnLink = page.getByRole("link", { name: "Volver a investigación" });
    await returnLink.waitFor();
    const expectedReturn = "#assets?q=SYNTH-SN-000002&selected=DEMO-0002";
    assert.equal(await returnLink.getAttribute("href"), expectedReturn);
    await page.setViewportSize({ width: 320, height: 800 });
    await returnLink.click();
    await page.getByRole("table", { name: "Inventario de activos demo" }).waitFor();
    assert.equal(new URL(page.url()).hash, expectedReturn);
    assert.equal(await page.getByRole("searchbox").inputValue(), "SYNTH-SN-000002");
  } finally { await page.close(); }
});

test("Graph deep link has explicit table fallback without dropping selection or filter", async () => {
  const page = await browser.newPage();
  try {
    const hash = "#assets?view=graph&f.domain=REMOVED&selected=REMOVED&root=REMOVED";
    await page.goto(url + "/" + hash);
    await page.getByText("La vista de mapa no está disponible para este enlace. Se muestra el inventario y se conserva el contexto solicitado.").waitFor();
    await page.getByText("No hay activos que coincidan", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, hash);
    assert.equal(await page.getByRole("combobox", { name: "Dominio", exact: true }).inputValue(), "REMOVED");
    await page.reload();
    await page.getByText("No hay activos que coincidan", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, hash);
  } finally { await page.close(); }
});

test("Hardware deep link survives physical refresh, history, and contextual return without HTTP", async () => {
  const page = await browser.newPage();
  const requests = [];
  page.on("request", request => { if (request.url().includes("/api/")) requests.push(request.url()); });
  try {
    const returnHash = "#assets?q=SYNTH-SN-000002&selected=DEMO-0002";
    const hash = `#assets/DEMO-0002?section=hardware&return=${encodeURIComponent(returnHash)}`;
    await page.goto(url + "/" + hash);
    await page.getByText("Hardware V2 disponible en Live", { exact: true }).waitFor();
    await page.reload();
    const heading = page.getByRole("heading", { name: "Hardware", level: 2 });
    await heading.waitFor();
    assert.equal(new URL(page.url()).hash, hash);
    await page.waitForFunction(() => document.activeElement?.id === "hardware-heading");
    await page.getByRole("link", { name: "Evidencia y fuentes", exact: true }).click();
    await page.getByRole("heading", { name: "Evidencia y fuentes", level: 2 }).waitFor();
    await page.goBack(); await heading.waitFor();
    await page.goForward(); await page.getByRole("heading", { name: "Evidencia y fuentes", level: 2 }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Volver a investigación" }).getAttribute("href"), returnHash);
    assert.deepEqual(requests, []);
  } finally { await page.close(); }
});

test("Software deep link survives physical refresh, focus, history and return without Demo HTTP", async () => {
  const page = await browser.newPage(); const requests = [];
  page.on("request", request => { if (request.url().includes("/api/")) requests.push(request.url()); });
  try {
    const returnHash = "#assets?q=SYNTH-SN-000002&selected=DEMO-0002";
    const hash = `#assets/DEMO-0002?section=software&return=${encodeURIComponent(returnHash)}`;
    await page.goto(url + "/" + hash); await page.getByText("Sistema y software disponible en Live", { exact: true }).waitFor();
    await page.reload(); const heading = page.getByRole("heading", { name: "Sistema y software", level: 2 }); await heading.waitFor();
    assert.equal(new URL(page.url()).hash, hash);
    await page.waitForFunction(() => document.activeElement?.id === "software-heading");
    await page.getByRole("link", { name: "Hardware", exact: true }).click(); await page.getByRole("heading", { name: "Hardware", level: 2 }).waitFor();
    await page.goBack(); await heading.waitFor(); await page.goForward(); await page.getByRole("heading", { name: "Hardware", level: 2 }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Volver a investigación" }).getAttribute("href"), returnHash);
    assert.deepEqual(requests, []);
  } finally { await page.close(); }
});
