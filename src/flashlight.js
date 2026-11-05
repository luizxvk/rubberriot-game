// Lanterna (Noite dos Borroes, 03/11 pedido dele): no Estudio Tinteiro escuro cada um tem um feixe de lanterna.
// Minha: SpotLight de verdade saindo da camera pra onde eu miro. Parceiros: brilho pequeno na lanterna (sem cone
// na tela: atrapalhava a visao) + UMA SpotLight de verdade so no parceiro mais perto (celular aguenta).
import * as THREE from 'three';

const FWD = new THREE.Vector3(), TMP = new THREE.Vector3();

export class Flashlights {
  constructor(scene) {
    this.scene = scene;
    this.me = new THREE.SpotLight(0xfff0d0, 48, 34, 0.44, 0.5, 1.25);
    this.mate = new THREE.SpotLight(0xffe6bc, 30, 24, 0.4, 0.6, 1.4);
    for (const l of [this.me, this.mate]) { scene.add(l, l.target); }
    // brilho pequeno na lanterna de cada parceiro (o cone de luz grande atrapalhava a tela: 03/11 pedido dele)
    this.glowMat = new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff1c8, opacity: 0.7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.cones = new Map();
  }
  // r.pos/r.yaw/r.pitch dos remotos; so quem e do meu time e nao e vilao leva lanterna
  update(camera, remotes, myTeam, meOn) {
    camera.getWorldDirection(FWD);
    this.me.visible = meOn;
    if (meOn) {
      this.me.position.copy(camera.position).addScaledVector(FWD, 0.2); this.me.position.y -= 0.15;
      this.me.target.position.copy(camera.position).addScaledVector(FWD, 10);
    }
    let near = null, nd = 30 * 30;
    const seen = new Set();
    for (const r of remotes.values()) {
      if (r.mob || !r.alive || r.team !== myTeam || r.dn > 0) continue;
      seen.add(r.id);
      let c = this.cones.get(r.id);
      if (!c) { c = new THREE.Sprite(this.glowMat); c.scale.set(0.45, 0.45, 1); this.scene.add(c); this.cones.set(r.id, c); }
      const cp = Math.cos(r.pitch || 0), dir = TMP.set(-Math.sin(r.yaw) * cp, Math.sin(r.pitch || 0), -Math.cos(r.yaw) * cp);
      c.position.set(r.pos[0] + dir.x * 0.45, r.pos[1] + 1.4, r.pos[2] + dir.z * 0.45);
      const d = (r.pos[0] - camera.position.x) ** 2 + (r.pos[2] - camera.position.z) ** 2;
      if (d < nd) { nd = d; near = { pos: c.position.clone(), dir: dir.clone() }; }
    }
    for (const [id, c] of this.cones) if (!seen.has(id)) { this.scene.remove(c); this.cones.delete(id); }
    this.mate.visible = !!near;
    if (near) { this.mate.position.copy(near.pos); this.mate.target.position.copy(near.pos).addScaledVector(near.dir, 10); }
  }
  dispose() {
    for (const l of [this.me, this.mate]) { this.scene.remove(l, l.target); l.dispose(); }
    for (const c of this.cones.values()) this.scene.remove(c);
    this.glowMat.map?.dispose(); this.glowMat.dispose();
  }
}

// bolinha de luz com borda suave (canvas)
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,240,200,.8)'); gr.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
