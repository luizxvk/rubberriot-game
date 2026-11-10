// Skins novas do boneco (09/11, pedido dele): espaciais, caveiras, abstratas, digitais, animadas e as 5 exclusivas da Rankeada.
// SKIN_GLSL2 entra no mesmo skinColor de looks3d.js; buildSkinFx poe pecas 3D de verdade em volta do boneco (uma malha com copias por boneco).
import * as THREE from 'three';

export const SKIN_CODE2 = { nebulosa: 13, buraconegro: 14, lunar: 15, ossario: 16, caveiraneon: 17, opart: 18, vitral: 19, chuvadados: 20, circuito: 21, glitch: 22, lavalamp: 23, vinil: 24, rk_ferrugem: 25, rk_prata: 26, rk_folha: 27, rk_cristal: 28, rk_real: 29 };

// fora do skinColor: desenho da caveira. Devolve a distancia; eye = distancia ate o olho
export const SKIN_GLSL_HELP = /* glsl */`
float skSkull(vec2 f, out float eye) {
  float hd = max(length(f * vec2(1.0, 1.1) - vec2(0.0, 0.06)) - 0.3, -(f.y + 0.32));
  float jaw = max(abs(f.x) - 0.14, abs(f.y + 0.24) - 0.08), head = min(hd, jaw);
  eye = length(vec2(abs(f.x) - 0.12, f.y - 0.06)) - 0.075;
  float nose = max(abs(f.x) - 0.03, abs(f.y + 0.06) - 0.05);
  return max(head, -min(eye, nose));
}
`;

