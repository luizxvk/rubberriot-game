// Nucleo da partida. Mesmo codigo no solo (navegador) e no multiplayer (node).
// send(to, msg): to = id do cliente ou null pra todos.
import { BR, AMMO, FIELD, WEAPONS, GUN_LADDER, ggPickLadder, SPAWN_KIT, MODES, BOT_HP, MAX_PLAYERS, TEAM_MAX, SKILLS, SKILL_SLOTS, BLAST, hasSkill, PRIMARIES, NADES, STREAKS, INFECT, BOMB, BLUEPRINTS, botSkill, bodyTrait, bpMods } from './weapons.js';
import { getMap, MODE_MAP, BOMB_SITES, moveBody, raycast, hasLOS, wallThickness, matchRules, clampArena } from './map.js';
import { navPath, floorAt, standable } from './nav.js';
import { cleanLook } from './looks.js';
import { fieldReset, fieldUse, fieldBlocks, fieldTick, fieldSnap, botField, botPickField, fieldReady } from './field.js';
import { escInit, escTick, escSpawn, escGoal, escSnap, escPos } from './escort.js';
import { EVENTS, EV } from './events.js';
import { brInit, brSpawn, brSpawnPoint, brArmor, brKill, brTick, brSnap, brGoal, lootList, brDown, brNear } from './br.js';

const BOT_NAMES = ['Botao', 'Salsicha', 'Rolha', 'Bigorna', 'Carvao', 'Pipoca', 'Tamanco', 'Fuligem',
  'Manivela', 'Gaita', 'Biscoito', 'Trombone', 'Pavio', 'Sabugo', 'Mola', 'Tinteiro'];
const MATCH_TIME = 480;
const RESPAWN = 2.6;

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const rnd = (a, b) => a + Math.random() * (b - a);
// opcoes do host no lobby: em que modos a meta e o tempo valem (o resto tem regra propria)
const PATHS_PER_TICK = 3;
const STREAK_GAP = 4; // s de folga entre uma sequencia acabar e a proxima poder entrar
export const LIMIT_MODES = ['ffa', 'tdm', 'ctf', 'dom', 'bomb'];
export const TIME_MODES = ['ffa', 'tdm', 'gungame', 'ctf', 'dom', 'infect'];
export const MAP_IDS = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria', 'ilha'];

// granada: saida da mao e um passo da fisica. O servidor e a linha tracejada do cliente usam os mesmos,
// entao o tracejado cai onde a granada cai de verdade
export function nadeLaunch(feet, d, kind) {
  const sp = NADES[kind].speed;
  return { pos: [feet[0] + d[0] * 0.6, feet[1] + 1.45, feet[2] + d[2] * 0.6], vel: [d[0] * sp, d[1] * sp + 4.5, d[2] * sp] };
}
// devolve a forca do quique (0 = nao bateu)
export function nadeStep(M, n, dt) {
  n.vel[1] -= 22 * dt;
  const step = [n.vel[0] * dt, n.vel[1] * dt, n.vel[2] * dt];
  const len = Math.hypot(...step);
  if (len <= 1e-5) return 0;
  const dir = [step[0] / len, step[1] / len, step[2] / len];
  const hit = raycast(M, n.pos, dir, len + 0.12);
  if (hit.dist !== Infinity && hit.normal) {
    // quica: reflete na normal e perde forca
    const k = Math.max(0, hit.dist - 0.12);
    n.pos = [n.pos[0] + dir[0] * k, n.pos[1] + dir[1] * k, n.pos[2] + dir[2] * k];
    const N = hit.normal, dot = n.vel[0] * N[0] + n.vel[1] * N[1] + n.vel[2] * N[2];
    n.vel = [(n.vel[0] - 2 * dot * N[0]) * 0.45, (n.vel[1] - 2 * dot * N[1]) * 0.38, (n.vel[2] - 2 * dot * N[2]) * 0.45];
    return Math.abs(dot) || 0.001;
  }
  n.pos = [n.pos[0] + step[0], n.pos[1] + step[1], n.pos[2] + step[2]];
  return 0;
}

export class Core {
  constructor({ mode = 'ffa', map, bots = 7, difficulty = 1, send, lobby = true, limit = 0, time = 0, autoNext = false, ranked = false, mut = null }) {
    this.mut = !ranked && EVENTS[mut] ? mut : null; // evento de fim de semana (regra maluca); rankeada nunca
    this.ranked = ranked; // rankeada (31/10): sala publica so com os modos competitivos; vale pontos de rank
    this.autoNext = autoNext; // jogo rapido: acabou a partida, a proxima ja comeca (sem lobby)
    this.limitPick = Number.isFinite(limit) ? Math.max(0, Math.min(500, limit | 0)) : 0; // meta/tempo do host (0 = padrao)
    this.timePick = Number.isFinite(time) ? Math.max(0, Math.min(1800, time | 0)) : 0;
    // dupla: roda as regras do battle royale ('br') com times de 2 (cfg.teams liga o fogo amigo desligado)
    this.duo = mode === 'duo';
    this.bounce = mode === 'bounce';
    this.mode = this.duo || this.bounce ? 'br' : MODES[mode] ? mode : 'ffa';
    this.cfg = MODES[this.duo ? 'duo' : this.bounce ? 'bounce' : this.mode];
    // battle royale so na ilha (e a ilha so no battle royale)
    this.M = getMap(this.mode === 'br' ? 'ilha' : map && map !== 'auto' && map !== 'ilha' ? map : MODE_MAP[this.mode]);
    this.mapPick = this.mode === 'br' ? 'ilha' : map && MAP_IDS.includes(map) && map !== 'ilha' ? map : 'auto';
    this.wantBots = Math.max(0, Math.min(MAX_PLAYERS - 1, bots | 0));
    this.difficulty = difficulty;
    this.skill = botSkill(difficulty);
    this.send = send;
    this.players = new Map();
    this.snapT = 0;
    this.botSeq = 0;
    this.seq = 1;
    // fases: 'lobby' (esperando todo humano dar pronto) -> 'count' (contagem) -> 'play'
    this.phase = lobby ? 'lobby' : 'play'; this.countT = 0; this.lobbyT = 0; this.useLobby = lobby;
    this.reset();
    this.balanceBots();
  }

  reset() {
    const M = this.M;
    // escada de armas: sorteia a escada da partida (todo mundo recebe; quem entra depois tambem)
    this.gg = this.mode === 'gungame' ? ggPickLadder() : null;
    if (this.gg) this.event({ k: 'ladder', id: this.gg.id, list: this.gg.list.map(u => u.body) });
    // meta e tempo da partida pelo tamanho do mapa (mapa apertado = mais abates pra vencer)
    const R = matchRules(this.mode, M.id, this.cfg, MATCH_TIME);
    // o host pode trocar meta e tempo no lobby (0 = o padrao do modo/mapa)
    this.limit = this.limitPick && LIMIT_MODES.includes(this.mode) ? this.limitPick : R.limit;
    this.time = this.timePick && TIME_MODES.includes(this.mode) ? this.timePick : R.time;
    this.over = false;
    // infectado: todo mundo comeca sobrevivente; o primeiro infectado sai em INFECT.firstIn s
    this.infT = INFECT.firstIn; this.infStarted = false; this.lastStand = null; this.surviveT = INFECT.surviveTick;
    if (this.mode === 'infect') for (const p of this.players.values()) p.team = 'blue';
    // infectado: a partida sorteia UMA arma (categoria + modelo) e todo sobrevivente sai com ela
    const opts = INFECT.survivorPrimaries;
    this.infKit = { wpn: opts[Math.floor(Math.random() * opts.length)], body: Math.floor(Math.random() * 1000) };
    this.overT = 0;
    this.teamScore = { red: 0, blue: 0 };
    this.flags = {
      red: { state: 'home', pos: [...M.flagBase.red], carrier: null, dropT: 0 },
      blue: { state: 'home', pos: [...M.flagBase.blue], carrier: null, dropT: 0 },
    };
    this.zones = M.zones.map(z => ({ id: z.id, pos: z.pos, r: z.r, owner: null, prog: 0 }));
    this.pickups = M.pickups.map((p, i) => ({ id: i, ...p, active: !(this.mode === 'gungame' && p.kind === 'wpn'), t: 0 }));
    if (this.mode === 'br') brInit(this);
    this.esc = null; if (this.mode === 'escort') escInit(this);
    this.nades = []; this.anvils = []; this.blimps = []; this.uavs = []; this.nukes = []; this.streakGap = 0; fieldReset(this);
    for (const p of this.players.values()) {
      p.kills = 0; p.deaths = 0; p.score = 0; p.gunLvl = 0; p.streak = 0; p.ready = []; p.assists = 0; p.dmgBy = {};
      this.spawn(p);
    }
    if (this.mode === 'bomb') {
      // pontos de bomba no chao de verdade (a grade de alturas diz onde)
      const S = BOMB_SITES[M.id] || { A: [M.zones[0].pos[0], M.zones[0].pos[2]], B: [M.zones[2].pos[0], M.zones[2].pos[2]] };
      this.sites = Object.entries(S).map(([id, [x, z]]) => ({ id, pos: [x, floorAt(M, x, z), z], r: BOMB.siteR }));
      this.roundN = 0;
      this.newRound();
    }
  }

  // ---------- plantar a bomba: rodadas ----------
  newRound() {
    this.roundN++;
    // intervalo: os times trocam de lado (o placar vai junto com cada time)
    if (this.roundN === BOMB.swapAfter + 1) {
      for (const p of this.players.values()) p.team = p.team === 'red' ? 'blue' : 'red';
      this.teamScore = { red: this.teamScore.blue, blue: this.teamScore.red };
      this.event({ k: 'halftime' });
    }
    this.roundT = BOMB.round; this.time = BOMB.round; this.roundOver = 0;
    for (const p of this.players.values()) { p.using = false; this.spawn(p); }
    const atk = [...this.players.values()].filter(p => p.team === 'red');
    const carrier = atk.length ? atk[Math.floor(Math.random() * atk.length)] : null;
    this.bomb = { state: carrier ? 'carried' : 'dropped', carrier: carrier ? carrier.id : null, pos: carrier ? [...carrier.pos] : [0, 0, 0], site: null, t: 0, prog: 0, actor: null, goal: Math.random() < 0.5 ? 'A' : 'B' };
    this.nades = []; this.anvils = []; this.blimps = []; this.uavs = []; this.nukes = []; this.streakGap = 0; fieldReset(this);
    if (this.roundN > 1) this.freezeT = COUNT_IN;
    this.event({ k: 'round', n: this.roundN, carrier: this.bomb.carrier });
  }

  roundEnd(team, why) {
    if (this.roundOver > 0 || this.over) return;
    this.teamScore[team]++;
    for (const p of this.players.values()) if (p.team === team) p.score += 100;
    this.roundOver = BOMB.roundEnd;
    this.event({ k: 'roundEnd', winner: team, why, n: this.roundN });
    if (this.teamScore[team] >= this.limit) this.end(team);
  }

  tickBomb(dt) {
    if (this.roundOver > 0) {
      this.roundOver -= dt;
      if (this.roundOver <= 0 && !this.over) this.newRound();
      return;
    }
    const B = this.bomb, alive = (t) => [...this.players.values()].filter(p => p.alive && p.team === t);
    if (B.state === 'planted') B.t -= dt; else this.roundT -= dt;
    this.time = Math.max(0, B.state === 'planted' ? B.t : this.roundT);
    // bomba no chao: qualquer atacante vivo que passar em cima pega
    if (B.state === 'carried') {
      const c = this.players.get(B.carrier);
      if (!c || !c.alive || c.team !== 'red') { B.state = 'dropped'; B.carrier = null; if (c) B.pos = [...c.pos]; this.event({ k: 'bomb', act: 'drop', pos: B.pos }); }
      else B.pos = [...c.pos];
    }
    if (B.state === 'dropped') for (const p of alive('red')) {
      if (dist2(p.pos, B.pos) > 1.7 * 1.7) continue;
      B.state = 'carried'; B.carrier = p.id; this.event({ k: 'bomb', act: 'take', id: p.id }); break;
    }
    // plantar: quem carrega, dentro de um ponto, segurando o botao
    let acted = false;
    if (B.state === 'carried') {
      const c = this.players.get(B.carrier), site = this.sites.find(s => Math.hypot(c.pos[0] - s.pos[0], c.pos[2] - s.pos[2]) < s.r && Math.abs(c.pos[1] - s.pos[1]) < 2);
      if (site && c.using) {
        acted = true; B.actor = c.id; B.kind = 'plant'; B.prog += dt;
        if (B.prog >= BOMB.plant) {
          B.state = 'planted'; B.site = site.id; B.pos = [...c.pos]; B.carrier = null; B.t = BOMB.fuse; B.prog = 0;
          c.score += 300;
          this.event({ k: 'bomb', act: 'plant', id: c.id, site: site.id, pos: B.pos });
        }
      }
    } else if (B.state === 'planted') {
      // desarmar: defensor vivo colado na bomba segurando o botao (o primeiro que comecou continua)
      const d = (B.actor && this.players.get(B.actor)) || null;
      const cand = d && d.alive && d.team === 'blue' && d.using && dist2(d.pos, B.pos) < BOMB.defuseR ** 2 ? d
        : alive('blue').find(p => p.using && dist2(p.pos, B.pos) < BOMB.defuseR ** 2);
      if (cand) {
        acted = true; if (B.actor !== cand.id) B.prog = 0;
        B.actor = cand.id; B.kind = 'defuse'; B.prog += dt;
        if (B.prog >= BOMB.defuse) { cand.score += 300; this.event({ k: 'bomb', act: 'defuse', id: cand.id }); B.state = 'defused'; this.roundEnd('blue', 'defuse'); return; }
      }
      if (B.t <= 0) {
        B.state = 'exploded';
        this.event({ k: 'boom', pos: [B.pos[0], B.pos[1] + 0.5, B.pos[2]], owner: null, big: true });
        for (const v of this.players.values()) if (v.alive && Math.sqrt(dist2(v.pos, B.pos)) < BOMB.blast) this.damage(v, null, 999, 'bomb', false);
        this.roundEnd('red', 'boom');
        return;
      }
    }
    if (!acted) { B.prog = 0; B.actor = null; }
    // fim por eliminacao ou tempo
    const r = alive('red').length, b = alive('blue').length;
    if (!b && this.players.size) this.roundEnd('red', 'elim');
    else if (!r && B.state !== 'planted') this.roundEnd('blue', 'elim');
    else if (this.roundT <= 0 && B.state !== 'planted') this.roundEnd('blue', 'time');
  }

