// Materiais toon + contorno de tinta (casco invertido com normais suavizadas).
import * as THREE from 'three';
import { mergeGeometries as mergeKitGeos } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mergeVertices, mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 165, 165, 165, 255, 255, 255, 255, 255]), 3, 1);
grad.minFilter = grad.magFilter = THREE.NearestFilter;
grad.needsUpdate = true;

export const INK = 0x141210;
export const PAL = {
  ink: 0x1b1916, dark: 0x3a3632, mid: 0x6e6a63, wood: 0x9d9384, light: 0xcfc9bd, paper: 0xece9e1, white: 0xfaf8f2,
  red: 0xa83a2c, blue: 0x2f5b8a,
};

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = color + (opts.map ? opts.map.uuid : '') + (opts.emissive || '');
  if (!opts.map && !opts.unique && matCache.has(key)) return matCache.get(key);
  const { unique, ...rest } = opts;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: grad, ...rest });
  if (!unique) matCache.set(key, m);
  return m;
}

// 07/11: o contorno entra na nevoa (antes ficava preto no fundo e a nevoa nem aparecia: a silhueta continuava la)
// contorno so de perto (07/11, pedido dele): alem de OUTLINE_FAR (onde a nevoa ja come quase tudo) o casco nem e desenhado.
// Valor atualizado todo quadro pelo main.js; 1e9 = sem limite (menus, luneta)
export const OUTLINE_FAR = { value: 1e9 };
// 19/11 (regra dele: "na MIRA nao pode ter trecho preto ao redor"): mirando, o contorno da arma NA MAO some perto do centro da tela
// (onde ficam massa, alca e luneta). So vale no desenho da arma (post.js liga em volta da passada da arma); o mundo nao muda
export const SIGHT_CLEAR = { value: new THREE.Vector3(0, 1.78, 0.2) };
// 09/11: Ajustes > Contornos. map = ate onde o contorno do cenario e desenhado; thin = molduras e vidros (a maioria dos triangulos)
export const OUTLINE_CFG = { map: 1e9, thin: 1e9 };
const outlineMat = new THREE.ShaderMaterial({
  uniforms: { th: { value: 0.045 }, uFar: OUTLINE_FAR, uClr: SIGHT_CLEAR, ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog) },
  fog: true,
  vertexShader: `
    uniform float th, uFar; uniform vec3 uClr;
    attribute float _x;
    #include <fog_pars_vertex>
    void main(){
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      // espessura cresce um pouco com a distancia pra nao sumir longe
      float k = th * clamp(-mv.z * 0.06 + 0.7, 0.7, 3.0);
      if (uClr.x > 0.0) { vec4 c0 = projectionMatrix * mv; vec2 q = c0.xy / max(c0.w, 1e-4); k *= mix(1.0, smoothstep(uClr.z * 0.55, uClr.z, length(vec2(q.x * uClr.y, q.y))), uClr.x); }
      mv.xyz += n * k;
      gl_Position = projectionMatrix * mv;
      if (-mv.z > uFar) gl_Position = vec4(0.0, 0.0, 2.0, 1.0); // longe: fora do recorte, o triangulo nem rasteriza
      vec4 mvPosition = mv;
      #include <fog_vertex>
    }`,
  fragmentShader: `#include <fog_pars_fragment>
    void main(){ gl_FragColor = vec4(0.07,0.06,0.055,1.0);
    #include <fog_fragment>
    }`,
  side: THREE.BackSide,
});
const outlineMats = new Map();
// 05/11 (pedido dele: malha piscando nas juncoes): o casco do contorno e empurrado pra tras na profundidade; quase colado na peca vizinha, nunca ganha dela
// liga e desliga todos os contornos de uma vez (desenho do vidro da luneta em maquina que nao segura)
export function outlinesOn(v) { for (const m of outlineMats.values()) m.visible = v; }
function getOutlineMat(th) {
  if (!outlineMats.has(th)) { const m = outlineMat.clone(); m.uniforms.th.value = th; m.uniforms.uFar = OUTLINE_FAR; m.uniforms.uClr = SIGHT_CLEAR; m.polygonOffset = true; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = 3; outlineMats.set(th, m); }
  return outlineMats.get(th);
}

