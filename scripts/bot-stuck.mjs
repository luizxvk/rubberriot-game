// Mede bot travado: roda a partida sem grafico e conta janelas de 6 s em que o bot vivo andou < 1 m.
// node scripts/bot-stuck.mjs [segundos]
import { Core } from '../shared/core.js';
const SECS = Number(process.argv[2]) || 180;
for (const [mode, map] of [['tdm', 'vila'], ['ffa', 'fabrica'], ['ctf', 'fronteira'], ['dom', 'vila']]) {
  const c = new Core({ mode, map, bots: 8, lobby: false, send: () => {} });
  const hist = new Map(), spots = new Map();
  let stuck = 0, windows = 0;
  for (let t = 0; t < SECS; t += 1 / 30) {
    c.tick(1 / 30);
    if (Math.abs(t % 1) > 1 / 30) continue;
    for (const p of c.players.values()) {
      const h = hist.get(p.id) || []; hist.set(p.id, h);
      h.push(p.alive ? [...p.pos, p.ai?.target ? 1 : 0] : null);
      if (h.length > 6) h.shift();
      if (h.length < 6 || h.some(x => !x)) continue;
      windows++;
      const d = Math.hypot(h[5][0] - h[0][0], h[5][2] - h[0][2]);
      if (d < 1 && !h.some(x => x[3])) { stuck++; const k = `${Math.round(h[5][0] / 4) * 4},${Math.round(h[5][2] / 4) * 4}`; spots.set(k, (spots.get(k) || 0) + 1); }
    }
  }
  const top = [...spots.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k}(${n})`).join(' ');
  console.log(`${map}/${mode}: travado ${(stuck / windows * 100).toFixed(1)}% das janelas | pontos: ${top}`);
}
