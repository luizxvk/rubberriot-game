// Roube o Cofre (03/11, ideia dele). Melhor de 4 rodadas: cada time ataca 2 (vermelho nas 2 primeiras).
// Ataque segura a area do cofre ate arrombar (defensor dentro pausa), pega as bolsas uma por vez e leva ate a
// van de fuga; cada entrega da +30 s. Meta: $5.000 na rodada. Tempo acabou = a defesa leva a rodada.
// Geografia fixa: a van fica na base do SUL (onde nasce o vermelho) e o cofre no lado NORTE; quem ataca nasce
// sempre perto da van, seja de que cor for. Bolsa no chao: atacante pega de novo, defensor encosta = volta.
import { HEIST, SMUGGLE, TRAIN_HEIST } from './weapons.js';
import { hasLOS } from './map.js';
import { BOMB_SITES } from './map.js';
import { floorAt, standable } from './nav.js';

export const HEIST_MAPS = ['ferradura', 'moeda']; // 04/11 (pedido dele): o Cofre roda no Banco Ferradura e na Casa da Moeda
const r1 = (v) => Math.round(v * 10) / 10;
const other = (t) => (t === 'red' ? 'blue' : 'red');

// cofre no ponto A da bomba (chao de pe garantido); van na base do sul
export function heistPoints(M) {
  if (M.heistPts?.lux) { const P = M.heistPts, at = (q) => [q[0], floorAt(M, q[0], q[1]), q[1]]; return { vault: at(P.vault), lux: at(P.lux), van: at(P.van), drop: P.drop }; } // Roubo ao Trem (19/11): pontos exatos (dentro do vagao o `clear` empurrava pra fora)
  if (M.heistPts) return { vault: clear(M, M.heistPts.vault[0], M.heistPts.vault[1], 1.6), van: [M.heistPts.van[0], floorAt(M, M.heistPts.van[0], M.heistPts.van[1]), M.heistPts.van[1]], ...(M.heistPts.drop ? { drop: M.heistPts.drop } : {}) }; // drop (13/11): a entrega e um caminhao (Vila Muamba), nao o barco // mapa com pontos proprios (Cais: pilha e barco)
  const s = BOMB_SITES[M.id] || { A: [M.zones[0].pos[0], M.zones[0].pos[2]] };
  // van no meio de onde o ataque nasce (na ponta do mapa ficava longe demais: quem carregava morria no caminho)
  // (o ponto de nascimento mais perto do centro deles: e chao de verdade; a media caia em cima de tanque na Refinaria)
  const vx = s.A[0], vz = s.A[1], R = M.spawns.red, Z = (p) => p[2] ?? p[1], ax = R.reduce((t, p) => t + p[0], 0) / R.length, az = R.reduce((t, p) => t + Z(p), 0) / R.length;
  const sp = R.reduce((b, p) => (Math.hypot(p[0] - ax, Z(p) - az) < Math.hypot(b[0] - ax, Z(b) - az) ? p : b), R[0]);
  return { vault: clear(M, vx, vz, 2.4), van: clear(M, sp[0], Z(sp), 3.2) };
}

// lugar livre mais perto do ponto: nenhuma caixa do mapa a menos de r (03/11: no Estaleiro o cofre encostava num caixote
// e quem entrava no vao ficava preso entre os dois; a van ficava meio em cima de degrau). Chao plano embaixo. Anda em aneis de 0,5 m ate 6 m; sem lugar livre, fica no ponto.
function clear(M, x, z, r) {
  const free = (cx, cz) => { const y = floorAt(M, cx, cz); if ([[-r, -r], [r, -r], [-r, r], [r, r]].some(([a, b]) => Math.abs(floorAt(M, cx + a, cz + b) - y) > 0.05)) return false; return !M.boxes.some(b => b.max[1] > y + 0.3 && b.min[1] < y + 3.5 && b.max[0] > cx - r && b.min[0] < cx + r && b.max[2] > cz - r && b.min[2] < cz + r); };
  for (let d = 0; d <= 6; d += 0.5) for (let k = 0; k < (d ? 16 : 1); k++) {
    const cx = x + Math.sin(k / 16 * Math.PI * 2) * d, cz = z + Math.cos(k / 16 * Math.PI * 2) * d;
    if (free(cx, cz)) return [r1(cx), r1(floorAt(M, cx, cz)), r1(cz)];
  }
  return [x, floorAt(M, x, z), z];
}

