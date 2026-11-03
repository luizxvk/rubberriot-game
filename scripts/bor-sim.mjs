// Noite dos Borroes sem grafico: so bots aliados contra as ondas no Estudio Tinteiro.
// Mostra onda a onda: quantos viloes cairam, quem caiu do time, pontos, vilao preso, chefao. Fim quando o time cai.
// node scripts/bor-sim.mjs [bots=3] [segundos=900] [dificuldade=1]
import { Core } from '../shared/core.js';
const BOTS = Number(process.argv[2]) || 3, SECS = Number(process.argv[3]) || 900, DIFF = Number(process.argv[4]) || 1;
const evs = [];
const c = new Core({ mode: 'borroes', bots: BOTS, difficulty: DIFF, lobby: false, send: (to, m) => { if (m.t === 'ev') evs.push(m); } });
const team = () => [...c.players.values()].filter(p => !p.mob);
if (process.env.WAVE) { c.bor.wave = Number(process.env.WAVE) - 1; for (const p of team()) p.cash = 5000; } // pula pra onda N (testar chefao)
if (process.env.OPEN) { for (const d of c.M.bor.doors) { c.bor.doors.delete(d.id); c.bor.open.add(d.id); } } // todas as salas abertas
console.log(`mapa ${c.M.id} | time: ${team().map(p => p.name + '(' + p.team + ')').join(', ')}`);
const count = {}, dmgBy = {}; const mobHist = new Map(); let stuck = 0, stuckAt = new Map(), wave = 0, t = 0;
const dt = 1 / 30;
for (; t < SECS && !c.over; t += dt) {
  c.tick(dt);
  for (const e of evs.splice(0)) {
    count[e.k] = (count[e.k] || 0) + 1;
    if (e.k === 'hurt') { const a = c.players.get(e.a), v = c.players.get(e.v); if (a?.mob && v && !v.mob) dmgBy[a.mob] = (dmgBy[a.mob] || 0) + e.dmg; }
    if (e.k === 'borWave') { console.log(`[${t.toFixed(0)}s] ONDA ${e.n}${e.boss ? ' (chefao ' + e.boss + ')' : ''} | fila ${c.bor.queue.length} | pontos ${team().map(p => Math.round(p.cash)).join('/')} | de pe ${team().filter(p => p.alive && !(p.down > 0)).length}`); wave = e.n; }
    if (e.k === 'borBoss') console.log(`   chefao nasceu: ${e.kind} hp ${c.players.get(e.id)?.hp}`);
    if (e.k === 'borPhase') console.log(`   Rei fase ${e.n}`);
    if (e.k === 'borClear') console.log(`   onda ${e.n} limpa em ${t.toFixed(0)}s`);
  }
  // vilao parado longe de todo mundo por 8 s = preso
  if (Math.abs((t * 30) % 30) < 0.5) for (const p of c.players.values()) {
    if (!p.mob || !p.alive) continue;
    const h = mobHist.get(p.id) || []; mobHist.set(p.id, h); h.push([...p.pos]); if (h.length > 8) h.shift();
    const tgt = p.ai.target;
    if (h.length === 8 && Math.hypot(h[7][0] - h[0][0], h[7][2] - h[0][2]) < 1 && (!tgt || Math.hypot(tgt.pos[0] - p.pos[0], tgt.pos[2] - p.pos[2]) > 4) && !(p.mob === 'cuspidor')) {
      stuck++; const k = `${p.mob}@${Math.round(p.pos[0])},${Math.round(p.pos[1])},${Math.round(p.pos[2])}`; stuckAt.set(k, (stuckAt.get(k) || 0) + 1); h.length = 0;
    }
  }
}
console.log(`\nFIM em ${t.toFixed(0)}s | over=${c.over} | onda ${c.bor.wave} | placar ${JSON.stringify(c.teamScore)}`);
console.log('eventos:', Object.entries(count).filter(([k]) => /^(bor|down|revive|pump|kill)/.test(k)).map(([k, n]) => k + ':' + n).join(' '));
console.log('time:', team().map(p => `${p.name} k${p.kills} d${p.deaths} $${Math.round(p.cash)} wpn=${p.wpn}`).join(' | '));
console.log(`viloes presos: ${stuck}`, [...stuckAt.entries()].slice(0, 12).map(([k, n]) => k + 'x' + n).join(' '));
console.log('dano no time por vilao:', JSON.stringify(dmgBy));
const left = [...c.players.values()].filter(p => p.mob && p.alive);
if (left.length) console.log('viloes vivos no fim:', left.map(p => `${p.mob}@${p.pos.map(v => v.toFixed(1)).join(',')} alvo=${p.ai.target?.name}@${p.ai.target?.pos.map(v => v.toFixed(1)).join(',')}`).join(' | '), '| fila', c.bor.queue.length);
console.log('time no fim:', team().map(p => `${p.name}${p.alive ? '' : '(morto)'}${p.down > 0 ? '(caido)' : ''}@${p.pos.map(v => v.toFixed(1)).join(',')} goal=${p.ai?.goal?.map(v => v.toFixed(1)).join(',')} alvo=${p.ai?.target?.mob || p.ai?.target?.name || '-'} resc=${p.ai?.rescue ? 1 : 0}`).join(' | '));
