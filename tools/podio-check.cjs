// Audita a camera final do podio em todos os mapas, de dia e de noite: node tools/podio-check.cjs <pasta de saida> [mapas separados por virgula]
// 5197 no ar. Escreve podio.json e uma foto por mapa (cilindros vermelhos = lugar dos bonecos).
const { chromium } = require('../../template-magazine/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ALL = ['vila', 'fabrica', 'fronteira', 'estaleiro', 'refinaria', 'ilha', 'bonde', 'apito', 'ferradura', 'tinteiro', 'deserto', 'docas', 'moeda', 'becos', 'feira', 'largo', 'cortejo'];
(async () => {
  const out = process.argv[2], maps = process.argv[3] ? process.argv[3].split(',') : ALL; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] }), rows = [];
  for (const m of maps) for (const n of [0, 1]) {
    const p = await b.newPage({ viewport: { width: 1600, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    try {
      await p.goto(`http://localhost:5197/tools/podio-check.html?m=${m}&n=${n}`);
      await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 90000 });
      const r = await p.evaluate(() => window.__res); rows.push(r);
      await p.screenshot({ path: path.join(out, `${m}-${n ? 'noite' : 'dia'}.jpg`), type: 'jpeg', quality: 70 });
      console.log(`${m.padEnd(10)} ${n ? 'noite' : 'dia  '} palco ${String(r.stage).padStart(5)}%  tela ${String(r.frame).padStart(5)}%  d ${r.spot.d}  ${Object.entries(r.who).map(([k, v]) => `${k}x${v.n}@${v.at}`).join(' | ')}`);
    } catch (e) { console.log(`${m} ${n} ERRO ${e.message.split('\n')[0]} ${errs.join(' / ')}`); rows.push({ map: m, night: !!n, erro: e.message }); }
    await p.close();
  }
  fs.writeFileSync(path.join(out, 'podio.json'), JSON.stringify(rows, null, 1)); await b.close();
})();
