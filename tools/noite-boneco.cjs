// boneco de dia x de noite lado a lado (13/11): node tools/noite-boneco.cjs <pasta>
const { chromium } = require('../../template-magazine/node_modules/playwright');
const out = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message.slice(0, 200)); });
  await p.goto('http://localhost:5197/?semconta');
  await p.evaluate(() => { localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); });
  await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate(() => window.__solo({ mode: 'ffa', map: 'vila', bots: 3, difficulty: 'easy', lobby: false }));
  await p.waitForFunction(() => __G.state === 'game' && __G.player?.alive, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(6000);
  await p.evaluate(() => { const G = __G, k = G.net.core; G.__pin = setInterval(() => { const me = G.player, f = [-Math.sin(me.yaw), -Math.cos(me.yaw)]; let i = 0; for (const q of k.players.values()) { if (!q.bot) continue; q.pos = [me.pos[0] + f[0] * 4 + (i - 1) * 1.4 * f[1], me.pos[1], me.pos[2] + f[1] * 4 - (i - 1) * 1.4 * f[0]]; q.vel = [0, 0, 0]; q.hp = 999; q.yaw = me.yaw + Math.PI; i++; } }, 30); G.player.pitch = -0.05; });
  await p.waitForTimeout(1500); await p.screenshot({ path: out + '/bon-dia.png' });
  await p.evaluate(() => { __G.forceNight = true; }); await p.waitForTimeout(2000); await p.screenshot({ path: out + '/bon-noite.png' });
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina'); await b.close();
})();
