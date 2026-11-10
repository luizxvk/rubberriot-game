// Desafios: 3 diarios (sorteados pela data, trocam a meia-noite) + carreira em 3 niveis.
// Progresso fica salvo neste aparelho. track() devolve o que acabou de completar (pra dar XP e banner).
import { pushSoon } from './rovex.js';
import { BLUEPRINTS } from '../shared/weapons.js';
const KEY = 'rr_challenges_v1';

// tipo de evento: kill (wpn, head), assist, streak, win, match, flagCap
// 29/10: XP dos desafios cortado pela metade junto com o resto (subia de nivel facil demais)
export const DAILY = [
  { id: 'kills', n: 25, xp: 750, ok: (e) => e.type === 'kill' },
  { id: 'head', n: 10, xp: 750, ok: (e) => e.type === 'kill' && e.head },
  { id: 'melee', n: 5, xp: 1000, ok: (e) => e.type === 'kill' && e.wpn === 'melee' },
  { id: 'pistol', n: 8, xp: 750, wpn: 'pistol', ok: (e) => e.type === 'kill' && e.wpn === 'pistol' },
  { id: 'smg', n: 15, xp: 750, wpn: 'smg', ok: (e) => e.type === 'kill' && e.wpn === 'smg' },
  { id: 'rifle', n: 15, xp: 750, wpn: 'rifle', ok: (e) => e.type === 'kill' && e.wpn === 'rifle' },
  { id: 'shotgun', n: 10, xp: 750, wpn: 'shotgun', ok: (e) => e.type === 'kill' && e.wpn === 'shotgun' },
  { id: 'sniper', n: 8, xp: 900, wpn: 'sniper', ok: (e) => e.type === 'kill' && e.wpn === 'sniper' },
  { id: 'nade', n: 3, xp: 900, ok: (e) => e.type === 'kill' && e.wpn === 'frag' },
  { id: 'assist', n: 8, xp: 600, ok: (e) => e.type === 'assist' },
  { id: 'streak', n: 2, xp: 900, ok: (e) => e.type === 'streak' },
  { id: 'win', n: 2, xp: 1000, ok: (e) => e.type === 'win' },
  { id: 'matches', n: 3, xp: 500, ok: (e) => e.type === 'match' },
];
// Desbloqueios: cada desafio libera um item especial (camuflagem reativa, mira, arma apelona, faca).
// O item fica trancado no arsenal ate o desafio fechar (nao abre por nivel).
const K = (w) => (e) => e.type === 'kill' && (!w || e.wpn === w);
export const UNLOCKS = [
  // u_ember saiu (03/11): a Brasa reativa agora e so da Loja
  { id: 'u_inkreact', n: 100, xp: 2000, ok: (e) => e.type === 'kill' && e.head, reward: { slot: 'camo', id: 'inkreact' } },
  { id: 'u_sscope', n: 25, xp: 1250, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'sniper', reward: { slot: 'scope', id: 'sniper_scope_2', wpn: 'sniper' } },
  { id: 'u_fscope', n: 60, xp: 1250, ok: K('rifle'), reward: { slot: 'scope', id: 'fusil_scope_4', wpn: 'rifle' } },
  { id: 'u_handcannon', n: 40, xp: 1500, ok: K('pistol'), reward: { slot: 'body', id: 'pistol_3', wpn: 'pistol' } },
  { id: 'u_spitter', n: 75, xp: 1500, ok: K('smg'), reward: { slot: 'body', id: 'subfusil_5', wpn: 'smg' } },
  { id: 'u_heavy', n: 75, xp: 1500, ok: K('rifle'), reward: { slot: 'body', id: 'fusil_4', wpn: 'rifle' } },
  { id: 'u_bolt', n: 30, xp: 1500, ok: K('sniper'), reward: { slot: 'body', id: 'sniper_2', wpn: 'sniper' } },
  { id: 'u_splitter', n: 15, xp: 1000, ok: K('melee'), reward: { slot: 'body', id: 'melee_4', wpn: 'melee' } },
  { id: 'u_sword', n: 40, xp: 1750, ok: K('melee'), reward: { slot: 'body', id: 'melee_12', wpn: 'melee' } },
  { id: 'u_fang', n: 10, xp: 1500, ok: (e) => e.type === 'streak', reward: { slot: 'body', id: 'melee_13', wpn: 'melee' } },
  // espadas (04/11): Corsario e Lamina Real por desafio (a Katana abre no nivel 30 do jogador)
  { id: 'u_corsair', n: 30, xp: 1750, ok: K('melee'), reward: { slot: 'body', id: 'melee_15', wpn: 'melee' } },
  { id: 'u_royal', n: 75, xp: 2500, ok: K('melee'), reward: { slot: 'body', id: 'melee_16', wpn: 'melee' } },
  // pacote WW2: cada arma antiga sai de um desafio proprio
  { id: 'u_ww_garand', n: 40, xp: 1750, ok: K('sniper'), reward: { slot: 'body', id: 'sniper_3', wpn: 'sniper' } },
  // visual do boneco: itens incomuns que so saem daqui (30/10)
  { id: 'u_lk_plunger', n: 25, xp: 1250, ok: K('melee'), reward: { slot: 'look', id: 'hat:plunger' } },
  { id: 'u_lk_knockout', n: 15, xp: 1250, ok: (e) => e.type === 'kill' && e.wpn === 'frag', reward: { slot: 'look', id: 'eyes:knockout' } },
  { id: 'u_lk_oven', n: 5, xp: 1250, ok: (e) => e.type === 'win', reward: { slot: 'look', id: 'glove:oven' } },
  { id: 'u_lk_stink', n: 8, xp: 1250, ok: (e) => e.type === 'streak', reward: { slot: 'look', id: 'fx:stink' } },
  // akimbo saiu daqui (08/11, pedido dele): abre no ultimo nivel da arma (progress.js); quem fechou o desafio antigo mantem (hadAkimbo)
  // revolver Bang-Bang (30/10): so sai daqui
  // gadgets de baixo do cano (03/11): abates com o proprio modelo
  { id: 'u_gd_flame', n: 40, xp: 2500, ok: (e) => e.type === 'kill' && e.wpn === 'rifle' && e.body === 'fusil_6', reward: { slot: 'handle', id: 'gd_flame', wpn: 'rifle' } },
  { id: 'u_gd_shot', n: 40, xp: 2500, ok: (e) => e.type === 'kill' && e.wpn === 'rifle' && e.body === 'fusil_7', reward: { slot: 'handle', id: 'gd_shot', wpn: 'rifle' } },
  { id: 'u_ww_1911', n: 25, xp: 1250, ok: K('pistol'), reward: { slot: 'body', id: 'pistol_7', wpn: 'pistol' } },
  { id: 'u_ww_c96', n: 15, xp: 1500, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'pistol', reward: { slot: 'body', id: 'pistol_8', wpn: 'pistol' } },
  { id: 'u_ww_tt', n: 3, xp: 1500, ok: (e) => e.type === 'win', reward: { slot: 'body', id: 'pistol_9', wpn: 'pistol' } },
  // pacote 2 (30/10, pedido dele): cada arma nova sai de um desafio proprio (antes abria por nivel)
  { id: 'u_pk_cuca', n: 20, xp: 2000, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'sniper', reward: { slot: 'body', id: 'sniper_4', wpn: 'sniper' } },
  { id: 'u_pk_dmr', n: 6, xp: 2000, ok: (e) => e.type === 'streak', reward: { slot: 'body', id: 'fusil_12', wpn: 'rifle' } },
  // tipos de bala: sairam daqui (05/11), agora abrem no nivel da arma (AMMO_LVL em progress.js); quem fechou o desafio mantem (WAS_CH)
  // tracados do tiro (equipados por arma no Arsenal; Giz e Nenhum ja vem abertos)
  { id: 'u_tr_fire', n: 20, xp: 750, ok: K('shotgun'), reward: { slot: 'tracer', id: 'tr:fire' } },
  { id: 'u_tr_ink', n: 15, xp: 750, ok: (e) => e.type === 'assist', reward: { slot: 'tracer', id: 'tr:ink' } },
  { id: 'u_tr_spark', n: 40, xp: 750, ok: K('smg'), reward: { slot: 'tracer', id: 'tr:spark' } },
  { id: 'u_tr_rainbow', n: 5, xp: 1250, ok: (e) => e.type === 'win', reward: { slot: 'tracer', id: 'tr:rainbow' } },
  { id: 'u_tr_void', n: 50, xp: 1250, ok: (e) => e.type === 'kill' && e.head, reward: { slot: 'tracer', id: 'tr:void' } },
  { id: 'u_tr_toxic', n: 5, xp: 1000, ok: K('frag'), reward: { slot: 'tracer', id: 'tr:toxic' } },
  { id: 'u_tr_gold', n: 20, xp: 1500, ok: (e) => e.type === 'streak', reward: { slot: 'tracer', id: 'tr:gold' } },
  { id: 'u_tr_ice', n: 25, xp: 1000, ok: K('sniper'), reward: { slot: 'tracer', id: 'tr:ice' } },
];
// Desafio de ELITE: 1 por dia (sorteado pela data), dificil, vale muito XP e da a proxima variante de elite
// que o jogador ainda nao tem (arma montada + camo lendaria). Com todas na mao, so o XP.
// max: o progresso e o maior valor visto (ex.: sequencia sem cair), nao uma soma.
export const ELITE = [
  { id: 'e_head', n: 40, xp: 4000, ok: (e) => e.type === 'kill' && e.head },
  { id: 'e_streak', n: 12, xp: 4500, max: (e) => (e.type === 'kill' ? e.streak || 0 : -1) },
  { id: 'e_multi', n: 6, xp: 4250, ok: (e) => e.type === 'multi' },
  { id: 'e_melee', n: 15, xp: 4000, ok: K('melee') },
  { id: 'e_sniperhead', n: 15, xp: 4500, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'sniper' },
  { id: 'e_wins', n: 5, xp: 4250, ok: (e) => e.type === 'win' },
  { id: 'e_nuke', n: 1, xp: 5000, ok: (e) => e.type === 'streak' && e.kind === 'nuke' },
  { id: 'e_kills', n: 120, xp: 4000, ok: K() },
];
export const BP_ORDER = Object.keys(BLUEPRINTS).filter(id => !BLUEPRINTS[id].bm); // Mercado Negro fica fora do desafio de elite
export const bpOwned = (id) => !!data.bps[id];
// camo lendaria: vem junto com a variante que a usa
export const legendOwned = (camoId) => BP_ORDER.some(id => BLUEPRINTS[id].lo.camo === camoId && bpOwned(id));
export function eliteToday() {
  const day = today();
  if (data.elite.day !== day) {
    const rnd = seeded(day + '|elite');
    const c = ELITE[Math.floor(rnd() * ELITE.length)];
    data.elite = { day, id: c.id, prog: 0, done: false, reward: BP_ORDER.find(id => !bpOwned(id)) || null };
    save();
  }
  const c = ELITE.find(x => x.id === data.elite.id) || ELITE[0];
  return { ...c, prog: Math.min(c.n, data.elite.prog), done: data.elite.done, reward: data.elite.reward };
}

