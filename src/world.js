// Vila Borracha: cena, cidade que danca, ceu, objetivos, pickups e efeitos.
import { podiumClear } from '../shared/podiumspot.js';
import * as THREE from 'three';
import { TracerFx, TRACER_GLOW } from './tracerfx.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ink, toon, outline, outlineInstanced, geo, freeGeos, PAL, hatchTexture, facadeTexture, tankTexture, wordTexture, mergeStatic, mergeMoving, splitByCell, outlineCells, OUTLINE_FAR, OUTLINE_CFG } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { standable, floorAt } from '../shared/nav.js';
import { buildGun, rocketMesh } from './arsenal.js';

export const BEAT = 2.2; // batidas por segundo da danca da cidade

const THEME = {
  bonde: { sky: 0xd6d2c6, ground: ['#cdc6b6', '#7a7366'], trees: [] }, // Ladeira do Bonde: a rua vem do trilho (escortview)
  // bairros grandes e avenida (08/11): as ruas vem do proprio mapa (M.roads)
  becos: { sky: 0xcfc8ba, ground: ['#b8b0a0', '#6a6458'], fog: [70, 230], trees: [] },
  feira: { sky: 0xe4dac0, ground: ['#d3c7a8', '#8d8064'], fog: [80, 250], trees: [] },
  largo: { sky: 0xd2d6d0, ground: ['#bcbfb4', '#686c62'], fog: [80, 260], trees: [] },
  cortejo: { sky: 0xdcd6c6, ground: ['#cdc6b6', '#7a7366'], fog: [80, 260], trees: [] },
  vila: { sky: 0xd8d4ca, ground: ['#cfc9bd', '#7e786e'], roads: true, trees: [[-12, -12], [12, 12], [-40, 14], [40, -14], [-30, 30], [30, -30]] },
  fabrica: { sky: 0xc9c4ba, ground: ['#bdb7ab', '#6e6a63'], hazard: true, trees: [] },
  fronteira: { sky: 0xdcd8cc, ground: ['#d3cdb8', '#8a8470'], paths: true, trees: [[-40, -36], [40, 36], [-62, 10], [62, -10], [-14, 50], [14, -50], [-56, -50], [56, 50]] },
  // estaleiro: asfalto do porto com faixas de seguranca, sem arvore la dentro
  estaleiro: { sky: 0xcfd3d2, ground: ['#b9b6ae', '#6a675f'], hazard: true, hazardStrips: [[40, 1, 0, -15], [40, 1, 0, 15]], trees: [] },
  // Banco Ferradura: paralelepipedo de cidade, ruas dos lados e o beco atras do banco; arvores so na praca
  ferradura: { sky: 0xd8d5cc, ground: ['#c9c3b6', '#77716a'], roadList: [[10, 92, -24, 0], [10, 92, 24, 0], [92, 14, 0, -27], [30, 26, 0, 31]], trees: [[-10, 24], [10, 24], [-10, 38], [10, 38], [-18, 44], [18, 44]] },
  // Casa da Moeda (04/11, refeita): calcamento mais frio, ruas onde as ruas dela estao, arvores so na praca
  moeda: { sky: 0xd2d6d0, ground: ['#bcc0b4', '#646a60'], roadList: [[12, 124, -30, 0], [8, 124, 30, 0], [124, 10, 0, 42], [40, 26, 0, -38]], trees: [[-14, -17], [14, -17], [-40, -46], [40, -46]] },
  // Cais do Sol Poente (04/11): docas no por do sol, mas na paleta do jogo (laranja e rosa desbotados, nada saturado)
  // Vila Muamba (13/11 b): vila de reboco quente, terra batida na rua
  muamba: { sky: 0xe6d8bc, ground: ['#cdbf9f', '#857659'], fog: [60, 200], trees: [] },
  docas: { sky: 0xf0b48c, ground: ['#b99c78', '#6d5a46'], fog: [50, 160], docks: true, trees: [] },
  // Xilindro (13/11): presidio de concreto, ceu de chumbo; chao de cimento do patio e do pavilhao
  xilindro: { sky: 0xc4c6c2, ground: ['#b8b6ae', '#6c6a64'], fog: [40, 140], trees: [] },
  // Estande Gargalhada (14/11): campo de tiro fechado, chao de serragem; nevoa longe (o fundo de 64 m tem que aparecer)
  estande: { sky: 0x2a2420, ground: ['#b89a74', '#6b5236'], fog: [70, 160], trees: [] },
  // Canyon Poeira (04/11): deserto grande, ceu de fim de tarde quente, areia dourada; nevoa longe (mapa aberto)
  deserto: { sky: 0xeed7ae, ground: ['#e3c48f', '#b08a52'], fog: [90, 300], desert: true, trees: [] },
  // refinaria: areia do deserto, ceu quente
  refinaria: { sky: 0xe6d9bf, ground: ['#dccaa0', '#9c8662'], trees: [] },
  // Estudio Tinteiro (Noite dos Borroes, 03/11 pedido dele): estudio abandonado de NOITE, escuro e assustador.
  // Ceu quase preto, nevoa escura perto, luz da lua fraca e azulada; quem ilumina e a lanterna de cada um e as
  // lampadas penduradas piscando (tinteiroDecor). Teto em cima do estudio (o telhado fica a ceu aberto).
  tinteiro: { sky: 0x08080b, ground: ['#2f2a26', '#14110f'], fog: [3, 30], dark: true, trees: [] },
  // ilha do battle royale: grama rabiscada, neblina perto (esconde o longe e alivia o celular), muita arvore
  ilha: { sky: 0xd9d6c8, ground: ['#cdd0b4', '#7f8467'], paths: true, fog: [55, 165], trees: (() => {
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const out = []; for (let i = 0; i < 70; i++) out.push([(r() * 2 - 1) * 104, (r() * 2 - 1) * 104]); return out;
  })() },
};
// conteineres: cores de carga desbotadas, uma por semente
const CONT_COLS = [0x9c4a36, 0x3f6a8a, 0x5f7f3e, 0xb08a3a, 0x7a4f7a, 0x4f7f7a, 0xa8653a, 0x5a5f8f];

// arvores do tema do mapa (07/11): a camera de cinema do lobby desvia delas (nao sao caixa de colisao)
export const mapTrees = (M) => (THEME[M.theme] || THEME.vila).trees || [];

