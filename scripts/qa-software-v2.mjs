// Review the built Storybook using only injected synthetic readers. No API or GLPI access.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import axe from "axe-core";
import assert from "node:assert/strict";
const root = resolve("packages/ui/storybook-static"), output = resolve(process.argv[2] ?? ".tmp/pr9-audit/visual");
await mkdir(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer(async (request, response) => {
  try {
    const path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (!path.startsWith(root + sep)) throw new Error("Outside static root");
    response.setHeader("content-type", mime[extname(path)] ?? "application/octet-stream"); response.end(await readFile(path));
  } catch { response.writeHead(404); response.end("Not found"); }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const cases = [
    { name: "desktop-light-comfortable", width: 1440, height: 1000, theme: "light", density: "comfortable" },
    { name: "desktop-dark-compact", width: 1440, height: 1000, theme: "dark", density: "compact" },
    { name: "tablet-light-compact", width: 768, height: 1024, theme: "light", density: "compact" },
    { name: "mobile-light-comfortable", width: 320, height: 900, theme: "light", density: "comfortable" },
    { name: "mobile-dark-compact", width: 390, height: 844, theme: "dark", density: "compact" },
    { name: "forced-colors-reduced-motion", width: 768, height: 1024, theme: "light", density: "comfortable", forced: true },
    { name: "zoom-200", width: 1280, height: 1000, theme: "light", density: "comfortable", zoom: true },
    { name: "partial-tablet", width: 768, height: 1024, theme: "light", density: "comfortable", scenario: "partial" },
    { name: "unknown-mobile", width: 390, height: 844, theme: "dark", density: "compact", scenario: "unknown" },
    { name: "empty-desktop", width: 1280, height: 900, theme: "light", density: "comfortable", scenario: "empty" },
    { name: "loading-desktop", width: 1280, height: 900, theme: "light", density: "comfortable", scenario: "loading" },
    { name: "error-desktop", width: 1280, height: 900, theme: "light", density: "comfortable", scenario: "error-retry" },
  ];
  for (const config of cases) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, reducedMotion: config.forced ? "reduce" : "no-preference", forcedColors: config.forced ? "active" : "none" });
    await context.addInitScript(({ theme, density }) => { localStorage.setItem("igx-nexus:theme", theme); localStorage.setItem("igx-nexus:density", density); }, config);
    const page = await context.newPage(); const apiCalls = []; const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) { apiCalls.push(url.pathname); return route.abort(); }
      return url.origin === base || url.protocol === "data:" ? route.continue() : route.abort();
    });
    try {
      await page.goto(`${base}/iframe.html?id=web-asset-360-software-os-v2--${config.scenario ?? "complete"}&viewMode=story`);
      if (config.scenario === "loading") await page.getByText("Cargando sistema y software", { exact: true }).waitFor();
      else if (config.scenario === "error-retry") await page.getByRole("button", { name: "Reintentar sistema y software" }).waitFor();
      else await page.getByRole("heading", { name: "Software instalado", level: 3 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (config.zoom) await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
      assert.equal(await page.locator("html").getAttribute("data-theme"), config.theme);
      assert.equal(await page.locator("html").getAttribute("data-density"), config.density);
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
        table: document.querySelector(".nexus-software-table-scroll") ? { width: document.querySelector(".nexus-software-table-scroll").clientWidth, content: document.querySelector(".nexus-software-table-scroll").scrollWidth } : null,
        animation: getComputedStyle(document.querySelector(".nexus-software")).animationName }));
      assert(geometry.width <= geometry.viewport, `Global overflow ${config.name}: ${JSON.stringify(geometry)}`);
      if (config.forced) assert.equal(geometry.animation, "none");
      // Keep a private axe instance: Storybook's addon can run its own instance concurrently.
      await page.addScriptTag({ content: `(() => { const previous = window.axe; ${axe.source}\nwindow.__nexusSoftwareAxe = window.axe; window.axe = previous; })();` });
      const violations = await page.evaluate(async () => {
        const reviewAxe = window.__nexusSoftwareAxe;
        // Hash-router links in the horizontally scrolled nav are not document skip links.
        // All other rules still inspect them; the real Shell skip link remains covered.
        reviewAxe.configure({ rules: [{ id: "skip-link", selector: 'a[href]:not(.nexus-asset-local-nav a)' }] });
        try { return (await reviewAxe.run(document.body, { rules: { region: { enabled: false } } })).violations.map(value => ({ id: value.id, impact: value.impact, nodes: value.nodes.map(node => node.target) })); }
        finally { reviewAxe.reset(); }
      });
      assert.deepEqual(violations, [], `Axe ${config.name}`);
      await page.screenshot({ path: resolve(output, `${config.name}.png`), fullPage: true });
      if (config.name === "desktop-light-comfortable") {
        const sort = page.getByRole("button", { name: "Software", exact: true }); await sort.focus(); await page.keyboard.press("Enter");
        assert.equal(await sort.locator("..").getAttribute("aria-sort"), "descending");
        const summary = page.locator(".nexus-software-installation-evidence > summary").first(); await summary.focus(); await page.keyboard.press("Enter");
        assert(await summary.locator("..").evaluate(element => element.open));
        await page.screenshot({ path: resolve(output, "desktop-keyboard-evidence.png"), fullPage: true });
      }
      assert.deepEqual(apiCalls, []); assert.deepEqual(errors, []);
      results.push({ ...config, ...geometry, violations, apiCalls, errors, screenshot: `${config.name}.png` });
    } finally { await context.close(); }
  }
} finally {
  await browser.close(); await new Promise(done => server.close(done));
  await writeFile(resolve(output, "results.json"), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify({ syntheticOnly: true, cases: results.length, results }, null, 2));
