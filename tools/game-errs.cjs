// abre o jogo e lista erros de console/pagina (13/11): node tools/game-errs.cjs [url] [espera]
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] }), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await p.goto(process.argv[2] || 'http://localhost:5197/?semconta'); await p.waitForTimeout(+(process.argv[3] || 30000));
  console.log('solo', await p.evaluate(() => !!window.__solo), 'fx', await p.evaluate(() => !!window.__G?.fx));
  await p.screenshot({ path: process.argv[4] || 'C:/Users/luizg/AppData/Local/Temp/claude/af3b12ad67a29318/8a2f19a3-e970-4aee-ba51-f41f516f8216/scratchpad/sh/game.png' }); await b.close();
})();
