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
  const real = window.localStorage, key = 'rr_ss_settings_' + SS.slot;
  const mem = new Map();
  const rget = (k) => { try { return real.getItem(k); } catch { return null; } };
  // primeira vez desta tela: herda os ajustes do PC (grafico, idioma, volume) com nome de convidado
  let st = null;
  try { st = JSON.parse(rget(key) || 'null'); } catch { /* */ }
  if (!st) { try { st = JSON.parse(rget('rr_settings') || '{}'); } catch { st = {}; } st.name = 'Jogador ' + (SS.slot + 1); delete st.binds; delete st.skills; st.field = 'umbrella'; }
  mem.set('rr_settings', JSON.stringify(st));
  for (const k of ['rr_lang', 'rr_tips']) { const v = rget(k); if (v != null) mem.set(k, v); } // dica ja vista no PC nao volta em cada tela
  mem.set('rr_home_tour', '1'); mem.set('rr_tutorial_seen', '1'); mem.set('rr_tutorial_done', '1');
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
