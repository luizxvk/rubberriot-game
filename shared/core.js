// Nucleo da partida. Mesmo codigo no solo (navegador) e no multiplayer (node).
// send(to, msg): to = id do cliente ou null pra todos.
import { CONV_RANGE, BR, AMMO, FIELD, WEAPONS, GUN_LADDER, ggPickLadder, SPAWN_KIT, MODES, BOT_HP, MAX_PLAYERS, TEAM_MAX, TEAM_MAX_BLITZ, BLITZ_MAX, BLITZ_MAPS, BLITZ_BASE, GADGETS, gadgetOf, SKILLS, SKILL_SLOTS, BLAST, hasSkill, PRIMARIES, NADES, STREAKS, STREAK_FREE, pickStreaks, INFECT, BOMB, BLUEPRINTS, botSkill, bodyTrait, bpMods, botBody, WSKINS, LETHALS, TACTICALS } from './weapons.js';
import { getMap, MAP_IDS as ALL_MAPS, MODE_MAP, ESCORT_MAPS, HEIST_ONLY, PVE_ONLY, BIG_OBJ_ONLY, BIG_OBJ_MODES, BOMB_SITES, propBoxes, moveBody, raycast, hasLOS, wallSpan, matchRules, clampArena, headroom } from './map.js';
import { navPath, floorAt, standable, hop, lowAt, freeNear, warmNav } from './nav.js';
import { CAR, carsInit, carsTick, carEnter, carExit, carsSnap, seatPos, carDamage } from './cars.js';
import { cleanLook, DANCE_IDS } from './looks.js';
// fim da partida em segundos: 0,9 + camera final ~3,5 + podio ~14 (3 s da camera chegando); sala sem lobby ainda mostra OVER_STATS de placar
export const OVER_STATS = 8.5, OVER_LOBBY = 18.5, OVER_NEXT = OVER_LOBBY + OVER_STATS;
import { bannerOk, botBanner, BANNER_DEFAULT } from './banners.js';
import { fieldReset, fieldUse, fieldHoleUsed, fieldBlocks, fieldTick, fieldSnap, botField, botPickField, fieldReady } from './field.js';
import { escInit, escTick, escSpawn, escGoal, escSnap, escPos, escTimeout, trainBox } from './escort.js';
import { EVENTS, EV } from './events.js';
import { carryingBag, heistInit, heistTick, heistSpawns, heistRespawn, heistGoal, heistSnap, heistTimeout, heistBoxes, heistPass, heistBotPass, heistCfg, HEIST_MAPS } from './heist.js';
import { strikeReset, strikeUse, strikeTick, strikeSnap, tickBomber, abxDrop, abxTake, abxShot } from './strikes.js';
import { borInit, borBoxes, borTick, borHit, borKilled, borDown, borRescue, borBotShop, borSnap, borHoldSpawn } from './borroes.js';
import { MOBS } from './mobs.js';
import { brInit, brSpawn, brSpawnPoint, brArmor, brKill, brTick, brSnap, brGoal, lootList, brDown, brNear } from './br.js';

// nomes de bot com cara de username de verdade (01/11, pedido dele); a tag "bot" continua no elenco
const BOT_NAMES = ['salsicha_br', 'Rolha77', 'xBigornax', 'pipoca.exe', 'TamancoTTV', 'fuligem_zz', 'Manivela09', 'gaitinha_',
  'BiscoitoNoob', 'tromboneGG', 'pavio.curto', 'SabugoPro', 'mola_mestre', 'Tinteiro_x', 'botao2008', 'carvao_quente',
  'NinjaDoCanudo', 'zeca.mira', 'lulu_headshot', 'TioPanqueca', 'ratinho_fps', 'kbum_kbum', 'DonaBorracha', 'mira_torta'];
// chat: tira controle/quebra de linha, corta em 80 e troca palavrao (pt/en, com e sem acento/numero) por ***
const CHAT_BAD = /\b(p[o0]rr[a4]|c[a4]r[a4]lh[o0]|caralh\w*|merd[a4]|bu[cs]+et\w*|c[uú]z[a4][o0]|f[o0]d[a4]\w*|fdp|vtnc|viad[o0]|arromb\w*|put[a4]\w*|piranh\w*|desgra[cç]\w*|n[i1]gg\w*|f[a4]gg?[o0]t\w*|fuck\w*|sh[i1]t\w*|b[i1]tch\w*|cunt\w*|retard\w*)\b/gi;
export function cleanChat(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    .replace(CHAT_BAD, w => w[0] + '*'.repeat(w.length - 1));
}
const MATCH_TIME = 480;
const RESPAWN = 2.6;

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const rnd = (a, b) => a + Math.random() * (b - a);
// menor distancia entre o trecho de voo a->b e o corpo (eixo vertical do pe ate 1,7 m): projetil rapido nao atravessa
function segToBody(a, b, feet) {
  let best = Infinity;
  for (let k = 0; k <= 8; k++) { const t = k / 8, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t; const yc = Math.max(feet[1] + 0.3, Math.min(feet[1] + 1.7, y)); best = Math.min(best, Math.hypot(x - feet[0], y - yc, z - feet[2])); }
  return best;
}
// mapa automatico (04/11): bandeira e dominacao sorteiam entre o mapa do modo, a Vila/Fronteira e o Canyon Poeira
const AUTO_POOL = { ctf: ['fronteira', 'vila', 'deserto', 'becos', 'feira', 'largo'], dom: ['vila', 'fronteira', 'deserto', 'becos', 'feira', 'largo'], escort: ['bonde', 'apito', 'cortejo'] };
const autoMap = (mode) => { const L = AUTO_POOL[mode]; return L ? L[Math.floor(Math.random() * L.length)] : MODE_MAP[mode]; };
// opcoes do host no lobby: em que modos a meta e o tempo valem (o resto tem regra propria)
const PATHS_PER_TICK = 3;
const GUN_DROP_T = 10;    // s que a arma largada fica no chao
const TEAM_SWAP_CD = 360; // 6 min entre trocas de time no meio da partida
const DOM_RATE = 0.25;    // pontos por segundo de cada zona da dominacao
const SPAWN_PROT = 2.8;   // s de escudo ao nascer (08/11, pedido dele: era 1,8)
const AFK_PLAY = 120, AFK_LOBBY = 480; // s parado ate sair da sala
const STREAK_GAP = 4; // s de folga entre uma sequencia acabar e a proxima poder entrar
const BOT_YIELD = 8; // s que o bot espera com a sala livre quando um jogador tem sequencia guardada (vez dos jogadores, 03/11)
export const LIMIT_MODES = ['ffa', 'tdm', 'blitz', 'blitz_ctf', 'blitz_dom', 'ctf', 'dom', 'bomb'];
export const TIME_MODES = ['ffa', 'tdm', 'blitz', 'blitz_ctf', 'blitz_dom', 'gungame', 'ctf', 'dom', 'infect'];
export const MAP_IDS = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria', 'ilha', 'deserto', 'becos', 'feira', 'largo']; // deserto (04/11): sem ele a escolha caia em auto e a seta do lobby dava voltas
// kit de sequencias do bot (03/11): uma de cada faixa, sorteada; as grandes novas entram aqui
const BOT_BIG = ['plane', 'train', 'bomber', 'hand'];
const BOT_KIT = [['uav', 'milk', 'talc'], ['anvil', 'rpg', 'blimp', 'anvline', 'sentry', 'sentry'], ['plane', 'train', 'blimp'], ['bomber', 'hand', 'nuke']];
function botStreakKit() { return pickStreaks([...new Set(BOT_KIT.map(l => l[Math.floor(Math.random() * l.length)]))]); }
const MAP_OK = (m) => typeof m === 'string' && m !== 'ilha' && (MAP_IDS.includes(m) || ESCORT_MAPS.includes(m) || HEIST_ONLY.includes(m) || PVE_ONLY.includes(m)); // escolha valida da sala (a lista de cima nao tem os mapas de trilho: 02/11 a escolta nunca trocava)

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

const CITY_ROUTES = ['becos', 'feira', 'largo', 'cortejo'];
const QC_N = 10; // frases do Chat Rapido (src/quickchat.js)
// bot provocando (10/11): de vez em quando solta uma do Chat Rapido ao derrubar alguem (seu noob, volta aqui, isso foi sorte...)
const BOT_TAUNTS = [2, 5, 7, 9];
export class Core {
  constructor({ mode = 'ffa', map, bots = 7, difficulty = 1, send, lobby = true, limit = 0, time = 0, autoNext = false, ranked = false, mut = null, coop = false }) {
    this.coop = coop; // tela dividida (01/11): a gente do sofa joga junta no vermelho contra os bots
    this.mut = !ranked && EVENTS[mut] ? mut : null; // evento de fim de semana (regra maluca); rankeada nunca
    this.ranked = ranked; // rankeada (31/10): sala publica so com os modos competitivos; vale pontos de rank
    this.autoNext = autoNext; // jogo rapido: acabou a partida, a proxima ja comeca (sem lobby)
    this.limitPick = Number.isFinite(limit) ? Math.max(0, Math.min(500, limit | 0)) : 0; // meta/tempo do host (0 = padrao)
    this.timePick = Number.isFinite(time) ? Math.max(0, Math.min(1800, time | 0)) : 0;
    // dupla: roda as regras do battle royale ('br') com times de 2 (cfg.teams liga o fogo amigo desligado)
    this.duo = mode === 'duo';
    this.bounce = mode === 'bounce';
    this.blitz = BLITZ_BASE[mode] ? mode : false; // blitz (id do modo): regras de base (mata-mata/bandeira/dominacao), 24 vagas, so mapa grande
    this.borArt = mode === 'arte'; // Noite dos Borroes: Arte-Final (armas do Arsenal, ate a onda escolhida)
    this.mode = this.duo || this.bounce ? 'br' : this.blitz ? BLITZ_BASE[this.blitz] : this.borArt ? 'borroes' : MODES[mode] ? mode : 'ffa';
    this.cfg = MODES[this.modeId()];
    if (this.blitz) bots = Math.max(bots | 0, BLITZ_MAX - 1); // sala rapida de blitz ja nasce cheia (12x12 desde 07/11)
    { const bz = BLITZ_MAPS.filter(id => !BIG_OBJ_ONLY.includes(id) || BIG_OBJ_MODES.includes(BLITZ_BASE[mode] || mode)); if (this.blitz && !bz.includes(map)) map = bz[Math.floor(Math.random() * bz.length)]; }
    if (!this.blitz && BIG_OBJ_ONLY.includes(map) && !BIG_OBJ_MODES.includes(mode)) map = 'auto'; // Canyon Poeira: so bandeira e dominacao
    // Noite dos Borroes so no Estudio Tinteiro (e o Tinteiro so nela)
    if (this.mode === 'borroes') map = 'tinteiro';
    else if (this.mode === 'heist') map = HEIST_MAPS.includes(map) ? map : HEIST_MAPS[Math.floor(Math.random() * HEIST_MAPS.length)];
    else if (this.mode === 'smuggle') map = 'docas'; // Contrabando: so no Cais
    else if (this.mode === 'escort' && !ESCORT_MAPS.includes(map)) map = ESCORT_MAPS[Math.floor(Math.random() * ESCORT_MAPS.length)]; // escolta precisa de trilho: sala criada com outro mapa quebrava o servidor
    else if (PVE_ONLY.includes(map)) map = 'auto';
    if (this.mode === 'borroes') bots = Math.min(3, bots | 0);
    // battle royale so na ilha (e a ilha so no battle royale)
    this.M = getMap(this.mode === 'br' ? 'ilha' : map && map !== 'auto' && map !== 'ilha' ? map : autoMap(this.mode));
    this.mapPick = this.mode === 'br' ? 'ilha' : MAP_OK(map) ? map : 'auto';
    this.mapRaw = this.mapPick;
    this.wantBots = Math.max(0, Math.min(this.cap() - 1, bots | 0));
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
    if (this.borArt) this.limit = Math.max(10, Math.min(50, this.limitPick || MODES.arte.limit)); // Arte-Final: onda da vitoria (10 a 50)
    this.time = this.timePick && TIME_MODES.includes(this.mode) ? this.timePick : R.time;
    this.timeLimit = this.time; this.domBonusDone = false;
    this.over = false;
    for (const p of this.players.values()) p.spawnedIn = false; // 1o nascimento da partida: todo mundo na base do time
    this.firstN = {};
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
    this.burns = []; this.smokes = [];
    this.cars = carsInit(this); // carro da Captura de Bandeira (04/11)
    this.domBonus = null; // bandeira extra D (04/11): aparece no meio da partida, vale 2,5x e some depois de um tempo
    this.pickups = M.pickups.map((p, i) => ({ id: i, ...p, active: !(this.mode === 'gungame' && p.kind === 'wpn'), t: 0 }));
    if (this.mode === 'br') brInit(this);
    this.esc = null; if (this.mode === 'escort') escInit(this);
    this.heist = null; if (this.mode === 'heist' || this.mode === 'smuggle') heistInit(this); // Contrabando (04/11): mesmo motor do Cofre
    this.night = this.mode !== 'borroes' && this.tod === 'night'; // 07/11 (pedido dele): o host escolhe Dia ou Noite no lobby (linha Horario)
    if (this.bor) for (const p of [...this.players.values()]) if (p.mob) this.players.delete(p.id); // viloes da noite passada saem
    this.bor = null; if (this.mode === 'borroes') borInit(this);
    this.nades = []; this.anvils = []; this.blimps = []; this.uavs = []; this.talcs = []; this.nukes = []; this.streakGap = 0; this.botNukes = 0; this.botBig = {}; fieldReset(this); strikeReset(this); this.rockets = [];
    this.gunDrops = []; this.rockets = [];
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
    for (const p of this.players.values()) p.spawnedIn = false; this.firstN = {}; // cada round o time nasce junto na base
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
    this.nades = []; this.anvils = []; this.blimps = []; this.uavs = []; this.talcs = []; this.nukes = []; this.streakGap = 0; this.botNukes = 0; this.botBig = {}; fieldReset(this); strikeReset(this);
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
    if (this.mode === 'borroes') return 'red'; // cooperativo: todo mundo junto (viloes nascem azuis no spawnMob)
    // bomba: gente vai pro lado com menos gente (bots nao contam: eles trocam de lado pra completar)
    let r = 0, b = 0;
    for (const p of this.players.values()) { if (p.team === 'red') r++; else if (p.team === 'blue') b++; }
    // gente entra no lado com menos GENTE (empate: o com menos jogadores no total) e toma a vaga de um bot
    // desse lado (balanceBots); troca de lado so no lobby (pedido dele 01/11)
    if (!bot && this.coop) return 'red';
    if (!bot) { const n = this.teamHumans(); if (n.red !== n.blue) return n.red < n.blue ? 'red' : 'blue'; }
    return r <= b ? 'red' : 'blue';
  }

  // trocar de time no meio da partida (02/11, pedido dele): so em modo de time escolhivel, so pro lado com MENOS
  // gente (nunca desequilibra) e uma vez a cada TEAM_SWAP_CD s. Morre na hora (sem abate pra ninguem) e renasce do outro lado.
  swapTeam(p, team) {
    const to = team === 'red' || team === 'blue' ? team : p.team === 'red' ? 'blue' : 'red';
    let why = null;
    if (!this.teamPick() || this.over || this.mode === 'bomb') why = 'mode';
    else if (to === p.team) why = 'same';
    else if ((p.swapAt ?? -1e9) + TEAM_SWAP_CD > (this.clock || 0)) why = 'cd';
    else { const n = this.teamHumans(p.id); if (n[to] > n[p.team] || n[to] >= this.teamMax()) why = 'full'; }
    if (why) { this.send(p.id, { t: 'ev', k: 'teamNo', why, n: why === 'cd' ? Math.ceil((p.swapAt + TEAM_SWAP_CD - this.clock) / 60) : 0 }); return; }
    p.swapAt = this.clock || 0;
    this.dropFlag(p);
    p.team = to; p.alive = false; p.hp = 0; p.respawnT = 2; p.streak = 0;
    this.balanceTeamsBots();
    this.event({ k: 'teamSwap', id: p.id, team: to, name: p.name });
  }
  // bots trocam de lado pra igualar as contagens depois que alguem troca no meio da partida
  balanceTeamsBots() {
    const cnt = { red: 0, blue: 0 };
    for (const o of this.players.values()) if (o.team in cnt) cnt[o.team]++;
    while (Math.abs(cnt.red - cnt.blue) > 1) {
      const big = cnt.red > cnt.blue ? 'red' : 'blue', small = big === 'red' ? 'blue' : 'red';
      const b = [...this.players.values()].find(o => o.bot && o.team === big && !this.carrying(o));
      if (!b) break;
      b.team = small; b.alive = false; b.hp = 0; b.respawnT = 1; cnt[big]--; cnt[small]++;
    }
  }
  teamMax() { return this.blitz ? TEAM_MAX_BLITZ : TEAM_MAX; }

  // gente em cada lado (skip = quem esta trocando de lado)
  // modos em que da pra escolher o time no lobby (infectado sorteia, dupla e BR montam as duplas)
  teamPick() { return !!this.cfg.teams && this.mode !== 'infect' && this.mode !== 'br' && this.mode !== 'borroes' && !this.duo; }

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
    for (const p of this.players.values()) if (p.bot && !p.mob) { p.team = n.red <= n.blue ? 'red' : 'blue'; n[p.team]++; }
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
    if (bot) p.streaks = botStreakKit(); // bot sorteia um kit (03/11: antes todo bot usava o padrao e nunca chamava as novas)
    if (this.bor) p.cash = 500; // noite: quem chega comeca com 500 pontos
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

