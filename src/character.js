// Borrao: personagem rubber hose original. Membros sao mangueiras (tubo curvo
// recalculado por frame), luvas brancas, olhos de fatia de torta.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ink, toon, PAL, wordTexture, smoothGeo, isSharedGeo } from './toon.js';
import { buildGun, disposeGun } from './arsenal.js';
import { cleanLook } from '../shared/looks.js';
import { eyeTex, buildEyewear, buildHat, buildFace, styleGlove, patternTex, buildFx, buildSkinFx, skinMat, antiFlicker } from './looks3d.js';
import { attachCharm, tickCharm } from './charms.js';
import { applyDance, applyPose } from './dances.js';
import { ring as fxRing, column as fxColumn, burst as fxBurst, play as fxPlay, disposeFx } from './deathfx.js';
// morte em borrao e renascer no lapis (09/11, aprovado por ele 06/11; ver tools/previa-borrao-lapis.html). Materiais e formas compartilhados
const BLOT = { ink: new THREE.MeshBasicMaterial({ color: 0x141210 }), paper: new THREE.MeshBasicMaterial({ color: 0xf6efdc }), pool: new THREE.MeshBasicMaterial({ color: 0x141210, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), drop: new THREE.SphereGeometry(1, 8, 6), disc: null, pencil: null };
function blotDisc() { if (BLOT.disc) return BLOT.disc; const s = new THREE.Shape(), n = 40; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, r = 1 + Math.sin(a * 5) * 0.12 + Math.sin(a * 3 + 1) * 0.08, x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) s.lineTo(x, y); else s.moveTo(x, y); } return (BLOT.disc = new THREE.ShapeGeometry(s, 1)); }
function pencilMesh() {
  if (!BLOT.pencil) { const g = new THREE.Group(), body = ink(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), 0xffd23a, 0.012); body.position.y = 0.36; g.add(body); const wood = ink(new THREE.ConeGeometry(0.05, 0.11, 6), 0xe8c38a, 0.01); wood.rotation.x = Math.PI; wood.position.y = 0.055; g.add(wood); const er = ink(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), 0xf08aa0, 0.01); er.position.y = 0.65; g.add(er); g.rotation.z = -0.5; BLOT.pencil = g; }
  return BLOT.pencil.clone();
}


const SEG = 10, RAD = 6;
// contador de quadro das mangueiras (main.js soma 1 por quadro)
export const HOSE_FRAME = { n: 0 };
let hosePh = 0;

const hP = new THREE.Vector3(), hT = new THREE.Vector3(), hD = new THREE.Vector3(), hB = new THREE.Vector3(), hN = new THREE.Vector3(), hX = new THREE.Vector3(1, 0, 0), hY = new THREE.Vector3(0, 1, 0), hZ = new THREE.Vector3(0, 0, 1);

// Tubo bezier quadratico: start -> ctrl -> end. Atualiza vertices na mao.
export class Hose {
  constructor(radius, color, outlineTh = 0.035) {
    this.r = radius; this.throttle = 0; this.ph = hosePh++ % 3;
    const count = (SEG + 1) * RAD;
    const pos = new Float32Array(count * 3);
    const idx = [];
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = (i + 1) * RAD + j, d = (i + 1) * RAD + (j + 1) % RAD;
      // 10/11: face pra FORA (antes a, c, b virava pra dentro: o contorno preto era desenhado por cima da mangueira inteira;
      // de dia nao dava pra ver, preto em cima de preto, mas a noite braco e perna ficavam pretos com o corpo aceso)
      idx.push(a, b, c, b, d, c);
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

  // 08/11 (desempenho): o tubo muda de forma todo quadro, entao ficava sem corte de camera e desenhava mesmo fora da tela (8 chamadas por boneco).
  // Esfera fixa e folgada em volta do boneco: nunca some estando na vista
  cull() { const s = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 4); for (const m of [this.mesh, this.line]) { m.geometry.boundingSphere = s; m.frustumCulled = true; } }