// cofre e van solidos (03/11, ele atravessava os dois): caixas giradas iguais ao bonde (M.dyn). Medidas dos modelos
// do Tripo na escala do heistview (cofre 3,8 m de altura; van 5,2 m de comprimento). Giro = o mesmo da cena.
// ---------- Roubo ao Trem: chegada, portas e partida (19/11 b) ----------
// st: 0 esperando (escondido no tunel oeste), 1 chegando (freia), 2 parado com portas abertas, 3 fechando (avisou, ejetou), 4 partindo, 5 foi embora
export const TR = { wait: 0, arrive: 1, open: 2, closing: 3, leave: 4, gone: 5 };
const trSt = (H) => (Array.isArray(H?.tr) ? H.tr[0] : H?.tr?.st ?? TR.open);
const trX = (H) => (Array.isArray(H?.tr) ? H.tr[1] : H?.tr?.x ?? 0);
// colisao do mapa por estado: sem trem (trilho livre), trem com portas abertas (M.boxes do mapa) e trem fechado (portas solidas)
export function trainSets(M) {
  if (M._trSets) return M._trSets;
  const open = M._trOpen ||= M.boxes;
  return (M._trSets = { open, none: open.filter(b => !b.train), closed: open.concat(M.trainDoors || []) });
}
export function trainBoxesFor(M, H) {
  if (!M.trainDoors || H?.kind !== 'train') return M._trOpen || M.boxes;
  const S = trainSets(M), st = trSt(H);
  return st === TR.open ? S.open : st === TR.closing ? S.closed : S.none;
}
// trem andando: um bloco solido por vagao (empurra quem esta no trilho); parado a colisao e a detalhada do mapa
function trainDyn(M, H) {
  const st = trSt(H); if (!M?.boxes || (st !== TR.arrive && st !== TR.leave)) return [];
  const x = trX(H), out = [];
  for (const b of trainSets(M).open) if (b.kind === 'tchassis') out.push({ x: (b.min[0] + b.max[0]) / 2 + x, y: 0, z: 0, yaw: 0, hw: (b.max[0] - b.min[0]) / 2, hl: (b.max[2] - b.min[2]) / 2, h: 4.9 });
  return out;
}
export const inTrain = (M, H, p) => { const [a, b] = M.trainX || [-39, 39.4], x = p.pos[0] - trX(H); return x > a && x < b && Math.abs(p.pos[2]) < 2.85 && p.pos[1] > 0.55; };
export const heistFace = (H) => Math.atan2(H.van[0] - H.vault[0], H.van[2] - H.vault[2]);
export function heistBoxes(H, M) {
  if (H.kind === 'train') return trainDyn(M, H); // trem andando = bloco por vagao; parado nada (a colisao e a do mapa)
  if (H.kind === 'smuggle') return []; // Contrabando: pilha e barco sao do mapa
  const f = heistFace(H);
  return [
    { x: H.vault[0], y: H.vault[1], z: H.vault[2], yaw: f, hw: 1.55, hl: 1.5, h: 3.8 },
    { x: H.van[0], y: H.van[1], z: H.van[2], yaw: f + Math.PI, hw: 1.4, hl: 2.6, h: 3.0 },
  ];
}

// regras da rodada: o Cofre usa HEIST; o Contrabando (04/11) usa HEIST com o que muda por cima (SMUGGLE)
const TRAIN_K = { ...HEIST, ...TRAIN_HEIST, nearY: 0.7 }, SMUGGLE_K = { ...HEIST, ...SMUGGLE };
export const heistCfg = (H) => (H?.kind === 'smuggle' ? SMUGGLE_K : H?.kind === 'train' ? TRAIN_K : HEIST);
// Trem: as primeiras `cash` sao malotes do vagao-forte; o resto, caixas de joias do vagao de luxo (src = de onde saem e pra onde voltam)
const newBags = (K = HEIST, kind) => Array.from({ length: K.bags }, (_, i) => { const jw = kind === 'train' && i >= K.cash; return { id: i, state: 'vault', carrier: null, pos: null, dropT: 0, src: jw ? 'lux' : 'vault', jewel: jw, val: jw ? K.jewelValue : K.bagValue }; });

