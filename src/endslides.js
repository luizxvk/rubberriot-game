// Fim da partida (04/11, pedido dele): primeiro os dados; depois a tela desliza sozinha pros itens liberados, um por vez,
// como cartaz de cinema com carimbo, e volta pro placar. Abas deixam navegar na mao (mexeu, para o automatico).
// Sala sem lobby tem contagem curta: o tempo de cada item encolhe pra todos passarem antes da proxima partida.
import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);
const DATA_MS = 4500, DATA_SHORT_MS = 2500, ITEM_MS = 2800, ITEM_MIN_MS = 1100;
const NEW_ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>'; // sem foto (Material Icons, Apache 2.0)
let timer = 0;

const artOf = (it) => (it.art ? it.art : it.img ? `<img src="${it.img}" alt="">` : NEW_ICO);

export function startEndSlides(items, budget = Infinity) {
  clearTimeout(timer);
  const rail = $('endRail'), lib = $('endLib'), tabs = $('endTabs'), cols = rail.querySelector('.end-cols');
  const pane = (on) => {
    rail.classList.toggle('on-lib', on); lib.inert = !on; cols.inert = on;
    rail.closest('.end-card').scrollTop = 0; // celular deitado: o placar empilhado rola, o slide comeca do topo
    tabs.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i === (on ? 1 : 0))));
  };
  pane(false);
  lib.hidden = tabs.hidden = !items.length;
  if (!items.length) return;
  tabs.innerHTML = `<button type="button">${t('endTabScore')}</button><button type="button">${t('endTabNew', { n: items.length })}</button>`;
  lib.innerHTML = `<div class="el-poster"><span class="el-art"></span><b class="el-stamp">${t('elNew')}</b></div>
    <div class="el-info"><h3>${t('endUnl')}</h3><small class="el-kind"></small><p class="el-name" aria-live="polite"></p>
    ${items.length > 1 ? `<ol class="el-strip">${items.map((it, i) => `<li><button type="button" aria-label="${(it.name || '').replace(/"/g, '&quot;')}" data-i="${i}">${artOf(it)}</button></li>`).join('')}</ol>` : ''}</div>`;
  const stamp = lib.querySelector('.el-stamp'), thumbs = [...lib.querySelectorAll('.el-strip button')];
  const show = (i) => {
    const it = items[i];
    lib.querySelector('.el-art').innerHTML = artOf(it);
    lib.querySelector('.el-kind').textContent = it.kind;
    lib.querySelector('.el-name').textContent = it.name;
    thumbs.forEach((b, j) => b.classList.toggle('on', j === i));
    thumbs[i]?.scrollIntoView({ inline: 'center', block: 'nearest' });
    stamp.classList.remove('hit'); void stamp.offsetWidth; stamp.classList.add('hit'); // o carimbo bate de novo a cada item
  };
  show(0);
  const short = Number.isFinite(budget), data = short ? DATA_SHORT_MS : DATA_MS;
  const per = short ? Math.max(ITEM_MIN_MS, Math.min(ITEM_MS, (budget - data) / items.length)) : ITEM_MS;
  const later = (fn, ms) => { timer = setTimeout(() => { if (!$('theend').hidden) fn(); }, ms); };
  const step = (i) => { if (i >= items.length) { pane(false); return; } show(i); later(() => step(i + 1), per); };
  later(() => { pane(true); step(0); }, data);
  const manual = (fn) => () => { clearTimeout(timer); fn(); };
  const [bScore, bNew] = tabs.querySelectorAll('button');
  bScore.onclick = manual(() => pane(false));
  bNew.onclick = manual(() => pane(true));
  thumbs.forEach((b, i) => { b.onclick = manual(() => show(i)); });
}
