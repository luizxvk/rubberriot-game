// Visual do boneco: catalogo unico (jogo e servidor). O servidor so aceita o que esta aqui.
// A COR DO TIME nunca sai daqui: short e fita do chapeu continuam vermelho/azul; o resto e' livre.
// lvl = nivel do jogador que libera; elite = so com o Elite da Rovex; r = raridade (0 comum, 1 raro, 2 lendario).

export const LOOK_SLOTS = ['hat', 'eyes', 'glove', 'gloveCol', 'shirt', 'pattern', 'fx'];

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
    { id: '#ef8a5b', lvl: 10, r: 1 }, { id: '#7fd1d8', lvl: 12, r: 1 },
  ],
  // camisa: so tons que nao confundem com o time (nada de vermelho nem azul)
  shirt: [
    { id: '#141210', lvl: 1, r: 0 }, { id: '#ece9e1', lvl: 1, r: 0 }, { id: '#5a544d', lvl: 2, r: 0 },
    { id: '#7a4a2a', lvl: 3, r: 0 }, { id: '#55603a', lvl: 5, r: 0 }, { id: '#4a2f4f', lvl: 7, r: 1 },
    { id: '#2b5f5a', lvl: 9, r: 1 }, { id: '#b8913a', lvl: 1, r: 2, elite: true },
  ],
  // estampa do short (o fundo continua a cor do time)
  pattern: [
    { id: 'plain', lvl: 1, r: 0 }, { id: 'stripes', lvl: 2, r: 0 }, { id: 'dots', lvl: 4, r: 0 },
    { id: 'checker', lvl: 6, r: 1 }, { id: 'zigzag', lvl: 9, r: 1 }, { id: 'stars', lvl: 12, r: 1 },
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

export const DEFAULT_LOOK = { hat: 'bowler', eyes: 'classic', glove: 'classic', gloveCol: '#faf8f2', shirt: '#141210', pattern: 'plain', fx: 'none' };

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
  const pick = (k) => { const l = LOOKS[k].filter(i => !i.elite && !i.ch); h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; return l[h % l.length].id; };
  const out = {};
  for (const k of LOOK_SLOTS) out[k] = pick(k);
  if (h % 3) out.fx = 'none'; // efeito so em 1 de cada 3 bots
  return out;
}
