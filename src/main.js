import * as THREE from 'three';
import { buildWorld, buildObjectives, FX } from './world.js';
import { Character } from './character.js';
import { ViewModel } from './viewmodel.js';
import { makePipeline } from './post.js';
import { Player } from './player.js';
import { pushSoon, me as rovexMe, inRovex } from './rovex.js';
import { Hud } from './hud.js';
import { Input, isTouch, buildTouch, applyHudLayout } from './input.js';
import { LocalNet, WsNet } from './net.js';
import { audio } from './audio.js';
import { MODES, WEAPONS, STREAKS, GUN_LADDER, PRIMARIES } from '../shared/weapons.js';
import { getMap, hasLOS } from '../shared/map.js';
import { loadArsenal, getLoadouts, scopeTarget } from './arsenal.js';
import { initMenus } from './ui.js';
import { t, wName, setLang, getLang } from './i18n.js';
import { addXp, XP, onProgress, progressInfo, partReq, partUnlocked, camoUnlocked, level } from './progress.js';
import { Lobby, runLoading, hideLoading } from './lobby.js';
import { track } from './challenges.js';
import { camoTime, CAMOS } from './camos.js';
import { CATEGORY, LASERS, partName, unlockedLoadout, buildGun } from './arsenal.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- ajustes ----------
const DEFAULTS = { v: 3, primary: 'smg', fov: 90, sens: 1, adsSens: 0.8, vmFov: 58, invertY: false, master: 0.8, music: 0.45, sfx: 1, grain: 0.6, film: 'color', res: isTouch ? 0.7 : 1, showFps: false, holdCrouch: false, tracer: 'chalk', autoSprint: false, name: '', aimAssist: true, autoFire: true };
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
const lobby = new Lobby({ onReady: (v) => G.net && G.net.send({ t: 'ready', v }), onStart: () => G.net && G.net.send({ t: 'start' }), onLeave: () => quitGame() });
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
const { composer, film, vmPass } = makePipeline(renderer, scene, camera, vm);

function applySettings() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * settings.res);
  resize();
  film.uniforms.grain.value = settings.grain;
  film.uniforms.mode.value = settings.film === 'bw' ? 0 : 1;
  audio.setVolumes({ master: settings.master, music: settings.music, sfx: settings.sfx });
  input.settings = settings;
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
// XP: soma na partida, mostra "+100 Nocaute" no meio da tela e avisa quando sobe de nivel
// evento de desafio: completou = XP + banner na hora
function chEvent(e) {
  if (G.state !== 'game') return;
  for (const c of track(e)) {
    G.matchXp = (G.matchXp || 0) + c.xp;
    addXp('challenge', c.xp);
    const r = c.reward;
    const name = r ? (r.slot === 'tracer' ? t('s_tracer') + ': ' + t('tr_' + r.id.slice(3)) : r.slot === 'camo' ? t('camo_' + r.id) : partName(r.slot, r.id)) : t('ch_' + c.id, { n: '', w: c.wpn ? wName(c.wpn) : '' }).replace(/\s+/g, ' ');
    const img = r && r.slot !== 'tracer' ? unlockShot({ slot: r.slot, id: r.id, wpn: r.wpn || G.player?.wpn || 'smg' }) : null;
    setTimeout(() => { hud.unlockBanner({ kind: t(r ? 'chUnlocked' : 'chDoneDaily'), name: name + ' +' + c.xp + ' XP', img }); audio.play(r ? 'unlock' : 'levelup', { vol: 0.7, ui: true, jitter: 0 }); }, 400);
    if (r) { G.loadouts = matchLoadouts(); sendLoadout(); }
  }
}

function gainXp(kind, wpn = null, mult = 1) {
  if (G.state !== 'game') return;
  const amount = Math.round((XP[kind] || 0) * mult);
  if (!amount) return;
  G.matchXp = (G.matchXp || 0) + amount;
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
  const lo = { ...(G.loadouts[u.wpn] || {}) };
  if (u.slot === 'body') { lo.body = u.id; lo.charger = null; } else lo[u.slot] = u.id;
  const gun = buildGun(u.wpn, lo);
  const lz = gun.userData.laser; if (lz) lz.beam.removeFromParent();
  const box = new THREE.Box3().setFromObject(gun), c = box.getCenter(new THREE.Vector3());
  gun.position.sub(c); shotScene.add(gun);
  const k = Math.max(box.max.z - box.min.z, (box.max.y - box.min.y) * 2) * 0.56;
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
  // banner estilo COD: um por vez, com a foto da arma ja com a peca/camuflagem nova
  got.slice(0, 3).forEach((u, i) => setTimeout(() => {
    hud.unlockBanner({ kind: t(u.slot === 'camo' ? 'unlCamo' : 'unlPart', { w: wName(u.wpn) }), name: u.name, img: unlockShot(u), more: i === 2 && got.length > 3 ? got.length - 3 : 0 });
    audio.play('unlock', { vol: 0.8, ui: true, jitter: 0 });
  }, 1100 + i * 3400));
});
window.__G = G; // atalho de depuracao
G.addXp = addXp;

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
  while (G.blimpMeshes.length < bl.length) { const m = fx.blimpMesh(bl[G.blimpMeshes.length].team); scene.add(m); G.blimpMeshes.push(m); }
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
        G.reactStage = 0;
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
        chEvent({ type: 'kill', wpn: e.wpn, head: !!e.head });
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
    case 'streakReady':
      if (e.id === G.myId && inGame) { hud.message(t('streakReady', { s: t('s_' + e.kind) }), 2.4); audio.play('pickup', { vol: 0.7, ui: true, rate: 0.8 }); }
      break;
    case 'streak':
      if (inGame) {
        const mine = e.id === G.myId, ally = MODES[G.mode].teams && e.team === G.myTeam;
        if (mine) { gainXp('streak'); vm.callStreak(e.kind); chEvent({ type: 'streak' }); }
        hud.message(t(mine || ally ? 'streakAlly' : 'streakEnemy', { s: t('s_' + e.kind), n: nameOf(e.id) }), 2.6);
        audio.play(mine || ally ? 'flag' : 'capture', { vol: 0.7, ui: true });
      }
      break;
    case 'lo':
      if (e.id !== G.myId) { G.remoteLo.set(e.id, e.los || {}); G.remoteTracer.set(e.id, e.tracer || 'chalk'); }
      break;
    case 'give':
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
  }
}

