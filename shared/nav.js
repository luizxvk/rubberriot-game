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
const CELL = 0.5, RAD = 0.45, STEP = 0.6, BODY = 1.7, DUCK = 1.15; // DUCK: altura agachado (duto do banco)

// 08/11 (desempenho): monta a grade de um mapa antes de alguem jogar nele (no servidor, a 1a montagem congelava todas as salas ~70 ms)
export const warmNav = (M) => { grid(M); };
function grid(M) {
  if (M._nav) return M._nav;
  const A = M.arena + 2, N = Math.ceil((A * 2) / CELL);
  const floor = new Float32Array(N * N);
  const block = new Uint8Array(N * N);
  const low = new Uint8Array(N * N); // so passa agachado (teto entre DUCK e BODY): duto do Banco Ferradura (03/11)
  // empilhamento: caixa mais baixa primeiro, cada uma so vira chao se apoiar no chao atual
  const boxes = [...M.boxes].sort((a, b) => a.min[1] - b.min[1]);
  // indice por regiao de 8 m (04/11): mapa grande (deserto) testava toda caixa em cada celula = 2,5 s. Mesma ordem (de baixo pra cima)
  const BK = 8, NB = Math.ceil((A * 2) / BK), bins = Array.from({ length: NB * NB }, () => []);
  const binOf = (v) => Math.max(0, Math.min(NB - 1, Math.floor((v + A) / BK)));
  for (const b of boxes) for (let bz = binOf(b.min[2] - RAD); bz <= binOf(b.max[2] + RAD); bz++) for (let bx = binOf(b.min[0] - RAD); bx <= binOf(b.max[0] + RAD); bx++) bins[bz * NB + bx].push(b);
  const near = (x, z) => bins[binOf(z) * NB + binOf(x)];
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const x = cx * CELL - A + CELL / 2, z = cz * CELL - A + CELL / 2;
    let f = 0;
    for (const b of near(x, z)) {
      if (x < b.min[0] || x > b.max[0] || z < b.min[2] || z > b.max[2]) continue;
      if ((b.min[1] <= f + 0.05 || b.deck) && b.max[1] > f) f = b.max[1]; // deck: tabuleiro de viaduto que o trilho cruza (sobe pela rampa)
    }
    floor[cz * N + cx] = f;
  }
  // bloqueio: algo na altura do corpo encostando no raio do bot (parede, quina, cano baixo)
  for (let cz = 0; cz < N; cz++) for (let cx = 0; cx < N; cx++) {
    const i = cz * N + cx, f = floor[i];
    const x = cx * CELL - A + CELL / 2, z = cz * CELL - A + CELL / 2;
    for (const b of near(x, z)) {
      if (x < b.min[0] - RAD || x > b.max[0] + RAD || z < b.min[2] - RAD || z > b.max[2] + RAD) continue;
      if (b.max[1] <= f + STEP || b.min[1] >= f + BODY) continue; // da pra subir, ou passa por cima da cabeca
      if (b.min[1] >= f + DUCK) { low[i] = 1; continue; } // teto baixo: agachado passa
      block[i] = 1; break;
    }
  }
  return (M._nav = { A, N, floor, block, low });
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
// ponto onde da pra ficar de pe (nao encostado em parede; teto baixo do duto tambem nao: ninguem nasce ali)
export function standable(M, x, z) {
  // topo do muro de borda conta como "andavel" na grade: nascer/cair ali jogava o bot pra fora da arena
  if (Math.abs(x) > M.arena - 0.6 || Math.abs(z) > M.arena - 0.6) return false;
  const g = grid(M), [cx, cz] = cellOf(g, x, z);
  return walk(g, cx, cz) && !g.low[cz * g.N + cx];
}
// teto baixo aqui (o bot anda agachado)
export function lowAt(M, x, z) {
  const g = grid(M), [cx, cz] = cellOf(g, x, z);
  return !!g.low[cz * g.N + cx];
}
// bot enroscado (03/11): uma celula andavel perto (1 a 4 m), no mesmo piso, sorteada entre as mais perto. Serve de
// direcao pra sair e, em ultimo caso, de lugar pra empurrar o corpo
export function freeNear(M, pos) {
  const g = grid(M), [cx, cz] = cellOf(g, pos[0], pos[2]), out = [];
  for (let r = 2; r <= 8 && out.length < 3; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = cx + dx, z = cz + dz;
      if (!walk(g, x, z) || Math.abs(hAt(g, x, z) - pos[1]) > 0.7) continue;
      // as vizinhas tambem livres: nao devolve uma celula espremida na quina
      if (!walk(g, x + 1, z) || !walk(g, x - 1, z) || !walk(g, x, z + 1) || !walk(g, x, z - 1)) continue;
      out.push(center(g, x, z));
    }
  }
  return out.length ? out[Math.floor(Math.random() * out.length)] : null;
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
function clear(g, a, b, noLow = false) {
  const dx = b[0] - a[0], dz = b[1] - a[1], n = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2);
  let px = a[0], pz = a[1];
  for (let i = 1; i <= n; i++) {
    const x = a[0] + dx * i / n, z = a[1] + dz * i / n;
    // a celula e as vizinhas do "corredor" (o bot tem largura)
    for (const [ox, oz] of [[0, 0], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35]]) {
      const cx = Math.floor(x + 0.5 + ox), cz = Math.floor(z + 0.5 + oz);
      if (!walk(g, cx, cz) || (noLow && g.low[cz * g.N + cx])) return false;
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

// mapa com duas regioes ligadas por UMA porta (Estudio Tinteiro + Floresta em volta, 03/11): a rota longa nao fecha
// no A* curto dos bots (8 mil celulas) e o bot ia reto na parede. Entao vai por etapas: estudio <-> mata pela porta;
// dentro da mata, se a reta corta o estudio, contorna pelo canto do anel. M.portal = { r, in:[x,z], out:[x,z], k }
export function hop(M, from, goal) {
  const P = M.portal; if (!P) return goal;
  const inS = (x, z) => Math.max(Math.abs(x), Math.abs(z)) < P.r, at = (x, z) => [x, floorAt(M, x, z), z];
  const a = inS(from[0], from[2]), b = inS(goal[0], goal[2]);
  let t = goal;
  if (a !== b) {
    const mine = a ? P.in : P.out, other = a ? P.out : P.in;
    if (Math.hypot(from[0] - mine[0], from[2] - mine[1]) > 1.6) t = at(mine[0], mine[1]);
    else return at(other[0], other[1]); // na porta: atravessa
  }
  if (a) return t;
  // reta corta o quadrado do estudio (com folga)? (Liang-Barsky)
  const R = P.r + 1.2, cross = (p, q) => {
    let t0 = 0, t1 = 1; const dx = q[0] - p[0], dz = q[1] - p[1];
    for (const [pp, qq] of [[-dx, p[0] + R], [dx, R - p[0]], [-dz, p[1] + R], [dz, R - p[1]]]) {
      if (pp === 0) { if (qq < 0) return false; continue; }
      const r = qq / pp; if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
  };
  const f = [from[0], from[2]], g = [t[0], t[2]];
  if (!cross(f, g)) return t;
  const D = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  let best = null, bs = Infinity;
  for (const c of [[-P.k, -P.k], [P.k, -P.k], [P.k, P.k], [-P.k, P.k]]) {
    if (D(f, c) < 2 || cross(f, c)) continue;
    const s = D(f, c) + D(c, g) + (cross(c, g) ? 30 : 0);
    if (s < bs) { bs = s; best = c; }
  }
  return best ? at(best[0], best[1]) : t;
}

// rota de 'from' ate 'to' (posicoes [x,y,z]); devolve pontos [x,z] ja esticados, ou null
// noLow (03/11): o bot que nao gosta do duto contorna (cada bot sorteia; antes todos iam pelo duto, o mais curto)
export function navPath(M, from, to, maxNodes = 60000, noLow = false) {
  const g = grid(M);
  const s = nearestWalk(g, ...cellOf(g, from[0], from[2]), from[1]), e = nearestWalk(g, ...cellOf(g, to[0], to[2]), to[1]);
  if (!s || !e) return null;
  // enxerga o destino num corredor andavel: nem precisa de busca (o caso comum em campo aberto)
  if (clear(g, s, e, noLow)) return [center(g, ...e)];
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
      if (noLow && g.low[nz * N + nx] && !g.low[z * N + x]) continue; // nao entra no duto (se ja esta dentro, sai)
      if (dx && dz && (!pass(g, x, z, x + dx, z) || !pass(g, x, z, x, z + dz))) continue; // nao corta quina
      const nk = nz * N + nx, c = ck + (dx && dz ? 1.414 : 1) * (g.low[nk] ? 2 : 1); // agachado anda mais devagar
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
    while (j > i + 1 && !clear(g, cells[i], cells[j], noLow)) j--;
    out.push(center(g, ...cells[j]));
    i = j;
  }
  return out;
}
