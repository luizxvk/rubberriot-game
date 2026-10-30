import { t } from './i18n.js';
// Entrada unificada: teclado + mouse (pointer lock) e controles de toque no celular.
export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// Sliders em aparelho de toque: o range nativo pula pro dedo assim que encosta na trilha, entao rolar a tela
// de Ajustes por cima dele mudava o valor. No toque o input nao recebe o dedo (CSS) e so a
// bolinha arrasta, na horizontal; deslizar na vertical em cima dele rola a tela normalmente.
function touchRanges() {
  document.body.classList.add('touchrange');
  const THUMB = 13, HIT = 30;
  let drag = null;
  const valueAt = (inp, x) => {
    const r = inp.getBoundingClientRect(), min = +inp.min || 0, max = +(inp.max || 100), step = +inp.step || 1;
    const f = Math.min(1, Math.max(0, (x - r.left - THUMB) / (r.width - THUMB * 2)));
    return Math.round((min + f * (max - min)) / step) * step;
  };
  addEventListener('pointerdown', (e) => {
    const finger = e.pointerType === 'touch', pad = finger ? HIT : 8;
    for (const inp of document.querySelectorAll('input[type=range]')) {
      const r = inp.getBoundingClientRect();
      if (!r.width || inp.disabled || e.clientY < r.top - pad || e.clientY > r.bottom + pad || e.clientX < r.left - pad || e.clientX > r.right + pad) continue;
      const min = +inp.min || 0, max = +(inp.max || 100);
      const tx = r.left + THUMB + ((+inp.value - min) / (max - min || 1)) * (r.width - THUMB * 2);
      // dedo: so pela bolinha (senao rolar a tela mexia no valor). mouse/caneta: clica em qualquer ponto da trilha
      if (finger && Math.abs(e.clientX - tx) > HIT) continue;
      drag = { inp, id: e.pointerId };
      inp.classList.add('grab'); inp.focus({ preventScroll: true });
      if (!finger) { e.preventDefault(); setValue(inp, e.clientX); }
      return;
    }
  }, true);
  const setValue = (inp, x) => {
    const v = valueAt(inp, x);
    if (String(v) !== inp.value) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); }
  };
  addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) setValue(drag.inp, e.clientX);
  }, true);
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.inp.classList.remove('grab');
    drag.inp.dispatchEvent(new Event('change', { bubbles: true }));
    drag = null;
  };
  addEventListener('pointerup', end, true);
  addEventListener('pointercancel', end, true);
}
if (isTouch) touchRanges();

