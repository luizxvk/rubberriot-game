// Miras refeitas (07/11, pedido dele: "mais finas, sem nada quadrado e cagado, bem modeladas"). Tudo gerado por codigo:
// tubo torneado (red dot), luneta com sino na ocular e na objetiva, janela holografica arredondada, reflex aberta e o aro
// no poste. Ocupam a mesma caixa (comprimento e lugar) da mira antiga, mais finas; sem base/trilho (assentam no corpo).
// Devolve { geo, lens } no mesmo formato do stripLens (c = centro da lente de tras, f = frente, r = raio, z = z de tras).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// tipo de cada mira (ids do jogo). tube = red dot de tubo; scope = luneta; holo = janela holografica; reflex = aberta; post = aro
export const SIGHT_KIND = {
  subfusil_scope_1: 'prism', subfusil_scope_2: 'holo', subfusil_scope_5: 'reflexLow', subfusil_scope_6: 'tube', subfusil_scope_7: 'combat',
  subfusil_scope_8: 'reflex', subfusil_scope_9: 'reflexWide', subfusil_scope_10: 'scopeShort', fusil_scope_1: 'tube', fusil_scope_2: 'reflex',
  fusil_scope_4: 'holoLong', fusil_scope_5: 'post', fusil_scope_6: 'scope', fusil_scope_7: 'holoSquare', pistol_scope_5: 'scopePistol',
  sniper_scope_1: 'scopeBig', sniper_scope_2: 'scopeBig',
};

// 07/11 (pedido dele, APROVADO): acessórios CÔMICOS feitos no Blender (tools/blender/comic_attach.py + comic_pieces.py),
// um tema de desenho dos anos 30 por peça. public/models/src/comic/attach.glb: um vazio 'c_<id>' por peça (bocal = 'c_m_<id>'),
// já nos eixos do jogo (frente = -z, topo = +y) e na unidade do jogo (o encaixe NÃO estica). Material 'accent' = destaque,
// 'body' = escuro, 'glass' = só a medida da lente (sai; a lente do jogo entra no lugar). Retícula de fábrica: nenhuma.
// (As miras realistas do Sketchfab de antes foram abandonadas: os .glb ficam em models/src/sights, sem uso.)
const COMIC = {}; // 'c_<id>' -> { parts: [{ geo, acc }], glass: [geo] }
export const hasComic = (name) => !!COMIC['c_' + name];
export function loadComic(loader, url) {
  return loader.loadAsync(url).then(g => {
    g.scene.updateMatrixWorld(true);
    g.scene.traverse(root => {
      if (root.isMesh || !/^c_/.test(root.name) || COMIC[root.name]) return;
      const parts = [], glass = [];
      root.traverse(o => {
        if (!o.isMesh) return;
        const mat = (Array.isArray(o.material) ? o.material[0] : o.material)?.name || '';
        let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed();
        for (const k of Object.keys(ge.attributes)) if (k !== 'position') ge.deleteAttribute(k);
        if (/glass/i.test(mat) && !/^c_(laser|light)/.test(root.name)) glass.push(ge); // laser/lanterna: o bulbo de vidro fica (e a peca)
        else parts.push({ geo: ge, acc: /accent|glass/i.test(mat) });
      });
      COMIC[root.name] = { parts, glass };
    });
  }).catch(e => console.warn('acessorios comicos nao carregaram', e));
}
// geometria cômica com a cor da paleta por material (escuro / destaque), sem nenhum deslocamento
export function comicGeo(name, uvDark, uvLight) {
  const raw = COMIC['c_' + name]; if (!raw || !raw.parts.length) return null;
  const geos = raw.parts.map(({ geo, acc }) => { const g = geo.clone(); g.computeVertexNormals(); const uv = acc ? uvLight : uvDark, c = g.attributes.position.count, a = new Float32Array(c * 2); for (let i = 0; i < c; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; } g.setAttribute('uv', new THREE.BufferAttribute(a, 2)); return g; });
  const geo = mergeGeometries(geos); geo.computeBoundingBox(); return geo;
}
// mira cômica no lugar da antiga: centro x/z iguais, pé no fundo dela, tamanho do próprio modelo (já na escala do jogo)
function comicSightGeo(name, box, uv, uvL) {
  const raw = COMIC['c_' + name], geo0 = comicGeo(name, uv, uvL || uv); if (!geo0 || !raw.glass.length) return null;
  const all = geo0.boundingBox, cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const T = new THREE.Matrix4().makeTranslation(cx - (all.min.x + all.max.x) / 2, box.min.y - all.min.y, cz - (all.min.z + all.max.z) / 2);
  const geo = geo0.applyMatrix4(T); geo.computeBoundingBox();
  // lente pelo vidro do modelo: o vidro de tras (olho, +z) e o da frente; raio = o menor meio-lado do vidro de tras
  const pts = []; for (const g of raw.glass) { const q = g.clone().applyMatrix4(T).attributes.position; for (let i = 0; i < q.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(q, i)); }
  const gb = new THREE.Box3().setFromPoints(pts), gz = (gb.min.z + gb.max.z) / 2, deep = gb.max.z - gb.min.z > (gb.max.y - gb.min.y) * 1.5; // luneta: vidro nas duas pontas
  const end = (rear) => { const sel = deep ? pts.filter(p => (rear ? p.z > gz : p.z < gz)) : pts, b = new THREE.Box3().setFromPoints(sel), c = b.getCenter(new THREE.Vector3()); c.z = rear ? b.max.z : b.min.z; return { c, r: Math.min(b.max.x - b.min.x, b.max.y - b.min.y) / 2 }; };
  const back = end(true), front = end(false);
  return { geo, lens: { c: back.c, f: deep ? front.c : null, r: back.r * 0.95, z: back.c.z }, comic: true };
}

