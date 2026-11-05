// Camera da ultima morte: grava os ultimos segundos de todo mundo (20 x por segundo) e, quando a partida
// acaba, repassa o abate final antes do placar: por cima do ombro de quem matou olhando a vitima, camera
// lenta no tiro (refaz o tracer e o PLAFT). 04/11 (pedido dele, tela final do COD): nos ultimos takes a camera mergulha
// na cabeca de quem matou e fica em primeira pessoa ate o fim, com a arma, a mira e os tiros dele, no ritmo da gravacao.
// Sem matador com arma na mao (bigorna, queda...): gira de lado em volta de quem caiu, como antes.
// Faixas pretas de cinema e o nome de quem fechou a partida ficam no CSS (body.replay).
import * as THREE from 'three';
import { Character } from './character.js';
import { isSaber } from './arsenal.js';
import { raycast } from '../shared/map.js';

const KEEP = 14, STEP = 1 / 20; // 14 s: da pra repassar o ultimo abate do jogador no clipe
const BEFORE = 5, AFTER = 1.6; // segundos de partida antes e depois do abate
const DIVE0 = -2.6, DIVE1 = -1.1; // o mergulho pra primeira pessoa: comeca e termina (segundos antes do abate)
const BLADE = new Set(['melee', 'fists']);
const HELD = new Set(['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg', 'melee', 'fists', 'minigun', 'rpg', 'ubshot']); // abate com arma na mao
const EYE = (anim) => (anim === 'crouch' || anim === 'slide' ? 1.05 : 1.55);
const SLOW = 0.28, SLOW_W = 0.3; // camera lenta em volta do instante da queda
const CLIP_BEFORE = 6, CLIP_AFTER = 2.5; // clipe da jogada: repasse mais longo (~10 s com a camera lenta)

// camera nao atravessa parede: puxa pra frente do que estiver entre o foco e ela
function unclip(M, from, to) {
  const d = [to.x - from[0], to.y - from[1], to.z - from[2]], L = Math.hypot(...d);
  if (!M || L < 0.01) return;
  const hit = raycast(M, from, d.map(x => x / L), L);
  if (hit.dist < L) { const k = Math.max(0.15, hit.dist - 0.35) / L; to.set(from[0] + d[0] * k, from[1] + d[1] * k, from[2] + d[2] * k); }
}

const tmpP = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler();
const lerpA = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

export class Replay {
  constructor() { this.hist = []; this.shots = []; this.swings = []; this.kill = null; this.on = false; this.lastRec = -1; this.dt = 0; }

  reset(scene) { this.overAt = null; this.done = null; this.stop(scene); this.hist.length = 0; this.shots.length = 0; this.swings.length = 0; this.kill = null; this.mine = null; this.lastRec = -1; }

  // uma foto de todo mundo (remotos + eu)
  record(now, G) {
    if (this.on || now - this.lastRec < STEP) return;
    // 04/11: o abate final e o fim da partida chegam juntos. Parar de gravar no fim deixava a gravacao terminar ANTES do abate
    // e o replay acabava sem mostrar a morte. Grava mais um pouco; depois congela (o clipe repassa o fim)
    if (G.snap?.over) { this.overAt ??= now; if (now - this.overAt > CLIP_AFTER) return; }
    this.lastRec = now;
    const p = new Map();
    for (const r of G.remotes.values()) p.set(r.id, { pos: [...r.pos], yaw: r.char.root.rotation.y, pitch: r.pitch || 0, anim: r.anim, alive: r.alive, speed: r.speed || 0, wpn: r.wpn, ad: r.ad || 0, ca: r.ca || 0, eye: EYE(r.anim) });
    const P = G.player;
    if (P) p.set(G.myId, { pos: [...P.pos], yaw: P.yaw, pitch: P.pitch, anim: G.me?.anim || 'idle', alive: P.alive, speed: Math.hypot(P.vel[0], P.vel[2]), wpn: P.wpn, ad: P.adsK || 0, ca: G.vm?.canted ? 1 : 0, eye: P.eye || 1.55 });
    this.hist.push({ t: now, p });
    while (this.hist.length && now - this.hist[0].t > KEEP) this.hist.shift();
    while (this.shots.length && now - this.shots[0].t > KEEP) this.shots.shift();
    while (this.swings.length && now - this.swings[0].t > KEEP) this.swings.shift();
  }
  shot(now, s) { if (!this.on) this.shots.push({ t: now, ...s }); }
  swing(now, id) { if (!this.on) this.swings.push({ t: now, id }); } // golpes de arma branca: o replay repete (04/11, pedido dele)
  setKill(now, e, pos, myId) { if (this.on) return; this.kill = { t: now, a: e.a || null, v: e.v, wpn: e.wpn, head: !!e.head, pos: pos ? [...pos] : null, bn: e.bn || null }; if (myId && e.a === myId) this.mine = this.kill; } // mine = ultimo abate meu (clipe)
  // clipe: tem abate meu (ou o final) ainda dentro da gravacao?
  clipKill() { const last = this.hist[this.hist.length - 1]?.t ?? -1, ok = (K) => K && last - K.t <= KEEP - CLIP_BEFORE && this.hist.length >= 10; return ok(this.mine) ? this.mine : ok(this.kill) ? this.kill : null; }

