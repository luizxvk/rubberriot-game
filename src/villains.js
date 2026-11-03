// Noite dos Borroes (03/11, previa pra ele aprovar): viloes e chefoes de desenho de 1930, feitos de tinta.
// Cada construtor devolve um THREE.Group com o pe no chao (y = 0) e a frente pra -Z; `userData.anim(t)` mexe
// o boneco (gingado, mola, rabisco redesenhando...). As ondas, a loja e o Estudio Tinteiro vem depois.
import * as THREE from 'three';
import { ink, geo, toon, PAL } from './toon.js';

const INK = 0x1b1916, GOLD = 0xc9a24a, GLASS = 0x26303a;

// ---------- pecas comuns ----------
// olho de torta bravo/feliz desenhado num canvas (dois olhos numa placa so)
const EYES = {};
function eyesTex(mood) {
  if (EYES[mood]) return EYES[mood];
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (const x of [72, 184]) {
    g.fillStyle = '#faf8f2'; g.strokeStyle = '#141210'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(x, 68, 46, 54, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#141210'; g.beginPath(); g.ellipse(x + (x < 128 ? 10 : -10), 78, 20, 32, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#faf8f2'; g.beginPath(); g.moveTo(x + (x < 128 ? 12 : -8), 62); g.lineTo(x + (x < 128 ? 22 : 2), 48); g.lineTo(x + (x < 128 ? 26 : 6), 64); g.fill(); // fatia de torta
    if (mood !== 'happy') { // sobrancelha brava (corta o olho por cima, em V)
      g.fillStyle = '#141210'; g.beginPath();
      if (x < 128) { g.moveTo(20, 10); g.lineTo(128, 40); g.lineTo(128, 0); g.lineTo(20, 0); }
      else { g.moveTo(236, 10); g.lineTo(128, 40); g.lineTo(128, 0); g.lineTo(236, 0); }
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (EYES[mood] = t);
}
function eyes(w, mood = 'mad') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: eyesTex(mood), transparent: true }));
  m.rotation.y = Math.PI; // a placa olha pra -Z (frente)
  return m;
}
// sorriso de dentes brancos enormes (boca preta, dentes com risco)
let GRIN = null;
function grinTex() {
  if (GRIN) return GRIN;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#141210'; g.beginPath(); g.moveTo(8, 20); g.quadraticCurveTo(128, 150, 248, 20); g.quadraticCurveTo(128, 70, 8, 20); g.fill();
  g.save(); g.clip();
  g.fillStyle = '#faf8f2'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#141210'; g.lineWidth = 5;
  for (let x = 40; x < 240; x += 32) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 128); g.stroke(); }
  g.beginPath(); g.moveTo(0, 62); g.quadraticCurveTo(128, 104, 256, 62); g.stroke();
  g.restore();
  g.strokeStyle = '#141210'; g.lineWidth = 8; g.beginPath(); g.moveTo(8, 20); g.quadraticCurveTo(128, 150, 248, 20); g.quadraticCurveTo(128, 70, 8, 20); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (GRIN = t);
}
function grin(w) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: grinTex(), transparent: true }));
  m.rotation.y = Math.PI;
  return m;
}
// luva branca de desenho (palma + 3 dedos gordos + punho)
function glove(s = 1) {
  const g = new THREE.Group();
  const palm = ink(geo(THREE.SphereGeometry, 0.16, 12, 10), PAL.white, 0.025); palm.scale.set(1.1, 1, 0.8); g.add(palm);
  for (let i = 0; i < 3; i++) { const f = ink(geo(THREE.CapsuleGeometry, 0.055, 0.12, 4, 8), PAL.white, 0.02); f.position.set(-0.08 + i * 0.08, -0.16, -0.02); g.add(f); }
  const cuff = ink(geo(THREE.TorusGeometry, 0.12, 0.05, 6, 14), PAL.white, 0.02); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.14; g.add(cuff);
  g.scale.setScalar(s);
  return g;
}
// braco de mangueira simples (tubo curvo fixo, preto)
function hoseArm(a, c, b, r = 0.06, color = INK) {
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), new THREE.Vector3(...c), new THREE.Vector3(...b));
  return ink(new THREE.TubeGeometry(curve, 12, r, 8), color, 0.02);
}
// gota de tinta: torno com ponta em cima (formato de pingo)
function dropGeo(r, h) {
  // barriga redonda embaixo e ponta fina em cima, com a curva pra dentro (pingo de desenho)
  const pts = [], yb = r * 1.25, xb = Math.sqrt(r * r - (yb - r) ** 2);
  for (let i = 0; i <= 12; i++) { const y = yb * i / 12; pts.push(new THREE.Vector2(Math.max(0.001, Math.sqrt(Math.max(0, r * r - (y - r) ** 2)) * (y < 0.05 ? 0.85 : 1)), y)); }
  for (let i = 1; i <= 12; i++) { const k = i / 12; pts.push(new THREE.Vector2(Math.max(0.001, xb * (1 - k) ** 1.7), yb + (h - yb) * k)); }
  return new THREE.LatheGeometry(pts, 24);
}

