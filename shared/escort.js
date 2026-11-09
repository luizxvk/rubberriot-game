// Escolta em 2 rounds (01/11, igual ao Overwatch 2): no 1o o vermelho ataca e o jogo guarda ate onde ele levou o
// bonde (e em quanto tempo, se chegou). No 2o os lados trocam: o azul ataca e vence na hora que passar a marca do
// vermelho; se o tempo acabar antes, o vermelho vence. Os dois chegaram na garagem: vence quem chegou mais rapido.
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
  c.esc = { d: 0, len: T.len, cps: c.M.checks.map(f => f * T.len), next: 0, state: 'wait', idleT: 0, red: 0, blue: 0, ot: false, round: 1, atk: 'red', used: 0, r1: null };
  c.time = ESCORT.time;
}
const defOf = (E) => (E.atk === 'red' ? 'blue' : 'red');
// fim do round 1: guarda a marca, troca os lados e todo mundo renasce do lado novo (5 s parados pra se arrumar)
function escSwap(c) {
  const E = c.esc;
  E.r1 = { d: E.d, done: E.d >= E.len, used: E.used };
  Object.assign(E, { round: 2, atk: 'blue', d: 0, next: 0, state: 'wait', idleT: 0, ot: false, used: 0, passed: false });
  c.time = ESCORT.time;
  for (const p of c.players.values()) c.spawn(p); // todo mundo renasce na hora do lado novo (sem tela de morte)
  c.freezeT = 5;
  c.event({ k: 'escRound', n: 2, atk: 'blue', mark: Math.round(E.r1.d / E.len * 100), done: E.r1.done });
}
// fim de round: devolve o vencedor (ou null se ainda vai pro round 2)
function escFinish(c, reached) {
  const E = c.esc;
  if (E.round === 1) { escSwap(c); return null; }
  const r1 = E.r1;
  if (reached) return !r1.done || E.used < r1.used ? 'blue' : E.used === r1.used ? 'empate' : 'red';
  return E.d > r1.d ? 'blue' : Math.abs(E.d - r1.d) < 0.05 && !r1.done ? 'empate' : 'red';
}
// caixa do bonde pro mapa (bala e boneco nao atravessam): mesma medida do modelo (2,36 x 5,4 x 3 m)
// altura do trilho: rampa e tabuleiro de viaduto (a grade do chao ignora piso suspenso e o bonde passava por baixo)
export function trackY(M, x, z) { let y = 0; for (const b of M.boxes) if ((b.deck || b.kind === 'step') && x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2]) y = Math.max(y, b.max[1]); return y; }
export function trainBox(M, d) { const p = trackAt(M, d), y = trackY(M, p.x, p.z); return { x: p.x, y, z: p.z, yaw: p.yaw, hw: 1.18, hl: 2.7, h: 3.0 }; }
export const escPos = (c) => { const p = trackAt(c.M, c.esc.d); return [p.x, trackY(c.M, p.x, p.z), p.z]; };

