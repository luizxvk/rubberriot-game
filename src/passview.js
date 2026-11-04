// Tela do Rovex Pass: uma tira de filme na horizontal. Cada fotograma e um nivel; a barra corre embaixo da tira. So o Elite
// da Rovex ativa o Pass: sem Elite a tira aparece trancada com o convite. Tambem desenha o aviso da partida e o bloco do fim.
import { t } from './i18n.js';
import { passInfo } from './progress.js';
import { PASS, PASS_MAX } from './pass.js';
import { CAMO_SWATCH } from './camos.js';
import { RET_COLORS } from './arsenal.js';
import { openElite } from './elitepop.js';

const LOCK = '<svg class="pf-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>';
// icones do visual: Material Icons (Apache 2.0)
const LOOK_ICO = {
  hat: 'M12 3 4 9v2h16V9l-8-6zM2 13v2h20v-2H2zm4 4v2h12v-2H6z', glove: 'M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-.23 0-.46.03-.67.09C14.46.66 13.56 0 12.5 0c-1.23 0-2.25.89-2.46 2.06C9.87 2.02 9.69 2 9.5 2 8.12 2 7 3.12 7 4.5v5.89c-.34-.31-.76-.54-1.22-.66L5 9.5c-.82-.21-1.69.11-2.18.8-.38.54-.4 1.25-.06 1.82l3.33 5.58C7.34 19.56 9.6 21 12 21c4.97 0 9-4.03 9-9V7z',
  eyes: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', fx: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z',
};
export const passArt = (p) => (p.k === 'camo'
  ? `<i class="pf-art" style="background:${CAMO_SWATCH[p.id] || '#999'}"></i>`
  : p.k === 'ret' ? `<i class="pf-art pf-ret"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="${RET_COLORS[p.id]}" stroke-width="2.4"/><circle cx="12" cy="12" r="2.2" fill="${RET_COLORS[p.id]}"/></svg></i>`
    : `<i class="pf-art pf-look"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${LOOK_ICO[p.slot] || LOOK_ICO.fx}"/></svg></i>`);
export const passName = (p) => t(p.k === 'camo' ? 'camo_' + p.id : p.k === 'ret' ? 'retc_' + p.id : 'lk_' + p.slot + '_' + p.id);
const kindOf = (p) => t(p.k === 'camo' ? 'passCamo' : p.k === 'ret' ? 'passRet' : 'passLook');

export function renderPass(go) {
  const box = document.getElementById('passBody'), I = passInfo(), done = I.level >= PASS_MAX;
  // a barra vai do 1o ao ultimo fotograma: cada nivel e um passo, e o XP atual anda dentro do passo
  const fill = I.on ? Math.min(100, (Math.max(0, I.level - 1 + (done ? 0 : I.into / I.need)) / (PASS_MAX - 1)) * 100) : 0;
  box.innerHTML = (I.on ? `<div class="ps-head"><b class="ps-lvl">${t('passLevel', { n: I.level, m: PASS_MAX })}</b>
      <span class="ps-xp"><span class="ps-bar"><i style="width:${done ? 100 : Math.round(I.into / I.need * 100)}%"></i></span><small>${done ? t('passDone') : t('passXp', { a: I.into.toLocaleString('pt-BR'), b: I.need.toLocaleString('pt-BR') })}</small></span></div>
    <p class="ps-hint">${t('passHint')}</p>`
    : `<div class="ps-gate"><p>${t('passGate')}</p><button class="ps-elite" id="psElite">${t('passGateGo')}</button></div>`)
    + `<div class="ps-strip" id="psStrip"><ol class="ps-frames">${PASS.map((p, i) => {
      const n = i + 1, open = I.on && I.level >= n, next = I.on && n === I.level + 1;
      return `<li><button class="pf ${open ? 'on' : ''} ${next ? 'next' : ''}" data-open="${open ? 1 : ''}" data-k="${p.k}" ${open ? '' : 'aria-disabled="true"'}><b class="pf-n">${n}</b>${passArt(p)}${open ? '' : LOCK}<span class="pf-name">${passName(p)}</span><small>${kindOf(p)}</small></button></li>`;
    }).join('')}</ol><div class="ps-track" aria-hidden="true"><i style="width:${fill}%"></i></div></div>`;
  box.querySelectorAll('.pf[data-open="1"]').forEach(b => { b.onclick = () => go(b.dataset.k === 'look' ? 'look' : 'arsenal'); });
  const el = box.querySelector('#psElite'); if (el) el.onclick = () => openElite(el);
  box.querySelector('.pf.next')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// aviso na partida: nivel novo do Pass com o premio
export const passEvent = (n) => { const p = PASS[n - 1]; return `<b class="pe-n">${n}</b>${passArt(p)}<span><small>${t('passUp', { n })}</small><b>${passName(p)}</b></span>`; };

// bloco do fim da partida. got = niveis que abriram nesta partida
export function renderEndPass(got = []) {
  const box = document.getElementById('endPass'); if (!box) return;
  const I = passInfo(), done = I.level >= PASS_MAX;
  box.hidden = false; box.classList.toggle('off', !I.on);
  box.innerHTML = I.on
    ? `<small>${t('passTitle')}</small><b class="ep-lvl">${t('passLevel', { n: I.level, m: PASS_MAX })}</b><span class="ps-bar"><i style="width:${done ? 100 : Math.round(I.into / I.need * 100)}%"></i></span>`
      + (got.length ? `<ul class="ep-got">${got.map(n => `<li>${passArt(PASS[n - 1])}<b>${passName(PASS[n - 1])}</b></li>`).join('')}</ul>` : '')
    : `<small>${t('passTitle')}</small><b class="ep-lvl">${t('passEndGate')}</b><a class="ps-elite" href="https://tryrovex.com/elite" target="_top" rel="noopener">${t('passGateGo')}</a>`;
}
