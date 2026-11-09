// Mercado Negro: ficha da variante (08/11, pedido dele). Clicar na arma amplia num popup: a arma ao vivo sob a lampada, o que vem
// montado (cada peca com o que ela muda), a comparacao com o modelo comum e a compra. Numeros saem do loadoutStats, os mesmos do Arsenal.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me } from './rovex.js';
import { bpLoadout, loadoutStats, partEffects, partName, arsenalLoaded } from './arsenal.js';
import { WEAPONS } from '../shared/weapons.js';
import { BM_VARIANTS, BM_CAMOS, BM_PIECES, bmPrice, bmRefund } from '../shared/blackmarket.js';
import { bmLive } from './shop.js';
import { openZionBuy } from './zionbuy.js';

const fmt = (n) => Number(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COIN = import.meta.env.BASE_URL + 'brand/zion-points.png';
const CLOSE = 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';
const STATS = [['dmg', 'st_dmg', 1], ['rate', 'st_rate', -1], ['spread', 'st_acc', -1], ['kick', 'st_ctrl', -1], ['adsTime', 'st_ads', -1], ['reload', 'st_reload', -1], ['move', 'st_move', 1], ['mag', 'st_mag', 1]];
let closeOpen = null;

function kitRows(V, lo, st) {
  const fx = (slot, part) => partEffects(V.wpn, lo, slot, part).slice(0, 2).map(([k, v]) => `<em class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'} ${t(k)}</em>`).join('');
  const row = (label, name, extra = '') => `<li><small>${label}</small><b>${esc(name)}</b><span>${extra}</span></li>`, out = [];
  if (lo.scope) out.push(row(t('slot_scope'), partName('scope', lo.scope), st.zoom ? `<em class="info">${st.zoom.toFixed(1)}x</em>` : ''));
  if (lo.handle) out.push(row(t('slot_handle'), partName('handle', lo.handle), fx('handle', lo.handle)));
  if (lo.muzzle) out.push(row(t('slot_muzzle'), partName('muzzle', lo.muzzle), fx('muzzle', lo.muzzle)));
  if (lo.laser) out.push(row(t('slot_laser'), partName('laser', lo.laser), fx('laser', lo.laser)));
  out.push(row(t('slot_charger'), t(V.mag === 'big' ? 'bmMagBig' : 'bmMagSmall'), `<em class="info">${t('bmRounds', { n: Math.round((WEAPONS[V.wpn]?.mag || 0) * st.mag) })}</em>`));
  const cm = BM_CAMOS.find(c => c.id === V.lo.camo);
  out.push(row(t('slot_camo'), t(cm?.anim ? 'bmdCamoAnim' : 'bmdCamoStill')));
  return out.join('');
}
function statRows(V, base, st) {
  const W = WEAPONS[V.wpn]?.mag || 0;
  return STATS.map(([k, label, dir]) => {
    const d = dir > 0 ? st[k] / base[k] - 1 : base[k] / st[k] - 1, even = Math.abs(d) < 0.01;
    const val = k === 'mag' ? `${Math.round(W * base.mag)} > ${Math.round(W * st.mag)}` : even ? '=' : `${d > 0 ? '+' : '−'}${Math.abs(Math.round(d * 100))}%`;
    return `<li class="${even ? 'even' : d > 0 ? 'up' : 'down'}" style="--w:${Math.min(50, Math.abs(d) * 100).toFixed(1)}%"><span>${t(label)}</span><i aria-hidden="true"></i><b>${val}</b></li>`;
  }).join('');
}

// ctx: { color, owned(id), inShowcase(id), pieces(id), left(), buy(id) -> true (comprou) ou texto do erro }
export async function openBmDetail(id, ctx) {
  closeOpen?.();
  const V = BM_VARIANTS[id]; if (!V) return;
  for (let i = 0; i < 50 && !arsenalLoaded(); i++) await new Promise(r => setTimeout(r, 200)); // numeros e pecas dependem das armas baixadas
  const lo = bpLoadout(id), st = loadoutStats(V.wpn, lo), base = loadoutStats(V.wpn, { body: V.lo.body }), name = t(id), bn = t('bn_' + V.lo.body);
  const ov = document.createElement('div'); ov.className = 'bmd'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'bmdName');
  ov.style.setProperty('--rc', ctx.color);
  ov.innerHTML = `<div class="bmd-sheet">
    <button class="bmd-x" type="button" aria-label="${t('close')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CLOSE}"/></svg></button>
    <section class="bmd-stage" id="bmdStage"><span class="bmd-lamp" aria-hidden="true"></span><span class="bmd-stamp">${t('rar_' + V.rar)}</span></section>
    <section class="bmd-file">
      <header><h3 id="bmdName">${esc(name)}</h3><p>${t('bmdOf', { w: esc(bn) })}</p></header>
      <div class="bmd-body">
        <h4>${t('bmdKit')}</h4><ul class="bmd-kit">${kitRows(V, lo, st)}</ul>
        <h4>${t('bmdVs', { w: esc(bn) })}</h4><ul class="bmd-stats">${statRows(V, base, st)}</ul>
      </div>
      <footer class="bmd-deal" id="bmdDeal"></footer>
    </section>
  </div>`;
  document.body.appendChild(ov);
  const prevFocus = document.activeElement, stage = ov.querySelector('#bmdStage'), deal = ov.querySelector('#bmdDeal'), ac = new AbortController();
  let stopLive = null, timer = 0, closed = false, buying = false;
  const shut = () => {
    if (closed) return;
    closed = true; closeOpen = null; clearInterval(timer); ac.abort(); stopLive?.();
    ov.classList.add('out'); setTimeout(() => ov.remove(), 180);
    try { prevFocus?.focus?.({ preventScroll: true }); } catch { /* */ }
  };
  const paint = (err = '') => {
    const price = bmPrice(id), bal = me?.zionsPoints ?? 0, P = ctx.pieces(id), np = P.filter(Boolean).length;
    if (ctx.owned(id)) { deal.innerHTML = `<p class="bmd-own">${t('bmOwned')}</p>`; return; }
    if (!ctx.inShowcase(id)) { deal.innerHTML = `<p class="bmd-off"><b>${t('bmPieces', { n: np, m: BM_PIECES })}</b>${t('bmdOff', { n: BM_PIECES })}</p>`; return; }
    const back = bmRefund({ [id]: P }, id), short = price - bal;
    const note = err || (short > 0 ? t('bmdGetZp') : t('bmdAfter', { n: fmt(bal - price + back) }) + (back > 0 ? ' ' + t(np > 1 ? 'bmdBack' : 'bmdBack1', { p: np, n: fmt(back) }) : ''));
    deal.innerHTML = `<div class="bmd-price"><img src="${COIN}" alt=""><b>${fmt(price)}</b><p class="bmd-clock" role="timer"><span>${t('bmdLeft')}</span> <strong id="bmdLeft">${ctx.left()}</strong></p></div>
      <button class="bmd-go ${short > 0 ? 'short' : ''}" id="bmdGo" type="button">${short > 0 ? t('bmdShort', { n: fmt(short) }) : t('bmdBuy')}</button>
      <p class="bmd-note" role="status">${note}</p>`;
    deal.querySelector('#bmdGo').onclick = async (e) => {
      if (short > 0) { audio.play('ui_click', { ui: true }); openZionBuy('rr'); return; }
      if (buying) return;
      buying = true; e.currentTarget.disabled = true; e.currentTarget.textContent = t('shopBuying');
      const done = await ctx.buy(id);
      buying = false;
      if (closed) return;
      if (done === true) shut(); else paint(done);
    };
  };
  closeOpen = shut;
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); audio.play('ui_back', { ui: true }); shut(); } }, { capture: true, signal: ac.signal });
  addEventListener('rovex-me', () => { if (!closed && !buying) paint(); }, { signal: ac.signal }); // saldo mudou (comprou Zions Points por cima)
  ov.querySelector('.bmd-x').onclick = () => { audio.play('ui_back', { ui: true }); shut(); };
  ov.onclick = (e) => { if (e.target === ov) shut(); };
  paint();
  timer = setInterval(() => { const c = ov.querySelector('#bmdLeft'); if (c) c.textContent = ctx.left(); }, 1000);
  ov.querySelector('.bmd-x').focus({ preventScroll: true });
  audio.play('ui_click', { ui: true });
  requestAnimationFrame(() => { if (!closed) stopLive = bmLive(id, stage); });
}
