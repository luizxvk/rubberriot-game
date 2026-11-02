// Chat da partida online (01/11): as mensagens aparecem no canto do HUD e somem sozinhas; Enter ou T abre a caixa
// no PC, o balao ao lado da pausa abre no celular (com frases prontas, digitar no celular no meio do tiroteio e dificil).
// Partida solo nao tem chat. O servidor corta o texto, segura flood e mascara palavrao (core.js cleanChat).
import { t } from './i18n.js';
import { isTouch, lockPointer } from './input.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SHOW_MS = 7000, MAX_LINES = 8;
const QUICK = ['chq_gg', 'chq_nice', 'chq_follow', 'chq_watch', 'chq_help', 'chq_thanks'];

export class Chat {
  constructor({ input, canvas, send, canPlay }) {
    this.input = input; this.canvas = canvas; this.send = send; this.canPlay = canPlay;
    this.on = false; this.isOpen = false;
    this.log = $('chatLog'); this.box = $('chatBox'); this.field = $('chatField');
    $('chatQuick').innerHTML = QUICK.map(k => `<button type="button" data-k="${k}"></button>`).join('');
    this.relabel();
    $('chatQuick').onclick = (e) => { const b = e.target.closest('button'); if (b) { this.post(t(b.dataset.k)); this.close(); } };
    $('chatSend').onclick = () => { this.post(this.field.value); this.close(); };
    $('chatClose').onclick = () => this.close();
    // tecla: captura antes do input do jogo (T nao vira tecla de jogo, nada anda enquanto digita)
    addEventListener('keydown', (e) => {
      if (this.isOpen) {
        e.stopImmediatePropagation();
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); this.post(this.field.value); this.close(true); }
        else if (e.code === 'Escape') { e.preventDefault(); this.close(true); }
        return;
      }
      if (!this.on || e.repeat || !this.canPlay()) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyT') { e.preventDefault(); e.stopImmediatePropagation(); this.open(); }
    }, true);
    addEventListener('keyup', (e) => { if (this.isOpen) e.stopImmediatePropagation(); }, true);
  }

  relabel() {
    for (const b of $('chatQuick').children) b.textContent = t(b.dataset.k);
    this.field.placeholder = t(isTouch ? 'chat_ph_touch' : 'chat_ph');
    $('chatSend').textContent = t('chat_send');
    $('chatClose').setAttribute('aria-label', t('chat_close'));
    $('chatBtn')?.setAttribute('aria-label', t('chat_open'));
  }

  // liga na partida online, desliga no solo e no menu (some o botao e o log)
  enable(on) {
    this.on = on;
    if (on) this.relabel(); // o idioma pode ter mudado desde a carga
    if (!on) { this.close(); this.log.innerHTML = ''; }
    document.body.classList.toggle('chat-on', on);
  }

  open() {
    if (!this.on || this.isOpen) return;
    this.isOpen = true;
    this.input.keys.clear(); this.input.mouse.fire = this.input.mouse.ads = false;
    this.box.hidden = false; this.log.classList.add('open');
    this.box.classList.toggle('touch', isTouch);
    if (!isTouch) { document.exitPointerLock?.(); this.field.focus(); }
    else $('chatQuick').hidden = false;
  }

  // relock: fechou pelo teclado (o toque da tecla vale como gesto pro navegador travar o mouse de novo)
  close(relock = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.field.value = ''; this.field.blur();
    this.box.hidden = true; this.log.classList.remove('open');
    if (relock && !isTouch && this.canPlay()) lockPointer(this.canvas);
  }

  post(text) {
    const s = String(text || '').trim();
    if (s) this.send({ t: 'chat', text: s.slice(0, 80) });
  }

  // mensagem do servidor: nome na cor do time (vermelho = inimigo, azul = seu time, sem time = tinta)
  add(e, mine, enemy) {
    if (!this.on) return;
    const li = document.createElement('li');
    li.className = mine ? 'me' : enemy ? 'foe' : e.team ? 'mate' : '';
    li.innerHTML = `<b>${esc(e.name)}</b> ${esc(e.text)}`;
    this.log.appendChild(li);
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    setTimeout(() => li.classList.add('old'), SHOW_MS);
  }
}
