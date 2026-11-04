// Visual das sequencias grandes (03/11): Biplano, Trem Desgovernado, Balao Bombardeiro e Mao do Animador,
// mais as pocas de fogo do balao e a sombra dele no chao. O nucleo esta em shared/strikes.js.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ink, geo, toon, PAL, outline } from './toon.js';

// Biplano do Tripo (04/11, pedido dele: o feito de caixas estava feio). Veio SEM helice de proposito: a helice e nossa
// e gira por codigo. Carrega uma vez; ate chegar (ou se falhar) vale o desenho antigo de caixas.
// Arrumacao: nariz pra -Z, envergadura 8,5 m (a mesma do antigo, que as rotas e o tamanho no ceu usam).
let PLANE = null;
const TEAM_PLANE = new Map(); // material por time: o vermelho da fuselagem vira a cor do time no shader
function planeMat(team) {
  if (TEAM_PLANE.has(team)) return TEAM_PLANE.get(team);
  const m = toon(0xffffff, { map: PLANE.map, unique: true }), c = new THREE.Color(TEAMC(team));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTeam = { value: c };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTeam;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 k = diffuseColor.rgb; float red = smoothstep(0.22, 0.38, k.r - max(k.g, k.b)); /* so o vermelho forte; o creme das asas fica */
          diffuseColor.rgb = mix(k, uTeam * (0.55 + dot(k, vec3(0.3, 0.59, 0.11)) * 1.2), red); }`);
  };
  m.customProgramCacheKey = () => 'planeTeam';
  TEAM_PLANE.set(team, m);
  return m;
}
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/biplano.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox();
  const b = g0.boundingBox, sx = b.max.x - b.min.x, sz = b.max.z - b.min.z;
  // envergadura = eixo horizontal mais largo; o outro e a fuselagem. Gira pra fuselagem ficar no Z
  if (sx < sz) g0.rotateY(Math.PI / 2);
  g0.computeBoundingBox(); let c = g0.boundingBox.getCenter(new THREE.Vector3()); g0.translate(-c.x, -c.y, -c.z); g0.computeBoundingBox();
  // cauda = a ponta com a deriva mais alta: ela vai pra +Z (nariz em -Z)
  const P = g0.attributes.position, bb = g0.boundingBox, L = bb.max.z - bb.min.z; let hiA = -Infinity, hiB = -Infinity;
  for (let i = 0; i < P.count; i++) { const z = P.getZ(i), y = P.getY(i); if (z < bb.min.z + L * 0.15) hiA = Math.max(hiA, y); if (z > bb.max.z - L * 0.15) hiB = Math.max(hiB, y); }
  if (hiA > hiB) g0.rotateY(Math.PI);
  g0.computeBoundingBox(); const span = g0.boundingBox.max.x - g0.boundingBox.min.x, k = 8.5 / span; g0.scale(k, k, k);
  g0.computeBoundingBox(); g0.computeVertexNormals();
  // nariz: centro das alturas da fatia da frente (onde a helice gira)
  const P2 = g0.attributes.position, b2 = g0.boundingBox, L2 = b2.max.z - b2.min.z; let ys = 0, n = 0;
  for (let i = 0; i < P2.count; i++) if (P2.getZ(i) < b2.min.z + L2 * 0.06) { ys += P2.getY(i); n++; }
  PLANE = { geo: g0, map: mesh.material?.map || null, nose: [0, n ? ys / n : 0, b2.min.z - 0.08] };
  if (PLANE.map) PLANE.map.colorSpace = THREE.SRGBColorSpace;
}).catch(e => console.warn('biplano.glb nao carregou (fica o de caixas)', e));

const TEAMC = (team) => (team === 'blue' ? PAL.blue : PAL.red);

// ---------- modelos (estilo mangueira de borracha: formas gordas, contorno de tinta) ----------
export function planeMesh(team) {
  if (PLANE) {
    const g = new THREE.Group(), body = new THREE.Mesh(PLANE.geo, planeMat(team)); outline(body, 0.06); g.add(body);
    // helice nossa (o modelo veio sem): duas pas de madeira + cubo, girando no nariz
    const prop = new THREE.Group(); prop.position.set(...PLANE.nose);
    for (const a of [0, Math.PI / 2]) { const pa = ink(geo(THREE.BoxGeometry, 0.2, 2.6, 0.08), PAL.wood, 0.03); pa.rotation.z = a; prop.add(pa); }
    const hub = ink(geo(THREE.SphereGeometry, 0.22, 10, 8), PAL.ink, 0.02); prop.add(hub);
    g.add(prop); g.userData.prop = prop;
    return g;
  }
  const g = new THREE.Group(), c = TEAMC(team);
  const body = ink(geo(THREE.CylinderGeometry, 0.55, 0.35, 5, 12), c, 0.06); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = ink(geo(THREE.CylinderGeometry, 0.6, 0.6, 0.5, 14), PAL.ink, 0.04); nose.rotation.x = Math.PI / 2; nose.position.z = -2.6; g.add(nose);
  for (const y of [0.75, -0.45]) { const w = ink(geo(THREE.BoxGeometry, 8.5, 0.16, 1.5), PAL.paper, 0.06); w.position.set(0, y, -0.8); g.add(w); }
  for (const x of [-3, 3]) for (const z of [-1.3, -0.3]) { const s = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 1.2, 5), PAL.dark, 0.02); s.position.set(x, 0.15, z); g.add(s); }
  const tail = ink(geo(THREE.BoxGeometry, 3, 0.12, 0.9), PAL.paper, 0.05); tail.position.set(0, 0.1, 2.3); g.add(tail);
  const fin = ink(geo(THREE.BoxGeometry, 0.12, 1.1, 0.9), c, 0.05); fin.position.set(0, 0.6, 2.3); g.add(fin);
  // piloto de desenho: cabeca, oculos de aviador e cachecol
  const head = ink(geo(THREE.SphereGeometry, 0.42, 12, 10), PAL.ink, 0.04); head.position.set(0, 0.85, 0.3); g.add(head);
  for (const x of [-0.17, 0.17]) { const lens = ink(geo(THREE.TorusGeometry, 0.12, 0.05, 6, 12), PAL.white, 0.02); lens.position.set(x, 0.92, -0.08); g.add(lens); }
  const scarf = ink(geo(THREE.BoxGeometry, 0.18, 0.12, 1.3), PAL.white, 0.02); scarf.position.set(0.2, 0.7, 1.1); scarf.rotation.y = 0.3; g.add(scarf); g.userData.scarf = scarf;
  const prop = new THREE.Group(); prop.position.z = -2.9;
  for (const a of [0, Math.PI / 2]) { const b = ink(geo(THREE.BoxGeometry, 0.18, 2.4, 0.08), PAL.wood, 0.03); b.rotation.z = a; prop.add(b); }
  g.add(prop); g.userData.prop = prop;
  for (const x of [-0.9, 0.9]) { const wh = ink(geo(THREE.CylinderGeometry, 0.32, 0.32, 0.18, 12), PAL.ink, 0.03); wh.rotation.z = Math.PI / 2; wh.position.set(x, -1.1, -1.2); g.add(wh); }
  return g;
}

export function trainMesh(team) {
  const g = new THREE.Group(), c = TEAMC(team);
  // locomotiva com cara (frente = -Z), mais 2 vagoes atras (+Z), cada um 6 m
  const loco = new THREE.Group(); g.add(loco);
  const boiler = ink(geo(THREE.CylinderGeometry, 1.3, 1.3, 4.2, 16), PAL.ink, 0.07); boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 2, -0.6); loco.add(boiler);
  const face = ink(geo(THREE.CylinderGeometry, 1.35, 1.35, 0.2, 16), PAL.paper, 0.05); face.rotation.x = Math.PI / 2; face.position.set(0, 2, -2.75); loco.add(face);
  for (const x of [-0.5, 0.5]) {
    const eye = ink(geo(THREE.SphereGeometry, 0.36, 10, 8), PAL.white, 0.04); eye.scale.z = 0.5; eye.position.set(x, 2.35, -2.9); loco.add(eye);
    const pup = ink(geo(THREE.SphereGeometry, 0.16, 8, 6), PAL.ink, 0); pup.position.set(x * 0.9, 2.3, -3.06); loco.add(pup);
  }
  const brow = ink(geo(THREE.BoxGeometry, 1.5, 0.14, 0.12), PAL.ink, 0); brow.position.set(0, 2.85, -2.95); brow.rotation.z = 0.12; loco.add(brow); // bravo
  const grin = ink(geo(THREE.TorusGeometry, 0.5, 0.08, 6, 14, Math.PI), PAL.ink, 0); grin.rotation.z = Math.PI; grin.position.set(0, 1.6, -2.95); loco.add(grin);
  const cab = ink(geo(THREE.BoxGeometry, 2.8, 2.6, 2.2), c, 0.07); cab.position.set(0, 2.6, 2); loco.add(cab);
  const roof = ink(geo(THREE.BoxGeometry, 3.2, 0.25, 2.6), PAL.ink, 0.04); roof.position.set(0, 4, 2); loco.add(roof);
  const stack = ink(geo(THREE.CylinderGeometry, 0.65, 0.35, 1.5, 12), PAL.ink, 0.05); stack.position.set(0, 3.9, -1.4); loco.add(stack);
  const catcher = ink(geo(THREE.ConeGeometry, 1.2, 1.2, 4), c, 0.05); catcher.rotation.set(-Math.PI / 2, Math.PI / 4, 0); catcher.position.set(0, 0.6, -3.1); loco.add(catcher);
  g.userData.stack = stack;
  const wheels = [];
  const wheelRow = (z, parent) => { for (const x of [-1.2, 1.2]) for (const dz of [-1.6, 0, 1.6]) { const w = ink(geo(THREE.CylinderGeometry, 0.6, 0.6, 0.25, 14), PAL.red, 0.04); w.rotation.z = Math.PI / 2; w.position.set(x, 0.6, z + dz); parent.add(w); wheels.push(w); } };
  wheelRow(0, loco);
  for (let i = 1; i < 3; i++) {
    const car = ink(geo(THREE.BoxGeometry, 2.8, 2.4, 5.2), i % 2 ? PAL.wood : c, 0.07); car.position.set(0, 2.1, i * 6); g.add(car);
    const top = ink(geo(THREE.BoxGeometry, 3, 0.2, 5.4), PAL.ink, 0.03); top.position.set(0, 3.4, i * 6); g.add(top);
    wheelRow(i * 6, g);
  }
  g.userData.wheels = wheels;
  return g;
}

export function handMesh() {
  // luva branca de desenho (3 riscos nas costas), manga preta subindo pro ceu e um lapis com borracha rosa pra baixo
  const g = new THREE.Group();
  const palm = ink(geo(THREE.SphereGeometry, 1.4, 16, 12), PAL.white, 0.08); palm.scale.set(1.2, 0.8, 1); g.add(palm);
  const fingers = [];
  for (let i = 0; i < 3; i++) { const f = ink(geo(THREE.CapsuleGeometry, 0.38, 1.5, 4, 10), PAL.white, 0.06); f.position.set(-0.8 + i * 0.75, -0.6, -1.2); f.rotation.x = 1.2; g.add(f); fingers.push(f); }
  const thumb = ink(geo(THREE.CapsuleGeometry, 0.4, 1.1, 4, 10), PAL.white, 0.06); thumb.position.set(1.5, -0.3, -0.4); thumb.rotation.set(0.6, 0, -0.9); g.add(thumb);
  for (let i = 0; i < 3; i++) { const l = ink(geo(THREE.BoxGeometry, 0.1, 0.05, 1.1), PAL.ink, 0); l.position.set(-0.5 + i * 0.5, 1.12, 0.1); g.add(l); }
  const cuff = ink(geo(THREE.TorusGeometry, 1.15, 0.38, 8, 18), PAL.white, 0.06); cuff.rotation.x = Math.PI / 2; cuff.position.y = 1.2; g.add(cuff);
  const sleeve = ink(geo(THREE.CylinderGeometry, 1.05, 1.2, 40, 12), PAL.ink, 0.05); sleeve.position.y = 21.3; g.add(sleeve);
  const pencil = new THREE.Group(); pencil.position.set(0, -1.1, -1.6); pencil.rotation.x = 0.25; g.add(pencil);
  const wood = ink(geo(THREE.CylinderGeometry, 0.36, 0.36, 4.2, 6), 0xd9a52b, 0.05); wood.position.y = 0.6; pencil.add(wood);
  const band = ink(geo(THREE.CylinderGeometry, 0.4, 0.4, 0.45, 10), PAL.mid, 0.03); band.position.y = -1.7; pencil.add(band);
  const rub = ink(geo(THREE.CylinderGeometry, 0.4, 0.42, 0.9, 10), 0xe58aa0, 0.05); rub.position.y = -2.35; pencil.add(rub);
  g.userData.pencil = pencil; g.userData.fingers = fingers;
  // a mao anima num grupo de dentro (o de fora segue a posicao do servidor com mola)
  const outer = new THREE.Group(); outer.add(g); outer.userData = { inner: g, vel: new THREE.Vector3(), scrub: 0, born: 0 };
  return outer;
}

// lona pintada do balao (03/11, pedido dele: textura em vez de faixas de malha que piscavam): gomos com costura,
// faixa do time no meio e um emblema de estrela de cada lado. Uma textura por time, feita uma vez.
const ENVELOPE = {};
function envelopeTex(team) {
  if (ENVELOPE[team]) return ENVELOPE[team];
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'), col = team === 'blue' ? '#2f5b8a' : '#a83a2c';
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#efeadf'); gr.addColorStop(0.5, '#ddd6c6'); gr.addColorStop(1, '#b9b1a1');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  // gomos: tom alternado + costura escura
  for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)'; x.fillRect(i * W / 16, 0, W / 16, H); x.fillStyle = 'rgba(27,25,22,0.45)'; x.fillRect(i * W / 16 - 1, 0, 3, H); }
  for (const v of [0.22, 0.78]) { x.fillStyle = 'rgba(27,25,22,0.3)'; x.fillRect(0, v * H - 1, W, 3); }
  // faixa do time no meio (vira a faixa lateral ao longo do casco) com filete de tinta
  x.fillStyle = '#1b1916'; x.fillRect(0, H * 0.455, W, H * 0.09); x.fillStyle = col; x.fillRect(0, H * 0.465, W, H * 0.07);
  x.fillStyle = col; x.fillRect(0, H * 0.36, W, H * 0.018); x.fillRect(0, H * 0.622, W, H * 0.018);
  // emblema dos dois lados (u = 0,5 e u = 0)
  const star = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); };
  for (const cx of [W * 0.5, 0, W]) {
    x.beginPath(); x.arc(cx, H * 0.3, 58, 0, Math.PI * 2); x.fillStyle = '#efeadf'; x.fill(); x.lineWidth = 9; x.strokeStyle = '#1b1916'; x.stroke();
    star(cx, H * 0.3, 44); x.fillStyle = col; x.fill(); x.lineWidth = 6; x.stroke();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (ENVELOPE[team] = t);
}
let FIN_GEO;
function finGeo() {
  if (FIN_GEO) return FIN_GEO;
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(2.4, 0); sh.quadraticCurveTo(1.2, 0.6, 0, 1.9); sh.lineTo(0, 0);
  FIN_GEO = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); FIN_GEO.translate(-0.4, 0, -0.05);
  return FIN_GEO;
}


// Dirigivel Bombardeiro do Tripo (04/11, pedido dele): zepelim vermelho com gondola de bombas, SEM helice (as helices sao
// nossas, dos lados da gondola). Mesmo tamanho do antigo (13,8 de comprimento antes do x6 = ~83 m no ceu), nariz no -Z.
// Time azul: o vermelho do envelope vira azul no shader
let BAL = null;
const TEAM_BAL = new Map();
function balMat(team) {
  if (TEAM_BAL.has(team)) return TEAM_BAL.get(team);
  const m = toon(0xffffff, { map: BAL.map, unique: true }), c = new THREE.Color(TEAMC(team));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTeam = { value: c };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTeam;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 k = diffuseColor.rgb; float red = smoothstep(0.12, 0.3, k.r - max(k.g, k.b)); /* envelope vermelho (gondola e bombas ficam) */
          diffuseColor.rgb = mix(k, uTeam * (0.55 + dot(k, vec3(0.3, 0.59, 0.11)) * 1.3), red); }`);
  };
  m.customProgramCacheKey = () => 'balTeam';
  TEAM_BAL.set(team, m);
  return m;
}
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/dirigivel.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox();
  let b = g0.boundingBox; if (b.max.x - b.min.x > b.max.z - b.min.z) g0.rotateY(Math.PI / 2);
  g0.computeBoundingBox(); b = g0.boundingBox;
  const k = 13.8 / (b.max.z - b.min.z); g0.scale(k, k, k); g0.computeBoundingBox(); b = g0.boundingBox;
  // centro do ENVELOPE na origem (o tiro usa o elipsoide dele): altura sem a gondola = parte de cima (75%)
  const H = b.max.y - b.min.y, P = g0.attributes.position, yEnv = b.max.y - H * 0.75;
  g0.translate(-(b.min.x + b.max.x) / 2, -(b.max.y + yEnv) / 2, -(b.min.z + b.max.z) / 2); g0.computeBoundingBox(); b = g0.boundingBox;
  // rabo = ponta com as aletas (mais altas): vai pro +Z
  const L = b.max.z - b.min.z; let hiA = -Infinity, hiB = -Infinity;
  for (let i = 0; i < P.count; i++) { const z = P.getZ(i), y = P.getY(i); if (z < b.min.z + L * 0.12) hiA = Math.max(hiA, y); if (z > b.max.z - L * 0.12) hiB = Math.max(hiB, y); }
  if (hiA > hiB) g0.rotateY(Math.PI);
  g0.computeVertexNormals(); g0.computeBoundingBox(); b = g0.boundingBox;
  const cb = new THREE.Box3(); // gondola: a fatia de baixo (as helices vao dos lados dela)
  for (let i = 0; i < P.count; i++) if (P.getY(i) < b.min.y + (b.max.y - b.min.y) * 0.16) cb.expandByPoint(new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i)));
  BAL = { geo: g0, map: mesh.material?.map || null, basket: cb, envR: [(b.max.x - b.min.x) / 2 * 0.9, (b.max.y - b.min.y) * 0.75 / 2, L / 2 * 0.95] };
  if (BAL.map) BAL.map.colorSpace = THREE.SRGBColorSpace;
}).catch(e => console.warn('dirigivel.glb nao carregou (fica o de caixas)', e));
// Sentinela (04/11, pedido dele): torreta do Tripo (tripe + cabeca verde com cano). O verde vira a cor do time.
// Origem do grupo = centro do corpo (1 m acima do chao): o tiro usa uma esfera ali (hitR). userData.head gira pra mira
let SENT = null;
const TEAM_SENT = new Map();
function sentMat(team) {
  if (TEAM_SENT.has(team)) return TEAM_SENT.get(team);
  const m = toon(0xffffff, { map: SENT.map, unique: true }), c = new THREE.Color(TEAMC(team));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTeam = { value: c };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uTeam;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 k = diffuseColor.rgb; float gr = smoothstep(0.012, 0.045, k.g - max(k.r, k.b)); /* verde apagado da torreta (linear) */
          diffuseColor.rgb = mix(k, uTeam * (0.7 + dot(k, vec3(0.3, 0.59, 0.11)) * 1.2), gr); }`);
  };
  m.customProgramCacheKey = () => 'sentTeam';
  TEAM_SENT.set(team, m);
  return m;
}
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/sentinela.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox();
  let b = g0.boundingBox; const k = 1.75 / (b.max.y - b.min.y); g0.scale(k, k, k); g0.computeBoundingBox(); b = g0.boundingBox;
  // eixo do tripe no centro (fatia de baixo)
  const P = g0.attributes.position, H = b.max.y - b.min.y; let sx = 0, sz = 0, n = 0;
  for (let i = 0; i < P.count; i++) if (P.getY(i) < b.min.y + H * 0.1) { sx += P.getX(i); sz += P.getZ(i); n++; }
  g0.translate(-(n ? sx / n : 0), -b.min.y, -(n ? sz / n : 0));
  // cano = ponto mais longe do eixo na parte de cima: gira pra ele apontar pro -Z
  // 04/11: o cano e o eixo horizontal MAIS COMPRIDO da cabeca (o ponto mais longe era o tambor e o cano saia de lado)
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < P.count; i++) if (P.getY(i) > H * 0.5) { const x = P.getX(i), z = P.getZ(i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const alongX = x1 - x0 > z1 - z0, tip = alongX ? (Math.abs(x1) > Math.abs(x0) ? 1 : -1) : (Math.abs(z1) > Math.abs(z0) ? 1 : -1);
  // gira pra ponta ir pro -Z (frente)
  const ang = alongX ? (tip > 0 ? Math.PI / 2 : -Math.PI / 2) : (tip > 0 ? Math.PI : 0);
  g0.rotateY(ang); g0.computeVertexNormals(); g0.computeBoundingBox();
  SENT = { geo: g0, map: mesh.material?.map || null };
  if (SENT.map) SENT.map.colorSpace = THREE.SRGBColorSpace;
}).catch(e => console.warn('sentinela.glb nao carregou', e));

export function sentryMesh(team) {
  const g = new THREE.Group(), head = new THREE.Group(); head.position.y = -1; g.add(head);
  if (SENT) { const body = new THREE.Mesh(SENT.geo, sentMat(team)); outline(body, 0.025); head.add(body); }
  else { // ate o modelo chegar: tripe e caixa
    for (let i = 0; i < 3; i++) { const l = ink(geo(THREE.CylinderGeometry, 0.04, 0.05, 1.1, 6), PAL.dark, 0.01); const a = i * 2.09; l.position.set(Math.sin(a) * 0.3, 0.5, Math.cos(a) * 0.3); l.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); head.add(l); }
    const box = ink(geo(THREE.BoxGeometry, 0.6, 0.5, 0.7), TEAMC(team), 0.03); box.position.y = 1.25; head.add(box);
    const bar = ink(geo(THREE.CylinderGeometry, 0.07, 0.07, 0.7, 8), PAL.ink, 0.02); bar.rotation.x = Math.PI / 2; bar.position.set(0, 1.3, -0.65); head.add(bar);
  }
  g.userData.head = head; g.userData.sentry = true; g.userData.hitR = [0.55, 0.95, 0.55];
  return g;
}

// Sinalizador (04/11, pedido dele; Tripo): bolinha num tripe com bandeirinha. Origem 0,4 m acima do chao (centro do tiro)
let BEACON = null;
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/sinalizador.glb').then((gl) => {
  let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; }); if (!mesh) return;
  gl.scene.updateMatrixWorld(true);
  const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox(); let b = g0.boundingBox;
  const k = 0.75 / (b.max.y - b.min.y); g0.scale(k, k, k); g0.computeBoundingBox(); b = g0.boundingBox;
  g0.translate(-(b.min.x + b.max.x) / 2, -b.min.y - 0.4, -(b.min.z + b.max.z) / 2); g0.computeVertexNormals();
  BEACON = { geo: g0, map: mesh.material?.map || null }; if (BEACON.map) BEACON.map.colorSpace = THREE.SRGBColorSpace;
}).catch(e => console.warn('sinalizador.glb nao carregou', e));
export function beaconMesh(team) {
  const g = new THREE.Group();
  if (BEACON) { const m = new THREE.Mesh(BEACON.geo, toon(0xffffff, { map: BEACON.map })); outline(m, 0.012); g.add(m); }
  else { const b = ink(geo(THREE.SphereGeometry, 0.2, 10, 8), PAL.light, 0.02); g.add(b); }
  const light = ink(geo(THREE.SphereGeometry, 0.06, 8, 6), TEAMC(team), 0); light.position.y = 0.42; g.add(light); // luz do time em cima
  g.userData.sentry = true; g.userData.hitR = [0.35, 0.42, 0.35];
  return g;
}

export function bomberMesh(team) {
  if (BAL) {
    const g = new THREE.Group(), body = new THREE.Mesh(BAL.geo, balMat(team)); outline(body, 0.03); g.add(body);
    const cb = BAL.basket, cy = (cb.min.y + cb.max.y) / 2, hw = (cb.max.x - cb.min.x) / 2, props = [];
    for (const sx of [-1, 1]) { // braco + motorzinho + helice de cada lado do cesto, empurrando pra frente (-Z)
      const x = sx * (hw + 0.95);
      const arm = ink(geo(THREE.BoxGeometry, 0.95, 0.1, 0.18), PAL.dark, 0.01); arm.position.set(sx * (hw + 0.45), cy, cb.max.z - 0.3); g.add(arm);
      const pod = ink(geo(THREE.CapsuleGeometry, 0.2, 0.55, 4, 10), PAL.dark, 0.02); pod.rotation.x = Math.PI / 2; pod.position.set(x, cy, cb.max.z - 0.3); g.add(pod);
      const p = new THREE.Group(); p.position.set(x, cy, (cb.max.z) + 0.1); for (const a of [0, Math.PI / 2]) { const bl = ink(geo(THREE.BoxGeometry, 0.14, 1.5, 0.06), PAL.wood, 0.015); bl.rotation.z = a; p.add(bl); } g.add(p); props.push(p);
    }
    g.userData.props = props; g.userData.hitR = BAL.envR; // tiro: esfera do envelope (nao o charuto do dirigivel)
    g.scale.setScalar(6);
    return g;
  }
  // mesmo formato do dirigivel (o acerto a tiro usa o elipsoide dele), so que muito maior e cheio de detalhe
  const g = new THREE.Group(), c = TEAMC(team);
  const body = ink(geo(THREE.SphereGeometry, 3, 40, 24), 0xffffff, 0.04, { map: envelopeTex(team) }); body.scale.set(1, 0.8, 2.3); g.add(body);
  // 4 aletas finas em triangulo no rabo (presas no casco)
  for (let i = 0; i < 4; i++) { const f = ink(finGeo(), c, 0.02); const holder = new THREE.Group(); holder.rotation.z = i * Math.PI / 2; f.rotation.y = -Math.PI / 2; f.position.set(0, 0.9, 4.6); holder.add(f); g.add(holder); }
  // gondola de passageiro: cabine clara com janelinhas, nariz redondo, friso do time e 4 hastes ate o casco
  const cab = ink(geo(THREE.BoxGeometry, 1.4, 0.95, 4.2), PAL.paper, 0.03); cab.position.y = -2.75; g.add(cab);
  const nose = ink(geo(THREE.CylinderGeometry, 0.7, 0.7, 0.95, 14, 1, false, 0, Math.PI), PAL.paper, 0.03); nose.position.set(0, -2.75, -2.1); nose.rotation.y = Math.PI / 2; g.add(nose);
  const trim = ink(geo(THREE.BoxGeometry, 1.44, 0.16, 4.24), c, 0); trim.position.y = -3.13; g.add(trim);
  for (const sx of [-0.71, 0.71]) for (let k = 0; k < 5; k++) { const w = ink(geo(THREE.BoxGeometry, 0.04, 0.32, 0.45), PAL.ink, 0); w.position.set(sx, -2.62, -1.5 + k * 0.75); g.add(w); }
  for (const [sx, sz] of [[-0.55, -1.5], [0.55, -1.5], [-0.55, 1.5], [0.55, 1.5]]) { const st = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 0.9, 5), PAL.dark, 0.01); st.position.set(sx, -1.95, sz); g.add(st); }
  // motores laterais com helice
  const props = [];
  for (const x of [-1.5, 1.5]) {
    const pod = ink(geo(THREE.CapsuleGeometry, 0.28, 0.8, 4, 10), PAL.dark, 0.02); pod.rotation.x = Math.PI / 2; pod.position.set(x, -2.3, 1.8); g.add(pod);
    const arm = ink(geo(THREE.BoxGeometry, 0.8, 0.08, 0.2), PAL.dark, 0.01); arm.position.set(x * 0.72, -2.4, 1.8); g.add(arm);
    const p = new THREE.Group(); p.position.set(x, -2.3, 2.45); for (const a of [0, Math.PI / 2]) { const b = ink(geo(THREE.BoxGeometry, 0.1, 1.3, 0.05), PAL.wood, 0.01); b.rotation.z = a; p.add(b); } g.add(p); props.push(p);
  }
  g.userData.props = props;
  g.scale.setScalar(6); // ~80 m de comprimento: cobre o ceu (megalofobia, pedido dele)
  return g;
}

// ---------- fogo no chao (sprites aditivos baratos, textura unica) ----------
let FIRE_TEX;
function fireTex() {
  if (FIRE_TEX) return FIRE_TEX;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (FIRE_TEX = new THREE.CanvasTexture(cv));
}
const RAMP = [new THREE.Color(0xffe066), new THREE.Color(0xff9a1a), new THREE.Color(0xf04a12), new THREE.Color(0x5a1a08)];

export class StrikeView {
  constructor(scene, fx) {
    this.scene = scene; this.fx = fx; this.root = new THREE.Group(); scene.add(this.root);
    this.crafts = new Map(); this.fires = new Map(); this.puffT = 0;
    this.scorchGeo = new THREE.CircleGeometry(2.3, 16); this.scorchMat = new THREE.MeshBasicMaterial({ color: 0x1b1916, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.shadowGeo = new THREE.CircleGeometry(1, 40);
    this.railMat = new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.holeGeo = new THREE.CircleGeometry(3.2, 28); this.holeMat = new THREE.MeshBasicMaterial({ color: 0x0b0a09, polygonOffset: true, polygonOffsetFactor: -4 });
  }

  // chamado a cada estado novo do servidor
  sync(s, floorAt) {
    const seen = new Set();
    for (const f of s.crafts || []) {
      seen.add(f.id);
      let v = this.crafts.get(f.id);
      if (!v) {
        const m = f.k === 'plane' ? planeMesh(f.team) : f.k === 'train' ? trainMesh(f.team) : handMesh();
        if (f.k === 'plane') m.scale.setScalar(1.6); if (f.k === 'hand') m.scale.setScalar(1.8); // de longe precisam ler
        m.position.fromArray(f.pos); if (f.k === 'train') m.visible = false;
        this.root.add(m); v = { m, k: f.k, extra: [] };
        if (f.k === 'train' && f.a) this.buildTrack(v, f, floorAt);
        this.crafts.set(f.id, v);
      }
      v.to = f.pos; v.dir = f.dir; v.warn = f.warn; v.tg = f.tg;
    }
    for (const [id, v] of this.crafts) if (!seen.has(id)) this.drop(id, v);
    const fs = new Set();
    for (const [id, x, y, z, t] of s.fires || []) {
      fs.add(id);
      let f = this.fires.get(id);
      if (!f) { const sc = new THREE.Mesh(this.scorchGeo, this.scorchMat); sc.rotation.x = -Math.PI / 2; sc.position.set(x, y + 0.04, z); this.root.add(sc); f = { pos: [x, y, z], sc, emit: 0 }; this.fires.set(id, f); }
      f.t = t;
    }
    for (const [id, f] of this.fires) if (!fs.has(id)) { this.root.remove(f.sc); this.fires.delete(id); }
  }

  buildTrack(v, f, floorAt) {
    // trilho riscado no chao (vermelho piscando no aviso) + buraco portatil nas duas pontas
    const len = f.len, ang = Math.atan2(f.dir[0], f.dir[1]);
    const mid = [f.a[0] + f.dir[0] * len / 2, f.a[1] + f.dir[1] * len / 2];
    const rail = new THREE.Mesh(new THREE.PlaneGeometry(3.6, len), this.railMat);
    rail.rotation.set(-Math.PI / 2, 0, ang); rail.position.set(mid[0], floorAt(mid[0], mid[1]) + 0.06, mid[1]);
    rail.userData.own = true; this.root.add(rail); v.extra.push(rail);
    for (const end of [0, len]) {
      const x = f.a[0] + f.dir[0] * end, z = f.a[1] + f.dir[1] * end, h = new THREE.Mesh(this.holeGeo, this.holeMat);
      h.rotation.set(-Math.PI / 2, 0, ang); h.scale.set(0.7, 1, 1); h.position.set(x, floorAt(x, z) + 0.07, z); this.root.add(h); v.extra.push(h);
    }
  }

  update(dt, t, blimpMeshes) {
    const fx = this.fx;
    this.puffT -= dt; const puff = this.puffT <= 0; if (puff) this.puffT = 0.08;
    for (const v of this.crafts.values()) {
      const m = v.m;
      if (v.to && v.k === 'hand') this.animHand(v, dt, t);
      else if (v.to) m.position.lerp(new THREE.Vector3().fromArray(v.to), Math.min(1, dt * 10));
      if (v.dir) m.rotation.y = Math.atan2(-v.dir[0], -v.dir[1]); // frente do modelo e -Z
      if (v.k === 'plane') { m.userData.prop.rotation.z += dt * 40; m.rotation.z = Math.sin(t * 2) * 0.12; if (m.userData.scarf) m.userData.scarf.rotation.y = 0.3 + Math.sin(t * 18) * 0.25; if (puff) fx.puff(m.position.clone().addScaledVector(new THREE.Vector3(Math.sin(m.rotation.y), 0, Math.cos(m.rotation.y)), 3).toArray(), 1, 0.25, PAL.light, 0.5); }
      if (v.k === 'train') {
        const go = !(v.warn > 0); m.visible = go;
        for (const e of v.extra) if (e.userData.own) e.material.opacity = go ? 0.5 : 0.4 + Math.abs(Math.sin(t * 10)) * 0.5;
        if (go) { for (const w of m.userData.wheels) w.rotation.x += dt * 14; if (puff) { const st = m.userData.stack.getWorldPosition(new THREE.Vector3()); fx.puff([st.x, st.y + 0.8, st.z], 2, 0.8, PAL.dark, 0.9); } }
      }
    }
    // balao bombardeiro: helices, escotilha piscando e a sombra enorme no chao
    for (const b of blimpMeshes) {
      if (!b.userData.bomber) continue;
      for (const p of b.userData.props) p.rotation.z += dt * 9;
      let sh = b.userData.shadow;
      if (!sh) { sh = b.userData.shadow = new THREE.Mesh(this.shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); sh.rotation.x = -Math.PI / 2; sh.scale.set(20, 44, 1); this.root.add(sh); }
      sh.position.set(b.position.x, 0.08, b.position.z); sh.rotation.z = -b.rotation.y;
    }
    for (const sh of this.root.children.filter(o => o.geometry === this.shadowGeo && !blimpMeshes.some(b => b.userData.shadow === o))) { this.root.remove(sh); sh.material.dispose(); }
    // pocas de fogo: labaredas subindo
    for (const f of this.fires.values()) {
      if ((f.emit -= dt) > 0) continue;
      f.emit = 0.09;
      this.flameSprite([f.pos[0] + (Math.random() - 0.5) * 3, f.pos[1] + 0.2, f.pos[2] + (Math.random() - 0.5) * 3], 0.5 + Math.random() * 0.4, Math.min(1, f.t / 2));
    }
  }

  // Mao do Animador (03/11, pedido dele: descer mais animada, fluida e comica): mola com quique em vez de lerp,
  // estica caindo e amassa freando, balanca, dedos fazendo "tsc tsc", esfrega forte quando apaga alguem
  animHand(v, dt, t) {
    const m = v.m, u = m.userData, H = u.inner, to = new THREE.Vector3().fromArray(v.to);
    if (!u.born) { u.born = t; m.position.set(to.x, to.y + 30, to.z); } // entra la de cima
    const k = 38, damp = 7.5; // mola meio frouxa: passa um tico do ponto e volta (quique de desenho)
    u.vel.addScaledVector(to.clone().sub(m.position), k * dt).multiplyScalar(Math.max(0, 1 - damp * dt));
    m.position.addScaledVector(u.vel, dt);
    const vy = u.vel.y, sp = u.vel.length();
    // estica no sentido do movimento vertical e amassa ao frear
    const st = THREE.MathUtils.clamp(1 + Math.abs(vy) * 0.018, 1, 1.45), sq = 1 / Math.sqrt(st);
    H.scale.lerp(new THREE.Vector3(sq, st, sq), Math.min(1, dt * 12));
    // balanco: inclina pro lado que esta indo + respiro lento
    H.rotation.z = THREE.MathUtils.lerp(H.rotation.z, THREE.MathUtils.clamp(-u.vel.x * 0.03, -0.5, 0.5) + Math.sin(t * 2.2) * 0.12, Math.min(1, dt * 6));
    H.rotation.x = THREE.MathUtils.lerp(H.rotation.x, THREE.MathUtils.clamp(u.vel.z * 0.03, -0.5, 0.5), Math.min(1, dt * 6));
    // dedos: "tsc tsc" parado, fechados correndo
    u.inner.userData.fingers.forEach((f, i) => { f.rotation.x = 1.2 + (sp > 6 ? 0.5 : Math.sin(t * 9 + i * 0.9) * 0.35); });
    // esfregar: perto do alvo esfrega leve; logo depois de apagar, esfrega forte e treme
    u.scrub = Math.max(0, u.scrub - dt);
    const near = sp < 4, amp = u.scrub > 0 ? 0.9 : near ? 0.35 : 0.08;
    const pen = u.inner.userData.pencil; pen.rotation.z = Math.sin(t * (u.scrub > 0 ? 38 : 20)) * amp;
    H.position.x = u.scrub > 0 ? Math.sin(t * 40) * 0.35 : 0;
  }

  // apagou alguem: a mao que mirava nele da a esfregada forte
  erased(id, pos) {
    // o servidor ja pode ter trocado o alvo no mesmo quadro: se ninguem mira nele, vale a mao mais perto de onde ele estava
    const hands = [...this.crafts.values()].filter(v => v.k === 'hand');
    const h = hands.find(v => v.tg === id) || (pos && hands.sort((a, b) => a.m.position.distanceTo(new THREE.Vector3(...pos)) - b.m.position.distanceTo(new THREE.Vector3(...pos)))[0]);
    if (h) h.m.userData.scrub = 0.7;
  }

  flameSprite(pos, size, fade = 1) {
    const mat = new THREE.SpriteMaterial({ map: fireTex(), transparent: true, depthWrite: false, color: RAMP[0], opacity: 0.95 * fade });
    const s = new THREE.Sprite(mat); s.position.fromArray(pos); s.scale.setScalar(size * 0.4);
    const up = 1.6 + Math.random() * 1.4, rot = Math.random() * 6;
    this.fx.add(s, 0.55 + Math.random() * 0.3, (o, k, dt) => {
      o.obj.position.y += up * dt; o.obj.scale.setScalar(size * (0.4 + k * 1.1)); mat.rotation = rot + k;
      const tt = Math.min(2.999, k * 3), j = Math.floor(tt); mat.color.copy(RAMP[j]).lerp(RAMP[j + 1], tt - j);
      mat.opacity = (k > 0.5 ? (1 - k) / 0.5 : 1) * 0.95 * fade;
    }, (o) => o.material.dispose());
  }

  // bola de fogo caindo do balao ate o chao
  fireDrop(o, at) {
    const mat = new THREE.SpriteMaterial({ map: fireTex(), transparent: true, depthWrite: false, color: 0xff9a1a });
    const s = new THREE.Sprite(mat); s.position.fromArray(o); s.scale.setScalar(2.2);
    const a = new THREE.Vector3().fromArray(o), b = new THREE.Vector3().fromArray(at);
    this.fx.add(s, 0.7, (f, k) => { f.obj.position.lerpVectors(a, b, k * k); mat.rotation = k * 6; }, (ob) => { ob.material.dispose(); this.fx.puff(at, 3, 1.2, 0x3a3632, 0.7); for (let i = 0; i < 4; i++) this.flameSprite([at[0] + (Math.random() - 0.5) * 2, at[1] + 0.3, at[2] + (Math.random() - 0.5) * 2], 1.1); });
  }

  // folha de papel cobrindo a tela (Mao do Animador chamada)
  paper() {
    let el = document.getElementById('paperFx');
    if (!el) { el = document.createElement('div'); el.id = 'paperFx'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); }
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  drop(id, v) { this.root.remove(v.m); for (const e of v.extra) { this.root.remove(e); if (e.userData.own) e.geometry.dispose(); } this.crafts.delete(id); } // trilho tem geometria propria

  clear() {
    for (const [id, v] of this.crafts) this.drop(id, v);
    for (const f of this.fires.values()) this.root.remove(f.sc);
    this.crafts.clear(); this.fires.clear();
  }
}
