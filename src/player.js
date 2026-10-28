// Jogador local: movimento rapido de boomer shooter (corrida, disparada, carrinho,
// pulo duplo), tiro hitscan/projetil, recarga e troca de arma.
import * as THREE from 'three';
import { moveBody, raycast, rayPlayer, hasLOS } from '../shared/map.js';
import { WEAPONS, PRIMARIES, NADES, bodyTrait } from '../shared/weapons.js';
import { loadoutStats, nativePart } from './arsenal.js';
import { CAMOS } from './camos.js';
import { camoUnlocked } from './progress.js';
import { audio } from './audio.js';
import { isTouch } from './input.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const SLOT_ORDER = ['pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'melee'];

export class Player {
  constructor(game) {
    this.g = game;
    this.pos = [0, 0, 0]; this.vel = [0, 0, 0];
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.onGround = true; this.wasGround = true; this.airJumps = 1;
    this.crouch = false; this.slideT = 0; this.eye = 1.6;
    this.sprint = false; this.tac = false; this.tacFuel = 3.5; this.sprintOut = 0;
    this.owned = []; this.ammo = {}; this.wpn = 'smg'; this.lastWpn = 'pistol';
    this.fireT = 0; this.reloadT = 0; this.switchT = 0; this.adsK = 0; this.spinK = 0;
    this.alive = false; this.hp = 100;
    this.stepPhase = 0; this.lastStep = 0; this.firing = false;
    this.sendT = 0; this.recoilP = 0; this.recoilY = 0;
    this.forced = false;
    this.nades = { frag: 1, flash: 1 }; this.throwT = 0;
    this.patIdx = 0; this.patT = 0;
  }

  // pecas da arma: na escada de armas o modelo e' o do degrau, fora dela a classe do Arsenal
  lo(id) { return this.g.mode === 'gungame' && this.ggBody && id === this.wpn ? this.ggLo(id, this.ggBody) : this.g.loadouts[id]; }

  // escada de armas: mira padrao do modelo (sniper sai com a luneta dela) e uma camuflagem sorteada
  // entre as que o jogador ja liberou pra essa arma; fica a mesma enquanto durar a partida
  ggLo(wpn, body) {
    const key = wpn + '|' + body;
    let lo = (this.ggCache ||= new Map()).get(key);
    if (!lo) {
      const camos = CAMOS.filter(c => c.id !== 'none' && camoUnlocked(wpn, c));
      lo = { body, scope: wpn === 'sniper' ? nativePart(body, 'scope') : null, charger: wpn === 'melee' ? undefined : nativePart(body, 'charger'), camo: camos.length ? camos[Math.floor(Math.random() * camos.length)].id : null };
      this.ggCache.set(key, lo);
    }
    return lo;
  }

  stats(id = this.wpn) {
    const W = WEAPONS[id];
    const st = loadoutStats(id, this.lo(id));
    return { W, st, mag: W.mag === Infinity ? Infinity : Math.max(1, Math.round(W.mag * st.mag)) };
  }

  spawn(ev) {
    this.ggBody = ev.body || null;
    this.pos = [...ev.pos]; this.vel = [0, 0, 0]; this.recoilP = 0; this.recoilY = 0;
    this.yaw = ev.yaw; this.pitch = 0;
    this.alive = true; this.hp = 100;
    this.nades = { frag: 1, flash: 1 }; this.patIdx = 0;
    this.owned = []; this.ammo = {};
    // fora da escada de armas: nasce com a classe montada no Arsenal (principal + pistola)
    if (this.g.mode === 'gungame') { this.give(ev.wpn, false); this.equip(ev.wpn, true); }
    else {
      const primary = PRIMARIES.includes(this.g.settings.primary) ? this.g.settings.primary : 'smg';
      this.give('pistol', false); this.give(primary, false); this.give('melee', false);
      this.equip(primary, true);
    }
    this.slideT = 0; this.crouch = false; this.tacFuel = 3.5;
  }

  give(id, announce = true, force = false) {
    if (!WEAPONS[id]) return;
    const { W, mag } = this.stats(id);
    if (!this.owned.includes(id)) {
      this.owned.push(id);
      this.owned.sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
    }
    this.ammo[id] = { mag, reserve: W.reserve ?? Infinity };
    if (force) { this.owned = [id]; this.equip(id); }
    else if (announce && SLOT_ORDER.indexOf(id) > SLOT_ORDER.indexOf(this.wpn)) this.equip(id);
  }

