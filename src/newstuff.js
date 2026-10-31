// Pill NOVO (pedido dele 31/10): tudo que abriu desde a ultima olhada ganha a marca ate o jogador ver a lista
// onde o item mora. Guarda o que ja estava aberto (known) e o que abriu depois e ainda nao foi visto (fresh).
// Chave: 'arsenal|<arma>|<slot>|<id>' ou 'look|<aba>|<id>'. Primeira vez no aparelho: tudo que ja esta aberto
// vira conhecido (sem chuva de NOVO).
const KEY = 'rr_new_v1';
let st = null;
function load() {
  if (st) return st;
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.known)) st = { known: new Set(d.known), fresh: new Set(d.fresh || []) }; } catch { /* sem storage */ }
  return st;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify({ known: [...st.known], fresh: [...st.fresh] })); } catch { /* */ } }

// keys = tudo que esta aberto agora
export function syncOpen(keys) {
  const first = !load();
  if (first) st = { known: new Set(), fresh: new Set() };
  let changed = first;
  for (const k of keys) if (!st.known.has(k)) { st.known.add(k); if (!first) st.fresh.add(k); changed = true; }
  if (changed) save();
}
export const isNew = (k) => !!load()?.fresh.has(k);
export const anyNew = (prefix) => { const s = load(); if (!s) return false; for (const k of s.fresh) if (k.startsWith(prefix)) return true; return false; };
// viu a lista: as marcas daquele pedaco saem (aparecem nesta vez, somem na proxima)
export function markSeen(prefix) {
  const s = load(); if (!s) return;
  let ch = false;
  for (const k of [...s.fresh]) if (k.startsWith(prefix)) { s.fresh.delete(k); ch = true; }
  if (ch) save();
}
export const newPill = (txt) => `<span class="ch-new nw">${txt}</span>`;
