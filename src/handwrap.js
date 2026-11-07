// Mao que SEGURA a arma (06/11, pedido dele): a luva aberta atravessava o cabo e o guarda-mao.
// Aqui cada arma e medida na hora de equipar: raios saem de dentro do cabo/guarda-mao e acham a casca
// da malha em volta. Os dedos viram tubos que contornam essa casca por fora (nunca entram), param
// antes de bater em outra peca (guarda-mato, pente) e a palma encosta do lado do ombro.
// Regra da empunhadura: direita no cabo (gripInfo); esquerda na empunhadura quando tem, senao no guarda-mao.
// Tudo em coordenadas da arma (holder): os dedos sao filhos da arma e acompanham recuo, fole e inspect.
import * as THREE from 'three';
import { ink, PAL } from './toon.js';

const V = () => new THREE.Vector3();
const GL = 0.72, VMS = 0.8;                 // escala da luva no mundo / escala da arma no viewmodel
const U = GL / VMS;                          // 1 unidade da luva em unidades da arma
const TUBE = 0.0165 * U, GAP = 0.0015;       // dedo gordo da luva Mickey; folga ate a casca
const ROW = TUBE * 1.9;                      // um dedo do lado do outro
const PALM_R = 0.05 * U, PALM_S = [1.12, 0.86, 0.72];
const N_ANG = 28;

// triangulos da arma perto do ponto (espaco da arma), sem contorno, vidro, laser nem chaveiro
function gather(gun, c, rad) {
  gun.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), m = new THREE.Matrix4();
  const out = [], a = V(), b = V(), d = V(), lo = c.clone().subScalar(rad), hi = c.clone().addScalar(rad);
  gun.traverse(o => {
    if (!o.isMesh || o.userData.handFx || o.raycast !== THREE.Mesh.prototype.raycast) return; // contorno tem raycast vazio
    const mt = o.material; if (!mt || mt.transparent || mt.isShaderMaterial || !o.visible) return;
    let p = o; while (p && p !== gun) { if (p.userData.charm || p.userData.handFx) return; p = p.parent; }
    const g = o.geometry, pos = g.attributes.position; if (!pos) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const idx = g.index, n = idx ? idx.count : pos.count;
    for (let i = 0; i + 2 < n; i += 3) {
      a.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m);
      b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1).applyMatrix4(m);
      d.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2).applyMatrix4(m);
      if (Math.max(a.x, b.x, d.x) < lo.x || Math.min(a.x, b.x, d.x) > hi.x || Math.max(a.y, b.y, d.y) < lo.y || Math.min(a.y, b.y, d.y) > hi.y || Math.max(a.z, b.z, d.z) < lo.z || Math.min(a.z, b.z, d.z) > hi.z) continue;
      out.push(a.clone(), b.clone(), d.clone());
    }
  });
  return out;
}
// distancias de todos os cruzamentos do raio com a malha (ordenadas)
const ray = new THREE.Ray(), hitP = V();
function hits(T, o, dir, far) {
  ray.origin.copy(o); ray.direction.copy(dir);
  const out = [];
  for (let i = 0; i < T.length; i += 3) if (ray.intersectTriangle(T[i], T[i + 1], T[i + 2], false, hitP)) { const t = hitP.distanceTo(o); if (t > 1e-4 && t < far) out.push(t); }
  return out.sort((x, y) => x - y);
}
// Tudo medido DE FORA PRA DENTRO (06/11): as malhas sao low-poly com cascas sobrepostas e o ponto de apoio as vezes
// fica no vao, entao "estar dentro" nao da pra saber. A silhueta externa (primeira casca vista de fora) garante que
// o dedo passa por fora de tudo; se ela pula longe (guarda-mato, pente), o dedo para ali.
// pos(c, d) = posicao com sinal da casca mais externa na direcao d, olhando de fora (null = nada ali)
function outer(T, c, d, far) {
  const o = c.clone().addScaledVector(d, far), h = hits(T, o, d.clone().negate(), far * 2);
  return h.length ? far - h[0] : null;
}
// centra o ponto entre as duas cascas externas, nos dois eixos do plano
function center(T, c, Y, Z, far) {
  for (let it = 0; it < 3; it++) {
    const pz = outer(T, c, Z, far), nz = outer(T, c, Z.clone().negate(), far), py = outer(T, c, Y, far), ny = outer(T, c, Y.clone().negate(), far);
    if (pz == null || nz == null || py == null || ny == null) return false;
    c.addScaledVector(Z, (pz - nz) / 2).addScaledVector(Y, (py - ny) / 2);
  }
  return true;
}
// raio da silhueta externa em N_ANG direcoes do plano (Y, Z)
function section(T, c, Y, Z, far) {
  const r = [], dir = V();
  for (let k = 0; k < N_ANG; k++) { const f = k / N_ANG * Math.PI * 2; dir.copy(Z).multiplyScalar(Math.cos(f)).addScaledVector(Y, Math.sin(f)); r.push(outer(T, c, dir, far)); }
  return r;
}
const frame = (X, z0) => { const Z = z0.clone().addScaledVector(X, -z0.dot(X)).normalize(), Y = V().crossVectors(Z, X); return { X, Y, Z }; };
const median = (a) => { const b = a.filter(v => v != null).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };

// uma fileira de dedo: contorna a silhueta de phiA ate phiB; para onde ela some ou pula pra outra peca
function fingerPath(T, c, F, phiA, phiB, far, cap) {
  const slices = [-0.6, 0, 0.6].map(k => section(T, c.clone().addScaledVector(F.X, k * TUBE), F.Y, F.Z, far));
  const at = (f) => Math.round((((f % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * N_ANG) % N_ANG;
  const n = Math.max(5, Math.round(Math.abs(phiB - phiA) / (Math.PI * 2) * N_ANG * 2)), pts = [];
  for (let i = 0; i <= n; i++) {
    const f = phiA + (phiB - phiA) * i / n, k = at(f);
    let r = -Infinity, ok = true;
    for (const sl of slices) { if (sl[k] == null) { ok = false; break; } r = Math.max(r, sl[k]); }
    if (!ok || r > cap || r <= 0) break;                // sumiu ou pulou pra vizinha: o dedo acaba encostado
    const rho = r + TUBE + GAP;
    pts.push(c.clone().addScaledVector(F.Z, Math.cos(f) * rho).addScaledVector(F.Y, Math.sin(f) * rho));
  }
  for (let it = 0; it < 2; it++) for (let i = 1; i < pts.length - 1; i++) pts[i] = pts[i - 1].clone().add(pts[i + 1]).multiplyScalar(0.25).addScaledVector(pts[i], 0.5);
  return pts.length >= 3 ? pts : null;
}

// apoio no ar (acima do pescoco da coronha, no vao do guarda-mao): anda ate a peca mais perto e entra um tico nela
function snap(T, c, far, noUp = false) {
  let best = null;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    if ((!x && !y && !z) || (noUp && y > 0)) continue; // cabo: nunca sobe pro receptor
    const d = new THREE.Vector3(x, y, z).normalize(), h = hits(T, c, d, far)[0];
    if (h != null && (!best || h < best.t)) best = { t: h, d };
  }
  if (best) c.addScaledVector(best.d, best.t + 0.01);
  return !!best;
}
// mede uma mao. kind: 'grip' (cabo/empunhadura vertical) ou 'fore' (guarda-mao deitado). side: 1 direita, -1 esquerda
function measure(gun, anchor, kind, side, col, farK = 1) {
  const T = gather(gun, anchor, 0.2);
  if (T.length < 12) return null;
  let far, X, rows, c;
  if (kind === 'grip') {
    // cabo: usa a caixa que o gripInfo achou (o apoio as vezes fica acima/atras do cabo)
    const ok = col && [col.z0, col.z1, col.lo, col.top].every(Number.isFinite) && col.top - col.lo > 0.02;
    if (!ok && farK > 1) { const q = anchor.clone(); snap(T, q, 0.1, true); anchor = q; } // sem caixa: gruda no cabo mais perto
    const zc = ok ? (col.z0 + col.z1) / 2 : anchor.z, top = ok ? col.top : anchor.y + TUBE * 1.4, lo = ok ? col.lo : anchor.y - 0.08;
    far = Math.max(0.035, ok ? (col.z1 - col.z0) * 0.9 : 0.05) * (ok ? 1 : farK);
    const H = { Y: new THREE.Vector3(0, 0, 1), Z: new THREE.Vector3(1, 0, 0) };
    const yA = top - TUBE * 1.4, yB = Math.max(lo + TUBE, yA - 0.05);
    const cA = new THREE.Vector3(anchor.x, yA, zc), cB = new THREE.Vector3(anchor.x, yB, zc);
    if (!center(T, cA, H.Y, H.Z, far)) return null;
    X = center(T, cB, H.Y, H.Z, far) && yA - yB > 0.015 ? cA.clone().sub(cB).normalize() : new THREE.Vector3(0, 1, 0);
    if (X.y < 0.45) X.set(0, 1, 0); // cabo de revolver e bem deitado
    c = cA;
    const len = (yA - lo) / Math.max(0.6, X.y);
    rows = [0, -ROW, -2 * ROW].filter(t => -t <= len - TUBE * 0.8);
  } else if (kind === 'wrist') {
    // escopeta/sniper sem cabo de pistola: a direita fecha no pescoco da coronha, que desce pra tras
    far = 0.06; X = new THREE.Vector3(0, -0.3, 1).normalize(); c = anchor.clone(); rows = [ROW, 0, -ROW];
  } else {
    far = 0.07; X = new THREE.Vector3(0, 0, -1); c = anchor.clone(); rows = [ROW, 0, -ROW];
  }
  far *= farK;
  if (kind !== 'grip' && farK > 1) snap(T, c, 0.1); // 2a tentativa: gruda na peca mais perto
  const F = kind === 'grip' ? frame(X, new THREE.Vector3(0.36 * side, -0.48, 0.8).normalize()) : kind === 'wrist' ? frame(X, new THREE.Vector3(0.9 * side, -0.45, 0).normalize()) : frame(X, new THREE.Vector3(-0.55, -0.83, 0).normalize());
  if (!center(T, c, F.Y, F.Z, far)) return null;
  const sec = section(T, c, F.Y, F.Z, far), med = median(sec);
  if (!med) return null;
  const cap = med * 1.55 + 0.004;
  const arc = kind !== 'fore' ? [0.3 * Math.PI, 1.7 * Math.PI] : [0.05 * Math.PI, 0.58 * Math.PI]; /* 07/11 (pedido dele): guarda-mao segurado POR BAIXO, os dedos sobem so ate a lateral (por cima tampavam a mira) */ // guarda-mao: sobe so pelo lado de fora, nada por cima (mira)
  const fingers = [];
  for (const t of rows) {
    const cc = c.clone().addScaledVector(X, t);
    center(T, cc, F.Y, F.Z, far);
    const p = fingerPath(T, cc, F, arc[0], arc[1], far, cap);
    if (p) fingers.push(p);
  }
  if (!fingers.length) return null;
  // polegar curto do outro lado (direita: lado esquerdo da arma; esquerda: lado direito; guarda-mao: em cima a esquerda)
  const sideV = kind === 'fore' ? new THREE.Vector3(-1, 0.12, 0).normalize() : new THREE.Vector3(-side, 0, 0); // 07/11: polegar na LATERAL do guarda-mao (por cima tampava a massa de mira)
  const phiT = Math.atan2(sideV.dot(F.Y), sideV.dot(F.Z));
  const tc = c.clone().addScaledVector(X, kind === 'grip' ? ROW * 1.05 : 0);
  center(T, tc, F.Y, F.Z, far);
  const thumb = fingerPath(T, tc, F, phiT - 0.2 * Math.PI, phiT + 0.12 * Math.PI, far, cap * 1.3);
  // palma: por fora da silhueta do lado do ombro, no meio das fileiras
  const mid = c.clone().addScaledVector(X, (rows[0] + rows[rows.length - 1]) / 2);
  const back = Math.max(outer(T, mid, F.Z, far) ?? med, 0.005);
  const palm = mid.clone().addScaledVector(F.Z, back + PALM_R * PALM_S[2] + GAP);
  return { X: F.X.clone(), Y: F.Y.clone(), Z: F.Z.clone(), palm, fingers, thumb };
}

const cache = new Map();
export const handCacheClear = () => cache.clear(); // editor de arma (07/11): ajuste ao vivo mexe na arma, a mao mede de novo
// gun = grupo da arma (antes da escala do viewmodel); o = { leftKind: 'grip'|'fore'|null, key }
export function measureHands(gun, o) {
  const k = o.key && cache.get(o.key);
  if (k) return k;
  const u = gun.userData, r = {};
  try {
    // tentativas: cabo > pescoco da coronha > alcance maior (peca grossa)
    let tryR = (side) => { const a = u.gripR.position; return measure(gun, a.clone(), 'grip', side, u.gripCol) || measure(gun, a.clone(), 'wrist', side, null) || measure(gun, a.clone(), 'grip', side, u.gripCol, 1.7) || measure(gun, a.clone(), 'wrist', side, null, 1.7) || measure(gun, a.clone(), 'grip', side, null, 1.7) || measure(gun, a.clone(), 'grip', side, null, 2.6) || measure(gun, a.clone(), 'wrist', side, null, 2.6); };
    // ultima cartada: fatias vizinhas (um pouco pra frente/tras/baixo) quando o ponto exato cai num pedaco estranho da malha
    const near = (fn, a0, offs) => { for (const [dy, dz] of offs) { const h = fn(a0.clone().add(new THREE.Vector3(0, dy, dz))); if (h) return h; } return null; };
    const OFF_R = [[0, 0], [-0.02, 0], [0, 0.02], [0, -0.02], [-0.03, 0.02], [-0.03, -0.02]], OFF_L = [[0, 0], [0, 0.03], [0, -0.03], [0, 0.06], [-0.015, 0], [0.015, 0]];
    const tryR0 = tryR; tryR = (side) => tryR0(side) || near((a) => measure(gun, a, 'grip', side, null, 1.7) || measure(gun, a, 'wrist', side, null, 1.7), u.gripR.position, OFF_R.slice(1));
    if (u.gripR) r.R = tryR(1);
    if (u.gripL && o.leftKind) r.L = near((a) => measure(gun, a, o.leftKind, -1, null) || measure(gun, a, o.leftKind, -1, null, 1.6), u.gripL.position, OFF_L) || measure(gun, u.gripL.position.clone(), o.leftKind, -1, null, 1.6) || measure(gun, u.gripL.position.clone(), o.leftKind, -1, null, 2.6);
    if (o.akimboLeft && u.gripR) r.AK = tryR(-1);
  } catch (e) { console.warn('handwrap', e); }
  if (o.key) cache.set(o.key, r);
  return r;
}

// monta os dedos e a palma como filhos da arma; devolve o grupo (escondido ate o viewmodel ligar)
export function buildWrap(gun, h) {
  if (!h) return null;
  const g = new THREE.Group(); g.userData.handFx = true; g.visible = false;
  const th = 0.006 * U;
  for (const pts of [...h.fingers, ...(h.thumb ? [h.thumb] : [])]) {
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = ink(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 3), TUBE, 8, false), PAL.white, th);
    tube.userData.handFx = true; g.add(tube);
    const tip = ink(new THREE.SphereGeometry(TUBE, 10, 8), PAL.white, th); tip.position.copy(pts[pts.length - 1]); tip.userData.handFx = true; g.add(tip);
  }
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(h.X, h.Y, h.Z));
  const palm = ink(new THREE.SphereGeometry(PALM_R, 14, 10), PAL.white, th);
  palm.scale.set(...PALM_S); palm.position.copy(h.palm); palm.quaternion.copy(q); palm.userData.handFx = true; g.add(palm);
  // costuras da luva nas costas da mao
  for (const x of [-0.018, 0, 0.018]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.045 * U, 0.003 * U, 0.004 * U), new THREE.MeshBasicMaterial({ color: PAL.ink })); l.position.copy(h.palm).addScaledVector(h.Z, PALM_R * PALM_S[2] * 0.98).addScaledVector(h.Y, x * U); l.quaternion.copy(q); g.add(l); }
  g.userData.q = q; g.userData.h = h;
  gun.add(g);
  return g;
}

// pose do punho (luva com o punho em sino) atras da palma, no mundo
const tq = new THREE.Quaternion(), tp = V();
export function wristPose(gun, wrap, glove) {
  const h = wrap.userData.h;
  tp.copy(h.palm).addScaledVector(h.Z, -0.05 * U);
  gun.localToWorld(glove.position.copy(tp));
  gun.getWorldQuaternion(tq);
  glove.quaternion.copy(tq).multiply(wrap.userData.q);
}

// diagnostico (tools/hand-debug.html): o que os raios veem em volta da ancora
export function _handDiag(gun, which = 'R') {
  const u = gun.userData, A = (which === 'R' ? u.gripR : u.gripL).position.clone(), T = gather(gun, A, 0.16), far = 0.09;
  const dirs = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+z': [0, 0, 1], '-z': [0, 0, -1], '+y': [0, 1, 0], '-y': [0, -1, 0] };
  const o = { anchor: A.toArray().map(v => +v.toFixed(3)), tris: T.length / 3 };
  for (const [k, d] of Object.entries(dirs)) o[k] = hits(T, A, new THREE.Vector3(...d), far).map(v => +v.toFixed(3));
  return o;
}
