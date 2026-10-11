'use strict';
// Illustrative geometry only. No API, prices, production device data, or external assets.
(() => {
  const canvas=document.getElementById('product-canvas');
  if(!canvas)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const status=document.getElementById('viewer-status');
  const controls=[...document.querySelectorAll('[data-view]')];
  let gl=null,program=null,buffer=null,yaw=.38,pitch=.17,distance=7,auto=false,visible=true,frame=0,last=0,pro=false,drag=null,disposed=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const vec=(a,b)=>a.map((v,i)=>v-b[i]);
  const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  function camera(){const eye=[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance+.15,Math.cos(yaw)*Math.cos(pitch)*distance];const z=norm(vec(eye,[0,0,0])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
  function projection(aspect){const f=1/Math.tan(38*Math.PI/360),near=.1,far=100;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0])}
  const vertices=[];
  function box(cx,cy,cz,w,h,d,color){const p=[[cx-w/2,cy-h/2,cz-d/2],[cx+w/2,cy-h/2,cz-d/2],[cx+w/2,cy+h/2,cz-d/2],[cx-w/2,cy+h/2,cz-d/2],[cx-w/2,cy-h/2,cz+d/2],[cx+w/2,cy-h/2,cz+d/2],[cx+w/2,cy+h/2,cz+d/2],[cx-w/2,cy+h/2,cz+d/2]];const faces=[[[4,5,6,7],[0,0,1]],[[1,0,3,2],[0,0,-1]],[[0,4,7,3],[-1,0,0]],[[5,1,2,6],[1,0,0]],[[7,6,2,3],[0,1,0]],[[0,1,5,4],[0,-1,0]]];for(const [indices,n]of faces)for(const i of [0,1,2,0,2,3])vertices.push(...p[indices[i]],...n,...color)}
  function geometry(){vertices.length=0;
    box(0,0,0,1.9,2.52,1.45,[.20,.27,.35]);
    box(0,1.29,.015,1.98,.10,1.52,[.30,.37,.44]);
    box(0,-1.29,0,1.95,.10,1.50,[.13,.19,.25]);
    box(0,-.05,.743,1.65,2.20,.06,[.27,.34,.42]);
    // Door seams, slots, and control panel are abstract design cues, not real hardware dimensions.
    box(0,.72,.79,1.30,.12,.05,[.06,.10,.15]);
    box(0,.78,.82,1.30,.025,.04,[.47,.56,.62]);
    box(.59,.01,.80,.24,.51,.055,[.055,.10,.16]);
    box(.59,.14,.833,.10,.023,.01,[.30,.82,.96]);
    box(.59,-.065,.845,.08,.17,.045,[.37,.46,.54]);
    box(-.58,-1.36,0,.18,.14,1.05,[.08,.12,.17]);box(.58,-1.36,0,.18,.14,1.05,[.08,.12,.17]);
    // Rear vent is visible when orbiting the geometry.
    for(let i=0;i<5;i++)box(0,.3+i*.12,-.75,1.15,.025,.035,[.07,.11,.16]);
    if(pro){box(-.42,-.86,.80,.60,.10,.05,[.13,.38,.46]);box(-.42,-.86,.832,.43,.018,.015,[.37,.90,.95])}
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  }
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader unavailable');return s}
  function fallback(){if(frame)cancelAnimationFrame(frame);frame=0;auto=false;canvas.hidden=true;document.getElementById('viewer-fallback').hidden=false;[...controls,document.getElementById('zoom-out'),document.getElementById('zoom-in'),document.getElementById('reset-view'),document.getElementById('auto-rotate')].forEach(b=>b.disabled=true);status.textContent='Chế độ sơ đồ. WebGL không khả dụng.'}
  try{if(new URLSearchParams(location.search).get('viewer')==='fallback')throw Error('Fallback preview');gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');program=gl.createProgram();const vs=shader(gl.VERTEX_SHADER,'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uView;uniform mat4 uProjection;uniform float uFloat;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;void main(){vec3 p=aPosition+vec3(0.0,uFloat,0.0);vPosition=p;vNormal=aNormal;vColor=aColor;gl_Position=uProjection*uView*vec4(p,1.0);}');const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 vNormal;varying vec3 vColor;varying vec3 vPosition;void main(){vec3 n=normalize(vNormal);float diffuse=max(dot(n,normalize(vec3(-0.7,1.2,1.0))),0.0);float rim=max(dot(n,normalize(vec3(1.0,0.3,-0.5))),0.0);vec3 c=vColor*(0.50+1.0*diffuse)+vec3(0.04,0.15,0.20)*rim;float edge=0.025*sin(vPosition.y*8.0);gl_FragColor=vec4(c+edge,1.0);}');gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);buffer=gl.createBuffer();geometry();for(const [name,offset]of [['aPosition',0],['aNormal',12],['aColor',24]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,offset)}gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0)}catch(e){fallback()}
  function render(time=0){frame=0;if(!gl||canvas.hidden||disposed||document.hidden||!visible)return;const dpr=Math.min(devicePixelRatio||1,innerWidth<768?1.5:2),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);if(w<1||h<1)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(auto&&!reduced.matches){yaw+=(last?Math.min((time-last)/1000,.05):0)*.14}last=time;gl.uniformMatrix4fv(gl.getUniformLocation(program,'uView'),false,camera());gl.uniformMatrix4fv(gl.getUniformLocation(program,'uProjection'),false,projection(w/h));gl.uniform1f(gl.getUniformLocation(program,'uFloat'),auto&&!reduced.matches?Math.sin(time/2200)*.035:0);gl.drawArrays(gl.TRIANGLES,0,vertices.length/9);if(auto&&!reduced.matches)frame=requestAnimationFrame(render)}
  function draw(){if(!frame&&!disposed)frame=requestAnimationFrame(render)}
  function stopAuto(){auto=false;document.getElementById('auto-rotate').setAttribute('aria-pressed','false');last=0}
  function clearView(){controls.forEach(b=>b.setAttribute('aria-pressed','false'))}
  function announce(text){status.textContent=text}
  controls.forEach(b=>b.addEventListener('click',()=>{stopAuto();controls.forEach(c=>c.setAttribute('aria-pressed',String(c===b)));const views={front:[.12,.08,'Góc trước'],rear:[Math.PI,.13,'Góc sau'],side:[Math.PI/2,.13,'Góc bên'],top:[.35,1.15,'Góc trên']};[yaw,pitch]=views[b.dataset.view];announce(views[b.dataset.view][2]);draw()}));
  function zoom(delta){stopAuto();distance=clamp(distance+delta,4.8,9.4);announce('Độ phóng đại '+Math.round(7/distance*100)+' phần trăm');draw()}
  document.getElementById('zoom-in').addEventListener('click',()=>zoom(-.45));document.getElementById('zoom-out').addEventListener('click',()=>zoom(.45));
  function reset(){stopAuto();yaw=.38;pitch=.17;distance=7;clearView();controls[0].setAttribute('aria-pressed','true');announce('Góc trước mặc định');draw()}
  document.getElementById('reset-view').addEventListener('click',reset);
  document.getElementById('auto-rotate').addEventListener('click',()=>{if(reduced.matches){announce('Đã giảm chuyển động theo cài đặt hệ thống.');return}auto=!auto;last=0;document.getElementById('auto-rotate').setAttribute('aria-pressed',String(auto));announce(auto?'Đang tự xoay. Nhấn lại để dừng.':'Đã dừng tự xoay.');clearView();draw()});
  canvas.addEventListener('pointerdown',e=>{stopAuto();drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);clearView();canvas.focus({preventScroll:true})});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.009;pitch=clamp(pitch+(e.clientY-drag.y)*.006,-.5,1.35);drag={x:e.clientX,y:e.clientY};draw()});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{if(drag)announce('Góc nhìn tùy chỉnh');drag=null});
  canvas.addEventListener('wheel',e=>{if(document.activeElement!==canvas)return;e.preventDefault();zoom(Math.sign(e.deltaY)*.2)},{passive:false});
  canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();stopAuto();clearView();if(e.key==='Home')reset();else if(['+','=','-'].includes(e.key))zoom(e.key==='-'?.3:-.3);else{yaw+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;pitch=clamp(pitch+(e.key==='ArrowUp'?.10:e.key==='ArrowDown'?-.10:0),-.5,1.35);announce('Góc nhìn tùy chỉnh');draw()}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()});
  const capacities={s:45,m:85,l:150};
  function selection(){const model=document.querySelector('[name=model]:checked').value,size=document.querySelector('[name=size]:checked').value;pro=model==='pro';document.getElementById('model-label').textContent=(pro?'PRO':'BASE')+' · MÔ HÌNH MINH HỌA';document.getElementById('selected-name').textContent='SmartBox '+(pro?'Pro':'Base')+' · '+size.toUpperCase();document.getElementById('selected-capacity').textContent='Dung tích '+capacities[size]+'L theo yêu cầu thiết kế';document.getElementById('pro-feature').hidden=!pro;document.getElementById('feature-title').innerHTML=pro?'Thêm một cách.<br>Hiểu bưu kiện của bạn.':'Những điều cơ bản.<br>Được kết nối.';if(gl&&!canvas.hidden){geometry();draw()}}
  document.querySelectorAll('[name=model],[name=size]').forEach(i=>i.addEventListener('change',selection));
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;draw()}else if(frame){cancelAnimationFrame(frame);frame=0}},{threshold:0});observer.observe(canvas);
  new ResizeObserver(draw).observe(canvas);document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)draw();else if(frame){cancelAnimationFrame(frame);frame=0}});reduced.addEventListener('change',()=>{stopAuto();draw();document.documentElement.classList.toggle('js-motion',!reduced.matches)});
  if(!reduced.matches)document.documentElement.classList.add('js-motion');const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');reveal.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(e=>reveal.observe(e));
  window.addEventListener('pagehide',()=>{disposed=true;if(frame)cancelAnimationFrame(frame);observer.disconnect();reveal.disconnect();if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program)}});draw();
})();
