// Noite dos Borroes (03/11): boneco dos viloes no lugar do Character. Mesma interface que o main.js, o replay e o
// fieldview usam (root, gun, tag, head, shadow, deadT, setLook, setWeapon, lod, sharpTag, swing, flinch, update), mas
// o desenho e o de src/villains.js com a propria animacao. Sem placa de nome e sem arma na mao.
import * as THREE from 'three';
import { VILLAINS, BOSSES } from './villains.js';
import { MOB_SCALE, MOBS } from '../shared/mobs.js';

const shadowGeo = new THREE.CircleGeometry(1, 20);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

// jeito de andar de cada um: f = passos por segundo, hop = altura do pulo, lean = inclina pra frente correndo,
// sway = ginga de lado, sq = amassa ao pousar, jit = tremido de rabisco, atk = tamanho do bote
const GAIT = {
  borrao: { f: 2.6, hop: 0.22, lean: 0.22, sway: 0.12, sq: 0.16, atk: 1 },
  rabisco: { f: 4.5, hop: 0.06, lean: 0.3, sway: 0.05, sq: 0.05, jit: 0.05, atk: 0.9 },
  mola: { f: 1.6, hop: 0.7, lean: 0.12, sway: 0.04, sq: 0.3, atk: 1.2 },
  cuspidor: { f: 3.4, hop: 0.05, lean: 0.12, sway: 0.18, sq: 0.06, atk: 0.7 },
  gordao: { f: 1.3, hop: 0.05, lean: 0.08, sway: 0.14, sq: 0.1, atk: 1.3 },
  cartola: { f: 2, hop: 0.04, lean: 0.16, sway: 0.06, sq: 0.03, atk: 0.9 },
  projecionista: { f: 0.9, hop: 0.12, lean: 0.04, sway: 0.05, sq: 0.04, atk: 0.4 },
  reiTinteiro: { f: 0.7, hop: 0.06, lean: 0.03, sway: 0.04, sq: 0.05, atk: 0.35 },
};
const SWING = 0.45; // bote: 35% puxando pra tras, o resto avancando

