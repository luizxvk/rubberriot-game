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
      I.pad = { mx: lx, mz: -ly, fire: now[B.RT], ads: now[B.LT], sprint: this.sprintLatch, crouchHeld: now[B.B], board: now[B.SELECT], use: now[B.X] };
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
      if (down(B.START)) I.edges.add('Escape');
    } else {
      // menus: anda pelo foco com direcional ou analogico (repete segurando)
      this.navT -= dt;
      const dir = now[B.UP] || ly < -0.6 ? 'up' : now[B.DOWN] || ly > 0.6 ? 'down' : now[B.LEFT] || lx < -0.6 ? 'left' : now[B.RIGHT] || lx > 0.6 ? 'right' : null;
      const fresh = [B.UP, B.DOWN, B.LEFT, B.RIGHT].some(down);
      if (dir && (fresh || this.navT <= 0)) { moveFocus(dir); this.navT = fresh ? 0.38 : 0.13; }
      if (!dir) this.navT = 0;
      if (down(B.A)) { const el = document.activeElement; if (el && el !== document.body) el.click(); else moveFocus('down'); }
      if (down(B.B)) goBack();
      if (down(B.START)) document.getElementById('resume')?.offsetParent && document.getElementById('resume').click();
    }
    this.prev = now;
  }
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
  if (!cur || cur === document.body || !list.includes(cur)) { list[0].focus(); return; }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bs = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2;
    const dx = x - cx, dy = y - cy;
    const along = dir === 'up' ? -dy : dir === 'down' ? dy : dir === 'left' ? -dx : dx;
    if (along <= 4) continue;
    const side = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
    const sc = along + side * 2.2;
    if (sc < bs) { bs = sc; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}

// B: fecha o que estiver por cima ou volta uma tela
function goBack() {
  const back = [...document.querySelectorAll('.back, #lbFriendsClose, #resume')].find(el => el.offsetParent !== null);
  if (back) { back.click(); return; }
  dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
}