  equip(id, instant = false) {
    if (!this.owned.includes(id)) return;
    if (id !== this.wpn) this.lastWpn = this.wpn;
    this.wpn = id;
    this.reloadT = 0;
    this.switchT = instant ? 0 : 0.3;
    this.g.vm.setWeapon(id, this.lo(id), instant);
    if (!instant) audio.play('swap', { vol: 0.5 });
    this.g.hud.weapon(this);
  }

  cycle(dir) {
    if (this.owned.length < 2) return;
    const i = this.owned.indexOf(this.wpn);
    this.equip(this.owned[(i + dir + this.owned.length) % this.owned.length]);
  }

  startReload() {
    const a = this.ammo[this.wpn];
    const { W, st, mag } = this.stats();
    if (!a || a.mag >= mag || a.reserve <= 0 || this.reloadT > 0) return;
    this.burstLeft = 0;
    const dur = W.reload * st.reload;
    this.reloadT = dur;
    this.g.vm.reload(dur);
    audio.play('reload', { vol: 0.7, rate: 1.6 / dur + 0.2 });
  }

  impulse(v) { this.vel[0] += v[0]; this.vel[1] += v[1]; this.vel[2] += v[2]; this.onGround = false; }

  update(dt, inp) {
    const S = this.g.settings;
    if (!this.alive) { this.firing = false; return; }
    const safe = { pos: [...this.pos], vel: [...this.vel], yaw: this.yaw, pitch: this.pitch };
    this.step(dt, inp, S);
    // trava: numero invalido nunca chega na camera (congelava a tela e o audio)
    const ok = [...this.pos, ...this.vel, this.yaw, this.pitch, this.recoilP, this.recoilY].every(Number.isFinite);
    if (!ok) {
      console.warn('estado invalido no jogador, restaurado');
      this.pos = safe.pos; this.vel = [0, 0, 0]; this.yaw = Number.isFinite(safe.yaw) ? safe.yaw : 0; this.pitch = Number.isFinite(safe.pitch) ? safe.pitch : 0;
      this.recoilP = 0; this.recoilY = 0;
    }
  }

