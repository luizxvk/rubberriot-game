// Mede a variedade das rotas dos bots (09/11): node tools/sim-rotas.mjs [mapas...]
// cobertura = % das celulas de 8 m andaveis por onde algum bot passou; viagens = rotas distintas; parado = % do tempo sem andar.
import { Core } from '../shared/core.js';
import { getMap } from '../shared/map.js';
import { standable } from '../shared/nav.js';
const maps = process.argv.slice(2).length ? process.argv.slice(2) : ['becos', 'feira', 'largo', 'cortejo'];
for (const map of maps) for (const mode of map === 'cortejo' ? ['escort', 'tdm'] : ['dom', 'ctf']) {
  const M = getMap(map), core = new Core({ mode, map, bots: 11, difficulty: 1, lobby: false, send: () => {} }), A = M.arena, cells = new Set(), rotas = new Set(), last = new Map(), dt = 1 / 30, SEC = 180;
  let total = 0; for (let x = -A; x < A; x += 8) for (let z = -A; z < A; z += 8) if (standable(M, x + 4, z + 4)) total++;
  let parado = 0, amostras = 0, altos = 0;
  for (let i = 0; i < SEC / dt; i++) {
    core.tick(dt);
    if (i % 15) continue;
    for (const p of core.players.values()) {
      if (!p.alive || !p.ai) continue;
      amostras++; cells.add(Math.floor(p.pos[0] / 8) + ':' + Math.floor(p.pos[2] / 8)); if (p.pos[1] > 2.5) altos++;
      const l = last.get(p.id); if (l && Math.hypot(l[0] - p.pos[0], l[1] - p.pos[2]) < 0.5) parado++; last.set(p.id, [p.pos[0], p.pos[2]]);
      const rr = p.ai.route?.length ? p.ai.route : p.ai.objVias; if (rr?.length) rotas.add(rr.map(q => Math.round(q[0] / 10) + ',' + Math.round(q[2] / 10)).join('>'));
    }
  }
  console.log(map.padEnd(9), mode.padEnd(4), 'cobertura', (cells.size / total * 100).toFixed(0) + '%', 'rotas', rotas.size, 'parado', (parado / amostras * 100).toFixed(0) + '%', 'no alto', (altos / amostras * 100).toFixed(0) + '%');
}
