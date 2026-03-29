import React, { useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

interface BlouseViewer3DProps {
  frontUri: string;
  backUri: string;
  width: number;
  height: number;
}

function buildHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;overflow:hidden;background:#0D0508;}
canvas{display:block;}
#loader{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:#0D0508;gap:16px;
}
#spinner{
  width:38px;height:38px;
  border:3px solid rgba(201,169,110,0.18);
  border-top-color:#C9A96E;
  border-radius:50%;
  animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg);}}
#loaderText{
  color:rgba(201,169,110,0.65);
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:13px;letter-spacing:0.4px;text-align:center;line-height:1.6;
}
#label{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);
  background:rgba(201,169,110,0.12);
  border:1px solid rgba(201,169,110,0.28);
  color:rgba(201,169,110,0.92);
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;
  padding:5px 14px;border-radius:20px;pointer-events:none;
  display:none;
}
#hint{
  position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
  background:rgba(0,0,0,0.38);
  color:rgba(255,255,255,0.4);
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:10px;padding:4px 14px;border-radius:20px;pointer-events:none;
  white-space:nowrap;transition:opacity 1s;
}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="loader">
  <div id="spinner"></div>
  <div id="loaderText">Rendering 3D preview…<br>Front &amp; back views loading</div>
</div>
<div id="label">FRONT VIEW</div>
<div id="hint">Drag to rotate · Pinch to zoom</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script>
(function(){
  var canvas = document.getElementById('c');
  var loaderEl = document.getElementById('loader');
  var labelEl = document.getElementById('label');
  var hintEl = document.getElementById('hint');

  var W = window.innerWidth, H = window.innerHeight;
  canvas.width = W; canvas.height = H;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0D0508);

  var camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 100);
  camera.position.set(0, 0.1, 3.8);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  // Lighting — warm luxury
  scene.add(new THREE.AmbientLight(0xfff5e8, 0.55));

  var keyLight = new THREE.DirectionalLight(0xffc875, 1.0);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  var rimLight = new THREE.DirectionalLight(0x8B2252, 0.45);
  rimLight.position.set(-3, 0.5, -2.5);
  scene.add(rimLight);

  var fillLight = new THREE.DirectionalLight(0xffffff, 0.18);
  fillLight.position.set(0, -2, 3);
  scene.add(fillLight);

  // Group for the whole model
  var group = new THREE.Group();
  scene.add(group);

  // Materials — start with placeholder colours
  var edgeColor = new THREE.Color(0x4a1128);
  var matR = new THREE.MeshLambertMaterial({ color: edgeColor });
  var matL = new THREE.MeshLambertMaterial({ color: edgeColor });
  var matT = new THREE.MeshLambertMaterial({ color: edgeColor });
  var matB = new THREE.MeshLambertMaterial({ color: edgeColor });
  var matF = new THREE.MeshLambertMaterial({ color: 0x1e0810 });
  var matBk = new THREE.MeshLambertMaterial({ color: 0x150610 });

  // BoxGeometry face order: +X, -X, +Y, -Y, +Z(front), -Z(back)
  var geo = new THREE.BoxGeometry(2.2, 2.52, 0.13);
  var blouse = new THREE.Mesh(geo, [matR, matL, matT, matB, matF, matBk]);
  group.add(blouse);

  // Soft shadow plate below
  var shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.38;
  group.add(shadowMesh);

  // Decorative gold ring behind card
  var ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.011, 12, 90),
    new THREE.MeshBasicMaterial({ color: 0xC9A96E, transparent: true, opacity: 0.1 })
  );
  ring.position.z = -0.55;
  scene.add(ring);

  // Rotation state
  var rotY = 0, rotX = 0;
  var velY = 0, velX = 0;
  var isDragging = false;
  var prevX = 0, prevY = 0;
  var hasInteracted = false;
  var hintTimer;

  function onStart(x, y) {
    isDragging = true;
    prevX = x; prevY = y;
    velY = 0; velX = 0;
    if (!hasInteracted) {
      hasInteracted = true;
      hintEl.style.opacity = '0';
      clearTimeout(hintTimer);
    }
  }
  function onMove(x, y) {
    if (!isDragging) return;
    var dx = x - prevX, dy = y - prevY;
    velY = dx * 0.013;
    velX = dy * 0.005;
    rotY += velY;
    rotX = Math.max(-0.45, Math.min(0.45, rotX + velX));
    prevX = x; prevY = y;
  }
  function onEnd() { isDragging = false; }

  // Pinch zoom
  var initPinchDist = 0, initCamZ = 3.8;
  canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      initPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initCamZ = camera.position.z;
    } else {
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      var d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camera.position.z = Math.max(2.4, Math.min(6.5, initCamZ * (initPinchDist / d)));
    } else {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });
  canvas.addEventListener('touchend', onEnd, { passive: true });

  // Mouse (web preview)
  canvas.addEventListener('mousedown', function(e){ onStart(e.clientX, e.clientY); });
  canvas.addEventListener('mousemove', function(e){ onMove(e.clientX, e.clientY); });
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('mouseleave', onEnd);
  canvas.addEventListener('wheel', function(e) {
    camera.position.z = Math.max(2.4, Math.min(6.5, camera.position.z + e.deltaY * 0.005));
  }, { passive: true });

  // Label
  function updateLabel() {
    var angle = ((rotY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var showingBack = angle > Math.PI * 0.45 && angle < Math.PI * 1.55;
    labelEl.textContent = showingBack ? 'BACK VIEW' : 'FRONT VIEW';
  }

  // Load front+back textures
  window.setImages = function(frontUri, backUri) {
    var loader = new THREE.TextureLoader();
    var loaded = 0;

    function onReady() {
      loaded++;
      if (loaded >= 2) {
        loaderEl.style.display = 'none';
        labelEl.style.display = 'block';
        hintTimer = setTimeout(function(){ hintEl.style.opacity = '0'; }, 4000);
      }
    }

    loader.load(frontUri, function(tex) {
      matF.map = tex;
      matF.color.set(0xffffff);
      matF.needsUpdate = true;
      onReady();
    }, undefined, function() { onReady(); });

    loader.load(backUri, function(tex) {
      // Flip horizontally to correct the mirror on the -Z face
      tex.repeat.set(-1, 1);
      tex.offset.set(1, 0);
      matBk.map = tex;
      matBk.color.set(0xffffff);
      matBk.needsUpdate = true;
      onReady();
    }, undefined, function() { onReady(); });
  };

  // Render loop
  function animate() {
    requestAnimationFrame(animate);

    if (!isDragging) {
      if (!hasInteracted) {
        rotY += 0.007;
      } else {
        velY *= 0.94;
        velX *= 0.94;
        rotY += velY;
        rotX = Math.max(-0.45, Math.min(0.45, rotX + velX));
      }
    }

    group.rotation.y = rotY;
    group.rotation.x = rotX;
    ring.rotation.z += 0.003;

    updateLabel();
    renderer.render(scene, camera);
  }
  animate();

  // Receive from RN via postMessage
  window.addEventListener('message', function(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.frontUri && d.backUri) window.setImages(d.frontUri, d.backUri);
    } catch(err) {}
  });
  // Also for iOS WKWebView
  if (window.document) {
    document.addEventListener('message', function(e) {
      try {
        var d = JSON.parse(e.data);
        if (d.frontUri && d.backUri) window.setImages(d.frontUri, d.backUri);
      } catch(err) {}
    });
  }
})();
</script>
</body>
</html>`;
}

const BlouseViewer3D: React.FC<BlouseViewer3DProps> = ({ frontUri, backUri, width, height }) => {
  const webViewRef = useRef<WebView>(null);

  const html = buildHtml();

  const onLoad = () => {
    const escaped = JSON.stringify({ frontUri, backUri });
    webViewRef.current?.injectJavaScript(`
      (function(){
        var d=${escaped};
        if(typeof window.setImages==='function'){window.setImages(d.frontUri,d.backUri);}
      })();
      true;
    `);
  };

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#0D0508" }}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        onLoad={onLoad}
        style={{ width, height, backgroundColor: "#0D0508" }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default BlouseViewer3D;
