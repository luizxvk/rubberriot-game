// Danças sem tremida (05/11, pedido dele): anda cada dança a 60 quadros por segundo por 3 voltas e mede o quanto cada parte salta de um
// quadro pro outro, inclusive na emenda do fim com o comeco e na troca entre danças. Uso: node scripts/danca-test.mjs
import { DANCES, dancePose, danceLen, restPose, mixPose } from '../src/dances.js';
let f = 0; const ok = (c, m) => { if (!c) { console.log('FALHA ' + m); f++; } };
const DT = 1 / 60, V_LIM = 0.24, BODY_LIM = 0.16, ROT_LIM = 0.32;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const angle = (a, b) => { const d = ((a - b) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return Math.abs(d); };
const SH = { R: [0.36, 1.32, 0], L: [-0.36, 1.32, 0] };
function jumps(prev, P, tag) { // devolve o maior salto de cada grupo
  const hand = Math.max(dist(prev.hR, P.hR), dist(prev.hL, P.hL)), elbow = Math.max(dist(prev.cR, P.cR), dist(prev.cL, P.cL)), foot = Math.max(dist(prev.fR, P.fR), dist(prev.fL, P.fL)), kn = Math.max(dist(prev.kR, P.kR), dist(prev.kL, P.kL));
  const body = Math.max(Math.abs((prev.y || 0) - (P.y || 0)), Math.abs((prev.x || 0) - (P.x || 0)), Math.abs((prev.z || 0) - (P.z || 0)));
  const rot = Math.max(angle(prev.turn || 0, P.turn || 0), angle(prev.lean || 0, P.lean || 0), Math.abs((prev.tilt || 0) - (P.tilt || 0)), ...P.head.map((v, i) => Math.abs(v - prev.head[i])));
  ok(hand <= V_LIM, `${tag}: mao salta ${hand.toFixed(3)} m num quadro`); ok(elbow <= V_LIM, `${tag}: cotovelo salta ${elbow.toFixed(3)}`); ok(foot <= V_LIM, `${tag}: pe salta ${foot.toFixed(3)}`); ok(kn <= V_LIM, `${tag}: joelho salta ${kn.toFixed(3)}`);
  ok(body <= BODY_LIM, `${tag}: corpo salta ${body.toFixed(3)}`); ok(rot <= ROT_LIM, `${tag}: giro salta ${rot.toFixed(3)} rad`);
  return { hand, foot, body, rot };
}
const rows = [];
for (const id of Object.keys(DANCES)) {
  const L = danceLen(id); let prev = dancePose(id, 0), mH = 0, mF = 0, minFoot = 9, reach = 0, leg = 0, bad = 0;
  for (let t = DT; t < L * 3; t += DT) {
    const P = dancePose(id, t), j = jumps(prev, P, id + ' t=' + t.toFixed(2)); mH = Math.max(mH, j.hand); mF = Math.max(mF, j.foot);
    for (const v of Object.values(P)) if (Array.isArray(v) ? v.some(x => !Number.isFinite(x)) : typeof v === 'number' && !Number.isFinite(v)) bad++;
    minFoot = Math.min(minFoot, P.fR[1], P.fL[1]);
    reach = Math.max(reach, dist(P.hR, SH.R), dist(P.hL, SH.L));
    // perna: do quadril (com o corpo deslocado) ate o pe
    const hipY = 0.72 + (P.y || 0), ft = P.footTurn || 0, fc = Math.cos(ft), fs = Math.sin(ft), tu = P.turn || 0, world = (f) => [f[0] * fc + f[2] * fs, f[1], -f[0] * fs + f[2] * fc], hip = (s) => [(P.x || 0) + s * 0.17 * Math.cos(tu), hipY, (P.z || 0) - s * 0.17 * Math.sin(tu)], len = (f, s) => { const w = world(f), h = hip(s); return Math.hypot(w[0] - h[0], w[1] - h[1], w[2] - h[2]); }; if (!P.tuck && Math.abs(P.lean || 0) < 0.8) leg = Math.max(leg, len(P.fR, 1), len(P.fL, -1));
    prev = P;
  }
  ok(!bad, id + ': conta invalida');
  ok(minFoot >= 0.09, id + ': pe atravessa o chao ' + minFoot.toFixed(3));
  ok(reach <= 1.35, id + ': braco estica demais ' + reach.toFixed(2));
  ok(leg <= 1.2, id + ': perna estica demais ' + leg.toFixed(2));
  // emenda: o fim encosta no comeco
  ok(dist(dancePose(id, L - DT).hR, dancePose(id, L).hR) <= V_LIM, id + ': emenda do ciclo');
  ok(L >= 3.5 && L <= 11, id + ': duracao fora do podio ' + L.toFixed(1));
  rows.push(`${id.padEnd(12)} ${L.toFixed(1)} s  mao ${mH.toFixed(3)}  pe ${mF.toFixed(3)}  braco ${reach.toFixed(2)}  perna ${leg.toFixed(2)}`);
}
// descanso -> dança e fim da dança -> descanso: a mistura nao pode saltar, em nenhum instante e em nenhuma dança
for (const id of Object.keys(DANCES)) {
  const L = danceLen(id); let prev = null;
  for (let t = 0; t <= 0.5; t += DT) { const k = Math.min(1, t / 0.35), s = k * k * (3 - 2 * k), P = mixPose(dancePose(id, L + t), restPose(t, 0), s); if (prev) jumps(prev, P, id + ' -> descanso t=' + t.toFixed(2)); prev = P; }
  for (const o of ['charleston', 'piao', 'sapateado']) { if (o === id) continue; prev = null; for (const at of [0.6, 1.7, 2.9]) { prev = null; for (let t = 0; t <= 0.3; t += DT) { const k = Math.min(1, t / 0.3), s = k * k * (3 - 2 * k), P = mixPose(dancePose(o, at + t), dancePose(id, t), s); if (prev) jumps(prev, P, `${o} -> ${id} em ${at}s t=${t.toFixed(2)}`); prev = P; } } }
}
console.log(rows.join('\n'));
console.log(f ? f + ' FALHA(S)' : 'TUDO CERTO: ' + Object.keys(DANCES).length + ' danças sem salto');
process.exit(f ? 1 : 0);
