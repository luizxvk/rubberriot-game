// Regra (05/11, pedido dele): toda fileira que passa da tela ganha a setinha pra avancar pro proximo. Basta o seletor estar aqui.
// Os botoes sao fixos na tela e medem a fileira a cada mudanca, porque as fileiras do Arsenal moram em grid e nao tem pai posicionado.
const SEL = '#slotList, #catTabs, .stk-cards, #picker, .elp-cols, #rkbList, .zb-list, .set-tabs, .psx-track, .lm-track';
const ICO = { next: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z', prev: 'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z', down: 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z', up: 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z' };
const BOX = new Map();
function btn(k, label, on) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'h-arrow'; b.hidden = true; b.setAttribute('aria-label', label);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[k]}"/></svg>`; b.onclick = on; document.body.appendChild(b); return b;
}
function ensure(el) {
  if (BOX.has(el)) return BOX.get(el);
  const go = (x, y) => el.scrollBy({ left: x * el.clientWidth * 0.75, top: y * el.clientHeight * 0.75, behavior: 'smooth' });
  const B = { next: btn('next', 'Próximo', () => go(1, 0)), prev: btn('prev', 'Anterior', () => go(-1, 0)), down: btn('down', 'Mais abaixo', () => go(0, 1)), up: btn('up', 'Mais acima', () => go(0, -1)) };
  el.addEventListener('scroll', later, { passive: true });
  // 09/11 (print dele): no popup de mapas (z-index 16) a setinha ficava atras dele; e clicar nela nao tira o foco do cartao (Esc e setas do teclado continuam valendo)
  if (el.closest('.lb-maps')) for (const b of Object.values(B)) { b.style.zIndex = '17'; b.addEventListener('mousedown', e => e.preventDefault()); }
  BOX.set(el, B); return B;
}
function run() {
  pending = 0;
  for (const [el, B] of BOX) if (!el.isConnected) { Object.values(B).forEach(b => b.remove()); BOX.delete(el); }
  document.querySelectorAll(SEL).forEach(el => {
    const B = ensure(el), r = el.getBoundingClientRect(), seen = !!el.offsetParent && r.width > 0 && r.height > 0;
    const X = getComputedStyle(el).overflowX !== 'visible', Y = getComputedStyle(el).overflowY !== 'visible';
    const place = (b, show, x, y) => { b.hidden = !show; if (show) { b.style.left = (x - 19) + 'px'; b.style.top = (y - 19) + 'px'; } };
    const cx = r.left + r.width / 2, midY = r.top + (el.matches('.lm-track') ? r.height / 2 : Math.min(r.height / 2, 28)); // mapas: na altura do meio da foto
    place(B.next, seen && X && el.scrollLeft + el.clientWidth < el.scrollWidth - 2, r.right - 14, midY);
    place(B.prev, seen && X && el.scrollLeft > 2, r.left + 14, midY);
    place(B.down, seen && Y && el.scrollTop + el.clientHeight < el.scrollHeight - 2, cx, r.bottom - 10);
    place(B.up, seen && Y && el.scrollTop > 2, cx, r.top + 10);
  });
}
// 08/11 (producao: jogo travando): o observador pegava TODA mudanca do body; na partida a HUD muda todo quadro (municao,
// placar, relogio) e cada uma medida as fileiras com getBoundingClientRect/getComputedStyle = layout recalculado TODO
// quadro (~11% do tempo na tela inicial, bem pior no celular). Agora: ignora o que muda dentro da HUD/toque/placar, nao
// roda na partida com o menu fechado e junta tudo em no maximo ~8 medidas por segundo.
let pending = 0;
const QUIET = '#hud, #touch, #board, #killfeed, #comic, #dead, #xpChip, #mapCurtain, #rovexMark, .h-arrow';
const inGame = () => { const h = document.getElementById('hud'), m = document.getElementById('menu'); return !!h && !h.hidden && (!m || m.hidden); };
function hideAll() { for (const B of BOX.values()) for (const b of Object.values(B)) b.hidden = true; }
function later() { if (inGame()) { hideAll(); return; } if (pending) return; pending = setTimeout(() => requestAnimationFrame(run), 120); }
export function startArrows() {
  new MutationObserver((recs) => {
    for (const r of recs) { const el = r.target.nodeType === 1 ? r.target : r.target.parentElement; if (el && !el.closest(QUIET)) { later(); return; } }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  addEventListener('resize', later); later();
}
