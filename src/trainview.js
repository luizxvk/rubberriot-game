// Roubo ao Trem (19/11 b, pedido dele: "animacao do trem bem detalhada"). O trem do Expresso Dourado chega pelo tunel oeste, freia
// na estacao, abre as portas, fecha e parte pro tunel leste. Corpo = public/models/maps/expresso_trem.glb (Blender, mapa.py TRAIN=1,
// sem as pecas que mexem). Pecas que se mexem sao do jogo: rodas (giram pela distancia andada), biela e manivela da locomotiva,
// portas (deslizam), farol, fumaca da chamine (forte arrancando, leve parado), vapor dos cilindros e faisca no freio, balanco.
// Estado vem do servidor (snapshot heist.tr = [estado, x]); x e suavizado aqui. Geometrias e materiais compartilhados (um trem so).
import * as THREE from 'three';
import { ink, toon, outlineInstanced, geo } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mapModel } from './world.js';
import { trainSets, TR } from '../shared/heist.js';

const WHEEL = new Map(); // raio -> geometria (cilindro em pe no eixo z)
const wheelGeo = (r) => WHEEL.get(r) || WHEEL.set(r, new THREE.CylinderGeometry(r, r, 0.13, 18).rotateX(Math.PI / 2)).get(r);
let GLOW = null;
function glowTex() {
  if (GLOW) return GLOW;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.35, 'rgba(255,220,140,0.6)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (GLOW = new THREE.CanvasTexture(c));
}

export class TrainView {
  constructor(scene, M) {
    this.scene = scene; this.M = M; this.root = new THREE.Group(); this.root.name = 'trem'; scene.add(this.root);
    this.body = new THREE.Group(); this.root.add(this.body); // balanca (o root anda)
    this.x = null; this.v = 0; this.rot = 0; this.st = -1; this.doorK = 0; this.smokeT = 0; this.sparkT = 0; this.t = 0;
    mapModel('expresso_trem.glb').then(g => { if (g && this.root.parent) this.body.add(g.clone()); });
    this.buildWheels(); this.buildDoors(); this.buildLights();
    this.root.visible = false;
  }