export function heistInit(c) {
  const P = heistPoints(c.M);
  const kind = c.mode === 'smuggle' ? 'smuggle' : c.mode === 'trem' ? 'train' : 'heist', K = heistCfg({ kind });
  c.heist = { ...P, kind, round: 1, atk: 'red', crack: 0, open: kind === 'smuggle', state: kind === 'smuggle' ? 'open' : 'idle', bags: newBags(K, kind), money: 0, total: { red: 0, blue: 0 }, wins: { red: 0, blue: 0 }, roundT: 0 };
  c.time = HEIST.time;
  c.teamScore.red = 0; c.teamScore.blue = 0;
  if (kind === 'train') c.heist.tr = { st: TR.wait, t: 0, x: -K.off };
}

// nasce: ataque perto da van (sul), defesa no lado do cofre (norte)
export function heistSpawns(c, team) {
  const H = c.heist, S = c.M.spawns;
  // (fora do ponto da van: ela fica em cima de um nascimento e o boneco nascia dentro dela)
  if (team === H.atk) { const out = S.red.filter(p => Math.hypot(p[0] - H.van[0], (p[2] ?? p[1]) - H.van[2]) > 4); return out.length ? out : S.red; }
  // defesa nao nasce colada no cofre (na Vila nascia a 13 m e quem pegava bolsa levava tiro de quem acabou de renascer)
  const far = S.blue.filter(p => Math.hypot(p[0] - H.vault[0], (p[2] ?? p[1]) - H.vault[2]) >= HEIST.defSpawnMin);
  return far.length ? far : S.blue;
}
export const heistRespawn = (c, team) => (team === c.heist.atk ? HEIST.atkRespawn : HEIST.defRespawn);
export const carryingBag = (c, p) => !!c.heist?.bags.some(b => b.state === 'carried' && b.carrier === p.id);

function nextRound(c, winner, why) {
  const H = c.heist;
  H.wins[winner]++; H.total[H.atk] += H.money;
  c.teamScore.red = H.wins.red; c.teamScore.blue = H.wins.blue;
  c.event({ k: 'heistRound', n: H.round, win: winner, why, money: H.money, wins: { ...H.wins } });
  const done = H.wins.red >= 3 || H.wins.blue >= 3 || H.round >= HEIST.rounds;
  if (done) {
    const w = H.wins.red !== H.wins.blue ? (H.wins.red > H.wins.blue ? 'red' : 'blue') : H.total.red !== H.total.blue ? (H.total.red > H.total.blue ? 'red' : 'blue') : 'empate';
    c.end(w); return;
  }
  // proxima rodada: na metade troca quem ataca; todo mundo renasce do lado certo e espera 5 s
  H.round++;
  H.atk = H.round <= HEIST.rounds / 2 ? 'red' : 'blue';
  const K = heistCfg(H), sm = H.kind === 'smuggle';
  Object.assign(H, { crack: 0, open: sm, state: sm ? 'open' : 'idle', bags: newBags(K, H.kind), money: 0, roundT: 0 });
  c.time = HEIST.time;
  if (H.kind === 'train') H.tr = { st: TR.wait, t: 0, x: -K.off };
  for (const p of c.players.values()) c.spawn(p);
  c.freezeT = 5;
  c.event({ k: 'heistNew', n: H.round, atk: H.atk });
}