// Monta o cenario do mapa M num grupo (troca de mapa = remove o grupo e monta outro)
export function buildWorld(scene, M) {
  const dancers = [];
  const carGroups = [];
  const swayers = [];
  const root = new THREE.Group();
  scene.add(root);
  const TH = THEME[M.theme] || THEME.vila;
  const ARENA = M.arena;
  scene.background = new THREE.Color(TH.sky);
  scene.fog = new THREE.Fog(TH.sky, TH.fog ? TH.fog[0] : ARENA * 1.2, TH.fog ? TH.fog[1] : ARENA * 4);

  const hemiL = new THREE.HemisphereLight(TH.dark ? 0x5a6280 : 0xffffff, TH.dark ? 0x0a0908 : 0x6e6a63, TH.dark ? 0.32 : 1.4);
  root.add(hemiL);
  const sun = new THREE.DirectionalLight(TH.dark ? 0x8fa0c8 : TH.docks ? 0xffc996 : 0xffffff, TH.dark ? 0.3 : 2.2); // escuro: luar fraco; cais: sol baixo e laranja
  sun.position.set(30, 60, 20);
  if (TH.docks) sun.position.set(-10, 22, -60);
  root.add(sun);

  // chao: paralelepipedo rabiscado + estrada clara
  const groundTex = hatchTexture(TH.ground[0], TH.ground[1], { density: 40, cross: true });
  // Floresta (03/11): o chao escuro do estudio fica so dentro dele; fora, chao de mato num plano com furo (nada sobreposto = sem piscar)
  const GS = M.forest ? (M.studio + 1) * 2 : M.quayZ ? ARENA * 2 + 2 : ARENA * 2 + 60;
  groundTex.repeat.set(M.forest ? GS / 4 : ARENA / 2, M.forest ? GS / 4 : ARENA / 2);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GS, GS), toon(0xffffff, { map: groundTex }));
  ground.rotation.x = -Math.PI / 2;
  if (M.quayZ) { const qd = ARENA + 1 - M.quayZ; ground.geometry.dispose(); ground.geometry = new THREE.PlaneGeometry(GS, qd); ground.position.z = (M.quayZ + ARENA + 1) / 2; groundTex.repeat.set(GS / 4, qd / 4); } // Cais: chao so ate a borda; dali pra fora e mar
  root.add(ground);
  const roadTex = hatchTexture('#e8e4da', '#a8a196', { density: 10 });
  roadTex.repeat.set(2, 24);
  const roads = TH.roads ? [[8, ARENA * 2, 0, 0], [ARENA * 2, 8, 0, 0], [6, ARENA * 2, -36, 0], [6, ARENA * 2, 36, 0]]
    : TH.paths ? [[7, ARENA * 2, 0, 0], [6, ARENA * 2, -44, 0], [6, ARENA * 2, 44, 0]] : M.roads || TH.roadList || [];
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
  // Banco Ferradura: marmore em blocos (repete pelo tamanho da peca, senao o bloco fica do tamanho do predio)
  const marbleBase = M.theme === 'ferradura' ? hatchTexture('#ece7dc', '#b3ab9c', { bricks: true }) : null;
  const graniteBase = hatchTexture('#a8aea4', '#5e665d', { bricks: true }); // Casa da Moeda (04/11)
  const marble = (w, h) => { const t = marbleBase.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 1.6))); return t; };

  const hazardTex = hazardTexture();
  const forestTrees = [];
  const preBoxes = new Set(root.children); // mapa modelado no Blender (06/11): o que o laco desenha sai quando o .glb chega
  let tagFrom = root.children.length, tagKind = null; // cada objeto sabe de que peca veio (MAP_KEEP: o que o .glb NAO substitui)
  const tagNew = () => { for (let i = tagFrom; i < root.children.length; i++) root.children[i].userData.kind = tagKind; tagFrom = root.children.length; };
  for (const b0 of M.boxes) {
    tagNew(); tagKind = b0.kind + (b0.sign ? '+sign' : '');
    if (b0.kind === 'tier') continue; // degrau de colisao de forma redonda (06/11): o desenho vem da 1a caixa
    const b = b0.vis ? { ...b0, min: b0.vis.min, max: b0.vis.max } : b0; // desenha com a medida do desenho, nao a do degrau
    const w = b.max[0] - b.min[0], h = b.max[1] - b.min[1], d = b.max[2] - b.min[2];
    const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    if (b.kind === 'roof') continue; // corpo invisivel do telhado pontudo (o desenho vem com a casa)
    if (b.kind === 'nogo') continue; // parede invisivel dos vazios fechados (shared/map.js, fillVoids)
    if (b.kind === 'quayedge') continue; // borda do cais: muro invisivel (o desenho e o mar, docksDecor)
    if (b.kind === 'forestedge') continue; // borda da floresta: o desenho e a mata fechada (forestDecor)
    if (b.kind === 'tree') { forestTrees.push(b); continue; } // arvores da floresta: copias (InstancedMesh) no forestDecor
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
    if (b.kind === 'wall' && TH.desert) { const g = DESERT.cliff(w, h, d); g.position.set(cx, b.min[1], cz); root.add(g); continue; } // deserto: borda e paredao de pedra
    if (TH.desert && b.kind === 'bridge') { const g = DESERT.plank(w, h, d); g.position.set(cx, b.min[1], cz); root.add(g); continue; }
    if (b.kind === 'wall') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: brick });
    else if (b.kind === 'crate') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.045, { map: plank });
    else if (b.kind === 'contshell' || b.kind === 'contdoor') {
      // conteiner aberto: parede fina com o mesmo friso de fora; porta dobrada mais escura
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const col = CONT_COLS[(b.seed || 0) % CONT_COLS.length], door = b.kind === 'contdoor', part = ink(new THREE.BoxGeometry(w, h, d), door ? PAL.dark : col, 0.02); part.position.y = h / 2; g.add(part);
      if (!door && !b.roof) { const X = w > d, len = Math.max(w, d), n = Math.floor(len / 0.5); for (let i = 1; i < n; i++) { const k = -len / 2 + i * (len / n), rib = ink(new THREE.BoxGeometry(X ? 0.06 : w + 0.06, h * 0.86, X ? d + 0.06 : 0.06), col, 0); rib.material = rib.material.clone(); rib.material.color.multiplyScalar(0.82); rib.position.set(X ? k : 0, h / 2, X ? 0 : k); g.add(rib); } }
      root.add(g); continue;
    }
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
    // casas/predios que da pra entrar (04/11): reboco na cor da casa, piso de tabua, laje escura com beiral
    else if (b.kind === 'hwall') mesh = ink(new THREE.BoxGeometry(w, h, d), b.col ?? 0xe8dcc4, 0.04, { map: sideTex });
    else if (b.kind === 'hfloor') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.03, { map: plank });
    else if (b.kind === 'hroof') mesh = ink(new THREE.BoxGeometry(w, h, d), PAL.dark, 0.05);
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
    else if (b.kind === 'ringfloor') { // lona do ringue: base escura e lona clara com o logo-estrela no meio
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const base = ink(new THREE.BoxGeometry(w, h * 0.85, d), PAL.dark, 0.05); base.position.y = h * 0.425; g.add(base);
      const mat = ink(new THREE.BoxGeometry(w - 0.3, h * 0.15, d - 0.3), PAL.paper, 0.03); mat.position.y = h * 0.925; g.add(mat);
      const star = new THREE.Mesh(new THREE.CircleGeometry(1.6, 5), new THREE.MeshBasicMaterial({ color: PAL.red })); star.rotation.x = -Math.PI / 2; star.position.y = h + 0.01; g.add(star);
      root.add(g); continue;
    }
    else if (b.kind === 'rope') { // tres cordas (vermelha, branca, vermelha); a caixa invisivel segura o corpo
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const len = Math.max(w, d), along = w > d;
      [0.35, 0.8, 1.25].forEach((y, i) => { const r = ink(new THREE.CylinderGeometry(0.06, 0.06, len, 8), i === 1 ? PAL.white : PAL.red, 0.015); r.rotation[along ? 'z' : 'x'] = Math.PI / 2; r.position.y = y; g.add(r); });
      root.add(g); continue;
    }
    else if (b.kind === 'post') mesh = ink(new THREE.CylinderGeometry(w / 2, w / 2, h, 10), PAL.red, 0.04);
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
      mesh = ink(new THREE.IcosahedronGeometry(0.5, 0), TH.desert ? 0xa8714a : 0x8a857c, 0.06); // deserto: pedra cor de terra
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
    else if (b.kind === 'marble') {
      mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: marble(Math.max(w, d), h), unique: true });
      if (b.sign) { // frontao: placa com o nome, triangulo em cima e a ferradura dourada
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.8), new THREE.MeshBasicMaterial({ map: bankSign() }));
        plate.position.set(cx, b.min[1] + h / 2, b.max[2] + 0.02); root.add(plate);
        const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, 3.2); tri.lineTo(-w / 2, 0);
        const ped = ink(new THREE.ExtrudeGeometry(tri, { depth: d * 0.8, bevelEnabled: false }), 0xf0ebe0, 0.07);
        ped.position.set(cx, b.max[1], cz - d * 0.4); root.add(ped);
        const shoe = horseshoe(0.9); shoe.position.set(cx, b.max[1] + 1.2, cz + d * 0.4 + 0.08); root.add(shoe);
      }
    }
    else if (b.kind === 'granite' || b.kind === 'mintsign') { // Casa da Moeda: granito em blocos (repete pelo tamanho da peca)
      const t = graniteBase.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 2.4)), Math.max(1, Math.round(h / 1.2)));
      mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: t, unique: true });
      if (b.kind === 'mintsign') { const plate = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, h * 0.72), new THREE.MeshBasicMaterial({ map: mintSign() })); plate.position.set(cx, b.min[1] + h / 2, b.min[2] - 0.03); plate.rotation.y = Math.PI; root.add(plate); }
    }
    else if (b.kind === 'goldtrim') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xc9a34a, 0.02);
    else if (b.kind === 'copperroof') mesh = ink(new THREE.BoxGeometry(w, h, d), 0x5e8f7c, 0.06);
    else if (b.kind === 'rail') { // balaustrada: corrimao escuro em cima de pilaretes claros
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const along = w > d, len = Math.max(w, d), n = Math.max(2, Math.round(len / 0.55));
      const top = ink(new THREE.BoxGeometry(along ? len : w + 0.1, 0.16, along ? d + 0.1 : len), PAL.dark, 0.03); top.position.y = h - 0.08; g.add(top);
      for (let i = 0; i < n; i++) { const k = -len / 2 + (i + 0.5) * len / n; const pin = ink(new THREE.CylinderGeometry(0.07, 0.11, h - 0.16, 6), PAL.paper, 0.02); pin.position.set(along ? k : 0, (h - 0.16) / 2, along ? 0 : k); g.add(pin); }
      root.add(g); continue;
    }
    else if (b.kind === 'column') { // coluna de banco: fuste, base e capitel
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const r = Math.min(w, d) / 2;
      const shaft = ink(new THREE.CylinderGeometry(r * 0.8, r * 0.9, h - 0.8, 12), PAL.paper, 0.05); shaft.position.y = h / 2; g.add(shaft);
      for (const y of [0.2, h - 0.2]) { const cap = ink(new THREE.BoxGeometry(w * 1.25, 0.4, d * 1.25), 0xe6e0d4, 0.04); cap.position.y = y; g.add(cap); }
      root.add(g); continue;
    }
    else if (b.kind === 'bankroof') mesh = ink(new THREE.BoxGeometry(w, h, d), PAL.dark, 0.06);
    else if (b.kind === 'counter') { // balcao dos caixas: madeira escura com tampo claro
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const body = ink(new THREE.BoxGeometry(w, h, d), 0x5d4a3a, 0.05); body.position.y = h / 2; g.add(body);
      const lid = ink(new THREE.BoxGeometry(w + 0.2, 0.12, d + 0.2), PAL.paper, 0.03); lid.position.y = h + 0.06; g.add(lid);
      root.add(g); continue;
    }
    else if (b.kind === 'duct') mesh = ink(new THREE.BoxGeometry(w, h, d), 0x9aa0a0, 0.05, { map: sideTex });
    else if (b.kind === 'coreto') { // coreto: piso de madeira em cima de base de pedra
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const r = Math.min(w, d) / 2;
      const base = ink(new THREE.CylinderGeometry(r * 1.05, r * 1.1, h, 8), PAL.light, 0.05); base.position.y = h / 2; base.rotation.y = Math.PI / 8; g.add(base);
      const deck = ink(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.06, 8), 0xffffff, 0, { map: plank }); deck.position.y = h + 0.03; deck.rotation.y = Math.PI / 8; g.add(deck);
      root.add(g); continue;
    }
    else if (b.kind === 'coretoroof') { // telhado do coreto: cone listrado vermelho e branco com bandeirinha
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const r = Math.min(w, d) / 2;
      const shell = ink(new THREE.ConeGeometry(r, 2.6, 16), 0xffffff, 0.07, { map: stripeTex() }); shell.position.y = 1.3 + h; g.add(shell);
      const rim = ink(new THREE.CylinderGeometry(r, r, h, 8), PAL.dark, 0.04); rim.position.y = h / 2; g.add(rim);
      const mast = ink(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), PAL.ink, 0); mast.position.y = h + 2.9; g.add(mast);
      const flag = ink(new THREE.BoxGeometry(0.9, 0.5, 0.06), PAL.red, 0.02); flag.position.set(0.45, h + 3.1, 0); g.add(flag);
      root.add(g); dancers.push({ obj: g, h: 3, phase: 1.3, amp: 0.03 }); continue;
    }
    else if (b.kind === 'bench') { // banco de praca: ripas de madeira em pes de ferro
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const seat = ink(new THREE.BoxGeometry(w, 0.12, d), 0xffffff, 0.03, { map: plank }); seat.position.y = h * 0.55; g.add(seat);
      const back = ink(new THREE.BoxGeometry(0.1, h * 0.55, d), 0xffffff, 0.03, { map: plank }); back.position.set(Math.sign(cx) * w * 0.45, h * 0.8, 0); g.add(back);
      for (const e of [-1, 1]) { const leg = ink(new THREE.BoxGeometry(w * 0.9, h * 0.55, 0.1), PAL.ink, 0); leg.position.set(0, h * 0.27, e * d * 0.42); g.add(leg); }
      root.add(g); continue;
    }
    else if (b.kind === 'hedge') mesh = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.05, { map: hedgeTex ||= hatchTexture('#9ea283', '#5d6249', { density: 30, cross: true }) });
    else if (b.kind === 'lamp') { // poste de rua de 1930: haste preta e lanterna
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const pole = ink(new THREE.CylinderGeometry(0.08, 0.14, h, 8), PAL.ink, 0.02); pole.position.y = h / 2; g.add(pole);
      const lamp = ink(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 6), PAL.paper, 0.03); lamp.position.y = h + 0.2; g.add(lamp);
      const hat = ink(new THREE.ConeGeometry(0.38, 0.3, 6), PAL.ink, 0.02); hat.position.y = h + 0.6; g.add(hat);
      root.add(g); continue;
    }
    else if (b.kind === 'car') { // carro parado dos anos 30: modelo do Tripo (04/11) recolorido; ate carregar, o de caixas
      const g = new THREE.Group(); g.position.set(cx, b.min[1], cz);
      const along = d > w, L = Math.max(w, d), W = Math.min(w, d), col = CAR_COLORS[(b.seed || 0) % CAR_COLORS.length];
      if (!along) g.rotation.y = Math.PI / 2;
      root.add(g); dancers.push({ obj: g, h, phase: cx * 0.2, amp: 0.03 }); carGroups.push(g); // fora do mergeStatic: o modelo chega depois
      const boxy = new THREE.Group(); g.add(boxy);
      carModel().then(M => { if (!M) return; g.remove(boxy); freeGeos(boxy); const m = new THREE.Mesh(M.geo, carMat(col)); const k = L / M.len; m.scale.set(k, k, k); m.rotation.y = (b.seed || 0) % 2 ? Math.PI : 0; outline(m, 0.05); g.add(m); });
      { const g = boxy;
      const body = ink(new THREE.BoxGeometry(W, h * 0.45, L), col, 0.05); body.position.y = h * 0.42; g.add(body);
      const cab = ink(new THREE.BoxGeometry(W * 0.9, h * 0.4, L * 0.45), PAL.dark, 0.05); cab.position.set(0, h * 0.82, -L * 0.08); g.add(cab);
      for (const [ex, ez] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const wh = ink(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), PAL.ink, 0.02); wh.rotation.z = Math.PI / 2; wh.position.set(ex * W * 0.5, 0.42, ez * L * 0.32); g.add(wh); }
      } continue;
    }
    else if (b.kind === 'dumpster') mesh = ink(new THREE.BoxGeometry(w, h, d), 0x4f6a52, 0.05, { map: sideTex });
    else if (DOCKS[b.kind]) { const g = DOCKS[b.kind](w, h, d, b); g.position.set(cx, b.min[1], cz); root.add(g); continue; } // Cais do Sol Poente (04/11)
    else if (DESERT[b.kind]) { const g = DESERT[b.kind](w, h, d, b); g.position.set(cx, b.min[1], cz); root.add(g); continue; } // Canyon Poeira (04/11)
    else if (STUDIO[b.kind]) { const g = STUDIO[b.kind](w, h, d, b); g.position.set(cx, b.min[1], cz); root.add(g); continue; } // moveis do Estudio Tinteiro
    else mesh = ink(new THREE.BoxGeometry(w, h, d), b.kind === 'step' ? (marbleBase ? 0xe6e0d4 : TH.desert ? 0xb98a5e : PAL.light) : 0xffffff, 0.04, { map: b.kind === 'step' ? null : plank });
    mesh.position.set(cx, b.min[1] + h / 2, cz);
    root.add(mesh);
  }

  // Vila remodelada no Blender (06/11, pedido dele): o .glb tem cada peca na medida da caixa de colisao. Enquanto carrega,
  // fica o desenho de caixas; quando chega, as caixas desenhadas saem e entra o modelo (material de desenho + contorno)
  let ready = Promise.resolve(); // 07/11: resolve quando o modelo do mapa ja esta no lugar (a cortina da troca de mapa espera isto)
  if (MAP_GLB[M.id] && !globalThis.__NO_MAP_GLB) { // __NO_MAP_GLB: tools/mapa.html?old=1 (print do antes, pro Reels)
    tagNew(); const keep = MAP_KEEP[M.id] || [];
    const boxObjs = root.children.filter(o => !preBoxes.has(o) && !keep.includes(o.userData.kind)); for (const o of boxObjs) o.userData.mapBox = true; // fora da fusao: saem quando o modelo chega
    const cached = MAPG.get(MAP_GLB[M.id]);
    if (cached) { for (const o of boxObjs) { root.remove(o); freeGeos(o); } root.add(cached.clone()); } // ja baixado (preloadMap na tela de carregamento): nada de caixa antes
    else { for (const o of boxObjs) o.visible = false; // ainda baixando: caixa nenhuma aparece (o modelo chega na tela de carregamento)
      ready = mapModel(MAP_GLB[M.id]).then(g => { if (!root.parent) return; if (!g) { for (const o of boxObjs) o.visible = true; return; } /* .glb falhou: volta o desenho de caixas */ for (const o of boxObjs) { root.remove(o); freeGeos(o); } root.add(g.clone()); }); }
  }
  if (M.id === 'ferradura') bankDecor(root); // decoracao com posicoes do Banco Ferradura (a Casa da Moeda usa o mesmo tema, mas nao isso)
  const studio = TH.dark ? tinteiroDecor(root, M.studio || ARENA) : null;
  const preForest = new Set(root.children); // o que e do estudio/mapa (a mata vem depois e fica de fora do recorte)
  const forest = M.forest ? forestDecor(root, M, forestTrees) : null;
  if (TH.docks) docksDecor(root, M); // mar, borda de pedra do cais e o sol baixo
  // Floresta (03/11, desempenho): o miolo do estudio vai num grupo proprio (juntado a parte). Da mata, atras da parede
  // de 12 m, ele nem aparece mas era desenhado (~550 chamadas olhando pro estudio); cull() some com ele la fora.
  // Fora do recorte: a mata (malhas instanciadas na origem) e lampada com luz de verdade (luz que some muda a
  // contagem de luzes da cena e recompila todos os materiais)
  let inner = null;
  if (M.forest) {
    inner = new THREE.Group(); const lim = M.studio - 0.1;
    for (const o of [...root.children]) if (preForest.has(o) && o !== ground && !o.isLight && !o.getObjectByProperty('isLight', true) && Math.abs(o.position.x) < lim && Math.abs(o.position.z) < lim) inner.add(o);
    root.add(inner);
  }

  // morros e arvores de borracha fora do muro (estudio fechado: nada disso, so o escuro)
  for (let i = 0; i < (TH.dark || TH.docks ? 0 : 18); i++) { // cais: em volta e mar
    // morros longe o bastante pra nunca invadir a arena (diagonal dos cantos ~ ARENA * 1.42)
    const rad = 18 + (i % 4) * 5;
    const a = (i / 18) * Math.PI * 2, r = ARENA * 1.5 + rad + 6 + (i % 3) * 8;
    const hill = ink(new THREE.SphereGeometry(rad, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), i % 2 ? PAL.mid : 0x8a857c, 0.12);
    hill.position.set(Math.cos(a) * r, -2, Math.sin(a) * r);
    hill.scale.y = 0.6;
    root.add(hill);
  }
  for (let i = 0; i < (TH.dark || TH.docks || TH.desert ? 0 : 26); i++) { // arvore de borracha: nem no mar nem no deserto
    const a = (i / 26) * Math.PI * 2 + 0.1, r = ARENA * 1.42 + 8 + (i % 2) * 6;
    const t = makeTree();
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    root.add(t);
    swayers.push({ obj: t, base: 0, amp: 0.12, speed: 2.4, phase: i, tree: true });
  }
  for (const [x, z] of TH.trees) {
    if (M.boxes.some(b => b.kind !== 'trunk' && x > b.min[0] - 2 && x < b.max[0] + 2 && z > b.min[2] - 2 && z < b.max[2] + 2)) continue; // arvore nunca dentro de casa/pedra
    if (podiumClear(M, x, z)) continue; // nem entre a camera e o podio (REGRA: enfeite novo do mapa passa por aqui)
    const t = makeTree(0.8);
    M.boxes.push({ min: [x - 0.3, 0, z - 0.3], max: [x + 0.3, 4.4, z + 0.3], kind: 'trunk' }); // 08/11 (pedido dele): tronco tem corpo; sai no dispose
    t.position.set(x, 0, z);
    root.add(t);
    swayers.push({ obj: t, base: 0, amp: 0.1, speed: 2.4, phase: x, tree: true });
  }

  // sol com cara + nuvens (estudio de noite: lua cheia de desenho no lugar do sol, sem nuvem)
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: TH.dark ? moonTexture() : sunTexture(), fog: false, transparent: true }));
  sunSpr.scale.set(36, 36, 1);
  sunSpr.position.set(-90, 75, -120);
  if (TH.docks) { sunSpr.position.set(-20, 16, -175); sunSpr.scale.set(48, 48, 1); sunSpr.material.color.set(0xffb27a); } // por do sol: sol grande e baixo no mar
  // o sol fica a 85 m da camera na mesma direcao e no mesmo tamanho aparente (04/11): a distancia de desenho curta (95 m)
  // cortava o sol e a lua, que moravam a 150-180 m
  const SUN_D = 85, sunOff = sunSpr.position.clone(), sunK = SUN_D / sunOff.length(); sunOff.multiplyScalar(sunK); sunSpr.scale.multiplyScalar(sunK);
  let sunBob = 0;
  root.add(sunSpr);
  const clouds = [];
  for (let i = 0; i < (TH.dark ? 0 : 9); i++) {
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
  const keep = new Set([...carGroups, ...root.children.filter(o => o.userData.async || o.userData.mapBox), ...chimneys.map(s => s.obj), sunSpr, ...(studio ? studio.moving : []), ...(forest ? forest.moving : [])]);
  if (inner) { mergeStatic(inner, keep); keep.add(inner); }
  const merged = mergeStatic(root, keep);
  if (typeof location !== 'undefined' && /[?&]perf/.test(location.search)) console.log('[mapa] malhas juntadas', merged);
  const fdoor = M.bor?.doors.find(d => d.id === 'floresta');

  // modo NOITE (07/11, pedido dele: Roubo ao Cofre no Banco Ferradura de noite). Leve: nenhuma luz de verdade a mais. Ceu e
  // nevoa azul-noite, luar e ambiente baixos, lua no lugar do sol, sem nuvem; lampioes com halo e poca de luz no chao (imagem
  // somada), portas do banco acesas e lustres no salao. Os bonecos ganham brilho proprio no main.js (nightChar).
  const day = { sky: TH.sky, h: [hemiL.color.getHex(), hemiL.groundColor.getHex(), hemiL.intensity], s: [sun.color.getHex(), sun.intensity], map: sunSpr.material.map };
  let nightOn = false, nightG = null;
  function setNight(on) {
    on = !!on; if (on === nightOn) return; nightOn = on;
    const sky = on ? 0x1d2438 : day.sky;
    scene.background = new THREE.Color(sky); if (scene.fog) scene.fog.color.set(sky);
    hemiL.color.set(on ? 0x8494c8 : day.h[0]); hemiL.groundColor.set(on ? 0x221f24 : day.h[1]); hemiL.intensity = on ? 0.8 : day.h[2];
    sun.color.set(on ? 0xa8b8e6 : day.s[0]); sun.intensity = on ? 0.9 : day.s[1];
    sunSpr.material.map = on ? (setNight.moon ||= moonTexture()) : day.map; sunSpr.material.needsUpdate = true;
    for (const c of clouds) c.visible = !on;
    if (on && !nightG) { nightG = nightLights(M); root.add(nightG); queueMicrotask(() => freeze(nightG)); }
    if (nightG) nightG.visible = on;
    // postes extras da noite tem colisao (08/11, pedido dele: passava por dentro); so existem enquanto e noite
    M.boxes = M.boxes.filter(b => !b.nightPost);
    if (on && nightG) for (const [x, y, z] of nightG.userData.posts) M.boxes.push({ min: [x - 0.12, y, z - 0.12], max: [x + 0.12, y + 4.6, z + 0.12], kind: 'post', nightPost: true });
    paintNight(on);
  }
  // janelas acesas e banco iluminado (07/11, pedido dele: sem pesar na memoria): so liga o brilho (emissive) dos materiais
  // que o modelo do mapa ja tem: vidro das janelas = luz quente de dentro; marmore = fachada iluminada. Nada novo e criado
  const BLACK = new THREE.Color(0);
  function paintNight(on) {
    root.traverse(o => {
      if (!o.isMesh || !/^(map|vila)_/.test(o.name) || !o.material?.emissive) return;
      if (/glass|adobe_hole|lamp_glow/.test(o.name)) o.material.emissive.set(on ? 0xd8963a : 0); // adobe_hole: as janelas e portas do Deserto, que nao tem vidro (08/11)
      else if (/lamp_red/.test(o.name)) o.material.emissive.set(on ? 0xd8402e : 0);
      else if (/marble/.test(o.name)) o.material.emissive.copy(on ? o.material.color : BLACK).multiplyScalar(on ? 0.42 : 1);
    });
  }
  // 09/11: celular nao desenha o contorno fino das molduras longe (o PC continua igual)
  // 09/11: alem do corte do contorno o casco nao desenhava nada, mas ainda custava a chamada e todos os triangulos. Agora sai do desenho (PC e celular)
  let cellHulls = null, thinTick = 0; const touchThin = matchMedia('(pointer: coarse)').matches ? MAP_THIN_FAR : 1e9;
  ready.then(() => { const l = []; root.traverse(o => { if (!o.userData.cellHull) return; o.geometry.computeBoundingSphere(); o.userData.cx = o.geometry.boundingSphere.center.x; o.userData.cz = o.geometry.boundingSphere.center.z; o.userData.thin = /trim|glass/.test(o.parent?.name || ''); l.push(o); }); if (l.length) cellHulls = l; });
  paintNight(false); ready.then(() => paintNight(nightOn));
  // 10/11 (desempenho, pedido dele: "100% mais leve"): o cenario nao se mexe, mas o three recalculava a posicao de cada peca
  // todo quadro (o maior custo de CPU medido no app de PC). Depois de montado, so o sol e as chamines continuam vivos;
  // estudio e floresta (mapas escuros) tem decoracao animada propria e ficam como estavam
  function freeze(g) { if (studio || forest) return; const live = new Set([sunSpr, ...chimneys.map(ch => ch.obj)]); g.updateMatrixWorld(true); g.traverse(o => { if (o === g || live.has(o)) return; let p = o.parent, inLive = false; while (p && p !== root) { if (live.has(p)) { inLive = true; break; } p = p.parent; } if (!inLive) o.matrixAutoUpdate = false; }); }
  ready.then(() => freeze(root)); // materiais do modelo em cache sao compartilhados: cada montagem acerta o estado (nada de janela acesa de dia)
  return {
    root, ready, setNight,
    // 13/11 (pedido dele: "a noite os bonecos ainda ficam esbranquiçados, precisa ficar a mesma cor do dia"): ganho por canal
    // = luz do dia / luz da noite (ceu + sol). O boneco multiplica a luz que recebe por isso e sai com a cor exata do dia
    nightGain() {
      const L = (h, hi, sc, si) => new THREE.Color(h).multiplyScalar(hi).add(new THREE.Color(sc).multiplyScalar(si));
      const d = L(day.h[0], day.h[2], day.s[0], day.s[1]), n = L(0x8494c8, 0.8, 0xa8b8e6, 0.9);
      return new THREE.Vector3(...['r', 'g', 'b'].map(k => Math.min(4, Math.max(0.6, d[k] / Math.max(1e-3, n[k])))));
    },
    dispose() { M.boxes = M.boxes.filter(b => !b.nightPost && b.kind !== 'trunk'); scene.remove(root); freeGeos(root); }, // mapa velho sai da memoria de video
    // camera fora do estudio e longe da porta da floresta: o miolo nao aparece (parede de 12 m), nem desenha
    cull(p) {
      sunSpr.position.set(p.x + sunOff.x, p.y + sunOff.y + sunBob, p.z + sunOff.z); // sol/lua sempre dentro do desenho
      if (cellHulls && ++thinTick % 12 === 0) for (const o of cellHulls) o.visible = Math.hypot(p.x - o.userData.cx, p.z - o.userData.cz) < Math.min(OUTLINE_FAR.value, o.userData.thin ? Math.min(OUTLINE_CFG.thin, touchThin) : OUTLINE_CFG.map) + MAP_CELL * 0.55;
      if (!inner) return;
      inner.visible = Math.max(Math.abs(p.x), Math.abs(p.z)) < M.studio + 0.6 || !fdoor || Math.hypot(p.x - fdoor.x, p.z - fdoor.z) < 18 || p.y > 13;
    },
    update(t) {
      // predios e casas ficam parados (pulando atrapalhava a mira); so ceu, sol, arvores e chamines mexem
      const beat = t * BEAT * Math.PI;
      moveT.value = t % 3600;
      for (const s of chimneys) s.obj.rotation.z = Math.sin(t * s.speed + s.phase) * s.amp;
      sunSpr.material.rotation = Math.sin(t * 1.4) * 0.12;
      sunBob = Math.sin(beat) * 1.2 * sunK;
      studio?.update(t);
      forest?.update(t);
    },
  };
}

