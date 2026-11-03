// Noite dos Borroes (03/11, previa aprovada por ele): PvE cooperativo de 1 a 4 (bots aliados completam) no
// Estudio Tinteiro. Ondas sem fim, cada uma mais forte; entre elas 15 s pra gastar os pontos (armas pintadas na
// parede, portas que abrem salas novas, Maquina de Leite). Caiu = parceiro levanta (mesma bomba de bicicleta da
// dupla). Todo mundo no chao = fim, o placar e a onda alcancada. Chefoes: Projecionista na onda 5 (15, 25...) e
// Rei Tinteiro na 10 (20, 30...).
// Os viloes sao jogadores bot do time azul com `mob` (tipo), sem renascer: somem 2 s depois de cair.
import { MOBS, BOR } from './mobs.js';
import { BR, WEAPONS, BODY_TRAITS, wpnOfBody } from './weapons.js';
import { moveBody, hasLOS } from './map.js';
import { floorAt } from './nav.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2;
const isUp = (p) => p && p.alive && !(p.down > 0);
const r2 = (v) => Math.round(v * 100) / 100;

export function borInit(c) {
  const B = c.M.bor;
  c.bor = { wave: 0, state: 'break', t: BOR.firstBreak, left: 0, trickleT: 0, open: new Set(['hub']), doors: new Set(B ? B.doors.map(d => d.id) : []), puddles: [], blots: [], seq: 0, boss: null, milkT: {}, drops: [], fx: {}, dropN: 0, box: !c.borArt && B?.box?.length ? { at: 0, spin: 0, show: 0, uses: 0, by: null, wpn: null } : null };
  c.time = 0;
  for (const p of c.players.values()) p.cash = 500;
}

// portas fechadas viram caixa solida (bala e boneco param). Mesma caixa no servidor e no cliente
// (03/11: so o servidor tinha, e o jogador, que anda no cliente, atravessava a porta fechada)
export function borDoorBoxes(M, closed) {
  const B = M?.bor; if (!B || !closed) return null;
  const has = closed instanceof Set ? (id) => closed.has(id) : (id) => closed.includes(id);
  return B.doors.filter(d => has(d.id)).map(d => ({ x: d.x, y: 0, z: d.z, yaw: 0, hw: d.alongZ ? 0.5 : 1.5, hl: d.alongZ ? 1.5 : 0.5, h: 4.2 }));
}
export function borBoxes(c) {
  return c.bor ? borDoorBoxes(c.M, c.bor.doors) : null;
}

// tamanho do time pra conta da onda: bot aliado vale 0,6 de gente
const crew = (c) => Math.max(1, [...c.players.values()].reduce((n, p) => n + (p.mob || p.team !== 'red' ? 0 : p.bot ? 0.6 : 1), 0));
const aliveCap = (c) => Math.min(BOR.maxAlive, Math.round(4 + 3 * crew(c)));

// quantos e quais viloes a onda tem (escala com a onda e com a gente na sala)
function waveList(c, n) {
  const count = Math.round((4 + n * 1.8) * (0.6 + crew(c) * 0.4));
  const list = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    let k = 'borrao';
    if (n >= 2 && r < 0.22) k = 'rabisco';
    else if (n >= 3 && r < 0.36) k = 'mola';
    else if (n >= 4 && r < 0.48) k = 'cuspidor';
    else if (n >= 6 && r < 0.56) k = 'gordao';
    list.push(k);
  }
  if (n % 3 === 0) for (let i = 0; i < 1 + Math.floor(n / 9); i++) list.splice(Math.floor(list.length / 2), 0, 'cartola');
  if (n % 10 === 5) list.unshift('projecionista');
  if (n % 10 === 0) list.unshift('reiTinteiro');
  return list;
}

function startWave(c) {
  const b = c.bor;
  b.wave++; b.state = 'wave'; b.queue = waveList(c, b.wave); b.trickleT = 1;
  // quem caiu na onda passada volta agora (com pistola) e quem esta caido levanta
  for (const p of c.players.values()) {
    if (p.mob) continue;
    if (!p.alive) { p.respawnT = 0; c.spawn(p); }
    else if (p.down > 0) { p.down = 0; p.reviveT = 0; p.hp = 50; }
  }
  c.event({ k: 'borWave', n: b.wave, boss: b.queue[0] && MOBS[b.queue[0]].boss ? b.queue[0] : null });
}

