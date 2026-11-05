// Visual do boneco: catalogo unico (jogo e servidor). O servidor so aceita o que esta aqui.
// A COR DO TIME nunca sai daqui: short e fita do chapeu continuam vermelho/azul; o resto e' livre.
// pass = so do Rovex Pass (trilha grátis ou premium, src/pass.js); lvl = nivel do jogador que libera; elite = so com o Elite da Rovex; acct = so quem tem conta Rovex; rank = faixa da rankeada ja alcancada; r = raridade (0 comum, 1 raro, 2 lendario).

// dancas do podio (05/11): o desenho mora em src/dances.js; aqui so os ids que o servidor aceita
// r = raridade; shop = so na Loja; o resto abre por nivel. No podio cada um leva 3 (DANCE_DEFAULT no comeco)
export const DANCE_INFO = {
  volta: { rank: 3, r: 2 }, // rankeada, tema ringue (05/11)
  macarrao: { lvl: 1, r: 0 }, sapateado: { lvl: 1, r: 0 }, charleston: { lvl: 1, r: 0 }, polichinelo: { lvl: 2, r: 0 }, marcha: { lvl: 4, r: 0 }, palmas: { lvl: 6, r: 0 }, mexe: { lvl: 8, r: 0 }, galinha: { lvl: 10, r: 1 }, deslizada: { lvl: 12, r: 1 }, remador: { lvl: 14, r: 1 }, robo: { lvl: 17, r: 1 }, shimmy: { lvl: 20, r: 1 }, bamboleio: { lvl: 23, r: 1 }, lindy: { lvl: 26, r: 1 }, cancan: { lvl: 29, r: 1 }, cossaco: { lvl: 32, r: 1 }, piao: { lvl: 36, r: 1 }, reverencia: { pass: true, r: 2 },
  cambalhota: { shop: true, r: 2 }, mortal: { shop: true, r: 2 }, ombrinho: { shop: true, r: 1 }, passinho: { shop: true, r: 1 }, cruzadinha: { shop: true, r: 1 }, fiodental: { shop: true, r: 1 }, aponta: { shop: true, r: 1 }, cospefogo: { shop: true, r: 2 }, coracao: { shop: true, r: 2 }, canhao: { shop: true, r: 2 }, raio: { shop: true, r: 2 }, projetor: { shop: true, r: 2 },
};
export const DANCE_IDS = Object.keys(DANCE_INFO), DANCE_DEFAULT = ['charleston', 'macarrao', 'sapateado'];

export const LOOK_SLOTS = ['hat', 'eyes', 'glove', 'gloveCol', 'shirt', 'pattern', 'fx', 'skin', 'face', 'charm', 'death'];