// ---------- Borrao: gota de tinta com sorrisao e luvas, anda gingando ----------
export function borrao() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const blob = ink(dropGeo(0.62, 1.55), INK, 0.04); body.add(blob);
  const e = eyes(0.66); e.position.set(0, 0.95, -0.56); body.add(e);
  const m = grin(0.82); m.position.set(0, 0.55, -0.63); body.add(m);
  const arms = [];
  for (const s of [-1, 1]) {
    body.add(hoseArm([s * 0.5, 0.7, 0], [s * 0.85, 0.75, -0.1], [s * 0.8, 0.35, -0.25]));
    const gl = glove(); gl.position.set(s * 0.8, 0.3, -0.25); gl.rotation.z = s * 0.3; body.add(gl); arms.push(gl);
    const foot = ink(geo(THREE.SphereGeometry, 0.17, 10, 8), INK, 0.03); foot.scale.set(1, 0.6, 1.6); foot.position.set(s * 0.25, 0.06, -0.12); g.add(foot);
  }
  g.userData.anim = (t) => { body.rotation.z = Math.sin(t * 6) * 0.14; body.position.y = Math.abs(Math.sin(t * 6)) * 0.08; arms.forEach((a, i) => { a.position.y = 0.3 + Math.sin(t * 6 + i * Math.PI) * 0.08; }); };
  return g;
}

// ---------- Rabisco: esboco de lapis inacabado, as linhas tremem e se redesenham ----------
export function rabisco() {
  const g = new THREE.Group();
  // 3 versoes do mesmo desenho com o traco tremido: troca a cada 1/8 s (o "redesenhando" do desenho animado)
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 - 0.5; };
  const strokes = [
    [[0, 1.75, 0], [0.32, 1.55, 0], [0, 1.3, 0], [-0.32, 1.55, 0], [0, 1.78, 0]], // cabeca
    [[0, 1.3, 0], [0.04, 0.95, 0], [0, 0.65, 0]], // corpo
    [[0, 1.15, 0], [0.4, 1.0, 0], [0.62, 1.2, -0.1]], [[0, 1.15, 0], [-0.4, 1.0, 0], [-0.6, 0.8, -0.1]], // bracos
    [[0, 0.65, 0], [0.25, 0.35, 0], [0.3, 0, -0.1]], [[0, 0.65, 0], [-0.22, 0.32, 0], [-0.32, 0, 0.1]], // pernas
    [[0.12, 1.62, -0.05], [0.14, 1.52, -0.05]], [[-0.12, 1.62, -0.05], [-0.1, 1.52, -0.05]], // olhos riscados
    [[-0.15, 1.42, -0.05], [0, 1.38, -0.05], [0.17, 1.45, -0.05]], // boca torta
    [[0.5, 1.6, 0], [0.62, 1.75, 0.05]], [[-0.45, 0.2, 0.1], [-0.55, 0.42, 0]], // risquinhos soltos (inacabado)
  ];
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const fr = new THREE.Group();
    for (const s of strokes) for (let pass = 0; pass < 2; pass++) { // cada traco duas vezes, como lapis de esboco
      const pts = s.map(p => new THREE.Vector3(p[0] + rnd() * 0.07, p[1] + rnd() * 0.07, p[2] + rnd() * 0.05));
      const curve = new THREE.CatmullRomCurve3(pts);
      fr.add(new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 6, pass ? 0.018 : 0.03, 5), toon(pass ? 0x6e6a63 : 0x3a3632)));
    }
    fr.visible = f === 0; g.add(fr); frames.push(fr);
  }
  // sombra de grafite: o "corpo" borrado atras das linhas
  const smudge = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: 0x8f897e, transparent: true, opacity: 0.35, depthWrite: false }));
  smudge.position.set(0.05, 1.05, 0.08); smudge.scale.y = 1.7; g.add(smudge);
  g.userData.anim = (t) => { const k = Math.floor(t * 8) % 3; frames.forEach((f, i) => { f.visible = i === k; }); g.rotation.z = Math.sin(t * 13) * 0.06; };
  return g;
}