function spawnMob(c, kind) {
  const b = c.bor, B = c.M.bor, S = MOBS[kind];
  // poca de uma sala aberta, longe de quem joga (mas nao longe demais); chefao sai no meio da sala grande
  const people = [...c.players.values()].filter(p => !p.mob && p.alive);
  const pools = B.pools.filter(q => b.open.has(q.room));
  let at = null;
  if (S.boss) at = [0, 0];
  else {
    const ok = pools.filter(q => people.every(p => (p.pos[0] - q.pos[0]) ** 2 + (p.pos[2] - q.pos[1]) ** 2 > 36));
    const from = ok.length ? ok : pools;
    at = from[Math.floor(Math.random() * from.length)].pos;
  }
  const x = at[0] + rnd(-0.8, 0.8), z = at[1] + rnd(-0.8, 0.8);
  const people0 = Math.max(1, people.filter(p => !p.bot).length);
  const hp = Math.round(S.hp * (S.boss ? (0.6 + people0 * 0.4) * (1 + (b.wave - 5) * 0.06) : 1 + (b.wave - 1) * 0.11));
  const id = 'm' + (++b.seq);
  const p = {
    id, name: kind, bot: true, mob: kind, team: 'blue', hp, maxHp: hp, alive: true, respawnT: Infinity,
    pos: [x, floorAt(c.M, x, z), z], vel: [0, 0, 0], yaw: 0, pitch: 0, anim: 'run', wpn: 'fists', lastWpn: 'fists',
    kills: 0, deaths: 0, score: 0, gunLvl: 0, streak: 0, ready: [], owned: new Set(['fists']), nades: { frag: 0, flash: 0 }, budget: 0, los: null,
    ai: { hitT: rnd(0.3, 0.8), think: 0, target: null, goal: null, path: null, stuckT: 0, last: [x, 0, z], zig: rnd(0, 6), leapT: rnd(2, 4), atkT: 3, phase: 1, sumT: BOR.summon, rainT: 2 },
    spawnedIn: true, protUntil: 0, armor: 0,
  };
  c.players.set(id, p);
  if (S.boss) { b.boss = id; c.event({ k: 'borBoss', id, kind }); }
}

// ---------- tick da noite ----------
export function borTick(c, dt) {
  const b = c.bor, B = c.M.bor;
  if (!b || !B) return;
  // viloes caidos somem depois de 2 s
  for (const p of [...c.players.values()]) if (p.mob && !p.alive && (p.goneT = (p.goneT || 0) + dt) > 2) { c.players.delete(p.id); if (b.boss === p.id) b.boss = null; }
  const mobs = [...c.players.values()].filter(p => p.mob && p.alive);
  if (b.state === 'break') {
    b.t -= dt;
    if (b.t <= 0) startWave(c);
  } else {
    // vai soltando a fila aos poucos (no maximo BOR.maxAlive de pe)
    b.trickleT -= dt;
    if (b.queue.length && b.trickleT <= 0 && mobs.length < aliveCap(c)) { spawnMob(c, b.queue.shift()); b.trickleT = BOR.trickle * rnd(0.6, 1.3); }
    if (!b.queue.length && !mobs.length) {
      b.state = 'break'; b.t = BOR.breakT; c.event({ k: 'borClear', n: b.wave });
      if (c.borArt) {
        // Arte-Final: passou da onda escolhida = vitoria; senao todo mundo de pe recarrega o que carrega
        if (b.wave >= c.limit && !c.over) { c.teamScore.red = b.wave; c.end('red'); return; }
        for (const p of c.players.values()) if (!p.mob && p.alive) { for (const w of p.owned) if (w !== 'melee') c.event({ k: 'give', id: p.id, wpn: w, refill: true }); if (p.bot) c.botReload?.(p, true); }
      }
    }
  }
  if (b.box?.spin > 0 && (b.box.spin -= dt) <= 0) boxDone(c);
  if (b.box?.show > 0) b.box.show -= dt;
  dropTick(c, dt);
  // cartola: borroes perto dele correm mais
  const tops = mobs.filter(p => p.mob === 'cartola');
  for (const p of mobs) p.boost = tops.some(o => o !== p && d2(o.pos, p.pos) < MOBS.cartola.aura ** 2) ? 1.35 : 1;
  for (const p of mobs) if (!(c.freezeT > 0) && !(b.fx.quadro > 0)) mobTick(c, p, dt); // Quadro Congelado: vilao parado
  // um nao entra no outro (antes viravam uma pilha so no mesmo ponto)
  for (let i = 0; i < mobs.length; i++) for (let j = i + 1; j < mobs.length; j++) {
    const a = mobs[i], o = mobs[j], dx = o.pos[0] - a.pos[0], dz = o.pos[2] - a.pos[2], rr = MOBS[a.mob].rad + MOBS[o.mob].rad;
    const dd = dx * dx + dz * dz;
    if (dd >= rr * rr || Math.abs(o.pos[1] - a.pos[1]) > 1.5) continue;
    const d = Math.sqrt(dd) || 0.01, push = (rr - d) * 0.5, nx = dd ? dx / d : Math.random() - 0.5, nz = dd ? dz / d : Math.random() - 0.5;
    const ka = MOBS[a.mob].boss ? 0.1 : 1, ko = MOBS[o.mob].boss ? 0.1 : 1; // chefao quase nao e empurrado
    moveBody(c.M, a.pos, [-nx * push * ka * 30, 0, -nz * push * ka * 30], 1 / 30, Math.min(MOBS[a.mob].rad, 0.9), 1.2);
    moveBody(c.M, o.pos, [nx * push * ko * 30, 0, nz * push * ko * 30], 1 / 30, Math.min(MOBS[o.mob].rad, 0.9), 1.2);
  }
  // perdido: 25 s longe (> 22 m) de todo mundo de pe = volta por uma poca perto do time
  const ups = [...c.players.values()].filter(o => !o.mob && isUp(o));
  for (const p of mobs) {
    if (MOBS[p.mob].boss || !ups.length) continue;
    const near = ups.some(o => d2(o.pos, p.pos) < 22 * 22);
    p.ai.lostT = near ? 0 : (p.ai.lostT || 0) + dt;
    if (p.ai.lostT < 25) continue;
    p.ai.lostT = 0;
    const pools = B.pools.filter(q => b.open.has(q.room));
    const o = ups[Math.floor(Math.random() * ups.length)];
    const q = pools.filter(q => (q.pos[0] - o.pos[0]) ** 2 + (q.pos[1] - o.pos[2]) ** 2 > 36).sort((x, y) => ((x.pos[0] - o.pos[0]) ** 2 + (x.pos[1] - o.pos[2]) ** 2) - ((y.pos[0] - o.pos[0]) ** 2 + (y.pos[1] - o.pos[2]) ** 2))[0];
    if (!q) continue;
    p.pos = [q.pos[0], floorAt(c.M, q.pos[0], q.pos[1]), q.pos[1]]; p.vel = [0, 0, 0]; p.ai.path = null;
    c.event({ k: 'borPop', id: p.id, pos: p.pos }); // sai da poca de novo (o cliente pula o boneco sem deslizar)
  }
  tickShots(c, dt);
  for (const q of b.puddles) q.t -= dt;
  b.puddles = b.puddles.filter(q => q.t > 0);
  // congelado pelo facho / lento na poca (os bots aliados; a gente o cliente mesmo segura)
  for (const p of c.players.values()) { if (p.frozenT > 0) p.frozenT -= dt; }
  // vida volta sozinha (gente de pe, um tempo sem levar dano)
  const now = c.clock || 0;
  for (const p of c.players.values()) if (!p.mob && isUp(p) && p.hp < (p.maxHp || 100) && now - (p.hurtAt ?? -99) >= BOR.regen.after) p.hp = Math.min(p.maxHp || 100, p.hp + BOR.regen.rate * dt);
  downTick(c, dt);
  // compras: segurar usar perto da parede / porta / maquina (uma por aperto)
  for (const p of c.players.values()) {
    if (p.mob || !p.alive || p.down > 0) continue;
    if (!p.using) { p.buyLatch = false; continue; }
    if (p.buyLatch) continue;
    p.buyLatch = true;
    tryBuy(c, p);
  }
  // fim: ninguem do time de pe
  const team = [...c.players.values()].filter(p => !p.mob && p.team === 'red');
  if (team.length && !team.some(isUp) && !c.over) { c.teamScore.blue = b.wave; c.end('blue'); }
  c.teamScore.red = b.wave;
}

