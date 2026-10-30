// Arsenal da Vila Borracha. dmg por projetil; rate = segundos entre tiros.
export const WEAPONS = {
  pistol:  { name: 'Estalo',     slot: 1, dmg: 34, rate: 0.15, mag: 12, reserve: Infinity, reload: 1.0, spread: 0.012, auto: false, zoom: 1.25, kick: 0.035, range: 140, recoil: [[1, 0], [1, 0.2], [1, -0.2]] },
  smg:     { name: 'Matraca',    slot: 2, dmg: 21, rate: 0.068, mag: 32, reserve: 192, reload: 1.4, spread: 0.032, auto: true, zoom: 1.3, kick: 0.018, range: 140, recoil: [[1, 0.3], [0.9, -0.4], [1, 0.5], [0.8, -0.5], [1, 0.2], [0.9, -0.3]] },
  rifle:   { name: 'Trovao',     slot: 3, dmg: 34, rate: 0.1, mag: 30, reserve: 150, reload: 1.7, spread: 0.018, auto: true, zoom: 1.6, kick: 0.026, range: 260, recoil: [[1.2, 0], [1.1, 0.15], [1, 0.3], [0.9, 0.35], [0.8, 0.1], [0.8, -0.25], [0.8, -0.4], [0.7, -0.2]] },
  shotgun: { name: 'Bacamarte',  slot: 4, dmg: 17, pellets: 10, rate: 0.7, mag: 6, reserve: 36, reload: 1.9, spread: 0.085, auto: false, zoom: 1.2, kick: 0.11, range: 45, recoil: [[1, 0.1]] },
  minigun: { name: 'Moedor',     slot: 5, dmg: 16, rate: 0.045, mag: 140, reserve: 280, reload: 2.6, spread: 0.05, auto: true, zoom: 1, kick: 0.012, spin: 0.35, noAds: true, range: 200, recoil: [[0.6, 0.6], [0.6, -0.6], [0.7, 0.4], [0.6, -0.5]] },
  melee:   { name: 'Lamina', slot: 7, dmg: 150, rate: 0.7, mag: Infinity, reserve: Infinity, reload: 0, spread: 0, auto: false, zoom: 1, kick: 0.02, range: 2.6, melee: true, noAds: true, recoil: [[0, 0]] },
  sniper:  { name: 'Luneta',     slot: 6, dmg: 150, rate: 1.05, mag: 5, reserve: 25, reload: 2.1, spread: 0.04, adsSpread: 0, auto: false, zoom: 4, kick: 0.16, range: 400, recoil: [[1, 0.15]] },
  // punhos (battle royale): 3 socos derrubam quem esta sem colete (34 x 3 = 102)
  fists:   { name: 'Punhos', slot: 8, dmg: 34, rate: 0.42, mag: Infinity, reserve: Infinity, reload: 0, spread: 0, auto: false, zoom: 1, kick: 0.015, range: 2.3, melee: true, noAds: true, recoil: [[0, 0]] },
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
// mais escadas (pedido dele 30/10): a partida sorteia uma; todas com 18 degraus e lamina no fim.
// 'sorteio' monta uma escada nova a cada partida (classe por degrau fixa, modelo sorteado)
const L = (...ids) => ids.map(body => ({ wpn: wpnOfBody(body), body }));
export function wpnOfBody(b) { return b.startsWith('melee') ? 'melee' : b.startsWith('subfusil') ? 'smg' : b.startsWith('fusil') ? 'rifle' : b.startsWith('pistol') ? 'pistol' : b.startsWith('shotgun') ? 'shotgun' : 'sniper'; }
export const GG_LADDERS = {
  classic: GUN_LADDER,
  ww2: L('pistol_9', 'pistol_8', 'pistol_7', 'subfusil_6', 'subfusil_12', 'subfusil_1', 'fusil_9', 'fusil_5', 'fusil_6', 'shotgun_1', 'sniper_3', 'sniper_0', 'subfusil_8', 'fusil_3', 'pistol_5', 'pistol_6', 'melee_11', 'melee_1'),
  rajada: L('pistol_3', 'pistol_5', 'subfusil_8', 'subfusil_3', 'subfusil_10', 'fusil_2', 'fusil_6', 'fusil_3', 'fusil_7', 'shotgun_2', 'sniper_2', 'sniper_3', 'sniper_1', 'subfusil_9', 'pistol_6', 'pistol_2', 'melee_12', 'melee_5'),
  avesso: L('sniper_0', 'sniper_2', 'sniper_1', 'shotgun_1', 'shotgun_2', 'fusil_4', 'fusil_1', 'fusil_7', 'fusil_9', 'subfusil_4', 'subfusil_7', 'subfusil_9', 'subfusil_1', 'pistol_1', 'pistol_4', 'pistol_7', 'melee_7', 'melee_9'),
  // 30/10 (noite): escadas novas com as armas novas
  novas: L('pistol_10', 'pistol_9', 'subfusil_13', 'subfusil_12', 'subfusil_5', 'fusil_10', 'fusil_11', 'fusil_12', 'shotgun_3', 'subfusil_9', 'fusil_9', 'shotgun_2', 'sniper_4', 'sniper_2', 'pistol_3', 'pistol_8', 'melee_7', 'melee_1'),
  pesada: L('pistol_3', 'pistol_7', 'subfusil_10', 'subfusil_12', 'fusil_10', 'fusil_4', 'fusil_12', 'fusil_3', 'shotgun_3', 'shotgun_1', 'fusil_9', 'shotgun_2', 'sniper_2', 'sniper_0', 'pistol_6', 'pistol_10', 'melee_12', 'melee_3'),
  curta: L('pistol_2', 'pistol_1', 'subfusil_13', 'subfusil_2', 'subfusil_6', 'subfusil_4', 'shotgun_3', 'shotgun_2', 'fusil_11', 'subfusil_7', 'shotgun_1', 'fusil_6', 'sniper_1', 'sniper_4', 'pistol_4', 'pistol_9', 'melee_14', 'melee_9'),
};
const GG_POOL = {
  pistol: ['pistol_1', 'pistol_2', 'pistol_3', 'pistol_4', 'pistol_5', 'pistol_6', 'pistol_7', 'pistol_8', 'pistol_9'],
  smg: ['subfusil_1', 'subfusil_2', 'subfusil_3', 'subfusil_4', 'subfusil_5', 'subfusil_6', 'subfusil_7', 'subfusil_8', 'subfusil_9', 'subfusil_10', 'subfusil_12', 'subfusil_13'],
  rifle: ['fusil_1', 'fusil_2', 'fusil_3', 'fusil_4', 'fusil_5', 'fusil_6', 'fusil_7', 'fusil_9', 'fusil_10', 'fusil_11', 'fusil_12'],
  shotgun: ['shotgun_1', 'shotgun_2', 'shotgun_3'], sniper: ['sniper_0', 'sniper_1', 'sniper_2', 'sniper_3', 'sniper_4'],
  melee: ['melee_0', 'melee_1', 'melee_3', 'melee_4', 'melee_7', 'melee_9', 'melee_11', 'melee_12', 'melee_14'],
};
const GG_SHAPE = ['pistol', 'pistol', 'smg', 'smg', 'smg', 'rifle', 'rifle', 'rifle', 'shotgun', 'smg', 'rifle', 'shotgun', 'sniper', 'sniper', 'pistol', 'pistol', 'melee', 'melee'];
export function ggPickLadder() {
  const ids = [...Object.keys(GG_LADDERS), 'sorteio'], id = ids[Math.floor(Math.random() * ids.length)];
  if (id !== 'sorteio') return { id, list: GG_LADDERS[id] };
  const used = new Set();
  const list = GG_SHAPE.map(w => { const pool = GG_POOL[w].filter(b => !used.has(b)); const b = (pool.length ? pool : GG_POOL[w])[Math.floor(Math.random() * (pool.length || GG_POOL[w].length))]; used.add(b); return { wpn: w, body: b }; });
  return { id, list };
}
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
// 30/10: Cuca Dura (apelona) e Pe de Pano sairam (pedido dele)
export const SKILLS = {
  maos: { lvl: 3, reload: 0.75, swap: 0.7, icon: 'pan_tool' },             // recarrega e troca de arma mais rapido
  mola: { lvl: 4, jump: 1.3, icon: 'height' },                              // pula mais alto
  carrinho: { lvl: 5, slide: true, icon: 'sledding' },                      // agachar correndo = desliza (so com ela equipada; pedido dele 30/10)
  borracha: { lvl: 6, move: 1.08, icon: 'directions_run' },                 // anda e corre mais rapido
  catador: { lvl: 8, mags: 1, icon: 'backpack' },                           // cada abate devolve um pente na reserva
  lince: { lvl: 10, ads: 0.75, kick: 0.85, icon: 'visibility' },            // mira mais rapido, menos recuo
  sangue: { lvl: 12, below: 35, reload: 0.7, ads: 0.7, icon: 'ac_unit' },  // com pouca vida: recarrega e mira mais rapido
  bolso: { lvl: 14, nades: 1, reserve: 1.3, icon: 'inventory_2' },          // +1 granada de cada e mais municao reserva
  couro: { lvl: 18, blast: 0.7, icon: 'shield' },                           // menos dano de explosao
  folego: { lvl: 22, after: 4, regen: 8, icon: 'favorite' },                // vida volta sozinha depois de 4 s sem dano
  pavio: { lvl: 26, streak: 1, icon: 'local_fire_department' },             // sequencias custam 1 abate a menos
};
export const SKILL_SLOTS = 2;
// Battle royale: colete absorve parte do dano; iris (zona) fecha em fases; o dirigivel solta caixotes.
// phases: espera (s), fecha (s), raio final (fracao do raio inicial), dano fora (vida/s)
export const BR = {
  armorMax: 100, armorPiece: 50, armorAbsorb: 0.7,
  r0: 1.5, phases: [[45, 35, 0.62, 2], [35, 30, 0.38, 4], [30, 25, 0.2, 7], [25, 20, 0.08, 11], [20, 20, 0, 16]],
  ring: { lastPhase: 3, wait: 25, fight: 45, spar: 6 }, // ringue: vale ate a fase 3 da iris; espera e luta (s); spar = sozinho na fila chama sparring
  // dupla: caido sangra `down` s (com `downHp` de vida pra quem quiser terminar); parceiro segura usar a
  // `reviveR` m por `revive` s e ele levanta com `reviveHp`. Caido rasteja a `crawl` da velocidade.
  duo: { down: 30, downHp: 100, revive: 4, reviveR: 2.6, reviveHp: 30, crawl: 0.3 },
  // Bate-Volta: renasce ate a fase `until` da iris (depois disso vale o ringue e, depois, eliminacao);
  // nasce a `dropH` m do chao; paraquedas desce a `chute` m/s, queda livre ate `freefall`; bater no chao
  // acima de `safe` m/s tira `dmg` de vida por m/s a mais (so nesse modo)
  bounce: { until: 2, wait: 8, dropH: 70, chute: 4.5, freefall: 20, safe: 10, dmg: 5, airSpeed: 7 },
  dropEvery: 55, dropFall: 6,
  // arma no chao por raridade (peso): as comuns aparecem muito, as apelonas pouco (pedido dele 30/10)
  lootWpn: { pistol: 30, smg: 24, shotgun: 18, rifle: 15, sniper: 8, minigun: 1.5 },
  lootExtra: 0.6, // chance de cada ponto de loot ganhar um segundo item do lado (mais arma no chao)
  // arma do mapa fica `spawnLife` s parada e reaparece em outro ponto de loot (pedido dele 30/10); o que cai
  // de quem morre ou troca de arma some depois de `dropLife` s. Conferido a cada `lifeStep` s, de lote (a
  // lista de loot so e reenviada quando algo vence, nunca a cada quadro).
  spawnLife: 60, dropLife: 45, lifeStep: 3,
};
// Tipos de bala (peca "Municao" do Arsenal, por arma; liberadas por desafio). Mods multiplicam os status
// (mesma regra do arsenal). O servidor aplica fogo, respingo e parede; a marca no minimapa e do cliente.
export const AMMO = {
  fire: { dmg: 0.85, burn: 14, burnT: 2, icon: 'local_fire_department' },   // alvo queima: +14 de dano em 2 s
  trace: { mark: 3, icon: 'my_location' },                                   // alvo no seu minimapa por 3 s
  boom: { mag: 0.7, kick: 1.25, splash: 2.2, splashK: 0.35, icon: 'flare' }, // respinga em quem esta perto
  ap: { rate: 1.12, pierce: 0.7, wallK: 0.75, icon: 'double_arrow' },        // atravessa parede fina (ate 0,7 m)
};
export const AMMO_IDS = Object.keys(AMMO);
// Equipamento de campo: um por jogador (escolhido na secao Skills), tecla Z / direcional direita / botao
// de toque. cd = recarga (s); lvl = nivel que libera.
export const FIELD = {
  umbrella: { lvl: 2, cd: 30, dur: 5, icon: 'beach_access' },            // escudo na frente: bloqueia tiro e soco que vem de frente
  spring: { lvl: 5, cd: 25, dur: 20, power: 15, icon: 'keyboard_double_arrow_up' }, // trampolim no chao: quem pisa voa
  hole: { lvl: 9, cd: 35, dur: 25, range: 35, icon: 'adjust' },          // buraco no pe + buraco onde mira: entra num, sai no outro
  anvil: { lvl: 13, cd: 40, range: 45, fall: 1.3, icon: 'hardware' },    // bigorna cai do ceu no ponto mirado
};
export const FIELD_IDS = Object.keys(FIELD);
export const BLAST = ['frag', 'anvil', 'blimp', 'bomb'];
export const hasSkill = (p, id) => !!p?.skills?.includes(id);

export const STREAKS = {
  uav: { kills: 3, time: 25 },
  anvil: { kills: 5 },
  blimp: { kills: 7, time: 22, dmg: 14, hp: 1200 }, // da pra derrubar a tiro (hp)
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
  // battle royale: todo mundo nasce no soco, pega arma/colete no chao e a iris fecha o mapa. Ultimo de pe vence.
  br:       { name: 'Ultimo de Pe',      teams: false, limit: 0,   time: 900, desc: 'Nasce no soco, pega arma e colete no chao e foge da iris que fecha. Ultimo de pe vence.' },
  // mesmo battle royale em duplas: zerou a vida com o parceiro de pe = fica caido ate ele reerguer
  // battle royale com renascimento: todo mundo cai de paraquedas; ate a fase 2 da iris quem cai volta do ceu
  bounce:   { name: 'Bate-Volta', teams: false, limit: 0, time: 900, desc: 'Battle royale caindo de paraquedas. Ate a iris fechar duas vezes, quem cai volta do ceu. Depois e ringue, e depois e pra valer.' },
  duo:      { name: 'Ultimo de Pe: Dupla', teams: true,  limit: 0,   time: 900, desc: 'Battle royale em dupla. Caiu, o parceiro te reergue com a bomba de bicicleta. Ultima dupla de pe vence.' },
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
  subfusil_13: { mode: 'auto', rate: 0.9, dmg: 0.95, kick: 0.8, hip: 0.95 },        // sanfona (pacote 2): rapida e controlada
  fusil_1: { mode: 'auto' },
  fusil_2: { mode: 'burst', burst: 3, rate: 0.6, dmg: 1.05, kick: 0.9 },
  fusil_3: { mode: 'semi', rate: 2.6, dmg: 1.55, spread: 0.5, hip: 1.4, kick: 1.45 }, // de precisao (nerf leve 30/10: era rate 2.4, dmg 1.7, kick 1.4)
  fusil_4: { mode: 'auto', rate: 1.3, dmg: 1.25, kick: 1.25, hip: 1.15 },
  fusil_5: { mode: 'auto', rate: 0.85, dmg: 0.9, hip: 0.85 },
  fusil_6: { mode: 'burst', burst: 4, rate: 0.55, dmg: 0.85 },
  fusil_7: { mode: 'semi', rate: 1.7, dmg: 1.45, spread: 0.65, hip: 1.25 },
  fusil_10: { mode: 'auto', rate: 1.12, dmg: 1.12, kick: 1.25, hip: 0.95 },            // rolo compressor (pacote 2): lento e pesado
  fusil_11: { mode: 'auto', rate: 0.95, dmg: 1, kick: 0.9, hip: 1 },                   // bate-estaca: o fuzil certinho, pouco coice
  fusil_12: { mode: 'semi', rate: 2.3, dmg: 1.5, spread: 0.55, hip: 1.35, kick: 1.35 }, // bico de pena: semi de precisao (abaixo da Agulha)
  shotgun_1: { mode: 'semi' },                                                     // bomba
  shotgun_2: { mode: 'semi', rate: 0.55, dmg: 0.82, kick: 0.85 },                  // semiautomatica
  shotgun_3: { mode: 'auto', rate: 0.3, dmg: 0.42, kick: 1.1, spread: 1.15, mag: 5.34, reload: 1.35 }, // AA-12: cospe chumbo (~4,8/s), dano baixo por tiro, 32 no pente (6 x 5,34)
  // pacote WW2
  fusil_9: { mode: 'auto', rate: 1.12, dmg: 1.1, kick: 1.15, hip: 1.05 },             // trovao de lata
  subfusil_12: { mode: 'auto', rate: 0.7, dmg: 0.82, kick: 1.25, spread: 1.1, mag: 1.875, reload: 1.25 }, // tamborzao: cospe bala; tambor de 60 (32 x 1,875), troca devagar
  pistol_7: { mode: 'semi', rate: 1.25, dmg: 1.3, kick: 1.3 },                        // quarenta e cinco
  pistol_8: { mode: 'semi', rate: 1.1, dmg: 1.15, spread: 0.8, hip: 1.15 },           // cabo de vassoura
  pistol_9: { mode: 'semi', rate: 0.95, dmg: 1.05 },                                  // estrelinha
  pistol_10: { mode: 'semi', rate: 1.9, dmg: 1.5, kick: 1.7, spread: 0.85, hip: 1.1, mag: 0.5, reload: 1.35 },  // Bang-Bang (revolver): forte e lento; pente de 6, recarga lenta (arsenal)
  sniper_0: { mode: 'bolt' },                                                     // ferrolho
  sniper_1: { mode: 'semi', rate: 0.5, dmg: 0.62, kick: 0.7 },                    // semiauto, nao mata de 1
  sniper_2: { mode: 'semi', rate: 0.75, dmg: 1.1, kick: 1.45 },                  // marretao (Barrett): semi pesada, coice grande (era ferrolho; pedido dele 30/10)
  sniper_3: { mode: 'bolt', rate: 0.88, dmg: 0.95, kick: 1.1 },                  // ping velho (WW2): ferrolho mais agil que o padrao
  sniper_4: { mode: 'bolt', rate: 1, dmg: 1.05, kick: 1.05 },                     // ferrolho classico (modelo novo 30/10)
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
  // 30/10: leva nova (camos lendarias geleira, lodo, eclipse, vitral)
  bp_geleira:    { wpn: 'sniper',  lo: { body: 'sniper_2', scope: 'sniper_scope_2', camo: 'glacier', tracer: 'ice', paint: '#dff6ff', accent: '#5fb3d9', retColor: 'white' },
                   mods: { dmg: 1.05, rate: 1.1, adsTime: 0.9, kick: 1.12 } },
  bp_lodo:       { wpn: 'smg',     mag: 'big', lo: { body: 'subfusil_7', scope: 'subfusil_scope_7', handle: 'subfusil_handle_3', laser: 'laser_2', camo: 'sludge', tracer: 'toxic', paint: '#2c4a08', accent: '#d8ff7a', retColor: 'white' },
                   mods: { rate: 0.92, spread: 1.15, reload: 0.9, dmg: 0.96 } },
  bp_eclipse:    { wpn: 'pistol',  mag: 'small', lo: { body: 'pistol_7', scope: 'pistol_scope_5', laser: 'laser_1', camo: 'eclipse', tracer: 'void', paint: '#0a0710', accent: '#ffd36b', retColor: 'amber' },
                   mods: { dmg: 1.12, rate: 1.12, mag: 0.85, move: 0.97 } },
  bp_vitral:     { wpn: 'shotgun', lo: { body: 'shotgun_1', scope: 'subfusil_scope_6', handle: 'subfusil_handle_3', laser: 'laser_2', camo: 'stainedglass', tracer: 'rainbow', paint: '#1b1916', accent: '#f2c94c', retColor: 'amber' },
                   mods: { spread: 0.86, dmg: 1.03, reload: 1.15, move: 0.96 } },
  // 30/10 (noite): uma variante por arma nova, camo lendaria exclusiva de cada
  bp_kintsugi:   { wpn: 'rifle',   lo: { body: 'fusil_10', scope: 'fusil_scope_2', handle: 'fusil_handle_2', laser: 'laser_1', camo: 'kintsugi', tracer: 'gold', paint: '#0b0b0c', accent: '#ffc24a', retColor: 'amber' },
                   mods: { dmg: 1.08, kick: 1.12, rate: 1.04, move: 0.98 } },
  bp_placa:      { wpn: 'rifle',   lo: { body: 'fusil_11', scope: 'fusil_scope_5', handle: 'subfusil_handle_3', laser: 'laser_2', camo: 'circuit', tracer: 'spark', paint: '#04170c', accent: '#3df5e6', retColor: 'green' },
                   mods: { spread: 0.88, adsTime: 0.92, dmg: 0.97, reload: 1.08 } },
  bp_galaxia:    { wpn: 'rifle',   mag: 'small', lo: { body: 'fusil_12', scope: 'fusil_scope_6', handle: 'subfusil_handle_6', laser: 'laser_1', camo: 'galaxy', tracer: 'void', paint: '#08051a', accent: '#ff6ad5', retColor: 'white' },
                   mods: { dmg: 1.06, spread: 0.9, rate: 1.1, mag: 0.9 } },
  bp_gibi:       { wpn: 'smg',     mag: 'big', lo: { body: 'subfusil_13', scope: 'subfusil_scope_7', handle: 'subfusil_handle_3', laser: 'laser_1', camo: 'popart', tracer: 'ink', paint: '#f6efdc', accent: '#ff2a7a', retColor: 'red' },
                   mods: { rate: 0.92, kick: 1.1, mag: 1.1, spread: 1.08 } },
  bp_plasma:     { wpn: 'shotgun', lo: { body: 'shotgun_3', scope: 'subfusil_scope_9', handle: 'subfusil_handle_6', laser: 'laser_2', camo: 'plasma', tracer: 'fire', paint: '#2a0628', accent: '#ff8a1a', retColor: 'amber' },
                   mods: { dmg: 1.05, rate: 1.08, spread: 1.1, move: 0.97 } },
  bp_aurora:     { wpn: 'sniper',  lo: { body: 'sniper_4', scope: 'sniper_scope_0', laser: 'laser_2', camo: 'aurora', tracer: 'ice', paint: '#020615', accent: '#3dffa0', retColor: 'green' },
                   mods: { adsTime: 0.9, dmg: 0.97, move: 1.02, reload: 1.1 } },
};
export const bpMods = (bp) => BLUEPRINTS[bp]?.mods || {};
