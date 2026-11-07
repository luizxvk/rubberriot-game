// Escadas viradas (06/11, pedido dele: a escada da varanda do forte subia de costas pra ela). Pra cada lance de degraus
// ('step') de cada mapa: acha o degrau de cima e olha 0,7 m adiante, na direcao em que ele sobe. Tem que haver piso
// (topo de alguma caixa) entre 0,2 abaixo e 0,65 acima do ultimo degrau. Sem piso adiante = escada que nao leva a lugar
// nenhum; se o piso estiver atras do degrau de baixo = escada de costas. Uso: node scripts/stair-check.mjs [-v]
import { getMap } from '../shared/map.js';
const IDS = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria', 'ilha', 'bonde', 'apito', 'ferradura', 'tinteiro', 'deserto', 'docas', 'moeda'];
const V = process.argv.includes('-v');
const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0.01;
let bad = 0;
for (const id of IDS) {
  const M = getMap(id), steps = M.boxes.filter(b => b.kind === 'step'), solid = M.boxes.filter(b => b.kind !== 'step') // 'tier' entra: e a colisao das pecas redondas (caixa d'agua);
  // vizinho de cima: degrau encostado (mesma faixa) e um tico mais alto
  const up = (s) => steps.find(t => t !== s && t.max[1] > s.max[1] + 0.05 && t.max[1] < s.max[1] + 0.95 && t.min[1] <= s.max[1] + 0.05 && (
    (Math.abs(t.min[0] - s.max[0]) < 0.02 || Math.abs(t.max[0] - s.min[0]) < 0.02) && ov(t.min[2], t.max[2], s.min[2], s.max[2]) ||
    (Math.abs(t.min[2] - s.max[2]) < 0.02 || Math.abs(t.max[2] - s.min[2]) < 0.02) && ov(t.min[0], t.max[0], s.min[0], s.max[0])));
  const hasUp = new Set(), down = new Map();
  for (const s of steps) { const u = up(s); if (u) { hasUp.add(s); down.set(u, s); } }
  for (const top of steps) {
    if (hasUp.has(top) || !down.has(top)) continue; // so o topo de lances com 2+ degraus
    let bot = top, n = 1; while (down.has(bot)) { bot = down.get(bot); n++; }
    const prev = down.get(top), dx = Math.sign(Math.round((top.min[0] + top.max[0] - prev.min[0] - prev.max[0]) * 10)), dz = Math.sign(Math.round((top.min[2] + top.max[2] - prev.min[2] - prev.max[2]) * 10));
    const H = top.max[1], probe = (b, sgn) => { // faixa de 0,7 m saindo da face do degrau b no sentido sgn
      const x0 = dx ? (sgn * dx > 0 ? b.max[0] : b.min[0] - 0.7) : b.min[0], x1 = dx ? (sgn * dx > 0 ? b.max[0] + 0.7 : b.min[0]) : b.max[0];
      const z0 = dz ? (sgn * dz > 0 ? b.max[2] : b.min[2] - 0.7) : b.min[2], z1 = dz ? (sgn * dz > 0 ? b.max[2] + 0.7 : b.min[2]) : b.max[2];
      return solid.find(o => ov(o.min[0], o.max[0], x0, x1) && ov(o.min[2], o.max[2], z0, z1) && o.max[1] >= H - 0.2 && o.max[1] <= H + 0.65 && o.min[1] <= H + 0.05);
    };
    const fwd = probe(top, 1), back = probe(bot, -1);
    const ok = !!fwd;
    if (!ok || V) console.log((ok ? 'ok  ' : 'RUIM') + ' ' + id.padEnd(10) + ` lance de ${n} ate ${H.toFixed(2)} m, topo em (${((top.min[0] + top.max[0]) / 2).toFixed(1)}, ${((top.min[2] + top.max[2]) / 2).toFixed(1)}) subindo pra (${dx}, ${dz})` + (ok ? ' -> ' + fwd.kind : back ? ' -> DE COSTAS (o piso ' + back.kind + ' esta atras do 1o degrau)' : ' -> nao leva a nada'));
    if (!ok) bad++;
  }
}
console.log(bad ? bad + ' escada(s) errada(s)' : 'escadas ok');
process.exit(bad ? 1 : 0);
