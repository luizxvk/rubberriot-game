// Battle royale ("Ultimo de Pe"): regras do modo, separadas do nucleo. O Core chama estas funcoes nos
// pontos certos (inicio, nascimento, dano, morte, tick, objetivo do bot). Mesmo codigo no solo e no MP.
//
// - Todo mundo nasce no soco, espalhado pelo mapa, sem renascer.
// - Loot no chao (arma, colete, leite, granada) nao reaparece; quem cai larga a melhor arma e o colete.
// - A iris (zona) fecha em fases: espera, fecha, proxima. Fora dela perde vida.
// - O dirigivel solta um caixote de tempos em tempos (Moedor + colete cheio), dentro da proxima iris.
import { BR, WEAPONS, PRIMARIES } from './weapons.js';
import { floorAt, standable } from './nav.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const RANK = ['fists', 'pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'minigun'];
// limite: 2 principais + pistola + punhos. Cheio, trocar e decisao (segurar E em cima da arma).
const PRIM = ['smg', 'rifle', 'shotgun', 'sniper', 'minigun'];
export const BR_PRIM_MAX = 2;
const bestGun = (owned) => [...owned].filter(w => w !== 'fists' && w !== 'melee').sort((a, b) => RANK.indexOf(b) - RANK.indexOf(a))[0] || null;

export function brInit(c) {
  const M = c.M, A = M.arena;
  c.loot = []; c.lootSeq = 0; c.lootDirty = true; c.lootT = 0;
  for (const s of M.loot || []) {
    if (!standable(M, s[0], s[1])) continue;
    const r = Math.random(), pos = [s[0], floorAt(M, s[0], s[1]), s[1]];
    if (r < 0.55) addLoot(c, 'wpn', pos, BR.lootWpn[Math.floor(Math.random() * BR.lootWpn.length)]);
    else if (r < 0.72) addLoot(c, 'armor', pos);
    else if (r < 0.88) addLoot(c, 'hp', pos);
    else addLoot(c, 'nade', pos);
  }
  // iris: comeca cobrindo tudo; cada fase sorteia o proximo circulo dentro do atual
  const R0 = A * BR.r0;
  c.zone = { c: [0, 0], r: R0, from: { c: [0, 0], r: R0 }, to: null, phase: 0, state: 'wait', t: BR.phases[0][0], dps: 0, hurtAcc: 0 };
  nextCircle(c);
  c.dropT = BR.dropEvery; c.drops = [];
  c.brLeft = 0; c.brStarted = false;
  c.ringQ = []; c.ringFight = null;
}

function addLoot(c, kind, pos, wpn = null, extra = {}) {
  const it = { id: ++c.lootSeq, kind, wpn, pos, ...extra };
  c.loot.push(it); c.lootDirty = true;
  return it;
}

function nextCircle(c) {
  const z = c.zone, ph = BR.phases[Math.min(z.phase, BR.phases.length - 1)];
  const R0 = c.M.arena * BR.r0, r = R0 * ph[2], room = Math.max(0, z.r - r);
  // centro novo dentro do atual, num ponto andavel (a iris nunca fecha em cima de agua/parede)
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * room * 0.9;
    const x = z.c[0] + Math.cos(a) * d, y = z.c[1] + Math.sin(a) * d;
    if (Math.abs(x) < c.M.arena - 4 && Math.abs(y) < c.M.arena - 4 && standable(c.M, x, y)) { z.to = { c: [x, y], r }; return; }
  }
  z.to = { c: [...z.c], r };
}

// posicao espalhada pelo mapa, longe de quem ja nasceu
export function brSpawnPoint(c, p) {
  // dupla: nasce do lado do parceiro (se ele ja estiver no mapa)
  const mate = c.duo && p.team && [...c.players.values()].find(o => o !== p && o.team === p.team && o.alive);
  if (mate) { const n = brNear(c, mate.pos); return [n[0], n[2]]; }
  const M = c.M, A = M.arena - 6, others = [...c.players.values()].filter(o => o !== p && o.alive);
  let best = null, bs = -1;
  for (let i = 0; i < 60; i++) {
    const x = rnd(-A, A), z = rnd(-A, A);
    if (!standable(M, x, z)) continue;
    const m = others.reduce((v, o) => Math.min(v, Math.hypot(o.pos[0] - x, o.pos[2] - z)), 999);
    if (m > bs) { bs = m; best = [x, z]; }
  }
  return best || [0, 0];
}

