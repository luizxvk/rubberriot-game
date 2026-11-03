// Roube o Cofre (03/11, ideia dele). Melhor de 4 rodadas: cada time ataca 2 (vermelho nas 2 primeiras).
// Ataque segura a area do cofre ate arrombar (defensor dentro pausa), pega as bolsas uma por vez e leva ate a
// van de fuga; cada entrega da +30 s. Meta: $5.000 na rodada. Tempo acabou = a defesa leva a rodada.
// Geografia fixa: a van fica na base do SUL (onde nasce o vermelho) e o cofre no lado NORTE; quem ataca nasce
// sempre perto da van, seja de que cor for. Bolsa no chao: atacante pega de novo, defensor encosta = volta.
import { HEIST } from './weapons.js';
import { BOMB_SITES } from './map.js';
import { floorAt, standable } from './nav.js';

export const HEIST_MAPS = Object.keys(BOMB_SITES);
const r1 = (v) => Math.round(v * 10) / 10;
const other = (t) => (t === 'red' ? 'blue' : 'red');

// cofre no ponto A da bomba (chao de pe garantido); van na base do sul
export function heistPoints(M) {
  const s = BOMB_SITES[M.id] || { A: [M.zones[0].pos[0], M.zones[0].pos[2]] };
  // van no meio de onde o ataque nasce (na ponta do mapa ficava longe demais: quem carregava morria no caminho)
  // (o ponto de nascimento mais perto do centro deles: e chao de verdade; a media caia em cima de tanque na Refinaria)
  const vx = s.A[0], vz = s.A[1], R = M.spawns.red, Z = (p) => p[2] ?? p[1], ax = R.reduce((t, p) => t + p[0], 0) / R.length, az = R.reduce((t, p) => t + Z(p), 0) / R.length;
  const sp = R.reduce((b, p) => (Math.hypot(p[0] - ax, Z(p) - az) < Math.hypot(b[0] - ax, Z(b) - az) ? p : b), R[0]);
  return { vault: clear(M, vx, vz, 2.4), van: clear(M, sp[0], Z(sp), 3.2) };
}

// lugar livre mais perto do ponto: nenhuma caixa do mapa a menos de r (03/11: no Estaleiro o cofre encostava num caixote
// e quem entrava no vao ficava preso entre os dois; a van ficava meio em cima de degrau). Chao plano embaixo. Anda em aneis de 0,5 m ate 6 m; sem lugar livre, fica no ponto.
function clear(M, x, z, r) {
  const free = (cx, cz) => { const y = floorAt(M, cx, cz); if ([[-r, -r], [r, -r], [-r, r], [r, r]].some(([a, b]) => Math.abs(floorAt(M, cx + a, cz + b) - y) > 0.05)) return false; return !M.boxes.some(b => b.max[1] > y + 0.3 && b.min[1] < y + 3.5 && b.max[0] > cx - r && b.min[0] < cx + r && b.max[2] > cz - r && b.min[2] < cz + r); };
  for (let d = 0; d <= 6; d += 0.5) for (let k = 0; k < (d ? 16 : 1); k++) {
    const cx = x + Math.sin(k / 16 * Math.PI * 2) * d, cz = z + Math.cos(k / 16 * Math.PI * 2) * d;
    if (free(cx, cz)) return [r1(cx), r1(floorAt(M, cx, cz)), r1(cz)];
  }
  return [x, floorAt(M, x, z), z];
}

// cofre e van solidos (03/11, ele atravessava os dois): caixas giradas iguais ao bonde (M.dyn). Medidas dos modelos
// do Tripo na escala do heistview (cofre 3,8 m de altura; van 5,2 m de comprimento). Giro = o mesmo da cena.
export const heistFace = (H) => Math.atan2(H.van[0] - H.vault[0], H.van[2] - H.vault[2]);
export function heistBoxes(H) {
  const f = heistFace(H);
  return [
    { x: H.vault[0], y: H.vault[1], z: H.vault[2], yaw: f, hw: 1.55, hl: 1.5, h: 3.8 },
    { x: H.van[0], y: H.van[1], z: H.van[2], yaw: f + Math.PI, hw: 1.4, hl: 2.6, h: 3.0 },
  ];
}

const newBags = () => Array.from({ length: HEIST.bags }, (_, i) => ({ id: i, state: 'vault', carrier: null, pos: null, dropT: 0 }));