// ---------- Banco Ferradura (03/11): placa, ferradura, piso do subsolo e parede de cofrinhos ----------
let bankSignTex = null, hedgeTex = null;
let mintSignTex = null;
function mintSign() { // placa da Casa da Moeda: verde escuro, letras douradas e moedas nas pontas
  if (mintSignTex) return mintSignTex;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#1f3a32'; g.fillRect(0, 0, 1024, 160);
  g.strokeStyle = '#d6b45c'; g.lineWidth = 8; g.strokeRect(14, 14, 996, 132);
  for (const x of [90, 934]) { g.beginPath(); g.arc(x, 80, 44, 0, Math.PI * 2); g.fillStyle = '#d6b45c'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#7a5c1c'; g.stroke(); g.fillStyle = '#7a5c1c'; g.font = '56px "Bowlby One", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', x, 84); }
  g.fillStyle = '#efd99a'; g.font = '78px "Bowlby One", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CASA DA MOEDA', 512, 86);
  mintSignTex = new THREE.CanvasTexture(c); mintSignTex.colorSpace = THREE.SRGBColorSpace; return mintSignTex;
}
function bankSign() {
  if (bankSignTex) return bankSignTex;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#2b2724'; g.fillRect(0, 0, 1024, 160);
  g.strokeStyle = '#d9c38a'; g.lineWidth = 8; g.strokeRect(14, 14, 996, 132);
  g.fillStyle = '#efe6cc'; g.font = '84px "Bowlby One", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('BANCO FERRADURA', 512, 86);
  bankSignTex = new THREE.CanvasTexture(c); bankSignTex.colorSpace = THREE.SRGBColorSpace;
  return bankSignTex;
}
function stripeTex() { // gomos vermelho e branco do telhado do coreto (u da volta no cone)
  const c = document.createElement('canvas'); c.width = 256; c.height = 8;
  const g = c.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#faf8f2' : '#a83a2c'; g.fillRect(i * 32, 0, 32, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function horseshoe(s) { // ferradura dourada de boca pra cima (sorte)
  const g = new THREE.Group();
  const arc = ink(new THREE.TorusGeometry(s * 0.6, s * 0.17, 8, 18, Math.PI * 1.3), 0xc9a24a, 0.04);
  arc.rotation.z = Math.PI + Math.PI * 0.15 - Math.PI * 0.3; g.add(arc);
  return g;
}
function bankDecor(root) {
  // piso xadrez do subsolo (fosso do cofre)
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#3a3632' : '#d9d3c6'; g.fillRect(x * 32, y * 32, 32, 32); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(9, 8); t.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 16), toon(0xffffff, { map: t }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.015, -4); root.add(floor);
  // parede de cofrinhos (caixas de deposito) nas paredes do fosso
  const bc = document.createElement('canvas'); bc.width = 256; bc.height = 128;
  const bg = bc.getContext('2d'); bg.fillStyle = '#8f8778'; bg.fillRect(0, 0, 256, 128);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    bg.fillStyle = '#b8b0a0'; bg.fillRect(x * 32 + 3, y * 32 + 3, 26, 26);
    bg.strokeStyle = '#1b1916'; bg.lineWidth = 2; bg.strokeRect(x * 32 + 3, y * 32 + 3, 26, 26);
    bg.fillStyle = '#1b1916'; bg.beginPath(); bg.arc(x * 32 + 16, y * 32 + 16, 3, 0, Math.PI * 2); bg.fill();
  }
  const wall = (w, x, z, ry) => {
    const tt = new THREE.CanvasTexture(bc); tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = THREE.RepeatWrapping; tt.repeat.set(Math.round(w / 4), 1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.6), toon(0xffffff, { map: tt, unique: true })); m.position.set(x, 1.4, z); m.rotation.y = ry; root.add(m);
  };
  wall(17.6, 0, 3.98, Math.PI); // frente do fosso (olha pro cofre)
  // piso do salao em lajotas grandes (o topo do marmore ficava listrado)
  const tc = document.createElement('canvas'); tc.width = tc.height = 64;
  const tg = tc.getContext('2d');
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { tg.fillStyle = (x + y) % 2 ? '#d3cbbb' : '#ece7dc'; tg.fillRect(x * 32, y * 32, 32, 32); }
  tg.strokeStyle = '#9d9584'; tg.lineWidth = 1; for (let i = 0; i <= 64; i += 32) { tg.beginPath(); tg.moveTo(i, 0); tg.lineTo(i, 64); tg.moveTo(0, i); tg.lineTo(64, i); tg.stroke(); }
  for (const [w, d, x, z] of [[6.7, 26, -12.65, 1], [6.7, 26, 12.65, 1], [18, 10.7, 0, 9.65]]) {
    const ft = new THREE.CanvasTexture(tc); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(w / 3, d / 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), toon(0xffffff, { map: ft, unique: true })); m.rotation.x = -Math.PI / 2; m.position.set(x, 3.012, z); root.add(m);
  }
  // boca do duto no beco: moldura escura, rebites e a grade arrancada jogada no chao
  const mouth = new THREE.Group(); mouth.position.set(0, 0, -21.02);
  for (const [w, h, x, y] of [[3, 0.25, 0, 1.47], [0.25, 1.6, -1.38, 0.8], [0.25, 1.6, 1.38, 0.8]]) { const f = ink(new THREE.BoxGeometry(w, h, 0.12), PAL.ink, 0.02); f.position.set(x, y, 0); mouth.add(f); }
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicMaterial({ color: 0x1b1916, transparent: true, opacity: 0.55, depthWrite: false })); hole.position.set(0, 0.68, -0.4); mouth.add(hole);
  root.add(mouth);
  const grate = new THREE.Group(); grate.position.set(2.6, 0.04, -23); grate.rotation.set(-Math.PI / 2, 0, 0.5);
  const gf = ink(new THREE.BoxGeometry(2.3, 1.3, 0.06), 0x6e6a63, 0.03); grate.add(gf);
  for (let i = -4; i <= 4; i++) { const bar = ink(new THREE.BoxGeometry(0.06, 1.2, 0.1), PAL.ink, 0); bar.position.x = i * 0.25; grate.add(bar); }
  root.add(grate);
  wall(15.6, -8.98, -4.2, Math.PI / 2); wall(15.6, 8.98, -4.2, -Math.PI / 2);
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

