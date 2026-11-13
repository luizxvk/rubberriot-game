// Equipamento de campo (guarda-chuva, mola, buraco portatil, bigorna): regras no servidor. O Core chama
// estas funcoes na mensagem 'field', no dano (guarda-chuva bloqueia), no tick e no snapshot.
// Quem anda e o cliente (posicao e dele): mola e buraco do humano ele mesmo aplica; dos bots, o servidor.
import { FIELD, FIELD_IDS } from './weapons.js';
import { floorAt, standable, roomy } from './nav.js';
import { hasLOS, moveBody } from './map.js';

let seq = 0;
const near = (a, b, r) => (a[0] - b[0]) ** 2 + (a[2] - b[2]) ** 2 < r * r && Math.abs(a[1] - b[1]) < 1.6;

// saida do buraco (08/11, pedido dele): ponto aleatorio em raio medio, no chao e dentro dos limites do mapa (nunca telhado)
export function holeExit(M, from, rnd = Math.random) {
  const F = FIELD.hole;
  for (let k = 0; k < 60; k++) {
    const a = rnd() * Math.PI * 2, d = F.exitMin + rnd() * (F.exitMax - F.exitMin), x = from[0] + Math.cos(a) * d, z = from[2] + Math.sin(a) * d;
    if (!standable(M, x, z)) continue;
    const y = floorAt(M, x, z);
    if (y <= 1.6) return [x, y, z];
  }
  return null;
}

export function fieldReset(c) { c.springs = []; c.holes = []; for (const p of c.players.values()) { p.fieldCharge = 0; p.fieldScore = p.score || 0; } }
// barra do equipamento: enche com os pontos que a pessoa faz na partida (abate, assistencia, objetivo)
export const fieldReady = (p) => (p.fieldCharge || 0) >= 1;

export function fieldUse(c, p, m) {
  const F = FIELD[p.field];
  if (!F || !p.alive || p.inRing || p.down > 0 || m.kind !== p.field || !fieldReady(p)) return; // ringue = so soco
  if (p.field === 'umbrella' && p.los?.[p.wpn]?.handle === 'akimbo') { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id, why: 'akimbo' }); return; } // regra dele 08/11: duas armas nas maos, sem guarda-chuva
  const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
  // ponto mirado (mola, buraco, bigorna): dentro do alcance, em chao de verdade e a vista
  let at = null;
  if (Array.isArray(m.at) && m.at.length === 3 && m.at.every(Number.isFinite)) {
    const x = m.at[0], z = m.at[2], d = Math.hypot(x - p.pos[0], z - p.pos[2]);
    if (d <= (F.range || 4) + 1 && standable(c.M, x, z)) { const y = floorAt(c.M, x, z); if (hasLOS(c.M, eye, [x, y + 0.6, z])) at = [x, y, z]; }
  }
  if (p.field === 'umbrella') { p.shieldT = F.dur; p.umbHp = F.hp; }
  else if (p.field === 'spring') c.springs.push({ id: ++seq, pos: at && Math.hypot(at[0] - p.pos[0], at[2] - p.pos[2]) < 5 ? at : [p.pos[0], floorAt(c.M, p.pos[0], p.pos[2]), p.pos[2]], t: F.dur });
  else if (p.field === 'hole') { const a = [p.pos[0], floorAt(c.M, p.pos[0], p.pos[2]), p.pos[2]]; c.holes.push({ id: ++seq, a, b: holeExit(c.M, a), t: F.dur, owner: p.id }); } // b = saida ja sorteada (09/11): fica desenhada no chao
  else if (p.field === 'stim') { if (p.hp >= (p.maxHp || 100) && !(p.burn)) { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id }); return; } p.stimT = F.dur; p.burn = null; }
  else if (p.field === 'vest') { if ((p.armor || 0) >= F.armor) { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id }); return; } p.armor = F.armor; }
  else if (p.field === 'hook') { // 13/11: Gancho do Palco. to = ponta mirada; confere alcance e visao (volta 30 cm pro olho: o ponto e na superficie)
    const to = Array.isArray(m.to) && m.to.length === 3 && m.to.every(Number.isFinite) ? m.to : null;
    const d = to ? Math.hypot(to[0] - eye[0], to[1] - eye[1], to[2] - eye[2]) : Infinity;
    const back = to && d > 0.5 ? to.map((v, i) => v + (eye[i] - v) / d * 0.3) : null;
    if (!to || d > F.range + 2 || !hasLOS(c.M, eye, back)) { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id, why: 'hookFar' }); return; }
    if ((c.clock || 0) < (p.hookNext || 0)) { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id, why: 'hookCd' }); return; } // 13/11: espera entre ganchadas (o cliente conta do fim da puxada; aqui conta do lancamento, com folga)
    p.hookNext = (c.clock || 0) + F.cd;
    p.mvSkip = Math.max(p.mvSkip || 0, (c.clock || 0) + F.maxT + 1); // puxada passa do limite de velocidade do anti-trapaca
    p.hookUses = (p.hookUses ?? F.uses) - 1;
    if (p.hookUses > 0) { c.event({ k: 'field', id: p.id, kind: 'hook', at: to, left: p.hookUses }); return; } // ainda tem lancada: a barra fica cheia
    p.hookUses = undefined; p.fieldCharge = 0;
    c.event({ k: 'field', id: p.id, kind: 'hook', at: to, left: 0 });
    return;
  }
  else if (p.field === 'anvil') { if (!at) { c.send(p.id, { t: 'ev', k: 'fieldFail', id: p.id }); return; } c.anvils.push({ owner: p.id, pos: at, t: F.fall }); c.event({ k: 'anvilWarn', list: [at] }); }
  p.fieldCharge = 0;
  c.event({ k: 'field', id: p.id, kind: p.field, at });
}

