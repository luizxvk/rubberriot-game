// Mapas da Rubber Riot: dados puros (navegador e servidor) + fisica/raio por mapa.
// Caixas sao AABB { min:[x,y,z], max:[x,y,z], kind, ... }. Cada sala carrega o seu mapa.
import { MOBS } from './mobs.js';

// conteiner aberto (05/11, pedido dele): da pra entrar, atravessa de ponta a ponta. Paredes finas e teto de verdade (colisao e tiro), as portas ficam
// dobradas pra fora. O de cima de uma pilha continua fechado e apoia no teto deste
function openCont(box, cx, cz, w, d, h, y0, seed) {
  const X = w > d, t = 0.12, L = Math.max(w, d);
  for (const s of [-1, 1]) {
    if (X) box(cx, cz + s * (d - t) / 2, w, t, h, y0, 'contshell', { seed }); else box(cx + s * (w - t) / 2, cz, t, d, h, y0, 'contshell', { seed });
    for (const e of [-1, 1]) { // porta dobrada contra a lateral
      const k = e * (L / 2 - 0.62), o = s * ((X ? d : w) / 2 + 0.04);
      if (X) box(cx + k, cz + o, 1.2, 0.08, h * 0.9, y0 + 0.08, 'contdoor'); else box(cx + o, cz + k, 0.08, 1.2, h * 0.9, y0 + 0.08, 'contdoor');
    }
  }
  box(cx, cz, w, d, t, y0 + h - t, 'contshell', { seed, roof: true });
}
function builder(arena) {
  const boxes = [];
  const box = (cx, cz, w, d, h, y0 = 0, kind = 'crate', extra = {}) => {
    // forma redonda ou em camadas (06/11, pedido dele: a colisao passava do desenho no Canyon Poeira): a colisao vira degraus
    // DENTRO do desenho. A 1a caixa leva o tipo e as medidas do desenho (vis); as outras sao so colisao ('tier', nao desenha)
    const T = SHAPE_TIERS[kind];
    if (T && !extra.vis) {
      const vis = { min: [cx - w / 2, y0, cz - d / 2], max: [cx + w / 2, y0 + h, cz + d / 2] }, thin = kind === 'cliff';
      T.forEach(([a, b, k, k2 = k], i) => {
        const kx = thin && w > d ? 1 : k, kz = thin && d >= w ? 1 : k2;
        boxes.push({ min: [cx - w / 2 * kx, y0 + h * a, cz - d / 2 * kz], max: [cx + w / 2 * kx, y0 + h * b, cz + d / 2 * kz], ...(i ? { kind: 'tier' } : { kind, ...extra, vis }) });
      });
      return;
    }
    boxes.push({ min: [cx - w / 2, y0, cz - d / 2], max: [cx + w / 2, y0 + h, cz + d / 2], kind, ...extra });
    // telhado pontudo tem corpo: 3 degraus em piramide acompanhando a inclinacao (antes quem subia ficava
    // de pe no topo da parede, por dentro do telhado). Mesmas medidas do desenho: base 0,877 da parede, altura 0,4h
    // 06/11 (Vila remodelada no Blender): telhado de DUAS AGUAS, cumeeira no lado comprido, beiral de ROOF_EAVE. Degraus de
    // colisao inscritos nas duas aguas (o canto de cima de cada degrau encosta no telhado), sempre dentro da parede
    if (kind === 'house' && extra.roof === 'peak') {
      const rh = h * 0.4, N = 4, alongX = w >= d, W = alongX ? d : w, L = alongX ? w : d;
      for (let i = 0; i < N - 1; i++) {
        const half = Math.min(W / 2, (1 - (i + 1) / N) * (W / 2 + ROOF_EAVE));
        const hx = alongX ? L / 2 : half, hz = alongX ? half : L / 2;
        boxes.push({ min: [cx - hx, y0 + h + rh * i / N, cz - hz], max: [cx + hx, y0 + h + rh * (i + 1) / N, cz + hz], kind: 'roof' });
      }
    }
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
  // casa/predio que da pra entrar (04/11, pedido dele): paredes finas de reboco (hwall), porta no lado `door`
  // ('+x','-x','+z','-z'), janelas, piso de madeira entre os andares e laje no topo. floors = 2: escada DENTRO, colada
  // no fundo, sobe ate o 2o andar por um vao na laje. col = cor do reboco. Moveis simples dentro (cobertura)
  const walkIn = (x, z, w, d, door, o = {}) => {
    const floors = o.floors || 1, fh = o.fh || 3.4, t = 0.3, col = o.col ?? 0xe8dcc4, ax = door[1] === 'x', sg = door[0] === '+' ? 1 : -1;
    const F = ax ? w : d, U = ax ? d : w; // F: profundidade (porta -> fundo), U: largura
    const at = (u, f) => (ax ? [x + f * sg, z + u] : [x + u, z + f * sg]); // u = lado, f = pra frente (porta em +F/2)
    const put = (u, f, su, sf, h, y0, kind = 'hwall', ex = {}) => { const [px, pz] = at(u, f); box(px, pz, ax ? sf : su, ax ? su : sf, h, y0, kind, { col, ...ex }); };
    // parede com abertura no meio (porta ou janela); along = 'u' (parede da frente/fundo) ou 'f' (laterais)
    const wallGap = (cu, cf, len, along, gw, gy0, gy1, y0) => {
      const half = (len - gw) / 2, off = gw / 2 + half / 2;
      for (const k of [-1, 1]) along === 'u' ? put(cu + k * off, cf, half, t, fh, y0) : put(cu, cf + k * off, t, half, fh, y0);
      if (gy0 > 0) along === 'u' ? put(cu, cf, gw, t, gy0, y0) : put(cu, cf, t, gw, gy0, y0);
      along === 'u' ? put(cu, cf, gw, t, fh - gy1, y0 + gy1) : put(cu, cf, t, gw, fh - gy1, y0 + gy1);
    };
    const runN = Math.round(fh / 0.4), sd = 0.5, runL = runN * sd, sw = 1.3; // escada: degrau 0,4 x 0,5
    const u0 = -U / 2 + t + 1.0, fb = -F / 2 + t + sw / 2; // comeco da escada (1 m de patamar ate a parede: entra pela ponta baixa) e faixa dela
    for (let fl = 0; fl < floors; fl++) {
      const y0 = fl * fh;
      if (fl === 0) wallGap(0, F / 2 - t / 2, U, 'u', 2.1, 0, 2.7, y0); else wallGap(0, F / 2 - t / 2, U, 'u', 1.6, 1.0, 2.3, y0);
      if (floors > 1 || fl > 0) wallGap(0, -F / 2 + t / 2, U, 'u', 1.6, 1.4, 2.4, y0); else put(0, -F / 2 + t / 2, U, t, fh, y0);
      for (const k of [-1, 1]) wallGap(k * (U / 2 - t / 2), 0, F - t * 2, 'f', 1.5, 1.0, 2.3, y0);
      const top = y0 + fh, last = fl === floors - 1;
      if (last) { put(0, 0, U + 0.3, F + 0.3, 0.3, top, 'hroof'); }
      else { // piso do andar de cima com o vao da escada
        put(0, sw / 2 + 0.1, U, F - sw - 0.2, 0.3, top, 'hfloor');
        const e0 = u0 + runL + 0.2, rest = U / 2 - e0; if (rest > 0.4) put(e0 + rest / 2, fb, rest, sw + 0.2, 0.3, top, 'hfloor'); // depois do topo da escada
        put((-U / 2 + u0) / 2, fb, u0 + U / 2, sw + 0.2, 0.3, top, 'hfloor'); // em cima do patamar
        for (let i = 0; i < runN; i++) put(u0 + (i + 0.5) * sd, fb, sd, sw, (i + 1) * (fh / runN), y0, 'step');
      }
      // moveis: mesa no canto da frente e um caixote (cobertura)
      put(U / 2 - t - 0.8, F / 2 - t - 1.1, 1.2, 0.8, 0.8, y0, 'table');
      if (F > 6) put(-U / 2 + t + 0.7, F / 2 - t - 2.2, 1, 1, 1, y0, 'crate');
    }
  };
  return { boxes, box, stairs, walls, walkIn };
}

// ---------- Vila Borracha (media) ----------
function vila() {
  const A = 58, { boxes, box, stairs, walls, walkIn } = builder(A);
  walls();
  for (const s of [-1, 1]) {
    const team = s < 0 ? 'red' : 'blue';
    box(0, s * 55, 26, 6, 10, 0, 'house', { team, roof: 'flat', seed: 1 });
    box(-16, s * 46, 9, 9, 7, 0, 'house', { team, roof: 'peak', seed: 2 });
    box(16, s * 46, 9, 9, 7, 0, 'house', { team, roof: 'peak', seed: 3 });
    box(0, s * 50.5, 14, 3, 0.5, 4, 'platform');
    for (const px of [-6.8, 6.8]) box(px, s * 49.15, 0.3, 0.3, 4, 0, 'post'); // 06/11: a sacada ganha esteio ate o chao (boiava presa so na parede)
    stairs(13, s * 50.5, -1, 0, 3, 8, 0.5, 0.75); // 06/11: sobe PRA sacada (subia de costas pra ela)
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
    stairs(sx * 18, -6, sx, 0, 3, 8, 0.5, 0.75); // 06/11: sobe PRA passarela (subia de costas ate um bloco solto, que saiu)
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
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) box(x, z, 0.6, 0.6, 7, 1.5, 'pillar'); // embaixo do tanque (raio 3,75): em 3,5 ficavam pra fora dele (04/11)
  box(0, 0, 7.5, 7.5, 4, 8.5, 'tank');
  box(-10, 10, 2, 2, 1.4, 0, 'crate');
  box(10, -10, 2, 2, 1.4, 0, 'crate');
  box(0, -20, 8, 1.2, 1.6, 0, 'crate');
  box(0, 20, 8, 1.2, 1.6, 0, 'crate');
  // 04/11 (pedido dele): vila mais cheia. Casas espelhadas (justo pros dois lados) nos cantos e laterais vazias,
  // longe dos nascimentos; barracos com caixotes do lado dao cobertura nova
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    walkIn(sx * 49, sz * 49, 9, 9, sx > 0 ? '-x' : '+x', { floors: 2, col: [0xe8d6b8, 0xd9c7a8, 0xe6dcc4, 0xd4c2a0][(sx + 1) + (sz + 1) / 2] }); // predio de 2 andares com escada dentro
    walkIn(sx * 50, sz * 12, 8, 7, sx > 0 ? '-x' : '+x', { col: 0xdfe0d4 }); // casa pra entrar
    box(sx * 22, sz * 32, 5, 5, 3.8, 0, 'house', { roof: 'peak', seed: 40 + (sx + 1) + (sz + 1) * 2 });
    box(sx * 40, sz * 46, 2, 2, 1.4, 0, 'crate'); box(sx * 27, sz * 28, 2.2, 2.2, 1.6, 0, 'crate');
  }
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
    stairs(-s * 28, s * 13, s, 0, 2.6, 8, 0.5, 0.75); // 06/11: o ultimo degrau encosta na passarela (ficava 1,6 m antes)
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
  const A = 76, { boxes, box, stairs, walls, walkIn } = builder(A);
  walls(8);
  for (const s of [-1, 1]) {
    const team = s < 0 ? 'red' : 'blue';
    // forte: predio dos fundos, duas torres com escada, muretas e varanda
    box(0, s * 72, 34, 6, 11, 0, 'house', { team, roof: 'flat', seed: 1 });
    for (const sx of [-1, 1]) {
      box(sx * 22, s * 62, 5, 5, 6, 0, 'tower', { team });
      stairs(sx * 14.7, s * 62, sx, 0, 3, 8, 0.75, 0.6); // 06/11: sobe PRA torre (subia de costas)
      box(sx * 9, s * 52, 8, 1.2, 1.6, 0, 'wall');
    }
    box(0, s * 66, 12, 2.4, 0.5, 4, 'platform');
    for (const px of [-5.8, 5.8]) for (const pz of [64.95, 67.05]) box(px, s * pz, 0.3, 0.3, 4, 0, 'post'); // 06/11 (Fronteira no Blender): a varanda boiava, ganha esteio ate o chao
    stairs(10.8, s * 66, -1, 0, 2.4, 8, 0.5, 0.6); // 06/11: sobe PRA varanda (subia de costas, pedido dele)
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
    stairs(sx * 50, 7, 0, -1, 3, 9, 0.78, 0.5); // 06/11: chega de frente na torre (corria do lado dela, a 2 m)
    box(sx * 24, 8, 4, 4, 2.4, 0, 'rock');
    box(sx * 24, -8, 4, 4, 2.4, 0, 'rock');
  }
  box(0, 0, 8, 8, 1.2, 0, 'platform');
  // 04/11 (pedido dele): fronteira mais povoada. Casas espelhadas nas laterais vazias, um barracao no meio de cada
  // metade e caixotes/carro de boi pra cobertura nas travessias abertas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    walkIn(sx * 60, sz * 20, 9, 10, sx > 0 ? '-x' : '+x', { floors: 2, col: 0xd8c9ae });
    walkIn(sx * 50, sz * 38, 8, 8, sx > 0 ? '-x' : '+x', { col: 0xe2d8c2 }); // porta pro meio (de frente pro -z dava na pedra)
    box(sx * 18, sz * 22, 6, 6, 4.2, 0, 'house', { roof: 'peak', seed: 70 + (sx + 1) + (sz + 1) * 2 });
    box(sx * 40, sz * 14, 2.2, 2.2, 1.6, 0, 'crate'); box(sx * 8, sz * 14, 2, 4, 1.4, 0, 'crate'); box(sx * 64, sz * 40, 2.2, 2.2, 1.6, 0, 'crate');
  }
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
  const cont = (cx, cz, along, y0 = 0, seed = 0) => { const w = along === 'x' ? 6 : 2.6, d = along === 'x' ? 2.6 : 6; if (y0 === 0 && seed % 2 === 0) return openCont(box, cx, cz, w, d, 2.6, 0, seed); box(cx, cz, w, d, 2.6, y0, 'container', { seed, along }); }; // no chao, um sim um nao fica aberto
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
  openCont(box, -30, 4, 2.6, 6, 2.6, 0, 4);
  box(30, -4, 2.6, 6, 2.6, 0, 'container', { seed: 5, along: 'z' });
  box(-12, 24, 6, 2.6, 2.6, 0, 'container', { seed: 6, along: 'x' });
  openCont(box, 12, -24, 6, 2.6, 2.6, 0, 7);
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
  stairs(6.8, -3, -1, 0, 3, 3, 0.4, 0.6); // 06/11: sobe PRA praca do coreto (subia de costas)
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
    if (i % 3 === 0) openCont(box, x, z, 6, 12, 2.6, 0, i); else box(x, z, 6, 12, 2.6, 0, 'container', { seed: i });
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