export const SKIN_GLSL2 = /* glsl */`
  if (k == 13) { // nebulosa: gas colorido girando devagar e estrelas piscando
    float f = c_fbm(p * 1.1 + vec3(t * 0.04, -t * 0.03, 0.0)), g = c_fbm(p * 2.3 + f * 2.0 + vec3(0.0, t * 0.05, 0.0));
    vec3 c = mix(vec3(0.04, 0.03, 0.12), mix(vec3(0.55, 0.12, 0.7), vec3(0.1, 0.5, 0.85), g), smoothstep(0.3, 0.75, f));
    vec3 cell = floor(p * 26.0); float s = step(0.985, c_h(cell)) * (0.6 + 0.4 * sin(t * 4.0 + c_h(cell + 3.0) * 30.0));
    glow = c * 0.35 * smoothstep(0.45, 0.8, g) + vec3(s) * 1.4 + vec3(0.5, 0.3, 1.0) * fr * 0.6;
    return c + vec3(s);
  }
  if (k == 14) { // buraco negro: bracos de fogo sendo engolidos pelo centro
    float r = length(p.xy), a = atan(p.y, p.x);
    float sp = smoothstep(0.55, 1.0, sin(a * 3.0 + log(r + 0.15) * 7.0 - t * 2.0) * 0.5 + 0.5) * smoothstep(1.7, 0.35, r) * smoothstep(0.12, 0.32, r);
    vec3 h = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.9, 0.6), sp);
    glow = h * sp * 1.3 + vec3(0.7, 0.35, 1.0) * fr * 0.5;
    return vec3(0.015, 0.01, 0.03) + h * sp * 0.6;
  }
  if (k == 15) { // superficie da lua: crateras e o reflexo azul da Terra na borda
    vec2 v = c_vor(p * 1.8);
    float rim = smoothstep(0.26, 0.31, v.x) * smoothstep(0.4, 0.31, v.x), pit = smoothstep(0.26, 0.12, v.x);
    glow = vec3(0.25, 0.45, 0.9) * fr * 0.45;
    return vec3(0.62, 0.62, 0.6) * (0.8 + 0.35 * c_fbm(p * 6.0)) - pit * 0.22 + rim * 0.2;
  }
  if (k == 16) { // ossario: caveiras em fileira balancando, olhos verdes
    vec2 q = vec2(p.x * 3.0, p.y * 3.4); q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 id = floor(q), f = fract(q) - 0.5; f.y += sin(t * 1.5 + id.x) * 0.03;
    float ey, d = skSkull(f, ey), e = smoothstep(0.015, -0.015, ey) * step(length(f), 0.36), pl = 0.5 + 0.5 * sin(t * 3.0 + c_h(vec3(id, 1.0)) * 20.0);
    glow = vec3(0.3, 1.0, 0.4) * e * (0.4 + pl) + vec3(0.4, 0.9, 0.5) * fr * 0.25;
    return mix(vec3(0.07, 0.06, 0.09), vec3(0.9, 0.86, 0.74), smoothstep(0.015, -0.015, d)) + vec3(0.1, 0.6, 0.2) * e;
  }
  if (k == 17) { // caveira neon: so o traco aceso, trocando de cor em onda
    vec2 q = vec2(p.x * 2.4, p.y * 2.7 - t * 0.12); q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 id = floor(q), f = fract(q) - 0.5;
    float ey, d = skSkull(f, ey), line = smoothstep(0.035, 0.0, abs(d)) + smoothstep(0.03, 0.0, abs(ey)) * step(length(f), 0.36);
    vec3 c = c_hue(fract(id.y * 0.17 + id.x * 0.09 + t * 0.12));
    glow = c * line * 1.5 + c * fr * 0.3;
    return vec3(0.03, 0.02, 0.05) + c * line * 0.5;
  }
  if (k == 18) { // op art: aneis pretos e brancos que parecem pulsar pra fora da roupa
    float r = length(p.xy + vec2(sin(t * 0.4), cos(t * 0.3)) * 0.4);
    float m = smoothstep(-0.12, 0.12, sin(r * 22.0 - t * 2.0 + sin(p.x * 4.0 + p.y * 3.0) * 2.0));
    glow = vec3(0.9) * fr * 0.2;
    return mix(vec3(0.05), vec3(0.96), m);
  }
  if (k == 19) { // vitral: cacos coloridos, chumbo escuro entre eles e luz passando
    vec2 v = c_vor(p * 2.4), w = c_vor(p * 2.4 + vec3(0.05, 0.04, 0.03));
    float lead = step(0.001, abs(v.y - w.y));
    vec3 c = c_hue(v.y);
    float sun = 0.55 + 0.45 * sin(t * 1.2 + p.y * 2.0 + v.y * 6.0);
    glow = c * sun * 0.55 * (1.0 - lead);
    return mix(c * (0.5 + sun * 0.4), vec3(0.04), lead);
  }
  if (k == 20) { // chuva de dados: colunas de sinais verdes descendo
    vec2 q = vec2((p.x + p.z) * 8.0, p.y * 8.0); float cx = floor(q.x), cy = floor(q.y), hh = c_h(vec3(cx, 2.0, 5.0));
    float u = fract(cy / 16.0 + t * (0.25 + hh * 0.5) + hh), g = step(0.35, c_h(vec3(cx, cy, floor(t * 6.0 + hh * 9.0))));
    vec2 f2 = abs(fract(q) - 0.5); float cell = step(max(f2.x, f2.y), 0.38), tr = pow(u, 5.0);
    glow = vec3(0.25, 1.0, 0.5) * tr * g * cell * 1.4 + vec3(0.7, 1.0, 0.8) * step(0.985, u) * cell * 2.0;
    return vec3(0.01, 0.06, 0.03) + vec3(0.25, 1.0, 0.5) * tr * g * cell * 0.5;
  }
  if (k == 21) { // placa de circuito: trilhas douradas com pulsos correndo
    vec2 q = p.xy * 5.0, f = abs(fract(q) - 0.5), id = floor(q);
    float tr = smoothstep(0.06, 0.03, min(f.x, f.y)) * step(0.35, c_h(vec3(id, 0.0))), via = smoothstep(0.16, 0.12, length(f - 0.5)) * step(0.7, c_h(vec3(id, 3.0)));
    float pulse = smoothstep(0.9, 1.0, fract(dot(id, vec2(0.13, 0.21)) - t * 0.6));
    glow = vec3(0.3, 1.0, 0.8) * tr * pulse * 1.6;
    return mix(vec3(0.03, 0.2, 0.14), vec3(0.85, 0.65, 0.25), max(tr, via));
  }
  if (k == 22) { // glitch: faixas que saltam pro lado com as cores separadas
    float b = floor(p.y * 14.0), bt = floor(t * 9.0), sh = step(0.75, c_h(vec3(b, bt, 1.0))) * (c_h(vec3(b, bt, 2.0)) - 0.5) * 1.4;
    vec3 q = p + vec3(sh, 0.0, 0.0), z = vec3(0.0, 0.0, t * 0.4);
    vec3 c = vec3(c_n(q * 4.0 + vec3(0.12, 0.0, 0.0) + z), c_n(q * 4.0 + z), c_n(q * 4.0 - vec3(0.12, 0.0, 0.0) + z));
    c = smoothstep(0.35, 0.7, c);
    glow = c * 0.35 * step(0.001, abs(sh));
    return c;
  }
  if (k == 23) { // lava lamp: bolhas subindo devagar
    float f = c_n(vec3(p.x * 1.6, p.y * 1.1 - t * 0.25, p.z * 1.6) + c_n(p * 0.8 + t * 0.06)), m = smoothstep(0.48, 0.54, f);
    vec3 c = mix(vec3(0.22, 0.06, 0.4), mix(vec3(1.0, 0.35, 0.15), vec3(1.0, 0.7, 0.3), smoothstep(0.54, 0.75, f)), m);
    glow = c * m * 0.45 + vec3(0.8, 0.3, 0.9) * fr * 0.35;
    return c;
  }
  if (k == 24) { // vinil: sulcos pretos, brilho girando e o selo vermelho no meio
    float r = length(p.xy), a = atan(p.y, p.x), sp = pow(0.5 + 0.5 * cos(a * 2.0 - t * 2.0), 8.0);
    if (r < 0.42) { glow = vec3(0.3, 0.05, 0.05) * sp; return r < 0.06 ? vec3(0.02) : mix(vec3(0.75, 0.12, 0.14), vec3(0.95, 0.8, 0.4), smoothstep(0.3, 0.4, r)); }
    glow = vec3(0.5, 0.55, 0.7) * sp * 0.25;
    return vec3(0.04) + vec3(0.05) * (0.5 + 0.5 * sin(r * 90.0)) + vec3(0.55) * sp;
  }
  if (k == 25) { // Rankeada, Bronze: ferro enferrujando
    float f = c_fbm(p * 2.2), g = c_fbm(p * 7.0 + t * 0.02);
    vec3 c = mix(vec3(0.3, 0.16, 0.09), vec3(0.72, 0.36, 0.14), smoothstep(0.3, 0.7, f));
    return mix(c, vec3(0.2, 0.42, 0.36), smoothstep(0.62, 0.72, g) * 0.8);
  }
  if (k == 26) { // Rankeada, Prata: metal liquido
    vec3 cc = 0.5 + 0.5 * sin(vec3(n.x * 4.0 + t, n.y * 4.0 - t * 0.7, c_fbm(p * 2.0 + t * 0.2) * 6.0));
    glow = vec3(0.8, 0.85, 0.95) * fr * 0.4;
    return mix(vec3(0.45, 0.48, 0.53), vec3(0.98), dot(cc, vec3(0.33)));
  }
  if (k == 27) { // Rankeada, Ouro: folha de ouro, cada pedaco brilha na sua hora
    vec2 v = c_vor(p * 6.0); float s = pow(0.5 + 0.5 * sin(v.y * 40.0 + t * 1.5 + n.x * 6.0), 4.0);
    glow = vec3(1.0, 0.75, 0.25) * s * 0.3 + vec3(1.0, 0.8, 0.3) * fr * 0.3;
    return mix(vec3(0.62, 0.42, 0.08), vec3(1.0, 0.82, 0.3), 0.3 + 0.7 * s);
  }
  if (k == 28) { // Rankeada, Diamante: cristal lapidado
    vec2 v = c_vor(p * 3.0); float ir = 0.5 + 0.5 * sin(v.y * 30.0 + n.x * 4.0 + n.y * 3.0 + t * 1.2);
    glow = vec3(0.5, 0.95, 1.0) * pow(ir, 6.0) * 0.9 + vec3(0.6, 0.9, 1.0) * fr * 0.6;
    return mix(vec3(0.1, 0.45, 0.62), vec3(0.92, 0.99, 1.0), ir);
  }
  if (k == 29) { // Rankeada, Mestre: manto roxo com filigrana de ouro acesa
    float a = sin(p.x * 7.0 + sin(p.y * 5.0) * 1.4) * sin(p.y * 7.0 + sin(p.x * 4.0) * 1.4), fil = smoothstep(0.12, 0.0, abs(a));
    glow = vec3(1.0, 0.78, 0.25) * fil * (0.4 + 0.4 * sin(t * 2.0 + p.y * 3.0)) + vec3(0.7, 0.35, 1.0) * fr * 0.6;
    return mix(vec3(0.17, 0.06, 0.3), vec3(1.0, 0.8, 0.3), fil);
  }
`;

