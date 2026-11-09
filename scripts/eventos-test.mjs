// Eventos de fim de semana (08/11): texto PT/EN + icone de todos e as regras novas no Core. Uso: node scripts/eventos-test.mjs
import { EVENTS, EVENT_IDS, weekEvent } from '../shared/events.js';
import { Core } from '../shared/core.js';
import { readFileSync } from 'node:fs';
let f = 0; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) f++; };
const i18n = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8'), icons = readFileSync(new URL('../src/skillicons.js', import.meta.url), 'utf8');
for (const id of EVENT_IDS) {
  const cnt = (src, key) => src.split(key + ':').length - 1;
  const n = cnt(i18n, ' ev_' + id) + cnt(i18n, '{ ev_' + id), d = cnt(i18n, ' evd_' + id);
  ok(n === 2 && d === 2, `${id}: nome e descricao em PT e EN`);
  ok(cnt(icons, '  ' + EVENTS[id].icon) >= 1, `${id}: icone ${EVENTS[id].icon}`);
}
ok(weekEvent(new Date(2026, 10, 8, 12)) === 'faca', 'fim de semana de 08/11 continua Faca na Boca');
const run = (c, s) => { for (let i = 0; i < s * 10; i++) c.tick(0.1); };
for (const [mut, hp] of [['tanque', 200], ['casca', 40]]) { const c = new Core({ send: () => {}, mode: 'ffa', map: 'vila', bots: 0, lobby: false, mut }); c.local = true; c.join('me', 'Eu'); run(c, 2); const p = c.players.get('me'); ok(p.alive && p.hp === hp && p.maxHp === hp, `${mut}: nasce com ${hp} de vida (${p.hp})`); }
{ const c = new Core({ send: () => {}, mode: 'ffa', map: 'vila', bots: 0, lobby: false, mut: 'elastico' }); c.local = true; c.join('me', 'Eu'); run(c, 2); const p = c.players.get('me'); p.hp = 30; p.hurtAt = c.clock; run(c, 1); const a = p.hp; run(c, 2); ok(a < 32 && p.hp > 60, `elastico: espera e depois a vida volta (${Math.round(a)} -> ${Math.round(p.hp)})`); }
for (const mut of ['bacamarte', 'aguia']) { const c = new Core({ send: () => {}, mode: 'ffa', map: 'vila', bots: 0, lobby: false, mut }); c.local = true; c.join('me', 'Eu'); run(c, 2); const p = c.players.get('me'); ok(JSON.stringify([...p.owned].sort()) === JSON.stringify([...EVENTS[mut].kit].sort()), `${mut}: armas ${[...p.owned]}`); }
console.log(f ? f + ' FALHA(S)' : 'TUDO CERTO'); process.exit(f ? 1 : 0);