// modelos que eram de desafio e agora abrem por nivel (31/10, pedido dele): quem ja tinha fechado o
// desafio antigo continua com o modelo aberto
// 10/11 (pedido dele): municao sai daqui. O desafio antigo abria a bala em TODAS as armas; agora e so pelo nivel de cada arma (AMMO_LVL)
const WAS_CH = { pistol_10: ['u_revolver', 30], subfusil_13: ['u_pk_mp5', 60], shotgun_3: ['u_pk_aa12', 40], fusil_11: ['u_pk_ar', 25] };
export const wasUnlocked = (id) => !!WAS_CH[id] && (data.career[WAS_CH[id][0]] || 0) >= WAS_CH[id][1];
// akimbo era desafio por arma (ate 08/11): a contagem antiga segue no save e mantem aberto pra quem fechou
const WAS_AKIMBO = { pistol: ['u_akimbo', 50], smg: ['u_akimbo_smg', 75], shotgun: ['u_akimbo_sg', 40] };
export const hadAkimbo = (wpn) => !!WAS_AKIMBO[wpn] && (data.career[WAS_AKIMBO[wpn][0]] || 0) >= WAS_AKIMBO[wpn][1];
// item -> desafio que libera (o arsenal consulta isso)
export const LOCKED_BY = Object.fromEntries(UNLOCKS.map(u => [u.reward.id, u]));
export const unlockDone = (id) => (data.career[id] || 0) >= (UNLOCKS.find(u => u.id === id)?.n ?? Infinity);
// rotacao: so ACTIVE desafios de desbloqueio contam por vez; fechou um, entra o proximo da fila.
// Ordem intercalada (camo, tracado, arma, faca...) pra variar.
const ACTIVE = 4;
const ORDER = ['u_am_fire', 'u_lk_plunger', 'u_ember', 'u_ww_1911', 'u_lk_oven', 'u_am_trace', 'u_tr_fire', 'u_handcannon', 'u_lk_knockout', 'u_ww_stg', 'u_splitter', 'u_lk_stink', 'u_tr_ink', 'u_sscope', 'u_spitter',
  'u_ww_garand', 'u_am_boom', 'u_tr_spark', 'u_inkreact', 'u_ww_c96', 'u_heavy', 'u_tr_void', 'u_am_ap', 'u_fang', 'u_fscope', 'u_pk_cuca', 'u_ww_tt', 'u_tr_toxic', 'u_bolt', 'u_pk_dmr',
  'u_tr_rainbow', 'u_sword', 'u_tr_gold', 'u_tr_ice']; // WW2 (u_ww_*) intercaladas pra aparecer cedo
