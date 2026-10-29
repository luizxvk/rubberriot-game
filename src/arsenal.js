// Arsenal modular (gunsmith estilo COD) em cima dos .glb low poly do usuario.
// low_poly_guns.glb: corpo + carregador + mira + empunhadura separados por arma.
// low-poly_weapon_asset_pack.glb: armas inteiras (usamos a Minigun).
// Pintura: shader troca a parte VERDE pela cor principal e os cinzas claros/azulados pelo destaque.
import * as THREE from 'three';
import { pushSoon } from './rovex.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon, outline } from './toon.js';
import { makeGun } from './guns.js';
import { t, wName } from './i18n.js';
import { CAMO_GLSL, camoTime, camoById } from './camos.js';
import { attachCamoFx } from './camofx.js';
import { bodyTrait, bpMods, BLUEPRINTS } from '../shared/weapons.js';
import { bpUnlocked } from './progress.js';

const S = 0.32; // unidade do glb -> metros
const parts = {};  // nome -> { geo, box }
let ready = null;
let gunTex = null;

// Armas brancas (melee.glb): ordem dos meshes do arquivo; comprimento real em metros por peca
export const MELEE = Array.from({ length: 15 }, (_, i) => 'melee_' + i);
const MELEE_LEN = [0.34, 0.5, 0.3, 0.72, 0.52, 0.36, 0.52, 0.56, 0.3, 0.55, 0.28, 0.5, 0.6, 0.52, 0.5];
export const CATEGORY = {
  pistol: { bodies: range('pistol_', 1, 6), scopes: ['pistol_scope_5', 'subfusil_scope_2', 'subfusil_scope_6', 'subfusil_scope_9'], chargers: range('pistol_charger_', 1, 6), handles: [] },
  smg: { bodies: range('subfusil_', 1, 10), scopes: ['subfusil_scope_1', 'subfusil_scope_2', 'subfusil_scope_5', 'subfusil_scope_6', 'subfusil_scope_7', 'subfusil_scope_8', 'subfusil_scope_9', 'subfusil_scope_10', 'fusil_scope_1', 'fusil_scope_7'], chargers: [...range('subfusil_charguer_', 1, 10)], handles: ['subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'fusil_handle_2'] },
  rifle: { bodies: range('fusil_', 1, 7), scopes: ['fusil_scope_1', 'fusil_scope_2', 'fusil_scope_4', 'fusil_scope_5', 'fusil_scope_6', 'fusil_scope_7', 'subfusil_scope_5', 'subfusil_scope_7', 'sniper_scope_1'], chargers: ['fusil_charger_1', ...range('fusil_charguer_', 2, 7)], handles: ['fusil_handle_2', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6'] },
  shotgun: { bodies: ['shotgun_1', 'shotgun_2'], scopes: ['subfusil_scope_2', 'subfusil_scope_6', 'fusil_scope_7', 'subfusil_scope_9'], chargers: ['shotgun_charguer_1'], handles: ['subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6'] },
  melee: { bodies: MELEE, scopes: [], chargers: [], handles: [] },
  sniper: { bodies: ['sniper_0', 'sniper_1', 'sniper_2'], scopes: ['sniper_scope_0', 'sniper_scope_1', 'sniper_scope_2', 'fusil_scope_2', 'fusil_scope_6'], chargers: ['sniper_charger_1', 'sniper_charger_2'], handles: [] },
};
// So uma peca (mira, pente, empunhadura), pintada como na arma: foto do banner de desbloqueio
export function buildPartPreview(id, lo = {}) {
  const p = parts[id];
  if (!p || !gunTex) return null;
  const holder = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(S); holder.add(inner);
  const m = new THREE.Mesh(p.geo, paintMaterial(lo.paint, lo.accent, null, true));
  outline(m, 0.0055);
  m.position.copy(p.box.getCenter(new THREE.Vector3())).negate();
  inner.add(m);
  // a peca deitada de lado, como a arma no banner (a camera olha de +x)
  holder.userData = {};
  return holder;
}

// Kit do sobrevivente no Infectado: o corpo da classe do jogador com ponto vermelho, laser,
// o maior pente que encaixa e empunhadura (quando a categoria tem)
export function infectLoadout(cat, base) {
  const C = CATEGORY[cat];
  if (!C) return base;
  const lo = { ...defaultLoadout(cat), ...(base || {}) };
  if (!parts[lo.body]) lo.body = C.bodies[0];
  lo.scope = C.scopes.find(id => parts[id] && parts[id].box.max.z - parts[id].box.min.z < 0.6) || null;
  const mags = chargerOptions(lo.body, cat);
  lo.charger = mags.reduce((best, id) => (loadoutStats(cat, { ...lo, charger: id }).mag > loadoutStats(cat, { ...lo, charger: best }).mag ? id : best), mags[0] || null);
  lo.handle = C.handles[0] || null;
  lo.laser = 'laser_1';
  return lo;
}

// Mira laser (modulo lateral, feito no codigo): melhora o quadril, pesa um pouco na mira
export const LASERS = ['laser_1', 'laser_2'];
const LASER_DEF = {
  laser_1: { color: 0xff2a2a, size: [0.03, 0.028, 0.085], traits: { hip: 0.8, adsTime: 1.03 } },              // compacto vermelho
  laser_2: { color: 0x39ff5a, size: [0.04, 0.038, 0.12], traits: { hip: 0.7, adsTime: 1.07, move: 0.98 } },  // tatico verde
};
export const laserColor = (id) => LASER_DEF[id]?.color ?? 0xff2a2a;
function range(p, a, b) { const r = []; for (let i = a; i <= b; i++) r.push(p + i); return r; }

export const PART_LABEL = {
  body: 'Corpo', scope: 'Mira', charger: 'Carregador', handle: 'Empunhadura',
};

// nome de exibicao das pecas (cartoon, nada de marca)
export function partName(slot, id) {
  if (!id) return slot === 'scope' ? t('iron') : slot === 'handle' ? t('noGrip') : slot === 'laser' ? t('noLaser') : t('stdPart');
  const n = id.match(/(\d+)$/)?.[1] ?? '0';
  if (slot === 'body' && id.startsWith('melee_')) return t('ml_' + n);
  if (slot === 'body') return wName(catOf(id)) + ' ' + t('model') + ' ' + n;
  if (slot === 'scope') { const b = parts[id]?.box; const big = b && (b.max.z - b.min.z) >= 0.6; return (big ? t('scopeBig') : t('scopeDot')) + ' ' + n + (id.startsWith('sniper') ? ' ' + t('long') : ''); }
  if (slot === 'charger') return t('mag') + ' ' + n;
  if (slot === 'laser') return t(id === 'laser_2' ? 'laserTac' : 'laserDot');
  return t('grip') + ' ' + n;
}
function catOf(id) { return id.startsWith('melee') ? 'melee' : id.startsWith('subfusil') ? 'smg' : id.startsWith('fusil') ? 'rifle' : id.startsWith('pistol') ? 'pistol' : id.startsWith('shotgun') ? 'shotgun' : 'sniper'; }

export function defaultLoadout(cat) {
  const c = CATEGORY[cat];
  if (!c) return null;
  const body = c.bodies[0];
  if (cat === 'melee') return { body: 'melee_10', camo: null };
  return { body, scope: cat === 'sniper' ? nativePart(body, 'scope') : null, charger: nativePart(body, 'charger'), handle: null, paint: null, accent: null, camo: null };
}

// peca original de um corpo (fusil_4 -> fusil_charguer_4)
export function nativePart(body, slot) {
  const [, pre, n] = body.match(/^([a-z]+)_(\d+)$/) || [];
  if (!pre) return null;
  const names = slot === 'charger' ? [`${pre}_charger_${n}`, `${pre}_charguer_${n}`] : [`${pre}_${slot}_${n}`];
  for (const nm of names) if (parts[nm]) return nm;
  return null;
}
function ownerBody(part) {
  const m = part.match(/^([a-z]+)_[a-z]+_(\d+)$/);
  return m ? `${m[1]}_${m[2]}` : null;
}

export function loadArsenal() {
  if (ready) return ready;
  const loader = new GLTFLoader();
  ready = Promise.all([
    loader.loadAsync(import.meta.env.BASE_URL + 'models/src/low_poly_guns.glb').then(g => {
      g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const name = o.name.replace(/_texture_0$/, '') || o.parent.name;
        const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
        geo.computeBoundingBox();
        parts[name] = { geo, box: geo.boundingBox.clone() };
        if (!gunTex && o.material.map) {
          gunTex = o.material.map;
          gunTex.magFilter = THREE.NearestFilter;
          gunTex.minFilter = THREE.NearestFilter;
          gunTex.generateMipmaps = false;
        }
      });
      // lente das miras: faces verdes viradas pro eixo do cano viram buraco (vidro)
      const pal = paletteReader(gunTex);
      if (pal) for (const [name, p] of Object.entries(parts)) if (/scope/.test(name)) p.lens = stripLens(p.geo, pal);
    }).catch(e => console.warn('low_poly_guns.glb nao carregou', e)),
    loader.loadAsync(import.meta.env.BASE_URL + 'models/src/melee.glb').then(g => {
      // cada mesh do arquivo vira melee_i: cabo no -z, ponta/cabeca no +z (sem a rotacao do Sketchfab)
      let i = 0;
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone(); geo.computeBoundingBox();
        const map = o.material.map; if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; }
        parts['melee_' + i] = { geo, box: geo.boundingBox.clone(), map, melee: true };
        i++;
      });
    }).catch(e => console.warn('melee.glb nao carregou', e)),
    loader.loadAsync(import.meta.env.BASE_URL + 'models/src/low-poly_weapon_asset_pack.glb').then(g => {
      const mg = g.scene.getObjectByName('Minigun');
      if (!mg) return;
      g.scene.updateMatrixWorld(true);
      const geos = [];
      mg.traverse(o => { if (o.isMesh) geos.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), color: o.material.color.getHex(), front: /Front/.test(o.name) }); });
      parts.__minigun = geos;
    }).catch(e => console.warn('weapon pack nao carregou', e)),
  ]);
  return ready;
}