// contorno (14/11, desempenho medido no app: travadas de 100-700 ms quando bot nascia). O cache era POR OBJETO: cada arvore,
// chapeu, luva e peca de arma montada de novo criava geometria nova e refazia o mergeVertices (o mais caro do quadro), alem de
// guardar uma copia da malha de contorno por boneco. Agora a chave e a FORMA (tipo + parametros, ou a impressao dos vertices):
// mesma forma = mesma malha de contorno, calculada uma vez so e marcada como compartilhada (ninguem libera ela sozinho).
const sharedSet = new WeakSet(); // geometria compartilhada: quem limpa a cena nao libera
const geoCache = new WeakMap(), shapeCache = new Map(), SHAPE_MAX = 1500;
function shapeKey(g) {
  const P = g.attributes.position; if (!P) return null;
  if (g.parameters && g.type !== 'BufferGeometry') return g.type + JSON.stringify(g.parameters);
  const a = P.array, n = a.length, I = g.index?.array; let h1 = 0, h2 = 0, h3 = 0;
  for (let i = 0; i < n; i++) { const v = a[i]; h1 += v; h2 += v * ((i % 97) + 1); h3 = (h3 + Math.round(v * 4096) * (i + 7)) | 0; }
  let hi = 0; if (I) for (let i = 0; i < I.length; i += 3) hi = (hi * 31 + I[i]) | 0;
  return n + '|' + (I ? I.length : 0) + '|' + h1.toFixed(4) + '|' + h2.toFixed(3) + '|' + h3 + '|' + hi;
}
export function smoothGeo(g) {
  const hit = geoCache.get(g); if (hit) return hit;
  const k = shapeKey(g); let m = k && shapeCache.get(k);
  if (m) { shapeCache.delete(k); shapeCache.set(k, m); } // usado agora: vai pro fim da fila
  else {
    const c = g.clone();
    for (const a of Object.keys(c.attributes)) if (a !== 'position') c.deleteAttribute(a);
    m = mergeVertices(c, 1e-3); c.dispose();
    m.computeVertexNormals();
    sharedSet.add(m);
    // 15/11: o que sai do cache cheio tambem sai da placa (antes so saia da lista: 1 malha a mais na memoria de video pra sempre).
    // Se alguem ainda usar, o three sobe de novo no proximo desenho
    if (k) { shapeCache.set(k, m); if (shapeCache.size > SHAPE_MAX) { const k0 = shapeCache.keys().next().value; const old = shapeCache.get(k0); shapeCache.delete(k0); old?.dispose(); } }
  }
  geoCache.set(g, m);
  return m;
}
export const smoothCacheSize = () => shapeCache.size;
export const rigidCacheSize = () => rigidCache.size; // 15/11: medir o cache (teste de vazamento)

