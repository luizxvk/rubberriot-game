// Transporte: solo roda o Core no proprio navegador; multiplayer fala com o server.js.
import { Core } from '../shared/core.js';
import { token } from './rovex.js';

export class LocalNet {
  constructor({ mode, map, bots, difficulty, lobby = true, limit = 0, time = 0, mut = null }) {
    this.queue = [];
    this.onmsg = () => {};
    this.onclose = () => {};
    this.core = new Core({ mode, map, bots, difficulty, lobby, limit, time, mut, send: (to, m) => { if (to == null || to === 'me') this.queue.push(m); } });
    this.core.local = true; // sem AFK no solo
  }
  connect(name) { this.core.join('me', name); return Promise.resolve(); }
  send(m) { this.core.handle('me', m); }
  update(dt) {
    this.core.tick(dt);
    const q = this.queue; this.queue = [];
    for (const m of q) this.onmsg(m);
  }
  close() {}
}

// solo com bots num WORKER (14/11, pedido dele): mesma interface do LocalNet, a Core roda em outro nucleo (src/coreworker.js).
// Sem acesso direto a .core (Campo de tiro e Tutorial mexem nela na hora: esses continuam no LocalNet). flags: endless, noDrops.
// Nao deu pra criar o worker (navegador antigo, erro): devolve um LocalNet, igual a antes
export function soloNet(opts, flags = null) {
  try { return new WorkerNet(opts, flags); } catch (e) { console.warn('worker da partida falhou, segue no LocalNet', e); const n = new LocalNet(opts); Object.assign(n.core, flags || {}); return n; }
}
export class WorkerNet {
  constructor(opts, flags) {
    this.onmsg = () => {}; this.onclose = () => {}; this.inbox = []; this.core = null; this.ping = 0;
    this.w = new Worker(new URL('./coreworker.js', import.meta.url), { type: 'module' });
    this.w.onmessage = (ev) => { const m = ev.data; if (m.k === 'out') for (const x of m.batch) this.inbox.push(x); else if (m.k === 'err') console.warn('[partida no worker]', m.e); };
    this.w.onerror = (e) => console.warn('[partida no worker] erro', e.message);
    this.w.postMessage({ k: 'init', opts, flags });
  }
  connect(name) { this.w.postMessage({ k: 'join', name }); return Promise.resolve(); }
  send(m) { this.w.postMessage({ k: 'msg', m }); }
  set(key, v) { this.w.postMessage({ k: 'flag', key, v }); }
  update() {
    // 14/11: o worker roda no relogio proprio (60x/s); aqui so avisa que o jogo segue rodando (no maximo 30x/s) e le o que chegou.
    // Quadro lento da tela nao segura mais os bots (antes: paravam e depois pulavam, como ping alto)
    const now = performance.now();
    if (now - this.ping > 33) { this.ping = now; this.w.postMessage({ k: 'run' }); }
    const q = this.inbox; this.inbox = [];
    for (const m of q) this.onmsg(m);
  }
  close() { this.w.terminate(); }
}

// tela dividida: a Core roda na pagina que hospeda as telas (splithost.js); cada tela fala com ela como se
// fosse o servidor (mensagem vai e volta em JSON, igual ao multiplayer: nada de objeto de outra janela)
export class SplitNet {
  constructor(slot) { this.id = 'ss' + slot; this.host = window.parent.__ssHost; this.inbox = []; this.onmsg = () => {}; this.onclose = () => {}; }
  connect(name) { this.host.join(this.id, name, this.inbox); return Promise.resolve(); }
  send(m) { this.host.handle(this.id, JSON.stringify(m)); }
  update() {
    const q = this.inbox.splice(0);
    for (const raw of q) this.onmsg(JSON.parse(raw));
  }
  close() { this.host.quit(); }
}

export class WsNet {
  constructor({ url, room, mode, map, bots, join = false, quick = false, ranked = false }) {
    Object.assign(this, { url, room, mode, map, bots, join, quick, ranked });
    this.onmsg = () => {};
    this.onclose = () => {};
  }
  connect(name) {
    return new Promise((res, rej) => {
      let ws;
      try { ws = new WebSocket(this.url); } catch (e) { rej(e); return; }
      this.ws = ws;
      let opened = false;
      const to = setTimeout(() => { ws.close(); const e = new Error('timeout'); e.code = 'down'; rej(e); }, 8000);
      // so resolve quando o servidor confirma a sala; codigo que nao existe volta como erro
      let inRoom = false;
      const fail = (code, msg) => { clearTimeout(to); const e = new Error(msg); e.code = code; rej(e); };
      ws.onopen = () => { opened = true; ws.send(JSON.stringify({ t: 'join', name, room: this.room, mode: this.mode, map: this.map, bots: this.bots, join: this.join, quick: this.quick, ranked: this.ranked, token: token(), sid: sessionId() })); };
      ws.onerror = () => { if (!opened) fail('down', 'Não deu pra conectar em ' + this.url); };
      ws.onmessage = (e) => {
        const now = performance.now();
        this.lastMsg = now;
        let m; try { m = JSON.parse(e.data); } catch { return; }
        // 15/11 (relatorio): maior buraco entre estados do servidor (20/s = 50 ms); o relatorio de desempenho le e zera a cada 10 s
        if (m.t === 'snap') { if (this.snapAt) this.gapMax = Math.max(this.gapMax || 0, now - this.snapAt); this.snapAt = now; }
        if (!inRoom) {
          if (m.t === 'err') { fail(m.code, m.code); ws.close(); return; }
          // jogo rapido: daqui pra frente e' uma sala comum (reconectar volta pra ela pelo codigo)
          if (m.t === 'room') { inRoom = true; clearTimeout(to); this.join = true; if (this.quick || this.ranked) { this.room = m.code; this.quick = false; this.ranked = false; } res(); }
        }
        this.onmsg(m);
      };
      ws.onclose = () => { if (inRoom) this.onclose(); else if (opened) fail('down', 'conexão caiu'); };
    });
  }
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  // o servidor manda algo pelo menos 4x por segundo; 5 s mudo = conexao morta sem aviso (wifi desligado).
  // Larga o socket velho e avisa como se tivesse fechado (o jogo tenta voltar pro mesmo boneco)
  update() {
    if (!this.lastMsg || performance.now() - this.lastMsg < 5000 || this.dropped) return;
    this.dropped = true;
    const ws = this.ws; ws.onmessage = ws.onclose = ws.onerror = null;
    try { ws.close(); } catch { /* */ }
    this.onclose();
  }
  // saiu de proposito: avisa antes, pro servidor tirar o boneco na hora (sem esperar a volta)
  close() { this.onclose = () => {}; this.send({ t: 'bye' }); this.ws && this.ws.close(); }
}

// chave desta aba: o servidor reconhece quem voltou depois de cair e devolve o mesmo boneco
let sid = null;
function sessionId() {
  if (sid) return sid;
  try { sid = sessionStorage.getItem('rr_sid'); } catch { /* */ }
  if (!sid) { sid = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); try { sessionStorage.setItem('rr_sid', sid); } catch { /* */ } }
  return sid;
}
