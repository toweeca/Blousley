// Shared HTML builder for BlouseViewer3D — used by both native (WebView) and web (iframe) renders.
// All Three.js code, fabric simulation, UI, and messaging lives inside this self-contained HTML string.

export interface BlouseViewerHtmlOptions {
  /** Pass true for the web (iframe) version — images are embedded directly in JS. */
  embedImages?: boolean;
  frontUri?: string;
  backUri?: string;
}

export function buildBlouseViewerHtml(opts: BlouseViewerHtmlOptions = {}): string {
  const { embedImages = false, frontUri = "", backUri = "" } = opts;

  // Safely embed data URIs (may be very long base64 strings)
  const fJson = embedImages ? JSON.stringify(frontUri) : "null";
  const bJson = embedImages ? JSON.stringify(backUri) : "null";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#0D0508;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
#c{display:block;width:100%;height:calc(100% - 96px);}
#overlay{position:absolute;top:0;left:0;right:0;bottom:96px;pointer-events:none;}
#loader{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#0D0508;gap:14px;pointer-events:none;
}
#spinner{
  width:36px;height:36px;border:3px solid rgba(201,169,110,0.18);border-top-color:#C9A96E;
  border-radius:50%;animation:spin 0.85s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg);}}
#loaderText{color:rgba(201,169,110,0.65);font-size:12px;letter-spacing:0.4px;text-align:center;line-height:1.65;}
#view-label{
  position:absolute;top:11px;left:50%;transform:translateX(-50%);
  background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.25);
  color:rgba(201,169,110,0.9);font-size:9px;font-weight:700;letter-spacing:2.8px;text-transform:uppercase;
  padding:4px 13px;border-radius:20px;display:none;white-space:nowrap;
}
#fabric-label{
  position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,0.45);color:rgba(255,255,255,0.55);
  font-size:9px;padding:3px 12px;border-radius:16px;
  white-space:nowrap;opacity:1;transition:opacity 0.6s;
}
#hint{
  position:absolute;top:40px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,0.35);color:rgba(255,255,255,0.38);
  font-size:9px;padding:3px 11px;border-radius:14px;white-space:nowrap;
  opacity:1;transition:opacity 1.2s;pointer-events:none;display:none;
}

