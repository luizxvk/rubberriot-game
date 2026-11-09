// Bateria de desempenho (09/11), com o dev (5197) no ar: node tools/perf-bateria.cjs [mapa:modo ...] [--secs=10] [--bots=11] [--w=1600] [--h=900]
// Por mapa e por configuracao: FPS medio, 1% pior, pior quadro, travadas (>33 ms), oscilacao, chamadas e triangulos POR QUADRO de verdade (somando todas as passadas),
// e o que cada ajuste grafico muda (distancia de desenho, contornos, detalhe dos bonecos).
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), opt = (k, d) => Number(args.find(a => a.startsWith('--' + k + '='))?.split('=')[1] ?? d), SECS = opt('secs', 10), BOTS = opt('bots', 11);
const CASES = args.filter(a => !a.startsWith('--')); if (!CASES.length) CASES.push('becos:dom', 'feira:dom', 'largo:dom', 'cortejo:escort', 'vila:tdm');
const SETS = [['padrao', {}], ['longe', { draw: 'far' }], ['perto', { draw: 'near' }], ['contorno-eco', { outl: 'eco' }], ['contorno-full', { outl: 'full' }], ['boneco-baixo', { chars: 'low' }], ['boneco-alto', { chars: 'high' }]];
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--enable-precise-memory-info'] });
  for (const c of CASES) {
    const [map, mode] = c.split(':'), p = await b.newPage({ viewport: { width: opt('w', 1600), height: opt('h', 900) } }), errs = []; p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message); });
    try {
      await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
      await p.evaluate(([map, mode, bots]) => window.__solo({ mode, map, bots, difficulty: 'easy', lobby: false }), [map, mode, BOTS]);
      await p.waitForFunction(() => __G.state === 'game' && __G.world !== null, null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(9000);
      console.log('== ' + c);
      for (const [nome, cfg] of SETS) {
        const r = await p.evaluate(async ([cfg, SECS]) => {
          __applySet?.(cfg); await new Promise(r => setTimeout(r, 700));
          const R = __R, info = R.info, C = __C; info.autoReset = false; info.reset();
          const yaw0 = __G.player?.yaw || 0, ts = []; let last = performance.now(), calls = 0, tris = 0, maxT = 0, n = 0, occ = 0, vis = 0;
          await new Promise(res => { const t0 = performance.now(), f = () => { const t = performance.now(), d = t - last; last = t; if (n > 2) ts.push(d); calls += info.render.calls; tris += info.render.triangles; maxT = Math.max(maxT, info.render.triangles); info.reset(); n++; if (__G.player) __G.player.yaw = yaw0 + (t - t0) / (SECS * 1000) * Math.PI * 2; for (const r of __G.remotes.values()) { vis++; if (r.occl) occ++; } if (t - t0 > SECS * 1000) return res(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
          info.autoReset = true;
          const s = [...ts].sort((a, b) => a - b), avg = ts.reduce((a, b) => a + b, 0) / ts.length, win = []; for (let i = 0; i + 30 < ts.length; i += 30) win.push(1000 / (ts.slice(i, i + 30).reduce((a, b) => a + b, 0) / 30));
          return { fps: +(1000 / avg).toFixed(0), p1: +(1000 / s[Math.floor(s.length * 0.99)]).toFixed(0), pior: +s[s.length - 1].toFixed(0), trav: ts.filter(t => t > 33).length, min_fps: +Math.min(...win).toFixed(0), max_fps: +Math.max(...win).toFixed(0), calls: Math.round(calls / n), trisK: Math.round(tris / n / 1000), trisMaxK: Math.round(maxT / 1000), atrasParede: Math.round(occ / Math.max(1, vis) * 100) + '%', heapMB: Math.round(performance.memory.usedJSHeapSize / 1048576), geo: info.memory.geometries, tex: info.memory.textures, prog: info.programs?.length };
        }, [cfg, SECS]);
        console.log('  ' + nome.padEnd(14), JSON.stringify(r));
      }
      if (errs.length) console.log('  ERROS', errs.slice(0, 3));
    } catch (e) { console.log(c, 'FALHOU', e.message.slice(0, 200), errs.slice(0, 2)); }
    await p.close();
  }
  await b.close();
})();
