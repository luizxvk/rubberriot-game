// Carro da Captura de Bandeira (04/11, pedido dele): um calhambeque conversivel por time, 4 lugares (motorista +
// 3 passageiros). Um pouco mais rapido que correr a pe. O motorista nao atira; os passageiros sim. Bots usam, mas
// nunca mais de CAR.botMax por carro, e saem na hora se um jogador quiser o lugar (prioridade sempre do jogador).
// A fisica (carStep) e a mesma no servidor (bot dirigindo / carro solto) e no cliente de quem dirige.
import { moveBody, hasLOS } from './map.js';
import { floorAt } from './nav.js';

export const CAR = {
  modes: ['ctf'],
  speed: 12.6, rev: 5, accel: 9, brake: 16, drag: 5, turn: 1.9, // correr a pe = 9,6 m/s
  r: 1.1, h: 1.4, enter: 3.6, botMax: 2,
  // vida (04/11, pedido dele): a tiro ele explode e mata todo mundo dentro e quem estiver perto (so escapa quem desce e
  // corre). Volta pra garagem depois de respawn s. half = meia caixa do tiro (x, y, z)
  hp: 700, blast: 7, respawn: 15, half: [1.1, 0.85, 1.95],
  // lugares (x, y, z no carro; frente = -z). y = onde fica o pe do boneco sentado (o corpo afunda SEAT_POSE.sink)
  // medidos no modelo (04/11): laterais em ~1,3 m, volante (1,9 m) a direita do centro em z ~0 -> motorista atras dele
  seats: [[0, 0.55, 0.62], [0.52, 0.55, 0.62], [-0.42, 0.75, 1.4], [0.42, 0.75, 1.4]], // 04/11: volante no centro (motorista atras dele), carona ao lado, 2 na traseira
};

// pos do lugar i no mundo (o carro gira em Y como o boneco: frente = (-sin, -cos))
export function seatPos(car, i) {
  const [ox, oy, oz] = CAR.seats[i], c = Math.cos(car.yaw), s = Math.sin(car.yaw);
  return [car.pos[0] + ox * c + oz * s, car.pos[1] + oy, car.pos[2] - ox * s + oz * c];
}
// lado de fora pra descer (ao lado do lugar, 1,6 m pra fora)
export function exitPos(car, i) {
  const [ox, , oz] = CAR.seats[i], c = Math.cos(car.yaw), s = Math.sin(car.yaw), x = (Math.sign(ox) || -1) * 1.7;
  return [car.pos[0] + x * c + oz * s, car.pos[1] + 0.1, car.pos[2] - x * s + oz * c];
}

// um passo de fisica: throttle -1..1 (frente/re), steer -1..1 (direita = +)
export function carStep(M, car, throttle, steer, dt) {
  const C = CAR;
  if (throttle > 0.05) car.spd = car.spd < 0 ? Math.min(0, car.spd + C.brake * dt) : Math.min(C.speed * throttle, car.spd + C.accel * dt);
  else if (throttle < -0.05) car.spd = car.spd > 0 ? Math.max(0, car.spd - C.brake * dt) : Math.max(-C.rev, car.spd - C.accel * 0.6 * dt);
  else car.spd = car.spd > 0 ? Math.max(0, car.spd - C.drag * dt) : Math.min(0, car.spd + C.drag * dt);
  car.steer = steer;
  car.yaw -= steer * C.turn * dt * Math.max(-1, Math.min(1, car.spd / 4)); // parado nao gira; de re gira ao contrario
  const vel = [-Math.sin(car.yaw) * car.spd, car.vy || 0, -Math.cos(car.yaw) * car.spd];
  vel[1] -= 24 * dt;
  const x0 = car.pos[0], z0 = car.pos[2], dyn = M.dyn;
  if (dyn) M.dyn = dyn.filter(b => b.car !== car.id); // o carro nao bate na propria caixa
  const ground = moveBody(M, car.pos, vel, dt, C.r, C.h);
  M.dyn = dyn;
  car.vy = ground ? 0 : vel[1];
  const moved = Math.hypot(car.pos[0] - x0, car.pos[2] - z0), want = Math.abs(car.spd) * dt;
  if (want > 0.02 && moved < want * 0.4) car.spd *= 0.35; // bateu: perde o embalo
  if (car.pos[1] < -30) car.reset = true;
}

