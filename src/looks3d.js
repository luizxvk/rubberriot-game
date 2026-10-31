// Monta o visual do boneco (chapeu, olhos, oculos, luvas, camisa, estampa do short, efeito).
// Tudo procedural, no mesmo traco de tinta do resto (ink + toon). A cor do time fica no short e na fita.
import * as THREE from 'three';
import { ink, toon, PAL } from './toon.js';

const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
};

// ---------- olhos (textura no rosto) ----------
const EYES = new Map();
export function eyeTex(style) {
  if (EYES.has(style)) return EYES.get(style);
  const t = canvasTex(256, 128, (g) => {
    const INK = '#141210', W = '#faf8f2';
    g.lineCap = 'round'; g.lineJoin = 'round';
    const white = () => { g.fillStyle = W; g.beginPath(); g.ellipse(128, 64, 120, 60, 0, 0, Math.PI * 2); g.fill(); };
    const pie = (x, y = 66, ry = 44) => { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, 26, ry, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = W; g.beginPath(); g.moveTo(x + 4, y - 14); g.lineTo(x + 18, y - 36); g.lineTo(x + 22, y - 14); g.fill(); };
    const heart = (x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s); g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s); g.fill(); };
    const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    if (style === 'knockout') {
      white(); g.strokeStyle = INK; g.lineWidth = 12;
      for (const x of [80, 176]) { g.beginPath(); g.moveTo(x - 24, 42); g.lineTo(x + 24, 90); g.moveTo(x + 24, 42); g.lineTo(x - 24, 90); g.stroke(); }
      return;
    }
    if (style === 'cyclops') {
      white(); g.fillStyle = INK; g.beginPath(); g.ellipse(128, 66, 40, 48, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = W; g.beginPath(); g.ellipse(142, 50, 10, 14, 0, 0, Math.PI * 2); g.fill();
      return;
    }
    if (style === 'laser') {
      g.fillStyle = INK; g.fillRect(6, 34, 244, 56); g.fillStyle = '#ff3a2a'; g.fillRect(16, 50, 224, 24);
      g.fillStyle = '#ffd0c8'; g.fillRect(16, 56, 224, 6);
      return;
    }
    white();
    if (style === 'sleepy') { for (const x of [80, 176]) { g.fillStyle = INK; g.beginPath(); g.ellipse(x, 74, 26, 30, 0, 0, Math.PI); g.fill(); g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 34, 70); g.lineTo(x + 34, 70); g.stroke(); } }
    else if (style === 'angry') { for (const x of [80, 176]) pie(x, 74, 34); g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.moveTo(40, 22); g.lineTo(112, 44); g.moveTo(216, 22); g.lineTo(144, 44); g.stroke(); }
    else if (style === 'wink') { pie(80); g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.arc(176, 78, 28, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (style === 'dizzy') { g.strokeStyle = INK; g.lineWidth = 7; for (const x of [80, 176]) { g.beginPath(); for (let a = 0; a < Math.PI * 6; a += 0.2) { const r = 3 + a * 2.1; g.lineTo(x + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); } }
    else if (style === 'hearts') { for (const x of [80, 176]) heart(x, 60, 30, '#c2392b'); }
    else if (style === 'stars') { for (const x of [80, 176]) star(x, 64, 36, '#d9a520'); g.strokeStyle = INK; g.lineWidth = 3; }
    else for (const x of [80, 176]) pie(x); // classic, specs, shades, monocle, goggles (o oculos vai por cima)
  });
  EYES.set(style, t);
  return t;
}

// ---------- oculos (malha na frente do rosto) ----------
export function buildEyewear(style) {
  const g = new THREE.Group();
  const rim = (x, r, col = PAL.ink, lens = null) => {
    const ring = ink(new THREE.TorusGeometry(r, 0.022, 6, 20), col, 0.006); ring.position.set(x, 0, 0); g.add(ring);
    if (lens !== null) { const l = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: lens, transparent: true, opacity: lens === 0x141210 ? 0.92 : 0.35 })); l.position.set(x, 0, -0.004); l.rotation.y = Math.PI; g.add(l); }
  };
  if (style === 'specs') { rim(-0.1, 0.085); rim(0.1, 0.085); }
  else if (style === 'shades') { rim(-0.1, 0.09, PAL.ink, 0x141210); rim(0.1, 0.09, PAL.ink, 0x141210); }
  else if (style === 'monocle') {
    rim(0.1, 0.095, 0xd4a017, 0xbfe3ff);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), new THREE.MeshBasicMaterial({ color: 0xd4a017 })); ch.position.set(0.17, -0.18, 0.02); ch.rotation.z = 0.35; g.add(ch);
    return place(g);
  }
  else if (style === 'goggles') {
    rim(-0.1, 0.095, 0x7a4a2a, 0xbfe3ff); rim(0.1, 0.095, 0x7a4a2a, 0xbfe3ff);
    const strap = ink(new THREE.TorusGeometry(0.36, 0.03, 6, 24, Math.PI), 0x7a4a2a, 0.006); strap.rotation.set(Math.PI / 2, 0, 0); strap.position.z = 0.33; g.add(strap);
  }
  else return null;
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4), new THREE.MeshBasicMaterial({ color: 0x141210 })); bridge.rotation.z = Math.PI / 2; g.add(bridge);
  return place(g);
  function place(o) { o.position.set(0, 0.04, -0.39); return o; }
}

