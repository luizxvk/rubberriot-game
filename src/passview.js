// Rovex Pass: aba da Loja. So o Elite
// da Rovex ativa o Pass: sem Elite a tira aparece trancada com o convite. Tambem desenha o aviso da partida e o bloco do fim.
import { t } from './i18n.js';
import { passInfo, BOOST_PASS_ELITE, BOOST_PASS_FREE } from './progress.js';
import { PASS, PASS_MAX, PASS_FREE } from './pass.js';
import { bannerHtml } from './banners.js';
import { CAMO_SWATCH } from './camos.js';
import { stampThumb } from './stamps.js';
import { RET_COLORS } from './arsenal.js';
import { openElite } from './elitepop.js';
import { pieceShot } from './shop.js';
import { audio } from './audio.js';
import { paneBusy, paneProg, settle } from './paneload.js';

const LOCK = '<svg class="pf-lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/></svg>';
// icones do visual: Material Icons (Apache 2.0)
const LOOK_ICO = {
  hat: 'M12 3 4 9v2h16V9l-8-6zM2 13v2h20v-2H2zm4 4v2h12v-2H6z', glove: 'M21 7c0-1.38-1.12-2.5-2.5-2.5-.17 0-.34.02-.5.05V4c0-1.38-1.12-2.5-2.5-2.5-.23 0-.46.03-.67.09C14.46.66 13.56 0 12.5 0c-1.23 0-2.25.89-2.46 2.06C9.87 2.02 9.69 2 9.5 2 8.12 2 7 3.12 7 4.5v5.89c-.34-.31-.76-.54-1.22-.66L5 9.5c-.82-.21-1.69.11-2.18.8-.38.54-.4 1.25-.06 1.82l3.33 5.58C7.34 19.56 9.6 21 12 21c4.97 0 9-4.03 9-9V7z',
  eyes: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', fx: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z' /* chama: nunca brilhinhos (regra 07/11) */,
};
const DANCE_ICO = 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7';
const swatchOf = (p) => (p.slot === 'gloveCol' || p.slot === 'shirt' ? p.id : null);
export const passArt = (p) => (p.k === 'banner' ? `<i class="pf-art pf-bnr">${bannerHtml(p.id, { plain: true })}</i>`
  : p.k === 'dance' ? `<i class="pf-art pf-look"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${DANCE_ICO}"/></svg></i>`
  : p.k === 'stamp' ? `<i class="pf-art" style="background:url(${stampThumb(p.id)}) center/cover"></i>`
  : swatchOf(p) ? `<i class="pf-art" style="background:${p.id}"></i>`
  : p.k === 'camo'
  ? `<i class="pf-art" style="background:${CAMO_SWATCH[p.id] || '#999'}"></i>`
  : p.k === 'ret' ? `<i class="pf-art pf-ret"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="${RET_COLORS[p.id]}" stroke-width="2.4"/><circle cx="12" cy="12" r="2.2" fill="${RET_COLORS[p.id]}"/></svg></i>`
    : `<i class="pf-art pf-look"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${LOOK_ICO[p.slot] || LOOK_ICO.fx}"/></svg></i>`);
export const passName = (p) => t(p.k === 'stamp' ? 'stamp_' + p.id : p.k === 'banner' ? 'bn_' + p.id : p.k === 'dance' ? 'dn_' + p.id : p.k === 'camo' ? 'camo_' + p.id : p.k === 'ret' ? 'retc_' + p.id : 'lk_' + p.slot + '_' + p.id);
const kindOf = (p) => t(p.k === 'stamp' ? 'shk_stamp' : p.k === 'banner' ? 'passBanner' : p.k === 'dance' ? 'passDance' : p.k === 'look' ? 'lkt_' + p.slot : p.k === 'camo' ? 'passCamo' : p.k === 'ret' ? 'passRet' : 'passLook');

