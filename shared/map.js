// Mapas da Rubber Riot: dados puros (navegador e servidor) + fisica/raio por mapa.
// Caixas sao AABB { min:[x,y,z], max:[x,y,z], kind, ... }. Cada sala carrega o seu mapa.

function builder(arena) {
  const boxes = [];
  const box = (cx, cz, w, d, h, y0 = 0, kind = 'crate', extra = {}) => {
    boxes.push({ min: [cx - w / 2, y0, cz - d / 2], max: [cx + w / 2, y0 + h, cz + d / 2], kind, ...extra });
  };
  // escada: n degraus subindo na direcao (dx,dz)
  const stairs = (x0, z0, dx, dz, width, n, stepH, stepD, kind = 'step') => {
    for (let i = 0; i < n; i++) {
      const cx = x0 + dx * (i + 0.5) * stepD, cz = z0 + dz * (i + 0.5) * stepD;
      box(cx, cz, dx !== 0 ? stepD : width, dz !== 0 ? stepD : width, (i + 1) * stepH, 0, kind);
    }
  };
  const walls = (h = 7) => {
    box(0, -arena - 1, arena * 2 + 4, 2, h, 0, 'wall');
    box(0, arena + 1, arena * 2 + 4, 2, h, 0, 'wall');
    box(-arena - 1, 0, 2, arena * 2 + 4, h, 0, 'wall');
    box(arena + 1, 0, 2, arena * 2 + 4, h, 0, 'wall');
  };
  return { boxes, box, stairs, walls };
}

