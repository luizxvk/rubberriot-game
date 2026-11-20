const { chromium } = require('D:/Desktop/fokusstudios/template-magazine/node_modules/playwright');
(async () => { const b = await chromium.connectOverCDP('http://127.0.0.1:9334'); const ctx = b.contexts()[0]; const p = await ctx.newPage();
  await p.setViewportSize({ width: 1600, height: 900 });
  await p.goto('http://localhost:5197/?semconta'); await p.waitForFunction(() => window.__solo && window.__G?.fx && __A.arsenalLoaded?.(), null, { timeout: 120000 });
  await p.evaluate(async () => (await import('/src/newspop.js')).closeNews()); await p.waitForTimeout(8000);
  await p.evaluate(() => window.__solo({ mode: 'ffa', map: 'vila', bots: 7, difficulty: 'normal', lobby: false, limit: 0 }));
  await p.waitForFunction(() => __G.state === 'game' && __G.world !== null, null, { timeout: 120000 });
  await p.evaluate(() => { setInterval(() => { __G.paused = false; const e = document.getElementById('pause'); if (e) e.hidden = true; }, 30); });
  await p.waitForFunction(() => !__G.intro && !(__G.snap?.freeze > 0), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => {
    const R = __R, out = { shadow: R.shadowMap.enabled, casters: 0, calls: R.info.render.calls, tris: R.info.render.triangles };
    // conta o que o renderer DESENHA neste quadro: passa por render da cena principal com um contador por categoria
    const cam = __G.camera, fr = new (cam.constructor === Object ? Object : window.__S.constructor)(); // placeholder
    const cat = (o) => { let q = o, path = []; while (q) { path.push(q.name || ''); q = q.parent; } const s = path.join('/');
      if (o.material?.isShaderMaterial && /outline|ink/i.test(o.material.name || '') ) return 'contorno';
      if (o.parent?.isMesh && o.material?.isShaderMaterial) return 'contorno';
      for (const r of __G.remotes.values()) { let q2 = o; while (q2) { if (q2 === r.char?.root) return 'bonecos'; q2 = q2.parent; } }
      if (__G.world && (() => { let q2 = o; while (q2) { if (q2 === __G.world.root || q2 === __G.world) return true; q2 = q2.parent; } return false; })()) return 'mapa';
      return 'outros:' + (o.parent?.name || o.parent?.type || '') ; };
    const m = new Map(); let vis = 0;
    __S.traverse(o => { if (!(o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine || o.isSprite)) return; let q = o, on = true; while (q) { if (!q.visible) { on = false; break; } q = q.parent; } if (!on) return; if (o.castShadow) out.casters++; vis++; const k = cat(o); m.set(k, (m.get(k) || 0) + 1); });
    out.visiveis = vis; out.cats = [...m].sort((a, b) => b[1] - a[1]).slice(0, 14);
    out.bots = __G.remotes.size; let perChar = []; for (const r of __G.remotes.values()) { let n = 0; r.char?.root?.traverse(o => { if (o.isMesh && o.visible) n++; }); perChar.push(n); } out.malhasPorBoneco = perChar;
    out.vm = 0; window.__VM?.scene?.traverse(o => { if (o.isMesh && o.visible) out.vm++; });
    return out; });
  console.log(JSON.stringify(r, null, 1)); await p.close(); process.exit(0); })();