// nascimento: perto da base de cada time, de frente pro meio, num lugar livre
export function carsInit(c) {
  const M = c.M;
  if (!CAR.modes.includes(c.mode) || !c.blitz || !M.flagBase) return []; // 04/11: so no Blitz Bandeira
  const out = [];
  for (const team of ['red', 'blue']) {
    const b = M.flagBase[team], len = Math.hypot(b[0], b[2]) || 1, d = [-b[0] / len, -b[2] / len], side = [d[1], -d[0]];
    let spot = null;
    const tries = [[9, 4], [9, -4], [12, 0], [6, 6], [6, -6], [14, 5], [14, -5], [4, 0]];
    for (let f = 2; f <= 24; f += 3) for (const s of [0, 4, -4, 8, -8, 12, -12]) tries.push([f, s]); // mapa apertado (Estaleiro): procura mais longe
    for (const [f, s] of tries) {
      const x = b[0] + d[0] * f + side[0] * s, z = b[2] + d[1] * f + side[1] * s, y = floorAt(M, x, z);
      if (!Number.isFinite(y) || Math.abs(y - b[1]) > 1.2) continue;
      if (!hasLOS(M, [b[0], b[1] + 1, b[2]], [x, y + 1, z])) continue;
      const probe = [x, y + 0.05, z], v = [0, 0, 0];
      moveBody(M, probe, v, 0.016, CAR.r, CAR.h);
      if (Math.hypot(probe[0] - x, probe[2] - z) > 0.05) continue; // empurrado = encostado em parede
      spot = [x, y, z]; break;
    }
    if (!spot) continue;
    const yaw = Math.atan2(-d[0], -d[1]);
    if (M.arena >= 100) { // Canyon Poeira (04/11): 2 por time, o segundo 6 m do lado
      const x2 = spot[0] + side[0] * 6, z2 = spot[2] + side[1] * 6, y2 = floorAt(M, x2, z2);
      if (Number.isFinite(y2) && Math.abs(y2 - spot[1]) < 1.2) out.push({ id: team === 'red' ? 3 : 4, team, home: [x2, y2, z2], homeYaw: yaw, pos: [x2, y2, z2], yaw, spd: 0, vy: 0, steer: 0, seats: [null, null, null, null], idleT: 0, stuckT: 0, hp: CAR.hp, deadT: 0 });
    }
    out.push({ id: team === 'red' ? 1 : 2, team, home: [...spot], homeYaw: yaw, pos: [...spot], yaw, spd: 0, vy: 0, steer: 0, seats: [null, null, null, null], idleT: 0, stuckT: 0, hp: CAR.hp, deadT: 0 });
  }
  return out;
}

const humanDriver = (c, car) => { const d = car.seats[0] && c.players.get(car.seats[0]); return !!d && !d.bot; };
const botsIn = (c, car) => car.seats.filter(id => id && c.players.get(id)?.bot).length;

// entrar: motorista se livre; jogador toma o volante de bot (o bot passa pra tras ou desce) e, cheio, tira um bot
export function carEnter(c, p) {
  if (p.car || !p.alive || p.down > 0) return false;
  const live = (c.cars || []).filter(k => !(k.deadT > 0));
  let car = null, bd = CAR.enter * CAR.enter;
  for (const k of live) { if (k.team !== p.team) continue; const d = (k.pos[0] - p.pos[0]) ** 2 + (k.pos[2] - p.pos[2]) ** 2; if (d < bd && Math.abs(k.pos[1] - p.pos[1]) < 2) { bd = d; car = k; } }
  if (!car) return false;
  if (p.bot && (botsIn(c, car) >= CAR.botMax || !humanDriver(c, car))) return false; // bot so vai de carona (04/11: bot nao dirige mais)
  const free = () => car.seats.findIndex((id, i) => i > 0 && !id);
  let seat = car.seats[0] || p.bot ? -1 : 0;
  if (seat < 0 && !p.bot && c.players.get(car.seats[0])?.bot) { // volante de bot: o bot vai pra tras (ou desce)
    const b = c.players.get(car.seats[0]), f = free();
    if (f > 0) { car.seats[f] = b.id; b.seat = f; } else carExit(c, b);
    car.seats[0] = null; seat = 0;
  }
  if (seat < 0) seat = free();
  if (seat < 0 && !p.bot) { // cheio: o primeiro bot passageiro desce
    const bi = car.seats.findIndex((id, i) => i > 0 && c.players.get(id)?.bot);
    if (bi > 0) { carExit(c, c.players.get(car.seats[bi])); seat = bi; }
  }
  if (seat < 0) return false;
  car.seats[seat] = p.id; p.car = car.id; p.seat = seat;
  p.pos = seatPos(car, seat);
  c.event({ k: 'car', act: 'in', id: p.id, car: car.id, seat });
  return true;
}

