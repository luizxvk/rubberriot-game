// Rovex Pass do Rubber Riot. Temporada 1: A GRANDE ESTREIA (05/11, pedido dele): o estudio estreia o primeiro filme do Rubber Riot; tudo novo vem
// do cinema dos anos 30 (bilheteria, pipoca, claquete, tapete vermelho, projetor). Sobe com XP de partida, ate o nivel 50.
// Duas trilhas: PASS (premium, um premio por nivel, so com o Elite da Rovex) e PASS_FREE (de 5 em 5, pra todo mundo, coisas mais comuns).
// Nada daqui e vendido na Loja nem sai por desafio. Nao tem import pra poder entrar em progress.js e nas ferramentas.
export const PASS_SEASON = 1;
// fim da temporada (08/11, pedido dele: 1 mes e meio a partir de hoje). Usado na pilula da aba da Loja
export const PASS_ENDS = new Date(2026, 11, 23, 23, 59, 59).getTime();
export const passDaysLeft = (now = Date.now()) => Math.ceil((PASS_ENDS - now) / 864e5);
export const PASS_PER = 1200;
const L = (slot, id) => ({ k: 'look', slot, id });
const B = (id) => ({ k: 'banner', id });
export const PASS = [
  { k: 'camo', id: 'ps_jornal' }, { k: 'ret', id: 'pink' }, { k: 'camo', id: 'ps_zebra' }, { k: 'ret', id: 'cyan' },
  { k: 'camo', id: 'ps_circo' }, { k: 'ret', id: 'violet' }, { k: 'camo', id: 'ps_filme' }, { k: 'ret', id: 'lime' },
  { k: 'camo', id: 'ps_choque' }, { k: 'camo', id: 'ps_fogo' }, { k: 'camo', id: 'ps_cromo' }, { k: 'camo', id: 'ps_neon' },
  // itens de visual que ja existem (pedido dele): quem tem o Elite pega aqui antes do nivel; quem chegou pelo nivel continua com eles
  L('hat', 'viking'), L('glove', 'claw'), L('eyes', 'cyclops'), L('fx', 'spark'), L('hat', 'halo'), L('hat', 'crown'),
  // 19 a 50: A Grande Estreia
  L('charm', 'torta'), L('face', 'bigode'), B('claquete'), L('shirt', '#3d3a2c'), L('charm', 'rolo'), L('face', 'charuto'), L('death', 'fita'), L('gloveCol', '#c9e08a'),
  B('tapete'), L('face', 'dente'), L('charm', 'camera'), L('death', 'anjo'), L('shirt', '#6b4f3a'), B('cartaz'), L('face', 'cachimbo'), L('charm', 'lampada'),
  L('gloveCol', '#d8c08a'), L('face', 'cavanhaque'), B('plateia'), { k: 'dance', id: 'reverencia' }, L('shirt', '#8a7a2f'), L('charm', 'cadeira'), L('gloveCol', '#a8b4c0'), L('face', 'barba'),
  L('pattern', 'filme'), L('charm', 'megafone'), L('death', 'sanfona'), L('pattern', 'cortina'), L('face', 'tapa'), B('estreia'), L('charm', 'bigorna'), L('hat', 'boina'),
];
export const PASS_MAX = PASS.length;
// nivel -> premio da trilha gratis
export const PASS_FREE = {
  5: L('face', 'curativo'), 10: L('charm', 'bilhete'), 15: B('bilheteria'), 20: L('shirt', '#7b5a2f'), 25: L('face', 'bigodinho'),
  30: L('gloveCol', '#bfb6a6'), 35: L('charm', 'estatueta'), 40: B('fila'), 45: L('face', 'sardas'), 50: L('death', 'tabua'),
};
// cor de reticula -> nivel do Pass que abre
export const RET_PASS = Object.fromEntries(PASS.flatMap((p, i) => (p.k === 'ret' ? [[p.id, i + 1]] : [])));
