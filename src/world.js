// Vila Borracha: cena, cidade que danca, ceu, objetivos, pickups e efeitos.
import * as THREE from 'three';
import { ink, toon, outline, PAL, hatchTexture, facadeTexture, tankTexture, wordTexture, mergeStatic, mergeMoving } from './toon.js';
import { buildGun } from './arsenal.js';

export const BEAT = 2.2; // batidas por segundo da danca da cidade

const THEME = {
  vila: { sky: 0xd8d4ca, ground: ['#cfc9bd', '#7e786e'], roads: true, trees: [[-12, -12], [12, 12], [-40, 14], [40, -14], [-30, 30], [30, -30]] },
  fabrica: { sky: 0xc9c4ba, ground: ['#bdb7ab', '#6e6a63'], hazard: true, trees: [] },
  fronteira: { sky: 0xdcd8cc, ground: ['#d3cdb8', '#8a8470'], paths: true, trees: [[-40, -36], [40, 36], [-62, 10], [62, -10], [-14, 50], [14, -50], [-56, -50], [56, 50]] },
  // estaleiro: asfalto do porto com faixas de seguranca, sem arvore la dentro
  estaleiro: { sky: 0xcfd3d2, ground: ['#b9b6ae', '#6a675f'], hazard: true, hazardStrips: [[40, 1, 0, -15], [40, 1, 0, 15]], trees: [] },
  // refinaria: areia do deserto, ceu quente
  refinaria: { sky: 0xe6d9bf, ground: ['#dccaa0', '#9c8662'], trees: [] },
};
// conteineres: cores de carga desbotadas, uma por semente
const CONT_COLS = [0x9c4a36, 0x3f6a8a, 0x5f7f3e, 0xb08a3a, 0x7a4f7a, 0x4f7f7a, 0xa8653a, 0x5a5f8f];

