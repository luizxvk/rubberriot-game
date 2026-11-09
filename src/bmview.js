// Mercado Negro (08/11, pedido dele): aba DENTRO da Loja. Vitrine do dia (5 variantes, girando na semana) com contador
// de tempo (escassez), bau comprado com animacao de abrir, e a colecao com cada arma separada em 5 pecas.
// Preco, sorteio e posse vem do servidor da Rovex (rotas /mercado). Aqui so desenha e pede.
import { t, getLang } from './i18n.js';
import { audio } from './audio.js';
import { me, bmLoad, bmBuy, bmChest } from './rovex.js';
import { pieceShot } from './shop.js';
import { renderBal } from './zbal.js';
import { BM_VARIANTS, BM_IDS, BM_RARITY, BM_CHEST, BM_PIECES, bmShowcase, bmPrice, bmRefund } from '../shared/blackmarket.js';
import { CAMO_SWATCH } from './camos.js';
import { shopOwned } from './shopstore.js';
import { openBmDetail } from './bmdetail.js';
import { paneBusy, paneProg, settle } from './paneload.js';
import { renderPass, stopPass } from './passview.js';
import { passDaysLeft } from './pass.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COIN = import.meta.env.BASE_URL + 'brand/zion-points.png';
const RAR_COL = { comum: '#9a968c', incomum: '#4aa35a', raro: '#2f7ad8', epico: '#8a3ad8', lendario: '#e8a21a' };
const MOD_TXT = { dmg: 'st_dmg', rate: 'st_rate', spread: 'st_acc', kick: 'st_ctrl', adsTime: 'st_ads', reload: 'st_reload', move: 'st_move', mag: 'st_mag' };
const good = (k, v) => (k === 'dmg' || k === 'move' || k === 'mag') ? v > 1 : v < 1;
const vName = (id) => t(id);
const baseName = (id) => t('bn_' + BM_VARIANTS[id].lo.body);
const ownedV = (id) => shopOwned('bp:' + id);
let state = { pecas: {}, vitrine: null, skew: 0, loading: false, err: null }, tab = 'shop', timer = 0, bmRun = 0, bmIO = null;

