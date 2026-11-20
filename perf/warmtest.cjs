const { chromium } = require('D:/Desktop/fokusstudios/template-magazine/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9334'); const ctx = b.contexts()[0]; const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200))); p.on('console', m => { if (m.type() === 'error' || /aquecimento/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.setViewportSize({ width: 1280, height: 720 });
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx && __A.arsenalLoaded?.(), null, { timeout: 120000 });
  await p.evaluate(async () => (await import('/src/newspop.js')).closeNews());
  const t0 = Date.now(); await p.waitForTimeout(20000);
  console.log('programas no menu depois de 20 s:', await p.evaluate(() => __R.info.programs.length));
  for (const [mode, map, bots] of [['ffa', 'vila', 7], ['bhop', 'telhados', 0], ['trem', 'expresso', 5], ['ffa', 'estande', 0], ['tdm', 'fabrica', 7]]) {
    await p.evaluate(({ mode, map, bots }) => { __G.progMid = []; window.__solo({ mode, map, bots, difficulty: 'normal', lobby: false, limit: 0 }); }, { mode, map, bots });
    await p.waitForFunction(() => __G.state === 'game' && __G.world !== null, null, { timeout: 120000 });
    await p.evaluate(() => { window.__np ||= setInterval(() => { __G.paused = false; const e = document.getElementById('pause'); if (e) e.hidden = true; }, 30); });
    await p.waitForFunction(() => !__G.intro && !(__G.snap?.freeze > 0), null, { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(4000);
    await p.evaluate(async () => { const C = __G.net.core, me = C.players.get(__G.myId); for (const o of [...C.players.values()].filter(o => o.bot).slice(0, 5)) { if (o.alive) C.damage(o, me, 999, 'rifle', false); await new Promise(r => setTimeout(r, 400)); } });
    await p.waitForTimeout(5000);
    const r = await p.evaluate(() => { const gl = __R.getContext(); const src = __R.info.programs.filter(q => /srgb,/.test(q.cacheKey) && !/srgb-linear/.test(q.cacheKey)).map(q => { const sh = gl.getAttachedShaders(q.program) || []; const fs = sh.map(x => gl.getShaderSource(x)).find(t => /gl_FragColor|pc_fragColor|fragColor/.test(t || '') && /void main/.test(t)) || ''; const body = fs.split('void main')[1] || ''; return q.cacheKey.slice(0, 8) + ' :: ' + (fs.match(/uniform [^;]+;/g) || []).slice(0, 8).join(' ') + ' :: ' + body.replace(/\s+/g, ' ').slice(0, 260); }); return { map: __G.M.id, progs: __R.info.programs.length, mid: __G.progMid || [], src }; }); for (const x of r.src) console.log('SRC', x);
    console.log(mode.padEnd(5), r.map.padEnd(9), 'programas', r.progs, ' compilados NA PARTIDA:', r.mid.length, JSON.stringify(r.mid.slice(0, 6)));
    await p.evaluate(() => __G.quit?.() || document.getElementById('rangeBack')?.click()); await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx && __A.arsenalLoaded?.(), null, { timeout: 120000 }); await p.evaluate(async () => (await import('/src/newspop.js')).closeNews()); await p.waitForTimeout(15000);
  }
  console.log('erros', JSON.stringify(errs.filter(e => !/pointer lock/i.test(e)).slice(0, 6))); await p.close(); process.exit(0);
})();


