// Navegacao dos bots: grade de alturas de 0,5 m em cada mapa + A* com rota esticada.
//
// Cada celula guarda a altura do CHAO ali (caixas apoiadas no chao, empilhadas uma
// em cima da outra: degrau, plataforma, caixote). Da pra passar pra vizinha se o
// degrau de subida for no maximo STEP (o mesmo que a fisica sobe sozinha); descer
// pode de qualquer altura. Assim o bot sobe escada e plataforma, e passa por baixo
// de passarela (caixa que nao encosta no chao nao vira chao).
//
// Antes era so "livre/bloqueado" e todo degrau acima do primeiro virava parede:
// o bot nunca subia escada e o ponto B da dominacao era inalcancavel.
// celula de 0,5 m: com 1 m a grade pulava degrau (escada de 0,67 m virava desnivel de 1 m)
const CELL = 0.5, RAD = 0.45, STEP = 0.6, BODY = 1.7;

function grid(M) {
  if (M._nav) return M._nav;
  const A = M.arena + 2, N = Math.ceil((A * 2) / CELL);
  const floor = new Float32Array(N * N);
  const block = new Uint8Array(N * N);
  // empilhamento: caixa mais baixa primeiro, cada uma so vira chao se apoiar no chao atual
  const boxes = [...M.boxes].sort((a, b) => a.min[1] - b.min[1]);
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const x = cx * CELL - A + CELL / 2, z = cz * CELL - A + CELL / 2;
    let f = 0;
    for (const b of boxes) {
      if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
      if (b.min[1] <= f + 0.05 && b.max[1] > f) f = b.max[1];
    }
    floor[cz * N + cx] = f;
  }
  // bloqueio: algo na altura do corpo encostando no raio do bot (parede, quina, cano baixo)
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const i = cz * N + cx, f = floor[i];
    const x = cx * CELL - A + CELL / 2, z = cz * CELL - A + CELL / 2;
    for (const b of M.boxes) {
      if (x < b.min[0] - RAD || x > b.max[0] + RAD || z < b.min[2] - RAD || z > b.max[2] + RAD) continue;
      if (b.max[1] <= f + STEP || b.min[1] >= f + BODY) continue; // da pra subir, ou passa por cima da cabeca
      block[i] = 1; break;
    }
  }
  return (M._nav = { A, N, floor, block });
}

const cellOf = (g, x, z) => [Math.max(0, Math.min(g.N - 1, Math.floor((x + g.A) / CELL))), Math.max(0, Math.min(g.N - 1, Math.floor((z + g.A) / CELL)))];
const center = (g, cx, cz) => [cx * CELL - g.A + CELL / 2, cz * CELL - g.A + CELL / 2];
const inside = (g, cx, cz) => cx >= 0 && cz >= 0 && cx < g.N && cz < g.N;
const walk = (g, cx, cz) => inside(g, cx, cz) && !g.block[cz * g.N + cx];
const hAt = (g, cx, cz) => g.floor[cz * g.N + cx];
// passa de a pra b: subida no maximo STEP, descida livre
const pass = (g, ax, az, bx, bz) => walk(g, bx, bz) && hAt(g, bx, bz) - hAt(g, ax, az) <= STEP;

// altura do chao num ponto do mapa (spawn usa pra nao nascer dentro de caixa)
export function floorAt(M, x, z) {
  const g = grid(M), [cx, cz] = cellOf(g, x, z);
  return hAt(g, cx, cz);
}
// ponto onde da pra ficar de pe (nao encostado em parede)
export function standable(M, x, z) {
  // topo do muro de borda conta como "andavel" na grade: nascer/cair ali jogava o bot pra fora da arena
  if (Math.abs(x) > M.arena - 0.6 || Math.abs(z) > M.arena - 0.6) return false;
  const g = grid(M), [cx, cz] = cellOf(g, x, z);
  return walk(g, cx, cz);
}

// celula andavel mais perto; empata pela altura mais proxima do alvo (alvo em cima da plataforma)
function nearestWalk(g, cx, cz, y) {
  if (walk(g, cx, cz) && Math.abs(hAt(g, cx, cz) - y) < 1.2) return [cx, cz];
  let best = null, bs = Infinity;
  for (let r = 0; r < 12; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !walk(g, cx + dx, cz + dz)) continue;
      const s = r + Math.abs(hAt(g, cx + dx, cz + dz) - y) * 0.8;
      if (s < bs) { bs = s; best = [cx + dx, cz + dz]; }
    }
    if (best && bs <= r + 0.5) return best;
  }
  return best;
}

