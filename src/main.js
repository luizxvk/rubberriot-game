import * as THREE from 'three';
import { offscreen } from './offscreen.js';
import { buildWorld, buildObjectives, FX, LASER_BODY } from './world.js';
import { EscortView } from './escortview.js';
import { rankResult, TIERS, myTier, tierOf, badgeSvg } from './rank.js';
import { Character } from './character.js';
import { MobChar } from './mobchar.js';
import { Flashlights } from './flashlight.js';
import { GunLights } from './gunlights.js';
let flash = null; // lanterna (so no Estudio Tinteiro escuro)
let gunL = null; // lanterna de arma + reflexo de luneta (04/11)
import { ViewModel } from './viewmodel.js';
import { makePipeline } from './post.js';
import { Tutorial, keyLabel } from './tutorial.js';
import { Range } from './range.js';
import { trainBox } from '../shared/escort.js';
import { heistBoxes } from '../shared/heist.js';
import { borDoorBoxes } from '../shared/borroes.js';
import { useBinds, bindLabel } from './binds.js';
import * as ARS from './arsenal.js'; // so pro atalho de depuracao window.__A
import { Player } from './player.js';
import { renderEndZp } from './zpview.js';
import { startEndSlides } from './endslides.js';
import { Podium } from './podium.js';
import { wornDances, bannerOpen } from './lookstore.js';
import { kbBinds, padBinds, PAD_BTN, keyName } from './binds.js';
import { startFit } from './fit.js';
import { startArrows } from './arrows.js';
startFit(); startArrows();
import { danceLen } from './dances.js';
import { DanceFx } from './dancefx.js';
import { OVER_STATS } from '../shared/core.js';
import { podiumSpot } from '../shared/podiumspot.js';
import { metaGet, metaPost, pushSoon, sessionPing, requestReset, me as rovexMe, inRovex, inviteRoom, isGuest as rovexGuest, guestName as rovexGuestName, AUTH_URL } from './rovex.js';
import { Hud, STREAK_SVG, DEATH_SVG, BOOM_SVG } from './hud.js';
import { Input, isTouch, buildTouch, applyHudLayout, setFireButton, lockPointer, setRawMouse } from './input.js';
import { Pad } from './gamepad.js';
import { LocalNet, WsNet, SplitNet } from './net.js';
import { SS } from './ssboot.js';
import { Chat } from './chat.js';
import { audio } from './audio.js';
import { HEIST, MODES, WEAPONS, STREAKS, LETHALS, TACTICALS, pickStreaks, GUN_LADDER, wpnOfBody, PRIMARIES, BLUEPRINTS, SKILLS, SKILL_SLOTS, FIELD, BR, AMMO, NADES, BLITZ_XP, GADGETS } from '../shared/weapons.js';
import { nadeLaunch, nadeStep } from '../shared/core.js';
import { EV, currentEvent, META, metaWeek } from '../shared/events.js';
import { wantedPoster, shareFile, ClipRec } from './share.js';
import { updateCamoFx } from './camofx.js';
import { propBoxes, getMap, hasLOS, raycast } from '../shared/map.js';
import { attachCharm, tickCharm } from './charms.js';
import { loadArsenal, getLoadouts, scopeTarget, freeScope, nativePart, handleFits, convOptions, muzzleOptions } from './arsenal.js';
import { initMenus, applyCrosshair } from './ui.js';
import { t, wName, setLang, getLang } from './i18n.js';
import { outlinesOn, ink, PAL } from './toon.js';
import { SKIN_CODE, skinMat } from './looks3d.js';
import { AMMO_LVL, MUZZLE_LVL, BODY_MIN_LVL, addXp, XP, onProgress, progressInfo, partReq, partUnlocked, camoUnlocked, level, levelXp, unlockLevel, setBodyResolver, grantMeta, statAdd, statMax } from './progress.js';
import { Lobby, runLoading, hideLoading } from './lobby.js';
import { funil, reportaErro } from './funil.js';
import { unlockDone, LOCKED_BY, track, grantTutorial } from './challenges.js';
import { camoTime, CAMOS } from './camos.js';
import { BrView } from './brview.js';
import { tip, tipClose } from './tips.js';
import { wornLook } from './lookstore.js';
import { botLook } from '../shared/looks.js';
import { floorAt } from '../shared/nav.js';
import { shootPanels, stripHtml } from './killcam.js';
import { Replay } from './replay.js';
import { passEvent, renderEndPass, passArt, passName } from './passview.js';
import { PASS, PASS_FREE } from './pass.js';
import { startHomeTour, homeTourSeen } from './hometour.js';
import { FieldView } from './fieldview.js';
import { StrikeView, bomberMesh, sentryMesh, beaconMesh, ammoboxMesh } from './strikeview.js';
import { HeistView } from './heistview.js';
import { CarView } from './carview.js';
import { BorView } from './borview.js';
import { SKILL_ICONS } from './skillicons.js';
import { bannerHtml } from './banners.js';
import { BANNERS, bannerOk, BANNER_DEFAULT } from '../shared/banners.js';
import { isSaber, CATEGORY, LASERS, partName, unlockedLoadout, buildGun, disposeGun, buildPartPreview, bpLoadout, defaultLoadout, infectLoadout } from './arsenal.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- ajustes ----------
// sensibilidade (05/11, pedido dele): cada aparelho tem a sua. O save vai pra conta: jogar no celular nao mexe na do PC, nem o contrario
const DEFAULTS = { scopeQ: 'fast', v: 4, banner: 'ingresso', primary: 'smg', fov: 90, fovScale: 1, sens: 1, adsSens: 0.8, touchSens: 1, touchAdsSens: 0.8, padAdsSens: 0.8, mouseSmooth: 'off', mouseAccel: 0, padSens: 1, padSmooth: 'low', padAccel: 0, leanMode: 'hold', rawMouse: true, gunSway: true, vmFov: 58, invertY: false, master: 0.8, music: 0.45, sfx: 1, grain: 0.6, film: 'color', res: isTouch ? 0.7 : 1, showFps: false, holdCrouch: false, tracer: 'chalk', autoSprint: false, name: '', aimAssist: true, autoFire: true, xhair: 'cross', xhairColor: '#ece9e1', threatRing: true, skills: [], field: 'umbrella', autoChute: isTouch, draw: isTouch ? 'mid' : 'far', hudMode: 'full' }; // field: guarda-chuva por padrao (sem escolha o selo nem aparecia); nivel 2 ainda vale
let settings = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem('rr_settings') || '{}');
  // versao 3: o filtro brutal saiu; quem estava nele volta pra pelicula colorida
  if (saved.film === 'brutal') saved.film = 'color';
  // 30/10: skills que sairam do jogo (Cuca Dura, Pe de Pano) somem do save
  if (Array.isArray(saved.skills)) saved.skills = saved.skills.filter(k => SKILLS[k]);
  // versao 4: quem ja tinha ajustado leva o valor pro toque e pro controle (o do controle era multiplicado pelo do mouse)
  if ((saved.v || 0) < 4 && saved.sens != null) { saved.touchSens ??= saved.sens; saved.touchAdsSens ??= saved.adsSens ?? 0.8; saved.padAdsSens ??= saved.adsSens ?? 0.8; saved.padSens = Math.max(0.3, Math.min(2.5, (saved.padSens ?? 1) * saved.sens)); }
  Object.assign(settings, saved, { v: 4 });
} catch { /* sem storage */ }
function saveSettings() { try { localStorage.setItem('rr_settings', JSON.stringify(settings)); } catch { /* */ } applySettings(); }

// ---------- render ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
// celular sem memoria de video perde o contexto do WebGL (tela fica branca/preta): segura o contexto pro
// navegador devolver (o three refaz tudo na volta) e manda o aviso pro servidor
// log 02/11: 3 celulares Android perderam o contexto no meio da partida = a "tela branca" que relataram. Agora: aviso
// na tela, resolucao cai um degrau (menos memoria de video na volta) e, se o navegador nao devolver em 5 s, recarrega
let glLostT = 0;
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  reportaErro(new Error('webgl contexto perdido'), 'gl ' + G.state + '/' + G.mode);
  $('glLost').hidden = false;
  settings.res = Math.max(0.5, Math.round((settings.res - 0.15) * 100) / 100);
  try { localStorage.setItem('rr_settings', JSON.stringify(settings)); } catch { /* */ }
  clearTimeout(glLostT);
  glLostT = setTimeout(() => location.reload(), 5000);
});
canvas.addEventListener('webglcontextrestored', () => { clearTimeout(glLostT); $('glLost').hidden = true; applySettings(); });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
// distancia de desenho (03/11): curta pra todos; a luneta mirando enxerga longe
const DRAW_DIST = { near: 95, scope: 500 };
const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.1, 500); // 05/11: near 0,05 pra 0,1 dobra a precisao de profundidade (malha piscando de longe)
camera.rotation.order = 'YXZ';
// luneta 3D: a lente mostra esta camera ampliada (picture-in-picture)
const scopeRT = new THREE.WebGLRenderTarget(isTouch ? 384 : 640, isTouch ? 384 : 640);
scopeRT.texture.colorSpace = THREE.SRGBColorSpace;
scopeTarget.texture = scopeRT.texture;
const scopeCam = new THREE.PerspectiveCamera(20, 1, 0.5, 500);
// luneta termica: mascara de quem esta na lente (branco) por cima do mundo em preto. O mundo escreve a
// profundidade antes, entao parede tapa o calor (nada de ver atraves de parede); fumaca nao escreve, entao nao tapa.
const maskRT = new THREE.WebGLRenderTarget(isTouch ? 192 : 320, isTouch ? 192 : 320);
scopeTarget.mask = maskRT.texture;
const CHAR_LAYER = 2;
const maskBlack = new THREE.MeshBasicMaterial({ color: 0x000000 }), maskWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
const maskBg = new THREE.Color(0);
function thermalMask() {
  for (const r of G.remotes.values()) if (r.alive && r.char.root.visible) r.char.root.traverse(o => { if (!o.isSprite) o.layers.enable(CHAR_LAYER); });
  const bg = scene.background, fog = scene.fog;
  scene.background = maskBg; scene.fog = null;
  renderer.setRenderTarget(maskRT);
  scene.overrideMaterial = maskBlack; renderer.render(scene, scopeCam);
  scene.overrideMaterial = maskWhite; scopeCam.layers.set(CHAR_LAYER);
  renderer.autoClear = false; renderer.render(scene, scopeCam); renderer.autoClear = true;
  scopeCam.layers.set(0); scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
}
const vm = new ViewModel();
const lobby = new Lobby({ onReady: (v) => G.net && G.net.send({ t: 'ready', v }), onStart: () => G.net && G.net.send({ t: 'start' }), onTeam: (team) => G.net && G.net.send({ t: 'team', team }), onCfg: (cfg) => { try { localStorage.setItem('rr_lastcfg', JSON.stringify(cfg)); } catch { /* */ } G.net && G.net.send({ t: 'cfg', ...cfg }); }, onLeave: () => quitGame(), onKick: (id) => G.net && G.net.send({ t: 'kick', id }) });
const laserDot = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sp.visible = false; sp.renderOrder = 5; scene.add(sp);
  return sp;
})();
const tmpV2 = new THREE.Vector3();
// bomba de desenho: tres bananas de dinamite amarradas e um despertador com a luz que pisca
const bombMesh = (() => {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.12, 0], [0.12, 0], [0, 0.11]]) { const s = ink(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 12), PAL.red, 0.012); s.rotation.z = Math.PI / 2; s.position.set(0, 0.09 + (z ? 0.13 : 0), x + z * 0); s.position.z = x; s.position.y = z ? 0.22 : 0.09; g.add(s); }
  const band = ink(new THREE.BoxGeometry(0.06, 0.34, 0.36), PAL.dark, 0.008); band.position.y = 0.15; g.add(band);
  const clock = ink(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 18), PAL.white, 0.01); clock.rotation.x = Math.PI / 2; clock.position.set(0, 0.2, 0.2); g.add(clock);
  for (const s of [-1, 1]) { const bell = ink(new THREE.SphereGeometry(0.045, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8b24a, 0.006); bell.position.set(s * 0.07, 0.31, 0.2); bell.rotation.z = -s * 0.5; g.add(bell); }
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 }));
  light.position.set(0, 0.34, 0); g.add(light);
  g.userData.light = light; g.visible = false; scene.add(g);
  return g;
})();
let bombBeep = 0;
const { composer, film, vmPass } = makePipeline(renderer, scene, camera, vm);

function applySettings() {
  document.body.classList.toggle('hud-simple', settings.hudMode === 'simple'); // HUD simples (01/11): botoes extras guardados no ⋯
  renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2) * settings.res * (SS ? (SS.n > 2 ? 0.8 : 0.9) : 1)); // tela dividida: 2-4 desenhos por quadro
  resize();
  film.uniforms.grain.value = settings.grain;
  film.uniforms.mode.value = settings.film === 'bw' ? 0 : settings.film === 'full' ? 2 : 1;
  audio.setVolumes(SS?.vol || { master: settings.master, music: settings.music, sfx: settings.sfx }); // tela dividida: volume do PC, igual nas telas
  input.settings = settings; useBinds(settings);
  setRawMouse(settings.rawMouse);
  setFireButton(input);
  applyCrosshair($('cross'), settings);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vm.camera.aspect = w / h; vm.camera.updateProjectionMatrix();
  smithCam.aspect = w / h; smithCam.updateProjectionMatrix();
  film.uniforms.aspect.value = w / h;
}
addEventListener('resize', resize);
{ let x0 = null, smith = false; addEventListener('pointerdown', e => { if (ui?.screen === 'look' && e.target === canvas) { x0 = e.clientX; smith = false; } else if (ui?.screen === 'arsenal' && (e.target === canvas || e.target.id === 'menu')) { x0 = e.clientX; smith = true; } }); addEventListener('pointermove', e => { if (x0 !== null) { const d = (e.clientX - x0) * 0.01; if (smith) { smithDrag += d; smithIdle = 0; if (Math.abs(d) > 0.02 && !smithSeen) { smithSeen = true; try { localStorage.setItem('rr_smith_hint', '1'); } catch { /* */ } $('smithHint').hidden = true; } } else lookDrag += d; x0 = e.clientX; } }); addEventListener('pointerup', () => { x0 = null; }); }

// cena do gunsmith: arma girando num fundo de papel, cores de verdade
const smithScene = new THREE.Scene();
smithScene.background = new THREE.Color(0xdcd7cb);
smithScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
const sl = new THREE.DirectionalLight(0xffffff, 2.2); sl.position.set(2, 3, 2); smithScene.add(sl);
const smithCam = new THREE.PerspectiveCamera(30, 1, 0.3, 30);
const smithHolder = new THREE.Group(); smithScene.add(smithHolder);
// cena do visual: o proprio boneco girando, mesma luz da vitrine
const lookScene = new THREE.Scene();
lookScene.background = new THREE.Color(0xdcd7cb);
lookScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
{ const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(2, 3, 3); lookScene.add(l); }
const lookCam = new THREE.PerspectiveCamera(30, 1, 0.8, 30);
let lookChar = null, lookTeamCur = null, lookDrag = 0;
// Arsenal (05/11, pedido dele): arrasta pra girar a arma e ver o outro lado. Depois de girar, ela fica onde parou por um tempo
let smithDrag = 0, smithIdle = 99, smithSway = 1, smithSeen = false; try { smithSeen = !!localStorage.getItem('rr_smith_hint'); } catch { /* */ }
let lookFx = null;
function setLookPreview(look, team) {
  if (!lookChar || lookTeamCur !== team) {
    if (lookChar) lookScene.remove(lookChar.root);
    lookChar = new Character(team, '', look); lookChar.tag.visible = false; lookChar.shadow.visible = true;
    // sem arma (03/11, pedido dele): a vitrine mostra so o boneco, na pose de maos na cintura (anim 'pose')
    lookTeamCur = team; lookScene.add(lookChar.root);
  } else lookChar.setLook(look);
}

const input = new Input(canvas);
// chat da partida online (Enter/T no PC, balao no celular); o solo nao tem
const chat = new Chat({ input, canvas, send: (m) => G.net?.send(m), canPlay: () => G.state === 'game' && !G.paused && !replay.on });
input.onChat = () => (chat.isOpen ? chat.close() : chat.open());
const pad = new Pad(input);
// controle ligou/desligou: aviso no canto de baixo; e o placar mostra com o que cada um joga
const devNow = () => (pad.active ? 'pad' : isTouch ? 'mob' : 'pc');
pad.onActive = () => { if (G.state === 'game' || G.state === 'lobby') G.net?.send({ t: 'dev', v: devNow() }); };
pad.onConn = (on) => {
  const el = $('padToast'); el.textContent = t(on ? 'padOn' : 'padOff'); el.classList.toggle('off', !on);
  el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(el.hideT); el.hideT = setTimeout(() => { el.hidden = true; }, 3200);
  audio.play('ui_click', { ui: true, vol: 0.5 });
};
const hud = new Hud();
let world, objectives, fx, brView = null, fieldView = null;