export class MobChar {
  constructor(kind) {
    this.kind = kind;
    this.root = new THREE.Group();
    this.body = (VILLAINS[kind] || BOSSES[kind] || VILLAINS.borrao)();
    this.body.scale.setScalar(MOB_SCALE[kind] || 1);
    if (BOSSES[kind]) this.body.userData.live = true; // facho/tampa comandados pelo servidor
    // rig: camada de andar/atacar POR FORA do desenho (a animacao propria de cada vilao continua intacta por dentro)
    this.rig = new THREE.Group(); this.rig.add(this.body); this.root.add(this.rig);
    this.gait = GAIT[kind] || GAIT.borrao; this.ph = Math.random() * 6; this.mv = 0;
    const r = (MOBS[kind]?.hb.r || 0.6) * 1.15;
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.03; this.shadow.scale.setScalar(r); this.root.add(this.shadow);
    this.tag = new THREE.Object3D(); this.tag.visible = false; // vilao nao tem placa de nome
    this.head = new THREE.Object3D(); this.headK = 1; // evento Cabecao nao mexe no vilao
    this.gun = null; this.deadT = 0; this.t = Math.random() * 10;
    this.hitT = 0; this.swingT = 0;
    // barra de vida (pedido dele 03/11): duas placas viradas pra camera; aparece quando o vilao ja levou dano
    const top = (MOBS[kind]?.hb.h || 1.4) + 0.45, wBar = Math.max(0.9, (MOBS[kind]?.hb.r || 0.6) * 1.8);
    this.bar = new THREE.Group(); this.bar.position.y = top; this.bar.visible = false; this.root.add(this.bar);
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x141210, depthTest: false, fog: false }));
    back.scale.set(wBar + 0.08, 0.2, 1); back.renderOrder = 10; this.bar.add(back);
    this.fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xc23a2a, depthTest: false, fog: false }));
    this.fill.center.set(0, 0.5); this.fill.position.x = -wBar / 2; this.fill.scale.set(wBar, 0.12, 1); this.fill.renderOrder = 11; this.bar.add(this.fill);
    this.barW = wBar;
  }
  setHp(k) {
    k = Math.max(0, Math.min(1, k || 0));
    this.bar.visible = k < 0.999 && k > 0;
    this.fill.scale.x = Math.max(0.001, this.barW * k);
    this.fill.material.color.setHex(k > 0.5 ? 0xc23a2a : k > 0.25 ? 0xd9822b : 0xf2d25a); // perto de cair: amarelo
  }
  setLook() {}
  setWeapon() {}
  sharpTag() {}
  lod(d) { this.shadow.visible = d < 40; }
  flinch() { this.hitT = 0.18; }
  swing() { this.swingT = SWING; }
  leap() { this.leapT = 0.6; }
  // estado vindo do snapshot/eventos (chefoes)
  boss(st) { const u = this.body.userData; if ('warn' in st) u.warn = st.warn; if (st.fire) { this.fireT = 0.8; u.warn = false; } if ('lid' in st) this.lidT = st.lid; }
  update(dt, s) {
    const u = this.body.userData, k = MOB_SCALE[this.kind] || 1;
    if (!s.alive) {
      // derrete numa poca e some (o servidor tira o vilao 2 s depois)
      this.deadT += dt;
      if (this.deadT === dt) { this.rig.position.set(0, 0, 0); this.rig.rotation.set(0, 0, 0); this.rig.scale.setScalar(1); }
      const m = Math.max(0, 1 - this.deadT / 0.9);
      this.body.scale.set(k * (1 + (1 - m) * 0.6), k * Math.max(0.02, m), k * (1 + (1 - m) * 0.6));
      this.shadow.scale.setScalar((MOBS[this.kind]?.hb.r || 0.6) * (1.15 + (1 - m) * 0.8));
      return;
    }
    if (this.deadT) { this.deadT = 0; }
    this.t += dt * (0.6 + Math.min(1.6, (s.speed || 0) / 4)); // anda mais rapido = ginga mais rapido
    u.anim?.(this.t);
    // andar: pulo/ginga/inclinacao conforme a velocidade (suavizada pra nao pipocar entre snapshots)
    const G = this.gait, want = Math.min(1, (s.speed || 0) / 3);
    this.mv += (want - this.mv) * Math.min(1, dt * 8);
    const m = this.mv;
    this.ph += dt * Math.PI * 2 * G.f * (0.35 + m * 0.9);
    const step = Math.abs(Math.sin(this.ph)), land = Math.max(0, 1 - step * 4); // land: perto do chao
    let y = step * G.hop * m, rx = -G.lean * m, rz = Math.sin(this.ph) * G.sway * m, z = 0, sy = 1 - land * G.sq * m;
    if (G.jit && m > 0.1) { this.rig.position.x = (Math.random() - 0.5) * G.jit; } else this.rig.position.x = 0;
    // golpe: puxa pra tras e esticado, depois bote pra frente amassando
    this.swingT = Math.max(0, this.swingT - dt); this.hitT = Math.max(0, this.hitT - dt);
    if (this.swingT > 0) {
      const p = 1 - this.swingT / SWING, a = G.atk;
      if (p < 0.35) { const k = Math.sin(p / 0.35 * Math.PI / 2); rx += 0.32 * a * k; sy *= 1 + 0.12 * a * k; z += 0.12 * a * k; }
      else { const k = Math.sin((p - 0.35) / 0.65 * Math.PI); rx -= 0.6 * a * k; z -= 0.45 * a * k; sy *= 1 - 0.1 * a * k; }
    }
    // salto da mola (borLeap): arco alto
    if (this.leapT > 0) { this.leapT -= dt; const k = Math.max(0, this.leapT / 0.6); y += Math.sin((1 - k) * Math.PI) * 1.2; sy *= 1 + Math.sin((1 - k) * Math.PI) * 0.25; }
    this.rig.position.y = y; this.rig.position.z = z; this.rig.rotation.x = rx; this.rig.rotation.z = rz;
    this.rig.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); // estica/amassa mantendo o volume
    this.shadow.scale.setScalar((MOBS[this.kind]?.hb.r || 0.6) * 1.15 * (1 - Math.min(0.4, y * 0.3)));
    // levou tiro: amassa
    const sq = this.hitT / 0.18 * 0.12;
    this.body.scale.set(k * (1 + sq), k * (1 - sq), k * (1 + sq));
    if (this.fireT != null) { this.fireT -= dt; const on = this.fireT > 0; u.beam += ((on ? 1 : 0) - u.beam) * Math.min(1, dt * (on ? 14 : 3)); }
    if (this.lidT != null) u.lidOpen = (u.lidOpen || 0) + ((this.lidT ? 1 : 0) - (u.lidOpen || 0)) * Math.min(1, dt * 3);
  }
}
