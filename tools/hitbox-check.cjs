// Compara a caixa de colisao de cada objeto com o que esta desenhado (09/11), com o dev (5197) no ar: node tools/hitbox-check.cjs [mapas...]
// folga + = a caixa passa do desenho (parede invisivel); - = o desenho passa da caixa (atravessa). Sai a mediana por tipo de objeto.
const { chromium } = require('../../template-magazine/node_modules/playwright');
const ALL = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria', 'bonde', 'apito', 'ferradura', 'tinteiro', 'deserto', 'docas', 'moeda', 'becos', 'feira', 'largo', 'cortejo'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL, LIM = 0.18;
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] }), tot = {};
  for (const map of want) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } });
    try {
      await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 });
      await p.evaluate(([map]) => window.__solo({ mode: ['bonde', 'apito', 'cortejo'].includes(map) ? 'escort' : ['deserto', 'becos', 'feira', 'largo'].includes(map) ? 'dom' : 'ffa', map, bots: 0, difficulty: 'easy', lobby: false }), [map]);
      await p.waitForFunction(() => __G.M?.boxes?.length, null, { timeout: 60000 }); await p.waitForTimeout(9000);
      const r = await p.evaluate(() => {
        const M = __G.M, S = __S, V3 = __C.position.constructor, H = new Map(), key = (x, z) => Math.floor(x / 2) + ':' + Math.floor(z / 2), v = new V3();
        S.updateMatrixWorld(true);
        S.traverse(o => {
          if (!o.isMesh || o.isInstancedMesh || !o.visible || o.material?.uniforms?.th || o.material?.transparent || o.frustumCulled === false) return;
          const g = o.geometry, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count, P = (i) => { const j = idx ? idx.getX(i) : i; v.set(pos.getX(j), pos.getY(j), pos.getZ(j)).applyMatrix4(o.matrixWorld); return [v.x, v.y, v.z]; };
          for (let i = 0; i + 2 < n; i += 3) {
            const a = P(i), c = P(i + 1), d = P(i + 2), sx = Math.max(a[0], c[0], d[0]) - Math.min(a[0], c[0], d[0]), sz = Math.max(a[2], c[2], d[2]) - Math.min(a[2], c[2], d[2]), sy = Math.max(a[1], c[1], d[1]) - Math.min(a[1], c[1], d[1]);
            if (sx > 3.6 || sz > 3.6 || sy > 4.5) continue;
            for (const t of [a, c, d]) { const k = key(t[0], t[2]); let L = H.get(k); if (!L) H.set(k, L = []); L.push(t[0], t[1], t[2]); }
          }
        });
        const SKIP = /^(trunk|bankroof|shedroof|copperroof|coretoroof|wall|hwall|hfloor|hroof|house|tier|roof|quayedge|forestedge|concrete|car|truck|ground|road|street|stairs?|step|ramp|bridge|platform|plat|tree|cliff|mesa|dune|floor|deck|walkin)$/, out = {};
        const nb = M.boxes.filter(b => !SKIP.test(b.kind || ''));
        for (const b0 of nb) {
          const b = b0.vis ? { ...b0, min: b0.vis.min, max: b0.vis.max } : b0, m = 0.45, by0 = b.min[1] + (b.max[1] - b.min[1]) * 0.2, by1 = b.min[1] + (b.max[1] - b.min[1]) * 0.8, mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; let n = 0;
          for (let cx = Math.floor((b.min[0] - m) / 2); cx <= Math.floor((b.max[0] + m) / 2); cx++) for (let cz = Math.floor((b.min[2] - m) / 2); cz <= Math.floor((b.max[2] + m) / 2); cz++) {
            const L = H.get(cx + ':' + cz); if (!L) continue;
            for (let i = 0; i < L.length; i += 3) { const x = L[i], y = L[i + 1], z = L[i + 2]; if (x < b.min[0] - m || x > b.max[0] + m || z < b.min[2] - m || z > b.max[2] + m || y < b.min[1] + 0.04 || y > b.max[1] + 1) continue; n++; mx[1] = Math.max(mx[1], y); if (y < by0 || y > by1) continue; mn[0] = Math.min(mn[0], x); mx[0] = Math.max(mx[0], x); mn[1] = Math.min(mn[1], y); mn[2] = Math.min(mn[2], z); mx[2] = Math.max(mx[2], z); }
          }
          const k = b0.kind || '?'; (out[k] ||= { n: 0, vazio: 0, g: [] }).n++;
          if (!n) { out[k].vazio++; continue; }
          // largura/profundidade normalizadas: lado menor em x
          const flip = b.max[0] - b.min[0] > b.max[2] - b.min[2], gx = ((mn[0] - b.min[0]) + (b.max[0] - mx[0])) / 2, gz = ((mn[2] - b.min[2]) + (b.max[2] - mx[2])) / 2;
          out[k].g.push([flip ? gz : gx, flip ? gx : gz, b.max[1] - mx[1], Math.min(b.max[0] - b.min[0], b.max[2] - b.min[2]), Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]), b.max[1] - b.min[1]]);
        }
        const med = (a, i) => { const s = a.map(x => x[i]).sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null; };
        return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { n: v.n, vazio: v.vazio, curto: med(v.g, 0), longo: med(v.g, 1), topo: med(v.g, 2), w: med(v.g, 3), l: med(v.g, 4), h: med(v.g, 5) }]));
      });
      const bad = Object.entries(r).filter(([, v]) => v.vazio || [v.curto, v.longo, v.topo].some(x => x != null && Math.abs(x) > LIM));
      console.log(map.padEnd(10), bad.length ? '' : 'OK', Object.keys(r).length + ' tipos');
      for (const [k, v] of bad) { console.log('   ', k.padEnd(14), JSON.stringify(v)); (tot[k] ||= []).push(map); }
    } catch (e) { console.log(map, 'FALHOU', e.message.slice(0, 160)); }
    await p.close();
  }
  console.log('RESUMO', JSON.stringify(tot)); await b.close();
})();
