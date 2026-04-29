// Shared HTML builder for BlouseViewer3D — used by both native (WebView) and web (iframe) renders.
// All Three.js code, fabric simulation, UI, and messaging lives inside this self-contained HTML string.

export interface BlouseStyleParamsObj {
  neck?: string;
  sleeve?: string;
  back?: string;
  color?: string;
  fabric?: string;
}

export interface BlouseViewerHtmlOptions {
  /** Pass true for the web (iframe) version — images are embedded directly in JS. */
  embedImages?: boolean;
  frontUri?: string;
  backUri?: string;
  /** Embed style params directly in HTML so the blouse draws on first paint — no injectJavaScript needed */
  styleParams?: { front: BlouseStyleParamsObj; back: BlouseStyleParamsObj };
}

export function buildBlouseViewerHtml(opts: BlouseViewerHtmlOptions = {}): string {
  const { embedImages = false, frontUri = "", backUri = "", styleParams } = opts;

  // Safely embed data URIs (may be very long base64 strings)
  const fJson = embedImages ? JSON.stringify(frontUri) : "null";
  const bJson = embedImages ? JSON.stringify(backUri) : "null";

  // Pre-embed style params so the blouse draws immediately on load (no injectJavaScript timing issues)
  const spJson = styleParams ? JSON.stringify(styleParams) : "null";

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
<div id="flat-view" style="display:none;position:absolute;top:0;left:0;right:0;bottom:96px;background:#0D0508;overflow:hidden;flex-direction:column;align-items:center;justify-content:center;">
  <div id="flat-label" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(201,169,110,0.1);border:1px solid rgba(201,169,110,0.25);color:rgba(201,169,110,0.9);font-size:9px;font-weight:700;letter-spacing:2.8px;text-transform:uppercase;padding:4px 13px;border-radius:20px;white-space:nowrap;z-index:2;">FRONT VIEW</div>
  <img id="flat-img" src="" alt="" style="width:100%;height:100%;object-fit:contain;display:block;" />
  <button id="flat-flip-btn" onclick="flatFlip()" style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.4);color:#C9A96E;font-size:10px;font-weight:700;letter-spacing:1.5px;padding:7px 24px;border-radius:20px;cursor:pointer;white-space:nowrap;z-index:2;">&#8635; Flip View</button>
</div>

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

var W = Math.max(window.innerWidth  || document.documentElement.clientWidth  || 320, 100);
var H = Math.max((window.innerHeight || document.documentElement.clientHeight || 420) - 96, 100);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0D0508);

var camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
camera.position.set(0, 0.06, 3.8);

var renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
} catch(glErr) {
  console.warn('[BlouseViewer] WebGL unavailable — 3D render disabled:', glErr && glErr.message);
}

// Retry resize — WebView may report 0 initially
function doResize() {
  var w = Math.max(window.innerWidth  || document.documentElement.clientWidth  || 0, 0);
  var h = Math.max((window.innerHeight || document.documentElement.clientHeight || 0) - 96, 0);
  if (w > 0 && h > 0 && (w !== W || h !== H)) {
    W = w; H = h;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    if (renderer) renderer.setSize(W, H);
  }
}
window.addEventListener('resize', doResize);
setTimeout(doResize, 80);
setTimeout(doResize, 400);
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
    side: THREE.FrontSide,
    // Hard alpha-cutout mode:
    //   transparent: false — keeps depthWrite ON and avoids Three.js back-to-front
    //     sorting of the two plane meshes, which was causing one mesh to block the
    //     other when the group rotated (the sort order flips as camera distance flips).
    //   alphaTest: 0.5  — any pixel whose alpha < 0.5 is fully discarded (transparent
    //     neckline hole, outside silhouette). Pixels >= 0.5 are fully opaque.
    //     0.5 is the correct threshold for a garment silhouette with hard edges.
    //   depthWrite: true (default when transparent:false) — opaque silhouette pixels
    //     correctly block anything behind them in the depth buffer.
    transparent: false,
    alphaTest: 0.5,
    depthWrite: true
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
        // normY = 0 at bottom hem (Y=-1.4), 1 at top shoulder (Y=+1.4)
        'float normY = clamp((position.y + 1.4) / 2.8, 0.0, 1.0);',
        // hem weight: maximum drape at BOTTOM hem, zero at shoulders — inverted normY
        'float hem = (1.0 - normY) * (1.0 - normY);',
        // FIX: avoid pow() with potentially negative base (undefined in GLSL ES 1.0).
        // Use multiplication instead: pnx ∈ [-1,1], pnx*pnx ∈ [0,1] always safe.
        'float pnx = position.x / 1.1;',
        'float cv = 1.0 - pnx * pnx;',
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
// renderOrder 1 > 0: front plane always rasterised after back plane.
// With transparent:false + alphaTest the depth buffer handles visibility correctly,
// but explicit renderOrder prevents any edge-case draw-order races during rotation.
frontMesh.renderOrder = 1;

