// Dancas de vitoria (POC 05/11, pedido dele). Nao tem esqueleto: cada dança so diz onde ficam mao, cotovelo, pe e joelho a cada
// batida e as mangueiras ligam tudo (ombro -> mao, quadril -> pe), entao mao e pe nunca soltam do corpo. Pe vem no espaco do chao
// (fica plantado mesmo com o corpo inclinado); mao e cotovelo vem no espaco do corpo. Frente do boneco = -z.
import * as THREE from 'three';

const sm = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => a + (b - a) * k;
const mixV = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const key = (arr, b) => { const n = arr.length, i = Math.floor(b), f = b - i, m = ((i % n) + n) % n; return mix(arr[m], arr[(m + 1) % n], sm(f)); };
const FOOT = 0.1, PI = Math.PI;

// Charleston, a danca da epoca: pisa na frente, chuta, pisa atras, bate o pe atras; os bracos vao ao contrario das pernas
function charleston(b) {
  const zR = key([-0.34, -0.12, 0.05, 0.46], b), yR = FOOT + key([0, 0, 0, 0.2], b);
  const zL = key([0.1, -0.62, 0.12, 0.02], b), yL = FOOT + key([0.04, 0.42, 0, 0], b);
  const twist = Math.sin(b * PI), hop = Math.abs(Math.cos(b * PI));
  const armR = key([0.3, -0.5, -0.36, 0.3], b), armL = key([-0.5, 0.3, 0.3, -0.36], b);
  return {
    y: -0.1 * hop + 0.03, lean: key([-0.14, 0.08, 0.14, -0.1], b), turn: Math.sin(b * PI / 2) * 0.32, tilt: key([0.05, -0.08, -0.05, 0.08], b), sq: 1 + (hop - 0.5) * -0.1,
    head: [0.06, -Math.sin(b * PI / 2) * 0.3, Math.sin(b * PI / 2) * 0.16],
    hR: [0.56, key([0.98, 1.38, 1.28, 0.96], b), armR], cR: [0.78, 1.14, armR * 0.25 + 0.08], hL: [-0.56, key([1.38, 0.98, 0.96, 1.28], b), armL], cL: [-0.78, 1.14, armL * 0.25 + 0.08],
    fR: [0.2 + twist * 0.05, yR, zR], kR: [0.27 + twist * 0.16, 0.5 + yR * 0.5, zR * 0.5 - 0.2], sR: [key([0, 0, -0.2, 0.7], b), twist * 0.75],
    fL: [-0.2 + twist * 0.05, yL, zL], kL: [-0.27 + twist * 0.16, 0.5 + yL * 0.5, zL * 0.5 - 0.2], sL: [key([0, -0.7, 0, 0], b), twist * 0.75],
  };
}

// Macarrao: bracos e pernas de borracha em onda; o corpo vai de um lado pro outro e a onda chega atrasada na ponta da mao
function macarrao(b) {
  const w = b * PI / 2, A = sm(key([1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0], b % 16)); // metade com os bracos pra cima, metade soltos
  const swR = Math.sin(w * 2), swL = Math.sin(w * 2 + PI);
  const up = (s, ph) => [s * (0.5 + Math.sin(w + ph) * 0.26), 1.95 + Math.cos(w * 2 + ph) * 0.14, -0.08 + Math.sin(w + ph) * 0.1];
  const upC = (s, ph) => [s * (0.9 + Math.sin(w + ph - 1.2) * 0.3), 1.42 + Math.sin(w * 2 + ph - 1.2) * 0.22, 0.06];
  const low = (s, ph) => [s * (0.72 + Math.sin(w * 2 + ph) * 0.14), 0.82 + Math.sin(w * 2 + ph) * 0.2, -0.34 + Math.cos(w + ph) * 0.28];
  const lowC = (s, ph) => [s * (0.98 + Math.sin(w * 2 + ph - 1.3) * 0.2), 1.3 + Math.cos(w * 2 + ph - 1.3) * 0.22, 0.1];
  return {
    x: Math.sin(w) * 0.13, y: -0.14 + Math.abs(Math.sin(w * 2)) * 0.09, tilt: -Math.sin(w) * 0.24, lean: Math.sin(w * 2) * 0.05, turn: Math.sin(w / 2) * 0.22, sq: 1 + Math.sin(w * 2) * 0.09,
    head: [Math.sin(w * 2 + 0.8) * 0.12, Math.sin(w) * 0.32, Math.sin(w + 0.9) * 0.28],
    hR: mixV(low(1, 0), up(1, 0), A), cR: mixV(lowC(1, 0), upC(1, 0), A), hL: mixV(low(-1, PI), up(-1, PI), A), cL: mixV(lowC(-1, PI), upC(-1, PI), A),
    fR: [0.38, FOOT + Math.max(0, swR) * 0.2, -0.05], kR: [0.62 + swR * 0.2, 0.5 + Math.max(0, swR) * 0.2, -0.26], sR: [-Math.max(0, swR) * 0.7, 0.35],
    fL: [-0.38, FOOT + Math.max(0, swL) * 0.2, -0.05], kL: [-0.62 + swL * 0.2, 0.5 + Math.max(0, swL) * 0.2, -0.26], sL: [-Math.max(0, swL) * 0.7, -0.35],
  };
}

// Sapateado: bate os pes, uma mao na cintura, a outra tira o chapeu; no fim sobe girando e abre os bracos (ta-da!)
function sapateado(b) {
  const p = ((b % 16) + 16) % 16;
  const spin = sm((p - 11.5) / 2), tada = sm((p - 13) / 0.6) * (1 - sm((p - 15.4) / 0.6)), tap = Math.max(1 - Math.max(sm((p - 11) / 0.6), tada), sm((p - 15.2) / 0.8)); // no fim volta pro passo, pra emendar sem salto
  const tipK = sm((p - 3.2) / 0.5) * (1 - sm((p - 7) / 0.8)) * tap; // leva a mao no chapeu
  const arc = Math.sin(Math.min(1, Math.max(0, (p - 11.6) / 2)) * PI);
  const tR = Math.sin(b * PI), tL = Math.sin(b * PI + PI), sh = Math.sin(b * PI / 2);
  const zR = tap * (-0.1 + Math.sin(b * PI / 2) * 0.24), zL = tap * (0.02 - Math.sin(b * PI / 2) * 0.24);
  const hipR = [0.42, 1.02, 0.1], hipRC = [0.72, 1.16, 0.14], hipL = [-0.42, 1.02, 0.1], hipLC = [-0.72, 1.16, 0.14];
  const hat = [0.34 + sh * 0.08, 2.02 + Math.sin(b * PI) * 0.05, -0.22], hatC = [0.78, 1.72, 0.05];
  const open = (s) => [s * 0.92, 1.72 + Math.sin(b * PI * 3) * 0.02, -0.12], openC = (s) => [s * 0.68, 1.22, 0.14];
  const wind = (s) => [s * 0.3, 1.5, -0.25], windC = (s) => [s * 0.72, 1.36, 0.08];
  const toSpin = sm((p - 11) / 0.8) * (1 - tada) * (1 - sm((p - 15.3) / 0.7)); // volta pra cintura antes de recomeçar
  let hR = mixV(hipR, hat, tipK), cR = mixV(hipRC, hatC, tipK), hL = hipL, cL = hipLC;
  hR = mixV(mixV(hR, wind(1), toSpin), open(1), tada); cR = mixV(mixV(cR, windC(1), toSpin), openC(1), tada);
  hL = mixV(mixV(hL, wind(-1), toSpin), open(-1), tada); cL = mixV(mixV(cL, windC(-1), toSpin), openC(-1), tada);
  const hopFoot = (tap < 0.5 ? FOOT : FOOT) + arc * 0.32;
  return {
    y: -0.08 * tap + arc * 0.42 + Math.abs(Math.cos(b * PI)) * -0.03 * tap, turn: spin * PI * 2 + sh * 0.14 * tap, footTurn: spin * PI * 2, lean: tada * 0.08 - 0.04 * tap, tilt: sh * 0.07 * tap, sq: 1 + arc * 0.12 - tada * 0.03,
    head: [-tipK * 0.08 + tada * 0.12, sh * 0.2 * tap, tipK * 0.1 - sh * 0.1 * tap], hatLift: tipK * 0.34 * (0.7 + Math.max(0, Math.sin(b * PI)) * 0.3),
    hR, cR, hL, cL,
    fR: [0.22 + sh * 0.03 * tap, hopFoot + Math.max(0, tR) * 0.15 * tap, zR], kR: [0.34, 0.5 + arc * 0.35 + Math.max(0, tR) * 0.1, -0.24], sR: [-Math.max(0, tR) * 0.65 * tap - arc * 0.4, 0.15],
    fL: [-0.22 + sh * 0.03 * tap, hopFoot + Math.max(0, tL) * 0.15 * tap, zL], kL: [-0.34, 0.5 + arc * 0.35 + Math.max(0, tL) * 0.1, -0.24], sL: [-Math.max(0, tL) * 0.65 * tap - arc * 0.4, -0.15],
  };
}


