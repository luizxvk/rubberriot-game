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

// ---------- Estaleiro (minusculo, conteineres, tiroteio sem parar) ----------
// Grade de conteineres com corredores curtos: de qualquer lugar voce esta a 2 esquinas
// de alguem. Pilhas duplas fecham a visao; o portico do guindaste passa por cima.
function estaleiro() {
  const A = 22, { boxes, box, walls } = builder(A);
  walls(6);
  // conteiner deitado (6 x 2.6 x 2.6); along = 'x' ou 'z'
  const cont = (cx, cz, along, y0 = 0, seed = 0) => box(cx, cz, along === 'x' ? 6 : 2.6, along === 'x' ? 2.6 : 6, 2.6, y0, 'container', { seed, along });
  // anel de fora: um conteiner em cada lado de cada quadrante, alternando a direcao
  cont(-11, -6, 'z', 0, 1); cont(11, 6, 'z', 0, 2); cont(-6, 11, 'x', 0, 3); cont(6, -11, 'x', 0, 4);
  cont(-11, 8, 'z', 0, 5); cont(11, -8, 'z', 0, 6); cont(8, 11, 'x', 0, 7); cont(-8, -11, 'x', 0, 8);
  // miolo: quatro conteineres em cata-vento em volta do centro, dois com outro em cima
  cont(-4, -4.5, 'x', 0, 9); cont(4, 4.5, 'x', 0, 10); cont(4.5, -4, 'z', 0, 11); cont(-4.5, 4, 'z', 0, 12);
  cont(-4, -4.5, 'x', 2.6, 13); cont(4, 4.5, 'x', 2.6, 14);
  // caixotes baixos: cobertura que da pra pular
  for (const [x, z] of [[0, 0], [-16, 0], [16, 0], [0, -16], [0, 16], [-16, -16], [16, 16]]) box(x, z, 1.6, 1.6, 1.2, 0, 'crate');
  box(-15.5, 15.5, 2.4, 2.4, 1.6, 0, 'crate'); box(15.5, -15.5, 2.4, 2.4, 1.6, 0, 'crate');
  // portico do guindaste: duas pernas nas pontas e a viga la no alto (nao atrapalha ninguem)
  for (const s of [-1, 1]) box(s * 19.5, 0, 1.2, 1.2, 9, 0, 'pillar');
  box(0, 0, 40, 1.4, 1.2, 9, 'gantry');
  return {
    id: 'estaleiro', arena: A, boxes, theme: 'estaleiro',
    spawns: {
      red: [[-8, -19], [8, -19], [-17, -19], [17, -19], [0, -19], [-13, -15]],
      blue: [[-8, 19], [8, 19], [-17, 19], [17, 19], [0, 19], [13, 15]],
      ffa: [[-19, -19], [19, 19], [-19, 19], [19, -19], [-19, -3], [19, 3], [0, -19], [0, 19], [-8, 0], [8, 0], [0, -8], [0, 8], [-14, 14], [14, -14]],
    },
    flagBase: { red: [0, 0, -19], blue: [0, 0, 19] },
    zones: [{ id: 'A', pos: [-16, 0, -8], r: 3.5 }, { id: 'B', pos: [0, 0, 0], r: 3.5 }, { id: 'C', pos: [16, 0, 8], r: 3.5 }],
    pickups: [
      { kind: 'wpn', wpn: 'shotgun', pos: [-8, 0, 0] }, { kind: 'wpn', wpn: 'shotgun', pos: [8, 0, 0] },
      { kind: 'wpn', wpn: 'smg', pos: [0, 0, -8] }, { kind: 'wpn', wpn: 'minigun', pos: [0, 0, 8] },
      { kind: 'hp', pos: [-19, 0, -12] }, { kind: 'hp', pos: [19, 0, 12] },
    ],
  };
}

