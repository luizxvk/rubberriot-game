// Visual da Noite dos Borroes (03/11): portas de tabua com preco, armas pintadas na parede, Maquina de Leite,
// pocas de onde saem os viloes, pocas do Cuspidor no chao, bolas de tinta e rolos de filme do Projecionista.
// O placar do topo fica no hud.js (score); aqui so o texto de compra (hud.prompt).
import * as THREE from 'three';
import { ink, geo, PAL, wordTexture } from './toon.js';
import { milkBottle } from './world.js';
import { BOR } from '../shared/mobs.js';
import { floorAt } from '../shared/nav.js';
import { t } from './i18n.js';
import { buildGun, disposeGun, arsenalReady, infectLoadout, CATEGORY, partName } from './arsenal.js';

// moldura de giz na parede com nome e preco; a arma de verdade (modelo do Arsenal) fica pendurada na frente
function stationTexture(wpn, name, price) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d'), ox = 36, oy = 10;
  x.strokeStyle = '#e8dfc8'; x.lineWidth = 6; x.setLineDash([18, 10]); x.strokeRect(8, 8, 496, 240); x.setLineDash([]);
  x.fillStyle = '#e8dfc8';
  for (let i = 0; i < 7; i++) { const dx = ox + 30 + i * 60 + (i * 37 % 20), dy = oy + 160, len = 12 + (i * 53 % 40); x.fillRect(dx, dy - 50, 5, len); x.beginPath(); x.arc(dx + 2.5, dy - 50 + len, 5, 0, Math.PI * 2); x.fill(); } // tinta escorrendo
  x.font = '38px "Bowlby One", sans-serif'; x.textAlign = 'center'; x.lineWidth = 8; x.strokeStyle = '#141210';
  const s = `${name}  ${price}`; x.strokeText(s, 256, 232); x.fillText(s, 256, 232);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// procura a face da parede atras de quem compra (andando contra o `face`); devolve o ponto da face
function wallFace(M, pos, face) {
  for (let d = 0; d < 4; d += 0.02) {
    const x = pos[0] - face[0] * d, z = pos[1] - face[1] * d;
    if (M.boxes.some(b => b.max[1] >= 2.5 && b.min[1] <= 0.5 && x > b.min[0] && x < b.max[0] && z > b.min[2] && z < b.max[2])) return [x + face[0] * 0.02, z + face[1] * 0.02];
  }
  return [pos[0] - face[0] * 1.1, pos[1] - face[1] * 1.1];
}

function doorMesh(price) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  // um pouco menor que o vao (2,96 x 4,18 x 0,8): nenhuma face encosta igual na parede (sem z-fighting)
  const back = ink(geo(THREE.BoxGeometry, 2.96, 4.18, 0.6), PAL.dark, 0.04); back.position.y = 2.09; body.add(back);
  const rows = [0.5, 1.25, 2.05, 2.85, 3.65];
  for (const s of [-1, 1]) {
    rows.forEach((y, i) => { const p = ink(geo(THREE.BoxGeometry, 3.08, 0.5, 0.1), 0x8a6a45, 0.03); p.position.set(0, y, s * 0.36); p.rotation.z = ((i * 7) % 5 - 2) * 0.025; body.add(p); });
    const x = ink(geo(THREE.BoxGeometry, 4.4, 0.4, 0.08), 0x6e5234, 0.03); x.position.set(0, 2.1, s * 0.45); x.rotation.z = s * 0.9; body.add(x);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: wordTexture(String(price), { burst: false, fill: '#f2c14e', size: 256 }), transparent: true }));
    sign.position.set(0, 2.6, s * 0.56); if (s < 0) sign.rotation.y = Math.PI; body.add(sign);
    g.userData.own = (g.userData.own || []).concat(sign.geometry, sign.material);
  }
  g.userData.body = body;
  return g;
}

