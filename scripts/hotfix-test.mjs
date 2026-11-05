// Hotfix 0.13.1: regras no Core puro (sem navegador). Uso: node scripts/hotfix-test.mjs
import { Core } from '../shared/core.js';
import { STREAKS, FIELD, WEAPONS, SKILLS } from '../shared/weapons.js';
import { CAR, carEnter } from '../shared/cars.js';
import { hasLOS } from '../shared/map.js';
let f = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) f++; };
const mk = (o) => { const out = []; const c = new Core({ lobby: false, send: (to, m) => out.push([to, m]), ...o }); c.local = true; c.out = out; return c; };
// dois baloes no deserto
{ const c = mk({ mode: 'ctf', map: 'deserto', bots: 5 }); c.join('me', 'Eu'); const p = c.players.get('me'), o = [...c.players.values()].find(x => x.bot && c.enemies(p, x));
  c.phase = 'play'; c.streakGap = 0; p.ready = ['bomber', 'bomber', 'bomber']; c.useStreak(p, 'bomber'); c.useStreak(p, 'bomber'); c.useStreak(p, 'bomber');
  const B = c.blimps.filter(b => b.kind === 'bomber'); ok(B.length === 2, 'deserto: 2 baloes no ar, o 3o espera (' + B.length + ')');
  let min = 1e9; const [a, b] = B.map(x => ({ p: [...x.pos], d: x.dir, s: x.speed })); for (let t = 0; t < STREAKS.bomber.time; t += 0.5) min = Math.min(min, Math.hypot(a.p[0] + a.d[0] * a.s * t - b.p[0] - b.d[0] * b.s * t, a.p[2] + a.d[1] * a.s * t - b.p[2] - b.d[1] * b.s * t));
  ok(min >= 55, 'baloes nunca se tocam: menor distancia ' + min.toFixed(1) + ' m');
  const mid = B.map(x => [x.pos[0] + x.dir[0] * x.speed * STREAKS.bomber.time / 2, x.pos[2] + x.dir[1] * x.speed * STREAKS.bomber.time / 2]); ok(mid.every(m => Math.abs(m[0]) < 131 && Math.abs(m[1]) < 131), 'as duas retas cruzam o mapa: meio em ' + JSON.stringify(mid.map(m => m.map(Math.round))));
}
{ const c = mk({ mode: 'ffa', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const p = c.players.get('me'); c.streakGap = 0; p.ready = ['bomber', 'bomber']; c.useStreak(p, 'bomber'); c.useStreak(p, 'bomber'); ok(c.blimps.filter(b => b.kind === 'bomber').length === 1, 'fora do deserto continua 1 balao'); }
// sentinela some em 90 s
{ const c = mk({ mode: 'ffa', map: 'vila', bots: 1 }); c.join('me', 'Eu'); const p = c.players.get('me'); p.ready = ['sentry']; c.useStreak(p, 'sentry'); const b = c.blimps.find(x => x.kind === 'sentry'); ok(b?.t === 90, 'sentinela nasce com 90 s');
  for (let i = 0; i < 89 * 10; i++) c.tickStreaks(0.1); ok(c.blimps.some(x => x.kind === 'sentry'), 'viva aos 89 s'); for (let i = 0; i < 20; i++) c.tickStreaks(0.1); ok(!c.blimps.some(x => x.kind === 'sentry'), 'sumiu depois de 1min30'); }
// carro
{ const c = mk({ mode: 'blitz_ctf', map: 'deserto', bots: 5 }); c.join('me', 'Eu'); const p = c.players.get('me'), en = [...c.players.values()].filter(x => x.bot && c.enemies(p, x)), fr = [...c.players.values()].find(x => x.bot && !c.enemies(p, x)); const car = c.cars.find(k => k.team !== p.team) || c.cars[0];
  ok(!!car, 'carro existe no ctf');
  c.freezeT = 0; car.seats[0] = 'me'; p.car = car.id; p.seat = 0; car.spd = 10;
  const put = (v) => { v.alive = true; v.car = null; v.seat = null; v.hp = 100; v.pos = [car.pos[0] + 0.3, car.pos[1], car.pos[2] + 0.3]; };
  if (fr) { put(fr); c.cars && (await import('../shared/cars.js')).carsTick(c, 0.03); ok(fr.alive, 'carro roubado nao atropela o proprio time'); }
  const e = en[0]; put(e); car.seats[0] = 'me'; p.car = car.id; p.alive = true; p.pos = [...car.pos]; (await import('../shared/cars.js')).carsTick(c, 0.03); ok(!e.alive, 'atropela inimigo'); ok(p.alive, 'quem dirige nao morre atropelando');
  // inimigo dirigindo por cima de quem dirige
  const car2 = c.cars.find(k => k !== car); if (car2) { const d2 = en[1] || en[0]; d2.alive = true; d2.bot = false; car2.seats[0] = d2.id; d2.car = car2.id; d2.seat = 0; car2.spd = 11; car2.pos = [...car.pos]; car.seats[0] = 'me'; p.car = car.id; p.seat = 0; p.alive = true; p.pos = [...car.pos]; (await import('../shared/cars.js')).carsTick(c, 0.03); ok(p.alive, 'motorista nao e atropelado por outro carro'); }
  const { carDamage } = await import('../shared/cars.js'); car.hp = 1; car.deadT = 0; car.seats = ['me', null, null, null]; p.car = car.id; p.alive = true; c.out.length = 0; carDamage(c, car, 10, en[0]); const k = c.out.map(x => x[1]).filter(m => m.t === 'ev' && m.k === 'kill').concat(c.out.map(x => x[1]).flatMap(m => m.ev || []).filter(e => e.k === 'kill'));
  ok(!p.alive, 'carro explodido mata quem esta dentro'); console.log('   evento', JSON.stringify(k.slice(-1)).slice(0, 120));
}
// ping
{ const c = mk({ mode: 'ffa', map: 'vila', bots: 1 }); c.join('me', 'Eu'); const p = c.players.get('me'); const a0 = p.actAt; c.out.length = 0; c.handle('me', { t: 'lat', c: 123.4, ms: 47 }); ok(p.ping === 47, 'ping guardado'); ok(c.out.some(([to, m]) => to === 'me' && m.t === 'latr' && m.c === 123.4), 'ping responde so pra quem perguntou'); ok(p.actAt === a0, 'ping nao conta como presenca no AFK'); }
// spawn no Contra Todos: distancia do inimigo mais perto na hora de nascer, regra nova contra a antiga
{ const old = function (list, en, mt) { let best = null; for (const s of this.M.spawns.ffa) { let m = 60; for (const e of en) m = Math.min(m, Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1])); const seen = en.some(e => Math.hypot(e.pos[0] - s[0], e.pos[2] - s[1]) < 45 && hasLOS(this.M, [e.pos[0], 1.5, e.pos[2]], [s[0], 1.4, s[1]])); const sc = m - (seen ? 25 : 0) + Math.random() * 8; if (!best || sc > best.sc) best = { s, y: 0, sc }; } return best; };
  for (const map of ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria']) { const r = {}; for (const lado of ['antes', 'agora']) { const c = mk({ mode: 'ffa', map, bots: 7 }); if (lado === 'antes') c.bestSpawn = old; c.join('me', 'Eu'); const P = [...c.players.values()]; const ds = []; for (let i = 0; i < 300; i++) { const p = P[i % P.length]; for (const o of P) if (o !== p) { o.alive = true; } p.alive = false; c.spawn(p); ds.push(Math.min(...P.filter(o => o !== p).map(o => Math.hypot(o.pos[0] - p.pos[0], o.pos[2] - p.pos[2])))); if (i % 8 === 0) for (const o of P) { const q = c.M.spawns.ffa[Math.floor(Math.random() * c.M.spawns.ffa.length)]; o.pos = [q[0], 0, q[1]]; } } ds.sort((a, b) => a - b); r[lado] = [ds[Math.floor(ds.length * .1)], ds[Math.floor(ds.length / 2)]].map(v => +v.toFixed(0)); }
    ok(r.agora[0] >= r.antes[0] && r.agora[1] >= r.antes[1], `${map}: pior caso/mediana ${r.antes} -> ${r.agora} m`); } }
// Escada: ninguem ganha sequencia
{ const c = mk({ mode: 'gungame', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const [a, v] = [...c.players.values()].filter(x => x.bot); a.streak = 1; a.streaks = ['uav']; a.alive = true; v.alive = true; a.streak = 2; c.freezeT = 0; c.kill(v, a, a.wpn, false); ok(!a.ready.length && !c.uavs.length, 'Escada: bot nao chama sequencia'); }
// BR: arma do chao com modelo sorteado
{ const c = mk({ mode: 'br', bots: 5 }); c.join('me', 'Eu'); const p = c.players.get('me'), L = c.loot.filter(i => i.kind === 'wpn'); const bodies = new Set(L.map(i => i.body).filter(Boolean)); ok(bodies.size >= 5, 'BR: ' + L.length + ' armas no chao, ' + bodies.size + ' modelos diferentes'); }
ok(WEAPONS.lmg.dmg < 31 && FIELD.stim.heal === 40 && SKILLS.fervor, 'numeros: LMG ' + WEAPONS.lmg.dmg + ', estimulante ' + FIELD.stim.heal);
console.log(f ? f + ' FALHA(S)' : 'TUDO CERTO'); process.exit(f ? 1 : 0);
