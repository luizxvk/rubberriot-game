// salva as fotos de mestre (07/11): node tools/mst-shots.cjs (o 5197 tem que estar no ar)
const fs = require('fs'), path = require('path');
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
  const p = await b.newPage(); p.on('pageerror', e => console.log('[pageerror]', e.message));
  await p.goto('http://localhost:5197/tools/mst-shots.html'); await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 240000 });
  const shots = await p.evaluate(() => window.__shots); const dir = path.join(__dirname, '../public/banners/mst'); fs.mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries(shots)) fs.writeFileSync(path.join(dir, k + '.webp'), Buffer.from(v.split(',')[1], 'base64'));
  console.log(Object.keys(shots).length, 'fotos'); await b.close();
})();
