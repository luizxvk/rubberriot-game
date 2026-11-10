// Chat Rapido (10/11, pedido dele: "similar ao Forza Link, com frases comicas"): painel com 10 frases prontas.
// PC: Y abre/fecha, 1 a 0 manda. Controle: direcional para baixo (fora da mira) abre, cima/baixo escolhe, A manda, B fecha.
// Toque: balao com raio no canto de cima. A frase vai como NUMERO (cada um le no proprio idioma) e aparece no chat
// de todo mundo e num balao em cima de quem falou. O servidor so aceita o numero e segura flood (core.js 'qc').
import { t } from './i18n.js';
import { isTouch } from './input.js';

export const QC_N = 10;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const IDLE_MS = 6000;

export class QuickChat {
  constructor({ send, canPlay, keyOf }) {
    this.send = send; this.canPlay = canPlay; this.keyOf = keyOf;
    this.isOpen = false; this.sel = 0; this.lastSent = 0;
    const el = this.el = document.createElement('div');
    el.id = 'qc'; el.className = 'qc'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'false');
    document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-qc]'); if (b) this.pick(Number(b.dataset.qc)); else if (e.target.closest('.qc-x')) this.close(); });
    // teclado: so o que importa com o painel aberto (1-3 nao trocam de arma enquanto ele esta aberto)
    addEventListener('keydown', (e) => {
      if (!this.isOpen || e.repeat) return;
      const m = /^(Digit|Numpad)(\d)$/.exec(e.code);
      if (m) { e.preventDefault(); e.stopImmediatePropagation(); this.pick((Number(m[2]) + 9) % 10); return; }
      if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); this.close(); }
    }, true);
    addEventListener('qc-pad', (e) => {
      const k = e.detail;
      if (k === 'up') this.move(-1); else if (k === 'down') this.move(1); else if (k === 'ok') this.pick(this.sel); else if (k === 'back') this.close();
    });
  }

  render() {
    const kb = !isTouch;
    this.el.innerHTML = `<header><b>${esc(t('qcTitle'))}</b><small>${esc(t(isTouch ? 'qcHintTouch' : 'qcHint', { k: this.keyOf?.() || 'Y' }))}</small><button type="button" class="qc-x" aria-label="${esc(t('chat_close'))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></header>`
      + `<ol>${Array.from({ length: QC_N }, (_, i) => `<li><button type="button" data-qc="${i}" class="${i === this.sel ? 'sel' : ''}">${kb ? `<kbd>${(i + 1) % 10}</kbd>` : ''}<span>${esc(t('qc_' + i))}</span></button></li>`).join('')}</ol>`;
  }
  move(d) { this.sel = (this.sel + d + QC_N) % QC_N; for (const b of this.el.querySelectorAll('[data-qc]')) b.classList.toggle('sel', Number(b.dataset.qc) === this.sel); this.bump(); }
  bump() { clearTimeout(this.idle); this.idle = setTimeout(() => this.close(), IDLE_MS); }
  toggle() { if (this.isOpen) this.close(); else this.open(); }
  open() {
    if (this.isOpen || !this.canPlay()) return;
    this.isOpen = true; this.render(); this.el.hidden = false;
    document.body.classList.add('qc-open'); this.bump();
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false; this.el.hidden = true; clearTimeout(this.idle);
    document.body.classList.remove('qc-open');
  }
  pick(i) {
    if (!(i >= 0 && i < QC_N)) return;
    const now = performance.now();
    if (now - this.lastSent > 1200) { this.lastSent = now; this.send(i); }
    this.close();
  }
}