// ---------- leva de 15 (05/11, pedido dele). Toda dança fecha o ciclo no mesmo ponto: scripts/danca-test.mjs mede cada quadro ----------
const base = (o) => ({ y: 0, lean: 0, turn: 0, tilt: 0, sq: 1, head: [0, 0, 0], hR: [0.52, 0.95, -0.1], cR: [0.72, 1.12, 0.05], hL: [-0.52, 0.95, -0.1], cL: [-0.72, 1.12, 0.05], fR: [0.22, FOOT, 0], kR: [0.31, 0.45, -0.2], sR: [0, 0.1], fL: [-0.22, FOOT, 0], kL: [-0.31, 0.45, -0.2], sL: [0, -0.1], ...o });
const knee = (s, f, out = 0.3, fwd = 0.2) => [s * out, (0.72 + f[1]) / 2, f[2] / 2 - fwd];
const mirror = (v) => [-v[0], v[1], v[2]];
const up = (v) => Math.max(0, v);

function lindy(b) { // passo de balanço: pisa, recua e chuta, um lado de cada vez
  const fR = [0.22, FOOT + key([0, 0, 0, 0.28, 0, 0, 0, 0], b), key([-0.3, 0.05, -0.12, -0.42, 0.12, 0.22, -0.1, 0.1], b)], fL = [-0.22, FOOT + key([0, 0, 0, 0, 0, 0, 0, 0.28], b), key([0.12, 0.22, -0.1, 0.1, -0.3, 0.05, -0.12, -0.42], b)];
  const hop = Math.abs(Math.cos(b * PI)), a = Math.sin(b * PI / 2);
  return base({ y: -0.06 * hop, lean: key([-0.1, 0.04, 0.02, -0.12, 0.04, 0.08, 0.02, -0.06], b), turn: Math.sin(b * PI / 4) * 0.45, tilt: a * 0.08, sq: 1 - (hop - 0.5) * 0.06, head: [0.04, -Math.sin(b * PI / 4) * 0.3, a * 0.12],
    hR: [0.6, 1.15 + a * 0.25, -0.2 - a * 0.25], cR: [0.8, 1.2, 0.05], hL: [-0.6, 1.15 - a * 0.25, -0.2 + a * 0.25], cL: [-0.8, 1.2, 0.05], fR, kR: knee(1, fR), sR: [key([0, 0, 0, -0.5, 0, 0, 0, 0], b), 0.2], fL, kL: knee(-1, fL), sL: [key([0, 0, 0, 0, 0, 0, 0, -0.5], b), -0.2] });
}
function shimmy(b) { // tremidinha: os ombros batem rapido enquanto o corpo desce e sobe devagar
  const s = Math.sin(b * PI * 2), d = Math.sin(b * PI / 8) ** 2;
  return base({ y: -0.04 - 0.2 * d, tilt: s * 0.05, turn: s * 0.1, lean: 0.03, sq: 1 + s * 0.012, head: [0, -s * 0.08, -s * 0.04],
    hR: [0.62, 1.3 + s * 0.05 - d * 0.2, -0.22], cR: [0.82, 1.15, 0.04], hL: [-0.62, 1.3 - s * 0.05 - d * 0.2, -0.22], cL: [-0.82, 1.15, 0.04], fR: [0.3, FOOT, -0.02], kR: [0.46, 0.4 - d * 0.08, -0.24], sR: [0, 0.3], fL: [-0.3, FOOT, -0.02], kL: [-0.46, 0.4 - d * 0.08, -0.24], sL: [0, -0.3] });
}
function cancan(b) { // mao na cintura e perna la em cima, uma de cada vez
  const fR = [0.22, FOOT + key([0, 0.78, 0, 0, 0, 0.18, 0, 0], b), key([0, -0.82, 0, 0.02, 0, -0.3, 0, 0.02], b)], fL = [-0.22, FOOT + key([0, 0.18, 0, 0, 0, 0.78, 0, 0], b), key([0, -0.3, 0, 0.02, 0, -0.82, 0, 0.02], b)];
  const k = key([0, 1, 0, 0, 0, 1, 0, 0], b), side = key([0, 1, 0, 0, 0, -1, 0, 0], b);
  return base({ y: Math.abs(Math.sin(b * PI)) * 0.04, lean: 0.02 + k * 0.16, tilt: side * 0.05, head: [k * 0.08, side * 0.14, -side * 0.05], hR: [0.42, 1.02, 0.1], cR: [0.72, 1.16, 0.14], hL: [-0.42, 1.02, 0.1], cL: [-0.72, 1.16, 0.14], fR, kR: knee(1, fR, 0.27, 0.1), sR: [-(fR[1] - FOOT) * 0.9, 0.1], fL, kL: knee(-1, fL, 0.27, 0.1), sL: [-(fL[1] - FOOT) * 0.9, -0.1] });
}
function polichinelo(b) { // abre e fecha pulando
  const o = 0.5 - 0.5 * Math.cos(b * PI), hop = Math.abs(Math.sin(b * PI)), F = FOOT + hop * 0.15, x = 0.16 + 0.38 * o;
  return base({ y: hop * 0.22 - (1 - hop) * 0.03, sq: 1 + hop * 0.05 - (1 - hop) * 0.03, head: [o * 0.1, 0, 0], hR: mixV([0.46, 0.78, -0.08], [0.3, 2.08, -0.1], o), cR: mixV([0.62, 1.02, 0.02], [0.82, 1.75, 0.05], o), hL: mixV([-0.46, 0.78, -0.08], [-0.3, 2.08, -0.1], o), cL: mixV([-0.62, 1.02, 0.02], [-0.82, 1.75, 0.05], o),
    fR: [x, F, 0], kR: [x + 0.14, 0.5 + hop * 0.1, -0.16], sR: [-hop * 0.3, 0.1 + o * 0.3], fL: [-x, F, 0], kL: [-x - 0.14, 0.5 + hop * 0.1, -0.16], sL: [-hop * 0.3, -0.1 - o * 0.3] });
}
function robo(b) { // boneco de corda: anda e para, cada junta num tempo
  const aR = key([0.95, 1.55, 1.55, 0.95, 0.95, 1.55, 0.95, 0.95], b), aL = key([0.95, 0.95, 1.55, 1.55, 0.95, 1.55, 0.95, 0.95], b);
  const fR = [0.22, FOOT + key([0, 0, 0.1, 0, 0, 0, 0, 0], b), key([0, 0, -0.1, -0.2, -0.2, -0.1, 0, 0], b)], fL = [-0.22, FOOT + key([0, 0, 0, 0, 0, 0.1, 0, 0], b), key([0, 0, 0, 0, -0.1, -0.2, -0.1, 0], b)];
  return base({ y: key([0, -0.03, 0, -0.03, 0, -0.03, 0, -0.03], b), turn: key([0, 0.2, 0.2, 0, -0.2, -0.2, 0, 0], b), head: [0, key([0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0], b), 0],
    hR: [0.6, aR, -0.36], cR: [0.62, 1.1, 0.05], hL: [-0.6, aL, -0.36], cL: [-0.62, 1.1, 0.05], fR, kR: knee(1, fR, 0.26, 0.14), sR: [0, 0], fL, kL: knee(-1, fL, 0.26, 0.14), sL: [0, 0] });
}
function deslizada(b) { // os pes deslizam pra tras no chao, um de cada vez, e o corpo fica no lugar
  const sw = Math.sin(b * PI), fR = [0.2, FOOT + up(-sw) * 0.12, key([-0.22, 0.26], b)], fL = [-0.2, FOOT + up(sw) * 0.12, key([0.26, -0.22], b)];
  return base({ x: Math.sin(b * PI / 2) * 0.05, lean: -0.1, tilt: Math.sin(b * PI / 2) * 0.05, head: [0.02, Math.sin(b * PI / 4) * 0.25, 0], sq: 1 + Math.cos(b * PI * 2) * 0.008, y: -0.05,
    hR: [0.52, 0.98, -sw * 0.24], cR: [0.72, 1.1, 0.04], hL: [-0.52, 0.98, sw * 0.24], cL: [-0.72, 1.1, 0.04], fR, kR: knee(1, fR, 0.27, 0.22), sR: [-up(-sw) * 0.5, 0.06], fL, kL: knee(-1, fL, 0.27, 0.22), sL: [-up(sw) * 0.5, -0.06] });
}
function bamboleio(b) { // quadril em circulo, como quem gira um bambole
  const w = b * PI, cs = Math.cos(w), sn = Math.sin(w);
  return base({ x: cs * 0.13, z: sn * 0.1, tilt: -cs * 0.12, lean: sn * 0.08, sq: 1 + Math.sin(w * 2) * 0.02, y: -0.05, head: [0, cs * 0.12, cs * 0.1],
    hR: [0.62 + cs * 0.04, 1.45 + Math.sin(w + 0.6) * 0.1, -0.12], cR: [0.8, 1.3, 0.05], hL: [-0.62 + cs * 0.04, 1.45 + Math.sin(w + 3.7) * 0.1, -0.12], cL: [-0.8, 1.3, 0.05], fR: [0.3, FOOT, -0.02], kR: [0.42, 0.42, -0.22], sR: [0, 0.2], fL: [-0.3, FOOT, -0.02], kL: [-0.42, 0.42, -0.22], sL: [0, -0.2] });
}
function marcha(b) { // joelho alto e braco esticado, virando devagar
  const sw = Math.sin(b * PI), R = up(sw), L = up(-sw), fR = [0.22, FOOT + R * 0.38, -R * 0.24], fL = [-0.22, FOOT + L * 0.38, -L * 0.24];
  return base({ y: -Math.abs(Math.cos(b * PI)) * 0.03, tilt: sw * 0.05, turn: Math.sin(b * PI / 4) * 0.25, head: [0.02, 0, -sw * 0.04], hR: [0.54, 0.98 + L * 0.3, sw * 0.3], cR: [0.7, 1.12, sw * 0.08], hL: [-0.54, 0.98 + R * 0.3, -sw * 0.3], cL: [-0.7, 1.12, -sw * 0.08],
    fR, kR: [0.26, 0.62 + R * 0.35, -0.28 - R * 0.22], sR: [R * 0.3, 0], fL, kL: [-0.26, 0.62 + L * 0.35, -0.28 - L * 0.22], sL: [L * 0.3, 0] });
}
function cossaco(b) { // agachado, bracos cruzados, chutando pra frente
  const sw = Math.sin(b * PI), R = up(sw), L = up(-sw), fR = [0.2, FOOT + R * 0.18, 0.05 - R * 0.6], fL = [-0.2, FOOT + L * 0.18, 0.05 - L * 0.6];
  return base({ y: -0.36 + Math.abs(sw) * 0.05, lean: 0.06, tilt: sw * 0.05, sq: 0.98, head: [0.06, 0, -sw * 0.05], hR: [-0.18, 1.32, -0.38], cR: [0.6, 1.22, -0.22], hL: [0.18, 1.2, -0.38], cL: [-0.6, 1.22, -0.22],
    fR, kR: [0.36, 0.44, -0.26 - R * 0.18], sR: [-R * 0.5, 0.05], fL, kL: [-0.36, 0.44, -0.26 - L * 0.18], sL: [-L * 0.5, -0.05] });
}
function galinha(b) { // cotovelo batendo como asa e a cabeca bicando
  const fl = Math.sin(b * PI * 2), sw = Math.sin(b * PI), fR = [0.26, FOOT + up(sw) * 0.14, -up(sw) * 0.1], fL = [-0.26, FOOT + up(-sw) * 0.14, -up(-sw) * 0.1];
  return base({ y: -0.12 + Math.abs(Math.cos(b * PI)) * 0.04, lean: -0.16, tilt: sw * 0.04, head: [-0.1 - Math.abs(sw) * 0.3, sw * 0.12, 0], hR: [0.26, 1.28, 0.02], cR: [0.86, 1.12 + fl * 0.28, 0.16], hL: [-0.26, 1.28, 0.02], cL: [-0.86, 1.12 + fl * 0.28, 0.16],
    fR, kR: [0.5, 0.44, -0.22], sR: [-up(sw) * 0.4, 0.3], fL, kL: [-0.5, 0.44, -0.22], sL: [-up(-sw) * 0.4, -0.3] });
}
function remador(b) { // puxa o remo com as duas maos
  const p = 0.5 - 0.5 * Math.cos(b * PI);
  return base({ y: -0.2 + p * 0.04, lean: -0.22 + p * 0.32, turn: Math.sin(b * PI / 4) * 0.2, tilt: Math.sin(b * PI / 2) * 0.05, head: [0.06 - p * 0.08, 0, 0], hR: [0.2, 1.1 - p * 0.05, -0.72 + p * 0.62], cR: [0.62, 1.1, -0.22 + p * 0.4], hL: [-0.2, 1.1 - p * 0.05, -0.72 + p * 0.62], cL: [-0.62, 1.1, -0.22 + p * 0.4],
    fR: [0.32, FOOT, -0.12], kR: [0.46, 0.42, -0.34], sR: [0, 0.2], fL: [-0.32, FOOT, -0.12], kL: [-0.46, 0.42, -0.34], sL: [0, -0.2] });
}
function palmas(b) { // bate palma em cima, no meio e embaixo, de um lado pro outro
  const side = Math.sin(b * PI / 2), cl = 0.5 + 0.5 * Math.cos(b * PI), gap = 0.09 + (1 - cl) * 0.5, y = key([2.02, 1.55, 1.18, 1.55], b), fR = [0.24 + side * 0.08, FOOT + up(side) * 0.1, 0], fL = [-0.24 + side * 0.08, FOOT + up(-side) * 0.1, 0];
  return base({ x: side * 0.08, y: -Math.abs(Math.sin(b * PI)) * 0.04, tilt: -side * 0.07, sq: 1 - Math.abs(Math.sin(b * PI)) * 0.02, head: [(y - 1.5) * 0.14, side * 0.2, side * 0.08], hR: [gap, y, -0.22], cR: [0.74, (y + 1.3) / 2, 0.04], hL: [-gap, y, -0.22], cL: [-0.74, (y + 1.3) / 2, 0.04],
    fR, kR: knee(1, fR, 0.32, 0.2), sR: [-up(side) * 0.3, 0.14], fL, kL: knee(-1, fL, 0.32, 0.2), sL: [-up(-side) * 0.3, -0.14] });
}
function piao(b) { // gira na ponta dos pes com os bracos abertos; os pes giram junto, entao as pernas nao cruzam
  const turn = b * PI / 2;
  return base({ turn, footTurn: turn, y: Math.abs(Math.sin(b * PI / 2)) * 0.06 + 0.02, tilt: Math.sin(b * PI) * 0.04, head: [0.08, 0, Math.sin(b * PI) * 0.04], hR: [0.86, 1.42 + Math.sin(b * PI) * 0.06, -0.02], cR: [0.62, 1.38, 0.05], hL: [-0.86, 1.42 - Math.sin(b * PI) * 0.06, -0.02], cL: [-0.62, 1.38, 0.05],
    fR: [0.14, FOOT + 0.04, 0], kR: [0.2, 0.48, -0.1], sR: [-0.3, 0], fL: [-0.14, FOOT + 0.04, 0], kL: [-0.2, 0.48, -0.1], sL: [-0.3, 0] });
}
function mexe(b) { // as duas maos mexendo um panelao
  const w = b * PI / 2, cx = Math.cos(w) * 0.2, cz = Math.sin(w) * 0.16;
  return base({ x: Math.cos(w) * 0.06, y: -0.14 + Math.sin(w * 2) * 0.02, lean: -0.1 + Math.sin(w) * 0.06, tilt: -Math.cos(w) * 0.06, head: [-0.12, Math.cos(w) * 0.25, 0], hR: [0.1 + cx, 1.02, -0.52 + cz], cR: [0.62, 1.1, -0.1], hL: [-0.1 + cx, 1.02, -0.52 + cz], cL: [-0.62, 1.1, -0.1],
    fR: [0.3, FOOT, 0], kR: [0.46, 0.42, -0.24], sR: [0, 0.22], fL: [-0.3, FOOT, 0], kL: [-0.46, 0.42, -0.24], sL: [0, -0.22] });
}
function reverencia(b) { // tira o chapeu e se curva como no fim de um espetaculo
  const k = key([0, 0, 0.35, 1, 1, 0.35, 0, 0], b), hat = key([0, 0.7, 1, 1, 1, 1, 0.5, 0], b);
  const hand = mixV(mixV([0.52, 0.98, -0.1], [0.3, 2.02, -0.2], hat), [0.42, 1.05, -0.62], k), elbow = mixV(mixV([0.72, 1.12, 0.05], [0.78, 1.7, 0.02], hat), [0.72, 1.2, -0.22], k);
  return base({ y: -k * 0.06, lean: -0.62 * k, head: [k * 0.12 - hat * 0.04, 0, 0], hatLift: hat * (1 - k) * 0.3, hR: hand, cR: elbow, hL: mixV([-0.52, 0.98, -0.1], [-0.18, 1.02, 0.38], hat), cL: mixV([-0.72, 1.12, 0.05], [-0.6, 1.1, 0.2], hat),
    fR: [0.22, FOOT, -0.08], kR: [0.3, 0.45, -0.28], sR: [0, 0.1], fL: [-0.2, FOOT, 0.04 + 0.22 * k], kL: [-0.3, 0.45, -0.1 + 0.1 * k], sL: [-k * 0.2, -0.1] });
}