// ---------- chapeus ----------
export function buildHat(id, teamCol) {
  const g = new THREE.Group();
  const band = (r, y, h = 0.06) => { const b = ink(new THREE.CylinderGeometry(r, r, h, 16), teamCol, 0); b.position.y = y; return b; }; // fita do time
  const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  switch (id) {
    case 'none': return null;
    case 'bowler': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 14), PAL.ink, 0.02));
      add(ink(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), PAL.ink, 0.02), 0, -0.09);
      g.add(band(0.245, -0.04));
      g.position.set(0.1, 0.36, 0.05); g.rotation.z = -0.35; break;
    }
    case 'cap': {
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      const vis = add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 16, 1, false, 0, Math.PI), PAL.ink, 0.015), 0, 0.01, -0.22); vis.rotation.y = Math.PI / 2; vis.scale.set(1, 1, 1.4);
      add(ink(new THREE.SphereGeometry(0.04, 8, 6), PAL.white, 0.01), 0, 0.31);
      g.position.set(0, 0.2, 0); g.rotation.x = -0.12; break;
    }
    case 'laurel': {
      // coroa de louros (faixa Mestre): aro dourado + folhas verdes em volta + pedra violeta na testa
      const ring = add(ink(new THREE.TorusGeometry(0.3, 0.035, 6, 24), 0xf2c94c, 0.012)); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue; // vao na nuca
        const leaf = add(ink(new THREE.SphereGeometry(0.07, 6, 4), 0x7fb069, 0.01), Math.sin(a) * 0.31, 0.03, -Math.cos(a) * 0.31);
        leaf.scale.set(0.55, 0.5, 1.4); leaf.rotation.y = a; leaf.rotation.x = 0.5;
      }
      add(ink(new THREE.OctahedronGeometry(0.06), 0xc084fc, 0.01), 0, 0.05, -0.33);
      g.position.set(0, 0.24, 0); break;
    }
    case 'capcrown': {
      // coroa de tampinhas (meta da comunidade): aro dourado e tampinhas de garrafa em pe, serrilhadas, cores alternando
      const ring = add(ink(new THREE.CylinderGeometry(0.29, 0.3, 0.1, 18, 1, true), 0xe3a92b, 0.014), 0, 0.03);
      ring.userData.detail = false;
      const cols = [0xa83a2c, 0xece9e1, 0xe3a92b, 0x141210];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cap = add(ink(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 21), cols[i % 4], 0.008), Math.sin(a) * 0.3, 0.13, -Math.cos(a) * 0.3);
        cap.rotation.set(Math.PI / 2, 0, 0); cap.rotation.y = -a; cap.userData.detail = true; // em pe, de frente pra fora
      }
      add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xffcf3a, 0.008), 0, 0.2, -0.31);
      g.position.set(0, 0.26, 0); break;
    }
    case 'rovexcap': {
      // bone violeta da Rovex: copa violeta, aba violeta escura (preta sumia no rosto preto) e o logo
      // "Rovex" (classic text) em branco na testa (31/10, pedido dele)
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x6d3df5, 0.02));
      const vis = add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 16, 1, false, 0, Math.PI), 0x3b1d9a, 0.015), 0, 0.01, -0.22); vis.rotation.y = Math.PI / 2; vis.scale.set(1, 1, 1.5); vis.rotation.x = 0.12;
      // logo colado na curva da frente: um pedaco de esfera um pouco maior que a copa (centro na frente, -z)
      const logo = new THREE.Mesh(new THREE.SphereGeometry(0.314, 24, 8, Math.PI * 1.5 - 0.62, 1.24, 0.92, 0.42), new THREE.MeshBasicMaterial({ map: rovexText(), transparent: true, depthWrite: false }));
      logo.renderOrder = 2; g.add(logo);
      add(ink(new THREE.SphereGeometry(0.04, 8, 6), PAL.white, 0.01), 0, 0.31);
      g.position.set(0, 0.2, 0); g.rotation.x = -0.12; break;
    }
    case 'beanie': {
      add(ink(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      { const b = band(0.335, 0.03, 0.09); b.material = toon(PAL.paper); g.add(b); }
      add(ink(new THREE.SphereGeometry(0.09, 10, 8), PAL.paper, 0.015), 0, 0.36);
      g.position.set(0, 0.16, 0.02); break;
    }
    case 'party': {
      const cone = add(ink(new THREE.ConeGeometry(0.17, 0.46, 14), teamCol, 0.02), 0, 0.2);
      const pom = add(ink(new THREE.SphereGeometry(0.07, 8, 6), 0xf2c94c, 0.012), 0, 0.45);
      for (let i = 0; i < 3; i++) { const d = add(ink(new THREE.TorusGeometry(0.15 - i * 0.045, 0.012, 4, 14), PAL.paper, 0), 0, 0.06 + i * 0.12); d.rotation.x = Math.PI / 2; }
      cone.userData.k = pom; g.position.set(0.08, 0.3, 0); g.rotation.z = -0.25; break;
    }
    case 'chef': {
      add(ink(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), PAL.white, 0.02), 0, 0.08);
      for (const [x, z] of [[0, 0], [0.12, 0.05], [-0.12, 0.05], [0, -0.12], [0.06, 0.12]]) add(ink(new THREE.SphereGeometry(0.15, 10, 8), PAL.white, 0.015), x, 0.26, z);
      g.add(band(0.225, 0, 0.05));
      g.position.set(0, 0.32, 0.03); break;
    }
    case 'tophat': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 16), PAL.ink, 0.02), 0, 0.2);
      add(ink(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 18), PAL.ink, 0.02));
      g.add(band(0.205, 0.07, 0.07));
      g.position.set(0.06, 0.34, 0.04); g.rotation.z = -0.18; break;
    }
    case 'cowboy': {
      add(ink(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 14), 0x7a4a2a, 0.02), 0, 0.08);
      const brim = add(ink(new THREE.TorusGeometry(0.34, 0.06, 6, 20), 0x7a4a2a, 0.015)); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 1, 0.5);
      add(ink(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 18), 0x7a4a2a, 0.012));
      g.add(band(0.21, 0.02, 0.05));
      g.position.set(0, 0.34, 0.03); g.rotation.z = -0.1; break;
    }
    case 'antenna': {
      add(ink(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.012));
      const wire = []; for (let i = 0; i <= 8; i++) wire.push(new THREE.Vector3(Math.sin(i * 0.7) * 0.05, i * 0.06, 0));
      add(ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 16, 0.012, 5), PAL.ink, 0));
      const ball = add(ink(new THREE.SphereGeometry(0.07, 10, 8), 0xf2c94c, 0.012), 0, 0.5);
      g.userData.bob = ball; g.position.set(0, 0.32, 0); break;
    }
    case 'propeller': {
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      add(ink(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), PAL.ink, 0), 0, 0.36);
      const prop = new THREE.Group(); prop.position.y = 0.44; g.add(prop);
      for (const s of [0, 1]) { const b = ink(new THREE.BoxGeometry(0.42, 0.012, 0.07), s ? 0xf2c94c : PAL.red, 0.008); b.rotation.y = s * Math.PI / 2; prop.add(b); }
      g.userData.spin = prop; g.position.set(0, 0.2, 0); break;
    }
    case 'flowerpot': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.15, 0.24, 14), 0xb5552e, 0.02), 0, 0.1);
      g.add(band(0.205, 0.2, 0.05));
      add(ink(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), 0x55603a, 0), 0, 0.36);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(ink(new THREE.SphereGeometry(0.05, 8, 6), PAL.white, 0.008), Math.cos(a) * 0.07, 0.52, Math.sin(a) * 0.07); }
      add(ink(new THREE.SphereGeometry(0.045, 8, 6), 0xf2c94c, 0.008), 0, 0.52);
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'pan': {
      const pan = add(ink(new THREE.CylinderGeometry(0.3, 0.26, 0.07, 18), 0x3a3632, 0.02)); pan.position.y = 0.04;
      const h = add(ink(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), 0x3a3632, 0.012), 0.46, 0.06); h.rotation.z = Math.PI / 2 - 0.1;
      g.add(band(0.27, 0.0, 0.03));
      g.position.set(0, 0.3, 0.02); g.rotation.z = -0.12; break;
    }
    case 'pirate': {
      const body = add(ink(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 3), PAL.ink, 0.02), 0, 0.06); body.rotation.y = Math.PI;
      add(ink(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.ink, 0.02), 0, 0.12);
      const sk = add(ink(new THREE.SphereGeometry(0.05, 8, 6), PAL.white, 0.008), 0, 0.12, -0.28);
      g.add(band(0.21, 0.02, 0.04)); sk.userData.detail = true;
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'horns': {
      for (const s of [-1, 1]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(s * (0.18 + k * 0.16), k * 0.3 - k * k * 0.05, -k * 0.05)); }
        const h = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.05, 6), toon(PAL.paper)); g.add(h);
        const tip = add(ink(new THREE.ConeGeometry(0.05, 0.1, 8), PAL.paper, 0.01), s * 0.34, 0.3, -0.05); tip.rotation.z = -s * 0.5;
      }
      g.add(band(0.32, -0.02, 0.05));
      g.position.set(0, 0.22, 0); break;
    }
    case 'viking': {
      add(ink(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a8f93, 0.02));
      g.add(band(0.335, 0.02, 0.07));
      for (const s of [-1, 1]) { const h = add(ink(new THREE.ConeGeometry(0.07, 0.34, 10), PAL.paper, 0.012), s * 0.36, 0.2); h.rotation.z = -s * 0.9; }
      add(ink(new THREE.BoxGeometry(0.05, 0.22, 0.04), 0x8a8f93, 0.01), 0, 0.0, -0.33);
      g.position.set(0, 0.16, 0); break;
    }
    case 'fez': {
      add(ink(new THREE.CylinderGeometry(0.15, 0.19, 0.26, 14), PAL.red, 0.02), 0, 0.1);
      g.add(band(0.192, -0.01, 0.05));
      const tas = add(ink(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), PAL.ink, 0), 0.12, 0.16); tas.rotation.z = 0.5;
      add(ink(new THREE.ConeGeometry(0.04, 0.08, 6), PAL.ink, 0), 0.18, 0.08);
      g.position.set(0.05, 0.34, 0.02); g.rotation.z = -0.2; break;
    }
    case 'halo': {
      const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffe28a })), 0, 0.55); r.rotation.x = Math.PI / 2;
      g.userData.bob = r; break;
    }
    case 'crown': {
      add(ink(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 16, 1, true), 0xd4a017, 0.015), 0, 0.06);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = add(ink(new THREE.ConeGeometry(0.06, 0.14, 6), 0xd4a017, 0.01), Math.cos(a) * 0.24, 0.18, Math.sin(a) * 0.24); p.userData.detail = true; }
      add(ink(new THREE.SphereGeometry(0.05, 8, 6), teamCol, 0.008), 0, 0.07, -0.25);
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'tvhead': {
      const tv = add(ink(new THREE.BoxGeometry(0.5, 0.36, 0.34), 0x7a4a2a, 0.02), 0, 0.1);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshBasicMaterial({ color: 0xbfe3ff })); scr.position.set(-0.03, 0.1, -0.172); scr.rotation.y = Math.PI; g.add(scr);
      for (const s of [-1, 1]) { const a = add(ink(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), PAL.ink, 0), s * 0.1, 0.4); a.rotation.z = s * 0.5; }
      add(ink(new THREE.SphereGeometry(0.03, 6, 4), teamCol, 0.006), 0.19, 0.0, -0.172);
      g.userData.screen = scr; g.position.set(0, 0.3, 0); tv.userData.tv = true; break;
    }
    case 'plunger': {
      const cup = add(ink(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x7a2a1f, 0.02), 0, 0.0); cup.scale.set(1, 0.7, 1);
      add(ink(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), 0x9d6b3a, 0.012), 0, 0.42);
      g.add(band(0.045, 0.2, 0.06));
      g.position.set(0.05, 0.3, 0.02); g.rotation.z = -0.28; break;
    }
    case 'jester': {
      add(ink(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      for (const [s, col] of [[-1, 0xf2c94c], [1, 0x55603a]]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(s * (0.1 + k * 0.32), 0.18 + Math.sin(k * 3) * 0.15, 0)); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.06 * 1, 6), toon(col)));
        add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xd4a017, 0.008), s * 0.42, 0.18 + Math.sin(3) * 0.15);
      }
      g.position.set(0, 0.2, 0); break;
    }
    default: return buildHat('bowler', teamCol);
  }
  return g;
}

