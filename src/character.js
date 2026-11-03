// Borrao: personagem rubber hose original. Membros sao mangueiras (tubo curvo
// recalculado por frame), luvas brancas, olhos de fatia de torta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ink, toon, PAL, wordTexture } from './toon.js';
import { buildGun, disposeGun } from './arsenal.js';
import { cleanLook } from '../shared/looks.js';
import { eyeTex, buildEyewear, buildHat, styleGlove, patternTex, buildFx, skinMat, antiFlicker } from './looks3d.js';

const SEG = 10, RAD = 6;

// Tubo bezier quadratico: start -> ctrl -> end. Atualiza vertices na mao.
export class Hose {
  constructor(radius, color, outlineTh = 0.035) {
    this.r = radius;
    const count = (SEG + 1) * RAD;
    const pos = new Float32Array(count * 3);
    const idx = [];
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = (i + 1) * RAD + j, d = (i + 1) * RAD + (j + 1) % RAD;
      idx.push(a, c, b, b, c, d);
    }
    const mk = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      g.setIndex(idx);
      return g;
    };
    this.mesh = new THREE.Mesh(mk(), toon(color));
    this.line = new THREE.Mesh(mk(), new THREE.MeshBasicMaterial({ color: 0x110f0d, side: THREE.BackSide }));
    this.outTh = outlineTh;
    this.mesh.frustumCulled = this.line.frustumCulled = false;
    this.mesh.add(this.line);
  }

  set(a, c, b) {
    const P = this.mesh.geometry.attributes.position.array, N = this.mesh.geometry.attributes.normal.array;
    const PO = this.line.geometry.attributes.position.array;
    const p = new THREE.Vector3(), t = new THREE.Vector3(), n = new THREE.Vector3(), bn = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, iu = 1 - u;
      p.set(iu * iu * a.x + 2 * iu * u * c.x + u * u * b.x, iu * iu * a.y + 2 * iu * u * c.y + u * u * b.y, iu * iu * a.z + 2 * iu * u * c.z + u * u * b.z);
      t.set(2 * iu * (c.x - a.x) + 2 * u * (b.x - c.x), 2 * iu * (c.y - a.y) + 2 * u * (b.y - c.y), 2 * iu * (c.z - a.z) + 2 * u * (b.z - c.z)).normalize();
      n.crossVectors(t, Math.abs(t.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
      bn.crossVectors(t, n);
      // mangueira afina um tiquinho no meio (cara de borracha)
      const r = this.r * (1 - Math.sin(u * Math.PI) * 0.12);
      for (let j = 0; j < RAD; j++) {
        const ang = (j / RAD) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
        const k = (i * RAD + j) * 3;
        const nx = n.x * cs + bn.x * sn, ny = n.y * cs + bn.y * sn, nz = n.z * cs + bn.z * sn;
        P[k] = p.x + nx * r; P[k + 1] = p.y + ny * r; P[k + 2] = p.z + nz * r;
        N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
        const ro = r + this.outTh;
        PO[k] = p.x + nx * ro; PO[k + 1] = p.y + ny * ro; PO[k + 2] = p.z + nz * ro;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    this.line.geometry.attributes.position.needsUpdate = true;
  }
}

function eyeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#faf8f2';
  g.beginPath(); g.ellipse(128, 64, 120, 60, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#141210';
  for (const x of [80, 176]) {
    g.beginPath(); g.ellipse(x, 66, 26, 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#faf8f2';
    g.beginPath(); g.moveTo(x + 4, 52); g.lineTo(x + 18, 30); g.lineTo(x + 22, 52); g.fill();
    g.fillStyle = '#141210';
  }
  // boca sorrindo
  g.lineWidth = 8; g.strokeStyle = '#141210';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let EYE = null;
// material do olho por estilo (um so por estilo pra todos os bonecos)
const EYEMAT = new Map();
function eyeMat(style) {
  if (!EYEMAT.has(style)) EYEMAT.set(style, new THREE.MeshBasicMaterial({ map: style === 'classic' ? (EYE ||= eyeTexture()) : eyeTex(style), transparent: true }));
  return EYEMAT.get(style);
}
// listras da lona do paraquedas
let STRIPE = null;
// geometria e material fixos do boneco: uma copia so pra todos (50 bonecos no battle royale = 50x menos memoria
// nessas pecas; o contorno ja e por geometria, entao vem junto). Ninguem descarta essas pecas.
const SHARED = new Map();
function shared(key, make) { let v = SHARED.get(key); if (!v) { v = make(); SHARED.set(key, v); } return v; }
// luva inteira numa geometria (esfera + punho + aro + dedos), mesmas medidas das pecas soltas de antes
function gloveGeo(fingers) {
  return shared('gloveGeo' + fingers, () => {
    const parts = [new THREE.SphereGeometry(0.12, 12, 10)], o = new THREE.Object3D();
    const add = (geo, p, r = [0, 0, 0]) => { o.position.set(...p); o.rotation.set(...r); o.updateMatrix(); parts.push(geo.applyMatrix4(o.matrix)); };
    add(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10), [0, 0.12, 0]);
    add(new THREE.TorusGeometry(0.13, 0.022, 6, 14), [0, 0.16, 0], [Math.PI / 2, 0, 0]);
    if (fingers) {
      for (let i = 0; i < 3; i++) add(new THREE.CapsuleGeometry(0.042, 0.06, 3, 8), [-0.07 + i * 0.07, -0.03, -0.11], [-1.1, 0, 0]);
      add(new THREE.CapsuleGeometry(0.04, 0.05, 3, 8), [0.11, 0, -0.04], [0, 0, -0.9]);
    }
    const g = mergeGeometries(parts); parts.forEach(p => p.dispose());
    return g;
  });
}
function stripeTex() {
  if (STRIPE) return STRIPE;
  const c = document.createElement('canvas'); c.width = 256; c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ece9e1' : '#a83a2c'; g.fillRect(i * 32, 0, 32, 16); }
  STRIPE = new THREE.CanvasTexture(c); STRIPE.colorSpace = THREE.SRGBColorSpace;
  return STRIPE;
}

// a partir daqui (m) o boneco perde os detalhes pequenos
const LOD_FAR = 18;

export class Character {
  constructor(team, name, look = null) {
    EYE ||= eyeTexture();
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // tudo que faz squash
    this.root.add(this.body);
    const teamCol = team === 'red' ? PAL.red : team === 'blue' ? PAL.blue : PAL.mid;
    this.teamCol = teamCol;

    const torso = ink(shared(`new THREE.SphereGeometry(0.42, 16, 12)`, () => new THREE.SphereGeometry(0.42, 16, 12)), PAL.ink, 0.03);
    torso.scale.set(1, 1.15, 0.9); torso.position.y = 1.05;
    this.body.add(torso); this.torso = torso;
    const shorts = ink(shared(`new THREE.SphereGeometry(0.44, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45)`, () => new THREE.SphereGeometry(0.44, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45)), teamCol, 0.03);
    shorts.scale.set(1, 1.15, 0.92); shorts.position.y = 1.05;
    this.body.add(shorts); this.shorts = shorts;
    for (const s of [-1, 1]) {
      const btn = ink(shared(`new THREE.SphereGeometry(0.06, 8, 6)`, () => new THREE.SphereGeometry(0.06, 8, 6)), PAL.white, 0.015);
      btn.position.set(s * 0.15, 0.82, -0.36); btn.userData.detail = true;
      this.body.add(btn);
    }
    this.head = new THREE.Group();
    this.head.position.y = 1.62;
    this.body.add(this.head);
    const skull = ink(shared(`new THREE.SphereGeometry(0.36, 18, 14)`, () => new THREE.SphereGeometry(0.36, 18, 14)), PAL.ink, 0.03);
    this.head.add(skull); this.skull = skull;
    const mask = ink(shared(`new THREE.SphereGeometry(0.3, 16, 12)`, () => new THREE.SphereGeometry(0.3, 16, 12)), 0xf0ebe0, 0.015);
    mask.position.set(0, -0.06, -0.14); mask.scale.set(1.05, 0.85, 0.8);
    this.head.add(mask);
    const eyes = new THREE.Mesh(shared(`new THREE.PlaneGeometry(0.42, 0.21)`, () => new THREE.PlaneGeometry(0.42, 0.21)), new THREE.MeshBasicMaterial({ map: EYE, transparent: true }));
    eyes.position.set(0, 0.04, -0.37); eyes.rotation.y = Math.PI;
    this.head.add(eyes); this.eyes = eyes;
    const nose = ink(shared(`new THREE.SphereGeometry(0.075, 10, 8)`, () => new THREE.SphereGeometry(0.075, 10, 8)), PAL.ink, 0.012);
    nose.position.set(0, -0.08, -0.38); nose.scale.set(1.3, 1, 1); nose.userData.detail = true;
    this.head.add(nose);
    const mouth = ink(shared(`new THREE.TorusGeometry(0.11, 0.022, 6, 12, Math.PI)`, () => new THREE.TorusGeometry(0.11, 0.022, 6, 12, Math.PI)), PAL.ink, 0);
    mouth.position.set(0, -0.17, -0.33); mouth.rotation.set(0, 0, Math.PI); mouth.userData.detail = true;
    this.head.add(mouth);
    // topete de tinta enrolado (nada de orelha de rato)
    const curl = [];
    for (let i = 0; i <= 10; i++) { const a = i * 0.55; curl.push(new THREE.Vector3(Math.cos(a) * 0.12 * (1 - i / 14), 0.3 + i * 0.03, Math.sin(a) * 0.12 * (1 - i / 14) + 0.05)); }
    const curlM = ink(shared(`new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 20, 0.045, 6)`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 20, 0.045, 6)), PAL.ink, 0.015); curlM.userData.detail = true;
    this.head.add(curlM); this.curl = curlM;
    // chapeu, oculos, luvas, camisa, estampa e efeito: setLook (no fim do construtor)
    this.hat = null; this.eyewear = null; this.fx = null;

    this.armR = new Hose(0.072, PAL.ink); this.armL = new Hose(0.072, PAL.ink); // 03/11: braco um tico mais grosso e luva menor (a mao parecia gigante)
    this.legR = new Hose(0.075, PAL.ink); this.legL = new Hose(0.075, PAL.ink);
    for (const h of [this.armR, this.armL, this.legR, this.legL]) this.body.add(h.mesh);
    const glove = () => {
      // 03/11 (desempenho): luva + punho + aro + 3 dedos + polegar numa geometria so (era 7 malhas + 7 contornos
      // = 14 chamadas de desenho por mao; agora 2). Versao com e sem dedos (mitten/oven/boxing), compartilhadas
      const g = ink(gloveGeo(true), PAL.white, 0.02);
      g.userData.fingerGeo = [gloveGeo(true), gloveGeo(false)];
      // estilo Mickey (01/11): mao menos redonda, 3 dedos gordos na frente + polegar e punho em sino com borda
      g.scale.set(1.05 * 0.78, 0.82 * 0.78, 0.78); // 78% (03/11): proporcional ao braco
      return g;
    };
    this.handR = glove(); this.handL = glove();
    this.body.add(this.handR, this.handL);
    const shoe = () => { const s = ink(shared(`new THREE.SphereGeometry(0.17, 12, 10)`, () => new THREE.SphereGeometry(0.17, 12, 10)), 0x4a4540, 0.03); s.scale.set(1, 0.6, 1.6); return s; };
    this.shoeR = shoe(); this.shoeL = shoe();
    this.body.add(this.shoeR, this.shoeL);

    // paraquedas (bate-volta): lona listrada vermelho/papel com 4 cordas; so aparece com anim 'chute'
    this.chute = new THREE.Group();
    const can = new THREE.Mesh(shared(`new THREE.SphereGeometry(1.6, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.42)`, () => new THREE.SphereGeometry(1.6, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.42)), shared('mat:canopy', () => new THREE.MeshBasicMaterial({ map: stripeTex(), side: THREE.DoubleSide })));
    can.scale.set(1, 0.55, 1); can.position.y = 2.6; this.chute.add(can);
    const ln = shared('mat:cord', () => new THREE.MeshBasicMaterial({ color: 0x141210 }));
    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const cord = new THREE.Mesh(shared(`new THREE.CylinderGeometry(0.012, 0.012, 2.05, 4)`, () => new THREE.CylinderGeometry(0.012, 0.012, 2.05, 4)), ln);
      cord.position.set(x * 0.55, 2.35, z * 0.55); cord.rotation.set(z * 0.42, 0, -x * 0.42); this.chute.add(cord);
    }
    this.chute.position.y = 0.9; this.chute.visible = false;
    this.body.add(this.chute);

    this.gunHolder = new THREE.Group();
    this.body.add(this.gunHolder);
    this.wpn = null;

    // sombra de bolha
    const sh = new THREE.Mesh(shared(`new THREE.CircleGeometry(0.55, 16)`, () => new THREE.CircleGeometry(0.55, 16)), shared('mat:shadow', () => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    this.root.add(sh);
    this.shadow = sh;

    // nome
    this.tagName = name; this.tagFill = team === 'red' ? '#e0a49a' : team === 'blue' ? '#a8c0dc' : '#faf8f2';
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(name, { burst: false, size: 256, fill: this.tagFill }), transparent: true, depthTest: false }));
    this.tag.scale.set(1.5, 1.5, 1); this.tag.position.y = 2.55; this.tag.renderOrder = 5;
    this.root.add(this.tag);

    this.phase = Math.random() * 10;
    this.deadT = 0;
    // detalhe que de longe nem aparece (botao, nariz, boca, topete, fita, punho): some a partir de LOD_FAR
    this.details = []; this.body.traverse(o => { if (o.userData.detail) this.details.push(o); });
    this.far = false;
    this.v = new THREE.Vector3();
    this.setLook(look);
  }

  // visual do jogador (shared/looks.js). Troca na hora, inclusive no meio da partida.
  setLook(look) {
    const L = cleanLook(look);
    this.look = L;
    const tc = this.teamCol, hx = (c) => parseInt(c.slice(1), 16);
    this.torso.material = skinMat(L.skin) || toon(hx(L.shirt)); // skin animada (Loja) cobre a camisa
    // ...e o corpo preto todo: cabeca, topete, bracos, pernas e sapatos (rosto, luvas e short do time ficam)
    this.baseMat ||= new Map();
    for (const m of [this.skull, this.curl, this.armR.mesh, this.armL.mesh, this.legR.mesh, this.legL.mesh, this.shoeR, this.shoeL]) {
      if (!m) continue;
      if (!this.baseMat.has(m)) this.baseMat.set(m, m.material);
      m.material = skinMat(L.skin) || this.baseMat.get(m);
    }
    // com skin o contorno da mangueira cobria a mangueira inteira (de preto nao dava pra ver): some so com skin
    for (const h of [this.armR, this.armL, this.legR, this.legL]) h.line.visible = !skinMat(L.skin);
    const pt = patternTex(L.pattern);
    this.shorts.material = pt ? toon(tc, { map: pt }) : toon(tc);
    this.eyes.material = eyeMat(L.eyes);
    if (this.eyewear) this.head.remove(this.eyewear);
    this.eyewear = buildEyewear(L.eyes); if (this.eyewear) { antiFlicker(this.eyewear); this.head.add(this.eyewear); }
    if (this.hat) this.head.remove(this.hat);
    this.hat = buildHat(L.hat, tc); if (this.hat) { antiFlicker(this.hat); this.head.add(this.hat); }
    if (this.curl) this.curl.visible = !['bolo', 'tubarao'].includes(L.hat); // chapeu que cobre o topo: o topete atravessava
    styleGlove(this.handR, L.glove, L.gloveCol); styleGlove(this.handL, L.glove, L.gloveCol);
    for (const h of [this.handR, this.handL]) for (const c of h.children) if (c.userData.gloveExtra) antiFlicker(c, 2); // peca extra da luva (polegar, anel...) por cima da luva
    if (this.fx) this.root.remove(this.fx.group);
    this.fx = buildFx(L.fx); if (this.fx) this.root.add(this.fx.group);
    this.details = []; this.body.traverse(o => { if (o.userData.detail) this.details.push(o); });
    if (this.far) for (const o of this.details) o.visible = false;
  }

  setWeapon(id, lo = null) {
    this.wpn = id;
    disposeGun(this.gun); // a arma velha era so deste boneco: libera a pintura (vazava a cada troca)
    this.gunHolder.clear();
    this.gun = buildGun(id, lo);
    if (id === 'melee') this.gun.scale.setScalar(1.6); // faca na mao (01/11): maior pra ler de longe
    this.gunHolder.add(this.gun);
    this.meleeLo = lo?.melee || this.meleeLo || null;
    // akimbo: a segunda pistola vai na mao esquerda (espelho da direita)
    if (this.gun2h) { this.body.remove(this.gun2h); this.gun2h = null; }
    if (lo?.handle === 'akimbo' && id !== 'melee') { this.gun2h = new THREE.Group(); this.gun2h.add(buildGun(id, { ...lo, handle: null })); this.body.add(this.gun2h); }
    // pecas da arma (mira, pente, punho, laser) e os contornos dela: de longe so o corpo da arma
    this.gunDetails = [];
    let body = null, big = 0;
    this.gun.traverse(o => { if (o.isMesh && !o.material?.isShaderMaterial) { o.geometry.computeBoundingSphere?.(); const r = o.geometry.boundingSphere?.radius || 0; if (r > big) { big = r; body = o; } } });
    this.gun.traverse(o => { if (o.isMesh && o !== body && o.parent !== body && !o.userData.noFx && !o.material?.transparent && (o.material?.blending ?? 1) === 1) this.gunDetails.push(o); });
    if (this.far) for (const o of this.gunDetails) o.visible = false;
  }

  // gira a luva pra boca dela (+y) apontar pro braco (do pulso pro ponto de controle da mangueira); dedos (-z) pra
  // frente do boneco. twist = giro extra em volta do pulso (aceno)
  wristAlign(hand, ctrl, twist = 0) {
    const y = ctrl.clone().sub(hand.position).normalize();
    const z = new THREE.Vector3(0, 0, 1); z.addScaledVector(y, -z.dot(y));
    if (z.lengthSq() < 1e-4) z.set(1, 0, 0).addScaledVector(y, -y.x);
    z.normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    hand.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    if (twist) hand.rotateY(twist);
  }

  // nivel de detalhe pela distancia da camera: 16 bonecos x 48 malhas pesavam no celular
  lod(dist) {
    const far = dist > LOD_FAR;
    if (far === this.far) return;
    this.far = far;
    for (const o of this.details) o.visible = !far;
    for (const o of this.gunDetails || []) o.visible = !far;
  }

  // tranco de quem leva tiro: inclina pra tras e amassa (cabeca = mais forte)
  // nome de aliado nitido (pedido dele 30/10): o dobro de resolucao e filtro anisotropico; inimigo fica como esta
  sharpTag(renderer) {
    if (this.sharp) return;
    this.sharp = true;
    const tx = wordTexture(this.tagName, { burst: false, size: 512, fill: this.tagFill });
    tx.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() || 8;
    tx.needsUpdate = true;
    this.tag.material.map = tx; this.tag.material.needsUpdate = true;
  }
  flinch(head) { this.hitT = head ? 0.26 : 0.18; this.hitHead = head; }
  // golpe de lamina visto de fora (01/11): antes os outros nunca mexiam o braco ao esfaquear.
  // Com a faca na mao: corte cruzado da direita pra esquerda. Com arma: a arma desce e a faca rapida sai na mao esquerda.
  swing() {
    this.swingDur = 0.42; this.swingT = this.swingDur; this.punchL = !this.punchL; // soco alterna as maos
    if (this.wpn !== 'melee' && this.wpn !== 'fists' && !this.quickKnife) {
      this.quickKnife = buildGun('melee', null); this.quickKnife.scale.setScalar(1.5); this.quickKnife.visible = false; this.body.add(this.quickKnife);
    }
  }

  update(dt, s) {
    const { anim, pitch = 0, alive, speed = 0, t } = s;
    this.chute.visible = alive && anim === 'chute';
    // visual: efeito em volta (some de longe e morto), helice gira, enfeite balanca
    if (this.fx) { this.fx.group.visible = alive && !this.far; if (this.fx.group.visible) this.fx.tick(dt, t); }
    const hu = this.hat?.userData;
    if (hu?.spin) hu.spin.rotation.y += dt * (anim === 'sprint' || anim === 'run' ? 22 : 9);
    if (hu?.bob) hu.bob.position.y = (hu.bobY ??= hu.bob.position.y) + Math.sin(t * 4 + this.phase) * 0.03;
    if (this.chute.visible) this.chute.rotation.z = Math.sin(t * 1.6 + this.phase) * 0.06;
    // laser dos outros: desligado sempre (03/11, pedido dele: os feixes dos bots/jogadores cruzando a tela
    // atrapalhavam). So o seu aparece (viewmodel + ponto no mundo, igual no multiplayer)
    const lz = this.gun?.userData.laser;
    if (lz) lz.beam.material.uniforms.uOn.value = 0;
    this.phase += dt * (anim === 'tac' ? 15 : anim === 'sprint' ? 12.5 : 10) * Math.min(1, speed / 6 + 0.15);
    const ph = this.phase;
    // deslize e agachar entram e saem amaciados (01/11: o boneco pulava de pe pro deslize num quadro so)
    const ease = (v, to, k) => v + (to - v) * (1 - Math.exp(-k * dt));
    this.slideK = ease(this.slideK || 0, anim === 'slide' ? 1 : 0, anim === 'slide' ? 16 : 9);
    this.crouchK = ease(this.crouchK || 0, anim === 'crouch' || anim === 'slide' ? 0.45 : 0, 14);
    this.leanK = ease(this.leanK || 0, anim === 'sprint' || anim === 'tac' ? -0.25 : anim === 'slide' ? 0.35 : 0, 12);
    const moving = speed > 0.8 && anim !== 'jump' && anim !== 'slide';
    this.walkK = ease(this.walkK || 0, moving ? 1 : 0, 12); // passada some aos poucos (deslize, parar)
    const crouch = this.crouchK;
    // escalada (01/11): corpo pra frente, um joelho sobe na borda, mao esquerda agarrada la em cima, arma abaixada
    this.climbK = ease(this.climbK || 0, anim === 'climb' ? 1 : 0, anim === 'climb' ? 18 : 10);
    const climb = this.climbK;

    if (!alive) {
      // panqueca: achata e gira, depois some numa nuvem (o FX faz a nuvem)
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.25);
      this.body.scale.set(1 + k * 0.8, 1 - k * 0.88, 1 + k * 0.8);
      this.body.rotation.y += dt * 8 * (1 - k);
      this.tag.visible = false;
      this.root.visible = this.deadT < 1.4;
      return;
    }
    this.deadT = 0;
    this.root.visible = true;
    this.tag.visible = true;
    this.body.rotation.y = 0;

    let fl = 0;
    if (this.hitT > 0) { this.hitT -= dt; fl = Math.sin(Math.min(1, this.hitT / 0.2) * Math.PI) * (this.hitHead ? 1.4 : 1); }
    // quique de borracha
    const bounce = moving ? Math.abs(Math.sin(ph)) : (Math.sin(t * 4.4 + this.phase) * 0.5 + 0.5) * 0.3;
    const sq = anim === 'jump' ? 1.12 : 1 + (bounce - 0.5) * 0.08;
    this.body.scale.set(1 / Math.sqrt(sq), sq * (1 - crouch * 0.35), 1 / Math.sqrt(sq));
    this.body.position.y = moving ? bounce * 0.12 : 0;
    this.body.rotation.x = this.leanK + fl * 0.35 - climb * 0.45;
    if (fl) this.body.scale.multiplyScalar(1 - fl * 0.06);
    // dupla: caido de barriga no chao, se arrastando (balanca de leve pra ler de longe)
    if (anim === 'down') { this.body.rotation.x = 1.35 + Math.sin(t * 3 + this.phase) * 0.06; this.body.position.y = 0.32; this.body.rotation.z = Math.sin(t * 2.2) * 0.08; }
    else this.body.rotation.z = 0;
    this.head.rotation.z = fl * 0.3;
    this.head.rotation.x = -pitch * 0.6;

    const hip = 0.72;
    for (const [leg, shoe, side, off] of [[this.legR, this.shoeR, 1, 0], [this.legL, this.shoeL, -1, Math.PI]]) {
      const sk = this.slideK, walk = this.walkK * (1 - sk);
      const sw = Math.sin(ph + off) * walk;
      const lift = Math.max(0, Math.cos(ph + off)) * 0.25 * walk;
      const a = new THREE.Vector3(side * 0.17, hip, 0);
      const footZ = -sw * 0.5 * walk - 0.5 * sk;
      const b = new THREE.Vector3(side * 0.22, 0.1 + lift + (anim === 'jump' ? 0.25 : 0), footZ);
      if (climb) b.lerp(side > 0 ? new THREE.Vector3(0.2, 0.62, -0.42) : new THREE.Vector3(-0.22, 0.12, 0.28), climb); // direita sobe, esquerda empurra
      // joelho de mangueira dobra pra frente
      const c = new THREE.Vector3(side * 0.24, (a.y + b.y) / 2, (a.z + b.z) / 2 - 0.18 - lift * 0.4);
      leg.set(a, c, b);
      shoe.position.set(b.x, b.y - 0.02, b.z - 0.1);
      shoe.rotation.x = sw * 0.3;
    }

    // braco com arma (pose de quem segura de verdade, sobe/desce com o pitch)
    const sprinting = anim === 'sprint' || anim === 'tac';
    const gp = this.gunHolder;
    if (sprinting) {
      gp.position.set(0.18, 1.05 + (anim === 'tac' ? 0.35 : 0), -0.35);
      gp.rotation.set(anim === 'tac' ? 1.1 : -0.6, 0.5, 0.3);
    } else {
      gp.position.set(0.2, 1.22 + crouch * -0.1, -0.42);
      gp.rotation.set(pitch * 0.8, 0, 0);
    }
    if (climb) { gp.position.lerp(new THREE.Vector3(0.32, 0.98, -0.18), climb); gp.rotation.set(gp.rotation.x * (1 - climb) - climb * 1.0, climb * 0.35, climb * 0.4); }
    const knife = this.wpn === 'melee';
    if (knife && !sprinting) { gp.position.set(0.3, 1.28 + crouch * -0.1, -0.32); gp.rotation.set(0.75 + pitch * 0.5, -0.25, -0.2); } // guarda: lamina erguida, de lado (ve de longe)
    let sw = 0, se = 0;
    if (this.swingT > 0) { this.swingT -= dt; const p = 1 - Math.max(0, this.swingT) / this.swingDur; sw = Math.sin(p * Math.PI); se = p * p * (3 - 2 * p); }
    if (sw > 0 && knife) { // corte cruzado: sai alto a direita, atravessa na frente e termina baixo a esquerda
      gp.position.set(0.32 - 0.55 * se, 1.42 - 0.3 * se, -0.32 - 0.38 * sw);
      gp.rotation.set(0.2 - 0.5 * sw, 0.9 - 1.9 * se, -0.6 + 1.0 * se);
    } else if (sw > 0 && this.wpn !== 'fists') gp.position.y -= 0.22 * sw, gp.rotation.x -= 0.7 * sw; // com arma: a arma desce pra faca rapida passar
    gp.updateMatrix();
    const gripR = new THREE.Vector3(), gripL = new THREE.Vector3();
    if (this.gun) {
      gripR.copy(this.gun.userData.gripR.position).applyMatrix4(gp.matrix);
      gripL.copy(this.gun.userData.gripL.position).applyMatrix4(gp.matrix);
    }
    if (this.gun2h) { // espelho do suporte da direita; a mao esquerda vai no cabo dela
      this.gun2h.position.set(-gp.position.x, gp.position.y, gp.position.z);
      this.gun2h.rotation.set(gp.rotation.x, -gp.rotation.y, -gp.rotation.z);
      this.gun2h.updateMatrix();
      gripL.copy(this.gun2h.children[0].userData.gripR.position).applyMatrix4(this.gun2h.matrix);
    }
    const pump = sprinting ? Math.sin(ph) * 0.15 : 0;
    this.handR.position.copy(gripR); this.handR.position.z += pump * 0.3;
    this.handL.position.copy(gripL); this.handL.position.z -= pump * 0.5;
    if (this.wpn === 'fists' && sw > 0) { const h = this.punchL ? this.handL : this.handR; h.position.z -= 0.5 * sw; h.position.y += 0.12 * sw; h.position.x += (this.punchL ? 0.12 : -0.12) * sw; } // soco visto de fora, alternando as maos
    if (this.quickKnife) { // faca rapida na mao esquerda: estocada pra frente e volta
      this.quickKnife.visible = sw > 0.02 && !knife;
      if (this.quickKnife.visible) {
        const hk = new THREE.Vector3(-0.12 + 0.2 * se, 1.3 - 0.05 * sw, -0.3 - 0.55 * sw);
        this.handL.position.copy(hk);
        this.quickKnife.position.copy(hk); this.quickKnife.rotation.set(-0.15 - 0.3 * sw, 0.35 - 0.6 * se, 0);
      }
    }
    if (climb && !this.gun2h) this.handL.position.lerp(new THREE.Vector3(-0.22, 1.72, -0.5), climb);
    const shR = new THREE.Vector3(0.36, 1.32, 0), shL = new THREE.Vector3(-0.36, 1.32, 0);
    if (anim === 'pose') { // vitrine (Visual e Loja, 03/11): sem arma. Ciclo de 8 s com transicao suave:
      // solto (bracos caidos balancando, peso trocando de perna) -> aceno (mao direita ao lado da cabeca, a outra na
      // cintura, cabeca inclina) -> maos na cintura (cotovelo pra fora, peito estufado). A luva gira junto com a pose.
      const tt = s.t || 0, cyc = tt % 8, br = Math.sin(tt * 2.2);
      const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
      const wave = sm(2.2, 2.7, cyc) * (1 - sm(4.4, 4.9, cyc)), hips = sm(4.6, 5.2, cyc) * (1 - sm(7.4, 7.95, cyc)), loose = 1 - Math.max(wave, hips);
      const sway = Math.sin(tt * 1.3), L = (a, b, k) => a + (b - a) * k;
      // mao esquerda: solta -> cintura (no aceno e no maos-na-cintura)
      const hl = Math.max(wave, hips);
      this.handL.position.set(L(-0.47 + sway * 0.02, -0.42, hl), L(0.8 + br * 0.015, 1.02, hl), L(-0.06, 0.1, hl));
      // mao direita: solta -> acenando do lado da cabeca -> cintura
      const wv = Math.sin(tt * 11) * 0.5;
      let rx = L(0.47 - sway * 0.02, 0.42, hips), ry = L(0.8 - br * 0.015, 1.02, hips), rz = L(-0.06, 0.1, hips);
      rx = L(rx, 0.62 + wv * 0.06, wave); ry = L(ry, 1.82, wave); rz = L(rz, -0.08, wave);
      this.handR.position.set(rx, ry, rz);
      // cotovelo: caido perto do corpo -> pra fora na cintura -> alto no aceno
      const cR = new THREE.Vector3(L(L(0.52, 0.72, hips), 0.78, wave), L(L(1.05, 1.16, hips), 1.42, wave), L(0.02, 0.14, Math.max(hips, wave * 0.4)));
      const cL = new THREE.Vector3(L(-0.52, -0.72, hl), L(1.05, 1.16, hl), L(0.02, 0.14, hl));
      this.armR.set(shR, cR, this.handR.position);
      this.armL.set(shL, cL, this.handL.position);
      // luva presa no pulso (03/11, pedido dele): a boca da luva (+y dela) aponta sempre pro braco, na direcao do fim da
      // mangueira; os dedos (-z da luva) ficam pra frente. No aceno a mao balanca girando em volta do pulso.
      this.wristAlign(this.handR, cR, wave * wv * 0.6);
      this.wristAlign(this.handL, cL, 0);
      // corpo: respira, troca o peso de perna (solto), cabeca inclina no aceno, peito estufa na cintura
      this.body.position.y += br * 0.012 + hips * 0.02;
      this.body.rotation.z = sway * 0.035 * loose - wave * 0.04;
      this.head.rotation.z = wave * 0.18 + sway * 0.03 * loose;
      this.head.rotation.x = -hips * 0.08;
      return;
    }
    this.armR.set(shR, new THREE.Vector3(0.48, 1.0, -0.1), this.handR.position);
    this.armL.set(shL, new THREE.Vector3(-0.35, 1.0, -0.35), this.handL.position);
    if (this.gun && this.gun.userData.spin) this.gun.userData.spin.rotation.z += dt * (s.firing ? 30 : 2);

    this.shadow.scale.setScalar(1 - Math.min(0.6, (s.airH || 0) * 0.15));
  }
}
