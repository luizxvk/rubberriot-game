// Mercado Negro (08/11, pedido dele): 2 variantes de CADA arma de fogo, temas sem repetir entre elas nem entre armas.
// Variante = o MESMO modelo, com camo exclusiva dela (shader parametrico code 70, src/camos.js), nome proprio PT/EN,
// stats parecidos com os da base + um bonus e um onus que se equilibram (mods, mesma regra das variantes de elite:
// rate > 1 = mais lento; kick/spread/adsTime/reload > 1 = pior; dmg/move/mag > 1 = melhor). Entram no BLUEPRINTS
// (shared/weapons.js) como 'bm_<modelo>_<1|2>', entao valem no cliente E no servidor (limite de dano) e ja vem com a
// corrida tatica das variantes (viewmodel isBp). Posse: item 'bp:<id>' na carteira da Loja (so o servidor escreve).
//
// Regras dele (08/11): bau COMPRADO por 7.500 ZP; peca repetida vira espolio de 500 a 1.500 ZP (sorteado); 5 pecas
// completam a variante; vitrine do Comum ao Lendario, de 15 a 30 mil ZP; 5 por dia em rotacao semanal.

export const BM_BODIES = [
  'pistol_1', 'pistol_2', 'pistol_3', 'pistol_4', 'pistol_5', 'pistol_6', 'pistol_7', 'pistol_8', 'pistol_9', 'pistol_10', 'pistol_11',
  'subfusil_1', 'subfusil_2', 'subfusil_3', 'subfusil_4', 'subfusil_5', 'subfusil_6', 'subfusil_7', 'subfusil_8', 'subfusil_9', 'subfusil_10', 'subfusil_13',
  'fusil_1', 'fusil_2', 'fusil_3', 'fusil_4', 'fusil_5', 'fusil_6', 'fusil_7', 'fusil_11', 'fusil_12', 'fusil_13',
  'shotgun_1', 'shotgun_2', 'shotgun_3', 'sniper_0', 'sniper_1', 'sniper_2', 'sniper_3', 'sniper_4', 'lmg_1', 'lmg_2',
];
const CAT = (b) => b.startsWith('pistol') ? 'pistol' : b.startsWith('subfusil') ? 'smg' : b.startsWith('fusil') ? 'rifle' : b.startsWith('shotgun') ? 'shotgun' : b.startsWith('sniper') ? 'sniper' : 'lmg';