export function arsenalReady() { return !!parts.fusil_1; }
export const meleeReady = () => !!parts.melee_0;

function paletteReader(tex) {
  const img = tex && tex.image;
  if (!img) return null;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  // glTF: uv (0,0) = canto de cima da imagem (flipY desligado)
  return (u, v) => {
    const x = Math.min(c.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * c.width)));
    const y = Math.min(c.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * c.height)));
    const i = (y * c.width + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
}

function stripLens(geo, pal) {
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  if (!uv) return;
  const idx = geo.index ? geo.index.array : Array.from({ length: pos.count }, (_, i) => i);
  const keep = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  let removed = 0;
  const cen = new THREE.Vector3(); let area = 0;
  const rear = [];
  for (let i = 0; i < idx.length; i += 3) {
    const i0 = idx[i], i1 = idx[i + 1], i2 = idx[i + 2];
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const u = (uv.getX(i0) + uv.getX(i1) + uv.getX(i2)) / 3, v = (uv.getY(i0) + uv.getY(i1) + uv.getY(i2)) / 3;
    const [r, g, bl] = pal(u, v);
    const green = g > r + 40 && g > bl + 30;
    if (green && Math.abs(n.z) > 0.6) {
      removed++;
      const ar = b.clone().sub(a).cross(c.clone().sub(a)).length();
      cen.addScaledVector(a.clone().add(b).add(c).divideScalar(3), ar); area += ar;
      if (n.z > 0.6 || n.z < -0.6) rear.push(a.clone(), b.clone(), c.clone(), n.z);
      continue;
    }
    keep.push(i0, i1, i2);
  }
  if (removed) geo.setIndex(keep);
  if (area <= 0) return null;
  cen.divideScalar(area);
  // lente traseira = a de maior z (perto do olho); dianteira = a de menor z.
  // O eixo optico passa pelo centro das duas (a media de tudo entortava a luneta).
  let zMax = -Infinity, zMin = Infinity;
  for (let i = 0; i < rear.length; i += 4) for (let k = 0; k < 3; k++) { zMax = Math.max(zMax, rear[i + k].z); zMin = Math.min(zMin, rear[i + k].z); }
  const ring = (zEnd) => {
    const c = new THREE.Vector3(); let w = 0;
    for (let i = 0; i < rear.length; i += 4) {
      const A = rear[i], B = rear[i + 1], C = rear[i + 2];
      if (Math.abs((A.z + B.z + C.z) / 3 - zEnd) > 0.06) continue;
      const ar = B.clone().sub(A).cross(C.clone().sub(A)).length();
      c.addScaledVector(A.clone().add(B).add(C).divideScalar(3), ar); w += ar;
    }
    return w > 0 ? c.divideScalar(w) : cen.clone();
  };
  const cr = ring(zMax), cf = zMax - zMin > 0.1 ? ring(zMin) : cr.clone();
  let r = 0;
  for (let i = 0; i < rear.length; i += 4) for (let k = 0; k < 3; k++) {
    const v = rear[i + k];
    if (zMax - v.z < 0.06) r = Math.max(r, Math.hypot(v.x - cr.x, v.y - cr.y));
  }
  return { c: cr, f: cf, r: r || 0.08, z: zMax };
}

// a mira tem tubo fechado ate a traseira? (anel de geometria em volta do eixo nos 4 lados)
const tubes = {};
function rearTube(id) {
  if (id in tubes) return tubes[id];
  const p = parts[id], L = p.lens, pos = p.geo.attributes.position, zEnd = p.box.max.z;
  const quad = [0, 0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    if (zEnd - pos.getZ(i) > 0.04) continue;
    const dx = pos.getX(i) - L.c.x, dy = pos.getY(i) - L.c.y, d = Math.hypot(dx, dy);
    if (d < L.r * 0.7 || d > L.r * 1.8) continue;
    quad[Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 1) : (dy > 0 ? 2 : 3)] = 1;
  }
  return (tubes[id] = quad.every(Boolean));
}

