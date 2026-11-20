// Texturas no tamanho que o objeto aparece na tela (19/11, pedido dele: "otimizar entradas e saidas de texturas").
// Os modelos do Tripo vinham com textura de 2048 x 2048 (cada uma ~22 MB na placa de video com mipmaps), ate o chaveiro de 5 cm
// pendurado na arma. Regra: chaveiro (charm_*) 512 px; o resto no maximo 1024 px. JPEG qualidade 85 (o jogo pinta em toon por
// cima: cor chapada, detalhe fino nao aparece). So a TEXTURA muda: geometria, materiais, nomes, hierarquia e Draco ficam iguais.
// CONFERENCIA: mesma quantidade de malhas/primitivas/vertices e textura no tamanho novo; ficou maior = fica o original.
// Uso: node scripts/texturas-leves.mjs [--seco]   (originais no git: git checkout -- public/models/src/<arquivo> volta)
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const SECO = process.argv.includes('--seco');
const DIR = 'public/models/src';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
const alvo = (f) => (f.startsWith('charm_') ? 512 : 1024);
const geoSig = (doc) => doc.getRoot().listMeshes().map(m => m.listPrimitives().map(p => (p.getAttribute('POSITION')?.getCount() || 0) + '/' + (p.getIndices()?.getCount() || 0)).join(',')).join('|');

let antes = 0, depois = 0, vram0 = 0, vram1 = 0;
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.glb')).sort()) {
  const file = path.join(DIR, f), doc = await io.read(file), tex = doc.getRoot().listTextures();
  const big = tex.filter(t => { const s = t.getSize(); return s && Math.max(s[0], s[1]) > alvo(f); });
  if (!big.length) continue;
  const sig = geoSig(doc), size0 = fs.statSync(file).size, N = alvo(f);
  const v0 = tex.reduce((s, t) => { const z = t.getSize() || [0, 0]; return s + z[0] * z[1] * 4 * 1.33; }, 0);
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [N, N], quality: 85 }));
  const ok = geoSig(doc) === sig && doc.getRoot().listTextures().every(t => { const s = t.getSize(); return s && Math.max(s[0], s[1]) <= N; });
  const bytes = await io.writeBinary(doc), v1 = doc.getRoot().listTextures().reduce((s, t) => { const z = t.getSize() || [0, 0]; return s + z[0] * z[1] * 4 * 1.33; }, 0);
  if (!ok || bytes.byteLength >= size0) { console.log('PULEI', f, ok ? 'nao ficou menor' : 'conferencia falhou'); continue; }
  antes += size0; depois += bytes.byteLength; vram0 += v0; vram1 += v1;
  console.log(f.padEnd(32), (size0 / 1024).toFixed(0).padStart(5), '->', (bytes.byteLength / 1024).toFixed(0).padStart(4), 'KB  placa', (v0 / 1048576).toFixed(1), '->', (v1 / 1048576).toFixed(1), 'MB');
  if (!SECO) fs.writeFileSync(file, bytes);
}
console.log(SECO ? '(seco, nada gravado)' : 'gravado', '| download', (antes / 1048576).toFixed(1), '->', (depois / 1048576).toFixed(1), 'MB | placa de video', (vram0 / 1048576).toFixed(0), '->', (vram1 / 1048576).toFixed(0), 'MB');
