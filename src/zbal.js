// Saldos de Zions da conta Rovex (03/11, pedido dele): Zions Points (moeda da Loja) e Zions Cash, com as moedas da
// Rovex. Aparece no canto de cima do menu inicial e na Loja; some pra visitante sem conta.
import { me } from './rovex.js';
import { openVaultInfo } from './zionbuy.js';
// cofre (Material Icons, Apache 2.0)
const VAULT_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 2H5c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2v1h2v-1h10v1h2v-1c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 17H5V4h14v15zM15 11.5c0-1.2-.7-2.3-1.7-2.8V7h-2v1.6c-.1 0-.2.1-.3.1-1.6.4-2.6 2-2.2 3.6.3 1.3 1.5 2.2 2.8 2.2 1.9 0 3.4-1.4 3.4-3zm-3.4 1.2c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2zM17 6h1v11h-1z"/></svg>';

const IMG = import.meta.env.BASE_URL + 'brand/';
const fmt = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');

export function renderBal(el) {
  if (!el) return;
  // Loja: o saldo fica sempre a vista, com a moeda (04/11, pedido dele); visitante ve zero
  const shop = el.classList.contains('shop-zbal'), p = me?.zionsPoints ?? (shop ? 0 : undefined), c = me?.zions ?? (shop ? 0 : undefined), ok = Number.isFinite(p) || Number.isFinite(c);
  el.hidden = !ok;
  if (!ok) { el.innerHTML = ''; return; }
  if (el.classList.contains('wallet')) { // carteira do menu: duas linhas alinhadas (moeda | valor | nome)
    el.innerHTML = `<span class="wl-row pts"><img src="${IMG}zion-points.png" alt=""><b>${fmt(p)}</b><small>Zions Points</small></span>`
      + `<span class="wl-row cash"><img src="${IMG}zion-cash.png" alt=""><b>${fmt(c)}</b><small>Zions Cash</small></span>`;
    el.setAttribute('aria-label', `Zions Points ${fmt(p)}, Zions Cash ${fmt(c)}`);
    return;
  }
  el.innerHTML = `<span class="zb pts" title="Zions Points"><img src="${IMG}zion-points.png" alt=""><b>${fmt(p)}</b><small>Points</small></span>`
    + `<span class="zb cash" title="Zions Cash"><img src="${IMG}zion-cash.png" alt=""><b>${fmt(c)}</b><small>Cash</small></span>`
    // Vault Points (05/11, pedido dele): so na Loja e com conta; tocar explica como ganhar
    + (shop && me ? `<button class="zb vault" type="button" title="Vault Points">${VAULT_ICO}<b>${fmt(me.vaultPoints || 0)}</b><small>Vault</small></button>` : '');
  el.setAttribute('aria-label', `Zions Points ${fmt(p)}, Zions Cash ${fmt(c)}`);
  const vb = el.querySelector('.zb.vault'); if (vb) vb.onclick = () => openVaultInfo(vb);
}
export const renderAllBal = () => document.querySelectorAll('.zbal').forEach(renderBal);
addEventListener('rovex-me', renderAllBal);
