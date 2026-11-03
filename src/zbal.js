// Saldos de Zions da conta Rovex (03/11, pedido dele): Zions Points (moeda da Loja) e Zions Cash, com as moedas da
// Rovex. Aparece no canto de cima do menu inicial e na Loja; some pra visitante sem conta.
import { me } from './rovex.js';

const IMG = import.meta.env.BASE_URL + 'brand/';
const fmt = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');

export function renderBal(el) {
  if (!el) return;
  const p = me?.zionsPoints, c = me?.zions, ok = Number.isFinite(p) || Number.isFinite(c);
  el.hidden = !ok;
  if (!ok) { el.innerHTML = ''; return; }
  el.innerHTML = `<span class="zb pts" title="Zions Points"><img src="${IMG}zion-points.png" alt=""><b>${fmt(p)}</b><small>Points</small></span>`
    + `<span class="zb cash" title="Zions Cash"><img src="${IMG}zion-cash.png" alt=""><b>${fmt(c)}</b><small>Cash</small></span>`;
  el.setAttribute('aria-label', `Zions Points ${fmt(p)}, Zions Cash ${fmt(c)}`);
}
export const renderAllBal = () => document.querySelectorAll('.zbal').forEach(renderBal);
addEventListener('rovex-me', renderAllBal);
