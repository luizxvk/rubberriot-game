// Armadilhas do Pulo do Gato (19/11, pedido dele): obstaculos de tempo, daqueles de jogo arcade/indie em que voce espera a
// hora certa pra passar ou pular. Tudo e funcao do relogio (o mesmo pra todo mundo), entao o desenho e o empurrao batem.
// Pegou = EMPURRAO (pedido dele: "tem que ter a fisica de empurrar"): o boneco e arremessado e, quase sempre, cai do percurso.
//  sweep  vassoura giratoria: barra rente ao topo girando em volta do poste do meio; pula por cima (barra ate 0,6 m)
//  hammer pendulo: martelo balancando de lado a lado atravessando a plataforma; passa quando ele estiver na ponta
//  piston socador: pistao que sai da lateral e varre o topo; espera recolher
//  stomp  esmagador: bloco que treme e despenca de cima; espera subir
//  jet    jato no vao: jato que sobe entre duas plataformas e arremessa pro alto; pula quando apagar
// Cada um passa no maximo ~45% do ciclo perigoso, e o gerador nunca poe dois seguidos sem plataforma livre no meio.
const TAU = Math.PI * 2;
export const TRAP_KINDS = ['sweep', 'hammer', 'piston', 'stomp', 'jet'];

// plats: [{ x, z, w, d, y, dr }] na ordem do percurso (0 = largada). R = sorteio do mapa (semente fixa)
export function makeTraps(plats, R) { // so nas plataformas que o percurso marcou (trap: nasceram largas, >= 4,2 m)
  const out = []; let bag = [], last = -9;
  const next = () => { if (!bag.length) { bag = [...TRAP_KINDS]; for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); };
  for (let i = 3; i < plats.length - 2; i++) {
    if (!plats[i].trap) continue;
    const P = plats[i], Q = plats[i - 1], small = Math.min(P.w, P.d);
    const gap = Math.hypot(Math.max(0, Math.abs(P.x - Q.x) - (P.w + Q.w) / 2), Math.max(0, Math.abs(P.z - Q.z) - (P.d + Q.d) / 2)); // vao real entre as bordas
    const ok = (k) => (k !== 'jet' || gap >= 1.8) && small >= 3.6; // base larga: da pra desviar e esperar em cima
    let kind = next();
    for (let n = 0; n < 6 && !ok(kind); n++) { const k = kind; kind = next(); bag.unshift(k); } // nao serve aqui: volta pro saco e vem o proximo
    if (!ok(kind)) continue;
    const ph = R() * 10, top = P.y;
    const fx = Math.sin(P.dr), fz = Math.cos(P.dr); // direcao do pulo que chega aqui
    const T = { kind, i, ph, top, x: P.x, z: P.z, w: P.w, d: P.d, fx, fz, px: fz, pz: -fx }; // p = de lado
    T.cs = clearSide(plats, i, T); // lado sem plataforma vizinha: o empurrao de lado vai pra la (senao o boneco cai no trecho ao lado)
    if (kind === 'sweep') { T.L = Math.min(P.w, P.d) / 2 + 0.35; T.P = 3.0 + R() * 1.2; T.dir = R() < 0.5 ? -1 : 1; }
    if (kind === 'hammer') { T.P = 2.2 + R() * 0.8; T.A = 1.05; T.Lr = 4.4; T.half = Math.abs(P.w * T.px) + Math.abs(P.d * T.pz); T.half = T.half / 2; }
    if (kind === 'piston') { T.P = 2.4 + R() * 0.6; T.half = (Math.abs(P.w * T.px) + Math.abs(P.d * T.pz)) / 2; T.side = R() < 0.5 ? -1 : 1; if (T.cs) T.side = -T.cs; } // o R() fica: mesma sequencia de sorteio
    if (kind === 'stomp') { T.P = 2.8 + R() * 0.6; T.s = Math.min(P.w, P.d) * 0.82; }
    if (kind === 'jet') { T.P = 2.6 + R() * 0.6; T.x = (P.x + Q.x) / 2; T.z = (P.z + Q.z) / 2; T.top = Math.min(P.y, Q.y); }
    out.push(T); last = i;
  }
  return out;
}

// +1/-1 = lado (em p) sem nenhuma outra plataforma num corredor de 3 a 14 m; 0 = os dois livres (ou os dois ocupados)
function clearSide(plats, i, T) {
  const busy = (s) => {
    for (let d = 3; d <= 14; d += 1) for (let f = -2; f <= 2; f += 2) {
      const x = T.x + T.px * s * d + T.fx * f, z = T.z + T.pz * s * d + T.fz * f;
      for (let j = 0; j < plats.length; j++) { if (j === i) continue; const Q = plats[j]; if (Math.abs(x - Q.x) <= Q.w / 2 + 0.8 && Math.abs(z - Q.z) <= Q.d / 2 + 0.8) return true; } // inclui a anterior/seguinte: na curva elas ficam de lado
    }
    return false;
  };
  const a = busy(1), b = busy(-1);
  return a === b ? 0 : a ? -1 : 1;
}