export const LOOKS = {
  hat: [
    { id: 'bowler', lvl: 1, r: 0 },      // o coco classico
    { id: 'none', lvl: 1, r: 0 },        // so o topete
    { id: 'cap', lvl: 1, r: 0 },         // bone
    { id: 'beanie', lvl: 2, r: 0 },      // gorro com pompom
    { id: 'party', lvl: 3, r: 0 },       // chapeu de festa
    { id: 'chef', lvl: 4, r: 0 },        // chapeu de cozinheiro
    { id: 'tophat', lvl: 5, r: 1 },      // cartola
    { id: 'cowboy', lvl: 6, r: 1 },      // chapeu de vaqueiro
    { id: 'antenna', lvl: 7, r: 1 },     // anteninha com bolinha
    { id: 'propeller', lvl: 8, r: 1 },   // bone de helice (gira)
    { id: 'flowerpot', lvl: 9, r: 1 },   // vaso de flor na cabeca
    { id: 'pan', lvl: 10, r: 1 },        // frigideira
    { id: 'pirate', lvl: 12, r: 1 },     // tricornio
    { id: 'horns', lvl: 14, r: 1 },      // chifres
    { id: 'viking', lvl: 16, r: 2 },     // elmo de chifre
    { id: 'fez', lvl: 18, r: 1 },        // fez com franja
    { id: 'halo', lvl: 22, r: 2 },       // aureola
    { id: 'crown', lvl: 30, r: 2 },      // coroa
    { id: 'tvhead', lvl: 1, r: 2, elite: true },  // televisao de valvula no lugar do chapeu
    { id: 'jester', lvl: 1, r: 2, elite: true },  // chapeu de bobo da corte
    { id: 'plunger', lvl: 1, r: 1, ch: 'u_lk_plunger' }, // desentupidor grudado (desafio)
    { id: 'rovexcap', lvl: 1, r: 2, acct: true },
    { id: 'capcrown', lvl: 1, r: 2, meta: true },  // coroa de tampinhas: set da meta da comunidade (31/10)
    { id: 'laurel', lvl: 1, r: 2, rank: 4 },      // coroa de louros: faixa Mestre da rankeada (31/10)  // bone violeta com o hexagono: so quem tem conta Rovex (31/10)
    // da Loja (03/11): so comprando
    { id: 'ufo', lvl: 1, r: 2, shop: true },      // disco voador girando
    { id: 'nuvem', lvl: 1, r: 2, shop: true },    // nuvem de chuva flutuando
    { id: 'bolo', lvl: 1, r: 1, shop: true },     // bolo de aniversario com vela
    { id: 'tubarao', lvl: 1, r: 1, shop: true },  // barbatana de tubarao
    { id: 'sorvete', lvl: 1, r: 1, shop: true },  // duas bolas de sorvete com cereja
    { id: 'alavanca', lvl: 1, r: 2, shop: true }, // alavanca de fliperama
    { id: 'cogumelo', lvl: 1, r: 1, shop: true }, // chapeu de cogumelo
    { id: 'boina', lvl: 1, r: 2, pass: true },    // A Grande Estreia, nivel 50: boina de diretor
  ],
  eyes: [
    { id: 'classic', lvl: 1, r: 0 },     // olho de torta
    { id: 'sleepy', lvl: 1, r: 0 },      // sonolento
    { id: 'angry', lvl: 2, r: 0 },       // bravo
    { id: 'wink', lvl: 3, r: 0 },        // piscadinha
    { id: 'dizzy', lvl: 5, r: 1 },       // espiral (tonto)
    { id: 'hearts', lvl: 7, r: 1 },      // apaixonado
    { id: 'stars', lvl: 9, r: 1 },       // estrelado
    { id: 'specs', lvl: 4, r: 0 },       // oculos redondo
    { id: 'shades', lvl: 6, r: 1 },      // oculos escuro
    { id: 'monocle', lvl: 11, r: 1 },    // monoculo
    { id: 'goggles', lvl: 13, r: 1 },    // oculos de aviador
    { id: 'cyclops', lvl: 20, r: 2 },    // olhao so
    { id: 'laser', lvl: 1, r: 2, elite: true },   // visor vermelho que brilha
    { id: 'knockout', lvl: 1, r: 1, ch: 'u_lk_knockout' }, // olhos de nocaute X X (desafio)
  ],
  glove: [
    { id: 'classic', lvl: 1, r: 0 },     // luva de punho dobrado
    { id: 'mitten', lvl: 2, r: 0 },      // luva de lã
    { id: 'boxing', lvl: 5, r: 1 },      // luva de boxe
    { id: 'spiked', lvl: 10, r: 1 },     // munhequeira de cravos
    { id: 'claw', lvl: 15, r: 2 },       // garras
    { id: 'golden', lvl: 1, r: 2, elite: true },  // luva dourada com anel
    { id: 'oven', lvl: 1, r: 1, ch: 'u_lk_oven' },        // luva de forno xadrez (desafio)
  ],
  gloveCol: [
    { id: '#faf8f2', lvl: 1, r: 0 }, { id: '#e8d9a8', lvl: 1, r: 0 }, { id: '#141210', lvl: 3, r: 0 },
    { id: '#f2c94c', lvl: 4, r: 0 }, { id: '#7fb069', lvl: 6, r: 1 }, { id: '#b07cc6', lvl: 8, r: 1 },
    { id: '#ef8a5b', lvl: 10, r: 1 }, { id: '#7fd1d8', lvl: 12, r: 1 }, { id: '#6d3df5', lvl: 1, r: 2, acct: true }, { id: '#c9cdd2', lvl: 1, r: 2, rank: 1 }, { id: '#ffcf3a', lvl: 1, r: 2, meta: true },
    { id: '#bfb6a6', lvl: 1, r: 0, pass: true }, { id: '#c9e08a', lvl: 1, r: 1, pass: true }, { id: '#d8c08a', lvl: 1, r: 1, pass: true }, { id: '#a8b4c0', lvl: 1, r: 1, pass: true },
  ],
  // camisa: so tons que nao confundem com o time (nada de vermelho nem azul)
  shirt: [
    { id: '#141210', lvl: 1, r: 0 }, { id: '#ece9e1', lvl: 1, r: 0 }, { id: '#5a544d', lvl: 2, r: 0 },
    { id: '#7a4a2a', lvl: 3, r: 0 }, { id: '#55603a', lvl: 5, r: 0 }, { id: '#4a2f4f', lvl: 7, r: 1 },
    { id: '#2b5f5a', lvl: 9, r: 1 }, { id: '#b8913a', lvl: 1, r: 2, elite: true }, { id: '#6d3df5', lvl: 1, r: 2, acct: true }, { id: '#a8692f', lvl: 1, r: 1, rank: 0 }, { id: '#e3a92b', lvl: 1, r: 2, meta: true },
    { id: '#7b5a2f', lvl: 1, r: 0, pass: true }, { id: '#3d3a2c', lvl: 1, r: 1, pass: true }, { id: '#6b4f3a', lvl: 1, r: 1, pass: true }, { id: '#8a7a2f', lvl: 1, r: 1, pass: true },
  ],
  // estampa do short (o fundo continua a cor do time)
  pattern: [
    { id: 'plain', lvl: 1, r: 0 }, { id: 'stripes', lvl: 2, r: 0 }, { id: 'dots', lvl: 4, r: 0 },
    { id: 'checker', lvl: 6, r: 1 }, { id: 'zigzag', lvl: 9, r: 1 }, { id: 'stars', lvl: 12, r: 1 },
    { id: 'filme', lvl: 1, r: 1, pass: true }, { id: 'cortina', lvl: 1, r: 1, pass: true }, // pelicula e cortina de teatro
  ],
  // efeito em volta do boneco
  fx: [
    { id: 'none', lvl: 1, r: 0 },
    { id: 'notes', lvl: 8, r: 1 },       // notinhas de musica
    { id: 'confetti', lvl: 12, r: 1 },   // confete
    { id: 'spark', lvl: 18, r: 2 },      // raio
    { id: 'fire', lvl: 24, r: 2 },       // fogo
    { id: 'water', lvl: 28, r: 2 },      // agua (bolhas e gotas)
    { id: 'ether', lvl: 1, r: 2, elite: true },   // eter sombrio
    { id: 'stink', lvl: 1, r: 1, ch: 'u_lk_stink' },      // fedor verde de desenho (desafio)
  ],
};

