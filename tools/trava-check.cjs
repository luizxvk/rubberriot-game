// Partida solo (dev 5197) com 15 bots: erros da pagina, bots parados na TELA e bonecos invisiveis.
// node tools/trava-check.cjs [mapa:modo ...] [--secs=120] [--night]
const { chromium } = require('../../template-magazine/node_modules/playwright');
const args = process.argv.slice(2), SECS = Number(args.find(a => a.startsWith('--secs='))?.split('=')[1] || 120), NIGHT = args.includes('--night');
const CASES = args.filter(a => !a.startsWith('--')); if (!CASES.length) CASES.push('largo:ctf');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  for (const c of CASES) {
    const [map, mode] = c.split(':'), p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = new Map();
    p.on('pageerror', e => { if (/Pointer Lock/.test(e.message)) return; const k = e.message.slice(0, 160); errs.set(k, (errs.get(k) || 0) + 1); if (errs.get(k) === 1) console.log('  ERRO', k, '\n   ', (e.stack || '').split('\n').slice(1, 4).join(' | ')); });
    p.on('console', m => { if (m.type() === 'error') { const k = 'console: ' + m.text().slice(0, 160); errs.set(k, (errs.get(k) || 0) + 1); if (errs.get(k) === 1) console.log('  ', k); } });
    await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
    await p.evaluate(([map, mode]) => window.__solo({ mode, map, bots: 15, difficulty: 'easy', lobby: false }), [map, mode]);
    await p.waitForFunction(() => __G.state === 'game' && __G.world !== null, null, { timeout: 60000 }).catch(() => {});
    if (NIGHT) await p.evaluate(() => { const k = __G.net.core; k.tod = 'night'; k.night = true; });
    console.log('== ' + c + (NIGHT ? ' (noite)' : ''));
    let prev = null;
    for (let t = 0; t < SECS; t += 10) {
      await p.waitForTimeout(10000);
      const s = await p.evaluate(() => {
        const out = {}; for (const r of __G.remotes.values()) { const sv = __G.snap?.players?.find(q => q.id === r.id); out[r.id] = { tela: [...r.char.root.position.toArray()], vivo: !!sv?.alive, vis: r.char.root.visible, nome: r.name, srv: sv ? [...sv.pos] : null }; }
        return { out, fase: __G.net.core?.phase, snapN: __G.snapN || 0, tick: __G.net.core?.clock };
      });
      if (prev) {
        let paradoTela = 0, paradoSrv = 0, vivos = 0; const invis = [];
        for (const [id, r] of Object.entries(s.out)) { const q = prev.out[id]; if (!q || !r.vivo || !q.vivo) continue; vivos++;
          if (Math.hypot(r.tela[0] - q.tela[0], r.tela[2] - q.tela[2]) < 0.3) paradoTela++;
          if (r.srv && q.srv && Math.hypot(r.srv[0] - q.srv[0], r.srv[2] - q.srv[2]) < 0.3) paradoSrv++;
          if (!r.vis) invis.push(r.nome); }
        console.log(`  ${t + 10}s: vivos ${vivos}, parados na tela ${paradoTela}, parados no core ${paradoSrv}, invisiveis [${invis.join(', ')}] relogio ${s.tick?.toFixed(0)}`);
      }
      prev = s;
    }
    console.log('  erros distintos:', errs.size, [...errs.entries()].map(([k, n]) => n + 'x ' + k.slice(0, 80)));
    await p.close();
  }
  await b.close();
})();
