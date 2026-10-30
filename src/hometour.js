// Tour da tela inicial (so na 1a vez que abre o jogo): um holofote passa por cada botao do cartaz e um
// balao de gibi conta o que aquela tela faz. Proximo / Pular, Enter e Esc; no celular o texto fala de toque.
import { t } from './i18n.js';
import { audio } from './audio.js';

const KEY = 'rr_home_tour';
const STEPS = [
  ['#goSolo', 'play', 'ht_play'],
  ['#scr-home [data-go=mp]', 'multiplayer', 'ht_mp'],
  ['#goTutorial', 'tutorial', 'ht_train'],
  ['#scr-home [data-go=arsenal]', 'arsenal', 'ht_arsenal'],
  ['#scr-home [data-go=look]', 'look', 'ht_look'],
  ['#scr-home [data-go=skills]', 'skTab', 'ht_skills'],
  ['#scr-home [data-go=challenges]', 'challenges', 'ht_ch'],
  ['#scr-home [data-go=settings]', 'settings', 'ht_set'],
  ['#scr-home [data-go=controls]', 'controls', 'ht_ctl'],
];

export function homeTourSeen() { try { return !!localStorage.getItem(KEY); } catch { return true; } }

export function startHomeTour({ touch = false } = {}) {
  const steps = STEPS.filter(([sel]) => { const e = document.querySelector(sel); return e && e.offsetParent; });
  if (!steps.length) return;
  try { localStorage.setItem(KEY, '1'); } catch { /* sem storage */ }
  const root = document.createElement('div');
  root.className = 'htour';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'htTitle');
  root.innerHTML = `<i class="ht-hole" aria-hidden="true"></i>
    <div class="ht-card"><b id="htTitle"></b><p id="htBody"></p>
      <footer><small id="htStep"></small><button class="ht-skip" id="htSkip">${t('htSkip')}</button><button class="ht-next" id="htNext"></button></footer></div>`;
  document.body.appendChild(root);
  const hole = root.querySelector('.ht-hole'), card = root.querySelector('.ht-card');
  let i = 0;

  const place = () => {
    const el = document.querySelector(steps[i][0]);
    if (!el) return;
    const r = el.getBoundingClientRect(), pad = 6;
    Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    // balao embaixo do botao se couber, senao em cima; sempre dentro da tela
    card.style.width = ''; // largura cheia de novo (o passo anterior pode ter estreitado)
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18, m = 8;
    const below = r.bottom + pad + gap + ch <= innerHeight - m || r.top - pad - gap - ch < m;
    let top = below ? r.bottom + pad + gap : r.top - pad - gap - ch;
    top = Math.max(m, Math.min(innerHeight - ch - m, top));
    const left = Math.max(m, Math.min(innerWidth - cw - m, r.left + r.width / 2 - cw / 2));
    // tela baixa: nem em cima nem embaixo cabe sem tampar -> do lado do botao (o lado com mais espaco)
    const hits = (L, T) => L < r.right + pad && r.left - pad < L + cw && T < r.bottom + pad && r.top - pad < T + ch;
    if (hits(left, top)) {
      const roomL = r.left - pad - gap - m, roomR = innerWidth - m - r.right - pad - gap;
      const sideL = roomL >= Math.min(cw, 200) && roomL >= roomR, sideR = !sideL && roomR >= Math.min(cw, 200);
      if (sideL || sideR) {
        const w = Math.min(cw, sideL ? roomL : roomR); // estreita o balao pra caber do lado
        if (w < cw) card.style.width = w + 'px';
        const L = sideL ? r.left - pad - gap - w : r.right + pad + gap;
        const ch2 = card.offsetHeight;
        card.style.left = L + 'px'; card.style.top = Math.max(m, Math.min(innerHeight - ch2 - m, r.top + r.height / 2 - ch2 / 2)) + 'px';
        card.classList.add('side'); card.classList.remove('up');
        return;
      }
    }
    card.classList.remove('side');
    card.style.left = left + 'px'; card.style.top = top + 'px';
    card.classList.toggle('up', !below);
    card.style.setProperty('--ax', Math.max(18, Math.min(cw - 18, r.left + r.width / 2 - left)) + 'px');
  };
  const show = () => {
    const [sel, title, body] = steps[i];
    document.querySelector(sel)?.scrollIntoView({ block: 'nearest' });
    root.querySelector('#htTitle').textContent = t(title);
    const tk = touch && t(body + 'T') !== body + 'T' ? body + 'T' : body; // texto proprio do celular quando existe
    root.querySelector('#htBody').textContent = t(tk);
    root.querySelector('#htStep').textContent = t('htStep', { n: i + 1, m: steps.length });
    root.querySelector('#htNext').textContent = t(i === steps.length - 1 ? 'htDone' : 'htNext');
    place();
    root.querySelector('#htNext').focus({ preventScroll: true });
  };
  const close = () => { removeEventListener('resize', place); removeEventListener('keydown', key, true); root.remove(); };
  const next = () => { audio.play('ui_click', { ui: true }); if (++i >= steps.length) close(); else show(); };
  const key = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); audio.play('ui_back', { ui: true }); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); i--; show(); }
  };
  root.querySelector('#htNext').onclick = next;
  root.querySelector('#htSkip').onclick = () => { audio.play('ui_back', { ui: true }); close(); };
  addEventListener('resize', place);
  addEventListener('keydown', key, true);
  show();
  requestAnimationFrame(() => root.classList.add('in'));
}
