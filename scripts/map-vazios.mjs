// Acha os vazios grandes de cada mapa (09/11): retangulos sem nenhuma peca, spawn, zona, objetivo ou trilho. node scripts/map-vazios.mjs [mapas] [lado minimo]
import { getMap, MAP_IDS } from '../shared/map.js';
const ids = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',') : MAP_IDS, MIN = +(process.argv[3] || 22), C = 2;
for (const id of ids) {
  const M = getMap(id), A = M.arena, n = Math.floor(A * 2 / C), busy = new Uint8Array(n * n), cell = (v) => Math.floor((v + A) / C);
  const mark = (x0, z0, x1, z1) => { for (let i = Math.max(0, cell(x0)); i <= Math.min(n - 1, cell(x1)); i++) for (let j = Math.max(0, cell(z0)); j <= Math.min(n - 1, cell(z1)); j++) busy[i * n + j] = 1; };
  for (const b of M.boxes) { if (b.max[1] < 0.35 || b.kind === 'forestedge') continue; const dx = b.max[0] - b.min[0], dz = b.max[2] - b.min[2]; if (dx > A * 1.7 && dz > A * 1.7) continue; mark(b.min[0], b.min[2], b.max[0], b.max[2]); }
  const pts = []; for (const l of Object.values(M.spawns || {})) for (const s of l) pts.push([s[0], s[s.length > 2 ? 2 : 1], 7]);
  for (const q of M.zones || []) pts.push([q.pos[0], q.pos[2], (q.r || 5) + 5]);
  for (const p of Object.values(M.flagBase || {})) pts.push([p[0], p[2], 8]);
  for (const p of M.pickups || []) { const a = p.pos || p; pts.push([a[0], a[2], 3]); }
  for (const p of M.track || []) pts.push([p[0], p[1], 8]);
  if (M.track) for (let i = 1; i < M.track.length; i++) { const [a, b] = [M.track[i - 1], M.track[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let k = 0; k < L; k += 4) { const u = k / L; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, 8]); } }
  for (const [x, z, r] of pts) mark(x - r, z - r, x + r, z + r);
  const out = [];
  for (let round = 0; round < 8; round++) {
    let best = null; const h = new Int32Array(n);
    for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) h[i] = busy[i * n + j] ? 0 : h[i] + 1;
      const st = []; for (let i = 0; i <= n; i++) { const v = i < n ? h[i] : 0; let s = i; while (st.length && st[st.length - 1][1] >= v) { const [p, t] = st.pop(), w = i - p, hh = t, a = w * hh; if (Math.min(w, hh) * C >= MIN && (!best || a > best.a)) best = { a, i: p, j: j - hh + 1, w, h: hh }; s = p; } st.push([s, v]); } }
    if (!best) break;
    const x0 = -A + best.i * C, z0 = -A + best.j * C; out.push({ x0, z0, x1: x0 + best.w * C, z1: z0 + best.h * C, area: best.a * C * C });
    for (let i = best.i; i < best.i + best.w; i++) for (let j = best.j; j < best.j + best.h; j++) busy[i * n + j] = 1;
  }
  const total = out.reduce((s, r) => s + r.area, 0);
  console.log(`${id.padEnd(10)} arena ${A} (${(2 * A) ** 2} m2) vazio ${total} m2 = ${(total / (4 * A * A) * 100).toFixed(0)}%`);
  for (const r of out) console.log(`   x ${r.x0}..${r.x1}  z ${r.z0}..${r.z1}  (${r.x1 - r.x0} x ${r.z1 - r.z0})`);
}
