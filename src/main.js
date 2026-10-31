import * as THREE from 'three';
import { buildWorld, buildObjectives, FX, LASER_BODY } from './world.js';
import { EscortView } from './escortview.js';
import { rankResult, TIERS, myTier, tierOf, badgeSvg } from './rank.js';
import { Character } from './character.js';
import { ViewModel } from './viewmodel.js';
import { makePipeline } from './post.js';
import { Tutorial } from './tutorial.js';
import { Player } from './player.js';
import { metaGet, metaPost, pushSoon, me as rovexMe, inRovex, inviteRoom, isGuest as rovexGuest, guestName as rovexGuestName, AUTH_URL } from './rovex.js';
import { Hud } from './hud.js';
import { Input, isTouch, buildTouch, applyHudLayout, setFireButton, lockPointer } from './input.js';
import { Pad } from './gamepad.js';
import { LocalNet, WsNet } from './net.js';
import { audio } from './audio.js';
import { MODES, WEAPONS, STREAKS, GUN_LADDER, wpnOfBody, PRIMARIES, BLUEPRINTS, SKILLS, SKILL_SLOTS, FIELD, BR, AMMO, NADES } from '../shared/weapons.js';
import { nadeLaunch, nadeStep } from '../shared/core.js';
import { EV, currentEvent, META, metaWeek } from '../shared/events.js';
import { wantedPoster, shareFile, ClipRec } from './share.js';
import { updateCamoFx } from './camofx.js';
import { getMap, hasLOS } from '../shared/map.js';
import { loadArsenal, getLoadouts, scopeTarget } from './arsenal.js';
import { initMenus, applyCrosshair } from './ui.js';
import { t, wName, setLang, getLang } from './i18n.js';
import { ink, PAL } from './toon.js';
import { addXp, XP, onProgress, progressInfo, partReq, partUnlocked, camoUnlocked, level, levelXp, unlockLevel, setBodyResolver, grantMeta, statAdd, statMax } from './progress.js';
import { Lobby, runLoading, hideLoading } from './lobby.js';
import { track, grantTutorial } from './challenges.js';
import { camoTime, CAMOS } from './camos.js';
import { BrView } from './brview.js';
import { tip } from './tips.js';
import { wornLook } from './lookstore.js';
import { botLook } from '../shared/looks.js';
import { floorAt } from '../shared/nav.js';
import { shootPanels, stripHtml } from './killcam.js';
import { Replay } from './replay.js';
import { startHomeTour, homeTourSeen } from './hometour.js';
import { FieldView } from './fieldview.js';
import { SKILL_ICONS } from './skillicons.js';
import { CATEGORY, LASERS, partName, unlockedLoadout, buildGun, buildPartPreview, bpLoadout } from './arsenal.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- ajustes ----------
const DEFAULTS = { v: 3, primary: 'smg', fov: 90, sens: 1, adsSens: 0.8, vmFov: 58, invertY: false, master: 0.8, music: 0.45, sfx: 1, grain: 0.6, film: 'color', res: isTouch ? 0.7 : 1, showFps: false, holdCrouch: false, tracer: 'chalk', autoSprint: false, name: '', aimAssist: true, autoFire: true, xhair: 'cross', xhairColor: '#ece9e1', threatRing: true, skills: [], field: 'umbrella', autoChute: isTouch, draw: isTouch ? 'mid' : 'far' }; // field: guarda-chuva por padrao (sem escolha o selo nem aparecia); nivel 2 ainda vale
let settings = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem('rr_settings') || '{}');
  // versao 3: o filtro brutal saiu; quem estava nele volta pra pelicula colorida
  if (saved.film === 'brutal') saved.film = 'color';
  // 30/10: skills que sairam do jogo (Cuca Dura, Pe de Pano) somem do save
  if (Array.isArray(saved.skills)) saved.skills = saved.skills.filter(k => SKILLS[k]);
  Object.assign(settings, saved, { v: 3 });
} catch { /* sem storage */ }
function saveSettings() { try { localStorage.setItem('rr_settings', JSON.stringify(settings)); } catch { /* */ } applySettings(); }

// ---------- render ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
// distancia de desenho (Ajustes > Graficos): curta/media/longa, em metros
const DRAW_DIST = { near: 95, mid: 170, far: 500 };
const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
// luneta 3D: a lente mostra esta camera ampliada (picture-in-picture)
const scopeRT = new THREE.WebGLRenderTarget(isTouch ? 384 : 640, isTouch ? 384 : 640);
scopeRT.texture.colorSpace = THREE.SRGBColorSpace;
scopeTarget.texture = scopeRT.texture;
const scopeCam = new THREE.PerspectiveCamera(20, 1, 0.05, 500);
const vm = new ViewModel();
const lobby = new Lobby({ onReady: (v) => G.net && G.net.send({ t: 'ready', v }), onStart: () => G.net && G.net.send({ t: 'start' }), onTeam: (team) => G.net && G.net.send({ t: 'team', team }), onCfg: (cfg) => { try { localStorage.setItem('rr_lastcfg', JSON.stringify(cfg)); } catch { /* */ } G.net && G.net.send({ t: 'cfg', ...cfg }); }, onLeave: () => quitGame() });
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * settings.res);
  resize();
  film.uniforms.grain.value = settings.grain;
  film.uniforms.mode.value = settings.film === 'bw' ? 0 : settings.film === 'full' ? 2 : 1;
  audio.setVolumes({ master: settings.master, music: settings.music, sfx: settings.sfx });
  input.settings = settings;
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
{ let x0 = null; addEventListener('pointerdown', e => { if (ui?.screen === 'look' && e.target === canvas) x0 = e.clientX; }); addEventListener('pointermove', e => { if (x0 !== null) { lookDrag += (e.clientX - x0) * 0.01; x0 = e.clientX; } }); addEventListener('pointerup', () => { x0 = null; }); }

