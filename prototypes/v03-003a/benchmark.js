const svgNS="http://www.w3.org/2000/svg";
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
window.runBenchmark=async function(renderer,count,edgeCount){
  const stage=document.querySelector("#stage");stage.replaceChildren();
  const width=Math.min(innerWidth,1200),height=600;
  const nodes=Array.from({length:count},(_,i)=>[8+((i*73)%997)/997*(width-16),8+((i*131)%577)/577*(height-16)]);
  const edges=Array.from({length:edgeCount},(_,i)=>[i%count,(i*17+1)%count]);
  const start=performance.now();let draw,gl;
  if(renderer==="SVG"){
    const svg=document.createElementNS(svgNS,"svg");svg.setAttribute("width",width);svg.setAttribute("height",height);
    const group=document.createElementNS(svgNS,"g");svg.append(group);
    for(const [a,b] of edges){const l=document.createElementNS(svgNS,"line");l.setAttribute("x1",nodes[a][0]);l.setAttribute("y1",nodes[a][1]);l.setAttribute("x2",nodes[b][0]);l.setAttribute("y2",nodes[b][1]);l.setAttribute("stroke","#bbc7d6");group.append(l)}
    for(const [x,y] of nodes){const c=document.createElementNS(svgNS,"circle");c.setAttribute("cx",x);c.setAttribute("cy",y);c.setAttribute("r","3");c.setAttribute("fill","#014790");group.append(c)}
    stage.append(svg);draw=i=>{group.setAttribute("transform","translate("+(i%3)+",0)");group.getBoundingClientRect()};
  }else{
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;stage.append(canvas);
    if(renderer==="Canvas"){
      const ctx=canvas.getContext("2d");draw=i=>{ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(i%3,0);ctx.strokeStyle="#bbc7d6";ctx.beginPath();for(const [a,b] of edges){ctx.moveTo(...nodes[a]);ctx.lineTo(...nodes[b])}ctx.stroke();ctx.fillStyle="#014790";ctx.beginPath();for(const [x,y]of nodes){ctx.moveTo(x+3,y);ctx.arc(x,y,3,0,Math.PI*2)}ctx.fill();ctx.restore()};
    }else{
      gl=canvas.getContext("webgl");if(!gl)return {renderer,count,edgeCount,available:false};
      function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
      const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,"attribute vec2 p;uniform vec2 offset;void main(){gl_Position=vec4(p+offset,0.0,1.0);gl_PointSize=6.0;}"));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,"precision mediump float;uniform vec4 color;void main(){gl_FragColor=color;}"));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("link failed");gl.useProgram(program);
      const p=gl.getAttribLocation(program,"p"),color=gl.getUniformLocation(program,"color"),offset=gl.getUniformLocation(program,"offset");
      const coords=n=>[n[0]/width*2-1,1-n[1]/height*2];
      function buffer(values){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);return b}
      const eb=buffer(edges.flatMap(([a,b])=>[...coords(nodes[a]),...coords(nodes[b])])),nb=buffer(nodes.flatMap(coords));gl.enableVertexAttribArray(p);
      draw=i=>{gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(offset,(i%3)/width*2,0);gl.bindBuffer(gl.ARRAY_BUFFER,eb);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);gl.uniform4f(color,.73,.78,.84,1);gl.drawArrays(gl.LINES,0,edgeCount*2);gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);gl.uniform4f(color,0,.28,.56,1);gl.drawArrays(gl.POINTS,0,count);gl.finish()};
    }
  }
  const setupMs=performance.now()-start,times=[],drawTimes=[];
  for(let i=0;i<35;i++){const t=performance.now();draw(i);const cpu=performance.now()-t;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(i>=5){times.push(performance.now()-t);drawTimes.push(cpu)}}
  const result={renderer,count,edgeCount,width,height,available:true,setupMs:+setupMs.toFixed(2),drawMedianMs:+percentile(drawTimes,.5).toFixed(2),drawP95Ms:+percentile(drawTimes,.95).toFixed(2),twoRafMedianMs:+percentile(times,.5).toFixed(2),twoRafP95Ms:+percentile(times,.95).toFixed(2),samples:times.length};
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return result;
};
