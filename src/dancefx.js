// Efeitos das danças de vitrine da Loja (05/11, pedido dele: "faz fogo, projeta alguma coisa"): particulas e raio no tempo da batida.
// Uma dança marca em `fx` o que solta e em qual batida; aqui so desenha. Serve pro podio, pra previa do Visual, da Loja e da POC.
import * as THREE from 'three';
import { DANCES, dancePose } from './dances.js';
import { wordTexture } from './toon.js';
import { ring as fxRing, column as fxColumn, burst as fxBurst } from './deathfx.js';

const canvas = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
let TEX = null;
function textures() {
  if (TEX) return TEX;
  const blob = (inner, outer) => canvas((g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 30); r.addColorStop(0, inner); r.addColorStop(0.55, outer); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  TEX = {
    fire: blob('#ffd23f', '#f0641a'),
    spark: blob('#ffffff', '#ffd23f'),
    heart: canvas((g) => { g.fillStyle = '#e84a6f'; g.strokeStyle = '#141210'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 54); g.bezierCurveTo(4, 34, 8, 10, 24, 12); g.bezierCurveTo(29, 12, 32, 18, 32, 20); g.bezierCurveTo(32, 18, 35, 12, 40, 12); g.bezierCurveTo(56, 10, 60, 34, 32, 54); g.fill(); g.stroke(); }),
    confetti: ['#e84a6f', '#ffd23f', '#39d7ff', '#7fd14c', '#faf8f2'].map(c => canvas((g) => { g.fillStyle = c; g.strokeStyle = '#141210'; g.lineWidth = 4; g.fillRect(12, 22, 40, 20); g.strokeRect(12, 22, 40, 20); })),
    dust: blob('rgba(236,233,225,.95)', 'rgba(150,140,125,.55)'),
    star: canvas((g) => { g.fillStyle = '#ffd23f'; g.strokeStyle = '#141210'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 26, an = i / 10 * Math.PI * 2; g[i ? 'lineTo' : 'moveTo'](32 + Math.sin(an) * r, 34 - Math.cos(an) * r); } g.closePath(); g.fill(); g.stroke(); }),
    petal: canvas((g) => { g.fillStyle = '#c8243a'; g.strokeStyle = '#141210'; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 32, 12, 22, 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); }),
    note: canvas((g) => { g.fillStyle = '#141210'; g.beginPath(); g.ellipse(22, 46, 12, 9, -0.4, 0, 7); g.fill(); g.fillRect(30, 12, 5, 34); g.fillRect(30, 12, 20, 7); }),
  };
  return TEX;
}
const KIND = { // vida (s), tamanho inicial e final, gravidade, se soma luz
  fire: { life: 0.55, s0: 0.26, s1: 0.8, g: 1.5 }, spark: { life: 0.45, s0: 0.22, s1: 0.05, g: -5, add: true },
  heart: { life: 1.4, s0: 0.16, s1: 0.34, g: 0.7 }, dust: { life: 0.9, s0: 0.3, s1: 0.95, g: 0.5 }, star: { life: 1.1, s0: 0.28, s1: 0.1, g: -4 }, petal: { life: 2.6, s0: 0.15, s1: 0.15, g: -0.9, sway: true }, confetti: { life: 1.5, s0: 0.15, s1: 0.13, g: -2.6 }, note: { life: 1.3, s0: 0.2, s1: 0.28, g: 0.5 },
};
const V = new THREE.Vector3(), V2 = new THREE.Vector3();

