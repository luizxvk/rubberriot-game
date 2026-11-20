// Armadilhas do Pulo do Gato (19/11): desenho + empurrao. A regra (tempo, colisao, forca) mora em shared/bhtraps.js.
// O relogio e o do servidor (snap.sc) andando junto com o quadro: o que voce ve e o que te pega, e todo mundo ve igual.
// Cada peca que mexe e um objeto fundido (mergedKit: 1 malha + 1 contorno = 2 chamadas de desenho), pra nao pesar.
import * as THREE from 'three';
import { ink, geo, mergedKit } from './toon.js';
import { trapState, trapHit, STOMP_UP, HAMMER_PIVOT } from '../shared/bhtraps.js';

// cor de cada tema: [principal, faixa, metal]
const SKIN = {
  telhados: [0xc23a2c, 0xf0ebe0, 0x3a3d44], picadeiro: [0xc23a2c, 0xf2c230, 0x2f5b8a], caixotes: [0xa07a4a, 0x2f5b8a, 0x3a3d44],
  montagem: [0xf2c230, 0x141210, 0x5a5e66], nanquim: [0x2a2433, 0xf0ebe0, 0x141210],
};
const JET = { telhados: 0xe8e4da, picadeiro: 0xf2c230, caixotes: 0x7fb8d8, montagem: 0xe8e4da, nanquim: 0x2a2433 };
const r1 = (n) => n.toFixed(1);

