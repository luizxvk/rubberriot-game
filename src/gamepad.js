// Controle (Gamepad API, layout "standard" do Xbox/PlayStation). Mapa igual ao do COD:
// LT mira, RT atira, A pula, B agacha, X recarrega, Y troca, LB granada, RB flash,
// L3 corre, R3 faca, cima no direcional = sequencia, baixo = inspecionar, Start pausa, Select placar.
// Fora da partida (menus, lobby, pausa) o direcional/analogico anda pelo foco, A confirma e B volta.
const B = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.16;
// pixels de mouse equivalentes por segundo com o analogico no talo (a sensibilidade do jogo multiplica)
const LOOK = 1350;

const dz = (v) => { const a = Math.abs(v); return a < DEAD ? 0 : Math.sign(v) * ((a - DEAD) / (1 - DEAD)); };

export class Pad {
  constructor(input) {
    this.input = input;
    this.prev = [];
    this.active = false;     // usou o controle por ultimo (vale ate mexer no mouse/teclado)
    this.sprintLatch = false;
    this.navT = 0;
    addEventListener('mousemove', () => this.setActive(false));
    addEventListener('keydown', () => this.setActive(false));
    // celular: usou o controle, os botoes de toque somem; tocou na tela de novo, voltam
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.setActive(false); }, true);
    addEventListener('gamepaddisconnected', () => { if (!this.first()) this.setActive(false); });
  }

  setActive(v) {
    if (this.active === v) return;
    this.active = v;
    document.body.classList.toggle('pad', v);
  }

  first() {
    for (const g of navigator.getGamepads?.() || []) if (g && g.connected) return g;
    return null;
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
      // olhar: curva quadratica (precisao no comeco do curso, giro rapido no fim)
      const curve = (v) => Math.sign(v) * v * v;
      I.lookX += curve(rx) * LOOK * dt;
      I.lookY += curve(ry) * LOOK * 0.72 * dt;
      // L3 trava a corrida ate parar de andar pra frente (igual COD)
      if (down(B.L3)) this.sprintLatch = !this.sprintLatch;
      if (-ly < 0.3) this.sprintLatch = false;
      I.pad = { mx: lx, mz: -ly, fire: now[B.RT], ads: now[B.LT], sprint: this.sprintLatch, crouchHeld: now[B.B], board: now[B.SELECT], use: now[B.X], frag: now[B.LB], flash: now[B.RB] };
      if (down(B.RT)) I.edges.add('FIRE');
      if (down(B.LT)) I.edges.add('ADS');
      if (down(B.A)) I.edges.add('JUMP');
      if (down(B.B)) I.edges.add('CROUCH');
      if (down(B.X)) I.edges.add('RELOAD');
      if (down(B.Y)) I.edges.add('NEXT');
      if (down(B.LB)) I.edges.add('FRAG');
      if (down(B.RB)) I.edges.add('FLASH');
      if (down(B.R3)) I.edges.add('MELEE');
      if (down(B.UP)) I.edges.add('STREAK');
      if (down(B.DOWN)) I.edges.add('INSPECT');
      if (down(B.RIGHT)) I.edges.add('FIELD');
      if (down(B.LEFT)) I.edges.add('PING'); // marcar (battle royale)
      if (down(B.START)) I.edges.add('Escape');
    } else {
      // menus: anda pelo foco com direcional ou analogico (repete segurando)
      this.navT -= dt;
      const dir = now[B.UP] || ly < -0.6 ? 'up' : now[B.DOWN] || ly > 0.6 ? 'down' : now[B.LEFT] || lx < -0.6 ? 'left' : now[B.RIGHT] || lx > 0.6 ? 'right' : null;
      const fresh = [B.UP, B.DOWN, B.LEFT, B.RIGHT].some(down);
      const cur = document.activeElement;
      // foco sumiu (trocou de tela, fechou popup): volta pro primeiro botao da tela
      if (this.active && (!cur || cur === document.body || !isShown(cur))) { const f0 = focusables(); if (f0.length) setPadFocus(preferred(f0)); }
      if (dir && (fresh || this.navT <= 0)) {
        // controle deslizante focado: esquerda/direita mexe no valor
        if (cur?.type === 'range' && (dir === 'left' || dir === 'right')) { const st = Number(cur.step) || 1; cur.value = String(Number(cur.value) + (dir === 'right' ? st : -st)); cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); }
        else moveFocus(dir);
        this.navT = fresh ? 0.38 : 0.13;
      }
      if (!dir) this.navT = 0;
      if (down(B.A)) { const el = document.activeElement; if (el && el !== document.body) pressFx(el); else moveFocus('down'); }
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
  const bar = [...document.querySelectorAll('[role="tablist"]')].find(isShown);
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

// itens que da pra focar e estao na tela
function focusables() {
  return [...document.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')]
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

// B: fecha o que estiver por cima ou volta uma tela
function goBack() {
  const back = [...document.querySelectorAll('.back, #lbFriendsClose, #resume')].find(el => el.offsetParent !== null);
  if (back) { back.click(); return; }
  dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
}
