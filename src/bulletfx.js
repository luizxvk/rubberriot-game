// Balas em lote (19/11, pedido dele: "atirar com tracado de efeito derruba muito o FPS").
// Antes cada bala era 3 malhas (miolo + contorno + brilho), cada uma uma chamada de desenho transparente, ordenada e com troca
// de programa entre uma e outra: 36 balas no ar = ~150 chamadas e +1,1 a 1,9 ms por quadro (medido em quadro congelado).
// Agora TODAS as balas do quadro saem em 4 chamadas fixas: contorno, brilho, miolo liso (giz/plasma) e miolo com efeito
// (o shader de cada estilo escolhe o desenho pelo atributo aS da propria bala). O visual e o mesmo de antes.
import * as THREE from 'three';

const MAX = 384;
const DUM = new THREE.Object3D(), M4 = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), S = new THREE.Vector3();

// liso: cor + transparencia por bala (contorno, brilho, giz e plasma); entra na nevoa como o MeshBasicMaterial de antes
export function flatMat(side) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side, fog: true,
    uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    vertexShader: `attribute vec4 aC; varying vec4 vC;
      #include <fog_pars_vertex>
      void main(){ vC = aC; vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec4 vC;
      #include <fog_pars_fragment>
      void main(){ gl_FragColor = vC;
      #include <fog_fragment>
      }`,
  });
}

// miolo com efeito: o mesmo shader dos estilos (world.js tracerMaterial), com uK/uLen/uS vindo por bala
function fxMat(src) {
  const vs = src.vertexShader.replace('varying vec2 vUv; uniform float uS; uniform float uK; uniform float uLen;', 'varying vec2 vUv; attribute vec3 aT; varying vec3 vT;')
    .replace('void main(){ vUv = uv;', 'void main(){ vUv = uv; vT = aT; float uK = aT.x, uLen = aT.y, uS = aT.z;')
    .replace('modelViewMatrix * vec4(p, 1.0)', 'modelViewMatrix * instanceMatrix * vec4(p, 1.0)');
  const fs = src.fragmentShader.replace('varying vec2 vUv; uniform float uK; uniform float uLen; uniform float uS;', 'varying vec2 vUv; varying vec3 vT;')
    .replace('void main(){', 'void main(){ float uK = vT.x, uLen = vT.y, uS = vT.z;');
  if (vs === src.vertexShader || fs === src.fragmentShader) console.warn('[bulletfx] shader do tracado mudou: conferir fxMat');
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: vs, fragmentShader: fs });
}

function layer(geo, mat, n, order) {
  const m = new THREE.InstancedMesh(geo, mat, MAX);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const a = new THREE.InstancedBufferAttribute(new Float32Array(MAX * n), n); a.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute(n === 4 ? 'aC' : 'aT', a);
  m.frustumCulled = false; m.renderOrder = order; m.count = 0; m.raycast = () => {};
  return m;
}

export class BulletBatch {
  // geo = o cilindro de sempre (eixo +z, 0..1); srcMat = material de um estilo qualquer (so pra copiar o shader)
  constructor(scene, geo, srcMat) {
    this.scene = scene; this.b = [];
    // cada camada precisa da propria geometria (o atributo por bala mora nela); a posicao e a mesma
    const g = () => { const c = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) c.setAttribute(k, geo.attributes[k]); c.setIndex(geo.index); return c; };
    this.ink = layer(g(), flatMat(THREE.BackSide), 4, 0);
    this.halo = layer(g(), flatMat(THREE.DoubleSide), 4, 2);
    this.flat = layer(g(), flatMat(THREE.FrontSide), 4, 3);
    this.fx = layer(g(), fxMat(srcMat), 3, 3);
    this.all = [this.ink, this.halo, this.flat, this.fx];
  }
  // o = bala: { a, dir, len, seg, speed, fly, tail, w, sIdx (estilo do shader ou -1), col (miolo liso), ink, glow, t }
  add(o) {
    DUM.position.set(0, 0, 0); DUM.lookAt(o.dir); o.q = DUM.quaternion.clone(); o.t = 0;
    if (this.b.length >= MAX) this.b.shift(); // muita bala no ar: a mais velha sai
    this.b.push(o);
  }
  update(dt) {
    for (const m of this.all) if (m.parent !== this.scene) this.scene.add(m); // cena limpa na troca de mapa: volta
    let ni = 0, nh = 0, nf = 0, nx = 0;
    const I = this.ink.geometry.attributes.aC.array, Hh = this.halo.geometry.attributes.aC.array, F = this.flat.geometry.attributes.aC.array, X = this.fx.geometry.attributes.aT.array;
    for (let i = this.b.length - 1; i >= 0; i--) {
      const o = this.b[i]; o.t += dt;
      const life = o.fly + o.tail; if (o.t >= life) { this.b.splice(i, 1); continue; }
    }
    for (const o of this.b) {
      const d = Math.min(o.len, o.t * o.speed), s = Math.max(0, d - o.seg), L = Math.max(0.01, d - s);
      const fade = o.t > o.fly ? (o.t - o.fly) / o.tail : 0;
      V.copy(o.a).addScaledVector(o.dir, s);
      let op = 1;
      if (o.sIdx < 0) { op = Math.ceil((1 - fade) * 8) / 8; if (op <= 0.001) continue; } // giz/plasma: os mesmos 8 degraus de antes; apagou = some inteira
      const set = (mesh, k, wk) => { S.set(o.w * wk, o.w * wk, L); M4.compose(V, o.q, S); mesh.setMatrixAt(k, M4); };
      set(this.ink, ni, 1.6); I.set(o.ink, ni * 4); ni++;
      if (o.glow) { set(this.halo, nh, 2.8); Hh.set(o.glow, nh * 4); nh++; }
      if (o.sIdx < 0) { set(this.flat, nf, 1); F[nf * 4] = o.col[0]; F[nf * 4 + 1] = o.col[1]; F[nf * 4 + 2] = o.col[2]; F[nf * 4 + 3] = op; nf++; }
      else { set(this.fx, nx, 1); X[nx * 3] = 0.15 + fade * 0.85; X[nx * 3 + 1] = o.seg; X[nx * 3 + 2] = o.sIdx; nx++; }
    }
    const fin = (m, n, a) => { m.count = n; m.visible = n > 0; if (n) { m.instanceMatrix.needsUpdate = true; a.needsUpdate = true; a.addUpdateRange?.(0, n * a.itemSize); m.instanceMatrix.addUpdateRange?.(0, n * 16); } };
    fin(this.ink, ni, this.ink.geometry.attributes.aC); fin(this.halo, nh, this.halo.geometry.attributes.aC); fin(this.flat, nf, this.flat.geometry.attributes.aC); fin(this.fx, nx, this.fx.geometry.attributes.aT);
  }
}