// luzes de mentira da noite (07/11): halo (sprite somado) + poca de luz no chao; nada de PointLight (pesa no celular)
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,226,150,1)'); gr.addColorStop(0.35, 'rgba(255,196,96,.55)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(c); GLOW_TEX.colorSpace = THREE.SRGBColorSpace; return GLOW_TEX;
}
function nightLights(M) {
  const G = new THREE.Group(), tex = glowTex();
  const halo = (x, y, z, s, op = 0.9) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: op })); sp.position.set(x, y, z); sp.scale.set(s, s, 1); G.add(sp); };
  const poolMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const pool = (x, y, z, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28), poolMat); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.04, z); G.add(m); };
  const glowPlane = (x, y, z, w, h, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; G.add(m); };
  // 08/11 (pedido dele: todo mapa a noite, reciclando): acende os postes que o mapa ja tem; mapa sem poste ganha uns de mentira (uma malha, copias) nas zonas, bases e nascimentos
  const spots = [], extra = [];
  for (const b of M.boxes) { const h = b.max[1] - b.min[1]; if (b.kind === 'lamp' || (b.kind === 'post' && h >= 3.5 && h <= 6)) spots.push([(b.min[0] + b.max[0]) / 2, b.max[1], (b.min[2] + b.max[2]) / 2, b.min[1]]); }
  if (spots.length < 16) {
    const add = (x, z) => { if (podiumClear(M, x, z) || !standable(M, x, z) || !spots.every(s => Math.hypot(s[0] - x, s[2] - z) > 7)) return; const y = floorAt(M, x, z); spots.push([x, y + 4.2, z, y]); extra.push([x, y, z]); };
    for (const q of M.zones || []) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(q.pos[0] + a * (q.r + 1.5), q.pos[2] + b * (q.r + 1.5));
    for (const p of Object.values(M.flagBase || {})) for (const [a, b] of [[-1, -1], [1, 1]]) add(p[0] + a * 5, p[2] + b * 5);
    for (const s of M.spawns?.ffa || []) add(s[0] + 2.5, s[1] + 2.5);
    if (extra.length) {
      const g = mergeGeometries([new THREE.CylinderGeometry(0.07, 0.1, 4.2, 6).translate(0, 2.1, 0), new THREE.BoxGeometry(0.42, 0.42, 0.42).translate(0, 4.4, 0)]), inst = new THREE.InstancedMesh(g, toon(0x1f1d1a), extra.length), d = new THREE.Object3D();
      extra.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); inst.setMatrixAt(i, d.matrix); });
      inst.frustumCulled = false; G.add(inst);
    }
  }
  G.userData.posts = extra;
  const every = Math.max(1, spots.length / 40); // no maximo 40 luzes por mapa: cada halo e uma chamada de desenho
  for (let i = 0; i < spots.length; i += every) { const [x, top, z, y0] = spots[Math.floor(i)]; halo(x, top + 0.25, z, 2.8); pool(x, y0, z, 4.2); }
  if (M.id === 'ferradura') {
    glowPlane(0, 5, 14.5, 5.6, 3.8, 0); // porta da frente (no vao, longe das faces da parede)
    for (const sx of [-1, 1]) glowPlane(sx * 16.5, 4.5, 0, 3.6, 2.8, Math.PI / 2); // portas dos lados
    for (const [x, z] of [[-7, 9], [7, 9], [-12.5, -5], [12.5, -5]]) { halo(x, 9.6, z, 3.4, 0.75); pool(x, 3, z, 3.6); } // lustres do salao
    halo(0, 6, -4, 5, 0.55); pool(0, 0, -4, 5); // luz em cima do cofre, no fosso
    halo(0, 3.7, 31, 3, 0.8); pool(0, 0.5, 31, 3.5); // lampada do coreto
  }
  return G;
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
  const mkZone = (z) => {
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
  };
  const zoneObjs = zones.map(mkZone);
  let bonusObj = null; // bandeira extra D (04/11): nasce no meio da partida, anel dourado
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
    dispose() { scene.remove(root); freeGeos(root); },
    // carrier(id): { me } pra quem carrega sou eu, { pos, yaw } pro boneco suavizado dos outros
    update(t, snap, mode, carrier, hideZone) { // hideZone: letra da zona que esta na HUD de quem esta dentro
      for (const team of ['red', 'blue']) {
        const f = flags[team];
        f.g.visible = f.pad.visible = mode === 'ctf';
        if (!snap || mode !== 'ctf') continue;
        const s = snap.flags[team];
        const c = s.state === 'carried' && s.carrier != null ? carrier?.(s.carrier) : null;
        if (c?.me) { f.g.visible = false; continue; } // a minha bandeira nas costas tampava a camera parado
        if (c?.pos) f.g.position.set(c.pos[0] + Math.sin(c.yaw) * 0.35, c.pos[1] + 1.2, c.pos[2] + Math.cos(c.yaw) * 0.35); // nas costas do boneco
        else f.g.position.set(s.pos[0], s.pos[1] + (s.state === 'carried' ? 1.2 : 0), s.pos[2]);
        f.g.rotation.y = t * (s.state === 'dropped' ? 2 : 0.4);
        const a = f.cloth.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          const x = f.base0[i * 3];
          a.setZ(i, Math.sin(x * 3 - t * 7) * 0.14 * (x + 0.8));
        }
        a.needsUpdate = true;
      }
      const bz = mode === 'dom' && snap?.zones.find(q => q.bonus);
      if (bz && !bonusObj) { bonusObj = mkZone({ id: 'D', pos: bz.pos, r: 4 }); bonusObj.ring.material.color.setHex(0xd9a520); bonusObj.letter.scale.set(3, 3, 1); }
      if (bonusObj) { bonusObj.g.visible = !!bz; if (bz) { bonusObj.g.position.set(bz.pos[0], bz.pos[1] + 0.03, bz.pos[2]); bonusObj.fill.material.color.setHex(bz.owner === 'red' ? PAL.red : bz.owner === 'blue' ? PAL.blue : 0xf2d27a); bonusObj.fill.material.opacity = 0.3 + Math.abs(bz.prog) * 0.35; bonusObj.ring.rotation.z = -t; bonusObj.letter.visible = hideZone !== bz.id; bonusObj.letter.position.y = 4.6 + Math.sin(t * BEAT * Math.PI * 2) * 0.35; } }
      zoneObjs.forEach((z, i) => {
        z.g.visible = mode === 'dom';
        if (!snap || mode !== 'dom') return;
        const s = snap.zones[i];
        z.fill.material.color.setHex(s.owner === 'red' ? PAL.red : s.owner === 'blue' ? PAL.blue : PAL.paper);
        z.fill.material.opacity = 0.25 + Math.abs(s.prog) * 0.35;
        z.ring.rotation.z = t * 0.5;
        z.letter.visible = hideZone !== s.id;
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
  const base = ink(geo(THREE.BoxGeometry, 1.2, 0.35, 0.8), PAL.ink, 0.04); base.position.y = 0.18; g.add(base);
  const neck = ink(geo(THREE.BoxGeometry, 0.6, 0.35, 0.5), PAL.ink, 0.04); neck.position.y = 0.5; g.add(neck);
  const top = ink(geo(THREE.BoxGeometry, 1.9, 0.45, 0.8), PAL.dark, 0.04); top.position.set(0.15, 0.9, 0); g.add(top);
  const horn = ink(geo(THREE.ConeGeometry, 0.28, 0.9, 6), PAL.dark, 0.03); horn.rotation.z = Math.PI / 2; horn.position.set(-1.25, 0.95, 0); g.add(horn);
  return g;
}

export function milkBottle() {
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
export const TRACER_STYLES = ['chalk', 'fire', 'ink', 'spark', 'rainbow', 'void', 'toxic', 'gold', 'ice', 'elite', 'none'];
const TRACERS = {
  fire: { w: 1.6, life: 0.16, grow: 0.8 },     // fogo: miolo amarelo, borda laranja, rabo que esfria
  ink: { w: 2.2, life: 0.22, grow: 0.3 },      // tinta: borrao preto em gotas
  spark: { w: 1.1, life: 0.12, grow: 0.0 },    // faisca: zigue-zague azul piscando
  rainbow: { w: 1.4, life: 0.18, grow: 0.4 },  // arco-iris correndo pelo tiro
  void: { w: 1.7, life: 0.24, grow: 0.6 },     // vazio: roxo escuro com estrelinhas
  toxic: { w: 1.8, life: 0.26, grow: 0.9 },    // toxico: verde gosmento com bolhas
  gold: { w: 1.3, life: 0.2, grow: 0.2 },      // ouro: brilho que corre e purpurina
  ice: { w: 1.5, life: 0.22, grow: 0.1 },      // gelo: azul cristalino em facetas
  laser: { w: 2.8, life: 0.2, grow: 0.0 },     // laser (fora da lista: e do modelo Bico Longo): raio vermelho de miolo branco
};
TRACERS.elite = { w: 1.9, life: 0.24, grow: 0.3 }; // ELITE (10/11, pedido dele): violeta do Elite, miolo branco, favos correndo e purpurina dourada (so com Elite ativo)
// modelo que sempre atira laser (tiro e som proprios, ignora o tracado escolhido)
export const LASER_BODY = null; // 07/11 (pedido dele): a Bico Longo (pistol_5) e o revolver Webley-Fosbery: som de revolver e tracante normal (antes era a pistola de laser)
// bala visivel: risco curto que voa da boca ate o impacto. seg = comprimento do risco (m), speed = m/s na
// tela (bem abaixo da real, pra dar pra ver; cada tiro da rajada vira uma bala, a cadencia vira um fio)
const BULLET = {
  pistol: { seg: 0.35, speed: 120 }, smg: { seg: 0.35, speed: 115 }, rifle: { seg: 0.5, speed: 150 }, lmg: { seg: 0.5, speed: 150 },
  shotgun: { seg: 0.25, speed: 100 }, sniper: { seg: 0.9, speed: 240 }, minigun: { seg: 0.4, speed: 130 },
};
const LASER_BOLT = { seg: 1.3, speed: 85 }; // raio comprido e mais lento que bala (de cinema)
const BULLET_MAX_FLY = 0.05; // s: teto do voo, qualquer distancia
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
        } else if (uS < 7.5) {
          float facet = step(0.5, fract(t * uLen * 1.2 + vUv.x * 2.0));
          c = mix(vec3(0.45, 0.8, 1.0), vec3(0.92, 0.98, 1.0), max(edge * 0.7, facet * 0.4));
          a = (1.0 - uK * uK) * (0.5 + edge * 0.5);
        } else if (uS < 8.5) {
          c = mix(vec3(1.0, 0.06, 0.04), vec3(1.0, 0.9, 0.86), smoothstep(0.55, 1.0, edge));
          a = (1.0 - uK) * (0.75 + edge * 0.25);
        } else {
          float z = t * uLen * 3.0 - uK * 6.0, cell = abs(fract(z) - 0.5);
          float hex = smoothstep(0.08, 0.0, abs(cell - 0.38)) * 0.8;
          float glit = step(0.92, fract(sin(floor(t * uLen * 11.0) * 37.9 + floor(uK * 14.0)) * 7919.3));
          c = mix(vec3(0.33, 0.15, 0.75), vec3(0.72, 0.58, 1.0), edge);
          c = mix(c, vec3(1.0), smoothstep(0.75, 1.0, edge) * 0.8);
          c = mix(c, vec3(1.0, 0.82, 0.35), max(hex * 0.7, glit));
          a = (1.0 - uK) * (0.6 + edge * 0.4) * head;
        }
        gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
      }`,
  });
}

// quantidade de particulas (10/11, Ajustes > Video > Efeitos): 0,5 / 1 / 1,4
export const FX_Q = { k: 1 };
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

  add(obj, life, update, done) { this.scene.add(obj); this.list.push({ obj, life, t: 0, update, done }); } // done: libera o que e so do efeito

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

  // uma bala do tiro: sai da boca, percorre ate o impacto e some ali (skin do tracado no risco)
  bullet(o, e, style = 'chalk', wpn = 'rifle') {
    if (style === 'none') return;
    const a = new THREE.Vector3().fromArray(o), b = new THREE.Vector3().fromArray(e);
    const len = a.distanceTo(b);
    if (len < 0.5) return;
    // bala do tamanho de bala (pedido dele: fina e curta); o contorno de tinta e o que faz ela aparecer
    // chega quase na hora como o acerto (03/11: a bala lenta chegava depois da bolinha do impacto); o risco estica com a velocidade
    const B = style === 'laser' || style === 'plasma' ? LASER_BOLT : BULLET[wpn] || BULLET.rifle, fly = Math.min(len / B.speed, BULLET_MAX_FLY), speed = len / fly;
    const seg = Math.min(len, Math.max(B.seg, speed * 0.008)), tail = 0.06;
    const dir = b.clone().sub(a).normalize();
    const T = TRACERS[style], w = (T ? T.w : style === 'plasma' ? 2.2 : 1) * 0.6;
    const mat = T ? tracerMaterial(style, seg) : this.tracerMat.clone();
    if (style === 'plasma') mat.color.setHex(0xbffcff); // pack futurista (09/11): miolo claro, halo ciano
    (this.tfx ||= new TracerFx(this.scene)).emit(style, a, b); // pedacinhos 3D do tipo do tracado
    const m = new THREE.Mesh(this.tracerGeo, mat);
    m.position.copy(a); m.lookAt(b); m.scale.set(w, w, 0.01);
    m.renderOrder = 3;
    // contorno de tinta (como os bonecos): sem ele o giz claro sumia no ceu e no chao de papel
    // laser: contorno vermelho escuro (o preto engolia o raio visto de tras)
    const ink = new THREE.Mesh(this.tracerGeo, style === 'laser' ? (this.laserInk ??= new THREE.MeshBasicMaterial({ color: 0x8a0a06, side: THREE.BackSide, transparent: true, opacity: 0.9, depthWrite: false }))
      : (this.bulletInk ??= new THREE.MeshBasicMaterial({ color: 0x141210, side: THREE.BackSide, transparent: true, opacity: 0.85, depthWrite: false })));
    ink.scale.set(1.6, 1.6, 1); m.add(ink);
    if (TRACER_GLOW[style]) { const halo = new THREE.Mesh(this.tracerGeo, (this.haloMat ||= {})[style] ||= new THREE.MeshBasicMaterial({ color: TRACER_GLOW[style], side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthWrite: false })); halo.scale.set(2.8, 2.8, 1); halo.renderOrder = 2; m.add(halo); } // brilho em mistura normal (somar luz estoura no papel claro)
    const life = fly + tail;
    this.add(m, life, (f, k) => {
      const t = k * life, d = Math.min(len, t * speed), s = Math.max(0, d - seg);
      f.obj.position.copy(a).addScaledVector(dir, s);
      f.obj.scale.z = Math.max(0.01, d - s);
      const fade = t > fly ? (t - fly) / tail : 0; // chegou: o risco some no alvo
      if (T) mat.uniforms.uK.value = 0.15 + fade * 0.85; else mat.opacity = 1 - fade;
    });
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
    n = Math.max(1, Math.round(n * FX_Q.k));
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

  // lanca-chamas (03/11, refeito): jato de bolinhas de fogo pequenas (miolo amarelo -> laranja -> vermelho) e um fiapo de fumaca;
  // textura unica, material por particula liberado no done
  flame(o, d) {
    this.flameTex ||= (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.8, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const ramp = [new THREE.Color(0xffe066), new THREE.Color(0xff9a1a), new THREE.Color(0xf04a12), new THREE.Color(0x8a1a08)];
    const jit = (a) => (Math.random() - 0.5) * a, free = (ob) => ob.material.dispose();
    for (let i = 0; i < 7; i++) {
      const smoke = i === 6;
      const mat = new THREE.SpriteMaterial({ map: this.flameTex, transparent: true, depthWrite: false, color: smoke ? 0x3a3532 : ramp[0], opacity: smoke ? 0 : 0.95 }); // mistura normal: aditivo sumia no cenario claro (03/11)
      const s = new THREE.Sprite(mat);
      const sp = (smoke ? 5 : 8) + Math.random() * 3, spr = smoke ? 0.3 : 0.2; // abre em leque: de frente, jato fino vira um bolo so
      const v = new THREE.Vector3(d[0] + jit(spr), d[1] + jit(spr), d[2] + jit(spr)).normalize().multiplyScalar(sp);
      const back = Math.random() * 0.5; // espalha ao longo do tick: o jato fica continuo desde o cano
      s.position.set(o[0] + d[0] * back, o[1] + d[1] * back, o[2] + d[2] * back);
      const s0 = smoke ? 0.25 : 0.14 + Math.random() * 0.06, s1 = smoke ? 1.5 : 0.8 + Math.random() * 0.4, rot = Math.random() * 6;
      s.scale.setScalar(s0);
      this.add(s, smoke ? 0.8 + Math.random() * 0.3 : 0.4 + Math.random() * 0.2, (f, k, dt) => {
        f.obj.position.addScaledVector(v, dt); v.multiplyScalar(Math.max(0, 1 - dt * (smoke ? 3 : 3.6))); v.y += dt * (smoke ? 2.2 : 3); // arrasto e sobe
        f.obj.scale.setScalar(s0 + (s1 - s0) * Math.sqrt(k));
        mat.rotation = rot + k * 1.5;
        if (smoke) { mat.opacity = k < 0.3 ? k / 0.3 * 0.32 : 0.32 * (1 - (k - 0.3) / 0.7); return; }
        const t = Math.min(2.999, k * 3), j = Math.floor(t);
        mat.color.copy(ramp[j]).lerp(ramp[j + 1], t - j);
        mat.opacity = k > 0.6 ? (1 - k) / 0.4 * 0.95 : 0.95;
      }, free);
    }
  }

  // sem fumacinha (03/11, pedido dele): a bolinha branca nascia na hora no alvo e parecia uma segunda bala
  impact(pos, normal) {
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
    // 8 formas sorteadas uma vez e reaproveitadas (antes: geometria nova por mancha, nunca liberada)
    const pool = this.splatGeos ||= Array.from({ length: 8 }, () => {
      const g = new THREE.CircleGeometry(1, 14), a = g.attributes.position;
      for (let i = 1; i < a.count; i++) { const k = 0.7 + Math.random() * 0.55; a.setXY(i, a.getX(i) * k, a.getY(i) * k); }
      return g;
    });
    const g = pool[Math.floor(Math.random() * pool.length)];
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
    m.position.set(pos[0], (pos[1] || 0) + 0.03, pos[2]);
    this.add(m, 9, (f, k) => { const sc = size * Math.min(1, k * 40); f.obj.scale.setScalar(sc); f.obj.material.opacity = k > 0.8 ? (1 - k) * 5 * 0.85 : 0.85; }, (o) => o.material.dispose());
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
    // anel compartilhado; o material (opacidade piscando) e de cada aviso e sai no done (antes: geometria nova por aviso, nunca liberada)
    this.warnRing ||= new THREE.RingGeometry(2.6, 3.4, 24);
    const ring = new THREE.Mesh(this.warnRing, new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(pos[0], (pos[1] || 0) + 0.05, pos[2]); // 07/11: no telhado, se e la que ela para
    this.add(ring, 1.9, (f, k) => { f.obj.material.opacity = 0.4 + Math.sin(k * 40) * 0.3; f.obj.scale.setScalar(1.2 - k * 0.3); }, (o) => o.material.dispose());
  }

  anvil(pos) {
    const y0 = pos[1] || 0; // 07/11: o servidor manda a altura onde parou (telhado, laje ou chao)
    const m = anvilMesh();
    m.position.set(pos[0], y0 + 20, pos[2]);
    this.add(m, 0.18, (f, k) => { f.obj.position.y = y0 + 20 * (1 - k); });
    setTimeout(() => {
      this.puff([pos[0], y0 + 0.4, pos[2]], 8, 1.6, PAL.paper, 0.8);
      this.word('TOIN!', [pos[0], y0 + 2.5, pos[2]], 3, 0.8);
      this.splat([pos[0], y0, pos[2]], 3, 0x2a2724);
      const lie = anvilMesh(); lie.position.set(pos[0], y0, pos[2]); lie.rotation.y = Math.random() * 6;
      this.add(lie, 3, (f, k) => { f.obj.position.y = y0 - k * k * 1.2; });
    }, 180);
  }

  // escudo de nascimento (02/11): bolha de sabao azulada em volta do boneco, com contorno de tinta tracejado
  protBubble() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7fb3e6, transparent: true, opacity: 0.22, depthWrite: false }));
    m.scale.set(1, 1.25, 1); m.position.y = 1.0; g.add(m);
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.035, 6, 40), new THREE.MeshBasicMaterial({ color: 0x2f5b8a }));
    r.rotation.x = Math.PI / 2; r.position.y = 0.15; g.add(r);
    g.userData.spin = r;
    return g;
  }

  nadeMesh(kind) {
    if (kind === 'rocket') return rocketMesh(); // foguete da Bazuca
    const g = new THREE.Group();
    if (kind === 'frag') {
      const b = ink(geo(THREE.SphereGeometry, 0.11, 10, 8), 0x3f4a32, 0.012); b.scale.set(1, 1.25, 1); g.add(b);
      const l = ink(geo(THREE.BoxGeometry, 0.03, 0.12, 0.05), PAL.mid, 0.006); l.position.set(0.07, 0.08, 0); g.add(l);
      const c = ink(geo(THREE.CylinderGeometry, 0.035, 0.035, 0.05, 8), PAL.mid, 0.006); c.position.y = 0.15; g.add(c);
    } else if (kind === 'tomahawk') { // machadinha: cabo de madeira e lamina de metal
      const h = ink(geo(THREE.CylinderGeometry, 0.022, 0.026, 0.42, 8), 0x8a5a2b, 0.006); g.add(h);
      const bl = ink(geo(THREE.BoxGeometry, 0.03, 0.12, 0.16), 0xcfd4d6, 0.008); bl.position.set(0, 0.15, 0.07); g.add(bl);
      const back = ink(geo(THREE.BoxGeometry, 0.034, 0.05, 0.05), PAL.dark, 0.006); back.position.set(0, 0.17, -0.03); g.add(back);
      g.userData.spin = true;
    } else if (kind === 'thermo') { // termobarica: lata escura com faixa laranja e tampa dourada
      const b = ink(geo(THREE.CylinderGeometry, 0.075, 0.075, 0.22, 12), 0x3a3632, 0.012); g.add(b);
      const band = ink(geo(THREE.CylinderGeometry, 0.078, 0.078, 0.06, 12), 0xf08a2a, 0); g.add(band);
      const c = ink(geo(THREE.CylinderGeometry, 0.04, 0.05, 0.05, 10), 0xc9a34a, 0.006); c.position.y = 0.13; g.add(c);
    } else if (kind === 'smoke') { // fumaca: lata cinza com faixa verde e furos em cima
      const b = ink(geo(THREE.CylinderGeometry, 0.065, 0.065, 0.24, 12), 0x8e958c, 0.012); g.add(b);
      const band = ink(geo(THREE.CylinderGeometry, 0.067, 0.067, 0.05, 12), 0x5f8f5f, 0); band.position.y = 0.03; g.add(band);
      const c = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 0.03, 10), PAL.dark, 0.006); c.position.y = 0.135; g.add(c);
    } else if (kind === 'beacon') { // sinalizador voando: bolinha azul com antena
      const b = ink(geo(THREE.SphereGeometry, 0.12, 10, 8), 0x9fb4c6, 0.01); g.add(b);
      const a = ink(geo(THREE.CylinderGeometry, 0.01, 0.01, 0.2, 5), PAL.ink, 0); a.position.y = 0.16; g.add(a);
    } else {
      const b = ink(geo(THREE.CylinderGeometry, 0.06, 0.06, 0.22, 10), PAL.light, 0.01); g.add(b);
      const c = ink(geo(THREE.CylinderGeometry, 0.035, 0.035, 0.05, 8), PAL.dark, 0.006); c.position.y = 0.13; g.add(c);
    }
    return g;
  }

  blimpMesh(team) {
    const D = DG?.[team === 'blue' ? 'blue' : 'red'];
    if (D) { // modelo do Blender (08/11): helices, leme e metralhadora sao pecas soltas e se mexem de verdade
      const part = (geom, pos, th, parent) => { const m = new THREE.Mesh(geom, DG.mat); if (pos) m.position.copy(pos); outline(m, th); parent.add(m); return m; };
      const g = new THREE.Group(); part(D.body, null, 0.04, g);
      const rudder = part(D.rudder, DG.pv.rudder, 0.015, g), gun = part(DG.gun, DG.pv.gun, 0.012, g), props = [part(DG.prop, DG.pv.propL, 0.01, g), part(DG.prop, DG.pv.propR, 0.01, g)];
      const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -1.45); gun.add(muzzle);
      const v = new THREE.Vector3(), q = new THREE.Quaternion(), F = new THREE.Vector3(0, 0, -1);
      g.userData.dg = { props, rudder, gun, muzzle, aim(t, k) { g.updateWorldMatrix(true, false); g.worldToLocal(v.fromArray(t)).sub(gun.position).normalize(); v.y = Math.min(v.y, -0.04); q.setFromUnitVectors(F, v.normalize()); gun.quaternion.slerp(q, k); } };
      return g;
    }
    const g = new THREE.Group();
    const body = ink(geo(THREE.SphereGeometry, 3, 18, 12), PAL.light, 0.15); body.scale.set(1, 0.8, 2.3); g.add(body);
    const band = ink(geo(THREE.CylinderGeometry, 2.45, 2.45, 0.8, 18), team === 'blue' ? PAL.blue : PAL.red, 0); band.rotation.x = Math.PI / 2; g.add(band);
    for (const [x, y] of [[0, 2.2], [0, -2.2], [2.2, 0], [-2.2, 0]]) {
      const fin = ink(geo(THREE.BoxGeometry, x ? 1.8 : 0.15, y ? 1.8 : 0.15, 1.6), PAL.dark, 0.06); fin.position.set(x, y, 6); g.add(fin);
    }
    const gond = ink(geo(THREE.BoxGeometry, 1.2, 0.9, 2.4), PAL.dark, 0.06); gond.position.y = -2.7; g.add(gond);
    return g;
  }

  update(dt) {
    this.tfx?.update(dt);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.t += dt;
      let k = Math.min(1, f.t / f.life);
      // efeito com erro sai na hora (02/11: um efeito quebrado parava a lista toda e o clarao da flash ficava na tela)
      try { f.update && f.update(f, k, dt); } catch (e) { k = 1; console.error('[fx]', e); }
      if (k >= 1 || !Number.isFinite(k)) { this.scene.remove(f.obj); this.list.splice(i, 1); f.done?.(f.obj); }
    }
  }
}

// ---------- Cais do Sol Poente (04/11): mar, borda do cais e pecas das docas ----------
function docksDecor(root, M) {
  const A = M.arena, QZ = M.quayZ;
  // mar: um plano grande embaixo de tudo, com riscos de brilho do sol (faixas claras paradas: barato)
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(A * 2 + 400, A * 2 + 400), toon(0x6f8a92, { unique: true, emissive: 0x1c1410 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.9; root.add(sea);
  const glint = toon(0xf3c48d, { unique: true, emissive: 0x5a3a20 });
  for (let i = 0; i < 26; i++) { const g = new THREE.Mesh(geo(THREE.PlaneGeometry, 1, 1), glint); const z = -70 - i * 4.2, w = 6 + (i % 5) * 3 - i * 0.12; g.scale.set(Math.max(2, w), 0.5, 1); g.rotation.x = -Math.PI / 2; g.position.set(-20 + ((i * 37) % 17) - 8, -0.84, z); root.add(g); } // reflexo do sol no mar (6 cm acima da agua)
  // borda de pedra do cais (do chao ate a agua), em volta da terra
  const stone = toon(0x8b8478), cap = toon(0x6e6a63);
  const lip = (x, z, w, d) => { const m = ink(new THREE.BoxGeometry(w, 1, d), 0x8b8478, 0.05); m.material = stone; m.position.set(x, -0.5, z); root.add(m); const c = ink(new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2), 0x6e6a63, 0.03); c.material = cap; c.position.set(x, 0.1, z); root.add(c); };
  lip(0, A + 1.4, A * 2 + 3, 0.8); lip(-A - 1.4, (QZ + A + 1) / 2, 0.8, A + 1 - QZ); lip(A + 1.4, (QZ + A + 1) / 2, 0.8, A + 1 - QZ);
  { const BW = (M.boatW || 24) / 2; for (const sx of [-1, 1]) lip(sx * (BW + (A + 1 - BW) / 2), QZ - 0.4, A + 1 - BW, 0.8); } // frente do cais (dos lados do barco; 13/11: largura do barco de cada mapa)
}
const DOCKS = {
  // barco de carga: casco vermelho escuro afundado no mar, borda branca; o conves (topo) e chao
  boat(w, h, d) {
    const g = new THREE.Group(), hull = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x8a3a2c, 0.07); hull.scale.set(w, h + 1, d); hull.position.y = (h - 1) / 2; g.add(hull);
    const bow = ink(geo(THREE.CylinderGeometry, 1, 1, 1, 3), 0x8a3a2c, 0.07); bow.scale.set(d * 0.58, h + 1, d * 0.5); bow.rotation.y = Math.PI / 2; bow.position.set(w / 2 + d * 0.22, (h - 1) / 2, 0); g.add(bow);
    const rim = ink(geo(THREE.BoxGeometry, 1, 1, 1), PAL.paper, 0.03); rim.scale.set(w + 0.2, 0.25, d + 0.2); rim.position.y = h + 0.02; g.add(rim);
    const deck = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x9d8263, 0); deck.scale.set(w - 0.6, 0.06, d - 0.6); deck.position.y = h + 0.18; g.add(deck); // tabuado 18 cm acima (sem piscar com a borda)
    return g;
  },
  boatcabin(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), PAL.paper, 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); const roof = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x3f5a6a, 0.04); roof.scale.set(w + 0.4, 0.3, d + 0.4); roof.position.y = h + 0.15; g.add(roof); for (const sx of [-1, 1]) { const win = ink(geo(THREE.CircleGeometry, 0.35, 12), 0x2b3a44, 0); win.position.set(sx * w * 0.25, h * 0.62, d / 2 + 0.06); g.add(win); } return g; },
  boatstack(w, h) { const g = new THREE.Group(), m = ink(geo(THREE.CylinderGeometry, w / 2, w / 2, h, 12), PAL.ink, 0.05); m.position.y = h / 2; g.add(m); const band = ink(geo(THREE.CylinderGeometry, w / 2 + 0.05, w / 2 + 0.05, 0.5, 12), PAL.red, 0); band.position.y = h - 0.6; g.add(band); return g; },
  plank(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x8a6a48, 0.03); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); return g; }, // degrau da prancha
  // armazem de madeira: tabuas verticais desbotadas, rodape escuro
  shed(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xa28866, 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); if (h >= 6) { const base = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x5a4634, 0.02); base.scale.set(w + 0.08, 0.7, d + 0.08); base.position.y = 0.35; g.add(base); } return g; },
  shedroof(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x5f4a3e, 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); return g; },
  cratepile(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x6e5032, 0.05); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); return g; }, // estrado (os caixotes vem do HeistView)
  forklift(w, h, d) { const g = new THREE.Group(), body = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xd1a02f, 0.05); body.scale.set(w, h * 0.55, d * 0.7); body.position.set(0, h * 0.4, d * 0.12); g.add(body); const mast = ink(geo(THREE.BoxGeometry, 1, 1, 1), PAL.ink, 0.03); mast.scale.set(w * 0.8, h * 1.3, 0.15); mast.position.set(0, h * 0.65, -d * 0.32); g.add(mast); for (const sx of [-1, 1]) { const fk = ink(geo(THREE.BoxGeometry, 0.15, 0.08, 1.1), PAL.mid, 0.02); fk.position.set(sx * w * 0.25, 0.15, -d * 0.55); g.add(fk); } return g; },
  shack(w, h, d, b) { const g = new THREE.Group(), cols = [0x7a9aa0, 0xb07a5a, 0x9aa07a], m = ink(geo(THREE.BoxGeometry, 1, 1, 1), cols[Math.abs(b.seed | 0) % 3], 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); const roof = ink(geo(THREE.CylinderGeometry, 0.01, 1, 1, 4), 0x4e3b30, 0.05); roof.scale.set(Math.max(w, d) * 0.75, 1.4, Math.max(w, d) * 0.75); roof.rotation.y = Math.PI / 4; roof.position.y = h + 0.7; g.add(roof); return g; },
  barrel(w, h) { const g = new THREE.Group(), m = ink(geo(THREE.CylinderGeometry, w / 2, w / 2, h, 12), 0x8c5a36, 0.04); m.position.y = h / 2; g.add(m); for (const y of [0.2, 0.8]) { const r0 = ink(geo(THREE.CylinderGeometry, w / 2 + 0.03, w / 2 + 0.03, 0.08, 12), PAL.ink, 0); r0.position.y = h * y; g.add(r0); } return g; },
  bollard(w, h) { const g = new THREE.Group(), m = ink(geo(THREE.CylinderGeometry, w * 0.45, w * 0.5, h, 10), PAL.ink, 0.04); m.position.y = h / 2; g.add(m); const top = ink(geo(THREE.CylinderGeometry, w * 0.6, w * 0.6, 0.14, 10), PAL.ink, 0.02); top.position.y = h; g.add(top); return g; },
  crane(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xc0862e, 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); for (let y = 2; y < h; y += 2.5) { const x = ink(geo(THREE.BoxGeometry, 1, 1, 1), PAL.ink, 0); x.scale.set(w + 0.06, 0.16, d + 0.06); x.position.y = y; g.add(x); } return g; },
  cranebeam(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xc0862e, 0.06); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); const hook = ink(geo(THREE.CylinderGeometry, 0.04, 0.04, 5, 4), PAL.ink, 0); hook.position.set(1.5, -2.5, 0); g.add(hook); const box = ink(geo(THREE.BoxGeometry, 2.2, 1.4, 1.6), 0xa07a4a, 0.04); box.position.set(1.5, -5.6, 0); g.add(box); return g; },
  railcar(w, h, d) { const g = new THREE.Group(), body = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x6a3d32, 0.06); body.scale.set(w, h * 0.8, d); body.position.y = h * 0.55; g.add(body); for (const z of [-d * 0.35, d * 0.35]) for (const sx of [-1, 1]) { const wh = ink(geo(THREE.CylinderGeometry, 0.4, 0.4, 0.2, 12), PAL.ink, 0.02); wh.rotation.z = Math.PI / 2; wh.position.set(sx * w * 0.42, 0.4, z); g.add(wh); } return g; },
};

// ---------- Canyon Poeira (04/11): pecas do deserto (formas gordas, cor de terra, contorno de tinta) ----------
const DESERT = {
  // paredao do canyon: pedra em camadas (faixas de cor) com o topo irregular
  cliff(w, h, d) {
    const g = new THREE.Group(), along = w > d, L = Math.max(w, d), T = Math.min(w, d);
    const cols = [0xb4774a, 0xc98e5c, 0xa86a40];
    for (let i = 0; i < 3; i++) { const lh = h / 3, m = ink(geo(THREE.BoxGeometry, 1, 1, 1), cols[i], 0.05); m.scale.set(along ? L : T * (1 - i * 0.08), lh, along ? T * (1 - i * 0.08) : L); m.position.y = lh * (i + 0.5); g.add(m); }
    for (let k = 0; k < Math.floor(L / 6); k++) { const r0 = ink(geo(THREE.IcosahedronGeometry, 1, 0), 0xb4774a, 0.04), s0 = 1 + ((k * 37) % 5) * 0.25; r0.scale.set(s0 * 1.4, s0 * 0.7, s0 * 1.2); const o = -L / 2 + 3 + k * 6; r0.position.set(along ? o : 0, h + 0.1, along ? 0 : o); g.add(r0); }
    return g;
  },
  // casa de adobe: cubo de barro com quinas arredondadas, viga de madeira saindo; ruina = sem um pedaco de parede
  adobe(w, h, d, b) {
    const g = new THREE.Group(), tint = b.team === 'red' ? 0xd9a48c : b.team === 'blue' ? 0xb9c4cc : 0xe0b98a;
    const body = ink(geo(THREE.BoxGeometry, 1, 1, 1), tint, 0.06); body.scale.set(w, h, d); body.position.y = h / 2; g.add(body);
    for (let i = 0; i < Math.max(2, Math.floor(w / 3)); i++) { const v = ink(geo(THREE.CylinderGeometry, 0.14, 0.14, 1.2, 6), 0x6b4a2c, 0.02); v.rotation.x = Math.PI / 2; v.position.set(-w / 2 + 1.2 + i * 3, h - 0.5, d / 2 + 0.45); g.add(v); }
    if (!b.ruin) { const lip = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xc99f72, 0.04); lip.scale.set(w + 0.3, 0.35, d + 0.3); lip.position.y = h + 0.17; g.add(lip); }
    else { const bite = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xc99f72, 0.04); bite.scale.set(w * 0.35, 0.5, 0.4); bite.position.set(w * 0.2, h + 0.25, -d / 2 + 0.2); g.add(bite); } // topo quebrado
    if (b.sign === 'gas') { const s0 = ink(geo(THREE.BoxGeometry, 1, 1, 1), PAL.red, 0.04); s0.scale.set(5, 1.2, 0.3); s0.position.set(0, h + 1.2, d / 2 - 0.2); g.add(s0); }
    return g;
  },
  // mureta de adobe
  adobewall(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xd6ad7c, 0.05); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); return g; },
  // mesa: morro de topo chato, lados em degrau de pedra
  mesa(w, h, d) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const k = 1 - i * 0.07, lh = h / 3, m = ink(geo(THREE.BoxGeometry, 1, 1, 1), [0xa9643c, 0xbd7c4c, 0xcf9562][i], 0.06); m.scale.set(w * k, lh, d * k); m.position.y = lh * (i + 0.5); g.add(m); }
    return g;
  },
  // ponte de tabua: tabuleiro de madeira com tabuas e corrimao de corda
  plank(w, h, d) {
    const g = new THREE.Group(), along = d > w, L = Math.max(w, d), W = Math.min(w, d);
    for (let i = 0; i < Math.floor(L / 0.9); i++) { const t = ink(geo(THREE.BoxGeometry, 1, 1, 1), i % 3 ? 0x8a5f3a : 0x75502f, 0.03); t.scale.set(along ? W : 0.8, h, along ? 0.8 : W); const o = -L / 2 + 0.45 + i * 0.9; t.position.set(along ? 0 : o, h / 2, along ? o : 0); g.add(t); }
    for (const s0 of [-1, 1]) { const rail = ink(geo(THREE.CylinderGeometry, 0.05, 0.05, 1, 5), 0x5a3d24, 0.02); rail.scale.set(1, L, 1); rail.rotation.set(along ? Math.PI / 2 : 0, 0, along ? 0 : Math.PI / 2); rail.position.set(along ? s0 * W / 2 : 0, h + 0.9, along ? 0 : s0 * W / 2); g.add(rail); for (let k = 0; k <= Math.floor(L / 4); k++) { const post = ink(geo(THREE.BoxGeometry, 0.14, 1, 0.14), 0x5a3d24, 0.02); const o = -L / 2 + k * 4; post.position.set(along ? s0 * W / 2 : o, h + 0.45, along ? o : s0 * W / 2); g.add(post); } }
    return g;
  },
  rockstep(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0xb27448, 0.04); m.scale.set(w, h, d); m.position.y = h / 2; g.add(m); return g; },
  // duna: meia esfera achatada de areia (cobertura baixa)
  dune(w, h, d) { const g = new THREE.Group(), m = ink(geo(THREE.SphereGeometry, 1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0bf86, 0.06); m.scale.set(w * 0.62, h * 1.05, d * 0.62); g.add(m); return g; },
  // cacto de desenho: tronco e dois bracos
  cactus(w, h) {
    const g = new THREE.Group(), col = 0x5d8a4a, t = ink(geo(THREE.CapsuleGeometry, 0.32, 1, 4, 8), col, 0.04); t.scale.set(1, h / 1.6, 1); t.position.y = h / 2; g.add(t);
    for (const s0 of [-1, 1]) { const a = ink(geo(THREE.CapsuleGeometry, 0.2, 0.55, 4, 8), col, 0.03); a.position.set(s0 * 0.45, h * (s0 > 0 ? 0.55 : 0.68), 0); g.add(a); const e = ink(geo(THREE.CapsuleGeometry, 0.18, 0.2, 4, 8), col, 0.03); e.rotation.z = Math.PI / 2; e.position.set(s0 * 0.3, h * (s0 > 0 ? 0.42 : 0.55), 0); g.add(e); }
    return g;
  },
  // caminhao enferrujado dos anos 30: cabine, cacamba e rodas
  truck(w, h, d, b) {
    const g = new THREE.Group(), along = d > w, L = Math.max(w, d), W = Math.min(w, d), rust = 0x9a5a36;
    const cab = ink(geo(THREE.BoxGeometry, 1, 1, 1), rust, 0.05); cab.scale.set(W, h * 0.75, L * 0.32); cab.position.set(0, h * 0.5, -L * 0.3); g.add(cab);
    const bed = ink(geo(THREE.BoxGeometry, 1, 1, 1), 0x7a5a3c, 0.05); bed.scale.set(W, h * 0.4, L * 0.6); bed.position.set(0, h * 0.35, L * 0.18); g.add(bed);
    for (const [ex, ez] of [[-1, -0.32], [1, -0.32], [-1, 0.3], [1, 0.3]]) { const wh = ink(geo(THREE.CylinderGeometry, 0.5, 0.5, 0.35, 12), PAL.ink, 0.02); wh.rotation.z = Math.PI / 2; wh.position.set(ex * W * 0.5, 0.5, ez * L); g.add(wh); }
    if (!along) g.rotation.y = Math.PI / 2;
    // modelo do Tripo (04/11, pedido dele): troca as caixas quando chegar (tamanho pelo comprimento da caixa do mapa)
    g.userData.async = true;
    tripoModel('caminhao.glb').then(M => { if (!M) return; const boxy = [...g.children]; for (const o of boxy) g.remove(o); const m = new THREE.Mesh(M.geo, M.mat); const k = 4.9 / M.len; /* escala do carro (3,9 m) e um pouco maior: e caminhao (04/11) */ m.scale.set(k, k, k); m.rotation.y = (b.seed || 0) % 2 ? Math.PI : 0; outline(m, 0.05); g.add(m); });
    return g;
  },
};

// ---------- Estudio Tinteiro (Noite dos Borroes, 03/11): moveis e clima de estudio abandonado de noite ----------
let studioTex = null;
function stex() {
  if (studioTex) return studioTex;
  const wall = hatchTexture('#3b342f', '#1d1916', { density: 16 }); wall.wrapS = wall.wrapT = THREE.RepeatWrapping;
  const wood = hatchTexture('#4a3d33', '#221b16', { planks: true });
  const brick = hatchTexture('#4a3a33', '#1f1814', { bricks: true });
  return (studioTex = { wall, wood, brick });
}
// cada tipo de caixa novo do mapa devolve um grupo com o pe no chao (y = 0 do grupo = b.min[1])
const STUDIO = {
  // parede de estudio: papel de parede escuro com rodape de madeira e friso; tinta escorre de cima (decor)
  studiowall(w, h, d) {
    const g = new THREE.Group(), T = stex(), t = T.wall.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 3)), Math.max(1, Math.round(h / 3)));
    const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: t, unique: true }); body.position.y = h / 2; g.add(body);
    if (h < 6) return g;
    const base = ink(new THREE.BoxGeometry(w + 0.08, 0.9, d + 0.08), 0x2a211b, 0.02); base.position.y = 0.45; g.add(base);
    const rim = ink(new THREE.BoxGeometry(w + 0.12, 0.14, d + 0.12), 0x5b4a3c, 0); rim.position.y = 0.95; g.add(rim);
    return g;
  },
  // prancheta de animador: tampo inclinado com papel e lampada de braco apagada
  desk(w, h, d, b) {
    const g = new THREE.Group(), T = stex();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = ink(new THREE.BoxGeometry(0.12, h - 0.1, 0.12), 0x2a211b, 0.02); l.position.set(sx * (w / 2 - 0.15), (h - 0.1) / 2, sz * (d / 2 - 0.15)); g.add(l); }
    const top = ink(new THREE.BoxGeometry(w, 0.1, d), 0xffffff, 0.03, { map: T.wood }); top.position.y = h - 0.05; top.rotation.x = b.light ? 0 : 0.18; g.add(top);
    const paper = ink(new THREE.BoxGeometry(w * 0.6, 0.02, d * 0.6), 0xb8b0a0, 0); paper.position.set(0, h + 0.03, 0); paper.rotation.set(b.light ? 0 : 0.18, 0.2, 0); g.add(paper);
    const blot = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), toon(0x0b0a09)); blot.rotation.x = -Math.PI / 2 + (b.light ? 0 : 0.18); blot.position.set(0.2, h + 0.05, 0.05); g.add(blot); // borrao de tinta no desenho
    return g;
  },
  // cavalete com tela rabiscada
  easel(w, h, d) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) { const l = ink(new THREE.BoxGeometry(0.08, h, 0.08), 0x3a2e25, 0.02); l.position.set(0, h / 2, s * d * 0.35); l.rotation.x = -s * 0.12; g.add(l); }
    const back = ink(new THREE.BoxGeometry(0.08, h * 0.9, 0.08), 0x3a2e25, 0.02); back.position.set(w * 0.4, h * 0.45, 0); back.rotation.z = 0.25; g.add(back);
    const canvas = ink(new THREE.BoxGeometry(0.06, h * 0.45, d * 0.8), 0x9c9484, 0.03); canvas.position.set(-0.05, h * 0.62, 0); g.add(canvas);
    const smear = ink(new THREE.BoxGeometry(0.07, h * 0.25, d * 0.18), 0x0b0a09, 0); smear.position.set(-0.07, h * 0.6, d * 0.1); smear.rotation.x = 0.6; g.add(smear);
    return g;
  },
  // estante do arquivo: prateleiras com latas de filme
  shelf(w, h, d) {
    const g = new THREE.Group(), T = stex(), along = w > d, len = Math.max(w, d), dep = Math.min(w, d);
    const frame = ink(new THREE.BoxGeometry(w, h, d), 0x2a211b, 0.05); frame.position.y = h / 2; frame.scale.set(along ? 1 : 0.35, 1, along ? 0.35 : 1); g.add(frame);
    for (let k = 0; k < 4; k++) {
      const y = 0.15 + k * (h / 4), shelf = ink(new THREE.BoxGeometry(along ? len : dep, 0.06, along ? dep : len), 0xffffff, 0.02, { map: T.wood }); shelf.position.y = y; g.add(shelf);
      for (let i = 0; i < Math.floor(len / 0.7); i++) {
        if ((i * 7 + k * 3) % 5 === 0) continue; // falha na fileira
        const can = ink(new THREE.CylinderGeometry(0.28, 0.28, 0.08 + (i % 3) * 0.06, 14), (i + k) % 4 ? 0x4b4f52 : 0x6e5a2e, 0.02);
        const p = -len / 2 + 0.4 + i * 0.7; can.position.set(along ? p : 0, y + 0.1 + ((i + k) % 2) * 0.05, along ? 0 : p); can.rotation.x = along ? Math.PI / 2 : 0; can.rotation.z = along ? 0 : Math.PI / 2; g.add(can);
      }
    }
    return g;
  },
  // cabine de projecao: bloco de madeira escura com janelinhas acesas fraco
  booth(w, h, d) {
    const g = new THREE.Group(), T = stex();
    const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: T.wood }); body.position.y = h / 2; g.add(body);
    const lip = ink(new THREE.BoxGeometry(w + 0.2, 0.18, d + 0.2), 0x1d1712, 0.03); lip.position.y = h + 0.09; g.add(lip);
    return g;
  },
  roofdeck(w, h, d) {
    const g = new THREE.Group(), T = stex(), t = T.wood.clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 3), Math.round(d / 3));
    const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: t, unique: true }); body.position.y = h / 2; g.add(body);
    return g;
  },
  chimney(w, h, d) {
    const g = new THREE.Group(), T = stex();
    const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.05, { map: T.brick }); body.position.y = h / 2; g.add(body);
    const cap = ink(new THREE.BoxGeometry(w + 0.25, 0.2, d + 0.25), 0x1d1712, 0.03); cap.position.y = h + 0.1; g.add(cap);
    return g;
  },
  // parede de fora do estudio (Floresta, 03/11): tijolo escuro repetindo pelo tamanho, com cimalha em cima
  studioext(w, h, d) {
    const g = new THREE.Group(), T = stex(), t = T.brick.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 2.5)), Math.max(1, Math.round(h / 2.5)));
    const body = ink(new THREE.BoxGeometry(w, h, d), 0xffffff, 0.06, { map: t, unique: true }); body.position.y = h / 2; g.add(body);
    if (h < 9) return g; // pedaco em cima da porta
    const cap = ink(new THREE.BoxGeometry(w > d ? w + 0.4 : w + 0.4, 0.35, w > d ? d + 0.4 : d - 0.4), 0x1d1712, 0.03); cap.position.y = h + 0.175; g.add(cap); // ao longo de z: mais curta, nao entra na do canto (sem piscar)
    return g;
  },
  // tronco caido: cilindro deitado com casca escura, toco de galho e a ponta clara (madeira cortada)
  log(w, h, d) {
    const g = new THREE.Group(), along = w > d, L = Math.max(w, d), r = h / 2;
    const body = ink(geo(THREE.CylinderGeometry, 1, 1, 1, 9), 0x3b2d22, 0.05); body.scale.set(r, L, r); body.position.y = r;
    body.rotation.set(along ? 0 : Math.PI / 2, 0, along ? Math.PI / 2 : 0); g.add(body);
    for (const s of [-1, 1]) {
      const end = new THREE.Mesh(geo(THREE.CircleGeometry, 1, 9), toon(0x8a6f50)); end.scale.setScalar(r * 0.86);
      end.position.set(along ? s * (L / 2 + 0.06) : 0, r, along ? 0 : s * (L / 2 + 0.06)); end.rotation.y = along ? s * Math.PI / 2 : (s > 0 ? 0 : Math.PI); g.add(end); // 6 cm fora da ponta (sem piscar)
    }
    const twig = ink(geo(THREE.CylinderGeometry, 0.06, 0.11, 1.1, 5), 0x3b2d22, 0.03); twig.position.set(along ? L * 0.15 : 0.3, h + 0.3, along ? 0.3 : L * 0.15); twig.rotation.set(0.5, 0, -0.4); g.add(twig);
    const moss = ink(geo(THREE.SphereGeometry, 1, 7, 5), 0x2f4a26, 0.03); moss.scale.set(along ? L * 0.22 : r * 0.7, 0.18, along ? r * 0.7 : L * 0.22); moss.position.set(along ? -L * 0.12 : 0, h - 0.04, along ? 0 : -L * 0.12); g.add(moss);
    return g;
  },
};

// cartaz rasgado de desenho animado velho (rosto de borrao sorrindo, letreiro); semente muda o texto/cor
const posterTex = [];
function poster(seed) {
  if (posterTex[seed % 3]) return posterTex[seed % 3];
  const c = document.createElement('canvas'); c.width = 256; c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = ['#b8ab8c', '#a89a7c', '#9e8d6e'][seed % 3]; g.fillRect(0, 0, 256, 360);
  g.fillStyle = 'rgba(40,30,20,.25)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 360, 2 + Math.random() * 6, 1 + Math.random() * 3); // sujeira
  g.strokeStyle = '#1b1916'; g.lineWidth = 8; g.strokeRect(12, 12, 232, 336);
  g.fillStyle = '#141210'; g.beginPath(); g.ellipse(128, 160, 70, 82, 0, 0, Math.PI * 2); g.fill(); // o borrao
  g.fillStyle = '#efe8d8'; g.beginPath(); g.ellipse(102, 140, 16, 22, 0, 0, Math.PI * 2); g.ellipse(154, 140, 16, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#141210'; g.beginPath(); g.arc(106, 146, 7, 0, Math.PI * 2); g.arc(150, 146, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#efe8d8'; g.beginPath(); g.moveTo(80, 188); g.quadraticCurveTo(128, 236, 176, 188); g.quadraticCurveTo(128, 210, 80, 188); g.fill(); // sorriso de dentes
  g.strokeStyle = '#141210'; g.lineWidth = 2; for (let x = 92; x < 170; x += 12) { g.beginPath(); g.moveTo(x, 190); g.lineTo(x, 206); g.stroke(); }
  g.fillStyle = '#7a1f17'; g.font = '34px "Bowlby One", Impact, sans-serif'; g.textAlign = 'center';
  g.fillText(['O BORRÃO', 'TINTEIRO', 'NÃO SAIA'][seed % 3], 128, 300);
  g.fillStyle = '#141210'; g.font = '18px "Bowlby One", Impact, sans-serif'; g.fillText(['ESTREIA HOJE', 'ESTUDIOS 1932', 'DA TELA'][seed % 3], 128, 330);
  // rasgo: canto arrancado
  g.globalCompositeOperation = 'destination-out'; g.beginPath();
  if (seed % 2) { g.moveTo(256, 0); g.lineTo(256, 120); g.lineTo(220, 90); g.lineTo(200, 40); g.lineTo(150, 0); } else { g.moveTo(0, 360); g.lineTo(0, 250); g.lineTo(30, 280); g.lineTo(60, 330); g.lineTo(110, 360); }
  g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (posterTex[seed % 3] = t);
}

// teto do estudio, lampadas penduradas piscando, cartazes rasgados, tinta escorrendo e pocas no chao
function tinteiroDecor(root, A) {
  const moving = [], lamps = [];
  // teto escuro (o telhado do sul fica aberto pro ceu de noite)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, A + 13), toon(0x0d0b0a)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 9, (A - 13) / 2); root.add(ceil);
  for (let x = -A + 4; x < A; x += 8) { const beam = ink(new THREE.BoxGeometry(0.5, 0.6, A + 13), 0x1d1712, 0.03); beam.position.set(x, 8.7, (A - 13) / 2); root.add(beam); } // vigas
  // lampadas: fio do teto, cupula e lampada; luz de verdade so em poucas (celular)
  const lite = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const spots = [[0, 0, 1], [-6, 6, 0], [6, -6, 0], [-23, 0, 1], [23, 0, 1], [0, 22, 1], [-28, -9, 0], [28, 9, 0]];
  for (const [x, z, real] of spots) {
    const g = new THREE.Group(); g.position.set(x, 9, z); root.add(g);
    const len = 2.4 + ((x * 7 + z * 3) & 3) * 0.4;
    const cord = ink(new THREE.CylinderGeometry(0.02, 0.02, len, 4), 0x111111, 0); cord.position.y = -len / 2; g.add(cord);
    const shade = ink(new THREE.ConeGeometry(0.55, 0.45, 14, 1, true), 0x3a3a30, 0.03); shade.position.y = -len - 0.1; g.add(shade);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd28a });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bulbMat); bulb.position.y = -len - 0.3; g.add(bulb);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), new THREE.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.12, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = -8.9; g.add(glow); // poca de luz no chao (barata)
    let light = null;
    if (real && !(lite && lamps.filter(l => l.light).length >= 2)) { light = new THREE.PointLight(0xffc27a, 9, 15, 1.5); light.position.y = -len - 0.4; g.add(light); }
    lamps.push({ g, bulbMat, glow, light, base: light ? light.intensity : 0, seed: x * 0.37 + z * 0.91, bad: !real });
    moving.push(g);
  }
  // cartazes rasgados nas paredes do salao e das salas (face pra dentro)
  const posters = [[-7, 3.4, -11.9, 0], [7, 3.0, 11.9, Math.PI], [-4.5, 2.6, 11.9, Math.PI], [5, 3.6, -11.9, 0], [-11.9, 3.2, -9, Math.PI / 2], [11.9, 3.0, 9, -Math.PI / 2]]; // 10 cm da parede: colado nela pisca (regra 03/11)
  posters.forEach(([x, y, z, ry], i) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.1), toon(0xffffff, { map: poster(i), transparent: true, alphaTest: 0.5, unique: true }));
    p.position.set(x, y, z); p.rotation.set(0, ry, (i % 3 - 1) * 0.06); root.add(p);
  });
  // tinta escorrendo do alto das paredes do salao (risco preto + gota na ponta)
  const drip = toon(0x060505);
  for (let i = 0; i < 28; i++) {
    const side = i % 4, k = ((i * 53) % 21) - 10.5;
    if (Math.abs(k) < 2.2) continue; // nao em cima da porta
    const len = 1.2 + ((i * 37) % 7) * 0.45, x = side < 2 ? k : (side === 2 ? -11.92 : 11.92), z = side < 2 ? (side ? 11.92 : -11.92) : k;
    const s = new THREE.Mesh(new THREE.BoxGeometry(side < 2 ? 0.12 : 0.04, len, side < 2 ? 0.04 : 0.12), drip); s.position.set(x, 7 - len / 2, z); root.add(s);
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), drip); blob.scale.y = 1.5; blob.position.set(x, 7 - len - 0.05, z); root.add(blob);
  }
  // pocas de tinta velha no chao
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 4 + (i * 13) % 26, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.6 + (i % 4) * 0.35, 14), drip); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03 + i * 0.003, z); p.scale.set(1, 0.7 + (i % 3) * 0.2, 1); root.add(p);
  }
  return {
    moving,
    // lampadas piscam (as "ruins" piscam muito e apagam de vez em quando); balancam um tico
    update(t) {
      for (const L of lamps) {
        const n = Math.sin(t * 13 + L.seed * 7) * Math.sin(t * 3.1 + L.seed), cut = L.bad ? (Math.sin(t * 0.9 + L.seed * 3) > 0.35 && n > -0.2 ? 0.05 : 1) : (n > 0.93 ? 0.25 : 1);
        const k = cut * (0.85 + 0.15 * Math.sin(t * 31 + L.seed));
        L.bulbMat.color.setRGB(1 * k + 0.05, 0.82 * k + 0.04, 0.54 * k + 0.03);
        L.glow.material.opacity = 0.12 * k;
        if (L.light) L.light.intensity = L.base * k;
        L.g.rotation.z = Math.sin(t * 0.8 + L.seed) * 0.03; L.g.rotation.x = Math.cos(t * 0.6 + L.seed) * 0.03;
      }
    },
  };
}

// ---------- Floresta do Tinteiro (03/11, pedido dele): mata aberta de noite em volta do estudio ----------
// Economia: tudo que repete e InstancedMesh (1 chamada de desenho + 1 do contorno por tipo, uma geometria so
// na memoria pra N copias); cor muda por copia (setColorAt), sem material novo; nenhuma textura nova grande
// (o chao e um hatch 256 repetindo). Colisao so da arvore/pedra/tronco do mapa; o resto e enfeite.
function forestDecor(root, M, trees) {
  const S = M.studio, A = M.arena, F = M.forest;
  let seed = 977; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const solid = (x, z, m) => podiumClear(M, x, z) || M.boxes.some(b => b.kind !== 'forestedge' && x > b.min[0] - m && x < b.max[0] + m && z > b.min[2] - m && z < b.max[2] + m);
  const inStudio = (x, z, m = 0) => Math.max(Math.abs(x), Math.abs(z)) < S + 1 + m;
  const segD = (x, z) => { let best = Infinity; for (let i = 1; i < F.creek.length; i++) { const [ax, az] = F.creek[i - 1], [bx, bz] = F.creek[i], dx = bx - ax, dz = bz - az, k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k)); } return best; };
  const nearPool = (x, z, r) => (M.bor?.pools || []).some(q => Math.hypot(q.pos[0] - x, q.pos[1] - z) < r);
  // chao de mato: plano grande com o furo do estudio (encaixa no chao dele, nada sobreposto)
  const grass = hatchTexture('#33432a', '#131b0e', { density: 30, cross: true }); grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(0.25, 0.25);
  const R = A + 45, H = S + 1, V = (x, y) => new THREE.Vector2(x, y);
  const shape = new THREE.Shape([V(-R, -R), V(R, -R), V(R, R), V(-R, R)]); shape.holes.push(new THREE.Path([V(-H, -H), V(-H, H), V(H, H), V(H, -H)]));
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), toon(0xffffff, { map: grass, unique: true, emissive: 0x0b1009 })); floor.rotation.x = -Math.PI / 2; root.add(floor);

  // emissive fraco em cada material da mata = luar (a lua do mapa e a mesma do estudio fechado, nao da pra subir)
  const dummy = new THREE.Object3D(), col = new THREE.Color(), all = [];
  const inst = (geom, list, th, opts = {}) => {
    const m = new THREE.InstancedMesh(geom, toon(0xffffff, { unique: true, ...opts }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, ry, c], i) => {
      dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      if (c != null) m.setColorAt(i, col.set(c));
    });
    if (th) outlineInstanced(m, th);
    m.computeBoundingSphere(); m.children[0]?.computeBoundingSphere();
    root.add(m); all.push(m); return m;
  };
  const merge = (parts) => { const g = mergeGeometries(parts.map(([geom, x, y, z, sx = 1, sy = 1, sz = 1]) => geom.scale(sx, sy, sz).translate(x, y, z))); parts.forEach(([geom]) => geom.dispose()); return g; };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

  // arvores: as do mapa (tem corpo) + mata fechada atras da borda (so desenho; a nevoa engole)
  const T = trees.map(b => ({ x: (b.min[0] + b.max[0]) / 2, z: (b.min[2] + b.max[2]) / 2, r: (b.max[0] - b.min[0]) / 2, s: 0.85 + rnd() * 0.45 }));
  for (let n = 0; n < 160;) {
    const x = (rnd() * 2 - 1) * (A + 16), z = (rnd() * 2 - 1) * (A + 16);
    if (Math.max(Math.abs(x), Math.abs(z)) < A + 2.5) continue;
    T.push({ x, z, r: 0.5, s: 0.9 + rnd() * 0.5 }); n++;
  }
  T.forEach(t => { t.pine = rnd() < 0.55; t.ry = rnd() * 6.28; });
  const bark = [0x3a2c22, 0x33271e, 0x41322a], pineC = [0x1f3a2a, 0x24412c, 0x1b3326], leafC = [0x2c4a2a, 0x355230, 0x27402a, 0x3b4f2b];
  const trunkG = new THREE.CylinderGeometry(0.72, 1, 1, 7).translate(0, 0.5, 0);
  inst(trunkG, T.map(t => [t.x, 0, t.z, t.r, (t.pine ? 4.6 : 4.2) * t.s, t.r, t.ry, pick(bark)]), 0.05, { emissive: 0x140f0b });
  const pineG = merge([[new THREE.ConeGeometry(2.5, 3.4, 7), 0, 3.6, 0], [new THREE.ConeGeometry(1.95, 3, 7), 0, 5.4, 0], [new THREE.ConeGeometry(1.3, 2.6, 7), 0, 7.2, 0]]);
  inst(pineG, T.filter(t => t.pine).map(t => [t.x, 0, t.z, t.s, t.s, t.s, t.ry, pick(pineC)]), 0.08, { emissive: 0x0d1d14 });
  const leafG = merge([[new THREE.IcosahedronGeometry(2.2, 1), 0, 5.4, 0, 1, 0.85, 1], [new THREE.IcosahedronGeometry(1.55, 1), 1.7, 4.6, 0.4], [new THREE.IcosahedronGeometry(1.4, 1), -1.5, 4.9, -0.5], [new THREE.IcosahedronGeometry(1.2, 1), 0.3, 6.9, 0.2]]);
  inst(leafG, T.filter(t => !t.pine).map(t => [t.x, 0, t.z, t.s, t.s, t.s, t.ry, pick(leafC)]), 0.08, { emissive: 0x111f11 });

  // espalha enfeite no anel da floresta (fora do estudio, fora de caixa, longe do riacho/pocas conforme o tipo)
  const scatter = (n, ok, make) => { const out = []; for (let k = 0; out.length < n && k < n * 30; k++) { const x = (rnd() * 2 - 1) * (A - 0.8), z = (rnd() * 2 - 1) * (A - 0.8); if (!inStudio(x, z, 0.6) && ok(x, z)) out.push(make(x, z)); } return out; };
  const corridor = (x, z) => x < -S - 1 && x > -S - 5 && z > -20 && z < 16; // na frente das maquinas da parede
  const bushG = merge([[new THREE.IcosahedronGeometry(0.85, 1), 0, 0.5, 0], [new THREE.IcosahedronGeometry(0.62, 1), 0.7, 0.38, 0.25], [new THREE.IcosahedronGeometry(0.55, 1), -0.62, 0.36, -0.2]]);
  inst(bushG, scatter(210, (x, z) => !solid(x, z, 0.9) && segD(x, z) > 2.6 && !nearPool(x, z, 2.8) && !corridor(x, z), (x, z) => { const s = 0.7 + rnd() * 0.7; return [x, 0, z, s, s * (0.7 + rnd() * 0.3), s, rnd() * 6.28, pick(leafC)]; }), 0.05, { emissive: 0x0f1c0f });
  // capim: tufos de 3 laminas (sem contorno: e muito e pequeno)
  const blade = (rz, rx) => new THREE.ConeGeometry(0.07, 0.6, 3).rotateZ(rz).rotateX(rx);
  const tuftG = merge([[blade(0, 0), 0, 0.3, 0], [blade(0.35, 0.1), 0.1, 0.27, 0.03], [blade(-0.3, -0.15), -0.09, 0.28, -0.04]]);
  inst(tuftG, scatter(650, (x, z) => !solid(x, z, 0.15) && segD(x, z) > 1.7, (x, z) => { const s = 0.7 + rnd() * 0.8; return [x, 0, z, s, s, s, rnd() * 6.28, pick([0x2e4426, 0x38502a, 0x27391f, 0x4a5a2c])]; }), 0, { emissive: 0x121f0d });
  // cogumelos em rodinha: chapeu e pe na mesma geometria (cor por vertice); o chapeu pega a cor da copia
  const stem = new THREE.CylinderGeometry(0.06, 0.08, 0.28, 6).translate(0, 0.14, 0), cap = new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.26, 0);
  const paint = (g, c) => { const cc = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) { a[i] = cc.r; a[i + 1] = cc.g; a[i + 2] = cc.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const shroomG = mergeGeometries([paint(stem, 0xd8ccb2), paint(cap, 0xffffff)]); stem.dispose(); cap.dispose();
  const shrooms = [];
  scatter(34, (x, z) => !solid(x, z, 0.5) && segD(x, z) > 2, (x, z) => [x, z]).forEach(([x, z]) => {
    const c = pick([0xb8402e, 0xc8913a, 0x4fc7c0, 0xb8402e]);
    for (let k = 0; k < 3; k++) { const a = rnd() * 6.28, r = 0.2 + rnd() * 0.45, s = 0.7 + rnd() * 0.9; shrooms.push([x + Math.cos(a) * r, 0, z + Math.sin(a) * r, s, s, s, rnd() * 6.28, c]); }
  });
  inst(shroomG, shrooms, 0.02, { vertexColors: true, emissive: 0x1c1712 });

  // riacho raso: fita escura com dois riscos de brilho da lua e seixos na beira
  const ribbon = (w, y, off = 0) => {
    const pos = [], idx = [];
    F.creek.forEach(([x, z], i) => {
      const [px, pz] = F.creek[Math.max(0, i - 1)], [nx, nz] = F.creek[Math.min(F.creek.length - 1, i + 1)], dx = nx - px, dz = nz - pz, L = Math.hypot(dx, dz) || 1, ox = -dz / L, oz = dx / L;
      const cx = x + ox * off, cz = z + oz * off;
      pos.push(cx + ox * w / 2, y, cz + oz * w / 2, cx - ox * w / 2, y, cz - oz * w / 2);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const water = new THREE.Mesh(ribbon(3.2, 0.06, 0), toon(0x1a2836, { unique: true, emissive: 0x0b1622, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  root.add(water); // 6 cm acima do chao + polygonOffset (regra 03/11: nada coplanar)
  const shine = new THREE.MeshBasicMaterial({ color: 0x5d7894, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  root.add(new THREE.Mesh(ribbon(0.18, 0.12, 0.55), shine), new THREE.Mesh(ribbon(0.12, 0.12, -0.7), shine));
  const pebbles = [];
  F.creek.forEach(([x, z], i) => { if (!i) return; const [px, pz] = F.creek[i - 1]; for (let k = 0; k < 4; k++) { const t = rnd(), side = rnd() < 0.5 ? -1 : 1, dx = x - px, dz = z - pz, L = Math.hypot(dx, dz), s = 0.18 + rnd() * 0.35; pebbles.push([px + dx * t - dz / L * side * (1.6 + rnd() * 0.5), 0.02, pz + dz * t + dx / L * side * (1.6 + rnd() * 0.5), s, s * 0.6, s * (0.8 + rnd() * 0.5), rnd() * 6.28, pick([0x6d6a62, 0x5a5850, 0x7a766a])]); } });
  inst(new THREE.IcosahedronGeometry(1, 0), pebbles, 0.03, { emissive: 0x141414 });

  // lampioes na porta da floresta (sem luz de verdade: luz nova recompila tudo e pesa no celular)
  const door = M.bor?.doors.find(d => d.id === 'floresta'), glows = [];
  if (door) for (const s of [-1, 1]) {
    const x = door.x - 0.85, z = door.z + s * 2.3; // rente a parede (22 cm), fora do caminho de quem passa
    const post = ink(new THREE.BoxGeometry(0.16, 2.6, 0.16), 0x2a211b, 0.03); post.position.set(x, 1.3, z); root.add(post);
    const arm = ink(new THREE.BoxGeometry(0.5, 0.08, 0.08), 0x2a211b, 0.02); arm.position.set(x - 0.2, 2.55, z); root.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc97a })); lamp.position.set(x - 0.42, 2.35, z); root.add(lamp);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 18), new THREE.MeshBasicMaterial({ color: 0xffb860, transparent: true, opacity: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x - 0.4, 0.07, z); root.add(glow); glows.push(glow);
  }

  // vaga-lumes: uma malha de pontos so (140), mexe no processador (barato)
  const FL = scatter(140, () => true, (x, z) => [x, 0.6 + rnd() * 2.6, z, rnd() * 6.28]);
  const fpos = new Float32Array(FL.length * 3), fgeo = new THREE.BufferGeometry(); fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flies = new THREE.Points(fgeo, new THREE.PointsMaterial({ color: 0xd9ff8a, size: 0.16, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false; root.add(flies);

  return {
    moving: [flies],
    update(t) {
      for (let i = 0; i < FL.length; i++) {
        const [x, y, z, ph] = FL[i];
        fpos[i * 3] = x + Math.sin(t * 0.5 + ph) * 1.2; fpos[i * 3 + 1] = y + Math.sin(t * 1.3 + ph * 2) * 0.35; fpos[i * 3 + 2] = z + Math.cos(t * 0.4 + ph) * 1.2;
      }
      fgeo.attributes.position.needsUpdate = true;
      flies.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.25;
      for (const g of glows) g.material.opacity = 0.09 + Math.sin(t * 9 + g.position.z) * 0.015;
    },
  };
}

// lua cheia de desenho dos anos 30 (mapa de noite): disco palido com crateras, halo e cara sonolenta e torta
let moonTex = null;
function moonTexture() {
  if (moonTex) return moonTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const halo = g.createRadialGradient(128, 128, 60, 128, 128, 128); halo.addColorStop(0, 'rgba(210,215,230,.35)'); halo.addColorStop(1, 'rgba(210,215,230,0)');
  g.fillStyle = halo; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#e6e2d2'; g.strokeStyle = '#141210'; g.lineWidth = 6;
  g.beginPath(); g.arc(128, 128, 72, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = 'rgba(120,115,100,.45)';
  for (const [x, y, r] of [[96, 100, 12], [160, 92, 8], [150, 160, 15], [100, 164, 7], [172, 128, 6]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  // cara: olhos meio fechados e sorriso torto (assusta um pouco)
  g.strokeStyle = '#141210'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.arc(108, 122, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.arc(148, 122, 11, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.beginPath(); g.moveTo(104, 152); g.quadraticCurveTo(130, 170, 156, 146); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (moonTex = t);
}

// carros parados (04/11, pedido dele): um modelo do Tripo (sedan dos anos 30, azul de fabrica) e a cor de cada um
// trocada no shader (o azul da lataria vira a cor sorteada; vidro, cromo, farol e pneu ficam)
const CAR_COLORS = [0xa83a2c, 0x2f5b8a, 0x5f7f3e, 0xd9b44a, 0x7a4e8c, 0x2f8a83, 0xe6dcc4, 0xc46a2b];
let CAR_P = null;
function carModel() {
  return CAR_P ||= new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/carro_banco.glb').then(gl => {
    gl.scene.updateMatrixWorld(true); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return null;
    const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox();
    let bb = g0.boundingBox; if (bb.max.x - bb.min.x > bb.max.z - bb.min.z) g0.rotateY(Math.PI / 2);
    g0.computeBoundingBox(); bb = g0.boundingBox; g0.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g0.computeBoundingBox(); g0.computeVertexNormals();
    const map = mesh.material?.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
    return { geo: g0, map, len: g0.boundingBox.max.z - g0.boundingBox.min.z };
  }).catch(e => { console.warn('carro_banco.glb nao carregou', e); return null; });
}
const CAR_MAT = new Map();
function carMat(col) {
  if (CAR_MAT.has(col)) return CAR_MAT.get(col);
  const m = toon(0xffffff, { map: null, unique: true }), c = new THREE.Color(col);
  carModel().then(M => { if (M?.map) { m.map = M.map; m.needsUpdate = true; } });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCar = { value: c };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uCar;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 k = diffuseColor.rgb; float lum = dot(k, vec3(0.3, 0.59, 0.11));
          float blue = smoothstep(0.06, 0.16, k.b - max(k.r, k.g * 0.92)); /* lataria azul de fabrica */
          diffuseColor.rgb = mix(k, uCar * (0.45 + lum * 0.95), blue); }`);
  };
  m.customProgramCacheKey = () => 'carPaint';
  CAR_MAT.set(col, m);
  return m;
}

