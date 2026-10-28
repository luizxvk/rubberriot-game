// Modelos das armas. Cada arma procura public/models/armas/<id>.glb; se existir,
// substitui o placeholder procedural (convertido pra toon + contorno).
// Nos opcionais no .glb: "muzzle" (boca do cano), "grip_r" (mao direita), "grip_l" (mao esquerda).
// Orientacao esperada: cano apontando pra -Z, 1 unidade = 1 metro.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ink, toon, outline, PAL } from './toon.js';

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// cilindros sempre fechados (casco do contorno precisa de malha fechada)
const C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);

function at(m, x, y, z, rx = 0, ry = 0, rz = 0) { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); return m; }
function barrel(len, r, flare = 1.4) {
  const g = new THREE.Group();
  g.add(at(ink(C(r, r, len), PAL.dark, 0.012), 0, 0, -len / 2, Math.PI / 2));
  g.add(at(ink(C(r * flare, r * 1.05, r * 2.2), PAL.mid, 0.012), 0, 0, -len, Math.PI / 2));
  return g;
}

const BUILD = {
  pistol() {
    const g = new THREE.Group();
    g.add(at(ink(B(0.07, 0.09, 0.26), PAL.dark, 0.012), 0, 0.03, -0.05));
    g.add(at(barrel(0.2, 0.022, 1.6), 0, 0.045, -0.15));
    g.add(at(ink(B(0.06, 0.15, 0.07), PAL.wood, 0.012), 0, -0.07, 0.04, 0.25));
    g.add(at(ink(new THREE.TorusGeometry(0.035, 0.008, 6, 12, Math.PI), PAL.dark, 0.006), 0, -0.02, -0.03, 0, Math.PI / 2, Math.PI));
    g.add(at(ink(B(0.074, 0.02, 0.2), PAL.light, 0), 0, 0.06, -0.06));
    return g;
  },
  smg() {
    const g = new THREE.Group();
    g.add(at(ink(B(0.08, 0.1, 0.42), PAL.dark, 0.012), 0, 0.03, -0.1));
    g.add(at(barrel(0.26, 0.025, 1.5), 0, 0.04, -0.3));
    g.add(at(ink(C(0.09, 0.09, 0.06, 18), PAL.mid, 0.012), 0, -0.07, -0.08, 0, 0, Math.PI / 2)); // tambor
    g.add(at(ink(B(0.05, 0.13, 0.05), PAL.wood, 0.012), 0, -0.07, 0.08, 0.3));
    g.add(at(ink(B(0.045, 0.12, 0.045), PAL.wood, 0.012), 0, -0.06, -0.26, -0.15)); // empunhadura da frente
    g.add(at(ink(B(0.06, 0.08, 0.22), PAL.wood, 0.012), 0, 0.0, 0.2, -0.1));
    return g;
  },
  rifle() {
    const g = new THREE.Group();
    g.add(at(ink(B(0.07, 0.09, 0.6), PAL.wood, 0.012), 0, 0.02, -0.12));
    g.add(at(ink(B(0.074, 0.07, 0.3), PAL.dark, 0.012), 0, 0.06, -0.05));
    g.add(at(barrel(0.42, 0.02, 1.4), 0, 0.06, -0.38));
    g.add(at(ink(B(0.06, 0.1, 0.06), PAL.dark, 0.01), 0, -0.07, -0.08));
    g.add(at(ink(B(0.065, 0.13, 0.26), PAL.wood, 0.012), 0, -0.02, 0.28, -0.12));
    g.add(at(ink(new THREE.SphereGeometry(0.025, 8, 6), PAL.light, 0.008), 0.05, 0.08, 0.02));
    return g;
  },
  shotgun() {
    const g = new THREE.Group();
    g.add(at(ink(B(0.08, 0.1, 0.4), PAL.wood, 0.012), 0, 0.01, -0.05));
    g.add(at(ink(C(0.028, 0.03, 0.45, 12), PAL.dark, 0.012), 0, 0.06, -0.42, Math.PI / 2));
    g.add(at(ink(C(0.11, 0.035, 0.22, 16, 1, true), PAL.mid, 0.015), 0, 0.06, -0.72, Math.PI / 2)); // boca de trombone
    g.add(at(ink(B(0.075, 0.15, 0.3), PAL.wood, 0.012), 0, -0.03, 0.28, -0.25));
    g.add(at(ink(B(0.06, 0.07, 0.16), PAL.mid, 0.01), 0, -0.02, -0.32));
    return g;
  },
  minigun() {
    const g = new THREE.Group();
    g.add(at(ink(C(0.09, 0.09, 0.3, 14), PAL.dark, 0.014), 0, 0, 0.0, Math.PI / 2));
    const spin = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spin.add(at(ink(C(0.018, 0.018, 0.55, 8), PAL.mid, 0.008), Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.28, Math.PI / 2));
    }
    spin.add(at(ink(C(0.085, 0.085, 0.03, 14), PAL.light, 0.01), 0, 0, -0.5, Math.PI / 2));
    spin.position.z = -0.12;
    g.add(spin);
    g.userData.spin = spin;
    g.add(at(ink(B(0.03, 0.14, 0.03), PAL.light, 0.008), 0.11, 0.02, 0.05)); // manivela
    g.add(at(ink(B(0.05, 0.14, 0.05), PAL.wood, 0.01), 0, -0.12, 0.08, 0.2));
    g.add(at(ink(B(0.14, 0.1, 0.12), PAL.wood, 0.01), -0.12, -0.04, 0.05));
    return g;
  },
  sniper() {
    const g = new THREE.Group();
    g.add(at(ink(B(0.07, 0.09, 0.62), PAL.wood, 0.012), 0, 0.0, -0.08));
    g.add(at(barrel(0.6, 0.018, 1.3), 0, 0.04, -0.38));
    g.add(at(ink(C(0.035, 0.035, 0.34, 12), PAL.dark, 0.012), 0, 0.12, -0.08, Math.PI / 2)); // luneta
    g.add(at(ink(C(0.05, 0.035, 0.06, 12), PAL.dark, 0.01), 0, 0.12, -0.27, Math.PI / 2));
    g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), toon(PAL.white)), 0, 0.12, -0.301, 0, Math.PI));
    g.add(at(ink(B(0.065, 0.14, 0.3), PAL.wood, 0.012), 0, -0.04, 0.32, -0.15));
    return g;
  },
};

