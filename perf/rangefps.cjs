const { chromium } = require('D:/Desktop/fokusstudios/template-magazine/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9334'); const p = b.contexts()[0].pages()[0];
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.setViewportSize({ width: 1600, height: 900 });
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__A?.arsenalLoaded?.(), null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  await p.evaluate(async () => { (await import('/src/newspop.js')).closeNews(); document.querySelector('[data-go="arsenal"]')?.click(); });
  await p.waitForTimeout(2000); await p.click('#smithRange', { force: true });
  await p.waitForFunction(() => __G.state === 'game' && __G.range?.started && __G.range.targets.length, null, { timeout: 120000 });
  await p.evaluate(() => { setInterval(() => { __G.paused = false; const e = document.getElementById('pause'); if (e) e.hidden = true; }, 30); });
  await p.waitForTimeout(3000);
  const run = (kill) => p.evaluate((kill) => new Promise(res => {
    const R = __G.range, C = __G.net.core, me = C.players.get(__G.myId), ft = []; let last = performance.now(), t0 = last, k = 0, calls = 0, nf = 0, maxCalls = 0;
    const objs0 = (() => { let n = 0; __S.traverse(() => n++); return n; })(), prog0 = __R.info.programs.length;
    const iv = kill ? setInterval(() => { const id = R.targets[k++ % 5]; const o = C.players.get(id); if (o?.alive) C.damage(o, me, 999, 'rifle', false); }, 300) : 0;
    const tick = () => { const now = performance.now(); ft.push(now - last); last = now; nf++; calls += __R.info.render.calls; maxCalls = Math.max(maxCalls, __R.info.render.calls);
      if (now - t0 < 4000) return requestAnimationFrame(tick);
      clearInterval(iv); ft.sort((a, b) => a - b); let n = 0; __S.traverse(() => n++);
      res({ kill, fps: +(1000 / (ft.reduce((a, b) => a + b, 0) / ft.length)).toFixed(1), p50: +ft[ft.length >> 1].toFixed(1), p99: +ft[Math.floor(ft.length * 0.99)].toFixed(1), max: +ft[ft.length - 1].toFixed(1), calls: Math.round(calls / nf), maxCalls, objs: objs0 + '->' + n, progs: prog0 + '->' + __R.info.programs.length });
    }; requestAnimationFrame(tick);
  }), kill);
  const snap = () => p.evaluate(() => { const m = new Map(); __S.traverse(o => { if (o === __S) return; const k = (o.name || o.type) + '|' + (o.material?.type || '') + '|' + (o.material?.name || '') + '|' + (o.parent?.name || o.parent?.type || ''); m.set(k, (m.get(k) || 0) + 1); }); let vis = 0; const V = []; __S.traverse(o => { if (!o.isMesh) return; let q = o, on = true, ch = []; while (q) { if (!q.visible) on = false; ch.push(q.name || q.type); q = q.parent; } if (on) { vis++; V.push(o.uuid + '|' + ch.slice(0, 5).join('<') + '|' + o.material?.type + '|' + (o.geometry?.type || '') + '|' + (o.geometry?.attributes?.position?.count || 0)); } }); return { objs: [...m], vis, V, progs: __R.info.programs.map(q => q.name + ':' + String(q.cacheKey).slice(0, 80)) }; });
  const A = await snap(); console.log(JSON.stringify(await run(true))); await p.waitForTimeout(3000); const B = await snap();
  console.log('malhas visiveis', A.vis, '->', B.vis); const AV = new Set(A.V); const agg = new Map(); for (const v of B.V) if (!AV.has(v)) { const k = v.split('|').slice(1).join('|'); agg.set(k, (agg.get(k) || 0) + 1); } for (const [k, n] of [...agg].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log('NOVA VISIVEL x' + n, k);
  const am = new Map(A.objs); for (const [k, n] of B.objs) if (n !== (am.get(k) || 0)) console.log('obj', k, (am.get(k) || 0), '->', n);
  for (const q of B.progs) if (!A.progs.includes(q)) console.log('prog novo', q);
  console.log('erros', JSON.stringify(errs)); process.exit(0);
})();