function milkMachine() {
  const g = new THREE.Group();
  const cab = ink(geo(THREE.BoxGeometry, 1.4, 2.3, 0.8), PAL.paper, 0.05); cab.position.y = 1.15; g.add(cab);
  const band = ink(geo(THREE.BoxGeometry, 1.46, 0.4, 0.86), PAL.red, 0); band.position.y = 1.85; g.add(band);
  const win = ink(geo(THREE.BoxGeometry, 1, 0.9, 0.08), 0x1b2a3a, 0.02); win.position.set(0, 1.0, 0.44); g.add(win);
  const slot = ink(geo(THREE.BoxGeometry, 0.7, 0.18, 0.08), PAL.ink, 0); slot.position.set(0, 0.32, 0.44); g.add(slot);
  const bottle = milkBottle(); bottle.scale.setScalar(1.7); bottle.position.y = 2.85; g.add(bottle);
  const lamp = new THREE.PointLight(0xfff1d0, 4, 6, 2); lamp.position.set(0, 2.6, 0.9); g.add(lamp);
  g.userData = { bottle, lamp };
  return g;
}

function poolMesh(mat, bubMat) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), mat); disc.rotation.x = -Math.PI / 2; g.add(disc);
  const bubs = [];
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(geo(THREE.SphereGeometry, 0.18, 8, 6), bubMat); b.position.set(Math.cos(i * 2.1) * 0.6, 0, Math.sin(i * 2.1) * 0.6); g.add(b); bubs.push(b); }
  g.userData.bubs = bubs;
  return g;
}

// Caixa de Surpresas do Nanquim: caixa de joao-bobo com manivela; a tampa abre e sai a mola com cabeca de borrao
function boxMesh() {
  const g = new THREE.Group();
  const base = ink(geo(THREE.BoxGeometry, 1.6, 0.9, 0.9), 0x7a2a8c, 0.05); base.position.y = 0.45; g.add(base);
  for (const y of [0.15, 0.75]) { const s = ink(geo(THREE.BoxGeometry, 1.64, 0.08, 0.94), 0xf2c14e, 0); s.position.y = y; g.add(s); }
  const q = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: wordTexture('?', { burst: false, fill: '#f2c14e', size: 128 }), transparent: true }));
  q.position.set(0, 0.45, 0.47); g.add(q);
  const crank = new THREE.Group(); crank.position.set(0.86, 0.5, 0); g.add(crank);
  const axle = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 0.2, 8), PAL.ink, 0); axle.rotation.z = Math.PI / 2; axle.position.x = 0.08; crank.add(axle);
  const arm = ink(geo(THREE.BoxGeometry, 0.06, 0.35, 0.06), PAL.ink, 0); arm.position.set(0.18, 0.14, 0); crank.add(arm);
  const knob = ink(geo(THREE.SphereGeometry, 0.07, 8, 6), PAL.red, 0); knob.position.set(0.26, 0.28, 0); crank.add(knob);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.92, -0.47); g.add(hinge); // tampa: um tico acima da caixa (sem face colada)
  const lid = ink(geo(THREE.BoxGeometry, 1.68, 0.1, 0.98), 0x5c1f6b, 0.04); lid.position.set(0, 0.05, 0.47); hinge.add(lid);
  const spring = new THREE.Group(); spring.position.y = 0.6; g.add(spring);
  const coils = [];
  for (let i = 0; i < 6; i++) { const c = ink(geo(THREE.TorusGeometry, 0.18, 0.035, 6, 14), 0xc9c4b8, 0); c.rotation.x = Math.PI / 2; spring.add(c); coils.push(c); }
  const head = ink(geo(THREE.SphereGeometry, 0.32, 14, 10), 0x141210, 0.04); spring.add(head);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(geo(THREE.SphereGeometry, 0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(s * 0.12, 0.08, 0.27); head.add(e); }
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false })); tag.scale.set(3, 1.5, 1); tag.renderOrder = 8; tag.visible = false; g.add(tag);
  g.userData = { hinge, crank, spring, coils, head, tag, own: [q.geometry, q.material, tag.material] };
  return g;
}
const BOX_NAMES = ['smg', 'shotgun', 'rifle', 'sniper', 'minigun', 'rpg'];
// o que gira na manivela: os modelos que podem sair (mesma lista do servidor), embaralhados
let spinList = null;
const boxSpinList = () => spinList ||= [...['smg', 'rifle', 'shotgun', 'sniper', 'pistol'].flatMap(c => (CATEGORY[c]?.bodies || []).filter(b => b !== 'pistol_1' && !b.startsWith('melee')).map(b => [c, b])), ['minigun', null], ['rpg', null]].sort(() => Math.random() - 0.5).slice(0, 12); // 12 bastam pro giro (montar 40 modelos em 3 s travava no celular)

