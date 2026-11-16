// Tela Divisoes (16/11, pedido dele): os "clas" do jogo. Sem divisao: as 10 + o questionario (6 perguntas) que enquadra.
// Com divisao: o brasao dela, ranking do mes, rankeada de divisoes, duelo da semana e os melhores da divisao.
// O servidor enquadra e soma os pontos (shared/divisions.js + server games/rubber-riot/divisoes.ts). Visitante: a divisao fica
// no aparelho (aparece no nome), mas nao pontua.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { me, divLoad, divJoin } from './rovex.js';
import { DIVISIONS, DIV, DIV_QUIZ, DIV_BY_TAG, assignDivision, DIV_DESERT_ZP } from '../shared/divisions.js';

const LS = 'rr_div';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n || 0).toLocaleString(document.documentElement.lang || 'pt-BR');
export const localDiv = () => { try { const o = JSON.parse(localStorage.getItem(LS) || 'null'); return o && DIV[o.id] ? o : null; } catch { return null; } };
const saveLocal = (id, at = Date.now()) => { try { localStorage.setItem(LS, JSON.stringify({ id, at })); } catch { /* */ } dispatchEvent(new Event('rr-div')); };
// tag que vai no loadout (a conta o servidor troca pela dela)
export const myDivTag = () => { const d = localDiv(); return d ? DIV[d.id].tag : null; };
// carimbo da tag (placar, lobby, killfeed, ranking)
export function divChip(tag, big = false) {
  const d = DIV_BY_TAG[tag]; if (!d) return '';
  return `<span class="dv-chip${big ? ' big' : ''}" style="--dc:${d.color};--di:${d.ink}" title="${esc(t('dv_' + d.id))}">${d.tag}</span>`;
}
export const divTagText = (tag) => DIV_BY_TAG[tag] ? `[${tag}] ` : '';

const crest = (d, cls = '') => `<span class="dv-crest ${cls}" style="--dc:${d.color};--di:${d.ink}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${d.ico}"/></svg><b>${d.tag}</b></span>`;

let root = null, state = { view: 'home', tab: 'm', data: null, quiz: [], step: 0 };

export function openDivisions(el) {
  root = el; try { localStorage.setItem('rr_div_seen', '1'); } catch { /* */ }
  state = { view: 'home', tab: 'm', data: null, quiz: [], step: 0 };
  render(); load();
}
async function load() {
  const r = await divLoad();
  state.data = r;
  // conta logada: a divisao do servidor manda (e o aparelho acompanha pra mostrar no nome)
  if (r && !r.code) { if (r.minha) saveLocal(r.minha.id, r.minha.at); else if (localDiv()) { try { localStorage.removeItem(LS); } catch { /* */ } } }
  if (state.view === 'home') render();
}

function render() {
  if (!root) return;
  const mine = localDiv();
  if (state.view === 'quiz') return renderQuiz();
  if (state.view === 'reveal') return renderReveal();
  root.innerHTML = mine ? mineHtml(DIV[mine.id], mine) : introHtml();
  wire();
}

function introHtml() {
  return `<div class="dv-intro"><p>${t('dvIntro')}</p><button type="button" class="big dv-go" data-act="quiz">${t('dvQuizGo')}</button></div>
    <h3 class="dv-h">${t('dvAll')}</h3>
    <ul class="dv-grid">${DIVISIONS.map(d => `<li class="dv-card">${crest(d)}<div><b>${t('dv_' + d.id)}</b><i>${t('dvm_' + d.id)}</i><small>${t('dvt_' + d.id)}</small></div></li>`).join('')}</ul>`;
}