const ordered = () => [...ORDER.map(id => UNLOCKS.find(u => u.id === id)).filter(Boolean), ...UNLOCKS.filter(u => !ORDER.includes(u.id))];
// o jogador pode escolher quais perseguir (aba Desafios): os escolhidos entram primeiro, a fila completa o resto
const pending = (u) => (data.career[u.id] || 0) < u.n;
// so os desafios que a pessoa ATIVOU contam (03/11, pedido dele: antes as vagas vazias eram completadas sozinhas
// com os proximos da lista, e aparecia "liberou a Cuspideira" sem ela nunca ter ativado aquele desafio)
export function activeUnlocks() {
  return (data.pick || []).map(id => UNLOCKS.find(u => u.id === id)).filter(u => u && pending(u)).slice(0, ACTIVE);
}
export const unlockPinned = (id) => (data.pick || []).includes(id);
// liga/desliga um desafio escolhido; cheio (4), sai o escolhido mais antigo
export function togglePick(id) {
  const p = (data.pick || []).filter(x => UNLOCKS.some(u => u.id === x && pending(u)));
  data.pick = p.includes(id) ? p.filter(x => x !== id) : [...p, id].slice(-ACTIVE);
  save();
}
export function pendingUnlocks() { return ordered().filter(pending).map(u => ({ ...u, prog: Math.min(u.n, data.career[u.id] || 0) })); }
export const unlockActive = (id) => activeUnlocks().some(u => u.id === id);
export const unlockProg = (id) => { const u = UNLOCKS.find(x => x.id === id); return u ? Math.min(1, (data.career[id] || 0) / u.n) : 1; };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }

