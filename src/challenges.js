// Desafios: 3 diarios (sorteados pela data, trocam a meia-noite) + carreira em 3 niveis.
// Progresso fica salvo neste aparelho. track() devolve o que acabou de completar (pra dar XP e banner).
import { pushSoon } from './rovex.js';
import { BLUEPRINTS } from '../shared/weapons.js';
const KEY = 'rr_challenges_v1';

// tipo de evento: kill (wpn, head), assist, streak, win, match, flagCap
export const DAILY = [
  { id: 'kills', n: 25, xp: 1500, ok: (e) => e.type === 'kill' },
  { id: 'head', n: 10, xp: 1500, ok: (e) => e.type === 'kill' && e.head },
  { id: 'melee', n: 5, xp: 2000, ok: (e) => e.type === 'kill' && e.wpn === 'melee' },
  { id: 'pistol', n: 8, xp: 1500, wpn: 'pistol', ok: (e) => e.type === 'kill' && e.wpn === 'pistol' },
  { id: 'smg', n: 15, xp: 1500, wpn: 'smg', ok: (e) => e.type === 'kill' && e.wpn === 'smg' },
  { id: 'rifle', n: 15, xp: 1500, wpn: 'rifle', ok: (e) => e.type === 'kill' && e.wpn === 'rifle' },
  { id: 'shotgun', n: 10, xp: 1500, wpn: 'shotgun', ok: (e) => e.type === 'kill' && e.wpn === 'shotgun' },
  { id: 'sniper', n: 8, xp: 1800, wpn: 'sniper', ok: (e) => e.type === 'kill' && e.wpn === 'sniper' },
  { id: 'nade', n: 3, xp: 1800, ok: (e) => e.type === 'kill' && e.wpn === 'frag' },
  { id: 'assist', n: 8, xp: 1200, ok: (e) => e.type === 'assist' },
  { id: 'streak', n: 2, xp: 1800, ok: (e) => e.type === 'streak' },
  { id: 'win', n: 2, xp: 2000, ok: (e) => e.type === 'win' },
  { id: 'matches', n: 3, xp: 1000, ok: (e) => e.type === 'match' },
];
// Desbloqueios: cada desafio libera um item especial (camuflagem reativa, mira, arma apelona, faca).
// O item fica trancado no arsenal ate o desafio fechar (nao abre por nivel).
const K = (w) => (e) => e.type === 'kill' && (!w || e.wpn === w);
export const UNLOCKS = [
  { id: 'u_ember', n: 50, xp: 2000, ok: K(), reward: { slot: 'camo', id: 'ember' } },
  { id: 'u_inkreact', n: 100, xp: 4000, ok: (e) => e.type === 'kill' && e.head, reward: { slot: 'camo', id: 'inkreact' } },
  { id: 'u_sscope', n: 25, xp: 2500, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'sniper', reward: { slot: 'scope', id: 'sniper_scope_2', wpn: 'sniper' } },
  { id: 'u_fscope', n: 60, xp: 2500, ok: K('rifle'), reward: { slot: 'scope', id: 'fusil_scope_4', wpn: 'rifle' } },
  { id: 'u_handcannon', n: 40, xp: 3000, ok: K('pistol'), reward: { slot: 'body', id: 'pistol_3', wpn: 'pistol' } },
  { id: 'u_spitter', n: 75, xp: 3000, ok: K('smg'), reward: { slot: 'body', id: 'subfusil_5', wpn: 'smg' } },
  { id: 'u_heavy', n: 75, xp: 3000, ok: K('rifle'), reward: { slot: 'body', id: 'fusil_4', wpn: 'rifle' } },
  { id: 'u_bolt', n: 30, xp: 3000, ok: K('sniper'), reward: { slot: 'body', id: 'sniper_2', wpn: 'sniper' } },
  { id: 'u_splitter', n: 15, xp: 2000, ok: K('melee'), reward: { slot: 'body', id: 'melee_4', wpn: 'melee' } },
  { id: 'u_sword', n: 40, xp: 3500, ok: K('melee'), reward: { slot: 'body', id: 'melee_12', wpn: 'melee' } },
  { id: 'u_fang', n: 10, xp: 3000, ok: (e) => e.type === 'streak', reward: { slot: 'body', id: 'melee_13', wpn: 'melee' } },
  // tracados do tiro (equipados por arma no Arsenal; Giz e Nenhum ja vem abertos)
  { id: 'u_tr_fire', n: 20, xp: 1500, ok: K('shotgun'), reward: { slot: 'tracer', id: 'tr:fire' } },
  { id: 'u_tr_ink', n: 15, xp: 1500, ok: (e) => e.type === 'assist', reward: { slot: 'tracer', id: 'tr:ink' } },
  { id: 'u_tr_spark', n: 40, xp: 1500, ok: K('smg'), reward: { slot: 'tracer', id: 'tr:spark' } },
  { id: 'u_tr_rainbow', n: 5, xp: 2500, ok: (e) => e.type === 'win', reward: { slot: 'tracer', id: 'tr:rainbow' } },
  { id: 'u_tr_void', n: 50, xp: 2500, ok: (e) => e.type === 'kill' && e.head, reward: { slot: 'tracer', id: 'tr:void' } },
  { id: 'u_tr_toxic', n: 5, xp: 2000, ok: K('frag'), reward: { slot: 'tracer', id: 'tr:toxic' } },
  { id: 'u_tr_gold', n: 20, xp: 3000, ok: (e) => e.type === 'streak', reward: { slot: 'tracer', id: 'tr:gold' } },
  { id: 'u_tr_ice', n: 25, xp: 2000, ok: K('sniper'), reward: { slot: 'tracer', id: 'tr:ice' } },
];
// Desafio de ELITE: 1 por dia (sorteado pela data), dificil, vale muito XP e da a proxima variante de elite
// que o jogador ainda nao tem (arma montada + camo lendaria). Com todas na mao, so o XP.
// max: o progresso e o maior valor visto (ex.: sequencia sem cair), nao uma soma.
export const ELITE = [
  { id: 'e_head', n: 40, xp: 8000, ok: (e) => e.type === 'kill' && e.head },
  { id: 'e_streak', n: 12, xp: 9000, max: (e) => (e.type === 'kill' ? e.streak || 0 : -1) },
  { id: 'e_multi', n: 6, xp: 8500, ok: (e) => e.type === 'multi' },
  { id: 'e_melee', n: 15, xp: 8000, ok: K('melee') },
  { id: 'e_sniperhead', n: 15, xp: 9000, ok: (e) => e.type === 'kill' && e.head && e.wpn === 'sniper' },
  { id: 'e_wins', n: 5, xp: 8500, ok: (e) => e.type === 'win' },
  { id: 'e_nuke', n: 1, xp: 10000, ok: (e) => e.type === 'streak' && e.kind === 'nuke' },
  { id: 'e_kills', n: 120, xp: 8000, ok: K() },
];
export const BP_ORDER = Object.keys(BLUEPRINTS);
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