// ---------- Vila Borracha (media) ----------
function vila() {
  const A = 58, { boxes, box, stairs, walls } = builder(A);
  walls();
  for (const s of [-1, 1]) {
    const team = s < 0 ? 'red' : 'blue';
    box(0, s * 55, 26, 6, 10, 0, 'house', { team, roof: 'flat', seed: 1 });
    box(-16, s * 46, 9, 9, 7, 0, 'house', { team, roof: 'peak', seed: 2 });
    box(16, s * 46, 9, 9, 7, 0, 'house', { team, roof: 'peak', seed: 3 });
    box(0, s * 50.5, 14, 3, 0.5, 4, 'platform');
    stairs(8, s * 50.5, 1, 0, 3, 8, 0.5, 0.75);
    box(-6, s * 40, 2.4, 2.4, 1.6, 0, 'crate');
    box(6, s * 40, 2.4, 2.4, 1.6, 0, 'crate');
    box(6.8, s * 40.5, 1.4, 1.4, 1.2, 1.6, 'crate');
    box(-26, s * 36, 6, 2, 2.2, 0, 'crate');
    box(26, s * 36, 6, 2, 2.2, 0, 'crate');
  }
  for (const sx of [-1, 1]) {
    box(sx * 26, -16, 10, 10, 8, 0, 'house', { roof: 'peak', seed: 4 + sx });
    box(sx * 26, 16, 10, 10, 9, 0, 'house', { roof: 'flat', seed: 6 + sx });
    box(sx * 26, 0, 4, 22, 0.5, 4, 'bridge');
    stairs(sx * 20, -6, sx * -1, 0, 3, 8, 0.5, 0.75);
    box(sx * 20 - sx * 0.75 * 8 - sx * 1, -6, 2.2, 3, 4, 0, 'step');
    box(sx * 44, -26, 8, 12, 6, 0, 'house', { roof: 'peak', seed: 8 + sx });
    box(sx * 44, 26, 8, 12, 6, 0, 'house', { roof: 'peak', seed: 10 + sx });
    box(sx * 38, 0, 2, 2, 1.4, 0, 'crate');
    box(sx * 40, 3, 2, 2, 1.4, 0, 'crate');
    box(sx * 14, -24, 2.2, 6, 1.8, 0, 'crate');
    box(sx * 14, 24, 2.2, 6, 1.8, 0, 'crate');
  }
  box(0, 0, 12, 12, 1.5, 0, 'platform');
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 0; i < 3; i++) {
      const off = 3 - i;
      box(dx * (6 + off * 0.75 - 0.375), dz * (6 + off * 0.75 - 0.375), dx ? 0.75 : 4, dz ? 0.75 : 4, (i + 1) * 0.5, 0, 'step');
    }
  }
  for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) box(x, z, 0.6, 0.6, 7, 1.5, 'pillar');
  box(0, 0, 7.5, 7.5, 4, 8.5, 'tank');
  box(-10, 10, 2, 2, 1.4, 0, 'crate');
  box(10, -10, 2, 2, 1.4, 0, 'crate');
  box(0, -20, 8, 1.2, 1.6, 0, 'crate');
  box(0, 20, 8, 1.2, 1.6, 0, 'crate');
  return {
    id: 'vila', arena: A, boxes, theme: 'vila',
    spawns: {
      red: [[-8, -44], [8, -44], [-20, -38], [20, -38], [0, -36], [-30, -42], [30, -42], [-10, -32]],
      blue: [[-8, 44], [8, 44], [-20, 38], [20, 38], [0, 36], [-30, 42], [30, 42], [10, 32]],
      ffa: [[-50, -50], [50, -50], [-50, 50], [50, 50], [-35, 0], [35, 0], [0, -30], [0, 30],
        [-26, -30], [26, 30], [-14, 0], [14, 0], [-50, 0], [50, 0], [0, -45], [0, 45]],
    },
    flagBase: { red: [0, 0, -48.5], blue: [0, 0, 48.5] },
    zones: [{ id: 'A', pos: [-36, 0, 0], r: 5 }, { id: 'B', pos: [0, 1.5, 0], r: 5 }, { id: 'C', pos: [36, 0, 0], r: 5 }],
    pickups: [
      { kind: 'wpn', wpn: 'minigun', pos: [0, 1.5, 0] },
      { kind: 'wpn', wpn: 'sniper', pos: [-26, 4.5, 0] }, { kind: 'wpn', wpn: 'sniper', pos: [26, 4.5, 0] },
      { kind: 'wpn', wpn: 'shotgun', pos: [-44, 0, 0] }, { kind: 'wpn', wpn: 'shotgun', pos: [44, 0, 0] },
      { kind: 'wpn', wpn: 'minigun', pos: [0, 0, -26] }, { kind: 'wpn', wpn: 'minigun', pos: [0, 0, 26] },
      { kind: 'wpn', wpn: 'rifle', pos: [-14, 0, -8] }, { kind: 'wpn', wpn: 'rifle', pos: [14, 0, 8] },
      { kind: 'hp', pos: [-36, 0, -14] }, { kind: 'hp', pos: [36, 0, 14] }, { kind: 'hp', pos: [-12, 0, 24] },
      { kind: 'hp', pos: [12, 0, -24] }, { kind: 'hp', pos: [0, 4.5, -50.5] }, { kind: 'hp', pos: [0, 4.5, 50.5] },
    ],
  };
}

