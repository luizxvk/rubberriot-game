// Layout de um mapa pro Blender (06/11): node scripts/map-layout.mjs <mapa> -> tools/blender/<mapa>-layout.json.
// Caixa com desenho proprio (vis: pedra, duna...) sai com a medida do DESENHO; 'tier' e 'roof' (so colisao) ficam de fora.
// Leva tambem o trilho (amostrado a cada 2 m com a altura do chao do trilho: fiacao e sinais do mapa.py), o cais e o estudio.
import { getMap } from '../shared/map.js';
import { trackOf, trackAt, trackY } from '../shared/escort.js';
import fs from 'fs';
const id = process.argv[2] || 'vila', M = getMap(id);
const boxes = M.boxes.filter(b => b.kind !== 'tier' && b.kind !== 'roof').map(b => { const v = b.vis || b, o = { k: b.kind, min: v.min, max: v.max }; for (const k of ['roof', 'team', 'seed', 'col', 'door', 'floors', 'sign', 'deck']) if (b[k] !== undefined) o[k] = b[k]; return o; });
let trackS = null;
if (M.track) { const { len } = trackOf(M); trackS = []; for (let d = 0; d <= len; d += 2) { const p = trackAt(M, d); trackS.push([p.x, trackY(M, p.x, p.z), p.z]); } }
fs.writeFileSync(new URL('../tools/blender/' + id + '-layout.json', import.meta.url), JSON.stringify({ arena: M.arena, boxes, track: M.track || null, trackS, quayZ: M.quayZ ?? null, studio: M.studio ?? null }));
const c = {}; for (const b of boxes) c[b.k] = (c[b.k] || 0) + 1; console.log(id, boxes.length, 'pecas', c);