// ponto andavel a 3-7 m de `at` (cai no proprio `at` se nao achar)
export function brNear(c, at) {
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, Math.PI * 2), d = rnd(3, 7), x = at[0] + Math.cos(a) * d, z = at[2] + Math.sin(a) * d;
    if (Math.abs(x) < c.M.arena - 4 && Math.abs(z) < c.M.arena - 4 && standable(c.M, x, z)) return [x, floorAt(c.M, x, z), z];
  }
  return [...at];
}

// ---------- dupla: caido e bomba de bicicleta ----------
const mateOf = (c, p) => [...c.players.values()].find(o => o !== p && o.team === p.team && p.team);
const isUp = (o) => !!o && o.alive && !(o.down > 0) && !o.inRing;
// zerou a vida: com o parceiro de pe, fica caido (rasteja, nao atira, sangra). Devolve se caiu.
export function brDown(c, v, a, wpn, head) {
  if (v.down > 0 || v.inRing || !isUp(mateOf(c, v))) return false;
  v.down = BR.duo.down; v.hp = BR.duo.downHp; v.reviveT = 0; v.burn = null; v.using = false;
  v.downBy = a && a !== v ? a.id : null; v.downWpn = wpn;
  c.event({ k: 'down', id: v.id, a: v.downBy, wpn, head, pos: v.pos });
  return true;
}
function duoTick(c, dt) {
  const D = BR.duo;
  for (const p of c.players.values()) {
    if (!p.alive || !(p.down > 0)) continue;
    const m = mateOf(c, p);
    // parceiro sumiu, caiu tambem ou foi pro ringue: a dupla acabou, quem estava caido sai junto
    if (!isUp(m)) { c.kill(p, c.players.get(p.downBy) || null, p.downWpn || 'iris', false); continue; }
    // parceiro em cima segurando usar (bot: chegou perto) = enche a bomba; sangramento para enquanto isso
    const near = (m.pos[0] - p.pos[0]) ** 2 + (m.pos[2] - p.pos[2]) ** 2 < D.reviveR ** 2 && Math.abs(m.pos[1] - p.pos[1]) < 1.6;
    if (near && (m.using || m.bot)) {
      if (!(p.reviveT > 0)) c.event({ k: 'pump', id: p.id, by: m.id });
      p.reviveT = (p.reviveT || 0) + dt;
      if (p.reviveT >= D.revive) {
        p.down = 0; p.reviveT = 0; p.hp = D.reviveHp;
        c.event({ k: 'revive', id: p.id, by: m.id, pos: p.pos });
      }
      continue;
    }
    if (p.reviveT > 0) p.reviveT = Math.max(0, p.reviveT - dt * 2); // largou: a bomba esvazia rapido
    p.down -= dt;
    if (p.down <= 0) c.kill(p, c.players.get(p.downBy) || null, p.downWpn || 'iris', false);
  }
}

export function brSpawn(c, p) {
  p.owned = new Set(['fists']); p.wpn = 'fists';
  p.nades = { frag: 0, flash: 0 };
  p.armor = 0;
}

// colete absorve 70% do dano ate acabar
export function brArmor(v, dmg) {
  if (!(v.armor > 0)) return dmg;
  const take = Math.min(v.armor, dmg * BR.armorAbsorb);
  v.armor -= take;
  return dmg - take;
}

