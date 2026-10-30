// Progressao: XP do jogador (nivel 1..55) e de cada arma (nivel 1..20).
// Pecas do Arsenal e camuflagens desbloqueiam por nivel. Fica salvo neste aparelho.
import { LOCKED_BY, unlockDone, bpOwned, legendOwned } from './challenges.js';
import { pushSoon, me as rovexMe } from './rovex.js';
const KEY = 'rr_progress_v1';
export const DEBUG = !!import.meta.env.DEV;
export const MAX_LEVEL = 55;
export const MAX_WPN_LEVEL = 20;
export const MAX_PRESTIGE = 10;

// 29/10: ganhos cortados ~45% (subia de nivel facil demais). A curva ficou igual: quem ja tem nivel nao perde.
export const XP = { kill: 55, assist: 25, head: 20, streak: 80, flagCap: 170, flagReturn: 40, zone: 80, win: 250, match: 100, survive: 30, plant: 140, defuse: 170, roundWin: 55, revive: 60 };

// xp acumulado pra chegar no nivel n
export const levelXp = (n) => n <= 1 ? 0 : Math.round(600 * (n - 1) + 90 * (n - 1) ** 2);
export const wpnLevelXp = (n) => n <= 1 ? 0 : Math.round(350 * (n - 1) + 40 * (n - 1) ** 2);

let data = load();
const listeners = new Set();

function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  // desbloquear tudo e debug nosso: so vale no vite dev (npm run dev); na build sai sempre desligado
  return { xp: d.xp || 0, wpn: d.wpn || {}, unlockAll: DEBUG && !!d.unlockAll, kills: d.kills || 0, matches: d.matches || 0, prestige: Math.max(0, Math.min(MAX_PRESTIGE, d.prestige | 0)) };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* */ } pushSoon(); }

export function level(xp = data.xp) { let n = 1; while (n < MAX_LEVEL && xp >= levelXp(n + 1)) n++; return n; }
export function wpnLevel(w) { const xp = data.wpn[w] || 0; let n = 1; while (n < MAX_WPN_LEVEL && xp >= wpnLevelXp(n + 1)) n++; return n; }
export function progressInfo() {
  const lv = level(), cur = levelXp(lv), next = levelXp(Math.min(MAX_LEVEL, lv + 1));
  return { level: lv, xp: data.xp, into: data.xp - cur, need: Math.max(1, next - cur), max: lv >= MAX_LEVEL, unlockAll: data.unlockAll,
    prestige: data.prestige, unlockLevel: unlockLevel(), canPrestige: lv >= MAX_LEVEL && data.prestige < MAX_PRESTIGE };
}
// Prestigio: no nivel maximo volta pro 1 e ganha uma estrela (ate 10). Nada que ja abriu fecha de novo:
// desbloqueio por nivel do jogador olha o "nivel de desbloqueio" (prestigiado = maximo).
export const unlockLevel = () => data.prestige > 0 ? MAX_LEVEL : level();
export function doPrestige() {
  if (level() < MAX_LEVEL || data.prestige >= MAX_PRESTIGE) return false;
  data.prestige++; data.xp = 0; save();
  emit({ kind: 'prestige', prestige: data.prestige });
  return true;
}
export function wpnInfo(w) {
  const lv = wpnLevel(w), xp = data.wpn[w] || 0, cur = wpnLevelXp(lv), next = wpnLevelXp(Math.min(MAX_WPN_LEVEL, lv + 1));
  return { level: lv, into: xp - cur, need: Math.max(1, next - cur), max: lv >= MAX_WPN_LEVEL };
}

export function setUnlockAll(v) { data.unlockAll = DEBUG && !!v; save(); emit({ kind: 'unlock' }); }
export function onProgress(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(ev) { for (const fn of listeners) fn(ev); }

// ganha XP; devolve o que subiu de nivel pra mostrar na tela
export function addXp(kind, amount = XP[kind] || 0, wpn = null) {
  if (!amount) return;
  const before = level(), wBefore = wpn ? wpnLevel(wpn) : 0;
  data.xp += amount;
  if (wpn) data.wpn[wpn] = (data.wpn[wpn] || 0) + amount;
  if (kind === 'kill') data.kills++;
  if (kind === 'match') data.matches++;
  save();
  const after = level(), wAfter = wpn ? wpnLevel(wpn) : 0;
  emit({ kind, amount, wpn, levelUp: after > before ? after : 0, wpnUp: wAfter > wBefore ? wAfter : 0, levelFrom: before, wpnFrom: wBefore });
}

// ---------- desbloqueios ----------
// peca na posicao i da lista da categoria abre no nivel da arma 1 + i*1.5 (a primeira ja vem aberta)
export function partReq(i) { return i <= 0 ? 1 : Math.min(MAX_WPN_LEVEL, 1 + Math.ceil(i * 1.5)); }
export const bpUnlocked = (id) => !!data.unlockAll || bpOwned(id);
export function partUnlocked(wpn, i, id) {
  if (data.unlockAll) return true;
  if (id && LOCKED_BY[id]) return unlockDone(LOCKED_BY[id].id);
  if (id && id.startsWith('tr:')) return true; // tracado sem desafio (giz/nenhum)
  if (id && id.startsWith('am:')) return true;  // bala normal
  return wpnLevel(wpn) >= partReq(i);
}
// quanto falta pra um requisito (0..1): nivel da arma e/ou do jogador
export function reqProgress(wpn, req) {
  const fr = [];
  if (req.wpn) fr.push(Math.min(1, (data.wpn[wpn] || 0) / Math.max(1, wpnLevelXp(req.wpn))));
  if (req.player) fr.push(Math.min(1, data.xp / Math.max(1, levelXp(req.player))));
  return fr.length ? Math.min(...fr) : 1;
}

export function camoUnlocked(wpn, camo) {
  if (data.unlockAll) return true;
  if (camo.legend) return legendOwned(camo.id); // lendaria: so com a variante de elite
  if (camo.elite) return !!rovexMe?.elite;     // exclusiva do Elite da Rovex
  if (camo.prestige) return data.prestige >= camo.prestige; // exclusiva de quem prestigiou

  if (LOCKED_BY[camo.id]) return unlockDone(LOCKED_BY[camo.id].id);
  if (!camo.req) return true;
  if (camo.req.wpn && wpnLevel(wpn) < camo.req.wpn) return false;
  if (camo.req.player && unlockLevel() < camo.req.player) return false;
  return true;
}
