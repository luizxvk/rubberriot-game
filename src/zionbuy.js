// Comprar Zions dentro da Loja (04/11, pedido dele): antes o caminho saia do jogo pela tryrovex.com/zions. Os pacotes sao os
// mesmos da Rovex (Stripe, /payment/stripe/zions/create-session); um toque no bilhete ja abre o pagamento.
// Segue a regra do controle (vault: controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B e o foco volta pro botao.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, zionsCheckout } from './rovex.js';

const COIN = import.meta.env.BASE_URL + 'brand/zion-points.png';
const PACKS = [[250, 9.9], [500, 14.9], [1000, 24.9]];
const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let opener = null;

function draw(pop) {
  pop.innerHTML = `<div class="sup-box zb-box">
    <button class="lb-x" aria-label="${t('close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
    <h3 id="zbTitle">${t('zbTitle')}</h3>
    ${me ? `<div class="zb-list">${PACKS.map(([n, v]) => `<button class="zb-tk" data-n="${n}"><img src="${COIN}" alt=""><b>${n.toLocaleString('pt-BR')}</b><span>Zions Points</span><em>${brl(v)}</em></button>`).join('')}</div>
    <small class="sup-note" id="zbNote" aria-live="polite">${t('supPay')}</small>`
    : `<a class="sup-go" href="https://tryrovex.com/zions" target="_top" rel="noopener">${t('shopGetZions')}</a><small class="sup-note">${t('zbGuest')}</small>`}
  </div>`;
  pop.querySelector('.lb-x').onclick = closeZionBuy;
  pop.querySelectorAll('.zb-tk').forEach(b => {
    b.onclick = async () => {
      const all = pop.querySelectorAll('.zb-tk'), note = pop.querySelector('#zbNote');
      all.forEach(x => { x.disabled = true; }); note.textContent = t('supWait');
      audio.play('ui_click', { ui: true });
      const url = await zionsCheckout(Number(b.dataset.n)).catch(() => null);
      if (url) { try { window.top.location.href = url; } catch { location.href = url; } return; }
      all.forEach(x => { x.disabled = false; }); note.textContent = t('supErr');
    };
  });
}
export function closeZionBuy() {
  const pop = document.getElementById('zbPop'); if (!pop || pop.hidden) return;
  pop.hidden = true; audio.play('ui_back', { ui: true, vol: 0.6 });
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}
export function openZionBuy(from) {
  let pop = document.getElementById('zbPop');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'zbPop'; pop.className = 'sup-pop'; pop.hidden = true;
    pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'zbTitle');
    document.body.appendChild(pop);
    pop.addEventListener('click', (e) => { if (e.target === pop) closeZionBuy(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); closeZionBuy(); } });
  }
  opener = from || null; draw(pop); pop.hidden = false; audio.play('ui_click', { ui: true });
  (pop.querySelector('.zb-tk') || pop.querySelector('.sup-go')).focus({ preventScroll: true });
}
