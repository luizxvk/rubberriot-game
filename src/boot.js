// Entrada: puxa o save da conta Rovex ANTES do jogo ler o localStorage (os modulos leem na carga).
import { pullSave } from './rovex.js';

const limite = new Promise(res => setTimeout(res, 4500));
Promise.race([pullSave(), limite]).catch(() => {}).finally(() => import('./main.js'));