  set(a, c, b) {
    // 10/11 (desempenho): boneco longe refaz a mangueira 1 quadro em 2 (muito longe, 1 em 3); de perto, todo quadro
    if (this.throttle && (HOSE_FRAME.n + this.ph) % this.throttle) return;
    const P = this.mesh.geometry.attributes.position.array, N = this.mesh.geometry.attributes.normal.array;
    const PO = this.line.geometry.attributes.position.array;
    const p = hP, t = hT, n = this.n0 || (this.n0 = new THREE.Vector3()), bn = hB, n1 = hN;
    // 05/11: transporte paralelo. Cada anel herda o giro do anel anterior e o primeiro herda o do quadro anterior; antes cada anel
    // escolhia sozinho por um eixo fixo, e o tubo torcia e beliscava quando o braco apontava pra frente
    n1.copy(n);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, iu = 1 - u;
      p.set(iu * iu * a.x + 2 * iu * u * c.x + u * u * b.x, iu * iu * a.y + 2 * iu * u * c.y + u * u * b.y, iu * iu * a.z + 2 * iu * u * c.z + u * u * b.z);
      hD.set(2 * iu * (c.x - a.x) + 2 * u * (b.x - c.x), 2 * iu * (c.y - a.y) + 2 * u * (b.y - c.y), 2 * iu * (c.z - a.z) + 2 * u * (b.z - c.z));
      if (hD.lengthSq() > 1e-10) t.copy(hD).normalize(); else if (i === 0) t.subVectors(b, a).normalize(); // ponto de controle em cima da ponta: fica a direcao que ja tinha
      n1.addScaledVector(t, -n1.dot(t));
      if (n1.lengthSq() < 1e-5) { const ax = Math.abs(t.x), ay = Math.abs(t.y), az = Math.abs(t.z); n1.crossVectors(t, ax <= ay && ax <= az ? hX : ay <= az ? hY : hZ); } // primeiro quadro, ou dobra de 180 graus
      n1.normalize();
      if (i === 0) n.copy(n1);
      bn.crossVectors(t, n1);
      // mangueira afina um tiquinho no meio (cara de borracha)
      const r = this.r * (1 - Math.sin(u * Math.PI) * 0.12);
      for (let j = 0; j < RAD; j++) {
        const ang = (j / RAD) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
        const k = (i * RAD + j) * 3;
        const nx = n1.x * cs + bn.x * sn, ny = n1.y * cs + bn.y * sn, nz = n1.z * cs + bn.z * sn;
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
function shared(key, make) { let v = SHARED.get(key); if (!v) { v = make(); if (v?.isBufferGeometry) v.userData.charShared = true; SHARED.set(key, v); } return v; }
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
// luva segurando cabo de espada (04/11): os 3 dedos dao a volta num cabo que passa pela origem no eixo X; pulso no +Y
function gripGeo() {
  return shared('gloveGrip', () => {
    const parts = [new THREE.SphereGeometry(0.1, 12, 10).scale(1.1, 0.8, 1).translate(0, 0.09, 0)], o = new THREE.Object3D();
    const add = (geo, p, r = [0, 0, 0]) => { o.position.set(...p); o.rotation.set(...r); o.updateMatrix(); parts.push(geo.applyMatrix4(o.matrix)); };
    add(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10), [0, 0.2, 0]);
    add(new THREE.TorusGeometry(0.13, 0.022, 6, 14), [0, 0.24, 0], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.075, 0.038, 8, 16), [-0.08 + i * 0.08, 0, 0], [0, Math.PI / 2, 0]);
    add(new THREE.CapsuleGeometry(0.036, 0.07, 3, 8), [0.135, 0.05, 0.04], [0, 0, Math.PI / 2]);
    const g = mergeGeometries(parts); parts.forEach(p => p.dispose());
    return g;
  });
}
const gX = new THREE.Vector3(), gY = new THREE.Vector3(), gZ = new THREE.Vector3(), gM = new THREE.Matrix4();
let KO_STAR = null; const KO_NUM = new Map();
function koStar() { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.035 : 0.085, an = i / 10 * Math.PI * 2; sh[i ? 'lineTo' : 'moveTo'](Math.sin(an) * r, Math.cos(an) * r); } sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: false }).translate(0, 0, -0.011); }
function koNum(n) { if (!KO_NUM.has(n)) KO_NUM.set(n, wordTexture(String(n), { burst: false, size: 256, fill: '#faf8f2' })); return KO_NUM.get(n); }
const wX = new THREE.Vector3(), wY = new THREE.Vector3(), wZ = new THREE.Vector3(), wM = new THREE.Matrix4(), WRIST_RATE = 12, WRIST_MAX = 24;
// Volta pro Caixao (08/11, pedido dele): caixao de desenho animado (oco: paredes + fundo de cetim + tampa com cruz)
// e lapide. Geometria feita uma vez so; cada morte so cria as malhas. Frente do boneco = -Z, caixao fica atras (+Z).
export const DEATH_DUR = { derrete: 2.4, pancake: 2.25, caixao: 2.35 }; // quanto tempo o boneco morto fica na tela (padrao 1,4 s)
let COF = null;
function coffinGeo() {
  if (COF) return COF;
  const P = [[-0.2, 0], [0.2, 0], [0.44, 1.42], [0.3, 2.02], [-0.3, 2.02], [-0.44, 1.42]];
  const outline = (k, rev = false) => { const pts = P.map(([x, y]) => new THREE.Vector2(x * k, (y - 1) * k + 1)); if (rev) pts.reverse(); return pts; };
  const wall = new THREE.Shape(outline(1)); wall.holes.push(new THREE.Path(outline(0.86, true)));
  const lidSh = new THREE.Shape(outline(1.01)), backSh = new THREE.Shape(outline(0.86));
  const cross = [new THREE.BoxGeometry(0.07, 0.62, 0.03).translate(0, 1.16, 0), new THREE.BoxGeometry(0.34, 0.07, 0.03).translate(0, 1.28, 0)];
  const stone = new THREE.Shape(); stone.moveTo(-0.27, 0); stone.lineTo(0.27, 0); stone.lineTo(0.27, 0.5); stone.absarc(0, 0.5, 0.27, 0, Math.PI, false); stone.closePath();
  COF = {
    walls: new THREE.ExtrudeGeometry(wall, { depth: 0.62, bevelEnabled: false }).translate(0, 0, -0.31), // z -0.31..0.31
    back: new THREE.ExtrudeGeometry(backSh, { depth: 0.05, bevelEnabled: false }).translate(0, 0, 0.26),  // fundo de cetim por dentro
    // tampa: dobradica no lado esquerdo (x = -0.45): a geometria sai da origem pra girar em volta dela
    lid: new THREE.ExtrudeGeometry(lidSh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 }).translate(0.45, 0, -0.06),
    cross: mergeGeometries(cross).translate(0.45, 0, -0.085),
    stone: new THREE.ExtrudeGeometry(stone, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }).translate(0, 0, -0.06),
  };
  return COF;
}
let RIP_TEX = null;
function stripeTex() {
  if (STRIPE) return STRIPE;
  const c = document.createElement('canvas'); c.width = 256; c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ece9e1' : '#a83a2c'; g.fillRect(i * 32, 0, 32, 16); }
  STRIPE = new THREE.CanvasTexture(c); STRIPE.colorSpace = THREE.SRGBColorSpace;
  return STRIPE;
}

// a partir daqui (m) o boneco perde os detalhes pequenos
// 09/11: Ajustes > Detalhe dos bonecos. far = some o detalhe pequeno; hull = some o contorno (a essa distancia ele tem menos de 1 pixel e dobra as chamadas de desenho)
export const CHAR_LOD = { far: 18, hull: 34 };

// pose de sentado no carro (04/11): coordenadas do corpo do boneco (quadril em y 0.72, frente = -z).
// sink = quanto o corpo desce (o quadril encosta no banco); pe e joelho vao pra frente; wheel = centro do volante
export const SEAT_POSE = { sink: 0.42, footX: 0.2, footY: 0.32, footZ: -0.62, kneeX: 0.22, kneeY: 0.86, kneeZ: -0.42, wheel: [0, 1.12, -0.5], wheelR: 0.17 };