// ---------- Ladeira do Bonde (so Escolta, 31/10) ----------
// Rua em zigue-zague com o trilho do bonde no meio: casas e lojas coladas dos dois lados (nunca em cima do
// trilho), praca com chafariz no 1o ponto de controle, viaduto passando por cima dos trilhos, mirantes com
// escada pra quem defende de cima e muita cobertura baixa na beira da rua. Tudo sorteado com semente fixa
// (servidor e navegador montam o mesmo mapa).
function bonde() {
  const A = 64, { boxes, box, stairs, walls } = builder(A);
  walls(8);
  const track = [[-36, -56], [-36, -32], [-12, -24], [12, -24], [24, -6], [24, 12], [0, 24], [-18, 34], [-18, 48], [4, 58]];
  let seed = 7; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // distancia de um ponto ate o trilho
  const dTrack = (x, z) => { let m = 1e9; for (let i = 1; i < track.length; i++) { const [ax, az] = track[i - 1], [bx, bz] = track[i], vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz, k = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L)); m = Math.min(m, Math.hypot(x - ax - vx * k, z - az - vz * k)); } return m; };
  // caixa (w x d) longe do trilho: confere o centro e os 4 cantos
  const clear = (x, z, w, d, gap) => [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].every(([a, b]) => dTrack(x + a * w / 2, z + b * d / 2) > gap);
  const solid = [];
  const free = (x, z, w, d, pad = 1) => Math.abs(x) + w / 2 < A - 2 && Math.abs(z) + d / 2 < A - 2 && solid.every(o => Math.abs(o[0] - x) > (o[2] + w) / 2 + pad || Math.abs(o[1] - z) > (o[3] + d) / 2 + pad);
  const put = (x, z, w, d, h, y0, kind, extra) => { solid.push([x, z, w, d]); box(x, z, w, d, h, y0, kind, extra); };

  // viaduto sobre o trilho (entre os pontos 2 e 3): tabuleiro alto + pilares fora da rua + escadas
  put(-28, -29, 4, 16, 0.5, 5, 'bridge'); solid.pop();
  put(-28, -38.5, 4, 3, 5, 0, 'house', { roof: 'flat', seed: 41 }); put(-28, -19.5, 4, 3, 5, 0, 'house', { roof: 'flat', seed: 42 });
  stairs(-30, -48, 0, 1, 3, 10, 0.5, 0.8); solid.push([-30, -44, 3, 8]); // 06/11: sobe PRA laje do viaduto (subia de costas)
  // praca do chafariz (1o ponto de controle fica do lado): bacia, mureta baixa e bancos
  put(0, -38, 6, 6, 1.1, 0, 'vat'); box(-5.5, -38, 1, 5, 0.6, 0, 'crate'); box(5.5, -38, 1, 5, 0.6, 0, 'crate');
  // mirantes (plataforma alta com escada), um em cada metade
  for (const [x, z, sx] of [[40, -18, -1], [-4, 40, 1], [-46, 10, 1]]) {
    if (!free(x, z, 7, 7)) continue;
    put(x, z, 7, 7, 0.5, 3.5, 'platform');
    for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) box(x + px, z + pz, 0.6, 0.6, 3.5, 0, 'pillar');
    stairs(x + sx * 8.75, z + 2, -sx, 0, 2.4, 7, 0.5, 0.75); // 06/11: sobe PRO mirante (subia de costas) solid.push([x + sx * 6.5, z + 2, 6, 3]);
  }
  // fileiras de casas e lojas dos dois lados da rua (uma a cada ~11 m do trilho)
  const T = []; for (let i = 1; i < track.length; i++) T.push([track[i - 1], track[i]]);
  let n = 0;
  for (const [a, b] of T) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    // fileira da rua (casas e lojas) e, atras dela, os predios mais altos fechando a vista
    for (const [o0, o1, h0, h1, st] of [[10.5, 13, 5.5, 10, 9], [21, 25, 8, 14, 11]]) for (let s = 4; s < L; s += st + rng() * 3) for (const side of [-1, 1]) {
      const w = 7 + rng() * 4, d = 7 + rng() * 3, h = h0 + rng() * (h1 - h0), off = o0 + rng() * (o1 - o0);
      const x = a[0] + ux * s + uz * side * off, z = a[1] + uz * s - ux * side * off;
      const W = Math.abs(ux) > 0.7 ? w : d, D = Math.abs(ux) > 0.7 ? d : w;
      if (!clear(x, z, W, D, 6) || !free(x, z, W, D, 1.2)) continue;
      put(x, z, W, D, h, 0, 'house', { roof: rng() < 0.55 ? 'peak' : 'flat', seed: 100 + n++, team: z < -30 ? 'red' : z > 40 ? 'blue' : undefined });
    }
  }
  // cobertura baixa na beira da rua (caixote, carrinho de feira, barril), sempre fora do trilho
  for (let k = 0; k < 70; k++) {
    const [a, b] = T[Math.floor(rng() * T.length)], s = rng(), side = rng() < 0.5 ? -1 : 1, off = 4 + rng() * 3.5;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const x = a[0] + (b[0] - a[0]) * s + uz * side * off, z = a[1] + (b[1] - a[1]) * s - ux * side * off;
    const big = rng() < 0.3, w = big ? 3.2 : 1.6 + rng() * 0.8, d = big ? 1.2 : w, h = big ? 1.2 : 1.1 + rng() * 0.7;
    if (!clear(x, z, w, d, 3.3) || !free(x, z, w, d, 1.6)) continue;
    put(x, z, w, d, h, 0, rng() < 0.25 ? 'post' : 'crate');
    if (!big && rng() < 0.3) box(x, z, w * 0.7, d * 0.7, 0.9, h, 'crate');
  }
  // postes de luz ao longo do trilho
  for (const [a, b] of T) for (const side of [-1, 1]) {
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const x = mx + uz * side * 3.6, z = mz - ux * side * 3.6;
    if (clear(x, z, 0.4, 0.4, 3) && free(x, z, 0.4, 0.4, 0.5)) put(x, z, 0.4, 0.4, 4.5, 0, 'post');
  }
  // garagem do bonde (fim do trilho, azul) e estacao (comeco, vermelho)
  put(4, 62.3, 14, 1.4, 8, 0, 'wall'); put(-36, -61.5, 12, 1.4, 6, 0, 'wall');
  const sp = (d0, side) => { const out = []; for (let i = 0; i < 8; i++) { const t = track[d0], o = (i % 4 - 1.5) * 3, r = 5 + Math.floor(i / 4) * 3; out.push([t[0] + side * r, t[1] + o]); } return out; };
  return {
    id: 'bonde', arena: A, boxes, theme: 'bonde', track, checks: [0.36, 0.7],
    spawns: { red: sp(0, 1), blue: sp(9, -1), ffa: [...sp(0, 1), ...sp(9, -1)] },
    flagBase: { red: [-36, 0, -56], blue: [4, 0, 58] },
    zones: [{ id: 'A', pos: [-36, 0, -32], r: 5 }, { id: 'B', pos: [24, 0, -6], r: 5 }, { id: 'C', pos: [-18, 0, 40], r: 5 }],
    pickups: [
      { kind: 'hp', pos: [0, 0, -33] }, { kind: 'hp', pos: [40, 4, -18] }, { kind: 'hp', pos: [-4, 4, 40] }, { kind: 'hp', pos: [30, 0, 18] },
      { kind: 'hp', pos: [-24, 0, 26] }, { kind: 'hp', pos: [-28, 5.5, -29] },
      { kind: 'wpn', wpn: 'sniper', pos: [-46, 4, 10] }, { kind: 'wpn', wpn: 'shotgun', pos: [12, 0, -32] },
    ],
  };
}


// ---------- Vale do Apito (so Escolta, 01/11) ----------
// Segundo mapa da escolta, maior que a Ladeira: estacao (vermelho), galpao que o bonde atravessa (com portas
// do lado), rua de garagens abertas, VIADUTO (o bonde sobe a rampa e passa por cima de uma estrada que da pra
// atravessar por baixo), patio de conteineres com caixa d'agua, rua de casas que DA PRA ENTRAR (porta, janelas,
// telhado andavel por escada) e a garagem final (azul). Trechos retos (o trilho so vira em 90 graus).
function apito() {
  const A = 80, { boxes, box, stairs, walls } = builder(A);
  walls(9);
  const track = [[-60, -62], [-60, -40], [-20, -40], [-20, -5], [30, -5], [30, 35], [-10, 35], [-10, 62]];
  let seed = 23; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dTrack = (x, z) => { let m = 1e9; for (let i = 1; i < track.length; i++) { const [ax, az] = track[i - 1], [bx, bz] = track[i], vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz, k = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L)); m = Math.min(m, Math.hypot(x - ax - vx * k, z - az - vz * k)); } return m; };
  const clear = (x, z, w, d, gap) => [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].every(([a, b]) => dTrack(x + a * w / 2, z + b * d / 2) > gap);
  const solid = [];
  const free = (x, z, w, d, pad = 1) => Math.abs(x) + w / 2 < A - 2 && Math.abs(z) + d / 2 < A - 2 && solid.every(o => Math.abs(o[0] - x) > (o[2] + w) / 2 + pad || Math.abs(o[1] - z) > (o[3] + d) / 2 + pad);
  const put = (x, z, w, d, h, y0, kind, extra) => { solid.push([x, z, w, d]); box(x, z, w, d, h, y0, kind, extra); };
  const mark = (x, z, w, d) => solid.push([x, z, w, d]); // so reserva o lugar (estrutura feita de varias pecas)

  // casa oca que da pra entrar: 4 paredes finas de tijolo, porta virada pro lado `door` (+x, -x, +z, -z),
  // uma janela em cada parede lateral, laje de concreto e escada externa pro telhado
  const hut = (x, z, w, d, h, door) => {
    mark(x, z, w, d);
    const t = 0.4, dw = 2.2, dh = 2.8, wy0 = 1.1, wy1 = 2.2, ww = 1.6;
    // parede com abertura (porta ou janela) no meio. horiz = parede ao longo de x
    const wallWith = (cx, cz, len, horiz, gapW, gy0, gy1) => {
      const half = (len - gapW) / 2, off = gapW / 2 + half / 2;
      for (const s of [-1, 1]) box(cx + (horiz ? s * off : 0), cz + (horiz ? 0 : s * off), horiz ? half : t, horiz ? t : half, h, 0, 'wall');
      if (gy0 > 0) box(cx, cz, horiz ? gapW : t, horiz ? t : gapW, gy0, 0, 'wall');          // peitoril da janela
      box(cx, cz, horiz ? gapW : t, horiz ? t : gapW, h - gy1, gy1, 'wall');                  // verga em cima da abertura
    };
    const sides = { '+x': [x + w / 2 - t / 2, z, d, false], '-x': [x - w / 2 + t / 2, z, d, false], '+z': [x, z + d / 2 - t / 2, w, true], '-z': [x, z - d / 2 + t / 2, w, true] };
    for (const [k, [cx, cz, len, horiz]] of Object.entries(sides)) {
      if (k === door) wallWith(cx, cz, len, horiz, dw, 0, dh);
      else if ((door[1] === 'x') !== (k[1] === 'x')) wallWith(cx, cz, len, horiz, ww, wy0, wy1); // laterais com janela
      else box(cx, cz, horiz ? len : t, horiz ? t : len, h, 0, 'wall');                          // fundo inteiro
    }
    box(x, z, w + 0.4, d + 0.4, 0.35, h, 'concrete'); // laje (da pra andar em cima)
    // escada colada no fundo, por fora, ate a laje
    const back = door === '+z' ? '-z' : door === '-z' ? '+z' : door === '+x' ? '-x' : '+x';
    const n = Math.round(h / 0.5);
    if (back === '-z') stairs(x - w / 2 + 1.2, z - d / 2 - n * 0.6, 0, 1, 1.6, n, 0.5, 0.6);
    else if (back === '+z') stairs(x + w / 2 - 1.2, z + d / 2 + n * 0.6, 0, -1, 1.6, n, 0.5, 0.6);
    else if (back === '-x') stairs(x - w / 2 - n * 0.6, z + d / 2 - 1.2, 1, 0, 1.6, n, 0.5, 0.6);
    else stairs(x + w / 2 + n * 0.6, z - d / 2 + 1.2, -1, 0, 1.6, n, 0.5, 0.6);
  };

  // ---- estacao (inicio, vermelho): plataforma de embarque e cobertura
  put(-52, -60, 6, 16, 1.0, 0, 'step'); put(-52, -60, 7, 18, 0.4, 4.6, 'concrete');
  for (const z of [-67, -53]) box(-50, z, 0.5, 0.5, 4.6, 0, 'pillar');
  put(-60, -69.5, 14, 1.4, 6, 0, 'wall');
  // ---- galpao que o bonde atravessa (z = -40, x -50..-34): paredes de concreto com porta no meio de cada lado
  for (const zs of [-46, -34]) { for (const s of [-1, 1]) put(-42 + s * 5, zs, 6, 0.8, 6, 0, 'concrete'); box(-42, zs, 4, 0.8, 2.5, 3.5, 'concrete'); }
  box(-42, -40, 16.5, 13, 0.5, 6, 'concrete'); mark(-42, -40, 16.5, 13);
  // ---- rua das garagens (trilho em x = -20, z -40..-5): tres garagens abertas viradas pro trilho, com carro
  for (const z of [-33, -22, -11]) {
    const gx = -31; mark(gx, z, 8, 7.5);
    box(gx - 3.8, z, 0.4, 7.5, 3.6, 0, 'concrete'); for (const s of [-1, 1]) box(gx, z + s * 3.55, 8, 0.4, 3.6, 0, 'concrete');
    box(gx, z, 8.4, 7.9, 0.3, 3.6, 'concrete');
    box(gx - 0.5, z, 3.6, 1.8, 1.3, 0, 'container'); // carro guardado (cobertura pra quem entra)
  }
  // ---- viaduto: o bonde sobe 3 m na rampa (x -10..2), cruza o tabuleiro (x 2..18) e desce (x 18..30)
  const zv = -5, wv = 7;
  for (let i = 0; i < 12; i++) { box(-10 + i + 0.5, zv, 1, wv, (i + 1) * 0.25, 0, 'step'); box(18 + i + 0.5, zv, 1, wv, 3 - i * 0.25, 0, 'step'); }
  box(10, zv, 16, wv, 0.4, 2.6, 'bridge', { deck: true }); mark(10, zv, 40, wv + 1); // deck: o trilho passa EM CIMA (bot anda nele)
  for (const x of [4, 10, 16]) for (const s of [-1, 1]) box(x, zv + s * 3.1, 0.6, 0.6, 2.6, 0, 'pillar');
  for (const s of [-1, 1]) box(10, zv + s * 3.35, 16, 0.3, 0.8, 3.0, 'crate'); // guarda-corpo (a bala passa por cima)
  // estrada que passa por baixo do viaduto (norte-sul em x = 10) com barreiras de concreto na beira
  for (const z of [-26, -16, 6, 16]) if (free(13, z, 1.2, 3)) put(13, z, 1.2, 3, 1.1, 0, 'concrete');
  // ---- patio de conteineres (entre o viaduto e o 2o ponto) e a caixa d'agua
  for (const [x, z, w, d, h, y0] of [[44, -14, 3, 9, 3, 0], [44, -2, 3, 9, 3, 0], [48, -8, 3, 9, 3, 0], [44, -8, 3, 9, 3, 3], [40, 12, 3, 9, 3, 0], [44, 26, 9, 3, 3, 0], [58, 4, 3, 9, 3, 0]])
    if (y0 > 0 || free(x, z, w, d, 0.8)) { if (y0 === 0) put(x, z, w, d, h, y0, 'container'); else box(x, z, w, d, h, y0, 'container'); }
  if (free(52, 20, 6, 6)) { put(52, 20, 6, 6, 0.5, 6, 'platform'); for (const [px, pz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) box(52 + px, 20 + pz, 0.6, 0.6, 6, 0, 'pillar'); box(52, 20, 4.5, 4.5, 3, 6.5, 'vat'); stairs(50, 23 + 12 * 0.6, 0, -1, 1.6, 12, 0.5, 0.6); }
  // ---- rua das casas (trilho em z = 35, x 30..-10): casas ocas dos dois lados, portas viradas pra rua
  for (const [x, z, door] of [[22, 23, '+z'], [8, 23, '+z'], [-4, 22, '+z'], [24, 47, '-z'], [10, 47, '-z'], [-24, 26, '+x'], [-24, 44, '+x']]) {
    const w = 9, d = 8, h = 4.2 + rng() * 0.6;
    if (clear(x, z, w, d, 5) && free(x, z, w + 3, d + 3, 0.5)) hut(x, z, w, d, h, door);
  }
  // ---- garagem final do bonde (azul): galpao comprido em volta do fim do trilho
  for (const s of [-1, 1]) put(-10 + s * 6.2, 58, 0.8, 16, 7, 0, 'concrete');
  put(-10, 66.4, 13.2, 0.8, 7, 0, 'concrete'); box(-10, 58, 13.6, 17, 0.5, 7, 'concrete');
  // ---- predios fechando a vista (fora do caminho) e cobertura baixa na beira do trilho
  for (let k = 0; k < 40; k++) {
    const x = (rng() * 2 - 1) * (A - 10), z = (rng() * 2 - 1) * (A - 10), w = 8 + rng() * 6, d = 8 + rng() * 6;
    if (!clear(x, z, w, d, 11) || !free(x, z, w, d, 2)) continue;
    put(x, z, w, d, 6 + rng() * 8, 0, 'house', { roof: rng() < 0.5 ? 'peak' : 'flat', seed: 300 + k, team: z < -50 ? 'red' : z > 55 ? 'blue' : undefined });
  }
  const T = []; for (let i = 1; i < track.length; i++) T.push([track[i - 1], track[i]]);
  for (let k = 0; k < 90; k++) {
    const [a, b] = T[Math.floor(rng() * T.length)], s = rng(), side = rng() < 0.5 ? -1 : 1, off = 4.2 + rng() * 4;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    const x = a[0] + (b[0] - a[0]) * s + uz * side * off, z = a[1] + (b[1] - a[1]) * s - ux * side * off;
    const big = rng() < 0.3, w = big ? 3.2 : 1.6 + rng() * 0.8, d = big ? 1.2 : w, h = big ? 1.2 : 1.1 + rng() * 0.7;
    if (!clear(x, z, w, d, 3.4) || !free(x, z, w, d, 1.6)) continue;
    put(x, z, w, d, h, 0, rng() < 0.2 ? 'post' : 'crate');
    if (!big && rng() < 0.3) box(x, z, w * 0.7, d * 0.7, 0.9, h, 'crate');
  }
  const red = [], blue = [];
  for (let i = 0; i < 8; i++) { red.push([-66 + (i % 4) * 2.5, -66 + Math.floor(i / 4) * 3]); blue.push([-14 + (i % 4) * 2.8, 70 + Math.floor(i / 4) * 2.5]); }
  return {
    id: 'apito', arena: A, boxes, theme: 'bonde', track, checks: [0.38, 0.74],
    spawns: { red, blue, ffa: [...red, ...blue] },
    flagBase: { red: [-60, 0, -62], blue: [-10, 0, 62] },
    zones: [{ id: 'A', pos: [-20, 0, -5], r: 5 }, { id: 'B', pos: [30, 0, 35], r: 5 }, { id: 'C', pos: [-10, 0, 50], r: 5 }],
    pickups: [
      { kind: 'hp', pos: [-31, 0, -22] }, { kind: 'hp', pos: [10, 0, -5] }, { kind: 'hp', pos: [44, 6, -8] }, { kind: 'hp', pos: [8, 0, 23] },
      { kind: 'hp', pos: [-24, 0, 26] }, { kind: 'hp', pos: [52, 6.5, 20] }, { kind: 'hp', pos: [-42, 0, -40] },
      { kind: 'wpn', wpn: 'sniper', pos: [52, 6.5, 20] }, { kind: 'wpn', wpn: 'shotgun', pos: [22, 0, 23] },
    ],
  };
}

