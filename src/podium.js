// Podio do fim da partida (05/11, pedido dele): depois da camera final, os 3 melhores em cima dos tambores, NO PROPRIO MAPA (lugar em
// shared/podiumspot.js). A camera chega voando; quem nao dança fica de pe com a arma em descanso. Quem esta no podio aperta o botao:
// a arma vai pras costas e ele dança; no fim da dança a mao busca a arma nas costas e volta pro descanso, sem corte. Bot dança sozinho.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Character } from './character.js';
import { disposeGun } from './arsenal.js';
import { toon, outline, wordTexture } from './toon.js';
import { DANCE_IDS } from '../shared/looks.js';
import { POD_SPOTS, POD_LOOK_Y, podiumCam } from '../shared/podiumspot.js';
import { dancePose, restPose, mixPose, danceLen, DANCES } from './dances.js';
import { DanceFx } from './dancefx.js';

// tambor do Tripo (public/models/src/podio.glb): um modelo so, esticado pra cada altura. Sem o modelo, um cilindro segura o boneco
let DRUM = null;
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/podio.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g.computeBoundingBox(); const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2); // centro no meio, base no chao
  g.scale(1 / (b.max.x - b.min.x), 1 / (b.max.y - b.min.y), 1 / (b.max.z - b.min.z)); // 1 x 1 x 1
  DRUM = { geo: g, map: mesh.material?.map || null }; if (DRUM.map) DRUM.map.colorSpace = THREE.SRGBColorSpace;
}).catch(e => console.warn('podio.glb nao carregou', e));

const hashOf = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const sm = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), Vr = new THREE.Vector3();
const INTRO = 3; // s da camera chegando
const TO_REST = 1.15, TO_DANCE = 0.85, FADE = 0.3;

// onde a arma fica: nas costas (mao alcanca por cima do ombro direito) e em descanso (baixa, atravessada na frente do corpo).
// Guardado pela posicao do cabo: assim a mao direita segura no lugar certo em qualquer arma
const SLING = { grip: new THREE.Vector3(0.3, 1.62, 0.3), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25, 0.1, -0.55)) };
const REST = { grip: new THREE.Vector3(0.28, 1.0, -0.42), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.62, 0.62, 0.15)) };
const HIP_L = [-0.44, 1.0, 0.08], HIP_LC = [-0.72, 1.14, 0.12], REACH_C = [0.78, 1.52, 0.2];