  mvOpen(id, m) {
    if (id !== this.hostId() || !this.useLobby || this.phase !== 'play' || this.over || this.ranked || this.mv || !m.cfg || typeof m.cfg !== 'object') return;
    if ((this.mvCd || 0) > 0) { this.send(id, { t: 'ev', k: 'mvFail', n: Math.ceil(this.mvCd) }); return; }
    const c = m.cfg, cfg = { mode: c.mode, map: c.map, bots: c.bots, difficulty: c.difficulty, limit: c.limit, time: c.time, mut: c.mut, tod: c.tod, ranked: false };
    const need = [...this.players.values()].filter(p => !p.bot && !p.mob && p.id !== id).map(p => p.id);
    if (!need.length) { this.mv = { cfg, host: id, need: new Set(), yes: new Set(), t: 0 }; this.mvApply(); return; } // sozinho na sala
    this.mv = { cfg, host: id, need: new Set(need), yes: new Set(), t: MV_TIME };
    this.event({ k: 'mv', st: 'open', host: id, need, yes: 0, secs: MV_TIME, cfg }); // 'secs': o campo 't' e o tipo da mensagem
  }
  mvCheck() { const V = this.mv; if (!V) return; if ([...V.need].every(i => V.yes.has(i))) this.mvApply(); else this.event({ k: 'mv', st: 'tally', yes: V.yes.size }); }
  mvEnd(st, who) { this.mv = null; this.mvCd = MV_CD; this.event({ k: 'mv', st, who }); }
  mvTick(dt) {
    if ((this.mvCd || 0) > 0) this.mvCd -= dt;
    const V = this.mv; if (!V) return;
    if (this.phase !== 'play' || this.over || this.hostId() !== V.host) { this.mvEnd('cancel'); return; }
    for (const i of [...V.need]) if (!this.players.has(i)) { V.need.delete(i); V.yes.delete(i); if (!V.need.size) { this.mvApply(); return; } this.mvCheck(); if (!this.mv) return; } // quem saiu nao conta
    if ((V.t -= dt) <= 0) this.mvEnd('time');
  }
  // todos aprovaram: mesma rota do lobby (configura e conta 5 s), sem ninguem precisar marcar pronto de novo
  mvApply() {
    const V = this.mv; this.mv = null; this.mvCd = 0;
    this.over = false; this.phase = 'lobby';
    this.configure(V.cfg);
    this.event({ k: 'mv', st: 'ok' });
    this.event({ k: 'restart' });
    for (const p of this.players.values()) p.lobbyReady = true;
    this.phase = 'count'; this.countT = COUNTDOWN; this.lobbyT = 0;
  }

  // configuracao da sala (host no lobby). Refaz modo/mapa/times e a partida do zero; os humanos ficam.
  configure(m) {
    const mode = MODES[m.mode] ? m.mode : this.modeId();
    const prevMode = this.modeId(), prevRaw = this.mapRaw ?? this.mapPick;
    this.duo = mode === 'duo';
    this.bounce = mode === 'bounce';
    this.blitz = BLITZ_BASE[mode] ? mode : false;
    this.borArt = mode === 'arte';
    this.mode = this.duo || this.bounce ? 'br' : this.blitz ? BLITZ_BASE[this.blitz] : this.borArt ? 'borroes' : mode;
    this.cfg = MODES[mode];
    let map = MAP_OK(m.map) ? m.map : 'auto';
    if (this.blitz && map !== 'auto' && !BLITZ_MAPS.includes(map)) map = 'auto';
    if (BIG_OBJ_ONLY.includes(map) && !BIG_OBJ_MODES.includes(this.mode)) map = 'auto'; // Canyon Poeira: so bandeira e dominacao
    // escolta so roda na Ladeira do Bonde, e a Ladeira so serve pra escolta (o mapa precisa do trilho)
    // escolta: Ladeira ou Vale do Apito (auto sorteia); fora da escolta os mapas de trilho nao entram
    const bz = BLITZ_MAPS.filter(id => !BIG_OBJ_ONLY.includes(id) || BIG_OBJ_MODES.includes(this.mode)); // blitz de mata-mata nao vai pro deserto
    const map2 = this.blitz ? (bz.includes(map) ? map : bz[Math.floor(Math.random() * bz.length)]) : this.mode === 'escort' ? (ESCORT_MAPS.includes(map) ? map : ESCORT_MAPS[Math.floor(Math.random() * ESCORT_MAPS.length)]) : this.mode === 'heist' ? (HEIST_MAPS.includes(map) ? map : HEIST_MAPS[Math.floor(Math.random() * HEIST_MAPS.length)]) : this.mode === 'smuggle' ? 'docas' : this.mode === 'borroes' ? 'tinteiro' : ESCORT_MAPS.includes(map) || HEIST_ONLY.includes(map) || PVE_ONLY.includes(map) ? 'auto' : map; // cofre no auto: metade das vezes no Banco Ferradura (o mapa dele)
    // mesmo modo e mesma escolha de mapa (so trocou evento, bots, tempo...): o mapa fica (01/11: trocar o evento
    // sorteava outro mapa da escolta no 'auto')
    if (!(mode === prevMode && map === prevRaw && this.M)) { // escolta: o lobby recebe a ESCOLHA (auto), nao o sorteado (02/11: a seta caia em auto = auto e nao trocava)
      this.mapPick = this.mode === 'br' ? 'ilha' : map2;
      this.M = getMap(this.mode === 'br' ? 'ilha' : map2 !== 'auto' ? map2 : autoMap(this.mode));
    }
    this.mapRaw = map;
    if (Number.isFinite(m.bots)) this.wantBots = m.bots | 0;
    if (this.blitz && !BLITZ_BASE[prevMode]) this.wantBots = BLITZ_MAX - 1; // entrou no blitz: 12 contra 12 (o host diminui depois se quiser)
    if (!this.blitz && BLITZ_BASE[prevMode]) this.wantBots = Math.min(this.wantBots, 11); // saiu: volta pro tamanho normal
    this.wantBots = Math.max(0, Math.min(this.cap() - 1, this.wantBots));
    if (this.mode === 'borroes') this.wantBots = Math.min(3, this.wantBots); // noite: no maximo 4 no time
    if (m.tod === 'day' || m.tod === 'night') this.tod = m.tod; // horario do Roubo ao Cofre (07/11)
    if ([0.7, 1, 1.35].includes(m.difficulty)) { this.difficulty = m.difficulty; this.skill = botSkill(m.difficulty); }
    this.limitPick = Number.isFinite(m.limit) ? Math.max(0, Math.min(500, m.limit | 0)) : 0;
    this.timePick = Number.isFinite(m.time) ? Math.max(0, Math.min(1800, m.time | 0)) : 0;
    // rankeada tambem em sala de amigos (02/11, pedido dele): o host liga nos modos competitivos; trocar pra outro modo desliga
    if ('ranked' in m && this.useLobby) this.ranked = !!m.ranked; // sala publica (sem lobby) nao muda
    if (!RANKED_MODES.includes(mode)) this.ranked = false;
    if (this.ranked) this.mut = null;
    if ('mut' in m) this.mut = !this.ranked && EVENTS[m.mut] ? m.mut : null; // evento de fim de semana
    // times do zero no modo novo (bomba/infectado/dupla tem regra propria de lado)
    this.infStarted = false;
    // gente fica no time em que estava quando o modo novo tambem e de times (02/11: editar modo/mapa embaralhava
    // todo mundo); so quem nao tinha lado valido (vindo de modo sem time) e os bots sao sorteados de novo
    const keep = new Map();
    if (this.teamPick()) for (const p of this.players.values()) if (!p.bot && (p.team === 'red' || p.team === 'blue')) keep.set(p, p.team);
    for (const p of this.players.values()) p.team = null;
    for (const [p, tm] of keep) p.team = tm;
    for (const p of this.players.values()) if (!keep.has(p)) p.team = this.pickTeam(p.bot);
    this.reset();
    this.balanceBots();
    this.pairDuo();
    // host mudou a partida: quem ja estava pronto continua pronto (pedido dele 01/11); so cai quem mexe na propria classe
    this.lobbyT = 0;
    this.event({ k: 'cfg' });
  }

  modeId() { return this.duo ? 'duo' : this.bounce ? 'bounce' : this.borArt ? 'arte' : this.blitz || this.mode; }
  cap() { return this.blitz ? BLITZ_MAX : MAX_PLAYERS; } // vagas da sala (blitz 24)
  // Bate-Volta: ainda da pra renascer? (ate a fase `until` da iris)
  bounceOpen() { return this.bounce && !!this.zone && this.zone.phase + (this.zone.state === 'shrink' ? 1 : 0) < BR.bounce.until + 1 && this.zone.phase < BR.bounce.until; }