// ---------- luvas ----------
let OVEN = null;
export function ovenTex() {
  return OVEN ||= canvasTex(64, 64, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#faf8f2' : '#c2392b'; g.fillRect(x * 16, y * 16, 16, 16); } });
}
export function styleGlove(glove, style, color) {
  const col = style === 'golden' ? 0xd4a017 : style === 'oven' ? 0xffffff : hex(color);
  const mat = style === 'oven' ? toon(0xffffff, { map: ovenTex() }) : toon(col);
  for (const c of [...glove.children]) if (c.userData.gloveExtra) glove.remove(c);
  glove.material = mat;
  for (const c of glove.children) if (c.isMesh && !c.userData.outline && c.material?.isMeshToonMaterial) c.material = mat;
  glove.scale.setScalar(style === 'boxing' ? 1.35 : style === 'mitten' ? 1.1 : 1);
  const add = (m) => { m.userData.gloveExtra = true; glove.add(m); return m; };
  if (style === 'oven') { glove.scale.setScalar(1.15); const th = add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xffffff, 0.012)); th.material = mat; th.position.set(0.1, 0.02, -0.04); }
  if (style === 'mitten') { const th = add(ink(new THREE.SphereGeometry(0.05, 8, 6), col, 0.012)); th.position.set(0.1, 0.02, -0.04); }
  if (style === 'boxing') { const lace = add(ink(new THREE.TorusGeometry(0.08, 0.012, 4, 10), PAL.white, 0)); lace.position.set(0, 0.1, -0.02); lace.rotation.x = Math.PI / 2; }
  if (style === 'spiked') {
    const band = add(ink(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), PAL.ink, 0.01)); band.position.y = 0.13;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const s = add(ink(new THREE.ConeGeometry(0.025, 0.07, 6), PAL.white, 0.006)); s.position.set(Math.cos(a) * 0.14, 0.13, Math.sin(a) * 0.14); s.rotation.set(0, 0, 0); s.lookAt(Math.cos(a) * 2, 0.13, Math.sin(a) * 2); s.rotateX(Math.PI / 2); }
  }
  if (style === 'claw') for (const x of [-0.06, 0, 0.06]) { const c = add(ink(new THREE.ConeGeometry(0.022, 0.12, 6), PAL.paper, 0.006)); c.position.set(x, -0.04, -0.13); c.rotation.x = -Math.PI / 2 - 0.3; }
  if (style === 'golden') { const ring = add(ink(new THREE.TorusGeometry(0.035, 0.012, 6, 12), 0xffe28a, 0)); ring.position.set(0.02, -0.02, -0.11); }
}

