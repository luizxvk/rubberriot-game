// Menus: inicio, modos, multiplayer, arsenal (gunsmith), ajustes.
import { LETHALS, TACTICALS, NADES } from '../shared/weapons.js';
import { MODES, WEAPONS, PRIMARIES, BLUEPRINTS, bodyTrait, SKILLS, SKILL_SLOTS, AMMO, AMMO_IDS, FIELD, FIELD_IDS, STREAKS, STREAK_PICK, pickStreaks } from '../shared/weapons.js';
import { STREAK_SVG, NADE_SVG } from './hud.js';
import { getVariants, saveVariants, VARIANT_MAX } from './arsenal.js';
// variante do jogador vale SO no modelo em que foi salva (02/11: aparecia em todas as armas da categoria).
// Devolve a variante equipada nesta montagem, ou null se ela e de outro modelo / foi apagada
const cvOf = (cat, lo) => (lo?.cv && (getVariants()[cat] || []).find(v => v.id === lo.cv && v.lo.body === lo.body)) || null;
import { SKILL_ICONS } from './skillicons.js';
import { screenTour } from './hometour.js'; // tours das telas (07/11); a dica-balao 'skills' saiu
import { UNLOCKS, dailyToday, unlockState, msToReset, LOCKED_BY, unlockProg, unlockActive, eliteToday, BP_ORDER, tutorialState, togglePick, unlockPinned, pendingUnlocks } from './challenges.js';
import { TRACER_STYLES } from './world.js';
import { audio } from './audio.js';
import { renderShop, stopShop, initShop } from './shop.js';
import { initAnn, startAnn, stopAnn, relangAnn, placePromos } from './ann.js';
import { openNews, initNews } from './newspop.js';
import { initElitePop } from './elitepop.js';
import { renderPass } from './passview.js';
import { RET_PASS } from './pass.js';
import { initSupport } from './support.js';
import { renderAllBal } from './zbal.js';
import * as rovex from './rovex.js';
import { isTouch } from './input.js';
import { CAMOS, CAMO_SWATCH } from './camos.js';
import { stats as pStats } from './progress.js';
import { BANNERS } from '../shared/banners.js';
import { DANCE_IDS, DANCE_INFO } from '../shared/looks.js';
import { DANCES } from './dances.js';
import { danceOpen, wornDances, bannerOpen } from './lookstore.js';
import { bannerHtml } from './banners.js';
import { CANTED_LVL, AMMO_LVL, MUZZLE_LVL, BODY_MIN_LVL, DEBUG, progressInfo, wpnInfo, wpnLevel, partReq, partUnlocked, camoUnlocked, setUnlockAll, onProgress, reqProgress, bpUnlocked, doPrestige } from './progress.js';
import { PICK_MAPS as MAP_IDS } from '../shared/map.js'; // a ilha e so do battle royale (nao aparece na escolha)
import { kbBinds, padBinds, setKb, setPad, resetBinds, keyName, padName, ACTIONS, PAD_BTN, FIXED_KEYS } from './binds.js';
import { t, wName, modeName, modeDesc, getLang, setLang } from './i18n.js';
import { LOOKS } from '../shared/looks.js';
import { getLook, saveLook, lookOpen } from './lookstore.js';
import { syncOpen, isNew, anyNew, markSeen, newPill } from './newstuff.js';
import { TIERS, badgeSvg, myTier, peakTier, tierOf as tierFor } from './rank.js';
import { prizePreview } from './shop.js';
import { rankData } from './progress.js';
import { sightIsBig, RET_ROW_SHORT, RET_ROW_LONG, cantedFits, isSaber, RET_PATH, retOwned, retColorOwned, handleFits, convOptions, muzzleOptions, ironOptions, IRONS, freeScope, CATEGORY, LASERS, RETICLES, RET_COLORS, unlockedLoadout, chargerOptions, partEffects, partName, buildGun, getLoadouts, saveLoadouts, loadoutStats, defaultLoadout, nativePart, arsenalReady, bpLoadout, scopeFits, wsOwned, wsFor } from './arsenal.js';

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
const PAINT_LVL0 = 2, PAINT_STEP = 2, PAINT_FREE = 26; // cor i abre no nivel da arma 2 + 2i; cor livre no 26 (07/11)
const PAINTS = ['#a83a2c', '#d9822b', '#e3c14a', '#5f8f3a', '#2f6b5a', '#2f5b8a', '#5b3f8a', '#c45b8f', '#ece9e1', '#6e6a63', '#2a2724'];