function sweepBar(L, c) { // barra listrada atravessada no poste (as duas pontas)
  const g = new THREE.Group();
  const n = Math.max(2, Math.round(L * 2 / 0.7));
  for (let i = 0; i < n; i++) { const b = ink(geo(THREE.BoxGeometry, L * 2 / n, 0.26, 0.3), i % 2 ? c[1] : c[0], 0.03); b.position.x = -L + (i + 0.5) * L * 2 / n; g.add(b); }
  const hub = ink(geo(THREE.CylinderGeometry, 0.3, 0.3, 0.36, 12), c[2], 0.03); g.add(hub);
  return g;
}
function sweepPost(c) { const g = new THREE.Group(); const p = ink(geo(THREE.CylinderGeometry, 0.16, 0.22, 0.5, 10), c[2], 0.03); p.position.y = 0.25; g.add(p); return g; }
function hammerFrame(half, c) { // dois postes nas bordas de lado e a trave em cima (pivo)
  const g = new THREE.Group(), w = half + 1.0;
  for (const s of [-1, 1]) { const p = ink(geo(THREE.BoxGeometry, 0.3, HAMMER_PIVOT + 0.3, 0.3), c[2], 0.03); p.position.set(s * w, (HAMMER_PIVOT + 0.3) / 2 - 0.1, 0); g.add(p); }
  const top = ink(geo(THREE.BoxGeometry, w * 2 + 0.3, 0.3, 0.36), c[2], 0.03); top.position.y = HAMMER_PIVOT + 0.1; g.add(top);
  return g;
}
function hammerArm(L, c) { // haste pendurada pra baixo (-y) e a cabeca de martelo no fim
  const g = new THREE.Group();
  const rod = ink(geo(THREE.CylinderGeometry, 0.07, 0.07, L - 0.5, 6), c[2], 0.02); rod.position.y = -(L - 0.5) / 2; g.add(rod);
  const head = ink(geo(THREE.CylinderGeometry, 0.62, 0.62, 1.7, 14), c[0], 0.05); head.rotation.x = Math.PI / 2; head.position.y = -L; g.add(head);
  for (const z of [-0.86, 0.86]) { const cap = ink(geo(THREE.CylinderGeometry, 0.66, 0.66, 0.14, 14), c[1], 0.03); cap.rotation.x = Math.PI / 2; cap.position.set(0, -L, z); g.add(cap); }
  return g;
}
function pistonBox(c) { // caixa do pistao, presa na lateral, com faixa de perigo
  const g = new THREE.Group();
  const b = ink(geo(THREE.BoxGeometry, 1.0, 1.5, 2.0), c[2], 0.04); b.position.y = 0.75; g.add(b);
  for (let i = 0; i < 3; i++) { const s = ink(geo(THREE.BoxGeometry, 1.04, 0.16, 2.04), i % 2 ? c[1] : c[0], 0); s.position.y = 0.4 + i * 0.4; g.add(s); }
  return g;
}
function pistonRam(c, len) { // haste + placa que soca (a face fica em x = 0, a haste vai pra +x)
  const g = new THREE.Group();
  const face = ink(geo(THREE.BoxGeometry, 0.32, 1.3, 1.8), c[0], 0.04); face.position.set(0.16, 0.75, 0); g.add(face);
  const fist = ink(geo(THREE.BoxGeometry, 0.1, 0.5, 0.9), c[1], 0); fist.position.set(-0.03, 0.75, 0); g.add(fist);
  const rod = ink(geo(THREE.CylinderGeometry, 0.18, 0.18, len, 8), c[2], 0.03); rod.rotation.z = Math.PI / 2; rod.position.set(0.3 + len / 2, 0.75, 0); g.add(rod);
  return g;
}
function stompBlock(sz, c) { // bloco pesado com placa embaixo (base em y = 0) e argola em cima
  const g = new THREE.Group();
  const b = ink(geo(THREE.BoxGeometry, sz, 1.3, sz), c[2], 0.05); b.position.y = 0.75; g.add(b);
  const plate = ink(geo(THREE.BoxGeometry, sz + 0.1, 0.18, sz + 0.1), c[0], 0.03); plate.position.y = 0.09; g.add(plate);
  const band = ink(geo(THREE.BoxGeometry, sz + 0.06, 0.2, sz + 0.06), c[1], 0); band.position.y = 1.1; g.add(band);
  const ring = ink(geo(THREE.TorusGeometry, 0.3, 0.07, 6, 14), c[2], 0); ring.position.y = 1.65; g.add(ring);
  return g;
}
function stompRails(sz, c) { // dois trilhos de guia nos cantos
  const g = new THREE.Group(), h = STOMP_UP + 1.9;
  for (const s of [-1, 1]) { const p = ink(geo(THREE.BoxGeometry, 0.18, h, 0.18), c[2], 0.03); p.position.set(s * (sz / 2 + 0.2), h / 2 - 0.1, s * (sz / 2 + 0.2)); g.add(p); }
  return g;
}
function jetNozzle(c) { // bocal no meio do vao, la embaixo, com a boca virada pra cima
  const g = new THREE.Group();
  const n = ink(geo(THREE.CylinderGeometry, 0.5, 0.75, 0.8, 12), c[2], 0.04); g.add(n);
  const lip = ink(geo(THREE.TorusGeometry, 0.5, 0.1, 6, 14), c[0], 0); lip.rotation.x = Math.PI / 2; lip.position.y = 0.4; g.add(lip);
  return g;
}

