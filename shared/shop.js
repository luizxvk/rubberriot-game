// Catalogo e rodizio da loja (03/11). Fica no shared: o cliente desenha a vitrine e, quando a compra em Zions
// existir, o servidor confere item e preco por aqui (nunca confiar no preco que o cliente mandar).
// Regra (vault: monetizacao.md): so aparencia; o que esta na loja nao sai por desafio, XP nem Elite.

// precos em Zions Points. 04/11 (pedido dele): tudo dividido por 10. 1.000 Zions custam R$ 24,90, entao um item bom sai por
// R$ 10 a R$ 25 (antes um pacote de 12 mil valia uns R$ 240 e ninguem pagaria). Camo 300 a 600, skin 500 a 1.000, pacote 800 a 1.200.
// Item avulso: pela raridade dentro da faixa do tipo; pacote: preco proprio (price) dentro da faixa.
// skin de modelo (04/11): troca o desenho de uma arma; faixa das skins de arma mais caras (pacote de modelos)
// 05/11 (pedido dele: "ta muito barato"): tudo em dobro. Futuristic Weapon Pack: 10 mil, faixa propria (wpack)
export const PRICE = {
  camo: { raro: 600, epico: 900, lendario: 1200 },
  skin: { raro: 1000, epico: 1500, lendario: 2000 },
  hat: { raro: 1000, epico: 1500, lendario: 1500 }, // chapeu = visual do boneco (faixa das skins, mais barato)
  bundle: { pacote: 2000 },
  wskin: { lendario: 1800 },
  dance: { epico: 900, lendario: 1600 }, banner: { lendario: 1000 }, charm: { raro: 500 }, face: { raro: 600, lendario: 900 }, death: { lendario: 1400 }, // dança pro podio (05/11): com efeito e mortal sao as mais caras
  ret: { raro: 300, epico: 500 }, // reticula de mira (04/11): a coisa mais barata da Loja
  stamp: { raro: 400, epico: 700 }, // estampa de pintura (09/11): entre a reticula e a camo
};
export const RANGE = { stamp: [300, 900], wpack: [8000, 12000], camo: [600, 1200], skin: [1000, 2000], hat: [1000, 2000], bundle: [1600, 2400], wskin: [1200, 2400], ret: [200, 600], dance: [800, 2000], banner: [800, 1400], charm: [400, 700], face: [500, 900], death: [1000, 1800] };
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
  cEmber: { kind: 'camo', r: 'lendario', give: ['camo:ember'], feat: 1, react: 1 },
  cDarkaether: { kind: 'camo', r: 'epico', give: ['camo:darkaether'] },
  cLava: { kind: 'camo', r: 'epico', give: ['camo:lava'] },
  cCarbon: { kind: 'camo', r: 'raro', give: ['camo:carbon'] },
  cAquarium: { kind: 'camo', r: 'raro', give: ['camo:aquarium'] },
  cPhantom: { kind: 'camo', r: 'raro', give: ['camo:phantom'] },
  cHypno: { kind: 'camo', r: 'raro', give: ['camo:hypno'] },
  cInk: { kind: 'camo', r: 'raro', give: ['camo:ink'] },
  // leva de 04/11 (pedido dele: "ainda tem pouca coisa"). react = sobe de estagio com os abates
  cOilslick: { kind: 'camo', r: 'epico', give: ['camo:oilslick'] },
  cVinyl: { kind: 'camo', r: 'epico', give: ['camo:vinyl'] },
  cTvstatic: { kind: 'camo', r: 'raro', give: ['camo:tvstatic'] },
  cHoney: { kind: 'camo', r: 'raro', give: ['camo:honey'] },
  cConfetti: { kind: 'camo', r: 'raro', give: ['camo:confetti'] },
  cFrost: { kind: 'camo', r: 'lendario', give: ['camo:frost'], feat: 1, react: 1 },
  cStormcell: { kind: 'camo', r: 'lendario', give: ['camo:stormcell'], feat: 1, react: 1 },
  cIvy: { kind: 'camo', r: 'epico', give: ['camo:ivy'], react: 1 },
  // leva de 09/11: animadas com relevo
  cMercurio: { kind: 'camo', r: 'lendario', give: ['camo:mercurio'], feat: 1 }, cFerrofluido: { kind: 'camo', r: 'lendario', give: ['camo:ferrofluido'], feat: 1 }, cCouraca: { kind: 'camo', r: 'epico', give: ['camo:couraca'] }, cGeodo: { kind: 'camo', r: 'epico', give: ['camo:geodo'] },
  cRelojoaria: { kind: 'camo', r: 'lendario', give: ['camo:relojoaria'], feat: 1 }, cMadreperola: { kind: 'camo', r: 'raro', give: ['camo:madreperola'] }, cAbissal: { kind: 'camo', r: 'epico', give: ['camo:abissal'] }, cCotamalha: { kind: 'camo', r: 'raro', give: ['camo:cotamalha'] },
  // skins animadas do personagem (temas que nao existem em camo nem efeito)
  sDragao: { kind: 'skin', r: 'lendario', give: ['skin:dragao'], feat: 1 },
  sHolograma: { kind: 'skin', r: 'lendario', give: ['skin:holograma'], feat: 1 },
  sTempestade: { kind: 'skin', r: 'epico', give: ['skin:tempestade'] },
  sDiscoteca: { kind: 'skin', r: 'epico', give: ['skin:discoteca'] },
  sMassinha: { kind: 'skin', r: 'raro', give: ['skin:massinha'] },
  sLapis: { kind: 'skin', r: 'raro', give: ['skin:lapis'] },
  sGiz: { kind: 'skin', r: 'raro', give: ['skin:giz'] },
  sPlanta: { kind: 'skin', r: 'raro', give: ['skin:planta'] },
  sAquarela: { kind: 'skin', r: 'epico', give: ['skin:aquarela'] },
  sPixel: { kind: 'skin', r: 'epico', give: ['skin:pixel'] },
  sPapelao: { kind: 'skin', r: 'raro', give: ['skin:papelao'] },
  sTrico: { kind: 'skin', r: 'raro', give: ['skin:trico'] },
  // leva de 09/11 (pedido dele): espaciais, caveiras, abstratas, digitais e animadas, com pecas 3D
  sBuracoNegro: { kind: 'skin', r: 'lendario', give: ['skin:buraconegro'], feat: 1 }, sLunar: { kind: 'skin', r: 'raro', give: ['skin:lunar'] },
  sOssario: { kind: 'skin', r: 'epico', give: ['skin:ossario'] }, sCaveiraNeon: { kind: 'skin', r: 'lendario', give: ['skin:caveiraneon'], feat: 1 },
  sOpArt: { kind: 'skin', r: 'raro', give: ['skin:opart'] }, sVitral: { kind: 'skin', r: 'epico', give: ['skin:vitral'] },
  sCircuito: { kind: 'skin', r: 'raro', give: ['skin:circuito'] },
  sLavaLamp: { kind: 'skin', r: 'raro', give: ['skin:lavalamp'] }, sVinil: { kind: 'skin', r: 'raro', give: ['skin:vinil'] },
  // chapeus da Loja (animados)
  hUfo: { kind: 'hat', r: 'lendario', give: ['hat:ufo'], feat: 1 },
  hNuvem: { kind: 'hat', r: 'lendario', give: ['hat:nuvem'] },
  hBolo: { kind: 'hat', r: 'raro', give: ['hat:bolo'] },
  hTubarao: { kind: 'hat', r: 'raro', give: ['hat:tubarao'] },
  hAlavanca: { kind: 'hat', r: 'epico', give: ['hat:alavanca'] },
  hSorvete: { kind: 'hat', r: 'raro', give: ['hat:sorvete'] },
  hCogumelo: { kind: 'hat', r: 'raro', give: ['hat:cogumelo'] },
  // reticulas (04/11, pedido dele): militares (raro) e comicas (epico)
  rHorseshoe: { kind: 'ret', r: 'raro', give: ['ret:horseshoe'] }, rAcog: { kind: 'ret', r: 'raro', give: ['ret:acog'] }, rGerman: { kind: 'ret', r: 'raro', give: ['ret:german'] }, rTriangle: { kind: 'ret', r: 'raro', give: ['ret:triangle'] }, rBrackets: { kind: 'ret', r: 'raro', give: ['ret:brackets'] },
  rStar: { kind: 'ret', r: 'epico', give: ['ret:star'] }, rHeart: { kind: 'ret', r: 'epico', give: ['ret:heart'] }, rSmile: { kind: 'ret', r: 'epico', give: ['ret:smile'] }, rSkull: { kind: 'ret', r: 'epico', give: ['ret:skull'] }, rBolt: { kind: 'ret', r: 'epico', give: ['ret:bolt'] },
  rDiamond: { kind: 'ret', r: 'raro', give: ['ret:diamond'] }, rRadar: { kind: 'ret', r: 'raro', give: ['ret:radar'] }, rWings: { kind: 'ret', r: 'raro', give: ['ret:wings'] }, rLadder: { kind: 'ret', r: 'raro', give: ['ret:ladder'] }, rArtillery: { kind: 'ret', r: 'raro', give: ['ret:artillery'] },
  rSpiral: { kind: 'ret', r: 'epico', give: ['ret:spiral'] }, rCrown: { kind: 'ret', r: 'epico', give: ['ret:crown'] }, rEye: { kind: 'ret', r: 'epico', give: ['ret:eye'] }, rClover: { kind: 'ret', r: 'epico', give: ['ret:clover'] }, rMoon: { kind: 'ret', r: 'epico', give: ['ret:moon'] },
  // reticulas de luneta (05/11, pedido dele): mesma quantidade das outras
  sFio: { kind: 'ret', r: 'raro', give: ['ret:sn_fio'] }, sPoste: { kind: 'ret', r: 'raro', give: ['ret:sn_poste'] }, sTelemetro: { kind: 'ret', r: 'raro', give: ['ret:sn_telemetro'] }, sQueda: { kind: 'ret', r: 'raro', give: ['ret:sn_queda'] }, sCirculo: { kind: 'ret', r: 'raro', give: ['ret:sn_circulo'] }, sHalo: { kind: 'ret', r: 'raro', give: ['ret:sn_halo'] }, sTatica: { kind: 'ret', r: 'raro', give: ['ret:sn_tatica'] }, sSeta: { kind: 'ret', r: 'raro', give: ['ret:sn_seta'] }, sGrosso: { kind: 'ret', r: 'raro', give: ['ret:sn_grosso'] }, sQuatro: { kind: 'ret', r: 'raro', give: ['ret:sn_quatro'] }, sCanto: { kind: 'ret', r: 'raro', give: ['ret:sn_canto'] }, sGrade: { kind: 'ret', r: 'raro', give: ['ret:sn_grade'] },
  sLua: { kind: 'ret', r: 'epico', give: ['ret:sn_lua'] }, sAlvo: { kind: 'ret', r: 'epico', give: ['ret:sn_alvo'] }, sFlecha: { kind: 'ret', r: 'epico', give: ['ret:sn_flecha'] }, sTres: { kind: 'ret', r: 'epico', give: ['ret:sn_tres'] }, sBang: { kind: 'ret', r: 'epico', give: ['ret:sn_bang'] }, sCaveira: { kind: 'ret', r: 'epico', give: ['ret:sn_caveira'] }, sCoracao: { kind: 'ret', r: 'epico', give: ['ret:sn_coracao'] }, sOlho: { kind: 'ret', r: 'epico', give: ['ret:sn_olho'] },
  // danças (05/11, pedido dele): cambalhota, TikTok e as com efeito, so na Loja
  dCambalhota: { kind: 'dance', r: 'lendario', give: ['dance:cambalhota'], feat: 1 }, dMortal: { kind: 'dance', r: 'lendario', give: ['dance:mortal'] },
  dOmbrinho: { kind: 'dance', r: 'epico', give: ['dance:ombrinho'] }, dPassinho: { kind: 'dance', r: 'epico', give: ['dance:passinho'] }, dCruzadinha: { kind: 'dance', r: 'epico', give: ['dance:cruzadinha'] }, dFiodental: { kind: 'dance', r: 'epico', give: ['dance:fiodental'] }, dAponta: { kind: 'dance', r: 'epico', give: ['dance:aponta'] },
  dCospefogo: { kind: 'dance', r: 'lendario', give: ['dance:cospefogo'], feat: 1 }, dCoracao: { kind: 'dance', r: 'lendario', give: ['dance:coracao'], feat: 1 }, dRaio: { kind: 'dance', r: 'lendario', give: ['dance:raio'], feat: 1 },
  // leva de 05/11: banners animados premium, chaveiros do Tripo, rosto e morte
  bCortina: { kind: 'banner', r: 'lendario', give: ['banner:cortina'] }, bHolofote: { kind: 'banner', r: 'lendario', give: ['banner:holofote'] }, bCarrossel: { kind: 'banner', r: 'lendario', give: ['banner:carrossel'] }, bVitrola: { kind: 'banner', r: 'lendario', give: ['banner:vitrola'] }, bFoguete: { kind: 'banner', r: 'lendario', give: ['banner:foguete'] }, bZepelim: { kind: 'banner', r: 'lendario', give: ['banner:zepelim'] },
  kDado: { kind: 'charm', r: 'raro', give: ['charm:dado'] }, kPato: { kind: 'charm', r: 'raro', give: ['charm:pato'] },
  fGargalhada: { kind: 'face', r: 'raro', give: ['face:gargalhada'] }, fLingua: { kind: 'face', r: 'raro', give: ['face:lingua'] }, fFantasma: { kind: 'face', r: 'lendario', give: ['face:fantasma'] }, fBandido: { kind: 'face', r: 'raro', give: ['face:bandido'] }, fMocinho: { kind: 'face', r: 'raro', give: ['face:mocinho'] }, fPalhaco: { kind: 'face', r: 'raro', give: ['face:palhaco'] }, fGas: { kind: 'face', r: 'lendario', give: ['face:gas'] }, fLuchador: { kind: 'face', r: 'lendario', give: ['face:luchador'] }, mBalao: { kind: 'death', r: 'lendario', give: ['death:balao'] }, mMola: { kind: 'death', r: 'lendario', give: ['death:mola'] },
  // estampas de pintura (09/11, pedido dele): abstratas e radiais, valem na Pintura e no Destaque
  eAgulhas: { kind: 'stamp', r: 'raro', give: ['stamp:agulhas'] }, eGota: { kind: 'stamp', r: 'raro', give: ['stamp:gota'] }, eRosacea: { kind: 'stamp', r: 'raro', give: ['stamp:rosacea'] }, eDardos: { kind: 'stamp', r: 'raro', give: ['stamp:dardos'] }, eTabuleiro: { kind: 'stamp', r: 'raro', give: ['stamp:tabuleiro'] }, eXadrez: { kind: 'stamp', r: 'raro', give: ['stamp:xadrez'] }, eBandeirolas: { kind: 'stamp', r: 'raro', give: ['stamp:bandeirolas'] }, ePinceladas: { kind: 'stamp', r: 'raro', give: ['stamp:pinceladas'] },
  eEstouro: { kind: 'stamp', r: 'epico', give: ['stamp:estouro'] }, eRedemoinho: { kind: 'stamp', r: 'epico', give: ['stamp:redemoinho'] }, eCarrossel: { kind: 'stamp', r: 'epico', give: ['stamp:carrossel'] }, eSolpartido: { kind: 'stamp', r: 'epico', give: ['stamp:solpartido'] }, eCacos: { kind: 'stamp', r: 'epico', give: ['stamp:cacos'] }, eLabirinto: { kind: 'stamp', r: 'epico', give: ['stamp:labirinto'] },
  // pacotes: skin + a camo que combina, mais barato que separado (8k a 12k)
  pDragao: { kind: 'bundle', r: 'pacote', give: ['skin:dragao', 'camo:lava'], price: 2400, feat: 1 },
  pTormenta: { kind: 'bundle', r: 'pacote', give: ['skin:tempestade', 'camo:darkaether'], price: 2000, feat: 1 },
  pAtelie: { kind: 'bundle', r: 'pacote', give: ['skin:massinha', 'camo:popart'], price: 1600, feat: 1 },
  // pacotes de 3 pecas (chapeu + skin + camo)
  pEspaco: { kind: 'bundle', r: 'pacote', give: ['hat:ufo', 'skin:holograma', 'camo:plasma'], price: 2400, feat: 1 },
  pFesta: { kind: 'bundle', r: 'pacote', give: ['hat:bolo', 'skin:discoteca', 'camo:hypno'], price: 2200, feat: 1 },
  pPraia: { kind: 'bundle', r: 'pacote', give: ['hat:tubarao', 'skin:planta', 'camo:aquarium'], price: 1800, feat: 1 },
  // leva de 04/11: pacotes com as pecas novas (sempre mais barato que separado)
  pGelo: { kind: 'bundle', r: 'pacote', give: ['skin:aquarela', 'camo:frost'], price: 2200, feat: 1 },
  pTrovao: { kind: 'bundle', r: 'pacote', give: ['skin:tempestade', 'camo:stormcell'], price: 2400, feat: 1 },
  pArcade: { kind: 'bundle', r: 'pacote', give: ['hat:alavanca', 'skin:pixel', 'camo:tvstatic'], price: 2400, feat: 1 },
  pFloresta: { kind: 'bundle', r: 'pacote', give: ['hat:cogumelo', 'skin:planta', 'camo:ivy'], price: 2200, feat: 1 },
  pDoceria: { kind: 'bundle', r: 'pacote', give: ['hat:sorvete', 'skin:trico', 'camo:honey'], price: 1800, feat: 1 },
  pGaragem: { kind: 'bundle', r: 'pacote', give: ['skin:papelao', 'camo:vinyl'], price: 1600, feat: 1 },
  // Futuristic Weapon Pack (04/11): as duas skins de modelo juntas (so vende o pack); Agulha e Relampago futuristas
  // elite: 1 (05/11, pedido dele): quem assina o Elite resgata de graca (POST /loja/resgatar); e a unica excecao a regra de cima
  pFuturo: { kind: 'bundle', r: 'pacote', give: ['wskin:pulse', 'wskin:fiction'], price: 10000, feat: 1, weapon: 1, elite: 1, until: Date.UTC(2026, 10, 16) }, // lancamento: pacote da semana fixo ate 16/11 (segunda)
};
// Zions Points ganhos jogando (04/11, pedido dele): vitoria e desafio pagam, derrota paga bem menos. A partida solo roda no
// navegador e o servidor nao tem como conferir o resultado: por isso o cliente so conta o que houve e o SERVIDOR decide o
// valor, com intervalo minimo no relogio dele, teto por dia e desafio pago uma vez so.
// 04/11 (pedido dele): teto de 600 pra 150 por dia. Grátis demais competia com a venda; com a Loja nova um pacote leva ~8 dias jogando
// 08/11 (pedido dele): missoes diarias (5 por dia) pagam ZP.mission cada, FORA do teto do dia (o teto segue so pra partida e desafios)
export const ZP = { win: 40, lose: 8, daily: 20, elite: 60, unlock: 40, mission: 60, dayCap: 150, gapMs: 90000, chDay: { daily: 3, elite: 1, unlock: 3, mission: 5 } };
// st = o que ja pagou hoje { n, last, ch }; claim = { won, ch: [{ k, id }] }. Funcao pura: devolve o estado novo e as linhas pagas
export function zpCredit(st, claim, now) {
  const s = { n: Math.max(0, Number(st?.n) || 0), last: Number(st?.last) || 0, ch: Array.isArray(st?.ch) ? [...st.ch] : [] }, want = [];
  if (now - s.last >= ZP.gapMs) { want.push({ k: claim?.won === true ? 'win' : 'lose' }); s.last = now; }
  for (const c of (Array.isArray(claim?.ch) ? claim.ch : []).slice(0, 8)) {
    const k = c?.k, id = typeof c?.id === 'string' ? c.id.slice(0, 40) : '';
    if (!id || !Object.hasOwn(ZP.chDay, k)) continue;
    const key = k + ':' + id;
    if (s.ch.includes(key) || s.ch.filter(x => x.startsWith(k + ':')).length >= ZP.chDay[k]) continue;
    s.ch.push(key); want.push({ k });
  }
  let room = Math.max(0, ZP.dayCap - s.n), total = 0, capped = false;
  const lines = [];
  let free = 0;
  for (const { k } of want) { if (k === 'mission') { lines.push({ k, n: ZP.mission }); total += ZP.mission; free += ZP.mission; continue; } const n = Math.min(ZP[k], room); if (n < ZP[k]) capped = true; if (n > 0) { lines.push({ k, n }); room -= n; total += n; } }
  s.n += total - free; // missao nao gasta o teto
  return { state: s, lines, total, capped };
}
export const shopPrice = (id) => { const it = SHOP_ITEMS[id]; return it ? it.price ?? PRICE[it.kind]?.[it.r] : undefined; };

