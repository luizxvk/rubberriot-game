// Noite dos Borroes (03/11): ficha de cada vilao e chefao. Dados puros (servidor e navegador).
// hp: vida na onda 1 (sobe por onda e por gente na sala); speed m/s; hit: dano do golpe; every: s entre golpes;
// reach: alcance do golpe; pts: pontos do abate; rad: largura do corpo pra parede;
// hb: caixa de acerto { r: raio, h: altura do corpo, head: altura do centro da cabeca/ponto fraco, hr: raio dela }
export const MOBS = {
  borrao:   { hp: 80,   speed: 4.4, hit: 12, every: 1.0, reach: 1.7, pts: 60,  rad: 0.7,  hb: { r: 0.6,  h: 1.25, head: 1.0,  hr: 0.38 } },
  rabisco:  { hp: 55,   speed: 7.0, hit: 9,  every: 0.7, reach: 1.6, pts: 70,  rad: 0.4,  hb: { r: 0.45, h: 1.45, head: 1.55, hr: 0.32 } },
  mola:     { hp: 70,   speed: 4.6, hit: 16, every: 1.1, reach: 1.8, pts: 80,  rad: 0.45, hb: { r: 0.55, h: 1.6,  head: 1.75, hr: 0.45 }, leap: [6, 15] },
  cuspidor: { hp: 60,   speed: 3.8, hit: 12, every: 2.6, reach: 18,  pts: 80,  rad: 0.45, hb: { r: 0.6,  h: 1.4,  head: 0.85, hr: 0.35 }, ranged: true, keep: [10, 15] },
  gordao:   { hp: 420,  speed: 2.5, hit: 28, every: 1.5, reach: 2.6, pts: 150, rad: 1.25, hb: { r: 1.1,  h: 2.4,  head: 1.65, hr: 0.6 }, puddle: 3.5 },
  cartola:  { hp: 320,  speed: 4.0, hit: 16, every: 1.1, reach: 1.9, pts: 250, rad: 0.45, hb: { r: 0.5,  h: 1.75, head: 1.95, hr: 0.35 }, aura: 10 },
  // chefoes: vida multiplicada por quem esta na sala; o ponto fraco e a "cabeca" (lente / olho)
  // rad = largura do DESENHO (medida 03/11): maior que 1,5 m nao passa nas portas de 3 m, entao chefao fica na sala do meio
  // e o desenho nao atravessa parede; hb acompanha a escala do MOB_SCALE
  projecionista: { hp: 2600, speed: 2.2, hit: 22, every: 1.6, reach: 3.5, pts: 1500, rad: 2.0, hb: { r: 1.2, h: 4.8, head: 4.1, hr: 0.56 }, boss: true },
  reiTinteiro:   { hp: 5200, speed: 1.6, hit: 40, every: 1.8, reach: 3.4, pts: 3000, rad: 2.3, hb: { r: 1.5, h: 2.6, head: 0.92, hr: 0.55 }, boss: true },
};
export const MOB_SCALE = { reiTinteiro: 0.42, projecionista: 0.8 }; // desenho medido: Rei 11 m de largura e 12 m de altura na escala 1 (passava parede e teto)

// regras da noite
export const BOR = {
  firstBreak: 10, breakT: 15, // s antes da onda 1 e entre ondas
  maxAlive: 14, trickle: 1.1, // no maximo 14 de pe (menos com time pequeno: 4 + 3 por pessoa); um novo a cada 1,1 s
  regen: { after: 4, rate: 25 }, // vida volta sozinha depois de 4 s sem levar dano (25/s)
  hitCash: 0.4, // pontos por dano causado num vilao (fora o abate)
  milk: 1500, milkCd: 20, // Maquina de Leite: vida cheia + colete
  box: { price: 950, spin: 3, laugh: 0.15, minUses: 4 }, // Caixa de Surpresas do Nanquim (Rascunho)
  // drops: chance por vilao caido, no maximo perWave por onda, somem em life s; dur = poderes com tempo
  drop: { chance: 0.045, perWave: 4, life: 25, r: 1.4, nukeCash: 400, dur: { dobro: 30, quadro: 10, lapis: 20 } },
  doorR: 2.6, buyR: 2.2, // distancia pra comprar porta / arma da parede
  spit: { speed: 15, slow: 0.55, puddleT: 4, puddleR: 1.6 },
  beam: { every: 7, warn: 1.3, range: 20, cone: 0.35, freeze: 2, dmg: 10 }, // facho do Projecionista
  slam: { every: 5.5, warn: 1.0, r: 9, dmg: 30 }, // pena no chao do Rei (fase 1)
  rain: { every: 1.4, dmg: 20, r: 2 }, summon: 10, // fase 2
  reel: { every: 6, speed: 11, dmg: 20, life: 3 }, // rolos de filme do Projecionista
};