  // ---------- jogadores ----------
  pickTeam(bot = false) {
    if (!this.cfg.teams || this.duo) return null; // dupla: pairDuo monta os pares
    // infectado: antes do primeiro infectado todo mundo e sobrevivente; depois, quem chega entra infectado
    if (this.mode === 'infect') return this.infStarted ? 'red' : 'blue';
    // bomba: gente vai pro lado com menos gente (bots nao contam: eles trocam de lado pra completar)
    if (this.mode === 'bomb' && !bot) { const n = this.teamHumans(); return n.red <= n.blue ? 'red' : 'blue'; }
    let r = 0, b = 0;
    for (const p of this.players.values()) { if (p.team === 'red') r++; else if (p.team === 'blue') b++; }
    return r <= b ? 'red' : 'blue';
  }

  // gente em cada lado (skip = quem esta trocando de lado)
  // modos em que da pra escolher o time no lobby (infectado sorteia, dupla e BR montam as duplas)
  teamPick() { return !!this.cfg.teams && this.mode !== 'infect' && this.mode !== 'br' && !this.duo; }

  teamHumans(skip) {
    const n = { red: 0, blue: 0 };
    for (const p of this.players.values()) if (!p.bot && p.id !== skip && p.team in n) n[p.team]++;
    return n;
  }

  // lobby da bomba: bots completam o lado mais vazio, pra sala ficar equilibrada em volta de quem escolheu
  // (vale pra todo modo de time no lobby: quem troca de lado puxa os bots pro outro)
  spreadBots() {
    if (!this.teamPick() || this.phase !== 'lobby') return;
    const n = this.teamHumans();
    for (const p of this.players.values()) if (p.bot) { p.team = n.red <= n.blue ? 'red' : 'blue'; n[p.team]++; }
  }

  addPlayer(id, name, bot = false) {
    const p = {
      id, name, bot, team: this.pickTeam(bot), hp: 100, alive: false, respawnT: 0.2,
      pos: [0, 0, 0], vel: [0, 0, 0], yaw: 0, pitch: 0, anim: 'idle', wpn: 'pistol', lastWpn: 'pistol',
      kills: 0, deaths: 0, score: 0, gunLvl: 0, streak: 0, ready: [], owned: new Set(SPAWN_KIT),
      nades: { frag: 1, flash: 1 }, budget: 300, los: null,
      ai: bot ? { t: 0, strafe: 1, stuckT: 0, last: [0, 0, 0], fireT: 0, goal: null, think: 0, react: 0, target: null, mag: 0, reloadT: 0, blind: 0, nadeT: rnd(4, 10) } : null,
    };
    this.players.set(id, p);
    // humano nasce no proximo tick, depois do 'welcome' chegar
    if (this.mode === 'bomb' && this.phase === 'play' && this.bomb) { p.alive = false; p.respawnT = 0; }
    else if (this.mode === 'br' && this.phase === 'play' && this.zone && !this.bounceOpen() && this.zone.phase + (this.zone.state === 'shrink' ? 1 : 0) > 0) { p.alive = false; p.respawnT = Infinity; } // chegou tarde: assiste
    else if (bot) this.spawn(p); else p.respawnT = 0.05;
    // battle royale ja rolando (jogo rapido): o br nao renasce sozinho, entao quem chega em tempo nasce por aqui
    if (!bot && this.mode === 'br' && this.phase === 'play' && p.respawnT < 1) p.lateSpawn = true;
    this.pairDuo();
    return p;
  }