// ---------- estampa do short (multiplica pela cor do time) ----------
const PATS = new Map();
export function patternTex(id) {
  if (id === 'plain') return null;
  if (PATS.has(id)) return PATS.get(id);
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,18,16,.55)'; g.strokeStyle = 'rgba(20,18,16,.55)';
    if (id === 'stripes') for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h);
    if (id === 'dots') for (let y = 8; y < h; y += 32) for (let x = 8 + ((y / 32) % 2) * 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
    if (id === 'checker') for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x < w; x += 64) g.fillRect(x, y, 32, 32);
    if (id === 'zigzag') { g.lineWidth = 9; for (let y = 16; y < h; y += 32) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? -8 : 8)); g.stroke(); } }
    if (id === 'stars') { g.fillStyle = 'rgba(250,248,242,.9)'; for (let y = 16; y < h; y += 42) for (let x = 16 + ((y / 42) % 2) * 20; x < w; x += 42) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 10; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  PATS.set(id, t);
  return t;
}

// ---------- efeitos em volta do boneco ----------
const FXTEX = new Map();
// logo "Rovex" classic text em branco (bone da Rovex): carregado uma vez
let rovexTex = null;
function rovexText() {
  if (!rovexTex) { rovexTex = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'brand/rovex-classic-white.png'); rovexTex.colorSpace = THREE.SRGBColorSpace; rovexTex.anisotropy = 4; }
  return rovexTex;
}
function fxTex(kind) {
  if (FXTEX.has(kind)) return FXTEX.get(kind);
  const t = canvasTex(64, 64, (g) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (kind === 'spark') { g.strokeStyle = '#141210'; g.lineWidth = 9; const p = () => { g.beginPath(); g.moveTo(36, 4); g.lineTo(20, 32); g.lineTo(34, 32); g.lineTo(24, 60); }; p(); g.stroke(); g.strokeStyle = '#7fe6ff'; g.lineWidth = 4; p(); g.stroke(); }
    if (kind === 'fire') { const gr = g.createRadialGradient(32, 40, 2, 32, 36, 26); gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.5, '#ff7a1a'); gr.addColorStop(1, 'rgba(190,40,20,.85)'); g.strokeStyle = '#141210'; g.lineWidth = 4; g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(58, 34, 32, 62); g.quadraticCurveTo(6, 34, 32, 2); g.fill(); }
    if (kind === 'water') { g.fillStyle = '#7fd1d8'; g.strokeStyle = '#141210'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(54, 36, 32, 58); g.quadraticCurveTo(10, 36, 32, 6); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(26, 38, 4, 8, 0.3, 0, Math.PI * 2); g.fill(); }
    if (kind === 'ether') { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(190,120,255,.95)'); gr.addColorStop(0.5, 'rgba(70,20,110,.7)'); gr.addColorStop(1, 'rgba(20,0,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill(); }
    if (kind === 'confetti') { const cs = ['#a83a2c', '#f2c94c', '#2f5b8a', '#7fb069', '#b07cc6']; for (let i = 0; i < 5; i++) { g.fillStyle = cs[i]; g.save(); g.translate(12 + i * 10, 14 + (i % 3) * 16); g.rotate(i); g.fillRect(-5, -3, 10, 6); g.restore(); } }
    if (kind === 'stink') { g.strokeStyle = '#7fb069'; g.lineWidth = 6; for (const x of [20, 36]) { g.beginPath(); for (let y = 60; y > 4; y -= 4) g.lineTo(x + Math.sin(y * 0.25) * 6, y); g.stroke(); } }
    if (kind === 'notes') { g.fillStyle = '#141210'; g.beginPath(); g.ellipse(22, 48, 10, 7, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(29, 10, 5, 38); g.beginPath(); g.moveTo(34, 10); g.quadraticCurveTo(54, 16, 50, 34); g.quadraticCurveTo(48, 22, 34, 22); g.fill(); }
  });
  FXTEX.set(kind, t);
  return t;
}