// ---------- Fabrica de Tinta (pequena, fechada, passarelas) ----------
function fabrica() {
  const A = 34, { boxes, box, stairs, walls } = builder(A);
  walls(10);
  // tonel central com escadas dos dois lados (ponto B em cima)
  box(0, 0, 9, 9, 3, 0, 'vat');
  stairs(-8.5, 0, 1, 0, 3, 6, 0.5, 0.67);
  stairs(8.5, 0, -1, 0, 3, 6, 0.5, 0.67);
  // passarelas altas ligando as pontas
  for (const s of [-1, 1]) {
    box(0, s * 13, 44, 2.6, 0.5, 4, 'bridge');
    stairs(-s * 30, s * 13, s, 0, 2.6, 8, 0.5, 0.75);
    for (const x of [-16, 0, 16]) box(x, s * 13, 0.5, 0.5, 4, 0, 'pillar');
    box(0, s * 30, 18, 4, 3, 0, 'machine', { team: s < 0 ? 'red' : 'blue' });
  }
  for (const sx of [-1, 1]) {
    box(sx * 21, 0, 6, 9, 3.5, 0, 'machine');
    box(sx * 12, sx * -22, 5, 4, 2.5, 0, 'machine');
    box(sx * 12, sx * 22, 3, 3, 1.6, 0, 'crate');
    box(sx * 27, sx * 20, 2.4, 2.4, 1.6, 0, 'crate');
    box(sx * 27, sx * -6, 2.4, 2.4, 1.6, 0, 'crate');
    box(sx * 27.5, sx * -6.6, 1.3, 1.3, 1.1, 1.6, 'crate');
    box(sx * 7, sx * 7, 2, 2, 1.4, 0, 'crate');
    // canos no alto (cara de fabrica, sem atrapalhar)
    box(sx * 31, 0, 1.2, A * 2, 1.2, 7.5, 'pipe');
  }
  box(0, -24, 2.4, 2.4, 1.6, 0, 'crate');
  box(0, 24, 2.4, 2.4, 1.6, 0, 'crate');
  return {
    id: 'fabrica', arena: A, boxes, theme: 'fabrica',
    spawns: {
      red: [[-8, -25], [8, -25], [-20, -27], [20, -27], [0, -21], [-28, -26]],
      blue: [[-8, 25], [8, 25], [-20, 27], [20, 27], [0, 21], [28, 26]],
      ffa: [[-30, -30], [30, 30], [-30, 30], [30, -30], [-26, 0], [26, 0], [0, -18], [0, 18], [-14, -10], [14, 10], [-16, 26], [16, -26]],
    },
    flagBase: { red: [0, 0, -25], blue: [0, 0, 25] },
    zones: [{ id: 'A', pos: [-26, 0, 18], r: 4.5 }, { id: 'B', pos: [0, 3, 0], r: 4 }, { id: 'C', pos: [26, 0, -18], r: 4.5 }],
    pickups: [
      { kind: 'wpn', wpn: 'minigun', pos: [0, 3, 0] },
      { kind: 'wpn', wpn: 'shotgun', pos: [-21, 3.5, 0] }, { kind: 'wpn', wpn: 'shotgun', pos: [21, 3.5, 0] },
      { kind: 'wpn', wpn: 'rifle', pos: [0, 4.5, -13] }, { kind: 'wpn', wpn: 'smg', pos: [0, 4.5, 13] },
      { kind: 'hp', pos: [-27, 0, 0] }, { kind: 'hp', pos: [27, 0, 0] }, { kind: 'hp', pos: [0, 0, -18] }, { kind: 'hp', pos: [0, 0, 18] },
    ],
  };
}

