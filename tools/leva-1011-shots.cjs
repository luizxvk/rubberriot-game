// Conferencia propria da leva de 10/11 (nao vai pro Luiz sem ele pedir): home (logo, banners, presente do Elite),
// Visual (efeitos 3D novos, Coroa Elite), Pass (previa no centro), lobby (nome inteiro + coroa), chat rapido, noite.
// node tools/leva-1011-shots.cjs <pasta>
const { chromium } = require('../../template-magazine/node_modules/playwright');
const out = process.argv[2] || '.';
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png`, timeout: 60000 }).catch(e => console.log('sem print', n, e.message.slice(0, 80)));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const errs = [];
  for (const [w, h, tag] of [[1600, 900, 'pc'], [500, 790, 'alto']].slice(0, process.argv[3] === 'alto' ? 2 : 1)) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(tag + ': ' + e.message.slice(0, 160)); });
    await p.goto('http://localhost:5197/?zerar');
    await p.waitForFunction(() => window.__G?.fx, null, { timeout: 90000 });
    await p.waitForTimeout(2500);
    await p.click('#bootGo').catch(() => {});
    await p.waitForTimeout(5000);
    await p.evaluate(() => { document.querySelector('#newsPop .lb-x, #newsPop [class*=x]')?.click(); }); await p.waitForTimeout(3500);
    await shot(p, `home-${tag}-presente`);
    await p.evaluate(() => { const pop = document.getElementById('elitePop'); if (pop) pop.hidden = true; localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); } window.__noTour = 1; document.querySelector('#newsPop .lb-x')?.click(); document.querySelector('.ht-skip, [data-ht=skip]')?.click(); });
    await p.waitForTimeout(400);
    await shot(p, `home-${tag}`);
    if (tag === 'alto') { await p.close(); continue; }
    // popup do Elite (lista completa)
    await p.click('#elitePromo').catch(() => {}); await p.waitForTimeout(1500); await shot(p, 'elite-lista');
    await p.evaluate(() => { document.getElementById('elitePop').hidden = true; });
    // Visual > Efeito
    await p.click('[data-go="look"]').catch(() => {}); await p.waitForTimeout(2500); await p.click('#htSkip', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(500);
    await p.click('[data-lt="fx"]').catch(() => {}); await p.waitForTimeout(800); await shot(p, 'visual-efeitos');
    for (const id of ['elite', 'atom', 'gears', 'leaves']) { await p.click(`#lookGrid [data-id="${id}"]`).catch(() => {}); await p.waitForTimeout(1600); await shot(p, 'fx-' + id); }
    await p.click('[data-lt="death"]').catch(() => {}); await p.waitForTimeout(800); await shot(p, 'visual-morte');
    await p.click('[data-lt="banner"]').catch(() => {}); await p.waitForTimeout(800); await shot(p, 'visual-banners');
    await p.click('[data-lt="dance"]').catch(() => {}); await p.waitForTimeout(800); await shot(p, 'visual-dancas');
    await p.close();
  }
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina');
  await b.close();
})();
