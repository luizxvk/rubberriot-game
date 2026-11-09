// Estampas de pintura (09/11, pedido dele): desenhos abstratos e radiais pra Pintura e pro Destaque. A cor escolhida tinge a
// estampa; "Cor sólida" tira o desenho. Roda no shader da arma, presa na peça. Loja = 'stamp:<id>'; Pass = trilha grátis (src/pass.js).
import * as THREE from 'three';
import { offscreen } from './offscreen.js';

// o code e a posicao no stampAt: nao reordenar (loadout salvo guarda o id, o shader usa o code)
export const STAMPS = [
  { id: 'raios', code: 1, pass: 1 }, { id: 'agulhas', code: 2, shop: 1 }, { id: 'catavento', code: 3, pass: 1 }, { id: 'espiral', code: 4, pass: 1 },
  { id: 'alvo', code: 5, pass: 1 }, { id: 'gota', code: 6, shop: 1 }, { id: 'estouro', code: 7, shop: 1 }, { id: 'rosacea', code: 8, shop: 1 },
  { id: 'dardos', code: 9, shop: 1 }, { id: 'redemoinho', code: 10, shop: 1 }, { id: 'carrossel', code: 11, shop: 1 }, { id: 'solpartido', code: 12, shop: 1 },
  { id: 'zigue', code: 13, pass: 1 }, { id: 'divisas', code: 14, pass: 1 }, { id: 'mare', code: 15, pass: 1 }, { id: 'tabuleiro', code: 16, shop: 1 },
  { id: 'losangos', code: 17, pass: 1 }, { id: 'cacos', code: 18, shop: 1 }, { id: 'bolhas', code: 19, pass: 1 }, { id: 'pinceladas', code: 20, shop: 1 },
  { id: 'escamas', code: 21, pass: 1 }, { id: 'labirinto', code: 22, shop: 1 }, { id: 'bandeirolas', code: 23, shop: 1 }, { id: 'xadrez', code: 24, shop: 1 },
];
const CODE = Object.fromEntries(STAMPS.map(s => [s.id, s.code]));
export const stampCode = (id) => CODE[id] || 0;

