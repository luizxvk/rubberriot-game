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
// sala: no maximo 16 (gente + bots). Bots abrem vaga pra quem chega; sala com 16 pessoas recusa.
export const MAX_PLAYERS = 16;
// plantar a bomba: cada lado aceita no maximo metade da sala em gente (bots completam o que faltar)
export const TEAM_MAX = MAX_PLAYERS / 2;

// granadas: G = fragmentacao, F = flash
export const NADES = {
  frag: { speed: 25, fuse: 2.0, radius: 6.5, dmg: 140 },
  flash: { speed: 26, fuse: 1.4, radius: 15 },
};

// sequencias de abates (cartoon): radar espiao, chuva de bigornas, dirigivel atirador e,
// com 15 sem cair, a Torta Atomica: avisa o outro time e depois de `delay` s derruba todo inimigo vivo
// Skills passivas: ate SKILL_SLOTS equipadas, cada uma abre num nivel do jogador (lvl).
// O servidor aplica as que mexem em dano e regra (couro, folego, bolso, pavio, cuca, pano); as de mao
// (maos, borracha, lince, mola, catador, sangue) o jogo aplica no proprio jogador.
// icon = Material Icons (desenho real, tingido no Arsenal).
export const SKILLS = {
  maos: { lvl: 3, reload: 0.75, swap: 0.7, icon: 'pan_tool' },             // recarrega e troca de arma mais rapido
  mola: { lvl: 4, jump: 1.3, icon: 'height' },                              // pula mais alto
  borracha: { lvl: 6, move: 1.08, icon: 'directions_run' },                 // anda e corre mais rapido
  catador: { lvl: 8, mags: 1, icon: 'backpack' },                           // cada abate devolve um pente na reserva
  lince: { lvl: 10, ads: 0.75, kick: 0.85, icon: 'visibility' },            // mira mais rapido, menos recuo
  sangue: { lvl: 12, below: 35, reload: 0.7, ads: 0.7, icon: 'ac_unit' },  // com pouca vida: recarrega e mira mais rapido
  bolso: { lvl: 14, nades: 1, reserve: 1.3, icon: 'inventory_2' },          // +1 granada de cada e mais municao reserva
  cuca: { lvl: 16, head: 1.25, icon: 'sports_motorsports' },               // cabecada em voce doi menos (1,6 -> 1,25)
  couro: { lvl: 18, blast: 0.7, icon: 'shield' },                           // menos dano de explosao
  pano: { lvl: 20, icon: 'do_not_step' },                                   // seus tiros nao chamam os bots
  folego: { lvl: 22, after: 4, regen: 8, icon: 'favorite' },                // vida volta sozinha depois de 4 s sem dano
  pavio: { lvl: 26, streak: 1, icon: 'local_fire_department' },             // sequencias custam 1 abate a menos
};
export const SKILL_SLOTS = 2;
export const BLAST = ['frag', 'anvil', 'blimp', 'bomb'];
export const hasSkill = (p, id) => !!p?.skills?.includes(id);

export const STREAKS = {
  uav: { kills: 3, time: 25 },
  anvil: { kills: 5 },
  blimp: { kills: 7, time: 22, dmg: 24 },
  nuke: { kills: 15, delay: 6 },
};

export const MODES = {
  ffa:      { name: 'Contra Todos',      teams: false, limit: 20,  desc: 'Cada um por si. Quem chegar a 20 nocautes leva.' },
  tdm:      { name: 'Mata-Mata',         teams: true,  limit: 40,  desc: 'Vermelhos contra azuis. 40 nocautes do time vencem.' },
  gungame:  { name: 'Escada de Armas',   teams: false, limit: GUN_LADDER.length, desc: 'Cada nocaute troca sua arma, da pistola ao canhao de mao.' },
  ctf:      { name: 'Captura a Bandeira', teams: true, limit: 3,   desc: 'Roube a bandeira deles e traga pra sua base. 3 capturas.' },
  dom:      { name: 'Dominacao',         teams: true,  limit: 150, desc: 'Segure os pontos A, B e C. Cada ponto rende pontos por segundo.' },
  // vermelho ataca (planta), azul defende (desarma); sem renascer na rodada; limit = rodadas pra vencer
  bomb:     { name: 'Plantar a Bomba',   teams: true,  limit: 4,   desc: 'Ataque planta a bomba no ponto A ou B, defesa desarma. Sem renascer na rodada.' },
  // azul = sobreviventes, vermelho = infectados (quem cai vira infectado)
  infect:   { name: 'Infectado',         teams: true,  limit: 0,   time: 300, desc: 'Um vira infectado. Quem ele pegar vira tambem. Sobreviva ate o fim do tempo.' },
};

// Infectado: sobrevivente sai com escopeta + pistola; infectado so com a lamina, mais rapido.
// survivorPrimaries: de onde sai o sorteio da partida (sniper fora). Todo sobrevivente leva a MESMA arma.
export const INFECT = { firstIn: 10, survivorKit: ['shotgun', 'pistol'], survivorPrimaries: ['smg', 'rifle', 'shotgun'], infectedRespawn: 1.2, speed: 1.15, hp: 100, surviveTick: 20 };

// Plantar a Bomba: tempos em segundos, raios em metros
export const BOMB = { round: 100, fuse: 35, plant: 3.2, defuse: 6, siteR: 3.4, defuseR: 1.9, blast: 9, roundEnd: 4.5, swapAfter: 3 };