export function heistInit(c) {
  const P = heistPoints(c.M);
  c.heist = { ...P, round: 1, atk: 'red', crack: 0, open: false, state: 'idle', bags: newBags(), money: 0, total: { red: 0, blue: 0 }, wins: { red: 0, blue: 0 }, roundT: 0 };
  c.time = HEIST.time;
  c.teamScore.red = 0; c.teamScore.blue = 0;
}

// nasce: ataque perto da van (sul), defesa no lado do cofre (norte)
export function heistSpawns(c, team) {
  const H = c.heist, S = c.M.spawns;
  // (fora do ponto da van: ela fica em cima de um nascimento e o boneco nascia dentro dela)
  if (team === H.atk) { const out = S.red.filter(p => Math.hypot(p[0] - H.van[0], (p[2] ?? p[1]) - H.van[2]) > 4); return out.length ? out : S.red; }
  // defesa nao nasce colada no cofre (na Vila nascia a 13 m e quem pegava bolsa levava tiro de quem acabou de renascer)
  const far = S.blue.filter(p => Math.hypot(p[0] - H.vault[0], (p[2] ?? p[1]) - H.vault[2]) >= HEIST.defSpawnMin);
  return far.length ? far : S.blue;
}
export const heistRespawn = (c, team) => (team === c.heist.atk ? HEIST.atkRespawn : HEIST.defRespawn);
export const carryingBag = (c, p) => !!c.heist?.bags.some(b => b.state === 'carried' && b.carrier === p.id);

function nextRound(c, winner, why) {
  const H = c.heist;
  H.wins[winner]++; H.total[H.atk] += H.money;
  c.teamScore.red = H.wins.red; c.teamScore.blue = H.wins.blue;
  c.event({ k: 'heistRound', n: H.round, win: winner, why, money: H.money, wins: { ...H.wins } });
  const done = H.wins.red >= 3 || H.wins.blue >= 3 || H.round >= HEIST.rounds;
  if (done) {
    const w = H.wins.red !== H.wins.blue ? (H.wins.red > H.wins.blue ? 'red' : 'blue') : H.total.red !== H.total.blue ? (H.total.red > H.total.blue ? 'red' : 'blue') : 'empate';
    c.end(w); return;
  }
  // proxima rodada: na metade troca quem ataca; todo mundo renasce do lado certo e espera 5 s
  H.round++;
  H.atk = H.round <= HEIST.rounds / 2 ? 'red' : 'blue';
  Object.assign(H, { crack: 0, open: false, state: 'idle', bags: newBags(), money: 0, roundT: 0 });
  c.time = HEIST.time;
  for (const p of c.players.values()) c.spawn(p);
  c.freezeT = 5;
  c.event({ k: 'heistNew', n: H.round, atk: H.atk });
}

// tempo acabou: a defesa leva a rodada
export function heistTimeout(c) { nextRound(c, other(c.heist.atk), 'time'); return null; }

