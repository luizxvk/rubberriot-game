// Escolta na tela: trilho com dormentes, portais dos pontos de controle, garagem no fim e o Bonde da Tinta
// (bonde de desenho com uma lata de tinta gigante no teto). O circulo no chao em volta do bonde mostra o raio
// que conta e muda de cor pelo estado: vermelho empurrando, listrado contestado, cinza parado, azul voltando.
import * as THREE from 'three';
import { ink, toon, PAL, hatchTexture } from './toon.js';
import { trackOf, trackAt, ESCORT } from '../shared/escort.js';
import { floorAt } from '../shared/nav.js';

const CREAM = 0xe9dcc0;
function tram() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, col, x, y, z, th = 0.04) => { const m = ink(geo, col, th); m.position.set(x, y, z); body.add(m); return m; };
  // chassi, saia vermelha, corpo creme, faixa, teto arredondado
  add(new THREE.BoxGeometry(2.3, 0.35, 5.4), PAL.ink, 0, 0.55, 0, 0.03);
  add(new THREE.BoxGeometry(2.2, 0.7, 5.2), PAL.red, 0, 1.05, 0);
  add(new THREE.BoxGeometry(2.1, 1.25, 5.0), CREAM, 0, 2.0, 0);
  add(new THREE.BoxGeometry(2.14, 0.16, 5.04), PAL.red, 0, 1.5, 0, 0.02);
  add(new THREE.BoxGeometry(2.36, 0.22, 5.36), PAL.dark, 0, 2.73, 0, 0.03); add(new THREE.BoxGeometry(1.7, 0.18, 4.6), PAL.dark, 0, 2.92, 0, 0.02); // teto com beiral + lanternim
  // janelas dos dois lados e da frente/tras
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.05, 0.62, 0.86), PAL.ink, s * 1.06, 2.12, -1.7 + i * 1.13, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(1.5, 0.6, 0.05), PAL.ink, 0, 2.12, s * 2.51, 0);
  // farol, numero, pantografo (a vara que toca o fio)
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 12), 0xfff3b0, 0, 1.05, s * 2.62, 0.02).rotation.x = Math.PI / 2;
  const pole = add(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), PAL.ink, 0, 3.6, -0.8, 0); pole.rotation.x = -0.6;
  // lata de tinta gigante no teto, com a tinta escorrendo
  add(new THREE.CylinderGeometry(0.85, 0.85, 1.1, 18), PAL.light, 0, 3.4, 0.6, 0.04);
  add(new THREE.CylinderGeometry(0.78, 0.78, 0.08, 18), PAL.red, 0, 3.97, 0.6, 0.02);
  for (const [a, h] of [[0.4, 0.7], [2.1, 0.5], [3.8, 0.85], [5.2, 0.4]]) add(new THREE.CapsuleGeometry(0.1, h, 3, 6), PAL.red, Math.cos(a) * 0.86, 3.7 - h / 2, 0.6 + Math.sin(a) * 0.86, 0.015);
  // rodas (giram com o bonde)
  const wheels = [];
  for (const z of [-1.7, 1.7]) for (const s of [-1, 1]) { const w = ink(new THREE.CylinderGeometry(0.42, 0.42, 0.22, 14), PAL.dark, 0.03); w.rotation.z = Math.PI / 2; w.position.set(s * 1.0, 0.42, z); g.add(w); wheels.push(w); }
  g.userData = { body, wheels };
  return g;
}