// ---------- Banco Ferradura (Roube o Cofre, 03/11) ----------
// Quarteirao de cidade de 1930. Norte: praca com coreto (a defesa nasce ali). Meio: o banco de marmore, salao
// em cima de um embasamento de 3 m (escadaria na frente, portas dos lados) e o cofre redondo no SUBSOLO: fosso
// aberto no meio do salao, com duas escadas descendo. Terceira rota: o duto de ventilacao, do beco dos fundos
// direto pro fosso, so agachado (bot nao cabe; e a rota de quem e esperto). Sul: o beco com a van de fuga.
function ferradura() {
  const A = 46, { boxes, box, stairs, walls } = builder(A);
  walls(9);
  const HALL = 3, TOP = 11;
  // salao: embasamento de marmore em volta do fosso do cofre (x -9..9, z -12..4)
  box(-12.5, 1, 7, 26, HALL, 0, 'marble'); box(12.5, 1, 7, 26, HALL, 0, 'marble');
  box(0, 9.5, 18, 11, HALL, 0, 'marble'); // frente do salao (vai ate a porta)
  // duas escadas do salao pro cofre, nos fundos do fosso
  stairs(-3, -8, -1, 0, 3, 6, 0.5, 1); stairs(3, -8, 1, 0, 3, 6, 0.5, 1);
  // balaustrada em volta do fosso (vao no alto das escadas)
  for (const sx of [-1, 1]) {
    box(sx * 9.15, -1.25, 0.3, 10.5, 1, HALL, 'rail');
    box(sx * 9.15, -10.75, 0.3, 2.5, 1, HALL, 'rail');
  }
  box(-4.5, 4.15, 9, 0.3, 1, HALL, 'rail'); box(4.5, 4.15, 9, 0.3, 1, HALL, 'rail');
  // paredes do banco (1 m), com porta na frente e dos dois lados; atras, so o buraco do duto
  box(-10, 14.5, 14, 1, TOP, 0, 'marble'); box(10, 14.5, 14, 1, TOP, 0, 'marble'); box(0, 14.5, 6, 1, TOP - 7, 7, 'marble');
  for (const sx of [-1, 1]) {
    box(sx * 16.5, -7.5, 1, 11, TOP, 0, 'marble'); box(sx * 16.5, 8.5, 1, 13, TOP, 0, 'marble'); box(sx * 16.5, 0, 1, 4, TOP - 6, 6, 'marble');
    box(sx * 16.5, 0, 1, 4, HALL, 0, 'marble'); // soleira da porta do lado
    stairs(sx * 23, 0, -sx, 0, 6, 6, 0.5, 1); // degraus da rua do lado ate a porta (mais largos que a porta: bot nao engancha na quina)
  }
  box(-9.1, -12.5, 15.8, 1, TOP, 0, 'marble'); box(9.1, -12.5, 15.8, 1, TOP, 0, 'marble');
  box(0, -12.5, 2.4, 1, TOP - 1.35, 1.35, 'marble'); // em cima do duto
  // telhado inteiro (07/11, pedido dele: a claraboia em cima do fosso parecia telhado furado). UMA laje so: tres pecas
  // encostadas davam faces no mesmo plano (pisca)
  box(0, 1, 34, 28, 0.6, TOP, 'bankroof');
  // fachada: escadaria, colunas e frontao com o nome
  stairs(0, 21, 0, -1, 8, 6, 0.5, 1);
  for (const x of [-9, -6, 6, 9]) box(x, 16.5, 1.1, 1.1, TOP, 0, 'column');
  box(0, 16.5, 22, 3, 1.2, TOP, 'marble', { sign: 'bank' });
  // dentro: balcao dos caixas na frente do salao, mesas dos lados, pilares
  box(0, 8, 14, 1.2, 1.2, HALL, 'counter');
  for (const sx of [-1, 1]) {
    box(sx * 12.5, -5, 1.4, 5, 1.1, HALL, 'counter');
    for (const z of [-9, 9]) box(sx * 12.5, z, 1, 1, TOP - HALL, HALL, 'column');
    box(sx * 6, 2.6, 2, 1.4, 1.4, 0, 'crate'); // malotes no subsolo (protecao perto do cofre)
  }
  // duto de ventilacao: chapa do beco ate o fosso, 1,35 m de altura por dentro (agachado passa, em pe nao; bot passa agachado desde 03/11: nav.js low)
  box(-1.35, -17, 0.3, 8, 2.6, 0, 'duct'); box(1.35, -17, 0.3, 8, 2.6, 0, 'duct'); box(0, -17, 3, 8, 1.25, 1.35, 'duct'); // alto por fora: bot nao pula em cima
  // praca com coreto
  box(0, 31, 8, 8, 0.5, 0, 'coreto');
  for (const [x, z] of [[-2.6, 28.4], [2.6, 28.4], [-2.6, 33.6], [2.6, 33.6]]) box(x, z, 0.35, 0.35, 3.5, 0.5, 'post'); // 06/11 (pedido dele): estacas DENTRO do octogono do coreto (antes ficavam pra fora da base)
  box(0, 31, 9, 9, 0.4, 4, 'coretoroof');
  for (const sx of [-1, 1]) {
    box(sx * 9, 31, 1, 3.4, 0.8, 0, 'bench');
    box(sx * 14, 26, 1, 7, 1.1, 0, 'hedge'); box(sx * 14, 37, 1, 7, 1.1, 0, 'hedge');
    box(sx * 30, 41, 16, 8, 9, 0, 'house', { roof: 'flat', seed: 20 + sx, team: 'blue' });
    for (const z of [22, 40]) box(sx * 19, z, 0.35, 0.35, 4.2, 0, 'lamp');
  }
  // ruas dos lados: casas na borda, carro parado, caixotes
  for (const sx of [-1, 1]) {
    box(sx * 38, 22, 12, 10, 8, 0, 'house', { roof: 'peak', seed: 24 + sx });
    box(sx * 38, 4, 12, 12, 10, 0, 'house', { roof: 'flat', seed: 26 + sx });
    box(sx * 38, -14, 12, 10, 8, 0, 'house', { roof: 'peak', seed: 28 + sx });
    box(sx * 26, sx * 9, 2.4, 4.6, 2.2, 0, 'car', { seed: sx + 1 });
    box(sx * 28, -6, 2.2, 2.2, 1.5, 0, 'crate'); box(sx * 21, 12, 2, 2, 1.4, 0, 'crate');
    for (const z of [-20, 4]) box(sx * 30, z, 0.35, 0.35, 4.2, 0, 'lamp');
  }
  // beco dos fundos: predios atras, latas de lixo e caixotes
  for (const sx of [-1, 1]) {
    box(sx * 12, -42, 18, 7, 8, 0, 'house', { roof: 'flat', seed: 30 + sx, team: 'red' });
    box(sx * 36, -37, 16, 9, 7, 0, 'house', { roof: 'peak', seed: 32 + sx });
    box(sx * 7, -21, 2.6, 1.4, 1.5, 0, 'dumpster');
    box(sx * 14, -26, 2.4, 2.4, 1.6, 0, 'crate'); box(sx * 14.6, -25.4, 1.3, 1.3, 1.1, 1.6, 'crate');
    box(sx * 24, -24, 2.6, 1.4, 1.5, 0, 'dumpster');
    box(sx * 20, -32, 2.2, 2.2, 1.5, 0, 'crate');
  }
  return {
    id: 'ferradura', arena: A, boxes, theme: 'ferradura',
    spawns: {
      red: [[-8, -32], [8, -32], [-16, -30], [16, -30], [0, -34], [-26, -30], [26, -30], [-4, -28]],
      blue: [[-8, 40], [8, 40], [-18, 34], [18, 34], [0, 42], [-24, 30], [24, 30], [4, 38]],
      ffa: [[-40, -28], [40, -28], [-40, 34], [40, 34], [0, -30], [0, 40], [-24, 0], [24, 0], [-12, 5], [12, 5],
        [0, -2], [-20, -20], [20, -20], [-10, 24], [10, 24], [-28, 16], [28, 16]],
    },
    flagBase: { red: [0, 0, -32], blue: [0, 0, 40] },
    zones: [{ id: 'A', pos: [-24, 0, -6], r: 4.5 }, { id: 'B', pos: [0, 3, 10], r: 4 }, { id: 'C', pos: [24, 0, -6], r: 4.5 }],
    pickups: [
      { kind: 'wpn', wpn: 'shotgun', pos: [-12.5, 3, 4] }, { kind: 'wpn', wpn: 'shotgun', pos: [12.5, 3, 4] },
      { kind: 'wpn', wpn: 'sniper', pos: [0, 0, 24] }, { kind: 'wpn', wpn: 'rifle', pos: [-24, 0, -20] }, { kind: 'wpn', wpn: 'smg', pos: [24, 0, -20] },
      { kind: 'hp', pos: [-6, 0, -10] }, { kind: 'hp', pos: [6, 0, -10] }, { kind: 'hp', pos: [-24, 0, 14] }, { kind: 'hp', pos: [24, 0, 14] },
      { kind: 'hp', pos: [0, 0, -24] }, { kind: 'hp', pos: [-12.5, 3, -10] }, { kind: 'hp', pos: [12.5, 3, -10] },
    ],
  };
}

