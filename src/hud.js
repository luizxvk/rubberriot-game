// HUD em DOM: placa de placar, vida, municao, feed, marcadores, placar (Tab).
import * as THREE from 'three';
import { WEAPONS, MODES, GUN_LADDER } from '../shared/weapons.js';
import { STREAKS } from '../shared/weapons.js';
import { t, wName, modeName } from './i18n.js';

const $ = (id) => document.getElementById(id);
const TEAM = { red: 'h_red', blue: 'h_blue' };
const nextStreak = (n) => { for (const s of Object.values(STREAKS)) if (s.kills > n) return s.kills - n; return 0; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor() {
    this.el = { hp: $('hpNum'), hpBar: $('hpBar'), hpBox: document.querySelector('.hp'), mag: $('ammoMag'), res: $('ammoRes'), ammo: document.querySelector('.ammo'),
      wname: $('wName'), slots: $('wSlots'), plaque: $('scorePlaque'), feed: $('feed'), cross: $('cross'), hit: $('hitmark'),
      stamp: $('stamp'), msg: $('centerMsg'), board: $('board'), obj: $('objMarkers'), hurt: $('hurtDir'), tac: document.querySelector('#tacBar i'),
      reticle: $('reticle'), ring: $('scopeRing'), fps: $('fps') };
    this.msgT = 0;
    this.lastPlaque = '';
  }

  weapon(p) {
    const W = WEAPONS[p.wpn];
    this.el.wname.textContent = wName(p.wpn);
    const a = p.ammo[p.wpn];
    const mag = a ? a.mag : 0;
    this.el.mag.textContent = mag === Infinity ? '∞' : mag;
    this.el.res.textContent = '/ ' + (a && a.reserve !== Infinity ? a.reserve : '∞');
    this.el.ammo.classList.toggle('empty', mag === 0);
    this.el.slots.innerHTML = p.owned.map((w, i) => `<span class="${w === p.wpn ? 'on' : ''}">${i + 1}</span>`).join('');
  }

  hp(v) {
    this.el.hp.textContent = Math.max(0, Math.round(v));
    this.el.hpBar.style.width = Math.max(0, v) + '%';
    this.el.hpBox.classList.toggle('low', v <= 35);
  }

  frame(p, dt, settings) {
    // municao: redesenha sempre que muda (tiro, recarga, pickup, troca)
    const a = p.ammo[p.wpn];
    const key = p.wpn + ':' + (a ? a.mag + '/' + a.reserve : '') + ':' + p.owned.join(',');
    if (key !== this.ammoKey) { this.ammoKey = key; this.weapon(p); }
    // mira dinamica + luneta + ponto vermelho
    const W = WEAPONS[p.wpn];
    const moving = Math.hypot(p.vel[0], p.vel[2]);
    const gap = 6 + moving * 0.9 + (p.onGround ? 0 : 10) + (W.spread || 0) * 150 + (p.firing ? 4 : 0);
    this.el.cross.style.setProperty('--g', gap * (1 - p.adsK) + 'px');
    const g = p.g.vm.gun?.userData || {};
    const sprinting = p.sprint || p.tac;
    this.el.cross.style.opacity = sprinting || p.adsK > 0.5 || !p.alive ? 0 : 1;
    // reticula agora mora na lente 3D da mira (nada de overlay 2D)
    void g;
    this.el.tac.style.width = (p.tacFuel / 3.5 * 100) + '%';
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.el.msg.classList.remove('on'); }
    if (settings.showFps) {
      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { this.el.fps.hidden = false; this.el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' ' + t('qps'); this.fpsAcc = 0; this.fpsN = 0; }
    } else this.el.fps.hidden = true;
  }

  score(snap, me, players) {
    const mode = snap.mode, cfg = MODES[mode];
    const sec = Math.max(0, Math.ceil(snap.time));
    const clock = `<div><span class="lbl">${t('h_time')}</span><span class="val">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span></div>`;
    let html;
    if (cfg.teams) {
      let mid = `<div><span class="lbl">${modeName(mode)}</span><span class="val">${cfg.limit}</span></div>`;
      if (mode === 'dom') mid = `<div class="zones">${snap.zones.map(z => `<span class="zchip ${z.owner || ''}">${z.id}</span>`).join('')}</div>`;
      if (mode === 'ctf') mid = `<div><span class="lbl">${t('h_caps')}</span><span class="val">${cfg.limit}</span></div>`;
      html = `<div class="red"><span class="lbl">${t('h_red')}</span><span class="val">${snap.teamScore.red}</span></div>${mid}<div class="blue"><span class="lbl">${t('h_blue')}</span><span class="val">${snap.teamScore.blue}</span></div>${clock}`;
    } else {
      const sorted = [...players].sort((a, b) => mode === 'gungame' ? b.gunLvl - a.gunLvl || b.kills - a.kills : b.kills - a.kills);
      const lead = sorted[0];
      const mine = me ? (mode === 'gungame' ? `${me.gunLvl + 1}/${GUN_LADDER.length}` : me.kills) : 0;
      const leadV = lead ? (mode === 'gungame' ? `${lead.gunLvl + 1}/${GUN_LADDER.length}` : lead.kills) : 0;
      html = `<div><span class="lbl">${t('h_you')}</span><span class="val">${mine}</span></div><div><span class="lbl">${lead ? esc(lead.name) : t('h_leader')}</span><span class="val">${leadV}</span></div>${mode === 'gungame' && me ? `<div><span class="lbl">${t('h_weapon')}</span><span class="val" style="font-size:15px">${wName(GUN_LADDER[Math.min(me.gunLvl, GUN_LADDER.length - 1)].wpn)}</span></div>` : `<div><span class="lbl">${t('h_goal')}</span><span class="val">${cfg.limit}</span></div>`}${clock}`;
    }
    if (html !== this.lastPlaque) { this.el.plaque.innerHTML = html; this.lastPlaque = html; }
  }

  feed(html, mine) {
    const li = document.createElement('li');
    li.innerHTML = html;
    if (mine) li.className = 'me';
    this.el.feed.prepend(li);
    while (this.el.feed.children.length > 6) this.el.feed.lastChild.remove();
    setTimeout(() => li.remove(), 6000);
  }

  // banner de desbloqueio (fila: um por vez); foto da arma + o que abriu
  unlockBanner({ kind, name, img, more = 0 }) {
    const el = document.createElement('div');
    el.className = 'unl-banner';
    el.innerHTML = `${img ? `<img src="${img}" alt="">` : ''}<div><small>${kind}</small><b>${name}</b>${more ? `<em>+${more}</em>` : ''}</div>`;
    document.getElementById('hud').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2900);
    setTimeout(() => el.remove(), 3300);
  }

  // granada de fragmentacao perto (< 9 m): icone em cima dela; fora da tela, preso na borda apontando
  nadeWarn(G, camera) {
    const root = document.getElementById('hud');
    if (!this.nadeEls) this.nadeEls = [];
    const me = G.player, list = (G.snap?.nades || []).filter(n => n.kind === 'frag' && me?.alive && Math.hypot(n.pos[0] - me.pos[0], n.pos[1] - me.pos[1], n.pos[2] - me.pos[2]) < 9);
    while (this.nadeEls.length < list.length) {
      const el = document.createElement('div'); el.className = 'nade-warn'; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg><i></i>';
      root.appendChild(el); this.nadeEls.push(el);
    }
    const v = new THREE.Vector3(), W = innerWidth, H = innerHeight, m = 46;
    this.nadeEls.forEach((el, i) => {
      const n = list[i];
      el.hidden = !n;
      if (!n) return;
      v.fromArray(n.pos).project(camera);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      if (behind) { x = W - x; y = H - y; }
      const off = behind || x < m || x > W - m || y < m || y > H - m;
      if (off) {
        // borda: direcao do centro da tela ate a granada, presa num retangulo com margem
        const dx = x - W / 2, dy = y - H / 2, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m) / Math.abs(dy || 1e-3));
        x = W / 2 + dx * k; y = H / 2 + dy * k;
        el.style.setProperty('--a', Math.atan2(dy, dx) + 'rad');
      }
      el.classList.toggle('edge', off);
      el.style.transform = `translate(${x - 21}px, ${y - 21}px)`;
    });
  }

  unlockToast(text) {
    const el = document.createElement('div');
    el.className = 'unlock-toast'; el.textContent = text;
    document.getElementById('hud').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  xpPop(text) {
    const el = document.createElement('div');
    el.className = 'xp-pop'; el.textContent = text;
    el.style.marginTop = (this.popN = ((this.popN || 0) + 1) % 3) * 20 + 'px';
    document.getElementById('hud').appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  hitmark(head) {
    const h = this.el.hit;
    h.classList.remove('on', 'head'); void h.offsetWidth;
    h.classList.add('on'); if (head) h.classList.add('head');
  }

  stampText(text, sub) {
    const s = this.el.stamp;
    s.classList.remove('on'); void s.offsetWidth;
    s.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
    s.classList.add('on');
  }

  message(text, t = 2.4) { this.el.msg.textContent = text; this.el.msg.classList.add('on'); this.msgT = t; }

  hurtFrom(angle) {
    const h = this.el.hurt;
    h.style.transform = `rotate(${angle}rad)`;
    h.style.transition = 'none'; h.style.opacity = 1;
    requestAnimationFrame(() => { h.style.transition = 'opacity .8s'; h.style.opacity = 0; });
  }

  setMap(M) {
    this.M = M;
    // fundo do radar: planta do mapa desenhada uma vez
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), k = 128 / (M.arena + 2);
    g.fillStyle = 'rgba(236,233,225,.92)'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(20,18,16,.55)';
    for (const b of M.boxes) {
      if (b.max[1] - b.min[1] < 1 || b.kind === 'pipe') continue;
      g.fillRect(128 + b.min[0] * k, 128 + b.min[2] * k, (b.max[0] - b.min[0]) * k, (b.max[2] - b.min[2]) * k);
    }
    this.radarBg = c;
  }

  // radar: aliados sempre, inimigo quando atira (ou todos com o Radar Espiao)
  radar(G, camera) {
    let cv = this.radarCv;
    if (!cv) {
      cv = this.radarCv = document.createElement('canvas');
      cv.width = cv.height = 180; cv.className = 'radar'; cv.setAttribute('aria-hidden', 'true');
      document.getElementById('hud').appendChild(cv);
    }
    const p = G.player, M = this.M, snap = G.snap;
    if (!p || !M || !this.radarBg) return;
    const g = cv.getContext('2d'), R = 90, span = Math.min(M.arena, 46), k = R / span, wk = 128 / (M.arena + 2);
    const uav = (snap.uavs || []).some(u => u.owner === G.myId || (u.team && u.team === G.myTeam));
    const enemyUav = (snap.uavs || []).some(u => u.owner !== G.myId && !(u.team && u.team === G.myTeam));
    g.clearRect(0, 0, 180, 180);
    g.save();
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
    g.translate(R, R); g.rotate(p.yaw);
    const bs = 256 / wk * k;
    g.drawImage(this.radarBg, -p.pos[0] * k - bs / 2, -p.pos[2] * k - bs / 2, bs, bs);
    const dot = (x, z, col, r = 5) => { g.fillStyle = col; g.beginPath(); g.arc((x - p.pos[0]) * k, (z - p.pos[2]) * k, r, 0, Math.PI * 2); g.fill(); g.lineWidth = 2; g.strokeStyle = '#141210'; g.stroke(); };
    for (const o of snap.players) {
      if (o.id === G.myId || !o.alive) continue;
      if (!G.isEnemy(o)) { dot(o.pos[0], o.pos[2], o.team === 'red' ? '#a83a2c' : '#2f5b8a', 4.5); continue; }
      if (uav || (G.seen.get(o.id) || 0) > G.t) dot(o.pos[0], o.pos[2], '#e0301e', 5.5);
    }
    if (snap.mode === 'dom') for (const z of M.zones) { const s = snap.zones.find(q => q.id === z.id); dot(z.pos[0], z.pos[2], s?.owner === 'red' ? '#a83a2c' : s?.owner === 'blue' ? '#2f5b8a' : '#ece9e1', 6); }
    if (snap.mode === 'ctf') for (const tm of ['red', 'blue']) dot(snap.flags[tm].pos[0], snap.flags[tm].pos[2], tm === 'red' ? '#a83a2c' : '#2f5b8a', 6);
    g.restore();
    // voce no centro, olhando pra cima
    g.fillStyle = '#faf8f2'; g.strokeStyle = '#141210'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(R, R - 9); g.lineTo(R + 6.5, R + 7); g.lineTo(R, R + 3); g.lineTo(R - 6.5, R + 7); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 5; g.strokeStyle = enemyUav ? '#e0301e' : '#141210';
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
    if (uav) { g.fillStyle = '#141210'; g.font = '800 12px Grandstander'; g.textAlign = 'center'; g.fillText('UAV', R, 172); }
    // granadas e sequencias prontas
    const me = snap.players.find(o => o.id === G.myId);
    const ready = me?.ready || [];
    const key = (p.nades.frag || 0) + '/' + (p.nades.flash || 0) + '/' + ready.join(',') + '/' + (me?.streak || 0);
    if (key !== this.kitKey) {
      this.kitKey = key;
      let el = document.getElementById('kit');
      if (!el) { el = document.createElement('div'); el.id = 'kit'; el.className = 'kit'; document.getElementById('hud').appendChild(el); }
      el.innerHTML = `<span class="${p.nades.frag ? '' : 'off'}">G ${t('n_frag')}</span><span class="${p.nades.flash ? '' : 'off'}">F ${t('n_flash')}</span>` +
        (ready.length ? `<span class="ready">X ${t('s_' + ready[0])}${ready.length > 1 ? ' +' + (ready.length - 1) : ''}</span>` : `<span class="off">${t('streakNext', { n: nextStreak(me?.streak || 0) })}</span>`);
    }
  }

  objectives(snap, camera, me) {
    const mode = snap.mode;
    const pts = [];
    if (mode === 'ctf') {
      for (const team of ['red', 'blue']) {
        const f = snap.flags[team];
        const label = f.state === 'carried' ? (f.carrier === me?.id ? t('o_carry') : t('o_taken')) : f.state === 'dropped' ? t('o_drop') : '';
        pts.push({ p: [f.pos[0], f.pos[1] + 3.6, f.pos[2]], cls: team, txt: '⚑', sub: label });
        if (me && me.team && f.carrier === me.id && this.M) pts.push({ p: [this.M.flagBase[me.team][0], 3, this.M.flagBase[me.team][2]], cls: me.team, txt: '⌂', sub: t('o_base') });
      }
    } else if (mode === 'dom') {
      for (const z of snap.zones) {
        const def = (this.M?.zones.find(q => q.id === z.id) || { pos: [0, 0, 0] }).pos;
        pts.push({ p: [def[0], def[1] + 3, def[2]], cls: z.owner || '', txt: z.id });
      }
    }
    const v = new THREE.Vector3();
    let html = '';
    for (const o of pts) {
      v.fromArray(o.p).project(camera);
      if (v.z > 1) continue;
      const x = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * innerWidth, 24, innerWidth - 24);
      const y = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * innerHeight, 70, innerHeight - 24);
      const d = me ? Math.round(Math.hypot(o.p[0] - me.pos[0], o.p[2] - me.pos[2])) : 0;
      html += `<div style="left:${x}px;top:${y}px"><span class="pin ${o.cls}">${o.txt}</span><span class="dist">${o.sub ? esc(o.sub) + ' · ' : ''}${d} m</span></div>`;
    }
    this.el.obj.innerHTML = html;
  }

  board(show, snap, players, meId) {
    const b = this.el.board;
    b.hidden = !show;
    if (!show || !snap) return;
    const cfg = MODES[snap.mode];
    const rows = (list) => list.map(p => `<tr class="${p.id === meId ? 'me' : ''}"><td>${p.team ? `<span class="tteam" style="background:var(--${p.team})"></span>` : ''}${esc(p.name)}${p.bot ? ` <small>(${t('bot')})</small>` : ''}</td>${snap.mode === 'gungame' ? `<td class="n">${p.gunLvl + 1}</td>` : ''}<td class="n">${p.kills}</td><td class="n">${p.assists || 0}</td><td class="n">${p.deaths}</td><td class="n">${p.score}</td></tr>`).join('');
    const head = `<tr><th>${t('b_player')}</th>${snap.mode === 'gungame' ? `<th class="n">${t('b_step')}</th>` : ''}<th class="n">${t('b_kills')}</th><th class="n">${t('b_assists')}</th><th class="n">${t('b_deaths')}</th><th class="n">${t('b_score')}</th></tr>`;
    const sort = (l) => [...l].sort((a, b) => b.score - a.score || b.kills - a.kills);
    let html = `<h3>${modeName(snap.mode)}</h3>`;
    if (cfg.teams) {
      for (const tm of ['red', 'blue']) html += `<table><caption style="text-align:left;font-family:var(--display);padding:6px 0 2px;color:var(--${tm})">${t(TEAM[tm])} · ${snap.teamScore[tm]}</caption>${head}${rows(sort(players.filter(p => p.team === tm)))}</table>`;
    } else html += `<table>${head}${rows(sort(players))}</table>`;
    b.innerHTML = html;
  }
}