// ---------- leva da Loja (05/11, pedido dele): cambalhota, TikTok e com efeito ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
// mortal: gira em volta do meio do corpo (nao dos pes), encolhe no ar (tuck solta o pe do chao) e cai com um amassado de borracha
function flip(b, dir) {
  const p = ((b % 8) + 8) % 8, prep = sm(p / 0.9) * (1 - sm((p - 1.9) / 0.3)), f = clamp01((p - 2) / 2.2), rot = sm(f), arc = Math.sin(f * PI), land = sm((p - 4.1) / 0.25) * (1 - sm((p - 4.9) / 0.7)), tada = sm((p - 4.9) / 0.6) * (1 - sm((p - 7.2) / 0.8));
  const th = dir * PI * 2 * rot, C = 1;
  const hand = (s) => mixV(mixV(mixV([s * 0.52, 0.95, -0.1], dir < 0 ? [s * 0.55, 0.85, 0.32] : [s * 0.42, 1.95, -0.1], prep), [s * 0.26, 0.82, -0.44], sm(arc * 2.4)), [s * 0.74, 1.86, -0.12], tada);
  const elbow = (s) => mixV(mixV([s * 0.72, 1.12, 0.05], [s * 0.58, 1.08, -0.2], sm(arc * 2.4)), [s * 0.66, 1.42, 0.05], tada);
  return base({ y: C * (1 - Math.cos(th)) + arc * 1.15 - prep * 0.2 - land * 0.16, z: -C * Math.sin(th), lean: th + dir * prep * -0.18, tuck: sm(arc * 2.2), sq: 1 - prep * 0.1 - land * 0.16 + arc * 0.04, head: [tada * 0.12, 0, 0],
    hR: hand(1), cR: elbow(1), hL: hand(-1), cL: elbow(-1), kR: [0.34, 0.45 - prep * 0.06 - land * 0.08, -0.26], kL: [-0.34, 0.45 - prep * 0.06 - land * 0.08, -0.26] });
}
const cambalhota = (b) => flip(b, -1), mortal = (b) => flip(b, 1);