// trava o mouse pedindo o movimento cru (sem aceleracao do sistema; no Chrome tambem some o salto falso)
export function lockPointer(el) {
  try { const r = el.requestPointerLock?.({ unadjustedMovement: true }); if (r?.catch) r.catch(() => el.requestPointerLock?.()); }
  catch { el.requestPointerLock?.(); }
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookX = 0; this.lookY = 0;
    this.mouse = { fire: false, ads: false };
    this.edges = new Set();
    this.wheelAcc = 0;
    this.slotReq = -1;
    this.lastShift = 0;
    this.enabled = false;
    this.touch = { mx: 0, mz: 0, fire: false, ads: false, sprint: false, crouchHeld: false };
    this.settings = null;

    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.code === 'Tab') e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.edges.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        const now = performance.now();
        this.lastShift = now;
      }
      const m = e.code.match(/^Digit([1-8])$/);
      if (m) this.slotReq = Number(m[1]) - 1;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.fire = this.mouse.ads = false; });
    // mouse travado: o Chrome no Windows as vezes manda um salto falso enorme (mais no 1o evento depois de
    // travar) e a mira "puxava pro chao do nada". Pula o 1o evento e qualquer salto impossivel num evento so.
    let skipNext = false;
    document.addEventListener('pointerlockchange', () => { skipNext = true; });
    addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== canvas) return;
      if (skipNext) { skipNext = false; return; }
      if (Math.abs(e.movementX) > 600 || Math.abs(e.movementY) > 300) return;
      this.lookX += e.movementX; this.lookY += e.movementY;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement !== canvas) { if (!isTouch) lockPointer(canvas); return; }
      if (e.button === 0) { this.mouse.fire = true; this.edges.add('FIRE'); }
      if (e.button === 2) { this.mouse.ads = true; this.edges.add('ADS'); }
      if (e.button === 1) { e.preventDefault(); this.edges.add('PING'); }
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.fire = false; if (e.button === 2) this.mouse.ads = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.enabled) this.wheelAcc += Math.sign(e.deltaY); }, { passive: true });
  }

  // fotografia do frame (e zera as bordas)
  read() {
    const k = this.keys, t = this.touch, pd = this.pad || {};
    const has = (c) => k.has(c);
    const edge = (c) => this.edges.has(c);
    let mx = (has('KeyD') ? 1 : 0) - (has('KeyA') ? 1 : 0) + t.mx + (pd.mx || 0);
    let mz = (has('KeyW') ? 1 : 0) - (has('KeyS') ? 1 : 0) + t.mz + (pd.mz || 0);
    mx = Math.max(-1, Math.min(1, mx)); mz = Math.max(-1, Math.min(1, mz));
    const s = {
      moveX: mx, moveZ: mz,
      lookX: this.lookX, lookY: this.lookY,
      fire: this.mouse.fire || t.fire || !!pd.fire, firePressed: edge('FIRE'),
      ads: this.mouse.ads || t.ads || !!pd.ads, adsPressed: edge('ADS'),
      sprint: has('ShiftLeft') || has('ShiftRight') || t.sprint || !!pd.sprint || this.settings?.autoSprint,
      tacPressed: edge('TAC'),
      jumpPressed: edge('Space') || edge('JUMP'),
      crouchPressed: edge('KeyC') || edge('ControlLeft') || edge('CROUCH'),
      crouchHeld: has('KeyC') || has('ControlLeft') || t.crouchHeld || !!pd.crouchHeld,
      reloadPressed: edge('KeyR') || edge('RELOAD'),
      fragPressed: edge('KeyG') || edge('FRAG'),
      flashPressed: edge('KeyF') || edge('FLASH'),
      streakPressed: edge('KeyX') || edge('STREAK'),
      inspectPressed: edge('KeyI') || edge('INSPECT'),
      pingPressed: edge('KeyB') || edge('PING'), // marcar (battle royale): B, botao do meio, direcional esquerdo, botao de toque
      use: has('KeyE') || t.use || !!pd.use,
      mapPressed: edge('KeyM') || edge('MAP'),
      meleePressed: edge('KeyV') || edge('MELEE'),
      fieldPressed: edge('KeyZ') || edge('FIELD'), // equipamento de campo
      lastPressed: edge('KeyQ'),
      slot: this.slotReq,
      wheel: this.wheelAcc + (edge('NEXT') ? 1 : 0),
      board: has('Tab') || !!pd.board,
      pause: edge('Escape') || edge('KeyP'),
    };
    this.lookX = this.lookY = 0; this.wheelAcc = 0; this.slotReq = -1;
    this.edges.clear();
    return s;
  }
}

// Material Icons (Google, Apache 2.0): caminhos SVG oficiais
const ICON = {
  field: 'm13.127 14.56 1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73 2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02-.01.01c-.38 3.01 1.17 6.88 4.3 10.02l5.73-5.73c-3.13-3.13-7.01-4.68-10.02-4.3z',
  fire: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  ads: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z',
  jump: 'M6 17.59 7.41 19 12 14.42 16.59 19 18 17.59l-6-6zM6 11l1.41 1.41L12 7.83l4.59 4.58L18 11l-6-6z',
  crouch: 'M18 6.41 16.59 5 12 9.58 7.41 5 6 6.41l6 6zM18 13l-1.41-1.41L12 16.17l-4.59-4.58L6 13l6 6z',
  reload: 'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  swap: 'M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  tac: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  frag: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
  flash: 'M7 11H1v2h6v-2zm2.17-3.24L7.05 5.64 5.64 7.05l2.12 2.12 1.41-1.41zM13 1h-2v6h2V1zm5.36 6.05l-1.41-1.41-2.12 2.12 1.41 1.41 2.12-2.12zM17 11v2h6v-2h-6zm-5-2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm2.83 7.24l2.12 2.12 1.41-1.41-2.12-2.12-1.41 1.41zm-9.19.71l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM11 23h2v-6h-2v6z',
  // gavel (Material Icons): golpe de lamina
  melee: 'M1 21h12v2H1zM5.245 8.07l2.83-2.827 14.14 14.142-2.828 2.828zM12.317 1l5.657 5.656-2.83 2.83-5.654-5.66zM3.825 9.485l5.657 5.657-2.828 2.828-5.657-5.657z',
  // place (Material Icons): marcar
  ping: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  inspect: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  streak: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  // pan_tool (Material Icons): segurar pra plantar / desarmar
  use: 'M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z',
};
const svg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