// guarda-chuva aberto: bloqueia o que vem da frente (tiro, soco, faca); explosao e iris passam.
// Tem vida (31/10, pedido dele): alguns tiros ele segura, tiro demais estoura na mao e some
export function fieldBlocks(c, v, a, wpn, dmg = 0) {
  if (!(v.shieldT > 0) || !a || a === v || wpn === 'iris' || wpn === 'anvil' || wpn === 'frag' || wpn === 'nuke') return false;
  const dx = a.pos[0] - v.pos[0], dz = a.pos[2] - v.pos[2], d = Math.hypot(dx, dz) || 1;
  const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
  if ((dx * fx + dz * fz) / d < 0.3) return false;
  v.umbHp = (v.umbHp ?? FIELD.umbrella.hp) - (dmg || 0);
  if (v.umbHp <= 0) { v.shieldT = 0; v.umbHp = 0; c.event({ k: 'umbBreak', id: v.id }); return true; } // o tiro que estoura ainda e segurado
  c.event({ k: 'block', v: v.id, a: a.id, hp: Math.round(v.umbHp / FIELD.umbrella.hp * 100) });
  return true;
}

// alguem passou pelo buraco: a saida usada da lugar a outra sorteada (cada entrada continua indo pra um ponto diferente)
const holeNext = (c, h) => { h.b = holeExit(c.M, h.a) || h.b; };
export function fieldHoleUsed(c, p, m) {
  const h = c.holes.find(q => q.id === m.id);
  if (h && p.alive && near(p.pos, h.a, 2.5)) holeNext(c, h);
}