// junta pecinhas paradas (14/11, desempenho: boneco longe ainda desenhava 39 malhas; a luva de espinho sozinha eram 12 cones).
// Dentro de um acessorio (chapeu, oculos, mascara, enfeite da luva): pecas com o MESMO material, sem filho de verdade e que
// ninguem referencia (helice, bolinha, tela...: tudo que esta no userData fica solto e animando) viram UMA malha + um contorno.
// key: a mesma forma pronta fica compartilhada entre os bonecos com o mesmo visual (memoria). Chamar ANTES do antiFlicker.
const rigidCache = new Map(), RIGID_MAX = 400;
const rigidFlags = (ud) => { for (const k in ud) if (k !== 'detail' && k !== 'gloveExtra') return false; return true; };
export function mergeRigid(root, key) {
  if (!root) return root;
  const refs = new Set();
  root.traverse(o => { for (const v of Object.values(o.userData || {})) { if (v?.isObject3D) refs.add(v); else if (Array.isArray(v)) for (const x of v) if (x?.isObject3D) refs.add(x); } });
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map();
  root.traverse(o => {
    if (!o.isMesh || o === root || o.isInstancedMesh || o.isSkinnedMesh || refs.has(o) || !o.material || Array.isArray(o.material) || o.material.isShaderMaterial || o.material.transparent || o.material.map || o.material.polygonOffset || !rigidFlags(o.userData)) return;
    for (let q = o.parent; q && q !== root; q = q.parent) if (refs.has(q) || !rigidFlags(q.userData)) return;
    if (o.children.some(c => !(c.isMesh && c.material?.uniforms?.th))) return; // tem filho de verdade: fica
    const ol = o.children.find(c => c.material?.uniforms?.th), th = ol ? ol.material.uniforms.th.value : 0;
    const k = o.material.uuid + '|' + th + '|' + (o.userData.detail ? 'd' : '') + (o.userData.gloveExtra ? 'g' : '') + '|' + o.renderOrder + '|' + o.visible;
    let gr = groups.get(k); if (!gr) groups.set(k, gr = { list: [], th, o });
    gr.list.push(o);
  });
  let gi = 0;
  for (const [k, gr] of groups) {
    gi++;
    if (gr.list.length < 2) continue;
    const ck = key ? key + '#' + gi + '#' + gr.list.length + '#' + gr.th : null;
    let g = ck && rigidCache.get(ck);
    if (!g) {
      const parts = gr.list.map(o => { const c = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); for (const a of Object.keys(c.attributes)) if (a !== 'position' && a !== 'normal') c.deleteAttribute(a); if (!c.attributes.normal) c.computeVertexNormals(); c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return c; });
      g = mergeGeometries(parts); for (const c of parts) c.dispose();
      if (!g) continue;
      if (ck) { sharedSet.add(g); rigidCache.set(ck, g); if (rigidCache.size > RIGID_MAX) { const k0 = rigidCache.keys().next().value; const old = rigidCache.get(k0); rigidCache.delete(k0); old?.dispose(); } } // 15/11: libera o que sai
    }
    const m = new THREE.Mesh(g, gr.o.material); m.renderOrder = gr.o.renderOrder; m.visible = gr.o.visible;
    if (gr.o.userData.detail) m.userData.detail = true; if (gr.o.userData.gloveExtra) m.userData.gloveExtra = true;
    if (gr.th) outline(m, gr.th);
    for (const o of gr.list) { o.parent.remove(o); if (!sharedSet.has(o.geometry)) o.geometry.dispose(); }
    root.add(m);
  }
  return root;
}

// contorno longe sai da LISTA de desenho (14/11, desempenho medido: 365 de ~900 desenhos por quadro eram contornos).
// Antes, alem de OUTLINE_FAR o shader so jogava o triangulo pra fora: a chamada de desenho ia inteira pra placa. Agora a
// cada poucos quadros o contorno longe troca de camada (layers 1: nenhuma camera desenha). Camada e nao "visible": o LOD do
// boneco ja usa o visible e os dois nao brigam. So o que esta na cena da partida (arma na mao e telas de menu ficam de fora).
const OUTLS = [];
let outlI = 0;
export function cullOutlines(scene, cam, far, budget = 600) {
  const n = OUTLS.length; if (!n) return;
  const cx = cam.x, cy = cam.y, cz = cam.z;
  for (let k = 0; k < Math.min(budget, n); k++) {
    if (outlI >= OUTLS.length) outlI = 0;
    const o = OUTLS[outlI];
    let r = o; while (r.parent) r = r.parent;
    // fora da cena da partida (boneco que saiu, arma da mao, menu): volta pra camada normal e sai da lista (nada de vazar memoria)
    if (r !== scene) { if (o.layers.mask !== 1) o.layers.set(0); OUTLS[outlI] = OUTLS[OUTLS.length - 1]; OUTLS.pop(); continue; }
    outlI++;
    const e = o.matrixWorld.elements, g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const rad = (g.boundingSphere?.radius || 0) * Math.hypot(e[0], e[1], e[2]);
    const d = Math.hypot(e[12] - cx, e[13] - cy, e[14] - cz) - rad;
    const on = d < far;
    if (on !== (o.layers.mask === 1)) o.layers.set(on ? 0 : 1);
  }
}