// 08/11 (pedido dele): aba da Loja, no layout da Loja e no padrao de passe do Fortnite: premio grande a esquerda, nivel e progresso ao lado e a trilha
// de niveis embaixo (Elite em cima, gratis embaixo). Fotos so do que esta na tela, igual a vitrine.
let goTo = null, passIO = null, passRun = 0, pickRun = 0;
export const passNav = (f) => { goTo = f; };
export function stopPass() { passRun++; passIO?.disconnect(); paneBusy(document.getElementById('passPane'), false); }
const shotSlot = (p) => (p.k === 'look' ? p.slot : p.k);
const putShot = (el, u) => { el.innerHTML = `<img src="${u}" alt="">`; el.classList.add('img'); };
const rewardOf = (n, free) => (free ? PASS_FREE[n] : PASS[n - 1]);
const rarOf = (n, free) => (free ? 'comum' : n % 10 === 0 ? 'lendario' : 'epico');

export function renderPass() {
  const box = document.getElementById('passPane'); if (!box) return;
  const I = passInfo(), done = I.level >= PASS_MAX, cur = Math.min(PASS_MAX, I.level + 1), run = ++passRun;
  const isOpen = (n, free) => (free ? I.level >= n : I.on && I.level >= n);
  const tile = (n, free) => {
    const p = rewardOf(n, free), open = isOpen(n, free), boost = (free ? BOOST_PASS_FREE : BOOST_PASS_ELITE).includes(n);
    return `<button class="shop-tile psx-tile r-${rarOf(n, free)} ${open ? 'open' : 'locked'}" data-n="${n}" data-free="${free ? 1 : ''}" aria-label="${t('passLevel', { n, m: PASS_MAX })}: ${passName(p)}">
      <span class="st-bg"></span><span class="st-art psx-art">${passArt(p)}</span>
      <span class="st-tag ${free ? '' : 'psx-elite'}">${free ? t('passFreeTag') : 'Elite'}</span>${boost ? `<span class="pf-boost">${t('passBoost')}</span>` : ''}${open ? '' : LOCK}
      <span class="st-foot"><b>${passName(p)}</b><small>${kindOf(p)}</small></span></button>`;
  };
  box.innerHTML = `<section class="shop-sec psx-hero" aria-labelledby="psxH">
      <div class="psx-show" id="psxShow"><span class="st-bg"></span><span class="psx-shot" id="psxShot"></span></div>
      <div class="psx-side">
        <span class="shop-left">${t('season1')}</span>
        <h3 id="psxH">${t('passTitle')}</h3>
        <div class="ps-head"><b class="ps-lvl">${t('passLevel', { n: I.level, m: PASS_MAX })}</b>
          <span class="ps-xp"><span class="ps-bar"><i style="width:${done ? 100 : Math.round(I.into / I.need * 100)}%"></i></span><small>${done ? t('passDone') : t('passXp', { a: I.into.toLocaleString('pt-BR'), b: I.need.toLocaleString('pt-BR') })}</small></span></div>
        <div class="psx-pick"><b id="psxName"></b><small id="psxKind"></small><p id="psxState"></p><button class="psx-go" id="psxEquip" hidden>${t('psEquip')}</button></div>
        ${I.on ? `<p class="psx-note">${t('passHint')}</p>` : `<div class="psx-gate"><p>${t('passGate')}</p><button class="psx-go" id="psElite">${t('passGateGo')}</button></div>`}
      </div>
    </section>
    <section class="shop-sec" aria-labelledby="psxR">
      <header><h3 id="psxR">${t('psRewards')}</h3></header>
      <ol class="psx-track" id="psxTrack">${PASS.map((_, i) => { const n = i + 1; return `<li class="psx-col ${I.level >= n ? 'got' : ''} ${n === cur ? 'next' : ''}"><span class="psx-n">${n}</span>${tile(n, false)}${PASS_FREE[n] ? tile(n, true) : '<span class="psx-none" aria-hidden="true"></span>'}</li>`; }).join('')}</ol>
    </section>`;
  const shot = box.querySelector('#psxShot'), show = box.querySelector('#psxShow'), equip = box.querySelector('#psxEquip');
  const pick = (n, free) => {
    const p = rewardOf(n, free), open = isOpen(n, free), token = ++pickRun;
    box.querySelectorAll('.psx-tile.sel').forEach(x => x.classList.remove('sel'));
    box.querySelector(`.psx-tile[data-n="${n}"][data-free="${free ? 1 : ''}"]`)?.classList.add('sel');
    show.className = `psx-show r-${rarOf(n, free)}`;
    shot.classList.remove('img'); shot.innerHTML = passArt(p);
    box.querySelector('#psxName').textContent = passName(p);
    box.querySelector('#psxKind').textContent = `${kindOf(p)} · ${t('passLevel', { n, m: PASS_MAX })}`;
    box.querySelector('#psxState').textContent = open ? t('psUnlocked') : !free && !I.on ? t('psEliteOnly') : t('psLocked', { n });
    equip.hidden = !open;
    equip.onclick = () => goTo?.(['look', 'banner', 'dance'].includes(p.k) ? 'look' : 'arsenal');
    return pieceShot(shotSlot(p), p.id).then(u => { if (u && token === pickRun && shot.isConnected) putShot(shot, u); }).catch(() => {});
  };
  box.querySelectorAll('.psx-tile').forEach(b => { b.onclick = () => { audio.play('ui_click', { ui: true }); pick(+b.dataset.n, !!b.dataset.free); }; });
  const el = box.querySelector('#psElite'); if (el) el.onclick = () => openElite(el);
  // abre no proximo nivel; a fileira anda sozinha ate ele
  const track = box.querySelector('#psxTrack'), col = track.querySelector('.psx-col.next');
  if (col) track.scrollLeft = col.offsetLeft - track.clientWidth / 2 + col.offsetWidth / 2;
  paneBusy(box, true);
  const jobs = [pick(cur, false)]; let seen = false, doneFirst; const first = new Promise(r => { doneFirst = r; });
  passIO?.disconnect();
  passIO = new IntersectionObserver((es) => {
    const right = track.getBoundingClientRect().right;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      passIO.unobserve(e.target);
      const b = e.target.closest('.psx-tile'), p = rewardOf(+b.dataset.n, !!b.dataset.free);
      const job = pieceShot(shotSlot(p), p.id).then(u => { if (u && e.target.isConnected) putShot(e.target, u); }).catch(() => {});
      if (!seen && e.boundingClientRect.left < right) jobs.push(job);
    });
    if (!seen) { seen = true; let n = 0; jobs.forEach(j => j.then(() => paneProg(box, ++n, jobs.length))); Promise.all(jobs).then(doneFirst); }
  }, { root: track, rootMargin: '0px 300px' });
  box.querySelectorAll('.psx-art').forEach(a => passIO.observe(a));
  settle(first).then(() => { if (run === passRun) paneBusy(box, false); });
}

