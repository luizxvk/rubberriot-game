// Novidades da remasterizacao (07/11, pedido dele): ao logar, um intertitulo de cinema mudo abre em iris no meio da tela
// com o que mudou, o "Em breve: Mercado Negro" carimbado e o presente de 1000 Zions Points (o servidor paga uma vez so).
// Abre sozinho uma vez por campanha (rr_news_seen) e de novo pelo cartao "Remasterizado" do carrossel de anuncios.
// Regra do controle (vault controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B, o foco volta pra quem abriu.
// Icones: Material Icons (Apache 2.0).
import { t, wName } from './i18n.js';
import { partName } from './arsenal.js';
import { audio } from './audio.js';
import { me, claimGift } from './rovex.js';
import { sceneReady } from './popgate.js';
import { eliteBusy } from './elitepop.js';
import { updateCampaign, UPDATE_ZP } from '../shared/version.js';

// 10/11 (pedido dele): campanha nova = abre de novo pra todo mundo, com as novidades da leva e o Mercado Negro ABERTO
// 13/11 (pedido dele): campanha da 0.19: carrossel com as 19 armas novas e o Gancho do Palco no topo
const CAMPAIGN = updateCampaign(), SEEN = 'rr_news_seen'; // 13/11 (regra dele): popup e presente so em versao nova (0.18 -> 0.19); hotfix nao reabre
const P = {
  models: 'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41z', // pincel (NUNCA o icone de brilhinhos: regra dele 07/11)
  parts: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  maps: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
  balance: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  shop: 'M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89zM5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19H5z',
  gift: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
  lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
  quick: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
  melt: 'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z',
  ghost: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  fx: 'M12 2l-5.5 9h11L12 2zm5.5 11c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zM3 21.5h8v-8H3v8z',
  lobby: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  elite: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  open: 'M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z',
  hook: 'M19 9c0-1.3-.84-2.4-2-2.82V2h-2v4.18C13.84 6.6 13 7.7 13 9s.84 2.4 2 2.82V15c0 2.21-1.79 4-4 4s-4-1.79-4-4v-1h3L5 9v6c0 3.31 2.69 6 6 6s6-2.69 6-6v-3.18c1.16-.42 2-1.52 2-2.82zm-3 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z', // phishing
  hud: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  hit: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  mic: 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z',
  run: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
  prev: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  next: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;
// 0.19 (13/11): o resto da leva em fichas ([chave do texto, icone])
const ITEMS = [['maps', 'maps'], ['akimbo', 'parts'], ['hud', 'hud'], ['hit', 'hit'], ['vo', 'mic'], ['run', 'run']];
// carrossel do topo: o gancho abre, depois as 19 armas novas (foto de cada uma inteira, nunca cortada)
const NEW_GUNS = ['pistol_12', 'pistol_13', 'pistol_14', 'pistol_15', 'subfusil_14', 'subfusil_15', 'subfusil_16', 'fusil_14', 'fusil_15', 'fusil_16',
  'shotgun_4', 'shotgun_5', 'shotgun_6', 'shotgun_7', 'lmg_3', 'lmg_4', 'lmg_5', 'sniper_5', 'sniper_6'];
const catOf = (id) => id.startsWith('lmg') ? 'lmg' : id.startsWith('subfusil') ? 'smg' : id.startsWith('fusil') ? 'rifle' : id.startsWith('pistol') ? 'pistol' : id.startsWith('shotgun') ? 'shotgun' : 'sniper';
const BASE = import.meta.env.BASE_URL;
// o gancho (13/11, pedido dele): so o icone do gancho, grande, balancando na ponta da corda
const HOOK_ART = `<svg class="np-hook-art" viewBox="0 0 24 24" aria-hidden="true"><g class="np-hook-ico"><path d="${P.hook}"/></g></svg>`;
function reelHtml() {
  const n = NEW_GUNS.length + 1;
  const hook = `<figure class="np-slide hook on" data-i="0"><span class="np-tag">${t('nq_tagHook')}</span>${HOOK_ART}<figcaption><b>${t('fd_hook')}</b><small>${t('nq_hookD')}</small></figcaption></figure>`;
  const guns = NEW_GUNS.map((b, i) => { const nm = partName('body', b);
    return `<figure class="np-slide gun" data-i="${i + 1}" aria-hidden="true"><span class="np-tag">${t('nq_tagGun')} · ${wName(catOf(b))}</span><img src="${BASE}banners/mst/${b}.webp" alt="${nm}" decoding="async" draggable="false"><figcaption><b>${nm}</b></figcaption></figure>`; }).join('');
  return `<section class="np-reel" aria-roledescription="carousel" aria-label="${t('nq_reel')}">
    <div class="np-reel-track">${hook}${guns}</div>
    <button class="np-reel-btn prev" type="button" aria-label="${t('nq_prev')}">${ico('prev')}</button><button class="np-reel-btn next" type="button" aria-label="${t('nq_next')}">${ico('next')}</button>
    <p class="np-reel-n"><b>1</b> / ${n}</p><i class="np-reel-bar"></i></section>`;
}
// passa sozinho (gancho 4 s, cada arma 2,4 s), para com o mouse/foco em cima; setas e arrastar pro lado trocam
let reelI = 0, reelT = 0, reelHold = false;
function reelGo(el, i) {
  const sl = el.querySelectorAll('.np-slide'), N = sl.length; if (!N) return;
  reelI = (i + N) % N;
  el.querySelector('.np-reel-track').style.transform = `translateX(${-reelI * 100}%)`;
  sl.forEach((x, k) => { x.classList.toggle('on', k === reelI); x.toggleAttribute('aria-hidden', k !== reelI); });
  el.querySelector('.np-reel-n b').textContent = reelI + 1;
  el.querySelector('.np-reel-bar').style.setProperty('--k', ((reelI + 1) / N).toFixed(3));
  reelTick(el);
}
function reelTick(el) { clearTimeout(reelT); reelT = setTimeout(() => { if (!pop() || pop().hidden) return; if (reelHold || document.hidden) return reelTick(el); reelGo(el, reelI + 1); }, reelI === 0 ? 4000 : 2400); }
function reelInit(el) {
  const R = el.querySelector('.np-reel'); if (!R) return;
  reelHold = false; reelGo(el, 0);
  R.querySelector('.prev').onclick = () => { audio.play('ui_hover', { ui: true, vol: 0.5 }); reelGo(el, reelI - 1); };
  R.querySelector('.next').onclick = () => { audio.play('ui_hover', { ui: true, vol: 0.5 }); reelGo(el, reelI + 1); };
  R.onpointerenter = (e) => { if (e.pointerType === 'mouse') reelHold = true; }; R.onpointerleave = () => { reelHold = false; };
  let x0 = null;
  R.onpointerdown = (e) => { if (e.target.closest('.np-reel-btn')) return; x0 = e.clientX; };
  R.onpointerup = (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 36) reelGo(el, reelI + (dx < 0 ? 1 : -1)); };
}

