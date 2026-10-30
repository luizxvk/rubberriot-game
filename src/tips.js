// Dicas de primeira vez: um balao de gibi por mecanica nova (battle royale, colete, iris, troca de arma,
// equipamento, balas, skills). Aparece uma vez so (guardado no aparelho), some sozinho ou no toque, e faz
// fila se vierem duas juntas.
import { t } from './i18n.js';
import { audio } from './audio.js';

const KEY = 'rr_tips';
let seen = {};
try { seen = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
const queue = [];
let el = null, timer = 0, busy = false;

function show() {
  if (busy || !queue.length) return;
  busy = true;
  const id = queue.shift();
  if (!el) {
    el = document.createElement('div'); el.className = 'tip'; el.setAttribute('role', 'status');
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); hide(); });
    document.body.appendChild(el);
  }
  el.innerHTML = `<b>${t('tip_' + id)}</b><span>${t('tipd_' + id)}</span><small>${t('tipOk')}</small>`;
  el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  audio.play('ding', { ui: true, vol: 0.35 });
  clearTimeout(timer); timer = setTimeout(hide, 7000);
}
function hide() { if (!el) return; el.hidden = true; busy = false; clearTimeout(timer); setTimeout(show, 400); }

// mostra a dica 'id' se ainda nao viu (e marca como vista)
export function tip(id) {
  if (seen[id] || queue.includes(id)) return;
  // no treino o cartao do Seu Tinteiro ja explica tudo: dica por cima tampava ele (fica pra partida de verdade)
  if (document.body.classList.contains('tutorial')) return;
  seen[id] = 1; try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* */ }
  queue.push(id); show();
}
export const tipsReset = () => { seen = {}; try { localStorage.removeItem(KEY); } catch { /* */ } };
