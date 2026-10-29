import * as THREE from 'three';
import { buildWorld, buildObjectives, FX } from './world.js';
import { Character } from './character.js';
import { ViewModel } from './viewmodel.js';
import { makePipeline } from './post.js';
import { Player } from './player.js';
import { pushSoon, me as rovexMe, inRovex } from './rovex.js';
import { Hud } from './hud.js';
import { Input, isTouch, buildTouch, applyHudLayout, setFireButton } from './input.js';
import { Pad } from './gamepad.js';
import { LocalNet, WsNet } from './net.js';
import { audio } from './audio.js';
import { MODES, WEAPONS, STREAKS, GUN_LADDER, PRIMARIES, BLUEPRINTS } from '../shared/weapons.js';
import { updateCamoFx } from './camofx.js';
import { getMap, hasLOS } from '../shared/map.js';
import { loadArsenal, getLoadouts, scopeTarget } from './arsenal.js';
import { initMenus, applyCrosshair } from './ui.js';
import { t, wName, setLang, getLang } from './i18n.js';
import { ink, PAL } from './toon.js';
import { addXp, XP, onProgress, progressInfo, partReq, partUnlocked, camoUnlocked, level, levelXp } from './progress.js';
import { Lobby, runLoading, hideLoading } from './lobby.js';
import { track } from './challenges.js';
import { camoTime, CAMOS } from './camos.js';
import { CATEGORY, LASERS, partName, unlockedLoadout, buildGun, buildPartPreview, bpLoadout } from './arsenal.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- ajustes ----------
const DEFAULTS = { v: 3, primary: 'smg', fov: 90, sens: 1, adsSens: 0.8, vmFov: 58, invertY: false, master: 0.8, music: 0.45, sfx: 1, grain: 0.6, film: 'color', res: isTouch ? 0.7 : 1, showFps: false, holdCrouch: false, tracer: 'chalk', autoSprint: false, name: '', aimAssist: true, autoFire: true, xhair: 'cross', xhairColor: '#ece9e1', threatRing: true };
let settings = { ...DEFAULTS };
try {
  const saved = JSON.parse(localStorage.getItem('rr_settings') || '{}');
  // versao 3: o filtro brutal saiu; quem estava nele volta pra pelicula colorida
  if (saved.film === 'brutal') saved.film = 'color';
  Object.assign(settings, saved, { v: 3 });
} catch { /* sem storage */ }
function saveSettings() { try { localStorage.setItem('rr_settings', JSON.stringify(settings)); } catch { /* */ } applySettings(); }

// ---------- render ----------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(settings.fov, 1, 0.05, 500);
camera.rotation.order = 'YXZ';
// luneta 3D: a lente mostra esta camera ampliada (picture-in-picture)
const scopeRT = new THREE.WebGLRenderTarget(isTouch ? 384 : 640, isTouch ? 384 : 640);
scopeRT.texture.colorSpace = THREE.SRGBColorSpace;
scopeTarget.texture = scopeRT.texture;
const scopeCam = new THREE.PerspectiveCamera(20, 1, 0.05, 500);
const vm = new ViewModel();
const lobby = new Lobby({ onReady: (v) => G.net && G.net.send({ t: 'ready', v }), onStart: () => G.net && G.net.send({ t: 'start' }), onTeam: (team) => G.net && G.net.send({ t: 'team', team }), onLeave: () => quitGame() });
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

// cena do gunsmith: arma girando num fundo de papel, cores de verdade
const smithScene = new THREE.Scene();
smithScene.background = new THREE.Color(0xdcd7cb);
smithScene.add(new THREE.HemisphereLight(0xffffff, 0x8a857c, 1.6));
const sl = new THREE.DirectionalLight(0xffffff, 2.2); sl.position.set(2, 3, 2); smithScene.add(sl);
const smithCam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const smithHolder = new THREE.Group(); smithScene.add(smithHolder);

const input = new Input(canvas);
const pad = new Pad(input);
const hud = new Hud();
let world, objectives, fx;