export class BhTrapView {
  constructor(scene, M) {
    this.scene = scene; this.root = new THREE.Group(); scene.add(this.root);
    this.traps = M.bh?.traps || []; this.clock = null; this.hitCd = 0;
    const sk = M.bh?.skin || 'telhados', c = SKIN[sk] || SKIN.telhados; this.sk = sk;
    this.items = this.traps.map(T => {
      const g = new THREE.Group(); g.position.set(T.x, T.top, T.z); this.root.add(g);
      const yaw = Math.atan2(-T.pz, T.px); // eixo x local = de lado (p), eixo z local = direcao do pulo
      const it = { T, g };
      if (T.kind === 'sweep') { g.add(mergedKit('bhs_post_' + sk, () => sweepPost(c))); it.bar = mergedKit('bhs_bar_' + sk + r1(T.L), () => sweepBar(T.L, c)); it.bar.position.y = 0.42; g.add(it.bar); }
      if (T.kind === 'hammer') { const f = mergedKit('bhh_frame_' + sk + r1(T.half), () => hammerFrame(T.half, c)); f.rotation.y = yaw; g.add(f); it.piv = new THREE.Group(); it.piv.position.y = HAMMER_PIVOT; it.piv.rotation.y = yaw; g.add(it.piv); it.arm = mergedKit('bhh_arm_' + sk + r1(T.Lr), () => hammerArm(T.Lr, c)); it.piv.add(it.arm); }
      if (T.kind === 'piston') { it.side = new THREE.Group(); it.side.rotation.y = yaw + (T.side < 0 ? Math.PI : 0); g.add(it.side); const h = mergedKit('bhp_box_' + sk, () => pistonBox(c)); h.position.x = T.half + 1.1; it.house = h; it.side.add(h); it.ram = mergedKit('bhp_ram_' + sk + r1(T.half), () => pistonRam(c, 2 * T.half + 1.4)); it.side.add(it.ram); }
      if (T.kind === 'stomp') { g.add(mergedKit('bht_rail_' + sk + r1(T.s), () => stompRails(T.s, c))); it.blk = mergedKit('bht_blk_' + sk + r1(T.s), () => stompBlock(T.s, c)); g.add(it.blk); }
      if (T.kind === 'jet') {
        const n = mergedKit('bhj_noz_' + sk, () => jetNozzle(c)); n.position.y = -2.6; g.add(n); it.noz = n;
        it.col = new THREE.Mesh(geo(THREE.CylinderGeometry, 0.55, 0.85, 1, 12, 1, true), (this.jetMat ||= new THREE.MeshBasicMaterial({ color: JET[sk] || 0xe8e4da, transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide })));
        it.col.position.y = -2.2; it.col.visible = false; g.add(it.col);
      }
      return it;
    });
  }
  // relogio do servidor: anda com o quadro e corrige devagar pelo que chega no snap
  tick(dt, sc) {
    if (this.clock == null) this.clock = sc ?? 0; else this.clock += dt;
    if (typeof sc === 'number' && sc !== this.sc) { this.sc = sc; const e = sc - this.clock; this.clock += Math.abs(e) > 0.4 ? e : e * 0.15; }
    return this.clock;
  }
  update(dt, sc, player, onHit) {
    const t = this.tick(dt, sc), V = new THREE.Vector3();
    for (const it of this.items) {
      const T = it.T, S = trapState(T, t);
      if (T.kind === 'sweep') it.bar.rotation.y = -S.a;
      else if (T.kind === 'hammer') it.arm.rotation.z = S.th; // eixo local z = direcao do pulo: balanca de lado
      else if (T.kind === 'piston') { const face = T.half + 0.5 - S.k * (2 * T.half + 0.6); it.ram.position.x = face; it.house.position.x = T.half + 0.6 + 0.5 + (S.warn ? Math.sin(t * 60) * 0.04 : 0); it.ram.position.z = S.warn ? Math.sin(t * 55) * 0.03 : 0; }
      else if (T.kind === 'stomp') { it.blk.position.y = 0.02 + S.h * STOMP_UP; it.blk.position.x = S.warn ? Math.sin(t * 70) * 0.06 : 0; }
      else if (T.kind === 'jet') {
        it.col.visible = S.k > 0.02; const h = 7 * S.k; it.col.scale.set(1 + Math.sin(t * 30) * 0.06, Math.max(0.01, h), 1 + Math.cos(t * 27) * 0.06); it.col.position.y = -2.2 + h / 2;
        it.noz.scale.setScalar(S.warn ? 1 + Math.abs(Math.sin(t * 22)) * 0.12 : 1);
      }
    }
    // empurrao: so no meu boneco (a posicao e minha; os outros veem o voo pelo estado)
    this.hitCd = Math.max(0, this.hitCd - dt);
    if (!player?.alive || this.hitCd > 0) return;
    for (const it of this.items) {
      const v = trapHit(it.T, t, player.pos);
      if (!v) continue;
      player.vel = v; player.onGround = false; player.knockT = 0.5; this.hitCd = 0.6;
      onHit?.(it.T, V.set(player.pos[0], player.pos[1] + 1, player.pos[2]));
      break;
    }
  }
  dispose() { this.root.parent?.remove(this.root); this.jetMat?.dispose(); }
}
