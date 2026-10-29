// Menus: inicio, modos, multiplayer, arsenal (gunsmith), ajustes.
import { MODES, WEAPONS, PRIMARIES, BLUEPRINTS, bodyTrait } from '../shared/weapons.js';
import { dailyToday, unlockState, msToReset, LOCKED_BY, unlockProg, unlockActive, eliteToday, BP_ORDER } from './challenges.js';
import { TRACER_STYLES } from './world.js';
import { audio } from './audio.js';
import * as rovex from './rovex.js';
import { isTouch } from './input.js';
import { CAMOS, CAMO_SWATCH } from './camos.js';
import { DEBUG, progressInfo, wpnInfo, partReq, partUnlocked, camoUnlocked, setUnlockAll, onProgress, reqProgress, bpUnlocked } from './progress.js';
import { MAP_IDS } from '../shared/map.js';
import { t, wName, modeName, modeDesc, getLang, setLang } from './i18n.js';
import { CATEGORY, LASERS, RETICLES, RET_COLORS, unlockedLoadout, chargerOptions, partEffects, partName, buildGun, getLoadouts, saveLoadouts, loadoutStats, defaultLoadout, nativePart, arsenalReady, bpLoadout } from './arsenal.js';

const $ = (id) => document.getElementById(id);
// mira (crosshair): formatos e cores; o mesmo desenho vale pra previa dos ajustes e pra partida
export const XHAIRS = ['cross', 'crossdot', 'dot', 'circle', 'tee'];
export const XH_COLORS = ['#ece9e1', '#3cff6b', '#ffd23a', '#3ce8ff', '#ff4a3a', '#ff6bd5'];
const XH_CROSS = '<i></i><i></i><i></i><i></i><b class="xd"></b><u class="xr"></u>';
export function applyCrosshair(el, S) {
  if (!el) return;
  el.className = 'cross x-' + (XHAIRS.includes(S.xhair) ? S.xhair : 'cross');
  el.style.setProperty('--xc', S.xhairColor || XH_COLORS[0]);
}
const PAINTS = ['#a83a2c', '#d9822b', '#e3c14a', '#5f8f3a', '#2f6b5a', '#2f5b8a', '#5b3f8a', '#c45b8f', '#ece9e1', '#6e6a63', '#2a2724'];