const GONE_CH = ['u_ww_thompson'], GONE_BODIES = ['subfusil_11']; // Maquina de Escrever removida (30/10)
let data = load();
function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  const out = { day: d.day || '', daily: d.daily || {}, done: d.done || {}, career: d.career || {}, elite: d.elite || {}, bps: d.bps || {}, tut: d.tut || null, pick: Array.isArray(d.pick) ? d.pick : [], mis: d.mis && typeof d.mis === 'object' ? d.mis : null };
  // desafios e modelos que sairam do jogo: some todo rastro deles do save (e da nuvem, no proximo envio)
  let gone = false;
  for (const id of GONE_CH) {
    if (id in out.career) { delete out.career[id]; gone = true; }
    if (id in out.done) { delete out.done[id]; gone = true; }
    if (out.pick.includes(id)) { out.pick = out.pick.filter(x => x !== id); gone = true; }
  }
  if (out.tut && GONE_BODIES.includes(out.tut.body)) { delete out.tut.body; gone = true; }
  if (gone) setTimeout(() => save(), 0);
  return out;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* */ } pushSoon(); }

// Treino com o Seu Tinteiro: concluir da UMA vez um modelo de arma e uma camuflagem sorteados entre o que o
// jogador ainda nao tem. O presente vale como liberado (a camuflagem em todas as armas).
export const tutorialState = () => data.tut;
export const gifted = (id) => !!id && !!data.tut && (data.tut.body === id || data.tut.camo === id);
export function grantTutorial(pick) {
  if (data.tut) return data.tut;
  data.tut = { ...(pick() || {}), at: Date.now() };
  save();
  return data.tut;
}

