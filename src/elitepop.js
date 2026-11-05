// Popup do Rovex Elite (03/11, pedido dele): clicar no banner do Elite abre o selo grande e TODOS os beneficios,
// no jogo e na Rovex; o botao leva pra pagina do Elite (mesmo link do banner). Segue a regra do controle
// (vault: controle-popup.md): role=dialog + hidden, fecha no .lb-x / Esc / B, o foco volta pro banner.
// Icones: Material Icons (Apache 2.0); selo = EliteHexIcon do template-magazine.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, loadMe } from './rovex.js';
import { pieceShot } from './shop.js';

const P = {
  xp: 'M7 2v11h3v9l7-12h-4l4-8z',
  camo: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  look: 'M21.6 18.2 13 11.75v-.91a3.496 3.496 0 0 0-.18-6.75A3.51 3.51 0 0 0 8.5 7.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .84-.69 1.52-1.53 1.5-.54-.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8zM6 18l6-4.5 6 4.5H6z',
  badge: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
  pass: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z',
  zions: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  vault: 'M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z',
  frame: 'M3 5v14h18V5H3zm16 12H5V7h14v10zM7 9h4v2H7zm0 4h10v2H7z',
  games: 'M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
};
const ico = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;
const HEX = '<svg viewBox="0 0 64 64" aria-hidden="true"><path class="ep-hex-in" d="M32 3L57 17V45L32 59L7 45V17L32 3Z"/><path class="ep-hex-out" d="M32 3L57 17V45L32 59L7 45V17L32 3Z"/><path d="M32 18L35.5 26L44 27L38 33L39 42L32 38L25 42L26 33L20 27L28.5 26L32 18Z"/></svg>';
// beneficios: no jogo (o que o codigo libera de verdade) e na Rovex (pagina do Elite)
const GAME = [['xp', 'el_xp'], ['camo', 'el_pack'], ['camo', 'el_camo'], ['look', 'el_look'], ['badge', 'el_badge']];
const ROVEX = [['pass', 'el_pass'], ['zions', 'el_zions'], ['vault', 'el_vault'], ['frame', 'el_frame'], ['games', 'el_games']];

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
    <a class="big elp-go" href="${document.getElementById('elitePromo')?.href || 'https://tryrovex.com/elite'}" target="_top" rel="noopener">${t(on ? 'el_manage' : 'el_join')}</a>
  </div>`;
  pop.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); close(); };
  // saiu pra assinar: quando voltar com o Elite ativo, o parabens abre
  pop.querySelector('.elp-go').addEventListener('click', () => { if (!on) try { localStorage.setItem(WAIT, String(Date.now())); } catch { /* */ } });
}
// assinou saindo daqui e voltou (05/11, pedido dele): parabens, primeiro o que ganha no jogo e embaixo o que ganha na Rovex
const WAIT = 'rr_elite_wait', WAIT_MS = 14 * 864e5;
export function openEliteWelcome() {
  const pop = document.getElementById('elitePop'); if (!pop) return;
  opener = null;
  pop.innerHTML = `<div class="elp-box elp-welcome">
    <header class="elp-head"><span class="elp-hex">${HEX}</span><div><h2 id="elpTitle">${t('el_welcome')}</h2><p>${t('el_welcomeSub')}</p></div></header>
    <div class="elp-cols elp-one"><section><h3>${t('el_inGame')}</h3><ul>${GAME.map(li).join('')}</ul></section>
    <section><h3>${t('el_inRovex')}</h3><ul>${ROVEX.map(li).join('')}</ul></section></div>
    <button class="big elp-go" id="elpDone">${t('el_welcomeGo')}</button>
  </div>`;
  pop.querySelector('#elpDone').onclick = () => { audio.play('ui_click', { ui: true }); close(); };
  pop.hidden = false; pop.classList.add('welcome'); fillShots(pop);
  audio.play('unlock', { ui: true, vol: 0.8, jitter: 0 });
  pop.querySelector('#elpDone').focus({ preventScroll: true });
}
function welcomeCheck() {
  let at = 0; try { at = +localStorage.getItem(WAIT) || 0; } catch { /* */ }
  if (!at) return;
  if (Date.now() - at > WAIT_MS) { try { localStorage.removeItem(WAIT); } catch { /* */ } return; }
  if (!me?.elite || document.body.classList.contains('ingame')) return; // no meio da partida espera voltar pro menu
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
  const promo = document.getElementById('elitePromo');
  if (promo) promo.addEventListener('click', (e) => { e.preventDefault(); openElite(promo); });
}