// 84 temas, um por variante, NENHUM repete. [pt, en, desenho 0-7, cor A, cor B, cor C]
// desenhos: 0 listras, 1 manchas, 2 celulas, 3 xadrez, 4 bolinhas, 5 ondas, 6 rachaduras com brilho, 7 redemoinho animado
const THEMES = [
  ['Carnaval', 'Carnival', 4, '#2a1a5e', '#ffcf3a', '#e8327a'], ['Meia-Noite', 'Midnight', 7, '#05061a', '#2a3a8a', '#9fb4ff'],
  ['Brasa Viva', 'Live Ember', 6, '#1a0a06', '#ff5a1a', '#ffd23f'], ['Geada', 'Hoarfrost', 2, '#dff4ff', '#7fbbe0', '#2a5a8a'],
  ['Pântano', 'Swamp', 1, '#2c3a14', '#55702a', '#a5b04a'], ['Neon do Cais', 'Dockside Neon', 0, '#0b0b14', '#ff2a9a', '#2af0ff'],
  ['Café Forte', 'Strong Coffee', 5, '#2a170c', '#6b3f22', '#d9b38a'], ['Ferrugem', 'Rust', 1, '#5a2a14', '#a0522d', '#d9883a'],
  ['Algodão Doce', 'Cotton Candy', 7, '#ffd0e8', '#b8e0ff', '#fff3fa'], ['Tempestade', 'Thunderhead', 6, '#1a2030', '#4a5a7a', '#e8f0ff'],
  ['Pirata', 'Buccaneer', 3, '#141210', '#e9e4d8', '#a3201a'], ['Deserto', 'Dune', 5, '#d9b878', '#a8834a', '#f4e2b4'],
  ['Floresta Escura', 'Dark Woods', 1, '#0f1f12', '#2a4a24', '#5a7a3a'], ['Oceano', 'Deep Sea', 5, '#06223a', '#0e5a8a', '#5fd3ff'],
  ['Cobre', 'Copper', 2, '#5a2a10', '#b8682a', '#ffb07a'], ['Marfim', 'Ivory', 3, '#f4eedf', '#d8cfb8', '#8a7a5a'],
  ['Vulcão', 'Volcano', 6, '#120604', '#3a0e06', '#ff6a1a'], ['Lavanda', 'Lavender', 4, '#b8a6e0', '#7a62b8', '#f2ecff'],
  ['Militar', 'Drill Sergeant', 1, '#3a3f22', '#5c6b3a', '#8a8a5a'], ['Tinta Fresca', 'Wet Paint', 0, '#f2c94c', '#2f5b8a', '#d8322a'],
  ['Hortelã', 'Mint', 4, '#c8f2dc', '#4ac08a', '#1a6a4a'], ['Ouro Velho', 'Old Gold', 2, '#3a2a0a', '#a8843a', '#ffe08a'],
  ['Cereja', 'Cherry', 3, '#5a0a14', '#c8243a', '#ffb0c0'], ['Granito', 'Granite', 1, '#4a4a4a', '#7a7a7a', '#bdbdbd'],
  ['Céu Polar', 'Polar Sky', 7, '#020615', '#3dffa0', '#a24bff'], ['Cacto', 'Cactus', 0, '#3a6a2a', '#7ab04a', '#f2e6a0'],
  ['Arcade', 'Arcade', 3, '#0a0a1a', '#ff3ac8', '#3affd8'], ['Musgo', 'Moss', 1, '#2a3a1a', '#6a8a3a', '#c8d88a'],
  ['Petróleo', 'Crude', 7, '#05050a', '#1a3a4a', '#7a3aa0'], ['Areia Rosa', 'Pink Sand', 5, '#f2c8b8', '#d88a7a', '#fff0e8'],
  ['Nanquim', 'India Ink', 0, '#0a0a0a', '#3a3a3a', '#e9e4d8'], ['Abóbora', 'Pumpkin', 2, '#3a1a06', '#e8731a', '#ffd08a'],
  ['Turquesa', 'Turquoise', 4, '#0a3a3a', '#2ab8b0', '#c8fff8'], ['Sangue de Dragão', 'Dragon Blood', 6, '#1a0204', '#8a0a14', '#ff3a2a'],
  ['Jornal Velho', 'Old Paper', 3, '#e8dfc8', '#bdb18a', '#3a3428'], ['Esmeralda', 'Emerald', 2, '#02200f', '#0a7a3a', '#5aff9a'],
  ['Pera', 'Pear', 5, '#c8d84a', '#8aa02a', '#f4f8c8'], ['Cinzas', 'Ashes', 1, '#2a2826', '#5a5652', '#9a948c'],
  ['Nebulosa', 'Nebula', 7, '#070316', '#ff6ad5', '#4a7bff'], ['Bambu', 'Bamboo', 0, '#5a7a2a', '#a8c86a', '#e8f0c8'],
  ['Chiclete', 'Bubblegum', 4, '#ff8ac8', '#ffd0ea', '#c8248a'], ['Ardósia', 'Slate', 3, '#2a3038', '#4a5460', '#8a96a4'],
  ['Mel', 'Honey', 2, '#5a3a06', '#d8961a', '#ffe08a'], ['Uva', 'Grape', 5, '#2a0a3a', '#6a2a8a', '#c88aff'],
  ['Relâmpago Azul', 'Blue Bolt', 6, '#02081a', '#0a2a6a', '#5ad8ff'], ['Safari', 'Safari', 1, '#c8a86a', '#8a6a3a', '#3a2a14'],
  ['Sorvete de Creme', 'Vanilla Scoop', 4, '#fff4d8', '#f2d8a0', '#a86a3a'], ['Cromo Fosco', 'Matte Chrome', 7, '#3a3e44', '#8a9098', '#e8eef4'],
  ['Limão', 'Lime', 0, '#2a3a06', '#9ad81a', '#f4ffb0'], ['Coral', 'Coral Reef', 5, '#ff6a5a', '#ffb08a', '#2ac8c0'],
  ['Carvão', 'Charcoal', 2, '#0e0e0e', '#262626', '#ff5a1a'], ['Tijolo', 'Brick', 3, '#6a2a1a', '#a84a2a', '#d8a08a'],
  ['Neblina', 'Fog', 1, '#a8b0b8', '#d0d6dc', '#f4f6f8'], ['Abismo', 'Abyss', 7, '#000208', '#06123a', '#2a5aff'],
  ['Girassol', 'Sunflower', 4, '#3a2a06', '#ffcf1a', '#6a4a1a'], ['Pele de Cobra', 'Snakeskin', 2, '#2a3a1a', '#7a8a3a', '#d8d88a'],
  ['Cinema Mudo', 'Silent Picture', 3, '#141210', '#7a766e', '#f4f0e6'], ['Magma Frio', 'Cold Magma', 6, '#0a0a14', '#2a1a4a', '#ff4ad1'],
  ['Pistache', 'Pistachio', 5, '#c8e0a0', '#8ab06a', '#4a6a2a'], ['Raposa', 'Fox', 0, '#3a1a06', '#d86a1a', '#f4f0e6'],
  ['Pavão', 'Peacock', 7, '#021a2a', '#0a8a8a', '#3a5aff'], ['Areia Negra', 'Black Sand', 1, '#141414', '#2a2a2a', '#6a6a6a'],
  ['Morango', 'Strawberry', 4, '#c8143a', '#ff6a8a', '#fff0d8'], ['Bronze', 'Bronze', 2, '#3a2206', '#8a5a2a', '#d8a06a'],
  ['Tabuleiro', 'Gameboard', 3, '#e9e4d8', '#141210', '#d8322a'], ['Cristal', 'Crystal', 6, '#c8e8ff', '#e8f6ff', '#5aa0ff'],
  ['Oliva', 'Olive', 5, '#3a3a14', '#6a6a2a', '#a8a86a'], ['Tigre Branco', 'White Tiger', 0, '#f4f0e6', '#141210', '#7a766e'],
  ['Fumaça', 'Smoke', 1, '#3a3a3e', '#6a6a70', '#b0b0b8'], ['Néon Rosa', 'Pink Neon', 7, '#1a0214', '#c8128f', '#ff8ae0'],
  ['Pitanga', 'Pitanga', 4, '#8a0a06', '#e8321a', '#ffd23f'], ['Ametista', 'Amethyst', 2, '#1a0a2a', '#6a3aa0', '#d8b0ff'],
  ['Quadriculado', 'Gingham', 3, '#f4f0e6', '#4a7ac8', '#a8c8f0'], ['Faísca', 'Spark', 6, '#0a0a0a', '#3a2a06', '#ffe03a'],
  ['Mar Morto', 'Dead Sea', 5, '#a8b8a0', '#6a8a7a', '#e8f0e6'], ['Zebra Rosa', 'Pink Zebra', 0, '#ffd0e8', '#3a0a2a', '#ff6ab0'],
  ['Gosma Verde', 'Green Goo', 1, '#1a2a06', '#4a6a0a', '#c8ff3a'], ['Projeção', 'Projection', 7, '#0a1420', '#3affd8', '#ff3ac8'],
  ['Biscoito', 'Cookie', 4, '#c8964a', '#6a3a14', '#f4dcb0'], ['Safira', 'Sapphire', 2, '#020a2a', '#0a3a8a', '#6ab0ff'],
  ['Circo de Pulgas', 'Flea Circus', 3, '#a3201a', '#f4f0e6', '#2f5b8a'], ['Eclipse Solar', 'Solar Eclipse', 6, '#050402', '#3a2a06', '#ffb21a'],
  ['Tapete Persa', 'Persian Rug', 2, '#4a0a14', '#a8301a', '#e8b84a'], ['Chuva Ácida', 'Acid Rain', 5, '#0a1a06', '#3a6a0a', '#d8ff4a'],
];
// bonus + onus que se equilibram (12 perfis); as 2 variantes de um modelo nunca pegam o mesmo
const ARCH = [
  { id: 'pancada', mods: { dmg: 1.06, rate: 1.06 } },  { id: 'metralha', mods: { rate: 0.94, dmg: 0.95 } },
  { id: 'ligeira', mods: { move: 1.05, kick: 1.1 } },  { id: 'firme', mods: { kick: 0.88, rate: 1.05 } },
  { id: 'certeira', mods: { spread: 0.88, adsTime: 1.08 } }, { id: 'gatilho', mods: { adsTime: 0.88, spread: 1.1 } },
  { id: 'fundo', mods: { mag: 1.15, reload: 1.12 } },  { id: 'troca', mods: { reload: 0.86, mag: 0.9 } },
  { id: 'pesada', mods: { dmg: 1.04, move: 0.95 } },   { id: 'pena', mods: { move: 1.04, dmg: 0.96 } },
  { id: 'estavel', mods: { kick: 0.9, adsTime: 1.06 } }, { id: 'fina', mods: { spread: 0.9, reload: 1.08 } },
];
// raridade -> preco da vitrine em Zions Points (15 a 30 mil) e peso no bau (o comum sai mais)
export const BM_RARITY = { comum: { zp: 15000, w: 34 }, incomum: { zp: 18500, w: 27 }, raro: { zp: 22000, w: 20 }, epico: { zp: 26000, w: 13 }, lendario: { zp: 30000, w: 6 } };
const RAR = ['comum', 'incomum', 'raro', 'epico', 'lendario'];
export const BM_CHEST = { zp: 7500, loot: [500, 1500], pieceZp: 1000 }; // bau comprado; peca repetida = espolio sorteado nessa faixa
// 08/11 (decisao dele): comprou na vitrine uma variante da qual ja tinha pecas = cada peca guardada vira pieceZp Zions Points
export const bmRefund = (pecas, id) => (pecas?.[id] || []).filter(Boolean).length * BM_CHEST.pieceZp;
export const BM_PIECES = 5; // pecas que fecham uma variante
// peca no fim da partida: chance por partida valida (servidor) + protecao contra azar (garantida depois de N sem)
export const BM_DROP = { chance: 0.08, pity: 15, minGapMs: 4 * 60_000 };

