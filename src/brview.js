// Battle royale na tela: loot no chao, caixote do dirigivel caindo e a iris (parede de pelicula queimando
// em volta da zona). Recebe a lista de loot do servidor (evento 'loot') e o estado da iris do snapshot.
import * as THREE from 'three';
import { ink, toon, PAL, wordTexture } from './toon.js';
import { buildGun, bpLoadout } from './arsenal.js';
import { milkBottle } from './world.js';

const LOOT_FAR = 90; // m: alem disso o item nao e desenhado
// material de pintura de arma e unico por modelo (paintMaterial): libera quando o item sai do mapa.
// Geometria e contorno sao compartilhados, nao mexe.
function freeMats(g) {
  g.traverse(o => { const m = o.material; if (m && !Array.isArray(m) && m.userData?.u) m.dispose(); });
}

function vest() {
  // colete: peitoral acolchoado com tiras, em tinta escura e costura clara
  const g = new THREE.Group();
  const body = ink(new THREE.BoxGeometry(0.7, 0.8, 0.28), PAL.dark, 0.035); g.add(body);
  for (const y of [-0.18, 0.12]) { const s = ink(new THREE.BoxGeometry(0.74, 0.08, 0.31), PAL.light, 0.02); s.position.y = y; g.add(s); }
  for (const x of [-0.22, 0.22]) { const st = ink(new THREE.BoxGeometry(0.12, 0.3, 0.2), PAL.dark, 0.02); st.position.set(x, 0.52, 0); g.add(st); }
  const plate = ink(new THREE.BoxGeometry(0.32, 0.24, 0.05), PAL.mid, 0.02); plate.position.set(0, 0.25, 0.16); g.add(plate);
  return g;
}
function grenade() {
  const g = new THREE.Group();
  const b = ink(new THREE.SphereGeometry(0.22, 10, 8), 0x4a5a3a, 0.03); g.add(b);
  const top = ink(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), PAL.mid, 0.02); top.position.y = 0.25; g.add(top);
  const lever = ink(new THREE.BoxGeometry(0.05, 0.28, 0.06), PAL.mid, 0.02); lever.position.set(0.12, 0.12, 0); g.add(lever);
  return g;
}
function crate(withBalloon) {
  const g = new THREE.Group();
  const box = ink(new THREE.BoxGeometry(1.3, 1.1, 1.3), PAL.wood, 0.05); box.position.y = 0.55; g.add(box);
  for (const y of [0.15, 0.95]) { const band = ink(new THREE.BoxGeometry(1.36, 0.12, 1.36), PAL.red, 0.02); band.position.y = y; g.add(band); }
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture('!', { burst: true }), transparent: true }));
  star.scale.set(1.1, 1.1, 1); star.position.y = 1.9; g.add(star);
  if (withBalloon) {
    const bal = ink(new THREE.SphereGeometry(1.1, 14, 10), PAL.red, 0.05); bal.scale.y = 1.25; bal.position.y = 4.4; g.add(bal);
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 4), toon(PAL.ink)); rope.position.set(x * 0.6, 2.4, z * 0.6); g.add(rope);
    }
  }
  return g;
}

// parede da iris: cilindro aberto, preto com rajadas de pelicula queimando na borda de baixo
function irisWall() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uT;
      float h(float n){ return fract(sin(n)*43758.5453); }
      void main(){
        float x = vUv.x * 220.0, y = vUv.y;
        // listras verticais de pelicula riscada e a borda de baixo "queimando" (laranja que tremula)
        float scratch = step(0.985, h(floor(x * 3.0) + floor(uT * 6.0)));
        float burn = smoothstep(0.16, 0.0, y + 0.04 * sin(x * 0.7 + uT * 5.0));
        vec3 col = mix(vec3(0.07, 0.06, 0.05), vec3(1.0, 0.55, 0.15), burn * 0.85) + scratch * 0.25;
        float a = mix(0.62, 0.9, burn) * smoothstep(1.0, 0.7, y);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), mat);
  m.renderOrder = 5;
  return m;
}

// plateia de desenho em volta do ringue: corpinho, cabeca com olhos de botao, bracos pra cima pulando
function fan(seed) {
  const g = new THREE.Group(), cols = [PAL.ink, PAL.dark, PAL.mid, PAL.red, PAL.blue];
  const body = ink(new THREE.CapsuleGeometry(0.32, 0.5, 4, 8), cols[seed % cols.length], 0.03); body.position.y = 0.7; g.add(body);
  const head = ink(new THREE.SphereGeometry(0.3, 10, 8), PAL.paper, 0.03); head.position.y = 1.45; g.add(head);
  for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshBasicMaterial({ color: PAL.ink })); e.position.set(x, 1.5, 0.27); g.add(e); }
  if (seed % 3 === 0) { const hat = ink(new THREE.CylinderGeometry(0.22, 0.26, 0.28, 10), PAL.ink, 0.02); hat.position.y = 1.8; g.add(hat); }
  for (const x of [-0.38, 0.38]) { const a = ink(new THREE.CapsuleGeometry(0.08, 0.45, 3, 6), cols[seed % cols.length], 0.02); a.position.set(x, 1.25, 0); a.rotation.z = x < 0 ? 0.5 : -0.5; g.add(a); }
  return g;
}

