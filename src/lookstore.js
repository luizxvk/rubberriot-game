// Visual do proprio boneco: localStorage (espelhado na conta Rovex pelo save) + desbloqueio.
import { LOOKS, DEFAULT_LOOK, cleanLook, DANCE_INFO, DANCE_DEFAULT } from '../shared/looks.js';
import { unlockLevel, progressInfo, rankData, metaOwned, passHasLook, passHasDance, passHasBanner, masteryDone } from './progress.js';
import { BANNERS } from '../shared/banners.js';
import { unlockDone } from './challenges.js';
import { me as rovexMe } from './rovex.js';
import { shopOwned } from './shopstore.js';

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
  if (it.mastery) return masteryDone(it.mastery); // chaveiro de ouro: mestre da arma (07/11)
  if (it.shop) return !!progressInfo().unlockAll || shopOwned(slot + ':' + id); // so da Loja
  if (it.pass) return passHasLook(slot, id); // so do Rovex Pass
  if (it.elite) return !!rovexMe?.elite;
  if (it.acct) return !!rovexMe; // premio de quem tem conta Rovex (guest ve trancado)
  if (it.meta) return metaOwned(); // set da meta da comunidade
  if (it.rank != null) return rankData().peak >= it.rank; // premio da rankeada
  if (it.ch) return unlockDone(it.ch) || !!progressInfo().unlockAll;
  return unlockLevel() >= (it.lvl || 1) || passHasLook(slot, id); // nivel do jogador ou premio do Rovex Pass
}

// danças (05/11): as 3 do podio ficam nos ajustes (vao com a conta). So valem as liberadas; espaco vazio volta pro padrao
export function danceOpen(id) { const it = DANCE_INFO[id]; if (!it) return false; if (it.rank != null) return !!progressInfo().unlockAll || rankData().peak >= it.rank; if (it.shop) return !!progressInfo().unlockAll || shopOwned('dance:' + id); if (it.pass) return !!progressInfo().unlockAll || passHasDance(id); return !!progressInfo().unlockAll || unlockLevel() >= (it.lvl || 1); }
export function bannerOpen(id) { const b = BANNERS.find(x => x.id === id); if (!b) return false; if (b.mastery) return masteryDone(b.mastery); // mestre da arma (07/11)
  if (b.shop) return !!progressInfo().unlockAll || shopOwned('banner:' + id); if (b.pass) return passHasBanner(id); return !!progressInfo().unlockAll || unlockLevel() >= b.lvl; }
export const wornDances = (S) => [0, 1, 2].map(i => { const d = S?.dances?.[i]; return d && danceOpen(d) ? d : DANCE_DEFAULT[i]; });

// na partida so vale o que esta liberado (o salvo fica intacto: o Elite pode voltar)
export function wornLook() {
  const l = getLook(), out = { ...l };
  for (const k of Object.keys(out)) if (!lookOpen(k, out[k])) out[k] = DEFAULT_LOOK[k];
  return out;
}