// buff de quem vem com pente curto (gira entre as variantes): recarga, mira, passo ou cadencia (rate < 1 = mais rapido)
const SMALL_BUFF = [['reload', 0.86], ['adsTime', 0.9], ['move', 1.04], ['rate', 0.95]];
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const BM_VARIANTS = {};
export const BM_CAMOS = [];
const USED = new Set();
BM_BODIES.forEach((body, i) => {
  for (const k of [0, 1]) {
    const n = i * 2 + k, T = THEMES[n], id = `bm_${body}_${k + 1}`, A = ARCH[(i * 5 + k * 7) % ARCH.length];
    const camo = `bmc_${n}`;
    // 08/11 (pedido dele: animadas, sem repetir, no estilo das camos de maestria dos CoD recentes): 60% anima (ver abaixo). O par
    // (desenho, movimento) nunca se repete nas 64 primeiras e a velocidade/direcao muda em todas; Raro pra cima ganha
    // efeito 3D em volta da arma (camofx.js). Movimentos: 0 fluxo pelo cano, 1 pulso de brilho, 2 faixa de luz varrendo,
    // 3 giro do desenho, 4 ondulacao, 5 celulas piscando, 6 deriva de cor, 7 linhas de varredura com contorno aceso
    // 08/11 (2a ordem dele): 40% ESTATICAS (n % 5 < 2: sem movimento, sem brilho e sem efeito 3D), 60% animadas
    const still = n % 5 < 2, rr = RAR[(n * 3 + i) % RAR.length]; let mv = -1;
    if (!still) { mv = (T[2] + Math.floor(n / 8) * 3) % 8; for (let k = 0; k < 8 && USED.has(T[2] * 8 + mv); k++) mv = (mv + 1) % 8; USED.add(T[2] * 8 + mv); } // no maximo 8 tentativas (antes travava a pagina num laco infinito) // par (desenho, movimento) nunca repete
    BM_CAMOS.push({ id: camo, code: 70, anim: !still, bm: true, p: [T[2], 1 + ((n * 37) % 9) / 6, ((n * 53) % 12) / 12 * Math.PI, still ? 0 : 1], m: [mv, still ? 0 : 0.6 + ((n * 29) % 7) / 6, (n % 2) ? 1 : -1, still ? 0 : 0.35 + ((n * 11) % 5) / 8], fx: !still && ['raro', 'epico', 'lendario'].includes(rr) ? ['stars', 'storm', 'flame', 'drip'][n % 4] : undefined, c: [hex(T[3]), hex(T[4]), hex(T[5])], css: [T[3], T[4], T[5]], pt: T[0], en: T[1] });
    // 08/11 (2a ordem dele): a variante vem MONTADA (mira, empunhadura, laser, bocal) e com pente maior ou menor.
    // As 2 do mesmo modelo: uma de pente grande, outra de pente curto (perfil que ja mexe no pente manda na direcao).
    // Pente grande = +balas, recarga mais lenta e passo um pouco mais pesado; pente curto = -balas e um buff (sempre troca).
    // O pente aparece montado (charger escolhido no cliente, src/arsenal.js bpLoadout) mas o numero vem DAQUI (sem somar 2x).
    const mag = A.mods.mag ? (A.mods.mag > 1 ? 'big' : 'small') : (k === 0 ? 'big' : 'small');
    const mods = { ...A.mods };
    if (!A.mods.mag) {
      if (mag === 'big') { mods.mag = 1.25; mods.reload = (mods.reload || 1) * 1.1; mods.move = (mods.move || 1) * 0.98; }
      else { mods.mag = 0.8; let j = 0; while (j < 3 && A.mods[SMALL_BUFF[(n + j) % SMALL_BUFF.length][0]]) j++; const [bk, bv] = SMALL_BUFF[(n + j) % SMALL_BUFF.length]; mods[bk] = bv; } // buff nunca num status que o perfil ja mexe (anulava o onus)
    }
    const cat = CAT(body), sniper = cat === 'sniper';
    // kit fixo (o cliente escolhe a peca concreta que CABE nesse modelo, sempre a mesma pelo seed): scope/handle/muzzle = usa ou nao
    const kit = { seed: n * 7 + i, scope: true, handle: cat !== 'pistol', muzzle: true, laser: ['laser_1', 'laser_2', 'light_1'][(n + i) % 3] }; // 08/11 (pedido dele): TODA variante vem com acessorios; a variedade vem da peca escolhida
    BM_VARIANTS[id] = { wpn: cat, bm: true, rar: RAR[(n * 3 + i) % RAR.length], pt: T[0], en: T[1], arch: A.id, mag, kit,
      lo: { body, camo, paint: T[3], accent: T[5], tracer: null }, mods };
  }
});
export const BM_IDS = Object.keys(BM_VARIANTS);
export const bmPrice = (id) => BM_RARITY[BM_VARIANTS[id]?.rar]?.zp;

