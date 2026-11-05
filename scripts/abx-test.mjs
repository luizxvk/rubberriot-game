// Caixa de municao (05/11): regras no Core puro. Uso: node scripts/abx-test.mjs
import { Core } from '../shared/core.js';
import { NADES } from '../shared/weapons.js';
let f = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) f++; };
const mk = (o) => { const c = new Core({ lobby: false, send: () => {}, ...o }); c.local = true; const ev = c.event.bind(c); c.booms = 0; c.event = (e) => { if (e.k === 'boom') c.booms++; return ev(e); }; return c; };
const A = NADES.ammobox, tick = (c, s) => { for (let i = 0; i < s * 10; i++) c.tickStreaks(0.1); };
const lo = (c, id, ul) => c.handle(id, { t: 'loadout', ul, lvl: ul, tactical: 'ammobox', primary: 'smg', now: true });
const drop = (c, p) => { c.detonate({ kind: 'ammobox', pos: [...p.pos], owner: p.id }); return c.boxes[c.boxes.length - 1]; };
// bots longe e sem pensar: so o que o teste manda acontece
const park = (c) => { let i = 0; for (const v of c.players.values()) if (v.bot) { v.alive = false; v.pos = [40 + i++, v.pos[1], 40]; } };
{ const c = mk({ mode: 'tdm', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const p = c.players.get('me'); park(c);
  lo(c, 'me', A.lvl - 1); ok(p.tactical === 'flash', 'nivel baixo nao leva a caixa: ' + p.tactical);
  lo(c, 'me', A.lvl); ok(p.tactical === 'ammobox', 'nivel ' + A.lvl + ' leva a caixa');
  p.alive = true; const old = drop(c, p); ok(c.boxes.length === 1, 'estoura em caixa, nao em flash');
  const n0 = c.booms; drop(c, p); ok(c.boxes.length === 1 && c.boxes[0] !== old && c.booms === n0, 'uma por dono: a nova troca a velha sem explodir');
  const b = c.boxes[0], ally = [...c.players.values()].find(x => x.bot && !c.enemies(p, x)), en = [...c.players.values()].find(x => x.bot && c.enemies(p, x));
  c.clock = 100; const take = (who) => c.handle(who.id, { t: 'abx', id: b.id }); const u0 = b.uses;
  en.alive = true; en.pos = [...b.pos]; take(en); ok(b.uses === u0, 'inimigo nao pega'); en.alive = false; en.pos = [40, b.pos[1], 40];
  const home = [...p.pos]; p.pos = [b.pos[0] + 30, b.pos[1], b.pos[2]]; take(p); ok(b.uses === u0, 'longe nao pega');
  p.pos = [...b.pos]; take(p); ok(b.uses === u0 - 1, 'dono pega'); take(p); ok(b.uses === u0 - 1, 'espera de ' + A.cd + ' s');
  const hp0 = p.hp, n1 = c.booms; c.clock += A.cd + 1; take(p);
  ok(!c.boxes.includes(b) && c.booms === n1 + 1, 'explode ao gastar os ' + A.uses + ' usos'); ok(p.hp === hp0, 'a ultima carga nao fere o dono: ' + hp0 + ' -> ' + p.hp);
  p.pos = home;
}
{ const c = mk({ mode: 'tdm', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const p = c.players.get('me'); park(c); p.alive = true; c.clock = 10;
  const en = [...c.players.values()].find(x => x.bot && c.enemies(p, x)), n0 = c.booms; drop(c, p); const b = c.boxes[0];
  en.alive = true; en.hp = 100; en.pos = [b.pos[0] + 1.2, b.pos[1], b.pos[2]];
  tick(c, A.time - 1); /* o bot inimigo perto atira nela sozinho */ ok(!c.boxes.includes(b) && c.booms === n0 + 1, 'bot inimigo perto destroi a tiro');
}
{ const c = mk({ mode: 'tdm', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const p = c.players.get('me'); park(c); p.alive = true;
  const n0 = c.booms; drop(c, p); tick(c, A.time - 1); ok(c.boxes.length === 1 && c.booms === n0, 'inteira antes dos ' + A.time + ' s');
  const en = [...c.players.values()].find(x => x.bot && c.enemies(p, x)), b = c.boxes[0]; en.alive = true; en.hp = 100; en.protUntil = 0; b.botT = 99; en.pos = [b.pos[0] + 1.2, b.pos[1], b.pos[2]]; const hp0 = p.hp, ehp = en.hp;
  p.pos = [b.pos[0] + 1, b.pos[1], b.pos[2]]; tick(c, 2); ok(c.boxes.length === 0 && c.booms === n0 + 1, 'explode em ' + A.time + ' s'); ok(p.hp === hp0, 'sozinha nao fere o dono'); ok(en.hp < ehp, 'sozinha fere o inimigo perto: ' + ehp + ' -> ' + en.hp);
}
{ const c = mk({ mode: 'tdm', map: 'vila', bots: 3 }); c.join('me', 'Eu'); const p = c.players.get('me'); park(c); p.alive = true; p.hp = 100; const n0 = c.booms; drop(c, p); const b = c.boxes[0]; b.botT = 99;
  const en = [...c.players.values()].find(x => x.bot && c.enemies(p, x)), ally = [...c.players.values()].find(x => x.bot && !c.enemies(p, x));
  en.alive = true; en.wpn = 'rifle'; en.lastWpn = 'rifle'; en.budget = 9999; en.pos = [b.pos[0] + 3, b.pos[1], b.pos[2]];
  const shot = (who, dmg) => c.handle(who.id, { t: 'hitAbx', id: b.id, dmg, wpn: 'rifle' });
  if (ally) { ally.alive = true; ally.wpn = 'rifle'; ally.lastWpn = 'rifle'; ally.budget = 9999; ally.pos = [b.pos[0] - 3, b.pos[1], b.pos[2]]; const h = b.hp; shot(ally, 20); ok(b.hp === h, 'aliado nao danifica'); ally.alive = false; ally.pos = [41, b.pos[1], 41]; }
  p.pos = [b.pos[0] + 1, b.pos[1], b.pos[2]]; const h = b.hp; shot(en, 20); ok(b.hp < h && c.boxes.includes(b), 'tiro inimigo tira vida: ' + h + ' -> ' + b.hp); const hp0 = p.hp;
  for (let i = 0; i < 12 && c.boxes.includes(b); i++) { en.budget = 9999; shot(en, 20); }
  ok(!c.boxes.includes(b) && c.booms === n0 + 1, 'sem vida explode'); ok(p.hp < hp0 || !p.alive, 'explosao a tiro fere o dono perto: ' + hp0 + ' -> ' + p.hp);
}
{ const c = mk({ mode: 'ffa', map: 'vila', bots: 2 }); c.join('me', 'Eu'); const p = c.players.get('me'), o = [...c.players.values()].find(x => x.bot); park(c); p.alive = true; drop(c, p); const b = c.boxes[0]; b.botT = 99; c.clock = 50; o.alive = true; o.pos = [...b.pos]; c.handle(o.id, { t: 'abx', id: b.id }); ok(b.uses === A.uses, 'Contra Todos: so o dono pega'); }
console.log(f ? f + ' FALHA(S)' : 'TUDO CERTO');