// item -> desafio que libera (o arsenal consulta isso)
export const LOCKED_BY = Object.fromEntries(UNLOCKS.map(u => [u.reward.id, u]));
export const unlockDone = (id) => (data.career[id] || 0) >= (UNLOCKS.find(u => u.id === id)?.n ?? Infinity);
// rotacao: so ACTIVE desafios de desbloqueio contam por vez; fechou um, entra o proximo da fila.
// Ordem intercalada (camo, tracado, arma, faca...) pra variar.
const ACTIVE = 4;
const ORDER = ['u_ember', 'u_tr_fire', 'u_handcannon', 'u_splitter', 'u_tr_ink', 'u_sscope', 'u_spitter', 'u_tr_spark', 'u_inkreact', 'u_heavy',
  'u_tr_void', 'u_fang', 'u_fscope', 'u_tr_toxic', 'u_bolt', 'u_tr_rainbow', 'u_sword', 'u_tr_gold', 'u_tr_ice'];
const ordered = () => [...ORDER.map(id => UNLOCKS.find(u => u.id === id)).filter(Boolean), ...UNLOCKS.filter(u => !ORDER.includes(u.id))];
export function activeUnlocks() { return ordered().filter(u => (data.career[u.id] || 0) < u.n).slice(0, ACTIVE); }
export const unlockActive = (id) => activeUnlocks().some(u => u.id === id);
export const unlockProg = (id) => { const u = UNLOCKS.find(x => x.id === id); return u ? Math.min(1, (data.career[id] || 0) / u.n) : 1; };

const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }

let data = load();
function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  return { day: d.day || '', daily: d.daily || {}, done: d.done || {}, career: d.career || {}, elite: d.elite || {}, bps: d.bps || {} };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* */ } pushSoon(); }

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

// registra um evento; devolve [{ kind: 'daily'|'career', id, tier, xp }] do que completou agora
export function track(e) {
  const got = [];
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