function tryBuy(c, p) {
  const b = c.bor, B = c.M.bor, near = (pos, r) => (p.pos[0] - pos[0]) ** 2 + (p.pos[2] - pos[1]) ** 2 < r * r;
  const pay = (n) => { if ((p.cash || 0) < n) { c.send(p.id, { t: 'ev', k: 'borPoor', need: n }); return false; } p.cash -= n; return true; };
  for (const d of B.doors) {
    if (!b.doors.has(d.id) || !near([d.x, d.z], BOR.doorR)) continue;
    if (!pay(d.price)) return;
    b.doors.delete(d.id); b.open.add(d.id);
    c.event({ k: 'borDoor', id: d.id, by: p.id });
    return;
  }
  for (const s of c.borArt || p.bot ? [] : B.stations) {
    if (!b.open.has(s.room) || !near(s.pos, BOR.buyR)) continue;
    const has = p.owned.has(s.wpn), price = has ? Math.round(s.price / 2) : s.price; // ja tem: compra so municao
    if (!pay(price)) return;
    p.owned.add(s.wpn); p.wpn = s.wpn;
    if (p.bot) c.botReload?.(p, true);
    c.event({ k: 'give', id: p.id, wpn: s.wpn, force: true, refill: has });
    c.event({ k: 'borBuy', id: p.id, wpn: s.wpn, ammo: has });
    return;
  }
  for (const [i, m] of B.milk.entries()) {
    if (!b.open.has(m.room) || !near(m.pos, BOR.buyR)) continue;
    const now = c.clock || 0;
    if (now < (b.milkT[p.id + i] || 0)) { c.send(p.id, { t: 'ev', k: 'borWait', s: Math.ceil(b.milkT[p.id + i] - now) }); return; }
    if (!pay(BOR.milk)) return;
    b.milkT[p.id + i] = now + BOR.milkCd;
    p.hp = p.maxHp || 100; p.armor = 50;
    c.event({ k: 'borMilk', id: p.id });
    return;
  }
  // Caixa de Surpresas do Nanquim (so no Rascunho): gira 3 s e sai uma arma sorteada
  const X = b.box, spot = X && B.box[X.at];
  if (spot && !p.bot && b.open.has(spot.room) && near(spot.pos, BOR.buyR) && !(X.spin > 0) && !(X.show > 0)) {
    if (!pay(BOR.box.price)) return;
    X.spin = BOR.box.spin; X.by = p.id; X.uses++;
    c.event({ k: 'borBox', id: p.id, at: X.at });
  }
}

