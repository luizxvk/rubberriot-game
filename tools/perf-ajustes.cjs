// O que cada ajuste grafico muda em cada mapa (09/11), sem bots e sem acaso: node tools/perf-ajustes.cjs [mapa:modo ...]
// Gira a camera 360 graus no meio do mapa e tira a media de chamadas e triangulos por quadro.
const { chromium } = require('../../template-magazine/node_modules/playwright');
const CASES = process.argv.slice(2).length ? process.argv.slice(2) : ['becos:dom', 'feira:dom', 'largo:dom', 'cortejo:escort', 'deserto:dom', 'vila:tdm'];
const SETS = [['padrao', {}], ['dist curta', { draw: 'near' }], ['dist longa', { draw: 'far' }], ['contorno eco', { outl: 'eco' }], ['contorno full', { outl: 'full' }]];
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
  for (const c of CASES) {
    const [map, mode] = c.split(':'), p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    try {
      await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 });
      await p.evaluate(([map, mode]) => window.__solo({ mode, map, bots: 0, difficulty: 'easy', lobby: false }), [map, mode]); await p.waitForTimeout(10000);
      const line = [];
      for (const [nome, cfg] of SETS) {
        const r = await p.evaluate(async (cfg) => {
          __applySet(cfg); await new Promise(r => setTimeout(r, 900));
          const R = __R, info = R.info; info.autoReset = false; info.reset(); let calls = 0, tris = 0, n = 0, t = 0; const P = __G.player, y0 = P.yaw, ts = []; let last = performance.now();
          await new Promise(res => { const f = () => { const now = performance.now(); if (n > 4) { calls += info.render.calls; tris += info.render.triangles; ts.push(now - last); } last = now; info.reset(); n++; P.yaw = y0 + n / 180 * 6.283; if (n > 184) return res(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
          info.autoReset = true; P.yaw = y0; const m = n - 5, avg = ts.reduce((a, b) => a + b, 0) / ts.length;
          return { calls: Math.round(calls / m), trisK: Math.round(tris / m / 1000), fps: Math.round(1000 / avg) };
        }, cfg);
        line.push(nome + ' ' + r.calls + 'c ' + r.trisK + 'kt ' + r.fps + 'fps');
      }
      console.log(c.padEnd(16), line.join(' | '));
    } catch (e) { console.log(c, 'FALHOU', e.message.slice(0, 160)); }
    await p.close();
  }
  await b.close();
})();
