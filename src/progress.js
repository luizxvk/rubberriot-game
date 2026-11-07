// Progressao: XP do jogador (nivel 1..250) e de cada CORPO de arma (modelo, nivel 1..20; cada um o seu).
// Pecas do Arsenal e camuflagens desbloqueiam por nivel. Fica salvo neste aparelho.
import { LOCKED_BY, unlockDone, bpOwned, legendOwned, gifted, wasUnlocked } from './challenges.js';
import { shopOwned } from './shopstore.js';
import { pushSoon, me as rovexMe } from './rovex.js';
import { PASS, PASS_PER, PASS_MAX, PASS_FREE } from './pass.js';
import { CAMOS } from './camos.js';
const KEY = 'rr_progress_v1';
export const DEBUG = !!import.meta.env.DEV;
export const MAX_LEVEL = 250; // 07/11 (pedido dele): conta vai ate 250, depois prestigia e volta pro 1
export const MAX_WPN_LEVEL = 30; // 04/11 (hotfix, pedido dele): progressao mais longa (era 20)
export const MAX_PRESTIGE = 10;

// 29/10: ganhos cortados ~45% (subia de nivel facil demais). A curva ficou igual: quem ja tem nivel nao perde.
export const XP = { kill: 55, assist: 25, head: 20, streak: 80, flagCap: 170, flagReturn: 40, zone: 80, win: 250, match: 100, survive: 30, plant: 140, defuse: 170, roundWin: 55, revive: 60, blimpDown: 150 };

// xp acumulado pra chegar no nivel n
// prestigio (04/11, pedido dele, igual COD): cada prestigio deixa a subida mais cara, +15% de XP por nivel (o 10o = +150%).
// A curva fica gravada na hora de prestigiar (data.pk): quem esta no meio de um prestigio nao perde nivel com a mudanca
export const PRESTIGE_XP = 0.15;
// 07/11: ate o 55 a curva de sempre (ninguem perde nivel); do 56 ao 250 cada nivel custa LV_STEP fixo (a curva quadratica ia a 5,7 milhoes)
export const LV_STEP = 6000;
const lvBase = (n) => 600 * (n - 1) + 90 * (n - 1) ** 2;
export const levelXp = (n) => n <= 1 ? 0 : Math.round((n <= 55 ? lvBase(n) : lvBase(55) + LV_STEP * (n - 55)) * (data?.pk || 1));
export const wpnLevelXp = (n) => n <= 1 ? 0 : Math.round(550 * (n - 1) + 40 * (n - 1) ** 2);

let data = load();
const listeners = new Set();

function load() {
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  // desbloquear tudo e debug nosso: so vale no vite dev (npm run dev); na build sai sempre desligado
  // meta = set Ouro da Borracha ganho (semana em que a comunidade bateu a meta); st = estatisticas do Perfil
  // lg = XP das armas na hora da progressao nova (04/11): o que ja estava aberto na regra antiga continua aberto
  return { lg: d.lg && typeof d.lg === 'object' ? d.lg : { ...(d.wpn || {}) }, passXp: d.passXp || 0, st: d.st && typeof d.st === 'object' ? d.st : {}, meta: d.meta && Number.isInteger(d.meta.week) ? d.meta : null, xp: d.xp || 0, wpn: d.wpn || {}, unlockAll: DEBUG && !!d.unlockAll, kills: d.kills || 0, matches: d.matches || 0, prestige: Math.max(0, Math.min(MAX_PRESTIGE, d.prestige | 0)), rp: Math.max(0, d.rp | 0), rkPeak: Number.isInteger(d.rkPeak) ? d.rkPeak : -1, rkGames: d.rkGames | 0, boost: boostLoad(d.boost), pk: Number(d.pk) >= 1 ? Math.min(1 + PRESTIGE_XP * MAX_PRESTIGE, Number(d.pk)) : 1 };
}
// fichas de XP em dobro (06/11, pedido dele): n = fichas no Bolso, ms = tempo que falta da ficha ativa (so anda em partida),
// mo = meses em que o Elite ja recebeu as 6 do mes, pg = niveis do Pass que ja pagaram a ficha extra
function boostLoad(b) { b = b && typeof b === 'object' ? b : {}; return { n: Math.max(0, b.n | 0), ms: Math.max(0, +b.ms || 0), mo: Array.isArray(b.mo) ? b.mo.slice(-24) : [], pg: Array.isArray(b.pg) ? b.pg : [] }; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* */ } pushSoon(); }

