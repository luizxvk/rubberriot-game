// Loja (03/11, pedido dele): vitrine estilo loja do Fortnite, preco em Zions Points da Rovex.
// Destaque da semana (1 grande, 1 pacote largo e 2 pequenos) + 4 ofertas do dia; cartao com a cor da raridade e a
// PREVIA 3D de verdade (arma com a camo, boneco com a skin; pacote = boneco com a skin segurando a arma com a camo).
// Popup do item: a mesma previa girando e animada. Catalogo e rodizio: shared/shop.js. O que o jogador tem: shopstore.js.
// Regra (vault: monetizacao.md): so aparencia. Comprar ainda e "em breve" (falta a compra no servidor da Rovex).
import { bannerHtml } from './banners.js';
import { attachCharm } from './charms.js';
import { danceLen } from './dances.js';
import { DanceFx } from './dancefx.js';
import * as THREE from 'three';
import { offscreen } from './offscreen.js';
import { t } from './i18n.js';
import { me, buyItem, redeemItem } from './rovex.js';
import { audio } from './audio.js';
import { SHOP_ITEMS, shopPrice as price, shopRotation as rotation } from '../shared/shop.js';
import { openZionBuy } from './zionbuy.js';
import { RET_ROW_LONG, buildGun, buildSight, getLoadouts, RET_PATH } from './arsenal.js';
import { WSKINS } from '../shared/weapons.js';
import { Character } from './character.js';
import { DEFAULT_LOOK } from '../shared/looks.js';
import { shopOwned } from './shopstore.js';
import { camoById } from './camos.js';
import { renderBal } from './zbal.js';

const $ = (id) => document.getElementById(id);
const COIN_SRC = import.meta.env.BASE_URL + 'brand/zion-points.png';
const coin = `<img class="zc" src="${COIN_SRC}" alt="" aria-hidden="true">`;
// icone enquanto a previa 3D nao fica pronta (Material Icons, Apache 2.0)
const ICON = {
  ret: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  camo: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  hat: 'M7 3h10v10H7zM3 14h18v3.5H3z',
  banner: 'M3 6h18v12H3zM6 9v6h7V9z', charm: 'M7 11c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5c0-.9-.24-1.75-.66-2.48L18 6.83V9h2V3h-6v2h2.17l-6.65 6.66A4.96 4.96 0 0 0 7 11zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z', face: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8.5 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM12 18c-2.3 0-4.3-1.5-5-3.5h10c-.7 2-2.7 3.5-5 3.5z', death: 'M12 2C7 2 3 5.6 3 10c0 2.8 1.6 5.2 4 6.6V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-3.4c2.4-1.4 4-3.8 4-6.6 0-4.4-4-8-9-8zM8.5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  dance: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
  skin: 'M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z',
  bundle: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
};
const svg = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k] || ICON.bundle}"/></svg>`;

const gives = (id) => SHOP_ITEMS[id].give.map(g => g.split(':'));
const giveOf = (id, slot) => gives(id).find(([s]) => s === slot)?.[1] || null;
export function itemName(id) {
  const it = SHOP_ITEMS[id];
  if (it.kind === 'bundle') return t('si_' + id);
  const [slot, v] = gives(id)[0];
  if (slot === 'dance') return t('dn_' + v);
  if (slot === 'banner') return t('bn_' + v);
  return slot === 'camo' ? t('camo_' + v) : slot === 'wskin' ? t('ws_' + v) : slot === 'ret' ? t('ret_' + v) : t('lk_' + slot + '_' + v);
}
const itemDesc = (id) => { const it = SHOP_ITEMS[id]; return it.kind === 'bundle' ? t('sid_' + id) : t(it.react ? 'shd_react' : 'shd_' + it.kind); }; // shd_camo / shd_skin / shd_hat
const kindName = (id) => t(SHOP_ITEMS[id].react ? 'shk_react' : 'shk_' + SHOP_ITEMS[id].kind);
const owned = (id) => SHOP_ITEMS[id].give.every(shopOwned);

