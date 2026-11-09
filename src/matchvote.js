// Alterar a partida em andamento (08/11, pedido dele): o host muda as opcoes, TODOS os outros jogadores precisam aprovar.
// Sem ninguem mais na sala, aplica na hora. Quem decide e o servidor (shared/core.js: mvOpen, mvTick, mvApply).
// Teclado (mouse travado): Y e N. Controle: direcional esquerda e direita. Toque: os botoes.
import { t } from './i18n.js';
import { audio } from './audio.js';
import { cfgRows } from './lobby.js';
import { isTouch } from './input.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SEND_KEYS = ['mode', 'map', 'bots', 'difficulty', 'limit', 'time', 'mut', 'tod'];
const pick = (c) => Object.fromEntries(SEND_KEYS.map(k => [k, c[k] ?? (k === 'mut' ? '' : k === 'tod' ? 'day' : k === 'limit' || k === 'time' ? 0 : c[k])]));
const same = (a, b) => SEND_KEYS.every(k => (a[k] ?? '') === (b[k] ?? ''));
const ARROW = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d < 0 ? 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z' : 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z'}"/></svg>`;

export class MatchVote {
  constructor({ G, send, onApplied, onCloseEditor }) { Object.assign(this, { G, send, onApplied, onCloseEditor }); this.card = null; this.ed = null; this.v = null; this.onKey = this.onKey.bind(this); addEventListener('keydown', this.onKey, true); addEventListener('mv-pad', (e) => this.vote(e.detail)); }

