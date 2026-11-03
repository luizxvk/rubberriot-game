// Catalogo e rodizio da loja (03/11). Fica no shared: o cliente desenha a vitrine e, quando a compra em Zions
// existir, o servidor confere item e preco por aqui (nunca confiar no preco que o cliente mandar).
// Regra (vault: monetizacao.md): so aparencia; o que esta na loja nao sai por desafio, XP nem Elite.

// precos em Zions Points (03/11, pedido dele): camo de arma 3k a 6k, skin do boneco 5k a 10k, pacote 8k a 12k.
// Item avulso: pela raridade dentro da faixa do tipo; pacote: preco proprio (price) dentro da faixa.
export const PRICE = {
  camo: { raro: 3000, epico: 4500, lendario: 6000 },
  skin: { raro: 5000, epico: 7500, lendario: 10000 },
  hat: { raro: 5000, epico: 7500, lendario: 7500 }, // chapeu = visual do boneco (faixa das skins, mais barato)
  bundle: { pacote: 10000 },
};
export const RANGE = { camo: [3000, 6000], skin: [5000, 10000], hat: [5000, 10000], bundle: [8000, 12000] };
export const RARITY = { raro: 1, epico: 1, lendario: 1, pacote: 1 }; // raridades validas (cor do cartao)
// Itens de verdade (03/11): give = o que libera ('camo:<id>' em src/camos.js com shop: true; 'skin:<id>' em
// shared/looks.js LOOKS.skin com shop: true). Nome: item de um so usa o nome da camo/skin; pacote usa si_/sid_ no i18n.
// feat = pode ir pro destaque da semana. Camos que eram de desafio/nivel e viraram so da Loja (pedido dele 03/11):
// aurora, plasma, gibi pop, brasa reativa, carbono, eter obscuro, aquario, fantasma, hipnose, tinta viva e lava.
export const SHOP_ITEMS = {
  // camuflagens animadas
  cAurora: { kind: 'camo', r: 'lendario', give: ['camo:aurora'], feat: 1 },
  cPlasma: { kind: 'camo', r: 'lendario', give: ['camo:plasma'], feat: 1 },
  cPopart: { kind: 'camo', r: 'lendario', give: ['camo:popart'], feat: 1 },
  cEmber: { kind: 'camo', r: 'lendario', give: ['camo:ember'], feat: 1 },
  cDarkaether: { kind: 'camo', r: 'epico', give: ['camo:darkaether'] },
  cLava: { kind: 'camo', r: 'epico', give: ['camo:lava'] },
  cCarbon: { kind: 'camo', r: 'raro', give: ['camo:carbon'] },
  cAquarium: { kind: 'camo', r: 'raro', give: ['camo:aquarium'] },
  cPhantom: { kind: 'camo', r: 'raro', give: ['camo:phantom'] },
  cHypno: { kind: 'camo', r: 'raro', give: ['camo:hypno'] },
  cInk: { kind: 'camo', r: 'raro', give: ['camo:ink'] },
  // skins animadas do personagem (temas que nao existem em camo nem efeito)
  sDragao: { kind: 'skin', r: 'lendario', give: ['skin:dragao'], feat: 1 },
  sHolograma: { kind: 'skin', r: 'lendario', give: ['skin:holograma'], feat: 1 },
  sTempestade: { kind: 'skin', r: 'epico', give: ['skin:tempestade'] },
  sDiscoteca: { kind: 'skin', r: 'epico', give: ['skin:discoteca'] },
  sMassinha: { kind: 'skin', r: 'raro', give: ['skin:massinha'] },
  sLapis: { kind: 'skin', r: 'raro', give: ['skin:lapis'] },
  sGiz: { kind: 'skin', r: 'raro', give: ['skin:giz'] },
  sPlanta: { kind: 'skin', r: 'raro', give: ['skin:planta'] },
  // chapeus da Loja (animados)
  hUfo: { kind: 'hat', r: 'lendario', give: ['hat:ufo'], feat: 1 },
  hNuvem: { kind: 'hat', r: 'lendario', give: ['hat:nuvem'] },
  hBolo: { kind: 'hat', r: 'raro', give: ['hat:bolo'] },
  hTubarao: { kind: 'hat', r: 'raro', give: ['hat:tubarao'] },
  // pacotes: skin + a camo que combina, mais barato que separado (8k a 12k)
  pDragao: { kind: 'bundle', r: 'pacote', give: ['skin:dragao', 'camo:lava'], price: 12000, feat: 1 },
  pTormenta: { kind: 'bundle', r: 'pacote', give: ['skin:tempestade', 'camo:darkaether'], price: 10000, feat: 1 },
  pAtelie: { kind: 'bundle', r: 'pacote', give: ['skin:massinha', 'camo:popart'], price: 8000, feat: 1 },
  // pacotes de 3 pecas (chapeu + skin + camo)
  pEspaco: { kind: 'bundle', r: 'pacote', give: ['hat:ufo', 'skin:holograma', 'camo:plasma'], price: 12000, feat: 1 },
  pFesta: { kind: 'bundle', r: 'pacote', give: ['hat:bolo', 'skin:discoteca', 'camo:hypno'], price: 11000, feat: 1 },
  pPraia: { kind: 'bundle', r: 'pacote', give: ['hat:tubarao', 'skin:planta', 'camo:aquarium'], price: 9000, feat: 1 },
};
export const shopPrice = (id) => { const it = SHOP_ITEMS[id]; return it ? it.price ?? PRICE[it.kind]?.[it.r] : undefined; };

const DAY = 86400000;
// sorteio fixo por dia/semana (igual pra todo mundo): embaralha com semente
function seeded(list, seed) {
  const a = [...list]; let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// vira a meia-noite UTC; a semana vira na segunda (1/1/1970 foi quinta: +3).
// Destaque = 1 lendario grande + 1 pacote largo + 2 pequenos; dia = 4 ofertas que nao repetem o destaque
export function shopRotation(now = Date.now()) {
  const day = Math.floor(now / DAY), week = Math.floor((day + 3) / 7);
  const ids = Object.keys(SHOP_ITEMS), feat = ids.filter(id => SHOP_ITEMS[id].feat);
  const hero = seeded(feat.filter(id => SHOP_ITEMS[id].r !== 'pacote'), week);
  const pack = seeded(feat.filter(id => SHOP_ITEMS[id].r === 'pacote'), week)[0];
  const rest = seeded(ids.filter(id => !SHOP_ITEMS[id].feat), week);
  const featured = [hero[0], pack, rest[0], rest[1]];
  const daily = seeded(ids.filter(id => !featured.includes(id) && SHOP_ITEMS[id].r !== 'pacote'), day).slice(0, 4);
  return { featured, daily, dayEnd: (day + 1) * DAY, weekEnd: ((week + 1) * 7 - 3) * DAY };
}
