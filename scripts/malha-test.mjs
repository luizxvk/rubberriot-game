// Malha das danças (05/11, pedido dele: mão no peito, braço curto, braço some no corpo). Anda as 30 danças a 60 quadros por segundo
// e mede, no espaço do corpo: mão dentro do tronco ou da cabeça, tubo do braço dentro do corpo, mão colada no ombro e dobra fechada
// demais na mangueira (raio de curva menor que o raio do tubo = a malha se dobra sobre ela mesma). Uso: node scripts/malha-test.mjs [-v]
import { DANCES, dancePose, danceLen } from '../src/dances.js';
const V = process.argv.includes('-v'), DT = 1 / 60, SH = { R: [0.36, 1.32, 0], L: [-0.36, 1.32, 0] };
const TORSO = { c: [0, 1.05, 0], r: [0.42, 0.483, 0.378] }, HEAD = { c: [0, 1.62, 0], r: [0.36, 0.36, 0.36] };
const HOSE_R = 0.072, HAND_R = 0.12, SHORT = 0.38;
// quanto o ponto entrou no elipsoide somado a folga (0 = fora)
const depth = (p, E, m) => { const d = Math.hypot((p[0] - E.c[0]) / (E.r[0] + m), (p[1] - E.c[1]) / (E.r[1] + m), (p[2] - E.c[2]) / (E.r[2] + m)); return d < 1 ? (1 - d) * Math.min(...E.r) : 0; };
const bez = (a, c, b, u) => a.map((_, i) => (1 - u) * (1 - u) * a[i] + 2 * (1 - u) * u * c[i] + u * u * b[i]);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function minCurve(a, c, b) { // menor raio de curva da mangueira, nos mesmos 10 anéis da malha
  let lo = 9; for (let i = 1; i < 10; i++) {
    const p0 = bez(a, c, b, (i - 1) / 10), p1 = bez(a, c, b, i / 10), p2 = bez(a, c, b, (i + 1) / 10), v = sub(p1, p0), w = sub(p2, p1), lv = Math.hypot(...v), lw = Math.hypot(...w);
    if (lv < 1e-6 || lw < 1e-6) continue;
    const dot = (v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) / lv / lw, ang = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (ang > 1e-3) lo = Math.min(lo, (lv + lw) / 2 / ang);
  }
  return lo;
}
let total = 0; const rows = [];
for (const id of Object.keys(DANCES)) {
  const L = danceLen(id), S = { handIn: 0, tubeIn: 0, short: 0, fold: 0, handD: 0, tubeD: 0, minSh: 9, minR: 9 }; let n = 0;
  for (let t = 0; t < L; t += DT) {
    const P = dancePose(id, t); n++;
    for (const [s, h, c] of [['R', P.hR, P.cR], ['L', P.hL, P.cL]]) {
      const a = SH[s], hd = Math.max(depth(h, TORSO, HAND_R), depth(h, HEAD, HAND_R));
      if (hd > 0.005) S.handIn++; S.handD = Math.max(S.handD, hd);
      let td = 0; for (const u of [0.3, 0.4, 0.5, 0.6, 0.7, 0.85]) { const p = bez(a, c, h, u); td = Math.max(td, depth(p, TORSO, HOSE_R), depth(p, HEAD, HOSE_R)); }
      if (td > 0.005) S.tubeIn++; S.tubeD = Math.max(S.tubeD, td);
      const ds = dist(a, h); if (ds < SHORT - 0.005) S.short++; S.minSh = Math.min(S.minSh, ds);
      const r = minCurve(a, c, h); if (r < HOSE_R) S.fold++; S.minR = Math.min(S.minR, r);
    }
  }
  const pc = (x) => (100 * x / (n * 2)).toFixed(0).padStart(3) + '%', bad = S.handIn || S.tubeIn || S.short || S.fold;
  if (bad) total++;
  rows.push(`${bad ? 'FALHA' : 'ok   '} ${id.padEnd(12)} mão dentro ${pc(S.handIn)} (${S.handD.toFixed(2)})  tubo dentro ${pc(S.tubeIn)} (${S.tubeD.toFixed(2)})  colada ${pc(S.short)} (${S.minSh.toFixed(2)})  dobra ${pc(S.fold)} (${S.minR.toFixed(3)})`);
}
if (V || total) console.log(rows.join('\n'));
console.log(total ? total + ' de ' + rows.length + ' DANÇAS COM MALHA RUIM' : 'TUDO CERTO: ' + rows.length + ' danças sem braço dentro do corpo');
process.exit(total ? 1 : 0);