/* ── Fabric Panel ───────────────────────────────────────────────── */
#panel{
  position:absolute;bottom:0;left:0;right:0;height:96px;
  background:rgba(13,5,8,0.96);border-top:1px solid rgba(201,169,110,0.18);
  display:flex;flex-direction:column;gap:0;overflow:hidden;
}
#fab-row{
  display:flex;flex-direction:row;align-items:center;gap:6px;
  padding:8px 12px 4px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;
}
#fab-row::-webkit-scrollbar{display:none;}
.fab-btn{
  display:flex;flex-direction:column;align-items:center;gap:2px;
  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
  border-radius:10px;padding:5px 10px;cursor:pointer;min-width:58px;
  transition:background 0.18s,border-color 0.18s,transform 0.1s;
  -webkit-tap-highlight-color:transparent;flex-shrink:0;
}
.fab-btn:active{transform:scale(0.94);}
.fab-btn.active{background:rgba(201,169,110,0.15);border-color:rgba(201,169,110,0.5);}
.fab-icon{font-size:14px;line-height:1;}
.fab-name{font-size:8px;font-weight:600;letter-spacing:0.5px;color:rgba(255,255,255,0.6);text-transform:uppercase;}
.fab-btn.active .fab-name{color:#C9A96E;}

#col-row{
  display:flex;flex-direction:row;align-items:center;gap:7px;
  padding:4px 12px 8px;overflow-x:auto;scrollbar-width:none;
}
#col-row::-webkit-scrollbar{display:none;}
.col-btn{
  width:26px;height:26px;border-radius:13px;border:2px solid transparent;
  cursor:pointer;flex-shrink:0;transition:transform 0.12s,border-color 0.15s;
  -webkit-tap-highlight-color:transparent;
}
.col-btn:active{transform:scale(0.88);}
.col-btn.active{border-color:#C9A96E;transform:scale(1.15);}
.col-custom{
  background:linear-gradient(135deg,#f06,#a0f,#0af,#0f9,#ff0,#f06);
  display:flex;align-items:center;justify-content:center;font-size:11px;
}
#colorInput{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none;}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="overlay">
  <div id="loader"><div id="spinner"></div><div id="loaderText">Rendering fabric preview\u2026<br>Applying material simulation</div></div>
  <div id="view-label">FRONT VIEW</div>
  <div id="hint">Drag to rotate \u00b7 Pinch to zoom</div>
  <div id="fabric-label">Silk \u00b7 High sheen, fluid drape</div>
</div>
<div id="flat-view" style="display:none;position:absolute;top:0;left:0;right:0;bottom:96px;background:#0D0508;overflow:hidden;"></div>

<div id="panel">
  <div id="fab-row">
    <button class="fab-btn active" data-fab="silk"      onclick="selectFab('silk')">     <span class="fab-icon">\u2736</span><span class="fab-name">Silk</span></button>
    <button class="fab-btn"        data-fab="georgette" onclick="selectFab('georgette')"><span class="fab-icon">\u25c8</span><span class="fab-name">Georgette</span></button>
    <button class="fab-btn"        data-fab="chiffon"   onclick="selectFab('chiffon')">  <span class="fab-icon">\u25ca</span><span class="fab-name">Chiffon</span></button>
    <button class="fab-btn"        data-fab="cotton"    onclick="selectFab('cotton')">   <span class="fab-icon">\u2736</span><span class="fab-name">Cotton</span></button>
    <button class="fab-btn"        data-fab="velvet"    onclick="selectFab('velvet')">   <span class="fab-icon">\u25aa</span><span class="fab-name">Velvet</span></button>
    <button class="fab-btn"        data-fab="brocade"   onclick="selectFab('brocade')">  <span class="fab-icon">\u27e1</span><span class="fab-name">Brocade</span></button>
  </div>
  <div id="col-row">
    <button class="col-btn active" data-color="#ffffff"  onclick="selectColor('#ffffff')"  style="background:#ffffff"></button>
    <button class="col-btn"        data-color="#8B2252"  onclick="selectColor('#8B2252')"  style="background:#8B2252"></button>
    <button class="col-btn"        data-color="#C9A96E"  onclick="selectColor('#C9A96E')"  style="background:#C9A96E"></button>
    <button class="col-btn"        data-color="#1A2B4A"  onclick="selectColor('#1A2B4A')"  style="background:#1A2B4A"></button>
    <button class="col-btn"        data-color="#1B5E4B"  onclick="selectColor('#1B5E4B')"  style="background:#1B5E4B"></button>
    <button class="col-btn"        data-color="#E8A8B8"  onclick="selectColor('#E8A8B8')"  style="background:#E8A8B8"></button>
    <button class="col-btn"        data-color="#5C1678"  onclick="selectColor('#5C1678')"  style="background:#5C1678"></button>
    <button class="col-btn"        data-color="#C04B1A"  onclick="selectColor('#C04B1A')"  style="background:#C04B1A"></button>
    <button class="col-btn"        data-color="#0B6E7A"  onclick="selectColor('#0B6E7A')"  style="background:#0B6E7A"></button>
    <button class="col-btn"        data-color="#F5E6D0"  onclick="selectColor('#F5E6D0')"  style="background:#F5E6D0"></button>
    <button class="col-btn"        data-color="#BDC3C7"  onclick="selectColor('#BDC3C7')"  style="background:#BDC3C7"></button>
    <button class="col-btn"        data-color="#F4C6D0"  onclick="selectColor('#F4C6D0')"  style="background:#F4C6D0"></button>
    <button class="col-btn col-custom" onclick="document.getElementById('colorInput').click()">\ud83c\udfa8</button>
    <input type="color" id="colorInput" value="#8B2252">
  </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script>
(function(){
'use strict';

// ── Fabric definitions ─────────────────────────────────────────────────
var FABRICS = {
  silk:      { label:'Silk',      desc:'High sheen \u00b7 fluid drape',      roughness:0.12, metalness:0.03, sheen:0.75, sheenR:0.20, waveAmp:0.048, waveSpeed:0.80, waveFreq:1.8, curve:0.20, ntype:'diagonal',  nscale:0.12 },
  georgette: { label:'Georgette', desc:'Soft crepe \u00b7 textured flow',     roughness:0.58, metalness:0.00, sheen:0.15, sheenR:0.70, waveAmp:0.030, waveSpeed:1.20, waveFreq:3.5, curve:0.12, ntype:'crumple',   nscale:0.18 },
  chiffon:   { label:'Chiffon',   desc:'Sheer \u00b7 airy \u00b7 flowing',   roughness:0.45, metalness:0.00, sheen:0.08, sheenR:0.60, waveAmp:0.065, waveSpeed:1.60, waveFreq:4.0, curve:0.14, ntype:'fine',       nscale:0.08 },
  cotton:    { label:'Cotton',    desc:'Matte \u00b7 crisp \u00b7 structured',roughness:0.92, metalness:0.00, sheen:0.00, sheenR:1.00, waveAmp:0.010, waveSpeed:0.50, waveFreq:2.0, curve:0.08, ntype:'weave',      nscale:0.28 },
  velvet:    { label:'Velvet',    desc:'Rich \u00b7 deep \u00b7 luxurious',   roughness:0.20, metalness:0.00, sheen:1.00, sheenR:0.12, waveAmp:0.008, waveSpeed:0.40, waveFreq:1.5, curve:0.10, ntype:'brushed',    nscale:0.15 },
  brocade:   { label:'Brocade',   desc:'Woven \u00b7 opulent \u00b7 rich',    roughness:0.32, metalness:0.14, sheen:0.50, sheenR:0.35, waveAmp:0.006, waveSpeed:0.30, waveFreq:1.2, curve:0.08, ntype:'geometric',  nscale:0.22 }
};

var COLOR_NAMES = { '#ffffff':'Original','#8B2252':'Rose','#C9A96E':'Gold','#1A2B4A':'Navy','#1B5E4B':'Emerald','#E8A8B8':'Blush','#5C1678':'Plum','#C04B1A':'Copper','#0B6E7A':'Teal','#F5E6D0':'Cream','#BDC3C7':'Pewter','#F4C6D0':'Petal' };

var curFabKey = 'silk';
var curColor = '#ffffff';
var frontTex = null, backTex = null;
var matShaders = [];
var hintTimer;

// ── Canvas and renderer ───────────────────────────────────────────────
var canvasEl = document.getElementById('c');
var loaderEl = document.getElementById('loader');
var viewLabel = document.getElementById('view-label');
var fabricLabel = document.getElementById('fabric-label');
var hintEl = document.getElementById('hint');

var W = window.innerWidth;
var H = window.innerHeight - 96; // leave room for panel

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0D0508);

var camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
camera.position.set(0, 0.06, 3.8);

var renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
// NOTE: physicallyCorrectLights intentionally disabled — it requires lux-scale intensities
// which would make our normalised lights invisible (black scene).

// ── Lighting ──────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff8f0, 0.65));
var kl = new THREE.DirectionalLight(0xffd090, 1.1); kl.position.set(2, 4, 5); scene.add(kl);
var rl = new THREE.DirectionalLight(0x8B2252, 0.40); rl.position.set(-3, 0.5, -2.5); scene.add(rl);
var fl = new THREE.DirectionalLight(0xffffff, 0.28); fl.position.set(0, -2, 3); scene.add(fl);
var tl = new THREE.DirectionalLight(0xfff0d0, 0.45); tl.position.set(0, 5, 1); scene.add(tl);

// ── Procedural normal maps ────────────────────────────────────────────
var normalCache = {};
function makeNormalTex(type) {
  if (normalCache[type]) return normalCache[type];
  var sz = 256;
  var cv = document.createElement('canvas');
  cv.width = cv.height = sz;
  var ctx = cv.getContext('2d');
  var img = ctx.createImageData(sz, sz);
  for (var y = 0; y < sz; y++) {
    for (var x = 0; x < sz; x++) {
      var idx = (y*sz+x)*4;
      var nx = 0, ny = 0;
      if (type === 'diagonal') {
        var d = (x+y) % 8;
        var b = d<4 ? d/4 : (8-d)/4;
        nx = b*0.35; ny = -b*0.35;
      } else if (type === 'weave') {
        var bx = (x%6)<3 ? 0.3 : -0.3;
        var by2 = (y%6)<3 ? 0.3 : -0.3;
        nx = bx; ny = by2;
      } else if (type === 'crumple') {
        nx = (Math.sin(x*0.45)*Math.cos(y*0.32) + Math.sin(x*1.1+y*0.7)*0.5)*0.32;
        ny = (Math.cos(x*0.31)*Math.sin(y*0.42) + Math.cos(x*0.7-y*1.1)*0.5)*0.32;
      } else if (type === 'brushed') {
        var hy = y%5;
        nx = (hy<2.5 ? hy/2.5 : (5-hy)/2.5)*0.28;
        ny = 0.08;
      } else if (type === 'geometric') {
        var cx2 = (x%20)-10, cy2 = (y%20)-10;
        var r = Math.abs(cx2)+Math.abs(cy2);
        var bump = Math.max(0, 1-r/10);
        nx = cx2/10*bump*0.45; ny = cy2/10*bump*0.45;
      } else {
        nx = Math.sin(x*0.82+y*0.5)*0.12;
        ny = Math.cos(x*0.5-y*0.82)*0.12;
      }
      img.data[idx]   = Math.round(Math.min(255,Math.max(0,(nx+0.5)*255)));
      img.data[idx+1] = Math.round(Math.min(255,Math.max(0,(ny+0.5)*255)));
      img.data[idx+2] = 255;
      img.data[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  var tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  normalCache[type] = tex;
  return tex;
}

// ── Build material ────────────────────────────────────────────────────
function buildMat(fab, hexColor, mapTex, isBack) {
  var col = new THREE.Color(hexColor);
  var mat = new THREE.MeshPhysicalMaterial({
    color: col,
    roughness: fab.roughness,
    metalness: fab.metalness,
    sheen: fab.sheen,
    sheenColor: col.clone().multiplyScalar(1.6),
    sheenRoughness: fab.sheenR,
    side: THREE.FrontSide
  });

  mat.normalMap = makeNormalTex(fab.ntype);
  mat.normalScale = new THREE.Vector2(fab.nscale, fab.nscale);

  if (mapTex) {
    mat.map = mapTex;
    mat.color.set(0xffffff);
  }

  // GPU fabric draping via custom vertex shader
  mat.onBeforeCompile = function(shader) {
    shader.uniforms.u_time  = { value: 0 };
    shader.uniforms.u_amp   = { value: fab.waveAmp };
    shader.uniforms.u_speed = { value: fab.waveSpeed };
    shader.uniforms.u_freq  = { value: fab.waveFreq };
    shader.uniforms.u_curve = { value: fab.curve * (isBack ? -1.0 : 1.0) };

    // MUST declare uniforms in GLSL source — Three.js only passes values;
    // the shader won't compile (→ black mesh) unless the declarations exist.
    var decls = [
      'uniform float u_time;',
      'uniform float u_amp;',
      'uniform float u_speed;',
      'uniform float u_freq;',
      'uniform float u_curve;'
    ].join('\\n') + '\\n';
    shader.vertexShader = decls + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      [
        'vec3 transformed = position;',
        'float normY = clamp((position.y + 1.4) / 2.8, 0.0, 1.0);',
        'float hem = normY * normY;',
        'float cv = 1.0 - pow(position.x / 1.1, 2.0);',
        'transformed.z += cv * u_curve;',
        'transformed.z += sin(u_time * u_speed + position.x * u_freq) * u_amp * hem;',
        'transformed.x += cos(u_time * u_speed * 0.6 + position.y * u_freq * 0.7) * u_amp * 0.3 * hem;'
      ].join('\\n')
    );
    mat.userData.shader = shader;
    matShaders.push(shader);
  };

  return mat;
}

// ── Meshes ────────────────────────────────────────────────────────────
var group = new THREE.Group();
scene.add(group);

var frontGeo = new THREE.PlaneGeometry(2.2, 2.8, 28, 28);
var backGeo  = new THREE.PlaneGeometry(2.2, 2.8, 28, 28);

var fab0 = FABRICS['silk'];
var frontMesh = new THREE.Mesh(frontGeo, buildMat(fab0, curColor, null, false));
frontMesh.position.z = 0.07;

var backMesh = new THREE.Mesh(backGeo, buildMat(fab0, curColor, null, true));
backMesh.position.z = -0.07;
backMesh.rotation.y = Math.PI;

group.add(frontMesh, backMesh);

// Decorative ring
var ring = new THREE.Mesh(
  new THREE.TorusGeometry(1.65, 0.010, 12, 90),
  new THREE.MeshBasicMaterial({ color:0xC9A96E, transparent:true, opacity:0.09 })
);
ring.position.z = -0.5;
scene.add(ring);

// ── Rebuild materials when fabric/color changes ───────────────────────
function rebuildMaterials() {
  var fab = FABRICS[curFabKey];

  matShaders.length = 0;
  frontMesh.material.dispose();
  backMesh.material.dispose();

  frontMesh.material = buildMat(fab, curColor, frontTex, false);
  backMesh.material  = buildMat(fab, curColor, backTex,  true);

  fabricLabel.textContent = fab.label + ' \u00b7 ' + fab.desc;
}

// ── selectFab / selectColor (called by inline onclick) ────────────────
window.selectFab = function(key) {
  curFabKey = key;
  document.querySelectorAll('.fab-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.fab === key);
  });
  rebuildMaterials();
  notifyRN();
};

window.selectColor = function(hex) {
  curColor = hex;
  document.querySelectorAll('.col-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset && b.dataset.color === hex);
  });
  rebuildMaterials();
  notifyRN();
};

// Custom color input
document.getElementById('colorInput').addEventListener('input', function(e) {
  window.selectColor(e.target.value);
});

// ── Load textures ─────────────────────────────────────────────────────
var texLoaded = 0;
function onTexReady() {
  texLoaded++;
  if (texLoaded >= 2) {
    rebuildMaterials();
    loaderEl.style.display = 'none';
    viewLabel.style.display = 'block';
    hintEl.style.display = 'block';
    hintTimer = setTimeout(function(){ hintEl.style.opacity = '0'; }, 4200);
  }
}

window.setImages = function(fUri, bUri) {
  var isSvg = (fUri && fUri.indexOf('image/svg+xml') !== -1);
  if (isSvg) {
    // SVG illustrations: show as clean 2D side-by-side preview
    var canvas = document.getElementById('c');
    var overlay = document.getElementById('overlay');
    var flatView = document.getElementById('flat-view');
    canvas.style.display = 'none';
    overlay.style.display = 'none';
    flatView.style.display = 'block';
    flatView.innerHTML =
      '<div style="display:flex;height:100%;gap:0;">'
      + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 6px 12px 12px;gap:8px;">'
      +   '<div style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:8px;width:100%;">'
      +     '<img src="'+fUri+'" style="width:100%;height:auto;border-radius:8px;display:block;" />'
      +   '</div>'
      +   '<span style="color:rgba(201,169,110,0.7);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">FRONT VIEW</span>'
      + '</div>'
      + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 12px 12px 6px;gap:8px;">'
      +   '<div style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.2);border-radius:12px;padding:8px;width:100%;">'
      +     '<img src="'+bUri+'" style="width:100%;height:auto;border-radius:8px;display:block;" />'
      +   '</div>'
      +   '<span style="color:rgba(201,169,110,0.7);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">BACK VIEW</span>'
      + '</div>'
      + '</div>';
    return;
  }
  // Raster images: load as 3D texture (existing behaviour)
  texLoaded = 0;
  var loader = new THREE.TextureLoader();
  loader.load(fUri, function(tex) {
    frontTex = tex;
    frontTex.encoding = THREE.sRGBEncoding;
    onTexReady();
  }, undefined, function(){ frontTex = null; onTexReady(); });
  loader.load(bUri, function(tex) {
    tex.repeat.set(-1,1); tex.offset.set(1,0);
    tex.encoding = THREE.sRGBEncoding;
    backTex = tex;
    onTexReady();
  }, undefined, function(){ backTex = null; onTexReady(); });
};

// ── postMessage to host ───────────────────────────────────────────────
function notifyRN() {
  var msg = JSON.stringify({ type:'fabricChange', fabric:curFabKey, color:curColor });
  try {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
    else if (window.parent !== window) window.parent.postMessage(msg,'*');
  } catch(e){}
}

// ── Interaction ───────────────────────────────────────────────────────
var rotY=0, rotX=0, velY=0, velX=0;
var isDragging=false, prevX=0, prevY=0;
var hasInteracted=false;

function pointerStart(x,y){ isDragging=true; prevX=x; prevY=y; velY=0; velX=0; if(!hasInteracted){hasInteracted=true;clearTimeout(hintTimer);hintEl.style.opacity='0';} }
function pointerMove(x,y){ if(!isDragging)return; var dx=x-prevX, dy=y-prevY; velY=dx*0.013; velX=dy*0.005; rotY+=velY; rotX=Math.max(-0.44,Math.min(0.44,rotX+velX)); prevX=x; prevY=y; }
function pointerEnd(){ isDragging=false; }

var initPD=0, initCZ=3.8;
canvasEl.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    initPD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    initCZ=camera.position.z;
  } else { pointerStart(e.touches[0].clientX,e.touches[0].clientY); }
},{passive:false});
canvasEl.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===2){
    var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    camera.position.z=Math.max(2.2,Math.min(7,initCZ*(initPD/d)));
  } else { pointerMove(e.touches[0].clientX,e.touches[0].clientY); }
},{passive:false});
canvasEl.addEventListener('touchend',pointerEnd,{passive:true});
canvasEl.addEventListener('mousedown',function(e){ pointerStart(e.clientX,e.clientY); });
canvasEl.addEventListener('mousemove',function(e){ pointerMove(e.clientX,e.clientY); });
canvasEl.addEventListener('mouseup',pointerEnd);
canvasEl.addEventListener('mouseleave',pointerEnd);
canvasEl.addEventListener('wheel',function(e){ camera.position.z=Math.max(2.2,Math.min(7,camera.position.z+e.deltaY*0.005)); },{passive:true});