  // ---------- quadro do host ----------
  canEdit() { const G = this.G; return !!G.lobbyCfg && G.lobbyHost === G.myId && !G.lobbyCfg.ranked && !G.tutorial && !G.range && !G.snap?.over; }
  openEditor() {
    const base = this.G.lobbyCfg; if (!base) return;
    this.base = base; this.draft = { ...base };
    if (!this.ed) { const el = this.ed = document.createElement('div'); el.id = 'mvEd'; el.className = 'overlay mv-ed'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'mvEdT'); document.body.appendChild(el); }
    this.ed.hidden = false; this.drawEditor();
    this.ed.querySelector('.ar, #mvEdClose')?.focus();
  }
  closeEditor(back = true) { if (!this.ed || this.ed.hidden) return; this.ed.hidden = true; if (back) this.onCloseEditor?.(); }
  drawEditor() {
    const d = this.draft, rows = cfgRows(d).filter(r => r[0] !== 'ranked');
    const changed = !same(pick(d), pick(this.base)), alone = (this.G.lobbyHumans || 1) < 2;
    this.ed.innerHTML = `<div class="mv-sheet"><header><h2 id="mvEdT">${t('mvTitle')}</h2><p>${t(alone ? 'mvSubSolo' : 'mvSub')}</p></header>
      <ul class="mv-rows">${rows.map(([k, list, cur, fmt]) => { const i = Math.max(0, list.indexOf(cur)), one = list.length < 2; return `<li data-k="${k}"><span class="k">${t('cfg_' + k)}</span>${one ? '<i></i>' : `<button class="ar" data-d="-1" aria-label="${t('cfgPrev')} ${t('cfg_' + k)}">${ARROW(-1)}</button>`}<b class="v" aria-live="polite">${esc(fmt(list[i]))}</b>${one ? '<i></i>' : `<button class="ar" data-d="1" aria-label="${t('cfgNext')} ${t('cfg_' + k)}">${ARROW(1)}</button>`}</li>`; }).join('')}</ul>
      <footer><button class="plain" id="mvEdClose">${t('mvClose')}</button><button class="big" id="mvEdSend" ${changed ? '' : 'disabled'}>${t(alone ? 'mvApply' : 'mvSend')}</button></footer></div>`;
    for (const b of this.ed.querySelectorAll('.ar')) b.onclick = () => {
      const k = b.closest('li').dataset.k, dir = +b.dataset.d, r = rows.find(x => x[0] === k), list = r[1], v = list[(Math.max(0, list.indexOf(r[2])) + dir + list.length) % list.length];
      if (k === 'players') d.bots = v - 1; else if (k === 'wave') d.limit = v; else d[k] = v;
      if (k === 'mode') { d.limit = 0; d.time = 0; const maps = cfgRows(d).find(x => x[0] === 'map')[1]; if (!maps.includes(d.map)) d.map = maps[0]; }
      audio.play('ui_click', { ui: true, vol: 0.6 }); this.drawEditor();
      this.ed.querySelector(`li[data-k="${k}"] .ar[data-d="${dir}"]`)?.focus();
    };
    this.ed.querySelector('#mvEdClose').onclick = () => { audio.play('ui_click', { ui: true }); this.closeEditor(); };
    this.ed.querySelector('#mvEdSend').onclick = () => { audio.play('pickup', { ui: true, vol: 0.5 }); this.send({ t: 'mvProp', cfg: pick(d) }); this.closeEditor(); };
  }

  // ---------- votacao ----------
  // o que muda, em texto: valor antigo riscado e o novo
  changes(cfg) {
    const base = this.G.lobbyCfg || {}, now = cfgRows(base), next = cfgRows({ ...base, ...cfg }), out = [];
    const val = (rows, k) => { const r = rows.find(x => x[0] === k); return r ? r[3](r[2]) : null; };
    for (const r of next) {
      const k = r[0]; if (k === 'ranked') continue;
      const a = val(now, k), b = val(next, k);
      if (a !== b && b != null) out.push(`<li><span>${t('cfg_' + k)}</span>${a != null ? `<s>${esc(a)}</s>` : ''}<b>${esc(b)}</b></li>`);
    }
    return out.join('');
  }
  name(id) { return this.G.nameOf?.(id) || ''; }
  event(e) {
    const G = this.G;
    if (e.st === 'open') {
      this.v = { host: e.host, need: e.need, yes: e.yes || 0, end: performance.now() + e.secs * 1000, dur: e.secs, mine: e.host === G.myId, voted: false, cfg: e.cfg, voter: e.need.includes(G.myId) };
      if (!this.v.mine && !this.v.voter) { this.v = null; return; } // entrou depois: nao vota
      this.draw(); audio.play('flag', { ui: true, vol: 0.6 }); return;
    }
    if (e.st === 'tally') { if (this.v) { this.v.yes = e.yes; this.tally(); } return; }
    const was = !!this.v; this.hide();
    if (e.st === 'ok') { G.hud.message(t('mvOk'), 2.8); this.closeEditor(false); this.onApplied?.(); }
    else if (was && e.st === 'no') G.hud.message(t('mvDenied', { n: this.name(e.who) }), 3);
    else if (was && e.st === 'time') G.hud.message(t('mvTimeout'), 3);
    else if (was && e.st === 'cancel') G.hud.message(t('mvCanceled'), 2.4);
  }
  fail(e) { this.G.hud.message(t('mvCd', { n: e.n }), 2.2); }
  draw() {
    const v = this.v, pad = !!this.G.pad?.active;
    const el = this.card ||= Object.assign(document.createElement('section'), { id: 'mvCard', className: 'mv-card' }); if (!el.isConnected) document.body.appendChild(el);
    el.setAttribute('aria-live', 'assertive'); el.hidden = false; document.body.classList.toggle('mv-voting', v.voter); document.body.classList.add('mv-open');
    const hint = (k, p) => isTouch ? '' : `<kbd>${pad ? p : k}</kbd>`;
    el.innerHTML = `<i class="mv-fuse" id="mvFuse"></i><h3>${v.mine ? t('mvWait') : t('mvAsk', { n: esc(this.name(v.host)) })}</h3><ul>${this.changes(v.cfg)}</ul><div class="mv-foot"><small id="mvTally"></small>${v.mine
      ? `<button id="mvCancel">${t('mvCancel')}</button>`
      : `<span id="mvBtns"><button id="mvNo">${hint('N', '▶')}${t('mvNo')}</button><button id="mvYes" class="yes">${hint('Y', '◀')}${t('mvYes')}</button></span>`}</div>`;
    if (v.mine) el.querySelector('#mvCancel').onclick = () => { audio.play('ui_click', { ui: true }); this.send({ t: 'mvCancel' }); };
    else { el.querySelector('#mvYes').onclick = () => this.vote(true); el.querySelector('#mvNo').onclick = () => this.vote(false); }
    this.tally(); this.tick();
  }
  tally() { const v = this.v, s = this.card?.querySelector('#mvTally'); if (v && s) s.textContent = v.voted && !v.mine ? t('mvVoted') + '. ' + t('mvTally', { y: v.yes, n: v.need.length }) : t('mvTally', { y: v.yes, n: v.need.length }); }
  vote(yes) {
    const v = this.v; if (!v || !v.voter || v.voted || v.mine) return;
    v.voted = true; this.send({ t: 'mvVote', yes: !!yes }); audio.play('ui_click', { ui: true, vol: 0.7 });
    this.card?.querySelector('#mvBtns')?.remove(); document.body.classList.remove('mv-voting'); this.tally();
    if (isTouch) { this.card.hidden = true; document.body.classList.remove('mv-open'); this.G.hud.message(t('mvVoted'), 1.6); } // celular: votou, o cartao sai e os botoes voltam
  }
  onKey(e) {
    if (this.ed && !this.ed.hidden && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.closeEditor(); return; }
    if (!this.v?.voter || this.v.voted || e.repeat || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (e.code === 'KeyY' || e.code === 'KeyN') { e.preventDefault(); e.stopImmediatePropagation(); this.vote(e.code === 'KeyY'); }
  }
  tick() { const v = this.v; if (!v) return; const f = this.card?.querySelector('#mvFuse'); if (f) f.style.transform = `scaleX(${Math.max(0, (v.end - performance.now()) / (v.dur * 1000))})`; }
  hide() { this.v = null; if (this.card) this.card.hidden = true; document.body.classList.remove('mv-voting', 'mv-open'); }
  reset() { this.hide(); this.closeEditor(false); }
}

