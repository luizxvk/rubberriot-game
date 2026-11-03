// O que o jogador comprou na Loja (03/11). Item pago mora na CONTA (servidor da Rovex), nunca no localStorage:
// senao qualquer um "comprava" editando o save. Enquanto a compra nao existe, ninguem tem item da loja.
// Quando existir: /users/me (ou rota do jogo) devolve a lista e o loadMe preenche me.rrOwned.
import { me } from './rovex.js';

// id = 'camo:plasma', 'skin:galaxia'... (o mesmo `give` do item em shared/shop.js)
export const shopOwned = (id) => Array.isArray(me?.rrOwned) && me.rrOwned.includes(id);
