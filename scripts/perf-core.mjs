// Mede o custo do Core (o que roda no servidor do multiplayer e no navegador do solo), sem grafico.
// node scripts/perf-core.mjs [segundos de jogo por caso]
import { Core } from '../shared/core.js';
const SECS = Number(process.argv[2]) || 60, q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)];
for (const [mode, map, bots] of [['ffa', 'vila', 7], ['tdm', 'fabrica', 15], ['blitz', undefined, 23], ['br', undefined, 23], ['borroes', 'tinteiro', 3]]) {
  try {
    let bytes = 0, msgs = 0;
    const c = new Core({ mode, map, bots, lobby: false, send: (to, m) => { msgs++; if (m?.t === 'snap' || m?.type === 'snap' || m?.players) bytes += JSON.stringify(m).length; } });
    const ts = [], h0 = process.memoryUsage().heapUsed, w0 = performance.now();
    for (let t = 0; t < SECS; t += 1 / 30) { const a = performance.now(); c.tick(1 / 30); ts.push(performance.now() - a); }
    console.log(mode.padEnd(8), 'bots', String(bots).padStart(2), '| tick p50', q(ts, .5).toFixed(3), 'p99', q(ts, .99).toFixed(2), 'max', Math.max(...ts).toFixed(1), 'ms | uso de 1 nucleo a 30 Hz', (ts.reduce((a, b) => a + b, 0) / SECS / 10).toFixed(1) + '%', '| heap +' + ((process.memoryUsage().heapUsed - h0) / 1048576).toFixed(0) + ' MB', '| msgs/s', Math.round(msgs / SECS));
  } catch (e) { console.log(mode, 'ERRO', e.message); }
}
