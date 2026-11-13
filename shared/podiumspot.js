// Onde o podio fica em cada mapa (05/11, REGRA dele): sempre no proprio mapa, num lugar com espaco pros 3 tambores e pra camera ver.
// Vale sozinho pra mapa novo: procura do meio pra fora e o `npm run check` trava se o mapa nao tiver lugar. Mapa com lugar ruim
// pode fixar o seu com M.podium = { x, z, yaw, d }. Sem three aqui: quem desenha e src/podium.js.
import { hasLOS as losBullet } from './map.js';
// 13/11 (print dele, Xilindro): o podio enxergava ATRAVES da grade da cela (a bala passa, a vista nao): aqui tudo tapa
const hasLOS = (M, a, b) => losBullet(M, a, b, true);
import { floorAt, standable } from './nav.js';

export const POD_SPOTS = [{ x: 0, h: 1.05 }, { x: 2.5, h: 0.72 }, { x: -2.5, h: 0.42 }]; // 1o no meio; a camera olha pra +z local
export const POD_CAM_Y = 2.4, POD_LOOK_Y = 1.7;
const HALF_W = 3.9, HALF_D = 1.7, TALL = 4.6, FLAT = 0.3, DISTS = [12, 9.5, 7.5], YAWS = 8, STEP = 4;

// caixas por celula de 4 m: testar todas em todo ponto da busca era lento demais
function boxGrid(M) {
  const g = new Map(), key = (i, j) => i * 100000 + j;
  for (const b of M.boxes) for (let i = Math.floor(b.min[0] / 4); i <= Math.floor(b.max[0] / 4); i++) for (let j = Math.floor(b.min[2] / 4); j <= Math.floor(b.max[2] / 4); j++) { const k = key(i, j); if (!g.has(k)) g.set(k, []); g.get(k).push(b); }
  return (x, z, y0, y1) => (g.get(key(Math.floor(x / 4), Math.floor(z / 4))) || []).some(b => x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2] && b.max[1] > y0 && b.min[1] < y1);
}

function tryAt(M, solid, cx, cz, yaw) {
  const sn = Math.sin(yaw), cs = Math.cos(yaw), w = (lx, lz) => [cx + cs * lx + sn * lz, cz - sn * lx + cs * lz];
  if (!standable(M, cx, cz)) return null;
  const y = floorAt(M, cx, cz); if (!Number.isFinite(y)) return null;
  for (let lx = -HALF_W; lx <= HALF_W + 1e-6; lx += HALF_W / 3) for (let lz = -HALF_D; lz <= HALF_D + 1e-6; lz += HALF_D) { // palco plano e livre ate acima da cabeca
    const [x, z] = w(lx, lz);
    if (Math.abs(x) > M.arena - 1 || Math.abs(z) > M.arena - 1 || !Number.isFinite(floorAt(M, x, z)) || Math.abs(floorAt(M, x, z) - y) > FLAT || solid(x, z, y + 0.35, y + TALL)) return null;
  }
  for (const d of DISTS) { // camera: dentro da arena, fora de parede e vendo os 3 da cabeca ao pe
    const [x, z] = w(0, -d), eye = [x, y + POD_CAM_Y, z];
    if (Math.abs(x) > M.arena - 1 || Math.abs(z) > M.arena - 1 || solid(x, z, eye[1] - 0.5, eye[1] + 0.5) || floorAt(M, x, z) > eye[1] - 0.6) continue;
    // do pe do tambor ao topo da cabeca: nada na frente
    if (POD_SPOTS.every(S => { const [sx, sz] = w(S.x, 0); return [0.12, S.h * 0.6, S.h + 0.3, S.h + 2.3].every(h => hasLOS(M, eye, [sx, y + h, sz])) && hasLOS(M, eye, [sx + 1, y + 0.12, sz - 1]) && hasLOS(M, eye, [sx - 1, y + 0.12, sz - 1]) && [-0.6, 0.6].every(o => [S.h + 0.8, S.h + 1.8].every(h => hasLOS(M, eye, [sx + o, y + h, sz]))); /* 13/11: os lados do corpo tambem (pilar fino passava entre os raios) */ })) {
      const [bx, bz] = w(0, 30);
      // wide (09/11, pedido dele): a tela inteira livre, nao so o corredor ate os bonecos; lugar sem isso so entra se nao houver outro
      const wide = [-6.3, -5.2, 5.2, 6.3].every(lx => { const [px, pz] = w(lx, -2); return [0.5, 2, 3.6].every(h => hasLOS(M, eye, [px, y + h, pz])); });
      return { x: cx, y, z: cz, yaw, d, wide, back: !hasLOS(M, [cx, y + 2, cz], [bx, y + 2, bz]) }; // back: tem cenario atras dos bonecos
    }
  }
  return null;
}