// Pontaria dos bots por nivel (0.7 molenga, 1 esperto, 1.35 afiado).
// react: s ate atirar depois de ver; aim: acerto maximo por tiro depois de "esquentar";
// warm: s na mira ate chegar no maximo; rate: multiplica o intervalo entre tiros;
// burst/pause: rajada e respiro; turn: rad/s de giro; sight: m de visao; nades: usa granada.
export function botSkill(d) {
  if (d < 0.85) return { react: 0.95, aim: 0.36, warm: 2.4, rate: 2.3, burst: [2, 4], pause: [0.7, 1.4], turn: 2.6, sight: 32, nades: false, head: 0.03, strafe: 0.4 };
  if (d < 1.2) return { react: 0.5, aim: 0.56, warm: 1.4, rate: 1.6, burst: [3, 6], pause: [0.4, 0.9], turn: 4.5, sight: 46, nades: true, head: 0.08, strafe: 0.7 };
  return { react: 0.26, aim: 0.7, warm: 0.7, rate: 1.3, burst: [5, 9], pause: [0.2, 0.5], turn: 7, sight: 60, nades: true, head: 0.14, strafe: 0.9 };
}

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
  // pacote WW2
  fusil_9: { mode: 'auto', rate: 1.12, dmg: 1.1, kick: 1.15, hip: 1.05 },             // trovao de lata
  subfusil_11: { mode: 'auto', rate: 0.92, dmg: 1.05, kick: 1.1, hip: 0.95 },         // maquina de escrever
  subfusil_12: { mode: 'auto', rate: 0.7, dmg: 0.82, kick: 1.25, spread: 1.1 },       // tamborzao: cospe bala
  pistol_7: { mode: 'semi', rate: 1.25, dmg: 1.3, kick: 1.3 },                        // quarenta e cinco
  pistol_8: { mode: 'semi', rate: 1.1, dmg: 1.15, spread: 0.8, hip: 1.15 },           // cabo de vassoura
  pistol_9: { mode: 'semi', rate: 0.95, dmg: 1.05 },                                  // estrelinha
  sniper_0: { mode: 'bolt' },                                                     // ferrolho
  sniper_1: { mode: 'semi', rate: 0.5, dmg: 0.62, kick: 0.7 },                    // semiauto, nao mata de 1
  sniper_2: { mode: 'bolt', rate: 1.3, dmg: 1.25, kick: 1.3 },                   // ferrolho pesado
  sniper_3: { mode: 'bolt', rate: 0.88, dmg: 0.95, kick: 1.1 },                  // ping velho (WW2): ferrolho mais agil que o padrao
};
// laminas: faca rapida e curta, machado/espada lento e com mais alcance (1 golpe sempre derruba)
const ML = [[0.6, 2.4], [1.0, 3.0], [0.55, 2.3], [1.15, 3.3], [1.05, 3.0], [0.62, 2.5], [0.95, 2.9], [0.85, 3.0], [0.55, 2.3], [1.0, 2.9], [0.5, 2.2], [1.0, 3.0], [0.9, 3.2], [0.95, 2.9], [1.0, 3.0]];
ML.forEach(([rate, range], i) => { BODY_TRAITS['melee_' + i] = { mode: 'semi', rate: rate / 0.7, range }; });
export const bodyTrait = (body) => BODY_TRAITS[body] || {};

// Variantes de elite: arma ja montada (modelo + pecas + camuflagem lendaria) que sai de desafio de elite.
// lo vem COMPLETA: pecas, tracado, cor/destaque e cor da mira combinando com a camo. mag: 'big' | 'small' = o
// cliente escolhe o maior/menor pente que encaixa no modelo (depende da geometria).
// mods multiplicam os status do arsenal (mesma regra: rate > 1 = mais lento, kick/spread/adsTime/reload > 1 = pior).
// Toda variante tem bonus E onus. O servidor usa dmg e rate pro limite de dano.
export const BLUEPRINTS = {
  bp_faisca:     { wpn: 'pistol',  mag: 'big', lo: { body: 'pistol_4', scope: 'pistol_scope_5', laser: 'laser_1', camo: 'tesla', tracer: 'spark', paint: '#7a3a18', accent: '#7fe6ff', retColor: 'white' },
                   mods: { rate: 0.86, dmg: 1.06, spread: 1.2, kick: 1.15 } },
  bp_fornalha:   { wpn: 'smg',     mag: 'big', lo: { body: 'subfusil_4', scope: 'subfusil_scope_5', handle: 'subfusil_handle_2', laser: 'laser_2', camo: 'hellfire', tracer: 'fire', paint: '#2a1a14', accent: '#ff6a1a', retColor: 'red' },
                   mods: { dmg: 1.1, rate: 0.94, move: 0.94, adsTime: 1.12 } },
  bp_pararaios:  { wpn: 'rifle',   mag: 'small', lo: { body: 'fusil_2', scope: 'fusil_scope_5', handle: 'fusil_handle_2', laser: 'laser_1', camo: 'tesla', tracer: 'spark', paint: '#7a3a18', accent: '#7fe6ff', retColor: 'white' },
                   mods: { dmg: 1.08, rate: 0.9, reload: 1.25, mag: 0.85 } },
  bp_grandefinal:{ wpn: 'shotgun', lo: { body: 'shotgun_2', scope: 'subfusil_scope_9', handle: 'subfusil_handle_6', laser: 'laser_2', camo: 'marquee', tracer: 'gold', paint: '#a3201a', accent: '#e3c14a', retColor: 'amber' },
                   mods: { spread: 0.78, dmg: 1.06, rate: 1.18, reload: 1.2 } },
  bp_matabarrao: { wpn: 'sniper',  mag: 'big', lo: { body: 'sniper_0', scope: 'sniper_scope_1', camo: 'inkwell', tracer: 'ink', paint: '#141210', accent: '#ece9e1', retColor: 'white' },
                   mods: { adsTime: 0.82, move: 1.06, dmg: 0.94, kick: 1.25 } },
};
export const bpMods = (bp) => BLUEPRINTS[bp]?.mods || {};
