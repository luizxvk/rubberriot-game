// Conferencia propria (10/11): logo no cartao estreito, camo Rovex (shader), previa do Pass
const { chromium } = require('../../template-magazine/node_modules/playwright');
const out = process.argv[2] || '.';
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png`, timeout: 60000 }).catch(e => console.log('sem print', n, e.message.slice(0, 80)));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const errs = [];
  const prep = async (p) => { p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message.slice(0, 160)); }); p.on('console', m => { if (m.type() === 'error' && /Shader|WebGL|GLSL/i.test(m.text())) errs.push('GL: ' + m.text().slice(0, 300)); });
    await p.goto('http://localhost:5197/'); await p.evaluate(() => { localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); const k = 'rr_fake_v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.eg = { [new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7)]: [] }; localStorage.setItem(k, JSON.stringify(s)); });
    await p.reload(); await p.waitForFunction(() => window.__G?.fx, null, { timeout: 90000 }); await p.waitForTimeout(2500); await p.click('#bootGo').catch(() => {}); await p.waitForTimeout(4000); };
  const a = await b.newPage({ viewport: { width: 500, height: 790 } }); await prep(a); await shot(a, 'home-alto'); await a.close();
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } }); await prep(p);
  await p.click('[data-go="arsenal"]').catch(() => {}); await p.waitForTimeout(3000); await p.click('#htSkip', { timeout: 2000 }).catch(() => {});
  await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 }).catch(() => {});
  await p.evaluate(() => window.__smithShow('rifle', { body: 'fusil_1', camo: 'rovex' })); await p.waitForTimeout(2500); await shot(p, 'camo-rovex');
  await p.evaluate(() => document.querySelector('.back, [data-back], #arsBack')?.click()); await p.waitForTimeout(1500);
  await p.click('[data-go="shop"]').catch(() => {}); await p.waitForTimeout(2500); await p.click('#htSkip', { timeout: 2000 }).catch(() => {});
  await p.evaluate(() => [...document.querySelectorAll('button, [role=tab]')].find(x => /Rovex Pass|^Pass$/i.test(x.textContent.trim()))?.click()); await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelectorAll('.psx-tile')[39]?.click()); await p.waitForTimeout(3000); await shot(p, 'pass');
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina nem de shader');
  await b.close();
})();
