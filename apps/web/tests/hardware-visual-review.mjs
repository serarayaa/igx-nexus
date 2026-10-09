import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium } from "playwright";

/** Local, synthetic Storybook review only. Does not start or contact any Live provider. */
const base = new URL(process.argv[2] ?? "http://127.0.0.1:6008");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Use a local Storybook instance");
const output = resolve(process.argv[3] ?? "qa-artifacts/hardware-v2");
await mkdir(output, { recursive: true });
const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const scenarios = [
    { name: "desktop-light", story: "complete", theme: "light", width: 1440 },
    { name: "desktop-dark", story: "complete", theme: "dark", width: 1440 },
    { name: "mobile", story: "complete", theme: "light", width: 390 },
    { name: "partial", story: "partial", theme: "light", width: 1440 },
    { name: "unknown", story: "unknown", theme: "dark", width: 1440 },
    { name: "loading", story: "loading", theme: "light", width: 1440 },
    { name: "error", story: "error-retry", theme: "light", width: 1440 },
    { name: "retry-recovered", story: "retry-recovered", theme: "light", width: 1440 },
    { name: "reduced-motion", story: "complete", theme: "light", width: 1440, reducedMotion: "reduce" },
    { name: "forced-colors", story: "complete", theme: "light", width: 768, forcedColors: "active" },
  ];
  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: 1000 }, reducedMotion: scenario.reducedMotion ?? "no-preference", forcedColors: scenario.forcedColors ?? "none" });
    const requests = [], errors = [];
    page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.addInitScript(theme => localStorage.setItem("igx-nexus:theme", theme), scenario.theme);
      const url = new URL("/iframe.html", base);
      url.search = new URLSearchParams({ id: `web-asset-360-hardware-v2--${scenario.story}`, viewMode: "story", globals: `theme:${scenario.theme}` }).toString();
      await page.goto(url.toString());
      await page.getByRole("note").filter({ hasText: "DATOS SINTÉTICOS" }).waitFor();
      if (scenario.story === "loading") await page.getByRole("status", { name: "Cargando hardware" }).waitFor();
      else if (scenario.story === "error-retry") await page.getByRole("button", { name: "Reintentar hardware" }).waitFor();
      else await page.getByRole("heading", { name: "Procesadores", level: 3 }).waitFor();
      await page.addScriptTag({ content: `${axeSource}\nwindow.hardwareReviewAxe = window.axe;` });
      // Settle finite CSS entrance motion; no test assertions or runner timeouts are changed.
      await page.evaluate(async () => { await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))); });
      const findings = await page.evaluate(async () => {
        const simplify = result => result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }));
        // Own isolated engine avoids overlap with the Storybook a11y addon's automatic audit.
        const engine = window.hardwareReviewAxe;
        return { hardware: simplify(await engine.run(document.querySelector(".nexus-hardware"))), shell: simplify(await engine.run(document.body)) };
      });
      const violations = findings.hardware;
      assert.deepEqual(violations, [], `${scenario.name}: axe`);
      // The existing skip link sits outside landmarks. Preserve that best-practice finding
      // in the report; reject every other shell finding without disabling any axe rule.
      assert.deepEqual(findings.shell.filter(finding => !(finding.id === "region" && finding.targets.every(target => target.length === 1 && target[0] === ".igx-app-shell__skip-link"))), [], `${scenario.name}: new shell findings`);
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(dimensions.scrollWidth <= dimensions.width, `${scenario.name}: horizontal reflow`);
      const screenshots = [];
      const shot = async suffix => { const name = `synthetic-${scenario.name}${suffix}.png`; await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))); await page.screenshot({ path: resolve(output, name) }); screenshots.push(name); };
      await shot("-overview");
      if (!["loading", "error-retry"].includes(scenario.story)) {
        for (const [heading, suffix] of [["Procesadores", "-cpu-ram"], ["Almacenamiento físico", "-storage-volumes"]]) {
          await page.getByRole("heading", { name: heading, level: 3 }).evaluate(element => element.closest(".nexus-hardware-collection").scrollIntoView({ block: "start" }));
          await shot(suffix);
        }
      }
      if (scenario.name === "mobile") {
        for (const [heading, suffix] of [["Memoria RAM", "-ram"], ["Volúmenes lógicos", "-volumes"]]) { await page.getByRole("heading", { name: heading, level: 3 }).evaluate(element => element.closest(".nexus-hardware-collection").scrollIntoView({ block: "start" })); await shot(suffix); }
        await page.screenshot({ path: resolve(output, "synthetic-mobile-full.png"), fullPage: true }); screenshots.push("synthetic-mobile-full.png");
      }
      if (scenario.reducedMotion) {
        assert.equal(await page.locator(".nexus-hardware-ready").evaluate(element => getComputedStyle(element).animationName), "none");
        assert.equal(await page.locator(".nexus-asset-panel").evaluate(element => getComputedStyle(element).animationName), "none");
      }
      // Native disclosure must work with keyboard, without a pointer or custom tab semantics.
      if (scenario.name === "desktop-light") {
        const summary = page.locator(".nexus-hardware-evidence summary").first();
        await summary.focus(); await page.keyboard.press("Enter");
        assert.equal(await summary.evaluate(element => element.parentElement.open), true);
        await shot("-evidence-keyboard");
      }
      assert.deepEqual(requests, [], "Synthetic stories must never issue API requests");
      assert.deepEqual(errors, [], "No browser exceptions");
      results.push({ ...scenario, violations, shellFindings: findings.shell, dimensions, requests, errors, screenshots });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(resolve(output, "visual-review.json"), JSON.stringify({ syntheticOnly: true, results }, null, 2));
console.log(`Hardware visual review: ${results.length} scenarios passed; output ${output}`);
