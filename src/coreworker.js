// Simulacao da partida solo em OUTRO NUCLEO (14/11, pedido dele: otimizar tudo; medido no app: a IA dos bots era 13-17% da
// CPU da mesma linha que desenha a tela). Mesma Core do servidor; conversa com o jogo por mensagens (igual ao multiplayer).
// 14/11 (pedido dele: 'bots travam como ping alto e depois voltam'): o tick era puxado pelo quadro da tela; quadro lento = bots
// parados e depois pulando. Agora o worker roda no RELOGIO PROPRIO, 60x/s, e manda o estado a cada tick. O jogo so avisa que
// esta rodando ('run', a cada atualizacao); sem aviso por 0,3 s (pausa, aba escondida) ele para sozinho.
import { Core } from '../shared/core.js';

let core = null, out = [], timer = null, last = 0, alive = 0;
const flush = () => { if (out.length) { const batch = out; out = []; self.postMessage({ k: 'out', batch }); } };
function step() {
  const now = performance.now();
  if (now - alive > 300) { clearInterval(timer); timer = null; return; } // o jogo parou de pedir ha 0,3 s: pausa (quadro travado nao conta)
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  try { core.tick(dt); } catch (e) { self.postMessage({ k: 'err', e: String(e?.stack || e).slice(0, 600) }); }
  flush();
}
self.onmessage = (ev) => {
  const m = ev.data;
  try {
    if (m.k === 'init') {
      core = new Core({ ...m.opts, send: (to, x) => { if (to == null || to === 'me') out.push(x); } });
      core.local = true; // sem AFK no solo
      Object.assign(core, m.flags || {}); // endless (menu), noDrops...
    } else if (m.k === 'join') core.join('me', m.name);
    else if (m.k === 'msg') core.handle('me', m.m);
    else if (m.k === 'run') { alive = performance.now(); if (!timer && core) { last = alive; timer = setInterval(step, 1000 / 60); } }
    else if (m.k === 'flag') core[m.key] = m.v;
  } catch (e) { self.postMessage({ k: 'err', e: String(e?.stack || e).slice(0, 600) }); }
  flush();
};