// ---------- Mola Maluca: borrao com pernas de mola, pula por cima de cobertura ----------
export function mola() {
  const g = new THREE.Group(), top = new THREE.Group(); g.add(top);
  const blob = ink(geo(THREE.SphereGeometry, 0.5, 18, 14), INK, 0.04); blob.scale.set(1, 0.85, 1); top.add(blob);
  const e = eyes(0.62); e.position.set(0, 0.12, -0.46); top.add(e);
  const m = grin(0.5); m.position.set(0, -0.18, -0.45); m.scale.y = 0.8; top.add(m);
  const coils = [];
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * Math.PI * 2 * 6; pts.push(new THREE.Vector3(Math.cos(a) * 0.13, i / 80, Math.sin(a) * 0.13)); }
    const coil = ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.025, 5), 0x9aa0a0, 0.012);
    coil.position.set(s * 0.22, 0.12, 0); g.add(coil); coils.push(coil);
    const shoe = ink(geo(THREE.SphereGeometry, 0.17, 10, 8), PAL.red, 0.03); shoe.scale.set(1, 0.55, 1.5); shoe.position.set(s * 0.22, 0.08, -0.08); g.add(shoe);
  }
  for (const s of [-1, 1]) { const gl = glove(0.8); gl.position.set(s * 0.58, -0.05, -0.1); gl.rotation.z = s * 0.6; top.add(gl); }
  g.userData.anim = (t) => { const k = 0.55 + Math.abs(Math.sin(t * 3.2)) * 0.9; coils.forEach(c => { c.scale.y = k; }); top.position.y = 0.12 + k + 0.42; top.scale.set(1 + (1.45 - k) * 0.15, 1 - (1.45 - k) * 0.12, 1); };
  g.userData.anim(0.4);
  return g;
}

// ---------- Cuspidor: tinteiro de vidro com perninhas e bico de pena, cospe bola de tinta ----------
export function cuspidor() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = 0.45;
  const pts = [[0.001, 0], [0.55, 0], [0.6, 0.08], [0.6, 0.6], [0.48, 0.72], [0.22, 0.8], [0.22, 1.0], [0.27, 1.04], [0.27, 1.12], [0.001, 1.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = ink(new THREE.LatheGeometry(pts, 8), GLASS, 0.04); body.add(glass);
  const label = ink(geo(THREE.CylinderGeometry, 0.605, 0.605, 0.32, 8, 1, true), PAL.paper, 0); label.position.y = 0.36; body.add(label);
  const e = eyes(0.7); e.position.set(0, 0.38, -0.62); body.add(e);
  // bico de pena dourado saindo da boca do tinteiro, apontado pra frente (e por ele que cospe)
  const nib = ink(geo(THREE.ConeGeometry, 0.16, 0.7, 4), GOLD, 0.03); nib.rotation.x = -Math.PI / 2 - 0.5; nib.position.set(0, 1.12, -0.32); body.add(nib);
  const slit = ink(geo(THREE.BoxGeometry, 0.02, 0.02, 0.45), INK, 0); slit.rotation.x = -0.5; slit.position.set(0, 1.2, -0.4); body.add(slit);
  const drop = ink(geo(THREE.SphereGeometry, 0.12, 10, 8), INK, 0.02); drop.position.set(0, 0.95, -0.75); body.add(drop);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 0.45, 6), INK, 0.015); leg.position.set(s * 0.25, -0.22, 0); body.add(leg); legs.push(leg);
    const shoe = ink(geo(THREE.SphereGeometry, 0.14, 10, 8), INK, 0.02); shoe.scale.set(1, 0.55, 1.5); shoe.position.set(s * 0.25, 0.06, -0.08); g.add(shoe);
  }
  g.userData.anim = (t) => { body.rotation.z = Math.sin(t * 4) * 0.08; const sp = (t * 0.8) % 1; drop.position.z = -0.75 - sp * 2.2; drop.position.y = 0.95 + Math.sin(sp * Math.PI) * 0.3; drop.scale.setScalar(1 - sp * 0.3); };
  return g;
}