const left = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
};
const fmt = (n) => n.toLocaleString(document.documentElement.lang || 'pt-BR');

// ---------- previa 3D: um renderizador so (foto dos cartoes e o giro do popup) ----------
let R = null, scene = null, cam = null;
const SHOT = new Map(); // id -> dataURL (uma foto por item na sessao)
function stage() {
  if (R) return;
  R = offscreen(); // o mesmo da foto de desbloqueio (um contexto WebGL so)
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 2.1));
  const dl = new THREE.DirectionalLight(0xffffff, 1.8); dl.position.set(2, 3, 3); scene.add(dl);
  cam = new THREE.PerspectiveCamera(30, 1, 0.02, 60);
}
const WPN = 'rifle';
// monta o que o item mostra (03/11): so camo = a arma sozinha; skin = o boneco PADRAO so com a skin (nada do que o
// jogador veste), sem arma, na pose de vitrine; pacote = o boneco com a skin e a arma com a camo flutuando do lado
function gunModel(camo, ws = null) {
  const W = ws && WSKINS[ws], wpn = W ? W.wpn : WPN;
  const lo = W ? { body: W.of, ws, scope: null, laser: null } : { ...(getLoadouts()[WPN] || {}), scope: null, laser: null }; // so na Loja: arma limpa, sem mira red dot nem laser (pedido dele)
  if (camo) lo.camo = camo;
  const gun = buildGun(wpn, lo);
  const lz = gun.userData.laser; if (lz) lz.beam.removeFromParent();
  const box = new THREE.Box3().setFromObject(gun), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  gun.position.sub(c);
  const holder = new THREE.Group(); holder.add(gun);
  return { holder, r: Math.max(size.x, size.y, size.z) * 0.5 };
}
// reticula na vitrine (04/11): a mira de verdade com a reticula no vidro, vista de tras. Sem as pecas carregadas, so o vidro
function retModel(id) {
  const sight = buildSight(id, 'red', RET_ROW_LONG.includes(id) ? 'sniper_scope_1' : undefined); // 05/11: retícula de sniper aparece numa luneta
  if (sight) {
    sight.rotation.y = Math.PI / 2; // o olho (+z) vira pra camera (+x)
    const box = new THREE.Box3().setFromObject(sight), size = box.getSize(new THREE.Vector3()), holder = new THREE.Group();
    // luneta (05/11): o vidro ja fica na origem; a camera olha de frente pra ocular, com a retícula no meio (centralizar pela caixa jogava o vidro pra borda)
    if (RET_ROW_LONG.includes(id)) { holder.add(sight); return { obj: holder, gun: true, sway: true, r: size.y * 0.42, depth: 0 }; }
    sight.position.sub(box.getCenter(new THREE.Vector3())); holder.add(sight);
    return { obj: holder, gun: true, sway: true, r: Math.max(size.y, size.z) * 0.55, depth: size.x * 0.5 }; // depth: a mira e comprida na direcao da camera
  }
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), P = RET_PATH[id], red = '#e0483a';
  g.fillStyle = '#ece9e1'; g.strokeStyle = '#141210'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 118, 0, 6.3); g.fill(); g.stroke();
  g.translate(128, 128); g.scale(6, 6); g.translate(-12, -12); g.lineWidth = 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = red; g.fillStyle = red;
  if (P?.s) g.stroke(new Path2D(P.s)); if (P?.f) g.fill(new Path2D(P.f), 'evenodd');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })); m.rotation.y = Math.PI / 2;
  const holder = new THREE.Group(); holder.add(m);
  return { obj: holder, gun: true, sway: true, r: 0.5 };
}
function bannerModel(v) { // foto do cartao: o desenho do banner num plano (o popup mostra o animado por cima)
  const holder = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.96), mat); m.rotation.y = Math.PI / 2; holder.add(m);
  const svgTxt = bannerHtml(v, { plain: true }).match(/<svg[\s\S]*<\/svg>/)[0].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="192" ');
  // 05/11: a foto do cartao espera o desenho carregar (saia branca e ficava guardada assim)
  const ready = new Promise(res => new THREE.TextureLoader().load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTxt), (tx) => { tx.colorSpace = THREE.SRGBColorSpace; mat.map = tx; mat.needsUpdate = true; res(); }, undefined, res));
  return { obj: holder, gun: true, sway: true, r: 1.5, banner: v, ready };
}
// morte: a foto do cartao pega o meio da animacao (o popup e' que vive em ciclo, igual o Visual)
function deathPhoto(ch) { const p = { anim: 'pose', speed: 0, t: 0, pitch: 0 }; ch.update(0.016, { ...p, alive: true }); for (let i = 0; i < 16; i++) ch.update(0.016, { ...p, alive: false }); }
function pieceModel(slot, v) { // uma peca so: camo = a arma; skin/chapeu = o boneco padrao com aquela peca
  if (slot === 'banner') return bannerModel(v);
  if (slot === 'charm') { const g = gunModel(null); attachCharm(g.holder.children[0], v, 1); return { obj: g.holder, gun: true, r: g.r }; }
  if (slot === 'ret') return retModel(v);
  if (slot === 'camo') { const g = gunModel(v); return { obj: g.holder, gun: true, r: g.r }; }
  if (slot === 'wskin') { const g = gunModel(null, v); return { obj: g.holder, gun: true, r: g.r }; } // skin de modelo (04/11): a arma ja com o modelo novo
  const ch = new Character('red', '', slot === 'dance' ? DEFAULT_LOOK : { ...DEFAULT_LOOK, [slot]: v });
  ch.tag.visible = false; if (ch.shadow) ch.shadow.visible = false;
  // dança: a foto do cartao pega o meio do movimento; o popup dança em loop com o efeito
  ch.update(0.016, slot === 'dance' ? { anim: 'dance', dance: v, danceT: danceLen(v) * 0.42, alive: true, speed: 0, t: 0, pitch: 0 } : { anim: 'pose', alive: true, speed: 0, t: 0, pitch: 0 });
  const root = new THREE.Group(); root.add(ch.root);
  return { obj: root, ch, gun: false, dance: slot === 'dance' ? v : null, death: slot === 'death' ? v : null };
}
// item avulso = 1 modelo; pacote = 1 modelo por peca (a previa desliza de uma pra outra em loop)
// um conjunto por item na sessao: cada popup novo montava tudo de novo e a geometria acumulava (bateria de 04/11: +186 em 30 aberturas)
const MODELS = new Map();
const buildModels = (id) => { if (!MODELS.has(id)) MODELS.set(id, gives(id).map(([s, v]) => pieceModel(s, v))); return MODELS.get(id); };
function frame(m, w, h, yaw) {
  cam.aspect = w / h; cam.updateProjectionMatrix();
  if (m.gun) { const d = m.r / Math.tan(THREE.MathUtils.degToRad(15)) * 1.15 + (m.depth || 0); cam.position.set(d, m.sway ? 0 : m.r * 0.35, 0); cam.lookAt(0, 0, 0); m.obj.rotation.y = m.sway ? Math.sin(yaw) * 0.42 - 0.3 : yaw; } // mira balanca: de costas o vidro some
  else { cam.position.set(m.side ? 0.3 : 0, 1.3, m.side ? 7.4 : 6.2); cam.lookAt(m.side ? 0.3 : 0, 1.1, 0); m.obj.rotation.y = Math.PI + yaw * (m.side ? 0.35 : 1); if (m.side) m.side.rotation.y = yaw * 2.2; }
}
// estagio da camo reativa (0 a 3). Na partida sobe com os abates; aqui a foto mostra o ultimo e o popup passa por todos
const setStage = (obj, n) => obj.traverse(o => { const u = o.material?.userData?.u?.uReact; if (u) u.value = n; });
async function snapshot(id) { // uma foto por peca (pacote = varias, o cartao desliza entre elas)
  if (SHOT.has(id)) return SHOT.get(id);
  stage();
  const W = 256, H = 256, urls = [];
  for (const m of buildModels(id)) {
    if (m.ready) await m.ready;
    // compila em paralelo ANTES de desenhar: compilar no render travava a tela ate 2 s por camo nova (Direct3D)
    scene.add(m.obj); if (R.compileAsync) await Promise.race([R.compileAsync(scene, cam).catch(() => {}), new Promise(r => setTimeout(r, 4000))]); scene.remove(m.obj); // 08/11: o compileAsync do three pode nunca terminar (material trocado no meio)
    if (live) continue; // popup aberto usa o mesmo renderizador: nao mexe no tamanho dele agora
    R.setSize(W, H, false);
    if (m.death) deathPhoto(m.ch);
    frame(m, W, H, m.gun ? 0 : -0.5); setStage(m.obj, 3);
    scene.add(m.obj); R.render(scene, cam); scene.remove(m.obj);
    urls.push(R.domElement.toDataURL('image/png'));
  }
  if (urls.length === buildModels(id).length) SHOT.set(id, urls);
  return urls;
}
// fotos dos cartoes uma por quadro (compilar a camo de 8 armas de uma vez travava a tela), e so quando o cartao chega perto da vista
let shotQ = [], pumping = false, shotIO = null;
function watchShots(pane) {
  shotIO?.disconnect(); shotQ = [];
  shotIO = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { shotIO.unobserve(e.target); shotQ.push(e.target); }
    if (shotQ.length && !pumping) { pumping = true; requestAnimationFrame(pumpShots); }
  }, { root: pane, rootMargin: '400px 0px' });
  pane.querySelectorAll('.shop-tile').forEach(b => shotIO.observe(b));
}
async function pumpShots() {
  if (live) { setTimeout(pumpShots, 300); return; } // popup aberto: a fila espera
  const el = shotQ.shift();
  if (!el) { pumping = false; return; }
  if (el.isConnected) {
    try {
      const urls = await snapshot(el.dataset.item), a = el.querySelector('.st-art');
      if (!urls.length) { shotQ.unshift(el); requestAnimationFrame(pumpShots); return; } // abriu o popup no meio: tenta depois
      a.classList.add('img');
      a.innerHTML = urls.length > 1 ? `<span class="st-slides" style="--n:${urls.length}">${urls.map(u => `<img src="${u}" alt="">`).join('')}</span>` : `<img src="${urls[0]}" alt="">`;
    } catch (e) { console.warn('previa da loja', e); }
  }
  requestAnimationFrame(pumpShots);
}
// cartao de pacote: a cada 3 s desliza pra proxima peca, em loop
let slideI = 0;
function slideTiles() {
  slideI++;
  document.querySelectorAll('#shopPane .st-slides').forEach(s => { const n = s.children.length; s.style.transform = `translateX(${-(slideI % n) * 100 / n}%)`; });
}

