import { chromium } from "playwright";
import { writeFile, readFile } from "node:fs/promises";
import { createServer } from "node:http";
// Separate static origin avoids Vite HMR invalidating a measurement mid-run.
const server=createServer(async(req,res)=>{
  const js=req.url==="/benchmark.js";
  const content=await readFile(new URL(js?"benchmark.js":"benchmark.html",import.meta.url));
  res.setHeader("Content-Type",js?"application/javascript":"text/html");res.end(content);
});
await new Promise(r=>server.listen(3024,"127.0.0.1",r));
const browser=await chromium.launch({headless:true});
const results=[];
for(const profile of [{name:"desktop",width:1440,rate:1},{name:"mobile-viewport-cpu6x",width:390,rate:6}]){
  const page=await browser.newPage({viewport:{width:profile.width,height:900},deviceScaleFactor:1});
  await page.goto("http://127.0.0.1:3024/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>typeof window.runBenchmark==="function");
  const cdp=await page.context().newCDPSession(page);await cdp.send("Emulation.setCPUThrottlingRate",{rate:profile.rate});
  for(const renderer of ["SVG","Canvas","WebGL"])for(const [n,e] of [[100,300],[500,1500],[2000,6000],[5000,15000]]){
    const result=await page.evaluate(async({renderer,n,e})=>window.runBenchmark(renderer,n,e),{renderer,n,e});results.push({profile:profile.name,...result});console.log(profile.name,renderer,n,result.drawP95Ms,result.twoRafP95Ms);
  }
  await page.close();
}
await writeFile(new URL("../../docs/product/evidence/v03-003a/benchmark-results.json",import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),browser:browser.version(),method:"Deterministic positions, 3 edges/node. 5 warmup +30 samples. Draw CPU; WebGL gl.finish. Frame proxy is two requestAnimationFrame callbacks, includes vsync wait. No labels/picking/layout/React/data transfer; not an apples-to-apples library comparison.",hardware:"User Windows host via headless Chromium; GPU not calibrated. Mobile viewport and CPU6x emulation are not real mobile/low-power hardware.",results},null,2)+"\n");
await browser.close();
await new Promise(r=>server.close(r));