export function brKill(c, v) {
  // ringue: quem luta e perde sai de vez; o outro volta pra ilha. 1a queda (iris no comeco) vai pra fila do ringue
  if (v.inRing === 'fight' && c.ringFight) {
    const w = c.players.get(c.ringFight.a === v.id ? c.ringFight.b : c.ringFight.a);
    c.ringFight = null; v.inRing = null;
    if (w?.alive) ringReturn(c, w);
  } else if (c.M.ring && !v.ringUsed && c.zone.phase < BR.ring.lastPhase) {
    v.ringUsed = true; v.inRing = 'wait'; v.ringWaitT = 0; v.respawnT = Infinity;
    c.ringQ.push(v.id);
    const g0 = bestGun(v.owned || []), at0 = [v.pos[0], floorAt(c.M, v.pos[0], v.pos[2]), v.pos[2]];
    if (g0) addLoot(c, 'wpn', [at0[0] + 0.6, at0[1], at0[2]], g0);
    if (v.armor >= 10) addLoot(c, 'armor', [at0[0] - 0.6, at0[1], at0[2]], null, { amt: Math.round(v.armor) });
    v.armor = 0;
    c.event({ k: 'ringWait', id: v.id });
    return;
  }
  // quem cai larga a melhor arma e o que sobrou do colete
  const g = bestGun(v.owned || []), at = [v.pos[0], floorAt(c.M, v.pos[0], v.pos[2]), v.pos[2]];
  if (g) addLoot(c, 'wpn', [at[0] + 0.6, at[1], at[2]], g);
  if (v.armor >= 10) addLoot(c, 'armor', [at[0] - 0.6, at[1], at[2]], null, { amt: Math.round(v.armor) });
  v.armor = 0;
  v.respawnT = Infinity; // sem renascer
  v.place = c.players.size ? alive(c).length + 1 : 1;
  c.event({ k: 'brleft', n: alive(c).length, v: v.id, place: v.place });
}

const alive = (c) => [...c.players.values()].filter(p => p.alive);

// cheio de principais: humano so troca segurando E (larga a da mao, ou a primeira); bot troca se a nova
// for melhor (larga a pior). force = caixote (sempre cabe). Devolve se abriu espaco.
function makeRoom(c, p, wpn, force) {
  const prims = [...p.owned].filter(w => PRIM.includes(w));
  if (prims.length < BR_PRIM_MAX) return true;
  let drop;
  if (p.bot) { const worst = prims.sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0]; if (!force && RANK.indexOf(wpn) <= RANK.indexOf(worst)) return false; drop = worst; }
  else { if (!force && (!p.using || (p.swapCd || 0) > 0)) return false; drop = PRIM.includes(p.wpn) ? p.wpn : prims[0]; }
  p.owned.delete(drop);
  if (p.wpn === drop) p.wpn = wpn;
  addLoot(c, 'wpn', [p.pos[0], floorAt(c.M, p.pos[0], p.pos[2]), p.pos[2]], drop);
  p.swapCd = 0.8; // a que caiu fica no pe: sem isso trocava de volta na hora
  c.event({ k: 'take', id: p.id, wpn: drop });
  return true;
}