// ---------- Gordao do Pote: pote de tinta gigante e emburrado, estoura numa poca grande ----------
export function gordao() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body); body.position.y = 0.35;
  const can = ink(geo(THREE.CylinderGeometry, 1, 1.05, 2, 24), 0x9aa0a0, 0.06); can.position.y = 1; body.add(can);
  const lab = ink(geo(THREE.CylinderGeometry, 1.06, 1.06, 1.1, 24, 1, true), PAL.paper, 0); lab.position.y = 0.95; body.add(lab);
  const band = ink(geo(THREE.CylinderGeometry, 1.07, 1.07, 0.25, 24, 1, true), PAL.red, 0); band.position.y = 0.55; body.add(band);
  for (const y of [0.04, 1.96]) { const rim = ink(geo(THREE.TorusGeometry, 1.02, 0.06, 6, 24), PAL.mid, 0.02); rim.rotation.x = Math.PI / 2; rim.position.y = y; body.add(rim); }
  // tinta vermelha transbordando com pingos escorrendo
  const paint = ink(geo(THREE.CylinderGeometry, 1.0, 1.0, 0.12, 24), PAL.red, 0.02); paint.position.y = 2.02; body.add(paint);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, len = 0.35 + (i % 3) * 0.2; const d = ink(geo(THREE.CapsuleGeometry, 0.07, len, 4, 8), PAL.red, 0.015); d.position.set(Math.cos(a) * 1.04, 2 - len / 2, Math.sin(a) * 1.04); body.add(d); }
  const handle = ink(new THREE.TorusGeometry(1.0, 0.03, 5, 20, Math.PI), PAL.dark, 0.012); handle.position.y = 2.05; handle.rotation.y = 0.3; body.add(handle);
  // cara emburrada no rotulo
  const e = eyes(1.1); e.position.set(0, 1.28, -1.07); body.add(e);
  const frown = ink(new THREE.TorusGeometry(0.28, 0.05, 6, 12, Math.PI), INK, 0); frown.position.set(0, 0.68, -1.08); body.add(frown);
  const arms = [];
  for (const s of [-1, 1]) {
    body.add(hoseArm([s * 1.0, 1.3, 0], [s * 1.55, 1.1, 0], [s * 1.45, 0.55, -0.2], 0.09));
    const gl = glove(1.5); gl.position.set(s * 1.45, 0.45, -0.2); body.add(gl); arms.push(gl);
    const leg = ink(geo(THREE.CylinderGeometry, 0.12, 0.12, 0.4, 8), INK, 0.02); leg.position.set(s * 0.45, 0.2, 0); g.add(leg);
    const shoe = ink(geo(THREE.SphereGeometry, 0.26, 10, 8), INK, 0.03); shoe.scale.set(1, 0.55, 1.5); shoe.position.set(s * 0.45, 0.1, -0.12); g.add(shoe);
  }
  g.userData.anim = (t) => { const st = Math.sin(t * 2.2); body.rotation.z = st * 0.05; body.position.y = 0.35 + Math.max(0, st) * 0.08; body.scale.set(1 + Math.max(0, -st) * 0.04, 1 - Math.max(0, -st) * 0.04, 1); };
  return g;
}