// ---------- controles de toque ----------
export function buildTouch(input, root) {
  root.innerHTML = '';
  document.body.classList.add('touchmode');
  root.hidden = false;
  const stick = el('div', 'stick'); const knob = el('i'); stick.appendChild(knob); root.appendChild(stick);
  stick.dataset.hid = 'stick';
  const btn = (label, cls, style, down, up) => {
    const b = el('button', 'tbtn ' + cls); b.innerHTML = svg(ICON[cls.split(' ')[0] || 'fire']); b.setAttribute('aria-label', label); Object.assign(b.style, style);
    b.dataset.hid = cls.split(' ')[0];
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('on'); down(e, b); });
    const end = (e) => { b.classList.remove('on'); up && up(e, b); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    root.appendChild(b);
    return b;
  };
  const R = 'max(20px, env(safe-area-inset-right))';
  // botoes em arco em volta do polegar direito: canto = pular/agachar/botao grande, volta = recarregar/mirar/trocar,
  // aro de fora (menores) = granadas, faca, sequencia, inspecionar. at(direita, baixo, tamanho) em px a partir do canto.
  const at = (r, b, size) => ({ right: 'calc(' + R + ' + ' + r + 'px)', bottom: 'calc(max(0px, env(safe-area-inset-bottom)) + ' + b + 'px)', width: size + 'px', height: size + 'px' });
  // atirar tambem mira arrastando (olhar enquanto segura)
  let fireId = null, fx = 0, fy = 0;
  const fire = input.fireBtn = btn(t('t_fire'), 'fire', at(0, 90, 84), (e) => { input.touch.fire = true; input.edges.add('FIRE'); fireId = e.pointerId; fx = e.clientX; fy = e.clientY; }, () => { input.touch.fire = false; fireId = null; });
  fire.addEventListener('pointermove', (e) => { if (e.pointerId !== fireId) return; input.lookX += (e.clientX - fx) * 1.4; input.lookY += (e.clientY - fy) * 1.4; fx = e.clientX; fy = e.clientY; });
  input.adsBtn = btn(t('t_ads'), 'ads', at(88, 168, 58), (e, b) => { input.touch.ads = !input.touch.ads; input.edges.add('ADS'); b.classList.toggle('on', input.touch.ads); setTimeout(() => b.classList.toggle('on', input.touch.ads)); });
  btn(t('t_jump'), 'jump', at(0, 12, 66), () => input.edges.add('JUMP'));
  btn(t('t_crouch'), 'crouch', at(76, 12, 62), () => { input.edges.add('CROUCH'); });
  btn(t('t_reload'), 'reload', at(94, 96, 58), () => input.edges.add('RELOAD'));
  btn(t('t_swap'), 'swap', at(12, 184, 58), () => input.edges.add('NEXT'));
  btn(t('t_frag'), 'frag', at(148, 12, 50), () => input.edges.add('FRAG'));
  btn(t('t_flash'), 'flash', at(206, 12, 50), () => input.edges.add('FLASH'));
  btn(t('t_streak'), 'streak', at(156, 176, 48), () => input.edges.add('STREAK'));
  btn(t('t_melee'), 'melee', at(162, 84, 50), () => input.edges.add('MELEE'));
  // equipamento de campo: o icone troca pelo equipado e o aro mostra a recarga
  input.fieldBtn = btn(t('t_field'), 'field', at(214, 150, 48), () => input.edges.add('FIELD'));
  // usar (plantar / desarmar a bomba): segurar; so aparece no modo bomba
  input.useBtn = btn(t('t_use'), 'use', at(4, 92, 80), () => { input.touch.use = true; }, () => { input.touch.use = false; });
  btn(t('t_inspect'), 'inspect', at(220, 84, 44), () => input.edges.add('INSPECT'));
  // marcar (so no battle royale): acima do equipamento de campo
  input.pingBtn = btn(t('t_ping'), 'ping', at(214, 206, 44), () => input.edges.add('PING'));

  // analogico: empurrar ate a borda = corre
  let sid = null, cx = 0, cy = 0;
  stick.addEventListener('pointerdown', (e) => { e.preventDefault(); sid = e.pointerId; stick.setPointerCapture(sid); const r = stick.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; move(e); });
  const move = (e) => {
    if (e.pointerId !== sid) return;
    let dx = (e.clientX - cx) / 60, dy = (e.clientY - cy) / 60;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    knob.style.transform = `translate(${dx * 50}px, ${dy * 50}px)`;
    input.touch.mx = Math.abs(dx) < 0.15 ? 0 : dx;
    input.touch.mz = Math.abs(dy) < 0.15 ? 0 : -dy;
    const sprint = l > 1.15 && -dy > 0.6;
    if (!sprint && input.touch.sprint && -dy < 0.3) input.touch.sprint = false;
    if (sprint) input.touch.sprint = true;
    stick.classList.toggle('sprint', input.touch.sprint);
  };
  stick.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; knob.style.transform = ''; input.touch.mx = input.touch.mz = 0; input.touch.sprint = false; stick.classList.remove('sprint'); };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);

  // resto da tela direita = olhar
  let lid = null, lx = 0, ly = 0;
  root.addEventListener('pointerdown', (e) => {
    if (e.target !== root || e.clientX < innerWidth * 0.4 || lid !== null) return;
    lid = e.pointerId; lx = e.clientX; ly = e.clientY;
  });
  root.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; input.lookX += (e.clientX - lx) * 1.4; input.lookY += (e.clientY - ly) * 1.4; lx = e.clientX; ly = e.clientY; });
  const lend = (e) => { if (e.pointerId === lid) lid = null; };
  root.addEventListener('pointerup', lend); root.addEventListener('pointercancel', lend);
  // pausa
  const p = btn(t('t_pause'), 'pause', { left: 'max(12px, env(safe-area-inset-left))', top: 'max(12px, env(safe-area-inset-top))', width: '48px', height: '40px', borderRadius: '12px' }, () => input.edges.add('Escape'));
  void p;
  applyHudLayout(root, input.settings);
  setFireButton(input);
}

