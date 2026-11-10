// Popup do Rovex Elite (03/11, pedido dele): clicar no banner do Elite abre o selo grande e TODOS os beneficios,
// no jogo e na Rovex; o botao leva pra pagina do Elite (mesmo link do banner). Segue a regra do controle
// (vault: controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B, o foco volta pro banner.
// Icones: Material Icons (Apache 2.0); selo = EliteHexIcon do template-magazine.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, loadMe, elitePresent, loadShop, igReward } from './rovex.js';
import { BM_VARIANTS } from '../shared/blackmarket.js';
import { partName } from './arsenal.js';
import { getLang } from './i18n.js';
import { pieceShot, pieceShotNow } from './shop.js';
import { sceneReady } from './popgate.js';

const P = {
  xp: 'M7 2v11h3v9l7-12h-4l4-8z',
  camo: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  look: 'M21.6 18.2 13 11.75v-.91a3.496 3.496 0 0 0-.18-6.75A3.51 3.51 0 0 0 8.5 7.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .84-.69 1.52-1.53 1.5-.54-.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8zM6 18l6-4.5 6 4.5H6z',
  badge: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  pass: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  zions: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  vault: 'M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z',
  frame: 'M3 5v14h18V5H3zm16 12H5V7h14v10zM7 9h4v2H7zm0 4h10v2H7z',
  box: 'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4l16-.02V7z', // inventory_2 (variantes do mes)
  video: 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z',
  border: 'M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z',
  cards: 'M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zM7.88 8.75c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2 11c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z',
  puzzle: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z',
  words: 'M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z',
  grid: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z',
  flame: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
  star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  games: 'M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;
const HEX = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="ep-hex-in" d="M32 3L57 17V45L32 59L7 45V17L32 3Z"/><path class="ep-hex-out" d="M32 3L57 17V45L32 59L7 45V17L32 3Z"/><path d="M32 18L35.5 26L44 27L38 33L39 42L32 38L25 42L26 33L20 27L28.5 26L32 18Z"/></svg>';
// beneficios: no jogo (o que o codigo libera de verdade) e na Rovex (pagina do Elite)
// 10/11 (pedido dele): a lista mostra TODO premio do Elite no jogo (variantes do mes, Pass, exclusivos, banner/traçado/efeito)
const GAME = [['xp', 'el_xp'], ['box', 'el_bm'], ['pass', 'el_rrpass'], ['star', 'el_excl'], ['frame', 'el_ebanner'], ['camo', 'el_pack'], ['camo', 'el_camo'], ['look', 'el_look'], ['badge', 'el_badge']];
const ROVEX = [['pass', 'el_pass'], ['zions', 'el_zions'], ['xp', 'el_xpRovex'], ['vault', 'el_vault'], ['video', 'el_vbg'], ['frame', 'el_banners'], ['border', 'el_borders'], ['cards', 'el_cards'], ['flame', 'el_boss'], ['puzzle', 'el_glyph'], ['words', 'el_lexis'], ['grid', 'el_trama']];

let opener = null;
// XP em dobro: selo desenhado de verdade; pack, camo e visual: foto da peca (preenchida depois, a foto leva um quadro pra sair)
const XP2 = '<svg class="elp-xp2" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 2l7.500 9.500L51 8l1.500 12L64 25l-7 10 4 11.500-12 1.500-5 11.500-11-5.500-11 5.500-5-11.500-12-1.500 4-11.500-7-10 11.500-5L13 8l12 3.500z" fill="#ffc83d" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M15 24c1-5 5-8 10-8 6 0 10 3.500 10 8.500 0 4-2.500 6.500-7 10l-2.500 2H35v6H15v-5l8.500-7.500c3-2.600 4.500-4.200 4.500-6 0-1.800-1.200-2.800-3-2.800-1.900 0-3 1.200-3.400 3.200zM37 25h7.500l3 5.200 3.100-5.200h7.100l-6.400 9 6.700 9.500h-7.400l-3.400-5.700-3.400 5.700H37l6.700-9.300z" fill="#141210"/></svg>';
const SHOTS = { el_pack: 'wskin:pulse', el_camo: 'camo:hexelite', el_look: 'hat:tvhead' };
const li = ([k, key]) => `<li>${key === 'el_xp' ? XP2 : SHOTS[key] ? `<span class="elp-shot" data-shot="${SHOTS[key]}">${ico(k)}</span>` : ico(k)}<span><b>${t(key)}</b><small>${t(key + 'D')}</small></span></li>`;
async function fillShots(pop) { for (const e of pop.querySelectorAll('[data-shot]')) { const [sl, v] = e.dataset.shot.split(':'); try { const u = await pieceShot(sl, v); if (u && e.isConnected) e.innerHTML = `<img src="${u}" alt="">`; } catch (err) { console.warn('foto do Elite', err); } } }

function draw(pop) {
  const on = !!me?.elite;
  pop.innerHTML = `<div class="elp-box">
    <button class="lb-x" aria-label="${t('close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
    <header class="elp-head"><span class="elp-hex">${HEX}</span><div><h2 id="elpTitle">Rovex Elite</h2><p>${t(on ? 'el_on' : 'el_sub')}</p></div></header>
    <div class="elp-cols">
      <section><h3>${t('el_inGame')}</h3><ul>${GAME.map(li).join('')}</ul></section>
      <section><h3>${t('el_inRovex')}</h3><ul>${ROVEX.map(li).join('')}</ul></section>
    </div>
    <a class="big elp-go" href="${document.getElementById('elitePromo')?.href || 'https://tryrovex.com/elite'}" target="_top" rel="noopener"><span>${t(on ? 'el_manage' : 'el_join')}</span><svg class="elp-ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg></a>
  </div>`;
  pop.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); close(); };
  // saiu pra assinar: quando voltar com o Elite ativo, o parabens abre
  pop.querySelector('.elp-go').addEventListener('click', () => { if (!on) try { localStorage.setItem(WAIT, String(Date.now())); } catch { /* */ } });
}
// assinou saindo daqui e voltou (05/11, pedido dele): parabens, primeiro o que ganha no jogo e embaixo o que ganha na Rovex
const WAIT = 'rr_elite_wait', WAIT_MS = 14 * 864e5;
// 10/11 (pedido dele): os premios aparecem UM POR UM, entrando com pulo e brilho e indo pra direita numa fileira; primeiro
// os do Rubber Riot, depois os da Rovex (cada grupo abre com um cartao de capitulo). "Mostrar tudo" pula; no fim, "Bora jogar"
let elwTimer = 0;
export function openEliteWelcome() {
  const pop = document.getElementById('elitePop'); if (!pop) return;
  opener = null; clearTimeout(elwTimer);
  for (const v of Object.values(SHOTS)) { const [sl, id] = v.split(':'); pieceShot(sl, id).catch(() => {}); } // a foto fica pronta antes do cartao entrar
  const seq = [{ hero: 1 }, { sec: 'game' }, ...GAME.map(x => ({ it: x, sec: 'game' })), { sec: 'rovex' }, ...ROVEX.map(x => ({ it: x, sec: 'rovex' }))];
  const total = GAME.length + ROVEX.length;
  pop.innerHTML = `<div class="elp-box elp-welcome elw">
    <header class="elp-head"><span class="elp-hex">${HEX}</span><div><h2 id="elpTitle">${t('el_welcome')}</h2><p>${t('el_welcomeSub')}</p></div></header>
    <div class="elw-stage"><span class="elw-rays" aria-hidden="true"></span><ol class="elw-track" aria-live="polite"></ol>
      <button type="button" class="elw-nav prev" aria-label="${t('elw_prev')}" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
      <button type="button" class="elw-nav next" aria-label="${t('elw_next')}" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button></div>
    <div class="elw-bar"><b class="elw-count">0 / ${total}</b><button type="button" class="elw-skip">${t('elw_skip')}</button></div>
    <button class="big elp-go elw-go" id="elpDone" hidden>${t('el_welcomeGo')}</button>
  </div>`;
  const track = pop.querySelector('.elw-track'), count = pop.querySelector('.elw-count'), skip = pop.querySelector('.elw-skip'), go = pop.querySelector('#elpDone');
  go.onclick = () => { audio.play('ui_click', { ui: true }); clearTimeout(elwTimer); close(); };
  // roda do mouse anda a fileira pro lado; setas e deslizar no toque tambem. Mexeu na mao: a revelacao para de puxar pro fim por 3 s
  let handT = 0; const hand = () => { handT = performance.now(); };
  track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { track.scrollLeft += e.deltaY; e.preventDefault(); } hand(); }, { passive: false });
  track.addEventListener('pointerdown', hand); track.addEventListener('touchstart', hand, { passive: true });
  const prev = pop.querySelector('.elw-nav.prev'), next = pop.querySelector('.elw-nav.next');
  const navUpd = () => { prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 8; };
  track.addEventListener('scroll', navUpd, { passive: true });
  const page = (d) => { hand(); audio.play('ui_hover', { ui: true }); const w = (track.querySelector('.elw-card')?.offsetWidth || 180) + 12; track.scrollBy({ left: d * w * 2, behavior: 'smooth' }); };
  prev.onclick = () => page(-1); next.onclick = () => page(1);
  pop.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); page(1); } });
  let i = 0, got = 0;
  const card = (s) => {
    const li = document.createElement('li');
    if (s.hero) { li.className = 'elw-card elw-hero'; li.innerHTML = `<span class="elw-art">${HEX}</span><b>Rovex Elite</b><small>${t('elw_hero')}</small><em>${t('elw_on')}</em>`; return li; }
    if (!s.it) { li.className = 'elw-card elw-sec ' + s.sec; li.innerHTML = `<span class="elw-art">${s.sec === 'game' ? ico('games') : HEX}</span><b>${t(s.sec === 'game' ? 'el_inGame' : 'el_inRovex')}</b>`; return li; }
    const [k, key] = s.it;
    li.className = 'elw-card ' + s.sec;
    li.innerHTML = `<span class="elw-art">${key === 'el_xp' ? XP2 : SHOTS[key] ? `<span class="elp-shot" data-shot="${SHOTS[key]}">${ico(k)}</span>` : ico(k)}</span><b>${t(key)}</b><small>${t(key + 'D')}</small>`;
    return li;
  };
  const finish = () => {
    clearTimeout(elwTimer); skip.hidden = true;
    count.textContent = t('elw_done', { n: total }); count.classList.add('done');
    go.hidden = false; go.classList.add('pop'); go.focus({ preventScroll: true });
    track.querySelector('.new')?.classList.remove('new');
    audio.play('reward_fanfare', { ui: true, vol: 0.8, jitter: 0 });
    setTimeout(navUpd, 400);
  };
  const step = (fast) => {
    if (pop.hidden || !track.isConnected) return;
    if (i >= seq.length) { finish(); return; }
    const s = seq[i++], li = card(s);
    track.querySelector('.new')?.classList.remove('new');
    if (!fast) li.classList.add('in', 'new');
    track.appendChild(li);
    if (s.it) { got++; count.textContent = got + ' / ' + total; }
    const sh = li.querySelector('[data-shot]'); if (sh) fillShots(li);
    if (fast) return;
    if (performance.now() - handT > 3000) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
    navUpd();
    audio.play(s.it ? 'reward_card' : 'reward_section', { ui: true, vol: s.it ? 0.7 : 0.8, rate: s.it ? 0.92 + Math.min(got, 20) * 0.025 : 1, jitter: 0 }); // sino sobe de tom a cada premio
    elwTimer = setTimeout(() => step(false), s.it ? 620 : s.hero ? 1100 : 900);
  };
  skip.onclick = () => { audio.play('ui_click', { ui: true }); clearTimeout(elwTimer); while (i < seq.length) step(true); track.scrollTo({ left: 0, behavior: 'smooth' }); finish(); };
  pop.hidden = false; pop.classList.add('welcome');
  audio.play('unlock', { ui: true, vol: 0.8, jitter: 0 });
  skip.focus({ preventScroll: true });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { while (i < seq.length) step(true); finish(); return; }
  elwTimer = setTimeout(() => step(false), 700);
}
// presente do mes (10/11, pedido dele): 4 variantes do Mercado Negro sorteadas no servidor; popup agradecendo com elas e o 2x XP.
// Pede uma vez por abertura do jogo; o servidor so entrega uma vez por mes (o resto volta vazio)
let giftAsked = false, giftWait = null, giftBusy = false;
// Novidades esperam enquanto o Elite tem popup pra mostrar (parabens pendente, presente sendo pedido ou na fila)
export function eliteBusy() { let at = 0; try { at = +localStorage.getItem(WAIT) || 0; } catch { /* */ } return giftBusy || !!giftWait || (!!at && !!me?.elite); }
// fotos das variantes prontas ANTES do popup (a foto e montada em 3D e leva um tempo); no maximo 20 s de espera (corre por tras, o jogador nem ve)
const preShots = (ids) => Promise.race([Promise.all(ids.map(id => pieceShot('bp', id).catch(() => null))), new Promise(r => setTimeout(r, 20000))]);
async function giftCheck() {
  // so no localhost (10/11, pedido dele "triga o popup de novo"): ?presente mostra o popup com 4 variantes sorteadas, sem dar nada
  if (import.meta.env.DEV && !giftAsked && new URLSearchParams(location.search).has('presente')) { giftAsked = true; const all = Object.keys(BM_VARIANTS).sort(() => Math.random() - 0.5).slice(0, 4); await preShots(all); giftWait = all; showGift(); return; }
  if (giftAsked || !me?.elite) return;
  giftAsked = true; giftBusy = true;
  try {
    const j = await elitePresent();
    if (!j?.novos?.length) return;
    await loadShop();
    await preShots(j.novos); // 10/11 (pedido dele): abre ja com as fotos das armas, nunca com a caixinha no lugar
    giftWait = j.novos; showGift();
  } finally { giftBusy = false; }
}
function showGift() {
  if (!giftWait) return;
  if (document.body.classList.contains('ingame')) { setTimeout(showGift, 4000); return; } // no meio da partida espera voltar pro menu
  const pop = document.getElementById('elitePop'); const other = [...document.querySelectorAll('[role=dialog][aria-modal=true]')].some(d => d !== pop && !d.hidden && d.offsetParent !== null); // outro popup aberto (Novidades, presente): espera, um de cada vez
  if (!pop || !pop.hidden || other || !sceneReady()) { setTimeout(showGift, 1500); return; }
  const ids = giftWait; giftWait = null; opener = null;
  const pt = getLang() === 'pt';
  const card = (id) => { const V = BM_VARIANTS[id]; if (!V) return ''; return `<li class="elg-card r-${V.rar}"><span class="elg-shot" data-shot="bp:${id}">${pieceShotNow('bp', id) ? `<img src="${pieceShotNow('bp', id)}" alt="">` : ico('box')}</span><b>${pt ? V.pt : V.en}</b><small>${partName('body', V.lo.body)} · ${t('rar_' + V.rar)}</small></li>`; };
  pop.innerHTML = `<div class="elp-box elp-welcome elp-gift">
    <header class="elp-head"><span class="elp-hex">${HEX}</span><div><h2 id="elpTitle">${t('elg_title')}</h2><p>${t('elg_sub', { n: ids.length })}</p></div></header>
    <div class="elg-scroll"><ul class="elg-grid">${ids.map(card).join('')}</ul>
    <div class="elg-xp">${XP2}<span><b>${t('el_xp')}</b><small>${t('elg_xp')}</small></span></div>
    <p class="elg-note">${t('elg_note')}</p></div>
    <button class="big elp-go" id="elpDone">${t('elg_go')}</button>
  </div>`;
  pop.querySelector('#elpDone').onclick = () => { audio.play('ui_click', { ui: true }); close(); };
  pop.hidden = false; pop.classList.add('welcome'); fillShots(pop);
  audio.play('reward_fanfare', { ui: true, vol: 0.8, jitter: 0 });
  pop.querySelector('#elpDone').focus({ preventScroll: true });
}
function welcomeCheck() {
  // 10/11 (pedido dele): quem acabou de assinar ve PRIMEIRO o parabens (uma vez so) e depois o presente do mes; o presente
  // espera o popup fechar (showGift). Por isso o presente so e pedido no fim daqui
  welcomeFirst(); giftCheck();
}
function welcomeFirst() {
  let at = 0; try { at = +localStorage.getItem(WAIT) || 0; } catch { /* */ }
  if (!at) return;
  if (Date.now() - at > WAIT_MS) { try { localStorage.removeItem(WAIT); } catch { /* */ } return; }
  if (!me?.elite || document.body.classList.contains('ingame')) return; // no meio da partida espera voltar pro menu
  if (!sceneReady()) { setTimeout(welcomeFirst, 1500); return; } // loader ainda na tela
  const pop = document.getElementById('elitePop'); if (pop && !pop.hidden) return;
  try { localStorage.removeItem(WAIT); } catch { /* */ }
  openEliteWelcome();
}
function close() {
  const pop = document.getElementById('elitePop'); if (!pop || pop.hidden) return;
  pop.hidden = true;
  if (opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}
export function openElite(from) {
  const pop = document.getElementById('elitePop'); if (!pop) return;
  opener = from || null;
  draw(pop);
  pop.hidden = false; pop.classList.remove('welcome'); fillShots(pop);
  audio.play('ui_click', { ui: true });
  pop.querySelector('.elp-go').focus({ preventScroll: true });
}
function igDone() {
  try { localStorage.setItem('rr_ig_done', '1'); } catch { /* */ }
  const s = document.getElementById('igSubTx'), c = document.getElementById('igChipTx');
  if (s) { s.dataset.i18n = 'igSubDone'; s.textContent = t('igSubDone'); } if (c) { c.dataset.i18n = 'igChipDone'; c.textContent = t('igChipDone'); }
}
export function initElitePop() {
  if (document.getElementById('elitePop')) return;
  const pop = document.createElement('div');
  pop.id = 'elitePop'; pop.className = 'elite-pop'; pop.hidden = true;
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'elpTitle');
  document.body.appendChild(pop);
  addEventListener('rovex-me', welcomeCheck); setInterval(welcomeCheck, 4000);
  addEventListener('focus', () => { let at = 0; try { at = +localStorage.getItem(WAIT) || 0; } catch { /* */ } if (at && !me?.elite) loadMe().then(welcomeCheck).catch(() => {}); });
  welcomeCheck();
  pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); close(); } });
  // Instagram (10/11, pedido dele): o link abre o perfil (aba nova) e o clique ja vale 1000 Zions Points uma vez por conta
  const ig = document.getElementById('igPromo');
  if (ig) ig.addEventListener('click', () => { igReward().then(r => { if (r?.ok) { igDone(); dispatchEvent(new CustomEvent('rr-toast', { detail: t('igGot', { n: r.total }) })); audio.play('unlock', { ui: true, vol: 0.6 }); } else if (r?.code === 'ja_resgatou') igDone(); }); });
  try { if (localStorage.getItem('rr_ig_done')) igDone(); } catch { /* */ }
  const promo = document.getElementById('elitePromo');
  if (promo) promo.addEventListener('click', (e) => { e.preventDefault(); openElite(promo); });
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('eliteBemVindo')) { const w = () => (sceneReady() ? openEliteWelcome() : setTimeout(w, 500)); w(); } // so no localhost: ver o parabens do Elite
}
