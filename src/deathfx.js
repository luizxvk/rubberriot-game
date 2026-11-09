// Efeitos 3D das mortes lendarias (08/11, pedido dele): shader simples, sem textura e sem luz, junto com a animacao
// do boneco (character.js deathAnim). Cada efeito e uma malha leve com material proprio (clone do mesmo shader =
// mesmo programa: compila UMA vez, no warmDeathFx da carga do mapa, e nunca trava o quadro na primeira morte).
//   ring(): onda de choque no chao (anel que abre e some, com hachura de tinta no estilo do jogo)
//   column(): coluna de luz/nevoa subindo (aberta em cima e embaixo, listras correndo pra cima)
//   burst(): estouro no ar (esfera de traços que abre e some)
// Todos tem userData.t (0..1) que o deathAnim avanca; set(k) aplica.
import * as THREE from 'three';

const VERT = /* glsl */`
varying vec2 vUv; varying vec3 vP;
void main() { vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const RING_FRAG = /* glsl */`
uniform float uT; uniform vec3 uCol; uniform float uA;
varying vec3 vP;
void main() {
  float r = length(vP.xy);                       // 0..1 (anel de raio 1, escala faz o tamanho)
  float front = uT;                              // frente da onda
  float band = smoothstep(front - 0.28, front, r) * (1.0 - smoothstep(front, front + 0.04, r));
  float hatch = step(0.5, fract((vP.x + vP.y) * 9.0)); // hachura diagonal (tinta)
  float a = band * (0.55 + 0.45 * hatch) * (1.0 - uT) * uA;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uCol, a);
}`;

const COL_FRAG = /* glsl */`
uniform float uT; uniform vec3 uCol; uniform float uA;
varying vec2 vUv;
void main() {
  float up = vUv.y;
  float stripes = 0.55 + 0.45 * step(0.45, fract(up * 7.0 - uT * 6.0 + vUv.x * 2.0));
  float a = (1.0 - up) * (1.0 - up) * stripes * uA * sin(clamp(uT, 0.0, 1.0) * 3.14159);
  if (a < 0.02) discard;
  gl_FragColor = vec4(uCol, a);
}`;

const BURST_FRAG = /* glsl */`
uniform float uT; uniform vec3 uCol; uniform float uA;
varying vec2 vUv;
void main() {
  float rays = step(0.62, fract(vUv.x * 14.0));            // gomos de traço
  float edge = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
  float a = rays * edge * (1.0 - uT) * uA;
  if (a < 0.02) discard;
  gl_FragColor = vec4(uCol, a);
}`;

const mk = (frag) => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(0xffffff) }, uA: { value: 1 } },
  vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const BASE = { ring: mk(RING_FRAG), column: mk(COL_FRAG), burst: mk(BURST_FRAG) };
const GEO = {
  ring: new THREE.CircleGeometry(1, 48),
  column: new THREE.CylinderGeometry(0.55, 0.8, 1, 24, 1, true).translate(0, 0.5, 0),
  burst: new THREE.SphereGeometry(1, 20, 10),
};

function fxMesh(kind, color, alpha = 1) {
  const mat = BASE[kind].clone(); // mesmo shader = mesmo programa (sem compilar de novo)
  mat.uniforms.uCol.value = new THREE.Color(color); mat.uniforms.uA.value = alpha;
  const m = new THREE.Mesh(GEO[kind], mat);
  m.renderOrder = 4; m.frustumCulled = false;
  m.userData.fxKind = kind;
  m.userData.set = (k) => { mat.uniforms.uT.value = Math.max(0, Math.min(1, k)); m.visible = k > 0 && k < 1; };
  m.userData.dispose = () => mat.dispose();
  m.visible = false;
  return m;
}
export const ring = (color, size = 1.6, alpha = 0.9) => { const m = fxMesh('ring', color, alpha); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.scale.setScalar(size); return m; };
export const column = (color, h = 3.2, alpha = 0.7) => { const m = fxMesh('column', color, alpha); m.scale.set(1, h, 1); return m; };
export const burst = (color, size = 1.2, alpha = 0.9) => { const m = fxMesh('burst', color, alpha); m.scale.setScalar(size); m.userData.size = size; const set = m.userData.set; m.userData.set = (k) => { set(k); m.scale.setScalar(m.userData.size * (0.35 + 0.65 * Math.sqrt(Math.max(0, k)))); }; return m; };
// avanca um efeito: comeca em `at` s, dura `dur` s
export function play(m, T, at, dur) { m.userData.set((T - at) / dur); }
export function disposeFx(root) { root?.traverse(o => o.userData?.dispose?.()); }

// compila os 3 shaders junto com o mapa (chamado do main.js na carga)
export function warmDeathFx(renderer, camera) {
  const sc = new THREE.Scene();
  for (const k of Object.keys(BASE)) { const m = new THREE.Mesh(GEO[k], BASE[k]); m.frustumCulled = false; sc.add(m); }
  try { renderer.compile(sc, camera); } catch { /* sem problema: compila na primeira morte */ }
}
