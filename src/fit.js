// REGRA dele (05/11): dado nunca e cortado com reticencias. Texto que nao cabe numa linha encolhe ate caber; se nem assim, quebra em
// duas linhas. Vale pra toda tela: basta o seletor estar aqui (o `npm run check` trava `text-overflow: ellipsis` no CSS).
const FIT = ['.lv-name', '#lbPlayers .nm', '.lf-nm', '.fr-txt b', '.fr-sub', '.cine-tag b', '.kc-gname', '.kc-var', '.ann-txt b', '.ss-row b', '.ev.ev-unl b', '.unlock-toast', '.elite-track b', '.elite-promo b', '.elite-promo small', '#lbCfgList .k', '.pk-list button span', '.lb-tabs .lb-smith span', '#scr-arsenal .slot span', '.st-foot small', 'body.touchmode .feed li'].join(',');
const MIN = 0.62;
let pending = 0;
function fit(e) {
  const txt = e.textContent, w = e.clientWidth;
  if (!w || (e.dataset.fitT === txt && +e.dataset.fitW === w)) return;
  e.dataset.fitT = txt; e.dataset.fitW = w;
  e.style.fontSize = ''; e.style.whiteSpace = 'nowrap'; e.style.overflow = 'hidden';
  const over = e.scrollWidth;
  if (over > w + 1) {
    const k = w / over, base = parseFloat(getComputedStyle(e).fontSize);
    e.style.fontSize = (base * Math.max(MIN, k * 0.98)).toFixed(1) + 'px';
    if (k < MIN) { e.style.whiteSpace = 'normal'; e.style.overflowWrap = 'break-word'; }
  }
  e.style.overflow = 'visible';
}
const run = () => { pending = 0; document.querySelectorAll(FIT).forEach(fit); };
const later = () => { pending ||= setTimeout(run, 120); };
export function startFit() {
  // 10/11 (desempenho no app de PC): na partida a HUD muda todo quadro (municao, relogio, placar) e cada mudanca refazia a busca
  // e a medida de todo texto da tela. Mudanca dentro da HUD so conta se tiver texto ajustavel nela
  const SEL = Array.isArray(FIT) ? FIT.join(',') : FIT, QUIET = '#hud, #touch, #board, #mapCurtain, #xpChip, .h-arrow, #chat, #qc';
  // 14/11 (medido no app dele: esta checagem era 1,6% da CPU da partida, centenas de buscas por quadro): a resposta de cada
  // elemento (muda texto ajustavel ou nao) fica guardada 2 s; o mesmo contador da HUD mudando 144x/s nao refaz a busca
  const seen = new WeakMap();
  const counts = (el, now) => { const c = seen.get(el); if (c && now - c.t < 2000) return c.v; const v = !el.closest(QUIET) || !!el.closest(SEL) || !!el.querySelector?.(SEL); seen.set(el, { v, t: now }); return v; };
  const watch = (recs) => { const now = performance.now(); for (const r of recs) { const el = r.target.nodeType === 1 ? r.target : r.target.parentElement; if (!el) continue; if (counts(el, now)) { later(); return; } } };
  new MutationObserver(watch).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', later); document.fonts?.ready?.then(later);
  later();
}
