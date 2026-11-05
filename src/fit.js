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
  new MutationObserver(later).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', later); document.fonts?.ready?.then(later);
  later();
}