// material da pintura (uniforms por arma)
// part = peca encaixada (mira, pente, empunhadura): fica inteira na cor de destaque e nunca
// recebe camuflagem. A camuflagem e' so do corpo, e mesmo nele o verde fica com a pintura.
function paintMaterial(paint, accent, camo, part = false) {
  const m = toon(0xffffff, { map: gunTex, unique: true });
  m.userData.u = {
    uPart: { value: part ? 1 : 0 },
    uPaint: { value: new THREE.Color(paint || '#ffffff') }, uPaintOn: { value: paint ? 1 : 0 },
    uAccent: { value: new THREE.Color(accent || '#ffffff') }, uAccentOn: { value: accent ? 1 : 0 },
    uCamo: { value: camoById(camo).code }, uTime: camoTime, uReact: { value: 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPaint; uniform float uPaintOn; uniform vec3 uAccent; uniform float uAccentOn; uniform float uPart;\n' + CAMO_GLSL + '\nvec3 gCamoGlow = vec3(0.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gCamoGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 tc = diffuseColor.rgb;
          float lum = dot(tc, vec3(0.299, 0.587, 0.114));
          float green = smoothstep(0.08, 0.2, tc.g - max(tc.r, tc.b));
          float bluish = smoothstep(1.25, 1.6, tc.b / (tc.r + 0.012)) * (1.0 - green);
          float light = smoothstep(0.15, 0.2, lum) * (1.0 - green);
          float accent = uPart > 0.5 ? 1.0 - green : max(bluish, light);
          // ⚠ a cor escolhida nunca passa de 1x: as partes claras (branco da paleta) iam a 1,2x e
          // a luz da cena estourava a cor ate virar branco. Era isso que fazia o destaque
          // "pegar so numa parte" (so as pecas escuras, abaixo de 1x, mostravam a cor).
          diffuseColor.rgb = mix(tc, uPaint * clamp(0.45 + lum * 0.75, 0.45, 1.0), green * uPaintOn);
          diffuseColor.rgb = mix(diffuseColor.rgb, uAccent * clamp(0.55 + lum * 0.45, 0.55, 1.0), accent * uAccentOn);
          // camuflagem so nas partes escuras do corpo: o verde fica com a pintura (ou o verde
          // original) e o destaque com a cor de destaque. Antes ela cobria o verde tambem e a
          // pintura sumia: das duas cores escolhidas, so o destaque aparecia.
          if (uCamo > 0.5 && uPart < 0.5) {
            vec3 cg;
            vec3 cc = camoColor(int(uCamo + 0.5), vCamoPos, uTime, lum, cg);
            float keep = max(accent, green);
            diffuseColor.rgb = mix(cc, diffuseColor.rgb, keep);
            gCamoGlow = cg * (1.0 - keep);
          }
        }`);
  };
  m.customProgramCacheKey = () => 'paint';
  return m;
}

export const RETICLES = ['dot', 'cross', 'circle', 'chevron', 'tee', 'duplex', 'mildot'];
export const RET_COLORS = { red: '#ff3b30', green: '#3cff6b', amber: '#ffb21a', white: '#ffffff', black: '#111111' };
export const scopeTarget = { texture: null };

function lensMaterial(big, ret, color) {
  const style = Math.max(0, RETICLES.indexOf(ret));
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      tScope: { value: scopeTarget.texture }, uBig: { value: big ? 1 : 0 }, uOn: { value: 0 },
      uStyle: { value: style }, uCol: { value: new THREE.Color(RET_COLORS[color] || RET_COLORS.red) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tScope; uniform float uBig, uOn, uStyle; uniform vec3 uCol;
      varying vec2 vUv;
      float ln(float d, float w) { return smoothstep(w, w * 0.4, abs(d)); }
      float ring(vec2 p, float r, float w) { return smoothstep(w, w * 0.4, abs(length(p) - r)); }
      float dotp(vec2 p, vec2 c, float r) { return smoothstep(r, r * 0.5, length(p - c)); }
      // reticulas de red dot; wk alarga os tracos (wk > 1 = halo do bloom)
      float retGlow(int s, vec2 q, float wk) {
        if (s == 0) return dotp(q, vec2(0.0), 0.06 * wk);
        if (s == 1) return max(ln(q.x, 0.02 * wk) * step(abs(q.y), 0.32), ln(q.y, 0.02 * wk) * step(abs(q.x), 0.32)) * step(0.06, length(q));
        if (s == 2) return max(ring(q, 0.42, 0.025 * wk), dotp(q, vec2(0.0), 0.05 * wk));
        if (s == 3) return ln(q.y + abs(q.x) * 0.9, 0.025 * wk) * step(abs(q.x), 0.25) * step(-0.25, q.y);
        if (s == 4) return max(ln(q.y, 0.02 * wk) * step(abs(q.x), 0.3), ln(q.x, 0.02 * wk) * step(q.y, 0.0) * step(-0.35, q.y));
        return 0.0;
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        int s = int(uStyle + 0.5);
        float k = uBig > 0.5 ? 1.0 : 1.45; // red dot: reticula pequena no meio do vidro (estilo BO2)
        vec2 q = p * k;
        float ink = 0.0, glow = 0.0;
        float halo = 0.0;
        if (s <= 4) { glow = retGlow(s, q, 1.0); halo = retGlow(s, q, 4.0) * 0.2; }
        else if (s == 5) {
          ink = max(ln(p.x, 0.008), ln(p.y, 0.008));
          ink = max(ink, max(ln(p.x, 0.04) * step(0.5, abs(p.y)), ln(p.y, 0.04) * step(0.5, abs(p.x))));
          glow = dotp(p, vec2(0.0), 0.022);
        } else {
          ink = max(ln(p.x, 0.006), ln(p.y, 0.006));
          for (int i = 1; i <= 4; i++) {
            float m = float(i) * 0.18;
            ink = max(ink, max(max(dotp(p, vec2(m, 0.0), 0.022), dotp(p, vec2(-m, 0.0), 0.022)), max(dotp(p, vec2(0.0, m), 0.022), dotp(p, vec2(0.0, -m), 0.022))));
          }
          glow = dotp(p, vec2(0.0), 0.016);
        }
        vec3 c; float a;
        if (uBig > 0.5) {
          // luneta: imagem ampliada com vinheta da lente; vidro escuro quando nao esta mirando
          vec3 img = texture2D(tScope, vUv).rgb * smoothstep(1.0, 0.78, r);
          vec3 glass = mix(vec3(0.05, 0.07, 0.09), vec3(0.35, 0.45, 0.5), smoothstep(0.6, 0.0, length(p - vec2(-0.35, 0.4))));
          c = mix(glass, img, uOn);
          c = mix(c, vec3(0.02), ink * uOn);
          c = mix(c, mix(uCol, vec3(1.0), glow * 0.35), max(glow, halo) * uOn);
          a = 1.0;
        } else {
          // laser projetado: miolo quase branco, halo fraquinho da mesma cor em volta
          c = mix(uCol, vec3(1.0), glow * glow * 0.4); a = max(max(glow, ink), halo);
          c = mix(c, vec3(0.02), ink * (1.0 - glow));
          a = max(a, 0.06); // leve reflexo do vidro
          if (a < 0.07) c = vec3(0.7, 0.8, 0.9);
        }
        gl_FragColor = vec4(c, a);
      }`,
  });
}

