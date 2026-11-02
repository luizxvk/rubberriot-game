// Campo de treino (01/11, pedido dele): sai do Arsenal, testa qualquer arma (ate as bloqueadas) em bonecos
// parados a varias distancias, municao sem fim. Trocar arma e voltar ficam na pausa (Esc / Start / botao de pausa).
// O que for testado aqui nao salva: ao voltar, o Arsenal le os loadouts salvos e o bloqueado continua bloqueado.
import { hasLOS } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';
import { t } from './i18n.js';

const DIST = [[7, -3], [11, 3], [16, -1.5], [24, 2.5], [34, 0]]; // [frente, lado] em metros

export class Range {
  constructor(G, cat, body) {
    this.G = G; this.cat = cat; this.body = body;
    this.targets = []; this.started = false; this.hits = 0; this.dmg = 0;
    const el = this.el = document.createElement('div');
    el.className = 'range-tag'; el.setAttribute('role', 'status');
    document.body.classList.add('range');
  }
  begin() {
    if (this.started) return;
    this.started = true;
    document.body.appendChild(this.el);
    this.spawnTargets();
    this.render();
  }
  render() {
    this.el.innerHTML = `<b>${t('rangeTitle')}</b><span>${t('rangeHint')}</span>` + (this.hits ? `<small>${t('rangeHits', { n: this.hits, d: Math.round(this.dmg) })}</small>` : '');
  }
  spawnTargets() {
    const G = this.G, C = G.net?.core, P = G.player;
    if (!C || !P) return;
    C.wantBots = DIST.length; C.balanceBots();
    this.targets = [...C.players.values()].filter(o => o.bot).slice(0, DIST.length).map(o => o.id);
    const eye = [P.pos[0], P.pos[1] + 1.6, P.pos[2]];
    let best = null;
    // direcao com chao plano e vista livre ate o boneco mais longe; se nenhuma serve, a melhor parcial
    for (let k = 0; k < 24 && !best; k++) {
      const yaw = P.yaw + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 12);
      const spots = this.spotsAt(P, yaw);
      if (spots.every(([x, z]) => standable(G.M, x, z) && Math.abs(floorAt(G.M, x, z) - P.pos[1]) < 1.2 && hasLOS(G.M, eye, [x, floorAt(G.M, x, z) + 1.2, z]))) best = { yaw, spots };
    }
    if (!best) best = { yaw: P.yaw, spots: this.spotsAt(P, P.yaw) };
    this.spots = best.spots;
    P.yaw = best.yaw;
    this.targets.forEach((id, n) => this.place(id, n));
  }
  spotsAt(P, yaw) {
    const f = [-Math.sin(yaw), -Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
    return DIST.map(([d, s]) => [P.pos[0] + f[0] * d + r[0] * s, P.pos[2] + f[1] * d + r[1] * s]);
  }
  place(id, n) {
    const C = this.G.net?.core, o = C?.players.get(id), s = this.spots?.[n];
    if (!o || !s) return;
    const P = this.G.player;
    o.name = `${t('rangeDummy')} ${DIST[n][0]} m`;
    o.pos = [s[0], floorAt(this.G.M, s[0], s[1]), s[1]]; o.vel = [0, 0, 0];
    o.yaw = P ? Math.atan2(o.pos[0] - P.pos[0], o.pos[2] - P.pos[2]) : 0;
    o.ai.think = 1e9; o.ai.target = null; o.ai.goal = null; o.ai.path = null; o.field = null; o.ready = [];
  }
  onEvent(e) {
    if (e.k === 'spawn' && this.targets.includes(e.id)) setTimeout(() => this.place(e.id, this.targets.indexOf(e.id)), 0);
    if (e.k === 'hurt' && e.a === this.G.myId && this.targets.includes(e.v)) { this.hits++; this.dmg += e.dmg || 0; this.render(); }
  }
  update() {
    if (!this.started) return;
    const C = this.G.net?.core, P = this.G.player;
    if (C && (this.targets.length < DIST.length || this.targets.some(id => !C.players.has(id)))) this.spawnTargets();
    // municao sem fim: a reserva nunca acaba (o pente ainda precisa recarregar, pra testar a recarga)
    if (P) for (const id of P.owned) { const a = P.ammo[id]; if (a && Number.isFinite(a.reserve) && a.reserve < 999) a.reserve = 999; }
  }
  dispose() { this.el.remove(); document.body.classList.remove('range'); }
}
