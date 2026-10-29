// Simula partidas so de bots (sem navegador) e mede o que importa: spawn no chao, bot andando,
// bot subindo (altura maxima), abates por minuto e o fluxo do infectado.
//   node tools/sim-bots.mjs            -> todos os mapas e modos
//   node tools/sim-bots.mjs refinaria  -> um mapa so
import { Core } from '../shared/core.js';
import { MAP_IDS, getMap } from '../shared/map.js';
import { floorAt, standable } from '../shared/nav.js';

const only = process.argv[2];
const maps = only ? [only] : MAP_IDS;
const modes = ['ffa', 'tdm', 'dom', 'infect'];
let falhas = 0;

for (const map of maps) {
  const M = getMap(map);
  // todo ponto de spawn tem que estar num lugar onde da pra ficar de pe
  for (const [lista, pts] of Object.entries(M.spawns)) for (const s of pts) {
    if (!standable(M, s[0], s[1])) { console.log(`  ✗ ${map} spawn ${lista} [${s}] encostado/dentro de caixa`); falhas++; }
  }
  for (const mode of modes) {
    const evs = [];
    const core = new Core({ mode, map, bots: 8, difficulty: 1, lobby: false, send: (to, m) => { if (m.t === 'ev') evs.push(m.k === 'spawn' ? { ...m, pos0: [...m.pos], pos: [...m.pos] } : m); } });
    const andou = new Map(), alto = new Map(), last = new Map();
    let spawnsRuins = 0;
    const dt = 1 / 30, segundos = mode === 'infect' ? 320 : 120;
    for (let i = 0; i < segundos / dt; i++) {
      core.tick(dt);
      for (const p of core.players.values()) {
        if (!p.alive) { last.delete(p.id); continue; }
        const l = last.get(p.id);
        if (l) andou.set(p.id, (andou.get(p.id) || 0) + Math.hypot(p.pos[0] - l[0], p.pos[2] - l[2]));
        last.set(p.id, [...p.pos]);
        alto.set(p.id, Math.max(alto.get(p.id) || 0, p.pos[1]));
      }
      if (core.over) break;
    }
    for (const e of evs) if (e.k === 'spawn' && e.pos0 && Math.abs(e.pos[1] - floorAt(M, e.pos[0], e.pos[2])) > 0.05) spawnsRuins++;
    const kills = evs.filter(e => e.k === 'kill').length;
    const media = [...andou.values()].reduce((a, b) => a + b, 0) / Math.max(1, andou.size);
    const parados = [...andou.values()].filter(v => v < 20).length;
    const subiram = [...alto.values()].filter(v => v > 1.2).length;
    const inf = evs.filter(e => e.k === 'infected').length, fim = evs.find(e => e.k === 'end');
    let linha = `${map.padEnd(10)} ${mode.padEnd(7)} abates ${String(kills).padStart(3)}  andou ${media.toFixed(0).padStart(4)} m  parados ${parados}  subiram ${subiram}`;
    if (mode === 'infect') linha += `  infectados ${inf}  fim ${fim ? fim.winner : '-'}`;
    if (mode === 'dom') linha += `  zonas ${core.zones.map(z => z.id + ':' + (z.owner || '-')).join(' ')}`;
    console.log(linha);
    if (spawnsRuins) { console.log(`  ✗ ${spawnsRuins} spawns fora do chao`); falhas++; }
    if (parados > 2) { console.log('  ✗ bots parados demais'); falhas++; }
    if (mode === 'infect' && (!inf || !fim)) { console.log('  ✗ infectado nao rodou ate o fim'); falhas++; }
  }
}
console.log(falhas ? `\n${falhas} problema(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
