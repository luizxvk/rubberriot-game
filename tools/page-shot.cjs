// print de qualquer pagina do localhost (13/11): node tools/page-shot.cjs <url> <saida.png> [w] [h] [esperaMs]
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const [url, out, w = 1200, h = 800, wait = 6000] = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('ERRO', e.message.slice(0, 200)));
  await p.goto(url); await p.waitForTimeout(+wait);
  const bad = await p.evaluate(() => window.__bad || null).catch(() => null); if (bad) console.log('bad', JSON.stringify(bad).slice(0, 400));
  await p.screenshot({ path: out }); await b.close();
})();