const lathe = (pts, seg = 28) => { const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg); g.rotateX(Math.PI / 2); return g; }; // eixo da lathe (y) vira o eixo do cano (z); z + = tras
const cyl = (r, h, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg);
// tubo oco com paredes: perfil de fora (da frente pra tras) + de dentro (de tras pra frente). pts: [raio de fora, z]
function hollow(outer, wall) {
  const inn = outer.slice().reverse().map(([r, z]) => [Math.max(0.0005, r - wall), z]);
  return lathe([...outer, ...inn, outer[0]]);
}
// moldura arredondada (contorno com furo) extrudada no z
function frame(w, h, t, depth, rad, bevel) {
  const rr = (s, x, y, W, H, R) => { s.moveTo(x + R, y); s.lineTo(x + W - R, y); s.quadraticCurveTo(x + W, y, x + W, y + R); s.lineTo(x + W, y + H - R); s.quadraticCurveTo(x + W, y + H, x + W - R, y + H); s.lineTo(x + R, y + H); s.quadraticCurveTo(x, y + H, x, y + H - R); s.lineTo(x, y + R); s.quadraticCurveTo(x, y, x + R, y); };
  const sh = new THREE.Shape(); rr(sh, -w / 2, -h / 2, w, h, rad);
  const hole = new THREE.Path(); rr(hole, -w / 2 + t, -h / 2 + t, w - 2 * t, h - 2 * t, Math.max(0.001, rad - t * 0.6)); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -depth / 2); return g;
}
const rbox = (w, h, d, rad) => { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2, R = Math.min(rad, w / 2, h / 2); s.moveTo(x + R, y); s.lineTo(x + w - R, y); s.quadraticCurveTo(x + w, y, x + w, y + R); s.lineTo(x + w, y + h - R); s.quadraticCurveTo(x + w, y + h, x + w - R, y + h); s.lineTo(x + R, y + h); s.quadraticCurveTo(x, y + h, x, y + h - R); s.lineTo(x, y + R); s.quadraticCurveTo(x, y, x + R, y); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: R * 0.4, bevelSize: R * 0.4, bevelSegments: 2, curveSegments: 5 }); g.translate(0, 0, -d / 2); return g; };
const at = (g, x, y, z) => g.translate(x, y, z);

