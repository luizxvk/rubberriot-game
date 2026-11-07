// Bolso (06/11, pedido dele, previa aprovada): itens que o jogador usa quando quiser. Hoje: ficha de XP em dobro.
// Abre por cima de tudo (menu, lobby, pausa). Usar fora da partida ja liga a ficha; o relogio dela so anda jogando.
import { t } from './i18n.js';
import { boostInfo, boostUse, boostSync, onProgress, BOOST_ELITE } from './progress.js';
import { kbBinds, keyName } from './binds.js';

let el = null, getSettings = () => ({});
const fmt = (ms) => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };

function render() {
  if (!el || el.hidden) return;
  const B = boostInfo(), key = (kbBinds(getSettings()).boost || [])[0];
  el.querySelector('.pk-body').innerHTML = `
    <div class="pk-item${B.n ? '' : ' none'}">
      <div class="pk-token" aria-hidden="true"><i></i>2x<span class="pk-n">×${B.n}</span></div>
      <div class="pk-txt"><h3>${t('boostName')}</h3><p>${t('boostDesc')}</p>
        <small class="pk-elite">${t('boostElite', { n: BOOST_ELITE })}</small>
        ${B.active ? `<small class="pk-on">${t('boostActive', { t: fmt(B.ms) })}</small>` : ''}
        ${!B.n && !B.active ? `<small>${t('boostEmpty')}</small>` : ''}
        ${key ? `<small class="pk-key">${t('boostKey', { k: keyName(key) })}</small>` : ''}</div>
      <button class="pk-use" type="button" ${B.n ? '' : 'disabled'}>${t(B.active ? 'boostAdd' : 'boostUse')}</button>
    </div>`;
  el.querySelector('.pk-use').onclick = () => { if (boostUse()) { render(); el.dispatchEvent(new CustomEvent('used')); } };
}

export function initPocket(settingsFn, onUsed) {
  getSettings = settingsFn;
  el = document.createElement('div');
  el.className = 'overlay pocket-ov'; el.id = 'pocketOv'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pkTitle');
  el.innerHTML = `<div class="card small pocket"><header class="card-head"><button class="back" type="button" aria-label="${t('close')}">&larr;</button><h2 id="pkTitle">${t('pocket')}</h2></header>
    <p class="pk-sub">${t('boostSub')}</p><div class="pk-body"></div></div>`;
  document.body.appendChild(el);
  const close = () => { el.hidden = true; };
  el.querySelector('.back').onclick = close;
  el.addEventListener('pointerdown', (e) => { if (e.target === el) close(); });
  addEventListener('keydown', (e) => { if (!el.hidden && e.code === 'Escape') { e.stopPropagation(); close(); } }, true);
  el.addEventListener('used', () => onUsed?.());
  onProgress((ev) => { if (ev.kind === 'boost') render(); });
  setInterval(() => { if (!el.hidden && boostInfo().active) render(); }, 1000);
}
export function openPocket() { if (!el) return; boostSync(); el.querySelector('#pkTitle').textContent = t('pocket'); el.querySelector('.pk-sub').textContent = t('boostSub'); el.hidden = false; render(); el.querySelector('.pk-use')?.focus(); }