// tiro automatico ligado: o botao de atirar some (o jogo atira sozinho com o inimigo na mira)
export function setFireButton(input) {
  if (input.fireBtn) input.fireBtn.hidden = !!input.settings?.autoFire;
  if (input.useBtn) {
    input.useBtn.hidden = input.mode !== 'bomb' && input.mode !== 'br'; // br: trocar arma no chao
    if (input.pingBtn) input.pingBtn.hidden = input.mode !== 'br';
    // a mao (plantar/desarmar) vai pro lugar do botao de atirar quando ele some: e onde o polegar ja esta.
    // Com tiro manual, fica acima do recarregar, fora do meio da tela. Posicao salva no editor de HUD manda.
    if (!input.settings?.hudLayout?.pos?.use) {
      const R = 'max(20px, env(safe-area-inset-right))';
      Object.assign(input.useBtn.style, input.settings?.autoFire
        ? { right: 'calc(' + R + ' + 4px)', bottom: '92px', width: '80px', height: '80px' }
        : { right: 'calc(' + R + ' + 214px)', bottom: '136px', width: '58px', height: '58px' });
    }
  }
}

// layout do HUD de toque salvo nos ajustes: { pos: { id: [x%, y%] }, scale, alpha }
export function applyHudLayout(root, S) {
  const L = S?.hudLayout || {};
  root.style.setProperty('--tb-scale', L.scale || 1);
  root.style.setProperty('--tb-alpha', L.alpha ?? 1);
  for (const elx of root.querySelectorAll('[data-hid]')) {
    const pos = L.pos?.[elx.dataset.hid];
    if (!pos) continue;
    Object.assign(elx.style, { left: pos[0] + '%', top: pos[1] + '%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' });
  }
}
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