// linha reta andavel entre duas celulas (pra esticar a rota)
function clear(g, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
  let px = a[0], pz = a[1];
  for (let i = 1; i <= n; i++) {
    const x = a[0] + dx * i / n, z = a[1] + dz * i / n;
    // a celula e as vizinhas do "corredor" (o bot tem largura)
    for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35]]) {
      const cx = Math.floor(x + 0.5 + ox), cz = Math.floor(z + 0.5 + oz);
      if (!walk(g, cx, cz)) return false;
    }
    const cx = Math.round(x), cz = Math.round(z);
    if ((cx !== px || cz !== pz) && !pass(g, px, pz, cx, cz)) return false;
    px = cx; pz = cz;
  }
  return true;
}

// memoria da busca, presa na grade e reaproveitada: antes cada rota criava Map/Set novos de ate 60 mil
// entradas (90% do tempo do servidor na ilha era isso + coleta de lixo). "epoca" marca o que vale nesta busca.
function scratch(g) {
  if (g.sc) return g.sc;
  const n = g.N * g.N;
  return (g.sc = { cost: new Float32Array(n), came: new Int32Array(n), seen: new Uint32Array(n), done: new Uint32Array(n), ep: 0, hf: new Float64Array(4096), hk: new Int32Array(4096), hn: 0 });
}
// heap minimo em dois arrays paralelos (f, celula)
function hpush(S, f, k) {
  if (S.hn >= S.hf.length) { const nf = new Float64Array(S.hf.length * 2), nk = new Int32Array(S.hk.length * 2); nf.set(S.hf); nk.set(S.hk); S.hf = nf; S.hk = nk; }
  const F = S.hf, K = S.hk; let i = S.hn++;
  while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; F[i] = F[p]; K[i] = K[p]; i = p; }
  F[i] = f; K[i] = k;
}
function hpop(S) {
  const F = S.hf, K = S.hk, top = K[0], n = --S.hn;
  if (n > 0) {
    const f = F[n], k = K[n]; let i = 0;
    for (;;) { const l = i * 2 + 1; if (l >= n) break; const r = l + 1, m = r < n && F[r] < F[l] ? r : l; if (F[m] >= f) break; F[i] = F[m]; K[i] = K[m]; i = m; }
    F[i] = f; K[i] = k;
  }
  return top;
}

// rota de 'from' ate 'to' (posicoes [x,y,z]); devolve pontos [x,z] ja esticados, ou null
export function navPath(M, from, to, maxNodes = 60000) {
  const g = grid(M);
  const s = nearestWalk(g, ...cellOf(g, from[0], from[2]), from[1]), e = nearestWalk(g, ...cellOf(g, to[0], to[2]), to[1]);
  if (!s || !e) return null;
  // enxerga o destino num corredor andavel: nem precisa de busca (o caso comum em campo aberto)
  if (clear(g, s, e)) return [center(g, ...e)];
  const N = g.N, S = scratch(g);
  if (++S.ep >= 0xffffffff) { S.seen.fill(0); S.done.fill(0); S.ep = 1; }
  const ep = S.ep, cost = S.cost, came = S.came, seen = S.seen, done = S.done;
  const ex = e[0], ez = e[1];
  const h = (x, z) => { const dx = Math.abs(x - ex), dz = Math.abs(z - ez); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const sk = s[1] * N + s[0];
  S.hn = 0; seen[sk] = ep; cost[sk] = 0; came[sk] = -1; hpush(S, h(s[0], s[1]), sk);
  let n = 0, found = false;
  while (S.hn && n++ < maxNodes) {
    const k = hpop(S);
    if (done[k] === ep) continue;
    done[k] = ep;
    const x = k % N, z = (k - x) / N;
    if (x === ex && z === ez) { found = true; break; }
    const ck = cost[k];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = x + dx, nz = z + dz;
      if (!pass(g, x, z, nx, nz)) continue;
      if (dx && dz && (!pass(g, x, z, x + dx, z) || !pass(g, x, z, x, z + dz))) continue; // nao corta quina
      const nk = nz * N + nx, c = ck + (dx && dz ? 1.414 : 1);
      if (seen[nk] === ep && c >= cost[nk]) continue;
      seen[nk] = ep; cost[nk] = c; came[nk] = k;
      hpush(S, c + h(nx, nz), nk);
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = ez * N + ex; k !== -1; k = came[k]) cells.push([k % N, Math.floor(k / N)]);
  cells.reverse();
  // estica: pula pontos que se enxergam em linha reta (e o caminho entre eles e andavel)
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