function mineHtml(d, mine) {
  const D = state.data;
  const head = `<section class="dv-mine" style="--dc:${d.color};--di:${d.ink}">${crest(d, 'xl')}<div class="dv-mine-txt"><small>${t('dvMine')}</small><h3>${t('dv_' + d.id)}</h3><i>${t('dvm_' + d.id)}</i><p>${t('dvt_' + d.id)}</p>
    <button type="button" class="plain dv-redo" data-act="desert">${t('dvDesert', { n: fmt(DIV_DESERT_ZP) })}</button></div></section>`;
  if (!D) return head + `<p class="dv-note">${t('dvLoading')}</p>`;
  if (D.code === 'login') return head + `<p class="dv-note">${t('dvGuest')}</p>`;
  if (D.code) return head + `<p class="dv-note">${t('dvErr')}</p>`;
  const tabs = [['m', 'dvTabM'], ['r', 'dvTabR'], ['w', 'dvTabW'], ['p', 'dvTabP']];
  return head + `<nav class="dv-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${t(l)}</button>`).join('')}</nav>
    <div class="dv-body">${tabBody(D, d.id)}</div><p class="dv-how">${t('dvHowPts')}</p>`;
}

function board(pts, mineId) {
  const rows = DIVISIONS.map(d => [d, Number(pts?.[d.id]) || 0]).sort((a, b) => b[1] - a[1]), max = Math.max(1, rows[0][1]);
  if (!rows[0][1]) return `<p class="dv-note">${t('dvEmpty')}</p>`;
  return `<ol class="dv-board">${rows.map(([d, p], i) => `<li class="${d.id === mineId ? 'me' : ''}"><em>${i + 1}</em>${divChip(d.tag)}<b>${t('dv_' + d.id)}</b><span class="dv-bar"><i style="width:${Math.round(p / max * 100)}%;background:${d.color}"></i></span><strong>${t('dvPts', { n: fmt(p) })}</strong></li>`).join('')}</ol>`;
}
function duel(D2, mineId, label) {
  return `<h4 class="dv-sub">${label}</h4><ul class="dv-duels">${D2.pares.map(([a, b]) => {
    const pa = Number(D2.pts?.[a]) || 0, pb = Number(D2.pts?.[b]) || 0, A = DIV[a], B = DIV[b];
    const side = (X, p, win) => `<div class="dv-side ${win ? 'win' : ''} ${X.id === mineId ? 'me' : ''}">${divChip(X.tag, true)}<b>${t('dv_' + X.id)}</b><strong>${fmt(p)}</strong></div>`;
    return `<li>${side(A, pa, pa > pb)}<span class="dv-vs">${t('dvVs')}</span>${side(B, pb, pb > pa)}</li>`;
  }).join('')}</ul>`;
}
function tabBody(D, mineId) {
  if (state.tab === 'm') return board(D.mensal, mineId);
  if (state.tab === 'r') return board(D.rankeada, mineId);
  if (state.tab === 'w') return duel(D.duelo, mineId, t('dvThisWeek')) + duel(D.dueloAnt, mineId, t('dvLastWeek'));
  const list = D.melhores?.[mineId] || [];
  if (!list.length) return `<p class="dv-note">${t('dvEmpty')}</p>`;
  return `<ol class="dv-board members">${list.map((m, i) => `<li class="${m.eu ? 'me' : ''}"><em>${i + 1}</em>${divChip(DIV[mineId].tag)}<b>${esc(m.nome)}${m.eu ? ` <small>(${t('dvYou')})</small>` : ''}</b><strong>${t('dvPts', { n: fmt(m.pts) })}</strong></li>`).join('')}</ol>`;
}

function renderDesert() {
  const d = DIV[localDiv()?.id] || DIVISIONS[0];
  root.innerHTML = `<section class="dv-desert" style="--dc:${d.color};--di:${d.ink}">${crest(d, 'xl')}<h3>${t('dvDesertT')}</h3><p>${t('dvDesertP', { n: fmt(DIV_DESERT_ZP), d: t('dv_' + d.id) })}</p>
    <div class="dv-desert-acts"><button type="button" class="big dv-go" data-act="quiz">${t('dvDesertGo')}</button><button type="button" class="plain" data-act="home">${t('dvDesertNo')}</button></div></section>`;
  wire();
}
function renderQuiz() {
  const i = state.step, n = DIV_QUIZ.length;
  root.innerHTML = `<section class="dv-quiz" aria-live="polite"><p class="dv-step">${t('dvQ', { n: i + 1, m: n })}</p><span class="dv-prog"><i style="width:${Math.round(i / n * 100)}%"></i></span>
    <h3>${t('dq_' + i)}</h3><div class="dv-ans">${[0, 1, 2, 3].map(a => `<button type="button" data-ans="${a}">${t('dq_' + i + '_' + a)}</button>`).join('')}</div>
    <button type="button" class="plain dv-back" data-act="${i ? 'prev' : 'home'}">${t(i ? 'dvPrev' : 'dvBack')}</button></section>`;
  wire(); root.querySelector('[data-ans]')?.focus({ preventScroll: true });
}
async function finishQuiz() {
  const logged = !!me && !(state.data && state.data.code === 'login');
  let id;
  if (logged) {
    const r = await divJoin(state.quiz);
    if (r.code === 'sem_saldo') { state.view = 'home'; render(); root.insertAdjacentHTML('afterbegin', `<p class="dv-note warn">${t('dvNoZp', { n: fmt(r.preco || DIV_DESERT_ZP) })}</p>`); return; }
    if (r.same) state.same = true;
    if (r.code && r.code !== 'login') { state.view = 'home'; render(); root.insertAdjacentHTML('afterbegin', `<p class="dv-note warn">${t('dvErr')}</p>`); return; }
    id = r.id || assignDivision(state.quiz, me?.id || '');
  } else id = assignDivision(state.quiz, me?.id || localStorage.getItem('rr_guest') || '');
  saveLocal(id); state.revealId = id; suspense(id);
}
// suspense (16/11, pedido dele): os brasoes das divisoes passam como roleta, desacelerando com um tique, e param no resultado
function suspense(id) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { state.view = 'reveal'; render(); load(); return; }
  state.view = 'suspense';
  root.innerHTML = `<section class="dv-sus" aria-live="polite"><p>${t('dvSus')}</p><div class="dv-sus-slot"></div><small class="dv-sus-name"></small><span class="dv-sus-dots" aria-hidden="true"><i></i><i></i><i></i></span></section>`;
  const slot = root.querySelector('.dv-sus-slot'), name = root.querySelector('.dv-sus-name');
  const order = DIVISIONS.map(d => d.id).filter(x => x !== id).sort(() => Math.random() - 0.5);
  const steps = 22; let k = 0;
  const show = (did, last) => { const d = DIV[did]; slot.innerHTML = crest(d, 'xl' + (last ? ' drop' : ' spin')); name.textContent = last ? '' : t('dv_' + did); };
  const tick = () => {
    if (state.view !== 'suspense' || !root.isConnected) return;
    if (k >= steps) { audio.play('reward_section', { ui: true, vol: 0.8, jitter: 0 }); show(id, true); setTimeout(() => { if (state.view === 'suspense') { state.view = 'reveal'; render(); load(); } }, 650); return; }
    show(order[k % order.length], false); audio.play('ui_hover', { ui: true, vol: 0.55, rate: 0.8 + k * 0.03, jitter: 0 });
    k++; setTimeout(tick, 60 + Math.pow(k / steps, 3) * 520); // comeca rapido e vai freando
  };
  audio.play('reward_card', { ui: true, vol: 0.6, jitter: 0 });
  setTimeout(tick, 700);
}
function renderReveal() {
  const d = DIV[state.revealId];
  const same = state.same; state.same = false;
  root.innerHTML = `<section class="dv-reveal" style="--dc:${d.color};--di:${d.ink}"><p>${t(same ? 'dvSame' : 'dvReveal')}</p>${crest(d, 'xl drop')}<h3>${t('dv_' + d.id)}</h3><i>${t('dvm_' + d.id)}</i><small>${t('dvt_' + d.id)}</small>
    <button type="button" class="big dv-go" data-act="home">${t('dvJoinGo')}</button></section>`;
  audio.play('unlock', { ui: true, vol: 0.8 });
  wire(); root.querySelector('.dv-go')?.focus({ preventScroll: true });
}

function wire() {
  root.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { state.tab = b.dataset.tab; audio.play('ui_hover', { ui: true, vol: 0.5 }); render(); return; }
    if (b.dataset.ans != null) { audio.play('ui_click', { ui: true, vol: 0.6 }); state.quiz[state.step] = +b.dataset.ans; if (++state.step >= DIV_QUIZ.length) finishQuiz(); else renderQuiz(); return; }
    const a = b.dataset.act; if (!a) return;
    audio.play(a === 'home' ? 'ui_back' : 'ui_click', { ui: true });
    if (a === 'quiz') { state.view = 'quiz'; state.step = 0; state.quiz = []; renderQuiz(); }
    else if (a === 'desert') renderDesert();
    else if (a === 'prev') { state.step = Math.max(0, state.step - 1); renderQuiz(); }
    else if (a === 'home') { state.view = 'home'; render(); }
  };
}
// borda vermelha animada no botao do menu (16/11, pedido dele: sempre, pra chamar atencao)
// pill do botao (16/11, pedido dele): sem divisao = "inscrever-se"; com divisao = a tag na cor dela
const callBtn = () => {
  const b = document.querySelector('.bill-item[data-go="divisions"]'); if (!b) return;
  b.classList.add('call'); b.querySelector('.nw, .dv-pill')?.remove();
  const d = localDiv(), D = d && DIV[d.id];
  b.insertAdjacentHTML('beforeend', D ? `<span class="dv-pill" style="--dc:${D.color};--di:${D.ink}">${D.tag}</span>` : `<span class="ch-new nw dv-join">${t('dvJoinPill')}</span>`);
};
callBtn(); addEventListener('rr-div', callBtn);
addEventListener('rr-lang', callBtn);