export function outline(mesh, th = 0.04) {
  const o = new THREE.Mesh(smoothGeo(mesh.geometry), getOutlineMat(th));
  OUTLS.push(o);
  o.raycast = () => {};
  o.renderOrder = mesh.renderOrder;
  mesh.add(o);
  return mesh;
}

// contorno com espessura POR VERTICE (atributo aTh = espessura de cada peca): varias pecas juntadas (arma) com tracos diferentes
// viram UM contorno so. Mesmo shader do contorno normal (th = 1 aqui, o traco vem do atributo). hull = casco ja pronto (smoothGeo das pecas)
let varOutlineMat = null;
export function outlineVar(mesh, hull) {
  if (!varOutlineMat) {
    const m = outlineMat.clone(); m.uniforms.th.value = 1; m.uniforms.uFar = OUTLINE_FAR; m.uniforms.uClr = SIGHT_CLEAR; m.polygonOffset = true; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = 3;
    m.vertexShader = 'attribute float aTh;\n' + m.vertexShader.replace('float k = th * ', 'float k = th * aTh * ');
    outlineMats.set('var', varOutlineMat = m);
  }
  const o = new THREE.Mesh(hull, varOutlineMat);
  OUTLS.push(o);
  o.raycast = () => {};
  o.renderOrder = mesh.renderOrder;
  mesh.add(o);
  return o;
}

// contorno de InstancedMesh (floresta, 03/11): mesmo casco invertido, lendo a matriz de cada copia.
// Divide o instanceMatrix com a malha (mexeu numa, mexeu no contorno) = 2 chamadas de desenho pra N copias
const instOutlineMats = new Map();
export function outlineInstanced(mesh, th = 0.04) {
  let mat = instOutlineMats.get(th);
  if (!mat) {
    mat = getOutlineMat(th).clone(); mat.uniforms.th.value = th; mat.uniforms.uFar = OUTLINE_FAR; mat.uniforms.uClr = SIGHT_CLEAR;
    mat.vertexShader = mat.vertexShader.replace('vec4 mv = modelViewMatrix * vec4(position, 1.0);', 'vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);')
      .replace('normalize(normalMatrix * normal)', 'normalize(normalMatrix * mat3(instanceMatrix) * normal)');
    instOutlineMats.set(th, mat);
  }
  const o = new THREE.InstancedMesh(smoothGeo(mesh.geometry), mat, mesh.count);
  o.instanceMatrix = mesh.instanceMatrix;
  o.raycast = () => {};
  o.frustumCulled = mesh.frustumCulled;
  mesh.add(o);
  return mesh;
}

