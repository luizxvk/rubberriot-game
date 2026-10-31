// Eventos de fim de semana (31/10, pedido dele): uma regra maluca por fim de semana, em rodizio. Sexta a domingo o
// evento da semana aparece no menu e como opcao do host no lobby. Mesmo codigo no solo e no multiplayer
// (o servidor aplica regra, o jogo aplica fisica e visual). Cada evento e um Reels.
//   kit: armas fixas pra todo mundo | grav: gravidade (1 = normal) | jump: forca do pulo
//   anvilRain: s entre bigornas caindo no mapa | bigHead: tamanho da cabeca | headMul: dano na cuca
//   killHeal: vida que o abate devolve | ice: chao de sabao | fuse/fuseKill: bomba-relogio no peito
//   oneHead: tiro na cuca derruba | tiny: boneco nanico | boost: correria (velocidade)
export const EVENTS = {
  lua: { grav: 0.35, jump: 1.15, icon: 'nightlight' },                     // Gravidade de Borracha: pulos de astronauta
  faca: { kit: ['melee'], icon: 'content_cut' },                         // Faca na Boca: so lamina
  bigorna: { anvilRain: 1.6, icon: 'hardware' },                          // Chuva de Bigornas: olha pra cima
  cabecao: { bigHead: 2.3, headMul: 2.4, icon: 'face' },                  // Cabecao: cabeca enorme, cuca doi mais
  moedor: { kit: ['minigun', 'melee'], icon: 'cyclone' },                // Moedor pra Todos: todo mundo de metralhadora giratoria
  vampiro: { killHeal: 100, icon: 'bloodtype' },                          // Vampiro de Borracha: abate enche a vida
  sabao: { ice: true, icon: 'bubble_chart' },                             // Chao de Sabao: ninguem para em pe
  relogio: { fuse: 45, fuseKill: 15, icon: 'timer' },                     // Bomba-Relogio: abate da mais pavio, zerou = KABUM
  bangbang: { kit: ['pistol', 'melee'], oneHead: true, icon: 'gps_fixed' }, // Duelo ao Meio-Dia: pistola, cuca derruba
  pulapula: { jump: 2.1, boost: 1.25, icon: 'keyboard_double_arrow_up' },   // Pula-Pula: pulo de mola e correria
};
export const EVENT_IDS = Object.keys(EVENTS);

// rodizio: um evento por semana, na ordem da lista (semana contada a partir de uma segunda fixa)
const MONDAY0 = Date.UTC(2026, 9, 26); // segunda 26/10/2026
export function weekEvent(d = new Date()) {
  const w = Math.floor((d.getTime() - MONDAY0) / (7 * 864e5));
  return EVENT_IDS[((w % EVENT_IDS.length) + EVENT_IDS.length) % EVENT_IDS.length];
}
// Meta da comunidade (31/10, pedido dele): todo acerto em boneco (bot conta) e um PLAFT; a soma de todo mundo na
// semana (mesma semana dos eventos) bateu `goal` = quem jogou naquela semana ganha o set Ouro da Borracha pra sempre
// (camuflagem lendaria + coroa de tampinhas + camisa e luva douradas)
export const META = { goal: 1000000, perMatch: 1500 };
export const metaWeek = (d = new Date()) => Math.floor((d.getTime() - MONDAY0) / (7 * 864e5));
// no ar de sexta a domingo
export const eventLive = (d = new Date()) => [5, 6, 0].includes(d.getDay());
export const EV = (id) => (id && EVENTS[id]) || null;
// evento de agora (null fora do fim de semana). No navegador, ?evento=<id> no endereco forca um (teste e Reels)
export function currentEvent(d = new Date()) {
  try { const v = typeof location !== 'undefined' && new URLSearchParams(location.search).get('evento'); if (v && EVENTS[v]) return v; } catch { /* */ }
  return eventLive(d) ? weekEvent(d) : null;
}