// cena do gunsmith: arma girando num fundo de papel, cores de verdade
const smithScene = new THREE.Scene();
smithScene.background = new THREE.Color(0xdcd7cb);
smithScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
const sl = new THREE.DirectionalLight(0xffffff, 2.2); sl.position.set(2, 3, 2); smithScene.add(sl);
const smithCam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const smithHolder = new THREE.Group(); smithScene.add(smithHolder);
// cena do visual: o proprio boneco girando, mesma luz da vitrine
const lookScene = new THREE.Scene();
lookScene.background = new THREE.Color(0xdcd7cb);
lookScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
{ const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(2, 3, 3); lookScene.add(l); }
const lookCam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
let lookChar = null, lookTeamCur = null, lookDrag = 0;
function setLookPreview(look, team) {
  if (!lookChar || lookTeamCur !== team) {
    if (lookChar) lookScene.remove(lookChar.root);
    lookChar = new Character(team, '', look); lookChar.tag.visible = false; lookChar.shadow.visible = true;
    // com a arma principal na mao (a pose dos bracos e' de quem segura arma; sem ela a mao entrava no corpo)
    const prim = PRIMARIES.includes(settings.primary) ? settings.primary : 'smg';
    try { lookChar.setWeapon(prim, G.loadouts?.[prim] || null); } catch { /* arsenal ainda carregando: fica sem */ }
    lookTeamCur = team; lookScene.add(lookChar.root);
  } else lookChar.setLook(look);
}

const input = new Input(canvas);
const pad = new Pad(input);
const hud = new Hud();
let world, objectives, fx, brView = null, fieldView = null;

// ---------- estado do jogo ----------
const G = {
  settings, vm, camera, hud, input, loadouts: getLoadouts(), remotes: new Map(),
  net: null, player: null, myId: null, myTeam: null, snap: null, mode: 'ffa', M: getMap('vila'),
  state: 'menu', // menu | game
  paused: false, shakeAmt: 0, deathPos: null, killer: null, t: 0, timeScale: 1, slowT: 0,
  seen: new Map(), // id -> ate quando aparece no radar (atirou)
  nadeMeshes: new Map(), blimpMeshes: [], remoteLo: new Map(), remoteTracer: new Map(), remoteLook: new Map(), remoteBp: new Map(), pings: new Map(), brDrops: [], ladder: GUN_LADDER, flashT: 0,
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
const xpMult = () => (rovexMe?.elite ? 2 : 1) * (weekend() ? 2 : 1) * (onlyBots() ? BOTS_ONLY_XP : 1);
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

function chEvent(e) {
  if (G.state !== 'game' || G.tutorial) return; // treino nao conta desafio
  for (const c of track(e)) {
    // elite rastreado: cada avanco aparece na tela (sem XP ainda)
    if (c.kind === 'eliteProg') { hud.eliteTrack(t('el_' + c.id, { n: c.n }), c.prog, c.n); continue; }
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
    const camos = CAMOS.filter(c => c.req && !c.legend && !c.elite && !c.prestige && !camoUnlocked(b.wpn || 'smg', c));
    const c = camos[Math.floor(Math.random() * camos.length)];
    return { wpn: b.wpn || null, body: b.body || null, camo: c ? c.id : null };
  });
  return [r.body && `${partName('body', r.body)}`, r.camo && `${t('slot_camo')}: ${t('camo_' + r.camo)}`].filter(Boolean);
}

function gainXp(kind, wpn = null, mult = 1) {
  if (G.state !== 'game' || G.tutorial) return; // treino nao da XP
  const amount = Math.round((XP[kind] || 0) * mult * xpMult());
  if (!amount) return;
  if (onlyBots() && !G.botXpWarned) { G.botXpWarned = true; hud.message(t('botsOnlyXp', { n: Math.round(BOTS_ONLY_XP * 100) }), 3); }
  G.matchXp = (G.matchXp || 0) + amount;
  logXp(kind, amount);
  addXp(kind, amount, WEAPONS[wpn] ? wpn : null);
  hud.xpPop(`+${amount} ${t('xp_' + kind)}`);
}
// o que abre exatamente neste nivel (pra avisar na hora)
// o que abriu nesse nivel: [{ slot, id, wpn, name }] (camo de nivel de jogador vale pra arma em uso)
// only: 'body' = so corpos novos (nivel da categoria), 'parts' = pecas e camos (nivel do corpo equipado)
function unlocksAt(wpn, wLevel, pLevel, only = null) {
  const out = [];
  const C = wpn && CATEGORY[wpn];
  if (C && wLevel) {
    const all = { body: C.bodies, scope: [null, ...C.scopes], charger: C.chargers, handle: [null, ...C.handles], laser: [null, ...LASERS] };
    const lists = only === 'body' ? { body: all.body } : only === 'parts' ? (({ body, ...rest }) => rest)(all) : all;
    for (const [slot, list] of Object.entries(lists)) list.forEach((id, i) => { if (id && i > 0 && partReq(i) === wLevel) out.push({ slot, id, wpn, name: partName(slot, id) }); });
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
    shotR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); shotR.setSize(260, 130);
    shotScene = new THREE.Scene();
    shotScene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2)); const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 3, 2); shotScene.add(dl);
    shotCam = new THREE.OrthographicCamera(-1, 1, 0.5, -0.5, 0.01, 10); shotCam.position.set(3, 0.6, 0); shotCam.lookAt(0, 0, 0);
  }
  let lo = { ...(G.loadouts[u.wpn] || {}) };
  if (u.slot === 'bp') lo = bpLoadout(u.id);
  else if (u.slot === 'body') { lo.body = u.id; lo.charger = null; } else lo[u.slot] = u.id;
  // mira, pente e empunhadura: a foto e' so da peca nova, sozinha (nao montada na arma)
  const gun = (u.slot === 'scope' || u.slot === 'charger' || u.slot === 'handle') && buildPartPreview(u.id, lo) || buildGun(u.wpn, lo);
  const lz = gun.userData.laser; if (lz) lz.beam.removeFromParent();
  const fxr = gun.userData.camoFx?.root; if (fxr) fxr.removeFromParent(); // a foto e da arma, sem o efeito
  const box = new THREE.Box3().setFromObject(gun), c = box.getCenter(new THREE.Vector3());
  gun.position.sub(c); shotScene.add(gun);
  const solo = !gun.userData.muzzle; // peca sozinha: mais respiro em volta
  const k = Math.max(box.max.z - box.min.z, (box.max.y - box.min.y) * 2) * (solo ? 0.8 : 0.56);
  Object.assign(shotCam, { left: -k, right: k, top: k / 2, bottom: -k / 2 }); shotCam.updateProjectionMatrix();
  shotR.render(shotScene, shotCam); shotScene.remove(gun);
  return shotR.domElement.toDataURL();
}
onProgress((e) => {
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
  const shots = got.map(u => unlockShot(u));
  got.forEach((u, i) => logUnlock(t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), u.name, shots[i]));
  got.slice(0, 3).forEach((u, i) => hud.unlockBanner({ kind: t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), name: u.name, img: shots[i], more: i === 2 && got.length > 3 ? got.length - 3 : 0 }));
  if (got.length) audio.play('unlock', { vol: 0.8, ui: true, jitter: 0 });
});
window.__G = G; window.__R = renderer; window.__S = scene; window.__I = input; window.__C = camera; window.__VM = vm; // atalhos de depuracao
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
  if (up) { $('erUp').textContent = t('rkUp', { t: t('rk_' + up.id) }) + ' ' + t('rkUpSub', { r: up.reward.slot === 'camo' ? t('camo_' + up.reward.id) : up.reward.tab === 'hat' ? t('lk_hat_' + up.reward.id) : t('lkt_' + up.reward.tab) + ' ' + t('rk_' + up.id) }); setTimeout(() => audio.play('levelup', { ui: true, vol: 0.8 }), 1400); }
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
  // seu papel: vermelho ataca (empurra), azul defende (encosta pra parar)
  const role = G.myTeam === 'red' ? t('es_atk') : G.myTeam === 'blue' ? t('es_def') : '';
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
G.tracerOf = (id) => id === G.myId ? settings.tracer : G.remoteTracer.get(id) || 'chalk';