// modelo do Tripo pra cenario (04/11): uma malha, comprimento no Z, base no chao, centrado; material de desenho com a
// textura dele. Carrega uma vez por arquivo
const TRIPO = new Map();
function tripoModel(file) {
  if (TRIPO.has(file)) return TRIPO.get(file);
  const p = new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/' + file).then(gl => {
    gl.scene.updateMatrixWorld(true); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return null;
    const g0 = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld); g0.computeBoundingBox();
    let bb = g0.boundingBox; if (bb.max.x - bb.min.x > bb.max.z - bb.min.z) g0.rotateY(Math.PI / 2);
    g0.computeBoundingBox(); bb = g0.boundingBox; g0.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g0.computeBoundingBox(); g0.computeVertexNormals();
    const map = mesh.material?.map || null; if (map) map.colorSpace = THREE.SRGBColorSpace;
    return { geo: g0, mat: toon(0xffffff, { map, unique: true }), len: g0.boundingBox.max.z - g0.boundingBox.min.z };
  }).catch(e => { console.warn(file + ' nao carregou', e); return null; });
  TRIPO.set(file, p);
  return p;
}

// ---------- mapas modelados no Blender (06/11) ----------
// pecas que o .glb NAO desenha (ficam as do jogo): carro do Tripo (chega depois) e o frontao com a placa pintada em canvas
const MAP_KEEP = { ferradura: ['car', 'marble+sign'], moeda: ['car', 'mintsign'], tinteiro: ['rock', 'log'], ilha: ['ringfloor', 'rope', 'post'], deserto: ['truck'], trapiche: ['car', 'truck'], becos: ['car', 'truck'], feira: ['car', 'truck'], largo: ['car', 'truck'], cortejo: ['car', 'truck'] }; // tinteiro: a floresta fica a do jogo
const MAP_GLB = { estande: 'estande.glb', xilindro: 'xilindro.glb', trapiche: 'trapiche.glb', vila: 'vila.glb', fronteira: 'fronteira.glb', estaleiro: 'estaleiro.glb', fabrica: 'fabrica.glb', refinaria: 'refinaria.glb', ferradura: 'ferradura.glb', docas: 'docas.glb', tinteiro: 'tinteiro.glb', moeda: 'moeda.glb', bonde: 'bonde.glb', apito: 'apito.glb', ilha: 'ilha.glb', deserto: 'deserto.glb', becos: 'becos.glb', feira: 'feira.glb', largo: 'largo.glb', cortejo: 'cortejo.glb' }; // 06/11: Fronteira remodelada no Blender (tools/blender/mapa.py)
const MAP_CELL = 40, MAP_SPLIT_MIN = 12000; // so malha pesada de verdade e dividida (celula de 40 m): dividir as leves gastava mais em chamadas de desenho do que economizava em triangulos (ver mapModel)
const MAP_THIN_FAR = 42; // celular: contorno de acabamento (moldura e vidro) so ate aqui; numa tela pequena nem da pra ver e sao centenas de milhares de triangulos
const MAPM = new Map(), MAPG = new Map(); // MAPG: modelo ja pronto (o mapa monta direto com ele, sem as caixas antes)
// mapas comprimidos com Draco (06/11, pedido dele: PC e celular; ~15x menor). Decoder em public/draco (copia do three)
let draco = null;
function mapLoader() {
  const l = new GLTFLoader();
  if (!draco) { draco = new DRACOLoader(); draco.setDecoderPath(import.meta.env.BASE_URL + 'draco/'); }
  l.setDRACOLoader(draco); return l;
}
// baixa o modelo do mapa antes da partida (tela de carregamento): quando o mundo monta, ja entra o do Blender direto
export function preloadMap(id) { return MAP_GLB[id] ? mapModel(MAP_GLB[id]) : Promise.resolve(null); }
function mapModel(file) {
  if (MAPM.has(file)) return MAPM.get(file);
  const p = mapLoader().loadAsync(import.meta.env.BASE_URL + 'models/maps/' + file).then(gl => {
    const g = new THREE.Group();
    gl.scene.updateMatrixWorld(true);
    gl.scene.traverse(o => {
      if (!o.isMesh || !/^vila_|^map_/.test(o.name)) return; // so as malhas do mapa (nada que tenha ficado selecionado no Blender)
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld); geo.computeVertexNormals();
      const col = o.material?.color ? o.material.color.getHex() : 0xffffff;
      const glass = /glass/.test(o.name);
      const th = glass ? 0.02 : 0.045, tris = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
      if (tris > MAP_SPLIT_MIN) { // 09/11: malha grande vira pedacos por celula: so entra no desenho o que a camera enxerga (o Largo desenhava 500 mil triangulos olhando pra uma parede)
        const mat = toon(col, { unique: true }), parts = new Map();
        for (const [key, c] of splitByCell(geo, MAP_CELL)) { const m = new THREE.Mesh(c, mat); m.name = o.name; m.userData.keep = true; parts.set(key, m); g.add(m); }
        outlineCells(parts, geo, th, MAP_CELL);
        return;
      }
      const m = new THREE.Mesh(geo, toon(col, { unique: true })); m.name = o.name; // nome do material do Blender (a noite acende vidro e marmore por ele)
      outline(m, th);
      g.add(m);
    });
    if (g.children.length) MAPG.set(file, g);
    return g.children.length ? g : null;
  }).catch(e => { console.warn(file + ' nao carregou', e); return null; });
  MAPM.set(file, p);
  return p;
}