// Junta tudo que fica parado embaixo de `root` numa malha por material (os contornos tambem, pelo
// material deles). O mapa tinha ~840 malhas = ~840 chamadas de desenho por quadro; no celular era o
// que derrubava o FPS. O visual nao muda: a posicao de cada peca vai assada na geometria.
// `skip` = objetos que mexem sozinhos (arvore, chamine, nuvem): ficam como estao, com os filhos.
// Junta por material DENTRO de blocos de CELL metros: assim a camera ainda descarta o bloco que
// esta fora da tela (uma malha so do mapa inteiro desenharia tudo sempre).
const MERGE_ATTRS = ['position', 'normal', 'uv'];
const CELL = 32;
export function mergeStatic(root, skip = new Set()) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map(), wp = new THREE.Vector3();
  const walk = (o) => {
    if (skip.has(o)) return;
    const m = o.material;
    if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && m && !Array.isArray(m) && !m.transparent && o.visible && !o.userData.keep) {
      wp.setFromMatrixPosition(o.matrixWorld);
      const key = m.uuid + '|' + Math.floor(wp.x / CELL) + '|' + Math.floor(wp.z / CELL);
      let g = groups.get(key); if (!g) groups.set(key, g = { mat: m, list: [] });
      g.list.push(o);
    }
    for (const c of o.children) walk(c);
  };
  walk(root);
  let before = 0, after = 0;
  for (const { mat, list } of groups.values()) {
    before += list.length;
    if (list.length < 2) { after += list.length; continue; }
    const hasUv = list.every(o => o.geometry.attributes.uv);
    const geos = list.map(o => {
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!MERGE_ATTRS.includes(k) || (k === 'uv' && !hasUv)) g.deleteAttribute(k);
      for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      g.clearGroups();
      const mx = inv.clone().multiply(o.matrixWorld);
      g.applyMatrix4(mx);
      // escala negativa vira o triangulo do avesso: desvira (o contorno e BackSide)
      if (mx.determinant() < 0) {
        for (const k of Object.keys(g.attributes)) {
          const a = g.attributes[k], n = a.itemSize, arr = a.array;
          for (let i = 0; i < arr.length; i += n * 3) for (let j = 0; j < n; j++) { const t = arr[i + n + j]; arr[i + n + j] = arr[i + 2 * n + j]; arr[i + 2 * n + j] = t; }
        }
      }
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) { after += list.length; continue; }
    const mesh = new THREE.Mesh(merged, mat);
    mesh.raycast = () => {};
    mesh.renderOrder = list[0].renderOrder;
    merged.computeBoundingSphere(); // a camera descarta o bloco fora da tela
    // tira as originais; filho que nao foi junto (ex.: chamine dentro de uma casa) sobe pro root
    const gone = new Set(list);
    for (const o of list) {
      for (const c of [...o.children]) if (!gone.has(c)) root.attach(c);
      o.parent?.remove(o);
    }
    root.add(mesh);
    after++;
  }
  return { before, after };
}

// Arvores (balancam) e nuvens (andam) juntas numa malha por material, com o movimento no shader.
// Eram ~35 grupos x 10 malhas = ~350 chamadas de desenho so pra paisagem.
// aMove = (base x, base y, fase, amplitude); amplitude < 0 = nuvem (anda em x e da a volta).
const MOVE_GLSL = `
attribute vec4 aMove;
uniform float uMoveT;
vec3 moveIt(vec3 p) {
  if (aMove.w >= 0.0) {
    float a = sin(uMoveT * 2.4 + aMove.z) * aMove.w, c = cos(a), s = sin(a);
    vec2 r = p.xy - aMove.xy;
    p.xy = aMove.xy + vec2(r.x * c - r.y * s, r.x * s + r.y * c);
  } else {
    p.x += mod(aMove.x + uMoveT * 1.6 + 160.0, 320.0) - 160.0 - aMove.x;
  }
  return p;
}
`;
function movingMaterial(mat, uT) {
  const m = mat.clone();
  if (m.isShaderMaterial) {
    m.uniforms.uMoveT = uT; if (m.uniforms.uFar) m.uniforms.uFar = OUTLINE_FAR;
    m.vertexShader = MOVE_GLSL + m.vertexShader.replace('vec4 mv = modelViewMatrix * vec4(position, 1.0);', 'vec4 mv = modelViewMatrix * vec4(moveIt(position), 1.0);');
  } else {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uMoveT = uT;
      sh.vertexShader = MOVE_GLSL + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = moveIt(vec3(position));');
    };
    m.customProgramCacheKey = () => 'move';
  }
  return m;
}
// items: [{ obj, phase, amp }] (amp < 0 = nuvem). uT = { value: segundos } atualizado pelo mapa.
// contorno das arvores juntadas (09/11): mesmos pontos e o mesmo balanco do corpo; so a normal e dele. Divide os dados em vez de guardar duas vezes
function shareOutline(pairs) {
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const bodies = pairs.filter(g => !g.isOutline), lines = pairs.filter(g => g.isOutline);
  for (const { geo } of lines) for (const { geo: body } of bodies) {
    if (geo.attributes.position.count !== body.attributes.position.count || !same(geo.attributes.position.array, body.attributes.position.array)) continue;
    geo.setAttribute('position', body.attributes.position); if (body.attributes.aMove) geo.setAttribute('aMove', body.attributes.aMove); geo.deleteAttribute('uv'); break;
  }
}
export function mergeMoving(root, items, uT) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const groups = new Map();
  for (const it of items) {
    const base = new THREE.Vector3().setFromMatrixPosition(it.obj.matrixWorld).applyMatrix4(inv);
    it.obj.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      let g = groups.get(o.material); if (!g) groups.set(o.material, g = []);
      g.push({ o, it, base });
    });
  }
  const built = [];
  for (const [mat, list] of groups) {
    const hasUv = list.every(({ o }) => o.geometry.attributes.uv);
    const geos = list.map(({ o, it, base }) => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!MERGE_ATTRS.includes(k) || (k === 'uv' && !hasUv)) g.deleteAttribute(k);
      g.clearGroups();
      g.applyMatrix4(inv.clone().multiply(o.matrixWorld));
      const n = g.attributes.position.count, a = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) a.set([base.x, base.y, it.phase, it.amp], i * 4);
      g.setAttribute('aMove', new THREE.BufferAttribute(a, 4));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    built.push({ geo: merged, isOutline: !!mat.isShaderMaterial });
    const mesh = new THREE.Mesh(merged, movingMaterial(mat, uT));
    mesh.raycast = () => {};
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  shareOutline(built);
  for (const it of items) it.obj.parent?.remove(it.obj);
}

