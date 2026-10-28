// Nucleo da partida. Mesmo codigo no solo (navegador) e no multiplayer (node).
// send(to, msg): to = id do cliente ou null pra todos.
import { WEAPONS, GUN_LADDER, SPAWN_KIT, MODES, BOT_HP, PRIMARIES, NADES, STREAKS, bodyTrait } from './weapons.js';
import { getMap, MODE_MAP, moveBody, raycast, hasLOS } from './map.js';
import { navPath } from './nav.js';

const BOT_NAMES = ['Botao', 'Salsicha', 'Rolha', 'Bigorna', 'Carvao', 'Pipoca', 'Tamanco', 'Fuligem',
  'Manivela', 'Gaita', 'Biscoito', 'Trombone', 'Pavio', 'Sabugo', 'Mola', 'Tinteiro'];
const MATCH_TIME = 480;
const RESPAWN = 2.6;

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Core {
  constructor({ mode = 'ffa', map, bots = 7, difficulty = 1, send, lobby = true }) {
    this.mode = MODES[mode] ? mode : 'ffa';
    this.cfg = MODES[this.mode];
    this.M = getMap(map && map !== 'auto' ? map : MODE_MAP[this.mode]);
    this.wantBots = bots;
    this.difficulty = difficulty;
    this.send = send;
    this.players = new Map();
    this.snapT = 0;
    this.botSeq = 0;
    this.seq = 1;
    // fases: 'lobby' (esperando todo humano dar pronto) -> 'count' (contagem) -> 'play'
    this.phase = lobby ? 'lobby' : 'play'; this.countT = 0; this.lobbyT = 0; this.useLobby = lobby;
    this.reset();
    this.balanceBots();
  }

  reset() {
    const M = this.M;
    this.time = MATCH_TIME;
    this.over = false;
    this.overT = 0;
    this.teamScore = { red: 0, blue: 0 };
    this.flags = {
      red: { state: 'home', pos: [...M.flagBase.red], carrier: null, dropT: 0 },
      blue: { state: 'home', pos: [...M.flagBase.blue], carrier: null, dropT: 0 },
    };
    this.zones = M.zones.map(z => ({ id: z.id, pos: z.pos, r: z.r, owner: null, prog: 0 }));
    this.pickups = M.pickups.map((p, i) => ({ id: i, ...p, active: !(this.mode === 'gungame' && p.kind === 'wpn'), t: 0 }));
    this.nades = []; this.anvils = []; this.blimps = []; this.uavs = [];
    for (const p of this.players.values()) {
      p.kills = 0; p.deaths = 0; p.score = 0; p.gunLvl = 0; p.streak = 0; p.ready = []; p.assists = 0; p.dmgBy = {};
      this.spawn(p);
    }
  }

  // ---------- jogadores ----------
  pickTeam() {
    if (!this.cfg.teams) return null;
    let r = 0, b = 0;
    for (const p of this.players.values()) { if (p.team === 'red') r++; else if (p.team === 'blue') b++; }
    return r <= b ? 'red' : 'blue';
  }

  addPlayer(id, name, bot = false) {
    const p = {
      id, name, bot, team: this.pickTeam(), hp: 100, alive: false, respawnT: 0.2,
      pos: [0, 0, 0], vel: [0, 0, 0], yaw: 0, pitch: 0, anim: 'idle', wpn: 'pistol', lastWpn: 'pistol',
      kills: 0, deaths: 0, score: 0, gunLvl: 0, streak: 0, ready: [], owned: new Set(SPAWN_KIT),
      nades: { frag: 1, flash: 1 }, budget: 300, los: null,
      ai: bot ? { t: 0, strafe: 1, stuckT: 0, last: [0, 0, 0], fireT: 0, goal: null, think: 0, react: 0, target: null, mag: 0, reloadT: 0, blind: 0, nadeT: rnd(4, 10) } : null,
    };
    this.players.set(id, p);
    // humano nasce no proximo tick, depois do 'welcome' chegar
    if (bot) this.spawn(p); else p.respawnT = 0.05;
    return p;
  }

  join(id, name) {
    const p = this.addPlayer(id, (name || 'Player').slice(0, 14));
    this.balanceBots();
    this.send(id, { t: 'welcome', id, mode: this.mode, map: this.M.id, team: p.team, phase: this.phase });
    this.lobbyT = 0;
    // pecas das armas de quem ja estava na sala
    for (const o of this.players.values()) if (o.los && o.id !== id) this.send(id, { t: 'ev', k: 'lo', id: o.id, los: o.los, tracer: o.tracer });
    this.event({ k: 'msg', key: 'joined', name: p.name });
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.dropFlag(p);
    this.players.delete(id);
    this.balanceBots();
  }

  // modelo travado do degrau da escada de armas (fora dela, null)
  ggBody(p) { return this.mode === 'gungame' ? GUN_LADDER[Math.min(p.gunLvl, GUN_LADDER.length - 1)].body : null; }
  bodyOf(p, wpn) { return this.ggBody(p) || p.los?.[wpn]?.body; }

  // host = humano mais antigo na sala (Map guarda a ordem de entrada); saiu, passa pro proximo
  hostId() { for (const p of this.players.values()) if (!p.bot) return p.id; return null; }

  humans() { let n = 0; for (const p of this.players.values()) if (!p.bot) n++; return n; }

  balanceBots() {
    const humans = this.humans();
    const bots = [...this.players.values()].filter(p => p.bot);
    const want = Math.max(0, this.wantBots - Math.max(0, humans - 1));
    while (bots.length < want) {
      const name = BOT_NAMES[this.botSeq++ % BOT_NAMES.length];
      bots.push(this.addPlayer('bot' + this.botSeq, name, true));
    }
    while (bots.length > want) this.players.delete(bots.pop().id);
  }

  spawn(p) {
    const S = this.M.spawns;
    let list = S.ffa;
    if (this.cfg.teams && p.team) list = S[p.team];
    const enemies = [...this.players.values()].filter(o => o !== p && o.alive && (!this.cfg.teams || o.team !== p.team));
    let best = list[0], bestScore = -1;
    for (const s of list) {
      let m = 1e9;
      for (const e of enemies) m = Math.min(m, (e.pos[0] - s[0]) ** 2 + (e.pos[2] - s[1]) ** 2);
      const sc = Math.sqrt(m) + rnd(0, 14);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    p.pos = [best[0] + rnd(-1, 1), 0, best[1] + rnd(-1, 1)];
    p.vel = [0, 0, 0];
    p.yaw = Math.atan2(-p.pos[0], -p.pos[2]);
    p.hp = p.bot ? BOT_HP : 100;
    p.maxHp = p.hp;
    p.alive = true;
    p.nades = { frag: 1, flash: 1 };
    p.owned = new Set(SPAWN_KIT);
    if (this.mode !== 'gungame') p.owned.add('melee');
    if (this.mode === 'gungame') p.wpn = GUN_LADDER[Math.min(p.gunLvl, GUN_LADDER.length - 1)].wpn;
    else if (p.bot) p.wpn = ['smg', 'rifle', 'shotgun', 'pistol', 'smg', 'rifle'][Math.floor(Math.random() * 6)];
    else p.wpn = PRIMARIES.includes(p.primary) ? p.primary : 'smg';
    p.owned.add(p.wpn);
    if (p.bot) { this.botReload(p, true); p.ai.blind = 0; }
    this.event({ k: 'spawn', id: p.id, pos: p.pos, yaw: p.yaw, wpn: p.wpn, owned: [...p.owned], body: this.ggBody(p) });
  }

  // ---------- mensagens do cliente ----------
  handle(id, m) {
    const p = this.players.get(id);
    if (!p || !m || typeof m !== 'object') return;
    switch (m.t) {
      case 'ready': {
        p.lobbyReady = !!m.v;
        this.lobbyT = 0;
        break;
      }
      // so o host (primeiro humano da sala) solta a contagem; quem nao deu pronto entra igual
      case 'start': {
        if (id !== this.hostId() || this.phase !== 'lobby') break;
        this.phase = 'count'; this.countT = COUNTDOWN; this.lobbyT = 0;
        break;
      }
      case 'respawn': {
        if (!p.alive && p.respawnT <= 0) p.wantSpawn = true;
        break;
      }
      case 'loadout': {
        if (Number.isFinite(m.lvl)) p.lvl = Math.max(1, Math.min(99, Math.round(m.lvl)));
        if (PRIMARIES.includes(m.primary)) p.primary = m.primary;
        p.los = cleanLoadouts(m.los);
        p.tracer = typeof m.tracer === 'string' && /^[a-z]{2,10}$/.test(m.tracer) ? m.tracer : 'chalk';
        this.event({ k: 'lo', id, los: p.los, tracer: p.tracer });
        break;
      }
      case 'state':
        if (!p.alive) return;
        if (!Array.isArray(m.pos) || m.pos.length !== 3 || !m.pos.every(Number.isFinite)) return;
        if (!Number.isFinite(m.yaw) || !Number.isFinite(m.pitch)) return;
        p.pos = m.pos; p.yaw = m.yaw; p.pitch = m.pitch; p.anim = String(m.anim).slice(0, 8);
        if (this.mode !== 'gungame' && WEAPONS[m.wpn] && m.wpn !== p.wpn) { p.lastWpn = p.wpn; p.wpn = m.wpn; }
        break;
      case 'swing':
        if (p.alive) this.event({ k: 'swing', id });
        break;
      case 'shot':
        if (!WEAPONS[m.wpn] || !Array.isArray(m.o)) return;
        this.event({ k: 'shot', id, o: m.o, e: m.e, wpn: m.wpn });
        break;
      case 'hit': {
        const v = this.players.get(m.v);
        if (!v || !p.alive || !v.alive) return;
        const dmg = this.validHit(p, v, m);
        if (dmg > 0) this.damage(v, p, dmg, m.wpn, !!m.head);
        break;
      }
      case 'nade':
        if (p.alive && NADES[m.kind] && p.nades[m.kind] > 0 && Array.isArray(m.d) && m.d.every(Number.isFinite)) {
          p.nades[m.kind]--;
          this.throwNade(p, m.kind, norm(m.d));
        }
        break;
      case 'streak':
        if (p.alive) this.useStreak(p, m.kind);
        break;
      case 'chat':
        this.event({ k: 'msg', text: `${p.name}: ${String(m.text).slice(0, 80)}` });
        break;
    }
  }

  // Acerto vindo do cliente: confere arma, alcance, linha de visao e taxa de dano
  validHit(p, v, m) {
    const w = WEAPONS[m.wpn];
    if (!w || !Number.isFinite(m.dmg) || m.dmg <= 0) return 0;
    // faca rapida vale com qualquer arma na mao; o resto so com a arma que ele segura
    if (!w.melee && m.wpn !== p.wpn && m.wpn !== p.lastWpn) return 0;
    const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
    const d = Math.sqrt(dist2(eye, v.pos));
    const range = w.melee ? (bodyTrait(this.bodyOf(p, 'melee')).range || w.range) * 1.4 + 0.6 : (w.range || 260);
    if (d > range) return 0;
    if (w.melee) { const now = this.clock || 0; if (now - (p.meleeAt || -9) < 0.3) return 0; p.meleeAt = now; return Math.min(m.dmg, w.dmg); }
    const chest = [v.pos[0], v.pos[1] + 1.1, v.pos[2]], head = [v.pos[0], v.pos[1] + 1.6, v.pos[2]];
    if (!hasLOS(this.M, eye, chest) && !hasLOS(this.M, eye, head)) return 0;
    const tr = bodyTrait(this.bodyOf(p, m.wpn));
    const maxShot = w.dmg * (w.pellets || 1) * (tr.dmg || 1) * 1.25;
    const dmg = Math.min(m.dmg, maxShot);
    if (p.budget < dmg) return Math.max(0, p.budget);
    p.budget -= dmg;
    return dmg;
  }

  event(ev) { this.send(null, { t: 'ev', ...ev }); }

  // ---------- combate ----------
  enemies(a, b) { return a !== b && (!this.cfg.teams || a.team !== b.team); }

  damage(v, a, dmg, wpn, head) {
    if (this.over || this.freezeT > 0 || !v.alive || !Number.isFinite(dmg)) return;
    if (a && a !== v && !this.enemies(a, v)) return;
    if (head) dmg *= 1.6;
    v.hp -= dmg;
    // quem ajudou: dano acumulado por atacante, com hora (assistencia vale por 6 s)
    if (a && a !== v) { v.dmgBy = v.dmgBy || {}; const r = v.dmgBy[a.id] || (v.dmgBy[a.id] = { dmg: 0, t: 0 }); r.dmg += dmg; r.t = this.clock || 0; }
    this.event({ k: 'hurt', v: v.id, a: a ? a.id : null, dmg: Math.round(dmg), from: a ? a.pos : null, head });
    if (v.hp <= 0) this.kill(v, a, wpn, head);
  }

  kill(v, a, wpn, head) {
    v.alive = false; v.hp = 0; v.respawnT = RESPAWN; v.deaths++; v.streak = 0;
    this.dropFlag(v);
    const suicide = !a || a === v;
    if (!suicide) {
      a.kills++; a.streak++; a.score += 100;
      if (this.cfg.teams && this.mode === 'tdm') this.teamScore[a.team]++;
      if (this.mode === 'gungame' && WEAPONS[wpn]) {
        a.gunLvl++;
        if (a.gunLvl >= GUN_LADDER.length) { a.gunLvl = GUN_LADDER.length - 1; this.end(a.name); }
        else { a.wpn = GUN_LADDER[a.gunLvl].wpn; this.event({ k: 'give', id: a.id, wpn: a.wpn, force: true, body: this.ggBody(a) }); }
      }
      for (const [kind, s] of Object.entries(STREAKS)) {
        if (a.streak === s.kills) {
          a.ready.push(kind);
          this.event({ k: 'streakReady', id: a.id, kind });
          if (a.bot) this.useStreak(a, kind);
        }
      }
    }
    // assistencias: quem deu 20+ de dano nos ultimos 6 s e nao foi quem matou
    for (const [id, r] of Object.entries(v.dmgBy || {})) {
      const h = this.players.get(id);
      if (!h || h === a || r.dmg < 20 || (this.clock || 0) - r.t > 6) continue;
      h.score += 50; h.assists = (h.assists || 0) + 1;
      this.event({ k: 'assist', id, v: v.id, dmg: Math.round(r.dmg) });
    }
    v.dmgBy = {};
    this.event({ k: 'kill', a: suicide ? null : a.id, v: v.id, wpn, head, streak: suicide ? 0 : a.streak, pos: v.pos });
    if (this.mode === 'ffa' && !suicide && a.kills >= this.cfg.limit) this.end(a.name);
    if (this.mode === 'tdm' && !suicide && this.teamScore[a.team] >= this.cfg.limit) this.end(a.team);
  }

  // ---------- granadas ----------
  throwNade(p, kind, d) {
    const o = [p.pos[0] + d[0] * 0.6, p.pos[1] + 1.45, p.pos[2] + d[2] * 0.6];
    const sp = NADES[kind].speed;
    this.nades.push({ id: this.seq++, kind, owner: p.id, pos: o, vel: [d[0] * sp, d[1] * sp + 4.5, d[2] * sp], fuse: NADES[kind].fuse });
    this.event({ k: 'throw', id: p.id, kind });
  }

  tickNades(dt) {
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i];
      n.fuse -= dt;
      n.vel[1] -= 22 * dt;
      const step = [n.vel[0] * dt, n.vel[1] * dt, n.vel[2] * dt];
      const len = Math.hypot(...step);
      if (len > 1e-5) {
        const dir = [step[0] / len, step[1] / len, step[2] / len];
        const hit = raycast(this.M, n.pos, dir, len + 0.12);
        if (hit.dist !== Infinity && hit.normal) {
          // quica: reflete na normal e perde forca
          const k = Math.max(0, hit.dist - 0.12);
          n.pos = [n.pos[0] + dir[0] * k, n.pos[1] + dir[1] * k, n.pos[2] + dir[2] * k];
          const N = hit.normal, dot = n.vel[0] * N[0] + n.vel[1] * N[1] + n.vel[2] * N[2];
          n.vel = [(n.vel[0] - 2 * dot * N[0]) * 0.45, (n.vel[1] - 2 * dot * N[1]) * 0.38, (n.vel[2] - 2 * dot * N[2]) * 0.45];
          if (Math.abs(dot) > 3) this.event({ k: 'bounce', pos: n.pos });
        } else n.pos = [n.pos[0] + step[0], n.pos[1] + step[1], n.pos[2] + step[2]];
      }
      if (n.fuse <= 0) { this.detonate(n); this.nades.splice(i, 1); }
    }
  }

  detonate(n) {
    const owner = this.players.get(n.owner);
    if (n.kind === 'frag') {
      const R = NADES.frag.radius;
      this.event({ k: 'boom', pos: n.pos, owner: n.owner });
      for (const v of this.players.values()) {
        if (!v.alive) continue;
        const c = [v.pos[0], v.pos[1] + 0.9, v.pos[2]];
        const d = Math.sqrt(dist2(c, n.pos));
        if (d > R || !hasLOS(this.M, [n.pos[0], n.pos[1] + 0.3, n.pos[2]], c)) continue;
        let dmg = NADES.frag.dmg * (1 - d / R) + 15;
        if (v.id === n.owner) dmg *= 0.5;
        else if (owner && !this.enemies(owner, v)) continue;
        this.damage(v, owner || v, dmg, 'frag', false);
      }
    } else {
      this.event({ k: 'flash', pos: n.pos, owner: n.owner });
      for (const v of this.players.values()) {
        if (!v.alive || !v.bot) continue;
        const d = Math.sqrt(dist2(v.pos, n.pos));
        if (d < 15 && hasLOS(this.M, [v.pos[0], v.pos[1] + 1.5, v.pos[2]], n.pos)) { v.ai.blind = 3.2 * (1 - d / 15) + 0.6; v.ai.target = null; }
      }
    }
  }

  // ---------- sequencias de abates ----------
  useStreak(p, kind) {
    const i = p.ready.indexOf(kind);
    if (i < 0) return;
    p.ready.splice(i, 1);
    const A = this.M.arena;
    if (kind === 'uav') this.uavs.push({ owner: p.id, team: p.team, t: STREAKS.uav.time });
    if (kind === 'anvil') {
      const targets = [...this.players.values()].filter(o => o.alive && this.enemies(p, o)).slice(0, 7);
      const list = targets.map(o => [o.pos[0] + rnd(-1.2, 1.2), 0, o.pos[2] + rnd(-1.2, 1.2)]);
      if (!list.length) list.push([rnd(-A / 2, A / 2), 0, rnd(-A / 2, A / 2)]);
      for (const pos of list) this.anvils.push({ owner: p.id, pos, t: 1.7 + rnd(0, 0.5) });
      this.event({ k: 'anvilWarn', list });
    }
    if (kind === 'blimp') this.blimps.push({ owner: p.id, team: p.team, t: STREAKS.blimp.time, ang: rnd(0, 6.28), fireT: 1, pos: [0, 28, 0] });
    this.event({ k: 'streak', id: p.id, kind, team: p.team });
  }

  tickStreaks(dt) {
    for (const u of this.uavs) u.t -= dt;
    this.uavs = this.uavs.filter(u => u.t > 0 && this.players.has(u.owner));
    for (let i = this.anvils.length - 1; i >= 0; i--) {
      const a = this.anvils[i];
      a.t -= dt;
      if (a.t > 0) continue;
      this.anvils.splice(i, 1);
      const owner = this.players.get(a.owner);
      this.event({ k: 'anvil', pos: a.pos });
      for (const v of this.players.values()) {
        if (!v.alive || (owner && !this.enemies(owner, v) && v !== owner)) continue;
        const d = Math.hypot(v.pos[0] - a.pos[0], v.pos[2] - a.pos[2]);
        if (d < 3.4 && v.pos[1] < 6) this.damage(v, owner || v, 260 * (1 - d / 4.5), 'anvil', false);
      }
    }
    const A = this.M.arena;
    for (const b of this.blimps) {
      b.t -= dt;
      b.ang += dt * 0.18;
      b.pos = [Math.cos(b.ang) * A * 0.45, 28, Math.sin(b.ang) * A * 0.45];
      b.fireT -= dt;
      const owner = this.players.get(b.owner);
      if (b.fireT > 0 || !owner) continue;
      b.fireT = 0.55;
      let best = null, bd = 1e9;
      for (const v of this.players.values()) {
        if (!v.alive || !this.enemies(owner, v)) continue;
        const c = [v.pos[0], v.pos[1] + 1.1, v.pos[2]];
        const d = dist2(c, b.pos);
        if (d < bd && hasLOS(this.M, b.pos, c)) { bd = d; best = v; }
      }
      if (!best) continue;
      const hitIt = Math.random() < 0.6;
      const e = [best.pos[0] + (hitIt ? 0 : rnd(-2, 2)), best.pos[1] + 1, best.pos[2] + (hitIt ? 0 : rnd(-2, 2))];
      this.event({ k: 'shot', id: 'blimp', o: b.pos, e, wpn: 'rifle' });
      if (hitIt) this.damage(best, owner, STREAKS.blimp.dmg, 'blimp', false);
    }
    this.blimps = this.blimps.filter(b => b.t > 0 && this.players.has(b.owner));
  }

  // ---------- bandeiras ----------
  dropFlag(p) {
    for (const team of ['red', 'blue']) {
      const f = this.flags[team];
      if (f.state === 'carried' && f.carrier === p.id) {
        f.state = 'dropped'; f.carrier = null; f.pos = [p.pos[0], p.pos[1], p.pos[2]]; f.dropT = 20;
        this.event({ k: 'flag', team, act: 'drop', who: p.name });
      }
    }
  }

  tickCTF(dt) {
    const FB = this.M.flagBase;
    for (const team of ['red', 'blue']) {
      const f = this.flags[team];
      const enemyTeam = team === 'red' ? 'blue' : 'red';
      if (f.state === 'carried') {
        const c = this.players.get(f.carrier);
        if (!c || !c.alive) { f.state = 'dropped'; f.carrier = null; f.dropT = 20; continue; }
        f.pos = [c.pos[0], c.pos[1], c.pos[2]];
        const home = this.flags[enemyTeam];
        if (home.state === 'home' && dist2(c.pos, FB[enemyTeam]) < 2.6 * 2.6) {
          this.teamScore[enemyTeam]++;
          c.score += 300;
          f.state = 'home'; f.carrier = null; f.pos = [...FB[team]];
          this.event({ k: 'flag', team, act: 'cap', who: c.name, by: enemyTeam });
          if (this.teamScore[enemyTeam] >= this.cfg.limit) this.end(enemyTeam);
        }
        continue;
      }
      if (f.state === 'dropped') {
        f.dropT -= dt;
        if (f.dropT <= 0) { f.state = 'home'; f.pos = [...FB[team]]; this.event({ k: 'flag', team, act: 'return', who: '' }); continue; }
      }
      for (const p of this.players.values()) {
        if (!p.alive || dist2(p.pos, f.pos) > 2.2 * 2.2) continue;
        if (p.team === enemyTeam) { f.state = 'carried'; f.carrier = p.id; this.event({ k: 'flag', team, act: 'take', who: p.name }); break; }
        if (p.team === team && f.state === 'dropped') {
          f.state = 'home'; f.pos = [...FB[team]]; p.score += 100;
          this.event({ k: 'flag', team, act: 'return', who: p.name });
          break;
        }
      }
    }
  }

  tickDOM(dt) {
    for (const z of this.zones) {
      let r = 0, b = 0;
      for (const p of this.players.values()) {
        if (!p.alive) continue;
        if ((p.pos[0] - z.pos[0]) ** 2 + (p.pos[2] - z.pos[2]) ** 2 > z.r * z.r) continue;
        if (Math.abs(p.pos[1] - z.pos[1]) > 2.5) continue;
        if (p.team === 'red') r++; else b++;
      }
      const prev = z.owner;
      if (r !== b) {
        const dir = r > b ? -1 : 1;
        z.prog = Math.max(-1, Math.min(1, z.prog + dir * dt * 0.32 * Math.min(3, Math.abs(r - b))));
      }
      if (z.prog <= -1) z.owner = 'red';
      else if (z.prog >= 1) z.owner = 'blue';
      else if (z.owner && ((z.owner === 'red' && z.prog > 0) || (z.owner === 'blue' && z.prog < 0))) z.owner = null;
      if (z.owner !== prev && z.owner) this.event({ k: 'zone', id: z.id, team: z.owner });
      if (z.owner) this.teamScore[z.owner] += dt;
    }
    for (const t of ['red', 'blue']) if (this.teamScore[t] >= this.cfg.limit) { this.teamScore[t] = this.cfg.limit; this.end(t); }
  }

  end(winner) {
    if (this.over) return;
    this.over = true; this.overT = 9;
    this.event({ k: 'end', winner });
  }

  // ---------- bots ----------
  tickBot(p, dt) {
    const ai = p.ai, M = this.M;
    const eye = [p.pos[0], p.pos[1] + 1.5, p.pos[2]];
    if (ai.blind > 0) ai.blind -= dt;
    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = 0.25;
      let best = null, bd = 60 * 60;
      if (ai.blind <= 0) for (const o of this.players.values()) {
        if (!o.alive || !this.enemies(p, o)) continue;
        const d = dist2(o.pos, p.pos);
        if (d < bd && hasLOS(M, eye, [o.pos[0], o.pos[1] + 1.4, o.pos[2]])) { bd = d; best = o; }
      }
      if (best && best !== ai.target) ai.react = 0.35 / this.difficulty;
      ai.target = best;
      ai.goal = this.botGoal(p);
    }
    const w = WEAPONS[p.wpn];
    let moveDir = null, wantYaw = p.yaw, sprint = false;
    const t = ai.target && ai.target.alive ? ai.target : null;
    if (ai.reloadT > 0) { ai.reloadT -= dt; if (ai.reloadT <= 0) ai.mag = Math.round(w.mag); }
    if (t) {
      const dx = t.pos[0] - p.pos[0], dz = t.pos[2] - p.pos[2];
      const d = Math.hypot(dx, dz);
      wantYaw = Math.atan2(-dx, -dz);
      p.pitch = Math.atan2((t.pos[1] - p.pos[1]), d) * 0.8;
      ai.t -= dt;
      if (ai.t <= 0) { ai.t = rnd(0.5, 1.4); ai.strafe = Math.random() < 0.5 ? -1 : 1; }
      const fx = dx / (d || 1), fz = dz / (d || 1);
      const ideal = WEAPONS[p.wpn]?.melee ? 0.8 : p.wpn === 'shotgun' ? 6 : p.wpn === 'sniper' ? 30 : 14;
      const adv = d > ideal + 3 ? 1 : d < ideal - 3 ? -0.6 : 0;
      moveDir = [fx * adv - fz * ai.strafe * 0.8, fz * adv + fx * ai.strafe * 0.8];
      if (ai.goal && (this.mode === 'ctf' || this.mode === 'dom') && d > 5) {
        const gd = Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]);
        const g = this.botSteer(p, ai.goal, dt);
        if (g && (gd > 3.5 || this.carrying(p))) moveDir = [g[0] - fz * ai.strafe * 0.5, g[1] + fx * ai.strafe * 0.5];
      }
      ai.react -= dt;
      ai.fireT -= dt;
      ai.nadeT -= dt;
      const facing = Math.abs(angDiff(p.yaw, wantYaw)) < 0.25;
      if (ai.reloadT <= 0 && ai.mag <= 0) this.botReload(p);
      // granada de vez em quando, em arco ate o alvo
      if (ai.nadeT <= 0 && p.nades.frag > 0 && d > 9 && d < 24 && !this.over) {
        ai.nadeT = rnd(8, 16); p.nades.frag--;
        const up = 0.25 + d * 0.012;
        this.throwNade(p, 'frag', norm([fx, up, fz]));
        const n = this.nades[this.nades.length - 1];
        const sp = Math.min(19, 6 + d * 0.55);
        n.vel = [fx * sp, up * sp + 3, fz * sp];
      } else if (ai.react <= 0 && facing && ai.fireT <= 0 && !this.over && ai.reloadT <= 0 && ai.mag > 0) {
        ai.mag--;
        ai.fireT = w.rate * (w.auto ? 1.6 : 1.3) + (p.wpn === 'sniper' ? 0.8 : 0);
        this.botShoot(p, t, d);
      }
    } else if (ai.reloadT <= 0 && ai.mag < w.mag * 0.5 && ai.mag < w.mag) this.botReload(p);
    if (!moveDir && ai.goal) {
      const d = Math.hypot(ai.goal[0] - p.pos[0], ai.goal[2] - p.pos[2]);
      const g = d > 1.5 ? this.botSteer(p, ai.goal, dt) : null;
      if (g) { moveDir = g; if (!t) { wantYaw = Math.atan2(-g[0], -g[1]); p.pitch *= 0.9; } sprint = !t && ai.blind <= 0; }
    }
    if (ai.blind > 0) wantYaw = p.yaw + Math.sin(ai.blind * 6) * 0.5;
    p.yaw += clampA(angDiff(p.yaw, wantYaw), (t ? 7 : 5) * dt * this.difficulty);

    const speed = sprint ? 10.5 : ai.blind > 0 ? 3 : 7;
    const ground = p.onGround;
    const acc = ground ? 12 : 3;
    const tx = moveDir ? moveDir[0] * speed : 0, tz = moveDir ? moveDir[1] * speed : 0;
    p.vel[0] += (tx - p.vel[0]) * Math.min(1, acc * dt);
    p.vel[2] += (tz - p.vel[2]) * Math.min(1, acc * dt);
    p.vel[1] -= 24 * dt;
    ai.stuckT += dt;
    if (ai.stuckT > 0.6) {
      const moved = Math.hypot(p.pos[0] - ai.last[0], p.pos[2] - ai.last[2]);
      if (moveDir && moved < 1.2 && ground) { p.vel[1] = 8.5; ai.strafe *= -1; ai.t = 1; ai.path = null; }
      ai.last = [...p.pos]; ai.stuckT = 0;
    }
    if (t && ground && Math.random() < dt * 0.5) p.vel[1] = 8.5;
    p.onGround = moveBody(M, p.pos, p.vel, dt, 0.4, 1.7);
    const hs = Math.hypot(p.vel[0], p.vel[2]);
    p.anim = !p.onGround ? 'jump' : ai.reloadT > 0 ? 'reload' : hs > 9 ? 'sprint' : hs > 1 ? 'run' : 'idle';
  }

  botReload(p, instant = false) {
    const w = WEAPONS[p.wpn];
    if (instant) { p.ai.mag = Math.round(w.mag); p.ai.reloadT = 0; return; }
    p.ai.reloadT = w.reload * 1.15;
    this.event({ k: 'reload', id: p.id, pos: [p.pos[0], p.pos[1] + 1.3, p.pos[2]] });
  }

  carrying(p) { return this.flags.red.carrier === p.id || this.flags.blue.carrier === p.id; }

  // direcao (unitaria, [x,z]) seguindo a rota A* ate o objetivo; refaz a rota se o objetivo andou
  botSteer(p, goal, dt) {
    const ai = p.ai;
    ai.pathT = (ai.pathT || 0) - dt;
    const moved = ai.pathGoal ? Math.hypot(goal[0] - ai.pathGoal[0], goal[2] - ai.pathGoal[2]) : Infinity;
    if (!ai.path || moved > 3 || ai.pathT <= 0) {
      ai.path = navPath(this.M, p.pos, goal);
      if (!ai.path || !ai.path.length) ai.path = [[goal[0], goal[2]]];
      ai.pathGoal = [...goal]; ai.pathT = 2 + Math.random();
    }
    while (ai.path.length > 1 && Math.hypot(ai.path[0][0] - p.pos[0], ai.path[0][1] - p.pos[2]) < 1.2) ai.path.shift();
    const [x, z] = ai.path[0], dx = x - p.pos[0], dz = z - p.pos[2], d = Math.hypot(dx, dz);
    return d > 0.05 ? [dx / d, dz / d] : null;
  }

  botGoal(p) {
    const FB = this.M.flagBase;
    if (this.mode === 'ctf') {
      const mine = p.team, theirs = mine === 'red' ? 'blue' : 'red';
      if (this.carrying(p)) return FB[mine];
      if (this.flags[mine].state === 'dropped') return this.flags[mine].pos;
      const role = (p.id.charCodeAt(p.id.length - 1) % 3);
      if (role === 0 && this.flags[mine].state === 'carried') return this.flags[mine].pos;
      return this.flags[theirs].pos;
    }
    if (this.mode === 'dom') {
      let best = null, bd = 1e9;
      for (const z of this.zones) {
        if (z.owner === p.team && Math.random() < 0.8) continue;
        const d = dist2(z.pos, p.pos) * (0.6 + Math.random());
        if (d < bd) { bd = d; best = z.pos; }
      }
      return best || this.zones[1].pos;
    }
    if (!p.ai.goal || dist2(p.ai.goal, p.pos) < 9 || Math.random() < 0.1) {
      const ens = [...this.players.values()].filter(o => o.alive && this.enemies(p, o));
      if (ens.length && Math.random() < 0.6) return [...ens[Math.floor(Math.random() * ens.length)].pos];
      const pk = this.pickups.filter(x => x.active);
      if (pk.length) return pk[Math.floor(Math.random() * pk.length)].pos;
    }
    return p.ai.goal;
  }

  botShoot(p, t, d) {
    const w = WEAPONS[p.wpn];
    // lamina: so acerta colado
    if (w.melee) {
      if (d > (bodyTrait(this.bodyOf(p, 'melee')).range || w.range)) return;
      this.event({ k: 'swing', id: p.id });
      this.damage(t, p, w.dmg, 'melee', false);
      return;
    }
    const o = [p.pos[0], p.pos[1] + 1.45, p.pos[2]];
    const aim = [t.pos[0], t.pos[1] + 1.1, t.pos[2]];
    const dir = norm([aim[0] - o[0], aim[1] - o[1], aim[2] - o[2]]);
    const tSpeed = t.bot ? Math.hypot(t.vel[0], t.vel[2]) : (t.anim === 'sprint' || t.anim === 'tac' ? 11 : t.anim === 'run' ? 6 : 1);
    let pHit = (0.62 - d * 0.009 - tSpeed * 0.018) * this.difficulty;
    pHit = Math.max(0.08, Math.min(0.85, pHit));
    const pellets = w.pellets || 1;
    let dmg = 0, head = false;
    for (let i = 0; i < pellets; i++) {
      const falloff = p.wpn === 'shotgun' ? Math.max(0.15, 1 - d / 22) : 1;
      if (Math.random() < pHit) { dmg += w.dmg * falloff; if (Math.random() < 0.12) head = true; }
    }
    const miss = dmg === 0;
    const e = miss ? [aim[0] + rnd(-1.5, 1.5), aim[1] + rnd(-0.6, 1.2), aim[2] + rnd(-1.5, 1.5)] : aim;
    const hit = raycast(this.M, o, dir, d);
    if (hit.dist !== Infinity) {
      this.event({ k: 'shot', id: p.id, o, e: [o[0] + dir[0] * hit.dist, o[1] + dir[1] * hit.dist, o[2] + dir[2] * hit.dist], wpn: p.wpn });
      return;
    }
    this.event({ k: 'shot', id: p.id, o, e, wpn: p.wpn });
    if (!miss) this.damage(t, p, dmg, p.wpn, head);
  }

  // ---------- loop ----------
  tick(dt) {
    this.clock = (this.clock || 0) + dt;
    if (this.phase !== 'play') { this.tickLobby(dt); return; }
    if (this.over) {
      this.overT -= dt;
      // fim de partida: volta todo mundo pro lobby (pronto zerado)
      if (this.overT <= 0) {
        if (this.useLobby) this.phase = 'lobby'; else this.reset();
        this.over = false;
        for (const p of this.players.values()) p.lobbyReady = false;
        this.event({ k: 'restart' }); this.lobbyT = 0;
      }
      this.snapshot(dt);
      return;
    }
    if (this.freezeT > 0) this.freezeT -= dt; else this.time -= dt;
    if (this.time <= 0) {
      this.time = 0;
      let winner = null;
      if (this.cfg.teams) winner = this.teamScore.red === this.teamScore.blue ? 'empate' : this.teamScore.red > this.teamScore.blue ? 'red' : 'blue';
      else {
        let best = null;
        for (const p of this.players.values()) if (!best || p.kills > best.kills || (this.mode === 'gungame' && p.gunLvl > best.gunLvl)) best = p;
        winner = best ? best.name : 'ninguem';
      }
      this.end(winner);
    }

    for (const p of this.players.values()) {
      // orcamento de dano: enche no ritmo da arma (barra trapaca de cliente)
      const w = WEAPONS[p.wpn];
      if (w) { const tr = bodyTrait(this.bodyOf(p, p.wpn)), dmg = w.dmg * (w.pellets || 1) * (tr.dmg || 1); p.budget = Math.min(dmg * 5, p.budget + (dmg / (w.rate * (tr.rate || 1))) * 1.6 * dt); }
      if (!p.alive) {
        p.respawnT -= dt;
        // humano: depois do minimo, renasce quando pedir (botao/toque) ou sozinho 5 s depois
        if (p.respawnT <= 0 && (p.bot || p.wantSpawn || p.respawnT <= -AUTO_SPAWN || p.deaths === 0)) { p.wantSpawn = false; this.spawn(p); }
        continue;
      }
      if (p.bot && !(this.freezeT > 0)) this.tickBot(p, dt);
      if (p.pos[1] < -20) this.kill(p, null, 'fall', false);
    }

    this.tickNades(dt);
    this.tickStreaks(dt);

    for (const k of this.pickups) {
      if (this.mode === 'gungame' && k.kind === 'wpn') continue;
      if (!k.active) { k.t -= dt; if (k.t <= 0) { k.active = true; this.event({ k: 'pickup', id: k.id, active: true }); } continue; }
      for (const p of this.players.values()) {
        if (!p.alive || dist2(p.pos, k.pos) > 1.6 * 1.6) continue;
        if (k.kind === 'hp') { if (p.hp >= (p.maxHp || 100)) continue; p.hp = Math.min(p.maxHp || 100, p.hp + 50); }
        else {
          p.owned.add(k.wpn);
          if (p.bot) { p.wpn = k.wpn; this.botReload(p, true); }
          this.event({ k: 'give', id: p.id, wpn: k.wpn });
        }
        k.active = false; k.t = k.kind === 'hp' ? 12 : 16;
        this.event({ k: 'pickup', id: k.id, active: false, by: p.id });
        break;
      }
    }

    if (this.mode === 'ctf') this.tickCTF(dt);
    if (this.mode === 'dom') this.tickDOM(dt);
    this.snapshot(dt);
  }

  tickLobby(dt) {
    const humans = [...this.players.values()].filter(p => !p.bot);
    if (this.phase === 'count') {
      if (!humans.length) this.phase = 'lobby';
      else if ((this.countT -= dt) <= 0) {
        this.phase = 'play';
        this.reset();
        // todo mundo carregando: ninguem leva dano e bot fica parado nos primeiros segundos
        this.freezeT = 3.2;
        this.event({ k: 'start' });
      }
    }
    this.lobbyT -= dt;
    if (this.lobbyT > 0) return;
    this.lobbyT = 0.25;
    this.send(null, {
      t: 'lobby', phase: this.phase, countT: Math.max(0, this.countT), mode: this.mode, map: this.M.id, host: this.hostId(),
      players: [...this.players.values()].map(p => ({ id: p.id, name: p.name, bot: p.bot, team: p.team, ready: p.bot || !!p.lobbyReady || p.id === this.hostId(), lvl: p.lvl || botLevel(p.id) })),
    });
  }

  snapshot(dt) {
    this.snapT -= dt;
    if (this.snapT > 0) return;
    this.snapT = 1 / 20;
    const players = [];
    for (const p of this.players.values()) {
      players.push({
        id: p.id, name: p.name, bot: p.bot, team: p.team, hp: Math.max(0, Math.round(p.hp)), alive: p.alive,
        pos: p.pos, yaw: p.yaw, pitch: p.pitch, anim: p.anim, wpn: p.wpn,
        kills: p.kills, deaths: p.deaths, assists: p.assists || 0, score: p.score, gunLvl: p.gunLvl, respawnT: p.respawnT,
        nades: p.nades, ready: p.ready, streak: p.streak,
      });
    }
    this.send(null, {
      t: 'snap', mode: this.mode, map: this.M.id, time: this.time, over: this.over, overT: this.overT,
      teamScore: { red: Math.floor(this.teamScore.red), blue: Math.floor(this.teamScore.blue) },
      flags: this.flags, zones: this.zones.map(z => ({ id: z.id, owner: z.owner, prog: z.prog })),
      pickups: this.pickups.map(k => k.active),
      nades: this.nades.map(n => ({ id: n.id, kind: n.kind, pos: n.pos })),
      blimps: this.blimps.map(b => ({ pos: b.pos, team: b.team, owner: b.owner })),
      uavs: this.uavs.map(u => ({ owner: u.owner, team: u.team })),
      players,
    });
  }

  info() {
    return { mode: this.mode, map: this.M.id, humans: this.humans(), players: this.players.size, time: Math.round(this.time), phase: this.phase };
  }
}

// pecas das armas vindas do cliente: so texto curto, campos conhecidos
function cleanLoadouts(los) {
  if (!los || typeof los !== 'object') return null;
  const out = {};
  for (const w of ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'melee']) {
    const l = los[w];
    if (!l || typeof l !== 'object') continue;
    const o = {};
    for (const k of ['body', 'scope', 'charger', 'handle', 'laser', 'tracer', 'paint', 'accent', 'ret', 'retColor', 'camo']) {
      const v = l[k];
      o[k] = typeof v === 'string' && v.length <= 24 && /^[#\w-]+$/.test(v) ? v : null;
    }
    out[w] = o;
  }
  return out;
}

const COUNTDOWN = 5;
const AUTO_SPAWN = 5;
// nivel do bot: fixo por id, so pra lista do lobby ter cara de gente
function botLevel(id) { let h = 2166136261; for (const c of String(id)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return 3 + (h % 50); }

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function clampA(v, m) { return Math.max(-m, Math.min(m, v)); }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