// ---------- Estudio Tinteiro (Noite dos Borroes, 03/11) ----------
// Estudio de animacao abandonado, de noite. Comeca na Sala de Animacao (meio, mesas de desenho); quatro portas
// pagas abrem as salas: Pintura (oeste), Arquivo de Rolos (leste), Cabine de Projecao (norte, com a cabine no
// alto) e o Telhado (sul, terraco 3 m acima). Os viloes saem das pocas de tinta das salas abertas.
// Porta fechada = caixa solida que mexe (M.dyn): a grade de navegacao nao ve porta, mas sala fechada e
// beco sem saida, entao rota nenhuma passa por ela.
// 03/11 (pedido dele): a Floresta em volta do estudio. A arena cresceu (34 -> 60) e o estudio continua igual no
// meio (S = 34), com a parede de fora propria; a porta paga na parede oeste da Pintura da pra floresta aberta.
function tinteiro() {
  const S = 34, A = 60, { boxes, box, stairs } = builder(A);
  const WH = 7, EH = 12, DZ = 3; // EH: parede de fora alta (nem do terraco pulando passa); DZ: z da porta da floresta
  box(0, S + 0.5, S * 2 + 2, 1, EH, 0, 'studioext'); box(0, -S - 0.5, S * 2 + 2, 1, EH, 0, 'studioext');
  box(S + 0.5, 0, 1, S * 2, EH, 0, 'studioext');
  box(-S - 0.5, (-S + DZ - 1.5) / 2, 1, S + DZ - 1.5, EH, 0, 'studioext'); box(-S - 0.5, (DZ + 1.5 + S) / 2, 1, S - DZ - 1.5, EH, 0, 'studioext');
  box(-S - 0.5, DZ, 1, 3, EH - 4.2, 4.2, 'studioext'); // em cima da porta
  // borda da floresta: muro invisivel (o desenho e mata fechada la fora)
  box(0, -A - 1, A * 2 + 4, 2, 9, 0, 'forestedge'); box(0, A + 1, A * 2 + 4, 2, 9, 0, 'forestedge');
  box(-A - 1, 0, 2, A * 2 + 4, 9, 0, 'forestedge'); box(A + 1, 0, 2, A * 2 + 4, 9, 0, 'forestedge');
  // paredes da sala do meio, com o vao de 3 m de cada porta
  for (const s of [-1, 1]) {
    box(-7.25, s * 12.5, 11.5, 1, WH, 0, 'studiowall'); box(7.25, s * 12.5, 11.5, 1, WH, 0, 'studiowall');
    box(s * 12.5, -7.25, 1, 11.5, WH, 0, 'studiowall'); box(s * 12.5, 7.25, 1, 11.5, WH, 0, 'studiowall');
    box(s * 12.5, 0, 1, 3, WH - 4.2, 4.2, 'studiowall'); box(0, s * 12.5, 3, 1, WH - 4.2, 4.2, 'studiowall'); // em cima das portas
  }
  // cantos fechados (fora das salas)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(sx * 23.5, sz * 23.5, 21, 21, 9, 0, 'studiowall');
    box(sx * 13.25, sz * 13.25, 1.5, 1.5, WH, 0, 'studiowall'); // tampa a quina: a sala de lado e a de frente so se tocavam num ponto (rota passava, corpo nao)
  }
  // Sala de Animacao: mesas de desenho (protecao baixa) e o lustre no meio
  for (const [x, z] of [[-6, -5], [6, 5], [-6, 5], [6, -5]]) box(x, z, 3, 1.6, 1.1, 0, 'desk');
  box(0, 0, 2.4, 2.4, 0.9, 0, 'desk', { light: 1 });
  // Pintura (oeste): latas de tinta e cavaletes
  box(-20, -7, 2.4, 2.4, 1.6, 0, 'vat'); box(-26, 6, 3, 3, 2, 0, 'vat'); box(-30, -2, 2, 2, 1.4, 0, 'vat');
  box(-17, 6, 0.6, 2.2, 2.4, 0, 'easel'); box(-24, -1, 0.6, 2.2, 2.4, 0, 'easel');
  // Arquivo de Rolos (leste): estantes de lata de filme em fileira
  for (const z of [-8, 0, 8]) box(23, z, 9, 1.2, 2.6, 0, 'shelf');
  // Cabine de Projecao (norte): a cabine e um bloco de 3 m com escada; dali se ve a sala toda
  box(0, 29, 14, 8, 3, 0, 'booth'); stairs(-10, 22, 0, 1, 3, 6, 0.5, 0.75); box(-9, 27.5, 4.5, 3, 3, 0, 'booth'); // patamar da escada ate a cabine
  box(9, 20, 2.4, 2.4, 1.6, 0, 'crate'); box(-4, 17, 2.4, 1.2, 1.2, 0, 'crate');
  // Telhado (sul): terraco 3 m acima, com escada larga da porta; caixas d'agua e chamines
  box(0, -26, 26, 16, 3, 0, 'roofdeck'); stairs(0, -13, 0, -1, 6, 6, 0.5, 0.833); // a escada sobe da porta ate a beira do terraco
  box(-7, -27, 2.4, 2.4, 2.6, 3, 'tank'); box(8, -21, 1.4, 1.4, 2.4, 3, 'chimney'); box(-9, -19, 1.2, 1.2, 2, 3, 'chimney');
  // ---- Floresta (anel de 26 m em volta do estudio). So arvore grande, pedra e tronco caido tem corpo (colisao
  // e laco em todas as caixas: pouca peca solida); arbusto, cogumelo e capim sao so desenho (cliente)
  const F = {
    pools: [[-48, -6], [-50, 14], [-43, 29], [-45, -27]],
    clear: [[-46, 3, 6], [-38.5, -8, 2.5], [-38.5, 12, 2.5], [-38.5, -16, 2.5]], // clareira na saida da porta e na frente das maquinas
    // riacho raso no norte (so desenho: da pra atravessar andando)
    creek: Array.from({ length: 25 }, (_, i) => { const x = -A + i * (A * 2) / 24; return [x, 48 + Math.sin(x / 9) * 3 + Math.sin(x / 4.1) * 0.8]; }),
  };
  let seed = 311; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const nearCreek = (x, z, r) => F.creek.some(([cx, cz], i) => i && Math.hypot(x - (cx + F.creek[i - 1][0]) / 2, z - (cz + F.creek[i - 1][1]) / 2) < r + 2.6);
  const busy = (x, z, r) => Math.max(Math.abs(x), Math.abs(z)) < S + 3 + r || Math.max(Math.abs(x), Math.abs(z)) > A - 1.5 - r
    || F.pools.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.5 + r) || F.clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + r)
    || (x < -S && x > -S - 7 && z > -20 && z < 16) || nearCreek(x, z, r); // corredor rente a parede (maquinas) livre
  for (let gx = -A + 3; gx <= A - 3; gx += 5) for (let gz = -A + 3; gz <= A - 3; gz += 5) {
    const x = gx + (rng() - 0.5) * 3.6, z = gz + (rng() - 0.5) * 3.6, r = rng();
    if (r < 0.34) { const t = 0.42 + rng() * 0.3; if (!busy(x, z, t + 1)) box(x, z, t * 2, t * 2, 9, 0, 'tree'); }
    else if (r < 0.43) { const s = 1.6 + rng() * 1.8; if (!busy(x, z, s / 2 + 0.5)) box(x, z, s, s * (0.7 + rng() * 0.5), 0.9 + rng() * 1.2, 0, 'rock'); }
    else if (r < 0.47) { const L = 4 + rng() * 2.5, along = rng() < 0.5; if (!busy(x, z, L / 2 + 0.5)) box(x, z, along ? L : 0.95, along ? 0.95 : L, 0.85, 0, 'log'); }
  }
  return {
    id: 'tinteiro', arena: A, studio: S, forest: F, boxes, theme: 'tinteiro',
    portal: { r: S + 0.5, in: [-S + 1.5, DZ], out: [-S - 2.5, DZ], k: (S + 1 + A) / 2 }, // nav.hop: rota estudio <-> floresta pela porta
    spawns: {
      red: [[-3, -2.5], [3, 2.5], [-3, 2.5], [3, -2.5], [0, -4], [0, 4], [-4, 0], [4, 0]],
      blue: [[-9, 9], [9, -9]],
      ffa: [[-3, -2.5], [3, 2.5], [-3, 2.5], [3, -2.5]],
    },
    flagBase: { red: [0, 0, -6], blue: [0, 0, 6] },
    zones: [{ id: 'A', pos: [-6, 0, 0], r: 3 }, { id: 'B', pos: [0, 0, 0], r: 3 }, { id: 'C', pos: [6, 0, 0], r: 3 }],
    pickups: [],
    bor: {
      rooms: ['hub', 'pintura', 'arquivo', 'cabine', 'telhado', 'floresta'],
      doors: [
        { id: 'pintura', price: 750, x: -12.5, z: 0, alongZ: true },
        { id: 'arquivo', price: 750, x: 12.5, z: 0, alongZ: true },
        { id: 'cabine', price: 1250, x: 0, z: 12.5 },
        { id: 'telhado', price: 1250, x: 0, z: -12.5 },
        { id: 'floresta', price: 1500, x: -S - 0.5, z: DZ, alongZ: true }, // parede oeste da Pintura
      ],
      // armas pintadas na parede: pos = onde fica quem compra; face = pra onde a pintura olha
      stations: [
        { wpn: 'smg', price: 500, room: 'hub', pos: [-11.4, 4.5], face: [1, 0] },
        { wpn: 'shotgun', price: 750, room: 'hub', pos: [11.4, -4.5], face: [-1, 0] },
        { wpn: 'rifle', price: 1000, room: 'arquivo', pos: [32.4, 4], face: [-1, 0] },
        { wpn: 'sniper', price: 1000, room: 'cabine', pos: [-4, 32.4], face: [0, -1] },
        { wpn: 'minigun', price: 3000, room: 'telhado', pos: [6, -32.4], face: [0, 1] },
        { wpn: 'shotgun', price: 750, room: 'pintura', pos: [-32.4, -6], face: [1, 0] },
        { wpn: 'rifle', price: 1000, room: 'floresta', pos: [-S - 2.1, -8], face: [-1, 0] }, // parede de fora do estudio
      ],
      milk: [{ room: 'hub', pos: [-9.5, -10.4], face: [0, 1] }, { room: 'arquivo', pos: [30, -11], face: [0, 1] }, { room: 'floresta', pos: [-S - 2.1, 12], face: [-1, 0] }],
      // Caixa de Surpresas do Nanquim: comeca no 1o lugar; a mola rindo leva pra outro (pos = onde fica quem usa)
      box: [
        { room: 'hub', pos: [4.5, -10.4], face: [0, 1] }, { room: 'arquivo', pos: [27, 11.4], face: [0, -1] },
        { room: 'cabine', pos: [11.4, 24], face: [-1, 0] }, { room: 'pintura', pos: [-20, 11.4], face: [0, -1] },
        { room: 'floresta', pos: [-S - 2.1, -16], face: [-1, 0] },
      ],
      // pocas de tinta de onde saem os viloes (por sala)
      pools: [
        { room: 'hub', pos: [-9.5, 9.5] }, { room: 'hub', pos: [9.5, -9.5] }, { room: 'hub', pos: [9.5, 9.5] },
        { room: 'pintura', pos: [-31, 9] }, { room: 'pintura', pos: [-31, -9] }, { room: 'pintura', pos: [-18, -10] },
        { room: 'arquivo', pos: [31, 10] }, { room: 'arquivo', pos: [31, -4] }, { room: 'arquivo', pos: [17, 11] },
        { room: 'cabine', pos: [10, 31] }, { room: 'cabine', pos: [-11, 31] }, { room: 'cabine', pos: [11, 17] },
        { room: 'telhado', pos: [-11, -31] }, { room: 'telhado', pos: [11, -31] }, { room: 'telhado', pos: [0, -31] },
        ...F.pools.map(pos => ({ room: 'floresta', pos })),
      ],
    },
  };
}