function ombrinho(b) { // ombro pra cima alternado, um dedo pro alto de cada vez
  const sw = Math.sin(b * PI), up1 = key([0, 1, 1, 0, 0, 0, 0, 0], b), up2 = key([0, 0, 0, 0, 0, 1, 1, 0], b);
  return base({ y: -0.05 - Math.abs(Math.cos(b * PI)) * 0.04, tilt: sw * 0.1, turn: Math.sin(b * PI / 2) * 0.16, x: sw * 0.04, sq: 1 + Math.abs(sw) * 0.02, head: [0.04, sw * 0.16, -sw * 0.08],
    hR: mixV([0.5, 1.12 + up(sw) * 0.14, -0.2], [0.34, 2.12, -0.12], up1), cR: mixV([0.74, 1.18, 0.02], [0.68, 1.62, 0.04], up1), hL: mixV([-0.5, 1.12 + up(-sw) * 0.14, -0.2], [-0.34, 2.12, -0.12], up2), cL: mixV([-0.74, 1.18, 0.02], [-0.68, 1.62, 0.04], up2),
    fR: [0.27, FOOT, -0.03], kR: [0.4, 0.42, -0.24], sR: [0, 0.2], fL: [-0.27, FOOT, -0.03], kL: [-0.4, 0.42, -0.24], sL: [0, -0.2] });
}
function passinho(b) { // pes cruzando rapido, ombros soltos
  const fR = [key([0.24, -0.04, 0.24, 0.42, 0.24, -0.04, 0.24, 0.42], b), FOOT + up(Math.sin(b * PI)) * 0.12, key([-0.1, 0.08, 0.12, -0.14, -0.1, 0.08, 0.12, -0.14], b)], fL = [key([-0.24, -0.42, -0.24, 0.04, -0.24, -0.42, -0.24, 0.04], b), FOOT + up(-Math.sin(b * PI)) * 0.12, key([0.12, -0.14, -0.1, 0.08, 0.12, -0.14, -0.1, 0.08], b)];
  const sw = Math.sin(b * PI / 2);
  return base({ x: sw * 0.06, y: -0.07 - Math.abs(Math.sin(b * PI)) * 0.03, tilt: -sw * 0.08, turn: sw * 0.22, lean: -0.05, head: [0, -sw * 0.25, sw * 0.08], hR: [0.56, 1.02 + sw * 0.16, -0.22 - sw * 0.16], cR: [0.74, 1.14, 0.03], hL: [-0.56, 1.02 - sw * 0.16, -0.22 + sw * 0.16], cL: [-0.74, 1.14, 0.03],
    fR, kR: knee(1, fR, 0.28, 0.22), sR: [0, 0.3 * sw], fL, kL: knee(-1, fL, 0.28, 0.22), sL: [0, 0.3 * sw] });
}
function cruzadinha(b) { // cruza os bracos, passa a mao na frente do rosto e joga o quadril
  const x = key([0.5, -0.1, 0.1, 0.5, 0.5, 0.22, 0.56, 0.5], b), y = key([0.98, 1.3, 1.62, 1.62, 1.1, 1.1, 1.75, 0.98], b), lx = key([-0.5, 0.1, -0.1, -0.5, -0.5, -0.22, -0.56, -0.5], b), ly = key([0.98, 1.2, 1.2, 0.98, 1.1, 1.1, 1.75, 0.98], b), hip = key([0, 1, 1, -1, -1, 1, -1, 0], b);
  return base({ x: hip * 0.09, y: -0.05, tilt: -hip * 0.1, turn: hip * 0.12, head: [0, hip * 0.2, hip * 0.08], hR: [x, y, -0.34], cR: [0.68, 1.16, -0.02], hL: [lx, ly, -0.3], cL: [-0.68, 1.16, -0.02], fR: [0.27, FOOT, 0], kR: [0.38, 0.42, -0.2], sR: [0, 0.2], fL: [-0.27, FOOT, 0], kL: [-0.38, 0.42, -0.2], sL: [0, -0.2] });
}
function fiodental(b) { // bracos esticados passando pra frente e pra tras do corpo, quadril ao contrario
  const sw = Math.sin(b * PI), side = Math.sin(b * PI);
  return base({ x: -sw * 0.12, y: -0.04, tilt: sw * 0.09, turn: Math.sin(b * PI / 4) * 0.12, head: [0, sw * 0.12, -sw * 0.05], hR: [0.3 + side * 0.42, 0.84, -sw * 0.36], cR: [0.6 + side * 0.22, 1.08, -sw * 0.14], hL: [-0.3 + side * 0.42, 0.84, sw * 0.36], cL: [-0.6 + side * 0.22, 1.08, sw * 0.14],
    fR: [0.25, FOOT, 0], kR: [0.34, 0.45, -0.2], sR: [0, 0.14], fL: [-0.25, FOOT, 0], kL: [-0.34, 0.45, -0.2], sL: [0, -0.14] });
}
function aponta(b) { // aponta pra camera e rebola, um lado de cada vez
  const k = key([0, 1, 1, 0, 0, 0, 0, 0], b), j = key([0, 0, 0, 0, 0, 1, 1, 0], b), w = Math.sin(b * PI);
  return base({ x: w * 0.09, y: -0.06 - Math.abs(w) * 0.03, tilt: -w * 0.09, lean: -0.05 * (k + j), head: [Math.abs(w) * 0.1 - 0.05, 0, w * 0.06], hR: mixV([0.42, 1.02, 0.1], [0.24, 1.46, -0.86], k), cR: mixV([0.72, 1.16, 0.14], [0.56, 1.22, -0.36], k), hL: mixV([-0.42, 1.02, 0.1], [-0.24, 1.46, -0.86], j), cL: mixV([-0.72, 1.16, 0.14], [-0.56, 1.22, -0.36], j),
    fR: [0.27, FOOT, -0.03], kR: [0.4, 0.42, -0.24], sR: [0, 0.2], fL: [-0.27, FOOT, -0.03], kL: [-0.4, 0.42, -0.24], sL: [0, -0.2] });
}
function cospefogo(b) { // enche o peito, cospe fogo e bate no peito no fim
  const p = ((b % 8) + 8) % 8, breath = sm(p / 1.6) * (1 - sm((p - 1.7) / 0.3)), blow = sm((p - 1.9) / 0.3) * (1 - sm((p - 5.2) / 0.6)), done = sm((p - 5.8) / 0.5) * (1 - sm((p - 7.3) / 0.7)), shake = Math.sin(b * PI * 4) * blow;
  return base({ y: -blow * 0.08 + breath * 0.06, lean: breath * 0.3 - blow * 0.2, sq: 1 + breath * 0.05, x: shake * 0.015, head: [breath * 0.22 - blow * 0.04, 0, shake * 0.02],
    hR: mixV(mixV([0.52, 0.95, -0.1], [0.4, 1.3, -0.1], breath), [0.62, 0.86, 0.14], blow), cR: [0.72, 1.14, 0.08], hL: mixV(mixV([-0.52, 0.95, -0.1], [-0.4, 1.3, -0.1], breath), [-0.62, 0.86, 0.14], blow), cL: [-0.72, 1.14, 0.08], fR: [0.28, FOOT, -0.12], kR: [0.4, 0.42, -0.32], sR: [0, 0.2], fL: [-0.28, FOOT, 0.12], kL: [-0.4, 0.42, -0.1], sL: [0, -0.2] });
}
function coracao(b) { // faz um coracao com as maos em cima da cabeca e balanca
  const k = key([0, 1, 1, 1, 1, 1, 1, 0], b), sw = Math.sin(b * PI / 2);
  return base({ x: sw * 0.07, tilt: -sw * 0.1, y: -Math.abs(Math.sin(b * PI / 2)) * 0.04, head: [0.1 * k, 0, sw * 0.12], hR: mixV([0.52, 0.95, -0.1], [0.11, 2.14, -0.2], k), cR: mixV([0.72, 1.12, 0.05], [0.72, 1.72, 0.02], k), hL: mixV([-0.52, 0.95, -0.1], [-0.11, 2.14, -0.2], k), cL: mixV([-0.72, 1.12, 0.05], [-0.72, 1.72, 0.02], k), fR: [0.24, FOOT + up(sw) * 0.08, 0], kR: [0.34, 0.45, -0.2], sR: [-up(sw) * 0.3, 0.1], fL: [-0.24, FOOT + up(-sw) * 0.08, 0], kL: [-0.34, 0.45, -0.2], sL: [-up(-sw) * 0.3, -0.1] });
}
function canhao(b) { // agacha carregando e dispara confete pra cima com as duas maos
  const p = ((b % 8) + 8) % 8, load = sm(p / 1.2) * (1 - sm((p - 2.4) / 0.25)), hit = sm((p - 2.4) / 0.25) * (1 - sm((p - 6.8) / 1)), jump = Math.sin(clamp01((p - 2.4) / 1.3) * PI);
  return base({ y: -load * 0.24 + jump * 0.34, sq: 1 - load * 0.08 + jump * 0.05, lean: -load * 0.1 + hit * 0.06, head: [hit * 0.14, 0, 0], hR: mixV(mixV([0.52, 0.95, -0.1], [0.3, 0.8, -0.3], load), [0.5, 2.0, -0.28], hit), cR: mixV([0.72, 1.12, 0.05], [0.72, 1.48, -0.02], hit), hL: mixV(mixV([-0.52, 0.95, -0.1], [-0.3, 0.8, -0.3], load), [-0.5, 2.0, -0.28], hit), cL: mixV([-0.72, 1.12, 0.05], [-0.72, 1.48, -0.02], hit),
    fR: [0.28, FOOT + jump * 0.2, 0], kR: [0.42, 0.42 + jump * 0.2, -0.24], sR: [-jump * 0.3, 0.2], fL: [-0.28, FOOT + jump * 0.2, 0], kL: [-0.42, 0.42 + jump * 0.2, -0.24], sL: [-jump * 0.3, -0.2] });
}
function raio(b) { // chama o raio com o braco pro alto e treme ao receber
  const p = ((b % 8) + 8) % 8, arm = sm(p / 0.9) * (1 - sm((p - 7) / 0.9)), zap = Math.max(1 - clamp01(Math.abs(p - 2.2) / 0.9), 1 - clamp01(Math.abs(p - 5.2) / 0.9)), sh = Math.sin(b * PI * 5) * zap;
  return base({ x: sh * 0.03, y: zap * 0.05, tilt: sh * 0.03, sq: 1 + zap * 0.03, lean: arm * 0.05, head: [arm * 0.2, sh * 0.06, 0], hR: mixV([0.52, 0.95, -0.1], [0.28, 2.22, -0.06], arm), cR: mixV([0.72, 1.12, 0.05], [0.6, 1.8, 0.02], arm), hL: [-0.6 - zap * 0.22, 1.0 + zap * 0.5, -0.1], cL: [-0.78, 1.14 + zap * 0.2, 0.05], fR: [0.26, FOOT, 0], kR: [0.36, 0.45, -0.2], sR: [0, 0.14], fL: [-0.26, FOOT, 0], kL: [-0.36, 0.45, -0.2], sL: [0, -0.14] });
}
function projetor(b) { // abre as maos como um projetor de cinema e joga um letreiro na frente
  const p = ((b % 8) + 8) % 8, k = sm((p - 0.6) / 0.8) * (1 - sm((p - 6.8) / 1)), sw = Math.sin(b * PI / 2);
  return base({ tilt: sw * 0.03, lean: -k * 0.06, y: -0.04, head: [k * -0.04, sw * 0.08, 0], hR: mixV([0.52, 0.95, -0.1], [0.14, 1.66, -0.62], k), cR: mixV([0.72, 1.12, 0.05], [0.6, 1.3, -0.2], k), hL: mixV([-0.52, 0.95, -0.1], [-0.14, 1.66, -0.62], k), cL: mixV([-0.72, 1.12, 0.05], [-0.6, 1.3, -0.2], k), fR: [0.26, FOOT, -0.05], kR: [0.36, 0.45, -0.24], sR: [0, 0.14], fL: [-0.26, FOOT, 0.05], kL: [-0.36, 0.45, -0.16], sL: [0, -0.14] });
}

