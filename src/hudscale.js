// Escala da HUD (08/11, pedido dele): vida, sequencias, mapa, placar, feed de abates e o resto dos paineis da partida.
// Abre uma previa com uma HUD de exemplo em cima de uma foto de mapa; o valor muda na hora enquanto a pessoa arrasta.
// So o que nao depende da mira escala (cruz, marcadores no mundo e botoes de toque ficam de fora; os botoes tem o editor proprio).
import { t } from './i18n.js';
import { audio } from './audio.js';
import { STREAK_SVG } from './hud.js';
import { isTouch } from './input.js';

export const HUD_MIN = 0.7, HUD_MAX = isTouch ? (innerWidth < 720 ? 1.05 : 1.15) : 1.3, HUD_STEP = 0.05; // celular: acima de 1,15 o feed encosta na arma
export const setHudScale = (k) => document.body.style.setProperty('--hud-k', k);
const pct = (k) => Math.round(k * 100) + '%';
const clamp = (k) => Math.round(Math.max(HUD_MIN, Math.min(HUD_MAX, k)) / HUD_STEP) * HUD_STEP;

const sample = () => `<div class="hud-top"><div class="plaque"><div class="red"><span class="lbl">${t('h_red')}</span><span class="val">24</span></div><div><span class="lbl">${t('hsGoal')}</span><span class="val">40</span></div><div class="blue"><span class="lbl">${t('h_blue')}</span><span class="val">19</span></div><div><span class="lbl">${t('cfg_time')}</span><span class="val">6:42</span></div></div></div>
  <ol class="feed"><li class="me"><span class="b">Rolha77</span> ${t('hsKo')} <span class="r">xBigornax</span></li><li><span class="r">salsicha_br</span> ${t('hsKo')} <span class="b">Tampinha</span></li></ol>
  <canvas class="radar" width="220" height="220" aria-hidden="true"></canvas>
  <div class="hud-bl"><div class="streaks">${['uav', 'anvil', 'blimp'].map((k, i) => `<div class="stk${i === 0 ? ' got next' : ''}">${STREAK_SVG[k] || ''}</div>`).join('')}</div><div class="hp"><span class="hp-num">80</span><span class="hp-bar"><i style="width:80%"></i></span></div><div class="tac"><i></i></div></div>
  <div class="hud-br"><div class="wname">Matraca</div><div class="ammo"><b>32</b><span>/ 192</span></div><div class="wslots"><span class="on">1</span><span>2</span><span>3</span></div></div>`;

export function openHudScale({ value, onChange, onDone }) {
  const start = clamp(value || 1); let k = start;
  const had = document.body.classList.contains('touchmode');
  if (isTouch) document.body.classList.add('touchmode'); // a previa usa o mesmo arranjo do celular em partida
  const el = document.createElement('div'); el.id = 'hudPrev'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'hsT');
  el.innerHTML = `<img class="hs-bg" src="${import.meta.env.BASE_URL}maps/vila.jpg" alt=""><div class="hs-stage">${sample()}</div>
    <section class="hs-panel"><h3 id="hsT">${t('s_hudScale')}</h3><div class="hs-row"><button class="hs-step" data-d="-1" aria-label="${t('hsLess')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13H5v-2h14z"/></svg></button><input id="hsRange" type="range" min="${HUD_MIN}" max="${HUD_MAX}" step="${HUD_STEP}" value="${k}" aria-labelledby="hsT"><button class="hs-step" data-d="1" aria-label="${t('hsMore')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg></button><b id="hsVal" aria-live="polite"></b></div><footer><button id="hsReset">${t('hsDefault')}</button><button id="hsCancel">${t('mvClose')}</button><button id="hsOk" class="hs-ok">${t('heSave')}</button></footer></section>`;
  document.body.appendChild(el);
  const cv = el.querySelector('canvas.radar'), g = cv.getContext('2d');
  g.fillStyle = '#ece3cf'; g.beginPath(); g.arc(110, 110, 104, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#141210'; g.stroke();
  g.fillStyle = '#c8402e'; g.beginPath(); g.arc(150, 76, 11, 0, 7); g.fill(); g.fillStyle = '#2f5b8a'; g.beginPath(); g.moveTo(110, 92); g.lineTo(126, 128); g.lineTo(94, 128); g.fill();
  const show = () => { el.querySelector('#hsVal').textContent = pct(k); el.querySelector('#hsRange').value = k; setHudScale(k); onChange?.(k); if (isTouch) cv.style.cssText = `top:${Math.round(el.querySelector('.hud-bl').getBoundingClientRect().bottom + 8)}px;bottom:auto`; }; // no celular o mapa fica embaixo da vida, como o touchLayout faz na partida
  const close = (save) => { removeEventListener('keydown', onKey, true); el.remove(); if (isTouch && !had) document.body.classList.remove('touchmode'); if (!save) { k = start; setHudScale(k); onChange?.(k); } onDone?.(save ? k : start, save); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); } };
  addEventListener('keydown', onKey, true);
  el.querySelector('#hsRange').addEventListener('input', (e) => { k = clamp(+e.target.value); show(); });
  for (const b of el.querySelectorAll('.hs-step')) b.onclick = () => { k = clamp(k + b.dataset.d * HUD_STEP); audio.play('ui_click', { ui: true, vol: 0.5 }); show(); };
  el.querySelector('#hsReset').onclick = () => { k = 1; audio.play('ui_click', { ui: true, vol: 0.5 }); show(); };
  el.querySelector('#hsCancel').onclick = () => { audio.play('ui_back', { ui: true }); close(false); };
  el.querySelector('#hsOk').onclick = () => { audio.play('pickup', { ui: true, vol: 0.5 }); close(true); };
  show(); el.querySelector('#hsRange').focus();
}
