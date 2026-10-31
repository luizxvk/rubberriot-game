// Lobby antes da partida (o mapa gira atras) e a tela de carregamento com dicas.
import { t, modeName, modeDesc, eliteTag } from './i18n.js';
import { badgeSvg } from './rank.js';
import { audio } from './audio.js';
import * as rovex from './rovex.js';
import { TEAM_MAX, MODES } from '../shared/weapons.js';
import { LIMIT_MODES, TIME_MODES, MAP_IDS } from '../shared/core.js';
import { currentEvent } from '../shared/events.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TIPS = 12;

export class Lobby {
  constructor({ onReady, onLeave, onStart, onTeam, onCfg }) {
    this.onCfg = onCfg; this.cfgPrev = null;
    $('lbModesClose').onclick = () => this.closeModes();
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('lbModes').hidden) this.closeModes(); });
    $('lbVer').textContent = 'Rubber Riot v' + (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'); // versao: so aqui no lobby
    this.ready = false;
    this.isHost = false;
    this.lastCount = -1;
    this.okIds = new Set();
    // host solta a contagem; os outros so marcam pronto
    $('lbReady').onclick = () => {
      if (this.isHost) { if (!this.counting) { audio.play('ui_click', { ui: true }); onStart(); } return; }
      this.setReady(!this.ready); onReady(this.ready);
    };
    $('lbLeave').onclick = () => { this.closeFriends(); onLeave(); };
    $('lbCopy').onclick = async () => {
      try { await navigator.clipboard.writeText($('lbRoomCode').textContent); } catch { /* sem clipboard */ }
      audio.play('ui_click', { ui: true });
      $('lbStatus').textContent = t('copied');
    };
    $('lbInvite').onclick = () => (this.friendsOpen ? this.closeFriends() : this.openFriends());
    $('lbFriendsClose').onclick = () => this.closeFriends();
    // bomba: tocar num lado manda pro servidor e fecha; "Trocar lado" abre de novo
    for (const b of $('lbSide').querySelectorAll('[data-side]')) b.onclick = () => {
      audio.play('ui_click', { ui: true });
      this.sideOpen = false; $('lbSide').hidden = true;
      onTeam(b.dataset.side);
    };
    $('lbSwap').onclick = () => { this.closeFriends(); this.sideOpen = true; audio.play('ui_click', { ui: true }); if (this.lastMsg) this.renderSide(this.lastMsg, this.myId); };
  }

  // sala com codigo (multiplayer): mostra o codigo e libera o convite
  setRoom(code, canInvite) {
    $('lbRoom').hidden = !code;
    $('lbRoomCode').textContent = code || '';
    $('lbInvite').hidden = !(code && canInvite);
  }

  // amigos da conta Rovex; o convite vira notificacao na Rovex com o link da sala
  async openFriends() {
    this.friendsOpen = true;
    const ul = $('lbFriendList');
    $('lbFriends').hidden = false;
    $('lbInvite').setAttribute('aria-expanded', 'true');
    ul.innerHTML = `<li class="lf-msg">${t('inviteLoading')}</li>`;
    let list;
    try { list = await rovex.friends(); } catch { ul.innerHTML = `<li class="lf-msg">${t('inviteErr')}</li>`; return; }
    if (!list.length) { ul.innerHTML = `<li class="lf-msg">${t('inviteNone')}</li>`; return; }
    list.sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    ul.innerHTML = list.map(f => `<li><span class="lf-av">${f.avatar ? `<img alt="" src="${esc(f.avatar)}">` : esc(f.name.slice(0, 1))}</span><span class="lf-nm">${esc(f.name)}${f.online ? `<small>${t('online')}</small>` : ''}</span><button data-f="${esc(f.id)}">${t('inviteBtn')}</button></li>`).join('');
    ul.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await rovex.invite(b.dataset.f, $('lbRoomCode').textContent); b.textContent = t('inviteSent'); b.classList.add('sent'); audio.play('ui_click', { ui: true }); }
      catch { b.disabled = false; audio.play('empty', { ui: true }); }
    });
  }
  closeFriends() {
    this.friendsOpen = false;
    $('lbFriends').hidden = true;
    $('lbInvite').setAttribute('aria-expanded', 'false');
  }

  show() {
    this.isHost = false; this.counting = false;
    this.setReady(false);
    this.lastCount = -1;
    this.okIds.clear();
    this.cfgPrev = null; this.cfgSig = null; this.hostSeen = null; this.hostNote = null;
    this.sideOpen = true; // bomba: o popup do lado abre toda vez que o lobby aparece
    $('lbLeader').hidden = true;
    $('lobby').hidden = false;
  }
  hide() { this.closeFriends(); this.closeModes(); $('lbSide').hidden = true; $('lobby').hidden = true; }
  get open() { return !$('lobby').hidden; }

  setReady(v) {
    this.ready = v;
    const b = $('lbReady');
    b.setAttribute('aria-pressed', String(v));
    b.textContent = this.isHost ? (this.waitN ? t('lbWaitReady', { n: this.waitN }) : t('lbStart')) : t(v ? 'lbUnready' : 'lbReady');
    if (v) audio.play('ui_click', { ui: true });
  }

  // plantar a bomba: popup com os dois lados e quanta gente tem em cada; lado cheio some
  renderSide(m, myId) {
    // todo modo de time deixa trocar de lado (infectado sorteia; dupla e BR montam as duplas)
    const pick = m.phase === 'lobby' && MODES[m.mode]?.teams && m.mode !== 'infect' && m.mode !== 'br' && !m.duo;
    const bomb = m.mode === 'bomb';
    $('lbSwap').hidden = !pick;
    $('lbSwap').querySelector('span').textContent = t(bomb ? 'sideSwap' : 'teamSwap');
    const on = pick && this.sideOpen;
    $('lbSide').hidden = !on;
    if (!on) return;
    $('lbSideTitle').textContent = t(bomb ? 'sideTitle' : 'teamTitle');
    $('lbSide').querySelector('.lb-side-note').hidden = !bomb; // troca de lado no intervalo e so da bomba
    const side = $('lbSide');
    side.querySelector('[data-side="red"] b').textContent = t(bomb ? 'sideAtk' : 'h_red');
    side.querySelector('[data-side="red"] small').textContent = t(bomb ? 'sideAtkTip' : 'teamRedTip');
    side.querySelector('[data-side="blue"] b').textContent = t(bomb ? 'sideDef' : 'h_blue');
    side.querySelector('[data-side="blue"] small').textContent = t(bomb ? 'sideDefTip' : 'teamBlueTip');
    for (const b of side.querySelectorAll('[data-side]')) b.setAttribute('aria-pressed', String(m.players.find(p => p.id === myId)?.team === b.dataset.side));
    const n = { red: 0, blue: 0 };
    for (const p of m.players) if (!p.bot && p.id !== myId && p.team in n) n[p.team]++;
    for (const b of $('lbSide').querySelectorAll('[data-side]')) {
      const k = b.dataset.side;
      b.hidden = n[k] >= TEAM_MAX;
      b.querySelector('.n').textContent = t('sideCount', { n: n[k], max: TEAM_MAX });
    }
  }

  // popup de modos (so o host): tocar num cartao troca o modo da sala
  openModes(c) {
    const g = $('lbModesGrid');
    g.innerHTML = Object.keys(MODES).map(k => `<button role="radio" aria-checked="${k === c.mode}" data-m="${k}"><b>${esc(modeName(k))}</b><em>${t(MODES[k].teams ? 'teams' : 'solo')}</em><small>${esc(modeDesc(k))}</small></button>`).join('');
    for (const b of g.querySelectorAll('[data-m]')) b.onclick = () => {
      const v = b.dataset.m; this.closeModes();
      if (v === c.mode) return;
      audio.play('ui_click', { ui: true });
      this.onCfg?.({ mode: v, map: v === 'br' || v === 'duo' ? 'auto' : c.map, bots: c.bots, difficulty: c.difficulty, limit: 0, time: 0 }); // meta e tempo de outro modo nao servem
    };
    $('lbModes').hidden = false;
    audio.play('ui_click', { ui: true, vol: 0.6 });
    g.querySelector('[aria-checked="true"]')?.focus();
  }
  closeModes() { $('lbModes').hidden = true; }

  // painel da partida (estilo lista de opcoes com setas): host muda, a sala toda ve na hora
  renderCfg(m, host) {
    const c = m.cfg, el = $('lbCfg');
    el.hidden = !c || m.phase !== 'lobby';
    if (el.hidden) return;
    const raw = c.mode === 'duo' ? 'br' : c.mode, br = raw === 'br';
    const mins = (s) => t('cfgMin', { n: Math.round(s / 60) });
    const limits = [0, ...[0.5, 0.75, 1.5, 2, 3].map(k => Math.max(1, Math.round(c.defLimit * k / (c.defLimit >= 20 ? 5 : 1)) * (c.defLimit >= 20 ? 5 : 1)))].filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => x - y);
    const rows = [
      ['mode', Object.keys(MODES), c.mode, (v) => modeName(v)],
      ['map', br ? ['ilha'] : raw === 'escort' ? ['bonde'] : ['auto', ...MAP_IDS.filter(x => x !== 'ilha' && x !== 'bonde')], br ? 'ilha' : raw === 'escort' ? 'bonde' : c.map, (v) => v === 'auto' ? `${esc(t('map_' + m.map))} <small>${esc(t('cfgAutoTag'))}</small>` : esc(t('map_' + v)), true],
      ['players', Array.from({ length: 15 }, (_, i) => i + 2), c.bots + 1, (v) => String(v)],
      ...(LIMIT_MODES.includes(raw) ? [['limit', limits, c.limit || 0, (v) => v ? String(v) : t('cfgDef', { n: c.defLimit })]] : []),
      ...(TIME_MODES.includes(raw) ? [['time', [0, 300, 600, 900, 1200, 1800], c.time || 0, (v) => v ? mins(v) : t('cfgDef', { n: mins(c.defTime) })]] : []),
      ['difficulty', [0.7, 1, 1.35], c.difficulty, (v) => t(v < 0.9 ? 'easy' : v > 1.2 ? 'hard' : 'mid')],
      // evento de fim de semana: o host liga/desliga (so aparece quando tem evento no ar ou a sala ja esta nele)
      ...(currentEvent() || c.mut ? [['mut', ['', currentEvent() || c.mut], c.mut || '', (v) => v ? t('ev_' + v) : t('evOff')]] : []),
    ];
    // so redesenha quando muda alguma coisa (o lobby chega 4x/s; redesenhar sempre cortava o carimbo)
    const sig = JSON.stringify(c) + host + m.map;
    if (sig === this.cfgSig) return;
    this.cfgSig = sig;
    const prev = this.cfgPrev; this.cfgPrev = { ...c };
    // virou Plantar a Bomba: o popup de escolher o lado abre pra todo mundo da sala
    if (prev && prev.mode !== c.mode && c.mode === 'bomb') { this.sideOpen = true; queueMicrotask(() => this.lastMsg && this.renderSide(this.lastMsg, this.myId)); }
    if (!host) this.closeModes();
    $('lbCfgWho').textContent = host ? t('cfgYouHost') : t('cfgHostOnly');
    el.classList.toggle('host', host);
    $('lbCfgList').innerHTML = rows.map(([k, list, cur, fmt, html]) => {
      const i = Math.max(0, list.indexOf(cur)), lock = !host || list.length < 2;
      const chg = prev && !host && (k === 'players' ? prev.bots !== c.bots : prev[k] !== c[k]);
      const val = html ? fmt(list[i]) : esc(fmt(list[i]));
      // modo: o valor e um botao que abre o popup com todos (sem setas)
      if (k === 'mode' && host) return `<li class="${chg ? 'chg' : ''} wide" data-k="mode"><span class="k">${t('cfg_mode')}</span><button class="v pick" id="lbModeBtn" aria-haspopup="dialog">${val}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z"/></svg></button></li>`;
      // travado (sem setas): o valor ocupa a linha toda (antes caia na coluna da seta e quebrava letra por letra)
      if (lock) return `<li class="${chg ? 'chg' : ''} wide" data-k="${k}"><span class="k">${t('cfg_' + k)}</span><b class="v" aria-live="polite">${val}</b></li>`;
      return `<li class="${chg ? 'chg' : ''}" data-k="${k}"><span class="k">${t('cfg_' + k)}</span>`
        + `<button class="ar" data-d="-1" aria-label="${t('cfgPrev')} ${t('cfg_' + k)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg></button>`
        + `<b class="v" aria-live="polite">${val}</b>`
        + `<button class="ar" data-d="1" aria-label="${t('cfgNext')} ${t('cfg_' + k)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z"/></svg></button></li>`;
    }).join('');
    if (!host) return;
    $('lbModeBtn').onclick = () => this.openModes(c);
    for (const b of $('lbCfgList').querySelectorAll('.ar')) b.onclick = () => {
      const k = b.closest('li').dataset.k, row = rows.find(r => r[0] === k), list = row[1];
      const v = list[(Math.max(0, list.indexOf(row[2])) + Number(b.dataset.d) + list.length) % list.length];
      const next = { mode: c.mode, map: c.map, bots: c.bots, difficulty: c.difficulty, limit: c.limit || 0, time: c.time || 0, mut: c.mut || '' };
      if (k === 'players') next.bots = v - 1; else next[k] = v;
      if (k === 'mode') { next.limit = 0; next.time = 0; if (v === 'br' || v === 'duo') next.map = 'auto'; } // meta e tempo de outro modo nao servem
      audio.play('ui_click', { ui: true, vol: 0.6 });
      this.onCfg?.(next);
    };
  }

  render(m, myId) {
    this.lastMsg = m; this.myId = myId;
    // host saiu: o cargo foi pro proximo
    if (this.hostSeen && m.host && m.host !== this.hostSeen) { const h = m.players.find(p => p.id === m.host); if (h) this.hostNote = t(m.host === myId ? 'newHostYou' : 'newHost', { n: h.name }); }
    this.hostSeen = m.host;
    this.renderSide(m, myId);
    this.renderCfg(m, m.host === myId);
    $('lbMap').textContent = t('map_' + m.map);
    $('lbMode').textContent = modeName(m.duo ? 'duo' : m.bounce ? 'bounce' : m.mode);
    // evento de fim de semana ligado na sala: etiqueta propria ao lado do modo (toda a sala ve)
    const mut = m.cfg?.mut; $('lbEv').hidden = !mut; if (mut) $('lbEv').textContent = t('ev_' + mut);
    const host = m.host === myId;
    this.counting = m.phase === 'count';
    if (host !== this.isHost) { this.isHost = host; this.setReady(this.ready); }
    // host so inicia com todo humano pronto (regra dele 30/10): o botao conta quem falta
    const waitN = m.players.filter(p => !p.bot && !p.ready && p.id !== m.host).length;
    if (waitN !== this.waitN) { this.waitN = waitN; this.setReady(this.ready); }
    $('lbReady').disabled = host && (this.counting || waitN > 0);
    const list = [...m.players].sort((a, b) => (a.team || '').localeCompare(b.team || '') || (a.bot - b.bot));
    $('lbPlayers').innerHTML = list.map(p => {
      const me = p.id === myId;
      const tag = [me ? t('lbYou') : p.bot ? t('lbBot') : '', p.id === m.host ? t('lbHost') : ''].filter(Boolean).join(' · ');
      return `<li class="${p.team || ''} ${p.ready ? 'ok' : ''} ${me ? 'me' : ''}" data-id="${esc(p.id)}"><span class="nm">${p.rk >= 0 ? badgeSvg(p.rk, 16) : ''}${esc(p.name)}${p.elite ? eliteTag() : ''}${tag ? `<small>${tag}</small>` : ''}</span><span class="dots"></span><span class="lv">${t('lvlShort', { n: p.lvl })}</span><span class="stamp">${t('lbReadyStamp')}</span></li>`;
    }).join('');
    // carimbo so anima em quem acabou de ficar pronto
    const now = new Set(list.filter(p => p.ready).map(p => p.id));
    for (const li of $('lbPlayers').children) if (this.okIds.has(li.dataset.id)) li.querySelector('.stamp').style.animation = 'none';
    for (const id of now) if (!this.okIds.has(id) && this.okIds.size) audio.play('ui_hover', { ui: true, vol: 0.4 });
    this.okIds = now;

    const waiting = list.filter(p => !p.bot && !p.ready).length;
    const counting = m.phase === 'count';
    $('lbLeader').hidden = !counting;
    if (counting) {
      const n = Math.ceil(m.countT);
      $('lbCount').textContent = n;
      $('lbStatus').textContent = t('lbGo', { n });
      if (n !== this.lastCount) { this.lastCount = n; audio.play('ui_click', { ui: true, vol: 0.7, rate: 0.8 + (5 - n) * 0.06, jitter: 0 }); }
      this.countEnd = performance.now() + m.countT * 1000;
    } else {
      this.lastCount = -1;
      $('lbStatus').textContent = this.hostNote || (host ? t(waiting ? 'lbHostWait' : 'lbHostHint', { n: waiting }) : t(this.ready ? (waiting ? 'lbWaitOthers' : 'lbWaitHost') : 'lbTapReady', { n: waiting }));
    }
  }

  // setor da contagem de pelicula: varre uma volta por segundo
  frame() {
    if ($('lbLeader').hidden) return;
    const left = Math.max(0, (this.countEnd - performance.now()) / 1000);
    const f = 1 - (left % 1);
    const a = f * Math.PI * 2, r = 92;
    const x = 100 + Math.sin(a) * r, y = 100 - Math.cos(a) * r;
    $('lbSweep').setAttribute('d', f <= 0.001 ? '' : `M100 100 L100 ${100 - r} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)} Z`);
  }
}

// intertitulo de cinema mudo: mapa, modo, dica e a tira de filme enchendo (minimo ~1,6 s)
export function runLoading({ map, mode, join = false, min = 1600 }) {
  $('ldMap').textContent = t('map_' + map);
  $('ldMode').textContent = join ? t('lbJoin') : modeName(mode);
  $('ldTip').textContent = t('tip' + (1 + Math.floor(Math.random() * TIPS)));
  const bar = $('ldBar');
  bar.style.width = '0%';
  $('loading').hidden = false;
  const t0 = performance.now();
  return new Promise(res => {
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / min);
      // enche rapido no comeco e assenta no fim, como carga de verdade
      bar.style.width = (100 * (1 - (1 - k) ** 2.2)).toFixed(1) + '%';
      if (k < 1) requestAnimationFrame(step); else setTimeout(res, 120);
    };
    step();
  });
}
export function hideLoading() { $('loading').hidden = true; }
