import { BODY_TRAITS } from './weapons.js';
// Banners do jogador (05/11, pedido dele): cartao equipavel que aparece na tela de morte de quem voce pegou, na camera final
// e quando voce chama uma sequencia. Catalogo unico (jogo e servidor): o servidor so repassa o que esta aqui e o nivel libera.
// Tema proprio: impressos e aparelhos de teatro dos anos 30 (ingresso, placa, selo, projetor), nada de camo nem de boneco.
export const BANNERS = [
  { id: 'ingresso', lvl: 1 }, { id: 'pelicula', lvl: 3 }, { id: 'placa', lvl: 5 }, { id: 'letreiro', lvl: 8 },
  { id: 'engrenagens', lvl: 10, anim: 1 }, { id: 'manchete', lvl: 12 }, { id: 'selo', lvl: 14 }, { id: 'radio', lvl: 16, anim: 1 },
  { id: 'partitura', lvl: 18 }, { id: 'cartao', lvl: 20 }, { id: 'metronomo', lvl: 22, anim: 1 }, { id: 'fosforo', lvl: 24 },
  { id: 'maquina', lvl: 26, anim: 1 }, { id: 'tesouro', lvl: 28 }, { id: 'projetor', lvl: 32, anim: 1 }, { id: 'bigorna', lvl: 36, anim: 1 },
  { id: 'neon', lvl: 40, anim: 1 }, { id: 'locomotiva', lvl: 45, anim: 1 },
  // Rovex Pass, temporada 1, A Grande Estreia (lvl 1 aqui: quem libera e o Pass, src/pass.js)
  { id: 'bilheteria', lvl: 1, pass: 1 }, { id: 'fila', lvl: 1, pass: 1 }, { id: 'claquete', lvl: 1, pass: 1, anim: 1 }, { id: 'tapete', lvl: 1, pass: 1 }, { id: 'cartaz', lvl: 1, pass: 1 }, { id: 'plateia', lvl: 1, pass: 1, anim: 1 }, { id: 'estreia', lvl: 1, pass: 1, anim: 1 },
  // da Loja: animados premium
  { id: 'cortina', lvl: 1, shop: 1, anim: 1 }, { id: 'holofote', lvl: 1, shop: 1, anim: 1 }, { id: 'carrossel', lvl: 1, shop: 1, anim: 1 }, { id: 'vitrola', lvl: 1, shop: 1, anim: 1 }, { id: 'foguete', lvl: 1, shop: 1, anim: 1 }, { id: 'zepelim', lvl: 1, shop: 1, anim: 1 },
];
// mestre da arma (07/11, pedido dele): poster de cinema com a foto da arma, um por modelo de arma de fogo. Quem libera e o
// progresso (masteryDone em src/progress.js); o servidor aceita como os da Loja (lvl 1)
export const MASTERY_BODIES = Object.keys(BODY_TRAITS).filter(b => !b.startsWith('melee_') && b !== 'fusil_9');
for (const b of MASTERY_BODIES) BANNERS.push({ id: 'mst_' + b, lvl: 1, mastery: b });
export const BANNER_DEFAULT = 'ingresso';
const BY = Object.fromEntries(BANNERS.map(b => [b.id, b]));
export const bannerOk = (id, lvl) => !!BY[id] && (lvl ?? 1) >= BY[id].lvl;
// bot: sempre o mesmo pro mesmo id, dentro dos basicos
export function botBanner(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return BANNERS[h % 10].id; }