export class Character {
  constructor(team, name, look = null) {
    EYE ||= eyeTexture();
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // tudo que faz squash
    this.root.add(this.body);
    const teamCol = team === 'red' ? PAL.red : team === 'blue' ? PAL.blue : PAL.mid;
    this.teamCol = teamCol;

    // 05/11 (pedido dele: malha piscando): esferas mais redondas. Com poucos lados o encontro de duas malhas saia rasgado e o contorno soltava farpas
    const torso = ink(shared(`new THREE.SphereGeometry(0.42, 28, 20)`, () => new THREE.SphereGeometry(0.42, 28, 20)), PAL.ink, 0.03);
    torso.scale.set(1, 1.15, 0.9); torso.position.y = 1.05;
    this.body.add(torso); this.torso = torso;
    const shorts = ink(shared(`new THREE.SphereGeometry(0.44, 28, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45)`, () => new THREE.SphereGeometry(0.44, 28, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45)), teamCol, 0.03);
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
    const skull = ink(shared(`new THREE.SphereGeometry(0.36, 28, 20)`, () => new THREE.SphereGeometry(0.36, 28, 20)), PAL.ink, 0.03);
    this.head.add(skull); this.skull = skull;
    const mask = ink(shared(`new THREE.SphereGeometry(0.3, 28, 20)`, () => new THREE.SphereGeometry(0.3, 28, 20)), 0xf0ebe0, 0); // sem casca: ela e que soltava as farpas pretas no pescoco
    mask.position.set(0, -0.06, -0.14); mask.scale.set(1.05, 0.85, 0.8);
    this.head.add(mask);
    // olhos colados na curva do rosto: o plano reto cortava a mascara e piscava em cima dela
    const eyes = new THREE.Mesh(shared('geo:eyes', () => { const g = new THREE.PlaneGeometry(0.42, 0.21, 20, 10), P = g.attributes.position, RX = 0.315, RY = 0.255, RZ = 0.24; for (let i = 0; i < P.count; i++) { const u = P.getX(i) / RX, v = (P.getY(i) + 0.1) / RY, k = Math.max(0, 1 - u * u - v * v), y = P.getY(i) + 0.04, sk = Math.sqrt(Math.max(0, 0.1296 - P.getX(i) ** 2 - y * y)); P.setZ(i, Math.max(0.14 + RZ * Math.sqrt(k), sk) + 0.007); /* na frente do que estiver mais a frente: mascara ou cabeca */ } P.needsUpdate = true; return g; }), new THREE.MeshBasicMaterial({ map: EYE, transparent: true, depthWrite: false }));
    eyes.position.set(0, 0.04, 0); eyes.rotation.y = Math.PI;
    this.head.add(eyes); this.eyes = eyes;
    const nose = ink(shared(`new THREE.SphereGeometry(0.075, 10, 8)`, () => new THREE.SphereGeometry(0.075, 10, 8)), PAL.ink, 0.012);
    nose.position.set(0, -0.08, -0.395); nose.scale.set(1.3, 1, 1); nose.userData.detail = true;
    this.head.add(nose); this.nose = nose;
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
    for (const h of [this.armR, this.armL, this.legR, this.legL]) h.cull();
    this.v = new THREE.Vector3();
    // 05/11: camadas do corpo: o que esta por cima ganha sempre do que esta por baixo (rosto sobre a cabeca, short sobre o tronco)
    antiFlicker(mask, 1); antiFlicker(nose, 2);
    this.body.traverse(o => { if (o.userData.detail && o.geometry?.type === 'SphereGeometry' && o !== nose) antiFlicker(o, 2); });
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
    const pt = patternTex(L.pattern);
    this.shorts.material = pt ? toon(tc, { map: pt }) : toon(tc); antiFlicker(this.shorts, 1);
    this.eyes.material = eyeMat(L.eyes); this.eyes.material.polygonOffset || antiFlicker(this.eyes, 2);
    if (this.eyewear) this.head.remove(this.eyewear);
    this.eyewear = buildEyewear(L.eyes); if (this.eyewear) { antiFlicker(this.eyewear); this.head.add(this.eyewear); }
    if (this.faceP) this.head.remove(this.faceP);
    this.faceP = buildFace(L.face); if (this.faceP) { antiFlicker(this.faceP); this.head.add(this.faceP); } if (this.nose) this.nose.visible = !this.faceP?.userData.noNose; // mascara de casca (08/11)
    if (this.hat) this.head.remove(this.hat);
    this.hat = buildHat(L.hat, tc); if (this.hat) { antiFlicker(this.hat); this.head.add(this.hat); }
    if (this.curl) this.curl.visible = !['bolo', 'tubarao', 'sorvete', 'cogumelo', 'alavanca'].includes(L.hat); // chapeu que cobre o topo: o topete atravessava
    styleGlove(this.handR, L.glove, L.gloveCol); styleGlove(this.handL, L.glove, L.gloveCol);
    for (const h of [this.handR, this.handL]) for (const c of h.children) if (c.userData.gloveExtra) antiFlicker(c, 2); // peca extra da luva (polegar, anel...) por cima da luva
    if (this.gun && this.gun.userData.charm?.id !== L.charm && L.charm !== 'none') attachCharm(this.gun, L.charm); else if (this.gun && L.charm === 'none') attachCharm(this.gun, null);
    if (this.fx) this.root.remove(this.fx.group);
    this.fx = buildFx(L.fx); if (this.fx) this.root.add(this.fx.group);
    if (this.skinFx) { this.root.remove(this.skinFx.group); this.skinFx.dispose(); } // pecas 3D da skin nova (09/11)
    this.skinFx = buildSkinFx(L.skin); if (this.skinFx) this.root.add(this.skinFx.group);
    this.details = []; this.body.traverse(o => { if (o.userData.detail) this.details.push(o); });
    if (this.far) for (const o of this.details) o.visible = false;
  }

  // espada: as duas luvas trocam pela que fecha os dedos no cabo (sem dedos no visual = fica a luva dele)
  twoHand(on) {
    if (on === !!this.gripOn) return;
    this.gripOn = on;
    for (const h of [this.handR, this.handL]) {
      if (on && h.geometry !== h.userData.fingerGeo?.[0]) continue;
      const geo = on ? gripGeo() : h.userData.fingerGeo[0], ol = h.children.find(c => c.isMesh && c.material?.isShaderMaterial);
      h.geometry = geo; if (ol) ol.geometry = smoothGeo(geo);
      if (!on) h.quaternion.identity();
    }
  }

  // 09/11 (bateria de desempenho): cada partida deixava ~300 geometrias na placa (mangueiras, chapeus e mascaras de cada
  // boneco saiam da cena sem dispose). O que e compartilhado entre bonecos e as armas seguem as regras delas
  dispose() {
    const guns = [this.gun, this.gun2h, this.quickKnife].filter(Boolean);
    for (const g of guns) disposeGun(g);
    this.skinFx?.dispose();
    const walk = (o) => { if (guns.includes(o)) return; const g = o.geometry; if (g && !o.isInstancedMesh && !g.userData.charShared && !isSharedGeo(g)) g.dispose(); for (const c of o.children) walk(c); };
    walk(this.root);
  }