// ---------- abas da Loja ----------
// dias que faltam pra temporada do Pass acabar (08/11, pedido dele); acabou = sem etiqueta
const passPill = () => { const n = passDaysLeft(); return n > 0 ? `<em class="pass-days">${t(n === 1 ? 'passDay1' : 'passDays', { n })}</em>` : ''; };
export function initBlackMarket() {
  const card = $('scr-shop'), pane = $('shopPane'); if (!card || !pane || $('shopTabs')) return;
  pane.insertAdjacentHTML('beforebegin', `<div class="shop-tabs" id="shopTabs" role="tablist">
    <button role="tab" data-tab="shop" aria-selected="true">${t('shop')}</button>
    <button role="tab" data-tab="pass" aria-selected="false"><span>${t('passTitle')}</span>${passPill()}</button>
    <button role="tab" data-tab="bm" aria-selected="false" class="tab-bm"><span>${t('bmTitle')}</span><em class="bm-new">${t('chNew')}</em></button>
  </div>`);
  pane.insertAdjacentHTML('afterend', '<div class="bm" id="bmPane" hidden></div><div class="shop" id="passPane" hidden></div>');
  card.querySelectorAll('#shopTabs [data-tab]').forEach(b => b.onclick = () => { audio.play('ui_click', { ui: true }); showTab(b.dataset.tab); });
}
export function showTab(k) {
  tab = k;
  document.querySelectorAll('#shopTabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
  $('shopPane').hidden = k !== 'shop'; $('bmPane').hidden = k !== 'bm'; $('passPane').hidden = k !== 'pass';
  if (k === 'bm') openBM(); else stopBM();
  if (k === 'pass') renderPass();
}
export function relangBM() { const b = document.querySelector('#shopTabs .tab-bm span'); if (b) b.textContent = t('bmTitle'); const s = document.querySelector('#shopTabs [data-tab=shop]'); if (s) s.textContent = t('shop'); const p = document.querySelector('#shopTabs [data-tab=pass]'); if (p) p.innerHTML = `<span>${t('passTitle')}</span>${passPill()}`; if (tab === 'bm') renderBM(); else if (tab === 'pass') renderPass(); }
export function stopBM() { clearInterval(timer); timer = 0; bmRun++; bmIO?.disconnect(); paneBusy($('bmPane'), false); stopPass(); } // saiu: para de pedir foto do que ja nao esta na tela
export function reopenBM() { if (tab === 'bm') openBM(); else if (tab === 'pass') renderPass(); }

// 08/11 (pedido dele): loader da Rovex ate os dados e a primeira tela de fotos estarem prontos; antes desenhava duas vezes e as fotos pipocavam
async function openBM() {
  if (!me) { renderBM(); return; }
  const pane = $('bmPane'), run = ++bmRun;
  paneBusy(pane, true);
  state.loading = true;
  const j = await bmLoad();
  state.loading = false;
  if (j && !j.code) { state.pecas = j.pecas || {}; state.vitrine = j.vitrine || null; state.skew = (j.agora || Date.now()) - Date.now(); state.err = null; } else state.err = j?.code || 'erro';
  if (run !== bmRun) return;
  const ready = renderBM();
  paneBusy(pane, true); // o desenho troca o conteudo do painel, loader junto
  await settle(ready);
  if (run === bmRun) paneBusy(pane, false);
}

// ---------- desenho ----------
const shot = (el, id) => pieceShot('bp', id).then(u => { if (!u || !el.isConnected) return; if (el.classList.contains('bm-pz')) { el.style.setProperty('--img', `url("${u}")`); el.insertAdjacentHTML('afterbegin', `<img src="${u}" alt="">`); } else el.innerHTML = `<img src="${u}" alt="">`; el.classList.add('img'); }).catch(() => {}); // colecao: a arma em silhueta embaixo e as fatias ganhas por cima
function modsHtml(id) { return Object.entries(BM_VARIANTS[id].mods).map(([k, v]) => `<b class="${good(k, v) ? 'up' : 'down'}">${good(k, v) ? '+' : '−'} ${t(MOD_TXT[k])}</b>`).join(''); }
function vCard(id) {
  const V = BM_VARIANTS[id], own = ownedV(id), pr = bmPrice(id);
  return `<article class="bm-card r-${V.rar}" style="--rc:${RAR_COL[V.rar]}" data-v="${id}">
    <span class="bm-rib">${t('rar_' + V.rar)}</span>
    <button class="bm-art" type="button" data-shot="${id}" aria-label="${t('bmdZoom', { n: esc(vName(id)) })}"><i class="cswatch" style="background:${CAMO_SWATCH[V.lo.camo]}"></i></button><span class="bm-zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/></svg></span>
    <div class="bm-info"><h4>${esc(vName(id))}</h4><small>${esc(baseName(id))}</small><p class="bm-mods">${modsHtml(id)}</p></div>
    <button class="bm-buy ${own ? 'owned' : ''}" data-buy="${id}" ${own ? 'disabled' : ''}>${own ? t('bmOwned') : `<img src="${COIN}" alt=""><span>${fmt(pr)}</span>`}</button>
  </article>`;
}
function piecesHtml(id) { // ilustracao da arma em 5 fatias: a fatia aparece quando a peca e sua, senao silhueta
  const P = state.pecas[id] || [], own = ownedV(id), n = own ? BM_PIECES : P.filter(Boolean).length;
  const slices = Array.from({ length: BM_PIECES }, (_, i) => `<span class="pz ${own || P[i] ? 'got' : ''}" style="--i:${i}"></span>`).join('');
  return `<div class="bm-col ${own ? 'done' : ''} r-${BM_VARIANTS[id].rar}" style="--rc:${RAR_COL[BM_VARIANTS[id].rar]}" data-col="${id}" data-open="${id}" role="button" tabindex="0" aria-label="${t('bmdZoom', { n: esc(vName(id)) })}">
    <div class="bm-pz" data-shot="${id}">${slices}</div>
    <b>${esc(vName(id))}</b><small>${esc(baseName(id))}</small><i class="bm-prog">${own ? t('bmComplete') : t('bmPieces', { n, m: BM_PIECES })}</i></div>`;
}
export function renderBM() {
  const pane = $('bmPane'); if (!pane) return;
  renderBal($('shopBal'));
  const V = state.vitrine || bmShowcase(Date.now());
  if (!me) { pane.innerHTML = `<div class="bm-hero"><h3 class="bm-logo">${t('bmTitle')}</h3><p>${t('bmLogin')}</p></div>`; return; }
  const cats = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'lmg'];
  const total = BM_IDS.filter(ownedV).length;
  pane.innerHTML = `
    <section class="bm-hero" aria-labelledby="bmH">
      <div class="bm-den" aria-hidden="true"><span class="bm-leds">${'<i></i>'.repeat(9)}</span><span class="bm-cord"></span><span class="bm-bulb"></span><span class="bm-cone"></span><span class="bm-rim"></span><div class="bm-dealer" id="bmDealer"></div><span class="bm-steam"><i></i><i></i><i></i></span><span class="bm-crates"></span></div>
      <div class="bm-talk">
        <h3 class="bm-logo" id="bmH">${t('bmTitle')}</h3>
        <p class="bm-bubble">${t('bmLine' + (new Date().getDate() % 4))}</p>
        <div class="bm-slate" role="timer" aria-live="off">
          <p class="bm-clock hot"><span>${t('bmDayLeft')}</span><b id="bmDayLeft">--:--:--</b></p>
          <p class="bm-clock"><span>${t('bmWeekLeft')}</span><b id="bmWeekLeft">--</b></p>
        </div>
      </div>
    </section>
    <section class="bm-sec" aria-labelledby="bmVitH">
      <header><h3 id="bmVitH">${t('bmShowcase')}</h3><span class="bm-warn">${t('bmScarce')}</span></header>
      <div class="bm-grid">${V.ids.map(vCard).join('')}</div>
    </section>
    <section class="bm-sec bm-chest-sec" aria-labelledby="bmChestH">
      <div class="bm-chest-card">
        <button class="bm-chest-art" id="bmChestGo" aria-label="${t('bmChestOpen')}">${CHEST_SVG}</button>
        <div class="bm-chest-txt">
          <h3 id="bmChestH">${t('bmChestName')}</h3><p>${t('bmChestSub', { n: BM_PIECES, a: fmt(BM_CHEST.loot[0]), b: fmt(BM_CHEST.loot[1]) })}</p>
          <ul class="bm-odds">${Object.entries(BM_RARITY).map(([k, r]) => `<li style="--rc:${RAR_COL[k]}"><i></i>${t('rar_' + k)} <b>${Math.round(r.w / Object.values(BM_RARITY).reduce((s, x) => s + x.w, 0) * 100)}%</b></li>`).join('')}</ul>
          <button class="bm-buy big" id="bmChestBuy"><img src="${COIN}" alt=""><span>${t('bmChestOpen')}</span><em>${fmt(BM_CHEST.zp)}</em></button>
          <p class="bm-msg" id="bmMsg" role="status"></p>
        </div>
      </div>
    </section>
    <section class="bm-sec" aria-labelledby="bmColH">
      <header><h3 id="bmColH">${t('bmCollected')}</h3><span class="bm-count">${t('bmCount', { n: total, m: BM_IDS.length })}</span></header>
      ${cats.map(c => `<h4 class="bm-cat">${t('cat_' + c)}</h4><div class="bm-cols">${BM_IDS.filter(id => BM_VARIANTS[id].wpn === c).map(piecesHtml).join('')}</div>`).join('')}
      <p class="shop-note">${t('bmNote')} ${t('bmBuyNote', { n: fmt(BM_CHEST.pieceZp) })}</p>
    </section>`;
  const d = $('bmDealer'), jobs = [pieceShot('merchant', 'cambalacho').then(u => { if (u && d?.isConnected) d.innerHTML = `<img src="${u}" alt="">`; }).catch(() => {})]; // o comerciante
  // fotos das armas so quando aparecem na tela (sao 84); o loader espera so as que estao de fato na vista
  let seen = false, done; const first = new Promise(r => { done = r; });
  bmIO?.disconnect();
  bmIO = new IntersectionObserver((es) => {
    const bottom = pane.getBoundingClientRect().bottom;
    es.forEach(e => { if (!e.isIntersecting) return; bmIO.unobserve(e.target); const p = shot(e.target, e.target.dataset.shot); if (!seen && e.boundingClientRect.top < bottom) jobs.push(p); });
    if (!seen) { seen = true; let n = 0; jobs.forEach(p => p.then(() => paneProg(pane, ++n, jobs.length))); Promise.all(jobs).then(done); }
  }, { root: pane, rootMargin: '200px' });
  pane.querySelectorAll('[data-shot]').forEach(el => bmIO.observe(el));
  pane.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buy(b));
  // ficha da arma: clique na foto, no cartao ou na peca da colecao (o botao de preco segue comprando direto)
  pane.querySelectorAll('.bm-card').forEach(c => c.onclick = (e) => { if (!e.target.closest('[data-buy]')) openDetail(c.dataset.v); });
  pane.querySelectorAll('.bm-col[data-open]').forEach(c => { c.onclick = () => openDetail(c.dataset.open); c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(c.dataset.open); } }; });
  $('bmChestBuy').onclick = $('bmChestGo').onclick = () => openChest();
  tick(); clearInterval(timer); timer = setInterval(tick, 1000);
  return first;
}
function tick() {
  const V = state.vitrine || bmShowcase(Date.now()), now = Date.now() + state.skew;
  const d = $('bmDayLeft'), w = $('bmWeekLeft'); if (!d) { stopBM(); return; }
  const left = Math.max(0, V.dayEnd - now), h = Math.floor(left / 3.6e6), m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1000) % 60;
  d.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  d.parentElement.classList.toggle('urgent', left < 3.6e6);
  const wl = Math.max(0, V.weekEnd - now), dd = Math.floor(wl / 864e5), hh = Math.floor(wl / 3.6e6) % 24;
  w.textContent = t('bmDH', { d: dd, h: hh });
  if (left <= 0) { state.vitrine = null; openBM(); } // virou o dia com a aba aberta: vitrine nova
}