// d > 0 = tinta. q: x = comprimento da arma, y = altura (mais um tico da largura, pra o topo da arma nao sair liso)
export const STAMP_GLSL = `
float stAA(float d) { float w = max(fwidth(d), 1e-4); return smoothstep(-w, w, d); }
float stH(vec2 c) { return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float stN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(stH(i), stH(i + vec2(1.0, 0.0)), f.x), mix(stH(i + vec2(0.0, 1.0)), stH(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 stVor(vec2 p) { vec2 c = floor(p); float a = 9.0, b = 9.0, id = 0.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = c + vec2(float(x), float(y)), o = vec2(stH(g), stH(g + 17.3)); float d = length(g + o - p); if (d < a) { b = a; a = d; id = stH(g + 3.1); } else if (d < b) b = d; } return vec3(a, b, id); }
float stampAt(int k, vec2 q) {
  float r = length(q), a = atan(q.y, q.x);
  if (k == 1) return stAA(sin(a * 12.0));
  if (k == 2) return stAA(sin(a * 26.0) - 0.3);
  if (k == 3) return stAA(sin(a * 6.0 + r * 5.0));
  if (k == 4) return stAA(sin(a * 2.0 + r * 14.0));
  if (k == 5) return stAA(sin(r * 15.0));
  if (k == 6) return stAA(sin(r * 20.0 + sin(a * 6.0) * 1.4));
  if (k == 7) return stAA(sin(r * (1.0 + 0.4 * abs(sin(a * 7.0))) * 14.0));
  if (k == 8) return stAA(sin(a * 8.0) * sin(r * 12.0));
  if (k == 9) return stAA(sin(a * 10.0) * sin(r * 11.0 + 0.8));
  if (k == 10) return stAA(sin(a * 5.0 - 2.2 / (r + 0.3)));
  if (k == 11) return stAA(sin(r * 10.0 + abs(sin(a * 9.0)) * 2.4));
  if (k == 12) return r < 0.62 ? stAA(sin(r * 30.0)) : stAA(sin(a * 18.0) - 0.1);
  if (k == 13) return stAA(sin((q.y + abs(fract(q.x * 1.4) - 0.5) * 1.1) * 11.0));
  if (k == 14) return stAA(sin((q.y + abs(q.x) * 0.9) * 10.0));
  if (k == 15) return stAA(sin((q.y + sin(q.x * 3.1) * 0.24 + sin(q.x * 7.0) * 0.05) * 12.0));
  if (k == 16) { vec2 u = q + 0.16 * sin(q.yx * 4.0); return stAA(sin(u.x * 8.0) * sin(u.y * 8.0)); }
  if (k == 17) return stAA(0.3 - abs(fract(q.x * 1.8) - 0.5) - abs(fract(q.y * 3.6) - 0.5) * 0.5);
  if (k == 18) { vec3 v = stVor(q * 3.2); float m = v.z > 0.5 ? 1.0 : 0.0; return mix(1.0, m, stAA(v.y - v.x - 0.05)); }
  if (k == 19) { vec3 v = stVor(q * 3.0); return stAA(0.2 + v.z * 0.28 - v.x); }
  if (k == 20) { float n = stN(vec2(q.x * 1.2, q.y * 6.0)); return stAA(sin(q.y * 10.0 + n * 6.0) - (stN(vec2(q.x * 5.0, floor(q.y * 5.0))) - 0.5) * 1.4); }
  if (k == 21) { float row = floor(q.y * 5.0); vec2 p = vec2(fract(q.x * 4.0 + 0.5 * mod(row, 2.0)) - 0.5, fract(q.y * 5.0)); return stAA(sin(length(p * vec2(1.0, 0.8)) * 17.0)); }
  if (k == 22) { vec2 c = floor(q * 5.0), f = fract(q * 5.0); if (stH(c) > 0.5) f.x = 1.0 - f.x; return stAA(0.16 - min(abs(length(f) - 0.5), abs(length(f - 1.0) - 0.5))); }
  if (k == 23) { vec2 c = floor(q * 4.0), f = fract(q * 4.0); if (stH(c + 5.0) < 0.3) return 0.0; return stAA(stH(c) < 0.5 ? f.x - f.y : f.x + f.y - 1.0); }
  if (k == 24) { float h = stAA(sin(q.x * 8.0) - 0.2), v = stAA(sin(q.y * 8.0) - 0.2); return max(h, v) * 0.55 + h * v * 0.45; }
  return 0.0;
}
vec3 stampInk(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)) > 0.42 ? c * 0.32 : mix(c, vec3(0.93, 0.91, 0.86), 0.62); }
`;

// miniatura do botao: o mesmo desenho do shader, uma foto por estampa
const THUMB = new Map();
let quad = null;
export function stampThumb(id) {
  if (THUMB.has(id)) return THUMB.get(id);
  const R = offscreen();
  quad ||= (() => {
    const m = new THREE.ShaderMaterial({ uniforms: { uK: { value: 0 } }, vertexShader: 'varying vec2 vQ; void main() { vQ = uv * 2.0 - 1.0; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: `uniform float uK; varying vec2 vQ; ${STAMP_GLSL} void main() { gl_FragColor = vec4(mix(vec3(0.925, 0.914, 0.882), vec3(0.165, 0.153, 0.141), stampAt(int(uK + 0.5), vQ * 1.15)), 1.0); }`, toneMapped: false });
    const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { s, m, cam };
  })();
  R.setRenderTarget(null); R.setSize(88, 88, false);
  quad.m.uniforms.uK.value = stampCode(id);
  quad.s.children[0].frustumCulled = false;
  R.render(quad.s, quad.cam);
  const url = R.domElement.toDataURL('image/png');
  THUMB.set(id, url);
  return url;
}