// ---------- Cartola: o vilao classico (bigode torcido, cartola, capa), deixa os borroes mais rapidos ----------
export function cartola() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const torso = ink(geo(THREE.CapsuleGeometry, 0.3, 0.75, 6, 12), INK, 0.035); torso.position.y = 1.15; torso.scale.set(1, 1, 0.8); body.add(torso);
  const head = ink(geo(THREE.SphereGeometry, 0.32, 14, 12), 0xe9e2d2, 0.035); head.position.set(0, 1.9, 0); head.scale.set(0.95, 1.1, 0.95); body.add(head);
  const e = eyes(0.45); e.position.set(0, 1.97, -0.3); body.add(e);
  const nose = ink(geo(THREE.SphereGeometry, 0.08, 8, 6), PAL.red, 0.015); nose.position.set(0, 1.86, -0.33); body.add(nose);
  // bigode torcido: dois arcos com caracol na ponta
  for (const s of [-1, 1]) {
    const arc = ink(new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI * 1.4), INK, 0.01);
    arc.position.set(s * 0.14, 1.79, -0.32); arc.rotation.set(0, 0, s < 0 ? Math.PI * 0.1 : Math.PI * 1.5); arc.scale.x = s; body.add(arc);
  }
  // cartola com faixa vermelha
  const brim = ink(geo(THREE.CylinderGeometry, 0.44, 0.44, 0.05, 20), INK, 0.02); brim.position.y = 2.18; body.add(brim);
  const hat = ink(geo(THREE.CylinderGeometry, 0.27, 0.25, 0.62, 20), INK, 0.03); hat.position.y = 2.5; body.add(hat);
  const hb = ink(geo(THREE.CylinderGeometry, 0.262, 0.262, 0.1, 20, 1, true), PAL.red, 0); hb.position.y = 2.26; body.add(hb);
  // capa: preta por fora, vermelha por dentro, aberta nas costas
  const capeShape = new THREE.CylinderGeometry(0.42, 0.75, 1.5, 16, 1, true, Math.PI * 0.35, Math.PI * 1.3);
  const capeOut = new THREE.Mesh(capeShape, toon(INK, { side: THREE.FrontSide, unique: true })); capeOut.position.y = 1.0; capeOut.rotation.y = Math.PI; body.add(capeOut);
  const capeIn = new THREE.Mesh(capeShape, toon(PAL.red, { side: THREE.BackSide, unique: true })); capeIn.position.y = 1.0; capeIn.rotation.y = Math.PI; body.add(capeIn);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 0.5, 16, 1, true, -Math.PI / 2, Math.PI), toon(PAL.red, { side: THREE.DoubleSide, unique: true })); collar.position.set(0, 1.8, 0.05); body.add(collar); // gola em pe so atras da cabeca
  for (const s of [-1, 1]) {
    const leg = ink(geo(THREE.CylinderGeometry, 0.07, 0.06, 0.55, 8), INK, 0.015); leg.position.set(s * 0.14, 0.3, 0); g.add(leg);
    const shoe = ink(geo(THREE.SphereGeometry, 0.13, 10, 8), INK, 0.02); shoe.scale.set(1, 0.5, 1.8); shoe.position.set(s * 0.14, 0.05, -0.1); g.add(shoe);
  }
  // mao esquerda torce o bigode; a direita segura a bengala
  body.add(hoseArm([0.3, 1.45, 0], [0.55, 1.2, -0.1], [0.45, 0.95, -0.35], 0.055));
  const gr = glove(0.85); gr.position.set(0.45, 0.92, -0.35); body.add(gr);
  const cane = ink(geo(THREE.CylinderGeometry, 0.03, 0.03, 1.0, 6), INK, 0.01); cane.position.set(0.47, 0.45, -0.38); body.add(cane);
  const knob = ink(geo(THREE.SphereGeometry, 0.06, 8, 6), GOLD, 0.01); knob.position.set(0.47, 0.98, -0.38); body.add(knob);
  const twirl = new THREE.Group(); twirl.position.set(-0.3, 1.45, 0); body.add(twirl);
  twirl.add(hoseArm([0, 0, 0], [-0.25, 0.2, -0.2], [-0.2, 0.35, -0.33], 0.055));
  const gl = glove(0.85); gl.position.set(-0.2, 0.38, -0.33); gl.rotation.z = -2.6; twirl.add(gl);
  g.userData.anim = (t) => { twirl.rotation.z = Math.sin(t * 7) * 0.12; body.position.y = Math.abs(Math.sin(t * 2.5)) * 0.04; capeOut.rotation.y = capeIn.rotation.y = Math.PI + Math.sin(t * 2) * 0.08; };
  return g;
}