export function level(xp = data.xp) { let n = 1; while (n < MAX_LEVEL && xp >= levelXp(n + 1)) n++; return n; }
// Nivel por corpo: o XP vai pro modelo equipado da categoria (data.wpn[idDoCorpo]). Pecas e camos abrem pelo
// nivel desse corpo; um corpo novo da lista abre pelo MELHOR corpo da categoria (senao ninguem saia do modelo 1).
let bodyOf = () => null, bodiesOf = () => [];
export function setBodyResolver(cur, all) {
  bodyOf = cur; bodiesOf = all;
  // migracao: XP antigo guardado por categoria vai pro corpo que esta equipado nela
  let moved = false;
  for (const k of Object.keys(data.wpn)) {
    const list = bodiesOf(k);
    if (!list.length || list.includes(k)) continue;
    const b = bodyOf(k) || list[0];
    data.wpn[b] = (data.wpn[b] || 0) + data.wpn[k]; delete data.wpn[k]; moved = true;
  }
  if (moved) save();
}
const keyOf = (w, body) => body || (w && bodyOf(w)) || w;
const lvOf = (xp) => { let n = 1; while (n < MAX_WPN_LEVEL && xp >= wpnLevelXp(n + 1)) n++; return n; };
export function wpnLevel(w, body) { return lvOf(data.wpn[keyOf(w, body)] || 0); }
export const catLevel = (w) => Math.max(wpnLevel(w), ...bodiesOf(w).map(b => lvOf(data.wpn[b] || 0)));
// set da meta da comunidade (Ouro da Borracha): fica no save pra sempre
export const metaOwned = () => !!data.meta || !!data.unlockAll;
export function grantMeta(week) { if (data.meta) return false; data.meta = { week, at: Date.now() }; save(); return true; }

// estatisticas do Perfil (31/10): soma (statAdd) e recorde (statMax)
export function statAdd(k, n = 1) { if (!n) return; data.st[k] = (data.st[k] || 0) + n; save(); }
export function statMax(k, v) { if (v > (data.st[k] || 0)) { data.st[k] = v; save(); } }
export function stats() {
  let fav = null, fx = 0; for (const [k, v] of Object.entries(data.wpn || {})) if (v > fx) { fx = v; fav = k; } // arma (modelo) com mais XP
  return { ...data.st, kills: data.kills || 0, matches: data.matches || 0, fav, rp: data.rp || 0, meta: !!data.meta };
}

export function progressInfo() {
  const lv = level(), cur = levelXp(lv), next = levelXp(Math.min(MAX_LEVEL, lv + 1));
  return { level: lv, xp: data.xp, into: data.xp - cur, need: Math.max(1, next - cur), max: lv >= MAX_LEVEL, unlockAll: data.unlockAll,
    prestige: data.prestige, pk: data.pk || 1, unlockLevel: unlockLevel(), canPrestige: lv >= MAX_LEVEL && data.prestige < MAX_PRESTIGE };
}
// Prestigio: no nivel maximo volta pro 1 e ganha uma estrela (ate 10). Nada que ja abriu fecha de novo:
// desbloqueio por nivel do jogador olha o "nivel de desbloqueio" (prestigiado = maximo).
export const unlockLevel = () => data.prestige > 0 ? MAX_LEVEL : level();
export function doPrestige() {
  if (level() < MAX_LEVEL || data.prestige >= MAX_PRESTIGE) return false;
  data.prestige++; data.xp = 0; data.pk = 1 + PRESTIGE_XP * data.prestige; save();
  emit({ kind: 'prestige', prestige: data.prestige });
  return true;
}
export function wpnInfo(w, body) {
  const lv = wpnLevel(w, body), xp = data.wpn[keyOf(w, body)] || 0, cur = wpnLevelXp(lv), next = wpnLevelXp(Math.min(MAX_WPN_LEVEL, lv + 1));
  return { level: lv, into: xp - cur, need: Math.max(1, next - cur), max: lv >= MAX_WPN_LEVEL };
}

