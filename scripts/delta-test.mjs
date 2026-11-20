// 19/11: confere o estado parcial (core.js deltaSnap) + a junta do cliente (net.js mergeSnap): o cliente tem que ver o MESMO
// estado que veria com o envio inteiro, quadro a quadro. E mede o ganho. node scripts/delta-test.mjs
import fs from 'fs';
import { Core } from '../shared/core.js';
const src = fs.readFileSync(new URL('../src/net.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('  mergeSnap(m) {'), src.indexOf('\n  }', src.indexOf('  mergeSnap(m) {')) + 4);
const net = {}; net.mergeSnap = new Function('m', body.replace(/^  mergeSnap\(m\) \{/, '').replace(/\}\s*$/, '')).bind(net);
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x));
let bad = 0;
for (const [mode, map, bots] of [['tdm', 'vila', 11], ['trem', 'auto', 11], ['blitz', undefined, 23], ['br', undefined, 15], ['escort', 'auto', 11]]) {
  let full = null, nFull = 0, nDelta = 0, n = 0;
  const c = new Core({ mode, map, bots, lobby: false, send: (to, m) => {
    if (m.t !== 'snap') return;
    const wire = JSON.stringify(m); nDelta += wire.length; n++;
    const got = net.mergeSnap(JSON.parse(wire));
    if (got && canon(got) !== canon(full)) { if (bad++ < 3) { const a = JSON.parse(canon(got)), b = JSON.parse(canon(full)); for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log('  DIFERENTE', mode, k, JSON.stringify(a[k])?.slice(0, 160), '|', JSON.stringify(b[k])?.slice(0, 160)); } }
  } });
  const H = 'humano'; c.join(H, 'Teste'); c.handle(H, { t: 'kf' });
  const orig = c.deltaSnap.bind(c); c.deltaSnap = (m) => { full = JSON.parse(JSON.stringify(m)); nFull += JSON.stringify(m).length; return orig(m); };
  for (let t = 0; t < 60; t += 1 / 30) { c.tick(1 / 30); if (Math.abs(t - 20) < 0.02) c.handle(H, { t: 'kf' }); }
  console.log(mode.padEnd(7), 'inteiro', Math.round(nFull / n), 'B -> parcial', Math.round(nDelta / n), 'B por envio (' + Math.round(100 - nDelta / nFull * 100) + '% menos)');
}
console.log(bad ? 'FALHOU: ' + bad + ' quadros diferentes' : 'ok: o cliente reconstroi o estado inteiro em todos os quadros');
process.exit(bad ? 1 : 0);