// ---------- CHEFAO, onda 5: O Projecionista (projetor gigante em pernas de tripe) ----------
export function projecionista() {
  const g = new THREE.Group(), head = new THREE.Group(); g.add(head); head.position.y = 5.2;
  const box = ink(geo(THREE.BoxGeometry, 2.2, 1.6, 2.8), INK, 0.07); head.add(box);
  const plate = ink(geo(THREE.BoxGeometry, 2.25, 0.3, 2.85), PAL.mid, 0.03); plate.position.y = -0.7; head.add(plate);
  // dois rolos de filme em cima, girando
  const reels = [];
  for (const z of [-0.8, 1.0]) {
    const reel = new THREE.Group(); reel.position.set(0, 1.6, z); head.add(reel);
    const disc = ink(geo(THREE.CylinderGeometry, 1.0, 1.0, 0.18, 24), PAL.mid, 0.04); disc.rotation.z = Math.PI / 2; reel.add(disc);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const hole = ink(geo(THREE.CylinderGeometry, 0.22, 0.22, 0.2, 10), INK, 0); hole.rotation.z = Math.PI / 2; hole.position.set(0, Math.cos(a) * 0.55, Math.sin(a) * 0.55); reel.add(hole); }
    const hub = ink(geo(THREE.CylinderGeometry, 0.16, 0.16, 0.3, 10), PAL.white, 0.02); hub.rotation.z = Math.PI / 2; reel.add(hub);
    const arm = ink(geo(THREE.BoxGeometry, 0.1, 0.9, 0.12), PAL.dark, 0.02); arm.position.set(0, 0.95, z); head.add(arm);
    reels.push(reel);
  }
  // fita de filme ligando os rolos
  const film = ink(geo(THREE.BoxGeometry, 0.06, 0.05, 1.9), INK, 0); film.position.set(0, 2.35, 0.1); head.add(film);
  // lente (o ponto fraco: acende antes de projetar)
  const tube = ink(geo(THREE.CylinderGeometry, 0.45, 0.55, 1.0, 16), PAL.dark, 0.04); tube.rotation.x = Math.PI / 2; tube.position.set(0, -0.1, -1.85); head.add(tube);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const lens = new THREE.Mesh(geo(THREE.CircleGeometry, 0.4, 20), lensMat); lens.rotation.y = Math.PI; lens.position.set(0, -0.1, -2.36); head.add(lens);
  const ring = ink(geo(THREE.TorusGeometry, 0.45, 0.07, 6, 20), GOLD, 0.02); ring.position.set(0, -0.1, -2.36); head.add(ring);
  // olhos bravos em cima da lente e manivela do lado
  const e = eyes(1.4); e.position.set(0, 0.45, -1.42); head.add(e);
  const crank = new THREE.Group(); crank.position.set(1.15, 0, 0.4); head.add(crank);
  const ca = ink(geo(THREE.BoxGeometry, 0.1, 0.8, 0.12), PAL.mid, 0.02); ca.position.y = -0.35; crank.add(ca);
  const ck = ink(geo(THREE.CylinderGeometry, 0.07, 0.07, 0.35, 8), PAL.red, 0.01); ck.rotation.z = Math.PI / 2; ck.position.set(0.18, -0.72, 0); crank.add(ck);
  // facho de luz que "congela o quadro" (inclinado pra baixo: pega quem esta no chao; ponta na lente, boca pra frente)
  const aim = new THREE.Group(); aim.position.set(0, -0.1, -2.36); aim.rotation.x = -0.38; head.add(aim);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe68a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.x = Math.PI / 2; beam.position.z = -4.5; aim.add(beam);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ color: 0xffe68a, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); spot.position.z = -9; aim.add(spot); // a boca do facho
  // tripe: tres pernas compridas
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 6, foot = new THREE.Vector3(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4);
    const leg = hoseArm([0, 4.6, 0], [foot.x * 0.6, 3.6, foot.z * 0.6], [foot.x, 0.25, foot.z], 0.14, PAL.dark); g.add(leg); legs.push(leg);
    const shoe = ink(geo(THREE.SphereGeometry, 0.35, 10, 8), INK, 0.03); shoe.scale.set(1, 0.5, 1.4); shoe.position.copy(foot).setY(0.15); shoe.rotation.y = -a + Math.PI / 2; g.add(shoe);
  }
  // live (no jogo): o facho so acende quando o servidor manda (warn = lente acendendo, beam = facho 0..1);
  // fora do jogo (previa aprovada) continua pulsando sozinho
  g.userData.live = false; g.userData.warn = false; g.userData.beam = 0;
  g.userData.anim = (t) => {
    reels.forEach((r, i) => { r.rotation.x = t * (i ? 2.5 : -2.5); });
    crank.rotation.x = t * 4;
    head.position.y = 5.2 + Math.sin(t * 1.6) * 0.15; head.rotation.y = g.userData.live ? 0 : Math.sin(t * 0.7) * 0.25;
    if (g.userData.live) {
      const w = g.userData.warn ? 0.5 + 0.5 * Math.sin(t * 22) : 0, b = g.userData.beam;
      lensMat.color.setRGB(0.55 + w * 0.45 + b * 0.45, 0.5 + w * 0.45 + b * 0.45, 0.35 + w * 0.4 + b * 0.5);
      beam.visible = spot.visible = b > 0.02; beam.material.opacity = b * 0.42; spot.material.opacity = b * 0.55;
      return;
    }
    const glow = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2)); lensMat.color.setRGB(1, 0.85 + glow * 0.1, 0.45 + glow * 0.4); beam.material.opacity = 0.12 + glow * 0.22; spot.material.opacity = 0.2 + glow * 0.3;
  };
  return g;
}

