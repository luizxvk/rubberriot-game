// Roubo ao Trem (19/11): partida so de bots, sem grafico. Confere chegada/partida do trem, arrombar, joias, entrega e fim.
// node scripts/trem-sim.mjs [segundos]
import { Core } from '../shared/core.js';
import { inTrain } from '../shared/heist.js';
const SECS = Number(process.argv[2]) || 400;
const c = new Core({ mode: 'trem', map: 'auto', bots: 9, lobby: false, send: () => {} });
console.log('mapa', c.M.id, 'vault', c.heist.vault, 'lux', c.heist.lux, 'van', c.heist.van, 'bolsas', c.heist.bags.length, 'caixas', c.M.boxes.length);
const ev = {}; const ev0 = c.event.bind(c); let T = 0;
c.event = (e) => { const k = e.k + (e.act ? ':' + e.act : '') + (e.jw ? ':joia' : ''); ev[k] = (ev[k] || 0) + 1; if (/^train|heistRound|heistOpen/.test(e.k)) console.log(Math.round(T), 's', e.k, e.k === 'heistRound' ? JSON.stringify({ win: e.win, why: e.why, money: e.money }) : '', 'caixas', c.M.boxes.length, 'x', c.heist.tr?.x?.toFixed(1)); if (e.k === 'kill' && e.wpn === 'trem') console.log('   morto pelo trem', e.v); return ev0(e); };
// um bot teimoso: fica dentro do vagao de luxo quando o trem fecha (tem que ser jogado pra fora)
for (; T < SECS && !c.over; T += 1 / 30) {
  c.tick(1 / 30);
  if (process.argv.includes('--fechar') && c.heist.tr?.st === 2 && c.time > 22) { c.time = 22; for (const p of c.players.values()) if (p.bot && p.alive) { p.pos = [-8, 1, 0]; break; } } // --fechar: testa fechar/partir (um bot dentro)
  const H = c.heist; if (H.tr?.st === 3 && H.tr.t < 0.05) { const inside = [...c.players.values()].filter(p => p.alive && inTrain(c.M, H, p)).length; console.log('   ao fechar, dentro do trem:', inside); }
}
console.log('fim', Math.round(T), 's, acabou:', !!c.over, 'placar', c.heist?.wins, 'eventos', Object.fromEntries(Object.entries(ev).filter(([k]) => /heist|train|kill/.test(k))));