// os 3 do dia (mesma data = mesmos desafios)
export function dailyToday() {
  const day = today();
  if (data.day !== day) { data.day = day; data.daily = {}; data.done = {}; save(); }
  const rnd = seeded(day), pool = [...DAILY], out = [];
  while (out.length < 3) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out.map(c => ({ ...c, prog: Math.min(c.n, data.daily[c.id] || 0), done: !!data.done[c.id] }));
}
// ativos agora + quantos estao na fila + quantos ja foram
export function unlockState() {
  const all = ordered(), act = activeUnlocks();
  return {
    active: act.map(u => ({ ...u, prog: Math.min(u.n, data.career[u.id] || 0), done: false })),
    queued: all.filter(u => (data.career[u.id] || 0) < u.n).length - act.length,
    done: all.filter(u => (data.career[u.id] || 0) >= u.n).length, total: all.length,
  };
}
// tempo ate os diarios trocarem (ms)
export function msToReset() { const d = new Date(), m = new Date(d); m.setHours(24, 0, 0, 0); return m - d; }

// ---------- Missoes diarias (08/11, pedido dele) ----------
// 5 por dia, em rodizio num banco grande (familia x quantidade x arma): 3 de combate, 1 de progresso (peca, arma, nivel) e 1 de
// partidas (jogar, mapas, vitorias); nunca 2 da mesma familia no dia.
// Dao XP alto e Zions Points (o valor e do servidor: ZP.mission em shared/shop.js). Progresso no mesmo save dos desafios.
export const MIS_ZP = 30; // so pra mostrar; quem paga e o servidor
const CATS6 = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg'];
export const MISSIONS = [];
const fam = (f, grp, ns, xp, ok, wpn) => ns.forEach(n => MISSIONS.push({ id: `m_${f}${wpn ? '_' + wpn : ''}_${n}`, key: 'mi_' + f, fam: f + (wpn || ''), grp, n, wpn, xp: Math.round(xp(n) / 50) * 50, ok }));
const KO = (e) => e.type === 'kill';
// combate
fam('kills', 'combat', [15, 20, 25, 30, 35, 40, 45, 60], n => 1200 + n * 30, KO);
fam('head', 'combat', [5, 8, 10, 12, 15, 20], n => 1200 + n * 80, e => KO(e) && e.head);
fam('double', 'combat', [1, 2, 3, 4, 5], n => 1300 + n * 300, e => e.type === 'double');
fam('triple', 'combat', [1, 2, 3], n => 2200 + n * 500, e => e.type === 'multi');
fam('streak', 'combat', [1, 2, 3, 4], n => 1400 + n * 400, e => e.type === 'streak');
fam('assist', 'combat', [4, 6, 8, 10, 12, 15], n => 1100 + n * 60, e => e.type === 'assist');
fam('melee', 'combat', [1, 2, 3, 4, 6], n => 1500 + n * 300, e => KO(e) && e.wpn === 'melee');
fam('nade', 'combat', [1, 2, 3, 4], n => 1500 + n * 350, e => KO(e) && e.wpn === 'frag');
fam('life5', 'combat', [1, 2, 3], n => 2000 + n * 500, e => KO(e) && e.streak === 5); // 5 derrubados sem morrer
for (const w of CATS6) fam('kw', 'combat', [6, 10, 14, 18, 25], n => 1200 + n * 50, e => KO(e) && e.wpn === w, w);
for (const w of ['pistol', 'smg', 'rifle', 'sniper']) fam('hw', 'combat', [2, 4, 6, 8], n => 1400 + n * 150, e => KO(e) && e.head && e.wpn === w, w);
// progresso
fam('part', 'prog', [1, 2, 3, 4], n => 1500 + n * 400, e => e.type === 'unlock' && e.slot !== 'body' && e.slot !== 'camo');
for (const w of CATS6) fam('pw', 'prog', [1, 2], n => 1700 + n * 400, e => e.type === 'unlock' && e.slot !== 'body' && e.slot !== 'camo' && e.wpn === w, w);
fam('body', 'prog', [1], () => 3000, e => e.type === 'unlock' && e.slot === 'body');
fam('camo', 'prog', [1, 2, 3], n => 1800 + n * 400, e => e.type === 'unlock' && e.slot === 'camo');
fam('wlvl', 'prog', [1, 2, 3, 4, 5], n => 1400 + n * 350, e => e.type === 'wpnUp');
for (const w of CATS6) fam('lw', 'prog', [1, 2, 3], n => 1500 + n * 400, e => e.type === 'wpnUp' && e.wpn === w, w);
// jogar
fam('match', 'play', [2, 3, 4, 5, 6, 8], n => 1100 + n * 250, e => e.type === 'match');
fam('maps', 'play', [2, 3, 4, 5], n => 1300 + n * 350, null); // mapas DIFERENTES (contado a parte)
fam('win', 'play', [1, 2, 3, 4, 5], n => 1300 + n * 450, e => e.type === 'win');
fam('flag', 'play', [1, 2, 3, 4], n => 1500 + n * 400, e => e.type === 'flagCap');
const MIS_BY = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
// Rodizio sem repetir (08/11, pedido dele: repetir com probabilidade baixissima). Cada grupo tem uma ordem embaralhada fixa, com
// familias diferentes em vizinhas; o dia anda por ela (3 de combate, 1 de progresso, 1 de partidas). Uma missao so volta depois de
// o grupo inteiro passar (sorteio por dia repetia a de ontem em 15% dos dias).
const MIS_PER = { combat: 3, prog: 1, play: 1 };
const MIS_ORDER = Object.fromEntries(Object.keys(MIS_PER).map(g => {
  const rnd = seeded('rr-missoes-' + g), bag = MISSIONS.filter(m => m.grp === g);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  const out = [], gap = MIS_PER[g] - 1;
  while (bag.length) { // proxima que nao repete a familia das ultimas do mesmo dia; no fim da fila aceita a que sobrou
    const i = bag.findIndex(m => !out.slice(-gap || out.length).some(x => gap && x.fam === m.fam));
    out.push(bag.splice(Math.max(0, i), 1)[0]);
  }
  return [g, out];
}));
function misPick(d) {
  const idx = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return Object.entries(MIS_PER).flatMap(([g, c]) => { const L = MIS_ORDER[g]; return Array.from({ length: c }, (_, k) => L[(idx * c + k) % L.length]); });
}
export function missionsToday() {
  const day = today();
  if (!data.mis || data.mis.day !== day) { data.mis = { day, prog: {}, done: {}, maps: {} }; save(); }
  return misPick(new Date()).map(m => ({ ...m, prog: Math.min(m.n, data.mis.prog[m.id] || 0), done: !!data.mis.done[m.id] }));
}
export const missionById = (id) => MIS_BY[id];
const SING = new Set(['double', 'melee', 'nade', 'triple', 'streak', 'life5', 'part', 'pw', 'camo', 'wlvl', 'lw', 'win', 'flag', 'body']);
export const misKey = (m) => m.key + (m.n === 1 && SING.has(m.key.slice(3)) ? '1' : ''); // singular de verdade (nada de 'peca(s)')