const cyc = (T, t) => (((t + T.ph) % T.P) + T.P) % T.P / T.P; // 0..1 dentro do ciclo
const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// estado de desenho (e de colisao) num instante
export function trapState(T, t) {
  const u = cyc(T, t);
  if (T.kind === 'sweep') return { a: T.dir * u * TAU };
  if (T.kind === 'hammer') { const w = TAU * u; return { th: T.A * Math.sin(w), dth: T.A * Math.cos(w) }; }
  if (T.kind === 'piston') { // parado 0-0,55 | soco 0,55-0,62 | segura ate 0,78 | recolhe ate 1
    const k = u < 0.55 ? 0 : u < 0.62 ? smooth(0.55, 0.62, u) : u < 0.78 ? 1 : 1 - smooth(0.78, 1, u);
    return { k, warn: u > 0.42 && u < 0.55, hot: u >= 0.55 && u < 0.86 };
  }
  if (T.kind === 'stomp') { // em cima 0-0,55 (treme 0,4-0,55) | cai ate 0,6 | embaixo ate 0,78 | sobe ate 1
    const h = u < 0.55 ? 1 : u < 0.6 ? 1 - smooth(0.55, 0.6, u) : u < 0.78 ? 0 : smooth(0.78, 1, u);
    return { h, warn: u > 0.4 && u < 0.55, hot: u >= 0.56 && u < 0.85 };
  }
  if (T.kind === 'jet') { // apagado 0-0,55 (borbulha 0,38-0,55) | jato 0,55-0,9 | apaga
    const on = u >= 0.55 && u < 0.9;
    return { on, warn: u > 0.38 && u < 0.55, k: on ? Math.min(1, (u - 0.55) / 0.05) * (u > 0.85 ? (0.9 - u) / 0.05 : 1) : 0 };
  }
  return {};
}
export const STOMP_UP = 4.2, HAMMER_PIVOT = 5.4;

// colisao com o boneco (pos = pes). Devolve o empurrao [vx, vy, vz] ou null
export function trapHit(T, t, pos) {
  const S = trapState(T, t), dx = pos[0] - T.x, dz = pos[2] - T.z, fy = pos[1] - T.top;
  if (T.kind === 'sweep') {
    if (fy < -0.3 || fy > 0.62) return null; // pulou por cima da barra
    const r = Math.hypot(dx, dz); if (r > T.L + 0.3 || r < 0.4) return null; // no pe do poste a barra passa por cima
    const ca = Math.cos(S.a), sa = Math.sin(S.a), off = Math.abs(dx * sa - dz * ca); // distancia ate a linha da barra
    if (off > 0.42) return null;
    const tx = -dz * T.dir, tz = dx * T.dir, tl = Math.hypot(tx, tz) || 1, ox = dx / (r || 1), oz = dz / (r || 1);
    // empurrao da barra (giro + pra fora), mas a parte "ao longo do percurso" fica no maximo 3 m/s: senao joga na plataforma seguinte/anterior
    const vx = tx / tl * 9 + ox * 4, vz = tz / tl * 9 + oz * 4, ap = vx * T.px + vz * T.pz, af = Math.max(-3, Math.min(3, vx * T.fx + vz * T.fz));
    const sd = T.cs || (ap < 0 ? -1 : 1);
    return [T.px * sd * 9.5 + T.fx * af, 5.5, T.pz * sd * 9.5 + T.fz * af];
  }
  if (T.kind === 'hammer') {
    const L = T.Lr, hs = Math.sin(S.th) * L, hy = HAMMER_PIVOT - Math.cos(S.th) * L; // cabeca: de lado (p) e altura acima do topo
    const ap = dx * T.px + dz * T.pz, af = dx * T.fx + dz * T.fz, cy = fy + 0.9;
    if (Math.abs(af) > 0.95 || Math.hypot(ap - hs, cy - hy) > 1.25) return null;
    const s = Math.sign(S.dth) || 1;
    return [T.px * s * 12, 6, T.pz * s * 12];
  }
  if (T.kind === 'piston') {
    if (!S.hot || S.k < 0.1 || fy < -0.3 || fy > 1.7) return null;
    const ap = (dx * T.px + dz * T.pz) * T.side, af = dx * T.fx + dz * T.fz; // ap: do lado do pistao (+half) pro outro
    const face = T.half + 0.5 - S.k * (2 * T.half + 0.6);
    if (Math.abs(af) > 1.0 || ap < face - 0.45 || ap > T.half + 0.6) return null;
    return [-T.px * T.side * 12, 4.5, -T.pz * T.side * 12];
  }
  if (T.kind === 'stomp') {
    if (!S.hot || S.h > 0.55 || fy < -0.3 || fy > 1.8) return null;
    const hs = T.s / 2 + 0.3; if (Math.abs(dx) > hs || Math.abs(dz) > hs) return null;
    const r = Math.hypot(dx, dz), sd = T.cs || (dx * T.px + dz * T.pz < 0 ? -1 : 1); // nunca pra frente no percurso: de lado, pro lado livre
    let ox = T.px * sd + (r > 0.2 ? dx / r * 0.5 : 0), oz = T.pz * sd + (r > 0.2 ? dz / r * 0.5 : 0); const ol = Math.hypot(ox, oz) || 1;
    return [ox / ol * 11, 3.5, oz / ol * 11];
  }
  if (T.kind === 'jet') {
    if (!S.on || S.k < 0.3 || Math.hypot(dx, dz) > 1.15 || fy < -4 || fy > 4.5) return null;
    const s = T.cs || (Math.sin(t * 3.7 + T.ph) < 0 ? -1 : 1);
    return [T.px * s * 5, 13, T.pz * s * 5];
  }
  return null;
}