export function fieldTick(c, dt) {
  for (const p of c.players.values()) {
    // pontos novos desde a ultima conferida viram barra (nunca passa de cheia); encheu = aviso
    const sc = p.score || 0, gain = sc - (p.fieldScore ?? sc); p.fieldScore = sc;
    const F = FIELD[p.field];
    if (F && gain > 0 && !fieldReady(p)) { p.fieldCharge = Math.min(1, (p.fieldCharge || 0) + gain / F.need); if (fieldReady(p) && !p.bot) c.event({ k: 'fieldReady', id: p.id }); }
    if (p.shieldT > 0) p.shieldT -= dt;
    // estimulante: a vida volta aos poucos enquanto o remedio corre
    if (p.stimT > 0 && p.alive) { p.stimT -= dt; p.hp = Math.min(p.maxHp || 100, p.hp + FIELD.stim.heal / FIELD.stim.dur * dt); }
  }
  for (const list of [c.springs, c.holes]) for (let i = list.length - 1; i >= 0; i--) if ((list[i].t -= dt) <= 0) list.splice(i, 1);
  // bots: mola joga pra cima, buraco leva pro outro lado (humano faz isso no proprio cliente)
  for (const p of c.players.values()) {
    if (!p.bot || !p.alive) continue;
    for (const s of c.springs) if (near(p.pos, s.pos, 1.1) && p.vel[1] <= 0.5 && Math.abs(p.pos[1] - s.pos[1]) < 0.4) { p.vel[1] = FIELD.spring.power; c.event({ k: 'boing', id: p.id, pos: s.pos }); }
    if ((p.holeCd || 0) > 0) { p.holeCd -= dt; continue; }
    for (const h of c.holes) {
      if (!near(p.pos, h.a, 0.9)) continue;
      const to = h.b; if (!to) continue;
      p.pos = [...to]; p.holeCd = 1.5; p.ai.path = null; holeNext(c, h);
      c.event({ k: 'slurp', id: p.id, from: h.a, to });
      break;
    }
  }
}

export function fieldSnap(c) {
  const r = (v) => Math.round(v * 100) / 100;
  return { springs: c.springs.map(s => [s.id, ...s.pos.map(r)]), holes: c.holes.map(h => [h.id, ...h.a.map(r), h.owner, ...(h.b || []).map(r)]) };
}

// bots: cada um sai com um equipamento sorteado e usa com criterio, so com a barra cheia (como todo mundo)
const BOT_FIELDS = FIELD_IDS; // 13/11 (pedido dele): bot tambem usa o gancho, so pra ponto no CHAO (ele nao tem rota pelo alto)
export const botPickField = () => BOT_FIELDS[Math.floor(Math.random() * BOT_FIELDS.length)];
export function botField(c, p, t) {
  const hpK = p.hp / (p.maxHp || 80), d = t ? Math.hypot(t.pos[0] - p.pos[0], t.pos[2] - p.pos[2]) : 99;
  let at = null, go = false;
  if (p.field === 'umbrella') go = !!t && d < 35 && hpK < 0.7 && Math.random() < 0.35;           // trocando tiro e apanhando
  else if (p.field === 'stim') go = hpK < 0.45 && Math.random() < 0.5;                                // machucado: injeta
  else if (p.field === 'vest') go = (p.armor || 0) < FIELD.vest.armor * 0.3;                          // colete quebrado: conserta
  else if (p.field === 'anvil') { go = !!t && d > 8 && d < FIELD.anvil.range && Math.random() < 0.25; at = t && [...t.pos]; } // alvo a vista, longe do proprio pe
  else if (p.field === 'spring') { go = !!t && d < 9 && hpK < 0.8 && Math.random() < 0.4; at = [...p.pos]; } // pula fora do aperto
  else if (p.field === 'hole') go = !!t && hpK < 0.45 && Math.random() < 0.5; // apanhando: foge pelo buraco
  else if (p.field === 'hook') { // 13/11 (pedido dele): foge apanhando, encurta distancia do alvo longe ou atravessa o mapa sem alvo
    if (p.hookPull || p.inRing || (c.clock || 0) < (p.hookNext || 0)) return;
    let g = null; const role = p.ai?.role, goal = p.ai?.goal;
    if (t && hpK < 0.4 && Math.random() < 0.5) g = [p.pos[0] - (t.pos[0] - p.pos[0]) / d * 26, 0, p.pos[2] - (t.pos[2] - p.pos[2]) / d * 26];
    else if (t && d > 16 && role !== 2 && Math.random() < 0.3) g = [t.pos[0] + (p.pos[0] - t.pos[0]) / d * 7, 0, t.pos[2] + (p.pos[2] - t.pos[2]) / d * 7]; // ancora (role 2) fica longe
    else if (!t && Array.isArray(goal) && Math.hypot(goal[0] - p.pos[0], goal[2] - p.pos[2]) > 22 && Math.random() < 0.12) g = goal;
    const to = g && botHookSpot(c, p, g[0], g[2]);
    if (!to) return;
    const was = p.hookNext;
    fieldUse(c, p, { kind: 'hook', to }); // mesma conferencia do jogador: alcance, visao, espera de 3 s e as 2 lancadas
    if (p.hookNext !== was) { p.hookPull = { to, t: 0, stuck: 0, prevD: Infinity }; if (p.ai) p.ai.path = null; }
    return;
  }
  if (!go) return;
  fieldUse(c, p, { kind: p.field, at });
  if (p.field === 'hole' && !fieldReady(p)) { const h = c.holes[c.holes.length - 1], to = h.b; if (to) { p.pos = [...to]; p.holeCd = 1.5; p.ai.path = null; holeNext(c, h); c.event({ k: 'slurp', id: p.id, from: h.a, to }); } } // entra na hora
}

