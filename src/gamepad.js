import { padBinds } from './binds.js';
import { SS } from './ssboot.js';
// Controle (Gamepad API, layout "standard" do Xbox/PlayStation). Mapa igual ao do COD:
// LT mira, RT atira, A pula, B agacha, X recarrega, Y troca, LB granada, RB flash,
// L3 corre, R3 faca, cima no direcional = sequencia, baixo = inspecionar, Start pausa, Select placar.
// Fora da partida (menus, lobby, pausa) o direcional/analogico anda pelo foco, A confirma e B volta.
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.16;
// pixels de mouse equivalentes por segundo com o analogico no talo (a sensibilidade do jogo multiplica)
const LOOK = 1350;

const dz = (v) => { const a = Math.abs(v); return a < DEAD ? 0 : Math.sign(v) * ((a - DEAD) / (1 - DEAD)); };
// o controle esta mandando comando agora? botao apertado ou eixo longe de onde ele REPOUSA (aparelho que fica parado
// com eixo em -1, tipo pedal/controle virtual, nao rouba o lugar do Xbox). rest = eixos da primeira leitura de cada um
const REST = new Map();
const hasInput = (g) => {
  if (!REST.has(g.index + g.id)) REST.set(g.index + g.id, [...g.axes]);
  const r = REST.get(g.index + g.id);
  return g.buttons.some(b => b?.pressed || (b?.value || 0) > 0.3) || g.axes.some((a, i) => Math.abs(a - (r[i] ?? 0)) > 0.45);
};

