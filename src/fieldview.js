// Equipamento de campo na tela: molas, buracos portateis (par com redemoinho) e o guarda-chuva aberto nos
// outros jogadores. Tudo vem do snapshot (field: springs/holes; players[].sh = guarda-chuva aberto).
import * as THREE from 'three';
import { ink, toon, PAL, geo } from './toon.js';

function springMesh() {
  const g = new THREE.Group();
  const base = ink(geo(THREE.CylinderGeometry, 0.75, 0.85, 0.12, 18), PAL.dark, 0.03); base.position.y = 0.06; g.add(base);
  const coil = new THREE.Group();
  for (let i = 0; i < 5; i++) { const r = ink(geo(THREE.TorusGeometry, 0.45, 0.06, 6, 18), PAL.light, 0.02); r.rotation.x = Math.PI / 2; r.position.y = 0.18 + i * 0.12; coil.add(r); }
  g.add(coil);
  const top = ink(geo(THREE.CylinderGeometry, 0.65, 0.65, 0.1, 18), PAL.red, 0.03); top.position.y = 0.8; g.add(top);
  g.userData = { coil, top };
  return g;
}
// pecas do buraco compartilhadas por todos (03/11: cada buraco criava 6 geometrias e 6 materiais que nunca eram liberados)
let HOLE;
function holeMesh() {
  // buraco de desenho animado: disco preto achatado com borda de tinta e um redemoinho claro girando
  HOLE ||= {
    disc: new THREE.CircleGeometry(0.95, 28), rim: new THREE.RingGeometry(0.95, 1.08, 28), swirl: new THREE.RingGeometry(0.25, 0.32, 20, 1, 0, Math.PI * 1.3),
    glow: new THREE.RingGeometry(1.08, 1.34, 32), pulse: new THREE.RingGeometry(0.92, 1.0, 32), beam: new THREE.CylinderGeometry(0.34, 1.0, 3.4, 20, 1, true).translate(0, 1.7, 0),
    glowM: new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide }), pulseM: new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), beamM: new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }),
    discM: new THREE.MeshBasicMaterial({ color: 0x0b0a09 }), rimM: new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide }), swirlM: new THREE.MeshBasicMaterial({ color: PAL.paper, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
  };
  const g = new THREE.Group();
  const disc = new THREE.Mesh(HOLE.disc, HOLE.discM);
  disc.rotation.x = -Math.PI / 2; disc.scale.set(1, 0.75, 1); disc.position.y = 0.04; g.add(disc);
  const rim = new THREE.Mesh(HOLE.rim, HOLE.rimM);
  rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 0.75, 1); rim.position.y = 0.045; g.add(rim);
  const swirl = new THREE.Mesh(HOLE.swirl, HOLE.swirlM);
  swirl.rotation.x = -Math.PI / 2; swirl.position.y = 0.05; g.add(swirl);
  // 08/11 (pedido dele: o buraco preto sumia no chao): aro amarelo, onda saindo e coluna de luz pra achar de longe
  const glow = new THREE.Mesh(HOLE.glow, HOLE.glowM); glow.rotation.x = -Math.PI / 2; glow.scale.set(1, 0.75, 1); glow.position.y = 0.045; g.add(glow);
  const pulse = new THREE.Mesh(HOLE.pulse, HOLE.pulseM); pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.09; g.add(pulse);
  const beam = new THREE.Mesh(HOLE.beam, HOLE.beamM); beam.scale.set(1, 1, 0.75); g.add(beam);
  g.userData = { swirl, pulse };
  return g;
}
export function umbrellaMesh() {
  // guarda-chuva preto de bolinha clara: cupula de 8 gomos, haste e cabo em gancho
  const g = new THREE.Group();
  const dome = ink(geo(THREE.ConeGeometry, 0.75, 0.32, 8, 1, true), PAL.ink, 0.03); dome.position.y = 0.16; g.add(dome);
  const under = new THREE.Mesh(geo(THREE.ConeGeometry, 0.74, 0.3, 8, 1, true), toon(PAL.dark, { side: THREE.BackSide })); under.position.y = 0.15; g.add(under);
  for (let i = 0; i < 4; i++) { const d = ink(geo(THREE.SphereGeometry, 0.05, 6, 5), PAL.paper, 0.01); const a = i * Math.PI / 2 + 0.4; d.position.set(Math.cos(a) * 0.42, 0.13, Math.sin(a) * 0.42); g.add(d); }
  const tip = ink(geo(THREE.SphereGeometry, 0.04, 6, 5), PAL.red, 0.01); tip.position.y = 0.34; g.add(tip);
  const shaft = ink(geo(THREE.CylinderGeometry, 0.018, 0.018, 0.75, 6), PAL.dark, 0.01); shaft.position.y = -0.2; g.add(shaft);
  const hook = ink(geo(THREE.TorusGeometry, 0.07, 0.022, 6, 10, Math.PI), PAL.red, 0.01); hook.position.set(0.07, -0.58, 0); hook.rotation.z = Math.PI; g.add(hook);
  return g;
}

