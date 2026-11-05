// Chaveiro pendurado na arma (05/11, pedido dele): modelo do Tripo (public/models/src/charm_<id>.glb), balanca com o movimento da arma.
// So desenho: nao muda nada no tiro. Serve pro boneco, pra primeira pessoa e pra previa da Loja.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { toon, outline } from './toon.js';

const LOAD = new Map(), loader = new GLTFLoader();
const CHARM = { station: 0.55, high: 0.97, minL: 0.7, maxL: 1.3, cord: 0.05, size: 0.058, tilt: 0.5 }; // onde e de que tamanho: mexer so aqui
function model(id) {
  if (!LOAD.has(id)) LOAD.set(id, loader.loadAsync(import.meta.env.BASE_URL + `models/src/charm_${id}.glb`).then((gl) => {
    const meshes = []; gl.scene.traverse(o => { if (o.isMesh) meshes.push(o); }); if (!meshes.length) return null;
    gl.scene.updateMatrixWorld(true);
    const mesh = meshes[0], textured = meshes.length === 1 && !!mesh.material?.map;
    // varias pecas ou sem textura: junta tudo numa malha so, com a cor de cada peca no vertice
    const col = new THREE.Color(), parts = textured ? null : meshes.map(o => { let p = o.geometry.clone().applyMatrix4(o.matrixWorld); if (p.index) p = p.toNonIndexed(); for (const k of Object.keys(p.attributes)) if (k !== 'position' && k !== 'normal') p.deleteAttribute(k); if (!p.attributes.normal) p.computeVertexNormals(); col.copy(o.material?.color || col.set(0xffffff)); const n = p.attributes.position.count, C = new Float32Array(n * 3); for (let i = 0; i < n; i++) { C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b; } p.setAttribute('color', new THREE.BufferAttribute(C, 3)); return p; });
    const g = textured ? mesh.geometry.clone().applyMatrix4(mesh.matrixWorld) : mergeGeometries(parts); g.computeBoundingBox(); const b = g.boundingBox, s = b.getSize(new THREE.Vector3()), k = 1 / Math.max(s.x, s.y, s.z);
    // o fio entra no ponto mais alto de verdade do modelo (o meio da caixa podia cair no vazio e o fio ficava solto)
    const P = g.attributes.position, lim = b.max.y - s.y * 0.05; let tx = 0, tz = 0, tn = 0;
    for (let i = 0; i < P.count; i++) if (P.getY(i) >= lim) { tx += P.getX(i); tz += P.getZ(i); tn++; }
    g.translate(-tx / tn, -b.max.y, -tz / tn); g.scale(k, k, k); // 1 de tamanho, pendurado pelo topo
    const map = textured ? mesh.material.map : null; if (map) map.colorSpace = THREE.SRGBColorSpace;
    return { geo: g, mat: textured ? toon(0xffffff, { map }) : toon(0xffffff, { unique: true, vertexColors: true }) };
  }).catch(e => { console.warn('chaveiro', id, e); return null; }));
  return LOAD.get(id);
}
const cordGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 5).translate(0, -0.5, 0), cordMat = new THREE.MeshBasicMaterial({ color: 0xc9c3b6 });

