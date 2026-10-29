// Efeito FORA da arma das camuflagens lendarias (o desenho da superficie fica no shader de camos.js).
//   flame = chamas de desenho subindo do dorso (3 faixas de cor chapada)
//   storm = arcos eletricos pulando entre pontos da arma + faiscas
//   drip  = gotas de nanquim crescendo embaixo e pingando
//   stars = estrelinhas de desenho girando em volta (a "tontura" de quem levou pancada)
// O efeito e filho da arma (anda junto) e e atualizado por updateCamoFx() a cada quadro. Pequeno de proposito
// (nao pode atrapalhar a vista) e some quando a arma tem userData.fxHidden (mirando).
import * as THREE from 'three';

const live = new Set();

// pontos sorteados na superficie da arma, no espaco local dela
function sampleGun(gun, n) {
  gun.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  const meshes = [];
  gun.traverse(o => { if (o.isMesh && o.geometry?.attributes?.position && !o.userData.noFx) meshes.push(o); });
  const pts = [];
  if (!meshes.length) return pts;
  for (let i = 0; i < n; i++) {
    const o = meshes[Math.floor(Math.random() * meshes.length)], pos = o.geometry.attributes.position;
    v.fromBufferAttribute(pos, Math.floor(Math.random() * pos.count));
    m.multiplyMatrices(inv, o.matrixWorld); v.applyMatrix4(m);
    pts.push(v.clone());
  }
  return pts;
}

const VERT = /* glsl */`
attribute float aSize; attribute float aAge; attribute float aSeed;
uniform float uVH;
varying float vAge; varying float vSeed;
void main() {
  vAge = aAge; vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = length(modelViewMatrix[0].xyz);
  // perspectiva divide pela distancia; ortografica (arsenal, foto) nao
  float persp = projectionMatrix[3][3] < 0.5 ? max(0.05, -mv.z) : 1.0;
  // teto: nunca passa de ~3% da altura da tela (nao pode tapar a vista)
  gl_PointSize = min(aSize * s * projectionMatrix[1][1] * uVH * 0.5 / persp, uVH * 0.03);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = {
  // gota de fogo em 3 faixas chapadas (branco-amarelo, laranja, vermelho) com contorno de tinta
  flame: /* glsl */`
varying float vAge; varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0; q.y = -q.y;
  float d = length(vec2(q.x * (1.3 + q.y * 0.5), q.y + 0.15));
  if (d > 1.0) discard;
  float k = d + vAge * 0.9;
  vec3 c = k < 0.55 ? vec3(1.0, 0.95, 0.65) : k < 0.95 ? vec3(1.0, 0.62, 0.08) : vec3(0.85, 0.14, 0.03);
  if (d > 0.86) c = vec3(0.08, 0.03, 0.02);
  gl_FragColor = vec4(c, 1.0 - smoothstep(0.75, 1.0, vAge));
}`,
  // faisca: ponto azul com miolo branco
  spark: /* glsl */`
varying float vAge; varying float vSeed;
void main() {
  float d = length(gl_PointCoord * 2.0 - 1.0);
  if (d > 1.0) discard;
  vec3 c = mix(vec3(1.0), vec3(0.35, 0.8, 1.0), smoothstep(0.2, 0.7, d));
  gl_FragColor = vec4(c, (1.0 - d) * (1.0 - vAge));
}`,
  // gota de nanquim com reflexo branco
  drip: /* glsl */`
varying float vAge; varying float vSeed;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0; q.y = -q.y;
  float d = length(vec2(q.x * (1.0 + max(0.0, q.y) * 0.9), q.y));
  if (d > 1.0) discard;
  vec3 c = vec3(0.03, 0.025, 0.04);
  if (length(q - vec2(-0.32, 0.25)) < 0.2) c = vec3(0.92);
  gl_FragColor = vec4(c, 1.0 - smoothstep(0.85, 1.0, vAge));
}`,
  // estrela de 5 pontas amarela com contorno de tinta, girando
  stars: /* glsl */`