// ---------- estado do jogo ----------
const G = {
  settings, vm, camera, hud, input, loadouts: getLoadouts(), remotes: new Map(),
  net: null, player: null, myId: null, myTeam: null, snap: null, mode: 'ffa', M: getMap('vila'),
  state: 'menu', // menu | game
  paused: false, shakeAmt: 0, deathPos: null, killer: null, t: 0, timeScale: 1, slowT: 0,
  seen: new Map(), // id -> ate quando aparece no radar (atirou)
  nadeMeshes: new Map(), blimpMeshes: [], remoteLo: new Map(), remoteTracer: new Map(), flashT: 0,
  isEnemy(r) { if (r.id === this.myId) return false; return !MODES[this.mode].teams || r.team !== this.myTeam; },
  shake(a) { this.shakeAmt = Math.min(0.6, this.shakeAmt + a); },
  onHitConfirm(point, head, dmg, victim) {
    hud.hitmark(head);
    audio.play(head ? 'headshot' : 'hitmarker', { vol: head ? 0.75 : 0.55, ui: true, key: 'hitm', max: 2, jitter: 0 });
    if (dmg) fx.number([point[0], point[1] + 0.3, point[2]], dmg, head);
    if (victim) victim.char.flinch(head);
    if (Math.random() < 0.25) fx.word(head ? 'TOING!' : ['POW!', 'BAM!', 'PAF!', 'TUM!'][Math.floor(Math.random() * 4)], point, head ? 1.6 : 1.1);
  },
};
G.fx = null;
G.pad = pad;
// o que o jogador levou da partida (tela de fim): XP por tipo, desbloqueios e nivel de partida
function newMatchLog() { const pi = progressInfo(); return { xp: {}, unlocks: [], startXp: pi.xp, startLevel: pi.level }; }
function logXp(kind, n) { const L = G.matchLog; if (L) L.xp[kind] = (L.xp[kind] || 0) + n; }
function logUnlock(kind, name, img) { const L = G.matchLog; if (L && !L.unlocks.some(u => u.name === name)) L.unlocks.push({ kind, name, img }); }
// XP: soma na partida, mostra "+100 Nocaute" no meio da tela e avisa quando sobe de nivel
// evento de desafio: completou = XP + banner na hora
// Elite da Rovex: XP em dobro em tudo (abate, partida, desafio)
const xpMult = () => (rovexMe?.elite ? 2 : 1);