// ---------- drops (03/11): vilao caido as vezes larga um poder; quem encosta pega pro time todo ----------
// peso = chance relativa no sorteio
const DROPS = { dobro: 5, refil: 5, borracha: 2, quadro: 3, lapis: 3, intervalo: 2, chave: 1 };
function maybeDrop(c, v) {
  const b = c.bor, D = BOR.drop;
  if (b.nuking || MOBS[v.mob].boss) { if (MOBS[v.mob].boss) spawnDrop(c, v.pos, 'refil'); return; } // chefao sempre larga o Refil
  if (b.dropWave !== b.wave) { b.dropWave = b.wave; b.dropN = 0; }
  if (b.dropN >= D.perWave || Math.random() > D.chance) return;
  b.dropN++;
  const pool = Object.entries(DROPS).filter(([k]) => k !== 'chave' || b.doors.size), tot = pool.reduce((s, [, n]) => s + n, 0);
  let r = Math.random() * tot, k = pool[0][0];
  for (const [id, n] of pool) { if ((r -= n) < 0) { k = id; break; } }
  spawnDrop(c, v.pos, k);
}
function spawnDrop(c, pos, k) {
  const b = c.bor, at = [r2(pos[0]), floorAt(c.M, pos[0], pos[2]), r2(pos[2])];
  b.drops.push({ id: ++b.seq, k, pos: at, t: BOR.drop.life });
  c.event({ k: 'borDrop', d: k, pos: at });
}
function dropTick(c, dt) {
  const b = c.bor;
  for (const k in b.fx) if (b.fx[k] > 0) { b.fx[k] -= dt; if (b.fx[k] <= 0) { delete b.fx[k]; c.event({ k: 'borPowerEnd', d: k }); } }
  const ups = [...c.players.values()].filter(p => !p.mob && isUp(p));
  for (const d of b.drops) {
    d.t -= dt;
    const p = ups.find(p => d2(p.pos, d.pos) < BOR.drop.r ** 2 && Math.abs(p.pos[1] - d.pos[1]) < 2);
    if (p) { d.t = 0; power(c, d.k, p); }
  }
  b.drops = b.drops.filter(d => d.t > 0);
}
function power(c, k, by) {
  const b = c.bor, D = BOR.drop, team = [...c.players.values()].filter(p => !p.mob);
  if (D.dur[k]) b.fx[k] = D.dur[k];
  if (k === 'refil') for (const p of team) if (p.alive) { for (const w of p.owned) if (w !== 'melee') c.event({ k: 'give', id: p.id, wpn: w, refill: true }); p.nades = { frag: Math.max(p.nades?.frag || 0, 2), flash: Math.max(p.nades?.flash || 0, 2) }; if (p.bot) c.botReload?.(p, true); }
  if (k === 'borracha') { // apaga todo vilao comum de pe; cada um rende os pontos dele pra quem pegou
    // sem autor no abate (03/11): antes contava cada um como abate de faca de quem pegou (desafio de lamina, XP e carimbo em rajada)
    b.nuking = true;
    for (const m of [...c.players.values()]) if (m.mob && m.alive && !MOBS[m.mob].boss) { by.cash = (by.cash || 0) + MOBS[m.mob].pts * (b.fx.dobro > 0 ? 2 : 1); c.kill(m, null, 'melee', false); }
    b.nuking = false;
    for (const p of team) p.cash = (p.cash || 0) + D.nukeCash;
  }
  if (k === 'intervalo') for (const p of team) if (p.alive) { if (p.down > 0) { p.down = 0; p.reviveT = 0; c.event({ k: 'revive', id: p.id, by: by.id, pos: p.pos }); } p.hp = p.maxHp || 100; }
  if (k === 'chave') { const d = c.M.bor.doors.filter(d => b.doors.has(d.id)).sort((x, y) => x.price - y.price)[0]; if (d) { b.doors.delete(d.id); b.open.add(d.id); c.event({ k: 'borDoor', id: d.id, by: by.id }); } }
  c.event({ k: 'borPower', d: k, by: by.id, s: D.dur[k] || 0 });
}