  // Jogo Rapido: acabou a partida, a proxima sai em outro modo e outro mapa (sorteados)
  nextQuick() {
    const atual = this.modeId();
    // battle royale e bate-volta sao os dois na ilha: depois de um deles a proxima sai em outro mapa
    const ilha = this.M.id === 'ilha';
    const modos = (this.ranked ? RANKED_MODES : QUICK_MODES).filter(m => m !== atual && !(ilha && (m === 'br' || m === 'bounce')));
    const mode = modos[Math.floor(Math.random() * modos.length)];
    const mapas = MAP_IDS.filter(id => id !== 'ilha' && !ESCORT_MAPS.includes(id) && id !== this.M.id && !PVE_ONLY.includes(id) && !HEIST_ONLY.includes(id) && (!BIG_OBJ_ONLY.includes(id) || BIG_OBJ_MODES.includes(MODES[mode]?.base || mode.replace('blitz_', '')))); // a Ladeira so serve a escolta (configure forca)
    this.configure({ mode, map: mode === 'br' || mode === 'heist' || mode === 'smuggle' ? 'auto' : mapas[Math.floor(Math.random() * mapas.length)] });
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
  full() { return this.humans() >= this.cap(); }

  join(id, name) {
    const p = this.addPlayer(id, (name || 'Player').slice(0, 24));
    this.balanceBots();
    this.send(id, { t: 'welcome', id, mode: this.mode, duo: this.duo, bounce: this.bounce, map: this.M.id, team: p.team, phase: this.phase });
    this.lobbyT = 0;
    // pecas das armas de quem ja estava na sala
    for (const o of this.players.values()) if (o.los && o.id !== id) this.send(id, { t: 'ev', k: 'lo', id: o.id, los: o.los, tracer: o.tracer });
    for (const o of this.players.values()) if (o.look && o.id !== id) this.send(id, { t: 'ev', k: 'look', id: o.id, look: o.look }); // visual de quem ja estava
    if (this.gg) this.send(id, { t: 'ev', k: 'ladder', id: this.gg.id, list: this.gg.list.map(u => u.body) });
    this.event({ k: 'msg', key: 'joined', name: p.name });
  }

  // voltou depois de cair a conexao (01/11): mesmo boneco, mesmo time e mesmos abates; so reenvia o que o
  // cliente precisa (antes entrava como jogador novo e o antigo ficava parado na sala levando os abates)
  resume(id) {
    const p = this.players.get(id);
    if (!p) return false;
    this.send(id, { t: 'welcome', id, mode: this.mode, duo: this.duo, bounce: this.bounce, map: this.M.id, team: p.team, phase: this.phase, resume: true });
    for (const o of this.players.values()) if (o.los && o.id !== id) this.send(id, { t: 'ev', k: 'lo', id: o.id, los: o.los, tracer: o.tracer });
    for (const o of this.players.values()) if (o.look && o.id !== id) this.send(id, { t: 'ev', k: 'look', id: o.id, look: o.look });
    if (this.gg) this.send(id, { t: 'ev', k: 'ladder', id: this.gg.id, list: this.gg.list.map(u => u.body) });
    return true;
  }

  // tira da sala por motivo (kick do host, AFK). O servidor pega a fila `drops`, fecha a conexao e esquece a
  // chave de volta (senao a reconexao automatica trazia ele de novo). Expulso pode entrar de novo pelo codigo.
  drop(id, why) {
    if (!this.players.has(id)) return;
    const name = this.players.get(id).name;
    this.send(id, { t: 'kicked', why });
    (this.drops ||= []).push({ id, why });
    this.leave(id);
    this.event({ k: 'msg', key: why === 'afk' ? 'leftAfk' : 'kicked', name });
  }
  takeDrops() { const d = this.drops || []; this.drops = []; return d; }
  bnOf(p) { return p.bn || (p.bot ? botBanner(p.id) : BANNER_DEFAULT); }
  // parado sem mexer/atirar: AFK_PLAY s na partida, AFK_LOBBY s no lobby = sai (sala vazia fecha sozinha)
  checkAfk() {
    if (this.local) return; // solo e tela dividida: a partida e da pessoa, ninguem sai por ficar parado
    const now = this.clock || 0;
    if (now - (this.afkAt || 0) < 1) return; // 1x por segundo
    this.afkAt = now;
    // 05/11: mudou de fase (lobby -> partida) ou esta carregando, o relogio zera. Sem isso quem esperou mais de AFK_PLAY no lobby
    // sem mexer era expulso no instante em que a partida comecava
    const fresh = this.afkPhase !== this.phase || this.waitLoad; this.afkPhase = this.phase;
    for (const p of [...this.players.values()]) {
      if (p.bot) continue;
      if (fresh) p.actAt = now;
      p.actAt ??= now;
      const lim = this.phase === 'play' && !this.over ? AFK_PLAY : AFK_LOBBY;
      if (now - p.actAt > lim) this.drop(p.id, 'afk');
    }
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
  // host escolhido (10/11, pedido dele: o host passa o cargo pra quem quiser); saiu, volta pro primeiro humano da sala
  hostId() { const h = this.hostPick && this.players.get(this.hostPick); if (h && !h.bot) return h.id; for (const p of this.players.values()) if (!p.bot) return p.id; return null; }

  humans() { let n = 0; for (const p of this.players.values()) if (!p.bot) n++; return n; }

  balanceBots() {
    const humans = this.humans();
    const bots = [...this.players.values()].filter(p => p.bot && !p.mob); // vilao da noite nao e bot aliado
    // battle royale: campo fixo de BR.field (bots completam; sem escolha de bots)
    const want = this.mode === 'br' ? Math.max(0, BR.field - humans) : this.mode === 'borroes' ? Math.max(0, Math.min(this.wantBots, 3) - Math.max(0, humans - 1), 0) : Math.max(0, Math.min(this.wantBots - Math.max(0, humans - 1), this.cap() - humans));
    while (bots.length < want) {
      const name = BOT_NAMES[this.botSeq++ % BOT_NAMES.length];
      bots.push(this.addPlayer('bot' + this.botSeq, name, true));
    }
    // sobrou bot: sai um do lado com mais jogadores (quem acabou de entrar ocupa a vaga dele); de preferencia um morto
    while (bots.length > want) {
      let out = bots[bots.length - 1];
      if (this.cfg.teams && !this.duo && this.mode !== 'infect') {
        const cnt = { red: 0, blue: 0 };
        for (const p of this.players.values()) if (p.team in cnt) cnt[p.team]++;
        const big = cnt.red >= cnt.blue ? 'red' : 'blue';
        const side = bots.filter(o => o.team === big);
        if (side.length) out = side.find(o => !o.alive) || side[side.length - 1];
      }
      bots.splice(bots.indexOf(out), 1);
      this.dropFlag?.(out);
      this.players.delete(out.id);
    }
    this.spreadBots();
    this.pairDuo();
  }

  // melhor ponto da lista: longe de inimigo, fora da visao dele e sem colar em colega
  // far (Contra Todos e Escada, 04/11, pedido dele): a distancia manda e nao para de contar nos 60 m; quem enxerga so pesa de perto
  bestSpawn(list, enemies, mates, far = false) {
    let best = null;
    for (const s of list) {
      if (!standable(this.M, s[0], s[1])) continue;
      const y = floorAt(this.M, s[0], s[1]);
      let m = far ? 220 : 60;
      for (const e of enemies) m = Math.min(m, Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1]));
      // alguem ja olhando pra la? nascer na mira e' o pior que existe
      const seen = enemies.some(e => Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1]) < (far ? 30 : 45) && hasLOS(this.M, [e.pos[0], e.pos[1] + 1.5, e.pos[2]], [s[0], y + 1.4, s[1]]));
      // ponto ja ocupado: quase proibido (o freeSpot ainda afasta se nao tiver outro)
      const crowd = mates.some(o => Math.hypot(o.pos[0] - s[0], o.pos[2] - s[1]) < 2.2);
      const sc = m - (seen ? (far ? m * 0.15 : 25) : 0) - (crowd ? 40 : 0) + rnd(0, far ? 4 : 8);
      if (!best || sc > best.sc) best = { s, y, sc };
    }
    return best;
  }

  // pontos extras do Contra Todos: malha pelo chao do mapa, so onde da pra chegar andando (sem isso eram 12 pontos e a sala
  // cheia sempre tinha alguem perto). Calcula uma vez por mapa
  openSpots() {
    const M = this.M; if (M.openSpots) return M.openSpots;
    const out = [], A = M.arena - 3, step = Math.max(8, A / 4), b = M.spawns.ffa[0], from = [b[0], floorAt(M, b[0], b[1]), b[1]];
    for (let x = -A; x <= A; x += step) for (let z = -A; z <= A; z += step) {
      if (!standable(M, x, z)) continue;
      const y = floorAt(M, x, z);
      if (Math.abs(y - from[1]) <= 0.6 && navPath(M, from, [x, y, z], 8000)) out.push([x, z]);
    }
    return (M.openSpots = out);
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
    // montagem/arma trocada durante a vida: so vale agora, no renascimento (pedido dele 03/11)
    if (p.nextLo) { const m = p.nextLo; p.nextLo = null; this.handle(p.id, { ...m, now: true }); }
    p.down = 0; p.reviveT = 0; p.brBp = null; p.brGun = null; // variante pega no BR some ao renascer (bate-volta)
    const S = this.M.spawns;
    const infect = this.mode === 'infect';
    let list = S.ffa;
    if (this.cfg.teams && p.team && !infect && S[p.team]) list = S[p.team];
    if (this.esc && p.team) list = [0, 1, 2, 3, 4, 5].map(() => escSpawn(this, p.team)); // escolta: atras/na frente do bonde
    if (this.heist && p.team) list = heistSpawns(this, p.team); // cofre: ataque perto da van, defesa perto do cofre
    const enemies = [...this.players.values()].filter(o => o !== p && o.alive && this.enemies(p, o));
    const mates = [...this.players.values()].filter(o => o !== p && o.alive && !this.enemies(p, o));
    // comeco da partida: o time nasce junto na base (o "ponto neutro" espalhava metade pelo mapa, pedido dele 01/11)
    const first = !p.spawnedIn; p.spawnedIn = true;
    const solo = !this.cfg.teams && !infect && this.mode !== 'br' && !this.bor; // cada um por si: usa tambem os pontos das bases, que ficam nas pontas do mapa
    if (solo) list = [...S.ffa, ...(S.red || []), ...(S.blue || []), ...this.openSpots()].filter(q => q.length === 2);
    let pick = this.bestSpawn(list, first && !solo ? [] : enemies, first ? [] : mates, solo);
    // base do time "quente" (inimigo em cima): nasce num ponto neutro (escolta nao: o ponto neutro caia colado no bonde)
    if (list !== S.ffa && !solo && !this.esc && !first && (!pick || pick.sc < 6)) { const alt = this.bestSpawn(S.ffa, enemies, mates); if (alt && (!pick || alt.sc > pick.sc)) pick = alt; }
    let s = this.mode === 'br' ? brSpawnPoint(this, p) : pick ? pick.s : list[0];
    // 1o nascimento num modo de time: todo mundo em roda em volta do ponto mais central da base (juntos, nao espalhados)
    if (first && this.mode !== 'br' && list !== S.ffa && !solo && !this.esc && list.length) {
      const cx = list.reduce((a, q) => a + q[0], 0) / list.length, cz = list.reduce((a, q) => a + q[1], 0) / list.length;
      const base = list.reduce((b, q) => (Math.hypot(q[0] - cx, q[1] - cz) < Math.hypot(b[0] - cx, b[1] - cz) ? q : b), list[0]);
      const k = (this.firstN ||= {})[p.team] = ((this.firstN[p.team] ?? -1) + 1);
      const r = k ? 2.2 + Math.floor((k - 1) / 6) * 2 : 0, a = (k % 6) * Math.PI / 3 + Math.floor(k / 6) * 0.5;
      const q = [base[0] + Math.cos(a) * r, base[1] + Math.sin(a) * r];
      s = standable(this.M, q[0], q[1]) ? q : base;
    }
    let x = s[0], z = s[1];
    const jx = x + rnd(-0.8, 0.8), jz = z + rnd(-0.8, 0.8);
    if (!this.esc && standable(this.M, jx, jz) && Math.abs(floorAt(this.M, jx, jz) - floorAt(this.M, x, z)) < 0.1) { x = jx; z = jz; } // escolta: o ponto ja foi medido com folga, o sorteio empurrava pra parede
    [x, z] = this.freeSpot(p, x, z);
    const y = floorAt(this.M, x, z);
    p.pos = [x, y, z];
    p.vel = [0, 0, 0];
    p.yaw = this.openYaw(x, y, z);
    if (this.esc) { const q = escPos(this); p.yaw = Math.atan2(-(q[0] - x), -(q[2] - z)); } // escolta: nasce olhando pro bonde
    // bate-volta: todo mundo entra caindo do ceu (paraquedas); `drop` abre a janela do dano de queda
    { const bc = !this.bounce && this.mode !== 'br' && this.blimps.find(b => b.kind === 'beacon' && b.owner === p.id); if (bc) { p.pos = [bc.pos[0] + 0.6, bc.pos[1], bc.pos[2]]; this.event({ k: 'beaconSpawn', id: p.id, pos: bc.pos }); } } // sinalizador: renasce nele
    if (this.bounce) { p.pos[1] = y + BR.bounce.dropH; p.drop = 30; p.chute = false; p.air = true; p.dropAt = [x, z]; } // dropAt: o ponto espalhado sorteado (bot cai ali)
    p.hp = p.bot && !this.bor ? BOT_HP : 100; // noite: bot e parceiro, vida cheia
    { const hk = EV(this.mut)?.hp; if (hk && !this.bor) p.hp = Math.round(p.hp * hk); } // evento Tanque/Casca de Ovo (08/11)
    p.alive = true; p.shieldT = 0; p.stimT = 0;
    p.flameFuel = GADGETS.gd_flame.fuel; p.ubShells = GADGETS.gd_shot.shells; p.ubT = 0; // gadget cheio ao nascer
    if (p.losBase) { p.los = p.losBase; p.losBase = null; this.event({ k: 'lo', id: p.id, los: p.los, tracer: p.tracer }); } // largou a arma pega do chao
    p.protUntil = this.mode === 'br' || this.mode === 'bomb' ? 0 : (this.clock || 0) + SPAWN_PROT; // escudo de nascimento (02/11): SPAWN_PROT sem levar dano; atirar desliga
    if (this.mode !== 'br' && p.field === 'vest') p.armor = FIELD.vest.armor; else if (this.mode !== 'br') p.armor = 0; // colete de campo: nasce vestido
    // a barra do equipamento continua de onde estava (enche por pontos)
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
    else if (this.bor && !this.borArt) { p.owned = new Set(['pistol', 'melee']); p.wpn = 'pistol'; } // Rascunho: todo mundo so com a Estalo; o resto se compra
    else if (p.bot) {
      // 03/11 (pedido dele): bots com mais variedade, sniper tambem; e o MODELO da arma muda (corpo sorteado), nao so a
      // categoria. A montagem vai pro cliente (evento lo) e vale pra arma largada no chao
      const pool = [['smg', 3], ['rifle', 3], ['shotgun', 2], ['sniper', 1.6], ['lmg', 1.4], ['pistol', 0.8]], tot = pool.reduce((s, [, n]) => s + n, 0);
      let r = Math.random() * tot; p.wpn = pool.find(([, n]) => (r -= n) < 0)?.[0] || 'smg';
      const body = botBody(p.wpn);
      if (body) { p.los = { [p.wpn]: { body } }; this.event({ k: 'lo', id: p.id, los: p.los, tracer: p.tracer }); }
    }
    else p.wpn = PRIMARIES.includes(p.primary) ? p.primary : 'smg';
    const E = EV(this.mut);
    if (E?.kit && this.mode !== 'gungame' && this.mode !== 'br' && !infect) { p.owned = new Set(E.kit); p.wpn = E.kit[0]; } // evento: armas fixas
    p.fuse = E?.fuse || 0; // bomba-relogio: pavio no peito
    p.maxHp = p.hp;
    p.owned.add(p.wpn);
    if (p.bot) { p.field ||= botPickField(); this.botReload(p, true); p.ai.blind = 0; p.ai.target = null; p.ai.path = null; p.ai.route = null; p.ai.departT = rnd(0, 1.6); p.ai.lane = rnd(-1, 1); } // departT/lane: cada um sai numa hora e num corredor (02/11: saiam em fila)
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
    if (this._dyn) this.M.dyn = this._dyn; // 08/11: obstaculos moveis DESTA sala (o mapa e dividido entre salas no servidor)
    const p = this.players.get(id);
    if (!p || !m || typeof m !== 'object') return;
    if (m.t !== 'state' && m.t !== 'ping' && m.t !== 'lat') p.actAt = this.clock || 0; // qualquer acao conta como presente (AFK)
    switch (m.t) {
      // ping no Tab (04/11, pedido dele): o jogo mede a ida e volta e conta o que deu; o placar mostra de todo mundo
      case 'lat': { p.ping = Math.max(0, Math.min(999, m.ms | 0)); this.send(id, { t: 'latr', c: m.c }); break; }
      // host tira alguem da sala (02/11, pedido dele): sai na hora, mas pode entrar de novo pelo codigo
      case 'kick': {
        const o = this.players.get(m.id);
        if (id !== this.hostId() || !o || o.bot || o.id === id || !this.useLobby) break;
        this.drop(o.id, 'kick');
        break;
      }
      case 'giveHost': {
        const o = this.players.get(m.id);
        if (id !== this.hostId() || !o || o.bot || o.mob || o.id === id || !this.useLobby) break;
        this.hostPick = o.id; this.lobbyT = 0;
        this.event({ k: 'hostGiven', from: id, to: o.id });
        break;
      }
      // tela de fim: voltar pro lobby (host leva a sala; os outros so marcam, e todo mundo marcado tambem leva)
      case 'toLobby': {
        if (!this.over || !this.useLobby || p.bot) break;
        p.endBack = true;
        // 08/11 (pedido dele): podio sem volta automatica; quem aperta volta, quem quer fica no podio (o cliente segura o podio
        // dele ate apertar ou o host comecar a proxima). A sala vai pro lobby no primeiro que voltar.
        this.backLobby = true;
        this.event({ k: 'endBack', id, host: id === this.hostId() });
        break;
      }
      case 'dance': { // podio: so quem ficou entre os 3 dança, no maximo uma troca por 0,5 s
        if ((!this.over && this.phase === 'play') || !this.top3?.includes(id) || !DANCE_IDS.includes(m.d) || (p.danceAt ?? -9) + 0.5 > (this.clock || 0)) break;
        p.danceAt = this.clock || 0;
        this.event({ k: 'dance', id, d: m.d });
        break;
      }
      case 'ready': {
        p.lobbyReady = !!m.v;
        this.lobbyT = 0;
        break;
      }
      // plantar a bomba: escolher o lado no lobby (lado com 8 pessoas recusa; bots se arrumam em volta)
      case 'team': {
        if (this.phase === 'play' && !p.bot) { this.swapTeam(p, m.team); break; } // pausa da partida
        if (!this.teamPick() || this.phase !== 'lobby' || (m.team !== 'red' && m.team !== 'blue')) break;
        if (m.team !== p.team && this.teamHumans(id)[m.team] >= this.teamMax()) break;
        p.team = m.team;
        this.spreadBots();
        this.lobbyT = 0;
        break;
      }
      // host muda a partida no lobby (modo, mapa, bots, meta, tempo, pontaria): vale pra sala toda na hora
      // alterar a partida em andamento (08/11, pedido dele): host propoe, TODOS os outros humanos precisam aprovar
      case 'mvProp': this.mvOpen(id, m); break;
      case 'mvVote': {
        const V = this.mv; if (!V || !V.need.has(id)) break;
        if (!m.yes) { this.mvEnd('no', id); break; }
        V.yes.add(id); this.mvCheck();
        break;
      }
      case 'mvCancel': if (this.mv && id === this.mv.host) this.mvEnd('cancel'); break;
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
      case 'holeUse': fieldHoleUsed(this, p, m); break;
      case 'respawn': {
        if (!p.alive && p.respawnT <= 0) p.wantSpawn = true;
        break;
      }
      case 'loadout': {
        if (typeof m.bn === 'string' && bannerOk(m.bn, Number(m.ul) || 1)) p.bn = m.bn; // banner: vale na hora, ate no meio da partida
        // partida rolando e vivo: guarda pro proximo renascimento (arma, pecas, skills, equipamento e sequencias).
        // Campo de treino manda now (troca na hora)
        if (this.phase === 'play' && p.alive && !m.now && !this.over && p.loSig) { p.nextLo = m; this.send(id, { t: 'ev', k: 'loNext' }); break; } // loSig: a 1a montagem (entrada na partida) vale na hora
        if (Number.isFinite(m.lvl)) p.lvl = Math.max(1, Math.min(250, Math.round(m.lvl))); // nivel de verdade (o que aparece)
        p.ulvl = Number.isFinite(m.ul) ? Math.max(1, Math.min(250, Math.round(m.ul))) : p.lvl; // nivel de desbloqueio (prestigiado = maximo): so valida skill/equipamento
        if (typeof m.elite === 'boolean') p.elite = m.elite; // selo Elite da Rovex (so visual)
        p.rk = Number.isInteger(m.rk) && m.rk >= 0 && m.rk <= 4 ? m.rk : -1; // badge da rankeada (so visual)
        p.prest = Math.max(0, Math.min(10, m.prest | 0)); // estrelas de prestigio (so visual)
        if (PRIMARIES.includes(m.primary)) p.primary = m.primary;
        // skills passivas: so ids conhecidos, sem repetir, ate SKILL_SLOTS e liberadas pro nivel informado
        p.skills = Array.isArray(m.skills) ? [...new Set(m.skills.filter(s => SKILLS[s] && (p.ulvl || p.lvl || 1) >= SKILLS[s].lvl))].slice(0, SKILL_SLOTS) : [];
        p.los = cleanLoadouts(m.los);
        p.lethal = LETHALS.includes(m.lethal) ? m.lethal : 'frag'; p.tactical = TACTICALS.includes(m.tactical) && (p.ulvl || p.lvl || 1) >= (NADES[m.tactical].lvl || 0) ? m.tactical : 'flash'; // aba Granadas (04/11)
        p.field = FIELD[m.field] && (p.ulvl || p.lvl || 1) >= FIELD[m.field].lvl ? m.field : null;
        p.streaks = pickStreaks(m.streaks); // sequencias que ele escolheu no Arsenal (02/11) // equipamento de campo
        p.tracer = typeof m.tracer === 'string' && /^[a-z]{2,10}$/.test(m.tracer) ? m.tracer : 'chalk';
        // mexeu na classe/armas no lobby depois de dar pronto: volta pra nao pronto (tem que confirmar de novo)
        const sig = JSON.stringify([p.primary, p.los, p.skills, p.field, p.tracer]);
        if (this.phase === 'lobby' && p.loSig && p.loSig !== sig && p.lobbyReady) { p.lobbyReady = false; this.lobbyT = 0; }
        p.loSig = sig;
        this.event({ k: 'lo', id, los: p.los, tracer: p.tracer });
        break;
      }
      // com o que a pessoa esta jogando (icone no placar): pc, celular ou controle
      case 'dev': { p.dev = ['pc', 'mob', 'pad'].includes(m.v) ? m.v : null; break; }
      case 'look': {
        // visual do boneco: so o que existe no catalogo; repassa pra sala
        const nl = cleanLook(m.look);
        if (this.phase === 'lobby' && p.look && p.lobbyReady && JSON.stringify(nl) !== JSON.stringify(p.look)) { p.lobbyReady = false; this.lobbyT = 0; } // trocou o visual: confirma de novo
        p.look = nl;
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
        if (Math.abs(m.yaw - p.yaw) > 0.02 || Math.abs(m.pos[0] - p.pos[0]) + Math.abs(m.pos[2] - p.pos[2]) > 0.05) p.actAt = this.clock || 0; // mexeu: presente
        p.pos = clampArena(this.M, m.pos); p.yaw = m.yaw; p.pitch = m.pitch; p.anim = String(m.anim).slice(0, 8);
        p.ads = m.ad === 1 ? 1 : 0; p.ca = m.ca === 1 ? 1 : 0; // mirando (04/11): brilho da luneta pros outros; ca = mira de 45 graus (aparece na tela de morte)
        if (p.car && p.seat === 0 && m.car && Array.isArray(m.car.pos) && m.car.pos.every(Number.isFinite) && Number.isFinite(m.car.yaw)) { // quem dirige manda o carro (ate ~1 s de atraso de folga)
          const car = this.cars.find(k => k.id === p.car);
          if (car && Math.hypot(m.car.pos[0] - car.pos[0], m.car.pos[2] - car.pos[2]) < CAR.speed * 1.2 + 1) { car.pos = [...m.car.pos]; car.yaw = m.car.yaw; car.spd = Math.max(-CAR.rev, Math.min(CAR.speed, +m.car.spd || 0)); car.steer = Math.max(-1, Math.min(1, +m.car.st || 0)); }
        }
        if (p.car) { const car = this.cars.find(k => k.id === p.car); if (car) p.pos = seatPos(car, p.seat); } // sentado: fica no lugar
        p.lean = this.mode === 'bomb' && Number.isFinite(m.ln) ? Math.max(-1, Math.min(1, m.ln)) : 0; // inclinar (so plantar a bomba)
        if (this.mode !== 'gungame' && WEAPONS[m.wpn] && m.wpn !== p.wpn && (this.mode !== 'infect' || p.owned.has(m.wpn))) { p.lastWpn = p.wpn; p.wpn = m.wpn; }
        break;
      case 'swing':
        if (p.alive) this.event({ k: 'swing', id });
        break;
      case 'shot':
        if (!WEAPONS[m.wpn] || !Array.isArray(m.o)) return;
        p.protUntil = 0; // atirou: perde o escudo de nascimento
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
      case 'car': // entrar/sair do carro (04/11)
        if (m.act === 'enter') carEnter(this, p); else if (m.act === 'exit') carExit(this, p);
        break;
      case 'hitCar': { // tiro no carro inimigo (04/11): mesmas travas do dirigivel
        const car = this.cars.find(k => k.id === m.id), w = WEAPONS[m.wpn];
        if (!car || car.deadT > 0 || car.team === p.team || !w || w.melee || !p.alive || p.car || !Number.isFinite(m.dmg) || m.dmg <= 0) return;
        if (m.wpn !== p.wpn && m.wpn !== p.lastWpn) return;
        const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]], at = [car.pos[0], car.pos[1] + 0.9, car.pos[2]];
        if (Math.sqrt(dist2(eye, at)) > (w.range || 260) + 10 || !hasLOS(this.M, eye, at)) return;
        const dmg = Math.min(m.dmg, w.dmg * (w.pellets || 1) * 1.5, Math.max(0, p.budget));
        if (dmg <= 0) return;
        p.budget -= dmg;
        carDamage(this, car, dmg, p);
        break;
      }
      case 'hitCraft': { // 07/11 (pedido dele): biplano inimigo leva tiro; zerou, explode e o ataque acaba (mesmas travas do dirigivel)
        const f = this.crafts?.find(x => x.id === m.id && x.k === 'plane'), w = WEAPONS[m.wpn], owner = f && this.players.get(f.owner);
        if (!f || !w || w.melee || !p.alive || p.down > 0 || !Number.isFinite(m.dmg) || m.dmg <= 0) return;
        if (owner && !this.enemies(p, owner)) return;
        if (m.wpn !== p.wpn && m.wpn !== p.lastWpn) return;
        const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
        if (Math.sqrt(dist2(eye, f.pos)) > (w.range || 260) + 10 || !hasLOS(this.M, eye, f.pos)) return;
        const dmg = Math.min(m.dmg, w.dmg * (w.pellets || 1) * 1.5, Math.max(0, p.budget));
        if (dmg <= 0) return;
        p.budget -= dmg; f.hp -= dmg;
        if (f.hp <= 0) {
          this.crafts = this.crafts.filter(x => x !== f); this.streakGap = 0;
          this.event({ k: 'blimpDown', id: p.id, owner: f.owner, pos: f.pos.slice(), plane: 1 });
          p.score += 100;
        }
        break;
      }
      case 'hitBlimp': { // tiro no dirigivel inimigo: enche de furo ate estourar
        const b = this.blimps.find(x => x.id === m.id), w = WEAPONS[m.wpn], owner = b && this.players.get(b.owner);
        if (!b || !w || w.melee || !p.alive || p.down > 0 || !Number.isFinite(m.dmg) || m.dmg <= 0) return;
        if (owner && !this.enemies(p, owner)) return;
        if (m.wpn !== p.wpn && m.wpn !== p.lastWpn) return;
        const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
        const bp = b.kind === 'sentry' ? [b.pos[0], b.pos[1] + 1, b.pos[2]] : b.kind === 'beacon' ? [b.pos[0], b.pos[1] + 0.4, b.pos[2]] : b.pos;
        if (Math.sqrt(dist2(eye, bp)) > (w.range || 260) + 10 || !hasLOS(this.M, eye, bp)) return;
        const dmg = Math.min(m.dmg, w.dmg * (w.pellets || 1) * 1.5, Math.max(0, p.budget));
        if (dmg <= 0) return;
        p.budget -= dmg;
        b.hp -= dmg;
        if (b.hp <= 0) {
          this.blimps = this.blimps.filter(x => x !== b); if (b.kind !== 'sentry') this.streakGap = 0; // some e libera a proxima sequencia na hora
          this.event({ k: 'blimpDown', id: p.id, owner: b.owner, pos: bp, sentry: b.kind === 'sentry' || b.kind === 'beacon' ? 1 : undefined, beacon: b.kind === 'beacon' ? 1 : undefined });
          if (b.kind === 'sentry' || b.kind === 'beacon') p.score += 50;
        }
        break;
      }
      case 'hitAbx': { // tiro na caixa de municao inimiga: as mesmas conferencias do tiro no dirigivel
        const b = this.boxes.find(x => x.id === m.id), w = WEAPONS[m.wpn], owner = b && this.players.get(b.owner);
        if (!b || !owner || !w || w.melee || !p.alive || p.down > 0 || !Number.isFinite(m.dmg) || m.dmg <= 0 || !this.enemies(p, owner)) return;
        if (m.wpn !== p.wpn && m.wpn !== p.lastWpn) return;
        const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]], bp = [b.pos[0], b.pos[1] + 0.4, b.pos[2]];
        if (Math.sqrt(dist2(eye, bp)) > (w.range || 260) + 10 || !hasLOS(this.M, eye, bp)) return;
        const dmg = Math.min(m.dmg, w.dmg * (w.pellets || 1) * 1.5, Math.max(0, p.budget));
        if (dmg <= 0) return;
        p.budget -= dmg;
        abxShot(this, b, p, dmg);
        break;
      }
      // marcacao (ping) do battle royale: so o time ve (dupla = o parceiro; sozinho = so voce)
      // chat da sala: texto curto, 1 por segundo (3 seguidas e espera 4 s), palavrao mascarado. Bot nao fala.
      case 'chat': {
        if (p.bot) break;
        const now = Date.now();
        p.chatT = (p.chatT || []).filter(x => now - x < 4000);
        if (p.chatT.length >= 3 || now - (p.chatT[p.chatT.length - 1] || 0) < 900) break;
        const text = cleanChat(m.text);
        if (!text) break;
        p.chatT.push(now);
        this.event({ k: 'chat', id, name: p.name, team: p.team || null, text });
        break;
      }
      // Chat Rapido (10/11): so o numero da frase (o texto sai do idioma de quem le); uma a cada 1,2 s
      case 'qc': {
        const i = m.i | 0, now = this.clock || 0;
        if (!(i >= 0 && i < QC_N) || now - (p.qcAt ?? -9) < 1.2) break;
        p.qcAt = now;
        this.event({ k: 'qc', id, name: p.name, team: p.team || null, i });
        break;
      }
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
          p.nades[m.kind]--; // m.kind = o slot (frag = letal, flash = tatica); o que sai e o que ele escolheu
          const real = m.kind === 'frag' ? (p.lethal || 'frag') : (p.tactical || 'flash');
          this.throwNade(p, real, norm(m.d), real === 'frag' ? Number(m.cook) || 0 : 0, m.hand === true && real === 'frag');
        }
        break;
      case 'abx':
        abxTake(this, p, m.id);
        break;
      case 'streak':
        if (p.alive) this.useStreak(p, m.kind);
        break;
      case 'pass': // Contrabando: passa o caixote (a mira vem junto; o yaw do servidor pode estar um tick atras)
        if (Number.isFinite(m.yaw)) p.yaw = m.yaw;
        heistPass(this, p);
        break;
      case 'pickGun':
        if (Number.isFinite(m.id)) this.pickGun(p, m.id);
        break;
      case 'flame': { // lanca-chamas: o cliente manda a direcao a cada 0,1 s enquanto segura
        const G = GADGETS.gd_flame, now = this.clock || 0;
        if (!p.alive || p.down > 0 || p.wpn !== 'rifle' || gadgetOf(p.los?.rifle) !== 'gd_flame' || !Array.isArray(m.d) || !m.d.every(Number.isFinite)) break;
        if (now - (p.flameAt ?? -9) < G.tick * 0.8 || (p.flameFuel ?? G.fuel) <= 0) break;
        p.flameAt = now; p.flameFuel = (p.flameFuel ?? G.fuel) - G.tick; p.flameIdle = 0; p.protUntil = 0;
        const d = norm(m.d), e = [p.pos[0], p.pos[1] + 1.4, p.pos[2]];
        if (Math.floor(now * 10) % 2 === 0) this.event({ k: 'flame', id: p.id, o: e.map(v => Math.round(v * 100) / 100), d: d.map(v => Math.round(v * 100) / 100) });
        for (const v of this.players.values()) {
          if (!v.alive || v === p || !this.enemies(p, v)) continue;
          const c = [v.pos[0] - e[0], v.pos[1] + 1 - e[1], v.pos[2] - e[2]], dist = Math.hypot(...c);
          if (dist > G.range || (c[0] * d[0] + c[1] * d[1] + c[2] * d[2]) / (dist || 1) < G.cone || !hasLOS(this.M, e, [v.pos[0], v.pos[1] + 1, v.pos[2]])) continue;
          this.damage(v, p, G.dmg, 'flame', false);
          if (v.alive && !v.burn) v.burn = { n: 2, a: p.id, wpn: 'flame', acc: 0 }; // pega fogo (curtinho)
        }
        break;
      }
      case 'ubshot': // escopetinha: gasta o cartucho aqui; os acertos chegam como 'hit' com wpn 'ubshot'
        if (p.alive && !(p.down > 0) && p.wpn === 'rifle' && gadgetOf(p.los?.rifle) === 'gd_shot' && (p.ubShells ?? GADGETS.gd_shot.shells) > 0 && Array.isArray(m.o)) {
          p.ubShells = (p.ubShells ?? GADGETS.gd_shot.shells) - 1; p.ubAt = this.clock || 0; p.protUntil = 0;
          this.event({ k: 'shot', id, o: m.o, e: m.e, wpn: 'ubshot' });
        }
        break;
      case 'rocket': // Bazuca: o cliente manda so a direcao; o foguete voa aqui
        if (p.alive && !(p.down > 0) && p.owned.has('rpg') && p.rpgLeft > 0 && Array.isArray(m.d) && m.d.length === 3 && m.d.every(Number.isFinite)) this.fireRocket(p, norm(m.d));
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
    if (m.wpn === 'ubshot') { if ((this.clock || 0) - (p.ubAt ?? -9) > 0.6 || gadgetOf(p.los?.rifle) !== 'gd_shot') return 0; } // so logo depois do cartucho
    else if (!w.melee && m.wpn !== p.wpn && m.wpn !== p.lastWpn) return 0;
    const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
    const d = Math.sqrt(dist2(eye, v.pos));
    const range = w.melee ? (m.wpn === 'fists' ? w.range : bodyTrait(this.bodyOf(p, 'melee')).range || w.range) * 1.4 + 0.6 : (w.range || 260) * ((AMMO[this.ammoOf(p, m.wpn)] || {}).range || 1) * (CONV_RANGE[this.bodyOf(p, m.wpn) + '|' + p.los?.[m.wpn]?.conv] || 1); // balote alcanca mais
    if (d > range) return 0;
    if (w.melee) { const now = this.clock || 0; if (now - (p.meleeAt || -9) < 0.3) return 0; p.meleeAt = now; return Math.min(m.dmg, w.dmg); }
    const hb = v.mob ? MOBS[v.mob].hb : null; // vilao da noite: peito e cabeca pela ficha (chefao de 6 m)
    const chest = [v.pos[0], v.pos[1] + (hb ? hb.h * 0.55 : 1.1), v.pos[2]], head = [v.pos[0], v.pos[1] + (hb ? hb.head : 1.6), v.pos[2]];
    const am = this.ammoOf(p, m.wpn), A = am ? AMMO[am] : {};
    let wallK = 1;
    if (!hasLOS(this.M, eye, chest) && !hasLOS(this.M, eye, head)) {
      // perfurante: passa por parede fina, com menos dano
      const spC = wallSpan(this.M, eye, chest), spH = wallSpan(this.M, eye, head), sp = spC.sum <= spH.sum ? spC : spH;
      if (am !== 'ap' || sp.sum > A.pierce) return 0;
      wallK = A.wallK * A.wallFall ** Math.max(0, sp.n - 1); // 09/11 (pedido dele): 1a parede tira 25%; cada parede a mais tira bem mais
    }
    const tr = bodyTrait(this.bodyOf(p, m.wpn));
    const maxShot = w.dmg * (tr.pellets || w.pellets || 1) * (tr.dmg || 1) * (this.bpOf(p, m.wpn).dmg || 1) * (A.dmg || 1) * wallK * 1.25;
    const dmg = Math.min(m.dmg, maxShot);
    if (p.budget < dmg) return Math.max(0, p.budget);
    p.budget -= dmg;
    return dmg;
  }

  event(ev) {
    // tiro de gente (nao do dirigivel) vira barulho: bot perto ouve e vai ver (some em 3 s)
    if (ev.k === 'shot' && this.players.has(ev.id) && ev.o && !String(this.players.get(ev.id).los?.[ev.wpn]?.muzzle || '').startsWith('silencer')) (this.noises ||= new Map()).set(ev.id, { pos: [ev.o[0], ev.o[1] - 1.4, ev.o[2]], t: 3 }); // so o ultimo tiro de cada um
    this.send(null, { t: 'ev', ...ev });
  }

  // ---------- combate ----------
  enemies(a, b) { return a !== b && (!this.cfg.teams || a.team !== b.team); }

  damage(v, a, dmg, wpn, head, burn = false) {
    if (this.over || this.freezeT > 0 || !v.alive || !Number.isFinite(dmg)) return;
    if (a && a !== v && !this.enemies(a, v)) return;
    if (a && a !== v && (v.protUntil || 0) > (this.clock || 0) && wpn !== 'iris') return; // escudo de nascimento
    if (fieldBlocks(this, v, a, wpn, head ? dmg * 1.6 : dmg)) return; // guarda-chuva aberto de frente pro tiro (gasta a vida dele)
    const E = EV(this.mut);
    if (head) dmg = E?.oneHead && wpn !== 'melee' ? 999 : dmg * (v.headK || E?.headMul || 1.6); // evento: cabecao doi mais; duelo: cuca derruba; chefao: ponto fraco (headK)
    if (BLAST.includes(wpn) && hasSkill(v, 'couro')) dmg *= SKILLS.couro.blast; // couro grosso
    // colete (BR ou o equipamento de campo): absorve ate quebrar; a iris passa direto
    if ((this.mode === 'br' || v.armor > 0) && wpn !== 'iris') { const had = v.armor > 0; dmg = brArmor(v, dmg); if (had && !(v.armor > 0) && this.mode !== 'br') this.event({ k: 'vestBreak', id: v.id }); }
    v.hurtAt = this.clock || 0;
    // bot que leva tiro (01/11): treme a mira um instante e vira pra onde veio o tiro (previsivel: quem atira primeiro leva vantagem)
    if (v.bot && v.ai && a && a !== v) { v.ai.hurtT = 0.4; if (!v.ai.target) { v.ai.lastSeen = [...a.pos]; v.ai.lastSeenT = 3; v.ai.holdT = 0; } }
    if (this.bor) dmg = borHit(this, v, a, dmg) ?? dmg; // noite: dano em vilao vira ponto (Lapis Afiado: um tiro apaga)
    v.hp -= dmg;
    // quem ajudou: dano acumulado por atacante, com hora (assistencia vale por 6 s)
    if (a && a !== v) { v.dmgBy = v.dmgBy || {}; const r = v.dmgBy[a.id] || (v.dmgBy[a.id] = { dmg: 0, t: 0 }); r.dmg += dmg; r.t = this.clock || 0; }
    // am = tipo de bala do golpe (fogo, rastreadora, explosiva, perfurante): a tela de quem levou mostra o efeito
    this.event({ k: 'hurt', v: v.id, a: a ? a.id : null, dmg: Math.round(dmg), from: a ? a.pos : null, head, ...(burn ? { burn: 1 } : {}), ...(this.hitAm ? { am: this.hitAm } : {}) });
    if (v.hp <= 0 && !(this.duo && brDown(this, v, a, wpn, head)) && !borDown(this, v, a)) this.kill(v, a, wpn, head); // dupla e noite: cai antes de sair
  }

  kill(v, a, wpn, head) {
    if (v.owned?.has('rpg')) { v.owned.delete('rpg'); v.rpgLeft = 0; v.rpgTake = 0; } // caiu com a bazuca: perde os foguetes que sobraram
    v.alive = false; v.hp = 0; v.down = 0; v.reviveT = 0; v.respawnT = this.mode === 'infect' && this.infStarted ? INFECT.infectedRespawn : this.mode === 'ctf' ? 5 : this.heist ? heistRespawn(this, v.team) : RESPAWN; v.deaths++; if (!v.bot) v.streak = 0; /* bot guarda a contagem (03/11: morria antes do 3o abate e so chamava o Leite); zera ao pegar a ultima do kit */ // bandeira: 5 s (gente e bot, pedido dele 01/11); morreu = sequencia zera
    this.dropFlag(v);
    this.dropGun(v);
    const suicide = !a || a === v;
    if (!suicide) {
      // abate da propria Torta Atomica nao conta pra sequencia (senao ela se alimentava)
      a.kills++; if (wpn !== 'nuke') a.streak++; a.score += 100;
      if (a.bot && !a.mob && !v.bot && Math.random() < 0.18 && (this.clock || 0) - (a.qcAt ?? -9) > 20) { a.qcAt = this.clock || 0; this.event({ k: 'qc', id: a.id, name: a.name, team: a.team || null, i: BOT_TAUNTS[Math.floor(Math.random() * BOT_TAUNTS.length)] }); }
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
      if (this.mode !== 'infect' && this.mode !== 'bomb' && this.mode !== 'br' && this.mode !== 'borroes' && this.mode !== 'gungame' && wpn !== 'nuke') for (const kind of a.streaks || pickStreaks(null)) {
        const s = STREAKS[kind];
        if (a.streak === s.kills - (hasSkill(a, 'pavio') && s.kills > 3 ? SKILLS.pavio.streak : 0)) {
          // bot e Torta Atomica (01/11, pedido dele): so 30% das vezes e no maximo uma por partida (pegavam toda hora)
          // as grandes novas (03/11) seguem o mesmo freio: metade das vezes e uma de cada por partida
          if (kind === 'nuke' && a.bot && ((this.botNukes || 0) >= 1 || Math.random() > 0.3)) continue;
          if (BOT_BIG.includes(kind) && a.bot && (((this.botBig ||= {})[kind] || 0) >= (kind === 'bomber' && this.M.id === 'deserto' ? 2 : 1) || Math.random() > 0.5)) continue;
          if (BOT_BIG.includes(kind) && a.bot) this.botBig[kind] = (this.botBig[kind] || 0) + 1;
          if (kind === 'nuke' && a.bot) this.botNukes = (this.botNukes || 0) + 1;
          a.ready.push(kind);
          this.event({ k: 'streakReady', id: a.id, kind });
          if (a.bot) this.useStreak(a, kind);
        }
      }
      // pegou a ultima do kit (a Torta ou a mais alta que escolheu): a contagem volta do zero sem precisar morrer (03/11, pedido dele)
      if (this.mode !== 'infect' && this.mode !== 'bomb' && this.mode !== 'br' && this.mode !== 'borroes' && wpn !== 'nuke') {
        const top = Math.max(...(a.streaks || pickStreaks(null)).map(k => STREAKS[k].kills - (hasSkill(a, 'pavio') && STREAKS[k].kills > 3 ? SKILLS.pavio.streak : 0)));
        if (a.streak >= top) a.streak = 0;
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
    if (this.bor) borKilled(this, v, a); // pontos do abate; gente so volta na onda seguinte
    this.event({ k: 'kill', a: suicide ? null : a.id, v: v.id, wpn, head, streak: suicide ? 0 : a.streak, ahp: suicide ? undefined : Math.max(1, Math.ceil(a.hp)), pos: v.pos, bn: suicide ? undefined : this.bnOf(a) });
    // sobrevivente que cai (de qualquer jeito) vira infectado
    if (this.mode === 'infect' && v.team === 'blue' && this.infStarted) this.infect(v, suicide ? null : a);
    if (this.mode === 'ffa' && !suicide && a.kills >= this.limit) this.end(a.name);
    if (this.mode === 'tdm' && !suicide && this.teamScore[a.team] >= this.limit) this.end(a.team);
  }

  // ---------- arma no chao (02/11, pedido dele) ----------
  // quem morre larga a arma da mao, montada do jeito dele (corpo, mira, camo...); some em GUN_DROP_T s pra nao
  // acumular. Quem passa por cima pega e fica com ela MONTADA ASSIM ate morrer (renasce com as proprias).
  dropGun(v) {
    const w = v.wpn;
    if (this.noDrops || !WEAPONS[w] || WEAPONS[w].melee || WEAPONS[w].gadget || w === 'minigun' || w === 'rpg' || w === 'fists' || ['br', 'gungame', 'infect', 'borroes'].includes(this.mode)) return; // campo de treino/tutorial: ninguem larga arma
    this.gunDrops ||= [];
    if (this.gunDrops.length >= 24) { const old = this.gunDrops.shift(); this.event({ k: 'gunGone', id: old.id }); } // teto de memoria
    const lo = v.los?.[w] || null, d = { id: this.gunSeq = (this.gunSeq || 0) + 1, wpn: w, lo, pos: [v.pos[0], floorAt(this.M, v.pos[0], v.pos[2]), v.pos[2]], t: GUN_DROP_T, from: v.id };
    this.gunDrops.push(d);
    this.event({ k: 'gunDrop', id: d.id, wpn: w, lo, pos: d.pos });
  }
  // pegar a arma do chao: so quando a pessoa aperta usar perto dela (03/11: pegava sozinho e trocava a arma)
  pickGun(p, id) {
    const i = (this.gunDrops || []).findIndex(d => d.id === id);
    if (i < 0) return;
    const d = this.gunDrops[i];
    if (p.bot || !p.alive || p.down > 0 || dist2(p.pos, d.pos) > 2.4 * 2.4 || (this.mode === 'infect' && p.team === 'red')) return;
    p.losBase ||= { ...(p.los || {}) };
    // TROCA (03/11, pedido dele): principal do chao troca pela minha principal; pistola pela minha pistola.
    // A minha cai no chao no lugar da dela (montada do meu jeito) e some em GUN_DROP_T s como qualquer arma largada
    const prim = PRIMARIES.includes(d.wpn) || d.wpn === 'minigun';
    const mine = [...p.owned].find(w => prim ? PRIMARIES.includes(w) || w === 'minigun' : w === d.wpn) || null;
    this.gunDrops.splice(i, 1); this.event({ k: 'gunGone', id: d.id, by: p.id });
    if (mine) {
      const wasHeld = p.wpn, at = p.pos;
      p.wpn = mine; p.pos = [d.pos[0], d.pos[1], d.pos[2]]; this.dropGun(p); p.wpn = wasHeld; p.pos = at; // dropGun larga a da mao, onde a pessoa esta
      const nd = this.gunDrops[this.gunDrops.length - 1]; if (nd && nd.from === p.id) nd.from = null;
      if (mine !== d.wpn) { p.owned.delete(mine); this.event({ k: 'take', id: p.id, wpn: mine }); }
    }
    // arma de bot (sem montagem, los null): fica a de FABRICA, igual a que ele tinha na mao. Antes, sem montagem, valia a
    // montagem da SUA conta pra aquela arma (03/11: "pega a arma do bot e vira a minha")
    p.los = { ...(p.los || {}), [d.wpn]: d.lo || {} };
    p.owned.add(d.wpn); p.wpn = d.wpn;
    this.event({ k: 'give', id: p.id, wpn: d.wpn, pick: 1, lo: d.lo, swap: mine === d.wpn ? 1 : undefined });
    this.event({ k: 'lo', id: p.id, los: p.los, tracer: p.tracer });
  }
  tickGunDrops(dt) {
    if (!this.gunDrops?.length) return;
    for (let i = this.gunDrops.length - 1; i >= 0; i--) {
      const d = this.gunDrops[i];
      d.t -= dt;
      if (d.t <= 0) { this.gunDrops.splice(i, 1); this.event({ k: 'gunGone', id: d.id }); }
    }
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
    this.event({ k: 'countdown', s: COUNT_IN }); // 's' e nao 't': o evento vai como { t: 'ev', ...ev } e o 't' apagava o tipo (01/11)
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
      const prevP = [...n.pos], hitF = nadeStep(this.M, n, dt);
      if (hitF > 3) this.event({ k: 'bounce', pos: n.pos });
      if (n.kind === 'tomahawk') { // machadinha: voando, pega o primeiro inimigo no caminho; bateu no chao/parede = para de valer
        if (hitF > 0) n.dead = true;
        if (n.dead && Math.hypot(n.vel[0], n.vel[2]) < 0.5) { const o = this.players.get(n.owner); if (o?.alive && Math.hypot(o.pos[0] - n.pos[0], o.pos[2] - n.pos[2]) < 1.3 && Math.abs(o.pos[1] - n.pos[1]) < 2) { o.nades.frag = (o.nades.frag || 0) + 1; n.fuse = 0; n.picked = true; this.event({ k: 'tomaPick', id: o.id }); } } // dono passou em cima: pega de volta
        if (!n.dead) { const owner = this.players.get(n.owner); for (const v of this.players.values()) { if (!v.alive || v.id === n.owner || (owner && !this.enemies(owner, v))) continue; if (segToBody(prevP, n.pos, v.pos) < NADES.tomahawk.hitR) { n.dead = true; this.event({ k: 'tomaHit', pos: n.pos }); this.damage(v, owner || v, 999, 'tomahawk', false); break; } } }
      }
      if (n.fuse <= 0) { this.detonate(n); this.nades.splice(i, 1); }
    }
    // fogo da termobarica: queima quem fica dentro (dono e aliados nao)
    for (const z of this.burns || []) {
      z.t -= dt; const owner = this.players.get(z.owner);
      for (const v of this.players.values()) { if (!v.alive || (owner && v.id !== z.owner && !this.enemies(owner, v)) || v.id === z.owner) continue; if (Math.hypot(v.pos[0] - z.pos[0], v.pos[2] - z.pos[2]) < NADES.thermo.burnR && Math.abs(v.pos[1] - z.pos[1]) < 2) this.damage(v, owner || v, NADES.thermo.burnDps * dt, 'thermo', false, true); }
    }
    if (this.burns) this.burns = this.burns.filter(z => z.t > 0);
    if (this.smokes) { for (const z of this.smokes) z.t -= dt; this.smokes = this.smokes.filter(z => z.t > 0); }
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
      if (list.length) this.event({ k: 'anvilWarn', list: list.map(q => this.anvilLand(q)) });
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
      this.blastCars(n.pos, R + 1.5, 260, owner);
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
    } else if (n.kind === 'thermo') {
      const T = NADES.thermo;
      this.event({ k: 'thermo', pos: n.pos, owner: n.owner, dur: T.burn });
      this.blastCars(n.pos, T.radius + 1.5, 200, owner);
      for (const v of this.players.values()) {
        if (!v.alive) continue;
        const c = [v.pos[0], v.pos[1] + 0.9, v.pos[2]], d = Math.sqrt(dist2(c, n.pos));
        if (d > T.radius || !hasLOS(this.M, [n.pos[0], n.pos[1] + 0.3, n.pos[2]], c)) continue;
        if (v.id !== n.owner && owner && !this.enemies(owner, v)) continue;
        this.damage(v, owner || v, (T.dmg * (1 - d / T.radius) + 10) * (v.id === n.owner ? 0.5 : 1), 'thermo', false);
      }
      (this.burns ||= []).push({ pos: [n.pos[0], floorAt(this.M, n.pos[0], n.pos[2]), n.pos[2]], t: T.burn, owner: n.owner });
    } else if (n.kind === 'smoke') {
      (this.smokes ||= []).push({ pos: [...n.pos], t: NADES.smoke.time });
      this.event({ k: 'smoke', pos: n.pos, dur: NADES.smoke.time });
      for (const v of this.players.values()) if (v.bot && v.ai && Math.hypot(v.pos[0] - n.pos[0], v.pos[2] - n.pos[2]) < NADES.smoke.radius + 6) v.ai.target = null; // bot perto perde o alvo
    } else if (n.kind === 'tomahawk') {
      // so some (o acerto e no voo; pegar de volta e no tickNades)
    } else if (n.kind === 'beacon') { // sinalizador: fica no chao (um por jogador); renasce ali ate destruirem
      if (!owner) return;
      this.blimps = this.blimps.filter(b => !(b.kind === 'beacon' && b.owner === owner.id));
      const y = floorAt(this.M, n.pos[0], n.pos[2]);
      this.blimps.push({ id: this.blimpSeq = (this.blimpSeq || 0) + 1, kind: 'beacon', owner: owner.id, team: owner.team, t: 1e9, hp: NADES.beacon.hp, maxHp: NADES.beacon.hp, pos: [n.pos[0], Number.isFinite(y) ? y : n.pos[1], n.pos[2]], botT: 0 });
      this.event({ k: 'beacon', id: owner.id, pos: n.pos });
    } else if (n.kind === 'ammobox') {
      if (owner) abxDrop(this, owner, n.pos);
    } else {
      this.event({ k: 'flash', pos: n.pos, owner: n.owner });
      for (const v of this.players.values()) {
        if (!v.alive || !v.bot) continue;
        const d = Math.sqrt(dist2(v.pos, n.pos));
        if (d < 15 && hasLOS(this.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], n.pos)) { v.ai.blind = 3.2 * (1 - d / 15) + 0.6; v.ai.target = null; }
      }
    }
  }

  // gadgets: tanque do lanca-chamas enche depois de 1 s parado; cartucho da escopetinha volta sozinho
  tickGadgets(dt) {
    const F = GADGETS.gd_flame, S = GADGETS.gd_shot;
    for (const p of this.players.values()) {
      if (p.flameFuel != null && p.flameFuel < F.fuel && (p.flameIdle = (p.flameIdle || 0) + dt) > 1) p.flameFuel = Math.min(F.fuel, p.flameFuel + F.regen * dt * 2);
      if (p.ubShells != null && p.ubShells < S.shells && (p.ubT = (p.ubT || 0) + dt) >= S.refill) { p.ubT = 0; p.ubShells++; }
    }
  }

  // ---------- Bazuca (03/11, pedido dele) ----------
  fireRocket(p, d) {
    const S = STREAKS.rpg;
    p.rpgLeft--; p.protUntil = 0;
    const pos = [p.pos[0] + d[0] * 0.9, p.pos[1] + 1.45 + d[1] * 0.9, p.pos[2] + d[2] * 0.9];
    this.rockets.push({ id: this.seq++, owner: p.id, pos, d, t: S.life });
    this.event({ k: 'rocketOut', id: p.id, pos });
    if (p.rpgLeft <= 0) p.rpgTake = 0.7; // ultimo foguete: a bazuca some da mao logo depois
  }
  tickRockets(dt) {
    const S = STREAKS.rpg;
    for (const p of this.players.values()) {
      if (p.rpgTake > 0 && (p.rpgTake -= dt) <= 0) { p.owned.delete('rpg'); p.rpgLeft = 0; if (p.wpn === 'rpg') p.wpn = p.owned.has(p.rpgPrev) ? p.rpgPrev : [...p.owned][0] || 'melee'; this.event({ k: 'take', id: p.id, wpn: 'rpg' }); }
      // bot com bazuca: mira no alvo que esta vendo e dispara (um foguete a cada 1,4 s)
      if (p.bot && p.alive && p.rpgLeft > 0 && (p.rpgAim = (p.rpgAim || 0) - dt) <= 0) {
        const t = p.ai?.target && this.players.get(p.ai.target);
        if (t?.alive) { const e = [p.pos[0], p.pos[1] + 1.45, p.pos[2]], c = [t.pos[0], t.pos[1] + 0.9, t.pos[2]]; if (hasLOS(this.M, e, c)) { this.fireRocket(p, norm([c[0] - e[0], c[1] - e[1], c[2] - e[2]])); p.rpgAim = 1.4; } }
      }
    }
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i], step = S.speed * dt;
      r.t -= dt;
      let end = step, victim = null;
      const hit = raycast(this.M, r.pos, r.d, step);
      if (hit.dist !== Infinity) end = hit.dist;
      // boneco no caminho (antes da parede): o mais perto ao longo do trecho
      const owner = this.players.get(r.owner);
      for (const v of this.players.values()) {
        if (!v.alive || v.id === r.owner || (owner && !this.enemies(owner, v))) continue;
        const c = [v.pos[0] - r.pos[0], v.pos[1] + 0.9 - r.pos[1], v.pos[2] - r.pos[2]];
        const along = c[0] * r.d[0] + c[1] * r.d[1] + c[2] * r.d[2];
        if (along < -0.5 || along > end + 0.5) continue;
        const off = Math.hypot(c[0] - r.d[0] * along, (c[1] - r.d[1] * along) * 0.6, c[2] - r.d[2] * along); // corpo e mais alto que largo
        if (off < 0.75) { end = Math.max(0, along); victim = v; }
      }
      r.pos = [r.pos[0] + r.d[0] * end, r.pos[1] + r.d[1] * end, r.pos[2] + r.d[2] * end];
      if (victim || end < step || r.t <= 0) { this.rockets.splice(i, 1); this.rocketBoom(r, victim); }
    }
  }
  // explosao perto do carro inimigo (04/11): dano pela distancia ate a lataria
  blastCars(at, R, dmg, owner) {
    for (const car of this.cars || []) {
      if (car.deadT > 0 || (owner && owner.team === car.team)) continue;
      const d = Math.max(0, Math.hypot(car.pos[0] - at[0], car.pos[1] + 0.9 - at[1], car.pos[2] - at[2]) - 1.2);
      if (d < R) carDamage(this, car, dmg * (1 - d / R), owner);
    }
  }
  rocketBoom(r, victim) {
    const S = STREAKS.rpg, owner = this.players.get(r.owner);
    this.event({ k: 'rocketBoom', pos: r.pos, owner: r.owner, direct: victim?.id });
    this.blastCars(r.pos, S.radius + 1.5, 520, owner); // bazuca no carro: quase explode de uma vez
    if (victim?.alive && !this.over) this.kill(victim, owner || victim, 'rpg', false); // acerto direto: derruba na hora
    for (const v of this.players.values()) {
      if (!v.alive || v === victim) continue;
      const c = [v.pos[0], v.pos[1] + 0.9, v.pos[2]], d = Math.sqrt(dist2(c, r.pos));
      if (d > S.radius || !hasLOS(this.M, [r.pos[0], r.pos[1] + 0.3, r.pos[2]], c)) continue;
      let dmg = S.dmg * (1 - (d / S.radius) ** 2) + 20; // queda quadratica (04/11): o miolo da explosao segura o dano
      if (v.id === r.owner) dmg *= 0.4; // a propria explosao doi menos
      else if (owner && !this.enemies(owner, v)) continue;
      this.damage(v, owner || v, dmg, 'rpg', false);
    }
  }

  // bigorna (07/11): cai do ceu e para na 1a superficie (telhado, laje, chao) -> [x, y, z] com a altura onde parou
  anvilLand(pos) {
    const SKY = 60, hit = raycast(this.M, [pos[0], SKY, pos[2]], [0, -1, 0], SKY + 1);
    return [pos[0], Number.isFinite(hit.dist) ? Math.max(0, SKY - hit.dist) : 0, pos[2]];
  }

  // ---------- sequencias de abates ----------
  // uma sequencia no ar por vez na sala: enquanto dirigivel/radar/bigornas/torta estiverem ativos (e mais
  // STREAK_GAP s depois), ninguem chama outra. A sequencia fica guardada e o jogador ve o que esta no ar.
  streakLock() {
    // radar fica fora da fila (regra dele 30/10): nao trava nem e travado; chamar de novo so estende
    // bigorna e torta tambem sairam da fila (01/11): so o dirigivel no ar trava
    const air = this.blimps.filter(b => b.kind !== 'sentry' && b.kind !== 'beacon'); // sentinela no chao nao trava a sala
    if (air.length) return { kind: air[0].kind || 'blimp', t: Math.max(...air.map(b => b.t)) + STREAK_GAP };
    return this.streakGap > 0 ? { kind: 'gap', t: this.streakGap } : null;
  }
  // algum jogador (gente, vivo) com sequencia que trava a sala guardada
  humanStreakWaiting() {
    for (const o of this.players.values()) if (!o.bot && o.alive && o.ready?.some(k => !STREAK_FREE.includes(k) && k !== 'uav')) return true;
    return false;
  }

  useStreak(p, kind) {
    if (this.bor) return; // Noite dos Borroes (PvE): sem sequencias (pedido dele 03/11)
    const i = p.ready.indexOf(kind);
    if (i < 0) return;
    // 09/11 (pedido dele, contra flood): 1 s entre uma chamada e a proxima do mesmo jogador
    if ((this.clock || 0) - (p.streakCallAt ?? -99) < STREAK_CALL_GAP) { if (!p.bot) this.send(p.id, { t: 'ev', k: 'streakWait', kind: 'gap', n: 1 }); return; }
    p.streakCallAt = this.clock || 0;
    if (kind === 'uav') {
      p.ready.splice(i, 1);
      const mine = this.uavs.find(u => (this.cfg.teams ? u.team === p.team : u.owner === p.id) && this.players.has(u.owner));
      if (mine) mine.t += STREAKS.uav.time; // ja tem radar no ar: soma o tempo
      else this.uavs.push({ owner: p.id, team: p.team, t: STREAKS.uav.time });
      this.event({ k: 'streak', id: p.id, kind, team: p.team, bn: this.bnOf(p) });
      return;
    }
    // Canyon Poeira (04/11, pedido dele): cabem dois baloes bombardeiros no ar; o segundo nao espera a fila (reta separada em strikes.js)
    const twoBomb = kind === 'bomber' && this.M.id === 'deserto' && this.blimps.filter(b => b.kind === 'bomber').length === 1;
    const lock = STREAK_FREE.includes(kind) || twoBomb ? null : this.streakLock();
    if (lock) { if (!p.bot) this.send(p.id, { t: 'ev', k: 'streakWait', kind: lock.kind, n: Math.ceil(lock.t) }); return; }
    // vez dos jogadores (03/11, pedido dele): bot so pega a sala se nenhum jogador tem sequencia guardada, ou se o
    // jogador deixou passar BOT_YIELD s com a sala livre (ai o bot tambem puxa). A sequencia do bot fica guardada
    if (p.bot && !STREAK_FREE.includes(kind) && this.humanStreakWaiting() && (this.botYield ?? BOT_YIELD) > 0) return;
    p.ready.splice(i, 1);
    if (kind === 'blimp' || kind === 'bomber') this.streakGap = STREAK_GAP;
    const A = this.M.arena;
    if (kind === 'anvil') {
      const targets = [...this.players.values()].filter(o => o.alive && !o.inRing && this.enemies(p, o) && !hasSkill(o, 'fantasma')).slice(0, 7); // Fantasma: a bigorna nao acha
      const list = targets.map(o => [o.pos[0] + rnd(-1.2, 1.2), 0, o.pos[2] + rnd(-1.2, 1.2)]);
      if (!list.length) list.push([rnd(-A / 2, A / 2), 0, rnd(-A / 2, A / 2)]);
      for (const pos of list) this.anvils.push({ owner: p.id, pos, t: 1.7 + rnd(0, 0.5), streak: true });
      this.event({ k: 'anvilWarn', list: list.map(q => this.anvilLand(q)) });
    }
    if (kind === 'rpg') { if (p.wpn !== 'rpg') p.rpgPrev = p.wpn; p.owned.add('rpg'); p.rpgLeft = STREAKS.rpg.shots; p.rpgAim = 0; this.event({ k: 'give', id: p.id, wpn: 'rpg', force: true }); }
    if (kind === 'milk') { p.hp = p.maxHp || 100; p.armor = Math.max(p.armor || 0, STREAKS.milk.armor); } // Leite Turbinado: vida cheia + colete
    if (kind === 'talc') { const mine = this.talcs.find(u => (this.cfg.teams ? u.team === p.team : u.owner === p.id)); if (mine) mine.t += STREAKS.talc.time; else this.talcs.push({ owner: p.id, team: p.team, t: STREAKS.talc.time }); }
    if (kind === 'anvline') {
      // Linha de Bigornas: reta que passa pelo meio dos inimigos vivos (ou pelo centro), na direcao em que eles estao mais espalhados
      const en = [...this.players.values()].filter(o => o.alive && !o.inRing && this.enemies(p, o) && !hasSkill(o, 'fantasma'));
      const cx = en.length ? en.reduce((s, o) => s + o.pos[0], 0) / en.length : rnd(-A / 3, A / 3), cz = en.length ? en.reduce((s, o) => s + o.pos[2], 0) / en.length : rnd(-A / 3, A / 3);
      let ang = rnd(0, Math.PI);
      if (en.length > 1) { let sxx = 0, szz = 0, sxz = 0; for (const o of en) { const dx = o.pos[0] - cx, dz = o.pos[2] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; } ang = 0.5 * Math.atan2(2 * sxz, sxx - szz); }
      const S = STREAKS.anvline, list = [];
      for (let j = 0; j < S.n; j++) { const off = (j - (S.n - 1) / 2) * S.gap, x = cx + Math.cos(ang) * off + rnd(-0.8, 0.8), z = cz + Math.sin(ang) * off + rnd(-0.8, 0.8); if (Math.abs(x) < A - 1 && Math.abs(z) < A - 1) list.push([x, 0, z]); }
      list.forEach((pos, j) => this.anvils.push({ owner: p.id, pos, t: 1.6 + j * 0.12, streak: true })); // cai em sequencia, de uma ponta a outra
      this.event({ k: 'anvilWarn', list: list.map(q => this.anvilLand(q)) });
    }
    strikeUse(this, p, kind); // Biplano, Trem, Balao Bombardeiro, Mao do Animador
    if (kind === 'sentry') { // 1,3 m na frente (se a parede deixar), no chao de quem chamou
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), eye = [p.pos[0], p.pos[1] + 1, p.pos[2]], at = [p.pos[0] + fx * 1.3, p.pos[1], p.pos[2] + fz * 1.3];
      const pos = hasLOS(this.M, eye, [at[0], at[1] + 1, at[2]]) ? at : [...p.pos];
      this.blimps.push({ id: this.blimpSeq = (this.blimpSeq || 0) + 1, kind: 'sentry', owner: p.id, team: p.team, t: STREAKS.sentry.time, hp: STREAKS.sentry.hp, pos, yaw: p.yaw, fireT: 1, botT: 0 });
      this.event({ k: 'streak', id: p.id, kind, team: p.team, bn: this.bnOf(p) });
      return;
    }
    if (kind === 'blimp') this.blimps.push({ id: this.blimpSeq = (this.blimpSeq || 0) + 1, owner: p.id, team: p.team, t: STREAKS.blimp.time, hp: STREAKS.blimp.hp, ang: rnd(0, 6.28), fireT: 1, pos: [0, 28, 0] });
    if (kind === 'nuke') this.nukes.push({ owner: p.id, t: STREAKS.nuke.delay });
    this.event({ k: 'streak', id: p.id, kind, team: p.team, bn: this.bnOf(p), delay: kind === 'nuke' ? STREAKS.nuke.delay : undefined });
  }

  tickStreaks(dt) {
    // intervalo entre sequencias: so comeca a contar quando a do ar acaba
    // 05/11: sentinela e sinalizador ficam no chao e nao travam a sala; contavam aqui e o contador parava em 4 s ate eles sumirem
    if (this.blimps.some(b => b.kind !== 'sentry' && b.kind !== 'beacon')) this.streakGap = STREAK_GAP;
    else if (this.streakGap > 0) this.streakGap -= dt;
    // folga dos jogadores: sala livre + jogador com sequencia guardada = o relogio do bot corre; senao volta ao inicio
    if (!this.streakLock() && this.humanStreakWaiting()) this.botYield = (this.botYield ?? BOT_YIELD) - dt; else this.botYield = BOT_YIELD;
    // bot com sequencia guardada chama assim que a sala libera (um por vez)
    if (!this.over) {
      const livre = !this.streakLock();
      const pick = (o) => o.ready.find(k => STREAK_FREE.includes(k)) || (livre ? o.ready[0] : null);
      const b = [...this.players.values()].find(o => o.bot && o.alive && pick(o));
      if (b) this.useStreak(b, pick(b));
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
    for (const u of this.talcs) u.t -= dt;
    this.talcs = this.talcs.filter(u => u.t > 0 && this.players.has(u.owner));
    this.uavs = this.uavs.filter(u => u.t > 0 && this.players.has(u.owner));
    for (let i = this.anvils.length - 1; i >= 0; i--) {
      const a = this.anvils[i];
      a.t -= dt;
      if (a.t > 0) continue;
      this.anvils.splice(i, 1);
      const owner = this.players.get(a.owner);
      // 07/11 (pedido dele): a bigorna cai do CEU e para na 1a coisa que encontra (telhado, laje, chao); quem esta debaixo
      // de teto nao leva (antes passava pelo telhado e a Linha de Bigornas pegava quem estava dentro do banco)
      const SKY = 60; a.pos = this.anvilLand(a.pos); const landY = a.pos[1];
      this.event({ k: 'anvil', pos: a.pos });
      for (const v of this.players.values()) {
        if (!v.alive || (owner && !this.enemies(owner, v) && v !== owner)) continue;
        const d = Math.hypot(v.pos[0] - a.pos[0], v.pos[2] - a.pos[2]);
        if (d >= 3.4 || Math.abs(v.pos[1] - landY) > 3) continue;
        if (Number.isFinite(raycast(this.M, [v.pos[0], v.pos[1] + 1.75, v.pos[2]], [0, 1, 0], SKY).dist)) continue; // teto em cima da cabeca: protegido
        this.damage(v, owner || v, 260 * (1 - d / 4.5), 'anvil', false);
      }
    }
    const A = this.M.arena;
    strikeTick(this, dt);
    for (const b of this.blimps) {
      b.t -= dt;
      if (b.kind === 'bomber') { tickBomber(this, b, dt); continue; }
      if (b.kind === 'sentry') { this.tickSentry(b, dt); continue; }
      if (b.kind === 'beacon') { this.tickBeacon(b, dt); continue; }
      b.ang += dt * 0.18;
      b.pos = [Math.cos(b.ang) * A * 0.45, 28, Math.sin(b.ang) * A * 0.45];
      b.fireT -= dt;
      const owner = this.players.get(b.owner);
      if (b.fireT > 0 || !owner) continue;
      b.fireT = 0.55;
      let best = null, bd = 1e9;
      for (const v of this.players.values()) {
        if (!v.alive || !this.enemies(owner, v) || hasSkill(v, 'fantasma')) continue; // Fantasma: o dirigivel nao enxerga
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

  // sinalizador: bot inimigo que ve atira nele (o dono sumiu = some junto)
  tickBeacon(b, dt) {
    const owner = this.players.get(b.owner); if (!owner) { b.t = 0; return; }
    if ((b.botT -= dt) > 0) return; b.botT = 0.5;
    const at = [b.pos[0], b.pos[1] + 0.4, b.pos[2]];
    for (const v of this.players.values()) {
      if (!v.bot || !v.alive || !this.enemies(owner, v) || dist2(v.pos, at) > 20 * 20 || !hasLOS(this.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], at)) continue;
      this.event({ k: 'shot', id: v.id, o: [v.pos[0], v.pos[1] + 1.4, v.pos[2]], e: at, wpn: v.wpn });
      if ((b.hp -= 15) <= 0) { b.t = 0; this.event({ k: 'blimpDown', id: v.id, owner: b.owner, pos: at, sentry: 1, beacon: 1 }); }
      return;
    }
  }

  // sentinela: gira pro inimigo mais perto que ela enxerga e atira; bot inimigo que ve ela atira de volta
  tickSentry(b, dt) {
    const S = STREAKS.sentry, owner = this.players.get(b.owner); if (!owner) { b.t = 0; return; }
    const head = [b.pos[0], b.pos[1] + 1.25, b.pos[2]];
    let best = null, bd = S.range * S.range;
    for (const v of this.players.values()) {
      if (!v.alive || v.inRing || !this.enemies(owner, v) || hasSkill(v, 'fantasma')) continue; // Fantasma: a sentinela nao enxerga
      const c = [v.pos[0], v.pos[1] + 1.1, v.pos[2]], d = dist2(c, head);
      if (d < bd && hasLOS(this.M, head, c)) { bd = d; best = v; }
      // bot inimigo perto que ve a torreta: atira nela (cerca de 22 de dano por segundo cada)
      if (v.bot && d < 26 * 26 && (b.botT -= dt) <= 0 && hasLOS(this.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], head)) {
        b.botT = 0.35; const dmg = 8;
        this.event({ k: 'shot', id: v.id, o: [v.pos[0], v.pos[1] + 1.4, v.pos[2]], e: head, wpn: v.wpn });
        b.hp -= dmg;
        if (b.hp <= 0) { b.t = 0; this.event({ k: 'blimpDown', id: v.id, owner: b.owner, pos: head, sentry: 1 }); return; }
      }
    }
    if (best) b.yaw = Math.atan2(-(best.pos[0] - b.pos[0]), -(best.pos[2] - b.pos[2]));
    b.fireT -= dt;
    if (!best || b.fireT > 0) return;
    b.fireT = S.rate;
    const hitIt = Math.random() < S.hit;
    const e = [best.pos[0] + (hitIt ? 0 : rnd(-1.5, 1.5)), best.pos[1] + 1, best.pos[2] + (hitIt ? 0 : rnd(-1.5, 1.5))];
    this.event({ k: 'shot', id: 'sentry', o: head, e, wpn: 'smg' });
    if (hitIt) this.damage(best, owner, S.dmg, 'sentry', false);
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

  // bandeira extra (04/11, pedido dele): no meio da partida nasce a D num ponto aberto longe das 3; vale 2,5x mais e
  // fica 75 s. Lugar = ponto de item no chao (sempre alcancavel) mais longe das zonas e perto do meio do mapa
  domBonusTick(dt) {
    const B = this.domBonus;
    if (!B) {
      const half = Math.max(this.teamScore.red, this.teamScore.blue) >= this.limit * 0.35 || (this.timeLimit > 0 && this.time <= this.timeLimit * 0.6);
      if (!half || this.domBonusDone || this.over) return;
      let best = null, bs = -1e9;
      for (const pk of this.M.pickups) { const dz = Math.min(...this.zones.map(z => Math.hypot(pk.pos[0] - z.pos[0], pk.pos[2] - z.pos[2]))); const sc = dz - Math.hypot(pk.pos[0], pk.pos[2]) * 0.35 - (pk.pos[1] > 1 ? 60 : 0); /* chao primeiro (item em cima de telhado/torre virava zona inalcancavel) */ if (dz > 5 && sc + (dz > 9 ? 20 : 0) > bs) { bs = sc + (dz > 9 ? 20 : 0); best = pk.pos; } }
      if (!best) { this.domBonusDone = true; return; }
      this.domBonusDone = true;
      const z = { id: 'D', pos: [best[0], best[1], best[2]], r: 4, owner: null, prog: 0, bonus: 1 };
      this.zones.push(z); this.domBonus = { z, t: 75 };
      this.event({ k: 'zoneBonus', on: 1, pos: z.pos });
      return;
    }
    B.t -= dt;
    if (B.t <= 0) { this.zones = this.zones.filter(z => z !== B.z); this.domBonus = null; this.event({ k: 'zoneBonus', on: 0 }); }
  }

  tickDOM(dt) {
    this.domBonusTick(dt);
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
      if (z.owner) this.teamScore[z.owner] += dt * DOM_RATE * (z.bonus ? 2.5 : 1); // 02/11: 1 ponto/s por zona fechava em 50 s
    }
    for (const t of ['red', 'blue']) if (this.teamScore[t] >= this.limit) { this.teamScore[t] = this.limit; this.end(t); }
  }

  end(winner) {
    if (this.over) return;
    // partida de fundo do menu (08/11): nunca acaba. Antes a cada ~4 min um bot fechava 20 abates, a partida acabava e todo mundo
    // congelava 27 s (com o balao parado no ceu) ate o reset. Agora so zera o placar e o relogio e segue rolando
    if (this.endless) { for (const p of this.players.values()) { p.kills = 0; p.score = 0; } this.teamScore = { red: 0, blue: 0 }; this.time = Math.max(this.time, 300); return; }
    // 05/11 (pedido dele): camera da ultima morte -> podio dos 3 melhores -> sala com lobby volta sozinha e mostra o placar la; sala
    // sem lobby ainda mostra o placar antes da proxima
    this.over = true; this.overT = this.useLobby ? OVER_LOBBY : OVER_NEXT;
    this.top3 = [...this.players.values()].filter(p => !p.mob).sort((a, b) => b.score - a.score || b.kills - a.kills).slice(0, 3).map(p => p.id);
    this.event({ k: 'end', winner, top: this.top3 });
  }

  // ---------- bots ----------
  tickBot(p, dt) {
    const ai = p.ai, M = this.M;
    if (p.air) {
      const fl = floorAt(M, p.pos[0], p.pos[2]);
      // igual ao jogador com o paraquedas automatico: queda livre e abre perto do chao (abria la em cima e
      // descia 14 s devagar); e cai no PROPRIO ponto sorteado (ia todo mundo pro meio da iris e caia junto)
      if (p.pos[1] - fl < 22) p.chute = true;
      p.vel[1] = Math.max(p.vel[1] - 24 * dt, -(p.chute ? BR.bounce.chute : BR.bounce.freefall));
      const at = p.dropAt || [p.pos[0], p.pos[2]], tx = at[0] - p.pos[0], tz = at[1] - p.pos[2], tl = Math.hypot(tx, tz) || 1;
      const sp = tl > 1.5 ? Math.min(BR.bounce.airSpeed, tl) : 0;
      p.vel[0] += ((tx / tl) * sp - p.vel[0]) * Math.min(1, 2 * dt); p.vel[2] += ((tz / tl) * sp - p.vel[2]) * Math.min(1, 2 * dt);
      p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, 1.7);
      p.anim = p.chute ? 'chute' : 'fall';
      if (p.onGround) { p.air = false; p.chute = false; p.drop = 0; p.dropAt = null; ai.path = null; ai.think = 0; ai.react = Math.min(ai.react || 0, 0.2); } // pousou: ja age
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
        if (!!p.inRing !== !!o.inRing) continue; // ringue (01/11): quem luta so ve o adversario; quem esta fora nao mira em quem luta (corriam pra corda e ficavam pulando)
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
      ai.goal = this.spreadGoal(p, this.canyonGoal(p, this.objRoute(p, this.botGoal(p))));
    }
    const w = WEAPONS[p.wpn];
    // papel fixo de cada bot (01/11, pedido dele: movimento mais tatico e previsivel): 0 = ponta (chega perto,
    // desliza pra dentro da briga), 1 = flanco (meia distancia, dança de lado), 2 = ancora (fica longe, agacha e segura)
    const role = ai.role ??= (p.id.charCodeAt(p.id.length - 1) + p.id.length) % 3;
    ai.slideCd = (ai.slideCd || 0) - dt; ai.hurtT = (ai.hurtT || 0) - dt;
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
      const ideal = (WEAPONS[p.wpn]?.melee ? 0.8 : p.wpn === 'shotgun' ? 6 : p.wpn === 'sniper' ? 30 : 14) * (role === 0 ? 0.65 : role === 2 ? 1.35 : 1);
      let adv = d > ideal + 3 ? 1 : d < ideal - 3 ? -0.6 : 0;
      // ancora na distancia certa: para, agacha e atira (fica parado de proposito, da pra prever e flanquear)
      ai.crouch = role === 2 && !adv && d > 12 && !WEAPONS[p.wpn]?.melee && ai.reloadT <= 0 && !ai.rescue && !['ctf', 'dom', 'escort', 'bomb', 'heist', 'smuggle'].includes(this.mode); // modo de objetivo: anda sempre
      // contra quem esta de lamina (infectado): recua atirando, nunca deixa encostar
      if (WEAPONS[t.wpn]?.melee && !WEAPONS[p.wpn]?.melee) adv = d < 9 ? -1 : d > 16 ? 0.4 : 0;
      const sw = role === 2 ? 0.25 : role === 1 ? 1 : 0.7; // quanto cada papel dança de lado
      moveDir = ai.crouch ? null : [fx * adv - fz * ai.strafe * 0.8 * sw, fz * adv + fx * ai.strafe * 0.8 * sw];
      // deslize: ao avistar alguem andando rapido (mais o ponta), ou o ponta fechando distancia. Uma vez a cada uns segundos
      const hsNow = Math.hypot(p.vel[0], p.vel[2]);
      if (p.onGround && ai.slideCd <= 0 && hsNow > 5.5 && !WEAPONS[p.wpn]?.melee && d > 5 && d < 26 &&
        ((ai.onT < 0.3 && Math.random() < (role === 0 ? 0.55 : 0.2)) || (role === 0 && adv > 0 && Math.random() < dt * 0.5))) {
        ai.slideT = 0.6; ai.slideCd = rnd(3.5, 6); ai.slideDir = [p.vel[0] / hsNow, p.vel[2] / hsNow];
      }
      // de lamina nao tem por que dancar de lado: vai reto ate encostar
      // para a 1,8 m (o soco alcanca 2,3) e recua se encostar: andava ate 0,7 e o objetivo puxava pra dentro do outro,
      // os dois do ringue ficavam um dentro do outro tremendo (01/11)
      if (WEAPONS[p.wpn]?.melee) { moveDir = d > 1.8 ? [fx, fz] : d < 1.3 ? [-fx * 0.7, -fz * 0.7] : null; ai.closeIn = true; }
      // machucado: corre pra cobertura atirando de lado
      else if (ai.cover && Math.hypot(ai.cover[0] - p.pos[0], ai.cover[2] - p.pos[2]) > 1) {
        const g = this.botSteer(p, ai.cover, dt);
        if (g) moveDir = [g[0] - fz * ai.strafe * 0.3, g[1] + fx * ai.strafe * 0.3];
      }
      if (ai.goal && (this.mode === 'ctf' || this.mode === 'dom' || this.mode === 'escort' || this.heist || ai.rescue) && d > 5) {
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
      // tatica do bot (04/11): flash ou fumaca de vez em quando, perto do alvo
      if ((ai.tacT = (ai.tacT ?? rnd(6, 14)) - dt) <= 0 && this.skill.nades && p.nades.flash > 0 && d > 7 && d < 22 && !this.over) {
        ai.tacT = rnd(14, 26); p.nades.flash--; p.botTac ||= Math.random() < 0.5 ? 'flash' : 'smoke';
        this.throwNade(p, p.botTac, norm([fx, 0.2 + d * 0.012, fz]));
      }
      if (ai.nadeT <= 0 && this.skill.nades && p.nades.frag > 0 && d > 9 && d < 24 && !this.over) {
        ai.nadeT = rnd(8, 16); p.nades.frag--;
        const up = 0.25 + d * 0.012;
        p.botLethal ||= Math.random() < 0.6 ? 'frag' : 'thermo'; // bot sorteia a sua (nunca machadinha)
        this.throwNade(p, p.botLethal, norm([fx, up, fz]));
        const n = this.nades[this.nades.length - 1];
        const sp = Math.min(19, 6 + d * 0.55);
        n.vel = [fx * sp, up * sp + 3, fz * sp];
      } else if (ai.react <= 0 && facing && ai.fireT <= 0 && ai.pauseT <= 0 && !this.over && ai.reloadT <= 0 && ai.mag > 0 && !(this.heist?.kind === 'smuggle' && carryingBag(this, p))) { // com o caixote nas maos nao atira
        ai.mag--;
        ai.fireT = w.rate * this.skill.rate + (p.wpn === 'sniper' ? 0.8 : 0);
        this.botShoot(p, t, d);
        // atira em rajadas e respira entre elas (quanto mais facil, mais curta e mais pausa)
        if (!(ai.burstLeft > 0)) ai.burstLeft = Math.round(rnd(...this.skill.burst));
        if (--ai.burstLeft <= 0) ai.pauseT = rnd(...this.skill.pause);
      }
    } else if (ai.reloadT <= 0 && ai.mag < w.mag * 0.5 && ai.mag < w.mag) this.botReload(p);
    const holdMelee = t && ai.closeIn; ai.closeIn = false; // no alcance do soco: fica onde esta (nao volta pro objetivo)
    if (!moveDir && ai.goal && !holdMelee) {
      const d = Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]);
      const g = d > 1.5 ? this.botSteer(p, ai.goal, dt) : null;
      if (g) { moveDir = g; if (!t) { wantYaw = Math.atan2(-g[0], -g[1]); p.pitch *= 0.9; } sprint = !t && ai.blind <= 0; }
    }
    // ancora sem alvo: ao chegar num ponto da patrulha segura o angulo uns segundos, varrendo devagar
    if (!t) ai.crouch = false;
    if (!t && ai.holdT > 0 && !p.using) { ai.holdT -= dt; moveDir = null; ai.holdYaw ??= p.yaw; wantYaw = ai.holdYaw + Math.sin(ai.holdT * 1.3) * 0.6; ai.crouch = true; }
    else ai.holdYaw = null;
    if (ai.departT > 0) { ai.departT -= dt; if (!t) moveDir = null; } // acabou de nascer: sai na sua vez
    // nada de bolo: colega a menos de 6 m empurra pro lado (cada um segue sua rota; 3,5 m deixava a fila indiana)
    if (moveDir && !p.using) {
      let sx = 0, sz = 0;
      for (const o of this.players.values()) {
        if (o === p || !o.alive || this.enemies(p, o)) continue;
        const ox = p.pos[0] - o.pos[0], oz = p.pos[2] - o.pos[2], od = Math.hypot(ox, oz);
        if (od < 6 && od > 0.01) { const k = (6 - od) / 6; sx += ox / od * k; sz += oz / od * k; }
      }
      if (sx || sz) moveDir = [moveDir[0] + sx * 1.5, moveDir[1] + sz * 1.5];
      const ml = Math.hypot(moveDir[0], moveDir[1]); if (ml > 1) moveDir = [moveDir[0] / ml, moveDir[1] / ml];
    }
    if (p.using) moveDir = null;
    if (ai.blind > 0) wantYaw = p.yaw + Math.sin(ai.blind * 6) * 0.5;
    p.yaw += clampA(angDiff(p.yaw, wantYaw), (t ? this.skill.turn : 5) * dt);

    let speed = sprint ? 9.3 : ai.blind > 0 ? 3 : 6.4; // acompanha o jogador mais lento (01/11)
    if (WEAPONS[p.wpn]?.moveK) speed *= sprint ? WEAPONS[p.wpn].runK : WEAPONS[p.wpn].moveK; // bot com Metralhadora pesa igual
    if (this.mode === 'infect' && p.team === 'red') speed *= INFECT.speed;
    if (this.heist?.kind === 'smuggle' && carryingBag(this, p)) { speed = Math.min(speed, 6.4) * heistCfg(this.heist).carrySlow; heistBotPass(this, p); } // caixote pesado: lento (e passa quando der)
    const ground = p.onGround;
    const acc = ground ? 12 : 3;
    if (ai.crouch) speed = 0;
    // duto do banco (03/11): teto baixo aqui ou ainda sem altura pra levantar = anda agachado, devagar, sem pular
    ai.duck = lowAt(M, p.pos[0], p.pos[2]) || !headroom(M, p.pos, 0.4, 1.7);
    if (ai.duck) speed = Math.min(speed, 3.4);
    // enroscado: anda um tico pra uma celula livre perto (escada de destrave, abaixo)
    if (ai.unstickT > 0) { ai.unstickT -= dt; moveDir = ai.unstick; }
    const tx = moveDir ? moveDir[0] * speed : 0, tz = moveDir ? moveDir[1] * speed : 0;
    if (ai.slideT > 0 && ground) { // deslize: embalo que perde forca, sem virar
      ai.slideT -= dt; const sp = 5 + 7.5 * Math.max(0, ai.slideT / 0.6);
      p.vel[0] = ai.slideDir[0] * sp; p.vel[2] = ai.slideDir[1] * sp;
    } else {
      if (!ground) ai.slideT = 0;
      p.vel[0] += (tx - p.vel[0]) * Math.min(1, acc * dt);
      p.vel[2] += (tz - p.vel[2]) * Math.min(1, acc * dt);
    }
    p.vel[1] -= 24 * (EV(this.mut)?.grav || 1) * dt;
    ai.stuckT += dt;
    if (ai.stuckT > 0.6) {
      const moved = Math.hypot(p.pos[0] - ai.last[0], p.pos[2] - ai.last[2]);
      // destrave em escada (03/11, pedido dele: bot preso em quina/hitbox): 1-2) pula e troca de lado; 3-5) anda
      // 0,7 s pra uma celula livre perto; 6) empurra o corpo pra ela (ultimo recurso, no maximo ~4 m)
      if (moveDir && moved < 1.2 && ground) {
        ai.stuckN = (ai.stuckN || 0) + 1;
        if (!ai.duck) p.vel[1] = 7.2;
        ai.strafe *= -1; ai.t = 1; ai.path = null;
        const q = ai.stuckN >= 3 ? freeNear(M, p.pos) : null;
        if (q && ai.stuckN >= 6) { p.pos[0] = q[0]; p.pos[2] = q[1]; p.pos[1] = floorAt(M, q[0], q[1]); p.vel = [0, 0, 0]; ai.stuckN = 0; }
        else if (q) { const dx = q[0] - p.pos[0], dz = q[1] - p.pos[2], L = Math.hypot(dx, dz) || 1; ai.unstick = [dx / L, dz / L]; ai.unstickT = 0.7; }
      } else if (moved >= 1.2) ai.stuckN = 0;
      ai.last = [...p.pos]; ai.stuckT = 0;
    }
    if (t && ground && !(ai.slideT > 0) && !ai.crouch && !ai.duck && role !== 2 && this.skill.strafe > 0.5 && Math.random() < dt * 0.25) p.vel[1] = 7.2;
    p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, ai.duck ? 1.15 : 1.7);
    const hs = Math.hypot(p.vel[0], p.vel[2]);
    p.anim = !p.onGround ? 'jump' : ai.slideT > 0 ? 'slide' : ai.reloadT > 0 ? 'reload' : ai.crouch || ai.duck ? 'crouch' : hs > 9 ? 'sprint' : hs > 1 ? 'run' : 'idle';
  }

  botReload(p, instant = false) {
    const w = WEAPONS[p.wpn];
    if (instant) { p.ai.mag = Math.round(w.mag); p.ai.reloadT = 0; return; }
    p.ai.reloadT = w.reload * 1.15;
    this.event({ k: 'reload', id: p.id, pos: [p.pos[0], p.pos[1] + 1.3, p.pos[2]] });
  }

  carrying(p) { return this.flags.red.carrier === p.id || this.flags.blue.carrier === p.id || carryingBag(this, p); } // bandeira ou bolsa do cofre

  // direcao (unitaria, [x,z]) seguindo a rota A* ate o objetivo; refaz a rota se o objetivo andou
  botSteer(p, goal, dt) {
    const ai = p.ai;
    goal = hop(this.M, p.pos, goal); // Tinteiro: estudio <-> floresta pela porta (rota longa nao fecha no A* curto)
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
      // duto do banco: cada bot sorteia uma vez se gosta (30%); quem nao gosta contorna pelas portas (03/11, caminhos variados).
      // Se a volta nao fecha na busca curta, vai pelo duto mesmo (melhor que ir reto na parede)
      ai.duct ??= Math.random() < 0.3;
      ai.path = navPath(this.M, p.pos, to, 8000, !ai.duct); // busca curta: rota que nao fecha em 8 mil celulas vira linha reta ate a proxima
      if (!ai.path && !ai.duct) ai.path = navPath(this.M, p.pos, to, 8000);
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

  // objetivo longe: cada bot mira um ponto de lado do alvo (o corredor dele, fixo ate morrer) e a folga encolhe
  // chegando perto; sem isso o time inteiro saia do nascimento em fila indiana pro mesmo lugar (02/11)
  spreadGoal(p, g) {
    if (!g || !p.ai || this.mode === 'br') return g;
    const dx = g[0] - p.pos[0], dz = g[2] - p.pos[2], d = Math.hypot(dx, dz);
    if (d < 8) return g;
    const lane = p.ai.lane ?? 0, off = lane * Math.min(7, (d - 8) * 0.35);
    const x = g[0] - dz / d * off, z = g[2] + dx / d * off;
    return standable(this.M, x, z) ? [x, g[1], z] : g;
  }

  // Canyon (05/11, pedido dele: os bots so passavam pelo meio). Cada bot tem o seu vao: 2 em 5 pelo oeste, 2 em 5 pelo leste, 1 em 5 pelo meio.
  // Precisa cruzar a vala: vai primeiro ate o vao dele; ja do outro lado, segue pro objetivo
  canyonLane(p) { let h = 0; for (const ch of p.id) h += ch.charCodeAt(0); return [-86, -86, 0, 84, 84][h % 5]; }
  canyonGoal(p, g) {
    if (!g || this.M.id !== 'deserto') return g;
    const pz = p.pos[2], gz = g[2];
    if (Math.abs(gz) < 9 || Math.sign(pz) === Math.sign(gz)) return g; // mesmo lado da vala
    return [this.canyonLane(p), 0, Math.sign(gz) * 3];
  }

  // objetivo pelo flanco (04/11, pedido dele): o bot de papel "flanco" nao vai reto. Passa por um ponto de lado e so entao
  // segue pro objetivo; quem carrega, resgata ou ja esta perto vai direto, entao o objetivo nunca e largado. Canyon fica como esta.
  objRoute(p, g) {
    const ai = p.ai, role = ai.role ?? (p.id.charCodeAt(p.id.length - 1) + p.id.length) % 3;
    const cityR = CITY_ROUTES.includes(this.M.id); /* 09/11: nos mapas de cidade todo bot escolhe caminho ate o objetivo */ if (!g || (role !== 1 && !cityR) || this.M.arena >= 100 || ai.rescue || (!['ctf', 'dom', 'heist', 'smuggle'].includes(this.mode) && !(cityR && this.esc)) || this.carrying?.(p) || (this.heist && carryingBag(this, p))) return g;
    const key = Math.round(g[0] / 8) + ':' + Math.round(g[2] / 8);
    if (ai.objKey !== key) { ai.objKey = key; const r = Math.hypot(g[0] - p.pos[0], g[2] - p.pos[2]) > 22 ? this.routeTo(p, g) : []; ai.objVias = r.slice(0, -1); ai.objViaT = this.clock || 0; }
    while (ai.objVias?.length && (dist2(ai.objVias[0], p.pos) < 16 || (this.clock || 0) - ai.objViaT > 9)) { ai.objVias.shift(); ai.objViaT = this.clock || 0; } // 9 s sem chegar: desiste do ponto (nunca fica preso num beco)
    return ai.objVias?.[0] || g;
  }

  botGoal(p) {
    const FB = this.M.flagBase;
    if (this.mode === 'bomb' && this.bomb) {
      const B = this.bomb, site = (id) => this.sites.find(s => s.id === id) || this.sites[0];
      // em volta do ponto: cada bot troca de canto a cada 5-9 s (02/11: ficavam plantados no mesmo lugar o round
      // inteiro e pareciam ociosos); 1 em 3 trocas sai mais longe, na direcao de onde o ataque vem
      const ring = (c, r) => {
        const ai = p.ai, now = this.clock || 0;
        if (!ai.ringAt || now > ai.ringT || dist2(ai.ringC || c, c) > 4) {
          for (let k = 0; k < 8; k++) {
            const far = Math.random() < 0.33, a = rnd(0, 6.28), rr = far ? r + rnd(5, 10) : rnd(r * 0.6, r * 1.6);
            const x = c[0] + Math.cos(a) * rr, z = c[2] + Math.sin(a) * rr;
            if (standable(this.M, x, z)) { ai.ringAt = [x, floorAt(this.M, x, z), z]; break; }
          }
          ai.ringT = now + rnd(5, 9); ai.ringC = c;
        }
        return ai.ringAt || c;
      };
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
    if (this.bor) {
      // noite: levanta quem caiu; senao vai no vilao mais perto (perto de gente da sala); sem vilao, cola em quem joga
      const g = borRescue(this, p);
      p.ai.rescue = !!g;
      if (g) { p.ai.route = null; return g; }
      const shop = borBotShop(this, p);
      if (shop) { p.ai.rescue = true; p.ai.route = null; return shop; } // rescue = anda reto e para em cima
      let best = null, bd = Infinity;
      for (const o of this.players.values()) if (o.mob && o.alive) { const d = dist2(o.pos, p.pos); if (d < bd) { bd = d; best = o; } }
      if (best) return [...best.pos];
      const h = [...this.players.values()].find(o => !o.bot && o.alive);
      return h ? [h.pos[0] + rnd(-3, 3), h.pos[1], h.pos[2] + rnd(-3, 3)] : [0, 0, 0];
    }
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
    if (this.heist) return heistGoal(this, p) || this.huntGoal(p); // defesa "caca": sem ninguem a vista patrulha (antes ficava parada onde nasceu)
    if (this.mode === 'dom') {
      // Canyon (05/11): a zona da propria faixa vem primeiro enquanto nao for do time; senao 89% do tempo ficava todo mundo no centro
      if (this.M.id === 'deserto') { const lane = this.canyonLane(p), own = this.zones.find(z => Math.abs(z.pos[0] - lane) < 30); if (own && own.owner !== p.team) return own.pos; }
      let best = null, bd = 1e9;
      for (const z of this.zones) {
        if (z.owner === p.team && Math.random() < 0.8) continue;
        const d = dist2(z.pos, p.pos) * (0.6 + Math.random()) * (z.bonus ? 0.4 : 1); // a extra chama mais gente
        if (d < bd) { bd = d; best = z.pos; }
      }
      return best || (CITY_ROUTES.includes(this.M.id) ? this.huntGoal(p) : this.zones[1].pos); // 09/11: zonas todas do time: na cidade vai patrulhar em vez de juntar no meio
    }
    return this.huntGoal(p);
  }

  // contra todos / mata-mata: caca com cabeca. Ordem: onde viu o inimigo por ultimo > tiro que ouviu
  // perto > rota com desvio (flanco) ate um ponto do mapa que ainda nao visitou. Antes ia reto ate a
  // posicao de um inimigo sorteado (via atraves da parede) e todo mundo usava o mesmo corredor.
  huntGoal(p) {
    const ai = p.ai;
    if (ai.lastSeenT > 0 && ai.lastSeen && !(CITY_ROUTES.includes(this.M.id) && dist2(ai.lastSeen, p.pos) > 784)) return ai.lastSeen; // 09/11: na cidade so persegue de perto; longe volta a andar pelas rotas
    let heard = null, hd = 40 * 40;
    for (const [id, n] of this.noises || []) {
      const o = this.players.get(id);
      if (!o || !this.enemies(p, o)) continue;
      const d = dist2(n.pos, p.pos);
      if (d < hd && d > 9) { hd = d; heard = n.pos; }
    }
    if (heard && (!ai.heardAt || dist2(heard, ai.heardAt) > 25)) { ai.heardAt = heard; ai.route = this.routeTo(p, heard); }
    if (ai.route?.length) {
      // chegada medida NO CHAO (07/11): ponto no andar de cima de casa bem em cima do bot nunca contava (3D dava 4 m) e o
      // movimento (2D) ja achava que tinha chegado: o bot ficava parado pra sempre (24% travado na Vila)
      if ((ai.route[0][0] - p.pos[0]) ** 2 + (ai.route[0][2] - p.pos[2]) ** 2 < 9) { ai.visited = [...(ai.visited || []).slice(-4), ai.route.shift()]; if (ai.role === 2 || (ai.role === 1 && Math.random() < 0.3)) ai.holdT = rnd(1.5, 3); }
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
    // dentro das casas de entrar e 2o andar (04/11, pedido dele: usar o mapa todo; no Canyon nao). [3] = ponto coberto, a patrulha prefere
    if (A < 100) for (const b of M.boxes) if (b.kind === 'hfloor' || b.kind === 'hroof') {
      const x = (b.min[0] + b.max[0]) / 2, z = (b.min[2] + b.max[2]) / 2, y = b.kind === 'hfloor' ? b.max[1] : 0;
      if ((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]) > 6 && !out.some(q => Math.hypot(q[0] - x, q[2] - z) < 2.5 && Math.abs(q[1] - y) < 1)) out.push([x, y, z, 1]);
    }
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
    const near = this.cfg.teams ? [...this.players.values()].filter(o => o !== p && o.alive && o.team === p.team && Math.hypot(o.pos[0] - p.pos[0], o.pos[2] - p.pos[2]) < 10).length : 0; // nasceu junto: patrulha mais longe uns dos outros
    let best = null, bs = -Infinity;
    for (const q of pts) {
      const d = Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]);
      if (d < 8) continue;
      let sc = Math.min(d, 45) - Math.max(0, d - 45) * 0.5 + rnd(0, 25) + (q[3] ? 12 : 0);
      if ((ai.visited || []).some(v => Math.hypot(v[0] - q[0], v[2] - q[2]) < 6)) sc -= 30;
      if (this.M.id === 'deserto') sc -= Math.abs(q[0] - this.canyonLane(p)) * 0.35; // patrulha na propria faixa do mapa
      for (const o of mates) { const g = o.ai.route[o.ai.route.length - 1]; if (Math.hypot(g[0] - q[0], g[2] - q[2]) < 14) sc -= 18 + near * 4; }
      if (sc > bs) { bs = sc; best = q; }
    }
    return best || pts[Math.floor(Math.random() * pts.length)] || [0, 0, 0];
  }
  // rota com desvio: um ponto de passagem de lado (30-80 graus fora da linha reta) quando o desvio
  // nao alonga demais o caminho; assim os bots chegam por flancos diferentes
  routeTo(p, target) {
    if (CITY_ROUTES.includes(this.M.id)) { const r = this.cityRoute(p, target); if (r) return r; }
    const d0 = Math.hypot(target[0] - p.pos[0], target[2] - p.pos[2]);
    if (d0 < 14 || Math.random() < 0.15) return [target];
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

  // 09/11 (pedido dele: mais rotas nos 4 mapas novos): cada ponto da grade ganha uma classe pela folga em volta: rua larga, beco ou coberto.
  // Cada viagem sorteia um jeito de ir (beco, rua de fora, miolo, por dentro das casas ou zigue-zague) e cada bot tem o seu preferido.
  cityNodes() {
    if (this._cityN) return this._cityN;
    const M = this.M, A = M.arena, out = [], seen = new Set();
    const clear = (x, z) => { for (const r of [1.6, 3, 4.6]) { let ok = 0; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; if (standable(M, x + Math.cos(a) * r, z + Math.sin(a) * r)) ok++; } if (ok < 6) return r; } return 6; };
    for (let x = -A + 3; x <= A - 3; x += 3) for (let z = -A + 3; z <= A - 3; z += 3) {
      if (!standable(M, x, z)) continue;
      const c = clear(x, z), kind = c <= 1.6 ? 'alley' : c >= 6 ? 'street' : 'side', cell = kind + Math.round(x / 7) + ':' + Math.round(z / 7);
      if (seen.has(cell)) continue; seen.add(cell);
      out.push({ p: [x, floorAt(M, x, z), z], kind, ring: Math.max(Math.abs(x), Math.abs(z)) / A });
    }
    for (const q of this.poiList()) if (q[3]) out.push({ p: q.slice(0, 3), kind: 'inside', ring: Math.max(Math.abs(q[0]), Math.abs(q[2])) / A });
    return (this._cityN = out);
  }
  cityRoute(p, target) {
    const d0 = Math.hypot(target[0] - p.pos[0], target[2] - p.pos[2]);
    if (d0 < 12) return null;
    const ai = p.ai, N = this.cityNodes(); if (!N.length) return null;
    if (ai.cityStyle == null) ai.cityStyle = Math.floor(Math.random() * 5);
    const STY = ['alley', 'outer', 'center', 'inside', 'zig'], style = Math.random() < 0.55 ? STY[ai.cityStyle] : STY[Math.floor(Math.random() * 5)];
    const count = d0 > 70 ? 3 : d0 > 34 ? 2 : 1, route = [], last = ai.cityLast || []; let from = [...p.pos];
    const ux = (target[0] - p.pos[0]) / d0, uz = (target[2] - p.pos[2]) / d0;
    let side = Math.random() < 0.5 ? -1 : 1;
    for (let i = 1; i <= count; i++) {
      const f = i / (count + 1), ax = p.pos[0] + ux * d0 * f, az = p.pos[2] + uz * d0 * f, reach = Math.max(14, d0 * 0.42);
      let best = null, bs = -1e9;
      for (const n of N) {
        const dx = n.p[0] - ax, dz = n.p[2] - az, dm = Math.hypot(dx, dz); if (dm > reach) continue;
        const a = Math.hypot(n.p[0] - from[0], n.p[2] - from[2]), b = Math.hypot(target[0] - n.p[0], target[2] - n.p[2]); if (a < 6 || b < 5) continue;
        if (route.some(q => Math.hypot(q[0] - n.p[0], q[2] - n.p[2]) < 7)) continue;
        const lat = (dx * -uz + dz * ux); // de que lado da linha reta o ponto fica
        let sc = Math.random() * 9 - Math.abs(dm - reach * 0.55) * 0.25;
        if (style === 'alley') sc += n.kind === 'alley' ? 26 : n.kind === 'side' ? 8 : 0;
        else if (style === 'outer') sc += n.ring * 30 + (n.kind === 'street' ? 5 : 0);
        else if (style === 'center') sc += (1 - n.ring) * 30;
        else if (style === 'inside') sc += n.kind === 'inside' ? 34 : n.kind === 'alley' ? 7 : 0;
        else sc += lat * side * 1.1 + (n.kind === 'street' ? 3 : 0);
        if (last.some(q => Math.hypot(q[0] - n.p[0], q[2] - n.p[2]) < 9)) sc -= 22; // nao repete o caminho da viagem anterior
        if (sc > bs) { bs = sc; best = n; }
      }
      if (best) { route.push(best.p); from = best.p; }
      if (style === 'zig') side = -side;
    }
    ai.cityLast = route.slice();
    return route.length ? [...route, target] : null;
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
    if (p.car && p.seat === 0) return; // motorista nao atira
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
    // erra mais andando rapido, deslizando, no ar ou logo depois de levar tiro; agachado parado acerta um pouco mais
    const mySpeed = Math.hypot(p.vel[0], p.vel[2]);
    pHit -= mySpeed * 0.01;
    if (p.ai.slideT > 0 || !p.onGround) pHit *= 0.6;
    if (p.ai.hurtT > 0) pHit *= 0.65;
    if (p.ai.crouch) pHit *= 1.12;
    // sniper de bot (03/11, pedido dele): pode usar, mas erra bastante. Tiro unico de muito dano: acerto limitado,
    // pior com alvo correndo e de perto (luneta nao acompanha); parado e de longe e a melhor chance dele
    if (p.wpn === 'sniper') pHit = Math.min(pHit * 0.6, 0.42) * (tSpeed > 5 ? 0.6 : 1) * (d < 8 ? 0.7 : 1);
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
    // 08/11 (producao: "buga com 3-5 jogadores"): salas no MESMO mapa dividem o objeto do mapa no servidor, e o M.dyn (bonde,
    // van, sentinela, carro) gravado por uma sala valia na outra: parede invisivel, bala barrada no nada. Cada sala recoloca o seu
    if (this._dyn) this.M.dyn = this._dyn;
    this.pathBudget = PATHS_PER_TICK; // rotas novas por tick (espalha o custo: 15 bots refazendo juntos travava a sala)
    if (this.noises) for (const [id, n] of this.noises) if ((n.t -= dt) <= 0) this.noises.delete(id);
    this.clock = (this.clock || 0) + dt;
    this.mvTick(dt);
    this.checkAfk();
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
    { const E = EV(this.mut); if (E?.regen && !this.over) for (const p of this.players.values()) { // evento Pele de Elastico (08/11)
      if (p.alive && !p.mob && p.hp < (p.maxHp || 100) && this.clock - (p.hurtAt ?? -99) >= (E.regenAfter || 2)) p.hp = Math.min(p.maxHp || 100, p.hp + E.regen * dt);
    } }
    for (const p of this.players.values()) {
      if (!p.alive || !hasSkill(p, 'folego') || p.hp >= (p.maxHp || 100)) continue;
      if (this.clock - (p.hurtAt ?? -99) >= SKILLS.folego.after) p.hp = Math.min(p.maxHp || 100, p.hp + SKILLS.folego.regen * dt);
    }
    if (this.phase !== 'play') { this.tickLobby(dt); return; }
    if (this.over) {
      this.overT -= dt;
      // fim de partida: volta todo mundo pro lobby (pronto zerado) quando acaba o tempo do podio ou todo mundo apertou "Voltar pro lobby"
      if ((this.overT <= 0 && !this.useLobby) || this.backLobby) { // sala com lobby: so volta quando alguem aperta (08/11)
        this.backLobby = false; for (const p of this.players.values()) p.endBack = false;
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
    } else if (this.mode !== 'bomb' && !this.bor) this.time -= dt; // noite dos borroes: sem relogio (acaba quando o time cai)
    if (this.time <= 0 && this.mode !== 'bomb' && !this.bor) {
      this.time = 0;
      let winner = null;
      if (this.mode === 'infect') winner = 'blue';
      else if (this.esc) {
        // tempo acabou com atacante encostado no bonde: prorrogacao (uma vez); senao a defesa segurou
        const atkN = this.esc.atk === 'red' ? this.esc.red : this.esc.blue;
        if (!this.esc.ot && atkN > 0) { this.esc.ot = true; this.time = 25; this.event({ k: 'escOt' }); winner = null; }
        else { winner = escTimeout(this); if (!winner) { this.time = this.time || 210; } }
      }
      else if (this.heist) { winner = heistTimeout(this); if (!winner && !this.over) this.time = this.time || 180; } // cofre: tempo = rodada da defesa
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
      if (w) { const tr = bodyTrait(this.bodyOf(p, p.wpn)), bm = this.bpOf(p, p.wpn), dmg = w.dmg * (w.pellets || 1) * (tr.dmg || 1) * (bm.dmg || 1); const cv = p.los?.[p.wpn]?.conv === 'auto' ? 1.9 : 1; p.budget = Math.min(dmg * 5, p.budget + (dmg / (w.rate * (tr.rate || 1) * (bm.rate || 1))) * 1.6 * cv * dt); } // kit automatico: cadencia maior
      if (!p.alive) {
        if (p.mob || (this.bor && borHoldSpawn(this, p))) continue; // vilao nao renasce; gente da noite volta na onda seguinte
        p.respawnT -= dt;
        // humano: depois do minimo, renasce quando pedir (botao/toque) ou sozinho 5 s depois
        // plantar a bomba: quem cai so volta na proxima rodada
        if (this.mode !== 'bomb' && this.mode !== 'br' && p.respawnT <= 0 && (p.bot || p.wantSpawn || p.respawnT <= -AUTO_SPAWN || p.deaths === 0)) { p.wantSpawn = false; this.spawn(p); }
        // bate-volta: volta do ceu sozinho quando o tempo acaba (sem botao: a queda ja e a escolha de onde cair)
        else if ((p.bounceBack || p.lateSpawn) && p.respawnT <= 0) { p.bounceBack = false; p.lateSpawn = false; this.spawn(p); }
        continue;
      }
      if (p.drop > 0) p.drop -= dt;
      if (p.bot && !p.mob && !(this.freezeT > 0)) this.tickBot(p, dt); // vilao anda pelo borTick
      if (p.bot && !p.mob && p.ready.length && !this.bor && (p.stkRetry = (p.stkRetry || 0) - dt) <= 0) { p.stkRetry = 2; this.useStreak(p, p.ready[0]); } // sequencia travada (outra no ar): tenta de novo a cada 2 s
      if (p.pos[1] < -20) this.kill(p, null, 'fall', false);
    }

    carsTick(this, dt);
    this.tickNades(dt);
    this.tickRockets(dt);
    this.tickGadgets(dt);
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

    this.tickGunDrops(dt);
    if (this.mode === 'ctf') this.tickCTF(dt);
    if (this.mode === 'dom') this.tickDOM(dt);
    if (this.esc && !this.over && !(this.freezeT > 0)) escTick(this, dt);
    if (this.heist && !this.over && !(this.freezeT > 0)) heistTick(this, dt);
    if (this.bor && !this.over && !(this.freezeT > 0)) borTick(this, dt);
    this.M.dyn = [...(this.esc ? [trainBox(this.M, this.esc.d)] : this.heist ? heistBoxes(this.heist) : this.bor ? borBoxes(this) : []), ...propBoxes(this.blimps, this.cars)]; // bonde (01/11), cofre e van (03/11) solidos pros bots e pras balas; portas fechadas da noite; sentinela, sinalizador e carro parado
    this._dyn = this.M.dyn;
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
      t: 'lobby', phase: this.phase, countT: Math.max(0, this.countT), mode: this.mode, duo: this.duo, bounce: this.bounce, blitz: this.blitz || undefined, map: this.M.id, host: this.hostId(),
      cfg: { cap: this.cap(), ranked: !!this.ranked, mut: this.mut, tod: this.tod || 'day', mode: this.modeId(), map: (this.mode === 'escort' || this.blitz ? this.mapRaw : this.mapPick) || 'auto', /* blitz: o lobby ve a ESCOLHA (auto mostrava o sorteado e a seta pulava) */ bots: this.wantBots, difficulty: this.difficulty, limit: this.limitPick || 0, time: this.timePick || 0, defLimit: matchRules(this.mode, this.M.id, this.cfg, MATCH_TIME).limit, defTime: matchRules(this.mode, this.M.id, this.cfg, MATCH_TIME).time },
      players: [...this.players.values()].filter(p => !p.mob).map(p => ({ id: p.id, name: p.name, bot: p.bot, team: p.team, ready: p.bot || !!p.lobbyReady || p.id === this.hostId(), lvl: p.lvl || botLevel(p.id), pr: p.prest || 0, elite: !!p.elite, rk: p.rk ?? -1 })), // vilao da noite nao e do elenco (03/11)
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
        id: p.id, name: p.name, bot: p.bot, team: p.team, lvl: p.lvl || botLevel(p.id) /* 07/11: banner e tela de morte com o nivel de verdade */, hp: Math.max(0, Math.round(p.hp)), alive: p.alive, pg: p.ping || undefined,
        pos: [r2(p.pos[0]), r2(p.pos[1]), r2(p.pos[2])], yaw: r3(p.yaw), pitch: r3(p.pitch), anim: p.anim, wpn: p.wpn,
        kills: p.kills, deaths: p.deaths, assists: p.assists || 0, score: Math.round(p.score), gunLvl: p.gunLvl, respawnT: r2(p.respawnT), // score arredondado: a escolta soma pontos por segundo (vinha 27.6703999...)
        nades: p.nades, ready: p.ready, streak: p.streak, elite: !!p.elite, gh: hasSkill(p, 'fantasma') ? 1 : undefined, rk: p.rk ?? -1, fc: Math.round((p.fieldCharge || 0) * 100), armor: p.armor ? Math.round(p.armor) : 0, place: p.place || 0, dn: p.down > 0 ? Math.ceil(p.down) : 0, rv: p.reviveT > 0 ? r2(p.reviveT) : 0, sh: p.shieldT > 0 ? 1 : 0, pt: (p.protUntil || 0) > (this.clock || 0) ? 1 : undefined, fz: p.fuse > 0 ? Math.ceil(p.fuse) : 0, pr: p.prest || 0, dv: p.bot ? undefined : p.dev || undefined, ln: p.lean ? Math.round(p.lean * 10) / 10 : undefined, ad: p.wpn === 'sniper' && p.alive && (p.bot ? !!p.ai?.target : p.ads) ? 1 : undefined, // sniper mirando: reflexo da luneta (04/11)
                ...(this.bor ? { mob: p.mob || undefined, mh: p.mob ? p.maxHp : undefined, cs: p.mob ? undefined : Math.round(p.cash || 0), fr: p.frozenT > 0 ? 1 : 0, hk: p.headK > 1.6 ? 1 : undefined } : null), // noite: tipo do vilao, vida cheia (barra do chefao), pontos, congelado, lente/olho exposto
              });
    }
    this.send(null, {
      t: 'snap', lob: this.useLobby, host: this.over ? this.hostId() : undefined, mode: this.mode, mut: this.mut, ranked: this.ranked, duo: this.duo, bounce: this.bounce, blitz: this.blitz || undefined, bOpen: this.bounceOpen(), map: this.M.id, limit: this.limit, time: r2(this.time), over: this.over, overT: this.overT,
      freeze: Math.max(0, this.freezeT || 0), loading: !!this.waitLoad, infT: this.mode === 'infect' && !this.infStarted ? Math.max(0, this.infT) : 0, lastStand: this.lastStand, infKit: this.mode === 'infect' ? this.infKit : null,
      bomb: this.mode === 'bomb' && this.bomb ? { state: this.bomb.state, pos: this.bomb.pos, carrier: this.bomb.carrier, site: this.bomb.site, t: this.bomb.t, prog: this.bomb.prog, actor: this.bomb.actor, kind: this.bomb.kind } : null,
      round: this.mode === 'bomb' ? { n: this.roundN, over: this.roundOver > 0 } : null, sites: this.mode === 'bomb' ? this.sites : null,
      teamScore: { red: Math.floor(this.teamScore.red), blue: Math.floor(this.teamScore.blue) },
      flags: this.flags, zones: this.zones.map(z => ({ id: z.id, owner: z.owner, prog: z.prog, ...(z.bonus ? { pos: z.pos, bonus: 1, left: Math.ceil(this.domBonus?.t || 0) } : null) })),
      pickups: this.pickups.map(k => k.active),
      nades: [...this.nades.map(n => ({ id: n.id, kind: n.kind, pos: n.pos.map(r2) })), ...(this.rockets || []).map(r => ({ id: r.id, kind: 'rocket', pos: r.pos.map(r2), d: r.d.map(r2) }))],
      cars: carsSnap(this), blimps: this.blimps.map(b => ({ id: b.id, k: b.kind, pos: b.pos.map(r2), team: b.team, owner: b.owner, yaw: b.kind === 'sentry' ? r3(b.yaw) : undefined, hp: Math.max(0, Math.round(b.hp / (b.maxHp || STREAKS[b.kind || 'blimp'].hp) * 100)) })), ...strikeSnap(this),
      uavs: this.uavs.map(u => ({ owner: u.owner, team: u.team })),
      talcs: this.talcs.map(u => ({ owner: u.owner, team: u.team })),
      sLock: (() => { const l = this.streakLock(); return l ? { kind: l.kind, t: Math.ceil(l.t) } : null; })(),
      br: this.mode === 'br' && this.zone ? brSnap(this) : null,
      esc: this.esc ? escSnap(this) : null,
      bor: this.bor ? borSnap(this) : null,
      heist: this.heist ? heistSnap(this) : null, nt: this.night ? 1 : 0, // noite no banco (07/11)
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
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg', 'melee']) {
    const l = los[w];
    if (!l || typeof l !== 'object') continue;
    const o = {};
    for (const k of ['body', 'scope', 'charger', 'handle', 'laser', 'tracer', 'paint', 'accent', 'pat', 'pat2', 'ret', 'retColor', 'camo', 'bp', 'ammo', 'conv']) {
      const v = l[k];
      o[k] = typeof v === 'string' && v.length <= 24 && /^[#\w-]+$/.test(v) ? v : null;
    }
    o.muzzle = ['silencer', 'silencer2', 'brake', 'comp', 'flash'].includes(l.muzzle) && w !== 'melee' ? l.muzzle : null; // bocal (01/11)
    o.cvName = typeof l.cvName === 'string' && l.cvName.trim() ? cleanChat(l.cvName).slice(0, 20) : null; // nome da variante do jogador (arma no chao mostra)
    o.ws = typeof l.ws === 'string' && WSKINS[l.ws]?.of === o.body ? l.ws : null; // skin de modelo da Loja (04/11): so visual, stats do corpo
    if (o.bp && BLUEPRINTS[o.bp]?.wpn !== w) o.bp = null;
    if (o.ammo && (!AMMO[o.ammo] || w === 'melee')) o.ammo = null;
    out[w] = o;
  }
  return out;
}

const COUNTDOWN = 5;
const STREAK_CALL_GAP = 1; // segundos entre duas chamadas de sequencia do mesmo jogador
const MV_TIME = 20, MV_CD = 20; // votacao pra alterar a partida: tempo pra responder e espera depois de uma recusa
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
export const RANKED_MODES = ['ctf', 'dom', 'escort', 'heist', 'blitz_ctf', 'blitz_dom'];
export const QUICK_MODES = ['ffa', 'tdm', 'blitz', 'blitz_ctf', 'blitz_dom', 'ctf', 'dom', 'escort', 'heist', 'smuggle', 'gungame', 'infect', 'bomb', 'br', 'bounce'];
export const QUICK_BOTS = 11;

// 08/11 (desempenho): servidor do multiplayer chama ao ligar; um mapa por vez com folga entre eles (nao trava quem ja chegou)
export function warmMaps(gap = 150) { ALL_MAPS.forEach((id, i) => setTimeout(() => { try { warmNav(getMap(id)); } catch { /* mapa com erro: monta na hora, como antes */ } }, i * gap)); }