// ---------- Refinaria (deserto, torre de bombeamento no meio) ----------
// Quem esta no alto da torre ve o mapa inteiro, mas fica exposto de todo lado.
// Embaixo: silos, linhas de cano na altura da cintura e duas barracas.
function refinaria() {
  const A = 36, { boxes, box, stairs, walls } = builder(A);
  walls(7);
  // torre: base de concreto (3 m) com escada dos dois lados, cabine em cima (mais 3 m)
  box(0, 0, 10, 10, 3, 0, 'concrete');
  // escada sobe NA DIRECAO dada: comeca longe da torre e chega na laje com o degrau mais alto
  stairs(-9.2, 1.5, 1, 0, 3, 6, 0.5, 0.7);
  stairs(9.2, -1.5, -1, 0, 3, 6, 0.5, 0.7);
  box(1.5, 1.5, 5, 5, 3, 3, 'concrete');
  // escada da laje ate o topo da cabine (cada degrau apoiado na laje)
  for (let i = 0; i < 6; i++) box(0.5, -1 - (5.5 - i) * 0.65, 2, 0.65, (i + 1) * 0.5, 3, 'step');
  // armacao da torre (decoracao): quatro pernas finas subindo e a "cabeca" da bomba la em cima
  for (const [x, z] of [[-0.6, -0.6], [3.6, -0.6], [-0.6, 3.6], [3.6, 3.6]]) box(x, z, 0.4, 0.4, 8, 6, 'pillar');
  box(1.5, 1.5, 6, 6, 0.5, 14, 'derrick');
  // silos de oleo nos quatro cantos
  for (const [x, z] of [[-24, -24], [24, 24], [-26, 22], [26, -22]]) box(x, z, 7, 7, 6, 0, 'silo');
  box(-18, -26, 5, 5, 4, 0, 'silo'); box(18, 26, 5, 5, 4, 0, 'silo');
  // linhas de cano: cobertura na cintura (pula por cima)
  for (const s of [-1, 1]) {
    box(s * 14, 0, 1, 18, 1, 0, 'pipe');
    box(0, s * 15, 14, 1, 1, 0, 'pipe');
    box(s * 22, s * 6, 1, 10, 1, 0, 'pipe');
  }
  // barracas (uma por time) e conteineres soltos
  box(0, -31, 12, 5, 4, 0, 'house', { team: 'red', roof: 'flat', seed: 2 });
  box(0, 31, 12, 5, 4, 0, 'house', { team: 'blue', roof: 'flat', seed: 3 });
  box(-30, 4, 2.6, 6, 2.6, 0, 'container', { seed: 4, along: 'z' });
  box(30, -4, 2.6, 6, 2.6, 0, 'container', { seed: 5, along: 'z' });
  box(-12, 24, 6, 2.6, 2.6, 0, 'container', { seed: 6, along: 'x' });
  box(12, -24, 6, 2.6, 2.6, 0, 'container', { seed: 7, along: 'x' });
  // dunas e pedras pra quebrar a linha de tiro
  for (const [x, z, s] of [[-12, -10, 3], [12, 10, 3], [-28, -10, 4], [28, 10, 4], [-8, 22, 2.6], [8, -22, 2.6]]) box(x, z, s, s, s * 0.6, 0, 'rock');
  for (const [x, z] of [[-6, 12], [6, -12], [-20, 14], [20, -14]]) box(x, z, 2, 2, 1.4, 0, 'crate');
  return {
    id: 'refinaria', arena: A, boxes, theme: 'refinaria',
    spawns: {
      red: [[-8, -26], [8, -26], [-16, -30], [16, -30], [-24, -32], [24, -32], [0, -24]],
      blue: [[-8, 26], [8, 26], [-16, 30], [16, 30], [-24, 32], [24, 32], [0, 24]],
      ffa: [[-32, -32], [32, 32], [-32, 32], [32, -32], [-32, -14], [32, 14], [-14, -32], [14, 32], [-20, 0], [20, 0], [0, -20], [0, 20], [-32, 8], [32, -8]],
    },
    flagBase: { red: [0, 0, -26], blue: [0, 0, 26] },
    zones: [{ id: 'A', pos: [-22, 0, 8], r: 4.5 }, { id: 'B', pos: [0, 3, 0], r: 4 }, { id: 'C', pos: [22, 0, -8], r: 4.5 }],
    pickups: [
      { kind: 'wpn', wpn: 'sniper', pos: [1.5, 6, 1.5] },
      { kind: 'wpn', wpn: 'minigun', pos: [0, 3, -3.5] },
      { kind: 'wpn', wpn: 'shotgun', pos: [-30, 0, -4] }, { kind: 'wpn', wpn: 'shotgun', pos: [30, 0, 4] },
      { kind: 'wpn', wpn: 'rifle', pos: [-14, 0, 20] }, { kind: 'wpn', wpn: 'rifle', pos: [14, 0, -20] },
      { kind: 'hp', pos: [-20, 0, -6] }, { kind: 'hp', pos: [20, 0, 6] }, { kind: 'hp', pos: [0, 0, -12] }, { kind: 'hp', pos: [0, 0, 12] },
    ],
  };
}