// Dirigivel novo (08/11, pedido dele): feito no Blender (tools/blender/dirigivel.py). Cor nos vertices: uma chamada de desenho
// por casco, e cada time tem sua copia com os gomos e o leme na propria cor. Enquanto nao carrega, fica o desenho antigo.
let DG = null;
new GLTFLoader().loadAsync(import.meta.env.BASE_URL + 'models/src/dirigivel2.glb').then((gl) => {
  gl.scene.updateMatrixWorld(true);
  const flat = (name, team) => {
    const node = gl.scene.getObjectByName(name), inv = node.matrixWorld.clone().invert(), parts = [];
    node.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      g.applyMatrix4(inv.clone().multiply(o.matrixWorld));
      const c = team && /team/.test(o.material.name) ? new THREE.Color(team) : o.material.color, n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts.push(g);
    });
    return mergeGeometries(parts);
  };
  const pos = (name) => gl.scene.getObjectByName(name).position.clone();
  DG = { mat: toon(0xffffff, { unique: true, vertexColors: true }), red: { body: flat('dg_body', PAL.red), rudder: flat('rudder', PAL.red) }, blue: { body: flat('dg_body', PAL.blue), rudder: flat('rudder', PAL.blue) }, prop: flat('prop_L'), gun: flat('gun'), pv: { propL: pos('prop_L'), propR: pos('prop_R'), rudder: pos('rudder'), gun: pos('gun') } };
}).catch(e => console.warn('dirigivel2.glb nao carregou (fica o desenho antigo)', e));
