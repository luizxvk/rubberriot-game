// Sequencias grandes (03/11, pedido dele): Biplano, Trem Desgovernado, Balao Bombardeiro e Mao do Animador.
// Biplano, trem e mao andam em c.crafts; o balao mora em c.blimps (kind 'bomber') pra herdar o tiro que derruba
// e a trava de "uma sequencia grande por vez". O fogo que ele larga fica em c.fires.
import { STREAKS, NADES } from './weapons.js';
import { hasLOS } from './map.js';
import { floorAt } from './nav.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const r2 = (v) => Math.round(v * 100) / 100;

export const BOMBER_GAP = 60; // m entre os dois baloes do deserto (o balao tem ~20 m)
export function strikeReset(c) { c.crafts = []; c.fires = []; c.boxes = []; }

// caixa de municao (05/11): uma por dono; a nova troca a velha. O servidor nao conhece a reserva de ninguem: quem decide
// pedir e o cliente, aqui so confere se a caixa existe, se esta perto e se a pessoa pode pegar
export function abxDrop(c, owner, pos) {
  const y = floorAt(c.M, pos[0], pos[2]), A = NADES.ammobox;
  c.boxes = c.boxes.filter(b => b.owner !== owner.id);
  c.boxes.push({ id: c.boxSeq = (c.boxSeq || 0) + 1, owner: owner.id, team: owner.team, pos: [pos[0], Number.isFinite(y) ? y : pos[1], pos[2]], t: A.time, uses: A.uses, hp: A.hp, botT: 1 });
  c.event({ k: 'abxSet', id: owner.id, pos });
}
// explosao da caixa. Sozinha (tempo ou usos): e do dono e so fere inimigo dele, entao pegar a ultima carga nao machuca ninguem
// do time. A tiro (by = quem destruiu): e de quem atirou, fere o time da caixa e ele leva metade se estiver perto
export function abxBoom(c, b, by = null) {
  c.boxes = c.boxes.filter(x => x !== b);
  const A = NADES.ammobox, at = [b.pos[0], b.pos[1] + 0.4, b.pos[2]], who = by || c.players.get(b.owner);
  if (!who) return;
  c.event({ k: 'boom', pos: at, owner: who.id });
  c.blastCars(at, A.blast + 1.5, 200, who);
  for (const v of c.players.values()) {
    if (!v.alive) continue;
    const to = [v.pos[0], v.pos[1] + 0.9, v.pos[2]], d = Math.hypot(to[0] - at[0], to[1] - at[1], to[2] - at[2]);
    if (d > A.blast || !hasLOS(c.M, at, to)) continue;
    const self = v.id === who.id;
    if (self ? !by : !c.enemies(who, v)) continue;
    c.damage(v, who, (A.dmg * (1 - d / A.blast) + 10) * (self ? 0.5 : 1), 'frag', false);
  }
}
// tiro na caixa: so inimigo acerta; o Core ja conferiu a arma, a distancia e o limite de dano
export function abxShot(c, b, by, dmg) { if ((b.hp -= dmg) <= 0) abxBoom(c, b, by); }
export function abxTake(c, p, id) {
  const b = c.boxes.find(x => x.id === id), A = NADES.ammobox, now = c.clock || 0, owner = b && c.players.get(b.owner);
  if (!b || !owner || !p.alive || p.down > 0 || (p !== owner && c.enemies(p, owner))) return;
  if ((p.abxAt ?? -1e9) + A.cd > now) return;
  if (Math.hypot(p.pos[0] - b.pos[0], p.pos[2] - b.pos[2]) > A.radius + 0.8 || Math.abs(p.pos[1] - b.pos[1]) > 2.5) return; // folga do atraso da rede
  p.abxAt = now; b.uses--;
  c.event({ k: 'abxTake', id: p.id, pos: b.pos });
  if (b.uses <= 0) abxBoom(c, b);
}
function abxTick(c, dt) {
  for (const b of [...c.boxes]) {
    const owner = c.players.get(b.owner);
    if (!owner) { c.boxes = c.boxes.filter(x => x !== b); continue; } // o dono saiu da sala: some sem explodir
    if ((b.t -= dt) <= 0) { abxBoom(c, b); continue; }
    if ((b.botT -= dt) > 0) continue; b.botT = 1;
    const at = [b.pos[0], b.pos[1] + 0.4, b.pos[2]]; // bot inimigo perto atira nela, sem pressa
    for (const v of c.players.values()) {
      if (!v.bot || !v.alive || !c.enemies(owner, v) || Math.hypot(v.pos[0] - at[0], v.pos[2] - at[2]) > 12 || !hasLOS(c.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], at)) continue;
      c.event({ k: 'shot', id: v.id, o: [v.pos[0], v.pos[1] + 1.4, v.pos[2]], e: at, wpn: v.wpn });
      abxShot(c, b, v, 15);
      break;
    }
  }
}