// o primeiro lugar perfeito do meio pra fora; sem perfeito, o melhor que apareceu (camera mais longe, com cenario atras)
export function podiumSpot(M) {
  if (M._pod !== undefined) return M._pod;
  if (M.podium) { const P = M.podium; return (M._pod = { ...P, y: floorAt(M, P.x, P.z), d: P.d ?? 12 }); }
  const solid = M._podSolid ||= boxGrid(M); let best = null;
  const score = (s) => s.d * 2 + (s.back ? 10 : 0) + (s.wide ? 20 : 0);
  for (let r = 0; r * STEP < M.arena; r++) {
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
      for (let a = 0; a < YAWS; a++) {
        const s = tryAt(M, solid, i * STEP, j * STEP, a / YAWS * Math.PI * 2);
        if (!s) continue;
        if (s.d === DISTS[0] && s.back && s.wide) return (M._pod = s);
        if (!best || score(s) > score(best)) best = s;
      }
    }
  }
  return (M._pod = best);
}

// caminho da camera chegando no podio: desce de longe e pousa na frente deles. Testa cada opcao contra parede e teto; se nenhuma
// passa, sai de perto do palco e recua (o corredor ate a camera final ja foi conferido na busca, entao esse sempre serve)
export function podiumCam(M, S) {
  const solid = M._podSolid ||= boxGrid(M), sn = Math.sin(S.yaw), cs = Math.cos(S.yaw), d = S.d;
  const W = ([lx, ly, lz]) => [S.x + cs * lx + sn * lz, S.y + ly, S.z - sn * lx + cs * lz];
  const end = [0, POD_CAM_Y, -d], at = W([0, 1.8, 0]);
  const bez = (a, c, b, u) => a.map((v, i) => (1 - u) * (1 - u) * v + 2 * (1 - u) * u * c[i] + u * u * b[i]);
  const clear = (a, c) => { let prev = null; for (let k = 0; k <= 14; k++) { const q = W(bez(a, c, end, k / 14)); if (Math.abs(q[0]) > M.arena - 1 || Math.abs(q[2]) > M.arena - 1 || solid(q[0], q[2], q[1] - 0.5, q[1] + 0.5) || floorAt(M, q[0], q[2]) > q[1] - 0.6 || !hasLOS(M, q, at) || (prev && !hasLOS(M, prev, q))) return false; prev = q; } return true; };
  const TRY = [[[-11, 9, -d - 6], [-9, 3.5, -d]], [[11, 9, -d - 6], [9, 3.5, -d]], [[-8, 12, -d], [-7, 4, -d]], [[8, 12, -d], [7, 4, -d]], [[0, 13, -d - 2], [0, 5, -d - 1]], [[-6, 6, -d + 3], [-5, 3, -d]], [[6, 6, -d + 3], [5, 3, -d]]];
  for (const [a, c] of TRY) if (clear(a, c)) return { a: W(a), c: W(c), b: W(end), at };
  return { a: W([1.2, 2.2, -3.4]), c: W([0.8, 2.3, -d * 0.6]), b: W(end), at };
}

// enfeite do mapa (arvore, moita) que nao e obstaculo do jogo nao entra na busca acima: quem desenha o mapa pergunta aqui e nao poe nada
// em cima do palco nem no caminho da camera
export function podiumClear(M, x, z) {
  const S = podiumSpot(M); if (!S) return false;
  const dx = x - S.x, dz = z - S.z, lx = Math.cos(S.yaw) * dx - Math.sin(S.yaw) * dz, lz = Math.sin(S.yaw) * dx + Math.cos(S.yaw) * dz;
  return Math.abs(lx) < 5 && lz > -S.d - 2 && lz < 3;
}
