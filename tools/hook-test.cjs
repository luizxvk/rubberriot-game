// Gancho do Palco (13/11): mira numa parede alta, lanca, confere se subiu na beirada; e bonecos de dia x noite
// node tools/hook-test.cjs <pasta>
const { chromium } = require('../../template-magazine/node_modules/playwright');
const out = process.argv[2] || '.';
const shot = (p, n) => p.screenshot({ path: `${out}/${n}.png`, timeout: 60000 }).catch(e => console.log('sem print', n, e.message.slice(0, 80)));
(async () => {
  const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  p.on('pageerror', e => { if (!/Pointer Lock/.test(e.message)) errs.push(e.message.slice(0, 200)); });
  await p.goto('http://localhost:5197/?semconta');
  await p.evaluate(() => { localStorage.setItem('rr_news_seen', 'novidades-2026-11-10'); localStorage.setItem('rr_home_tour2', '1'); });
  await p.waitForFunction(() => window.__solo && window.__G?.fx, null, { timeout: 90000 }); await p.waitForFunction(() => __A.arsenalLoaded?.(), null, { timeout: 70000 });
  await p.evaluate((m) => window.__solo({ mode: 'tdm', map: m, bots: 5, difficulty: 'easy', lobby: false }), process.env.MAPA || 'vila');
  await p.waitForFunction(() => __G.state === 'game' && __G.M && __G.player?.alive, null, { timeout: 60000 }).catch(() => {});
  await p.evaluate(() => { for (const q of __G.net.core.players.values()) if (q.bot && q.ai) q.ai.frozen = true; }); // bots parados desde o comeco (o boneco morria antes do teste)
  await p.waitForTimeout(8000);
  await p.waitForFunction(() => __G.player?.alive, null, { timeout: 30000 }).catch(() => {});
  const setup = await p.evaluate(() => {
    const G = __G, k = G.net.core, me = k.players.get(G.myId); me.hp = 9999; me.field = 'hook'; me.fieldCharge = 1; G.field = 'hook'; G.fieldK = 1;
    for (const q of k.players.values()) if (q.bot) { q.ai && (q.ai.frozen = true); } // bots parados longe
    const P = G.player, best = [];
    for (const bx of G.M.boxes) { const h = bx.max[1]; if (h < 2.5 || h > 7 || bx.min[1] > 0.3) continue; const cx = (bx.min[0] + bx.max[0]) / 2, cz = (bx.min[2] + bx.max[2]) / 2, w = Math.min(bx.max[0] - bx.min[0], bx.max[2] - bx.min[2]); if (w < 2.5) continue; const d = Math.hypot(cx - P.pos[0], cz - P.pos[2]); if (d > 8 && d < 26) best.push({ bx, d, cx, cz }); }
    best.sort((a, c) => a.d - c.d); const B = best[0]; if (!B) return { erro: 'sem predio' };
    // mira no meio da face mais perto, a 1/2 da altura
    const bx = B.bx, x = Math.max(bx.min[0], Math.min(bx.max[0], P.pos[0])), z = Math.max(bx.min[2], Math.min(bx.max[2], P.pos[2]));
    const tx = x === P.pos[0] ? x : x, ty = bx.max[1] * 0.55, tz = z;
    const e = P.eyePos(), dx = tx - e[0], dy = ty - e[1], dz = tz - e[2];
    P.yaw = Math.atan2(-dx, -dz); P.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    window.__hk = { top: bx.max[1], box: bx };
    return { top: bx.max[1], d: B.d, pos: P.pos.map(v => +v.toFixed(2)) };
  });
  console.log('setup', JSON.stringify(setup));
  await p.waitForTimeout(700);
  console.log('estado', JSON.stringify(await p.evaluate(() => ({ field: __G.field, alive: __G.player.alive, down: __G.down, aim: !!__G.player.hookAim, st: __G.state, paused: __G.paused }))));
  console.log('mira', JSON.stringify(await p.evaluate(() => { const a = __G.player.hookAim; return a && { ok: a.ok, dist: +a.dist.toFixed(1), ledge: !!a.ledge, p: a.p.map(v => +v.toFixed(2)) }; })));
  await shot(p, 'gancho-mira');
  await p.evaluate(() => __G.player.useField());
  await p.waitForTimeout(90); await shot(p, 'gancho-lancando');
  await p.waitForTimeout(170); await shot(p, 'gancho-puxando');
  const track = [];
  for (let i = 0; i < 12; i++) { await p.waitForTimeout(200); track.push(await p.evaluate(() => __G.player.pos.map(v => +v.toFixed(2)).concat(+!!__G.player.hook))); }
  console.log('trilha', JSON.stringify(track));
  console.log('fim', JSON.stringify(await p.evaluate(() => ({ y: __G.player.pos[1], top: window.__hk.top, fieldK: __G.fieldK, uses: __G.net.core.players.get(__G.myId).hookUses, ground: __G.player.onGround }))));
  await shot(p, 'gancho-chegou');
  // longe demais: olha pro ceu
  await p.evaluate(() => { __G.player.pitch = 1.2; }); await p.waitForTimeout(400); await shot(p, 'gancho-longe');
  // dia x noite: olha pro bot mais perto
  const look = () => p.evaluate(() => { const me = __G.player; let best = null, bd = 1e9; for (const r of __G.remotes.values()) { if (!r.alive) continue; const d = Math.hypot(r.pos[0] - me.pos[0], r.pos[2] - me.pos[2]); if (d < bd) { bd = d; best = r; } } if (best) { const e = me.eyePos(); const dx = best.pos[0] - e[0], dz = best.pos[2] - e[2]; me.yaw = Math.atan2(-dx, -dz); me.pitch = Math.atan2(best.pos[1] + 1 - e[1], Math.hypot(dx, dz)); } __G.field = null; });
  await look(); await p.waitForTimeout(700); await shot(p, 'dia');
  await p.evaluate(() => { __G.forceNight = true; }); await p.waitForTimeout(1500); await look(); await p.waitForTimeout(600); await shot(p, 'noite');
  console.log(errs.length ? 'ERROS\n' + errs.join('\n') : 'sem erros de pagina');
  await b.close();
})();
