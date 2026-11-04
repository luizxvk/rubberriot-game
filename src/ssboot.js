// Tela dividida (01/11): ate 4 pessoas no mesmo PC, um controle cada. A pagina com ?split hospeda as telas
// (splithost.js) e roda a Core; cada tela e uma copia do jogo num iframe com ?ss=<tela>&pad=<controle>.
// Este modulo carrega ANTES de tudo (os outros leem o localStorage na carga): na tela de convidado o
// localStorage vira uma memoria propria, entao progresso/arsenal/visual do dono ficam intocados e cada tela
// guarda so os ajustes dela (sensibilidade, FOV, comandos) em rr_ss_settings_<tela>.
const qs = new URLSearchParams(location.search);
const inFrame = (() => { try { return window.parent !== window && !!window.parent.__ssHost; } catch { return false; } })();

export const SPLIT_HOST = qs.has('split') && !qs.has('ss');
export const SS = qs.has('ss') && inFrame ? { slot: Math.max(0, Math.min(3, Number(qs.get('ss')) | 0)), pad: Number(qs.get('pad')) | 0, n: Math.max(1, Math.min(4, Number(qs.get('n')) | 0)) } : null;

if (SS) {
  const SS_SLOT = SS.slot;
  const real = window.localStorage, key = 'rr_ss_settings_' + SS.slot;
  // volume (03/11, pedido dele): igual em TODAS as telas, sempre o do PC. Cada tela guardava o seu (e a conta de cada um
  // trazia o dela): a tela 1 tocava baixissimo e a 2 normal
  try { const pc = JSON.parse(real.getItem('rr_settings') || '{}'); SS.vol = { master: pc.master ?? 0.8, music: pc.music ?? 0.45, sfx: pc.sfx ?? 1 }; } catch { SS.vol = { master: 0.8, music: 0.45, sfx: 1 }; }
  const mem = new Map();
  const rget = (k) => { try { return real.getItem(k); } catch { return null; } };
  // primeira vez desta tela: herda os ajustes do PC (grafico, idioma, volume) com nome de convidado
  let st = null;
  try { st = JSON.parse(rget(key) || 'null'); } catch { /* */ }
  if (!st) { try { st = JSON.parse(rget('rr_settings') || '{}'); } catch { st = {}; } st.name = 'Jogador ' + (SS.slot + 1); delete st.binds; delete st.skills; st.field = 'umbrella'; }
  // tela 1 = o dono do PC (03/11, pedido dele): sequencias, skills, equipamento e arma principal sempre iguais as do solo
  // (antes a copia era feita uma vez so e o HUD mostrava sequencias velhas). As outras telas sem escolha herdam as sequencias
  try {
    const pc = JSON.parse(rget('rr_settings') || '{}');
    if (SS_SLOT === 0) for (const k of ['streaks', 'skills', 'field', 'primary']) { if (pc[k] !== undefined) st[k] = pc[k]; }
    else if (!Array.isArray(st.streaks) && Array.isArray(pc.streaks)) st.streaks = pc.streaks;
  } catch { /* */ }
  mem.set('rr_settings', JSON.stringify(st));
  for (const k of ['rr_lang', 'rr_tips']) { const v = rget(k); if (v != null) mem.set(k, v); } // dica ja vista no PC nao volta em cada tela
  mem.set('rr_home_tour', '1'); mem.set('rr_tutorial_seen', '1'); mem.set('rr_tutorial_done', '1');
  // conta Rovex desta tela (02/11): entrou pelo QR na pagina da tela dividida. A sessao vai pra memoria desta tela;
  // o progresso, o arsenal e as variantes DESTA pessoa descem da conta dela e sobem de volta (cada tela a sua)
  try { const a = JSON.parse(rget('rr_ss_acct_' + SS_SLOT) || 'null'); if (a?.token) { mem.set('rr_token', a.token); st.name = a.name || st.name; mem.set('rr_settings', JSON.stringify(st)); } } catch { /* */ }
  const store = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); if (k === 'rr_settings') try { real.setItem(key, String(v)); } catch { /* */ } },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear(),
    key: (i) => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  };
  Object.defineProperty(window, 'localStorage', { value: store, configurable: true });
  document.documentElement.classList.add('ss-child');
}