export class EscortView {
  constructor(scene, M) {
    this.M = M; this.root = new THREE.Group(); scene.add(this.root);
    const T = trackOf(M);
    // rua de paralelepipedo acompanhando o trilho (cada trecho + um disco na curva)
    const roadTex = hatchTexture('#e6e1d5', '#a39b8e', { density: 14, cross: true }); roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    const roadMat = toon(0xffffff, { map: roadTex, unique: true });
    for (let i = 1; i < M.track.length; i++) {
      const [ax, az] = M.track[i - 1], [bx, bz] = M.track[i], L = Math.hypot(bx - ax, bz - az);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(9, L), roadMat); r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.atan2(bx - ax, bz - az);
      r.position.set((ax + bx) / 2, 0.015, (az + bz) / 2); this.root.add(r);
      const j = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), roadMat); j.rotation.x = -Math.PI / 2; j.position.set(bx, 0.016, bz); this.root.add(j);
    }
    // trilho: dois riscos escuros + dormentes de madeira a cada 1,2 m
    const sleeper = new THREE.BoxGeometry(2.4, 0.08, 0.3), rail = new THREE.BoxGeometry(0.12, 0.1, 1);
    const sm = toon(PAL.wood), rm = toon(PAL.ink);
    const nS = Math.floor(T.len / 1.2);
    const sleepers = new THREE.InstancedMesh(sleeper, sm, nS), rails = new THREE.InstancedMesh(rail, rm, nS * 2);
    const o = new THREE.Object3D();
    for (let i = 0; i < nS; i++) {
      const p = trackAt(M, i * 1.2 + 0.6), y = floorAt(M, p.x, p.z) + 0.04;
      o.position.set(p.x, y, p.z); o.rotation.set(0, p.yaw + Math.PI / 2, 0); o.scale.set(1, 1, 1); o.updateMatrix(); sleepers.setMatrixAt(i, o.matrix);
      for (const s of [-1, 1]) { o.position.set(p.x + Math.cos(p.yaw) * s * 0.75, y + 0.08, p.z - Math.sin(p.yaw) * s * 0.75); o.rotation.set(0, p.yaw, 0); o.scale.set(1, 1, 1.25); o.updateMatrix(); rails.setMatrixAt(i * 2 + (s > 0), o.matrix); }
    }
    this.root.add(sleepers, rails);
    // portais dos pontos de controle (arco com placa) e a garagem no fim
    const gate = (d, col, label) => {
      const p = trackAt(M, d), g = new THREE.Group(), y = floorAt(M, p.x, p.z);
      g.position.set(p.x, y, p.z); g.rotation.y = p.yaw;
      for (const s of [-1, 1]) { const c = ink(new THREE.BoxGeometry(0.35, 5, 0.35), PAL.ink, 0.03); c.position.set(s * 2.8, 2.5, 0); g.add(c); }
      const top = ink(new THREE.BoxGeometry(6, 0.6, 0.4), col, 0.04); top.position.y = 5.1; g.add(top);
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(label, col), transparent: true }));
      sign.scale.set(3.2, 1.1, 1); sign.position.y = 6.2; g.add(sign);
      this.root.add(g); return g;
    };
    this.gates = M.checks.map((f, i) => gate(f * T.len, PAL.paper, String.fromCharCode(65 + i)));
    gate(T.len, PAL.blue, 'FIM');
    // bonde + circulo do raio
    this.tram = tram(); this.root.add(this.tram);
    this.ringMat = new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(ESCORT.r - 0.3, ESCORT.r, 48), this.ringMat); this.ring.rotation.x = -Math.PI / 2; this.root.add(this.ring);
    this.d = 0; this.spin = 0;
  }
  update(t, dt, esc) {
    if (!esc) return;
    const prev = this.d;
    this.d += (esc.d - this.d) * Math.min(1, dt * 5); // o snapshot chega 20x/s: suaviza
    const p = trackAt(this.M, this.d), y = floorAt(this.M, p.x, p.z);
    this.tram.position.set(p.x, y, p.z);
    const dy = p.yaw - this.tram.rotation.y; this.tram.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * Math.min(1, dt * 4);
    this.spin += (this.d - prev) / 0.42;
    for (const w of this.tram.userData.wheels) w.rotation.x = this.spin;
    // empurrando: o bonde balanca de leve
    const moving = esc.state === 'push' || esc.state === 'back';
    this.tram.userData.body.rotation.z = moving ? Math.sin(t * 9) * 0.015 : 0;
    this.ring.position.set(p.x, y + 0.06, p.z);
    const col = esc.state === 'push' ? PAL.red : esc.state === 'back' ? PAL.blue : esc.state === 'contest' ? (Math.sin(t * 10) > 0 ? PAL.red : PAL.blue) : PAL.mid;
    this.ringMat.color.setHex(col);
  }
  dispose() { this.root.parent?.remove(this.root); }
}

function labelTex(txt, col) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 88;
  const x = c.getContext('2d');
  x.fillStyle = '#ece9e1'; x.strokeStyle = '#1b1916'; x.lineWidth = 8;
  x.beginPath(); x.roundRect(6, 6, 244, 76, 16); x.fill(); x.stroke();
  x.fillStyle = col === PAL.blue ? '#2f5b8a' : '#1b1916'; x.font = '900 54px "Archivo Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(txt, 128, 48);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
