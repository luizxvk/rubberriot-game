// Nascimento na escolta (08/11, pedido dele: gente nascendo no muro e em cima do tunel). Uso: node scripts/spawn-esc-test.mjs
// Sorteia milhares de nascimentos nos 2 mapas, nos 2 times e em todo o trilho. Acusa quem nasce dentro de caixa/muro ou em cima de estrutura.
import { getMap } from '../shared/map.js';
import { escInit, escSpawn, trackAt, trackOf } from '../shared/escort.js';
import { floorAt } from '../shared/nav.js';
let fail = 0;
const inside = (M, x, y, z, r = 0.42, h = 1.7) => M.boxes.some(b => x + r > b.min[0] && x - r < b.max[0] && z + r > b.min[2] && z - r < b.max[2] && y + 0.15 < b.max[1] && y + h > b.min[1]);
for (const id of ['bonde', 'apito']) {
  const M = getMap(id), T = trackOf(M); let n = 0, stuck = 0, high = 0, ex = null;
  const c = { M }; escInit(c);
  for (let i = 0; i < 4000; i++) {
    c.esc.d = Math.random() * T.len; c.esc.next = c.esc.cps.filter(q => q <= c.esc.d).length; c.esc.atk = i % 2 ? 'red' : 'blue';
    const team = i % 3 ? 'red' : 'blue', [x, z] = escSpawn(c, team), y = floorAt(M, x, z); n++;
    if (inside(M, x, y, z)) { stuck++; ex ||= [x, y, z, team]; }
    let lo = Infinity; for (let d = 0; d <= T.len; d += 2) { const p = trackAt(M, d); if (Math.hypot(p.x - x, p.z - z) < 16) lo = Math.min(lo, floorAt(M, p.x, p.z)); }
    if (y > lo + 2.2) { high++; ex ||= [x, y, z, team, 'alto']; }
  }
  console.log(id, 'nascimentos', n, 'presos', stuck, 'em cima de estrutura', high, ex ? JSON.stringify(ex) : ''); fail += stuck + high;
}
console.log(fail ? fail + ' FALHA(S)' : 'TUDO CERTO'); process.exit(fail ? 1 : 0);