// ── View label ────────────────────────────────────────────────────────
function updateLabel(){
  var a=((rotY%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  var back = a>Math.PI*0.42 && a<Math.PI*1.58;
  viewLabel.textContent = back ? 'BACK VIEW' : 'FRONT VIEW';
}

// ── Render loop ───────────────────────────────────────────────────────
var startMs = Date.now();
function animate(){
  requestAnimationFrame(animate);
  var t = (Date.now()-startMs)*0.001;

  matShaders.forEach(function(sh){
    if(sh.uniforms.u_time) sh.uniforms.u_time.value = t;
  });

  if(!isDragging){
    if(!hasInteracted){ rotY += 0.007; }
    else { velY*=0.93; velX*=0.93; rotY+=velY; rotX=Math.max(-0.44,Math.min(0.44,rotX+velX)); }
  }

  group.rotation.y = rotY;
  group.rotation.x = rotX;
  ring.rotation.z += 0.003;
  updateLabel();
  renderer.render(scene, camera);
}
animate();

// ── Receive from host (native postMessage / iframe postMessage) ───────
function handleMsg(e){
  try {
    var d = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
    if(d && d.frontUri && d.backUri){ window.setImages(d.frontUri, d.backUri); }
    if(d && d.fabric){ window.selectFab(d.fabric); }
    if(d && d.color){ window.selectColor(d.color); }
  } catch(err){}
}
window.addEventListener('message', handleMsg);
document.addEventListener('message', handleMsg);

// ── Auto-load for web embed version ──────────────────────────────────
(function(){
  var fUri = ${fJson};
  var bUri = ${bJson};
  if(fUri && bUri){
    // Show loader until textures arrive
    loaderEl.style.display = 'flex';
    // Delay slightly to let Three.js finish initialising
    setTimeout(function(){ window.setImages(fUri, bUri); }, 120);
  } else {
    // No images: show fabric preview immediately with solid colour
    texLoaded = 2;
    loaderEl.style.display = 'none';
    viewLabel.style.display = 'block';
    hintEl.style.display = 'block';
    hintTimer = setTimeout(function(){ hintEl.style.opacity='0'; }, 4200);
  }
})();

})(); // end IIFE
</script>
</body>
</html>`;
}