// tempo acabou: a defesa leva a rodada
function trainTick(c, H, K, dt) {
  const T = H.tr, go = (st, ev) => { T.st = st; T.t = 0; if (ev) c.event({ k: ev, ...(st === TR.open ? { atk: H.atk } : null) }); };
  T.t += dt;
  if (T.st === TR.wait) {
    T.x = -K.off;
    if (!T.soon && H.roundT >= K.soonAt) { T.soon = 1; c.event({ k: 'trainSoon', at: K.arriveAt - H.roundT }); }
    if (H.roundT >= K.arriveAt) go(TR.arrive, 'trainArrive');
  } else if (T.st === TR.arrive) {
    const k = Math.min(1, T.t / K.arriveDur); T.x = -K.off * (1 - k) * (1 - k) * (1 - k * 0.15); // freia: rapido no comeco, bem devagar no fim
    if (k >= 1) { T.x = 0; go(TR.open, 'trainOpen'); }
  } else if (T.st === TR.open) {
    T.x = 0;
    if (c.time <= K.closeAt) {
      go(TR.closing, 'trainClosing');
      // quem esta dentro e jogado pra fora, pro lado que esta mais perto (norte = plataforma)
      for (const p of c.players.values()) {
        if (!p.alive || !inTrain(c.M, H, p)) continue;
        const z = p.pos[2] >= 0 ? 4.3 : -4.7, x = Math.max(-37, Math.min(37, p.pos[0]));
        p.pos = [x, floorAt(c.M, x, z), z]; p.vel = [0, 0, 0]; p.tpUntil = (c.clock || 0) + 0.8;
        c.event({ k: 'trainEject', id: p.id, pos: p.pos });
      }
    }
  } else if (T.st === TR.closing) {
    if (T.t >= K.closeDur) {
      for (const p of c.players.values()) if (p.alive && inTrain(c.M, H, p)) c.damage(p, null, 9999, 'trem', false); // ficou dentro mesmo assim: o trem leva
      go(TR.leave, 'trainLeave');
    }
  } else if (T.st === TR.leave) {
    const k = Math.min(1, T.t / K.leaveDur); T.x = K.off * k * k; // arranca devagar e ganha velocidade
    if (k >= 1) go(TR.gone, 'trainGone');
  } else T.x = K.off;
  // foi embora com o que nao saiu: o que ficou no cofre e nas vitrines vai junto. Sem bolsa na rua, a defesa leva a rodada
  if (T.st === TR.gone && H.money < K.quota && !H.bags.some(b => b.state === 'carried' || b.state === 'dropped' || b.state === 'flying')) { nextRound(c, other(H.atk), 'train'); return true; }
  return false;
}

export function heistTimeout(c) { nextRound(c, other(c.heist.atk), 'time'); return null; }