export class FieldView {
  constructor(scene) { this.root = new THREE.Group(); scene.add(this.root); this.springs = new Map(); this.holes = new Map(); this.umb = new Map(); this.boing = new Map(); }
  dispose() { this.root.parent?.remove(this.root); for (const u of this.umb.values()) u.parent?.remove(u); this.umb.clear(); }
  bounce(id) { this.boing.set(id, 0.5); }
  update(t, dt, snap, remotes) {
    const F = snap?.field;
    const sync = (map, list, make, place) => {
      const seen = new Set();
      for (const it of list || []) {
        seen.add(it[0]);
        let m = map.get(it[0]);
        if (!m) { m = make(); this.root.add(m); map.set(it[0], m); place(m, it); }
      }
      for (const [id, m] of map) if (!seen.has(id)) { this.root.remove(m); map.delete(id); }
    };
    sync(this.springs, F?.springs, springMesh, (m, s) => m.position.set(s[1], s[2], s[3]));
    sync(this.holes, F?.holes, () => { const g = new THREE.Group(); g.add(holeMesh()); return g; }, (m, h) => m.children[0].position.set(h[1], h[2], h[3]));
    for (const [id, m] of this.springs) {
      // mola respira e da um salto quando alguem pisa
      let b = this.boing.get(id) || 0; if (b > 0) { b -= dt; this.boing.set(id, b); }
      const s = 1 + Math.sin(t * 4) * 0.04 + (b > 0 ? Math.sin(b * 30) * b * 0.8 : 0);
      m.userData.coil.scale.y = s; m.userData.top.position.y = 0.8 * s;
    }
    for (const m of this.holes.values()) for (const h of m.children) { h.userData.swirl.rotation.z = -t * 3; const k = (t * 0.9) % 1; h.userData.pulse.scale.set(1 + k * 1.1, (1 + k * 1.1) * 0.75, 1); }
    if (HOLE && this.holes.size) { HOLE.pulseM.opacity = 1 - (t * 0.9) % 1; HOLE.beamM.opacity = 0.18 + Math.sin(t * 4) * 0.05; }
    // guarda-chuva aberto nos outros: preso na frente do personagem
    const on = new Set();
    for (const p of snap?.players || []) {
      if (!p.sh || !p.alive) continue;
      const r = remotes.get(p.id); if (!r?.char?.root) continue;
      on.add(p.id);
      let u = this.umb.get(p.id);
      if (!u) { u = umbrellaMesh(); u.scale.setScalar(1.4); u.rotation.x = -Math.PI / 2.4; u.position.set(0, 1.25, -0.55); r.char.root.add(u); this.umb.set(p.id, u); }
    }
    for (const [id, u] of this.umb) if (!on.has(id)) { u.parent?.remove(u); this.umb.delete(id); }
  }
}