function anchor(slot, box) {
  // ponto de encaixe da propria peca
  const c = box.getCenter(new THREE.Vector3());
  if (slot === 'scope') return new THREE.Vector3(c.x, box.min.y, c.z);
  return new THREE.Vector3(c.x, box.max.y, c.z); // carregador e punho encaixam pelo topo
}
// perfil do corpo: pra cada fatia em Z, o ponto mais baixo e o mais alto (pelos triangulos)
const profiles = {};
function profile(body) {
  if (profiles[body]) return profiles[body];
  const g = parts[body].geo, pos = g.attributes.position, b = parts[body].box;
  const idx = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
  const N = 48, z0 = b.min.z, dz = (b.max.z - b.min.z) / N;
  const lo = new Array(N).fill(Infinity), hi = new Array(N).fill(-Infinity);
  // corte exato: cada triangulo e' fatiado no plano z = centro da fatia
  const Y = [0, 0, 0], Z = [0, 0, 0];
  for (let i = 0; i < idx.length; i += 3) {
    for (let k = 0; k < 3; k++) { Y[k] = pos.getY(idx[i + k]); Z[k] = pos.getZ(idx[i + k]); }
    const zmin = Math.min(Z[0], Z[1], Z[2]), zmax = Math.max(Z[0], Z[1], Z[2]);
    const s0 = Math.max(0, Math.ceil((zmin - z0) / dz - 0.5)), s1 = Math.min(N - 1, Math.floor((zmax - z0) / dz - 0.5));
    for (let s = s0; s <= s1; s++) {
      const zc = z0 + (s + 0.5) * dz;
      for (let e = 0; e < 3; e++) {
        const a = e, c = (e + 1) % 3;
        if ((Z[a] - zc) * (Z[c] - zc) > 0 || Z[a] === Z[c]) continue;
        const y = Y[a] + (Y[c] - Y[a]) * (zc - Z[a]) / (Z[c] - Z[a]);
        if (y < lo[s]) lo[s] = y;
        if (y > hi[s]) hi[s] = y;
      }
    }
  }
  // fatia vazia herda a vizinha
  for (let s = 0; s < N; s++) if (!Number.isFinite(lo[s])) { const n = lo[s - 1] ?? lo[s + 1]; lo[s] = Number.isFinite(n) ? n : b.min.y; hi[s] = Number.isFinite(hi[s - 1]) ? hi[s - 1] : b.max.y; }
  return (profiles[body] = { lo, hi, z0, dz, N });
}
const tops = {};
// zBack: em vez da frente, mede o trecho logo atras da lente (entre ela e o olho)
function topInFront(body, xc, halfW, zEye, zBack) {
  const key = body + '|' + xc.toFixed(3) + '|' + halfW.toFixed(3) + '|' + zEye.toFixed(3) + '|' + zBack;
  const inZ = zBack === undefined ? (z) => z < zEye - 0.02 : (z) => z > zEye + 0.005 && z < zBack;
  if (key in tops) return tops[key];
  const g = parts[body].geo, pos = g.attributes.position;
  const idx = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
  let best = -Infinity;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
  const N = 7;
  for (let i = 0; i < idx.length; i += 3) {
    A.fromBufferAttribute(pos, idx[i]); B.fromBufferAttribute(pos, idx[i + 1]); C.fromBufferAttribute(pos, idx[i + 2]);
    if (Math.max(A.y, B.y, C.y) <= best) continue;
    if (zBack === undefined ? Math.min(A.z, B.z, C.z) > zEye - 0.02 : Math.max(A.z, B.z, C.z) < zEye || Math.min(A.z, B.z, C.z) > zBack) continue;
    if (Math.max(A.x, B.x, C.x) < xc - halfW || Math.min(A.x, B.x, C.x) > xc + halfW) continue;
    for (let u = 0; u <= N; u++) for (let v = 0; v <= N - u; v++) {
      const a = u / N, bb = v / N;
      P.set(0, 0, 0).addScaledVector(A, 1 - a - bb).addScaledVector(B, a).addScaledVector(C, bb);
      if (inZ(P.z) && Math.abs(P.x - xc) <= halfW && P.y > best) best = P.y;
    }
  }
  return (tops[key] = best);
}
const sliceOf = (pr, z) => Math.max(0, Math.min(pr.N - 1, Math.floor((z - pr.z0) / pr.dz)));
const zOf = (pr, s) => pr.z0 + (s + 0.5) * pr.dz;

// Cabo da mao direita: saliencia pra baixo no corpo (o pente e' peca separada, nao entra).
// Pega o grupo de fatias fundas mais perto do pente, ignorando a ponta da coronha e o cano.
// Funciona em arma comum (cabo atras do pente) e bullpup (cabo na frente do pente).
const grips = {};
export function gripInfo(body) {
  if (body in grips) return grips[body];
  const b = parts[body].box, pr = profile(body), h = b.max.y - b.min.y, len = b.max.z - b.min.z;
  const deep = b.min.y + h * 0.42;
  const mag = nativePart(body, 'charger');
  const magZ = mag ? (parts[mag].box.min.z + parts[mag].box.max.z) / 2 : b.min.z + len * 0.5;
  const clusters = [];
  let cur = null;
  for (let s = 0; s < pr.N; s++) {
    const z = zOf(pr, s);
    const inside = z > b.min.z + len * 0.12 && z < b.max.z - len * 0.1;
    if (inside && pr.lo[s] < deep) { if (!cur) clusters.push(cur = { s0: s, s1: s, lo: pr.lo[s] }); cur.s1 = s; cur.lo = Math.min(cur.lo, pr.lo[s]); }
    else cur = null;
  }
  // poco do pente e cabo ligados por uma ponte mais rasa viram um bloco so':
  // quebra onde houver crista (sobe mais de 10% da altura dos dois lados)
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    for (let s = c.s0 + 1; s < c.s1; s++) {
      let l = Infinity, r = Infinity;
      for (let k = c.s0; k < s; k++) l = Math.min(l, pr.lo[k]);
      for (let k = s + 1; k <= c.s1; k++) r = Math.min(r, pr.lo[k]);
      if (pr.lo[s] < Math.max(l, r) + h * 0.1) continue;
      let e = s;
      while (e < c.s1 && pr.lo[e + 1] >= Math.max(l, r) + h * 0.1) e++;
      const rest = { s0: e + 1, s1: c.s1, lo: Infinity };
      for (let k = rest.s0; k <= rest.s1; k++) rest.lo = Math.min(rest.lo, pr.lo[k]);
      c.s1 = s - 1; c.lo = Infinity;
      for (let k = c.s0; k <= c.s1; k++) c.lo = Math.min(c.lo, pr.lo[k]);
      if (rest.s0 <= rest.s1) clusters.splice(i + 1, 0, rest);
      break;
    }
  }
  // cada bloco fica so' com a parte funda; a aba rasa das pontas vira bloco proprio (se tiver corpo)
  const loOf = (s0, s1) => { let m = Infinity; for (let k = s0; k <= s1; k++) m = Math.min(m, pr.lo[k]); return m; };
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i], o0 = c.s0, o1 = c.s1;
    while (c.s0 < c.s1 && pr.lo[c.s0] > c.lo + h * 0.1) c.s0++;
    while (c.s1 > c.s0 && pr.lo[c.s1] > c.lo + h * 0.1) c.s1--;
    if (c.s0 - o0 >= 6) clusters.push({ s0: o0, s1: c.s0 - 1, lo: loOf(o0, c.s0 - 1) });
    if (o1 - c.s1 >= 6) clusters.push({ s0: c.s1 + 1, s1: o1, lo: loOf(c.s1 + 1, o1) });
  }
  let best = null, bd = Infinity, well = null;
  // cabo desce fundo; guarda-mao e trilho de baixo ficam rasos e nao concorrem
  const floor = Math.min(...clusters.map(c => c.lo)) + h * 0.2;
  for (const c of clusters) {
    if (c.lo > floor) continue;
    const zc = (zOf(pr, c.s0) + zOf(pr, c.s1)) / 2;
    const d = Math.abs(zc - magZ);
    const g = { z0: zOf(pr, c.s0) - pr.dz / 2, z1: zOf(pr, c.s1) + pr.dz / 2, zc, lo: c.lo };
    // o proprio poco do pente nao conta como cabo...
    if (mag && zc > parts[mag].box.min.z - 0.02 && zc < parts[mag].box.max.z + 0.02) { well = g; continue; }
    if (d < bd) { bd = d; best = g; }
  }
  // ...a nao ser que seja o unico (pente dentro do cabo, estilo Uzi)
  return (grips[body] = best || well);
}