function openDetail(id) {
  const V = state.vitrine || bmShowcase(Date.now());
  openBmDetail(id, {
    color: RAR_COL[BM_VARIANTS[id].rar], owned: ownedV, inShowcase: (x) => V.ids.includes(x), pieces: (x) => state.pecas[x] || [],
    left: () => { const l = Math.max(0, V.dayEnd - (Date.now() + state.skew)); return [Math.floor(l / 3.6e6), Math.floor(l / 6e4) % 60, Math.floor(l / 1000) % 60].map(n => String(n).padStart(2, '0')).join(':'); },
    buy: async (x) => { // o popup ja e a confirmacao: um toque compra. true = comprou; texto = erro pra mostrar
      const np = (state.pecas[x] || []).filter(Boolean).length, before = bmRefund(state.pecas, x), r = await bmBuy(x);
      if (r.ok) { const devolve = r.devolve ?? before; if (r.pecas) state.pecas = r.pecas; else delete state.pecas[x]; audio.play('unlock', { ui: true, vol: 0.85, jitter: 0 }); reveal({ id: x, kind: 'buy', devolve, np }); renderBM(); return true; }
      audio.play('empty', { ui: true, vol: 0.5 });
      return r.code === 'sem_saldo' ? t('shopNoFunds', { n: fmt(r.preco ?? bmPrice(x)), s: fmt(r.saldo ?? 0) }) : r.code === 'fora_da_vitrine' ? t('bmGone') : t('bmErr');
    },
  });
}