// Monta o cenario do mapa M num grupo (troca de mapa = remove o grupo e monta outro)
export function buildWorld(scene, M) {
  const dancers = [];
  const swayers = [];
  const root = new THREE.Group();
  scene.add(root);
  const TH = THEME[M.theme] || THEME.vila;
  const ARENA = M.arena;
  scene.background = new THREE.Color(TH.sky);
  scene.fog = new THREE.Fog(TH.sky, ARENA * 1.2, ARENA * 4);

  root.add(new THREE.HemisphereLight(0xffffff, 0x6e6a63, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(30, 60, 20);
  root.add(sun);

  // chao: paralelepipedo rabiscado + estrada clara
  const groundTex = hatchTexture(TH.ground[0], TH.ground[1], { density: 40, cross: true });
  groundTex.repeat.set(ARENA / 2, ARENA / 2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2 + 60, ARENA * 2 + 60), toon(0xffffff, { map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  root.add(ground);
  const roadTex = hatchTexture('#e8e4da', '#a8a196', { density: 10 });
  roadTex.repeat.set(2, 24);
  const roads = TH.roads ? [[8, ARENA * 2, 0, 0], [ARENA * 2, 8, 0, 0], [6, ARENA * 2, -36, 0], [6, ARENA * 2, 36, 0]]
    : TH.paths ? [[7, ARENA * 2, 0, 0], [6, ARENA * 2, -44, 0], [6, ARENA * 2, 44, 0]] : [];
  if (TH.hazard) {
    // faixas de seguranca da fabrica no chao
    const hz = hazardTexture();
    for (const [w, d, x, z] of TH.hazardStrips || [[ARENA * 1.6, 1.2, 0, -19], [ARENA * 1.6, 1.2, 0, 19], [1.2, 30, -16, 0], [1.2, 30, 16, 0]]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(0xffffff, { map: hz }));
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.012, z);
      root.add(r);
    }
  }
  for (const [w, d, x, z] of roads) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(0xffffff, { map: roadTex }));
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.01, z);
    root.add(r);
  }

  const brick = hatchTexture('#d6d0c4', '#8f897e', { bricks: true });
  const plank = hatchTexture('#a99f90', '#5d574f', { planks: true });
  const sideTex = hatchTexture('#ddd8cc', '#a19a8e', { density: 14 });
  const faces = [0, 1, 2, 3].map(i => facadeTexture(i));

  const hazardTex = hazardTexture();
  for (const b of M.boxes) {
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], d = b.max[2] - b.min[2];
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    if (b.kind === 'house') {
      const g = new THREE.Group();
      g.position.set(cx, b.min[1], cz);
      // a fachada com cara olha pro centro
      const faceZ = Math.abs(cz) > Math.abs(cx) * 0.6 ? -Math.sign(cz) : 0;
      const faceX = faceZ === 0 ? -Math.sign(cx) : 0;
      const tint = b.team === 'red' ? 0xf0d8d2 : b.team === 'blue' ? 0xd5dfea : 0xffffff;
      const plain = toon(tint, { map: sideTex, unique: true });
      const face = toon(tint, { map: faces[(b.seed || 0) % faces.length], unique: true });
      const mats = [plain, plain, toon(PAL.mid), plain, plain, plain];
      if (faceX > 0) mats[0] = face; else if (faceX < 0) mats[1] = face;
      if (faceZ > 0) mats[4] = face; else if (faceZ < 0) mats[5] = face;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      body.position.y = h / 2;
      outline(body, 0.07);
      g.add(body);
      if (b.roof === 'peak') {
        const roof = ink(new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.62, h * 0.4, 4), PAL.dark, 0.07);
        roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
        roof.position.y = h + h * 0.2;
        g.add(roof);
        const chim = ink(new THREE.BoxGeometry(0.9, 2, 0.9), PAL.mid, 0.05);
        chim.position.set(w * 0.22, h + 1, d * 0.1);
        g.add(chim);
        swayers.push({ obj: chim, base: 0, amp: 0.08, speed: 3, phase: b.seed || 0, smoke: true });
      } else {
        const rim = ink(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), PAL.dark, 0.06);
        rim.position.y = h + 0.25;
        g.add(rim);
        if (b.team) {
          const sign = ink(new THREE.BoxGeometry(w * 0.5, 1.6, 0.3), b.team === 'red' ? PAL.red : PAL.blue, 0.05);
          sign.position.set(0, h + 1.2, 0);
          g.add(sign);
        }
      }
      root.add(g);
      dancers.push({ obj: g, h, phase: (b.seed || 0) * 0.7 + cx * 0.05, amp: 0.035 });
      continue;
    }
    let mesh;
    if (b.kind === 'wall') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: brick });
    else if (b.kind === 'crate') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.045, { map: plank });
    else if (b.kind === 'container') {
      // conteiner: caixa colorida com a chapa ondulada (frisos) e as portas na ponta
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const col = CONT_COLS[(b.seed || 0) % CONT_COLS.length];
      const body = ink(new THREE.BoxGeometry(w, h, d), col, 0.06); body.position.y = h / 2; g.add(body);
      const alongX = w > d, len = Math.max(w, d), n = Math.floor(len / 0.5);
      for (let i = 1; i < n; i++) {
        const k = -len / 2 + i * (len / n);
        const rib = ink(new THREE.BoxGeometry(alongX ? 0.06 : w + 0.06, h * 0.86, alongX ? d + 0.06 : 0.06), col, 0);
        rib.material = rib.material.clone(); rib.material.color.multiplyScalar(0.82);
        rib.position.set(alongX ? k : 0, h / 2, alongX ? 0 : k);
        g.add(rib);
      }
      for (const e of [-1, 1]) {
        const door = ink(new THREE.BoxGeometry(alongX ? 0.08 : w * 0.92, h * 0.9, alongX ? d * 0.92 : 0.08), PAL.dark, 0.02);
        door.position.set(alongX ? e * (len / 2 + 0.02) : 0, h / 2, alongX ? 0 : e * (len / 2 + 0.02));
        g.add(door);
      }
      root.add(g);
      continue;
    }
    else if (b.kind === 'concrete') mesh = ink(new THREE.BoxGeometry(w, h, d), PAL.light, 0.06, { map: sideTex });
    else if (b.kind === 'silo') {
      // silo de oleo: cilindro com faixas, tampa e escadinha pintada
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const r = Math.min(w, d) / 2;
      const body = ink(new THREE.CylinderGeometry(r, r, h, 24), PAL.paper, 0.08); body.position.y = h / 2; g.add(body);
      for (const y of [h * 0.3, h * 0.7]) { const band = ink(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.35, 24), PAL.red, 0); band.position.y = y; g.add(band); }
      const cap = ink(new THREE.CylinderGeometry(r * 0.2, r, 0.9, 24), PAL.mid, 0.05); cap.position.y = h + 0.45; g.add(cap);
      root.add(g);
      continue;
    }
    else if (b.kind === 'gantry' || b.kind === 'derrick') {
      // viga de guindaste / cabeca da bomba: amarelo de maquina pesada com faixa de seguranca
      mesh = ink(new THREE.BoxGeometry(w, h, d), 0xd9a63a, 0.05);
      const stripe = ink(new THREE.BoxGeometry(w + 0.04, h * 0.4, d + 0.04), 0xffffff, 0, { map: hazardTex });
      stripe.position.set(cx, b.min[1] + h / 2, cz); root.add(stripe);
    }
    else if (b.kind === 'pillar') mesh = ink(new THREE.CylinderGeometry(w / 2, w / 2 * 1.3, h, 8), PAL.dark, 0.04);
    else if (b.kind === 'tank') { addTank(root, cx, b.min[1], cz, w, h, dancers); continue; }
    else if (b.kind === 'vat') {
      // tonel de tinta: cilindro com faixas e tinta vermelha borbulhando em cima
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const r = Math.min(w, d) / 2;
      const body = ink(new THREE.CylinderGeometry(r, r * 1.04, h, 28), PAL.mid, 0.08); body.position.y = h / 2; g.add(body);
      for (const y of [0.3, h - 0.3]) { const band = ink(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.25, 28), PAL.dark, 0); band.position.y = y; g.add(band); }
      const paint = new THREE.Mesh(new THREE.CircleGeometry(r * 0.96, 28), toon(PAL.red)); paint.rotation.x = -Math.PI / 2; paint.position.y = h + 0.02; g.add(paint);
      root.add(g); dancers.push({ obj: g, h, phase: 0.4, amp: 0.02 });
      continue;
    }
    else if (b.kind === 'machine') {
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const body = ink(new THREE.BoxGeometry(w, h, d), PAL.dark, 0.06); body.position.y = h / 2; g.add(body);
      const stripe = ink(new THREE.BoxGeometry(w + 0.04, 0.45, d + 0.04), 0xffffff, 0, { map: hazardTex }); stripe.position.y = h * 0.6; g.add(stripe);
      const lid = ink(new THREE.BoxGeometry(w * 0.6, 0.4, d * 0.6), PAL.mid, 0.04); lid.position.y = h + 0.2; g.add(lid);
      if (b.team) { const sign = ink(new THREE.BoxGeometry(w * 0.5, 1.2, 0.3), b.team === 'red' ? PAL.red : PAL.blue, 0.04); sign.position.y = h + 1.1; g.add(sign); }
      root.add(g);
      continue;
    }
    else if (b.kind === 'pipe') {
      const along = w > d ? 'x' : 'z', len = Math.max(w, d), r = Math.min(w, d, h) / 2;
      mesh = ink(new THREE.CylinderGeometry(r, r, len, 12), PAL.mid, 0.05);
      if (along === 'x') mesh.rotation.z = Math.PI / 2; else mesh.rotation.x = Math.PI / 2;
    }
    else if (b.kind === 'rock') {
      mesh = ink(new THREE.IcosahedronGeometry(0.5, 0), 0x8a857c, 0.06);
      mesh.scale.set(w * 1.05, h * 1.15, d * 1.05);
      mesh.rotation.y = cx * 0.37;
    }
    else if (b.kind === 'tower') {
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: plank }); body.position.y = h / 2; g.add(body);
      const rim = ink(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), PAL.dark, 0.05); rim.position.y = h + 0.2; g.add(rim);
      if (b.team) { const flag = ink(new THREE.BoxGeometry(1.4, 0.9, 0.1), b.team === 'red' ? PAL.red : PAL.blue, 0.03); flag.position.set(0, h + 1.6, 0); g.add(flag); }
      root.add(g); dancers.push({ obj: g, h, phase: cx * 0.1, amp: 0.025 });
      continue;
    }
    else mesh = ink(new THREE.BoxGeometry(w, h, d), b.kind === 'step' ? PAL.light : 0xffffff, 0.04, { map: b.kind === 'step' ? null : plank });
    mesh.position.set(cx, b.min[1] + h / 2, cz);
    root.add(mesh);
  }

  // morros e arvores de borracha fora do muro
  for (let i = 0; i < 18; i++) {
    // morros longe o bastante pra nunca invadir a arena (diagonal dos cantos ~ ARENA * 1.42)
    const rad = 18 + (i % 4) * 5;
    const a = (i / 18) * Math.PI * 2, r = ARENA * 1.5 + rad + 6 + (i % 3) * 8;
    const hill = ink(new THREE.SphereGeometry(rad, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? PAL.mid : 0x8a857c, 0.12);
    hill.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
    hill.scale.y = 0.6;
    root.add(hill);
  }
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.1, r = ARENA * 1.42 + 8 + (i % 2) * 6;
    const t = makeTree();
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    root.add(t);
    swayers.push({ obj: t, base: 0, amp: 0.12, speed: 2.4, phase: i, tree: true });
  }
  for (const [x, z] of TH.trees) {
    const t = makeTree(0.8);
    t.position.set(x, 0, z);
    root.add(t);
    swayers.push({ obj: t, base: 0, amp: 0.1, speed: 2.4, phase: x, tree: true });
  }

  // sol com cara + nuvens
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), fog: false, transparent: true }));
  sunSpr.scale.set(36, 36, 1);
  sunSpr.position.set(-90, 75, -120);
  root.add(sunSpr);
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = makeCloud();
    c.position.set(-120 + i * 30, 40 + (i % 3) * 8, -60 + ((i * 37) % 120));
    root.add(c);
    clouds.push(c);
  }

  // arvores e nuvens: juntas, o balanco e o vento vao no shader (eram ~350 chamadas de desenho)
  const moveT = { value: 0 };
  const trees = swayers.filter(s => s.tree);
  mergeMoving(root, [...trees.map(s => ({ obj: s.obj, phase: s.phase, amp: s.amp })), ...clouds.map(c => ({ obj: c, phase: 0, amp: -1 }))], moveT);
  const chimneys = swayers.filter(s => !s.tree);
  // o resto que fica parado vira poucas malhas (so chamine e sol continuam soltos)
  const merged = mergeStatic(root, new Set([...chimneys.map(s => s.obj), sunSpr]));
  if (typeof location !== 'undefined' && /[?&]perf/.test(location.search)) console.log('[mapa] malhas juntadas', merged);

  return {
    root,
    dispose() { scene.remove(root); },
    update(t) {
      // predios e casas ficam parados (pulando atrapalhava a mira); so ceu, sol, arvores e chamines mexem
      const beat = t * BEAT * Math.PI;
      moveT.value = t % 3600;
      for (const s of chimneys) s.obj.rotation.z = Math.sin(t * s.speed + s.phase) * s.amp;
      sunSpr.material.rotation = Math.sin(t * 1.4) * 0.12;
      sunSpr.position.y = 75 + Math.sin(beat) * 1.2;
    },
  };
}

function hazardTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e3c14a'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#141210';
  for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + 128, 128); g.lineTo(i + 128, 128); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function addTank(scene, cx, y0, cz, w, h, dancers) {
  const g = new THREE.Group();
  g.position.set(cx, y0, cz);
  const tex = tankTexture();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 24), [toon(0xffffff, { map: tex, unique: true }), toon(PAL.mid), toon(PAL.mid)]);
  body.position.y = h / 2;
  body.rotation.y = Math.PI;
  outline(body, 0.08);
  g.add(body);
  const roof = ink(new THREE.ConeGeometry(w / 2 + 0.4, 2.6, 24), PAL.dark, 0.08);
  roof.position.y = h + 1.3;
  g.add(roof);
  const ball = ink(new THREE.SphereGeometry(0.4, 10, 8), PAL.white, 0.05);
  ball.position.y = h + 2.8;
  g.add(ball);
  scene.add(g);
  dancers.push({ obj: g, h, phase: 0, amp: 0.05 });
}

function makeTree(s = 1) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(Math.sin(i * 0.7) * 0.25, i * 0.6, 0));
  const trunk = ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.32, 8), PAL.dark, 0.06);
  g.add(trunk);
  const top = ink(new THREE.SphereGeometry(2.6, 14, 10), PAL.mid, 0.08);
  top.position.y = 5.6; top.scale.y = 0.85;
  g.add(top);
  for (const [x, y] of [[-1.6, 5], [1.7, 5.3], [0.2, 7.2]]) {
    const p = ink(new THREE.SphereGeometry(1.5, 12, 8), 0x7a756d, 0.07);
    p.position.set(x, y, 0.4);
    g.add(p);
  }
  g.scale.setScalar(s);
  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  for (const [x, y, r] of [[0, 0, 4], [4, -0.5, 3], [-4, -0.6, 3.2], [1.8, 1.8, 2.8], [-1.8, 1.4, 2.6]]) {
    const m = ink(new THREE.SphereGeometry(r, 12, 8), PAL.white, 0.15, { fog: false });
    m.position.set(x, y, 0);
    g.add(m);
  }
  return g;
}

function sunTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const cx = 256, cy = 256;
  g.fillStyle = '#faf8f2'; g.strokeStyle = '#141210'; g.lineWidth = 12; g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 175 : 240;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(cx, cy, 140, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#141210';
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(cx + s * 50, cy - 30, 22, 36, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#faf8f2';
    g.beginPath(); g.moveTo(cx + s * 50 + 4, cy - 40); g.lineTo(cx + s * 50 + 18, cy - 60); g.lineTo(cx + s * 50 + 20, cy - 38); g.fill();
    g.fillStyle = '#141210';
  }
  g.lineWidth = 12;
  g.beginPath(); g.arc(cx, cy + 20, 70, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- objetivos e pickups ----------
export function buildObjectives(scene, M) {
  const root = new THREE.Group();
  scene.add(root);
  const flagBase = M.flagBase, zones = M.zones, pickupSpots = M.pickups;
  const flags = {};
  for (const team of ['red', 'blue']) {
    const g = new THREE.Group();
    const pole = ink(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 8), PAL.dark, 0.03);
    pole.position.y = 1.7; g.add(pole);
    const knob = ink(new THREE.SphereGeometry(0.16, 8, 6), PAL.white, 0.03);
    knob.position.y = 3.45; g.add(knob);
    const clothGeo = new THREE.PlaneGeometry(1.6, 1, 10, 4);
    const cloth = new THREE.Mesh(clothGeo, toon(team === 'red' ? PAL.red : PAL.blue, { side: THREE.DoubleSide, unique: true }));
    cloth.position.set(0.8, 2.8, 0);
    g.add(cloth);
    const base = ink(new THREE.CylinderGeometry(2.3, 2.5, 0.12, 24), team === 'red' ? PAL.red : PAL.blue, 0.04);
    base.position.set(flagBase[team][0], 0.06, flagBase[team][2]);
    root.add(base);
    g.visible = false;
    root.add(g);
    flags[team] = { g, cloth, pad: base, base0: clothGeo.attributes.position.array.slice() };
  }
  const zoneObjs = zones.map(z => {
    const g = new THREE.Group();
    g.position.set(z.pos[0], z.pos[1] + 0.03, z.pos[2]);
    const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.35, z.r, 40), new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2;
    g.add(ring);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(z.r - 0.35, 40), new THREE.MeshBasicMaterial({ color: PAL.paper, transparent: true, opacity: 0.35 }));
    fill.rotation.x = -Math.PI / 2; fill.position.y = 0.01;
    g.add(fill);
    const letter = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(z.id, { burst: true }), transparent: true, depthTest: true }));
    letter.scale.set(2.4, 2.4, 1); letter.position.y = 4.2;
    g.add(letter);
    g.visible = false;
    root.add(g);
    return { g, fill, ring, letter };
  });
  const pickups = pickupSpots.map(p => {
    const g = new THREE.Group();
    g.position.set(p.pos[0], p.pos[1] + 0.9, p.pos[2]);
    if (p.kind === 'hp') g.add(milkBottle());
    else { const gun = buildGun(p.wpn, null); gun.scale.setScalar(1.8); g.add(gun); }
    const pad = ink(new THREE.CylinderGeometry(0.9, 1, 0.12, 16), p.kind === 'hp' ? PAL.white : PAL.light, 0.03);
    pad.position.set(p.pos[0], p.pos[1] + 0.06, p.pos[2]);
    root.add(pad);
    root.add(g);
    return { g, kind: p.kind, wpn: p.wpn };
  });
  return {
    flags, zones: zoneObjs, pickups, root,
    dispose() { scene.remove(root); },
    update(t, snap, mode) {
      for (const team of ['red', 'blue']) {
        const f = flags[team];
        f.g.visible = f.pad.visible = mode === 'ctf';
        if (!snap || mode !== 'ctf') continue;
        const s = snap.flags[team];
        f.g.position.set(s.pos[0], s.pos[1] + (s.state === 'carried' ? 1.2 : 0), s.pos[2]);
        f.g.rotation.y = t * (s.state === 'dropped' ? 2 : 0.4);
        const a = f.cloth.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const x = f.base0[i * 3];
          a.setZ(i, Math.sin(x * 3 - t * 7) * 0.14 * (x + 0.8));
        }
        a.needsUpdate = true;
      }
      zoneObjs.forEach((z, i) => {
        z.g.visible = mode === 'dom';
        if (!snap || mode !== 'dom') return;
        const s = snap.zones[i];
        z.fill.material.color.setHex(s.owner === 'red' ? PAL.red : s.owner === 'blue' ? PAL.blue : PAL.paper);
        z.fill.material.opacity = 0.25 + Math.abs(s.prog) * 0.35;
        z.ring.rotation.z = t * 0.5;
        z.letter.position.y = 4.2 + Math.sin(t * BEAT * Math.PI) * 0.25;
      });
      pickups.forEach((p, i) => {
        const on = snap ? snap.pickups[i] !== false && snap.pickups[i] !== undefined : true;
        p.g.visible = on && !(mode === 'gungame' && p.kind === 'wpn');
        p.g.rotation.y = t * 1.6;
        p.g.position.y = pickupSpots[i].pos[1] + 0.9 + Math.sin(t * 3 + i) * 0.15;
      });
    },
  };
}

