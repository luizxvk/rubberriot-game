// Pulo do Gato (19/11): confere os 5 percursos. Pulo do jogo: 1,14 m de altura, ~5,9 m correndo.
// Regra: vao entre bordas <= 5,2 m, subida <= 0,9 m (subindo > 0,45 m: vao <= 4,2 m). node scripts/bhop-check.mjs
import { getMap, BHOP_MAPS } from '../shared/map.js';
let bad = 0;
for (const id of BHOP_MAPS) {
  const M = getMap(id), P = M.boxes.filter(b => /^bh/.test(b.kind)).map(b => ({ k: b.kind, min: b.min, max: b.max, y: b.max[1] }));
  let maxGap = 0, maxRise = 0, len = 0; const errs = [];
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i];
    const gx = Math.max(0, b.min[0] - a.max[0], a.min[0] - b.max[0]), gz = Math.max(0, b.min[2] - a.max[2], a.min[2] - b.max[2]), gap = Math.hypot(gx, gz), rise = b.y - a.y;
    len += Math.hypot((a.min[0] + a.max[0]) / 2 - (b.min[0] + b.max[0]) / 2, (a.min[2] + a.max[2]) / 2 - (b.min[2] + b.max[2]) / 2);
    maxGap = Math.max(maxGap, gap); maxRise = Math.max(maxRise, rise);
    if (gap > 5.25 || rise > 0.95 || (rise > 0.45 && gap > 4.25) || gap < 0.8) errs.push(`#${i} vao ${gap.toFixed(2)} subida ${rise.toFixed(2)}`);
    for (const c of [b.min[0], b.max[0], b.min[2], b.max[2]]) if (Math.abs(c) > M.arena) errs.push(`#${i} fora do mapa`);
  }
  // nada cruzando outra plataforma
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j]; if (a.min[0] < b.max[0] && b.min[0] < a.max[0] && a.min[2] < b.max[2] && b.min[2] < a.max[2]) errs.push(`#${i} cruza #${j}`); }
  bad += errs.length;
  console.log(id.padEnd(10), P.length, 'pecas', 'percurso', Math.round(len), 'm', 'vao max', maxGap.toFixed(2), 'subida max', maxRise.toFixed(2), 'altura', Math.min(...P.map(p => p.y)).toFixed(1) + '-' + Math.max(...P.map(p => p.y)).toFixed(1), errs.length ? 'ERROS: ' + errs.slice(0, 6).join('; ') : 'ok');
}
process.exit(bad ? 1 : 0);
