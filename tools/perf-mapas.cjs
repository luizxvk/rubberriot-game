// Desempenho por mapa (09/11), com o dev (5197) no ar: node tools/perf-mapas.cjs [mapa:modo ...] [--secs=12] [--bots=11]
// Mede: FPS real em partida (media, p1 pior, travadas), chamadas e triangulos em 8 direcoes a partir de nascimento e zonas, memoria e o que mais pesa na cena.
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), opt = (k, d) => Number(args.find(a => a.startsWith('--' + k + '='))?.split('=')[1] ?? d), SECS = opt('secs', 12), BOTS = opt('bots', 11);
const CASES = args.filter(a => !a.startsWith('--')); if (!CASES.length) CASES.push('vila:tdm', 'fabrica:tdm', 'deserto:dom', 'becos:dom', 'feira:dom', 'largo:dom', 'cortejo:escort');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--enable-precise-memory-info'] });
  for (const c of CASES) {
    const [map, mode] = c.split(':');
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = []; p.on('pageerror', e => errs.push(e.message));
    try {
      await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
      await p.evaluate(([map, mode, bots]) => { window.__solo({ mode, map, bots, difficulty: 'easy', lobby: false }); }, [map, mode, BOTS]);
      await p.waitForFunction(() => __G.world?.M || __G.net?.myId, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(6000);
      const r = await p.evaluate(async (SECS) => {
        const R = __R, S = __S, info = R.info, ts = []; let last = performance.now(), calls = 0, tris = 0, n = 0, stop = false;
        await new Promise(res => { const f = () => { const t = performance.now(); ts.push(t - last); last = t; calls += info.render.calls; tris += info.render.triangles; n++; if (t - t0 > SECS * 1000) { stop = true; res(); return; } requestAnimationFrame(f); }, t0 = performance.now(); requestAnimationFrame(f); });
        const sorted = [...ts].sort((a, b) => a - b), avg = ts.reduce((a, b) => a + b, 0) / ts.length;
        // o que tem na cena
        const stat = { mesh: 0, inst: 0, instN: 0, trisTotal: 0, lights: 0, shadow: 0, mats: new Set(), geos: new Set() }, byName = {};
        S.traverse(o => { if (o.isLight) { stat.lights++; if (o.castShadow) stat.shadow++; } if (!o.isMesh) return; stat.mesh++; if (o.isInstancedMesh) { stat.inst++; stat.instN += o.count; } const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); stat.trisTotal += t; stat.geos.add(g.uuid); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => stat.mats.add(m.uuid)); let top = o; while (top.parent && top.parent !== S) top = top.parent; const k = top.name || top.type; (byName[k] ||= { n: 0, t: 0 }); byName[k].n++; byName[k].t += t; });
        // varredura: vistas fixas em todas as direcoes
        const G = __G, M = G.world?.M || G.M || G.net?.M || G.core?.M, cam = __C.clone(), pts = [];
        const spawns = M?.spawns ? Object.values(M.spawns).flat() : []; for (const s of spawns.slice(0, 4)) pts.push(s.pos || s.p || s);
        for (const z of (M?.zones || []).slice(0, 4)) pts.push(z.pos || z.p || z);
        let vMax = 0, vTri = 0, vSum = 0, vN = 0, vGpu = 0;
        for (const q of pts) { const x = q.x ?? q[0], z = q.z ?? q[2]; if (x == null || z == null) continue; cam.position.set(x, 1.7, z); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cam.lookAt(x + Math.sin(a) * 10, 1.7, z + Math.cos(a) * 10); cam.updateMatrixWorld(true); const t0 = performance.now(); R.render(S, cam); vGpu = Math.max(vGpu, performance.now() - t0); vMax = Math.max(vMax, info.render.calls); vTri = Math.max(vTri, info.render.triangles); vSum += info.render.calls; vN++; } }
        const top = Object.entries(byName).sort((a, b) => b[1].t - a[1].t).slice(0, 8).map(([k, v]) => k + ' ' + v.n + 'm ' + Math.round(v.t / 1000) + 'kt');
        return { fps: +(1000 / avg).toFixed(1), p1: +(1000 / sorted[Math.floor(sorted.length * 0.99)]).toFixed(1), trava: ts.filter(t => t > 50).length, calls: Math.round(calls / n), tris: Math.round(tris / n / 1000), vMax, vMed: vN ? Math.round(vSum / vN) : 0, vTriK: Math.round(vTri / 1000), vCpu: +vGpu.toFixed(1), mesh: stat.mesh, inst: stat.inst, instN: stat.instN, triK: Math.round(stat.trisTotal / 1000), luzes: stat.lights, sombra: stat.shadow, mats: stat.mats.size, geos: stat.geos.size, texs: info.memory.textures, geoMem: info.memory.geometries, heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576), programas: info.programs?.length, top };
      }, SECS);
      console.log(c.padEnd(16), JSON.stringify(r), errs.length ? 'ERROS ' + errs.slice(0, 2) : '');
    } catch (e) { console.log(c, 'FALHOU', e.message.slice(0, 200), errs.slice(0, 2)); }
    await p.close();
  }
  await b.close();
})();
