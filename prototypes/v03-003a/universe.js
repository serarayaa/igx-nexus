import { parseInvestigationHash, serializeInvestigationHash, defaultInvestigationState, assetReturnHash, buildContextualAssetLink } from "../../apps/web/src/navigation-state.ts";

// Review-only fixtures. No provider/backend imports and no Live mode.
const nodes = [
  {id:"DEMO-END-01",name:"Endpoint 01",type:"Endpoint",domain:"IT",x:180,y:180,source:"Fixture endpoint"},
  {id:"DEMO-END-02",name:"Endpoint 02",type:"Endpoint",domain:"IT",x:130,y:315,source:"Fixture endpoint"},
  {id:"DEMO-NET-01",name:"Network access",type:"Network device",domain:"IT",x:370,y:245,source:"Fixture network"},
  {id:"DEMO-SRV-01",name:"Application server",type:"Server",domain:"IT",x:470,y:130,source:"Fixture server"},
  {id:"DEMO-GW-01",name:"OT gateway",type:"Industrial gateway",domain:"OT",x:575,y:310,source:"Fixture OT"},
  {id:"DEMO-HMI-01",name:"Operator interface",type:"HMI · supervision",domain:"OT",x:640,y:160,source:"Fixture OT"},
  {id:"DEMO-PLC-01",name:"Controller 01",type:"PLC · control",domain:"OT",x:780,y:260,source:"Fixture OT"},
  {id:"DEMO-FIELD-01",name:"Field device",type:"Field sensing",domain:"OT",x:820,y:385,source:"Fixture OT"}
];
const edges = [
  ["DEMO-END-01","DEMO-NET-01","connected_to","observed"],
  ["DEMO-END-02","DEMO-NET-01","connected_to","observed"],
  ["DEMO-NET-01","DEMO-SRV-01","uses","inferred"],
  ["DEMO-NET-01","DEMO-GW-01","connected_to","observed"],
  ["DEMO-GW-01","DEMO-HMI-01","communicates_with","observed"],
  ["DEMO-HMI-01","DEMO-PLC-01","monitors","inferred"],
  ["DEMO-PLC-01","DEMO-FIELD-01","controls","observed"]
];
let scene="global", depth=false, semantic=false;
const main=document.querySelector("main");
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function investigation(){return parseInvestigationHash(assetReturnHash(location.hash)||location.hash).state}
function write(state,replace=false){const hash=serializeInvestigationHash(state);if(hash!==location.hash)history[replace?"replaceState":"pushState"](null,"",hash);render()}
function current(){return nodes.find(n=>n.id===investigation().selectedId)}
function navigate(target){
  scene=target;
  const state=investigation();
  if(target==="global"){history.pushState(null,"","#dashboard");render();return}
  if(target==="it"||target==="ot"){state.filters.domain=target.toUpperCase();state.filters.location="";state.view="table";state.selectedId=null;state.graph.rootId=null;write(state);return}
  if(target==="map"||target==="depth"||target==="facility"){state.view="graph";if(target==="depth")depth=true;if(target==="facility"){state.filters.domain="OT";state.filters.location="Site Demo A"}write(state);return}
  render();
}
function select(id){const focused=document.activeElement?.getAttribute("data-select");const state=investigation();state.selectedId=id;write(state);if(focused===id)main.querySelector('[data-select="'+id+'"]')?.focus({preventScroll:true})}
function openAsset(){const n=current();if(!n)return;history.pushState(null,"",buildContextualAssetLink(n.id,investigation()));scene="asset";render()}
function returnAsset(){const hash=assetReturnHash(location.hash)||"#assets";history.pushState(null,"",hash);scene=investigation().view==="graph"?"map":investigation().filters.domain==="OT"?"ot":"it";render()}
function inferScene(){if(location.hash.startsWith("#assets/"))return "asset";const s=investigation();return s.view==="graph"?"map":s.filters.domain==="IT"?"it":s.filters.domain==="OT"?"ot":"global"}
function activeNodes(){
  const s=investigation();let result=nodes;
  if(s.filters.domain)result=result.filter(n=>n.domain===s.filters.domain);
  if(s.filters.location)result=result.filter(n=>(n.domain==="OT"?"Site Demo A":"Office Demo")===s.filters.location);
  if(s.search)result=result.filter(n=>n.name.toLowerCase().includes(s.search.toLowerCase()));
  if(s.view==="graph"&&s.graph.rootId){
    const reached=new Set([s.graph.rootId]);let frontier=[s.graph.rootId];
    for(let depth=0;depth<s.graph.depth;depth++){
      const next=[];
      for(const [a,b,type]of edges){
        if(s.graph.type!=="all"&&s.graph.type!==type)continue;
        if(frontier.includes(a)&&s.graph.perspective!=="upstream"&&!reached.has(b)){reached.add(b);next.push(b)}
        if(frontier.includes(b)&&s.graph.perspective!=="downstream"&&!reached.has(a)){reached.add(a);next.push(a)}
      }
      frontier=next;
    }
    result=result.filter(n=>reached.has(n.id));
  }
  return result;
}
function flatPoint(n){
  if(scene==="facility"||scene==="ot"){const i=nodes.filter(n=>n.domain==="OT").indexOf(n);return [[205,165],[465,145],[530,285],[780,390]][i]}
  if(scene==="it"){const i=nodes.filter(n=>n.domain==="IT").indexOf(n);return [[185,200],[180,345],[460,285],[725,175]][i]}
  return [n.x,n.y];
}
function point(n){const [x,y]=flatPoint(n);return depth?[45+.94*x+.12*y,50-.09*x+.87*y]:[x,y]}
function topology(){
  const ns=activeNodes(),ids=new Set(ns.map(n=>n.id)),s=investigation();
  const layers=scene==="ot"||scene==="facility";
  const planes=layers
    ? '<path class="plane" d="M60 110L720 65 895 150 230 200Z"/><path class="plane" d="M60 250L720 205 895 290 230 340Z"/><path class="plane" d="M60 385L720 340 895 425 230 475Z"/><text x="65" y="85" class="stratum">01 / SUPERVISIÓN</text><text x="65" y="230" class="stratum">02 / CONTROL</text><text x="65" y="370" class="stratum">03 / CAMPO</text>'
    : '<path class="contour" d="M80 155Q80 85 230 75L430 95Q560 120 505 260L385 400Q240 485 100 405Z"/><path class="contour" d="M505 170Q550 70 750 95L890 160 920 370Q870 460 700 445L515 390Z"/><path class="contour" d="M45 125Q175 5 430 55L575 105 800 65Q980 120 960 350L900 450Q715 505 500 425L285 465Q55 470 45 125Z"/><text x="84" y="125" class="stratum">IT / DIGITAL INFRASTRUCTURE</text><text x="575" y="95" class="stratum">OT / OPERATIONAL CONTEXT</text>';
  const lines=edges.filter(e=>ids.has(e[0])&&ids.has(e[1])&&(s.graph.type==="all"||s.graph.type===e[2])).map(([a,b,t,k])=>{
    const p=point(nodes.find(n=>n.id===a)),q=point(nodes.find(n=>n.id===b));
    return '<path class="edge '+k+' '+(s.selectedId===a||s.selectedId===b?"selected":"")+'" d="M'+p.join(" ")+' Q'+((p[0]+q[0])/2)+' '+(p[1]+30)+' '+q.join(" ")+'"><title>'+escape(t+" · "+k+" · synthetic fixture")+'</title></path>';
  }).join("");
  const entities=ns.map(n=>{const [x,y]=point(n);return '<g class="node '+(n.domain==="OT"?"ot ":"")+(n.id===s.selectedId?"selected":"")+'" tabindex="0" role="button" aria-label="'+escape(n.name+" · "+n.type+" · seleccionar fixture")+'" aria-pressed="'+(n.id===s.selectedId)+'" data-select="'+n.id+'" transform="translate('+x+' '+y+')"><rect x="-22" y="-24" width="164" height="57" rx="4"/><circle r="6" cx="-8" cy="0"/><text class="name" x="7" y="-3">'+escape(n.name)+'</text><text class="small" x="7" y="15">'+escape(n.type)+'</text></g>'}).join("");
  const transform=depth?"translate(45 50) matrix(.94 -.09 .12 .87 0 0)":"";
  // Perspective changes the context planes and positions, never status/severity.
  return '<div class="atlas"><div class="atlas-title">'+(layers?"SITE DEMO A / LOGICAL TOPOLOGY":"NEXUS / EVIDENCE ATLAS")+(depth?" / 2.5D EXPERIMENT":" / 2D")+'</div><svg viewBox="0 0 1000 500" aria-label="Topología sintética. Índice semántico equivalente debajo."><g transform="'+transform+'">'+planes+'</g>'+lines+entities+'</svg></div>';
}
function globalAtlas(){
  return '<div class="atlas global-atlas"><div class="atlas-title">ONE NEXUS / TECHNOLOGY UNIVERSE</div><svg viewBox="0 0 1000 500" aria-label="Dos dominios compartiendo un núcleo de evidencia"><path class="contour" d="M80 195Q120 65 365 80L515 200Q475 400 245 425L80 315Z"/><path class="contour" d="M95 220Q160 115 350 130L460 220Q420 355 255 375L115 310Z"/><path class="contour" d="M520 165L715 80 910 175 910 325 715 430 530 340Z"/><path class="contour" d="M570 195L720 130 860 200 860 300 720 375 580 310Z"/><path class="plane" d="M170 295L310 225 450 300 310 375Z"/><path class="plane" d="M605 285L730 220 855 290 730 355Z"/><path class="edge" d="M385 290Q500 215 630 285"/><path class="edge inferred" d="M360 320Q500 395 650 325"/><g class="domain-select" tabindex="0" role="button" aria-label="Entrar a IT Universe" data-go="it"><text class="domain-label" x="175" y="205">IT Universe</text><text class="domain-caption" x="175" y="232">Equipos · servicios · evidencia</text><circle cx="230" cy="310" r="7" fill="var(--it)"/><circle cx="310" cy="270" r="7" fill="var(--it)"/><circle cx="365" cy="315" r="7" fill="var(--it)"/><text class="domain-caption" x="175" y="410">04 CIs / FIXTURE DE INVESTIGACIÓN →</text></g><g class="domain-select" tabindex="0" role="button" aria-label="Entrar a OT Universe" data-go="ot"><text class="domain-label" x="625" y="190">OT Universe</text><text class="domain-caption" x="625" y="217">Instalación · control · contexto</text><rect x="655" y="280" width="12" height="12" fill="var(--ot)"/><rect x="725" y="250" width="12" height="12" fill="var(--ot)"/><rect x="780" y="295" width="12" height="12" fill="var(--ot)"/><text class="domain-caption" x="625" y="410">SITE DEMO A / CONTEXTO SINTÉTICO →</text></g><text x="440" y="175" class="stratum">SHARED CORE</text><text x="440" y="195" class="domain-caption">CI · evidence · provenance</text><text x="455" y="360" class="domain-caption">Enlaces sintéticos</text></svg><div class="mobile-universes"><div class="eyebrow">SHARED CORE / CI · EVIDENCE</div><button data-go="it"><span class="it-dot">●</span><strong>IT Universe →</strong><br><span>Equipos · servicios · evidencia</span></button><div class="mobile-connection">│ Relaciones con evidencia · fixture</div><button data-go="ot"><span class="ot-dot">■</span><strong>OT Universe →</strong><br><span>Instalación · control · contexto</span></button></div></div>';
}
function inspector(){
  const n=current();
  if(!n)return '<aside class="inspector"><div class="eyebrow">INVESTIGATION / CONTEXT</div><h2>'+(scene==="global"?"Un universo, dos perspectivas":"La evidencia guía el recorrido")+'</h2><p>'+(scene==="global"?"IT y OT comparten identidad y relaciones. Cada contexto revela una estructura distinta.":"Selecciona una entidad. El foco del teclado no cambia la selección ni el root del mapa.")+'</p><dl><div><dt>Modo</dt><dd>Demo concept</dd></div><div><dt>Cobertura relacional</dt><dd>Parcial · fixture</dd></div><div><dt>Live actual</dt><dd>Computer only</dd></div><div><dt>Relaciones Live</dt><dd>No disponibles</dd></div></dl><div class="notice">Software, topología OT y Facility son conceptos de revisión. No representan datos de Innergex.</div><button class="secondary" data-go="map">Explorar NEXUS Map</button></aside>';
  const related=edges.filter(e=>e[0]===n.id||e[1]===n.id);
  return '<aside class="inspector"><div class="eyebrow">SELECTED ENTITY / '+n.domain+'</div><h2>'+escape(n.name)+'</h2><div class="serial">'+n.id+'</div><dl><div><dt>Clase / función</dt><dd>'+escape(n.type)+'</dd></div><div><dt>Fuente</dt><dd>Demo fixture</dd></div><div><dt>Provenance</dt><dd>Synthetic authored</dd></div><div><dt>Relaciones</dt><dd>'+related.length+' claims sintéticos</dd></div><div><dt>Criticality</dt><dd>No evaluada</dd></div></dl><button class="primary" id="asset">Abrir Asset 360 →</button><button class="secondary" id="root">Usar como graph root</button><div class="notice">Selection: '+n.id+'<br>Root: '+escape(investigation().graph.rootId||"no definido")+'<br>Foco: transitorio. No prueba impacto operacional.</div></aside>';
}
function semanticIndex(){
  const ns=scene==="global"?nodes:activeNodes();
  return '<details class="semantic" '+(semantic||innerWidth<768?"open":"")+'><summary>Índice semántico · '+ns.length+' entidades · alternativa 2D</summary>'+ns.map(n=>'<button data-select="'+n.id+'">'+escape(n.name)+' · '+escape(n.type)+' · '+n.domain+(current()?.id===n.id?" · seleccionada":"")+'</button>').join("")+'<h3>Claims de relación — fixtures</h3><ul>'+edges.filter(e=>ns.some(n=>n.id===e[0])&&ns.some(n=>n.id===e[1])).map(e=>'<li>'+e[0]+' → '+e[1]+' · '+e[2]+' · '+e[3]+'</li>').join("")+'</ul><p>Sin claim disponible no se dibuja enlace. User e identidad externa no disponibles.</p></details>';
}
function register(){return '<section class="register"><div class="register-head"><span>EVIDENCE REGISTER / ATTENTION</span><span>NO CAUSAL CLAIMS</span></div><div class="record"><span class="tag">PARTIAL</span><div><strong>Cobertura antes que conclusiones</strong><p>Los enlaces visibles provienen de fixtures; el provider Live no entrega relaciones.</p></div><button data-go="map">Investigar relaciones →</button></div><div class="record"><span class="tag">FUTURE</span><div><strong>Software: del producto a los equipos</strong><p>Contrato de instalación/versiones pendiente. Explora la composición propuesta.</p></div><button data-go="software">Ver concepto →</button></div></section>'}
function software(){return '<div class="software-lanes"><section class="lane"><span class="step">01 / PRODUCT</span><h2 class="product">Microsoft 365</h2><p>Publisher: Microsoft · fixture</p><div class="notice">FUTURE capability. Sin catálogo, licencias ni instalación Live actuales.</div><dl><div><dt>Versiones fixture</dt><dd>2</dd></div><div><dt>Equipos fixture</dt><dd>2</dd></div><div><dt>Support / entitlement</dt><dd>Unavailable</dd></div></dl></section><section class="lane"><span class="step">02 / VERSIONS</span><div class="version"><strong>Version A · synthetic</strong><p>1 instalación fixture / 2 equipos investigados</p><button data-select="DEMO-END-01">Investigar equipo 01 →</button></div><div class="version"><strong>Version B · synthetic</strong><p>1 instalación fixture / 2 equipos investigados</p><button data-select="DEMO-END-02">Investigar equipo 02 →</button></div></section><section class="lane"><span class="step">03 / DEVICES RUNNING · CONCEPT ONLY</span><button class="endpoint-item" data-select="DEMO-END-01"><strong>Endpoint 01</strong><br>Instalación Version A · fixture →</button><button class="endpoint-item" data-select="DEMO-END-02"><strong>Endpoint 02</strong><br>Instalación Version B · fixture →</button><p class="mode-note">No installed-software contract implemented. Missing inventory ≠ not installed.</p></section></div>'}
function asset(){const n=current()||nodes.find(n=>location.hash.includes(n.id));return '<div class="asset-detail"><section><div class="entity-plate"><div class="eyebrow">CANONICAL IDENTITY / DEMO FIXTURE</div><h2>'+escape(n?.name||"Entidad no disponible")+'</h2><p class="serial">'+escape(n?.id||"unknown")+'</p><p>La entidad continúa desde la investigación. No se cambia el origen ni se inventa una nueva identidad.</p></div><div class="entity-tabs"><button aria-current="page">Resumen</button><button id="evidence">Evidencia</button><button id="relations">Relaciones</button></div><div id="asset-section"><h2>Lo conocido y lo pendiente</h2><dl><div><dt>Domain</dt><dd>'+escape(n?.domain||"unknown")+'</dd></div><div><dt>Lifecycle</dt><dd>Unknown · no dato real</dd></div><div><dt>Software / firmware</dt><dd>No disponible en Live actual</dd></div><div><dt>Operational health</dt><dd>No evaluado</dd></div></dl></div></section><aside class="inspector"><div class="eyebrow">INVESTIGATION CONTINUITY</div><h2>Retorno contextual</h2><p>La URL original codificada conserva filtros, selección, representación y root independientes.</p><button class="primary" id="return">← Volver a investigación</button><p class="url">'+escape(assetReturnHash(location.hash)||"sin origen")+'</p><div class="notice">Ficha conceptual; no reemplaza las secciones productivas. Longitud final encoded return sigue condición de robustez pendiente.</div></aside></div>'}
function render(){
  const s=investigation();
  const names={global:["Technology Command","Orienta la investigación a través de la evidencia disponible."],it:["IT Universe","Equipos y servicios conectados por identidad, relaciones y evidencia."],ot:["OT Universe","Contexto operacional primero. Supervisión, control y campo con cobertura explícita."],map:["NEXUS Map","Una topología transversal. Cada conexión es un claim investigable."],facility:["Site Demo A","Facility concept · agrupación de contexto, no registro de planta productivo."],software:["Software Workspace","Del producto a la versión y al equipo. Concepto futuro, sin ingestión nueva."],depth:["Technology constellation","Experimento 2.5D · profundidad para separar contexto, no para simular salud."],asset:["Asset 360","Identidad y evidencia. El origen de investigación sigue disponible."]};
  const [title,sub]=names[scene];
  document.querySelectorAll("header [data-go]").forEach(b=>{if(b.dataset.go===scene||((scene==="facility")&&b.dataset.go==="ot"))b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  main.innerHTML='<div class="context"><span>ONE NEXUS / '+(scene==="global"?"GLOBAL":s.filters.domain||"CROSS-DOMAIN")+' / '+(scene==="facility"?"SITE DEMO A":scene.toUpperCase())+'</span><span>REVIEW PROTOTYPE · EVIDENCE PARTIAL</span></div><div class="page-heading"><div><h1>'+title+'</h1><p class="subtitle">'+sub+'</p></div><div class="heading-tools"><button data-go="map">Map</button><button id="depth" aria-pressed="'+depth+'">2.5D</button><button id="flat">2D / semántico</button></div></div>'+
    (scene==="asset"?asset():
    '<div class="rail">'+(scene==="it"?'<button data-go="it">Endpoints</button><button data-go="software">Software · concept</button>':scene==="ot"||scene==="facility"?'<button data-go="facility">Site Demo A →</button><span>1 contexto sintético · sin coordenadas reales</span>':'<span>Scope: investigación acotada · fixtures</span>')+'<label for="search" class="eyebrow" style="margin:0">Buscar CI</label><input id="search" placeholder="Buscar en fixtures…" value="'+escape(s.search)+'"></div><div class="layout"><section>'+(scene==="software"?software():scene==="global"?globalAtlas():topology())+(scene!=="software"?'<div class="legend"><span>Observed · fixture</span><span class="inferred">Inferred · fixture</span><span class="unavailable">Unavailable: sin enlace</span></div>':"")+semanticIndex()+'</section>'+inspector()+'</div>'+register())+
    '<div class="journeys"><span>REPRODUCIBLE JOURNEYS</span><button id="journey-it">Recorrido IT: Global → Endpoint → Map → 360</button><button id="journey-ot">Recorrido OT: Global → Site → PLC</button><button id="next">Siguiente paso →</button></div><p class="url">V03-008 durable state: '+escape(location.hash||"#dashboard")+'</p>';
  bind();
}
let journey=[],step=0;
function startJourney(domain){journey=domain==="IT"?["global","it","endpoint","map","asset"]:["global","ot","facility","plc","asset"];step=0;advance()}
function advance(){const action=journey[step++];if(!action)return; if(action==="endpoint"){scene="it";select("DEMO-END-01")}else if(action==="plc"){scene="facility";select("DEMO-PLC-01")}else if(action==="asset")openAsset();else navigate(action)}
function bind(){
  main.querySelectorAll("[data-go]").forEach(b=>{b.onclick=()=>transition(()=>navigate(b.dataset.go));b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();b.onclick()}}});
  main.querySelectorAll("[data-select]").forEach(b=>{b.onclick=()=>select(b.dataset.select);b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();b.onclick()}}});
  main.querySelector("#search")?.addEventListener("input",e=>{const pos=e.target.selectionStart,s=investigation();s.search=e.target.value;write(s,true);const input=main.querySelector("#search");input.focus();input.setSelectionRange(pos,pos)});
  main.querySelector("#depth").onclick=()=>{depth=!depth;render()};
  main.querySelector("#flat").onclick=()=>{depth=false;semantic=true;render()};
  main.querySelector("#asset")?.addEventListener("click",()=>transition(openAsset));
  main.querySelector("#return")?.addEventListener("click",()=>transition(returnAsset));
  main.querySelector("#root")?.addEventListener("click",()=>{const s=investigation();s.graph.rootId=s.selectedId;s.view="graph";scene="map";write(s)});
  main.querySelector("#evidence")?.addEventListener("click",()=>{document.querySelector("#asset-section").innerHTML='<h2>Evidence · synthetic fixture</h2><p>source=demo; authority=authored. Sin documentos ni payloads reales.</p>'});
  main.querySelector("#relations")?.addEventListener("click",()=>{document.querySelector("#asset-section").innerHTML=semanticIndex()});
  main.querySelector("#journey-it").onclick=()=>startJourney("IT");main.querySelector("#journey-ot").onclick=()=>startJourney("OT");main.querySelector("#next").onclick=()=>transition(advance);
}
function transition(fn){
  document.getAnimations().forEach(a=>a.cancel());
  const selected=current(),before=main.querySelector(".node.selected")?.getBoundingClientRect();
  fn();
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
    main.animate([{opacity:.4,transform:"translateY(8px)"},{opacity:1,transform:"translateY(0)"}],{duration:200,easing:"cubic-bezier(0,0,.2,1)"});
    const after=main.querySelector(".entity-plate h2")?.getBoundingClientRect();
    if(selected&&before&&after){
      const ghost=document.createElement("div");ghost.textContent=selected.name;ghost.setAttribute("aria-hidden","true");
      Object.assign(ghost.style,{position:"fixed",left:before.x+"px",top:before.y+"px",padding:"8px 12px",border:"1px solid var(--accent)",background:"var(--paper)",color:"var(--ink)",pointerEvents:"none",zIndex:"4"});
      document.body.append(ghost);
      const animation=ghost.animate([{transform:"translate(0,0)",opacity:1},{transform:"translate("+(after.x-before.x)+"px,"+(after.y-before.y)+"px)",opacity:0}],{duration:320,easing:"cubic-bezier(0,0,.2,1)"});
      animation.onfinish=animation.oncancel=()=>ghost.remove();
    }
  }
  main.focus({preventScroll:true});
}
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",e=>{if(e.matches)main.getAnimations().forEach(a=>a.cancel())});
document.querySelectorAll("header [data-go]").forEach(b=>b.onclick=()=>transition(()=>navigate(b.dataset.go)));
document.querySelector("#theme").onclick=e=>{const dark=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=dark?"dark":"light";e.target.textContent=dark?"Tema claro":"Tema oscuro"};
document.querySelector("#density").onclick=e=>{document.body.classList.toggle("compact");e.target.textContent=document.body.classList.contains("compact")?"Comfortable":"Compact"};
document.querySelector(".skip").onclick=e=>{e.preventDefault();main.focus()};
window.addEventListener("popstate",()=>{scene=inferScene();render()});
window.addEventListener("hashchange",()=>{scene=inferScene();render()});
scene=inferScene();render();