// ---------- estado do jogo ----------
const G = {
  settings, vm, camera, hud, input, loadouts: getLoadouts(), remotes: new Map(),
  net: null, player: null, myId: null, myTeam: null, snap: null, mode: 'ffa', M: getMap('vila'),
  state: 'menu', // menu | game
  paused: false, shakeAmt: 0, deathPos: null, killer: null, t: 0, timeScale: 1, slowT: 0,
  seen: new Map(), // id -> ate quando aparece no radar (atirou)
  nadeMeshes: new Map(), blimpMeshes: [], remoteLo: new Map(), remoteTracer: new Map(), remoteLook: new Map(), remoteBp: new Map(), pings: new Map(), brDrops: [], gunDrops: new Map(), ladder: GUN_LADDER, flashT: 0,
  isEnemy(r) { if (r.id === this.myId) return false; return !(MODES[this.mode].teams || this.duo) || r.team !== this.myTeam; },
  shake(a) { this.shakeAmt = Math.min(0.6, this.shakeAmt + a); },
  onHitConfirm(point, head, dmg, victim) {
    if (victim) this.plafts = (this.plafts || 0) + 1; // meta da comunidade: todo acerto em boneco e um PLAFT
    hud.hitmark(head);
    audio.play(head ? 'headshot' : 'hitmarker', { vol: head ? 0.75 : 0.55, ui: true, key: 'hitm', max: 2, jitter: 0 });
    if (dmg) fx.number([point[0], point[1] + 0.3, point[2]], dmg, head);
    if (victim) victim.char.flinch(head);
    if (Math.random() < 0.25) fx.word(head ? 'TOING!' : ['POW!', 'BAM!', 'PAF!', 'TUM!'][Math.floor(Math.random() * 4)], point, head ? 1.6 : 1.1);
  },
};
// nivel por corpo: o corpo equipado de cada categoria decide de quem e o XP e o nivel que abre pecas
setBodyResolver((cat) => (G.loadouts?.[cat]?.body) || CATEGORY[cat]?.bodies?.[0] || null, (cat) => CATEGORY[cat]?.bodies || []);
G.fx = null;
hud.g = G; // placar da escada de armas le a escada sorteada
G.pad = pad;
// o que o jogador levou da partida (tela de fim): XP por tipo, desbloqueios e nivel de partida
function newMatchLog() { const pi = progressInfo(); return { xp: {}, unlocks: [], startXp: pi.xp, startLevel: pi.level }; }
function logXp(kind, n) { const L = G.matchLog; if (L) L.xp[kind] = (L.xp[kind] || 0) + n; }
function logUnlock(kind, name, img) { const L = G.matchLog; if (L && !L.unlocks.some(u => u.name === name)) L.unlocks.push({ kind, name, img }); }
// XP: soma na partida, mostra "+100 Nocaute" no meio da tela e avisa quando sobe de nivel
// evento de desafio: completou = XP + banner na hora
// Elite da Rovex: XP em dobro em tudo (abate, partida, desafio)
// so bot na sala (solo ou sala sem outra pessoa): XP bem menor que jogando com gente (pedido dele 30/10)
const BOTS_ONLY_XP = 0.3;
const onlyBots = () => !(G.snap?.players || []).some(p => !p.bot && p.id !== G.myId);
// fim de semana (sabado e domingo, hora local): XP em dobro em tudo, soma com o do Elite
const weekend = () => { const d = new Date().getDay(); return d === 0 || d === 6; };
// blitz (02/11): evento fixo, XP em dobro (soma com Elite e fim de semana)
// 05/11 (pedido dele): XP em dobro NAO empilha. Elite, fim de semana e Blitz valem o maior deles: quem ja esta em 2x continua em 2x
const xpMult = () => Math.max(rovexMe?.elite ? 2 : 1, weekend() ? 2 : 1, G.blitz ? BLITZ_XP : 1) * (onlyBots() && G.mode !== 'borroes' ? BOTS_ONLY_XP : 1);
// Noite dos Borroes (03/11, pedido dele): abate de vilao rende bem menos que abate de gente (a noite acumula centenas)
const BOR_XP = 0.2, BOR_XP_KINDS = ['kill', 'head', 'assist'];
function wkndBadge() {
  const on = weekend(), b = $('wknd'), n = $('wkndNote');
  b.hidden = !on; if (!on) { n.hidden = true; b.setAttribute('aria-expanded', 'false'); }
}
$('wknd').onclick = (e) => { e.stopPropagation(); const n = $('wkndNote'); n.hidden = !n.hidden; $('wknd').setAttribute('aria-expanded', String(!n.hidden)); };
document.addEventListener('click', (e) => { if (!e.target.closest?.('#wkndNote')) { $('wkndNote').hidden = true; $('wknd').setAttribute('aria-expanded', 'false'); } });
wkndBadge(); setInterval(wkndBadge, 60000); // virou sabado com o jogo aberto
// evento do fim de semana (sexta a domingo): carimbo ao lado do 2x; tocar abre o cartao com o botao de jogar.
// ?evento=<id> no endereco forca um evento (teste e gravacao de Reels)
G.evNow = currentEvent;
function evBadge() {
  const id = G.evNow(), b = $('evStamp');
  b.hidden = !id; if (!id) { $('evNote').hidden = true; return; }
  $('evStampIco').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[EV(id).icon] || ''}</svg>`;
  $('evStampName').textContent = t('ev_' + id); $('evNoteName').textContent = t('ev_' + id); $('evNoteDesc').textContent = t('evd_' + id);
}
$('evStamp').onclick = (e) => { e.stopPropagation(); const n = $('evNote'); n.hidden = !n.hidden; $('evStamp').setAttribute('aria-expanded', String(!n.hidden)); };
document.addEventListener('click', (e) => { if (!e.target.closest?.('#evNote')) { $('evNote').hidden = true; $('evStamp').setAttribute('aria-expanded', 'false'); } });
$('evPlay').onclick = () => {
  audio.play('ui_click', { ui: true }); $('evNote').hidden = true;
  let c = {}; try { c = JSON.parse(localStorage.getItem('rr_lastcfg') || '{}'); } catch { /* */ }
  const mode = ['ffa', 'tdm', 'dom', 'ctf'].includes(c.mode) ? c.mode : 'ffa';
  startGame(new LocalNet({ mode, map: c.map || 'auto', bots: Number.isFinite(c.bots) && c.bots > 0 ? c.bots : 7, difficulty: c.difficulty || 1, mut: G.evNow() }), settings.name || (rovexGuest() ? rovexGuestName() : t('youCap')));
};
evBadge(); setInterval(evBadge, 60000);

// uma conta, um aparelho (02/11, pedido dele): logado, o jogo avisa a Rovex a cada 60 s. Outro aparelho jogando
// com a mesma conta = popup (Contestar passa a conta pra este aparelho; o outro recebe o mesmo aviso no proximo toque)
let dupOpen = false;
function dupShow() {
  if (dupOpen) return;
  dupOpen = true;
  if (G.state === 'game' || G.state === 'lobby') quitGame();
  $('dupMsg').hidden = true; $('dupTake').disabled = false; $('dupReset').disabled = false;
  $('dupAcct').hidden = false;
  audio.play('ui_back', { ui: true });
  $('dupTake').focus();
}
async function dupCheck(tomar = false) {
  if (!rovexMe || SS) return; // tela dividida: a mesma pessoa pode estar no sofa e no celular? nao derruba a partida de todo mundo
  const r = await sessionPing(tomar);
  if (r?.outro) dupShow();
  else if (tomar || dupOpen) { dupOpen = false; $('dupAcct').hidden = true; }
}
$('dupTake').onclick = () => { audio.play('ui_click', { ui: true }); $('dupTake').disabled = true; dupCheck(true); };
$('dupReset').onclick = async () => {
  audio.play('ui_click', { ui: true }); $('dupReset').disabled = true;
  const ok = await requestReset();
  $('dupMsg').textContent = t(ok ? 'dupResetOk' : 'dupResetErr', { e: rovexMe?.email || '' }); $('dupMsg').hidden = false;
  if (!ok) $('dupReset').disabled = false;
};
setTimeout(() => dupCheck(), 1500);
setInterval(() => { if (!document.hidden) dupCheck(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) dupCheck(); }); // voltou pra aba: confere na hora

function chEvent(e) {
  if (G.state !== 'game' || G.tutorial || G.range) return; // treino e campo de tiro nao contam desafio
  for (const c of track(e)) {
    // elite rastreado: cada avanco aparece na tela (sem XP ainda)
    if (c.kind === 'eliteProg') { hud.eliteTrack(t('el_' + c.id, { n: c.n }), c.prog, c.n); continue; }
    if (G.matchLog) (G.matchLog.zp ||= []).push({ k: c.kind, id: c.id }); // o fim da partida pede o deposito
    c.xp *= xpMult();
    G.matchXp = (G.matchXp || 0) + c.xp;
    logXp('challenge', c.xp);
    addXp('challenge', c.xp);
    const r = c.reward;
    if (c.kind === 'elite') hud.eliteTrack(t('el_' + c.id, { n: c.n }), 1, 1, true);
    const name = r ? (r.slot === 'look' ? t('look') + ': ' + t('lk_' + r.id.replace(':', '_')) : r.slot === 'bp' ? t(r.id) : r.slot === 'tracer' ? t('s_tracer') + ': ' + t('tr_' + r.id.slice(3)) : r.slot === 'ammo' ? t('slot_ammo') + ': ' + t('am_' + r.id.slice(3)) : r.slot === 'camo' ? t('camo_' + r.id) : partName(r.slot, r.id)) : t('ch_' + c.id, { n: '', w: c.wpn ? wName(c.wpn) : '' }).replace(/\s+/g, ' ');
    const img = r && r.slot !== 'tracer' && r.slot !== 'look' ? unlockShot({ slot: r.slot, id: r.id, wpn: r.wpn || G.player?.wpn || 'smg' }) : null;
    if (r) logUnlock(t('chUnlocked'), name, img);
    if (c.kind === 'elite') {
      // elite: cartaz lendario com a arma ganha + fanfarra comica
      const bp = r && BLUEPRINTS[r.id];
      setTimeout(() => { hud.eliteBanner({ title: t('elDone'), name: bp ? name : t('el_' + c.id, { n: '' }), sub: bp ? `${wName(bp.wpn)} · ${t('camo_' + bp.lo.camo)}` : '', xp: c.xp, img }); audio.fanfare(0.85); }, 400);
      if (r) { G.loadouts = matchLoadouts(); sendLoadout(); }
      continue;
    }
    setTimeout(() => { hud.unlockBanner({ kind: t(c.kind === 'elite' ? 'elDone' : r ? 'chUnlocked' : 'chDoneDaily'), name: name + ' +' + c.xp + ' XP', img }); audio.play(r ? 'unlock' : 'levelup', { vol: 0.7, ui: true, jitter: 0 }); }, 400);
    if (r) { G.loadouts = matchLoadouts(); sendLoadout(); }
  }
}

// premio do treino: um modelo de arma e uma camuflagem que o jogador ainda nao tem (sorteados uma vez so)
function tutorialReward() {
  const r = grantTutorial(() => {
    const bodies = [];
    for (const [cat, C] of Object.entries(CATEGORY)) C.bodies.forEach((id, i) => { if (i > 0 && !partUnlocked(cat, i, id)) bodies.push({ wpn: cat, body: id }); });
    const b = bodies[Math.floor(Math.random() * bodies.length)] || {};
    const camos = CAMOS.filter(c => c.req && !c.shop && !c.legend && !c.elite && !c.prestige && !camoUnlocked(b.wpn || 'smg', c));
    const c = camos[Math.floor(Math.random() * camos.length)];
    return { wpn: b.wpn || null, body: b.body || null, camo: c ? c.id : null };
  });
  return [r.body && `${partName('body', r.body)}`, r.camo && `${t('slot_camo')}: ${t('camo_' + r.camo)}`].filter(Boolean);
}

function gainXp(kind, wpn = null, mult = 1) {
  if (G.state !== 'game' || G.tutorial || G.range) return; // treino e campo de tiro nao dao XP
  // Noite dos Borroes: o jogador ganha 20% nos abates de vilao, a ARMA ganha cheio (o foco e upar arma);
  // Rascunho: a arma e a de fabrica, entao o XP vai pro modelo de fabrica (Estalo etc.), nao pro montado no Arsenal
  const night = G.mode === 'borroes', base = Math.round((XP[kind] || 0) * mult * xpMult());
  if (night && BOR_XP_KINDS.includes(kind)) mult *= BOR_XP;
  const amount = Math.round((XP[kind] || 0) * mult * xpMult());
  if (!amount && !base) return;
  if (onlyBots() && !night && !G.botXpWarned) { G.botXpWarned = true; hud.message(t('botsOnlyXp', { n: Math.round(BOTS_ONLY_XP * 100) }), 3); }
  G.matchXp = (G.matchXp || 0) + amount;
  logXp(kind, amount);
  const ras = night && G.snap?.bor && !G.snap.bor.art && CATEGORY[wpn] && wpn !== 'melee';
  addXp(kind, amount, WEAPONS[wpn] ? wpn : null, ras ? G.boxBody?.get(G.myId)?.[wpn] || CATEGORY[wpn].bodies[0] : null, night ? base : amount);
  hud.xpPop(`+${amount} ${t('xp_' + kind)}`);
}
// o que abre exatamente neste nivel (pra avisar na hora)
// o que abriu nesse nivel: [{ slot, id, wpn, name }] (camo de nivel de jogador vale pra arma em uso)
// only: 'body' = so corpos novos (nivel da categoria), 'parts' = pecas e camos (nivel do corpo equipado)
const HS_ICON = `<svg class="kf-hs" viewBox="0 0 24 24" aria-label="headshot" role="img"><circle cx="12" cy="9" r="7" fill="currentColor"/><path d="M8 15h8v5H8z" fill="currentColor"/><circle cx="9" cy="9" r="2" fill="#ece9e1"/><circle cx="15" cy="9" r="2" fill="#ece9e1"/><path d="M10 17v3m4-3v3" stroke="#ece9e1" stroke-width="1.5"/></svg>`;
function unlocksAt(wpn, wLevel, pLevel, only = null) {
  const out = [];
  const C = wpn && CATEGORY[wpn];
  if (C && wLevel) {
    const all = { body: C.bodies, scope: [null, ...C.scopes], charger: C.chargers, handle: [null, ...C.handles], laser: [null, ...LASERS] };
    const lists = only === 'body' ? { body: all.body } : only === 'parts' ? (({ body, ...rest }) => rest)(all) : all;
    for (const [slot, list] of Object.entries(lists)) list.forEach((id, i) => { if (id && i > 0 && partReq(i, id) === wLevel) out.push({ slot, id, wpn, name: partName(slot, id) }); });
    if (only !== 'body') for (const [id, lv] of Object.entries(MUZZLE_LVL)) if (lv === wLevel && CATEGORY[wpn].bodies.some(b => muzzleOptions(b).includes(id))) out.push({ slot: 'muzzle', id, wpn, name: partName('muzzle', id) });
    if (only !== 'body' && wpn !== 'melee') for (const [id, lv] of Object.entries(AMMO_LVL)) if (lv === wLevel && (!AMMO[id].only || AMMO[id].only === wpn)) out.push({ slot: 'ammo', id, wpn, name: t('am_' + id) });
    if (only !== 'body') for (const c of CAMOS) if (c.req && c.req.wpn === wLevel && !c.req.player) out.push({ slot: 'camo', id: c.id, wpn, name: t('camo_' + c.id) });
  }
  const cur = wpn || G.player?.wpn || 'smg';
  if (pLevel) for (const c of CAMOS) if (c.req && c.req.player === pLevel) out.push({ slot: 'camo', id: c.id, wpn: CATEGORY[cur] ? cur : 'smg', name: t('camo_' + c.id) });
  return out;
}

// foto da arma com a peca nova (banner de desbloqueio)
let shotR = null, shotScene = null, shotCam = null;
function unlockShot(u) {
  if (!CATEGORY[u.wpn]) return null;
  if (!shotR) {
    shotR = offscreen(); // dividido com a Loja (um contexto WebGL so)
    shotScene = new THREE.Scene();
    shotScene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2)); const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 3, 2); shotScene.add(dl);
    shotCam = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, 0.01, 10); shotCam.position.set(3, 0.6, 0); shotCam.lookAt(0, 0, 0);
  }
  let lo = { ...(u.lo || G.loadouts[u.wpn] || {}) };
  if (u.lo) { /* arma de outra pessoa (tela de morte): do jeito que ela montou */ }
  else if (u.slot === 'bp') lo = bpLoadout(u.id);
  else if (u.slot === 'body') { lo.body = u.id; lo.charger = null; } else { if (u.onBody) { lo.body = u.onBody; lo.charger = null; } lo[u.slot] = u.id; } // peca de um modelo so: foto nele
  // mira, pente e empunhadura: a foto e' so da peca nova, sozinha (nao montada na arma)
  const gun = (u.slot === 'scope' || u.slot === 'charger' || u.slot === 'handle') && buildPartPreview(u.id, lo) || buildGun(u.wpn, lo);
  const lz = gun.userData.laser; if (lz) lz.beam.removeFromParent();
  const fxr = gun.userData.camoFx?.root; if (fxr) fxr.removeFromParent(); // a foto e da arma, sem o efeito
  const box = new THREE.Box3().setFromObject(gun), c = box.getCenter(new THREE.Vector3());
  gun.position.sub(c); shotScene.add(gun);
  const solo = !gun.userData.muzzle; // peca sozinha: mais respiro em volta
  const k = Math.max(box.max.z - box.min.z, (box.max.y - box.min.y) * 2) * (solo ? 0.8 : 0.56);
  Object.assign(shotCam, { left: -k, right: k, top: k / 2, bottom: -k / 2 }); shotCam.updateProjectionMatrix();
  // renderizador dividido com a Loja: a previa ao vivo usa o mesmo canvas (tamanho dela volta depois da foto)
  const live = shotR.domElement.isConnected, was = shotR.getSize(new THREE.Vector2());
  shotR.setSize(260, 130, false); shotR.setScissorTest(false);
  shotR.render(shotScene, shotCam); shotScene.remove(gun);
  const url = shotR.domElement.toDataURL();
  if (live) shotR.setSize(was.x, was.y, false);
  return url;
}
onProgress((e) => {
  // Rovex Pass: abriu nivel na partida = aviso na pilha, e o fim da partida lista tudo
  // trilha gratis: quem nao tem Elite ve o premio dela (quem tem ve o do premium no mesmo aviso)
  if (e.freeTo > e.freeFrom && G.state === 'game') for (let n = e.freeFrom + 1; n <= e.freeTo; n++) if (PASS_FREE[n]) { (G.matchLog.passFree ||= []).push(n); hud.push(passEvent(n, true), 'ev-unl ev-pass', 4600); audio.play('unlock', { vol: 0.8, ui: true }); }
  if (e.passUp && G.state === 'game') for (let n = e.passFrom + 1; n <= e.passUp; n++) { (G.matchLog.pass ||= []).push(n); hud.push(passEvent(n), 'ev-unl ev-pass', 4600); audio.play('unlock', { vol: 0.8, ui: true }); }
  if (G.state !== 'game' || (!e.levelUp && !e.wpnUp && !e.catUp)) return;
  G.loadouts = matchLoadouts(); sendLoadout();
  // som de subir de nivel + o que desbloqueou
  audio.play('levelup', { vol: 0.85, ui: true, jitter: 0 });
  audio.duck(0.3, 1.6);
  if (e.levelUp) hud.stampText(t('levelUp', { n: e.levelUp }));
  if (e.wpnUp) hud.message(t('wpnUp', { w: e.body && CATEGORY[e.wpn]?.bodies.includes(e.body) ? partName('body', e.body) : wName(e.wpn), n: e.wpnUp }), 2.6);
  // todos os niveis ganhos de uma vez (subir 2 niveis num abate tambem anuncia o do meio)
  const got = [];
  for (let n = (e.wpnFrom || 0) + 1; e.wpnUp && n <= e.wpnUp; n++) got.push(...unlocksAt(e.wpn, n, 0, 'parts'));
  for (let n = (e.catFrom || 0) + 1; e.catUp && n <= e.catUp; n++) got.push(...unlocksAt(e.wpn, n, 0, 'body'));
  for (let n = (e.levelFrom || 0) + 1; e.levelUp && n <= e.levelUp; n++) got.push(...unlocksAt(e.wpn, 0, n));
  // tudo vai pra tela de fim; na hora, banner estilo COD um por vez (ate 3)
  // so o que existe de verdade (01/11): peca de um modelo so (akimbo, kit) mostra nele e com o nome dele; modelo travado por nivel de jogador nao entra
  for (let i = got.length - 1; i >= 0; i--) { const u = got[i]; if (u.slot === 'body' && BODY_MIN_LVL[u.id] && unlockLevel() < BODY_MIN_LVL[u.id]) got.splice(i, 1); }
  // peca de desafio (akimbo, camo...) nao sai por nivel (04/11, Nyx recebeu banner do akimbo da escopeta sem o desafio): so anuncia se o desafio dela fechou
  for (let i = got.length - 1; i >= 0; i--) { const u = got[i], ch = LOCKED_BY[u.wpn + ':' + u.id] || LOCKED_BY[u.id]; if (ch && !unlockDone(ch.id)) got.splice(i, 1); }
  for (const u of got) {
    const fits = u.slot === 'handle' ? CATEGORY[u.wpn]?.bodies.filter(b => handleFits(b, u.wpn, u.id)) : u.slot === 'conv' ? CATEGORY[u.wpn]?.bodies.filter(b => convOptions(b).includes(u.id)) : null;
    if (fits && fits.length && fits.length < CATEGORY[u.wpn].bodies.length) { u.onBody = fits[0]; u.name += ' (' + fits.map(b => partName('body', b)).join(', ') + ')'; }
  }
  const shots = got.map(u => unlockShot(u));
  got.forEach((u, i) => logUnlock(t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), u.name, shots[i]));
  got.slice(0, 3).forEach((u, i) => hud.unlockBanner({ kind: t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), name: u.name, img: shots[i], more: i === 2 && got.length > 3 ? got.length - 3 : 0 })); // entram em fila no hud
  if (got.length) audio.play('unlock', { vol: 0.8, ui: true, jitter: 0 });
});
// nome da arma de alguem (01/11, pedido dele): o do MODELO montado (o mesmo do HUD), nunca o da categoria antiga.
// Eu = minha classe/variante; outro jogador = a classe que ele mandou; bot = o modelo padrao da categoria.
// killfeed (05/11, pedido dele): atropelo com o carro, granada e explosao com o estouro
const FEED_ICO = { car: `<svg viewBox="0 0 48 48" aria-hidden="true">${DEATH_SVG.car}</svg>`, frag: `<svg viewBox="0 0 48 48" aria-hidden="true">${BOOM_SVG}</svg>`, carx: `<svg viewBox="0 0 48 48" aria-hidden="true">${BOOM_SVG}</svg>`, rpg: `<svg viewBox="0 0 48 48" aria-hidden="true">${BOOM_SVG}</svg>` };
function gunName(id, wpn) {
  if (!WEAPONS[wpn]) return t('w_' + wpn);
  if (wpn === 'fists' || wpn === 'minigun') return wName(wpn);
  if (G.mode === 'gungame') { const pl = G.snap?.players?.find(x => x.id === id); const b = G.ladder[Math.min(pl?.gunLvl || 0, G.ladder.length - 1)]?.body; if (b) return partName('body', b); }
  if (G.mode === 'borroes' && G.snap?.bor && !G.snap.bor.art && CATEGORY[wpn]) return partName('body', G.boxBody?.get(id)?.[wpn] || CATEGORY[wpn].bodies[0]); // Rascunho: modelo de fabrica (ou o da Caixa)
  const bp = id === G.myId ? G.player?.brBp?.[wpn] : G.remoteBp.get(id)?.[wpn];
  if (bp) return t(bp);
  const lo = id === G.myId ? G.player?.lo?.(wpn) : G.remoteLo.get(id)?.[wpn];
  const body = lo?.body || defaultLoadout(wpn)?.body;
  return body ? partName('body', body) : wName(wpn);
}
G.gunName = gunName;
G.vmScopeKind = () => vm.sight()?.kind || null; // luneta na mao (variavel: a rodinha troca o zoom)
if (import.meta.env.DEV) window.__solo = (o) => startGame(new LocalNet({ lobby: false, ...o }), 'Teste'); // teste: partida solo direto (so no dev)
// previa do podio (so no dev): ?pocPodio&map=vila abre a partida, encerra e deixa 3 min no podio pra testar
if (import.meta.env.DEV && new URLSearchParams(location.search).has('pocPodio')) (async () => {
  const q = new URLSearchParams(location.search), wait = (f) => new Promise(r => { const i = setInterval(() => { if (f()) { clearInterval(i); r(); } }, 200); });
  await new Promise(r => setTimeout(r, 3000)); document.getElementById('bootGo')?.click(); await new Promise(r => setTimeout(r, 2000));
  window.__solo({ mode: q.get('mode') || 'ffa', map: q.get('map') || 'vila', bots: 4, difficulty: 'easy', lobby: true });
  await wait(() => G.state === 'lobby' && !$('lobby').hidden); await new Promise(r => setTimeout(r, 800)); $('lbReady').click();
  await wait(() => G.state === 'game' && G.snap && G.net.core.phase === 'play'); await new Promise(r => setTimeout(r, 1500));
  const c = G.net.core; let i = 1; for (const x of c.players.values()) x.score = i++ * 10; c.players.get(G.myId).score = 9000; c.end(G.myName); c.overT = 180;
})();
window.__smithShow = (cat, lo, charm = 'none') => { smithHolder.clear(); const gun = ARS.buildGun(cat, lo); const c = new THREE.Box3().setFromObject(gun).getCenter(new THREE.Vector3()); gun.position.x -= c.x; gun.position.z -= c.z; smithHolder.add(gun); if (charm !== 'none' && cat !== 'melee') attachCharm(gun, charm, 1); };
window.__A = ARS; window.__G = G; window.__R = renderer; window.__S = scene; window.__I = input; window.__C = camera; window.__VM = vm; // atalhos de depuracao
G.addXp = addXp;
G.unlockShot = (u) => unlockShot(u); // depuracao: foto do banner de desbloqueio

// rankeada: pontos no fim da partida (vitoria + bonus; derrota = 0; sala com bots vale menos). A tela do fim
// mostra a contagem; faixa nova vira aviso grande.
function rankEnd(won) {
  const ps = G.snap?.players || [], humans = ps.filter(p => !p.bot).length, me = ps.find(p => p.id === G.myId);
  const R = G.rankRes = rankResult(won, ps.length ? humans / ps.length : 0, (me?.score || 0) / 200);
  // faixa nova: o aviso vai dentro do bloco da rankeada na tela do fim (nada por cima do titulo)
  sendLoadout();
}
function showRankEnd() {
  const R = G.rankRes, el = $('endRank');
  el.hidden = !R; if (!R) return;
  G.rankRes = null;
  const tier = tierOf(R.after);
  $('erBadge').innerHTML = badgeSvg(tier, 44);
  $('erWhy').textContent = !R.won ? t('rkLossZero') : t('rkWhy', { b: R.base, x: R.bonus }) + (R.k < 0.999 ? ' ' + t('rkBots', { p: Math.round(R.k * 100) }) : '');
  $('erTotal').textContent = t('rkPts', { n: R.after }) + ' · ' + t('rk_' + TIERS[tier].id);
  const up = R.newPeak >= 0 ? TIERS[R.newPeak] : null;
  $('erUp').hidden = !up;
  if (up) { $('erUp').textContent = t('rkUp', { t: t('rk_' + up.id) }) + ' ' + t('rkUpSub', { r: t(up.prize) + ' + ' + (up.reward.slot === 'camo' ? t('camo_' + up.reward.id) : up.reward.tab === 'hat' ? t('lk_hat_' + up.reward.id) : t('lkt_' + up.reward.tab) + ' ' + t('rk_' + up.id)) }); setTimeout(() => audio.play('levelup', { ui: true, vol: 0.8 }), 1400); }
  const t0 = performance.now(), dur = 900 + R.delta * 40;
  const step = () => { if ($('theend').hidden) return; const k = Math.min(1, (performance.now() - t0) / dur), n = Math.round(R.delta * (1 - (1 - k) ** 3)); $('erPts').textContent = '+' + n; if (k < 1) requestAnimationFrame(step); else if (R.delta) audio.play('ding', { ui: true, vol: 0.5 }); };
  setTimeout(step, 400);
}
// efeito na tela de quem levou bala especial: fogo (borda queimando), rastreada (olho roxo pulsando),
// explosiva (clarao laranja), perfurante (rachado "atravessou"). Some sozinho; renova se levar de novo.
const ammoFxT = {};
function ammoFx(kind, secs) {
  const el = $('ammoFx'); if (!el) return;
  el.classList.add(kind); clearTimeout(ammoFxT[kind]);
  if (kind === 'trace' || kind === 'ap') $('afTxt').textContent = t(kind === 'trace' ? 'af_trace' : 'af_ap');
  ammoFxT[kind] = setTimeout(() => el.classList.remove(kind), secs * 1000);
}
// barra da escolta (topo): progresso do bonde, pontos de controle, gente no circulo e o estado
let escView = null, escCpN = -1;
function escHud(E) {
  const bar = $('escBar');
  bar.hidden = !E || G.state !== 'game';
  if (bar.hidden) return;
  const k = E.d / E.len;
  $('ebFill').style.width = (k * 100).toFixed(1) + '%'; $('ebTram').style.left = (k * 100).toFixed(1) + '%';
  if (escCpN !== E.cps.length) { escCpN = E.cps.length; $('ebCps').innerHTML = E.cps.map((c, i) => `<i style="left:${(c / E.len * 100).toFixed(1)}%">${String.fromCharCode(65 + i)}</i>`).join(''); }
  $('ebCps').querySelectorAll('i').forEach((el, i) => el.classList.toggle('done', i < E.next));
  $('ebRed').textContent = E.red; $('ebBlue').textContent = E.blue;
  const st = E.ot ? t('es_ot') : t('es_' + E.state);
  if ($('ebState').textContent !== st) $('ebState').textContent = st;
  bar.dataset.st = E.state;
  // seu papel: quem ataca no round empurra; o outro lado defende (no round 2 os lados trocam)
  const atk = E.atk || 'red';
  const role = (G.myTeam === atk ? t('es_atk') : G.myTeam ? t('es_def') : '') + (E.round === 2 ? ' · ' + t('es_r2') : '');
  if ($('ebRole').textContent !== role) { $('ebRole').textContent = role; $('ebRole').className = 'eb-role ' + (G.myTeam || ''); }
}
// troca o cenario quando a sala usa outro mapa
function setMap(id) {
  if (world && G.M.id === id) return;
  G.M = getMap(id);
  world && world.dispose(); objectives && objectives.dispose();
  world = buildWorld(scene, G.M);
  objectives = buildObjectives(scene, G.M);
  brView && brView.dispose(); brView = G.brView = G.M.id === 'ilha' ? new BrView(scene, G.M) : null; // loot, caixote e iris do battle royale
  fieldView && fieldView.dispose(); fieldView = G.fieldView = new FieldView(scene); // molas, buracos e guarda-chuvas
  escView && escView.dispose(); escView = G.escView = G.M.track ? new EscortView(scene, G.M) : null; // trilho e Bonde da Tinta (escolta)
  flash && flash.dispose(); flash = G.M.theme === 'tinteiro' ? new Flashlights(scene) : null; gunL?.dispose(); gunL = new GunLights(scene); if (import.meta.env.DEV) window.__GL = gunL; // estudio escuro: todo mundo de lanterna
  hud.setMap(G.M);
}

// visual dos outros: o que a pessoa mandou; bot tem o seu sorteado (fixo pelo id)
G.tip = tip; // o jogador chama a dica de primeira vez (deslizar)
// selo do equipamento de campo (centro de baixo): icone do equipado; no celular ele e' o botao (o lateral sai)
G.setFieldHud = (f) => setFieldHud(f); // depuracao/treino
function setFieldHud(f) {
  $('fieldHud').hidden = !f;
  if (f) $('fhIco').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${SKILL_ICONS[FIELD[f].icon]}</svg>`;
  if (input.fieldBtn) input.fieldBtn.hidden = true;
}
$('fhBadge').addEventListener('pointerdown', (e) => { e.preventDefault(); input.edges?.add('FIELD'); });
const replay = G.replay = new Replay(); // camera da ultima morte antes do placar
if (import.meta.env.DEV) window.__RP = replay; // teste: estado da camera final
replay.kickOf = (w) => (WEAPONS[w]?.kick || 1) * 1.3;
G.lookOfId = (id) => (id === G.myId ? wornLook() : lookOf(G.remotes.get(id) || { id }));
G.camera = camera;
G.tracerOf = (id) => id === G.myId ? settings.tracer : G.remoteTracer.get(id) || 'chalk';

function lookOf(p) { return G.remoteLook.get(p.id) || (p.bot ? botLook(p.id) : null); }

// peca nova no meio da partida (arma de outro com camo que ainda nao apareceu): compila em segundo plano e so
// mostra quando o shader esta pronto. Antes a 1a aparicao de cada camo travava o quadro compilando (03/11)
function warmLater(obj) {
  if (!renderer.compileAsync || G.state !== 'game') return;
  const n = (obj.userData.warmN = (obj.userData.warmN || 0) + 1);
  const show = () => { if (obj.userData.warmN === n) obj.visible = true; };
  const p = renderer.compileAsync(obj, camera, scene); // pega os materiais agora (so percorre o que esta visivel)...
  obj.visible = false; // ...e esconde ate o shader ficar pronto
  p.then(show, show);
}

function remoteFor(p) {
  let r = G.remotes.get(p.id);
  if (!r) {
    r = { id: p.id, mob: p.mob || null, char: p.mob ? new MobChar(p.mob) : new Character(p.team, p.name, lookOf(p)), pos: [...p.pos], target: [...p.pos], vel: [0, 0, 0], yaw: p.yaw, alive: p.alive, team: p.team, name: p.name, anim: p.anim, wpn: p.wpn, pitch: 0, speed: 0 };
    scene.add(r.char.root);
    G.remotes.set(p.id, r);
  }
  return r;
}

function onSnap(s) {
  G.snap = s;
  if (s.mut !== G.mutSeen) { G.mutSeen = s.mut; if (s.mut && G.state === 'game') { hud.message(t('evOn', { e: t('ev_' + s.mut) }), 3.5); audio.play('ringbell', { vol: 0.6, ui: true }); } } // evento de fim de semana: anuncia na entrada
  G.mode = s.mode; G.duo = !!s.duo; G.bounce = !!s.bounce; G.bOpen = !!s.bOpen; G.blitz = s.blitz || false;
  if (s.map && s.map !== G.M.id) setMap(s.map);
  const seen = new Set();
  for (const p of s.players) {
    if (p.id === G.myId) {
      G.me = p;
      if (G.player) {
        G.player.hp = p.hp;
        hud.hp(p.hp);
        hud.armor(p.armor || 0, s.mode === 'br' || p.armor > 0); // colete de campo aparece em todo modo
        document.body.classList.toggle('mode-br', s.mode === 'br');
        document.body.classList.toggle('mode-pve', s.mode === 'borroes' || s.mode === 'gungame'); // noite dos borroes: sem sequencias na tela
        if (!p.alive && G.player.alive) {
          G.player.alive = false;
          // caiu enquanto a conexao estava fora (o aviso do abate se perdeu): abre a tela de espera do mesmo jeito
          if ($('dead').hidden) { G.deathPos = [...G.player.pos]; G.killer = null; $('dead').hidden = false; document.body.classList.add('is-dead'); $('deadBy').textContent = ''; }
        }
        G.myTeam = p.team;
        document.body.classList.toggle('spawn-prot', !!p.pt && p.alive); // escudo de nascimento: borda azul na tela
        // dupla: caido (rasteja, sem atirar) ate o parceiro encher a bomba
        const down = (G.duo || G.mode === 'borroes') && p.alive && p.dn > 0; // noite dos borroes: mesmo caido da dupla
        if (down !== !!G.down) { G.down = down; document.body.classList.toggle('is-down', down); if (!down) hud.down(null); }
        if (down) hud.down({ t: p.dn, rv: (p.rv || 0) / BR.duo.revive });
        if (p.nades) G.player.nades = { ...p.nades };
      }
      continue;
    }
    seen.add(p.id);
    const r = remoteFor(p);
    // trocou de time (infectado): o boneco e' refeito na cor nova
    if (p.team !== r.team && !r.mob) { scene.remove(r.char.root); disposeGun(r.char.gun); r.char = new Character(p.team, p.name, lookOf(p)); scene.add(r.char.root); r.loKey = null; }
    if (!r.alive && p.alive) r.pos = [...p.pos];
    r.leanT = p.ln || 0;
    r.target = [...p.pos]; r.yaw = p.yaw; r.pitch = p.pitch; r.anim = p.anim; r.alive = p.alive; r.team = p.team;
    r.kills = p.kills; r.hp = p.hp; r.dn = p.dn || 0; r.rv = p.rv || 0;
    if (r.mob) { r.mh = p.mh; r.hk = p.hk; r.char.setHp(p.hp / (p.mh || 1)); if (p.mob === 'reiTinteiro') r.char.boss({ lid: p.hk ? 1 : 0 }); }
    if (p.pt && p.alive && !r.prot && fx) { r.prot = fx.protBubble(); r.char.root.add(r.prot); } // escudo de nascimento: bolha em volta
    if (r.prot) r.prot.visible = !!p.pt && p.alive;
    const rbp = G.mode === 'br' ? G.remoteBp.get(p.id)?.[p.wpn] : null;
    const ras = G.mode === 'borroes' && G.snap?.bor && !G.snap.bor.art && CATEGORY[p.wpn] && p.wpn !== 'melee'; // Rascunho: todo mundo com a arma de fabrica (pistola = Estalo)
    const rb = ras && G.boxBody?.get(p.id)?.[p.wpn];
    const lo = G.mode === 'gungame' ? { body: G.ladder[Math.min(p.gunLvl || 0, G.ladder.length - 1)].body } : ras ? ((G.rasLo ||= {})[p.wpn + rb] ||= infectLoadout(p.wpn, rb ? { body: rb } : undefined)) : rbp ? bpLoadout(rbp) : G.remoteLo.get(p.id)?.[p.wpn] || null;
    const loKey = p.wpn + JSON.stringify(lo);
    r.lo = lo; r.ad = p.ad || 0; r.ca = p.ca || 0;
    if (r.loKey !== loKey) { const was = r.wpn; r.loKey = loKey; r.wpn = p.wpn; r.char.setWeapon(p.wpn, lo); warmLater(r.char.gunHolder); if (was && was !== p.wpn && r.char.gun?.userData.saber) { r.char.gun.userData.saber.ignite(); audio.play('saber_on', { pos: r.pos, vol: 0.6, key: 'sbo' + p.id, max: 1 }); } }
  }
  for (const [id, r] of G.remotes) if (!seen.has(id)) { scene.remove(r.char.root); disposeGun(r.char.gun); G.remotes.delete(id); }
  // granadas voando
  const alive = new Set();
  for (const n of s.nades || []) {
    alive.add(n.id);
    let m = G.nadeMeshes.get(n.id);
    if (!m) { m = n.kind === 'ammobox' ? ammoboxMesh() : fx.nadeMesh(n.kind); scene.add(m); G.nadeMeshes.set(n.id, m); m.position.fromArray(n.pos); }
    m.userData.to = n.pos;
    if (n.d) { m.userData.rocket = true; m.lookAt(m.position.x - n.d[0], m.position.y - n.d[1], m.position.z - n.d[2]); } // foguete: ogiva (-Z) pra onde vai
  }
  for (const [id, m] of G.nadeMeshes) if (!alive.has(id)) { scene.remove(m); G.nadeMeshes.delete(id); }
  // dirigiveis
  const bl = s.blimps || [];
  // dirigivel nasce ja la no alto (antes nascia na origem e subia do chao)
  // casa pelo id: agora tem dirigivel e balao bombardeiro (pela posicao na lista um virava o outro)
  const blIds = new Set(bl.map(b => b.id));
  G.blimpMeshes = G.blimpMeshes.filter(m => { if (blIds.has(m.userData.id)) return true; scene.remove(m); return false; });
  for (const b of bl) {
    let m = G.blimpMeshes.find(x => x.userData.id === b.id);
    const at = b.k === 'sentry' ? [b.pos[0], b.pos[1] + 1, b.pos[2]] : b.k === 'beacon' ? [b.pos[0], b.pos[1] + 0.4, b.pos[2]] : b.pos; // sentinela: centro do corpo (o tiro mira ali)
    if (!m) { m = b.k === 'beacon' ? beaconMesh(b.team) : b.k === 'sentry' ? sentryMesh(b.team) : b.k === 'bomber' ? bomberMesh(b.team) : fx.blimpMesh(b.team); m.position.fromArray(at); m.userData.bomber = b.k === 'bomber'; if (b.k === 'sentry') m.rotation.y = b.yaw || 0; scene.add(m); G.blimpMeshes.push(m); }
    Object.assign(m.userData, { to: at, id: b.id, owner: b.owner, team: b.team, hp: b.hp, yaw: b.yaw, kind: b.k });
  }
  G.strikes?.sync(s, (x, z) => floorAt(G.M, x, z));
  { // carro da Captura de Bandeira (04/11): meu lugar; virei motorista = a fisica passa a rodar aqui (sem atraso)
    const ck = (s.cars || []).find(k => k.seats.includes(G.myId));
    G.mySeat = ck ? { id: ck.id, seat: ck.seats.indexOf(G.myId), hp: ck.hp } : null;
    document.body.classList.toggle('driving', G.mySeat?.seat === 0); // motorista: sem arma e sem municao na tela
    if (G.mySeat?.seat === 0) { if (!G.myCar || G.myCar.id !== ck.id) G.myCar = { id: ck.id, pos: [...ck.pos], yaw: ck.yaw, spd: ck.spd, vy: 0, steer: 0 }; }
    else G.myCar = null;
  }
  // Roube o Cofre: cofre, van, bolsas e barra; quem esta com a bolsa fica lento e so de pistola (player.js)
  if (s.heist) { G.heistView ||= new HeistView(scene); G.heistView.sync(s.heist, (id) => id === G.myId ? G.player?.pos : G.remotes.get(id)?.pos, G.myId); if (G.player) { const mine = s.heist.bags.some(b => b[1] === 1 && b[2] === G.myId); if (s.heist.kind === 'smuggle') { if (mine && !G.player.crated) hud.message(t('smCarry'), 2.6); G.player.crated = mine; G.player.bagged = false; } else { G.player.crated = false; G.player.bagged = mine; if (G.player.bagged && G.player.wpn !== 'pistol') G.player.equip('pistol'); } } }
  else if (G.heistView) { G.heistView.dispose(); G.heistView = null; if (G.player) { G.player.bagged = false; G.player.crated = false; } }
  // Noite dos Borroes: portas, armas na parede, leite, pocas, bolas de tinta e rolos
  if (s.bor) { if (!G.borView) { G.borView = new BorView(scene, G.M); G.borView.setNames((w) => gunName(G.myId, w), (w) => G.player?.lo(w)); } G.borView.sync(s.bor); }
  else if (G.borView) { G.borView.dispose(); G.borView = null; hud.prompt(null); }
  if (G.state === 'game') hud.score(s, G.me, s.players);
}