export function heistTick(c, dt) {
  const K = heistCfg(c.heist), H = c.heist, def = other(H.atk), ny = K.nearY || 2.5, near = (p, at, r, y = 2.5) => (p.pos[0] - at[0]) ** 2 + (p.pos[2] - at[2]) ** 2 < r * r && Math.abs(p.pos[1] - at[1]) < y;
  H.roundT += dt;
  if (H.kind === 'train' && trainTick(c, H, K, dt)) return;
  const alive = [...c.players.values()].filter(p => p.alive && !(p.down > 0));
  const trOpen = H.kind !== 'train' || H.tr.st === TR.open; // trem: so da pra arrombar e pegar com ele parado e aberto
  // 1) arrombar
  if (!H.open && trOpen) {
    // trem: so quem esta DENTRO do vagao (ny + linha de visao); na plataforma, do outro lado da parede, nao conta
    const inV = (p) => near(p, H.vault, K.crackR, ny) && (!H.lux || hasLOS(c.M, [p.pos[0], p.pos[1] + 1.2, p.pos[2]], [H.vault[0], H.vault[1] + 1.2, H.vault[2]]));
    const a = alive.filter(p => p.team === H.atk && inV(p)).length, d = alive.filter(p => p.team === def && inV(p)).length;
    const state = a && d ? 'contest' : a ? 'crack' : 'idle';
    if (state !== H.state) { H.state = state; c.event({ k: 'heistCrack', state }); }
    if (state === 'crack') {
      H.crack = Math.min(K.crack, H.crack + dt * Math.min(2, 1 + (a - 1) * 0.5));
      for (const p of alive) if (p.team === H.atk && inV(p)) p.score += dt * 5;
      if (H.crack >= K.crack) { H.open = true; H.state = 'open'; c.event({ k: 'heistOpen' }); }
    }
    if (H.kind !== 'train') return; // trem: as joias do luxo ja estao livres enquanto o forte nao abre
  }
  // 2) bolsas
  for (const b of H.bags) {
    if (b.state === 'flying') { // passe no ar (Contrabando): chega na mao do colega; se ele caiu no meio, cai no chao onde ele estava
      if ((b.flyT -= dt) > 0) continue;
      const o = c.players.get(b.carrier);
      if (o && o.alive && !(o.down > 0) && o.team === H.atk && !carryingBag(c, o)) { b.state = 'carried'; b.pos = [...o.pos]; c.event({ k: 'heistBag', act: 'take', id: o.id, pass: 1 }); }
      else { b.state = 'dropped'; b.carrier = null; b.dropT = K.dropBack; if (o) b.pos = [...o.pos]; c.event({ k: 'heistBag', act: 'drop', pos: b.pos }); }
      continue;
    }
    if (b.state === 'carried') {
      const p = c.players.get(b.carrier);
      if (!p || !p.alive || p.down > 0 || p.team !== H.atk) { b.state = 'dropped'; b.carrier = null; b.dropT = K.dropBack; if (p) b.pos = [...p.pos]; c.event({ k: 'heistBag', act: 'drop', pos: b.pos }); continue; }
      b.pos = [...p.pos];
      if (near(p, H.van, K.vanR)) {
        b.state = 'banked'; b.carrier = null; H.money += b.val ?? K.bagValue; c.time += K.bankBonus; p.score += 300;
        c.event({ k: 'heistBag', act: 'bank', id: p.id, money: H.money, bonus: K.bankBonus, v: b.val ?? K.bagValue, ...(b.jewel ? { jw: 1 } : {}) });
        if (H.money >= K.quota) { nextRound(c, H.atk, 'quota'); return; }
      }
    } else if (b.state === 'dropped') {
      const back = () => { b.state = 'vault'; b.pos = null; b.carrier = null; };
      // defensor precisa ficar em cima um tico pra devolver (encostar e sumir deixava o ataque sem chance de recuperar)
      const d = alive.find(p => p.team === def && near(p, b.pos, K.touchR));
      if (d) { if ((b.retT = (b.retT || 0) + dt) >= K.returnT) { back(); b.retT = 0; d.score += 150; c.event({ k: 'heistBag', act: 'return', id: d.id }); continue; } } else b.retT = 0;
      const a = alive.find(p => p.team === H.atk && near(p, b.pos, K.touchR) && !carryingBag(c, p) && (p.bot || p.using)); // 07/11 (pedido dele): humano so pega apertando o botao de acao (bot pega ao encostar)
      if (a) { b.state = 'carried'; b.carrier = a.id; b.retT = 0; c.event({ k: 'heistBag', act: 'take', id: a.id, ...(b.jewel ? { jw: 1 } : {}) }); continue; }
      if ((b.dropT -= dt) <= 0) { back(); c.event({ k: 'heistBag', act: 'return' }); }
    }
  }
  // pegar no cofre aberto: atacante colado no cofre sem bolsa leva a proxima
  for (const p of alive) {
    if (!trOpen) break;
    if (p.team !== H.atk || carryingBag(c, p) || !(p.bot || p.using)) continue; // 07/11: botao de acao (bot pega sozinho)
    // trem: joias no luxo (sempre) e malotes no forte (depois de arrombar); os outros modos so tem o cofre
    const atLux = H.lux && near(p, H.lux, K.takeR, ny), atVault = H.open && near(p, H.vault, K.takeR, H.lux ? ny : 2.5);
    if (!atLux && !atVault) continue;
    const b = H.bags.find(x => x.state === 'vault' && (atLux ? x.src === 'lux' : x.src !== 'lux'));
    if (!b) continue;
    b.state = 'carried'; b.carrier = p.id; b.pos = [...p.pos];
    c.event({ k: 'heistBag', act: 'take', id: p.id, ...(b.jewel ? { jw: 1 } : {}) });
  }
  // sem bolsa nenhuma pra roubar e a meta nao bateu: a defesa segurou
  if (H.bags.every(b => b.state === 'banked') && H.money < K.quota) nextRound(c, def, 'empty');
}