// rankeada (31/10): pontos de rank (rp), maior faixa ja alcancada (rkPeak, -1 = nunca jogou) e partidas
export const rankData = () => ({ rp: data.rp, peak: data.rkPeak, games: data.rkGames });
export function rankApply(delta, tierOf) {
  const before = data.rp, peakBefore = data.rkPeak;
  data.rp = Math.max(0, data.rp + delta); data.rkGames++;
  data.rkPeak = Math.max(data.rkPeak, tierOf(data.rp));
  save(); emit({ kind: 'rank' });
  return { before, after: data.rp, newPeak: data.rkPeak > peakBefore ? data.rkPeak : -1 };
}
export function setUnlockAll(v) { data.unlockAll = DEBUG && !!v; save(); emit({ kind: 'unlock' }); }
export function onProgress(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(ev) { for (const fn of listeners) fn(ev); }

// ganha XP; devolve o que subiu de nivel pra mostrar na tela
// wpnAmount: XP que vai pra arma (Noite dos Borroes: a arma ganha cheio, o jogador ganha menos); body: modelo usado
export function addXp(kind, amount = XP[kind] || 0, wpn = null, body = null, wpnAmount = amount) {
  if (!amount && !wpnAmount) return;
  const key = wpn ? keyOf(wpn, body) : null, cBefore = wpn ? catLevel(wpn) : 0;
  const before = level(), wBefore = wpn ? wpnLevel(wpn, body) : 0, passFrom = passLevel(), freeFrom = passTrack(), mBefore = key ? masteryDone(key) : true;
  data.xp += amount;
  data.passXp = (data.passXp || 0) + amount; // Rovex Pass: todo mundo sobe; o premium so abre com o Elite (e quem assina depois leva o que ja passou)
  if (key) data.wpn[key] = (data.wpn[key] || 0) + wpnAmount;
  if (kind === 'kill') data.kills++;
  if (kind === 'match') data.matches++;
  if (['head', 'assist', 'win', 'streak'].includes(kind)) data.st[kind] = (data.st[kind] || 0) + 1; // Perfil
  save();
  const after = level(), wAfter = wpn ? wpnLevel(wpn, body) : 0, cAfter = wpn ? catLevel(wpn) : 0;
  const passTo = passLevel();
  emit({ mastery: !mBefore && masteryDone(key) ? key : null, passUp: passTo > passFrom ? passTo : 0, passFrom, freeFrom, freeTo: passTrack(), kind, amount, wpn, body: key, levelUp: after > before ? after : 0, wpnUp: wAfter > wBefore ? wAfter : 0, levelFrom: before, wpnFrom: wBefore, catUp: cAfter > cBefore ? cAfter : 0, catFrom: cBefore });
}

// ---------- desbloqueios ----------
// peca na posicao i da lista da categoria abre no nivel da arma 1 + i*1.5 (a primeira ja vem aberta)
// bocal (02/11, pedido dele): entra no nivel da arma como as outras pecas (antes vinha tudo aberto)
// 04/11 (hotfix, pedido dele): "no inicio to desbloqueando tudo". Cada tipo de peca tem o seu passo e comeca num nivel
// diferente, entao quase todo nivel abre UMA coisa nova e o fim fica la no 30. [primeira, passo]
export const MUZZLE_LVL = { comp: 5, flash: 10, brake: 15, silencer: 21, silencer2: 27 };
// municao (05/11, pedido dele): sai do progresso da arma, nao mais de desafio
export const AMMO_LVL = { fire: 7, slug: 9, trace: 12, boom: 17, ap: 23 };
const STEP = { scope: [2, 3], handle: [3, 4], charger: [4, 4], laser: [6, 5], body: [2, 3] };
const slotOf = (id) => !id ? 'body' : /scope/.test(id) ? 'scope' : /laser/.test(id) ? 'laser' : /handle|akimbo|^gd_/.test(id) ? 'handle' : /charg|drum|_ext_/.test(id) ? 'charger' : 'body';
export function partReq(i, id) { if (i <= 0) return 1; const [a, b] = STEP[slotOf(id)]; return Math.min(MAX_WPN_LEVEL, a + (i - 1) * b); }
// regra antiga (curva, passo 1,5 e bocais), so pro que a conta ja tinha aberto antes do hotfix
const OLD_MZ = { comp: 3, flash: 6, brake: 9, silencer: 13, silencer2: 16 };
const oldLv = (xp) => { let n = 1; while (n < 20 && xp >= Math.round(350 * n + 40 * n ** 2)) n++; return n; };
function hadOld(wpn, i, id) {
  const L = data.lg || {}, w = oldLv(L[keyOf(wpn)] || 0);
  if (id && id.startsWith('mz:')) return w >= (OLD_MZ[id.slice(3)] || 1);
  const need = i <= 0 ? 1 : Math.min(20, 1 + Math.ceil(i * 1.5));
  if (id && bodiesOf(wpn).includes(id)) return Math.max(w, ...bodiesOf(wpn).map(b => oldLv(L[b] || 0))) >= need;
  return w >= need;
}
export const bpUnlocked = (id) => !!data.unlockAll || bpOwned(id);
// modelo que so abre num nivel de JOGADOR (01/11, pedido dele): Liquidificador no 40
export const BODY_MIN_LVL = { shotgun_3: 40, melee_17: 30, melee_18: 35, // Katana: nivel 30 do jogador; Sabre de Neon: 35 (04/11)
  // 07/11 (pedido dele): toda lamina com nivel do JOGADOR (o Facao, padrao, e livre; as de desafio seguem pelo desafio)
  melee_0: 3, melee_1: 5, melee_3: 8, melee_5: 10, melee_6: 12, melee_9: 15, melee_11: 18, melee_14: 22 };
export const CANTED_LVL = 8; // mira de 45 graus (05/11, pedido dele)
export function partUnlocked(wpn, i, id) {
  if (id === 'canted') return !!data.unlockAll || wpnLevel(wpn) >= CANTED_LVL;
  const own = id && LOCKED_BY[wpn + ':' + id]; // peca com desafio proprio nesta arma (akimbo da Espirro/Cuspideira)
  if (own) return !!data.unlockAll || unlockDone(own.id);
  if (id && BODY_MIN_LVL[id]) return !!data.unlockAll || unlockLevel() >= BODY_MIN_LVL[id];
  if (data.unlockAll || gifted(id) || wasUnlocked(id)) return true; // presente do treino / desafio antigo ja fechado
  if (id && LOCKED_BY[id]) return unlockDone(LOCKED_BY[id].id);
  if (id && id.startsWith('tr:')) return true; // tracado sem desafio (giz/nenhum)
  if (id && id.startsWith('am:')) return wpnLevel(wpn) >= (AMMO_LVL[id.slice(3)] || 1) || (id === 'am:slug' && !!data.lg?.[keyOf(wpn)]); // balote ja era aberto pra quem usava a escopeta
  if (id && id.startsWith('mz:')) return wpnLevel(wpn) >= (MUZZLE_LVL[id.slice(3)] || 1) || hadOld(wpn, i, id);
  if (id && bodiesOf(wpn).includes(id)) return catLevel(wpn) >= partReq(i, id) || hadOld(wpn, i, id); // corpo novo: pelo melhor corpo
  return wpnLevel(wpn) >= partReq(i, id) || hadOld(wpn, i, id);
}
// quanto falta pra um requisito (0..1): nivel da arma e/ou do jogador
export function reqProgress(wpn, req) {
  const fr = [];
  if (req.wpn) fr.push(Math.min(1, (data.wpn[keyOf(wpn)] || 0) / Math.max(1, wpnLevelXp(req.wpn))));
  if (req.player) fr.push(Math.min(1, data.xp / Math.max(1, levelXp(req.player))));
  return fr.length ? Math.min(...fr) : 1;
}

// Rovex Pass (04/11): nivel 0 ate fechar o primeiro passo
export const passOn = () => !!data.unlockAll || !!rovexMe?.elite; // so o Elite da Rovex ativa
export const passTrack = () => Math.min(PASS_MAX, Math.floor((data.passXp || 0) / PASS_PER)); // nivel na trilha, com ou sem Elite
export const passLevel = () => (passOn() ? passTrack() : 0); // nivel que vale pro premium
export const passInfo = () => ({ on: passOn(), level: passTrack(), into: (data.passXp || 0) % PASS_PER, need: PASS_PER });
export const passHasDance = (id) => { const i = PASS.findIndex(x => x.k === 'dance' && x.id === id); return i >= 0 && passLevel() > i; };
const freeHas = (test) => Object.entries(PASS_FREE).some(([n, p]) => test(p) && passTrack() >= +n);
export const passHasBanner = (id) => { const i = PASS.findIndex(x => x.k === 'banner' && x.id === id); return !!data.unlockAll || (i >= 0 && passLevel() > i) || freeHas(p => p.k === 'banner' && p.id === id); };
export const passHasLook = (slot, id) => { const i = PASS.findIndex(x => x.k === 'look' && x.slot === slot && x.id === id); return !!data.unlockAll || (i >= 0 && passLevel() > i) || freeHas(p => p.k === 'look' && p.slot === slot && p.id === id); };
export function camoUnlocked(wpn, camo) {
  if (camo.acct) return !!data.unlockAll || !!rovexMe; // so de quem tem conta Rovex: nem presente, nem desafio, nem Loja
  if (camo.pass) return !!data.unlockAll || passLevel() >= camo.pass; // so do Rovex Pass
  if (camo.shop) return !!data.unlockAll || shopOwned('camo:' + camo.id); // so da Loja (03/11): nem presente do treino, nem desafio, nem nivel
  if (data.unlockAll || gifted(camo.id)) return true; // presente do treino vale em todas as armas
  if (camo.meta) return metaOwned(); // lendaria da meta da comunidade
  if (camo.legend) return legendOwned(camo.id); // lendaria: so com a variante de elite
  if (camo.elite) return !!rovexMe?.elite;     // exclusiva do Elite da Rovex
  if (camo.prestige) return data.prestige >= camo.prestige; // exclusiva de quem prestigiou
  if (camo.rank != null) return data.rkPeak >= camo.rank; // premio da rankeada

  if (LOCKED_BY[camo.id]) return unlockDone(LOCKED_BY[camo.id].id);
  if (!camo.req) return true;
  if (camo.req.wpn && wpnLevel(wpn) < camo.req.wpn) return false;
  if (camo.req.player && unlockLevel() < camo.req.player) return false;
  return true;
}

// ---------- mestre da arma (07/11, pedido dele) ----------
// Modelo no nivel maximo + todas as camuflagens de progresso dele abertas (nivel da arma, nivel da conta e desafio; Loja, Pass,
// Elite, rankeada, lendaria e prestigio nao contam). Premio: banner-poster com a foto da arma e o chaveiro de ouro dela
export function masteryDone(body) {
  if (data.unlockAll) return true;
  if (lvOf(data.wpn[body] || 0) < MAX_WPN_LEVEL) return false;
  for (const c of CAMOS) {
    if (c.id === 'none' || c.acct || c.pass || c.shop || c.meta || c.legend || c.elite || c.prestige || c.rank != null) continue;
    if (LOCKED_BY[c.id]) { if (!unlockDone(LOCKED_BY[c.id].id)) return false; continue; }
    if (c.req?.wpn && lvOf(data.wpn[body] || 0) < c.req.wpn) return false;
    if (c.req?.player && unlockLevel() < c.req.player) return false;
  }
  return true;
}

// ---------- consumiveis: ficha de XP em dobro (06/11, aprovado por ele) ----------
// Elite: 6 fichas por mes com o Elite ativo (a Rovex so diz se esta ativo; o mes e o do aparelho). Pass: ficha EXTRA nos niveis
// 10/20/30/40/50 da trilha Elite e 15/35 da gratis (nenhum premio sai). Cada ficha = 1 hora de PARTIDA (o relogio so anda jogando).
export const BOOST_MS = 3600e3, BOOST_ELITE = 6, BOOST_PASS_ELITE = [10, 20, 30, 40, 50], BOOST_PASS_FREE = [15, 35];
const monthKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
export function boostSync() {
  const B = data.boost; let got = 0;
  if (rovexMe?.elite) { const m = monthKey(); if (!B.mo.includes(m)) { B.mo.push(m); B.n += BOOST_ELITE; got += BOOST_ELITE; } }
  const tr = passTrack();
  for (const l of BOOST_PASS_ELITE) if (passOn() && tr >= l && !B.pg.includes('e' + l)) { B.pg.push('e' + l); B.n++; got++; }
  for (const l of BOOST_PASS_FREE) if (tr >= l && !B.pg.includes('f' + l)) { B.pg.push('f' + l); B.n++; got++; }
  if (got) { save(); emit({ kind: 'boost', got }); }
  return got;
}
export const boostInfo = () => ({ n: data.boost.n, ms: data.boost.ms, active: data.boost.ms > 0 });
// usar: com uma ja rodando, soma mais 1 hora (nada se perde)
export function boostUse() { const B = data.boost; if (B.n <= 0) return false; B.n--; B.ms += BOOST_MS; save(); emit({ kind: 'boost' }); return true; }
let boostSaved = 0;
export function boostTick(ms) {
  const B = data.boost; if (B.ms <= 0) return;
  B.ms = Math.max(0, B.ms - ms);
  if (B.ms === 0 || Math.abs(boostSaved - B.ms) > 15000) { boostSaved = B.ms; save(); } // grava de 15 em 15 s (e quando acaba)
  if (B.ms === 0) emit({ kind: 'boost', ended: true });
}
