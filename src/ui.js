// Menus: inicio, modos, multiplayer, arsenal (gunsmith), ajustes.
import { MODES, WEAPONS, PRIMARIES, BLUEPRINTS, bodyTrait, SKILLS, SKILL_SLOTS, AMMO, AMMO_IDS, FIELD, FIELD_IDS } from '../shared/weapons.js';
import { SKILL_ICONS } from './skillicons.js';
import { tip } from './tips.js';
import { UNLOCKS, dailyToday, unlockState, msToReset, LOCKED_BY, unlockProg, unlockActive, eliteToday, BP_ORDER, tutorialState, togglePick, unlockPinned, pendingUnlocks } from './challenges.js';
import { TRACER_STYLES } from './world.js';
import { audio } from './audio.js';
import * as rovex from './rovex.js';
import { isTouch } from './input.js';
import { CAMOS, CAMO_SWATCH } from './camos.js';
import { stats as pStats } from './progress.js';
import { DEBUG, progressInfo, wpnInfo, wpnLevel, partReq, partUnlocked, camoUnlocked, setUnlockAll, onProgress, reqProgress, bpUnlocked, doPrestige } from './progress.js';
import { PICK_MAPS as MAP_IDS } from '../shared/map.js'; // a ilha e so do battle royale (nao aparece na escolha)
import { t, wName, modeName, modeDesc, getLang, setLang } from './i18n.js';
import { LOOKS } from '../shared/looks.js';
import { getLook, saveLook, lookOpen } from './lookstore.js';
import { syncOpen, isNew, anyNew, markSeen, newPill } from './newstuff.js';
import { TIERS, badgeSvg, myTier, peakTier } from './rank.js';
import { rankData } from './progress.js';
import { freeScope, CATEGORY, LASERS, RETICLES, RET_COLORS, unlockedLoadout, chargerOptions, partEffects, partName, buildGun, getLoadouts, saveLoadouts, loadoutStats, defaultLoadout, nativePart, arsenalReady, bpLoadout, scopeFits } from './arsenal.js';

const $ = (id) => document.getElementById(id);
// mira (crosshair): formatos e cores; o mesmo desenho vale pra previa dos ajustes e pra partida
export const XHAIRS = ['cross', 'crossdot', 'dot', 'circle', 'ring', 'tee', 'dyn']; // ring = circulo sem o ponto; dyn = muda com a arma
// mira dinamica (pedido dele 30/10): pistola e sniper = ponto, escopeta = circulo; fuzil/SMG pelo jeito de atirar:
// automatica = cruz completa, rajada = cruz pontilhada (3 tracos), semi/ferrolho = cruz pontilhada espacada
export function dynXhair(wpn, mode) {
  if (wpn === 'pistol' || wpn === 'sniper') return 'dot';
  if (wpn === 'shotgun') return 'circle';
  if (mode === 'burst') return 'dashb';
  if (mode === 'semi' || mode === 'bolt') return 'dashs';
  return 'cross';
}
export const XH_COLORS = ['#ece9e1', '#3cff6b', '#ffd23a', '#3ce8ff', '#ff4a3a', '#ff6bd5'];
const XH_CROSS = '<i></i><i></i><i></i><i></i><b class="xd"></b><u class="xr"></u>';
export function applyCrosshair(el, S, ctx = null) {
  if (!el) return;
  const shape = S.xhair === 'dyn' ? (ctx ? dynXhair(ctx.wpn, ctx.mode) : 'dashb') : XHAIRS.includes(S.xhair) ? S.xhair : 'cross'; // previa da dinamica: a pontilhada
  el.className = 'cross x-' + shape;
  el.style.setProperty('--xc', S.xhairColor || XH_COLORS[0]);
}
const PAINTS = ['#a83a2c', '#d9822b', '#e3c14a', '#5f8f3a', '#2f6b5a', '#2f5b8a', '#5b3f8a', '#c45b8f', '#ece9e1', '#6e6a63', '#2a2724'];