export function initMenus(o) {
  const ui = { screen: 'home' };
  const screens = ['home', 'solo', 'mp', 'arsenal', 'settings', 'controls', 'challenges'];
  let settingsFromGame = false;

  ui.go = (name, fromGame = false) => {
    settingsFromGame = fromGame;
    for (const s of screens) $('scr-' + s).hidden = s !== name;
    ui.screen = name;
    $('menu').classList.toggle('smithing', name === 'arsenal');
    $('menu').classList.toggle('home', name === 'home');
    if (name === 'arsenal') { picking = false; renderSmith(); }
    if (name === 'mp') ui.refreshRooms && ui.refreshRooms();
    if (name === 'challenges') { renderChallenges(); markChallengesSeen(); }
    if (name === 'controls') renderKeys();
    if (name === 'home') markNewChallenges();
    const first = $('scr-' + name).querySelector('button, input');
    first && first.focus({ preventScroll: true });
  };

  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => {
      audio.init();
      const to = b.dataset.go;
      audio.play(to === 'home' ? 'ui_back' : 'ui_click', { ui: true });
      if (to === 'home' && settingsFromGame && o.inGame()) { o.onBackFromSettingsInGame(); settingsFromGame = false; return; }
      ui.go(to);
    });
    b.addEventListener('pointerenter', () => audio.play('ui_hover', { ui: true, vol: 0.35, key: 'hover', max: 1 }));
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !o.inGame() && ui.screen !== 'home') { audio.play('ui_back', { ui: true }); ui.go('home'); }
    if (e.key === 'Escape' && settingsFromGame && o.inGame() && ui.screen === 'settings') { o.onBackFromSettingsInGame(); settingsFromGame = false; }
  });

  // ---------- modos ----------
  const modeKeys = Object.keys(MODES);
  function modeList(el, initial, onPick, withDesc) {
    let cur = initial;
    el.innerHTML = modeKeys.map(k => `<button class="mode" role="radio" data-m="${k}" aria-checked="${k === cur}"><b>${modeName(k)}</b><small>${MODES[k].teams ? t('teams') : t('solo')}</small></button>`).join('');
    el.querySelectorAll('.mode').forEach(b => b.onclick = () => {
      cur = b.dataset.m;
      el.querySelectorAll('.mode').forEach(x => x.setAttribute('aria-checked', x === b));
      audio.play('ui_click', { ui: true, vol: 0.6 });
      onPick(cur);
      if (withDesc) $('modeDesc').textContent = modeDesc(cur);
    });
    if (withDesc) $('modeDesc').textContent = modeDesc(cur);
    return () => cur;
  }
  let curSolo = modeList($('modeList'), 'ffa', () => {}, true);
  let curMp = modeList($('mpModeList'), 'tdm', () => {}, false);
  const soloMode = () => curSolo(), mpMode = () => curMp();
  // escolha de mapa (automatico = o mapa que combina com o modo)
  const mapSeg = (el) => {
    let cur = 'auto';
    const draw = () => {
      el.innerHTML = ['auto', ...MAP_IDS].map(m => `<button data-v="${m}" class="${m === cur ? 'on' : ''}">${t('map_' + m)}</button>`).join('');
      el.querySelectorAll('button').forEach(b => b.onclick = () => { cur = b.dataset.v; audio.play('ui_click', { ui: true, vol: 0.6 }); draw(); });
    };
    draw();
    return { get: () => cur, set: (v) => { cur = v; draw(); }, draw };
  };
  const soloMap = mapSeg($('mapSel')), mpMap = mapSeg($('mpMapSel'));
  // ---------- multiplayer: entrar por codigo ou criar sala (servidor na Fly) ----------
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  const cleanCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const mpName = () => rovex.me?.name || $('mpName').value.trim() || 'Inkblot';
  ui.refreshRooms = () => {
    $('mpWho').textContent = rovex.me ? t('playingAs', { n: rovex.me.name }) : t('guestHint');
    $('mpNameField').hidden = !!rovex.me;
  };
  async function goMp(args) {
    $('mpErr').textContent = '';
    $('playMp').disabled = $('joinCode').disabled = true;
    const name = mpName();
    if (!rovex.me) { o.settings.name = name; o.saveSettings(); }
    try { await o.onMp({ url: rovex.MP_URL, name, ...args }); }
    catch (e) { $('mpErr').textContent = e.code === 'noroom' ? t('noRoom', { c: args.room }) : e.code === 'full' ? t('roomFull', { c: args.room }) : e.code === 'busy' ? t('mpBusy') : t('mpDown'); }
    $('playMp').disabled = $('joinCode').disabled = false;
  }
  $('mpRoom').oninput = () => { const c = cleanCode($('mpRoom').value); if (c !== $('mpRoom').value) $('mpRoom').value = c; };
  $('mpJoin').onsubmit = (e) => {
    e.preventDefault();
    const room = cleanCode($('mpRoom').value);
    if (!room) { $('mpErr').textContent = t('codeEmpty'); $('mpRoom').focus(); return; }
    audio.play('ui_click', { ui: true });
    goMp({ room, join: true });
  };
  $('bots').oninput = () => { $('botsVal').textContent = $('bots').value; };
  $('mpBots').oninput = () => { $('mpBotsVal').textContent = $('mpBots').value; };
  let diff = 1;
  $('diff').querySelectorAll('button').forEach(b => b.onclick = () => {
    diff = Number(b.dataset.v);
    $('diff').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    audio.play('ui_click', { ui: true, vol: 0.6 });
  });
  $('playSolo').onclick = async () => {
    audio.play('ui_click', { ui: true });
    o.onSolo({ mode: soloMode(), map: soloMap.get(), bots: Number($('bots').value), difficulty: diff });
  };
  $('mpName').value = o.settings.name || '';
  $('playMp').onclick = () => {
    audio.play('ui_click', { ui: true });
    goMp({ room: newCode(), mode: mpMode(), map: mpMap.get(), bots: Number($('mpBots').value) });
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
    ['toggle', 'invertY', 's_invert'],
    ['toggle', 'holdCrouch', 's_hold'],
    ['toggle', 'autoSprint', 's_auto'],
    ['toggle', 'showFps', 's_fps'],
    ['toggle', 'threatRing', 's_threat'],
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
  const SLOTS = ['bp', 'body', 'scope', 'ret', 'charger', 'handle', 'laser', 'tracer', 'camo', 'paint', 'accent'];
  const SLOT_LABEL = { bp: 'slot_bp', body: 'slot_body', scope: 'slot_scope', ret: 'slot_ret', charger: 'slot_charger', handle: 'slot_handle', laser: 'slot_laser', tracer: 'slot_tracer', camo: 'slot_camo', paint: 'slot_paint', accent: 'slot_accent' };

  // desafios: diarios (3) e carreira (Bronze/Prata/Ouro)
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
    $('chCareer').innerHTML = us.active.map(u => row(chName(u) + nw('u:' + u.id), u.prog, u.n, u.xp, false, `<small class="ch-reward">${t('chReward')}: ${rewardName(u.reward)}</small>`)).join('')
      + `<li class="ch-queue">${us.queued ? t('chQueue', { n: us.queued, d: us.done, t: us.total }) : us.done >= us.total ? t('chAllDone') : ''}</li>`;
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
      ['key_wheel', 'k_swap'], ['Q', 'k_last'], ['V', 'k_melee'], ['G', 'k_frag'], ['F', 'k_flash'], ['X', 'k_streak'], ['I', 'k_inspect'], ['E', 'k_use'], ['M', 'k_spec'], ['Tab', 'k_board'], ['Esc', 'k_pause']],
    pad: [['L', 'k_move'], ['R', 'k_look'], ['L3', 'k_sprint'], ['A / ✕', 'k_jump'], ['B / ○', 'k_crouch'], ['RT / R2', 'k_fire'], ['LT / L2', 'k_ads'], ['X / □', 'k_reload'],
      ['Y / △', 'k_swap'], ['R3', 'k_melee'], ['LB / L1', 'k_frag'], ['RB / R1', 'k_flash'], ['▲', 'k_streak'], ['▼', 'k_inspect'], ['X / □ (segurar)', 'k_use'], ['Select', 'k_board'], ['Start', 'k_pause'],
      ['▲ ▼ ◀ ▶', 'k_menu'], ['A / ✕', 'k_confirm'], ['B / ○', 'k_back']],
    touch: [['t_stick', 'k_move'], ['t_drag', 'k_look'], ['t_auto', 'k_fire']],
  };
  function renderKeys() {
    document.querySelectorAll('[data-kt]').forEach(b => b.setAttribute('aria-selected', b.dataset.kt === keyTab));
    $('keyList').innerHTML = KEYS[keyTab].map(([k, d]) => `<dt>${k.startsWith('key_') || k.startsWith('t_') ? t(k) : k}</dt><dd>${t(d)}</dd>`).join('');
  }
  document.querySelectorAll('[data-kt]').forEach(b => b.onclick = () => { keyTab = b.dataset.kt; audio.play('ui_click', { ui: true, vol: 0.6 }); renderKeys(); });

  // ---------- novidades: fechar guarda a versao; novidade nova reabre ----------
  const NEWS_V = 3;
  function renderNews() {
    let closed = 0; try { closed = Number(localStorage.getItem('rr_news')) || 0; } catch { /* */ }
    $('news').hidden = closed >= NEWS_V;
    $('newsList').innerHTML = t('news').map(([b, sp]) => `<li><b>${b}</b><span>${sp}</span></li>`).join('');
  }
  $('newsClose').onclick = () => { try { localStorage.setItem('rr_news', NEWS_V); } catch { /* */ } audio.play('ui_back', { ui: true }); $('news').hidden = true; };
  renderNews();
  markNewChallenges();

  // texto do desafio de desbloqueio e o nome do premio
  function chName(u) { return t('ch_' + u.id, { n: u.n }); }
  function rewardName(r) { if (r.slot === 'tracer') return t('s_tracer') + ' ' + t('tr_' + r.id.slice(3)); return r.slot === 'camo' ? t('camo_' + r.id) : `${partName(r.slot, r.id)} (${wName(r.wpn)})`; }

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
    $('catTabs').innerHTML = CATS.map(c => `<button role="tab" aria-selected="${c === cat}" data-c="${c}">${wName(c)}</button>`).join('');
    $('catTabs').querySelectorAll('button').forEach(b => b.onclick = () => { cat = b.dataset.c; slot = 'body'; picking = false; preview = null; audio.play('ui_click', { ui: true }); renderSmith(); });
    // equipar: principal escolhida aqui, pistola sempre como secundaria
    const isPrimary = PRIMARIES.includes(cat);
    const equipped = isPrimary ? S.primary === cat || (!S.primary && cat === 'smg') : true;
    // cabecalho da arma (estilo gunsmith): nome grande + variante, nivel, e equipar do lado
    const loNow = loadouts[cat] || {};
    const eqHtml = isPrimary
      ? (equipped ? `<p class="equipped">${t('eqDone', { w: wName(cat) })}</p>` : `<button class="big" id="equipBtn">${t('eqPrimary', { w: wName(cat) })}</button>`)
      : `<p class="equipped">${t(cat === 'melee' ? 'eqMelee' : 'eqSecondary', { w: wName(cat) })}</p>`;
    $('equipBar').innerHTML = `<div class="gs-id"><b class="gs-name">${wName(cat)}</b>${loNow.bp ? `<span class="gs-bp">★ ${t(loNow.bp)}</span>` : ''}</div>` + eqHtml;
    const eb = $('equipBtn');
    if (eb) eb.onclick = () => { S.primary = cat; o.saveSettings(); audio.play('pickup', { ui: true, vol: 0.6 }); renderSmith(); };
    // mostra o que vale de verdade: peca salva que ainda esta bloqueada aparece como padrao
    const lo = unlockedLoadout(cat, loadouts[cat], partUnlocked, camoUnlocked, CAMOS);
    const C = CATEGORY[cat];
    const wi = wpnInfo(cat);
    $('equipBar').insertAdjacentHTML('beforeend', `<div class="wlevel"><b>${t('wpnLevel', { n: wi.level })}</b><span class="xpbar"><i style="width:${wi.max ? 100 : Math.round(wi.into / wi.need * 100)}%"></i></span><small>${wi.max ? t('maxed') : wi.into + ' / ' + wi.need + ' XP'}</small></div>`);
    // so mostra o pente quando o corpo aceita mais de um
    // lamina: so modelo e camuflagem; pente so quando o corpo aceita mais de um
    const hasBp = BP_ORDER.some(id => BLUEPRINTS[id].wpn === cat);
    const slots = cat === 'melee' ? ['body', 'camo'] : SLOTS.filter(s => (s !== 'charger' || chargerOptions(lo.body, cat).length > 1) && (s !== 'bp' || hasBp));
    if (!slots.includes(slot)) slot = 'body';
    $('slotList').innerHTML = slots.map(s => {
      const disabled = (s === 'handle' && !C.handles.length) || (s === 'ret' && !lo.scope);
      let val;
      if (s === 'bp') val = lo.bp ? `<i class="cmini" style="background:${CAMO_SWATCH[BLUEPRINTS[lo.bp].lo.camo]}"></i> ${t(lo.bp)}` : t('bpNone');
      else if (s === 'camo') { const cm = CAMOS.find(c => c.id === (lo.camo || 'none')); val = `<i class="cmini" style="background:${CAMO_SWATCH[cm.id]}"></i> ${t('camo_' + cm.id)}`; }
      else if (s === 'tracer') val = `<i class="trsw tr-${lo.tracer || 'chalk'}"></i> ${t('tr_' + (lo.tracer || 'chalk'))}`;
      else if (s === 'ret') val = lo.scope ? `<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${RET_COLORS[lo.retColor || 'red']};vertical-align:-1px;border:2px solid currentColor"></i> ${t('ret_' + (lo.ret || 'auto'))}` : t('ret_none');
      else if (s === 'paint' || s === 'accent') val = lo[s] ? `<i style="display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid currentColor;background:${lo[s]};vertical-align:-2px"></i> ${lo[s]}` : t('original');
      else val = partName(s, s === 'charger' ? (lo.charger || nativePart(lo.body, 'charger')) : lo[s]);
      return `<button class="slot slot-${s} ${s === 'bp' && lo.bp ? 'set' : ''} ${disabled ? 'disabled' : ''}" data-s="${s}" ${disabled ? 'aria-disabled="true"' : ''}><small>${t(SLOT_LABEL[s])}</small><span>${val}</span></button>`;
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
    renderStats(view);
    o.onSmith(buildGun(cat, view));
  }

  function setPart(k, v) {
    preview = null;
    const lo = loadouts[cat];
    lo[k] = v;
    // mexeu numa peca na mao: deixa de ser a variante (camo, cor e tracado podem trocar sem perder)
    if (['body', 'scope', 'charger', 'handle', 'laser'].includes(k)) delete lo.bp;
    if (k === 'body') { lo.charger = null; if (cat === 'sniper' && !lo.scope) lo.scope = nativePart(v, 'scope'); }
    saveLoadouts(loadouts);
    o.loadoutsChanged(loadouts);
    audio.play('swap', { vol: 0.5 });
    renderSmith();
  }

  // variante de elite: aplica a montagem inteira (pecas + camo lendaria) de uma vez
  function setVariant(id) {
    preview = null;
    const lo = loadouts[cat];
    if (id) Object.assign(lo, bpLoadout(id));
    else delete lo.bp;
    saveLoadouts(loadouts);
    o.loadoutsChanged(loadouts);
    audio.play(id ? 'unlock' : 'swap', { vol: 0.5, ui: true });
    renderSmith();
  }

  function renderPicker(lo, C) {
    const p = $('picker');
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
      const grp = (c) => c.legend ? 'legend' : c.react ? 'react' : c.anim ? 'anim' : 'static';
      let last = null;
      p.innerHTML = CAMOS.map(c => {
        const g = grp(c), head = g !== last ? `<p class="pk-h">${t('cg_' + g)}</p>` : '';
        last = g;
        return head + camoOpt(c);
      }).join('');
      function camoOpt(c) {
        const open = camoUnlocked(cat, c), cur = (lo.camo || 'none') === c.id;
        const lockC = !open && LOCKED_BY[c.id];
        const req = c.elite && !open ? t('eliteOnly') : c.legend && !open ? t('bpLocked') : lockC ? (unlockActive(lockC.id) ? `${t('reqCh')}: ${chName(lockC)}` : t('reqQueue')) : !open ? (c.req.player && c.req.wpn ? t('reqBoth', { p: c.req.player, w: c.req.wpn }) : c.req.player ? t('reqPlayer', { n: c.req.player }) : t('reqWpn', { n: c.req.wpn })) : (c.anim ? t('animated') : '');
        const bar = open || c.legend || c.elite ? '' : `<span class="ubar"><i style="width:${Math.round((lockC ? unlockProg(lockC.id) : reqProgress(cat, c.req)) * 100)}%"></i></span>`;
        return `<button class="opt camo ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'camo' && preview.v === c.id ? 'peek' : ''}" data-camo="${c.id}" ${open ? '' : 'aria-disabled="true"'}><i class="cswatch ${c.anim ? 'anim' : ''}" style="background:${CAMO_SWATCH[c.id]}"></i>${t('camo_' + c.id)}<small>${req}</small>${bar}</button>`;
      }
      p.querySelectorAll('[data-camo]').forEach(b => b.onclick = () => {
        if (b.classList.contains('locked')) { peek('camo', b.dataset.camo === 'none' ? null : b.dataset.camo); return; }
        setPart('camo', b.dataset.camo === 'none' ? null : b.dataset.camo);
      });
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
      const open = partUnlocked(cat, i, id);
      const lockCh = !open && id && LOCKED_BY[id];
      // pros e contras da peca (estilo COD), so em pente e empunhadura
      const fx = (slot === 'charger' || slot === 'handle' || slot === 'laser') && id ? partEffects(cat, lo, slot, id) : [];
      const fxHtml = fx.length ? `<span class="fx">${fx.slice(0, 4).map(([k, v]) => `<b class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'} ${t(k)}</b>`).join('')}</span>` : '';
      const pill = slot === 'body' ? modePill(id) : '';
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
    el.innerHTML = `<b>${pi.level}</b><span><small>${t('playerLevel')}</small><span class="xpbar"><i style="width:${pi.max ? 100 : Math.round(pi.into / pi.need * 100)}%"></i></span><small>${pi.max ? t('maxed') : pi.into + ' / ' + pi.need + ' XP'}</small></span>`;
  };
  drawLevel();
  onProgress(() => { drawLevel(); if (ui.screen === 'arsenal') renderSmith(); });
  ui.relang = () => {
    drawLevel();
    renderNews(); markNewChallenges();
    if (ui.screen === 'controls') renderKeys();
    markLang();
    soloMap.draw(); mpMap.draw();
    $('modeList').innerHTML = ''; $('mpModeList').innerHTML = '';
    curSolo = modeList($('modeList'), curSolo(), () => {}, true);
    curMp = modeList($('mpModeList'), curMp(), () => {}, false);
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
