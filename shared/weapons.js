// Arsenal da Vila Borracha. dmg por projetil; rate = segundos entre tiros.
export const WEAPONS = {
  pistol:  { name: 'Estalo',     slot: 1, dmg: 34, rate: 0.15, mag: 12, reserve: Infinity, reload: 1.0, spread: 0.012, auto: false, zoom: 1.25, kick: 0.035, range: 140, recoil: [[1, 0], [1, 0.2], [1, -0.2]] },
  smg:     { name: 'Matraca',    slot: 2, dmg: 21, rate: 0.068, mag: 32, reserve: 192, reload: 1.4, spread: 0.032, auto: true, zoom: 1.3, kick: 0.018, range: 140, recoil: [[1, 0.3], [0.9, -0.4], [1, 0.5], [0.8, -0.5], [1, 0.2], [0.9, -0.3]] },
  rifle:   { name: 'Trovao',     slot: 3, dmg: 34, rate: 0.1, mag: 30, reserve: 150, reload: 1.7, spread: 0.018, auto: true, zoom: 1.6, kick: 0.026, range: 260, recoil: [[1.2, 0], [1.1, 0.15], [1, 0.3], [0.9, 0.35], [0.8, 0.1], [0.8, -0.25], [0.8, -0.4], [0.7, -0.2]] },
  shotgun: { name: 'Bacamarte',  slot: 4, dmg: 17, pellets: 10, rate: 0.7, mag: 6, reserve: 36, reload: 1.9, spread: 0.085, auto: false, zoom: 1.2, kick: 0.11, range: 45, recoil: [[1, 0.1]] },
  minigun: { name: 'Moedor',     slot: 5, dmg: 16, rate: 0.045, mag: 140, reserve: 280, reload: 2.6, spread: 0.05, auto: true, zoom: 1, kick: 0.012, spin: 0.35, noAds: true, range: 200, recoil: [[0.6, 0.6], [0.6, -0.6], [0.7, 0.4], [0.6, -0.5]] },
  melee:   { name: 'Lamina', slot: 7, dmg: 150, rate: 0.7, mag: Infinity, reserve: Infinity, reload: 0, spread: 0, auto: false, zoom: 1, kick: 0.02, range: 2.6, melee: true, noAds: true, recoil: [[0, 0]] },
  sniper:  { name: 'Luneta',     slot: 6, dmg: 150, rate: 1.05, mag: 5, reserve: 25, reload: 2.1, spread: 0.04, adsSpread: 0, auto: false, zoom: 4, kick: 0.16, range: 400, recoil: [[1, 0.15]] },
};

// Escada de armas: modelos especificos, comeca na pistola, encurtada (estilo COD).
// Termina em duas laminas: machado e faca.
export const GUN_LADDER = [
  { wpn: 'pistol', body: 'pistol_1' }, { wpn: 'pistol', body: 'pistol_2' },
  { wpn: 'smg', body: 'subfusil_2' }, { wpn: 'smg', body: 'subfusil_5' }, { wpn: 'smg', body: 'subfusil_3' },
  { wpn: 'rifle', body: 'fusil_1' }, { wpn: 'rifle', body: 'fusil_2' }, { wpn: 'rifle', body: 'fusil_4' },
  { wpn: 'shotgun', body: 'shotgun_1' }, { wpn: 'smg', body: 'subfusil_6' }, { wpn: 'rifle', body: 'fusil_7' },
  { wpn: 'shotgun', body: 'shotgun_2' }, { wpn: 'sniper', body: 'sniper_1' }, { wpn: 'sniper', body: 'sniper_0' },
  { wpn: 'pistol', body: 'pistol_4' }, { wpn: 'pistol', body: 'pistol_3' },
  { wpn: 'melee', body: 'melee_14' }, { wpn: 'melee', body: 'melee_0' },
];
export const SPAWN_KIT = ['pistol', 'smg'];
export const PRIMARIES = ['smg', 'rifle', 'shotgun', 'sniper'];
export const BOT_HP = 80;

// granadas: G = fragmentacao, F = flash
export const NADES = {
  frag: { speed: 25, fuse: 2.0, radius: 6.5, dmg: 140 },
  flash: { speed: 26, fuse: 1.4, radius: 15 },
};

// sequencias de abates (cartoon): radar espiao, chuva de bigornas, dirigivel atirador
export const STREAKS = {
  uav: { kills: 3, time: 25 },
  anvil: { kills: 5 },
  blimp: { kills: 7, time: 22, dmg: 24 },
};