export class BrView {
  constructor(scene, M) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.fans = [];
    if (M?.ring) {
      const R = M.ring.c;
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2, r = 9.5 + (i % 2) * 2.2, f = fan(i);
        f.position.set(R[0] + Math.cos(a) * r, 0, R[2] + Math.sin(a) * r);
        f.lookAt(R[0], 0.8, R[2]); f.rotateY(Math.PI);
        this.root.add(f); this.fans.push({ f, ph: i * 0.7 });
      }
      // placa em cima: RINGUE
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture('RINGUE!', { burst: true }), transparent: true }));
      sign.scale.set(7, 7, 1); sign.position.set(R[0], 9, R[2]); this.root.add(sign);
    }
    this.items = new Map(); // id -> { g, y, kind }
    this.falling = []; // caixotes descendo
    this.wall = irisWall(); this.root.add(this.wall);
    // proxima iris: aro tracejado claro no chao
    this.next = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0xfaf8f2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    this.next.rotation.x = -Math.PI / 2; this.next.position.y = 0.08; this.root.add(this.next);
    this.zone = null; this.shown = { c: [0, 0], r: 300 };
  }
  dispose() { this.root.parent?.remove(this.root); }

  setLoot(list, loadouts) {
    const seen = new Set(), now = performance.now() / 1000;
    for (const [id, kind, wpn, x, y, z, bp, life] of list) {
      seen.add(id);
      // life = segundos que faltam pro item sumir (0 = fica); a lista so chega quando muda
      const die = life > 0 ? now + life : 0;
      if (this.items.has(id)) { this.items.get(id).die = die; continue; }
      const g = new THREE.Group();
      if (kind === 'wpn') { const gun = buildGun(wpn, bp ? bpLoadout(bp) : loadouts?.[wpn] || null); if (gun) { gun.scale.setScalar(1.6); g.add(gun); } }
      else if (kind === 'armor') g.add(vest());
      else if (kind === 'hp') g.add(milkBottle());
      else if (kind === 'nade') g.add(grenade());
      else if (kind === 'crate') g.add(crate(false));
      // disco no chao com a cor do tipo (arma clara, colete escuro, caixote vermelho)
      // variante de elite: disco dourado (da pra ver de longe que e arma especial)
      const pad = ink(new THREE.CylinderGeometry(0.75, 0.85, 0.1, 16), bp ? 0xd4a017 : kind === 'crate' ? PAL.red : kind === 'armor' ? PAL.dark : PAL.light, 0.03);
      pad.position.y = -0.84; g.add(pad);
      g.position.set(x, y + 0.9, z);
      this.root.add(g);
      this.items.set(id, { g, y: y + 0.9, kind, die });
    }
    for (const [id, it] of this.items) if (!seen.has(id)) { this.root.remove(it.g); freeMats(it.g); this.items.delete(id); }
  }

  drop(pos, fall) {
    const g = crate(true); g.position.set(pos[0], pos[1] + 40, pos[2]); this.root.add(g);
    this.falling.push({ g, pos, t: 0, fall });
  }

  setZone(z) { this.zone = z; }

  update(t, dt, cam) {
    for (const { f, ph } of this.fans) f.position.y = Math.abs(Math.sin(t * 6 + ph)) * (this.cheer > 0 ? 0.45 : 0.12);
    if (this.cheer > 0) this.cheer -= dt;
    let i = 0;
    const now = performance.now() / 1000, cx = cam?.position.x, cz = cam?.position.z;
    for (const it of this.items.values()) {
      // longe da camera nao desenha nem gira (a ilha tem centenas de itens)
      const far = cam && (it.g.position.x - cx) ** 2 + (it.g.position.z - cz) ** 2 > LOOT_FAR * LOOT_FAR;
      // ultimos 5 s: pisca avisando que vai sumir
      const left = it.die ? it.die - now : 99;
      it.g.visible = !far && (left > 5 || Math.sin(t * (left > 2 ? 10 : 22)) > -0.2);
      if (far || it.kind === 'crate') { i++; continue; }
      it.g.rotation.y = t * 1.4 + i; it.g.position.y = it.y + Math.sin(t * 3 + i) * 0.12; i++;
    }
    for (let k = this.falling.length - 1; k >= 0; k--) {
      const f = this.falling[k]; f.t += dt;
      const p = Math.min(1, f.t / f.fall);
      f.g.position.y = f.pos[1] + 40 * (1 - p);
      f.g.rotation.z = Math.sin(t * 2) * 0.08 * (1 - p);
      if (p >= 1) { this.root.remove(f.g); this.falling.splice(k, 1); }
    }
    const z = this.zone;
    this.wall.visible = this.next.visible = !!z;
    if (!z) return;
    // suaviza o raio/centro (o snapshot chega 20x/s)
    const s = this.shown, k = Math.min(1, dt * 6);
    s.c[0] += (z.c[0] - s.c[0]) * k; s.c[1] += (z.c[1] - s.c[1]) * k; s.r += (z.r - s.r) * k;
    this.wall.position.set(s.c[0], 30, s.c[1]); this.wall.scale.set(Math.max(0.5, s.r), 60, Math.max(0.5, s.r));
    this.wall.material.uniforms.uT.value = t;
    this.next.visible = !!z.to && z.state !== 'closed';
    if (z.to) { this.next.position.set(z.to.c[0], 0.08, z.to.c[1]); this.next.scale.setScalar(Math.max(0.5, z.to.r)); }
  }
}
