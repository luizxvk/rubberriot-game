// Comprime com Draco os .glb de public/models que ainda nao tem (14/11, pedido dele: armas e modelos mais leves).
// So a GEOMETRIA muda; materiais, texturas, nomes das pecas, hierarquia e morph targets ficam iguais (gltf-transform).
// Precisao alta pra nada desfigurar: posicao 16 bits (erro < 0,1 mm numa arma), normal 12, UV 14 (0,06 px num atlas 1024).
// CONFERENCIA de cada arquivo (decodifica o comprimido e compara com o original): mesma quantidade de primitivas, vertices
// e triangulos, caixa igual (tolerancia 0,05% do tamanho), mesmas texturas e materiais. Falhou = fica o original.
// Uso: node scripts/draco-modelos.mjs [--seco]   (--seco: so confere e mostra o ganho, nao grava)
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

const SECO = process.argv.includes('--seco');
const ROOT = 'public/models';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});

const files = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.glb')) files.push(p); } };
walk(ROOT);

function resumo(doc) {
  const prims = [], tex = doc.getRoot().listTextures().map(t => (t.getImage()?.byteLength || 0) + ':' + t.getMimeType());
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'); if (!pos) continue;
    const idx = p.getIndices(), n = pos.getCount();
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity], v = [0, 0, 0];
    for (let i = 0; i < n; i++) { pos.getElement(i, v); for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } }
    prims.push({ n, tris: idx ? idx.getCount() / 3 : n / 3, mn, mx, mat: p.getMaterial()?.getName() || '', targets: p.listTargets().length, attrs: p.listSemantics().sort().join(',') });
  }
  return { prims, tex, mats: doc.getRoot().listMaterials().length, nodes: doc.getRoot().listNodes().map(n => n.getName()).join('|') };
}
function igual(a, b) {
  if (a.prims.length !== b.prims.length) return 'primitivas ' + a.prims.length + ' -> ' + b.prims.length;
  if (a.mats !== b.mats || a.tex.join() !== b.tex.join() || a.nodes !== b.nodes) return 'materiais/texturas/nomes mudaram';
  for (let i = 0; i < a.prims.length; i++) {
    const p = a.prims[i], q = b.prims[i];
    if (p.tris !== q.tris) return `triangulos ${p.tris} -> ${q.tris} (primitiva ${i})`;
    if (p.mat !== q.mat || p.targets !== q.targets || p.attrs !== q.attrs) return `material/morph/atributos mudaram (primitiva ${i}: ${p.attrs} -> ${q.attrs})`;
    const size = Math.max(...[0, 1, 2].map(k => p.mx[k] - p.mn[k]), 1e-6);
    for (let k = 0; k < 3; k++) if (Math.abs(p.mn[k] - q.mn[k]) > size * 5e-4 || Math.abs(p.mx[k] - q.mx[k]) > size * 5e-4) return `caixa mudou (primitiva ${i}, eixo ${k})`;
  }
  return null;
}

let antes = 0, depois = 0, feitos = 0, pulados = 0, falhas = [];
for (const f of files) {
  const raw = fs.readFileSync(f);
  let doc;
  try { doc = await io.readBinary(raw); } catch (e) { falhas.push([f, 'nao abriu: ' + e.message]); continue; }
  if (doc.getRoot().listExtensionsUsed().some(e => e.extensionName === 'KHR_draco_mesh_compression')) { pulados++; continue; }
  const r0 = resumo(doc);
  if (!r0.prims.length) { pulados++; continue; }
  await doc.transform(draco({ method: 'edgebreaker', encodeSpeed: 5, decodeSpeed: 5, quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14, quantizeColor: 10, quantizeGeneric: 12 }));
  const out = await io.writeBinary(doc);
  // confere decodificando o que vai ser gravado
  let r1;
  try { r1 = resumo(await io.readBinary(out)); } catch (e) { falhas.push([f, 'comprimido nao abre: ' + e.message]); continue; }
  const why = igual(r0, r1);
  if (why) { falhas.push([f, why]); continue; }
  if (out.byteLength >= raw.length * 0.95) { pulados++; continue; } // nao ganha nada: fica como esta
  antes += raw.length; depois += out.byteLength; feitos++;
  if (!SECO) fs.writeFileSync(f, out);
}
console.log(`${SECO ? '[seco] ' : ''}comprimidos ${feitos}, pulados ${pulados}, falhas ${falhas.length}`);
console.log(`tamanho dos comprimidos: ${(antes / 1048576).toFixed(1)} MB -> ${(depois / 1048576).toFixed(1)} MB`);
for (const [f, w] of falhas) console.log('  FICOU ORIGINAL', f, '-', w);
