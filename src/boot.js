// Entrada: puxa o save da conta Rovex ANTES do jogo ler o localStorage (os modulos leem na carga).
// No site proprio (rubberriot.tryrovex.com) da pra jogar sem conta, como guest (banner no menu pede a conta).
import { pullSave, STANDALONE } from './rovex.js';
import * as rovex from './rovex.js';
import { funil, reportaErro } from './funil.js';

funil('visita');
// celular em pe: conta quantos chegam assim (no navegador do Instagram muita gente nao gira)
if (matchMedia('(orientation: portrait) and (pointer: coarse)').matches) funil('retrato');
addEventListener('error', (ev) => reportaErro(ev.error || ev.message, (ev.filename || '').split('/').pop() + ':' + ev.lineno));
addEventListener('unhandledrejection', (ev) => reportaErro(ev.reason, 'promise'));

const B = window.__rrBoot; // tela de entrada do celular (index.html): o pavio anda com os marcos da carga
B?.set(0.15);
const limite = new Promise(res => setTimeout(res, 4500));
Promise.race([pullSave(), limite]).catch(() => {}).finally(async () => {
  B?.set(0.35);
  await import('./main.js');
  if (STANDALONE && !rovex.me) document.body.classList.add('guest');
});
