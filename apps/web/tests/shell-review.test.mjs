import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ApplicationMark } from "../../../packages/ui/dist/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://127.0.0.1:3019";
const evidence = process.env.NEXUS_SHELL_EVIDENCE;
const records = [];
let server, browser;
before(async () => {
  server = spawn(process.execPath, [resolve(root, "../../node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "3019", "--strictPort"], { cwd: root, windowsHide: true, env: { ...process.env, VITE_NEXUS_DATA_MODE: "demo" }, stdio: "ignore" });
  for (let i=0; i<100; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r=>setTimeout(r,100)); }
  browser = await chromium.launch({ headless: true });
  if (evidence) mkdirSync(evidence, { recursive:true });
});
after(async () => {
  if (evidence) writeFileSync(resolve(evidence,"manifest.json"),JSON.stringify({baseline:"eb87c68ee2a17b793e34e457c4e2914567889bb1",capturedAt:new Date().toISOString(),status:"human visual review pending",screenshots:records},null,2));
  await browser?.close();
  if (server && server.exitCode===null) { const exited=once(server,"exit");server.kill();await exited; }
});
async function capture(page,name) {
  if (!evidence) return;
  const path=resolve(evidence,name+".png");
  const dimensions=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,theme:document.documentElement.dataset.theme,density:document.documentElement.dataset.density}));
  await page.screenshot({path});
  records.push({file:name+".png",url:page.url(),...dimensions});
}
async function setup(page,theme,density,collapsed=false) {
  await page.addInitScript(({theme,density,collapsed})=>{
    localStorage.setItem("igx-nexus:theme",theme);
    localStorage.setItem("igx-nexus:density",density);
    if (localStorage.getItem("igx-nexus:navigation-collapsed") === null) localStorage.setItem("igx-nexus:navigation-collapsed",String(collapsed));
  },{theme,density,collapsed});
}
function luminance(rgb) {
  const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function contrast(a,b) {const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test("responsive light/dark, density and labelled rail preserve full-width content",async()=>{
  const cases=[
    ["01-desktop-light-overview",1440,"light","comfortable",false,"#overview"],
    ["02-desktop-dark-overview",1440,"dark","comfortable",false,"#overview"],
    ["03-desktop-dark-compact-assets",1440,"dark","compact",false,"#assets"],
    ["04-tablet-768",768,"light","comfortable",false,"#assets"],
    ["05-mobile-320",320,"light","comfortable",false,"#assets"],
    ["06-desktop-collapsed",1440,"light","comfortable",true,"#assets"]
  ];
  for(const [name,width,theme,density,collapsed,hash] of cases) {
    const page=await browser.newPage({viewport:{width,height:900}});
    try {
      await setup(page,theme,density,collapsed);await page.goto(url+"/"+hash);
      await page.getByRole("heading",{level:1}).waitFor();
      if(hash==="#assets") await page.getByRole("table",{name:"Inventario de activos demo"}).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"document reflow "+name);
      if(width>=768) {
        const railWidth=await page.locator('.igx-app-shell__navigation').evaluate(el=>el.getBoundingClientRect().width);
        assert.equal(railWidth, width===768 || collapsed ? 104 : 224);
        const links=page.getByRole("navigation",{name:"Navegación principal"}).getByRole("link");
        assert.equal(await links.count(),4);
        for(const a of await links.all()) { const box=await a.boundingBox();assert.ok(box.height>=44,"nav target >=44"); }
      } else {
        await page.getByRole("button",{name:"Abrir navegación"}).waitFor();
      }
      await capture(page,name);
      if(width===320) {
        await page.getByRole("button",{name:"Abrir navegación"}).click();
        await page.getByRole("dialog").waitFor();
        await page.waitForFunction(()=>Math.abs(document.querySelector('[role="dialog"]').getBoundingClientRect().x)<1);
        await capture(page,"07-mobile-drawer");
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("button",{name:"Abrir navegación"}).evaluate(el=>el===document.activeElement),true);
      }
    } finally {await page.close();}
  }
});
test("forced colors, reduced motion, keyboard and contrast remain perceptible",async()=>{
  for(const theme of ["light","dark"]) {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    try {
      await setup(page,theme,"compact");await page.goto(url+"/#assets");
      await page.getByRole("table",{name:"Inventario de activos demo"}).waitFor();
      const a=page.getByRole("navigation",{name:"Navegación principal"}).getByRole("link",{name:"Activos",exact:true});
      const colors=await a.evaluate(el=>{const s=getComputedStyle(el);return {fg:s.color,bg:s.backgroundColor,marker:s.borderInlineStartColor};});
      assert.ok(contrast(colors.fg,colors.bg)>=4.5,"nav text contrast "+theme);
      assert.ok(contrast(colors.marker,colors.bg)>=3,"current marker contrast "+theme);
      await a.focus();assert.equal(await a.evaluate(el=>el===document.activeElement),true);
      await capture(page,"08-keyboard-"+theme);
      await page.emulateMedia({forcedColors:"active",reducedMotion:"reduce"});
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('.nexus-nav-link[aria-current]')).borderInlineStartStyle === "solid");
      assert.ok(await a.evaluate(el=>getComputedStyle(el).borderInlineStartStyle!=="none"));
      await capture(page,"09-high-contrast-"+theme);
      await page.setViewportSize({width:320,height:900});
      await page.getByRole("button",{name:"Abrir navegación"}).click();
      const duration=await page.getByRole("dialog").evaluate(el=>getComputedStyle(el).transitionDuration);
      assert.ok(duration.split(",").every(s=>parseFloat(s)===0),"reduced drawer duration");
    }finally{await page.close();}
  }
});
test("collapse, mobile resize, Back/Forward and refresh retain V03-008 investigation",async()=>{
  const page=await browser.newPage();
  try {
    const hash="#assets?view=graph&q=SYNTH-SN-000002&f.domain=IT&selected=DEMO-0002&root=DEMO-0002&depth=1&type=uses";
    await setup(page,"light","comfortable");await page.goto(url+"/"+hash);
    await page.getByRole("table",{name:"Inventario de activos demo"}).waitFor();
    await page.getByLabel("Reducir navegación").click();
    assert.equal(new URL(page.url()).hash,hash);
    await page.reload();await page.getByRole("table",{name:"Inventario de activos demo"}).waitFor();
    assert.equal(await page.locator(".igx-app-shell").getAttribute("data-collapsed"),"true");
    assert.equal(new URL(page.url()).hash,hash);
    await page.setViewportSize({width:320,height:900});
    await page.getByRole("link",{name:"Desktop Demo 0002",exact:true}).click();
    await page.getByRole("heading",{name:"Desktop Demo 0002",level:1}).waitFor();
    const assetUrl=page.url();
    await page.reload();await page.getByRole("link",{name:"Volver a investigación"}).waitFor();
    await page.goBack();await page.getByRole("table",{name:"Inventario de activos demo"}).waitFor();
    assert.equal(new URL(page.url()).hash,hash);
    await page.goForward();await page.getByRole("heading",{name:"Desktop Demo 0002",level:1}).waitFor();
    assert.equal(page.url(),assetUrl);
    await page.getByRole("button",{name:"Abrir navegación"}).click();
    assert.equal(await page.getByRole("navigation",{name:"Navegación principal"}).getByRole("link",{name:"Activos",exact:true}).getAttribute("href"),hash);
  }finally{await page.close();}
});
test("B optical candidate at 16/24/32/64, monochrome light/dark",async()=>{
  const page=await browser.newPage({viewport:{width:1000,height:500}});
  try {
    const groups=["light","dark"].map(theme=>'<section style="padding:32px;display:flex;gap:48px;align-items:center;background:'+ (theme==="light"?"white":"black")+';color:'+(theme==="light"?"black":"white")+'"><h2>'+theme+' / monochrome</h2>'+[16,24,32,64].map(size=>'<figure>'+renderToString(createElement(ApplicationMark,{size}))+'<figcaption>'+size+' px</figcaption></figure>').join("")+'</section>').join("");
    await page.setContent('<html><body style="margin:0;font-family:system-ui"><h1>Mark B refinado · candidato para revisión humana</h1>'+groups+'</body></html>');
    await capture(page,"10-mark-b-optical-review");
  }finally{await page.close();}
});