function chEvent(e) {
  if (G.state !== 'game') return;
  for (const c of track(e)) {
    // elite rastreado: cada avanco aparece na tela (sem XP ainda)
    if (c.kind === 'eliteProg') { hud.eliteTrack(t('el_' + c.id, { n: c.n }), c.prog, c.n); continue; }
    c.xp *= xpMult();
    G.matchXp = (G.matchXp || 0) + c.xp;
    logXp('challenge', c.xp);
    addXp('challenge', c.xp);
    const r = c.reward;
    if (c.kind === 'elite') hud.eliteTrack(t('el_' + c.id, { n: c.n }), 1, 1, true);
    const name = r ? (r.slot === 'bp' ? t(r.id) : r.slot === 'tracer' ? t('s_tracer') + ': ' + t('tr_' + r.id.slice(3)) : r.slot === 'camo' ? t('camo_' + r.id) : partName(r.slot, r.id)) : t('ch_' + c.id, { n: '', w: c.wpn ? wName(c.wpn) : '' }).replace(/\s+/g, ' ');
    const img = r && r.slot !== 'tracer' ? unlockShot({ slot: r.slot, id: r.id, wpn: r.wpn || G.player?.wpn || 'smg' }) : null;
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

function gainXp(kind, wpn = null, mult = 1) {
  if (G.state !== 'game') return;
  const amount = Math.round((XP[kind] || 0) * mult * xpMult());
  if (!amount) return;
  G.matchXp = (G.matchXp || 0) + amount;
  logXp(kind, amount);
  addXp(kind, amount, WEAPONS[wpn] ? wpn : null);
  hud.xpPop(`+${amount} ${t('xp_' + kind)}`);
}
// o que abre exatamente neste nivel (pra avisar na hora)
// o que abriu nesse nivel: [{ slot, id, wpn, name }] (camo de nivel de jogador vale pra arma em uso)
function unlocksAt(wpn, wLevel, pLevel) {
  const out = [];
  const C = wpn && CATEGORY[wpn];
  if (C && wLevel) {
    const lists = { body: C.bodies, scope: [null, ...C.scopes], charger: C.chargers, handle: [null, ...C.handles], laser: [null, ...LASERS] };
    for (const [slot, list] of Object.entries(lists)) list.forEach((id, i) => { if (id && i > 0 && partReq(i) === wLevel) out.push({ slot, id, wpn, name: partName(slot, id) }); });
    for (const c of CAMOS) if (c.req && c.req.wpn === wLevel && !c.req.player) out.push({ slot: 'camo', id: c.id, wpn, name: t('camo_' + c.id) });
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
  if (G.state !== 'game' || (!e.levelUp && !e.wpnUp)) return;
  G.loadouts = matchLoadouts(); sendLoadout();
  // som de subir de nivel + o que desbloqueou
  audio.play('levelup', { vol: 0.85, ui: true, jitter: 0 });
  audio.duck(0.3, 1.6);
  if (e.levelUp) hud.stampText(t('levelUp', { n: e.levelUp }));
  if (e.wpnUp) hud.message(t('wpnUp', { w: wName(e.wpn), n: e.wpnUp }), 2.6);
  // todos os niveis ganhos de uma vez (subir 2 niveis num abate tambem anuncia o do meio)
  const got = [];
  for (let n = (e.wpnFrom || 0) + 1; e.wpnUp && n <= e.wpnUp; n++) got.push(...unlocksAt(e.wpn, n, 0));
  for (let n = (e.levelFrom || 0) + 1; e.levelUp && n <= e.levelUp; n++) got.push(...unlocksAt(e.wpn, 0, n));
  // tudo vai pra tela de fim; na hora, banner estilo COD um por vez (ate 3)
  const shots = got.map(u => unlockShot(u));
  got.forEach((u, i) => logUnlock(t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), u.name, shots[i]));
  got.slice(0, 3).forEach((u, i) => setTimeout(() => {
    hud.unlockBanner({ kind: t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), name: u.name, img: shots[i], more: i === 2 && got.length > 3 ? got.length - 3 : 0 });
    audio.play('unlock', { vol: 0.8, ui: true, jitter: 0 });
  }, 1100 + i * 3400));
});
window.__G = G; // atalho de depuracao
G.addXp = addXp;
G.unlockShot = (u) => unlockShot(u); // depuracao: foto do banner de desbloqueio

// troca o cenario quando a sala usa outro mapa
function setMap(id) {
  if (world && G.M.id === id) return;
  G.M = getMap(id);
  world && world.dispose(); objectives && objectives.dispose();
  world = buildWorld(scene, G.M);
  objectives = buildObjectives(scene, G.M);
  hud.setMap(G.M);
}

function remoteFor(p) {
  let r = G.remotes.get(p.id);
  if (!r) {
    r = { id: p.id, char: new Character(p.team, p.name), pos: [...p.pos], target: [...p.pos], vel: [0, 0, 0], yaw: p.yaw, alive: p.alive, team: p.team, name: p.name, anim: p.anim, wpn: p.wpn, pitch: 0, speed: 0 };
    scene.add(r.char.root);
    G.remotes.set(p.id, r);
  }
  return r;
}