// drops: cor, simbolo do selo (curto, igual em PT/EN) e o nome traduzido embaixo
const DROP_LOOK = {
  dobro: ['#f2c14e', 'x2'], refil: ['#3fae5a', 'MAX'], borracha: ['#e86a9a', 'ZAP'], quadro: ['#7fc8f0', 'II'],
  lapis: ['#f08a2a', 'KO'], intervalo: ['#c23a2a', '+'], chave: ['#c9a24a', 'OPEN'],
};
const dropTex = {};
function dropTexture(k) {
  if (dropTex[k]) return dropTex[k];
  const [col, glyph] = DROP_LOOK[k] || DROP_LOOK.dobro, c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = '#141210'; x.beginPath(); x.arc(128, 128, 116, 0, Math.PI * 2); x.fill();
  x.fillStyle = col; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#faf8f2'; x.lineWidth = 6; x.setLineDash([14, 10]); x.beginPath(); x.arc(128, 128, 84, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.font = `${glyph.length > 2 ? 62 : 96}px "Bowlby One", sans-serif`; x.lineWidth = 12; x.strokeStyle = '#141210'; x.strokeText(glyph, 128, 134); x.fillStyle = '#faf8f2'; x.fillText(glyph, 128, 134);
  x.font = '30px "Bowlby One", sans-serif'; x.lineWidth = 8; const n = t('dr_' + k).toUpperCase(); x.strokeText(n, 128, 286, 250); x.fillText(n, 128, 286, 250);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return (dropTex[k] = tex);
}
function dropMesh(k) {
  const g = new THREE.Group(), col = new THREE.Color((DROP_LOOK[k] || DROP_LOOK.dobro)[0]);
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture(k), transparent: true })); badge.scale.set(1.1, 1.375, 1); badge.position.y = 1.4; g.add(badge);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 6, 14, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.y = 3; g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
  g.userData = { badge, beam, ring, own: [badge.material, beam.geometry, beam.material, ring.geometry, ring.material] };
  return g;
}

function reelMesh() {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const disc = ink(geo(THREE.CylinderGeometry, 0.55, 0.55, 0.16, 18), 0x9aa0a6, 0.03); disc.rotation.z = Math.PI / 2; spin.add(disc);
  for (let i = 0; i < 3; i++) { const h = ink(geo(THREE.CylinderGeometry, 0.12, 0.12, 0.2, 10), PAL.ink, 0); h.rotation.z = Math.PI / 2; h.position.set(0, Math.cos(i * 2.09) * 0.3, Math.sin(i * 2.09) * 0.3); spin.add(h); }
  g.userData.spin = spin;
  return g;
}