// box = caixa da mira antiga (depois de tirar a base). Monta no lugar dela: centro x/z iguais, pe no fundo dela
export function buildSightGeo(kind, box, uv) {
  const W0 = box.max.x - box.min.x, L = Math.min(box.max.z - box.min.z, kind.startsWith('reflex') ? W0 * 2.4 : Infinity), // reflex: a peca antiga as vezes vinha com um trilho comprido junto
  _ = 0, H = box.max.y - box.min.y, W = box.max.x - box.min.x;
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2, y0 = box.min.y, z0 = -L / 2, z1 = L / 2; // z1 = tras (olho)
  const parts = []; let lens;
  const turrets = (R, yc, zc) => { parts.push(at(cyl(R * 0.3, R * 0.55), 0, yc + R + R * 0.22, zc), at(cyl(R * 0.3, R * 0.55).rotateZ(Math.PI / 2), R + R * 0.22, yc, zc)); };
  const rings = (R, yc, zs) => { for (const z of zs) parts.push(at(lathe([[R * 1.12, z - L * 0.03], [R * 1.12, z + L * 0.03]], 20), 0, yc, 0), at(rbox(R * 0.55, yc - R, L * 0.05, R * 0.15), 0, (yc - R) / 2, z)); }; // anel fino + pe fino ate o corpo
  if (kind === 'tube' || kind === 'prism' || kind === 'combat') {
    const R = Math.min(H * 0.4, W * 0.5, kind === 'combat' ? L * 0.105 : L * 0.2), yc = R * 1.25, len = L * (kind === 'combat' ? 0.95 : 0.85); // T-2: diametro ~0,4 do comprimento; ACOG: corpo ~0,21
    const a = -len / 2, b = len / 2, hood = kind === 'tube' ? 1.1 : 1.0;
    const outer = kind === 'combat'
      ? [[R * 1.25, a], [R * 1.25, a + len * 0.22], [R * 0.95, a + len * 0.34], [R * 0.95, b - len * 0.2], [R * 1.1, b - len * 0.12], [R * 1.1, b]]
      : [[R * hood, a], [R * hood, a + len * 0.12], [R, a + len * 0.18], [R, b - len * 0.1], [R * 1.06, b - len * 0.05], [R * 1.06, b]];
    parts.push(at(hollow(outer, R * 0.16), 0, yc, 0));
    turrets(R, yc, (a + b) / 2 + len * 0.05);
    parts.push(at(rbox(R * 1.1, yc - R * 0.8, len * 0.5, R * 0.2), 0, (yc - R * 0.8) / 2, 0)); // sela fina: o tubo assenta nela
    const lr = (kind === 'combat' ? R * 1.1 : R * 1.06) - R * 0.16;
    lens = { c: new THREE.Vector3(0, yc, b), f: new THREE.Vector3(0, yc, a), r: lr * 0.95, z: b };
  } else if (kind.startsWith('scope')) {
    const big = kind === 'scopeBig', pistol = kind === 'scopePistol', short = kind === 'scopeShort';
    const pu = pistol || short; // PU de epoca: tubo reto, sino quase nenhum
    const R = Math.min(H * 0.24, W * 0.3, L * (pu ? 0.07 : 0.047)), obj = R * (pu ? 1.15 : big ? 1.95 : 1.6), eye = R * (pu ? 1.25 : 1.38), yc = obj + R * 0.35;
    const outer = [[obj, z0], [obj, z0 + L * (pu ? 0.08 : 0.17)], [R, z0 + L * (pu ? 0.13 : 0.3)], [R, z1 - L * (pu ? 0.16 : 0.27)], [eye, z1 - L * (pu ? 0.1 : 0.17)], [eye, z1 - L * 0.02], [eye * 0.96, z1]]; // Mark 4: sino da frente 0,3 L, ocular 0,26 L
    parts.push(at(hollow(outer, R * 0.18), 0, yc, 0));
    turrets(R, yc, z0 + L * 0.48);
    rings(R, yc, [z0 + L * 0.33, z1 - L * 0.3]);
    lens = { c: new THREE.Vector3(0, yc, z1), f: new THREE.Vector3(0, yc, z0), r: (eye * 0.96 - R * 0.18) * 0.95, z: z1 };
  } else if (kind.startsWith('holo')) {
    const w = Math.min(W * 0.9, L * 0.6), h = kind === 'holoSquare' ? w : w * 0.78, t = w * 0.12, d = L * (kind === 'holoLong' ? 0.5 : 0.4), yc = Math.min(H * 0.3, L * 0.2) + h / 2; // EXPS3: largura 0,6 do comprimento; janela 30x23 mm; aro fino
    parts.push(at(frame(w, h, t, d, w * 0.22, t * 0.25), 0, yc, z1 - d / 2 - L * 0.05));
    const bh = yc - h / 2; parts.push(at(rbox(w * 0.86, bh, L * 0.8, bh * 0.25), 0, bh / 2, 0)); // corpo baixo e fino (bateria/controles)
    parts.push(at(cyl(bh * 0.2, w * 0.5).rotateZ(Math.PI / 2), 0, bh * 0.6, z0 + L * 0.15)); // botao
    lens = { c: new THREE.Vector3(0, yc, z1 - L * 0.05), f: new THREE.Vector3(0, yc, z1 - d - L * 0.05), r: (Math.min(w, h) / 2 - t) * 0.95, z: z1 - L * 0.05 };
  } else if (kind.startsWith('reflex')) {
    const wide = kind === 'reflexWide', low = kind === 'reflexLow', w = Math.min(W * 0.95, L * (wide ? 0.75 : 0.6)), h = w * (wide ? 0.62 : low ? 0.6 : 0.73), t = w * 0.1, d = L * 0.16; // RMR: 28 x 25 em 46 mm, janela 22 x 16
    const plate = L * 0.07, yc = plate + h / 2;
    parts.push(at(rbox(w * 0.7, plate, L * 0.92, plate * 0.45), 0, plate / 2, 0)); // chapa fina
    const fr = frame(w, h, t, d, w * 0.25, t * 0.3); fr.rotateX(-0.12); // janela levemente deitada pra tras
    parts.push(at(fr, 0, yc, z0 + L * 0.3));
    lens = { c: new THREE.Vector3(0, yc, z0 + L * 0.3 + d / 2), f: new THREE.Vector3(0, yc, z0 + L * 0.3 - d / 2), r: (Math.min(w, h) / 2 - t) * 0.92, z: z0 + L * 0.3 + d / 2 };
  } else { // post: aro redondo fino em cima de um poste
    const R = Math.min(W, H) * 0.32, yc = H - R * 1.15, th = R * 0.13;
    parts.push(at(new THREE.TorusGeometry(R, th, 10, 32), 0, yc, 0));
    parts.push(at(cyl(th * 1.1, yc - R, 10), 0, (yc - R) / 2, 0), at(rbox(R * 0.9, H * 0.08, L * 0.6, H * 0.03), 0, H * 0.04, 0));
    parts.push(at(new THREE.SphereGeometry(th * 0.9, 10, 8), 0, yc, 0)); // ponto do centro do aro (a reticula mora ali)
    lens = { c: new THREE.Vector3(0, yc, th), f: null, r: R * 0.55, z: th };
  }
  const geos = parts.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); const c = n.attributes.position.count, a = new Float32Array(c * 2); for (let i = 0; i < c; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; } n.setAttribute('uv', new THREE.BufferAttribute(a, 2)); return n; });
  const geo = mergeGeometries(geos); geo.translate(cx, y0, cz); geo.computeBoundingBox();
  for (const v of [lens.c, lens.f]) if (v) v.add(new THREE.Vector3(cx, y0, cz));
  lens.z += cz;
  return { geo, lens };
}
// mira cômica quando existe; senao a feita por codigo
export function sightGeoFor(name, kind, box, uv, uvL) { return comicSightGeo(name, box, uv, uvL) || buildSightGeo(kind, box, uv); }