function showEnd(winner) {
  const won = winner === 'red' ? t('winRed') : winner === 'blue' ? t('winBlue') : winner === 'empate' ? t('draw') : t('winName', { n: winner });
  $('endWin').textContent = won;
  const ps = [...(G.snap?.players || [])].sort((a, b) => b.score - a.score).slice(0, 6);
  $('endBoard').innerHTML = ps.map(p => `<div><span>${esc(p.name)}</span><span>${t('endKills', { n: p.kills })}</span></div>`).join('');
  const pi = progressInfo();
  $('endBoard').insertAdjacentHTML('afterend', `<div class="end-xp" id="endXp">${t('xpTotal', { n: G.matchXp || 0 })} · ${t('playerLevel')} ${pi.level}<span class="xpbar"><i style="width:${pi.max ? 100 : Math.round(pi.into / pi.need * 100)}%"></i></span></div>`);
  G.matchXp = 0;
  $('theend').hidden = false;
  audio.play('flag', { vol: 0.8, ui: true });
  let n = 8;
  const tick = () => { if ($('theend').hidden) return; $('endNext').textContent = t('nextIn', { n }); if (n-- > 0) setTimeout(tick, 1000); };
  tick();
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
    if (G.state === 'lobby') lobby.render(m, G.myId);
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
  G.net.send({ t: 'loadout', primary: settings.primary, los, lvl: level(), tracer: settings.tracer });
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
  document.body.classList.add('ingame');
  $('hud').hidden = false;
  input.enabled = true;
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

// pausa: escolher a principal pro proximo renascimento (nao troca na hora)
function renderPausePick() {
  const gg = G.mode === 'gungame';
  $('pausePick').hidden = gg;
  if (gg) return;
  $('pkList').innerHTML = PRIMARIES.map(w => `<button role="radio" aria-checked="${settings.primary === w}" data-w="${w}"><img alt="" src="${unlockShot({ wpn: w, slot: 'camo', id: G.loadouts[w]?.camo || null }) || ''}"><span>${wName(w)}</span></button>`).join('');
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
    const fovT = (settings.fov + (p.tac ? 12 : p.sprint ? 6 : 0) + (p.slideT > 0 ? 6 : 0)) / (1 + (outer - 1) * p.adsK);
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-14 * realDt));
    camera.updateProjectionMatrix();
    vm.camera.fov = settings.vmFov - p.adsK * 12; vm.camera.updateProjectionMatrix();
    G.shakeAmt *= Math.exp(-7 * realDt);
    const sh = G.shakeAmt;
    if (p.alive) {
      const bob = p.onGround && Math.hypot(p.vel[0], p.vel[2]) > 2 ? Math.abs(Math.sin(p.stepPhase)) * 0.045 * (1 - p.adsK) : 0;
      camera.position.set(p.pos[0], p.pos[1] + p.eye - bob, p.pos[2]);
      camera.rotation.set(p.pitch + (Math.random() - 0.5) * sh * 0.05, p.yaw + (Math.random() - 0.5) * sh * 0.05, p.roll);
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
    vm.update({ dt: realDt, moving: Math.hypot(p.vel[0], p.vel[2]) > 1.5 && p.onGround, speed: Math.hypot(p.vel[0], p.vel[2]), sprint: p.sprint, tac: p.tac, ads: p.adsK, crouch: p.crouch, slide: p.slideT > 0, air: !p.onGround, lookDX: inp.lookX, lookDY: inp.lookY, firing: p.firing });
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
// toque em qualquer lugar da tela de morte tambem renasce
$('dead').addEventListener('pointerdown', (e) => { if (!$('deadGo').hidden) { e.preventDefault(); G.net?.send({ t: 'respawn' }); } });

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
// dentro da Rovex (iframe) nao tem "instalar app": o service worker so existe no jogo solto
if ('serviceWorker' in navigator && !inRovex) navigator.serviceWorker.register('./sw.js').catch(() => {});
let installEvt = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('installApp').hidden = false; });
addEventListener('appinstalled', () => { installEvt = null; $('installApp').hidden = true; });
$('installApp').onclick = async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice.catch(() => {});
  installEvt = null; $('installApp').hidden = true;
};

// ---------- partida ----------
(async () => {
  setLang(getLang());
  applySettings();
  await Promise.race([loadArsenal(), new Promise(r => setTimeout(r, 6000))]);
  await document.fonts.ready.catch(() => {});
  fx = new FX(scene);
  G.fx = fx;
  startAttract();
  irisEl.style.setProperty('--ir', '0vmax'); irisEl.dataset.r = 0;
  frame();
  iris(150, 1200);
  const wake = () => { audio.init(); audio.music(true); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);
})();