// Pentes que fazem sentido no corpo: largura/profundidade parecidas com o original
// e, encaixado no poco, sem invadir o cabo. Sem pente original = so o padrao.
const magCompat = {};
export function chargerOptions(body, cat) {
  const key = body + '|' + cat;
  if (magCompat[key]) return magCompat[key];
  const native = nativePart(body, 'charger');
  if (!native) return (magCompat[key] = []);
  const nb = parts[native].box, nw = nb.max.x - nb.min.x, nd = nb.max.z - nb.min.z;
  const top = anchor('charger', nb), gi = gripInfo(body);
  const out = [native];
  for (const id of CATEGORY[cat].chargers) {
    if (id === native || !parts[id]) continue;
    const cb = parts[id].box, w = cb.max.x - cb.min.x, d = cb.max.z - cb.min.z;
    if (w / nw < 0.6 || w / nw > 1.6 || d / nd < 0.6 || d / nd > 1.5) continue;
    // onde ele fica depois de encaixado (topo no topo do original)
    const dz = top.z - (cb.min.z + cb.max.z) / 2;
    const z0 = cb.min.z + dz, z1 = cb.max.z + dz;
    if (gi && z1 > gi.z0 + 0.02 && z0 < gi.z1 - 0.02) continue;
    out.push(id);
  }
  return (magCompat[key] = out);
}

// ponto mais alto do corpo numa faixa (x) e trecho (z): onde a mira assenta
function hiUnder(body, xc, halfW, z0, z1) {
  const g = parts[body].geo, pos = g.attributes.position;
  const idx = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
  let best = -Infinity;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), P = new THREE.Vector3();
  for (let i = 0; i < idx.length; i += 3) {
    A.fromBufferAttribute(pos, idx[i]); B.fromBufferAttribute(pos, idx[i + 1]); C.fromBufferAttribute(pos, idx[i + 2]);
    if (Math.max(A.y, B.y, C.y) <= best) continue;
    if (Math.max(A.z, B.z, C.z) < z0 || Math.min(A.z, B.z, C.z) > z1) continue;
    if (Math.max(A.x, B.x, C.x) < xc - halfW || Math.min(A.x, B.x, C.x) > xc + halfW) continue;
    for (let u = 0; u <= 6; u++) for (let v = 0; v <= 6 - u; v++) {
      P.set(0, 0, 0).addScaledVector(A, 1 - u / 6 - v / 6).addScaledVector(B, u / 6).addScaledVector(C, v / 6);
      if (P.z >= z0 && P.z <= z1 && Math.abs(P.x - xc) <= halfW && P.y > best) best = P.y;
    }
  }
  return best;
}

function bodySlot(body, slot) {
  const nat = nativePart(body, slot);
  if (nat) return anchor(slot, parts[nat].box);
  const b = parts[body].box, len = b.max.z - b.min.z, cx = (b.min.x + b.max.x) / 2;
  const pr = profile(body);
  const mag = nativePart(body, 'charger');
  const magBox = mag ? parts[mag].box : null;
  if (slot === 'scope') {
    // trilho: parte mais alta do receptor, em cima do cabo/pente (longe da coronha e do cano)
    const gi = gripInfo(body);
    const zc = gi ? gi.zc : magBox ? (magBox.min.z + magBox.max.z) / 2 : b.min.z + len * 0.55;
    let pick = sliceOf(pr, zc), top = -Infinity;
    const s0 = sliceOf(pr, zc - len * 0.18), s1 = sliceOf(pr, zc + len * 0.12);
    for (let s = s0; s <= s1; s++) if (pr.hi[s] > top + 0.02) { top = pr.hi[s]; pick = s; }
    // centro do trecho plano mais alto (o trilho), nao a beirada dele
    let a = pick, z = pick;
    while (a > 0 && pr.hi[a - 1] >= top - 0.015) a--;
    while (z < pr.N - 1 && pr.hi[z + 1] >= top - 0.015) z++;
    return new THREE.Vector3(cx, top, (zOf(pr, a) + zOf(pr, z)) / 2);
  }
  if (slot === 'charger') {
    // poco do pente: fundo do corpo no meio
    const z = b.min.z + len * 0.5;
    return new THREE.Vector3(cx, pr.lo[sliceOf(pr, z)] + 0.02, z);
  }
  // empunhadura: parte mais baixa do guarda-mao, na frente do pente (nunca no cano fino)
  const gi = gripInfo(body);
  const front = b.min.z;
  const back = Math.min(magBox ? magBox.min.z : Infinity, gi ? gi.z0 : Infinity, b.min.z + len * 0.55) - 0.08;
  const sFront = sliceOf(pr, front + len * 0.06), sBack = sliceOf(pr, back);
  let best = Infinity;
  for (let s = sFront; s <= sBack; s++) best = Math.min(best, pr.lo[s]);
  const ideal = back - (back - front) * 0.38;
  let pick = sBack, pd = Infinity;
  for (let s = sFront; s <= sBack; s++) {
    if (pr.lo[s] > best + 0.04) continue;
    const zc = pr.z0 + (s + 0.5) * pr.dz;
    if (Math.abs(zc - ideal) < pd) { pd = Math.abs(zc - ideal); pick = s; }
  }
  return new THREE.Vector3(cx, pr.lo[pick] + 0.015, pr.z0 + (pick + 0.5) * pr.dz);
}