// ---------- CHEFAO, onda 10: Rei Tinteiro (tinteiro do tamanho de uma casa, coroa torta, um olho so) ----------
export function reiTinteiro() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const pts = [[0.001, 0], [3.2, 0], [3.5, 0.4], [3.5, 3.6], [2.9, 4.4], [1.5, 4.9], [1.5, 5.6], [1.75, 5.8], [1.75, 6.2], [0.001, 6.2]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = ink(new THREE.LatheGeometry(pts, 8), GLASS, 0.12); body.add(glass);
  const label = ink(geo(THREE.CylinderGeometry, 3.52, 3.52, 1.6, 8, 1, true), PAL.paper, 0); label.position.y = 2.0; body.add(label);
  const stripe = ink(geo(THREE.CylinderGeometry, 3.53, 3.53, 0.25, 8, 1, true), PAL.red, 0); stripe.position.y = 2.95; body.add(stripe);
  // tampa (fase 3: abre) com a coroa torta em cima
  const lid = new THREE.Group(); lid.position.set(0, 6.2, 0); body.add(lid);
  const cap = ink(geo(THREE.CylinderGeometry, 1.85, 1.85, 0.5, 20), INK, 0.06); cap.position.y = 0.25; lid.add(cap);
  const crown = new THREE.Group(); crown.position.set(0.3, 0.5, 0); crown.rotation.z = 0.28; lid.add(crown);
  const cband = ink(geo(THREE.CylinderGeometry, 1.0, 1.0, 0.45, 20, 1, true), GOLD, 0.04); cband.position.y = 0.22; crown.add(cband);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, sp = ink(geo(THREE.ConeGeometry, 0.25, 0.75, 4), GOLD, 0.03); sp.position.set(Math.cos(a) * 0.95, 0.8, Math.sin(a) * 0.95); crown.add(sp);
    const jw = ink(geo(THREE.SphereGeometry, 0.12, 8, 6), PAL.red, 0.01); jw.position.set(Math.cos(a) * 1.0, 0.22, Math.sin(a) * 1.0); crown.add(jw);
  }
  // o olho so, no meio do rotulo (saltado pra fora do vidro), com palpebra brava
  const eyeG = new THREE.Group(); eyeG.position.set(0, 2.15, -3.3); body.add(eyeG);
  const ball = ink(geo(THREE.SphereGeometry, 1.15, 20, 16), PAL.white, 0.06); ball.scale.z = 0.6; eyeG.add(ball);
  const pupil = ink(geo(THREE.SphereGeometry, 0.5, 14, 10), INK, 0); pupil.scale.set(0.8, 1.2, 0.5); pupil.position.z = -0.6; eyeG.add(pupil);
  const shine = ink(geo(THREE.SphereGeometry, 0.13, 8, 6), PAL.white, 0); shine.position.set(0.15, 0.3, -0.8); eyeG.add(shine);
  const lidM = ink(geo(THREE.SphereGeometry, 1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), INK, 0.04); lidM.scale.z = 0.62; lidM.rotation.set(-0.25, 0, 0.18); eyeG.add(lidM);
  // pena gigante enfiada, inclinada
  const quill = new THREE.Group(); quill.position.set(-1.0, 6.4, 0.6); quill.rotation.set(0.25, 0, 0.45); body.add(quill);
  const shaft = ink(geo(THREE.CylinderGeometry, 0.08, 0.12, 6, 8), PAL.paper, 0.03); shaft.position.y = 3; quill.add(shaft);
  const vane = ink(geo(THREE.SphereGeometry, 0.9, 12, 10), PAL.white, 0.04); vane.scale.set(0.35, 2.6, 0.08); vane.position.set(0.3, 4.2, 0); quill.add(vane);
  // tinta escorrendo pelo vidro e poca no chao
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.5, len = 0.5 + (i % 3) * 0.45; const d = ink(geo(THREE.CapsuleGeometry, 0.17, len, 4, 8), INK, 0.02); d.position.set(Math.cos(a) * 3.55, 3.75 - len / 2, Math.sin(a) * 3.55); body.add(d); }
  const spill = ink(geo(THREE.TorusGeometry, 3.3, 0.22, 6, 8), INK, 0.02); spill.rotation.set(Math.PI / 2, 0, Math.PI / 8); spill.position.y = 3.75; body.add(spill); // tinta que transbordou pelo ombro
  const pool = new THREE.Mesh(new THREE.CircleGeometry(5, 28), toon(INK)); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.02; pool.scale.set(1.15, 0.9, 1); g.add(pool);
  // bracos de mangueira com luvas gigantes
  for (const s of [-1, 1]) {
    body.add(hoseArm([s * 3.3, 2.6, 0], [s * 5.0, 3.2, -0.5], [s * 4.6, 1.6, -1.6], 0.32));
    const gl = glove(4.5); gl.position.set(s * 4.6, 1.3, -1.6); gl.rotation.z = s * 0.4; body.add(gl);
  }
  g.userData.lidOpen = 0; // fase 3 no jogo: a tampa abre (0..1)
  g.userData.anim = (t) => { body.rotation.z = Math.sin(t * 1.2) * 0.03; body.scale.y = 1 + Math.sin(t * 2.4) * 0.02; pupil.position.x = Math.sin(t * 0.9) * 0.35; lid.rotation.z = Math.sin(t * 3) * 0.04; lid.rotation.x = -g.userData.lidOpen * 1.3; lid.position.z = g.userData.lidOpen * 1.2; };
  return g;
}

export const VILLAINS = { borrao, rabisco, mola, cuspidor, gordao, cartola };
export const BOSSES = { projecionista, reiTinteiro };