// ---------- Fronteira (grande, dois fortes, linhas longas) ----------
function fronteira() {
  const A = 76, { boxes, box, stairs, walls } = builder(A);
  walls(8);
  for (const s of [-1, 1]) {
    const team = s < 0 ? 'red' : 'blue';
    // forte: predio dos fundos, duas torres com escada, muretas e varanda
    box(0, s * 72, 34, 6, 11, 0, 'house', { team, roof: 'flat', seed: 1 });
    for (const sx of [-1, 1]) {
      box(sx * 22, s * 62, 5, 5, 6, 0, 'tower', { team });
      stairs(sx * 18.5, s * 64.5, -sx, 0, 3, 8, 0.75, 0.6);
      box(sx * 9, s * 52, 8, 1.2, 1.6, 0, 'wall');
    }
    box(0, s * 66, 12, 2.4, 0.5, 4, 'platform');
    stairs(7.5, s * 66, 1, 0, 2.4, 8, 0.5, 0.6);
    box(-30, s * 48, 8, 8, 6, 0, 'house', { team, roof: 'peak', seed: 2 });
    box(30, s * 48, 8, 8, 6, 0, 'house', { team, roof: 'peak', seed: 3 });
    for (const sx of [-1, 1]) {
      box(sx * 30, s * 24, 9, 9, 7, 0, 'house', { roof: 'peak', seed: 4 + sx });
      box(sx * 12, s * 32, 3, 3, 1.6, 0, 'crate');
      box(sx * 52, s * 30, 4, 4, 2.4, 0, 'rock');
      box(sx * 64, s * 50, 5, 5, 3, 0, 'rock');
    }
    box(0, s * 38, 10, 10, 8, 0, 'house', { roof: 'flat', seed: 6 });
  }
  // linha do meio: muretas com vaos, torres de sniper nas laterais
  for (const x of [-60, -38, -16, 16, 38, 60]) box(x, 0, 12, 1.2, 1.7, 0, 'wall');
  for (const sx of [-1, 1]) {
    box(sx * 50, 0, 5, 5, 7, 0, 'tower');
    stairs(sx * 46, 6, sx, 0, 3, 9, 0.78, 0.5);
    box(sx * 24, 8, 4, 4, 2.4, 0, 'rock');
    box(sx * 24, -8, 4, 4, 2.4, 0, 'rock');
  }
  box(0, 0, 8, 8, 1.2, 0, 'platform');
  return {
    id: 'fronteira', arena: A, boxes, theme: 'fronteira',
    spawns: {
      red: [[-8, -60], [8, -60], [-14, -56], [14, -56], [0, -54], [-28, -58], [28, -58], [0, -62]],
      blue: [[-8, 60], [8, 60], [-14, 56], [14, 56], [0, 54], [-28, 58], [28, 58], [0, 62]],
      ffa: [[-66, -66], [66, 66], [-66, 66], [66, -66], [-50, -20], [50, 20], [0, -46], [0, 46], [-30, 0], [30, 0], [-60, 30], [60, -30]],
    },
    flagBase: { red: [0, 0, -64], blue: [0, 0, 64] },
    zones: [{ id: 'A', pos: [-44, 0, 0], r: 6 }, { id: 'B', pos: [0, 1.2, 0], r: 5 }, { id: 'C', pos: [44, 0, 0], r: 6 }],
    pickups: [
      { kind: 'wpn', wpn: 'sniper', pos: [-50, 7, 0] }, { kind: 'wpn', wpn: 'sniper', pos: [50, 7, 0] },
      { kind: 'wpn', wpn: 'minigun', pos: [0, 1.2, 0] },
      { kind: 'wpn', wpn: 'rifle', pos: [-30, 0, -14] }, { kind: 'wpn', wpn: 'rifle', pos: [30, 0, 14] },
      { kind: 'wpn', wpn: 'shotgun', pos: [0, 0, -30] }, { kind: 'wpn', wpn: 'shotgun', pos: [0, 0, 30] },
      { kind: 'hp', pos: [-24, 0, 0] }, { kind: 'hp', pos: [24, 0, 0] }, { kind: 'hp', pos: [0, 4.5, -66] }, { kind: 'hp', pos: [0, 4.5, 66] },
      { kind: 'hp', pos: [-60, 0, 0] }, { kind: 'hp', pos: [60, 0, 0] },
    ],
  };
}

const BUILDERS = { vila, fabrica, fronteira };
export const MAP_IDS = Object.keys(BUILDERS);
// mapa sugerido por modo
export const MODE_MAP = { ffa: 'fabrica', gungame: 'fabrica', tdm: 'vila', dom: 'vila', ctf: 'fronteira' };
const cache = {};
export function getMap(id) {
  if (!BUILDERS[id]) id = 'vila';
  return cache[id] || (cache[id] = BUILDERS[id]());
}

const STEP = 0.6;