// atalho: malha toon com contorno
// geometria fixa compartilhada (02/11): granada, bigorna, dirigivel, mola... eram criadas de novo a cada uso e nunca
// liberadas (o log de memoria de video subia ~13 geometrias por abate; celular perdia o contexto do WebGL). Mesma
// forma = mesma geometria (e o contorno dela tambem fica no cache do smoothGeo)
const sharedGeos = new Map();
export function geo(Ctor, ...args) {
  const k = Ctor.name + '|' + args.join(',');
  let g = sharedGeos.get(k);
  if (!g) { g = new Ctor(...args); sharedGeos.set(k, g); sharedSet.add(g); }
  return g;
}

// tirou um pedaco grande da cena pra sempre (mapa da partida que acabou, arma largada): libera a geometria na placa.
// Antes o mapa velho ficava inteiro na memoria de video a cada partida nova (02/11). As compartilhadas (geo()) ficam.
export const isSharedGeo = (g) => sharedSet.has(g);
// 09/11 (mapas novos pesados): separa uma malha por celula do chao (pelo centro de cada triangulo), pra o que esta fora da tela nao ser desenhado
export function splitByCell(g, cell) {
  const s = g.index ? g.toNonIndexed() : g, P = s.attributes.position, n = P.count / 3, cells = new Map();
  for (let i = 0; i < n; i++) { const a = i * 3, key = Math.floor((P.getX(a) + P.getX(a + 1) + P.getX(a + 2)) / 3 / cell) + '|' + Math.floor((P.getZ(a) + P.getZ(a + 1) + P.getZ(a + 2)) / 3 / cell); let l = cells.get(key); if (!l) cells.set(key, l = []); l.push(i); }
  const out = new Map();
  for (const [key, list] of cells) {
    const c = new THREE.BufferGeometry();
    for (const [name, A] of Object.entries(s.attributes)) { const k = A.itemSize, src = A.array, dst = new src.constructor(list.length * 3 * k); list.forEach((t, j) => dst.set(src.subarray(t * 3 * k, (t + 1) * 3 * k), j * 3 * k)); c.setAttribute(name, new THREE.BufferAttribute(dst, k, A.normalized)); }
    out.set(key, c);
  }
  return out;
}
// malha do mapa ja cortada: cada pedaco com o seu pedaco de contorno (o casco e calculado inteiro antes de cortar: sem fresta entre celulas)
export function outlineCells(meshes, whole, th, cell) {
  const hull = splitByCell(smoothGeo(whole), cell);
  for (const [key, m] of meshes) { const o = new THREE.Mesh(hull.get(key), getOutlineMat(th)); o.raycast = () => {}; o.renderOrder = m.renderOrder; o.userData.keep = true; o.userData.cellHull = true; m.add(o); }
}

