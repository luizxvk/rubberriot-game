// Fotos do seletor de mapas (08/11, pedido dele: angulo apresentavel, rente ao chao, mostrando parte do mapa).
// Uso, com o dev no ar em 5197: node tools/fotos-mapas.mjs [mapas]  -> public/maps/<id>.jpg (640x360)
// Procura o ponto sozinho: em volta das zonas, bases e do centro, camera a 2 m, livre de parede, olhando pra area com mais coisa a vista.
import { createRequire } from 'module';
import fs from 'fs';
import { getMap, raycast, MAP_IDS, hasLOS } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';
const require = createRequire('file:///D:/Desktop/fokusstudios/template-magazine/package.json');
const { chromium } = require('playwright');
const OVERRIDE = { trapiche: { c: [-2.6, 2, -23], t: [1, 2.4, 14] }, xilindro: { c: [-2.4, 2, -21], t: [1.5, 2.6, 6] }, estaleiro: { c: [-19, 2, 11], t: [6, 2.2, -3] }, bonde: { c: [14, 2, 30], t: [20, 1.6, -8] } }; // { mapa: { c: [x,y,z], t: [x,y,z] } }: ajuste manual de um mapa
function bestView(M) {
  const anchors = [...(M.zones || []).map(z => z.pos), ...Object.values(M.flagBase || {}), [0, 0, 0]];
  let best = null;
  for (const a of anchors) for (let k = 0; k < 16; k++) for (const d of [9, 13, 18]) {
    const ang = k / 16 * Math.PI * 2, x = a[0] + Math.cos(ang) * d, z = a[2] + Math.sin(ang) * d;
    if (Math.abs(x) > M.arena - 3 || Math.abs(z) > M.arena - 3 || !standable(M, x, z)) continue;
    const y = floorAt(M, x, z) + 2; if (y > 3.2) continue;
    const tgt = [a[0], Math.max(1.2, floorAt(M, a[0], a[2]) + 1.4), a[2]];
    if (!hasLOS(M, [x, y, z], tgt)) continue;
    const yaw = Math.atan2(tgt[0] - x, tgt[2] - z);
    let open = 0, near = 0, seen = 0, score = 0;
    for (let f = -6; f <= 6; f++) {
      const q = yaw + f * 0.13, dir = [Math.sin(q), -0.01, Math.cos(q)], r = raycast(M, [x, y, z], dir, 70).dist;
      open += Math.min(r, 45); if (r < 8) near++;
      for (const up of [-0.16, 0.35, 0.7]) if (raycast(M, [x, y, z], [Math.sin(q) * Math.cos(up), Math.sin(up), Math.cos(q) * Math.cos(up)], 9).dist < 9 - 1e-3) near++; // nada de viga, mesa ou caixote colado na lente
    }
    if (near) continue;
    const fx = Math.sin(yaw), fz = Math.cos(yaw), kinds = new Set();
    for (const b of M.boxes) { if (['tier', 'roof', 'step', 'wall'].includes(b.kind)) continue; const bx = (b.min[0] + b.max[0]) / 2 - x, bz = (b.min[2] + b.max[2]) / 2 - z, along = bx * fx + bz * fz; if (along < 6 || along > 45 || Math.abs(bx * fz - bz * fx) > along * 0.75) continue; seen++; kinds.add(b.kind); }
    score = Math.min(seen, 26) + kinds.size * 3 + open / 18;
    if (!best || score > best.score) best = { score, c: [x, y, z], t: tgt };
  }
  return best;
}
const list = process.argv[2] ? process.argv[2].split(',') : MAP_IDS;
fs.mkdirSync('public/maps', { recursive: true });
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
for (const id of list) {
  const M = getMap(id), v = OVERRIDE[id] || bestView(M);
  if (!v) { console.log(id, 'SEM PONTO'); continue; }
  const s = (a) => a.map(n => n.toFixed(2)).join(',');
  await p.goto(`http://localhost:5197/tools/mapa.html?m=${id}&c=${s(v.c)}&t=${s(v.t)}&w=6${id === 'tinteiro' ? '&b=4' : ''}`);
  await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 120000 });
  await p.screenshot({ path: `public/maps/${id}.jpg`, type: 'jpeg', quality: 74 });
  console.log(id, 'camera', s(v.c), 'alvo', s(v.t), 'nota', v.score?.toFixed(1), Math.round(fs.statSync(`public/maps/${id}.jpg`).size / 1024) + ' KB');
}
await b.close();