let opener = null, busy = false;
const pop = () => document.getElementById('newsPop');

// moeda dos Zions Points (13/11, pedido dele: so ela no presente, nada de icone de caixa)
const COIN = `<img class="np-coin" src="${import.meta.env.BASE_URL}brand/zion-points.png" alt="" draggable="false">`;
const zp = () => UPDATE_ZP.toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'pt-BR');
function giftHtml() {
  if (!me) return `<p class="np-gift-note">${t('np_giftLogin', { n: zp() })}</p>`;
  return `<button class="np-gift" id="npGift">${COIN}<span>${t('np_gift', { n: zp() })}</span></button>`;
}
function draw(el) {
  el.innerHTML = `<div class="np-card" role="document">
    <button class="lb-x" aria-label="${t('close')}">${ico('close')}</button>
    <header class="np-head"><h2 id="npTitle">${t('np_title')}</h2><p>${t('nq_sub')}</p></header>
    ${reelHtml()}
    <ul class="np-list">${ITEMS.map(([k, i]) => `<li><span class="np-ico">${ico(i)}</span><span><b>${t('nq_' + k)}</b><small>${t('nq_' + k + 'D')}</small></span></li>`).join('')}</ul>
    <footer class="np-foot"><div class="np-gift-slot" aria-live="polite">${giftHtml()}</div></footer>
  </div>`;
  el.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closeNews(); };
  reelInit(el);
  const g = el.querySelector('#npGift'); if (g) g.onclick = redeem;
  // 0.19: o ingresso do Mercado Negro (novidade da 10/11) saiu pra caber o carrossel sem rolar
  if (el.querySelector('#npBmGo')) el.querySelector('#npBmGo').onclick = () => { audio.play('ui_click', { ui: true }); opener = null; closeNews(); document.querySelector('[data-go="shop"]')?.click(); setTimeout(() => document.querySelector('#shopTabs .tab-bm')?.click(), 350); };
}
async function redeem() {
  if (busy) return; busy = true;
  const slot = pop()?.querySelector('.np-gift-slot'), b = slot?.querySelector('#npGift');
  if (b) { b.disabled = true; b.querySelector('span').textContent = t('np_giftBusy'); }
  const r = await claimGift(); busy = false;
  if (!slot) return;
  if (r.ok || r.code === 'ja_resgatou') {
    audio.play(r.ok ? 'unlock' : 'ui_click', { ui: true });
    slot.innerHTML = `<p class="np-got ${r.ok ? 'fresh' : ''}">${COIN}<span>${t(r.ok ? 'np_giftOk' : 'np_giftDone', { n: zp() })}</span></p>`;
  } else {
    slot.innerHTML = `<p class="np-gift-note err">${t(r.code === 'login' ? 'np_giftLogin' : 'np_giftErr', { n: zp() })}</p>${me ? giftHtml() : ''}`;
    const g = slot.querySelector('#npGift'); if (g) g.onclick = redeem;
  }
}
function onKey(e) { if (e.key === 'Escape' && !pop()?.hidden) { e.preventDefault(); closeNews(); } }
export function closeNews() {
  const el = pop(); if (!el || el.hidden) return;
  el.hidden = true; removeEventListener('keydown', onKey); clearTimeout(reelT);
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
  if (document.querySelector('#elitePop:not([hidden])')) return; // 10/11: presente/popup do Elite aberto: espera (um popup de cada vez)
  if (!sceneReady() || eliteBusy()) return; // 10/11 (pedido dele): so depois do loader sair e o mapa aparecer, e o Elite vem antes
  const mn = document.getElementById('menu'); if (!mn?.classList.contains('on') || mn.hidden || document.pointerLockElement) return; // 08/11: no celular nao tem pointer lock e o menu fica com .on escondido: abria por cima da partida
  openNews();
}
// 07/11 (bug: nao abria na 1a vez): com a sessao salva, o 'rovex-me' chegava ANTES deste init. Confere tambem sozinho
// logo depois e a cada 3 s (barato) ate abrir uma vez ou o jogador entrar numa partida e voltar ao menu
export function initNews() {
  addEventListener('rovex-me', () => setTimeout(check, 400));
  setTimeout(check, 1200);
  const iv = setInterval(() => { let seen = ''; try { seen = localStorage.getItem(SEEN) || ''; } catch { /* */ } if (seen === CAMPAIGN) clearInterval(iv); else check(); }, 3000);
}