// aviso na partida: nivel novo do Pass com o premio
export const passEvent = (n, free) => { const p = free ? PASS_FREE[n] : PASS[n - 1]; return `<b class="pe-n">${n}</b>${passArt(p)}<span><small>${t('passUp', { n })}</small><b>${passName(p)}</b></span>`; };

// bloco do fim da partida. got = niveis que abriram nesta partida
export function renderEndPass(got = []) {
  const box = document.getElementById('endPass'); if (!box) return;
  const I = passInfo(), done = I.level >= PASS_MAX;
  box.hidden = false; box.classList.toggle('off', !I.on);
  box.innerHTML = I.on
    ? `<small>${t('passTitle')}</small><b class="ep-lvl">${t('passLevel', { n: I.level, m: PASS_MAX })}</b><span class="ps-bar"><i style="width:${done ? 100 : Math.round(I.into / I.need * 100)}%"></i></span>`
      + (got.length ? `<ul class="ep-got">${got.map(n => `<li>${passArt(PASS[n - 1])}<b>${passName(PASS[n - 1])}</b></li>`).join('')}</ul>` : '')
    : `<small>${t('passTitle')}</small><b class="ep-lvl">${t('passLevel', { n: I.level, m: PASS_MAX })}</b><span class="ps-bar"><i style="width:${done ? 100 : Math.round(I.into / I.need * 100)}%"></i></span><b class="ep-lvl">${t('passEndGate')}</b><a class="ps-elite" href="https://tryrovex.com/elite" target="_top" rel="noopener">${t('passGateGo')}</a>`;
}