// pecas 3D em volta do boneco. geo = forma; n = quantas; r = raio; y = faixa de altura; s = tamanho; mode: orbit gira em volta, rise sobe, fall desce
const FX = {
  nebulosa: { geo: 'planet', n: 3, r: 0.72, y: [0.9, 1.7], s: 0.11, col: 0xc98bff, mode: 'orbit', sp: 0.9 },
  buraconegro: { geo: 'ring', n: 1, r: 0, y: [1.05, 1.05], s: 0.72, col: 0xffa040, mode: 'spin', sp: 2.2 },
  lunar: { geo: 'rock', n: 5, r: 0.68, y: [0.5, 1.7], s: 0.09, col: 0xa9a9a2, mode: 'orbit', sp: 0.7 },
  ossario: { geo: 'skull', n: 3, r: 0.7, y: [1.1, 1.7], s: 0.15, col: 0xe8e0c8, mode: 'orbit', sp: 0.8 },
  caveiraneon: { geo: 'skull', n: 4, r: 0.72, y: [0.7, 1.8], s: 0.13, col: 0x56ffd0, mode: 'orbit', sp: -1.1 },
  opart: { geo: 'ring', n: 3, r: 0, y: [0.5, 1.7], s: 0.55, col: 0xf4f4f4, mode: 'stack', sp: 1.4 },
  vitral: { geo: 'shard', n: 6, r: 0.7, y: [0.4, 1.8], s: 0.13, col: 0x6fb7ff, mode: 'orbit', sp: 0.6, rainbow: true },
  chuvadados: { geo: 'cube', n: 10, r: 0.58, y: [0.1, 2.0], s: 0.05, col: 0x47ff86, mode: 'fall', sp: 0.9 },
  circuito: { geo: 'ring', n: 2, r: 0, y: [0.7, 1.45], s: 0.66, col: 0x62ffd0, mode: 'stack', sp: -1.0 },
  glitch: { geo: 'cube', n: 8, r: 0.62, y: [0.2, 1.9], s: 0.08, col: 0xff4fa0, mode: 'jump', sp: 7, rainbow: true },
  lavalamp: { geo: 'blob', n: 6, r: 0.6, y: [0.1, 2.0], s: 0.11, col: 0xff7a35, mode: 'rise', sp: 0.32 },
  vinil: { geo: 'disc', n: 2, r: 0.74, y: [1.0, 1.5], s: 0.24, col: 0x1b1b20, mode: 'orbit', sp: 1.2 },
  rk_prata: { geo: 'blob', n: 4, r: 0.66, y: [0.5, 1.7], s: 0.07, col: 0xdfe4ea, mode: 'orbit', sp: 1.0 },
  rk_folha: { geo: 'shard', n: 7, r: 0.66, y: [0.2, 1.9], s: 0.07, col: 0xffcf58, mode: 'rise', sp: 0.3 },
  rk_cristal: { geo: 'crystal', n: 4, r: 0.74, y: [0.8, 1.7], s: 0.14, col: 0xa6efff, mode: 'orbit', sp: 0.8 },
  rk_real: { geo: 'crown', n: 1, r: 0, y: [2.02, 2.02], s: 0.34, col: 0xffcf4a, mode: 'spin', sp: 0.6 },
};
const GEO = {};
function skullGeo() { // cranio + maxilar: duas formas numa malha so
  const a = new THREE.SphereGeometry(1, 10, 8), b = new THREE.BoxGeometry(0.9, 0.6, 0.8).translate(0, -0.95, 0.15), pa = a.attributes, pb = b.attributes, ia = a.index, ib = b.index;
  const pos = new Float32Array(pa.position.count * 3 + pb.position.count * 3), nor = new Float32Array(pos.length), idx = [];
  pos.set(pa.position.array); pos.set(pb.position.array, pa.position.count * 3); nor.set(pa.normal.array); nor.set(pb.normal.array, pa.normal.count * 3);
  idx.push(...ia.array, ...Array.from(ib.array, v => v + pa.position.count));
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx); a.dispose(); b.dispose(); return g;
}
function geoOf(k) {
  return GEO[k] ||= ({
    planet: () => new THREE.SphereGeometry(1, 12, 10), blob: () => new THREE.IcosahedronGeometry(1, 1), rock: () => new THREE.DodecahedronGeometry(1, 0),
    skull: skullGeo, ring: () => new THREE.TorusGeometry(1, 0.05, 6, 28).rotateX(Math.PI / 2), shard: () => new THREE.TetrahedronGeometry(1, 0), cube: () => new THREE.BoxGeometry(1, 1, 1),
    disc: () => new THREE.CylinderGeometry(1, 1, 0.08, 18), crystal: () => new THREE.OctahedronGeometry(1, 0).scale(0.6, 1.2, 0.6), crown: () => new THREE.TorusGeometry(1, 0.18, 4, 7).rotateX(Math.PI / 2),
  })[k]();
}
const MATS = new Map();
function matOf(hex, rainbow) { const k = hex + (rainbow ? 'r' : ''); if (!MATS.has(k)) MATS.set(k, new THREE.MeshBasicMaterial({ color: rainbow ? 0xffffff : hex })); return MATS.get(k); }
const D = new THREE.Object3D(), C = new THREE.Color();
export function buildSkinFx(id) {
  const F = FX[id]; if (!F) return null;
  const inst = new THREE.InstancedMesh(geoOf(F.geo), matOf(F.col, F.rainbow), F.n), group = new THREE.Group(); group.add(inst); inst.frustumCulled = false;
  if (F.rainbow) for (let i = 0; i < F.n; i++) inst.setColorAt(i, C.setHSL(i / F.n, 0.9, 0.6));
  const span = F.y[1] - F.y[0], seed = (i, k) => (Math.sin(i * 12.9 + k * 78.2) * 43758.5) % 1;
  const tick = (dt, t) => {
    for (let i = 0; i < F.n; i++) {
      const a = (i / F.n) * Math.PI * 2, u = Math.abs(seed(i, 1)); let x = 0, y = F.y[0] + (F.n > 1 ? span * i / (F.n - 1) : 0), z = 0, sc = F.s, rot = t * F.sp;
      if (F.mode === 'orbit') { const w = a + t * F.sp; x = Math.cos(w) * F.r; z = Math.sin(w) * F.r; y += Math.sin(t * 1.3 + i) * 0.05; }
      else if (F.mode === 'rise' || F.mode === 'fall') { const k = (t * F.sp + u) % 1, h = F.mode === 'rise' ? k : 1 - k; y = F.y[0] + span * h; const w = a + t * 0.5; x = Math.cos(w) * F.r; z = Math.sin(w) * F.r; sc = F.s * Math.sin(k * Math.PI); }
      else if (F.mode === 'jump') { const b = Math.floor(t * F.sp + u * 9), g = Math.abs(seed(i, b)), w = g * 6.283; x = Math.cos(w) * F.r; z = Math.sin(w) * F.r; y = F.y[0] + span * Math.abs(seed(i, b + 5)); sc = F.s * (0.6 + g); }
      else if (F.mode === 'stack') { sc = F.s * (1 + Math.sin(t * 2 + i * 1.7) * 0.12); rot = t * F.sp * (i % 2 ? -1 : 1); }
      D.position.set(x, y, z); D.rotation.set(F.mode === 'stack' ? Math.sin(t + i) * 0.28 : rot * 0.6, rot, 0); D.scale.setScalar(Math.max(0.001, sc)); D.updateMatrix(); inst.setMatrixAt(i, D.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  };
  tick(0, 0);
  return { group, tick, dispose: () => inst.dispose() };
}