function drum(h) {
  const m = DRUM ? new THREE.Mesh(DRUM.geo, toon(0xffffff, { map: DRUM.map })) : new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 32).translate(0, 0.5, 0), toon(0xa83a2c));
  m.scale.set(2.1, h, 2.1); outline(m, 0.012);
  return m;
}
const mix3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export class Podium {
  constructor() { this.on = false; this.dance = new Map(); this.chars = []; this.t = 0; }

  // apertou (evento do servidor, pra todo mundo ver a mesma coisa)
  setDance(id, d) {
    if (!DANCE_IDS.includes(d)) return;
    this.dance.set(id, { d, at: this.t });
    const c = this.chars.find(x => x.id === id); if (c) this.play(c, d);
  }
  play(c, d) {
    const s = c.st;
    if (s.m === 'dance') { if (s.d !== d) { s.prev = s.d; s.prevT = s.dT; s.fade = 0; s.d = d; s.dT = 0; } else s.dT = 0; return; }
    if (s.m === 'toRest' && s.t < 0.3) { s.prev = s.d; s.prevT = s.dT; s.fade = 0; s.d = d; s.dT = 0; s.m = 'dance'; return; } // a mao ainda nao tinha pegado a arma
    const g = s.m === 'toRest' ? sm((s.t - 0.3) / 0.55) : 1; // pega de onde a arma esta
    s.m = 'toDance'; s.t = (1 - g) * 0.4; s.d = d; s.dT = 0; s.prev = null;
  }

  // spot = podiumSpot(M); people = [{ id, name, team, look, bot, wpn, lo }] do 1o ao 3o
  start(scene, M, spot, people) {
    const early = [...this.dance]; this.stop(); this.dance = new Map(early); // quem apertou enquanto esta tela ainda passava a camera final
    this.scene = scene; this.spot = spot; this.t = 0; this.path = podiumCam(M, spot); this.fx = new DanceFx(scene);
    const st = this.stage = new THREE.Group(); st.position.set(spot.x, spot.y, spot.z); st.rotation.y = spot.yaw; scene.add(st);
    this.chars = people.slice(0, 3).map((p, i) => {
      const S = POD_SPOTS[i], ch = new Character(p.team, p.name, p.look || null);
      const d = drum(S.h); d.position.x = S.x; st.add(d);
      ch.root.position.set(S.x, S.h, 0); ch.shadow.visible = false; st.add(ch.root);
      ch.setWeapon(p.wpn, p.lo ? { ...p.lo, handle: null } : null);
      const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(i + 1 + 'º', { burst: false, size: 256, fill: '#faf8f2' }), transparent: true })); n.scale.set(1.1, 1.1, 1); n.position.set(S.x, Math.max(0.3, S.h * 0.5), -1.2); st.add(n);
      return { ...p, ch, i, st: { m: 'rest', t: 0, d: null, dT: 0, prev: null, prevT: 0, fade: 1 }, botAt: p.bot ? INTRO * 0.6 + i * 1.3 + (hashOf(p.id) % 10) * 0.08 : Infinity };
    });
    for (const [id, D] of early) { const c = this.chars.find(x => x.id === id); if (c) { c.botAt = Infinity; this.play(c, D.d); } }
    this.on = true;
  }
  // arma entre as costas (g 0) e o descanso (g 1), subindo um pouco no meio do caminho; devolve tambem onde ficam as duas maos
  gunAt(c, g) {
    const u = c.ch.gun.userData, q = new THREE.Quaternion().copy(SLING.q).slerp(REST.q, g);
    const grip = new THREE.Vector3().lerpVectors(SLING.grip, REST.grip, g); grip.x += Math.sin(g * Math.PI) * 0.12; grip.z -= Math.sin(g * Math.PI) * 0.22;
    const pos = grip.clone().sub(V.copy(u.gripR.position).applyQuaternion(q));
    const left = V2.copy(u.gripL.position).applyQuaternion(q).add(pos);
    return { pos, quat: q, hR: grip.toArray(), hL: left.toArray() };
  }
  poseOf(c, dt) {
    const s = c.st; s.t += dt; if (s.m !== 'rest') s.dT += dt;
    const R = restPose(this.t, c.i * 2.1);
    const danced = () => { let P = dancePose(s.d, Math.max(0, s.dT)); if (s.prev && s.fade < 1) { s.fade = Math.min(1, s.fade + dt / FADE); P = mixPose(dancePose(s.prev, s.prevT += dt), P, sm(s.fade)); } return P; };
    const reach = (g) => { const a = this.gunAt(c, g), P = { ...R, hR: a.hR, cR: REACH_C, hL: HIP_L, cL: HIP_LC }; return { P, a }; };
    if (s.m === 'rest') { const a = this.gunAt(c, 1); return { pose: { ...R, hR: a.hR, hL: a.hL }, gun: a }; }
    if (s.m === 'dance') {
      if (s.dT >= danceLen(s.d)) { s.m = 'toRest'; s.t = 0; }
      return { pose: danced(), gun: this.gunAt(c, 0) };
    }
    if (s.m === 'toRest') { // a dança vai parando enquanto a mao sobe; pega nas costas, traz pra frente; a esquerda segura no fim
      const blend = sm(s.t / 0.35), g = sm((s.t - 0.3) / 0.55), lk = sm((s.t - 0.6) / 0.35), { P, a } = reach(g);
      const pose = mixPose(danced(), { ...P, cR: mix3(REACH_C, R.cR, g) }, blend);
      pose.hL = mix3(pose.hL, a.hL, lk); pose.cL = mix3(pose.cL, R.cL, lk);
      if (s.t >= TO_REST) { s.m = 'rest'; s.d = null; s.prev = null; }
      return { pose, gun: a };
    }
    // toDance: o caminho de volta. Solta a esquerda, leva a arma pras costas, a dança entra por cima
    const g = 1 - sm(s.t / 0.4), lk = 1 - sm(s.t / 0.2), blend = sm((s.t - 0.4) / 0.42), { P, a } = reach(g);
    s.dT = Math.max(0, s.t - 0.4);
    const base = { ...P, cR: mix3(REACH_C, R.cR, g) };
    base.hL = mix3(HIP_L, a.hL, lk); base.cL = mix3(HIP_LC, R.cL, lk);
    const pose = mixPose(base, danced(), blend);
    if (s.t >= TO_DANCE) { s.m = 'dance'; }
    return { pose, gun: a };
  }
  // chamado a cada quadro antes de desenhar: mexe os bonecos e pilota a camera do jogo
  frame(dt, cam) {
    this.t += dt;
    for (const c of this.chars) {
      if (this.t >= c.botAt) { c.botAt = Infinity; const d = DANCE_IDS[hashOf(c.id) % DANCE_IDS.length]; this.setDance(c.id, d); this.onBot?.(d); }
      const { pose, gun } = this.poseOf(c, dt);
      c.ch.update(dt, { anim: 'posed', pose, gunPose: gun, alive: true, speed: 0, t: this.t, pitch: 0 });
      if (c.st.d && DANCES[c.st.d].fx && (c.st.m === 'dance' || c.st.m === 'toDance')) this.fx.tick(c.ch, c.st.d, c.st.dT);
    }
    this.fx.update(dt);
    const S = this.spot, P = this.path, k = Math.min(1, this.t / INTRO), e = k * k * k * (k * (6 * k - 15) + 10), u = 1 - e;
    const lensEnd = THREE.MathUtils.radToDeg(2 * Math.atan(Math.max(6.5, 8.2 / cam.aspect) / 2 / S.d)); // cabe o palco inteiro, em qualquer tela
    cam.position.set(u * u * P.a[0] + 2 * u * e * P.c[0] + e * e * P.b[0], u * u * P.a[1] + 2 * u * e * P.c[1] + e * e * P.b[1], u * u * P.a[2] + 2 * u * e * P.c[2] + e * e * P.b[2]);
    this.stage.updateMatrixWorld(true);
    const look = this.stage.localToWorld(V.set(0, POD_LOOK_Y, 0));
    // pousou: continua respirando de leve pro lado, a tela nunca fica morta
    const drift = sm((this.t - INTRO) / 1.5) * Math.sin((this.t - INTRO) * 0.45) * 0.4;
    if (drift) cam.position.add(Vr.set(Math.cos(S.yaw), 0, -Math.sin(S.yaw)).multiplyScalar(drift));
    cam.lookAt(look);
    cam.fov = THREE.MathUtils.lerp(Math.min(62, lensEnd + 14), lensEnd, e); cam.updateProjectionMatrix();
  }
  stop() {
    this.on = false; this.dance.clear();
    this.fx?.dispose(); this.fx = null;
    if (this.stage) this.scene?.remove(this.stage);
    for (const c of this.chars) { disposeGun(c.ch.gun); for (const H of [c.ch.armR, c.ch.armL, c.ch.legR, c.ch.legL]) { H.mesh.geometry.dispose(); H.line.geometry.dispose(); } } // mangueira e arma sao so deste boneco
    this.chars = []; this.stage = null; this.scene = null;
  }
}
