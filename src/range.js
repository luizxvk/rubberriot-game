// Campo de treino (01/11, pedido dele): sai do Arsenal, testa qualquer arma (ate as bloqueadas) em bonecos
// parados a varias distancias, municao sem fim. Trocar arma e voltar ficam na pausa (Esc / Start / botao de pausa).
// O que for testado aqui nao salva: ao voltar, o Arsenal le os loadouts salvos e o bloqueado continua bloqueado.
// 14/11 (pedido dele: campo de tiro proprio, no jeito do COD): no Estande Gargalhada (shared/map.js estande) os alvos ficam nas
// raias, um por raia a 10/20/30/45/60 m, mais dois ANDANDO de parede a parede (15 e 35 m); cada placa de distancia ganha o numero
// e o cartao mostra o ultimo acerto. Alvo derrubado volta em 0,8 s. Outro mapa (nao deve acontecer): o jeito antigo.
import * as THREE from 'three';
import { hasLOS, RANGE_MAP, RANGE_LINE, RANGE_DIST } from '../shared/map.js';
import { standable, floorAt } from '../shared/nav.js';
import { t } from './i18n.js';

const DIST = [[7, -3], [11, 3], [16, -1.5], [24, 2.5], [34, 0]]; // [frente, lado] em metros (mapa qualquer)
// estande: [distancia do balcao, x da raia] parados e [distancia, meia largura do passeio, velocidade m/s] andando
const LANE_X = [-10.5, -3.5, 3.5, 10.5];
const STAND = [[10, LANE_X[0]], [20, LANE_X[1]], [30, LANE_X[2]], [45, LANE_X[3]], [60, 0]];
const WALK = [[15, 11.5, 2.4], [35, 11.5, 3.4]];
const BACK_T = 0.8; // alvo derrubado volta rapido (no COD o alvo levanta na hora)