function onSnap(s) {
  G.snap = s;
  G.mode = s.mode;
  if (s.map && s.map !== G.M.id) setMap(s.map);
  const seen = new Set();
  for (const p of s.players) {
    if (p.id === G.myId) {
      G.me = p;
      if (G.player) {
        G.player.hp = p.hp;
        hud.hp(p.hp);
        if (!p.alive && G.player.alive) G.player.alive = false;
        G.myTeam = p.team;
        if (p.nades) G.player.nades = { ...p.nades };
      }
      continue;
    }
    seen.add(p.id);
    const r = remoteFor(p);
    // trocou de time (infectado): o boneco e' refeito na cor nova
    if (p.team !== r.team) { scene.remove(r.char.root); r.char = new Character(p.team, p.name); scene.add(r.char.root); r.loKey = null; }
    if (!r.alive && p.alive) r.pos = [...p.pos];
    r.target = [...p.pos]; r.yaw = p.yaw; r.pitch = p.pitch; r.anim = p.anim; r.alive = p.alive; r.team = p.team;
    r.kills = p.kills; r.hp = p.hp;
    const lo = G.mode === 'gungame' ? { body: GUN_LADDER[Math.min(p.gunLvl || 0, GUN_LADDER.length - 1)].body } : G.remoteLo.get(p.id)?.[p.wpn] || null;
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
  bl.forEach((b, i) => { G.blimpMeshes[i].userData.to = b.pos; });
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
  switch (e.k) {
    case 'spawn':
      if (e.id === G.myId && G.player) {
        // camo reativa: o estagio vem da sequencia do servidor. Quem morreu volta do 0; quem sobreviveu a
        // rodada da bomba (todo mundo renasce na rodada nova) mantem o estagio
        const meSnap = G.snap?.players?.find(o => o.id === G.myId);
        G.reactStage = Math.min(3, Math.floor((meSnap?.streak || 0) / 2));
        $('specBar').hidden = true; $('dead').classList.remove('spec');
        if (e.team) G.myTeam = e.team;
        G.player.spawn(e);
        hud.hp(100); hud.weapon(G.player);
        $('dead').hidden = true;
        G.deathPos = null;
      } else if (inGame) fx.puff([e.pos[0], 1, e.pos[2]], 5, 0.8, 0xece9e1, 0.6);
      break;
    case 'shot': {
      if (e.id === G.myId) break;
      if (e.id !== 'blimp') G.seen.set(e.id, G.t + 2.2);
      const r = G.remotes.get(e.id);
      audio.play(e.wpn, { pos: e.o, vol: inGame ? 0.75 : 0.12, key: 'rgun' + e.id, max: 2 });
      if (e.e) {
        const mz = r?.char.gun?.userData.muzzle;
        const o = mz ? mz.getWorldPosition(new THREE.Vector3()).toArray() : e.o;
        fx.tracer(o, e.e, G.remoteLo.get(e.id)?.[e.wpn]?.tracer || 'chalk');
        if (Math.random() < 0.5) fx.impact(e.e, null);
      }
      break;
    }
    case 'hurt':
      if (e.v === G.myId && G.player) {
        audio.play('hit', { vol: 0.7, key: 'hurt', max: 2 });
        G.hurtFlash = Math.min(1, (G.hurtFlash || 0) + e.dmg / 60);
        if (e.from) {
          const dx = e.from[0] - G.player.pos[0], dz = e.from[2] - G.player.pos[2];
          hud.hurtFrom(-(Math.atan2(-dx, -dz) - G.player.yaw));
        }
        G.shake(0.08 + Math.min(0.2, e.dmg / 300));
      } else if (e.a !== G.myId) G.remotes.get(e.v)?.char.flinch(e.head);
      break;
    case 'assist':
      if (e.id === G.myId) { gainXp('assist'); chEvent({ type: 'assist' }); }
      break;
    case 'kill': {
      if (e.v === G.myId && G.mode === 'bomb') { $('specBar').hidden = false; $('dead').classList.add('spec'); }
      const vPos = e.pos || posOf(e.v);
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
        $('dead').hidden = false;
        $('deadBy').textContent = e.a ? t('killedYou', { n: nameOf(e.a) }) : t('selfKill');
        G.killer = e.a;
        audio.stopKey('gun');
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
    case 'streakReady':
      if (e.id === G.myId && inGame) { hud.message(t('streakReady', { s: t('s_' + e.kind), k: t(pad.active ? 'how_pad' : isTouch ? 'how_touch' : 'how_kb') }), 2.4); audio.play('pickup', { vol: 0.7, ui: true, rate: 0.8 }); }
      break;
    case 'streak':
      if (inGame) {
        const mine = e.id === G.myId, ally = MODES[G.mode].teams && e.team === G.myTeam;
        if (mine) { gainXp('streak'); vm.callStreak(e.kind); chEvent({ type: 'streak', kind: e.kind }); }
        // Torta Atomica: aviso grande pra todo mundo, com o nome de quem pediu
        if (e.kind === 'nuke') hud.alert(t(mine ? 'nukeYou' : ally ? 'nukeAlly' : 'nukeEnemy', { n: nameOf(e.id) }), t(mine ? 'nukeYouSub' : ally ? 'nukeAllySub' : 'nukeEnemySub', { t: e.delay || 6 }), mine || ally ? 'blue' : 'red');
        else hud.message(t(mine || ally ? 'streakAlly' : 'streakEnemy', { s: t('s_' + e.kind), n: nameOf(e.id) }), 2.6);
        audio.play(mine || ally ? 'flag' : 'capture', { vol: 0.7, ui: true });
      }
      break;
    case 'lo':
      if (e.id !== G.myId) { G.remoteLo.set(e.id, e.los || {}); G.remoteTracer.set(e.id, e.tracer || 'chalk'); }
      break;
    case 'give':
      if (e.id === G.myId && G.player && e.refill) { G.player.give(e.wpn, false); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player && G.mode === 'infect') { G.player.forced = true; G.player.give(e.wpn, true, !!e.force); hud.weapon(G.player); break; }
      if (e.id === G.myId && G.player) {
        G.player.forced = G.mode === 'gungame';
        if (e.body) G.player.ggBody = e.body;
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
    case 'zone':
      if (inGame) {
        hud.message(t('zoneTaken', { z: e.id, t: t(e.team === 'red' ? 'h_red' : 'h_blue') }), 2); audio.play('capture', { vol: 0.6, ui: true });
        const z = G.M.zones.find(q => q.id === e.id), p = G.player;
        if (z && p && p.alive && e.team === G.myTeam && Math.hypot(p.pos[0] - z.pos[0], p.pos[2] - z.pos[2]) < z.r + 0.5) gainXp('zone');
      }
      break;
    case 'msg':
      if (inGame) hud.feed(esc(e.key ? t(e.key, { n: e.name }) : e.text));
      break;
    case 'end':
      if (inGame) {
        G.slowT = 1.4;
        if (e.winner === G.myTeam || e.winner === G.myName) { gainXp('win'); chEvent({ type: 'win' }); }
        chEvent({ type: 'match' });
        gainXp('match');
        setTimeout(() => showEnd(e.winner), 900);
      }
      break;
    case 'restart':
      $('theend').hidden = true;
      $('endXp')?.remove();
      if (G.state === 'game') backToLobby();
      break;
    case 'start':
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
      if (e.id === G.myId) gainXp('survive');
      break;
    // ---------- plantar a bomba ----------
    case 'round':
      if (!inGame) break;
      G.spec = { i: 0, map: false };
      for (const r of G.remotes.values()) r.char.root.visible = true;
      hud.alert(t('roundN', { n: e.n }), t(G.myTeam === 'red' ? (e.carrier === G.myId ? 'bombYouCarry' : 'bombAtkGoal') : 'bombDefGoal'), G.myTeam === 'red' ? 'red' : 'blue');
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
      if (inGame) hud.message(t('bombHalf'), 3);
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
  $('theend').hidden = false;
  animateEndXp(L.startXp, L.startXp + total, total);
  audio.play('flag', { vol: 0.8, ui: true });
  let n = 8;
  const tick = () => { if ($('theend').hidden) return; $('endNext').textContent = t('nextIn', { n }); if (n-- > 0) setTimeout(tick, 1000); };
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
    G.myId = m.id; G.myTeam = m.team; G.mode = m.mode;
    if (m.map) setMap(m.map);
    sendLoadout();
    // partida ja rolando: pula o lobby
    if (m.phase === 'play' && G.state === 'lobby') beginMatch(true);
  } else if (m.t === 'lobby') {
    if (m.map) setMap(m.map);
    if (G.state === 'lobby') { lobby.render(m, G.myId); syncLobbyPick(m.mode); }
  }
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
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'melee']) los[w] = G.loadouts[w];
  G.net.send({ t: 'loadout', primary: settings.primary, los, lvl: level(), tracer: settings.tracer, elite: !!rovexMe?.elite });
}

// ---------- iris ----------
const irisEl = $('iris');
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
  $('menu').hidden = true;
  if (G.state === 'lobby') lobby.show();
  lobbyPickMode = null;
  lobby.setRoom(mpArgs?.room || null, !!rovexMe);
  audio.music(true);
  iris(150, 800);
}