function lookOf(p) { return G.remoteLook.get(p.id) || (p.bot ? botLook(p.id) : null); }

function remoteFor(p) {
  let r = G.remotes.get(p.id);
  if (!r) {
    r = { id: p.id, char: new Character(p.team, p.name, lookOf(p)), pos: [...p.pos], target: [...p.pos], vel: [0, 0, 0], yaw: p.yaw, alive: p.alive, team: p.team, name: p.name, anim: p.anim, wpn: p.wpn, pitch: 0, speed: 0 };
    scene.add(r.char.root);
    G.remotes.set(p.id, r);
  }
  return r;
}

function onSnap(s) {
  G.snap = s;
  if (s.mut !== G.mutSeen) { G.mutSeen = s.mut; if (s.mut && G.state === 'game') { hud.message(t('evOn', { e: t('ev_' + s.mut) }), 3.5); audio.play('ringbell', { vol: 0.6, ui: true }); } } // evento de fim de semana: anuncia na entrada
  G.mode = s.mode; G.duo = !!s.duo; G.bounce = !!s.bounce; G.bOpen = !!s.bOpen;
  if (s.map && s.map !== G.M.id) setMap(s.map);
  const seen = new Set();
  for (const p of s.players) {
    if (p.id === G.myId) {
      G.me = p;
      if (G.player) {
        G.player.hp = p.hp;
        hud.hp(p.hp);
        hud.armor(p.armor || 0, s.mode === 'br');
        document.body.classList.toggle('mode-br', s.mode === 'br');
        if (!p.alive && G.player.alive) G.player.alive = false;
        G.myTeam = p.team;
        // dupla: caido (rasteja, sem atirar) ate o parceiro encher a bomba
        const down = G.duo && p.alive && p.dn > 0;
        if (down !== !!G.down) { G.down = down; document.body.classList.toggle('is-down', down); if (!down) hud.down(null); }
        if (down) hud.down({ t: p.dn, rv: (p.rv || 0) / BR.duo.revive });
        if (p.nades) G.player.nades = { ...p.nades };
      }
      continue;
    }
    seen.add(p.id);
    const r = remoteFor(p);
    // trocou de time (infectado): o boneco e' refeito na cor nova
    if (p.team !== r.team) { scene.remove(r.char.root); r.char = new Character(p.team, p.name, lookOf(p)); scene.add(r.char.root); r.loKey = null; }
    if (!r.alive && p.alive) r.pos = [...p.pos];
    r.target = [...p.pos]; r.yaw = p.yaw; r.pitch = p.pitch; r.anim = p.anim; r.alive = p.alive; r.team = p.team;
    r.kills = p.kills; r.hp = p.hp; r.dn = p.dn || 0; r.rv = p.rv || 0;
    const rbp = G.mode === 'br' ? G.remoteBp.get(p.id)?.[p.wpn] : null;
    const lo = G.mode === 'gungame' ? { body: G.ladder[Math.min(p.gunLvl || 0, G.ladder.length - 1)].body } : rbp ? bpLoadout(rbp) : G.remoteLo.get(p.id)?.[p.wpn] || null;
    const loKey = p.wpn + JSON.stringify(lo);
    if (r.loKey !== loKey) { r.loKey = loKey; r.wpn = p.wpn; r.char.setWeapon(p.wpn, lo); }
  }
  for (const [id, r] of G.remotes) if (!seen.has(id)) { scene.remove(r.char.root); G.remotes.delete(id); }
  // granadas voando
  const alive = new Set();
  for (const n of s.nades || []) {
    alive.add(n.id);
    let m = G.nadeMeshes.get(n.id);
    if (!m) { m = fx.nadeMesh(n.kind); scene.add(m); G.nadeMeshes.set(n.id, m); m.position.fromArray(n.pos); }
    m.userData.to = n.pos;
  }
  for (const [id, m] of G.nadeMeshes) if (!alive.has(id)) { scene.remove(m); G.nadeMeshes.delete(id); }
  // dirigiveis
  const bl = s.blimps || [];
  // dirigivel nasce ja la no alto (antes nascia na origem e subia do chao)
  while (G.blimpMeshes.length < bl.length) { const b = bl[G.blimpMeshes.length], m = fx.blimpMesh(b.team); m.position.fromArray(b.pos); scene.add(m); G.blimpMeshes.push(m); }
  while (G.blimpMeshes.length > bl.length) scene.remove(G.blimpMeshes.pop());
  bl.forEach((b, i) => { Object.assign(G.blimpMeshes[i].userData, { to: b.pos, id: b.id, owner: b.owner, team: b.team, hp: b.hp }); });
  if (G.state === 'game') hud.score(s, G.me, s.players);
}