// ---------- ringue de boxe ----------
function ringStart(c) {
  const [ia, ib] = c.ringQ.splice(0, 2), R = c.M.ring;
  c.ringFight = { a: ia, b: ib, t: BR.ring.fight };
  for (const [id, at, yaw] of [[ia, R.a, -Math.PI * 0.75], [ib, R.b, Math.PI * 0.25]]) { // um de frente pro outro
    const p = c.players.get(id); if (!p) continue;
    p.inRing = 'fight'; p.alive = true; p.hp = 100; p.maxHp = 100; p.armor = 0; p.burn = null;
    p.owned = new Set(['fists']); p.wpn = 'fists'; p.nades = { frag: 0, flash: 0 };
    p.pos = [...at]; p.vel = [0, 0, 0]; p.yaw = yaw; p.shieldT = 0;
    if (p.bot) { p.ai.target = null; p.ai.path = null; }
    c.event({ k: 'spawn', id, pos: p.pos, yaw, wpn: 'fists', owned: ['fists'], team: p.team });
  }
  c.event({ k: 'ring', a: ia, b: ib });
}
function ringReturn(c, p) {
  // volta de balao: cai num ponto andavel dentro da proxima iris, com uma pistola de lembranca
  const t = c.zone.to || c.zone, A = c.M.arena - 6;
  let at = [t.c[0], 0, t.c[1]];
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * t.r * 0.7;
    const x = Math.max(-A, Math.min(A, t.c[0] + Math.cos(a) * d)), z = Math.max(-A, Math.min(A, t.c[1] + Math.sin(a) * d));
    if (standable(c.M, x, z)) { at = [x, 0, z]; break; }
  }
  at[1] = floorAt(c.M, at[0], at[2]);
  p.inRing = null; p.hp = p.bot ? 80 : 100; p.owned = new Set(['fists', 'pistol']); p.wpn = 'pistol';
  p.pos = at; p.vel = [0, 0, 0];
  if (p.bot) { c.botReload(p, true); p.ai.path = null; }
  c.event({ k: 'spawn', id: p.id, pos: at, yaw: p.yaw, wpn: 'pistol', owned: ['fists', 'pistol'], team: p.team });
  c.event({ k: 'ringWin', id: p.id, pos: at });
}
function ringOut(c, p) {
  // ninguem pra lutar (ou o ringue fechou): sai de vez
  c.ringQ = c.ringQ.filter(id => id !== p.id);
  p.inRing = null; p.respawnT = Infinity;
  p.place = alive(c).length + 1;
  c.event({ k: 'brleft', n: alive(c).length, v: p.id, place: p.place });
}
function ringTick(c, dt) {
  const late = c.zone.phase >= BR.ring.lastPhase;
  for (const id of [...c.ringQ]) {
    const p = c.players.get(id);
    if (!p) { c.ringQ = c.ringQ.filter(x => x !== id); continue; }
    p.ringWaitT += dt;
    if (late || (c.ringQ.length < 2 && !c.ringFight && p.ringWaitT > BR.ring.wait)) ringOut(c, p);
  }
  if (!c.ringFight && c.ringQ.length >= 2) ringStart(c);
  const F = c.ringFight;
  if (F && (F.t -= dt) <= 0) {
    // tempo da luta acabou: vence quem tem mais vida (empate: o primeiro da fila)
    const a = c.players.get(F.a), b = c.players.get(F.b);
    const [w, l] = (a?.hp || 0) >= (b?.hp || 0) ? [a, b] : [b, a];
    if (l) c.kill(l, w, 'fists', false); else if (w) { c.ringFight = null; ringReturn(c, w); }
  }
}

function give(c, p, it) {
  if (p.down > 0) return false; // caido nao pega nada
  if (it.kind === 'hp') { if (p.hp >= (p.maxHp || 100)) return false; p.hp = Math.min(p.maxHp || 100, p.hp + 50); }
  else if (it.kind === 'armor') { if (p.armor >= BR.armorMax) return false; p.armor = Math.min(BR.armorMax, (p.armor || 0) + (it.amt || BR.armorPiece)); }
  else if (it.kind === 'nade') { p.nades.frag = Math.min(3, (p.nades.frag || 0) + 1); }
  else if (it.kind === 'crate') {
    p.armor = BR.armorMax;
    if (!p.owned.has('minigun')) makeRoom(c, p, 'minigun', true);
    p.owned.add('minigun'); c.event({ k: 'give', id: p.id, wpn: 'minigun' });
    if (p.bot) { p.wpn = 'minigun'; c.botReload(p, true); }
  } else {
    if (p.owned.has(it.wpn)) return false;
    if (PRIM.includes(it.wpn) && !makeRoom(c, p, it.wpn, false)) return false;
    p.owned.add(it.wpn);
    c.event({ k: 'give', id: p.id, wpn: it.wpn });
    if (p.bot && RANK.indexOf(it.wpn) > RANK.indexOf(p.wpn)) { p.wpn = it.wpn; c.botReload(p, true); }
  }
  return true;
}