export class Pad {
  constructor(input) {
    this.input = input;
    this.prev = [];
    this.active = false;     // usou o controle por ultimo (vale ate mexer no mouse/teclado)
    this.sprintLatch = false;
    this.navT = 0;
    // mouse tira do modo controle so quando mexe DE VERDADE (03/11: evento de movimento zero/tremidinha desligava o controle)
    addEventListener('mousemove', (e) => { if (Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) > 3) this.setActive(false); });
    addEventListener('keydown', () => this.setActive(false));
    // celular: usou o controle, os botoes de toque somem; tocou na tela de novo, voltam
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.setActive(false); }, true);
    addEventListener('gamepaddisconnected', () => { if (!this.first()) this.setActive(false); this.onConn?.(false); });
    addEventListener('gamepadconnected', () => this.onConn?.(true));
    if (SS) queueMicrotask(() => this.setActive(true)); // tela dividida: dicas e botoes do controle desde o comeco
  }

  setActive(v) {
    if (SS) v = true; // tela dividida: cada tela e so controle
    if (this.active === v) return;
    this.active = v;
    document.body.classList.toggle('pad', v);
    this.onActive?.(v);
  }

  first() {
    // tela dividida: o controle desta tela, lido pela pagina de cima (ela tem o foco; o iframe pode nao ter)
    if (SS) { const g = window.parent.navigator.getGamepads?.()[SS.pad]; return g && g.connected ? g : null; }
    // 03/11: antes pegava o PRIMEIRO da lista; com outro aparelho conectado antes (dongle, headset, controle virtual
    // do Steam/DS4Windows) o Xbox de verdade era ignorado. Agora: o que esta mandando comando agora > o ultimo usado >
    // o de layout padrao (Xbox/PlayStation) > qualquer um
    const list = [...(navigator.getGamepads?.() || [])].filter(g => g && g.connected);
    if (!list.length) return null;
    const live = list.find(hasInput);
    if (live) { this.idx = live.index; return live; }
    return list.find(g => g.index === this.idx) || list.find(g => g.mapping === 'standard') || list[0];
  }

  // chamado a cada quadro. inGame = partida rolando sem pausa
  poll(dt, inGame) {
    const g = this.first();
    const I = this.input;
    I.pad = null;
    if (!g) return;
    const btn = (i) => !!g.buttons[i]?.pressed || (g.buttons[i]?.value || 0) > 0.3;
    const now = g.buttons.map((_, i) => btn(i));
    const down = (i) => now[i] && !this.prev[i];
    const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
    if (now.some(Boolean) || Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0) this.setActive(true);

    if (inGame) {
      // olhar: curva quadratica (precisao no comeco do curso, giro rapido no fim). Ajustes do controle (03/11, iguais
      // aos do mouse): sensibilidade, suavizacao (media do analogico) e aceleracao (segurando no fim do curso gira mais)
      const S = I.settings || {}, curve = (v) => Math.sign(v) * v * v;
      const smK = { off: 1, low: 0.45, high: 0.2 }[S.padSmooth || 'off'] ?? 1, kk = 1 - Math.pow(1 - smK, dt * 60);
      this.sx = (this.sx || 0) + (rx - (this.sx || 0)) * kk; this.sy = (this.sy || 0) + (ry - (this.sy || 0)) * kk;
      this.edgeT = Math.hypot(rx, ry) > 0.9 ? Math.min(1, (this.edgeT || 0) + dt / 0.6) : 0;
      const k = (S.padSens ?? 1) * (1 + (S.padAccel || 0) * this.edgeT * 1.2);
      I.lookX += curve(this.sx) * LOOK * k * dt;
      I.lookY += curve(this.sy) * LOOK * 0.72 * k * dt;
      // L3 trava a corrida ate parar de andar pra frente (igual COD)
      // botoes vem dos comandos remapeaveis (binds.js); Start e Select ficam fixos
      const P = I.padMap || (I.padMap = padBinds(I.settings)), bi = (id) => B[P[id]] ?? -1;
      if (down(bi('sprint'))) this.sprintLatch = !this.sprintLatch;
      if (-ly < 0.3) this.sprintLatch = false;
      I.pad = { mx: lx, mz: -ly, fire: now[bi('fire')], ads: now[bi('ads')], sprint: this.sprintLatch, crouchHeld: now[bi('crouch')], board: now[B.SELECT], use: now[bi('reload')], frag: now[bi('frag')], flash: now[bi('flash')], gadget: now[bi('gadget')] };
      for (const [id, ev] of [['fire', 'FIRE'], ['ads', 'ADS'], ['jump', 'JUMP'], ['crouch', 'CROUCH'], ['reload', 'RELOAD'], ['cycle', 'NEXT'], ['frag', 'FRAG'], ['flash', 'FLASH'], ['melee', 'MELEE'], ['streak', 'STREAK'], ['inspect', 'INSPECT'], ['field', 'FIELD'], ['ping', 'PING'], ['gadget', 'GADGET']]) if (down(bi(id))) I.edges.add(ev);
      if (down(B.START)) I.edges.add('Escape');
    } else {
      if (document.body.classList.contains('binding')) { this.prev = now; return; } // tela de comandos esperando um botao
      // menus: anda pelo foco com direcional ou analogico (repete segurando)
      this.navT -= dt;
      const dir = now[B.UP] || ly < -0.6 ? 'up' : now[B.DOWN] || ly > 0.6 ? 'down' : now[B.LEFT] || lx < -0.6 ? 'left' : now[B.RIGHT] || lx > 0.6 ? 'right' : null;
      const fresh = [B.UP, B.DOWN, B.LEFT, B.RIGHT].some(down);
      const cur = document.activeElement;
      // foco sumiu: a tela se redesenhou depois do clique (arsenal, ajustes, lobby...) ou trocou de tela. Primeiro
      // procura o mesmo botao (ou o que ficou no lugar dele) na mesma tela; so volta pro inicio se a tela mudou (01/11)
      if (cur && cur !== document.body && isShown(cur) && cur !== this.lastEl) { this.lastEl = cur; this.lastSig = sigOf(cur); }
      // popup: abriu = o foco entra nele (guarda quem abriu); fechou = a selecao volta pro botao que abriu
      const dlg = topDialog();
      if (dlg !== this.dlg) {
        if (dlg && this.active) { if (!this.dlg) { const op = cur && cur !== document.body && !dlg.contains(cur) ? cur : this.pressed && !dlg.contains(this.pressed) ? this.pressed : null; if (op) { this.opener = op; this.openerSig = sigOf(op); } } /* o popup puxa o foco sozinho ao abrir: quem abriu e o ultimo apertado com A */ const f = focusables(); const pick = f.find(el => el.getAttribute('aria-checked') === 'true' || el.getAttribute('aria-selected') === 'true') || preferred(f); if (pick && !dlg.contains(cur)) setPadFocus(pick); }
        else if (!dlg && this.active && (this.opener || this.openerSig)) { const back = this.opener && isShown(this.opener) ? this.opener : this.openerSig && refind(this.openerSig, focusables()); if (back) setPadFocus(back); this.opener = null; this.openerSig = null; } // o lobby redesenha o botao: acha pelo jeito dele
        this.dlg = dlg;
      } else if (dlg && this.active && cur && !dlg.contains(cur)) { const f = focusables(); if (f.length) setPadFocus(preferred(f)); } // selecao fugiu pra tela de tras: volta pro popup
      const cur2 = document.activeElement; // (o bloco de cima pode ter mexido no foco)
      if (this.active && (!cur2 || cur2 === document.body || !isShown(cur2))) {
        const f0 = focusables();
        if (f0.length) { const back = this.lastSig && refind(this.lastSig, f0); setPadFocus(back || preferred(f0)); }
      }
      if (dir && (fresh || this.navT <= 0)) {
        // controle deslizante focado: esquerda/direita mexe no valor
        if (cur?.type === 'range' && (dir === 'left' || dir === 'right')) { const st = Number(cur.step) || 1; cur.value = String(Number(cur.value) + (dir === 'right' ? st : -st)); cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); }
        else moveFocus(dir);
        this.navT = fresh ? 0.38 : 0.13;
      }
      if (!dir) this.navT = 0;
      if (down(B.A)) { const el = document.activeElement; if (el && el !== document.body) { this.pressed = el; pressFx(el); } else moveFocus('down'); }
      if (down(B.B)) goBack();
      if (down(B.LB) || down(B.RB)) switchTab(down(B.RB) ? 1 : -1);
      // analogico direito rola a lista que tiver o foco (ou a tela aberta)
      if (Math.abs(ry) > 0) { const sc = scroller(document.activeElement); if (sc) sc.scrollTop += ry * 900 * dt; }
      if (down(B.START)) document.getElementById('resume')?.offsetParent && document.getElementById('resume').click();
    }
    hints(this.active && !inGame);
    this.prev = now;
  }
}

