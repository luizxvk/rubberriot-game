// Navegacao dos bots: grade de 1 m no chao de cada mapa + A* com rota esticada.
// Caixa que bate na altura do corpo (e nao da pra subir de passo) vira celula bloqueada,
// inflada pelo raio do bot pra ele nao raspar nas quinas.
const CELL = 1, RAD = 0.55, STEP = 0.5;

function grid(M) {
  if (M._nav) return M._nav;
  const A = M.arena + 2, N = Math.ceil((A * 2) / CELL);
  const block = new Uint8Array(N * N);
  for (const b of M.boxes) {
    if (b.max[1] <= STEP || b.min[1] >= 1.6) continue; // degrau baixo ou coisa la em cima
    const x0 = Math.max(0, Math.floor((b.min[0] - RAD + A) / CELL)), x1 = Math.min(N - 1, Math.floor((b.max[0] + RAD + A) / CELL));
    const z0 = Math.max(0, Math.floor((b.min[2] - RAD + A) / CELL)), z1 = Math.min(N - 1, Math.floor((b.max[2] + RAD + A) / CELL));
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) block[z * N + x] = 1;
  }
  return (M._nav = { A, N, block });
}

const cellOf = (g, x, z) => [Math.max(0, Math.min(g.N - 1, Math.floor((x + g.A) / CELL))), Math.max(0, Math.min(g.N - 1, Math.floor((z + g.A) / CELL)))];
const center = (g, cx, cz) => [cx * CELL - g.A + CELL / 2, cz * CELL - g.A + CELL / 2];
const free = (g, cx, cz) => cx >= 0 && cz >= 0 && cx < g.N && cz < g.N && !g.block[cz * g.N + cx];

// celula livre mais perto (o alvo pode estar em cima de uma caixa ou colado na parede)
function nearestFree(g, cx, cz) {
  if (free(g, cx, cz)) return [cx, cz];
  for (let r = 1; r < 12; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    if (free(g, cx + dx, cz + dz)) return [cx + dx, cz + dz];
  }
  return null;
}

// linha reta livre entre duas celulas (pra esticar a rota)
function clear(g, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
  for (let i = 1; i < n; i++) {
    const x = a[0] + dx * i / n, z = a[1] + dz * i / n;
    // checa a celula e as vizinhas do "corredor" (o bot tem largura)
    for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35]]) if (!free(g, Math.floor(x + 0.5 + ox), Math.floor(z + 0.5 + oz))) return false;
  }
  return true;
}

// rota de 'from' ate 'to' (posicoes [x,y,z]); devolve pontos [x,z] ja esticados, ou null
export function navPath(M, from, to, maxNodes = 6000) {
  const g = grid(M);
  const s = nearestFree(g, ...cellOf(g, from[0], from[2])), e = nearestFree(g, ...cellOf(g, to[0], to[2]));
  if (!s || !e) return null;
  const N = g.N, key = (x, z) => z * N + x;
  const gS = new Map([[key(...s), 0]]), came = new Map();
  const h = (x, z) => { const dx = Math.abs(x - e[0]), dz = Math.abs(z - e[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const open = [[h(...s), s[0], s[1]]];
  const closed = new Set();
  let n = 0, found = false;
  while (open.length && n++ < maxNodes) {
    // menor f (lista pequena o bastante; heap seria exagero aqui)
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, x, z] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    const k = key(x, z);
    if (closed.has(k)) continue;
    closed.add(k);
    if (x === e[0] && z === e[1]) { found = true; break; }
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!free(g, nx, nz)) continue;
      if (dx && dz && (!free(g, x + dx, z) || !free(g, x, z + dz))) continue; // nao corta quina
      const nk = key(nx, nz), cost = gS.get(k) + (dx && dz ? 1.414 : 1);
      if (cost >= (gS.get(nk) ?? Infinity)) continue;
      gS.set(nk, cost); came.set(nk, k);
      open.push([cost + h(nx, nz), nx, nz]);
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = key(...e); k !== undefined; k = came.get(k)) cells.push([k % N, Math.floor(k / N)]);
  cells.reverse();
  // estica: pula pontos que se enxergam em linha reta
  const out = [];
  let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && !clear(g, cells[i], cells[j])) j--;
    out.push(center(g, ...cells[j]));
    i = j;
  }
  return out;
}
