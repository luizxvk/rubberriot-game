// Chao mortal do Pulo do Gato (19/11, pedido dele: "o chao deve ser tematico, algo que de dano, ele morre e volta pro inicio").
// Cada percurso tem o seu: piche fervendo (Telhados), fosso de brasas (Picadeiro), mar com tubarao (Caixotes), tanque de acido
// (Montagem) e poca de nanquim viva (Nanquim). A superficie fica logo acima da linha de queda (BH_FALL): encostou, morreu.
// Leve: 1 plano com shader animado + 1 lote de bolhas/brasas (InstancedMesh) + barbatanas (so no mar) = 3 a 5 chamadas.
import * as THREE from 'three';
import { ink, geo, mergedKit } from './toon.js';

export const FLOOR = {
  //          [cor funda, cor clara, linha de tinta], bolha, morte (som, palavra)
  telhados: { c: [0x141210, 0x3a3530, 0x6e6656], bub: 0x2a2724, rise: 0, word: 'TSSS!', snd: 'burn', puff: 0x2a2724 },
  picadeiro: { c: [0x8a1e0e, 0xff7a1a, 0xffd23a], bub: 0xffb02e, rise: 1, word: 'FSHH!', snd: 'burn', puff: 0x5a4a40 },
  caixotes: { c: [0x1d4a5e, 0x3e7d96, 0xcfe7ee], bub: 0xe6f4f8, rise: 0, word: 'NHAC!', snd: 'whoosh', puff: 0xe6f4f8, shark: true },
  montagem: { c: [0x2e5a12, 0x8ae02a, 0xd8ff8a], bub: 0x9aff3a, rise: 0, word: 'TSSS!', snd: 'burn', puff: 0x8ae02a },
  nanquim: { c: [0x0c0b0e, 0x2a2433, 0x6a5a8a], bub: 0x3a3048, rise: 0, word: 'GLUP!', snd: 'whoosh', puff: 0x141210 },
};
// nevoa rasteira (19/11, pedido dele: "da a impressao de fundo, sem pesar"): 2 planos com a mesma textura macia, deslizando
// em sentidos opostos. Textura feita uma vez (256 px), 2 chamadas de desenho, nada por quadro alem de mover o uv
const MIST = { telhados: 0xd8cfc0, picadeiro: 0x8a5a48, caixotes: 0xdfeef2, montagem: 0xc8d8b0, nanquim: 0x5a5070 };
let MIST_TEX = null;
function mistTex() {
  if (MIST_TEX) return MIST_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let s = 77; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) { const x = R() * 256, y = R() * 256, r = 20 + R() * 46; for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } } // emenda sem costura
  MIST_TEX = new THREE.CanvasTexture(c); MIST_TEX.wrapS = MIST_TEX.wrapT = THREE.RepeatWrapping;
  return MIST_TEX;
}
export const FLOOR_Y = 1.3; // a queda (BH_FALL 1,6) pega quando o pe passa disto + 0,3: afunda um pouquinho e morre

function surfMat(F) {
  const col = (h) => new THREE.Color(h);
  return new THREE.ShaderMaterial({
    fog: true, uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uT: { value: 0 }, uA: { value: col(F.c[0]) }, uB: { value: col(F.c[1]) }, uC: { value: col(F.c[2]) } },
    vertexShader: `varying vec2 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 vW; uniform float uT; uniform vec3 uA, uB, uC;
      #include <fog_pars_fragment>
      void main(){
        vec2 p = vW * 0.18;
        float w = sin(p.x * 1.7 + uT * 0.9) + sin(p.y * 1.3 - uT * 0.7) + sin((p.x + p.y) * 0.9 + uT * 1.3) * 0.7;
        float band = fract(w * 0.55);
        vec3 c = mix(uA, uB, smoothstep(0.15, 0.85, w * 0.25 + 0.5));
        c = mix(c, uC, smoothstep(0.93, 0.97, band) * 0.85); // risquinho de desenho nas cristas
        gl_FragColor = vec4(c, 1.0);
      #include <fog_fragment>
      }`,
  });
}
function finParts() { // barbatana: cunha preta com a pontinha clara
  const g = new THREE.Group();
  const f = ink(geo(THREE.ConeGeometry, 0.55, 1.4, 3), 0x2a3a44, 0.04); f.scale.set(0.35, 1, 1); f.position.y = 0.5; g.add(f);
  return g;
}

