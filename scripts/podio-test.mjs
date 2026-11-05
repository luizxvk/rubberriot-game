// Fim da partida com podio (05/11): regras no Core puro. Uso: node scripts/podio-test.mjs
import { Core, OVER_LOBBY, OVER_NEXT } from '../shared/core.js';
let f = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) f++; };
const mk = (o) => { const c = new Core({ send: () => {}, mode: 'ffa', map: 'vila', ...o }); c.local = true; c.ev = []; const ev = c.event.bind(c); c.event = (e) => { c.ev.push(e); return ev(e); }; return c; };
const dances = (c) => c.ev.filter(e => e.k === 'dance');
const run = (c, s) => { for (let i = 0; i < s * 10; i++) c.tick(0.1); };

{ const c = mk({ lobby: true, bots: 4 }); c.join('me', 'Eu'); c.join('b', 'Bia'); c.phase = 'play'; const me = c.players.get('me'), bia = c.players.get('b');
  [...c.players.values()].forEach((p, i) => { p.score = i; p.kills = i; }); me.score = 500; bia.score = 0; bia.kills = -1;
  c.end('Eu');
  const E = c.ev.find(e => e.k === 'end');
  ok(E && E.top.length === 3 && E.top[0] === 'me', 'evento de fim traz os 3 melhores: ' + E?.top);
  ok(!E.top.includes('b'), 'quem nao ficou entre os 3 fica de fora');
  ok(c.overT === OVER_LOBBY, 'sala com lobby: tempo do fim = ' + OVER_LOBBY);
  c.clock = 10; c.handle('b', { t: 'dance', d: 'charleston' }); ok(dances(c).length === 0, 'fora do podio nao dança');
  c.handle('me', { t: 'dance', d: 'hack' }); ok(dances(c).length === 0, 'dança que nao existe e recusada');
  c.handle('me', { t: 'dance', d: 'charleston' }); ok(dances(c).length === 1 && dances(c)[0].id === 'me', 'do podio dança');
  c.handle('me', { t: 'dance', d: 'macarrao' }); ok(dances(c).length === 1, 'troca rapida demais e ignorada');
  c.clock = 11; c.handle('me', { t: 'dance', d: 'macarrao' }); ok(dances(c).length === 2, 'depois de 0,5 s troca');
  c.handle('me', { t: 'toLobby' }); run(c, 0.3); ok(c.phase === 'play' && c.over, 'um so apertando nao corta a dança do outro');
  c.handle('b', { t: 'toLobby' }); run(c, 0.3); ok(c.phase === 'lobby' && !c.over, 'todos apertaram: volta na hora');
  c.ev.length = 0; c.clock = 20; c.handle('me', { t: 'dance', d: 'sapateado' }); ok(dances(c).length === 0, 'fora do fim de partida nao dança');
}
{ const c = mk({ lobby: true, bots: 2 }); c.join('me', 'Eu'); c.phase = 'play'; c.end('Eu'); run(c, OVER_LOBBY - 1); ok(c.phase === 'play' && c.over, 'continua no podio antes do tempo'); run(c, 1.5); ok(c.phase === 'lobby', 'ninguem apertou: volta sozinho pro lobby'); ok(c.ev.some(e => e.k === 'restart'), 'avisa a volta'); }
{ const c = mk({ lobby: false, autoNext: true, bots: 2 }); c.join('me', 'Eu'); c.end('Eu'); ok(c.overT === OVER_NEXT, 'sala sem lobby: tempo inclui o placar = ' + OVER_NEXT); c.handle('me', { t: 'toLobby' }); run(c, 0.3); ok(c.over, 'sala sem lobby nao tem botao de volta'); run(c, OVER_NEXT + 1); ok(!c.over && c.ev.some(e => e.k === 'start'), 'vai pra proxima partida'); }
{ const c = mk({ lobby: true, bots: 0, mode: 'borroes', map: 'tinteiro' }); c.join('me', 'Eu'); c.phase = 'play'; c.players.set('m1', { id: 'm1', mob: 'x', score: 999, kills: 99, alive: true, pos: [0, 0, 0] }); c.end('red'); const E = c.ev.find(e => e.k === 'end'); ok(!E.top.includes('m1'), 'vilao nao sobe no podio'); }
console.log(f ? f + ' FALHA(S)' : 'TUDO CERTO');
process.exit(f ? 1 : 0);
