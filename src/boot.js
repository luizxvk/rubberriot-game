// Entrada: puxa o save da conta Rovex ANTES do jogo ler o localStorage (os modulos leem na carga).
// No site proprio (rubberriot.tryrovex.com) jogar pede login: sem conta, o cartaz "Entrar com a Rovex".
import { pullSave, STANDALONE, AUTH_URL } from './rovex.js';
import * as rovex from './rovex.js';

const limite = new Promise(res => setTimeout(res, 4500));
Promise.race([pullSave(), limite]).catch(() => {}).finally(async () => {
  await import('./main.js');
  if (STANDALONE && !rovex.me) {
    document.getElementById('gateGo').href = AUTH_URL;
    document.getElementById('gate').hidden = false;
    document.body.classList.add('gated');
  }
});
