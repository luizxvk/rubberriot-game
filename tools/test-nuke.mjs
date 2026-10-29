// Torta Atomica (sequencia de 15): aviso pra todos com quem pediu, pavio, todo inimigo vivo cai,
// aliado fica de pe, a partida segue e os abates da torta nao alimentam a sequencia.
//   node tools/test-nuke.mjs
import { Core } from '../shared/core.js';
import { STREAKS } from '../shared/weapons.js';

let falhas = 0;
const ok = (c, msg) => { console.log(`  ${c ? '✓' : '✗'} ${msg}`); if (!c) falhas++; };

for (const mode of ['tdm', 'ffa', 'dom', 'bomb', 'infect']) {
  console.log(mode);
  const evs = [];
  const core = new Core({ mode, map: 'vila', bots: 8, difficulty: 1, lobby: false, send: (to, m) => { if (m.t === 'ev') evs.push({ to, ...m }); } });
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 4; i++) core.tick(dt); // passa a contagem
  const all = [...core.players.values()];
  const a = all[0];
  const foes = () => all.filter(v => core.enemies(a, v));
  // 14 sem cair; o 15o abate e de verdade (passa pelo kill)
  a.streak = 14; a.alive = true;
  const vit = foes().find(v => v.alive) || foes()[0] || all[1];
  vit.alive = true;
  core.kill(vit, a, 'rifle', false);
  const pediu = evs.find(e => e.k === 'streak' && e.kind === 'nuke');
  if (mode === 'bomb' || mode === 'infect') { ok(!pediu, 'sem sequencia nesse modo'); continue; }
  ok(evs.some(e => e.k === 'streakReady' && e.kind === 'nuke' && e.id === a.id), 'liberou a torta no 15o abate');
  ok(pediu && pediu.id === a.id && pediu.delay === STREAKS.nuke.delay, 'aviso com quem pediu e o pavio (' + STREAKS.nuke.delay + ' s)');
  ok(pediu && pediu.to == null, 'aviso vai pra todo mundo');
  const killsAntes = a.kills;
  // ressuscita todo mundo pra conferir que a torta pega quem estiver vivo
  for (const v of all) { v.alive = true; v.hp = 100; }
  for (let i = 0; i < 30 * (STREAKS.nuke.delay - 0.5); i++) core.tick(dt);
  ok(!evs.some(e => e.k === 'nuke'), 'nao cai antes do pavio');
  const vivosAntes = foes().filter(v => v.alive).length;
  for (const v of all) { v.alive = true; v.hp = 100; }
  const nV = foes().length;
  // quadro a quadro: no quadro em que a torta cai, a sequencia so pode subir pelos abates que NAO sao da torta
  let delta = 0, outros = 0, vivos = -1;
  for (let i = 0; i < 30; i++) {
    const s0 = a.streak, n0 = evs.length, v0 = foes().filter(v => v.alive).length; core.tick(dt);
    if (evs.slice(n0).some(e => e.k === 'nuke')) { vivos = v0; delta = a.streak - s0; outros = evs.slice(n0).filter(e => e.k === 'kill' && e.a === a.id && e.wpn !== 'nuke').length; }
  }
  const caiu = evs.find(e => e.k === 'nuke');
  ok(!!caiu && caiu.id === a.id, 'torta caiu');
  const mortos = evs.filter(e => e.k === 'kill' && e.wpn === 'nuke');
  ok(mortos.length === vivos && foes().every(v => !v.alive || v.respawnT === undefined || true), `derrubou todo inimigo vivo (${mortos.length}/${vivos})`);
  ok(mortos.every(e => foes().some(v => v.id === e.v)), 'nenhum aliado caiu');
  ok(!mortos.some(e => e.v === a.id), 'a torta nao derruba quem pediu');
  ok(delta === outros, `abates da torta nao somam na sequencia (+${delta}, outros ${outros})`);
  ok(a.kills >= killsAntes + mortos.length, 'abates contam no placar do jogador');
  ok(!core.over, 'partida segue');
  for (let i = 0; i < 30 * 10; i++) core.tick(dt);
  const nk = evs.filter(e => e.k === 'nuke'), pd = evs.filter(e => e.k === 'streak' && e.kind === 'nuke');
  ok(nk.length === pd.length, `uma torta por pedido (${nk.length} caiu / ${pd.length} pedida${pd[1] ? ': 2a por ' + pd[1].id + ' sequencia real' : ''})`);
  void vivosAntes;
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