  setWeapon(id, lo = null) {
    this.wpn = id;
    disposeGun(this.gun); // a arma velha era so deste boneco: libera a pintura (vazava a cada troca)
    this.gunHolder.clear();
    this.gun = buildGun(id, lo);
    if (id !== 'melee' && id !== 'fists') attachCharm(this.gun, this.look?.charm);
    if (id === 'melee') this.gun.scale.setScalar(this.gun.userData.sword ? 1.05 : 1.6); /* espada ja e comprida (04/11) */ // faca na mao (01/11): maior pra ler de longe
    this.twoHand(id === 'melee' && !!this.gun?.userData.sword);
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
  // igual a wristAlign, pra dança (05/11): a boca da luva segue o braco na hora, mas o giro em volta do pulso anda no maximo RATE rad/s.
  // Com o braco no eixo z a referencia inverte de um quadro pro outro, e a luva dava um giro de meia volta de repente
  wristEase(hand, ctrl, twist, dt) {
    const y = wY.copy(ctrl).sub(hand.position).normalize();
    const goal = wZ.set(0, 0, 1).addScaledVector(y, -y.z);
    if (goal.lengthSq() < 1e-4) goal.set(1, 0, 0).addScaledVector(y, -y.x);
    goal.normalize();
    const z = hand.userData.wz || (hand.userData.wz = goal.clone());
    z.addScaledVector(y, -z.dot(y));
    if (z.lengthSq() < 1e-4) z.copy(goal); else z.normalize();
    const ang = Math.atan2(wX.crossVectors(z, goal).dot(y), z.dot(goal)), lim = WRIST_RATE * Math.max(dt || 0, 1 / 120);
    z.applyAxisAngle(y, Math.max(-lim, Math.min(lim, ang))).normalize();
    wX.crossVectors(y, z);
    hand.quaternion.setFromRotationMatrix(wM.makeBasis(wX, y, z));
    if (twist) hand.rotateY(twist);
    // mao passando rente ao cotovelo: a boca da luva vira rapido demais. Teto no giro total, sem trocar de direcao
    const q = hand.userData.wq || (hand.userData.wq = hand.quaternion.clone());
    q.rotateTowards(hand.quaternion, WRIST_MAX * Math.max(dt || 0, 1 / 120)); hand.quaternion.copy(q);
  }

  // nivel de detalhe pela distancia da camera: 16 bonecos x 48 malhas pesavam no celular
  lod(dist) {
    const hf = dist > CHAR_LOD.hull;
    if (hf !== this.hullFar || this.hulls === undefined || this.hullGun !== this.gun || this.hullLook !== this.details) {
      this.hullFar = hf; this.hullGun = this.gun; this.hullLook = this.details; this.hulls = [];
      this.body.traverse(o => { if (o.isMesh && o.material?.uniforms?.th && o.parent?.isMesh) { this.hulls.push(o); o.visible = !hf; } });
    }
    const far = dist > CHAR_LOD.far;
    const th = hf ? 3 : far ? 2 : 0; for (const h of [this.armR, this.armL, this.legR, this.legL]) if (h) h.throttle = th;
    if (far === this.far) return;
    this.far = far;
    for (const o of this.details) o.visible = !far && !(o === this.nose && this.faceP?.userData.noNose); // nariz debaixo da mascara de casca fica escondido (08/11)
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

  // animacao de morte (05/11, pedido dele): dura ate 1,4 s (depois o boneco some). So desenho, igual pra todo mundo ver
  // morreu: estica de susto, amolece, vira tinta e fica a poca
  blotDeath(T, B, sm) {
    const a = sm(T / 0.16), b = sm((T - 0.16) / 0.7), c = sm((T - 1.7) / 0.5), sy = (1 + 0.12 * a * (1 - b)) * (1 - 0.94 * b), sx = 1 + 0.5 * b;
    B.scale.set(sx, Math.max(0.04, sy), sx); B.rotation.set(0, 0, 0); B.position.y = -0.03 * b;
    if (b > 0.3 && !this.blotMats) { this.blotMats = new Map(); B.traverse(o => { if (o.isMesh && o.material && o.material.side !== THREE.BackSide) { this.blotMats.set(o, o.material); o.material = BLOT.ink; } }); }
    B.visible = b < 0.97;
    if (!this.blot) { const g = this.blot = new THREE.Group(), d = new THREE.Mesh(blotDisc(), BLOT.pool); d.rotation.x = -Math.PI / 2; d.position.y = 0.02; g.add(d); g.userData.disc = d; g.userData.drops = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(BLOT.drop, BLOT.ink), an = i * 1.7 + 0.4; m.userData = { an, h: 0.7 + i * 0.28 }; g.add(m); return m; }); this.root.add(g); }
    const f = this.blot.userData; f.disc.scale.setScalar(0.001 + 0.85 * sm((T - 0.45) / 0.8) * (1 - c));
    f.drops.forEach((m, i) => { const k = (T - 0.3 - i * 0.08) / 0.55; m.visible = k > 0 && k < 1; if (!m.visible) return; const r = 0.2 + 0.25 * k; m.position.set(Math.cos(m.userData.an) * r, Math.max(0.03, m.userData.h * (1 - k * k)), Math.sin(m.userData.an) * r); m.scale.setScalar(0.07 - 0.02 * i * 0.5); });
  }
  // derretida (10/11, pedido dele: a morte padrao e a dos viloes derretendo): leva o tranco, amolece balancando,
  // vira borracha preta e escorre numa poca que borbulha; a poca seca no fim. Usa a mesma poca e a mesma tinta da panqueca
  meltDeath(T, B, sm) {
    const a = sm(T / 0.14), b = sm((T - 0.14) / 0.95), c = sm((T - 1.8) / 0.55), wob = Math.sin(T * 15) * 0.07 * (1 - b) * a;
    const sy = (1 + 0.1 * a * (1 - b)) * (1 - 0.95 * b), sx = 1 + 0.75 * b;
    B.scale.set(sx + wob, Math.max(0.035, sy), sx - wob); B.rotation.set(Math.sin(T * 9) * 0.08 * (1 - b), 0, Math.sin(T * 7) * 0.1 * (1 - b)); B.position.y = -0.04 * b;
    if (b > 0.42 && !this.blotMats) { this.blotMats = new Map(); B.traverse(o => { if (o.isMesh && o.material && o.material.side !== THREE.BackSide) { this.blotMats.set(o, o.material); o.material = BLOT.ink; } }); }
    B.visible = b < 0.985;
    if (!this.blot) {
      const g = this.blot = new THREE.Group(), d = new THREE.Mesh(blotDisc(), BLOT.pool); d.rotation.x = -Math.PI / 2; d.position.y = 0.02; g.add(d); g.userData.disc = d;
      g.userData.drops = [0, 1, 2, 3, 4].map(i => { const m = new THREE.Mesh(BLOT.drop, BLOT.ink), an = i * 1.26 + 0.3; m.userData = { an, r: 0.12 + (i % 3) * 0.13, t0: 0.85 + i * 0.17 }; g.add(m); return m; });
      this.root.add(g);
    }
    const f = this.blot.userData; f.disc.scale.set(0.001 + 0.95 * sm((T - 0.3) / 0.9) * (1 - c), 0.001 + 0.82 * sm((T - 0.3) / 0.9) * (1 - c), 1);
    // bolhas de borracha: sobem da poca, incham e estouram
    f.drops.forEach((m) => { const k = (T - m.userData.t0) / 0.42; m.visible = k > 0 && k < 1 && c < 0.6; if (!m.visible) return; const r = m.userData.r * (1 - c); m.position.set(Math.cos(m.userData.an) * r, 0.03 + 0.02 * k, Math.sin(m.userData.an) * r); m.scale.set(0.045 + 0.05 * k, 0.03 + 0.045 * k, 0.045 + 0.05 * k); });
  }
  endBlot() {
    if (this.blotMats) { for (const [o, m] of this.blotMats) o.material = m; this.blotMats = null; }
    if (this.blot) { this.root.remove(this.blot); this.blot = null; }
    this.body.visible = true;
  }
  // renasceu: o lapis desenha de baixo pra cima (traco no papel) e a cor sobe atras. Curto: quem renasce ja pode levar tiro
  startDraw() {
    const B = this.body; B.scale.set(1, 1, 1); B.position.y = 0; B.rotation.set(0, 0, 0); this.root.updateMatrixWorld(true);
    const v = new THREE.Vector3(), y0 = this.root.getWorldPosition(new THREE.Vector3()).y, list = [];
    B.traverse(o => { if (!o.isMesh || !o.visible || !o.material) return; o.getWorldPosition(v); list.push({ o, y: v.y - y0, m: o.material, line: o.material.side === THREE.BackSide }); });
    if (!list.length) return;
    this.pencil ||= pencilMesh(); this.root.add(this.pencil);
    this.draw = { t: 0, list, top: Math.max(...list.map(p => p.y)) + 0.2 };
  }
  tickDraw(dt) {
    const D = this.draw, sm = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); }; D.t += dt;
    const k = D.t / 0.85;
    if (k >= 1) { this.endDraw(); return; }
    const h = D.top * sm(k / 0.65), fill = D.top * sm((k - 0.4) / 0.6);
    for (const p of D.list) { p.o.visible = p.y <= h; if (!p.line) p.o.material = p.y <= fill ? p.m : BLOT.paper; }
    const w = D.t * 26; this.pencil.visible = k < 0.72; this.pencil.position.set(Math.cos(w) * 0.25 + 0.12, h, Math.sin(w) * 0.25 + 0.12);
  }
  endDraw() { const D = this.draw; if (!D) return; for (const p of D.list) { p.o.visible = true; p.o.material = p.m; } this.draw = null; if (this.pencil) this.root.remove(this.pencil); }
  deathAnim(dt) {
    const T = this.deadT, B = this.body, id = this.look?.death || 'derrete', sm = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); }, end = sm((T - 1.05) / 0.3);
    // efeitos 3D das lendarias (08/11): malhas de shader presas no root (nao giram nem encolhem com o corpo)
    const FX = this.deathFxFor(id);
    if (id === 'caixao') { this.coffinDeath(T, B, FX, sm); return; }
    if (id === 'pancake') { this.blotDeath(T, B, sm); return; }
    if (id === 'derrete') { this.meltDeath(T, B, sm); return; }
    if (FX) {
      const f = FX.userData;
      if (id === 'anjo') { fxPlay(f.col, T, 0, 1.4); fxPlay(f.ring, T, 0, 0.7); }
      else if (id === 'balao') { fxPlay(f.ring, T, 0.38, 0.5); fxPlay(f.burst, T, 1.04, 0.34); f.burst.position.y = 1.1 + Math.max(0, T - 0.4) ** 2 * 7; }
      else if (id === 'mola') { fxPlay(f.ring, T, 0.18, 0.5); fxPlay(f.col, T, 0.2, 1.0); }
      else if (id === 'nocaute') { fxPlay(f.burst, T, 0.02, 0.3); fxPlay(f.ring, T, 0.52, 0.6); }
    }
    if (id === 'nocaute') { // rankeada: leva o direto, cambaleia, cai de costas; estrelinhas em volta da cabeca e o juiz conta ate 10
      const fall = sm((T - 0.26) / 0.3), a = -fall * 1.42; B.rotation.set(a + (T < 0.26 ? -Math.sin(T * 30) * 0.16 : 0), 0, T < 0.26 ? Math.sin(T * 22) * 0.2 : 0); B.position.y = 0.04; B.scale.setScalar(1 - end * 0.25);
      if (!this.deathProp) {
        const P = this.deathProp = new THREE.Group(); KO_STAR ||= koStar();
        for (let i = 0; i < 4; i++) { const s = ink(KO_STAR, 0xf2c94c, 0.006); s.userData.star = i; P.add(s); }
        const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: koNum(1), transparent: true, depthTest: false })); n.scale.set(0.9, 0.9, 1); n.renderOrder = 5; n.userData.count = 1; P.add(n); B.add(P);
      }
      const num = Math.min(10, 1 + Math.floor(T / 1.1 * 10));
      for (const o of this.deathProp.children) {
        if (o.userData.star != null) { const w = T * 7 + o.userData.star * Math.PI / 2; o.position.set(Math.cos(w) * 0.42, 1.98 + Math.sin(w * 2) * 0.03, Math.sin(w) * 0.42); o.rotation.y = T * 9; }
        else { if (o.userData.count !== num) { o.userData.count = num; o.material.map = koNum(num); o.material.needsUpdate = true; } const r = 1.9; o.position.set(0, Math.cos(a) * r, Math.sin(a) * r); } // sempre em cima do boneco, mesmo caido
      }
    } else if (id === 'tabua') { // cai duro feito cenario de papelao
      const f = sm(T / 0.42), hit = Math.max(0, 1 - (T - 0.42) / 0.3); B.rotation.set(-f * Math.PI / 2 + (T > 0.42 ? Math.sin((T - 0.42) * 24) * 0.06 * hit : 0), 0, 0); B.position.y = 0.05; B.scale.set(1 - end, 1 - end, 1 - end);
    } else if (id === 'fita') { // a pelicula queima: fica chapado, gira como quadro solto e encolhe
      const f = sm(T / 0.3); B.scale.set((1 + f * 0.25) * (1 - end), (1 + f * 0.1) * (1 - end), Math.max(0.03, 1 - f * 0.97)); B.rotation.y = T * T * 7; B.position.y = 0.9 * end;
    } else if (id === 'anjo') { // sobe de asinha e aureola
      if (!this.deathProp) { const P = this.deathProp = new THREE.Group(), gold = ink(new THREE.TorusGeometry(0.2, 0.03, 6, 18), 0xf2c94c, 0.008); gold.rotation.x = Math.PI / 2; gold.position.y = 2.2; P.add(gold); for (const s of [-1, 1]) { const w = ink(new THREE.SphereGeometry(0.34, 10, 8), 0xfaf8f2, 0.012); w.scale.set(1.2, 0.5, 0.1); w.position.set(s * 0.56, 1.45, 0.34); w.rotation.z = s * 0.45; w.userData.side = s; P.add(w); } B.add(P); }
      for (const w of this.deathProp.children) if (w.userData.side) w.rotation.z = w.userData.side * (0.45 + Math.sin(T * 18) * 0.35);
      B.position.y = T * T * 2.4; B.position.x = Math.sin(T * 5) * 0.12; B.scale.setScalar(1 - end);
    } else if (id === 'sanfona') { // fecha e abre como sanfona, cada vez menor
      const k = sm(T / 1.05), q = 1 - k * 0.75 + Math.sin(T * 24) * 0.3 * (1 - k); B.scale.set((1 + (1 - q) * 0.7) * (1 - end), Math.max(0.05, q * (1 - end)), (1 + (1 - q) * 0.7) * (1 - end));
    } else if (id === 'balao') { // incha e sai voando
      const f = sm(T / 0.45); B.scale.setScalar((1 + f * 0.8) * (1 - end * 0.9)); B.position.y = Math.max(0, T - 0.4) ** 2 * 7; B.rotation.z = Math.sin(T * 16) * 0.22 * f;
    } else if (id === 'mola') { // amassa e dispara girando
      const a = sm(T / 0.22), fly = Math.max(0, T - 0.22); B.scale.set(1 + a * (fly ? 0 : 0.4), fly ? 1.3 : 1 - a * 0.6, 1 + a * (fly ? 0 : 0.4)); B.position.y = fly * fly * 16; B.rotation.y = fly * 26; if (end) B.scale.multiplyScalar(1 - end);
    } else { // panqueca: achata e gira, depois some numa nuvem (o FX faz a nuvem)
      const k = Math.min(1, T / 0.25); B.scale.set(1 + k * 0.8, 1 - k * 0.88, 1 + k * 0.8); B.rotation.y += dt * 8 * (1 - k);
    }
  }

  // grupo dos efeitos 3D da morte lendaria (um por morte; some no renascer)
  deathFxFor(id) {
    if (this.deathFx || !['anjo', 'balao', 'mola', 'nocaute', 'caixao'].includes(id)) return this.deathFx;
    const G = this.deathFx = new THREE.Group(), f = G.userData;
    if (id === 'anjo') { f.col = fxColumn(0xf2d36b, 4.2, 0.75); f.ring = fxRing(0xfaf8f2, 1.7); }
    else if (id === 'balao') { f.ring = fxRing(0xff8fb4, 1.4); f.burst = fxBurst(0xff6f9f, 1.5); }
    else if (id === 'mola') { f.ring = fxRing(0xf2c94c, 1.8); f.col = fxColumn(0xf2c94c, 7, 0.6); f.col.scale.x = f.col.scale.z = 0.45; }
    else if (id === 'nocaute') { f.burst = fxBurst(0xf2c94c, 0.6); f.burst.position.set(0, 1.85, -0.35); f.ring = fxRing(0xfaf8f2, 2); }
    else if (id === 'caixao') { f.ring = fxRing(0x8a6ee0, 2.1); f.col = fxColumn(0xb9a6ff, 3.6, 0.6); f.dust = fxBurst(0xece9e1, 0.9, 0.8); f.dust.position.set(0, 1.0, -0.3); }
    for (const k of ['col', 'ring', 'burst', 'dust']) if (f[k]) G.add(f[k]);
    this.root.add(G);
    return G;
  }

  // Volta pro Caixao (08/11, pedido dele): o caixao brota do chao atras dele, ele leva um susto e pula pra dentro de
  // costas, a tampa bate (poeira), o caixao treme e afunda com a onda e a nevoa roxa; sobe a lapide R.I.P. e ela afunda
  coffinDeath(T, B, FX, sm) {
    const f = FX.userData, geo = coffinGeo();
    if (!f.coffin) {
      const C = f.coffin = new THREE.Group(); C.position.z = 0.12;
      C.add(ink(geo.walls, 0x6b4630, 0.012), ink(geo.back, 0xa8322a, 0));
      const lid = f.lid = new THREE.Group(); lid.position.set(-0.45, 0, -0.31);
      lid.add(ink(geo.lid, 0x7c5236, 0.012), ink(geo.cross, 0xf2c94c, 0.006)); C.add(lid);
      const st = f.stone = new THREE.Group(); st.position.set(0, 0, 0.12);
      st.add(ink(geo.stone, 0x9a968c, 0.012));
      RIP_TEX ||= wordTexture('RIP', { burst: false, size: 256, fill: '#faf8f2' });
      const rip = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: RIP_TEX, transparent: true, depthWrite: false })); rip.rotation.y = Math.PI; rip.position.set(0, 0.47, -0.088); st.add(rip); // gravado na frente da pedra (1,3 cm pra fora: sem pisca)
      FX.add(C, st);
    }
    const C = f.coffin, lid = f.lid, st = f.stone, back = (x) => 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2; // back-out (passa e volta)
    // 1) brota do chao (0 a 0,32 s) com a tampa aberta pra fora
    const rise = Math.min(1, T / 0.32);
    C.position.y = -2.2 * (1 - back(rise)); C.visible = T < 1.85;
    // 2) susto e pulo de costas pra dentro (0,18 a 0,62 s)
    const hop = sm((T - 0.18) / 0.44);
    const jolt = T < 0.18 ? Math.sin(T / 0.18 * Math.PI) : 0;
    B.position.set(0, jolt * 0.18 + Math.sin(hop * Math.PI) * 0.45, hop * 0.12);
    const shrink = 1 - hop * 0.22;
    B.scale.set(shrink * (1 - jolt * 0.12), shrink * (1 + jolt * 0.18), shrink);
    B.rotation.set(-Math.sin(hop * Math.PI) * 0.35, 0, 0);
    // 3) tampa bate (0,62 a 0,82 s), com quique; poeira na batida
    const shut = sm((T - 0.62) / 0.2), slam = T > 0.82 ? Math.sin((T - 0.82) * 30) * 0.12 * Math.max(0, 1 - (T - 0.82) / 0.3) : 0;
    lid.rotation.y = -1.95 * (1 - shut) + slam;
    fxPlay(f.dust, T, 0.8, 0.32);
    if (T > 0.84) B.scale.setScalar(0.0001); // la dentro: some
    // 4) treme e afunda girando de leve (1,0 a 1,75 s) com a onda no chao e a nevoa subindo
    const wob = T > 0.84 && T < 1.05 ? Math.sin((T - 0.84) * 46) * 0.06 : 0, sink = sm((T - 1.02) / 0.72);
    C.rotation.set(sink * 0.12, sink * 0.6, wob);
    if (T > 1.02) C.position.y = -2.3 * sink;
    fxPlay(f.ring, T, 1.0, 0.75); fxPlay(f.col, T, 0.98, 1.0);
    // 5) lapide sobe com mola (1,55 s), fica e afunda no fim
    const up = Math.min(1, Math.max(0, (T - 1.55) / 0.25)), down = sm((T - 2.08) / 0.25);
    st.visible = T > 1.55; st.position.y = -0.9 * (1 - back(up)) - 0.95 * down; st.scale.set(1 + Math.sin(up * Math.PI) * 0.12, 1 - Math.sin(up * Math.PI) * 0.1, 1);
  }

  update(dt, s) {
    const { anim, pitch = 0, alive, speed = 0, t } = s;
    if (!this.far) tickCharm(this.gun, dt);
    this.chute.visible = alive && anim === 'chute';
    // visual: efeito em volta (some de longe e morto), helice gira, enfeite balanca
    if (this.fx) { this.fx.group.visible = alive && !this.far; if (this.fx.group.visible) this.fx.tick(dt, t); }
    if (this.skinFx) { this.skinFx.group.visible = alive && !this.far; if (this.skinFx.group.visible) this.skinFx.tick(dt, t); }
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
    { const to = anim === 'crouch' || anim === 'slide' ? 0.45 : 0, r = dt * 0.45 / 0.16, c = this.crouchK || 0; this.crouchK = c + Math.max(-r, Math.min(r, to - c)); } // 09/11: agachar linear
    { const to = anim === 'jump' ? 1 : 0, r = dt / 0.14, c = this.jumpK || 0; this.jumpK = c + Math.max(-r, Math.min(r, to - c)); } // 09/11: pulo linear
    this.leanK = ease(this.leanK || 0, anim === 'sprint' || anim === 'tac' ? -0.25 : anim === 'slide' ? 0.35 : 0, 12);
    const moving = speed > 0.8 && anim !== 'jump' && anim !== 'slide';
    this.walkK = ease(this.walkK || 0, moving ? 1 : 0, 12); // passada some aos poucos (deslize, parar)
    const crouch = this.crouchK;
    // sentado no carro (04/11): 'seat' = passageiro (arma na mao), 'drive' = motorista (maos no volante). SEAT_POSE
    // tem tudo que muda (quanto afunda, onde ficam pe, joelho e maos): mexer na pose = mexer so ali
    this.seatK = ease(this.seatK || 0, anim === 'seat' || anim === 'drive' || anim === 'dealer' ? 1 : 0, 12);
    this.driveK = ease(this.driveK || 0, anim === 'drive' ? 1 : 0, 12);
    const seat = this.seatK;
    // escalada (01/11): corpo pra frente, um joelho sobe na borda, mao esquerda agarrada la em cima, arma abaixada
    this.climbK = ease(this.climbK || 0, anim === 'climb' ? 1 : 0, anim === 'climb' ? 18 : 10);
    const climb = this.climbK;

    if (!alive) {
      this.deadT += dt;
      this.endDraw();
      this.deathAnim(dt);
      this.tag.visible = false;
      this.root.visible = this.deadT < (DEATH_DUR[this.look?.death || 'derrete'] || 1.4);
      return;
    }
    if (this.deadT > 0) { this.endBlot(); if (['pancake', 'derrete'].includes(this.look?.death || 'derrete')) this.startDraw(); } // voltou da morte
    if (this.draw) this.tickDraw(dt);
    this.deadT = 0; if (this.deathProp) { this.body.remove(this.deathProp); this.deathProp = null; }
    if (this.deathFx) { this.root.remove(this.deathFx); disposeFx(this.deathFx); this.deathFx = null; this.body.position.z = 0; } // efeitos da lendaria (08/11)
    this.root.visible = true;
    this.tag.visible = true;
    this.body.rotation.y = 0;

    let fl = 0;
    if (this.hitT > 0) { this.hitT -= dt; fl = Math.sin(Math.min(1, this.hitT / 0.2) * Math.PI) * (this.hitHead ? 1.4 : 1); }
    // quique de borracha
    const bounce = moving ? Math.abs(Math.sin(ph)) : (Math.sin(t * 4.4 + this.phase) * 0.5 + 0.5) * 0.3;
    const sq = 1 + 0.12 * this.jumpK + (1 - this.jumpK) * (bounce - 0.5) * 0.08;
    this.body.scale.set(1 / Math.sqrt(sq), sq * (1 - crouch * 0.35), 1 / Math.sqrt(sq));
    this.body.position.y = moving && seat < 0.5 ? bounce * 0.12 : 0; this.body.position.x = 0; // x: a danca desloca o corpo pro lado
    if (seat > 0.01) { this.body.position.y -= SEAT_POSE.sink * seat; this.body.scale.set(1, 1, 1); this.body.rotation.x = 0; } // sentado: parado (sem quique nem respiracao)
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
      const b = new THREE.Vector3(side * 0.22, 0.1 + lift + this.jumpK * 0.25, footZ);
      if (climb) b.lerp(side > 0 ? new THREE.Vector3(0.2, 0.62, -0.42) : new THREE.Vector3(-0.22, 0.12, 0.28), climb); // direita sobe, esquerda empurra
      // joelho de mangueira dobra pra frente
      const c = new THREE.Vector3(side * 0.24, (a.y + b.y) / 2, (a.z + b.z) / 2 - 0.18 - lift * 0.4);
      if (seat > 0.01) { b.lerp(new THREE.Vector3(side * SEAT_POSE.footX, SEAT_POSE.footY, SEAT_POSE.footZ), seat); c.lerp(new THREE.Vector3(side * SEAT_POSE.kneeX, SEAT_POSE.kneeY, SEAT_POSE.kneeZ), seat); }
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
    if (seat > 0.5 && s.aimOff) { // sentado: o corpo fica de frente pro carro; braco e arma giram pra mira (cabeca acompanha)
      const o = Math.max(-2.2, Math.min(2.2, s.aimOff)), c = Math.cos(o), sn = Math.sin(o), x = gp.position.x, z = gp.position.z;
      gp.position.x = x * c + z * sn; gp.position.z = -x * sn + z * c; gp.rotation.y += o; this.head.rotation.y = o * 0.7;
    } else this.head.rotation.y = 0;
    if (climb) { gp.position.lerp(new THREE.Vector3(0.32, 0.98, -0.18), climb); gp.rotation.set(gp.rotation.x * (1 - climb) - climb * 1.0, climb * 0.35, climb * 0.4); }
    const knife = this.wpn === 'melee';
    const sw2h = knife && this.gripOn;
    if (knife && !sprinting) { if (sw2h) { gp.position.set(0.12, 1.2 + crouch * -0.1, -0.44); gp.rotation.set(0.85 + pitch * 0.5, -0.12, -0.12); } /* espada: as duas maos, na frente do peito */ else { gp.position.set(0.3, 1.28 + crouch * -0.1, -0.32); gp.rotation.set(0.75 + pitch * 0.5, -0.25, -0.2); } } // guarda: lamina erguida, de lado (ve de longe)
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
      if (sw2h) { const s = this.gun.scale.x; gripR.copy(this.gun.userData.gripR.position).multiplyScalar(s).applyMatrix4(gp.matrix); gripL.copy(this.gun.userData.gripL.position).multiplyScalar(s).applyMatrix4(gp.matrix); }
    }
    if (this.gun2h) { // espelho do suporte da direita; a mao esquerda vai no cabo dela
      this.gun2h.position.set(-gp.position.x, gp.position.y, gp.position.z);
      this.gun2h.rotation.set(gp.rotation.x, -gp.rotation.y, -gp.rotation.z);
      this.gun2h.updateMatrix();
      gripL.copy(this.gun2h.children[0].userData.gripR.position).applyMatrix4(this.gun2h.matrix);
    }
    const pump = sprinting && !sw2h ? Math.sin(ph) * 0.15 : 0;
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
    const shR = new THREE.Vector3(0.26, 1.32, 0), shL = new THREE.Vector3(-0.26, 1.32, 0); // 07/11 (pedido dele: ombro vazado): o braco nasce DENTRO do tronco (borda em x 0,348 nessa altura; em 0,36 a ponta aberta da mangueira aparecia)
    if (anim === 'dance' && applyDance(this, s.dance, s.danceT || 0, dt)) return; // danca de vitoria (05/11): src/dances.js
    if (anim === 'posed') { applyPose(this, s.pose, s.gunPose, dt); return; } // podio: dança, descanso e a volta pra arma
    if (anim === 'dealer') { // Seu Cambalacho (Mercado Negro, 08/11, referencia dele): sentado, curvado pra frente, caneca na mao direita
      // perto do peito, a esquerda apoiada no joelho; a cabeca baixa (rosto na sombra do capuz). s.t = gole (0 a 1)
      const g = Math.max(0, Math.min(1, s.sip || 0)), L = (a, b, k) => a + (b - a) * k;
      this.body.rotation.x = -(s.lean ?? 0.32); this.body.rotation.z = -(s.tilt || 0) * 0.35; this.head.rotation.x = L(s.headX ?? 0.42, -0.05, g); this.head.rotation.z = s.tilt || 0; this.head.rotation.y = s.headY || 0; // inclinado e meio torto: parado reto parecia duro
      this.handR.position.set(L(0.2, 0.1, g), L(1.02, 1.5, g), L(-0.42, -0.36, g));
      this.handL.position.set(-0.26, 0.86, -0.46);
      const cR = new THREE.Vector3(0.46, L(0.98, 1.12, g), L(-0.06, -0.12, g)), cL = new THREE.Vector3(-0.44, 1.0, -0.14);
      this.armR.set(shR, cR, this.handR.position); this.armL.set(shL, cL, this.handL.position);
      this.wristAlign(this.handR, cR, 0); this.wristAlign(this.handL, cL, 0);
      return;
    }
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
    if (sw2h) for (const [h, sh] of [[this.handR, new THREE.Vector3(0.42, 1.0, -0.1)], [this.handL, new THREE.Vector3(-0.35, 1.0, -0.35)]]) { // dedos em volta do cabo, pulso pro cotovelo
      gX.set(0, 0, -1).applyQuaternion(gp.quaternion);
      gY.copy(sh).sub(h.position); gY.addScaledVector(gX, -gY.dot(gX)).normalize();
      gZ.crossVectors(gX, gY);
      h.quaternion.setFromRotationMatrix(gM.makeBasis(gX, gY, gZ));
    }
    const drive = this.driveK;
    const noGun = drive > 0.3 || s.anim === 'drive'; // motorista guarda a arma (04/11: so passageiro atira)
    gp.visible = !noGun; if (this.gun2h) this.gun2h.visible = !noGun; if (this.quickKnife && noGun) this.quickKnife.visible = false;
    if (drive > 0.01) { // maos no volante, girando com a curva (s.steer -1..1)
      const st = (s.steer || 0) * 0.5;
      for (const [h, sx] of [[this.handR, 1], [this.handL, -1]]) h.position.lerp(new THREE.Vector3(SEAT_POSE.wheel[0] + sx * SEAT_POSE.wheelR * Math.cos(st), SEAT_POSE.wheel[1] + sx * SEAT_POSE.wheelR * Math.sin(st), SEAT_POSE.wheel[2]), drive); // aro do volante girado pela curva
    }
    const cR = new THREE.Vector3(0.48, 1.0, -0.1).lerp(new THREE.Vector3(0.42, 1.0, -0.25), drive), cL = new THREE.Vector3(-0.35, 1.0, -0.35).lerp(new THREE.Vector3(-0.42, 1.0, -0.25), drive);
    this.armR.set(shR, cR, this.handR.position);
    this.armL.set(shL, cL, this.handL.position);
    if (!sw2h) { this.wristAlign(this.handR, cR, 0); this.wristAlign(this.handL, cL, 0); } // 04/11: a boca da luva sai sempre na direcao do braco
    if (this.gun && this.gun.userData.spin) this.gun.userData.spin.rotation.z += dt * (s.firing ? 30 : 2);

    this.shadow.scale.setScalar(1 - Math.min(0.6, (s.airH || 0) * 0.15));
  }
}
