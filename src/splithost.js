// Tela dividida (01/11, etapa 1): pagina ?split. Cada controle aperta A pra sentar numa das 4 telas;
// o selo do meio escolhe modo/mapa/bots e comeca. A Core roda AQUI (uma so) e cada tela e o jogo inteiro
// num iframe (?ss=<tela>&pad=<controle>) falando com ela pelo window.__ssHost, em JSON igual ao multiplayer.
// Todo mundo joga como convidado, junto no vermelho contra os bots (etapa 2: conta Rovex por tela).
import { Core, MAP_IDS } from '../shared/core.js';
import { ESCORT_MAPS } from '../shared/map.js';
import './split.css';

const EN = (() => { try { return (localStorage.getItem('rr_lang') || navigator.language || '').startsWith('en'); } catch { return false; } })();
const T = EN ? {
  title: 'Split screen', seat: 'Press A to join', seatSub: 'one controller per screen', leave: 'B leaves', pad: 'Controller {n}', player: 'Player {n}',
  mode: 'Mode', map: 'Map', bots: 'Bots', diff: 'Skill', two: '2 players', twos: { h: 'Top and bottom', v: 'Side by side' }, go: 'Start', back: 'Back to menu', need: 'Plug in a controller and press A',
  soundOff: 'Click or press any key to turn the sound on', hint: 'Player 1 picks: D-pad moves, A changes, Start starts',
  modes: { tdm: 'Team Deathmatch', ffa: 'Free-for-All', ctf: 'Capture the Flag', dom: 'Domination', gungame: 'Gun Game', escort: 'Escort' },
  maps: { auto: 'Automatic', vila: 'Village', fabrica: 'Factory', fronteira: 'Frontier', estaleiro: 'Shipyard', refinaria: 'Refinery', bonde: 'Tram Hill', apito: 'Whistle Valley' },
  diffs: { 0.7: 'Easy', 1: 'Normal', 1.35: 'Hard' },
} : {
  title: 'Tela dividida', seat: 'Aperte A pra entrar', seatSub: 'um controle por tela', leave: 'B sai', pad: 'Controle {n}', player: 'Jogador {n}',
  mode: 'Modo', map: 'Mapa', bots: 'Bots', diff: 'Nivel', two: '2 telas', twos: { h: 'Em cima e embaixo', v: 'Lado a lado' }, go: 'Comecar', back: 'Voltar ao menu', need: 'Ligue um controle e aperte A',
  soundOff: 'Clique ou aperte uma tecla pra ligar o som', hint: 'Jogador 1 escolhe: direcional anda, A troca, Start comeca',
  modes: { tdm: 'Mata-Mata', ffa: 'Contra Todos', ctf: 'Captura a Bandeira', dom: 'Dominacao', gungame: 'Escada de Armas', escort: 'Escolta' },
  maps: { auto: 'Automatico', vila: 'Vila', fabrica: 'Fabrica', fronteira: 'Fronteira', estaleiro: 'Estaleiro', refinaria: 'Refinaria', bonde: 'Ladeira do Bonde', apito: 'Vale do Apito' },
  diffs: { 0.7: 'Faceis', 1: 'Normais', 1.35: 'Dificeis' },
};
const fmt = (s, n) => s.replace('{n}', n);
const MODES = Object.keys(T.modes);
const DIFFS = [0.7, 1, 1.35];
const mapsFor = (mode) => ['auto', ...(mode === 'escort' ? ESCORT_MAPS : MAP_IDS.filter(m => m !== 'ilha' && !ESCORT_MAPS.includes(m)))];

let cfg = { mode: 'tdm', map: 'auto', bots: 6, difficulty: 1, two: 'h' }; // two: como dividir com 2 jogadores (h = em cima e embaixo, v = lado a lado)
try { cfg = { ...cfg, ...JSON.parse(localStorage.getItem('rr_ss_cfg') || '{}') }; } catch { /* */ }
if (!MODES.includes(cfg.mode)) cfg.mode = 'tdm';
if (!mapsFor(cfg.mode).includes(cfg.map)) cfg.map = 'auto';
const saveCfg = () => { try { localStorage.setItem('rr_ss_cfg', JSON.stringify(cfg)); } catch { /* */ } };