// ---------- Casa da Moeda (04/11, pedido dele: 2o mapa do Cofre, mesmo tema da Ferradura, maior e equilibrado) ----------
// Cidade de 1930. O cofre fica no fundo do salao da Casa da Moeda (norte); a van de fuga na praca do sul, onde o ataque
// nasce. Tres rotas com o mesmo tamanho (~55 m da van ao cofre), cada uma com a sua cara:
//  - OESTE (rua larga): linha longa de tiro, carros e a parada do bonde de cobertura; entra pela porta lateral oeste
//  - MEIO (praca): coreto e canteiros quebrando a visao; entra pela porta da frente (a mais larga, a mais vigiada)
//  - LESTE (beco da carga): curto e apertado, caixotes e cacambas; entra pela doca de carga (6 m) no lado leste
// A defesa nasce atras do predio (norte) e entra pela porta dos fundos: chega no cofre ~6 s antes do ataque, que
// compensa com tres entradas (a defesa nao segura as tres de uma vez). Pilares e balcoes dentro dao briga perto.
function moeda() {
  const A = 62, { boxes, box, walls } = builder(A);
  walls(9);
  // 04/11 (pedido dele): predio refeito, proprio (nao repete a Ferradura): granito cinza-esverdeado em blocos, friso
  // dourado, telhado de cobre e portico de pilares quadrados com a placa CASA DA MOEDA. Paredes sem sobrepor nos cantos
  // (frente e fundos de ponta a ponta; laterais so entre elas) = nada de face piscando
  const H = 8, X0 = -18, X1 = 18, Z0 = 8, Z1 = 32, T = 1; // predio 36 x 24 m
  const gw = (x0, x1, z0, z1, y0 = 0, y1 = H) => box((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0, y1 - y0, y0, 'granite');
  // frente (porta de 6 m) e fundos (porta da defesa, 4 m): de ponta a ponta
  gw(X0, -3, Z0 - T / 2, Z0 + T / 2); gw(3, X1, Z0 - T / 2, Z0 + T / 2); gw(-3, 3, Z0 - T / 2, Z0 + T / 2, 4.6);
  gw(X0, -2, Z1 - T / 2, Z1 + T / 2); gw(2, X1, Z1 - T / 2, Z1 + T / 2); gw(-2, 2, Z1 - T / 2, Z1 + T / 2, 4.2);
  // oeste: porta lateral (4 m, z 18-22); leste: doca de carga (6 m, z 22-28). So entre a frente e os fundos
  const zi0 = Z0 + T / 2, zi1 = Z1 - T / 2;
  gw(X0 - T / 2, X0 + T / 2, zi0, 18); gw(X0 - T / 2, X0 + T / 2, 22, zi1); gw(X0 - T / 2, X0 + T / 2, 18, 22, 4.2);
  gw(X1 - T / 2, X1 + T / 2, zi0, 22); gw(X1 - T / 2, X1 + T / 2, 28, zi1); gw(X1 - T / 2, X1 + T / 2, 22, 28, 4.6);
  box(0, (Z0 + Z1) / 2, X1 - X0 + 1.2, Z1 - Z0 + 1.2, 0.6, H, 'copperroof');
  // friso dourado em volta, um pouco abaixo do telhado (sai 15 cm da parede)
  box(0, Z0 - T / 2 - 0.08, X1 - X0 + 1.3, 0.16, 0.4, H - 0.9, 'goldtrim'); box(0, Z1 + T / 2 + 0.08, X1 - X0 + 1.3, 0.16, 0.4, H - 0.9, 'goldtrim');
  for (const x of [X0 - T / 2 - 0.08, X1 + T / 2 + 0.08]) box(x, (Z0 + Z1) / 2, 0.16, Z1 - Z0 + 1, 0.4, H - 0.9, 'goldtrim');
  // portico: 4 pilares quadrados e a viga com a placa (encosta na fachada, nada atravessando)
  for (const x of [-12.5, -6.5, 6.5, 12.5]) box(x, Z0 - 4, 1.4, 1.4, H, 0, 'granite');
  box(0, Z0 - 2.25 - T / 2, 28, 3.5, 1.6, H, 'mintsign');
  // salao: balcoes dos caixas, prensas de moeda (cobertura alta) e paletes de moeda perto do cofre (cofre em z 25)
  box(-8, 14, 8, 1.2, 1.2, 0, 'counter'); box(8, 14, 8, 1.2, 1.2, 0, 'counter'); box(0, 19.5, 3, 1, 1.1, 0, 'counter');
  for (const sx of [-1, 1]) { box(sx * 11.5, 21, 2.4, 3, 2.2, 0, 'machine'); box(sx * 6.5, 29, 2.2, 1.6, 1.3, 0, 'crate'); }
  for (const [x, z] of [[-11, 27], [11, 27]]) box(x, z, 1.2, 1.2, H, 0, 'granite');
  // praca do meio: coreto, canteiros e bancos (quebram a linha da porta da frente)
  box(0, -6, 9, 9, 0.5, 0, 'coreto'); box(0, -6, 10, 10, 0.4, 4.2, 'coretoroof');
  for (const [x, z] of [[-2.9, -8.9], [2.9, -8.9], [-2.9, -3.1], [2.9, -3.1]]) box(x, z, 0.35, 0.35, 3.7, 0.5, 'post'); // 06/11 (pedido dele): estacas DENTRO do coreto
  for (const sx of [-1, 1]) { box(sx * 9, -6, 1, 7, 1.1, 0, 'hedge'); box(sx * 6, 2.5, 6, 1, 1.1, 0, 'hedge'); box(sx * 11, -14, 1, 3.4, 0.8, 0, 'bench'); }
  // rua oeste (larga): carros parados e a parada do bonde
  box(-34, -24, 2.4, 4.6, 2.2, 0, 'car', { seed: 1 }); box(-28, 2, 2.4, 4.6, 2.2, 0, 'car', { seed: 2 }); box(-36, 24, 2.4, 4.6, 2.2, 0, 'car', { seed: 3 });
  box(-27, -10, 6, 2.2, 0.4, 3, 'coretoroof'); for (const z of [-11, -9]) box(-29.6, z, 0.3, 0.3, 3, 0, 'post'); box(-27, -10.6, 5, 0.6, 1, 0, 'bench');
  for (const z of [-34, -6, 20, 44]) box(-52, z, 14, 12, 8 + (z % 3), 0, 'house', { roof: z % 2 ? 'peak' : 'flat', seed: 50 + z });
  for (const z of [-30, 0, 30]) box(-22, z, 0.35, 0.35, 4.2, 0, 'lamp');
  // beco leste (apertado): predios dos dois lados, cacambas e caixotes
  for (const z of [-34, -12, 10, 36]) box(46, z, 14, 16, 9, 0, 'house', { roof: 'flat', seed: 60 + z });
  box(28, -20, 2.6, 1.4, 1.5, 0, 'dumpster'); box(33, 4, 2.6, 1.4, 1.5, 0, 'dumpster'); box(26, 14, 2.2, 2.2, 1.6, 0, 'crate'); box(34, 18, 2.2, 2.2, 1.6, 0, 'crate'); box(34.6, 18.6, 1.3, 1.3, 1.1, 1.6, 'crate');
  box(24, -6, 2.4, 2.4, 1.6, 0, 'crate'); box(30, 30, 2.4, 2.4, 1.6, 0, 'crate'); box(22, 25, 3, 6, 1.2, 0, 'crate'); // pallets na boca da doca
  // fundos (defesa): rua de tras com casas na borda
  for (const x of [-34, -12, 12, 34]) box(x, 54, 16, 10, 8, 0, 'house', { roof: x % 2 ? 'flat' : 'peak', seed: 70 + x, team: 'blue' });
  box(-22, 40, 2.4, 4.6, 2.2, 0, 'car', { seed: 4 }); box(20, 42, 2.2, 2.2, 1.5, 0, 'crate');
  // sul (ataque): predios na borda e a van na praca
  for (const x of [-36, -12, 12, 36]) box(x, -54, 16, 10, 8, 0, 'house', { roof: x % 2 ? 'peak' : 'flat', seed: 80 + x, team: 'red' });
  for (const sx of [-1, 1]) box(sx * 18, -30, 2.2, 2.2, 1.5, 0, 'crate');
  return {
    id: 'moeda', arena: A, boxes, theme: 'moeda',
    heistPts: { vault: [0, 25], van: [0, -40] },
    spawns: {
      red: [[-8, -44], [8, -44], [-16, -42], [16, -42], [0, -46], [-24, -40], [24, -40], [-4, -48]],
      blue: [[-8, 44], [8, 44], [-16, 46], [16, 46], [0, 46], [-26, 44], [26, 44], [4, 48]],
      ffa: [[-40, -40], [40, -40], [-40, 40], [40, 40], [0, -20], [0, 40], [-30, 0], [30, 0], [-10, 20], [10, 20]],
    },
    flagBase: { red: [0, 0, -44], blue: [0, 0, 46] },
    zones: [{ id: 'A', pos: [-30, 0, 10], r: 5 }, { id: 'B', pos: [0, 0, 20], r: 5 }, { id: 'C', pos: [30, 0, 10], r: 5 }],
    pickups: [
      { kind: 'wpn', wpn: 'shotgun', pos: [-8, 0, 20] }, { kind: 'wpn', wpn: 'shotgun', pos: [30, 0, -10] }, { kind: 'wpn', wpn: 'sniper', pos: [-30, 0, -30] },
      { kind: 'hp', pos: [-24, 0, -14] }, { kind: 'hp', pos: [24, 0, 0] }, { kind: 'hp', pos: [0, 0, -16] }, { kind: 'hp', pos: [0, 0, 38] }, { kind: 'hp', pos: [-8, 0, 30] },
    ],
  };
}

// ---------- Cais do Sol Poente (04/11, pedido dele): Contrabando no Cais, docas no por do sol ----------
// Geografia igual ao Cofre: o barco (entrega) atracado no SUL, onde o ataque nasce; o armazem com a pilha de caixotes
// no NORTE (defesa). Tres rotas: a rua dos conteineres no meio (cobertura e linha media), o pier dos pescadores a
// oeste (aberto, rapido, exposto) e os trilhos do guindaste a leste (estreito, coberto, com o vagao no caminho).
// Borda = cais de pedra com agua em volta (muro invisivel na beirada: ninguem cai no mar).
function docas() {
  const A = 58, { boxes, box, stairs, walkIn } = builder(A);
  for (const [cx, cz, w, d] of [[0, -A - 1, A * 2 + 4, 2], [0, A + 1, A * 2 + 4, 2], [-A - 1, 0, 2, A * 2 + 4], [A + 1, 0, 2, A * 2 + 4]]) box(cx, cz, w, d, 9, 0, 'quayedge');
  // barco atracado no sul (o conv?s e chao: 1,6 m), prancha subindo do cais; a entrega e no conv?s
  // agua na frente do cais (z < -47,5) dos dois lados do barco: muro invisivel (ninguem anda na agua)
  const QZ = -47.5;
  for (const sx of [-1, 1]) box(sx * 35.5, (QZ - A) / 2 - 0.5, 47, A + QZ + 1, 9, 0, 'quayedge');
  box(0, -52.5, 24, 9, 1.6, 0, 'boat');
  box(-7, -52.5, 5, 5, 3.2, 1.6, 'boatcabin'); box(9, -52.5, 1.6, 1.6, 4.5, 1.6, 'boatstack');
  stairs(0, -44.5, 0, -1, 5, 4, 0.4, 0.9, 'plank');
  // armazem no norte: paredes com 3 entradas (frente larga, dois lados), telhado alto; a pilha de caixotes la dentro
  const WZ = 40, WW = 30, WD = 18, WH = 7;
  box(-11, WZ - WD / 2, 8, 1, WH, 0, 'shed'); box(11, WZ - WD / 2, 8, 1, WH, 0, 'shed'); box(0, WZ - WD / 2, 14, 1, WH - 4.2, 4.2, 'shed'); // frente: portao de 14 m
  box(0, WZ + WD / 2, WW, 1, WH, 0, 'shed');
  for (const s0 of [-1, 1]) { box(s0 * WW / 2, WZ - 5, 1, 8, WH, 0, 'shed'); box(s0 * WW / 2, WZ + 6.5, 1, 5, WH, 0, 'shed'); box(s0 * WW / 2, WZ + 1.5, 1, 5, WH - 4, 4, 'shed'); } // portas dos lados (5 m)
  box(0, WZ, WW + 1, WD + 1, 0.5, WH, 'shedroof');
  box(0, WZ + 3, 4, 3, 1.2, 0, 'cratepile'); // a pilha (os caixotes soltos vem do jogo)
  for (const [x, z] of [[-9, WZ + 5], [9, WZ + 5], [-10, WZ - 3], [10, WZ - 3]]) box(x, z, 2.4, 2.4, 1.6, 0, 'crate');
  box(-6, WZ - 2, 2.2, 3.6, 1.6, 0, 'forklift');
  // rua dos conteineres (meio): pilhas de 1 e 2, com vaos pra atravessar
  const C = [[-14, 16, 1], [-6, 6, 2], [6, 18, 1], [14, 4, 2], [-16, -6, 1], [0, -10, 1], [16, -16, 1], [-8, -22, 2], [8, -28, 1]];
  C.forEach(([x, z, n], i) => { if (i % 2) openCont(box, x, z, 2.6, 6.2, 2.6, 0, i); else box(x, z, 2.6, 6.2, 2.6, 0, 'container', { seed: i }); if (n > 1) box(x, z, 2.6, 6.2, 2.6, 2.6, 'container', { seed: i + 3 }); });
  // pier dos pescadores (oeste): tabuado com casinhas, redes e barris
  // 04/11 (pedido dele): as casinhas do pier viraram casas de pescador que da pra entrar; escritorio do porto de 2
  // andares no leste e mais uma casa no noroeste. Cores de por do sol (reboco quente)
  [[-42, 24, 0xe9c9a4], [-44, 2, 0xd9a98a], [-40, -20, 0xe8b98f]].forEach(([x, z, c]) => walkIn(x, z, 7, 6, '+x', { col: c }));
  walkIn(46, 38, 10, 8, '-x', { floors: 2, col: 0xdcae86 }); walkIn(-44, 40, 8, 7, '+x', { col: 0xe4c19c });
  for (const [x, z] of [[-34, 30], [-36, -26], [52, 22], [40, 46]]) box(x, z, 1.3, 1.3, 1.3, 0, 'barrel');
  for (const [x, z] of [[-30, 20], [-30, -14], [36, 22]]) box(x, z, 2.4, 2.4, 1.6, 0, 'crate');
  for (const [x, z] of [[-34, 12], [-36, -8], [-32, -30], [-48, -34]]) box(x, z, 1.3, 1.3, 1.3, 0, 'barrel');
  // trilhos do guindaste (leste): guindaste grande sobre os trilhos e o vagao de carga parado
  box(38, 10, 2, 2, 12, 0, 'crane'); box(48, 10, 2, 2, 12, 0, 'crane'); box(43, 10, 12, 2, 1.2, 12, 'cranebeam');
  box(44, -12, 3.2, 12, 3, 0, 'railcar');
  for (const [x, z] of [[34, -30], [50, 28], [32, 30]]) box(x, z, 2.4, 2.4, 1.6, 0, 'crate');
  // cais do sul: cabecos de amarra e postes de luz
  for (const x of [-30, -18, 18, 30]) box(x, -44, 0.8, 0.8, 0.9, 0, 'bollard');
  for (const [x, z] of [[-24, -38], [24, -38], [-24, 26], [24, 26]]) box(x, z, 0.35, 0.35, 4.2, 0, 'lamp');
  return {
    id: 'docas', arena: A, boxes, theme: 'docas',
    quayZ: -47.5, // borda do cais no sul (o mundo desenha o mar dali pra fora)
    heistPts: { vault: [0, WZ + 6.5], van: [0, -52.5] }, // pilha (vault) e barco (van): o motor do Cofre usa estes
    spawns: {
      red: [[-8, -38], [8, -38], [-14, -36], [14, -36], [0, -34], [-22, -34], [22, -34], [-4, -40]],
      blue: [[-8, 52], [8, 52], [-16, 52], [16, 52], [0, 54], [-24, 50], [24, 50], [4, 54]],
      ffa: [[-40, -40], [40, -40], [-40, 40], [40, 40], [0, 0], [-20, 10], [20, -10], [0, 30], [-30, -10], [30, 10]],
    },
    flagBase: { red: [0, 0, -38], blue: [0, 0, 52] },
    zones: [{ id: 'A', pos: [-36, 0, 0], r: 5 }, { id: 'B', pos: [0, 0, 0], r: 5 }, { id: 'C', pos: [40, 0, 0], r: 5 }],
    pickups: [
      { kind: 'hp', pos: [-30, 0, 0] }, { kind: 'hp', pos: [30, 0, 0] }, { kind: 'hp', pos: [0, 0, 24] }, { kind: 'hp', pos: [0, 0, -24] },
    ],
  };
}

// degraus de colisao por forma: [altura de baixo, de cima, largura] em fracao da caixa. Duna = inscritos na meia esfera do desenho
// (raio 0,62 da largura, altura 1,05); mesa e paredao = as 3 camadas do desenho (paredao afina so na espessura); pedra = dentro do icosaedro
export const ROOF_EAVE = 0.35; // beiral do telhado de duas aguas (o desenho do Blender usa o mesmo)
const SHAPE_TIERS = {
  // chafariz redondo: bacia em octogono dentro do circulo + a coluna do meio (08/11: a coluna nao tinha corpo)
  fountain: [[0, 1, 0.707], [0, 1, 0.92, 0.38], [0, 1, 0.38, 0.92], [1, 2.2, 0.15]],
  cactus: [[0, 1, 1], [0.36, 0.66, 2, 0.5]], // 08/11: os bracos tambem batem
  dune: [[0, 0.35, 0.82], [0.35, 0.7, 0.65], [0.7, 0.95, 0.37]],
  mesa: [[0, 1 / 3, 1], [1 / 3, 2 / 3, 0.93], [2 / 3, 1, 0.86]],
  cliff: [[0, 1 / 3, 1], [1 / 3, 2 / 3, 0.92], [2 / 3, 1, 0.84]],
  rock: [[0, 0.9, 0.56], [0, 0.5, 0.88, 0.36], [0, 0.5, 0.36, 0.88]], // 08/11: a metade de baixo, a mais larga, acompanha o desenho
  // cilindro em pe (caixa d'agua, silo): 3 caixas cruzadas, todas dentro do circulo (quina a quina = octogono)
  tank: [[0, 1, 0.707], [0, 1, 0.92, 0.38], [0, 1, 0.38, 0.92]],
  silo: [[0, 1, 0.707], [0, 1, 0.92, 0.38], [0, 1, 0.38, 0.92]],
};
// ---------- Canyon Poeira (04/11, pedido dele: mapa GRANDE de deserto, aberto, estilo Cold War) ----------
// So bandeira e dominacao (normal e blitz). 260 x 260 m: bases nas pontas norte/sul, um canyon cortando o mapa de
// leste a oeste com 3 passagens (ponte de tabua no meio, desfiladeiro a oeste, vau seco a leste), dunas soltas pra
// cobertura baixa, mesas de pedra com rampa (sniper) nas laterais, vila de adobe em ruina no meio (B) e o posto de
// gasolina abandonado. Corredores largos = linha longa de tiro; as ruinas e as dunas quebram a linha perto dos pontos.
function deserto() {
  const A = 130, { boxes, box, stairs, walls } = builder(A);
  walls(10);
  let seed = 911; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // canyon: paredoes de pedra dos dois lados de uma vala (o fundo e o chao, as bordas sao altas). Deixa 3 vaos
  const gaps = [[-86, 14], [0, 16], [84, 14]]; // [x, largura]
  for (const z of [-9, 9]) {
    let x = -A;
    for (const [gx, gw] of [...gaps, [A + 40, 0]]) {
      const a = x, b = gx - gw / 2;
      if (b - a > 2) box((a + b) / 2, z, b - a, 4, 5 + (z > 0 ? 0.6 : 0), 0, 'cliff');
      x = gx + gw / 2;
    }
  }
  // ponte de tabua no vao do meio (por cima da vala; da pra passar por baixo tambem)
  // ponte de tabua no vao do meio (16 m de vao: os paredoes ficam fora). Escada de cada ponta desce pra fora do canyon
  box(0, 0, 9, 22, 0.6, 2.7, 'bridge', { deck: true }); // tabuleiro em 2,7-3,3 m, de borda a borda do canyon
  stairs(0, 16.4, 0, -1, 9, 6, 0.55, 0.9); stairs(0, -16.4, 0, 1, 9, 6, 0.55, 0.9); // sobem de fora do canyon ate a ponte
  // bases (fortins de adobe) nas pontas, com muro baixo e torre de vigia
  for (const s of [-1, 1]) {
    const team = s < 0 ? 'red' : 'blue';
    box(0, s * 118, 30, 8, 7, 0, 'adobe', { team, seed: 1 });
    for (const sx of [-1, 1]) {
      box(sx * 24, s * 108, 6, 6, 8, 0, 'tower', { team });
      stairs(sx * 16, s * 108, sx, 0, 3, 10, 0.8, 0.5); // 06/11: sobe PRA torre (subia de costas)
      box(sx * 12, s * 98, 10, 1.4, 1.7, 0, 'adobewall');
      box(sx * 40, s * 104, 8, 8, 5, 0, 'adobe', { seed: 2 + sx });
    }
    // caminhao enferrujado e caixotes na saida da base
    box(s * 18, s * 86, 2.7, 5.1, 2.5, 0, 'truck', { seed: s }); // medida do modelo do Tripo (4,9 m): a caixa de 7 m era parede invisivel
    box(-s * 22, s * 84, 2.4, 2.4, 1.6, 0, 'crate'); box(-s * 24.5, s * 84, 2, 2, 1.2, 0, 'crate');
  }
  // vila de adobe em ruina no meio (sul do canyon e norte, espelhada): casas baixas com parede faltando
  for (const s of [-1, 1]) {
    for (const [x, z, w, d, h] of [[-26, 30, 10, 8, 4.5], [-8, 36, 8, 8, 3.8], [14, 30, 12, 8, 5], [32, 40, 8, 10, 4.2]]) {
      box(x, s * z, w, d, h, 0, 'adobe', { seed: Math.abs(x + z), ruin: true });
    }
    box(0, s * 24, 6, 1.2, 1.6, 0, 'adobewall'); box(-40, s * 22, 1.2, 8, 1.6, 0, 'adobewall'); box(40, s * 24, 1.2, 8, 1.6, 0, 'adobewall');
  }
  // mesas de pedra (morros de topo chato) com rampa: posicao alta de sniper, uma de cada lado de cada time
  for (const [x, z] of [[-96, -52], [96, 52], [-96, 52], [96, -52]]) {
    box(x, z, 18, 16, 7, 0, 'mesa');
    const dz = z < 0 ? 1 : -1; stairs(x + (x < 0 ? 6 : -6), z + dz * 8, 0, dz, 6, 12, 0.6, 1.1, 'rockstep');
    box(x, z, 6, 1, 1.2, 7, 'rock');
  }
  // posto de gasolina abandonado (leste) e caixa d'agua com escada (oeste)
  box(62, -30, 14, 10, 5, 0, 'adobe', { seed: 40, sign: 'gas' });
  box(62, -42, 16, 8, 0.4, 5, 'platform'); for (const x of [56, 68]) box(x, -42, 0.5, 0.5, 5, 0, 'post');
  box(-62, 30, 5, 5, 9, 0, 'tank'); stairs(-55.5, 30, -1, 0, 2.4, 10, 0.9, 0.4); // 06/11: sobe PRA caixa d'agua (subia de costas)
  // dunas e pedras soltas: cobertura baixa espalhada (fora dos caminhos dos pontos e das bases)
  const busy = (x, z, r) => Math.abs(z) < 14 + r || Math.abs(z) > A - 26 || boxes.some(b => x > b.min[0] - r - 3 && x < b.max[0] + r + 3 && z > b.min[2] - r - 3 && z < b.max[2] + r + 3);
  for (let k = 0; k < 140; k++) {
    const x = (rng() * 2 - 1) * (A - 8), z = (rng() * 2 - 1) * (A - 8), big = rng() < 0.45;
    const w = big ? 9 + rng() * 9 : 2 + rng() * 2.5, d = big ? 6 + rng() * 7 : 2 + rng() * 2.5, h = big ? 1.4 + rng() * 1.4 : 1 + rng() * 1.6;
    if (busy(x, z, Math.max(w, d) / 2)) continue;
    box(x, z, w, d, h, 0, big ? 'dune' : 'rock');
  }
  // cactos (finos, cobertura minima de visao)
  for (let k = 0; k < 60; k++) {
    const x = (rng() * 2 - 1) * (A - 6), z = (rng() * 2 - 1) * (A - 6);
    if (busy(x, z, 1)) continue;
    box(x, z, 0.7, 0.7, 2.2 + rng() * 1.6, 0, 'cactus');
  }
  return {
    id: 'deserto', arena: A, boxes, theme: 'deserto',
    spawns: {
      red: [[-8, -104], [8, -104], [-16, -100], [16, -100], [0, -98], [-30, -100], [30, -100], [-4, -108], [4, -108], [-22, -94], [22, -94], [0, -92]],
      blue: [[-8, 104], [8, 104], [-16, 100], [16, 100], [0, 98], [-30, 100], [30, 100], [-4, 108], [4, 108], [-22, 94], [22, 94], [0, 92]],
      ffa: [[-100, -100], [100, 100], [-100, 100], [100, -100], [-60, -60], [60, 60], [-60, 60], [60, -60], [0, -60], [0, 60], [-90, 0], [90, 0]],
    },
    flagBase: { red: [0, 0, -112], blue: [0, 0, 112] },
    // dominacao: A no desfiladeiro oeste, B na ponte do meio (alta), C no vau seco leste
    zones: [{ id: 'A', pos: [-86, 0, 0], r: 7 }, { id: 'B', pos: [0, 3.3, 0], r: 5.5 }, { id: 'C', pos: [84, 0, 0], r: 7 }],
    pickups: [
      { kind: 'wpn', wpn: 'sniper', pos: [-96, 7, -52] }, { kind: 'wpn', wpn: 'sniper', pos: [96, 7, 52] },
      { kind: 'wpn', wpn: 'lmg', pos: [62, 5.4, -42] }, { kind: 'wpn', wpn: 'lmg', pos: [-62, 0, 36] },
      { kind: 'wpn', wpn: 'rifle', pos: [-26, 0, -42] }, { kind: 'wpn', wpn: 'rifle', pos: [26, 0, 42] },
      { kind: 'wpn', wpn: 'shotgun', pos: [-8, 0, -46] }, { kind: 'wpn', wpn: 'shotgun', pos: [8, 0, 46] },
      { kind: 'hp', pos: [-86, 0, -18] }, { kind: 'hp', pos: [84, 0, 18] }, { kind: 'hp', pos: [0, 0, -30] }, { kind: 'hp', pos: [0, 0, 30] },
      { kind: 'hp', pos: [-50, 0, -80] }, { kind: 'hp', pos: [50, 0, 80] }, { kind: 'hp', pos: [-110, 0, 0] }, { kind: 'hp', pos: [110, 0, 0] },
    ],
  };
}

// ---------- bairros grandes pra Dominacao e Bandeira (08/11, pedido dele) ----------
// Quarteiroes entre ruas, com becos entre os predios, pracas abertas e casas que da pra entrar. Tudo sorteado com semente fixa (servidor e navegador
// montam igual) e colocado duas vezes, no ponto e no oposto em volta do centro: nenhum lado leva vantagem.
function cityMap(id, A, c) {
  const { boxes, box, stairs, walls, walkIn } = builder(A);
  walls(10);
  let seed = c.seed; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const flip = (d) => (d[0] === '+' ? '-' : '+') + d[1], twin = (fn) => { fn(1); fn(-1); };
  const baseZ = A - 11, baseR = [0, -baseZ, 17, 10], open = [...c.open, baseR], allOpen = open.flatMap(R => [R, [-R[0], -R[1], R[2], R[3]]]);
  const hit = (R, x, z, w, d, pad) => Math.abs(x - R[0]) < R[2] + w / 2 + pad && Math.abs(z - R[1]) < R[3] + d / 2 + pad;
  const lines = [], solid = [], reserve = (x, z, w, d) => { solid.push([x, z, w, d], [-x, -z, w, d]); };
  const free = (x, z, w, d, pad) => solid.every(o => Math.abs(o[0] - x) > (o[2] + w) / 2 + pad || Math.abs(o[1] - z) > (o[3] + d) / 2 + pad);
  const sw = c.sw;
  const bound = (L, i) => [i === 0 ? -A + 0.9 : L[i - 1] + sw / 2, i === L.length ? A - 0.9 : L[i] - sw / 2];
  for (let i = 0; i <= c.xs.length; i++) for (let j = 0; j <= c.zs.length; j++) {
    const [x0, x1] = bound(c.xs, i), [z0, z1] = bound(c.zs, j), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (cz > 1e-6 || (Math.abs(cz) < 1e-6 && cx >= -1e-6)) continue; // a outra metade sai no espelho
    const alongX = x1 - x0 >= z1 - z0, a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1, b0 = alongX ? z0 : x0, b1 = alongX ? z1 : x1, D = b1 - b0;
    const rows = D >= 21 ? 2 : 1;
    for (let r = 0; r < rows; r++) {
      const depth = Math.min(c.depth || 12, rows === 2 ? (D - 2.8) / 2 : D - 0.4);
      let p = a0 + 0.2, prev = null;
      while (p < a1 - 5.5) {
        let len = Math.min(13, 8 + rng() * 5.5); if (a1 - p - len < 6) len = Math.min(14, a1 - p - 0.2);
        const u = p + len / 2, across = rows === 2 ? (r === 0 ? b0 + depth / 2 + 0.2 : b1 - depth / 2 - 0.2) : (b0 + b1) / 2;
        p += len + (rng() < 0.35 ? 3.6 : 2.5); // beco entre os predios (de 2,5 a 3,6 m: passa gente, nao passa carro)
        const x = alongX ? u : across, z = alongX ? across : u, w = alongX ? len : depth, d = alongX ? depth : len;
        const roll = rng(), two = rng(), hr = rng(), peak = rng(), colI = Math.floor(rng() * c.cols.length), sd = Math.floor(rng() * 90);
        if (Math.min(w, d) < 5.5 || allOpen.some(R => hit(R, x, z, w, d, 1.2))) { prev = null; continue; }
        reserve(x, z, w, d);
        const isWalk = roll < c.walk && Math.min(w, d) >= 7.5 && Math.max(w, d) <= 14.2, top = isWalk ? (Math.min(w, d) >= 9 && two < c.two ? 2 : 1) * 3.4 : c.h0 + hr * c.h1;
        if (prev && u - len / 2 - prev.end < 4.5) { // o beco entre este predio e o anterior: varal no alto (so desenho) e tralha encostada numa parede, sem fechar a passagem
          const g0 = prev.end, g1 = u - len / 2, y = Math.min(prev.top, top) - 0.8, dress = rng(), side = rng() < 0.5 ? -1 : 1, off = (rng() * 2 - 1) * (depth / 2 - 1.2), kind = c.alley[Math.floor(rng() * c.alley.length)];
          if (y >= 2.7 && dress < 0.75) { const L = alongX ? [g0 - 0.1, y, across, g1 + 0.1, y, across] : [across, y, g0 - 0.1, across, y, g1 + 0.1]; lines.push(L, L.map((v, i) => (i % 3 === 1 ? v : -v))); }
          if (g1 - g0 > 3 && dress > 0.3) { const mid = (g0 + g1) / 2 + side * ((g1 - g0) / 2 - 0.75), ax = alongX ? mid : across + off, az = alongX ? across + off : mid; if (free(ax, az, 1.2, 1.2, 0.05) && Math.hypot(Math.abs(ax), Math.abs(az) - (A - 12)) > 18) { reserve(ax, az, 1.2, 1.2); twin(s => box(s * ax, s * az, 1.2, 1.2, kind[1], 0, kind[0])); } }
        }
        prev = { end: u + len / 2, top };
        if (isWalk) {
          const axis = alongX ? 'z' : 'x'; let sg = rows === 2 ? (r === 0 ? '-' : '+') : two < 0.5 ? '-' : '+';
          const front = (axis === 'x' ? x : z) + (sg === '+' ? 1 : -1) * ((axis === 'x' ? w : d) / 2 + 2); if (Math.abs(front) > A - 2) sg = sg === '+' ? '-' : '+'; // nunca de cara pro muro da borda
          const o = { floors: Math.min(w, d) >= 9 && two < c.two ? 2 : 1, col: c.cols[colI] };
          twin(s => walkIn(s * x, s * z, w, d, s > 0 ? sg + axis : flip(sg + axis), o));
        } else {
          const h = c.h0 + hr * c.h1;
          twin(s => box(s * x, s * z, w, d, h, 0, 'house', { roof: peak < 0.55 ? 'peak' : 'flat', seed: sd + (s > 0 ? 0 : 7) }));
        }
      }
    }
  }
  // base de cada time: fundo com casa na cor do time e barricadas (o espelho da a do outro lado)
  twin(s => {
    const team = s < 0 ? 'red' : 'blue';
    box(0, s * (A - 3.2), 24, 3.6, 9, 0, 'house', { team, roof: 'flat', seed: 11 });
    for (const x of [-13, 13]) box(x, s * (A - 5.5), 6, 6, 6.5, 0, 'house', { team, roof: 'peak', seed: 12 + (x > 0 ? 1 : 0) });
  });
  reserve(0, -(A - 3.2), 24, 3.6); for (const x of [-13, 13]) reserve(x, -(A - 5.5), 6, 6);
  // mirantes: plataforma alta com escada, um por praca lateral (e o do outro lado)
  for (const [x, z, sx] of c.towers) {
    twin(s => {
      box(s * x, s * z, 7, 7, 0.5, 3.5, 'platform');
      for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) box(s * x + px, s * z + pz, 0.6, 0.6, 3.5, 0, 'pillar');
      stairs(s * (x + sx * 8.75), s * (z + 2), -s * sx, 0, 2.4, 7, 0.5, 0.75);
    });
    reserve(x, z, 7, 7); reserve(x + sx * 6.1, z + 2, 5.3, 2.4);
  }
  const spawnSpots = [-14, -8, -3, 3, 8, 14].flatMap(x => [[x, -(A - 16), 4.6], [x, A - 16, 4.6]]).concat([[-12, -(A - 12), 4.6], [12, -(A - 12), 4.6], [-12, A - 12, 4.6], [12, A - 12, 4.6]]);
  const zones = c.zones, keep = (x, z) => [...zones.flatMap(q => [[q.pos[0], q.pos[2], q.r + 2.2], [-q.pos[0], -q.pos[2], q.r + 2.2]]), [0, -baseZ, 5], [0, baseZ, 5], ...spawnSpots].every(([a, b, r]) => Math.hypot(x - a, z - b) > r);
  c.center?.({ box, stairs, twin, reserve });
  // cobertura e enfeite nas pracas, sempre em par
  for (const R of open) for (let k = 0; k < c.cover; k++) {
    const x = R[0] + (rng() * 2 - 1) * (R[2] - 1.5), z = R[1] + (rng() * 2 - 1) * (R[3] - 1.5), t = c.props[Math.floor(rng() * c.props.length)], flipL = rng() < 0.5;
    const [w0, d0] = t[1], h = t[2], w = flipL ? d0 : w0, d = flipL ? w0 : d0;
    if (!keep(x, z) || !free(x, z, w, d, 1.9)) continue;
    reserve(x, z, w, d);
    twin(s => box(s * x, s * z, w, d, h, 0, t[0], t[3] ? { seed: k + (s > 0 ? 0 : 3) } : {}));
  }
  // contorno das pracas: barracas e bancos encostados na beirada, nunca na boca de uma rua
  const nearStreet = (L, v) => L.some(q => Math.abs(q - v) < sw / 2 + 2.2);
  for (const R of c.open) for (const sd of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const horiz = sd[1] !== 0, span = horiz ? R[2] : R[3];
    for (let u = -span + 2; u < span - 1; u += c.ringStep) {
      const t = c.ring[Math.floor(rng() * c.ring.length)], [L0, W0] = t[1], x = horiz ? R[0] + u : R[0] + sd[0] * (R[2] - W0 / 2 - 0.5), z = horiz ? R[1] + sd[1] * (R[3] - W0 / 2 - 0.5) : R[1] + u, w = horiz ? L0 : W0, d = horiz ? W0 : L0;
      if (nearStreet(c.xs, x) || nearStreet(c.zs, z) || !keep(x, z) || !free(x, z, w, d, 1.1)) continue;
      reserve(x, z, w, d); twin(s => box(s * x, s * z, w, d, t[2], 0, t[0]));
    }
  }
  // carros e caminhao (modelos do Tripo) estacionados nas ruas largas, encostados na calcada
  if (c.park) for (const x of c.xs) for (let zz = -A + 12; zz < -1; zz += c.park) {
    const go = rng(), side = rng() < 0.5 ? -1 : 1, big = rng() < 0.2, W = big ? 2.7 : 2.4, Ln = big ? 5.1 : 4.6, H = big ? 2.5 : 2.2, sd = Math.floor(rng() * 40), px = x + side * (sw / 2 - W / 2 - 0.1);
    if (go > 0.6 || c.zs.some(v => Math.abs(v - zz) < sw / 2 + 3.4) || !keep(px, zz) || !free(px, zz, W, Ln, 0.05)) continue;
    reserve(px, zz, W, Ln); twin(s => box(s * px, s * zz, W, Ln, H, 0, big ? 'truck' : 'car', { seed: sd + (s > 0 ? 0 : 1) }));
  }
  // lampioes nas quinas das pracas
  for (const R of c.open) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = R[0] + a * (R[2] - 1), z = R[1] + b * (R[3] - 1);
    if (!keep(x, z) || !free(x, z, 0.4, 0.4, 0.7)) continue;
    reserve(x, z, 0.4, 0.4); twin(s => box(s * x, s * z, 0.4, 0.4, 4.2, 0, 'lamp'));
  }
  // moveis de rua nas esquinas: hidrante, correio, lixeira, coluna de cartazes, relogio
  for (const x of c.xs) for (const z of c.zs) {
    if (z > 0) continue;
    for (let n = 0; n < 2; n++) {
      const a = rng() < 0.5 ? -1 : 1, b = rng() < 0.5 ? -1 : 1, t = STREET_KIT[Math.floor(rng() * STREET_KIT.length)], px = x + a * (sw / 2 - 0.55), pz = z + b * (sw / 2 - 0.55);
      if (!keep(px, pz) || !free(px, pz, t[1], t[1], 0.5)) continue;
      reserve(px, pz, t[1], t[1]); twin(s => box(s * px, s * pz, t[1], t[1], t[2], 0, t[0]));
    }
  }
  const clearAt = (x, z) => free(x, z, 1.6, 1.6, 0.4);
  const cross = []; for (const x of c.xs) for (const z of c.zs) if (clearAt(x, z)) cross.push([x, z]);
  const line = (sg) => [-14, -8, -3, 3, 8, 14].map(x => [x, sg * (A - 16)]).concat([[-12, sg * (A - 12)], [12, sg * (A - 12)]]);
  return {
    id, arena: A, boxes, theme: id,
    roads: c.xs.map(x => [sw, A * 2, x, 0]), deco: { lines },
    spawns: { red: line(-1), blue: line(1), ffa: cross },
    flagBase: { red: [0, 0, -baseZ], blue: [0, 0, baseZ] },
    zones,
    pickups: [
      ...c.towers.flatMap(([x, z]) => [{ kind: 'wpn', wpn: 'sniper', pos: [x, 4, z] }, { kind: 'wpn', wpn: 'sniper', pos: [-x, 4, -z] }]),
      ...zones.filter(q => q.id !== 'B').flatMap(q => [{ kind: 'hp', pos: [q.pos[0] + q.r + 1.5, q.pos[1], q.pos[2]] }]),
      ...cross.filter((_, i) => i % 5 === 0).slice(0, 6).map(([x, z]) => ({ kind: 'hp', pos: [x, 0, z] })),
      ...cross.filter((_, i) => i % 7 === 3).slice(0, 4).map(([x, z], i) => ({ kind: 'wpn', wpn: i % 2 ? 'rifle' : 'shotgun', pos: [x, 0, z] })),
    ],
  };
}
const PROP_MIX = [['crate', [2.2, 2.2, 1.6], 1.6], ['crate', [4, 1.3, 1.4], 1.4], ['bench', [3.2, 1, 0.8], 0.8], ['hedge', [5, 1, 1.15], 1.15], ['dumpster', [2.6, 1.5, 1.5], 1.5], ['stall', [3.2, 1.6, 2.5], 2.5], ['kiosk', [2.6, 2.2, 2.7], 2.7], ['cart', [2, 1.2, 1.6], 1.6], ['car', [2.4, 4.6, 2.2], 2.2, 1], ['truck', [2.7, 5.1, 2.5], 2.5, 1]];
const STREET_KIT = [['hydrant', 0.5, 0.9], ['mailbox', 0.7, 1.5], ['trashcan', 0.7, 1], ['poster', 1.2, 3], ['streetclock', 0.5, 4.6]];
const ALLEY_KIT = [['crate', 1.2], ['trashcan', 1], ['barrel', 1.4], ['dumpster', 1.3]];
// Beco do Nanquim: miolo apertado de becos, tres pracinhas
function becos() {
  return cityMap('becos', 70, { seed: 4021, sw: 4, depth: 14, xs: [-52, -30, -9, 9, 30, 52], zs: [-46, -28, -9, 9, 28, 46], walk: 0.5, two: 0.5, h0: 5, h1: 5, cols: [0xe6d6b4, 0xd8c4a0, 0xcfc8b4, 0xe3c8a6], cover: 14, props: PROP_MIX, alley: ALLEY_KIT, ringStep: 5, ring: [['stall', [3.2, 1.6], 2.5], ['crate', [2.2, 1.3], 1.4], ['bench', [3.2, 1], 0.8], ['cart', [2, 1.2], 1.6]],
    open: [[0, 0, 13, 13], [-41, 0, 11, 9.5]], zones: [{ id: 'A', pos: [-41, 0, 0], r: 5 }, { id: 'B', pos: [0, 0, 0], r: 5 }, { id: 'C', pos: [41, 0, 0], r: 5 }], towers: [[-41, -6.5, 1]],
    center: ({ box, twin, reserve }) => { for (const [x, z] of [[9, 9], [-9, 9]]) { twin(s => box(s * x, s * z, 5, 5, 1.1, 0, 'fountain')); reserve(x, z, 5, 5); } } });
}
// Feira do Pneu: ruas largas, mercado coberto no centro e barracas nas pracas
function feira() {
  return cityMap('feira', 76, { seed: 9173, sw: 6.5, depth: 14, xs: [-58, -35, -13, 13, 35, 58], zs: [-52, -33, -13, 13, 33, 52], walk: 0.36, two: 0.4, h0: 4.5, h1: 4, cols: [0xe9c9a4, 0xe3d3a8, 0xd2c6a6, 0xe0b890], cover: 20, alley: ALLEY_KIT, props: [['stall', [3.2, 1.6, 2.5], 2.5], ['stall', [3.2, 1.6, 2.5], 2.5], ['cart', [2, 1.2, 1.6], 1.6], ['kiosk', [2.6, 2.2, 2.7], 2.7], ['table', [3, 1.1, 0.95], 0.95], ['crate', [2.2, 2.2, 1.6], 1.6], ['barrel', [1.2, 1.2, 1.4], 1.4], ['bench', [3.2, 1, 0.8], 0.8], ['car', [2.4, 4.6, 2.2], 2.2, 1], ['truck', [2.7, 5.1, 2.5], 2.5, 1]], park: 9, ringStep: 4.6, ring: [['stall', [3.2, 1.6], 2.5], ['stall', [3.2, 1.6], 2.5], ['cart', [2, 1.2], 1.6], ['kiosk', [2.6, 2.2], 2.7]],
    open: [[0, 0, 14.5, 14.5], [-46.5, 13, 12, 10.5]], zones: [{ id: 'A', pos: [-46.5, 0, 13], r: 5.5 }, { id: 'B', pos: [0, 0, 0], r: 5.5 }, { id: 'C', pos: [46.5, 0, -13], r: 5.5 }], towers: [[-46.5, 6.5, 1]],
    center: ({ box, reserve }) => { // mercado coberto: telhado sobre colunas, aberto dos quatro lados
      for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8], [-8, 0], [8, 0], [0, -8], [0, 8]]) { box(x, z, 1.1, 1.1, 5, 0, 'column'); reserve(x / 2 + (x < 0 ? -0.1 : 0), z / 2 + 0.03, 0.01, 0.01); }
      box(0, 0, 19, 19, 0.3, 5, 'hroof');
      for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8], [-8, 0], [8, 0], [0, -8], [0, 8]]) reserve(x, z, 1.1, 1.1);
    } });
}
// Largo da Sirene: predios altos, tres largos em diagonal e o do meio elevado
function largo() {
  return cityMap('largo', 80, { seed: 2711, sw: 5.5, depth: 14, xs: [-60, -38, -15, 15, 38, 60], zs: [-58, -38, -15, 15, 38, 58], walk: 0.26, two: 0.5, h0: 7, h1: 7, cols: [0xdcd6c8, 0xc9cdb4, 0xbfc8cc, 0xd9c7a8], cover: 16, props: PROP_MIX, alley: ALLEY_KIT, park: 12, ringStep: 5.5, ring: [['bench', [3.2, 1], 0.8], ['hedge', [4.4, 1], 1.15], ['kiosk', [2.6, 2.2], 2.7], ['stall', [3.2, 1.6], 2.5]],
    open: [[0, 0, 13.5, 13.5], [-49, -26.5, 10, 11]], zones: [{ id: 'A', pos: [-49, 0, -26.5], r: 5 }, { id: 'B', pos: [0, 1.5, 0], r: 5 }, { id: 'C', pos: [49, 0, 26.5], r: 5 }], towers: [[-49, -33, 1]],
    center: ({ box, reserve }) => {
      box(0, 0, 12, 12, 1.5, 0, 'platform');
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i < 3; i++) { const off = 3 - i; box(dx * (6 + off * 0.75 - 0.375), dz * (6 + off * 0.75 - 0.375), dx ? 0.75 : 4, dz ? 0.75 : 4, (i + 1) * 0.5, 0, 'step'); }
      reserve(0, 0, 16.5, 16.5);
    } });
}

