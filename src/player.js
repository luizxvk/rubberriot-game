// Jogador local: movimento firme estilo COD (anda, corre, agacha, pula baixo; sem carrinho
// e sem pulo duplo), tiro hitscan, recarga e troca de arma.
import * as THREE from 'three';
import { carStep, seatPos, rayCar } from '../shared/cars.js';
import { moveBody, raycast, rayPlayer, hasLOS, wallThickness, headroom } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';
import { WEAPONS, PRIMARIES, NADES, INFECT, SKILLS, AMMO, FIELD, BR, HEIST, SMUGGLE, bodyTrait, STREAK_FREE, GADGETS, gadgetOf } from '../shared/weapons.js';
import { EV } from '../shared/events.js';
import { BOR } from '../shared/mobs.js';
import { loadoutStats, nativePart, CATEGORY, infectLoadout, bpLoadout, isSaber, meleeBody } from './arsenal.js';
import { CAMOS } from './camos.js';
import { camoUnlocked } from './progress.js';
import { audio } from './audio.js';
import { LASER_BODY } from './world.js';
import { t } from './i18n.js';
import { isTouch } from './input.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
// slots (teclas 1, 2, 3...): arma principal primeiro, pistola em 2, faca por ultimo
const SLOT_ORDER = ['rpg', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'pistol', 'melee', 'fists'];
// pegou arma do chao: so troca sozinho se ela for "maior" que a da mao (faca < pistola < principais)
const PICK_RANK = ['fists', 'melee', 'pistol', 'smg', 'rifle', 'shotgun', 'minigun', 'sniper', 'rpg'];

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
    if (this.pickLo?.[id]) return this.pickLo[id]; // arma pega do chao: montada do jeito de quem largou (ate morrer)
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
    // Noite dos Borroes: Rascunho = arma de fabrica (pistola = Estalo, o resto o 1o modelo da categoria); Arte-Final usa o Arsenal
    if (this.g.mode === 'borroes' && this.g.snap?.bor && !this.g.snap.bor.art && CATEGORY[id] && id !== 'melee') { const b = this.g.boxBody?.get(this.g.myId)?.[id]; return (this.rasCache ||= {})[id + b] ||= infectLoadout(id, b ? { body: b } : undefined); } // modelo tirado da Caixa vale ate morrer
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
    // battle royale: entre o 'take' (arma trocada no chao) e o 'give' a mao fica vazia um instante (quebrava o quadro, 01/11)
    if (!WEAPONS[id]) id = 'fists';
    const W = WEAPONS[id];
    const st = loadoutStats(id, this.lo(id));
    return { W, st, mag: W.mag === Infinity ? Infinity : Math.max(1, Math.round(W.mag * st.mag)) };
  }

  spawn(ev) {
    this.pickLo = null; // renasceu: volta pras proprias armas
    this.ggBody = ev.body || null;
    this.pos = [...ev.pos]; this.vel = [0, 0, 0]; this.recoilP = 0; this.recoilY = 0;
    // bate-volta: nasce caindo; o paraquedas abre no pulo (no celular abre sozinho, ajuste)
    this.air = !!ev.air; this.chute = false; this.cutChute = false;
    this.yaw = ev.yaw; this.pitch = 0;
    this.alive = true; this.hp = 100;
    this.nades = this.g.mode === 'br' ? { frag: 0, flash: 0 } : { frag: 1, flash: 1 }; this.patIdx = 0;
    this.owned = []; this.ammo = {}; this.stash = {};
    // escada de armas e infectado: o servidor decide o kit (infectado = so a lamina)
    if (this.g.mode === 'gungame') { this.give(ev.wpn, false); this.equip(ev.wpn, true); }
    else if ((this.g.mode === 'infect' || this.g.mode === 'br' || this.g.mode === 'borroes' || EV(ev.mut ?? this.g.snap?.mut)?.kit) && ev.owned?.length) { // infectado, battle royale, noite dos borroes e evento com armas fixas: o servidor decide o kit
      for (const w of ev.owned) this.give(w, false);
      this.equip(ev.wpn, true);
    }
    else {
      const primary = PRIMARIES.includes(this.g.settings.primary) ? this.g.settings.primary : 'smg';
      this.give('pistol', false); this.give(primary, false); this.give('melee', false);
      this.equip(primary, true);
    }
    this.heat = 0; this.hot = false; this.heatT = 0;
    this.crouch = false; this.tacFuel = 3.5; this.slideT = 0; this.slideDir = null; this.slideCd = 0; this.cook = null;
  }

  // arsenal aberto na partida: as pecas novas valem na hora e a principal trocada entra no lugar da velha.
  // A municao nao enche de graca: a arma que sai guarda o que tinha e volta com isso se for escolhida de novo.
  rearm() {
    if (!this.alive) return;
    if (this.g.mode !== 'gungame' && this.g.mode !== 'infect' && this.g.mode !== 'br' && !(this.g.mode === 'borroes' && !this.g.snap?.bor?.art) && !EV(this.g.snap?.mut)?.kit) {
      const primary = PRIMARIES.includes(this.g.settings.primary) ? this.g.settings.primary : 'smg';
      const old = this.owned.find(w => PRIMARIES.includes(w) && w !== primary);
      if (old) { this.stash[old] = this.ammo[old]; this.owned = this.owned.filter(w => w !== old); delete this.ammo[old]; }
      if (!this.owned.includes(primary)) {
        this.give(primary, false);
        if (this.stash[primary]) this.ammo[primary] = this.stash[primary];
      }
      if (this.wpn === old || !this.owned.includes(this.wpn)) this.wpn = primary;
    }
    // pente maior ou menor: o que esta no pente nao passa da capacidade nova
    for (const id of this.owned) { const a = this.ammo[id]; if (a && Number.isFinite(a.mag)) a.mag = Math.min(a.mag, this.stats(id).mag); }
    this.equip(this.wpn, true);
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
  // caixa de municao (05/11): perto de uma caixa e com a reserva faltando, pede; quem confirma e o servidor
  abxCap(id) { const { W } = this.stats(id); return Number.isFinite(W.reserve) ? Math.round(W.reserve * this.sk('bolso', 'reserve')) : Infinity; }
  abxScan(dt) {
    if ((this.abxCd = (this.abxCd || 0) - dt) > 0) return;
    const L = this.g.snap?.abx; if (!L?.length) return;
    const R = NADES.ammobox.radius, id = this.g.myId, team = this.g.me?.team;
    const b = L.find(x => (x.owner === id || (x.team != null && x.team === team)) && Math.hypot(this.pos[0] - x.pos[0], this.pos[2] - x.pos[2]) < R && Math.abs(this.pos[1] - x.pos[1]) < 2.2);
    if (!b || !this.owned.some(w => { const a = this.ammo[w]; return a && Number.isFinite(a.reserve) && a.reserve < this.abxCap(w); })) return;
    this.g.net.send({ t: 'abx', id: b.id }); this.abxCd = 1;
  }
  abxGot() { // +1 pente na reserva de cada arma, sem passar do que ela carrega
    this.abxCd = NADES.ammobox.cd;
    for (const w of this.owned) { const a = this.ammo[w]; if (a && Number.isFinite(a.reserve)) a.reserve = Math.max(a.reserve, Math.min(this.abxCap(w), a.reserve + this.stats(w).mag)); }
    audio.play('pickup', { vol: 0.6 });
  }
  // sangue frio: so vale com pouca vida
  cold(key) { return this.hp < SKILLS.sangue.below ? this.sk('sangue', key) : 1; }

  equip(id, instant = false) {
    if (!this.owned.includes(id)) return;
    if (this.bagged && id !== 'pistol' && this.owned.includes('pistol')) return; // com a bolsa: so pistola
    audio.preloadGuns(this.owned.map(w => this.lo(w)?.body)); // som de cada arma pronto antes do 1o tiro
    if (id !== this.wpn) this.lastWpn = this.wpn;
    this.wpn = id;
    this.reloadT = 0;
    this.switchT = instant ? 0 : 0.3 * this.sk('maos', 'swap');
    this.g.vm.setWeapon(id, this.lo(id), instant);
    if (!instant) audio.play(id === 'melee' && isSaber(this.lo(id)?.body) ? 'saber_on' : 'swap', { vol: 0.5 });
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
    const dur = W.reload * st.reload * this.sk('maos', 'reload') * this.sk('pique', 'reload') * this.cold('reload');
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
    if (this.g.mode === 'bomb' || this.g.mode === 'br' || this.g.mode === 'borroes' || this.g.mode === 'heist' || this.g.mode === 'smuggle') { const use = !!inp.use; if (use !== this.lastUse) { this.lastUse = use; this.g.net?.send({ t: 'use', v: use }); } }
    if (this.g.snap?.freeze > 0 || acting || this.g.me?.fr) inp =  { ...inp, moveX: 0, moveZ: 0, fire: false, firePressed: false, jumpPressed: false, crouchPressed: false, sprint: false, meleePressed: false, fragPressed: false, flashPressed: false, streakPressed: false, reloadPressed: false };
    // dupla: caido so rasteja (nada de tiro, pulo, corrida, granada, faca ou equipamento)
    // Contrabando (04/11): caixote nas maos = sem tiro, pulo, corrida, granada nem faca; atirar PASSA o caixote pro colega na mira
    if (this.crated) {
      if (inp.firePressed && (this.passT || 0) <= 0) { this.passT = 0.6; this.g.net?.send({ t: 'pass', yaw: this.yaw }); }
      inp = { ...inp, fire: false, firePressed: false, jumpPressed: false, sprint: false, meleePressed: false, fragPressed: false, flashPressed: false, ads: false, adsPressed: false };
    }
    this.passT = Math.max(0, (this.passT || 0) - dt);
    if (this.g.down) inp = { ...inp, fire: false, firePressed: false, jumpPressed: false, crouchPressed: false, sprint: false, meleePressed: false, fragPressed: false, flashPressed: false, streakPressed: false, reloadPressed: false, fieldPressed: false, ads: false, adsPressed: false, tacPressed: false, lastPressed: false };
    // no carro (04/11): motorista dirige com o andar (frente/re + esquerda/direita) e nao atira; passageiro so mira e
    // atira. A camera vira junto com o carro. Ninguem anda, pula ou agacha la dentro
    const cs = this.g.mySeat;
    let carNow = null;
    if (cs) {
      inp = { ...inp, jumpPressed: false, crouchPressed: false, sprint: false, tacPressed: false };
      if (cs.seat === 0 && this.g.myCar) {
        const car = this.g.myCar, y0 = car.yaw;
        carStep(this.g.M, car, inp.moveZ || 0, inp.moveX || 0, dt);
        this.yaw += car.yaw - y0; carNow = car; this.carYaw = undefined;
        inp = { ...inp, fire: false, firePressed: false, ads: false, adsPressed: false, meleePressed: false, fragPressed: false, flashPressed: false, fieldPressed: false, gadgetPressed: false, reloadPressed: false };
      } else { const v = this.g.carView?.cars.get(cs.id); if (v) { this.yaw += v.yaw - (this.carYaw ?? v.yaw); this.carYaw = v.yaw; carNow = v; } }
      inp = { ...inp, moveX: 0, moveZ: 0 };
    } else this.carYaw = undefined;
    const safe = { pos: [...this.pos], vel: [...this.vel], yaw: this.yaw, pitch: this.pitch };
    this.step(dt, inp, S);
    if (carNow) { this.pos = seatPos(carNow, cs.seat); this.vel = [0, 0, 0]; this.onGround = true; this.crouch = false; this.sprint = false; this.tac = false; this.slideT = 0; }
    // trava: numero invalido nunca chega na camera (congelava a tela e o audio)
    const ok = [...this.pos, ...this.vel, this.yaw, this.pitch, this.recoilP, this.recoilY].every(Number.isFinite);
    if (!ok) {
      console.warn('estado invalido no jogador, restaurado');
      this.pos = safe.pos; this.vel = [0, 0, 0]; this.yaw = Number.isFinite(safe.yaw) ? safe.yaw : 0; this.pitch = Number.isFinite(safe.pitch) ? safe.pitch : 0;
      this.recoilP = 0; this.recoilY = 0;
    }
  }

  step(dt, inp, S) {
    this.abxScan(dt);
    // olhar
    // cada aparelho com a sua sensibilidade e a sua sensibilidade mirando (05/11). A do controle ja vem no giro (gamepad.js)
    const aim = this.adsK > 0.5, zoomK = aim ? (1 / (this.zoomNow || 1)) ** 0.5 : 1, kOf = (sens, ads) => sens * 0.0022 * (aim ? ads * zoomK : 1);
    const kM = kOf(S.sens, S.adsSens), kT = kOf(S.touchSens ?? 1, S.touchAdsSens ?? 0.8), kP = kOf(1, S.padAdsSens ?? 0.8);
    const lookYaw = (inp.lookX - (inp.padLookX || 0) - (inp.touchLookX || 0)) * kM + (inp.touchLookX || 0) * kT + (inp.padLookX || 0) * kP;
    const lookPitch = (inp.lookY - (inp.padLookY || 0) - (inp.touchLookY || 0)) * kM + (inp.touchLookY || 0) * kT + (inp.padLookY || 0) * kP;
    this.yaw -= lookYaw;
    this.pitch -= lookPitch * (S.invertY ? -1 : 1);
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
    const gadgetMode = !!this.gadgetOn; // gadget ativo: o gatilho e dele, a arma nao atira
    const fire = (inp.fire || autoShot) && !this.g.down && !gadgetMode; // caido: tiro automatico do toque tambem para
    const firePressed = !gadgetMode && (inp.firePressed || (autoShot && !this.g.down && this.fireT <= 0 && !(this.burstLeft > 0)));
    const mx = inp.moveX, mz = inp.moveZ;
    const moving = Math.hypot(mx, mz) > 0.1;

    // corrida e disparada (duplo toque no Shift ou botao da disparada)
    const wantSprint = inp.sprint && mz > 0.3 && this.onGround !== false && !inp.ads;
    const fervor = this.g.skills?.includes('fervor') && !W.melee; // Fervoroso (04/11): o gatilho nao para a corrida
    if (wantSprint && !this.sprint && this.sprintOut <= 0 && (!fire || fervor)) this.sprint = true; // gatilho apertado nao religa a corrida (03/11: correr + atirar travava a arma a cada 0,12 s e a cadencia caia)
    if (!inp.sprint && !this.tac) this.sprint = false;
    if (mz <= 0.3 || inp.ads) { this.sprint = false; this.tac = false; }
    if (fire && (this.sprint || this.tac) && !fervor) { this.sprint = false; this.tac = false; this.sprintOut = 0.12; }
    if (this.slideT > 0) { this.sprint = false; this.tac = false; } // escorregando nao corre (Shift segurado religava e levantava)
    this.sprintOut -= dt;
    if (this.tac) { this.tacFuel -= dt; if (this.tacFuel <= 0) { this.tac = false; } }
    else this.tacFuel = Math.min(3.5, this.tacFuel + dt * 0.9);

    // deslizar: comeca no lugar do agachar quando esta correndo rapido no chao
    this.slideCd = Math.max(0, (this.slideCd || 0) - dt);
    const hsNow = Math.hypot(this.vel[0], this.vel[2]);
    const wasLow = this.crouch || this.slideT > 0;
    if (this.slideT > 0 && inp.crouchPressed && this.slideT < SLIDE.dur - 0.2) { this.endSlide(false); inp = { ...inp, crouchPressed: false }; } // agachar de novo: levanta
    if (inp.crouchPressed && !(this.slideT > 0) && (this.g.skills?.includes('carrinho') || this.g.tutorial?.slideOn) && this.onGround && (this.sprint || this.tac) && hsNow > SLIDE.minSpeed && !this.slideCd && !this.g.down && !(this.air && this.g.bounce)) {
      this.slideT = SLIDE.dur; this.slideDir = [this.vel[0] / hsNow, this.vel[2] / hsNow]; this.slideV0 = (hsNow + SLIDE.boost) * (W.slideK || 1);
      this.crouch = true; this.sprint = false; this.tac = false; this.slideDust = 0;
      audio.play('slide', { vol: 0.6, key: 'slide', max: 1 });
      this.g.tip?.('slide');
      inp = { ...inp, crouchPressed: false };
    }
    // agachar (alterna; com "agachar segurando" solta quando larga a tecla). Correr levanta.
    if (inp.crouchPressed) { this.crouch = !this.crouch; if (this.crouch) { this.sprint = false; this.tac = false; } }
    if (inp.crouchHeld === false && S.holdCrouch && !(this.slideT > 0)) this.crouch = false;
    if (this.crouch && (inp.jumpPressed || this.sprint)) { this.crouch = false; if (inp.jumpPressed) inp = { ...inp, jumpPressed: false }; }
    if (wasLow && !this.crouch && !(this.slideT > 0) && this.g.M && !headroom(this.g.M, this.pos)) { this.crouch = true; this.sprint = false; this.tac = false; } // teto baixo (duto): continua agachado

    // velocidade alvo
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let speed = this.tac ? 12.2 : this.sprint ? 9.6 : 6.7; // 01/11: um pouco mais lento (pedido dele, mais equilibrado)
    if (this.crouch) speed = 3.7;
    speed *= (st.move ?? 1) * this.sk('borracha', 'move');
    if (this.g.stimBoostT > 0) speed *= FIELD.stim.boost; // estimulante: um pouco mais de correria durante o efeito (03/11)
    if (this.bagged) { speed *= HEIST.carrySlow; this.sprint = false; this.tac = false; } // Roube o Cofre: com a bolsa nas costas
    if (this.crated) { speed *= SMUGGLE.carrySlow; this.sprint = false; this.tac = false; } // Contrabando: caixote pesado
    if (this.adsK > 0.3) speed *= 0.6;
    if (W.id === 'minigun' || this.wpn === 'minigun') speed *= this.firing ? 0.6 : 0.85;
    if (W.moveK) speed *= this.sprint || this.tac ? W.runK : W.moveK; // Metralhadora (04/11, hotfix): pesa so com ela na mao
    if (this.g.mode === 'infect' && this.g.myTeam === 'red') speed *= INFECT.speed;
    if (this.g.down) speed *= BR.duo.crawl;
    if (this.g.snap?.bor?.puddles.some(q => (q[1] - this.pos[0]) ** 2 + (q[3] - this.pos[2]) ** 2 < q[4] * q[4] && Math.abs(q[2] - this.pos[1]) < 1.2)) speed *= BOR.spit.slow; // poca do Cuspidor
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
    const E = EV(this.g.snap?.mut); // evento de fim de semana (fisica)
    if (E?.boost) speed *= E.boost;
    // chao: acelera e freia firme (sem patinar); no ar quase nao muda a direcao. Chao de sabao: patina tudo
    const acc = air ? 5 : this.onGround ? (E?.ice ? 2.2 : 22) : 1.6;
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
    // escalar (01/11, estilo COD): apertou pular de frente pra muro/caixa com o topo ao alcance = sobe por cima.
    // O pulo fica "guardado" 0,4 s (apertou um pouco antes de encostar no muro tambem vale)
    this.jumpBuf = inp.jumpPressed ? 0.4 : Math.max(0, (this.jumpBuf || 0) - dt);
    if (!this.mantle && this.jumpBuf > 0 && !air && !this.g.down && inp.moveZ > 0.2 && !(this.slideT > 0) && this.tryMantle()) { this.jumpBuf = 0; inp = { ...inp, jumpPressed: false }; }
    // pulo baixo e unico (~1 m), sem pulo no ar
    if (inp.jumpPressed && this.onGround && !this.mantle) { this.vel[1] = 7.4 * Math.sqrt(this.sk('mola', 'jump')) * (EV(this.g.snap?.mut)?.jump || 1); this.onGround = false; audio.play('jump', { vol: 0.45 }); }
    // contagem do inicio: quem esta no ar fica parado ate soltar todo mundo
    const hold = air && this.g.snap?.freeze > 0;
    if (hold) this.vel = [0, 0, 0]; else this.vel[1] -= 24 * (EV(this.g.snap?.mut)?.grav || 1) * dt;
    if (air) this.vel[1] = Math.max(this.vel[1], -(this.chute ? BR.bounce.chute : BR.bounce.freefall));
    const vy = this.vel[1];
    this.wasGround = this.onGround;
    const pre = this.slideT > 0 ? [this.pos[0], this.pos[2]] : null;
    this.onGround = this.mantle ? this.mantleStep(dt) : moveBody(this.g.M, this.pos, this.vel, dt, 0.4, this.crouch ? 1.1 : 1.7);
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
    const eyeT = this.g.mySeat ? 1.5 : this.g.down ? 0.5 : this.slideT > 0 ? SLIDE.eye : this.crouch ? 1.05 : 1.6;
    this.eye = damp(this.eye, eyeT, 12, dt);

    // passos no ritmo do balanco: fluido, alternando pe e variando um tiquinho
    const hs = Math.hypot(this.vel[0], this.vel[2]);
    if (this.onGround && hs > 1.5) {
      const rate = this.tac ? 12 : this.sprint ? 10 : 9.5; // passada no ritmo da velocidade nova (a arma usa o mesmo)
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
    // trava de troca so vale no modo que a ligou (escada de armas / infectado): o jogador vive a sala inteira e
    // a trava vazava pra partida seguinte em outro modo (nao trocava mais de arma)
    if (!this.forced || this.g.mode !== 'gungame') { // 04/11: a trava do infectado vazava pra rodada seguinte e o sobrevivente nao trocava mais de arma
      if (inp.slot >= 0 && this.owned[inp.slot]) this.equip(this.owned[inp.slot]);
      // luneta variavel mirando: a rodinha (ou o botao de troca no celular) alterna os 2 zooms em vez de trocar de arma
      const vari = this.adsK > 0.5 && this.g.vmScopeKind?.() === 'vari';
      if (inp.wheel && vari) { this.zoomStep = this.zoomStep ? 0 : 1; audio.play('ui_click', { ui: true, vol: 0.4 }); }
      else if (inp.wheel) this.cycle(inp.wheel > 0 ? 1 : -1);
      if (inp.lastPressed && this.g.mode !== 'bomb') this.equip(this.lastWpn); // na bomba o Q inclina
    }
    if (inp.reloadPressed) this.startReload();
    // toque: com o pente vazio recarrega sozinho (o tiro automatico nunca "aperta" com o pente vazio,
    // entao a arma ficava parada em 0 ate achar o botao de recarregar)
    { const am = this.ammo[this.wpn]; if ((this.g.settings?.autoReload ?? isTouch) && am && /* 07/11: opcao nos Ajustes (antes so no celular) */ am.mag === 0 && am.reserve > 0 && this.reloadT <= 0 && this.switchT <= 0) this.startReload(); }
    // faca rapida (V / botao): golpe com a lamina equipada, sem largar a arma
    this.meleeCd = (this.meleeCd || 0) - dt;
    if (inp.meleePressed && this.meleeCd <= 0 && this.switchT <= 0 && this.throwT <= 0) this.melee();
    if (inp.fieldPressed) this.useField();
    this.fieldPhysics(dt);
    if (inp.inspectPressed && this.reloadT <= 0 && this.adsK < 0.1 && !this.sprint) this.g.vm.inspect();
    // granadas (G frag, F flash) e sequencia de abates (X). Apertou = puxa o pino e o pavio comeca a correr;
    // soltou = arremessa com o pavio que sobrou; segurou demais = estoura na mao (main.js desenha o tracejado)
    this.throwT -= dt;
    if (this.cook) {
      const c = this.cook, fuse = NADES[c.kind].fuse;
      c.t += dt;
      if (c.t >= fuse && c.kind === 'frag' && (this.g.lethal || 'frag') === 'frag') { // machadinha/termobarica e taticas nao estouram na mao (04/11)
        this.cook = null; this.throwT = 0.6;
        this.g.net.send({ t: 'nade', kind: c.kind, d: [0, 0, -1], hand: true });
      } else if (!inp[c.kind + 'Held'] || !this.alive) {
        this.cook = null; this.throwT = 0.6;
        const f = new THREE.Vector3(); this.g.camera.getWorldDirection(f);
        this.g.net.send({ t: 'nade', kind: c.kind, d: f.toArray(), cook: c.t });
        this.g.vm.throwNade();
        audio.play('whoosh', { vol: 0.5, rate: 0.9 });
      } else if (Math.floor(c.t * 2) !== Math.floor((c.t - dt) * 2)) audio.play('ui_click', { vol: 0.35, rate: 1 + c.t / fuse, ui: true }); // tique do pavio, cada meio segundo
    } else for (const kind of ['frag', 'flash']) {
      if (!inp[kind + 'Pressed'] || this.throwT > 0 || this.nades[kind] <= 0) continue;
      this.nades[kind]--;
      this.cook = { kind, t: 0 };
      audio.play('pickup', { vol: 0.45, rate: 1.5 }); // pino
      break;
    }
    this.gadgetUpdate(dt, inp);
    if (this.gadgetOn) inp = { ...inp, fire: false, firePressed: false }; // o resto do tiro nao ve o gatilho
    if (inp.streakPressed && this.g.me?.ready?.length) {
      // chama a primeira que pode agora (radar, bigorna e torta nao esperam fila; o dirigivel espera o outro sair)
      const L = this.g.snap?.sLock, want = this.g.streakKind; this.g.streakKind = null; // celular: selo tocado = aquela
      const k = want && this.g.me.ready.includes(want) && (STREAK_FREE.includes(want) || !L) ? want : this.g.me.ready.find(x => STREAK_FREE.includes(x) || !L);
      if (!k) { this.g.hud.message(t(L.kind === 'gap' ? 'streakGap' : 'streakWait', { s: t('s_' + L.kind), n: L.t }), 1.8); audio.play('empty', { ui: true, vol: 0.5 }); }
      else this.g.net.send({ t: 'streak', kind: k });
    }

    // recarga
    const a = this.ammo[this.wpn];
    if (this.reloadT > 0) {
      // correndo sem a skill Recarga no Pique: a recarga pausa (02/11, pedido dele); com ela segue normal
      const paused = (this.sprint || this.tac) && !this.g.skills?.includes('pique');
      if (!paused) this.reloadT -= dt;
      if (this.reloadT <= 0 && a) {
        const need = mag - a.mag, take = Math.min(need, a.reserve);
        a.mag += take; a.reserve -= take;
        this.g.hud.weapon(this);
      }
    }
    this.switchT -= dt;
    this.fireT -= dt;
    if (this.boltSfxT > 0 && (this.boltSfxT -= dt) <= 0) audio.play('bolt', { vol: 0.7 });
    if (this.pumpSfxT > 0 && (this.pumpSfxT -= dt) <= 0) audio.play('bolt', { vol: 0.6, rate: 1.3 }); // clack da bomba da escopeta

    // minigun gira antes
    if (W.spin) this.spinK = fire && (!this.sprint || this.g.skills?.includes('fervor')) ? Math.min(1, this.spinK + dt / W.spin) : Math.max(0, this.spinK - dt);
    const runFire = this.g.skills?.includes('fervor') && !W.melee; // Fervoroso: correndo o gatilho vale
    // superaquecida (05/11): esfria sozinha, com ou sem ela na mao; enquanto quente nao atira
    { const H = WEAPONS.lmg.heat; if ((this.heatT = (this.heatT || 0) - dt) <= 0 && this.heat > 0) { this.heat = Math.max(0, this.heat - H.cool * dt); if (this.heat === 0) this.hot = false; } }
    const running = ((this.sprint || this.tac) && !runFire) || !!(W.heat && this.hot);
    this.firing = fire && !running && this.switchT <= 0;
    // modo do modelo: automatica segura, semi uma por puxada, rajada solta N tiros seguidos
    const mode = st.mode || (W.auto ? 'auto' : 'semi');
    if (mode === 'burst' && firePressed && !(this.burstLeft > 0) && this.fireT <= 0) this.burstLeft = st.burst || 3;
    const trigger = mode === 'auto' ? fire : mode === 'burst' ? this.burstLeft > 0 : firePressed; // semi e ferrolho: uma por puxada
    // akimbo no PC e no controle (01/11, pedido dele): cada gatilho e uma arma. Mouse: esquerdo = arma da esquerda,
    // direito = da direita; controle: LT = esquerda, RT = direita. Cada mao tem a propria cadencia (2x a do akimbo
    // alternado), entao os dois juntos atiram no mesmo ritmo do toque, que segue alternando sozinho.
    const onPad = !!this.g.pad?.active, aki = this.lo(this.wpn)?.handle === 'akimbo' && !W.melee && (!isTouch || onPad);
    // Canhao de Carga: SO a Luneta (sniper_0) com o kit montado (02/11: o kit salvo na categoria valia em toda sniper)
    const loS = this.wpn === 'sniper' ? this.lo('sniper') : null, chargeKit = loS?.conv === 'charge' && loS?.body === 'sniper_0';
    // fora dela: carga zera e os circulos somem (antes ficavam girando na arma seguinte)
    if (!chargeKit && (this.chargeT > 0 || this.g.vm.charge)) { this.chargeT = 0; this.g.vm.charge = 0; audio.stopKey?.('charge'); }
    if (aki) {
      const T = this.akT ||= [0, 0]; T[0] -= dt; T[1] -= dt;
      const auto = mode === 'auto', L = onPad ? inp.ads : inp.fire, R = onPad ? inp.fire : inp.ads;
      const Lp = onPad ? inp.adsPressed : inp.firePressed, Rp = onPad ? inp.firePressed : inp.adsPressed;
      const want = [auto ? L : Lp, auto ? R : Rp];
      this.firing = (L || R) && !running && this.switchT <= 0;
      const can = this.switchT <= 0 && this.reloadT <= 0 && this.sprintOut <= 0 && !running;
      for (const i of [0, 1]) {
        if (!want[i] || !can || T[i] > 0) continue;
        if (a && a.mag !== Infinity && a.mag <= 0) { if (a.reserve > 0) this.startReload(); else audio.play('empty', { vol: 0.5 }); break; }
        const hands = this.akAmmo(a); // cada mao tem o seu pente: a vazia nao atira, a outra segue
        if (hands && hands[i] <= 0) { audio.play('empty', { vol: 0.4 }); continue; }
        this.g.vm.forceSide = i === 0 ? 'L' : 'R';
        if (hands) hands[i]--; // antes do tiro: o HUD atualiza dentro dele
        this.shoot(W, st); this.fireT = 0; T[i] = W.rate * st.rate * 2;
      }
    } else if (chargeKit) {
      // Canhao de Carga (kit da Luneta, 01/11): segurando carrega ate 3 s; soltando atira. Carga cheia = abate na hora
      const ready = this.fireT <= 0 && this.switchT <= 0 && this.reloadT <= 0 && this.sprintOut <= 0 && !running;
      if (fire && ready && a && a.mag > 0) {
        if (!(this.chargeT > 0)) { this.chargeT = 1e-3; audio.play('chargeup', { key: 'charge', max: 1, vol: 0.75, jitter: 0 }); }
        this.chargeT = Math.min(3, this.chargeT + dt);
      } else if (this.chargeT > 0) {
        const full = this.chargeT >= 3; this.chargeT = 0; audio.stopKey?.('charge');
        if (ready && a && a.mag > 0) { this.megaShot = full; this.shoot(W, st); this.megaShot = false; this.g.vm.bolt(W.rate * st.rate); this.boltSfxT = 0.22; }
      } else if (inp.firePressed && a && a.mag <= 0) { if (a.reserve > 0) this.startReload(); else audio.play('empty', { vol: 0.5 }); }
      this.g.vm.charge = (this.chargeT || 0) / 3;
    } else if (trigger && this.fireT <= 0 && this.switchT <= 0 && this.reloadT <= 0 && this.sprintOut <= 0 && !running && (!W.spin || this.spinK >= 1)) {
      if (a && a.mag !== Infinity && a.mag <= 0) {
        if (a.reserve > 0) this.startReload();
        else if (inp.firePressed) audio.play('empty', { vol: 0.5 });
      } else if (W.melee) {
        if (this.meleeCd <= 0) this.melee();
      } else {
        this.shoot(W, st);
        if (mode === 'bolt') { this.g.vm.bolt(W.rate * st.rate); this.boltSfxT = 0.22; }
        // escopeta de bomba (nao a automatica AA-12, nem duas na mao): puxa a bomba depois do tiro
        if (this.wpn === 'shotgun' && mode !== 'auto' && this.lo(this.wpn)?.body !== 'shotgun_3' && this.lo(this.wpn)?.handle !== 'akimbo') { this.g.vm.pump?.(W.rate * st.rate); this.pumpSfxT = 0.18; } // clack-clunk do ferrolho logo depois do tiro
        if (mode === 'burst') { this.burstLeft--; this.fireT = this.burstLeft > 0 ? W.rate * st.rate * 0.6 : W.rate * st.rate * 2.4; }
      }
    }

    // inclinar (plantar a bomba, pedido dele 01/11): Q esquerda, E direita. Onde da pra plantar/desarmar o E e usar.
    // Ajustes: segurar (padrao) ou alternar (aperta uma vez inclina, de novo volta). Suave como no Rainbow Six.
    const canLean = this.g.mode === 'bomb' && !this.g.down && !this.sprint && !this.tac;
    if (!canLean) this.leanSet = 0;
    else if (S.leanMode === 'toggle') {
      if (inp.leanLPressed) this.leanSet = this.leanSet === -1 ? 0 : -1;
      if (inp.leanRPressed && !this.g.bombCan) this.leanSet = this.leanSet === 1 ? 0 : 1;
    }
    const leanT = !canLean ? 0 : S.leanMode === 'toggle' ? this.leanSet || 0 : (inp.leanL ? -1 : 0) + (inp.leanR && !this.g.bombCan ? 1 : 0);
    this.lean = damp(this.lean || 0, leanT, 6.5, dt);
    // camera
    { const vm = this.g.vm; if (vm?.gun?.userData.canted && inp.cantedPressed && this.adsK > 0.3) { vm.canted = !vm.canted; audio.play('ui_click', { vol: 0.5 }); } }
    this.zoomNow = this.g.vm?.canted ? this.g.vm.sight().zoom : st.zoom || W.zoom;
    if (this.g.vmScopeKind?.() === 'vari') this.zoomNow *= this.zoomStep ? 1.5 : 0.75; // variavel: ~3x e ~6x
    // camera reta: andar de lado nao inclina a cabeca (era o que deixava o movimento "mole")
    this.roll = damp(this.roll, this.slideT > 0 ? SLIDE.roll : 0, 10, dt); // deslizando: inclina de leve

    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 1 / 20;
      const anim = this.g.mySeat ? (this.g.mySeat.seat === 0 ? 'drive' : 'seat') : this.mantle ? 'climb' : this.g.down ? 'down' : this.air && this.g.bounce ? (this.chute ? 'chute' : 'fall') : !this.onGround ? 'jump' : this.slideT > 0 ? 'slide' : this.crouch ? 'crouch' : this.tac ? 'tac' : this.sprint ? 'sprint' : hs > 1 ? 'run' : 'idle';
      this.g.net.send({ t: 'state', pos: [...this.pos], yaw: this.yaw, pitch: this.pitch, anim, wpn: this.wpn, ...(this.lean ? { ln: Math.round(this.lean * 10) / 10 } : {}), ...(this.g.vm?.canted ? { ca: 1 } : {}), ...(this.adsK > 0.6 ? { ad: 1 } : {}), ...(this.g.myCar && this.g.mySeat?.seat === 0 ? { car: { pos: this.g.myCar.pos.map(v => Math.round(v * 100) / 100), yaw: Math.round(this.g.myCar.yaw * 1000) / 1000, spd: Math.round(this.g.myCar.spd * 10) / 10, st: Math.round((this.g.myCar.steer || 0) * 10) / 10 } } : {}) });
    }
  }

  // inimigo mais perto na frente (cone de ~55 graus) dentro do alcance da lamina; null se nao tem
  meleeTarget() {
    const g = this.g, fists = this.meleeWpn() === 'fists', tr = fists ? {} : bodyTrait(meleeBody(this.lo('melee')?.body));
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
    if ((g.fieldK ?? 0) < 1) { audio.play('empty', { vol: 0.4 }); return; } // barra ainda nao encheu (pontos/abates)
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
  // akimbo (04/11, pedido dele): balas de cada mao, [esquerda, direita]. Recarga ou tiro por fora: divide de novo
  akAmmo(a) {
    if (!a || a.mag === Infinity) return null;
    if (!a.ak || a.ak[0] + a.ak[1] !== a.mag) a.ak = [Math.ceil(a.mag / 2), Math.floor(a.mag / 2)];
    return a.ak;
  }
  meleeWpn() { return this.owned.includes('melee') ? 'melee' : this.owned.includes('fists') ? 'fists' : 'melee'; }
  melee() {
    const g = this.g, mw = this.meleeWpn(), MW = WEAPONS[mw], body = meleeBody(this.lo('melee')?.body), tr = mw === 'melee' ? bodyTrait(body) : {};
    this.meleeCd = MW.rate * (tr.rate || 1);
    this.burstLeft = 0; this.reloadT = 0;
    g.vm.meleeSwing(this.meleeCd, mw === 'fists' ? { fists: true } : this.lo('melee'));
    const saber = mw === 'melee' && isSaber(body);
    audio.play(saber ? 'saber_swing' : 'whoosh', { vol: 0.6, rate: saber ? 1 : 1.3 });
    g.net.send({ t: 'swing' });
    setTimeout(() => {
      if (!this.alive || this.g !== g) return;
      const best = this.meleeTarget();
      if (!best) return;
      const pt = [best.pos[0], best.pos[1] + 1.2, best.pos[2]];
      g.net.send({ t: 'hit', v: best.id, dmg: MW.dmg, head: false, wpn: mw });
      g.onHitConfirm(pt, false, MW.dmg, best);
      g.fx.word((mw === 'fists' ? ['POW!', 'SOC!', 'PAFT!'] : ['TCHAC!', 'BONC!', 'ZAPT!'])[Math.floor(Math.random() * 3)], pt, 1.6);
      audio.play(saber ? 'saber_hit' : 'headshot', { vol: 0.7, ui: true, jitter: 0.1 });
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
    // cadencia exata (03/11): a sobra do quadro entra no proximo tiro. Antes zerava, e cada tiro esperava um quadro a
    // mais; nas armas rapidas (Cuspideira, Pipoqueira) a cadencia caia sempre que o FPS oscilava. Teto de 1 quadro
    // longo de sobra pra arma parada nao soltar rajada acumulada no primeiro tiro
    const carry = this.firing && this.fireT < 0 ? Math.max(this.fireT, -0.05) : 0;
    this.fireT = W.rate * st.rate + carry;
    const cam = g.camera;
    const o = this.eyePos();
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const ads = this.adsK > 0.6;
    const moving = Math.hypot(this.vel[0], this.vel[2]) > 2;
    // precisao da mira so com a mira 100% em cima (04/11, pedido dele): no meio da subida vale o espalhamento do quadril
    const aimed = this.adsK >= 0.97;
    let spread = (W.spread * st.spread) * (aimed ? 1 : st.hip ?? 1) * (aimed ? (W.adsSpread ?? 0.25 * W.spread) / (W.spread || 1) : 1) * (moving ? 1.5 : 1) * (this.onGround ? 1 : 2);
    // sniper sem mirar: nunca acerta o centro da mira (sorteia num anel)
    const noScope = this.wpn === 'sniper' && !aimed;
    if (noScope) spread = 0.11;
    const slug = this.wpn === 'shotgun' && this.ammoNow() === 'slug'; // balote: um projetil, quase sem espalhar
    if (slug) spread *= AMMO.slug.spread;
    if (this.crouch) spread *= 0.75;
    if (this.sprint || this.tac) spread *= SKILLS.fervor.hip; // Fervoroso: correndo o tiro abre mais
    if (this.slideT > 0) spread *= SLIDE.spread; // atirando escorregando: espalha (o agachado nao vale aqui)
    if (W.heat) { this.heat = Math.min(1, (this.heat || 0) + (st.heatK ?? 1) / W.heat.shots); this.heatT = W.heat.wait; if (this.heat >= 1 && !this.hot) { this.hot = true; audio.play('empty', { vol: 0.8 }); g.hud.message(t('lmgHot'), 1.6); } }
    const kick = (W.kick ?? 0.05) * (st.kick ?? 1) * this.sk('lince', 'kick') * (W.heat ? 1 + this.heat * W.heat.kick : 1);
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
    g.shake(kick * 0.4); // tremor segue o coice da montagem (kit de rajada da Bico de Pena = zero)
    if (W.rocket) { // Bazuca: sai o foguete reto pra onde a mira aponta (o servidor voa, acerta e explode)
      g.net.send({ t: 'rocket', d: fwd.toArray().map(v => Math.round(v * 1000) / 1000) });
      audio.play('rocket', { vol: 0.9, jitter: 0.04 });
      const rk = g.vm.gun?.userData.rocket; if (rk) rk.visible = false;
      return;
    }
    const bodyNow = this.lo(this.wpn)?.body; // som proprio de modelo: revolver, AA-12 e o laser do Bico Longo
    const laser = this.wpn === 'pistol' && bodyNow === LASER_BODY;
    const silOn = String(this.lo(this.wpn)?.muzzle || '').startsWith('silencer'), sil = silOn && !laser ? audio.silSound(this.wpn) : null; // silenciador: som proprio da categoria (sem eco)
    audio.play(sil || (laser ? 'laser' : (bodyNow === 'pistol_10' || bodyNow === 'pistol_5') ? 'revolver' : bodyNow === 'shotgun_3' ? 'aa12' : audio.gunSound(bodyNow, this.wpn)), { vol: this.wpn === 'smg' || this.wpn === 'minigun' ? 0.55 : 0.8, key: 'gun', max: this.wpn === 'minigun' ? 3 : 5, jitter: 0.05, muffle: silOn && !sil, dry: !!sil });
    audio.duck(0.6, 0.25);

    // boca do cano no mundo (pra o tracer sair da arma)
    const mz = g.vm.muzzleCam();
    const muzzleWorld = mz.clone().applyMatrix4(cam.matrixWorld);
    // a arma da mao tem camera propria (outro FOV): a bala visivel sai do ponto do mundo que cai em cima da boca
    // do cano NA TELA (a ~1 m da camera); antes nascia colada na mira e de longe virava um ponto
    const ndc = mz.clone().project(g.vm.camera);
    const muzzleScreen = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(1.1).add(cam.position);

    const pellets = slug ? 1 : st.pellets || W.pellets || 1, ammo = this.ammoNow(); // serrada: chumbo do modelo
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
        const fall = slug ? Math.max(0.55, 1 - hit.dist / 110) * (W.pellets || 1) * AMMO.slug.slugK : this.wpn === 'shotgun' || st.pellets ? Math.max(0.2, 1 - hit.dist / 24) : this.wpn === 'pistol' && this.lo(this.wpn)?.handle === 'akimbo' ? Math.max(0.7, 1 - hit.dist / 140) : this.wpn === 'smg' || this.wpn === 'pistol' ? Math.max(0.6, 1 - hit.dist / 90) : 1;
        if (!victim || victim === hit.player) { victim = hit.player; total += W.dmg * fall * dmgK * (hit.wall ? AMMO.ap.wallK : 1); head ||= hit.head; hitPoint = hit.point; }
      } else if (hit.normal) g.fx.impact(hit.point, hit.normal);
      if (i < (this.wpn === 'shotgun' || st.pellets ? 6 : 3)) g.fx.bullet(muzzleScreen.toArray(), hit.point, laser ? 'laser' : this.lo(this.wpn)?.tracer || 'chalk', this.wpn); // uma bala por tiro (escopeta: os chumbos)
    }
    // carro inimigo no caminho (04/11): lataria leva o tiro (o servidor confere e explode)
    if (!victim && g.snap?.cars) {
      const wall = raycast(g.M, o, fwd.toArray(), 250).dist;
      let best = null;
      for (const k of g.snap.cars) { if (k.team === g.myTeam) continue; const v = g.carView?.cars.get(k.id) || k; const d = rayCar(o, fwd.toArray(), { pos: v.pos, yaw: v.yaw }, Math.min(wall, 250)); if (d != null && (!best || d < best.d)) best = { k, d }; }
      if (best) {
        const pt = [o[0] + fwd.x * best.d, o[1] + fwd.y * best.d, o[2] + fwd.z * best.d], dmg = Math.round(W.dmg * pellets * dmgK);
        g.net.send({ t: 'hitCar', id: best.k.id, dmg, wpn: this.wpn });
        g.fx.impact(pt, null); g.onHitConfirm?.(pt, false, dmg, null); firstEnd = pt;
      }
    }
    // biplano inimigo (07/11, pedido dele): esfera de 3,2 m no aviao; o servidor confere e derruba
    if (!victim && g.snap?.crafts?.length) {
      const wall = raycast(g.M, o, fwd.toArray(), 250).dist; let best = null;
      for (const f of g.snap.crafts) {
        if (f.k !== 'plane' || f.owner === g.myId || (g.myTeam && f.team === g.myTeam)) continue;
        const c = f.pos, ox = c[0] - o[0], oy = c[1] - o[1], oz = c[2] - o[2], tc = ox * fwd.x + oy * fwd.y + oz * fwd.z; if (tc < 0 || tc > wall) continue;
        const d2 = ox * ox + oy * oy + oz * oz - tc * tc; if (d2 < 3.2 * 3.2 && (!best || tc < best.t)) best = { f, t: tc };
      }
      if (best) { const pt = [o[0] + fwd.x * best.t, o[1] + fwd.y * best.t, o[2] + fwd.z * best.t], dmg = Math.round(W.dmg * pellets * dmgK); g.net.send({ t: 'hitCraft', id: best.f.id, dmg, wpn: this.wpn }); g.fx.impact(pt, null); g.onHitConfirm?.(pt, false, dmg, null); firstEnd = pt; }
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
    // caixa de municao inimiga no caminho da bala do meio: o servidor conta a vida dela e explode
    if (!victim && g.snap?.abx?.length) {
      const bx = this.traceAbx(o, fwd.toArray(), 250);
      if (bx) {
        const dmg = Math.round(W.dmg * pellets * dmgK);
        g.net.send({ t: 'hitAbx', id: bx.id, dmg, wpn: this.wpn });
        g.fx.impact(bx.point, null); g.onHitConfirm?.(bx.point, false, dmg, null);
        firstEnd = bx.point;
      }
    }
    if (victim && this.megaShot) { total = 999; g.fx.word('KA-BLAMMO!', hitPoint, 2.2, 1.2); g.shake?.(0.9); } // tiro carregado cheio: abate na hora
    if (this.megaShot) audio.play('megashot', { ui: true, vol: 1, jitter: 0 });
    if (victim) {
      g.net.send({ t: 'hit', v: victim.id, dmg: Math.round(total), head, wpn: this.wpn, mega: this.megaShot ? 1 : undefined });
      g.onHitConfirm(hitPoint, head, Math.round(total * (head ? 1.6 : 1)), victim);
      // efeito da bala no alvo (o dano extra e o respingo quem aplica e o servidor)
      if (ammo === 'fire') { g.fx.puff(hitPoint, 5, 0.45, 0xff7a1a, 0.5); g.fx.word('FSSS!', hitPoint, 1.1, 0.5); }
      if (ammo === 'trace') (g.marked ||= new Map()).set(victim.id, g.t + AMMO.trace.mark);
      // colateral (01/11, pedido dele): sniper que derruba com um tiro atravessa e pega ate mais 2 em fila (80% do dano a cada um)
      if (this.wpn === 'sniper' && total >= 100) {
        const skip = new Set([victim]); let from = hitPoint, dmg = total;
        for (let n = 0; n < 2; n++) {
          const o2 = [from[0] + fwd.x * 0.5, from[1] + fwd.y * 0.5, from[2] + fwd.z * 0.5];
          const h2 = this.traceTargets(o2, fwd.toArray(), 250 - Math.hypot(o2[0] - o[0], o2[1] - o[1], o2[2] - o[2]), false, skip);
          if (!h2.player) break;
          dmg *= 0.8; skip.add(h2.player); from = h2.point;
          g.net.send({ t: 'hit', v: h2.player.id, dmg: Math.round(dmg), head: h2.head, wpn: this.wpn });
          g.onHitConfirm(h2.point, h2.head, Math.round(dmg * (h2.head ? 1.6 : 1)), h2.player);
          if (n === 1) g.fx.word('COLATERAL!', h2.point, 1.4, 0.9);
        }
      }
    }
    g.net.send({ t: 'shot', o: muzzleWorld.toArray(), e: firstEnd, wpn: this.wpn });
    g.replay?.shot(performance.now() / 1000, { id: g.myId, o: muzzleWorld.toArray(), e: firstEnd, tracer: this.lo(this.wpn)?.tracer || 'chalk', wpn: this.wpn, snd: audio.gunSound(this.lo(this.wpn)?.body, this.wpn) }); // a camera final repassa os meus tiros tambem
  }

  // escalada: procura a borda na frente (topo entre 0,5 e 2,4 m do pe), com lugar pra ficar em pe la em cima
  mantleSpot() {
    const M = this.g.M, p = this.pos, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const wall = Math.min(raycast(M, [p[0], p[1] + 0.9, p[2]], [fx, 0, fz], 1.1).dist, raycast(M, [p[0], p[1] + 0.45, p[2]], [fx, 0, fz], 1.1).dist);
    if (wall > 1.05) return false;
    const tx = p[0] + fx * (wall + 0.55), tz = p[2] + fz * (wall + 0.55);
    const from = p[1] + 2.7, down = raycast(M, [tx, from, tz], [0, -1, 0], 2.7);
    const top = from - down.dist, dh = top - p[1];
    if (dh < 0.5 || dh > 2.4) return false;
    if (raycast(M, [tx, top + 0.05, tz], [0, 1, 0], 1.75).dist < 1.7) return false;              // sem teto em cima
    if (raycast(M, [p[0], top + 0.35, p[2]], [fx, 0, fz], wall + 0.7).dist < wall + 0.6) return false; // caminho por cima livre
    if (raycast(M, [p[0], p[1] + 1.6, p[2]], [0, 1, 0], top - p[1] + 0.2).dist < top - p[1]) return false; // cabeca passa
    return { b: [tx, top + 0.01, tz], dh };
  }
  tryMantle() {
    if (this.g.mySeat) return false; // no carro nao escala
    const s = this.mantleSpot(); if (!s) return false;
    const p = this.pos;
    this.mantle = { a: [...p], b: s.b, t: 0, dur: 0.3 + s.dh * 0.17 };
    this.crouch = false; this.vel = [0, 0, 0];
    this.g.vm?.mantle?.(this.mantle.dur);
    audio.play('land', { vol: 0.4 });
    return true;
  }
  // sobe (curva rapida no comeco) e depois passa pra frente; termina em pe la em cima
  mantleStep(dt) {
    const m = this.mantle; m.t += dt;
    const k = Math.min(1, m.t / m.dur), up = 1 - (1 - Math.min(1, k / 0.62)) ** 2, fw = Math.max(0, Math.min(1, (k - 0.4) / 0.6));
    const e = fw * fw * (3 - 2 * fw);
    this.pos = [m.a[0] + (m.b[0] - m.a[0]) * e, m.a[1] + (m.b[1] - m.a[1]) * up, m.a[2] + (m.b[2] - m.a[2]) * e];
    this.vel = [0, 0, 0];
    if (k < 1) return false;
    this.mantle = null;
    return true;
  }

  // battle royale: arma trocada no chao sai da mao (o servidor larga ela no chao)
  take(w) {
    this.owned = this.owned.filter(x => x !== w); delete this.ammo[w];
    if (this.wpn === w) this.wpn = null;
  }

  // tipo de bala da arma na mao (gun game e lamina nao tem)
  ammoNow() { const a = this.g.mode === 'gungame' || this.wpn === 'melee' ? null : this.lo(this.wpn)?.ammo; return AMMO[a] ? a : null; }

  // raio contra a caixa de municao inimiga (esfera em volta do modelo, que tem 0,8 m); a parede na frente barra
  traceAbx(o, d, max) {
    const wall = raycast(this.g.M, o, d, max).dist, R = 0.6;
    let best = null;
    for (const b of this.g.snap.abx) {
      const own = this.g.remotes.get(b.owner);
      if (b.owner === this.g.myId || (own && !this.g.isEnemy(own)) || (!own && this.g.myTeam && b.team === this.g.myTeam)) continue;
      const cx = b.pos[0] - o[0], cy = b.pos[1] + 0.35 - o[1], cz = b.pos[2] - o[2], t = cx * d[0] + cy * d[1] + cz * d[2];
      if (t < 0 || cx * cx + cy * cy + cz * cz - t * t > R * R || t >= wall || t >= max || (best && t >= best.dist)) continue;
      best = { id: b.id, dist: t, point: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t] };
    }
    return best;
  }

  // raio contra o balao do dirigivel inimigo (elipsoide 3 x 2,4 x 6,9 no espaco do modelo); a parede na frente barra
  traceBlimp(o, d, max) {
    const wall = raycast(this.g.M, o, d, max).dist;
    let best = null;
    for (const m of this.g.blimpMeshes) {
      const u = m.userData, own = this.g.remotes.get(u.owner);
      if (u.owner === this.g.myId || (own && !this.g.isEnemy(own)) || (!own && this.g.myTeam && u.team === this.g.myTeam)) continue;
      m.updateMatrixWorld(); const inv = m.matrixWorld.clone().invert();
      const lo = new THREE.Vector3(...o).applyMatrix4(inv), ld = new THREE.Vector3(...d).transformDirection(inv);
      const R = u.hitR || [3, 2.4, 6.9];
      lo.set(lo.x / R[0], lo.y / R[1], lo.z / R[2]); ld.set(ld.x / R[0], ld.y / R[1], ld.z / R[2]);
      const a = ld.dot(ld), b = 2 * lo.dot(ld), c = lo.dot(lo) - 1, D = b * b - 4 * a * c;
      if (D < 0) continue;
      const tl = (-b - Math.sqrt(D)) / (2 * a); // em unidades do raio local: volta pro mundo pelo ponto
      if (tl < 0) continue;
      const pl = new THREE.Vector3(lo.x + ld.x * tl, lo.y + ld.y * tl, lo.z + ld.z * tl);
      const pw = new THREE.Vector3(pl.x * R[0], pl.y * R[1], pl.z * R[2]).applyMatrix4(m.matrixWorld);
      const dist = pw.distanceTo(new THREE.Vector3(...o));
      if (dist < wall && dist < max && (!best || dist < best.dist)) best = { m, dist, point: pw.toArray() };
    }
    return best;
  }

  // ---------- gadget de baixo do cano (03/11) ----------
  gadgetId() { return this.wpn === 'rifle' ? gadgetOf(this.lo('rifle')) : null; } // vale em todo lugar, campo de treino tambem (03/11)
  gadgetUpdate(dt, inp) {
    const id = this.gadgetId(), F = GADGETS.gd_flame, S = GADGETS.gd_shot;
    this.gadgetPoseT = Math.max(0, (this.gadgetPoseT || 0) - dt); // arma levantada (pose do gadget) enquanto usa e um tico depois
    // 04/11 (pedido dele): liga e desliga. Um toque ativa e o gatilho passa a usar o gadget; outro toque volta pra arma
    if (!id || !this.alive) this.gadgetOn = false;
    else if (inp.gadgetPressed) { this.gadgetOn = !this.gadgetOn; audio.play('swap', { vol: 0.5 }); }
    const trig = !!this.gadgetOn && inp.fire, trigP = !!this.gadgetOn && inp.firePressed;
    if (this.gadgetOn) this.gadgetPoseT = Math.max(this.gadgetPoseT, 0.25);
    this.flameFuel ??= F.fuel; this.ubShells ??= S.shells;
    // espelho do servidor (so pra tela): enche/volta do mesmo jeito
    if (this.flameFuel < F.fuel && (this.flameIdle = (this.flameIdle || 0) + dt) > 1) this.flameFuel = Math.min(F.fuel, this.flameFuel + F.regen * dt * 2);
    if (this.ubShells < S.shells && (this.ubT = (this.ubT || 0) + dt) >= S.refill) { this.ubT = 0; this.ubShells++; }
    const busy = !this.alive || this.reloadT > 0 || this.switchT > 0 || this.throwT > 0 || this.sprint;
    if (id === 'gd_flame' && trig && !busy && this.flameFuel > 0) {
      this.flameIdle = 0; this.flameFuel = Math.max(0, this.flameFuel - dt);
      if ((this.flameT = (this.flameT || 0) - dt) <= 0) {
        this.flameT = F.tick;
        const f = new THREE.Vector3(); this.g.camera.getWorldDirection(f);
        this.g.net.send({ t: 'flame', d: f.toArray().map(v => Math.round(v * 1000) / 1000) });
        // sai do cano NA TELA (mesma conta do tiro: a arma da mao tem camera propria); abaixo do cano escondia o comeco do jato atras da arma
        const cam = this.g.camera, ndc = this.g.vm.muzzleCam().project(this.g.vm.camera);
        const mz = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(1.1).add(cam.position);
        // o jato mira onde a mira aponta a ~6 m, partindo do bocal
        const fd = cam.position.clone().addScaledVector(f, 6).sub(mz).normalize();
        this.g.fx.flame?.(mz.toArray(), fd.toArray());
        if ((this.flameSnd = (this.flameSnd || 0) - F.tick) <= 0) { this.flameSnd = 0.32; audio.play('flamer', { vol: 0.55, key: 'flamer', max: 2, jitter: 0.06 }); }
      }
    } else if (id === 'gd_flame' && trigP && this.flameFuel <= 0) audio.play('empty', { ui: true, vol: 0.5 });
    if (id === 'gd_shot' && trigP && !busy) {
      if (this.ubShells <= 0) { audio.play('empty', { ui: true, vol: 0.5 }); return; }
      this.ubShells--; this.ubT = 0; this.gadgetPoseT = 0.6;
      this.gadgetShot();
    }
  }
  // escopetinha: chumbo saindo de baixo do cano (mesma conta da escopeta); o servidor confere o cartucho
  gadgetShot() {
    const g = this.g, W = WEAPONS.ubshot, cam = g.camera, o = this.eyePos();
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion), rt = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    const mz = g.vm.muzzleCam().applyMatrix4(cam.matrixWorld);
    g.net.send({ t: 'ubshot', o: mz.toArray(), e: fwd.clone().multiplyScalar(20).add(mz).toArray() });
    const per = new Map();
    for (let i = 0; i < W.pellets; i++) {
      const r = Math.sqrt(Math.random()) * W.spread, th = Math.random() * Math.PI * 2;
      const d = fwd.clone().addScaledVector(rt, Math.cos(th) * r).addScaledVector(up, Math.sin(th) * r).normalize();
      const hit = this.traceTargets(o, d.toArray(), W.range);
      if (hit.player) { const e = per.get(hit.player) || { dmg: 0, head: false }; e.dmg += W.dmg * Math.max(0.25, 1 - hit.dist / 22); e.head ||= hit.head; per.set(hit.player, e); }
      else if (hit.normal) g.fx.impact(hit.point, hit.normal);
      if (i < 5) g.fx.bullet(mz.toArray(), hit.point, 'chalk', 'shotgun');
    }
    for (const [v, e] of per) { g.net.send({ t: 'hit', v: v.id, dmg: Math.round(e.dmg), head: e.head, wpn: 'ubshot' }); g.onHitConfirm?.(null, e.head, Math.round(e.dmg), v); }
    this.recoilP += W.kick; this.recoilY += (Math.random() - 0.5) * W.kick * 0.3; g.vm.fire(W.kick * 1.3); g.shake(W.kick * 0.5); // cada cartucho da o tranco de uma escopeta
    audio.play(audio.gunSound('shotgun_1', 'shotgun'), { vol: 0.8, key: 'gun', max: 5, jitter: 0.05 });
  }

  traceTargets(o, d, max, pierce = false, skip = null) {
    const wall = raycast(this.g.M, o, d, max);
    let best = wall.dist, player = null, head = false, through = false;
    for (const r of this.g.remotes.values()) {
      if (!r.alive || !this.g.isEnemy(r) || skip?.has(r)) continue;
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