const isShown = (el) => el.offsetParent !== null && !el.closest('[hidden], #hud, #touch') && getComputedStyle(el).visibility !== 'hidden';
// foco do controle: classe propria (o :focus-visible do navegador nem sempre aparece com foco por codigo)
// assinatura do botao focado: id, data-*, texto, tela onde esta e o lugar na tela
function sigOf(el) {
  const r = el.getBoundingClientRect();
  return { id: el.id, key: dataKey(el), txt: el.textContent.trim().slice(0, 40), scr: screenOf(el), x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
const dataKey = (el) => [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join('&');
const screenOf = (el) => el.closest('[id^="scr-"], .overlay, #lobby, [role="dialog"], .modal')?.id || '';
function refind(s, list) {
  if (s.id) { const e = document.getElementById(s.id); if (e && list.includes(e)) return e; }
  const same = list.filter(e => screenOf(e) === s.scr);
  if (!same.length) return null; // trocou de tela: comeca do botao principal
  if (s.key) { const e = same.find(x => dataKey(x) === s.key) ; if (e) return e; }
  const t = same.find(x => x.textContent.trim().slice(0, 40) === s.txt && s.txt); if (t) return t;
  // o que ficou mais perto de onde ele estava
  let best = null, bd = 160;
  for (const e of same) { const r = e.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - s.x, r.top + r.height / 2 - s.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function setPadFocus(el) {
  document.querySelectorAll('.pad-focus').forEach(e => e.classList.remove('pad-focus'));
  el.focus({ preventScroll: true }); el.classList.add('pad-focus');
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
// primeiro foco da tela: o botao principal (Jogar, Pronto...) se tiver, senao o primeiro
const preferred = (list) => list.find(el => el.matches('.bill-item.main, #lbReady, #rkFind, .big:not(.tool)')) || list[0];
// A: o botao afunda e solta, e clica
function pressFx(el) {
  el.classList.remove('pad-press'); void el.offsetWidth; el.classList.add('pad-press');
  setTimeout(() => el.classList.remove('pad-press'), 180);
  el.click();
}
// LB/RB: aba anterior/proxima da lista de abas visivel (Arsenal, Visual, Controles)
function switchTab(d) {
  const bar = [...(topDialog() || document).querySelectorAll('[role="tablist"]')].find(isShown); // popup aberto: as abas DELE
  if (!bar) return;
  const tabs = [...bar.querySelectorAll('[role="tab"]')].filter(isShown);
  const i = tabs.findIndex(b => b.getAttribute('aria-selected') === 'true');
  const nx = tabs[(i + d + tabs.length) % tabs.length];
  if (nx) { nx.click(); setTimeout(() => { const again = [...bar.querySelectorAll('[role="tab"]')].find(b => b.getAttribute('aria-selected') === 'true'); if (again) setPadFocus(again); }, 30); }
}
function scroller(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 4) return n; }
  return [...document.querySelectorAll('.card:not([hidden])')].find(c => c.scrollHeight > c.clientHeight + 4) || null;
}
// legenda dos botoes do controle (so nos menus)
let hintEl = null;
function hints(on) {
  if (!hintEl) {
    hintEl = document.createElement('div'); hintEl.className = 'pad-hints'; hintEl.setAttribute('aria-hidden', 'true');
    const pt = (document.documentElement.lang || 'pt').startsWith('pt');
    hintEl.innerHTML = `<span><b class="pb a">A</b>${pt ? 'Selecionar' : 'Select'}</span><span><b class="pb b">B</b>${pt ? 'Voltar' : 'Back'}</span><span><b class="pb sh">LB</b><b class="pb sh">RB</b>${pt ? 'Abas' : 'Tabs'}</span><span><b class="pb sh">R</b>${pt ? 'Rolar' : 'Scroll'}</span>`;
    document.body.appendChild(hintEl);
  }
  if (!on) { hintEl.hidden = true; return; }
  // escolhe um canto livre (nada de painel embaixo); sem canto livre, some (regra: nada sobreposto)
  const now = performance.now();
  if (now - (hintEl._t || 0) < 400) return;
  hintEl._t = now;
  hintEl.hidden = false;
  const w = hintEl.offsetWidth, h = hintEl.offsetHeight, W = innerWidth, H = innerHeight, m = 10;
  const spots = [[(W - w) / 2, H - h - m], [m, H - h - m], [W - w - m, H - h - m], [(W - w) / 2, m]];
  const free = (x, y) => { const el = document.elementFromPoint(x, y); return !el || el.tagName === 'CANVAS' || el === document.body || el === document.documentElement || el.matches('#menu, main.screen, #lobby, .lobby, #theend, .overlay'); };
  const ok = spots.find(([x, y]) => [[0.02, 0.1], [0.5, 0.1], [0.98, 0.1], [0.02, 0.9], [0.5, 0.9], [0.98, 0.9]].every(([a, b]) => free(x + w * a, y + h * b)));
  if (!ok) { hintEl.hidden = true; return; }
  Object.assign(hintEl.style, { left: ok[0] + 'px', top: ok[1] + 'px', bottom: 'auto', transform: 'none' });
}

// itens que da pra focar e estao na tela. Popup aberto (role=dialog): SO os de dentro dele (regra 03/11: com popup
// focado o controle so mexe nele; B fecha e a selecao volta pro botao que abriu)
function topDialog() {
  const list = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(d => !d.hidden && !d.closest('[hidden]') && d.getClientRects().length > 0 && getComputedStyle(d).visibility !== 'hidden'); // popup e fixed: offsetParent e sempre null
  return list.length ? list[list.length - 1] : null;
}
function focusables() {
  const dlg = topDialog();
  return [...(dlg || document).querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden], #hud, #touch'));
}

// foco espacial: o vizinho mais perto na direcao pedida
function moveFocus(dir) {
  const list = focusables();
  if (!list.length) return;
  const cur = document.activeElement;
  if (!cur || cur === document.body || !list.includes(cur)) { setPadFocus(preferred(list)); return; }
  const box = (el) => el.closest('.card, .end-card, .lb-side, .poster-frame, .tut, section') || document.body, home = box(cur);
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
    const dx = x - cx, dy = y - cy;
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    if (along <= 4) continue;
    const side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
    const sc = (along + side * 2.2) * (box(el) === home ? 1 : 1.6); // prefere ficar no mesmo cartao
    if (sc < bs) { bs = sc; best = el; }
  }
  if (best) setPadFocus(best);
}

// B: fecha o que estiver por cima ou volta uma tela (popup aberto: o botao de fechar DELE)
function goBack() {
  const dlg = topDialog();
  if (dlg) {
    const x = [...dlg.querySelectorAll('.lb-x, .back, [data-close], button[aria-label="Fechar"], button[aria-label="Close"]')].find(el => el.offsetParent !== null);
    if (x) { x.click(); return; }
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
    return;
  }
  const back = [...document.querySelectorAll('.back, #lbFriendsClose, #resume')].find(el => el.offsetParent !== null);
  if (back) { back.click(); return; }
  dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
}