// ---------- compra da vitrine (2 toques: confirma com o preco) ----------
let confirmId = null;
async function buy(b) {
  const id = b.dataset.buy; if (!id || ownedV(id) || b.disabled) return;
  if (confirmId !== id) { confirmId = id; b.classList.add('confirm'); b.innerHTML = `<span>${t('shopConfirm', { n: fmt(bmPrice(id)) })}</span>`; audio.play('ui_click', { ui: true }); return; }
  b.disabled = true; b.innerHTML = `<span>${t('shopBuying')}</span>`;
  const r = await bmBuy(id); confirmId = null;
  if (r.ok) { const devolve = r.devolve ?? bmRefund(state.pecas, id), np = (state.pecas[id] || []).filter(Boolean).length; if (r.pecas) state.pecas = r.pecas; else delete state.pecas[id]; audio.play('unlock', { ui: true, vol: 0.85, jitter: 0 }); reveal({ id, kind: 'buy', devolve, np }); renderBM(); return; }
  audio.play('empty', { ui: true, vol: 0.5 }); b.disabled = false; b.classList.remove('confirm');
  b.innerHTML = `<span>${r.code === 'sem_saldo' ? t('shopNoFunds', { n: fmt(r.preco ?? bmPrice(id)), s: fmt(r.saldo ?? 0) }) : r.code === 'fora_da_vitrine' ? t('bmGone') : t('bmErr')}</span>`;
}

