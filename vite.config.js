// base relativa: na Rovex o jogo mora em /rubber-riot-game/
// versao do jogo (package.json) entra no build como __APP_VERSION__ e aparece so no lobby
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// editor de arma (tools/arma-editor.html, 06/11): POST /__tt/save grava src/tt_guns.json. So no dev
const ttSave = {
  name: 'tt-save', apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__tt/save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      let body = '';
      req.on('data', c => { body += c; });
      req.on('end', () => {
        try {
          const list = JSON.parse(body);
          if (!Array.isArray(list) || list.some(g => !g || typeof g.id !== 'string')) throw new Error('lista invalida');
          writeFileSync(new URL('./src/tt_guns.json', import.meta.url), '[\n' + list.map(g => ' ' + JSON.stringify(g)).join(',\n') + '\n]\n');
          res.setHeader('content-type', 'application/json'); res.end('{"ok":true}');
        } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, erro: String(e.message || e) })); }
      });
    });
  },
};
// canal de desempenho so no dev: POST /__perf/log anexa 1 linha JSON em .perf/live.log
const perfLog = {
  name: 'perf-log', apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__perf/log', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
      let body = '', big = false;
      req.on('data', c => { if (big) return; body += c; if (body.length > 65536) big = true; });
      req.on('end', () => {
        if (big) { res.statusCode = 413; return res.end(); }
        try {
          mkdirSync(new URL('./.perf/', import.meta.url), { recursive: true });
          appendFileSync(new URL('./.perf/live.log', import.meta.url), body.replace(/[\r\n]+/g, ' ') + '\n');
          res.statusCode = 204; res.end();
        } catch { res.statusCode = 500; res.end(); }
      });
    });
  },
};
// server.watch.ignored (04/11): copiar .glb/.mp3 novo pra public com o dev ligado derrubava o vite (EBUSY no Windows)
export default { base: './', define: { __APP_VERSION__: JSON.stringify(version) }, plugins: [ttSave, perfLog], server: { watch: { ignored: ['**/public/models/**', '**/public/sfx/**', '**/.perf/**'] } } };