// bot: ataque arromba, quem tem bolsa corre pra van, os outros pegam bolsa caida ou escoltam; defesa segura o cofre e caca quem tem bolsa
// ponto de ficar em volta de algo (04/11, pedido dele: bot parava e "piscava" no cofre). O alvo era o centro do cofre, que e
// solido: ele empurrava a caixa e era jogado pra fora, em loop. Agora cada bot pega um ponto LIVRE no raio e fica com ele
// uns segundos (histerese: nao troca de ideia a cada pensada); depois muda de lugar, pra nao virar estatua.
function holdSpot(c, p, at, r) {
  const ai = p.ai, key = Math.round(at[0]) + ':' + Math.round(at[2]);
  ai.holdSpotT = (ai.holdSpotT || 0) - 0.25;
  if (ai.holdSpot && ai.holdKey === key && ai.holdSpotT > 0) return ai.holdSpot;
  const a0 = Math.random() * 6.283;
  for (let k = 0; k < 12; k++) {
    const a = a0 + k * 0.5236, x = at[0] + Math.cos(a) * r, z = at[2] + Math.sin(a) * r;
    if (!standable(c.M, x, z) || !hasLOS(c.M, [at[0], at[1] + 1, at[2]], [x, at[1] + 1, z])) continue;
    ai.holdSpot = [x, floorAt(c.M, x, z), z]; ai.holdKey = key; ai.holdSpotT = 3 + Math.random() * 3; ai.path = null;
    return ai.holdSpot;
  }
  return ai.holdSpot || at;
}

export function heistGoal(c, p) {
  const H = c.heist, role = p.id.charCodeAt(p.id.length - 1) % 3;
  if (H.kind === 'train' && H.tr.st !== TR.open && !carryingBag(c, p) && !H.bags.some(b => b.state === 'dropped')) { const z = p.team === H.atk ? -7 : 6.5, x = H.vault[0] + ((p.id.charCodeAt(0) % 9) - 4) * 3; return [x, floorAt(c.M, x, z), z]; } // sem trem: espera no seu lado (ataque no patio, defesa na plataforma)
  const jit = (at) => { const j = ((p.id.charCodeAt(0) + p.id.length) % 7 - 3) * 0.8; return [at[0] + j, at[1], at[2] - j * 0.6]; };
  const carried = H.bags.filter(b => b.state === 'carried'), dropped = H.bags.filter(b => b.state === 'dropped');
  if (p.team === H.atk) {
    if (carryingBag(c, p)) return H.van;
    if (dropped.length) return dropped[0].pos;
    if (H.open && role !== 2 && carried.length) {
      // Contrabando (04/11): a escolta corre uns 11 m NA FRENTE de quem carrega, rumo ao barco (limpa o caminho e fica
      // pronta pro passe). No Cofre continua colada (2/3 escoltam quem carrega)
      if (H.kind === 'smuggle') { const q = carried[0].pos, dx = H.van[0] - q[0], dz = H.van[2] - q[2], L = Math.hypot(dx, dz) || 1, k = Math.min(11, L * 0.8); const x = q[0] + dx / L * k, z = q[2] + dz / L * k; return jit([x, floorAt(c.M, x, z), z]); }
      return jit(carried[0].pos);
    }
    // trem: 1/3 vai nas joias do luxo (livres desde o comeco); o resto arromba/pega no forte. Dentro do vagao o raio e curto
    if (H.lux && role === 2 && H.bags.some(b => b.state === 'vault' && b.src === 'lux')) return holdSpot(c, p, H.lux, 1.4);
    return holdSpot(c, p, H.vault, H.lux ? 1.6 : 3.6);
  }
  if (dropped.length && role !== 2) return dropped[0].pos;
  if (carried.length && role !== 1) return carried[0].pos;
  // defesa espalhada (toda em cima do cofre o ataque nunca arrombava): 1/3 guarda, 1/3 no meio do caminho, 1/3 caca
  if (role === 1) return holdSpot(c, p, H.vault, H.lux ? 1.8 : 4.4);
  if (role === 2 && H.lux) return holdSpot(c, p, H.lux, 1.8); // trem: guarda as joias
  if (role === 2) {
    // meio do caminho: no Banco Ferradura cai bem dentro do duto (bot passa agachado desde 03/11 e ficava acampado
    // la dentro). Ponto de vigia tem que ser de pe: anda pro lado ate achar
    let mid = jit([(H.vault[0] + H.van[0]) / 2, 0, (H.vault[2] + H.van[2]) / 2]);
    for (const dx of [0, 4, -4, 7, -7, 10, -10]) if (standable(c.M, mid[0] + dx, mid[2])) { mid = [mid[0] + dx, floorAt(c.M, mid[0] + dx, mid[2]), mid[2]]; break; }
    return holdSpot(c, p, mid, 3.5);
  }
  return null; // caca: o bot vai atras de quem estiver vendo
}

