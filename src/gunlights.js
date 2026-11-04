// Lanterna de arma e reflexo de luneta (04/11, pedido dele)
// - Minha lanterna: SpotLight de verdade saindo da arma pra onde eu miro (eu vejo a luz no mundo).
// - Lanterna dos outros: NADA de luz no meu mundo, so um brilho leve na lanterna dele quando ela aponta pra mim
//   (atrapalha a mira de quem esta na frente, sem cone na tela).
// - Sniper mirando: reflexo da luneta (estilo Battlefield 4), visivel de frente e de longe; parede tampa (depthTest).
import * as THREE from 'three';

const FWD = new THREE.Vector3(), DIR = new THREE.Vector3(), TO = new THREE.Vector3(), P = new THREE.Vector3();

export class GunLights {
  constructor(scene) {
    this.scene = scene;
    this.me = new THREE.SpotLight(0xfff2d8, 40, 32, 0.36, 0.55, 1.3);
    this.me.visible = false;
    scene.add(this.me, this.me.target);
    this.glowMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff1d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.glintMat = new THREE.SpriteMaterial({ map: glintTex(), transparent: true, depthWrite: false, opacity: 0 }); // normal (nao aditivo): com contorno de tinta aparece ate no cenario claro
    this.spr = new Map(); // id -> { glow, glint }
    this.t = 0;
  }
  // meOn: minha arma tem lanterna e posso usar (vivo, sem correr); remotes: G.remotes (r.lo = montagem da arma na mao)
  update(dt, camera, remotes, meOn) {
    this.t += dt;
    camera.getWorldDirection(FWD);
    this.me.visible = meOn;
    if (meOn) {
      this.me.position.copy(camera.position).addScaledVector(FWD, 0.3); this.me.position.y -= 0.12;
      this.me.target.position.copy(camera.position).addScaledVector(FWD, 12);
    }
    const seen = new Set();
    for (const r of remotes.values()) {
      if (r.mob || !r.alive || r.dn > 0) continue;
      const light = r.lo?.laser === 'light_1' && r.anim !== 'sprint' && r.anim !== 'tac', glint = r.wpn === 'sniper' && r.ad;
      if (!light && !glint) continue;
      seen.add(r.id);
      let s = this.spr.get(r.id);
      if (!s) { s = { glow: new THREE.Sprite(this.glowMat.clone()), glint: new THREE.Sprite(this.glintMat.clone()) }; s.glow.renderOrder = s.glint.renderOrder = 6; this.scene.add(s.glow, s.glint); this.spr.set(r.id, s); }
      const cp = Math.cos(r.pitch || 0);
      DIR.set(-Math.sin(r.yaw) * cp, Math.sin(r.pitch || 0), -Math.cos(r.yaw) * cp);
      // ponto de saida: a peca na arma dele (lanterna/lente da luneta); sem arma montada, na altura do olho
      const g = r.char?.gun?.userData;
      const src = light ? g?.laser?.eye : g?.scope?.lens;
      if (src) src.getWorldPosition(P); else P.set(r.pos[0] + DIR.x * 0.5, r.pos[1] + 1.45, r.pos[2] + DIR.z * 0.5);
      TO.copy(camera.position).sub(P); const dist = TO.length(); TO.divideScalar(dist || 1);
      const face = DIR.dot(TO); // 1 = apontando bem pra mim
      // lanterna: brilho so dentro do cone dela e ate ~40 m; quanto mais de frente e perto, mais forte
      s.glow.visible = light;
      if (light) {
        const k = THREE.MathUtils.smoothstep(face, 0.82, 0.985) * THREE.MathUtils.clamp(1 - dist / 40, 0, 1);
        s.glow.position.copy(P).addScaledVector(TO, 0.25);
        const sc = (0.25 + k * 1.6) * Math.max(1, dist * 0.06); s.glow.scale.set(sc, sc, 1);
        s.glow.material.opacity = 0.15 + k * 0.7;
      }
      // reflexo da luneta: cone largo, distancia longa, piscando de leve (o tamanho cresce com a distancia pra se ver)
      s.glint.visible = !!glint;
      if (glint) {
        const k = THREE.MathUtils.smoothstep(face, 0.55, 0.95);
        s.glint.position.copy(P).addScaledVector(TO, 0.45); // na frente da luneta e da cabeca (dentro do tubo sumia)
        const pulse = 0.8 + 0.2 * Math.sin(this.t * 7 + r.id.length);
        const sc = (0.8 + dist * 0.16) * (0.55 + k * 0.6) * pulse; /* ~50 px na tela a qualquer distancia (BF4: o reflexo se ve de longe) */
        s.glint.scale.set(sc, sc, 1);
        s.glint.material.rotation = this.t * 0.4;
        s.glint.material.opacity = Math.min(1, k * 1.2);
      }
    }
    for (const [id, s] of this.spr) if (!seen.has(id)) { this.scene.remove(s.glow, s.glint); s.glow.material.dispose(); s.glint.material.dispose(); this.spr.delete(id); }
  }
  dispose() {
    this.scene.remove(this.me, this.me.target); this.me.dispose();
    for (const s of this.spr.values()) { this.scene.remove(s.glow, s.glint); s.glow.material.dispose(); s.glint.material.dispose(); }
    this.spr.clear();
    for (const m of [this.glowMat, this.glintMat]) { m.map?.dispose(); m.dispose(); }
  }
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,244,215,.85)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// estrela de reflexo (4 pontas longas + 4 curtas) amarelo-clara com contorno de tinta: le em fundo claro e escuro
function glintTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), star = (R, r, n, rot) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, d = i % 2 ? r : R; g.lineTo(64 + Math.cos(a) * d, 64 + Math.sin(a) * d); } g.closePath(); };
  g.lineJoin = 'round';
  star(34, 7, 4, Math.PI / 4); g.fillStyle = '#fff4b0'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#1b1916'; g.stroke();
  star(60, 7, 4, 0); g.fillStyle = '#fffbe6'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#1b1916'; g.stroke();
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 14); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#fff1a8');
  g.beginPath(); g.arc(64, 64, 12, 0, Math.PI * 2); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.stroke();
  return new THREE.CanvasTexture(c);
}
