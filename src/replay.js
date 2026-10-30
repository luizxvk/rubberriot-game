// Camera da ultima morte: grava os ultimos segundos de todo mundo (20 x por segundo) e, quando a partida
// acaba, repassa o abate final antes do placar: por cima do ombro de quem matou olhando a vitima, camera
// lenta no tiro (refaz o tracer e o PLAFT) e depois gira de lado em volta de quem caiu.
// Faixas pretas de cinema e o nome de quem fechou a partida ficam no CSS (body.replay).
import * as THREE from 'three';
import { Character } from './character.js';
import { raycast } from '../shared/map.js';

const KEEP = 8, STEP = 1 / 20;
const BEFORE = 1.7, AFTER = 1.1; // segundos de partida antes e depois do abate
const SLOW = 0.28, SLOW_W = 0.3; // camera lenta em volta do instante da queda

// camera nao atravessa parede: puxa pra frente do que estiver entre o foco e ela
function unclip(M, from, to) {
  const d = [to.x - from[0], to.y - from[1], to.z - from[2]], L = Math.hypot(...d);
  if (!M || L < 0.01) return;
  const hit = raycast(M, from, d.map(x => x / L), L);
  if (hit.dist < L) { const k = Math.max(0.15, hit.dist - 0.35) / L; to.set(from[0] + d[0] * k, from[1] + d[1] * k, from[2] + d[2] * k); }
}

