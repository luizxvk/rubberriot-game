// Entrada: puxa o save da conta Rovex ANTES do jogo ler o localStorage (os modulos leem na carga).
// No site proprio (rubberriot.tryrovex.com) da pra jogar sem conta, como guest (banner no menu pede a conta).
import { pullSave, STANDALONE } from './rovex.js';
import * as rovex from './rovex.js';

const limite = new Promise(res => setTimeout(res, 4500));
Promise.race([pullSave(), limite]).catch(() => {}).finally(async () => {
  await import('./main.js');
  if (STANDALONE && !rovex.me) document.body.classList.add('guest');
});