export function heistSnap(c) {
  const H = c.heist;
  const K = heistCfg(H);
  return { round: H.round, atk: H.atk, crack: r1(H.crack / K.crack), ...(H.lux ? { lux: H.lux.map(r1) } : {}), ...(H.tr ? { tr: [H.tr.st, r1(H.tr.x)] } : {}), open: H.open, state: H.state, money: H.money, quota: K.quota, kind: H.kind, wins: H.wins, vault: H.vault.map(r1), van: H.van.map(r1), bags: H.bags.map(b => [b.id, b.state === 'vault' ? 0 : b.state === 'carried' ? 1 : b.state === 'dropped' ? 2 : b.state === 'flying' ? 4 : 3, b.carrier, b.pos ? b.pos.map(r1) : null, b.retT ? r1(b.retT / HEIST.returnT) : 0, b.jewel ? 1 : 0]) };
}

// Contrabando (04/11): passe. Quem carrega joga o caixote pro colega do ataque que estiver mais na direcao da mira (cone
// e alcance do SMUGGLE, com linha de visao). Sem ninguem la, o caixote cai no chao a 5 m na frente (qualquer um do
// ataque pega). O caixote voa passT s (o cliente desenha o arco) e so entao o colega fica com ele.
export function heistPass(c, p) {
  const H = c.heist; if (!H || H.kind !== 'smuggle' || !p.alive || p.down > 0) return;
  const K = heistCfg(H), b = H.bags.find(x => x.state === 'carried' && x.carrier === p.id); if (!b) return;
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), eye = [p.pos[0], p.pos[1] + 1.4, p.pos[2]];
  let to = null, best = Infinity;
  for (const o of c.players.values()) {
    if (o === p || !o.alive || o.down > 0 || o.team !== H.atk || carryingBag(c, o)) continue;
    const dx = o.pos[0] - p.pos[0], dz = o.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
    if (d < 1.5 || d > K.passR) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / d)));
    if (ang > K.passCone || !hasLOS(c.M, eye, [o.pos[0], o.pos[1] + 1.2, o.pos[2]])) continue;
    const sc = ang * 8 + d * 0.1; if (sc < best) { best = sc; to = o; }
  }
  const from = [p.pos[0], p.pos[1] + 1.2, p.pos[2]];
  if (to) { b.state = 'flying'; b.carrier = to.id; b.flyT = K.passT; b.pos = from; c.event({ k: 'heistPass', id: p.id, to: to.id, from, dur: K.passT }); return; } // dur (nao t: o t e o tipo da mensagem)
  const x = p.pos[0] + fx * 5, z = p.pos[2] + fz * 5, ok = standable(c.M, x, z);
  b.state = 'dropped'; b.carrier = null; b.dropT = K.dropBack; b.pos = ok ? [x, floorAt(c.M, x, z), z] : [...p.pos];
  c.event({ k: 'heistPass', id: p.id, from, at: b.pos, dur: K.passT }); // dur (nao t: o t e o tipo da mensagem)
}
// bots: passam quando um colega esta bem mais perto do barco (e livre), ou quando estao apanhando
export function heistBotPass(c, p) {
  const H = c.heist; if (!H || H.kind !== 'smuggle' || !carryingBag(c, p)) return;
  if ((p.ai.passCd = (p.ai.passCd || 0) - 1 / 30) > 0) return;
  const K = heistCfg(H), my = Math.hypot(p.pos[0] - H.van[0], p.pos[2] - H.van[2]);
  const hurt = (p.ai.hurtT || 0) > 0 && p.hp < 55;
  for (const o of c.players.values()) {
    if (o === p || !o.alive || o.team !== H.atk || carryingBag(c, o)) continue;
    const d = Math.hypot(o.pos[0] - p.pos[0], o.pos[2] - p.pos[2]); if (d < 3 || d > K.passR * 0.85) continue;
    const their = Math.hypot(o.pos[0] - H.van[0], o.pos[2] - H.van[2]);
    if (their < my - 8 || (hurt && their < my + 2)) { p.yaw = Math.atan2(-(o.pos[0] - p.pos[0]), -(o.pos[2] - p.pos[2])); p.ai.passCd = 2.5; heistPass(c, p); return; }
  }
}
