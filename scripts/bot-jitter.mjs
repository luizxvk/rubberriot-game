// Mede bot "tremendo" (13/11, pedido dele: bots flicando na parede): em janelas de 1 s, caminho percorrido x deslocamento.
// Andou > 1,5 m mas saiu do lugar < 25% disso = vai e volta (encostado na parede, rota trocando de lado).
// node scripts/bot-jitter.mjs [segundos] '[["tdm","xilindro"],...]'
import { Core } from '../shared/core.js';
const SECS = Number(process.argv[2]) || 120;
for (const [mode, map] of (process.argv[3] ? JSON.parse(process.argv[3]) : [['tdm', 'xilindro']])) {
  const c = new Core({ mode, map, bots: 8, lobby: false, send: () => {} });
  const st = new Map(), spots = new Map(); let bad = 0, win = 0, rub = 0, ticks = 0;
  const walls = c.M.boxes.filter(b => b.kind !== 'nogo' && b.kind !== 'roof' && b.max[1] - b.min[1] > 0.7);
  for (let t = 0, k = 0; t < SECS; t += 1 / 30, k++) {
    c.tick(1 / 30);
    for (const p of c.players.values()) {
      let s = st.get(p.id); if (!s) st.set(p.id, s = { prev: null, L: 0, start: null, n: 0, fight: 0 });
      if (!p.alive) { s.prev = null; s.start = null; s.L = 0; s.n = 0; continue; }
      if (k % 6 === 0 && !p.ai?.target) { ticks++; const y = p.pos[1]; for (const b of walls) { if (b.max[1] <= y + 0.6 || b.min[1] >= y + 1.6) continue; const dx = Math.max(b.min[0] - p.pos[0], 0, p.pos[0] - b.max[0]), dz = Math.max(b.min[2] - p.pos[2], 0, p.pos[2] - b.max[2]); if (Math.hypot(dx, dz) < 0.6) { rub++; const kk = `${Math.round(p.pos[0])},${Math.round(p.pos[2])},${b.kind}`; (globalThis.RS ||= new Map()).set(kk, ((globalThis.RS.get(kk)) || 0) + 1); break; } } }
      if (s.prev) s.L += Math.hypot(p.pos[0] - s.prev[0], p.pos[2] - s.prev[2]); else s.start = [...p.pos];
      s.prev = [...p.pos]; s.n++; if (p.ai?.target) s.fight++;
      if (s.n >= 30) {
        const D = Math.hypot(p.pos[0] - s.start[0], p.pos[2] - s.start[2]); win++;
        if (s.L > 1.5 && D < s.L * 0.25 && !s.fight) { bad++; const key = `${Math.round(p.pos[0] / 2) * 2},${Math.round(p.pos[2] / 2) * 2},${Math.round(p.pos[1])}`; spots.set(key, (spots.get(key) || 0) + 1); }
        s.start = [...p.pos]; s.L = 0; s.n = 0; s.fight = 0;
      }
    }
  }
  const top = [...spots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k}(${n})`).join(' ');
  if (globalThis.RS) { console.log([...globalThis.RS.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => k + "(" + n + ")").join(" ")); globalThis.RS = null; }
  console.log(`${map}/${mode}: tremendo ${(bad / win * 100).toFixed(1)}% | raspando na parede ${(rub / ticks * 100).toFixed(1)}% | ${top}`);
}
