// Conferencia propria (10/11): lobby com bots (nome + coroa), partida a noite (bonecos sem branco), Chat Rapido aberto.
const { chromium } = require('../../template-magazine/node_modules/playwright');
const out = process.argv[2] || '.';
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png`, timeout: 60000 }).catch(e => console.log('sem print', n, e.message.slice(0, 80)));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } }), errs = [];
  p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message.slice(0, 160)); });
  await p.goto('http://localhost:5197/?semconta');
  await p.evaluate(() => { localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); });
  await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(() => window.__solo({ mode: 'tdm', map: 'vila', bots: 9, difficulty: 'easy', lobby: true }));
  await p.waitForTimeout(6000); await shot(p, 'lobby');
  await p.evaluate(() => window.quitGame ? 0 : 0); await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(() => window.__solo({ mode: 'tdm', map: 'vila', bots: 9, difficulty: 'easy', lobby: false }));
  await p.waitForFunction(() => __G.state === 'game' && __G.M, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(9000);
  await p.evaluate(() => { const k = __G.net.core; k.tod = 'night'; k.night = true; });
  await p.waitForTimeout(3000);
  // vira a camera pro bot mais perto
  await p.evaluate(() => { const me = __G.player; let best = null, bd = 1e9; for (const r of __G.remotes.values()) { if (!r.alive) continue; const d = Math.hypot(r.pos[0] - me.pos[0], r.pos[2] - me.pos[2]); if (d < bd) { bd = d; best = r; } } if (best) me.yaw = Math.atan2(-(best.pos[0] - me.pos[0]), -(best.pos[2] - me.pos[2])); });
  await p.waitForTimeout(800); await shot(p, 'noite');
  await p.keyboard.press('KeyY'); await p.waitForTimeout(800); await shot(p, 'chat-rapido');
  await p.keyboard.press('Digit3'); await p.waitForTimeout(700); await shot(p, 'chat-rapido-mandou');
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina');
  await b.close();
})();
