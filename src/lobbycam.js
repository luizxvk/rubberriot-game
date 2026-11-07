// Camera de cinema do lobby (07/11, pedido dele: "tipo o lobby de zumbi do AW"). Em vez de girar em volta do mapa,
// a camera faz TOMADAS: cada uma olha um ponto que importa (base, ponto de captura, cofre, centro, telhado alto) e anda
// devagar (travelling de lado, aproximacao ou grua subindo). Troca de tomada = fade pro preto e volta.
// REGRA: a camera nunca entra em peca. Toda tomada e conferida contra as caixas do mapa (com folga), as arvores do
// tema e o chao, e o alvo tem que estar a vista do caminho inteiro. Mapa sem tomada boa (raro) volta pra orbita antiga.
import * as THREE from 'three';
import { raycast } from '../shared/map.js';
import { mapTrees } from './world.js';

const SHOT_T = [7, 10]; // duracao de cada tomada (s)
const FADE = 0.45; // fade de saida e de entrada (s)
const CLEAR = 1.3; // folga minima da camera pra qualquer caixa (m)
const TREE_R = 3.4; // raio da copa das arvores (m)
const N_SHOTS = 7;

const rnd = (a, b) => a + Math.random() * (b - a);
const ease = (u) => u * u * (3 - 2 * u);

function inside(M, p, m) {
  for (const b of M.boxes) {
    const v = b.vis || b;
    if (p[0] > v.min[0] - m && p[0] < v.max[0] + m && p[1] > v.min[1] - m && p[1] < v.max[1] + m && p[2] > v.min[2] - m && p[2] < v.max[2] + m) return true;
  }
  return false;
}
// altura do chao/superficie embaixo do ponto
function floorAt(M, x, z, top = 60) { const h = raycast(M, [x, top, z], [0, -1, 0], top + 1); return Number.isFinite(h.dist) ? top - h.dist : 0; }
// o alvo aparece daqui? (o raio pode parar ate 1,5 m antes: o alvo as vezes esta em cima de uma peca)
function sees(M, p, t) {
  const d = [t[0] - p[0], t[1] - p[1], t[2] - p[2]], L = Math.hypot(...d);
  const h = raycast(M, p, d.map(v => v / L), L);
  return !Number.isFinite(h.dist) || h.dist >= L - 1.5;
}

// pontos que valem a pena mostrar
function targets(M) {
  const T = [[0, 1.5, 0]];
  for (const z of M.zones || []) T.push([z.pos[0], (z.pos[1] || 0) + 1.2, z.pos[2]]);
  if (M.flagBase) for (const k of ['red', 'blue']) if (M.flagBase[k]) T.push([M.flagBase[k][0], (M.flagBase[k][1] || 0) + 1.2, M.flagBase[k][2]]);
  if (M.heistPts?.vault) T.push([M.heistPts.vault[0], 1.5, M.heistPts.vault[1]]);
  // 3 pecas mais altas (casa, torre, banco): o topo delas
  const tall = M.boxes.filter(b => !b.kind || !['tier', 'roof', 'wall'].includes(b.kind)).map(b => b.vis || b)
    .filter(v => Math.abs((v.min[0] + v.max[0]) / 2) < M.arena * 0.8 && Math.abs((v.min[2] + v.max[2]) / 2) < M.arena * 0.8)
    .sort((a, b) => b.max[1] - a.max[1]).slice(0, 3);
  for (const v of tall) T.push([(v.min[0] + v.max[0]) / 2, v.max[1] * 0.7, (v.min[2] + v.max[2]) / 2]);
  return T;
}

function pathOk(M, trees, a, b, tgt) {
  const lim = M.arena * 0.88;
  for (let k = 0; k <= 6; k++) {
    const u = k / 6, p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    if (Math.abs(p[0]) > lim || Math.abs(p[2]) > lim) return false;
    if (p[1] - floorAt(M, p[0], p[2]) < 2.2) return false;
    if (inside(M, p, CLEAR)) return false;
    for (const [x, z] of trees) if (Math.hypot(p[0] - x, p[2] - z) < TREE_R && p[1] < 9) return false;
    if (!sees(M, p, tgt)) return false;
    // copa de arvore entre a camera e o alvo tampa a tomada (arvore nao e caixa de colisao): o olhar passa longe da copa
    for (const [x, z] of trees) { const dx = tgt[0] - p[0], dz = tgt[2] - p[2], L2 = dx * dx + dz * dz || 1, w = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[2]) * dz) / L2));
      if (Math.hypot(p[0] + dx * w - x, p[2] + dz * w - z) < TREE_R + 0.6 && p[1] + (tgt[1] - p[1]) * w < 8.5) return false; }
  }
  return true;
}

