// Loader da Rovex nos paineis que dependem de foto 3D (08/11, pedido dele): Loja e Mercado Negro so aparecem com a primeira tela pronta.
// O painel segue no layout (invisivel, nao display:none) pra o IntersectionObserver medir o que esta na vista; o resto carrega ao rolar.
import { t } from './i18n.js';

const LOGO = import.meta.env.BASE_URL + 'brand/rovex.png';

export function paneBusy(pane, on) {
  if (!pane) return;
  pane.classList.toggle('pane-busy', on);
  const el = pane.querySelector(':scope > .pane-load');
  if (!on) { el?.remove(); return; }
  if (el) return;
  pane.scrollTop = 0;
  pane.insertAdjacentHTML('beforeend', `<div class="pane-load" role="status"><img src="${LOGO}" alt="Rovex"><b>${t('paneLoading')}</b><span class="pl-bar"><i></i></span></div>`);
}
// barra real: quantas fotos da primeira tela ja ficaram prontas
export function paneProg(pane, done, total) {
  const bar = pane?.querySelector(':scope > .pane-load .pl-bar i');
  if (bar && total > 0) bar.style.width = Math.min(100, Math.round(done / total * 100)) + '%';
}
// nunca prende a pessoa no loader: 15 s e o painel abre com o que tiver (o resto entra quando chegar)
export const settle = (p, ms = 15000) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
