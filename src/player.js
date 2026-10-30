// Jogador local: movimento firme estilo COD (anda, corre, agacha, pula baixo; sem carrinho
// e sem pulo duplo), tiro hitscan, recarga e troca de arma.
import * as THREE from 'three';
import { moveBody, raycast, rayPlayer, hasLOS, wallThickness } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';
import { WEAPONS, PRIMARIES, NADES, INFECT, SKILLS, AMMO, FIELD, BR, bodyTrait } from '../shared/weapons.js';
import { loadoutStats, nativePart, CATEGORY, infectLoadout, bpLoadout } from './arsenal.js';
import { CAMOS } from './camos.js';
import { camoUnlocked } from './progress.js';
import { audio } from './audio.js';
import { LASER_BODY } from './world.js';
import { t } from './i18n.js';
import { isTouch } from './input.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
// slots (teclas 1, 2, 3...): arma principal primeiro, pistola em 2, faca por ultimo
const SLOT_ORDER = ['smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'pistol', 'melee', 'fists'];
// pegou arma do chao: so troca sozinho se ela for "maior" que a da mao (faca < pistola < principais)
const PICK_RANK = ['fists', 'melee', 'pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper'];

// Deslizar (skill Carrinho, pedido dele 30/10): agachar correndo, no chao e rapido. Impulso reto que perde velocidade numa curva
// ate a do agachado; da pra virar so um pouco; pular no meio vira pulo com o embalo; agachar de novo levanta;
// bater na parede corta. Termina agachado e espera um pouco pra deslizar de novo.
const SLIDE = { dur: 0.75, boost: 2.2, minSpeed: 8, end: 4, curve: 0.7, steer: 1.4, cd: 1, jumpKeep: 0.9, eye: 0.85, roll: -0.07, spread: 1.6 };
export class Player {
  constructor(game) {
    this.g = game;
    this.pos = [0, 0, 0]; this.vel = [0, 0, 0];
    this.yaw = 0; this.pitch = 0; this.roll = 0;
    this.onGround = true; this.wasGround = true; this.airJumps = 1;
    this.crouch = false; this.slideT = 0; this.eye = 1.6;
    this.sprint = false; this.tac = false; this.tacFuel = 3.5; this.sprintOut = 0;
    this.owned = []; this.ammo = {}; this.brBp = {}; this.wpn = 'smg'; this.lastWpn = 'pistol';
    this.fireT = 0; this.reloadT = 0; this.switchT = 0; this.adsK = 0; this.spinK = 0;
    this.alive = false; this.hp = 100;
    this.stepPhase = 0; this.lastStep = 0; this.firing = false;
    this.sendT = 0; this.recoilP = 0; this.recoilY = 0;
    this.forced = false;
    this.nades = { frag: 1, flash: 1 }; this.throwT = 0;
    this.patIdx = 0; this.patT = 0;
  }

  // pecas da arma: na escada de armas o modelo e' o do degrau, fora dela a classe do Arsenal
  lo(id) {
    if (this.g.mode === 'gungame' && this.ggBody && id === this.wpn) return this.ggLo(id, this.ggBody);
    // battle royale: variante pega no chao ou no caixote vale no lugar da sua
    const bp = this.g.mode === 'br' && this.brBp?.[id];
    if (bp) return (this.bpCache ||= {})[bp] ||= bpLoadout(bp);
    // infectado: todo sobrevivente com a mesma arma sorteada pela partida (o modelo tambem), sempre
    // com o kit completo (ponto vermelho, laser, pente grande, empunhadura)
    if (this.g.mode === 'infect' && this.g.myTeam !== 'red' && id !== 'melee' && CATEGORY[id]) {
      const k = this.g.snap?.infKit?.body ?? 0, bodies = CATEGORY[id].bodies, key = id + '|' + k;
      return (this.infCache ||= {})[key] ||= infectLoadout(id, { body: bodies[k % bodies.length] });
    }
    return this.g.loadouts[id];
  }

  // escada de armas: toda arma sai com mira, a do proprio modelo (ou a primeira da categoria
  // quando o modelo nao tem), e uma camuflagem sorteada entre as liberadas; fica a mesma na partida
  ggLo(wpn, body) {
    const key = wpn + '|' + body;
    let lo = (this.ggCache ||= new Map()).get(key);
    if (!lo) {
      const camos = CAMOS.filter(c => c.id !== 'none' && camoUnlocked(wpn, c));
      const scope = wpn === 'melee' ? null : nativePart(body, 'scope') || CATEGORY[wpn]?.scopes?.[0] || null;
      lo = { body, scope, charger: wpn === 'melee' ? undefined : nativePart(body, 'charger'), camo: camos.length ? camos[Math.floor(Math.random() * camos.length)].id : null };
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
    // bate-volta: nasce caindo; o paraquedas abre no pulo (no celular abre sozinho, ajuste)
    this.air = !!ev.air; this.chute = false; this.cutChute = false;
    this.yaw = ev.yaw; this.pitch = 0;
    this.alive = true; this.hp = 100;
    this.nades = this.g.mode === 'br' ? { frag: 0, flash: 0 } : { frag: 1, flash: 1 }; this.patIdx = 0;
    this.owned = []; this.ammo = {};
    // escada de armas e infectado: o servidor decide o kit (infectado = so a lamina)
    if (this.g.mode === 'gungame') { this.give(ev.wpn, false); this.equip(ev.wpn, true); }
    else if ((this.g.mode === 'infect' || this.g.mode === 'br') && ev.owned?.length) { // infectado e battle royale: o servidor decide o kit
      for (const w of ev.owned) this.give(w, false);
      this.equip(ev.wpn, true);
    }
    else {
      const primary = PRIMARIES.includes(this.g.settings.primary) ? this.g.settings.primary : 'smg';
      this.give('pistol', false); this.give(primary, false); this.give('melee', false);
      this.equip(primary, true);
    }
    this.crouch = false; this.tacFuel = 3.5; this.slideT = 0; this.slideDir = null; this.slideCd = 0;
  }

  give(id, announce = true, force = false) {
    if (!WEAPONS[id]) return;
    const { W, mag } = this.stats(id);
    if (!this.owned.includes(id)) {
      this.owned.push(id);
      this.owned.sort((a, b) => SLOT_ORDER.indexOf(a) - SLOT_ORDER.indexOf(b));
    }
    this.ammo[id] = { mag, reserve: Number.isFinite(W.reserve) ? Math.round(W.reserve * this.sk('bolso', 'reserve')) : Infinity };
    if (force) { this.owned = [id]; this.ammo = { [id]: this.ammo[id] }; this.equip(id); }
    else if (announce && PICK_RANK.indexOf(id) > PICK_RANK.indexOf(this.wpn)) this.equip(id);
  }

  // skill passiva equipada (G.skills vem do loadout enviado): devolve o campo dela ou 1
  sk(id, key) { return this.g.skills?.includes(id) ? SKILLS[id][key] : 1; }
  // catador: cada abate devolve um pente na reserva da arma na mao
  scavenge() {
    if (!this.g.skills?.includes('catador')) return;
    const a = this.ammo[this.wpn];
    if (!a || !Number.isFinite(a.reserve)) return;
    a.reserve += this.stats(this.wpn).mag * SKILLS.catador.mags;
    audio.play('pickup', { vol: 0.35, rate: 1.4 });
  }
  // sangue frio: so vale com pouca vida
  cold(key) { return this.hp < SKILLS.sangue.below ? this.sk('sangue', key) : 1; }

  equip(id, instant = false) {
    if (!this.owned.includes(id)) return;
    if (id !== this.wpn) this.lastWpn = this.wpn;
    this.wpn = id;
    this.reloadT = 0;
    this.switchT = instant ? 0 : 0.3 * this.sk('maos', 'swap');
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
    const dur = W.reload * st.reload * this.sk('maos', 'reload') * this.cold('reload');
    this.reloadT = dur; this.reloadDur = dur; // o anel da mira enche com isso
    this.g.vm.reload(dur);
    audio.play('reload', { vol: 0.7, rate: 1.6 / dur + 0.2 });
  }

  impulse(v) { this.vel[0] += v[0]; this.vel[1] += v[1]; this.vel[2] += v[2]; this.onGround = false; }

  // fim do deslize: crouch = termina agachado (tempo acabou ou parede); false = levanta (pulo ou cancelou)
  endSlide(crouch, why = '') {
    if (!(this.slideT > 0) && !this.slideDir) return;
    this.slideWhy = why;
    this.slideT = 0; this.slideDir = null; this.slideCd = SLIDE.cd;
    this.crouch = crouch; // com "agachar segurando" o proximo quadro levanta se a tecla estiver solta
  }
  update(dt, inp) {
    const S = this.g.settings;
    if (!this.alive) { this.firing = false; return; }
    // contagem de inicio (todo mundo carregando / 3, 2, 1): da pra olhar em volta, nao da pra se mexer
    // plantando / desarmando: parado no lugar, segurando o botao
    const B = this.g.snap?.bomb, acting = (B && B.actor === this.g.myId && B.prog > 0) || this.g.pumping; // dupla: enchendo a bomba no parceiro = parado
    if (this.g.mode === 'bomb' || this.g.mode === 'br') { const use = !!inp.use; if (use !== this.lastUse) { this.lastUse = use; this.g.net?.send({ t: 'use', v: use }); } }
    if (this.g.snap?.freeze > 0 || acting) inp = { ...inp, moveX: 0, moveZ: 0, fire: false, firePressed: false, jumpPressed: false, crouchPressed: false, sprint: false, meleePressed: false, fragPressed: false, flashPressed: false, streakPressed: false, reloadPressed: false };
    // dupla: caido so rasteja (nada de tiro, pulo, corrida, granada, faca ou equipamento)
    if (this.g.down) inp = { ...inp, fire: false, firePressed: false, jumpPressed: false, crouchPressed: false, sprint: false, meleePressed: false, fragPressed: false, flashPressed: false, streakPressed: false, reloadPressed: false, fieldPressed: false, ads: false, adsPressed: false, tacPressed: false, lastPressed: false };
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
    // celular e controle: mira assistida puxa pro inimigo perto do centro. Tiro automatico (so no
    // toque) dispara com ele na mira: vale pra automatica, semi, rajada, ferrolho e a lamina.
    let autoShot = false;
    const pad = this.g.pad?.active;
    // lamina: golpeia sozinha com inimigo no alcance e na frente (o botao de atirar some com o automatico)
    if (isTouch && S.autoFire && W.melee && this.meleeCd <= 0) autoShot = !!this.meleeTarget();
    if ((isTouch || pad) && (S.aimAssist || (isTouch && S.autoFire)) && !W.melee) {
      const ads = this.adsK > 0.5;
      // controle: so puxa mirando ou atirando (no quadril parado ficaria grudento)
      const tg = S.aimAssist && (!pad || ads || inp.fire) ? this.assistTarget(ads ? 0.1 : 0.14) : null;
      if (tg) {
        const k = Math.min(1, (ads ? 5 : 2.6) * dt);
        let dy = Math.atan2(-tg.d[0], -tg.d[2]) - this.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        const dp = Math.atan2(tg.d[1], Math.hypot(tg.d[0], tg.d[2])) - this.pitch;
        this.yaw += dy * k; this.pitch += dp * k * 0.6;
      }
      const am = this.ammo[this.wpn];
      if (isTouch && S.autoFire && am && (am.mag === Infinity || am.mag > 0) && this.reloadT <= 0) {
        // antes so o raio do centro valia: alvo andando quase nunca ficava exatamente nele, e arma de
        // um tiro por puxada (pistola, 12) parecia nao disparar. Agora vale o corpo dentro de um cone
        // pequeno em volta da mira (12 = cone do espalhamento); de longe continua o raio exato.
        const shotgun = this.wpn === 'shotgun';
        const near = this.assistTarget(shotgun ? 0.05 : 0.012);
        if (near) autoShot = near.len < (shotgun ? 26 : 60);
        else {
          const cp = Math.cos(this.pitch);
          const hit = this.traceTargets(this.eyePos(), [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp], 250);
          autoShot = !!hit.player && hit.dist < (shotgun ? 26 : 120);
        }
      }
    }
    const fire = (inp.fire || autoShot) && !this.g.down; // caido: tiro automatico do toque tambem para
    const firePressed = inp.firePressed || (autoShot && !this.g.down && this.fireT <= 0 && !(this.burstLeft > 0));
    const mx = inp.moveX, mz = inp.moveZ;
    const moving = Math.hypot(mx, mz) > 0.1;

    // corrida e disparada (duplo toque no Shift ou botao da disparada)
    const wantSprint = inp.sprint && mz > 0.3 && this.onGround !== false && !inp.ads;
    if (wantSprint && !this.sprint && this.sprintOut <= 0) this.sprint = true;
    if (!inp.sprint && !this.tac) this.sprint = false;
    if (mz <= 0.3 || inp.ads) { this.sprint = false; this.tac = false; }
    if (fire && (this.sprint || this.tac)) { this.sprint = false; this.tac = false; this.sprintOut = 0.12; }
    if (this.slideT > 0) { this.sprint = false; this.tac = false; } // escorregando nao corre (Shift segurado religava e levantava)
    this.sprintOut -= dt;
    if (this.tac) { this.tacFuel -= dt; if (this.tacFuel <= 0) { this.tac = false; } }
    else this.tacFuel = Math.min(3.5, this.tacFuel + dt * 0.9);

    // deslizar: comeca no lugar do agachar quando esta correndo rapido no chao
    this.slideCd = Math.max(0, (this.slideCd || 0) - dt);
    const hsNow = Math.hypot(this.vel[0], this.vel[2]);
    if (this.slideT > 0 && inp.crouchPressed && this.slideT < SLIDE.dur - 0.2) { this.endSlide(false); inp = { ...inp, crouchPressed: false }; } // agachar de novo: levanta
    if (inp.crouchPressed && !(this.slideT > 0) && (this.g.skills?.includes('carrinho') || this.g.tutorial?.slideOn) && this.onGround && (this.sprint || this.tac) && hsNow > SLIDE.minSpeed && !this.slideCd && !this.g.down && !(this.air && this.g.bounce)) {
      this.slideT = SLIDE.dur; this.slideDir = [this.vel[0] / hsNow, this.vel[2] / hsNow]; this.slideV0 = hsNow + SLIDE.boost;
      this.crouch = true; this.sprint = false; this.tac = false; this.slideDust = 0;
      audio.play('slide', { vol: 0.6, key: 'slide', max: 1 });
      this.g.tip?.('slide');
      inp = { ...inp, crouchPressed: false };
    }
    // agachar (alterna; com "agachar segurando" solta quando larga a tecla). Correr levanta.
    if (inp.crouchPressed) { this.crouch = !this.crouch; if (this.crouch) { this.sprint = false; this.tac = false; } }
    if (inp.crouchHeld === false && S.holdCrouch && !(this.slideT > 0)) this.crouch = false;
    if (this.crouch && (inp.jumpPressed || this.sprint)) { this.crouch = false; if (inp.jumpPressed) inp = { ...inp, jumpPressed: false }; }

    // velocidade alvo
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let speed = this.tac ? 13.5 : this.sprint ? 10.8 : 7.4;
    if (this.crouch) speed = 4;
    speed *= (st.move ?? 1) * this.sk('borracha', 'move');
    if (this.adsK > 0.3) speed *= 0.6;
    if (W.id === 'minigun' || this.wpn === 'minigun') speed *= this.firing ? 0.6 : 0.85;
    if (this.g.mode === 'infect' && this.g.myTeam === 'red') speed *= INFECT.speed;
    if (this.g.down) speed *= BR.duo.crawl;
    let wx = fx * mz + rx * mx, wz = fz * mz + rz * mx;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    // bate-volta no ar: paraquedas abre/fecha no pulo; queda livre desce rapido e da dano ao bater
    const air = this.air && this.g.bounce;
    if (air) {
      const h = this.pos[1] - floorAt(this.g.M, this.pos[0], this.pos[2]);
      if (inp.jumpPressed && h > 2) {
        this.chute = !this.chute; if (!this.chute) this.cutChute = true;
        audio.play(this.chute ? 'chute' : 'whoosh', { vol: 0.7, ui: true });
        inp = { ...inp, jumpPressed: false };
      }
      // celular: abre sozinho a 26 m (se a pessoa nao tiver soltado de proposito)
      if (!this.chute && !this.cutChute && this.g.settings?.autoChute && h < 26) { this.chute = true; audio.play('chute', { vol: 0.7, ui: true }); }
      speed = BR.bounce.airSpeed * (this.chute ? 1 : 1.35);
    }
    audio.loop('wind', air && !this.chute ? 0.55 : 0);
    // chao: acelera e freia firme (sem patinar); no ar quase nao muda a direcao
    const acc = air ? 5 : this.onGround ? 22 : 1.6;
    if (this.slideT > 0) {
      // escorregando: direcao quase presa (vira devagar pro lado do analogico), velocidade caindo na curva
      this.slideT = Math.max(0, this.slideT - dt);
      if (wl > 0.2) {
        const a0 = Math.atan2(this.slideDir[1], this.slideDir[0]), a1 = Math.atan2(wz, wx);
        let da = a1 - a0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        const a = a0 + Math.max(-SLIDE.steer * dt, Math.min(SLIDE.steer * dt, da));
        this.slideDir = [Math.cos(a), Math.sin(a)];
      }
      const k = 1 - this.slideT / SLIDE.dur, v = SLIDE.end + (this.slideV0 - SLIDE.end) * Math.pow(1 - k, SLIDE.curve);
      this.vel[0] = this.slideDir[0] * v; this.vel[2] = this.slideDir[1] * v;
      // poeira atras e rente ao chao (no pe ela subia na frente da camera baixa e a tela piscava)
      if ((this.slideDust -= dt) <= 0) { this.slideDust = 0.09; this.g.fx?.puff([this.pos[0] - this.slideDir[0] * 1.2, this.pos[1] + 0.05, this.pos[2] - this.slideDir[1] * 1.2], 2, 0.22, 0xece9e1, 0.3); }
      if (inp.jumpPressed && this.onGround) { // pulo no meio: sai com o embalo
        this.endSlide(false);
        this.vel[0] *= SLIDE.jumpKeep; this.vel[2] *= SLIDE.jumpKeep;
      } else if (this.slideT <= 0) this.endSlide(true);
    } else {
      this.vel[0] = damp(this.vel[0], wx * speed, acc, dt);
      this.vel[2] = damp(this.vel[2], wz * speed, acc, dt);
    }
    // pulo baixo e unico (~1 m), sem pulo no ar
    if (inp.jumpPressed && this.onGround) { this.vel[1] = 7.4 * Math.sqrt(this.sk('mola', 'jump')); this.onGround = false; audio.play('jump', { vol: 0.45 }); }
    // contagem do inicio: quem esta no ar fica parado ate soltar todo mundo
    const hold = air && this.g.snap?.freeze > 0;
    if (hold) this.vel = [0, 0, 0]; else this.vel[1] -= 24 * dt;
    if (air) this.vel[1] = Math.max(this.vel[1], -(this.chute ? BR.bounce.chute : BR.bounce.freefall));
    const vy = this.vel[1];
    this.wasGround = this.onGround;
    const pre = this.slideT > 0 ? [this.pos[0], this.pos[2]] : null;
    this.onGround = moveBody(this.g.M, this.pos, this.vel, dt, 0.4, this.crouch ? 1.1 : 1.7);
    // bateu na parede deslizando: corta (andou bem menos do que devia)
    if (pre && Math.hypot(this.pos[0] - pre[0], this.pos[2] - pre[1]) < Math.hypot(this.vel[0], this.vel[2]) * dt * 0.35) this.endSlide(true, 'parede');
    if (this.onGround && air) {
      // pousou: com paraquedas e' de leve; em queda livre, dano pela velocidade (o servidor confere a janela)
      this.air = false;
      const dmg = !this.chute && -vy > BR.bounce.safe ? Math.round((-vy - BR.bounce.safe) * BR.bounce.dmg) : 0;
      this.g.net.send({ t: 'fall', dmg });
      if (dmg > 0) { audio.play('splat', { vol: 0.9, ui: true }); this.g.shake?.(0.5); this.g.fx?.word('SPLAT!', [this.pos[0], this.pos[1] + 0.4, this.pos[2]], 1.6, 0.7); }
      this.chute = false; audio.loop('wind', 0);
    }
    if (this.onGround) {
      if (!this.wasGround && vy < -6) { this.g.vm.landed(-vy); audio.play('land', { vol: Math.min(0.8, -vy / 20) }); }
    }
    const eyeT = this.g.down ? 0.5 : this.slideT > 0 ? SLIDE.eye : this.crouch ? 1.05 : 1.6;
    this.eye = damp(this.eye, eyeT, 12, dt);

    // passos no ritmo do balanco: fluido, alternando pe e variando um tiquinho
    const hs = Math.hypot(this.vel[0], this.vel[2]);
    if (this.onGround && hs > 1.5) {
      const rate = this.tac ? 15 : this.sprint ? 12.5 : 9.5;
      const prev = Math.floor(this.stepPhase / Math.PI);
      this.stepPhase += dt * rate * Math.min(1.2, hs / 7);
      if (Math.floor(this.stepPhase / Math.PI) !== prev) {
        this.lastStep ^= 1;
        audio.play(this.lastStep ? 'step' : 'step2', { vol: (this.crouch ? 0.12 : 0.22) + Math.min(0.2, hs * 0.015), rate: 0.95 + Math.random() * 0.1, key: 'steps', max: 2 });
      }
    }

    // mira
    const adsTime = 0.16 * st.adsTime * (this.wpn === 'sniper' ? 1.5 : 1) * this.sk('lince', 'ads') * this.cold('ads');
    const canAds = !W.noAds && this.reloadT <= 0 && !this.sprint && !this.tac && this.lo(this.wpn)?.handle !== 'akimbo'; // akimbo atira so do quadril
    this.adsK = damp(this.adsK, inp.ads && canAds ? 1 : 0, 1 / adsTime * 1.6, dt);
    if (inp.adsPressed && canAds) audio.play('ads', { vol: 0.35 });

    // trocas
    if (!this.forced) {
      if (inp.slot >= 0 && this.owned[inp.slot]) this.equip(this.owned[inp.slot]);
      if (inp.wheel) this.cycle(inp.wheel > 0 ? 1 : -1);
      if (inp.lastPressed) this.equip(this.lastWpn);
    }
    if (inp.reloadPressed) this.startReload();
    // toque: com o pente vazio recarrega sozinho (o tiro automatico nunca "aperta" com o pente vazio,
    // entao a arma ficava parada em 0 ate achar o botao de recarregar)
    { const am = this.ammo[this.wpn]; if (isTouch && am && am.mag === 0 && am.reserve > 0 && this.reloadT <= 0 && this.switchT <= 0) this.startReload(); }
    // faca rapida (V / botao): golpe com a lamina equipada, sem largar a arma
    this.meleeCd = (this.meleeCd || 0) - dt;
    if (inp.meleePressed && this.meleeCd <= 0 && this.switchT <= 0 && this.throwT <= 0) this.melee();
    if (inp.fieldPressed) this.useField();
    this.fieldPhysics(dt);
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
    if (inp.streakPressed && this.g.me?.ready?.length) {
      // outra sequencia no ar (ou o intervalo depois dela): avisa na hora, sem ir ao servidor
      const L = this.g.me.ready[0] === 'uav' ? null : this.g.snap?.sLock; // radar nao espera fila
      if (L) { this.g.hud.message(t(L.kind === 'gap' ? 'streakGap' : 'streakWait', { s: t('s_' + L.kind), n: L.t }), 1.8); audio.play('empty', { ui: true, vol: 0.5 }); }
      else this.g.net.send({ t: 'streak', kind: this.g.me.ready[0] });
    }

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
    if (this.boltSfxT > 0 && (this.boltSfxT -= dt) <= 0) audio.play('bolt', { vol: 0.7 });

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
        if (mode === 'bolt') { this.g.vm.bolt(W.rate * st.rate); this.boltSfxT = 0.22; } // clack-clunk do ferrolho logo depois do tiro
        if (mode === 'burst') { this.burstLeft--; this.fireT = this.burstLeft > 0 ? W.rate * st.rate * 0.6 : W.rate * st.rate * 2.4; }
      }
    }

    // camera
    this.zoomNow = st.zoom || W.zoom;
    // camera reta: andar de lado nao inclina a cabeca (era o que deixava o movimento "mole")
    this.roll = damp(this.roll, this.slideT > 0 ? SLIDE.roll : 0, 10, dt); // deslizando: inclina de leve

    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 1 / 20;
      const anim = this.g.down ? 'down' : this.air && this.g.bounce ? (this.chute ? 'chute' : 'fall') : !this.onGround ? 'jump' : this.slideT > 0 ? 'slide' : this.crouch ? 'crouch' : this.tac ? 'tac' : this.sprint ? 'sprint' : hs > 1 ? 'run' : 'idle';
      this.g.net.send({ t: 'state', pos: [...this.pos], yaw: this.yaw, pitch: this.pitch, anim, wpn: this.wpn });
    }
  }

  // inimigo mais perto na frente (cone de ~55 graus) dentro do alcance da lamina; null se nao tem
  meleeTarget() {
    const g = this.g, fists = this.meleeWpn() === 'fists', tr = fists ? {} : bodyTrait(this.lo('melee')?.body || 'melee_10');
    const range = tr.range || WEAPONS[fists ? 'fists' : 'melee'].range;
    const eye = this.eyePos(), fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    let best = null, bd = Infinity;
    for (const r of g.remotes.values()) {
      if (!r.alive || !g.isEnemy(r) || !r.pos) continue;
      const dx = r.pos[0] - this.pos[0], dz = r.pos[2] - this.pos[2], d = Math.hypot(dx, dz);
      if (d > range + 0.4 || Math.abs(r.pos[1] - this.pos[1]) > 1.8 || (dx * fx + dz * fz) / (d || 1) < 0.55) continue;
      if (!hasLOS(g.M, eye, [r.pos[0], r.pos[1] + 1.1, r.pos[2]])) continue;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }

  // golpe de lamina: acerta o inimigo mais perto na frente dentro do alcance da lamina
  // equipamento de campo: manda o ponto mirado (chao ou topo de caixa ate o alcance); o servidor confere
  useField() {
    const g = this.g, F = FIELD[g.field];
    if (!F || !this.alive || g.inRing || g.down) return; // ringue = so soco; caido nao usa
    if ((g.fieldCd || 0) > 0) { audio.play('empty', { vol: 0.4 }); return; }
    const o = this.eyePos(), cp = Math.cos(this.pitch);
    const d = [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
    const range = F.range || 4, hit = raycast(g.M, o, d, range);
    // ponto mirado; se cair colado em parede/caixa, volta pelo raio ate um chao onde da pra pisar
    let dist = Math.min(range, hit.dist) - 0.4;
    for (let k = 0; k < 16 && dist > 1 && !standable(g.M, o[0] + d[0] * dist, o[2] + d[2] * dist); k++) dist -= 0.7;
    const at = [o[0] + d[0] * dist, 0, o[2] + d[2] * dist];
    g.net.send({ t: 'field', kind: g.field, at });
  }
  // mola e buraco do proprio jogador (a posicao e do cliente): pisou na mola voa, entrou no buraco sai no outro
  fieldPhysics(dt) {
    const g = this.g, F = g.snap?.field;
    if (!F || !this.alive) return;
    for (const s of F.springs) {
      if (!this.onGround || (this.pos[0] - s[1]) ** 2 + (this.pos[2] - s[3]) ** 2 > 1.2 || Math.abs(this.pos[1] - s[2]) > 0.5) continue;
      this.vel[1] = FIELD.spring.power; this.onGround = false;
      audio.play('spring', { vol: 0.7 }); g.fieldView?.bounce(s[0]); g.shake(0.1);
    }
    if ((this.holeCd = (this.holeCd || 0) - dt) > 0) return;
    for (const h of F.holes) {
      const A = [h[1], h[2], h[3]], B = [h[4], h[5], h[6]];
      const inA = (this.pos[0] - A[0]) ** 2 + (this.pos[2] - A[2]) ** 2 < 0.8 && Math.abs(this.pos[1] - A[1]) < 0.6;
      const inB = !inA && (this.pos[0] - B[0]) ** 2 + (this.pos[2] - B[2]) ** 2 < 0.8 && Math.abs(this.pos[1] - B[1]) < 0.6;
      if (!inA && !inB) continue;
      const to = inA ? B : A, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      g.fx.puff([this.pos[0], this.pos[1] + 0.5, this.pos[2]], 6, 0.6, 0x141210, 0.5);
      this.pos = [to[0] + fx * 1.3, to[1] + 0.05, to[2] + fz * 1.3]; this.vel = [fx * 3, 4, fz * 3];
      g.fx.puff([to[0], to[1] + 0.5, to[2]], 6, 0.6, 0x141210, 0.5);
      g.fx.word('SLURP!', [to[0], to[1] + 1.6, to[2]], 1.4, 0.6);
      audio.play('hole', { vol: 0.7 }); this.holeCd = 1.5;
      break;
    }
  }

  // golpe: lamina (classe) ou punhos (battle royale, quem nao tem faca)
  meleeWpn() { return this.owned.includes('melee') ? 'melee' : this.owned.includes('fists') ? 'fists' : 'melee'; }
  melee() {
    const g = this.g, mw = this.meleeWpn(), MW = WEAPONS[mw], body = this.lo('melee')?.body || 'melee_10', tr = mw === 'melee' ? bodyTrait(body) : {};
    this.meleeCd = MW.rate * (tr.rate || 1);
    this.burstLeft = 0; this.reloadT = 0;
    g.vm.meleeSwing(this.meleeCd, mw === 'fists' ? { fists: true } : this.lo('melee'));
    audio.play('whoosh', { vol: 0.6, rate: 1.3 });
    g.net.send({ t: 'swing' });
    setTimeout(() => {
      if (!this.alive || this.g !== g) return;
      const best = this.meleeTarget();
      if (!best) return;
      const pt = [best.pos[0], best.pos[1] + 1.2, best.pos[2]];
      g.net.send({ t: 'hit', v: best.id, dmg: MW.dmg, head: false, wpn: mw });
      g.onHitConfirm(pt, false, MW.dmg, best);
      g.fx.word((mw === 'fists' ? ['POW!', 'SOC!', 'PAFT!'] : ['TCHAC!', 'BONC!', 'ZAPT!'])[Math.floor(Math.random() * 3)], pt, 1.6);
      audio.play('headshot', { vol: 0.7, ui: true, jitter: 0.1 });
    }, 110);
  }

  // inimigo vivo e a vista mais perto do centro da mira (cone cresce de perto, ate 60 m)
  assistTarget(maxAng) {
    const g = this.g, o = this.eyePos(), cp = Math.cos(this.pitch);
    const f = [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp];
    let best = null, bs = Infinity;
    for (const r of g.remotes.values()) {
      if (!r.alive || !g.isEnemy(r) || !r.pos || r.pos[1] < -0.5) continue; // abaixo do chao nunca puxa a mira
      const crouch = r.anim === 'crouch' || r.anim === 'slide';
      const p = [r.pos[0], r.pos[1] + (r.dn > 0 ? 0.35 : crouch ? 0.7 : 1.05), r.pos[2]];
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
    if (this.slideT > 0) spread *= SLIDE.spread; // atirando escorregando: espalha (o agachado nao vale aqui)
    const kick = (W.kick ?? 0.05) * (st.kick ?? 1) * this.sk('lince', 'kick');
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
    const bodyNow = this.lo(this.wpn)?.body; // som proprio de modelo: revolver, AA-12 e o laser do Bico Longo
    const laser = this.wpn === 'pistol' && bodyNow === LASER_BODY;
    audio.play(laser ? 'laser' : bodyNow === 'pistol_10' ? 'revolver' : bodyNow === 'shotgun_3' ? 'aa12' : this.wpn, { vol: this.wpn === 'smg' || this.wpn === 'minigun' ? 0.55 : 0.8, key: 'gun', max: this.wpn === 'minigun' ? 3 : 5, jitter: 0.05 });
    audio.duck(0.6, 0.25);

    // boca do cano no mundo (pra o tracer sair da arma)
    const mz = g.vm.muzzleCam();
    const muzzleWorld = mz.clone().applyMatrix4(cam.matrixWorld);
    // a arma da mao tem camera propria (outro FOV): a bala visivel sai do ponto do mundo que cai em cima da boca
    // do cano NA TELA (a ~1 m da camera); antes nascia colada na mira e de longe virava um ponto
    const ndc = mz.clone().project(g.vm.camera);
    const muzzleScreen = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(1.1).add(cam.position);

    const pellets = W.pellets || 1, ammo = this.ammoNow();
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
      const hit = this.traceTargets(o, d.toArray(), 250, ammo === 'ap');
      if (i === 0 || hit.player) firstEnd = hit.point;
      if (hit.player) {
        const fall = this.wpn === 'shotgun' ? Math.max(0.2, 1 - hit.dist / 24) : this.wpn === 'smg' || this.wpn === 'pistol' ? Math.max(0.6, 1 - hit.dist / 90) : 1;
        if (!victim || victim === hit.player) { victim = hit.player; total += W.dmg * fall * dmgK * (hit.wall ? AMMO.ap.wallK : 1); head ||= hit.head; hitPoint = hit.point; }
      } else if (hit.normal) g.fx.impact(hit.point, hit.normal);
      if (i < (this.wpn === 'shotgun' ? 6 : 3)) g.fx.bullet(muzzleScreen.toArray(), hit.point, laser ? 'laser' : this.lo(this.wpn)?.tracer || 'chalk', this.wpn); // uma bala por tiro (escopeta: os chumbos)
    }
    // dirigivel inimigo no caminho da bala do meio: enche de furo (o servidor confere e estoura)
    if (!victim && g.blimpMeshes?.length) {
      const bh = this.traceBlimp(o, fwd.toArray(), 250);
      if (bh) {
        g.net.send({ t: 'hitBlimp', id: bh.m.userData.id, dmg: Math.round(W.dmg * pellets * dmgK), wpn: this.wpn });
        g.fx.impact(bh.point, null); g.onHitConfirm?.(bh.point, false, Math.round(W.dmg * pellets * dmgK), null);
        firstEnd = bh.point;
      }
    }
    if (victim) {
      g.net.send({ t: 'hit', v: victim.id, dmg: Math.round(total), head, wpn: this.wpn });
      g.onHitConfirm(hitPoint, head, Math.round(total * (head ? 1.6 : 1)), victim);
      // efeito da bala no alvo (o dano extra e o respingo quem aplica e o servidor)
      if (ammo === 'fire') { g.fx.puff(hitPoint, 5, 0.45, 0xff7a1a, 0.5); g.fx.word('FSSS!', hitPoint, 1.1, 0.5); }
      if (ammo === 'trace') (g.marked ||= new Map()).set(victim.id, g.t + AMMO.trace.mark);
    }
    g.net.send({ t: 'shot', o: muzzleWorld.toArray(), e: firstEnd, wpn: this.wpn });
  }

  // battle royale: arma trocada no chao sai da mao (o servidor larga ela no chao)
  take(w) {
    this.owned = this.owned.filter(x => x !== w); delete this.ammo[w];
    if (this.wpn === w) this.wpn = null;
  }

  // tipo de bala da arma na mao (gun game e lamina nao tem)
  ammoNow() { const a = this.g.mode === 'gungame' || this.wpn === 'melee' ? null : this.lo(this.wpn)?.ammo; return AMMO[a] ? a : null; }

  // raio contra o balao do dirigivel inimigo (elipsoide 3 x 2,4 x 6,9 no espaco do modelo); a parede na frente barra
  traceBlimp(o, d, max) {
    const wall = raycast(this.g.M, o, d, max).dist;
    let best = null;
    for (const m of this.g.blimpMeshes) {
      const u = m.userData, own = this.g.remotes.get(u.owner);
      if (u.owner === this.g.myId || (own && !this.g.isEnemy(own)) || (!own && this.g.myTeam && u.team === this.g.myTeam)) continue;
      m.updateMatrixWorld(); const inv = m.matrixWorld.clone().invert();
      const lo = new THREE.Vector3(...o).applyMatrix4(inv), ld = new THREE.Vector3(...d).transformDirection(inv);
      lo.set(lo.x / 3, lo.y / 2.4, lo.z / 6.9); ld.set(ld.x / 3, ld.y / 2.4, ld.z / 6.9);
      const a = ld.dot(ld), b = 2 * lo.dot(ld), c = lo.dot(lo) - 1, D = b * b - 4 * a * c;
      if (D < 0) continue;
      const tl = (-b - Math.sqrt(D)) / (2 * a); // em unidades do raio local: volta pro mundo pelo ponto
      if (tl < 0) continue;
      const pl = new THREE.Vector3(lo.x + ld.x * tl, lo.y + ld.y * tl, lo.z + ld.z * tl);
      const pw = new THREE.Vector3(pl.x * 3, pl.y * 2.4, pl.z * 6.9).applyMatrix4(m.matrixWorld);
      const dist = pw.distanceTo(new THREE.Vector3(...o));
      if (dist < wall && dist < max && (!best || dist < best.dist)) best = { m, dist, point: pw.toArray() };
    }
    return best;
  }

  traceTargets(o, d, max, pierce = false) {
    const wall = raycast(this.g.M, o, d, max);
    let best = wall.dist, player = null, head = false, through = false;
    for (const r of this.g.remotes.values()) {
      if (!r.alive || !this.g.isEnemy(r)) continue;
      // perfurante: procura alvo alem da parede, se a parede no caminho for fina
      let h = rayPlayer(o, d, r, best), w = false;
      if (!h && pierce) {
        const far = rayPlayer(o, d, r, max);
        if (far && wallThickness(this.g.M, o, far.point || [o[0] + d[0] * far.dist, o[1] + d[1] * far.dist, o[2] + d[2] * far.dist]) <= AMMO.ap.pierce) { h = far; w = true; }
      }
      if (h && (w ? !player || through && h.dist < best : h.dist < best)) { best = h.dist; player = r; head = h.head; through = w; }
    }
    const dist = best === Infinity ? max : best;
    return { dist, player, head, wall: through, normal: player ? null : wall.normal, point: [o[0] + d[0] * dist, o[1] + d[1] * dist, o[2] + d[2] * dist] };
  }
}