const lerpA = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export class Replay {
  constructor() { this.hist = []; this.shots = []; this.kill = null; this.on = false; this.lastRec = -1; this.dt = 0; }

  reset(scene) { this.done = null; this.stop(scene); this.hist.length = 0; this.shots.length = 0; this.kill = null; this.lastRec = -1; }

  // uma foto de todo mundo (remotos + eu)
  record(now, G) {
    if (this.on || now - this.lastRec < STEP) return;
    this.lastRec = now;
    const p = new Map();
    for (const r of G.remotes.values()) p.set(r.id, { pos: [...r.pos], yaw: r.char.root.rotation.y, pitch: r.pitch || 0, anim: r.anim, alive: r.alive, speed: r.speed || 0 });
    const P = G.player;
    if (P) p.set(G.myId, { pos: [...P.pos], yaw: P.yaw, pitch: P.pitch, anim: G.me?.anim || 'idle', alive: P.alive, speed: Math.hypot(P.vel[0], P.vel[2]) });
    this.hist.push({ t: now, p });
    while (this.hist.length && now - this.hist[0].t > KEEP) this.hist.shift();
    while (this.shots.length && now - this.shots[0].t > KEEP) this.shots.shift();
  }
  shot(now, s) { if (!this.on) this.shots.push({ t: now, ...s }); }
  setKill(now, e, pos) { if (!this.on) this.kill = { t: now, a: e.a || null, v: e.v, wpn: e.wpn, head: !!e.head, pos: pos ? [...pos] : null }; }

  sample(t, id) {
    const H = this.hist;
    let i = H.length - 1;
    while (i > 0 && H[i].t > t) i--;
    const a = H[i]?.p.get(id), nb = H[i + 1], b = nb?.p.get(id);
    if (!a) return b || null;
    if (!b || !a.alive || !b.alive) return a;
    const k = Math.min(1, Math.max(0, (t - H[i].t) / (nb.t - H[i].t)));
    return { pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k, a.pos[2] + (b.pos[2] - a.pos[2]) * k], yaw: lerpA(a.yaw, b.yaw, k), pitch: a.pitch + (b.pitch - a.pitch) * k, anim: a.anim, alive: a.alive, speed: a.speed };
  }

  // comeca o replay; devolve false se nao tem o que repassar (abate velho demais, sem gravacao)
  play(G, scene, fx, audio, look, done) {
    const K = this.kill, H = this.hist;
    if (!K || H.length < 10 || !G.player) return false;
    const last = H[H.length - 1].t;
    if (last - K.t > KEEP - BEFORE) return false;
    this.t0 = Math.max(H[0].t, K.t - BEFORE); this.t1 = Math.min(last, K.t + AFTER);
    this.rt = this.t0; this.done = done; this.on = true; this.fx = fx; this.audio = audio; this.G = G;
    this.firedKill = false; this.shotI = this.shots.findIndex(s => s.t >= this.t0); if (this.shotI < 0) this.shotI = this.shots.length;
    // eu tambem apareço: um boneco com o meu visual e a minha arma
    const P = G.player;
    this.ghost = new Character(G.myTeam, G.myName || '', look);
    this.ghost.setWeapon(P.wpn, P.lo?.(P.wpn) || null);
    this.ghost.tag.visible = false;
    scene.add(this.ghost.root);
    this.camPos = null; this.orbit0 = null;
    return true;
  }

  stop(scene) {
    if (this.ghost) { scene?.remove(this.ghost.root); this.ghost = null; }
    const was = this.on;
    this.on = false;
    if (was) { const d = this.done; this.done = null; d?.(); }
  }

  // avanca o relogio do replay (chamado no comeco do frame); devolve o dt da cena
  tick(realDt, scene) {
    if (!this.on) return 0;
    const K = this.kill, near = Math.abs(this.rt - K.t) < SLOW_W;
    this.speed = near ? SLOW : this.rt > K.t ? 0.7 : 1;
    this.dt = realDt * this.speed;
    this.rt += this.dt;
    // tiros gravados de quem matou: tracer e som de novo
    while (this.shotI < this.shots.length && this.shots[this.shotI].t <= this.rt) {
      const s = this.shots[this.shotI++];
      if (s.t > this.t1) break;
      this.fx.bullet(s.o, s.e, s.tracer, s.wpn);
      this.audio.play(s.snd || s.wpn, { pos: s.o, vol: 0.7, rate: near ? 0.7 : 1, key: 'rpgun', max: 2 });
    }
    if (!this.firedKill && this.rt >= K.t) { this.firedKill = true; this.killFx(); }
    if (this.rt >= this.t1) { this.stop(scene); return 0; }
    return this.dt;
  }

  // a queda: se nao gravou o tiro (o meu e' local), desenha um do matador ate a vitima
  killFx() {
    const K = this.kill, fx = this.fx, v = this.sample(K.t - 0.05, K.v)?.pos || K.pos;
    if (!v) return;
    const a = K.a && this.sample(K.t - 0.05, K.a);
    const hadShot = this.shots.some(s => s.id === K.a && Math.abs(s.t - K.t) < 0.3);
    if (a && !hadShot) {
      const fxd = -Math.sin(a.yaw), fzd = -Math.cos(a.yaw);
      fx.bullet([a.pos[0] + fxd * 0.6, a.pos[1] + 1.35, a.pos[2] + fzd * 0.6], [v[0], v[1] + (K.head ? 1.6 : 1.1), v[2]], this.G.tracerOf?.(K.a) || 'chalk', K.wpn);
      this.audio.play(K.wpn, { pos: a.pos, vol: 0.8, rate: 0.7, key: 'rpgun', max: 2 });
    }
    fx.puff([v[0], v[1] + 0.8, v[2]], 9, 1.1, 0xece9e1, 0.9);
    fx.splat([v[0], v[1], v[2]], 1.8);
    fx.stars([v[0], v[1] + 1.2, v[2]]);
    fx.word(K.head ? 'BONK!' : ['PLAFT!', 'SPLASH!', 'CATAPLOFT!'][Math.floor(Math.random() * 3)], [v[0], v[1] + 2, v[2]], 2.6, 1.6);
    this.audio.play('death', { pos: [v[0], v[1] + 1, v[2]], vol: 0.9, rate: 0.8 });
    this.G.shake?.(0.15);
  }

  // poe cada boneco onde ele estava naquele instante
  pose(r, id) {
    const s = this.sample(this.rt, id);
    if (!s) return false;
    r.pos[0] = s.pos[0]; r.pos[1] = s.pos[1]; r.pos[2] = s.pos[2];
    r.char.root.position.fromArray(s.pos);
    r.char.root.rotation.y = s.yaw;
    r.char.update(this.dt, { anim: s.anim, pitch: s.pitch, alive: s.alive, speed: s.speed, t: this.rt, airH: s.pos[1] });
    r.char.lod(0);
    r.char.tag.visible = false;
    return true;
  }

  // camera de cinema (chamada depois de toda a camera da partida, por cima dela)
  camera(camera, realDt, G) {
    if (!this.on) return;
    if (this.ghost) {
      const s = this.sample(this.rt, G.myId);
      if (s) {
        this.ghost.root.position.fromArray(s.pos); this.ghost.root.rotation.y = s.yaw;
        this.ghost.update(this.dt, { anim: s.anim, pitch: s.pitch, alive: s.alive, speed: s.speed, t: this.rt, airH: s.pos[1] });
        this.ghost.tag.visible = false;
      } else this.ghost.root.visible = false;
    }
    for (const r of G.remotes.values()) r.char.root.visible = r.char.deadT < 1.4; // o espectador escondia o assistido
    const K = this.kill, d = this.rt - K.t;
    const v = this.sample(Math.min(this.rt, K.t), K.v)?.pos || K.pos;
    const a = K.a && K.a !== K.v ? this.sample(this.rt, K.a) : null;
    if (!v) return;
    const want = new THREE.Vector3(), look = new THREE.Vector3();
    let k = 1 - Math.exp(-5 * realDt);
    if (a && d < 0) {
      // por cima do ombro do matador, olhando a vitima
      let ux = v[0] - a.pos[0], uz = v[2] - a.pos[2];
      const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L;
      // de lado o bastante pro matador ficar no canto e a vitima no meio
      const back = Math.min(3, 2 + L * 0.03);
      want.set(a.pos[0] - ux * back + uz * 1.25, a.pos[1] + 2.2, a.pos[2] - uz * back - ux * 1.25);
      look.set(v[0] - uz * 0.6, v[1] + 1, v[2] + ux * 0.6);
      unclip(G.M, [a.pos[0], a.pos[1] + 1.7, a.pos[2]], want);
      this.orbit0 = Math.atan2(want.x - v[0], want.z - v[2]) + Math.PI * 0.5; // a orbita sai de lado
      if (!this.camPos) k = 1;
    } else {
      // de lado, girando devagar em volta de quem caiu
      if (this.orbit0 == null) this.orbit0 = a ? Math.atan2(a.pos[0] - v[0], a.pos[2] - v[2]) + Math.PI * 0.5 : 0;
      const ang = this.orbit0 + Math.max(0, d + SLOW_W) * 0.5, R = 5.8; // longe o bastante pra nuvem do PLAFT nao tampar
      want.set(v[0] + Math.sin(ang) * R, v[1] + 2.6, v[2] + Math.cos(ang) * R);
      look.set(v[0], v[1] + 0.9, v[2]);
      unclip(G.M, [v[0], v[1] + 1.2, v[2]], want);
      if (!this.camPos) k = 1;
      else if (d < SLOW_W && a) k = 1 - Math.exp(-2.2 * realDt); // desliza do ombro pra orbita
    }
    this.camPos ||= want.clone();
    this.camPos.lerp(want, k);
    this.look = this.look ? this.look.lerp(look, k) : look.clone();
    camera.position.copy(this.camPos);
    camera.lookAt(this.look);
    camera.fov += (48 - camera.fov) * Math.min(1, realDt * 6);
    camera.updateProjectionMatrix();
  }
}