export const MODES = {
  ffa:      { name: 'Contra Todos',      teams: false, limit: 20,  desc: 'Cada um por si. Quem chegar a 20 nocautes leva.' },
  tdm:      { name: 'Mata-Mata',         teams: true,  limit: 40,  desc: 'Vermelhos contra azuis. 40 nocautes do time vencem.' },
  gungame:  { name: 'Escada de Armas',   teams: false, limit: GUN_LADDER.length, desc: 'Cada nocaute troca sua arma, da pistola ao canhao de mao.' },
  ctf:      { name: 'Captura a Bandeira', teams: true, limit: 3,   desc: 'Roube a bandeira deles e traga pra sua base. 3 capturas.' },
  dom:      { name: 'Dominacao',         teams: true,  limit: 150, desc: 'Segure os pontos A, B e C. Cada ponto rende pontos por segundo.' },
};

// Perfil de cada modelo (corpo): modo de tiro e o que muda em relacao a arma base.
// mode: auto | semi | burst (burst = quantos tiros por puxada). rate > 1 = mais lento; hip < 1 = quadril melhor.
export const BODY_TRAITS = {
  pistol_1: { mode: 'semi' },
  pistol_2: { mode: 'auto', rate: 0.5, dmg: 0.62, kick: 0.7, hip: 0.9 },          // pistola automatica
  pistol_3: { mode: 'semi', rate: 2.1, dmg: 1.8, kick: 2.2, hip: 1.2 },           // canhao de mao
  pistol_4: { mode: 'burst', burst: 3, rate: 0.55, dmg: 0.8 },
  pistol_5: { mode: 'semi', rate: 1.4, dmg: 1.4, spread: 0.6, hip: 1.3 },         // cano longo, mira de longe
  pistol_6: { mode: 'auto', rate: 0.62, dmg: 0.7, hip: 0.8, kick: 0.85 },         // compacta de quadril
  subfusil_1: { mode: 'auto' },
  subfusil_2: { mode: 'auto', rate: 0.82, dmg: 0.86, kick: 1.1 },
  subfusil_3: { mode: 'burst', burst: 3, rate: 0.8, dmg: 1.1, hip: 1.1 },
  subfusil_4: { mode: 'auto', rate: 1.22, dmg: 1.2, kick: 1.15, hip: 1.1 },
  subfusil_5: { mode: 'auto', rate: 0.72, dmg: 0.82, kick: 1.3 },                 // cospe bala
  subfusil_6: { mode: 'auto', hip: 0.72, spread: 1.15 },                          // de quadril
  subfusil_7: { mode: 'auto', rate: 0.9, hip: 0.9 },
  subfusil_8: { mode: 'burst', burst: 2, rate: 0.7, dmg: 1.15 },
  subfusil_9: { mode: 'auto', rate: 1.1, dmg: 1.05, kick: 0.85, hip: 1.05 },
  subfusil_10: { mode: 'semi', rate: 1.6, dmg: 1.55, spread: 0.7, hip: 1.2 },
  fusil_1: { mode: 'auto' },
  fusil_2: { mode: 'burst', burst: 3, rate: 0.6, dmg: 1.05, kick: 0.9 },
  fusil_3: { mode: 'semi', rate: 2.4, dmg: 1.7, spread: 0.5, hip: 1.4, kick: 1.4 }, // de precisao
  fusil_4: { mode: 'auto', rate: 1.3, dmg: 1.25, kick: 1.25, hip: 1.15 },
  fusil_5: { mode: 'auto', rate: 0.85, dmg: 0.9, hip: 0.85 },
  fusil_6: { mode: 'burst', burst: 4, rate: 0.55, dmg: 0.85 },
  fusil_7: { mode: 'semi', rate: 1.7, dmg: 1.45, spread: 0.65, hip: 1.25 },
  shotgun_1: { mode: 'semi' },                                                     // bomba
  shotgun_2: { mode: 'semi', rate: 0.55, dmg: 0.82, kick: 0.85 },                  // semiautomatica
  sniper_0: { mode: 'bolt' },                                                     // ferrolho
  sniper_1: { mode: 'semi', rate: 0.5, dmg: 0.62, kick: 0.7 },                    // semiauto, nao mata de 1
  sniper_2: { mode: 'bolt', rate: 1.3, dmg: 1.25, kick: 1.3 },                   // ferrolho pesado
};
// laminas: faca rapida e curta, machado/espada lento e com mais alcance (1 golpe sempre derruba)
const ML = [[0.6, 2.4], [1.0, 3.0], [0.55, 2.3], [1.15, 3.3], [1.05, 3.0], [0.62, 2.5], [0.95, 2.9], [0.85, 3.0], [0.55, 2.3], [1.0, 2.9], [0.5, 2.2], [1.0, 3.0], [0.9, 3.2], [0.95, 2.9], [1.0, 3.0]];
ML.forEach(([rate, range], i) => { BODY_TRAITS['melee_' + i] = { mode: 'semi', rate: rate / 0.7, range }; });
export const bodyTrait = (body) => BODY_TRAITS[body] || {};
