// Carro da Captura de Bandeira (04/11): visual. Modelo do Tripo (calhambeque conversivel, veio SEM rodas de
// proposito): a lataria clara vira a cor do time no shader; as 4 rodas sao nossas (pneu + calota), giram com a
// velocidade e as da frente esterçam. Quem dirige ve o carro pela fisica local (sem atraso); o resto, suavizado.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ink, geo, toon, outline, PAL } from './toon.js';
import { seatPos } from '../shared/cars.js';

const LEN = 3.9, WHEEL_R = 0.4; // comprimento do carro (m) e raio da roda
let MODEL = null;
const loading = new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/carro_dirigivel.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  let g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); if (g0.index) g0 = g0.toNonIndexed(); g0.computeBoundingBox(); // sem indice: as rodas saem por triangulo
  let b = g0.boundingBox; if (b.max.x - b.min.x > b.max.z - b.min.z) g0.rotateY(Math.PI / 2);
  g0.computeBoundingBox(); b = g0.boundingBox;
  const k = LEN / (b.max.z - b.min.z); g0.scale(k, k, k); g0.computeBoundingBox(); b = g0.boundingBox;
  g0.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); g0.computeBoundingBox(); b = g0.boundingBox;
  // frente = lado do volante (os pontos mais altos ficam la): vai pro -Z
  const P = g0.attributes.position, H = b.max.y - b.min.y; let zs = 0, n = 0;
  for (let i = 0; i < P.count; i++) if (P.getY(i) > b.min.y + H * 0.82) { zs += P.getZ(i); n++; }
  if (n && zs / n < 0) g0.rotateY(Math.PI); // 04/11: estava ao contrario (andava de re); o capo vai pro -Z
  g0.computeVertexNormals(); g0.computeBoundingBox();
  // rodas do proprio modelo (04/11, pedido dele): em cada canto, os triangulos baixos e de fora formam a roda; viram
  // malhas separadas centradas no eixo (giram e as da frente esterçam). O resto e a carroceria
  const bb2 = g0.boundingBox, W2 = bb2.max.x - bb2.min.x, L2 = bb2.max.z - bb2.min.z, H2 = bb2.max.y - bb2.min.y, Q = g0.attributes.position, nT = Q.count / 3;
  const cen = (t) => [(Q.getX(t * 3) + Q.getX(t * 3 + 1) + Q.getX(t * 3 + 2)) / 3, (Q.getY(t * 3) + Q.getY(t * 3 + 1) + Q.getY(t * 3 + 2)) / 3, (Q.getZ(t * 3) + Q.getZ(t * 3 + 1) + Q.getZ(t * 3 + 2)) / 3];
  // 04/11 (2a versao): cada roda e um conjunto de PECAS inteiras do modelo (pneu, calota, raios), achadas por ilha
  // (triangulos ligados por vertice). Antes pegava por raio e sobrava pedaco do pneu na carroceria
  const key = (v) => Math.round(Q.getX(v) * 1e4) + ',' + Math.round(Q.getY(v) * 1e4) + ',' + Math.round(Q.getZ(v) * 1e4);
  const par = new Int32Array(nT).map((_, i) => i), fnd = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; }, seenV = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) { const kk = key(t * 3 + k); if (seenV.has(kk)) { const a = fnd(seenV.get(kk)), c = fnd(t); if (a !== c) par[a] = c; } else seenV.set(kk, t); }
  const isl = new Map(); for (let t = 0; t < nT; t++) { const r = fnd(t); let o = isl.get(r); if (!o) isl.set(r, o = { tris: [], box: new THREE.Box3() }); o.tris.push(t); for (let k = 0; k < 3; k++) o.box.expandByPoint(new THREE.Vector3(Q.getX(t * 3 + k), Q.getY(t * 3 + k), Q.getZ(t * 3 + k))); }
  const wheels = [], taken = new Set();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const mine = [], wb = new THREE.Box3();
    for (const o of isl.values()) {
      const c = o.box.getCenter(new THREE.Vector3()), sz3 = o.box.getSize(new THREE.Vector3());
      if (c.y > bb2.min.y + H2 * 0.45 || c.x * sx < W2 * 0.2 || c.z * sz < L2 * 0.1) continue; // canto de baixo, de fora
      if (sz3.y > H2 * 0.6 || sz3.z > L2 * 0.4) continue; // peca grande demais (para-lama, chassi)
      mine.push(o); wb.union(o.box);
    }
    if (!mine.length) continue;
    const tris = mine.flatMap(o => o.tris); tris.forEach(t => taken.add(t));
    const c = wb.getCenter(new THREE.Vector3());
    wheels.push({ tris, c: [c.x, c.y, c.z], front: sz < 0 });
  }
  const pick = (tris, c) => { const a = new Float32Array(tris.length * 9), uv = Q.parent ? null : g0.attributes.uv, u = new Float32Array(tris.length * 6); let i = 0, j = 0; for (const t of tris) for (let k = 0; k < 3; k++) { const v = t * 3 + k; a[i++] = Q.getX(v) - c[0]; a[i++] = Q.getY(v) - c[1]; a[i++] = Q.getZ(v) - c[2]; if (g0.attributes.uv) { u[j++] = g0.attributes.uv.getX(v); u[j++] = g0.attributes.uv.getY(v); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); if (g0.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(u, 2)); g.computeVertexNormals(); return g; };
  let body = g0;
  if (wheels.length === 4) { const rest = []; for (let t = 0; t < nT; t++) if (!taken.has(t)) rest.push(t); body = pick(rest, [0, 0, 0]); }
  const wgeos = wheels.length === 4 ? wheels.map(w => ({ geo: pick(w.tris, w.c), c: w.c, front: w.front })) : null;
  const map = mesh.material?.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
  MODEL = { geo: body, wheels: wgeos, map, w: g0.boundingBox.max.x - g0.boundingBox.min.x };
}).catch(e => console.warn('carro_dirigivel.glb nao carregou (fica o de caixas)', e));