export function initMenus(o) {
  const ui = { screen: 'home' };
  const screens = ['home', 'mp', 'arsenal', 'skills', 'settings', 'controls', 'challenges', 'look', 'profile', 'shop', 'pass', 'friends'];
  initShop();
  initElitePop(); // banner do Elite abre o popup com os beneficios (03/11)
  initSupport(); // botao de apoiar no cartaz (04/11)
  // sem barra de rolagem (regra dele): a roda do mouse anda nas faixas horizontais (pecas, abas, Rovex Pass)
  addEventListener('wheel', (e) => {
    const el = e.target.closest?.('.ps-strip, #scr-arsenal .slots, #scr-arsenal .cats');
    if (!el || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    el.scrollLeft += e.deltaY; e.preventDefault();
  }, { passive: false });
  placePromos(); initAnn((g) => g === 'play' ? $('goSolo')?.click() : g === 'news' ? openNews() : ui.go(g)); initNews(); { const v = document.getElementById('rovexVer'); if (v) v.textContent = 'v' + (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'); const mk = document.getElementById('rovexMark'), home = document.querySelector('#menu .poster-frame'), narrow = matchMedia('(max-width: 760px)'), place = () => { if (!mk || !home) return; if (narrow.matches) { if (mk.parentElement !== home) home.appendChild(mk); } else if (mk.parentElement !== document.body) document.body.appendChild(mk); }; narrow.addEventListener('change', place); place(); } // Powered by Rovex + versao (07/11) // anuncios do cartaz: 'play' abre a escolha do modo
  let settingsFromGame = false, fromLobby = false;

  // from: true = da pausa da partida; 'lobby' = o arsenal por cima da sala (volta pra ela)
  ui.go = (name, fromGame = false, startCat = null) => {
    if (name === 'ranked') name = 'mp'; // a Rankeada mora na tela do Multiplayer (04/11)
    fromLobby = ((fromGame === 'lobby' || fromGame === 'game') && name === 'arsenal') || (fromGame === 'lobby' && (name === 'skills' || name === 'challenges')); // 'game' = aberto da pausa, aplica na hora; skills e desafios tambem abrem da sala (02/11)
    settingsFromGame = fromGame === true;
    // abre na arma principal equipada (antes ficava presa na ultima aba aberta)
    if (name === 'arsenal' && !startCat && PRIMARIES.includes(S.primary)) startCat = S.primary;
    if (startCat) { cat = startCat; slot = 'body'; preview = null; }
    $('smithDone').hidden = !fromLobby;
    $('smithRange').hidden = fromLobby; // campo de treino so do menu (da sala/partida nao)
    if (fromLobby) $('smithDone').textContent = t(fromGame === 'game' ? 'smithNow' : o.lobbyHost() ? 'lbSmithBack' : 'lbSmithReady');
    const prevScr = ui.screen;
    for (const s of screens) $('scr-' + s).hidden = s !== name;
    if (prevScr !== name) { const el = $('scr-' + name), back = name === 'home'; el.classList.remove('scr-in', 'scr-back'); void el.offsetWidth; el.classList.add(back ? 'scr-back' : 'scr-in'); } // transicao entre telas do menu (04/11)
    ui.screen = name;
    $('menu').classList.toggle('smithing', name === 'arsenal' || name === 'look');
    $('menu').classList.toggle('home', name === 'home');
    if (name === 'arsenal') { picking = false; renderSmith(); }
    if (name === 'skills') renderSkills(); // a dica-balao das Skills virou o tour da tela (07/11)
    if (name === 'mp') { ui.refreshRooms && ui.refreshRooms(); renderRanked(); }
    if (name === 'challenges') { renderChallenges(); markChallengesSeen(); }
    if (name === 'controls') renderKeys(); else if (binding) stopBinding();
    if (name === 'look') renderLook();
    if (name === 'profile') renderProfile();
    if (name === 'shop') renderShop(); else stopShop();
    if (name === 'pass') renderPass(ui.go);
    if (name === 'friends') renderFriends();
    if (name === 'home') { markNewChallenges(); markNewStuff(); rankMini(); startAnn(); renderAllBal(); } else stopAnn();
    const first = $('scr-' + name).querySelector('button, input');
    first && first.focus({ preventScroll: true });
    screenTour(name, { touch: isTouch }); // 07/11 (pedido dele): tutorial da tela na 1a vez (Arsenal, Visual, Skills, Desafios)
  };

  document.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => {
      audio.init();
      const to = b.dataset.go;
      audio.play(to === 'home' ? 'ui_back' : 'ui_click', { ui: true });
      if (to === 'home' && settingsFromGame && o.inGame()) { o.onBackFromSettingsInGame(); settingsFromGame = false; return; }
      if (to === 'home' && fromLobby) { fromLobby = false; o.onBackToLobby(false); return; }
      if (to === 'settings' && ui.screen === 'controls') { ui.go('settings', settingsFromGame); return; } // volta dos Controles pros Ajustes (mantem "aberto da pausa")
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
  // campo de treino: leva o modelo aberto agora (ate o que esta so em previa e bloqueado)
  $('smithRange').onclick = () => {
    if (!CATEGORY[cat]) return; // aba Sequencias: nao tem arma pra testar
    audio.play('ui_click', { ui: true });
    const body = preview?.k === 'body' ? preview.v : unlockedLoadout(cat, getLoadouts()[cat], partUnlocked, camoUnlocked, CAMOS).body;
    o.onRange?.(cat, body);
  };
  ui.fromLobby = () => fromLobby;
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return; // um popup por cima (item da loja) ja tratou o Esc
    if (e.key === 'Escape' && fromLobby && ['arsenal', 'skills', 'challenges'].includes(ui.screen)) { audio.play('ui_back', { ui: true }); fromLobby = false; o.onBackToLobby(false); return; }
    if (e.key === 'Escape' && ui.screen === 'controls') { audio.play('ui_back', { ui: true }); ui.go('settings', settingsFromGame); return; }
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
  // tela dividida (01/11): so PC, 2 a 4 controles; abre a pagina ?split (ela hospeda uma tela por controle)
  $('goSplit').hidden = isTouch;
  $('goSplit').onclick = () => { audio.play('ui_click', { ui: true }); const q = new URLSearchParams(location.search); q.set('split', '1'); location.href = location.pathname + '?' + q; };
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
  // ---------- amigos (05/11, pedido dele): amigos da Rovex, quem esta online, entrar na sala deles ou chamar pra sua ----------
  async function renderFriends() {
    const ul = $('frPeople'); $('frErr').textContent = '';
    if (!rovex.me) { ul.innerHTML = `<li class="lf-msg">${t('frGuest')}</li>`; return; }
    ul.innerHTML = `<li class="lf-msg">${t('inviteLoading')}</li>`;
    let list, rooms;
    try { [list, rooms] = await Promise.all([rovex.friends(), rovex.friendRooms().catch(() => [])]); } catch { ul.innerHTML = `<li class="lf-msg">${t('inviteErr')}</li>`; return; }
    if (!list.length) { ul.innerHTML = `<li class="lf-msg">${t('inviteNone')}</li>`; return; }
    const roomOf = new Map(rooms.map(s => [s.amigoId, s]));
    list.sort((a, b) => (!!roomOf.get(b.id) - !!roomOf.get(a.id)) || (b.online - a.online) || a.name.localeCompare(b.name));
    const on = list.filter(f => f.online).length; $('frOnline').textContent = t('frOn', { n: on });
    ul.innerHTML = list.map(f => { const r = roomOf.get(f.id); return `<li class="${f.online ? 'on' : ''}"><span class="lf-av">${f.avatar ? `<img alt="" src="${esc(f.avatar)}">` : esc(f.name.slice(0, 1))}</span><span class="lf-nm">${esc(f.name)}<small>${r ? t('frInRoom') : f.online ? t('online') : t('frOff')}</small></span>${r ? `<button class="fr-act go" data-room="${esc(r.code)}">${t('ivGo')}</button>` : `<button class="fr-act" data-f="${esc(f.id)}">${t('frInvite')}</button>`}</li>`; }).join('');
    ul.querySelectorAll('[data-room]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true }); goMp({ room: b.dataset.room, join: true }); });
    ul.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => {
      // sem sala ainda: abre uma e chama; o amigo recebe o convite com o link
      b.disabled = true; audio.play('ui_click', { ui: true });
      const c = lastCfg(), room = newCode();
      await goMp({ room, mode: c.mode || 'tdm', map: c.map || 'auto', bots: Number.isFinite(c.bots) ? Math.min(11, c.bots) : 5 });
      if ($('mpErr').textContent) { b.disabled = false; $('frErr').textContent = $('mpErr').textContent; return; }
      rovex.invite(b.dataset.f, room).catch(() => {});
    });
  }
  // convite da Rovex (?sala=): ja abre a aba e entra na sala
  if (rovex.inviteRoom) setTimeout(() => { ui.go('mp'); $('mpRoom').value = rovex.inviteRoom; $('mpJoin').requestSubmit(); }, 300);

  // ---------- ajustes ----------
  const S = o.settings;
  const defs = [
    ['range', 'fov', 's_fov', 60, 115, 1, v => v + '°'],
    ['range', 'vmFov', 's_vmFov', 45, 75, 1, v => v + '°'],
    ['range', 'fovScale', 's_fovScale', 1, 1.5, 0.05, v => v.toFixed(2) + 'x'],
    ['range', 'master', 's_master', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'music', 's_music', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'sfx', 's_sfx', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'vo', 's_vo', 0, 1, 0.05, v => v > 0 ? Math.round(v * 100) + '%' : t('s_voOff')], // narrador (06/11): 0 = desligado
    ['toggle', 'voSubs', 's_voSubs'], // legenda do narrador (06/11): ligada por padrao
    ['range', 'grain', 's_grain', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['range', 'res', 's_res', 0.4, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['seg', 'lang', 's_lang', [['en', 'English'], ['pt', 'Portugues']]],
    ['seg', 'film', 's_film', [['full', 'film_full'], ['color', 'film_color'], ['bw', 'film_bw']]],
    ['seg', 'scopeQ', 's_scopeQ', [['fast', 'sq_fast'], ['full', 'sq_full']]], // luneta (05/11, pedido dele): otimizada ou qualidade cheia
    ['seg', 'draw', 's_draw', [['near', 'draw_near'], ['mid', 'draw_mid'], ['far', 'draw_far']]], // 07/11: voltou (pedido dele), com nevoa
    ['seg', 'aa', 's_aa', [['off', 'aa_off'], ['2x', 'aa_2'], ['4x', 'aa_4'], ['8x', 'aa_8']]], // antisserrilhado (07/11, pedido dele): menos = mais leve
    ['toggle', 'invertY', 's_invert'],
    ['toggle', 'holdCrouch', 's_hold'],
    ['seg', 'leanMode', 's_leanMode', [['hold', 'lm_hold'], ['toggle', 'lm_toggle']]],
    ['seg', 'hudMode', 's_hudMode', [['simple', 'hm_simple'], ['full', 'hm_full']]],
    ['toggle', 'autoSprint', 's_auto'],
    ['toggle', 'showFps', 's_fps'],
    ['toggle', 'threatRing', 's_threat'],
    ['toggle', 'autoReload', 's_autoReload'],
    ['toggle', 'modeTips', 's_modeTips'], // 07/11: dicas do modo na partida // 07/11 (pedido dele): pente acabou, recarrega sozinho
    ['toggle', 'autoChute', 's_autoChute'],
    ['xhair'],
  ];
  if (DEBUG) defs.push(['toggle', 'unlockAll', 's_unlockAll']);
  // mouse (so no PC, igual as opcoes do COD): suavizacao, aceleracao, entrada crua e a arma acompanhando o giro
  // sensibilidade por aparelho (05/11, pedido dele): no celular so a do toque; no PC so a do mouse. A do controle fica na aba dele
  if (isTouch) defs.unshift(['range', 'touchSens', 's_touchSens', 0.1, 4, 0.05, v => v.toFixed(2)], ['range', 'touchAdsSens', 's_touchAds', 0.3, 1.5, 0.05, v => v.toFixed(2)]);
  if (!isTouch) defs.unshift(['range', 'sens', 's_sens', 0.1, 4, 0.05, v => v.toFixed(2)], ['range', 'adsSens', 's_adsSens', 0.3, 1.5, 0.05, v => v.toFixed(2)],
    ['seg', 'mouseSmooth', 's_mSmooth', [['off', 'ms_off'], ['low', 'ms_low'], ['high', 'ms_high']]],
    ['range', 'mouseAccel', 's_mAccel', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
    ['toggle', 'rawMouse', 's_rawMouse'],
    ['toggle', 'gunSway', 's_gunSway']);
  // mira assistida: toque e controle; tiro automatico so no toque (os dois ligados por padrao)
  if (isTouch) defs.splice(defs.findIndex(d => d[1] === 'invertY'), 0, ['toggle', 'aimAssist', 's_aimAssist'], ['toggle', 'autoFire', 's_autoFire']);
  else defs.splice(defs.findIndex(d => d[1] === 'invertY'), 0, ['toggle', 'aimAssist', 's_aimAssistPad']);
  // controle (03/11, pedido dele): as mesmas do mouse (sensibilidade, suavizacao, aceleracao)
  defs.push(['range', 'padSens', 's_padSens', 0.3, 2.5, 0.05, v => v.toFixed(2)], ['range', 'padAdsSens', 's_padAds', 0.3, 1.5, 0.05, v => v.toFixed(2)],
    ['seg', 'padSmooth', 's_padSmooth', [['off', 'ms_off'], ['low', 'ms_low'], ['high', 'ms_high']]],
    ['range', 'padAccel', 's_padAccel', 0, 1, 0.05, v => Math.round(v * 100) + '%']);
  // abas (pills) dos Ajustes (03/11): cada opcao no seu grupo; toque so aparece no celular
  const GROUP = { sens: 'ctrl', adsSens: 'ctrl', mouseSmooth: 'ctrl', mouseAccel: 'ctrl', rawMouse: 'ctrl', gunSway: 'ctrl', invertY: 'ctrl', aimAssist: isTouch ? 'touch' : 'pad', touchSens: 'touch', touchAdsSens: 'touch', holdCrouch: 'ctrl', leanMode: 'ctrl', autoSprint: 'ctrl', padSens: 'pad', padAdsSens: 'pad', padSmooth: 'pad', padAccel: 'pad',
    autoFire: 'touch', hudMode: isTouch ? 'touch' : 'game', autoChute: 'game', autoReload: 'game', modeTips: 'game',
    fov: 'video', vmFov: 'video', fovScale: 'video', grain: 'video', res: 'video', film: 'video', scopeQ: 'video', draw: 'video', aa: 'video', showFps: 'video',
    master: 'audio', music: 'audio', sfx: 'audio', vo: 'audio', voSubs: 'audio', lang: 'game', threatRing: 'game', xhair: 'game', unlockAll: 'game' };
  const grp = (d) => { const g = GROUP[d[0] === 'xhair' ? 'xhair' : d[1]] || 'game'; return isTouch && g === 'ctrl' ? 'touch' : g; };
  // celular: Toque primeiro; Controle so com um controle ligado. PC: Teclado e mouse, Controle. Comandos gerais (agachar, inverter) vao na 1a aba
  const padOn = () => [...(navigator.getGamepads?.() || [])].some(Boolean);
  const TABS = isTouch ? ['touch', ...(padOn() ? ['pad'] : []), 'video', 'audio', 'game'] : ['ctrl', 'pad', 'video', 'audio', 'game'];
  let setTab = TABS[0];
  const sl = $('settingsList');
  S.lang = getLang();
  S.unlockAll = progressInfo().unlockAll;
  const buildSettings = () => { sl.innerHTML = `<nav class="set-tabs" role="tablist">${TABS.map(g => `<button role="tab" data-sg="${g}" aria-selected="${g === setTab}">${t('sg_' + g)}</button>`).join('')}</nav><div class="set-body">` + defs.filter(d => grp(d) === setTab).map(d => {
    if (d[0] === 'range') return `<label class="field"><span>${t(d[2])} <b data-out="${d[1]}"></b></span><input type="range" data-k="${d[1]}" min="${d[3]}" max="${d[4]}" step="${d[5]}"></label>`;
    if (d[0] === 'xhair') return `<div class="field xh-field"><span>${t('s_xhair')}</span><div class="xh-row"><div class="xh-prev" aria-hidden="true"><div class="cross" id="xhPrev">${XH_CROSS}</div></div><div class="xh-opts"><div class="seg" data-seg="xhair">${XHAIRS.map(x => `<button data-v="${x}">${t('xh_' + x)}</button>`).join('')}</div><div class="xh-cols" role="group" aria-label="${t('s_xhairColor')}">${XH_COLORS.map(c => `<button data-xc="${c}" style="background:${c}" aria-label="${t('s_xhairColor')} ${c}"></button>`).join('')}</div></div></div></div>`;
    if (d[0] === 'seg') return `<div class="field"><span>${t(d[2])}</span><div class="seg" data-seg="${d[1]}">${d[3].map(([v, l]) => `<button data-v="${v}">${d[1] === 'lang' ? l : t(l)}</button>`).join('')}</div></div>`;
    return `<div class="toggle"><span id="lbl-${d[1]}">${t(d[2])}</span><button class="switch" role="switch" aria-labelledby="lbl-${d[1]}" data-t="${d[1]}"></button></div>`;
  }).join('') + nextSec() + '</div>'; };
  // 07/11 (pedido dele): botao no pe de cada aba que avanca pra proxima secao (na ultima, volta pra primeira)
  const nextSec = () => { const i = TABS.indexOf(setTab), n = TABS[(i + 1) % TABS.length], last = i === TABS.length - 1;
    return `<button type="button" class="set-next" data-sg="${n}"><span>${t(last ? 'set_first' : 'set_next')}<b>${t('sg_' + n)}</b></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${last ? 'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z' : 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z'}"/></svg></button>`; };
  buildSettings();
  // Controles saiu do menu inicial (03/11, pedido dele): mora nos Ajustes, na pill "Redefinir comandos" do topo
  $('setKeys').onclick = () => { audio.play('ui_click', { ui: true }); ui.go('controls', settingsFromGame); };
  const refresh = () => {
    for (const d of defs) {
      if (grp(d) !== setTab) continue; // so a aba aberta esta desenhada
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
    if (b.dataset.sg) { if (b.dataset.sg !== setTab) { setTab = b.dataset.sg; buildSettings(); refresh(); audio.play('ui_hover', { ui: true, vol: 0.5 }); const tb = sl.querySelector(`.set-tabs [data-sg="${setTab}"]`); tb?.focus({ preventScroll: true }); tb?.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } return; }
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
  const CATS = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg', 'melee'];
  const SLOTS = ['bp', 'body', 'scope', 'visual', 'charger', 'handle', 'muzzle', 'conv', 'laser', 'ammo', 'tracer', 'camo', 'paint'];
  const SLOT_LABEL = { bp: 'slot_bp', body: 'slot_body', scope: 'slot_scope', ret: 'slot_ret', visual: 'slot_visual', canted: 'slot_canted', charger: 'slot_charger', handle: 'slot_handle', muzzle: 'slot_muzzle', conv: 'slot_conv', laser: 'slot_laser', ammo: 'slot_ammo', tracer: 'slot_tracer', camo: 'slot_camo', paint: 'slot_paint', accent: 'slot_accent' };

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
  // Ranking (05/11, pedido dele): mundial e de amigos, com a sua posicao sempre a vista
  let boardBack = null, boardTab = 'mundial', boardAsk = 0;
  const boardRow = (r, mine) => { const k = tierFor(r.rp); return `<li class="${r.pos === 1 ? 'top1' : ''} ${r.pos <= 3 ? 'podio' : ''} ${mine ? 'eu' : ''}"><em class="rkb-pos">${r.pos}</em><span class="rkb-av">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy">` : esc((r.name || '?').slice(0, 1))}</span><span class="rkb-nm"><b>${esc(r.name || '?')}</b><small>${t('rk_' + TIERS[k].id)}${r.games ? ' · ' + t('rkbGames', { n: r.games }) : ''}</small></span>${badgeSvg(k, 30)}<strong>${r.rp}</strong></li>`; };
  async function drawBoard() {
    const pop = $('rkBoardPop'), list = $('rkbList'), ask = ++boardAsk;
    pop.querySelectorAll('[data-board]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.board === boardTab)));
    list.innerHTML = `<li class="rkb-msg">${t('rkbLoading')}</li>`; $('rkbMe').innerHTML = '';
    const r = await rovex.rankingBoard(boardTab);
    if (ask !== boardAsk) return;
    if (r.code === 'login') { list.innerHTML = `<li class="rkb-msg">${t('rkbLogin')}</li>`; return; }
    if (r.code) { list.innerHTML = `<li class="rkb-msg">${t('rkbErr')}</li>`; return; }
    if (!r.lista.length) { list.innerHTML = `<li class="rkb-msg">${t(boardTab === 'amigos' ? 'rkbNoFriends' : 'rkbEmpty')}</li>`; return; }
    list.innerHTML = r.lista.map(x => boardRow(x, x.id === r.meuId)).join('');
    list.scrollTop = 0;
    if (r.eu && !r.lista.some(x => x.id === r.eu.id)) $('rkbMe').innerHTML = boardRow(r.eu, true);
  }
  function openBoard(from) { boardBack = from; $('rkBoardPop').hidden = false; drawBoard(); $('rkBoardPop').querySelector('.lb-x').focus({ preventScroll: true }); }
  function closeBoard() { const pop = $('rkBoardPop'); if (pop.hidden) return; boardAsk++; pop.hidden = true; if (boardBack?.isConnected) boardBack.focus({ preventScroll: true }); boardBack = null; }
  $('rkBoardPop').querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closeBoard(); };
  $('rkBoardPop').addEventListener('click', (e) => { if (e.target === $('rkBoardPop')) closeBoard(); });
  $('rkBoardPop').querySelectorAll('[data-board]').forEach(b => b.onclick = () => { boardTab = b.dataset.board; audio.play('ui_click', { ui: true, vol: 0.6 }); drawBoard(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('rkBoardPop').hidden) { e.preventDefault(); e.stopPropagation(); closeBoard(); } }, true);
  // Ver premios (05/11, pedido dele): uma faixa por vez, com a previa na arma ou no boneco
  let prizeBack = null;
  function drawPrize(i) {
    const T = TIERS[i], peak = peakTier(), pop = $('rkPrizePop');
    pop.querySelectorAll('[data-tier]').forEach((b, n) => b.setAttribute('aria-selected', String(n === i)));
    $('rkpName').textContent = t('rk_' + T.id); $('rkpPts').textContent = t('rkpNeed', { n: T.rp });
    $('rkpList').innerHTML = T.list.map(([k, v]) => `<li><small>${t(k)}</small><b>${t(v)}</b></li>`).join('');
    const art = $('rkpArt'); art.style.setProperty('--rc1', T.c1); art.style.setProperty('--rc2', T.c2); art.style.setProperty('--rc3', T.c3); art.innerHTML = '<span class="st-bg"></span>';
    $('rkpState').textContent = t(peak >= i ? 'rkGot' : 'rkpLocked'); $('rkpState').classList.toggle('got', peak >= i);
    prizePreview(i, T.show, $('rkpArt'));
  }
  function openPrizes(from, tier) {
    const pop = $('rkPrizePop'); prizeBack = from;
    pop.querySelector('.rkp-tabs').innerHTML = TIERS.map((T, i) => `<button role="tab" data-tier="${i}" aria-selected="false">${badgeSvg(i, 30)}<span>${t('rk_' + T.id)}</span></button>`).join('');
    pop.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true, vol: 0.6 }); drawPrize(+b.dataset.tier); });
    pop.hidden = false; drawPrize(tier);
    pop.querySelector('.lb-x').focus({ preventScroll: true });
  }
  function closePrizes() { const pop = $('rkPrizePop'); if (pop.hidden) return; prizePreview(-1); pop.hidden = true; if (prizeBack?.isConnected) prizeBack.focus({ preventScroll: true }); prizeBack = null; }
  $('rkPrizePop').querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closePrizes(); };
  $('rkPrizePop').addEventListener('click', (e) => { if (e.target === $('rkPrizePop')) closePrizes(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('rkPrizePop').hidden) { e.preventDefault(); e.stopPropagation(); closePrizes(); } }, true);
  const rkReward = (R) => R.slot === 'camo' ? t('camo_' + R.id) : R.tab === 'hat' ? t('lk_hat_' + R.id) + ' + ' + t('camo_' + R.camo) : t('lkt_' + R.tab) + ' ' + t('rk_' + TIERS.find(x => x.reward === R).id);
  function rankMini() { const k = myTier(); $('rkMini').innerHTML = k >= 0 ? badgeSvg(k, 20) : ''; }
  ui.rankMini = rankMini;
  function renderRanked() {
    const r = rankData(), k = myTier(), peak = peakTier(), nx = TIERS[k + 1];
    $('rkMe').innerHTML = k < 0 ? `<span class="rk-big none">${badgeSvg(0, 72)}</span><div><b>${t('rkUnranked')}</b></div>`
      : `<span class="rk-big">${badgeSvg(k, 72)}</span><div><b>${t('rk_' + TIERS[k].id)}</b><small>${t('rkPts', { n: r.rp })}</small>`
        + (nx ? `<span class="xpbar"><i style="width:${Math.round((r.rp - TIERS[k].rp) / (nx.rp - TIERS[k].rp) * 100)}%"></i></span><small>${t('rkNext', { n: nx.rp - r.rp, t: t('rk_' + nx.id) })}</small>` : `<small>${t('rkTop')}</small>`) + '</div>';
    $('rkTiers').innerHTML = TIERS.map((T, i) => `<li class="${i === k ? 'cur' : ''} ${peak >= i ? 'got' : ''}">${badgeSvg(i, 34)}<span><b>${t('rk_' + T.id)}</b><small>${T.rp}+</small></span><em><small>${t(peak >= i ? 'rkGot' : 'rkReward')}</small>${t(T.prize)} + ${rkReward(T.reward)}</em></li>`).join('');
    $('rkFind').onclick = () => { audio.play('ui_click', { ui: true }); goMp({ ranked: true }); };
    $('rkBoardGo').onclick = () => { audio.play('ui_click', { ui: true }); openBoard($('rkBoardGo')); };
    $('rkPrizes').onclick = () => { audio.play('ui_click', { ui: true }); openPrizes($('rkPrizes'), Math.max(0, k)); };
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
        for (const id of Object.keys(MUZZLE_LVL)) if (partUnlocked(c, 0, 'mz:' + id)) out.push(A + 'muzzle|' + id);
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
  // comandos remapeaveis (01/11): teclado/mouse e controle. Clica na acao e aperta a tecla/botao novo;
  // quem usava ela troca de lugar com a antiga. Toque e os fixos (olhar, pausa, placar) so mostram.
  const FIXED_ROWS = {
    kb: [['Mouse', 'k_look'], ['1 2 3 / key_wheel', 'k_swap'], ['Tab', 'k_board'], ['Esc', 'k_pause']],
    pad: [['L', 'k_move'], ['R', 'k_look'], ['Select', 'k_board'], ['Start', 'k_pause'], ['▲ ▼ ◀ ▶', 'k_menu'], ['A / ✕', 'k_confirm'], ['B / ○', 'k_back']],
  };
  let binding = null;
  function stopBinding() {
    if (!binding) return;
    removeEventListener('keydown', binding.key, true); removeEventListener('mousedown', binding.mouse, true);
    cancelAnimationFrame(binding.raf); binding = null; document.body.classList.remove('binding');
  }
  function bound(apply) { apply(); o.saveSettings(); o.bindsChanged?.(); audio.play('pickup', { ui: true, vol: 0.5 }); stopBinding(); renderKeys(); }
  function startBinding(id) {
    stopBinding();
    document.body.classList.add('binding'); // o controle para de navegar o menu enquanto espera o botao
    binding = { id };
    if (keyTab === 'kb') {
      binding.key = (e) => { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') { stopBinding(); renderKeys(); return; } if (FIXED_KEYS.includes(e.code)) return; bound(() => setKb(S, id, e.code)); };
      binding.mouse = (e) => { if (!e.target.closest('#keyList')) { stopBinding(); renderKeys(); return; } if (e.button === 0 && e.target.closest(`[data-bind="${id}"]`)) return; e.preventDefault(); e.stopPropagation(); bound(() => setKb(S, id, 'Mouse' + e.button)); };
      setTimeout(() => { if (binding?.id !== id) return; addEventListener('keydown', binding.key, true); addEventListener('mousedown', binding.mouse, true); }, 0);
    } else {
      const was = new Set();
      const poll = () => {
        const g = [...(navigator.getGamepads?.() || [])].find(Boolean);
        if (g) for (const [name, i] of Object.entries(PAD_BTN)) {
          const on = !!g.buttons[i]?.pressed || (g.buttons[i]?.value || 0) > 0.5;
          if (on && !was.has(i) && binding.armed) { if (name === 'START') { stopBinding(); renderKeys(); return; } if (setPad(S, id, name) !== false) { bound(() => {}); return; } }
          if (on) was.add(i); else was.delete(i);
        }
        binding.armed = true; // o botao que abriu a escuta (A) nao conta: so o proximo aperto
        binding.raf = requestAnimationFrame(poll);
      };
      binding.raf = requestAnimationFrame(poll);
    }
    renderKeys();
  }
  function renderKeys() {
    document.querySelectorAll('[data-kt]').forEach(b => b.setAttribute('aria-selected', b.dataset.kt === keyTab));
    if (keyTab === 'touch') { $('keyList').innerHTML = KEYS.touch.map(([k, d]) => `<dt>${k.startsWith('key_') || k.startsWith('t_') ? t(k) : k}</dt><dd>${t(d)}</dd>`).join(''); return; }
    const kb = keyTab === 'kb', map = kb ? kbBinds(S) : padBinds(S);
    const rows = ACTIONS.filter(a => kb || a[3]).map(([id, label]) => {
      const cur = kb ? (map[id] || []).map(keyName).join(' / ') || '—' : padName(map[id]);
      const wait = binding?.id === id;
      return `<dt><button class="bind ${wait ? 'wait' : ''}" data-bind="${id}" aria-label="${t(label)}">${wait ? t(kb ? 'bindPress' : 'bindPressPad') : cur}</button></dt><dd>${t(label)}</dd>`;
    }).join('');
    const fixed = FIXED_ROWS[keyTab].map(([k, d]) => `<dt class="fixed">${k.replace('key_wheel', t('key_wheel'))}</dt><dd>${t(d)}</dd>`).join('');
    $('keyList').innerHTML = `<p class="bind-hint">${t('bindHint')}</p>` + rows + fixed + `<p class="bind-foot"><button class="plain" id="bindReset">${t('bindReset')}</button></p>`;
    $('keyList').querySelectorAll('[data-bind]').forEach(b => b.onclick = () => { if (binding?.id === b.dataset.bind) return; audio.play('ui_click', { ui: true, vol: 0.6 }); startBinding(b.dataset.bind); });
    $('bindReset').onclick = () => { stopBinding(); resetBinds(S, keyTab); o.saveSettings(); o.bindsChanged?.(); audio.play('ui_back', { ui: true }); renderKeys(); };
  }
  document.querySelectorAll('[data-kt]').forEach(b => b.onclick = () => { stopBinding(); keyTab = b.dataset.kt; audio.play('ui_click', { ui: true, vol: 0.6 }); renderKeys(); });

  // ---------- visual do boneco: abas, itens com raridade e cadeado; o 3D gira ao lado (main.js) ----------
  const LOOK_TABS = ['banner', 'dance', 'face', 'death', 'hat', 'eyes', 'glove', 'gloveCol', 'shirt', 'pattern', 'fx', 'skin'];
  let lookTab = 'banner', lookTeam = 'red', lookPeek = null;
  // Ver progresso (05/11, pedido dele): debaixo da barra de nivel, o que esta arma abre e em que nivel. So peca que abre por nivel da
  // arma; o que vem de desafio ou de nivel de jogador fica de fora. Mesmas contas do picker, entao os dois nunca discordam.
  let ulkOpen = false, visTab = 'charm';
  function unlockItems(lo, C) {
    const out = [], add = (slot, id, i, lv, key = id, name = partName(slot, id)) => { if (!id || LOCKED_BY[key] || LOCKED_BY[cat + ':' + key] || BODY_MIN_LVL[id]) return; out.push({ slot, name, lv, open: partUnlocked(cat, i, key) }); };
    C.bodies.forEach((id, i) => { if (i > 0) add('body', id, i, partReq(i, id)); });
    if (cat === 'melee') return out;
    C.scopes.forEach((id, n) => { if (scopeFits(lo.body, cat, id) && id !== freeScope(cat, lo.body)) add('scope', id, n + 1, partReq(n + 1, id)); });
    C.handles.forEach((id, n) => { if (handleFits(lo.body, cat, id)) add('handle', id, n + 1, partReq(n + 1, id)); });
    chargerOptions(lo.body, cat).forEach((id, i) => { if (i > 0) add('charger', id, i, partReq(i, id)); });
    if (cantedFits(cat, lo.body)) add('scope', 'canted', 1, CANTED_LVL, 'canted', t('cantedOn'));
    LASERS.forEach((id, n) => add('laser', id, n + 1, partReq(n + 1, id)));
    muzzleOptions(lo.body).forEach(id => add('muzzle', id, 1, MUZZLE_LVL[id] || 1, 'mz:' + id));
    for (const id of AMMO_IDS) if (!AMMO[id].only || AMMO[id].only === cat) add('ammo', id, 1, AMMO_LVL[id] || 1, 'am:' + id, t('am_' + id));
    return out;
  }
  function renderUnlocks(lo, C) {
    const items = unlockItems(lo, C).sort((a, b) => a.lv - b.lv), got = items.filter(x => x.open).length, next = items.find(x => !x.open);
    if (!items.length) return;
    const cols = [...new Set(items.map(x => x.lv))].map(n => { const here = items.filter(x => x.lv === n), done = here.every(x => x.open), isNext = next?.lv === n;
      return `<li class="ulk-lv ${done ? 'done' : ''} ${isNext ? 'next' : ''}"><b>${t('lvlShort', { n })}</b><div class="ulk-row">${here.map(x => `<span class="ulk-it ${x.open ? 'open' : ''}"><small>${t(SLOT_LABEL[x.slot])}</small>${x.name}</span>`).join('')}</div></li>`; }).join('');
    $('equipBar').insertAdjacentHTML('beforeend', `<section class="ulk" id="ulkPane"><header><span class="xpbar"><i style="width:${Math.round(got / items.length * 100)}%"></i></span><b>${t('ulkCount', { a: got, b: items.length })}</b><small>${next ? t('ulkNext', { x: next.name, n: next.lv }) : t('ulkDone')}</small></header><ol class="ulk-track">${cols}</ol></section>`);
    const tr = $('equipBar').querySelector('.ulk-track'), nx = tr.querySelector('.next');
    if (nx) tr.scrollLeft = Math.max(0, nx.offsetLeft - tr.offsetLeft - 8); // ja abre no proximo desbloqueio
    tr.onwheel = (e) => { if (tr.scrollWidth <= tr.clientWidth) return; e.preventDefault(); tr.scrollLeft += e.deltaY || e.deltaX; };
    let drag = null; // sem barra de rolagem: arrasta com o mouse (no toque o navegador ja faz)
    tr.onpointerdown = (e) => { if (e.pointerType === 'mouse') { drag = { x: e.clientX, s: tr.scrollLeft }; tr.setPointerCapture(e.pointerId); } };
    tr.onpointermove = (e) => { if (drag) tr.scrollLeft = drag.s - (e.clientX - drag.x); };
    tr.onpointerup = tr.onpointercancel = () => { drag = null; };
  }
  function renderLook() {
    const cur = getLook();
    syncOpen(openKeys());
    $('lookTabs').innerHTML = LOOK_TABS.map(k => `<button role="tab" aria-selected="${k === lookTab}" data-lt="${k}">${t('lkt_' + k)}${k !== lookTab && anyNew('look|' + k + '|') ? newPill(t('chNew')) : ''}</button>`).join('');
    document.querySelectorAll('#scr-look [data-team]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.team === lookTeam)));
    o.previewDance?.(lookTab === 'dance' ? danceShow : null); o.previewDeath?.(lookTab === 'death');
    if (lookTab === 'banner') { renderBanners(); return; }
    if (lookTab === 'dance') { renderDances(); return; }
    const swatch = lookTab === 'gloveCol' || lookTab === 'shirt';
    $('lookGrid').classList.toggle('swatches', swatch);
    $('lookGrid').innerHTML = LOOKS[lookTab].filter(it => !it.mastery).map(it => { /* chaveiro de ouro: so no Arsenal, na propria arma */
      const open = lookOpen(lookTab, it.id), on = cur[lookTab] === it.id, peek = lookPeek === it.id;
      const lock = open ? '' : `<small class="lk-lock">${it.shop ? t('shopOnly') : it.pass ? t('lookPass') : it.elite ? t('lookElite') : it.acct ? t('lookAcct') : it.rank != null ? t('rkLock', { t: t('rk_' + TIERS[it.rank].id) }) : it.ch ? t('lookCh') + ': ' + t('ch_' + it.ch, { n: (UNLOCKS.find(u => u.id === it.ch) || {}).n }) : t('lookLvl', { n: it.lvl })}</small>`;
      const rar = `<i class="lk-r r${it.r}">${t('rar' + it.r)}</i>` + (isNew('look|' + lookTab + '|' + it.id) ? newPill(t('chNew')) : '');
      if (swatch) return `<button class="lk-it sw ${on ? 'on' : ''} ${open ? '' : 'locked'} ${peek ? 'peek' : ''}" data-id="${it.id}" style="--c:${it.id}" aria-label="${it.id}">${it.elite ? '<i class="lk-r r2">Elite</i>' : it.acct ? '<i class="lk-r r2">Rovex</i>' : ''}${lock}</button>`;
      return `<button class="lk-it ${on ? 'on' : ''} ${open ? '' : 'locked'} ${peek ? 'peek' : ''}" data-id="${it.id}"><b>${t('lk_' + lookTab + '_' + it.id)}</b>${rar}${lock}</button>`;
    }).join('');
    markSeen('look|' + lookTab + '|');
    const show = lookPeek ? { ...cur, [lookTab]: lookPeek } : cur;
    const pk = lookPeek && LOOKS[lookTab].find(i => i.id === lookPeek);
    $('lookNote').textContent = !pk ? t(lookTab === 'charm' ? 'lookCharmNote' : lookTab === 'death' ? 'lookDeathNote' : 'lookTeamNote') : pk.shop ? t('lookPeekShop') : pk.pass ? t('lookPeekPass') : pk.elite ? t('lookPeekElite') : pk.acct ? t('lookPeekAcct') : pk.rank != null ? t('rkPeekLook', { t: t('rk_' + TIERS[pk.rank].id) }) : pk.ch ? t('lookPeekCh', { c: t('ch_' + pk.ch, { n: (UNLOCKS.find(x => x.id === pk.ch) || {}).n }) }) : t('lookPeekLvl', { n: pk.lvl });
    o.onLook?.(show, lookTeam);
    $('lookTabs').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true, vol: 0.6 }); lookTab = b.dataset.lt; lookPeek = null; renderLook(); });
    $('lookGrid').querySelectorAll('.lk-it').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (b.classList.contains('locked')) { lookPeek = lookPeek === id ? null : id; audio.play('ui_hover', { ui: true }); renderLook(); return; }
      lookPeek = null; saveLook({ ...getLook(), [lookTab]: id }); audio.play('swap', { ui: true, vol: 0.6 }); renderLook();
    });
  }
  // danças (05/11, pedido dele): pode ter todas, mas leva 3 pro podio. Toca em qualquer uma = o boneco dança ao lado, mesmo trancada (vitrine)
  let danceSlot = 0, danceShow = null;
  function renderDances() {
    const g = $('lookGrid'); g.classList.remove('swatches', 'banners');
    const worn = wornDances(S);
    g.innerHTML = `<div class="dn-slots">${worn.map((d, i) => `<button class="dn-slot ${i === danceSlot ? 'on' : ''}" data-s="${i}"><small>${t('dnSlot', { n: i + 1 })}</small>${t('dn_' + d)}</button>`).join('')}</div>` + DANCE_IDS.map(id => {
      const it = DANCE_INFO[id], open = danceOpen(id), on = worn.includes(id), fx = !!DANCES[id].fx;
      const lock = open ? '' : `<small class="lk-lock">${it.rank != null ? t('rkLock', { t: t('rk_' + TIERS[it.rank].id) }) : it.shop ? t('shopOnly') : it.pass ? t('lookPass') : t('lookLvl', { n: it.lvl })}</small>`;
      return `<button class="lk-it ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-d="${id}"><b>${t('dn_' + id)}</b><i class="lk-r r${it.r}">${t('rar' + it.r)}</i>${fx ? `<em class="dn-fx">${t('dnFx')}</em>` : ''}${lock}</button>`;
    }).join('');
    $('lookNote').textContent = t('dnNote');
    o.onLook?.(getLook(), lookTeam);
    $('lookTabs').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true, vol: 0.6 }); lookTab = b.dataset.lt; lookPeek = null; danceShow = null; renderLook(); });
    g.querySelectorAll('.dn-slot').forEach(b => b.onclick = () => { danceSlot = +b.dataset.s; audio.play('ui_click', { ui: true, vol: 0.6 }); renderDances(); });
    g.querySelectorAll('.lk-it').forEach(b => b.onclick = () => {
      const id = b.dataset.d; danceShow = id; o.previewDance?.(id);
      if (!b.classList.contains('locked')) { const cur = wornDances(S), was = cur.indexOf(id); if (was >= 0 && was !== danceSlot) cur[was] = cur[danceSlot]; cur[danceSlot] = id; S.dances = cur; o.saveSettings(); danceSlot = (danceSlot + 1) % 3; audio.play('swap', { ui: true, vol: 0.6 }); } else audio.play('ui_hover', { ui: true });
      renderDances();
    });
  }
  // banners (05/11): o que aparece pros outros quando voce derruba ou chama sequencia
  function renderBanners() {
    const lv = progressInfo().unlockLevel, cur = S.banner, who = rovex.me?.name || S.name || t('youCap');
    const g = $('lookGrid'); g.classList.remove('swatches'); g.classList.add('banners');
    g.innerHTML = BANNERS.filter(b => !b.mastery || bannerOpen(b.id)).map(b => { const open = bannerOpen(b.id); /* poster de mestre so aparece liberado */ return `<button class="bn-it ${b.id === cur ? 'on' : ''} ${open ? '' : 'locked'}" data-b="${b.id}" ${open ? '' : 'aria-disabled="true"'} aria-label="${t('bn_' + b.id)}">${bannerHtml(b.id, { name: who, lvl: progressInfo().level })}<span class="bn-cap"><b>${t('bn_' + b.id)}</b>${b.anim ? `<i>${t('bnAnim')}</i>` : ''}${open ? '' : `<small class="lk-lock">${b.shop ? t('shopOnly') : b.pass ? t('lookPass') : t('lookLvl', { n: b.lvl })}</small>`}</span></button>`; }).join('');
    $('lookNote').textContent = t('bnNote');
    $('lookTabs').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true, vol: 0.6 }); lookTab = b.dataset.lt; lookPeek = null; g.classList.remove('banners'); renderLook(); });
    g.querySelectorAll('.bn-it').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.4 }); return; } S.banner = b.dataset.b; o.saveSettings(); o.bannerChanged?.(); audio.play('swap', { ui: true, vol: 0.6 }); renderBanners(); });
    o.onLook?.(getLook(), lookTeam);
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

  // previa da mira embaixo dos status (05/11, pedido dele): so na aba Reticula. Vista pelo vidro, com a reticula e a cor atuais
  function drawRetPrev(lo, who, ret, col) {
    const box = $('retPrev'); if (!box) return;
    const big = who === 'main' && sightIsBig(lo.scope), r = ret && ret !== 'auto' ? ret : big ? 'duplex' : 'dot', c = RET_COLORS[col || 'red'];
    box.className = 'ret-prev ' + (big ? 'big' : 'near') + (who === 'canted' ? ' cant' : '') + (col === 'black' ? ' blk' : '');
    box.innerHTML = `<div class="rp-glass"><svg class="rp-view" viewBox="0 0 120 120" aria-hidden="true"><rect width="120" height="120" fill="#d9d4c7"/><path d="M0 72q20-16 44-6t40-4 36 6v52H0z" fill="#a8a296"/><path d="M0 84h120v36H0z" fill="#c9c2b2"/><path d="M50 56h20v30H50z" fill="#8c8578"/><circle cx="60" cy="48" r="9" fill="#141210"/><path d="M47 62q13-8 26 0v24H47z" fill="#141210"/></svg><span class="rp-ret" style="color:${c}">${retIcon(r, c)}</span></div><div class="rp-txt"><small>${t('retPrevTitle')}</small><b>${t(who === 'canted' ? 'retWho45' : 'retWhoMain')}</b><span>${t('ret_' + r)}</span></div>`;
    box.hidden = false;
    requestAnimationFrame(() => {
      if (box.hidden) return;
      const top = $('statBars').getBoundingClientRect().bottom + 10, b0 = ($('pickWrap').hidden ? $('slotList') : $('pickWrap')).getBoundingClientRect().top - 10;
      box.style.top = top + 'px'; box.style.maxHeight = Math.max(0, b0 - top) + 'px'; box.classList.toggle('tight', b0 - top < 96);
    });
  }
  function renderSmith() {
    if ($('retPrev')) $('retPrev').hidden = true;
    loadouts = getLoadouts();
    if (!arsenalReady()) {
      $('slotList').innerHTML = `<p class="hint">${t('loadingGuns')}</p>`;
      $('picker').innerHTML = ''; $('statBars').innerHTML = '';
      return;
    }
    syncOpen(openKeys());
    $('catTabs').innerHTML = CATS.map(c => `<button role="tab" aria-selected="${c === cat}" data-c="${c}">${t('cat_' + c)}${anyNew('arsenal|' + c + '|') ? newPill(t('chNew')) : ''}</button>`).join('')
      + `<button role="tab" class="cat-stk" aria-selected="${cat === 'nades'}" data-c="nades">${t('nadeTab')}</button>`
      + `<button role="tab" class="cat-stk" aria-selected="${cat === 'streaks'}" data-c="streaks">${t('stkTab')}</button>`;
    $('catTabs').querySelectorAll('button').forEach(b => b.onclick = () => { cat = b.dataset.c; slot = 'body'; picking = false; preview = null; audio.play('ui_click', { ui: true }); renderSmith(); });
    // aba Sequencias (02/11, pedido dele): troca o gunsmith pela escolha das sequencias de abate
    const stk = cat === 'streaks' || cat === 'nades';
    $('equipBar').hidden = stk; $('smith').hidden = stk; $('stkPane').hidden = !stk; if (stk) $('smithHint').hidden = true;
    if (cat === 'nades') { renderNadePick(); return; }
    if (stk) { renderStreakPick(); return; }
    // equipar: principal escolhida aqui, pistola sempre como secundaria
    const isPrimary = PRIMARIES.includes(cat);
    const equipped = isPrimary ? S.primary === cat || (!S.primary && cat === 'smg') : true;
    // cabecalho da arma (estilo gunsmith): nome grande + variante, nivel, e equipar do lado
    const loNow = loadouts[cat] || {};
    const modelName = loNow.ws && wsOwned(loNow.ws) ? t('ws_' + loNow.ws) : loNow.body ? partName('body', loNow.body) : wName(cat); /* skin de modelo: o nome dela */ // nome proprio do modelo montado
    const eqHtml = isPrimary
      ? (equipped ? `<p class="equipped">${t('eqDone', { w: modelName })}</p>` : `<button class="big" id="equipBtn">${t('eqPrimary', { w: modelName })}</button>`)
      : `<p class="equipped">${t(cat === 'melee' ? 'eqMelee' : 'eqSecondary', { w: wName(cat) })}</p>`;
    $('equipBar').innerHTML = `<div class="gs-id"><b class="gs-name">${modelName}</b>${cvOf(cat, loNow) && loNow.cvName ? `<span class="gs-bp cv">${esc(loNow.cvName)} <em class="cv-pill">${t('cvPill')}</em></span>` : loNow.bp ? `<span class="gs-bp">★ ${t(loNow.bp)}</span>` : ''}</div>` + eqHtml;
    const eb = $('equipBtn');
    if (eb) eb.onclick = () => { S.primary = cat; o.saveSettings(); audio.play('pickup', { ui: true, vol: 0.6 }); renderSmith(); };
    // mostra o que vale de verdade: peca salva que ainda esta bloqueada aparece como padrao
    const lo = unlockedLoadout(cat, loadouts[cat], partUnlocked, camoUnlocked, CAMOS);
    if (lo.tracer && !TRACER_STYLES.includes(lo.tracer)) lo.tracer = null; // tracado que nao existe (salvo errado)
    const C = CATEGORY[cat];
    const wi = wpnInfo(cat, lo.body); // nivel e do corpo (modelo) equipado: cada um tem o seu
    $('equipBar').insertAdjacentHTML('beforeend', `<div class="wlevel"><b>${t('bodyLevel', { m: partName('body', lo.body), n: wi.level })}</b><span class="xpbar"><i style="width:${wi.max ? 100 : Math.round(wi.into / wi.need * 100)}%"></i></span><small>${wi.max ? t('maxed') : wi.into + ' / ' + wi.need + ' XP'}</small><button class="wl-more" id="wlMore" aria-expanded="${ulkOpen}" aria-controls="ulkPane">${t(ulkOpen ? 'ulkHide' : 'ulkShow')}</button></div>`);
    if (ulkOpen) renderUnlocks(lo, C);
    $('wlMore').onclick = () => { ulkOpen = !ulkOpen; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSmith(); };
    // so mostra o pente quando o corpo aceita mais de um
    // lamina: so modelo e camuflagem; pente so quando o corpo aceita mais de um
    const hasBp = BP_ORDER.some(id => BLUEPRINTS[id].wpn === cat);
    const slots = cat === 'melee' ? ['body', isSaber(lo.body) ? 'accent' : 'camo'] /* sabre: so a cor do brilho */ : SLOTS.filter(s => (s !== 'canted' || cantedFits(cat, lo.body)) && (s !== 'charger' || chargerOptions(lo.body, cat).length > 1) && (s !== 'bp' || hasBp || cat !== 'melee') && (s !== 'conv' || convOptions(lo.body).length) && (s !== 'muzzle' || muzzleOptions(lo.body).length)); // kit e bocal so no modelo que tem
    if (!slots.includes(slot)) slot = 'body';
    $('slotList').innerHTML = slots.map(s => {
      const disabled = s === 'handle' && !C.handles.length;
      let val;
      if (s === 'bp') val = lo.ws && !lo.bp && !(cvOf(cat, lo) && lo.cvName) ? `<i class="cmini ws-dot"></i> ${t('ws_' + lo.ws)}` : cvOf(cat, lo) && lo.cvName ? `${esc(lo.cvName)} <em class="cv-pill">${t('cvPill')}</em>` : lo.bp ? `<i class="cmini" style="background:${CAMO_SWATCH[BLUEPRINTS[lo.bp].lo.camo]}"></i> ${t(lo.bp)}` : t('bpNone');
      else if (s === 'camo') { const cm = CAMOS.find(c => c.id === (lo.camo || 'none')) || CAMOS[0]; val = `<i class="cmini" style="background:${CAMO_SWATCH[cm.id]}"></i> ${t('camo_' + cm.id)}`; }
      else if (s === 'ammo') val = `<svg class="am-ico" viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[AMMO[lo.ammo]?.icon || 'radio_button_unchecked']}</svg> ${t('am_' + (lo.ammo || 'none'))}`;
      else if (s === 'tracer') val = `<i class="trsw tr-${lo.tracer || 'chalk'}"></i> ${t('tr_' + (lo.tracer || 'chalk'))}`;
      else if (s === 'visual') val = t('lk_charm_' + (getLook().charm || 'none'));
      else if (s === 'ret') val = lo.scope ? `<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${RET_COLORS[lo.retColor || 'red']};vertical-align:-1px;border:2px solid currentColor"></i> ${t('ret_' + (lo.ret || 'auto'))}` : t('ret_none');
      else if (s === 'paint' || s === 'accent') val = lo[s] ? `<i style="display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid currentColor;background:${lo[s]};vertical-align:-2px"></i> ${lo[s]}` : t('original');
      else val = partName(s, s === 'charger' ? (lo.charger || nativePart(lo.body, 'charger')) : lo[s]);
      return `<button class="slot slot-${s} ${s === 'bp' && (lo.bp || cvOf(cat, lo)) ? 'set' : ''} ${disabled ? 'disabled' : ''}" data-s="${s}" ${disabled ? 'aria-disabled="true"' : ''}><small>${t(SLOT_LABEL[s])}${anyNew(s === 'visual' ? 'look|charm|' : 'arsenal|' + cat + '|' + s + '|') ? newPill(t('chNew')) : ''}</small><span>${val}</span></button>`;
    }).join('');
    $('slotList').querySelectorAll('.slot').forEach(b => b.onclick = () => { if (b.classList.contains('disabled')) return; slot = b.dataset.s; picking = true; preview = null; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSmith(); });
    // blocos de pecas OU a lista de opcoes do slot escolhido (o painel troca, nao empilha)
    $('slotList').hidden = picking; $('pickWrap').hidden = !picking;
    { let seen = false; try { seen = !!localStorage.getItem('rr_smith_hint'); } catch { /* */ } $('smithHint').hidden = picking || seen; }
    $('smith').classList.toggle('picking', picking);
    $('pickTitle').textContent = t(SLOT_LABEL[slot]);
    $('pickBack').onclick = () => { picking = false; preview = null; audio.play('ui_back', { ui: true, vol: 0.6 }); renderSmith(); };
    const view = !preview ? lo : preview.k === 'bp' ? { ...lo, ...bpLoadout(preview.v) }
      : { ...lo, [preview.k]: preview.v, ...(preview.k === 'body' ? { charger: null } : {}) };
    if (preview) $('equipBar').insertAdjacentHTML('beforeend', preview.k === 'camo' && CAMOS.find(c => c.id === preview.v)?.acct ? `<p class="peek-note">${t('acctCamo')} <a href="${rovex.AUTH_URL}" target="_top" rel="noopener">${t('gpChip')}</a></p>` : `<p class="peek-note">${t('peekNote')}</p>`);
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
    o.onSmith(buildGun(cat, view), cat, preview?.k === 'charm' ? preview.v : getLook().charm);
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
  const PER_BODY = ['scope', 'charger', 'handle', 'laser', 'ammo', 'tracer', 'camo', 'paint', 'accent', 'ret', 'retColor', 'ret45', 'retColor45', 'bp', 'cv', 'cvName', 'ws']; // cv: a variante do jogador volta junto quando ele volta pro modelo
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
  let retWho = 'main'; // chave da reticula: mexe na mira principal ou na de 45 graus
  function setPart(k, v) {
    preview = null;
    const lo = loadouts[cat];
    if (k === 'body' && v !== lo.body) swapBody(lo, v);
    lo[k] = v;
    if (k === 'paint') lo.accent = v; // 05/11, pedido dele: uma cor so pinta tudo (modelo novo pode nao ter parte verde)
    // mexeu numa peca na mao: deixa de ser a variante (camo, cor e tracado podem trocar sem perder)
    if (['body', 'scope', 'charger', 'handle', 'laser', 'conv', 'muzzle'].includes(k)) delete lo.bp;
    // variante do jogador equipada: mexeu, a variante se atualiza sozinha e sobe pra conta (02/11, pedido dele)
    // trocou de MODELO: a variante e do modelo antigo, entao sai (nunca vira variante do modelo novo)
    if (k !== 'bp' && lo.cv) {
      const all = getVariants(), v = (all[cat] || []).find(x => x.id === lo.cv);
      if (v && v.lo.body === lo.body && k !== 'body') { v.lo = cvPick(lo); saveVariants(all); }
      else if (!v || v.lo.body !== lo.body) { delete lo.cv; delete lo.cvName; }
    }
    if (k === 'body' && cat === 'sniper' && !lo.scope) lo.scope = nativePart(v, 'scope');
    saveLoadouts(loadouts);
    o.loadoutsChanged(loadouts);
    audio.play('swap', { vol: 0.5 });
    renderSmith();
  }

  // ---------- variantes do jogador (02/11) ----------
  // campos da montagem que entram na variante (tudo que muda a arma; o 'saved' por modelo nao)
  const CV_KEYS = ['body', 'scope', 'charger', 'handle', 'laser', 'muzzle', 'conv', 'ammo', 'tracer', 'camo', 'paint', 'accent', 'ret', 'retColor', 'ret45', 'retColor45', 'bp', 'ws'];
  const cvPick = (lo) => Object.fromEntries(CV_KEYS.filter(k => lo[k] != null).map(k => [k, lo[k]]));
  // skins de MODELO da Loja (04/11): aparecem como variante com o nome delas, so no modelo que elas trocam
  function wsHtml(lo) {
    const ids = wsFor(lo.body);
    if (!ids.length) return '';
    const opt = (id) => { const own = wsOwned(id), on = lo.ws === id;
      return `<button class="opt bp ws ${on ? 'on' : ''} ${own ? '' : 'locked'}" data-ws="${id}" ${own ? '' : 'aria-disabled="true"'}><i class="cswatch ws-dot"></i><span class="bp-name">${t('ws_' + id)}</span><small>${t(own ? 'wsSub' : 'shopOnly')}</small></button>`; };
    return `<div class="cv-block"><p class="pk-h">${t('wsTitle')}</p>${lo.ws ? `<button class="opt bp ws-off" data-ws="">${t('wsOff')}<small>${esc(partName('body', lo.body))}</small></button>` : ''}${ids.map(opt).join('')}</div>`;
  }
  function customVariantsHtml(lo) {
    const list = (getVariants()[cat] || []).filter(v => v.lo.body === lo.body); // so as deste modelo
    const full = list.length >= VARIANT_MAX;
    const items = list.map(v => {
      const on = lo.cv === v.id, sw = CAMO_SWATCH[v.lo.camo || 'none'] || 'transparent';
      return `<div class="opt cv ${on ? 'on' : ''}"><button class="cv-use" data-cv="${esc(v.id)}"><i class="cswatch" style="background:${sw}"></i><span class="bp-name">${esc(v.name)} <em class="cv-pill">${t('cvPill')}</em></span><small>${esc(partName('body', v.lo.body))}</small></button>`
        + `<span class="cv-acts"><button class="cv-upd" data-cv="${esc(v.id)}">${t('cvUpdate')}</button><button class="cv-del" data-cv="${esc(v.id)}" aria-label="${esc(t('cvDel', { n: v.name }))}">${t('cvDelShort')}</button></span></div>`;
    }).join('');
    const form = full ? `<p class="cv-full">${t('cvFull', { n: VARIANT_MAX })}</p>`
      : `<form class="cv-new" id="cvForm" autocomplete="off"><label for="cvName">${t('cvSaveLbl')}</label><span class="cv-row"><input id="cvName" maxlength="20" placeholder="${esc(t('cvPh'))}" spellcheck="false"><button type="submit" class="cv-save">${t('cvSave')}</button></span></form>`;
    return `<div class="cv-block"><p class="pk-h">${t('cvTitle')}</p>${form}${items}</div><p class="pk-h">${t(BP_ORDER.some(id => BLUEPRINTS[id].wpn === cat) ? 'cvElite' : 'cvBase')}</p>`;
  }
  function wireCustomVariants(shown) {
    const all = getVariants(), list = all[cat] ||= [];
    const lo = loadouts[cat];
    if (list.filter(v => v.lo.body === shown.body).length >= VARIANT_MAX) { const f0 = $('cvForm'); if (f0) f0.hidden = true; } // teto por modelo // grava na montagem salva (a da tela e uma copia filtrada pelo que ja abriu)
    const apply = (v) => { if (v.lo.body !== lo.body) swapBody(lo, v.lo.body); for (const k of CV_KEYS) delete lo[k]; Object.assign(lo, v.lo, { cv: v.id, cvName: v.name }); };
    const done = (sfx) => { saveLoadouts(loadouts); o.loadoutsChanged(loadouts); audio.play(sfx, { vol: 0.5, ui: true }); renderSmith(); };
    const f = $('cvForm');
    if (f) f.onsubmit = (e) => {
      e.preventDefault();
      const name = $('cvName').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
      if (!name) { $('cvName').focus(); $('cvName').classList.add('bad'); return; }
      const v = { id: 'cv' + Date.now().toString(36), name, lo: cvPick(shown) };
      list.push(v); saveVariants(all); Object.assign(lo, { cv: v.id, cvName: name }); done('unlock');
    };
    $('picker').querySelectorAll('.cv-use').forEach(b => b.onclick = () => { const v = list.find(x => x.id === b.dataset.cv); if (v) { preview = null; apply(v); done('swap'); } });
    $('picker').querySelectorAll('.cv-upd').forEach(b => b.onclick = () => { const v = list.find(x => x.id === b.dataset.cv); if (!v) return; v.lo = cvPick(shown); saveVariants(all); Object.assign(lo, { cv: v.id, cvName: v.name }); done('pickup'); });
    $('picker').querySelectorAll('.cv-del').forEach(b => b.onclick = () => {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = t('cvDelSure'); return; } // segundo toque apaga
      all[cat] = list.filter(x => x.id !== b.dataset.cv); saveVariants(all);
      if (lo.cv === b.dataset.cv) { delete lo.cv; delete lo.cvName; }
      done('ui_back');
    });
  }

  // variante de elite: aplica a montagem inteira (pecas + camo lendaria) de uma vez
  function setVariant(id) {
    preview = null;
    const lo = loadouts[cat];
    delete lo.cv; delete lo.cvName;
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
      p.innerHTML = wsHtml(lo) + customVariantsHtml(lo) + `<button class="opt bp-free ${!lo.bp && !lo.cv ? 'on' : ''}" data-bp="">${t('bpNone')}<small>${t('bpNoneSub')}</small></button>` + BP_ORDER.filter(id => BLUEPRINTS[id].wpn === cat).map(id => {
        const B = BLUEPRINTS[id], open = bpUnlocked(id), cur = lo.bp === id;
        const mods = Object.entries(B.mods).map(([k, v]) => `<b class="${good(k, v) ? 'up' : 'down'}">${good(k, v) ? '+' : '−'} ${t(MOD_TXT[k])}</b>`).join('');
        const lock = open ? '' : `<small class="req-ch">${el.reward === id && !el.done ? t('bpToday', { c: t('el_' + el.id, { n: el.n }) }) : t('bpLocked')}</small>${el.reward === id ? `<span class="ubar"><i style="width:${Math.round(el.prog / el.n * 100)}%"></i></span>` : ''}`;
        return `<button class="opt bp ${cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'bp' && preview.v === id ? 'peek' : ''}" data-bp="${id}" ${open ? '' : 'aria-disabled="true"'}><i class="cswatch anim" style="background:${CAMO_SWATCH[B.lo.camo]}"></i><span class="bp-name">${t(id)}</span><small>${t('bpSub', { c: t('camo_' + B.lo.camo) })}</small><span class="fx">${mods}</span>${lock}</button>`;
      }).join('');
      p.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => {
        if (b.classList.contains('locked')) { peek('bp', b.dataset.bp); return; }
        setVariant(b.dataset.bp || null);
      });
      wireCustomVariants(lo);
      p.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => {
        if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.5 }); return; }
        const L = loadouts[cat]; preview = null;
        if (b.dataset.ws) L.ws = b.dataset.ws; else delete L.ws;
        saveLoadouts(loadouts); o.loadoutsChanged(loadouts); audio.play(b.dataset.ws ? 'unlock' : 'swap', { vol: 0.5, ui: true }); renderSmith();
      });
      return;
    }
    if (slot === 'camo') {
      // uma secao por origem, cada uma com o titulo uma vez so (04/11: ordenar antes; a lista de CAMOS mistura as origens)
      const CG = ['static', 'anim', 'react', 'rank', 'special', 'legend', 'pass', 'shop', 'shopreact'];
      const grp = (c) => c.pass ? 'pass' : c.shop ? (c.react ? 'shopreact' : 'shop') : c.rank != null ? 'rank' : c.legend ? 'legend' : c.prestige || c.meta || c.acct ? 'special' : c.react ? 'react' : c.anim ? 'anim' : 'static';
      p.innerHTML = CG.map(g => { const L = CAMOS.filter(c => grp(c) === g); return L.length ? `<p class="pk-h">${t('cg_' + g)}</p>` + L.map(camoOpt).join('') : ''; }).join('');
      function camoOpt(c) {
        const open = camoUnlocked(cat, c), cur = (lo.camo || 'none') === c.id;
        const lockC = !open && LOCKED_BY[c.id];
        // camo sem req (prestigio): sem esse caso o c.req.player quebrava a lista inteira (ficava a lista anterior na tela)
        const req = c.acct && !open ? t('acctCamo') : c.pass && !open ? t('passOnly', { n: c.pass }) : c.shop && !open ? t('shopOnly') : c.rank != null && !open ? t('rkLock', { t: t('rk_' + TIERS[c.rank].id) }) : c.elite && !open ? t('eliteOnly') : c.meta && !open ? t('metaOnly') : c.legend && !open ? t('bpLocked') : c.prestige && !open ? t('prestOnly') : !c.req && !open ? t('bpLocked') : lockC ? (unlockActive(lockC.id) ? `${t('reqCh')}: ${chName(lockC)}` : t('reqQueue')) : !open ? (c.req.player && c.req.wpn ? t('reqBoth', { p: c.req.player, w: c.req.wpn }) : c.req.player ? t('reqPlayer', { n: c.req.player }) : t('reqWpn', { n: c.req.wpn })) : (c.anim ? t('animated') : '');
        const bar = open || c.acct || c.shop || c.legend || c.meta || c.elite || c.rank != null || (!c.req && !lockC) ? '' : `<span class="ubar"><i style="width:${Math.round((lockC ? unlockProg(lockC.id) : reqProgress(cat, c.req)) * 100)}%"></i></span>`;
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
        const lock = open ? '' : !lk ? `<small>${t('reqWpn', { n: AMMO_LVL[id] || 1 })}</small>` : `<small class="req-ch">${unlockActive(lk.id) ? t('reqCh') + ': ' + chName(lk) : t('reqQueue')}</small><span class="ubar"><i style="width:${Math.round(unlockProg(lk.id) * 100)}%"></i></span>`;
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
    if (slot === 'visual') {
      // secao Visual (05/11, pedido dele): reticula e chaveiro juntos; adesivos e contador de mortes ainda vem
      const hasMain = !!lo.scope && !IRONS[lo.scope], hasRet = hasMain || !!lo.canted; if (visTab === 'ret' && !hasRet) visTab = 'charm';
      if (!lo.canted) retWho = 'main'; else if (!hasMain) retWho = 'canted';
      const kRet = retWho === 'canted' ? 'ret45' : 'ret', kCol = retWho === 'canted' ? 'retColor45' : 'retColor';
      const whoSw = lo.canted && hasMain ? `<div class="ret-who"><small>${t('retWho')}</small><span class="seg" role="group" aria-label="${t('retWho')}"><button data-who="main" aria-pressed="${retWho === 'main'}">${t('retWhoMain')}</button><button data-who="canted" aria-pressed="${retWho === 'canted'}">${t('retWho45')}</button></span></div>` : '';
      const tabs = `<div class="vis-tabs" role="tablist"><button role="tab" data-v="ret" aria-selected="${visTab === 'ret'}" ${hasRet ? '' : 'disabled'}>${t('slot_ret')}</button><button role="tab" data-v="charm" aria-selected="${visTab === 'charm'}">${t('visCharms')}</button><span class="vis-soon">${t('visStickers')}<small>${t('visSoon')}</small></span><span class="vis-soon">${t('visKills')}<small>${t('visSoon')}</small></span></div>`;
      const bind = () => p.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { visTab = b.dataset.v; preview = null; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSmith(); });
      if (visTab === 'charm') {
        const cur = getLook().charm || 'none';
        const lockOf = (it) => it.rank != null ? t('rkLock', { t: t('rk_' + TIERS[it.rank].id) }) : it.shop ? t('shopOnly') : it.pass ? t('lookPass') : it.elite ? t('lookElite') : it.acct ? t('lookAcct') : t('lookLvl', { n: it.lvl });
        p.innerHTML = tabs + LOOKS.charm.filter(it => !it.mastery || (it.mastery === lo.body && lookOpen('charm', it.id))).map(it => { /* miniatura de ouro: so a do modelo aberto e so de quem e mestre dele */ const open = lookOpen('charm', it.id); return `<button class="opt ${cur === it.id ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'charm' && preview.v === it.id ? 'peek' : ''}" data-ch="${it.id}" ${open ? '' : 'aria-disabled="true"'}>${t('lk_charm_' + it.id)}${isNew('look|charm|' + it.id) ? newPill(t('chNew')) : ''}<br><i class="lk-r r${it.r}">${t('rar' + it.r)}</i>${open ? '' : `<br><small>${lockOf(it)}</small>`}</button>`; }).join('') + `<p class="vis-note">${t('lookCharmNote')}</p>`;
        p.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const id = b.dataset.ch; if (b.classList.contains('locked')) { peek('charm', id); return; } preview = null; saveLook({ ...getLook(), charm: id }); audio.play('swap', { ui: true, vol: 0.6 }); renderSmith(); });
        markSeen('look|charm|'); bind(); return;
      }
      const longFirst = retWho === 'main' && sightIsBig(lo.scope);
      const retBtn = (r) => { const open = retOwned(r); return `<button class="opt ${(lo[kRet] || 'auto') === r ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === kRet && preview.v === r ? 'peek' : ''}" data-r="${r}" ${open ? '' : 'aria-disabled="true"'}>${retIcon(r)}<br>${t('ret_' + r)}${open ? '' : `<br><small>${t('retShop')}</small>`}</button>`; };
      const rows = [[t('retRowShort'), ['auto', ...RET_ROW_SHORT]], [t('retRowLong'), RET_ROW_LONG]]; if (longFirst) { rows.reverse(); rows[0][1] = ['auto', ...RET_ROW_LONG]; rows[1][1] = RET_ROW_SHORT; }
      p.innerHTML = tabs + whoSw + rows.map(([h, list]) => `<h4 class="pk-h">${h}</h4>${list.map(retBtn).join('')}`).join('') +
        `<div class="ret-cols"><small>${t('retColor')}</small>` + Object.entries(RET_COLORS).map(([k, c]) => `<button class="swatch ${(lo[kCol] || 'red') === k ? 'on' : ''} ${retColorOwned(k) ? '' : 'locked'}" style="background:${c}" data-col="${k}" ${retColorOwned(k) ? '' : `aria-disabled="true" title="${t('passOnly', { n: RET_PASS[k] })}"`} aria-label="${t('retColor')} ${k}"></button>`).join('') + '</div>';
      p.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek(kRet, b.dataset.r); return; } setPart(kRet, b.dataset.r === 'auto' ? null : b.dataset.r); });
      p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek(kCol, b.dataset.col); return; } setPart(kCol, b.dataset.col); });
      p.querySelectorAll('[data-who]').forEach(b => b.onclick = () => { retWho = b.dataset.who; preview = null; audio.play('ui_click', { ui: true, vol: 0.6 }); renderSmith(); });
      drawRetPrev(lo, retWho, preview?.k === kRet ? preview.v : lo[kRet], preview?.k === kCol ? preview.v : lo[kCol]);
      bind(); return;
    }
    if (slot === 'ret') {
      p.innerHTML = ['auto', ...RETICLES].map(r => { const open = retOwned(r); return `<button class="opt ${(lo.ret || 'auto') === r ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'ret' && preview.v === r ? 'peek' : ''}" data-r="${r}" ${open ? '' : 'aria-disabled="true"'}>${retIcon(r)}<br>${t('ret_' + r)}${open ? '' : `<br><small>${t('retShop')}</small>`}</button>`; }).join('') +
        `<div class="ret-cols"><small>${t('retColor')}</small>` + Object.entries(RET_COLORS).map(([k, c]) => `<button class="swatch ${(lo.retColor || 'red') === k ? 'on' : ''} ${retColorOwned(k) ? '' : 'locked'}" style="background:${c}" data-col="${k}" ${retColorOwned(k) ? '' : `aria-disabled="true" title="${t('passOnly', { n: RET_PASS[k] })}"`} aria-label="${t('retColor')} ${k}"></button>`).join('') + '</div>';
      p.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek('ret', b.dataset.r); return; } setPart('ret', b.dataset.r === 'auto' ? null : b.dataset.r); });
      p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek('retColor', b.dataset.col); return; } setPart('retColor', b.dataset.col); });
      return;
    }
    if (slot === 'paint' || slot === 'accent') {
      // 07/11 (pedido dele): cores abrem pelo nivel DA ARMA (a padrao, branca, ja vem); cor livre no fim da progressao
      const cur = lo[slot], wl = progressInfo().unlockAll ? 99 : wpnLevel(cat, lo.body), lvOf = (i) => PAINT_LVL0 + i * PAINT_STEP, freeOk = wl >= PAINT_FREE;
      p.innerHTML = `<button class="swatch none ${!cur ? 'on' : ''}" data-c="">${t('original')}</button>` +
        PAINTS.map((c, i) => { const ok = wl >= lvOf(i); return `<button class="swatch ${cur === c ? 'on' : ''} ${ok ? '' : 'locked'}" style="background:${c}" data-c="${c}" ${ok ? '' : `aria-disabled="true" data-lv="${lvOf(i)}" title="${t('skLvl', { n: lvOf(i) })}"`} aria-label="Cor ${c}">${ok ? '' : `<small class="sw-lv">${lvOf(i)}</small>`}</button>`; }).join('') +
        `<label class="swatch none ${freeOk ? '' : 'locked'}" title="${freeOk ? 'Cor livre' : t('skLvl', { n: PAINT_FREE })}" style="display:grid;place-items:center">${freeOk ? t('free') : t('skLvl', { n: PAINT_FREE })}<input type="color" value="${cur || '#5f8f3a'}" ${freeOk ? '' : 'disabled'}></label>`;
      p.querySelectorAll('button.swatch').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.5 }); return; } setPart(slot, b.dataset.c || null); });
      p.querySelector('input[type=color]').onchange = (e) => setPart(slot, e.target.value);
      return;
    }
    let opts;
    if (slot === 'body') opts = C.bodies;
    else if (slot === 'scope') opts = cat === 'sniper' ? [null, ...C.scopes] : [...ironOptions(cat), null, ...C.scopes].filter(x => x !== null); // sem 'Mira de ferro': o padrao e a de trilho
    else if (slot === 'charger') opts = chargerOptions(lo.body, cat);
    else if (slot === 'laser') opts = [null, ...LASERS];
    else if (slot === 'conv') opts = [null, ...convOptions(lo.body)];
    else if (slot === 'muzzle') opts = [null, ...muzzleOptions(lo.body)];
    else opts = [null, ...C.handles.filter(h => handleFits(lo.body, cat, h))];
    const cur = slot === 'charger' ? (lo.charger || nativePart(lo.body, 'charger')) : slot === 'scope' && !lo.scope && cat !== 'sniper' ? 'iron_own' : lo[slot];
    p.innerHTML = opts.map((id, i0) => {
      const i = slot === 'scope' ? [null, ...C.scopes].indexOf(id) : slot === 'handle' ? [null, ...C.handles].indexOf(id) : i0; /* 04/11: a lista de empunhaduras vem filtrada; pelo indice dela a peca aparecia aberta e a validacao tirava ao equipar */ // nivel da mira pelo lugar na lista original (as de trilho entraram na frente)
      if (slot === 'scope' && !scopeFits(lo.body, cat, id)) return ''; // mira que nao cabe (sniper: so luneta)
      const open = slot === 'muzzle' ? !id || partUnlocked(cat, i, 'mz:' + id) : IRONS[id] || partUnlocked(cat, i, id) || (slot === 'scope' && !!id && id === freeScope(cat, lo.body));
      const lockCh = !open && id && (LOCKED_BY[cat + ':' + id] || LOCKED_BY[id]);
      // pros e contras da peca (estilo COD), so em pente e empunhadura
      const fx = (slot === 'charger' || slot === 'handle' || slot === 'laser' || slot === 'conv' || slot === 'muzzle') && id ? partEffects(cat, lo, slot, id) : [];
      const fxHtml = fx.length ? `<span class="fx">${fx.slice(0, 4).map(([k, v]) => `<b class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'} ${t(k)}</b>`).join('')}</span>` : '';
      const pill = slot === 'body' ? modePill(id) + (open ? `<small class="blv">${t('lvlShort', { n: wpnLevel(cat, id) })}</small>` : '') : '';
      return `<button class="opt ${id === cur ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === slot && preview.v === id ? 'peek' : ''}" data-id="${id ?? ''}" ${open ? '' : 'aria-disabled="true"'}>${partName(slot, id)}${pill}${slot === 'charger' && id === nativePart(lo.body, 'charger') ? `<br><small>${t('origTag')}</small>` : ''}${fxHtml}${open ? '' : lockCh ? `<small class="req-ch">${unlockActive(lockCh.id) ? t('reqCh') + ': ' + chName(lockCh) : t('reqQueue')}</small><span class="ubar"><i style="width:${Math.round(unlockProg(lockCh.id) * 100)}%"></i></span>` : BODY_MIN_LVL[id] ? `<small>${t('lookLvl', { n: BODY_MIN_LVL[id] })}</small>` : (() => { const rq = slot === 'muzzle' ? MUZZLE_LVL[id] : partReq(i, id); return `<small>${t('reqWpn', { n: rq })}</small><span class="ubar"><i style="width:${Math.round(reqProgress(cat, { wpn: rq }) * 100)}%"></i></span>`; })()}</button>`;
    }).join('');
    // mira de 45 graus: na secao Miras, uma linha abaixo (05/11, pedido dele)
    if (slot === 'scope' && cantedFits(cat, loadouts[cat]?.body)) {
      const open = partUnlocked(cat, 1, 'canted');
      p.insertAdjacentHTML('beforeend', `<div class="scope-cant"><small>${t('slot_canted')}</small><button class="opt cant-opt ${lo.canted ? '' : 'on'}" data-cant="">${t('cantedOff')}</button><button class="opt cant-opt ${lo.canted ? 'on' : ''} ${open ? '' : 'locked'} ${preview?.k === 'canted' ? 'peek' : ''}" data-cant="1" ${open ? '' : 'aria-disabled="true"'}>${t('cantedOn')}${open ? '' : `<br><small>${t('reqWpn', { n: CANTED_LVL })}</small>`}</button><p class="vis-note">${t('cantedNote')}</p></div>`);
      p.querySelectorAll('[data-cant]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { peek('canted', true); return; } setPart('canted', b.dataset.cant ? true : null); });
    }
    p.querySelectorAll('.opt:not(.cant-opt)').forEach(b => {
      b.onclick = () => { if (b.classList.contains('locked')) { peek(slot, b.dataset.id || null); return; } setPart(slot, b.dataset.id || null); };
      b.onpointerenter = () => audio.play('ui_hover', { ui: true, vol: 0.3, key: 'hover', max: 1 });
    });
  }

  // granadas (04/11, pedido dele): uma letal (G) e uma tatica (F), escolhidas em cartas como as sequencias
  function renderNadePick() {
    const lv = progressInfo().unlockLevel, open = (id) => lv >= (NADES[id].lvl || 0);
    const L = LETHALS.includes(S.lethal) ? S.lethal : 'frag', T = TACTICALS.includes(S.tactical) && open(S.tactical) ? S.tactical : 'flash';
    const card = (id, on, grp) => `<button class="stk-card ${on ? 'on' : ''} ${open(id) ? '' : 'locked'}" data-n="${id}" data-g="${grp}" aria-pressed="${on}" ${open(id) ? '' : 'aria-disabled="true"'}><svg class="stk-ico" viewBox="0 0 48 48" aria-hidden="true">${NADE_SVG[id]}</svg><b class="stk-name">${t('n_' + id)}</b><span class="stk-d">${open(id) ? t('nd_' + id) : t('lookLvl', { n: NADES[id].lvl })}</span></button>`;
    $('stkPane').innerHTML = `<p class="stk-hint">${t('nadeHint')}</p><h3 class="nade-h">${t('nadeLethal')}</h3><div class="stk-cards" role="radiogroup">${LETHALS.map(id => card(id, id === L, 'l')).join('')}</div>`
      + `<h3 class="nade-h">${t('nadeTac')}</h3><div class="stk-cards" role="radiogroup">${TACTICALS.map(id => card(id, id === T, 't')).join('')}</div>`;
    $('stkPane').querySelectorAll('[data-n]').forEach(b => b.onclick = () => { if (b.classList.contains('locked')) { audio.play('empty', { ui: true, vol: 0.4 }); return; } if (b.dataset.g === 'l') S.lethal = b.dataset.n; else S.tactical = b.dataset.n; o.saveSettings(); audio.play('ui_click', { ui: true }); renderNadePick(); });
  }

  // sequencias de abate: cartas com selo, abates e o que faz; tocar liga/desliga (no maximo STREAK_PICK)
  function renderStreakPick() {
    const mine = pickStreaks(S.streaks), pav = 0;
    $('stkPane').innerHTML = `<p class="stk-hint">${t('stkHint', { n: STREAK_PICK })} <b>${t('stkPicked', { n: mine.length, m: STREAK_PICK })}</b></p>`
      + `<div class="stk-cards" role="group" aria-label="${t('stkTab')}">` + Object.entries(STREAKS).map(([id, st]) => {
        const on = mine.includes(id);
        return `<button class="stk-card ${on ? 'on' : ''}" data-s="${id}" aria-pressed="${on}"><svg class="stk-ico" viewBox="0 0 48 48" aria-hidden="true">${STREAK_SVG[id] || ''}</svg>`
          + `<b class="stk-name">${t('s_' + id)}</b><small class="stk-k">${t('stkKills', { n: st.kills - pav })}</small><span class="stk-d">${t('sd_' + id)}</span></button>`;
      }).join('') + `</div>`;
    $('stkPane').querySelectorAll('.stk-card').forEach(b => b.onclick = () => {
      const id = b.dataset.s, cur = pickStreaks(S.streaks);
      if (cur.includes(id)) { if (cur.length <= 1) return; S.streaks = cur.filter(k => k !== id); }
      else if (cur.length >= STREAK_PICK) { audio.play('ui_back', { ui: true }); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); $('stkPane').querySelector('.stk-hint b').textContent = t('stkFull'); return; }
      else S.streaks = [...cur, id];
      o.saveSettings(); audio.play('ui_click', { ui: true }); renderStreakPick();
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
    // lamina: so o que vale pra ela (sem pente, recarga, mira nem zoom)
    const reach = (l) => bodyTrait(l.body)?.range || W.range;
    const rows = cat === 'melee' ? [
      [t('st_dmg'), W.dmg, W.dmg, W.dmg],
      [t('st_rate'), 1 / (W.rate * st.rate), 1 / (W.rate * base.rate), 3],
      [t('st_range'), reach(lo), reach(defaultLoadout(cat)), 4],
      [t('st_move'), st.move, base.move, 1.1],
    ] : [
      [t('st_dmg'), W.dmg * (W.pellets || 1) * st.dmg, W.dmg * (W.pellets || 1) * base.dmg, 130],
      [t('st_rate'), 1 / (W.rate * st.rate), 1 / (W.rate * base.rate), 16],
      [t('st_acc'), 1 / (W.spread * st.spread + 0.004), 1 / (W.spread * base.spread + 0.004), 70],
      [t('st_hip'), 1 / (W.spread * st.spread * st.hip + 0.004), 1 / (W.spread * base.spread * base.hip + 0.004), 70],
      [t('st_ctrl'), 1 / (W.kick * st.kick), 1 / (W.kick * base.kick), 60],
      [t('st_ads'), 1 / st.adsTime, 1 / base.adsTime, 1.2],
      [t('st_reload'), 1 / (W.reload * st.reload), 1 / (W.reload * base.reload), 1.2],
      [t('st_move'), st.move * (W.moveK || 1), base.move * (W.moveK || 1), 1.1],
      [t('st_mag'), Math.round(W.mag * st.mag), Math.round(W.mag * base.mag), 48],
      [t('st_zoom'), st.zoom || W.zoom, base.zoom || W.zoom, 7],
      ...(W.heat ? [[t('st_heat'), W.heat.shots / (st.heatK ?? 1), W.heat.shots / (base.heatK ?? 1), 100]] : []),
    ];
    $('statBars').classList.toggle('dense', picking || rows.length > 10); // lista aberta ou linha a mais (Metralhadora): compacta, nada de cortar a ultima
    $('statBars').innerHTML = `<div class="fmrow">${modePill(lo.body)}</div>` + rows.map(([n, v, b, max]) => {
      const pct = Math.min(100, v / max * 100);
      const d = v - b, rel = b ? d / b : 0;
      const cls = Math.abs(rel) < 0.01 ? '' : rel > 0 ? 'up' : 'down';
      const txt = n === t('st_range') ? v.toFixed(1) + ' m' : n === t('st_mag') ? v : n === t('st_zoom') ? v.toFixed(1) + 'x' : n === t('st_heat') ? Math.round(v) : (Math.abs(rel) < 0.01 ? '=' : (rel > 0 ? '+' : '') + Math.round(rel * 100) + '%');
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
      '';
    // prestigio (04/11, pedido dele): banner grande no cartaz, no lugar do aviso da Elite (o botao antigo ficava embaixo do
    // selo de nivel e o cartaz cortava). E um <button>: mouse, toque e controle (A) funcionam; 2o toque confirma
    let pb = document.getElementById('prestGo');
    if (pi.canPrestige && !pb) {
      pb = document.createElement('button'); pb.id = 'prestGo'; pb.className = 'prest-banner';
      const at = document.getElementById('elitePromo'); at ? at.before(pb) : document.querySelector('.poster-frame').appendChild(pb);
    }
    if (!pi.canPrestige && pb) { pb.remove(); pb = null; }
    if (pb && pb.dataset.sure !== '1') pb.innerHTML = `<span class="pb-star" aria-hidden="true">?</span><span class="pb-txt"><b>${t('prestReady')}</b><small>${t('prestReadySub', { n: pi.prestige + 1 })}</small></span><span class="pb-go" aria-hidden="true">?</span>`;
    const go = document.getElementById('prestGo');
    if (go) go.onclick = () => {
      if (go.dataset.sure !== '1') { go.dataset.sure = '1'; go.innerHTML = `<span class="pb-star" aria-hidden="true">?</span><span class="pb-txt"><b>${t('prestSure')}</b></span>`; audio.play('ui_click', { ui: true }); clearTimeout(go.sureT); go.sureT = setTimeout(() => { go.dataset.sure = ''; drawLevel(); }, 5000); return; }
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
    relangAnn();
  };
  return ui;
}

// desenho pequeno de cada reticula pra lista do arsenal
function retIcon(r, c = '#d8453a') {
  const k = 'stroke="currentColor" stroke-width="2" fill="none"';
  const P = RET_PATH[r];
  if (P) return `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">${P.s ? `<path d="${P.s}" stroke="${c}" stroke-width="2" fill="none"/>` : ''}${P.f ? `<path d="${P.f}" fill="${c}" fill-rule="evenodd"/>` : ''}</svg>`;
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