// uma tomada: de onde sai, pra onde vai, o que olha
function makeShot(M, trees, T) {
  for (let tries = 0; tries < 60; tries++) {
    const tgt = T[Math.floor(Math.random() * T.length)];
    const ang = rnd(0, Math.PI * 2), dist = rnd(11, 24), gy = floorAt(M, tgt[0], tgt[2]);
    const a = [tgt[0] + Math.sin(ang) * dist, Math.max(tgt[1], gy) + rnd(2.5, 8), tgt[2] + Math.cos(ang) * dist];
    const f = [tgt[0] - a[0], 0, tgt[2] - a[2]], fl = Math.hypot(f[0], f[2]); f[0] /= fl; f[2] /= fl;
    const side = [f[2], 0, -f[0]], kind = Math.floor(Math.random() * 3), s = Math.random() < 0.5 ? -1 : 1;
    let mv;
    if (kind === 0) mv = [side[0] * s * rnd(5, 9), rnd(-0.5, 0.5), side[2] * s * rnd(5, 9)]; // travelling de lado
    else if (kind === 1) { const k = Math.min(6, dist - 7); mv = [f[0] * k, -rnd(0.5, 1.5), f[2] * k]; } // aproximacao
    else mv = [side[0] * s * 2, rnd(3, 5), side[2] * s * 2]; // grua subindo
    const b = [a[0] + mv[0], a[1] + mv[1], a[2] + mv[2]];
    if (!pathOk(M, trees, a, b, tgt)) continue;
    const lookA = [tgt[0] - side[0] * s * 1.5, tgt[1], tgt[2] - side[2] * s * 1.5], lookB = [tgt[0] + side[0] * s * 1.5, tgt[1] + 0.3, tgt[2] + side[2] * s * 1.5];
    return { a, b, lookA, lookB, T: rnd(SHOT_T[0], SHOT_T[1]), fov: rnd(46, 58) };
  }
  return null;
}

export class LobbyCam {
  constructor() { this.mapId = null; this.shots = []; this.i = 0; this.t = 0; }
  build(M) {
    this.mapId = M.id; this.shots = []; this.i = 0; this.t = 0;
    const trees = mapTrees(M), T = targets(M);
    for (let k = 0; k < N_SHOTS * 3 && this.shots.length < N_SHOTS; k++) { const s = makeShot(M, trees, T); if (s) this.shots.push(s); }
    // nada de duas tomadas seguidas no mesmo alvo
    for (let k = 1; k < this.shots.length; k++) if (this.shots[k].lookA[0] === this.shots[k - 1].lookA[0] && k + 1 < this.shots.length) [this.shots[k], this.shots[k + 1]] = [this.shots[k + 1], this.shots[k]];
  }
  // posiciona a camera; devolve o fade (0..1) ou null quando o mapa nao tem tomada (usar a orbita)
  frame(dt, M, camera) {
    if (!M) return null;
    if (this.mapId !== M.id) this.build(M);
    if (!this.shots.length) return null;
    let S = this.shots[this.i];
    this.t += Math.min(dt, 0.1);
    if (this.t >= S.T) { this.t = 0; this.i = (this.i + 1) % this.shots.length; S = this.shots[this.i]; }
    const u = ease(this.t / S.T), L = (a, b) => a.map((v, k) => v + (b[k] - v) * u);
    camera.position.set(...L(S.a, S.b));
    camera.lookAt(new THREE.Vector3(...L(S.lookA, S.lookB)));
    camera.fov = S.fov; camera.updateProjectionMatrix();
    return Math.max(0, 1 - this.t / FADE, 1 - (S.T - this.t) / FADE);
  }
  reset() { this.mapId = null; } // mapa trocou ou voltou pro lobby: tomadas novas
}