// reta que passa pelo meio dos inimigos vivos, na direcao em que estao mais espalhados (mesma conta da Linha de Bigornas)
export function enemyLine(c, p) {
  const A = c.M.arena;
  const en = [...c.players.values()].filter(o => o.alive && !o.inRing && c.enemies(p, o) && !o.skills?.includes('fantasma')); // Fantasma fora da mira
  const cx = en.length ? en.reduce((s, o) => s + o.pos[0], 0) / en.length : rnd(-A / 3, A / 3), cz = en.length ? en.reduce((s, o) => s + o.pos[2], 0) / en.length : rnd(-A / 3, A / 3);
  let ang = rnd(0, Math.PI);
  if (en.length > 1) { let sxx = 0, szz = 0, sxz = 0; for (const o of en) { const dx = o.pos[0] - cx, dz = o.pos[2] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; } ang = 0.5 * Math.atan2(2 * sxz, sxx - szz); }
  return { cx, cz, dir: [Math.cos(ang), Math.sin(ang)] };
}

// pedaco da reta que cabe dentro da arena (quadrado de meia-largura A)
function clipLine(cx, cz, d, A) {
  let t0 = -1e9, t1 = 1e9;
  for (const [p, v] of [[cx, d[0]], [cz, d[1]]]) {
    if (Math.abs(v) < 1e-6) continue;
    const a = (-A - p) / v, b = (A - p) / v;
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  return [t0, t1];
}

// true = tratou a sequencia
export function strikeUse(c, p, kind) {
  const A = c.M.arena, id = c.craftSeq = (c.craftSeq || 0) + 1;
  if (kind === 'plane') {
    const S = STREAKS.plane, L = enemyLine(c, p), d = L.dir, back = A + 30;
    if (Math.random() < 0.5) { d[0] = -d[0]; d[1] = -d[1]; }
    const h = planeClear(c.M, L.cx, L.cz, d, back, S.h);
    c.crafts.push({ id, k: 'plane', hp: S.hp, owner: p.id, team: p.team, dir: d, h, pos: [L.cx - d[0] * back, h, L.cz - d[1] * back], t: (back * 2) / S.speed, fireT: 1.2, pass: 1, c: [L.cx, L.cz], back });
    return true;
  }
  if (kind === 'train') {
    const S = STREAKS.train, L = enemyLine(c, p), d = L.dir;
    const [t0, t1] = clipLine(L.cx, L.cz, d, A - 1.5);
    const a = [L.cx + d[0] * t0, L.cz + d[1] * t0], len = t1 - t0;
    c.crafts.push({ id, k: 'train', owner: p.id, team: p.team, dir: d, a, len, s: -S.cars * S.car, warn: S.warn, pos: [a[0], 0, a[1]] });
    c.event({ k: 'trainWarn', a, b: [a[0] + d[0] * len, a[1] + d[1] * len], warn: S.warn });
    return true;
  }
  if (kind === 'bomber') {
    const S = STREAKS.bomber, L = enemyLine(c, p), back = A + 40;
    let d = L.dir;
    // segundo balao (04/11, pedido dele: so no deserto): reta paralela a do primeiro, a pelo menos BOMBER_GAP de distancia, entao nunca se tocam
    const b1 = c.blimps.find(b => b.kind === 'bomber');
    if (b1) {
      const nx = -b1.dir[1], nz = b1.dir[0], off = (L.cx - b1.pos[0]) * nx + (L.cz - b1.pos[2]) * nz, at = b1.pos[0] * nx + b1.pos[2] * nz;
      const lane = Math.abs(off) >= BOMBER_GAP && Math.abs(at + off) < A ? off : (Math.abs(at + BOMBER_GAP) < A ? 1 : -1) * BOMBER_GAP;
      d = [...b1.dir]; L.cx = nx * (at + lane); L.cz = nz * (at + lane);
    }
    c.blimps.push({ id: c.blimpSeq = (c.blimpSeq || 0) + 1, kind: 'bomber', owner: p.id, team: p.team, t: S.time, hp: S.hp, dir: d, pos: [L.cx - d[0] * back, S.h, L.cz - d[1] * back], speed: (back * 2) / S.time, dropT: 3 });
    return true;
  }
  if (kind === 'hand') {
    const S = STREAKS.hand;
    // alvos: os inimigos vivos mais perto de quem chamou (a mao vai de um em um)
    const en = [...c.players.values()].filter(o => o.alive && !o.inRing && c.enemies(p, o) && !o.skills?.includes('fantasma')).sort((x, y) => Math.hypot(x.pos[0] - p.pos[0], x.pos[2] - p.pos[2]) - Math.hypot(y.pos[0] - p.pos[0], y.pos[2] - p.pos[2])).slice(0, S.n);
    c.crafts.push({ id, k: 'hand', owner: p.id, team: p.team, targets: en.map(o => o.id), i: 0, hold: 0, wait: 0, pos: [p.pos[0], 40, p.pos[2]], t: S.life, leave: 0 });
    return true;
  }
  return false;
}

// altura da passada (04/11, pedido dele): o biplano passava dentro de casa/telhado. Varre a reta inteira numa faixa da
// largura das asas (+ folga) e voa 2,5 m acima do ponto mais alto embaixo (telhado em ponta sobe ~2,5 m acima da caixa)
function planeClear(M, cx, cz, d, back, h0) {
  const half = 6, nx = -d[1], nz = d[0];
  let top = 0;
  for (let s = -back; s <= back; s += 1.5) for (const o of [-half, 0, half]) {
    const x = cx + d[0] * s + nx * o, z = cz + d[1] * s + nz * o;
    for (const b of M.boxes) if (x >= b.min[0] - 1 && x <= b.max[0] + 1 && z >= b.min[2] - 1 && z <= b.max[2] + 1) top = Math.max(top, b.max[1] + (b.roof ? 2.5 : 0));
  }
  return Math.max(h0, top + 2.5);
}

function tickPlane(c, f, owner, dt) {
  const S = STREAKS.plane;
  f.pos = [f.pos[0] + f.dir[0] * S.speed * dt, f.h ?? S.h, f.pos[2] + f.dir[1] * S.speed * dt];
  // fim da passada: faz a curva la fora e volta pela mesma reta (looping de desenho)
  if (f.t <= 0 && f.pass < S.passes) { f.pass++; f.dir = [-f.dir[0], -f.dir[1]]; f.t = (f.back * 2) / S.speed; f.fireT = 1.5; }
  if ((f.fireT -= dt) > 0 || !owner) return;
  f.fireT = S.rate;
  // rajada na frente do nariz: puxa pra quem esta no corredor logo adiante (erra um pouco de proposito); so pega quem esta a ceu aberto
  let tx = null;
  for (const v of c.players.values()) {
    if (!v.alive || !c.enemies(owner, v) || v.skills?.includes('fantasma')) continue; // aviao nao puxa a rajada pro Fantasma
    const rx = v.pos[0] - f.pos[0], rz = v.pos[2] - f.pos[2], ahead = rx * f.dir[0] + rz * f.dir[1], lat = -rx * f.dir[1] + rz * f.dir[0];
    if (ahead > 2 && ahead < S.lead + 14 && Math.abs(lat) < S.lane && (!tx || ahead < tx.ahead)) tx = { ahead, lat, v };
  }
  const side = tx && Math.random() < 0.7 ? tx.lat + rnd(-0.8, 0.8) : rnd(-2, 2), fwd = tx ? Math.min(tx.ahead, S.lead + 6) : S.lead;
  const ix = f.pos[0] + f.dir[0] * fwd - f.dir[1] * side, iz = f.pos[2] + f.dir[1] * fwd + f.dir[0] * side;
  if (Math.abs(ix) > c.M.arena || Math.abs(iz) > c.M.arena) return;
  const gy = floorAt(c.M, ix, iz);
  c.event({ k: 'shot', id: 'plane', o: f.pos.map(r2), e: [r2(ix), r2(gy + 0.05), r2(iz)], wpn: 'minigun' });
  for (const v of c.players.values()) {
    if (!v.alive || !c.enemies(owner, v)) continue;
    if (Math.hypot(v.pos[0] - ix, v.pos[2] - iz) > S.hitR || v.pos[1] > gy + 2.5) continue;
    if (hasLOS(c.M, f.pos, [v.pos[0], v.pos[1] + 1.2, v.pos[2]])) c.damage(v, owner, S.dmg, 'plane', false);
  }
}

function tickTrain(c, f, owner, dt) {
  const S = STREAKS.train;
  if (f.warn > 0) { f.warn -= dt; return; }
  f.s += S.speed * dt;
  const front = Math.min(f.s, f.len), back = Math.max(0, f.s - S.cars * S.car);
  f.pos = [f.a[0] + f.dir[0] * front, 0, f.a[1] + f.dir[1] * front];
  if (front <= back) return;
  for (const v of c.players.values()) {
    if (!v.alive || (owner && v !== owner && !c.enemies(owner, v)) || v === owner) continue;
    const rx = v.pos[0] - f.a[0], rz = v.pos[2] - f.a[1], along = rx * f.dir[0] + rz * f.dir[1], perp = Math.abs(-rx * f.dir[1] + rz * f.dir[0]);
    if (along < back || along > front + 0.8 || perp > S.halfW) continue;
    if (v.pos[1] > floorAt(c.M, v.pos[0], v.pos[2]) + 3.2) continue; // quem esta la em cima do telhado escapa
    c.kill(v, owner || v, 'train', false);
  }
}

function tickHand(c, f, owner, dt) {
  const S = STREAKS.hand;
  if (f.leave > 0) { f.leave -= dt; f.pos = [f.pos[0], f.pos[1] + dt * 30, f.pos[2]]; return; }
  let v = c.players.get(f.targets[f.i]);
  while (f.i < f.targets.length && !(v && v.alive)) { f.i++; f.hold = 0; f.wait = 0; v = c.players.get(f.targets[f.i]); }
  if (f.i >= f.targets.length || !owner) { f.leave = 1.2; return; }
  const dx = v.pos[0] - f.pos[0], dz = v.pos[2] - f.pos[2], dh = Math.hypot(dx, dz), step = Math.min(dh, S.speed * dt);
  const wantY = v.pos[1] + (dh < 2 ? 7 : 13); // a mao e grande (1,8x): a borracha encosta na cabeca
  f.pos = [f.pos[0] + (dh ? dx / dh * step : 0), f.pos[1] + (wantY - f.pos[1]) * Math.min(1, dt * 3), f.pos[2] + (dh ? dz / dh * step : 0)];
  f.tg = v.id;
  if (dh > 1.5) return;
  // so apaga quem esta a ceu aberto: debaixo de telhado a mao espera um pouco e desiste
  if (hasLOS(c.M, [v.pos[0], v.pos[1] + 30, v.pos[2]], [v.pos[0], v.pos[1] + 1.4, v.pos[2]])) {
    f.wait = 0;
    if ((f.hold += dt) >= S.erase) { c.event({ k: 'erase', id: v.id, pos: v.pos.map(r2) }); c.kill(v, owner, 'hand', false); f.i++; f.hold = 0; }
  } else { f.hold = 0; if ((f.wait += dt) > S.wait) { f.i++; f.wait = 0; } }
}

// balao: atravessa devagar em linha reta largando bolas de fogo que viram pocas no chao (telhado segura)
export function tickBomber(c, b, dt) {
  const S = STREAKS.bomber, owner = c.players.get(b.owner);
  b.pos = [b.pos[0] + b.dir[0] * b.speed * dt, S.h, b.pos[2] + b.dir[1] * b.speed * dt];
  if ((b.dropT -= dt) > 0 || !owner) return;
  b.dropT = S.drop;
  for (let i = 0; i < 2; i++) {
    const x = b.pos[0] + rnd(-S.spread, S.spread), z = b.pos[2] + rnd(-S.spread, S.spread);
    if (Math.abs(x) > c.M.arena - 1 || Math.abs(z) > c.M.arena - 1) continue;
    const y = floorAt(c.M, x, z);
    c.fires.push({ id: c.fireSeq = (c.fireSeq || 0) + 1, owner: b.owner, pos: [x, y, z], t: S.fire, tick: 0.6 });
    c.event({ k: 'fireDrop', o: b.pos.map(r2), at: [r2(x), r2(y), r2(z)] });
  }
}

export function strikeTick(c, dt) {
  abxTick(c, dt);
  for (const f of c.crafts) {
    const owner = c.players.get(f.owner);
    if (f.t !== undefined) f.t -= dt;
    if (f.k === 'plane') tickPlane(c, f, owner, dt);
    else if (f.k === 'train') tickTrain(c, f, owner, dt);
    else if (f.k === 'hand') tickHand(c, f, owner, dt);
  }
  c.crafts = c.crafts.filter(f => c.players.has(f.owner) && (f.k === 'train' ? f.s < f.len + STREAKS.train.cars * STREAKS.train.car : f.k === 'hand' ? !(f.leave < 0) && f.t > 0 : f.t > 0 || f.pass < STREAKS.plane.passes));
  const S = STREAKS.bomber;
  for (const f of c.fires) {
    f.t -= dt;
    if ((f.tick -= dt) > 0) continue;
    f.tick = 0.5;
    const owner = c.players.get(f.owner);
    for (const v of c.players.values()) {
      if (!v.alive || (owner && !c.enemies(owner, v))) continue;
      if (Math.hypot(v.pos[0] - f.pos[0], v.pos[2] - f.pos[2]) < S.burnR && Math.abs(v.pos[1] - f.pos[1]) < 1.6) c.damage(v, owner || v, S.burn, 'bomber', false);
    }
  }
  c.fires = c.fires.filter(f => f.t > 0);
}

export function strikeSnap(c) {
  return {
    crafts: c.crafts.map(f => ({ id: f.id, k: f.k, hp: f.k === 'plane' ? Math.max(0, Math.round(f.hp / STREAKS.plane.hp * 100)) : undefined, team: f.team, owner: f.owner, pos: f.pos.map(r2), dir: f.dir?.map(r2), warn: f.warn > 0 ? r2(f.warn) : undefined, tg: f.tg, a: f.a?.map(r2), len: f.len ? r2(f.len) : undefined })),
    fires: c.fires.map(f => [f.id, ...f.pos.map(r2), r2(f.t)]),
    abx: c.boxes.map(b => ({ id: b.id, pos: b.pos.map(r2), team: b.team, owner: b.owner })),
  };
}