// Variante de elite montada: todas as pecas, cores e tracado + o pente grande/curto que encaixa no modelo
export function bpLoadout(id) {
  const B = BLUEPRINTS[id];
  if (!B) return null;
  const lo = { scope: null, charger: null, handle: null, laser: null, ...B.lo, bp: id };
  if (B.mag && parts[lo.body]) {
    const vol = (c) => { const s = parts[c].box.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
    const opts = chargerOptions(lo.body, B.wpn).filter(c => parts[c]).sort((a, b) => vol(a) - vol(b));
    if (opts.length > 1) lo.charger = B.mag === 'big' ? opts[opts.length - 1] : opts[0];
  }
  return lo;
}

// Monta a arma. Devolve o mesmo formato do makeGun (userData: muzzle, gripR, gripL, spin, scope, stats)
// Camuflagem lendaria liga o efeito de fora da arma (fogo, raio, tinta, estrelas)
export function buildGun(wpn, lo) {
  const g = buildGunParts(wpn, lo), fx = camoById(lo?.camo).fx;
  if (g && fx) attachCamoFx(g, fx);
  return g;
}
function buildGunParts(wpn, lo) {
  if (wpn === 'minigun' && parts.__minigun) return buildMinigun();
  if (wpn === 'melee') return buildMelee(lo);
  const cat = CATEGORY[wpn];
  if (!cat || !arsenalReady()) return makeGun(wpn);
  lo = { ...defaultLoadout(wpn), ...(lo || {}) };
  if (!parts[lo.body]) lo.body = cat.bodies[0];
  if (!lo.charger || !chargerOptions(lo.body, wpn).includes(lo.charger)) lo.charger = nativePart(lo.body, 'charger');
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(S);
  holder.add(inner);
  const mat = paintMaterial(lo.paint, lo.accent, lo.camo);
  const partMat = paintMaterial(lo.paint, lo.accent, null, true);
  const bodyBox = parts[lo.body].box;
  const len = bodyBox.max.z - bodyBox.min.z, h = bodyBox.max.y - bodyBox.min.y, cx = (bodyBox.min.x + bodyBox.max.x) / 2;
  const chargerSlot = bodySlot(lo.body, 'charger');
  // origem da arma = punho da mao direita (atras do carregador, embaixo)
  const isPistol = wpn === 'pistol';
  const gi = gripInfo(lo.body);
  const gripZ = isPistol ? chargerSlot.z : gi ? gi.zc : Math.min(bodyBox.max.z - len * 0.15, chargerSlot.z + len * 0.17);
  const origin = new THREE.Vector3(cx, bodyBox.min.y + h * (isPistol ? 0.45 : 0.42), gripZ);
  const add = (name, at, m0 = mat) => {
    const p = parts[name];
    if (!p) return null;
    const m = new THREE.Mesh(p.geo, m0);
    outline(m, 0.0055);
    const off = new THREE.Vector3();
    if (at) off.copy(at.target).sub(at.self);
    m.position.copy(off).sub(origin);
    inner.add(m);
    return m;
  };
  add(lo.body);
  let scopeInfo = null;
  for (const slot of ['charger', 'scope', 'handle']) {
    const id = lo[slot];
    if (!id || !parts[id]) continue;
    const nat = ownerBody(id) === lo.body;
    if (slot !== 'scope') { add(id, nat ? null : { self: anchor(slot, parts[id].box), target: bodySlot(lo.body, slot) }, partMat); continue; }
    {
      const b = parts[id].box, sl = b.max.z - b.min.z, sh = b.max.y - b.min.y;
      // eixo optico = centro da lente; olho fica na traseira da mira
      const L = parts[id].lens;
      const lensC = L ? L.c.clone() : new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + sh * 0.62, 0);
      const shift = nat ? new THREE.Vector3() : bodySlot(lo.body, 'scope').sub(anchor('scope', b));
      // a mira nunca passa das pontas do corpo (cano na frente, coronha atras)
      if (!nat) {
        const zMin = bodyBox.min.z + 0.01 - b.min.z, zMax = bodyBox.max.z - 0.01 - b.max.z;
        if (zMin <= zMax) shift.z = Math.min(zMax, Math.max(zMin, shift.z));
      }
      const sw = Math.min((b.max.x - b.min.x) * 0.45, 0.12), scx = (b.min.x + b.max.x) / 2 + shift.x;
      const seat = hiUnder(lo.body, scx, sw, b.min.z + shift.z + 0.02, b.max.z + shift.z - 0.02);
      if (!nat && Number.isFinite(seat)) shift.y = seat - 0.006 - b.min.y;
      // janela livre: nada do corpo (massa de mira, ferrolho, alca) pode passar na frente da lente.
      // Se passar, a mira sobe e ganha um suporte (riser) embaixo.
      const lr = L ? L.r : sh * 0.3;
      let top = topInFront(lo.body, lensC.x + shift.x, lr * 0.75, (L ? L.z : b.max.z) + shift.z);
      // luneta: o corpo entre o olho e a lente tambem nao pode tampar a imagem
      if (sl >= 0.6) top = Math.max(top, topInFront(lo.body, lensC.x + shift.x, lr * 0.75, b.max.z + shift.z, b.max.z + shift.z + 0.15));
      const lift = Math.max(0, top + 0.012 - (lensC.y + shift.y - lr * 0.82));
      shift.y += lift;
      add(id, { self: new THREE.Vector3(), target: shift }, partMat);
      // vao entre a mira e o corpo vira suporte (riser), nunca fica boiando
      const gap = Number.isFinite(seat) ? b.min.y + shift.y - seat : lift;
      if (gap > 0.012) {
        const rw = Math.min(b.max.x - b.min.x, 0.2), rd = Math.min(sl * 0.55, 0.5);
        const riser = new THREE.Mesh(new THREE.BoxGeometry(rw, gap + 0.02, rd), toon(0x2a2724));
        outline(riser, 0.0055);
        riser.position.set(scx, b.min.y + shift.y - gap / 2 + 0.004, (b.min.z + b.max.z) / 2 + shift.z).sub(origin);
        inner.add(riser);
      }
      const big = sl >= 0.6;
      // luneta: o vidro vai pra boca traseira do tubo (senao o olho enxerga o tunel da ocular por dentro)
      const lensZ = L ? (big && rearTube(id) ? Math.max(L.z, b.max.z - 0.006) : L.z) : b.max.z;
      const eye = new THREE.Vector3(lensC.x, lensC.y, lensZ).add(shift).sub(origin).multiplyScalar(S);
      // vidro com a reticula (e, na luneta, a imagem ampliada)
      const lensR = (L ? L.r : sh * 0.3) * 0.96;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(lensR, 32), lensMaterial(big, lo.ret || (big ? 'duplex' : 'dot'), lo.retColor || 'red'));
      lens.position.set(lensC.x, lensC.y, lensZ - 0.004).add(shift).sub(origin);
      lens.renderOrder = 3;
      inner.add(lens);
      // inclinacao do eixo optico (frente x tras); a pose de mira compensa pra ficar reta
      const tilt = L && L.f ? Math.atan2(L.f.y - L.c.y, L.c.z - L.f.z) : 0;
      scopeInfo = { big, zoom: big ? 2.6 + sl * 1.6 : 1.55, eye, len: sl * S, lensR: lensR * S, lens, lift, tilt };
    }
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(cx, bodyBox.max.y - h * 0.28, bodyBox.min.z).sub(origin).multiplyScalar(S);
  const gripR = new THREE.Object3D();
  gripR.position.set(0, -0.03, 0.02);
  const gripL = new THREE.Object3D();
  let hs;
  if (lo.handle && parts[lo.handle]) {
    const hb = parts[lo.handle].box, nat = ownerBody(lo.handle) === lo.body;
    const shift = nat ? new THREE.Vector3() : bodySlot(lo.body, 'handle').sub(anchor('handle', hb));
    hs = hb.getCenter(new THREE.Vector3()).add(shift);
  } else {
    const pr = profile(lo.body), z = bodyBox.min.z + len * 0.3;
    hs = new THREE.Vector3(cx, pr.lo[sliceOf(pr, z)] + 0.06, z);
  }
  gripL.position.copy(hs).sub(origin).multiplyScalar(S);
  if (isPistol) gripL.position.set(-0.03, -0.05, 0.01);
  // sem mira: a mira de ferro fica no topo do corpo
  const iron = new THREE.Vector3(cx, bodyBox.max.y + 0.06, bodyBox.min.z + len * 0.6).sub(origin).multiplyScalar(S);
  holder.add(muzzle, gripR, gripL);
  const laser = lo.laser && LASER_DEF[lo.laser] ? addLaser(holder, lo, origin, isPistol) : null;
  holder.userData = { id: wpn, muzzle, gripR, gripL, spin: null, scope: scopeInfo, iron, mat, laser, stats: loadoutStats(wpn, lo) };
  return holder;
}

