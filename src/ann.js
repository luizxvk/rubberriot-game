// Anuncios do menu inicial (03/11, pedido dele): carrossel estilo cartaz com as novidades (modo Roube o Cofre,
// Noite dos Borroes, armas novas, sequencias novas e a Loja). No celular/tela estreita fica no fim das fichas do
// cartaz (#annIn, no lugar dos Controles); no PC largo, no canto direito da tela (#annSide). Gira sozinho a cada 6 s,
// para com o mouse/foco em cima; toque/clique leva pra tela certa. Icones: Material Icons (Apache 2.0).
import { t } from './i18n.js';
import { audio } from './audio.js';

const ICO = {
  heist: 'M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z',
  borroes: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-3.5 6.5L11 10l-2.5 1.5-1-1.73L9 9l-1.5-.77 1-1.73zM16.5 17h-9c.83-1.79 2.73-3 4.5-3s3.67 1.21 4.5 3zm-.5-6.27-1 1.73L12.5 11 15 9.5l1 1.73L14.5 12z',
  guns: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  streaks: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  desert: 'M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z',
  newcat: 'M7 4v2h3v2H6a2 2 0 0 0-2 2v8h4v-4h4l3 3h5v-5h-2V8h-4V6h3V4H7z',
  shop: 'M21.9 8.89l-1.05-4.37c-.22-.9-1-1.52-1.91-1.52H5.05c-.9 0-1.69.63-1.9 1.52L2.1 8.89c-.24 1.02-.02 2.06.62 2.88.08.11.19.19.28.29V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6.94c.09-.09.2-.18.28-.28.64-.82.87-1.87.62-2.89zM5 19v-6.03c.08.01.15.03.23.03.87 0 1.66-.36 2.24-.95.6.6 1.4.95 2.31.95.87 0 1.65-.36 2.23-.93.59.57 1.39.93 2.29.93.84 0 1.64-.35 2.24-.95.58.59 1.37.95 2.24.95.08 0 .15-.02.23-.03V19H5z',
};
// go: tela que abre ('play' = escolher o modo, igual ao Jogar)
const SLIDES = [
  { id: 'shop', c: '#c9356a', go: 'shop' },
  { id: 'heist', c: '#d99a1e', go: 'play' },
  { id: 'borroes', c: '#7b33cc', go: 'play' },
  { id: 'guns', c: '#a83a2c', go: 'arsenal' },
  { id: 'streaks', c: '#2f5b8a', go: 'play' },
  // em breve (03/11, pedido dele): sem tela pra abrir ainda (go: null = so mostra)
  { id: 'desert', c: '#c98a3a', go: null, soon: true },
  { id: 'newcat', c: '#3f7a6a', go: null, soon: true },
];
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[k]}"/></svg>`;

let idx = 0, timer = 0, hold = false, goTo = null;
const boxes = () => ['annIn', 'annSide'].map(id => document.getElementById(id)).filter(Boolean);

function draw() {
  for (const el of boxes()) {
    const side = el.id === 'annSide';
    el.innerHTML = (side ? `<header class="ann-head"><span>${t('annTitle')}</span><i>${t('annExtra')}</i></header>` : '')
      + `<div class="ann-track">${SLIDES.map((s, i) => `<button class="ann-slide ${i === idx ? 'on' : ''} ${s.soon ? 'soon' : ''}" data-ann="${i}" style="--ac:${s.c}" ${i === idx ? '' : 'tabindex="-1" aria-hidden="true"'}>
          <span class="ann-ico">${svg(s.id)}</span>
          <span class="ann-txt"><em>${t('ann_tag_' + s.id)}</em><b>${t('ann_t_' + s.id)}</b><small>${t('ann_d_' + s.id)}</small></span>
          <span class="ann-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg></span>
        </button>`).join('')}</div>`
      + `<div class="ann-dots" role="group" aria-label="${t('annTitle')}">${SLIDES.map((s, i) => `<button class="ann-dot ${i === idx ? 'on' : ''}" data-dot="${i}" aria-label="${t('ann_t_' + s.id)}" aria-current="${i === idx}"></button>`).join('')}</div>`;
  }
}
function show(i) {
  idx = (i + SLIDES.length) % SLIDES.length;
  for (const el of boxes()) {
    el.querySelectorAll('.ann-slide').forEach((b, k) => { const on = k === idx; b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; b.toggleAttribute('aria-hidden', !on); });
    el.querySelectorAll('.ann-dot').forEach((b, k) => { b.classList.toggle('on', k === idx); b.setAttribute('aria-current', String(k === idx)); });
  }
}

export function startAnn() {
  clearInterval(timer);
  timer = setInterval(() => { if (!hold && !document.hidden) show(idx + 1); }, 6000);
}
export function stopAnn() { clearInterval(timer); timer = 0; }

export function initAnn(go) {
  goTo = go;
  draw();
  startAnn(); // o jogo abre no menu inicial
  for (const el of boxes()) {
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-dot]'), s = e.target.closest('[data-ann]');
      if (d) { audio.play('ui_hover', { ui: true, vol: 0.5 }); show(Number(d.dataset.dot)); startAnn(); return; }
      if (s) { const go = SLIDES[Number(s.dataset.ann)].go; if (!go) return; audio.play('ui_click', { ui: true }); goTo?.(go); }
    });
    el.addEventListener('pointerenter', () => { hold = true; });
    el.addEventListener('pointerleave', () => { hold = false; });
    el.addEventListener('focusin', () => { hold = true; });
    el.addEventListener('focusout', () => { hold = false; });
    // celular: arrastar pro lado troca o anuncio
    let x0 = null, swiped = false;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; swiped = false; });
    el.addEventListener('pointerup', (e) => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) { swiped = true; show(idx + (dx < 0 ? 1 : -1)); startAnn(); } });
    el.addEventListener('click', (e) => { if (swiped) { swiped = false; e.stopImmediatePropagation(); } }, true); // arrastou: nao abre a tela
  }
}
export const relangAnn = () => { draw(); show(idx); };
