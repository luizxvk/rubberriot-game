// Novidades da remasterizacao (07/11, pedido dele): ao logar, um intertitulo de cinema mudo abre em iris no meio da tela
// com o que mudou, o "Em breve: Mercado Negro" carimbado e o presente de 1000 Zions Points (o servidor paga uma vez so).
// Abre sozinho uma vez por campanha (rr_news_seen) e de novo pelo cartao "Remasterizado" do carrossel de anuncios.
// Regra do controle (vault controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B, o foco volta pra quem abriu.
// Icones: Material Icons (Apache 2.0).
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, claimGift } from './rovex.js';

const CAMPAIGN = 'remaster-2026-11', SEEN = 'rr_news_seen';
const P = {
  models: 'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z', // pincel (NUNCA o icone de brilhinhos: regra dele 07/11)
  parts: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  maps: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
  balance: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  shop: 'M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89zM5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19H5z',
  gift: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;
const ITEMS = ['models', 'parts', 'maps', 'balance', 'shop'];

let opener = null, busy = false;
const pop = () => document.getElementById('newsPop');

function giftHtml() {
  if (!me) return `<p class="np-gift-note">${t('np_giftLogin')}</p>`;
  return `<button class="np-gift" id="npGift">${ico('gift')}<span>${t('np_gift')}</span></button>`;
}
function draw(el) {
  el.innerHTML = `<div class="np-card" role="document">
    <button class="lb-x" aria-label="${t('close')}">${ico('close')}</button>
    <header class="np-head"><h2 id="npTitle">${t('np_title')}</h2><p>${t('np_sub')}</p></header>
    <ul class="np-list">${ITEMS.map(k => `<li><span class="np-ico">${ico(k)}</span><span><b>${t('np_' + k)}</b><small>${t('np_' + k + 'D')}</small></span></li>`).join('')}
      <li class="np-begin"><b>${t('np_begin')}</b></li></ul>
    <section class="np-ticket" aria-labelledby="npBm">
      <span class="np-ticket-ico">${ico('lock')}</span>
      <div><h3 id="npBm">${t('np_bm')}</h3><p>${t('np_bmD')}</p></div>
      <span class="np-stamp" aria-hidden="true">${t('np_soon')}</span>
    </section>
    <footer class="np-foot"><div class="np-gift-slot" aria-live="polite">${giftHtml()}</div></footer>
  </div>`;
  el.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closeNews(); };
  const g = el.querySelector('#npGift'); if (g) g.onclick = redeem;
}
async function redeem() {
  if (busy) return; busy = true;
  const slot = pop()?.querySelector('.np-gift-slot'), b = slot?.querySelector('#npGift');
  if (b) { b.disabled = true; b.querySelector('span').textContent = t('np_giftBusy'); }
  const r = await claimGift(); busy = false;
  if (!slot) return;
  if (r.ok || r.code === 'ja_resgatou') {
    audio.play(r.ok ? 'unlock' : 'ui_click', { ui: true });
    slot.innerHTML = `<p class="np-got ${r.ok ? 'fresh' : ''}">${ico('gift')}<span>${t(r.ok ? 'np_giftOk' : 'np_giftDone')}</span></p>`;
  } else {
    slot.innerHTML = `<p class="np-gift-note err">${t(r.code === 'login' ? 'np_giftLogin' : 'np_giftErr')}</p>${me ? giftHtml() : ''}`;
    const g = slot.querySelector('#npGift'); if (g) g.onclick = redeem;
  }
}
function onKey(e) { if (e.key === 'Escape' && !pop()?.hidden) { e.preventDefault(); closeNews(); } }
export function closeNews() {
  const el = pop(); if (!el || el.hidden) return;
  el.hidden = true; removeEventListener('keydown', onKey);
  try { localStorage.setItem(SEEN, CAMPAIGN); } catch { /* sem storage */ }
  opener?.focus?.(); opener = null;
}
export function openNews(from = null) {
  let el = pop();
  if (!el) { el = document.createElement('div'); el.id = 'newsPop'; el.className = 'news-pop'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'npTitle'); document.body.appendChild(el); }
  opener = from || document.activeElement;
  draw(el); el.hidden = false; addEventListener('keydown', onKey);
  el.onclick = (e) => { if (e.target === el) closeNews(); }; // clicou fora do cartao
  audio.play('iris', { ui: true }); // abre em iris, como no cinema
  el.querySelector('#npGift, .lb-x')?.focus();
}
// botao B do controle fecha (gamepad.js manda o mesmo Escape pros popups)
export const newsOpen = () => !!pop() && !pop().hidden;
// logou e esta no menu: abre uma vez por campanha (nunca no meio da partida)
function check() {
  let seen = ''; try { seen = localStorage.getItem(SEEN) || ''; } catch { /* */ }
  if (!me || seen === CAMPAIGN || newsOpen()) return;
  if (!document.getElementById('menu')?.classList.contains('on') || document.pointerLockElement) return;
  openNews();
}
// 07/11 (bug: nao abria na 1a vez): com a sessao salva, o 'rovex-me' chegava ANTES deste init. Confere tambem sozinho
// logo depois e a cada 3 s (barato) ate abrir uma vez ou o jogador entrar numa partida e voltar ao menu
export function initNews() {
  addEventListener('rovex-me', () => setTimeout(check, 400));
  setTimeout(check, 1200);
  const iv = setInterval(() => { let seen = ''; try { seen = localStorage.getItem(SEEN) || ''; } catch { /* */ } if (seen === CAMPAIGN) clearInterval(iv); else check(); }, 3000);
}