export function heistTick(c, dt) {
  const H = c.heist, def = other(H.atk), near = (p, at, r) => (p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 < r * r && Math.abs(p.pos[1] - at[1]) < 2.5;
  H.roundT += dt;
  const alive = [...c.players.values()].filter(p => p.alive && !(p.down > 0));
  // 1) arrombar
  if (!H.open) {
    const a = alive.filter(p => p.team === H.atk && near(p, H.vault, HEIST.crackR)).length, d = alive.filter(p => p.team === def && near(p, H.vault, HEIST.crackR)).length;
    const state = a && d ? 'contest' : a ? 'crack' : 'idle';
    if (state !== H.state) { H.state = state; c.event({ k: 'heistCrack', state }); }
    if (state === 'crack') {
      H.crack = Math.min(HEIST.crack, H.crack + dt * Math.min(2, 1 + (a - 1) * 0.5));
      for (const p of alive) if (p.team === H.atk && near(p, H.vault, HEIST.crackR)) p.score += dt * 5;
      if (H.crack >= HEIST.crack) { H.open = true; H.state = 'open'; c.event({ k: 'heistOpen' }); }
    }
    return;
  }
  // 2) bolsas
  for (const b of H.bags) {
    if (b.state === 'carried') {
      const p = c.players.get(b.carrier);
      if (!p || !p.alive || p.down > 0 || p.team !== H.atk) { b.state = 'dropped'; b.carrier = null; b.dropT = HEIST.dropBack; if (p) b.pos = [...p.pos]; c.event({ k: 'heistBag', act: 'drop', pos: b.pos }); continue; }
      b.pos = [...p.pos];
      if (near(p, H.van, HEIST.vanR)) {
        b.state = 'banked'; b.carrier = null; H.money += HEIST.bagValue; c.time += HEIST.bankBonus; p.score += 300;
        c.event({ k: 'heistBag', act: 'bank', id: p.id, money: H.money, bonus: HEIST.bankBonus });
        if (H.money >= HEIST.quota) { nextRound(c, H.atk, 'quota'); return; }
      }
    } else if (b.state === 'dropped') {
      const back = () => { b.state = 'vault'; b.pos = null; b.carrier = null; };
      // defensor precisa ficar em cima um tico pra devolver (encostar e sumir deixava o ataque sem chance de recuperar)
      const d = alive.find(p => p.team === def && near(p, b.pos, HEIST.touchR));
      if (d) { if ((b.retT = (b.retT || 0) + dt) >= HEIST.returnT) { back(); b.retT = 0; d.score += 150; c.event({ k: 'heistBag', act: 'return', id: d.id }); continue; } } else b.retT = 0;
      const a = alive.find(p => p.team === H.atk && near(p, b.pos, HEIST.touchR) && !carryingBag(c, p));
      if (a) { b.state = 'carried'; b.carrier = a.id; b.retT = 0; c.event({ k: 'heistBag', act: 'take', id: a.id }); continue; }
      if ((b.dropT -= dt) <= 0) { back(); c.event({ k: 'heistBag', act: 'return' }); }
    }
  }
  // pegar no cofre aberto: atacante colado no cofre sem bolsa leva a proxima
  for (const p of alive) {
    if (p.team !== H.atk || !near(p, H.vault, HEIST.takeR) || carryingBag(c, p)) continue;
    const b = H.bags.find(x => x.state === 'vault');
    if (!b) break;
    b.state = 'carried'; b.carrier = p.id; b.pos = [...p.pos];
    c.event({ k: 'heistBag', act: 'take', id: p.id });
  }
  // sem bolsa nenhuma pra roubar e a meta nao bateu: a defesa segurou
  if (H.bags.every(b => b.state === 'banked') && H.money < HEIST.quota) nextRound(c, def, 'empty');
}

// bot: ataque arromba, quem tem bolsa corre pra van, os outros pegam bolsa caida ou escoltam; defesa segura o cofre e caca quem tem bolsa
export function heistGoal(c, p) {
  const H = c.heist, role = p.id.charCodeAt(p.id.length - 1) % 3;
  const jit = (at) => { const j = ((p.id.charCodeAt(0) + p.id.length) % 7 - 3) * 0.8; return [at[0] + j, at[1], at[2] - j * 0.6]; };
  const carried = H.bags.filter(b => b.state === 'carried'), dropped = H.bags.filter(b => b.state === 'dropped');
  if (p.team === H.atk) {
    if (carryingBag(c, p)) return H.van;
    if (dropped.length) return dropped[0].pos;
    if (H.open && role !== 2 && carried.length) return jit(carried[0].pos); // 2/3 escoltam quem carrega
    return jit(H.vault);
  }
  if (dropped.length && role !== 2) return dropped[0].pos;
  if (carried.length && role !== 1) return carried[0].pos;
  // defesa espalhada (toda em cima do cofre o ataque nunca arrombava): 1/3 guarda, 1/3 no meio do caminho, 1/3 caca
  if (role === 1) return jit(H.vault);
  if (role === 2) {
    // meio do caminho: no Banco Ferradura cai bem dentro do duto (bot passa agachado desde 03/11 e ficava acampado
    // la dentro). Ponto de vigia tem que ser de pe: anda pro lado ate achar
    let mid = jit([(H.vault[0] + H.van[0]) / 2, 0, (H.vault[2] + H.van[2]) / 2]);
    for (const dx of [0, 4, -4, 7, -7, 10, -10]) if (standable(c.M, mid[0] + dx, mid[2])) { mid = [mid[0] + dx, floorAt(c.M, mid[0] + dx, mid[2]), mid[2]]; break; }
    return mid;
  }
  return null; // caca: o bot vai atras de quem estiver vendo
}

export function heistSnap(c) {
  const H = c.heist;
  return { round: H.round, atk: H.atk, crack: r1(H.crack / HEIST.crack), open: H.open, state: H.state, money: H.money, quota: HEIST.quota, wins: H.wins, vault: H.vault.map(r1), van: H.van.map(r1), bags: H.bags.map(b => [b.id, b.state === 'vault' ? 0 : b.state === 'carried' ? 1 : b.state === 'dropped' ? 2 : 3, b.carrier, b.pos ? b.pos.map(r1) : null, b.retT ? r1(b.retT / HEIST.returnT) : 0]) };
}