// foto de uma peca qualquer (popup do Elite: as skins de verdade do pack, a camo, o visual)
export async function pieceShot(slot, v) {
  const key = 'pc:' + slot + ':' + v;
  if (!SHOT.has(key)) { stage(); MODELS.set(key, [pieceModel(slot, v)]); SHOT.set(key, null); }
  const had = SHOT.get(key); if (had?.length) return had[0];
  SHOT.delete(key);
  return (await snapshot(key))[0] || null;
}
// giro do popup; pacote: cada peca fica 3 s girando e desliza pra proxima (sai pela esquerda, a outra entra pela direita)
let live = null, raf = 0, shopFx = null;
const HOLD = 3, SLIDE = 0.7;
function startLive(id, host) {
  stage();
  const ms = buildModels(id), w = Math.max(120, host.clientWidth), h = Math.max(120, host.clientHeight);
  R.setSize(w, h, false);
  R.domElement.className = 'sp-live';
  host.appendChild(R.domElement);
  live = { ms, t: 0, w, h, stage: -1, pips: host.querySelector('.sp-stages') };
  { const d = ms.find(m => m.dance); if (d) audio.dance(d.dance); const bn = ms.find(m => m.banner); if (bn) host.insertAdjacentHTML('beforeend', `<div class="sp-bnr">${bannerHtml(bn.banner, { plain: true })}</div>`); }
  let last = performance.now();
  const draw = (m, ox) => { // desenha uma peca deslocada ox pixels na horizontal
    R.setViewport(ox, 0, live.w, live.h); R.setScissor(ox, 0, live.w, live.h);
    scene.add(m.obj); R.render(scene, cam); scene.remove(m.obj);
  };
  const loop = (now) => {
    if (!live) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; live.t += dt; // max 0: o 1o quadro do rAF pode vir antes do performance.now()
    const n = live.ms.length, per = HOLD + SLIDE, cyc = live.t % (per * n), i = Math.min(n - 1, Math.floor(cyc / per)), k = Math.min(per, cyc - i * per); // min: arredondamento no fim do ciclo passava do ultimo
    const s = n > 1 && k > HOLD ? (k - HOLD) / SLIDE : 0, e = s * s * (3 - 2 * s); // ease
    for (const m of live.ms) if (m.ch) {
      if (m.dance) { const T = live.t % danceLen(m.dance); if (Math.floor(live.t / danceLen(m.dance)) !== (m.loopN ?? 0)) { m.loopN = Math.floor(live.t / danceLen(m.dance)); audio.dance(m.dance); } m.ch.update(dt, { anim: 'dance', dance: m.dance, danceT: T, alive: true, speed: 0, t: live.t, pitch: 0 }); (shopFx ||= new DanceFx(scene)).tick(m.ch, m.dance, T); }
      else if (m.death) m.ch.update(dt, { anim: 'pose', alive: live.t % 2.8 < 1.2, speed: 0, t: live.t, pitch: 0 }); // morre e volta, em ciclo
      else m.ch.update(dt, { anim: 'pose', alive: true, speed: 0, t: live.t, pitch: 0 });
    }
    shopFx?.update(dt);
    const st = Math.floor(live.t / 1.6) % 4; // reativa: mesmo ritmo da vitrine do Arsenal
    if (st !== live.stage) {
      live.stage = st; for (const m of live.ms) setStage(m.obj, st);
      if (live.pips) { live.pips.querySelector('small').textContent = t('shopStage', { n: st + 1 }); live.pips.querySelectorAll('i').forEach((p, j) => p.classList.toggle('on', j <= st)); }
    }
    R.setScissorTest(false); R.autoClear = false; R.clear(); R.setScissorTest(true); // limpa a tela INTEIRA (com o recorte ligado so limpava o pedaco da ultima peca e sobrava rastro)
    const cur = live.ms[i]; frame(cur, live.w, live.h, live.t * 0.6); draw(cur, Math.round(-e * live.w));
    if (e > 0) { const nx = live.ms[(i + 1) % n]; frame(nx, live.w, live.h, live.t * 0.6); draw(nx, Math.round((1 - e) * live.w)); }
    R.setScissorTest(false); R.autoClear = true; R.setViewport(0, 0, live.w, live.h);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
// previa dos premios da rankeada (05/11): as mesmas pecas da Loja, na arma do jogador ou no boneco. i < 0 desliga
export function prizePreview(i, show, host) {
  stopLive();
  if (i < 0 || !show?.length) return;
  const key = 'rk:' + i;
  stage();
  if (!MODELS.has(key)) MODELS.set(key, show.map(g => { const k = g.indexOf(':'); return pieceModel(g.slice(0, k), g.slice(k + 1)); }));
  try { startLive(key, host); } catch (e) { console.warn('previa do premio', e); }
}
function stopLive() {
  cancelAnimationFrame(raf); shopFx?.clear(); audio.danceStop();
  live = null;
  R?.domElement.remove();
}
// ---------- vitrine ----------
const canRedeem = (id) => !!SHOP_ITEMS[id]?.elite && !!me?.elite && !owned(id); // Elite resgata de graca (05/11)
function tile(id, size, newTag) {
  const it = SHOP_ITEMS[id], mine = owned(id), name = itemName(id);
  return `<button class="shop-tile r-${it.r} ${size} ${mine ? 'owned' : ''}" data-item="${id}" aria-label="${name}, ${t('rar_' + it.r)}, ${mine ? t('shopOwned') : fmt(price(id)) + ' Zions Points'}">
    <span class="st-bg"></span><span class="st-art">${svg(it.kind)}</span>
    ${mine ? `<span class="st-tag own">${t('shopOwned')}</span>` : newTag ? `<span class="st-tag">${t('shopNew')}</span>` : ''}
    <span class="st-foot"><b>${name}</b><small>${kindName(id)}</small><em class="st-price">${mine ? '' : canRedeem(id) ? t('shopRedeem') : coin + fmt(price(id))}</em></span>
  </button>`;
}

let timer = 0, opener = null, curItem = null, confirming = false, buying = false, onBought = null;
export const setOnBought = (f) => { onBought = f; }; // quem usa a compra na hora (loadout/visual) se avisa por aqui
function tick() {
  const R2 = rotation(), now = Date.now();
  const a = $('shopWeekLeft'), b = $('shopDayLeft');
  if (a) a.textContent = left(R2.weekEnd - now);
  if (b) b.textContent = left(R2.dayEnd - now);
  if (now >= R2.dayEnd - 500) setTimeout(renderShop, 1000); // virou o dia com a loja aberta: troca as ofertas
  if (Math.floor(now / 1000) % 3 === 0) slideTiles();
}

export function renderShop() {
  const pane = $('shopPane'); if (!pane) return;
  const RT = rotation(), keepY = pane.scrollTop;
  renderBal($('shopBal')); // Zions Points e Zions Cash no canto (zbal.js)
  { const zb = $('shopBuyZ'); zb.setAttribute('aria-label', t('zbAdd')); zb.title = t('zbAdd'); zb.onclick = () => openZionBuy(zb); }
  pane.innerHTML = `
    <section class="shop-sec" aria-labelledby="shopFeatH">
      <header><h3 id="shopFeatH">${t('shopFeat')}</h3><span class="shop-left">${t('shopChanges')} <b id="shopWeekLeft"></b></span></header>
      <div class="shop-grid feat">${tile(RT.featured[0], 'hero', true)}${tile(RT.featured[1], 'wide', true)}${tile(RT.featured[2], '', false)}${tile(RT.featured[3], '', false)}</div>
    </section>
    <section class="shop-sec" aria-labelledby="shopDayH">
      <header><h3 id="shopDayH">${t('shopDaily')}</h3><span class="shop-left">${t('shopChanges')} <b id="shopDayLeft"></b></span></header>
      <div class="shop-grid daily">${RT.daily.map(id => tile(id, '', false)).join('')}</div>
    </section>
    ${RT.shelves.map(s => `<section class="shop-sec" aria-labelledby="shopSh_${s.k}">
      <header><h3 id="shopSh_${s.k}">${t('shopShelf_' + s.k)}</h3><span class="shop-left">${t('shopWeekly')}</span></header>
      <div class="shop-grid">${s.items.map(id => tile(id, '', false)).join('')}</div>
    </section>`).join('')}
    <p class="shop-note">${t('shopNote')}</p>`;
  pane.querySelectorAll('.shop-tile').forEach(b => {
    b.onclick = () => { audio.play('ui_click', { ui: true }); openItem(b.dataset.item, b); };
    b.addEventListener('pointerenter', () => audio.play('ui_hover', { ui: true, vol: 0.35, key: 'hover', max: 1 }));
  });
  pane.scrollTop = keepY; // comprar redesenha a vitrine: nao volta pro topo
  watchShots(pane);
  tick();
  clearInterval(timer); timer = setInterval(tick, 1000);
}
export function stopShop() { clearInterval(timer); timer = 0; shotIO?.disconnect(); shotQ = []; closeItem(false); const c = $('buyCine'); if (c && !c.hidden) { stopLive(); c.hidden = true; c.classList.remove('out'); } }

function openItem(id, from) {
  const it = SHOP_ITEMS[id], pop = $('shopPop'), mine = owned(id);
  opener = from; curItem = id; confirming = false; $('shopBuy').classList.remove('confirm');
  const art = pop.querySelector('.sp-art');
  art.className = `sp-art r-${it.r}`;
  art.innerHTML = '<span class="st-bg"></span>' + (it.react ? '<span class="sp-stages" aria-hidden="true"><small></small><span><i></i><i></i><i></i><i></i></span></span>' : '');
  $('shopPopRar').textContent = it.kind === 'bundle' ? t('rar_' + it.r) : t('rar_' + it.r) + ' \u00b7 ' + kindName(id);
  $('shopPopRar').className = `sp-rar r-${it.r}`;
  $('shopPopName').textContent = itemName(id);
  $('shopPopDesc').textContent = itemDesc(id);
  // pills do que vem na compra (item unico = 1; pacote = cada peca), cada uma com o tipo
  $('shopPopGives').setAttribute('aria-label', t('shopIncl'));
  $('shopPopGives').innerHTML = gives(id).map(([s, v]) => `<li class="sp-pill ${s}">${svg(s === 'wskin' ? 'camo' : s)}<b>${s === 'banner' ? t('bn_' + v) : s === 'dance' ? t('dn_' + v) : s === 'camo' ? t('camo_' + v) : s === 'wskin' ? t('ws_' + v) : s === 'ret' ? t('ret_' + v) : t('lk_' + s + '_' + v)}</b><small>${t(s === 'camo' && camoById(v).react ? 'shk_react' : 'shk_' + s)}</small></li>`).join('');
  $('shopPopPrice').innerHTML = mine ? t('shopOwned') : canRedeem(id) ? t('shopEliteFree') : coin + fmt(price(id));
  $('shopBuy').textContent = t(mine ? 'shopOwned' : canRedeem(id) ? 'shopRedeem' : 'shopBuy');
  $('shopBuy').disabled = mine;
  pop.hidden = false;
  try { startLive(id, art); } catch (e) { console.warn('previa da loja', e); }
  $('shopBuy').focus({ preventScroll: true });
}
// cena de compra (05/11, pedido dele): item em tela cheia, nome e raridade, no fundo em quadrinho da Loja. A animacao mora no CSS
// (so transform e opacity, pra ficar lisa); aqui so abre e fecha. Trava de 450 ms: o clique que comprou nao fecha a cena sem querer
let cineAt = 0, cineTimer = 0;
export function openCine(id, redeemed) {
  const c = $('buyCine'), it = SHOP_ITEMS[id], giveList = $('shopPopGives').innerHTML, back = opener;
  closeItem(false); opener = back;
  clearTimeout(cineTimer);
  c.className = `buy-cine r-${it.r}`;
  $('bcKicker').textContent = t(redeemed ? 'shopCineRedeemed' : 'shopCineGot');
  $('bcName').textContent = itemName(id);
  $('bcRar').textContent = it.kind === 'bundle' ? t('rar_' + it.r) : t('rar_' + it.r) + ' \u00b7 ' + kindName(id);
  $('bcGives').innerHTML = it.kind === 'bundle' ? giveList : '';
  $('bcGives').hidden = it.kind !== 'bundle';
  const art = $('bcArt'); art.innerHTML = '';
  c.hidden = false; cineAt = performance.now();
  void c.offsetWidth; // reinicia as animacoes quando compra dois itens em seguida
  try { startLive(id, art); } catch (e) { console.warn('cena de compra', e); art.innerHTML = `<span class="st-art">${svg(it.kind)}</span>`; }
  $('bcClose').focus({ preventScroll: true });
}
function closeCine() {
  const c = $('buyCine');
  if (!c || c.hidden || c.classList.contains('out') || performance.now() - cineAt < 450) return;
  audio.play('ui_back', { ui: true });
  c.classList.add('out');
  stopLive();
  cineTimer = setTimeout(() => { c.hidden = true; c.classList.remove('out'); if (opener?.isConnected) opener.focus({ preventScroll: true }); opener = null; }, 240);
}
function closeItem(back = true) {
  const pop = $('shopPop'); if (!pop || pop.hidden) return;
  stopLive();
  pop.hidden = true;
  if (back && opener?.isConnected) opener.focus({ preventScroll: true });
  opener = null;
}

export function initShop() {
  const pop = $('shopPop'); if (!pop) return;
  const bc = document.querySelector('#shopBal .zc'); if (bc) bc.src = COIN_SRC;
  document.body.appendChild($('buyCine')); // tela cheia de verdade: dentro do cartao o fixed ficava preso nele
  $('buyCine').onclick = closeCine;
  addEventListener('keydown', (e) => { if ($('buyCine').hidden) return; if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); closeCine(); } }, true);
  pop.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closeItem(); };
  pop.addEventListener('click', (e) => { if (e.target === pop) closeItem(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); closeItem(); } }); // Esc fecha so o item (a tela de tras ve defaultPrevented e fica)
  // compra em Zions Points (03/11): 1o toque pede confirmacao com o preco, o 2o compra no servidor da Rovex
  $('shopBuy').onclick = async () => {
    const id = curItem, b = $('shopBuy'), msg = $('shopPopSoon');
    if (!id || owned(id) || buying) return;
    const redeem = canRedeem(id);
    if (!confirming && !redeem) { confirming = true; b.textContent = t('shopConfirm', { n: fmt(price(id)) }); b.classList.add('confirm'); audio.play('ui_click', { ui: true }); return; }
    buying = true; b.disabled = true; b.textContent = t('shopBuying');
    const r = await (redeem ? redeemItem(id) : buyItem(id));
    buying = false; confirming = false; b.classList.remove('confirm');
    if (r.ok) {
      audio.play('unlock', { ui: true, vol: 0.8, jitter: 0 });
      const pane = $('shopPane'); if (pane) { const keep = opener?.dataset.item; renderShop(); opener = pane.querySelector(`[data-item="${keep}"]`) || opener; }
      onBought?.();
      openCine(id, redeem);
      return;
    }
    audio.play('empty', { ui: true, vol: 0.5 });
    b.disabled = false; b.textContent = t(redeem ? 'shopRedeem' : 'shopBuy');
    msg.hidden = false; msg.className = 'sp-soon';
    msg.innerHTML = r.code === 'sem_saldo' ? `${t('shopNoFunds', { n: fmt(r.preco ?? price(id)), s: fmt(r.saldo ?? 0) })} <button class="sp-getz" id="shopGetZ">${t('zbAdd')}</button>`
      : r.code === 'login' ? t('shopLogin') : r.code === 'sem_elite' ? t('shopNeedElite') : r.code === 'ja_tem' ? t('shopOwned') : t('shopErr');
    const gz = $('shopGetZ'); if (gz) gz.onclick = () => openZionBuy(gz);
  };
  new MutationObserver(() => { if (pop.hidden) $('shopPopSoon').hidden = true; }).observe(pop, { attributes: true, attributeFilter: ['hidden'] });
}
// a lista do que comprou chegou (ou mudou): redesenha a vitrine aberta pra mostrar "Ja e seu"
addEventListener('rovex-me', () => { const s = document.getElementById('scr-shop'); if (s && !s.hidden) renderShop(); });
