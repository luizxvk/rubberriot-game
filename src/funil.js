// Funil de acesso (31/10): conta visita -> carregou -> jogou -> terminou por ORIGEM, pro painel da Rovex.
// Invisivel pro jogador. Cada etapa sai UMA vez por sessao do navegador; sem conta tambem conta (anonimo).
// Origem: utm_source (+ utm_campaign) da URL; senao o referrer (instagram, facebook...); senao rovex/direto.
import { API, inRovex } from './rovex.js';

// 'retrato' (01/11): abriu com o celular em pe e caiu no aviso de girar
const ETAPAS = ['visita', 'carregou', 'jogou', 'terminou', 'retrato'];
const limpa = (s, n) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, n);

function descobre() {
  const qs = new URLSearchParams(location.search);
  const src = limpa(qs.get('utm_source'), 16), camp = limpa(qs.get('utm_campaign'), 16);
  if (src) return camp ? `${src}.${camp}` : src;
  let ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* */ }
  if (/instagram\./.test(ref)) return 'instagram';
  if (/(facebook|fb)\.(com|me)$/.test(ref)) return 'facebook';
  // link de anuncio da Meta sem UTM chega com fbclid e, no navegador do app, sem referrer
  if (qs.has('fbclid')) return 'meta';
  if (/(^|\.)google\./.test(ref)) return 'google';
  if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(ref)) return 'x';
  if (/tiktok\./.test(ref)) return 'tiktok';
  if (/youtube\.|youtu\.be/.test(ref)) return 'youtube';
  if (/whatsapp\./.test(ref)) return 'whatsapp';
  if (inRovex || /(^|\.)tryrovex\.com$/.test(ref)) return 'rovex';
  return ref ? 'outro' : 'direto';
}

let origem = null;
try { origem = sessionStorage.getItem('rr_funil_origem'); } catch { /* */ }
if (!origem) { origem = descobre(); try { sessionStorage.setItem('rr_funil_origem', origem); } catch { /* */ } }

export function funil(etapa) {
  // no dev nao conta (?funil liga pra testar)
  if (!ETAPAS.includes(etapa) || (import.meta.env.DEV && !location.search.includes('funil'))) return;
  if (/[?&](ss|split)=/.test(location.search)) return; // tela dividida: as telas nao sao visitas novas
  const k = 'rr_funil_' + etapa;
  try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* */ }
  try {
    fetch(API + '/games/rubber-riot/funil', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ etapa, origem }) }).catch(() => {});
  } catch { /* */ }
}

// erro que estourou no navegador vai pro servidor (01/11: a tela branca da Torta nao deixou log nenhum).
// No maximo 5 por aba e cada mensagem uma vez so.
const vistos = new Set();
export function reportaErro(e, onde = '') {
  if (import.meta.env.DEV) { console.error('[reportaErro]', onde, e); return; }
  if (vistos.size >= 5) return;
  const msg = String(e?.message || e || '').slice(0, 300);
  if (!msg || vistos.has(msg) || /Pointer ?Lock|ResizeObserver/i.test(msg)) return;
  vistos.add(msg);
  try {
    fetch(API + '/games/rubber-riot/erro', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msg, pilha: String(e?.stack || '').slice(0, 900), onde: String(onde).slice(0, 200) }) }).catch(() => {});
  } catch { /* */ }
}