// ---------- bau ----------
let opening = false;
async function openChest() {
  if (opening) return;
  const msg = $('bmMsg');
  if ((me?.zionsPoints ?? 0) < BM_CHEST.zp) { audio.play('empty', { ui: true, vol: 0.5 }); if (msg) msg.textContent = t('shopNoFunds', { n: fmt(BM_CHEST.zp), s: fmt(me?.zionsPoints ?? 0) }); return; }
  opening = true;
  const ov = chestOverlay(); ov.classList.add('shake'); audio.play('ui_click', { ui: true });
  const [r] = await Promise.all([bmChest(), new Promise(res => setTimeout(res, 1700))]); // o bau treme enquanto o servidor sorteia
  if (!r.ok) { opening = false; ov.remove(); audio.play('empty', { ui: true, vol: 0.5 }); if (msg) msg.textContent = r.code === 'sem_saldo' ? t('shopNoFunds', { n: fmt(BM_CHEST.zp), s: fmt(r.saldo ?? 0) }) : t('bmErr'); return; }
  state.pecas = r.pecas || state.pecas;
  ov.style.setProperty('--rc', RAR_COL[BM_VARIANTS[r.id]?.rar] || '#f2b544'); // a coluna de luz ja sai na cor da raridade
  ov.classList.remove('shake'); ov.classList.add('open'); audio.play(r.completa ? 'fanfare' : 'unlock', { ui: true, vol: 0.9, jitter: 0 }); audio.fanfare?.(r.completa ? 0.9 : 0.5);
  setTimeout(() => { fillReveal(ov, { id: r.id, piece: r.piece, dup: r.dup, espolio: r.espolio, completa: r.completa, kind: 'chest' }); }, 650);
  ov.onclick = () => { if (!ov.classList.contains('shown')) return; ov.classList.add('out'); setTimeout(() => { ov.remove(); opening = false; renderBM(); }, 260); };
}
function chestOverlay() {
  const ov = document.createElement('div'); ov.className = 'bm-open'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  // 08/11 (pedido dele: sem balancar, nada generico): arca parada sob o foco aproximando devagar; abre = cadeado cai, coluna de luz na
  // cor da raridade sobe de dentro, fumaca no pe e cedulas de contrabando voando; a carta sai de DENTRO da arca
  ov.innerHTML = `<span class="bmo-spot" aria-hidden="true"></span><div class="bmo-chest">${CHEST_SVG}<span class="bmo-lock" aria-hidden="true"></span><span class="bmo-beam" aria-hidden="true"></span>${Array.from({ length: 6 }, (_, i) => `<i class="bmo-smoke" style="--x:${(i - 2.5) * 34}px;--d:${(i % 3) * 0.08}s"></i>`).join('')}${Array.from({ length: 7 }, (_, i) => `<i class="bmo-bill" style="--x:${(i - 3) * 46 + (i % 2 ? 12 : -8)}px;--r:${(i % 2 ? 1 : -1) * (20 + i * 9)}deg;--d:${0.15 + i * 0.07}s"></i>`).join('')}</div><div class="bmo-card" id="bmoCard"></div><p class="bmo-tap">${t('bmTap')}</p>`;
  document.body.appendChild(ov); return ov;
}
function fillReveal(ov, R) {
  const V = BM_VARIANTS[R.id], c = ov.querySelector('#bmoCard');
  ov.style.setProperty('--rc', RAR_COL[V.rar]);
  const title = R.kind === 'buy' ? t('bmBought') : R.completa ? t('bmCompleted') : R.dup ? t('bmDup') : t('bmGotPiece', { n: (R.piece ?? 0) + 1, m: BM_PIECES });
  const sub = R.dup ? t('bmLoot', { n: fmt(R.espolio) }) : t('bmOf', { v: esc(vName(R.id)), w: esc(baseName(R.id)) }) + (R.devolve > 0 ? `<br><b class="bmo-refund">${t(R.np > 1 ? 'bmRefund' : 'bmRefund1', { p: R.np, n: fmt(R.devolve) })}</b>` : '');
  c.innerHTML = `<span class="bmo-rar">${t('rar_' + V.rar)}</span><div class="bmo-art" data-shot="${R.id}"></div><div class="bm-pz big">${Array.from({ length: BM_PIECES }, (_, i) => `<span class="pz ${(state.pecas[R.id] || [])[i] || R.kind === 'buy' || R.completa ? 'got' : ''} ${i === R.piece && !R.dup ? 'new' : ''}" style="--i:${i}"></span>`).join('')}</div><h3>${title}</h3><p>${sub}</p>`;
  const art = c.querySelector('.bmo-art'); shot(art, R.id);
  const pz = c.querySelector('.bm-pz'); pieceShot('bp', R.id).then(u => { if (u) pz.style.setProperty('--img', `url("${u}")`); }).catch(() => {});
  ov.classList.add('shown');
}
function reveal(R) { const ov = chestOverlay(); ov.classList.add('open', 'nochest'); fillReveal(ov, R); ov.onclick = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 260); }; }

