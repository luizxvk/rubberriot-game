// Bonecos escondidos sem parede de verdade na frente (10/11, "alguns npcs estao invisiveis"):
// a cada 0,25 s, todo boneco marcado como atras de parede (r.occl) e conferido contra o DESENHO do mapa (raio nas malhas).
// Caixa que barra a visao mas nao tem desenho no caminho = falso positivo. node tools/oclusao-check.cjs [mapa:modo ...] [--secs=40]
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), SECS = Number(args.find(a => a.startsWith('--secs='))?.split('=')[1] || 40);
const CASES = args.filter(a => !a.startsWith('--')); if (!CASES.length) CASES.push('vila:tdm', 'largo:ctf');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  for (const c of CASES) {
    const [map, mode] = c.split(':'), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
    await p.evaluate(([map, mode]) => window.__solo({ mode, map, bots: 15, difficulty: 'easy', lobby: false }), [map, mode]);
    await p.waitForFunction(() => __G.state === 'game' && __G.M, null, { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(4000);
    const r = await p.evaluate(async (SECS) => {
      const T = await import('/node_modules/three/build/three.module.js'), rc = new T.Raycaster(), G = __G, M = G.M, cam = __C;
      const segBox = (a, bb) => { // primeira caixa no segmento (mesma conta do raycast do jogo)
        const d = [bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]], len = Math.hypot(...d); let best = len, hit = null;
        for (const x of [...M.boxes, ...(M.dyn || []).map(q => ({ ...q, kind: 'dyn:' + (q.kind || '?') }))]) { if (x.kind === 'rope' || !x.min) continue; let t0 = 0, t1 = best, miss = false;
          for (let k = 0; k < 3 && !miss; k++) { const dk = d[k] / len; if (Math.abs(dk) < 1e-9) { if (a[k] < x.min[k] || a[k] > x.max[k]) miss = true; continue; } let u = (x.min[k] - a[k]) / dk, v = (x.max[k] - a[k]) / dk; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) miss = true; }
          if (!miss && t0 < best) { best = t0; hit = x; } }
        return hit ? { t: best, b: hit } : null;
      };
      const chars = new Set([...G.remotes.values()].map(r => r.char.root)), meshes = []; const walk = (o) => { if (chars.has(o) || !o.visible) return; if (o.isMesh && !o.isSprite && !o.material?.transparent && o.material?.side !== T.BackSide) meshes.push(o); for (const ch of o.children) walk(ch); }; walk(__S);
      const fp = new Map(); let checks = 0, occN = 0, falsos = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < SECS * 1000) {
        await new Promise(r => setTimeout(r, 250));
        for (const r of G.remotes.values()) {
          if (!r.alive) continue; checks++;
          if (!r.occl) continue; occN++;
          const cp = cam.position.toArray(), y = r.pos[1], tgt = [r.pos[0], y + 1.3, r.pos[2]];
          const h = segBox(cp, tgt); if (!h) continue;
          const dir = new T.Vector3(tgt[0] - cp[0], tgt[1] - cp[1], tgt[2] - cp[2]), L = dir.length(); dir.normalize();
          rc.set(cam.position, dir); rc.far = L - 0.5; const vis = rc.intersectObjects(meshes, false);
          if (!vis.length) { falsos++; const bx = h.b, k = `${bx.kind}${bx.vis ? '+vis' : ''} [${bx.min.map(v => v.toFixed(1))}]-[${bx.max.map(v => v.toFixed(1))}]`; fp.set(k, (fp.get(k) || 0) + 1); }
        }
      }
      return { checks, occN, falsos, top: [...fp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) };
    }, SECS);
    console.log(`== ${c}: amostras ${r.checks}, escondidos ${r.occN}, escondidos SEM desenho na frente ${r.falsos}`);
    for (const [k, n] of r.top) console.log('   ', n, k);
    await p.close();
  }
  await b.close();
})();