// ---------- gancho dos bots (13/11, pedido dele) ----------
// Limites: so chao de verdade dentro da arena (standable/roomy: fora da borda, zona proibida e teto baixo nao valem), nunca
// telhado (y ate 1,6 m e no maximo 1,5 m acima/abaixo do pe do bot), dentro do alcance, a vista e com o corpo passando reto.
const HOOK_OUT = 0.14; // o mesmo voo da cabeca do cliente (hookview.js)
function botHookSpot(c, p, gx, gz) {
  const F = FIELD.hook, eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]], dx = gx - p.pos[0], dz = gz - p.pos[2], L = Math.hypot(dx, dz);
  if (L < 7) return null;
  const far = Math.min(L, F.range - 3);
  for (let k = 0; k < 8; k++) {
    const s2 = far * (1 - k * 0.09); if (s2 < 7) break;
    const x = p.pos[0] + dx / L * s2, z = p.pos[2] + dz / L * s2;
    if (!roomy(c.M, x, z)) continue;
    const y = floorAt(c.M, x, z);
    if (y > 1.6 || Math.abs(y - p.pos[1]) > 1.5) continue;
    if (!hasLOS(c.M, eye, [x, y + 0.6, z]) || !hasLOS(c.M, [p.pos[0], p.pos[1] + 0.8, p.pos[2]], [x, y + 0.8, z])) continue;
    return [Math.round(x * 100) / 100, Math.round((y + 0.05) * 100) / 100, Math.round(z * 100) / 100];
  }
  return null;
}
// puxada do bot no servidor: true enquanto puxa (o resto da IA espera). Solta perto da ponta, travado ou no tempo maximo
export function botHookTick(c, p, dt) {
  const H = p.hookPull; if (!H) return false;
  const F = FIELD.hook;
  if (!p.alive || p.down > 0 || p.inRing) { p.hookPull = null; return false; }
  H.t += dt;
  if (H.t < HOOK_OUT) { p.anim = 'hook'; p.vel[0] = p.vel[2] = 0; p.vel[1] = Math.max(p.vel[1] - 24 * dt, -20); p.onGround = moveBody(c.M, p.pos, p.vel, dt, 0.4, 1.7); return true; } // corda voando
  const dx = H.to[0] - p.pos[0], dy = H.to[1] - p.pos[1], dz = H.to[2] - p.pos[2], d = Math.hypot(dx, dy, dz) || 1;
  if (d < 1.25 || H.t > F.maxT || H.stuck > 0.25) { // chegou: segue com um pouco do embalo
    p.hookPull = null; p.vel = [dx / d * F.speed * 0.3, Math.max(0, dy / d * F.speed * 0.3), dz / d * F.speed * 0.3]; if (p.ai) { p.ai.path = null; p.ai.think = 0; }
    return false;
  }
  H.stuck = d > H.prevD - F.speed * dt * 0.25 ? H.stuck + dt : 0; H.prevD = d;
  const k = F.speed / d;
  p.vel = [dx * k, dy * k + 1.2, dz * k]; // um tico pra cima: nao raspa o chao no caminho
  p.onGround = moveBody(c.M, p.pos, p.vel, dt, 0.4, 1.7);
  p.anim = 'hook'; // pose do gancho no boneco (character.js)
  return true;
}