// ---------- Avenida do Cortejo (so Escolta, 08/11, pedido dele) ----------
// A mais movimentada: bulevares retos com lojas de entrar dos dois lados, ruas de servico por tras pra flanquear, barracas, bancos e canteiros na calcada,
// passarela sobre o trilho e duas pracas nos pontos de controle. Reto de proposito: a Ladeira e o Vale sao zigue-zague e rampa.
function cortejo() {
  const A = 78, { boxes, box, stairs, walls, walkIn } = builder(A);
  walls(10);
  const track = [[-58, -68], [-58, -36], [-20, -36], [-20, -8], [34, -8], [34, 24], [-14, 24], [-14, 54], [46, 54], [46, 68]];
  let seed = 6151; const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dTrack = (x, z) => { let m = 1e9; for (let i = 1; i < track.length; i++) { const [ax, az] = track[i - 1], [bx, bz] = track[i], vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz, k = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L)); m = Math.min(m, Math.hypot(x - ax - vx * k, z - az - vz * k)); } return m; };
  const clear = (x, z, w, d, gap) => [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]].every(([a, b]) => dTrack(x + a * w / 2, z + b * d / 2) > gap);
  const solid = [], free = (x, z, w, d, pad = 1) => Math.abs(x) + w / 2 < A - 1.5 && Math.abs(z) + d / 2 < A - 1.5 && solid.every(o => Math.abs(o[0] - x) > (o[2] + w) / 2 + pad || Math.abs(o[1] - z) > (o[3] + d) / 2 + pad);
  const reserve = (x, z, w, d) => solid.push([x, z, w, d]);
  // estacao de cada ponta, as duas pracas e a passarela guardam o lugar antes das lojas
  reserve(-58, -66, 30, 20); reserve(46, 66, 30, 20);
  // praca do 1o ponto: monumento, canteiros e bancos
  reserve(3, -23, 24, 18); box(3, -24, 4, 4, 9, 0, 'tower');
  for (const sx of [-1, 1]) { box(3 + sx * 8, -27, 1, 7, 1.15, 0, 'hedge'); box(3 + sx * 8, -18, 1, 3.4, 0.8, 0, 'bench'); box(3 + sx * 4.5, -17, 0.4, 0.4, 4.2, 0, 'lamp'); }
  // praca do 2o ponto: coreto de musica com escada e barracas em volta
  reserve(-34, 38, 22, 22); box(-34, 38, 8, 8, 0.5, 0, 'coreto'); for (const [x, z] of [[-3.4, -3.4], [3.4, -3.4], [-3.4, 3.4], [3.4, 3.4]]) box(-34 + x, 38 + z, 0.3, 0.3, 3.5, 0.5, 'post'); box(-34, 38, 9, 9, 0.4, 4, 'coretoroof');
  for (const [x, z] of [[-44, 30], [-24, 30], [-44, 46], [-24, 46]]) { box(x, z, 3.2, 1.6, 2.5, 0, 'stall'); box(x, z + 2, 1.2, 1.2, 1.4, 0, 'barrel'); }
  box(3, -32, 5, 5, 1.1, 0, 'fountain'); box(-34, 26.5, 2.6, 2.2, 2.7, 0, 'kiosk');
  // passarela sobre o trilho
  reserve(34, 8, 42, 5); box(34, 8, 16, 3, 0.4, 5, 'bridge'); for (const x of [27, 41]) box(x, 8, 0.6, 2.4, 5, 0, 'pillar'); stairs(18, 8, 1, 0, 2.6, 10, 0.5, 0.8); stairs(50, 8, -1, 0, 2.6, 10, 0.5, 0.8);
  const COLS = [0xe9d3a8, 0xe3c3a6, 0xc9d0bc, 0xbfc8cc, 0xe8d69a, 0xd9b9a0];
  const T = []; for (let i = 1; i < track.length; i++) T.push([track[i - 1], track[i]]);
  let n = 0;
  for (const [a, b] of T) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, alongX = Math.abs(ux) > 0.5;
    for (const side of [-1, 1]) {
      // calcada: lojas coladas na avenida, porta virada pro trilho
      for (let s = 2; s < L - 2;) {
        const len = 8.5 + rng() * 2.5, depth = 9, off = 6.6 + depth / 2, x = a[0] + ux * (s + len / 2) + uz * side * off, z = a[1] + uz * (s + len / 2) - ux * side * off;
        const W = alongX ? len : depth, D = alongX ? depth : len, nx = alongX ? 0 : (uz * side > 0 ? 1 : -1), nz = alongX ? (-ux * side > 0 ? 1 : -1) : 0, two = rng(), kindR = rng();
        s += len + (rng() < 0.3 ? 4.4 : 1.5); // beco de vez em quando: atalho pra rua de tras
        if (!clear(x, z, W, D, 6.2) || !free(x, z, W, D, 1.2)) continue;
        reserve(x, z, W, D);
        if (kindR < 0.72) walkIn(x, z, W, D, nz ? (nz > 0 ? '-z' : '+z') : (nx > 0 ? '-x' : '+x'), { floors: two < 0.6 ? 2 : 1, col: COLS[n++ % COLS.length] });
        else box(x, z, W, D, 5 + rng() * 4, 0, 'house', { roof: 'flat', seed: 200 + n++ });
      }
      // segunda fileira: predios altos, atras da rua de servico
      for (let s = 2; s < L - 2;) {
        const len = 10 + rng() * 4, depth = 10 + rng() * 3, off = 21 + depth / 2, x = a[0] + ux * (s + len / 2) + uz * side * off, z = a[1] + uz * (s + len / 2) - ux * side * off;
        const W = alongX ? len : depth, D = alongX ? depth : len, h = 9 + rng() * 6, peak = rng();
        s += len + 3.2;
        if (!clear(x, z, W, D, 17) || !free(x, z, W, D, 2.8)) continue;
        reserve(x, z, W, D); box(x, z, W, D, h, 0, 'house', { roof: peak < 0.4 ? 'peak' : 'flat', seed: 300 + n++ });
      }
    }
  }
  // o movimento da calcada: barracas, barris, bancos, canteiros, sempre fora do caminho do bonde
  const PR = [['stall', 3.2, 1.6, 2.5], ['stall', 3.2, 1.6, 2.5], ['kiosk', 2.6, 2.2, 2.7], ['cart', 2, 1.2, 1.6], ['crate', 1.8, 1.8, 1.4], ['barrel', 1.2, 1.2, 1.4], ['bench', 3.2, 1, 0.8], ['hedge', 4, 1, 1.15], ['poster', 1.2, 1.2, 3], ['mailbox', 0.7, 0.7, 1.5], ['hydrant', 0.5, 0.5, 0.9], ['trashcan', 0.7, 0.7, 1], ['car', 4.6, 2.4, 2.2], ['car', 4.6, 2.4, 2.2], ['truck', 5.1, 2.7, 2.5], ['dumpster', 2.6, 1.5, 1.5]];
  for (let k = 0; k < 260; k++) {
    const [a, b] = T[Math.floor(rng() * T.length)], s = rng(), side = rng() < 0.5 ? -1 : 1, off = 3.6 + rng() * 1.6, L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, [kd, w0, d0, h] = PR[Math.floor(rng() * PR.length)], alongX = Math.abs(ux) > 0.5;
    const x = a[0] + (b[0] - a[0]) * s + uz * side * off, z = a[1] + (b[1] - a[1]) * s - ux * side * off, W = alongX ? w0 : d0, D = alongX ? d0 : w0;
    if (!clear(x, z, W, D, 3) || !free(x, z, W, D, 1.8)) continue;
    reserve(x, z, W, D); box(x, z, W, D, h, 0, kd, kd === 'car' || kd === 'truck' ? { seed: k } : {});
  }
  for (const [a, b] of T) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L; for (let s = 6; s < L - 4; s += 13) for (const side of [-1, 1]) { const x = a[0] + ux * s + uz * side * 3.4, z = a[1] + uz * s - ux * side * 3.4; if (clear(x, z, 0.4, 0.4, 3) && free(x, z, 0.4, 0.4, 0.6)) { reserve(x, z, 0.4, 0.4); box(x, z, 0.4, 0.4, 4.2, 0, 'lamp'); } } }
  // estacao (vermelho) e garagem (azul)
  box(-58, -74.6, 22, 1.4, 7, 0, 'house', { team: 'red', roof: 'flat', seed: 21 }); box(46, 74.6, 22, 1.4, 7, 0, 'house', { team: 'blue', roof: 'flat', seed: 22 });
  const sp = (i0, side) => { const out = []; for (let i = 0; i < 8; i++) { const t = track[i0], o = (i % 4 - 1.5) * 3, r = 5 + Math.floor(i / 4) * 3; out.push([t[0] + side * r, t[1] + o]); } return out; };
  return {
    id: 'cortejo', arena: A, boxes, theme: 'cortejo', track, checks: [0.36, 0.7],
    spawns: { red: sp(0, 1), blue: sp(9, -1), ffa: [...sp(0, 1), ...sp(9, -1)] },
    flagBase: { red: track[0].length ? [-58, 0, -68] : [0, 0, 0], blue: [46, 0, 68] },
    zones: [{ id: 'A', pos: [-58, 0, -36], r: 5 }, { id: 'B', pos: [34, 0, 8], r: 5 }, { id: 'C', pos: [-14, 0, 54], r: 5 }],
    pickups: [
      { kind: 'hp', pos: [3, 0, -14] }, { kind: 'hp', pos: [-24, 0, 38] }, { kind: 'hp', pos: [34, 5.4, 8] }, { kind: 'hp', pos: [-40, 0, -36] }, { kind: 'hp', pos: [20, 0, 24] }, { kind: 'hp', pos: [14, 0, 54] },
      { kind: 'wpn', wpn: 'sniper', pos: [34, 5.4, 8] }, { kind: 'wpn', wpn: 'shotgun', pos: [3, 0, -14] }, { kind: 'wpn', wpn: 'rifle', pos: [-34, 0.5, 38] },
    ],
  };
}