// Volta Olimpica (rankeada, 05/11): da uma volta no tambor correndo, bracos pro alto feito campeao, um soco no ar por vez
function volta(b) {
  const an = b * PI / 8, R = 0.28, x = Math.sin(an) * R, z = (1 - Math.cos(an)) * R, ft = -an, fc = Math.cos(ft), fs = Math.sin(ft), ox = x * fc - z * fs, oz = x * fs + z * fc;
  const sw = Math.sin(b * PI), up = (s) => FOOT + Math.max(0, s * sw) * 0.16, pump = Math.sin(b * PI / 2), hop = Math.abs(sw) * 0.05;
  const foot = (s) => [s * 0.2 + ox, up(s), oz - 0.02 + s * sw * 0.14], knee = (s) => [s * 0.3 + ox, 0.48 + Math.max(0, s * sw) * 0.14, oz - 0.2 + s * sw * 0.08];
  return { x, z, y: hop - 0.03, turn: -an, footTurn: ft, lean: -0.1, tilt: pump * 0.05, sq: 1 + hop * 0.5, head: [-0.08, pump * 0.18, 0],
    hR: [0.46, 1.92 + Math.max(0, pump) * 0.16, -0.12], cR: [0.82, 1.48, 0.05], hL: [-0.46, 1.92 + Math.max(0, -pump) * 0.16, -0.12], cL: [-0.82, 1.48, 0.05],
    fR: foot(1), kR: knee(1), sR: [-Math.max(0, sw) * 0.4, 0], fL: foot(-1), kL: knee(-1), sL: [-Math.max(0, -sw) * 0.4, 0] };
}