export function escTick(c, dt) {
  const E = c.esc, at = escPos(c);
  let red = 0, blue = 0;
  for (const p of c.players.values()) {
    if (!p.alive) continue;
    if ((p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 > ESCORT.r * ESCORT.r || Math.abs(p.pos[1] - at[1]) > 1.8) continue; // 1,8 m: quem esta embaixo do viaduto nao empurra nem contesta (02/11)
    if (p.team === 'red') red++; else if (p.team === 'blue') blue++;
  }
  E.red = red; E.blue = blue;
  E.used += dt;
  const atkN = E.atk === 'red' ? red : blue, defN = E.atk === 'red' ? blue : red;
  const floor = E.next > 0 ? E.cps[E.next - 1] : 0;
  let state;
  if (atkN && defN) { state = 'contest'; E.idleT = 0; }
  else if (atkN) {
    state = 'push'; E.idleT = 0;
    E.d = Math.min(E.len, E.d + dt * ESCORT.speed * Math.min(ESCORT.maxMul, 1 + (atkN - 1) * ESCORT.perExtra));
    // atacante empurrando ganha ponto (placar e XP de objetivo)
    for (const p of c.players.values()) if (p.alive && p.team === E.atk && (p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 <= ESCORT.r * ESCORT.r) p.score += dt * 4;
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
  // placar: % do trilho de cada time (o do round 1 fica guardado)
  const pct = Math.floor(E.d / E.len * 100);
  if (E.round === 1) { c.teamScore.red = pct; c.teamScore.blue = 0; } else { c.teamScore.red = Math.floor(E.r1.d / E.len * 100); c.teamScore.blue = pct; }
  // round 2: passou a marca do round 1 (que nao chegou na garagem) = esta vencendo; segue ate garagem ou tempo
  if (E.round === 2 && !E.r1.done && E.d > E.r1.d && !E.passed) { E.passed = true; c.event({ k: 'escPass' }); } // passou a marca: so avisa, o round vai ate o fim (02/11, pedido dele)
  if (E.d >= E.len) { const w = escFinish(c, true); if (w) c.end(w); return; }
  // prorrogacao: tempo acabou com atacante no bonde, segue enquanto tiver gente encostada (ate overtime s)
  if (c.time <= 0.05 && atkN && !E.ot) { E.ot = true; c.time = ESCORT.overtime; c.event({ k: 'escOt' }); }
}
// o tempo acabou: round 1 vira o round 2; no round 2 compara com a marca
export const escTimeout = (c) => escFinish(c, false);

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
// 08/11 (pedido dele: nascendo no muro e em cima do tunel): a grade do nav conta topo de muro e de tunel como chao. Ponto valido = com folga do
// corpo em volta, sem caixa no volume da pessoa, na altura do trilho ali perto e sem beirada alta do lado
const clearOf = (M, x, y, z, r = 0.55, h = 1.75) => !M.boxes.some(b => x + r > b.min[0] && x - r < b.max[0] && z + r > b.min[2] && z - r < b.max[2] && y + 0.15 < b.max[1] && y + h > b.min[1]);
function okSpot(M, x, z, d) {
  if (!standable(M, x, z)) return false;
  const y = floorAt(M, x, z); let lo = Infinity;
  for (let s = -14; s <= 14; s += 2) { const p = trackAt(M, d + s); lo = Math.min(lo, floorAt(M, p.x, p.z)); }
  if (y > lo + 2 || !clearOf(M, x, y, z)) return false;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, fx = x + Math.cos(a) * 2.4, fz = z + Math.sin(a) * 2.4; if (y - floorAt(M, fx, fz) > 1.6) return false; }
  return true;
}
export function escSpawn(c, team) {
  const E = c.esc, base = E.next > 0 ? E.cps[E.next - 1] : 0, tram = trackAt(c.M, E.d);
  const atk = team === E.atk;
  const d = atk ? base - 12 : E.len - 6;
  const far = (x, z) => atk || Math.hypot(x - tram.x, z - tram.z) >= DEF_MIN;
  // de lado do trilho (perpendicular), espalhado; ponto dentro de casa/caixote e sorteado de novo
  for (let k = 0; k < 24; k++) {
    const p = trackOrBack(c.M, Math.min(E.len, d + (Math.random() - 0.5) * 10)), side = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * (k < 12 ? 6 : 3));
    const x = p.x + Math.cos(p.yaw) * side, z = p.z - Math.sin(p.yaw) * side;
    if (okSpot(c.M, x, z, p.d ?? d) && far(x, z)) return [x, z];
  }
  // sem ponto longe o bastante (bonde chegando na garagem): o ponto de pe mais longe do bonde que der
  let best = null, bd = -1;
  for (let k = 0; k < 40; k++) {
    const p = trackOrBack(c.M, Math.min(E.len, d + (Math.random() - 0.5) * 16)), side = (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 9);
    const x = p.x + Math.cos(p.yaw) * side, z = p.z - Math.sin(p.yaw) * side, dd = Math.hypot(x - tram.x, z - tram.z);
    if (okSpot(c.M, x, z, p.d ?? d) && dd > bd) { bd = dd; best = [x, z]; }
  }
  if (best) return best;
  const p = trackAt(c.M, atk ? 0 : E.len); return [p.x, p.z];
}
// bot: os dois times vao pro bonde (ataque cola nele; defesa para um pouco a frente)
export function escGoal(c, p) {
  const E = c.esc;
  const d = p.team === E.atk ? E.d : Math.min(E.len, E.d + 2 + (p.id.charCodeAt(p.id.length - 1) % 5));
  const q = trackAt(c.M, d), j = ((p.id.charCodeAt(0) + p.id.length) % 7 - 3) * 0.9;
  return [q.x + Math.cos(q.yaw) * j, 0, q.z - Math.sin(q.yaw) * j];
}
export function escSnap(c) {
  const E = c.esc, r1 = (v) => Math.round(v * 10) / 10;
  return { d: r1(E.d), len: r1(E.len), cps: E.cps.map(r1), next: E.next, state: E.state, red: E.red, blue: E.blue, ot: E.ot, round: E.round, atk: E.atk, mark: E.r1 ? r1(E.r1.d) : null };
}