// sorteio por MODELO (03/11, pedido dele: mais arma na caixa): todo modelo de arma de fogo menos a Estalo
// (todo mundo ja tem), mais a Metralhadora e a Bazuca raras. [categoria, modelo, peso]
const BOX_POOL = [
  ...Object.keys(BODY_TRAITS).filter(b => !b.startsWith('melee') && b !== 'pistol_1').map(b => [wpnOfBody(b), b, b.startsWith('pistol') ? 1 : 2]),
  ['minigun', null, 2], ['rpg', null, 2],
];
function boxDone(c) {
  const b = c.bor, X = b.box, p = c.players.get(X.by), B = c.M.bor;
  // a mola sai rindo: devolve os pontos e a caixa pula pra outra sala (so depois de algumas usadas)
  if (X.uses >= BOR.box.minUses && Math.random() < BOR.box.laugh && B.box.length > 1) {
    if (p) p.cash += BOR.box.price;
    const was = X.at; do X.at = Math.floor(Math.random() * B.box.length); while (X.at === was);
    X.uses = 0; X.show = 1.5; X.wpn = 'laugh';
    c.event({ k: 'borBoxMove', id: X.by, at: X.at, from: was });
    return;
  }
  const pool = BOX_POOL.filter(([w]) => WEAPONS[w]), tot = pool.reduce((s, [, , n]) => s + n, 0);
  let r = Math.random() * tot, pick = pool[0];
  for (const e of pool) { if ((r -= e[2]) < 0) { pick = e; break; } }
  const [wpn, body] = pick;
  X.wpn = wpn; X.body = body; X.show = 1.5;
  if (!p || !p.alive || p.mob) return;
  const has = p.owned.has(wpn);
  p.owned.add(wpn); p.wpn = wpn;
  if (p.bot) c.botReload?.(p, true);
  c.event({ k: 'give', id: p.id, wpn, force: true, refill: has });
  c.event({ k: 'borBoxGot', id: p.id, wpn, body });
}

// dano em vilao rende ponto pra quem bateu; abate rende o valor da ficha
export function borHit(c, v, a, dmg) {
  if (!c.bor || !v.mob || !a || a.mob) return dmg;
  if (c.bor.fx.lapis > 0 && !MOBS[v.mob].boss) dmg = Math.max(dmg, v.hp + 1); // Lapis Afiado: um tiro apaga
  a.cash = (a.cash || 0) + Math.min(dmg, Math.max(0, v.hp)) * BOR.hitCash * (c.bor.fx.dobro > 0 ? 2 : 1);
  return dmg;
}
export function borKilled(c, v, a) {
  if (!c.bor) return;
  if (v.mob) {
    if (a && !a.mob) a.cash = (a.cash || 0) + MOBS[v.mob].pts * (c.bor.fx.dobro > 0 ? 2 : 1);
    if (v.mob === 'gordao') addPuddle(c, v.pos, MOBS.gordao.puddle, 7); // estoura numa poca grande
    maybeDrop(c, v);
    return;
  }
  v.respawnT = Infinity; // gente so volta na onda seguinte
}
// gente que zera a vida: cai (se alguem do time esta de pe pra levantar); senao sai de vez
export function borDown(c, v, a) {
  if (!c.bor || v.mob || v.down > 0) return false;
  const mate = [...c.players.values()].some(o => o !== v && !o.mob && o.team === v.team && isUp(o));
  if (!mate) return false;
  v.down = BR.duo.down; v.hp = BR.duo.downHp; v.reviveT = 0; v.burn = null; v.using = false;
  v.downBy = a && a !== v ? a.id : null;
  c.event({ k: 'down', id: v.id, a: v.downBy, wpn: 'melee', pos: v.pos });
  return true;
}
function downTick(c, dt) {
  const D = BR.duo;
  for (const p of c.players.values()) {
    if (p.mob || !p.alive || !(p.down > 0)) continue;
    const helper = [...c.players.values()].find(m => m !== p && !m.mob && isUp(m) && (m.using || m.bot) && d2(m.pos, p.pos) < D.reviveR ** 2 && Math.abs(m.pos[1] - p.pos[1]) < 1.6);
    if (helper) {
      if (!(p.reviveT > 0)) c.event({ k: 'pump', id: p.id, by: helper.id });
      p.reviveT = (p.reviveT || 0) + dt;
      if (p.reviveT >= D.revive) { p.down = 0; p.reviveT = 0; p.hp = D.reviveHp; c.event({ k: 'revive', id: p.id, by: helper.id, pos: p.pos }); }
      continue;
    }
    if (p.reviveT > 0) p.reviveT = Math.max(0, p.reviveT - dt * 2);
    p.down -= dt;
    if (p.down <= 0) c.kill(p, c.players.get(p.downBy) || null, 'melee', false);
  }
}
// bot aliado: levanta quem caiu
export function borRescue(c, p) {
  if (!c.bor || p.mob) return null;
  let best = null, bd = 60 * 60;
  for (const o of c.players.values()) if (o !== p && !o.mob && o.alive && o.down > 0) { const d = d2(o.pos, p.pos); if (d < bd) { bd = d; best = o; } }
  return best ? [...best.pos] : null;
}
// bot aliado na pausa: abre a porta mais barata se sobra ponto. Arma nao compra (pedido dele 03/11): no Rascunho o
// bot fica so com a Estalo; no Arte-Final a parede nem tem arma (cada um com o Arsenal)
export function borBotShop(c, p) {
  const b = c.bor, B = c.M.bor;
  p.using = false;
  if (!b || !B || p.mob || b.state !== 'break' || b.t < 1.5) return null;
  const cash = p.cash || 0;
  let goal = null;
  {
    const d = B.doors.filter(d => b.doors.has(d.id) && d.price + 400 <= cash).sort((x, y) => x.price - y.price)[0];
    if (d) goal = [d.x + (d.alongZ ? -Math.sign(d.x) * 1.2 : 0), d.z + (d.alongZ ? 0 : -Math.sign(d.z) * 1.2)];
  }
  if (!goal) return null;
  if ((p.pos[0] - goal[0]) ** 2 + (p.pos[2] - goal[1]) ** 2 < 1.8 * 1.8) p.using = true; // chegou: aperta usar (tryBuy faz o resto)
  return [goal[0], floorAt(c.M, goal[0], goal[1]), goal[1]];
}

