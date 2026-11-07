// Dicas por modo (07/11, pedido dele: "dicas por modo em cada partida, sem atrapalhar a HUD"). Um cartaozinho no lado
// esquerdo, embaixo do minimapa e das teclas de granada (lugar vazio da HUD), com 1 dica do modo da partida por vez.
// So aparece fora de combate (sem levar dano nem atirar ha 4 s), vivo, sem mirar e sem pausa; some sozinho em 7 s e some
// na hora se a pessoa mirar, atirar ou levar dano. 1a dica 6 s depois de comecar, depois uma a cada 70 s, ate passar todas.
// Ajustes > Jogo > "Dicas do modo" desliga. Textos: mt_<modo>_<n> (PT/EN, i18n.js).
import { t } from './i18n.js';
import { MODES } from '../shared/weapons.js';

const N = { ffa: 2, tdm: 2, gungame: 2, ctf: 2, dom: 2, escort: 2, heist: 3, smuggle: 2, infect: 2, bomb: 2, br: 2, bounce: 2, duo: 2, borroes: 3 };
const FIRST = 6, EVERY = 70, SHOW = 7, CALM = 4;

let el = null, key = '', list = [], i = 0, wait = FIRST, showT = 0, calm = 0, lastHp = null;

function modeKey(G) {
  if (G.duo) return 'duo';
  if (G.bounce) return 'bounce';
  const m = G.mode || '', base = MODES[m]?.base || m.replace(/^blitz_?/, '') || m;
  return N[m] ? m : N[base] ? base : m.startsWith('blitz') ? 'tdm' : null;
}
function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.className = 'mode-tip'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<small></small><span></span>';
  (document.getElementById('hud') || document.body).appendChild(el);
  return el;
}
function hide() { if (el && !el.hidden) { el.classList.remove('in'); el.hidden = true; } showT = 0; }

// por quadro, so durante a partida. ok = pode mostrar agora (vivo, sem pausa, sem replay, sem treino)
export function modeTipsTick(dt, G, p, inp, ok) {
  const k = ok && G.settings?.modeTips !== false ? modeKey(G) : null;
  const id = k ? k + '|' + (G.matchId || G.M?.id || '') : '';
  if (id !== key) { key = id; list = k ? Array.from({ length: N[k] }, (_, n) => `mt_${k}_${n + 1}`) : []; i = 0; wait = FIRST; hide(); lastHp = null; }
  if (!k || !p) { hide(); return; }
  // combate: atirou, mirou ou levou dano agora
  const hurt = lastHp !== null && p.hp < lastHp; lastHp = p.hp;
  const busy = inp?.fire || inp?.ads || hurt || (p.adsK || 0) > 0.2;
  calm = busy ? 0 : calm + dt;
  if (showT > 0) { showT -= dt; if (showT <= 0 || busy) hide(); return; }
  if (i >= list.length) return;
  wait -= dt;
  if (wait > 0 || calm < CALM) return;
  const e = ensure();
  e.querySelector('small').textContent = t('mtTitle', { n: i + 1, m: list.length });
  e.querySelector('span').textContent = t(list[i]);
  e.hidden = false; e.classList.remove('in'); void e.offsetWidth; e.classList.add('in');
  i++; wait = EVERY; showT = SHOW;
}
export const modeTipsHide = hide;