// parceiro caido (03/11, pedido dele): selo vermelho em cima dele, visto atraves da parede, com o tempo que falta,
// a distancia e a bomba enchendo; fora da tela gruda na borda com seta apontando
const _dv = new THREE.Vector3(), _dm = new Map();
function downMarks() {
  const on = G.state === 'game' && (G.duo || G.mode === 'borroes') && G.player;
  const seen = new Set();
  if (on) for (const r of G.remotes.values()) {
    if (r.mob || !r.alive || !(r.dn > 0) || r.team !== G.myTeam) continue;
    seen.add(r.id);
    let el = _dm.get(r.id);
    if (!el) {
      el = document.createElement('div'); el.className = 'down-mark';
      el.style.cssText = 'position:absolute;left:0;top:0;z-index:6;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:2px;font:13px "Bowlby One",sans-serif;color:#faf8f2;text-shadow:0 2px 0 #141210;transform:translate(-50%,-100%)';
      el.innerHTML = '<i style="font-style:normal;font-size:20px;line-height:1;transition:none">▼</i><b style="background:#c23a2a;border:3px solid #141210;border-radius:10px;padding:2px 9px;box-shadow:0 3px 0 #141210;white-space:nowrap"></b><span style="width:64px;height:6px;border:2px solid #141210;border-radius:4px;background:#141210;overflow:hidden"><u style="display:block;height:100%;width:0;background:#f2c14e"></u></span>';
      document.getElementById('hud').appendChild(el); _dm.set(r.id, el);
    }
    _dv.set(r.pos[0], r.pos[1] + 1.4, r.pos[2]).project(camera);
    const behind = _dv.z > 1, W = innerWidth, H = innerHeight;
    let x = (_dv.x * 0.5 + 0.5) * W, y = (-_dv.y * 0.5 + 0.5) * H;
    if (behind) { x = W - x; y = H - y; }
    const m = 60, off = behind || x < m || x > W - m || y < m + 40 || y > H - m;
    let ang = 0;
    if (off) { // gruda na borda e a seta aponta pra ele
      const cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m - 20) / Math.abs(dy || 1e-6));
      x = cx + dx * k; y = cy + dy * k; ang = Math.atan2(dy, dx) * 180 / Math.PI - 90;
    }
    el.style.left = x.toFixed(0) + 'px'; el.style.top = y.toFixed(0) + 'px';
    el.children[0].style.transform = `rotate(${off ? ang + 180 : 0}deg)`; el.children[0].style.order = off ? -1 : 0;
    const d = Math.round(Math.hypot(r.pos[0] - G.player.pos[0], r.pos[2] - G.player.pos[2]));
    const txt = `${t('down_tag')} ${Math.ceil(r.dn)}s · ${d}m`;
    if (el.children[1].textContent !== txt) el.children[1].textContent = txt;
    el.children[2].firstChild.style.width = Math.min(100, (r.rv || 0) / BR.duo.revive * 100).toFixed(0) + '%';
    el.style.opacity = r.dn < 8 && Math.floor(G.t * 4) % 2 ? '0.45' : '1'; // pouco tempo: pisca
  }
  for (const [id, el] of _dm) if (!seen.has(id)) { el.remove(); _dm.delete(id); }
}

function nameOf(id) {
  if (id === G.myId) return t('youCap');
  const p = G.snap?.players.find(x => x.id === id);
  return p ? (p.mob ? t('mob_' + p.mob) : p.name) : '?';
}
function teamCls(id) {
  const p = G.snap?.players.find(x => x.id === id);
  return p?.team === 'red' ? 'r' : p?.team === 'blue' ? 'b' : '';
}
function posOf(id) {
  if (id === G.myId && G.player) return G.player.pos;
  return G.remotes.get(id)?.pos;
}