varying float vAge; varying float vSeed;
float star(vec2 p, float r, float rf) {
  float an = 3.14159 / 5.0, a = atan(p.x, p.y) + vAge * 6.2832 * 0.5 + vSeed * 6.0;
  float m = mod(a, 2.0 * an) - an;
  vec2 q = length(p) * vec2(cos(m), abs(sin(m)));
  vec2 k = vec2(cos(an), sin(an)) * r, e = vec2(rf * r, 0.0);
  vec2 ba = k - e, pa = q - e;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) * sign(pa.x * ba.y - pa.y * ba.x);
}
void main() {
  float d = star(gl_PointCoord * 2.0 - 1.0, 0.92, 0.45);
  if (d > 0.0) discard;
  vec3 c = d > -0.12 ? vec3(0.08, 0.06, 0.04) : mix(vec3(1.0, 0.82, 0.2), vec3(1.0, 0.97, 0.75), smoothstep(-0.3, -0.6, d));
  gl_FragColor = vec4(c, 1.0);
}`,
};

function points(n, frag, blending) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAge', new THREE.BufferAttribute(new Float32Array(n), 1));
  const seed = new Float32Array(n); for (let i = 0; i < n; i++) seed[i] = Math.random();
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, blending, uniforms: { uVH: { value: 800 } } });
  const p = new THREE.Points(g, mat);
  p.frustumCulled = false; p.renderOrder = 3; p.userData.noFx = true;
  return p;
}

// liga o efeito na arma (chamado pelo buildGun quando a camuflagem tem fx)
export function attachCamoFx(gun, kind) {
  const S = sampleGun(gun, 160);
  if (S.length < 8) return;
  const box = new THREE.Box3().setFromPoints(S), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const L = Math.max(size.x, size.y, size.z);
  const top = S.filter(p => p.y > mid.y), bot = S.filter(p => p.y < mid.y);
  const root = new THREE.Group(); root.userData.noFx = true;
  const fx = { kind, root, L, t: Math.random() * 10, idle: 0 };

  if (kind === 'flame' || kind === 'drip') {
    const n = kind === 'flame' ? 26 : 8, src = (kind === 'flame' ? top : bot).length ? (kind === 'flame' ? top : bot) : S;
    const P = points(n, FRAG[kind], THREE.NormalBlending);
    const parts = Array.from({ length: n }, () => ({ base: src[Math.floor(Math.random() * src.length)], age: Math.random(), life: 0.6 + Math.random() * 0.6, sx: (Math.random() - 0.5) }));
    fx.tick = (dt) => {
      const pos = P.geometry.attributes.position.array, sz = P.geometry.attributes.aSize.array, ag = P.geometry.attributes.aAge.array;
      parts.forEach((q, i) => {
        q.age += dt / q.life;
        if (q.age >= 1) { q.age = 0; q.base = src[Math.floor(Math.random() * src.length)]; q.sx = Math.random() - 0.5; }
        const a = q.age;
        if (kind === 'flame') {
          // sobe e balanca; nasce grande e afina
          pos[i * 3] = q.base.x + Math.sin(a * 9 + q.sx * 20) * L * 0.008;
          pos[i * 3 + 1] = q.base.y + a * L * 0.09;
          pos[i * 3 + 2] = q.base.z + q.sx * L * 0.015;
          sz[i] = L * (0.04 * (1 - a * 0.7));
        } else {
          // gota: cresce pendurada (60% da vida) e depois cai acelerando
          const hang = Math.min(1, a / 0.6), fall = Math.max(0, a - 0.6) / 0.4;
          pos[i * 3] = q.base.x; pos[i * 3 + 2] = q.base.z;
          pos[i * 3 + 1] = q.base.y - L * 0.006 - fall * fall * L * 0.22;
          sz[i] = L * 0.024 * (0.35 + hang * 0.65);
        }
        ag[i] = kind === 'drip' ? Math.max(0, a - 0.6) / 0.4 : a;
      });
      P.geometry.attributes.position.needsUpdate = true; P.geometry.attributes.aSize.needsUpdate = true; P.geometry.attributes.aAge.needsUpdate = true;
    };
    fx.mats = [P.material];
    root.add(P);
  }

  if (kind === 'storm') {
    // arcos: 3 raios quebrados entre pontos da arma (ou saindo dela), redesenhados ~14 vezes por segundo
    const ARCS = 2, SEG = 6;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARCS * SEG * 2 * 3), 3));
    const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false; line.renderOrder = 3; line.userData.noFx = true;
    const SP = points(24, FRAG.spark, THREE.AdditiveBlending);
    const sparks = Array.from({ length: 24 }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), age: 1 }));
    let next = 0;
    fx.tick = (dt) => {
      next -= dt;
      if (next <= 0) {
        next = 0.05 + Math.random() * 0.06;
        const a = g.attributes.position.array; let k = 0;
        for (let i = 0; i < ARCS; i++) {
          const A = S[Math.floor(Math.random() * S.length)];
          const B = Math.random() < 0.8 ? S[Math.floor(Math.random() * S.length)]
            : A.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(L * 0.12));
          let prev = A.clone();
          for (let s = 1; s <= SEG; s++) {
            const f = s / SEG, cur = A.clone().lerp(B, f);
            if (s < SEG) cur.add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(L * 0.025));
            a[k++] = prev.x; a[k++] = prev.y; a[k++] = prev.z; a[k++] = cur.x; a[k++] = cur.y; a[k++] = cur.z;
            prev = cur;
          }
          // faisca saindo da ponta
          const sp = sparks.find(x => x.age >= 1);
          if (sp) { sp.p.copy(B); sp.v.set(Math.random() - 0.5, Math.random() * 0.6, Math.random() - 0.5).multiplyScalar(L * 0.4); sp.age = 0; }
        }
        g.attributes.position.needsUpdate = true;
        line.material.opacity = 0.55 + Math.random() * 0.45;
        line.visible = Math.random() > 0.12;
      }
      const pos = SP.geometry.attributes.position.array, sz = SP.geometry.attributes.aSize.array, ag = SP.geometry.attributes.aAge.array;
      sparks.forEach((q, i) => {
        if (q.age < 1) { q.age += dt * 3; q.v.y -= L * 2.5 * dt; q.p.addScaledVector(q.v, dt); }
        pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.p.y; pos[i * 3 + 2] = q.p.z;
        sz[i] = q.age < 1 ? L * 0.016 : 0; ag[i] = Math.min(1, q.age);
      });
      SP.geometry.attributes.position.needsUpdate = true; SP.geometry.attributes.aSize.needsUpdate = true; SP.geometry.attributes.aAge.needsUpdate = true;
    };
    fx.mats = [SP.material];
    root.add(line, SP);
  }

  if (kind === 'stars') {
    // 5 estrelas numa orbita inclinada em cima da arma
    const n = 4, P = points(n, FRAG.stars, THREE.NormalBlending);
    const c = mid.clone().add(new THREE.Vector3(0, size.y * 0.55 + L * 0.02, 0));
    fx.tick = () => {
      const pos = P.geometry.attributes.position.array, sz = P.geometry.attributes.aSize.array, ag = P.geometry.attributes.aAge.array;
      for (let i = 0; i < n; i++) {
        const a = fx.t * 2.2 + i / n * Math.PI * 2;
        pos[i * 3] = c.x + Math.sin(a) * L * 0.08;
        pos[i * 3 + 1] = c.y + Math.cos(a * 2) * L * 0.01;
        pos[i * 3 + 2] = c.z + Math.cos(a) * L * 0.22;
        sz[i] = L * (0.032 + 0.008 * Math.sin(a));
        ag[i] = (fx.t * 0.5 + i * 0.2) % 1;
      }
      P.geometry.attributes.position.needsUpdate = true; P.geometry.attributes.aSize.needsUpdate = true; P.geometry.attributes.aAge.needsUpdate = true;
    };
    fx.mats = [P.material];
    root.add(P);
  }

  gun.add(root);
  gun.userData.camoFx = fx;
  fx.tick(0.4); // ja nasce com particula no lugar (foto de desbloqueio, primeiro quadro)
  live.add(fx);
}

// chamado todo quadro: so anima o que esta numa cena; o que sumiu de cena por ~2 s sai da lista
export function updateCamoFx(dt) {
  const vh = innerHeight * Math.min(2, devicePixelRatio || 1);
  for (const fx of live) {
    let o = fx.root; while (o.parent) o = o.parent;
    if (!o.isScene) { if ((fx.idle += dt) > 2) live.delete(fx); continue; }
    fx.idle = 0; fx.t += dt;
    fx.root.visible = !(fx.root.parent?.userData.fxHidden);
    for (const m of fx.mats) m.uniforms.uVH.value = vh;
    fx.tick(dt);
  }
}
