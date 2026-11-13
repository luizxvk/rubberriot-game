// roda o sight-check e imprime so as RUINS (13/11): node tools/sight-run.cjs [filtro]
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] }), p = await b.newPage();
  p.on('pageerror', e => console.log('ERRO', e.message.slice(0, 200)));
  await p.goto('http://localhost:5197/tools/sight-check.html'); await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 240000 });
  const bad = await p.evaluate(() => window.__bad), f = process.argv[2];
  const L = bad.filter(x => !f || new RegExp(f).test(x.body)); console.log('ruins', bad.length, 'filtradas', L.length); for (const x of L) console.log(JSON.stringify(x));
  await b.close();
})();
