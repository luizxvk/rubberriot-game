import { kbBinds } from './binds.js';
import { t } from './i18n.js';
// Entrada unificada: teclado + mouse (pointer lock) e controles de toque no celular.
// Teclas e botoes do mouse vem dos comandos remapeaveis (binds.js); botao do mouse vira o codigo 'MouseN'.
export const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
// 03/11: o visual de celular (menu em tela cheia etc.) vale desde a abertura; antes so ligava ao entrar na 1a partida
if (isTouch) document.body?.classList.add('touchmode');

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

// trava o mouse pedindo o movimento cru (sem aceleracao do sistema; no Chrome tambem some o salto falso).
// Ajuste "Entrada crua" desligado = usa o mouse do jeito que o Windows entrega (com a aceleracao dele).
let rawMouse = true;
export function setRawMouse(v) { rawMouse = v !== false; }
export function lockPointer(el) {
  if (!rawMouse) { el.requestPointerLock?.(); return; }
  try { const r = el.requestPointerLock?.({ unadjustedMovement: true }); if (r?.catch) r.catch(() => el.requestPointerLock?.()); }
  catch { el.requestPointerLock?.(); }
}

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.lookX = 0; this.lookY = 0; this.padLookX = 0; this.padLookY = 0; this.touchLookX = 0; this.touchLookY = 0; // total + a parte de cada aparelho
    this.mx = 0; this.my = 0; this.mHist = []; // mouse separado do toque/controle: suavizacao e aceleracao so nele
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
    // trocou de arma (10/11, bug dele): o alternar ao mirar solta a mira. Senao a akimbo atirava sozinha com a direita e
    // a corrida ficava travada pela mira presa
    this.resetAds = () => { this.adsLatch = false; if (this.touch) this.touch.ads = false; this.mouse.ads = false; this.adsBtn?.classList.remove('on'); };
    addEventListener('blur', () => { this.keys.clear(); this.mouse.fire = this.mouse.ads = false; this.adsLatch = false; });
    // mouse travado: o Chrome no Windows as vezes manda um salto falso enorme (mais no 1o evento depois de
    // travar) e a mira "puxava pro chao do nada". Pula o 1o evento e qualquer salto impossivel num evento so.
    let skipNext = false;
    document.addEventListener('pointerlockchange', () => { skipNext = true; });
    addEventListener('mousemove', (e) => {
      if (!this.enabled || document.pointerLockElement !== canvas) return;
      if (skipNext) { skipNext = false; return; }
      if (Math.abs(e.movementX) > 600 || Math.abs(e.movementY) > 300) return;
      // aceleracao do mouse (ajuste, padrao 0): puxada rapida gira mais que a mesma distancia devagar
      const acc = this.settings?.mouseAccel || 0;
      const f = acc > 0 ? 1 + acc * Math.min(2, Math.hypot(e.movementX, e.movementY) / 25) : 1;
      this.mx += e.movementX * f; this.my += e.movementY * f;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement !== canvas) { if (!isTouch) lockPointer(canvas); return; }
      if (e.button === 1) e.preventDefault();
      this.keys.add('Mouse' + e.button); this.edges.add('Mouse' + e.button);
    });
    addEventListener('mouseup', (e) => this.keys.delete('Mouse' + e.button));
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.enabled) this.wheelAcc += Math.sign(e.deltaY); }, { passive: true });
  }

  // fotografia do frame (e zera as bordas)
  read() {
    const k = this.keys, t = this.touch, pd = this.pad || {};
    const has = (c) => k.has(c);
    const KB = this.kbMap || (this.kbMap = kbBinds(this.settings)); // refeito quando os comandos mudam (bindsChanged)
    const A = (id) => KB[id].some(has), E = (id) => KB[id].some(c => this.edges.has(c));
    const edge = (c) => this.edges.has(c);
    let mx = (A('right') ? 1 : 0) - (A('left') ? 1 : 0) + t.mx + (pd.mx || 0);
    let mz = (A('fwd') ? 1 : 0) - (A('back') ? 1 : 0) + t.mz + (pd.mz || 0);
    mx = Math.max(-1, Math.min(1, mx)); mz = Math.max(-1, Math.min(1, mz));
    // suavizacao do mouse (ajuste, padrao desligada = cru): media dos ultimos quadros, igual a opcao do COD
    const sm = { low: 2, high: 4 }[this.settings?.mouseSmooth] || 1;
    this.mHist.push([this.mx, this.my]); while (this.mHist.length > sm) this.mHist.shift();
    let smx = this.mx, smy = this.my;
    if (sm > 1) { smx = 0; smy = 0; for (const [a, b] of this.mHist) { smx += a / this.mHist.length; smy += b / this.mHist.length; } }
    this.mx = this.my = 0;
    // mirar (09/11, pedido dele): segurar ou alternar. O botao de toque cuida do proprio estado; aqui so teclado, mouse e controle
    if (E('ads') || (edge('ADS') && pd.ads)) this.adsLatch = !this.adsLatch;
    const ads = t.ads || (this.settings?.adsMode === 'toggle' ? !!this.adsLatch : A('ads') || !!pd.ads);
    const s = {
      moveX: mx, moveZ: mz,
      lookX: this.lookX + smx, lookY: this.lookY + smy, padLookX: this.padLookX, padLookY: this.padLookY, touchLookX: this.touchLookX, touchLookY: this.touchLookY,
      fire: A('fire') || t.fire || t.fireL || !!pd.fire, firePressed: E('fire') || edge('FIRE'),
      ads: ads, adsPressed: E('ads') || edge('ADS'),
      adsHeld: A('ads') || !!pd.ads || (this.settings?.adsMode !== 'toggle' && !!t.ads), // botao de mirar FISICAMENTE segurado (akimbo: gatilho da direita; nunca o alternar)
      sprint: A('sprint') || t.sprint || !!pd.sprint || this.settings?.autoSprint,
      tacPressed: edge('TAC'),
      jumpPressed: E('jump') || edge('JUMP'),
      crouchPressed: E('crouch') || edge('CROUCH'),
      crouchHeld: A('crouch') || t.crouchHeld || !!pd.crouchHeld,
      reloadPressed: E('reload') || edge('RELOAD'),
      cantedPressed: E('canted') || edge('CANTED'),
      fragPressed: E('frag') || edge('FRAG'),
      flashPressed: E('flash') || edge('FLASH'),
      // segurando a granada = cozinhando o pavio (solta = arremessa)
      fragHeld: A('frag') || !!t.frag || !!pd.frag,
      flashHeld: A('flash') || !!t.flash || !!pd.flash,
      streakPressed: E('streak') || edge('STREAK'),
      gadget: A('gadget') || !!t.gadget || !!pd.gadget, gadgetPressed: E('gadget') || edge('GADGET'),
      inspectPressed: E('inspect') || edge('INSPECT'),
      quickPressed: E('quick') || edge('QUICK'), // Chat Rapido (10/11)
      pingPressed: E('ping') || edge('PING'), // marcar (battle royale): B, botao do meio, direcional esquerdo, botao de toque
      use: A('use') || t.use || !!pd.use,
      mapPressed: E('map') || edge('MAP'),
      meleePressed: E('melee') || edge('MELEE'),
      fieldPressed: E('field') || edge('FIELD'), // equipamento de campo
      lastPressed: E('last'),
      // inclinar (plantar a bomba): segurando; no toque, os dois botoes de inclinar
      breath: A('breath') || performance.now() < (t.breathUntil || 0), // celular: um toque liga por um tempo; PC: segurar
      leanL: A('leanL') || !!t.leanL, leanR: A('leanR') || !!t.leanR,
      leanLPressed: E('leanL') || edge('LEANL'), leanRPressed: E('leanR') || edge('LEANR'),
      slot: this.slotReq,
      wheel: this.wheelAcc + (edge('NEXT') || E('cycle') ? 1 : 0),
      board: has('Tab') || !!pd.board || !!this.touchBoard, // celular: tocou no placar de cima (main.js)
      pause: edge('Escape') || edge('KeyP'),
    };
    this.lookX = this.lookY = this.padLookX = this.padLookY = this.touchLookX = this.touchLookY = 0; this.wheelAcc = 0; this.slotReq = -1;
    this.edges.clear();
    return s;
  }
}