// ---------- Ilha Rebobina (battle royale, 220 x 220 m) ----------
// Sete areas com nome proprio espalhadas pela ilha, cobertura solta entre elas e pontos de loot em volta
// de cada construcao. Montagem com semente fixa: todo mundo (servidor e clientes) gera a MESMA ilha.
function ilha() {
  const A = 110, { boxes, box, stairs, walls } = builder(A);
  walls(6);
  // Ringue de Boxe (fora do muro sul): quem cai a 1a vez luta 1 contra 1 no soco pra voltar
  const RZ = A + 22;
  box(0, RZ, 12, 12, 1, 0, 'ringfloor');
  for (const [x, z, w, d] of [[0, RZ - 6, 12, 0.4], [0, RZ + 6, 12, 0.4], [-6, RZ, 0.4, 12], [6, RZ, 0.4, 12]]) box(x, z, w, d, 1.4, 1, 'rope');
  for (const [x, z] of [[-6, RZ - 6], [6, RZ - 6], [-6, RZ + 6], [6, RZ + 6]]) box(x, z, 0.6, 0.6, 1.8, 1, 'post');
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const r = (a, b) => a + rand() * (b - a);
  const loot = [];
  const lootRing = (x, z, r0, r1, n) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r(-0.3, 0.3), d = r(r0, r1); loot.push([x + Math.cos(a) * d, z + Math.sin(a) * d]); } };
  const areas = [];
  const area = (name, x, z, rad) => areas.push({ name, pos: [x, 0, z], r: rad });

  // Coreto das Moscas (centro): praca com coreto alto e muretas
  area('coreto', 0, 0, 20);
  box(0, 0, 10, 10, 1.2, 0, 'platform');
  box(0, 0, 4, 4, 7, 1.2, 'tower');
  stairs(5.5, -3, 1, 0, 3, 3, 0.4, 0.6);
  for (const [x, z] of [[-14, -6], [14, 6], [-6, 14], [6, -14]]) box(x, z, x === 6 || x === -6 ? 9 : 1.2, x === 6 || x === -6 ? 1.2 : 9, 1.6, 0, 'wall');
  for (const [x, z] of [[-12, 12], [12, -12], [12, 12], [-12, -12]]) box(x, z, 2.4, 2.4, 1.4, 0, 'crate');
  lootRing(0, 0, 7, 16, 10);

  // Vila Manivela (nordeste): casas coladas em ruas
  area('manivela', 62, -62, 28);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) continue;
    const x = 44 + i * 18, z = -80 + j * 18;
    box(x, z, r(8, 10), r(8, 10), r(6, 8), 0, 'house', { roof: rand() < 0.5 ? 'peak' : 'flat', seed: i * 3 + j });
    lootRing(x, z, 6.5, 8.5, 2);
  }
  box(62, -62, 6, 6, 1.4, 0, 'crate'); lootRing(62, -62, 4, 6, 3);

  // Porto Remendado (noroeste): conteineres empilhados e guindaste
  area('porto', -66, -66, 28);
  for (let i = 0; i < 6; i++) {
    const x = -84 + (i % 3) * 14, z = -82 + Math.floor(i / 3) * 16;
    box(x, z, 6, 12, 2.6, 0, 'container', { seed: i });
    if (i % 2 === 0) box(x, z, 6, 12, 2.6, 2.6, 'container', { seed: i + 3 });
    lootRing(x, z, 5, 7, 2);
  }
  box(-50, -50, 3, 3, 12, 0, 'gantry');
  for (let i = 0; i < 5; i++) box(-60 + i * 4, -40, 2.2, 2.2, 1.4, 0, 'crate');
  lootRing(-55, -45, 3, 8, 3);

  // Fazenda Tinteiro (sudoeste): casarao, silos, cercas de mureta e pedras
  area('fazenda', -64, 60, 30);
  box(-70, 52, 14, 10, 8, 0, 'house', { roof: 'peak', seed: 11 });
  box(-50, 70, 8, 8, 6, 0, 'house', { roof: 'peak', seed: 12 });
  box(-84, 76, 5, 5, 11, 0, 'silo'); box(-76, 82, 5, 5, 9, 0, 'silo');
  for (const z of [40, 90]) box(-64, z, 40, 1, 1.4, 0, 'wall');
  for (let i = 0; i < 6; i++) box(r(-90, -40), r(44, 94), r(3, 5), r(3, 5), r(1.6, 3), 0, 'rock');
  lootRing(-70, 52, 8.5, 11, 4); lootRing(-50, 70, 6, 8, 2); lootRing(-80, 80, 4, 7, 2);

  // Refinaria Soluco (sudeste): tanques, canos e torre de oleo
  area('soluco', 64, 62, 28);
  for (const [x, z] of [[50, 50], [62, 50], [74, 50]]) { box(x, z, 7, 7, 6, 0, 'tank'); lootRing(x, z, 5, 7, 1); }
  box(62, 66, 30, 1.2, 1.2, 1.8, 'pipe');
  box(80, 74, 4, 4, 14, 0, 'derrick');
  for (const [x, z] of [[48, 76], [58, 80], [70, 82]]) { box(x, z, 4, 4, 2.4, 0, 'vat'); lootRing(x, z, 3.5, 5, 2); }
  box(56, 62, 6, 4, 2.6, 0, 'machine'); lootRing(56, 62, 4, 6, 2);

  // Morro do Projetor (norte): plataformas em degraus ate a torre do projetor
  area('projetor', 0, -76, 22);
  box(0, -78, 22, 16, 1.5, 0, 'platform');
  box(0, -80, 12, 9, 1.5, 1.5, 'platform');
  box(0, -82, 4, 4, 9, 3, 'tower');
  stairs(-11, -70, 1, 0, 3, 3, 0.5, 0.7);
  stairs(-6, -73, 0, -1, 3, 3, 1, 0.8);
  for (const x of [-16, 16]) box(x, -64, 1.2, 8, 1.6, 0, 'wall');
  lootRing(0, -76, 10, 15, 6);

  // Serraria Ziguezague (sul): pilhas de tabua em ziguezague e maquinas
  area('serraria', 0, 78, 24);
  for (let i = 0; i < 7; i++) box(-24 + i * 8, 70 + (i % 2) * 10, 6, 2, 2.2, 0, 'crate');
  box(-14, 88, 6, 5, 3, 0, 'machine'); box(14, 88, 6, 5, 3, 0, 'machine');
  box(0, 92, 18, 8, 6, 0, 'house', { roof: 'flat', seed: 21 });
  lootRing(0, 80, 6, 16, 8);

  // Pedreira Engasgada (leste): pedras grandes e uma passarela
  area('pedreira', 88, 0, 18);
  for (let i = 0; i < 7; i++) box(88 + r(-14, 14), r(-16, 16), r(4, 7), r(4, 7), r(2.4, 5), 0, 'rock');
  box(80, 0, 2, 16, 0.4, 4, 'platform');
  lootRing(88, 0, 4, 14, 5);

  // Brejo do Rolo (oeste): pilares velhos e muretas no meio do mato
  area('brejo', -88, 0, 18);
  for (let i = 0; i < 6; i++) box(-88 + r(-12, 12), r(-14, 14), 1.4, 1.4, r(3, 6), 0, 'pillar');
  for (let i = 0; i < 4; i++) box(-88 + r(-12, 12), r(-14, 14), r(5, 9), 1.2, 1.5, 0, 'wall');
  lootRing(-88, 0, 4, 14, 5);

  // cobertura solta pelo caminho entre as areas (pedras e caixotes)
  for (let i = 0; i < 110; i++) {
    const x = r(-A + 8, A - 8), z = r(-A + 8, A - 8);
    if (areas.some(q => Math.hypot(q.pos[0] - x, q.pos[2] - z) < q.r)) continue;
    if (rand() < 0.6) box(x, z, r(2.5, 5), r(2.5, 5), r(1.4, 3), 0, 'rock'); else box(x, z, 2.2, 2.2, 1.4, 0, 'crate');
    if (rand() < 0.4) loot.push([x + 2.5, z + 2.5]);
  }
  const ffa = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ffa.push([Math.cos(a) * r(30, 96), Math.sin(a) * r(30, 96)]); }
  return {
    id: 'ilha', arena: A, boxes, theme: 'ilha', areas, loot,
    ring: { c: [0, 1, RZ], a: [-3.5, 1, RZ - 3.5], b: [3.5, 1, RZ + 3.5] },
    spawns: { red: ffa, blue: ffa, ffa },
    flagBase: { red: [0, 0, -40], blue: [0, 0, 40] },
    zones: [{ id: 'A', pos: [-40, 0, 0], r: 6 }, { id: 'B', pos: [0, 1.2, 0], r: 5 }, { id: 'C', pos: [40, 0, 0], r: 6 }],
    pickups: [],
  };
}