// beats = quanto dura uma vez no podio; o fim emenda na volta pra arma; fx = o que solta em qual batida (src/dancefx.js)
export const DANCES = {
  charleston: { bpm: 168, beats: 16, pose: charleston }, macarrao: { bpm: 112, beats: 16, pose: macarrao }, sapateado: { bpm: 184, beats: 16, pose: sapateado },
  lindy: { bpm: 160, beats: 16, pose: lindy }, shimmy: { bpm: 130, beats: 16, pose: shimmy }, cancan: { bpm: 150, beats: 16, pose: cancan }, polichinelo: { bpm: 116, beats: 12, pose: polichinelo }, robo: { bpm: 96, beats: 16, pose: robo },
  deslizada: { bpm: 120, beats: 12, pose: deslizada }, bamboleio: { bpm: 105, beats: 12, pose: bamboleio }, marcha: { bpm: 120, beats: 16, pose: marcha }, cossaco: { bpm: 126, beats: 16, pose: cossaco }, galinha: { bpm: 140, beats: 16, pose: galinha },
  // 08/11 (pedido dele): toda lendaria com efeito 3D proprio, sem repetir: cambalhota = poeira + rastro do giro; mortal = onda de choque + estrelas
  cambalhota: { bpm: 104, beats: 8, pose: cambalhota, fx: [{ kind: 'dust', from: 'feet', dir: [0, 0.3, 0], at: 2, n: 8, spread: 2.2, speed: 1.6 }, { kind: 'trail', at: 2, life: 1.3, spin: 1 }, { kind: 'dust', from: 'feet', dir: [0, 0.3, 0], at: 4.2, n: 12, spread: 2.6, speed: 2 }] },
  mortal: { bpm: 104, beats: 8, pose: mortal, fx: [{ kind: 'ring', at: 4.2, color: 0xd8322a, size: 2.6, life: 0.75 }, { kind: 'star', from: 'feet', dir: [0, 1.4, 0], at: 4.25, n: 10, spread: 2.2, speed: 3.4 }] },
  ombrinho: { bpm: 112, beats: 16, pose: ombrinho }, passinho: { bpm: 136, beats: 16, pose: passinho }, cruzadinha: { bpm: 104, beats: 16, pose: cruzadinha }, fiodental: { bpm: 138, beats: 16, pose: fiodental }, aponta: { bpm: 112, beats: 16, pose: aponta },
  cospefogo: { bpm: 96, beats: 8, pose: cospefogo, fx: [{ kind: 'fire', from: 'mouth', at: 2, to: 5.2, every: 0.12, n: 3, spread: 0.22, speed: 6 }, { kind: 'jet', at: 2, life: 2, len: 1.8 }] }, // 08/11: o fogo sai da BOCA (segue a cabeca) + jato de chama 3D
  coracao: { bpm: 96, beats: 8, pose: coracao, fx: [{ kind: 'heart', from: 'hands', dir: [0, 0.5, -0.3], at: 1, to: 6.5, every: 0.5, n: 2, spread: 1, speed: 1.2 }, { kind: 'heart', from: 'hands', dir: [0, 0.6, 0], at: 6.5, n: 14, spread: 1.6, speed: 2 }] },
  canhao: { bpm: 104, beats: 8, pose: canhao, fx: [{ kind: 'confetti', from: 'hR', dir: [0.15, 1, -0.2], at: 2.5, n: 26, spread: 0.7, speed: 6.5 }, { kind: 'confetti', from: 'hL', dir: [-0.15, 1, -0.2], at: 2.5, n: 26, spread: 0.7, speed: 6.5 }, { kind: 'confetti', from: 'hands', dir: [0, 1, -0.2], at: 4.5, n: 20, spread: 1.1, speed: 5.5 }] },
  raio: { bpm: 92, beats: 8, pose: raio, fx: [{ kind: 'bolt', at: 2.2 }, { kind: 'bolt', at: 5.2 }, { kind: 'spark', from: 'hL', dir: [-0.4, 0.6, 0], at: 2.4, to: 5.8, every: 0.5, n: 3, spread: 1.4, speed: 2.4 }] },
  projetor: { bpm: 88, beats: 8, pose: projetor, fx: [{ kind: 'card', from: 'hands', dir: [0, 0.08, -1], at: 1.4, word: 'BANG!' }, { kind: 'card', from: 'hands', dir: [0, 0.08, -1], at: 4.6, word: 'KAPOW!' }] },
  remador: { bpm: 100, beats: 12, pose: remador }, palmas: { bpm: 126, beats: 16, pose: palmas }, piao: { bpm: 100, beats: 12, pose: piao }, mexe: { bpm: 116, beats: 12, pose: mexe }, reverencia: { bpm: 84, beats: 8, pose: reverencia, fx: [{ kind: 'spot', at: 0.3, life: 5.2 }, { kind: 'petal', from: 'sky', dir: [0, -0.2, 0], at: 2.2, to: 5.4, every: 0.35, n: 2, spread: 1.6, speed: 0.6 }] /* fim de espetaculo: holofote de cima e petalas caindo (08/11) */ },
  volta: { bpm: 120, beats: 16, pose: volta, fx: [{ kind: 'note', from: 'head', dir: [0, 1, 0], at: 1, to: 15, every: 2, n: 2, spread: 1.2, speed: 1.2 }, { kind: 'burst', from: 'head', at: 8, color: 0xffd23f, size: 1.6, life: 0.55 }, { kind: 'burst', from: 'head', at: 16, color: 0xffd23f, size: 1.6, life: 0.55 }] }, // rankeada: notas e estouro dourado na volta completa
};
export const danceLen = (id) => DANCES[id].beats * 60 / DANCES[id].bpm;

