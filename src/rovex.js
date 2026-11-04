// Ponte com a Rovex. Na Rovex o jogo roda em tryrovex.com/rubber-riot-game/ (mesma origem
// do site), entao o login dela (token no localStorage) vale aqui direto. A pagina da Rovex
// passa a base da API em ?api= e o convite chega como ?sala=.
import { SS } from './ssboot.js';
const qs = new URLSearchParams(location.search);
// site proprio (rubberriot.tryrovex.com): outra origem, entao o jogo guarda a PROPRIA sessao,
// vinda da tela "autorizar app" da Rovex (cofre RUBBER_RIOT, nao derruba o login do site).
export const STANDALONE = !qs.has('api') && (/(^|\.)rubberriot\.tryrovex\.com$/.test(location.hostname) || (import.meta.env.DEV && qs.has('solto'))); // ?solto: testa o site proprio no dev
export const API = STANDALONE ? 'https://api.tryrovex.com/api' : (qs.get('api') || '/api').replace(/\/$/, '');
const OWN = 'rr_token';
if (STANDALONE && location.hash.startsWith('#token=')) {
  try { localStorage.setItem(OWN, decodeURIComponent(location.hash.slice(7))); } catch { /* */ }
  history.replaceState(null, '', location.pathname + location.search);
}
export const AUTH_URL = 'https://tryrovex.com/autorizar-app?app=rubber-riot&callback=' + encodeURIComponent('https://rubberriot.tryrovex.com/');
// guest (31/10): no site proprio da pra jogar sem conta, como guest-NNNN; o save fica so neste aparelho
// (rr_owner = 'guest'). Entrou numa conta: o progresso de guest sobe pra ela (conta com save: fica o maior).
export function guestName() {
  let n = null;
  try { n = localStorage.getItem('rr_guest'); } catch { /* */ }
  if (!n) { n = 'guest-' + String(Math.floor(1000 + Math.random() * 9000)); try { localStorage.setItem('rr_guest', n); } catch { /* */ } }
  return n;
}
export const isGuest = () => STANDALONE && !me;
export function logout() { try { localStorage.removeItem(OWN); } catch { /* */ } }
export const inviteRoom = (qs.get('sala') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || null;
export const inRovex = qs.has('api');

// servidor multiplayer: dentro do backend da Rovex, no app rovex-games (Fly), em /rubber-riot/ws.
// Jogo solto no dev (vite 5197): o server.js local. Rovex no dev (api relativa): o backend local.
export const MP_URL = qs.get('mp')
  || (location.port === '5197' ? `ws://${location.hostname}:5196`
    : /^https?:/.test(API) ? 'wss://rovex-games.fly.dev/rubber-riot/ws'
      : `ws://${location.hostname}:3000/rubber-riot/ws`);

// meta da comunidade: le o contador da semana e soma os PLAFTs da partida (sem conta tambem conta; sem token vai anonimo)
export async function metaGet() {
  try { const r = await fetch(API + '/games/rubber-riot/meta', { signal: AbortSignal.timeout?.(6000) }); return r.ok ? await r.json() : null; } catch { return null; }
}
export async function metaPost(n) {
  const tk = token();
  try {
    const r = await fetch(API + '/games/rubber-riot/meta', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify({ n }) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

export function token() {
  // tela dividida: so a sessao que a pessoa desta tela autorizou pelo QR (nunca a do dono do PC)
  try { return STANDALONE || SS ? localStorage.getItem(OWN) : (localStorage.getItem('token') || sessionStorage.getItem('token') || null); } catch { return null; }
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
    if (r.status === 401 && (STANDALONE || SS)) logout(); // sessao do jogo vencida ou revogada: volta pro "Entrar"
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
    // elite = assinatura Elite da Rovex ativa (o servidor ja confere a validade)
    me = u && u.id ? { id: String(u.id), name: ((u.displayName || '').trim() || u.name || 'Player').slice(0, 14), elite: !!u.isElite, email: typeof u.email === 'string' ? u.email : '', zions: Number.isFinite(u.zions) ? u.zions : null, zionsPoints: Number.isFinite(u.zionsPoints) ? u.zionsPoints : null } : null; // saldo de Zions Points mostrado na loja
  } catch { me = null; }
  try { dispatchEvent(new Event('rovex-me')); } catch { /* fora do navegador */ } // saldos de Zions na tela atualizam (zbal.js)
  if (me) loadShop(); // o que comprou na Loja + saldos (sem esperar: nao atrasa a entrada)
  return me;
}

export async function friends() {
  const list = await call('/social/friends');
  return (Array.isArray(list) ? list : []).map(f => ({ id: f.id, name: f.displayName || f.name || '?', avatar: f.avatarUrl || '', online: !!f.lastSeenAt && Date.now() - new Date(f.lastSeenAt).getTime() < 5 * 60000 })); // isOnline mente: vale a janela do lastSeenAt
}
// salas de amigos: a rovex-api repassa pela rede interna da Fly (nao acorda a rovex-games dormindo)
export async function friendRooms() {
  if (!token()) return [];
  const j = await call('/games/rubber-riot/salas-amigos', { timeout: 5000 });
  return Array.isArray(j?.salas) ? j.salas : [];
}
export const invite = (friendId, room) => call('/games/rubber-riot/invite', { method: 'POST', body: { friendId, room } });
// Loja (03/11): o que a conta comprou (me.rrOwned) e os saldos; comprar desconta Zions Points no servidor da Rovex
export async function loadShop() {
  if (!token() || !me) return null;
  try {
    const j = await call('/games/rubber-riot/loja', { timeout: 6000 });
    me.rrOwned = Array.isArray(j?.itens) ? j.itens : [];
    if (Number.isFinite(j?.zionsPoints)) me.zionsPoints = j.zionsPoints;
    if (Number.isFinite(j?.zions)) me.zions = j.zions;
    dispatchEvent(new Event('rovex-me'));
    return j;
  } catch { return null; }
}
// devolve { ok } ou { code: 'sem_saldo' | 'ja_tem' | 'login' | 'erro', saldo?, preco? }
export async function buyItem(sku) {
  if (!token() || !me) return { code: 'login' };
  try {
    const r = await fetch(API + '/games/rubber-riot/loja/comprar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ sku }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { code: j.code || 'erro', saldo: j.saldo, preco: j.preco };
    me.rrOwned = j.itens || me.rrOwned; me.zionsPoints = j.zionsPoints; me.zions = j.zions;
    dispatchEvent(new Event('rovex-me'));
    return { ok: true };
  } catch { return { code: 'erro' }; }
}
// fim de partida: conta o que aconteceu; quem decide o valor e deposita e o servidor (zpCredit em shared/shop.js)
export async function claimZions(won, ch) {
  if (!token() || !me) return { code: 'login' };
  try {
    const r = await fetch(API + '/games/rubber-riot/zions/partida', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }, body: JSON.stringify({ won, ch }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { code: 'erro' };
    me.zionsPoints = j.zionsPoints; me.zions = j.zions;
    dispatchEvent(new Event('rovex-me'));
    return j;
  } catch { return { code: 'erro' }; }
}
// convites que chegaram pra mim (o sininho da Rovex nao aparece com o jogo aberto)
export async function invites() {
  if (!token()) return [];
  const j = await call('/games/rubber-riot/convites', { timeout: 5000 });
  return Array.isArray(j?.convites) ? j.convites : [];
}
export const inviteSeen = (id) => call('/games/rubber-riot/convites/' + encodeURIComponent(id) + '/lido', { method: 'POST' }).catch(() => {});

// apoio do jogo (04/11): a mesma sessao de pagamento do apoio do feed da Rovex; devolve a URL da Stripe
export async function supportCheckout(amount) {
  const j = await call('/payment/stripe/support/create-session', { method: 'POST', body: { amount }, timeout: 12000 });
  return j?.url || null;
}

// ---------- save na conta ----------
// a conta manda: logou, o save dela entra no lugar do local. Conta sem save herda o
// progresso local, a nao ser que ele seja de OUTRA conta deste navegador.
const KEYS = ['rr_progress_v1', 'rr_loadouts_v1', 'rr_variants_v1', 'rr_challenges_v1', 'rr_settings', 'rr_lang', 'rr_look_v1'];
const OWNER = 'rr_owner';
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* */ } },
};

// desafio ganho nao volta atras (04/11, Nyx viu o banner do akimbo e nao levou): a gravacao sai no maximo a cada 30 s, entao quem
// fecha o jogo logo depois do desbloqueio fica com a nuvem atrasada, e o login seguinte apagava o que estava neste aparelho. Mesma
// conta: vale o maior progresso de cada desafio e toda variante ganha. Devolve o JSON novo, ou null se a nuvem ja esta em dia.
export function keepEarned(localRaw, cloudRaw) {
  const J = (x) => { try { return JSON.parse(x) || {}; } catch { return {}; } };
  const a = J(localRaw), b = J(cloudRaw); let changed = false;
  for (const [k, v] of Object.entries(a.career || {})) if (v > ((b.career ||= {})[k] || 0)) { b.career[k] = v; changed = true; }
  for (const [k, v] of Object.entries(a.bps || {})) if (v && !(b.bps ||= {})[k]) { b.bps[k] = v; changed = true; }
  return changed ? JSON.stringify(b) : null;
}

export async function pullSave() {
  if (!(await loadMe())) {
    // sem conta no site proprio = guest: save local de outra conta deste navegador nao vira do guest
    // (a conta continua salva na nuvem e volta quando ela entrar)
    if (STANDALONE) { const owner = ls.get(OWNER); if (owner && owner !== 'guest') for (const k of KEYS) ls.del(k); ls.set(OWNER, 'guest'); }
    return;
  }
  try {
    const r = await call('/games/rubber-riot/save', { timeout: 5000 });
    const owner = ls.get(OWNER), wasGuest = owner === 'guest';
    const xpOf = (raw) => { try { return JSON.parse(raw)?.xp || 0; } catch { return 0; } };
    if (r && r.data) {
      // guest que acabou de entrar: se jogou mais como guest do que a conta tem, o dele vale e sobe
      if (wasGuest && xpOf(ls.get('rr_progress_v1')) > xpOf(r.data.rr_progress_v1)) pushSave();
      else {
        // variantes (02/11): conta que ainda nao tem as variantes na nuvem (gravadas antes da chave existir) nao apaga as
        // deste aparelho; elas sobem na proxima gravacao
        const keepVar = typeof r.data.rr_variants_v1 !== 'string' && owner === me.id && ls.get('rr_variants_v1');
        const earned = owner === me.id && typeof r.data.rr_challenges_v1 === 'string' ? keepEarned(ls.get('rr_challenges_v1'), r.data.rr_challenges_v1) : null;
        for (const k of KEYS) if (typeof r.data[k] === 'string') ls.set(k, r.data[k]); else if (!(k === 'rr_variants_v1' && keepVar)) ls.del(k);
        if (earned) ls.set('rr_challenges_v1', earned);
        if (keepVar || earned) pushSoon();
      }
    } else {
      if (owner && owner !== me.id && !wasGuest) for (const k of KEYS) ls.del(k);
      ls.set(OWNER, me.id);
      pushSave();
    }
    ls.set(OWNER, me.id);
  } catch { /* sem rede: joga com o local e sobe depois */ }
}

// no maximo 1 gravacao a cada 30 s: com muita gente jogando, salvar a cada abate enchia o banco
// de escrita. O que mudar no meio entra na proxima; fechar a aba grava na hora (pagehide).
const GAP = 30000;
let timer = 0, lastPush = 0, lastBody = '';
export function pushSoon() {
  if (!me || timer) return;
  timer = setTimeout(pushSave, Math.max(3000, lastPush + GAP - Date.now()));
}
export function pushSave(keepalive = false) {
  if (!me) return;
  clearTimeout(timer); timer = 0;
  const data = {};
  for (const k of KEYS) { const v = ls.get(k); if (v != null) data[k] = v; }
  const body = JSON.stringify(data);
  if (body === lastBody) return; // nada mudou desde a ultima gravacao
  lastPush = Date.now();
  call('/games/rubber-riot/save', { method: 'PUT', body: { data }, keepalive }).then(() => { lastBody = body; }).catch(() => {});
}
addEventListener('pagehide', () => { if (timer) pushSave(true); });

// ---------- uma conta, um aparelho (02/11) ----------
// o jogo logado avisa a cada 60 s "estou jogando neste aparelho"; outro aparelho ativo nos ultimos 90 s = { outro: true }.
// tomar = Contestar: este aparelho passa a ser o da conta (o outro recebe o aviso no proximo toque)
function deviceId() {
  let d = ls.get('rr_dev');
  if (!d || d.length < 8) { d = Array.from(crypto.getRandomValues(new Uint8Array(9)), x => x.toString(36).padStart(2, '0')).join('').slice(0, 16); ls.set('rr_dev', d); }
  return d;
}
export async function sessionPing(tomar = false) {
  if (!me) return { ok: true };
  try { return await call('/games/rubber-riot/sessao', { method: 'POST', body: { dev: deviceId(), tomar }, timeout: 6000 }); } catch { return { ok: true }; } // sem rede/servidor antigo: nao trava ninguem
}
export function sessionEnd() { if (me) call('/games/rubber-riot/sessao', { method: 'POST', body: { dev: deviceId(), sair: true }, keepalive: true }).catch(() => {}); }
// recuperar senha: o mesmo fluxo da Rovex (e-mail com o link de troca)
export async function requestReset() {
  if (!me?.email) return false;
  try { const r = await fetch(API + '/auth/request-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: me.email }) }); return r.ok; } catch { return false; }
}
addEventListener('pagehide', () => sessionEnd()); // fechou: libera a conta pro outro aparelho na hora