const BUILDERS = { vila, fabrica, fronteira, estaleiro, refinaria, ilha, bonde, apito, ferradura, tinteiro, deserto, docas, moeda, becos, feira, largo, cortejo };
export const PVE_ONLY = ['tinteiro']; // Noite dos Borroes: so a noite usa (e a noite so usa ele)
export const HEIST_ONLY = ['ferradura', 'moeda', 'docas']; // mapas de objetivo proprio (Cofre / Contrabando): fora da lista dos outros modos
// Canyon Poeira (04/11): mapa grande so pra bandeira e dominacao (normal e blitz); nos outros modos nao entra
export const BIG_OBJ_ONLY = ['deserto', 'becos', 'feira', 'largo'], BIG_OBJ_MODES = ['ctf', 'dom']; // mapa feito pro Roube o Cofre (fora dele nao entra na lista)
export const ESCORT_MAPS = ['bonde', 'apito', 'cortejo']; // mapas com trilho (so a escolta usa)
// mapas que aparecem na escolha do lobby (a ilha e so do battle royale)
export const PICK_MAPS = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria'];
export const MAP_IDS = Object.keys(BUILDERS);
// mapa sugerido por modo
export const MODE_MAP = { borroes: 'tinteiro', smuggle: 'docas', heist: 'ferradura', escort: 'bonde', br: 'ilha', ffa: 'fabrica', gungame: 'estaleiro', tdm: 'vila', dom: 'vila', ctf: 'fronteira', infect: 'refinaria' };
// pontos de bomba (x, z) perto do lado da defesa (azul nasce em +z); a altura sai da grade
export const BOMB_SITES = {
  vila: { A: [-20, 27], B: [20, 27] },
  fabrica: { A: [-20, 21], B: [19, 14] },
  fronteira: { A: [-30, 38], B: [30, 38] },
  estaleiro: { A: [-13, 15], B: [13, 15] },
  refinaria: { A: [-17, 21], B: [24, 15] },
  ferradura: { A: [0, -2], B: [-12.5, 8] }, // cofre no fosso do subsolo
};
// arma no chao: so UMA minigun, no meio de cada mapa (as outras sairam). Vida continua onde estava.
const MINIGUN_AT = { largo: [0, 1.5, 0], cortejo: [-34, 0.5, 34], moeda: [0, 0, -16], docas: [0, 0, 0], deserto: [0, 3.3, 0], ferradura: [0, 0.5, 31], apito: [10, 3, -5], bonde: [-28, 5.5, -26], vila: [0, 1.5, 0], fabrica: [0, 3, 0], fronteira: [0, 1.2, 0], estaleiro: [0, 1.2, 0], refinaria: [-3, 3, -3] };
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
  if (id !== 'ilha' && id !== 'tinteiro') M.pickups = [...M.pickups.filter(p => p.kind !== 'wpn'), { kind: 'wpn', wpn: 'minigun', pos: MINIGUN_AT[id] || [0, 0, 0] }];
  return (cache[id] = M);
}