export function brTick(c, dt) {
  ringTick(c, dt);
  if (c.duo) duoTick(c, dt);
  for (const p of c.players.values()) if (p.swapCd > 0) p.swapCd -= dt;
  const z = c.zone, ph = BR.phases[Math.min(z.phase, BR.phases.length - 1)];
  // iris
  z.t -= dt;
  if (z.state === 'wait' && z.t <= 0) { z.state = 'shrink'; z.t = ph[1]; z.from = { c: [...z.c], r: z.r }; c.event({ k: 'iris', state: 'shrink', phase: z.phase }); }
  else if (z.state === 'shrink') {
    const k = 1 - Math.max(0, z.t) / ph[1];
    z.c = [z.from.c[0] + (z.to.c[0] - z.from.c[0]) * k, z.from.c[1] + (z.to.c[1] - z.from.c[1]) * k];
    z.r = z.from.r + (z.to.r - z.from.r) * k;
    z.dps = ph[3];
    if (z.t <= 0) {
      z.phase++;
      if (z.phase < BR.phases.length) { z.state = 'wait'; z.t = BR.phases[z.phase][0]; nextCircle(c); c.event({ k: 'iris', state: 'wait', phase: z.phase }); }
      else { z.state = 'closed'; z.t = 0; }
    }
  }
  if (z.state === 'wait' && z.phase > 0) z.dps = BR.phases[z.phase - 1][3];
  if (z.state === 'closed') z.dps = BR.phases[BR.phases.length - 1][3];
  // dano fora da iris: em pedacos de 0,5 s (cada um vira 1 evento)
  z.hurtAcc += dt;
  if (z.hurtAcc >= 0.5) {
    const step = z.hurtAcc; z.hurtAcc = 0;
    for (const p of alive(c)) if (!p.inRing && Math.hypot(p.pos[0] - z.c[0], p.pos[2] - z.c[1]) > z.r && z.dps > 0) c.damage(p, null, z.dps * step, 'iris', false);
  }
  // loot: encostou, pegou (nao volta)
  for (let i = c.loot.length - 1; i >= 0; i--) {
    const it = c.loot[i];
    if (it.fallT > 0) { it.fallT -= dt; if (it.fallT <= 0) c.lootDirty = true; continue; }
    for (const p of c.players.values()) {
      if (!p.alive || (p.pos[0] - it.pos[0]) ** 2 + (p.pos[2] - it.pos[2]) ** 2 > 1.6 * 1.6 || Math.abs(p.pos[1] - it.pos[1]) > 2) continue;
      if (!give(c, p, it)) continue;
      c.loot.splice(i, 1); c.lootDirty = true;
      c.event({ k: 'loot1', id: it.id, by: p.id, kind: it.kind, wpn: it.wpn });
      break;
    }
  }
  // caixote do dirigivel: cai dentro da proxima iris
  c.dropT -= dt;
  if (c.dropT <= 0 && alive(c).length > 2) {
    c.dropT = BR.dropEvery;
    const t = z.to || z, A = c.M.arena - 6;
    for (let i = 0; i < 30; i++) {
      const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * t.r * 0.8;
      const x = Math.max(-A, Math.min(A, t.c[0] + Math.cos(a) * d)), y = Math.max(-A, Math.min(A, t.c[1] + Math.sin(a) * d));
      if (!standable(c.M, x, y)) continue;
      const it = addLoot(c, 'crate', [x, floorAt(c.M, x, y), y], null, { fallT: BR.dropFall });
      c.event({ k: 'drop', id: it.id, pos: it.pos, fall: BR.dropFall });
      break;
    }
  }
  // lista de loot so quando muda (e no maximo 4x/s)
  c.lootT -= dt;
  if (c.lootDirty && c.lootT <= 0) { c.lootDirty = false; c.lootT = 0.25; c.event({ k: 'loot', list: lootList(c) }); }
  // vencedor: sobrou um (ou ninguem)
  const left = alive(c);
  // dupla: conta por dupla (o vencedor e o time, o cliente compara com o proprio time)
  const sides = new Set(left.map(p => c.duo ? p.team : p.id));
  // so depois que a partida teve 2+ lados vivos (senao acabava antes do humano nascer)
  if (sides.size >= 2) c.brStarted = true;
  // quem espera o ringue ainda esta no jogo (pode voltar)
  for (const id of c.ringQ) { const p = c.players.get(id); if (p) sides.add(c.duo ? p.team : p.id); }
  if (!c.over && c.brStarted && sides.size <= 1) c.end(left[0] ? (c.duo ? left[0].team : left[0].name) : 'ninguem');
}

export function lootList(c) {
  const r = (v) => Math.round(v * 100) / 100;
  return c.loot.filter(it => !(it.fallT > 0)).map(it => [it.id, it.kind, it.wpn || 0, r(it.pos[0]), r(it.pos[1]), r(it.pos[2])]);
}