export function carExit(c, p) {
  const car = p && (c.cars || []).find(k => k.id === p.car);
  if (!car) { if (p) { p.car = null; p.seat = null; } return; }
  const i = car.seats.indexOf(p.id);
  if (i >= 0) car.seats[i] = null;
  if (p.alive) { const e = exitPos(car, i >= 0 ? i : 0), y = floorAt(c.M, e[0], e[2]); p.pos = [e[0], Number.isFinite(y) && Math.abs(y - car.pos[1]) < 2.5 ? y : car.pos[1], e[2]]; }
  p.car = null; p.seat = null; p.mvSkip = (c.clock || 0) + 1; // desceu do carro: o pulo pra porta nao conta como teleporte
  if (p.bot && p.ai) { p.ai.path = null; p.ai.carCd = 6; }
  c.event({ k: 'car', act: 'out', id: p.id, car: car.id });
}

// tick do servidor: limpa lugares, carro de bot anda, o solto para, todo mundo sentado vai junto
export function carsTick(c, dt) {
  for (const car of c.cars || []) {
    if (car.deadT > 0) { car.deadT -= dt; if (car.deadT <= 0) Object.assign(car, { pos: [...car.home], yaw: car.homeYaw, spd: 0, vy: 0, idleT: 0, hp: CAR.hp }); continue; }
    botsShootCar(c, car, dt);
    car.seats = car.seats.map(id => { const p = id && c.players.get(id); if (!p || !p.alive || p.down > 0 || p.car !== car.id) { if (p && p.car === car.id) { p.car = null; p.seat = null; } return null; } return id; });
    let drv = car.seats[0] && c.players.get(car.seats[0]);
    // sem motorista: com gente no carro, os bots esperam e descem; so bots, um deles passa pro volante
    const people = car.seats.some(id => id && !c.players.get(id)?.bot), bots = car.seats.filter((id, i) => i > 0 && id);
    if (drv?.bot) { carExit(c, drv); drv = null; } // bot nao dirige (04/11)
    car.noDrvT = !drv && bots.length ? (car.noDrvT || 0) + dt : 0;
    if (car.noDrvT > 1.5) { car.noDrvT = 0; for (const id of bots) { const q = c.players.get(id); if (q?.bot) carExit(c, q); } } // sem motorista: os bots descem
    void people;
    if (!drv) carStep(c.M, car, 0, 0, dt);
    else runOver(c, car, drv);
    // carro largado longe muito tempo (ou caiu do mapa): volta pra garagem
    const empty = car.seats.every(id => !id);
    car.idleT = empty && Math.hypot(car.pos[0] - car.home[0], car.pos[2] - car.home[2]) > 6 ? car.idleT + dt : 0;
    if (car.reset || car.idleT > 45) { for (const id of car.seats) if (id) carExit(c, c.players.get(id)); Object.assign(car, { pos: [...car.home], yaw: car.homeYaw, spd: 0, vy: 0, idleT: 0, reset: false }); }
    for (let i = 0; i < 4; i++) { const p = car.seats[i] && c.players.get(car.seats[i]); if (!p) continue; if (p.bot) { p.pos = seatPos(car, i); p.anim = i === 0 ? 'drive' : 'seat'; } }
  }
  if (c.botsTick !== false) botsBoard(c, dt);
}

// raio contra a caixa do carro (girada no yaw): distancia ou null
export function rayCar(o, d, car, max) {
  const [hx, hy, hz] = CAR.half, c = Math.cos(car.yaw), s = Math.sin(car.yaw);
  const ox = o[0] - car.pos[0], oy = o[1] - (car.pos[1] + 0.9), oz = o[2] - car.pos[2];
  const lo = [ox * c - oz * s, oy, ox * s + oz * c], ld = [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c];
  let t0 = 0, t1 = max;
  for (const [k, h] of [[0, hx], [1, hy], [2, hz]]) {
    if (Math.abs(ld[k]) < 1e-6) { if (Math.abs(lo[k]) > h) return null; continue; }
    let a = (-h - lo[k]) / ld[k], b = (h - lo[k]) / ld[k]; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
  }
  return t0;
}

// dano no carro (tiro, explosao, bot); zerou = explode
export function carDamage(c, car, dmg, attacker) {
  if (car.deadT > 0 || dmg <= 0) return;
  car.hp -= dmg;
  if (car.hp > 0) return;
  const at = [car.pos[0], car.pos[1] + 0.9, car.pos[2]], who = [...car.seats];
  car.deadT = CAR.respawn;
  for (const id of who) { const p = id && c.players.get(id); if (p) { p.car = null; p.seat = null; } }
  car.seats = [null, null, null, null];
  c.event({ k: 'carBoom', id: car.id, pos: at, by: attacker?.id });
  for (const p of [...c.players.values()]) { // dentro: morre; fora, perto: morre tambem (so escapa quem correu)
    if (!p.alive) continue;
    const inside = who.includes(p.id), d = Math.hypot(p.pos[0] - at[0], p.pos[2] - at[2]);
    if (inside || (d < CAR.blast && Math.abs(p.pos[1] - car.pos[1]) < 3)) c.kill(p, attacker && attacker !== p ? attacker : null, 'carx', false); // explosao tem nome proprio: 'car' e atropelamento (motorista via "atropelado" ao morrer no carro)
  }
}