function onEvent(e) {
  const inGame = G.state === 'game';
  G.tutorial?.onEvent(e); G.range?.onEvent(e);
  if (e.k === 'spawn') G.boxBody?.delete(e.id); // renasceu so com a Estalo: o modelo da Caixa vai embora
  switch (e.k) {
    case 'spawn':
      if (e.id === G.myId && G.player) {
        if (inGame) audio.play('poof', { ui: true, vol: 0.3, key: 'poof', max: 1 });
        // camo reativa: o estagio vem da sequencia do servidor. Quem morreu volta do 0; quem sobreviveu a
        // rodada da bomba (todo mundo renasce na rodada nova) mantem o estagio
        const meSnap = G.snap?.players?.find(o => o.id === G.myId);
        G.reactStage = Math.min(3, Math.floor((meSnap?.streak || 0) / 2));
        $('specBar').hidden = true; $('dead').classList.remove('spec');
        if (e.team) G.myTeam = e.team;
        if (e.mode) G.mode = e.mode; // o modo da sala pode ter acabado de mudar (o kit depende dele)
        if (G.pendingLo) { G.pendingLo = false; G.loadouts = matchLoadouts(); } // montagem guardada vale agora
        G.player.spawn(e);
        if (G.loNow) { G.loNow = false; G.player.rearm?.(); }
        G.shieldT = 0; vm.umbOn = false; G.ringWait = false; G.bounceBack = false;
        if (G.mode === 'br' && inGame) setTimeout(() => tip('ping'), 9000); // marcacao: dica de primeira vez (depois da do modo)
        if (e.air && G.bounce) hud.alert(t('bounceDrop'), t(settings.autoChute ? 'bounceDropAuto' : (isTouch ? 'bounceDropTouch' : 'bounceDropKey')), 'red');
        if (!G.inRing || e.pos[2] < (G.M.ring?.c[2] ?? 1e9) - 10) G.inRing = false; // saiu do ringue
        hud.hp(100); hud.weapon(G.player);
        $('dead').hidden = true; document.body.classList.remove('is-dead');
        G.deathPos = null;
      } else if (inGame) fx.puff([e.pos[0], 1, e.pos[2]], 5, 0.8, 0xece9e1, 0.6);
      break;
    case 'boom': // bala explosiva estourou no alvo
      if (inGame && e.at) { fx.puff(e.at, 8, 0.8, 0x2a2724, 0.6); fx.word('POF!', e.at, 1.5, 0.55); audio.play('explosion', { pos: e.at, vol: 0.35, rate: 1.6, key: 'boom', max: 2 }); }
      break;
    case 'shot': {
      if (e.id === G.myId) break;
      if (e.id !== 'blimp') G.seen.set(e.id, G.t + 2.2);
      const r = G.remotes.get(e.id);
      if (G.specVm && G.specVm.startsWith(e.id + '|') && !G.player?.alive) vm.fire((WEAPONS[e.wpn]?.kick || 1) * 1.3);
      const rBody = G.remoteBp.get(e.id)?.[e.wpn] ? null : G.remoteLo.get(e.id)?.[e.wpn]?.body, rvBody = e.wpn === 'pistol' && rBody === 'pistol_10', aaBody = e.wpn === 'shotgun' && rBody === 'shotgun_3', lzBody = e.wpn === 'pistol' && rBody === LASER_BODY;
      const rTr = lzBody ? 'laser' : G.remoteLo.get(e.id)?.[e.wpn]?.tracer || 'chalk', rSnd = lzBody ? 'laser' : rvBody ? 'revolver' : aaBody ? 'aa12' : audio.gunSound(rBody, e.wpn); // som proprio do modelo
      const rSilOn = String(G.remoteLo.get(e.id)?.[e.wpn]?.muzzle || '').startsWith('silencer'), rSil = rSilOn && !lzBody ? audio.silSound(e.wpn) : null;
      audio.play(rSil || rSnd, { pos: e.o, vol: inGame ? 0.75 : 0.12, key: 'rgun' + e.id, max: 2, muffle: rSilOn && !rSil, dry: !!rSil });
      const rg = r?.char.gun?.userData; if (rg?.drum) rg.drum.rotation.z += Math.PI / 3; // tambor do revolver gira no boneco tambem
      if (e.e) {
        const mz = r?.char.gun?.userData.muzzle;
        const o = mz ? mz.getWorldPosition(new THREE.Vector3()).toArray() : e.o;
        fx.bullet(o, e.e, rTr, e.wpn);
        if (inGame) replay.shot(performance.now() / 1000, { id: e.id, o, e: e.e, tracer: rTr, wpn: e.wpn, snd: rSnd });
        if (Math.random() < 0.5) fx.impact(e.e, null);
      }
      break;
    }
    case 'swing': { if (inGame) replay.swing(performance.now() / 1000, e.id); const r = G.remotes.get(e.id); r?.char.swing?.(); if (r?.wpn === 'melee' && isSaber(r.lo?.body)) audio.play('saber_swing', { pos: r.pos, vol: 0.6, key: 'sbs' + e.id, max: 1 }); break; } // golpe visto de fora (01/11)
    case 'borSpit': case 'borSummon': { const r = G.remotes.get(e.id); r?.char.swing?.(); break; } // vilao atacando de longe: mesmo bote
    case 'borLeap': { const r = G.remotes.get(e.id); r?.char.leap?.(); break; }
    case 'hurt':
      if (e.v === G.myId && G.player) {
        audio.play('hit', { vol: 0.7, key: 'hurt', max: 2 });
        G.hurtFlash = Math.min(1, (G.hurtFlash || 0) + e.dmg / 60);
        // tranco de FPS (pedido dele 30/10): a camera pula de leve pra cima e tomba pro lado do tiro, volta com mola
        const kick = 0.01 + Math.min(0.018, e.dmg / 3000);
        G.kickP = (G.kickP || 0) + kick; G.kickR = G.kickR || 0;
        if (e.from) {
          const dx = e.from[0] - G.player.pos[0], dz = e.from[2] - G.player.pos[2];
          const rel = -(Math.atan2(-dx, -dz) - G.player.yaw);
          hud.hurtFrom(rel);
          G.kickR += Math.sin(rel) * kick * 0.9; // tiro da direita tomba pra esquerda
        }
        G.shake(0.08 + Math.min(0.2, e.dmg / 300) + (e.am === 'boom' ? 0.15 : 0));
        if (e.burn || e.am === 'fire') ammoFx('fire', 2.4);
        if (e.am === 'trace') ammoFx('trace', AMMO.trace.mark);
        if (e.am === 'boom') ammoFx('boom', 0.7);
        if (e.am === 'ap') ammoFx('ap', 0.9);
      } else if (e.a !== G.myId) G.remotes.get(e.v)?.char.flinch(e.head);
      if (e.burn && inGame) { const q = e.v === G.myId ? null : posOf(e.v); if (q) fx.puff([q[0], q[1] + 1.2, q[2]], 3, 0.4, 0xff7a1a, 0.45); }
      break;
    case 'assist':
      if (e.id === G.myId) { gainXp('assist'); chEvent({ type: 'assist' }); audio.play('ding', { ui: true, vol: 0.35, key: 'ding', max: 1 }); }
      break;
    case 'kill': {
      if (inGame && !G.tutorial && !G.range) { if (e.v === G.myId) statAdd('deaths'); if (e.a === G.myId && e.streak) statMax('bestStreak', e.streak); } // Perfil
      if (e.v === G.myId && (G.mode === 'bomb' || G.mode === 'br') && !G.bounceBack) { $('specBar').hidden = false; $('dead').classList.add('spec'); } // sem renascer: assiste
      if (e.v === G.myId) G.inRing = false; // perdeu no ringue: a parede da iris volta pra quem assiste
      const vPos = e.pos || posOf(e.v);
      if (inGame) replay.setKill(performance.now() / 1000, e, vPos, G.myId);
      if (vPos && inGame) {
        fx.puff([vPos[0], vPos[1] + 0.8, vPos[2]], 9, 1.1, 0xece9e1, 0.9);
        fx.splat([vPos[0], vPos[1], vPos[2]], 1.8);
        fx.stars([vPos[0], vPos[1] + 1.2, vPos[2]]);
        fx.word(['PLAFT!', 'SPLASH!', 'CATAPLOFT!'][Math.floor(Math.random() * 3)], [vPos[0], vPos[1] + 2, vPos[2]], 2.2, 0.9);
        audio.play('death', { pos: [vPos[0], vPos[1] + 1, vPos[2]], vol: 0.8, key: 'death', max: 3 });
      }
      const wn = gunName(e.a, e.wpn);
      const html = e.a ? `<span class="${teamCls(e.a)}">${esc(nameOf(e.a))}</span> ${e.head ? t('f_head') : t('f_kill')} <span class="${teamCls(e.v)}">${esc(nameOf(e.v))}</span> <small>(${esc(wn)})</small>${FEED_ICO[e.wpn] ? `<i class="kf-ico">${FEED_ICO[e.wpn]}</i>` : ''}${e.head ? HS_ICON : ''}` : `<span class="${teamCls(e.v)}">${esc(nameOf(e.v))}</span> ${t('f_self')}`;
      if (inGame && G.mode !== 'borroes') hud.feed(html, e.a === G.myId || e.v === G.myId); // noite dos borroes: sem killfeed (pedido dele)
      if (e.a === G.myId && inGame) {
        chEvent({ type: 'kill', wpn: e.wpn, head: !!e.head, streak: e.streak || 0, body: G.player?.lo(e.wpn)?.body }); // body: desafio de um modelo (gadgets)
        G.player?.scavenge?.(); // skill catador
        // multiabate: 3 derrubados em 4 s (desafio de elite)
        const now = performance.now() / 1000;
        G.multi = (G.multi || []).filter(x => now - x < 4); G.multi.push(now);
        if (G.multi.length >= 3) { G.multi = []; chEvent({ type: 'multi' }); }
        // camuflagem reativa: sobe de estagio a cada 2 abates nessa vida (2, 4, 6)
        const st = Math.min(3, Math.floor((e.streak || 0) / 2));
        if (st > (G.reactStage || 0)) {
          G.reactStage = st;
          const cm = CAMOS.find(c => c.id === G.loadouts[G.player?.wpn]?.camo);
          if (cm?.react) { hud.message(t('reacted', { n: st }), 1.6); audio.play('unlock', { vol: 0.5, ui: true, rate: 1.2 + st * 0.1 }); }
        }
        gainXp('kill', e.wpn);
        if (e.head) gainXp('head', e.wpn);
        const kw = t('killWords');
        hud.stampText(kw[Math.floor(Math.random() * kw.length)], t('streak')[e.streak] || (e.head ? t('headTag') : ''));
        audio.play('killstamp', { vol: 0.6, ui: true });
        G.shake(0.12);
      }
      if (e.v === G.myId && G.player) {
        G.player.alive = false;
        G.deathPos = [...G.player.pos];
        // mira do toque e um botao liga/desliga: morreu mirando, renasce sem mira (gun game reclamava)
        input.touch.ads = false; input.adsBtn?.classList.remove('on'); G.player.adsK = 0;
        $('dead').hidden = false; document.body.classList.add('is-dead');
        $('deadBy').textContent = e.a ? t('killedYou', { n: nameOf(e.a) }) : t('selfKill');
        G.killer = e.a;
        audio.stopKey('gun');
        // kill cam em quadrinhos (so quando alguem te pegou; iris, queda e bigorna propria nao)
        const kr = e.a && e.a !== G.myId ? G.remotes.get(e.a) : null, cm = $('comic');
        cm.hidden = true;
        { const db = $('deadBnr'); db.hidden = !(e.a && e.a !== G.myId && e.bn); if (!db.hidden) { db.innerHTML = bannerHtml(e.bn, { name: nameOf(e.a), lvl: G.snap?.players?.find(x => x.id === e.a)?.lvl || kr?.lvl || 0 }); $('deadBy').textContent = ''; } } // o banner ja diz quem foi (pedido dele 05/11)
        if (kr?.pos && inGame) {
          const wn = gunName(e.a, e.wpn), dpos = G.deathPos, life = G.lifeN = (G.lifeN || 0) + 1;
          // quadro do meio: a arma de quem te pegou, inteira e de lado, com o nome do modelo (pedido dele 01/11)
          const kbp = G.remoteBp.get(e.a)?.[e.wpn];
          const klo = kbp ? bpLoadout(kbp) : G.mode === 'gungame' ? { body: G.ladder[Math.min(G.snap?.players?.find(x => x.id === e.a)?.gunLvl || 0, G.ladder.length - 1)]?.body } : G.remoteLo.get(e.a)?.[e.wpn] || defaultLoadout(e.wpn);
          // foto lida da placa sem travar (03/11): a tira entra quando fica pronta, se voce ainda estiver na tela de morte
          shootPanels(renderer, scene, { pos: kr.pos, yaw: kr.yaw || 0 }).then(imgs => {
            if (life !== G.lifeN || G.player?.alive || G.state !== 'game') return;
            imgs[1] = CATEGORY[e.wpn] ? unlockShot({ wpn: e.wpn, lo: klo }) : null;
            const kLvl = G.snap?.players?.find(x => x.id === e.a)?.lvl || kr.lvl || null, kVar = klo?.cvName || (klo?.ws ? t('ws_' + klo.ws) : kbp ? t(kbp) : null); // nivel de quem te pegou e a variante/skin da arma dele
            cm.innerHTML = stripHtml(imgs, { killer: nameOf(e.a), wpn: wn, lvl: kLvl, variant: kVar, dist: Math.round(Math.hypot(kr.pos[0] - dpos[0], kr.pos[2] - dpos[2])), head: e.head, t, icon: DEATH_SVG[e.wpn] || null });
            cm.hidden = false; cm.classList.remove('in'); void cm.offsetWidth; cm.classList.add('in');
            audio.play('comic', { ui: true, vol: 0.55 });
          });
        }
      }
      break;
    }
    case 'reload':
      if (inGame && e.id !== G.myId) audio.play('reload', { pos: e.pos, vol: 0.55, key: 'rrl' + e.id, max: 1 });
      break;
    case 'throw':
      if (inGame && e.id !== G.myId) audio.play('whoosh', { pos: posOf(e.id) || null, vol: 0.4 });
      break;
    case 'bounce':
      if (inGame) audio.play('step2', { pos: e.pos, vol: 0.5, rate: 1.6, key: 'bnc', max: 3 });
      break;
    case 'flame': // lanca-chamas de outro (o meu desenha na hora em que aperto)
      if (inGame && e.id !== G.myId && e.o && e.d) { fx.flame(e.o, e.d); if (Math.random() < 0.5) audio.play('flamer', { pos: e.o, vol: 0.5, key: 'flamer', max: 2 }); }
      break;
    case 'rocketOut': // Bazuca de outro: o chiado sai de onde ele esta
      if (inGame && e.id !== G.myId) audio.play('rocket', { pos: e.pos, vol: 0.9, key: 'rocket', max: 3 });
      break;
    case 'rocketBoom': { // foguete estourou: explosao grande, KABUM! e, no acerto direto, o boneco voa
      if (!inGame) break;
      fx.explosion(e.pos); fx.explosion([e.pos[0] + 0.8, e.pos[1] + 0.7, e.pos[2]]); fx.word('KABUM!', [e.pos[0], e.pos[1] + 1.4, e.pos[2]], 2.4, 0.9);
      audio.play('explosion', { pos: e.pos, vol: 1, key: 'boom', max: 3 });
      if (G.player && G.player.alive) {
        const p = G.player.pos, c = [p[0], p[1] + 0.9, p[2]], d = Math.hypot(c[0] - e.pos[0], c[1] - e.pos[1], c[2] - e.pos[2]);
        if (d < 30) G.shake(0.7 * (1 - d / 30));
        if (d < 5.5) { const k = (1 - d / 5.5) * 9 / Math.max(d, 0.6); G.player.impulse([(c[0] - e.pos[0]) * k, 3 + (1 - d / 5.5) * 5, (c[2] - e.pos[2]) * k]); }
      }
      break;
    }
    case 'boom': {
      fx.explosion(e.pos);
      if (e.big) { fx.explosion([e.pos[0] + 1.5, e.pos[1] + 1, e.pos[2]]); fx.explosion([e.pos[0] - 1.5, e.pos[1] + 2, e.pos[2] + 1]); G.shake(0.6); }
      audio.play('explosion', { pos: e.pos, vol: inGame ? 1 : 0.2, key: 'boom', max: 3 });
      if (G.player && G.player.alive) {
        const p = G.player.pos, c = [p[0], p[1] + 0.9, p[2]];
        const d = Math.hypot(c[0] - e.pos[0], c[1] - e.pos[1], c[2] - e.pos[2]);
        if (d < 25) G.shake(0.5 * (1 - d / 25));
        if (d < 6.5) { const k = (1 - d / 6.5) * 9 / Math.max(d, 0.6); G.player.impulse([(c[0] - e.pos[0]) * k, 3 + (1 - d / 6.5) * 5, (c[2] - e.pos[2]) * k]); }
      }
      break;
    }
    case 'flash': {
      fx.flashBang(e.pos);
      audio.play('headshot', { pos: e.pos, vol: 0.9, rate: 1.8 });
      if (G.player && G.player.alive) {
        // cega quem tem linha de visao, mais forte olhando pra ela
        const eye = G.player.eyePos();
        const d = Math.hypot(eye[0] - e.pos[0], eye[1] - e.pos[1], eye[2] - e.pos[2]);
        if (d < 15 && hasLOS(G.M, eye, e.pos)) {
          const f = new THREE.Vector3(); camera.getWorldDirection(f);
          const to = new THREE.Vector3(e.pos[0] - eye[0], e.pos[1] - eye[1], e.pos[2] - eye[2]).normalize();
          const face = Math.max(0, f.dot(to));
          G.flashT = Math.max(G.flashT, (0.8 + face * 2.6) * (1 - d / 15) + 0.3);
          audio.duck(0.15, G.flashT);
        }
      }
      break;
    }
    case 'anvilWarn':
      if (inGame) { for (const pos of e.list) fx.anvilWarn(pos); audio.play('whoosh', { vol: 0.6, rate: 0.6 }); }
      break;
    case 'anvil':
      fx.anvil(e.pos);
      setTimeout(() => audio.play('pan', { pos: e.pos, vol: 1, rate: 0.7 }) || audio.play('explosion', { pos: e.pos, vol: 0.7, rate: 1.3 }), 180);
      if (G.player && Math.hypot(G.player.pos[0] - e.pos[0], G.player.pos[2] - e.pos[2]) < 18) G.shake(0.3);
      break;
    case 'nuke':
      // a torta caiu: clarao branco + tremor pra todo mundo
      if (inGame) {
        G.flashT = Math.max(G.flashT, 1.4); G.shake(0.9);
        audio.play('explosion', { ui: true, vol: 1, rate: 0.55 }); audio.play('pan', { ui: true, vol: 0.9, rate: 0.6 });
        if (e.id === G.myId) hud.alert(t('nukeHit'), t('nukeHitSub', { n: e.n }), 'blue');
      }
      break;
    case 'streakWait': // o servidor recusou (outra sequencia no ar)
      if (inGame) { hud.message(t(e.kind === 'gap' ? 'streakGap' : 'streakWait', { s: t('s_' + e.kind), n: e.n }), 1.8); audio.play('empty', { ui: true, vol: 0.5 }); }
      break;
    case 'streakReady':
      // Torta Atomica na mao de alguem (01/11): alarme comico pra sala inteira + aviso de quem pegou
      if (e.kind === 'nuke' && inGame) { audio.play('nukealarm', { ui: true, vol: 0.7, jitter: 0 }); if (e.id !== G.myId) hud.message(t('nukeGot', { n: nameOf(e.id) }), 3); }
      if (e.id === G.myId && inGame) { hud.message(t('streakReady', { s: t('s_' + e.kind), k: t(pad.active ? 'how_pad' : isTouch ? 'how_touch' : 'how_kb') }), 2.4); audio.play('pickup', { vol: 0.7, ui: true, rate: 0.8 }); }
      break;
    // Roube o Cofre
    case 'heistCrack':
      if (inGame && e.state === 'crack') audio.play('safetick', { pos: G.snap?.heist?.vault, vol: 0.8, key: 'safe', max: 1 });
      break;
    case 'heistOpen':
      if (inGame) { const atk = G.snap?.heist?.atk === G.myTeam; hud.alert(t('hsOpen'), t(atk ? 'hsOpenSub' : 'hsDefSub'), atk ? (G.myTeam || 'red') : 'enemy'); audio.play('siren', { vol: 0.9, ui: true, key: 'siren', max: 1 }); }
      break;
    case 'heistBag':
      if (!inGame) break;
      const sm = G.snap?.heist?.kind === 'smuggle';
      if (e.act === 'take') { if (e.id === G.myId) { if (!sm) hud.message(t('hsYouBag'), 2.4); audio.play('pickup', { ui: true, vol: 0.7 }); } else hud.message(t('hsTake', { n: nameOf(e.id) }), 1.8); }
      else if (e.act === 'drop') { hud.message(t('hsDrop'), 1.8); audio.play('land', { pos: e.pos, vol: 0.8 }); }
      else if (e.act === 'return') hud.message(t('hsReturn'), 1.8);
      else if (e.act === 'bank' && sm) { hud.message(t('smBank', { n: e.money, q: G.snap?.heist?.quota || 5, s: e.bonus }), 2.6); audio.play('pickup', { ui: true, vol: 0.8 }); if (e.id === G.myId) gainXp('streak'); }
      else if (e.act === 'bank') { { const f = (n) => Number(n || 0).toLocaleString('pt-BR'); hud.message(t('hsBank', { v: f(HEIST.bagValue), m: f(e.money), q: f(HEIST.quota), s: e.bonus }), 2.6); } /* valor de verdade da bolsa e o total (04/11: dizia 1000) */ audio.play('cashreg', { vol: 0.85, ui: true, key: 'cash', max: 2 }); if (e.id === G.myId) gainXp('streak'); }
      break;
    case 'heistPass': // Contrabando: o caixote voa (arco desenhado pelo HeistView)
      if (inGame) { G.heistView?.pass(e); audio.play('whoosh', { pos: e.from, vol: 0.7 }); if (e.to === G.myId) hud.message(t('smCatch'), 1.8); }
      break;
    case 'heistRound':
      if (inGame) { const mine = e.win === G.myTeam; hud.alert(t('hsWinR', { t: t(e.win === 'red' ? 'h_red' : 'h_blue') }), t(e.why === 'quota' ? (G.snap?.heist?.kind === 'smuggle' ? 'smWhyQuota' : 'hsWhyQuota') : 'hsWhyTime') + ` · ${e.wins.red} x ${e.wins.blue}`, mine ? (G.myTeam || 'red') : 'enemy'); audio.play(mine ? 'win' : 'lose', { ui: true, vol: 0.6 }); }
      break;
    case 'heistNew':
      if (inGame) { const atk = e.atk === G.myTeam; const smq = G.snap?.heist?.kind === 'smuggle'; hud.alert(t(atk ? 'hsAtk' : 'hsDef'), t(atk ? (smq ? 'smAtkSub' : 'hsAtkSub') : (smq ? 'smDefSub' : 'hsDefSub')), atk ? (G.myTeam || 'red') : 'enemy'); }
      break;
    case 'trainWarn': // trem desgovernado: apito e aviso (o trilho vermelho vem pelo estado)
      if (inGame) { audio.play('trainwhistle', { pos: [e.a[0], 1, e.a[1]], vol: 1, key: 'train', max: 1 }); hud.message(t('trainWarn'), 2.4); }
      break;
    case 'fireDrop': // balao bombardeiro largou fogo
      if (inGame) { G.strikes?.fireDrop(e.o, e.at); if (Math.random() < 0.35) audio.play('firedrop', { pos: e.at, vol: 0.6, key: 'fdrop', max: 3 }); }
      break;
    case 'erase': // mao do animador apagou alguem
      if (inGame) { fx.word(t('erased'), [e.pos[0], e.pos[1] + 2.2, e.pos[2]], 2.4, 0.9); fx.puff([e.pos[0], e.pos[1] + 1, e.pos[2]], 8, 1, PAL.white, 0.7); audio.play('eraser', { pos: e.pos, vol: 0.9, key: 'erase', max: 2 }); G.strikes?.erased(e.id, e.pos); if (e.id === G.myId) G.strikes?.paper(); }
      break;
    case 'blimpDown': // dirigivel estourado a tiro: explode, some e a sala pode chamar outra sequencia
      if (!inGame) break;
      fx.explosion(e.pos); fx.explosion([e.pos[0] + 2, e.pos[1] - 1, e.pos[2] + 1]); fx.explosion([e.pos[0] - 2, e.pos[1] + 1, e.pos[2] - 2]);
      fx.word(e.sentry ? 'CRAC!' : 'KABUM!', e.pos, e.sentry ? 1.6 : 3, 0.9);
      if (e.sentry && e.id === G.myId) hud.message(t(e.beacon ? 'beaconDown' : 'sentryDown'), 2.2);
      if (e.beacon && e.owner === G.myId) hud.message(t('beaconLost'), 2.4);
      audio.play('explosion', { pos: e.pos, vol: 0.9, key: 'blimpx', max: 1 });
      hud.message(t('blimpDownMsg', { w: nameOf(e.id), o: nameOf(e.owner) }), 2.6);
      if (e.id === G.myId) gainXp('blimpDown');
      break;
    case 'streak':
      if (inGame) {
        const mine = e.id === G.myId, ally = (MODES[G.mode].teams || G.duo) && e.team === G.myTeam;
        if (mine) { gainXp('streak'); vm.callStreak(e.kind); chEvent({ type: 'streak', kind: e.kind }); }
        if (e.kind === 'hand') G.strikes?.paper(); // a tela vira folha de papel pra todo mundo
        if (e.kind === 'plane' || e.kind === 'bomber') audio.play(e.kind === 'plane' ? 'planefly' : 'bomberdrone', { vol: e.kind === 'bomber' ? 1 : 0.8, ui: true, key: e.kind, max: 1 });
        // Torta Atomica: aviso grande pra todo mundo, com o nome de quem pediu
        if (e.kind === 'nuke') hud.alert(t(mine ? 'nukeYou' : ally ? 'nukeAlly' : 'nukeEnemy', { n: nameOf(e.id) }), t(mine ? 'nukeYouSub' : ally ? 'nukeAllySub' : 'nukeEnemySub', { t: e.delay || 6 }), mine || ally ? 'blue' : 'red');
        else hud.push(`${bannerHtml(e.bn, { name: nameOf(e.id) })}<small>${esc(t(mine || ally ? 'streakAlly' : 'streakEnemy', { s: t('s_' + e.kind), n: nameOf(e.id) }))}</small>`, 'ev-bnr' + (mine || ally ? '' : ' foe'), 3200);
        audio.play(mine || ally ? 'flag' : 'capture', { vol: 0.7, ui: true });
      }
      break;
    case 'look':
      if (e.id !== G.myId) { G.remoteLook.set(e.id, e.look); G.remotes.get(e.id)?.char.setLook(e.look); }
      break;
    case 'ladder': // escada de armas sorteada pra partida
      G.ladder = e.list.map(b => ({ wpn: wpnOfBody(b), body: b })); G.ladderId = e.id;
      if (inGame && e.id) hud.message(t('gg_' + e.id), 2.6);
      break;
    case 'brBp': // variante que alguem pegou no battle royale (os outros veem o modelo dela)
      if (e.id !== G.myId) { const m = G.remoteBp.get(e.id) || {}; if (e.bp) m[e.wpn] = e.bp; else delete m[e.wpn]; G.remoteBp.set(e.id, m); }
      break;
    case 'lo':
      if (e.id !== G.myId) { G.remoteLo.set(e.id, e.los || {}); audio.preloadGuns(Object.values(e.los || {}).map(l => l?.body)); G.remoteTracer.set(e.id, e.tracer || 'chalk'); }
      break;
    // ---------- equipamento de campo ----------
    case 'field': {
      const pos = e.id === G.myId ? G.player?.pos : posOf(e.id);
      if (e.id === G.myId) { G.fieldK = 0; G.fieldUsedT = G.t; if (e.kind === 'umbrella') { G.shieldT = FIELD.umbrella.dur; vm.umbOn = true; } if (e.kind === 'stim') { vm.stim(); G.stimBoostT = FIELD.stim.boostT; if (G.player) G.player.switchT = Math.max(G.player.switchT, 1.1); } /* arma guardada: nao atira nem recarrega ate a injecao acabar */ if (e.kind === 'vest') hud.message(t('vestOn'), 1.4); }
      // estimulante = chiado da bomba de ar; colete = o som de pegar item (sem som proprio ainda)
      if (inGame) audio.play(e.kind === 'anvil' ? 'anvilfall' : e.kind === 'stim' ? 'pump' : e.kind === 'vest' ? 'pickup' : e.kind, { pos: e.kind === 'anvil' && e.at ? e.at : pos, vol: 0.75 });
      break;
    }
    case 'vestBreak': if (e.id === G.myId && inGame) { hud.message(t('vestBreak'), 1.6); audio.play('balloon', { ui: true, vol: 0.5, rate: 1.3 }); } break;
    case 'fieldFail': if (e.id === G.myId && inGame) { hud.message(t('fieldFail'), 1.6); audio.play('empty', { vol: 0.4 }); } break;
    case 'fieldReady': if (e.id === G.myId && inGame) { G.fieldK = 1; audio.play('fieldready', { ui: true, vol: 0.5 }); hud.stampText(t('fieldStamp', { w: t('fd_' + G.field) }), t('fieldStampSub')); } break; // mesmo carimbo do 'Virou panqueca' (04/11)
    case 'tomaPick': if (e.id === G.myId && inGame) { hud.message(t('tomaPick'), 1.4); audio.play('pickup', { ui: true, vol: 0.5 }); } break;
    case 'umbBreak': { // guarda-chuva levou tiro demais: estoura e some
      const q = e.id === G.myId ? G.player?.pos : posOf(e.id);
      if (e.id === G.myId) { G.shieldT = 0; vm.umbOn = false; if (inGame) hud.message(t('umbBreak'), 1.6); }
      if (q && inGame) { fx.word('PLOFT!', [q[0], q[1] + 1.4, q[2]], 1.6, 0.6); audio.play('balloon', { pos: q, vol: 0.7, rate: 0.8 }); }
      break;
    }
    case 'block': {
      const q = e.v === G.myId ? G.player?.pos : posOf(e.v);
      if (q && inGame) { fx.word('PLINK!', [q[0], q[1] + 1.4, q[2]], 1.2, 0.45); audio.play('pan', { pos: q, vol: 0.5, rate: 1.4, key: 'block', max: 2 }); }
      break;
    }
    case 'boing': fieldView?.bounce(G.snap?.field?.springs?.find(s => Math.hypot(s[1] - e.pos[0], s[3] - e.pos[2]) < 0.1)?.[0]); if (inGame) audio.play('spring', { pos: e.pos, vol: 0.6 }); break;
    case 'slurp': if (inGame) { audio.play('hole', { pos: e.to, vol: 0.6 }); fx.puff([e.to[0], e.to[1] + 0.5, e.to[2]], 6, 0.6, 0x141210, 0.5); } break;
    // ---------- battle royale ----------
    case 'loot': G.brLoot = e.list; brView?.setLoot(e.list); G.brCrates = e.list.filter(l => l[1] === 'crate').map(l => [l[3], l[5]]); break;
    case 'chat': chat.add(e, e.id === G.myId, !!(MODES[G.mode]?.teams || G.duo) && G.isEnemy({ id: e.id, team: e.team })); if (e.id !== G.myId) audio.play('ui_click', { ui: true, vol: 0.35 }); break;
    case 'escRound': if (inGame) { const mine = G.myTeam === e.atk; hud.alert(t('es_round2'), t(e.done ? 'es_r2SubDone' : 'es_r2Sub', { n: e.mark }) + ' ' + t(mine ? 'es_youAtk' : 'es_youDef'), mine ? 'red' : 'blue'); audio.play('ringbell', { ui: true, vol: 0.6 }); } break;
    case 'ping': // marcacao (minha ou do parceiro)
      if (e.off) { G.pings.delete(e.id); break; }
      G.pings.set(e.id, { pos: e.pos, kind: e.kind, label: e.label, t: G.t + 10 });
      if (inGame) audio.play('ui_hover', { ui: true, vol: e.id === G.myId ? 0.45 : 0.7, rate: e.kind === 'enemy' ? 1.3 : 1, key: 'ping', max: 1 });
      break;
    case 'drop':
      G.brDrops = [...G.brDrops.filter(d => d.t > G.t), { pos: e.pos, t: G.t + (e.fall || 6) + 1 }];
      brView?.drop(e.pos, e.fall);
      if (inGame) { hud.alert(t('br_drop'), t('br_dropSub'), 'red'); audio.play('flag', { ui: true, vol: 0.45 }); }
      break;
    case 'loot1':
      if (e.by === G.myId && inGame) {
        if (e.kind === 'armor') tip('armor');
        if (e.kind === 'crate') tip('crate');
        if (e.kind !== 'wpn') hud.message(t('br_got_' + e.kind), 1.6);
        audio.play('pickup', { ui: true, vol: 0.5 });
      }
      break;
    // ---------- ringue de boxe ----------
    // dupla: caiu (fica no chao), parceiro comecou a encher a bomba, levantou
    case 'down': {
      if (!inGame) break;
      const mine = e.id === G.myId, mate = !mine && G.snap?.players.find(o => o.id === e.id)?.team === G.myTeam;
      hud.feed(t(mine ? 'duo_feedMe' : 'duo_feed', { n: esc(nameOf(e.id)) }));
      if (mine) { tip(G.mode === 'borroes' ? 'borroes' : 'duo'); hud.alert(t('duo_downMe'), t('duo_downMeSub'), 'red'); audio.play('death', { ui: true, vol: 0.5, rate: 0.7 }); }
      else if (mate) { hud.alert(t('duo_downMate', { n: nameOf(e.id) }), t(isTouch ? 'duo_pumpTouch' : G.pad?.active ? 'duo_pumpPad' : 'duo_pump'), 'red'); audio.play('hurt', { ui: true, vol: 0.5 }); }
      if (e.pos) fx.word('UFA!', [e.pos[0], e.pos[1] + 1.4, e.pos[2]], 1.4, 0.7);
      break;
    }
    case 'pump':
      if (inGame) { const at = posOf(e.id); audio.play('pump', at ? { pos: [at[0], at[1] + 0.5, at[2]], vol: 0.8 } : { ui: true, vol: 0.6 }); }
      break;
    case 'revive': {
      if (!inGame) break;
      hud.feed(t('duo_revFeed', { a: esc(nameOf(e.by)), n: esc(nameOf(e.id)) }));
      if (e.id === G.myId) hud.alert(t('duo_upMe'), t('duo_upMeSub', { n: nameOf(e.by) }), 'blue');
      else if (e.by === G.myId) { hud.message(t('duo_upDone', { n: nameOf(e.id) }), 2); gainXp('revive'); }
      if (e.pos) { fx.puff([e.pos[0], e.pos[1] + 1, e.pos[2]], 8, 1, 0xece9e1, 0.7); fx.word('BOING!', [e.pos[0], e.pos[1] + 2, e.pos[2]], 1.8, 0.8); }
      audio.play('spring', e.pos ? { pos: e.pos, vol: 0.7 } : { ui: true, vol: 0.5 });
      break;
    }
    case 'bounceWait': // bate-volta: caiu, mas volta do ceu
      if (e.id === G.myId) { G.bounceBack = true; if (inGame) tip('bounce'); }
      break;
    case 'ringWait':
      if (e.id === G.myId && inGame) { G.ringWait = true; $('deadBy').textContent = t('ring_wait'); tip('ring'); }
      break;
    case 'ring':
      if (inGame) {
        if (brView) brView.cheer = 2.5;
        if (e.a === G.myId || e.b === G.myId) { G.ringWait = false; G.inRing = true; ringCut(); hud.alert(t('ring_go'), t('ring_vs', { a: nameOf(e.a), b: nameOf(e.b) }), 'red'); audio.play('ringbell', { ui: true, vol: 0.8 }); audio.play('crowd', { ui: true, vol: 0.45 }); }
      }
      break;
    case 'ringWin':
      if (e.id === G.myId) G.inRing = false;
      if (inGame && e.id === G.myId) { hud.alert(t('ring_back'), t('ring_backSub'), 'red'); audio.play('balloon', { ui: true, vol: 0.7 }); audio.play('crowd', { ui: true, vol: 0.4 }); }
      if (inGame && e.pos) fx.puff([e.pos[0], e.pos[1] + 2, e.pos[2]], 8, 1, 0xa83a2c, 0.7);
      break;
    case 'iris':
      if (inGame && e.state === 'shrink') tip('iris');
      if (inGame && e.state === 'shrink') { hud.alert(t('br_irisGo'), t('br_irisGoSub'), 'red'); audio.play('iris', { ui: true, vol: 0.5 }); }
      break;
    case 'brleft':
      if (inGame && e.v === G.myId) hud.alert(t('br_place', { n: e.place }), t('br_placeSub'), 'red');
      else if (inGame && e.n <= 3 && e.n > 1) hud.message(t('br_lastN', { n: e.n }), 2);
      break;
    case 'take': if (e.id === G.myId && G.player) { const was = G.player.wpn, back = G.player.lastWpn; G.player.take(e.wpn); if (e.wpn === 'rpg' && was === 'rpg') { G.player.equip(G.player.owned.includes(back) ? back : G.player.owned[0]); hud.weapon(G.player); } } break; // Bazuca acabou: volta pra arma de antes
    case 'gunDrop': { // arma largada de quem morreu (some em 10 s)
      if (!inGame) break;
      const lo = e.lo ? { ...e.lo, laser: null } : null, gun = buildGun(e.wpn, lo);
      if (!gun) break;
      const g = new THREE.Group(); gun.scale.setScalar(1.5); gun.rotation.set(0, Math.random() * 6.28, Math.PI / 2); g.add(gun);
      g.position.set(e.pos[0], e.pos[1] + 0.18, e.pos[2]); g.userData = { born: G.t, y: e.pos[1] + 0.18, wpn: e.wpn, name: e.lo?.cvName || (e.lo?.body ? partName('body', e.lo.body) : wName(e.wpn)), pos: e.pos };
      scene.add(g); G.gunDrops.set(e.id, g);
      break;
    }
    case 'gunGone': {
      const g = G.gunDrops.get(e.id);
      if (g) { scene.remove(g); disposeGun(g); G.gunDrops.delete(e.id); }
      if (e.by === G.myId) audio.play('pickup', { vol: 0.7, ui: true });
      break;
    }
    case 'give':
      if (e.id === G.myId && G.player && e.pick) { // pegou do chao: fica com a montagem de quem largou ate morrer
        // arma de bot vem sem montagem: e a de fabrica (a que ele tinha na mao), nunca a da sua conta (03/11)
        G.player.pickLo = { ...(G.player.pickLo || {}), [e.wpn]: e.lo || defaultLoadout(e.wpn) };
        G.player.give(e.wpn, false); G.player.equip(e.wpn, true); hud.weapon(G.player);
        hud.message(t('gunPicked', { w: e.lo?.cvName || (e.lo?.body ? partName('body', e.lo.body) : wName(e.wpn)) }), 2);
        break;
      }
      if (e.id === G.myId && G.player && e.wpn === 'rpg') { G.player.give('rpg', false); G.player.equip('rpg'); hud.weapon(G.player); break; } // Bazuca: entra junto das suas armas (o force apagava todas, 03/11)
      if (e.id === G.myId && G.player && e.refill) { G.player.give(e.wpn, false); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player && G.mode === 'borroes') { G.player.give(e.wpn, false); G.player.equip(e.wpn, true); hud.weapon(G.player); audio.play('pickup', { vol: 0.6, ui: true }); break; } // noite: compra entra junto das outras (o force apagava a Estalo)
      if (e.id === G.myId && G.player && G.mode === 'infect') { G.player.give(e.wpn, true, !!e.force); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player) {
        G.player.forced = G.mode === 'gungame';
        if (e.body) G.player.ggBody = e.body;
        if (G.mode === 'br') { // variante (caixote ou chao): troca o modelo e os bonus; comum tira a variante
          G.player.pickLo = { ...(G.player.pickLo || {}) }; if (e.lo) G.player.pickLo[e.wpn] = e.lo; else delete G.player.pickLo[e.wpn]; // arma do chao: o modelo dela
          const had = G.player.brBp[e.wpn] || null;
          if (e.bp) G.player.brBp[e.wpn] = e.bp; else delete G.player.brBp[e.wpn];
          if (e.bp) { G.player.give(e.wpn, false); G.player.equip(e.wpn, true); hud.weapon(G.player); hud.message(t('brVariant', { n: t(e.bp) }), 2.6); audio.play('pickup', { vol: 0.6, ui: true }); break; } // ja na mao, com o modelo da variante
          if (had && G.player.wpn === e.wpn) G.player.equip(e.wpn, true); // trocou variante pela comum
        }
        G.player.give(e.wpn, true, !!e.force);
        hud.weapon(G.player);
        audio.play('pickup', { vol: 0.6, ui: true });
        hud.message(t(e.force ? 'newGun' : 'gotGun', { w: gunName(G.myId, e.wpn) }), 1.6);
      }
      break;
    case 'pickup':
      if (e.by === G.myId && !e.active) audio.play('pickup', { vol: 0.5, ui: true, rate: 1.2 });
      break;
    case 'flag': {
      if (!inGame) break;
      hud.message(t('fl_' + e.act, { w: e.who, t: t(e.team === 'red' ? 'flagRed' : 'flagBlue') }), 2.6);
      if (e.who && e.who === G.myName) gainXp(e.act === 'cap' ? 'flagCap' : e.act === 'return' ? 'flagReturn' : '');
      audio.play(e.act === 'cap' ? 'flag' : 'capture', { vol: 0.7, ui: true });
      break;
    }
    case 'esc': // escolta: o bonde mudou de estado
      if (inGame && e.state === 'back') hud.message(t('es_back'), 2);
      if (inGame && e.state === 'contest') audio.play('ui_hover', { ui: true, vol: 0.5, rate: 0.8, key: 'esc', max: 1 });
      break;
    case 'ggDown': // escada de armas: abate de faca derruba a vitima um degrau
      if (inGame && e.id === G.myId) { hud.message(t('ggDownMe', { n: nameOf(e.by) }), 3); audio.play('lose', { ui: true, vol: 0.5, rate: 1.4 }); }
      else if (inGame && e.by === G.myId) { hud.message(t('ggDownThem', { n: nameOf(e.id) }), 3); audio.play('comic', { ui: true, vol: 0.6 }); }
      break;
    case 'escCp':
      if (inGame) { hud.message(t('es_cp', { n: e.n, o: e.of, b: e.bonus }), 3); audio.play('capture', { vol: 0.7, ui: true }); if (G.myTeam === 'red') gainXp('zone'); }
      break;
    case 'escPass': // round 2 passou a marca do round 1: so aviso, a partida segue
      if (inGame) { hud.message(t('es_pass'), 3); audio.play('capture', { vol: 0.7, ui: true }); }
      break;
    case 'escOt':
      if (inGame) { hud.message(t('es_ot'), 3); audio.play('ringbell', { vol: 0.6, ui: true }); }
      break;
    case 'carBoom': // carro estourado a tiro (04/11): explosao grande no lugar dele
      if (!inGame) break;
      fx.explosion(e.pos); fx.explosion([e.pos[0] + 1.2, e.pos[1] + 0.8, e.pos[2]]); fx.explosion([e.pos[0] - 1.2, e.pos[1] + 0.5, e.pos[2] + 1]);
      fx.word('KA-BUM!', e.pos, 2.6, 0.9); G.shake?.(0.5);
      audio.play('explosion', { pos: e.pos, vol: 1, key: 'carx', max: 1 });
      break;
    case 'runOver':
      if (inGame) { fx.word('ATROPELADO!', [e.pos[0], e.pos[1] + 1.6, e.pos[2]], 1.8, 0.8); audio.play('splat', { pos: e.pos, vol: 0.9 }); }
      break;
    case 'thermo': // termobarica: explosao e fogo no chao por dur s
      if (!inGame) break;
      fx.explosion(e.pos); audio.play('explosion', { pos: e.pos, vol: 0.85, rate: 0.85, key: 'boom', max: 3 });
      (G.fires ||= []).push({ pos: e.pos, t: e.dur || 5, acc: 0 });
      break;
    case 'smoke': // fumaca: nuvem grossa que tapa a visao por dur s
      if (inGame) { (G.smokeFx ||= []).push(smokeCloud(e.pos, e.dur || 12)); audio.play('pump', { pos: e.pos, vol: 0.6, rate: 0.6 }); }
      break;
    case 'tomaHit': if (inGame) { fx.word('TOC!', e.pos, 1.4, 0.6); audio.play('splat', { pos: e.pos, vol: 0.9 }); } break;
    case 'beacon': if (inGame && e.id === G.myId) hud.message(t('beaconSet'), 2.2); break;
    case 'abxSet': if (inGame && e.id === G.myId) hud.message(t('abxSet'), 2.2); break;
    case 'abxTake': if (inGame && e.id === G.myId) { G.player.abxGot(); vm.grab(); hud.message(t('abxTaken'), 1.8); } else if (inGame) audio.play('pickup', { pos: e.pos, vol: 0.4 }); break;
    case 'beaconSpawn': if (inGame && e.id === G.myId) hud.message(t('beaconSpawn'), 2); break;
    case 'zoneBonus':
      if (inGame) { hud.alert(t(e.on ? 'zbOnT' : 'zbOffT'), t(e.on ? 'zbOn' : 'zbOff'), e.on ? 'gold' : 'red'); audio.play(e.on ? 'ringbell' : 'ui_back', { vol: 0.7, ui: true }); }
      break;
    case 'zone':
      if (inGame) {
        hud.message(t('zoneTaken', { z: e.id, t: t(e.team === 'red' ? 'h_red' : 'h_blue') }), 2); audio.play('capture', { vol: 0.6, ui: true });
        const z = G.M.zones.find(q => q.id === e.id), p = G.player;
        if (z && p && p.alive && e.team === G.myTeam && Math.hypot(p.pos[0] - z.pos[0], p.pos[2] - z.pos[2]) < z.r + 0.5) gainXp('zone');
      }
      break;
    case 'notReady': // host tentou iniciar com gente sem dar pronto
      $('lbStatus').textContent = t('notReady', { n: e.n });
      break;
    case 'teamNo': // pedido de troca de time recusado (pausa)
      hud.message(t('teamNo_' + e.why, { n: e.n }), 2.6); audio.play('ui_back', { ui: true });
      break;
    case 'teamSwap':
      if (e.id === G.myId) { G.myTeam = e.team; hud.message(t('teamSwapYou', { t: t(e.team === 'red' ? 'h_red' : 'h_blue') }), 2.6); }
      else if (inGame) hud.feed(esc(t('teamSwapThem', { n: e.name, t: t(e.team === 'red' ? 'h_red' : 'h_blue') })));
      break;
    case 'msg':
      if (inGame) hud.feed(esc(e.key ? t(e.key, { n: e.name }) : e.text));
      if (inGame && ['joined', 'left', 'leftAfk', 'kicked'].includes(e.key) && e.name !== G.myName) chat.sys(t(e.key, { n: e.name })); // entrou/saiu: aparece no chat tambem (03/11)
      break;
    // Noite dos Borroes: avisos de onda, compras e a Caixa de Surpresas do Nanquim
    case 'borWave': if (inGame) hud.alert(G.snap?.bor?.goal ? t('bor_goal', { n: e.n, g: G.snap.bor.goal }) : t('bor_wave', { n: e.n }), e.boss ? t('bor_boss', { n: t('mob_' + e.boss) }) : '', 'red'); break;
    case 'borClear': if (inGame) hud.alert(t('bor_clear', { n: e.n }), t('bor_clearSub'), 'blue'); break;
    case 'borDoor': if (inGame) hud.message(t('bor_doorFeed', { a: nameOf(e.by), r: t('bor_room_' + e.id) }), 2.6); break;
    // chefoes (03/11): o servidor ja mandava, o cliente nao mostrava nada
    case 'borBeam': { // Projecionista: warn 1 = lente acendendo (atire nela!), warn 0 = facho saiu
      const r = G.remotes.get(e.id);
      r?.char.boss?.(e.warn ? { warn: true } : { fire: true });
      if (!inGame) break;
      if (e.warn) { hud.alert(t('bor_beam'), '', 'red'); audio.play('chargeup', { pos: r?.pos, vol: 0.8, jitter: 0 }); }
      else { audio.play('laser', { pos: r?.pos, vol: 0.9, rate: 0.6, jitter: 0 }); if (r?.pos) fx.word('FLASH!', [r.pos[0], r.pos[1] + 6, r.pos[2]], 3, 0.7); }
      break;
    }
    case 'borFreeze': // o facho pegou alguem: congela o quadro
      if (e.id === G.myId && inGame) { hud.alert(t('bor_frozen'), '', 'blue'); audio.play('iris', { ui: true, vol: 0.7, rate: 1.4 }); G.flashT = Math.max(G.flashT, 0.35); G.shake(0.25); }
      else { const r = G.remotes.get(e.id); if (r?.pos && inGame) fx.word('CLIC!', [r.pos[0], r.pos[1] + 2.2, r.pos[2]], 1.4, 0.6); }
      break;
    case 'borSlam': { // Rei Tinteiro: warn 1 = pena erguida (PULA!), warn 0 = onda no chao
      const r = G.remotes.get(e.id);
      if (e.warn) { r?.char.swing?.(); if (inGame) { hud.alert(t('bor_slam'), '', 'red'); audio.play('whoosh', { pos: r?.pos, vol: 0.9, rate: 0.7, jitter: 0 }); } break; }
      const at = e.at || r?.pos; if (!at || !inGame) break;
      fx.splat([at[0], at[1], at[2]], 7, 0x141210); fx.puff([at[0], at[1] + 0.4, at[2]], 12, 3.2, 0x2a2724, 0.8);
      fx.word('KA-BLAM!', [at[0], at[1] + 3, at[2]], 3.4, 0.8);
      audio.play('explosion', { pos: at, vol: 0.9, rate: 0.7 });
      G.shake(0.7);
      break;
    }
    case 'borPhase': { // Rei Tinteiro mudou de fase: 2 = chuva de tinta, 3 = tampa aberta (olho exposto)
      G.remotes.get(e.id)?.char.boss?.({ lid: e.n >= 3 });
      if (inGame && e.n >= 2) { hud.alert(t(e.n >= 3 ? 'bor_phase3' : 'bor_phase2'), '', 'red'); audio.play('nukealarm', { ui: true, vol: 0.45, jitter: 0 }); G.shake(0.4); }
      break;
    }
    case 'borBuy': if (inGame && e.id === G.myId) hud.message(t('bor_bought', { w: gunName(e.id, e.wpn) }), 2); break;
    case 'borMilk': if (inGame && e.id === G.myId) hud.message(t('bor_milkDone'), 2); break;
    case 'borPoor': if (inGame) hud.message(t('bor_poor', { n: Math.max(1, e.need - (G.me?.cs || 0)) }), 1.8); break;
    case 'borWait': if (inGame) hud.message(t('bor_wait', { n: e.s }), 1.8); break;
    case 'borBox': if (inGame && e.id === G.myId) hud.message(t('bor_boxSpin'), 2.6); break;
    case 'borBoxGot': if (inGame) { if (e.body) { G.boxBody ||= new Map(); G.boxBody.set(e.id, { ...(G.boxBody.get(e.id) || {}), [e.wpn]: e.body }); if (e.id === G.myId && G.player?.wpn === e.wpn) { G.player.equip(e.wpn, true); hud.weapon(G.player); } } hud.message(t('bor_boxGot', { a: nameOf(e.id), w: gunName(e.id, e.wpn) }), 2.6); } break;
    case 'borBoxMove': if (inGame) hud.alert(t('bor_boxMove', { r: t('bor_room_' + (G.M?.bor?.box[e.at]?.room || 'hub')) }), '', 'blue'); break;
    case 'borDrop': if (inGame) audio.play('pickup', { vol: 0.5, ui: true, rate: 1.4 }); break;
    case 'borPower': if (inGame) { hud.alert(t('dr_' + e.d), `${t('bor_dropBy', { a: nameOf(e.by) })} · ${t('drd_' + e.d)}`, 'blue'); audio.play('unlock', { vol: 0.7, ui: true, jitter: 0 }); if (e.d === 'borracha') G.shake(0.6); } break; // G.shake e funcao (03/11: virava numero e o tiro quebrava: sem som e sem dano)
    case 'borPowerEnd': if (inGame) hud.message(t('bor_dropEnd', { n: t('dr_' + e.d) }), 2); break;
    case 'end':
      if (inGame) {
        G.slowT = 1.4;
        const iWon = e.winner === G.myTeam || e.winner === G.myName;
        if (G.matchLog) G.matchLog.won = iWon;
        if (iWon) { gainXp('win'); chEvent({ type: 'win' }); }
        // ta-da ou trombone triste, por cima da musica abaixada
        audio.duck(0.3, 2.2); setTimeout(() => audio.play(iWon ? 'win' : 'lose', { ui: true, vol: 0.6, jitter: 0, key: 'end', max: 1 }), 350);
        chEvent({ type: 'match' });
        gainXp('match');
        if (G.snap?.ranked && G.mode !== 'br') rankEnd(iWon);
        // repassa o abate final de cinema e so depois o placar
        G.endInfo = { winner: e.winner, top: e.top || [], lob: !!G.snap?.lob };
        setTimeout(() => { if (G.state !== 'game' || !G.endInfo) return; if (!replay.play(G, scene, fx, audio, wornLook(), () => { document.body.classList.remove('replay'); showPodium(); })) { showPodium(); return; } cineTag(); document.body.classList.add('replay'); }, 900);
      }
      break;
    case 'dance': podium.setDance(e.id, e.d); audio.dance(e.d); podium.humanSound = true; if (e.id === G.myId) podButtons(e.d); break;
    case 'restart': {
      const E = G.endInfo; G.endInfo = null; // fim do podio: o lobby abre com o placar da partida (sala sem lobby ja mostrou antes da proxima)
      if (replay.on) { replay.stop(scene); document.body.classList.remove('replay'); }
      stopPodium();
      $('theend').hidden = true;
      $('endXp')?.remove();
      if (G.state === 'game') { backToLobby(); if (E?.lob && !G.tutorial && !G.range) { G.endInfo = E; showEnd(E.winner); G.endInfo = null; } }
      break;
    }
    case 'start':
      if (e.map) setMap(e.map);
      if (e.mode) { G.mode = e.mode; G.duo = !!e.duo; G.bounce = !!e.bounce; } // jogo rapido: a proxima vem em outro modo e mapa
      if (G.state === 'lobby') beginMatch(false);
      break;
    // todo mundo carregou: 3, 2, 1
    case 'countdown':
      G.countEnd = performance.now() + (e.s ?? 3.5) * 1000;
      // apresentacao do time na contagem (so modos de equipe, fora do treino)
      if (inGame && INTRO_MODES.includes(G.mode) && !G.duo && !G.tutorial && !G.range && !G.cineCam) G.intro = { t: 0, dur: Math.max(1.6, Math.min(3.3, (e.s ?? 3.5) - 0.2)) };
      break;
    case 'infected': {
      if (!inGame) break;
      const mine = e.id === G.myId;
      if (mine) { G.myTeam = 'red'; hud.alert(t(e.first ? 'inf_firstYou' : 'inf_you'), t(e.first ? 'inf_firstSub' : 'inf_youSub'), 'red'); audio.play('death', { ui: true, vol: 0.6, rate: 0.8 }); }
      else if (e.first) hud.alert(t('inf_first', { n: nameOf(e.id) }), '', 'red');
      else hud.feed(esc(t('inf_got', { n: nameOf(e.id) })));
      if (!mine) audio.play('capture', { ui: true, vol: 0.5 });
      break;
    }
    case 'lastStand':
      if (!inGame) break;
      if (e.id === G.myId) { hud.alert(t('inf_lastYou'), t('inf_lastSub'), 'blue'); audio.play('flag', { ui: true, vol: 0.8 }); }
      else hud.alert(t('inf_last', { n: nameOf(e.id) }), '', G.myTeam === 'red' ? 'red' : 'blue');
      break;
    case 'survive':
      if (e.id === G.myId) { gainXp('survive'); audio.play('ding', { ui: true, vol: 0.3, rate: 1.2, key: 'ding', max: 1 }); }
      break;
    // ---------- plantar a bomba ----------
    case 'round':
      if (!inGame) break;
      G.spec = { i: 0, map: false };
      for (const r of G.remotes.values()) r.char.root.visible = true;
      hud.alert(t('roundN', { n: e.n }), t(G.myTeam === 'red' ? (e.carrier === G.myId ? 'bombYouCarry' : 'bombAtkGoal') : 'bombDefGoal'), G.myTeam === 'red' ? 'red' : 'blue');
      audio.play('go', { ui: true, vol: 0.5, key: 'count', max: 1 });
      break;
    case 'roundEnd': {
      if (!inGame) break;
      const won = e.winner === G.myTeam;
      hud.alert(t(won ? 'roundWon' : 'roundLost'), t('why_' + e.why), e.winner === 'red' ? 'red' : 'blue');
      audio.play(won ? 'flag' : 'capture', { ui: true, vol: 0.8 });
      if (won) { gainXp('roundWin'); chEvent({ type: 'win' }); }
      break;
    }
    case 'halftime':
      if (inGame) { hud.message(t('bombHalf'), 3); audio.play('capture', { ui: true, vol: 0.55 }); }
      break;
    case 'bomb':
      if (!inGame) break;
      if (e.act === 'plant') { hud.message(t('bombPlanted', { s: e.site }), 2.6); audio.play('flag', { ui: true, vol: 0.7, rate: 0.8 }); if (e.id === G.myId) gainXp('plant'); }
      else if (e.act === 'defuse') { hud.feed(esc(t('bombDefusedBy', { n: nameOf(e.id) }))); if (e.id === G.myId) gainXp('defuse'); }
      else if (e.act === 'drop') hud.feed(esc(t('bombDropFeed')));
      else if (e.act === 'take' && e.id === G.myId) { hud.message(t('bombCarry'), 2); audio.play('pickup', { ui: true, vol: 0.6 }); }
      break;
  }
}