export function brSnap(c) {
  const z = c.zone, r = (v) => Math.round(v * 10) / 10;
  return { c: [r(z.c[0]), r(z.c[1])], r: r(z.r), to: z.to ? { c: [r(z.to.c[0]), r(z.to.c[1])], r: r(z.to.r) } : null, state: z.state, t: Math.max(0, Math.round(z.t)), phase: z.phase, left: alive(c).length };
}

// bot: foge da iris > arranja arma/colete > caca
export function brGoal(c, p) {
  // no ringue: vai pra cima do adversario
  if (p.inRing === 'fight' && c.ringFight) { const o = c.players.get(c.ringFight.a === p.id ? c.ringFight.b : c.ringFight.a); return o ? [...o.pos] : null; }
  // dupla: parceiro caido = vai encher a bomba nele; parceiro longe = cola nele (o humano lidera; entre
  // dois bots, o de id menor)
  const mate = c.duo && mateOf(c, p);
  p.ai.rescue = false;
  if (mate && mate.alive && !mate.inRing) {
    const dm = Math.hypot(mate.pos[0] - p.pos[0], mate.pos[2] - p.pos[2]);
    if (mate.down > 0 && dm < 80) { p.ai.rescue = true; return [...mate.pos]; }
    if (dm > 22 && (!mate.bot || mate.id < p.id)) return [...mate.pos];
  }
  const z = c.zone, tgt = z.state === 'shrink' || z.state === 'closed' ? z : (z.to || z);
  const dz = Math.hypot(p.pos[0] - tgt.c[0], p.pos[2] - tgt.c[1]);
  if (dz > tgt.r * 0.8 && tgt.r > 4) return [tgt.c[0], floorAt(c.M, tgt.c[0], tgt.c[1]), tgt.c[1]];
  const needGun = !bestGun(p.owned), needArmor = (p.armor || 0) < 50;
  if (needGun || needArmor || Math.random() < 0.15) {
    let best = null, bd = (needGun ? 70 : 30) ** 2;
    for (const it of c.loot) {
      if (it.fallT > 0) continue;
      if (it.kind === 'wpn' && p.owned.has(it.wpn)) continue;
      if (it.kind === 'armor' && !needArmor) continue;
      if (Math.hypot(it.pos[0] - tgt.c[0], it.pos[2] - tgt.c[1]) > tgt.r) continue; // nada fora da iris
      const d = (it.pos[0] - p.pos[0]) ** 2 + (it.pos[2] - p.pos[2]) ** 2;
      const w = it.kind === 'crate' ? 0.3 : it.kind === 'wpn' && needGun ? 0.5 : 1;
      if (d * w < bd) { bd = d * w; best = it; }
    }
    if (best) return best.pos;
  }
  const ai = p.ai;
  // equipado (arma + colete) e dentro da proxima iris: segura posicao ate a iris obrigar a andar
  if (!needGun && !needArmor) {
    if (!ai.hold || ai.holdPhase !== z.phase) { ai.hold = [...p.pos]; ai.holdPhase = z.phase; }
    if (Math.hypot(ai.hold[0] - tgt.c[0], ai.hold[2] - tgt.c[1]) < tgt.r * 0.8) return ai.hold;
  }
  // sem nada pra pegar: explora um ponto dentro da iris (troca quando chega); briga quando cruza alguem
  if (!ai.brGoal || Math.hypot(ai.brGoal[0] - p.pos[0], ai.brGoal[2] - p.pos[2]) < 4 || Math.hypot(ai.brGoal[0] - tgt.c[0], ai.brGoal[2] - tgt.c[1]) > tgt.r * 0.8) {
    for (let i = 0; i < 20; i++) {
      const a = rnd(0, Math.PI * 2), d = Math.sqrt(Math.random()) * tgt.r * 0.75, x = tgt.c[0] + Math.cos(a) * d, y = tgt.c[1] + Math.sin(a) * d;
      if (Math.abs(x) < c.M.arena - 5 && Math.abs(y) < c.M.arena - 5 && standable(c.M, x, y)) { ai.brGoal = [x, floorAt(c.M, x, y), y]; break; }
    }
  }
  return ai.brGoal || null;
}

export const BR_GUNS = PRIMARIES;
export { bestGun };
export const brWeaponOk = (w) => !!WEAPONS[w];
