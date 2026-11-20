const { chromium } = require('D:/Desktop/fokusstudios/template-magazine/node_modules/playwright');
(async () => { const b = await chromium.connectOverCDP('http://127.0.0.1:9334'); const p = await b.contexts()[0].newPage();
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__G?.fx && __A.arsenalLoaded?.(), null, { timeout: 120000 });
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(5000); console.log((i + 1) * 5 + ' s', await p.evaluate(() => __G.state + ' programas ' + __R.info.programs.length)); }
  await p.close(); process.exit(0); })();
