// Tour da tela inicial (so na 1a vez que abre o jogo): um holofote passa por cada botao do cartaz e um
// balao de gibi conta o que aquela tela faz. Proximo / Pular, Enter e Esc; no celular o texto fala de toque.
import { t } from './i18n.js';
import { audio } from './audio.js';

const KEY = 'rr_home_tour2'; // 07/11: chave nova = todo mundo ve o tour de novo com os botoes novos (Amigos, Pass, Loja, Bolso, Tela dividida)
const STEPS = [
  ['#goSolo', 'play', 'ht_play'],
  ['#scr-home [data-go=mp]', 'multiplayer', 'ht_mp'],
  ['#scr-home [data-go=friends]', 'friends', 'ht_friends'],
  ['#scr-home [data-go=shop]', 'shop', 'ht_shop'],
  ['#goPocket', 'pocket', 'ht_pocket'],
  ['#goTutorial', 'tutorial', 'ht_train'],
  ['#goSplit', 'splitGo', 'ht_split'],
  ['#scr-home [data-go=arsenal]', 'arsenal', 'ht_arsenal'],
  ['#scr-home [data-go=look]', 'look', 'ht_look'],
  ['#scr-home [data-go=skills]', 'skTab', 'ht_skills'],
  ['#scr-home [data-go=challenges]', 'challenges', 'ht_ch'],
  ['#scr-home [data-go=settings]', 'settings', 'ht_set'],
];

export function homeTourSeen() { try { return !!localStorage.getItem(KEY); } catch { return true; } }

export function startHomeTour({ touch = false } = {}) { runTour(STEPS, { key: KEY, screen: 'scr-home', touch }); }

// Tours das telas (07/11, pedido dele): na 1a vez que abre o Arsenal, o Visual, as Skills e os Desafios, o mesmo holofote
// explica a tela por partes. Uma vez so por aparelho (rr_tour_<tela>); nunca por cima da partida.
const SCREEN_TOURS = {
  arsenal: [
    ['#catTabs', 'tt_ar_cats', 'tt_ar_catsD'],
    ['#equipBar', 'tt_ar_eq', 'tt_ar_eqD'],
    ['#slotList', 'tt_ar_parts', 'tt_ar_partsD'],
    ['#statBars', 'tt_ar_stats', 'tt_ar_statsD'],
    ['#catTabs [data-c=nades]', 'tt_ar_nades', 'tt_ar_nadesD'],
    ['#catTabs [data-c=streaks]', 'tt_ar_stk', 'tt_ar_stkD'],
    ['#smithRange', 'tt_ar_range', 'tt_ar_rangeD'],
  ],
  look: [
    ['#lookTabs', 'tt_lk_tabs', 'tt_lk_tabsD'],
    ['#lookGrid', 'tt_lk_grid', 'tt_lk_gridD'],
    ['#scr-look .look-team', 'tt_lk_team', 'tt_lk_teamD'],
  ],
  skills: [
    ['#skillPane .sk-medals', 'tt_sk_slots', 'tt_sk_slotsD'],
    ['#skillPane > .sk-grid', 'tt_sk_grid', 'tt_sk_gridD'],
    ['#skillPane .sk-field', 'tt_sk_field', 'tt_sk_fieldD'],
  ],
  challenges: [
    ['#chElite', 'tt_ch_elite', 'tt_ch_eliteD'],
    ['#chDaily', 'tt_ch_daily', 'tt_ch_dailyD'],
    ['#chCareer', 'tt_ch_career', 'tt_ch_careerD'],
  ],
};
const seenKey = (name) => 'rr_tour_' + name;
let tourOpen = false;
export function screenTour(name, { touch = false } = {}) {
  if (!SCREEN_TOURS[name] || tourOpen || document.body.classList.contains('in-game') || document.querySelector('.htour')) return;
  try { if (localStorage.getItem(seenKey(name))) return; } catch { return; }
  // espera a tela desenhar (render + transicao) antes de medir os blocos
  setTimeout(() => { const el = document.getElementById('scr-' + name); if (el && !el.hidden && el.offsetParent && !document.querySelector('.htour')) runTour(SCREEN_TOURS[name], { key: seenKey(name), screen: 'scr-' + name, touch, done: 'htGot' }); }, 450);
}

function runTour(STEPS, { key, screen, touch = false, done = 'htDone' }) {
  const steps = STEPS.filter(([sel]) => { const e = document.querySelector(sel); return e && e.offsetParent; });
  if (!steps.length) return;
  try { localStorage.setItem(key, '1'); } catch { /* sem storage */ }
  tourOpen = true;
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
    root.querySelector('#htNext').textContent = t(i === steps.length - 1 ? done : 'htNext');
    place();
    root.querySelector('#htNext').focus({ preventScroll: true });
  };
  const close = () => { tourOpen = false; clearInterval(watch); removeEventListener('resize', place); removeEventListener('keydown', keyDown, true); root.remove(); };
  // so existe na tela dele (03/11: ficava aberto por cima da partida/lobby quando a pessoa saia do menu)
  const home = document.getElementById(screen);
  const watch = setInterval(() => { if (!home || home.hidden || !home.offsetParent || document.body.classList.contains('in-game')) close(); }, 200);
  const next = () => { audio.play('ui_click', { ui: true }); if (++i >= steps.length) close(); else show(); };
  const keyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); audio.play('ui_back', { ui: true }); close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); i--; show(); }
  };
  root.querySelector('#htNext').onclick = next;
  root.querySelector('#htSkip').onclick = () => { audio.play('ui_back', { ui: true }); close(); };
  addEventListener('resize', place);
  addEventListener('keydown', keyDown, true);
  show();
  requestAnimationFrame(() => root.classList.add('in'));
}
