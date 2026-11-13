// abre uma partida solo num mapa e tira prints em pontos dados (13/11): node tools/mapa-jogo.cjs <pasta> <modo> <mapa> "x,y,z,yaw,pitch;..."
const { chromium } = require('../../template-magazine/node_modules/playwright');
const [out, mode, map, spots] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message.slice(0, 200)); });
  await p.goto('http://localhost:5197/?semconta');
  await p.evaluate(() => { localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); });
  await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(([mode, map]) => window.__solo({ mode, map, bots: 7, difficulty: 'easy', lobby: false }), [mode, map]);
  await p.waitForFunction(() => __G.state === 'game' && __G.player?.alive, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(7000);
  console.log('mapa', await p.evaluate(() => __G.M?.id), 'modo', await p.evaluate(() => __G.mode));
  let i = 0;
  for (const s of (spots || '').split(';').filter(Boolean)) {
    const [x, y, z, yaw, pitch] = s.split(',').map(Number);
    await p.evaluate(([x, y, z, yaw, pitch]) => { const P = __G.player, k = __G.net.core?.players.get(__G.myId); P.pos = [x, y, z]; P.vel = [0, 0, 0]; P.yaw = yaw; P.pitch = pitch; if (k) { k.pos = [x, y, z]; k.hp = 9999; } }, [x, y, z, yaw, pitch]);
    await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/${map}-${i++}.png` });
  }
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina'); await b.close();
})();
