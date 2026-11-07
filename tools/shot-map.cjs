// Print do mapa no navegador (06/11): node tools/shot-map.cjs <mapa> <saida.png> "cx,cy,cz" "tx,ty,tz" [espera s]
// ?old=1 no 6o argumento = desenho de caixas de antes do Blender; tamanho pelas variaveis W e H (padrao 1280x720)
// usa o playwright do template-magazine + Chrome do sistema; o 5197 tem que estar no ar
const { chromium } = require('../../template-magazine/node_modules/playwright');
(async () => {
  const [m, out, c, t, w = '14', old = ''] = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu'] });
  const p = await b.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
  await p.goto(`http://localhost:5197/tools/mapa.html?m=${m}&c=${c}&t=${t}&w=${w}${old ? '&old=1' : ''}`);
  await p.waitForFunction(() => document.title === 'pronto', null, { timeout: 120000 });
  await p.screenshot({ path: out }); await b.close();
})();