function addPuddle(c, pos, r, t) { c.bor.puddles.push({ id: ++c.bor.seq, pos: [r2(pos[0]), r2(pos[1]), r2(pos[2])], r, t }); }

// ---------- viloes ----------
function mobTick(c, p, dt) {
  const S = MOBS[p.mob], ai = p.ai, M = c.M;
  ai.think -= dt;
  if (ai.think <= 0) {
    ai.think = 0.4;
    let best = null, bd = Infinity;
    for (const o of c.players.values()) {
      if (o.mob || !isUp(o)) continue;
      const d = d2(o.pos, p.pos); if (d < bd) { bd = d; best = o; }
    }
    ai.target = best;
  }
  const t = ai.target && isUp(ai.target) ? ai.target : null;
  let move = null, speed = S.speed * (p.boost || 1);
  if (p.mob === 'reiTinteiro' && ai.phase === 3) speed *= 1.5;
  if (t) {
    const dx = t.pos[0] - p.pos[0], dz = t.pos[2] - p.pos[2], d = Math.hypot(dx, dz) || 1;
    p.yaw = Math.atan2(-dx, -dz);
    const see = d < 30 && hasLOS(M, [p.pos[0], p.pos[1] + 1.2, p.pos[2]], [t.pos[0], t.pos[1] + 1.2, t.pos[2]]);
    if (S.ranged && see && d < S.keep[1] + 3) {
      // cuspidor: segura a distancia e cospe
      move = d < S.keep[0] ? [-dx / d, -dz / d] : d > S.keep[1] ? [dx / d, dz / d] : null;
      ai.hitT -= dt;
      if (ai.hitT <= 0) { ai.hitT = S.every * rnd(0.8, 1.2); spit(c, p, t); }
    } else {
      const g = see && d < 6 ? [dx / d, dz / d] : c.botSteer(p, t.pos, dt);
      move = g;
      if (p.mob === 'rabisco' && move && d > 3) { ai.zig += dt * 5; const s = Math.sin(ai.zig) * 0.8; move = [move[0] - move[1] * s, move[1] + move[0] * s]; } // zigue-zague
      if (d < S.reach + (S.hb.r - 0.4)) { move = null; ai.hitT -= dt; if (ai.hitT <= 0) { ai.hitT = S.every; c.damage(t, p, S.hit, 'melee', false); c.event({ k: 'swing', id: p.id }); } }
      // mola: pula de longe por cima da cobertura
      if (p.mob === 'mola' && p.onGround && (ai.leapT -= dt) <= 0 && d > S.leap[0] && d < S.leap[1]) {
        ai.leapT = rnd(3, 5); const k = Math.min(1, d / 12); p.vel[0] = dx / d * 9 * k + dx / d * 3; p.vel[2] = dz / d * 9 * k + dz / d * 3; p.vel[1] = 9.5;
        c.event({ k: 'borLeap', id: p.id });
      }
    }
    if (S.boss) bossTick(c, p, t, d, dt);
  }
  if (p.frozenT > 0) move = null;
  const ground = p.onGround, acc = ground ? 10 : 1.5;
  const ml = move ? Math.hypot(move[0], move[1]) || 1 : 1;
  const tx = move ? move[0] / ml * speed : 0, tz = move ? move[1] / ml * speed : 0;
  if (ground || !(p.mob === 'mola')) { p.vel[0] += (tx - p.vel[0]) * Math.min(1, acc * dt); p.vel[2] += (tz - p.vel[2]) * Math.min(1, acc * dt); }
  p.vel[1] -= 24 * dt;
  ai.stuckT += dt;
  if (ai.stuckT > 0.8) { if (move && ground && Math.hypot(p.pos[0] - ai.last[0], p.pos[2] - ai.last[2]) < 0.8) { p.vel[1] = 7; ai.path = null; } ai.last = [...p.pos]; ai.stuckT = 0; }
  // contra parede o corpo conta no maximo 0,9 m (03/11, pedido dele): chefao (raio 2 a 2,3) e Gordao nao passavam
  // na porta de 3 m. Entre viloes continua o raio cheio (um nao entra no outro).
  p.onGround = moveBody(M, p.pos, p.vel, dt, Math.min(S.rad, 0.9), Math.min(S.hb.h + 0.3, 2.4));
  const hs = Math.hypot(p.vel[0], p.vel[2]);
  p.anim = !p.onGround ? 'jump' : hs > 0.6 ? 'run' : 'idle';
}