// todo mundo pronto: intertitulo de carregamento e entra na partida
async function beginMatch(join) {
  if (G.state !== 'lobby') return;
  G.state = 'loading';
  lobby.hide();
  await runLoading({ map: G.M.id, mode: G.mode, join });
  if (G.state !== 'loading') return;
  hideLoading();
  G.state = 'game';
  G.matchLog = newMatchLog(); G.matchXp = 0; G.countEnd = 0; G.spec = { i: 0, map: false };
  input.mode = G.mode;
  // avisa o servidor que carregou: quando o ultimo avisar, sai a contagem pra todo mundo
  G.net?.send({ t: 'loaded' });
  document.body.classList.add('ingame');
  $('hud').hidden = false;
  input.enabled = true;
  document.body.classList.toggle('bombmode', G.mode === 'bomb');
  if (isTouch) { buildTouch(input, $('touch')); try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); await screen.orientation?.lock?.('landscape'); } catch { /* sem tela cheia */ } }
  else canvas.requestPointerLock?.()?.catch?.(() => { /* sem gesto: a pausa pede o clique */ });
  iris(150, 500);
}

// fim de partida: volta pro lobby da mesma sala
function backToLobby() {
  G.state = 'lobby';
  G.paused = false;
  input.enabled = false;
  document.body.classList.remove('ingame', 'touchmode');
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  clearRemotes();
  lobby.show();
  lobbyPickMode = null;
  syncLobbyPick(G.mode);
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
  G.state = 'menu';
  G.paused = false;
  const n = G.net; G.net = null;
  n && n.close();
  G.player = null; G.myId = null; G.me = null;
  clearRemotes();
  document.body.classList.remove('ingame', 'touchmode');
  $('hud').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('theend').hidden = true; $('touch').hidden = true;
  lobby.hide(); hideLoading();
  $('menu').hidden = false;
  input.enabled = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  audio.music(true);
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
function renderLobbyPick() {
  const list = PRIMARIES;
  if (!list.includes(settings.primary)) { settings.primary = list[0]; saveSettings(); sendLoadout(); }
  $('lbPickList').innerHTML = list.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${wName(w)}</span></button>`).join('');
  $('lbPickList').querySelectorAll('button').forEach(b => b.onclick = () => {
    settings.primary = b.dataset.w; saveSettings(); sendLoadout();
    audio.play('pickup', { ui: true, vol: 0.5 });
    $('lbPickList').querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', x === b));
  });
}

// pausa: escolher a principal pro proximo renascimento (nao troca na hora)
function renderPausePick() {
  // escada de armas nao escolhe; infectado (vermelho) so tem a lamina; sobrevivente nao pega sniper
  const off = G.mode === 'gungame' || G.mode === 'infect';
  $('pausePick').hidden = off;
  if (off) return;
  const list = PRIMARIES;
  $('pkList').innerHTML = list.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${wName(w)}</span></button>`).join('');
  $('pkList').querySelectorAll('button').forEach(b => b.onclick = () => {
    settings.primary = b.dataset.w; saveSettings(); sendLoadout();
    audio.play('pickup', { ui: true, vol: 0.5 });
    hud.message(t('nextSpawn', { w: wName(b.dataset.w) }), 2);
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
  if (!p && !isTouch) canvas.requestPointerLock?.();
}
document.addEventListener('pointerlockchange', () => {
  if (G.state === 'game' && !isTouch && !document.pointerLockElement && !G.paused && $('theend').hidden) setPaused(true);
});
$('resume').onclick = () => { audio.play('ui_click', { ui: true }); setPaused(false); };
$('quit').onclick = () => { audio.play('ui_back', { ui: true }); quitGame(); };
$('pauseSettings').onclick = () => { $('pause').hidden = true; $('menu').hidden = false; ui.go('settings', true); };

// ---------- menus ----------
const ui = initMenus({
  settings, saveSettings,
  onSolo: ({ mode, map, bots, difficulty }) => startGame(new LocalNet({ mode, map, bots, difficulty }), settings.name || t('youCap')),
  onMp: (args) => startGame(new WsNet(args), args.name, args),
  onSmith: (gun) => { smithHolder.clear(); if (gun) smithHolder.add(gun); },
  onBackFromSettingsInGame: () => { $('menu').hidden = true; $('pause').hidden = false; },
  inGame: () => G.state === 'game',
  loadoutsChanged: (l) => { G.loadouts = l; },
});

// ---------- loop ----------
let last = performance.now();
let menuT = 0;
const tmpV = new THREE.Vector3();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // camera lenta no abate final
  if (G.slowT > 0) G.slowT -= realDt;
  G.timeScale += ((G.slowT > 0 ? 0.25 : 1) - G.timeScale) * Math.min(1, realDt * 8);
  const dt = realDt * G.timeScale;
  G.t += dt;
  camoTime.value += realDt;
  updateCamoFx(realDt);
  film.uniforms.time.value = G.t;

  if (ui.screen === 'arsenal' && G.state === 'menu') {
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
    return;
  }

  pad.poll(realDt, G.state === 'game' && !G.paused);
  G.net && G.net.update(dt);
  if (G.state === 'lobby') lobby.frame();
  world.update(G.t, dt);
  objectives.update(G.t, G.snap, G.mode);
  fx.update(dt);
  for (const m of G.nadeMeshes.values()) if (m.userData.to) { m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 18)); m.rotation.x += dt * 8; }
  for (const m of G.blimpMeshes) if (m.userData.to) {
    const prev = m.position.clone();
    m.position.lerp(tmpV.fromArray(m.userData.to), Math.min(1, dt * 4));
    if (prev.distanceToSquared(m.position) > 1e-4) m.lookAt(m.position.clone().add(m.position.clone().sub(prev)));
    m.rotateY(Math.PI);
  }

  for (const r of G.remotes.values()) {
    const k = 1 - Math.exp(-14 * dt);
    const ox = r.pos[0], oz = r.pos[2];
    r.pos[0] += (r.target[0] - r.pos[0]) * k; r.pos[1] += (r.target[1] - r.pos[1]) * k; r.pos[2] += (r.target[2] - r.pos[2]) * k;
    r.speed = r.speed * 0.8 + (Math.hypot(r.pos[0] - ox, r.pos[2] - oz) / Math.max(dt, 1e-3)) * 0.2;
    r.char.root.position.fromArray(r.pos);
    let dy = r.yaw - r.char.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    r.char.root.rotation.y += dy * k;
    r.char.update(dt, { anim: r.anim, pitch: r.pitch, alive: r.alive, speed: r.speed, t: G.t, airH: r.pos[1] });
    r.char.tag.visible = r.alive && G.state === 'game' && (r.team && r.team === G.myTeam || camera.position.distanceTo(tmpV.fromArray(r.pos)) < 30);
  }

  let scopeOn = false;
  if (G.state === 'game' && G.player) {
    const inp = input.read();
    if (inp.pause) setPaused(!G.paused);
    const p = G.player;
    if (!G.paused) p.update(dt, inp);
    hud.board(inp.board, G.snap, G.snap?.players || [], G.myId);
    const W = WEAPONS[p.wpn];
    const g = vm.gun?.userData;
    const big = g?.scope?.big;
    const zoom = p.zoomNow || W.zoom || 1;
    // luneta 3D: fora da lente so um zoom leve; dentro da lente, o zoom de verdade
    const outer = big ? 1.2 : zoom;
    const fovT = (settings.fov + (p.tac ? 12 : p.sprint ? 6 : 0)) / (1 + (outer - 1) * p.adsK);
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-14 * realDt));
    camera.updateProjectionMatrix();
    vm.camera.fov = settings.vmFov - p.adsK * 12; vm.camera.updateProjectionMatrix();
    G.shakeAmt *= Math.exp(-7 * realDt);
    const sh = G.shakeAmt;
    if (p.alive) {
      // balanco de cabeca curto e so na vertical (o grosso do balanco e' da arma, como no COD)
      const bob = p.onGround && Math.hypot(p.vel[0], p.vel[2]) > 2 ? Math.abs(Math.sin(p.stepPhase)) * (p.sprint ? 0.03 : 0.016) * (1 - p.adsK) : 0;
      camera.position.set(p.pos[0], p.pos[1] + p.eye - bob, p.pos[2]);
      camera.rotation.set(p.pitch + (Math.random() - 0.5) * sh * 0.05, p.yaw + (Math.random() - 0.5) * sh * 0.05, p.roll);
    } else if (G.mode === 'bomb') {
      // fora da rodada: assiste um colega em primeira pessoa ou o mapa de cima
      const list = [...G.remotes.values()].filter(r => r.alive && !G.isEnemy(r));
      const S = G.spec || (G.spec = { i: 0, map: false });
      if (inp.firePressed || inp.jumpPressed) S.i++;
      if (inp.mapPressed || inp.wheel) S.map = !S.map;
      const r = list.length ? list[S.i % list.length] : null;
      for (const o of G.remotes.values()) o.char.root.visible = true;
      if (r && !S.map) {
        r.char.root.visible = false;
        camera.position.set(r.pos[0], r.pos[1] + 1.55, r.pos[2]);
        camera.rotation.set(r.pitch || 0, r.yaw, 0);
      } else {
        const A = G.M.arena;
        camera.position.lerp(tmpV.set(0, A * 1.35, A * 0.75), 1 - Math.exp(-3 * realDt));
        camera.lookAt(0, 0, 0);
      }
      $('deadBy').textContent = r && !S.map ? t('specWatching', { n: r.name }) : t('specMap');
      $('deadT').textContent = t('bombOutRound');
      $('deadGo').hidden = true;
    } else if (G.deathPos) {
      const kp = G.killer && posOf(G.killer);
      const look = kp ? tmpV.set(kp[0], kp[1] + 1, kp[2]) : tmpV.set(G.deathPos[0], G.deathPos[1], G.deathPos[2]);
      camera.position.lerp(new THREE.Vector3(G.deathPos[0], G.deathPos[1] + 5, G.deathPos[2] + 3), 1 - Math.exp(-2 * realDt));
      camera.lookAt(look);
      const me = G.me;
      const canGo = me && !me.alive && me.respawnT <= 0;
      $('deadT').textContent = me && me.respawnT > 0 ? t('backIn', { n: Math.ceil(me.respawnT) }) : canGo ? t('autoIn', { n: Math.max(1, Math.ceil(5 + me.respawnT)) }) : '';
      $('deadGo').hidden = !canGo; $('dead').classList.toggle('can', !!canGo);
      if (canGo && (inp.jumpPressed || inp.firePressed)) G.net?.send({ t: 'respawn' });
    }
    vm.update({ dt: realDt, moving: Math.hypot(p.vel[0], p.vel[2]) > 1.5 && p.onGround, speed: Math.hypot(p.vel[0], p.vel[2]), sprint: p.sprint, tac: p.tac, ads: p.adsK, crouch: p.crouch, air: !p.onGround, pistolSprint: p.sprint && p.wpn === 'pistol', lookDX: inp.lookX, lookDY: inp.lookY, firing: p.firing });
    vmPass.enabled = p.alive;
    const ru = vm.gun?.userData.mat?.userData?.u?.uReact; if (ru) ru.value = G.reactStage || 0;
    // ponto do laser no mundo: onde o centro da mira bate
    if (g?.laser && p.alive && !p.sprint && !p.tac) {
      const d = camera.getWorldDirection(tmpV2), o = p.eyePos();
      const hit = p.traceTargets(o, d.toArray(), 120);
      laserDot.position.set(hit.point[0] - d.x * 0.04, hit.point[1] - d.y * 0.04, hit.point[2] - d.z * 0.04);
      laserDot.material.color.setHex(g.laser.color);
      const sc = 0.07 + hit.dist * 0.0035; laserDot.scale.set(sc, sc, 1);
      laserDot.visible = true;
    } else laserDot.visible = false;
    hud.frame(p, realDt, settings);
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
    G.hurtFlash = Math.max(0, (G.hurtFlash || 0) - realDt * 1.2);
    const low = p.alive ? Math.max(0, (40 - p.hp) / 40) * 0.5 : 0.4;
    film.uniforms.hurt.value = Math.min(1, G.hurtFlash + low);
    G.flashT = Math.max(0, G.flashT - realDt);
    film.uniforms.flash.value = Math.min(1, G.flashT);
    if (big && p.adsK > 0.3 && p.alive) {
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
// dentro da Rovex (iframe) nao tem "instalar app": o service worker so existe no jogo solto
if ('serviceWorker' in navigator && !inRovex) navigator.serviceWorker.register('./sw.js').catch(() => {});
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('installApp').hidden = false; $('gateInstall').hidden = false; });
addEventListener('appinstalled', () => { installEvt = null; $('installApp').hidden = true; $('gateInstall').hidden = true; });
$('gateInstall').onclick = () => $('installApp').click();
$('installApp').onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => {});
  installEvt = null; $('installApp').hidden = true;
};

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
  const wake = () => { audio.init(); audio.music(true); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
})();
