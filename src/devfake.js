// Conta falsa do localhost (08/11, pedido dele: "no localhost faca aparecer os conteudos como se eu estivesse logado").
// So existe no `npm run dev`: rovex.js so importa este arquivo dentro de `if (import.meta.env.DEV)`, entao o build de
// producao nem leva o codigo. Liga sozinho no dev sem login; `?semconta` desliga (testar visitante), `?zerar` limpa o estado.
// As rotas que precisam do servidor da Rovex respondem aqui com a MESMA logica do servidor (shared/shop.js e
// shared/blackmarket.js), com saldo, carteira e pecas guardados no localStorage (rr_fake_v1). `?peca` = peca em toda partida.
import { SHOP_ITEMS, shopPrice, zpCredit } from '../shared/shop.js';
import { BM_VARIANTS, BM_CHEST, BM_PIECES, BM_DROP, bmShowcase, bmPrice, bmRoll, bmRefund } from '../shared/blackmarket.js';

const KEY = 'rr_fake_v1', qs = new URLSearchParams(location.search);
const START = { zionsPoints: 368607, zions: 46490, itens: [], pecas: {}, sem: 0, ultimo: 0, zp: null, gift: false };
function load() {
  try { if (qs.has('zerar')) localStorage.removeItem(KEY); const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') return { ...START, ...s }; } catch { /* */ }
  return { ...START };
}
const S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ } };
const bal = () => ({ zionsPoints: S.zionsPoints, zions: S.zions });
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms)); // parece rede (a animacao do bau espera a resposta)

export const fakeMe = () => ({ id: 'dev', name: 'luizxvk', elite: true, email: 'dev@localhost', ...bal(), rrOwned: [...S.itens], fake: true });

export async function loja() { await wait(120); return { itens: [...S.itens], ...bal() }; }
export async function comprar(sku) {
  await wait();
  const it = SHOP_ITEMS[sku], preco = it ? shopPrice(sku) : undefined;
  if (!it || !Number.isFinite(preco) || preco <= 0) return { code: 'erro' };
  const faltam = it.give.filter(g => !S.itens.includes(g));
  if (!faltam.length) return { code: 'ja_tem' };
  if (S.zionsPoints < preco) return { code: 'sem_saldo', preco, saldo: S.zionsPoints };
  S.zionsPoints -= preco; S.itens.push(...faltam); save();
  return { ok: true, itens: [...S.itens], ...bal() };
}
export async function resgatar(sku) { await wait(); const it = SHOP_ITEMS[sku]; if (!it) return { code: 'erro' }; for (const g of it.give) if (!S.itens.includes(g)) S.itens.push(g); save(); return { ok: true, itens: [...S.itens] }; }
// presente do Elite (10/11): 4 variantes do Mercado Negro por mes, sem repetir (mesma regra da rota da Rovex)
export async function elitePresente() { await wait(); const mes = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7); S.eg ||= {}; if (S.eg[mes] || qs.has('semPresente')) return { novos: [], mes }; const tem = new Set(S.itens), livres = Object.keys(BM_VARIANTS).filter(id => !tem.has('bp:' + id)).sort(() => Math.random() - 0.5), novos = livres.slice(0, 4); S.eg[mes] = novos; for (const id of novos) S.itens.push('bp:' + id); save(); return { novos, mes, itens: [...S.itens] }; }
export async function instagram() { await wait(); if (S.ig) return { code: 'ja_resgatou', ...bal() }; S.ig = true; S.zionsPoints += 1000; save(); return { ok: true, total: 1000, ...bal() }; }
export async function presente() { await wait(); if (S.gift) return { code: 'ja_resgatou', ...bal() }; S.gift = true; S.zionsPoints += 1000; save(); return { ok: true, total: 1000, ...bal() }; }

// ---------- Mercado Negro (espelho de template-magazine/server/src/routes/rubberRiot.ts) ----------
const donos = () => new Set(S.itens.filter(i => i.startsWith('bp:bm_')).map(i => i.slice(3)));
function aplicarPeca(roll) {
  if (roll.dup) { const [a, b] = BM_CHEST.loot, zp = a + Math.floor(Math.random() * (b - a + 1)); S.zionsPoints += zp; return { id: roll.id, piece: roll.piece, dup: true, espolio: zp, completa: false }; }
  const arr = (S.pecas[roll.id] ||= Array(BM_PIECES).fill(false)); arr[roll.piece] = true;
  const completa = arr.filter(Boolean).length >= BM_PIECES && !S.itens.includes('bp:' + roll.id);
  if (completa) S.itens.push('bp:' + roll.id);
  return { id: roll.id, piece: roll.piece, dup: false, espolio: 0, completa };
}
export async function mercado() { await wait(150); return { vitrine: bmShowcase(Date.now()), itens: [...S.itens], pecas: S.pecas, agora: Date.now(), ...bal() }; }
export async function mercadoComprar(id) {
  await wait();
  const preco = bmPrice(id);
  if (!BM_VARIANTS[id] || !Number.isFinite(preco)) return { code: 'erro' };
  if (!bmShowcase(Date.now()).ids.includes(id)) return { code: 'fora_da_vitrine' };
  if (S.itens.includes('bp:' + id)) return { code: 'ja_tem' };
  if (S.zionsPoints < preco) return { code: 'sem_saldo', preco, saldo: S.zionsPoints };
  S.zionsPoints -= preco; S.itens.push('bp:' + id);
  const devolve = bmRefund(S.pecas, id); if (devolve > 0) { delete S.pecas[id]; S.zionsPoints += devolve; }
  save();
  return { ok: true, itens: [...S.itens], devolve, pecas: S.pecas, ...bal() };
}
export async function mercadoBau() {
  await wait(400);
  if (S.zionsPoints < BM_CHEST.zp) return { code: 'sem_saldo', preco: BM_CHEST.zp, saldo: S.zionsPoints };
  S.zionsPoints -= BM_CHEST.zp;
  const out = aplicarPeca(bmRoll(S.pecas, donos())); save();
  return { ok: true, ...out, itens: [...S.itens], pecas: S.pecas, ...bal() };
}
// fim de partida: Zions Points do zpCredit + peca com a mesma chance/protecao do servidor
export async function partida(won, ch) {
  await wait(300);
  const c = zpCredit(S.zp, { won, ch }, Date.now()); S.zp = c.state; S.zionsPoints += c.total;
  let peca = null; const agora = Date.now();
  if (qs.has('peca') || agora - S.ultimo >= BM_DROP.minGapMs) {
    S.ultimo = agora;
    if (qs.has('peca') || S.sem + 1 >= BM_DROP.pity || Math.random() < BM_DROP.chance) { S.sem = 0; peca = aplicarPeca(bmRoll(S.pecas, donos())); } else S.sem++;
  }
  save();
  return { ok: true, total: c.total, lines: c.lines, capped: c.capped, peca, ...bal() };
}
