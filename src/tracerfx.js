// Tracados com efeito 3D (09/11, pedido dele): cada tipo solta pedacinhos 3D proprios pelo caminho do tiro, com brilho em volta do risco.
// Um desenho so pra todas as particulas (InstancedMesh, 1 chamada de GPU), em anel: bala nova reaproveita a mais velha.
import * as THREE from 'three';

const MAX = 240, LITE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches; // celular: metade das particulas
// plasma: skins do Futuristic Weapon Pack sempre atiram plasma
export const tracerOf = (lo) => (['pulse', 'fiction'].includes(lo?.ws) ? 'plasma' : lo?.tracer || 'chalk');
export const TRACER_GLOW = { fire: 0xff7a1a, spark: 0x7fd8ff, rainbow: 0xff5ad0, void: 0x7a3cff, toxic: 0x8ae02a, gold: 0xffc23a, ice: 0x8fd3f0, plasma: 0x35e0ff };
// n por bala; g = gravidade (negativa sobe); s = tamanho; v = velocidade sorteada; up = impulso pra cima; pull = puxa de volta pra linha do tiro
const TH = {
  chalk: { c: [0xf4f0e6, 0xd8d2c4], n: 1, s: 0.03, life: 0.32, g: 1.4, v: 0.25, up: 0 },
  fire: { c: [0xffd23a, 0xff7a1a, 0xc8321a], n: 4, s: 0.05, life: 0.42, g: -1.6, v: 0.35, up: 0.6 },
  ink: { c: [0x141210, 0x2a2724], n: 3, s: 0.06, life: 0.48, g: 6.5, v: 0.3, up: 0.3 },
  spark: { c: [0xffffff, 0x9fe8ff], n: 4, s: 0.022, life: 0.2, g: 3, v: 3.4, up: 0.4 },
  rainbow: { hue: 1, n: 5, s: 0.04, life: 0.4, g: 0.8, v: 0.5, up: 0.2 },
  void: { c: [0x2a1450, 0x7a3cff, 0x141210], n: 4, s: 0.05, life: 0.36, g: 0, v: 1.3, up: 0, pull: 1 },
  toxic: { c: [0x9aff3a, 0x4ec21a], n: 4, s: 0.06, life: 0.55, g: -0.9, v: 0.2, up: 0.3 },
  gold: { c: [0xffe08a, 0xffc23a, 0xffffff], n: 4, s: 0.028, life: 0.5, g: 1.1, v: 0.4, up: 0.3 },
  ice: { c: [0xe6f8ff, 0x8fd3f0], n: 3, s: 0.05, life: 0.46, g: 5, v: 0.35, up: 0.3 },
  plasma: { c: [0xbffcff, 0x35e0ff, 0x1a8aff], n: 4, s: 0.04, life: 0.3, g: 0, v: 0.5, up: 0, pull: 1 },
};
const COL = new THREE.Color(), DUM = new THREE.Object3D();

export class TracerFx {
  constructor(scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false; this.mesh.visible = false; this.mesh.renderOrder = 3;
    this.mesh.setColorAt(0, COL.set(0xffffff));
    scene.add(this.mesh);
    this.p = Array.from({ length: MAX }, () => ({ t: 0, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, s: 0, ax: 0, ay: 0, az: 0, pull: 0, r: 0 }));
    this.i = 0; this.on = 0;
  }
  emit(style, a, b) {
    const T = TH[style]; if (!T) return;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 2) return;
    const n = LITE ? Math.ceil(T.n / 2) : T.n, R = Math.random;
    for (let k = 0; k < n; k++) {
      const P = this.p[this.i], id = this.i; this.i = (this.i + 1) % MAX;
      const u = (1.4 + R() * (len - 1.4)) / len; // perto da boca nao: nao atrapalha a mira de quem atira
      P.x = P.ax = a.x + dx * u; P.y = P.ay = a.y + dy * u; P.z = P.az = a.z + dz * u;
      P.vx = (R() - 0.5) * T.v * 2; P.vy = (R() - 0.5) * T.v * 2 + T.up; P.vz = (R() - 0.5) * T.v * 2;
      if (T.pull) { P.x += P.vx * 0.3; P.y += P.vy * 0.3; P.z += P.vz * 0.3; }
      P.t = 0; P.life = T.life * (0.7 + R() * 0.6); P.g = T.g; P.s = T.s * (0.7 + R() * 0.7); P.pull = T.pull || 0; P.r = R() * 6.28;
      if (P.life > 0) { if (T.hue) COL.setHSL(R(), 0.9, 0.6); else COL.setHex(T.c[Math.floor(R() * T.c.length)]); this.mesh.setColorAt(id, COL); }
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.on = T.life * 1.4; this.mesh.visible = true;
  }
  update(dt) {
    if (this.on <= 0) { if (this.mesh.visible) this.mesh.visible = false; return; }
    this.on -= dt;
    for (let i = 0; i < MAX; i++) {
      const P = this.p[i];
      if (P.t >= P.life) { if (P.life > 0) { P.life = 0; DUM.scale.setScalar(0); DUM.position.set(0, -999, 0); DUM.updateMatrix(); this.mesh.setMatrixAt(i, DUM.matrix); } continue; }
      P.t += dt; const k = P.t / P.life;
      if (P.pull) { P.x += (P.ax - P.x) * dt * 7; P.y += (P.ay - P.y) * dt * 7; P.z += (P.az - P.z) * dt * 7; } else { P.vy -= P.g * dt; P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt; }
      DUM.position.set(P.x, P.y, P.z); DUM.rotation.set(P.r + k * 7, P.r * 2 + k * 5, 0); DUM.scale.setScalar(Math.max(0.0001, P.s * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8))); DUM.updateMatrix(); this.mesh.setMatrixAt(i, DUM.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
