// Borrao: personagem rubber hose original. Membros sao mangueiras (tubo curvo
// recalculado por frame), luvas brancas, olhos de fatia de torta.
import * as THREE from 'three';
import { ink, toon, PAL, wordTexture } from './toon.js';
import { buildGun } from './arsenal.js';

const SEG = 10, RAD = 6;

// Tubo bezier quadratico: start -> ctrl -> end. Atualiza vertices na mao.
export class Hose {
  constructor(radius, color, outlineTh = 0.035) {
    this.r = radius;
    const count = (SEG + 1) * RAD;
    const pos = new Float32Array(count * 3);
    const idx = [];
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = (i + 1) * RAD + j, d = (i + 1) * RAD + (j + 1) % RAD;
      idx.push(a, c, b, b, c, d);
    }
    const mk = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
      g.setIndex(idx);
      return g;
    };
    this.mesh = new THREE.Mesh(mk(), toon(color));
    this.line = new THREE.Mesh(mk(), new THREE.MeshBasicMaterial({ color: 0x110f0d, side: THREE.BackSide }));
    this.outTh = outlineTh;
    this.mesh.frustumCulled = this.line.frustumCulled = false;
    this.mesh.add(this.line);
  }

  set(a, c, b) {
    const P = this.mesh.geometry.attributes.position.array, N = this.mesh.geometry.attributes.normal.array;
    const PO = this.line.geometry.attributes.position.array;
    const p = new THREE.Vector3(), t = new THREE.Vector3(), n = new THREE.Vector3(), bn = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG, iu = 1 - u;
      p.set(iu * iu * a.x + 2 * iu * u * c.x + u * u * b.x, iu * iu * a.y + 2 * iu * u * c.y + u * u * b.y, iu * iu * a.z + 2 * iu * u * c.z + u * u * b.z);
      t.set(2 * iu * (c.x - a.x) + 2 * u * (b.x - c.x), 2 * iu * (c.y - a.y) + 2 * u * (b.y - c.y), 2 * iu * (c.z - a.z) + 2 * u * (b.z - c.z)).normalize();
      n.crossVectors(t, Math.abs(t.z) > 0.9 ? new THREE.Vector3(1, 0, 0) : up).normalize();
      bn.crossVectors(t, n);
      // mangueira afina um tiquinho no meio (cara de borracha)
      const r = this.r * (1 - Math.sin(u * Math.PI) * 0.12);
      for (let j = 0; j < RAD; j++) {
        const ang = (j / RAD) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
        const k = (i * RAD + j) * 3;
        const nx = n.x * cs + bn.x * sn, ny = n.y * cs + bn.y * sn, nz = n.z * cs + bn.z * sn;
        P[k] = p.x + nx * r; P[k + 1] = p.y + ny * r; P[k + 2] = p.z + nz * r;
        N[k] = nx; N[k + 1] = ny; N[k + 2] = nz;
        const ro = r + this.outTh;
        PO[k] = p.x + nx * ro; PO[k + 1] = p.y + ny * ro; PO[k + 2] = p.z + nz * ro;
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.normal.needsUpdate = true;
    this.line.geometry.attributes.position.needsUpdate = true;
  }
}

function eyeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#faf8f2';
  g.beginPath(); g.ellipse(128, 64, 120, 60, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#141210';
  for (const x of [80, 176]) {
    g.beginPath(); g.ellipse(x, 66, 26, 44, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#faf8f2';
    g.beginPath(); g.moveTo(x + 4, 52); g.lineTo(x + 18, 30); g.lineTo(x + 22, 52); g.fill();
    g.fillStyle = '#141210';
  }
  // boca sorrindo
  g.lineWidth = 8; g.strokeStyle = '#141210';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let EYE = null;

// a partir daqui (m) o boneco perde os detalhes pequenos
const LOD_FAR = 18;

export class Character {
  constructor(team, name) {
    EYE ||= eyeTexture();
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // tudo que faz squash
    this.root.add(this.body);
    const teamCol = team === 'red' ? PAL.red : team === 'blue' ? PAL.blue : PAL.mid;

    const torso = ink(new THREE.SphereGeometry(0.42, 16, 12), PAL.ink, 0.03);
    torso.scale.set(1, 1.15, 0.9); torso.position.y = 1.05;
    this.body.add(torso);
    const shorts = ink(new THREE.SphereGeometry(0.44, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), teamCol, 0.03);
    shorts.scale.set(1, 1.15, 0.92); shorts.position.y = 1.05;
    this.body.add(shorts);
    for (const s of [-1, 1]) {
      const btn = ink(new THREE.SphereGeometry(0.06, 8, 6), PAL.white, 0.015);
      btn.position.set(s * 0.15, 0.82, -0.36); btn.userData.detail = true;
      this.body.add(btn);
    }
    this.head = new THREE.Group();
    this.head.position.y = 1.62;
    this.body.add(this.head);
    const skull = ink(new THREE.SphereGeometry(0.36, 18, 14), PAL.ink, 0.03);
    this.head.add(skull);
    const mask = ink(new THREE.SphereGeometry(0.3, 16, 12), 0xf0ebe0, 0.015);
    mask.position.set(0, -0.06, -0.14); mask.scale.set(1.05, 0.85, 0.8);
    this.head.add(mask);
    const eyes = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: EYE, transparent: true }));
    eyes.position.set(0, 0.04, -0.37); eyes.rotation.y = Math.PI;
    this.head.add(eyes);
    const nose = ink(new THREE.SphereGeometry(0.075, 10, 8), PAL.ink, 0.012);
    nose.position.set(0, -0.08, -0.38); nose.scale.set(1.3, 1, 1); nose.userData.detail = true;
    this.head.add(nose);
    const mouth = ink(new THREE.TorusGeometry(0.11, 0.022, 6, 12, Math.PI), PAL.ink, 0);
    mouth.position.set(0, -0.17, -0.33); mouth.rotation.set(0, 0, Math.PI); mouth.userData.detail = true;
    this.head.add(mouth);
    // topete de tinta enrolado (nada de orelha de rato)
    const curl = [];
    for (let i = 0; i <= 10; i++) { const a = i * 0.55; curl.push(new THREE.Vector3(Math.cos(a) * 0.12 * (1 - i / 14), 0.3 + i * 0.03, Math.sin(a) * 0.12 * (1 - i / 14) + 0.05)); }
    const curlM = ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curl), 20, 0.045, 6), PAL.ink, 0.015); curlM.userData.detail = true;
    this.head.add(curlM);
    // chapeu-coco com a fita do time
    const hat = ink(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 14), PAL.ink, 0.02);
    hat.position.set(0.1, 0.36, 0.05); hat.rotation.z = -0.35;
    const brim = ink(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), PAL.ink, 0.02);
    brim.position.y = -0.09; hat.add(brim);
    const band = ink(new THREE.CylinderGeometry(0.245, 0.245, 0.06, 14), teamCol, 0);
    band.position.y = -0.04; band.userData.detail = true; hat.add(band);
    this.head.add(hat);

    this.armR = new Hose(0.065, PAL.ink); this.armL = new Hose(0.065, PAL.ink);
    this.legR = new Hose(0.075, PAL.ink); this.legL = new Hose(0.075, PAL.ink);
    for (const h of [this.armR, this.armL, this.legR, this.legL]) this.body.add(h.mesh);
    const glove = () => {
      const g = ink(new THREE.SphereGeometry(0.12, 12, 10), PAL.white, 0.025);
      const cuff = ink(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 10), PAL.white, 0.02);
      cuff.position.y = 0.12; cuff.userData.detail = true; g.add(cuff);
      return g;
    };
    this.handR = glove(); this.handL = glove();
    this.body.add(this.handR, this.handL);
    const shoe = () => { const s = ink(new THREE.SphereGeometry(0.17, 12, 10), 0x4a4540, 0.03); s.scale.set(1, 0.6, 1.6); return s; };
    this.shoeR = shoe(); this.shoeL = shoe();
    this.body.add(this.shoeR, this.shoeL);

    this.gunHolder = new THREE.Group();
    this.body.add(this.gunHolder);
    this.wpn = null;

    // sombra de bolha
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02;
    this.root.add(sh);
    this.shadow = sh;

    // nome
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(name, { burst: false, size: 256, fill: team === 'red' ? '#e0a49a' : team === 'blue' ? '#a8c0dc' : '#faf8f2' }), transparent: true, depthTest: false }));
    this.tag.scale.set(1.5, 1.5, 1); this.tag.position.y = 2.55; this.tag.renderOrder = 5;
    this.root.add(this.tag);

    this.phase = Math.random() * 10;
    this.deadT = 0;
    // detalhe que de longe nem aparece (botao, nariz, boca, topete, fita, punho): some a partir de LOD_FAR
    this.details = []; this.body.traverse(o => { if (o.userData.detail) this.details.push(o); });
    this.far = false;
    this.v = new THREE.Vector3();
  }

  setWeapon(id, lo = null) {
    this.wpn = id;
    this.gunHolder.clear();
    this.gun = buildGun(id, lo);
    this.gunHolder.add(this.gun);
    // pecas da arma (mira, pente, punho, laser) e os contornos dela: de longe so o corpo da arma
    this.gunDetails = [];
    let body = null, big = 0;
    this.gun.traverse(o => { if (o.isMesh && !o.material?.isShaderMaterial) { o.geometry.computeBoundingSphere?.(); const r = o.geometry.boundingSphere?.radius || 0; if (r > big) { big = r; body = o; } } });
    this.gun.traverse(o => { if (o.isMesh && o !== body && o.parent !== body && !o.userData.noFx && !o.material?.transparent && (o.material?.blending ?? 1) === 1) this.gunDetails.push(o); });
    if (this.far) for (const o of this.gunDetails) o.visible = false;
  }

  // nivel de detalhe pela distancia da camera: 16 bonecos x 48 malhas pesavam no celular
  lod(dist) {
    const far = dist > LOD_FAR;
    if (far === this.far) return;
    this.far = far;
    for (const o of this.details) o.visible = !far;
    for (const o of this.gunDetails || []) o.visible = !far;
  }

  // tranco de quem leva tiro: inclina pra tras e amassa (cabeca = mais forte)
  flinch(head) { this.hitT = head ? 0.26 : 0.18; this.hitHead = head; }

  update(dt, s) {
    const { anim, pitch = 0, alive, speed = 0, t } = s;
    // laser dos outros: o feixe longo aparece (e entrega a posicao), correndo desliga
    const lz = this.gun?.userData.laser;
    if (lz) lz.beam.material.uniforms.uOn.value = alive && anim !== 'sprint' && anim !== 'tac' ? 1 : 0;
    this.phase += dt * (anim === 'tac' ? 15 : anim === 'sprint' ? 12.5 : 10) * Math.min(1, speed / 6 + 0.15);
    const ph = this.phase;
    const moving = speed > 0.8 && anim !== 'jump' && anim !== 'slide';
    const crouch = anim === 'crouch' || anim === 'slide' ? 0.45 : 0;

    if (!alive) {
      // panqueca: achata e gira, depois some numa nuvem (o FX faz a nuvem)
      this.deadT += dt;
      const k = Math.min(1, this.deadT / 0.25);
      this.body.scale.set(1 + k * 0.8, 1 - k * 0.88, 1 + k * 0.8);
      this.body.rotation.y += dt * 8 * (1 - k);
      this.tag.visible = false;
      this.root.visible = this.deadT < 1.4;
      return;
    }
    this.deadT = 0;
    this.root.visible = true;
    this.tag.visible = true;
    this.body.rotation.y = 0;

    let fl = 0;
    if (this.hitT > 0) { this.hitT -= dt; fl = Math.sin(Math.min(1, this.hitT / 0.2) * Math.PI) * (this.hitHead ? 1.4 : 1); }
    // quique de borracha
    const bounce = moving ? Math.abs(Math.sin(ph)) : (Math.sin(t * 4.4 + this.phase) * 0.5 + 0.5) * 0.3;
    const sq = anim === 'jump' ? 1.12 : 1 + (bounce - 0.5) * 0.08;
    this.body.scale.set(1 / Math.sqrt(sq), sq * (1 - crouch * 0.35), 1 / Math.sqrt(sq));
    this.body.position.y = moving ? bounce * 0.12 : 0;
    this.body.rotation.x = (anim === 'sprint' || anim === 'tac' ? -0.25 : anim === 'slide' ? 0.35 : 0) + fl * 0.35;
    if (fl) this.body.scale.multiplyScalar(1 - fl * 0.06);
    this.head.rotation.z = fl * 0.3;
    this.head.rotation.x = -pitch * 0.6;

    const hip = 0.72;
    for (const [leg, shoe, side, off] of [[this.legR, this.shoeR, 1, 0], [this.legL, this.shoeL, -1, Math.PI]]) {
      const sw = moving ? Math.sin(ph + off) : 0;
      const lift = moving ? Math.max(0, Math.cos(ph + off)) * 0.25 : 0;
      const a = new THREE.Vector3(side * 0.17, hip, 0);
      const footZ = anim === 'slide' ? -0.5 : -sw * 0.5;
      const b = new THREE.Vector3(side * 0.22, 0.1 + lift + (anim === 'jump' ? 0.25 : 0), footZ);
      // joelho de mangueira dobra pra frente
      const c = new THREE.Vector3(side * 0.24, (a.y + b.y) / 2, (a.z + b.z) / 2 - 0.18 - lift * 0.4);
      leg.set(a, c, b);
      shoe.position.set(b.x, b.y - 0.02, b.z - 0.1);
      shoe.rotation.x = moving ? sw * 0.3 : 0;
    }

    // braco com arma (pose de quem segura de verdade, sobe/desce com o pitch)
    const sprinting = anim === 'sprint' || anim === 'tac';
    const gp = this.gunHolder;
    if (sprinting) {
      gp.position.set(0.18, 1.05 + (anim === 'tac' ? 0.35 : 0), -0.35);
      gp.rotation.set(anim === 'tac' ? 1.1 : -0.6, 0.5, 0.3);
    } else {
      gp.position.set(0.2, 1.22 + crouch * -0.1, -0.42);
      gp.rotation.set(pitch * 0.8, 0, 0);
    }
    gp.updateMatrix();
    const gripR = new THREE.Vector3(), gripL = new THREE.Vector3();
    if (this.gun) {
      gripR.copy(this.gun.userData.gripR.position).applyMatrix4(gp.matrix);
      gripL.copy(this.gun.userData.gripL.position).applyMatrix4(gp.matrix);
    }
    const pump = sprinting ? Math.sin(ph) * 0.15 : 0;
    this.handR.position.copy(gripR); this.handR.position.z += pump * 0.3;
    this.handL.position.copy(gripL); this.handL.position.z -= pump * 0.5;
    const shR = new THREE.Vector3(0.36, 1.32, 0), shL = new THREE.Vector3(-0.36, 1.32, 0);
    this.armR.set(shR, new THREE.Vector3(0.48, 1.0, -0.1), this.handR.position);
    this.armL.set(shL, new THREE.Vector3(-0.35, 1.0, -0.35), this.handL.position);
    if (this.gun && this.gun.userData.spin) this.gun.userData.spin.rotation.z += dt * (s.firing ? 30 : 2);

    this.shadow.scale.setScalar(1 - Math.min(0.6, (s.airH || 0) * 0.15));
  }
}