// atropelamento (04/11, pedido dele): carro andando rapido passa por cima de inimigo = abate do motorista
function runOver(c, car, drv) {
  if (Math.abs(car.spd) < 4.5) return;
  const [hx, , hz] = CAR.half, co = Math.cos(car.yaw), si = Math.sin(car.yaw);
  for (const v of c.players.values()) {
    // 04/11 (hotfix): lado de quem dirige, nao o da garagem (carro roubado atropelava o proprio time e poupava o dono); dentro de carro nunca e atropelado
    if (v === drv || !v.alive || v.car || !c.enemies(drv, v) || v.inRing) continue;
    const dx = v.pos[0] - car.pos[0], dz = v.pos[2] - car.pos[2];
    if (Math.abs(v.pos[1] - car.pos[1]) > 1.6) continue;
    const lx = dx * co - dz * si, lz = dx * si + dz * co;
    if (Math.abs(lx) < hx + 0.45 && Math.abs(lz) < hz + 0.45) { c.event({ k: 'runOver', id: v.id, pos: [...v.pos] }); c.kill(v, drv, 'car', false); }
  }
}

// bot inimigo perto que ve o carro atira nele (como na sentinela)
function botsShootCar(c, car, dt) {
  if ((car.botShotT = (car.botShotT || 0) - dt) > 0) return;
  car.botShotT = 0.4;
  const at = [car.pos[0], car.pos[1] + 0.9, car.pos[2]];
  for (const v of c.players.values()) {
    if (!v.bot || !v.alive || v.team === car.team || v.car) continue;
    if ((v.pos[0] - at[0]) ** 2 + (v.pos[2] - at[2]) ** 2 > 28 * 28) continue;
    const eye = [v.pos[0], v.pos[1] + 1.5, v.pos[2]];
    if (!hasLOS(c.M, eye, at)) continue;
    c.event({ k: 'shot', id: v.id, o: eye, e: at, wpn: v.wpn });
    carDamage(c, car, 9, v);
    return;
  }
}

// bot dirigindo: aponta pro objetivo dele; travado da re; chegou perto ou travou muito = todo mundo bot desce
function botDrive(c, car, p, dt) {
  const g = p.ai?.goal || c.botGoal?.(p);
  if (!g) { carStep(c.M, car, 0, 0, dt); return; }
  const dx = g[0] - car.pos[0], dz = g[2] - car.pos[2], dist = Math.hypot(dx, dz);
  if (car.backT > 0) { car.backT -= dt; carStep(c.M, car, -1, car.backSteer, dt); return; }
  let diff = Math.atan2(-dx, -dz) - car.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const steer = Math.max(-1, Math.min(1, -diff * 2.2));
  carStep(c.M, car, dist < 14 ? 0.45 : Math.abs(diff) > 1.1 ? 0.45 : 1, steer, dt);
  car.stuckT = Math.abs(car.spd) < 1.2 ? (car.stuckT || 0) + dt : 0;
  if (car.stuckT > 1.4) { car.backT = 1.1; car.backSteer = -steer; car.stuckN = (car.stuckN || 0) + 1; car.stuckT = 0; }
  if (dist < 9 || car.stuckN > 3) { car.stuckN = 0; for (const id of [...car.seats]) { const q = id && c.players.get(id); if (q?.bot) carExit(c, q); } }
}

// bots embarcam de vez em quando: so quem esta perto, com o objetivo longe, e sem passar do teto de bots no carro
function botsBoard(c, dt) {
  for (const p of c.players.values()) {
    if (!p.bot || !p.alive || p.car || p.down > 0 || !p.ai) continue;
    if ((p.ai.carCd = (p.ai.carCd || 0) - dt) > 0) continue;
    p.ai.carCd = 1;
    const car = (c.cars || []).find(k => k.team === p.team && (k.pos[0] - p.pos[0]) ** 2 + (k.pos[2] - p.pos[2]) ** 2 < 100); // 10 m: o bot vai ate ele
    if (!car || !humanDriver(c, car) || botsIn(c, car) >= CAR.botMax || Math.random() > 0.5) continue; // carona so com jogador no volante
    carEnter(c, p);
  }
}

// dados que vao no snapshot
export const carsSnap = (c) => (c.cars?.length ? c.cars.filter(k => !(k.deadT > 0)).map(k => ({ hp: Math.max(0, Math.round(k.hp / CAR.hp * 100)), id: k.id, team: k.team, pos: k.pos.map(v => Math.round(v * 100) / 100), yaw: Math.round(k.yaw * 1000) / 1000, spd: Math.round(k.spd * 10) / 10, st: Math.round((k.steer || 0) * 10) / 10, seats: k.seats })) : undefined);
