// Apoiar o jogo (04/11, pedido dele): o botao fica no canto das ferramentas do cartaz (nao cobre nada) e abre este popup. O
// pagamento e o mesmo apoio do feed da Rovex (Stripe, /payment/stripe/support/create-session). Segue a regra do controle
// (vault: controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B e o foco volta pro botao. Icones: Material Icons.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, supportCheckout } from './rovex.js';

const VALUES = [1, 5, 10]; // os mesmos do apoio do feed
const brl = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
let amount = 5, opener = null;

function draw(pop) {
  pop.innerHTML = `<div class="sup-box">
    <button class="lb-x" data-i18n-aria="close" aria-label="${t('close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
    <svg class="sup-heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    <h3 id="supTitle">${t('supTitle')}</h3>
    <p>${t('supBody')}</p>
    ${me ? `<div class="sup-vals" role="radiogroup" aria-label="${t('supPick')}">${VALUES.map(v => `<button role="radio" aria-checked="${v === amount}" data-v="${v}">${brl(v)}</button>`).join('')}
      <label class="sup-other"><span>${t('supOther')}</span><input id="supCustom" type="number" min="1" max="5000" step="1" inputmode="decimal" placeholder="R$"></label></div>
    <button class="sup-go" id="supGo">${t('supGo', { v: brl(amount) })}</button>
    <small class="sup-note" id="supNote" aria-live="polite">${t('supPay')}</small>`
    : `<a class="sup-go" href="https://tryrovex.com/feed" target="_top" rel="noopener">${t('supGuestGo')}</a><small class="sup-note">${t('supGuest')}</small>`}
  </div>`;
  pop.querySelector('.lb-x').onclick = close;
  const go = pop.querySelector('#supGo'), custom = pop.querySelector('#supCustom'), label = () => { go.textContent = t('supGo', { v: brl(amount) }); };
  pop.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => { amount = Number(b.dataset.v); custom.value = ''; pop.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-checked', x === b)); label(); audio.play('ui_click', { ui: true, vol: 0.6 }); }; });
  if (custom) custom.oninput = () => { const v = Number(custom.value); if (v >= 1 && v <= 5000) { amount = v; pop.querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-checked', 'false')); label(); } };
  if (go) go.onclick = async () => {
    const note = pop.querySelector('#supNote');
    go.disabled = true; go.textContent = t('supWait');
    const url = await supportCheckout(amount).catch(() => null);
    if (url) { try { window.top.location.href = url; } catch { location.href = url; } return; }
    go.disabled = false; label(); note.textContent = t('supErr');
  };
}
function close() {
  const pop = document.getElementById('supPop'); if (!pop || pop.hidden) return;
  pop.hidden = true; audio.play('ui_back', { ui: true, vol: 0.6 });
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}
export function initSupport() {
  const btn = document.getElementById('supportBtn'); if (!btn || document.getElementById('supPop')) return;
  const pop = document.createElement('div');
  pop.id = 'supPop'; pop.className = 'sup-pop'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'supTitle');
  document.body.appendChild(pop);
  pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); close(); } });
  btn.onclick = () => {
    opener = btn; draw(pop); pop.hidden = false; audio.play('ui_click', { ui: true });
    (pop.querySelector('.sup-go') || pop.querySelector('.lb-x')).focus({ preventScroll: true });
  };
}
