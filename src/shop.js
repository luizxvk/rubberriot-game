// Loja (03/11, pedido dele): vitrine estilo loja do Fortnite, preco em Zions Points da Rovex.
// Destaque da semana (1 grande, 1 pacote largo e 2 pequenos) + 4 ofertas do dia; cartao com a cor da raridade e a
// PREVIA 3D de verdade (arma com a camo, boneco com a skin; pacote = boneco com a skin segurando a arma com a camo).
// Popup do item: a mesma previa girando e animada. Catalogo e rodizio: shared/shop.js. O que o jogador tem: shopstore.js.
// Regra (vault: monetizacao.md): so aparencia. Comprar ainda e "em breve" (falta a compra no servidor da Rovex).
import * as THREE from 'three';
import { offscreen } from './offscreen.js';
import { t } from './i18n.js';
import { me, buyItem } from './rovex.js';
import { audio } from './audio.js';
import { SHOP_ITEMS, shopPrice as price, shopRotation as rotation } from '../shared/shop.js';
import { buildGun, getLoadouts } from './arsenal.js';
import { Character } from './character.js';
import { DEFAULT_LOOK } from '../shared/looks.js';
import { shopOwned } from './shopstore.js';
import { renderBal } from './zbal.js';

const $ = (id) => document.getElementById(id);
const COIN_SRC = import.meta.env.BASE_URL + 'brand/zion-points.png';
const coin = `<img class="zc" src="${COIN_SRC}" alt="" aria-hidden="true">`;
// icone enquanto a previa 3D nao fica pronta (Material Icons, Apache 2.0)
const ICON = {
  camo: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  hat: 'M7 3h10v10H7zM3 14h18v3.5H3z',
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
  return slot === 'camo' ? t('camo_' + v) : t('lk_' + slot + '_' + v);
}
const itemDesc = (id) => { const it = SHOP_ITEMS[id]; return it.kind === 'bundle' ? t('sid_' + id) : t(it.give[0] === 'camo:ember' ? 'shd_react' : 'shd_' + it.kind); }; // shd_camo / shd_skin / shd_hat
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
function gunModel(camo) {
  const lo = { ...(getLoadouts()[WPN] || {}), scope: null, laser: null }; // so na Loja: arma limpa, sem mira red dot nem laser (pedido dele)
  if (camo) lo.camo = camo;
  const gun = buildGun(WPN, lo);
  const lz = gun.userData.laser; if (lz) lz.beam.removeFromParent();
  const box = new THREE.Box3().setFromObject(gun), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  gun.position.sub(c);
  const holder = new THREE.Group(); holder.add(gun);
  return { holder, r: Math.max(size.x, size.y, size.z) * 0.5 };
}
function pieceModel(slot, v) { // uma peca so: camo = a arma; skin/chapeu = o boneco padrao com aquela peca
  if (slot === 'camo') { const g = gunModel(v); return { obj: g.holder, gun: true, r: g.r }; }
  const ch = new Character('red', '', { ...DEFAULT_LOOK, [slot]: v });
  ch.tag.visible = false; if (ch.shadow) ch.shadow.visible = false;
  ch.update(0.016, { anim: 'pose', alive: true, speed: 0, t: 0, pitch: 0 });
  const root = new THREE.Group(); root.add(ch.root);
  return { obj: root, ch, gun: false };
}
// item avulso = 1 modelo; pacote = 1 modelo por peca (a previa desliza de uma pra outra em loop)
const buildModels = (id) => gives(id).map(([s, v]) => pieceModel(s, v));
function frame(m, w, h, yaw) {
  cam.aspect = w / h; cam.updateProjectionMatrix();
  if (m.gun) { const d = m.r / Math.tan(THREE.MathUtils.degToRad(15)) * 1.15; cam.position.set(d, m.r * 0.35, 0); cam.lookAt(0, 0, 0); m.obj.rotation.y = yaw; }
  else { cam.position.set(m.side ? 0.3 : 0, 1.3, m.side ? 7.4 : 6.2); cam.lookAt(m.side ? 0.3 : 0, 1.1, 0); m.obj.rotation.y = Math.PI + yaw * (m.side ? 0.35 : 1); if (m.side) m.side.rotation.y = yaw * 2.2; }
}
function snapshot(id) { // uma foto por peca (pacote = varias, o cartao desliza entre elas)
  if (SHOT.has(id)) return SHOT.get(id);
  stage();
  const W = 256, H = 256, urls = [];
  R.setSize(W, H, false);
  for (const m of buildModels(id)) {
    frame(m, W, H, m.gun ? 0 : -0.5);
    scene.add(m.obj); R.render(scene, cam); scene.remove(m.obj);
    urls.push(R.domElement.toDataURL('image/png'));
  }
  SHOT.set(id, urls);
  return urls;
}
// fotos dos cartoes uma por quadro (compilar a camo de 8 armas de uma vez travava a tela)
let shotQ = [];
function pumpShots() {
  const el = shotQ.shift();
  if (!el) return;
  if (el.isConnected) {
    try {
      const urls = snapshot(el.dataset.item), a = el.querySelector('.st-art');
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

// giro do popup; pacote: cada peca fica 3 s girando e desliza pra proxima (sai pela esquerda, a outra entra pela direita)
let live = null, raf = 0;
const HOLD = 3, SLIDE = 0.7;
function startLive(id, host) {
  stage();
  const ms = buildModels(id), w = Math.max(120, host.clientWidth), h = Math.max(120, host.clientHeight);
  R.setSize(w, h, false);
  R.domElement.className = 'sp-live';
  host.appendChild(R.domElement);
  live = { ms, t: 0, w, h };
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
    for (const m of live.ms) if (m.ch) m.ch.update(dt, { anim: 'pose', alive: true, speed: 0, t: live.t, pitch: 0 });
    R.setScissorTest(false); R.autoClear = false; R.clear(); R.setScissorTest(true); // limpa a tela INTEIRA (com o recorte ligado so limpava o pedaco da ultima peca e sobrava rastro)
    const cur = live.ms[i]; frame(cur, live.w, live.h, live.t * 0.6); draw(cur, Math.round(-e * live.w));
    if (e > 0) { const nx = live.ms[(i + 1) % n]; frame(nx, live.w, live.h, live.t * 0.6); draw(nx, Math.round((1 - e) * live.w)); }
    R.setScissorTest(false); R.autoClear = true; R.setViewport(0, 0, live.w, live.h);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function stopLive() {
  cancelAnimationFrame(raf);
  live = null;
  R?.domElement.remove();
}
// ---------- vitrine ----------
function tile(id, size, newTag) {
  const it = SHOP_ITEMS[id], mine = owned(id), name = itemName(id);
  return `<button class="shop-tile r-${it.r} ${size} ${mine ? 'owned' : ''}" data-item="${id}" aria-label="${name}, ${t('rar_' + it.r)}, ${mine ? t('shopOwned') : fmt(price(id)) + ' Zions Points'}">
    <span class="st-bg"></span><span class="st-art">${svg(it.kind)}</span>
    ${mine ? `<span class="st-tag own">${t('shopOwned')}</span>` : newTag ? `<span class="st-tag">${t('shopNew')}</span>` : ''}
    <span class="st-foot"><b>${name}</b><small>${t('shk_' + it.kind)}</small><em class="st-price">${mine ? '' : coin + fmt(price(id))}</em></span>
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
  const RT = rotation();
  renderBal($('shopBal')); // Zions Points e Zions Cash no canto (zbal.js)
  pane.innerHTML = `
    <section class="shop-sec" aria-labelledby="shopFeatH">
      <header><h3 id="shopFeatH">${t('shopFeat')}</h3><span class="shop-left">${t('shopChanges')} <b id="shopWeekLeft"></b></span></header>
      <div class="shop-grid feat">${tile(RT.featured[0], 'hero', true)}${tile(RT.featured[1], 'wide', true)}${tile(RT.featured[2], '', false)}${tile(RT.featured[3], '', false)}</div>
    </section>
    <section class="shop-sec" aria-labelledby="shopDayH">
      <header><h3 id="shopDayH">${t('shopDaily')}</h3><span class="shop-left">${t('shopChanges')} <b id="shopDayLeft"></b></span></header>
      <div class="shop-grid daily">${RT.daily.map(id => tile(id, '', false)).join('')}</div>
    </section>
    <p class="shop-note">${t('shopNote')}</p>`;
  pane.querySelectorAll('.shop-tile').forEach(b => {
    b.onclick = () => { audio.play('ui_click', { ui: true }); openItem(b.dataset.item, b); };
    b.addEventListener('pointerenter', () => audio.play('ui_hover', { ui: true, vol: 0.35, key: 'hover', max: 1 }));
  });
  const was = shotQ.length; shotQ = [...pane.querySelectorAll('.shop-tile')];
  if (!was) requestAnimationFrame(pumpShots);
  tick();
  clearInterval(timer); timer = setInterval(tick, 1000);
}
export function stopShop() { clearInterval(timer); timer = 0; shotQ = []; closeItem(false); }

function openItem(id, from) {
  const it = SHOP_ITEMS[id], pop = $('shopPop'), mine = owned(id);
  opener = from; curItem = id; confirming = false; $('shopBuy').classList.remove('confirm');
  const art = pop.querySelector('.sp-art');
  art.className = `sp-art r-${it.r}`;
  art.innerHTML = '<span class="st-bg"></span>';
  $('shopPopRar').textContent = it.kind === 'bundle' ? t('rar_' + it.r) : t('rar_' + it.r) + ' \u00b7 ' + t('shk_' + it.kind);
  $('shopPopRar').className = `sp-rar r-${it.r}`;
  $('shopPopName').textContent = itemName(id);
  $('shopPopDesc').textContent = itemDesc(id);
  // pills do que vem na compra (item unico = 1; pacote = cada peca), cada uma com o tipo
  $('shopPopGives').setAttribute('aria-label', t('shopIncl'));
  $('shopPopGives').innerHTML = gives(id).map(([s, v]) => `<li class="sp-pill ${s}">${svg(s)}<b>${s === 'camo' ? t('camo_' + v) : t('lk_' + s + '_' + v)}</b><small>${t('shk_' + s)}</small></li>`).join('');
  $('shopPopPrice').innerHTML = mine ? t('shopOwned') : coin + fmt(price(id));
  $('shopBuy').textContent = t(mine ? 'shopOwned' : 'shopBuy');
  $('shopBuy').disabled = mine;
  pop.hidden = false;
  try { startLive(id, art); } catch (e) { console.warn('previa da loja', e); }
  $('shopBuy').focus({ preventScroll: true });
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
  pop.querySelector('.lb-x').onclick = () => { audio.play('ui_back', { ui: true }); closeItem(); };
  pop.addEventListener('click', (e) => { if (e.target === pop) closeItem(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); closeItem(); } }); // Esc fecha so o item (a tela de tras ve defaultPrevented e fica)
  // compra em Zions Points (03/11): 1o toque pede confirmacao com o preco, o 2o compra no servidor da Rovex
  $('shopBuy').onclick = async () => {
    const id = curItem, b = $('shopBuy'), msg = $('shopPopSoon');
    if (!id || owned(id) || buying) return;
    if (!confirming) { confirming = true; b.textContent = t('shopConfirm', { n: fmt(price(id)) }); b.classList.add('confirm'); audio.play('ui_click', { ui: true }); return; }
    buying = true; b.disabled = true; b.textContent = t('shopBuying');
    const r = await buyItem(id);
    buying = false; confirming = false; b.classList.remove('confirm');
    if (r.ok) {
      audio.play('unlock', { ui: true, vol: 0.8, jitter: 0 });
      msg.hidden = false; msg.className = 'sp-soon ok'; msg.textContent = t('shopBought', { n: itemName(id) });
      b.textContent = t('shopOwned'); b.disabled = true;
      $('shopPopPrice').textContent = t('shopOwned');
      const pane = $('shopPane'); if (pane) { const keep = opener?.dataset.item; renderShop(); opener = pane.querySelector(`[data-item="${keep}"]`) || opener; }
      onBought?.();
      return;
    }
    audio.play('empty', { ui: true, vol: 0.5 });
    b.disabled = false; b.textContent = t('shopBuy');
    msg.hidden = false; msg.className = 'sp-soon';
    msg.innerHTML = r.code === 'sem_saldo' ? `${t('shopNoFunds', { n: fmt(r.preco ?? price(id)), s: fmt(r.saldo ?? 0) })} <a href="https://tryrovex.com/zions" target="_top" rel="noopener">${t('shopGetZions')}</a>`
      : r.code === 'login' ? t('shopLogin') : r.code === 'ja_tem' ? t('shopOwned') : t('shopErr');
  };
  new MutationObserver(() => { if (pop.hidden) $('shopPopSoon').hidden = true; }).observe(pop, { attributes: true, attributeFilter: ['hidden'] });
}
// a lista do que comprou chegou (ou mudou): redesenha a vitrine aberta pra mostrar "Ja e seu"
addEventListener('rovex-me', () => { const s = document.getElementById('scr-shop'); if (s && !s.hidden) renderShop(); });
