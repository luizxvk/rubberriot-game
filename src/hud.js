// HUD em DOM: placa de placar, vida, municao, feed, marcadores, placar (Tab).
import { bindLabel } from './binds.js';
import * as THREE from 'three';
import { WEAPONS, MODES, GUN_LADDER, GADGETS } from '../shared/weapons.js';
import { STREAKS, BR, STREAK_FREE, pickStreaks } from '../shared/weapons.js';
// proxima sequencia pra chamar: a primeira que pode agora; se nenhuma pode (dirigivel esperando), a primeira guardada
const callNext = (ready, lock) => ready.find(k => STREAK_FREE.includes(k) || !lock) || ready[0];
const callLocked = (ready, lock) => !!ready.length && !!lock && !ready.some(k => STREAK_FREE.includes(k));
import { t, wName, modeName, eliteTag } from './i18n.js';
import { badgeSvg } from './rank.js';
import { partName } from './arsenal.js';
import { isTouch } from './input.js';
import { audio } from './audio.js';
// icone do que a pessoa usa pra jogar, do lado do nome no placar (Material Icons: computer, smartphone, sports_esports)
const DEV_ICON = {
  pc: 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
  mob: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
  pad: 'M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
};
const devIcon = (d) => DEV_ICON[d] ? `<svg class="dev-ico" viewBox="0 0 24 24" aria-label="${t('dev_' + d)}" role="img"><path d="${DEV_ICON[d]}"/></svg>` : '';