function anvilMesh() {
  const g = new THREE.Group();
  const base = ink(new THREE.BoxGeometry(1.2, 0.35, 0.8), PAL.ink, 0.04); base.position.y = 0.18; g.add(base);
  const neck = ink(new THREE.BoxGeometry(0.6, 0.35, 0.5), PAL.ink, 0.04); neck.position.y = 0.5; g.add(neck);
  const top = ink(new THREE.BoxGeometry(1.9, 0.45, 0.8), PAL.dark, 0.04); top.position.set(0.15, 0.9, 0); g.add(top);
  const horn = ink(new THREE.ConeGeometry(0.28, 0.9, 6), PAL.dark, 0.03); horn.rotation.z = Math.PI / 2; horn.position.set(-1.25, 0.95, 0); g.add(horn);
  return g;
}

function milkBottle() {
  const g = new THREE.Group();
  const b = ink(new THREE.CylinderGeometry(0.22, 0.26, 0.6, 14), PAL.white, 0.03);
  g.add(b);
  const n = ink(new THREE.CylinderGeometry(0.12, 0.2, 0.25, 12), PAL.white, 0.03);
  n.position.y = 0.42; g.add(n);
  const cap = ink(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12), PAL.red, 0.02);
  cap.position.y = 0.58; g.add(cap);
  const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.265, 0.22, 14, 1, true), toon(0xffffff, { map: wordTexture('+', { burst: false, fill: '#a83a2c', size: 128 }) }));
  g.add(lbl);
  return g;
}