const ringGeo = new THREE.TorusGeometry(1, 0.32, 6, 12);
const ray = new THREE.Raycaster(), RO = new THREE.Vector3(), RD = new THREE.Vector3();
// lança um raio de fora pra dentro, em (y, z) da arma, e devolve o ponto na superficie do corpo (espaco da arma)
function hitBody(gun, body, x0, dir, y, z) {
  RO.set(x0, y, z).applyMatrix4(gun.matrixWorld); RD.set(dir, 0, 0).transformDirection(gun.matrixWorld);
  ray.set(RO, RD); ray.far = Infinity; const h = ray.intersectObject(body, false)[0];
  return h ? gun.worldToLocal(h.point.clone()) : null;
}
// pendura o chaveiro NA arma, estilo Call of Duty (05/11, pedido dele). side -1 = lado esquerdo da arma, o que quem atira ve em primeira pessoa;
// +1 = lado direito, o que a vitrine mostra. O ponto de encaixe sai de um raio contra a malha do corpo, entre as duas maos, e o fio comeca exatamente nele
export function attachCharm(gun, id, side = -1) {
  if (!gun) return;
  if (gun.userData.charm) { gun.remove(gun.userData.charm.root); gun.userData.charm = null; }
  if (!id || id === 'none' || gun.userData.noCharm) return;
  gun.updateWorldMatrix(true, true);
  // medida no espaco da propria arma, peca por peca: pela caixa do mundo, arma girada dava uma caixa inflada
  const inv = gun.matrixWorld.clone().invert(), box = new THREE.Box3(), part = new THREE.Box3(), rel = new THREE.Matrix4(); let body = null, big = 0;
  gun.traverse(o => {
    if (!o.isMesh || !o.geometry || o.userData.noFx || o.material?.isShaderMaterial || o.material?.transparent || o.material?.side === THREE.BackSide) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    part.copy(o.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); box.union(part);
    const sz = part.getSize(RO).length(); if (sz > big) { big = sz; body = o; }
  });
  if (!body) return;
  const size = box.getSize(new THREE.Vector3()), L = Math.max(size.x, size.y, size.z), u = gun.userData;
  const zR = u.gripR?.position.z ?? box.max.z - size.z * 0.35, zL = u.gripL?.position.z ?? zR - size.z * 0.3, x0 = side < 0 ? box.min.x - 1 : box.max.x + 1, dir = -side;
  // lateral alta do corpo, perto de quem atira (o braco esquerdo passa por baixo). Arma curta (pistola): um pouco a frente do cabo
  const long = Math.abs(zL - zR) > size.z * 0.2; let zs = 0, lo = null, hi = null;
  // arma curta sem malha nesse ponto: vai recuando ate achar o corpo
  for (let k = CHARM.station; k > 0 && lo === null; k -= 0.1) {
    zs = long ? zR + (zL - zR) * k : zR - size.z * 0.18;
    for (let i = 0; i <= 14; i++) { const y = box.min.y + size.y * (i / 14); if (hitBody(gun, body, x0, dir, y, zs)) { lo ??= y; hi = y; } }
    if (!long) break;
  }
  // na parte de cima do corpo: o fio desce pelo lado da arma, longe do pente e da mao
  const y = lo === null ? box.min.y + size.y * 0.6 : lo + (hi - lo) * CHARM.high, at = hitBody(gun, body, x0, dir, y, zs) || new THREE.Vector3(side < 0 ? box.min.x : box.max.x, y, zs);
  const S = THREE.MathUtils.clamp(L, CHARM.minL, CHARM.maxL), len = S * CHARM.cord, root = new THREE.Group(); root.position.copy(at);
  const ring = new THREE.Mesh(ringGeo, cordMat); ring.scale.setScalar(S * 0.006); ring.rotation.y = Math.PI / 2; root.add(ring); // argola presa na arma
  const swing = new THREE.Group(); root.add(swing);
  const cord = new THREE.Mesh(cordGeo, cordMat); cord.scale.set(S * 0.0028, len, S * 0.0028); swing.add(cord);
  root.traverse(o => { o.userData.noFx = true; });
  gun.add(root);
  const C = gun.userData.charm = { id, side, root, swing, tilt: side * CHARM.tilt, ax: 0, az: 0, vx: 0, vz: 0, last: null };
  swing.rotation.z = C.tilt;
  model(id).then((M) => { if (!M || gun.userData.charm !== C) return; const m = new THREE.Mesh(M.geo, M.mat); m.position.y = -len + S * 0.006; m.scale.setScalar(S * CHARM.size); outline(m, 0.006); m.userData.noFx = true; swing.add(m); });
}
const P = new THREE.Vector3(), Q = new THREE.Quaternion(), D = new THREE.Vector3();
// pendulo: a arma anda pra um lado, o chaveiro atrasa e volta balancando
export function tickCharm(gun, dt) {
  const C = gun?.userData.charm; if (!C || !(dt > 0)) return;
  C.root.getWorldPosition(P); C.root.getWorldQuaternion(Q);
  if (C.last) {
    D.copy(P).sub(C.last).applyQuaternion(Q.invert());
    const k = Math.min(1, 1 / Math.max(0.2, gun.scale.x)) * 26; // quanto o movimento empurra
    C.vz += D.x * k; C.vx -= D.z * k;
  } else C.last = new THREE.Vector3();
  C.last.copy(P);
  const sp = 70, dm = 5.5;
  C.vx += (-sp * C.ax - dm * C.vx) * dt; C.vz += (-sp * C.az - dm * C.vz) * dt;
  C.ax = Math.max(-1, Math.min(1, C.ax + C.vx * dt)); C.az = Math.max(-1, Math.min(1, C.az + C.vz * dt));
  C.swing.rotation.set(C.ax, 0, C.tilt + C.az);
}