// tela de fim (08/11): a peca entra no quadro de Zions Points (o banner do HUD fica por baixo da tela de fim)
export function pieceEndHtml(peca) {
  if (!peca?.id || !BM_VARIANTS[peca.id]) return '';
  if (!peca.dup) state.pecas[peca.id] = Object.assign(state.pecas[peca.id] || Array(BM_PIECES).fill(false), { [peca.piece]: true });
  const V = BM_VARIANTS[peca.id], P = state.pecas[peca.id] || [];
  const kind = peca.completa ? t('bmCompleted') : peca.dup ? t('bmDup') : t('bmDropKind');
  const name = peca.dup ? t('bmLoot', { n: fmt(peca.espolio) }) : t('bmDropName', { w: vName(peca.id) + ' (' + baseName(peca.id) + ')', n: (peca.piece ?? 0) + 1, m: BM_PIECES });
  return `<div class="zp-piece" style="--rc:${RAR_COL[V.rar]}" data-pshot="${peca.id}"><div class="bm-pz">${Array.from({ length: BM_PIECES }, (_, i) => `<span class="pz ${P[i] || peca.completa ? 'got' : ''} ${i === peca.piece && !peca.dup ? 'new' : ''}" style="--i:${i}"></span>`).join('')}</div><span><small>${esc(kind)}</small><b>${esc(name)}</b></span></div>`;
}
export function pieceEndShot(box) { const el = box.querySelector('[data-pshot]'); if (!el) return; pieceShot('bp', el.dataset.pshot).then(u => { if (u && el.isConnected) { const pz = el.querySelector('.bm-pz'); pz.style.setProperty('--img', `url("${u}")`); pz.insertAdjacentHTML('afterbegin', `<img src="${u}" alt="">`); pz.classList.add('img'); } }).catch(() => {}); }

// bau de contrabando em SVG (tampa separada pra abrir)
const CHEST_SVG = `<svg class="chest" viewBox="0 0 120 100" aria-hidden="true">
  <g class="ch-body"><rect x="12" y="46" width="96" height="46" rx="6" fill="#5a3a22" stroke="#141210" stroke-width="4"/>
  <rect x="12" y="58" width="96" height="8" fill="#3a2414"/><rect x="52" y="46" width="16" height="46" fill="#c8a24a" stroke="#141210" stroke-width="3"/>
  <rect x="54" y="62" width="12" height="14" rx="2" fill="#141210"/><circle cx="60" cy="68" r="2.6" fill="#c8a24a"/></g>
  <g class="ch-lid"><path d="M12 48 V34 Q12 14 60 14 Q108 14 108 34 V48 Z" fill="#6b4630" stroke="#141210" stroke-width="4"/>
  <path d="M52 15 h16 v33 h-16z" fill="#c8a24a" stroke="#141210" stroke-width="3"/><path d="M22 40 Q60 30 98 40" fill="none" stroke="#3a2414" stroke-width="3"/>
  <text x="60" y="36" text-anchor="middle" font-family="Bowlby One, sans-serif" font-size="11" fill="#141210">X</text></g>
</svg>`;
