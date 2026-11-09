// Comandos remapeaveis (01/11, pedido dele): teclado/mouse e controle. O que ele troca fica em settings.binds
// ({ kb: { acao: [codigos] }, pad: { acao: 'BOTAO' } }); o resto segue o padrao. Esc/Start (pausa), Tab/Select
// (placar), mouse/analogicos (olhar e andar no controle) e as teclas 1-3/rodinha ficam fixos.
import { getLang } from './i18n.js';

// acao: [rotulo (chave do texto), teclas padrao, botao padrao do controle ou null]
export const ACTIONS = [
  ['fwd', 'k_fwd', ['KeyW'], null], ['back', 'k_bwd', ['KeyS'], null], ['left', 'k_left', ['KeyA'], null], ['right', 'k_right', ['KeyD'], null],
  ['fire', 'k_fire', ['Mouse0'], 'RT'], ['ads', 'k_ads', ['Mouse2'], 'LT'],
  ['sprint', 'k_sprint', ['ShiftLeft'], 'L3'], ['jump', 'k_jump', ['Space'], 'A'], ['crouch', 'k_crouch', ['KeyC', 'ControlLeft'], 'B'],
  ['reload', 'k_reload', ['KeyR'], 'X'], ['cycle', 'k_swap', [], 'Y'], ['last', 'k_last', ['KeyQ'], null],
  ['melee', 'k_melee', ['KeyV'], 'R3'], ['frag', 'k_frag', ['KeyG'], 'LB'], ['flash', 'k_flash', ['KeyF'], 'RB'],
  ['streak', 'k_streak', ['KeyX'], 'UP'], ['inspect', 'k_inspect', ['KeyI'], 'DOWN'], ['field', 'k_field', ['KeyZ'], 'RIGHT'],
  ['ping', 'k_ping', ['KeyB', 'Mouse1'], 'LEFT'], ['use', 'k_use', ['KeyE'], null], ['gadget', 'k_gadget', ['KeyH'], 'LEFT'], // gadget divide o direcional esquerdo com o marcar (battle royale)
  ['dance1', 'k_dance1', ['Digit1'], 'LEFT'], ['dance2', 'k_dance2', ['Digit2'], 'UP'], ['dance3', 'k_dance3', ['Digit3'], 'RIGHT'], // so valem no podio: dividem tecla e botao com a partida
  ['canted', 'k_canted', ['KeyN'], 'DOWN'], // mira de 45 graus: so vale mirando (por isso divide o direcional com inspecionar)
  ['leanL', 'k_leanL', ['KeyQ'], null], ['leanR', 'k_leanR', ['KeyE'], null], ['map', 'k_spec', ['KeyM'], null],
  ['breath', 'k_breath', ['ShiftLeft'], 'L3'], // segurar a respiracao na luneta (08/11): divide com correr, que nao vale mirando
  ['boost', 'k_boost', ['KeyJ'], null], // usar a proxima ficha de XP em dobro do Bolso (06/11)
];
export const PAD_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_FIXED = ['SELECT', 'START'];
// pares que podem dividir a tecla de proposito (E = usar e inclinar pra direita; Q = ultima arma e inclinar pra esquerda)
const SHARE = [['use', 'leanR'], ['last', 'leanL'], ['ping', 'gadget'], ['sprint', 'breath']];
const shareOk = (a, b) => a.startsWith('dance') || b.startsWith('dance') || SHARE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const FIXED_KEYS = ['Escape', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'KeyP'];

export const kbBinds = (S) => Object.fromEntries(ACTIONS.map(([id, , kb]) => [id, S?.binds?.kb?.[id] ?? kb]));
export const padBinds = (S) => Object.fromEntries(ACTIONS.filter(a => a[3]).map(([id, , , pad]) => [id, S?.binds?.pad?.[id] ?? pad]));

// troca a tecla: quem ja usava ela (fora os pares permitidos) recebe a antiga dessa acao
export function setKb(S, id, code) {
  const cur = kbBinds(S), old = cur[id] || [];
  S.binds ||= {}; S.binds.kb ||= {};
  for (const [o, codes] of Object.entries(cur)) if (o !== id && codes.includes(code) && !shareOk(o, id)) S.binds.kb[o] = [...codes.filter(c => c !== code), ...old.filter(c => !cur[o].includes(c)).slice(0, 1)];
  S.binds.kb[id] = [code];
}
export function setPad(S, id, btn) {
  if (PAD_FIXED.includes(btn)) return false;
  const cur = padBinds(S), old = cur[id];
  S.binds ||= {}; S.binds.pad ||= {};
  for (const [o, b] of Object.entries(cur)) if (o !== id && b === btn && !shareOk(o, id)) S.binds.pad[o] = old;
  S.binds.pad[id] = btn;
  return true;
}
export function resetBinds(S, which) { if (S.binds) delete S.binds[which]; }

// nome da tecla pra tela
const PT = { Space: 'Espaco', Mouse0: 'Botao esquerdo', Mouse1: 'Botao do meio', Mouse2: 'Botao direito', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', ShiftLeft: 'Shift', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl', ControlRight: 'Ctrl dir.', AltLeft: 'Alt', CapsLock: 'Caps', Enter: 'Enter', Backspace: 'Apagar' };
const EN = { Space: 'Space', Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Alt', CapsLock: 'Caps', Enter: 'Enter', Backspace: 'Backspace' };
export function keyName(code) {
  const M = getLang() === 'pt' ? PT : EN;
  if (M[code]) return M[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ').replace(/^Arrow/, '');
}
const PAD_NAME = { A: 'A / ✕', B: 'B / ○', X: 'X / □', Y: 'Y / △', LB: 'LB / L1', RB: 'RB / R1', LT: 'LT / L2', RT: 'RT / R2', L3: 'L3', R3: 'R3', UP: '▲', DOWN: '▼', LEFT: '◀', RIGHT: '▶' };
export const padName = (b) => PAD_NAME[b] || b;
// ajustes vivos (main.js chama useBinds(settings)): dicas, tutorial e hud leem a tecla atual sem receber nada
let LIVE = null;
export const useBinds = (S) => { LIVE = S; };
export const isBindable = (id) => ACTIONS.some(a => a[0] === id);
// rotulo curto da acao no aparelho (dicas da partida): 0 teclado, 1 controle
export function bindLabel(S, id, dev) {
  S ||= LIVE;
  if (dev === 1) { const b = padBinds(S)[id]; return b ? (PAD_NAME[b] || b).split(' / ')[0] : ''; }
  const k = kbBinds(S)[id]; return k?.length ? keyName(k[0]) : '';
}
