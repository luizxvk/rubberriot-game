// Ponte com a Rovex. Na Rovex o jogo roda em tryrovex.com/rubber-riot-game/ (mesma origem
// do site), entao o login dela (token no localStorage) vale aqui direto. A pagina da Rovex
// passa a base da API em ?api= e o convite chega como ?sala=.
const qs = new URLSearchParams(location.search);
export const API = (qs.get('api') || '/api').replace(/\/$/, '');
export const inviteRoom = (qs.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || null;
export const inRovex = qs.has('api');

// servidor multiplayer: dentro do backend da Rovex, no app rovex-games (Fly), em /rubber-riot/ws.
// Jogo solto no dev (vite 5197): o server.js local. Rovex no dev (api relativa): o backend local.
export const MP_URL = qs.get('mp')
  || (location.port === '5197' ? `ws://${location.hostname}:5196`
    : /^https?:/.test(API) ? 'wss://rovex-games.fly.dev/rubber-riot/ws'
      : `ws://${location.hostname}:3000/rubber-riot/ws`);

export function token() {
  try { return localStorage.getItem('token') || sessionStorage.getItem('token') || null; } catch { return null; }
}

async function call(path, opt = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), opt.timeout || 8000);
  try {
    const r = await fetch(API + path, {
      method: opt.method || 'GET', keepalive: !!opt.keepalive, signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(to); }
}

// conta logada (null = visitante ou sem rede)
export let me = null;
export async function loadMe() {
  if (!token()) return null;
  try {
    const u = await call('/users/me', { timeout: 5000 });
    me = u && u.id ? { id: String(u.id), name: ((u.displayName || '').trim() || u.name || 'Player').slice(0, 14) } : null;
  } catch { me = null; }
  return me;
}

export async function friends() {
  const list = await call('/social/friends');
  return (Array.isArray(list) ? list : []).map(f => ({ id: f.id, name: f.displayName || f.name || '?', avatar: f.avatarUrl || '', online: !!f.isOnline }));
}
export const invite = (friendId, room) => call('/games/rubber-riot/invite', { method: 'POST', body: { friendId, room } });

// ---------- save na conta ----------
// a conta manda: logou, o save dela entra no lugar do local. Conta sem save herda o
// progresso local, a nao ser que ele seja de OUTRA conta deste navegador.
const KEYS = ['rr_progress_v1', 'rr_loadouts_v1', 'rr_challenges_v1', 'rr_settings', 'rr_lang'];
const OWNER = 'rr_owner';
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

export async function pullSave() {
  if (!(await loadMe())) return;
  try {
    const r = await call('/games/rubber-riot/save', { timeout: 5000 });
    if (r && r.data) {
      for (const k of KEYS) if (typeof r.data[k] === 'string') ls.set(k, r.data[k]); else ls.del(k);
    } else {
      const owner = ls.get(OWNER);
      if (owner && owner !== me.id) for (const k of KEYS) ls.del(k);
      ls.set(OWNER, me.id);
      pushSave();
    }
    ls.set(OWNER, me.id);
  } catch { /* sem rede: joga com o local e sobe depois */ }
}

let timer = 0;
export function pushSoon() {
  if (!me) return;
  clearTimeout(timer);
  timer = setTimeout(pushSave, 3000);
}
export function pushSave(keepalive = false) {
  if (!me) return;
  clearTimeout(timer);
  const data = {};
  for (const k of KEYS) { const v = ls.get(k); if (v != null) data[k] = v; }
  call('/games/rubber-riot/save', { method: 'PUT', body: { data }, keepalive }).catch(() => {});
}
addEventListener('pagehide', () => { if (timer) pushSave(true); });