// pose da dança em t segundos, com cotovelo e joelho atrasados (cara de borracha)
export function dancePose(id, t) {
  const D = DANCES[id], b = t * D.bpm / 60, P = D.pose(b), L = D.pose(b - 0.22);
  // contornar o corpo faz a mao andar mais que o passo original: a media de 3 instantes tira o tranco de quando a correcao entra e sai
  const d = 0.04 * D.bpm / 60, A = D.pose(b - d), Z = D.pose(b + d), arm = (a, s, h0, h1, h2, c) => { const x = clearArm(a, s, c, h0).h, y = clearArm(a, s, c, h1).h, z = clearArm(a, s, c, h2).h; return clearArm(a, s, c, [(x[0] + y[0] + z[0]) / 3, (x[1] + y[1] + z[1]) / 3, (x[2] + y[2] + z[2]) / 3]); };
  const R = arm(SH.R, 1, A.hR, P.hR, Z.hR, L.cR), E = arm(SH.L, -1, A.hL, P.hL, Z.hL, L.cL);
  return { ...P, lean: norm(P.lean), turn: norm(P.turn), footTurn: norm(P.footTurn), hR: R.h, cR: R.c, hL: E.h, cL: E.c, kR: L.kR, kL: L.kL };
}

// Braco fora do corpo (05/11, pedido dele: mao no peito, braco curto, braco sumindo no corpo). Correcao geral, vale pra toda dança,
// inclusive as futuras. Tudo no espaco do corpo; toda conta e continua, pra nao criar tremida (danca-test.mjs mede).
const SH = { R: [0.26, 1.32, 0], L: [-0.26, 1.32, 0] }; // ombro dentro do tronco (07/11)
const BODY = [{ c: [0, 1.05, 0], r: [0.42, 0.483, 0.378] }, { c: [0, 1.62, 0], r: [0.36, 0.36, 0.36] }]; // tronco e cabeca, medidas de Character
const HAND_GAP = 0.125, HOSE_GAP = 0.08, MIN_REACH = 0.385, MIN_CURVE = 0.085, TUBE_U = [0.3, 0.4, 0.5, 0.6, 0.7, 0.85];
// devolve em out quanto falta pra p sair do elipsoide E (mais a folga m). Sai do centro em linha reta. Fora dele: out zerado
function pushFrom(p, E, m, out) {
  const rx = E.r[0] + m, ry = E.r[1] + m, rz = E.r[2] + m, dx = (p[0] - E.c[0]) / rx, dy = (p[1] - E.c[1]) / ry, dz = (p[2] - E.c[2]) / rz, d = Math.hypot(dx, dy, dz);
  out[0] = out[1] = out[2] = 0; if (d >= 1) return false;
  if (d < 1e-4) { out[2] = -rz; return true; } // bem no centro: sai pela frente
  const k = 1 / d - 1; out[0] = dx * k * rx; out[1] = dy * k * ry; out[2] = dz * k * rz; return true;
}
const tmp = [0, 0, 0];
// a mangueira nao aguenta dobra mais fechada que o raio dela: a malha se dobra sobre ela mesma. Controla o cotovelo em relacao a reta ombro-mao
function limitFold(a, c, h) {
  const ax = h[0] - a[0], ay = h[1] - a[1], az = h[2] - a[2], L = Math.hypot(ax, ay, az); if (L < 1e-4) return;
  const ux = ax / L, uy = ay / L, uz = az / L, ex = c[0] - (a[0] + h[0]) / 2, ey = c[1] - (a[1] + h[1]) / 2, ez = c[2] - (a[2] + h[2]) / 2;
  let par = ex * ux + ey * uy + ez * uz; const px = ex - par * ux, py = ey - par * uy, pz = ez - par * uz, H = Math.hypot(px, py, pz);
  par = Math.max(-0.34 * L, Math.min(0.34 * L, par)); // o cotovelo nao passa das pontas: e isso que fazia o tubo ir e voltar
  // menor raio de curva da bezier, em conta fechada: |B'|^3 / |B' x B''|
  const curve = (hh) => { if (hh < 1e-5) return 9; const s = Math.max(-1, Math.min(1, -(L * 2 * par) / (4 * par * par + 4 * hh * hh))), bp = Math.hypot(L + 2 * s * par, 2 * s * hh); return bp * bp * bp / (4 * L * hh); };
  let H2 = H;
  if (curve(H) < MIN_CURVE) { let lo = 0, hi = H; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (curve(m) >= MIN_CURVE) lo = m; else hi = m; } H2 = lo; }
  const k = H > 1e-6 ? H2 / H : 0, mx = (a[0] + h[0]) / 2, my = (a[1] + h[1]) / 2, mz = (a[2] + h[2]) / 2;
  c[0] = mx + par * ux + px * k; c[1] = my + par * uy + py * k; c[2] = mz + par * uz + pz * k;
}
// tira o tubo de dentro do corpo afastando o cotovelo. Um ponto do tubo anda 2u(1-u) do que o cotovelo anda
function clearTube(a, c, h) {
  for (let it = 0; it < 6; it++) {
    let mx = 0, my = 0, mz = 0, hit = false;
    for (const u of TUBE_U) {
      const iu = 1 - u, w = 2 * iu * u, p = [iu * iu * a[0] + w * c[0] + u * u * h[0], iu * iu * a[1] + w * c[1] + u * u * h[1], iu * iu * a[2] + w * c[2] + u * u * h[2]];
      for (const E of BODY) if (pushFrom(p, E, HOSE_GAP, tmp)) { hit = true; mx += tmp[0] * w; my += tmp[1] * w; mz += tmp[2] * w; }
    }
    if (!hit) return;
    c[0] += mx * 1.6; c[1] += my * 1.6; c[2] += mz * 1.6;
  }
}
// so o cotovelo: pra quando a mao esta presa em outra coisa (segurando a arma)
export function clearElbow(a, c, h) { clearTube(a, c, h); limitFold(a, c, h); clearTube(a, c, h); }
// mao fora do corpo e longe do ombro (estende o braco), depois o cotovelo
function clearArm(a, side, c0, h0) {
  const h = [h0[0], h0[1], h0[2]], c = [c0[0], c0[1], c0[2]];
  // estende a partir de um ponto atras do peito, nao do ombro: mao que passa rente ao ombro desliza pela frente, sem girar em volta dele
  const qx = a[0] - side * 0.25, qy = a[1] - 0.02, qz = a[2] + 0.2, ox = qx - a[0], oy = qy - a[1], oz = qz - a[2], oo = ox * ox + oy * oy + oz * oz - MIN_REACH * MIN_REACH;
  for (let it = 0; it < 6; it++) {
    const rx = h[0] - a[0], ry = h[1] - a[1], rz = h[2] - a[2];
    if (rx * rx + ry * ry + rz * rz < MIN_REACH * MIN_REACH) {
      let vx = h[0] - qx, vy = h[1] - qy, vz = h[2] - qz; const n = Math.hypot(vx, vy, vz) || 1; vx /= n; vy /= n; vz /= n;
      const bb = vx * ox + vy * oy + vz * oz, s = -bb + Math.sqrt(bb * bb - oo); h[0] = qx + vx * s; h[1] = qy + vy * s; h[2] = qz + vz * s;
    }
    for (const E of BODY) if (pushFrom(h, E, HAND_GAP, tmp)) { h[0] += tmp[0]; h[1] += tmp[1]; h[2] += tmp[2]; }
  }
  clearElbow(a, c, h);
  return { h, c };
}
// de pe, parado: respira, troca o peso de perna e olha em volta. As maos vem de quem chama (seguram a arma)
export function restPose(t, ph = 0) {
  const a = Math.sin(t * 0.9 + ph), br = Math.sin(t * 2.1 + ph);
  return { x: a * 0.015, y: br * 0.012 - 0.01, lean: -0.03, turn: a * 0.05, tilt: a * 0.018, sq: 1 + br * 0.008, head: [0.03, Math.sin(t * 0.55 + ph * 2) * 0.28, a * 0.03], hatLift: 0,
    fR: [0.23, FOOT, 0.03], kR: [0.31, 0.45, -0.17], sR: [0, 0.14], fL: [-0.23, FOOT, -0.04], kL: [-0.31, 0.45, -0.2], sL: [0, -0.14],
    hR: [0.3, 1.0, -0.3], cR: [0.5, 1.0, -0.08], hL: [-0.2, 1.05, -0.35], cL: [-0.42, 0.98, -0.28] };
}
// giro: sempre pelo caminho mais curto, senao quem terminou de girar desenrolava as voltas de uma vez
const norm = (a) => { const v = (a || 0) % (PI * 2); return v > PI ? v - PI * 2 : v < -PI ? v + PI * 2 : v; };
const mixTurn = (a, b, k) => { const A = norm(a); return A + norm((b || 0) - A) * k; };
const mixAny = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => mix(v, b[i] ?? v, k)) : mix(a ?? 0, b ?? 0, k));
// mistura duas poses inteiras
export function mixPose(A, B, k) { const out = {}; for (const n of ['x', 'z', 'y', 'tuck', 'tilt', 'hatLift', 'head', 'hR', 'cR', 'hL', 'cL', 'fR', 'kR', 'sR', 'fL', 'kL', 'sL']) out[n] = mixAny(A[n], B[n], k); out.sq = mix(A.sq ?? 1, B.sq ?? 1, k); out.lean = mixTurn(A.lean, B.lean, k); out.turn = mixTurn(A.turn, B.turn, k); out.footTurn = mixTurn(A.footTurn, B.footTurn, k); return out; }