// letreiro do replay: quem derrubou quem no abate final
function cineTag() {
  const K = replay.kill;
  $('cineKind').textContent = t('finalKill');
  { const cb = $('cineBnr'); cb.hidden = !K.bn; if (K.bn) cb.innerHTML = bannerHtml(K.bn, { plain: true }); }
  const v = `<span class="${teamCls(K.v)}">${esc(nameOf(K.v))}</span>`;
  $('cineWho').innerHTML = K.a && K.a !== K.v ? t('finalKillBy', { a: `<span class="${teamCls(K.a)}">${esc(nameOf(K.a))}</span>`, v }) : t('finalSelf', { v });
}

// meta da comunidade: no fim da partida soma os seus PLAFTs no contador da semana e mostra a barra.
// Bateu a meta na semana em que voce jogou: ganha o set Ouro da Borracha (fica no save pra sempre)
function metaShow(m, mine) {
  const el = $('endMeta'); if (!m) { el.hidden = true; return; }
  el.hidden = false;
  $('emBar').style.width = Math.min(100, m.n / m.goal * 100).toFixed(1) + '%';
  $('emNum').textContent = `${Math.min(m.n, m.goal).toLocaleString()} / ${m.goal.toLocaleString()}`;
  $('emYou').textContent = mine ? t('metaYou', { n: mine }) : '';
  el.classList.toggle('done', !!m.done);
}
function metaClaim(m) {
  if (!m?.done || m.week !== metaWeek()) return;
  if (!grantMeta(m.week)) return;
  const name = t('camo_plaftgold') + ' + ' + t('lk_hat_capcrown'), img = unlockShot({ slot: 'camo', id: 'plaftgold', wpn: settings.primary || 'smg' });
  audio.fanfare?.(0.8);
  // na tela do fim entra na lista "Liberado nesta partida" (o banner do HUD ficava atras do titulo)
  if (!$('theend').hidden) { $('endUnlTitle').textContent = t('endUnl'); $('endUnl').insertAdjacentHTML('afterbegin', `<li>${img ? `<img alt="" src="${img}">` : ''}<small>${esc(t('metaDone'))}</small><b>${esc(name)}</b></li>`); }
  else hud.unlockBanner({ kind: t('metaDone'), name, img });
}
async function sendMeta() {
  const mine = Math.min(G.plafts || 0, META.perMatch);
  if (!G.tutorial && !G.range) statAdd('plafts', G.plafts || 0); // Perfil
  G.plafts = 0;
  if (G.tutorial || G.range) { $('endMeta').hidden = true; return; }
  const m = mine ? await metaPost(mine) || await metaGet() : await metaGet();
  metaShow(m, mine); metaClaim(m);
}

// cartaz de PROCURADO: o melhor da partida (mais pontos) com o visual e a arma dele
async function makePoster() {
  const b = $('endPoster'); if (b.disabled) return;
  const top = [...(G.snap?.players || [])].sort((a, c) => c.score - a.score || c.kills - a.kills)[0];
  if (!top) return;
  b.disabled = true; const label = b.querySelector('span').textContent; b.querySelector('span').textContent = t('shareWait');
  try {
    const me = top.id === G.myId, r = G.remotes.get(top.id);
    // fundo: o mapa da partida, como esta na tela agora (desfocado no cartaz). Renderiza e copia no mesmo quadro
    let bg = null;
    try { renderer.render(scene, camera); bg = await createImageBitmap(canvas); } catch { /* sem fundo */ }
    // nome: o do jogador (conta Rovex / ajuste), nao "Voce"
    const blob = await wantedPoster({
      bg, name: me ? (rovexMe?.name || settings.name || (rovexGuest() ? rovexGuestName() : top.name)) : top.name, kills: top.kills, map: t('map_' + G.M.id), team: top.team || null,
      look: me ? wornLook() : r ? lookOf(r) : lookOf(top), wpn: me ? G.player?.wpn : top.wpn,
      lo: me ? G.loadouts?.[G.player?.wpn] : G.remoteLo.get(top.id)?.[top.wpn] || null,
    });
    await shareFile(blob, `procurado-${String(top.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`, t('shareTxt'));
  } catch (e) { console.warn('cartaz', e); }
  b.disabled = false; b.querySelector('span').textContent = label;
}
$('endPoster').onclick = () => { audio.play('ui_click', { ui: true }); makePoster(); };

// clipe da jogada: repassa o seu ultimo abate (ou o final) gravando a tela em pe e entrega o arquivo
async function makeClip() {
  const b = $('endClip'); if (b.disabled || replay.on || !window.MediaRecorder) return;
  const K = replay.clipKill(); if (!K) return;
  b.disabled = true; const label = b.querySelector('span').textContent; b.querySelector('span').textContent = t('shareWait');
  const keep = replay.kill; replay.kill = K;
  $('theend').hidden = true; document.body.classList.add('replay');
  let rec = null;
  try { rec = G.clipRec = new ClipRec(canvas, audio.ctx, audio.master); } catch (e) { console.warn('clipe', e); }
  const ok = rec && replay.play(G, scene, fx, audio, wornLook(), async () => {
    G.clipRec = null; document.body.classList.remove('replay'); $('theend').hidden = false; replay.kill = keep;
    const blob = await rec.stop();
    const ext = /mp4/.test(blob.type) ? 'mp4' : 'webm';
    try { await shareFile(blob, `rubber-riot-clipe.${ext}`, t('shareTxt')); } catch (e) { console.warn('clipe', e); }
    b.disabled = false; b.querySelector('span').textContent = label;
  }, true);
  if (!ok) { G.clipRec = null; rec?.stop(); document.body.classList.remove('replay'); $('theend').hidden = false; replay.kill = keep; b.disabled = false; b.querySelector('span').textContent = label; }
}
$('endClip').onclick = () => { audio.play('ui_click', { ui: true }); makeClip(); };

// podio (05/11, pedido dele): os 3 melhores depois da camera final; quem esta nele aperta pra dançar
const podium = G.podium = new Podium();
let podEquip = [], podPrev = [];
const PAD_HINT = { LEFT: '←', UP: '↑', RIGHT: '→', DOWN: '↓' };
function podPress(i) { const d = podEquip[i], E = G.endInfo; if (!podium.on || !d || !E?.top.includes(G.myId)) return; audio.play('ui_click', { ui: true }); G.net?.send({ t: 'dance', d }); }
addEventListener('keydown', (e) => { if (!podium.on || e.repeat) return; const kb = kbBinds(settings); for (let i = 0; i < 3; i++) if (kb['dance' + (i + 1)]?.includes(e.code)) { e.preventDefault(); podPress(i); } });
function podPad() { const g = [...(navigator.getGamepads?.() || [])].find(Boolean); if (!g) return; const P = padBinds(settings); for (let i = 0; i < 3; i++) { const b = PAD_BTN[P['dance' + (i + 1)]], on = !!g.buttons[b]?.pressed; if (on && !podPrev[i]) podPress(i); podPrev[i] = on; } }
let podTimer = 0;
function endInputOff() { // acabou: solta o mouse e para os controles (antes mexer o mouse ainda girava a camera e a roda nao rolava a tela)
  input.enabled = false; input.keys.clear(); input.mouse.fire = input.mouse.ads = false; input.touch.fire = false;
  if (document.pointerLockElement) document.exitPointerLock();
  setTouchBoard(false);
}
function podButtons(cur) { document.querySelectorAll('#podDances [data-dance]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dance === cur))); }
function stopPodium() { audio.danceStop(); clearInterval(podTimer); podTimer = 0; if (podium.on) { camera.fov = settings.fov; camera.updateProjectionMatrix(); for (const m of G.blimpMeshes) m.visible = true; if (G.strikes) G.strikes.root.visible = true; for (const g of G.gunDrops.values()) g.visible = true; for (const k of objectives?.pickups || []) k.g.visible = true; } podium.stop(); $('podium').hidden = true; document.body.classList.remove('on-podium'); }
function showPodium() {
  const E = G.endInfo; if (!E || G.state !== 'game') return;
  const players = G.snap?.players || []; E.players = [...players].filter(p => !p.mob).sort((a, b) => b.score - a.score);
  const gunOf = (id, p) => { const w = id === G.myId ? G.player?.wpn : p.wpn, ok = WEAPONS[w] && !WEAPONS[w].melee && w !== 'fists', wpn = ok ? w : 'rifle'; return { wpn, lo: !ok || G.mode === 'gungame' ? null : id === G.myId ? G.player?.lo?.(wpn) : G.remoteLo.get(id)?.[wpn] || null }; }; // quem terminou de faca segura o fuzil padrao
  const people = E.top.map(id => { const p = players.find(x => x.id === id); return p && { id, name: p.name, team: p.team, bot: !!p.bot, look: id === G.myId ? wornLook() : lookOf(p), ...gunOf(id, p) }; }).filter(Boolean);
  const spot = G.M && podiumSpot(G.M);
  if (G.tutorial || G.range || !people.length || !spot) { showEnd(E.winner); return; }
  endInputOff();
  const eq = podEquip = wornDances(settings), kb = kbBinds(settings), hintOf = (i) => isTouch ? '' : `<kbd>${pad.active ? PAD_HINT[padBinds(settings)['dance' + (i + 1)]] || padBinds(settings)['dance' + (i + 1)] : keyName(kb['dance' + (i + 1)]?.[0] || '')}</kbd>`;
  $('podDances').innerHTML = eq.map((id, i) => `<button type="button" data-dance="${id}">${hintOf(i)}${t('dn_' + id)}</button>`).join('');
  document.querySelectorAll('#podDances [data-dance]').forEach(b => { b.onclick = () => { audio.play('ui_click', { ui: true }); G.net?.send({ t: 'dance', d: b.dataset.dance }); }; });
  $('podDances').hidden = !E.top.includes(G.myId); podButtons(null);
  $('podBack').hidden = !E.lob; $('podBack').disabled = false; $('podBack').textContent = t('endToLobby');
  $('podium').hidden = false; document.body.classList.add('on-podium');
  podium.onBot = (d) => { if (!podium.humanSound) audio.dance(d); }; podium.humanSound = false;
  podium.start(scene, G.M, spot, people);
  const tick = () => {
    const left = G.snap?.overT ?? 0;
    if (!E.lob && left <= OVER_STATS) { stopPodium(); showEnd(E.winner); return; }
    $('podTime').textContent = t(E.lob ? 'podBackIn' : 'podStatsIn', { n: Math.max(1, Math.ceil(E.lob ? left : left - OVER_STATS)) });
  };
  tick(); podTimer = setInterval(tick, 250);
}
$('podBack').onclick = () => { audio.play('ui_click', { ui: true }); G.net?.send({ t: 'toLobby' }); $('podBack').disabled = true; $('podBack').textContent = t('podWait'); };

function showEnd(winner) {
  funil('terminou');
  const inf = G.mode === 'infect', bor = G.mode === 'borroes' && G.snap?.bor;
  const solo = bor && (G.snap?.players || []).filter(p => !p.mob && !p.bot).length < 2;
  const won = bor ? (winner === 'red' ? `${t('bor_win')} (${t('bor_winSub', { g: bor.goal || bor.wave })})` : t(solo ? 'bor_endSolo' : 'bor_end', { n: bor.wave }))
    : inf ? t(winner === 'red' ? 'inf_winInf' : 'inf_winSurv') : winner === 'red' ? t('winRed') : winner === 'blue' ? t('winBlue') : winner === 'empate' ? t('draw') : t('winName', { n: winner });
  $('endWin').textContent = won;
  const ps = (G.endInfo?.players || [...(G.snap?.players || [])].filter(p => !p.mob).sort((a, b) => b.score - a.score)).slice(0, 8);
  $('endBoard').innerHTML = ps.map(p => `<div class="${p.id === G.myId ? 'me' : ''}"><span>${esc(p.name)}</span><span>${t('endKills', { n: p.kills })}</span></div>`).join('');
  // progresso: XP por tipo, nivel subindo na barra e tudo o que liberou
  const L = G.matchLog || newMatchLog();
  const total = Object.values(L.xp).reduce((a, b) => a + b, 0);
  $('endXpList').innerHTML = Object.entries(L.xp).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(t('xp_' + k))}</span><span>+${v}</span></li>`).join('');
  const unl = [...L.unlocks, ...(L.pass || []).map(n => ({ kind: t('passTitle'), name: passName(PASS[n - 1]), art: passArt(PASS[n - 1]) })), ...(L.passFree || []).map(n => ({ kind: t('passFree'), name: passName(PASS_FREE[n]), art: passArt(PASS_FREE[n]) }))]; // vao pro slide (endslides.js)
  $('endUnlTitle').textContent = t('endNothing'); $('endUnlTitle').hidden = unl.length > 0;
  renderEndPass(L.pass);
  if (!G.tutorial && !G.range) renderEndZp(L);
  G.matchXp = 0;
  if (document.body.classList.contains('game-smith')) { // acabou com o Arsenal aberto: fecha e vale o que montou
    document.body.classList.remove('game-smith'); $('menu').hidden = true; ui.go('home');
    G.loadouts = matchLoadouts(); sendLoadout();
  }
  $('theend').hidden = false;
  $('endClip').hidden = !window.MediaRecorder || !replay.clipKill(); // so com abate pra repassar
  endInputOff();
  animateEndXp(L.startXp, L.startXp + total, total);
  sendMeta();
  showRankEnd();
  audio.play('flag', { vol: 0.8, ui: true });
  // sala com lobby (solo e de amigos): nada de contagem, o botao leva de volta pro lobby
  const lob = !!G.snap?.lob;
  startEndSlides(unl, lob ? Infinity : Math.max(1, (G.snap?.overT ?? 9) - 1) * 1000);
  $('endLobby').hidden = !lob; $('endLobby').disabled = false; $('endLobby').textContent = t('endClose'); // o placar abre em cima do lobby: so fecha
  if (lob) { $('endNext').textContent = ''; return; }
  const endAt = performance.now() + Math.max(1, (G.snap?.overT ?? 9) - 1) * 1000;
  const tick = () => { if ($('theend').hidden) return; const n = Math.max(0, Math.round((endAt - performance.now()) / 1000)); $('endNext').textContent = t('nextIn', { n }); if (n > 0) setTimeout(tick, 1000); };
  tick();
}

// barra de XP enchendo do XP de antes da partida ate o de agora (vira o nivel no caminho)
function animateEndXp(from, to, gained) {
  const lvlOf = (xp) => { let n = 1; while (levelXp(n + 1) <= xp && n < 99) n++; return n; };
  const t0 = performance.now(), dur = Math.min(2200, 600 + gained * 0.9);
  let shownLvl = lvlOf(from);
  const step = () => {
    if ($('theend').hidden) return;
    const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - (1 - k) ** 3;
    const xp = from + (to - from) * e, lv = lvlOf(xp);
    const into = xp - levelXp(lv), need = Math.max(1, levelXp(lv + 1) - levelXp(lv));
    $('endBar').style.width = Math.min(100, into / need * 100).toFixed(1) + '%';
    $('endXpNum').textContent = '+' + Math.round(gained * e) + ' XP';
    const b = $('endLvl');
    b.textContent = lv;
    if (lv > shownLvl) { shownLvl = lv; b.classList.remove('up'); void b.offsetWidth; b.classList.add('up'); audio.play('levelup', { ui: true, vol: 0.6 }); }
    $('endLvlTxt').textContent = lv > lvlOf(from) ? t('endLvlUp', { n: lv }) : t('endLvl', { n: lv });
    if (k < 1) requestAnimationFrame(step);
  };
  step();
}

function onMsg(m) {
  if (m.t === 'snap') onSnap(m);
  else if (m.t === 'latr') G.myPing = Math.round(performance.now() - m.c); // ping do Tab
  else if (m.t === 'ev') onEvent(m);
  else if (m.t === 'kicked') { // host tirou da sala ou ficou parado demais: volta pro menu com o aviso (sem reconectar)
    G.kickedWhy = m.why === 'afk' ? 'kickedAfk' : 'kickedHost';
    if (G.net) G.net.onclose = () => {};
    quitGame().then(() => { ui.go('mp'); $('mpErr').textContent = t(G.kickedWhy); });
  }
  else if (m.t === 'welcome') {
    G.myId = m.id; G.myTeam = m.team; G.mode = m.mode; G.duo = !!m.duo; G.bounce = !!m.bounce;
    if (m.map) setMap(m.map);
    sendLoadout();
    // partida ja rolando: pula o lobby
    if (m.phase === 'play' && G.state === 'lobby') beginMatch(true);
  } else if (m.t === 'lobby') {
    // 04/11 (hotfix): no lobby nao chega snapshot, entao balao/sentinela da partida anterior ficavam parados no ceu
    if (G.blimpMeshes.length) { while (G.blimpMeshes.length) scene.remove(G.blimpMeshes.pop()); G.strikes?.clear(); }
    if (m.map) setMap(m.map);
    if (m.mode) { G.mode = m.mode; G.duo = !!m.duo; } // o host pode ter trocado o modo
    if (G.state === 'lobby') { lobby.render(m, G.myId); syncLobbyPick(m.duo ? 'duo' : m.bounce ? 'bounce' : m.mode); }
    duoLineup(m);
  }
}

// lobby da Dupla (31/10): os dois da dupla no meio da tela, com o visual de cada um e a arma na mao, de frente
// pra camera (estilo lobby de battle royale). Ficam na cena do mapa, presos na frente da camera do lobby.
const lineup = { key: '', chars: [] };
// camada propria desenhada por cima do mapa (arvore e poste do mapa nao tampam a dupla)
const lineupScene = new THREE.Scene();
lineupScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
{ const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(2, 3, 3); lineupScene.add(l); }
function duoLineup(m) {
  const me = m?.players?.find(p => p.id === G.myId);
  const mate = me && m.duo && me.team ? m.players.find(p => p.id !== G.myId && p.team === me.team) : null;
  const ids = m?.duo && me ? [G.myId, mate?.id || null] : [];
  const key = ids.join('|') + '|' + (mate ? JSON.stringify(lookOf(mate)) : '') + JSON.stringify(wornLook());
  if (key === lineup.key) return;
  lineup.key = key;
  for (const c of lineup.chars) lineupScene.remove(c.root);
  lineup.chars = [];
  if (!ids.length) return;
  const prim = PRIMARIES.includes(settings.primary) ? settings.primary : 'smg';
  const make = (name, look, wpn, lo) => {
    const c = new Character('red', name, look);
    try { c.setWeapon(wpn, lo); } catch { /* arsenal carregando */ }
    lineupScene.add(c.root); lineup.chars.push(c);
  };
  make(settings.name || rovexMe?.name || (rovexGuest() ? rovexGuestName() : t('youCap')), wornLook(), prim, G.loadouts?.[prim] || null);
  if (mate) make(mate.name, lookOf(mate), mate.bot ? 'rifle' : (G.remoteLo.get(mate.id) ? Object.keys(G.remoteLo.get(mate.id))[0] || 'smg' : 'smg'), mate.bot ? null : G.remoteLo.get(mate.id)?.[Object.keys(G.remoteLo.get(mate.id) || {})[0]] || null);
}
function lineupFrame(dt) {
  if (!lineup.chars.length) return;
  // tela pequena (celular deitado): os paineis do lobby ja ocupam tudo, a dupla so atrapalharia
  const show = G.state === 'lobby' && $('menu').hidden && innerWidth >= 900 && innerHeight >= 520;
  const f = camera.getWorldDirection(new THREE.Vector3()), r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
  const n = lineup.chars.length;
  lineup.chars.forEach((c, i) => {
    c.root.visible = show;
    if (!show) return;
    // no centro da tela, a 9 m (cabem inteiros com o nome em cima), um de cada lado, virados de leve um pro outro
    // perto da camera e menor (na frente do cenario: arvore e poste do mapa nao tampam)
    const side = n === 1 ? 0 : (i === 0 ? -0.62 : 0.62);
    const at = camera.position.clone().addScaledVector(f, 5).addScaledVector(r, side);
    at.y -= 0.75; c.root.scale.setScalar(0.55);
    c.root.position.copy(at);
    c.root.rotation.y = Math.atan2(camera.position.x - at.x, camera.position.z - at.z) + Math.PI + (i === 0 ? -0.3 : 0.3);
    c.update(dt, { anim: 'idle', speed: 0, alive: true, t: G.t });
    const lz = c.gun?.userData.laser; if (lz) lz.beam.material.uniforms.uOn.value = 0; // sem feixe atravessando o lobby
  });
}

// avisa o servidor da classe e das pecas (os outros veem a sua arma montada)
function matchLoadouts() {
  const all = getLoadouts();
  for (const c of Object.keys(CATEGORY)) all[c] = unlockedLoadout(c, all[c], partUnlocked, camoUnlocked, CAMOS);
  return all;
}

// troca de arma/montagem na partida: o servidor guarda e aplica no renascimento; a arma na mao tambem so troca la
function applyLoadoutLater(quiet) {
  if (G.range || G.tutorial || !G.player?.alive) { G.loadouts = matchLoadouts(); sendLoadout(); G.player?.rearm(); return; } // morto/treino: ja vale
  G.pendingLo = true; G.loNow = true; sendLoadout();
  if (!quiet) hud.message(t('loNextSpawn'), 2.2);
}
function sendLoadout() {
  if (!G.net) return;
  const los = {};
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg', 'melee']) { const { saved, ...lo } = G.loadouts[w] || {}; los[w] = lo; } // a memoria por modelo nao vai pro servidor
  // skills passivas equipadas (so as que o nivel ja abriu); o jogador aplica as de mao, o servidor as de regra
  G.streaks = pickStreaks(settings.streaks); G.lethal = LETHALS.includes(settings.lethal) ? settings.lethal : 'frag'; G.tactical = TACTICALS.includes(settings.tactical) && unlockLevel() >= (NADES[settings.tactical].lvl || 0) ? settings.tactical : 'flash'; // aba Granadas (04/11)
    // escolhidas na aba Sequencias do Arsenal (02/11)
  G.skills = (settings.skills || []).filter(s => SKILLS[s] && unlockLevel() >= SKILLS[s].lvl).slice(0, SKILL_SLOTS);
  // equipamento de campo (um so; o nivel tem que ter liberado). O botao de toque mostra o icone dele.
  G.field = G.tutorial?.fieldOverride || (FIELD[settings.field] && unlockLevel() >= FIELD[settings.field].lvl ? settings.field : null); // treino: a Mola emprestada vale
  setFieldHud(G.field);
  G.net.send({ t: 'loadout', primary: settings.primary, los, lvl: progressInfo().level, ul: unlockLevel(), prest: progressInfo().prestige, tracer: settings.tracer, elite: !!rovexMe?.elite, rk: myTier(), skills: G.skills, field: G.field, bn: myBanner(), streaks: G.streaks, lethal: G.lethal, tactical: G.tactical, now: !!(G.range || G.tutorial) }); // now: campo de treino/tutorial trocam na hora; na partida vale no proximo renascimento
  if (G.tutorial?.fieldOverride) { const me = G.net.core?.players.get(G.myId); if (me) me.field = G.tutorial.fieldOverride; } // o servidor local checa o nivel; no treino passa
  G.net.send({ t: 'look', look: wornLook() }); // visual do boneco (os outros veem)
  G.net.send({ t: 'dev', v: devNow() });
  vm.setGloves?.(wornLook());
}

// ---------- marcacao (ping) do battle royale ----------
// mirando num inimigo marca ele; num item do chao marca o item; senao marca o lugar. Marcar de novo
// perto da sua marcacao apaga.
function makePing(p) {
  const o = p.eyePos(), d = camera.getWorldDirection(new THREE.Vector3()).toArray();
  const hit = p.traceTargets(o, d, 150);
  let ping = null;
  if (hit.player) ping = { kind: 'enemy', pos: [...hit.player.pos], label: t('pg_enemy') };
  else {
    let best = null, bt = Math.min(hit.dist, 80);
    for (const [, kind, wpn, x, y, z, bp, , lbody] of G.brLoot || []) {
      const v = [x - o[0], y + 0.9 - o[1], z - o[2]], along = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
      if (along <= 0 || along > bt + 2) continue;
      const perp = Math.hypot(v[0] - d[0] * along, v[1] - d[1] * along, v[2] - d[2] * along);
      if (perp < 0.9 + along * 0.012 && (!best || along < best.along)) best = { along, pos: [x, y, z], label: kind === 'wpn' ? (bp ? t(bp) : lbody ? partName('body', lbody) : wName(wpn)) : t('pg_' + kind) };
    }
    ping = best ? { kind: 'item', pos: best.pos, label: best.label } : { kind: 'spot', pos: hit.point, label: '' };
  }
  const mine = G.pings.get(G.myId);
  if (mine && mine.t > G.t && Math.hypot(mine.pos[0] - ping.pos[0], mine.pos[2] - ping.pos[2]) < 2.5) { G.net?.send({ t: 'ping', off: true }); return; }
  G.net?.send({ t: 'ping', ...ping });
}

// ---------- iris ----------
const irisEl = $('iris');
// transicao pro ringue: a iris fecha no boneco e abre la dentro, com o sino
function ringCut() {
  iris(6, 380).then(() => { audio.play('ringbell', { ui: true, vol: 0.8 }); setTimeout(() => iris(150, 700), 220); });
}

function iris(to, dur = 650) {
  return new Promise(res => {
    const from = parseFloat(irisEl.dataset.r ?? '150');
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      const r = from + (to - from) * e;
      irisEl.dataset.r = r;
      irisEl.style.setProperty('--ir', r + 'vmax');
      if (k < 1) requestAnimationFrame(step); else res();
    };
    step();
  });
}

// ---------- sessoes ----------
let attract = null;
function startAttract() {
  attract = new LocalNet({ mode: 'ffa', map: 'vila', bots: 8, difficulty: 0.9, lobby: false });
  attract.onmsg = onMsg;
  G.net = attract;
  setMap('vila');
}

const myBanner = () => (bannerOpen(settings.banner) ? settings.banner : BANNER_DEFAULT);
function clearRemotes() {
  replay.reset(scene); document.body.classList.remove('replay');
  for (const r of G.remotes.values()) { scene.remove(r.char.root); disposeGun(r.char.gun); }
  G.remotes.clear();
  for (const g of G.gunDrops.values()) { scene.remove(g); disposeGun(g); } G.gunDrops.clear();
  for (const m of G.nadeMeshes.values()) scene.remove(m);
  G.nadeMeshes.clear();
  while (G.blimpMeshes.length) scene.remove(G.blimpMeshes.pop());
  G.strikes?.clear();
  if (G.heistView) { G.heistView.dispose(); G.heistView = null; }
  if (G.borView) { G.borView.dispose(); G.borView = null; }
  G.remoteLo.clear();
}

async function startGame(net, name, mpArgs = null) {
  audio.init();
  audio.play('iris', { vol: 0.6, ui: true });
  await iris(0, 600);
  clearRemotes();
  attract = null;
  G.loadouts = matchLoadouts();
  G.net = net;
  G.player = new Player(G);
  G.snap = null; G.me = null; G.matchXp = 0; G.myName = name;
  net.onmsg = onMsg;
  net.onclose = () => reconnect(name, mpArgs);
  G.state = 'lobby';
  try { await net.connect(name); } catch (e) { G.state = 'menu'; await iris(150, 500); throw e; }
  // jogo rapido: o servidor escolheu a sala; reconectar volta pra ela pelo codigo
  if (mpArgs?.quick && net.room) Object.assign(mpArgs, { room: net.room, quick: false, join: true });
  $('menu').hidden = true;
  if (G.state === 'lobby') lobby.show();
  lobbyPickMode = null;
  lobby.setRoom(mpArgs?.room || null, !!rovexMe);
  audio.music(true, 'music');
  iris(150, 800);
}

// Aquecimento: monta as armas que podem aparecer na mao (classe + faca; no gun game a escada toda) na cena
// da arma e compila os visuais durante o carregamento. Sem isso o celular compilava o shader da camo na
// 1a vez que a arma surgia (travada da faca no gun game).
async function warmGuns() {
  try {
    const list = G.mode === 'gungame' ? G.ladder.map(u => [u.wpn, { ...(G.loadouts[u.wpn] || {}), body: u.body }])
      : [...new Set([...PRIMARIES, 'pistol', 'melee'])].map(w => [w, G.loadouts[w]]);
    const grp = new THREE.Group(); grp.position.set(0, 0, -1);
    for (const [w, lo] of list) { const gun = buildGun(w, lo); if (gun) grp.add(gun); }
    vm.scene.add(grp);
    if (renderer.compileAsync) await renderer.compileAsync(vm.scene, vm.camera); else renderer.compile(vm.scene, vm.camera);
    vm.scene.remove(grp);
    // 03/11 (bateria de desempenho): a cena da partida tambem (mapa, bonecos e armas de quem ja esta na sala) + as
    // 8 skins animadas. Sem isso a 1a imagem compilava tudo junto: 0,5 s (contra todos) a 1 s (noite) de tela parada.
    // compileAsync usa a compilacao paralela do navegador (KHR_parallel_shader_compile): o carregamento nao trava
    const skins = new THREE.Group(), tiny = new THREE.BoxGeometry(0.01, 0.01, 0.01);
    for (const id of Object.keys(SKIN_CODE)) skins.add(new THREE.Mesh(tiny, skinMat(id)));
    skins.position.copy(camera.position); scene.add(skins);
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
    scene.remove(skins); tiny.dispose();
  } catch (e) { console.warn('aquecimento das armas falhou', e); }
}

// todo mundo pronto: intertitulo de carregamento e entra na partida
async function beginMatch(join) {
  if (G.state !== 'lobby') return;
  G.state = 'loading'; $('theend').hidden = true; // placar da partida anterior aberto no lobby
  if (ui.fromLobby?.()) { $('menu').hidden = true; ui.go('home'); sendLoadout(); } // comecou com o arsenal aberto: vai com o que montou
  lobby.hide();
  await runLoading({ map: G.M.id, mode: G.duo ? 'duo' : G.bounce ? 'bounce' : G.mode, join });
  if (G.state !== 'loading') return;
  await warmGuns();
  hideLoading();
  G.state = 'game';
  funil('jogou');
  audio.music(true, G.mode === 'br' || G.duo ? 'music_br' : 'music_m' + (1 + Math.floor(Math.random() * 4)));
  G.plafts = 0; G.gadgetTold = null; G.gadgetShown = null; G.stimBoostT = 0; G.pings = new Map(); G.brDrops = []; G.matchLog = newMatchLog(); G.matchXp = 0; G.botXpWarned = false; if (weekend() && !G.tutorial) setTimeout(() => hud.message(t('wkndOn'), 3), 2500); setTimeout(() => { if (G.blitz && G.state === 'game') hud.message(t('blitzOn'), 3); }, 5000); G.countEnd = 0; G.spec = { i: 0, map: false };
  input.mode = G.mode; setFireButton(input); // botoes do modo (usar, inclinar, marcar) valem a partir desta partida
  // avisa o servidor que carregou: quando o ultimo avisar, sai a contagem pra todo mundo
  G.net?.send({ t: 'loaded' });
  // dicas de primeira vez (uma vez so cada): modo, equipamento e balas especiais da classe
  setTimeout(() => {
    if (G.mode === 'br') tip(G.bounce ? 'bounce' : 'br');
    if (G.duo) tip('duo');
    if (G.field) tip('field');
    if (Object.values(G.loadouts || {}).some(l => l?.ammo)) tip('ammo');
  }, 2500);
  document.body.classList.add('ingame');
  chat.enable(G.net instanceof WsNet);
  $('hud').hidden = false;
  input.enabled = true;
  document.body.classList.toggle('bombmode', G.mode === 'bomb');
  if (isTouch) { buildTouch(input, $('touch')); try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape'); } catch { /* sem tela cheia */ } }
  else if (!SS) lockPointer(canvas); // sem gesto: a pausa pede o clique
  iris(150, 500);
}

// fim de partida: volta pro lobby da mesma sala
function backToLobby() {
  G.state = 'lobby';
  audio.music(true, 'music');
  G.paused = false;
  input.enabled = false;
  document.body.classList.remove('ingame', 'touchmode', 'mode-br', 'is-dead', 'stim-rush'); G.stimFx = false; chat.enable(false);
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true; document.body.classList.remove('game-smith'); setTouchBoard(false);
  if (document.pointerLockElement) document.exitPointerLock();
  clearRemotes();
  lobby.show();
  lobbyPickMode = null;
  syncLobbyPick(G.duo ? 'duo' : G.bounce ? 'bounce' : G.mode);
}

// Apresentacao do time (01/11): na contagem de inicio dos modos de equipe a camera passa pela frente de cada
// colega (do mais longe pro mais perto) numa curva so, sem parar em ninguem, e pousa exatamente na sua primeira
// pessoa. Todo mundo esta parado na contagem, entao os pontos da curva ficam firmes. Atirar/pular pula a cena.
const INTRO_MODES = ['tdm', 'escort', 'bomb', 'ctf', 'dom'];
const introQ = new THREE.Quaternion(), introE = new THREE.Euler(0, 0, 0, 'YXZ'), introM = new THREE.Matrix4();
const introP = new THREE.Vector3(), introUp = new THREE.Vector3(0, 1, 0);
// tomada com parede/telhado entre a camera e o time: sobe a camera ate ver (no maximo +12 m)
function clearShot(pos, at) {
  for (let up = 0; up <= 12; up += 2) {
    const o = [pos.x, pos.y + up, pos.z], d = [at.x - o[0], at.y - o[1], at.z - o[2]], L = Math.hypot(...d);
    if (raycast(G.M, o, d.map(v => v / L), L).dist >= L - 0.5) return new THREE.Vector3(o[0], o[1], o[2]);
  }
  return pos;
}
// voce na cena de inicio (01/11): o jogador local so tem a arma da primeira pessoa, entao nas tomadas do time
// aparecia um buraco no seu lugar. Boneco temporario com o seu visual e a sua arma, some no pouso.
let introMe = null, introMeKey = '';
function introMeSync(dt, p, show, pose = null) {
  if (!show) { if (introMe) introMe.root.visible = false; return; }
  const look = wornLook(), lo = p.lo?.(p.wpn) || null, key = (G.myTeam || '') + JSON.stringify(look);
  if (!introMe || introMeKey !== key) {
    if (introMe) scene.remove(introMe.root);
    introMe = new Character(G.myTeam || 'red', '', look); introMe.tag.visible = false; introMe.wpnKey = '';
    scene.add(introMe.root); introMeKey = key;
  }
  const wk = p.wpn + JSON.stringify(lo);
  if (introMe.wpnKey !== wk) { try { introMe.setWeapon(p.wpn, lo); } catch { /* arma ainda carregando */ } introMe.wpnKey = wk; }
  introMe.root.visible = true;
  introMe.root.position.set(p.pos[0], p.pos[1], p.pos[2]);
  introMe.root.rotation.y = pose ? pose.yaw : p.yaw;
  introMe.update(dt, { anim: pose?.anim || 'idle', pitch: p.pitch, alive: true, speed: 0, t: G.t, steer: pose?.steer, aimOff: pose?.aimOff });
}
function introCam(dt, p, inp) {
  const I = G.intro;
  if (G.state !== 'game' || inp.firePressed || inp.jumpPressed || performance.now() > G.countEnd + 300) { G.intro = null; document.body.classList.remove('intro-cam'); return; }
  if (!p.alive) return; // nasce um instante depois da contagem comecar: o relogio da cena so anda com voce em pe
  I.t += dt;
  if (I.t >= I.dur) { G.intro = null; document.body.classList.remove('intro-cam'); return; }
  // 3 tomadas numa curva so (pedido dele 01/11: nada de pular de colega em colega): plano aberto alto do mapa
  // atras da base, desce pra um angulo de frente pro time inteiro (o time nasce junto) e pousa na sua primeira pessoa
  const team = [...G.remotes.values()].filter(r => r.alive && r.pos && !G.isEnemy(r));
  const all = [p.pos, ...team.map(r => r.pos)];
  const cx = all.reduce((a, q) => a + q[0], 0) / all.length, cz = all.reduce((a, q) => a + q[2], 0) / all.length;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  const center = new THREE.Vector3(cx, p.pos[1] + 1.1, cz);
  const spread = Math.max(4, ...all.map(q => Math.hypot(q[0] - cx, q[2] - cz)));
  const shot = (pos, at) => ({ pos, at });
  // 1) plano do mapa: alto e longe, atras e de lado do time, olhando por cima dele pro campo
  const first = shot(clearShot(new THREE.Vector3(cx - fx * 20 + fz * 14, p.pos[1] + 13, cz - fz * 20 - fx * 14), center), new THREE.Vector3(cx + fx * 24, p.pos[1] + 2, cz + fz * 24));
  // 2) o time inteiro de frente, um pouco de cima, na distancia que cabe todo mundo
  const tk = Math.min(6.5, Math.max(4.5, spread * 1.2 + 2.5));
  const teamShot = shot(clearShot(new THREE.Vector3(cx + fx * tk - fz * 3, p.pos[1] + 1.9, cz + fz * tk + fx * 3), center), center);
  // travelling curto de lado, ainda de frente pro time (o time fica mais tempo na tela)
  const teamShot2 = shot(clearShot(new THREE.Vector3(cx + fx * (tk - 1) + fz * 3, p.pos[1] + 1.7, cz + fz * (tk - 1) - fx * 3), center), center);
  // 3) atras do seu ombro, ja quase na sua altura (prepara o pouso sem girar de uma vez)
  const eye = new THREE.Vector3(p.pos[0], p.pos[1] + p.eye, p.pos[2]);
  const over = shot(new THREE.Vector3(p.pos[0] - fx * 2.4 + fz * 0.8, p.pos[1] + p.eye + 0.6, p.pos[2] - fz * 2.4 - fx * 0.8), new THREE.Vector3(p.pos[0] + fx * 12, p.pos[1] + p.eye, p.pos[2] + fz * 12));
  const look = new THREE.Vector3(-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch));
  const last = { pos: eye, at: eye.clone().addScaledVector(look, 12) };
  const pts = [first, teamShot, teamShot2, over, last];
  // tempo: anda devagar no comeco e desacelera no pouso (sem parada no meio)
  const k = I.t / I.dur, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  // tempo de cada trecho: chega no time em 40% da cena, fica nele, e pousa (o ultimo trecho e curto)
  const TK = [0, 0.28, 0.58, 0.86, 1], n = pts.length - 1;
  let i = 0; while (i < n - 1 && e > TK[i + 1]) i++;
  const u = Math.min(1, Math.max(0, (e - TK[i]) / (TK[i + 1] - TK[i])));
  // Catmull-Rom na posicao E no ponto olhado: a camera nunca para nem gira aos trancos entre as tomadas
  const cr = (key, out) => {
    const P = (j) => pts[Math.max(0, Math.min(n, j))][key];
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), u2 = u * u, u3 = u2 * u;
    return out.set(0, 0, 0).addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u).addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
      .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u).addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
  };
  camera.position.copy(cr('pos', introP));
  camera.up.set(0, 1, 0); camera.lookAt(cr('at', tmpV));
  // pouso exato na sua mira (o ultimo trecho termina olhando pro mesmo lugar, isso so tira qualquer sobra)
  if (k > 0.97) { introE.set(p.pitch, p.yaw, 0); introQ.setFromEuler(introE); camera.quaternion.slerp(introQ, (k - 0.97) / 0.03); }
  camera.fov = settings.fov; camera.updateProjectionMatrix();
  vmPass.enabled = k > 0.9; // a arma entra so no pouso
  introMeSync(dt, p, k <= 0.9); // o seu boneco nas tomadas; no pouso a camera entra nele e ele some
  document.body.classList.toggle('intro-cam', k < 0.9); // cena de cinema: o HUD some (menos a contagem)
}

// conexao caiu: tenta voltar pra mesma sala algumas vezes antes de desistir
async function reconnect(name, mpArgs) {
  if (G.state !== 'game' || !mpArgs) return;
  for (let i = 1; i <= 6; i++) {
    hud.message(t('reconnecting', { n: i }), 2);
    await new Promise(r => setTimeout(r, 1500));
    if (G.state !== 'game') return;
    const net = new WsNet(mpArgs);
    try {
      await net.connect(name);
      clearRemotes();
      G.net = net; net.onmsg = onMsg; net.onclose = () => reconnect(name, mpArgs);
      hud.message(t('reconnected'), 2);
      return;
    } catch { /* tenta de novo */ }
  }
  quitGame();
  setTimeout(() => alert(t('connLost')), 50);
}

async function quitGame() {
  if (SS) { G.net?.close(); return; } // tela dividida: sair encerra a sessao de todo mundo (a pagina de cima volta pra escolha)
  G.flashT = 0; G.hurtFlash = 0; G.endInfo = null; stopPodium();
  await iris(0, 450);
  const fromRange = G.range; if (fromRange) { G.range.dispose(); G.range = null; if (fromRange.primary !== undefined && settings.primary !== fromRange.primary) { settings.primary = fromRange.primary; saveSettings(); } }
  if (G.tutorial) { if (G.tutorial.finished) try { localStorage.setItem('rr_tutorial_done', '1'); } catch { /* */ } G.tutorial.dispose(); G.tutorial = null; }
  G.state = 'menu';
  G.paused = false;
  const n = G.net; G.net = null;
  n && n.close();
  G.player = null; G.myId = null; G.me = null;
  clearRemotes();
  document.body.classList.remove('ingame', 'touchmode', 'mode-br', 'is-dead', 'stim-rush'); G.stimFx = false; chat.enable(false);
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true; document.body.classList.remove('game-smith'); setTouchBoard(false);
  lobby.hide(); hideLoading();
  $('menu').hidden = false;
  input.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  // 03/11 (hotfix, pedido dele): voltar da partida NAO sai da tela cheia (no celular voltava com as barras do navegador)
  audio.music(true, 'music');
  startAttract();
  if (fromRange) ui.go('arsenal', false, fromRange.cat); else ui.go('home'); // campo de treino volta pro Arsenal (o que estava bloqueado continua)
  iris(150, 700);
}

// lobby: escolher a principal antes de comecar (nao existe na escada de armas nem no infectado)
let lobbyPickMode = null;
function syncLobbyPick(mode) {
  // escada de armas e infectado: a arma vem do jogo, ninguem escolhe
  const off = mode === 'gungame' || mode === 'infect';
  $('lbPick').hidden = off;
  if (off || lobbyPickMode === mode) return;
  lobbyPickMode = mode;
  renderLobbyPick();
}
function openLobbySmith() {
  audio.play('ui_click', { ui: true });
  $('lobby').hidden = true; $('menu').hidden = false;
  ui.go('arsenal', 'lobby', PRIMARIES.includes(settings.primary) ? settings.primary : PRIMARIES[0]);
}
// skills e desafios da sala (02/11, pedido dele): mesma tela do menu, por cima do lobby; voltar devolve pra sala
function openLobbyScreen(name) {
  audio.play('ui_click', { ui: true });
  $('lobby').hidden = true; $('menu').hidden = false;
  ui.go(name, 'lobby');
}
function closeLobbySmith(ready) {
  if ($('menu').hidden) return;
  tipClose(); // dica da tela de cima (skills) nao fica em cima da sala
  $('menu').hidden = true; ui.go('home');
  if (G.state === 'game') { // aberto da pausa: a arma montada vale no PROXIMO renascimento (pedido dele 03/11) e volta pro tiroteio
    applyLoadoutLater();
    $('hud').hidden = false; document.body.classList.remove('game-smith');
    if (ready) setPaused(false); else { $('pause').hidden = false; renderPausePick(); } // Esc/voltar: cai na pausa (Esc nao destrava o mouse)
    return;
  }
  sendLoadout(); renderLobbyPick();
  if (G.state !== 'lobby') return; // a partida ja comecou
  $('lobby').hidden = false;
  if (ready && !lobby.isHost && !lobby.ready) $('lbReady').click();
}
function renderLobbyPick() {
  const list = PRIMARIES;
  if (!list.includes(settings.primary)) { settings.primary = list[0]; saveSettings(); sendLoadout(); }
  $('lbSmith').onclick = openLobbySmith;
  $('lbSkills').onclick = () => openLobbyScreen('skills');
  $('lbCh').onclick = () => openLobbyScreen('challenges');
  // nome proprio do modelo montado em cada principal
  $('lbPickList').innerHTML = list.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${G.loadouts[w]?.body ? partName('body', G.loadouts[w].body) : wName(w)}</span></button>`).join('');
  $('lbPickList').querySelectorAll('button').forEach(b => b.onclick = () => {
    settings.primary = b.dataset.w; saveSettings(); sendLoadout();
    audio.play('pickup', { ui: true, vol: 0.5 });
    $('lbPickList').querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
  });
}

