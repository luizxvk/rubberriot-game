// Equipamento de campo (guarda-chuva, mola, buraco portatil, bigorna): regras no servidor. O Core chama
// estas funcoes na mensagem 'field', no dano (guarda-chuva bloqueia), no tick e no snapshot.
// Quem anda e o cliente (posicao e dele): mola e buraco do humano ele mesmo aplica; dos bots, o servidor.
import { FIELD, FIELD_IDS } from './weapons.js';
import { floorAt, standable } from './nav.js';
import { hasLOS } from './map.js';

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
export const botPickField = () => FIELD_IDS[Math.floor(Math.random() * FIELD_IDS.length)];
export function botField(c, p, t) {
  const hpK = p.hp / (p.maxHp || 80), d = t ? Math.hypot(t.pos[0] - p.pos[0], t.pos[2] - p.pos[2]) : 99;
  let at = null, go = false;
  if (p.field === 'umbrella') go = !!t && d < 35 && hpK < 0.7 && Math.random() < 0.35;           // trocando tiro e apanhando
  else if (p.field === 'stim') go = hpK < 0.45 && Math.random() < 0.5;                                // machucado: injeta
  else if (p.field === 'vest') go = (p.armor || 0) < FIELD.vest.armor * 0.3;                          // colete quebrado: conserta
  else if (p.field === 'anvil') { go = !!t && d > 8 && d < FIELD.anvil.range && Math.random() < 0.25; at = t && [...t.pos]; } // alvo a vista, longe do proprio pe
  else if (p.field === 'spring') { go = !!t && d < 9 && hpK < 0.8 && Math.random() < 0.4; at = [...p.pos]; } // pula fora do aperto
  else if (p.field === 'hole') go = !!t && hpK < 0.45 && Math.random() < 0.5; // apanhando: foge pelo buraco
  if (!go) return;
  fieldUse(c, p, { kind: p.field, at });
  if (p.field === 'hole' && !fieldReady(p)) { const h = c.holes[c.holes.length - 1], to = h.b; if (to) { p.pos = [...to]; p.holeCd = 1.5; p.ai.path = null; holeNext(c, h); c.event({ k: 'slurp', id: p.id, from: h.a, to }); } } // entra na hora
}