// ---------- pagina ----------
document.documentElement.classList.add('ss-host');
document.getElementById('splash')?.remove();
document.getElementById('boot')?.remove();
document.title = 'Rubber Riot - ' + T.title;
const root = document.createElement('div');
root.id = 'ssHost';
root.innerHTML = `
  <section class="ss-setup" id="ssSetup" aria-labelledby="ssTitle">
    <div class="ss-seats">${[0, 1, 2, 3].map(i => `
      <article class="ss-seat p${i}" data-i="${i}">
        <svg class="ss-pad" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
        <h2 class="ss-name"></h2>
        <p class="ss-sub"></p>
        <small class="ss-leave">${T.leave}</small>
      </article>`).join('')}
    </div>
    <div class="ss-badge" role="group" aria-labelledby="ssTitle">
      <h1 id="ssTitle">${T.title}</h1>
      <div class="ss-rows" id="ssRows"></div>
      <button class="ss-go" id="ssGo" type="button">${T.go}</button>
      <p class="ss-hint" id="ssHint"></p>
    </div>
    <button class="ss-back" id="ssBack" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>${T.back}</button>
    <p class="ss-sound" id="ssSound" hidden>${T.soundOff}</p>
  </section>
  <div class="ss-game" id="ssGame" hidden></div>`;
document.body.appendChild(root);
const $ = (id) => document.getElementById(id);

// ---------- lugares ----------
const seats = [null, null, null, null]; // seats[i] = indice do controle (navigator.getGamepads) ou null
let sel = 0; // linha escolhida no selo (controle do jogador 1)
const ROWS = ['mode', 'map', 'bots', 'difficulty', 'two'];
function rowVal(k) {
  if (k === 'mode') return T.modes[cfg.mode];
  if (k === 'map') return T.maps[cfg.map] || cfg.map;
  if (k === 'bots') return String(cfg.bots);
  if (k === 'two') return T.twos[cfg.two] || T.twos.h;
  return T.diffs[cfg.difficulty];
}
function step(k, d) {
  if (k === 'mode') { const i = (MODES.indexOf(cfg.mode) + d + MODES.length) % MODES.length; cfg.mode = MODES[i]; if (!mapsFor(cfg.mode).includes(cfg.map)) cfg.map = 'auto'; }
  else if (k === 'map') { const L = mapsFor(cfg.mode), i = (L.indexOf(cfg.map) + d + L.length) % L.length; cfg.map = L[i]; }
  else if (k === 'bots') cfg.bots = Math.max(0, Math.min(11, cfg.bots + d));
  else if (k === 'two') cfg.two = cfg.two === 'v' ? 'h' : 'v';
  else { const i = (DIFFS.indexOf(cfg.difficulty) + d + DIFFS.length) % DIFFS.length; cfg.difficulty = DIFFS[i]; }
  saveCfg(); render();
}
const label = { mode: T.mode, map: T.map, bots: T.bots, difficulty: T.diff, two: T.two };
function render() {
  $('ssRows').innerHTML = ROWS.map((k, i) => `
    <div class="ss-row${i === sel ? ' on' : ''}" data-k="${k}">
      <span>${label[k]}</span>
      <button type="button" class="ss-arr" data-d="-1" aria-label="-"><svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>
      <b>${rowVal(k)}</b>
      <button type="button" class="ss-arr" data-d="1" aria-label="+"><svg viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>
    </div>`).join('');
  const n = seats.filter(s => s != null).length;
  document.querySelectorAll('.ss-seat').forEach((el) => {
    const i = +el.dataset.i, p = seats[i];
    el.classList.toggle('in', p != null);
    el.querySelector('.ss-name').textContent = p != null ? fmt(T.player, i + 1) : T.seat;
    el.querySelector('.ss-sub').textContent = p != null ? fmt(T.pad, p + 1) : T.seatSub;
  });
  $('ssGo').disabled = n === 0;
  $('ssHint').textContent = n ? T.hint : T.need;
}
$('ssRows').addEventListener('click', (e) => {
  const b = e.target.closest('.ss-arr'), row = e.target.closest('.ss-row');
  if (!row) return;
  sel = ROWS.indexOf(row.dataset.k);
  if (b) step(row.dataset.k, +b.dataset.d); else render();
});
$('ssGo').onclick = () => start();
$('ssBack').onclick = () => leavePage();
function leavePage() {
  const q = new URLSearchParams(location.search); q.delete('split');
  location.href = location.pathname + (q.toString() ? '?' + q : '');
}

// som: o navegador so libera audio depois de um gesto na pagina (controle nao conta)
const wakeAll = () => { for (const f of frames) try { f.contentWindow.__ssWake?.(); } catch { /* */ } $('ssSound').hidden = true; };
addEventListener('pointerdown', wakeAll); addEventListener('keydown', wakeAll);