const BUILDERS = { vila, fabrica, fronteira, estaleiro, refinaria, ilha };
// mapas que aparecem na escolha do lobby (a ilha e so do battle royale)
export const PICK_MAPS = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria'];
export const MAP_IDS = Object.keys(BUILDERS);
// mapa sugerido por modo
export const MODE_MAP = { br: 'ilha', ffa: 'fabrica', gungame: 'estaleiro', tdm: 'vila', dom: 'vila', ctf: 'fronteira', infect: 'refinaria' };
// pontos de bomba (x, z) perto do lado da defesa (azul nasce em +z); a altura sai da grade
export const BOMB_SITES = {
  vila: { A: [-20, 27], B: [20, 27] },
  fabrica: { A: [-20, 21], B: [19, 14] },
  fronteira: { A: [-30, 38], B: [30, 38] },
  estaleiro: { A: [-13, 15], B: [13, 15] },
  refinaria: { A: [-17, 21], B: [24, 15] },
};
// arma no chao: so UMA minigun, no meio de cada mapa (as outras sairam). Vida continua onde estava.
const MINIGUN_AT = { vila: [0, 1.5, 0], fabrica: [0, 3, 0], fronteira: [0, 1.2, 0], estaleiro: [0, 1.2, 0], refinaria: [-3, 3, -3] };
// mapa apertado: abate sai mais rapido, entao a meta (e o tempo pra chegar nela) sobe.
// So nos modos por abate (contra todos e mata-mata); vila e fronteira ficam como sao.
const MAP_PACE = { estaleiro: { goal: 1.5, time: 1.25 }, fabrica: { goal: 1.25, time: 1.15 }, refinaria: { goal: 1.25, time: 1.15 } };
export function matchRules(mode, mapId, cfg, baseTime) {
  const base = { limit: cfg.limit, time: cfg.time || baseTime };
  const pace = (mode === 'ffa' || mode === 'tdm') && MAP_PACE[mapId];
  if (!pace) return base;
  return { limit: Math.round(base.limit * pace.goal / 5) * 5, time: Math.round(base.time * pace.time / 30) * 30 };
}