// registra um evento; devolve [{ kind: 'daily'|'career', id, tier, xp }] do que completou agora
export function track(e) {
  const got = [];
  for (const m of missionsToday()) {
    if (m.done) continue;
    if (m.fam === 'maps') { if (e.type !== 'match' || !e.map) continue; const L = (data.mis.maps[m.id] ||= []); if (L.includes(e.map)) continue; L.push(e.map); data.mis.prog[m.id] = L.length; }
    else if (m.ok(e)) data.mis.prog[m.id] = (data.mis.prog[m.id] || 0) + 1; else continue;
    if (data.mis.prog[m.id] >= m.n) { data.mis.done[m.id] = true; got.push({ kind: 'mission', id: m.id, xp: m.xp, wpn: m.wpn }); }
  }
  for (const c of dailyToday()) {
    if (c.done || !c.ok(e)) continue;
    data.daily[c.id] = (data.daily[c.id] || 0) + 1;
    if (data.daily[c.id] >= c.n) { data.done[c.id] = true; got.push({ kind: 'daily', id: c.id, xp: c.xp, wpn: c.wpn }); }
  }
  const el = eliteToday();
  if (!el.done) {
    const before = data.elite.prog;
    if (el.max) data.elite.prog = Math.max(data.elite.prog, el.max(e));
    else if (el.ok(e)) data.elite.prog++;
    if (data.elite.prog !== before) {
      if (data.elite.prog >= el.n) {
        data.elite.done = true;
        if (el.reward) data.bps[el.reward] = true;
        got.push({ kind: 'elite', id: el.id, xp: el.xp, reward: el.reward ? { slot: 'bp', id: el.reward, wpn: BLUEPRINTS[el.reward].wpn } : null });
      } else got.push({ kind: 'eliteProg', id: el.id, xp: 0, prog: data.elite.prog, n: el.n });
    }
  }
  for (const u of activeUnlocks()) {
    if (!u.ok(e)) continue;
    data.career[u.id] = (data.career[u.id] || 0) + 1;
    if (data.career[u.id] >= u.n) got.push({ kind: 'unlock', id: u.id, xp: u.xp, reward: u.reward });
  }
  save();
  return got;
}