// skin animada do corpo (03/11, Loja): camisa e sapato viram pintura animada (shader das camos). Short continua
// na cor do time, luva e rosto ficam. shop = so comprando na Loja (nao abre por nivel/desafio/Elite).
LOOKS.skin = [
  { id: 'none', lvl: 1, r: 0 },
  { id: 'dragao', lvl: 1, r: 2, shop: true },      // pele de dragao (escamas furta-cor)
  { id: 'holograma', lvl: 1, r: 2, shop: true },   // holograma com varredura e falha
  { id: 'tempestade', lvl: 1, r: 2, shop: true },  // ceu de tempestade com relampago
  { id: 'discoteca', lvl: 1, r: 2, shop: true },   // bola de discoteca
  { id: 'massinha', lvl: 1, r: 1, shop: true },    // massinha de modelar
  { id: 'lapis', lvl: 1, r: 1, shop: true },       // rabisco a lapis
  { id: 'giz', lvl: 1, r: 1, shop: true },         // giz de cera
  { id: 'planta', lvl: 1, r: 1, shop: true },      // planta azul (papel de projeto)
  { id: 'papelao', lvl: 1, r: 1, shop: true },     // caixa de papelao com fita
  { id: 'trico', lvl: 1, r: 1, shop: true },       // trico de la listrado
  { id: 'aquarela', lvl: 1, r: 2, shop: true },    // aquarela molhada
  { id: 'pixel', lvl: 1, r: 2, shop: true },       // blocos de 8 bits
];
// rosto, chaveiro (na arma) e animacao de morte (05/11, pedido dele)
LOOKS.face = [
  { id: 'none', lvl: 1, r: 0 }, { id: 'curativo', lvl: 1, r: 0, pass: true }, { id: 'bigodinho', lvl: 1, r: 0, pass: true }, { id: 'sardas', lvl: 1, r: 0, pass: true },
  { id: 'bigode', lvl: 1, r: 1, pass: true }, { id: 'charuto', lvl: 1, r: 1, pass: true }, { id: 'dente', lvl: 1, r: 1, pass: true }, { id: 'cachimbo', lvl: 1, r: 1, pass: true }, { id: 'cavanhaque', lvl: 1, r: 1, pass: true }, { id: 'barba', lvl: 1, r: 2, pass: true }, { id: 'tapa', lvl: 1, r: 2, pass: true },
  { id: 'gargalhada', lvl: 1, r: 1, shop: true }, { id: 'lingua', lvl: 1, r: 1, shop: true },
  { id: 'olhoroxo', lvl: 1, r: 1, rank: 0 }, // rankeada, tema ringue (05/11)
];
LOOKS.charm = [
  { id: 'none', lvl: 1, r: 0 }, { id: 'bilhete', lvl: 1, r: 0, pass: true }, { id: 'estatueta', lvl: 1, r: 0, pass: true },
  { id: 'torta', lvl: 1, r: 1, pass: true }, { id: 'rolo', lvl: 1, r: 1, pass: true }, { id: 'camera', lvl: 1, r: 1, pass: true }, { id: 'lampada', lvl: 1, r: 1, pass: true }, { id: 'cadeira', lvl: 1, r: 2, pass: true }, { id: 'megafone', lvl: 1, r: 2, pass: true }, { id: 'bigorna', lvl: 1, r: 2, pass: true },
  { id: 'dado', lvl: 1, r: 1, shop: true }, { id: 'pato', lvl: 1, r: 1, shop: true },
  { id: 'sino', lvl: 1, r: 1, rank: 1 }, // rankeada, tema ringue (05/11)
];
LOOKS.death = [
  { id: 'pancake', lvl: 1, r: 0 }, { id: 'tabua', lvl: 1, r: 0, pass: true }, { id: 'fita', lvl: 1, r: 1, pass: true }, { id: 'anjo', lvl: 1, r: 2, pass: true }, { id: 'sanfona', lvl: 1, r: 1, pass: true },
  { id: 'balao', lvl: 1, r: 2, shop: true }, { id: 'mola', lvl: 1, r: 2, shop: true }, { id: 'nocaute', lvl: 1, r: 2, rank: 2 },
];
export const DEFAULT_LOOK = { hat: 'bowler', eyes: 'classic', glove: 'classic', gloveCol: '#faf8f2', shirt: '#141210', pattern: 'plain', fx: 'none', skin: 'none', face: 'none', charm: 'none', death: 'pancake' };

// limpa o que veio de fora: id que nao existe volta pro padrao
export function cleanLook(l) {
  const out = { ...DEFAULT_LOOK };
  if (!l || typeof l !== 'object') return out;
  for (const k of LOOK_SLOTS) if (typeof l[k] === 'string' && LOOKS[k].some(i => i.id === l[k])) out[k] = l[k];
  return out;
}

// bot: visual sorteado (fixo pelo id), so do que e' gratis, pra cada um ter a sua cara
export function botLook(id) {
  let h = 2166136261;
  for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const pick = (k) => { const l = LOOKS[k].filter(i => !i.elite && !i.ch && !i.shop && !i.pass); h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return l[h % l.length].id; };
  const out = {};
  for (const k of LOOK_SLOTS) out[k] = pick(k);
  if (h % 3) out.fx = 'none'; // efeito so em 1 de cada 3 bots
  return out;
}