function buildMinigun() {
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  const box = new THREE.Box3();
  for (const g of parts.__minigun) { g.geo.computeBoundingBox(); box.union(g.geo.boundingBox); }
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  // eixo mais longo vira Z; frente = lado onde esta o "Front"
  const axis = size.x > size.z ? 'x' : 'z';
  const front = parts.__minigun.find(g => g.front);
  const fc = front ? front.geo.boundingBox.getCenter(new THREE.Vector3()) : c;
  const scale = 1.0 / Math.max(size.x, size.z);
  let spin = null;
  for (const g of parts.__minigun) {
    const m = new THREE.Mesh(g.geo, toon(g.color));
    outline(m, 0.0055);
    m.position.sub(c);
    if (g.front) {
      const piv = new THREE.Group();
      const gc = g.geo.boundingBox.getCenter(new THREE.Vector3()).sub(c);
      piv.position.copy(gc);
      m.position.sub(gc);
      piv.add(m);
      inner.add(piv);
      spin = piv;
    } else inner.add(m);
  }
  const dir = fc.clone().sub(c);
  if (axis === 'x') inner.rotation.y = dir.x > 0 ? Math.PI / 2 : -Math.PI / 2;
  else if (dir.z > 0) inner.rotation.y = Math.PI;
  inner.scale.setScalar(scale);
  inner.position.set(0, 0.05, -0.15);
  holder.add(inner);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.05, -0.68);
  const gripR = new THREE.Object3D(); gripR.position.set(0, -0.08, 0.15);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.12, 0.05, -0.05);
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'minigun', muzzle, gripR, gripL, spin, spinAxis: axis, scope: null, stats: {} };
  return holder;
}

// Perfil de cada empunhadura (estilo COD: todo ganho cobra alguma coisa)
const GRIP_TRAITS = {
  subfusil_handle_2: { kick: 0.7, adsTime: 1.08, move: 0.98 },               // vertical: segura o recuo
  subfusil_handle_3: { adsTime: 0.86, kick: 0.88, spread: 1.05 },            // angulada: mira rapida
  subfusil_handle_6: { spread: 0.78, kick: 0.9, move: 0.97 },                // curta: tiro de quadril
  fusil_handle_2: { kick: 0.6, spread: 0.88, adsTime: 1.16, move: 0.93 },    // pesada: trava a arma
};

// Arma branca: textura propria do glb; camuflagem cobre a peca toda. Origem = mao (perto do fim do cabo),
// ponta apontando pro -z (pra frente, como o cano das armas).
function meleeMaterial(map, camo) {
  const m = toon(0xffffff, { map, unique: true });
  m.userData.u = { uCamo: { value: camoById(camo).code }, uTime: camoTime, uReact: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position * 0.12;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CAMO_GLSL + '\nvec3 gCamoGlow = vec3(0.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gCamoGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (uCamo > 0.5) { vec3 cg; float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = camoColor(int(uCamo + 0.5), vCamoPos, uTime, lum, cg); gCamoGlow = cg; }`);
  };
  m.customProgramCacheKey = () => 'melee';
  return m;
}
function buildMelee(lo) {
  const id = lo && parts[lo.body]?.melee ? lo.body : 'melee_10';
  const p = parts[id], holder = new THREE.Group();
  if (!p) return makeGun('pistol');
  const b = p.box, len = b.max.z - b.min.z, k = MELEE_LEN[Number(id.split('_')[1])] / len;
  const m = new THREE.Mesh(p.geo, meleeMaterial(p.map, lo?.camo));
  outline(m, 0.02);
  // mao a 12% do fim do cabo; gira 180 no y pra ponta ir pro -z
  const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
  m.position.set(-cx, -cy, -(b.min.z + len * 0.12));
  const inner = new THREE.Group(); inner.add(m); inner.scale.setScalar(k); inner.rotation.y = Math.PI;
  holder.add(inner);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -len * 0.88 * k);
  const gripR = new THREE.Object3D(); gripR.position.set(0, -0.01, 0.01);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.05, -0.08, 0.12);
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'melee', muzzle, gripR, gripL, spin: null, scope: null, iron: new THREE.Vector3(0, 0.08, -0.1), melee: true, mat: m.material, stats: loadoutStats('melee', lo) };
  return holder;
}

// Modulo laser: na lateral esquerda do guarda-mao (o lado que a camera ve), na pistola embaixo do cano.
// O feixe e' um cilindro aditivo que some ao longe; quem desenha o ponto no mundo e' o main.
const BEAM_LEN = 12;
function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCol: { value: new THREE.Color(color) }, uOn: { value: 1 } },
    // vX = volta do cilindro: miolo claro no meio, cor nas bordas (le bem em cenario claro e escuro)
    vertexShader: 'varying float vT; varying float vX; void main(){ vT = 1.0 - uv.y; vX = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uCol; uniform float uOn; varying float vT; varying float vX; void main(){ float a = pow(vT, 1.4) * 0.95 * uOn; float core = pow(abs(sin(vX * 6.2832)), 6.0); gl_FragColor = vec4(mix(uCol, vec3(1.0), core * 0.6), a); }',
  });
}
function addLaser(holder, lo, origin, isPistol) {
  const D = LASER_DEF[lo.laser], [w, h, d] = D.size;
  const b = parts[lo.body].box, pr = profile(lo.body), len = b.max.z - b.min.z, cx = (b.min.x + b.max.x) / 2;
  const z = b.min.z + len * (isPistol ? 0.16 : 0.27), sl = pr.lo[sliceOf(pr, z)], sh = pr.hi[sliceOf(pr, z)];
  const at = isPistol
    ? new THREE.Vector3(cx, sl, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(0, -h / 2 - 0.004, 0))
    : new THREE.Vector3(b.min.x, (sl + sh) / 2, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(-w / 2 - 0.004, 0, 0));
  const g = new THREE.Group(); g.position.copy(at);
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(0x2a2724)); outline(box, 0.004); g.add(box);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(isPistol ? w * 0.7 : 0.008, isPistol ? 0.008 : h * 0.7, d * 0.7), toon(0x1c1a18));
  rail.position.set(isPistol ? 0 : w / 2 + 0.004, isPistol ? h / 2 + 0.004 : 0, 0); g.add(rail);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.3, h * 0.3, 0.006, 12), new THREE.MeshBasicMaterial({ color: D.color }));
  eye.rotation.x = Math.PI / 2; eye.position.z = -d / 2 - 0.002; g.add(eye);
  // feixe: vT = 1 na boca do laser e 0 na ponta (some ao longe)
  const geo = new THREE.CylinderGeometry(0.003, 0.005, 1, 8, 1, true); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -0.5);
  const beam = new THREE.Mesh(geo, beamMaterial(D.color));
  beam.position.z = -d / 2 - 0.004; beam.scale.z = BEAM_LEN; beam.renderOrder = 4; beam.frustumCulled = false;
  beam.userData.noFx = true; // feixe de 12 m nao conta como superficie da arma (efeito da camo lendaria)
  g.add(beam);
  holder.add(g);
  return { group: g, beam, color: D.color, len: BEAM_LEN };
}