const cache = {};
export function getMap(id) {
  if (!BUILDERS[id]) id = 'vila';
  if (cache[id]) return cache[id];
  const M = BUILDERS[id]();
  if (id !== 'ilha') M.pickups = [...M.pickups.filter(p => p.kind !== 'wpn'), { kind: 'wpn', wpn: 'minigun', pos: MINIGUN_AT[id] || [0, 0, 0] }];
  return (cache[id] = M);
}

const STEP = 0.6;

// Move um corpo AABB (pes em pos) com degrau automatico. Muta pos e vel.
export function moveBody(M, pos, vel, dt, rad, height) {
  const boxes = M.boxes;
  let onGround = false;
  const stepAxis = (ax) => {
    const prev = pos[ax];
    pos[ax] += vel[ax] * dt;
    for (const b of boxes) {
      if (!overlap(pos, rad, height, b)) continue;
      const climb = b.max[1] - pos[1];
      if (climb > 0 && climb <= STEP && !blockedAbove(boxes, pos, rad, height, b.max[1])) { pos[1] = b.max[1]; continue; }
      // sai pelo lado de onde veio; se ja estava dentro (degrau, pulo), pelo lado mais perto. Antes saia pelo
      // sentido da velocidade e, ja dentro, atravessava a caixa inteira num tick (bot "teletransportando")
      const o = ax === 0 ? 0 : 2, lo = b.min[o] - rad - 1e-4, hi = b.max[o] + rad + 1e-4;
      if (prev <= lo + 1e-3) pos[ax] = lo;
      else if (prev >= hi - 1e-3) pos[ax] = hi;
      else pos[ax] = pos[ax] - lo < hi - pos[ax] ? lo : hi;
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
  // muro de borda tem altura finita: mola, pulo de cima de caixa ou empurrao pra fora da parede nao tiram ninguem da arena
  const [lo0, hi0, lo2, hi2] = bounds(M, pos, rad);
  if (pos[0] < lo0 || pos[0] > hi0) { pos[0] = Math.max(lo0, Math.min(hi0, pos[0])); vel[0] = 0; }
  if (pos[2] < lo2 || pos[2] > hi2) { pos[2] = Math.max(lo2, Math.min(hi2, pos[2])); vel[2] = 0; }
  return onGround;
}

// Limite andavel: a arena, ou o ringue de boxe (fica fora do muro de proposito) pra quem esta nele
function bounds(M, pos, rad) {
  const R = M.ring;
  if (R && Math.abs(pos[0] - R.c[0]) < 9 && Math.abs(pos[2] - R.c[2]) < 9) {
    const h = 5.8 - rad;
    return [R.c[0] - h, R.c[0] + h, R.c[2] - h, R.c[2] + h];
  }
  const lim = M.arena - rad;
  return [-lim, lim, -lim, lim];
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

// Posicao dentro da arena (o servidor confere o que o jogador manda)
export function clampArena(M, pos, rad = 0.4) {
  const [lo0, hi0, lo2, hi2] = bounds(M, pos, rad);
  return [Math.max(lo0, Math.min(hi0, pos[0])), pos[1], Math.max(lo2, Math.min(hi2, pos[2]))];
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

// Linha de visao pra bala perfurante: soma quanto da linha passa por dentro de caixas (paredes).
// Devolve a espessura total (Infinity se o chao corta a linha).
export function wallThickness(M, a, b) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  if (len < 1e-3) return 0;
  if (Math.min(a[1], b[1]) < 0) return Infinity;
  let sum = 0;
  for (const bx of M.boxes) {
    let t0 = 0, t1 = len, miss = false;
    for (let k = 0; k < 3; k++) {
      const dk = d[k] / len;
      if (Math.abs(dk) < 1e-9) { if (a[k] < bx.min[k] || a[k] > bx.max[k]) { miss = true; break; } continue; }
      let u = (bx.min[k] - a[k]) / dk, v = (bx.max[k] - a[k]) / dk;
      if (u > v) { const tt = u; u = v; v = tt; }
      t0 = Math.max(t0, u); t1 = Math.min(t1, v);
      if (t0 > t1) { miss = true; break; }
    }
    if (!miss) sum += t1 - t0;
  }
  return sum;
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