  step(dt, inp, S) {
    // olhar
    const sensK = S.sens * 0.0022 * (this.adsK > 0.5 ? S.adsSens * (1 / (this.zoomNow || 1)) ** 0.5 : 1);
    this.yaw -= inp.lookX * sensK;
    this.pitch -= inp.lookY * sensK * (S.invertY ? -1 : 1);
    this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch));
    // recuo volta sozinho
    const rp = this.recoilP * Math.min(1, dt * 10); this.recoilP -= rp; this.pitch += rp;
    const ry = this.recoilY * Math.min(1, dt * 10); this.recoilY -= ry; this.yaw += ry;

    const { W, st, mag } = this.stats();
    // celular: mira assistida puxa pro inimigo perto do centro; tiro automatico dispara com ele na mira
    // (vale pra automatica, semi, rajada e ferrolho: o gatilho "aperta" sozinho a cada tiro liberado)
    let autoShot = false;
    if (isTouch && (S.aimAssist || S.autoFire) && !W.melee) {
      const ads = this.adsK > 0.5;
      const tg = S.aimAssist ? this.assistTarget(ads ? 0.1 : 0.14) : null;
      if (tg) {
        const k = Math.min(1, (ads ? 5 : 2.6) * dt);
        let dy = Math.atan2(-tg.d[0], -tg.d[2]) - this.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const dp = Math.atan2(tg.d[1], Math.hypot(tg.d[0], tg.d[2])) - this.pitch;
        this.yaw += dy * k; this.pitch += dp * k * 0.6;
      }
      const am = this.ammo[this.wpn];
      if (S.autoFire && am && (am.mag === Infinity || am.mag > 0) && this.reloadT <= 0) {
        const cp = Math.cos(this.pitch);
        const hit = this.traceTargets(this.eyePos(), [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp], 250);
        autoShot = !!hit.player && hit.dist < (this.wpn === 'shotgun' ? 22 : 120);
      }
    }
    const fire = inp.fire || autoShot;
    const firePressed = inp.firePressed || (autoShot && this.fireT <= 0 && !(this.burstLeft > 0));
    const mx = inp.moveX, mz = inp.moveZ;
    const moving = Math.hypot(mx, mz) > 0.1;

    // corrida e disparada (duplo toque no Shift ou botao da disparada)
    const wantSprint = inp.sprint && mz > 0.3 && this.onGround !== false && !inp.ads && this.slideT <= 0;
    if (wantSprint && !this.sprint && this.sprintOut <= 0) this.sprint = true;
    if (!inp.sprint && !this.tac) this.sprint = false;
    if (mz <= 0.3 || inp.ads) { this.sprint = false; this.tac = false; }
    if (fire && (this.sprint || this.tac)) { this.sprint = false; this.tac = false; this.sprintOut = 0.12; }
    this.sprintOut -= dt;
    if (this.tac) { this.tacFuel -= dt; if (this.tacFuel <= 0) { this.tac = false; } }
    else this.tacFuel = Math.min(3.5, this.tacFuel + dt * 0.9);

    // agachar / carrinho
    if (inp.crouchPressed) {
      if ((this.sprint || this.tac) && this.onGround) {
        this.slideT = 0.8; this.sprint = false; this.tac = false;
        const hs = Math.hypot(this.vel[0], this.vel[2]) || 1;
        const boost = Math.max(hs, 15) / hs;
        this.vel[0] *= boost; this.vel[2] *= boost;
        audio.play('slide', { vol: 0.7, jitter: 0, dur: this.slideT });
      } else this.crouch = !this.crouch;
    }
    if (inp.crouchHeld === false && this.slideT <= 0 && S.holdCrouch) this.crouch = false;
    if (this.slideT > 0) { this.slideT -= dt; this.crouch = true; if (this.slideT <= 0 && !inp.crouchHeld) this.crouch = false; }
    if (inp.jumpPressed && this.slideT > 0) this.slideT = 0;
    if (inp.jumpPressed || this.sprint) { if (this.crouch && this.slideT <= 0 && (inp.jumpPressed || this.sprint)) this.crouch = false; }

    // velocidade alvo
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let speed = this.tac ? 13.5 : this.sprint ? 10.8 : 7.4;
    if (this.crouch) speed = 4;
    speed *= st.move ?? 1;
    if (this.adsK > 0.3) speed *= 0.6;
    if (W.id === 'minigun' || this.wpn === 'minigun') speed *= this.firing ? 0.6 : 0.85;
    let wx = fx * mz + rx * mx, wz = fz * mz + rz * mx;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    if (this.slideT > 0) {
      const f = this.onGround ? 1.6 : 0.3;
      this.vel[0] = damp(this.vel[0], 0, f, dt); this.vel[2] = damp(this.vel[2], 0, f, dt);
    } else {
      const acc = this.onGround ? 14 : 3.2;
      this.vel[0] = damp(this.vel[0], wx * speed, acc, dt);
      this.vel[2] = damp(this.vel[2], wz * speed, acc, dt);
    }
    // pulo e pulo duplo
    if (inp.jumpPressed) {
      if (this.onGround) { this.vel[1] = 8.6; this.onGround = false; audio.play('jump', { vol: 0.45 }); }
      else if (this.airJumps > 0) {
        this.airJumps--; this.vel[1] = 7.6;
        this.vel[0] += wx * 3; this.vel[2] += wz * 3;
        audio.play('whoosh', { vol: 0.4, rate: 1.3 });
        this.g.fx.puff([this.pos[0], this.pos[1], this.pos[2]], 3, 0.4, 0xece9e1, 0.4);
      }
    }
    this.vel[1] -= 24 * dt;
    const vy = this.vel[1];
    this.wasGround = this.onGround;
    this.onGround = moveBody(this.g.M, this.pos, this.vel, dt, 0.4, this.crouch ? 1.1 : 1.7);
    if (this.onGround) {
      this.airJumps = 1;
      if (!this.wasGround && vy < -6) { this.g.vm.landed(-vy); audio.play('land', { vol: Math.min(0.8, -vy / 20) }); }
    }
    const eyeT = this.slideT > 0 ? 0.8 : this.crouch ? 1.05 : 1.6;
    this.eye = damp(this.eye, eyeT, 12, dt);

    // passos no ritmo do balanco: fluido, alternando pe e variando um tiquinho
    const hs = Math.hypot(this.vel[0], this.vel[2]);
    if (this.onGround && hs > 1.5 && this.slideT <= 0) {
      const rate = this.tac ? 15 : this.sprint ? 12.5 : 9.5;
      const prev = Math.floor(this.stepPhase / Math.PI);
      this.stepPhase += dt * rate * Math.min(1.2, hs / 7);
      if (Math.floor(this.stepPhase / Math.PI) !== prev) {
        this.lastStep ^= 1;
        audio.play(this.lastStep ? 'step' : 'step2', { vol: (this.crouch ? 0.12 : 0.22) + Math.min(0.2, hs * 0.015), rate: 0.95 + Math.random() * 0.1, key: 'steps', max: 2 });
      }
    }

    // mira
    const adsTime = 0.16 * st.adsTime * (this.wpn === 'sniper' ? 1.5 : 1);
    const canAds = !W.noAds && this.reloadT <= 0 && !this.sprint && !this.tac && this.slideT <= 0;
    this.adsK = damp(this.adsK, inp.ads && canAds ? 1 : 0, 1 / adsTime * 1.6, dt);
    if (inp.adsPressed && canAds) audio.play('ads', { vol: 0.35 });

    // trocas
    if (!this.forced) {
      if (inp.slot >= 0 && this.owned[inp.slot]) this.equip(this.owned[inp.slot]);
      if (inp.wheel) this.cycle(inp.wheel > 0 ? 1 : -1);
      if (inp.lastPressed) this.equip(this.lastWpn);
    }
    if (inp.reloadPressed) this.startReload();
    // faca rapida (V / botao): golpe com a lamina equipada, sem largar a arma
    this.meleeCd = (this.meleeCd || 0) - dt;
    if (inp.meleePressed && this.meleeCd <= 0 && this.switchT <= 0 && this.throwT <= 0) this.melee();
    if (inp.inspectPressed && this.reloadT <= 0 && this.adsK < 0.1 && !this.sprint) this.g.vm.inspect();
    // granadas (G frag, F flash) e sequencia de abates (X)
    this.throwT -= dt;
    for (const kind of ['frag', 'flash']) {
      if (!inp[kind + 'Pressed'] || this.throwT > 0 || this.nades[kind] <= 0) continue;
      this.nades[kind]--; this.throwT = 0.6;
      const f = new THREE.Vector3(); this.g.camera.getWorldDirection(f);
      this.g.net.send({ t: 'nade', kind, d: f.toArray() });
      this.g.vm.throwNade();
      audio.play('whoosh', { vol: 0.5, rate: 0.9 });
    }
    if (inp.streakPressed && this.g.me?.ready?.length) this.g.net.send({ t: 'streak', kind: this.g.me.ready[0] });

    // recarga
    const a = this.ammo[this.wpn];
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0 && a) {
        const need = mag - a.mag, take = Math.min(need, a.reserve);
        a.mag += take; a.reserve -= take;
        this.g.hud.weapon(this);
      }
    }
    this.switchT -= dt;
    this.fireT -= dt;

    // minigun gira antes
    if (W.spin) this.spinK = fire && !this.sprint ? Math.min(1, this.spinK + dt / W.spin) : Math.max(0, this.spinK - dt);
    this.firing = fire && !this.sprint && !this.tac && this.switchT <= 0;
    // modo do modelo: automatica segura, semi uma por puxada, rajada solta N tiros seguidos
    const mode = st.mode || (W.auto ? 'auto' : 'semi');
    if (mode === 'burst' && firePressed && !(this.burstLeft > 0) && this.fireT <= 0) this.burstLeft = st.burst || 3;
    const trigger = mode === 'auto' ? fire : mode === 'burst' ? this.burstLeft > 0 : firePressed; // semi e ferrolho: uma por puxada
    if (trigger && this.fireT <= 0 && this.switchT <= 0 && this.reloadT <= 0 && this.sprintOut <= 0 && !this.sprint && !this.tac && (!W.spin || this.spinK >= 1)) {
      if (a && a.mag !== Infinity && a.mag <= 0) {
        if (a.reserve > 0) this.startReload();
        else if (inp.firePressed) audio.play('empty', { vol: 0.5 });
      } else if (W.melee) {
        if (this.meleeCd <= 0) this.melee();
      } else {
        this.shoot(W, st);
        if (mode === 'bolt') this.g.vm.bolt(W.rate * st.rate);
        if (mode === 'burst') { this.burstLeft--; this.fireT = this.burstLeft > 0 ? W.rate * st.rate * 0.6 : W.rate * st.rate * 2.4; }
      }
    }

    // camera
    this.zoomNow = st.zoom || W.zoom;
    const lean = this.slideT > 0 ? 0.08 : -mx * 0.018;
    this.roll = damp(this.roll, lean, 8, dt);

    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 1 / 20;
      const anim = !this.onGround ? 'jump' : this.slideT > 0 ? 'slide' : this.crouch ? 'crouch' : this.tac ? 'tac' : this.sprint ? 'sprint' : hs > 1 ? 'run' : 'idle';
      this.g.net.send({ t: 'state', pos: [...this.pos], yaw: this.yaw, pitch: this.pitch, anim, wpn: this.wpn });
    }
  }

  // golpe de lamina: acerta o inimigo mais perto na frente (cone de ~55 graus) dentro do alcance da lamina
  melee() {
    const g = this.g, body = this.lo('melee')?.body || 'melee_10', tr = bodyTrait(body);
    const range = tr.range || WEAPONS.melee.range;
    this.meleeCd = WEAPONS.melee.rate * (tr.rate || 1);
    this.burstLeft = 0; this.reloadT = 0;
    g.vm.meleeSwing(this.meleeCd, this.lo('melee'));
    audio.play('whoosh', { vol: 0.6, rate: 1.3 });
    g.net.send({ t: 'swing' });
    setTimeout(() => {
      if (!this.alive || this.g !== g) return;
      const eye = this.eyePos(), fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      let best = null, bd = Infinity;
      for (const r of g.remotes.values()) {
        if (!r.alive || !g.isEnemy(r)) continue;
        const dx = r.pos[0] - this.pos[0], dz = r.pos[2] - this.pos[2], d = Math.hypot(dx, dz);
        if (d > range + 0.4 || Math.abs(r.pos[1] - this.pos[1]) > 1.8 || (dx * fx + dz * fz) / (d || 1) < 0.55) continue;
        if (!hasLOS(g.M, eye, [r.pos[0], r.pos[1] + 1.1, r.pos[2]])) continue;
        if (d < bd) { bd = d; best = r; }
      }
      if (!best) return;
      const pt = [best.pos[0], best.pos[1] + 1.2, best.pos[2]];
      g.net.send({ t: 'hit', v: best.id, dmg: WEAPONS.melee.dmg, head: false, wpn: 'melee' });
      g.onHitConfirm(pt, false, WEAPONS.melee.dmg, best);
      g.fx.word(['TCHAC!', 'BONC!', 'ZAPT!'][Math.floor(Math.random() * 3)], pt, 1.6);
      audio.play('headshot', { vol: 0.7, ui: true, jitter: 0.1 });
    }, 110);
  }

  // inimigo vivo e a vista mais perto do centro da mira (cone cresce de perto, ate 60 m)
  assistTarget(maxAng) {
    const g = this.g, o = this.eyePos(), cp = Math.cos(this.pitch);
    const f = [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
    let best = null, bs = Infinity;
    for (const r of g.remotes.values()) {
      if (!r.alive || !g.isEnemy(r) || !r.pos) continue;
      const crouch = r.anim === 'crouch' || r.anim === 'slide';
      const p = [r.pos[0], r.pos[1] + (crouch ? 0.7 : 1.05), r.pos[2]];
      const d = [p[0] - o[0], p[1] - o[1], p[2] - o[2]], len = Math.hypot(d[0], d[1], d[2]);
      if (len < 0.8 || len > 60) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (d[0] * f[0] + d[1] * f[1] + d[2] * f[2]) / len)));
      const lim = maxAng + Math.atan(0.6 / len);
      if (ang > lim || ang >= bs || !hasLOS(g.M, o, p)) continue;
      bs = ang; best = { d, len };
    }
    return best;
  }

  eyePos() { return [this.pos[0], this.pos[1] + this.eye, this.pos[2]]; }

  shoot(W, st) {
    const g = this.g;
    const a = this.ammo[this.wpn];
    if (a.mag !== Infinity) a.mag--;
    this.fireT = W.rate * st.rate;
    const cam = g.camera;
    const o = this.eyePos();
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const ads = this.adsK > 0.6;
    const moving = Math.hypot(this.vel[0], this.vel[2]) > 2;
    let spread = (W.spread * st.spread) * (ads ? 1 : st.hip ?? 1) * (ads ? (W.adsSpread ?? 0.25 * W.spread) / (W.spread || 1) : 1) * (moving ? 1.5 : 1) * (this.onGround ? 1 : 2);
    // sniper sem mirar: nunca acerta o centro da mira (sorteia num anel)
    const noScope = this.wpn === 'sniper' && !ads;
    if (noScope) spread = 0.11;
    if (this.crouch) spread *= 0.75;
    const kick = (W.kick ?? 0.05) * (st.kick ?? 1);
    // recuo com padrao fixo por arma (aprende e compensa), volta ao inicio se soltar o gatilho
    if (performance.now() - this.patT > 320) this.patIdx = 0;
    this.patT = performance.now();
    const pat = W.recoil || [[1, 0]];
    const [pp, py] = pat[Math.min(this.patIdx++, pat.length - 1) % pat.length];
    // recuo cheio no quadril; mirando (ADS) segura bem mais
    const adsK = ads ? 0.42 : 1;
    this.recoilP += kick * adsK * 0.95 * pp;
    this.recoilY += kick * adsK * 0.5 * py + (Math.random() - 0.5) * kick * 0.1 * adsK;
    g.vm.fire(kick * (ads ? 0.55 : 1.3));
    g.shake(W.kick * 0.4);
    audio.play(this.wpn, { vol: this.wpn === 'smg' || this.wpn === 'minigun' ? 0.55 : 0.8, key: 'gun', max: this.wpn === 'minigun' ? 3 : 5, jitter: 0.05 });
    audio.duck(0.6, 0.25);

    // boca do cano no mundo (pra o tracer sair da arma)
    const mz = g.vm.muzzleCam();
    const muzzleWorld = mz.clone().applyMatrix4(cam.matrixWorld);

    const pellets = W.pellets || 1;
    let total = 0, head = false, victim = null, hitPoint = null, firstEnd = null;
    const dmgK = st.dmg;
    for (let i = 0; i < pellets; i++) {
      const d = fwd.clone();
      if (spread > 0) {
        const r = (noScope ? 0.35 + 0.65 * Math.sqrt(Math.random()) : Math.sqrt(Math.random())) * spread, th = Math.random() * Math.PI * 2;
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
        const rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
        d.addScaledVector(rt, Math.cos(th) * r).addScaledVector(up, Math.sin(th) * r).normalize();
      }
      const hit = this.traceTargets(o, d.toArray(), 250);
      if (i === 0 || hit.player) firstEnd = hit.point;
      if (hit.player) {
        const fall = this.wpn === 'shotgun' ? Math.max(0.2, 1 - hit.dist / 24) : this.wpn === 'smg' || this.wpn === 'pistol' ? Math.max(0.6, 1 - hit.dist / 90) : 1;
        if (!victim || victim === hit.player) { victim = hit.player; total += W.dmg * fall * dmgK; head ||= hit.head; hitPoint = hit.point; }
      } else if (hit.normal) g.fx.impact(hit.point, hit.normal);
      if (i < 3) g.fx.tracer(muzzleWorld.toArray(), hit.point, this.lo(this.wpn)?.tracer || 'chalk');
    }
    if (victim) {
      g.net.send({ t: 'hit', v: victim.id, dmg: Math.round(total), head, wpn: this.wpn });
      g.onHitConfirm(hitPoint, head, Math.round(total * (head ? 1.6 : 1)), victim);
    }
    g.net.send({ t: 'shot', o: muzzleWorld.toArray(), e: firstEnd, wpn: this.wpn });
  }

  traceTargets(o, d, max) {
    const wall = raycast(this.g.M, o, d, max);
    let best = wall.dist, player = null, head = false;
    for (const r of this.g.remotes.values()) {
      if (!r.alive || !this.g.isEnemy(r)) continue;
      const h = rayPlayer(o, d, r, best);
      if (h && h.dist < best) { best = h.dist; player = r; head = h.head; }
    }
    const dist = best === Infinity ? max : best;
    return { dist, player, head, normal: player ? null : wall.normal, point: [o[0] + d[0] * dist, o[1] + d[1] * dist, o[2] + d[2] * dist] };
  }
}
