// Caca aos picos (09/11), com o dev (5197) no ar: node tools/perf-picos.cjs mapa:modo [--secs=40] [--bots=11]
// Cada quadro acima de 33 ms sai com o que mudou nele: shaders novos, texturas, geometrias e eventos da partida.
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), opt = (k, d) => Number(args.find(a => a.startsWith('--' + k + '='))?.split('=')[1] ?? d), [map, mode] = (args.find(a => !a.startsWith('--')) || 'largo:dom').split(':');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync', '--enable-precise-memory-info'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } }), errs = []; p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message); });
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(([map, mode, bots]) => window.__solo({ mode, map, bots, difficulty: 'easy', lobby: false }), [map, mode, opt('bots', 11)]); await p.waitForTimeout(9000);
  const r = await p.evaluate(async (SECS) => {
    const R = __R, info = R.info, out = []; let last = performance.now(), geo = info.memory.geometries, tex = info.memory.textures, prog = info.programs.length, heap = performance.memory.usedJSHeapSize, n = 0; const t0 = last, yaw0 = __G.player?.yaw || 0, g0 = geo;
    await new Promise(res => { const f = () => { const t = performance.now(), d = t - last; last = t; n++; const g2 = info.memory.geometries, t2 = info.memory.textures, p2 = info.programs.length, h2 = performance.memory.usedJSHeapSize; if (d > 33 && n > 3) out.push({ em: +((t - t0) / 1000).toFixed(1), ms: +d.toFixed(0), prog: p2 - prog, tex: t2 - tex, geo: g2 - geo, heapMB: Math.round((h2 - heap) / 1048576) }); geo = g2; tex = t2; prog = p2; heap = h2; if (__G.player) __G.player.yaw = yaw0 + (t - t0) / 12000 * Math.PI * 2; if (t - t0 > SECS * 1000) return res(); requestAnimationFrame(f); }; requestAnimationFrame(f); });
    return { quadros: n, fps: Math.round(n / SECS), geoSubiu: info.memory.geometries - g0, picos: out };
  }, opt('secs', 40));
  console.log(JSON.stringify({ ...r, picos: undefined })); for (const x of r.picos.slice(0, 30)) console.log(JSON.stringify(x)); console.log(errs.slice(0, 3)); await b.close();
})();