export class Range {
  constructor(G, cat, body) {
    this.G = G; this.cat = cat; this.body = body;
    this.targets = []; this.started = false; this.hits = 0; this.dmg = 0; this.last = null; this.t = 0;
    const el = this.el = document.createElement('div');
    el.className = 'range-tag'; el.setAttribute('role', 'status');
    document.body.classList.add('range');
  }
  get stand() { return this.G.M?.id === RANGE_MAP; }
  get slots() { return this.stand ? STAND.length + WALK.length : DIST.length; }
  begin() {
    if (this.started) return;
    this.started = true;
    document.body.appendChild(this.el);
    if (this.stand) this.signs();
    this.spawnTargets();
    this.render();
  }
  render() {
    const L = this.last;
    this.el.innerHTML = `<b>${t('rangeTitle')}</b><span>${t('rangeHint')}</span>`
      + (this.hits ? `<small>${t('rangeHits', { n: this.hits, d: Math.round(this.dmg) })}</small>` : '')
      + (L ? `<small class="rg-last">${t(L.head ? 'rangeLastHead' : 'rangeLast', { h: Math.round(L.dmg), d: L.dist })}</small>` : '');
  }
  // numero de cada placa de distancia (o quadro claro vem do modelo do Blender, mapa.py distpost): papel com tinta, fonte do jogo
  signs() {
    const sc = this.scene; if (!sc) return;
    this.signGroup = new THREE.Group(); sc.add(this.signGroup);
    for (const d of RANGE_DIST) {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 200; const g = cv.getContext('2d');
      g.fillStyle = '#141210'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 112px "Bowlby One", Grandstander, sans-serif'; g.fillText(String(d), 128, 92);
      g.font = '800 40px Grandstander, sans-serif'; g.fillText('m', 128, 168);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      const mat = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, toneMapped: false });
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.6), mat); m.position.set(s * 13.65, 2.2, RANGE_LINE - d + 0.15 + 0.085); m.userData.noFx = true; this.signGroup.add(m); }
    }
  }
  spawnTargets() {
    const G = this.G, C = G.net?.core, P = G.player;
    if (!C || !P) return;
    C.wantBots = this.slots; C.balanceBots();
    this.targets = [...C.players.values()].filter(o => o.bot).slice(0, this.slots).map(o => o.id);
    if (this.stand) {
      this.spots = STAND.map(([d, x]) => [x, RANGE_LINE - d]).concat(WALK.map(([d]) => [0, RANGE_LINE - d]));
      if (!this.aimed) { P.yaw = 0; this.aimed = true; } // de frente pras raias (-z) so na 1a vez
    } else {
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
    }
    this.targets.forEach((id, n) => this.place(id, n));
  }
  spotsAt(P, yaw) {
    const f = [-Math.sin(yaw), -Math.cos(yaw)], r = [Math.cos(yaw), -Math.sin(yaw)];
    return DIST.map(([d, s]) => [P.pos[0] + f[0] * d + r[0] * s, P.pos[2] + f[1] * d + r[1] * s]);
  }
  label(n) {
    if (!this.stand) return `${t('rangeDummy')} ${DIST[n][0]} m`;
    return n < STAND.length ? `${t('rangeDummy')} ${STAND[n][0]} m` : `${t('rangeMoving')} ${WALK[n - STAND.length][0]} m`;
  }
  place(id, n) {
    const C = this.G.net?.core, o = C?.players.get(id), s = this.spots?.[n];
    if (!o || !s) return;
    const P = this.G.player;
    o.name = this.label(n);
    o.pos = [s[0], floorAt(this.G.M, s[0], s[1]), s[1]]; o.vel = [0, 0, 0];
    o.yaw = P ? Math.atan2(o.pos[0] - P.pos[0], o.pos[2] - P.pos[2]) : 0;
    o.ai.think = 1e9; o.ai.target = null; o.ai.goal = null; o.ai.path = null; o.field = null; o.ready = [];
  }
  onEvent(e) {
    if (e.k === 'spawn' && this.targets.includes(e.id)) setTimeout(() => this.place(e.id, this.targets.indexOf(e.id)), 0);
    if (e.k === 'hurt' && e.a === this.G.myId && this.targets.includes(e.v)) {
      this.hits++; this.dmg += e.dmg || 0;
      const o = this.G.net?.core?.players.get(e.v), P = this.G.player;
      this.last = { dmg: e.dmg || 0, head: !!e.head, dist: o && P ? Math.round(Math.hypot(o.pos[0] - P.pos[0], o.pos[2] - P.pos[2])) : 0 };
      this.render();
    }
    if (e.k === 'kill' && this.stand && this.targets.includes(e.v)) setTimeout(() => { const o = this.G.net?.core?.players.get(e.v); if (o && !o.alive) o.respawnT = Math.min(o.respawnT ?? BACK_T, BACK_T); }, 0);
  }
  update(dt = 1 / 60) {
    if (!this.started) return;
    const C = this.G.net?.core, P = this.G.player;
    if (C && (this.targets.length < this.slots || this.targets.some(id => !C.players.has(id)))) this.spawnTargets();
    // estande: os dois de passeio andam de parede a parede (vai e volta); a velocidade vai no vel pra animar as pernas
    if (this.stand && C) {
      this.t += dt;
      WALK.forEach(([d, half, v], i) => {
        const o = C.players.get(this.targets[STAND.length + i]); if (!o || !o.alive) return;
        const w = v / half, ph = i * 1.7, x = Math.sin(this.t * w + ph) * half, vx = Math.cos(this.t * w + ph) * v;
        o.pos = [x, 0, RANGE_LINE - d]; o.vel = [vx, 0, 0];
        o.yaw = P ? Math.atan2(o.pos[0] - P.pos[0], o.pos[2] - P.pos[2]) : 0;
      });
    }
    // municao sem fim: a reserva nunca acaba (o pente ainda precisa recarregar, pra testar a recarga)
    if (P) for (const id of P.owned) { const a = P.ammo[id]; if (a && Number.isFinite(a.reserve) && a.reserve < 999) a.reserve = 999; }
  }
  dispose() {
    this.el.remove(); document.body.classList.remove('range');
    if (this.signGroup) { this.signGroup.removeFromParent(); this.signGroup.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
  }
}
