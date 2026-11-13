// folha de poses (13/11): node tools/vm-sheet.cjs <saida.png> <pose> <w:body[:scope[:handle]]> ...
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const [out, pose, ...list] = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 300 } }); p.on('pageerror', e => console.log('ERRO', e.message.slice(0, 160)));
  const shots = [];
  for (const it of list) {
    const [w, body, scope, handle] = it.split(':');
    await p.goto(`http://localhost:5197/tools/vm-pose.html?w=${w}&body=${body}&pose=${pose}${scope ? '&scope=' + scope : ''}${handle ? '&handle=' + handle : ''}`); await p.waitForTimeout(5500);
    shots.push({ body: body + (scope ? ' ' + scope : '') + (handle ? ' ' + handle : ''), png: (await p.screenshot()).toString('base64') });
  }
  const cols = 4, rows = Math.ceil(shots.length / cols);
  await p.setViewportSize({ width: 480 * cols, height: 300 * rows });
  await p.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},480px)">${shots.map(s => `<div style="position:relative"><img src="data:image/png;base64,${s.png}"><b style="position:absolute;left:4px;top:4px;color:red;font:14px monospace">${s.body}</b></div>`).join('')}</body>`);
  await p.waitForTimeout(500); await p.screenshot({ path: out }); await b.close();
})();