const MATS = new Map();
function teamMat(team) {
  if (MATS.has(team)) return MATS.get(team);
  const c = new THREE.Color(team === 'blue' ? PAL.blue : PAL.red), m = toon(0xffffff, { map: MODEL?.map || null, unique: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTeam = { value: c };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTeam;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 k = diffuseColor.rgb; float lum = dot(k, vec3(0.3, 0.59, 0.11));
          float warm = smoothstep(0.03, 0.09, k.r - k.b) * smoothstep(0.05, 0.14, lum); /* lataria salmao e para-lama marrom (pneu/cromo cinza ficam) */
          diffuseColor.rgb = mix(k, uTeam * (0.55 + lum * 1.1), warm); }`);
  };
  m.customProgramCacheKey = () => 'carTeam';
  MATS.set(team, m);
  return m;
}

function buildCar(team) {
  const g = new THREE.Group(), wheels = [], sus = new THREE.Group(); g.add(sus); // sus: carroceria na suspensao
  if (MODEL) { const body = new THREE.Mesh(MODEL.geo, teamMat(team)); outline(body, 0.03); sus.add(body); }
  else { // ate o modelo chegar
    const body = ink(geo(THREE.BoxGeometry, 1.8, 0.7, LEN), team === 'blue' ? PAL.blue : PAL.red, 0.04); body.position.y = 0.75; g.add(body);
  }
  if (MODEL?.wheels) { for (const w of MODEL.wheels) { const holder = new THREE.Group(); holder.position.set(...w.c); g.add(holder); const spin = new THREE.Group(); holder.add(spin); const m = new THREE.Mesh(w.geo, teamMat(team)); outline(m, 0.03); spin.add(m); wheels.push({ holder, spin, front: w.front, r: w.c[1] }); } g.userData.wheels = wheels; g.userData.model = true; g.userData.sus = sus; return g; }
  const half = (MODEL ? MODEL.w : 1.8) / 2 - 0.16;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const holder = new THREE.Group(); holder.position.set(sx * half, WHEEL_R, sz * LEN * 0.31); g.add(holder);
    const spin = new THREE.Group(); holder.add(spin);
    const tire = ink(geo(THREE.CylinderGeometry, WHEEL_R, WHEEL_R, 0.3, 16), PAL.ink, 0.02); tire.rotation.z = Math.PI / 2; spin.add(tire);
    const cap = ink(geo(THREE.CylinderGeometry, WHEEL_R * 0.55, WHEEL_R * 0.55, 0.32, 10), PAL.paper, 0); cap.rotation.z = Math.PI / 2; spin.add(cap);
    const spoke = ink(geo(THREE.BoxGeometry, 0.34, WHEEL_R * 1.5, 0.08), PAL.ink, 0); spin.add(spoke); // raio: mostra a roda girando
    wheels.push({ holder, spin, front: sz < 0 });
  }
  g.userData.wheels = wheels; g.userData.model = !!MODEL; g.userData.sus = sus;
  return g;
}

export class CarView {
  constructor(scene) { this.scene = scene; this.cars = new Map(); this.seat = new Map(); }
  // snap.cars; mine = estado local de quem dirige ({ id, pos, yaw, spd, steer }) ou null
  update(dt, cars, mine) {
    const seen = new Set();
    this.seat.clear();
    for (const s of cars || []) {
      seen.add(s.id);
      let v = this.cars.get(s.id);
      if (!v || (MODEL && !v.g.userData.model)) { if (v) this.scene.remove(v.g); v = { g: buildCar(s.team), pos: [...s.pos], yaw: s.yaw, spd: 0, steer: 0 }; this.scene.add(v.g); this.cars.set(s.id, v); }
      if (mine && mine.id === s.id) { v.pos = [...mine.pos]; v.yaw = mine.yaw; v.spd = mine.spd; v.steer = mine.steer || 0; }
      else {
        const k = 1 - Math.exp(-12 * dt);
        for (let i = 0; i < 3; i++) v.pos[i] += (s.pos[i] - v.pos[i]) * k;
        let d = s.yaw - v.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); v.yaw += d * k;
        v.spd = s.spd; v.steer += ((s.st || 0) - v.steer) * k;
      }
      // suspensao (04/11): o y visual segue o do carro com mola (degrau do chao nao da tranco) e a carroceria inclina
      // pra tras acelerando, pra frente freando e pro lado na curva, voltando amortecida
      v.vy0 ??= v.pos[1]; v.vyv = (v.vyv || 0) + ((v.pos[1] - v.vy0) * 60 - (v.vyv || 0) * 11) * dt; v.vy0 += v.vyv * dt;
      const acc = (v.spd - (v.lastSpd ?? v.spd)) / Math.max(dt, 1e-3); v.lastSpd = v.spd;
      v.pt = (v.pt || 0) + ((Math.max(-1, Math.min(1, acc / 14)) * 0.05 - (v.pt || 0)) * Math.min(1, dt * 6));
      v.rl = (v.rl || 0) + ((v.steer * Math.min(1, Math.abs(v.spd) / 10) * 0.05 - (v.rl || 0)) * Math.min(1, dt * 6));
      v.g.position.set(v.pos[0], v.vy0, v.pos[2]); v.g.rotation.y = v.yaw;
      const sus = v.g.userData.sus; if (sus) { sus.rotation.x = v.pt; sus.rotation.z = v.rl; sus.position.y = Math.sin(performance.now() / 90) * 0.012 * Math.min(1, Math.abs(v.spd) / 6); }
      for (const w of v.g.userData.wheels) { w.spin.rotation.x -= (v.spd / (w.r || WHEEL_R)) * dt; if (w.front) w.holder.rotation.y = -v.steer * 0.45; }
      const vis = { pos: [v.pos[0], v.vy0, v.pos[2]], yaw: v.yaw }; // o boneco vai com o y suavizado (sem tremer)
      s.seats.forEach((id, i) => { if (id) this.seat.set(id, { pos: seatPos(vis, i), yaw: v.yaw, steer: v.steer, i }); });
    }
    for (const [id, v] of this.cars) if (!seen.has(id)) { this.scene.remove(v.g); this.cars.delete(id); }
  }
  // onde o boneco sentado fica agora (carro ja suavizado): { pos, yaw, steer, i }
  seatOf(id) { return this.seat.get(id) || null; }
  near(pos, team, r = 3.6) { let best = null, bd = r * r; for (const [id, v] of this.cars) { const d = (v.pos[0] - pos[0]) ** 2 + (v.pos[2] - pos[2]) ** 2; if (d < bd) { bd = d; best = { id, v }; } } return best; }
  dispose() { for (const v of this.cars.values()) this.scene.remove(v.g); this.cars.clear(); }
}
export const carReady = () => loading;