var backMesh = new THREE.Mesh(backGeo, buildMat(fab0, curColor, null, true));
backMesh.position.z = -0.07;
backMesh.rotation.y = Math.PI;
backMesh.renderOrder = 0;

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
    // If SVG texture loading failed completely, fall back to flat image view
    if (!frontTex && !backTex && pendingSvgFront && pendingSvgBack) {
      showFlatView(pendingSvgFront, pendingSvgBack);
      pendingSvgFront = ''; pendingSvgBack = '';
      return;
    }
    rebuildMaterials();
    loaderEl.style.display = 'none';
    viewLabel.style.display = 'block';
    hintEl.style.display = 'block';
    hintTimer = setTimeout(function(){ hintEl.style.opacity = '0'; }, 4200);

  }
}

// ── Pure-JS colour helpers (no THREE.Color dependency) ───────────────────
function _parseHex(hex) {
  var h = (hex || '#8B2252').replace('#','');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}
function _toHex(r,g,b){
  return '#'+ [r,g,b].map(function(x){
    return ('0'+Math.round(Math.max(0,Math.min(1,x))*255).toString(16)).slice(-2);
  }).join('');
}
function _scale(hex, f){
  var c = _parseHex(hex);
  return _toHex(c[0]*f, c[1]*f, c[2]*f);
}