  // rodas em INSTANCIAS (uma malha por tamanho: aro com contorno + raios com cubo): 44 rodas em ~9 chamadas de desenho
  buildWheels() {
    const iron = 0x2a2724, red = 0x9a3226;
    this.wheels = []; this.rods = [];
    const add = (x, z, r, col = iron) => { const w = { position: new THREE.Vector3(x, r + 0.18, z), r, col }; this.wheels.push(w); return w; };
    const bogie = (xc) => { for (const dx of [-0.75, 0.75]) for (const z of [-0.82, 0.82]) add(xc + dx, z, 0.42); };
    for (const b of trainSets(this.M).open) {
      if (b.kind !== 'tchassis') continue;
      const x0 = b.min[0], x1 = b.max[0], w = x1 - x0, sk = b.skin;
      if (sk === 'loco') {
        for (const x of [29.6, 31.4, 33.2]) for (const z of [-1.0, 1.0]) add(x, z, 0.62, red);
        for (const x of [35.6, 36.6]) for (const z of [-0.82, 0.82]) add(x, z, 0.38);
        bogie(24.8);
        // biela: barra que liga as 3 rodas motrizes de cada lado, presa fora do centro (sobe e desce em circulo)
        for (const z of [-1.12, 1.12]) { const rod = ink(geo(THREE.BoxGeometry, 3.8, 0.1, 0.06), 0x8a857c, 0.006); rod.position.set(31.4, 0.8, z); this.body.add(rod); this.rods.push(rod); }
        for (const z of [-1.18, 1.18]) { const pis = ink(geo(THREE.BoxGeometry, 1.4, 0.08, 0.05), 0xc9a04a, 0.006); pis.position.set(34.6, 0.82, z); pis.userData.piston = 1; this.body.add(pis); this.rods.push(pis); }
      } else if (w >= 5) { bogie(x0 + 2.0); bogie(x1 - 2.0); } else bogie((x0 + x1) / 2);
    }
    // agrupa por tamanho e cor: aro (com contorno) e raios+cubo (sem) em InstancedMesh
    const groups = new Map();
    for (const w of this.wheels) { const k = w.r + '|' + w.col; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(w); }
    this.inst = [];
    for (const list of groups.values()) {
      const { r, col } = list[0];
      const spokes = mergeGeometries([0, 1, 2].map(i => new THREE.BoxGeometry(r * 1.7, r * 0.14, 0.16).rotateZ(i * Math.PI / 3)).concat([new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.2, 10).rotateX(Math.PI / 2)]));
      const rim = new THREE.InstancedMesh(wheelGeo(r), toon(col), list.length), sp = new THREE.InstancedMesh(spokes, toon(col === red ? 0x6e2a20 : 0x5a5650), list.length);
      for (const m of [rim, sp]) { m.frustumCulled = false; this.body.add(m); }
      this.body.add(outlineInstanced(rim, 0.012));
      this.inst.push({ list, rim, sp });
    }
    this.mat4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.one = new THREE.Vector3(1, 1, 1); this.zAx = new THREE.Vector3(0, 0, 1);
    this.spinWheels();
  }
  spinWheels() {
    for (const { list, rim, sp } of this.inst) {
      list.forEach((w, i) => { this.q.setFromAxisAngle(this.zAx, -this.rot / w.r); this.mat4.compose(w.position, this.q, this.one); rim.setMatrixAt(i, this.mat4); sp.setMatrixAt(i, this.mat4); });
      rim.instanceMatrix.needsUpdate = true; sp.instanceMatrix.needsUpdate = true;
    }
  }

  // portas: painel de madeira escura com janelinha, em INSTANCIAS por tamanho (23 portas em poucas chamadas). As do lado deslizam
  // pra dentro da parede, as da ponta pro lado
  buildDoors() {
    this.doors = []; const groups = new Map();
    for (const d of this.M.trainDoors || []) {
      const w = +(d.max[0] - d.min[0]).toFixed(2), h = +(d.max[1] - d.min[1]).toFixed(2), dz = +(d.max[2] - d.min[2]).toFixed(2), side = w > dz;
      const door = { home: new THREE.Vector3((d.min[0] + d.max[0]) / 2, d.min[1] + h / 2, (d.min[2] + d.max[2]) / 2), slide: side ? new THREE.Vector3(-(w - 0.15), 0, 0) : new THREE.Vector3(0, 0, -(dz - 0.1)) };
      const k = w + '|' + h + '|' + dz; if (!groups.has(k)) groups.set(k, { w, h, dz, side, list: [] }); groups.get(k).list.push(door); this.doors.push(door);
    }
    this.doorInst = [];
    for (const g of groups.values()) {
      const pane = new THREE.BoxGeometry(g.side ? g.w - 0.04 : 0.12, g.h - 0.03, g.side ? 0.12 : g.dz - 0.04);
      const win = new THREE.BoxGeometry(g.side ? g.w * 0.5 : 0.14, g.h * 0.28, g.side ? 0.14 : g.dz * 0.5).translate(0, g.h * 0.22, 0);
      const P = new THREE.InstancedMesh(pane, toon(0x5a3d2a), g.list.length), Wn = new THREE.InstancedMesh(win, toon(0x2b3440), g.list.length);
      for (const m of [P, Wn]) { m.frustumCulled = false; this.body.add(m); }
      this.body.add(outlineInstanced(P, 0.01));
      this.doorInst.push({ list: g.list, P, Wn });
    }
    this.placeDoors(0);
  }
  placeDoors(e) {
    const m = this.mat4 || (this.mat4 = new THREE.Matrix4()), v = new THREE.Vector3();
    for (const { list, P, Wn } of this.doorInst) {
      list.forEach((d, i) => { v.copy(d.home).addScaledVector(d.slide, e); m.makeTranslation(v.x, v.y, v.z); P.setMatrixAt(i, m); Wn.setMatrixAt(i, m); });
      P.instanceMatrix.needsUpdate = true; Wn.instanceMatrix.needsUpdate = true;
    }
  }

  buildLights() {
    this.lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff1d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
    this.lamp.position.set(37.3, 3.4, 0); this.lamp.scale.set(2.6, 2.6, 1); this.body.add(this.lamp);
  }

  // H = heist do snapshot; fx/audio do jogo. Chamado todo quadro com o trem no mapa
  update(dt, H, fx, audio, camPos) {
    if (!H?.tr) { this.root.visible = false; return; }
    const [st, tx] = H.tr; this.t += dt;
    if (this.x == null || Math.abs(tx - this.x) > 30) this.x = tx; // primeiro quadro ou rodada nova: pula direto
    const prev = this.x; this.x += (tx - this.x) * Math.min(1, dt * 10);
    const vNow = dt > 0 ? (this.x - prev) / dt : 0; this.v += (vNow - this.v) * Math.min(1, dt * 6);
    this.root.position.x = this.x;
    this.root.visible = Math.abs(this.x) < 80.5; // dentro do tunel (escondido) nao desenha
    if (!this.root.visible) { this.st = st; return; }
    const sp = Math.abs(this.v);
    // rodas giram pela distancia (r = raio); biela gira com as motrizes
    this.rot += (this.x - prev);
    if (this.x !== prev) this.spinWheels();
    const a = -this.rot / 0.62;
    for (const r of this.rods) { if (r.userData.piston) { r.position.x = 34.6 + Math.cos(a) * 0.32; } else { r.position.x = 31.4 + Math.cos(a) * 0.3; r.position.y = 0.8 + Math.sin(a) * 0.3; } }
    // balanco: andando, sobe e desce um tico e balanca de lado; parado, quase nada
    const k = Math.min(1, sp / 8);
    this.body.position.y = Math.sin(this.t * 13) * 0.02 * k; this.body.rotation.x = Math.sin(this.t * 2.7) * 0.006 * k;
    // portas: abrem 0,9 s depois de parar; fecham no aviso
    const want = st === TR.open ? 1 : 0; this.doorK += Math.sign(want - this.doorK) * Math.min(Math.abs(want - this.doorK), dt / 0.9);
    const e = this.doorK * this.doorK * (3 - 2 * this.doorK);
    if (e !== this.doorE) { this.doorE = e; this.placeDoors(e); }
    // farol: aceso andando e na estacao, pisca leve
    this.lamp.material.opacity = 0.65 + Math.sin(this.t * 9) * 0.05 + k * 0.25;
    // fumaca da chamine (mundo): ritmo das baforadas acompanha a roda; parado solta pouca
    const W = (lx, ly, lz) => [lx + this.x, ly + this.body.position.y, lz];
    this.smokeT -= dt;
    const puffEvery = sp > 0.5 ? Math.max(0.09, 0.55 - sp * 0.04) : 0.7;
    if (this.smokeT <= 0 && fx) { this.smokeT = puffEvery; fx.puff(W(36, 5.7, 0), sp > 0.5 ? 3 : 1, sp > 0.5 ? 0.55 : 0.35, 0xe8e2d6, sp > 0.5 ? 1.1 : 1.6); }
    // freando (chegando, ultimos metros) e arrancando: vapor nos cilindros e faisca nas rodas
    const braking = st === TR.arrive && this.x > -18, starting = st === TR.leave && this.x < 6;
    this.sparkT -= dt;
    if ((braking || starting) && this.sparkT <= 0 && fx) {
      this.sparkT = 0.08;
      for (const z of [-1.3, 1.3]) fx.puff(W(37.2, 0.5, z), 1, 0.4, 0xf4f1e8, 0.7);
      if (braking) { const w = this.wheels[(Math.random() * this.wheels.length) | 0]; fx.puff(W(w.position.x, 0.2, w.position.z * 1.25), 1, 0.12, 0xffc24a, 0.25); }
    }
    // sons: mudanca de estado
    if (st !== this.st && audio) {
      const at = [this.x + 30, 2, 0];
      if (st === TR.arrive) { audio.play('trainwhistle', { pos: [-38, 3, 0], vol: 0.9, key: 'trainhorn', max: 1 }); audio.play('train_chug', { pos: [-30, 2, 0], vol: 0.8, key: 'trainchug', max: 1 }); this.brakeOn = false; }
      if (st === TR.open) { audio.play('train_door_open', { pos: [0, 2, 3], vol: 0.8 }); audio.play('train_bell', { pos: [0, 4, 8], vol: 0.6 }); }
      if (st === TR.closing) { audio.play('train_bell', { pos: [0, 4, 8], vol: 0.7 }); audio.play('trainwhistle', { pos: at, vol: 0.8, key: 'trainhorn', max: 1 }); setTimeout(() => audio.play('train_door_close', { pos: [0, 2, 3], vol: 0.8 }), 700); }
      if (st === TR.leave) audio.play('train_depart', { pos: at, vol: 0.85, key: 'trainchug', max: 1 });
      this.st = st;
    }
    if (braking && !this.brakeOn && audio) { this.brakeOn = true; audio.play('train_brake', { pos: [this.x + 20, 1, 0], vol: 0.85 }); }
  }

  dispose() { this.root.parent?.remove(this.root); this.lamp.material.dispose(); for (const i of this.inst || []) { i.sp.geometry.dispose(); i.rim.dispose(); i.sp.dispose(); } for (const i of this.doorInst || []) { i.P.geometry.dispose(); i.Wn.geometry.dispose(); i.P.dispose(); i.Wn.dispose(); } }
}