// cuspidor: bola de tinta em arco (cai e deixa poca que deixa lento)
function spit(c, p, t) {
  const o = [p.pos[0], p.pos[1] + 1.4, p.pos[2]], tgt = [t.pos[0] + t.vel[0] * 0.5, t.pos[1] + 0.8, t.pos[2] + t.vel[2] * 0.5];
  const dx = tgt[0] - o[0], dz = tgt[2] - o[2], dist = Math.hypot(dx, dz) || 1, tt = dist / BOR.spit.speed;
  c.bor.blots.push({ id: ++c.bor.seq, from: p.id, pos: o, vel: [dx / tt, (tgt[1] - o[1]) / tt + 12 * tt, dz / tt], dmg: MOBS.cuspidor.hit, r: BOR.spit.puddleR, puddleT: BOR.spit.puddleT });
  c.event({ k: 'borSpit', id: p.id });
}
// bolas de tinta voando (cuspe e chuva do Rei)
function tickShots(c, dt) {
  const b = c.bor;
  for (const s of b.blots) {
    if (s.roll) { // rolo de filme: rola no chao, bate em quem esta de pe (pular = passa por baixo), some em s.roll s
      s.roll -= dt; s.pos[0] += s.vel[0] * dt; s.pos[2] += s.vel[2] * dt; s.pos[1] = floorAt(c.M, s.pos[0], s.pos[2]) + 0.5;
      const src = c.players.get(s.from) || null;
      for (const o of c.players.values()) if (!o.mob && isUp(o) && !(s.hit ||= new Set()).has(o.id) && d2(o.pos, s.pos) < s.r * s.r && o.pos[1] - floorAt(c.M, o.pos[0], o.pos[2]) < 0.5) { s.hit.add(o.id); c.damage(o, src, s.dmg, 'melee', false); o.vel[0] += s.vel[0] * 0.4; o.vel[2] += s.vel[2] * 0.4; }
      if (s.roll <= 0 || !hasLOS(c.M, [s.pos[0], s.pos[1], s.pos[2]], [s.pos[0] + s.vel[0] * 0.05, s.pos[1], s.pos[2] + s.vel[2] * 0.05])) s.done = true; // bateu na parede
      continue;
    }
    s.vel[1] -= 24 * dt;
    for (let k = 0; k < 3; k++) s.pos[k] += s.vel[k] * dt;
    const fl = floorAt(c.M, s.pos[0], s.pos[2]);
    let hit = s.pos[1] <= fl + 0.05;
    for (const o of c.players.values()) if (!o.mob && isUp(o) && d2(o.pos, s.pos) < 0.7 && s.pos[1] > o.pos[1] && s.pos[1] < o.pos[1] + 1.9) hit = true;
    if (!hit) continue;
    s.done = true;
    const src = c.players.get(s.from) || null;
    for (const o of c.players.values()) if (!o.mob && isUp(o) && d2(o.pos, s.pos) < s.r * s.r) c.damage(o, src, s.dmg, 'melee', false);
    addPuddle(c, [s.pos[0], fl, s.pos[2]], s.r, s.puddleT);
    c.event({ k: 'borSplat', at: [r2(s.pos[0]), r2(fl), r2(s.pos[2])] });
  }
  b.blots = b.blots.filter(s => !s.done && s.pos[1] > -10);
}