  // dupla: humanos juntos primeiro (amigos da sala), bots completam. So no comeco (iris ainda esperando
  // a 1a fase): o bot que vira parceiro de alguem vai pro lado dele
  pairDuo() {
    if (!this.duo || (this.zone && (this.zone.phase > 0 || this.zone.state !== 'wait'))) return;
    const ps = [...this.players.values()].sort((a, b) => a.bot - b.bot);
    ps.forEach((p, i) => { p.team = 'd' + (1 + (i >> 1)); });
    for (let i = 1; i < ps.length; i += 2) {
      const a = ps[i - 1], b = ps[i];
      if (!b.bot || !a.alive || !b.alive || Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]) < 12) continue;
      b.pos = brNear(this, a.pos); b.vel = [0, 0, 0];
      if (b.ai) b.ai.path = null;
      this.event({ k: 'spawn', id: b.id, pos: b.pos, yaw: b.yaw, wpn: b.wpn, owned: [...b.owned], team: b.team });
    }
  }

  // configuracao da sala (host no lobby). Refaz modo/mapa/times e a partida do zero; os humanos ficam.
  configure(m) {
    const mode = MODES[m.mode] ? m.mode : this.modeId();
    this.duo = mode === 'duo';
    this.bounce = mode === 'bounce';
    this.mode = this.duo || this.bounce ? 'br' : mode;
    this.cfg = MODES[mode];
    const map = typeof m.map === 'string' && MAP_IDS.includes(m.map) && m.map !== 'ilha' ? m.map : 'auto';
    // escolta so roda na Ladeira do Bonde, e a Ladeira so serve pra escolta (o mapa precisa do trilho)
    const map2 = this.mode === 'escort' ? 'bonde' : map === 'bonde' ? 'auto' : map;
    this.mapPick = this.mode === 'br' ? 'ilha' : map2;
    this.M = getMap(this.mode === 'br' ? 'ilha' : map2 !== 'auto' ? map2 : MODE_MAP[this.mode]);
    if (Number.isFinite(m.bots)) this.wantBots = Math.max(0, Math.min(MAX_PLAYERS - 1, m.bots | 0));
    if ([0.7, 1, 1.35].includes(m.difficulty)) { this.difficulty = m.difficulty; this.skill = botSkill(m.difficulty); }
    this.limitPick = Number.isFinite(m.limit) ? Math.max(0, Math.min(500, m.limit | 0)) : 0;
    this.timePick = Number.isFinite(m.time) ? Math.max(0, Math.min(1800, m.time | 0)) : 0;
    if ('mut' in m) this.mut = !this.ranked && EVENTS[m.mut] ? m.mut : null; // evento de fim de semana
    // times do zero no modo novo (bomba/infectado/dupla tem regra propria de lado)
    this.infStarted = false;
    for (const p of this.players.values()) p.team = null;
    for (const p of this.players.values()) p.team = this.pickTeam(p.bot);
    this.reset();
    this.balanceBots();
    this.pairDuo();
    for (const p of this.players.values()) if (!p.bot) p.lobbyReady = false; // mudou a partida: todo mundo confirma de novo
    this.lobbyT = 0;
    this.event({ k: 'cfg' });
  }

  modeId() { return this.duo ? 'duo' : this.bounce ? 'bounce' : this.mode; }
  // Bate-Volta: ainda da pra renascer? (ate a fase `until` da iris)
  bounceOpen() { return this.bounce && !!this.zone && this.zone.phase + (this.zone.state === 'shrink' ? 1 : 0) < BR.bounce.until + 1 && this.zone.phase < BR.bounce.until; }

  // Jogo Rapido: acabou a partida, a proxima sai em outro modo e outro mapa (sorteados)
  nextQuick() {
    const atual = this.modeId();
    // battle royale e bate-volta sao os dois na ilha: depois de um deles a proxima sai em outro mapa
    const ilha = this.M.id === 'ilha';
    const modos = (this.ranked ? RANKED_MODES : QUICK_MODES).filter(m => m !== atual && !(ilha && (m === 'br' || m === 'bounce')));
    const mode = modos[Math.floor(Math.random() * modos.length)];
    const mapas = MAP_IDS.filter(id => id !== 'ilha' && id !== 'bonde' && id !== this.M.id); // a Ladeira so serve a escolta (configure forca)
    this.configure({ mode, map: mode === 'br' ? 'auto' : mapas[Math.floor(Math.random() * mapas.length)] });
  }

  // Jogo Rapido: da pra cair nesta sala agora? Partida rolando, sem fim a vista, com vaga, sem dupla;
  // battle royale so antes da iris comecar a fechar (depois disso quem chega so assiste)
  quickOpen() {
    if (this.phase !== 'play' || this.over || this.full() || this.duo) return false;
    if (this.bounce) return this.bounceOpen(); // bate-volta: entra enquanto da pra renascer
    if (this.mode === 'br') return !!this.zone && this.zone.phase === 0 && this.zone.state === 'wait';
    return true;
  }

  // sala cheia (16 pessoas): recusa (o servidor manda 'full' antes de chegar aqui)
  full() { return this.humans() >= MAX_PLAYERS; }

  join(id, name) {
    const p = this.addPlayer(id, (name || 'Player').slice(0, 14));
    this.balanceBots();
    this.send(id, { t: 'welcome', id, mode: this.mode, duo: this.duo, bounce: this.bounce, map: this.M.id, team: p.team, phase: this.phase });
    this.lobbyT = 0;
    // pecas das armas de quem ja estava na sala
    for (const o of this.players.values()) if (o.los && o.id !== id) this.send(id, { t: 'ev', k: 'lo', id: o.id, los: o.los, tracer: o.tracer });
    for (const o of this.players.values()) if (o.look && o.id !== id) this.send(id, { t: 'ev', k: 'look', id: o.id, look: o.look }); // visual de quem ja estava
    if (this.gg) this.send(id, { t: 'ev', k: 'ladder', id: this.gg.id, list: this.gg.list.map(u => u.body) });
    this.event({ k: 'msg', key: 'joined', name: p.name });
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    const wasHost = id === this.hostId();
    this.dropFlag(p);
    this.players.delete(id);
    // host saiu: o cargo passa pro proximo humano da sala (o mais antigo); todo mundo fica sabendo
    const nh = wasHost && this.hostId();
    if (nh) { this.event({ k: 'msg', key: 'newHost', name: this.players.get(nh).name }); this.lobbyT = 0; }
    if (this.waitLoad?.delete(id) && !this.waitLoad.size) this.startCountdown();
    this.balanceBots();
    if (this.mode === 'infect') this.checkInfect();
  }

  // modelo travado do degrau da escada de armas (fora dela, null)
  get ladder() { return this.gg?.list || GUN_LADDER; } // escada sorteada da partida
  ggBody(p) { return this.mode === 'gungame' ? this.ladder[Math.min(p.gunLvl, this.ladder.length - 1)].body : null; }
  // battle royale: a variante que a pessoa pegou no chao/caixote vale no lugar da sua (p.brBp)
  brBp(p, wpn) { return this.mode === 'br' ? p.brBp?.[wpn] || null : null; }
  bodyOf(p, wpn) { const b = this.brBp(p, wpn); return this.ggBody(p) || (b ? BLUEPRINTS[b].lo.body : p.los?.[wpn]?.body); }
  // variante de elite equipada (escada de armas usa o modelo do degrau, sem variante)
  bpOf(p, wpn) { return this.ggBody(p) ? {} : bpMods(this.brBp(p, wpn) || p.los?.[wpn]?.bp); }
  ammoOf(p, wpn) { const a = this.ggBody(p) || wpn === 'melee' || this.brBp(p, wpn) ? null : p.los?.[wpn]?.ammo; return AMMO[a] && (!AMMO[a].only || AMMO[a].only === wpn) ? a : null; } // balote so na escopeta

  // host = humano mais antigo na sala (Map guarda a ordem de entrada); saiu, passa pro proximo
  hostId() { for (const p of this.players.values()) if (!p.bot) return p.id; return null; }

  humans() { let n = 0; for (const p of this.players.values()) if (!p.bot) n++; return n; }

  balanceBots() {
    const humans = this.humans();
    const bots = [...this.players.values()].filter(p => p.bot);
    const want = Math.max(0, Math.min(this.wantBots - Math.max(0, humans - 1), MAX_PLAYERS - humans));
    while (bots.length < want) {
      const name = BOT_NAMES[this.botSeq++ % BOT_NAMES.length];
      bots.push(this.addPlayer('bot' + this.botSeq, name, true));
    }
    while (bots.length > want) this.players.delete(bots.pop().id);
    this.spreadBots();
    this.pairDuo();
  }

  // melhor ponto da lista: longe de inimigo, fora da visao dele e sem colar em colega
  bestSpawn(list, enemies, mates) {
    let best = null;
    for (const s of list) {
      if (!standable(this.M, s[0], s[1])) continue;
      const y = floorAt(this.M, s[0], s[1]);
      let m = 60;
      for (const e of enemies) m = Math.min(m, Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1]));
      // alguem ja olhando pra la? nascer na mira e' o pior que existe
      const seen = enemies.some(e => Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1]) < 45 && hasLOS(this.M, [e.pos[0], e.pos[1] + 1.5, e.pos[2]], [s[0], y + 1.4, s[1]]));
      // ponto ja ocupado: quase proibido (o freeSpot ainda afasta se nao tiver outro)
      const crowd = mates.some(o => Math.hypot(o.pos[0] - s[0], o.pos[2] - s[1]) < 2.2);
      const sc = m - (seen ? 25 : 0) - (crowd ? 40 : 0) + rnd(0, 8);
      if (!best || sc > best.sc) best = { s, y, sc };
    }
    return best;
  }

  // ninguem nasce dentro de ninguem: ponto ocupado (alguem vivo a menos de SPAWN_GAP) procura em
  // espiral um lugar livre ao lado, no mesmo piso e sem parede no meio
  freeSpot(p, x, z) {
    const SPAWN_GAP = 1.5;
    const others = [...this.players.values()].filter(o => o !== p && o.alive);
    const clear = (cx, cz) => others.every(o => Math.hypot(o.pos[0] - cx, o.pos[2] - cz) >= SPAWN_GAP);
    if (clear(x, z)) return [x, z];
    const y = floorAt(this.M, x, z);
    for (const r of [1.6, 3.2, 4.8, 6.4]) {
      const off = rnd(0, Math.PI * 2);
      for (let i = 0; i < 10; i++) {
        const a = off + (i / 10) * Math.PI * 2, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
        if (!standable(this.M, cx, cz) || Math.abs(floorAt(this.M, cx, cz) - y) > 0.3) continue;
        if (!clear(cx, cz) || !hasLOS(this.M, [x, y + 1, z], [cx, y + 1, cz])) continue;
        return [cx, cz];
      }
    }
    return [x, z];
  }

  spawn(p) {
    p.down = 0; p.reviveT = 0; p.brBp = null; // variante pega no BR some ao renascer (bate-volta)
    const S = this.M.spawns;
    const infect = this.mode === 'infect';
    let list = S.ffa;
    if (this.cfg.teams && p.team && !infect && S[p.team]) list = S[p.team];
    if (this.esc && p.team) list = [0, 1, 2, 3, 4, 5].map(() => escSpawn(this, p.team)); // escolta: atras/na frente do bonde
    const enemies = [...this.players.values()].filter(o => o !== p && o.alive && this.enemies(p, o));
    const mates = [...this.players.values()].filter(o => o !== p && o.alive && !this.enemies(p, o));
    let pick = this.bestSpawn(list, enemies, mates);
    // base do time "quente" (inimigo em cima): nasce num ponto neutro (escolta nao: o ponto neutro caia colado no bonde)
    if (list !== S.ffa && !this.esc && (!pick || pick.sc < 6)) { const alt = this.bestSpawn(S.ffa, enemies, mates); if (alt && (!pick || alt.sc > pick.sc)) pick = alt; }
    const s = this.mode === 'br' ? brSpawnPoint(this, p) : pick ? pick.s : list[0];
    let x = s[0], z = s[1];
    const jx = x + rnd(-0.8, 0.8), jz = z + rnd(-0.8, 0.8);
    if (standable(this.M, jx, jz) && Math.abs(floorAt(this.M, jx, jz) - floorAt(this.M, x, z)) < 0.1) { x = jx; z = jz; }
    [x, z] = this.freeSpot(p, x, z);
    const y = floorAt(this.M, x, z);
    p.pos = [x, y, z];
    p.vel = [0, 0, 0];
    p.yaw = this.openYaw(x, y, z);
    if (this.esc) { const q = escPos(this); p.yaw = Math.atan2(-(q[0] - x), -(q[2] - z)); } // escolta: nasce olhando pro bonde
    // bate-volta: todo mundo entra caindo do ceu (paraquedas); `drop` abre a janela do dano de queda
    if (this.bounce) { p.pos[1] = y + BR.bounce.dropH; p.drop = 30; p.chute = false; p.air = true; }
    p.hp = p.bot ? BOT_HP : 100;
    p.alive = true; p.shieldT = 0; // a barra do equipamento continua de onde estava (enche por pontos)
    const xn = hasSkill(p, 'bolso') ? SKILLS.bolso.nades : 0; // bolso fundo
    p.nades = { frag: 1 + xn, flash: 1 + xn };
    p.owned = new Set(SPAWN_KIT);
    if (this.mode !== 'gungame' && this.mode !== 'br') p.owned.add('melee');
    if (this.mode === 'gungame') p.wpn = this.ladder[Math.min(p.gunLvl, this.ladder.length - 1)].wpn;
    else if (infect && p.team === 'red') { p.owned = new Set(['melee']); p.wpn = 'melee'; p.hp = INFECT.hp; p.nades = { frag: 0, flash: 1 }; }
    else if (infect) {
      // sobrevivente: a arma sorteada da partida (igual pra todo mundo), pistola e faca
      const prim = this.infKit.wpn;
      p.owned = new Set([prim, 'pistol', 'melee']); p.wpn = prim;
    }
    else if (this.mode === 'br') { brSpawn(this, p); if (this.bounce && p.deaths > 0) { p.owned.add('pistol'); p.wpn = 'pistol'; } } // renasceu: volta com pistola
    else if (p.bot) p.wpn = ['smg', 'rifle', 'shotgun', 'pistol', 'smg', 'rifle'][Math.floor(Math.random() * 6)];
    else p.wpn = PRIMARIES.includes(p.primary) ? p.primary : 'smg';
    const E = EV(this.mut);
    if (E?.kit && this.mode !== 'gungame' && this.mode !== 'br' && !infect) { p.owned = new Set(E.kit); p.wpn = E.kit[0]; } // evento: armas fixas
    p.fuse = E?.fuse || 0; // bomba-relogio: pavio no peito
    p.maxHp = p.hp;
    p.owned.add(p.wpn);
    if (p.bot) { p.field ||= botPickField(); this.botReload(p, true); p.ai.blind = 0; p.ai.target = null; p.ai.path = null; }
    // mode vai junto: na troca de modo da sala o 'spawn' chega antes do 'start' e o cliente montava o kit do modo
    // velho (saindo da escada de armas ficava so com uma arma e nao trocava mais)
    this.event({ k: 'spawn', id: p.id, pos: p.pos, yaw: p.yaw, wpn: p.wpn, owned: [...p.owned], body: this.ggBody(p), team: p.team, air: !!p.air, mode: this.mode, mut: this.mut });
  }

  // nasce olhando pro lado mais aberto (puxado pro meio do mapa), nunca de cara pra parede
  openYaw(x, y, z) {
    const toC = Math.atan2(x, z);
    let best = toC, bs = -Infinity;
    for (let i = 0; i < 12; i++) {
      const a = toC + (i / 12) * Math.PI * 2;
      const d = [-Math.sin(a), 0, -Math.cos(a)];
      const free = Math.min(30, raycast(this.M, [x, y + 1.5, z], d, 30).dist);
      const sc = free + Math.cos(a - toC) * 8;
      if (sc > bs) { bs = sc; best = a; }
    }
    return best;
  }

  // ---------- mensagens do cliente ----------
  handle(id, m) {
    const p = this.players.get(id);
    if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'ready': {
        p.lobbyReady = !!m.v;
        this.lobbyT = 0;
        break;
      }
      // plantar a bomba: escolher o lado no lobby (lado com 8 pessoas recusa; bots se arrumam em volta)
      case 'team': {
        if (!this.teamPick() || this.phase !== 'lobby' || (m.team !== 'red' && m.team !== 'blue')) break;
        if (m.team !== p.team && this.teamHumans(id)[m.team] >= TEAM_MAX) break;
        p.team = m.team;
        this.spreadBots();
        this.lobbyT = 0;
        break;
      }
      // host muda a partida no lobby (modo, mapa, bots, meta, tempo, pontaria): vale pra sala toda na hora
      case 'cfg': {
        if (id !== this.hostId() || this.phase !== 'lobby') break;
        this.configure(m);
        break;
      }
      // so o host (primeiro humano da sala) solta a contagem, e so com TODO humano pronto (regra dele 30/10)
      case 'start': {
        if (id !== this.hostId() || this.phase !== 'lobby') break;
        const wait = [...this.players.values()].filter(o => !o.bot && o.id !== id && !o.lobbyReady).length;
        if (wait) { this.send(id, { t: 'ev', k: 'notReady', n: wait }); break; }
        this.phase = 'count'; this.countT = COUNTDOWN; this.lobbyT = 0;
        break;
      }
      // segurando o botao de usar (plantar / desarmar)
      case 'use':
        p.using = !!m.v && p.alive;
        break;
      // terminou de carregar a partida: quando todo humano avisar, sai a contagem
      case 'loaded': {
        if (this.waitLoad?.delete(id) && !this.waitLoad.size) this.startCountdown();
        break;
      }
      case 'field': fieldUse(this, p, m); break;
      case 'respawn': {
        if (!p.alive && p.respawnT <= 0) p.wantSpawn = true;
        break;
      }
      case 'loadout': {
        if (Number.isFinite(m.lvl)) p.lvl = Math.max(1, Math.min(99, Math.round(m.lvl)));
        if (typeof m.elite === 'boolean') p.elite = m.elite; // selo Elite da Rovex (so visual)
        p.rk = Number.isInteger(m.rk) && m.rk >= 0 && m.rk <= 4 ? m.rk : -1; // badge da rankeada (so visual)
        p.prest = Math.max(0, Math.min(10, m.prest | 0)); // estrelas de prestigio (so visual)
        if (PRIMARIES.includes(m.primary)) p.primary = m.primary;
        // skills passivas: so ids conhecidos, sem repetir, ate SKILL_SLOTS e liberadas pro nivel informado
        p.skills = Array.isArray(m.skills) ? [...new Set(m.skills.filter(s => SKILLS[s] && (p.lvl || 1) >= SKILLS[s].lvl))].slice(0, SKILL_SLOTS) : [];
        p.los = cleanLoadouts(m.los);
        p.field = FIELD[m.field] && (p.lvl || 1) >= FIELD[m.field].lvl ? m.field : null; // equipamento de campo
        p.tracer = typeof m.tracer === 'string' && /^[a-z]{2,10}$/.test(m.tracer) ? m.tracer : 'chalk';
        this.event({ k: 'lo', id, los: p.los, tracer: p.tracer });
        break;
      }
      case 'look': {
        // visual do boneco: so o que existe no catalogo; repassa pra sala
        p.look = cleanLook(m.look);
        this.event({ k: 'look', id, look: p.look });
        break;
      }
      case 'fall': {
        // bate-volta: soltou o paraquedas e bateu forte no chao. So vale uma vez por queda, perto do chao.
        if (!this.bounce || !p.alive || !(p.drop > 0)) break;
        p.drop = 0; p.air = false;
        const d = Math.max(0, Math.min(100, Number(m.dmg) || 0));
        if (d > 0) this.damage(p, null, d, 'fall', false);
        break;
      }
      case 'state':
        if (!p.alive) return;
        if (!Array.isArray(m.pos) || m.pos.length !== 3 || !m.pos.every(Number.isFinite)) return;
        if (!Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)) return;
        p.pos = clampArena(this.M, m.pos); p.yaw = m.yaw; p.pitch = m.pitch; p.anim = String(m.anim).slice(0, 8);
        if (this.mode !== 'gungame' && WEAPONS[m.wpn] && m.wpn !== p.wpn && (this.mode !== 'infect' || p.owned.has(m.wpn))) { p.lastWpn = p.wpn; p.wpn = m.wpn; }
        break;
      case 'swing':
        if (p.alive) this.event({ k: 'swing', id });
        break;
      case 'shot':
        if (!WEAPONS[m.wpn] || !Array.isArray(m.o)) return;
        this.event({ k: 'shot', id, o: m.o, e: m.e, wpn: m.wpn });
        break;
      case 'hit': {
        const v = this.players.get(m.v);
        if (!v || !p.alive || !v.alive || p.down > 0) return; // caido nao atira
        const dmg = this.validHit(p, v, m);
        if (dmg > 0) {
          const am = this.ammoOf(p, m.wpn), vpos = [...v.pos];
          this.hitAm = am && am !== 'none' ? am : null; this.damage(v, p, dmg, m.wpn, !!m.head);
          if (am === 'fire' && v.alive) v.burn = { n: 4, a: p.id, wpn: m.wpn, acc: 0 }; // queima (tick no update)
          if (am === 'boom') { // respinga em quem esta perto do alvo
            const A = AMMO.boom;
            this.event({ k: 'boom', at: [vpos[0], vpos[1] + 1, vpos[2]] });
            for (const o of this.players.values()) {
              if (o === v || o === p || !o.alive || !this.enemies(p, o)) continue;
              const d = Math.sqrt(dist2(vpos, o.pos));
              if (d < A.splash) this.damage(o, p, dmg * A.splashK * (1 - d / A.splash * 0.5), m.wpn, false);
            }
          }
          this.hitAm = null;
        }
        break;
      }
      case 'hitBlimp': { // tiro no dirigivel inimigo: enche de furo ate estourar
        const b = this.blimps.find(x => x.id === m.id), w = WEAPONS[m.wpn], owner = b && this.players.get(b.owner);
        if (!b || !w || w.melee || !p.alive || p.down > 0 || !Number.isFinite(m.dmg) || m.dmg <= 0) return;
        if (owner && !this.enemies(p, owner)) return;
        if (m.wpn !== p.wpn && m.wpn !== p.lastWpn) return;
        const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
        if (Math.sqrt(dist2(eye, b.pos)) > (w.range || 260) + 10 || !hasLOS(this.M, eye, b.pos)) return;
        const dmg = Math.min(m.dmg, w.dmg * (w.pellets || 1) * 1.5, Math.max(0, p.budget));
        if (dmg <= 0) return;
        p.budget -= dmg;
        b.hp -= dmg;
        if (b.hp <= 0) {
          this.blimps = this.blimps.filter(x => x !== b); this.streakGap = 0; // some e libera a proxima sequencia na hora
          this.event({ k: 'blimpDown', id: p.id, owner: b.owner, pos: [...b.pos] });
        }
        break;
      }
      // marcacao (ping) do battle royale: so o time ve (dupla = o parceiro; sozinho = so voce)
      case 'ping': {
        if ((this.mode !== 'br' && !this.pingAny) || !p.alive) break; // pingAny: treino (passo de marcar)
        const now = this.clock || 0;
        if (now - (p.pingAt || -9) < 0.4) break;
        p.pingAt = now;
        const off = !!m.off;
        if (!off && !(Array.isArray(m.pos) && m.pos.length === 3 && m.pos.every(Number.isFinite))) break;
        const kind = ['spot', 'item', 'enemy'].includes(m.kind) ? m.kind : 'spot';
        const ev = { t: 'ev', k: 'ping', id, off, pos: off ? null : m.pos.map(v => Math.round(v * 10) / 10), kind, label: String(m.label || '').slice(0, 32) };
        for (const o of this.players.values()) if (!o.bot && (o.id === id || (this.duo && o.team === p.team))) this.send(o.id, ev);
        break;
      }
      case 'nade':
        if (p.alive && !(p.down > 0) && NADES[m.kind] && p.nades[m.kind] > 0 && Array.isArray(m.d) && m.d.every(Number.isFinite)) {
          p.nades[m.kind]--;
          this.throwNade(p, m.kind, norm(m.d), Number(m.cook) || 0, m.hand === true);
        }
        break;
      case 'streak':
        if (p.alive) this.useStreak(p, m.kind);
        break;
      case 'chat':
        this.event({ k: 'msg', text: `${p.name}: ${String(m.text).slice(0, 80)}` });
        break;
    }
  }

  // Acerto vindo do cliente: confere arma, alcance, linha de visao e taxa de dano
  validHit(p, v, m) {
    const w = WEAPONS[m.wpn];
    if (!w || !Number.isFinite(m.dmg) || m.dmg <= 0) return 0;
    // infectado so mata na lamina
    if (this.mode === 'infect' && p.team === 'red' && !w.melee) return 0;
    // faca rapida vale com qualquer arma na mao; o resto so com a arma que ele segura
    if (!w.melee && m.wpn !== p.wpn && m.wpn !== p.lastWpn) return 0;
    const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
    const d = Math.sqrt(dist2(eye, v.pos));
    const range = w.melee ? (m.wpn === 'fists' ? w.range : bodyTrait(this.bodyOf(p, 'melee')).range || w.range) * 1.4 + 0.6 : (w.range || 260) * ((AMMO[this.ammoOf(p, m.wpn)] || {}).range || 1); // balote alcanca mais
    if (d > range) return 0;
    if (w.melee) { const now = this.clock || 0; if (now - (p.meleeAt || -9) < 0.3) return 0; p.meleeAt = now; return Math.min(m.dmg, w.dmg); }
    const chest = [v.pos[0], v.pos[1] + 1.1, v.pos[2]], head = [v.pos[0], v.pos[1] + 1.6, v.pos[2]];
    const am = this.ammoOf(p, m.wpn), A = am ? AMMO[am] : {};
    let wallK = 1;
    if (!hasLOS(this.M, eye, chest) && !hasLOS(this.M, eye, head)) {
      // perfurante: passa por parede fina, com menos dano
      if (am !== 'ap' || Math.min(wallThickness(this.M, eye, chest), wallThickness(this.M, eye, head)) > A.pierce) return 0;
      wallK = A.wallK;
    }
    const tr = bodyTrait(this.bodyOf(p, m.wpn));
    const maxShot = w.dmg * (w.pellets || 1) * (tr.dmg || 1) * (this.bpOf(p, m.wpn).dmg || 1) * (A.dmg || 1) * wallK * 1.25;
    const dmg = Math.min(m.dmg, maxShot);
    if (p.budget < dmg) return Math.max(0, p.budget);
    p.budget -= dmg;
    return dmg;
  }

  event(ev) {
    // tiro de gente (nao do dirigivel) vira barulho: bot perto ouve e vai ver (some em 3 s)
    if (ev.k === 'shot' && this.players.has(ev.id) && ev.o) (this.noises ||= new Map()).set(ev.id, { pos: [ev.o[0], ev.o[1] - 1.4, ev.o[2]], t: 3 }); // so o ultimo tiro de cada um
    this.send(null, { t: 'ev', ...ev });
  }

  // ---------- combate ----------
  enemies(a, b) { return a !== b && (!this.cfg.teams || a.team !== b.team); }

  damage(v, a, dmg, wpn, head, burn = false) {
    if (this.over || this.freezeT > 0 || !v.alive || !Number.isFinite(dmg)) return;
    if (a && a !== v && !this.enemies(a, v)) return;
    if (fieldBlocks(this, v, a, wpn, head ? dmg * 1.6 : dmg)) return; // guarda-chuva aberto de frente pro tiro (gasta a vida dele)
    const E = EV(this.mut);
    if (head) dmg = E?.oneHead && wpn !== 'melee' ? 999 : dmg * (E?.headMul || 1.6); // evento: cabecao doi mais; duelo: cuca derruba
    if (BLAST.includes(wpn) && hasSkill(v, 'couro')) dmg *= SKILLS.couro.blast; // couro grosso
    if (this.mode === 'br' && wpn !== 'iris') dmg = brArmor(v, dmg); // colete (a iris passa direto)
    v.hurtAt = this.clock || 0;
    v.hp -= dmg;
    // quem ajudou: dano acumulado por atacante, com hora (assistencia vale por 6 s)
    if (a && a !== v) { v.dmgBy = v.dmgBy || {}; const r = v.dmgBy[a.id] || (v.dmgBy[a.id] = { dmg: 0, t: 0 }); r.dmg += dmg; r.t = this.clock || 0; }
    // am = tipo de bala do golpe (fogo, rastreadora, explosiva, perfurante): a tela de quem levou mostra o efeito
    this.event({ k: 'hurt', v: v.id, a: a ? a.id : null, dmg: Math.round(dmg), from: a ? a.pos : null, head, ...(burn ? { burn: 1 } : {}), ...(this.hitAm ? { am: this.hitAm } : {}) });
    if (v.hp <= 0 && !(this.duo && brDown(this, v, a, wpn, head))) this.kill(v, a, wpn, head); // dupla: cai antes de sair
  }

  kill(v, a, wpn, head) {
    v.alive = false; v.hp = 0; v.down = 0; v.reviveT = 0; v.respawnT = this.mode === 'infect' && this.infStarted ? INFECT.infectedRespawn : RESPAWN; v.deaths++; v.streak = 0;
    this.dropFlag(v);
    const suicide = !a || a === v;
    if (!suicide) {
      // abate da propria Torta Atomica nao conta pra sequencia (senao ela se alimentava)
      a.kills++; if (wpn !== 'nuke') a.streak++; a.score += 100;
      const E = EV(this.mut);
      if (E?.killHeal && a.alive) a.hp = Math.min(a.maxHp || 100, a.hp + E.killHeal); // vampiro: abate enche a vida
      if (E?.fuseKill && a.alive) a.fuse = Math.min(99, (a.fuse || 0) + E.fuseKill); // bomba-relogio: abate da mais pavio
      if (this.cfg.teams && this.mode === 'tdm') this.teamScore[a.team]++;
      // escada de armas (31/10, pedido dele): so sobe quem mata com a arma do degrau; abate de faca fora do
      // degrau da faca nao sobe ninguem e derruba a vitima um degrau (no ultimo degrau a arma E a faca: vence)
      const ggRung = this.mode === 'gungame' ? this.ladder[Math.min(a.gunLvl, this.ladder.length - 1)].wpn : null;
      if (this.mode === 'gungame' && wpn === 'melee' && ggRung !== 'melee') {
        if (v.gunLvl > 0) v.gunLvl--;
        this.event({ k: 'ggDown', id: v.id, by: a.id, lvl: v.gunLvl });
      } else if (this.mode === 'gungame' && WEAPONS[wpn] && wpn === ggRung) {
        a.gunLvl++;
        if (a.gunLvl >= this.ladder.length) { a.gunLvl = this.ladder.length - 1; this.end(a.name); }
        else { a.wpn = this.ladder[a.gunLvl].wpn; this.event({ k: 'give', id: a.id, wpn: a.wpn, force: true, body: this.ggBody(a) }); }
      }
      if (this.mode !== 'infect' && this.mode !== 'bomb' && this.mode !== 'br' && wpn !== 'nuke') for (const [kind, s] of Object.entries(STREAKS)) {
        if (a.streak === s.kills - (hasSkill(a, 'pavio') && s.kills > 3 ? SKILLS.pavio.streak : 0)) {
          a.ready.push(kind);
          this.event({ k: 'streakReady', id: a.id, kind });
          if (a.bot) this.useStreak(a, kind);
        }
      }
    }
    // assistencias: quem deu 20+ de dano nos ultimos 6 s e nao foi quem matou
    for (const [id, r] of Object.entries(v.dmgBy || {})) {
      const h = this.players.get(id);
      if (!h || h === a || r.dmg < 20 || (this.clock || 0) - r.t > 6) continue;
      h.score += 50; h.assists = (h.assists || 0) + 1;
      this.event({ k: 'assist', id, v: v.id, dmg: Math.round(r.dmg) });
    }
    v.dmgBy = {};
    if (this.mode === 'br') brKill(this, v);
    this.event({ k: 'kill', a: suicide ? null : a.id, v: v.id, wpn, head, streak: suicide ? 0 : a.streak, pos: v.pos });
    // sobrevivente que cai (de qualquer jeito) vira infectado
    if (this.mode === 'infect' && v.team === 'blue' && this.infStarted) this.infect(v, suicide ? null : a);
    if (this.mode === 'ffa' && !suicide && a.kills >= this.limit) this.end(a.name);
    if (this.mode === 'tdm' && !suicide && this.teamScore[a.team] >= this.limit) this.end(a.team);
  }

  // ---------- infectado ----------
  infect(v, by, first = false) {
    v.team = 'red';
    v.streak = 0;
    if (v.alive) {
      // vivo (o primeiro sorteado): larga tudo e fica so com a lamina na hora
      v.owned = new Set(['melee']); v.wpn = 'melee'; v.nades = { frag: 0, flash: 1 };
      if (v.bot) this.botReload(v, true);
      this.event({ k: 'give', id: v.id, wpn: 'melee', force: true });
    }
    this.event({ k: 'infected', id: v.id, by: by ? by.id : null, first });
    this.checkInfect();
  }

  checkInfect() {
    if (this.mode !== 'infect' || !this.infStarted || this.over) return;
    const surv = [...this.players.values()].filter(p => p.team === 'blue');
    if (!surv.length) { this.end('red'); return; }
    // ultimo sobrevivente: radar o resto da partida e municao cheia (todo mundo fica sabendo)
    if (surv.length === 1 && !this.lastStand) {
      const last = surv[0];
      this.lastStand = last.id;
      this.uavs.push({ owner: last.id, team: 'blue', t: 9999 });
      if (last.alive) for (const w of last.owned) if (w !== 'melee') this.event({ k: 'give', id: last.id, wpn: w, refill: true });
      this.event({ k: 'lastStand', id: last.id });
    }
    // o infectado saiu e nao sobrou nenhum: sorteia outro
    if (![...this.players.values()].some(p => p.team === 'red')) {
      const alive = surv.filter(p => p.alive);
      if (alive.length > 1) this.infect(alive[Math.floor(Math.random() * alive.length)], null, true);
    }
  }

  tickInfect(dt) {
    let r = 0, b = 0;
    for (const p of this.players.values()) { if (p.team === 'red') r++; else b++; }
    this.teamScore.red = r; this.teamScore.blue = b;
    if (!this.infStarted) {
      this.infT -= dt;
      if (this.infT > 0) return;
      const alive = [...this.players.values()].filter(p => p.alive);
      if (alive.length < 2) { this.infT = 1; return; }
      this.infStarted = true;
      this.infect(alive[Math.floor(Math.random() * alive.length)], null, true);
      return;
    }
    // sobreviver rende pontos (e XP no cliente)
    this.surviveT -= dt;
    if (this.surviveT <= 0) {
      this.surviveT = INFECT.surviveTick;
      for (const p of this.players.values()) if (p.alive && p.team === 'blue') { p.score += 50; this.event({ k: 'survive', id: p.id }); }
    }
  }

  // ---------- contagem de inicio (todo mundo carregou) ----------
  startCountdown() {
    this.waitLoad = null;
    this.freezeT = COUNT_IN;
    this.event({ k: 'countdown', t: COUNT_IN });
  }

  // ---------- granadas ----------
  // cook = segundos que segurou com o pino puxado (o pavio ja andou); hand = estourou na mao
  throwNade(p, kind, d, cook = 0, hand = false) {
    const fuse = NADES[kind].fuse;
    if (hand) { // passou do pavio segurando: estoura ali mesmo, na altura do peito
      this.nades.push({ id: this.seq++, kind, owner: p.id, pos: [p.pos[0], p.pos[1] + 1.1, p.pos[2]], vel: [0, 0, 0], fuse: 0, hand: true });
      return;
    }
    const { pos, vel } = nadeLaunch(p.pos, d, kind);
    this.nades.push({ id: this.seq++, kind, owner: p.id, pos, vel, fuse: Math.max(0.05, fuse - Math.max(0, Math.min(fuse, cook || 0))) });
    this.event({ k: 'throw', id: p.id, kind });
  }

  tickNades(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i];
      n.fuse -= dt;
      if (nadeStep(this.M, n, dt) > 3) this.event({ k: 'bounce', pos: n.pos });
      if (n.fuse <= 0) { this.detonate(n); this.nades.splice(i, 1); }
    }
  }

  // evento de fim de semana: chuva de bigornas (perto de quem esta vivo, com aviso) e bomba-relogio (zerou = KABUM)
  tickEvent(dt) {
    const E = EV(this.mut);
    if (!E || this.over) return;
    if (E.anvilRain && (this.rainT = (this.rainT ?? 3) - dt) <= 0) {
      this.rainT = E.anvilRain * (0.6 + Math.random() * 0.8);
      const alive = [...this.players.values()].filter(p => p.alive), list = [];
      for (let k = 0; k < 2 && alive.length; k++) {
        const v = alive[Math.floor(Math.random() * alive.length)];
        for (let j = 0; j < 6; j++) { const x = v.pos[0] + rnd(-7, 7), z = v.pos[2] + rnd(-7, 7); if (standable(this.M, x, z)) { list.push([x, floorAt(this.M, x, z), z]); break; } }
      }
      for (const pos of list) this.anvils.push({ owner: null, pos, t: 1.4 + Math.random() * 0.4 });
      if (list.length) this.event({ k: 'anvilWarn', list });
    }
    if (E.fuse) for (const p of this.players.values()) {
      if (!p.alive || !(p.fuse > 0) || p.down > 0) continue;
      if ((p.fuse -= dt) <= 0) { p.fuse = 0; this.detonate({ kind: 'frag', pos: [p.pos[0], p.pos[1] + 1.1, p.pos[2]], owner: p.id, hand: true }); }
    }
  }

  detonate(n) {
    const owner = this.players.get(n.owner);
    if (n.kind === 'frag') {
      const R = NADES.frag.radius;
      this.event({ k: 'boom', pos: n.pos, owner: n.owner });
      for (const v of this.players.values()) {
        if (!v.alive) continue;
        const c = [v.pos[0], v.pos[1] + 0.9, v.pos[2]];
        const d = Math.sqrt(dist2(c, n.pos));
        if (d > R || !hasLOS(this.M, [n.pos[0], n.pos[1] + 0.3, n.pos[2]], c)) continue;
        let dmg = NADES.frag.dmg * (1 - d / R) + 15;
        if (v.id === n.owner) dmg = n.hand ? 999 : dmg * 0.5; // estourou na mao: quem segurava cai
        else if (owner && !this.enemies(owner, v)) continue;
        this.damage(v, owner || v, dmg, 'frag', false);
      }
    } else {
      this.event({ k: 'flash', pos: n.pos, owner: n.owner });
      for (const v of this.players.values()) {
        if (!v.alive || !v.bot) continue;
        const d = Math.sqrt(dist2(v.pos, n.pos));
        if (d < 15 && hasLOS(this.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], n.pos)) { v.ai.blind = 3.2 * (1 - d / 15) + 0.6; v.ai.target = null; }
      }
    }
  }

  // ---------- sequencias de abates ----------
  // uma sequencia no ar por vez na sala: enquanto dirigivel/radar/bigornas/torta estiverem ativos (e mais
  // STREAK_GAP s depois), ninguem chama outra. A sequencia fica guardada e o jogador ve o que esta no ar.
  streakLock() {
    // radar fica fora da fila (regra dele 30/10): nao trava nem e travado; chamar de novo so estende
    const kind = this.nukes.length ? 'nuke' : this.blimps.length ? 'blimp' : this.anvils.some(a => a.streak) ? 'anvil' : null;
    if (kind) {
      const t = kind === 'nuke' ? Math.max(...this.nukes.map(n => n.t)) : kind === 'blimp' ? Math.max(...this.blimps.map(b => b.t)) : Math.max(...this.anvils.filter(a => a.streak).map(a => a.t));
      return { kind, t: t + STREAK_GAP };
    }
    return this.streakGap > 0 ? { kind: 'gap', t: this.streakGap } : null;
  }

  useStreak(p, kind) {
    const i = p.ready.indexOf(kind);
    if (i < 0) return;
    if (kind === 'uav') {
      p.ready.splice(i, 1);
      const mine = this.uavs.find(u => (this.cfg.teams ? u.team === p.team : u.owner === p.id) && this.players.has(u.owner));
      if (mine) mine.t += STREAKS.uav.time; // ja tem radar no ar: soma o tempo
      else this.uavs.push({ owner: p.id, team: p.team, t: STREAKS.uav.time });
      this.event({ k: 'streak', id: p.id, kind, team: p.team });
      return;
    }
    const lock = this.streakLock();
    if (lock) { if (!p.bot) this.send(p.id, { t: 'ev', k: 'streakWait', kind: lock.kind, n: Math.ceil(lock.t) }); return; }
    p.ready.splice(i, 1);
    this.streakGap = STREAK_GAP;
    const A = this.M.arena;
    if (kind === 'anvil') {
      const targets = [...this.players.values()].filter(o => o.alive && !o.inRing && this.enemies(p, o)).slice(0, 7);
      const list = targets.map(o => [o.pos[0] + rnd(-1.2, 1.2), 0, o.pos[2] + rnd(-1.2, 1.2)]);
      if (!list.length) list.push([rnd(-A / 2, A / 2), 0, rnd(-A / 2, A / 2)]);
      for (const pos of list) this.anvils.push({ owner: p.id, pos, t: 1.7 + rnd(0, 0.5), streak: true });
      this.event({ k: 'anvilWarn', list });
    }
    if (kind === 'blimp') this.blimps.push({ id: this.blimpSeq = (this.blimpSeq || 0) + 1, owner: p.id, team: p.team, t: STREAKS.blimp.time, hp: STREAKS.blimp.hp, ang: rnd(0, 6.28), fireT: 1, pos: [0, 28, 0] });
    if (kind === 'nuke') this.nukes.push({ owner: p.id, t: STREAKS.nuke.delay });
    this.event({ k: 'streak', id: p.id, kind, team: p.team, delay: kind === 'nuke' ? STREAKS.nuke.delay : undefined });
  }

  tickStreaks(dt) {
    // intervalo entre sequencias: so comeca a contar quando a do ar acaba
    if (this.nukes.length || this.blimps.length || this.anvils.some(a => a.streak)) this.streakGap = STREAK_GAP;
    else if (this.streakGap > 0) this.streakGap -= dt;
    // bot com sequencia guardada chama assim que a sala libera (um por vez)
    if (!this.over) {
      const livre = !this.streakLock();
      const b = [...this.players.values()].find(o => o.bot && o.alive && (o.ready.includes('uav') || (livre && o.ready.length)));
      if (b) this.useStreak(b, b.ready.includes('uav') ? 'uav' : b.ready[0]);
    }
    // Torta Atomica: quando o pavio acaba, todo inimigo vivo cai; a partida segue (quem chamou saiu = cancela)
    for (const n of this.nukes) {
      n.t -= dt;
      if (n.t > 0 || this.over) continue;
      const o = this.players.get(n.owner);
      if (!o) continue;
      const hit = [...this.players.values()].filter(v => v.alive && this.enemies(o, v));
      this.event({ k: 'nuke', id: o.id, team: o.team, n: hit.length });
      for (const v of hit) if (v.alive && !this.over) this.kill(v, o, 'nuke', false);
    }
    this.nukes = this.nukes.filter(n => n.t > 0 && this.players.has(n.owner) && !this.over);
    for (const u of this.uavs) u.t -= dt;
    this.uavs = this.uavs.filter(u => u.t > 0 && this.players.has(u.owner));
    for (let i = this.anvils.length - 1; i >= 0; i--) {
      const a = this.anvils[i];
      a.t -= dt;
      if (a.t > 0) continue;
      this.anvils.splice(i, 1);
      const owner = this.players.get(a.owner);
      this.event({ k: 'anvil', pos: a.pos });
      for (const v of this.players.values()) {
        if (!v.alive || (owner && !this.enemies(owner, v) && v !== owner)) continue;
        const d = Math.hypot(v.pos[0] - a.pos[0], v.pos[2] - a.pos[2]);
        if (d < 3.4 && v.pos[1] < 6) this.damage(v, owner || v, 260 * (1 - d / 4.5), 'anvil', false);
      }
    }
    const A = this.M.arena;
    for (const b of this.blimps) {
      b.t -= dt;
      b.ang += dt * 0.18;
      b.pos = [Math.cos(b.ang) * A * 0.45, 28, Math.sin(b.ang) * A * 0.45];
      b.fireT -= dt;
      const owner = this.players.get(b.owner);
      if (b.fireT > 0 || !owner) continue;
      b.fireT = 0.55;
      let best = null, bd = 1e9;
      for (const v of this.players.values()) {
        if (!v.alive || !this.enemies(owner, v)) continue;
        const c = [v.pos[0], v.pos[1] + 1.1, v.pos[2]];
        const d = dist2(c, b.pos);
        if (d < bd && hasLOS(this.M, b.pos, c)) { bd = d; best = v; }
      }
      if (!best) continue;
      const hitIt = Math.random() < 0.6;
      const e = [best.pos[0] + (hitIt ? 0 : rnd(-2, 2)), best.pos[1] + 1, best.pos[2] + (hitIt ? 0 : rnd(-2, 2))];
      this.event({ k: 'shot', id: 'blimp', o: b.pos, e, wpn: 'rifle' });
      if (hitIt) this.damage(best, owner, STREAKS.blimp.dmg, 'blimp', false);
    }
    this.blimps = this.blimps.filter(b => b.t > 0 && this.players.has(b.owner));
  }

  // ---------- bandeiras ----------
  dropFlag(p) {
    for (const team of ['red', 'blue']) {
      const f = this.flags[team];
      if (f.state === 'carried' && f.carrier === p.id) {
        f.state = 'dropped'; f.carrier = null; f.pos = [p.pos[0], p.pos[1], p.pos[2]]; f.dropT = 20;
        this.event({ k: 'flag', team, act: 'drop', who: p.name });
      }
    }
  }

  tickCTF(dt) {
    const FB = this.M.flagBase;
    for (const team of ['red', 'blue']) {
      const f = this.flags[team];
      const enemyTeam = team === 'red' ? 'blue' : 'red';
      if (f.state === 'carried') {
        const c = this.players.get(f.carrier);
        if (!c || !c.alive) { f.state = 'dropped'; f.carrier = null; f.dropT = 20; continue; }
        f.pos = [c.pos[0], c.pos[1], c.pos[2]];
        const home = this.flags[enemyTeam];
        if (home.state === 'home' && dist2(c.pos, FB[enemyTeam]) < 2.6 * 2.6) {
          this.teamScore[enemyTeam]++;
          c.score += 300;
          f.state = 'home'; f.carrier = null; f.pos = [...FB[team]];
          this.event({ k: 'flag', team, act: 'cap', who: c.name, by: enemyTeam });
          if (this.teamScore[enemyTeam] >= this.limit) this.end(enemyTeam);
        }
        continue;
      }
      if (f.state === 'dropped') {
        f.dropT -= dt;
        if (f.dropT <= 0) { f.state = 'home'; f.pos = [...FB[team]]; this.event({ k: 'flag', team, act: 'return', who: '' }); continue; }
      }
      for (const p of this.players.values()) {
        if (!p.alive || dist2(p.pos, f.pos) > 2.2 * 2.2) continue;
        if (p.team === enemyTeam) { f.state = 'carried'; f.carrier = p.id; this.event({ k: 'flag', team, act: 'take', who: p.name }); break; }
        if (p.team === team && f.state === 'dropped') {
          f.state = 'home'; f.pos = [...FB[team]]; p.score += 100;
          this.event({ k: 'flag', team, act: 'return', who: p.name });
          break;
        }
      }
    }
  }

  tickDOM(dt) {
    for (const z of this.zones) {
      let r = 0, b = 0;
      for (const p of this.players.values()) {
        if (!p.alive) continue;
        if ((p.pos[0] - z.pos[0]) ** 2 + (p.pos[2] - z.pos[2]) ** 2 > z.r * z.r) continue;
        if (Math.abs(p.pos[1] - z.pos[1]) > 2.5) continue;
        if (p.team === 'red') r++; else b++;
      }
      const prev = z.owner;
      if (r !== b) {
        const dir = r > b ? -1 : 1;
        z.prog = Math.max(-1, Math.min(1, z.prog + dir * dt * 0.32 * Math.min(3, Math.abs(r - b))));
      }
      if (z.prog <= -1) z.owner = 'red';
      else if (z.prog >= 1) z.owner = 'blue';
      else if (z.owner && ((z.owner === 'red' && z.prog > 0) || (z.owner === 'blue' && z.prog < 0))) z.owner = null;
      if (z.owner !== prev && z.owner) this.event({ k: 'zone', id: z.id, team: z.owner });
      if (z.owner) this.teamScore[z.owner] += dt;
    }
    for (const t of ['red', 'blue']) if (this.teamScore[t] >= this.limit) { this.teamScore[t] = this.limit; this.end(t); }
  }

  end(winner) {
    if (this.over) return;
    this.over = true; this.overT = 12.5; // +3,5 s: a camera da ultima morte roda antes do placar
    this.event({ k: 'end', winner });
  }

  // ---------- bots ----------
  tickBot(p, dt) {
    const ai = p.ai, M = this.M;
    if (p.air) {
      const fl = floorAt(M, p.pos[0], p.pos[2]);
      if (p.pos[1] - fl < BR.bounce.dropH - 6) p.chute = true;
      p.vel[1] = Math.max(p.vel[1] - 24 * dt, -(p.chute ? BR.bounce.chute : BR.bounce.freefall));
      const z = this.zone?.to || this.zone, tx = z ? z.c[0] - p.pos[0] : 0, tz = z ? z.c[1] - p.pos[2] : 0, tl = Math.hypot(tx, tz) || 1;
      const sp = tl > 8 ? BR.bounce.airSpeed * 0.7 : 0;
      p.vel[0] += ((tx / tl) * sp - p.vel[0]) * Math.min(1, 2 * dt); p.vel[2] += ((tz / tl) * sp - p.vel[2]) * Math.min(1, 2 * dt);
      p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, 1.7);
      p.anim = p.chute ? 'chute' : 'fall';
      if (p.onGround) { p.air = false; p.chute = false; p.drop = 0; ai.path = null; }
      return;
    }
    // dupla: caido fica no chao esperando o parceiro com a bomba de bicicleta
    if (p.down > 0) { p.vel[0] *= 0.8; p.vel[2] *= 0.8; p.vel[1] -= 24 * dt; p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, 1.7); p.anim = 'down'; return; }
    const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
    if (ai.blind > 0) ai.blind -= dt;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = 0.25;
      const sk = this.skill;
      const sight = this.mode === 'br' ? Math.min(sk.sight, 30) : sk.sight; // battle royale: neblina de filme velho
      let best = null, bd = sight * sight;
      if (ai.blind <= 0) for (const o of this.players.values()) {
        if (!o.alive || !this.enemies(p, o)) continue;
        const d = dist2(o.pos, p.pos);
        if (d < bd && hasLOS(M, eye, [o.pos[0], o.pos[1] + 1.4, o.pos[2]])) { bd = d; best = o; }
      }
      // alvo novo: demora pra reagir e a mira comeca fria (esquenta com o tempo nele)
      if (best && best !== ai.target) { ai.react = sk.react * rnd(0.8, 1.25); ai.onT = 0; }
      // memoria: perdeu de vista, vai ate onde viu por ultimo (por uns segundos)
      if (best) { ai.lastSeen = [...best.pos]; ai.lastSeenT = rnd(3, 5); }
      else if (ai.lastSeenT > 0) { ai.lastSeenT -= 0.25; if (dist2(ai.lastSeen, p.pos) < 4) ai.lastSeenT = 0; }
      // pouca vida e alvo na mira: procura um canto fora da linha de tiro pra respirar
      ai.cover = best && p.hp < (p.maxHp || BOT_HP) * 0.35 ? this.coverSpot(p, best) : null;
      ai.target = best;
      if (p.field && fieldReady(p) && !(this.freezeT > 0)) botField(this, p, best);
      ai.goal = this.botGoal(p);
    }
    const w = WEAPONS[p.wpn];
    let moveDir = null, wantYaw = p.yaw, sprint = false;
    // plantar a bomba: bot segura o botao no ponto (ataque) ou em cima da bomba (defesa) quando ninguem o ve
    if (this.mode === 'bomb') p.using = this.botWantsUse(p);
    const t = ai.target && ai.target.alive ? ai.target : null;
    if (ai.reloadT > 0) { ai.reloadT -= dt; if (ai.reloadT <= 0) ai.mag = Math.round(w.mag); }
    if (t) {
      const dx = t.pos[0] - p.pos[0], dz = t.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      wantYaw = Math.atan2(-dx, -dz);
      p.pitch = Math.atan2((t.pos[1] - p.pos[1]), d) * 0.8;
      ai.t -= dt;
      if (ai.t <= 0) { ai.t = rnd(0.5, 1.4); ai.strafe = (Math.random() < 0.5 ? -1 : 1) * this.skill.strafe; }
      ai.onT = (ai.onT || 0) + dt;
      const fx = dx / (d || 1), fz = dz / (d || 1);
      const ideal = WEAPONS[p.wpn]?.melee ? 0.8 : p.wpn === 'shotgun' ? 6 : p.wpn === 'sniper' ? 30 : 14;
      let adv = d > ideal + 3 ? 1 : d < ideal - 3 ? -0.6 : 0;
      // contra quem esta de lamina (infectado): recua atirando, nunca deixa encostar
      if (WEAPONS[t.wpn]?.melee && !WEAPONS[p.wpn]?.melee) adv = d < 9 ? -1 : d > 16 ? 0.4 : 0;
      moveDir = [fx * adv - fz * ai.strafe * 0.8, fz * adv + fx * ai.strafe * 0.8];
      // de lamina nao tem por que dancar de lado: vai reto ate encostar
      if (WEAPONS[p.wpn]?.melee) moveDir = d > 0.7 ? [fx, fz] : null;
      // machucado: corre pra cobertura atirando de lado
      else if (ai.cover && Math.hypot(ai.cover[0] - p.pos[0], ai.cover[2] - p.pos[2]) > 1) {
        const g = this.botSteer(p, ai.cover, dt);
        if (g) moveDir = [g[0] - fz * ai.strafe * 0.3, g[1] + fx * ai.strafe * 0.3];
      }
      if (ai.goal && (this.mode === 'ctf' || this.mode === 'dom' || this.mode === 'escort' || ai.rescue) && d > 5) {
        const gd = Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]);
        const g = this.botSteer(p, ai.goal, dt);
        if (g && (gd > 3.5 || this.carrying(p))) moveDir = [g[0] - fz * ai.strafe * 0.5, g[1] + fx * ai.strafe * 0.5];
        else if (g && ai.rescue) moveDir = gd > 1.4 ? g : null; // chegando no parceiro caido: vai reto e para em cima
      }
      // em cima do parceiro caido: fica parado enchendo a bomba (atira de onde esta, nao sai dancando)
      if (ai.rescue && ai.goal && Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]) < 1.8) moveDir = null;
      ai.react -= dt;
      ai.fireT -= dt;
      ai.nadeT -= dt;
      const facing = Math.abs(angDiff(p.yaw, wantYaw)) < 0.25;
      if (ai.reloadT <= 0 && ai.mag <= 0) this.botReload(p);
      // granada de vez em quando, em arco ate o alvo
      ai.pauseT = (ai.pauseT || 0) - dt;
      if (ai.nadeT <= 0 && this.skill.nades && p.nades.frag > 0 && d > 9 && d < 24 && !this.over) {
        ai.nadeT = rnd(8, 16); p.nades.frag--;
        const up = 0.25 + d * 0.012;
        this.throwNade(p, 'frag', norm([fx, up, fz]));
        const n = this.nades[this.nades.length - 1];
        const sp = Math.min(19, 6 + d * 0.55);
        n.vel = [fx * sp, up * sp + 3, fz * sp];
      } else if (ai.react <= 0 && facing && ai.fireT <= 0 && ai.pauseT <= 0 && !this.over && ai.reloadT <= 0 && ai.mag > 0) {
        ai.mag--;
        ai.fireT = w.rate * this.skill.rate + (p.wpn === 'sniper' ? 0.8 : 0);
        this.botShoot(p, t, d);
        // atira em rajadas e respira entre elas (quanto mais facil, mais curta e mais pausa)
        if (!(ai.burstLeft > 0)) ai.burstLeft = Math.round(rnd(...this.skill.burst));
        if (--ai.burstLeft <= 0) ai.pauseT = rnd(...this.skill.pause);
      }
    } else if (ai.reloadT <= 0 && ai.mag < w.mag * 0.5 && ai.mag < w.mag) this.botReload(p);
    if (!moveDir && ai.goal) {
      const d = Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]);
      const g = d > 1.5 ? this.botSteer(p, ai.goal, dt) : null;
      if (g) { moveDir = g; if (!t) { wantYaw = Math.atan2(-g[0], -g[1]); p.pitch *= 0.9; } sprint = !t && ai.blind <= 0; }
    }
    if (p.using) moveDir = null;
    if (ai.blind > 0) wantYaw = p.yaw + Math.sin(ai.blind * 6) * 0.5;
    p.yaw += clampA(angDiff(p.yaw, wantYaw), (t ? this.skill.turn : 5) * dt);

    let speed = sprint ? 10.5 : ai.blind > 0 ? 3 : 7;
    if (this.mode === 'infect' && p.team === 'red') speed *= INFECT.speed;
    const ground = p.onGround;
    const acc = ground ? 12 : 3;
    const tx = moveDir ? moveDir[0] * speed : 0, tz = moveDir ? moveDir[1] * speed : 0;
    p.vel[0] += (tx - p.vel[0]) * Math.min(1, acc * dt);
    p.vel[2] += (tz - p.vel[2]) * Math.min(1, acc * dt);
    p.vel[1] -= 24 * (EV(this.mut)?.grav || 1) * dt;
    ai.stuckT += dt;
    if (ai.stuckT > 0.6) {
      const moved = Math.hypot(p.pos[0] - ai.last[0], p.pos[2] - ai.last[2]);
      if (moveDir && moved < 1.2 && ground) { p.vel[1] = 7.2; ai.strafe *= -1; ai.t = 1; ai.path = null; }
      ai.last = [...p.pos]; ai.stuckT = 0;
    }
    if (t && ground && this.skill.strafe > 0.5 && Math.random() < dt * 0.35) p.vel[1] = 7.2;
    p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, 1.7);
    const hs = Math.hypot(p.vel[0], p.vel[2]);
    p.anim = !p.onGround ? 'jump' : ai.reloadT > 0 ? 'reload' : hs > 9 ? 'sprint' : hs > 1 ? 'run' : 'idle';
  }

  botReload(p, instant = false) {
    const w = WEAPONS[p.wpn];
    if (instant) { p.ai.mag = Math.round(w.mag); p.ai.reloadT = 0; return; }
    p.ai.reloadT = w.reload * 1.15;
    this.event({ k: 'reload', id: p.id, pos: [p.pos[0], p.pos[1] + 1.3, p.pos[2]] });
  }

  carrying(p) { return this.flags.red.carrier === p.id || this.flags.blue.carrier === p.id; }

  // direcao (unitaria, [x,z]) seguindo a rota A* ate o objetivo; refaz a rota se o objetivo andou
  botSteer(p, goal, dt) {
    const ai = p.ai;
    ai.pathT = (ai.pathT || 0) - dt;
    const moved = ai.pathGoal ? Math.hypot(goal[0] - ai.pathGoal[0], goal[2] - ai.pathGoal[2]) : Infinity;
    // sem rota = calcula ja; rota velha so e refeita se ainda tem orcamento neste tick (senao segue a velha)
    if (!ai.path || ((moved > 3 || ai.pathT <= 0) && this.pathBudget > 0)) {
      this.pathBudget--;
      // destino longe (atravessar a ilha): rota so ate um ponto andavel ~35 m na direcao dele; a rota e
      // refeita no caminho. A* de 200 m numa grade de 0,5 m custava 10-40 ms por bot.
      let to = goal;
      const gd = Math.hypot(goal[0] - p.pos[0], goal[2] - p.pos[2]);
      if (gd > 40) {
        for (let r = 35; r >= 15; r -= 5) {
          const x = p.pos[0] + (goal[0] - p.pos[0]) / gd * r, z = p.pos[2] + (goal[2] - p.pos[2]) / gd * r;
          if (standable(this.M, x, z)) { to = [x, floorAt(this.M, x, z), z]; break; }
        }
      }
      ai.path = navPath(this.M, p.pos, to, 8000); // busca curta: rota que nao fecha em 8 mil celulas vira linha reta ate a proxima
      if (!ai.path || !ai.path.length) ai.path = [[goal[0], goal[2]]];
      // cada bot desvia um pouco de cada curva (o caminho mais curto e igual pra todo mundo)
      const sway = ai.sway ??= rnd(-0.9, 0.9);
      for (let i = 0; i < ai.path.length - 1; i++) {
        const [x, z] = ai.path[i], [nx, nz] = ai.path[i + 1], len = Math.hypot(nx - x, nz - z) || 1;
        const ox = x - (nz - z) / len * sway, oz = z + (nx - x) / len * sway;
        if (standable(this.M, ox, oz)) ai.path[i] = [ox, oz];
      }
      ai.pathGoal = [...goal]; ai.pathT = 2 + Math.random();
    }
    while (ai.path.length > 1 && Math.hypot(ai.path[0][0] - p.pos[0], ai.path[0][1] - p.pos[2]) < 1.2) ai.path.shift();
    const [x, z] = ai.path[0], dx = x - p.pos[0], dz = z - p.pos[2], d = Math.hypot(dx, dz);
    return d > 0.05 ? [dx / d, dz / d] : null;
  }

  botWantsUse(p) {
    const B = this.bomb;
    if (!B || p.ai.target?.alive) return false;
    if (B.state === 'carried' && B.carrier === p.id) return this.sites.some(s => Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) < s.r - 0.6);
    if (B.state === 'planted' && p.team === 'blue') return dist2(p.pos, B.pos) < (BOMB.defuseR - 0.4) ** 2;
    return false;
  }

  botGoal(p) {
    const FB = this.M.flagBase;
    if (this.mode === 'bomb' && this.bomb) {
      const B = this.bomb, site = (id) => this.sites.find(s => s.id === id) || this.sites[0];
      const ring = (c, r) => { const a = (p.id.charCodeAt(p.id.length - 1) * 1.7) % 6.28; return [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r]; };
      if (p.team === 'red') {
        if (B.state === 'carried' && B.carrier === p.id) return site(B.goal).pos;
        if (B.state === 'dropped') return B.pos;
        if (B.state === 'planted') return ring(B.pos, 6);
        return ring(site(B.goal).pos, 5);
      }
      if (B.state === 'planted' || B.state === 'dropped') return B.pos;
      return ring(site(p.id.charCodeAt(p.id.length - 1) % 2 ? 'A' : 'B').pos, 3);
    }
    if (this.mode === 'br') { const g = brGoal(this, p); if (g) { p.ai.route = null; return g; } }
    if (this.mode === 'infect') {
      const surv = [...this.players.values()].filter(o => o.alive && o.team === 'blue' && o !== p);
      const inf = [...this.players.values()].filter(o => o.alive && o.team === 'red' && o !== p);
      // infectado: cola no sobrevivente mais perto
      if (p.team === 'red') { let b = null, bd = Infinity; for (const o of surv) { const d = dist2(o.pos, p.pos); if (d < bd) { bd = d; b = o; } } return b ? [...b.pos] : p.ai.goal; }
      // sobrevivente: segura um canto longe dos infectados (troca quando eles chegam perto)
      const far = (q) => inf.reduce((m, o) => Math.min(m, Math.hypot(o.pos[0] - q[0], o.pos[2] - q[1])), 99);
      if (p.ai.goal && far([p.ai.goal[0], p.ai.goal[2]]) > 14 && Math.random() > 0.05) return p.ai.goal;
      let best = null, bs = -1;
      for (const q of this.M.spawns.ffa) { const sc = far(q) + rnd(0, 10); if (sc > bs) { bs = sc; best = q; } }
      return best ? [best[0], floorAt(this.M, best[0], best[1]), best[1]] : p.ai.goal;
    }
    if (this.mode === 'ctf') {
      const mine = p.team, theirs = mine === 'red' ? 'blue' : 'red';
      if (this.carrying(p)) return FB[mine];
      if (this.flags[mine].state === 'dropped') return this.flags[mine].pos;
      const role = (p.id.charCodeAt(p.id.length - 1) % 3);
      if (role === 0 && this.flags[mine].state === 'carried') return this.flags[mine].pos;
      return this.flags[theirs].pos;
    }
    if (this.esc) return escGoal(this, p);
    if (this.mode === 'dom') {
      let best = null, bd = 1e9;
      for (const z of this.zones) {
        if (z.owner === p.team && Math.random() < 0.8) continue;
        const d = dist2(z.pos, p.pos) * (0.6 + Math.random());
        if (d < bd) { bd = d; best = z.pos; }
      }
      return best || this.zones[1].pos;
    }
    return this.huntGoal(p);
  }

  // contra todos / mata-mata: caca com cabeca. Ordem: onde viu o inimigo por ultimo > tiro que ouviu
  // perto > rota com desvio (flanco) ate um ponto do mapa que ainda nao visitou. Antes ia reto ate a
  // posicao de um inimigo sorteado (via atraves da parede) e todo mundo usava o mesmo corredor.
  huntGoal(p) {
    const ai = p.ai;
    if (ai.lastSeenT > 0 && ai.lastSeen) return ai.lastSeen;
    let heard = null, hd = 40 * 40;
    for (const [id, n] of this.noises || []) {
      const o = this.players.get(id);
      if (!o || !this.enemies(p, o)) continue;
      const d = dist2(n.pos, p.pos);
      if (d < hd && d > 9) { hd = d; heard = n.pos; }
    }
    if (heard && (!ai.heardAt || dist2(heard, ai.heardAt) > 25)) { ai.heardAt = heard; ai.route = this.routeTo(p, heard); }
    if (ai.route?.length) {
      if (dist2(ai.route[0], p.pos) < 9) { ai.visited = [...(ai.visited || []).slice(-4), ai.route.shift()]; }
      if (ai.route.length) return ai.route[0];
      ai.heardAt = null;
    }
    // rota nova: de vez em quando na direcao de um inimigo (so a regiao, nao o lugar exato); senao patrulha
    const ens = [...this.players.values()].filter(o => o.alive && this.enemies(p, o));
    let target;
    if (ens.length && Math.random() < 0.35) {
      const e = ens[Math.floor(Math.random() * ens.length)];
      target = this.nearPoi(e.pos, 12) || [...e.pos];
    } else target = this.patrolPoi(p);
    ai.route = this.routeTo(p, target);
    return ai.route[0] || p.ai.goal;
  }

  // pontos do mapa pra patrulhar e flanquear: nascimentos, armas, objetivos + uma grade de pontos andaveis
  poiList() {
    if (this.pois) return this.pois;
    const M = this.M, S = M.spawns, out = [];
    const add = (x, z) => { if (standable(M, x, z) && !out.some(q => Math.hypot(q[0] - x, q[2] - z) < 5)) out.push([x, floorAt(M, x, z), z]); };
    for (const k of ['ffa', 'red', 'blue']) for (const q of S[k] || []) add(q[0], q[1]);
    for (const k of this.pickups) add(k.pos[0], k.pos[2]);
    const A = M.arena, step = Math.max(7, A / 6);
    for (let x = -A + 4; x <= A - 4; x += step) for (let z = -A + 4; z <= A - 4; z += step) add(x + rnd(-2, 2), z + rnd(-2, 2));
    return (this.pois = out);
  }
  nearPoi(pos, r) {
    const c = this.poiList().filter(q => Math.hypot(q[0] - pos[0], q[2] - pos[2]) < r);
    return c.length ? c[Math.floor(Math.random() * c.length)] : null;
  }
  // ponto de patrulha: longe o bastante pra valer a viagem, fora dos ultimos visitados e longe de onde
  // os colegas ja estao indo (mata-mata: o time se espalha em vez de andar em fila)
  patrolPoi(p) {
    const ai = p.ai, pts = this.poiList();
    const mates = this.cfg.teams ? [...this.players.values()].filter(o => o !== p && o.bot && o.alive && o.team === p.team && o.ai?.route?.length) : [];
    let best = null, bs = -Infinity;
    for (const q of pts) {
      const d = Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]);
      if (d < 8) continue;
      let sc = Math.min(d, 45) - Math.max(0, d - 45) * 0.5 + rnd(0, 25);
      if ((ai.visited || []).some(v => Math.hypot(v[0] - q[0], v[2] - q[2]) < 6)) sc -= 30;
      for (const o of mates) { const g = o.ai.route[o.ai.route.length - 1]; if (Math.hypot(g[0] - q[0], g[2] - q[2]) < 10) sc -= 18; }
      if (sc > bs) { bs = sc; best = q; }
    }
    return best || pts[Math.floor(Math.random() * pts.length)] || [0, 0, 0];
  }
  // rota com desvio: um ponto de passagem de lado (30-80 graus fora da linha reta) quando o desvio
  // nao alonga demais o caminho; assim os bots chegam por flancos diferentes
  routeTo(p, target) {
    const d0 = Math.hypot(target[0] - p.pos[0], target[2] - p.pos[2]);
    if (d0 < 14 || Math.random() < 0.3) return [target];
    const dir = Math.atan2(target[0] - p.pos[0], target[2] - p.pos[2]);
    let via = null, bs = -Infinity;
    for (const q of this.poiList()) {
      const a = Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]), b = Math.hypot(target[0] - q[0], target[2] - q[2]);
      if (a < 5 || b < 5 || a + b > d0 * 1.6) continue;
      const off = Math.abs(angDiff(dir, Math.atan2(q[0] - p.pos[0], q[2] - p.pos[2])));
      if (off < 0.5 || off > 1.4) continue;
      const sc = rnd(0, 1) - Math.abs(a - b) / d0;
      if (sc > bs) { bs = sc; via = q; }
    }
    return via ? [via, target] : [target];
  }

  // canto perto (3-7 m) fora da linha de tiro do alvo, no mesmo piso
  coverSpot(p, t) {
    const te = [t.pos[0], t.pos[1] + 1.5, t.pos[2]];
    for (let i = 0; i < 12; i++) {
      const a = rnd(0, Math.PI * 2), r = rnd(3, 7), x = p.pos[0] + Math.cos(a) * r, z = p.pos[2] + Math.sin(a) * r;
      if (!standable(this.M, x, z)) continue;
      const y = floorAt(this.M, x, z);
      if (Math.abs(y - p.pos[1]) > 0.6 || hasLOS(this.M, te, [x, y + 1.2, z])) continue;
      return [x, y, z];
    }
    return null;
  }

  botShoot(p, t, d) {
    const w = WEAPONS[p.wpn];
    // lamina: so acerta colado
    if (w.melee) {
      if (d > (p.wpn === 'fists' ? w.range : bodyTrait(this.bodyOf(p, 'melee')).range || w.range)) return;
      this.event({ k: 'swing', id: p.id });
      this.damage(t, p, w.dmg, p.wpn, false);
      return;
    }
    const o = [p.pos[0], p.pos[1] + 1.45, p.pos[2]];
    const aim = [t.pos[0], t.pos[1] + 1.1, t.pos[2]];
    const dir = norm([aim[0] - o[0], aim[1] - o[1], aim[2] - o[2]]);
    const tSpeed = t.bot ? Math.hypot(t.vel[0], t.vel[2]) : (t.anim === 'sprint' || t.anim === 'tac' ? 11 : t.anim === 'run' ? 6 : 1);
    // mira esquenta: comeca em 35% do maximo do nivel e chega nele depois de 'warm' s no alvo
    const sk = this.skill, warm = Math.min(1, 0.35 + 0.65 * (p.ai.onT || 0) / sk.warm);
    let pHit = sk.aim * warm - d * 0.006 - tSpeed * 0.015;
    pHit = Math.max(0.04, Math.min(0.85, pHit));
    const pellets = w.pellets || 1;
    let dmg = 0, head = false;
    for (let i = 0; i < pellets; i++) {
      const falloff = p.wpn === 'shotgun' ? Math.max(0.15, 1 - d / 22) : 1;
      if (Math.random() < pHit) { dmg += w.dmg * falloff; if (Math.random() < sk.head) head = true; }
    }
    const miss = dmg === 0;
    const e = miss ? [aim[0] + rnd(-1.5, 1.5), aim[1] + rnd(-0.6, 1.2), aim[2] + rnd(-1.5, 1.5)] : aim;
    const hit = raycast(this.M, o, dir, d);
    if (hit.dist !== Infinity) {
      this.event({ k: 'shot', id: p.id, o, e: [o[0] + dir[0] * hit.dist, o[1] + dir[1] * hit.dist, o[2] + dir[2] * hit.dist], wpn: p.wpn });
      return;
    }
    this.event({ k: 'shot', id: p.id, o, e, wpn: p.wpn });
    if (!miss) this.damage(t, p, dmg, p.wpn, head);
  }

  // ---------- loop ----------
  tick(dt) {
    this.pathBudget = PATHS_PER_TICK; // rotas novas por tick (espalha o custo: 15 bots refazendo juntos travava a sala)
    if (this.noises) for (const [id, n] of this.noises) if ((n.t -= dt) <= 0) this.noises.delete(id);
    this.clock = (this.clock || 0) + dt;
    // bala flamejante: o dano do fogo entra em 4 pedacos (cada um vira 1 evento de dano)
    for (const p of this.players.values()) {
      if (!p.burn) continue;
      if (!p.alive || this.phase !== 'play') { p.burn = null; continue; }
      const F = AMMO.fire, step = F.burnT / 4;
      p.burn.acc += dt;
      if (p.burn.acc >= step) { p.burn.acc -= step; p.burn.n = (p.burn.n ?? 4) - 1; this.damage(p, this.players.get(p.burn.a) || null, F.burn / 4, p.burn.wpn, false, true); }
      if (p.burn && p.burn.n <= 0) p.burn = null;
    }
    // folego: vida volta sozinha depois de um tempo sem levar dano
    for (const p of this.players.values()) {
      if (!p.alive || !hasSkill(p, 'folego') || p.hp >= (p.maxHp || 100)) continue;
      if (this.clock - (p.hurtAt ?? -99) >= SKILLS.folego.after) p.hp = Math.min(p.maxHp || 100, p.hp + SKILLS.folego.regen * dt);
    }
    if (this.phase !== 'play') { this.tickLobby(dt); return; }
    if (this.over) {
      this.overT -= dt;
      // fim de partida: volta todo mundo pro lobby (pronto zerado)
      if (this.overT <= 0) {
        if (this.useLobby) this.phase = 'lobby'; else if (this.autoNext) this.nextQuick(); else this.reset();
        this.over = false;
        for (const p of this.players.values()) p.lobbyReady = false;
        this.event({ k: 'restart' }); this.lobbyT = 0;
        // cliente sai do lobby direto pra proxima (com o modo e o mapa novos pra carregar)
        if (this.autoNext && !this.useLobby) this.event({ k: 'start', mode: this.mode, duo: this.duo, bounce: this.bounce, map: this.M.id });
      }
      this.snapshot(dt);
      return;
    }
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      // ninguem avisou que carregou a tempo: solta a contagem assim mesmo
      if (this.waitLoad && this.freezeT <= 0) this.startCountdown();
    } else if (this.mode !== 'bomb') this.time -= dt;
    if (this.time <= 0 && this.mode !== 'bomb') {
      this.time = 0;
      let winner = null;
      if (this.mode === 'infect') winner = 'blue';
      else if (this.esc) {
        // tempo acabou com atacante encostado no bonde: prorrogacao (uma vez); senao a defesa segurou
        if (!this.esc.ot && this.esc.red > 0) { this.esc.ot = true; this.time = 25; this.event({ k: 'escOt' }); winner = null; }
        else winner = 'blue';
      }
      else if (this.cfg.teams) winner = this.teamScore.red === this.teamScore.blue ? 'empate' : this.teamScore.red > this.teamScore.blue ? 'red' : 'blue';
      else {
        let best = null;
        for (const p of this.players.values()) if (!best || p.kills > best.kills || (this.mode === 'gungame' && p.gunLvl > best.gunLvl)) best = p;
        winner = best ? best.name : 'ninguem';
      }
      if (winner) this.end(winner);
    }

    for (const p of this.players.values()) {
      // orcamento de dano: enche no ritmo da arma (barra trapaca de cliente)
      const w = WEAPONS[p.wpn];
      if (w) { const tr = bodyTrait(this.bodyOf(p, p.wpn)), bm = this.bpOf(p, p.wpn), dmg = w.dmg * (w.pellets || 1) * (tr.dmg || 1) * (bm.dmg || 1); p.budget = Math.min(dmg * 5, p.budget + (dmg / (w.rate * (tr.rate || 1) * (bm.rate || 1))) * 1.6 * dt); }
      if (!p.alive) {
        p.respawnT -= dt;
        // humano: depois do minimo, renasce quando pedir (botao/toque) ou sozinho 5 s depois
        // plantar a bomba: quem cai so volta na proxima rodada
        if (this.mode !== 'bomb' && this.mode !== 'br' && p.respawnT <= 0 && (p.bot || p.wantSpawn || p.respawnT <= -AUTO_SPAWN || p.deaths === 0)) { p.wantSpawn = false; this.spawn(p); }
        // bate-volta: volta do ceu sozinho quando o tempo acaba (sem botao: a queda ja e a escolha de onde cair)
        else if ((p.bounceBack || p.lateSpawn) && p.respawnT <= 0) { p.bounceBack = false; p.lateSpawn = false; this.spawn(p); }
        continue;
      }
      if (p.drop > 0) p.drop -= dt;
      if (p.bot && !(this.freezeT > 0)) this.tickBot(p, dt);
      if (p.pos[1] < -20) this.kill(p, null, 'fall', false);
    }

    this.tickNades(dt);
    this.tickEvent(dt);
    this.tickStreaks(dt);
    fieldTick(this, dt);

    if (this.mode === 'infect' && !(this.freezeT > 0)) this.tickInfect(dt);

    if (this.mode === 'bomb' && !(this.freezeT > 0)) this.tickBomb(dt);
    if (this.mode === 'br' && !(this.freezeT > 0)) brTick(this, dt);

    for (const k of this.pickups) {
      if (this.mode === 'bomb' || this.mode === 'br') break; // bomba: so as armas de cada um; br: loot proprio
      if (this.mode === 'gungame' && k.kind === 'wpn') continue;
      if (!k.active) { k.t -= dt; if (k.t <= 0) { k.active = true; this.event({ k: 'pickup', id: k.id, active: true }); } continue; }
      for (const p of this.players.values()) {
        if (!p.alive || dist2(p.pos, k.pos) > 1.6 * 1.6) continue;
        if (this.mode === 'infect' && p.team === 'red') continue; // infectado nao pega nada
        if (k.kind === 'hp') { if (p.hp >= (p.maxHp || 100)) continue; p.hp = Math.min(p.maxHp || 100, p.hp + 50); }
        else {
          p.owned.add(k.wpn);
          if (p.bot) { p.wpn = k.wpn; this.botReload(p, true); }
          this.event({ k: 'give', id: p.id, wpn: k.wpn });
        }
        k.active = false; k.t = k.kind === 'hp' ? 12 : 16;
        this.event({ k: 'pickup', id: k.id, active: false, by: p.id });
        break;
      }
    }

    if (this.mode === 'ctf') this.tickCTF(dt);
    if (this.mode === 'dom') this.tickDOM(dt);
    if (this.esc && !this.over && !(this.freezeT > 0)) escTick(this, dt);
    this.snapshot(dt);
  }

  tickLobby(dt) {
    const humans = [...this.players.values()].filter(p => !p.bot);
    if (this.phase === 'count') {
      if (!humans.length) this.phase = 'lobby';
      else if ((this.countT -= dt) <= 0) {
        this.phase = 'play';
        this.reset();
        // todo mundo carregando: ninguem se mexe nem leva dano ate o ultimo humano avisar que
        // carregou ('loaded'); ai sai a contagem de 3 s. Espera maxima: LOAD_WAIT.
        this.waitLoad = new Set(humans.map(h => h.id));
        this.freezeT = LOAD_WAIT;
        this.event({ k: 'start' });
      }
    }
    this.lobbyT -= dt;
    if (this.lobbyT > 0) return;
    this.lobbyT = 0.25;
    this.send(null, {
      t: 'lobby', phase: this.phase, countT: Math.max(0, this.countT), mode: this.mode, duo: this.duo, bounce: this.bounce, map: this.M.id, host: this.hostId(),
      cfg: { mut: this.mut, mode: this.modeId(), map: this.mapPick || 'auto', bots: this.wantBots, difficulty: this.difficulty, limit: this.limitPick || 0, time: this.timePick || 0, defLimit: matchRules(this.mode, this.M.id, this.cfg, MATCH_TIME).limit, defTime: matchRules(this.mode, this.M.id, this.cfg, MATCH_TIME).time },
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, bot: p.bot, team: p.team, ready: p.bot || !!p.lobbyReady || p.id === this.hostId(), lvl: p.lvl || botLevel(p.id), elite: !!p.elite, rk: p.rk ?? -1 })),
    });
  }

  snapshot(dt) {
    this.snapT -= dt;
    if (this.snapT > 0) return;
    this.snapT = 1 / 20;
    // infectado: o placar e' a contagem de cada lado (vale desde a contagem de inicio)
    if (this.mode === 'infect') { let r = 0, b = 0; for (const p of this.players.values()) { if (p.team === 'red') r++; else b++; } this.teamScore.red = r; this.teamScore.blue = b; }
    // numeros arredondados (cm na posicao, milesimo de radiano na mira): o snapshot vai 15x/s pra cada
    // pessoa da sala e as 16 casas decimais eram metade do tamanho dele. Na tela nao muda nada.
    const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
    const players = [];
    for (const p of this.players.values()) {
      players.push({
        id: p.id, name: p.name, bot: p.bot, team: p.team, hp: Math.max(0, Math.round(p.hp)), alive: p.alive,
        pos: [r2(p.pos[0]), r2(p.pos[1]), r2(p.pos[2])], yaw: r3(p.yaw), pitch: r3(p.pitch), anim: p.anim, wpn: p.wpn,
        kills: p.kills, deaths: p.deaths, assists: p.assists || 0, score: p.score, gunLvl: p.gunLvl, respawnT: r2(p.respawnT),
        nades: p.nades, ready: p.ready, streak: p.streak, elite: !!p.elite, rk: p.rk ?? -1, fc: Math.round((p.fieldCharge || 0) * 100), armor: p.armor ? Math.round(p.armor) : 0, place: p.place || 0, dn: p.down > 0 ? Math.ceil(p.down) : 0, rv: p.reviveT > 0 ? r2(p.reviveT) : 0, sh: p.shieldT > 0 ? 1 : 0, fz: p.fuse > 0 ? Math.ceil(p.fuse) : 0, pr: p.prest || 0,
      });
    }
    this.send(null, {
      t: 'snap', mode: this.mode, mut: this.mut, ranked: this.ranked, duo: this.duo, bounce: this.bounce, bOpen: this.bounceOpen(), map: this.M.id, limit: this.limit, time: r2(this.time), over: this.over, overT: this.overT,
      freeze: Math.max(0, this.freezeT || 0), loading: !!this.waitLoad, infT: this.mode === 'infect' && !this.infStarted ? Math.max(0, this.infT) : 0, lastStand: this.lastStand, infKit: this.mode === 'infect' ? this.infKit : null,
      bomb: this.mode === 'bomb' && this.bomb ? { state: this.bomb.state, pos: this.bomb.pos, carrier: this.bomb.carrier, site: this.bomb.site, t: this.bomb.t, prog: this.bomb.prog, actor: this.bomb.actor, kind: this.bomb.kind } : null,
      round: this.mode === 'bomb' ? { n: this.roundN, over: this.roundOver > 0 } : null, sites: this.mode === 'bomb' ? this.sites : null,
      teamScore: { red: Math.floor(this.teamScore.red), blue: Math.floor(this.teamScore.blue) },
      flags: this.flags, zones: this.zones.map(z => ({ id: z.id, owner: z.owner, prog: z.prog })),
      pickups: this.pickups.map(k => k.active),
      nades: this.nades.map(n => ({ id: n.id, kind: n.kind, pos: n.pos.map(r2) })),
      blimps: this.blimps.map(b => ({ id: b.id, pos: b.pos.map(r2), team: b.team, owner: b.owner, hp: Math.max(0, Math.round(b.hp / STREAKS.blimp.hp * 100)) })),
      uavs: this.uavs.map(u => ({ owner: u.owner, team: u.team })),
      sLock: (() => { const l = this.streakLock(); return l ? { kind: l.kind, t: Math.ceil(l.t) } : null; })(),
      br: this.mode === 'br' && this.zone ? brSnap(this) : null,
      esc: this.esc ? escSnap(this) : null,
      field: fieldSnap(this),
      players,
    });
  }

  info() {
    return { mode: this.modeId(), map: this.M.id, humans: this.humans(), players: this.players.size, time: Math.round(this.time), phase: this.phase };
  }
}

