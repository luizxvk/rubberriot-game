// Lobby antes da partida (o mapa gira atras) e a tela de carregamento com dicas.
import { t, modeName, eliteTag } from './i18n.js';
import { audio } from './audio.js';
import * as rovex from './rovex.js';
import { TEAM_MAX } from '../shared/weapons.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TIPS = 12;

export class Lobby {
  constructor({ onReady, onLeave, onStart, onTeam }) {
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
    this.sideOpen = true; // bomba: o popup do lado abre toda vez que o lobby aparece
    $('lbLeader').hidden = true;
    $('lobby').hidden = false;
  }
  hide() { this.closeFriends(); $('lbSide').hidden = true; $('lobby').hidden = true; }
  get open() { return !$('lobby').hidden; }

  setReady(v) {
    this.ready = v;
    const b = $('lbReady');
    b.setAttribute('aria-pressed', String(v));
    b.textContent = this.isHost ? t('lbStart') : t(v ? 'lbUnready' : 'lbReady');
    if (v) audio.play('ui_click', { ui: true });
  }

  // plantar a bomba: popup com os dois lados e quanta gente tem em cada; lado cheio some
  renderSide(m, myId) {
    const bomb = m.mode === 'bomb' && m.phase === 'lobby';
    $('lbSwap').hidden = !bomb;
    const on = bomb && this.sideOpen;
    $('lbSide').hidden = !on;
    if (!on) return;
    const n = { red: 0, blue: 0 };
    for (const p of m.players) if (!p.bot && p.id !== myId && p.team in n) n[p.team]++;
    for (const b of $('lbSide').querySelectorAll('[data-side]')) {
      const k = b.dataset.side;
      b.hidden = n[k] >= TEAM_MAX;
      b.querySelector('.n').textContent = t('sideCount', { n: n[k], max: TEAM_MAX });
    }
  }

  render(m, myId) {
    this.lastMsg = m; this.myId = myId;
    this.renderSide(m, myId);
    $('lbMap').textContent = t('map_' + m.map);
    $('lbMode').textContent = modeName(m.duo ? 'duo' : m.mode);
    const host = m.host === myId;
    this.counting = m.phase === 'count';
    if (host !== this.isHost) { this.isHost = host; this.setReady(this.ready); }
    $('lbReady').disabled = host && this.counting;
    const list = [...m.players].sort((a, b) => (a.team || '').localeCompare(b.team || '') || (a.bot - b.bot));
    $('lbPlayers').innerHTML = list.map(p => {
      const me = p.id === myId;
      const tag = [me ? t('lbYou') : p.bot ? t('lbBot') : '', p.id === m.host ? t('lbHost') : ''].filter(Boolean).join(' · ');
      return `<li class="${p.team || ''} ${p.ready ? 'ok' : ''} ${me ? 'me' : ''}" data-id="${esc(p.id)}"><span class="nm">${esc(p.name)}${p.elite ? eliteTag() : ''}${tag ? `<small>${tag}</small>` : ''}</span><span class="dots"></span><span class="lv">${t('lvlShort', { n: p.lvl })}</span><span class="stamp">${t('lbReadyStamp')}</span></li>`;
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
      $('lbStatus').textContent = host ? t('lbHostHint') : t('lbWaitHost', { n: waiting });
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
