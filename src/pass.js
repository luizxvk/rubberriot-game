// Rovex Pass do Rubber Riot (04/11, pedido dele): so itens do jogo. Cada nivel custa PASS_PER de XP de partida e abre uma
// recompensa na hora. Nada aqui e vendido na Loja nem sai por desafio: as camos sao ps_* (src/camos.js, campo pass) e as cores
// de reticula sao as de RET_PASS. Nao tem import pra poder entrar em progress.js e nas ferramentas.
export const PASS_PER = 1200;
export const PASS = [
  { k: 'camo', id: 'ps_jornal' }, { k: 'ret', id: 'pink' }, { k: 'camo', id: 'ps_zebra' }, { k: 'ret', id: 'cyan' },
  { k: 'camo', id: 'ps_circo' }, { k: 'ret', id: 'violet' }, { k: 'camo', id: 'ps_filme' }, { k: 'ret', id: 'lime' },
  { k: 'camo', id: 'ps_choque' }, { k: 'camo', id: 'ps_fogo' }, { k: 'camo', id: 'ps_cromo' }, { k: 'camo', id: 'ps_neon' },
  // itens de visual que ja existem (pedido dele): quem tem o Elite pega aqui antes do nivel; quem chegou pelo nivel continua com eles
  { k: 'look', slot: 'hat', id: 'viking' }, { k: 'look', slot: 'glove', id: 'claw' }, { k: 'look', slot: 'eyes', id: 'cyclops' },
  { k: 'look', slot: 'fx', id: 'spark' }, { k: 'look', slot: 'hat', id: 'halo' }, { k: 'look', slot: 'hat', id: 'crown' },
];
export const PASS_MAX = PASS.length;
// cor de reticula -> nivel do Pass que abre
export const RET_PASS = Object.fromEntries(PASS.flatMap((p, i) => (p.k === 'ret' ? [[p.id, i + 1]] : [])));
