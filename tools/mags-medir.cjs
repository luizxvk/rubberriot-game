// Mede o pente original de cada arma e grava em tools/blender/mags-input.json. Com o dev (5197) no ar: node tools/mags-medir.cjs [corpos...]
// 09/11 (prints dele): corte EXATO do plano com os triangulos da malha (pente de poucos vertices nao tem ponto no meio; a medida antiga errava largura e angulo)
const { chromium } = require('../../template-magazine/node_modules/playwright'), fs = require('fs');
const FILE = require('path').join(__dirname, 'blender', 'mags-input.json');
const ALL = { fusil_6: 'y', pistol_2: 'y', subfusil_3: 'y', subfusil_5: 'y', subfusil_6: 'y', fusil_13: 'y', sniper_2: 'y', lmg_2: 'y', subfusil_2: 'x', fusil_1: 'x', subfusil_8: 'drum', subfusil_13: 'drum' };
const want = process.argv.slice(2), conf = Object.fromEntries(Object.entries(ALL).filter(([k]) => !want.length || want.includes(k)));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] }), p = await b.newPage({ viewport: { width: 800, height: 500 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.debugParts().lmg_2 && __A.debugParts().subfusil_13?.tt, null, { timeout: 60000 }); await p.waitForTimeout(4000);
  const r = await p.evaluate((conf) => {
    const A = __A.debugParts(), out = {}, rnd = v => Math.round(v * 1e4) / 1e4;
    for (const [id, ax] of Object.entries(conf)) {
      const B = A[id], cid = __A.nativePart(id, 'charger'), P = A[cid]; if (!P) { out[id] = 'SEM PENTE'; continue; } P.geo.computeBoundingBox(); const bx = P.geo.boundingBox, u = B.u;
      if (ax === 'drum') { const x = B.axisX ?? 0, zc = (bx.min.z + bx.max.z) / 2; const yt = bx.max.y - 0.005, yb = -0.16 * u; /* 09/11 (print dele: vao em cima do pente): nasce na ponta do poco original, nao 2 cm abaixo */ out[id] = { w: rnd(0.026 * u), d: rnd(bx.max.z - bx.min.z), h: rnd(yt - yb), top: [rnd(x), rnd(yt), rnd(zc)], mid: [rnd(x), rnd((yt + yb) / 2), rnd(zc - 0.003 * u)], bot: [rnd(x), rnd(-0.16 * u), rnd(zc - 0.012 * u)] }; continue; }
      const a = ax === 'x' ? 0 : 1, pos = P.geo.attributes.position, ix = P.geo.index, nv = ix ? ix.count : pos.count, up = ax === 'y' && (bx.max.y + bx.min.y) / 2 > 0, V = (i) => { const j = ix ? ix.getX(i) : i; return [pos.getX(j), pos.getY(j), pos.getZ(j)]; };
      // boca: de lado, nasce no eixo da arma (dentro do corpo); em pe, um pouco abaixo da ponta de cima (a ponta costuma estar dentro do poco)
      const n0 = ax === 'x' ? (B.axisX ?? 0) : up ? bx.min.y : bx.max.y, far = ax === 'x' ? bx.min.x : up ? bx.max.y : bx.min.y, near = ax === 'x' || up ? n0 : n0 + (far - n0) * 0.15, len = Math.abs(far - near);
      const cut = (t) => { const c = near + (far - near) * t, lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; let n = 0; for (let i = 0; i + 2 < nv; i += 3) { const T = [V(i), V(i + 1), V(i + 2)]; for (let e = 0; e < 3; e++) { const p0 = T[e], p1 = T[(e + 1) % 3], d0 = p0[a] - c, d1 = p1[a] - c; if ((d0 <= 0) === (d1 <= 0)) continue; const k = d0 / (d0 - d1); n++; for (let q = 0; q < 3; q++) { const v = p0[q] + (p1[q] - p0[q]) * k; lo[q] = Math.min(lo[q], v); hi[q] = Math.max(hi[q], v); } } } if (!n) return null; const cc = [0, 1, 2].map(q => (lo[q] + hi[q]) / 2); cc[a] = c; return { c: cc, s: [0, 1, 2].map(q => hi[q] - lo[q]) }; };
      const first = (ts) => { for (const t of ts) { const s = cut(t); if (s) return s; } return null; };
      // as pontas tem base e trava que entortam o centro: mede em 12% e 85% e prolonga a reta ate a ponta
      const n2 = first([0.12, 0.2, 0.3]), f2 = first([0.85, 0.8, 0.7]), m1 = first([0.5, 0.45, 0.55, 0.4, 0.6]); if (!n2 || !f2 || !m1) { out[id] = 'CORTE VAZIO'; continue; }
      const ext = (s, k) => { const c = m1.c.map((v, q) => v + (s.c[q] - v) * k); c[a] = s === n2 ? near : far; if (ax === 'x') c[2] = m1.c[2]; return { c }; }, n1 = ext(n2, 0.5 / 0.38), f1 = ext(f2, 0.5 / 0.35);
      const med = (k) => { const v = [0.25, 0.4, 0.5, 0.6, 0.75].map(cut).filter(Boolean).map(s => s.s[k]).sort((x, y) => x - y); return v[Math.floor(v.length / 2)]; };
      out[id] = { ...(ax === 'x' ? { axis: 'x', w: rnd(med(1)), d: rnd(med(2)) } : { w: rnd(med(0)), d: rnd(med(2)) }), h: rnd(len), top: n1.c.map(rnd), mid: m1.c.map(rnd), bot: f1.c.map(rnd) };
    }
    return out;
  }, conf);
  const J = JSON.parse(fs.readFileSync(FILE, 'utf8')); let bad = 0; for (const [k, v] of Object.entries(r)) { if (typeof v === 'string') { console.log('RUIM', k, v); bad++; continue; } J[k] = v; console.log(k, JSON.stringify(v)); }
  if (!bad) fs.writeFileSync(FILE, JSON.stringify(J)); console.log('total', Object.keys(J).length, 'gravado', !bad, 'erros', errs.slice(0, 2)); await b.close();
})();
