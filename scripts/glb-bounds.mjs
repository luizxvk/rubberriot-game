import fs from 'node:fs';
const b = fs.readFileSync(process.argv[2]);
const jl = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + jl));
const out = {};
// world matrix via parents
const parent = {}; j.nodes.forEach((n, i) => (n.children || []).forEach(c => parent[c] = i));
function mat(n) {
  if (n.matrix) return n.matrix;
  const t = n.translation || [0,0,0], s = n.scale || [1,1,1], q = n.rotation || [0,0,0,1];
  const [x,y,z,w] = q;
  return [(1-2*(y*y+z*z))*s[0], 2*(x*y+z*w)*s[0], 2*(x*z-y*w)*s[0], 0,
    2*(x*y-z*w)*s[1], (1-2*(x*x+z*z))*s[1], 2*(y*z+x*w)*s[1], 0,
    2*(x*z+y*w)*s[2], 2*(y*z-x*w)*s[2], (1-2*(x*x+y*y))*s[2], 0, t[0], t[1], t[2], 1];
}
function mul(a, b) { const r = new Array(16).fill(0); for (let i=0;i<4;i++) for (let k=0;k<4;k++) for (let l=0;l<4;l++) r[k*4+i] += a[l*4+i]*b[k*4+l]; return r; }
function world(i) { let m = mat(j.nodes[i]); let p = parent[i]; while (p !== undefined) { m = mul(mat(j.nodes[p]), m); p = parent[p]; } return m; }
function tp(m, v) { return [0,1,2].map(r => m[r]*v[0] + m[4+r]*v[1] + m[8+r]*v[2] + m[12+r]); }
j.nodes.forEach((n, i) => {
  if (n.mesh === undefined) return;
  const m = world(i);
  let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
  for (const p of j.meshes[n.mesh].primitives) {
    const a = j.accessors[p.attributes.POSITION];
    for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
      const w = tp(m, [cx, cy, cz]);
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], w[k]); mx[k] = Math.max(mx[k], w[k]); }
    }
  }
  let name = n.name; const pn = j.nodes[parent[i]]?.name;
  if (/_texture_0$|^Object_\d+$|^$/.test(name || '')) name = pn;
  out[name] = [mn.map(v => +v.toFixed(3)), mx.map(v => +v.toFixed(3))];
});
console.log(JSON.stringify(out));
