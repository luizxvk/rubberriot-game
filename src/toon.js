// Materiais toon + contorno de tinta (casco invertido com normais suavizadas).
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]), 3, 1);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;

export const INK = 0x141210;
export const PAL = {
  ink: 0x1b1916, dark: 0x3a3632, mid: 0x6e6a63, wood: 0x9d9384, light: 0xcfc9bd, paper: 0xece9e1, white: 0xfaf8f2,
  red: 0xa83a2c, blue: 0x2f5b8a,
};

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + (opts.map ? opts.map.uuid : '') + (opts.emissive || '');
  if (!opts.map && !opts.unique && matCache.has(key)) return matCache.get(key);
  const { unique, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...rest });
  if (!unique) matCache.set(key, m);
  return m;
}

const outlineMat = new THREE.ShaderMaterial({
  uniforms: { th: { value: 0.045 } },
  vertexShader: `
    uniform float th;
    attribute float _x;
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      // espessura cresce um pouco com a distancia pra nao sumir longe
      float k = th * clamp(-mv.z * 0.06 + 0.7, 0.7, 3.0);
      mv.xyz += n * k;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.07,0.06,0.055,1.0); }`,
  side: THREE.BackSide,
});
const outlineMats = new Map();
function getOutlineMat(th) {
  if (!outlineMats.has(th)) { const m = outlineMat.clone(); m.uniforms.th.value = th; outlineMats.set(th, m); }
  return outlineMats.get(th);
}

const geoCache = new WeakMap();
export function smoothGeo(g) {
  if (geoCache.has(g)) return geoCache.get(g);
  const c = g.clone();
  for (const k of Object.keys(c.attributes)) if (k !== 'position') c.deleteAttribute(k);
  const m = mergeVertices(c, 1e-3);
  m.computeVertexNormals();
  geoCache.set(g, m);
  return m;
}

export function outline(mesh, th = 0.04) {
  const o = new THREE.Mesh(smoothGeo(mesh.geometry), getOutlineMat(th));
  o.raycast = () => {};
  o.renderOrder = mesh.renderOrder;
  mesh.add(o);
  return mesh;
}

// atalho: malha toon com contorno
export function ink(geo, color, th = 0.04, opts) {
  const m = new THREE.Mesh(geo, toon(color, opts));
  if (th > 0) outline(m, th);
  return m;
}

// Texto em sprite (canvas), usado no POW!, nomes e letras de zona
const texCache = new Map();
export function wordTexture(word, { size = 256, burst = true, fill = '#faf8f2', stroke = '#141210', font = 'Bowlby One' } = {}) {
  const key = word + size + burst + fill + font;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  if (burst) {
    g.beginPath();
    const n = 14;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = (i % 2 ? 0.3 : 0.48) * size * (0.92 + Math.random() * 0.1);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = fill; g.fill();
    g.lineWidth = size * 0.03; g.strokeStyle = stroke; g.stroke();
  }
  let fs = size * 0.36;
  g.font = `${fs}px "${font}"`;
  while (g.measureText(word).width > size * 0.82 && fs > 8) { fs -= 4; g.font = `${fs}px "${font}"`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = fs * 0.22; g.strokeStyle = stroke; g.strokeText(word, cx, cy + fs * 0.05);
  g.fillStyle = burst ? '#141210' : fill; g.fillText(word, cx, cy + fs * 0.05);
  if (burst) { g.lineWidth = fs * 0.06; g.strokeStyle = fill; g.strokeText(word, cx, cy + fs * 0.05); g.fillStyle = '#141210'; g.fillText(word, cx, cy + fs * 0.05); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function hatchTexture(base = '#d9d4c8', line = '#8a847a', { size = 256, density = 18, cross = false, bricks = false, planks = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  g.strokeStyle = line; g.lineCap = 'round';
  if (bricks) {
    g.lineWidth = 3;
    const bh = size / 8;
    for (let y = 0; y < 8; y++) {
      g.beginPath(); g.moveTo(0, y * bh); g.lineTo(size, y * bh + (Math.random() - 0.5) * 3); g.stroke();
      const off = (y % 2) * size / 8;
      for (let x = 0; x < 5; x++) { const xx = off + x * size / 4; g.beginPath(); g.moveTo(xx, y * bh); g.lineTo(xx + 1, y * bh + bh); g.stroke(); }
    }
  } else if (planks) {
    g.lineWidth = 4;
    for (let x = 0; x <= 4; x++) { g.beginPath(); g.moveTo(x * size / 4, 0); g.lineTo(x * size / 4 + 2, size); g.stroke(); }
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y + 18, x + 2, y + 40); g.stroke();
    }
  } else {
    g.lineWidth = 2;
    for (let i = 0; i < density; i++) {
      const x = Math.random() * size, y = Math.random() * size, l = 10 + Math.random() * 18;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * 0.35); g.stroke();
      if (cross) { g.beginPath(); g.moveTo(x + 4, y + l * 0.4); g.lineTo(x + l * 0.6, y - l * 0.2); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Fachada sem rosto: janelas com caixilho e veneziana, porta com toldo, tijolos
export function facadeTexture(seed = 1, { w = 512, h = 512 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dfd3'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,85,78,.35)'; g.lineWidth = 3;
  for (let y = 0; y < h; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineJoin = 'round';
  const cols = 2 + (seed % 2), rows = 2;
  const ww = w / (cols * 2.2), wh = h * 0.17;
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
    const x = w * (i + 0.5) / cols - ww / 2, y = h * (0.14 + r * 0.27);
    if (r === 1 && i === Math.floor(cols / 2) && cols % 2) continue; // espaco da porta
    g.fillStyle = '#3a3632'; g.fillRect(x, y, ww, wh);
    g.lineWidth = 9; g.strokeStyle = '#141210'; g.strokeRect(x, y, ww, wh);
    g.lineWidth = 6; g.strokeStyle = '#faf8f2';
    g.beginPath(); g.moveTo(x + ww / 2, y + 5); g.lineTo(x + ww / 2, y + wh - 5); g.moveTo(x + 5, y + wh / 2); g.lineTo(x + ww - 5, y + wh / 2); g.stroke();
    g.fillStyle = '#6e6a63'; g.fillRect(x - 8, y + wh, ww + 16, 10); // peitoril
  }
  // porta com toldo listrado
  const dw = w * 0.2, dh = h * 0.3, dx = w / 2 - dw / 2, dy = h - dh;
  g.fillStyle = '#3a3632'; g.fillRect(dx, dy, dw, dh);
  g.lineWidth = 9; g.strokeStyle = '#141210'; g.strokeRect(dx, dy, dw, dh + 10);
  g.fillStyle = '#faf8f2'; g.beginPath(); g.arc(dx + dw * 0.8, dy + dh * 0.55, 7, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#faf8f2' : '#6e6a63'; g.fillRect(dx - 20 + i * (dw + 40) / 6, dy - 34, (dw + 40) / 6, 26); }
  g.lineWidth = 6; g.strokeRect(dx - 20, dy - 34, dw + 40, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function tankTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dfd3'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#8f897e'; g.lineWidth = 4;
  for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = '#3a3632';
  for (const y of [60, 452]) { g.fillRect(0, y - 14, 1024, 28); for (let x = 16; x < 1024; x += 32) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = '#faf8f2'; g.fill(); g.fillStyle = '#3a3632'; } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