export function freeGeos(root) {
  root?.traverse(o => { if (o.geometry && !sharedSet.has(o.geometry) && !o.geometry.userData?.charShared) o.geometry.dispose(); });
}
// 15/11 (FPS caindo partida apos partida: geometria acumulando na placa): tira a peca do pai E libera o que e so dela
export function dropObj(o) { if (!o) return; o.parent?.remove(o); freeGeos(o); }

export function ink(geo, color, th = 0.04, opts) {
  const m = new THREE.Mesh(geo, toon(color, opts));
  if (th > 0) outline(m, th);
  return m;
}

// Texto em sprite (canvas), usado no POW!, nomes e letras de zona
const texCache = new Map();
export function wordTexture(word, { size = 256, burst = true, fill = '#faf8f2', stroke = '#141210', font = 'Bowlby One' } = {}) {
  const key = word + size + burst + fill + font;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  if (burst) {
    g.beginPath();
    const n = 14;
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = (i % 2 ? 0.3 : 0.48) * size * (0.92 + Math.random() * 0.1);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = fill; g.fill();
    g.lineWidth = size * 0.03; g.strokeStyle = stroke; g.stroke();
  }
  let fs = size * 0.36;
  g.font = `${fs}px "${font}"`;
  while (g.measureText(word).width > size * 0.82 && fs > 8) { fs -= 4; g.font = `${fs}px "${font}"`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = fs * 0.22; g.strokeStyle = stroke; g.strokeText(word, cx, cy + fs * 0.05);
  g.fillStyle = burst ? '#141210' : fill; g.fillText(word, cx, cy + fs * 0.05);
  if (burst) { g.lineWidth = fs * 0.06; g.strokeStyle = fill; g.strokeText(word, cx, cy + fs * 0.05); g.fillStyle = '#141210'; g.fillText(word, cx, cy + fs * 0.05); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function hatchTexture(base = '#d9d4c8', line = '#8a847a', { size = 256, density = 18, cross = false, bricks = false, planks = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  g.strokeStyle = line; g.lineCap = 'round';
  if (bricks) {
    g.lineWidth = 3;
    const bh = size / 8;
    for (let y = 0; y < 8; y++) {
      g.beginPath(); g.moveTo(0, y * bh); g.lineTo(size, y * bh + (Math.random() - 0.5) * 3); g.stroke();
      const off = (y % 2) * size / 8;
      for (let x = 0; x < 5; x++) { const xx = off + x * size / 4; g.beginPath(); g.moveTo(xx, y * bh); g.lineTo(xx + 1, y * bh + bh); g.stroke(); }
    }
  } else if (planks) {
    g.lineWidth = 4;
    for (let x = 0; x <= 4; x++) { g.beginPath(); g.moveTo(x * size / 4, 0); g.lineTo(x * size / 4 + 2, size); g.stroke(); }
    g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * size, y = Math.random() * size;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y + 18, x + 2, y + 40); g.stroke();
    }
  } else {
    g.lineWidth = 2;
    for (let i = 0; i < density; i++) {
      const x = Math.random() * size, y = Math.random() * size, l = 10 + Math.random() * 18;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * 0.35); g.stroke();
      if (cross) { g.beginPath(); g.moveTo(x + 4, y + l * 0.4); g.lineTo(x + l * 0.6, y - l * 0.2); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Fachada sem rosto: janelas com caixilho e veneziana, porta com toldo, tijolos
export function facadeTexture(seed = 1, { w = 512, h = 512 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dfd3'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,85,78,.35)'; g.lineWidth = 3;
  for (let y = 0; y < h; y += 36) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.lineJoin = 'round';
  const cols = 2 + (seed % 2), rows = 2;
  const ww = w / (cols * 2.2), wh = h * 0.17;
  for (let r = 0; r < rows; r++) for (let i = 0; i < cols; i++) {
    const x = w * (i + 0.5) / cols - ww / 2, y = h * (0.14 + r * 0.27);
    if (r === 1 && i === Math.floor(cols / 2) && cols % 2) continue; // espaco da porta
    g.fillStyle = '#3a3632'; g.fillRect(x, y, ww, wh);
    g.lineWidth = 9; g.strokeStyle = '#141210'; g.strokeRect(x, y, ww, wh);
    g.lineWidth = 6; g.strokeStyle = '#faf8f2';
    g.beginPath(); g.moveTo(x + ww / 2, y + 5); g.lineTo(x + ww / 2, y + wh - 5); g.moveTo(x + 5, y + wh / 2); g.lineTo(x + ww - 5, y + wh / 2); g.stroke();
    g.fillStyle = '#6e6a63'; g.fillRect(x - 8, y + wh, ww + 16, 10); // peitoril
  }
  // porta com toldo listrado
  const dw = w * 0.2, dh = h * 0.3, dx = w / 2 - dw / 2, dy = h - dh;
  g.fillStyle = '#3a3632'; g.fillRect(dx, dy, dw, dh);
  g.lineWidth = 9; g.strokeStyle = '#141210'; g.strokeRect(dx, dy, dw, dh + 10);
  g.fillStyle = '#faf8f2'; g.beginPath(); g.arc(dx + dw * 0.8, dy + dh * 0.55, 7, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#faf8f2' : '#6e6a63'; g.fillRect(dx - 20 + i * (dw + 40) / 6, dy - 34, (dw + 40) / 6, 26); }
  g.lineWidth = 6; g.strokeRect(dx - 20, dy - 34, dw + 40, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function tankTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e4dfd3'; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#8f897e'; g.lineWidth = 4;
  for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = '#3a3632';
  for (const y of [60, 452]) { g.fillRect(0, y - 14, 1024, 28); for (let x = 16; x < 1024; x += 32) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fillStyle = '#faf8f2'; g.fill(); g.fillStyle = '#3a3632'; } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 19/11 (desempenho): objeto montado de varias pecas `ink()` (cada uma 2 chamadas de desenho: peca + contorno) vira UMA malha com
// cor por vertice + UM contorno = 2 chamadas. Montado uma vez por nome. O contorno so pega as pecas que ja tinham contorno
const KIT = new Map();
let kitMat = null;
export function mergedKit(name, make) {
  let K = KIT.get(name);
  if (!K) {
    const src = make(); src.updateMatrixWorld(true);
    const all = [], hull = []; let th = 0;
    src.traverse(o => {
      if (!o.isMesh || o.parent?.isMesh) return; // contorno antigo (filho da peca) fica de fora
      let g = o.geometry.clone().applyMatrix4(o.matrixWorld); g = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
      const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); all.push(g);
      const ol = o.children.find(x => x.isMesh); if (ol) { hull.push(g); th = Math.max(th, ol.material.uniforms?.th?.value || 0.04); }
    });
    K = { geo: mergeKitGeos(all), hull: hull.length ? mergeKitGeos(hull.map(g => { const h = g.clone(); h.deleteAttribute('color'); return h; })) : null, th: th || 0.04 };
    sharedSet.add(K.geo); if (K.hull) sharedSet.add(K.hull); // compartilhada: quem limpa a cena nao libera
    KIT.set(name, K);
  }
  const m = new THREE.Mesh(K.geo, kitMat ||= toon(0xffffff, { vertexColors: true, unique: true }));
  if (K.hull) outlineHull(m, K.hull, K.th);
  const g = new THREE.Group(); g.add(m); return g;
}
function outlineHull(mesh, hullGeo, th) {
  const o = new THREE.Mesh(smoothGeo(hullGeo), getOutlineMat(th));
  OUTLS.push(o); o.raycast = () => {}; o.renderOrder = mesh.renderOrder; mesh.add(o);
}