// pecas das armas vindas do cliente: so texto curto, campos conhecidos
function cleanLoadouts(los) {
  if (!los || typeof los !== 'object') return null;
  const out = {};
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'melee']) {
    const l = los[w];
    if (!l || typeof l !== 'object') continue;
    const o = {};
    for (const k of ['body', 'scope', 'charger', 'handle', 'laser', 'tracer', 'paint', 'accent', 'ret', 'retColor', 'camo', 'bp', 'ammo']) {
      const v = l[k];
      o[k] = typeof v === 'string' && v.length <= 24 && /^[#\w-]+$/.test(v) ? v : null;
    }
    if (o.bp && BLUEPRINTS[o.bp]?.wpn !== w) o.bp = null;
    if (o.ammo && (!AMMO[o.ammo] || w === 'melee')) o.ammo = null;
    out[w] = o;
  }
  return out;
}

const COUNTDOWN = 5;
const COUNT_IN = 3.5;   // contagem 3, 2, 1 antes de soltar todo mundo
const LOAD_WAIT = 15;   // espera maxima pelo carregamento do mais lento
const AUTO_SPAWN = 5;
// nivel do bot: fixo por id, so pra lista do lobby ter cara de gente
function botLevel(id) { let h = 2166136261; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return 3 + (h % 50); }

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function clampA(v, m) { return Math.max(-m, Math.min(m, v)); }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

// Jogo Rapido: modo sorteado quando nao tem partida aberta (dupla fica de fora: precisa de parceiro)
// rankeada: so os modos competitivos (pedido dele 31/10)
export const RANKED_MODES = ['ctf', 'dom', 'escort'];
export const QUICK_MODES = ['ffa', 'tdm', 'ctf', 'dom', 'escort', 'gungame', 'infect', 'bomb', 'br', 'bounce'];
export const QUICK_BOTS = 11;