// Efeito das pecas nos atributos (multiplicadores sobre WEAPONS)
export function loadoutStats(wpn, lo) {
  const st = { mag: 1, spread: 1, kick: 1, adsTime: 1, zoom: null, rate: 1, dmg: 1, reload: 1, move: 1, hip: 1, mode: null, burst: 0 };
  if (!lo || !arsenalReady() || !parts[lo.body]) return st;
  // perfil do modelo: modo de tiro e cadencia/dano/quadril proprios
  const bt = bodyTrait(lo.body);
  st.mode = bt.mode || null; st.burst = bt.burst || 0;
  for (const k of ['rate', 'dmg', 'hip', 'kick', 'spread']) if (bt[k]) st[k] *= bt[k];
  const nat = nativePart(lo.body, 'charger');
  if (lo.charger && nat && parts[lo.charger] && lo.charger !== nat) {
    const vol = (b) => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
    const m = st.mag = Math.max(0.7, Math.min(1.6, vol(parts[lo.charger].box) / vol(parts[nat].box)));
    // pente maior: mais balas, mas pesa (mira, recarga e passo mais lentos); menor: o contrario
    if (m > 1) { st.adsTime *= 1 + (m - 1) * 0.25; st.reload *= 1 + (m - 1) * 0.45; st.move *= 1 - (m - 1) * 0.06; }
    else { st.adsTime *= 1 - (1 - m) * 0.3; st.reload *= 1 - (1 - m) * 0.5; st.move *= 1 + (1 - m) * 0.05; }
  }
  if (lo.laser && LASER_DEF[lo.laser]) for (const [k, v] of Object.entries(LASER_DEF[lo.laser].traits)) st[k] *= v;
  if (lo.handle) {
    const g = GRIP_TRAITS[lo.handle] || { spread: 0.8, kick: 0.72, adsTime: 1.08 };
    for (const k in g) st[k] *= g[k];
  }
  if (lo.scope && parts[lo.scope]) {
    const b = parts[lo.scope].box, sl = b.max.z - b.min.z;
    st.zoom = sl >= 0.6 ? 2.6 + sl * 1.6 : 1.55;
    st.adsTime *= sl >= 0.6 ? 1.35 : 1.05;
    st.spread *= 0.85;
  }
  // corpo maior = mais preciso, um pouco mais lento
  const cat = CATEGORY[wpn];
  const bl = parts[lo.body].box.max.z - parts[lo.body].box.min.z;
  const ref = parts[cat.bodies[0]].box.max.z - parts[cat.bodies[0]].box.min.z;
  const k = bl / ref;
  st.spread *= 1 / Math.sqrt(k);
  st.rate *= Math.sqrt(k);
  st.dmg *= 0.9 + 0.1 * k;
  // variante de elite: bonus e onus por cima da montagem
  for (const [m, v] of Object.entries(bpMods(lo.bp))) if (typeof st[m] === 'number') st[m] *= v;
  return st;
}

// O que trocar uma peca muda (pro/contra), comparado com a peca atual daquele slot
export function partEffects(wpn, lo, slot, id) {
  const base = { ...lo }, cand = { ...lo };
  base[slot] = slot === 'charger' ? nativePart(lo.body, 'charger') : null;
  cand[slot] = id;
  const a = loadoutStats(wpn, base), b = loadoutStats(wpn, cand);
  // [chave do texto, quanto melhorou (positivo = bom)]
  const out = [
    ['st_ctrl', a.kick / b.kick - 1], ['st_acc', a.spread / b.spread - 1], ['st_hip', a.hip / b.hip - 1], ['st_ads', a.adsTime / b.adsTime - 1],
    ['st_reload', a.reload / b.reload - 1], ['st_move', b.move / a.move - 1], ['st_mag', b.mag / a.mag - 1],
  ].filter(([, v]) => Math.abs(v) >= 0.01);
  return out.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
}

// ---------- loadouts salvos ----------
const KEY = 'rr_loadouts_v1';
export function getLoadouts() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  for (const c of Object.keys(CATEGORY)) s[c] = { ...defaultLoadout(c), ...(s[c] || {}) };
  return s;
}
export function saveLoadouts(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem storage */ } }

// Na partida so vale o que ja foi desbloqueado; peca bloqueada volta pro padrao (o salvo fica intacto)
export function unlockedLoadout(cat, lo, partOpen, camoOpen, camoList) {
  const C = CATEGORY[cat];
  if (!C || !lo) return lo;
  const out = { ...lo };
  // variante de elite liberada: a montagem dela vale mesmo com peca que o nivel ainda nao abriu
  const B = out.bp && BLUEPRINTS[out.bp];
  if (B && B.wpn === cat && bpUnlocked(out.bp)) {
    const cm = camoList.find(c => c.id === out.camo);
    return { ...out, ...bpLoadout(out.bp), camo: cm && !camoOpen(cat, cm) ? B.lo.camo : out.camo };
  }
  delete out.bp;
  const ok = (list, id) => { const i = list.indexOf(id ?? null); return i < 0 || partOpen(cat, i, id); };
  if (!ok(C.bodies, out.body)) { out.body = C.bodies[0]; out.charger = null; }
  if (out.scope && !ok([null, ...C.scopes], out.scope)) out.scope = cat === 'sniper' ? nativePart(out.body, 'scope') : null;
  const mags = chargerOptions(out.body, cat);
  if (out.charger && (!mags.includes(out.charger) || !ok(mags, out.charger))) out.charger = null;
  if (out.handle && !ok([null, ...C.handles], out.handle)) out.handle = null;
  if (out.laser && !ok([null, ...LASERS], out.laser)) out.laser = null;
  if (out.tracer && !partOpen(cat, 1, 'tr:' + out.tracer)) out.tracer = null;
  const cm = camoList.find(c => c.id === out.camo);
  if (cm && !camoOpen(cat, cm)) out.camo = null;
  return out;
}
export const _dbg = { parts, profile: b => profile(b), nativePart, rearTube: id => rearTube(id) };