export class DanceFx {
  constructor(scene) { this.scene = scene; this.root = new THREE.Group(); scene.add(this.root); this.free = []; this.live = []; this.bolts = []; this.seen = new WeakMap(); }
  puff(kind, at, dir, n = 1, spread = 0.6, speed = 3) {
    const T = textures(), K = KIND[kind];
    for (let i = 0; i < n && this.live.length < 220; i++) {
      const map = kind === 'confetti' ? T.confetti[Math.floor(Math.random() * T.confetti.length)] : T[kind];
      const s = this.free.pop() || new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      s.material.map = map; s.material.blending = K.add ? THREE.AdditiveBlending : THREE.NormalBlending; s.material.opacity = 1; s.material.needsUpdate = true;
      s.position.copy(at); s.visible = true; this.root.add(s);
      const d = new THREE.Vector3(dir[0] + (Math.random() - 0.5) * spread, dir[1] + (Math.random() - 0.5) * spread, dir[2] + (Math.random() - 0.5) * spread).multiplyScalar(speed * (0.7 + Math.random() * 0.6));
      this.live.push({ s, K, v: d, t: 0 });
    }
  }
  bolt(from, to) { // raio torto de cima pra baixo, some em 0,3 s sem piscar
    const pts = [], n = 7; for (let i = 0; i <= n; i++) { const k = i / n, w = i && i < n ? 0.5 : 0; pts.push(new THREE.Vector3().lerpVectors(from, to, k).add(V.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * w))); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 24, 0.07, 5), new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true })); this.root.add(m);
    this.bolts.push({ m, t: 0, life: 0.32 });
  }
  card(at, dirW, word) { // cartao de cinema projetado na frente do boneco, com o feixe de luz
    const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 20, 1, true).translate(0, -1.2, 0).rotateX(-Math.PI / 2), mat); g.add(beam);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(word, { burst: true, size: 512 }), transparent: true, depthWrite: false })); sp.position.set(0, 0, 2.4); sp.scale.setScalar(1.5); g.add(sp);
    g.position.copy(at); g.lookAt(V.copy(at).add(dirW)); this.root.add(g);
    this.bolts.push({ m: g, t: 0, life: 2.4, card: sp, beam: mat });
  }
  // solta o que a dança marcou entre a batida anterior e esta. Chamar a cada quadro com o tempo da dança
  tick(ch, id, t) {
    const D = DANCES[id]; if (!D?.fx) return;
    const b = t * D.bpm / 60, P = this.seen.get(ch), prev = P && P.id === id && P.b <= b ? P.b : b - 1e-4; this.seen.set(ch, { id, b });
    const per = D.beats, p0 = prev % per, p1 = b % per;
    for (const F of D.fx) {
      const every = F.every || 0, from = F.at, to = F.to ?? F.at;
      let fire = 0;
      if (every) { for (let q = from; q <= to; q += every) if ((p0 <= p1 && q > p0 && q <= p1) || (p0 > p1 && (q > p0 || q <= p1))) fire++; } else if ((p0 <= p1 && from > p0 && from <= p1) || (p0 > p1 && (from > p0 || from <= p1))) fire = 1;
      for (let i = 0; i < fire; i++) this.emit(ch, id, t, F);
    }
  }
  emit(ch, id, t, F) {
    const pose = dancePose(id, t); ch.root.updateMatrixWorld(true); ch.body.updateMatrix();
    const local = (p) => ch.root.localToWorld(V2.fromArray(p).applyMatrix4(ch.body.matrix).clone());
    // boca (08/11, pedido dele: o fogo tem que sair da BOCA): ponto e direcao seguem a cabeca do boneco na pose
    const mouth = () => { const at = ch.head.localToWorld(new THREE.Vector3(0, -0.17, -0.46)), q = new THREE.Quaternion(); ch.head.getWorldQuaternion(q); return { at, dir: new THREE.Vector3(0, -0.12, -1).normalize().applyQuaternion(q) }; };
    const at = F.from === 'mouth' ? mouth().at : F.from === 'hands' ? local(pose.hR).lerp(local(pose.hL), 0.5) : F.from === 'hR' ? local(pose.hR) : F.from === 'hL' ? local(pose.hL) : F.from === 'feet' ? ch.root.localToWorld(new THREE.Vector3(0, 0.1, 0)) : F.from === 'sky' ? ch.root.localToWorld(new THREE.Vector3(0, 3.2, 0)) : local([0, 1.56, -0.42]);
    const q = new THREE.Quaternion(); ch.root.getWorldQuaternion(q);
    const dir = F.from === 'mouth' ? mouth().dir : new THREE.Vector3(...(F.dir || [0, 1, 0])).applyQuaternion(q);
    // efeitos 3D das lendarias (shader do deathfx.js): cada um com vida propria e, o jato, preso na boca
    if (F.kind === 'jet') { const m = fxColumn(0xff7a1a, F.len || 1.7, 0.9); m.scale.x = m.scale.z = 0.3; const place = () => { const M = mouth(); m.position.copy(M.at); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), M.dir); }; place(); this.root.add(m); this.bolts.push({ m, t: 0, life: F.life || 2, set: (k) => m.userData.set(Math.min(0.99, 0.02 + k * 0.97)), follow: place }); return; }
    if (F.kind === 'ring') { const m = fxRing(F.color ?? 0xfaf8f2, F.size || 2.2); m.position.copy(ch.root.localToWorld(new THREE.Vector3(0, 0.05, 0))); this.root.add(m); this.bolts.push({ m, t: 0, life: F.life || 0.7, set: (k) => m.userData.set(k) }); return; }
    if (F.kind === 'burst') { const m = fxBurst(F.color ?? 0xffd23f, F.size || 1.4); m.position.copy(at); this.root.add(m); this.bolts.push({ m, t: 0, life: F.life || 0.5, set: (k) => m.userData.set(k) }); return; }
    if (F.kind === 'spot') { const m = fxColumn(F.color ?? 0xfff3c4, 4.6, 0.55); m.scale.x = m.scale.z = 1.25; m.position.copy(ch.root.localToWorld(new THREE.Vector3(0, 0.02, 0))); this.root.add(m); this.bolts.push({ m, t: 0, life: F.life || 3, set: (k) => m.userData.set(0.02 + k * 0.96) }); return; }
    if (F.kind === 'trail') { // rastro do giro da cambalhota: arco branco no plano do giro, varre junto e some
      const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xfaf8f2, transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.06, 6, 40, Math.PI * 1.4), mat); arc.rotation.y = Math.PI / 2; g.add(arc);
      // 14/11 (pedido dele: desenhava o circulo inverso): o meio do corpo gira quase parado (dances.js flip) e o pe faz um circulo de ~1 m
      // em volta dele. O arco fica CENTRADO no corpo, na altura do meio do salto, e gira no sentido do flip (sp = dir)
      const sp = F.spin || 1; g.position.copy(ch.root.localToWorld(new THREE.Vector3(0, 1.75, 0)));
      g.quaternion.copy(q); this.root.add(g);
      this.bolts.push({ m: g, t: 0, life: F.life || 1.3, set: (k) => { mat.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.85; const u = Math.min(1, k); arc.rotation.x = sp * u * u * (3 - 2 * u) * Math.PI * 2; } }); return; } // mesma curva do giro do corpo (flip: sm)
    if (F.kind === 'bolt') { const end = ch.root.localToWorld(new THREE.Vector3(0, 2.1, 0)); this.bolt(end.clone().add(V.set(0.5, 9, 0.3)), end); this.puff('spark', end, [0, 1, 0], 16, 2, 3.2); return; }
    if (F.kind === 'card') { this.card(at, dir, F.word || 'BANG!'); return; }
    this.puff(F.kind, at, dir.toArray(), F.n || 1, F.spread ?? 0.6, F.speed ?? 3);
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const L = this.live[i], k = (L.t += dt) / L.K.life;
      if (k >= 1) { this.root.remove(L.s); this.free.push(L.s); this.live.splice(i, 1); continue; }
      L.v.y += L.K.g * dt; L.s.position.addScaledVector(L.v, dt); L.v.multiplyScalar(1 - 1.1 * dt);
      if (L.K.sway) { L.s.position.x += Math.sin(L.t * 5 + L.s.id) * dt * 0.6; L.s.material.rotation = Math.sin(L.t * 4 + L.s.id) * 0.8; } // petala balanca caindo
      L.s.scale.setScalar(L.K.s0 + (L.K.s1 - L.K.s0) * k); L.s.material.opacity = k > 0.65 ? (1 - k) / 0.35 : 1;
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const B = this.bolts[i], k = (B.t += dt) / B.life;
      if (k >= 1) { this.root.remove(B.m); B.m.traverse?.(o => { if (o.userData?.dispose) o.userData.dispose(); else { if (!o.userData?.fxKind) o.geometry?.dispose?.(); o.material?.dispose?.(); } }); this.bolts.splice(i, 1); continue; } // efeito de shader: a geometria e dividida (so o material sai)
      if (B.set) { B.follow?.(); B.set(k); continue; }
      if (B.card) { const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 5); B.card.material.opacity = a; B.beam.opacity = 0.3 * a; B.card.scale.setScalar(1.5 * (0.75 + 0.25 * Math.min(1, k * 7))); }
      else B.m.material.opacity = 1 - k;
    }
  }
  clear() { for (const L of this.live) this.root.remove(L.s); this.free.push(...this.live.map(L => L.s)); this.live = []; for (const B of this.bolts) this.root.remove(B.m); this.bolts = []; }
  dispose() { this.clear(); this.scene.remove(this.root); }
}