export function initMenus(o) {
  const ui = { screen: 'home' };
  const screens = ['home', 'mp', 'arsenal', 'skills', 'settings', 'controls', 'challenges', 'look', 'ranked', 'profile'];
  let settingsFromGame = false, fromLobby = false;

  // from: true = da pausa da partida; 'lobby' = o arsenal por cima da sala (volta pra ela)
  ui.go = (name, fromGame = false, startCat = null) => {
    fromLobby = (fromGame === 'lobby' || fromGame === 'game') && name === 'arsenal'; // 'game' = aberto da pausa, aplica na hora
    settingsFromGame = fromGame === true;
    // abre na arma principal equipada (antes ficava presa na ultima aba aberta)
    if (name === 'arsenal' && !startCat && PRIMARIES.includes(S.primary)) startCat = S.primary;
    if (startCat) { cat = startCat; slot = 'body'; preview = null; }
    $('smithDone').hidden = !fromLobby;
    if (fromLobby) $('smithDone').textContent = t(fromGame === 'game' ? 'smithNow' : o.lobbyHost() ? 'lbSmithBack' : 'lbSmithReady');
    for (const s of screens) $('scr-' + s).hidden = s !== name;
    ui.screen = name;
    $('menu').classList.toggle('smithing', name === 'arsenal' || name === 'look');
    $('menu').classList.toggle('home', name === 'home');
    if (name === 'arsenal') { picking = false; renderSmith(); }
    if (name === 'skills') { renderSkills(); tip('skills'); }
    if (name === 'mp') ui.refreshRooms && ui.refreshRooms();
    if (name === 'challenges') { renderChallenges(); markChallengesSeen(); }
    if (name === 'controls') renderKeys();
    if (name === 'look') renderLook();
    if (name === 'ranked') renderRanked();
    if (name === 'profile') renderProfile();
    if (name === 'home') { markNewChallenges(); markNewStuff(); rankMini(); }
    const first = $('scr-' + name).querySelector('button, input');
    first && first.focus({ preventScroll: true });
  };

  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => {
      audio.init();
      const to = b.dataset.go;
      audio.play(to === 'home' ? 'ui_back' : 'ui_click', { ui: true });
      if (to === 'home' && settingsFromGame && o.inGame()) { o.onBackFromSettingsInGame(); settingsFromGame = false; return; }
      if (to === 'home' && fromLobby) { fromLobby = false; o.onBackToLobby(false); return; }
      ui.go(to);
    });
    b.addEventListener('pointerenter', () => audio.play('ui_hover', { ui: true, vol: 0.35, key: 'hover', max: 1 }));
  });
  // concluir: a categoria aberta vira a principal (se for principal) e volta pra sala ja pronto
  $('smithDone').onclick = () => {
    if (PRIMARIES.includes(cat) && S.primary !== cat) { S.primary = cat; o.saveSettings(); }
    audio.play('pickup', { ui: true, vol: 0.6 });
    fromLobby = false; o.onBackToLobby(true);
  };
  ui.fromLobby = () => fromLobby;
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && fromLobby && ui.screen === 'arsenal') { audio.play('ui_back', { ui: true }); fromLobby = false; o.onBackToLobby(false); return; }
    if (e.key === 'Escape' && !o.inGame() && ui.screen !== 'home') { audio.play('ui_back', { ui: true }); ui.go('home'); }
    if (e.key === 'Escape' && settingsFromGame && o.inGame() && ui.screen === 'settings') { o.onBackFromSettingsInGame(); settingsFromGame = false; }
  });

  // modo, mapa, bots e pontaria agora sao escolhidos no lobby (painel do host); aqui so sai com a ultima
  // configuracao que o host usou (guardada pelo lobby)
  const lastCfg = () => { try { return JSON.parse(localStorage.getItem('rr_lastcfg')) || {}; } catch { return {}; } };
  // ---------- multiplayer: entrar por codigo ou criar sala (servidor na Fly) ----------
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const cleanCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const mpName = () => rovex.me?.name || $('mpName').value.trim() || (rovex.isGuest() ? rovex.guestName() : 'Inkblot');
  ui.refreshRooms = () => {
    $('mpWho').textContent = rovex.me ? t('playingAs', { n: rovex.me.name }) : t('guestHint');
    $('mpNameField').hidden = !!rovex.me;
  };
  async function goMp(args) {
    $('mpErr').textContent = '';
    $('playMp').disabled = $('joinCode').disabled = $('playQuick').disabled = true;
    const name = mpName();
    if (!rovex.me) { o.settings.name = name; o.saveSettings(); }
    try { await o.onMp({ url: rovex.MP_URL, name, ...args }); }
    catch (e) { $('mpErr').textContent = e.code === 'noroom' ? t('noRoom', { c: args.room }) : e.code === 'full' ? t('roomFull', { c: args.room }) : e.code === 'busy' ? t('mpBusy') : t('mpDown'); }
    $('playMp').disabled = $('joinCode').disabled = $('playQuick').disabled = false;
  }
  // jogo rapido: o servidor escolhe a sala (partida rolando com gente, ou uma nova com bots em modo sorteado)
  $('playQuick').onclick = () => { audio.play('ui_click', { ui: true }); goMp({ quick: true }); };
  $('mpRoom').oninput = () => { const c = cleanCode($('mpRoom').value); if (c !== $('mpRoom').value) $('mpRoom').value = c; };
  $('mpJoin').onsubmit = (e) => {
    e.preventDefault();
    const room = cleanCode($('mpRoom').value);
    if (!room) { $('mpErr').textContent = t('codeEmpty'); $('mpRoom').focus(); return; }
    audio.play('ui_click', { ui: true });
    goMp({ room, join: true });
  };
  $('goTutorial').onclick = () => { audio.play('ui_click', { ui: true }); o.onTutorial(); };
  $('goSolo').onclick = () => {
    audio.play('ui_click', { ui: true });
    // primeira vez que o jogador comeca: o treino abre no lugar (so uma vez; depois fica em Treino e Desafios)
    let seen = true; try { seen = !!localStorage.getItem('rr_tutorial_seen') || !!localStorage.getItem('rr_tutorial_done'); } catch { /* */ }
    if (!seen) { o.onTutorial(); return; }
    const c = lastCfg();
    o.onSolo({ mode: c.mode || 'ffa', map: c.map || 'auto', bots: Number.isFinite(c.bots) ? c.bots : 7, difficulty: c.difficulty || 1, limit: c.limit || 0, time: c.time || 0 });
  };
  $('mpName').value = o.settings.name || '';
  $('playMp').onclick = () => {
    audio.play('ui_click', { ui: true });
    const c = lastCfg();
    goMp({ room: newCode(), mode: c.mode || 'tdm', map: c.map || 'auto', bots: Number.isFinite(c.bots) ? Math.min(11, c.bots) : 5 });
  };
  // convite da Rovex (?sala=): ja abre a aba e entra na sala
  if (rovex.inviteRoom) setTimeout(() => { ui.go('mp'); $('mpRoom').value = rovex.inviteRoom; $('mpJoin').requestSubmit(); }, 300);

  // ---------- ajustes ----------
  const S = o.settings;
  const defs = [
    ['range', 'fov', 's_fov', 60, 115, 1, v => v + '°'],
    ['range', 'sens', 's_sens', 0.1, 4, 0.05, v => v.toFixed(2)],
    ['range', 'adsSens', 's_adsSens', 0.3, 1.5, 0.05, v => v.toFixed(2)],
    ['range', 'vmFov', 's_vmFov', 45, 75, 1, v => v + '°'],
    ['range', 'master', 's_master', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'music', 's_music', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'sfx', 's_sfx', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'grain', 's_grain', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'res', 's_res', 0.4, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['seg', 'lang', 's_lang', [['en', 'English'], ['pt', 'Portugues']]],
    ['seg', 'film', 's_film', [['full', 'film_full'], ['color', 'film_color'], ['bw', 'film_bw']]],
    ['seg', 'draw', 's_draw', [['near', 'draw_near'], ['mid', 'draw_mid'], ['far', 'draw_far']]],
    ['toggle', 'invertY', 's_invert'],
    ['toggle', 'holdCrouch', 's_hold'],
    ['toggle', 'autoSprint', 's_auto'],
    ['toggle', 'showFps', 's_fps'],
    ['toggle', 'threatRing', 's_threat'],
    ['toggle', 'autoChute', 's_autoChute'],
    ['xhair'],
  ];
  if (DEBUG) defs.push(['toggle', 'unlockAll', 's_unlockAll']);
  // mira assistida: toque e controle; tiro automatico so no toque (os dois ligados por padrao)
  if (isTouch) defs.splice(defs.findIndex(d => d[1] === 'invertY'), 0, ['toggle', 'aimAssist', 's_aimAssist'], ['toggle', 'autoFire', 's_autoFire']);
  else defs.splice(defs.findIndex(d => d[1] === 'invertY'), 0, ['toggle', 'aimAssist', 's_aimAssistPad']);
  const sl = $('settingsList');
  S.lang = getLang();
  S.unlockAll = progressInfo().unlockAll;
  const buildSettings = () => { sl.innerHTML = defs.map(d => {
    if (d[0] === 'range') return `<label class="field"><span>${t(d[2])} <b data-out="${d[1]}"></b></span><input type="range" data-k="${d[1]}" min="${d[3]}" max="${d[4]}" step="${d[5]}"></label>`;
    if (d[0] === 'xhair') return `<div class="field xh-field"><span>${t('s_xhair')}</span><div class="xh-row"><div class="xh-prev" aria-hidden="true"><div class="cross" id="xhPrev">${XH_CROSS}</div></div><div class="xh-opts"><div class="seg" data-seg="xhair">${XHAIRS.map(x => `<button data-v="${x}">${t('xh_' + x)}</button>`).join('')}</div><div class="xh-cols" role="group" aria-label="${t('s_xhairColor')}">${XH_COLORS.map(c => `<button data-xc="${c}" style="background:${c}" aria-label="${t('s_xhairColor')} ${c}"></button>`).join('')}</div></div></div></div>`;
    if (d[0] === 'seg') return `<div class="field"><span>${t(d[2])}</span><div class="seg" data-seg="${d[1]}">${d[3].map(([v, l]) => `<button data-v="${v}">${d[1] === 'lang' ? l : t(l)}</button>`).join('')}</div></div>`;
    return `<div class="toggle"><span id="lbl-${d[1]}">${t(d[2])}</span><button class="switch" role="switch" aria-labelledby="lbl-${d[1]}" data-t="${d[1]}"></button></div>`;
  }).join(''); };
  buildSettings();
  const refresh = () => {
    for (const d of defs) {
      if (d[0] === 'range') { sl.querySelector(`[data-k="${d[1]}"]`).value = S[d[1]]; sl.querySelector(`[data-out="${d[1]}"]`).textContent = d[6](Number(S[d[1]])); }
      if (d[0] === 'seg') sl.querySelectorAll(`[data-seg="${d[1]}"] button`).forEach(b => b.classList.toggle('on', b.dataset.v === S[d[1]]));
      if (d[0] === 'toggle') sl.querySelector(`[data-t="${d[1]}"]`).setAttribute('aria-checked', !!S[d[1]]);
      if (d[0] === 'xhair') {
        sl.querySelectorAll('[data-seg="xhair"] button').forEach(b => b.classList.toggle('on', b.dataset.v === (S.xhair || 'cross')));
        sl.querySelectorAll('[data-xc]').forEach(b => b.setAttribute('aria-pressed', b.dataset.xc === (S.xhairColor || XH_COLORS[0])));
        applyCrosshair(sl.querySelector('#xhPrev'), S);
      }
    }
  };
  sl.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; S[k] = Number(e.target.value); refresh(); o.saveSettings(); });
  sl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const seg = b.parentElement.dataset.seg;
    if (seg) S[seg] = b.dataset.v;
    if (seg === 'lang') { setLang(S.lang); buildSettings(); ui.relang(); }
    if (b.dataset.t) S[b.dataset.t] = !S[b.dataset.t];
    if (b.dataset.xc) S.xhairColor = b.dataset.xc;
    if (b.dataset.t === 'unlockAll') setUnlockAll(S.unlockAll);
    audio.play('ui_click', { ui: true, vol: 0.6 });
    refresh(); o.saveSettings();
  });
  refresh();

  // ---------- arsenal ----------
  let loadouts = getLoadouts();
  let cat = 'rifle', slot = 'body', picking = false; // picking = painel mostrando as opcoes de um slot
  const CATS = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'melee'];
  const SLOTS = ['bp', 'body', 'scope', 'ret', 'charger', 'handle', 'laser', 'ammo', 'tracer', 'camo', 'paint', 'accent'];
  const SLOT_LABEL = { bp: 'slot_bp', body: 'slot_body', scope: 'slot_scope', ret: 'slot_ret', charger: 'slot_charger', handle: 'slot_handle', laser: 'slot_laser', ammo: 'slot_ammo', tracer: 'slot_tracer', camo: 'slot_camo', paint: 'slot_paint', accent: 'slot_accent' };

  // desafios: diarios (3) e carreira (Bronze/Prata/Ouro)
  let chPickOpen = false;
  function renderChallenges() {
    const h = Math.ceil(msToReset() / 3600000);
    $('chReset').textContent = t('chReset', { n: h });
    const row = (name, prog, n, xp, done, extra = '') => `<li class="${done ? 'done' : ''}"><div class="ch-txt"><b>${name}</b>${extra}<span class="ch-bar"><i style="width:${Math.round(Math.min(1, prog / n) * 100)}%"></i></span></div><div class="ch-side"><em>${Math.min(prog, n)}/${n}</em><small>+${xp} XP</small></div>${done ? `<span class="ch-stamp">${t('chDoneStamp')}</span>` : ''}</li>`;
    const seen = seenChallenges(), nw = (key) => seen.has(key) ? '' : ` <span class="ch-new">${t('chNew')}</span>`;
    // elite do dia: um so, dificil, premio = variante de elite (arma montada + camo lendaria)
    const el = eliteToday(), bp = el.reward && BLUEPRINTS[el.reward];
    $('chElite').className = 'elite-card' + (el.done ? ' done' : '');
    $('chElite').innerHTML = `<div class="el-star" aria-hidden="true">★</div><div class="el-body"><small>${t('elTitle')} · ${t('chReset', { n: h })}</small><b>${t('el_' + el.id, { n: el.n })}</b>`
      + `<span class="ch-bar"><i style="width:${Math.round(Math.min(1, el.prog / el.n) * 100)}%"></i></span>`
      + `<small class="el-rw">${bp ? t('elReward', { v: t(el.reward), w: wName(bp.wpn), c: t('camo_' + bp.lo.camo) }) : t('elAllBp')}</small></div>`
      + `<div class="el-side"><em>${Math.min(el.prog, el.n)}/${el.n}</em><small>+${el.xp} XP</small></div>${el.done ? `<span class="ch-stamp">${t('chDoneStamp')}</span>` : ''}`;
    $('chDaily').innerHTML = dailyToday().map(c => row(t('ch_' + c.id, { n: c.n, w: c.wpn ? wName(c.wpn) : '' }) + nw(dailyKey(c)), c.prog, c.n, c.xp, c.done)).join('');
    const us = unlockState();
    // treino: premio fixo no topo da carreira (modelo + camuflagem sorteados, uma vez so)
    const tu = tutorialState();
    const tutLi = `<li class="ch-tut ${tu ? 'done' : ''}"><div class="ch-txt"><b>${t('ch_tutorial')}</b><small class="ch-reward">${t('chReward')}: ${tu ? [tu.body && partName('body', tu.body), tu.camo && t('camo_' + tu.camo)].filter(Boolean).join(' + ') : t('ch_tutorialRw')}</small></div>`
      + (tu ? `<span class="ch-stamp">${t('chDoneStamp')}</span>` : `<button class="ch-go" id="chTutGo">${t('ch_tutorialGo')}</button>`) + '</li>';
    $('chCareer').innerHTML = tutLi + us.active.map(u => row(chName(u) + nw('u:' + u.id), u.prog, u.n, u.xp, false, `<small class="ch-reward">${t('chReward')}: ${rewardName(u.reward)}</small>`)).join('')
      + `<li class="ch-queue">${us.queued ? t('chQueue', { n: us.queued, d: us.done, t: us.total }) : us.done >= us.total ? t('chAllDone') : ''}${us.queued ? ` <button class="ch-pickbtn" id="chPickBtn" aria-expanded="${chPickOpen}">${t(chPickOpen ? 'chPickClose' : 'chPickOpen')}</button>` : ''}</li>`
      // escolher quais desbloqueios perseguir (ate 4 ativos); toque liga/desliga
      + (chPickOpen ? `<li class="ch-pick"><p>${t('chPickHint')}</p><div class="ch-pick-grid">${pendingUnlocks().map(u => { const on = unlockPinned(u.id), act = us.active.some(a => a.id === u.id); return `<button class="${on ? 'on' : ''} ${act ? 'act' : ''}" data-pick="${u.id}" aria-pressed="${on}"><b>${rewardName(u.reward)}</b><small>${chName(u)}</small><span class="ch-bar"><i style="width:${Math.round(u.prog / u.n * 100)}%"></i></span><em>${on ? t('chPicked') : act ? t('chActiveNow') : ''}</em></button>`; }).join('')}</div></li>` : '');
    const go = $('chTutGo'); if (go) go.onclick = () => { audio.play('ui_click', { ui: true }); o.onTutorial(); };
    const pb = $('chPickBtn'); if (pb) pb.onclick = () => { chPickOpen = !chPickOpen; audio.play('ui_click', { ui: true, vol: 0.6 }); renderChallenges(); };
    $('chCareer').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { togglePick(b.dataset.pick); audio.play('swap', { ui: true, vol: 0.5 }); renderChallenges(); });
  }
  // desafio "novo" = ainda nao aparecia na lista da ultima vez que o jogador abriu a tela
  const SEEN_KEY = 'rr_ch_seen';
  const dailyKey = (c) => 'd:' + new Date().toISOString().slice(0, 10) + ':' + c.id + ':' + (c.wpn || '');
  function seenChallenges() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); } catch { return new Set(); } }
  function currentChallengeKeys() { return [...dailyToday().map(dailyKey), ...unlockState().active.map(u => 'u:' + u.id)]; }
  function markChallengesSeen() {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(currentChallengeKeys())); } catch { /* sem storage */ }
    markNewChallenges();
  }
  // ---------- rankeada ----------
  const rkReward = (R) => R.slot === 'camo' ? t('camo_' + R.id) : R.tab === 'hat' ? t('lk_hat_' + R.id) + ' + ' + t('camo_' + R.camo) : t('lkt_' + R.tab) + ' ' + t('rk_' + TIERS.find(x => x.reward === R).id);
  function rankMini() { const k = myTier(); $('rkMini').innerHTML = k >= 0 ? badgeSvg(k, 20) : ''; }
  ui.rankMini = rankMini;
  function renderRanked() {
    const r = rankData(), k = myTier(), peak = peakTier(), nx = TIERS[k + 1];
    $('rkMe').innerHTML = k < 0 ? `<span class="rk-big none">${badgeSvg(0, 72)}</span><div><b>${t('rkUnranked')}</b></div>`
      : `<span class="rk-big">${badgeSvg(k, 72)}</span><div><b>${t('rk_' + TIERS[k].id)}</b><small>${t('rkPts', { n: r.rp })}</small>`
        + (nx ? `<span class="xpbar"><i style="width:${Math.round((r.rp - TIERS[k].rp) / (nx.rp - TIERS[k].rp) * 100)}%"></i></span><small>${t('rkNext', { n: nx.rp - r.rp, t: t('rk_' + nx.id) })}</small>` : `<small>${t('rkTop')}</small>`) + '</div>';
    $('rkTiers').innerHTML = TIERS.map((T, i) => `<li class="${i === k ? 'cur' : ''} ${peak >= i ? 'got' : ''}">${badgeSvg(i, 34)}<span><b>${t('rk_' + T.id)}</b><small>${T.rp}+</small></span><em><small>${t(peak >= i ? 'rkGot' : 'rkReward')}</small>${rkReward(T.reward)}</em></li>`).join('');
    $('rkFind').onclick = () => { audio.play('ui_click', { ui: true }); goMp({ ranked: true }); };
  }
  rankMini();

  // ---------- pill NOVO: tudo que esta aberto agora (o newstuff compara com o que ja estava) ----------
  function openKeys() {
    const out = [];
    for (const c of CATS) {
      const C = CATEGORY[c], A = 'arsenal|' + c + '|';
      C.bodies.forEach((id, i) => { if (partUnlocked(c, i, id)) out.push(A + 'body|' + id); });
      for (const [sl, list] of [['scope', C.scopes], ['handle', C.handles], ['laser', c === 'melee' ? [] : LASERS]]) list.forEach((id, i) => { if (partUnlocked(c, i + 1, id)) out.push(A + sl + '|' + id); });
      for (const cm of CAMOS) if (camoUnlocked(c, cm)) out.push(A + 'camo|' + cm.id);
      if (c !== 'melee') {
        for (const id of AMMO_IDS) if ((!AMMO[id].only || AMMO[id].only === c) && partUnlocked(c, 1, 'am:' + id)) out.push(A + 'ammo|' + id);
        for (const id of TRACER_STYLES) if (partUnlocked(c, 1, 'tr:' + id)) out.push(A + 'tracer|' + id);
      }
      for (const id of BP_ORDER) if (BLUEPRINTS[id].wpn === c && bpUnlocked(id)) out.push(A + 'bp|' + id);
    }
    for (const tab of Object.keys(LOOKS)) for (const it of LOOKS[tab]) if (lookOpen(tab, it.id)) out.push('look|' + tab + '|' + it.id);
    return out;
  }
  function markNewStuff() {
    syncOpen(openKeys());
    for (const [go, pre] of [['arsenal', 'arsenal|'], ['look', 'look|']]) {
      const btn = document.querySelector(`.bill-item[data-go="${go}"]`);
      if (!btn) continue;
      btn.querySelector('.nw')?.remove();
      if (anyNew(pre)) btn.insertAdjacentHTML('beforeend', newPill(t('chNew')));
    }
  }
  ui.markNewStuff = markNewStuff;
  onProgress(() => { if (ui.screen === 'home') markNewStuff(); });

  // selo no botao "Desafios" do menu enquanto houver desafio que o jogador nao viu
  function markNewChallenges() {
    const btn = document.querySelector('.bill-item[data-go="challenges"]');
    if (!btn) return;
    const seen = seenChallenges(), n = currentChallengeKeys().filter(k => !seen.has(k)).length;
    btn.querySelector('.ch-new')?.remove();
    if (n) btn.insertAdjacentHTML('beforeend', `<span class="ch-new">${t('chNew')}</span>`);
  }
  ui.markNewChallenges = markNewChallenges;

  // ---------- controles: lista atual de comandos (teclado, controle, toque) ----------
  let keyTab = 'kb';
  const KEYS = {
    kb: [['W A S D', 'k_move'], ['Mouse', 'k_look'], ['Shift', 'k_sprint'], ['key_space', 'k_jump'], ['C / Ctrl', 'k_crouch'], ['key_lmb', 'k_fire'], ['key_rmb', 'k_ads'], ['R', 'k_reload'],
      ['key_wheel', 'k_swap'], ['Q', 'k_last'], ['V', 'k_melee'], ['G', 'k_frag'], ['F', 'k_flash'], ['X', 'k_streak'], ['I', 'k_inspect'], ['E', 'k_use'], ['Z', 'k_field'], ['key_ping', 'k_ping'], ['M', 'k_spec'], ['Tab', 'k_board'], ['Esc', 'k_pause']],
    pad: [['L', 'k_move'], ['R', 'k_look'], ['L3', 'k_sprint'], ['A / ✕', 'k_jump'], ['B / ○', 'k_crouch'], ['RT / R2', 'k_fire'], ['LT / L2', 'k_ads'], ['X / □', 'k_reload'],
      ['Y / △', 'k_swap'], ['R3', 'k_melee'], ['LB / L1', 'k_frag'], ['RB / R1', 'k_flash'], ['▲', 'k_streak'], ['▼', 'k_inspect'], ['▶', 'k_field'], ['◀', 'k_ping'], ['X / □ (segurar)', 'k_use'], ['Select', 'k_board'], ['Start', 'k_pause'],
      ['▲ ▼ ◀ ▶', 'k_menu'], ['A / ✕', 'k_confirm'], ['B / ○', 'k_back']],
    touch: [['t_stick', 'k_move'], ['t_drag', 'k_look'], ['t_auto', 'k_fire'], ['t_ping', 'k_ping']],
  };
  function renderKeys() {
    document.querySelectorAll('[data-kt]').forEach(b => b.setAttribute('aria-selected', b.dataset.kt === keyTab));
    $('keyList').innerHTML = KEYS[keyTab].map(([k, d]) => `<dt>${k.startsWith('key_') || k.startsWith('t_') ? t(k) : k}</dt><dd>${t(d)}</dd>`).join('');
  }
  document.querySelectorAll('[data-kt]').forEach(b => b.onclick = () => { keyTab = b.dataset.kt; audio.play('ui_click', { ui: true, vol: 0.6 }); renderKeys(); });

  // ---------- visual do boneco: abas, itens com raridade e cadeado; o 3D gira ao lado (main.js) ----------
  const LOOK_TABS = ['hat', 'eyes', 'glove', 'gloveCol', 'shirt', 'pattern', 'fx'];
  let lookTab = 'hat', lookTeam = 'red', lookPeek = null;
  function renderLook() {
    const cur = getLook();
    syncOpen(openKeys());
    $('lookTabs').innerHTML = LOOK_TABS.map(k => `<button role="tab" aria-selected="${k === lookTab}" data-lt="${k}">${t('lkt_' + k)}${k !== lookTab && anyNew('look|' + k + '|') ? newPill(t('chNew')) : ''}</button>`).join('');
    document.querySelectorAll('#scr-look [data-team]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.team === lookTeam)));
    const swatch = lookTab === 'gloveCol' || lookTab === 'shirt';
    $('lookGrid').classList.toggle('swatches', swatch);
    $('lookGrid').innerHTML = LOOKS[lookTab].map(it => {
      const open = lookOpen(lookTab, it.id), on = cur[lookTab] === it.id, peek = lookPeek === it.id;
      const lock = open ? '' : `<small class="lk-lock">${it.elite ? t('lookElite') : it.acct ? t('lookAcct') : it.rank != null ? t('rkLock', { t: t('rk_' + TIERS[it.rank].id) }) : it.ch ? t('lookCh') + ': ' + t('ch_' + it.ch, { n: (UNLOCKS.find(u => u.id === it.ch) || {}).n }) : t('lookLvl', { n: it.lvl })}</small>`;
      const rar = `<i class="lk-r r${it.r}">${t('rar' + it.r)}</i>` + (isNew('look|' + lookTab + '|' + it.id) ? newPill(t('chNew')) : '');
      if (swatch) return `<button class="lk-it sw ${on ? 'on' : ''} ${open ? '' : 'locked'} ${peek ? 'peek' : ''}" data-id="${it.id}" style="--c:${it.id}" aria-label="${it.id}">${it.elite ? '<i class="lk-r r2">Elite</i>' : it.acct ? '<i class="lk-r r2">Rovex</i>' : ''}${lock}</button>`;
      return `<button class="lk-it ${on ? 'on' : ''} ${open ? '' : 'locked'} ${peek ? 'peek' : ''}" data-id="${it.id}"><b>${t('lk_' + lookTab + '_' + it.id)}</b>${rar}${lock}</button>`;
    }).join('');
    markSeen('look|' + lookTab + '|');
    const show = lookPeek ? { ...cur, [lookTab]: lookPeek } : cur;
    const pk = lookPeek && LOOKS[lookTab].find(i => i.id === lookPeek);
    $('lookNote').textContent = !pk ? t('lookTeamNote') : pk.elite ? t('lookPeekElite') : pk.acct ? t('lookPeekAcct') : pk.rank != null ? t('rkPeekLook', { t: t('rk_' + TIERS[pk.rank].id) }) : pk.ch ? t('lookPeekCh', { c: t('ch_' + pk.ch, { n: (UNLOCKS.find(x => x.id === pk.ch) || {}).n }) }) : t('lookPeekLvl', { n: pk.lvl });
    o.onLook?.(show, lookTeam);
    $('lookTabs').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true, vol: 0.6 }); lookTab = b.dataset.lt; lookPeek = null; renderLook(); });
    $('lookGrid').querySelectorAll('.lk-it').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (b.classList.contains('locked')) { lookPeek = lookPeek === id ? null : id; audio.play('ui_hover', { ui: true }); renderLook(); return; }
      lookPeek = null; saveLook({ ...getLook(), [lookTab]: id }); audio.play('swap', { ui: true, vol: 0.6 }); renderLook();
    });
  }
  document.querySelectorAll('#scr-look [data-team]').forEach(b => b.onclick = () => { lookTeam = b.dataset.team; audio.play('ui_click', { ui: true, vol: 0.6 }); renderLook(); });

  // ---------- amigos jogando: salas abertas de amigos, no canto (no lugar das novidades) ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let frBusy = false;
  async function refreshFriendRooms() {
    if (frBusy || !rovex.me || o.inGame() || document.hidden) return;
    frBusy = true;
    let list = [];
    try { list = await rovex.friendRooms(); } catch { list = []; }
    frBusy = false;
    $('friendRooms').hidden = !list.length;
    $('frCount').textContent = list.length > 1 ? String(list.length) : '';
    $('frList').innerHTML = list.map((s) => `<li class="fr-row">
      <span class="fr-av" aria-hidden="true">${esc((s.amigo || '?').trim().charAt(0).toUpperCase())}</span>
      <span class="fr-txt"><span class="fr-top"><b>${esc(s.amigo)}</b><em class="fr-cnt" title="${esc(t('frPlayers', { n: s.humanos }))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>${esc(s.humanos)}</em></span><small class="fr-sub"><span class="fr-mq">${esc(modeName(s.modo))} · ${t('lbRoomLbl')} ${esc(s.code)}</span></small></span>
      <button class="fr-go" data-room="${esc(s.code)}">${t('joinCode')}</button></li>`).join('');
    // texto que nao cabe corre em letreiro (o que cabe fica parado)
    requestAnimationFrame(() => $('frList').querySelectorAll('.fr-sub').forEach((el) => { const m = el.firstElementChild, over = m.scrollWidth - el.clientWidth; el.classList.toggle('run', over > 2); if (over > 2) { el.style.setProperty('--mq', -(over + 12) + 'px'); el.style.setProperty('--mqT', Math.max(4, over / 18) + 's'); } }));
    $('frList').querySelectorAll('.fr-go').forEach((b) => b.onclick = () => {
      audio.play('ui_click', { ui: true });
      ui.go('mp'); $('mpRoom').value = b.dataset.room; $('mpJoin').requestSubmit();
    });
  }
  ui.refreshFriendRooms = refreshFriendRooms;

  // ---------- convite que chegou pra mim: cartao no topo (menu, lobby e partida) ----------
  const ivSeen = new Set(); let ivNow = null, ivBusy = false;
  async function checkInvites() {
    if (ivBusy || !rovex.me || document.hidden || ivNow) return;
    ivBusy = true;
    let list = [];
    try { list = await rovex.invites(); } catch { list = []; }
    ivBusy = false;
    const c = list.find(v => !ivSeen.has(v.id) && v.sala !== o.roomCode?.());
    if (!c) return;
    ivNow = c; ivSeen.add(c.id);
    $('ivAv').innerHTML = c.avatar ? `<img alt="" src="${esc(c.avatar)}">` : esc((c.nome || '?').trim().charAt(0).toUpperCase());
    $('ivTxt').innerHTML = t(o.inRoom?.() ? 'ivTxtGame' : 'ivTxt', { n: esc(c.nome), c: esc(c.sala) }) + (o.inGame() && document.pointerLockElement ? ` <small>${t('ivEsc')}</small>` : '');
    $('inviteToast').hidden = false;
    audio.play('ui_hover', { ui: true, vol: 0.6 });
  }
  const ivClose = () => { $('inviteToast').hidden = true; if (ivNow) rovex.inviteSeen(ivNow.id); ivNow = null; };
  $('ivNo').onclick = () => { audio.play('ui_click', { ui: true }); ivClose(); };
  $('ivGo').onclick = async () => {
    const sala = ivNow?.sala; ivClose();
    if (!sala) return;
    audio.play('ui_click', { ui: true });
    if (o.inRoom?.()) await o.leave(); // estava numa sala/partida: sai antes
    ui.go('mp'); $('mpRoom').value = sala; $('mpJoin').requestSubmit();
  };
  setInterval(checkInvites, 12000);
  setTimeout(checkInvites, 2500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkInvites(); });
  // amigo abriu/fechou sala: aparece em ate ~6 s no menu e no lobby (antes 30 s, so via ao voltar pro lobby).
  // Na partida nao consulta; volta a consultar na hora que sai dela.
  setInterval(refreshFriendRooms, 6000);
  addEventListener('focus', () => refreshFriendRooms());
  setTimeout(refreshFriendRooms, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshFriendRooms(); });
  markNewChallenges();

  // texto do desafio de desbloqueio e o nome do premio
  function chName(u) { return t('ch_' + u.id, { n: u.n }); }
  // Tab da partida: desafios acompanhados com o progresso de agora (os do dia, o elite e os desbloqueios ativos)
  ui.chRows = () => {
    const el = eliteToday();
    return [
      ...dailyToday().map(c => ({ name: t('ch_' + c.id, { n: c.n, w: c.wpn ? wName(c.wpn) : '' }), prog: c.prog, n: c.n, done: c.done, tag: t('chDaily') })),
      ...(el.done ? [] : [{ name: t('el_' + el.id, { n: el.n }), prog: el.prog, n: el.n, tag: t('elTitle'), elite: true }]),
      ...unlockState().active.map(u => ({ name: chName(u), prog: u.prog, n: u.n, tag: t('chCareerU'), rw: rewardName(u.reward), pin: unlockPinned(u.id) })),
    ];
  };
  function rewardName(r) { if (r.slot === 'look') return t('look') + ': ' + t('lk_' + r.id.replace(':', '_')); if (r.slot === 'tracer') return t('s_tracer') + ' ' + t('tr_' + r.id.slice(3)); if (r.slot === 'ammo') return t('slot_ammo') + ' ' + t('am_' + r.id.slice(3)); return r.slot === 'camo' ? t('camo_' + r.id) : `${partName(r.slot, r.id)} (${t('cat_' + r.wpn)})`; }

  // previa de item bloqueado: aparece no modelo e nos status, mas nao vai pro loadout
  let preview = null;
  const peek = (k, v) => { preview = preview && preview.k === k && preview.v === v ? null : { k, v }; audio.play('ui_click', { ui: true, vol: 0.5 }); renderSmith(); };

  function renderSmith() {
    loadouts = getLoadouts();
    if (!arsenalReady()) {
      $('slotList').innerHTML = `<p class="hint">${t('loadingGuns')}</p>`;
      $('picker').innerHTML = ''; $('statBars').innerHTML = '';
      return;
    }
    syncOpen(openKeys());
    $('catTabs').innerHTML = CATS.map(c => `<button role="tab" aria-selected="${c === cat}" data-c="${c}">${t('cat_' + c)}${anyNew('arsenal|' + c + '|') ? newPill(t('chNew')) : ''}</button>`).join('');
    $('catTabs').querySelectorAll('button').forEach(b => b.onclick = () => { cat = b.dataset.c; slot = 'body'; picking = false; preview = null; audio.play('ui_click', { ui: true }); renderSmith(); });
    // equipar: principal escolhida aqui, pistola sempre como secundaria
    const isPrimary = PRIMARIES.includes(cat);
    const equipped = isPrimary ? S.primary === cat || (!S.primary && cat === 'smg') : true;
    // cabecalho da arma (estilo gunsmith): nome grande + variante, nivel, e equipar do lado
    const loNow = loadouts[cat] || {};
    const modelName = loNow.body ? partName('body', loNow.body) : wName(cat); // nome proprio do modelo montado
    const eqHtml = isPrimary
      ? (equipped ? `<p class="equipped">${t('eqDone', { w: modelName })}</p>` : `<button class="big" id="equipBtn">${t('eqPrimary', { w: modelName })}</button>`)
      : `<p class="equipped">${t(cat === 'melee' ? 'eqMelee' : 'eqSecondary', { w: wName(cat) })}</p>`;
    $('equipBar').innerHTML = `<div class="gs-id"><b class="gs-name">${modelName}</b>${loNow.bp ? `<span class="gs-bp">★ ${t(loNow.bp)}</span>` : ''}</div>` + eqHtml;
    const eb = $('equipBtn');
    if (eb) eb.onclick = () => { S.primary = cat; o.saveSettings(); audio.play('pickup', { ui: true, vol: 0.6 }); renderSmith(); };
    // mostra o que vale de verdade: peca salva que ainda esta bloqueada aparece como padrao
    const lo = unlockedLoadout(cat, loadouts[cat], partUnlocked, camoUnlocked, CAMOS);
    if (lo.tracer && !TRACER_STYLES.includes(lo.tracer)) lo.tracer = null; // tracado que nao existe (salvo errado)
    const C = CATEGORY[cat];
    const wi = wpnInfo(cat, lo.body); // nivel e do corpo (modelo) equipado: cada um tem o seu
    $('equipBar').insertAdjacentHTML('beforeend', `<div class="wlevel"><b>${t('bodyLevel', { m: partName('body', lo.body), n: wi.level })}</b><span class="xpbar"><i style="width:${wi.max ? 100 : Math.round(wi.into / wi.need * 100)}%"></i></span><small>${wi.max ? t('maxed') : wi.into + ' / ' + wi.need + ' XP'}</small></div>`);
    // so mostra o pente quando o corpo aceita mais de um
    // lamina: so modelo e camuflagem; pente so quando o corpo aceita mais de um
    const hasBp = BP_ORDER.some(id => BLUEPRINTS[id].wpn === cat);
    const slots = cat === 'melee' ? ['body', 'camo'] : SLOTS.filter(s => (s !== 'charger' || chargerOptions(lo.body, cat).length > 1) && (s !== 'bp' || hasBp));
    if (!slots.includes(slot)) slot = 'body';
    $('slotList').innerHTML = slots.map(s => {
      const disabled = (s === 'handle' && !C.handles.length) || (s === 'ret' && !lo.scope);
      let val;
      if (s === 'bp') val = lo.bp ? `<i class="cmini" style="background:${CAMO_SWATCH[BLUEPRINTS[lo.bp].lo.camo]}"></i> ${t(lo.bp)}` : t('bpNone');
      else if (s === 'camo') { const cm = CAMOS.find(c => c.id === (lo.camo || 'none')) || CAMOS[0]; val = `<i class="cmini" style="background:${CAMO_SWATCH[cm.id]}"></i> ${t('camo_' + cm.id)}`; }
      else if (s === 'ammo') val = `<svg class="am-ico" viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[AMMO[lo.ammo]?.icon || 'radio_button_unchecked']}</svg> ${t('am_' + (lo.ammo || 'none'))}`;
      else if (s === 'tracer') val = `<i class="trsw tr-${lo.tracer || 'chalk'}"></i> ${t('tr_' + (lo.tracer || 'chalk'))}`;
      else if (s === 'ret') val = lo.scope ? `<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${RET_COLORS[lo.retColor || 'red']};vertical-align:-1px;border:2px solid currentColor"></i> ${t('ret_' + (lo.ret || 'auto'))}` : t('ret_none');
      else if (s === 'paint' || s === 'accent') val = lo[s] ? `<i style="display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid currentColor;background:${lo[s]};vertical-align:-2px"></i> ${lo[s]}` : t('original');
      else val = partName(s, s === 'charger' ? (lo.charger || nativePart(lo.body, 'charger')) : lo[s]);
      return `<button class="slot slot-${s} ${s === 'bp' && lo.bp ? 'set' : ''} ${disabled ? 'disabled' : ''}" data-s="${s}" ${disabled ? 'aria-disabled="true"' : ''}><small>${t(SLOT_LABEL[s])}${anyNew('arsenal|' + cat + '|' + s + '|') ? newPill(t('chNew')) : ''}</small><span>${val}</span></button>`;
    }).join('');
    $('slotList').querySelectorAll('.slot').forEach(b => b.onclick = () => { if (b.classList.contains('disabled')) return; slot = b.dataset.s; picking = true; preview = null; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSmith(); });
    // blocos de pecas OU a lista de opcoes do slot escolhido (o painel troca, nao empilha)
    $('slotList').hidden = picking; $('pickWrap').hidden = !picking;
    $('smith').classList.toggle('picking', picking);
    $('pickTitle').textContent = t(SLOT_LABEL[slot]);
    $('pickBack').onclick = () => { picking = false; preview = null; audio.play('ui_back', { ui: true, vol: 0.6 }); renderSmith(); };
    const view = !preview ? lo : preview.k === 'bp' ? { ...lo, ...bpLoadout(preview.v) }
      : { ...lo, [preview.k]: preview.v, ...(preview.k === 'body' ? { charger: null } : {}) };
    if (preview) $('equipBar').insertAdjacentHTML('beforeend', `<p class="peek-note">${t('peekNote')}</p>`);
    renderPicker(lo, C);
    if (picking) {
      // NOVO nos itens da lista aberta; depois de vistos, saem
      const pre = 'arsenal|' + cat + '|' + slot + '|';
      $('picker').querySelectorAll('[data-id],[data-camo],[data-bp],[data-am],[data-tr]').forEach(b => {
        const id = b.dataset.id ?? b.dataset.camo ?? b.dataset.bp ?? b.dataset.am ?? b.dataset.tr;
        if (id && isNew(pre + id)) b.insertAdjacentHTML('beforeend', newPill(t('chNew')));
      });
      markSeen(pre);
    }
    renderStats(view);
    o.onSmith(buildGun(cat, view));
  }

  // ---------- skills passivas: 2 medalhoes + cartas ----------
  let skTarget = 0; // slot que a proxima skill tocada vai ocupar
  const skIcon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[SKILLS[id].icon] || ''}</svg>`;
  function renderSkills() {
    const lv = progressInfo(), open = (id) => lv.unlockAll || lv.unlockLevel >= SKILLS[id].lvl;
    const eq = (S.skills || []).filter(id => SKILLS[id] && open(id)).slice(0, SKILL_SLOTS);
    while (eq.length < SKILL_SLOTS) eq.push(null);
    if (skTarget >= SKILL_SLOTS) skTarget = 0;
    const medal = (id, i) => `<button class="sk-medal ${id ? 'set' : 'free'} ${i === skTarget ? 'target' : ''}" data-slot="${i}" aria-pressed="${i === skTarget}">
      <span class="sk-ring">${id ? skIcon(id) : '<i>+</i>'}</span><small>${t('skSlot', { n: i + 1 })}</small><b>${id ? t('sk_' + id) : t('skFree')}</b></button>`;
    const card = (id) => {
      const k = eq.indexOf(id), ok = open(id);
      return `<button class="sk-card ${k >= 0 ? 'on' : ''} ${ok ? '' : 'locked'}" data-sk="${id}" ${ok ? '' : 'aria-disabled="true"'} ${k >= 0 ? `title="${t('skOff')}"` : ''}>
        <span class="sk-ico">${skIcon(id)}</span>${ok ? '' : `<span class="sk-lock"><svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS.lock}</svg></span>`}${k >= 0 ? `<em class="sk-n">${k + 1}</em>` : ''}
        <b>${t('sk_' + id)}</b><small>${ok ? t('skd_' + id) : t('skLvl', { n: SKILLS[id].lvl })}</small></button>`;
    };
    // equipamento de campo: um so, escolhido nas cartas de baixo (mesmo visual, trava por nivel)
    const fOpen = (id) => lv.unlockAll || lv.unlockLevel >= FIELD[id].lvl, fCur = FIELD[S.field] && fOpen(S.field) ? S.field : null;
    const fIcon = (id) => `<svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[FIELD[id].icon] || ''}</svg>`;
    const fcard = (id) => { const ok = fOpen(id), on = fCur === id;
      return `<button class="sk-card fd ${on ? 'on' : ''} ${ok ? '' : 'locked'}" data-fd="${id}" ${ok ? '' : 'aria-disabled="true"'} ${on ? `title="${t('skOff')}"` : ''}><span class="sk-ico">${fIcon(id)}</span>${ok ? '' : `<span class="sk-lock"><svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS.lock}</svg></span>`}<b>${t('fd_' + id)}</b><small>${ok ? t('fdd_' + id) + ' ' + t('fdCd', { n: FIELD[id].need }) : t('skLvl', { n: FIELD[id].lvl })}</small></button>`; };
    $('skillPane').innerHTML = `<div class="sk-medals">${eq.map(medal).join('')}</div><div class="sk-grid">${Object.keys(SKILLS).map(card).join('')}</div>` +
      `<div class="sk-field"><h3>${t('skField')}</h3><p class="sk-hint">${t('skFieldHint')}</p><div class="sk-grid">${FIELD_IDS.map(fcard).join('')}</div></div>`;
    $('skillPane').querySelectorAll('[data-fd]').forEach(b => b.onclick = () => {
      if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.5 }); return; }
      const id = b.dataset.fd; S.field = fCur === id ? null : id; o.saveSettings();
      audio.play(S.field ? 'unlock' : 'ui_back', { ui: true, vol: 0.5 }); renderSkills();
    });
    const save = (list) => { S.skills = list.filter(Boolean); o.saveSettings(); };
    $('skillPane').querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { skTarget = +b.dataset.slot; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSkills(); });
    $('skillPane').querySelectorAll('[data-sk]').forEach(b => b.onclick = () => {
      if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.5 }); return; }
      const id = b.dataset.sk, k = eq.indexOf(id);
      if (k >= 0) { eq[k] = null; skTarget = k; audio.play('ui_back', { ui: true, vol: 0.6 }); } // tocou na equipada: tira
      else {
        eq[skTarget] = id; audio.play('unlock', { ui: true, vol: 0.5 });
        const free = eq.indexOf(null); skTarget = free >= 0 ? free : (skTarget + 1) % SKILL_SLOTS; // proximo toque vai pro outro slot
      }
      save(eq); renderSkills();
    });
  }

  // cada modelo guarda a propria montagem (pecas, camo, cores, bala, tracado, reticula): trocar de corpo salva a
  // do modelo atual e traz a do novo; modelo nunca montado comeca limpo (antes herdava tudo, ate a camo da variante)
  const PER_BODY = ['scope', 'charger', 'handle', 'laser', 'ammo', 'tracer', 'camo', 'paint', 'accent', 'ret', 'retColor', 'bp'];
  function stashBody(lo) {
    if (!lo.body) return;
    lo.saved ||= {};
    lo.saved[lo.body] = Object.fromEntries(PER_BODY.filter(k => lo[k] != null).map(k => [k, lo[k]]));
  }
  function swapBody(lo, v) {
    stashBody(lo);
    for (const k of PER_BODY) delete lo[k];
    lo.body = v;
    Object.assign(lo, lo.saved?.[v] || {});
  }
  function setPart(k, v) {
    preview = null;
    const lo = loadouts[cat];
    if (k === 'body' && v !== lo.body) swapBody(lo, v);
    lo[k] = v;
    // mexeu numa peca na mao: deixa de ser a variante (camo, cor e tracado podem trocar sem perder)
    if (['body', 'scope', 'charger', 'handle', 'laser'].includes(k)) delete lo.bp;
    if (k === 'body' && cat === 'sniper' && !lo.scope) lo.scope = nativePart(v, 'scope');
    saveLoadouts(loadouts);
    o.loadoutsChanged(loadouts);
    audio.play('swap', { vol: 0.5 });
    renderSmith();
  }

  // variante de elite: aplica a montagem inteira (pecas + camo lendaria) de uma vez
  function setVariant(id) {
    preview = null;
    const lo = loadouts[cat];
    if (id) { const B = bpLoadout(id); if (B.body !== lo.body) swapBody(lo, B.body); Object.assign(lo, B); } // a montagem do modelo atual fica guardada
    else delete lo.bp;
    saveLoadouts(loadouts);
    o.loadoutsChanged(loadouts);
    audio.play(id ? 'unlock' : 'swap', { vol: 0.5, ui: true });
    renderSmith();
  }

  function renderPicker(lo, C) {
    const p = $('picker');
    p.innerHTML = ''; // se algo quebrar daqui pra baixo, nunca sobra a lista do slot anterior (botao velho gravava no slot errado)
    if (slot === 'bp') {
      const MOD_TXT = { dmg: 'st_dmg', rate: 'st_rate', spread: 'st_acc', hip: 'st_hip', kick: 'st_ctrl', adsTime: 'st_ads', reload: 'st_reload', move: 'st_move', mag: 'st_mag' };
      // "bom" quando o numero sobe (dano, passo, pente) ou desce (o resto: cadencia lenta, recuo, abertura...)
      const good = (k, v) => (k === 'dmg' || k === 'move' || k === 'mag') ? v > 1 : v < 1;
      const el = eliteToday();
      p.innerHTML = `<button class="opt bp-free ${!lo.bp ? 'on' : ''}" data-bp="">${t('bpNone')}<small>${t('bpNoneSub')}</small></button>` + BP_ORDER.filter(id => BLUEPRINTS[id].wpn === cat).map(id => {
        const B = BLUEPRINTS[id], open = bpUnlocked(id), cur = lo.bp === id;
        const mods = Object.entries(B.mods).map(([k, v]) => `<b class="${good(k, v) ? 'up' : 'down'}">${good(k, v) ? '+' : '−'} ${t(MOD_TXT[k])}</b>`).join('');
        const lock = open ? '' : `<small class="req-ch">${el.reward === id && !el.done ? t('bpToday', { c: t('el_' + el.id, { n: el.n }) }) : t('bpLocked')}</small>${el.reward === id ? `<span class="ubar"><i style="width:${Math.round(el.prog / el.n * 100)}%"></i></span>` : ''}`;
        return `<button class="opt bp ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'bp' && preview.v === id ? 'peek' : ''}" data-bp="${id}" ${open ? '' : 'aria-disabled="true"'}><i class="cswatch anim" style="background:${CAMO_SWATCH[B.lo.camo]}"></i><span class="bp-name">${t(id)}</span><small>${t('bpSub', { c: t('camo_' + B.lo.camo) })}</small><span class="fx">${mods}</span>${lock}</button>`;
      }).join('');
      p.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => {
        if (b.classList.contains('locked')) { peek('bp', b.dataset.bp); return; }
        setVariant(b.dataset.bp || null);
      });
      return;
    }
    if (slot === 'camo') {
      // grupos: estaticas, animadas, reativas (cada um com titulo ocupando a linha)
      const grp = (c) => c.legend || c.meta ? 'legend' : c.react ? 'react' : c.anim ? 'anim' : 'static';
      let last = null;
      p.innerHTML = CAMOS.map(c => {
        const g = grp(c), head = g !== last ? `<p class="pk-h">${t('cg_' + g)}</p>` : '';
        last = g;
        return head + camoOpt(c);
      }).join('');
      function camoOpt(c) {
        const open = camoUnlocked(cat, c), cur = (lo.camo || 'none') === c.id;
        const lockC = !open && LOCKED_BY[c.id];
        // camo sem req (prestigio): sem esse caso o c.req.player quebrava a lista inteira (ficava a lista anterior na tela)
        const req = c.rank != null && !open ? t('rkLock', { t: t('rk_' + TIERS[c.rank].id) }) : c.elite && !open ? t('eliteOnly') : c.meta && !open ? t('metaOnly') : c.legend && !open ? t('bpLocked') : c.prestige && !open ? t('prestOnly') : !c.req && !open ? t('bpLocked') : lockC ? (unlockActive(lockC.id) ? `${t('reqCh')}: ${chName(lockC)}` : t('reqQueue')) : !open ? (c.req.player && c.req.wpn ? t('reqBoth', { p: c.req.player, w: c.req.wpn }) : c.req.player ? t('reqPlayer', { n: c.req.player }) : t('reqWpn', { n: c.req.wpn })) : (c.anim ? t('animated') : '');
        const bar = open || c.legend || c.meta || c.elite || c.rank != null || (!c.req && !lockC) ? '' : `<span class="ubar"><i style="width:${Math.round((lockC ? unlockProg(lockC.id) : reqProgress(cat, c.req)) * 100)}%"></i></span>`;
        return `<button class="opt camo ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'camo' && preview.v === c.id ? 'peek' : ''}" data-camo="${c.id}" ${open ? '' : 'aria-disabled="true"'}><i class="cswatch ${c.anim ? 'anim' : ''}" style="background:${CAMO_SWATCH[c.id]}"></i>${t('camo_' + c.id)}<small>${req}</small>${bar}</button>`;
      }
      p.querySelectorAll('[data-camo]').forEach(b => b.onclick = () => {
        if (b.classList.contains('locked')) { peek('camo', b.dataset.camo === 'none' ? null : b.dataset.camo); return; }
        setPart('camo', b.dataset.camo === 'none' ? null : b.dataset.camo);
      });
      return;
    }
    if (slot === 'ammo') {
      // balas: ganho e perda de cada uma (status em verde/vermelho como nas variantes); trancadas mostram o desafio
      const UP = { fire: 'am_up_burn', trace: 'am_up_mark', boom: 'am_up_splash', ap: 'am_up_pierce', slug: 'am_up_slug' };
      const MOD_TXT = { dmg: 'st_dmg', rate: 'st_rate', kick: 'st_ctrl', mag: 'st_mag' };
      const good = (k, v) => (k === 'dmg' || k === 'mag') ? v > 1 : v < 1;
      p.innerHTML = [null, ...AMMO_IDS.filter(id => !AMMO[id].only || AMMO[id].only === cat)].map(id => { // balote so aparece na escopeta
        const A = id ? AMMO[id] : null, lk = id && LOCKED_BY['am:' + id], open = !id || partUnlocked(cat, 1, 'am:' + id), cur = (lo.ammo || null) === id;
        const mods = !A ? '' : `<b class="up">+ ${t(UP[id])}</b>` + Object.entries(A).filter(([k]) => MOD_TXT[k]).map(([k, v]) => `<b class="${good(k, v) ? 'up' : 'down'}">${good(k, v) ? '+' : '−'} ${t(MOD_TXT[k])}</b>`).join('');
        const lock = open || !lk ? '' : `<small class="req-ch">${unlockActive(lk.id) ? t('reqCh') + ': ' + chName(lk) : t('reqQueue')}</small><span class="ubar"><i style="width:${Math.round(unlockProg(lk.id) * 100)}%"></i></span>`;
        return `<button class="opt am ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'ammo' && preview.v === id ? 'peek' : ''}" data-am="${id || ''}" ${open ? '' : 'aria-disabled="true"'}><svg class="am-ico" viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[A?.icon || 'radio_button_unchecked']}</svg><span class="bp-name">${t('am_' + (id || 'none'))}</span><small>${t('amd_' + (id || 'none'))}</small><span class="fx">${mods}</span>${lock}</button>`;
      }).join('');
      p.querySelectorAll('[data-am]').forEach(b => b.onclick = () => { const v = b.dataset.am || null; if (b.classList.contains('locked')) { peek('ammo', v); return; } setPart('ammo', v); });
      return;
    }
    if (slot === 'tracer') {
      // tracados: os de desafio ficam trancados mostrando o desafio
      p.innerHTML = TRACER_STYLES.map(id => {
        const lk = LOCKED_BY['tr:' + id], open = partUnlocked(cat, 1, 'tr:' + id), cur = (lo.tracer || 'chalk') === id;
        return `<button class="opt ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'tracer' && preview.v === id ? 'peek' : ''}" data-tr="${id}" ${open ? '' : 'aria-disabled="true"'}><i class="trsw tr-${id}"></i>${t('tr_' + id)}${open || !lk ? '' : `<small class="req-ch">${unlockActive(lk.id) ? t('reqCh') + ': ' + chName(lk) : t('reqQueue')}</small><span class="ubar"><i style="width:${Math.round(unlockProg(lk.id) * 100)}%"></i></span>`}</button>`;
      }).join('');
      p.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek('tracer', b.dataset.tr === 'chalk' ? null : b.dataset.tr); return; } setPart('tracer', b.dataset.tr === 'chalk' ? null : b.dataset.tr); });
      return;
    }
    if (slot === 'ret') {
      p.innerHTML = ['auto', ...RETICLES].map(r => `<button class="opt ${(lo.ret || 'auto') === r ? 'on' : ''}" data-r="${r}">${retIcon(r)}<br>${t('ret_' + r)}</button>`).join('') +
        Object.entries(RET_COLORS).map(([k, c]) => `<button class="swatch ${(lo.retColor || 'red') === k ? 'on' : ''}" style="background:${c}" data-col="${k}" aria-label="${t('retColor')} ${k}"></button>`).join('');
      p.querySelectorAll('[data-r]').forEach(b => b.onclick = () => setPart('ret', b.dataset.r === 'auto' ? null : b.dataset.r));
      p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => setPart('retColor', b.dataset.col));
      return;
    }
    if (slot === 'paint' || slot === 'accent') {
      const cur = lo[slot];
      p.innerHTML = `<button class="swatch none ${!cur ? 'on' : ''}" data-c="">${t('original')}</button>` +
        PAINTS.map(c => `<button class="swatch ${cur === c ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="Cor ${c}"></button>`).join('') +
        `<label class="swatch none" title="Cor livre" style="display:grid;place-items:center">${t('free')}<input type="color" value="${cur || '#5f8f3a'}"></label>`;
      p.querySelectorAll('button.swatch').forEach(b => b.onclick = () => setPart(slot, b.dataset.c || null));
      p.querySelector('input[type=color]').onchange = (e) => setPart(slot, e.target.value);
      return;
    }
    let opts;
    if (slot === 'body') opts = C.bodies;
    else if (slot === 'scope') opts = [null, ...C.scopes];
    else if (slot === 'charger') opts = chargerOptions(lo.body, cat);
    else if (slot === 'laser') opts = [null, ...LASERS];
    else opts = [null, ...C.handles];
    const cur = slot === 'charger' ? (lo.charger || nativePart(lo.body, 'charger')) : lo[slot];
    p.innerHTML = opts.map((id, i) => {
      if (slot === 'scope' && !scopeFits(lo.body, cat, id)) return ''; // mira que nao cabe (sniper: so luneta)
      const open = partUnlocked(cat, i, id) || (slot === 'scope' && !!id && id === freeScope(cat, lo.body));
      const lockCh = !open && id && LOCKED_BY[id];
      // pros e contras da peca (estilo COD), so em pente e empunhadura
      const fx = (slot === 'charger' || slot === 'handle' || slot === 'laser') && id ? partEffects(cat, lo, slot, id) : [];
      const fxHtml = fx.length ? `<span class="fx">${fx.slice(0, 4).map(([k, v]) => `<b class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'} ${t(k)}</b>`).join('')}</span>` : '';
      const pill = slot === 'body' ? modePill(id) + (open ? `<small class="blv">${t('lvlShort', { n: wpnLevel(cat, id) })}</small>` : '') : '';
      return `<button class="opt ${id === cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === slot && preview.v === id ? 'peek' : ''}" data-id="${id ?? ''}" ${open ? '' : 'aria-disabled="true"'}>${partName(slot, id)}${pill}${slot === 'charger' && id === nativePart(lo.body, 'charger') ? `<br><small>${t('origTag')}</small>` : ''}${fxHtml}${open ? '' : lockCh ? `<small class="req-ch">${unlockActive(lockCh.id) ? t('reqCh') + ': ' + chName(lockCh) : t('reqQueue')}</small><span class="ubar"><i style="width:${Math.round(unlockProg(lockCh.id) * 100)}%"></i></span>` : `<small>${t('reqWpn', { n: partReq(i) })}</small><span class="ubar"><i style="width:${Math.round(reqProgress(cat, { wpn: partReq(i) }) * 100)}%"></i></span>`}</button>`;
    }).join('');
    p.querySelectorAll('.opt').forEach(b => {
      b.onclick = () => { if (b.classList.contains('locked')) { peek(slot, b.dataset.id || null); return; } setPart(slot, b.dataset.id || null); };
      b.onpointerenter = () => audio.play('ui_hover', { ui: true, vol: 0.3, key: 'hover', max: 1 });
    });
  }

  // pill do modo de tiro do modelo (automatica / rajada N / semi)
  function modePill(body) {
    const bt = bodyTrait(body), m = bt.mode || (WEAPONS[cat]?.auto ? 'auto' : 'semi');
    return `<span class="fm fm-${m}">${t('fm_' + m, { n: bt.burst || 3 })}</span>`;
  }

  function renderStats(lo) {
    const W = WEAPONS[cat];
    const st = loadoutStats(cat, lo), base = loadoutStats(cat, defaultLoadout(cat));
    const rows = [
      [t('st_dmg'), W.dmg * (W.pellets || 1) * st.dmg, W.dmg * (W.pellets || 1) * base.dmg, 130],
      [t('st_rate'), 1 / (W.rate * st.rate), 1 / (W.rate * base.rate), 16],
      [t('st_acc'), 1 / (W.spread * st.spread + 0.004), 1 / (W.spread * base.spread + 0.004), 70],
      [t('st_hip'), 1 / (W.spread * st.spread * st.hip + 0.004), 1 / (W.spread * base.spread * base.hip + 0.004), 70],
      [t('st_ctrl'), 1 / (W.kick * st.kick), 1 / (W.kick * base.kick), 60],
      [t('st_ads'), 1 / st.adsTime, 1 / base.adsTime, 1.2],
      [t('st_reload'), 1 / (W.reload * st.reload), 1 / (W.reload * base.reload), 1.2],
      [t('st_move'), st.move, base.move, 1.1],
      [t('st_mag'), Math.round(W.mag * st.mag), Math.round(W.mag * base.mag), 48],
      [t('st_zoom'), st.zoom || W.zoom, base.zoom || W.zoom, 7],
    ];
    $('statBars').innerHTML = `<div class="fmrow">${modePill(lo.body)}</div>` + rows.map(([n, v, b, max]) => {
      const pct = Math.min(100, v / max * 100);
      const d = v - b, rel = b ? d / b : 0;
      const cls = Math.abs(rel) < 0.01 ? '' : rel > 0 ? 'up' : 'down';
      const txt = n === t('st_mag') ? v : n === t('st_zoom') ? v.toFixed(1) + 'x' : (Math.abs(rel) < 0.01 ? '=' : (rel > 0 ? '+' : '') + Math.round(rel * 100) + '%');
      return `<div class="stat"><span>${n}</span><span class="bar"><i style="width:${pct}%"></i></span><em class="${cls}">${txt}</em></div>`;
    }).join('');
  }

  const langBtns = document.querySelectorAll('[data-lang]');
  const markLang = () => langBtns.forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === getLang()));
  langBtns.forEach(b => b.onclick = () => { setLang(b.dataset.lang); S.lang = b.dataset.lang; buildSettings(); refresh(); ui.relang(); audio.play('ui_click', { ui: true }); });
  markLang();
  const drawLevel = () => {
    const pi = progressInfo();
    let el = document.getElementById('lvlBadge');
    if (!el) { el = document.createElement('div'); el.id = 'lvlBadge'; el.className = 'lvl-badge'; document.querySelector('.poster-frame').appendChild(el); }
    // estrelas de prestigio do lado do numero; no nivel maximo, o botao de prestigio (pede confirmacao)
    const stars = pi.prestige ? `<em class="prest" title="${t('prestN', { n: pi.prestige })}">★${pi.prestige > 1 ? pi.prestige : ''}</em>` : '';
    // nome do jogador em cima do nivel; o bloco todo abre o Perfil
    el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', t('profile'));
    el.onclick = (e) => { if (e.target.closest('#prestGo')) return; audio.play('ui_click', { ui: true }); ui.go('profile'); };
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ui.go('profile'); } };
    el.innerHTML = `<b>${pi.level}</b>${stars}<span><span class="lv-top"><strong class="lv-name">${esc(myName())}</strong><small>${t('playerLevel')}</small></span><span class="xpbar"><i style="width:${pi.max ? 100 : Math.round(pi.into / pi.need * 100)}%"></i></span><small>${pi.max ? t('maxed') : pi.into + ' / ' + pi.need + ' XP'}</small></span>` +
      (pi.canPrestige ? `<button class="prest-go" id="prestGo">${t('prestGo')}</button>` : '');
    const go = document.getElementById('prestGo');
    if (go) go.onclick = () => {
      if (go.dataset.sure !== '1') { go.dataset.sure = '1'; go.textContent = t('prestSure'); audio.play('ui_click', { ui: true }); return; }
      if (doPrestige()) {
        const n = progressInfo().prestige;
        audio.play('prestige', { ui: true, vol: 0.8 });
        // carimbo no cartaz: estrela nova (e a camo exclusiva no 1o prestigio)
        const st = document.createElement('div'); st.className = 'prest-stamp';
        st.innerHTML = `<b>${t('prestStamp', { n })}</b>${n === 1 ? `<small>${t('prestCamo')}</small>` : ''}`;
        document.querySelector('.poster-frame').appendChild(st); setTimeout(() => st.remove(), 4200);
      }
    };
  };
  drawLevel();
  // ---------- perfil ----------
  function myName() { return rovex.me?.name || S.name || (rovex.isGuest() ? rovex.guestName() : t('youCap')); }
  function renderProfile() {
    const pi = progressInfo(), st = pStats(), rk = myTier(), us = unlockState();
    const kd = (st.kills / Math.max(1, st.deaths || 0)).toFixed(2), fav = st.fav ? partName('body', st.fav) : '-';
    const acct = rovex.me ? (rovex.STANDALONE ? t('pfAccount') : t('pfRovexIn')) : t('pfGuest');
    const n = (v) => Number(v || 0).toLocaleString();
    const cell = (k, v, big) => `<li class="${big ? 'big' : ''}"><b>${v}</b><small>${t(k)}</small></li>`;
    $('pfBody').innerHTML = `<div class="pf-head"><span class="pf-lvl">${pi.level}${pi.prestige ? `<em>★${pi.prestige > 1 ? pi.prestige : ''}</em>` : ''}</span><div class="pf-id"><h3>${esc(myName())}</h3><small>${esc(acct)}</small>`
      + `<span class="xpbar"><i style="width:${pi.max ? 100 : Math.round(pi.into / pi.need * 100)}%"></i></span><small>${pi.max ? t('maxed') : n(pi.into) + ' / ' + n(pi.need) + ' XP'}</small></div>`
      + `<span class="pf-rk">${rk >= 0 ? badgeSvg(rk, 40) + `<small>${t('rk_' + TIERS[rk].id)} · ${n(st.rp)} RP</small>` : `<small>${t('pf_rankNone')}</small>`}</span></div>`
      + `<ul class="pf-grid">` + cell('pf_kills', n(st.kills), 1) + cell('pf_deaths', n(st.deaths)) + cell('pf_kd', kd, 1) + cell('pf_matches', n(st.matches)) + cell('pf_wins', n(st.win))
      + cell('pf_head', n(st.head)) + cell('pf_assist', n(st.assist)) + cell('pf_streak', n(st.streak)) + cell('pf_best', n(st.bestStreak)) + cell('pf_plafts', n(st.plafts), 1)
      + cell('pf_fav', esc(fav)) + cell('pf_ch', `${us.done}/${us.total}`) + cell('pf_xp', n(pi.xp)) + (st.meta ? cell('pf_meta', '★') : '') + `</ul>`
      + `<div class="pf-acts">${rovex.STANDALONE ? `<button class="big" id="pfSwitch">${t(rovex.me ? 'pfSwitch' : 'pfLogin')}</button>` : `<a class="big" id="pfManage" href="https://tryrovex.com/" target="_top" rel="noopener">${t('pfManage')}</a>`}</div>`;
    const sw = $('pfSwitch');
    // sair/trocar: apaga a sessao do jogo e vai pro login da Rovex, que devolve pro jogo ja logado
    if (sw) sw.onclick = () => { audio.play('ui_click', { ui: true }); if (rovex.me) rovex.logout(); location.href = rovex.AUTH_URL; };
  }
  onProgress(() => { drawLevel(); if (ui.screen === 'arsenal') renderSmith(); });
  ui.relang = () => {
    drawLevel();
    refreshFriendRooms(); markNewChallenges();
    if (ui.screen === 'controls') renderKeys();
    markLang();
    if (ui.screen === 'arsenal') renderSmith();
  };
  return ui;
}