// ── Draw blouse design on a canvas — no SVG/API needed ──────────────────
// NOTE: All helpers are declared as var = function(){} at function scope
//       (NOT as function declarations inside try blocks — that breaks strict mode).
function drawBlouseCanvas(p, isBack) {
  var SZ = 512;
  var cnv = document.createElement('canvas');
  cnv.width = cnv.height = SZ;
  var ctx = cnv.getContext('2d');
  if (!ctx) { return null; }

  var neck   = (p && p.neck)   || 'Round';
  var sleeve = (p && p.sleeve) || 'Short';
  var bk     = (p && p.back)   || 'Hook';
  var hex    = (p && p.color)  || '#8B2252';
  var pHex = hex;
  var lHex = _scale(hex, 1.38);
  var dHex = _scale(hex, 0.52);
  var gold = '#C9A96E';

  var CX = SZ / 2;
  var shT = 35, shB = 465;
  var shL = CX - 148, shR = CX + 148;
  var hpL = CX - 182, hpR = CX + 182;
  var ahD = 65;

  // helpers declared as var expressions — safe in strict mode anywhere
  var doBodyPath = function() {
    ctx.beginPath();
    ctx.moveTo(shL, shT);
    ctx.bezierCurveTo(shL - 4, shT + ahD, hpL + 4, shB - 70, hpL, shB);
    ctx.lineTo(hpR, shB);
    ctx.bezierCurveTo(hpR + 4, shB - 70, shR + 4, shT + ahD, shR, shT);
    ctx.closePath();
  };

  var doNeckPath = function() {
    ctx.beginPath();
    if (neck === 'V') {
      ctx.moveTo(shL, shT); ctx.lineTo(shL + 28, shT + 16); ctx.lineTo(CX, shT + 75);
      ctx.lineTo(shR - 28, shT + 16); ctx.lineTo(shR, shT); ctx.closePath();
    } else if (neck === 'Deep V') {
      ctx.moveTo(shL, shT); ctx.lineTo(shL + 22, shT + 14); ctx.lineTo(CX, shT + 105);
      ctx.lineTo(shR - 22, shT + 14); ctx.lineTo(shR, shT); ctx.closePath();
    } else if (neck === 'Sweetheart') {
      ctx.moveTo(shL, shT + 8);
      ctx.bezierCurveTo(shL + 10, shT + 20, shL + 40, shT + 52, CX - 8, shT + 52);
      ctx.bezierCurveTo(CX + 8, shT + 52, shR - 40, shT + 52, shR - 10, shT + 20);
      ctx.lineTo(shR, shT + 8); ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (neck === 'Boat Neck') {
      ctx.moveTo(shL - 4, shT + 8); ctx.quadraticCurveTo(CX, shT + 28, shR + 4, shT + 8);
      ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (neck === 'Square') {
      ctx.rect(shL + 26, shT, shR - shL - 52, 50);
    } else if (neck === 'Halter') {
      ctx.moveTo(shL + 14, shT - 4); ctx.lineTo(CX - 18, shT + 30);
      ctx.quadraticCurveTo(CX, shT + 40, CX + 18, shT + 30);
      ctx.lineTo(shR - 14, shT - 4); ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (neck === 'Off-Shoulder') {
      ctx.moveTo(shL - 24, shT + 24); ctx.quadraticCurveTo(CX, shT + 52, shR + 24, shT + 24);
      ctx.lineTo(shR, shT - 10); ctx.lineTo(shL, shT - 10); ctx.closePath();
    } else {
      ctx.moveTo(shL, shT);
      ctx.bezierCurveTo(shL + 20, shT + 12, CX - 38, shT + 48, CX, shT + 50);
      ctx.bezierCurveTo(CX + 38, shT + 48, shR - 20, shT + 12, shR, shT);
      ctx.closePath();
    }
  };

  var doBackNeckPath = function() {
    ctx.beginPath();
    if (bk === 'Deep Back') {
      ctx.moveTo(shL + 22, shT + 14);
      ctx.bezierCurveTo(shL + 30, shT + 80, CX - 40, shT + 130, CX, shT + 135);
      ctx.bezierCurveTo(CX + 40, shT + 130, shR - 30, shT + 80, shR - 22, shT + 14);
      ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (bk === 'Open Back') {
      ctx.moveTo(shL + 22, shT + 14);
      ctx.bezierCurveTo(shL + 30, shT + 100, CX - 40, shT + 160, CX, shT + 165);
      ctx.bezierCurveTo(CX + 40, shT + 160, shR - 30, shT + 100, shR - 22, shT + 14);
      ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (bk === 'Tie Back') {
      ctx.moveTo(shL + 22, shT + 14);
      ctx.bezierCurveTo(shL + 30, shT + 90, CX - 40, shT + 145, CX, shT + 150);
      ctx.bezierCurveTo(CX + 40, shT + 145, shR - 30, shT + 90, shR - 22, shT + 14);
      ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else if (bk === 'Mid Back') {
      ctx.moveTo(shL + 18, shT + 10);
      ctx.bezierCurveTo(shL + 28, shT + 55, CX - 36, shT + 88, CX, shT + 90);
      ctx.bezierCurveTo(CX + 36, shT + 88, shR - 28, shT + 55, shR - 18, shT + 10);
      ctx.lineTo(shR, shT); ctx.lineTo(shL, shT); ctx.closePath();
    } else {
      ctx.moveTo(shL, shT);
      ctx.bezierCurveTo(shL + 18, shT + 10, CX - 30, shT + 22, CX, shT + 22);
      ctx.bezierCurveTo(CX + 30, shT + 22, shR - 18, shT + 10, shR, shT);
      ctx.closePath();
    }
  };

  // ── Draw ─────────────────────────────────────────────────────────────
  // No background fill — leave canvas transparent so the 3D scene background
  // shows through instead of the dark rectangle being lit differently by scene lights.

  // Sleeves (behind body)
  if (sleeve !== 'None' && sleeve !== 'Sleeveless') {
    var sLen = sleeve === 'Elbow' ? 100 : sleeve === '3/4' ? 135 : sleeve === 'Long' ? 180 : 55;
    ctx.fillStyle = dHex;
    var sides = [[shL, -1], [shR, 1]];
    for (var si = 0; si < sides.length; si++) {
      var tx = sides[si][0], dir = sides[si][1];
      ctx.beginPath();
      if (sleeve === 'Cap') {
        ctx.ellipse(tx + dir * 18, shT + ahD + 4, 20, 14, dir * 0.3, 0, Math.PI * 2);
      } else if (sleeve === 'Puff') {
        ctx.ellipse(tx + dir * 22, shT + ahD + 10, 24, 20, 0, 0, Math.PI * 2);
      } else {
        ctx.moveTo(tx, shT + ahD - 4);
        ctx.bezierCurveTo(tx + dir*28, shT+ahD-14, tx+dir*44, shT+ahD+sLen-30, tx+dir*20, shT+ahD+sLen);
        ctx.lineTo(tx + dir * 5, shT + ahD + sLen);
        ctx.lineTo(tx, shT + ahD + 22);
        ctx.closePath();
      }
      ctx.fill();
      ctx.strokeStyle = dHex; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // Body fill with gradient
  var grd = ctx.createLinearGradient(shL, shT, shR, shB);
  grd.addColorStop(0, lHex);
  grd.addColorStop(0.38, pHex);
  grd.addColorStop(1, dHex);
  doBodyPath();
  ctx.fillStyle = grd;
  ctx.fill();

  // Side shading
  ctx.save();
  doBodyPath();
  ctx.clip();
  var sides2 = [[shL-10, 65, 0.24], [shR-60, 70, 0]];
  for (var s2 = 0; s2 < sides2.length; s2++) {
    var r = sides2[s2];
    var lg = ctx.createLinearGradient(r[0], 0, r[0] + r[1], 0);
    lg.addColorStop(0, s2 === 0 ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0)');
    lg.addColorStop(1, s2 === 0 ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.24)');
    ctx.fillStyle = lg;
    ctx.fillRect(r[0], shT, r[1], shB - shT);
  }
  ctx.restore();

  // Neckline cutout — use destination-out to punch a transparent hole
  // (do NOT fill with the dark bg color, which when lit would cause a mismatch with the scene background)
  ctx.save();
  doBodyPath();
  ctx.clip();
  if (isBack) { doBackNeckPath(); } else { doNeckPath(); }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill();
  ctx.restore();

  // Neckline embroidery
  ctx.save();
  ctx.strokeStyle = gold;
  ctx.lineWidth = 2.2;
  ctx.setLineDash([4, 3]);
  if (isBack) { doBackNeckPath(); } else { doNeckPath(); }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Back details
  if (isBack) {
    for (var i = 0; i < 7; i++) {
      var hy = shT + 30 + i * 30;
      ctx.beginPath(); ctx.arc(CX, hy, 3, 0, Math.PI * 2); ctx.fillStyle = '#9A7040'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(CX-7, hy); ctx.lineTo(CX+7, hy); ctx.strokeStyle='#9A7040'; ctx.lineWidth=1.2; ctx.stroke();
    }
    ctx.save(); ctx.setLineDash([5,4]); ctx.strokeStyle='#9A7040'; ctx.lineWidth=0.9; ctx.globalAlpha=0.5;
    ctx.beginPath(); ctx.moveTo(CX, shT+24); ctx.lineTo(CX, shB-14); ctx.stroke(); ctx.restore();
  } else {
    ctx.save(); ctx.setLineDash([6,5]); ctx.strokeStyle='#9A7040'; ctx.lineWidth=0.8; ctx.globalAlpha=0.3;
    ctx.beginPath(); ctx.moveTo(CX, shT+55); ctx.lineTo(CX, shB-14); ctx.stroke(); ctx.restore();
  }

  // Hem embroidery
  ctx.strokeStyle = gold; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(hpL, shB); ctx.lineTo(hpR, shB); ctx.stroke();
  for (var j = 0; j <= 14; j++) {
    var ex = hpL + 10 + j * ((hpR - hpL - 20) / 14);
    ctx.beginPath(); ctx.arc(ex, shB+8, 4, 0, Math.PI*2); ctx.strokeStyle=gold; ctx.lineWidth=1.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, shB+8, 1.8, 0, Math.PI*2); ctx.fillStyle=gold; ctx.fill();
  }
  ctx.beginPath(); ctx.moveTo(hpL, shB+16); ctx.lineTo(hpR, shB+16); ctx.strokeStyle=gold; ctx.lineWidth=1; ctx.stroke();

  // Body outline
  doBodyPath();
  ctx.strokeStyle = dHex; ctx.lineWidth = 2.2; ctx.stroke();

  try {
    var tex = new THREE.CanvasTexture(cnv);
    tex.needsUpdate = true;
    // Ensure colour-space matches the regular TextureLoader path
    if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
    if (isBack) { tex.repeat.set(-1, 1); tex.offset.set(1, 0); }
    return tex;
  } catch(e) { return null; }
}

// Called by host with style params — draws texture without any API call
window.setStyleParams = function(frontP, backP) {
  try {
    if (hintTimer) clearTimeout(hintTimer);
    var ft = drawBlouseCanvas(frontP || {}, false);
    var bt = drawBlouseCanvas(backP  || {}, true);
    if (ft) { frontTex = ft; }
    if (bt) { backTex  = bt; }
    texLoaded = 2;
    rebuildMaterials();
    loaderEl.style.display = 'none';
    viewLabel.style.display = 'block';
    hintEl.style.display = 'block';
    hintTimer = setTimeout(function() { hintEl.style.opacity = '0'; }, 4200);
  } catch(err) {
    console.error('setStyleParams failed:', err);
  }
};

// ── Flat view fallback (used when 3D texture loading fails) ──────────────────
var flatFront = '', flatBack = '', flatShowingBack = false;
var flatViewEl = document.getElementById('flat-view');
var flatImgEl  = document.getElementById('flat-img');
var flatLblEl  = document.getElementById('flat-label');

function showFlatView(fUri, bUri) {
  flatFront = fUri; flatBack = bUri; flatShowingBack = false;
  flatImgEl.src = fUri;
  flatLblEl.textContent = 'FRONT VIEW';
  flatViewEl.style.display = 'flex';
  document.getElementById('c').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  loaderEl.style.display = 'none';
}

window.flatFlip = function() {
  flatShowingBack = !flatShowingBack;
  flatImgEl.src = flatShowingBack ? flatBack : flatFront;
  flatLblEl.textContent = flatShowingBack ? 'BACK VIEW' : 'FRONT VIEW';
};

// Load SVG via Blob URL — same-origin blob: URLs never taint a canvas,
// unlike data: SVG URIs which are treated as cross-origin in some WebViews.
function loadSvgTex(uri, isBack, done) {
  try {
    var b64 = uri.split(',')[1];
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var k = 0; k < binary.length; k++) bytes[k] = binary.charCodeAt(k);
    var blob = new Blob([bytes], { type: 'image/svg+xml' });
    var blobUrl = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function() {
      var cnv = document.createElement('canvas');
      // Match SVG aspect ratio exactly so the silhouette maps correctly onto the plane UVs.
      // Drawing a 400×520 SVG into a 1024×1024 square was squishing the silhouette, which
      // shifted the opaque/transparent boundary and produced visible dark strips.
      var svgW = img.naturalWidth  || img.width  || 400;
      var svgH = img.naturalHeight || img.height || 520;
      var texSize = 1024;
      // Scale so the larger dimension fills texSize, keeping aspect ratio.
      var scale = texSize / Math.max(svgW, svgH);
      var drawW = Math.round(svgW * scale);
      var drawH = Math.round(svgH * scale);
      var offX = Math.round((texSize - drawW) / 2);
      var offY = Math.round((texSize - drawH) / 2);
      cnv.width = texSize; cnv.height = texSize;
      var c2 = cnv.getContext('2d');
      try {
        // Draw SVG centered and aspect-correct into the square canvas.
        // The margins (offX, offY) are transparent, matching the transparent scene background.
        c2.drawImage(img, offX, offY, drawW, drawH);
        URL.revokeObjectURL(blobUrl);
        var tex = new THREE.CanvasTexture(cnv);
        tex.needsUpdate = true;
        // Match the encoding used by TextureLoader path — without this
        // the colours are subtly wrong (LinearEncoding treats sRGB data as already linear).
        if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
        if (isBack) { tex.repeat.set(-1, 1); tex.offset.set(1, 0); }
        done(tex);
      } catch(e) {
        URL.revokeObjectURL(blobUrl);
        done(null);
      }
    };
    img.onerror = function() { URL.revokeObjectURL(blobUrl); done(null); };
    img.src = blobUrl;
  } catch(e) { done(null); }
}

function loadTex(uri, isBack, done) {
  if (!uri) { done(null); return; }
  if (uri.indexOf('image/svg+xml') !== -1) {
    loadSvgTex(uri, isBack, done);
  } else {
    var loader = new THREE.TextureLoader();
    loader.load(uri, function(tex) {
      if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;
      if (isBack) { tex.repeat.set(-1, 1); tex.offset.set(1, 0); }
      done(tex);
    }, undefined, function() { done(null); });
  }
}

// Track the pending SVG URIs so we can fall back to flat view if 3D fails
var pendingSvgFront = '', pendingSvgBack = '';

window.setImages = function(fUri, bUri) {
  // Log raw image receipt for debugging — helps verify the generated image is correct
  // before the 3D pipeline touches it.
  console.log('[BlouseViewer] setImages called — front type:', fUri ? fUri.split(';')[0] : 'null',
    'front length:', fUri ? fUri.length : 0,
    '| back type:', bUri ? bUri.split(';')[0] : 'null',
    'back length:', bUri ? bUri.length : 0);
  var isSvg = (fUri && fUri.indexOf('image/svg+xml') !== -1) ||
              (bUri && bUri.indexOf('image/svg+xml') !== -1);
  if (isSvg) {
    pendingSvgFront = fUri; pendingSvgBack = bUri;
  }
  texLoaded = 0;
  loadTex(fUri, false, function(tex) {
    console.log('[BlouseViewer] front texture loaded:', tex ? 'OK' : 'FAILED');
    frontTex = tex; onTexReady();
  });
  loadTex(bUri, true, function(tex) {
    console.log('[BlouseViewer] back texture loaded:', tex ? 'OK' : 'FAILED');
    backTex = tex; onTexReady();
  });
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
  if (renderer) renderer.render(scene, camera);
}
animate();

// ── Receive from host (native postMessage / iframe postMessage) ───────
function handleMsg(e){
  try {
    var d = typeof e.data==='string' ? JSON.parse(e.data) : e.data;
    if(d && d.front && d.back){ window.setStyleParams(d.front, d.back); }
    else if(d && d.frontUri && d.backUri){ window.setImages(d.frontUri, d.backUri); }
    if(d && d.fabric){ window.selectFab(d.fabric); }
    if(d && d.color){ window.selectColor(d.color); }
  } catch(err){}
}
window.addEventListener('message', handleMsg);
document.addEventListener('message', handleMsg);

// ── Auto-load: draw from embedded params or images ────────────────────
(function(){
  var sp = ${spJson};
  var fUri = ${fJson};
  var bUri = ${bJson};
  if(sp && sp.front && sp.back){
    // Style params embedded in HTML — draw immediately, no API/CDN wait
    window.setStyleParams(sp.front, sp.back);
  } else if(fUri && bUri){
    // Pre-generated image URIs — always try 3D first (SVG via Blob URL); flat view is the fallback
    loaderEl.style.display = 'flex';
    setTimeout(function(){ window.setImages(fUri, bUri); }, 120);
  } else {
    // Nothing yet — show solid fabric preview
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