const $ = (id) => document.getElementById(id);
const TEAM = { red: 'h_red', blue: 'h_blue' };
// pavio curto: as sequencias a partir da bigorna custam 1 abate a menos (igual ao servidor)
// selos das sequencias: desenho proprio (tinta + papel), viewBox 48. ink = traco, cor = currentColor do selo
export const STREAK_SVG = {
  sentry: `<path d="M24 30l-9 13M24 30l9 13M24 30v13" stroke="#141210" stroke-width="3" stroke-linecap="round"/><rect x="13" y="14" width="20" height="16" rx="3" fill="currentColor" stroke="#141210" stroke-width="3"/><path d="M33 19h11v6H33z" fill="#3a3632" stroke="#141210" stroke-width="2.5"/><circle cx="20" cy="22" r="3" fill="#ece9e1" stroke="#141210" stroke-width="2"/>`,
  plane: `<path d="M6 18h36v5H6z" fill="#ece9e1" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 29h32v4H8z" fill="#ece9e1" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 23v6M34 23v6" stroke="#141210" stroke-width="2"/><ellipse cx="24" cy="26" rx="6" ry="5" fill="currentColor" stroke="#141210" stroke-width="2.5"/><path d="M24 12v28" stroke="#141210" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="26" r="1.8" fill="#141210"/>`,
  train: `<rect x="23" y="13" width="17" height="19" rx="2" fill="currentColor" stroke="#141210" stroke-width="2.5"/><rect x="6" y="19" width="19" height="13" rx="6" fill="#3a3632" stroke="#141210" stroke-width="2.5"/><path d="M10 19v-6h6v6" fill="#3a3632" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><circle cx="12" cy="37" r="4" fill="#ece9e1" stroke="#141210" stroke-width="2.5"/><circle cx="24" cy="37" r="4" fill="#ece9e1" stroke="#141210" stroke-width="2.5"/><circle cx="35" cy="37" r="4" fill="#ece9e1" stroke="#141210" stroke-width="2.5"/><circle cx="12" cy="24" r="2" fill="#ece9e1"/><path d="M4 8c3-2 6 2 9 0" stroke="#141210" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  bomber: `<ellipse cx="22" cy="18" rx="18" ry="11" fill="currentColor" stroke="#141210" stroke-width="3"/><path d="M8 15c7-3 21-3 28 0M8 21c7 3 21 3 28 0" stroke="#ece9e1" stroke-width="2" fill="none"/><path d="M40 13l5-4v18l-5-4" fill="#3a3632" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><rect x="15" y="29" width="14" height="5" rx="1.5" fill="#3a3632" stroke="#141210" stroke-width="2.5"/><path d="M19 37c0 3 2 5 2 7M25 37c0 3-2 5-2 7" stroke="#ff8a1f" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  hand: `<path d="M16 6h12v10H16z" fill="#141210" stroke="#141210" stroke-width="2.5"/><path d="M13 18c0-2 2-3 4-3h10c2 0 4 1 4 3v8c3 0 5 2 5 4s-2 4-5 4H16c-2 0-4-2-4-4z" fill="#ece9e1" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 20v6M22 20v6M26 20v6" stroke="#141210" stroke-width="1.8"/><path d="M20 34l-2 8h6l-2-8" fill="#e58aa0" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><path d="M33 40c3-1 6-1 9 0" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  milk: `<path d="M18 5h12v6l4 6v24a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V17l4-6z" fill="#ece9e1" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M14 24h20v17a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="currentColor" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M26 22l-6 10h5l-3 8 8-11h-5l3-7z" fill="#ece9e1" stroke="#141210" stroke-width="2" stroke-linejoin="round"/><path d="M17 11h14" stroke="#141210" stroke-width="2.5"/>`,
  talc: `<path d="M12 30c-5 0-8-3-8-7s3-7 8-6c1-5 6-8 11-7 3-3 10-2 12 3 5 0 9 3 9 8s-4 9-9 9z" fill="#ece9e1" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><circle cx="18" cy="22" r="4" fill="currentColor" stroke="#141210" stroke-width="2"/><circle cx="30" cy="20" r="5" fill="currentColor" stroke="#141210" stroke-width="2"/><path d="M10 36l2 2M20 38l1 3M30 37l-1 3M39 35l2 3" stroke="#141210" stroke-width="2.5" stroke-linecap="round"/>`,
  rpg: `<g transform="rotate(-32 24 24)"><rect x="6" y="20" width="26" height="8" rx="1.5" fill="currentColor" stroke="#141210" stroke-width="3"/><path d="M32 18.5h4l8 5.5-8 5.5h-4z" fill="#ece9e1" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M4 17.5v13" stroke="#141210" stroke-width="3.5" stroke-linecap="round"/><path d="M14 28v7m8-7v5" stroke="#141210" stroke-width="3" stroke-linecap="round"/></g>`,
  anvline: `<g transform="translate(0 2) scale(.46)"><path d="M7 15h27c0 5 3 8 9 8v3c-7 0-9 2-11 6h-5v4h6v5H15v-5h6v-4h-4c-3-5-6-8-10-10z" fill="currentColor" stroke="#141210" stroke-width="5" stroke-linejoin="round"/></g><g transform="translate(13 13) scale(.46)"><path d="M7 15h27c0 5 3 8 9 8v3c-7 0-9 2-11 6h-5v4h6v5H15v-5h6v-4h-4c-3-5-6-8-10-10z" fill="currentColor" stroke="#141210" stroke-width="5" stroke-linejoin="round"/></g><g transform="translate(26 24) scale(.46)"><path d="M7 15h27c0 5 3 8 9 8v3c-7 0-9 2-11 6h-5v4h6v5H15v-5h6v-4h-4c-3-5-6-8-10-10z" fill="currentColor" stroke="#141210" stroke-width="5" stroke-linejoin="round"/></g><path d="M4 44l40-40" stroke="#141210" stroke-width="2" stroke-dasharray="3 4"/>`,
  uav: `<circle cx="24" cy="25" r="15" fill="#ece9e1" stroke="#141210" stroke-width="3"/><path d="M24 25V10a15 15 0 0 1 13 7.5z" fill="currentColor" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="25" r="7" fill="none" stroke="#141210" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="31" cy="20" r="2.6" fill="#141210"/><circle cx="17" cy="31" r="2" fill="#141210"/><circle cx="24" cy="25" r="2" fill="#141210"/>`,
  anvil: `<path d="M7 15h27c0 5 3 8 9 8v3c-7 0-9 2-11 6h-5v4h6v5H15v-5h6v-4h-4c-3-5-6-8-10-10z" fill="currentColor" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M11 18h20" stroke="#ece9e1" stroke-width="2" stroke-linecap="round"/><path d="M8 8l4 3M17 5l1 4M27 6l-2 4" stroke="#141210" stroke-width="2.5" stroke-linecap="round"/>`,
  blimp: `<path d="M35 22l9-7v15z" fill="currentColor" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="21" cy="22" rx="17" ry="9" fill="currentColor" stroke="#141210" stroke-width="3"/><path d="M8 19c6-2 20-2 27 0" stroke="#ece9e1" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18 31v3M25 31v3" stroke="#141210" stroke-width="2.5"/><rect x="15" y="33" width="13" height="6" rx="2" fill="#ece9e1" stroke="#141210" stroke-width="2.5"/>`,
  nuke: `<path d="M13 23c-5 0-7-3-7-6 0-4 4-6 7-5 1-4 5-6 9-5 3-3 10-2 12 3 4 0 7 3 7 6 0 4-3 7-7 7z" fill="currentColor" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M20 23h8l1.5 9h-11z" fill="currentColor" stroke="#141210" stroke-width="2.5" stroke-linejoin="round"/><path d="M6 33h36l-4 9H10z" fill="#e0a33a" stroke="#141210" stroke-width="3" stroke-linejoin="round"/><path d="M9 33c2-3 5-3 7 0 2-3 5-3 7 0 2-3 5-3 7 0 2-3 5-3 7 0 2-3 3-2 4 0" fill="none" stroke="#141210" stroke-width="2"/>`,
};
// tela de morte (03/11, hotfix): o que derruba e nao e arma de mao (granada, equipamento, C4, queda, iris) tambem tem
// icone no quadrinho do meio; as sequencias vem do STREAK_SVG. Mesmo viewBox 48 e traco de tinta
const INK_S = 'stroke="#141210" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
export const NADE_SVG = {"ammobox":"<rect x=\"7\" y=\"19\" width=\"34\" height=\"22\" rx=\"2\" fill=\"#a8743f\" stroke=\"#141210\" stroke-width=\"2.5\"/><path d=\"M7 30h34\" stroke=\"#141210\" stroke-width=\"2\"/><path d=\"M15 19V12a3 3 0 0 1 6 0v7zM27 19V12a3 3 0 0 1 6 0v7z\" fill=\"#d9b24c\" stroke=\"#141210\" stroke-width=\"2\"/><path d=\"M7 19l6 6M41 19l-6 6M7 41l6-6M41 41l-6-6\" stroke=\"#141210\" stroke-width=\"2\"/>","frag":"<ellipse cx=\"24\" cy=\"28\" rx=\"11\" ry=\"13\" fill=\"#5b6b43\" stroke=\"#141210\" stroke-width=\"3\"/><path d=\"M18 14h12v-4H18z\" fill=\"#3a3632\" stroke=\"#141210\" stroke-width=\"2.5\"/><path d=\"M30 12c6 0 8 4 7 9\" fill=\"none\" stroke=\"#141210\" stroke-width=\"3\"/>","tomahawk":"<path d=\"M14 40 32 10\" stroke=\"#8a5a2b\" stroke-width=\"5\" stroke-linecap=\"round\"/><path d=\"M14 40 32 10\" stroke=\"#141210\" stroke-width=\"7\" stroke-linecap=\"round\" opacity=\".25\"/><path d=\"M27 8c8 1 13 6 13 13l-9-3-4 3z\" fill=\"#cfd4d6\" stroke=\"#141210\" stroke-width=\"3\" stroke-linejoin=\"round\"/>","thermo":"<rect x=\"15\" y=\"12\" width=\"18\" height=\"28\" rx=\"4\" fill=\"#3a3632\" stroke=\"#141210\" stroke-width=\"3\"/><rect x=\"15\" y=\"22\" width=\"18\" height=\"7\" fill=\"#f08a2a\" stroke=\"#141210\" stroke-width=\"2\"/><path d=\"M20 8h8v4h-8z\" fill=\"#c9a34a\" stroke=\"#141210\" stroke-width=\"2.5\"/><path d=\"M36 14c4 3 4 8 0 11\" fill=\"none\" stroke=\"#f08a2a\" stroke-width=\"3\"/>","flash":"<rect x=\"17\" y=\"12\" width=\"14\" height=\"28\" rx=\"3\" fill=\"#ece9e1\" stroke=\"#141210\" stroke-width=\"3\"/><path d=\"M19 20h10M19 28h10\" stroke=\"#141210\" stroke-width=\"2\"/><path d=\"M38 8l-4 7h5l-5 8\" fill=\"none\" stroke=\"#e3b23c\" stroke-width=\"3\" stroke-linejoin=\"round\"/>","smoke":"<rect x=\"16\" y=\"20\" width=\"14\" height=\"22\" rx=\"3\" fill=\"#8e958c\" stroke=\"#141210\" stroke-width=\"3\"/><rect x=\"16\" y=\"26\" width=\"14\" height=\"5\" fill=\"#5f8f5f\"/><path d=\"M14 18c-4-1-5-6-1-8 1-5 7-6 10-3 3-3 9-1 9 4 4 1 5 6 1 8\" fill=\"#d9d6cf\" stroke=\"#141210\" stroke-width=\"2.5\"/>","beacon":"<circle cx=\"22\" cy=\"24\" r=\"10\" fill=\"#9fb4c6\" stroke=\"#141210\" stroke-width=\"3\"/><path d=\"M16 33l-4 9M28 33l4 9M22 34v8\" stroke=\"#141210\" stroke-width=\"3\" stroke-linecap=\"round\"/><path d=\"M29 16V6l9 3-9 3\" fill=\"#ece9e1\" stroke=\"#141210\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/><circle cx=\"22\" cy=\"13\" r=\"3\" fill=\"#7fe6ff\" stroke=\"#141210\" stroke-width=\"2\"/>"};
export const DEATH_SVG = {
  ...STREAK_SVG, tomahawk: NADE_SVG.tomahawk, thermo: NADE_SVG.thermo, beacon: NADE_SVG.beacon,
  car: `<path d="M6 30l3-9c1-3 3-4 6-4h14c3 0 5 1 7 4l5 9v6H6z" fill="currentColor" ${INK_S}/><circle cx="15" cy="36" r="5" fill="#ece9e1" ${INK_S}/><circle cx="33" cy="36" r="5" fill="#ece9e1" ${INK_S}/>`,
  frag: `<circle cx="22" cy="29" r="13" fill="currentColor" ${INK_S}/><path d="M17 16h10v-5H17z" fill="#ece9e1" ${INK_S}/><path d="M27 13c6-1 9 2 9 7" fill="none" ${INK_S}/><circle cx="36" cy="22" r="3" fill="#ece9e1" ${INK_S}/><path d="M16 27h12M22 21v16" stroke="#141210" stroke-width="2" opacity=".5"/>`,
  flame: `<path d="M24 5c3 7 11 11 11 21a11 11 0 0 1-22 0c0-6 3-9 5-11 0 5 2 7 4 7-1-7 0-12 2-17z" fill="#f08a2a" ${INK_S}/><path d="M24 26c2 3 5 4 5 8a5 5 0 0 1-10 0c0-3 3-5 5-8z" fill="#ffe066" ${INK_S}/>`,
  ubshot: `<rect x="5" y="20" width="30" height="9" rx="2" fill="currentColor" ${INK_S}/><rect x="9" y="29" width="18" height="6" rx="2" fill="#ece9e1" ${INK_S}/><circle cx="39" cy="22" r="2.5" fill="#141210"/><circle cx="43" cy="18" r="2" fill="#141210"/><circle cx="43" cy="26" r="2" fill="#141210"/>`,
  bomb: `<rect x="9" y="16" width="30" height="20" rx="3" fill="currentColor" ${INK_S}/><rect x="15" y="21" width="18" height="8" rx="1.5" fill="#141210"/><path d="M18 25h4m4 0h4" stroke="#e8554a" stroke-width="2.5"/><path d="M14 16v-5h6" fill="none" ${INK_S}/>`,
  fall: `<path d="M24 6v24" fill="none" ${INK_S}/><path d="M15 22l9 10 9-10" fill="none" ${INK_S}/><path d="M8 40h32" fill="none" ${INK_S}/><path d="M14 40l-3 4M24 40v4M34 40l3 4" fill="none" stroke="#141210" stroke-width="2.5" stroke-linecap="round"/>`,
  iris: `<circle cx="24" cy="24" r="17" fill="#141210" ${INK_S}/><circle cx="24" cy="24" r="8" fill="#ece9e1" ${INK_S}/><path d="M24 7v9M24 32v9M7 24h9M32 24h9" stroke="#ece9e1" stroke-width="2.5" stroke-linecap="round"/>`,
};
DEATH_SVG.carx = DEATH_SVG.car; // carro explodido (04/11): nome proprio, mesmo desenho
// estouro de gibi (05/11): granada e carro explodindo no killfeed
export const BOOM_SVG = `<path d="M24 3l4 10 9-6-2 11 10 1-8 7 8 7-10 1 2 11-9-6-4 10-4-10-9 6 2-11-10-1 8-7-8-7 10-1-2-11 9 6z" fill="#f2a33a" ${INK_S}/><path d="M24 14l2.5 6 6-2-3 5.5 5 3.5-6.5 1 1 6-5-4-5 4 1-6-6.5-1 5-3.5-3-5.5 6 2z" fill="#ffe08a"/>`;
const nextStreak = (n, pavio, mine) => { for (const s of pickStreaks(mine).map(k => STREAKS[k])) { const k = s.kills - (pavio && s.kills > 3 ? 1 : 0); if (k > n) return k - n; } return 0; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor() {
    this.el = { hp: $('hpNum'), hpBar: $('hpBar'), hpBox: document.querySelector('.hp'), mag: $('ammoMag'), res: $('ammoRes'), ammo: document.querySelector('.ammo'),
      wname: $('wName'), slots: $('wSlots'), plaque: $('scorePlaque'), feed: $('feed'), cross: $('cross'), hit: $('hitmark'),
      stamp: $('stamp'), msg: $('centerMsg'), board: $('board'), obj: $('objMarkers'), hurt: $('hurtDir'), tac: document.querySelector('#tacBar i'),
      reticle: $('reticle'), ring: $('scopeRing'), fps: $('fps') };
    this.msgT = 0;
    this.lastPlaque = '';
  }

  weapon(p) {
    const W = WEAPONS[p.wpn];
    // nome do MODELO na mao (antes era o da categoria: todo fuzil aparecia como Trovao); variante = nome dela
    const lo = p.lo?.(p.wpn), bp = p.brBp?.[p.wpn];
    document.body.classList.toggle('akimbo-on', lo?.handle === 'akimbo'); // 13/11 (pedido dele): duas na mao nao mira = some o botao de mirar no toque
    this.el.wname.textContent = bp ? t(bp) : lo?.body ? partName('body', lo.body) : wName(p.wpn);
    const a = p.ammo[p.wpn];
    const mag = a ? a.mag : 0;
    const hands = lo?.handle === 'akimbo' && mag !== Infinity ? p.akAmmo?.(a) : null; // akimbo: 12/12 296, um pente por mao
    this.el.mag.textContent = mag === Infinity ? '∞' : hands ? hands[0] + '/' + hands[1] : mag;
    this.el.res.textContent = (hands ? '' : '/ ') + (a && a.reserve !== Infinity ? a.reserve : '∞');
    this.el.ammo.classList.toggle('duo', !!hands);
    this.el.ammo.classList.toggle('empty', mag === 0);
    this.el.slots.innerHTML = p.owned.map((w, i) => `<span class="${w === p.wpn ? 'on' : ''}">${i + 1}</span>`).join('');
  }

  // colete do battle royale (some fora do modo)
  armor(v, on) {
    const box = $('armorBox');
    box.hidden = !on;
    if (on) $('armorBar').style.width = Math.max(0, Math.min(100, v)) + '%';
  }

  hp(v, max = 100) { // max: evento Tanque de Borracha/Casca de Ovo (08/11) muda a vida cheia
    this.el.hp.textContent = Math.max(0, Math.round(v));
    this.el.hpBar.style.width = Math.max(0, Math.min(100, v / (max || 100) * 100)) + '%';
    this.el.hpBox.classList.toggle('low', v <= 35 * (max || 100) / 100);
  }

  frame(p, dt, settings) {
    // municao: redesenha sempre que muda (tiro, recarga, pickup, troca)
    const a = p.ammo[p.wpn];
    const key = p.wpn + ':' + (a ? a.mag + '/' + a.reserve : '') + ':' + p.owned.join(',');
    if (key !== this.ammoKey) { this.ammoKey = key; this.weapon(p); }
    // mira dinamica + luneta + ponto vermelho
    const W = WEAPONS[p.wpn] || WEAPONS.fists; // battle royale: mao vazia um instante entre trocar e pegar (log 02/11: 'spread' de undefined)
    const moving = Math.hypot(p.vel[0], p.vel[2]);
    const gap = 6 + moving * 0.9 + (p.onGround ? 0 : 10) + (W.spread || 0) * 150 + (p.firing ? 4 : 0);
    this.el.cross.style.setProperty('--g', gap * (1 - p.adsK) + 'px');
    const g = p.g.vm.gun?.userData || {};
    const sprinting = p.sprint || p.tac;
    this.el.cross.style.opacity = sprinting || p.adsK > 0.5 || !p.alive ? 0 : 1;
    // reticula agora mora na lente 3D da mira (nada de overlay 2D)
    void g;
    this.ammoAlert(p, a);
    this.el.tac.style.width = (p.tacFuel / 3.5 * 100) + '%';
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.el.msg.classList.remove('on'); }
    if (settings.showFps) {
      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { this.el.fps.hidden = false; this.el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' ' + t('qps'); this.fpsAcc = 0; this.fpsN = 0; }
    } else this.el.fps.hidden = true;
  }

  // aviso de municao embaixo da mira: baixa, vazia (recarregue) e acabou de vez (troque de arma)
  ammoAlert(p, a) {
    const el = this.el.ammoAlert || (this.el.ammoAlert = $('ammoAlert'));
    const W = WEAPONS[p.wpn] || WEAPONS.fists;
    let txt = '', cls = '';
    if (p.alive && a && a.mag !== Infinity && !W.melee && p.reloadT <= 0) {
      const mag = p.stats().mag;
      const key = isTouch && !p.g.pad?.active ? '' : bindLabel(null, 'reload', p.g.pad?.active ? 1 : 0); // tecla remapeada
      if (a.mag === 0 && a.reserve <= 0) { txt = t('ammoOut'); cls = 'out'; }
      // 13/11 (pedido dele): arma de 1-2 tiros (Sentenca, akimbo dela, Pederneira) recarrega sozinha: nem municao baixa nem 'recarregar'
      else if (a.mag === 0 && mag <= 2) { /* nada */ }
      else if (a.mag === 0) { txt = key ? t('ammoReloadKey', { k: key }) : t('ammoReload'); cls = 'empty'; }
      else if (mag > 2 && a.mag <= Math.max(2, Math.ceil(mag * 0.25))) { txt = a.reserve > 0 && key ? t('ammoLowKey', { k: key }) : t('ammoLow'); cls = 'low'; } // com a tecla (pedido dele 01/11, estilo COD)
    } else if (p.alive && p.reloadT > 0) { txt = t('ammoReloading'); cls = 'busy'; }
    if (el.textContent !== txt) el.textContent = txt;
    el.className = 'ammo-alert ' + cls;
    el.hidden = !txt;
  }

  score(snap, me, players) {
    const mode = snap.mode, cfg = MODES[mode];
    const sec = Math.max(0, Math.ceil(snap.time));
    const clock = `<div><span class="lbl">${t('h_time')}</span><span class="val">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span></div>`;
    let html;
    if (mode === 'borroes' && snap.bor) {
      // Noite dos Borroes (03/11): onda + viloes restantes (ou a contagem da pausa) + meus pontos; chefao em campo = barra dele
      const B = snap.bor, boss = B.boss ? (players || []).find(p => p.id === B.boss) : null;
      const mid = B.state === 'break' ? `<div class="fuse"><span class="lbl">${t('bor_nextIn')}</span><span class="val">${B.t}s</span></div>` : `<div><span class="lbl">${t('bor_leftLbl')}</span><span class="val">${B.left}</span></div>`;
      const bar = boss && boss.alive ? `<div class="bor-boss"><span class="lbl">${t('mob_' + boss.mob)}</span><i style="--k:${Math.max(0, Math.min(1, boss.hp / (boss.mh || 1)))}"></i></div>` : '';
      const fx = Object.entries(B.fx || {}).map(([k, s]) => `<div class="fuse"><span class="lbl">${t('dr_' + k)}</span><span class="val">${s}s</span></div>`).join('');
      html = `<div class="red"><span class="lbl">${t('bor_waveLbl')}</span>`;
      html += `<span class="val">${B.wave || 0}${B.goal ? `<small>/${B.goal}</small>` : ''}</span></div>${mid}<div><span class="lbl">${t('bor_pts')}</span><span class="val">${me?.cs ?? 0}</span></div>${fx}${bar}`;
    } else if (mode === 'br' && snap.br) {
      // battle royale: quantos restam + a iris (esperando = quanto falta pra fechar; fechando = aviso)
      const Z = snap.br, zs = Z.t;
      const iris = Z.state === 'closed' ? `<div class="fuse"><span class="lbl">${t('br_iris')}</span><span class="val">${t('br_closed')}</span></div>`
        : `<div class="${Z.state === 'shrink' ? 'fuse' : ''}"><span class="lbl">${Z.state === 'shrink' ? t('br_closing') : t('br_closeIn')}</span><span class="val">${Math.floor(zs / 60)}:${String(zs % 60).padStart(2, '0')}</span></div>`;
      html = `<div><span class="lbl">${t('br_left')}</span><span class="val">${Z.left}</span></div>${iris}<div><span class="lbl">${t('h_you')}</span><span class="val">${me ? me.kills : 0}</span></div>`;
    } else if (mode === 'bomb') {
      // rodadas de cada lado + relogio da rodada (ou o pavio da bomba plantada)
      const B = snap.bomb, planted = B?.state === 'planted';
      const mid = `<div class="${planted ? 'fuse' : ''}"><span class="lbl">${planted ? t('bombLbl') : t('roundN', { n: snap.round?.n || 1 })}</span><span class="val">${planted ? Math.ceil(snap.time) + 's' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`}</span></div>`;
      // quem ainda esta vivo na rodada: bolinha cheia vivo, X morto (o placar do topo e o Tab)
      const pips = (tm) => `<span class="pips">${(players || []).filter(p => p.team === tm).sort((a, b) => String(a.id).localeCompare(String(b.id))).map(p => `<i class="${p.alive ? 'on' : 'off'}${p.id === me?.id ? ' me' : ''}"></i>`).join('')}</span>`;
      html = `<div class="red"><span class="lbl">${t('bomb_atk')}</span><span class="val">${snap.teamScore.red}</span>${pips('red')}</div>${mid}<div class="blue"><span class="lbl">${t('bomb_def')}</span><span class="val">${snap.teamScore.blue}</span>${pips('blue')}</div>`;
    } else if (mode === 'infect') {
      // infectado: quantos de cada lado + o relogio (ou quanto falta pra sair o primeiro infectado)
      const mid = snap.infT > 0 ? `<div><span class="lbl">${t('inf_in')}</span><span class="val">${Math.ceil(snap.infT)}</span></div>` : '';
      html = `<div class="red"><span class="lbl">${t('inf_h_inf')}</span><span class="val">${snap.teamScore.red}</span></div>${mid}<div class="blue"><span class="lbl">${t('inf_h_surv')}</span><span class="val">${snap.teamScore.blue}</span></div>${clock}`;
    } else if (cfg.teams) {
      let mid = `<div><span class="lbl">${modeName(snap.duo ? 'duo' : snap.bounce ? 'bounce' : snap.blitz || mode)}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`;
      if (mode === 'dom') mid = `<div class="zones">${snap.zones.map(z => `<span class="zchip ${z.owner || ''} ${z.bonus ? 'bonus' : ''}">${z.id}</span>`).join('')}</div>`;
      if (mode === 'ctf') mid = `<div><span class="lbl">${t('h_caps')}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`;
      html = `<div class="red"><span class="lbl">${t('h_red')}</span><span class="val">${snap.teamScore.red}</span></div>${mid}<div class="blue"><span class="lbl">${t('h_blue')}</span><span class="val">${snap.teamScore.blue}</span></div>${clock}`;
    } else {
      const sorted = [...players].sort((a, b) => mode === 'gungame' ? b.gunLvl - a.gunLvl || b.kills - a.kills : b.kills - a.kills);
      const lead = sorted[0];
      const LAD = this.g?.ladder || GUN_LADDER;
      const mine = me ? (mode === 'gungame' ? `${me.gunLvl + 1}/${LAD.length}` : me.kills) : 0;
      const leadV = lead ? (mode === 'gungame' ? `${lead.gunLvl + 1}/${LAD.length}` : lead.kills) : 0;
      html = `<div><span class="lbl">${t('h_you')}</span><span class="val">${mine}</span></div><div><span class="lbl">${lead ? esc(lead.name) : t('h_leader')}</span><span class="val">${leadV}</span></div>${mode === 'gungame' && me ? `<div><span class="lbl">${t('h_weapon')}</span><span class="val" style="font-size:15px">${wName(LAD[Math.min(me.gunLvl, LAD.length - 1)].wpn)}</span></div>` : `<div><span class="lbl">${t('h_goal')}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`}${clock}`;
    }
    if (html !== this.lastPlaque) { this.el.plaque.innerHTML = html; this.lastPlaque = html; }
  }

  // contagem de inicio: "esperando todo mundo carregar" e depois 3, 2, 1, Ja! (le o congelamento
  // que vem no snapshot: vale igual no solo e no multiplayer)
  countIn(snap) {
    const el = this.cin || (this.cin = { box: $('countIn'), num: $('countNum'), sub: $('countSub') });
    const now = performance.now(), f = snap?.freeze || 0;
    if (this.lastFreeze > 0 && f <= 0 && !snap?.loading) this.goUntil = now + 1500; // RUBBER RIOT! fica o tempo do grito
    this.lastFreeze = f;
    let num = '', sub = '', go = false;
    if (snap?.loading) sub = t('countWait');
    else if (f > 0.05 && f < 4) { num = String(Math.max(1, Math.min(3, Math.ceil(f - 0.5)))); sub = t('countReady'); }
    else if (now < (this.goUntil || 0)) { num = 'RUBBER RIOT!'; go = true; } // 06/11 (pedido dele): a partida abre com o nome do jogo, junto com o grito do narrador
    // narrador (06/11): "Ladies and gentlemen, lights, camera..." durante a contagem (3,3 s, termina antes do 1) e "RUBBER RIOT!" cravado na largada
    const quietVo = !!(this.g?.range || this.g?.tutorial);
    const laterRound = (snap?.round?.n ?? snap?.esc?.round ?? 1) >= 2; // 08/11: abertura so no 1o round; do 2o em diante, "Next round"
    if (f > 0.05 && f <= 3.4 && !snap?.loading && !this.voIntro) { this.voIntro = true; if (!quietVo) audio.voice(laterRound ? 'round_next' : 'start_a'); }
    if (f <= 0) this.voIntro = false;
    el.box.hidden = !num && !sub;
    // Bate-Volta: tela escura durante a contagem (ninguem fica vendo os outros parados no ar)
    const dark = !!this.g?.bounce && (f > 0 || !!snap?.loading) && !!this.g?.player?.air;
    if (dark !== !!this.bDark) { this.bDark = dark; document.body.classList.toggle('bounce-dark', dark); }
    if (el.num.textContent !== num) {
      el.num.textContent = num;
      el.num.classList.toggle('go', go);
      el.num.classList.remove('tick'); void el.num.offsetWidth; if (num) el.num.classList.add('tick');
      // 3, 2, 1 = tique de relogio subindo o tom; Ja! = apito
      if (go) { audio.play('go', { ui: true, vol: 0.55, jitter: 0, key: 'count', max: 1 }); if (!quietVo && !laterRound) audio.voice('start_b'); }
      else if (num) audio.play('tick', { ui: true, vol: 0.45, rate: 0.9 + (3 - Number(num)) * 0.08, jitter: 0, key: 'count', max: 1 });
    }
    if (el.sub.textContent !== sub) el.sub.textContent = sub;
  }

  // anel de alerta em volta da mira (estilo "visualizar sons"): de que lado vem o inimigo perto.
  // Vermelho com estouro = atirando; claro com pegadas = andando. Mais forte quanto mais perto.
  threat(G, on) {
    let cv = this.threatCv;
    if (!cv) {
      cv = this.threatCv = document.createElement('canvas');
      cv.className = 'threat'; cv.setAttribute('aria-hidden', 'true');
      document.getElementById('hud').appendChild(cv);
    }
    const p = G.player, S = 240, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== S * dpr) { cv.width = cv.height = S * dpr; }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    if (!on || !p?.alive) return;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const R = 84, MAX = 32;
    for (const r of G.remotes.values()) {
      if (!r.alive || !G.isEnemy(r) || r.gh) continue; // Fantasma (10/11): nem passo nem tiro no anel
      const dx = r.pos[0] - p.pos[0], dz = r.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
      if (d > MAX || d < 0.5) continue;
      const shooting = (G.seen.get(r.id) || 0) > G.t + 1.2;
      const moving = (r.speed || 0) > 2.2;
      if (!shooting && !moving) continue;
      const a = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz); // 0 = na frente
      const k = 1 - d / MAX;
      const front = Math.abs(a) < 0.45 ? 0.45 : 1; // na frente voce ja ve: o arco fica discreto
      const ca = a - Math.PI / 2, span = 0.22 + k * 0.28;
      g.globalAlpha = (0.35 + k * 0.65) * front;
      g.lineCap = 'round';
      g.lineWidth = 4 + k * 7 + 3; g.strokeStyle = '#141210';
      g.beginPath(); g.arc(S / 2, S / 2, R, ca - span, ca + span); g.stroke();
      g.lineWidth = 4 + k * 7; g.strokeStyle = shooting ? '#e0301e' : '#ece9e1';
      g.beginPath(); g.arc(S / 2, S / 2, R, ca - span, ca + span); g.stroke();
      // marca no meio do arco: estouro (tiro) ou duas pegadas (passos)
      const mx = S / 2 + Math.cos(ca) * (R + 16), my = S / 2 + Math.sin(ca) * (R + 16);
      g.fillStyle = shooting ? '#e0301e' : '#ece9e1'; g.strokeStyle = '#141210'; g.lineWidth = 2;
      if (shooting) {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const q = (i / 10) * Math.PI * 2, rr = i % 2 ? 3 : 7; g.lineTo(mx + Math.cos(q) * rr, my + Math.sin(q) * rr); }
        g.closePath(); g.fill(); g.stroke();
      } else {
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(mx + s * 3 * Math.cos(ca + Math.PI / 2), my + s * 3 * Math.sin(ca + Math.PI / 2) - s * 2, 2.4, 3.6, ca + Math.PI / 2, 0, Math.PI * 2); g.fill(); g.stroke(); }
      }
    }
    g.globalAlpha = 1;
  }

  // plantar a bomba: barra de progresso (quem planta/desarma) e dica do que fazer ali
  bomb(G) {
    const el = this.bel || (this.bel = { bar: $('bombBar'), lbl: $('bombLbl'), fill: $('bombFill'), tag: $('bombTag') });
    const snap = G.snap, B = snap?.bomb, p = G.player;
    if (G.mode !== 'bomb' || !B || !p?.alive) { el.bar.hidden = true; el.tag.hidden = true; return; }
    const key = p.g.pad?.active ? 'X' : isTouch ? '✋' : 'E';
    let lbl = '', prog = -1;
    if (B.actor === G.myId && B.prog > 0) { lbl = t(B.kind === 'defuse' ? 'bombDefusing' : 'bombPlanting'); prog = B.prog / (B.kind === 'defuse' ? 6 : 3.2); }
    else if (B.state === 'carried' && B.carrier === G.myId && snap.sites?.some(s => Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) < s.r)) lbl = t('bombHoldPlant', { k: key });
    else if (B.state === 'planted' && G.myTeam === 'blue' && Math.hypot(p.pos[0] - B.pos[0], p.pos[2] - B.pos[2]) < 2.6) lbl = t('bombHoldDefuse', { k: key });
    el.bar.hidden = !lbl;
    el.bar.classList.toggle('busy', prog >= 0);
    // botao de mao no toque: pulsa quando da pra plantar/desarmar ali, apagado quando nao da
    const ub = G.input?.useBtn;
    if (ub) ub.classList.toggle('can', !!lbl);
    G.bombCan = !!lbl; // onde da pra plantar/desarmar o E vira usar (fora dali ele inclina)
    if (el.lbl.textContent !== lbl) el.lbl.textContent = lbl;
    el.fill.style.width = Math.max(0, Math.min(1, prog)) * 100 + '%';
    const carrying = B.state === 'carried' && B.carrier === G.myId;
    el.tag.hidden = !carrying || !!lbl; // com a dica de plantar na tela, a etiqueta repetia a mesma coisa
    if (carrying) el.tag.textContent = t('bombCarry');
  }

  // aviso grande no meio de cima da tela (infectado, ultimo sobrevivente)
  // Pilha de eventos da partida (30/10): avisos, alertas e desbloqueios entram na hora no topo da pilha,
  // os anteriores descem; nada se sobrepoe e nada espera fila. No maximo 4 na tela.
  // avisos da partida (03/11, pedido dele): TODOS numa fila so, no centro de cima embaixo do placar, um por vez.
  // O proximo entra enquanto o anterior sai (fica fluido); com fila grande cada um dura menos pra nao atrasar.
  // urgente (alerta grande: sequencia chamada, bomba...) fura a fila. key: o mesmo aviso ja na tela so atualiza.
  push(html, cls, ms, key = null) {
    const box = this.stack ||= document.getElementById('evStack');
    if (key) {
      const cur = this.evCur?.key === key ? this.evCur : null;
      if (cur) { cur.el.innerHTML = html; clearTimeout(cur.t); cur.t = setTimeout(() => this.evOut(cur), ms); return cur.el; }
      const q = (this.evQ ||= []).find(x => x.key === key);
      if (q) { q.html = html; q.ms = ms; return null; }
    }
    const item = { html, cls, ms, key };
    (this.evQ ||= [])[/ev-big/.test(cls) ? 'unshift' : 'push'](item);
    if (this.evQ.length > 8) this.evQ.splice(8); // tiroteio comprido: o que passou do ponto nem aparece
    this.evNext();
    return null;
  }
  evNext() {
    if (this.evCur || !this.evQ?.length) return;
    const box = this.stack ||= document.getElementById('evStack');
    const it = this.evQ.shift(), el = document.createElement('div');
    el.className = 'ev ' + it.cls; el.innerHTML = it.html;
    box.prepend(el);
    while (box.children.length > (document.body.classList.contains('touchmode') ? 1 : 2)) box.lastChild.remove(); // celular: um aviso por vez (08/11)
    const ms = Math.max(1100, it.ms * Math.max(0.5, 1 - this.evQ.length * 0.12) * (document.body.classList.contains('touchmode') ? 0.75 : 1));
    const cur = this.evCur = { el, key: it.key };
    cur.t = setTimeout(() => this.evOut(cur), ms);
  }
  evOut(cur) {
    if (this.evCur !== cur) return;
    cur.el.classList.add('out');
    setTimeout(() => cur.el.remove(), 320);
    this.evCur = null;
    setTimeout(() => this.evNext(), 140); // o proximo entra enquanto este ainda sai
  }

  alert(title, sub = '', tone = 'red') {
    this.push(`<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`, 'ev-big ' + tone, 2900);
  }

  feed(html, mine) {
    const li = document.createElement('li');
    li.innerHTML = html;
    if (mine) li.className = 'me';
    this.el.feed.prepend(li);
    while (this.el.feed.children.length > 6) this.el.feed.lastChild.remove();
    setTimeout(() => li.remove(), 6000);
  }

  // banner de desbloqueio (fila: um por vez); foto da arma + o que abriu
  // desafio de elite rastreado: plaquinha sob o placar a cada avanco (some em 3 s)
  eliteTrack(label, prog, n, done = false) {
    // 03/11: vai pra fila dos avisos (centro de cima); o mesmo desafio ja na tela so atualiza a barra
    this.push(`<i class="et-star" aria-hidden="true">★</i><span><small>${t('elTitle')}</small><b>${label}</b><span class="xpbar"><i style="width:${Math.round(prog / n * 100)}%"></i></span></span><em>${done ? '✓' : prog + '/' + n}</em>`, 'ev-unl elite-prog' + (done ? ' done' : ''), done ? 4000 : 2400, 'elite');
  }

  // elite concluido na partida: cartaz grande com a arma ganha em cima de um sol de raios girando
  // variante de elite ganha: cartao discreto na pilha (antes era um cartaz grande no meio da tela)
  eliteBanner({ title, name, sub, xp, img }) {
    this.push(`${img ? `<img src="${img}" alt="">` : ''}<span><small>★ ${title}</small><b>${name}</b>${sub ? `<i>${sub}</i>` : ''}</span><em>+${xp} XP</em>`, 'ev-unl elite', 4200);
  }

  // desbloqueios e desafios em FILA (01/11, pedido dele): um depois do outro, nunca empilhados (no celular enchia a tela)
  // desbloqueio na partida (08/11, pedido dele): bilhete que DESCE do topo, mostra o item com holofote girando atras e a
  // arte crescendo com brilho, e SOBE de volta. Fila propria (um por vez); as mensagens do canto descem enquanto ele esta na tela
  unlockBanner({ kind, name, img, more = 0 }) {
    (this.dropQ ||= []).push({ kind, name, img, more });
    if (this.dropQ.length > 6) this.dropQ.splice(6);
    this.dropNext();
  }
  dropNext() {
    if (this.dropOn || !this.dropQ?.length) return;
    const it = this.dropQ.shift(), host = document.getElementById('hud');
    let el = this.dropEl; if (!el) { el = this.dropEl = document.createElement('div'); el.className = 'unl-drop'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); host.appendChild(el); }
    const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    el.innerHTML = `<div class="ud-card"><span class="ud-art"><i class="ud-rays" aria-hidden="true"></i>${it.img ? `<img src="${it.img}" alt="">` : ''}</span><span class="ud-txt"><small>${esc(it.kind)}</small><b>${esc(it.name)}</b>${it.more ? `<em>+${it.more}</em>` : ''}</span><i class="ud-shine" aria-hidden="true"></i></div>`;
    const ms = document.body.classList.contains('touchmode') ? 3000 : 3400;
    this.dropOn = true; el.style.setProperty('--ud-ms', ms + 'ms');
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); document.body.classList.add('unl-drop-on');
    clearTimeout(this.dropT); this.dropT = setTimeout(() => { el.classList.remove('go'); this.dropOn = false; if (!this.dropQ.length) document.body.classList.remove('unl-drop-on'); setTimeout(() => this.dropNext(), 120); }, ms);
  }

  // granada de fragmentacao perto (< 9 m): icone em cima dela; fora da tela, preso na borda apontando
  nadeWarn(G, camera) {
    const root = document.getElementById('hud');
    if (!this.nadeEls) this.nadeEls = [];
    const me = G.player, list = (G.snap?.nades || []).filter(n => n.kind === 'frag' && me?.alive && Math.hypot(n.pos[0] - me.pos[0], n.pos[1] - me.pos[1], n.pos[2] - me.pos[2]) < 9);
    while (this.nadeEls.length < list.length) {
      const el = document.createElement('div'); el.className = 'nade-warn'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg><i></i>';
      root.appendChild(el); this.nadeEls.push(el);
    }
    const v = new THREE.Vector3(), W = innerWidth, H = innerHeight, m = 46;
    this.nadeEls.forEach((el, i) => {
      const n = list[i];
      el.hidden = !n;
      if (!n) return;
      v.fromArray(n.pos).project(camera);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      if (behind) { x = W - x; y = H - y; }
      const off = behind || x < m || x > W - m || y < m || y > H - m;
      if (off) {
        // borda: direcao do centro da tela ate a granada, presa num retangulo com margem
        const dx = x - W / 2, dy = y - H / 2, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3));
        x = W / 2 + dx * k; y = H / 2 + dy * k;
        el.style.setProperty('--a', Math.atan2(dy, dx) + 'rad');
      }
      el.classList.toggle('edge', off);
      el.style.transform = `translate(${x - 21}px, ${y - 21}px)`;
    });
  }

  // desbloqueios: pilha na coluna da esquerda, logo abaixo do minimapa (no meio da tela tapava a mira).
  // A posicao segue o minimapa, que muda de lugar no toque e em tela baixa. Tela baixa (celular
  // deitado): um por vez, em fila, senao a pilha desce ate o analogico.
  unlockToast(text) {
    this.push(`<span><b>${esc(text)}</b></span>`, 'ev-unl', 2600); // 03/11: centro de cima, na fila (antes: coluna da esquerda)
  }
  unlockToastOld(text) {
    const short = innerHeight <= 520;
    if (short) {
      (this.unlockQ ||= []).push(text);
      if (this.unlockBusy) return;
      const next = () => {
        const s = this.unlockQ.shift();
        if (s == null) { this.unlockBusy = false; return; }
        this.unlockBusy = true; this.showUnlock(s, 1);
        setTimeout(next, 2600);
      };
      next();
      return;
    }
    this.showUnlock(text, 3);
  }
  showUnlock(text, max) {
    const hud = document.getElementById('hud');
    let list = hud.querySelector('.unlocks');
    if (!list) { list = document.createElement('div'); list.className = 'unlocks'; hud.appendChild(list); }
    // abaixo do que estiver mais embaixo na coluna: minimapa ou kit de granadas
    let left = 14, top = 80;
    for (const sel of ['.radar', '.kit']) {
      const e = hud.querySelector(sel); if (!e?.offsetParent) continue;
      const r = e.getBoundingClientRect(); if (r.left > innerWidth / 3) continue;
      left = Math.min(left, r.left); top = Math.max(top, r.bottom + 8);
    }
    list.style.left = left + 'px'; list.style.top = top + 'px';
    const el = document.createElement('div');
    el.className = 'unlock-toast'; el.textContent = text;
    list.appendChild(el);
    while (list.children.length > max) list.firstChild.remove();
    setTimeout(() => el.remove(), 3600);
  }

  xpPop(text) {
    const el = document.createElement('div');
    el.className = 'xp-pop'; el.textContent = text;
    el.style.marginTop = (this.popN = ((this.popN || 0) + 1) % 3) * 20 + 'px';
    document.getElementById('hud').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // 13/11 (pedido dele: "mais dinamico, animado e fluido"): 4 tracos que estouram pra fora com mola e recolhem sumindo;
  // acerto em seguida (combo) abre mais e treme; cuca = amarelo com anel; abate = vermelho, grosso, gira e solta a onda
  hitmark(head, kill) {
    const h = this.el.hit;
    if (!h.firstChild) h.innerHTML = '<b class="hm-ring"></b><i></i><i></i><i></i><i></i>';
    const now = performance.now();
    this.hmCombo = now - (this.hmT || 0) < 320 ? Math.min(5, (this.hmCombo || 0) + 1) : 0; this.hmT = now;
    h.className = 'hitmark on' + (head ? ' head' : '') + (kill ? ' kill' : '');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !h.animate) { h.getAnimations?.().forEach(a => a.cancel()); h.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 260 }); return; }
    const c = this.hmCombo, out = (kill ? 17 : head ? 14 : 11) + c * 1.8, dur = kill ? 620 : head ? 460 : 380;
    const rot = kill ? 90 : (Math.random() - 0.5) * (6 + c * 3); // leve torcida a cada acerto: nunca igual ao anterior
    for (const a of h.getAnimations({ subtree: true })) a.cancel();
    const E = 'cubic-bezier(.2, .9, .3, 1)', SP = 'cubic-bezier(.25, 1.6, .4, 1)'; // easing por etapa (o geral distorcia o tempo todo)
    h.animate([{ transform: `rotate(${rot * 0.4}deg) scale(${kill ? 1.5 : 1.25})`, opacity: 1, easing: E }, { transform: `rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.3 }, { transform: `rotate(${rot}deg) scale(1)`, opacity: 1, offset: 0.62, easing: 'ease-in' }, { transform: `rotate(${rot}deg) scale(.92)`, opacity: 0 }],
      { duration: dur });
    [...h.querySelectorAll('i')].forEach((arm, k) => {
      const ang = 45 + k * 90, j = (Math.random() - 0.5) * 2; // cada braco com um tico de diferenca: parece desenhado a mao
      arm.animate([
        { transform: `rotate(${ang}deg) translateY(-4px) scaleY(.4)`, easing: SP },
        { transform: `rotate(${ang + j}deg) translateY(-${out}px) scaleY(1.1)`, offset: 0.28, easing: E },
        { transform: `rotate(${ang + j}deg) translateY(-${out}px) scaleY(1)`, offset: 0.62, easing: 'ease-in' },
        { transform: `rotate(${ang + j}deg) translateY(-${out + 3}px) scaleY(.55)` },
      ], { duration: dur });
    });
    if (head || kill) h.firstChild.animate([{ transform: 'scale(.3)', opacity: 0.95 }, { transform: `scale(${kill ? 2.4 : 1.7})`, opacity: 0 }], { duration: kill ? 480 : 340, easing: 'cubic-bezier(.1, .7, .3, 1)' });
  }

  // cartao de abate do lado da mira (13/11, pedido dele, estilo COD/Battlefield com a animacao do hitmarker): entra com mola,
  // o XP conta subindo, segura e sai pra cima. Varios abates empilham (no maximo 3, o mais velho sai)
  killTag(name, xp, head) {
    let box = this.ktBox;
    if (!box) { box = this.ktBox = document.createElement('div'); box.className = 'kill-tags'; box.setAttribute('aria-live', 'polite'); document.getElementById('hud').appendChild(box); }
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'kill-tag';
    el.innerHTML = `<b class="kt-name"></b><span class="kt-xp">+<i>0</i> XP</span>`; // so nome e XP (pedido dele 13/11)
    el.querySelector('.kt-name').textContent = name || '?';
    box.appendChild(el);
    const n = el.querySelector('.kt-xp i'), dur = 2200, rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (rm || !el.animate) { n.textContent = xp; setTimeout(() => el.remove(), dur); return; }
    el.animate([{ opacity: 0, transform: 'translateX(-26px) scale(.7) rotate(-6deg)', easing: 'cubic-bezier(.25, 1.6, .45, 1)' }, { opacity: 1, transform: 'translateX(0) scale(1) rotate(0)', offset: 0.14 },
      { opacity: 1, transform: 'translateX(0) scale(1)', offset: 0.8, easing: 'ease-in' }, { opacity: 0, transform: 'translate(10px, -16px) scale(.92)' }], { duration: dur }).onfinish = () => el.remove();
    const t0 = performance.now(), tick = (now) => { const k = Math.min(1, (now - t0) / 450); n.textContent = Math.round(xp * (1 - (1 - k) ** 3)); if (k < 1 && el.isConnected) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    el.querySelector('.kt-xp').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, delay: 420, easing: 'ease-out' });
  }

  stampText(text, sub) {
    const s = this.el.stamp;
    s.classList.remove('on'); void s.offsetWidth;
    s.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
    s.classList.add('on');
  }

  // aviso fixo embaixo da mira enquanto vale (trocar arma no chao); null esconde
  // 13/11 (pedido dele): mesmo lugar e mesmo jeito do aviso de escalar (pilula com a tecla em destaque); com ele na tela o de
  // escalar some (body.has-prompt) pra nunca empilhar
  prompt(text) {
    let el = this.promptEl;
    if (!el) { el = this.promptEl = document.createElement('div'); el.className = 'use-prompt ctx-hint'; el.setAttribute('aria-live', 'polite'); document.getElementById('hud').appendChild(el); }
    if (text === this.promptTxt) return;
    this.promptTxt = text; el.hidden = !text; document.body.classList.toggle('has-prompt', !!text);
    if (!text) { el.textContent = ''; return; }
    const k = bindLabel(null, 'use', this.g?.pad?.active ? 1 : 0);
    if (k && text.startsWith(k)) el.innerHTML = `<kbd>${esc(k)}</kbd><span>${esc(text.slice(k.length).replace(/^[:\s]+/, ''))}</span>`;
    else el.textContent = text;
  }
  // dupla: caido. Caixa embaixo da mira: sangra em N s (barra esvaziando) ou a bomba enchendo; null esconde
  down(s) {
    let el = this.downEl;
    if (!el) { el = this.downEl = document.createElement('div'); el.className = 'down-box'; el.setAttribute('role', 'status'); el.innerHTML = '<b></b><small></small><i><span></span></i>'; document.getElementById('hud').appendChild(el); }
    el.hidden = !s;
    if (!s) return;
    el.querySelector('b').textContent = t('duo_downTitle');
    el.querySelector('small').textContent = s.rv > 0 ? t('duo_beingPumped') : t('duo_bleed', { n: s.t });
    el.querySelector('span').style.width = Math.round(Math.min(1, s.rv > 0 ? s.rv : s.t / BR.duo.down) * 100) + '%';
    el.classList.toggle('pump', s.rv > 0);
  }
  // gadget equipado (03/11): plaquinha embaixo da municao com o tanque (barra) ou os cartuchos e a tecla
  gadget(id, v, S) {
    let el = this.gadgetEl;
    if (!el) { el = this.gadgetEl = document.createElement('div'); el.className = 'gadget-plate'; el.setAttribute('aria-live', 'off'); const wn = document.getElementById('wName'); wn.parentElement.insertBefore(el, wn); /* em cima do nome da arma: nunca cobre a municao (04/11) */ }
    if (!id) { if (!el.hidden) el.hidden = true; return; }
    const key = id === 'gd_flame' ? Math.round(v * 20) : v, sig = id + ':' + key + ':' + !!S?.on;
    if (sig === this.gadgetSig) return;
    this.gadgetSig = sig; el.hidden = false;
    const tag = isTouch ? '' : `<kbd>${esc(bindLabel(S, 'gadget', S?.padActive ? 1 : 0))}</kbd>`;
    el.innerHTML = id === 'gd_flame'
      ? `${tag}<span>${esc(t('gd_flame'))}</span><i class="gp-bar"><b style="width:${Math.round(v * 100)}%"></b></i>`
      : `${tag}<span>${esc(t('gd_shot'))}</span><em>${'●'.repeat(Math.max(0, v))}${'○'.repeat(Math.max(0, GADGETS.gd_shot.shells - v))}</em>`;
    el.classList.toggle('empty', id === 'gd_flame' ? v <= 0.02 : v <= 0); el.classList.toggle('on', !!S?.on);
    // toque: o tanque/cartuchos vao dentro do proprio botao (a plaquinha no rodape ficava embaixo dos botoes, 03/11)
    const btn = document.querySelector('#touch .tbtn.gadget');
    if (btn) { btn.style.setProperty('--gfill', (id === 'gd_flame' ? Math.round(v * 100) : 0) + '%'); if (id === 'gd_flame') delete btn.dataset.n; else btn.dataset.n = v; btn.classList.toggle('empty', id === 'gd_flame' ? v <= 0.02 : v <= 0); btn.classList.toggle('on', !!S?.on); btn.setAttribute('aria-pressed', !!S?.on); }
  }
  message(text, t = 2.4) { this.push(esc(text), 'ev-msg', t * 1000); }

  // barra de calor da Metralhadora, logo abaixo da mira
  heat(v, hot) {
    let e = this.heatEl;
    if (!e) { e = this.heatEl = document.createElement('div'); e.id = 'heatBar'; e.innerHTML = `<i></i><small></small>`; e.setAttribute('aria-hidden', 'true'); document.getElementById('hud').appendChild(e); }
    const on = v > 0.02; if (e.hidden !== !on) e.hidden = !on;
    if (!on) return;
    e.firstChild.style.transform = `scaleX(${v.toFixed(3)})`;
    e.classList.toggle('warm', v > 0.7); e.classList.toggle('hot', !!hot);
    const txt = hot ? t('lmgCool') : v > 0.7 ? t('lmgWarm') : ''; if (e.lastChild.textContent !== txt) e.lastChild.textContent = txt;
  }

  hurtFrom(angle) {
    const h = this.el.hurt;
    h.style.transform = `rotate(${angle}rad)`;
    h.style.transition = 'none'; h.style.opacity = 1;
    requestAnimationFrame(() => { h.style.transition = 'opacity .8s'; h.style.opacity = 0; });
  }

  setMap(M) {
    this.M = M;
    // fundo do radar: planta do mapa desenhada uma vez
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), k = 128 / (M.arena + 2);
    g.fillStyle = 'rgba(236,233,225,.92)'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(20,18,16,.55)';
    for (const b of M.boxes) {
      if (b.max[1] - b.min[1] < 1 || b.kind === 'pipe' || b.kind === 'nogo') continue;
      g.fillRect(128 + b.min[0] * k, 128 + b.min[2] * k, (b.max[0] - b.min[0]) * k, (b.max[2] - b.min[2]) * k);
    }
    this.radarBg = c;
  }

  // radar: aliados sempre, inimigo quando atira (ou todos com o Radar Espiao)
  radar(G, camera) {
    let cv = this.radarCv;
    if (!cv) {
      cv = this.radarCv = document.createElement('canvas');
      cv.width = cv.height = 180; cv.className = 'radar'; cv.setAttribute('aria-hidden', 'true');
      document.getElementById('hud').appendChild(cv);
    }
    const p = G.player, M = this.M, snap = G.snap;
    if (!p || !M || !this.radarBg) return;
    const uav = (snap.uavs || []).some(u => u.owner === G.myId || (u.team && u.team === G.myTeam));
    const spanWant = uav ? Math.min(M.arena * 1.08, 140) : Math.min(M.arena, 64); // 08/11 (pedido dele): mapa enxerga mais e o Radar Espiao abre o mapa inteiro
    this.radarSpan = this.radarSpan ? this.radarSpan + (spanWant - this.radarSpan) * 0.12 : spanWant;
    const g = cv.getContext('2d'), R = 90, span = this.radarSpan, k = R / span, wk = 128 / (M.arena + 2);
    const enemyUav = (snap.uavs || []).some(u => u.owner !== G.myId && !(u.team && u.team === G.myTeam));
    // Nuvem de Talco do inimigo: minimapa vira poeira (so voce no meio e o aviso), ate acabar
    const jam = (snap.talcs || []).some(u => u.owner !== G.myId && !(u.team && u.team === G.myTeam));
    g.clearRect(0, 0, 180, 180);
    g.save();
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
    g.translate(R, R); g.rotate(p.yaw);
    const bs = 256 / wk * k;
    g.drawImage(this.radarBg, -p.pos[0] * k - bs / 2, -p.pos[2] * k - bs / 2, bs, bs);
    const dot = (x, z, col, r = 5) => { g.fillStyle = col; g.beginPath(); g.arc((x - p.pos[0]) * k, (z - p.pos[2]) * k, r, 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.strokeStyle = '#141210'; g.stroke(); };
    if (snap.br) {
      // iris: circulo atual em tinta grossa, proximo tracejado claro; caixotes do dirigivel em vermelho
      const Z = snap.br, at = (x, z) => [(x - p.pos[0]) * k, (z - p.pos[2]) * k];
      g.lineWidth = 3; g.strokeStyle = '#141210'; g.beginPath(); g.arc(...at(Z.c[0], Z.c[1]), Z.r * k, 0, Math.PI * 2); g.stroke();
      if (Z.to && Z.state !== 'closed') { g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = '#faf8f2'; g.beginPath(); g.arc(...at(Z.to.c[0], Z.to.c[1]), Z.to.r * k, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      for (const c of G.brCrates || []) { g.fillStyle = '#a83a2c'; g.strokeStyle = '#141210'; g.lineWidth = 2; const [x, y] = at(c[0], c[1]); g.fillRect(x - 4, y - 4, 8, 8); g.strokeRect(x - 4, y - 4, 8, 8); }
    }
    for (const o of snap.players) {
      if (o.id === G.myId || !o.alive) continue;
      if (!G.isEnemy(o)) { dot(o.pos[0], o.pos[2], o.team === 'red' ? '#a83a2c' : '#2f5b8a', 4.5); continue; }
      if ((uav && !o.gh) || (G.seen.get(o.id) || 0) > G.t) dot(o.pos[0], o.pos[2], o.team === 'blue' ? '#2f5b8a' : '#e0301e', 5.5); // 09/11 (pedido dele): inimigo na cor do time dele, nunca igual ao seu
      else if ((G.marked?.get(o.id) || 0) > G.t) { dot(o.pos[0], o.pos[2], '#ffb21a', 5.5); } // bala tracante
    }
    if (snap.mode === 'dom') { for (const z of M.zones) { const s = snap.zones.find(q => q.id === z.id); dot(z.pos[0], z.pos[2], s?.owner === 'red' ? '#a83a2c' : s?.owner === 'blue' ? '#2f5b8a' : '#ece9e1', 6); } const bz = snap.zones.find(q => q.bonus); if (bz) dot(bz.pos[0], bz.pos[2], bz.owner === 'red' ? '#a83a2c' : bz.owner === 'blue' ? '#2f5b8a' : '#e3b23c', 8); }
    if (snap.mode === 'ctf') for (const tm of ['red', 'blue']) dot(snap.flags[tm].pos[0], snap.flags[tm].pos[2], tm === 'red' ? '#a83a2c' : '#2f5b8a', 6);
    for (const b of snap.blimps || []) if (b.k === 'sentry') { // sentinela no minimapa: quadradinho com cano (cor do time)
      const x = (b.pos[0] - p.pos[0]) * k, y = (b.pos[2] - p.pos[2]) * k; g.save(); g.translate(x, y); g.rotate(-(b.yaw || 0));
      g.fillStyle = b.team === 'blue' ? '#2f5b8a' : '#a83a2c'; g.strokeStyle = '#141210'; g.lineWidth = 2; g.fillRect(-5, -5, 10, 10); g.strokeRect(-5, -5, 10, 10); g.fillStyle = '#141210'; g.fillRect(-1.5, -12, 3, 7); g.restore();
    }
    g.restore();
    // voce no centro, olhando pra cima
    g.fillStyle = G.myTeam === 'blue' ? '#2f5b8a' : G.myTeam === 'red' ? '#a83a2c' : '#faf8f2'; g.strokeStyle = '#141210'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(R, R - 9); g.lineTo(R + 6.5, R + 7); g.lineTo(R, R + 3); g.lineTo(R - 6.5, R + 7); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 5; g.strokeStyle = enemyUav ? '#e0301e' : '#141210';
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
    if (uav) { g.fillStyle = '#141210'; g.font = '800 12px Grandstander'; g.textAlign = 'center'; g.fillText('UAV', R, 172); }
    if (jam) { // por cima de tudo: o mapa some, o resto do HUD segue
      g.clearRect(0, 0, 180, 180); g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip(); g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, 180, 180);
      for (let i = 0; i < 260; i++) { const a = Math.random(); g.fillStyle = a < 0.5 ? '#ece9e1' : '#a39b8e'; g.fillRect(Math.random() * 180, Math.random() * 180, 2 + a * 3, 2 + a * 3); }
      g.restore(); g.lineWidth = 5; g.strokeStyle = '#141210'; g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#141210'; g.font = '800 13px Grandstander'; g.textAlign = 'center'; g.fillText(t('talcJam'), R, R + 5);
    }
    // granadas e sequencias prontas
    const me = snap.players.find(o => o.id === G.myId);
    const ready = me?.ready || [];
    // tecla de cada aparelho: teclado G/F/X, controle LB/RB/direcional pra cima, toque = icone do botao
    const dev = G.pad?.active ? 'pad' : isTouch ? 'touch' : 'kb';
    const bl = (id) => bindLabel(null, id, dev === 'pad' ? 1 : 0) + ' '; // tecla remapeada (binds.js)
    const [kf, kl, ks, kz] = dev === 'touch' ? ['', '', '★ ', ''] : [bl('frag'), bl('flash'), bl('streak'), bl('field')];
    const fld = p.g?.field, fpc = Math.floor((p.g?.fieldK ?? 0) * 100), fcd = fpc < 100 ? 1 : 0; // barra por pontos (%)
    // 13/11 (pedido dele): no PC e no controle, dicas das teclas que ficam escondidas (marcar, recarregar, inspecionar e o
    // gadget so quando esta na arma). Equipamento de campo saiu daqui: o proprio selo dele mostra a tecla
    const gid = G.gadgetShown || null;
    const hints = dev === 'touch' ? [] : [...(gid ? [[bl('gadget'), t(gid)]] : []), [bl('ping'), t('kit_ping')], [bl('reload'), t('k_reload')], [bl('inspect'), t('kit_inspect')]].filter(([k]) => k.trim()); // sem tecla nesse aparelho = sem dica
    const key = hints.map(h => h.join('')).join('|') + '/' + (fld ? 1 : 0) + '/' + (p.g?.mode || '') + '/' + (p.nades.frag || 0) + '/' + (p.nades.flash || 0) + '/' + ready.join(',') + '/' + (me?.streak || 0) + '/' + dev + '/' + (me?.fz || 0) + '/' + (ready.length && snap.sLock ? snap.sLock.kind + snap.sLock.t : '');
    if (key !== this.kitKey) {
      this.kitKey = key;
      let el = document.getElementById('kit');
      if (!el) { el = document.createElement('div'); el.id = 'kit'; el.className = 'kit'; document.getElementById('hud').appendChild(el); }
      el.hidden = p.g?.mode === 'br' && !p.nades.frag && !p.nades.flash && !fld; // battle royale: so aparece quando tiver granada ou equipamento
      el.innerHTML = (me?.fz ? `<span class="fuse${me.fz <= 10 ? ' hot' : ''}">${t('ev_fuse', { n: me.fz })}</span>` : '') + // bomba-relogio: pavio no peito
        `<span class="${p.nades.frag ? '' : 'off'}">${kf}${t('n_' + (this.g?.lethal || 'frag'))}</span><span class="${p.nades.flash ? '' : 'off'}">${kl}${t('n_' + (this.g?.tactical || 'flash'))}</span>` +
        hints.map(([k, n]) => `<span class="kh">${esc(k)}${esc(n)}</span>`).join('') +
        // sequencia pronta mas outra no ar: fica apagada com a contagem ate liberar
        (p.g?.mode !== 'br' && p.g?.mode !== 'gungame' ? '' : callLocked(ready, snap.sLock) ? `<span class="off wait">${ks}${t('s_' + ready[0])} ${snap.sLock.t}s</span>` : ready.length ? `<span class="ready">${ks}${t('s_' + callNext(ready, snap.sLock))}${ready.length > 1 ? ' +' + (ready.length - 1) : ''}</span>` : `<span class="off">${t('streakNext', { n: nextStreak(me?.streak || 0, p.g?.skills?.includes('pavio'), p.g?.streaks) })}</span>`);
    }
  }

  // fileira de selos das sequencias em cima da vida: progresso em anel; pronta = cor, pulso e tecla (toque: o selo)
  streaks(G, snap) {
    // celular (02/11, pedido dele): a fileira mora DENTRO da camada de toque (por cima do HUD), embaixo da vida, e
    // cada selo pronto e um botao; o minimapa desce pra baixo dela (touchLayout). PC: fileira em cima da vida.
    const touchRow = isTouch && document.getElementById('touch') && !document.getElementById('touch').hidden;
    const el = touchRow ? this.touchStkEl() : (this.stk ||= document.getElementById('streaks'));
    if (touchRow && this.stk) this.stk.hidden = true;
    const me = snap?.players?.find(o => o.id === G.myId);
    const on = !!me && G.state === 'game' && G.mode !== 'br' && G.mode !== 'gungame';
    if (el.hidden === on) el.hidden = !on;
    if (touchRow) this.touchLayout(G);
    if (!on) return;
    const ready = me.ready || [], n = me.streak || 0, pavio = G.skills?.includes('pavio');
    const dev = G.pad?.active ? 'pad' : isTouch ? 'touch' : 'kb', bind = dev === 'pad' ? '▲' : dev === 'touch' ? '' : 'X';
    const lock = callLocked(ready, snap.sLock) ? snap.sLock.t : 0, nx = callNext(ready, snap.sLock);
    const mine = pickStreaks(G.streaks);
    const key = ready.join(',') + '/' + n + '/' + dev + '/' + lock + '/' + (pavio ? 1 : 0) + '/' + nx + (snap.sLock ? 1 : 0) + '/' + mine.join(',');
    if (key === this.stkKey) return;
    this.stkKey = key;
    el.innerHTML = mine.map(id => [id, STREAKS[id]]).map(([id, S]) => { // so as escolhidas no Arsenal (02/11)
      const need = S.kills - (pavio && S.kills > 3 ? 1 : 0), got = ready.includes(id), next = nx === id;
      const k = got ? 1 : Math.min(1, n / need), C = 2 * Math.PI * 22;
      const cls = got ? (lock && next ? 'stk got wait' : next ? 'stk got next' : 'stk got') : 'stk';
      const tip = got ? t('s_' + id) : t('s_' + id) + ' (' + need + ')';
      return `<div class="${cls}" data-s="${id}" title="${esc(tip)}"><svg class="stk-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" pathLength="${C.toFixed(1)}" stroke-dasharray="${(C * k).toFixed(1)} ${C.toFixed(1)}"/></svg>`
        + `<svg class="stk-ico" viewBox="0 0 48 48" role="img" aria-label="${esc(tip)}">${STREAK_SVG[id] || ''}</svg>`
        + (got ? (next && lock ? `<b class="stk-key">${lock}s</b>` : next && bind ? `<b class="stk-key">${bind}</b>` : '') : `<b class="stk-n">${need}</b>`) + `</div>`;
    }).join('');
  }

  // fileira de sequencias do celular: dentro do #touch (o toque chega nela), toque num selo pronto chama aquele
  touchStkEl() {
    if (this.tstk?.isConnected) return this.tstk;
    const el = this.tstk = document.createElement('div');
    el.className = 'streaks tstk'; el.hidden = true;
    el.addEventListener('pointerdown', (e) => {
      const s = e.target.closest('.stk'); e.preventDefault(); e.stopPropagation();
      if (s?.classList.contains('got')) this.onStreakTap?.(s.dataset.s);
      else audio.play('empty', { ui: true, vol: 0.4 });
    });
    document.getElementById('touch').appendChild(el);
    return el;
  }
  // canto de cima no celular, montado pela medida real (02/11: o minimapa ficava em cima do chat e da fileira):
  // [pausa][vida] / [chat][sequencias] / minimapa embaixo do que estiver mais baixo, encolhendo pra nao chegar no analogico
  touchLayout(G) {
    const now = performance.now();
    if (now - (this.tlT || 0) < 250) return;
    this.tlT = now;
    const q = (s) => { const e = document.querySelector(s); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return r.width ? r : null; };
    // 13/11: o que o jogador moveu no editor de HUD (data-he-moved) fica onde ele pos e sai da pilha automatica
    const mv = (s2) => !!document.querySelector(s2)?.dataset.heMoved;
    const blMoved = mv('#hud .hud-bl'), bl = q('.hud-bl'), blA = blMoved ? null : bl;
    // 13/11 (print dele): o botao do chat (fixo a 48 px do topo) ficava em cima da vida quando ela era mais alta: desce pra baixo dela
    { const ce = document.querySelector('#touch .tbtn.chat'), r = ce && q('#touch .tbtn.chat');
      if (ce && r && blA && !ce.dataset.heMoved && r.right > bl.left && r.left < bl.right && r.top < bl.bottom + 6) ce.style.top = Math.round(bl.bottom + 8) + 'px'; }
    const chat = q('#touch .tbtn.chat'), stick = q('#touch .stick'), cv = this.radarCv;
    // fileira de sequencias: embaixo da vida; se o chat desceu pra la, ela fica do lado dele ([chat][sequencias])
    const chatUnder = chat && blA && chat.top >= bl.bottom && chat.left < bl.right && chat.right > bl.left;
    if (this.tstk && blA && !this.tstk.dataset.heMoved) Object.assign(this.tstk.style, { left: Math.round(chatUnder ? chat.right + 8 : bl.left) + 'px', top: Math.round(chatUnder ? chat.top : bl.bottom + 6) + 'px' });
    const row = q('#touch .tstk');
    // avisos do meio descem pra baixo da fileira (no celular baixo eles passavam por cima dela)
    document.body.style.setProperty('--tl-msg', Math.round(Math.max(innerHeight * 0.2, (row?.bottom || 0) + 8)) + 'px');
    // pilha de avisos: comeca depois da fileira e para antes do arco de botoes da direita
    const btnL = Math.min(innerWidth - 150, ...[...document.querySelectorAll('#touch .tbtn')].map(b => b.getBoundingClientRect()).filter(r => r.width && r.top < innerHeight * 0.55 && r.left > innerWidth * 0.5).map(r => r.left));
    const evL = Math.max((row?.right || bl?.right || 0) + 10, innerWidth / 2 - 200), evW = Math.max(180, Math.min(400, innerWidth - 2 * evL, (btnL - innerWidth / 2 - 10) * 2)); // centralizada: a mesma folga dos dois lados
    document.body.style.setProperty('--tl-ev-l', Math.round(evL) + 'px'); document.body.style.setProperty('--tl-ev-w', Math.round(evW) + 'px');
    if (!cv) return;
    // Chat Rapido (10/11): coluna da esquerda, embaixo do botao do chat (online) ou no lugar dele (solo); o minimapa desce junto
    const qbEl = document.querySelector('#touch .tbtn.quick');
    if (qbEl && !qbEl.dataset.heMoved) { const want = chat ? Math.round(chat.bottom + 8) + 'px' : ''; if (qbEl.style.top !== want && (want || qbEl.dataset.moved)) { qbEl.style.top = want || 'calc(max(12px, env(safe-area-inset-top)) + 48px)'; qbEl.style.left = 'max(12px, env(safe-area-inset-left))'; qbEl.dataset.moved = '1'; } }
    const qb = q('#touch .tbtn.quick');
    if (cv.dataset.heMoved) { if (cv.style.width !== '110px') Object.assign(cv.style, { width: '110px', height: '110px' }); return; } // minimapa movido: tamanho fixo (o editor muda pelo scale)
    const col = (r, s2) => (r && !mv(s2) ? r.bottom : 0); // so entra na pilha quem ficou no lugar automatico
    const top = Math.max(blA?.bottom || 0, col(chat, '#touch .tbtn.chat'), col(row, '#touch .tstk'), col(qb, '#touch .tbtn.quick'), 0) + 8;
    const room = (stick ? stick.top : innerHeight) - top - 8;
    const size = Math.max(46, Math.min(110, room)); // celular baixo: encolhe ate caber acima do analogico
    Object.assign(cv.style, { top: Math.round(top) + 'px', bottom: 'auto', width: size + 'px', height: size + 'px' });
  }

  streakBtn(ready, n, pavio, snap, mine) {
    const b = document.querySelector('#touch .tbtn.streak');
    if (!b) return;
    const list = pickStreaks(mine).map(id => [id, STREAKS[id].kills - (pavio && STREAKS[id].kills > 3 ? 1 : 0)]);
    const id = (ready.length && callNext(ready, snap.sLock)) || (list.find(([, k]) => k > n) || list[list.length - 1])[0];
    const need = list.find(([x]) => x === id)[1], lock = callLocked(ready, snap.sLock);
    const key = id + '/' + ready.length + '/' + n + '/' + (lock ? 1 : 0);
    if (b.dataset.k === key) return;
    b.dataset.k = key;
    b.dataset.s = id;
    b.classList.toggle('stk-ready', !!ready.length && !lock);
    b.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true">${STREAK_SVG[id]}</svg>` + (ready.length ? '' : `<b class="stk-n">${Math.max(0, need - n)}</b>`);
  }

  // bussola do battle royale: rumo e marcadores pelo angulo em relacao a camera
  compass(G, camera) {
    const on = G.mode === 'br' && G.state === 'game' && !!G.player?.alive;
    const el = this.cp ||= { box: document.getElementById('compass'), strip: document.getElementById('cpStrip'), hd: document.getElementById('cpHd') };
    if (el.box.hidden === on) el.box.hidden = !on;
    if (!on) return;
    const yaw = G.player.yaw, W = el.strip.clientWidth || 400, span = Math.PI * 0.42; // metade do que cabe na faixa
    const ang = (dx, dz) => Math.atan2(-dx, -dz);
    const xOf = (a) => { let d = a - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) > span ? null : W / 2 - d / span * W / 2; };
    let html = '';
    const CD = t('cp_dirs').split(',');
    for (let i = 0; i < 24; i++) {
      const a = -i * Math.PI / 12, x = xOf(a);
      if (x == null) continue;
      html += i % 3 ? `<i class="tk" style="left:${x.toFixed(0)}px"></i>` : `<span class="cd${i === 0 ? ' n' : ''}" style="left:${x.toFixed(0)}px">${CD[i / 3]}</span>`;
    }
    const me = G.player.pos, mark = (p, cls) => { const x = xOf(ang(p[0] - me[0], p[2] - me[2])); if (x != null) html += `<i class="mk ${cls}" style="left:${x.toFixed(0)}px"></i>`; };
    for (const r of G.remotes.values()) {
      if (!r.alive) continue;
      if (!G.isEnemy(r)) mark(r.pos, 'ally');
      else if ((G.seen.get(r.id) || 0) > G.t || (G.marked?.get(r.id) || 0) > G.t || (G.uavOn && G.uavOn())) mark(r.pos, 'enemy');
    }
    for (const c of G.brCrates || []) mark([c[0], 0, c[1]], 'crate');
    for (const d of G.brDrops || []) if (d.t > G.t) mark(d.pos, 'crate');
    for (const [id, pg] of G.pings || []) if (pg.t > G.t) mark(pg.pos, 'ping' + (id === G.myId ? '' : ' mate'));
    const deg = Math.round(((-yaw * 180 / Math.PI) % 360 + 360) % 360);
    if (html !== el.last) { el.strip.innerHTML = html; el.last = html; }
    el.hd.textContent = deg + '°';
  }

  objectives(snap, camera, me) {
    const mode = snap.mode;
    const pts = [];
    // marcacoes (ping) do battle royale: icone + o que e + distancia
    for (const [id, pg] of this.g?.pings || []) {
      if (pg.t <= (this.g?.t || 0)) continue;
      pts.push({ p: [pg.pos[0], pg.pos[1] + (pg.kind === 'enemy' ? 2.4 : 1.6), pg.pos[2]], cls: 'ping' + (id === this.g?.myId ? '' : ' mate') + (pg.kind === 'enemy' ? ' enemy' : ''), txt: pg.kind === 'enemy' ? '!' : pg.kind === 'item' ? '◆' : '▼', sub: pg.label || '' });
    }
    for (const h of snap.field?.holes || []) if (h[4] === this.g?.myId) pts.push({ p: [h[1], h[2] + 1.8, h[3]], cls: 'ping', txt: '◎', sub: t('holePin') }); // meu Buraco Portatil: onde ficou (08/11)
    // sentinelas (04/11): icone em cima de cada uma (a do inimigo em vermelho de alerta), com a vida
    for (const b of snap.blimps || []) if (b.k === 'sentry') {
      const mine = b.owner === this.g?.myId || (this.g?.myTeam && b.team === this.g.myTeam);
      pts.push({ p: [b.pos[0], b.pos[1] + 2.3, b.pos[2]], cls: 'sentry ' + (mine ? 'mate' : 'enemy'), txt: `<svg viewBox="0 0 48 48" width="18" height="18" style="color:${b.team === 'blue' ? '#2f5b8a' : '#a83a2c'}">${STREAK_SVG.sentry}</svg>`, sub: b.hp + '%' });
    }
    if (mode === 'ctf') {
      for (const team of ['red', 'blue']) {
        const f = snap.flags[team];
        const label = f.state === 'carried' ? (f.carrier === me?.id ? t('o_carry') : t('o_taken')) : f.state === 'dropped' ? t('o_drop') : '';
        pts.push({ p: [f.pos[0], f.pos[1] + 3.6, f.pos[2]], cls: team, txt: '⚑', sub: label });
        if (me && me.team && f.carrier === me.id && this.M) pts.push({ p: [this.M.flagBase[me.team][0], 3, this.M.flagBase[me.team][2]], cls: me.team, txt: '⌂', sub: t('o_base') });
      }
    } else if (mode === 'bomb' && snap.sites) {
      const B = snap.bomb;
      for (const s of snap.sites) {
        const here = B?.state === 'planted' && B.site === s.id;
        pts.push({ p: [s.pos[0], s.pos[1] + 2.6, s.pos[2]], cls: here ? 'red' : '', txt: s.id, sub: here ? t('bombHere') : '' });
      }
      if (B?.state === 'dropped') pts.push({ p: [B.pos[0], B.pos[1] + 1.6, B.pos[2]], cls: 'red', txt: '●', sub: t('bombDropped') });
    } else if (mode === 'dom') {
      for (const z of snap.zones) {
        const def = z.pos || (this.M?.zones.find(q => q.id === z.id) || { pos: [0, 0, 0] }).pos;
        pts.push({ zid: z.id, p: [def[0], def[1] + 3, def[2]], cls: (z.owner || '') + (z.bonus ? ' bonus' : ''), txt: z.id, sub: z.bonus ? z.left + ' s' : '' });
      }
    }
    const v = new THREE.Vector3(), D = (this.dc ||= { id: null, at: null, leaving: false, show: 0, last: 0, moved: 0, dir: 0, t: 0, st: '', cls: '', w: -1 }), want = mode === 'dom' ? this.domZone(snap) : null;
    let html = '';
    for (const o of pts) {
      const held = o.zid && (o.zid === D.id || o.zid === want); // a zona em que a pessoa esta mora na HUD, nao no mundo
      v.fromArray(o.p).project(camera);
      if (v.z > 1) { if (held) D.at = null; continue; }
      const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, 24, innerWidth - 24);
      const y = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * innerHeight, 70, innerHeight - 24);
      if (held) { D.at = [x, y]; continue; }
      const d = me ? Math.round(Math.hypot(o.p[0] - me.pos[0], o.p[2] - me.pos[2])) : 0;
      html += `<div style="left:${x}px;top:${y}px"><span class="pin ${o.cls}">${o.txt}</span><span class="dist">${o.sub ? esc(o.sub) + ' · ' : ''}${d} m</span></div>`;
    }
    this.el.obj.innerHTML = html;
    if (want || D.id) this.domCap(snap, want, D);
  }

  // zona em que o jogador esta (mesma conta do servidor: raio e 2,5 m de altura)
  domZone(snap) {
    const P = this.g?.player; if (!P?.alive || this.g?.replay?.on) return null;
    for (const z of snap.zones) {
      const def = z.pos ? { pos: z.pos, r: 4 } : this.M?.zones.find(q => q.id === z.id); if (!def) continue;
      if ((P.pos[0] - def.pos[0]) ** 2 + (P.pos[2] - def.pos[2]) ** 2 <= def.r * def.r && Math.abs(P.pos[1] - def.pos[1]) <= 2.5) return z.id;
    }
    return null;
  }

  // dominacao (08/11, pedido dele): a letra voa do mundo pra HUD ao entrar na zona e volta ao sair; a barra anda com a captura
  domCap(snap, want, D) {
    const E = (this.dcEl ||= { box: document.getElementById('domCap'), pin: document.getElementById('dcPin'), fill: document.getElementById('dcFill'), st: document.getElementById('dcState') });
    const fly = (leaving) => {
      const r = E.pin.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, hk = parseFloat(getComputedStyle(document.body).getPropertyValue('--hud-k')) || 1, dx = (D.at ? D.at[0] - cx : 0) / hk, dy = (D.at ? D.at[1] - cy : -90) / hk;
      const far = { transform: `translate(${dx}px, ${dy}px) scale(.72)`, opacity: 0.85 }, home = { transform: 'translate(0, 0) scale(1)', opacity: 1 };
      D.anim?.cancel();
      D.anim = E.pin.animate(leaving ? [home, far] : [far, home], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : leaving ? 260 : 360, easing: 'cubic-bezier(.22, .8, .24, 1)', fill: 'forwards' });
      return D.anim;
    };
    const z0 = want && snap.zones.find(q => q.id === want);
    if (want && want !== D.id) {
      D.id = want; D.leaving = false; E.box.hidden = false; E.pin.textContent = want; E.box.classList.add('on');
      D.show = z0?.prog || 0; D.last = D.show; D.moved = 0; D.w = -1; fly(false);
    } else if (want && D.leaving) {
      D.leaving = false; E.box.classList.add('on'); fly(false);
    } else if (!want && D.id && !D.leaving) {
      D.leaving = true; E.box.classList.remove('on');
      const a = fly(true); a.onfinish = () => { if (!D.leaving) return; D.leaving = false; D.id = null; D.anim = null; a.cancel(); E.box.hidden = true; };
    }
    if (!D.id) return;
    const z = snap.zones.find(q => q.id === D.id); if (!z) return;
    const now = performance.now(), dt = Math.min(0.1, (now - (D.t || now)) / 1000), prog = z.prog || 0; D.t = now;
    D.show += (prog - D.show) * Math.min(1, dt * 12); // o snapshot chega em degraus; a barra anda lisa
    if (Math.abs(prog - D.last) > 1e-4) { D.dir = Math.sign(prog - D.last); D.last = prog; D.moved = now; }
    const moving = now - D.moved < 280, team = this.g?.myTeam, mine = team === 'red' ? -1 : 1;
    const st = moving ? (D.dir === mine ? 'capturing' : 'losing') : z.owner && z.owner === team ? 'held' : 'contest';
    if (st !== D.st) { D.st = st; E.box.dataset.st = st; E.st.textContent = t({ capturing: 'domCapturing', losing: 'domLosing', held: 'domHeld', contest: 'domContest' }[st]); }
    E.box.classList.toggle('moving', moving);
    const cls = (z.owner || '') + (z.bonus ? ' bonus' : ''), side = D.show < 0 ? 'red' : D.show > 0 ? 'blue' : '';
    if (cls !== D.cls) { D.cls = cls; E.pin.className = 'dc-pin ' + cls; }
    if (side !== D.side) { D.side = side; E.fill.className = side; }
    const w = Math.round(Math.abs(D.show) * 1000) / 10; if (w !== D.w) { D.w = w; E.fill.style.width = w + '%'; }
  }

  chSlide(b) {
    const box = b.querySelector('.bd-slide'), ul = box?.querySelector('ul'); if (!ul) return;
    if (this.slideUl !== ul) { // lista so muda quando o progresso muda; a conta roda uma vez por lista (a altura da caixa muda depois de paginar)
    const items = [...ul.children], avail = parseFloat(getComputedStyle(box).maxHeight) || 480, itemH = Math.max(...items.map(li => li.offsetHeight), 40) + 8;
    const per = Math.max(1, Math.floor(avail / itemH)), pages = Math.ceil(items.length / per);
    {
      this.slidePages = pages; this.slideUl = ul; this.slideP = Math.min(this.slideP || 0, pages - 1);
      items.forEach((li, k) => li.style.setProperty('--pg', Math.floor(k / per)));
      ul.style.setProperty('--pages', pages); b.querySelector('.bd-dots').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, k) => `<i class="${k === this.slideP ? 'on' : ''}"></i>`).join('') : '';
      ul.style.transform = `translateX(${-this.slideP * 100}%)`;
    }
    }
    const pages = this.slidePages;
    if (pages > 1 && !this.slideT) this.slideT = setInterval(() => {
      const u = this.slideUl; if (!u?.isConnected) { clearInterval(this.slideT); this.slideT = 0; return; }
      this.slideP = (this.slideP + 1) % this.slidePages; u.style.transform = `translateX(${-this.slideP * 100}%)`;
      u.closest('.bd-ch')?.querySelectorAll('.bd-dots i').forEach((d, k) => d.classList.toggle('on', k === this.slideP));
    }, 6000);
    if (pages <= 1 && this.slideT) { clearInterval(this.slideT); this.slideT = 0; }
  }
  board(show, snap, players, meId, chs = null) {
    const b = this.el.board;
    b.hidden = !show;
    if (!show && this.slideT) { clearInterval(this.slideT); this.slideT = 0; } // Tab fechado: o deslize para
    if (!show || !snap) return;
    const cfg = MODES[snap.mode];
    const TEAM = snap.mode === 'infect' ? { red: 'inf_h_inf', blue: 'inf_h_surv' } : { red: 'h_red', blue: 'h_blue' };
    const bomb = snap.mode === 'bomb';
    const rows = (list) => list.map(p => `<tr class="${p.id === meId ? 'me' : ''}${bomb && !p.alive ? ' dead' : ''}"><td>${bomb ? `<span class="life ${p.alive ? 'on' : 'off'}" title="${t(p.alive ? 'b_alive' : 'b_dead')}"></span>` : ''}${p.team ? `<span class="tteam" style="background:var(--${p.team})"></span>` : ''}${p.rk >= 0 ? badgeSvg(p.rk, 16) : ''}${esc(p.name)}${devIcon(p.dv)}${p.pr ? ` <em class="prest">★${p.pr > 1 ? p.pr : ''}</em>` : ''}${p.elite ? eliteTag() : ''}${p.bot ? ` <small>(${t('bot')})</small>` : ''}</td>${snap.mode === 'gungame' ? `<td class="n">${p.gunLvl + 1}</td>` : ''}<td class="n">${p.kills}</td><td class="n">${p.assists || 0}</td><td class="n">${p.deaths}</td><td class="n">${p.score}</td><td class="n ${p.pg ? (p.pg < 80 ? 'pg-ok' : p.pg < 160 ? 'pg-mid' : 'pg-bad') : ''}">${p.pg || '–'}</td></tr>`).join('');
    const head = `<tr><th>${t('b_player')}</th>${snap.mode === 'gungame' ? `<th class="n">${t('b_step')}</th>` : ''}<th class="n">${t('b_kills')}</th><th class="n">${t('b_assists')}</th><th class="n">${t('b_deaths')}</th><th class="n">${t('b_score')}</th><th class="n">${t('b_ping')}</th></tr>`;
    const sort = (l) => [...l].sort((a, b) => b.score - a.score || b.kills - a.kills);
    let html = `<h3>${modeName(snap.duo ? 'duo' : snap.bounce ? 'bounce' : snap.blitz || snap.mode)}</h3>`;
    if (cfg.teams) {
      for (const tm of ['red', 'blue']) html += `<table><caption style="text-align:left;font-family:var(--display);padding:6px 0 2px;color:var(--${tm})">${t(TEAM[tm])} · ${snap.teamScore[tm]}</caption>${head}${rows(sort(players.filter(p => p.team === tm && !p.mob)))}</table>`;
    } else html += `<table>${head}${rows(sort(players))}</table>`;
    // desafios acompanhados ao lado do placar (embaixo na tela estreita), progresso ao vivo
    b.classList.toggle('has-ch', !!chs?.length);
    if (chs?.length) html = `<div class="bd-main">${html}</div><aside class="bd-ch"><h3>${t('missions')}</h3><div class="bd-slide"><ul>${chs.map(c => `<li class="${c.done ? 'done' : ''}${c.elite ? ' elite' : ''}"><small>${esc(c.tag)}${c.pin ? ' ·  ★' : ''}</small><b>${esc(c.name)}</b>${c.rw ? `<em>${esc(c.rw)}</em>` : ''}<span class="bd-bar"><i style="width:${Math.round(Math.min(1, c.prog / c.n) * 100)}%"></i></span><span class="bd-n">${c.done ? t('chDoneStamp') : `${Math.min(c.prog, c.n)}/${c.n}`}</span></li>`).join('')}</ul></div><span class="bd-dots"></span></aside>`;
    if (b._h !== html) { b._h = html; b.innerHTML = html; } // so redesenha quando muda (antes era todo quadro)
    // 08/11 (pedido dele): muitas missoes/desafios no painel do Tab = desliza sozinho pro lado a cada 6 s e volta pro comeco
    if (show && chs?.length) this.chSlide(b); else { clearInterval(this.slideT); this.slideT = 0; }
  }
}
