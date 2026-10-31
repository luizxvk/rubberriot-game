// HUD em DOM: placa de placar, vida, municao, feed, marcadores, placar (Tab).
import * as THREE from 'three';
import { WEAPONS, MODES, GUN_LADDER } from '../shared/weapons.js';
import { STREAKS, BR } from '../shared/weapons.js';
import { t, wName, modeName, eliteTag } from './i18n.js';
import { badgeSvg } from './rank.js';
import { partName } from './arsenal.js';
import { isTouch } from './input.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);
const TEAM = { red: 'h_red', blue: 'h_blue' };
// pavio curto: as sequencias a partir da bigorna custam 1 abate a menos (igual ao servidor)
const nextStreak = (n, pavio) => { for (const s of Object.values(STREAKS)) { const k = s.kills - (pavio && s.kills > 3 ? 1 : 0); if (k > n) return k - n; } return 0; };
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
    // nome do MODELO na mao (antes era o da categoria: todo fuzil aparecia como Trovao); variante = nome dela
    const lo = p.lo?.(p.wpn), bp = p.brBp?.[p.wpn];
    this.el.wname.textContent = bp ? t(bp) : lo?.body ? partName('body', lo.body) : wName(p.wpn);
    const a = p.ammo[p.wpn];
    const mag = a ? a.mag : 0;
    this.el.mag.textContent = mag === Infinity ? '∞' : mag;
    this.el.res.textContent = '/ ' + (a && a.reserve !== Infinity ? a.reserve : '∞');
    this.el.ammo.classList.toggle('empty', mag === 0);
    this.el.slots.innerHTML = p.owned.map((w, i) => `<span class="${w === p.wpn ? 'on' : ''}">${i + 1}</span>`).join('');
  }

  // colete do battle royale (some fora do modo)
  armor(v, on) {
    const box = $('armorBox');
    box.hidden = !on;
    if (on) $('armorBar').style.width = Math.max(0, Math.min(100, v)) + '%';
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
    this.ammoAlert(p, a);
    this.el.tac.style.width = (p.tacFuel / 3.5 * 100) + '%';
    if (this.msgT > 0) { this.msgT -= dt; if (this.msgT <= 0) this.el.msg.classList.remove('on'); }
    if (settings.showFps) {
      this.fpsAcc = (this.fpsAcc || 0) + dt; this.fpsN = (this.fpsN || 0) + 1;
      if (this.fpsAcc > 0.5) { this.el.fps.hidden = false; this.el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' ' + t('qps'); this.fpsAcc = 0; this.fpsN = 0; }
    } else this.el.fps.hidden = true;
  }

  // aviso de municao embaixo da mira: baixa, vazia (recarregue) e acabou de vez (troque de arma)
  ammoAlert(p, a) {
    const el = this.el.ammoAlert || (this.el.ammoAlert = $('ammoAlert'));
    const W = WEAPONS[p.wpn];
    let txt = '', cls = '';
    if (p.alive && a && a.mag !== Infinity && !W.melee && p.reloadT <= 0) {
      const mag = p.stats().mag;
      const key = p.g.pad?.active ? 'X' : isTouch ? '' : 'R';
      if (a.mag === 0 && a.reserve <= 0) { txt = t('ammoOut'); cls = 'out'; }
      else if (a.mag === 0) { txt = key ? t('ammoReloadKey', { k: key }) : t('ammoReload'); cls = 'empty'; }
      else if (a.mag <= Math.max(2, Math.ceil(mag * 0.25))) { txt = t('ammoLow'); cls = 'low'; }
    } else if (p.alive && p.reloadT > 0) { txt = t('ammoReloading'); cls = 'busy'; }
    if (el.textContent !== txt) el.textContent = txt;
    el.className = 'ammo-alert ' + cls;
    el.hidden = !txt;
  }

  score(snap, me, players) {
    const mode = snap.mode, cfg = MODES[mode];
    const sec = Math.max(0, Math.ceil(snap.time));
    const clock = `<div><span class="lbl">${t('h_time')}</span><span class="val">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</span></div>`;
    let html;
    if (mode === 'br' && snap.br) {
      // battle royale: quantos restam + a iris (esperando = quanto falta pra fechar; fechando = aviso)
      const Z = snap.br, zs = Z.t;
      const iris = Z.state === 'closed' ? `<div class="fuse"><span class="lbl">${t('br_iris')}</span><span class="val">${t('br_closed')}</span></div>`
        : `<div class="${Z.state === 'shrink' ? 'fuse' : ''}"><span class="lbl">${Z.state === 'shrink' ? t('br_closing') : t('br_closeIn')}</span><span class="val">${Math.floor(zs / 60)}:${String(zs % 60).padStart(2, '0')}</span></div>`;
      html = `<div><span class="lbl">${t('br_left')}</span><span class="val">${Z.left}</span></div>${iris}<div><span class="lbl">${t('h_you')}</span><span class="val">${me ? me.kills : 0}</span></div>`;
    } else if (mode === 'bomb') {
      // rodadas de cada lado + relogio da rodada (ou o pavio da bomba plantada)
      const B = snap.bomb, planted = B?.state === 'planted';
      const mid = `<div class="${planted ? 'fuse' : ''}"><span class="lbl">${planted ? t('bombLbl') : t('roundN', { n: snap.round?.n || 1 })}</span><span class="val">${planted ? Math.ceil(snap.time) + 's' : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`}</span></div>`;
      // quem ainda esta vivo na rodada: bolinha cheia vivo, X morto (o placar do topo e o Tab)
      const pips = (tm) => `<span class="pips">${(players || []).filter(p => p.team === tm).sort((a, b) => String(a.id).localeCompare(String(b.id))).map(p => `<i class="${p.alive ? 'on' : 'off'}${p.id === me?.id ? ' me' : ''}"></i>`).join('')}</span>`;
      html = `<div class="red"><span class="lbl">${t('bomb_atk')}</span><span class="val">${snap.teamScore.red}</span>${pips('red')}</div>${mid}<div class="blue"><span class="lbl">${t('bomb_def')}</span><span class="val">${snap.teamScore.blue}</span>${pips('blue')}</div>`;
    } else if (mode === 'infect') {
      // infectado: quantos de cada lado + o relogio (ou quanto falta pra sair o primeiro infectado)
      const mid = snap.infT > 0 ? `<div><span class="lbl">${t('inf_in')}</span><span class="val">${Math.ceil(snap.infT)}</span></div>` : '';
      html = `<div class="red"><span class="lbl">${t('inf_h_inf')}</span><span class="val">${snap.teamScore.red}</span></div>${mid}<div class="blue"><span class="lbl">${t('inf_h_surv')}</span><span class="val">${snap.teamScore.blue}</span></div>${clock}`;
    } else if (cfg.teams) {
      let mid = `<div><span class="lbl">${modeName(snap.duo ? 'duo' : snap.bounce ? 'bounce' : mode)}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`;
      if (mode === 'dom') mid = `<div class="zones">${snap.zones.map(z => `<span class="zchip ${z.owner || ''}">${z.id}</span>`).join('')}</div>`;
      if (mode === 'ctf') mid = `<div><span class="lbl">${t('h_caps')}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`;
      html = `<div class="red"><span class="lbl">${t('h_red')}</span><span class="val">${snap.teamScore.red}</span></div>${mid}<div class="blue"><span class="lbl">${t('h_blue')}</span><span class="val">${snap.teamScore.blue}</span></div>${clock}`;
    } else {
      const sorted = [...players].sort((a, b) => mode === 'gungame' ? b.gunLvl - a.gunLvl || b.kills - a.kills : b.kills - a.kills);
      const lead = sorted[0];
      const LAD = this.g?.ladder || GUN_LADDER;
      const mine = me ? (mode === 'gungame' ? `${me.gunLvl + 1}/${LAD.length}` : me.kills) : 0;
      const leadV = lead ? (mode === 'gungame' ? `${lead.gunLvl + 1}/${LAD.length}` : lead.kills) : 0;
      html = `<div><span class="lbl">${t('h_you')}</span><span class="val">${mine}</span></div><div><span class="lbl">${lead ? esc(lead.name) : t('h_leader')}</span><span class="val">${leadV}</span></div>${mode === 'gungame' && me ? `<div><span class="lbl">${t('h_weapon')}</span><span class="val" style="font-size:15px">${wName(LAD[Math.min(me.gunLvl, LAD.length - 1)].wpn)}</span></div>` : `<div><span class="lbl">${t('h_goal')}</span><span class="val">${snap.limit ?? cfg.limit}</span></div>`}${clock}`;
    }
    if (html !== this.lastPlaque) { this.el.plaque.innerHTML = html; this.lastPlaque = html; }
  }

  // contagem de inicio: "esperando todo mundo carregar" e depois 3, 2, 1, Ja! (le o congelamento
  // que vem no snapshot: vale igual no solo e no multiplayer)
  countIn(snap) {
    const el = this.cin || (this.cin = { box: $('countIn'), num: $('countNum'), sub: $('countSub') });
    const now = performance.now(), f = snap?.freeze || 0;
    if (this.lastFreeze > 0 && f <= 0 && !snap?.loading) this.goUntil = now + 800;
    this.lastFreeze = f;
    let num = '', sub = '', go = false;
    if (snap?.loading) sub = t('countWait');
    else if (f > 0.05 && f < 4) { num = String(Math.max(1, Math.min(3, Math.ceil(f - 0.5)))); sub = t('countReady'); }
    else if (now < (this.goUntil || 0)) { num = t('countGo'); go = true; }
    el.box.hidden = !num && !sub;
    // Bate-Volta: tela escura durante a contagem (ninguem fica vendo os outros parados no ar)
    const dark = !!this.g?.bounce && (f > 0 || !!snap?.loading) && !!this.g?.player?.air;
    if (dark !== !!this.bDark) { this.bDark = dark; document.body.classList.toggle('bounce-dark', dark); }
    if (el.num.textContent !== num) {
      el.num.textContent = num;
      el.num.classList.toggle('go', go);
      el.num.classList.remove('tick'); void el.num.offsetWidth; if (num) el.num.classList.add('tick');
      // 3, 2, 1 = tique de relogio subindo o tom; Ja! = apito
      if (go) audio.play('go', { ui: true, vol: 0.55, jitter: 0, key: 'count', max: 1 });
      else if (num) audio.play('tick', { ui: true, vol: 0.45, rate: 0.9 + (3 - Number(num)) * 0.08, jitter: 0, key: 'count', max: 1 });
    }
    if (el.sub.textContent !== sub) el.sub.textContent = sub;
  }

  // anel de alerta em volta da mira (estilo "visualizar sons"): de que lado vem o inimigo perto.
  // Vermelho com estouro = atirando; claro com pegadas = andando. Mais forte quanto mais perto.
  threat(G, on) {
    let cv = this.threatCv;
    if (!cv) {
      cv = this.threatCv = document.createElement('canvas');
      cv.className = 'threat'; cv.setAttribute('aria-hidden', 'true');
      document.getElementById('hud').appendChild(cv);
    }
    const p = G.player, S = 240, dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== S * dpr) { cv.width = cv.height = S * dpr; }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    if (!on || !p?.alive) return;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const R = 84, MAX = 32;
    for (const r of G.remotes.values()) {
      if (!r.alive || !G.isEnemy(r)) continue;
      const dx = r.pos[0] - p.pos[0], dz = r.pos[2] - p.pos[2], d = Math.hypot(dx, dz);
      if (d > MAX || d < 0.5) continue;
      const shooting = (G.seen.get(r.id) || 0) > G.t + 1.2;
      const moving = (r.speed || 0) > 2.2;
      if (!shooting && !moving) continue;
      const a = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz); // 0 = na frente
      const k = 1 - d / MAX;
      const front = Math.abs(a) < 0.45 ? 0.45 : 1; // na frente voce ja ve: o arco fica discreto
      const ca = a - Math.PI / 2, span = 0.22 + k * 0.28;
      g.globalAlpha = (0.35 + k * 0.65) * front;
      g.lineCap = 'round';
      g.lineWidth = 4 + k * 7 + 3; g.strokeStyle = '#141210';
      g.beginPath(); g.arc(S / 2, S / 2, R, ca - span, ca + span); g.stroke();
      g.lineWidth = 4 + k * 7; g.strokeStyle = shooting ? '#e0301e' : '#ece9e1';
      g.beginPath(); g.arc(S / 2, S / 2, R, ca - span, ca + span); g.stroke();
      // marca no meio do arco: estouro (tiro) ou duas pegadas (passos)
      const mx = S / 2 + Math.cos(ca) * (R + 16), my = S / 2 + Math.sin(ca) * (R + 16);
      g.fillStyle = shooting ? '#e0301e' : '#ece9e1'; g.strokeStyle = '#141210'; g.lineWidth = 2;
      if (shooting) {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const q = (i / 10) * Math.PI * 2, rr = i % 2 ? 3 : 7; g.lineTo(mx + Math.cos(q) * rr, my + Math.sin(q) * rr); }
        g.closePath(); g.fill(); g.stroke();
      } else {
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(mx + s * 3 * Math.cos(ca + Math.PI / 2), my + s * 3 * Math.sin(ca + Math.PI / 2) - s * 2, 2.4, 3.6, ca + Math.PI / 2, 0, Math.PI * 2); g.fill(); g.stroke(); }
      }
    }
    g.globalAlpha = 1;
  }

  // plantar a bomba: barra de progresso (quem planta/desarma) e dica do que fazer ali
  bomb(G) {
    const el = this.bel || (this.bel = { bar: $('bombBar'), lbl: $('bombLbl'), fill: $('bombFill'), tag: $('bombTag') });
    const snap = G.snap, B = snap?.bomb, p = G.player;
    if (G.mode !== 'bomb' || !B || !p?.alive) { el.bar.hidden = true; el.tag.hidden = true; return; }
    const key = p.g.pad?.active ? 'X' : isTouch ? '✋' : 'E';
    let lbl = '', prog = -1;
    if (B.actor === G.myId && B.prog > 0) { lbl = t(B.kind === 'defuse' ? 'bombDefusing' : 'bombPlanting'); prog = B.prog / (B.kind === 'defuse' ? 6 : 3.2); }
    else if (B.state === 'carried' && B.carrier === G.myId && snap.sites?.some(s => Math.hypot(p.pos[0] - s.pos[0], p.pos[2] - s.pos[2]) < s.r)) lbl = t('bombHoldPlant', { k: key });
    else if (B.state === 'planted' && G.myTeam === 'blue' && Math.hypot(p.pos[0] - B.pos[0], p.pos[2] - B.pos[2]) < 2.6) lbl = t('bombHoldDefuse', { k: key });
    el.bar.hidden = !lbl;
    el.bar.classList.toggle('busy', prog >= 0);
    // botao de mao no toque: pulsa quando da pra plantar/desarmar ali, apagado quando nao da
    const ub = G.input?.useBtn;
    if (ub) ub.classList.toggle('can', !!lbl);
    if (el.lbl.textContent !== lbl) el.lbl.textContent = lbl;
    el.fill.style.width = Math.max(0, Math.min(1, prog)) * 100 + '%';
    const carrying = B.state === 'carried' && B.carrier === G.myId;
    el.tag.hidden = !carrying || !!lbl; // com a dica de plantar na tela, a etiqueta repetia a mesma coisa
    if (carrying) el.tag.textContent = t('bombCarry');
  }

  // aviso grande no meio de cima da tela (infectado, ultimo sobrevivente)
  // Pilha de eventos da partida (30/10): avisos, alertas e desbloqueios entram na hora no topo da pilha,
  // os anteriores descem; nada se sobrepoe e nada espera fila. No maximo 4 na tela.
  push(html, cls, ms) {
    const box = this.stack ||= document.getElementById('evStack');
    const el = document.createElement('div');
    el.className = 'ev ' + cls; el.innerHTML = html;
    box.prepend(el);
    while (box.children.length > (document.body.classList.contains('touchmode') ? 3 : 4)) box.lastChild.remove(); // celular: 3 (os botoes ocupam a lateral)
    setTimeout(() => el.classList.add('out'), ms);
    setTimeout(() => el.remove(), ms + 320);
    return el;
  }

  alert(title, sub = '', tone = 'red') {
    this.push(`<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`, 'ev-big ' + tone, 2900);
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
  // desafio de elite rastreado: plaquinha sob o placar a cada avanco (some em 3 s)
  eliteTrack(label, prog, n, done = false) {
    let el = document.getElementById('eliteTrack');
    if (!el) { el = document.createElement('div'); el.id = 'eliteTrack'; el.className = 'elite-track'; el.setAttribute('role', 'status'); document.getElementById('hud').appendChild(el); }
    el.classList.toggle('done', done);
    el.innerHTML = `<i aria-hidden="true">★</i><span><small>${t('elTitle')}</small><b>${label}</b><span class="xpbar"><i style="width:${Math.round(prog / n * 100)}%"></i></span></span><em>${done ? '✓' : prog + '/' + n}</em>`;
    el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(this.eliteT); this.eliteT = setTimeout(() => { el.hidden = true; }, done ? 5000 : 3000);
  }

  // elite concluido na partida: cartaz grande com a arma ganha em cima de um sol de raios girando
  // variante de elite ganha: cartao discreto na pilha (antes era um cartaz grande no meio da tela)
  eliteBanner({ title, name, sub, xp, img }) {
    this.push(`${img ? `<img src="${img}" alt="">` : ''}<span><small>★ ${title}</small><b>${name}</b>${sub ? `<i>${sub}</i>` : ''}</span><em>+${xp} XP</em>`, 'ev-unl elite', 4200);
  }

  unlockBanner({ kind, name, img, more = 0 }) {
    this.push(`${img ? `<img src="${img}" alt="">` : ''}<span><small>${kind}</small><b>${name}</b></span>${more ? `<em>+${more}</em>` : ''}`, 'ev-unl', 3200);
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

  // desbloqueios: pilha na coluna da esquerda, logo abaixo do minimapa (no meio da tela tapava a mira).
  // A posicao segue o minimapa, que muda de lugar no toque e em tela baixa. Tela baixa (celular
  // deitado): um por vez, em fila, senao a pilha desce ate o analogico.
  unlockToast(text) {
    const short = innerHeight <= 520;
    if (short) {
      (this.unlockQ ||= []).push(text);
      if (this.unlockBusy) return;
      const next = () => {
        const s = this.unlockQ.shift();
        if (s == null) { this.unlockBusy = false; return; }
        this.unlockBusy = true; this.showUnlock(s, 1);
        setTimeout(next, 2600);
      };
      next();
      return;
    }
    this.showUnlock(text, 3);
  }
  showUnlock(text, max) {
    const hud = document.getElementById('hud');
    let list = hud.querySelector('.unlocks');
    if (!list) { list = document.createElement('div'); list.className = 'unlocks'; hud.appendChild(list); }
    // abaixo do que estiver mais embaixo na coluna: minimapa ou kit de granadas
    let left = 14, top = 80;
    for (const sel of ['.radar', '.kit']) {
      const e = hud.querySelector(sel); if (!e?.offsetParent) continue;
      const r = e.getBoundingClientRect(); if (r.left > innerWidth / 3) continue;
      left = Math.min(left, r.left); top = Math.max(top, r.bottom + 8);
    }
    list.style.left = left + 'px'; list.style.top = top + 'px';
    const el = document.createElement('div');
    el.className = 'unlock-toast'; el.textContent = text;
    list.appendChild(el);
    while (list.children.length > max) list.firstChild.remove();
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

  // aviso fixo embaixo da mira enquanto vale (trocar arma no chao); null esconde
  prompt(text) {
    let el = this.promptEl;
    if (!el) { el = this.promptEl = document.createElement('div'); el.className = 'use-prompt'; document.getElementById('hud').appendChild(el); }
    if (text !== this.promptTxt) { this.promptTxt = text; el.textContent = text || ''; el.hidden = !text; }
  }
  // dupla: caido. Caixa embaixo da mira: sangra em N s (barra esvaziando) ou a bomba enchendo; null esconde
  down(s) {
    let el = this.downEl;
    if (!el) { el = this.downEl = document.createElement('div'); el.className = 'down-box'; el.setAttribute('role', 'status'); el.innerHTML = '<b></b><small></small><i><span></span></i>'; document.getElementById('hud').appendChild(el); }
    el.hidden = !s;
    if (!s) return;
    el.querySelector('b').textContent = t('duo_downTitle');
    el.querySelector('small').textContent = s.rv > 0 ? t('duo_beingPumped') : t('duo_bleed', { n: s.t });
    el.querySelector('span').style.width = Math.round(Math.min(1, s.rv > 0 ? s.rv : s.t / BR.duo.down) * 100) + '%';
    el.classList.toggle('pump', s.rv > 0);
  }
  message(text, t = 2.4) { this.push(esc(text), 'ev-msg', t * 1000); }

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
    if (snap.br) {
      // iris: circulo atual em tinta grossa, proximo tracejado claro; caixotes do dirigivel em vermelho
      const Z = snap.br, at = (x, z) => [(x - p.pos[0]) * k, (z - p.pos[2]) * k];
      g.lineWidth = 3; g.strokeStyle = '#141210'; g.beginPath(); g.arc(...at(Z.c[0], Z.c[1]), Z.r * k, 0, Math.PI * 2); g.stroke();
      if (Z.to && Z.state !== 'closed') { g.setLineDash([5, 4]); g.lineWidth = 2; g.strokeStyle = '#faf8f2'; g.beginPath(); g.arc(...at(Z.to.c[0], Z.to.c[1]), Z.to.r * k, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
      for (const c of G.brCrates || []) { g.fillStyle = '#a83a2c'; g.strokeStyle = '#141210'; g.lineWidth = 2; const [x, y] = at(c[0], c[1]); g.fillRect(x - 4, y - 4, 8, 8); g.strokeRect(x - 4, y - 4, 8, 8); }
    }
    for (const o of snap.players) {
      if (o.id === G.myId || !o.alive) continue;
      if (!G.isEnemy(o)) { dot(o.pos[0], o.pos[2], o.team === 'red' ? '#a83a2c' : '#2f5b8a', 4.5); continue; }
      if (uav || (G.seen.get(o.id) || 0) > G.t) dot(o.pos[0], o.pos[2], '#e0301e', 5.5);
      else if ((G.marked?.get(o.id) || 0) > G.t) { dot(o.pos[0], o.pos[2], '#ffb21a', 5.5); } // bala tracante
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
    // tecla de cada aparelho: teclado G/F/X, controle LB/RB/direcional pra cima, toque = icone do botao
    const dev = G.pad?.active ? 'pad' : isTouch ? 'touch' : 'kb';
    const [kf, kl, ks, kz] = dev === 'pad' ? ['LB ', 'RB ', '▲ ', '► '] : dev === 'touch' ? ['', '', '★ ', ''] : ['G ', 'F ', 'X ', 'Z '];
    const fld = p.g?.field, fpc = Math.floor((p.g?.fieldK ?? 0) * 100), fcd = fpc < 100 ? 1 : 0; // barra por pontos (%)
    const key = (fld || '') + fpc + '/' + (p.g?.mode || '') + '/' + (p.nades.frag || 0) + '/' + (p.nades.flash || 0) + '/' + ready.join(',') + '/' + (me?.streak || 0) + '/' + dev + '/' + (ready.length && snap.sLock ? snap.sLock.kind + snap.sLock.t : '');
    if (key !== this.kitKey) {
      this.kitKey = key;
      let el = document.getElementById('kit');
      if (!el) { el = document.createElement('div'); el.id = 'kit'; el.className = 'kit'; document.getElementById('hud').appendChild(el); }
      el.hidden = p.g?.mode === 'br' && !p.nades.frag && !p.nades.flash && !fld; // battle royale: so aparece quando tiver granada ou equipamento
      el.innerHTML = `<span class="${p.nades.frag ? '' : 'off'}">${kf}${t('n_frag')}</span><span class="${p.nades.flash ? '' : 'off'}">${kl}${t('n_flash')}</span>` +
        (fld ? `<span class="${fcd > 0 ? 'off' : 'ready-f'}">${kz}${t('fd_' + fld)}${fcd > 0 ? ' ' + fpc + '%' : ''}</span>` : '') +
        // sequencia pronta mas outra no ar: fica apagada com a contagem ate liberar
        (ready.length && snap.sLock && ready[0] !== 'uav' ? `<span class="off wait">${ks}${t('s_' + ready[0])} ${snap.sLock.t}s</span>` : ready.length ? `<span class="ready">${ks}${t('s_' + ready[0])}${ready.length > 1 ? ' +' + (ready.length - 1) : ''}</span>` : `<span class="off">${t('streakNext', { n: nextStreak(me?.streak || 0, p.g?.skills?.includes('pavio')) })}</span>`);
    }
  }

  // bussola do battle royale: rumo e marcadores pelo angulo em relacao a camera
  compass(G, camera) {
    const on = G.mode === 'br' && G.state === 'game' && !!G.player?.alive;
    const el = this.cp ||= { box: document.getElementById('compass'), strip: document.getElementById('cpStrip'), hd: document.getElementById('cpHd') };
    if (el.box.hidden === on) el.box.hidden = !on;
    if (!on) return;
    const yaw = G.player.yaw, W = el.strip.clientWidth || 400, span = Math.PI * 0.42; // metade do que cabe na faixa
    const ang = (dx, dz) => Math.atan2(-dx, -dz);
    const xOf = (a) => { let d = a - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); return Math.abs(d) > span ? null : W / 2 - d / span * W / 2; };
    let html = '';
    const CD = t('cp_dirs').split(',');
    for (let i = 0; i < 24; i++) {
      const a = -i * Math.PI / 12, x = xOf(a);
      if (x == null) continue;
      html += i % 3 ? `<i class="tk" style="left:${x.toFixed(0)}px"></i>` : `<span class="cd${i === 0 ? ' n' : ''}" style="left:${x.toFixed(0)}px">${CD[i / 3]}</span>`;
    }
    const me = G.player.pos, mark = (p, cls) => { const x = xOf(ang(p[0] - me[0], p[2] - me[2])); if (x != null) html += `<i class="mk ${cls}" style="left:${x.toFixed(0)}px"></i>`; };
    for (const r of G.remotes.values()) {
      if (!r.alive) continue;
      if (!G.isEnemy(r)) mark(r.pos, 'ally');
      else if ((G.seen.get(r.id) || 0) > G.t || (G.marked?.get(r.id) || 0) > G.t || (G.uavOn && G.uavOn())) mark(r.pos, 'enemy');
    }
    for (const c of G.brCrates || []) mark([c[0], 0, c[1]], 'crate');
    for (const d of G.brDrops || []) if (d.t > G.t) mark(d.pos, 'crate');
    for (const [id, pg] of G.pings || []) if (pg.t > G.t) mark(pg.pos, 'ping' + (id === G.myId ? '' : ' mate'));
    const deg = Math.round(((-yaw * 180 / Math.PI) % 360 + 360) % 360);
    if (html !== el.last) { el.strip.innerHTML = html; el.last = html; }
    el.hd.textContent = deg + '°';
  }

  objectives(snap, camera, me) {
    const mode = snap.mode;
    const pts = [];
    // marcacoes (ping) do battle royale: icone + o que e + distancia
    for (const [id, pg] of this.g?.pings || []) {
      if (pg.t <= (this.g?.t || 0)) continue;
      pts.push({ p: [pg.pos[0], pg.pos[1] + (pg.kind === 'enemy' ? 2.4 : 1.6), pg.pos[2]], cls: 'ping' + (id === this.g?.myId ? '' : ' mate') + (pg.kind === 'enemy' ? ' enemy' : ''), txt: pg.kind === 'enemy' ? '!' : pg.kind === 'item' ? '◆' : '▼', sub: pg.label || '' });
    }
    if (mode === 'ctf') {
      for (const team of ['red', 'blue']) {
        const f = snap.flags[team];
        const label = f.state === 'carried' ? (f.carrier === me?.id ? t('o_carry') : t('o_taken')) : f.state === 'dropped' ? t('o_drop') : '';
        pts.push({ p: [f.pos[0], f.pos[1] + 3.6, f.pos[2]], cls: team, txt: '⚑', sub: label });
        if (me && me.team && f.carrier === me.id && this.M) pts.push({ p: [this.M.flagBase[me.team][0], 3, this.M.flagBase[me.team][2]], cls: me.team, txt: '⌂', sub: t('o_base') });
      }
    } else if (mode === 'bomb' && snap.sites) {
      const B = snap.bomb;
      for (const s of snap.sites) {
        const here = B?.state === 'planted' && B.site === s.id;
        pts.push({ p: [s.pos[0], s.pos[1] + 2.6, s.pos[2]], cls: here ? 'red' : '', txt: s.id, sub: here ? t('bombHere') : '' });
      }
      if (B?.state === 'dropped') pts.push({ p: [B.pos[0], B.pos[1] + 1.6, B.pos[2]], cls: 'red', txt: '●', sub: t('bombDropped') });
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

  board(show, snap, players, meId, chs = null) {
    const b = this.el.board;
    b.hidden = !show;
    if (!show || !snap) return;
    const cfg = MODES[snap.mode];
    const TEAM = snap.mode === 'infect' ? { red: 'inf_h_inf', blue: 'inf_h_surv' } : { red: 'h_red', blue: 'h_blue' };
    const bomb = snap.mode === 'bomb';
    const rows = (list) => list.map(p => `<tr class="${p.id === meId ? 'me' : ''}${bomb && !p.alive ? ' dead' : ''}"><td>${bomb ? `<span class="life ${p.alive ? 'on' : 'off'}" title="${t(p.alive ? 'b_alive' : 'b_dead')}"></span>` : ''}${p.team ? `<span class="tteam" style="background:var(--${p.team})"></span>` : ''}${p.rk >= 0 ? badgeSvg(p.rk, 16) : ''}${esc(p.name)}${p.pr ? ` <em class="prest">★${p.pr > 1 ? p.pr : ''}</em>` : ''}${p.elite ? eliteTag() : ''}${p.bot ? ` <small>(${t('bot')})</small>` : ''}</td>${snap.mode === 'gungame' ? `<td class="n">${p.gunLvl + 1}</td>` : ''}<td class="n">${p.kills}</td><td class="n">${p.assists || 0}</td><td class="n">${p.deaths}</td><td class="n">${p.score}</td></tr>`).join('');
    const head = `<tr><th>${t('b_player')}</th>${snap.mode === 'gungame' ? `<th class="n">${t('b_step')}</th>` : ''}<th class="n">${t('b_kills')}</th><th class="n">${t('b_assists')}</th><th class="n">${t('b_deaths')}</th><th class="n">${t('b_score')}</th></tr>`;
    const sort = (l) => [...l].sort((a, b) => b.score - a.score || b.kills - a.kills);
    let html = `<h3>${modeName(snap.duo ? 'duo' : snap.bounce ? 'bounce' : snap.mode)}</h3>`;
    if (cfg.teams) {
      for (const tm of ['red', 'blue']) html += `<table><caption style="text-align:left;font-family:var(--display);padding:6px 0 2px;color:var(--${tm})">${t(TEAM[tm])} · ${snap.teamScore[tm]}</caption>${head}${rows(sort(players.filter(p => p.team === tm)))}</table>`;
    } else html += `<table>${head}${rows(sort(players))}</table>`;
    // desafios acompanhados ao lado do placar (embaixo na tela estreita), progresso ao vivo
    b.classList.toggle('has-ch', !!chs?.length);
    if (chs?.length) html = `<div class="bd-main">${html}</div><aside class="bd-ch"><h3>${t('challenges')}</h3><ul>${chs.map(c => `<li class="${c.done ? 'done' : ''}${c.elite ? ' elite' : ''}"><small>${esc(c.tag)}${c.pin ? ' ·  ★' : ''}</small><b>${esc(c.name)}</b>${c.rw ? `<em>${esc(c.rw)}</em>` : ''}<span class="bd-bar"><i style="width:${Math.round(Math.min(1, c.prog / c.n) * 100)}%"></i></span><span class="bd-n">${c.done ? t('chDoneStamp') : `${Math.min(c.prog, c.n)}/${c.n}`}</span></li>`).join('')}</ul></aside>`;
    if (b._h !== html) { b._h = html; b.innerHTML = html; } // so redesenha quando muda (antes era todo quadro)
  }
}
