// Gancho do Palco (13/11, pedido dele: gancho estilo Titanfall, tematico). O gancho de bengala do vaudeville que puxava o
// artista pra fora do palco: corda de BORRACHA (balanca solta enquanto voa e estica quando prende), cabeca de bengala com
// faixa vermelha, e o marcador da ponta mirada (verde = alcanca, vermelho = longe demais), desenhado por cima de tudo.
import * as THREE from 'three';

const OUT = 0.14; // s da cabeca voando ate a ponta (o mesmo HOOK_OUT do player.js)
const ROPE_R = 0.022, SEG = 18;
let HEAD_GEO = null;
function headGeo() {
  if (HEAD_GEO) return HEAD_GEO;
  // bengala: meia-volta (o gancho) + cabo curto. O cabo aponta pra tras (+z), o gancho abre pra frente
  const hook = new THREE.TorusGeometry(0.13, 0.032, 6, 14, Math.PI); hook.rotateY(Math.PI / 2); hook.translate(0, 0.13, -0.02);
  const shaft = new THREE.CylinderGeometry(0.032, 0.032, 0.34, 8); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, 0.15);
  const band = new THREE.CylinderGeometry(0.038, 0.038, 0.06, 8); band.rotateX(Math.PI / 2); band.translate(0, 0, 0.05);
  HEAD_GEO = { hook, shaft, band };
  return HEAD_GEO;
}
function makeHead() {
  const G = headGeo(), g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x141210 }), red = new THREE.MeshBasicMaterial({ color: 0xd8322a });
  g.add(new THREE.Mesh(G.hook, dark), new THREE.Mesh(G.shaft, dark), new THREE.Mesh(G.band, red));
  return g;
}

export function makeHookView(scene, camera) {
  const ropeMat = new THREE.MeshBasicMaterial({ color: 0x141210 });
  const ropes = []; // { from(): Vector3, to: Vector3, t, out, end, mesh, head, self }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  // marcador da ponta (13/11 b, pedido dele: icone do gancho que chame atencao, sem tapar a mira). Selo redondo com o gancho e uma
  // setinha embaixo apontando a beirada: o selo fica ACIMA do ponto (o centro da mira continua livre). Tamanho fixo na tela;
  // a textura e branca + tinta: a cor do material pinta o selo (verde alcanca, vermelho longe), o gancho e o contorno ficam escuros
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.lineJoin = 'round'; x.fillStyle = '#fff'; x.strokeStyle = '#141210'; x.lineWidth = 9;
    x.beginPath(); x.moveTo(50, 118); x.lineTo(64, 152); x.lineTo(78, 118); x.closePath(); x.fill(); x.stroke(); // setinha
    x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2); x.fill(); x.stroke(); // selo
    x.save(); x.translate(64 - 40, 64 - 40); x.scale(80 / 24, 80 / 24); x.fillStyle = '#141210';
    x.fill(new Path2D('M19 9c0-1.3-.84-2.4-2-2.82V2h-2v4.18C13.84 6.6 13 7.7 13 9s.84 2.4 2 2.82V15c0 2.21-1.79 4-4 4s-4-1.79-4-4v-1h3L5 9v6c0 3.31 2.69 6 6 6s6-2.69 6-6v-3.18c1.16-.42 2-1.52 2-2.82zm-3 1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z')); x.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const mkMat = new THREE.SpriteMaterial({ map: tex, color: 0x3dd68c, depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false });
  const mk = new THREE.Sprite(mkMat); mk.visible = false; mk.renderOrder = 999; mk.center.set(0.5, 0); mk.scale.set(0.15, 0.1875, 1);
  scene.add(mk);

  function ropeGeo(a, b, slack, t) {
    const pts = [], dir = tmpB.copy(b).sub(a), len = dir.length() || 1;
    const side = new THREE.Vector3().crossVectors(dir, up); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    for (let i = 0; i <= SEG; i++) {
      const f = i / SEG, env = Math.sin(Math.PI * f);
      const p = a.clone().addScaledVector(dir, f);
      // borracha: onda que corre pela corda + barriga pra baixo enquanto esta frouxa
      p.addScaledVector(side, Math.sin(f * Math.PI * 3 + t * 22) * slack * 0.22 * env);
      p.y -= slack * Math.min(1.2, len * 0.08) * env;
      pts.push(p);
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), SEG * 2, ROPE_R, 5, false);
  }
  function add(from, to, self) {
    const r = { from, to: new THREE.Vector3(...to), t: 0, end: -1, self, mesh: new THREE.Mesh(new THREE.BufferGeometry(), ropeMat), head: makeHead() };
    r.mesh.frustumCulled = false; scene.add(r.mesh, r.head); ropes.push(r);
    return r;
  }
  function kill(r) { scene.remove(r.mesh, r.head); r.mesh.geometry.dispose(); r.head.traverse(o => o.material?.dispose?.()); }
  return {
    // proprio jogador: a corda sai da mao esquerda (perto da camera) e fica ate a puxada acabar
    // handNdc(): ponto da mao esquerda do viewmodel na tela; a corda sai dali (a meio metro da camera), senao do canto de baixo
    self(to, handNdc) { for (const r of ropes) if (r.self && r.end < 0) r.end = 0; return add(() => { const n = handNdc?.(); if (!n) return tmpA.set(-0.2, -0.28, -0.5).applyMatrix4(camera.matrixWorld).clone(); const d = tmpA.set(n[0], n[1], 0.5).unproject(camera).sub(camera.position).normalize(); return camera.position.clone().addScaledVector(d, 0.55); }, to, true); },
    release(r) { if (r && r.end < 0) r.end = 0; },
    // outro jogador: a corda sai do peito dele e some sozinha em 1 s
    remote(fromFn, to) { const r = add(fromFn, to, false); r.life = 1.1; return r; },
    marker(show, pos, ok, normal) {
      mk.visible = !!show && !!pos; if (!mk.visible) return;
      mk.position.set(pos[0], pos[1], pos[2]); mkMat.color.set(ok ? 0x3dd68c : 0xd8322a);
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.07; mk.scale.set(0.15 * pulse, 0.1875 * pulse, 1); // pulsa de leve pra chamar o olho
    },
    update(dt) {
      for (let i = ropes.length - 1; i >= 0; i--) {
        const r = ropes[i]; r.t += dt;
        if (r.life != null && r.t > r.life && r.end < 0) r.end = 0;
        const a = r.from(); if (!a) { kill(r); ropes.splice(i, 1); continue; }
        let k = Math.min(1, r.t / OUT); // cabeca voando
        if (r.end >= 0) { r.end += dt; k = Math.max(0, 1 - r.end / 0.18); if (k <= 0) { kill(r); ropes.splice(i, 1); continue; } } // recolhe
        const head = a.clone().lerp(r.to, k);
        const slack = r.end >= 0 ? 0.6 : Math.max(0, 1 - r.t / (OUT + 0.18)); // estica quando prende
        r.mesh.geometry.dispose(); r.mesh.geometry = ropeGeo(a, head, slack, r.t);
        r.head.position.copy(head); r.head.lookAt(a); // +z (cabo) aponta pra corda; o gancho abre pra frente
      }
    },
    clear() { for (const r of ropes) kill(r); ropes.length = 0; mk.visible = false; },
  };
}
export const HOOK_OUT = OUT;