// pausa: escolher a principal (troca na hora) ou abrir o Arsenal inteiro por cima da partida
function openGameSmith() {
  audio.play('ui_click', { ui: true });
  $('pause').hidden = true; $('hud').hidden = true; $('menu').hidden = false;
  document.body.classList.add('game-smith'); // esconde os botoes de toque e a tela de derrubado enquanto monta
  ui.go('arsenal', 'game', PRIMARIES.includes(settings.primary) ? settings.primary : PRIMARIES[0]);
}
function renderPausePick() {
  // escada de armas nao escolhe; infectado (vermelho) so tem a lamina; sobrevivente nao pega sniper
  const off = G.mode === 'gungame' || G.mode === 'infect' || !!EV(G.snap?.mut)?.kit; // evento com armas fixas tambem
  $('pausePick').hidden = off || G.mode === 'br'; // battle royale: a principal vem do chao, mas as pecas valem
  $('pauseSmith').hidden = off || !!G.tutorial || !!G.range;
  $('rangePick').hidden = !G.range; $('rangeBack').hidden = !G.range; $('quit').hidden = !!G.range;
  if (G.range) { $('pausePick').hidden = true; renderRangePick(); return; }
  $('pauseSmith').onclick = openGameSmith;
  if (off) return;
  const list = PRIMARIES;
  $('pkList').innerHTML = list.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${G.loadouts[w]?.body ? partName('body', G.loadouts[w].body) : wName(w)}</span></button>`).join('');
  $('pkList').querySelectorAll('button').forEach(b => b.onclick = () => {
    settings.primary = b.dataset.w; saveSettings(); applyLoadoutLater(true);
    audio.play('pickup', { ui: true, vol: 0.5 });
    hud.message(t('nextSpawn', { w: G.loadouts[b.dataset.w]?.body ? partName('body', G.loadouts[b.dataset.w].body) : wName(b.dataset.w) }), 2);
    renderPausePick();
  });
}

function setPaused(p) {
  if (p && G.endInfo) return; // acabou a partida: sem menu de pausa por cima do podio
  if (G.state !== 'game') return;
  G.paused = p;
  if (p) renderPausePick();
  $('pauseHud').hidden = !isTouch;
  // trocar de time (02/11): so em modo de time escolhivel e com sala de verdade (o servidor confere vaga e espera de 6 min)
  $('pauseTeam').hidden = !(MODES[G.mode]?.teams && !G.duo && !['infect', 'bomb', 'br'].includes(G.mode) && !G.tutorial && !G.range && !SS);
  $('pause').hidden = !p;
  input.enabled = !p;
  if (p) { input.keys.clear(); input.mouse.fire = input.mouse.ads = false; input.touch.fire = false; }
  if (!p && !isTouch && !SS) lockPointer(canvas);
}
document.addEventListener('pointerlockchange', () => {
  if (G.state === 'game' && !isTouch && !document.pointerLockElement && !G.paused && $('theend').hidden && !chat.isOpen && !G.endInfo) setPaused(true); // G.endInfo: partida acabou (camera final e podio soltam o mouse sem pausar)
});
// celular: tocar no placar de cima abre o Tab; tocar fora dele fecha (dentro dele rola a lista)
function setTouchBoard(on) { input.touchBoard = on; document.body.classList.toggle('board-open', on); }
document.addEventListener('pointerdown', (e) => {
  if (G.state !== 'game' || e.pointerType === 'mouse') { if (input.touchBoard) setTouchBoard(false); return; }
  if (G.paused) return;
  const inR = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  if (input.touchBoard) { if (!inR($('board'))) setTouchBoard(false); e.stopPropagation(); return; } // nao vira tiro nem giro de camera
  // selo do equipamento: fica embaixo da camada de toque, entao o toque nele e lido aqui (antes nunca chegava)
  if (!$('fieldHud').hidden && inR($('fhBadge'))) { input.edges.add('FIELD'); e.stopPropagation(); return; }
  if (inR($('scorePlaque'))) { setTouchBoard(true); e.stopPropagation(); }
}, true);
$('resume').onclick = () => { audio.play('ui_click', { ui: true }); setPaused(false); };
$('quit').onclick = () => { audio.play('ui_back', { ui: true }); quitGame(); };
$('pauseSettings').onclick = () => { $('pause').hidden = true; $('menu').hidden = false; ui.go('settings', true); };

// ---------- dica leve na tela (01/11, pedido dele, estilo COD) ----------
// borda na frente = escalar (o recarregar fica no aviso de municao do hud). Mostra o botao do aparelho em uso (teclado, controle, toque).
let hintEl = null, hintKey = '', hintT = 0;
function ctxHint(dt, p) {
  hintT -= dt; if (hintT > 0) return; hintT = 0.12;
  let k = null;
  if (G.state === 'game' && p.alive && !G.paused && !G.intro && !replay.on && !p.mantle) {
    // municao: o aviso embaixo da mira (hud.ammoAlert) ja cuida; aqui so a escalada
    if (p.onGround && !p.crouch && !(p.slideT > 0) && !G.mySeat && p.mantleSpot?.()) k = 'climb';
  }
  const dev = pad.active ? 1 : isTouch ? 2 : 0, key = k ? k + dev : '';
  if (key === hintKey) return;
  hintKey = key;
  if (!hintEl) { hintEl = document.createElement('div'); hintEl.className = 'ctx-hint'; hintEl.setAttribute('aria-live', 'polite'); $('hud').appendChild(hintEl); }
  hintEl.hidden = !k;
  if (!k) return;
  hintEl.innerHTML = `<kbd>${keyLabel('jump', dev)}</kbd><span>${t('hintClimb')}</span>`;
}

// ---------- campo de treino ----------
// qualquer modelo, ate o bloqueado: o seu modelo vai com a sua montagem; os outros com o padrao do corpo (so nesta partida)
function rangeLoadout(cat, body) {
  if (cat === 'melee') return { body, camo: null };
  return { body, scope: cat === 'sniper' ? nativePart(body, 'scope') : freeScope(cat, body), charger: nativePart(body, 'charger'), handle: null, paint: null, accent: null, camo: null, m1: 1 };
}
function rangeEquip(cat, body) {
  const P = G.player; if (!G.range || !CATEGORY[cat]) return;
  G.range.cat = cat; G.range.body = body;
  const mine = matchLoadouts()[cat]; // a SUA montagem (pecas, camo, pintura, bocal) quando e o mesmo modelo
  G.loadouts[cat] = mine?.body === body ? { ...mine } : { ...rangeLoadout(cat, body), ...(getLoadouts()[cat]?.saved?.[body] || {}) }; // outro modelo: o que voce montou nele antes (memoria por modelo)
  if (PRIMARIES.includes(cat)) settings.primary = cat; // so na memoria; o salvo volta na saida
  sendLoadout();
  if (!P) return;
  P.rearm();
  if (P.owned.includes(cat)) { const st = P.stats(cat); P.ammo[cat] = { ...(P.ammo[cat] || {}), mag: st.mag, reserve: 999 }; P.equip(cat, true); }
}
let rangeCat = null;
function renderRangePick() {
  const R = G.range; if (!R) return;
  const cats = ['pistol', ...PRIMARIES, 'melee'].filter((c, i, a) => CATEGORY[c] && a.indexOf(c) === i);
  rangeCat = cats.includes(rangeCat) ? rangeCat : R.cat;
  $('rgTabs').innerHTML = cats.map(c => `<button role="tab" aria-selected="${c === rangeCat}" data-c="${c}">${t('cat_' + c)}</button>`).join('');
  $('rgTabs').querySelectorAll('button').forEach(b => b.onclick = () => { rangeCat = b.dataset.c; audio.play('ui_click', { ui: true }); renderRangePick(); });
  const bodies = CATEGORY[rangeCat].bodies;
  $('rgList').innerHTML = bodies.map(id => `<button role="radio" aria-checked="${R.cat === rangeCat && R.body === id}" data-b="${id}"><span>${partName('body', id)}</span></button>`).join('');
  $('rgList').querySelectorAll('button').forEach(b => b.onclick = () => {
    rangeEquip(rangeCat, b.dataset.b); audio.play('pickup', { ui: true, vol: 0.5 });
    hud.message(t('swapNow', { w: partName('body', b.dataset.b) }), 1.6);
    setPaused(false);
  });
}
function startRange(cat, body) {
  if (!CATEGORY[cat]) return;
  G.range = new Range(G, cat, body);
  G.range.primary = settings.primary; // devolve a principal salva na saida
  rangeCat = cat;
  $('menu').hidden = true;
  const rangeNet = new LocalNet({ mode: 'ffa', map: 'vila', bots: 0, lobby: false, limit: 9999, time: 3600 }); rangeNet.core.noDrops = true; // campo de treino: alvo nao larga arma
  startGame(rangeNet, settings.name || (rovexGuest() ? rovexGuestName() : t('youCap'))).catch(() => { G.range?.dispose(); G.range = null; });
}
$('rangeBack').onclick = () => { audio.play('ui_back', { ui: true }); quitGame(); };

// ---------- menus ----------
const ui = initMenus({
  settings, saveSettings,
  // treino guiado na Vila: partida solo sem lobby, sem bots (os bonecos entram no passo de tiro)
  onTutorial: () => {
    try { localStorage.setItem('rr_tutorial_seen', '1'); } catch { /* */ } // primeira vez so abre sozinho uma vez
    G.tutorial = new Tutorial(G, { setHud: (m) => { settings.hudMode = m; saveSettings(); }, quit: () => quitGame(), reward: tutorialReward, setPing: (on) => { if (input.pingBtn) input.pingBtn.hidden = !on; }, setField: (f) => {
      const me = G.net?.core?.players.get(G.myId); if (me) me.field = f;
      if (G.tutorial) G.tutorial.fieldOverride = f;
      G.field = f; G.fieldK = 1; if (me) me.fieldCharge = 1; // treino: a Mola emprestada ja vem cheia
      setFieldHud(f);
    } });
    const tutNet = new LocalNet({ mode: 'ffa', map: 'vila', bots: 0, lobby: false, limit: 500, time: 1800 }); tutNet.core.noDrops = true;
    startGame(tutNet, settings.name || (rovexGuest() ? rovexGuestName() : t('youCap'))).catch(() => { G.tutorial?.dispose(); G.tutorial = null; });
  },
  onRange: (cat, body) => startRange(cat, body),
  bindsChanged: () => { input.kbMap = null; input.padMap = null; },
  onSolo: ({ mode, map, bots, difficulty, limit, time }) => startGame(new LocalNet({ mode, map, bots, difficulty, limit, time }), settings.name || (rovexGuest() ? rovexGuestName() : t('youCap'))),
  onMp: (args) => startGame(new WsNet(args), args.name, args),
  onLook: (look, team) => setLookPreview(look, team),
  previewDeath: (on) => { G.lookDeath = !!on; },
  previewDance: (id) => { if (id === G.lookDance?.id) return; G.lookDance = id ? { id, t: 0 } : null; lookFx?.clear(); if (id) audio.dance(id); else audio.danceStop(); },
  // vitrine: o feixe do laser e' curto (o de 12 m da partida cruzava a tela inteira); so mostra a cor saindo do cano
  onSmith: (gun, cat, charm) => { smithHolder.clear(); if (!gun) return; const lz = gun.userData.laser; if (lz) lz.beam.scale.z = 0.35; gun.userData.saber?.ignite(); { const c = new THREE.Box3().setFromObject(gun).getCenter(new THREE.Vector3()); gun.position.x -= c.x; gun.position.z -= c.z; } /* gira em torno do meio da arma, nao do cabo */ smithHolder.add(gun); if (cat !== 'melee') attachCharm(gun, charm ?? wornLook().charm, 1); },
  onBackFromSettingsInGame: () => { $('menu').hidden = true; $('pause').hidden = false; },
  // arsenal aberto do lobby: aplica a arma montada e volta pra sala (ready = ja marca pronto)
  onBackToLobby: (ready) => closeLobbySmith(ready),
  lobbyHost: () => lobby.isHost,
  inGame: () => G.state === 'game',
  inRoom: () => G.state === 'game' || lobby.open, // a partida de fundo do menu nao conta
  roomCode: () => (G.net && $('lbRoomCode')?.textContent) || null,
  leave: () => quitGame(),
  loadoutsChanged: (l) => { G.loadouts = l; },
});

// ---------- loop ----------
let last = performance.now();
let menuT = 0;
const tmpV = new THREE.Vector3();

// granada cozinhando: tracejado (bolinhas) com a mesma fisica do servidor ate o pavio que sobra, e um anel
// onde ela estoura. Tinta preta (o filtro do jogo tira a cor, branco sumia no chao); pisca no fim do pavio.
const ARC_DOTS = 70, arcDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x141210 }), ARC_DOTS);
arcDots.frustumCulled = false; arcDots.visible = false; scene.add(arcDots);
const arcRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 32), new THREE.MeshBasicMaterial({ color: 0x141210, side: THREE.DoubleSide }));
arcRing.rotation.x = -Math.PI / 2; arcRing.visible = false; scene.add(arcRing);
const arcM = new THREE.Matrix4();
function nadeArc(p) {
  const c = p?.alive && !G.paused && p.cook;
  arcDots.visible = arcRing.visible = !!c;
  if (!c) return;
  const left = NADES[c.kind].fuse - c.t, d = camera.getWorldDirection(tmpV).toArray();
  const n = nadeLaunch(p.pos, d, c.kind), dt = 1 / 60;
  let t = 0, run = -0.9, k = 0, prev = [...n.pos]; // a primeira bolinha so depois de ~1,3 m (colada na camera virava um borrao)
  while (t < left && t < 6) {
    nadeStep(G.M, n, dt); t += dt;
    run += Math.hypot(n.pos[0] - prev[0], n.pos[1] - prev[1], n.pos[2] - prev[2]); prev = [...n.pos];
    if (run >= 0.45 && k < ARC_DOTS) { run = 0; arcM.makeTranslation(n.pos[0], n.pos[1], n.pos[2]); arcDots.setMatrixAt(k++, arcM); } // uma bolinha a cada 45 cm
  }
  arcDots.count = k; arcDots.instanceMatrix.needsUpdate = true;
  arcDots.visible = arcRing.visible = left > 0.7 || Math.floor(left * 10) % 2 === 0; // fim do pavio: pisca
  arcRing.position.set(n.pos[0], n.pos[1] + 0.06, n.pos[2]);
  arcRing.scale.setScalar(c.kind === 'frag' ? NADES.frag.radius / 6.5 : 1);
}
// erro dentro do quadro nao pode congelar a tela: o clarao (Torta, flash) apaga ANTES de tudo, o erro vai
// pro servidor com o estado da partida e o proximo quadro roda normal (01/11: tela branca da Torta da Nyx)
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!Number.isFinite(G.flashT)) G.flashT = 0;
  G.flashT = Math.max(0, G.flashT - realDt);
  film.uniforms.flash.value = G.state === 'game' ? Math.min(1, G.flashT) : 0;
  try { frameBody(now, realDt); } catch (e) {
    reportaErro(e, 'frame ' + G.state + '/' + G.mode + '/' + (ui.screen || ''));
    // o quadro quebrou antes de desenhar: desenha assim mesmo (senao a tela congelava no ultimo quadro, branco do
    // clarao da flash/Torta ou da abertura: 02/11, tela branca permanente e tela branca ao comecar)
    try { composer.render(realDt); } catch { /* */ }
  }
}
function frameBody(now, realDt) {
  // camera lenta no abate final
  if (G.slowT > 0) G.slowT -= realDt;
  G.timeScale += ((G.slowT > 0 ? 0.25 : 1) - G.timeScale) * Math.min(1, realDt * 8);
  let dt = realDt * G.timeScale;
  if (replay.on) dt = replay.tick(realDt, scene); else if (G.state === 'game') replay.record(now / 1000, G);
  G.t += dt;
  camoTime.value = (camoTime.value + realDt) % 600; // tempo curto: numero grande perde precisao no shader do celular
  updateCamoFx(realDt);
  film.uniforms.time.value = G.t;

  if (ui.screen === 'look' && G.state === 'menu' && lookChar) {
    menuT += realDt;
    lookChar.root.rotation.y = Math.PI + Math.sin(menuT * 0.45) * 0.7 + lookDrag;
    if (G.lookDance) { const L = G.lookDance; L.t += realDt; if (L.t >= danceLen(L.id)) { G.lookDance = null; lookFx?.clear(); } }
    if (G.lookDeath) { const T = (menuT % 2.8); lookChar.update(realDt, T < 1.2 ? { anim: 'pose', alive: true, speed: 0, t: menuT, pitch: 0 } : { anim: 'pose', alive: false, speed: 0, t: menuT, pitch: 0 }); } else
    lookChar.update(realDt, G.lookDance ? { anim: 'dance', dance: G.lookDance.id, danceT: G.lookDance.t, alive: true, speed: 0, t: menuT, pitch: 0 } : { anim: 'pose', alive: true, speed: 0, t: menuT, pitch: 0 });
    if (G.lookDance) (lookFx ||= new DanceFx(lookScene)).tick(lookChar, G.lookDance.id, G.lookDance.t); lookFx?.update(realDt);
    // o boneco no meio do espaco livre a esquerda do cartao (mede o cartao de verdade)
    lookCam.aspect = innerWidth / innerHeight;
    const free = Math.max(160, $('scr-look').getBoundingClientRect().left - 12);
    const tanH = Math.tan(THREE.MathUtils.degToRad(lookCam.fov / 2));
    const z = Math.max(6.6, 1.5 / ((free / innerWidth) * tanH * lookCam.aspect));
    lookCam.position.set(0, 1.45, z); lookCam.lookAt(0, 1.3, 0);
    lookCam.setViewOffset(innerWidth, innerHeight, innerWidth / 2 - free / 2, 0, innerWidth, innerHeight);
    lookCam.updateProjectionMatrix();
    renderer.render(lookScene, lookCam);
    pad.poll(realDt, false); // controle no Visual
    return;
  }
  if (ui.screen === 'arsenal' && (G.state === 'menu' || ((G.state === 'lobby' || G.state === 'game') && !$('menu').hidden))) {
    if (G.state !== 'menu') { G.net && G.net.update(realDt); } // a partida segue rodando por tras
    menuT += realDt;
    smithIdle += realDt; smithSway += ((smithIdle > 5 ? 1 : 0) - smithSway) * Math.min(1, realDt * 3);
    smithHolder.rotation.y = Math.sin(menuT * 0.5) * 0.6 * smithSway - Math.PI / 2 + 0.25 + smithDrag;
    { // o chaveiro fica no lado que esta de frente pra camera: na vitrine ele nunca some atras da arma
      const g = smithHolder.children[0], C = g?.userData.charm, want = Math.sin(smithHolder.rotation.y) < 0 ? 1 : -1;
      if (C && C.side !== want) attachCharm(g, C.id, want);
    }
    smithHolder.position.y = Math.sin(menuT * 1.3) * 0.01;
    tickCharm(smithHolder.children[0], realDt);
    // camuflagem reativa na vitrine: passa pelos 4 estagios (na partida sobe a cada 2 abates)
    smithHolder.traverse(o => { const u = o.material?.userData?.u?.uReact; if (u) u.value = Math.floor(menuT / 1.6) % 4; });
    const narrow = innerWidth < 760, cod = !narrow && innerHeight > 520;
    if (narrow) { smithCam.position.set(0, -0.42, 2.9); smithCam.lookAt(0, -0.44, 0); }
    else if (cod) {
      // estilo COD (04/11): a arma grande no vao entre o nome e as fileiras de baixo, a esquerda dos status
      const stkOn = !$('stkPane').hidden, open = !$('pickWrap').hidden, top = (stkOn ? document.querySelector('#scr-arsenal .card-head') : $('equipBar')).getBoundingClientRect().bottom + 6, bot = (stkOn ? $('stkPane') : open ? $('pickWrap') : $('slotList')).getBoundingClientRect().top - 6;
      const free = Math.max(200, 2 * ((stkOn ? innerWidth : $('statBars').getBoundingClientRect().left) - innerWidth / 2) - 24), hgt = Math.max(120, bot - top); // 05/11: centralizada na tela (estava jogada pra esquerda)
      const tanH = Math.tan(THREE.MathUtils.degToRad(smithCam.fov / 2)), W = free / innerWidth, Hh = hgt / innerHeight;
      const z = Math.max(1.5, 1.2 / (W * 2 * tanH * smithCam.aspect), 0.5 / (Hh * 2 * tanH)); // 1,2: no balanco o cano nao entra embaixo dos status
      const sx = 0, sy = -(1 - (top + bot) / innerHeight) * z * tanH;
      const k = 1 - Math.exp(-9 * realDt); // abrir a lista de pecas desliza a arma, sem pulo
      G.smCam = G.smCam ? [G.smCam[0] + (sx - G.smCam[0]) * k, G.smCam[1] + (sy - G.smCam[1]) * k, G.smCam[2] + (z - G.smCam[2]) * k] : [sx, sy, z];
      smithCam.position.set(G.smCam[0], G.smCam[1] + 0.1, G.smCam[2]);
      smithCam.lookAt(G.smCam[0], G.smCam[1], 0);
    } else {
      // a arma inteira no meio do espaco livre a esquerda do painel (mede o painel de verdade)
      const free = Math.max(160, $('scr-arsenal').getBoundingClientRect().left - 12);
      const tanH = Math.tan(THREE.MathUtils.degToRad(smithCam.fov / 2));
      const fit = 1.6 / ((free / innerWidth) * 2 * tanH * smithCam.aspect); // arma + folga do balanco no vao
      const z = Math.max(2.4, fit), ndc = free / innerWidth - 1;              // centro do vao em NDC
      const sx = -ndc * z * tanH * smithCam.aspect;
      smithCam.position.set(sx, 0.12, z);
      smithCam.lookAt(sx, 0, 0);
    }
    // gravacao de video (05/11): camera e arma da vitrine escolhidas de fora (captura/rec-armas.cjs); no jogo normal fica parado
    if (window.__smithShot) { const o = window.__smithShot; smithCam.position.set(o[0], o[1], o[2]); smithCam.lookAt(0, o[3] || 0, 0); }
    renderer.render(smithScene, smithCam);
    pad.poll(realDt, false); // controle no Arsenal (antes saia daqui sem ler o controle)
    return;
  }

  pad.poll(realDt, G.state === 'game' && !G.paused);
  G.net && G.net.update(dt);
  if (G.state === 'lobby') lobby.frame();
  lineupFrame(realDt);
  world.update(G.t, dt);
  world.cull?.(camera.position); // Floresta: miolo do estudio some quando a camera esta na mata
  G.strikes?.update(dt, G.t, G.blimpMeshes);
  if (G.heistView && G.state === 'lobby') { G.heistView.dispose(); G.heistView = null; if (G.player) { G.player.bagged = false; G.player.crated = false; } } // 05/11: voltou pro lobby, o cofre da rodada anterior sai (senao trocar de modo mantinha ele)
  if (G.heistView) { G.heistView.update(dt, G.t); G.heistView.hud(G.snap?.heist, G.myTeam, G.state === 'game'); }
  downMarks();
  if (G.borView) {
    G.borView.update(dt, G.t);
    const P = G.player, ok = G.state === 'game' && P?.alive && !G.down;
    let pr = ok ? G.borView.prompt(P.pos, P.owned, isTouch ? t('bor_holdTouch') : t('bor_hold', { k: G.pad?.active ? 'X' : 'E' })) : null;
    // parceiro caido perto: segurar usar levanta (mesma bomba da dupla)
    G.pumpMate = null;
    if (ok) for (const r of G.remotes.values()) {
      if (r.mob || !r.alive || !(r.dn > 0) || r.team !== G.myTeam || (r.pos[0] - P.pos[0]) ** 2 + (r.pos[2] - P.pos[2]) ** 2 > BR.duo.reviveR ** 2) continue;
      G.pumpMate = r;
      pr = r.rv > 0 ? t('duo_pumping', { p: Math.min(99, Math.round(r.rv / BR.duo.revive * 100)) }) : t(isTouch ? 'duo_pumpTouch' : G.pad?.active ? 'duo_pumpPad' : 'duo_pump');
    }
    hud.prompt(pr);
    if (input.useBtn) input.useBtn.classList.toggle('can', !!pr); // toque: a mao pulsa quando da pra comprar/abrir/levantar ali
  }
  objectives.update(G.t, G.snap, G.mode, (id) => id === G.myId ? { me: true } : G.remotes.get(id));
  escView?.update(G.t, dt, G.snap?.esc); escHud(G.snap?.esc);
  fieldView?.update(G.t, dt, G.snap, G.remotes);
  // barra do equipamento (enche com pontos e abates, vem do servidor no snapshot); guarda-chuva fecha sozinho
  if (G.shieldT > 0 && (G.shieldT -= dt) <= 0) vm.umbOn = false;
  if (G.field) {
    const meS = G.snap?.players?.find(p => p.id === G.myId);
    if (meS && meS.fc != null && !(G.t - (G.fieldUsedT ?? -9) < 0.6 && meS.fc >= 100)) G.fieldK = meS.fc / 100; // logo depois de usar o snapshot velho ainda diz cheio (antes travava em 0 se a carga voltasse cheia sem o aviso)
    const k = G.fieldK ?? 0, cool = k < 1, fh = $('fieldHud');
    $('fhBadge').style.setProperty('--cd', (k * 100).toFixed(1) + '%');
    if (cool) { const n = Math.floor(k * 100) + '%'; if ($('fhCd').textContent !== n) $('fhCd').textContent = n; }
    if (cool !== fh.classList.contains('cooling')) {
      fh.classList.toggle('cooling', cool);
      if (!cool) { // ficou pronto: vai pro centro de baixo, estala e volta pro canto
        fh.classList.remove('pop'); void fh.offsetWidth; fh.classList.add('pop', 'announce');
        clearTimeout(G.fhT); G.fhT = setTimeout(() => fh.classList.remove('announce'), 1800);
      }
    }
    const key = isTouch ? '' : G.pad?.active ? t('fh_pad') : 'Z';
    if ($('fhKey').textContent !== key) $('fhKey').textContent = key;
  }
  if (brView) {
    brView.setZone(G.mode === 'br' && !G.inRing ? G.snap?.br : null); brView.update(G.t, dt, camera); // no ringue a parede da iris some (ela fica logo atras)
    // fora da iris: pelicula queimando na borda da tela + aviso; area nova: nome dela no meio da tela
    const Z = G.mode === 'br' && G.state === 'game' ? G.snap?.br : null, P = G.player;
    const out = !!(Z && P?.alive && Math.hypot(P.pos[0] - Z.c[0], P.pos[2] - Z.c[1]) > Z.r);
    // arma no chao com as 2 principais ocupadas: avisa que segurando E troca pela da mao
    let pr = null;
    if (Z && P?.alive) {
      const prims = P.owned.filter(w => ['smg', 'rifle', 'shotgun', 'sniper', 'lmg', 'minigun'].includes(w));
      if (prims.length >= 2) {
        const it = (G.brLoot || []).find(l => l[1] === 'wpn' && !P.owned.includes(l[2]) && l[2] !== 'pistol' && (l[3] - P.pos[0]) ** 2 + (l[5] - P.pos[2]) ** 2 < 2.6);
        if (it) tip('swap');
        if (it) pr = t(isTouch ? 'br_swapTouch' : G.pad?.active ? 'br_swapPad' : 'br_swap', { a: gunName(G.myId, prims.includes(P.wpn) ? P.wpn : prims[0]), b: it[6] ? t(it[6]) : G.loadouts[it[2]]?.body ? partName('body', G.loadouts[it[2]].body) : wName(it[2]) });
      }
    }
    // dupla: parceiro caido perto = segurar usar enche a bomba de bicicleta
    G.pumpMate = null;
    if (G.duo && P?.alive && !G.down) {
      for (const r of G.remotes.values()) {
        if (!r.alive || !(r.dn > 0) || r.team !== G.myTeam) continue;
        if ((r.pos[0] - P.pos[0]) ** 2 + (r.pos[2] - P.pos[2]) ** 2 > BR.duo.reviveR ** 2) continue;
        G.pumpMate = r;
        pr = r.rv > 0 ? t('duo_pumping', { p: Math.min(99, Math.round(r.rv / BR.duo.revive * 100)) }) : t(isTouch ? 'duo_pumpTouch' : G.pad?.active ? 'duo_pumpPad' : 'duo_pump');
      }
    }
    hud.prompt(pr);
    if (out !== G.irisOut) { G.irisOut = out; document.getElementById('irisOut').classList.toggle('on', out); if (out) hud.message(t('br_outside'), 2.2); }
    if (Z && P?.alive) {
      const A = G.M.areas?.find(a => Math.hypot(P.pos[0] - a.pos[0], P.pos[2] - a.pos[2]) < a.r);
      if (A && A.name !== G.brArea) hud.message(t('area_' + A.name), 2.4);
      G.brArea = A ? A.name : null;
    }
  }
  fx.update(dt);
  // armas largadas: giram devagar, piscam nos 2 s finais e somem sozinhas se o aviso do servidor se perder
  if (G.player) { // gadget de baixo do cano: plaquinha com o tanque/cartuchos e o botao de toque so quando tem
    const gid = G.player.alive ? G.player.gadgetId() : null;
    if (gid !== G.gadgetShown) {
      G.gadgetShown = gid; document.body.classList.toggle('has-gadget', !!gid);
      if (gid && !(G.gadgetTold ||= new Set()).has(gid)) { G.gadgetTold.add(gid); hud.message(t(isTouch ? 'gdHintTouch' : 'gdHint', { g: t(gid), k: bindLabel(settings, 'gadget', G.pad?.active ? 1 : 0) }), 3); } // 1a vez na partida: diz o botao
    }
    hud.gadget(gid, gid === 'gd_flame' ? G.player.flameFuel / GADGETS.gd_flame.fuel : G.player.ubShells, { ...settings, padActive: !!G.pad?.active, on: !!G.player.gadgetOn });
  }
  { const rk = vm.gun?.userData.rocket; if (rk && G.player) rk.visible = (G.player.ammo?.rpg?.mag || 0) > 0 && !(G.player.reloadT > 0); } // Bazuca: foguete na boca
  for (const [id, g] of G.gunDrops) { const age = G.t - g.userData.born; g.rotation.y += dt * 0.8; g.position.y = g.userData.y + Math.sin(G.t * 3 + id) * 0.04; g.visible = age < 8 || Math.floor(age * 8) % 2 === 0; if (age > 11) { scene.remove(g); disposeGun(g); G.gunDrops.delete(id); } }
  for (const m of G.nadeMeshes.values()) { const to = m.userData.to, moving = to && m.position.distanceToSquared(tmpV.fromArray(to)) > 0.0004; if (moving) { if (m.userData.spin) m.rotation.x -= dt * 16; else m.rotation.z -= dt * 6; } else if (m.userData.spin) m.rotation.x = -Math.PI / 2; } // gira so no ar; no chao fica deitada
  tickNadeFx(dt);
  for (const m of G.nadeMeshes.values()) if (m.userData.to) { m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 18)); if (m.userData.rocket) { if (Math.random() < dt * 30) fx.puff(m.position.toArray(), 1, 0.35, 0x8a8478, 0.5); } else m.rotation.x += dt * 8; } // foguete nao gira: solta fumaca
  for (const m of G.blimpMeshes) if (m.userData.to) {
    if (m.userData.bomber) { // dirigivel bombardeiro (04/11): aparece e vai embora esmaecendo perto da borda do mapa
      if (!m.userData.fadeMats) { m.userData.fadeMats = []; m.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); o.material.transparent = true; m.userData.fadeMats.push(o.material); } }); }
      const r = Math.hypot(m.position.x, m.position.z), A = G.M?.arena || 60, op = THREE.MathUtils.clamp((A + 40 - r) / 32, 0, 1);
      for (const mt of m.userData.fadeMats) { mt.opacity = op; mt.depthWrite = op > 0.95; }
      m.visible = op > 0.01;
    }
    if (m.userData.sentry) { m.position.fromArray(m.userData.to); let d = (m.userData.yaw || 0) - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += d * Math.min(1, dt * 10); continue; } // parada: so gira pra mira
    const prev = m.position.clone();
    m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 4));
    if (prev.distanceToSquared(m.position) > 1e-4) m.lookAt(m.position.clone().add(m.position.clone().sub(prev)));
    m.rotateY(Math.PI);
  }

  if (G.snap?.cars) (G.carView ||= new CarView(scene)).update(dt, G.snap.cars, G.myCar);
  else if (G.carView) { G.carView.dispose(); G.carView = null; }
  for (const r of G.remotes.values()) {
    if (replay.on && replay.pose(r, r.id)) continue;
    const k = 1 - Math.exp(-14 * dt);
    const ox = r.pos[0], oz = r.pos[2];
    r.pos[0] += (r.target[0] - r.pos[0]) * k; r.pos[1] += (r.target[1] - r.pos[1]) * k; r.pos[2] += (r.target[2] - r.pos[2]) * k;
    r.speed = r.speed * 0.8 + (Math.hypot(r.pos[0] - ox, r.pos[2] - oz) / Math.max(dt, 1e-3)) * 0.2;
    r.char.root.position.fromArray(r.pos);
    let dy = r.yaw - r.char.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    r.char.root.rotation.y += dy * k;
    r.lean = (r.lean || 0) + ((r.leanT || 0) - (r.lean || 0)) * k; r.char.root.rotation.z = -r.lean * 0.3; // inclinado (plantar a bomba)
    const rs = G.carView?.seatOf(r.id); // sentado no carro: vai grudado no lugar (o carro ja suavizado), motorista de frente
    if (rs) { r.pos = [...rs.pos]; r.char.root.position.fromArray(r.pos); r.char.root.rotation.y = rs.yaw; r.speed = 0; r.steer = rs.steer; let o = r.yaw - rs.yaw; r.aimOff = Math.atan2(Math.sin(o), Math.cos(o)); } else { r.steer = 0; r.aimOff = 0; } // sentado: corpo preso no banco
    const camD = camera.position.distanceTo(tmpV.fromArray(r.pos));
    // longe (battle royale com 50): o esqueleto anima 10x por segundo em vez de todo quadro; de perto nada muda
    r.animAcc = (r.animAcc || 0) + dt;
    if (camD < 70 || r.animAcc >= 0.1) { r.char.update(r.animAcc, { anim: r.anim, pitch: r.pitch, alive: r.alive, speed: r.speed, t: G.t, airH: r.pos[1], steer: r.steer, aimOff: r.aimOff }); r.animAcc = 0; }
    const bh = (G.state === 'game' && EV(G.snap?.mut)?.bigHead) || 1; // evento Cabecao
    if (r.char.headK !== bh) { r.char.headK = bh; r.char.head.scale.setScalar(bh); }
    r.char.lod(camD);
    r.char.tag.visible = r.alive && G.state === 'game' && (r.team && r.team === G.myTeam || camD < 30);
    if (r.team && r.team === G.myTeam) r.char.sharpTag(renderer);
  }
  flash?.update(camera, G.remotes, G.myTeam, G.state !== 'game' || !!G.player?.alive);
  { const P0 = G.player; gunL?.update(dt, camera, G.remotes, !flash && G.state === 'game' && !!P0?.alive && !!vm.gun?.userData.laser?.light && !P0.sprint && !P0.tac && !replay.on); } // no Tinteiro escuro a lanterna de sempre ja ilumina

  let scopeOn = false;
  if (G.state === 'game' && G.player) {
    const inp = input.read();
    if (inp.pause) setPaused(!G.paused);
    const p = G.player;
    G.pumping = !!(G.pumpMate && inp.use); // enchendo a bomba: fica parado em cima do parceiro
    // carro (04/11): perto do carro do time aparece "E entrar"; dentro, "E sair"
    let carPr = null;
    if (G.snap?.cars && p.alive && !G.down) {
      const kb = bindLabel(settings, 'use', G.pad?.active ? 1 : 0);
      if (G.mySeat) { carPr = t(isTouch ? 'carOutTouch' : 'carOut', { k: kb }) + ' · ' + t('carHp', { n: G.mySeat.hp ?? 100 }); if (inp.use && !G.useWas) G.net?.send({ t: 'car', act: 'exit' }); }
      else {
        const n = G.carView?.near(p.pos), ck = n && G.snap.cars.find(k => k.id === n.id && k.team === G.myTeam);
        if (ck) { carPr = t(isTouch ? 'carInTouch' : 'carIn', { k: kb, n: ck.seats.filter(Boolean).length }); if (inp.use && !G.useWas) G.net?.send({ t: 'car', act: 'enter' }); }
      }
    }
    if (carPr) { hud.prompt(carPr); if (input.useBtn) input.useBtn.hidden = false; }
    else if (G.carPrompt) { hud.prompt(null); if (input.useBtn && G.mode !== 'bomb' && G.mode !== 'br' && G.mode !== 'borroes') input.useBtn.hidden = true; }
    G.carPrompt = !!carPr;
    // arma no chao (03/11): perto aparece "E pegar X"; so pega apertando usar (antes trocava sozinho ao passar)
    if (G.gunDrops.size && p.alive && G.mode !== 'br' && !carPr) {
      let near = null, best = 2.2 * 2.2;
      for (const [id, g] of G.gunDrops) { const q = g.userData.pos, d2 = (q[0] - p.pos[0]) ** 2 + (q[2] - p.pos[2]) ** 2; if (d2 < best && Math.abs(q[1] - p.pos[1]) < 1.6) { best = d2; near = [id, g]; } }
      G.dropNear = near ? near[0] : null;
      if (near) {
        hud.prompt(t(isTouch ? 'gunTakeTouch' : 'gunTake', { k: bindLabel(settings, 'use', G.pad?.active ? 1 : 0), w: near[1].userData.name }));
        if (inp.use && !G.useWas) G.net?.send({ t: 'pickGun', id: near[0] });
      } else if (G.dropPrompt) hud.prompt(null);
      G.dropPrompt = !!near;
      if (input.useBtn && G.mode !== 'bomb' && G.mode !== 'borroes') input.useBtn.hidden = !near; // toque: botao de usar aparece perto da arma
    } else if (G.dropPrompt) { hud.prompt(null); G.dropPrompt = false; if (input.useBtn && G.mode !== 'bomb' && G.mode !== 'br' && G.mode !== 'borroes') input.useBtn.hidden = true; }
    G.useWas = !!inp.use;
    if (G.M) G.M.dyn = [...(G.snap?.esc ? [trainBox(G.M, G.snap.esc.d)] : G.snap?.heist ? heistBoxes(G.snap.heist) : G.snap?.bor ? borDoorBoxes(G.M, G.snap.bor.doors) : []), ...propBoxes(G.snap?.blimps, G.snap?.cars)]; // bonde (01/11), cofre e van (03/11) e portas fechadas da noite solidos: voce nao atravessa e a bala para
    if (!G.paused) p.update(dt, inp);
    ctxHint(realDt, p);
    nadeArc(p);
    if (G.range && !G.paused) { if (p.alive && !(G.snap?.freeze > 0)) { G.range.begin(); if (!G.range.armed) { G.range.armed = true; rangeEquip(G.range.cat, G.range.body); } } G.range.update(); }
    if (G.tutorial && !G.paused) { if (p.alive && !(G.snap?.freeze > 0)) G.tutorial.begin(); G.tutorial.update(dt, inp); }
    hud.heat(p.wpn === 'lmg' && p.alive ? p.heat : 0, p.hot);
    if (G.net?.ws && (G.latT = (G.latT || 0) - dt) <= 0) { G.latT = 2; G.net.send({ t: 'lat', c: performance.now(), ms: G.myPing || 0 }); } // ping no Tab: mede a cada 2 s
    hud.board(inp.board, G.snap, G.snap?.players || [], G.myId, inp.board && !G.tutorial ? ui.chRows() : null);
    const W = WEAPONS[p.wpn];
    const g = vm.gun?.userData;
    document.body.classList.toggle('has-canted', !!g?.canted);
    const big = vm.sight()?.big;
    const zoom = p.zoomNow || W.zoom || 1;
    // luneta 3D: fora da lente so um zoom leve; dentro da lente, o zoom de verdade
    const outer = big ? 1.2 : zoom;
    G.stimBoostT = Math.max(0, (G.stimBoostT || 0) - realDt);
    // estimulante (03/11, pedido dele): o FOV cresce 5% em ESCALA (antes somava graus fixos) e liga as linhas de velocidade
    const stimOn = G.stimBoostT > 0 && p.alive;
    // escala de FOV igual a do Black Ops 2 (04/11, pedido dele): multiplica o FOV do mundo parado e mirando, entao a mira fecha menos a imagem. Luneta cheia segue com o zoom dela
    const fovS = 1 + ((settings.fovScale || 1) - 1) * (vm.sight()?.big ? 1 - p.adsK : 1);
    const fovT = Math.min(125, (settings.fov + (p.tac ? 12 : p.sprint ? 6 : 0)) * (stimOn ? 1.05 : 1) / (1 + (outer - 1) * p.adsK) * fovS);
    if (stimOn !== !!G.stimFx) { G.stimFx = stimOn; document.body.classList.toggle('stim-rush', stimOn); }
    // distancia de desenho (03/11, pedido dele): curta pra todos, sem opcao. So a luneta (zoom grande mirando) enxerga longe
    const longEye = (big || zoom >= 3) && p.adsK > 0.5;
    const dd = longEye ? DRAW_DIST.scope : DRAW_DIST.near;
    if (camera.far !== dd) camera.far = dd;
    if (scene.fog) { const b = scene.fog.rrBase ||= [scene.fog.near, scene.fog.far]; const ff = Math.min(b[1], dd * 0.96); scene.fog.far = ff; scene.fog.near = Math.min(b[0], ff * 0.55); } // rrBase: a nevoa original do mapa
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-14 * realDt));
    camera.updateProjectionMatrix();
    // escala de FOV (04/11, pedido dele): 1x = como sempre; acima disso a arma fica mais longe do olho, parada e mirando (o mundo nao muda)
    vm.fovK = settings.fovScale || 1;
    vm.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(vm.fovK * Math.tan(THREE.MathUtils.degToRad((settings.vmFov - p.adsK * 12) / 2)))); vm.camera.updateProjectionMatrix();
    G.shakeAmt *= Math.exp(-7 * realDt);
    const sh = G.shakeAmt;
    if (p.alive) {
      // balanco de cabeca curto e so na vertical (o grosso do balanco e' da arma, como no COD)
      const bob = p.onGround && Math.hypot(p.vel[0], p.vel[2]) > 2 ? Math.abs(Math.sin(p.stepPhase)) * (p.sprint ? 0.03 : 0.016) * (1 - p.adsK) : 0;
      camera.position.set(p.pos[0], p.pos[1] + p.eye - bob, p.pos[2]);
      // inclinar: a cabeca sai de lado ate 0,5 m (menos se tiver parede ali) e a camera tomba junto
      if (Math.abs(p.lean || 0) > 0.01) {
        const s = Math.sign(p.lean), rx = Math.cos(p.yaw) * s, rz = -Math.sin(p.yaw) * s;
        const room = raycast(G.M, camera.position.toArray(), [rx, 0, rz], 0.8).dist;
        const off = Math.min(Math.abs(p.lean) * 0.5, Math.max(0, room - 0.25));
        camera.position.x += rx * off; camera.position.z += rz * off;
      }
      G.kickP = (G.kickP || 0) * Math.exp(-11 * realDt); G.kickR = (G.kickR || 0) * Math.exp(-9 * realDt);
      camera.rotation.set(p.pitch + G.kickP + (Math.random() - 0.5) * sh * 0.05, p.yaw + (Math.random() - 0.5) * sh * 0.05, p.roll + G.kickR - (p.lean || 0) * 0.16);
    } else if ((G.mode === 'bomb' || G.mode === 'br') && !G.bounceBack) { // bate-volta voltando do ceu: tela de morte normal com a contagem
      // fora da rodada: assiste um colega em primeira pessoa ou o mapa de cima (battle royale: qualquer um vivo)
      const list = [...G.remotes.values()].filter(r => r.alive && (G.mode === 'br' || !G.isEnemy(r)));
      const S = G.spec || (G.spec = { i: 0, map: false });
      // segue a pessoa pelo id: pela posicao na lista, a camera pulava de gente sempre que alguem morria ou
      // entrava/saia do ringue (ficava "flicando", 01/11). So troca no Proximo ou quando ela sai de cena.
      list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      let at = list.findIndex(o => o.id === S.id);
      if (inp.firePressed || inp.jumpPressed || S.i !== S.iSeen) { at = at < 0 ? 0 : (at + 1) % list.length; S.iSeen = S.i; }
      if (at < 0 && list.length) at = 0;
      const r = list.length ? list[at] : null;
      S.id = r?.id ?? null;
      if (inp.mapPressed || inp.wheel) S.map = !S.map;
      for (const o of G.remotes.values()) o.char.root.visible = true;
      if (G.ringWait && G.M.ring) {
        // esperando o ringue: camera de plateia olhando a lona
        const R = G.M.ring.c;
        camera.position.lerp(tmpV.set(R[0] + 11, R[1] + 6, R[2] + 11), 1 - Math.exp(-3 * realDt));
        camera.lookAt(R[0], R[1] + 1, R[2]);
      } else if (r && !S.map) {
        r.char.root.visible = false;
        camera.position.set(r.pos[0], r.pos[1] + 1.55, r.pos[2]);
        camera.rotation.set(r.pitch || 0, r.yaw, 0);
        // a arma de quem esta sendo assistido na primeira pessoa, com a luva do visual dele
        const sk = r.id + '|' + r.loKey;
        if (G.specVm !== sk) { G.specVm = sk; vm.setWeapon(r.wpn, G.mode === 'gungame' ? null : G.remoteLo.get(r.id)?.[r.wpn] || null, true); vm.setGloves(lookOf(r)); }
        G.specR = r;
      } else {
        const A = G.M.arena;
        camera.position.lerp(tmpV.set(0, A * 1.35, A * 0.75), 1 - Math.exp(-3 * realDt));
        camera.lookAt(0, 0, 0);
      }
      $('deadBy').textContent = r && !S.map ? t('specWatching', { n: r.name }) : t('specMap');
      $('deadT').textContent = G.mode === 'br' ? t(G.ringWait ? 'ring_waitSub' : 'br_placeSub') : t('bombOutRound');
      $('deadGo').hidden = true;
    } else if (G.deathPos) {
      const kp = G.killer && posOf(G.killer);
      const look = kp ? tmpV.set(kp[0], kp[1] + 1, kp[2]) : tmpV.set(G.deathPos[0], G.deathPos[1], G.deathPos[2]);
      camera.position.lerp(new THREE.Vector3(G.deathPos[0], G.deathPos[1] + 5, G.deathPos[2] + 3), 1 - Math.exp(-2 * realDt));
      camera.lookAt(look);
      const me = G.me;
      const canGo = me && !me.alive && me.respawnT <= 0;
      $('deadT').textContent = me && me.respawnT > 0 ? t(G.bounceBack ? 'bounceIn' : 'backIn', { n: Math.ceil(me.respawnT) }) : canGo ? t('autoIn', { n: Math.max(1, Math.ceil(5 + me.respawnT)) }) : '';
      $('deadGo').hidden = !canGo; $('dead').classList.toggle('can', !!canGo);
      if (canGo && (inp.jumpPressed || inp.firePressed)) G.net?.send({ t: 'respawn' });
    }
    if (inp.pingPressed && (G.mode === 'br' || G.tutorial?.pingOn) && p.alive && G.state === 'game') makePing(p);
    const SR = !p.alive && G.specR && G.specR.alive && !G.spec?.map ? G.specR : null; G.specR = null;
    const RPV = replay.vmState(); // camera final em primeira pessoa: a arma de quem matou, no tempo da gravacao
    if (RPV) vm.update(RPV);
    else if (SR) { // espectador: a arma do outro anda e corre como a dele
      const sp = SR.speed || 0, run = SR.anim === 'sprint' || SR.anim === 'tac';
      vm.update({ dt: realDt, moving: sp > 1.5 && SR.anim !== 'jump', speed: sp, sprint: run, tac: SR.anim === 'tac', ads: 0, crouch: SR.anim === 'crouch', air: SR.anim === 'jump', pistolSprint: run && SR.wpn === 'pistol', lookDX: 0, lookDY: 0, firing: false });
    } else vm.update({ dt: realDt, moving: Math.hypot(p.vel[0], p.vel[2]) > 1.5 && p.onGround, speed: Math.hypot(p.vel[0], p.vel[2]), sprint: (p.sprint && !p.firing) || !!p.crated || G.mySeat?.seat === 0, /* caixote nas maos: arma abaixada (pose de corrida) */ tac: p.tac, ads: p.adsK, crouch: p.crouch, slide: p.slideT > 0, air: !p.onGround, pistolSprint: p.sprint && p.wpn === 'pistol', lookDX: settings.gunSway === false && !isTouch ? 0 : inp.lookX, lookDY: settings.gunSway === false && !isTouch ? 0 : inp.lookY, firing: p.firing, gadget: (p.gadgetPoseT || 0) > 0, reloadPaused: p.reloadT > 0 && (p.sprint || p.tac) && !G.skills?.includes('pique') });
    // RPV: a camera final usa a arma de quem matou (04/11, hotfix: sem isso a sua arma voltava pra mao dele no meio do replay)
    if (!SR && !RPV && G.specVm && p.alive) { G.specVm = null; vm.setWeapon(p.wpn, p.lo(p.wpn), true); vm.setGloves(wornLook()); } // voltou: a sua arma e a sua luva
    vmPass.enabled = (p.alive || !!SR) && !G.down && G.mySeat?.seat !== 0; // caido: sem arma na mao; dirigindo: maos no volante
    const inAir = p.alive && p.air && G.bounce;
    if (inAir !== G.chuteHud) { G.chuteHud = inAir; $('chuteHud').hidden = !inAir; }
    if (inAir) {
      const h = Math.max(0, Math.round(p.pos[1] - floorAt(G.M, p.pos[0], p.pos[2])));
      const k = (p.chute ? 'o' : 'f') + h;
      if (k !== G.chuteK) {
        G.chuteK = k;
        $('chuteAlt').textContent = h + ' m';
        $('chuteTxt').textContent = t(p.chute ? (isTouch ? 'chuteCutTouch' : 'chuteCutKey') : (isTouch ? 'chuteOpenTouch' : 'chuteOpenKey'));
        document.body.classList.toggle('chute-open', !!p.chute);
      }
    } else if (G.chuteK) { G.chuteK = ''; document.body.classList.remove('chute-open'); }
    // camera de cinema (so gravacao de video, definida pelo console/gravador): comanda a camera e tira a arma da mao
    if (G.cineCam) { G.cineCam(camera, realDt, G); vmPass.enabled = false; }
    if (G.intro) introCam(realDt, p, inp);
    // no carro (04/11, pedido dele): terceira pessoa, atras e acima do carro, olhando pra onde voce mira; o seu boneco
    // aparece sentado (corpo preso no banco, so braco e arma seguem a mira)
    const seatV = G.mySeat && p.alive && !G.intro && !replay.on && !G.cineCam ? G.carView?.seatOf(G.myId) : null;
    if (seatV) {
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), cp = Math.cos(p.pitch), base = [p.pos[0], p.pos[1] + 1.6, p.pos[2]];
      const want = [base[0] - fx * cp * 6.2, base[1] + 1.4 - Math.sin(p.pitch) * 4, base[2] - fz * cp * 6.2];
      const hit = raycast(G.M, base, [want[0] - base[0], want[1] - base[1], want[2] - base[2]].map((v, _, a) => v / Math.hypot(...a)), 7.5); // parede atras: camera encosta nela
      const dd = Math.min(1, Math.max(0.2, (hit.dist - 0.4) / Math.hypot(want[0] - base[0], want[1] - base[1], want[2] - base[2])));
      camera.position.set(base[0] + (want[0] - base[0]) * dd, base[1] + (want[1] - base[1]) * dd, base[2] + (want[2] - base[2]) * dd);
      camera.lookAt(base[0] + fx * cp * 8, base[1] + Math.sin(p.pitch) * 8, base[2] + fz * cp * 8);
      vmPass.enabled = false;
      let off = p.yaw - seatV.yaw; off = Math.atan2(Math.sin(off), Math.cos(off));
      introMeSync(realDt, p, true, { anim: seatV.i === 0 ? 'drive' : 'seat', yaw: seatV.yaw, steer: seatV.steer, aimOff: off });
    } else if (!G.intro && introMe?.root.visible) introMeSync(0, p, false);
    if (replay.on) { replay.camera(camera, realDt, G, vm); vmPass.enabled = replay.fpVm; }
    const ru = vm.gun?.userData.mat?.userData?.u?.uReact; if (ru) ru.value = G.reactStage || 0;
    // ponto do laser no mundo: onde o centro da mira bate
    if (g?.laser && !g.laser.light && p.alive && !p.sprint && !p.tac && !replay.on) { // lanterna nao faz ponto
      const d = camera.getWorldDirection(tmpV2), o = p.eyePos();
      const hit = p.traceTargets(o, d.toArray(), 120);
      laserDot.position.set(hit.point[0] - d.x * 0.04, hit.point[1] - d.y * 0.04, hit.point[2] - d.z * 0.04);
      laserDot.material.color.setHex(g.laser.color);
      const sc = 0.07 + hit.dist * 0.0035; laserDot.scale.set(sc, sc, 1);
      laserDot.visible = true;
    } else laserDot.visible = false;
    hud.frame(p, realDt, settings);
    { // anel de recarga em volta da mira
      const on = p.alive && p.reloadT > 0 && p.reloadDur > 0, rr = $('reloadRing');
      if (on !== rr.classList.contains('on')) rr.classList.toggle('on', on);
      if (on) $('rrBar').style.strokeDashoffset = (100 * p.reloadT / p.reloadDur).toFixed(1);
    }
    if (settings.xhair === 'dyn') { // mira dinamica: troca o formato quando muda a arma ou o jeito de atirar
      const mode = p.stats(p.wpn).st.mode || (WEAPONS[p.wpn]?.auto ? 'auto' : 'semi'), xk = p.wpn + mode;
      if (xk !== G.xhKey) { G.xhKey = xk; applyCrosshair($('cross'), settings, { wpn: p.wpn, mode }); }
    } else G.xhKey = null;
    hud.countIn(G.snap);
    hud.threat(G, settings.threatRing !== false && G.mode !== 'bomb'); // plantar a bomba: sem anel de passos e tiros (regra dele)
    hud.bomb(G);
    // bomba no chao ou plantada: aparece; plantada pisca e apita cada vez mais rapido
    const BS = G.snap?.bomb;
    bombMesh.visible = G.mode === 'bomb' && !!BS && (BS.state === 'dropped' || BS.state === 'planted');
    if (bombMesh.visible) {
      bombMesh.position.set(BS.pos[0], BS.pos[1] + 0.02, BS.pos[2]);
      const planted = BS.state === 'planted', period = planted ? Math.max(0.12, Math.min(1, (G.snap.time || 0) / 30)) : 1.2;
      bombBeep -= realDt;
      if (bombBeep <= 0) { bombBeep = period; if (planted) audio.play('ui_click', { pos: [BS.pos[0], BS.pos[1] + 0.3, BS.pos[2]], vol: 0.7, rate: 1.8, jitter: 0 }); }
      bombMesh.userData.light.visible = bombBeep > period * 0.5 || !planted;
    }
    if (G.snap) { hud.objectives(G.snap, camera, G.me); hud.radar(G, camera); hud.nadeWarn(G, camera); hud.streaks(G, G.snap); }
    hud.compass(G, camera);
    G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - realDt * 1.2);
    const low = p.alive ? Math.max(0, (40 - p.hp) / 40) * 0.5 : 0.4;
    film.uniforms.hurt.value = Math.min(1, G.hurtFlash + low);
    if (big && p.adsK > 0.3 && p.alive && !replay.on) {
      scopeOn = true;
      camera.updateMatrixWorld();
      scopeCam.position.copy(camera.position);
      scopeCam.quaternion.copy(camera.quaternion);
      scopeCam.fov = settings.fov / zoom;
      scopeCam.updateProjectionMatrix();
    }
  } else {
    menuT += realDt;
    const a = menuT * 0.06;
    camera.position.set(Math.sin(a) * 46, 14 + Math.sin(menuT * 0.2) * 3, Math.cos(a) * 46);
    camera.lookAt(0, 4, 0);
    camera.fov = 55; camera.updateProjectionMatrix();
    vmPass.enabled = false;
    film.uniforms.hurt.value = 0;
  }
  // luneta (05/11, pedido dele: o FPS caia ao abrir, 66 pra 49 medido): a imagem do vidro desenha o mapa inteiro de novo. Se o quadro passa de 17 ms, o
  // vidro desenha sem os contornos (metade das chamadas); passou de 18,5 ms, tambem atualiza um quadro sim, outro nao. A folga evita ficar trocando. Termica: mascara a cada 3
  G.frameAvg = (G.frameAvg ?? realDt) + (realDt - (G.frameAvg ?? realDt)) * 0.05;
  if (scopeOn) {
    G.scopeTick = (G.scopeTick || 0) + 1;
    if (settings.scopeQ === 'full') { G.scopeLite = false; G.scopeHalf = false; } else { // Ajustes > Luneta: qualidade cheia desliga a economia
    if (G.frameAvg > 0.017) G.scopeLite = true; else if (G.frameAvg < 0.0115) G.scopeLite = false;
    if (G.frameAvg > 0.0185) G.scopeHalf = true; else if (G.frameAvg < 0.0125) G.scopeHalf = false; }
    if (!G.scopeHalf || G.scopeTick % 2 === 0 || !G.scopeDrawn) {
      if (G.scopeLite) outlinesOn(false);
      renderer.setRenderTarget(scopeRT);
      renderer.render(scene, scopeCam);
      if (vm.sight()?.kind === 'thermal' && (G.scopeTick % 3 === 0 || !G.scopeDrawn)) thermalMask();
      renderer.setRenderTarget(null);
      if (G.scopeLite) outlinesOn(true);
      G.scopeDrawn = true;
    }
  } else G.scopeDrawn = false;
  const lensU = vm.gun?.userData?.scope?.lens?.material?.uniforms;
  if (lensU?.uStep) lensU.uStep.value = G.player?.zoomStep ? 1 : 0;
  const fwd = camera.getWorldDirection(tmpV.clone());
  audio.setListener(camera.position, fwd, new THREE.Vector3(0, 1, 0));
  if (podium.on) { // palco no proprio mapa: so os 3 aparecem, a arma e os outros bonecos saem de cena
    podium.frame(realDt, camera); podPad(); vmPass.enabled = false;
    for (const r of G.remotes.values()) r.char.root.visible = false;
    for (const m of G.blimpMeshes) m.visible = false; if (G.strikes) G.strikes.root.visible = false;
    for (const g of G.gunDrops.values()) g.visible = false; for (const k of objectives?.pickups || []) k.g.visible = false; // arma no chao nao atravessa o tambor
    if (G.heistView?.root) G.heistView.root.visible = true;
  }
  // com a luneta aberta a cena ja atualizou as matrizes neste quadro: nao percorre tudo de novo
  if (scopeOn && G.scopeDrawn) scene.matrixWorldAutoUpdate = false;
  composer.render(realDt);
  scene.matrixWorldAutoUpdate = true;
  G.clipRec?.draw(); // clipe gravando: copia o quadro na hora (o canvas do jogo nao guarda o desenho)
  if (lineup.chars.some(c => c.root.visible)) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(lineupScene, camera); renderer.autoClear = true; }
}

$('deadGo').onclick = () => G.net?.send({ t: 'respawn' });
hud.onStreakTap = (id) => { G.streakKind = id; input.edges.add('STREAK'); }; // celular: tocou num selo pronto
$('pauseTeam').onclick = () => { audio.play('ui_click', { ui: true }); G.net?.send({ t: 'team' }); setPaused(false); };
$('endLobby').onclick = () => { audio.play('ui_click', { ui: true }); $('theend').hidden = true; }; // o placar abre em cima do lobby
$('specNext').onclick = (e) => { e.stopPropagation(); if (G.spec) G.spec.i++; G.spec && (G.spec.map = false); };
$('specMap').onclick = (e) => { e.stopPropagation(); if (G.spec) G.spec.map = !G.spec.map; };
// toque em qualquer lugar da tela de morte tambem renasce
$('dead').addEventListener('pointerdown', (e) => {
  if (G.mode === 'bomb' && G.spec) { G.spec.i++; G.spec.map = false; return; } // espectador: toque troca de colega
  if (!$('deadGo').hidden) { e.preventDefault(); G.net?.send({ t: 'respawn' }); }
});

// ---------- editor do HUD de toque ----------
let heLayout = null;
function openHudEditor() {
  heLayout = JSON.parse(JSON.stringify(settings.hudLayout || {}));
  heLayout.pos = heLayout.pos || {};
  $('pause').hidden = true; $('hudEdit').hidden = false;
  document.body.classList.add('hudedit');
  $('heScale').value = heLayout.scale || 1; $('heAlpha').value = heLayout.alpha ?? 1;
  applyHudLayout($('touch'), { hudLayout: heLayout });
}
function closeHudEditor(save) {
  if (save) { settings.hudLayout = heLayout; saveSettings(); }
  applyHudLayout($('touch'), settings);
  if (!save) buildTouch(input, $('touch')); // descarta posicoes arrastadas
  $('hudEdit').hidden = true; document.body.classList.remove('hudedit');
  $('pause').hidden = false;
}
$('pauseHud').onclick = openHudEditor;
$('heSave').onclick = () => { audio.play('pickup', { ui: true, vol: 0.5 }); closeHudEditor(true); };
$('heReset').onclick = () => { heLayout = { pos: {} }; settings.hudLayout = null; buildTouch(input, $('touch')); $('heScale').value = 1; $('heAlpha').value = 1; };
$('heScale').oninput = (e) => { heLayout.scale = +e.target.value; applyHudLayout($('touch'), { hudLayout: heLayout }); };
$('heAlpha').oninput = (e) => { heLayout.alpha = +e.target.value; applyHudLayout($('touch'), { hudLayout: heLayout }); };
// arrastar: so no modo de edicao (captura antes do botao reagir)
$('touch').addEventListener('pointerdown', (e) => {
  if (!document.body.classList.contains('hudedit')) return;
  const elx = e.target.closest('[data-hid]');
  if (!elx) return;
  e.preventDefault(); e.stopPropagation();
  const move = (ev) => {
    const x = Math.max(4, Math.min(96, ev.clientX / innerWidth * 100)), y = Math.max(6, Math.min(94, ev.clientY / innerHeight * 100));
    heLayout.pos[elx.dataset.hid] = [+x.toFixed(1), +y.toFixed(1)];
    applyHudLayout($('touch'), { hudLayout: heLayout });
  };
  move(e);
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}, true);

// ---------- instalar como app (Android: abre em tela cheia, sem barra do navegador) ----------
// fora da Rovex (site solto), a faixa discreta chamando pra plataforma
$('rovexStrip').hidden = inRovex;
// faixa do Elite Rovex: quem ja e Elite ve o beneficio ativo (o texto troca de chave e segue o idioma)
if (rovexMe?.elite) {
  $('elitePromo').classList.add('on');
  for (const [id, k] of [['epSub', 'epOn'], ['epChip', 'epChipOn']]) { $(id).dataset.i18n = k; $(id).textContent = t(k); }
}
// guest (site proprio sem conta): banner fixo no lugar do Elite, leva pro login/cadastro da Rovex
if (rovexGuest()) {
  $('guestPromo').hidden = false; $('guestPromo').href = AUTH_URL; $('gpName').textContent = rovexGuestName();
  $('elitePromo').hidden = true;
}
// dentro da Rovex (iframe) nao tem "instalar app": o service worker so existe no jogo solto
if ('serviceWorker' in navigator && !inRovex) navigator.serviceWorker.register('./sw.js').catch(() => {});
// instalar: o botao fica sempre no menu (some so com o app ja instalado). Com o atalho do Chrome
// instala direto; sem ele (iPhone, Chrome que ainda nao ofereceu, dentro da Rovex) abre o guia.
let installEvt = null;
const installed = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const syncInstall = () => { $('installApp').hidden = installed(); };
syncInstall();
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('gateInstall').hidden = false; syncInstall(); });
addEventListener('appinstalled', () => { installEvt = null; $('installApp').hidden = true; $('gateInstall').hidden = true; });
$('gateInstall').onclick = () => $('installApp').click();
$('installApp').onclick = async () => {
  audio.play('ui_click', { ui: true });
  if (installEvt && !inRovex) {
    installEvt.prompt();
    const r = await installEvt.userChoice.catch(() => null);
    installEvt = null;
    if (r?.outcome === 'accepted') $('installApp').hidden = true;
    return;
  }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const steps = inRovex ? 'igRovex' : ios ? 'igIos' : /Android/.test(ua) ? 'igAndroid' : 'igPc';
  $('igSteps').innerHTML = t(steps).map(s => `<li>${s}</li>`).join('');
  $('igOpen').hidden = !inRovex;
  $('installGuide').hidden = false;
};
$('igOk').onclick = () => { audio.play('ui_back', { ui: true }); $('installGuide').hidden = true; };
$('installGuide').onclick = (e) => { if (e.target === $('installGuide')) $('installGuide').hidden = true; };

// tela cheia: no menu inicial e na pausa. iPad usa o webkit; iPhone nao deixa pagina ir pra tela cheia (03/11): o
// botao abre o guia "Adicionar a Tela de Inicio" (aberto por la o jogo roda sem a barra do Safari)
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const iosNoFs = !fsOk && /iP(hone|od|ad)/.test(navigator.userAgent) && !navigator.standalone;
const syncFs = () => {
  const on = !!fsEl();
  $('fsMenu').hidden = !fsOk && !iosNoFs; $('pauseFs').hidden = !fsOk && !iosNoFs;
  $('fsMenu').classList.toggle('on', on);
  $('fsMenu').setAttribute('aria-label', t(on ? 'fsOff' : 'fsOn'));
  $('pauseFs').textContent = t(on ? 'fsOff' : 'fsOn');
};
const toggleFs = async () => {
  audio.play('ui_click', { ui: true });
  if (iosNoFs) { $('installGuide').hidden = false; return; }
  try {
    const de = document.documentElement;
    if (fsEl()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { await (de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : de.webkitRequestFullscreen?.()); if (G.state === 'game' && isTouch) await screen.orientation?.lock?.('landscape').catch(() => {}); }
  } catch { /* navegador recusou */ }
};
$('fsMenu').onclick = toggleFs;
$('pauseFs').onclick = toggleFs;
document.addEventListener('fullscreenchange', syncFs);
document.addEventListener('webkitfullscreenchange', syncFs); // iPad
syncFs();

// ---------- partida ----------
const BOOT_T = performance.now();
(async () => {
  setLang(getLang());
  ui.markNewChallenges?.(); // a traducao reescreve o texto do botao e levava o selo de "novo" junto
  applySettings();
  const B = window.__rrBoot;
  B?.set(0.6);
  await Promise.race([loadArsenal(), new Promise(r => setTimeout(r, 6000))]);
  await document.fonts.ready.catch(() => {});
  // celular: o pavio chega na bomba e a tela de entrada espera o toque em Jogar (o toque ja pediu tela cheia
  // e deitado); so ai sai e a abertura de sempre continua
  if (B && $('boot')) {
    B.set(1); B.ready = true;
    $('boot').classList.add('ready'); $('bootState').textContent = B.T.ready;
    if (!B.tapped) await new Promise(r => { B.wait = r; });
    $('boot').classList.add('out'); setTimeout(() => $('boot')?.remove(), 400);
    audio.init();
  }
  fx = new FX(scene);
  G.fx = fx;
  G.strikes = new StrikeView(scene, fx); // Biplano, Trem, Balao Bombardeiro, Mao do Animador
  if (SS) {
    // tela dividida: sem abertura nem cartaz; entra direto na partida da pagina de cima
    $('splash')?.remove(); $('menu').classList.remove('intro'); $('menu').hidden = true;
    window.__ssWake = () => audio.init(); // a pagina de cima chama no primeiro clique/tecla (som precisa de gesto)
    // o quadro so comeca depois de conectar: o 'welcome' (na fila) monta o mapa antes do primeiro desenho
    startGame(new SplitNet(SS.slot), rovexMe?.name || settings.name || 'Jogador ' + (SS.slot + 1)).catch(e => console.warn('tela dividida', e)).finally(frame);
    return;
  }
  startAttract();
  irisEl.style.setProperty('--ir', '0vmax'); irisEl.dataset.r = 0;
  frame();
  // abertura: a logo da Rovex fica um instante sozinha, some, a iris abre o jogo e so ai o cartaz entra
  const minLogo = 1700 - (performance.now() - BOOT_T);
  if (minLogo > 0) await new Promise(r => setTimeout(r, minLogo));
  $('splash').classList.add('out');
  await new Promise(r => setTimeout(r, 380));
  $('splash').remove();
  await iris(150, 1200);
  $('menu').classList.remove('intro');
  funil('carregou');
  // primeira vez no jogo: tour do cartaz mostrando o que cada botao faz (convite direto pra sala pula)
  if (!homeTourSeen() && !inviteRoom) setTimeout(() => { if (G.state === 'menu' && ui.screen === 'home' && !$('menu').hidden) startHomeTour({ touch: isTouch }); }, 900);
  const wake = () => { audio.init(); audio.music(true, 'music'); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
})();

// fumaca e fogo das granadas novas (04/11): nuvem = sprites grandes cinza (tapam de verdade a visao); fogo = baforadas
let SMOKE_TEX = null;
function smokeTex() { if (SMOKE_TEX) return SMOKE_TEX; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(225,222,214,1)'); gr.addColorStop(0.6, 'rgba(205,202,194,.95)'); gr.addColorStop(1, 'rgba(200,197,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (SMOKE_TEX = new THREE.CanvasTexture(c)); }
// Fumaca (04/11, otimizada): era 26 sprites = 26 desenhos por nuvem. Agora 14 bolas numa malha instanciada (1 desenho), a
// geometria e uma so pra todas as nuvens e cada nuvem so tem o proprio material (uniform de opacidade). Teto de 4 nuvens.
const SMOKE_MAX = 4;
let SMOKE_GEO = null, SMOKE_MAT = null;
function smokeGeo() {
  if (SMOKE_GEO) return SMOKE_GEO;
  const g = new THREE.InstancedBufferGeometry(), N = 14, off = new Float32Array(N * 3), size = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
  for (let i = 0; i < N; i++) { const a = i * 2.4, r = 1 + (i % 5) * 0.85; off.set([Math.cos(a) * r, 0.9 + (i * 0.37 % 1) * 3, Math.sin(a) * r], i * 3); size[i] = 2.3 + (i * 0.61 % 1) * 1.3; }
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3)); g.setAttribute('aSize', new THREE.InstancedBufferAttribute(size, 1));
  g.instanceCount = N; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 9);
  return (SMOKE_GEO = g);
}
function smokeCloud(pos, dur) {
  const list = G.smokeFx || []; if (list.length >= SMOKE_MAX) list[0].t = Math.max(list[0].t, list[0].dur - 1.5); // a mais velha comeca a sumir
  SMOKE_MAT ||= new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { tMap: { value: smokeTex() }, uOp: { value: 0 } },
    vertexShader: 'attribute vec3 aOff; attribute float aSize; varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; vec4 mv = modelViewMatrix * vec4(aOff, 1.0); mv.xy += position.xy * aSize; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D tMap; uniform float uOp; varying vec2 vUv; void main() { vec4 c = texture2D(tMap, vUv); gl_FragColor = vec4(c.rgb, c.a * uOp); \n#include <colorspace_fragment>\n }',
  });
  const mat = SMOKE_MAT.clone(); mat.uniforms.tMap.value = smokeTex();
  const grp = new THREE.Mesh(smokeGeo(), mat); grp.position.set(pos[0], pos[1], pos[2]); grp.rotation.y = Math.random() * 6.28; scene.add(grp);
  return { grp, mat, t: 0, dur };
}
function tickNadeFx(dt) {
  for (const s of G.smokeFx || []) { s.t += dt; s.mat.uniforms.uOp.value = Math.min(0.95, s.t * 1.5) * Math.min(1, (s.dur - s.t) / 2); s.grp.rotation.y += dt * 0.05; if (s.t >= s.dur) { scene.remove(s.grp); s.mat.dispose(); } }
  if (G.smokeFx) G.smokeFx = G.smokeFx.filter(s => s.t < s.dur);
  for (const f of G.fires || []) { f.t -= dt; f.acc += dt; if (f.acc > 0.12) { f.acc = 0; const a = Math.random() * 6.28, r = Math.random() * 3.6; fx.puff([f.pos[0] + Math.cos(a) * r, (f.pos[1] || 0) + 0.3, f.pos[2] + Math.sin(a) * r], 2, 0.7, Math.random() < 0.5 ? 0xf08a2a : 0xffc24a, 0.5); } }
  if (G.fires) G.fires = G.fires.filter(f => f.t > 0);
}
