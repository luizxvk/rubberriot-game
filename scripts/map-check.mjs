// Confere um mapa novo sem abrir o jogo: nascimentos, zonas e bandeiras em chao de verdade, rota a pe entre tudo e trilho livre.
// Uso: node scripts/map-check.mjs [mapa ...]
import { getMap, MAP_IDS } from '../shared/map.js';
import { standable, navPath, floorAt } from '../shared/nav.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : MAP_IDS;
let ruim = 0;
for (const id of ids) {
  const M = getMap(id), er = [], c = {};
  for (const b of M.boxes) c[b.kind] = (c[b.kind] || 0) + 1;
  const P = (x, z) => [x, floorAt(M, x, z), z];
  for (const [t, L] of Object.entries(M.spawns)) L.forEach(([x, z], i) => { if (!standable(M, x, z)) er.push(`nascimento ${t}[${i}] (${x}, ${z}) sem chao`); });
  const goals = [...M.zones.map(q => ['zona ' + q.id, q.pos]), ...Object.entries(M.flagBase).map(([t, p]) => ['bandeira ' + t, p])];
  for (const [n, p] of goals) if (!standable(M, p[0], p[2])) er.push(`${n} (${p[0]}, ${p[2]}) sem chao`);
  for (const t of ['red', 'blue']) { const s = M.spawns[t][0]; for (const [n, p] of goals) { const r = navPath(M, P(s[0], s[1]), P(p[0], p[2])); if (!r) er.push(`sem rota: ${t} -> ${n}`); } }
  M.pickups.forEach(p => { if (p.pos[1] < 0.1 && !standable(M, p.pos[0], p.pos[2])) er.push(`item ${p.kind} (${p.pos[0]}, ${p.pos[2]}) sem chao`); });
  if (M.track) {
    const T = M.track; let bloq = 0;
    for (let i = 1; i < T.length; i++) { const [ax, az] = T[i - 1], [bx, bz] = T[i], L = Math.hypot(bx - ax, bz - az); for (let s = 0; s <= L; s += 1) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; for (const b of M.boxes) if (b.min[1] < 4 && b.max[1] > 0.3 && x > b.min[0] - 1.6 && x < b.max[0] + 1.6 && z > b.min[2] - 1.6 && z < b.max[2] + 1.6) { bloq++; if (bloq < 6) er.push(`trilho encosta em ${b.kind} perto de (${x.toFixed(0)}, ${z.toFixed(0)})`); } } }
    if (bloq >= 6) er.push(`trilho bloqueado em ${bloq} pontos`);
  }
  console.log(`${er.length ? 'RUIM' : 'ok  '} ${id}: arena ${M.arena}, ${M.boxes.length} caixas, ${c.hwall ? Math.round((c.table || 0)) + ' moveis de casa' : 'sem casa de entrar'} ${JSON.stringify(c)}`);
  er.slice(0, 14).forEach(e => console.log('   - ' + e)); if (er.length > 14) console.log(`   ... +${er.length - 14}`);
  ruim += er.length;
}
process.exitCode = ruim ? 1 : 0;
