// Procura tick lento ou erro no Core: 15 bots + 1 humano parado, N segundos de jogo por modo e mapa.
// node scripts/tick-trava.mjs [segundos] [modo,modo] [mapa,mapa]
import { Core, MAP_IDS, warmMaps } from '../shared/core.js';
const SECS = Number(process.argv[2]) || 120;
const modes = (process.argv[3] || 'ctf,tdm,dom,ffa').split(',');
const maps = (process.argv[4] || MAP_IDS.join(',')).split(',');
for (const mode of modes) for (const map of maps) {
  let err = null, worst = 0, worstAt = 0, frozen = 0;
  const c = new Core({ mode, map, bots: 15, lobby: false, send: () => {} });
  c.join('h1', 'humano');
  const prev = new Map();
  for (let t = 0; t < SECS; t += 1 / 30) {
    const a = performance.now();
    try { c.tick(1 / 30); } catch (e) { err = e; break; }
    const d = performance.now() - a; if (d > worst) { worst = d; worstAt = t; }
    if (Math.abs(t % 10) < 1 / 30 && t > 15) { // a cada 10 s: quantos bots vivos nao andaram nada
      let still = 0, alive = 0;
      for (const p of c.players.values()) { if (!p.bot || !p.alive) continue; alive++; const q = prev.get(p.id); if (q && Math.hypot(q[0] - p.pos[0], q[2] - p.pos[2]) < 0.5) still++; prev.set(p.id, [...p.pos]); }
      if (alive && still / alive > 0.8) frozen++;
    }
  }
  console.log(`${mode}/${c.M.id}: pior tick ${worst.toFixed(1)} ms em ${worstAt.toFixed(0)} s | janelas com 80% dos bots parados: ${frozen}${err ? ' | ERRO: ' + (err.stack || err).toString().split('\n').slice(0, 4).join(' / ') : ''}`);
}