// onde as maos seguram (espaco da arma) e onde sai o tiro
const RIG = {
  pistol: { muzzle: [0, 0.045, -0.36], gripR: [0, -0.05, 0.04], gripL: [-0.01, -0.07, 0.01] },
  smg: { muzzle: [0, 0.04, -0.58], gripR: [0, -0.05, 0.08], gripL: [0, -0.1, -0.26] },
  rifle: { muzzle: [0, 0.06, -0.82], gripR: [0, -0.06, -0.08], gripL: [0, -0.02, -0.34] },
  shotgun: { muzzle: [0, 0.06, -0.84], gripR: [0, -0.05, 0.15], gripL: [0, -0.04, -0.32] },
  minigun: { muzzle: [0, 0, -0.65], gripR: [0, -0.12, 0.08], gripL: [-0.12, 0.0, 0.05] },
  sniper: { muzzle: [0, 0.04, -0.98], gripR: [0, -0.06, 0.1], gripL: [0, -0.02, -0.3] },
};

const loader = new GLTFLoader();
// so busca .glb avulso pras armas listadas aqui (as outras vem do arsenal modular)
const OVERRIDE = new Set([]);
const glb = {}; // id -> Promise<Object3D|null>
function loadGlb(id) {
  if (!(id in glb)) {
    glb[id] = loader.loadAsync(`./models/armas/${id}.glb`).then(g => {
      const root = g.scene;
      root.traverse(o => {
        if (!o.isMesh) return;
        const src = o.material;
        o.material = toon(src.color ? src.color.getHex() : PAL.mid, { map: src.map || null, unique: !!src.map });
        outline(o, 0.012);
      });
      return root;
    }).catch(() => null);
  }
  return glb[id];
}

// Devolve um grupo com userData { muzzle, gripR, gripL, spin } que troca sozinho pelo .glb quando ele carregar
export function makeGun(id) {
  const holder = new THREE.Group();
  const body = BUILD[id] ? BUILD[id]() : BUILD.pistol();
  holder.add(body);
  const rig = RIG[id] || RIG.pistol;
  const muzzle = new THREE.Object3D(); muzzle.position.fromArray(rig.muzzle); holder.add(muzzle);
  const gripR = new THREE.Object3D(); gripR.position.fromArray(rig.gripR); holder.add(gripR);
  const gripL = new THREE.Object3D(); gripL.position.fromArray(rig.gripL); holder.add(gripL);
  holder.userData = { id, muzzle, gripR, gripL, spin: body.userData.spin || null };
  if (OVERRIDE.has(id)) loadGlb(id).then(src => {
    if (!src) return;
    const m = src.clone(true);
    holder.remove(body);
    holder.add(m);
    holder.userData.spin = m.getObjectByName('spin') || null;
    for (const [node, key] of [['muzzle', 'muzzle'], ['grip_r', 'gripR'], ['grip_l', 'gripL']]) {
      const n = m.getObjectByName(node);
      if (n) { n.updateWorldMatrix(true, false); holder.userData[key].position.copy(holder.worldToLocal(n.getWorldPosition(new THREE.Vector3()))); }
    }
  });
  return holder;
}