// Move um corpo AABB (pes em pos) com degrau automatico. Muta pos e vel.
export function moveBody(M, pos, vel, dt, rad, height) {
  const boxes = M.boxes;
  let onGround = false;
  const stepAxis = (ax) => {
    pos[ax] += vel[ax] * dt;
    for (const b of boxes) {
      if (!overlap(pos, rad, height, b)) continue;
      const climb = b.max[1] - pos[1];
      if (climb > 0 && climb <= STEP && !blockedAbove(boxes, pos, rad, height, b.max[1])) { pos[1] = b.max[1]; continue; }
      const o = ax === 0 ? 0 : 2;
      if (vel[ax] > 0) pos[ax] = b.min[o] - rad - 1e-4;
      else if (vel[ax] < 0) pos[ax] = b.max[o] + rad + 1e-4;
      else { const c = (b.min[o] + b.max[o]) / 2; pos[ax] = pos[ax] < c ? b.min[o] - rad - 1e-4 : b.max[o] + rad + 1e-4; }
    }
  };
  stepAxis(0);
  stepAxis(2);
  pos[1] += vel[1] * dt;
  for (const b of boxes) {
    if (!overlap(pos, rad, height, b)) continue;
    if (vel[1] <= 0) { pos[1] = b.max[1]; onGround = true; }
    else pos[1] = b.min[1] - height - 1e-4;
    vel[1] = 0;
  }
  if (pos[1] <= 0) { pos[1] = 0; if (vel[1] < 0) vel[1] = 0; onGround = true; }
  if (!onGround && vel[1] <= 0) {
    const probe = [pos[0], pos[1] - 0.05, pos[2]];
    for (const b of boxes) if (overlap(probe, rad, 0.06, b)) { onGround = true; break; }
  }
  return onGround;
}

function blockedAbove(boxes, pos, rad, height, newY) {
  const p = [pos[0], newY + 0.01, pos[2]];
  for (const b of boxes) if (overlap(p, rad, height - 0.02, b)) return true;
  return false;
}

function overlap(pos, rad, height, b) {
  return pos[0] + rad > b.min[0] && pos[0] - rad < b.max[0] &&
    pos[2] + rad > b.min[2] && pos[2] - rad < b.max[2] &&
    pos[1] + height > b.min[1] + 1e-3 && pos[1] < b.max[1] - 1e-3;
}

// Raio contra o mapa. Devolve distancia (Infinity se nada) e normal.
export function raycast(M, o, d, maxDist = 250) {
  let best = maxDist, normal = null;
  if (d[1] < 0) {
    const t = -o[1] / d[1];
    if (t >= 0 && t < best) { best = t; normal = [0, 1, 0]; }
  }
  for (const b of M.boxes) {
    let tmin = 0, tmax = best, nAxis = -1, nSign = 0, miss = false;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) { if (o[a] < b.min[a] || o[a] > b.max[a]) { miss = true; break; } continue; }
      const inv = 1 / d[a];
      let t1 = (b.min[a] - o[a]) * inv, t2 = (b.max[a] - o[a]) * inv, s = -1;
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; }
      if (t1 > tmin) { tmin = t1; nAxis = a; nSign = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) { miss = true; break; }
    }
    if (!miss && tmin < best && nAxis >= 0) { best = tmin; normal = [0, 0, 0]; normal[nAxis] = nSign; }
  }
  return { dist: best >= maxDist ? Infinity : best, normal };
}

export function hasLOS(M, a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 1e-3) return true;
  d[0] /= len; d[1] /= len; d[2] /= len;
  return raycast(M, a, d, len).dist === Infinity;
}

// Hitbox de personagem: corpo (AABB) + cabeca (esfera)
export function rayPlayer(o, d, p, maxDist) {
  const crouch = p.anim === 'crouch' || p.anim === 'slide';
  const bodyH = crouch ? 0.9 : 1.3;
  const headY = p.pos[1] + (crouch ? 1.15 : 1.6);
  const hc = [p.pos[0] - o[0], headY - o[1], p.pos[2] - o[2]];
  const tc = hc[0] * d[0] + hc[1] * d[1] + hc[2] * d[2];
  if (tc > 0 && tc < maxDist) {
    const dd = hc[0] * hc[0] + hc[1] * hc[1] + hc[2] * hc[2] - tc * tc;
    if (dd < 0.34 * 0.34) return { dist: tc - Math.sqrt(0.34 * 0.34 - dd), head: true };
  }
  const r = 0.48;
  const b = { min: [p.pos[0] - r, p.pos[1], p.pos[2] - r], max: [p.pos[0] + r, p.pos[1] + bodyH, p.pos[2] + r] };
  let tmin = 0, tmax = maxDist;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < b.min[a] || o[a] > b.max[a]) return null; continue; }
    let t1 = (b.min[a] - o[a]) / d[a], t2 = (b.max[a] - o[a]) / d[a];
    if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return { dist: tmin, head: false };
}
