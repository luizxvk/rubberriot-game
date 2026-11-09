// Onde o tempo de CPU vai numa partida (09/11), com o dev (5197) no ar: node tools/perf-perfil.cjs mapa:modo [--secs=8] [--bots=11]
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), opt = (k, d) => Number(args.find(a => a.startsWith('--' + k + '='))?.split('=')[1] ?? d), [map, mode] = (args.find(a => !a.startsWith('--')) || 'largo:dom').split(':');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(([map, mode, bots]) => window.__solo({ mode, map, bots, difficulty: 'easy', lobby: false }), [map, mode, opt('bots', 11)]); await p.waitForTimeout(8000);
  const c = await p.context().newCDPSession(p); await c.send('Profiler.enable'); await c.send('Profiler.setSamplingInterval', { interval: 500 }); await c.send('Profiler.start');
  await p.waitForTimeout(opt('secs', 8) * 1000);
  const { profile } = await c.send('Profiler.stop'); const dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n])), self = new Map(); let total = 0;
  profile.samples.forEach((id, i) => { const n = byId.get(id), d = dt[i] || 0; total += d; const f = n.callFrame, k = f.functionName + ' ' + f.url.replace(/^.*\/(src|shared|node_modules\/\.vite\/deps)\//, '').replace(/\?.*$/, '') + ':' + f.lineNumber; self.set(k, (self.get(k) || 0) + d); });
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 26);
  for (const [k, v] of top) console.log((v / total * 100).toFixed(1).padStart(5) + '%', k);
  await b.close();
})();