  sample(t, id) {
    const H = this.hist;
    let i = H.length - 1;
    while (i > 0 && H[i].t > t) i--;
    const a = H[i]?.p.get(id), nb = H[i + 1], b = nb?.p.get(id);
    if (!a) return b || null;
    if (!b || !a.alive || !b.alive) return a;
    const k = Math.min(1, Math.max(0, (t - H[i].t) / (nb.t - H[i].t)));
    return { ca: k < 0.5 ? a.ca : b.ca, pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * k, a.pos[1] + (b.pos[1] - a.pos[1]) * k, a.pos[2] + (b.pos[2] - a.pos[2]) * k], yaw: lerpA(a.yaw, b.yaw, k), pitch: a.pitch + (b.pitch - a.pitch) * k, anim: a.anim, alive: a.alive, speed: a.speed, wpn: a.wpn, ad: a.ad + (b.ad - a.ad) * k, eye: a.eye + (b.eye - a.eye) * k };
  }

  // olho de quem matou: curva suave que passa exatamente por cada foto (linear a 20/s dava quina na primeira pessoa)
  sampleEye(t, id) {
    const H = this.hist; let i = H.length - 1;
    while (i > 0 && H[i].t > t) i--;
    const s1 = H[i]?.p.get(id), s2 = H[i + 1]?.p.get(id), s0 = H[i - 1]?.p.get(id) || s1, s3 = H[i + 2]?.p.get(id) || s2;
    if (!s1 || !s2 || !s1.alive || !s2.alive) { const s = this.sample(t, id); return s && { pos: s.pos, yaw: s.yaw, pitch: s.pitch, eye: s.eye ?? 1.55 }; }
    const u = Math.min(1, Math.max(0, (t - H[i].t) / (H[i + 1].t - H[i].t)));
    const cr = (a, b, c, d) => b + 0.5 * u * (c - a + u * (2 * a - 5 * b + 4 * c - d + u * (3 * (b - c) + d - a)));
    const un = (a) => s1.yaw + Math.atan2(Math.sin(a - s1.yaw), Math.cos(a - s1.yaw));
    return { pos: [0, 1, 2].map(k => cr(s0.pos[k], s1.pos[k], s2.pos[k], s3.pos[k])), yaw: cr(un(s0.yaw), s1.yaw, un(s2.yaw), un(s3.yaw)), pitch: cr(s0.pitch, s1.pitch, s2.pitch, s3.pitch), eye: s1.eye + (s2.eye - s1.eye) * u };
  }
  // estado da arma na mao durante a primeira pessoa (null = a arma nao aparece)
  vmState() {
    if (!this.on || !this.fpVm) return null;
    const s = this.sample(this.rt, this.kill.a); if (!s) return null;
    const sp = s.speed || 0, run = s.anim === 'sprint' || s.anim === 'tac';
    return { dt: this.dt, moving: sp > 1.5 && s.anim !== 'jump', speed: sp, sprint: run, tac: s.anim === 'tac', ads: this.bigScope && !s.ca ? 0 : s.ad || 0, crouch: s.anim === 'crouch', air: s.anim === 'jump', pistolSprint: run && s.wpn === 'pistol', lookDX: 0, lookDY: 0, firing: false };
  }

  // comeca o replay; devolve false se nao tem o que repassar (abate velho demais, sem gravacao)
  play(G, scene, fx, audio, look, done, clip = false) {
    const K = this.kill, H = this.hist;
    if (!K || H.length < 10 || !G.player) return false;
    const last = H[H.length - 1].t;
    if (last - K.t > KEEP - (clip ? CLIP_BEFORE : BEFORE)) return false;
    this.t0 = Math.max(H[0].t, K.t - (clip ? CLIP_BEFORE : BEFORE)); this.t1 = K.t + (clip ? CLIP_AFTER : AFTER); // nunca pela gravacao: o fim do replay e sempre depois do abate
    this.rt = this.t0; this.done = done; this.on = true; this.fx = fx; this.audio = audio; this.G = G;
    // abate de lamina sem golpe gravado (o meu e' local, o do bot pode nao ter evento): o golpe acerta no instante da queda
    if (BLADE.has(K.wpn) && K.a && !this.swings.some(s => s.id === K.a && s.t > K.t - 0.6 && s.t <= K.t + 0.1)) { this.swings.push({ t: K.t - 0.2, id: K.a }); this.swings.sort((a, b) => a.t - b.t); }
    this.swingI = this.swings.findIndex(s => s.t >= this.t0); if (this.swingI < 0) this.swingI = this.swings.length;
    this.firedKill = false; this.shotI = this.shots.findIndex(s => s.t >= this.t0); if (this.shotI < 0) this.shotI = this.shots.length;
    // eu tambem apareço: um boneco com o meu visual e a minha arma
    const P = G.player;
    this.ghost = new Character(G.myTeam, G.myName || '', look);
    this.ghost.setWeapon(P.wpn, P.lo?.(P.wpn) || null);
    this.ghost.tag.visible = false;
    scene.add(this.ghost.root);
    this.camPos = null; this.orbit0 = null; this.fov0 = G.camera?.fov || 75; this.fpVm = false; this.fpKey = null; this.bigScope = false;
    return true;
  }

  stop(scene) {
    if (this.ghost) { scene?.remove(this.ghost.root); this.ghost = null; }
    const was = this.on;
    this.on = false; this.fpVm = false;
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
      if (this.fpVm && s.id === K.a) this.vm?.fire(this.kickOf?.(s.wpn) || 1); // o coice aparece na arma, no mesmo instante do tiro
    }
    while (this.swingI < this.swings.length && this.swings[this.swingI].t <= this.rt) this.playSwing(this.swings[this.swingI++]);
    if (!this.firedKill && this.rt >= K.t) { this.firedKill = true; this.killFx(); }
    if (this.rt >= this.t1) { this.stop(scene); return 0; }
    return this.dt;
  }

  // golpe na camera final: na mao em primeira pessoa, no boneco de fora
  playSwing(s) {
    const G = this.G, K = this.kill;
    if (s.t > this.t1) return;
    if (this.fpVm && s.id === K.a) {
      const lo = K.wpn === 'fists' ? { fists: true } : K.a === G.myId ? G.player?.lo?.('melee') : G.remoteLo?.get(K.a)?.melee;
      this.vm?.meleeSwing(0.7, lo || null);
    } else if (s.id === G.myId) this.ghost?.swing?.();
    else G.remotes.get(s.id)?.char.swing?.();
    const body = s.id === G.myId ? G.player?.lo?.('melee')?.body : G.remoteLo?.get(s.id)?.melee?.body, sb = isSaber(body);
    this.audio.play(sb ? 'saber_swing' : 'whoosh', { pos: this.sample(this.rt, s.id)?.pos, vol: 0.7, rate: sb ? 0.85 : 1, key: 'rpgun', max: 2 });
  }

  // a queda: se nao gravou o tiro (o meu e' local), desenha um do matador ate a vitima
  killFx() {
    const K = this.kill, fx = this.fx, v = this.sample(K.t - 0.05, K.v)?.pos || K.pos;
    if (!v) return;
    const a = K.a && this.sample(K.t - 0.05, K.a);
    const hadShot = this.shots.some(s => s.id === K.a && Math.abs(s.t - K.t) < 0.3);
    if (a && !hadShot && !BLADE.has(K.wpn)) { // lamina nao solta tiro
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
  camera(camera, realDt, G, vm) {
    if (!this.on) return;
    this.vm = vm;
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
    const fpOk = !!a && HELD.has(K.wpn);
    if (a && (d < 0 || fpOk)) {
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
    let fov = 48;
    if (fpOk) { // mergulho: da posicao de cinema pro olho, sem corte. Em w = 1 a camera E o olho gravado
      const u = Math.min(1, Math.max(0, (d - DIVE0) / (DIVE1 - DIVE0))), w = u * u * u * (u * (u * 6 - 15) + 10), e = w > 0 ? this.sampleEye(this.rt, K.a) : null;
      if (e) {
        camera.position.lerp(tmpP.set(e.pos[0], e.pos[1] + e.eye, e.pos[2]), w);
        camera.quaternion.slerp(tmpQ.setFromEuler(tmpE.set(e.pitch, e.yaw, 0, 'YXZ')), w);
        const ad = a.ad || 0, big = !!vm?.gun?.userData.scope?.big;
        this.bigScope = big && ad > 0.5; // luneta na cara: nao tem a imagem dela aqui, so fecha o quadro
        fov = 48 + (this.fov0 / (1 + ad * (big ? 1.4 : 0.25)) - 48) * w;
        if (camera.position.distanceTo(tmpP) < 1.4) { // chegando na cabeca: o corpo dele some antes da camera entrar nele
          const r = G.remotes.get(K.a); if (r) r.char.root.visible = false; if (K.a === G.myId && this.ghost) this.ghost.root.visible = false;
        }
        if (w > 0.55 && a.wpn) {
          const key = K.a + '|' + a.wpn;
          if (this.fpKey !== key) { this.fpKey = key; G.specVm = 'replay'; vm?.setWeapon(a.wpn, K.a === G.myId ? G.player?.lo?.(a.wpn) : G.remoteLo?.get(K.a)?.[a.wpn] || null); vm?.setGloves(G.lookOfId?.(K.a)); }
          this.fpVm = !this.bigScope || !!a.ca; // mira 45 graus: a luneta sai e a troca aparece na tela de morte (05/11)
          if (vm) vm.canted = !!a.ca && !!vm.gun?.userData.canted;
        }
      }
    }
    camera.fov += (fov - camera.fov) * Math.min(1, realDt * 6);
    camera.updateProjectionMatrix();
  }
}