const DAY = 86400000;
// sorteio fixo por dia/semana (igual pra todo mundo): embaralha com semente
function seeded(list, seed) {
  const a = [...list]; let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor(s / 233280 * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// vira a meia-noite UTC; a semana vira na segunda (1/1/1970 foi quinta: +3).
// Destaque = 1 lendario grande + 1 pacote largo + 2 pequenos; dia = 8 ofertas que nao repetem o destaque.
// Prateleiras (04/11): o resto do catalogo por tipo, sorteado na semana, sem repetir o que ja esta em cima.
// O rodizio e so vitrine: a compra confere o catalogo, nao o rodizio.
export const SHELVES = [['dance', 4], ['banner', 3], ['charm', 2], ['death', 2], ['face', 2], ['bundle', 4], ['react', 4], ['camo', 8], ['skin', 4], ['hat', 4], ['stamp', 6], ['ret', 8]];
// ofertas do dia (09/11, pedido dele): 15% off. O servidor cobra por aqui
export const DEAL_OFF = 0.15;
let dealMemo = { end: 0, ids: new Set() };
export function isDeal(id, now = Date.now()) { if (now >= dealMemo.end) { const R = shopRotation(now); dealMemo = { end: R.dayEnd, ids: new Set(R.daily) }; } return dealMemo.ids.has(id); }
export const dealPrice = (id, now = Date.now()) => { const p = shopPrice(id); return p != null && isDeal(id, now) ? Math.round(p * (1 - DEAL_OFF) / 5) * 5 : p; };
export const shelfOf = (id) => (SHOP_ITEMS[id].react ? 'react' : SHOP_ITEMS[id].kind);
export function shopRotation(now = Date.now()) {
  const day = Math.floor(now / DAY), week = Math.floor((day + 3) / 7);
  const ids = Object.keys(SHOP_ITEMS), feat = ids.filter(id => SHOP_ITEMS[id].feat);
  const hero = seeded(feat.filter(id => SHOP_ITEMS[id].r !== 'pacote'), week);
  const pack = feat.find(id => SHOP_ITEMS[id].r === 'pacote' && SHOP_ITEMS[id].until > now) || seeded(feat.filter(id => SHOP_ITEMS[id].r === 'pacote'), week)[0];
  const rest = seeded(ids.filter(id => !SHOP_ITEMS[id].feat), week);
  const featured = [hero[0], pack, rest[0], rest[1]];
  const daily = seeded(ids.filter(id => !featured.includes(id) && SHOP_ITEMS[id].r !== 'pacote' && !SHOP_ITEMS[id].react), day).slice(0, 8); // reativa fica na prateleira dela
  const used = new Set([...featured, ...daily]);
  const shelves = SHELVES.map(([k, n]) => ({ k, items: seeded(ids.filter(id => shelfOf(id) === k && !used.has(id)), week).slice(0, n) })).filter(s => s.items.length);
  return { featured, daily, shelves, dayEnd: (day + 1) * DAY, weekEnd: ((week + 1) * 7 - 3) * DAY };
}