// Material Icons (Google, Apache 2.0): caminhos SVG oficiais
// granada letal (abacaxi com alavanca) e tatica (lata de clarao com faiscas): desenho proprio, com os recortes em evenodd
const NADE_ICON = {
  frag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M9.5 2h5v3.2h-5zM15 2.6h3.2c1.3 0 2.3.7 2.8 1.9l.7 1.8-1.9.7-.7-1.8c-.2-.5-.5-.7-.9-.7H15zM12 6.4a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6zM4.7 12.3v1.5h14.6v-1.5zM4.9 16.1v1.5h14.2v-1.5zM9 7.2v14.2h1.5V7.2zM13.5 7.2v14.2H15V7.2z"/></svg>',
  flash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M10.5 1h3v4.2h-3zM3.6 3.3l2.1-2.1 3 3-2.1 2.1zM15.3 4.2l3-3 2.1 2.1-3 3zM9 7h6c1.1 0 2 .9 2 2v11c0 1.7-1.3 3-3 3h-4c-1.7 0-3-1.3-3-3V9c0-1.1.9-2 2-2zM9 11v2h6v-2zM9 16v2h6v-2z"/></svg>',
};
const ICON = {
  breath: 'M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 3 1.35 3 3zM19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5zm-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5v2c1.93 0 3.5-1.57 3.5-3.5S20.43 11 18.5 11z',
  gadget: 'M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z', // peca encaixada (Material Icons 'extension', Apache 2.0): a granada ja usa fogo
  more: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  quick: 'M22 4c0-1.1-.9-2-2-2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h9v-8h7V4zm.5 12h-2.2l1.7-4h-5v6h2v5z', // Material Icons 'quickreply' (Apache 2.0): Chat Rapido (10/11) // + (Material Icons): abre os botoes extras
  field: 'm13.127 14.56 1.43-1.43 6.44 6.443L19.57 21zm4.293-5.73 2.86-2.86c-3.95-3.95-10.35-3.96-14.3-.02 3.93-1.3 8.31-.25 11.44 2.88zM5.95 5.98c-3.94 3.95-3.93 10.35.02 14.3l2.86-2.86C5.7 14.29 4.65 9.91 5.95 5.98zm.02-.02-.01.01c-.38 3.01 1.17 6.88 4.3 10.02l5.73-5.73c-3.13-3.13-7.01-4.68-10.02-4.3z',
  fire: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  ads: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z',
  canted: 'M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z',
  jump: 'M6 17.59 7.41 19 12 14.42 16.59 19 18 17.59l-6-6zM6 11l1.41 1.41L12 7.83l4.59 4.58L18 11l-6-6z',
  crouch: 'M18 6.41 16.59 5 12 9.58 7.41 5 6 6.41l6 6zM18 13l-1.41-1.41L12 16.17l-4.59-4.58L6 13l6 6z',
  reload: 'M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
  swap: 'M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
  tac: 'M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9 1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z',
  pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
  // north_west / north_east (Material Icons): inclinar pra esquerda / direita
  leanL: 'M5 15h2V8.41L18.59 20 20 18.59 8.41 7H15V5H5z',
  leanR: 'M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z',
  // chat_bubble (Material Icons): chat da partida online
  chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  frag: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
  flash: 'M7 11H1v2h6v-2zm2.17-3.24L7.05 5.64 5.64 7.05l2.12 2.12 1.41-1.41zM13 1h-2v6h2V1zm5.36 6.05l-1.41-1.41-2.12 2.12 1.41 1.41 2.12-2.12zM17 11v2h6v-2h-6zm-5-2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm2.83 7.24l2.12 2.12 1.41-1.41-2.12-2.12-1.41 1.41zm-9.19.71l1.41 1.41 2.12-2.12-1.41-1.41-2.12 2.12zM11 23h2v-6h-2v6z',
  // gavel (Material Icons): golpe de lamina
  melee: 'M1 21h12v2H1zM5.245 8.07l2.83-2.827 14.14 14.142-2.828 2.828zM12.317 1l5.657 5.656-2.83 2.83-5.654-5.66zM3.825 9.485l5.657 5.657-2.828 2.828-5.657-5.657z',
  // place (Material Icons): marcar
  ping: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  inspect: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  // gps_fixed (Material Icons): atirar mirando
  adsfire: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
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
    const b = el('button', 'tbtn ' + cls); b.innerHTML = NADE_ICON[cls.split(' ')[0]] || svg(ICON[cls.split(' ')[0] || 'fire']); b.setAttribute('aria-label', label); Object.assign(b.style, style);
    b.dataset.hid = cls.split(' ')[0];
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId); b.classList.add('on'); down(e, b); });
    const end = (e) => { b.classList.remove('on'); up && up(e, b); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
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
  fire.addEventListener('pointermove', (e) => { if (e.pointerId !== fireId) return; { const dx = (e.clientX - fx) * 1.4, dy = (e.clientY - fy) * 1.4; input.lookX += dx; input.lookY += dy; input.touchLookX += dx; input.touchLookY += dy; } fx = e.clientX; fy = e.clientY; });
  input.adsBtn = btn(t('t_ads'), 'ads', at(88, 168, 58), (e, b) => { input.touch.ads = input.settings?.adsMode === 'hold' ? true : !input.touch.ads; input.edges.add('ADS'); b.classList.toggle('on', input.touch.ads); setTimeout(() => b.classList.toggle('on', input.touch.ads)); }, () => { if (input.settings?.adsMode !== 'hold') return; input.touch.ads = false; input.adsBtn?.classList.remove('on'); });
  btn(t('t_jump'), 'jump', at(0, 12, 66), () => input.edges.add('JUMP'));
  btn(t('t_crouch'), 'crouch', at(76, 12, 62), () => { input.edges.add('CROUCH'); });
  btn(t('t_reload'), 'reload', at(94, 96, 58), () => input.edges.add('RELOAD'));
  btn(t('t_swap'), 'swap', at(12, 184, 58), () => input.edges.add('NEXT'));
  btn(t('t_frag'), 'frag', at(148, 12, 50), () => { input.edges.add('FRAG'); input.touch.frag = true; }, () => { input.touch.frag = false; });
  btn(t('t_flash'), 'flash', at(206, 12, 50), () => { input.edges.add('FLASH'); input.touch.flash = true; }, () => { input.touch.flash = false; });
  btn(t('t_streak'), 'streak', at(156, 176, 48), () => input.edges.add('STREAK'));
  // gadget de baixo do cano (03/11): so aparece com o gadget equipado (body.has-gadget); toque liga/desliga, o tiro usa o gadget
  input.gadgetBtn = btn(t('t_gadget'), 'gadget', at(270, 72, 50), () => { input.touch.gadget = true; input.edges.add('GADGET'); }, () => { input.touch.gadget = false; });
  // atirar mirando (02/11, pedido dele): segurou = mira e atira junto; soltou = sai da mira (vaga da estrela antiga)
  let adsWas = false;
  input.adsFireBtn = btn(t('t_adsfire'), 'adsfire fire2', at(156, 176, 56), () => { adsWas = input.touch.ads; input.touch.ads = true; input.touch.fire = true; input.edges.add('FIRE'); }, () => { input.touch.fire = false; input.touch.ads = adsWas; });
  // atirar do lado esquerdo (02/11): ao lado do analogico, pro polegar esquerdo (o direito fica livre pra mirar)
  const L = 'max(24px, env(safe-area-inset-left))';
  input.fireLBtn = btn(t('t_fireL'), 'fire fireL', { left: 'calc(' + L + ' + 170px)', bottom: 'calc(max(0px, env(safe-area-inset-bottom)) + 120px)', width: '66px', height: '66px' }, () => { input.touch.fireL = true; input.edges.add('FIRE'); }, () => { input.touch.fireL = false; });
  input.fireLBtn.dataset.hid = 'fireL'; input.adsFireBtn.dataset.hid = 'adsfire';
  btn(t('t_melee'), 'melee', at(162, 84, 50), () => input.edges.add('MELEE'));
  // equipamento de campo: o icone troca pelo equipado e o aro mostra a recarga
  input.cantedBtn = btn(t('t_canted'), 'canted', at(270, 130, 48), () => input.edges.add('CANTED')); // so aparece com a mira de 45 graus (body.has-canted)
  input.fieldBtn = btn(t('t_field'), 'field', at(214, 150, 48), () => input.edges.add('FIELD'));
  // usar (plantar / desarmar a bomba): segurar; so aparece no modo bomba
  input.useBtn = btn(t('t_use'), 'use', at(4, 92, 80), () => { input.touch.use = true; }, () => { input.touch.use = false; });
  btn(t('t_inspect'), 'inspect', at(220, 84, 44), () => input.edges.add('INSPECT'));
  // marcar (so no battle royale): acima do equipamento de campo
  input.pingBtn = btn(t('t_ping'), 'ping', at(214, 206, 44), () => input.edges.add('PING'));
  // HUD simples (01/11): granadas, faca, sequencia, inspecionar, equipamento e marcar ficam guardados aqui; toca e abre, toca de novo e fecha
  btn(t('t_breath'), 'breath', at(150, 248, 46), (e, b) => { input.touch.breathUntil = performance.now() + 3500; b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 3500); });
  btn(t('t_more'), 'more', at(96, 248, 46), (e, b) => { const on = document.body.classList.toggle('hud-more'); b.classList.toggle('lit', on); });

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
    if (e.target !== root || e.clientX < innerWidth * 0.4) return; // 08/11 (pedido dele: a camera travava): dedo novo sempre assume o olhar, mesmo com um antigo perdido
    lid = e.pointerId; lx = e.clientX; ly = e.clientY;
  });
  root.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; { const dx = (e.clientX - lx) * 1.4, dy = (e.clientY - ly) * 1.4; input.lookX += dx; input.lookY += dy; input.touchLookX += dx; input.touchLookY += dy; } lx = e.clientX; ly = e.clientY; });
  const lend = (e) => { if (e.pointerId === lid) lid = null; };
  root.addEventListener('pointerup', lend); root.addEventListener('pointercancel', lend);
  // dedo perdido (fim do toque que nunca chegou aqui): primeiro dedo de um toque novo = os antigos ja sairam; a janela ve todo fim de toque
  input.touchAbort?.abort(); const AC = input.touchAbort = new AbortController(), O = { capture: true, signal: AC.signal };
  const lost = () => { lid = null; fireId = null; input.touch.fire = false; if (sid !== null) end({ pointerId: sid }); };
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && e.isPrimary) lost(); }, O);
  addEventListener('pointerup', lend, O); addEventListener('pointercancel', lend, O);
  addEventListener('blur', lost, { signal: AC.signal }); document.addEventListener('visibilitychange', lost, { signal: AC.signal });
  // pausa
  const p = btn(t('t_pause'), 'pause', { left: 'max(12px, env(safe-area-inset-left))', top: 'max(12px, env(safe-area-inset-top))', width: '48px', height: '40px', borderRadius: '12px' }, () => input.edges.add('Escape'));
  void p;
  // inclinar (so plantar a bomba): dois botoes em cima do analogico, segurando
  const lean = (side) => btn(t(side === 'L' ? 't_leanL' : 't_leanR'), 'lean' + side + ' lean', { left: 'calc(max(24px, env(safe-area-inset-left)) + ' + (side === 'L' ? 0 : 104) + 'px)', bottom: 'calc(max(24px, env(safe-area-inset-bottom)) + 162px)', width: '46px', height: '46px' }, () => { input.touch['lean' + side] = true; input.edges.add('LEAN' + side); }, () => { input.touch['lean' + side] = false; });
  input.leanBtns = [lean('L'), lean('R')];
  // chat (so partida online: some pelo CSS sem body.chat-on), embaixo da pausa
  btn(t('t_quick'), 'quick', { left: 'max(12px, env(safe-area-inset-left))', top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)', width: '48px', height: '40px', borderRadius: '12px' }, () => input.edges.add('QUICK'));
  btn(t('chat_open'), 'chat', { left: 'max(12px, env(safe-area-inset-left))', top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)', width: '48px', height: '40px', borderRadius: '12px' }, () => input.onChat?.());
  applyHudLayout(root, input.settings);
  setFireButton(input);
}

// tiro automatico ligado: o botao de atirar some (o jogo atira sozinho com o inimigo na mira)
export function setFireButton(input) {
  if (input.fireBtn) input.fireBtn.hidden = !!input.settings?.autoFire;
  for (const b of [input.adsFireBtn, input.fireLBtn]) if (b) b.hidden = !!input.settings?.autoFire; // tiro automatico: os botoes de atirar somem
  if (input.useBtn) {
    input.useBtn.hidden = input.mode !== 'bomb' && input.mode !== 'br' && input.mode !== 'borroes'; // br: trocar arma no chao; borroes: comprar, abrir porta, Caixa, levantar parceiro
    if (input.pingBtn) input.pingBtn.hidden = input.mode !== 'br';
    for (const b of input.leanBtns || []) b.hidden = input.mode !== 'bomb';
    // a mao (plantar/desarmar) vai pro lugar do botao de atirar quando ele some: e onde o polegar ja esta.
    // Com tiro manual, fica acima do recarregar, fora do meio da tela. Posicao salva no editor de HUD manda.
    if (!input.settings?.hudLayout?.pos?.use) {
      const R = 'max(20px, env(safe-area-inset-right))';
      Object.assign(input.useBtn.style, input.settings?.autoFire
        ? { right: 'calc(' + R + ' + 4px)', bottom: '92px', width: '80px', height: '80px' }
        : { right: 'calc(' + R + ' + 270px)', bottom: '136px', width: '58px', height: '58px' }); // 03/11: fora do equipamento de campo (batia nele)
    }
  }
}

// layout do HUD de toque salvo nos ajustes: { pos: { id: [x%, y%] }, size: { id: k }, scale, alpha }
export function applyHudLayout(root, S) {
  const L = S?.hudLayout || {};
  root.style.setProperty('--tb-scale', L.scale || 1);
  root.style.setProperty('--tb-alpha', L.alpha ?? 1);
  for (const elx of root.querySelectorAll('[data-hid]')) {
    const sz = L.size?.[elx.dataset.hid]; // tamanho proprio de cada botao (08/11, pedido dele); sem ele, vale o geral antigo
    if (sz) elx.style.setProperty('--tb-scale', sz); else elx.style.removeProperty('--tb-scale');
    const pos = L.pos?.[elx.dataset.hid];
    if (!pos) continue;
    Object.assign(elx.style, { left: pos[0] + '%', top: pos[1] + '%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' });
  }
}
function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