function nameOf(id) {
  if (id === G.myId) return t('youCap');
  const p = G.snap?.players.find(x => x.id === id);
  return p ? p.name : '?';
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
  G.tutorial?.onEvent(e);
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
        G.player.spawn(e);
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
      const rTr = lzBody ? 'laser' : G.remoteLo.get(e.id)?.[e.wpn]?.tracer || 'chalk', rSnd = lzBody ? 'laser' : rvBody ? 'revolver' : aaBody ? 'aa12' : e.wpn;
      audio.play(rSnd, { pos: e.o, vol: inGame ? 0.75 : 0.12, key: 'rgun' + e.id, max: 2 });
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
      if (inGame && !G.tutorial) { if (e.v === G.myId) statAdd('deaths'); if (e.a === G.myId && e.streak) statMax('bestStreak', e.streak); } // Perfil
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
      const wn = WEAPONS[e.wpn] ? wName(e.wpn) : t('w_' + e.wpn);
      const html = e.a ? `<span class="${teamCls(e.a)}">${esc(nameOf(e.a))}</span> ${e.head ? t('f_head') : t('f_kill')} <span class="${teamCls(e.v)}">${esc(nameOf(e.v))}</span> <small>(${esc(wn)})</small>` : `<span class="${teamCls(e.v)}">${esc(nameOf(e.v))}</span> ${t('f_self')}`;
      if (inGame) hud.feed(html, e.a === G.myId || e.v === G.myId);
      if (e.a === G.myId && inGame) {
        chEvent({ type: 'kill', wpn: e.wpn, head: !!e.head, streak: e.streak || 0 });
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
        if (kr?.pos && inGame) {
          const imgs = shootPanels(renderer, scene, { pos: kr.pos, yaw: kr.yaw || 0 }, G.deathPos);
          const wn = WEAPONS[e.wpn] ? wName(e.wpn) : t('w_' + e.wpn);
          cm.innerHTML = stripHtml(imgs, { killer: nameOf(e.a), wpn: wn, dist: Math.round(Math.hypot(kr.pos[0] - G.deathPos[0], kr.pos[2] - G.deathPos[2])), head: e.head, t });
          cm.hidden = false; cm.classList.remove('in'); void cm.offsetWidth; cm.classList.add('in');
          audio.play('comic', { ui: true, vol: 0.55 });
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
      if (e.id === G.myId && inGame) { hud.message(t('streakReady', { s: t('s_' + e.kind), k: t(pad.active ? 'how_pad' : isTouch ? 'how_touch' : 'how_kb') }), 2.4); audio.play('pickup', { vol: 0.7, ui: true, rate: 0.8 }); }
      break;
    case 'blimpDown': // dirigivel estourado a tiro: explode, some e a sala pode chamar outra sequencia
      if (!inGame) break;
      fx.explosion(e.pos); fx.explosion([e.pos[0] + 2, e.pos[1] - 1, e.pos[2] + 1]); fx.explosion([e.pos[0] - 2, e.pos[1] + 1, e.pos[2] - 2]);
      fx.word('KABUM!', e.pos, 3, 0.9);
      audio.play('explosion', { pos: e.pos, vol: 0.9, key: 'blimpx', max: 1 });
      hud.message(t('blimpDownMsg', { w: nameOf(e.id), o: nameOf(e.owner) }), 2.6);
      if (e.id === G.myId) gainXp('blimpDown');
      break;
    case 'streak':
      if (inGame) {
        const mine = e.id === G.myId, ally = (MODES[G.mode].teams || G.duo) && e.team === G.myTeam;
        if (mine) { gainXp('streak'); vm.callStreak(e.kind); chEvent({ type: 'streak', kind: e.kind }); }
        // Torta Atomica: aviso grande pra todo mundo, com o nome de quem pediu
        if (e.kind === 'nuke') hud.alert(t(mine ? 'nukeYou' : ally ? 'nukeAlly' : 'nukeEnemy', { n: nameOf(e.id) }), t(mine ? 'nukeYouSub' : ally ? 'nukeAllySub' : 'nukeEnemySub', { t: e.delay || 6 }), mine || ally ? 'blue' : 'red');
        else hud.message(t(mine || ally ? 'streakAlly' : 'streakEnemy', { s: t('s_' + e.kind), n: nameOf(e.id) }), 2.6);
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
      if (e.id !== G.myId) { G.remoteLo.set(e.id, e.los || {}); G.remoteTracer.set(e.id, e.tracer || 'chalk'); }
      break;
    // ---------- equipamento de campo ----------
    case 'field': {
      const pos = e.id === G.myId ? G.player?.pos : posOf(e.id);
      if (e.id === G.myId) { G.fieldK = 0; G.fieldUsedT = G.t; if (e.kind === 'umbrella') { G.shieldT = FIELD.umbrella.dur; vm.umbOn = true; } }
      if (inGame) audio.play(e.kind === 'anvil' ? 'anvilfall' : e.kind, { pos: e.kind === 'anvil' && e.at ? e.at : pos, vol: 0.75 });
      break;
    }
    case 'fieldFail': if (e.id === G.myId && inGame) { hud.message(t('fieldFail'), 1.6); audio.play('empty', { vol: 0.4 }); } break;
    case 'fieldReady': if (e.id === G.myId && inGame) { G.fieldK = 1; audio.play('fieldready', { ui: true, vol: 0.5 }); hud.message(t('fieldReady', { w: t('fd_' + G.field) }), 1.6); } break;
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
    case 'loot': G.brLoot = e.list; brView?.setLoot(e.list, G.loadouts); G.brCrates = e.list.filter(l => l[1] === 'crate').map(l => [l[3], l[5]]); break;
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
      if (mine) { tip('duo'); hud.alert(t('duo_downMe'), t('duo_downMeSub'), 'red'); audio.play('death', { ui: true, vol: 0.5, rate: 0.7 }); }
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
    case 'take': if (e.id === G.myId && G.player) G.player.take(e.wpn); break;
    case 'give':
      if (e.id === G.myId && G.player && e.refill) { G.player.give(e.wpn, false); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player && G.mode === 'infect') { G.player.forced = true; G.player.give(e.wpn, true, !!e.force); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player) {
        G.player.forced = G.mode === 'gungame';
        if (e.body) G.player.ggBody = e.body;
        if (G.mode === 'br') { // variante (caixote ou chao): troca o modelo e os bonus; comum tira a variante
          const had = G.player.brBp[e.wpn] || null;
          if (e.bp) G.player.brBp[e.wpn] = e.bp; else delete G.player.brBp[e.wpn];
          if (e.bp) { G.player.give(e.wpn, false); G.player.equip(e.wpn, true); hud.weapon(G.player); hud.message(t('brVariant', { n: t(e.bp) }), 2.6); audio.play('pickup', { vol: 0.6, ui: true }); break; } // ja na mao, com o modelo da variante
          if (had && G.player.wpn === e.wpn) G.player.equip(e.wpn, true); // trocou variante pela comum
        }
        G.player.give(e.wpn, true, !!e.force);
        hud.weapon(G.player);
        audio.play('pickup', { vol: 0.6, ui: true });
        hud.message(t(e.force ? 'newGun' : 'gotGun', { w: wName(e.wpn) }), 1.6);
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
    case 'escOt':
      if (inGame) { hud.message(t('es_ot'), 3); audio.play('ringbell', { vol: 0.6, ui: true }); }
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
    case 'msg':
      if (inGame) hud.feed(esc(e.key ? t(e.key, { n: e.name }) : e.text));
      break;
    case 'end':
      if (inGame) {
        G.slowT = 1.4;
        const iWon = e.winner === G.myTeam || e.winner === G.myName;
        if (iWon) { gainXp('win'); chEvent({ type: 'win' }); }
        // ta-da ou trombone triste, por cima da musica abaixada
        audio.duck(0.3, 2.2); setTimeout(() => audio.play(iWon ? 'win' : 'lose', { ui: true, vol: 0.6, jitter: 0, key: 'end', max: 1 }), 350);
        chEvent({ type: 'match' });
        gainXp('match');
        if (G.snap?.ranked && G.mode !== 'br') rankEnd(iWon);
        // repassa o abate final de cinema e so depois o placar
        setTimeout(() => { if (G.state !== 'game' || !replay.play(G, scene, fx, audio, wornLook(), () => { document.body.classList.remove('replay'); showEnd(e.winner); })) { showEnd(e.winner); return; } cineTag(); document.body.classList.add('replay'); }, 900);
      }
      break;
    case 'restart':
      $('theend').hidden = true;
      $('endXp')?.remove();
      if (G.state === 'game') backToLobby();
      break;
    case 'start':
      if (e.map) setMap(e.map);
      if (e.mode) { G.mode = e.mode; G.duo = !!e.duo; G.bounce = !!e.bounce; } // jogo rapido: a proxima vem em outro modo e mapa
      if (G.state === 'lobby') beginMatch(false);
      break;
    // todo mundo carregou: 3, 2, 1
    case 'countdown':
      G.countEnd = performance.now() + e.t * 1000;
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
  if (!G.tutorial) statAdd('plafts', G.plafts || 0); // Perfil
  G.plafts = 0;
  if (G.tutorial) { $('endMeta').hidden = true; return; }
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

function showEnd(winner) {
  const inf = G.mode === 'infect';
  const won = inf ? t(winner === 'red' ? 'inf_winInf' : 'inf_winSurv') : winner === 'red' ? t('winRed') : winner === 'blue' ? t('winBlue') : winner === 'empate' ? t('draw') : t('winName', { n: winner });
  $('endWin').textContent = won;
  const ps = [...(G.snap?.players || [])].sort((a, b) => b.score - a.score).slice(0, 8);
  $('endBoard').innerHTML = ps.map(p => `<div class="${p.id === G.myId ? 'me' : ''}"><span>${esc(p.name)}</span><span>${t('endKills', { n: p.kills })}</span></div>`).join('');
  // progresso: XP por tipo, nivel subindo na barra e tudo o que liberou
  const L = G.matchLog || newMatchLog();
  const total = Object.values(L.xp).reduce((a, b) => a + b, 0);
  $('endXpList').innerHTML = Object.entries(L.xp).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li><span>${esc(t('xp_' + k))}</span><span>+${v}</span></li>`).join('');
  $('endUnlTitle').textContent = t(L.unlocks.length ? 'endUnl' : 'endNothing');
  $('endUnl').innerHTML = L.unlocks.map(u => `<li>${u.img ? `<img alt="" src="${u.img}">` : ''}<small>${esc(u.kind)}</small><b>${esc(u.name)}</b></li>`).join('');
  G.matchXp = 0;
  if (document.body.classList.contains('game-smith')) { // acabou com o Arsenal aberto: fecha e vale o que montou
    document.body.classList.remove('game-smith'); $('menu').hidden = true; ui.go('home');
    G.loadouts = matchLoadouts(); sendLoadout();
  }
  $('theend').hidden = false;
  $('endClip').hidden = !window.MediaRecorder || !replay.clipKill(); // so com abate pra repassar
  // acabou: solta o mouse e para os controles (antes mexer o mouse ainda girava a camera e a roda nao rolava a tela)
  input.enabled = false; input.keys.clear(); input.mouse.fire = input.mouse.ads = false; input.touch.fire = false;
  if (document.pointerLockElement) document.exitPointerLock();
  setTouchBoard(false);
  animateEndXp(L.startXp, L.startXp + total, total);
  sendMeta();
  showRankEnd();
  audio.play('flag', { vol: 0.8, ui: true });
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
  else if (m.t === 'ev') onEvent(m);
  else if (m.t === 'welcome') {
    G.myId = m.id; G.myTeam = m.team; G.mode = m.mode; G.duo = !!m.duo; G.bounce = !!m.bounce;
    if (m.map) setMap(m.map);
    sendLoadout();
    // partida ja rolando: pula o lobby
    if (m.phase === 'play' && G.state === 'lobby') beginMatch(true);
  } else if (m.t === 'lobby') {
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

function sendLoadout() {
  if (!G.net) return;
  const los = {};
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'melee']) { const { saved, ...lo } = G.loadouts[w] || {}; los[w] = lo; } // a memoria por modelo nao vai pro servidor
  // skills passivas equipadas (so as que o nivel ja abriu); o jogador aplica as de mao, o servidor as de regra
  G.skills = (settings.skills || []).filter(s => SKILLS[s] && unlockLevel() >= SKILLS[s].lvl).slice(0, SKILL_SLOTS);
  // equipamento de campo (um so; o nivel tem que ter liberado). O botao de toque mostra o icone dele.
  G.field = G.tutorial?.fieldOverride || (FIELD[settings.field] && unlockLevel() >= FIELD[settings.field].lvl ? settings.field : null); // treino: a Mola emprestada vale
  setFieldHud(G.field);
  G.net.send({ t: 'loadout', primary: settings.primary, los, lvl: unlockLevel(), prest: progressInfo().prestige, tracer: settings.tracer, elite: !!rovexMe?.elite, rk: myTier(), skills: G.skills, field: G.field });
  if (G.tutorial?.fieldOverride) { const me = G.net.core?.players.get(G.myId); if (me) me.field = G.tutorial.fieldOverride; } // o servidor local checa o nivel; no treino passa
  G.net.send({ t: 'look', look: wornLook() }); // visual do boneco (os outros veem)
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
    for (const [, kind, wpn, x, y, z, bp] of G.brLoot || []) {
      const v = [x - o[0], y + 0.9 - o[1], z - o[2]], along = v[0] * d[0] + v[1] * d[1] + v[2] * d[2];
      if (along <= 0 || along > bt + 2) continue;
      const perp = Math.hypot(v[0] - d[0] * along, v[1] - d[1] * along, v[2] - d[2] * along);
      if (perp < 0.9 + along * 0.012 && (!best || along < best.along)) best = { along, pos: [x, y, z], label: kind === 'wpn' ? (bp ? t(bp) : wName(wpn)) : t('pg_' + kind) };
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

function clearRemotes() {
  replay.reset(scene); document.body.classList.remove('replay');
  for (const r of G.remotes.values()) scene.remove(r.char.root);
  G.remotes.clear();
  for (const m of G.nadeMeshes.values()) scene.remove(m);
  G.nadeMeshes.clear();
  while (G.blimpMeshes.length) scene.remove(G.blimpMeshes.pop());
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
  } catch (e) { console.warn('aquecimento das armas falhou', e); }
}

// todo mundo pronto: intertitulo de carregamento e entra na partida
async function beginMatch(join) {
  if (G.state !== 'lobby') return;
  G.state = 'loading';
  if (ui.fromLobby?.()) { $('menu').hidden = true; ui.go('home'); sendLoadout(); } // comecou com o arsenal aberto: vai com o que montou
  lobby.hide();
  await runLoading({ map: G.M.id, mode: G.duo ? 'duo' : G.bounce ? 'bounce' : G.mode, join });
  if (G.state !== 'loading') return;
  await warmGuns();
  hideLoading();
  G.state = 'game';
  audio.music(true, G.mode === 'br' || G.duo ? 'music_br' : 'music_m' + (1 + Math.floor(Math.random() * 4)));
  G.plafts = 0; G.pings = new Map(); G.brDrops = []; G.matchLog = newMatchLog(); G.matchXp = 0; G.botXpWarned = false; if (weekend() && !G.tutorial) setTimeout(() => hud.message(t('wkndOn'), 3), 2500); G.countEnd = 0; G.spec = { i: 0, map: false };
  input.mode = G.mode;
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
  $('hud').hidden = false;
  input.enabled = true;
  document.body.classList.toggle('bombmode', G.mode === 'bomb');
  if (isTouch) { buildTouch(input, $('touch')); try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape'); } catch { /* sem tela cheia */ } }
  else lockPointer(canvas); // sem gesto: a pausa pede o clique
  iris(150, 500);
}

// fim de partida: volta pro lobby da mesma sala
function backToLobby() {
  G.state = 'lobby';
  audio.music(true, 'music');
  G.paused = false;
  input.enabled = false;
  document.body.classList.remove('ingame', 'touchmode', 'mode-br', 'is-dead');
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true; document.body.classList.remove('game-smith'); setTouchBoard(false);
  if (document.pointerLockElement) document.exitPointerLock();
  clearRemotes();
  lobby.show();
  lobbyPickMode = null;
  syncLobbyPick(G.duo ? 'duo' : G.bounce ? 'bounce' : G.mode);
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
  await iris(0, 450);
  if (G.tutorial) { if (G.tutorial.finished) try { localStorage.setItem('rr_tutorial_done', '1'); } catch { /* */ } G.tutorial.dispose(); G.tutorial = null; }
  G.state = 'menu';
  G.paused = false;
  const n = G.net; G.net = null;
  n && n.close();
  G.player = null; G.myId = null; G.me = null;
  clearRemotes();
  document.body.classList.remove('ingame', 'touchmode', 'mode-br', 'is-dead');
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true; document.body.classList.remove('game-smith'); setTouchBoard(false);
  lobby.hide(); hideLoading();
  $('menu').hidden = false;
  input.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  audio.music(true, 'music');
  startAttract();
  ui.go('home');
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
function closeLobbySmith(ready) {
  if ($('menu').hidden) return;
  $('menu').hidden = true; ui.go('home');
  if (G.state === 'game') { // aberto da pausa: a arma montada vale na hora e volta pro tiroteio
    G.loadouts = matchLoadouts(); sendLoadout(); G.player?.rearm();
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
  $('pauseSmith').hidden = off || !!G.tutorial;
  $('pauseSmith').onclick = openGameSmith;
  if (off) return;
  const list = PRIMARIES;
  $('pkList').innerHTML = list.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${wName(w)}</span></button>`).join('');
  $('pkList').querySelectorAll('button').forEach(b => b.onclick = () => {
    settings.primary = b.dataset.w; saveSettings(); sendLoadout(); G.player?.rearm();
    audio.play('pickup', { ui: true, vol: 0.5 });
    hud.message(t(G.player?.alive ? 'swapNow' : 'nextSpawn', { w: wName(b.dataset.w) }), 2);
    renderPausePick();
  });
}

function setPaused(p) {
  if (G.state !== 'game') return;
  G.paused = p;
  if (p) renderPausePick();
  $('pauseHud').hidden = !isTouch;
  $('pause').hidden = !p;
  input.enabled = !p;
  if (p) { input.keys.clear(); input.mouse.fire = input.mouse.ads = false; input.touch.fire = false; }
  if (!p && !isTouch) lockPointer(canvas);
}
document.addEventListener('pointerlockchange', () => {
  if (G.state === 'game' && !isTouch && !document.pointerLockElement && !G.paused && $('theend').hidden) setPaused(true);
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

// ---------- menus ----------
const ui = initMenus({
  settings, saveSettings,
  // treino guiado na Vila: partida solo sem lobby, sem bots (os bonecos entram no passo de tiro)
  onTutorial: () => {
    try { localStorage.setItem('rr_tutorial_seen', '1'); } catch { /* */ } // primeira vez so abre sozinho uma vez
    G.tutorial = new Tutorial(G, { quit: () => quitGame(), reward: tutorialReward, setPing: (on) => { if (input.pingBtn) input.pingBtn.hidden = !on; }, setField: (f) => {
      const me = G.net?.core?.players.get(G.myId); if (me) me.field = f;
      if (G.tutorial) G.tutorial.fieldOverride = f;
      G.field = f; G.fieldK = 1; if (me) me.fieldCharge = 1; // treino: a Mola emprestada ja vem cheia
      setFieldHud(f);
    } });
    startGame(new LocalNet({ mode: 'ffa', map: 'vila', bots: 0, lobby: false, limit: 500, time: 1800 }), settings.name || (rovexGuest() ? rovexGuestName() : t('youCap'))).catch(() => { G.tutorial?.dispose(); G.tutorial = null; });
  },
  onSolo: ({ mode, map, bots, difficulty, limit, time }) => startGame(new LocalNet({ mode, map, bots, difficulty, limit, time }), settings.name || (rovexGuest() ? rovexGuestName() : t('youCap'))),
  onMp: (args) => startGame(new WsNet(args), args.name, args),
  onLook: (look, team) => setLookPreview(look, team),
  // vitrine: o feixe do laser e' curto (o de 12 m da partida cruzava a tela inteira); so mostra a cor saindo do cano
  onSmith: (gun) => { smithHolder.clear(); if (!gun) return; const lz = gun.userData.laser; if (lz) lz.beam.scale.z = 0.35; smithHolder.add(gun); },
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
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
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
    lookChar.update(realDt, { anim: 'idle', alive: true, speed: 0, t: menuT, pitch: 0 });
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
    smithHolder.rotation.y = Math.sin(menuT * 0.5) * 0.6 - Math.PI / 2 + 0.25;
    smithHolder.position.y = Math.sin(menuT * 1.3) * 0.01;
    // camuflagem reativa na vitrine: passa pelos 4 estagios (na partida sobe a cada 2 abates)
    smithHolder.traverse(o => { const u = o.material?.userData?.u?.uReact; if (u) u.value = Math.floor(menuT / 1.6) % 4; });
    const narrow = innerWidth < 760;
    if (narrow) { smithCam.position.set(0, -0.3, 2.4); smithCam.lookAt(0, -0.32, 0); }
    else {
      // a arma inteira no meio do espaco livre a esquerda do painel (mede o painel de verdade)
      const free = Math.max(160, $('scr-arsenal').getBoundingClientRect().left - 12);
      const tanH = Math.tan(THREE.MathUtils.degToRad(smithCam.fov / 2));
      const fit = 1.6 / ((free / innerWidth) * 2 * tanH * smithCam.aspect); // arma + folga do balanco no vao
      const z = Math.max(2.4, fit), ndc = free / innerWidth - 1;              // centro do vao em NDC
      const sx = -ndc * z * tanH * smithCam.aspect;
      smithCam.position.set(sx, 0.12, z);
      smithCam.lookAt(sx, 0, 0);
    }
    renderer.render(smithScene, smithCam);
    pad.poll(realDt, false); // controle no Arsenal (antes saia daqui sem ler o controle)
    return;
  }

  pad.poll(realDt, G.state === 'game' && !G.paused);
  G.net && G.net.update(dt);
  if (G.state === 'lobby') lobby.frame();
  lineupFrame(realDt);
  world.update(G.t, dt);
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
      const prims = P.owned.filter(w => ['smg', 'rifle', 'shotgun', 'sniper', 'minigun'].includes(w));
      if (prims.length >= 2) {
        const it = (G.brLoot || []).find(l => l[1] === 'wpn' && !P.owned.includes(l[2]) && l[2] !== 'pistol' && (l[3] - P.pos[0]) ** 2 + (l[5] - P.pos[2]) ** 2 < 2.6);
        if (it) tip('swap');
        if (it) pr = t(isTouch ? 'br_swapTouch' : G.pad?.active ? 'br_swapPad' : 'br_swap', { a: wName(prims.includes(P.wpn) ? P.wpn : prims[0]), b: wName(it[2]) });
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
  for (const m of G.nadeMeshes.values()) if (m.userData.to) { m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 18)); m.rotation.x += dt * 8; }
  for (const m of G.blimpMeshes) if (m.userData.to) {
    const prev = m.position.clone();
    m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 4));
    if (prev.distanceToSquared(m.position) > 1e-4) m.lookAt(m.position.clone().add(m.position.clone().sub(prev)));
    m.rotateY(Math.PI);
  }

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
    r.char.update(dt, { anim: r.anim, pitch: r.pitch, alive: r.alive, speed: r.speed, t: G.t, airH: r.pos[1] });
    const bh = (G.state === 'game' && EV(G.snap?.mut)?.bigHead) || 1; // evento Cabecao
    if (r.char.headK !== bh) { r.char.headK = bh; r.char.head.scale.setScalar(bh); }
    const camD = camera.position.distanceTo(tmpV.fromArray(r.pos));
    r.char.lod(camD);
    r.char.tag.visible = r.alive && G.state === 'game' && (r.team && r.team === G.myTeam || camD < 30);
    if (r.team && r.team === G.myTeam) r.char.sharpTag(renderer);
  }

  let scopeOn = false;
  if (G.state === 'game' && G.player) {
    const inp = input.read();
    if (inp.pause) setPaused(!G.paused);
    const p = G.player;
    G.pumping = !!(G.pumpMate && inp.use); // enchendo a bomba: fica parado em cima do parceiro
    if (!G.paused) p.update(dt, inp);
    nadeArc(p);
    if (G.tutorial && !G.paused) { if (p.alive && !(G.snap?.freeze > 0)) G.tutorial.begin(); G.tutorial.update(dt, inp); }
    hud.board(inp.board, G.snap, G.snap?.players || [], G.myId, inp.board && !G.tutorial ? ui.chRows() : null);
    const W = WEAPONS[p.wpn];
    const g = vm.gun?.userData;
    const big = g?.scope?.big;
    const zoom = p.zoomNow || W.zoom || 1;
    // luneta 3D: fora da lente so um zoom leve; dentro da lente, o zoom de verdade
    const outer = big ? 1.2 : zoom;
    const fovT = (settings.fov + (p.tac ? 12 : p.sprint ? 6 : 0)) / (1 + (outer - 1) * p.adsK);
    // distancia de desenho (Ajustes): o que passa do corte nem e desenhado; a nevoa fecha antes pra nada sumir seco
    const dd = DRAW_DIST[settings.draw] || DRAW_DIST.far;
    if (camera.far !== dd) camera.far = dd;
    if (scene.fog) { const b = scene.fog.rrBase ||= [scene.fog.near, scene.fog.far]; const ff = Math.min(b[1], dd * 0.96); scene.fog.far = ff; scene.fog.near = Math.min(b[0], ff * 0.55); } // rrBase: a nevoa original do mapa
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-14 * realDt));
    camera.updateProjectionMatrix();
    vm.camera.fov = settings.vmFov - p.adsK * 12; vm.camera.updateProjectionMatrix();
    G.shakeAmt *= Math.exp(-7 * realDt);
    const sh = G.shakeAmt;
    if (p.alive) {
      // balanco de cabeca curto e so na vertical (o grosso do balanco e' da arma, como no COD)
      const bob = p.onGround && Math.hypot(p.vel[0], p.vel[2]) > 2 ? Math.abs(Math.sin(p.stepPhase)) * (p.sprint ? 0.03 : 0.016) * (1 - p.adsK) : 0;
      camera.position.set(p.pos[0], p.pos[1] + p.eye - bob, p.pos[2]);
      G.kickP = (G.kickP || 0) * Math.exp(-11 * realDt); G.kickR = (G.kickR || 0) * Math.exp(-9 * realDt);
      camera.rotation.set(p.pitch + G.kickP + (Math.random() - 0.5) * sh * 0.05, p.yaw + (Math.random() - 0.5) * sh * 0.05, p.roll + G.kickR);
    } else if ((G.mode === 'bomb' || G.mode === 'br') && !G.bounceBack) { // bate-volta voltando do ceu: tela de morte normal com a contagem
      // fora da rodada: assiste um colega em primeira pessoa ou o mapa de cima (battle royale: qualquer um vivo)
      const list = [...G.remotes.values()].filter(r => r.alive && (G.mode === 'br' || !G.isEnemy(r)));
      const S = G.spec || (G.spec = { i: 0, map: false });
      if (inp.firePressed || inp.jumpPressed) S.i++;
      if (inp.mapPressed || inp.wheel) S.map = !S.map;
      const r = list.length ? list[S.i % list.length] : null;
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
    if (SR) { // espectador: a arma do outro anda e corre como a dele
      const sp = SR.speed || 0, run = SR.anim === 'sprint' || SR.anim === 'tac';
      vm.update({ dt: realDt, moving: sp > 1.5 && SR.anim !== 'jump', speed: sp, sprint: run, tac: SR.anim === 'tac', ads: 0, crouch: SR.anim === 'crouch', air: SR.anim === 'jump', pistolSprint: run && SR.wpn === 'pistol', lookDX: 0, lookDY: 0, firing: false });
    } else vm.update({ dt: realDt, moving: Math.hypot(p.vel[0], p.vel[2]) > 1.5 && p.onGround, speed: Math.hypot(p.vel[0], p.vel[2]), sprint: p.sprint, tac: p.tac, ads: p.adsK, crouch: p.crouch, slide: p.slideT > 0, air: !p.onGround, pistolSprint: p.sprint && p.wpn === 'pistol', lookDX: inp.lookX, lookDY: inp.lookY, firing: p.firing });
    if (!SR && G.specVm && p.alive) { G.specVm = null; vm.setWeapon(p.wpn, p.lo(p.wpn), true); vm.setGloves(wornLook()); } // voltou: a sua arma e a sua luva
    vmPass.enabled = (p.alive || !!SR) && !G.down; // caido: sem arma na mao
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
    if (replay.on) { replay.camera(camera, realDt, G); vmPass.enabled = false; }
    const ru = vm.gun?.userData.mat?.userData?.u?.uReact; if (ru) ru.value = G.reactStage || 0;
    // ponto do laser no mundo: onde o centro da mira bate
    if (g?.laser && p.alive && !p.sprint && !p.tac && !replay.on) {
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
    if (G.snap) { hud.objectives(G.snap, camera, G.me); hud.radar(G, camera); hud.nadeWarn(G, camera); }
    hud.compass(G, camera);
    G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - realDt * 1.2);
    const low = p.alive ? Math.max(0, (40 - p.hp) / 40) * 0.5 : 0.4;
    film.uniforms.hurt.value = Math.min(1, G.hurtFlash + low);
    G.flashT = Math.max(0, G.flashT - realDt);
    film.uniforms.flash.value = Math.min(1, G.flashT);
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
    film.uniforms.flash.value = 0;
  }
  if (scopeOn) {
    renderer.setRenderTarget(scopeRT);
    renderer.render(scene, scopeCam);
    renderer.setRenderTarget(null);
  }
  const fwd = camera.getWorldDirection(tmpV.clone());
  audio.setListener(camera.position, fwd, new THREE.Vector3(0, 1, 0));
  composer.render(realDt);
  G.clipRec?.draw(); // clipe gravando: copia o quadro na hora (o canvas do jogo nao guarda o desenho)
  if (lineup.chars.some(c => c.root.visible)) { renderer.autoClear = false; renderer.clearDepth(); renderer.render(lineupScene, camera); renderer.autoClear = true; }
}

$('deadGo').onclick = () => G.net?.send({ t: 'respawn' });
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

// tela cheia: no menu inicial e na pausa (iPhone nao deixa pagina ir pra tela cheia: o botao some)
const fsOk = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const syncFs = () => {
  const on = !!document.fullscreenElement;
  $('fsMenu').hidden = !fsOk; $('pauseFs').hidden = !fsOk;
  $('fsMenu').classList.toggle('on', on);
  $('fsMenu').setAttribute('aria-label', t(on ? 'fsOff' : 'fsOn'));
  $('pauseFs').textContent = t(on ? 'fsOff' : 'fsOn');
};
const toggleFs = async () => {
  audio.play('ui_click', { ui: true });
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (G.state === 'game' && isTouch) await screen.orientation?.lock?.('landscape').catch(() => {}); }
  } catch { /* navegador recusou */ }
};
$('fsMenu').onclick = toggleFs;
$('pauseFs').onclick = toggleFs;
document.addEventListener('fullscreenchange', syncFs);
syncFs();

// ---------- partida ----------
const BOOT_T = performance.now();
(async () => {
  setLang(getLang());
  ui.markNewChallenges?.(); // a traducao reescreve o texto do botao e levava o selo de "novo" junto
  applySettings();
  await Promise.race([loadArsenal(), new Promise(r => setTimeout(r, 6000))]);
  await document.fonts.ready.catch(() => {});
  fx = new FX(scene);
  G.fx = fx;
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
  // primeira vez no jogo: tour do cartaz mostrando o que cada botao faz (convite direto pra sala pula)
  if (!homeTourSeen() && !inviteRoom) setTimeout(() => { if (G.state === 'menu' && ui.screen === 'home' && !$('menu').hidden) startHomeTour({ touch: isTouch }); }, 900);
  const wake = () => { audio.init(); audio.music(true, 'music'); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
})();
