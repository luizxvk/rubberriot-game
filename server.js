// Servidor multiplayer do Rubber Riot: salas por codigo, cada sala roda um Core.
// Na Fly (app rubber-riot-mp). Quem chega com token da Rovex joga com o nome da conta;
// sem token entra como visitante. Nenhum segredo nem banco aqui: a conta e conferida
// na propria API da Rovex (GET /api/users/me).
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { QUICK_MODES, QUICK_BOTS, Core } from './shared/core.js';

const PORT = Number(process.env.PORT) || 5196;
const API = process.env.ROVEX_API || 'https://api.tryrovex.com';
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
  res.writeHead(404); res.end();
});
const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });
server.listen(PORT);

async function rovexName(token) {
  if (!token || typeof token !== 'string' || token.length > 4096) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const r = await fetch(API + '/api/users/me', { headers: { Authorization: 'Bearer ' + token }, signal: ctrl.signal });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? ((u.displayName || '').trim() || u.name || null) : null;
  } catch { return null; } finally { clearTimeout(timer); }
}
const rooms = new Map(); // code -> { core, clients:Map(id->ws) }
let seq = 1;

// Jogo Rapido: sala publica com partida aberta (a mais cheia) ou uma nova com modo sorteado
const QCHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function quickRoom() {
  let best = null;
  for (const [code, r] of rooms) if (r.pub && r.core.quickOpen() && (!best || r.core.humans() > best[1].core.humans())) best = [code, r];
  if (best) return best[0];
  let code;
  do code = 'Q' + Array.from({ length: 5 }, () => QCHARS[Math.floor(Math.random() * QCHARS.length)]).join(''); while (rooms.has(code));
  getRoom(code, QUICK_MODES[Math.floor(Math.random() * QUICK_MODES.length)], 'auto', QUICK_BOTS, true);
  return code;
}

function getRoom(code, mode, map, bots, quick = false) {
  let room = rooms.get(code);
  if (!room) {
    room = { clients: new Map(), pub: quick };
    room.core = new Core({
      mode, map, bots, difficulty: 1, lobby: !quick, autoNext: quick,
      send: (to, msg) => {
        const data = JSON.stringify(msg);
        if (to == null) { for (const ws of room.clients.values()) if (ws.readyState === 1) ws.send(data); }
        else { const ws = room.clients.get(to); if (ws && ws.readyState === 1) ws.send(data); }
      },
    });
    rooms.set(code, room);
    console.log(`sala ${code} criada (${room.core.mode}, ${room.core.M.id}, ${bots} bots)`);
  }
  return room;
}

wss.on('connection', (ws) => {
  const id = 'p' + seq++;
  let room = null, joining = false;
  ws.on('message', (buf) => {
    let m;
    try { m = JSON.parse(buf); } catch { return; }
    if (m.t === 'join' && !room && !joining) {
      joining = true;
      let code = (String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '')).slice(0, 8);
      if (m.quick) code = 'QUICK';
      if (!code) { ws.send(JSON.stringify({ t: 'err', code: 'noroom' })); joining = false; return; }
      // entrar por codigo so em sala que existe; criar e o caminho do host
      if (m.join && !rooms.has(code)) { ws.send(JSON.stringify({ t: 'err', code: 'noroom' })); joining = false; return; }
      rovexName(m.token).then(acct => {
        if (ws.readyState !== 1) return;
        const name = String(acct || m.name || 'Player').slice(0, 14);
        if (m.quick) code = quickRoom();
        const target = getRoom(code, m.mode, m.map, Math.max(0, Math.min(15, Number(m.bots) || 0)));
        // sala com 16 pessoas: recusa (bots abrem vaga sozinhos, gente nao)
        if (target.core.full()) { ws.send(JSON.stringify({ t: 'err', code: 'full' })); joining = false; return; }
        room = target;
        room.clients.set(id, ws);
        room.core.join(id, name);
        ws.send(JSON.stringify({ t: 'room', code, mode: room.core.duo ? 'duo' : room.core.mode }));
      });
      return;
    }
    if (room) room.core.handle(id, m);
  });
  ws.on('close', () => {
    if (!room) return;
    room.clients.delete(id);
    room.core.leave(id);
    if (room.clients.size === 0) {
      for (const [code, r] of rooms) if (r === room) { rooms.delete(code); console.log(`sala ${code} fechada`); }
    }
  });
});

let last = performance.now();
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  for (const r of rooms.values()) r.core.tick(dt);
}, 1000 / 30);

console.log(`Rubber Riot MP ouvindo em ws://0.0.0.0:${PORT}`);
