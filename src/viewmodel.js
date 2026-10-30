// Arma na mao em primeira pessoa (pose COD). Cena propria, desenhada por cima.
// Estados: quadril, mira (ADS), corrida (arma cruzada pra baixo), disparada (arma
// erguida no ombro com o braco bombeando), recarga e troca.
import * as THREE from 'three';
import { umbrellaMesh } from './fieldview.js';
import { ink, PAL, wordTexture } from './toon.js';
import { Hose } from './character.js';
import { buildGun } from './arsenal.js';

const VM_SCALE = 0.8;
// Inspecionar, um por categoria. Chave: [t 0..1, x, y, z, rx, ry, rz, maoEsqX, maoEsqY, maoEsqZ]
// (somado a pose de quadril; mao esquerda em relacao ao punho dela). Curva Catmull-Rom = fluido.
const O = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const INSPECTS = {
  pistol: { dur: 2.8, keys: [
    [0, ...O],
    [0.14, -0.1, 0.05, 0.08, 0.15, 0.25, 0, 0, 0, 0],
    [0.32, -0.12, 0.06, 0.08, 0.1, 1.25, -0.3, 0, 0, 0],     // lado esquerdo
    [0.48, -0.12, 0.08, 0.06, 0.55, 0.3, -1.45, 0, 0, 0],    // deita mostrando o topo
    [0.62, -0.1, 0.05, 0.08, 0.1, -0.85, 0.45, 0, 0, 0],     // lado direito
    [0.84, -0.08, 0.04, 0.06, 0.05, Math.PI * 2 - 0.4, 0.15, 0, 0, 0], // giro de cowboy (volta inteira)
    [1, 0, 0, 0, 0, Math.PI * 2, 0, 0, 0, 0]] },
  smg: { dur: 3, keys: [
    [0, ...O],
    [0.15, -0.09, 0.04, 0.06, 0.12, 0.35, -0.2, 0, 0, 0],
    [0.33, -0.1, 0.05, 0.06, 0.08, 1.1, -0.45, 0, 0, 0],     // janela de ejecao
    [0.45, -0.1, 0.05, 0.06, 0.05, 1.0, -0.4, 0.02, 0.02, 0.1], // mao puxa o ferrolho
    [0.52, -0.1, 0.04, 0.07, 0.12, 1.02, -0.4, 0, 0, 0],     // solta (tranco)
    [0.7, -0.09, 0.05, 0.06, 0.2, -0.7, 0.35, 0, 0, 0],      // outro lado
    [0.84, -0.06, 0.03, 0.04, -0.1, -0.3, 0.15, 0, 0, 0],
    [1, ...O]] },
  rifle: { dur: 3.4, keys: [
    [0, ...O],
    [0.12, -0.1, 0.05, 0.05, 0.1, 0.3, -0.15, 0, 0, 0],
    [0.3, -0.12, 0.06, 0.04, 0.05, 1.05, -0.35, 0, 0, 0],    // lado esquerdo
    [0.42, -0.1, 0.1, 0.02, 0.55, 0.6, -0.2, 0, 0, 0],       // cano pra cima
    [0.52, -0.1, 0.02, 0.04, -0.15, 0.4, -0.1, 0, -0.07, 0.05], // mao bate no pente
    [0.58, -0.1, 0.03, 0.04, -0.1, 0.38, -0.1, 0, -0.02, 0.03],
    [0.76, -0.1, 0.05, 0.05, 0.12, -0.75, 0.4, 0, 0, 0],     // lado direito
    [0.9, -0.05, 0.02, 0.03, 0.04, -0.2, 0.1, 0, 0, 0],
    [1, ...O]] },
  shotgun: { dur: 3, keys: [
    [0, ...O],
    [0.14, -0.08, 0.05, 0.05, 0.2, 0.5, -0.25, 0, 0, 0],
    [0.3, -0.1, 0.06, 0.05, 0.15, 1.0, -0.4, 0, 0, 0],
    [0.4, -0.1, 0.05, 0.08, 0.12, 0.9, -0.35, 0, 0, 0.12],   // bomba pra tras
    [0.48, -0.1, 0.05, 0.05, 0.16, 0.9, -0.35, 0, 0, 0],     // e pra frente
    [0.66, -0.08, 0.04, 0.05, 0.35, -0.55, 0.3, 0, 0, 0],    // apoia no ombro
    [0.84, -0.05, 0.03, 0.03, 0.1, -0.15, 0.1, 0, 0, 0],
    [1, ...O]] },
  sniper: { dur: 3.6, keys: [
    [0, ...O],
    [0.14, -0.06, 0.04, -0.04, 0.08, 0.25, -0.1, 0, 0, 0],
    [0.3, -0.08, 0.05, -0.08, 0.02, 0.75, -0.25, 0, 0, 0],    // lado esquerdo, longo (afastado)
    [0.44, -0.08, 0.07, -0.04, 0.12, 0.2, 0.05, 0, 0, 0],     // ergue e mostra a luneta
    [0.56, -0.06, 0.03, -0.06, 0.1, 0.05, 0.75, 0, 0, 0],     // rola pro lado direito (girar jogaria a coronha na cara)
    [0.64, -0.06, 0.03, -0.06, 0.1, 0.05, 0.75, 0.05, 0.06, 0.08], // mao no ferrolho
    [0.72, -0.06, 0.03, -0.06, 0.12, 0.05, 0.72, 0, 0, 0],
    [0.88, -0.03, 0.02, -0.03, 0.05, 0.02, 0.2, 0, 0, 0],
    [1, ...O]] },
  melee: { dur: 2.6, keys: [
    [0, ...O],
    [0.16, -0.12, 0.08, 0.06, 0.4, 0.3, -0.2, 0, 0, 0],
    [0.34, -0.12, 0.1, 0.06, 0.3, 1.3, -0.4, 0, 0, 0],               // lado da lamina
    [0.5, -0.12, 0.1, 0.06, 0.3, 1.3 + Math.PI, 0.4, 0, 0, 0],       // vira na mao
    [0.7, -0.1, 0.06, 0.05, 0.5, Math.PI * 2 - 0.2, 0.2, 0, 0, 0],   // giro de volta
    [1, 0, 0, 0, 0, Math.PI * 2, 0, 0, 0, 0]] },
  minigun: { dur: 2.6, keys: [
    [0, ...O],
    [0.2, -0.04, 0.05, 0.03, 0.25, 0.25, -0.1, 0, 0, 0],     // ergue (pesado)
    [0.45, -0.06, 0.04, 0.03, 0.15, 0.7, -0.25, 0, 0, 0],
    [0.7, -0.05, 0.03, 0.03, 0.1, -0.35, 0.2, 0, 0, 0],
    [1, ...O]] },
};
// Catmull-Rom nas chaves: posicao e mao sem tranco entre os passos
function inspectPose(k, p) {
  let i = 0;
  while (i < k.length - 2 && p > k[i + 1][0]) i++;
  const a = k[Math.max(0, i - 1)], b = k[i], c = k[i + 1], d = k[Math.min(k.length - 1, i + 2)];
  const u = THREE.MathUtils.clamp((p - b[0]) / (c[0] - b[0] || 1), 0, 1);
  const e = u * u * (3 - 2 * u); // segura um tico em cada pose
  const out = [];
  for (let j = 1; j < b.length; j++) {
    const p0 = a[j], p1 = b[j], p2 = c[j], p3 = d[j];
    out.push(0.5 * ((2 * p1) + (-p0 + p2) * e + (2 * p0 - 5 * p1 + 4 * p2 - p3) * e * e + (-p0 + 3 * p1 - 3 * p2 + p3) * e * e * e));
  }
  return out;
}
const STREAK_DUR = 1.3;
// golpe com a faca na mao (BO3): prepara a direita, corta atravessando pra esquerda e volta.
// Chave: [t, x, y, z, rx, ry, rz] somado a pose da faca.
const SLASH = [
  [0, 0, 0, 0, 0, 0, 0],
  [0.2, 0.05, 0.05, 0.05, 0.15, -0.55, -0.35],
  [0.48, -0.26, -0.03, -0.14, -0.1, 0.85, 0.55],
  [0.66, -0.3, -0.07, -0.08, -0.15, 0.95, 0.6],
  [1, 0, 0, 0, 0, 0, 0],
];
// faca rapida com arma na mao: a lamina entra pela direita, corta na frente e sai baixa a esquerda.
// Chave: [t, x, y, z, rx, ry, rz] da faca em relacao a camera.
const QUICK = [
  [0, 0.42, -0.34, -0.58, -0.1, 0.7, -0.5],
  [0.22, 0.3, -0.14, -0.62, -0.05, 0.95, -0.35],
  [0.5, -0.04, -0.18, -0.64, 0.05, 1.3, -0.15],
  [0.72, -0.2, -0.28, -0.6, 0.1, 1.45, -0.05],
  [1, -0.3, -0.48, -0.52, 0.15, 1.55, 0.05],
];
// objetos dos chamados de sequencia (feitos no codigo, traco de tinta igual o resto)
function makeProp(kind) {
  const g = new THREE.Group(), hand = new THREE.Object3D();
  if (kind === 'uav') {
    // luneta de pirata: 3 gomos de latao
    [[0.022, 0.13, 0], [0.018, 0.1, -0.1], [0.014, 0.08, -0.18]].forEach(([r, l, z]) => {
      const c = ink(new THREE.CylinderGeometry(r, r, l, 12), 0xb8862b, 0.004); c.rotation.x = Math.PI / 2; c.position.z = z; g.add(c);
    });
    hand.position.set(0, -0.03, 0.06);
  } else if (kind === 'anvil') {
    // detonador de TNT: caixa de madeira + pistao em T
    const box = ink(new THREE.BoxGeometry(0.12, 0.08, 0.1), 0x8a4b22, 0.004); g.add(box);
    const lbl = ink(new THREE.BoxGeometry(0.07, 0.03, 0.002), 0xece9e1, 0.002); lbl.position.set(0, 0.0, 0.051); g.add(lbl);
    const pl = new THREE.Group(); pl.position.y = 0.09; pl.userData.y0 = 0.09;
    const rod = ink(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), 0x2a2724, 0.003); pl.add(rod);
    const bar = ink(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), 0x2a2724, 0.003); bar.rotation.z = Math.PI / 2; bar.position.y = 0.045; pl.add(bar);
    g.add(pl); g.userData.plunger = pl;
    hand.position.set(0, 0.16, 0); pl.add(hand); hand.position.set(0, 0.06, 0);
  } else if (kind === 'nuke') {
    // Torta Atomica: forma de torta com creme e um botao vermelho enorme no meio (aperta igual a campainha)
    const tin = ink(new THREE.CylinderGeometry(0.075, 0.06, 0.03, 18), 0xbdb7ac, 0.004); g.add(tin);
    const cream = ink(new THREE.SphereGeometry(0.07, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4efe2, 0.004); cream.scale.y = 0.45; cream.position.y = 0.014; g.add(cream);
    const bt = ink(new THREE.CylinderGeometry(0.022, 0.024, 0.02, 14), 0xa83a2c, 0.003); bt.position.y = 0.05; bt.userData.y0 = 0.05; g.add(bt);
    g.userData.button = bt;
    hand.position.set(0, 0.1, 0); bt.add(hand); hand.position.set(0, 0.03, 0);
  } else {
    // campainha de balcao: cupula dourada + botao
    const dome = ink(new THREE.SphereGeometry(0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8b24a, 0.004); g.add(dome);
    const base = ink(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16), 0x2a2724, 0.003); base.position.y = -0.008; g.add(base);
    const bt = ink(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), 0x2a2724, 0.003); bt.position.y = 0.06; bt.userData.y0 = 0.06; g.add(bt);
    g.userData.button = bt;
    hand.position.set(0, 0.11, 0); bt.add(hand); hand.position.set(0, 0.04, 0);
  }
  if (!hand.parent) g.add(hand);
  g.userData.hand = hand;
  g.visible = false;
  return g;
}
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6e6a63, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(1, 2, 1); this.scene.add(d);
    this.rig = new THREE.Group();     // pose geral
    this.scene.add(this.rig);
    this.holder = new THREE.Group();  // arma atual
    this.rig.add(this.holder);
    this.armR = new Hose(0.042, PAL.ink, 0.012);
    this.armL = new Hose(0.042, PAL.ink, 0.012);
    this.scene.add(this.armR.mesh, this.armL.mesh);
    // luva com duas maos: aberta (segurando arma de fogo) e fechada (punho: soco e cabo da faca)
    const glove = () => {
      const g = new THREE.Group(), open = new THREE.Group(), fist = new THREE.Group();
      const palm = ink(new THREE.SphereGeometry(0.05, 12, 10), PAL.white, 0.008);
      palm.scale.set(1, 0.85, 1.25); open.add(palm);
      for (let i = 0; i < 3; i++) {
        const f = ink(new THREE.CapsuleGeometry(0.016, 0.04, 3, 6), PAL.white, 0.006);
        f.position.set(-0.03 + i * 0.03, 0.02, -0.05); f.rotation.x = -1.2;
        open.add(f);
      }
      const th = ink(new THREE.CapsuleGeometry(0.016, 0.03, 3, 6), PAL.white, 0.006);
      th.position.set(0.045, 0.03, -0.01); th.rotation.z = -0.8; open.add(th);
      // punho: bola fechada, 4 nos dos dedos dobrados na frente e o polegar cruzando por baixo
      const ball = ink(new THREE.SphereGeometry(0.052, 12, 10), PAL.white, 0.008);
      ball.scale.set(1.05, 0.95, 1.1); fist.add(ball);
      for (let i = 0; i < 4; i++) {
        const k = ink(new THREE.CapsuleGeometry(0.018, 0.026, 3, 6), PAL.white, 0.007);
        k.position.set(-0.036 + i * 0.024, 0.03, -0.042); k.rotation.x = 0.9; // crista dos nos em cima (a camera ve o punho por tras)
        fist.add(k);
      }
      const tf = ink(new THREE.CapsuleGeometry(0.015, 0.04, 3, 6), PAL.white, 0.006);
      tf.position.set(-0.035, -0.005, -0.035); tf.rotation.z = Math.PI / 2; tf.rotation.y = 0.5; fist.add(tf); // polegar por dentro, dobrado sobre os dedos
      // linhas dos dedos (riscos de tinta entre os nos)
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.03, 0.006), new THREE.MeshBasicMaterial({ color: PAL.ink }));
        l.position.set(-0.024 + i * 0.024, 0.045, -0.05); l.rotation.x = 0.9; fist.add(l);
      }
      const cuff = ink(new THREE.CylinderGeometry(0.045, 0.06, 0.05, 10), PAL.white, 0.008);
      cuff.position.set(0, -0.01, 0.06); cuff.rotation.x = Math.PI / 2; g.add(cuff);
      fist.visible = false;
      g.add(open, fist); g.userData = { open, fist };
      return g;
    };
    this.gloveR = glove(); this.gloveL = glove();
    this.gloveR.scale.setScalar(0.8); this.gloveL.scale.setScalar(0.8);
    this.scene.add(this.gloveR, this.gloveL);

    // clarao respeita a profundidade: nunca passa por cima da propria arma
    const flashMat = new THREE.SpriteMaterial({ map: wordTexture('', { burst: true }), transparent: true, depthTest: true, depthWrite: false });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.renderOrder = 2;
    this.flash.visible = false;
    this.scene.add(this.flash);

    this.s = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    this.kick = 0; this.kickR = 0; this.swayX = 0; this.swayY = 0; this.land = 0;
    this.switchT = 0; this.throwT = 0; this.reloadT = 0; this.reloadDur = 1; this.flashT = 0; this.inspectT = 0; this.swingT = 0; this.boltT = 0; this.streakT = 0;
    this.bobT = 0; this.ads = 0; this.squash = 0;
    this.gun = null; this.wpn = null;
  }

  setWeapon(id, loadout, instant = false) {
    this.holder.clear();
    this.gun = buildGun(id, loadout);
    this.gun.scale.setScalar(VM_SCALE);
    this.holder.add(this.gun);
    this.wpn = id;
    this.switchT = instant ? 0 : 0.32;
  }

  fire(kick) {
    this.kick += kick * 1.6;
    this.kickR += kick * 3.2 + Math.random() * kick;
    this.flashT = 0.05;
    this.squash = 1;
  }

  reload(dur) { this.reloadT = dur; this.reloadDur = dur; }
  throwNade() { this.throwT = 0.5; }
  // golpe de lamina: com arma na mao = faca rapida (a arma desce e a lamina entra pela direita);
  // com a lamina na mao = ela mesma corta
  meleeSwing(dur, lo) {
    this.swingDur = Math.max(0.32, Math.min(0.5, dur * 0.6)); this.swingT = this.swingDur; this.inspectT = 0;
    this.swingQuick = this.wpn !== 'melee' && this.wpn !== 'fists';
    if (this.wpn === 'fists') this.punchLeft = !this.punchLeft; // jab alternado
    if (!this.swingQuick) return;
    const key = JSON.stringify(lo || {});
    if (this.knifeKey !== key) {
      if (this.knife) this.scene.remove(this.knife);
      this.knife = buildGun(lo?.fists ? 'fists' : 'melee', lo?.fists ? null : lo); // battle royale: soco rapido sem faca this.knife.scale.setScalar(VM_SCALE); this.knife.visible = false;
      this.scene.add(this.knife); this.knifeKey = key;
    }
  }
  // ferrolho: depois do tiro a mao puxa e empurra o ferrolho
  bolt(t) { this.boltDur = Math.max(0.45, Math.min(1, t * 0.8)); this.boltT = this.boltDur + 0.12; }

  // chamar sequencia: a mao esquerda entra com um objeto de desenho antigo
  // uav = luneta de pirata, anvil = detonador de TNT, blimp = campainha de balcao
  callStreak(kind) {
    if (this.prop) this.scene.remove(this.prop);
    this.prop = makeProp(kind); this.propKind = kind;
    this.scene.add(this.prop);
    this.streakT = STREAK_DUR; this.inspectT = 0;
  }

  inspect() { if (this.inspectT <= 0 && this.switchT <= 0) this.inspectT = (INSPECTS[this.wpn] || INSPECTS.rifle).dur; }
  landed(v) { this.land = Math.min(0.08, v * 0.006); }

  // st: { dt, moving, speed, sprint, tac, ads(0..1 alvo), crouch, slide, air, lookDX, lookDY, firing }
  update(st) {
    const dt = st.dt, s = this.s, g = this.gun?.userData || {};
    this.ads = st.ads;
    if (this.gun) this.gun.userData.fxHidden = st.ads > 0.3; // efeito da camo lendaria some mirando
    // pose alvo
    let tx = 0.19, ty = -0.19, tz = -0.4, trx = 0.02, tryy = 0.05, trz = 0;
    // pistola de braco esticado (MW 2019): mais longe do rosto
    const pistol = this.wpn === 'pistol';
    if (pistol) { tx = 0.16; ty = -0.17; tz = -0.52; }
    // faca na mao: baixa a direita, lamina pra frente e levemente pra dentro (o antebraco aparece)
    if (this.wpn === 'melee') { tx = 0.2; ty = -0.25; tz = -0.46; trx = 0.18; tryy = 0.32; trz = 0.22; }
    if (st.tac) {
      tx = 0.2; ty = -0.17; tz = -0.44; trx = 0.95; tryy = 0.35; trz = -0.55;
    } else if (st.sprint && pistol) {
      // corrida de pistola (BO3): pistola erguida perto do peito, cano pra cima
      tx = 0.13; ty = -0.17; tz = -0.4; trx = 1.05; tryy = -0.12; trz = -0.28;
    } else if (st.sprint && this.wpn === 'melee') {
      tx = 0.2; ty = -0.27; tz = -0.42; trx = 0.6; tryy = 0.2; trz = 0.3;
    } else if (st.sprint) {
      // corrida estilo COD: arma baixa no canto, cano caido pra esquerda
      tx = 0.15; ty = -0.23; tz = -0.4; trx = -0.42; tryy = 0.72; trz = 0.36;
    } else if (st.ads > 0) {
      const eye = ((g.scope && g.scope.eye) || g.iron || new THREE.Vector3(0, 0.08, -0.1)).clone().multiplyScalar(VM_SCALE);
      // luneta: a lente ocupa ~55% da altura da tela; red dot: olho um pouco atras da janela
      // distancia do olho estilo COD: a lente ocupa uma fatia fixa da altura da tela
      // (luneta ~62%, red dot ~14%), calculada pelo raio real de cada lente
      const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      let relief = g.scope ? g.scope.lensR * VM_SCALE / (half * (g.scope.big ? 0.62 : 0.14)) : 0.42;
      if (pistol && !g.scope?.big) relief = Math.max(0.6, relief * 1.9);
      // eixo optico inclinado no modelo: gira a arma pra ele ficar reto no olho
      const tilt = -(g.scope?.tilt || 0);
      eye.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
      const ax = -eye.x, ay = -eye.y, az = -relief - eye.z;
      this.adsEye = eye.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt);
      tx = THREE.MathUtils.lerp(tx, ax, st.ads); ty = THREE.MathUtils.lerp(ty, ay, st.ads); tz = THREE.MathUtils.lerp(tz, az, st.ads);
      // mirando: arma reta, sem inclinacao da pose de quadril
      trx = THREE.MathUtils.lerp(trx, tilt, st.ads); tryy *= 1 - st.ads; trz *= 1 - st.ads;
    }
    // inspecionar (pose por categoria); atirar, mirar, correr, recarregar ou granada cancela na hora
    let insp = null;
    if (this.inspectT > 0) {
      if (st.firing || st.ads > 0.05 || st.sprint || st.tac || this.reloadT > 0 || this.throwT > 0) this.inspectT = 0;
      else {
        this.inspectT -= dt;
        const I = INSPECTS[this.wpn] || INSPECTS.rifle;
        insp = inspectPose(I.keys, 1 - Math.max(0, this.inspectT) / I.dur);
        tx += insp[0]; ty += insp[1]; tz += insp[2]; trx += insp[3]; tryy += insp[4]; trz += insp[5];
      }
    }
    if (st.crouch) ty -= 0.01 * (1 - st.ads); // agachado a arma desce um pouco, mas mirando fica no centro (a mira da arma batia abaixo da cruz)

    // depois de uma volta inteira, a rotacao volta pra faixa normal sem desenrolar
    if (!insp && Math.abs(s.ry) > Math.PI) s.ry -= Math.sign(s.ry) * Math.PI * 2;
    const k = st.ads > 0 && !st.sprint ? 18 : insp ? 16 : 10;
    s.x = damp(s.x, tx, k, dt); s.y = damp(s.y, ty, k, dt); s.z = damp(s.z, tz, k, dt);
    const rk = st.ads > 0.5 ? 18 : insp ? 14 : 9;
    s.rx = damp(s.rx, trx, rk, dt); s.ry = damp(s.ry, tryy, rk, dt); s.rz = damp(s.rz, trz, rk, dt);

    // balanco: andar = suave, corrida = oito, disparada = bombeado forte
    const rate = st.tac ? 15 : st.sprint ? 12.5 : 9.5;
    if (st.moving && !st.air) this.bobT += dt * rate * Math.min(1.2, st.speed / 7);
    const adsK = 1 - st.ads * 0.9;
    let bx = 0, by = 0, brz = 0, brx = 0;
    if (st.moving && !st.air) {
      const amp = st.tac ? 0.04 : st.sprint ? 0.03 : 0.012;
      bx = Math.sin(this.bobT) * amp * adsK;
      by = -Math.abs(Math.cos(this.bobT)) * amp * 0.9 * adsK;
      brz = Math.sin(this.bobT) * (st.sprint || st.tac ? 0.08 : 0.02) * adsK;
      if (st.tac) brx = Math.sin(this.bobT * 2) * 0.1;
      // pistola erguida: o pulo do passo sobe e desce o cano no ritmo
      if (st.sprint && pistol) { by = -Math.abs(Math.sin(this.bobT)) * 0.035; brx = Math.abs(Math.sin(this.bobT)) * 0.12; brz = Math.sin(this.bobT) * 0.06; }
    } else {
      const t = performance.now() / 1000;
      by = Math.sin(t * 1.8) * 0.003 * adsK; bx = Math.cos(t * 0.9) * 0.002 * adsK;
    }
    // sway pelo mouse
    this.swayX = damp(this.swayX, THREE.MathUtils.clamp(-st.lookDX * 0.0009, -0.06, 0.06), 9, dt);
    this.swayY = damp(this.swayY, THREE.MathUtils.clamp(st.lookDY * 0.0009, -0.05, 0.05), 9, dt);
    // recuo de mola
    this.kick = damp(this.kick, 0, 14, dt);
    this.kickR = damp(this.kickR, 0, 12, dt);
    this.land = damp(this.land, 0, 8, dt);
    this.squash = damp(this.squash, 0, 18, dt);
    // troca: abaixa e sobe
    let sw = 0;
    if (this.switchT > 0) { this.switchT -= dt; sw = Math.max(0, this.switchT / 0.32); }
    // granada: abaixa a arma e a mao esquerda arremessa
    let th = 0;
    if (this.throwT > 0) { this.throwT -= dt; th = Math.sin((1 - this.throwT / 0.5) * Math.PI); }
    // recarga: tomba a arma e volta
    let rl = 0;
    if (this.reloadT > 0) { this.reloadT -= dt; const p = 1 - this.reloadT / this.reloadDur; rl = Math.sin(Math.min(1, p) * Math.PI); }

    // golpe de lamina (0..1) e ferrolho (0..1)
    let sw2 = 0, sp = 0;
    if (this.swingT > 0) { this.swingT -= dt; sp = 1 - Math.max(0, this.swingT) / this.swingDur; sw2 = Math.sin(sp * Math.PI); }
    let bo = 0;
    if (this.boltT > 0) { this.boltT -= dt; const bp = 1 - Math.max(0, this.boltT) / this.boltDur; bo = bp > 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0; }
    // faca rapida: a arma sai rapido (15% do tempo), fica fora e so volta nos 20% finais
    const out = this.swingT > 0 ? Math.min(1, sp / 0.15, (1 - sp) / 0.2) : 0;
    const dipQ = this.swingQuick ? out : 0;
    const cut = this.swingT > 0 && !this.swingQuick && this.wpn !== 'fists' ? inspectPose(SLASH, sp) : null;
    let sk = 0, skp = 0;
    if (this.streakT > 0) { this.streakT -= dt; skp = 1 - Math.max(0, this.streakT) / STREAK_DUR; sk = Math.min(1, skp / 0.18, (1 - skp) / 0.18); }
    const kickAds = st.ads > 0.5 ? 0.45 : 1;
    const c = cut || [0, 0, 0, 0, 0, 0];
    this.rig.position.set(
      s.x + bx + this.swayX * adsK + c[0],
      s.y + by - this.land - sw * 0.35 - rl * 0.06 - th * 0.22 + this.swayY * adsK - dipQ * 0.75 - sk * 0.12 + c[1],
      s.z + this.kick * kickAds + c[2]);
    this.rig.rotation.set(
      s.rx + brx + this.kickR * kickAds * 0.5 - sw * 0.9 + rl * 0.35 - dipQ * 1.1 + c[3],
      s.ry + this.swayX * 2 * adsK + c[4],
      s.rz + brz + rl * 0.7 + bo * 0.22 + c[5], 'YXZ');
    // mirando, o recuo e o balanco giram a arma EM VOLTA DO OLHO: o ponto da mira fica onde o tiro
    // vai. Antes girava em volta do punho e o ponto subia dezenas de pixels a cada rajada.
    if (st.ads > 0 && this.adsEye) {
      const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.rx, s.ry, s.rz, 'YXZ'));
      const drift = this.adsEye.clone().applyQuaternion(this.rig.quaternion).sub(this.adsEye.clone().applyQuaternion(qb));
      this.rig.position.addScaledVector(drift, -st.ads);
    }
    // achatado de desenho a cada tiro: so no quadril (mirando ele esticava a arma a partir do punho
    // e jogava a lente pra cima)
    const sq = this.squash * 0.12 * (1 - st.ads);
    this.holder.scale.set(1 + sq * 0.5, 1 + sq * 0.5, 1 - sq);

    // braco esquerdo solta da arma na recarga e na disparada (bomba no ritmo)
    this.rig.updateMatrixWorld(true);
    const pR = new THREE.Vector3(), pL = new THREE.Vector3();
    if (g.gripR) g.gripR.getWorldPosition(pR);
    if (g.gripL) g.gripL.getWorldPosition(pL);
    if (st.sprint && pistol) pL.set(-0.24 + Math.sin(this.bobT) * 0.04, -0.4 + Math.cos(this.bobT) * 0.06, -0.3 + Math.sin(this.bobT) * 0.08);
    if (st.tac) pL.set(-0.2 + Math.sin(this.bobT) * 0.05, -0.2 + Math.cos(this.bobT) * 0.08, -0.35 + Math.sin(this.bobT) * 0.1);
    if (insp) pL.add(new THREE.Vector3(insp[6], insp[7], insp[8]).applyQuaternion(this.rig.quaternion));
    if (rl > 0) pL.lerp(new THREE.Vector3(pR.x - 0.02, pR.y - 0.12, pR.z + 0.02), rl);
    if (th > 0) pL.lerp(new THREE.Vector3(-0.12, -0.05 + th * 0.1, -0.5), th);
    // faca na mao: a esquerda fica fora da tela (baixa, de lado)
    if (this.wpn === 'melee') pL.set(-0.34, -0.62, -0.25);
    // punhos: guarda de boxe balancando no ritmo; cada soco e um jab da mao da vez (alterna)
    const fists = this.wpn === 'fists';
    if (fists) {
      // punhos: guarda (respira) > andando (sobe e desce alternado no passo) > correndo (bombeia como no COD).
      // Os pesos misturam suave: nada de tranco ao comecar/parar de correr.
      this.fT = (this.fT || 0) + dt;
      this.fWalk = damp(this.fWalk || 0, st.moving && !st.air ? 1 : 0, 8, dt);
      this.fRun = damp(this.fRun || 0, st.sprint && !st.air ? 1 : 0, 7, dt);
      this.fAir = damp(this.fAir || 0, st.air ? 1 : 0, 10, dt);
      const ph = this.bobT, w = this.fWalk * (1 - this.fRun), r = this.fRun;
      const breath = Math.sin(this.fT * 3.2) * 0.01 * (1 - this.fWalk);
      const sw = Math.sin(ph), cw = Math.cos(ph);
      // guarda -> braco baixo e aberto da corrida
      pR.set(0.12 + 0.05 * r, -0.12 - 0.05 * r, -0.34 - 0.02 * r);
      pL.set(-0.12 - 0.05 * r, -0.10 - 0.07 * r, -0.31 - 0.05 * r);
      // andando: maos alternadas, leve vai-e-vem
      pR.y += breath + sw * 0.02 * w; pL.y += breath - sw * 0.02 * w;
      pR.z += cw * 0.018 * w; pL.z -= cw * 0.018 * w;
      pR.x += Math.abs(sw) * 0.006 * w; pL.x -= Math.abs(sw) * 0.006 * w;
      // correndo: bombeia em arco (frente e cima / tras e baixo), alternado
      pR.z -= sw * 0.1 * r; pR.y += sw * 0.045 * r - Math.abs(cw) * 0.015 * r;
      pL.z += sw * 0.1 * r; pL.y -= sw * 0.045 * r + Math.abs(cw) * 0.015 * r;
      // no ar: maos sobem um pouco (equilibrio)
      pR.y += 0.05 * this.fAir; pL.y += 0.06 * this.fAir;
      this.fPump = sw * r;
      if (this.swingT > 0) {
        const j = Math.sin(Math.min(1, sp / 0.45) * Math.PI / 2) * (sp < 0.45 ? 1 : Math.max(0, 1 - (sp - 0.45) / 0.55));
        const hand = this.punchLeft ? pL : pR;
        hand.x += (this.punchLeft ? 0.08 : -0.08) * j; hand.y += 0.03 * j; hand.z -= 0.2 * j;
      }
    }
    if (this.prop) {
      this.prop.visible = this.streakT > 0;
      if (this.prop.visible) {
        // entra de baixo a esquerda, faz a acao e sai
        const base = new THREE.Vector3(-0.1, -0.1 + (sk - 1) * 0.4, -0.34);
        this.prop.scale.setScalar(1.35);
        this.prop.position.copy(base);
        const act = Math.max(0, Math.min(1, (skp - 0.25) / 0.45)), beat = Math.sin(act * Math.PI);
        if (this.propKind === 'uav') { this.prop.position.y += 0.06 * sk; this.prop.rotation.set(0.1 + beat * 0.15, 0.7, 0.2 - beat * 0.2); }
        else if (this.propKind === 'anvil') { this.prop.rotation.set(0.25, 0.3, 0); const pl = this.prop.userData.plunger; if (pl) pl.position.y = pl.userData.y0 - (act > 0.5 ? 0.05 : act * 0.1); }
        else { this.prop.rotation.set(0.3, 0.2, 0); const bt = this.prop.userData.button; if (bt) bt.position.y = bt.userData.y0 - Math.abs(Math.sin(act * Math.PI * 3)) * 0.012; }
        this.prop.updateMatrixWorld(true);
        this.prop.userData.hand.getWorldPosition(pL);
      }
    }
    if (bo > 0) pR.add(new THREE.Vector3(0.03 * bo, 0.04 * bo, 0.1 * bo));
    if (this.knife) {
      this.knife.visible = this.swingQuick && this.swingT > 0;
      if (this.knife.visible) {
        // corte na frente, da direita pra esquerda (BO3), longe o bastante pra luva nao tampar a tela
        const q = inspectPose(QUICK, sp);
        this.knife.position.set(q[0], q[1], q[2]);
        this.knife.rotation.set(q[3], q[4], q[5], 'YXZ');
        this.knife.updateMatrixWorld(true);
        this.knife.userData.gripR.getWorldPosition(pR);
        pL.y -= dipQ * 0.6;
      }
    }
    this.gloveR.position.copy(pR);
    this.gloveL.position.copy(pL);
    this.gloveR.quaternion.copy(this.rig.quaternion);
    this.gloveL.quaternion.copy(this.rig.quaternion);
    // punho fechado: no soco e segurando a faca (na mao ou no golpe rapido); aberta segurando arma
    const fistR = fists || this.wpn === 'melee' || (this.knife?.visible ?? false), fistL = fists;
    this.gloveR.userData.fist.visible = fistR; this.gloveR.userData.open.visible = !fistR;
    this.gloveL.userData.fist.visible = fistL; this.gloveL.userData.open.visible = !fistL;
    if (fists) { this.gloveR.quaternion.identity(); this.gloveL.quaternion.identity(); this.gloveL.rotateZ(-0.15); this.gloveR.rotateZ(0.15); const pmp = this.fPump || 0; this.gloveR.rotateX(-pmp * 0.5 - (this.fRun || 0) * 0.35); this.gloveL.rotateX(pmp * 0.5 - (this.fRun || 0) * 0.35); } // punho gira com a passada
    else this.gloveL.rotateZ(-0.9);
    // guarda-chuva aberto: a mao esquerda segura o cabo, cupula na frente-esquerda tampando o tronco
    if (this.umbOn) {
      if (!this.umb) { this.umb = umbrellaMesh(); this.umb.scale.setScalar(0.3); this.scene.add(this.umb); }
      this.umb.visible = true;
      // cupula virada pra frente (ponta no -z), um pouco a esquerda: protege sem tampar a mira
      this.umb.position.set(-0.2, -0.06, -0.62); this.umb.rotation.set(-Math.PI / 2 + 0.12, 0.18, 0);
      this.umb.updateMatrixWorld(true);
      pL.set(-0.2, -0.13, -0.42);
      this.gloveL.position.copy(pL);
    } else if (this.umb) this.umb.visible = false;
    const hideHands = false;
    if (g.scope?.lens) {
      g.scope.lens.material.uniforms.uOn.value = g.scope.big ? THREE.MathUtils.smoothstep(st.ads, 0.55, 0.9) : 1;
      // luneta na mira cheia: o vidro e' desenhado por cima da carcaca (sem o tunel da caixa por dentro)
      const over = g.scope.big && st.ads > 0.8;
      if (g.scope.lens.material.depthTest === over) { g.scope.lens.material.depthTest = !over; g.scope.lens.renderOrder = over ? 9 : 3; }
    }
    this.armR.set(new THREE.Vector3(0.38, -0.55, 0.15), new THREE.Vector3(0.35, -0.3, 0.05).lerp(pR, 0.3), pR.clone().add(new THREE.Vector3(0, -0.01, 0.06)));
    this.armL.set(new THREE.Vector3(-0.38, -0.6, 0.05), new THREE.Vector3(-0.3, -0.35, -0.1).lerp(pL, 0.3), pL.clone().add(new THREE.Vector3(0, -0.01, 0.06)));
    this.rig.visible = !hideHands;
    for (const o of [this.gloveR, this.gloveL, this.armR.mesh, this.armL.mesh]) o.visible = !hideHands;

    // laser: feixe curto na primeira pessoa (o ponto no mundo e' do main); correndo desliga
    if (g.laser) {
      const u = g.laser.beam.material.uniforms.uOn, b = g.laser.beam;
      // mirando some (o ponto no mundo continua); no quadril o feixe converge pro centro da mira
      u.value = damp(u.value, st.sprint || st.tac || this.inspectT > 0 || st.ads > 0.3 ? 0 : 1, 14, dt);
      b.parent.updateWorldMatrix(true, false);
      const from = b.getWorldPosition(new THREE.Vector3()), to = new THREE.Vector3(0, 0, -6);
      b.scale.z = 1;
      b.lookAt(to); b.rotateY(Math.PI); // a geometria aponta pra -z
      b.scale.z = from.distanceTo(to) / b.parent.getWorldScale(new THREE.Vector3()).z * 0.45;
    }
    if (g.spin) {
      this.spinV = damp(this.spinV || 0, st.firing ? 40 : 0, 4, dt);
      if (g.spinAxis) g.spin.rotation.z += this.spinV * dt; else g.spin.rotation.z += this.spinV * dt;
    }
    // clarao da boca
    if (this.flashT > 0 && g.muzzle) {
      this.flashT -= dt;
      g.muzzle.getWorldPosition(this.flash.position);
      // um tico a frente da boca do cano, na direcao que a arma aponta
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rig.quaternion);
      this.flash.position.addScaledVector(fwd, 0.06);
      const sc = (0.07 + Math.random() * 0.04) * (st.ads > 0.5 ? 0.55 : 1);
      this.flash.scale.set(sc, sc, 1);
      this.flash.material.rotation = Math.random() * 6;
      this.flash.visible = !(g.scope && st.ads > 0.85);
    } else this.flash.visible = false;
  }

  // ponto da boca do cano na tela, em coordenadas de camera (pra puxar o tracer do lugar certo)
  muzzleCam() {
    const p = new THREE.Vector3();
    if (this.gun?.userData.muzzle) this.gun.userData.muzzle.getWorldPosition(p);
    return p;
  }
}