export class BhFloor {
  constructor(scene, M) {
    const sk = M.bh?.skin || 'telhados', F = this.F = FLOOR[sk] || FLOOR.telhados;
    this.root = new THREE.Group(); scene.add(this.root);
    const S = M.arena * 2 + 140;
    this.mat = surfMat(F);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(S, S), this.mat); surf.rotation.x = -Math.PI / 2; surf.position.y = FLOOR_Y; surf.raycast = () => {};
    this.root.add(surf); this.surf = surf;
    // bolhas (ou brasas subindo no Picadeiro), sempre perto do percurso: nascem em volta das plataformas
    const N = 90, bg = new THREE.IcosahedronGeometry(1, 0);
    this.bub = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: F.bub }), N); this.bub.frustumCulled = false; this.bub.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.bub);
    const pts = M.boxes.filter(b => b.kind?.startsWith?.('bh')).map(b => [(b.min[0] + b.max[0]) / 2, (b.min[2] + b.max[2]) / 2]);
    let s = 9137; const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    this.b = Array.from({ length: N }, () => { const q = pts[Math.floor(R() * pts.length)] || [0, 0]; return { x: q[0] + (R() - 0.5) * 9, z: q[1] + (R() - 0.5) * 9, t: R() * 3, life: 1.2 + R() * 1.6, s: 0.12 + R() * 0.3 }; });
    this.R = R; this.pts = pts;
    if (F.shark) { // tubaroes rondando as plataformas
      this.fins = Array.from({ length: 6 }, (_, i) => { const m = mergedKit('bh_fin', finParts); const q = pts[Math.floor(R() * pts.length)] || [0, 0]; m.userData = { cx: q[0], cz: q[1], r: 4 + R() * 3, w: (0.5 + R() * 0.4) * (i % 2 ? 1 : -1), a: R() * 6.28 }; this.root.add(m); return m; });
    }
    this.mist = [0.55, 1.5].map((h, i) => {
      const tex = mistTex().clone(); tex.needsUpdate = true; tex.repeat.set(S / (i ? 60 : 38), S / (i ? 60 : 38));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ map: tex, color: MIST[sk] || 0xffffff, transparent: true, opacity: i ? 0.5 : 0.8, depthWrite: false, fog: true }));
      m.rotation.x = -Math.PI / 2; m.position.y = FLOOR_Y + h; m.renderOrder = 1; m.raycast = () => {}; this.root.add(m); return m;
    });
    this.D = new THREE.Object3D();
  }
  update(dt, t) {
    this.mat.uniforms.uT.value = t;
    for (let i = 0; i < this.mist.length; i++) { const o = this.mist[i].material.map.offset; o.x = t * (i ? -0.004 : 0.006); o.y = t * (i ? 0.003 : 0.002); }
    const D = this.D, F = this.F;
    for (let i = 0; i < this.b.length; i++) {
      const B = this.b[i]; B.t += dt;
      if (B.t > B.life) { const q = this.pts[Math.floor(this.R() * this.pts.length)] || [0, 0]; B.x = q[0] + (this.R() - 0.5) * 9; B.z = q[1] + (this.R() - 0.5) * 9; B.t = 0; }
      const k = B.t / B.life;
      if (F.rise) { D.position.set(B.x + Math.sin(B.t * 3 + i) * 0.3, FLOOR_Y + k * 4, B.z); D.scale.setScalar(B.s * 0.5 * (1 - k)); } // brasa subindo e apagando
      else { const sc = B.s * (k < 0.85 ? k / 0.85 : (1 - k) / 0.15 * 1.3); D.position.set(B.x, FLOOR_Y + sc * 0.3, B.z); D.scale.set(sc, sc * 0.7, sc); } // bolha crescendo e estourando
      D.updateMatrix(); this.bub.setMatrixAt(i, D.matrix);
    }
    this.bub.instanceMatrix.needsUpdate = true;
    if (this.fins) for (const m of this.fins) { const u = m.userData; u.a += u.w * dt * 0.5; m.position.set(u.cx + Math.cos(u.a) * u.r, FLOOR_Y - 0.1 + Math.sin(t * 2 + u.r) * 0.05, u.cz + Math.sin(u.a) * u.r); m.rotation.y = -u.a + (u.w > 0 ? Math.PI : 0); }
  }
  dispose() { for (const m of this.mist) { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); } this.root.parent?.remove(this.root); this.mat.dispose(); this.surf.geometry.dispose(); this.bub.geometry.dispose(); this.bub.material.dispose(); }
}