// cada efeito: N figurinhas que giram/sobem em volta do corpo; tick(dt, t) anima
export function buildFx(id) {
  if (!id || id === 'none') return null;
  const group = new THREE.Group();
  const N = id === 'confetti' ? 10 : id === 'ether' ? 9 : 8;
  const mat = new THREE.SpriteMaterial({ map: fxTex(id), transparent: true, depthWrite: false, blending: THREE.NormalBlending });
  const parts = [];
  for (let i = 0; i < N; i++) {
    const s = new THREE.Sprite(mat.clone()); s.scale.setScalar(id === 'confetti' ? 0.32 : 0.28);
    group.add(s); parts.push({ s, a: (i / N) * Math.PI * 2, k: Math.random(), sp: 0.6 + Math.random() * 0.8 });
  }
  const tick = (dt, t) => {
    for (const p of parts) {
      p.k = (p.k + dt * p.sp * (id === 'fire' ? 0.9 : 0.45)) % 1;
      const r = id === 'ether' ? 0.75 - p.k * 0.2 : 0.62, a = p.a + t * (id === 'spark' ? 2.6 : 0.9);
      const y = id === 'water' ? 2.2 - p.k * 2.0 : id === 'spark' ? 0.6 + ((p.k * 7) % 1.6) : 0.3 + p.k * 1.9;
      p.s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      p.s.material.opacity = id === 'spark' ? (Math.sin(t * 30 + p.a * 9) > 0.2 ? 1 : 0) : Math.sin(p.k * Math.PI);
      p.s.material.rotation = id === 'confetti' || id === 'notes' ? Math.sin(t * 3 + p.a) * 0.6 : 0;
    }
  };
  return { group, tick };
}