// chefoes
function bossTick(c, p, t, d, dt) {
  const ai = p.ai, b = c.bor;
  if (p.mob === 'projecionista') {
    const B = BOR.beam;
    ai.atkT -= dt;
    if (ai.atkT <= B.warn && !ai.warned) { ai.warned = true; c.event({ k: 'borBeam', id: p.id, warn: 1 }); } // a lente acende: hora de atirar nela
    if (ai.atkT <= 0) {
      ai.atkT = B.every * rnd(0.85, 1.15); ai.warned = false;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), eye = [p.pos[0], p.pos[1] + 5, p.pos[2]];
      for (const o of c.players.values()) {
        if (o.mob || !isUp(o)) continue;
        const dx = o.pos[0] - p.pos[0], dz = o.pos[2] - p.pos[2], dd = Math.hypot(dx, dz) || 1;
        if (dd > B.range || (dx * fx + dz * fz) / dd < Math.cos(B.cone) || !hasLOS(c.M, eye, [o.pos[0], o.pos[1] + 1.2, o.pos[2]])) continue;
        o.frozenT = B.freeze; c.damage(o, p, B.dmg, 'melee', false);
        c.event({ k: 'borFreeze', id: o.id, t: B.freeze });
      }
      c.event({ k: 'borBeam', id: p.id, warn: 0 });
    }
    p.headK = ai.warned ? 3 : 1.6; // lente acesa: tiro nela doi o triplo
    // rolos de filme rolando pelo chao na direcao de quem joga (03/11, do vault); pula por cima pra escapar
    ai.reelT = (ai.reelT ?? 4) - dt;
    if (ai.reelT <= 0 && t) {
      ai.reelT = BOR.reel.every * rnd(0.8, 1.2);
      const dx = t.pos[0] - p.pos[0], dz = t.pos[2] - p.pos[2], dd = Math.hypot(dx, dz) || 1;
      for (const sp of [-0.25, 0, 0.25]) { const cs = Math.cos(sp), sn = Math.sin(sp), ux = (dx * cs - dz * sn) / dd, uz = (dx * sn + dz * cs) / dd;
        b.blots.push({ id: ++b.seq, from: p.id, roll: BOR.reel.life, pos: [p.pos[0] + ux * 2, floorAt(c.M, p.pos[0], p.pos[2]) + 0.5, p.pos[2] + uz * 2], vel: [ux * BOR.reel.speed, 0, uz * BOR.reel.speed], dmg: BOR.reel.dmg, r: 1.1 }); }
      c.event({ k: 'borReel', id: p.id });
    }
  } else if (p.mob === 'reiTinteiro') {
    const f = p.hp / p.maxHp;
    const ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
    if (ph !== ai.phase) { ai.phase = ph; c.event({ k: 'borPhase', id: p.id, n: ph }); }
    p.headK = ph === 3 ? 3.2 : 1.6; // fase 3: tampa aberta, o olho exposto
    if (ph === 1) {
      const S = BOR.slam;
      ai.atkT -= dt;
      if (ai.atkT <= S.warn && !ai.warned) { ai.warned = true; c.event({ k: 'borSlam', id: p.id, warn: 1 }); }
      if (ai.atkT <= 0) {
        ai.atkT = S.every; ai.warned = false;
        for (const o of c.players.values()) {
          if (o.mob || !isUp(o) || d2(o.pos, p.pos) > S.r * S.r) continue;
          if (o.pos[1] - floorAt(c.M, o.pos[0], o.pos[2]) > 0.4) continue; // pulou: a onda passa por baixo
          c.damage(o, p, S.dmg, 'melee', false); o.vel[1] = 6;
        }
        c.event({ k: 'borSlam', id: p.id, warn: 0, at: p.pos });
      }
    } else {
      // fase 2 e 3: chuva de tinta em cima de quem joga e borroes saindo da poca
      ai.rainT -= dt;
      if (ai.rainT <= 0) {
        ai.rainT = BOR.rain.every;
        const ups = [...c.players.values()].filter(o => !o.mob && isUp(o));
        const o = ups[Math.floor(Math.random() * ups.length)];
        if (o) b.blots.push({ id: ++b.seq, from: p.id, pos: [o.pos[0] + rnd(-3, 3), o.pos[1] + 16, o.pos[2] + rnd(-3, 3)], vel: [0, -4, 0], dmg: BOR.rain.dmg, r: BOR.rain.r, puddleT: 5 });
      }
      ai.sumT -= dt;
      if (ai.sumT <= 0 && [...c.players.values()].filter(o => o.mob && o.alive).length < BOR.maxAlive) {
        ai.sumT = BOR.summon;
        for (let i = 0; i < 3; i++) b.queue.unshift('borrao');
        c.event({ k: 'borSummon', id: p.id });
      }
    }
  }
}

export function borSnap(c) {
  const b = c.bor;
  return {
    wave: b.wave, state: b.state, t: b.state === 'break' ? Math.ceil(b.t) : 0, left: b.queue ? b.queue.length + [...c.players.values()].filter(p => p.mob && p.alive).length : 0,
    doors: [...b.doors], boss: b.boss, art: c.borArt ? 1 : 0, goal: c.borArt ? c.limit : 0,
    box: b.box ? [b.box.at, Math.max(0, r2(b.box.spin)), b.box.show > 0 ? b.box.wpn : '', b.box.show > 0 ? b.box.body || '' : ''] : null,
    drops: b.drops.map(d => [d.id, d.k, d.pos[0], d.pos[1], d.pos[2], Math.ceil(d.t)]),
    fx: Object.fromEntries(Object.entries(b.fx).map(([k, v]) => [k, Math.ceil(v)])),
    puddles: b.puddles.map(q => [q.id, q.pos[0], q.pos[1], q.pos[2], q.r]),
    blots: b.blots.map(s => [s.id, r2(s.pos[0]), r2(s.pos[1]), r2(s.pos[2]), s.roll ? 1 : 0]),
  };
}

// estudo do modo: entra no laco de nascimento? (gente morta espera a onda seguinte)
export const borHoldSpawn = (c, p) => !!c.bor && !p.mob && p.deaths > 0;