// vitrine: 5 por dia, girando dentro do lote da semana (35 variantes por semana, sem repetir na semana).
// Dia/semana contados em BRT (UTC-3), segunda 26/10/2026 = semana 0 (a mesma dos eventos).
const DAY = 864e5, MONDAY0 = Date.UTC(2026, 9, 26, 3);
function shuffled(seed) { const a = [...BM_IDS]; let s = seed * 9301 + 49297; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function bmShowcase(now = Date.now()) {
  const d = Math.floor((now - MONDAY0) / DAY), week = Math.floor(d / 7), dow = ((d % 7) + 7) % 7;
  const ids = shuffled(week + 1).slice(dow * 5, dow * 5 + 5);
  return { ids, dayEnd: MONDAY0 + (d + 1) * DAY, weekEnd: MONDAY0 + (week + 1) * 7 * DAY, week, day: dow };
}
// sorteio do bau / do drop (o servidor chama com o que a pessoa ja tem). pecas: { id: [bool x5] }. owned: Set de ids
// Devolve { id, piece, dup } ; dup = ja tinha essa peca (vira espolio). Variante ja completa nunca e sorteada.
export function bmRoll(pecas, owned, rnd = Math.random) {
  const done = (id) => owned.has(id) || ((pecas[id] || []).filter(Boolean).length >= BM_PIECES);
  const pool = BM_IDS.filter(id => !done(id)), list = pool.length ? pool : BM_IDS; // tudo completo: qualquer uma (vira espolio)
  const tot = list.reduce((s, id) => s + BM_RARITY[BM_VARIANTS[id].rar].w, 0);
  let r = rnd() * tot, id = list[0];
  for (const x of list) { r -= BM_RARITY[BM_VARIANTS[x].rar].w; if (r < 0) { id = x; break; } }
  const piece = Math.floor(rnd() * BM_PIECES), have = (pecas[id] || [])[piece];
  return { id, piece, dup: !!have || owned.has(id) };
}