// ---------- controles ----------
const prev = new Map(); // indice do controle -> botoes do quadro anterior
let navT = 0;
function pads() { return [...(navigator.getGamepads?.() || [])].filter(g => g && g.connected); }
function pollSetup(dt) {
  navT -= dt;
  const p1 = seats.find(s => s != null);
  for (const g of pads()) {
    const now = g.buttons.map(b => !!b?.pressed), was = prev.get(g.index) || [];
    const down = (i) => now[i] && !was[i];
    prev.set(g.index, now);
    const seat = seats.indexOf(g.index);
    if (seat < 0 && down(0)) { const free = seats.indexOf(null); if (free >= 0) { seats[free] = g.index; render(); } continue; }
    if (seat < 0) continue;
    if (down(1)) { seats[seat] = null; render(); continue; }
    if (g.index !== p1) continue;
    // so o jogador 1 mexe no selo
    if (down(9)) { start(); return; }
    const ly = g.axes[1] || 0, lx = g.axes[0] || 0;
    const up = down(12) || (ly < -0.6 && navT <= 0), dn = down(13) || (ly > 0.6 && navT <= 0);
    const lf = down(14) || (lx < -0.6 && navT <= 0), rt = down(15) || (lx > 0.6 && navT <= 0);
    if (up || dn || lf || rt) navT = 0.22;
    if (up) { sel = (sel + ROWS.length - 1) % ROWS.length; render(); }
    if (dn) { sel = (sel + 1) % ROWS.length; render(); }
    if (lf) step(ROWS[sel], -1);
    if (rt || down(0)) step(ROWS[sel], 1);
  }
}

// ---------- partida ----------
let core = null, frames = [], inbox = new Map(), joined = new Set(), want = 0, running = false;
window.__ssHost = {
  join(id, name, box) { inbox.set(id, box); joined.add(id); core?.join(id, name); },
  handle(id, raw) { let m; try { m = JSON.parse(raw); } catch { return; } core?.handle(id, m); },
  quit() { setTimeout(stop, 0); }, // sai do quadro do iframe antes de apagar ele
};

function start() {
  const list = seats.map((p, i) => (p != null ? { slot: i, pad: p } : null)).filter(Boolean);
  if (!list.length || running) return;
  running = true;
  const n = list.length;
  // bots do selo = quantos bots entram de fato (a Core desconta os humanos alem do primeiro)
  core = new Core({
    mode: cfg.mode, map: cfg.map, bots: cfg.bots + n - 1, difficulty: cfg.difficulty, lobby: false, coop: true,
    send: (to, m) => {
      const raw = JSON.stringify(m);
      if (to == null) { for (const b of inbox.values()) b.push(raw); } else inbox.get(to)?.push(raw);
    },
  });
  inbox = new Map(); joined = new Set(); want = n;
  $('ssSetup').hidden = true;
  const game = $('ssGame');
  game.hidden = false; game.className = 'ss-game n' + n + (n === 2 && cfg.two === 'v' ? ' side' : ''); game.innerHTML = '';
  const q = new URLSearchParams(location.search); q.delete('split');
  frames = list.map(({ slot, pad }) => {
    const f = document.createElement('iframe');
    q.set('ss', slot); q.set('pad', pad); q.set('n', n);
    f.src = location.pathname + '?' + q;
    f.className = 'p' + slot; f.title = fmt(T.player, slot + 1);
    f.setAttribute('allow', 'autoplay; gamepad; fullscreen');
    f.tabIndex = -1;
    game.appendChild(f);
    return f;
  });
  if (n === 3) { const fill = document.createElement('div'); fill.className = 'ss-fill'; fill.innerHTML = '<b>Rubber Riot</b>'; game.appendChild(fill); }
  $('ssSound').hidden = !!navigator.userActivation?.hasBeenActive;
  if (!$('ssSound').hidden) game.appendChild($('ssSound'));
}

function stop() {
  if (!running) return;
  running = false; core = null;
  for (const f of frames) f.remove();
  frames = []; inbox = new Map(); joined = new Set();
  $('ssGame').hidden = true; $('ssGame').innerHTML = '';
  $('ssSetup').append($('ssSound'));
  $('ssSetup').hidden = false;
  render();
}

// a Core so anda depois que todas as telas entraram (cada uma carrega o mapa no seu tempo)
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!running) { pollSetup(dt); return; }
  if (core && joined.size >= want) core.tick(dt);
}
render();
requestAnimationFrame(loop);
window.__ssDebug = { seats, start, stop, get core() { return core; }, render };
