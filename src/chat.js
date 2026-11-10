// Chat da partida online (01/11): as mensagens aparecem no canto do HUD e somem sozinhas; Enter ou T abre a caixa
// no PC, o balao ao lado da pausa abre no celular (com frases prontas, digitar no celular no meio do tiroteio e dificil).
// Partida solo nao tem chat. O servidor corta o texto, segura flood e mascara palavrao (core.js cleanChat).
import { t } from './i18n.js';
import { isTouch, lockPointer } from './input.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const SHOW_MS = 7000, MAX_LINES = 8;
// lobby (10/11, pedido dele): o chat vira um balao no rodape, no meio da tela, que sobe quando chega mensagem e desce sozinho
const inLobby = () => $('lobby') && !$('lobby').hidden;
const LOBBY_MS = 6000;
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
    const lb = $('lobby'), dock = () => { const el = $('chat'), act = lb?.querySelector('.lb-actions'); if (!el || !act) return; const want = lb.hidden ? document.body : act; if (el.parentNode !== want) { if (want === act) act.prepend(el); else document.body.appendChild(el); } };
    if (lb) { new MutationObserver(dock).observe(lb, { attributes: true, attributeFilter: ['hidden'] }); dock(); }
    $('lbChat')?.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    // tecla: captura antes do input do jogo (T nao vira tecla de jogo, nada anda enquanto digita)
    addEventListener('keydown', (e) => {
      if (this.isOpen) {
        e.stopImmediatePropagation();
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); this.post(this.field.value); this.close(true); }
        else if (e.code === 'Escape') { e.preventDefault(); this.close(true); }
        return;
      }
      if (!this.on || e.repeat || !this.canPlay()) return;
      if (e.target?.closest?.('input, textarea, select')) return; // digitando em outro campo (lobby)
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyT') { e.preventDefault(); e.stopImmediatePropagation(); this.open(); }
    }, true);
    addEventListener('keyup', (e) => { if (this.isOpen) e.stopImmediatePropagation(); }, true);
    // o cartao do canto cresce (sequencia pronta, colete) ou a janela muda: o chat acompanha
    const bl = document.querySelector('.hud-bl');
    if (bl && typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.logOn && this.place()).observe(bl);
    addEventListener('resize', () => this.logOn && this.place());
  }

  relabel() {
    for (const b of $('chatQuick').children) b.textContent = t(b.dataset.k);
    this.field.placeholder = t(isTouch ? 'chat_ph_touch' : 'chat_ph');
    $('chatSend').textContent = t('chat_send');
    $('chatClose').setAttribute('aria-label', t('chat_close'));
    $('chatBtn')?.setAttribute('aria-label', t('chat_open'));
  }

  // liga na partida online, desliga no solo e no menu (some o botao e o log)
  // log (10/11): no solo o registro aparece tambem (Chat Rapido e provocacao dos bots), sem caixa de digitar
  enable(on, log = on) {
    this.on = on; this.logOn = on || log;
    document.body.classList.toggle('chat-log-on', this.logOn);
    if (on) this.relabel(); // o idioma pode ter mudado desde a carga
    if (!on) { this.close(); if (!log) this.log.innerHTML = ''; $('chat').classList.remove('show'); }
    document.body.classList.toggle('chat-on', on);
  }

  // nunca em cima do cartao do canto (sequencias, vida, colete, folego): o chat sobe ate o topo dele + folga
  // (02/11, regra dele: popup do chat nao sobrescreve nada). No celular o chat fica em cima (CSS).
  place() {
    const el = $('chat'), bl = document.querySelector('.hud-bl');
    if (!el || !bl || inLobby() || document.body.classList.contains('touchmode')) { if (el) el.style.bottom = ''; return; }
    const r = bl.getBoundingClientRect();
    if (r.height) el.style.bottom = Math.round(innerHeight - r.top + 12) + 'px';
  }

  open() {
    if (!this.on || this.isOpen) return;
    this.isOpen = true;
    this.place(); this.pop(true);
    this.input.keys.clear(); this.input.mouse.fire = this.input.mouse.ads = false;
    this.box.hidden = false; this.log.classList.add('open');
    this.box.classList.toggle('touch', isTouch);
    this.field.placeholder = t(isTouch ? 'chat_ph_touch' : inLobby() ? 'chat_ph_lb' : 'chat_ph');
    if (!isTouch) { document.exitPointerLock?.(); this.field.focus(); }
    else $('chatQuick').hidden = false;
  }

  // relock: fechou pelo teclado (o toque da tecla vale como gesto pro navegador travar o mouse de novo)
  close(relock = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.field.value = ''; this.field.blur();
    this.box.hidden = true; this.log.classList.remove('open');
    if (inLobby()) this.pop(); // o balao fica mais um pouco e desce
    else if (relock && !isTouch && this.canPlay()) lockPointer(this.canvas);
  }

  // balao do lobby: sobe (ou fica) e marca o ponto de mensagem nova no botao enquanto estiver fechado
  pop(opened = false) {
    const el = $('chat'), dot = document.querySelector('#lbChat .lb-chat-dot');
    if (!inLobby()) { el.classList.remove('show'); return; }
    el.classList.remove('out'); el.classList.add('show'); clearTimeout(this.popT); clearTimeout(this.outT);
    if (dot) dot.hidden = opened || this.isOpen ? true : dot.hidden;
    const btn = $('lbChat'); // rabinho do balao em cima do botao de chat (no meio da tela larga fica no centro)
    if (btn && btn.parentNode === el.parentNode && getComputedStyle(el).position !== 'fixed') { const b = btn.getBoundingClientRect(), r = el.getBoundingClientRect(); el.style.setProperty('--tail', Math.round(Math.min(r.width - 24, Math.max(24, b.left + b.width / 2 - r.left))) + 'px'); } // rabinho em cima do botao else el.style.removeProperty('--tail');
    this.popT = setTimeout(() => { if (this.isOpen) return; el.classList.add('out'); this.outT = setTimeout(() => el.classList.remove('show', 'out'), 200); }, LOBBY_MS);
  }
  unread() { const dot = document.querySelector('#lbChat .lb-chat-dot'); if (dot && inLobby() && !this.isOpen) dot.hidden = false; }

  post(text) {
    const s = String(text || '').trim();
    if (s) this.send({ t: 'chat', text: s.slice(0, 80) });
  }

  // linha do sistema (03/11): fulano entrou/saiu da partida, em italico, sem nome colorido
  sys(text) {
    if (!this.logOn) return;
    this.place();
    const li = document.createElement('li');
    li.className = 'sys'; li.textContent = text;
    this.log.appendChild(li); this.pop();
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    setTimeout(() => li.classList.add('old'), SHOW_MS);
  }

  // mensagem do servidor: nome na cor do time (vermelho = inimigo, azul = seu time, sem time = tinta)
  add(e, mine, enemy) {
    if (!this.logOn) return;
    this.place();
    const li = document.createElement('li');
    li.className = mine ? 'me' : enemy ? 'foe' : e.team ? 'mate' : '';
    li.innerHTML = `<b>${esc(e.name)}</b> ${esc(e.text)}`;
    this.log.appendChild(li); this.pop(); if (!mine) this.unread();
    if (!mine && inLobby()) this.onSound?.('chat_pop'); // lobby (10/11): pop macio quando chega mensagem
    while (this.log.children.length > MAX_LINES) this.log.firstChild.remove();
    setTimeout(() => li.classList.add('old'), SHOW_MS);
  }
}