const STEP = 0.6;

// Move um corpo AABB (pes em pos) com degrau automatico. Muta pos e vel.

// obstaculos que andam (01/11): o bonde da escolta. Caixa girada no chao: M.dyn = [{ x, y, z, yaw, hw, hl, h }]
// (meia largura, meio comprimento ao longo do trilho, altura). raycast, moveBody e hasLOS respeitam (bala e boneco nao atravessam).
function toLocal(B, p) { const dx = p[0] - B.x, dz = p[2] - B.z, c = Math.cos(B.yaw), s = Math.sin(B.yaw); return [dx * c - dz * s, p[1] - B.y, dx * s + dz * c]; }
function dirLocal(B, d) { const c = Math.cos(B.yaw), s = Math.sin(B.yaw); return [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c]; }
function rayDyn(B, o, d, best) {
  if (B.noRay) return Infinity; // so corpo: quem bate no tiro e a caixa propria dele (sentinela, carro)
  const lo = toLocal(B, o), ld = dirLocal(B, d), mn = [-B.hw, 0, -B.hl], mx = [B.hw, B.h, B.hl];
  let tmin = 0, tmax = best;
  for (let a = 0; a < 3; a++) {
    if (Math.abs(ld[a]) < 1e-9) { if (lo[a] < mn[a] || lo[a] > mx[a]) return Infinity; continue; }
    let t1 = (mn[a] - lo[a]) / ld[a], t2 = (mx[a] - lo[a]) / ld[a];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin > 0 ? tmin : Infinity;
}
// objetos que ficam no chao (04/11, pedido dele: atravessava): sentinela, sinalizador e carro parado sem ninguem. Mesma lista no
// servidor (bots) e no cliente (eu). Carro com gente nao entra: quem dirige e quem vai sentado nao pode se empurrar.
export function propBoxes(blimps, cars) {
  const out = [];
  for (const b of blimps || []) {
    const k = b.kind || b.k;
    if (k === 'sentry') out.push({ x: b.pos[0], y: b.pos[1], z: b.pos[2], yaw: 0, hw: 0.42, hl: 0.42, h: 1.75, noRay: true });
    else if (k === 'beacon') out.push({ x: b.pos[0], y: b.pos[1], z: b.pos[2], yaw: 0, hw: 0.22, hl: 0.22, h: 0.75, noRay: true });
  }
  for (const c of cars || []) if (!c.deadT && !c.seats?.some(Boolean)) out.push({ x: c.pos[0], y: c.pos[1], z: c.pos[2], yaw: c.yaw, hw: 1.1, hl: 1.95, h: 1.4, noRay: true, car: c.id });
  return out;
}
function pushDyn(B, pos, vel, rad, height) {
  const l = toLocal(B, pos);
  if (pos[1] + height <= B.y || pos[1] >= B.y + B.h) return false;
  const px = B.hw + rad - Math.abs(l[0]), pz = B.hl + rad - Math.abs(l[2]);
  if (px <= 0 || pz <= 0) return false;
  if (pos[1] > B.y + B.h - 0.55 && vel[1] <= 0) { pos[1] = B.y + B.h; vel[1] = 0; return true; } // em cima do teto: anda nele
  if (px < pz) l[0] += Math.sign(l[0] || 1) * px; else l[2] += Math.sign(l[2] || 1) * pz;
  const c = Math.cos(B.yaw), s = Math.sin(B.yaw); // volta pro mundo
  pos[0] = B.x + l[0] * c + l[2] * s; pos[2] = B.z - l[0] * s + l[2] * c;
  return false;
}

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
      // redondo: empurra pra fora pela borda do circulo (desliza em volta do tanque, sem canto invisivel)
      const rr = roundR(b);
      if (rr) {
        const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2, dx = pos[0] - cx, dz = pos[2] - cz, L = Math.hypot(dx, dz) || 1e-6, R = rr + rad + 1e-4;
        pos[0] = cx + dx / L * R; pos[2] = cz + dz / L * R;
        continue;
      }
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
  if (M.dyn) for (const B of M.dyn) if (pushDyn(B, pos, vel, rad, height)) onGround = true; // bonde: empurra pra fora (ou anda no teto)
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

// cabe em pe aqui? (03/11: duto do Banco Ferradura so passa agachado; levantar la dentro jogava o boneco pra cima do duto)
export const headroom = (M, pos, rad = 0.4, height = 1.7) => !blockedAbove(M.boxes, pos, rad, height, pos[1]);

function blockedAbove(boxes, pos, rad, height, newY) {
  const p = [pos[0], newY + 0.01, pos[2]];
  for (const b of boxes) if (overlap(p, rad, height - 0.02, b)) return true;
  return false;
}

// peca redonda em pe (tanque, silo, tonel, pilar, poste, pedra): raio no chao; 0 = caixa comum
const ROUND_BODY = { trunk: 1, pillar: 1, post: 1, vat: 1, tank: 1, silo: 1, rock: 1.05, tree: 1, cactus: 1, dune: 1, barrel: 1, bollard: 1 };
function roundR(b) { const k = ROUND_BODY[b.kind]; return k ? Math.min(b.max[0] - b.min[0], b.max[2] - b.min[2]) / 2 * k : 0; }
function overlap(pos, rad, height, b) {
  const r = roundR(b);
  if (r) {
    if (!(pos[1] + height > b.min[1] + 1e-3 && pos[1] < b.max[1] - 1e-3)) return false;
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    return (pos[0] - cx) ** 2 + (pos[2] - cz) ** 2 < (r + rad) ** 2;
  }
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
// Forma de verdade dentro da caixa (30/10: a bala batia no canto invisivel da caixa do pilar redondo).
// 31/10: o corpo tambem bate no cilindro de verdade (antes o canto da caixa do tanque segurava a 1 m do desenho).
const ROUND = { pillar: 1.15, post: 1, vat: 1, tank: 1, silo: 1, tree: 1 }; // cilindro em pe (pilar afina pra cima: raio medio)
function shapeHit(b, o, d, tmin, tmax) {
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], dd = b.max[2] - b.min[2];
  // intervalo do raio dentro de uma quadrica (eixos u,v escalados pelos raios); devolve [t0, t1, normal no t0]
  const quad = (axes) => {
    let A = 0, B = 0, C = -1;
    for (const [k, c, r] of axes) { const oo = (o[k] - c) / r, dk = d[k] / r; A += dk * dk; B += 2 * oo * dk; C += oo * oo; }
    if (A < 1e-12) return C <= 0 ? [-Infinity, Infinity] : null;
    const D = B * B - 4 * A * C; if (D < 0) return null;
    const q = Math.sqrt(D); return [(-B - q) / (2 * A), (-B + q) / (2 * A)];
  };
  const kind = b.kind;
  let iv, axes;
  if (ROUND[kind]) { const r = Math.min(w, dd) / 2 * ROUND[kind]; axes = [[0, cx, r], [2, cz, r]]; }
  else if (kind === 'pipe') { const r = Math.min(w, dd, h) / 2; axes = w > dd ? [[1, cy, r], [2, cz, r]] : [[0, cx, r], [1, cy, r]]; }
  else if (kind === 'rock') axes = [[0, cx, w * 0.525], [1, b.min[1] + h * 0.5, h * 0.575], [2, cz, dd * 0.525]];
  else return { t: tmin, n: null };
  iv = quad(axes);
  if (!iv) return null;
  const t0 = Math.max(iv[0], tmin), t1 = Math.min(iv[1], tmax);
  if (t0 > t1 || t1 < 0) return null;
  if (t0 > iv[0] + 1e-6) return { t: t0, n: null }; // entrou pela tampa da caixa (topo/base): normal da caixa
  const p = [o[0] + d[0] * t0, o[1] + d[1] * t0, o[2] + d[2] * t0], n = [0, 0, 0];
  for (const [k, c, r] of axes) n[k] = (p[k] - c) / (r * r);
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return { t: t0, n: [n[0] / l, n[1] / l, n[2] / l] };
}

export function raycast(M, o, d, maxDist = 250) {
  let best = maxDist, normal = null;
  if (d[1] < 0) {
    const t = -o[1] / d[1];
    if (t >= 0 && t < best) { best = t; normal = [0, 1, 0]; }
  }
  for (const b of M.boxes) {
    if (b.kind === 'rope') continue; // corda do ringue: a bala passa entre as cordas
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
    if (miss || tmin >= best) continue;
    if (b.kind in ROUND || b.kind === 'pipe' || b.kind === 'rock') {
      const sh = shapeHit(b, o, d, tmin, tmax);
      if (!sh || sh.t >= best) continue;
      best = sh.t; if (sh.n) normal = sh.n; else if (nAxis >= 0) { normal = [0, 0, 0]; normal[nAxis] = nSign; }
      continue;
    }
    if (nAxis >= 0) { best = tmin; normal = [0, 0, 0]; normal[nAxis] = nSign; }
  }
  if (M.dyn) for (const B of M.dyn) { const t = rayDyn(B, o, d, best); if (t < best) { best = t; normal = [-d[0], 0, -d[2]]; } } // bonde para a bala
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
  const crouch = p.anim === 'crouch' || p.anim === 'slide' || p.anim === 'seat' || p.anim === 'drive'; // sentado no carro: caixa baixa
  const hb = p.mob ? MOBS[p.mob]?.hb : null; // vilao da noite: caixa da ficha (chefao de 6 m, borrao baixinho)
  const bodyH = hb ? hb.h : crouch ? 0.9 : 1.3;
  const headY = p.pos[1] + (hb ? hb.head : crouch ? 1.15 : 1.6);
  const hr = hb ? hb.hr : 0.34;
  const hc = [p.pos[0] - o[0], headY - o[1], p.pos[2] - o[2]];
  const tc = hc[0] * d[0] + hc[1] * d[1] + hc[2] * d[2];
  if (tc > 0 && tc < maxDist) {
    const dd = hc[0] * hc[0] + hc[1] * hc[1] + hc[2] * hc[2] - tc * tc;
    if (dd < hr * hr) return { dist: tc - Math.sqrt(hr * hr - dd), head: true };
  }
  const r = hb ? hb.r : 0.48;
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
