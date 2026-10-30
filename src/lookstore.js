// Visual do proprio boneco: localStorage (espelhado na conta Rovex pelo save) + desbloqueio.
import { LOOKS, DEFAULT_LOOK, cleanLook } from '../shared/looks.js';
import { unlockLevel, progressInfo } from './progress.js';
import { unlockDone } from './challenges.js';
import { me as rovexMe } from './rovex.js';

const KEY = 'rr_look_v1';
export function getLook() {
  let l = null; try { l = JSON.parse(localStorage.getItem(KEY)); } catch { /* sem storage */ }
  return cleanLook(l || DEFAULT_LOOK);
}
export function saveLook(l) { try { localStorage.setItem(KEY, JSON.stringify(cleanLook(l))); } catch { /* sem storage */ } }

// item liberado? nivel do jogador (com prestigio conta o maximo) ou Elite da Rovex
export function lookOpen(slot, id) {
  const it = LOOKS[slot]?.find(i => i.id === id);
  if (!it) return false;
  if (it.elite) return !!rovexMe?.elite;
  if (it.ch) return unlockDone(it.ch) || !!progressInfo().unlockAll;
  return unlockLevel() >= (it.lvl || 1);
}

// na partida so vale o que esta liberado (o salvo fica intacto: o Elite pode voltar)
export function wornLook() {
  const l = getLook(), out = { ...l };
  for (const k of Object.keys(out)) if (!lookOpen(k, out[k])) out[k] = DEFAULT_LOOK[k];
  return out;
}