export class BorView {
  constructor(scene, M) {
    this.scene = scene; this.M = M; this.root = new THREE.Group(); scene.add(this.root);
    this.doors = new Map(); this.puddles = new Map(); this.blots = new Map(); this.drops = new Map(); this.own = []; this.guns = [];
    this.inkMat = new THREE.MeshBasicMaterial({ color: 0x0b0a10, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.bubMat = new THREE.MeshBasicMaterial({ color: 0x1d1830 });
    this.spitMat = new THREE.MeshBasicMaterial({ color: 0x3b2a5c, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    this.blotMat = new THREE.MeshBasicMaterial({ color: 0x241a3a });
    this.circle = new THREE.CircleGeometry(1, 20);
    this.own.push(this.inkMat, this.bubMat, this.spitMat, this.blotMat, this.circle);
    this.build();
  }

  build() {
    const B = this.M.bor; if (!B) return;
    for (const d of B.doors) {
      const m = doorMesh(d.price); m.position.set(d.x, 0, d.z); m.rotation.y = d.alongZ ? Math.PI / 2 : 0;
      this.root.add(m); this.doors.set(d.id, m); this.own.push(...m.userData.own);
    }
    this.stations = B.stations.map(s => {
      const [x, z] = wallFace(this.M, s.pos, s.face);
      const tex = stationTexture(s.wpn, this.name?.(s.wpn) || t('w_' + s.wpn), s.price);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      m.position.set(x + s.face[0] * 0.06, 1.75, z + s.face[1] * 0.06); m.rotation.y = Math.atan2(s.face[0], s.face[1]);
      this.root.add(m); this.own.push(m.geometry, m.material, tex);
      // suporte da arma real: 18 cm da parede (nada colado), deitada ao longo da parede
      const hold = new THREE.Group(); hold.position.set(x + s.face[0] * 0.18, 1.95, z + s.face[1] * 0.18); hold.rotation.y = m.rotation.y; this.root.add(hold);
      m.userData.hold = hold; m.userData.wpn = s.wpn;
      return m;
    });
    this.milk = B.milk.map(q => {
      const [x, z] = wallFace(this.M, q.pos, q.face), m = milkMachine();
      m.position.set(x + q.face[0] * 0.46, 0, z + q.face[1] * 0.46); m.rotation.y = Math.atan2(q.face[0], q.face[1]);
      this.root.add(m); return m;
    });
    this.pools = B.pools.map(q => {
      const m = poolMesh(this.inkMat, this.bubMat); m.position.set(q.pos[0], floorAt(this.M, q.pos[0], q.pos[1]) + 0.085, q.pos[1]); // acima das pocas velhas do cenario (0,03-0,07)
      this.root.add(m); this.own.push(m.children[0].geometry); return m;
    });
    this.boxSpots = (B.box || []).map(q => { const [x, z] = wallFace(this.M, q.pos, q.face); return { x: x + q.face[0] * 0.5, z: z + q.face[1] * 0.5, y: floorAt(this.M, q.pos[0], q.pos[1]), yaw: Math.atan2(q.face[0], q.face[1]) }; });
    if (this.boxSpots.length) { this.box = boxMesh(); this.box.visible = false; this.root.add(this.box); this.own.push(...this.box.userData.own); }
  }

  // modelo real da arma (buildGun do Arsenal) com a montagem que o jogador vai receber, medido pra caber em `len` m
  // (eixo mais comprido vira o x do grupo). null enquanto as pecas do Arsenal nao carregaram
  gunModel(wpn, len, body = null) {
    if (!arsenalReady()) return null;
    const lo = body ? infectLoadout(wpn, { body }) : this.loOf?.(wpn); // sem laser: o feixe (metros) entrava na medida e a arma saia minuscula
    const g = buildGun(wpn, lo ? { ...lo, laser: null } : lo); if (!g) return null;
    const box = new THREE.Box3().setFromObject(g), d = box.getSize(new THREE.Vector3());
    const wrap = new THREE.Group(), inner = new THREE.Group(); wrap.add(inner); inner.add(g);
    g.position.sub(box.getCenter(new THREE.Vector3()));
    if (d.z > d.x) inner.rotation.y = Math.PI / 2;
    wrap.scale.setScalar(len / Math.max(d.x, d.z, 0.01));
    this.guns.push(g);
    return wrap;
  }

  // nome e montagem da arma (o main passa os mesmos do HUD); refaz as pinturas se chegar depois do build
  setNames(fn, loOf) {
    if (this.name) return;
    this.name = fn; this.loOf = loOf;
    const B = this.M.bor; if (!B || !this.stations) return;
    B.stations.forEach((s, i) => { const m = this.stations[i], old = m.material.map; m.material.map = stationTexture(s.wpn, fn(s.wpn), s.price); m.material.needsUpdate = true; old.dispose(); this.own.splice(this.own.indexOf(old), 1, m.material.map); });
  }

  sync(bor) {
    if (!bor) return;
    this.bor = bor;
    for (const m of this.stations || []) m.visible = !bor.art; // Arte-Final: cada um com o seu Arsenal, parede sem arma
    const closed = new Set(bor.doors);
    for (const [id, m] of this.doors) if (!closed.has(id) && !m.userData.openT) m.userData.openT = 1e-6;
    const seen = new Set();
    for (const [id, x, y, z, r] of bor.puddles) {
      seen.add(id);
      if (this.puddles.has(id)) continue;
      const m = new THREE.Mesh(this.circle, this.spitMat); m.rotation.x = -Math.PI / 2;
      m.position.set(x, y + 0.1 + (id % 5) * 0.008, z); m.userData.r = r; m.scale.setScalar(0.01); m.renderOrder = 2 + (id % 5);
      this.root.add(m); this.puddles.set(id, m);
    }
    for (const [id, m] of this.puddles) if (!seen.has(id)) { this.root.remove(m); this.puddles.delete(id); }
    seen.clear();
    for (const [id, x, y, z, roll] of bor.blots) {
      seen.add(id);
      let m = this.blots.get(id);
      if (!m) {
        if (roll) m = reelMesh(); else { m = new THREE.Mesh(geo(THREE.SphereGeometry, 0.32, 10, 8), this.blotMat); m.scale.set(1, 1.2, 1); }
        m.position.set(x, y, z); m.userData.to = new THREE.Vector3(x, y, z); m.userData.roll = !!roll;
        this.root.add(m); this.blots.set(id, m);
      }
      m.userData.to.set(x, y, z);
    }
    for (const [id, m] of this.blots) if (!seen.has(id)) { this.root.remove(m); this.blots.delete(id); }
    seen.clear();
    for (const [id, k, x, y, z, left] of bor.drops || []) {
      seen.add(id);
      let m = this.drops.get(id);
      if (!m) { m = dropMesh(k); m.position.set(x, y, z); this.root.add(m); this.drops.set(id, m); }
      m.userData.left = left;
    }
    for (const [id, m] of this.drops) if (!seen.has(id)) { this.root.remove(m); for (const o of m.userData.own) o.dispose(); this.drops.delete(id); }
  }

  update(dt, time) {
    for (const [id, m] of this.doors) {
      const u = m.userData; if (!u.openT || !m.visible) continue;
      u.openT += dt; const k = Math.min(1, u.openT / 0.6); // tabuas afundam no chao com um tranco
      u.body.position.y = -4.4 * k * k; u.body.rotation.z = Math.sin(k * 20) * 0.04 * (1 - k);
      if (k >= 1) m.visible = false;
      if (!this.bor?.doors.includes(id) && k >= 1) this.doors.delete(id);
    }
    for (const m of this.milk || []) { const u = m.userData; u.bottle.rotation.y += dt * 1.2; u.bottle.position.y = 2.85 + Math.sin(time * 2) * 0.06; u.lamp.intensity = 3.4 + Math.sin(time * 9) * 0.6; }
    this.updateBox(dt, time);
    for (const m of this.drops.values()) { // flutua, o feixe pulsa; nos ultimos 5 s pisca cada vez mais rapido
      const u = m.userData, k = u.left <= 5 ? (u.left <= 2 ? 10 : 5) : 0;
      u.badge.position.y = 1.4 + Math.sin(time * 3 + m.position.x) * 0.15;
      u.beam.material.opacity = 0.16 + Math.sin(time * 5) * 0.06; u.ring.rotation.z += dt * 1.5;
      m.visible = !k || Math.floor(time * k) % 2 === 0;
    }
    for (const m of this.stations || []) {
      const h = m.userData.hold; h.visible = m.visible;
      if (!h.children.length && m.visible && this.loOf) { const g = this.gunModel(m.userData.wpn, 1.7); if (g) h.add(g); }
      if (h.children[0]) h.children[0].position.y = Math.sin(time * 1.5 + h.position.x) * 0.04; // balanca de leve no prego
    }
    (this.pools || []).forEach((m, i) => m.userData.bubs.forEach((b, j) => { const k = (time * 0.8 + i * 0.37 + j * 0.33) % 1; b.position.y = k * 0.25; b.scale.setScalar(0.4 + Math.sin(k * Math.PI) * 0.9); }));
    for (const m of this.puddles.values()) { const s = m.scale.x, want = m.userData.r; if (s < want) m.scale.setScalar(Math.min(want, s + dt * want * 5)); }
    for (const m of this.blots.values()) {
      const u = m.userData, dx = u.to.x - m.position.x, dz = u.to.z - m.position.z;
      m.position.lerp(u.to, Math.min(1, dt * 14));
      if (u.roll) { if (dx * dx + dz * dz > 1e-4) m.rotation.y = Math.atan2(dx, dz); u.spin.rotation.x += dt * 14; }
      else m.rotation.y += dt * 6;
    }
  }

  updateBox(dt, time) {
    const g = this.box, X = this.bor?.box; if (!g) return;
    g.visible = !!X; if (!X) return;
    const [at, spin, show, showBody] = X, s = this.boxSpots[at], u = g.userData;
    if (s && g.userData.at !== at) { g.position.set(s.x, s.y, s.z); g.rotation.y = s.yaw; u.at = at; }
    const open = spin > 0 || !!show, laugh = show === 'laugh';
    u.hinge.rotation.x += ((open ? -1.9 : 0) - u.hinge.rotation.x) * Math.min(1, dt * 6);
    if (spin > 0) u.crank.rotation.x -= dt * 9;
    const up = open ? (laugh ? 1.1 + Math.abs(Math.sin(time * 14)) * 0.5 : 0.8 + Math.sin(time * 8) * 0.12) : 0;
    u.lift = (u.lift || 0) + (up - (u.lift || 0)) * Math.min(1, dt * 8);
    u.coils.forEach((c, i) => { c.position.y = (i / 5) * u.lift; });
    u.head.position.y = u.lift + 0.3; u.head.rotation.z = laugh ? Math.sin(time * 22) * 0.35 : Math.sin(time * 5) * 0.1;
    u.spring.visible = u.lift > 0.05;
    // arma real subindo da caixa, ACIMA da cabeca da mola: gira trocando de modelo; quando sai, fica a sorteada
    let gw = null, gb = null, word = null;
    if (spin > 0) { const L = boxSpinList(); [gw, gb] = L[Math.floor(time * 7) % L.length]; }
    else if (show && !laugh) { gw = show; gb = showBody || null; word = gb ? partName('body', gb) : this.name?.(show) || t('w_' + show); }
    else if (laugh) word = 'HA HA HA!';
    u.guns ||= new Map();
    const key = gw && gw + '|' + gb;
    if (key && !u.guns.has(key)) { const m = this.gunModel(gw, 1.3, gb); if (m) { g.add(m); u.guns.set(key, m); } }
    const gy = 0.6 + u.lift + 1.15; // mola (0,6) + subida + cabeca (0,3 + raio 0,32) + folga
    for (const [w, m] of u.guns) {
      m.visible = w === key;
      if (m.visible) { m.position.set(0, gy + Math.sin(time * 3) * 0.05, 0.1); m.rotation.y = spin > 0 ? time * 4 : Math.sin(time * 1.6) * 0.5; }
    }
    u.tag.visible = !!word;
    if (word && u.word !== word) { u.word = word; u.tag.material.map = wordTexture(word, { burst: false, fill: laugh ? '#c23a2a' : '#f2c14e', size: 256 }); u.tag.material.needsUpdate = true; }
    u.tag.position.y = 0.6 + u.lift + 2.05;
  }

  // texto de compra perto de porta / arma / leite (mesma ordem do tryBuy do servidor); null = nada perto
  prompt(pos, owned, holdText) {
    const B = this.M.bor, bor = this.bor; if (!B || !bor || !pos) return null;
    const near = (x, z, r) => (pos[0] - x) ** 2 + (pos[2] - z) ** 2 < r * r, open = (room) => room === 'hub' || !bor.doors.includes(room);
    let s = null;
    const d = B.doors.find(d => bor.doors.includes(d.id) && near(d.x, d.z, BOR.doorR));
    if (d) s = t('bor_door', { r: t('bor_room_' + d.id), p: d.price });
    const st = !s && !bor.art && B.stations.find(q => open(q.room) && near(q.pos[0], q.pos[1], BOR.buyR));
    if (st) { const w = this.name?.(st.wpn) || t('w_' + st.wpn); s = owned?.includes(st.wpn) ? t('bor_buyAmmo', { w, p: Math.round(st.price / 2) }) : t('bor_buyWpn', { w, p: st.price }); }
    if (!s && B.milk.some(q => open(q.room) && near(q.pos[0], q.pos[1], BOR.buyR))) s = t('bor_milk', { p: BOR.milk });
    const bx = !s && bor.box && B.box?.[bor.box[0]];
    if (bx && open(bx.room) && near(bx.pos[0], bx.pos[1], BOR.buyR)) { if (bor.box[1] > 0 || bor.box[2]) return t('bor_boxSpin'); s = t('bor_box', { p: BOR.box.price }); }
    return s ? s + ' · ' + holdText : null;
  }

  dispose() {
    this.root.parent?.remove(this.root);
    for (const o of this.own) o?.dispose?.();
    for (const g of this.guns) disposeGun(g);
    for (const m of this.drops.values()) for (const o of m.userData.own) o.dispose();
  }
}
