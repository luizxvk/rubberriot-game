// Escolta (31/10): vermelho empurra o Bonde da Tinta pelos trilhos ate a garagem do outro lado; azul segura.
// O bonde anda com atacante dentro do circulo em volta dele e NENHUM defensor (defensor dentro = parado,
// contestado). Sem atacante por ESCORT.backAfter s, o bonde volta devagar (nunca passa do ultimo ponto de
// controle). Cada ponto de controle soma tempo. Chegou na garagem = vermelho vence; tempo acabou = azul vence.
// Mesmo codigo no solo e no multiplayer. O mapa traz o trilho (M.track = [[x,z],...]) e os pontos (M.checks,
// fracao 0..1 do caminho).
import { floorAt, standable } from './nav.js';

export const ESCORT = { time: 210, cpBonus: 60, r: 4.2, speed: 1.15, perExtra: 0.18, maxMul: 1.6, back: 0.45, backAfter: 9, overtime: 25 };

// trilho em trechos: comprimento acumulado de cada ponto
export function trackOf(M) {
  if (M._trk) return M._trk;
  const pts = M.track, acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return (M._trk = { pts, acc, len: acc[acc.length - 1] });
}
// ponto (x, z) e direcao a `d` metros do comeco
export function trackAt(M, d) {
  const { pts, acc, len } = trackOf(M);
  d = Math.max(0, Math.min(len, d));
  let i = 1; while (i < acc.length - 1 && acc[i] < d) i++;
  const a = pts[i - 1], b = pts[i], k = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
  return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) };
}

export function escInit(c) {
  const T = trackOf(c.M);
  c.esc = { d: 0, len: T.len, cps: c.M.checks.map(f => f * T.len), next: 0, state: 'wait', idleT: 0, red: 0, blue: 0, ot: false };
  c.time = ESCORT.time;
}
export const escPos = (c) => { const p = trackAt(c.M, c.esc.d); return [p.x, floorAt(c.M, p.x, p.z), p.z]; };

export function escTick(c, dt) {
  const E = c.esc, at = escPos(c);
  let red = 0, blue = 0;
  for (const p of c.players.values()) {
    if (!p.alive) continue;
    if ((p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 > ESCORT.r * ESCORT.r || Math.abs(p.pos[1] - at[1]) > 3) continue;
    if (p.team === 'red') red++; else if (p.team === 'blue') blue++;
  }
  E.red = red; E.blue = blue;
  const floor = E.next > 0 ? E.cps[E.next - 1] : 0;
  let state;
  if (red && blue) { state = 'contest'; E.idleT = 0; }
  else if (red) {
    state = 'push'; E.idleT = 0;
    E.d = Math.min(E.len, E.d + dt * ESCORT.speed * Math.min(ESCORT.maxMul, 1 + (red - 1) * ESCORT.perExtra));
    // atacante empurrando ganha ponto (placar e XP de objetivo)
    for (const p of c.players.values()) if (p.alive && p.team === 'red' && (p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 <= ESCORT.r * ESCORT.r) p.score += dt * 4;
  } else {
    E.idleT += dt;
    state = E.idleT > ESCORT.backAfter && E.d > floor ? 'back' : 'wait';
    if (state === 'back') E.d = Math.max(floor, E.d - dt * ESCORT.back);
  }
  if (state !== E.state) { E.state = state; c.event({ k: 'esc', state }); }
  // ponto de controle: mais tempo pro ataque, e os dois times passam a nascer mais pra frente
  while (E.next < E.cps.length && E.d >= E.cps[E.next]) {
    E.next++; c.time += ESCORT.cpBonus;
    c.event({ k: 'escCp', n: E.next, of: E.cps.length, bonus: ESCORT.cpBonus });
  }
  c.teamScore.red = Math.floor(E.d / E.len * 100); c.teamScore.blue = 0;
  if (E.d >= E.len) { c.end('red'); return; }
  // prorrogacao: tempo acabou com atacante no bonde, segue enquanto tiver gente encostada (ate overtime s)
  if (c.time <= 0.05 && red && !E.ot) { E.ot = true; c.time = ESCORT.overtime; c.event({ k: 'escOt' }); }
}
// o tempo acabou: a defesa segurou
export const escTimeout = () => 'blue';

// nascimento (31/10, pedidos dele): o ataque nasce ATRAS, antes do ultimo ponto conquistado (no comeco, atras
// da largada), e vem empurrando; a defesa nasce SEMPRE na base dela, na garagem do outro lado (no ponto A ficava
// desequilibrado), e corre ate o bonde pra parar ele. Defesa nunca nasce a menos de 22 m do bonde.
// Antes a defesa nascia so 30-38 m de trilho a frente, que no zigue-zague caia colado no bonde.
const DEF_MIN = 22;
function trackOrBack(M, d) { // antes do comeco do trilho: segue reto pra tras do primeiro trecho
  if (d >= 0) return trackAt(M, d);
  const p = trackAt(M, 0);
  return { x: p.x - Math.sin(p.yaw) * -d, z: p.z - Math.cos(p.yaw) * -d, yaw: p.yaw };
}
export function escSpawn(c, team) {
  const E = c.esc, base = E.next > 0 ? E.cps[E.next - 1] : 0, tram = trackAt(c.M, E.d);
  const d = team === 'red' ? base - 12 : E.len - 6;
  const far = (x, z) => team === 'red' || Math.hypot(x - tram.x, z - tram.z) >= DEF_MIN;
  // de lado do trilho (perpendicular), espalhado; ponto dentro de casa/caixote e sorteado de novo
  for (let k = 0; k < 24; k++) {
    const p = trackOrBack(c.M, Math.min(E.len, d + (Math.random() - 0.5) * 10)), side = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * (k < 12 ? 6 : 3));
    const x = p.x + Math.cos(p.yaw) * side, z = p.z - Math.sin(p.yaw) * side;
    if (standable(c.M, x, z) && far(x, z)) return [x, z];
  }
  // sem ponto longe o bastante (bonde chegando na garagem): o ponto de pe mais longe do bonde que der
  let best = null, bd = -1;
  for (let k = 0; k < 40; k++) {
    const p = trackOrBack(c.M, Math.min(E.len, d + (Math.random() - 0.5) * 16)), side = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 9);
    const x = p.x + Math.cos(p.yaw) * side, z = p.z - Math.sin(p.yaw) * side, dd = Math.hypot(x - tram.x, z - tram.z);
    if (standable(c.M, x, z) && dd > bd) { bd = dd; best = [x, z]; }
  }
  if (best) return best;
  const p = trackAt(c.M, team === 'red' ? 0 : E.len); return [p.x, p.z];
}
// bot: os dois times vao pro bonde (ataque cola nele; defesa para um pouco a frente)
export function escGoal(c, p) {
  const E = c.esc;
  const d = p.team === 'red' ? E.d : Math.min(E.len, E.d + 2 + (p.id.charCodeAt(p.id.length - 1) % 5));
  const q = trackAt(c.M, d), j = ((p.id.charCodeAt(0) + p.id.length) % 7 - 3) * 0.9;
  return [q.x + Math.cos(q.yaw) * j, 0, q.z - Math.sin(q.yaw) * j];
}
export function escSnap(c) {
  const E = c.esc, r1 = (v) => Math.round(v * 10) / 10;
  return { d: r1(E.d), len: r1(E.len), cps: E.cps.map(r1), next: E.next, state: E.state, red: E.red, blue: E.blue, ot: E.ot };
}