// desenho pequeno de cada reticula pra lista do arsenal
function retIcon(r) {
  const c = '#d8453a', k = 'stroke="currentColor" stroke-width="2" fill="none"';
  const body = {
    auto: `<circle cx="12" cy="12" r="8" ${k} stroke-dasharray="3 3"/>`,
    dot: `<circle cx="12" cy="12" r="2.6" fill="${c}"/>`,
    cross: `<path d="M12 4v5M12 15v5M4 12h5M15 12h5" stroke="${c}" stroke-width="2"/>`,
    circle: `<circle cx="12" cy="12" r="7" stroke="${c}" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="1.6" fill="${c}"/>`,
    chevron: `<path d="M6 15l6-6 6 6" stroke="${c}" stroke-width="2.4" fill="none"/>`,
    tee: `<path d="M5 10h14M12 10v8" stroke="${c}" stroke-width="2"/>`,
    duplex: `<path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6" stroke="currentColor" stroke-width="3"/>`,
    mildot: `<path d="M12 2v20M2 12h20" stroke="currentColor" stroke-width="1"/>${[5, 8, 16, 19].map(v => `<circle cx="${v}" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="${v}" r="1.3" fill="currentColor"/>`).join('')}`,
  }[r];
  return `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">${body}</svg>`;
}
