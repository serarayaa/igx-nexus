import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { CoverageIndicator, EvidenceBadge, SeverityBadge, DataTable } from "../dist/index.js";

const base = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function cssTree(file) {
  return readFileSync(file, "utf8").replace(/@import\s+"([^"]+)";/g, (_, path) => cssTree(resolve(dirname(file), path)));
}
const css = cssTree(resolve(base, "styles/index.css"));
const evidence = ["observed", "inferred", "manual", "normalized", "unknown", "unavailable", "partial", "conflict"];
const severity = ["healthy", "attention", "degraded", "critical", "stale"];
let browser;
before(async () => { browser = await chromium.launch({headless: true}); });
after(async () => { await browser?.close(); });

function luminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(a,b) { const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function fixture(theme) {
  const badges = [...evidence.map(state=>h(EvidenceBadge,{state,key:state})),...severity.map(state=>h(SeverityBadge,{state,key:state})),h(CoverageIndicator,{covered:7,total:20,scope:"activos"})];
  const table = h(DataTable,{caption:"Fixture",columns:[{id:"name",header:"Entidad",cell:row=>row.id}],rows:[{id:"a"}],getRowKey:row=>row.id,selectionMode:"multiple",defaultSelectedKeys:["a"],getSelectionLabel:row=>`Seleccionar ${row.id}`});
  return `<style>${css}</style><div data-theme="${theme}" id="theme">${renderToString(h("div",null,...badges,table))}<button class="igx-button" data-focus-visible>Investigar</button></div>`;
}
for (const theme of ["light","dark"]) {
  test(`${theme}: contrastes de texto semántico y marca de selección`, async () => {
    const page=await browser.newPage();try {
      await page.setContent(fixture(theme));
      const pairs=await page.locator(".igx-semantic-badge").evaluateAll(elements=>elements.map(el=>({label:el.textContent,fg:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor})));
      for(const pair of pairs) assert.ok(contrast(pair.fg,pair.bg)>=4.5,`${pair.label}: ${contrast(pair.fg,pair.bg)}`);
      const selected=await page.locator("[data-selected=true] td").first().evaluate(el=>({shadow:getComputedStyle(el).boxShadow,bg:getComputedStyle(el.parentElement).backgroundColor}));
      assert.notEqual(selected.shadow,"none");
      const indicator=selected.shadow.match(/rgba?\([^)]+\)/)[0];
      assert.ok(contrast(indicator,selected.bg)>=3,`selección ${theme}`);
    } finally { await page.close(); }
  });
  test(`${theme}: reduced motion y forced colors en tema anidado`, async () => {
    const page=await browser.newPage();try {
      await page.emulateMedia({reducedMotion:"reduce",forcedColors:"active"});
      await page.setContent(fixture(theme));
      const values=await page.locator("#theme").evaluate(el=>{
        const s=getComputedStyle(el);return {motion:["feedback","transition","spatial","micro","component","panel","workspace"].map(role=>s.getPropertyValue(`--igx-semantic-motion-${role}-duration`).trim()),surface:s.getPropertyValue("--igx-semantic-color-surface-panel").trim(),indicator:s.getPropertyValue("--igx-semantic-color-interaction-selected-indicator").trim(),chart:s.getPropertyValue("--igx-data-viz-color-severity-critical").trim()};
      });
      assert.deepEqual(values.motion,Array(7).fill("0ms"));assert.equal(values.surface,"Canvas");assert.equal(values.indicator,"Highlight");
      assert.equal(values.chart,"CanvasText");
      assert.equal(await page.locator('[data-evidence="inferred"]').evaluate(el=>getComputedStyle(el).borderTopStyle),"dashed");
      assert.equal(await page.locator(".igx-button").evaluate(el=>getComputedStyle(el).outlineStyle),"solid");
      assert.equal(await page.locator(".igx-semantic-badge svg").count(),14);
    } finally { await page.close(); }
  });
}