const SH_R = new THREE.Vector3(0.26, 1.32, 0), SH_L = new THREE.Vector3(-0.26, 1.32, 0), HIP = 0.72;
const inv = new THREE.Matrix4(), a = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3(), cE = new THREE.Vector3();

// coloca o boneco na pose. gun = { pos, quat } da arma na mao ou nas costas; sem gun a arma some (previa da dança)
const elbow = [0, 0, 0];
export function applyPose(ch, P, gun = null, dt = 1 / 60) {
  const L = P, sq = P.sq || 1, B = ch.body;
  B.position.set(P.x || 0, P.y || 0, P.z || 0); B.rotation.set(P.lean || 0, P.turn || 0, P.tilt || 0); B.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  B.updateMatrix(); inv.copy(B.matrix).invert();
  ch.head.rotation.set(...P.head);
  for (const [leg, shoe, side, foot, knee, sr] of [[ch.legR, ch.shoeR, 1, P.fR, L.kR, P.sR], [ch.legL, ch.shoeL, -1, P.fL, L.kL, P.sL]]) {
    a.set(side * 0.17, HIP, 0);
    // footTurn: o pe acompanha o giro do corpo (senao a perna cruza). Pe no chao de verdade, mesmo com o corpo inclinado
    const ft = P.footTurn || 0, fc = Math.cos(ft), fs = Math.sin(ft);
    f.set(foot[0] * fc + foot[2] * fs, foot[1], -foot[0] * fs + foot[2] * fc).applyMatrix4(inv);
    c.set(knee[0] * fc + knee[2] * fs, knee[1], -knee[0] * fs + knee[2] * fc).applyMatrix4(inv);
    if (P.tuck) { f.lerp(cE.set(side * 0.2, 0.34, -0.3), P.tuck); c.lerp(cE.set(side * 0.32, 0.74, -0.46), P.tuck); } // no ar: joelho no peito, pe solto do chao
    leg.set(a, c, f);
    const ry = (sr[1] || 0) + ft - (P.turn || 0);
    shoe.position.set(f.x - Math.sin(ry) * 0.1, f.y - 0.02, f.z - Math.cos(ry) * 0.1);
    shoe.rotation.set(sr[0] || 0, ry, 0);
  }
  ch.handR.position.fromArray(P.hR); ch.handL.position.fromArray(P.hL);
  // cotovelo de novo aqui: nas misturas (dança <-> arma) a mao segue a arma e o braco tambem nao pode entrar no corpo
  elbow[0] = L.cR[0]; elbow[1] = L.cR[1]; elbow[2] = L.cR[2]; clearElbow(SH.R, elbow, P.hR); cE.fromArray(elbow); ch.armR.set(SH_R, cE, ch.handR.position); ch.wristEase(ch.handR, cE, P.twR || 0, dt);
  elbow[0] = L.cL[0]; elbow[1] = L.cL[1]; elbow[2] = L.cL[2]; clearElbow(SH.L, elbow, P.hL); cE.fromArray(elbow); ch.armL.set(SH_L, cE, ch.handL.position); ch.wristEase(ch.handL, cE, P.twL || 0, dt);
  ch.gunHolder.visible = !!gun; if (ch.gun2h) ch.gun2h.visible = false;
  if (gun) { ch.gunHolder.position.copy(gun.pos); ch.gunHolder.quaternion.copy(gun.quat); }
  if (ch.hat) { const u = ch.hat.userData; u.tipY ??= ch.hat.position.y; ch.hat.position.y = u.tipY + (P.hatLift || 0); }
}
export function applyDance(ch, id, t, dt) { if (!DANCES[id]) return false; applyPose(ch, dancePose(id, t), null, dt); return true; }