// ---------- efeitos ----------
// Tracados do tiro (escolha nos Ajustes; cada um ve o tracado escolhido por quem atirou)
export const TRACER_STYLES = ['chalk', 'fire', 'ink', 'spark', 'rainbow', 'void', 'toxic', 'gold', 'ice', 'none'];
const TRACERS = {
  fire: { w: 1.6, life: 0.16, grow: 0.8 },     // fogo: miolo amarelo, borda laranja, rabo que esfria
  ink: { w: 2.2, life: 0.22, grow: 0.3 },      // tinta: borrao preto em gotas
  spark: { w: 1.1, life: 0.12, grow: 0.0 },    // faisca: zigue-zague azul piscando
  rainbow: { w: 1.4, life: 0.18, grow: 0.4 },  // arco-iris correndo pelo tiro
  void: { w: 1.7, life: 0.24, grow: 0.6 },     // vazio: roxo escuro com estrelinhas
  toxic: { w: 1.8, life: 0.26, grow: 0.9 },    // toxico: verde gosmento com bolhas
  gold: { w: 1.3, life: 0.2, grow: 0.2 },      // ouro: brilho que corre e purpurina
  ice: { w: 1.5, life: 0.22, grow: 0.1 },      // gelo: azul cristalino em facetas
};
function tracerMaterial(style, len) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, // mistura normal: em cenario claro, somar luz deixava tudo branco
    uniforms: { uK: { value: 0 }, uLen: { value: len }, uS: { value: Object.keys(TRACERS).indexOf(style) } },
    vertexShader: `varying vec2 vUv; uniform float uS; uniform float uK; uniform float uLen;
      void main(){ vUv = uv; vec3 p = position;
        if (uS > 1.5 && uS < 2.5) { float z = p.z * uLen; p.x += sin(z * 7.0 + uK * 40.0) * 0.06 / max(1.0, 1.0); p.y += cos(z * 5.0 - uK * 30.0) * 0.06; }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uK; uniform float uLen; uniform float uS;
      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        float t = vUv.y;                     // 0 na boca, 1 no alvo
        float edge = abs(sin(vUv.x * 3.14159)); // 0 na borda do cilindro, 1 no meio
        float head = smoothstep(uK - 0.25, uK + 0.05, t); // o tiro corre e a cauda vai sumindo
        vec3 c; float a;
        if (uS < 0.5) { c = mix(vec3(0.85, 0.12, 0.0), vec3(1.0, 0.62, 0.08), edge * edge); a = head * (1.0 - uK) * (0.5 + edge * 0.5); }
        else if (uS < 1.5) { float drops = step(0.35, fract(t * uLen * 2.2 + uK * 3.0)); c = vec3(0.08, 0.07, 0.06); a = drops * (1.0 - uK) * smoothstep(0.0, 0.4, edge); }
        else if (uS < 2.5) { c = mix(vec3(0.2, 0.6, 1.0), vec3(0.9, 1.0, 1.0), edge); a = step(0.5, fract(uK * 25.0 + t * 3.0)) * (1.0 - uK) + edge * 0.3 * (1.0 - uK); }
        else if (uS < 3.5) { c = hue(fract(t * 1.5 - uK * 3.0)); a = (1.0 - uK) * (0.4 + edge * 0.6) * head; }
        else if (uS < 4.5) {
          float star = step(0.93, fract(sin(floor(t * uLen * 6.0) * 91.7 + floor(vUv.x * 6.0) * 13.1) * 4375.5));
          c = mix(vec3(0.22, 0.05, 0.45), vec3(0.75, 0.4, 1.0), edge); c = mix(c, vec3(1.0), star);
          a = (1.0 - uK) * (0.55 + edge * 0.45) * head;
        } else if (uS < 5.5) {
          float bub = smoothstep(0.32, 0.2, length(vec2(fract(t * uLen * 1.6 - uK * 2.0) - 0.5, edge - 0.6)));
          c = mix(vec3(0.25, 0.75, 0.1), vec3(0.75, 1.0, 0.3), edge); c = mix(c, vec3(0.9, 1.0, 0.7), bub);
          a = (1.0 - uK) * (0.5 + edge * 0.5);
        } else if (uS < 6.5) {
          float shine = smoothstep(0.12, 0.0, abs(t - uK * 1.4));
          float glit = step(0.9, fract(sin(floor(t * uLen * 9.0) * 51.3 + uK * 9.0) * 9631.7));
          c = mix(vec3(0.75, 0.52, 0.1), vec3(1.0, 0.9, 0.5), edge); c = mix(c, vec3(1.0), max(shine, glit));
          a = (1.0 - uK) * (0.6 + edge * 0.4);
        } else {
          float facet = step(0.5, fract(t * uLen * 1.2 + vUv.x * 2.0));
          c = mix(vec3(0.45, 0.8, 1.0), vec3(0.92, 0.98, 1.0), max(edge * 0.7, facet * 0.4));
          a = (1.0 - uK * uK) * (0.5 + edge * 0.5);
        }
        gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
      }`,
  });
}

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.tracerGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1, true);
    this.tracerGeo.translate(0, 0.5, 0);
    this.tracerGeo.rotateX(Math.PI / 2);
    this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xfaf8f2, transparent: true });
    this.puffGeo = new THREE.SphereGeometry(1, 10, 8);
  }

  add(obj, life, update) { this.scene.add(obj); this.list.push({ obj, life, t: 0, update }); }

  // estilo: chalk (giz, padrao), fire, ink, spark, rainbow, none
  tracer(o, e, style = 'chalk') {
    if (style === 'none') return;
    const a = new THREE.Vector3().fromArray(o), b = new THREE.Vector3().fromArray(e);
    const len = a.distanceTo(b);
    if (len < 0.5) return;
    if (style === 'chalk' || !TRACERS[style]) {
      const m = new THREE.Mesh(this.tracerGeo, this.tracerMat.clone());
      m.position.copy(a); m.lookAt(b);
      m.scale.set(1, 1, len);
      this.add(m, 0.09, (f, k) => { f.obj.material.opacity = 1 - k; f.obj.scale.x = f.obj.scale.y = 1 - k * 0.6; });
      return;
    }
    const T = TRACERS[style];
    const mat = tracerMaterial(style, len);
    const m = new THREE.Mesh(this.tracerGeo, mat);
    m.position.copy(a); m.lookAt(b);
    m.scale.set(T.w, T.w, len);
    m.renderOrder = 3;
    this.add(m, T.life, (f, k) => { mat.uniforms.uK.value = k; f.obj.scale.x = f.obj.scale.y = T.w * (1 + k * T.grow); });
  }

  word(text, pos, size = 1.4, life = 0.55) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(text), transparent: true, depthTest: false }));
    s.position.fromArray(pos);
    s.renderOrder = 10;
    const rot = (Math.random() - 0.5) * 0.6;
    this.add(s, life, (f, k) => {
      const pop = k < 0.2 ? k / 0.2 * 1.25 : 1.25 - (k - 0.2) * 0.3;
      f.obj.scale.set(size * pop, size * pop, 1);
      f.obj.material.rotation = rot + k * 0.2;
      f.obj.material.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      f.obj.position.y += 0.01;
    });
  }

  puff(pos, n = 4, size = 0.35, color = PAL.paper, life = 0.5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.puffGeo, toon(color));
      outline(m, 0.08);
      m.position.set(pos[0] + (Math.random() - 0.5) * size, pos[1] + (Math.random() - 0.5) * size, pos[2] + (Math.random() - 0.5) * size);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(size * 5);
      const s0 = size * (0.5 + Math.random() * 0.6);
      this.add(m, life * (0.7 + Math.random() * 0.6), (f, k, dt) => {
        f.obj.position.addScaledVector(v, dt);
        const sc = s0 * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75);
        f.obj.scale.setScalar(Math.max(0.001, sc));
      });
    }
  }

  impact(pos, normal) {
    this.puff(pos, 2, 0.18, PAL.light, 0.3);
    if (normal) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), new THREE.MeshBasicMaterial({ color: PAL.ink, transparent: true, polygonOffset: true, polygonOffsetFactor: -4 }));
      m.position.fromArray(pos).addScaledVector(new THREE.Vector3().fromArray(normal), 0.02);
      m.lookAt(m.position.clone().add(new THREE.Vector3().fromArray(normal)));
      this.add(m, 6, (f, k) => { f.obj.material.opacity = k > 0.8 ? (1 - k) * 5 : 1; });
    }
  }

  explosion(pos) {
    const core = new THREE.Mesh(this.puffGeo, toon(PAL.white, { unique: true }));
    outline(core, 0.06);
    core.position.fromArray(pos);
    this.add(core, 0.4, (f, k) => { f.obj.scale.setScalar(0.5 + k * 4.5); f.obj.material.color.setScalar(1 - k * 0.6); });
    this.puff(pos, 10, 2.2, PAL.mid, 1.1);
    this.puff(pos, 6, 1.4, PAL.dark, 0.8);
    this.word(['KABUM!', 'BUM!', 'CABRUM!'][Math.floor(Math.random() * 3)], [pos[0], pos[1] + 1.5, pos[2]], 4, 0.8);
    this.splat([pos[0], 0, pos[2]], 2.6, 0x2a2724);
  }

  flashBang(pos) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture('', { burst: true }), transparent: true, depthTest: false }));
    s.position.fromArray(pos); s.renderOrder = 9;
    this.add(s, 0.35, (f, k) => { const sc = 2 + k * 10; f.obj.scale.set(sc, sc, 1); f.obj.material.opacity = 1 - k; });
    this.word('PLINC!', [pos[0], pos[1] + 1, pos[2]], 2.4, 0.6);
  }

  // mancha de tinta no chao (morte, explosao)
  splat(pos, size = 1.6, color = PAL.ink) {
    const g = new THREE.CircleGeometry(1, 14);
    const a = g.attributes.position;
    for (let i = 1; i < a.count; i++) { const k = 0.7 + Math.random() * 0.55; a.setXY(i, a.getX(i) * k, a.getY(i) * k); }
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
    m.position.set(pos[0], (pos[1] || 0) + 0.03, pos[2]);
    this.add(m, 9, (f, k) => { const sc = size * Math.min(1, k * 40); f.obj.scale.setScalar(sc); f.obj.material.opacity = k > 0.8 ? (1 - k) * 5 * 0.85 : 0.85; });
  }

  // estrelinhas girando na cabeca de quem caiu
  stars(pos) {
    const g = new THREE.Group(); g.position.fromArray(pos);
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture('*', { burst: false, size: 128 }), transparent: true }));
      st.scale.set(0.5, 0.5, 1); g.add(st);
    }
    this.add(g, 1.3, (f, k, dt) => {
      f.obj.children.forEach((c, i) => { const a = k * 9 + i * Math.PI / 2; c.position.set(Math.cos(a) * 0.55, 0.15 + Math.sin(k * 20 + i) * 0.05, Math.sin(a) * 0.55); c.material.opacity = 1 - k; });
      f.obj.position.y += dt * 0.2;
    });
  }

  // numero de dano subindo (cabeca = maior e com outra cor)
  number(pos, n, head) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(String(n), { burst: false, size: 128, fill: head ? '#f2c14e' : '#faf8f2' }), transparent: true, depthTest: false }));
    s.position.set(pos[0] + (Math.random() - 0.5) * 0.5, pos[1], pos[2] + (Math.random() - 0.5) * 0.5);
    s.renderOrder = 11;
    const sz = head ? 0.95 : 0.65;
    this.add(s, 0.7, (f, k, dt) => {
      const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - (k - 0.15) * 0.3;
      f.obj.scale.set(sz * pop, sz * pop, 1); f.obj.position.y += dt * 1.4; f.obj.material.opacity = k > 0.6 ? (1 - k) / 0.4 : 1;
    });
  }

  // aviso + bigorna caindo do ceu
  anvilWarn(pos) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.4, 24), new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos[0], 0.05, pos[2]);
    this.add(ring, 1.9, (f, k) => { f.obj.material.opacity = 0.4 + Math.sin(k * 40) * 0.3; f.obj.scale.setScalar(1.2 - k * 0.3); });
  }

  anvil(pos) {
    const m = anvilMesh();
    m.position.set(pos[0], 20, pos[2]);
    this.add(m, 0.18, (f, k) => { f.obj.position.y = 20 * (1 - k); });
    setTimeout(() => {
      this.puff([pos[0], 0.4, pos[2]], 8, 1.6, PAL.paper, 0.8);
      this.word('TOIN!', [pos[0], 2.5, pos[2]], 3, 0.8);
      this.splat([pos[0], 0, pos[2]], 3, 0x2a2724);
      const lie = anvilMesh(); lie.position.set(pos[0], 0, pos[2]); lie.rotation.y = Math.random() * 6;
      this.add(lie, 3, (f, k) => { f.obj.position.y = -k * k * 1.2; });
    }, 180);
  }

  nadeMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'frag') {
      const b = ink(new THREE.SphereGeometry(0.11, 10, 8), 0x3f4a32, 0.012); b.scale.set(1, 1.25, 1); g.add(b);
      const l = ink(new THREE.BoxGeometry(0.03, 0.12, 0.05), PAL.mid, 0.006); l.position.set(0.07, 0.08, 0); g.add(l);
      const c = ink(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), PAL.mid, 0.006); c.position.y = 0.15; g.add(c);
    } else {
      const b = ink(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10), PAL.light, 0.01); g.add(b);
      const c = ink(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), PAL.dark, 0.006); c.position.y = 0.13; g.add(c);
    }
    return g;
  }

  blimpMesh(team) {
    const g = new THREE.Group();
    const body = ink(new THREE.SphereGeometry(3, 18, 12), PAL.light, 0.15); body.scale.set(1, 0.8, 2.3); g.add(body);
    const band = ink(new THREE.CylinderGeometry(2.45, 2.45, 0.8, 18), team === 'blue' ? PAL.blue : PAL.red, 0); band.rotation.x = Math.PI / 2; g.add(band);
    for (const [x, y] of [[0, 2.2], [0, -2.2], [2.2, 0], [-2.2, 0]]) {
      const fin = ink(new THREE.BoxGeometry(x ? 1.8 : 0.15, y ? 1.8 : 0.15, 1.6), PAL.dark, 0.06); fin.position.set(x, y, 6); g.add(fin);
    }
    const gond = ink(new THREE.BoxGeometry(1.2, 0.9, 2.4), PAL.dark, 0.06); gond.position.y = -2.7; g.add(gond);
    return g;
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.update && f.update(f, k, dt);
      if (k >= 1) { this.scene.remove(f.obj); this.list.splice(i, 1); }
    }
  }
}
