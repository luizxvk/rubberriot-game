import fs from 'node:fs';
const f = process.argv[2];
const b = fs.readFileSync(f);
const jsonLen = b.readUInt32LE(12);
const j = JSON.parse(b.slice(20, 20 + jsonLen).toString());
console.log('nodes', j.nodes.length, 'meshes', j.meshes?.length, 'materials', j.materials?.length, 'textures', j.textures?.length, 'images', j.images?.length);
console.log('materials:', (j.materials||[]).map((m,i)=>i+':'+m.name+(m.pbrMetallicRoughness?.baseColorTexture?'[tex]':'')+(m.pbrMetallicRoughness?.baseColorFactor?'('+m.pbrMetallicRoughness.baseColorFactor.map(v=>v.toFixed(2))+')':'')).join(' | '));
const scene = j.scenes[j.scene||0];
function walk(i, d) {
  const n = j.nodes[i];
  let s = '  '.repeat(d) + i + ' ' + (n.name||'');
  if (n.mesh !== undefined) { const m = j.meshes[n.mesh]; s += ' [mesh ' + m.name + ' mats ' + m.primitives.map(p=>p.material).join(',') + ']'; }
  if (n.translation) s += ' t=' + n.translation.map(v=>v.toFixed(2));
  if (n.scale) s += ' s=' + n.scale.map(v=>v.toFixed(3));
  if (d < Number(process.argv[3]||9)) console.log(s);
  for (const c of n.children||[]) walk(c, d+1);
}
for (const r of scene.nodes) walk(r, 0);
