// Arsenal modular (gunsmith estilo COD) em cima dos .glb low poly do usuario.
// low_poly_guns.glb: corpo + carregador + mira + empunhadura separados por arma.
// low-poly_weapon_asset_pack.glb: armas inteiras (usamos a Minigun).
// Pintura: shader troca a parte VERDE pela cor principal e os cinzas claros/azulados pelo destaque.
import * as THREE from 'three';
import { pushSoon } from './rovex.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon, outline, geo } from './toon.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeGun } from './guns.js';
import { t, wName } from './i18n.js';
import { camoGlsl, camoTime, camoById } from './camos.js';
import { attachCamoFx } from './camofx.js';
import { bodyTrait, bpMods, BLUEPRINTS, AMMO, WEAPONS, GADGETS, WSKINS, baseBody } from '../shared/weapons.js';
import { bpUnlocked, progressInfo, passLevel } from './progress.js';
import { RET_PASS } from './pass.js';
import { shopOwned } from './shopstore.js';
// skin de modelo da Loja (04/11): fica em lo.ws; so muda o VISUAL (o corpo, nivel e stats seguem os do modelo original)
export const wsOwned = (id) => !!WSKINS[id] && (!!progressInfo().unlockAll || shopOwned('wskin:' + id));
export const wsFor = (body) => Object.keys(WSKINS).filter(id => WSKINS[id].of === body);

const S = 0.32; // unidade do glb -> metros
const parts = {};  // nome -> { geo, box }
if (import.meta.env?.DEV) window.__parts = parts; // depuracao local (lente fora do lugar etc.)
let ready = null;
let gunTex = null;

// Armas brancas (melee.glb): ordem dos meshes do arquivo; comprimento real em metros por peca
export const MELEE = Array.from({ length: 19 }, (_, i) => 'melee_' + i); // 15-17: espadas (04/11, sword_set.glb); 18: Sabre de Neon (light_saber.glb)
export const isSaber = (body) => body === 'melee_18'; // sem camuflagem; o Destaque troca a cor do brilho
const MELEE_LEN = [0.34, 0.5, 0.3, 0.72, 0.52, 0.36, 0.52, 0.56, 0.3, 0.55, 0.28, 0.5, 0.6, 0.52, 0.5, 0.8, 0.95, 0.92, 1.0];
// Espadas (04/11, pedido dele; "Low Poly Sword Set", Sketchfab -> creditos): uma linha por espada. node = no do arquivo;
// as pecas dele viram UMA malha com a cor de cada material no vertice (o arquivo nao tem textura). blade = materiais da
// lamina (acham a ponta). Seguram com as duas maos e golpeiam em arco largo (viewmodel: sword).
export const SWORDS = [
  { node: 'Swashbuckler', id: 'melee_15', blade: /swbBlade/i },
  { node: 'Fantasy Sword', id: 'melee_16', blade: /FantasyBlade|Sharp/i },
  { node: 'Katana', id: 'melee_17', blade: /Blade|Sharp/i, flipEdge: true }, // fio vinha virado pra tras (04/11)
];
export const CATEGORY = {
  pistol: { bodies: [...range('pistol_', 1, 6), 'pistol_7', 'pistol_8', 'pistol_9', 'pistol_10', 'pistol_11'], scopes: ['pistol_scope_5', 'subfusil_scope_2', 'subfusil_scope_6', 'subfusil_scope_9'], chargers: [...range('pistol_charger_', 1, 6), 'pistol_charger_7', 'pistol_charger_8', 'pistol_charger_9'], handles: ['akimbo'] }, // akimbo: segunda pistola na outra mao (sai de desafio)
  smg: { bodies: [...range('subfusil_', 1, 10), 'subfusil_13'] /* Tamborzao saiu (04/11) */, scopes: ['subfusil_scope_1', 'subfusil_scope_2', 'subfusil_scope_5', 'subfusil_scope_6', 'subfusil_scope_7', 'subfusil_scope_8', 'subfusil_scope_9', 'subfusil_scope_10', 'fusil_scope_1', 'fusil_scope_7'], chargers: [...range('subfusil_charguer_', 1, 10), 'subfusil_charger_11'], handles: ['akimbo', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'fusil_handle_2'] },
  rifle: { bodies: [...range('fusil_', 1, 7), /* Trovao de Lata (fusil_9) saiu 04/11 */ 'fusil_11', 'fusil_12', 'fusil_13'], scopes: ['fusil_scope_1', 'fusil_scope_2', 'fusil_scope_4', 'fusil_scope_5', 'fusil_scope_6', 'fusil_scope_7', 'subfusil_scope_5', 'subfusil_scope_7', 'sniper_scope_1'], chargers: ['fusil_charger_1', ...range('fusil_charguer_', 2, 7), 'fusil_charger_8', 'fusil_charger_9'], handles: ['fusil_handle_2', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'gd_flame', 'gd_shot'] },
  // escopeta: as 3 lunetas do fim da lista so cabem no Bacamarte (LONG_SCOPE)
  shotgun: { bodies: ['shotgun_1', 'shotgun_2', 'shotgun_3'], scopes: ['subfusil_scope_2', 'subfusil_scope_6', 'fusil_scope_7', 'subfusil_scope_9', 'sniper_scope_0', 'sniper_scope_1', 'sniper_scope_2'], chargers: ['shotgun_charguer_1'], handles: ['akimbo', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6'] },
  melee: { bodies: MELEE, scopes: [], chargers: [], handles: [] },
  sniper: { bodies: ['sniper_0', 'sniper_1', 'sniper_2', 'sniper_3', 'sniper_4'], scopes: ['sniper_scope_0', 'sniper_scope_1', 'sniper_scope_2', 'fusil_scope_6'], chargers: ['sniper_charger_1', 'sniper_charger_2'], handles: [] },
};
// Metralhadora (04/11, pedido dele: categoria nova). Miras e empunhaduras do fuzil (sem gadget de baixo do cano: o
// pente enorme fica embaixo); o pente de cada uma vem do arquivo (lmg_charger_N)
CATEGORY.lmg = { bodies: ['lmg_1', 'lmg_2'], scopes: [...CATEGORY.rifle.scopes], chargers: ['lmg_charger_1', 'lmg_charger_2'], handles: CATEGORY.rifle.handles.filter(h => !h.startsWith('gd_')) };
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
  lo.handle = C.handles.find(h => h !== 'akimbo') || null;
  lo.laser = 'laser_1';
  return lo;
}

// Mira laser (modulo lateral, feito no codigo): melhora o quadril, pesa um pouco na mira
// lanterna (04/11, pedido dele): mesmo slot do laser. Quem usa ve a luz projetada no mundo; quem recebe so ve um
// brilho leve vindo da arma (atrapalha a mira de quem esta na frente dela). model = peca do pacote de acessorios
export const LASERS = ['laser_1', 'laser_2', 'light_1'];
const LASER_DEF = {
  laser_1: { color: 0xff2a2a, size: [0.03, 0.028, 0.085], model: 'laser', traits: { hip: 0.8, adsTime: 1.03 } },              // compacto vermelho
  laser_2: { color: 0x39ff5a, size: [0.04, 0.038, 0.12], model: 'laser', traits: { hip: 0.7, adsTime: 1.07, move: 0.98 } },  // tatico verde
  light_1: { color: 0xfff1d0, size: [0.042, 0.042, 0.15], model: 'light', light: true, traits: { hip: 0.92, adsTime: 1.04 } }, // lanterna tatica
};
export const laserColor = (id) => LASER_DEF[id]?.color ?? 0xff2a2a;
function range(p, a, b) { const r = []; for (let i = a; i <= b; i++) r.push(p + i); return r; }

export const PART_LABEL = {
  body: 'Corpo', scope: 'Mira', charger: 'Carregador', handle: 'Empunhadura',
};

// nome de exibicao das pecas (cartoon, nada de marca)
export function partName(slot, id) {
  if (!id) return slot === 'muzzle' ? t('muzzleNone') : slot === 'conv' ? t('convNone') : slot === 'scope' ? t('ir_iron_flip') : slot === 'handle' ? t('noGrip') : slot === 'laser' ? t('noLaser') : t('stdPart');
  const n = id.match(/(\d+)$/)?.[1] ?? '0';
  if (slot === 'body' && id.startsWith('melee_')) return t('ml_' + n);
  if (slot === 'body' && WW2_BODIES.includes(id)) return t('ww_' + id);
  if (slot === 'body') { const k = 'bn_' + id, s = t(k); return s !== k ? s : wName(catOf(id)) + ' ' + t('model') + ' ' + n; }
  if (slot === 'scope' && IRONS[id]) return t('ir_' + id);
  if (slot === 'scope' && SNIPER_SCOPE_NAME[id]) return t(SNIPER_SCOPE_NAME[id]); // lunetas com nome do que fazem (01/11)
  if (slot === 'scope') { const b = parts[id]?.box; const big = b && (b.max.z - b.min.z) >= 0.6; return (big ? t('scopeBig') : t('scopeDot')) + ' ' + n + (id.startsWith('sniper') ? ' ' + t('long') : ''); }
  if (slot === 'charger' && DRUM_MAGS[id]?.ext) return t(id.endsWith('_2') ? 'extMag2' : 'extMag');
  if (slot === 'charger' && DRUM_MAGS[id]) return t('drumMag');
  if (slot === 'charger' && id.startsWith('lmg_')) return t('lmgBox'); // metralhadora: caixa de fita (04/11)
  if (slot === 'charger') return t('mag') + ' ' + n;
  if (slot === 'conv') return t('conv_' + id);
  if (slot === 'muzzle') return t('mz_' + id);
  if (slot === 'laser') return t(id === 'light_1' ? 'lightTac' : id === 'laser_2' ? 'laserTac' : 'laserDot');
  if (id === 'akimbo') return t('akimbo');
  if (GADGETS[id]) return t(id);
  return t('grip') + ' ' + n;
}
function catOf(id) { return id.startsWith('lmg') ? 'lmg' : id.startsWith('melee') ? 'melee' : id.startsWith('subfusil') ? 'smg' : id.startsWith('fusil') ? 'rifle' : id.startsWith('pistol') ? 'pistol' : id.startsWith('shotgun') ? 'shotgun' : 'sniper'; }

// Que mira cabe em que arma (pelo comprimento da mira): pistola e 12 so red dot pequeno, submetralhadora
// red dot/holografica, fuzil ate luneta media, sniper so luneta. A mira original do corpo sempre cabe.
// O indice na lista de miras continua o mesmo (e ele que decide o nivel de desbloqueio).
const SCOPE_LEN = { pistol: [0, 0.45], shotgun: [0, 0.45], smg: [0, 0.6], rifle: [0, 0.75], lmg: [0, 0.75], sniper: [0.6, 9] };
// corpos que aceitam luneta de sniper (31/10, pedido dele: lunetas no Bacamarte)
const LONG_SCOPE = { shotgun_1: ['sniper_scope_0', 'sniper_scope_1', 'sniper_scope_2'] };
// kit de conversao (01/11, pedido dele): muda o jeito da arma atirar. Comeca pela Espirro virando automatica:
// cadencia bem maior, cada tiro mais fraco, abre mais e pula mais. Outras armas: so com o OK dele.
export const CONV_KITS = {
  shotgun_2: { auto: { mode: 'auto', rate: 0.55, dmg: 0.78, spread: 1.15, kick: 1.25, reload: 1.1 } },
  subfusil_8: { auto: { mode: 'auto', kick: 1.08 } },
  fusil_7: { auto: { mode: 'auto', rate: 0.62, dmg: 0.72, spread: 1.1, kick: 1.2 } }, // Relampago automatica (02/11, pedido dele): cadencia de fuzil comum, cada tiro bem mais fraco que o semi
  fusil_12: { burst: { mode: 'burst', burst: 3, rate: 0.45, dmg: 0.6, kick: 0, spread: 0.9 } }, // Bico de Pena em rajada (03/11, pedido dele): 3 por puxada, coice ZERO, cada bala bem mais fraca
  sniper_0: { charge: { adsTime: 1.1, move: 0.95 } }, // Luneta: Canhao de Carga (01/11): segura 3 s = abate na hora, qualquer distancia // Dois Toques (SCAR-L) automatica: mesmo dano e cadencia da rajada, so o modo muda (pedido dele 01/11); libera no nivel do modelo
};
export const convOptions = (body) => Object.keys(CONV_KITS[body] || {});
// akimbo: pistola toda; nas compridas so um modelo (pedido dele 01/11)
const AKIMBO_BODIES = { smg: ['subfusil_5'], shotgun: ['shotgun_2'] };
export function handleFits(body, cat, id) { if (GADGETS[id]) return GADGETS[id].body === body; return id !== 'akimbo' || cat === 'pistol' || !!AKIMBO_BODIES[cat]?.includes(body); }
export function scopeFits(body, cat, id) {
  if (!id) return cat !== 'sniper';
  if (id === nativePart(body, 'scope')) return true;
  if (LONG_SCOPE[body]) { if (LONG_SCOPE[body].includes(id)) return true; } else if (id.startsWith('sniper_scope') && cat !== 'sniper') return false;
  const b = parts[id]?.box, r = SCOPE_LEN[cat];
  if (!b || !r) return true;
  const len = b.max.z - b.min.z;
  return len >= r[0] && len <= r[1];
}

// A primeira mira que cabe no corpo: sempre liberada e ja vem equipada (regra dele 30/10); o jogador troca ou tira
export function freeScope(cat, body) {
  const C = CATEGORY[cat];
  if (!C || cat === 'sniper' || cat === 'melee' || !C.scopes.length) return null;
  return C.scopes.find(id => scopeFits(body, cat, id)) || null;
}

export function defaultLoadout(cat) {
  const c = CATEGORY[cat];
  if (!c) return null;
  const body = c.bodies[0];
  if (cat === 'melee') return { body: 'melee_10', camo: null };
  return { body, scope: cat === 'sniper' ? nativePart(body, 'scope') : freeScope(cat, body), charger: nativePart(body, 'charger'), handle: null, paint: null, accent: null, camo: null, m1: 1 };
}

// peca original de um corpo (fusil_4 -> fusil_charguer_4)
export function nativePart(body, slot) {
  if (slot === 'scope' && parts[body]?.ww2) return null; // modelo trocado (Marretao = M107): a luneta de mesmo numero era do modelo velho e voava longe
  if (slot === 'charger' && parts[body]?.noCharger) return null; // pente dentro do cabo (Deagle, 04/11): nada pendurado
  const [, pre, n] = body.match(/^([a-z]+)_(\d+)$/) || [];
  if (!pre) return null;
  const names = slot === 'charger' ? [`${pre}_charger_${n}`, `${pre}_charguer_${n}`] : [`${pre}_${slot}_${n}`];
  for (const nm of names) if (parts[nm]) return nm;
  return null;
}
const SWAPPED = new Set(['sniper_scope_1', 'sniper_scope_2']); // lunetas com modelo trocado (04/11): nenhuma fica no lugar do modelo antigo
function ownerBody(part) {
  if (SWAPPED.has(part)) return null;
  if (/_scope_/.test(part) && parts[part.replace(/_scope_/, '_')]?.ww2) return null; // corpo trocado por modelo novo (Marretao = M107): a luneta de mesmo numero nao e mais dele
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
      if (pal) for (const [name, p] of Object.entries(parts)) if (/scope/.test(name)) { p.lens = stripLens(p.geo, pal); levelScope(p); }
    }).then(() => cutForeMounts()).then(() => loadWW2(loader)).then(() => loadRevolver(loader)).then(() => loadPack2(loader)).then(() => buildDrumMag()).then(() => buildExtMags()).then(() => swapSniperScopes()).catch(e => console.warn('low_poly_guns.glb nao carregou', e)),
    loader.loadAsync(import.meta.env.BASE_URL + 'models/src/melee.glb').then(g => {
      // cada mesh do arquivo vira melee_i: cabo no -z, ponta/cabeca no +z (sem a rotacao do Sketchfab)
      let i = 0;
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone(); geo.computeBoundingBox();
        const map = o.material.map; if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; }
        bladeMark(geo, BLADE_AT[i]); // camo so na lamina (04/11)
        parts['melee_' + i] = { geo, box: geo.boundingBox.clone(), map, melee: true };
        i++;
      });
    }).then(() => loadSwords(loader)).then(() => loadSaber(loader)).catch(e => console.warn('melee.glb nao carregou', e)),
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

// Suporte de punho que ja vem no corpo (inclinado): com empunhadura equipada ele some e o punho encaixa
// reto, direto embaixo do trilho, no meio de onde o suporte ficava. z = trecho do suporte, y = fundo do trilho
// (medidos no perfil do corpo). Sem empunhadura o corpo continua como veio.
const FORE_MOUNTS = { fusil_6: { z0: -4.62, z1: -4.2, y: 1.18 } };
// marcas a mao em corpos do pacote principal (fracao do comprimento a partir do cano), pedidos dele 30/10:
// Cuspideira: punho embaixo da ponta do corpo (pendia na quina de tras); Espirro: mira no trecho reto do
// receptor (na lombada da alca ela subia e ficava com vao)
const BODY_MARKS = { subfusil_5: { fore: 0.29 }, shotgun_2: { mid: 0.51 } };
// mira com bloco grande embaixo (pedido dele 30/10): fica so o pezinho + o tubo. below = topo do bloco
const SCOPE_TRIM = { fusil_scope_6: { below: 1.57 }, sniper_scope_1: { below: 8.785 } }; // luneta 1: so um tiquinho do pe embaixo do tubo (rente)
function cutForeMounts() {
  for (const [id, M] of Object.entries(BODY_MARKS)) {
    const P = parts[id];
    if (!P) continue;
    const zAt = (f) => P.box.min.z + (P.box.max.z - P.box.min.z) * f;
    if (M.fore !== undefined) P.fore = zAt(M.fore);
    if (M.mid !== undefined) P.mid = zAt(M.mid);
  }
  for (const [id, T] of Object.entries(SCOPE_TRIM)) {
    const P = parts[id];
    if (!P) continue;
    const g = P.geo.index ? P.geo.toNonIndexed() : P.geo, p = g.attributes.position, keep = [];
    for (let t = 0; t < p.count / 3; t++) if (Math.max(p.getY(t * 3), p.getY(t * 3 + 1), p.getY(t * 3 + 2)) > T.below) keep.push(t);
    P.geo = geoTake(g, keep);
    // o que sobrou e atravessa a linha (pe inclinado de cima a baixo) e' achatado nela: fica so um filete de pe
    const q = P.geo.attributes.position; for (let i = 0; i < q.count; i++) if (q.getY(i) < T.below) q.setY(i, T.below);
    P.geo.computeVertexNormals(); P.geo.computeBoundingBox(); P.box = P.geo.boundingBox.clone();
  }
  for (const [id, M] of Object.entries(FORE_MOUNTS)) {
    const P = parts[id];
    if (!P) continue;
    let g = P.geo.index ? P.geo.toNonIndexed() : P.geo.clone();
    const pos = g.attributes.position, keep = [];
    for (let i = 0; i < pos.count; i += 3) {
      let y = 0, z = 0;
      for (let k = 0; k < 3; k++) { y += pos.getY(i + k) / 3; z += pos.getZ(i + k) / 3; }
      if (z > M.z0 && z < M.z1 && y < M.y) continue; // triangulo do suporte
      keep.push(i, i + 1, i + 2);
    }
    const out = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(g.attributes)) {
      const arr = new a.array.constructor(keep.length * a.itemSize);
      keep.forEach((v, j) => { for (let c = 0; c < a.itemSize; c++) arr[j * a.itemSize + c] = a.array[v * a.itemSize + c]; });
      out.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize, a.normalized));
    }
    out.computeBoundingBox();
    P.geoNoFore = out;
    P.fore = (M.z0 + M.z1) / 2; P.foreY = M.y + 0.005;
  }
}

// ---------- pacote WW2 (so as armas de fogo) ----------
// Cada arma vira um corpo novo da categoria, com o pente original dela (ja vem encaixado no arquivo).
// O arquivo tem o comprimento em X: gira pro padrao do jogo (cano no -z, cima +y; o cano e a ponta mais
// fina) e escala pela media de comprimento da categoria. Cor pela regra das armas do pacote principal:
// metal na celula escura da paleta (leva a camuflagem), madeira na marrom (vira a area da cor de destaque).
// Os pentes vem SOLTOS ao lado da arma no arquivo (vitrine), entao cada um e encaixado aqui:
//   grip = dentro do cabo (pistola), hang = pendurado no poco (gira de deitado pra em pe), keep = ja vem no
//   lugar, null = sem pente separado (Garand e C96 tem clipe interno; a STG ja traz o pente no corpo).
// grip/well: fracao do comprimento a partir do cano (0 = boca, 1 = coronha), medida na folha do arsenal.
// sight: frente da alca de mira traseira (mesma fracao). A mira assenta com a traseira ali, por cima do
// guarda-mao, e nunca sobe por cima da alca. fore: onde o punho (grip) pendura, embaixo do guarda-mao logo
// atras do cano (referencia CoD); sem isso a busca automatica achava o pente que vem no corpo.
// mid: centro da mira, rente ao corpo em cima do pente (no lugar de sight). swap: madeira leva a camo e o
// metal a cor de destaque (Ping Velho).
const WW2 = [
  { node: 'M1 Garand_8', id: 'sniper_3', cat: 'sniper', k: 0.92, grip: 0.73, sight: 0.655, swap: true }, // Garand de atirador (M1C): mora na Luneta
  { node: 'STG 44_28', id: 'fusil_9', cat: 'rifle', k: 1, grip: 0.66, mid: 0.44, fore: 0.29 },  { node: 'M1911_13', mag: 'M1911 Maganize_17', fit: 'grip', id: 'pistol_7', cat: 'pistol', k: 1, grip: 0.81 },
  { node: 'Mauser C96_18', id: 'pistol_8', cat: 'pistol', k: 1.1, grip: 0.9 },
  { node: 'TT Pistol_38', mag: 'TT Pistol Maganize_42', fit: 'grip', id: 'pistol_9', cat: 'pistol', k: 0.95, grip: 0.83 },
];
export const WW2_BODIES = [...WW2.map(w => w.id), 'pistol_10']; // pistol_10 = revolver (nome proprio, fora da numeracao)

// Revolver (30/10, modelo dele): pecas soltas. Tambor e cao viram malhas proprias pra animar (tambor gira
// 1/6 por tiro, cao arma e bate); o resto vira o corpo. A camuflagem vai no material de MAIOR area e o
// destaque nos outros (pedido dele). Cano ja aponta pra -z.
const REV = { id: 'pistol_10', k: 1.08, grip: 0.84, mid: 0.6 };
function loadRevolver(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/revolver.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    const pal = paletteReader(gunTex);
    // metal (maior area) na zona VERDE: pinta com a Pintura e leva a camo (camoGreen); armacao e cabo no destaque
    const uvCamo = pal ? paletteUV(pal, [90, 170, 60]) : [0.5, 0.5], uvAccent = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5];
    const meshes = [];
    g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    // area por material: o maior leva a camo
    const area = {};
    const triArea = (ge) => { const p = ge.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); let s = 0; for (let i = 0; i < p.count; i += 3) { a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2); s += b.sub(a).cross(c.sub(a)).length() / 2; } return s; };
    // no espelhado (escala negativa no esqueleto) vira as faces do avesso: inverte a ordem dos vertices
    const unflip = (ge) => { const p = ge.attributes.position; for (let i = 0; i < p.count; i += 3) for (let c = 0; c < p.itemSize; c++) { const t = p.getComponent(i + 1, c); p.setComponent(i + 1, c, p.getComponent(i + 2, c)); p.setComponent(i + 2, c, t); } return ge; };
    const geos = meshes.map(o => { let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed(); if (o.matrixWorld.determinant() < 0) unflip(ge); for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k); const mn = o.material?.name || ''; area[mn] = (area[mn] || 0) + triArea(ge); return { ge, mn, node: o.parent?.name || o.name }; });
    const big = Object.entries(area).sort((x, y) => y[1] - x[1])[0]?.[0];
    for (const q of geos) { const uv = q.mn === big ? uvCamo : uvAccent, n = q.ge.attributes.position.count, a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; } q.ge.setAttribute('uv', new THREE.BufferAttribute(a, 2)); }
    const isDrum = (q) => /^Cylinder_/.test(q.node) || /^Cylinder$/.test(q.node), isHammer = (q) => /^Hammer/.test(q.node);
    // o tambor vem com as faces do avesso no proprio modelo (via-se por dentro e o contorno tampava): desvira
    for (const q of geos) if (isDrum(q)) unflip(q.ge);
    const bodyG = mergeGeometries(geos.filter(q => !isDrum(q) && !isHammer(q)).map(q => q.ge)), drumG = mergeGeometries(geos.filter(isDrum).map(q => q.ge)), hamG = mergeGeometries(geos.filter(isHammer).map(q => q.ge));
    // escala pelo comprimento medio das pistolas (sem as WW2) e centraliza
    const all = mergeGeometries([bodyG, drumG, hamG].filter(Boolean)); all.computeBoundingBox();
    const b = all.boundingBox, len = b.max.z - b.min.z, c = b.getCenter(new THREE.Vector3());
    const ls = CATEGORY.pistol.bodies.filter(id => parts[id] && !WW2_BODIES.includes(id)).map(id => parts[id].box.max.z - parts[id].box.min.z);
    const k = (ls.reduce((s, x) => s + x, 0) / Math.max(1, ls.length)) * REV.k / len;
    const m = new THREE.Matrix4().makeScale(k, k, k).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
    for (const ge of [bodyG, drumG, hamG]) if (ge) { ge.applyMatrix4(m); ge.computeVertexNormals(); ge.computeBoundingBox(); }
    const bb = bodyG.boundingBox.clone().union(drumG?.boundingBox || bodyG.boundingBox).union(hamG?.boundingBox || bodyG.boundingBox);
    const body = parts[REV.id] = { geo: bodyG, box: bb, ww2: true, camoGreen: true, metal: '#2a2724' };
    const blen = bb.max.z - bb.min.z, zAt = (f) => bb.min.z + blen * f;
    const pr = profile(REV.id), gz = zAt(REV.grip);
    body.grip = { zc: gz, z0: gz - blen * 0.04, z1: gz + blen * 0.04, lo: pr.lo[sliceOf(pr, gz)] };
    body.mid = zAt(REV.mid);
    // pecas animadas: tambor gira no proprio eixo (z); cao gira na base (x)
    if (drumG) { const db = drumG.boundingBox; body.drum = { geo: drumG, pivot: new THREE.Vector3((db.min.x + db.max.x) / 2, (db.min.y + db.max.y) / 2, 0) }; }
    if (hamG) { const hb = hamG.boundingBox; body.hammer = { geo: hamG, pivot: new THREE.Vector3((hb.min.x + hb.max.x) / 2, hb.min.y + (hb.max.y - hb.min.y) * 0.2, hb.min.z + (hb.max.z - hb.min.z) * 0.25) }; }
  }).catch(e => console.warn('revolver.glb nao carregou', e));
}
const nodeName = (s) => s.replace(/\s/g, '_').replace(/[[\].:/]/g, ''); // como o GLTFLoader renomeia
// celula da paleta mais perto da cor pedida (amostra so o miolo de areas lisas, longe das bordas)
function paletteUV(pal, rgb) {
  let best = null, bd = Infinity;
  const N = 96, dist = (c) => (c[0] - rgb[0]) ** 2 + (c[1] - rgb[1]) ** 2 + (c[2] - rgb[2]) ** 2;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const u = (i + 0.5) / N, v = (j + 0.5) / N, c = pal(u, v), d = dist(c);
    if (d >= bd) continue;
    const e = 0.6 / N, same = [[e, 0], [-e, 0], [0, e], [0, -e]].every(([a, b]) => { const q = pal(u + a, v + b); return Math.abs(q[0] - c[0]) + Math.abs(q[1] - c[1]) + Math.abs(q[2] - c[2]) < 12; });
    if (same) { bd = d; best = [u, v]; }
  }
  return best || [0.5, 0.5];
}
function loadWW2(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/ww2_weapons.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    const pal = paletteReader(gunTex);
    const uvMetal = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvWood = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5]; // marrom claro: cai na zona do destaque (claro), nao na da camo
    const merged = (obj, swap) => {
      const list = [];
      obj.traverse(o => {
        if (!o.isMesh) return;
        let ge = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (ge.index) ge = ge.toNonIndexed();
        for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k);
        const uv = /wood/i.test(o.material?.name || '') !== !!swap ? uvWood : uvMetal, n = ge.attributes.position.count, a = new Float32Array(n * 2);
        for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; }
        ge.setAttribute('uv', new THREE.BufferAttribute(a, 2));
        list.push(ge);
      });
      return list.length ? mergeGeometries(list) : null;
    };
    const avgLen = {};
    for (const w of WW2) {
      const gun = g.scene.getObjectByName(nodeName(w.node)), magObj = w.mag ? g.scene.getObjectByName(nodeName(w.mag)) : null;
      if (!gun) { console.warn('WW2: sem', w.node); continue; }
      const geo = merged(gun, w.swap), mgeo = magObj ? merged(magObj, w.swap) : null;
      if (!geo) continue;
      geo.computeBoundingBox();
      const b = geo.boundingBox, len = b.max.x - b.min.x, pos = geo.attributes.position;
      // cano = ponta mais fina (altura das pontas, 7% do comprimento de cada lado)
      const ext = (lo, hi) => { let a = Infinity, c = -Infinity; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); if (x >= lo && x <= hi) { const y = pos.getY(i); if (y < a) a = y; if (y > c) c = y; } } return c - a; };
      const muzzleMinX = ext(b.min.x, b.min.x + len * 0.07) <= ext(b.max.x - len * 0.07, b.max.x);
      // media de comprimento da categoria (corpos do pacote principal)
      const ref = avgLen[w.cat] ??= (() => { const ls = CATEGORY[w.cat].bodies.filter(id => parts[id] && !WW2_BODIES.includes(id)).map(id => parts[id].box.max.z - parts[id].box.min.z); return ls.reduce((s, x) => s + x, 0) / ls.length; })();
      const k = (ref * w.k) / len;
      const c = b.getCenter(new THREE.Vector3());
      const m = new THREE.Matrix4().makeScale(k, k, k)
        .multiply(new THREE.Matrix4().makeRotationY(muzzleMinX ? -Math.PI / 2 : Math.PI / 2))
        .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      const reg = (name, ge) => { ge.applyMatrix4(m); ge.computeVertexNormals(); ge.computeBoundingBox(); parts[name] = { geo: ge, box: ge.boundingBox.clone(), ww2: true }; return parts[name]; };
      const body = reg(w.id, geo), bb = body.box, blen = bb.max.z - bb.min.z, bh = bb.max.y - bb.min.y, bcx = (bb.min.x + bb.max.x) / 2;
      const zAt = (f) => bb.min.z + blen * f;
      // cabo da mao direita marcado a mao (o automatico se perde com coronha de madeira e pente solto)
      const pr = profile(w.id), gz = zAt(w.grip);
      body.grip = { zc: gz, z0: gz - blen * 0.04, z1: gz + blen * 0.04, lo: pr.lo[sliceOf(pr, gz)] };
      if (w.sight) body.sight = zAt(w.sight);
      if (w.mid) body.mid = zAt(w.mid);
      if (w.fore) body.fore = zAt(w.fore);
      if (!mgeo || !w.fit) continue;
      const mag = reg(w.id.replace(/_(\d+)$/, '_charger_$1'), mgeo);
      if (w.fit === 'keep') continue;
      const mg = mag.geo;
      if (w.fit === 'hang' && !w.upright) mg.rotateX(Math.PI / 2); // vem deitado ao longo do cano: fica em pe
      mg.computeBoundingBox();
      const mb = mg.boundingBox, mc = mb.getCenter(new THREE.Vector3());
      let tx = bcx - mc.x, ty, tz;
      if (w.fit === 'grip') { tz = body.grip.zc - mc.z; ty = bb.min.y + bh * 0.02 - mb.min.y; }
      else { const wz = zAt(w.well); tz = wz - mc.z; ty = pr.lo[sliceOf(pr, wz)] + bh * 0.06 - mb.max.y; }
      mg.translate(tx, ty, tz); mg.computeBoundingBox(); mag.box = mg.boundingBox.clone();
    }
  }).catch(e => console.warn('ww2_weapons.glb nao carregou', e));
}

// ---------- pacote 2 (AK, AR, DMR e MP5; pedido dele 30/10) ----------
// Vem deitado no eixo X, uma malha por material: preto = metal (leva a camo), branco = destaque.
// O pente vem colado no corpo: magCut recorta (fracoes do comprimento, a partir do cano) os triangulos
// abaixo do fundo do receptor nesse trecho e vira o pente original, entao os outros pentes encaixam no lugar.
// grip/mid/fore: mesmas marcas da WW2 (fracao a partir do cano). scopeCut tira a mira que vem colada.
const PACK2 = [
  
  { node: 'AR_7', id: 'fusil_11', cat: 'rifle', k: 1, grip: 0.7, mid: 0.52, magCut: [0.46, 0.58], scopeCut: [0.46, 0.56, 0.35] },
  { node: 'dmr .45_12', id: 'fusil_12', cat: 'rifle', k: 1.08, grip: 0.72, mid: 0.5, magCut: [0.46, 0.57] },
  { node: 'MP5_8', id: 'subfusil_13', cat: 'smg', k: 1, grip: 0.64, mid: 0.56, magCut: [0.37, 0.49] },
];
// AA-12 (pedido dele 30/10): escopeta automatica, malha unica com textura (a cor da textura decide as zonas).
// scopeCut tira a alca traseira alta (batia na mira) e scopeCut2 a massa da frente (aparecia no ADS).
const AA12 = [{ node: 'aa12', id: 'shotgun_3', cat: 'shotgun', k: 1, grip: 0.657, mid: 0.48, magCut: [0.4, 0.54], scopeCut: [0.6, 0.74], scopeCut2: [0, 0.16] }]; // scopeCut2: massa da frente (aparecia na mira ADS)
// pacote 3 (03/11, pedido dele; "Lowpoly Guns Package" de Ugur Yakisik, CC-BY 4.0 -> creditos): AK nova (fuzil) e a
// sniper que virou o modelo do Mestre-Cuca. Uma textura de paleta: warm = madeira laranja vai pro destaque.
// mag: o pente vem como peca SEPARADA no arquivo -> vira o pente original, pendurado no vao (well = fracao do cano)
const PACK3 = [
  { node: 'AK', id: 'fusil_13', cat: 'rifle', k: 1.04, grip: 0.7, mid: 0.52, fore: 0.32, warm: true, zUp: true, mag: 'AkMagazine', well: 0.46 },
  { node: 'Cube', id: 'sniper_4', cat: 'sniper', k: 1, grip: 0.72, mid: 0.56, fore: 0.36, zUp: true, darkCamo: 45, metal: '#3e4a2b', scopeCut: [0.42, 0.82] }, // toda verde e preta: a coronha (maior area) leva camo/pintura (oliva de fabrica), o metal escuro leva o destaque
];
// Escopeta serrada (03/11, pedido dele; "Sawed off shotgun low poly" de Mgt_Ganm12, CC-BY 4.0 -> creditos): secundaria
// de 2 tiros de chumbo, aceita akimbo, sem bocal. Dois materiais sem textura: lightMat (madeira vermelha) = destaque.
const SAWED = [{ node: 'RootNode', id: 'pistol_11', cat: 'pistol', k: 1.55, grip: 0.84, mid: 0.6, fore: 0.4, lightMat: 'Material', sawed: true }];
// "Low-Poly Weapon Asset Pack" (04/11, pedido dele; r2detta, CC-BY 4.0 -> creditos): as duas metralhadoras e o Deagle,
// que virou o modelo do Canhao de Mao. Cada peca vem num no proprio: mag = pente separado (sai do corpo e vira o pente
// original, lmg_charger_N); ref = categoria usada pra medir o tamanho (a Metralhadora ainda nao tem corpo pra comparar);
// noCharger = pente dentro do cabo (nenhum pente avulso encaixa)
const WPACK = [
  { node: 'M249', id: 'lmg_1', cat: 'lmg', ref: 'rifle', alongZ: true, k: 1.03, grip: 0.62, mid: 0.5, fore: 0.3, mag: 'M249_Magazine', well: 0.47, skip: ['M249_Top'], scopeCut: [0.2, 0.66], scopeCut2: [0, 0.22] } /* 04/11: o tubo inclinado (resto da alca) tambem sai */, // sem a alca/tampa e a massa da frente (tapavam as nossas miras, 04/11) // tampa do cofre aberta: tapava a mira
  { node: 'M60', id: 'lmg_2', cat: 'lmg', ref: 'rifle', alongZ: true, k: 1.07, grip: 0.6, mid: 0.5, fore: 0.3, mag: 'M60_Magazine', well: 0.5, skip: ['M60_Top'], scopeCut: [0.36, 0.57], scopeCut2: [0, 0.22] } /* 04/11: ate 0,66 levava o fim do corpo (coronha ficava solta) */,
  { node: 'Deagle', id: 'pistol_3', cat: 'pistol', alongZ: true, k: 0.97, grip: 0.78, mid: 0.55, fore: 0.35, noCharger: true },
];
// M107 (04/11, pedido dele; "Low Poly M107" de LowPolyCount, CC-BY 4.0 -> creditos): virou o modelo do Marretao.
// Vem sem luneta (as nossas entram), freio de boca proprio, pente separado (vira o pente original sniper_charger_2)
const M107 = [{ node: 'Root', id: 'sniper_2', cat: 'sniper', alongZ: true, k: 1.06, grip: 0.77, mid: 0.6, fore: 0.4, mag: 'Cube.001', well: 0.655 }];
// Acessorios do "Low Poly Attachments-Pistol" (04/11, pedido dele; CastleBravo, CC-BY 4.0 -> creditos): os dois
// silenciadores, o laser e a lanterna (as miras do pacote NAO entram). Deitados no Z, centrados, frente no -z (flip
// = o arquivo vem com a frente no +z). Textura de paleta: claro = destaque, o resto escuro
const ATT = {};
const ATT_NODES = { supA: ['Muzzle_Pistol_Suppressor_A'], supB: ['Muzzle_Pistol_Suppressor_B'], laser: ['Laser_Pistol_A'], light: ['Light_Pistol_A'] };
function loadAttach(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/attach_pistol.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    const pal = paletteReader(gunTex), uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5], uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvBlack = pal ? paletteUV(pal, [30, 30, 30]) : [0.4, 0.4];
    for (const [k, [nm, flip]] of Object.entries(ATT_NODES)) {
      const node = g.scene.getObjectByName(nodeName(nm)); if (!node) { console.warn('acessorio: sem', nm); continue; }
      const list = [];
      node.traverse(o => {
        if (!o.isMesh) return;
        let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed();
        const tex = o.material?.map ? paletteReader(o.material.map) : null, uv0 = ge.attributes.uv, n = ge.attributes.position.count, a = new Float32Array(n * 2);
        for (let i = 0; i < n; i += 3) {
          let L = 40; if (tex && uv0) { const c = tex((uv0.getX(i) + uv0.getX(i + 1) + uv0.getX(i + 2)) / 3, (uv0.getY(i) + uv0.getY(i + 1) + uv0.getY(i + 2)) / 3); L = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; }
          const uv = L > 120 ? uvLight : L > 45 ? uvDark : uvBlack;
          for (let j = 0; j < 3; j++) { a[(i + j) * 2] = uv[0]; a[(i + j) * 2 + 1] = uv[1]; }
        }
        for (const key of Object.keys(ge.attributes)) if (key !== 'position' && key !== 'normal') ge.deleteAttribute(key);
        ge.setAttribute('uv', new THREE.BufferAttribute(a, 2)); list.push(ge);
      });
      if (!list.length) continue;
      const geo = mergeGeometries(list); if (flip) geo.rotateY(Math.PI);
      geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x, -c.y, -c.z);
      geo.computeVertexNormals(); geo.computeBoundingBox(); ATT[k] = geo;
    }
  }).catch(e => console.warn('attach_pistol.glb nao carregou', e));
}
export const debugAtt = () => ATT;
export const PACK2_BODIES = [...PACK2, ...AA12, ...PACK3, ...SAWED, ...WPACK, ...M107].map(w => w.id);
// ilhas: grupos de triangulos ligados por vertice (cada peca fechada do modelo low-poly)
function geoIslands(ge) {
  const p = ge.attributes.position, nT = p.count / 3, par = new Int32Array(nT).map((_, i) => i), seen = new Map();
  const find = (x) => { while (par[x] !== x) x = par[x] = par[par[x]]; return x; };
  for (let t = 0; t < nT; t++) for (let j = 0; j < 3; j++) {
    const v = t * 3 + j, key = Math.round(p.getX(v) * 1e4) + ',' + Math.round(p.getY(v) * 1e4) + ',' + Math.round(p.getZ(v) * 1e4);
    const o = seen.get(key); if (o === undefined) seen.set(key, t); else { const a = find(o), c = find(t); if (a !== c) par[a] = c; }
  }
  const groups = new Map();
  for (let t = 0; t < nT; t++) { const r = find(t); let gr = groups.get(r); if (!gr) groups.set(r, gr = { tris: [], box: new THREE.Box3() }); gr.tris.push(t); for (let j = 0; j < 3; j++) gr.box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p, t * 3 + j)); }
  return [...groups.values()];
}
// pinta a peca inteira numa cor da paleta (pente recortado do corpo vira peca escura, nao zona verde)
function setUV(ge, uv) { const n = ge.attributes.position.count, a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; } ge.setAttribute('uv', new THREE.BufferAttribute(a, 2)); return ge; }
function geoTake(ge, tris) { const o = new THREE.BufferGeometry(); for (const [nm, a] of Object.entries(ge.attributes)) { const arr = new a.array.constructor(tris.length * 3 * a.itemSize); tris.forEach((t, j) => { for (let q = 0; q < 3 * a.itemSize; q++) arr[j * 3 * a.itemSize + q] = a.array[t * 3 * a.itemSize + q]; }); o.setAttribute(nm, new THREE.BufferAttribute(arr, a.itemSize)); } o.computeBoundingBox(); return o; }
// miras de ferro de encaixe (01/11, pedido dele): alca atras + massa na frente, montadas no topo (trilho vazio).
// Funcionais: a linha de visada passa pelo centro da alca e pela ponta da massa, e e por ela que a mira (ADS) olha.
// Fora da lista CATEGORY.scopes de proposito (nao mexe nos desbloqueios por indice nem nos perfis de mira).
const SCOPE_FWD = { sniper_0: 0.16 }; // fracao do comprimento que a mira anda pra frente nesse corpo
const SNIPER_SCOPE_NAME = { sniper_scope_0: 'scNormal', sniper_scope_1: 'scMil', sniper_scope_2: 'scThermal', fusil_scope_6: 'scZoom' }; // pelo SCOPE_KIND: hunt, mil, thermal, vari
// o resto das miras (04/11, pedido dele): nome pelo que cada uma e, nada de 'Ponto vermelho 7' (scn_<id> no i18n)
const SCOPE_ZOOM = { fusil_scope_4: 1.4, fusil_scope_5: 1.4, fusil_scope_2: 1.4, subfusil_scope_7: 3 }; // 04/11: Holografica Longa, Poste, Rampa e Combate
const SCOPE_NAMED = ['pistol_scope_5','subfusil_scope_2','subfusil_scope_6','subfusil_scope_9','subfusil_scope_1','subfusil_scope_5','subfusil_scope_7','subfusil_scope_8','subfusil_scope_10','fusil_scope_1','fusil_scope_7','fusil_scope_2','fusil_scope_4','fusil_scope_5'];
for (const id of SCOPE_NAMED) SNIPER_SCOPE_NAME[id] = 'scn_' + id;
export const IRONS = {
  iron_flip: {},                                  // Mira de Trilho (padrao): alca de furo com orelhas + massa com orelhas e ponto verde
  iron_hood: { adsTime: 0.94, spread: 0.96 },     // Mira de Trilho com Aro: massa dentro de um aro fechado, ponto vermelho (estilo da foto do COD)
  iron_own: { adsTime: 0.9 },                     // so pistola (04/11, pedido dele): sem peca nenhuma, mira pela alca e massa do proprio modelo
};
const IRON_OWN = 'iron_own';
export const DEFAULT_IRON = 'iron_flip';
export const ironOptions = (cat) => (cat === 'sniper' || cat === 'melee' ? [] : Object.keys(IRONS).filter(id => id !== IRON_OWN || ['pistol', 'rifle', 'smg', 'shotgun'].includes(cat))); // alca propria: pistola, fuzil, submetralhadora e escopeta (04/11)
// alca do proprio modelo (04/11): a linha de mira passa na ponta da massa (o ponto mais alto da frente do corpo, perto do
// eixo); o ADS poe esse ponto no centro da tela, entao a massa fica rente ao crosshair
function ownIronPoint(body, cx) {
  const pr = profile(body), b = parts[body].box, N = pr.hi.length; let y = -Infinity, k = 0;
  for (let i = 0; i < Math.ceil(N * 0.8); i++) if (pr.hi[i] > y) { y = pr.hi[i]; k = i; } /* ate 80%: a parte mais alta antes da coronha (alca/ferrolho) nao pode tapar a linha */
  return new THREE.Vector3(cx, y + 0.008, b.min.z + (b.max.z - b.min.z) * 0.62);
}
// miras de trilho (01/11, fotos dele): alca atras = base no trilho, duas orelhas de protecao, disco com furo (peep) e
// botao de regulagem do lado; massa na frente = base, orelhas (ou aro fechado) e pino com ponto colorido no topo.
// A linha de visada passa pelo centro do furo e pelo ponto; e por ela que a mira (ADS) olha.
function addIrons(id, body, inner, origin, partMat) {
  const b = parts[body].box, len = b.max.z - b.min.z, cx = axisX(body), w = b.max.x - b.min.x;
  const zR = b.min.z + len * 0.6, zF = b.min.z + len * 0.08;
  const top = (z0, z1) => { const y = hiUnder(body, cx, w * 0.18, z0, z1); return Number.isFinite(y) ? y : b.max.y; };
  const yR = top(zR - len * 0.03, zR + len * 0.03), yF = top(zF - len * 0.03, zF + len * 0.03), u = len * 0.016;
  const H = Math.max(yR, yF, top(zF, b.max.z)) + u * 2.6; // acima de tudo entre a massa e a coronha
  const pal = paletteReader(gunTex), uvA = pal ? paletteUV(pal, [30, 30, 30]) : [0.4, 0.4];
  const gs = [], put = (ge, x, y, z) => { ge.translate(x, y, z); if (ge.index) ge = ge.toNonIndexed(); ge.deleteAttribute('uv'); setUV(ge, uvA); gs.push(ge); };
  const block = (bw, y0, y1, bd, x, z) => put(new THREE.BoxGeometry(bw, Math.max(0.001, y1 - y0), bd), x, (y0 + y1) / 2, z);
  // ---- alca (tras) ----
  block(u * 4.6, yR, yR + u * 1.1, u * 3.4, cx, zR);                       // base presa no trilho
  block(u * 2.2, yR + u * 1.1, H - u * 1.75, u * 1.1, cx, zR);             // corpo que sobe ate o furo (baixo: nao tampa a vista)
  for (const sd of [-1, 1]) block(u * 0.45, yR + u * 1.1, H + u * 1.4, u * 1.3, cx + sd * u * 2.3, zR); // orelhas de protecao (finas)
  const peep = new THREE.TorusGeometry(u * 1.35, u * 0.28, 8, 22); put(peep, cx, H, zR); // anel do furo (vazado: a massa aparece la dentro)
  const knob = new THREE.CylinderGeometry(u * 0.55, u * 0.55, u * 0.7, 10); knob.rotateZ(Math.PI / 2); put(knob, cx + u * 2.7, H - u * 1.4, zR); // botao de regulagem
  // ---- massa (frente) ----
  block(u * 3.6, yF, yF + u * 1.1, u * 3, cx, zF);                         // base
  block(u * 0.55, yF + u * 1.1, H, u * 0.6, cx, zF);                       // pino
  if (id === 'iron_hood') {
    const hood = new THREE.TorusGeometry(u * 1.75, u * 0.38, 8, 20); put(hood, cx, H - u * 0.2, zF); // aro fechado em volta do pino
    block(u * 1.4, yF + u * 1.1, H - u * 1.8, u * 1.2, cx, zF);            // pescoco que segura o aro
  } else {
    for (const sd of [-1, 1]) block(u * 0.6, yF + u * 1.1, H + u * 0.6, u * 1.3, cx + sd * u * 1.5, zF); // orelhas abertas
  }
  const geo = mergeGeometries(gs); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, partMat); outline(m, 0.0035); m.position.copy(origin).multiplyScalar(-1); inner.add(m);
  // pontos que acendem (tritio): verde na massa padrao, vermelho na de aro; dois verdinhos na alca
  const dot = new THREE.Mesh(new THREE.SphereGeometry(u * 0.36, 10, 8), new THREE.MeshBasicMaterial({ color: id === 'iron_hood' ? 0xff4a3a : 0x6cff6c }));
  dot.position.set(cx, H, zF).sub(origin); inner.add(dot);
  for (const sd of [-1, 1]) { const d2 = new THREE.Mesh(new THREE.SphereGeometry(u * 0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6cff6c })); d2.position.set(cx + sd * u * 1.9, H + u * 0.3, zR + u * 0.75).sub(origin); inner.add(d2); }
  return new THREE.Vector3(cx, H, zR + len * 0.04).sub(origin).multiplyScalar(S);
}

// bocais (01/11, pedido dele): toda arma de fogo (lamina nao). Entram no lugar da ponta do cano.
// Cada um com ganho e perda (estilo COD). flash = quanto do clarao sobra; quiet = tiro abafado.
export const MUZZLES = { // na ordem do nivel da arma que abre (progress.js MUZZLE_LVL)
  comp: { kick: 0.88, spread: 0.94, hip: 1.06 },                                                         // compensador: cano sobe menos, quadril um pouco pior
  flash: { hip: 0.92, spread: 0.97, kick: 1.04, flash: 0.35 },                                           // quebra-chama: pouco clarao, coice um tico maior
  brake: { kick: 0.8, adsTime: 1.05 },                                                                  // freio de boca: segura o coice, pesa na mira
  silencer: { spread: 0.96, kick: 0.95, adsTime: 1.08, move: 0.98, dmg: 0.94, flash: 0.15, quiet: true }, // silenciador: quase sem clarao e abafado; dano e mira mais lentos
  silencer2: { spread: 0.94, kick: 0.9, adsTime: 1.12, move: 0.96, dmg: 0.95, flash: 0.08, quiet: true }, // supressor pesado (04/11): mais comprido e grosso, segura mais o coice, pesa mais
};
const MUZZLE_BAN = ['sniper_0', 'sniper_2', 'sniper_3', 'pistol_5', 'pistol_11']; // + serrada (03/11) // Luneta, Marretao, Ping Velho e Bico Longo: sem bocal (pedido dele 01/11)
export const muzzleFits = (body) => !!body && !body.startsWith('melee') && !!parts[body] && !MUZZLE_BAN.includes(body);
export const muzzleOptions = (body) => (muzzleFits(body) ? Object.keys(MUZZLES) : []);
// ponta do cano no modelo: centro e raio dos vertices da frente (z minimo = boca)
const tips = {};
// ajuste da altura do bocal por corpo (fracao da altura): Bacamarte tem a massa de mira na boca e o bocal subia (04/11)
const MUZZLE_DY = { fusil_9: -0.175 }; // StG: cano fino embaixo da massa de mira
function barrelTip(body) {
  if (tips[body]) return tips[body];
  const P = parts[body], b = P.box, len = b.max.z - b.min.z, pos = P.geo.attributes.position, bb = new THREE.Box3();
  const ys = [];
  for (let i = 0; i < pos.count; i++) if (pos.getZ(i) <= b.min.z + len * 0.035) { bb.expandByPoint(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))); ys.push(pos.getY(i)); }
  const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  // altura pela mediana dos pontos da boca: massa de mira alta na ponta (Trovao de Lata) puxava o bocal pra cima
  if (ys.length) { ys.sort((p, q) => p - q); c.y = ys[ys.length >> 1]; sz.y = Math.min(sz.y, sz.x * 1.2); }
  // 04/11: separa os pontos da boca em grupos por altura (vao > 18% da altura da fatia) e fica com o mais LARGO: a massa
  // de mira/baioneta e fina e alta e puxava o bocal pra cima do cano (StG, Bacamarte)
  {
    const pts = []; for (let i = 0; i < pos.count; i++) if (pos.getZ(i) <= b.min.z + len * 0.035) pts.push([pos.getX(i), pos.getY(i)]);
    pts.sort((p, q) => p[1] - q[1]);
    const H = pts.length ? pts[pts.length - 1][1] - pts[0][1] : 0, groups = [];
    let cur = [];
    for (const p of pts) { if (cur.length && p[1] - cur[cur.length - 1][1] > H * 0.18) { groups.push(cur); cur = []; } cur.push(p); }
    if (cur.length) groups.push(cur);
    if (groups.length > 1) {
      const wid = (g) => Math.max(...g.map(p => p[0])) - Math.min(...g.map(p => p[0]));
      const best = groups.reduce((a, g) => (wid(g) > wid(a) ? g : a)); // o mais largo = o cano (massa de mira e haste sao finas)
      const y0 = best[0][1], y1 = best[best.length - 1][1];
      c.y = (y0 + y1) / 2; sz.y = Math.min(y1 - y0, wid(best) * 1.2); /* meio do cano */ sz.x = wid(best);
    }
  }
  if (MUZZLE_DY[body]) c.y += (b.max.y - b.min.y) * MUZZLE_DY[body];
  if (P.muzzles?.length) { c.x = P.muzzles[0].x; c.y = P.muzzles[0].y; sz.set(0, 0, 0); } /* varias bocas: o principal vai no cano de cima */
  // raio limitado pelo comprimento da arma: ponta larga (ferrolho da pistola, chapa da sniper) deixava o bocal gordo demais
  return (tips[body] = { c, r: Math.min(len * 0.026, Math.max(len * 0.012, Math.max(sz.x, sz.y) / 2)), z: b.min.z, len });
}
// geometria do bocal em pe (eixo +y = pra frente), base em y = 0
function muzzleGeo(id, r, len, uvA, uvB) {
  const SUP = { silencer: ['supA', 1.45, 0.3], silencer2: ['supB', 1.7, 0.34] }[id];
  if (SUP && ATT[SUP[0]]) { // silenciadores do pacote de acessorios (04/11): raio pela boca do cano, comprimento limitado
    const g = ATT[SUP[0]].clone(); g.computeBoundingBox();
    const bb = g.boundingBox, nat = bb.max.z - bb.min.z, rad = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y) / 2, sc = (r * SUP[1]) / rad;
    g.scale(sc, sc, Math.min(nat * sc, len * SUP[2]) / nat);
    g.rotateX(Math.PI / 2); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); // em pe: frente (-z) vira +y, base em y = 0
    return g;
  }
  const gs = [], put = (ge, uv, x, y, z) => { ge.translate(x, y, z); if (ge.index) ge = ge.toNonIndexed(); ge.deleteAttribute('uv'); setUV(ge, uv); gs.push(ge); };
  if (id === 'silencer') { // tubo longo e grosso com 2 cintas
    const L = len * 0.3, R = r * 1.55;
    put(new THREE.CylinderGeometry(R, R, L, 16), uvA, 0, L / 2, 0);
    for (const f of [0.12, 0.88]) put(new THREE.CylinderGeometry(R * 1.06, R * 1.06, L * 0.06, 16), uvB, 0, L * f, 0);
    put(new THREE.CylinderGeometry(R * 0.45, R * 0.45, L * 0.02, 12), uvB, 0, L * 1.005, 0);
  } else if (id === 'brake') { // laminas chatas com janelas entre elas
    const L = len * 0.1, W = r * 2.8, H = r * 2;
    for (const f of [0, 0.4, 0.8]) put(new THREE.BoxGeometry(W, L * 0.2, H), uvA, 0, L * (f + 0.1), 0);
    put(new THREE.BoxGeometry(W * 0.45, L, H * 0.7), uvA, 0, L / 2, 0); // miolo ligando as laminas
  } else if (id === 'comp') { // cilindro curto com 3 furos em cima
    const L = len * 0.1, R = r * 1.35;
    put(new THREE.CylinderGeometry(R, R * 1.05, L, 14), uvA, 0, L / 2, 0);
    for (let i = 0; i < 3; i++) put(new THREE.BoxGeometry(R * 0.35, R * 0.3, R * 0.35), uvB, 0, L * (0.25 + i * 0.25), R * 0.9);
  } else { // quebra-chama: anel e 4 garras abertas na frente
    const L = len * 0.11, R = r * 1.25;
    put(new THREE.CylinderGeometry(R, R, L * 0.45, 14), uvA, 0, L * 0.225, 0);
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2; put(new THREE.BoxGeometry(R * 0.38, L * 0.6, R * 0.38), uvA, Math.cos(a) * R * 0.78, L * 0.7, Math.sin(a) * R * 0.78); }
  }
  const g = mergeGeometries(gs); g.computeVertexNormals();
  return g;
}

// pente de tambor da Pipoqueira (01/11, pedido dele): 40 balas, recarga lenta. Procedural: gargalo que entra no
// poco do pente original + tambor redondo deitado de lado, com tampa e parafusos. So encaixa na pistol_2.
export const DRUM_MAGS = { pistol_drum: { body: 'pistol_2', rounds: 40, reload: 1.55, adsTime: 1.14, move: 0.95, kick: 0.92 },
  // pentes estendidos da Cuspideira (04/11, pedido dele): o pente de fabrica esticado pra baixo (mesma boca e largura:
  // encaixa no mesmo poco, sem malha cruzando). magK = multiplica o pente; ext = quanto estica a altura
  subfusil_ext_1: { body: 'subfusil_5', of: 'subfusil_charguer_5', ext: 1.45, magK: 1.4, reload: 1.12, adsTime: 1.05, move: 0.98, kick: 1 },
  subfusil_ext_2: { body: 'subfusil_5', of: 'subfusil_charguer_5', ext: 1.95, magK: 1.8, reload: 1.25, adsTime: 1.1, move: 0.96, kick: 0.97 },
};
// troca de modelo das lunetas (04/11, pedido dele): a Militar ganha o desenho da Termica e a Termica o da Militar.
// Troca so a peca (geometria, caixa, lente): id, nome, jeito de mirar, desafio e variantes continuam os mesmos
function swapSniperScopes() {
  const a = parts.sniper_scope_1, b = parts.sniper_scope_2;
  if (a && b) { parts.sniper_scope_1 = b; parts.sniper_scope_2 = a; }
}
// estica o pente de fabrica pra baixo a partir da boca (topo fica no lugar); uma cinta na base marca o tamanho novo
function buildExtMags() {
  const pal = paletteReader(gunTex), uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5];
  for (const [id, D] of Object.entries(DRUM_MAGS)) {
    if (!D.ext || !parts[D.of]) continue;
    const src = parts[D.of], top = src.box.max.y, h = src.box.max.y - src.box.min.y;
    let g = src.geo.clone(); if (g.index) g = g.toNonIndexed();
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, top - (top - P.getY(i)) * D.ext);
    g.computeBoundingBox(); const b = g.boundingBox;
    let band = new THREE.BoxGeometry((b.max.x - b.min.x) * 1.08, h * 0.12, (b.max.z - b.min.z) * 1.08); band.translate((b.min.x + b.max.x) / 2, b.min.y + h * 0.1, (b.min.z + b.max.z) / 2); band = band.toNonIndexed(); band.deleteAttribute('uv'); setUV(band, uvLight);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) setUV(g, uvLight);
    const geo = mergeGeometries([g, band]); geo.computeVertexNormals(); geo.computeBoundingBox();
    parts[id] = { geo, box: geo.boundingBox.clone(), ww2: src.ww2, extMag: true };
  }
}
function buildDrumMag() {
  const nat = parts.pistol_charger_2;
  if (!nat) return;
  const pal = paletteReader(gunTex), uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5];
  const b = nat.box, w = b.max.x - b.min.x, d = b.max.z - b.min.z, h = b.max.y - b.min.y;
  const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
  const geos = [];
  const put = (ge, uv, x, y, z, rx = 0, rz = 0) => { ge.rotateX(rx); ge.rotateZ(rz); ge.translate(x, y, z); if (ge.index) ge = ge.toNonIndexed(); ge.deleteAttribute('uv'); setUV(ge, uv); geos.push(ge); };
  // estilo tambor de Glock (foto dele): gargalo comprido que atravessa o cabo e sai por baixo dele, e o tambor
  // pendurado BEM abaixo do cabo (antes encostava e entrava no modelo). Tudo preto, face lisa com parafusos.
  const neckBot = b.min.y - h * 0.3;
  put(new THREE.BoxGeometry(w * 0.92, b.max.y - neckBot, d * 0.82), uvDark, cx, (b.max.y + neckBot) / 2, cz);
  put(new THREE.BoxGeometry(w * 1.25, h * 0.08, d * 1.0), uvDark, cx, neckBot + h * 0.04, cz); // colar onde o gargalo encontra o tambor
  const R = Math.max(d * 1.15, h * 0.53), T = w * 1.5, cy = neckBot - R * 0.88, zc = cz - d * 0.12; // um tico pra frente, como na foto
  put(new THREE.CylinderGeometry(R, R, T, 24), uvDark, cx, cy, zc, 0, Math.PI / 2);
  for (const sd of [-1, 1]) {
    put(new THREE.CylinderGeometry(R * 0.9, R * 0.9, T * 0.08, 24), uvDark, cx + sd * T * 0.52, cy, zc, 0, Math.PI / 2); // tampa um pouco saltada
    put(new THREE.CylinderGeometry(R * 0.2, R * 0.2, T * 0.1, 12), uvDark, cx + sd * T * 0.58, cy, zc, 0, Math.PI / 2);  // botao de corda
    for (let i = 0; i < 4; i++) { const a = (i + 0.5) / 4 * Math.PI * 2; put(new THREE.CylinderGeometry(R * 0.05, R * 0.05, T * 0.06, 6), uvDark, cx + sd * T * 0.57, cy + Math.sin(a) * R * 0.72, zc + Math.cos(a) * R * 0.72, 0, Math.PI / 2); }
  }
  const geo = mergeGeometries(geos);
  geo.computeVertexNormals(); geo.computeBoundingBox();
  parts.pistol_drum = { geo, box: geo.boundingBox.clone(), ww2: true, drumMag: true };
}
function loadPack2(loader) { return loadWSkins(loader).then(() => loadPackFile(loader, 'rifle_pack.glb', PACK2)).then(() => loadPackFile(loader, 'aa12.glb', AA12)).then(() => loadPackFile(loader, 'lowpoly_guns_package.glb', PACK3)).then(() => loadPackFile(loader, 'sawed_off.glb', SAWED)).then(() => loadPackFile(loader, 'low-poly_weapon_asset_pack.glb', WPACK)).then(() => loadPackFile(loader, 'm107.glb', M107)).then(() => loadAttach(loader)).then(() => loadRpg(loader)).then(() => buildGadgetParts()); }
// gadgets de baixo do cano (03/11): desenho proprio, montado no tamanho do modelo dono; encaixa como empunhadura
// (topo da peca no guarda-mao). Tanque/bocal escuros levam o destaque; faixa vermelha de aviso.
function buildGadgetParts() {
  const pal = paletteReader(gunTex), uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5];
  const piece = (ge, uv, x, y, z, rx = 0) => { if (rx) ge.rotateX(rx); ge.translate(x, y, z); if (ge.index) ge = ge.toNonIndexed(); setUV(ge, uv); return ge; };
  for (const [id, G] of Object.entries(GADGETS)) {
    const B = parts[G.body]; if (!B) continue;
    const L = B.box.max.z - B.box.min.z, list = [];
    if (id === 'gd_flame') { // tanque de gas deitado + bocal comprido com chama-piloto
      list.push(piece(new THREE.CylinderGeometry(0.045 * L, 0.045 * L, 0.2 * L, 14), uvLight, 0, -0.06 * L, 0.02 * L, Math.PI / 2));
      list.push(piece(new THREE.CylinderGeometry(0.047 * L, 0.047 * L, 0.03 * L, 14), uvDark, 0, -0.06 * L, 0.08 * L, Math.PI / 2));
      list.push(piece(new THREE.CylinderGeometry(0.014 * L, 0.018 * L, 0.2 * L, 10), uvDark, 0, -0.03 * L, -0.15 * L, Math.PI / 2));
      list.push(piece(new THREE.CylinderGeometry(0.024 * L, 0.02 * L, 0.035 * L, 10), uvDark, 0, -0.03 * L, -0.26 * L, Math.PI / 2));
      list.push(piece(new THREE.BoxGeometry(0.03 * L, 0.03 * L, 0.12 * L), uvDark, 0, -0.005 * L, -0.02 * L));
    } else { // escopetinha: tubo + telha de bombear + trilho
      list.push(piece(new THREE.CylinderGeometry(0.022 * L, 0.022 * L, 0.36 * L, 12), uvDark, 0, -0.035 * L, -0.08 * L, Math.PI / 2));
      list.push(piece(new THREE.CylinderGeometry(0.03 * L, 0.03 * L, 0.12 * L, 12), uvLight, 0, -0.035 * L, -0.04 * L, Math.PI / 2));
      list.push(piece(new THREE.BoxGeometry(0.03 * L, 0.025 * L, 0.26 * L), uvDark, 0, -0.005 * L, -0.06 * L));
    }
    const geo = mergeGeometries(list); if (id === 'gd_flame') geo.translate(0, 0, -0.07 * L); // tanque pra frente: nao encosta no pente
    geo.computeVertexNormals(); geo.computeBoundingBox();
    parts[id] = { geo, box: geo.boundingBox.clone(), gadget: true };
  }
}

// ---------- Bazuca (sequencia, 03/11): RPG e o foguete do pacote 3, com a textura original ----------
// Arquivo com Z pra cima: deita, eixo mais comprido vira Z, boca (ponta mais fina do tubo / ogiva do foguete) no -Z.
function packPiece(g, name, frontThin) {
  const o0 = g.scene.getObjectByName(name); if (!o0) return null;
  const list = []; let map = null;
  o0.traverse(o => { if (!o.isMesh) return; let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed(); for (const k of Object.keys(ge.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ge.deleteAttribute(k); list.push(ge); map ||= o.material?.map || null; });
  if (!list.length) return null;
  const ge = mergeGeometries(list); ge.rotateX(Math.PI / 2); ge.computeBoundingBox();
  const s = ge.boundingBox.getSize(new THREE.Vector3());
  if (s.x > s.z) ge.rotateY(Math.PI / 2);
  ge.computeBoundingBox(); ge.center(); ge.computeBoundingBox();
  const b = ge.boundingBox, len = b.max.z - b.min.z, pos = ge.attributes.position;
  const thick = (lo, hi) => { let a = Infinity, c = -Infinity; for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z >= lo && z <= hi) { const y = pos.getY(i); a = Math.min(a, y); c = Math.max(c, y); } } return c - a; };
  const minThin = thick(b.min.z, b.min.z + len * 0.08) < thick(b.max.z - len * 0.08, b.max.z);
  if (minThin !== frontThin) ge.rotateY(Math.PI); // boca no -Z
  ge.scale(1 / len, 1 / len, 1 / len); ge.computeVertexNormals(); ge.computeBoundingBox();
  // centro da boca (fatia da frente): o foguete e o cano saem DAQUI, nao do centro da caixa (cabo e alca puxavam pra baixo)
  const P = ge.attributes.position, z0 = ge.boundingBox.min.z; let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < P.count; i++) if (P.getZ(i) < z0 + 0.03) { sx += P.getX(i); sy += P.getY(i); n++; }
  return { geo: ge, map, mouth: n ? [sx / n, sy / n] : [0, 0], front: z0 };
}
function loadRpg(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/lowpoly_guns_package.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    parts.__rpg = packPiece(g, 'RPG', true);
    parts.__rocket = packPiece(g, 'RPGAmmo', false); // foguete: a ogiva (grossa) vai na frente
  }).catch(e => console.warn('bazuca nao carregou', e));
}
const rpgMat = () => (parts.__rpgMat ||= toon(0xffffff, { map: parts.__rpg?.map || parts.__rocket?.map || null }));
function buildRpg() {
  const holder = new THREE.Group(), inner = new THREE.Group();
  const m = new THREE.Mesh(parts.__rpg.geo, rpgMat()); outline(m, 0.0055);
  // o eixo da boca do tubo fica na linha do centro da arma (x 0, y 0.03): o modelo desce/anda pra isso
  const R = parts.__rpg, K = 1.05, mx = R.mouth[0] * K, my = R.mouth[1] * K, front = -0.12 + R.front * K;
  inner.add(m); inner.scale.setScalar(K); inner.position.set(-mx, 0.03 - my, -0.12);
  // foguete encaixado na boca, no mesmo eixo, metade pra fora (some quando sai e volta na recarga)
  const ammo = parts.__rocket ? new THREE.Mesh(parts.__rocket.geo, rpgMat()) : null;
  if (ammo) { const s = 0.42; ammo.scale.setScalar(s); ammo.position.set(0, 0.03, front - s * 0.22); holder.add(ammo); }
  holder.add(inner);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, front);
  const gripR = new THREE.Object3D(); gripR.position.set(0, -0.1, 0.0);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.04, -0.1, -0.2);
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'rpg', muzzle, gripR, gripL, scope: null, stats: {}, rocket: ammo };
  return holder;
}
// foguete voando (mundo): mesma malha, ogiva pra frente (-Z = pra onde vai)
export function rocketMesh() {
  if (!parts.__rocket) { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).rotateX(Math.PI / 2), toon(0x3f6b2a)); return g; }
  const m = new THREE.Mesh(parts.__rocket.geo, rpgMat()); outline(m, 0.004); m.scale.setScalar(0.75);
  const g = new THREE.Group(); g.add(m); return g;
}
function loadPackFile(loader, file, LIST) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/' + file).then(g => {
    g.scene.updateMatrixWorld(true);
    const pal = paletteReader(gunTex);
    // metal principal na zona VERDE (como o revolver): a Pintura pinta ele e a camo cobre (camoGreen); claro = destaque
    const uvMetal = pal ? paletteUV(pal, [90, 170, 60]) : [0.5, 0.5], uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5], uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5];
    const lum = (c) => c ? 0.3 * c.r + 0.59 * c.g + 0.11 * c.b : 0;
    for (const w of LIST) {
      const gun = g.scene.getObjectByName(nodeName(w.node));
      if (!gun) { console.warn('pacote 2: sem', w.node); continue; }
      const list = [], magNode = w.mag ? g.scene.getObjectByName(nodeName(w.mag)) : null;
      const inMag = (o) => { for (let q = o; q && q !== gun; q = q.parent) if (q === magNode) return true; return false; };
      gun.traverse(o => {
        if (!o.isMesh || (magNode && inMag(o))) return; // o pente separado sai do corpo (vira o pente original)
        if (w.skip) { let q = o, hit = false; for (; q && q !== gun; q = q.parent) if (w.skip.some(k => q.name === nodeName(k))) { hit = true; break; } if (hit) return; } // peca solta que nao entra
        let ge = o.geometry.clone().applyMatrix4(o.matrixWorld);
        if (ge.index) ge = ge.toNonIndexed();
        // com textura: a cor dela em cada triangulo decide; sem: a cor do material
        const tex = o.material?.map ? paletteReader(o.material.map) : null, uv0 = ge.attributes.uv, n = ge.attributes.position.count, a = new Float32Array(n * 2);
        const matLight = w.lightMat ? o.material?.name === w.lightMat : lum(o.material?.color) > 0.5;
        for (let i = 0; i < n; i += 3) {
          let light = matLight, dark = false;
          if (tex && uv0) { const c = tex((uv0.getX(i) + uv0.getX(i + 1) + uv0.getX(i + 2)) / 3, (uv0.getY(i) + uv0.getY(i + 1) + uv0.getY(i + 2)) / 3); const L = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; if (w.darkCamo) { light = false; dark = L >= w.darkCamo; } else light = w.warm ? c[0] - c[2] > 45 || L > 150 : L > 110; }
          const uv = light ? uvLight : dark ? uvDark : uvMetal; // dark: peca escura que so leva o destaque
          for (let j = 0; j < 3; j++) { a[(i + j) * 2] = uv[0]; a[(i + j) * 2 + 1] = uv[1]; }
        }
        for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k);
        ge.setAttribute('uv', new THREE.BufferAttribute(a, 2));
        list.push(ge);
      });
      const geo = list.length ? mergeGeometries(list) : null;
      if (!geo) continue;
      if (w.zUp) geo.rotateX(Math.PI / 2); // arquivo com Z pra cima (veio de FBX): deita certo
      if (w.alongZ) geo.rotateY(Math.PI / 2); // cano no eixo Z (pack de armas, 04/11): deita no X como os outros
      geo.computeBoundingBox();
      const b = geo.boundingBox, len = b.max.x - b.min.x, pos = geo.attributes.position;
      const ext = (lo, hi) => { let a = Infinity, c = -Infinity; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); if (x >= lo && x <= hi) { const y = pos.getY(i); if (y < a) a = y; if (y > c) c = y; } } return c - a; };
      const muzzleMinX = ext(b.min.x, b.min.x + len * 0.07) <= ext(b.max.x - len * 0.07, b.max.x);
      const ls = CATEGORY[w.ref || w.cat].bodies.filter(id => parts[id] && !parts[id].ww2).map(id => parts[id].box.max.z - parts[id].box.min.z);
      const k = (ls.reduce((s, x) => s + x, 0) / Math.max(1, ls.length)) * w.k / len;
      const c = b.getCenter(new THREE.Vector3());
      const m = new THREE.Matrix4().makeScale(k, k, k)
        .multiply(new THREE.Matrix4().makeRotationY(muzzleMinX ? -Math.PI / 2 : Math.PI / 2))
        .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      geo.applyMatrix4(m);
      if (w.tilt) geo.rotateX(w.tilt); // modelo que vem com o cano inclinado: nivela
      if (w.zUp) { // pacote 3: centra o X pelo CANO (fatia da boca); ferrolho/alavanca de um lado tiravam a mira e o laser do eixo
        geo.computeBoundingBox(); const P0 = geo.attributes.position, zf = geo.boundingBox.min.z + (geo.boundingBox.max.z - geo.boundingBox.min.z) * 0.04;
        let sx = 0, n0 = 0; for (let i = 0; i < P0.count; i++) if (P0.getZ(i) < zf) { sx += P0.getX(i); n0++; }
        if (n0) { const dx = -sx / n0; geo.translate(dx, 0, 0); m.premultiply(new THREE.Matrix4().makeTranslation(dx, 0, 0)); }
      }
      geo.computeVertexNormals(); geo.computeBoundingBox();
      let bodyGeo = geo;
      const bb0 = geo.boundingBox, zAt0 = (f) => bb0.min.z + (bb0.max.z - bb0.min.z) * f;
      // pente e mira colados: o modelo low-poly traz cada peca como uma ilha fechada dentro da malha.
      // Separa as ilhas (triangulos ligados por vertice) e tira as que cabem inteiras no trecho marcado,
      // abaixo do fundo do receptor (pente) ou acima do topo dele (mira).
      let magGeo = null;
      delete profiles[w.id]; for (const k of Object.keys(magCompat)) if (k.startsWith(w.id + '|')) delete magCompat[k]; // corpo trocado (Canhao de Mao -> Deagle): nada do modelo velho em cache
      parts[w.id] = { geo, box: bb0.clone() }; const pr0 = profile(w.id); delete profiles[w.id];
      const yAt = (f, top) => { const s = sliceOf(pr0, zAt0(f)); return top ? pr0.hi[s] : pr0.lo[s]; };
      const isl = geoIslands(geo), out = new Set(), magT = [];
      const tol = (bb0.max.z - bb0.min.z) * 0.02, inZ = (bx, r) => { const [z0, z1] = [zAt0(r[0]), zAt0(r[1])].sort((x, y) => x - y); return bx.min.z >= z0 - tol && bx.max.z <= z1 + tol; };
      for (const gr of isl) {
        const cy = (gr.box.min.y + gr.box.max.y) / 2;
        if (w.magCut && inZ(gr.box, w.magCut) && cy < yAt(w.magCut[0] - 0.03, false)) { gr.tris.forEach(t => out.add(t)); magT.push(...gr.tris); }
        else if (w.scopeCut2 && inZ(gr.box, w.scopeCut2) && gr.box.max.y > yAt(0.2, true) + 0.04) gr.tris.forEach(t => out.add(t));
        else if (w.scopeCut && inZ(gr.box, w.scopeCut) && (w.scopeCut[2] !== undefined ? gr.box.min.y >= w.scopeCut[2] : gr.box.max.y > yAt(w.scopeCut[0] - 0.03, true) + 0.04)) gr.tris.forEach(t => out.add(t)); // altura dada: a peca comeca acima dela; sem: o topo passa do receptor
      }
      if (out.size) { const keep = []; for (let t = 0; t < geo.attributes.position.count / 3; t++) if (!out.has(t)) keep.push(t); bodyGeo = geoTake(geo, keep); }
      if (magT.length) magGeo = geoTake(geo, magT);
      bodyGeo.computeBoundingBox();
      const body = parts[w.id] = { geo: bodyGeo, box: bodyGeo.boundingBox.clone(), ww2: true, camoGreen: true, metal: w.metal || '#2a2724', sawed: !!w.sawed, noCharger: !!w.noCharger };
      if (w.zUp) body.axisX = 0; // centrado pelo cano acima
      const bb = body.box, blen = bb.max.z - bb.min.z, zAt = (f) => bb.min.z + blen * f;
      const pr = profile(w.id);
      if (w.grip) { const gz = zAt(w.grip); body.grip = { zc: gz, z0: gz - blen * 0.04, z1: gz + blen * 0.04, lo: pr.lo[sliceOf(pr, gz)] }; }
      if (w.mid) body.mid = zAt(w.mid);
      if (w.fore) body.fore = zAt(w.fore);
      if (!magGeo && w.mag) { // pente que vem solto no arquivo
        const mo = g.scene.getObjectByName(nodeName(w.mag)), ml = [];
        mo?.traverse(o => { if (o.isMesh) { let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed(); for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k); ml.push(ge); } });
        if (ml.length) {
          magGeo = mergeGeometries(ml); if (w.zUp) magGeo.rotateX(Math.PI / 2); if (w.alongZ) magGeo.rotateY(Math.PI / 2); magGeo.applyMatrix4(m); if (w.tilt) magGeo.rotateX(w.tilt); magGeo.computeBoundingBox();
          const mb = magGeo.boundingBox, mc = mb.getCenter(new THREE.Vector3()), wz = zAt(w.well), bh = bb.max.y - bb.min.y;
          magGeo.translate((w.zUp ? 0 : (bb.min.x + bb.max.x) / 2) - mc.x, pr.lo[sliceOf(pr, wz)] + bh * 0.06 - mb.max.y, wz - mc.z);
          magGeo.computeVertexNormals();
        }
      }
      if (magGeo) { setUV(magGeo, uvDark); magGeo.computeBoundingBox(); parts[w.id.replace(/_(\d+)$/, '_charger_$1')] = { geo: magGeo, box: magGeo.boundingBox.clone(), ww2: true }; }
    }
  }).catch(e => console.warn(file + ' nao carregou', e));
}

// sniper de ferrolho antiga (bolt_sniper.glb, 30/10) saiu em 03/11: o Mestre-Cuca agora e a sniper do pacote 3

// espadas: junta as pecas de cada uma, cor do material no vertice, cabo no -z e ponta no +z (igual o melee.glb)
function loadSwords(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/sword_set.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    for (const w of SWORDS) {
      const node = g.scene.getObjectByName(nodeName(w.node));
      if (!node) { console.warn('espada: sem', w.node); continue; }
      const list = [], tip = new THREE.Vector3(); let nb = 0;
      node.traverse(o => {
        if (!o.isMesh) return;
        let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed();
        for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k);
        const c = (o.material?.color || new THREE.Color(0.6, 0.6, 0.6)).clone(), n = ge.attributes.position.count, a = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
        ge.setAttribute('color', new THREE.BufferAttribute(a, 3));
        ge.setAttribute('aBlade', new THREE.BufferAttribute(new Float32Array(n).fill(w.blade.test(o.material?.name || '') ? 1 : 0), 1)); // lamina pelo material (camo so nela)
        if (w.blade.test(o.material?.name || '')) { ge.computeBoundingBox(); tip.add(ge.boundingBox.getCenter(new THREE.Vector3())); nb++; }
        list.push(ge);
      });
      const geo = list.length ? mergeGeometries(list) : null; if (!geo) continue;
      geo.computeBoundingBox(); const b = geo.boundingBox, sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -c.y, -c.z); if (nb) tip.multiplyScalar(1 / nb).sub(c);
      // eixo mais comprido = lamina -> vira o z; a ponta (lado da lamina) pro +z
      const ax = sz.x >= sz.y && sz.x >= sz.z ? 'x' : sz.y >= sz.z ? 'y' : 'z';
      if (ax === 'x') { geo.rotateY(-Math.PI / 2); tip.set(0, tip.y, tip.x); } else if (ax === 'y') { geo.rotateX(Math.PI / 2); tip.set(tip.x, -tip.z, tip.y); }
      if (tip.z < 0) geo.rotateY(Math.PI);
      if (w.flipEdge) geo.rotateZ(Math.PI); // gira no eixo da lamina: o fio (lado curvo) vai pra frente
      geo.computeVertexNormals(); geo.computeBoundingBox();
      parts[w.id] = { geo, box: geo.boundingBox.clone(), map: null, melee: true, sword: true, flipEdge: !!w.flipEdge };
    }
  }).catch(e => console.warn('sword_set.glb nao carregou', e));
}

// Sabre de Neon (04/11, pedido dele; "Light Saber" de Jotapc, Sketchfab -> creditos). Do arquivo vem so o CABO (cor do
// material no vertice); a lamina e desenhada por nos (saberBlade). Medidas no espaco do RootNode, sem a inclinacao que o
// Sketchfab poe no no de cima: cabo em y -237..239, lamina ate y 1242, raio 40,5.
// aro da Mira de Poste (04/11, pedido dele): a deteccao de lente pegava o trilho e a reticula ficava atras do aro. Medido no
// modelo: o que passa de 45% da altura e o aro; centro dele = centro do vidro, furo = ~55% da largura
function postRing(p) {
  if (p.ring) return p.ring;
  const P = p.geo.attributes.position, b = p.box, y0 = b.min.y + (b.max.y - b.min.y) * 0.45, q = new THREE.Box3();
  for (let i = 0; i < P.count; i++) if (P.getY(i) > y0) q.expandByPoint(new THREE.Vector3(P.getX(i), P.getY(i), P.getZ(i)));
  const c = q.getCenter(new THREE.Vector3()), R = (q.max.x - q.min.x) / 2; c.y = q.max.y - R; // aro redondo: centro = topo menos o raio (a caixa corta a parte de baixo)
  return (p.ring = { c, z: c.z, r: R * 0.55, f: null });
}
function loadSaber(loader) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/light_saber.glb').then(g => {
    g.scene.updateMatrixWorld(true);
    const root = g.scene.getObjectByName('RootNode'), inv = root.matrixWorld.clone().invert(), list = [];
    let top = -Infinity, tip = -Infinity, rad = 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      let ge = o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld)); if (ge.index) ge = ge.toNonIndexed();
      ge.rotateX(Math.PI / 2); ge.computeBoundingBox(); // comprimento (y) vira o z; ponta no +z, igual as outras laminas
      const bb = ge.boundingBox;
      if (/Light|White/i.test(o.name + ' ' + (o.material?.name || '')) || o.material?.transparent) { tip = Math.max(tip, bb.max.z); rad = Math.max(rad, bb.max.x); return; } // tubos da lamina: so a medida
      top = Math.max(top, bb.max.z);
      for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k);
      const c = o.material?.color || new THREE.Color(0.6, 0.6, 0.6), n = ge.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      ge.setAttribute('color', new THREE.BufferAttribute(a, 3));
      ge.setAttribute('aBlade', new THREE.BufferAttribute(new Float32Array(n), 1));
      list.push(ge);
    });
    const geo = list.length ? mergeGeometries(list) : null; if (!geo) return;
    geo.computeVertexNormals(); geo.computeBoundingBox();
    const box = geo.boundingBox.clone(); box.max.z = tip; // a lamina conta no comprimento da arma
    parts.melee_18 = { geo, box, map: null, melee: true, sword: true, flipEdge: false, saber: { z0: top, len: tip - top, r: rad } };
  }).catch(e => console.warn('light_saber.glb nao carregou', e));
}
// Lamina do sabre: tubo de neon de desenho de 1930. Um retangulo virado pra camera; o fragmento desenha uma capsula em
// 3 camadas: miolo cor de papel, faixa de cor chapada de borda dura e halo fraco. Mistura normal (nao aditiva): em fundo
// claro o brilho tinge em vez de estourar em branco. O contorno "ferve" a 12 quadros/s, como a linha dos cartoons.
// uK = quanto da lamina ja saiu do cabo: 0 apagada, 1 inteira (acende de baixo pra cima).
const SABER_GREEN = '#46e06a', SABER_ON = 0.55;
const SABER_QUAD = new THREE.BufferGeometry();
SABER_QUAD.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
SABER_QUAD.setIndex([0, 1, 2, 0, 2, 3]);
function saberColor(hex) { // cor escura demais nao brilha: sobe ate dar pra ler
  const c = new THREE.Color(hex || SABER_GREEN), m = Math.max(c.r, c.g, c.b);
  if (m < 0.02) c.setRGB(0.45, 0.45, 0.45); else if (m < 0.45) c.multiplyScalar(0.45 / m);
  return c;
}
function saberBlade(s, accent) {
  const u = { uCol: { value: saberColor(accent) }, uZ0: { value: s.z0 }, uLen: { value: s.len }, uR: { value: s.r * 2.5 }, uK: { value: 1 }, uT: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `uniform float uZ0, uLen, uR, uK; varying vec2 vP; varying float vLp, vRw;
      void main() {
        vec3 b = (modelViewMatrix * vec4(0.0, 0.0, uZ0, 1.0)).xyz, e = (modelViewMatrix * vec4(0.0, 0.0, uZ0 + uLen * uK, 1.0)).xyz;
        float rw = uR * length(modelViewMatrix[2].xyz) * smoothstep(0.0, 0.08, uK);
        vec3 v = normalize(mix(b, e, 0.5)), a = e - b, ap = a - v * dot(a, v);
        float lp = length(ap);
        vec3 up = lp > 1e-5 ? ap / lp : normalize(cross(v, modelViewMatrix[0].xyz)); /* de ponta pra camera vira um circulo */
        vec3 side = normalize(cross(up, v));
        float y = position.y * lp + (position.y * 2.0 - 1.0) * rw, x = position.x * rw;
        vP = vec2(x, y); vLp = lp; vRw = max(rw, 1e-5);
        gl_Position = projectionMatrix * vec4(b + up * y + side * x, 1.0);
      }`,
    fragmentShader: `uniform vec3 uCol; uniform float uT; varying vec2 vP; varying float vLp, vRw;
      void main() {
        float d = length(vec2(vP.x, vP.y - clamp(vP.y, 0.0, vLp))) / vRw;
        float boil = floor(uT * 12.0), yy = vP.y / vRw;
        float w = 1.0 + 0.09 * sin(yy * 0.9 + boil * 2.4) + 0.05 * sin(yy * 2.3 - boil * 1.7);
        float aa = max(fwidth(d), 0.004), core = 1.0 - smoothstep(0.11 * w - aa, 0.11 * w + aa, d), band = 1.0 - smoothstep(0.25 * w - aa, 0.25 * w + aa, d);
        float halo = pow(clamp((1.0 - d) / 0.75, 0.0, 1.0), 2.0) * 0.5;
        gl_FragColor = vec4(mix(uCol, vec3(1.0, 0.965, 0.87), core), max(band, halo));
        #include <colorspace_fragment>
      }`,
  });
  mat.userData.gunOwn = true;
  const mesh = new THREE.Mesh(SABER_QUAD, mat); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.userData.noFx = true;
  let t0 = 0, dur = SABER_ON;
  mesh.onBeforeRender = () => { // pelo relogio: anda igual na mao, no boneco e na vitrine, sem precisar de tick
    const now = performance.now() / 1000; u.uT.value = now % 1000;
    if (t0) { const f = Math.min(1, (now - t0) / dur); u.uK.value = 1 - (1 - f) ** 2.2; if (f >= 1) t0 = 0; }
  };
  // nasce acesa (foto da Loja, kill cam, cartaz); quem equipa chama ignite
  return { mesh, ignite(d = SABER_ON) { dur = d; t0 = performance.now() / 1000; u.uK.value = 0; } };
}

// lamina (04/11, pedido dele: a camo pinta SO a lamina das armas brancas). aBlade por vertice: 1 lamina, 0 cabo/guarda.
// Facas: bladeByColor (abaixo). Espadas: pelo material do arquivo (Blade/Sharp), exato.
// Facas do melee.glb: lamina pela POSICAO no comprimento (o arquivo traz cada uma num sentido; a cor nao separa: em
// varias o cabo e o cinza claro). BLADE_AT[i] = [de, ate] em fracao de min.z a max.z; conferido modelo a modelo na foto.
const BLADE_AT = [[0.44, 1], [0.62, 1], [0.5, 1], [0, 1], [0.78, 1], [0.4, 1], [0.78, 1], [0.42, 1], [0.52, 1], [0.82, 1], [0.5, 1], [0.62, 1], [0.38, 1], [0.6, 1], [0.7, 1]];
function bladeMark(geo, at) {
  const pos = geo.attributes.position, a = new Float32Array(pos.count); geo.computeBoundingBox();
  const b = geo.boundingBox, L = b.max.z - b.min.z || 1, [f0, f1] = at || [0, 1];
  for (let i = 0; i < pos.count; i += 3) { const f = ((pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 - b.min.z) / L, v = f >= f0 && f <= f1 ? 1 : 0; a[i] = a[i + 1] = a[i + 2] = v; }
  geo.setAttribute('aBlade', new THREE.BufferAttribute(a, 1));
}

// ---------- skins de MODELO da Loja (04/11, Futuristic Weapon Pack) ----------
const NEON_MAT = new THREE.MeshBasicMaterial({ color: 0x3ff2ff }); // ciano da Pulse Gun: brilha igual de dia e de noite
// Cada uma vira um corpo novo (WSKINS em shared/weapons.js) com as mesmas zonas das armas: VERDE = pintura/camo,
// CLARO = destaque, ESCURO = metal fixo, e NEON (o brilho ciano) que nunca muda (material proprio, sem camo).
//  pulse:   cores vem dos materiais do arquivo (teal = pintura, cinzas = escuro, o emissivo ciano = neon)
//  fiction: arquivo sem cor (cinza unico): zonas por posicao. Base = pintura, faixas laterais/de cima = destaque,
//           canos/coronha = escuro, e as faixas de neon sao desenhadas por nos (iguais as da pulse). A luneta do
//           arquivo sai (as nossas miras encaixam no trilho); os 3 canos viram 3 bocas (bocal e laser nos 3)
const WSKIN_MODELS = {
  pulse: { file: 'pulse_gun.glb', k: 1.06, grip: 0.62, mid: 0.48, fore: 0.3, neonMat: /^Material\.004$/, lightMat: /^Material\.001$/ },
  fiction: { file: 'fictional_gun.glb', k: 1.08, grip: 0.64, mid: 0.48, fore: 0.3, carve: true, flip: true, base: '#c3c8cf' }, // base cinza-claro (o arquivo vem sem cor) // flip: a coronha em bloco engana o 'ponta mais fina'
};
function loadWSkins(loader) {
  const pal = paletteReader(gunTex);
  const uvMetal = pal ? paletteUV(pal, [90, 170, 60]) : [0.5, 0.5], uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5], uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5];
  const tag = (ge, uv) => { const n = ge.attributes.position.count, a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; } ge.setAttribute('uv', new THREE.BufferAttribute(a, 2)); return ge; };
  const clean = (ge) => { if (ge.index) ge = ge.toNonIndexed(); for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k); return ge; };
  return Promise.all(Object.entries(WSKINS).map(([id, W]) => {
    const D = WSKIN_MODELS[id]; if (!D) return null;
    return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/' + D.file).then(g => {
      g.scene.updateMatrixWorld(true);
      const body = [], neon = [];
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const ge = clean(o.geometry.clone().applyMatrix4(o.matrixWorld)), mn = o.material?.name || '';
        if (D.neonMat?.test(mn)) { neon.push(ge); return; }
        if (D.carve) { body.push(ge); return; } // fiction: zonas depois, por posicao
        const c = o.material?.color, lum = c ? 0.3 * c.r + 0.59 * c.g + 0.11 * c.b : 0;
        body.push(tag(ge, D.lightMat?.test(mn) ? uvMetal : lum < 0.05 ? uvDark : uvLight));
      });
      let geo = mergeGeometries(body.length > 1 ? body : [body[0]]); if (!geo) return;
      let ngeo = neon.length ? mergeGeometries(neon) : null;
      // deita no padrao das armas: cano pro -z, cabo pra baixo, comprimento certo
      geo.computeBoundingBox(); let b = geo.boundingBox, sz = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
      const M = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
      if (sz.x > sz.z) M.premultiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); // comprimento no X -> Z
      geo.applyMatrix4(M); ngeo?.applyMatrix4(M); geo.computeBoundingBox(); b = geo.boundingBox;
      // boca = ponta mais fina (menos altura); vai pro -z
      const P = geo.attributes.position, L = b.max.z - b.min.z, hAt = (z0, z1) => { let lo = 1e9, hi = -1e9; for (let i = 0; i < P.count; i++) { const z = P.getZ(i); if (z >= z0 && z <= z1) { const y = P.getY(i); lo = Math.min(lo, y); hi = Math.max(hi, y); } } return hi - lo; };
      if (D.flip || hAt(b.min.z, b.min.z + L * 0.08) > hAt(b.max.z - L * 0.08, b.max.z)) { const R = new THREE.Matrix4().makeRotationY(Math.PI); geo.applyMatrix4(R); ngeo?.applyMatrix4(R); }
      const ls = CATEGORY.rifle.bodies.filter(x => parts[x] && !parts[x].ww2).map(x => parts[x].box.max.z - parts[x].box.min.z);
      geo.computeBoundingBox(); const k = (ls.reduce((a, x) => a + x, 0) / Math.max(1, ls.length)) * D.k / (geo.boundingBox.max.z - geo.boundingBox.min.z);
      geo.scale(k, k, k); ngeo?.scale(k, k, k);
      let muzzles = null;
      if (D.carve) ({ geo, ngeo, muzzles } = carveFiction(geo, uvMetal, uvLight, uvDark));
      geo.computeVertexNormals(); geo.computeBoundingBox(); ngeo?.computeVertexNormals();
      const bb = geo.boundingBox, blen = bb.max.z - bb.min.z, zAt = (fr) => bb.min.z + blen * fr;
      parts[W.body] = { geo, box: bb.clone(), ww2: true, camoGreen: true, metal: D.base || '#2a2724', neon: ngeo, muzzles, noCharger: true, wskin: id };
      const pr = profile(W.body), part = parts[W.body];
      part.grip = { zc: zAt(D.grip), z0: zAt(D.grip) - blen * 0.04, z1: zAt(D.grip) + blen * 0.04, lo: pr.lo[sliceOf(pr, zAt(D.grip))] };
      part.mid = zAt(D.mid); part.fore = zAt(D.fore);
    }).catch(e => console.warn('skin de modelo ' + id + ' nao carregou', e));
  }));
}
// Fictional Gun: arquivo sem cor. Separa as pecas (ilhas), tira a luneta e da as zonas:
//  canos (3 bocas na frente) e coronha = escuro; trilho e faixas das laterais = destaque; o resto = pintura.
// Neon: faixas finas nossas nas laterais e em volta das bocas (mesmo ciano da pulse). Devolve as 3 bocas pro bocal/laser.
function carveFiction(geo, uvMetal, uvLight, uvDark) {
  geo.computeBoundingBox();
  const b0 = geo.boundingBox, L = b0.max.z - b0.min.z, H = b0.max.y - b0.min.y, isl = geoIslands(geo), keep = [], light = [], dark = [];
  const fz = (z) => (z - b0.min.z) / L, fy = (y) => (y - b0.min.y) / H;
  const mouths = [];
  for (const gr of isl) {
    const bx = gr.box, z0 = fz(bx.min.z), z1 = fz(bx.max.z), y0 = fy(bx.min.y), y1 = fy(bx.max.y), w = bx.max.x - bx.min.x;
    if (y0 > 0.58 && z0 > 0.55 && z1 < 0.8) continue; // luneta + suporte (vai embora: nossas miras entram)
    if (y0 > 0.5 && y1 > 0.8 && z0 > 0.05 && z1 < 0.65) { light.push(...gr.tris); continue; } // tampa de cima = destaque (2 tons)
    if (z1 < 0.03 && (bx.max.z - bx.min.z) < L * 0.03) { dark.push(...gr.tris); mouths.push(bx.getCenter(new THREE.Vector3())); continue; } // as 3 bocas
    if (z0 < 0.2 && z1 < 0.35) { dark.push(...gr.tris); continue; } // canos
    if (z0 > 0.82) { dark.push(...gr.tris); continue; } // coronha
    if (y0 > 0.45 && w < (b0.max.x - b0.min.x) * 0.5 && (bx.max.y - bx.min.y) < H * 0.12) { light.push(...gr.tris); continue; } // trilho e frisos de cima
    keep.push(...gr.tris);
  }
  const part = (tris, uv) => { if (!tris.length) return null; const g = geoTake(geo, tris); setUV(g, uv); return g; };
  const out = mergeGeometries([part(keep, uvMetal), part(light, uvLight), part(dark, uvDark)].filter(Boolean));
  out.computeBoundingBox();
  // neon: duas faixas finas de cada lado (meio do corpo) e um aro em cada boca
  const nb = out.boundingBox, nL = nb.max.z - nb.min.z, nH = nb.max.y - nb.min.y, strips = [];
  const prof = (z) => { const P = out.attributes.position; let lo = 1e9, hi = -1e9, xl = 1e9, xr = -1e9; for (let i = 0; i < P.count; i++) if (Math.abs(P.getZ(i) - z) < nL * 0.01) { lo = Math.min(lo, P.getY(i)); hi = Math.max(hi, P.getY(i)); xl = Math.min(xl, P.getX(i)); xr = Math.max(xr, P.getX(i)); } return { lo, hi, xl, xr }; };
  // parede de verdade naquele ponto (raio vindo de fora): a lateral nao e reta, a caixa da fatia deixava a faixa boiando (04/11)
  const rc = new THREE.Raycaster(), hitM = new THREE.Mesh(out, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const wall = (sx, y, z) => { rc.set(new THREE.Vector3(sx * 5, y, z), new THREE.Vector3(-sx, 0, 0)); const h = rc.intersectObject(hitM)[0]; return h ? h.point.x : null; };
  // faixa = gomos curtos, cada um encostado na parede do seu trecho (1,5 mm pra fora: sem piscar, sem boiar)
  const band = (sx, y, z0, z1, th) => { const n = Math.max(2, Math.round((z1 - z0) / (nL * 0.02))), st = (z1 - z0) / n;
    for (let i = 0; i < n; i++) { const z = z0 + st * (i + 0.5), x = wall(sx, y, z); if (x == null) continue; const g = new THREE.BoxGeometry(0.006, th, st * 1.02); g.translate(x + sx * 0.0045, y, z); strips.push(g); } };
  for (const [za, zb, yf] of [[0.32, 0.56, 0.55], [0.36, 0.52, 0.42]]) {
    const z0 = nb.min.z + nL * za, z1 = nb.min.z + nL * zb, pr = prof((z0 + z1) / 2), y = pr.lo + (pr.hi - pr.lo) * yf;
    for (const sx of [-1, 1]) band(sx, y, z0, z1, nH * 0.035);
  }
  for (const za of [0.27, 0.295, 0.32]) { // 3 barras de pe (como as da pulse): gomos na vertical
    const z = nb.min.z + nL * za, pr = prof(z), y0 = pr.lo + (pr.hi - pr.lo) * 0.2, y1 = pr.lo + (pr.hi - pr.lo) * 0.5, n = 5, st = (y1 - y0) / n;
    for (const sx of [-1, 1]) for (let i = 0; i < n; i++) { const y = y0 + st * (i + 0.5), x = wall(sx, y, z); if (x == null) continue; const g = new THREE.BoxGeometry(0.006, st * 1.02, nL * 0.008); g.translate(x + sx * 0.0045, y, z); strips.push(g); }
  }
  hitM.material.dispose();
  const mz = [...mouths].map(m => m.clone()).sort((a, c) => c.y - a.y);
  for (const m of mz) { const ring = new THREE.TorusGeometry(nH * 0.06, nH * 0.008, 4, 12); ring.translate(m.x, m.y, m.z + nL * 0.012); strips.push(ring); }
  const ngeo = mergeGeometries(strips.map(g => g.index ? g.toNonIndexed() : g).map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
  return { geo: out, ngeo, muzzles: mz };
}

export function arsenalReady() { return !!parts.fusil_1; }
export const debugParts = () => parts; // depuracao (window.__A)
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

// Cinco miras tem a LENTE inclinada no arquivo (2 a 9 graus: fusil_scope_1/2/4/6, subfusil_scope_5), mas o pe
// delas e reto. Girar a peca pela lente entortava a mira na arma (29/10). Agora a peca fica como veio e so o eixo
// optico e tratado como reto (sem compensacao na pose de mira).
function levelScope(p) {
  const L = p.lens;
  if (L && L.f) L.f.y = L.c.y;
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
function paintMaterial(paint, accent, camo, part = false, camoGreen = false) {
  const m = toon(0xffffff, { map: gunTex, unique: true });
  m.userData.gunOwn = true; // so desta arma: disposeGun libera
  // so a camo desta peca entra no shader (peca encaixada nunca leva camo)
  const glslCode = part ? 0 : camoById(camo).code;
  m.userData.u = {
    uPart: { value: part ? 1 : 0 },
    uPaint: { value: new THREE.Color(paint || '#ffffff') }, uPaintOn: { value: 1 }, // sem pintura escolhida: o verde de fabrica vira BRANCO (03/11, pedido dele)
    uAccent: { value: new THREE.Color(accent || '#ffffff') }, uAccentOn: { value: accent ? 1 : 0 },
    uCamo: { value: camoById(camo).code }, uTime: camoTime, uReact: { value: 0 }, uCamoGreen: { value: camoGreen ? 1 : 0 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position * 1.8;'); // estampa menor (01/11): a arma mostrava so um pedaco da camo
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPaint; uniform float uPaintOn; uniform vec3 uAccent; uniform float uAccentOn; uniform float uPart; uniform float uCamoGreen;\n' + camoGlsl(glslCode) + '\nvec3 gCamoGlow = vec3(0.0);')
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
            float keep = uCamoGreen > 0.5 ? accent : max(accent, green); // revolver: a camo cobre o metal (zona verde)
            diffuseColor.rgb = mix(cc, diffuseColor.rgb, keep);
            gCamoGlow = cg * (1.0 - keep);
          }
        }`);
  };
  m.customProgramCacheKey = () => 'paint' + glslCode;
  return m;
}

// 04/11 (pedido dele): militares e comicas novas, vendidas na Loja por Zions (RET_PAID; posse 'ret:<id>')
export const RET_PAID = ['horseshoe', 'acog', 'german', 'triangle', 'brackets', 'star', 'heart', 'smile', 'skull', 'bolt', 'diamond', 'radar', 'wings', 'ladder', 'artillery', 'spiral', 'crown', 'eye', 'clover', 'moon'];
export const RETICLES = ['dot', 'cross', 'circle', 'chevron', 'tee', 'duplex', 'mildot', ...RET_PAID];
export const retOwned = (r) => !RET_PAID.includes(r) || !!progressInfo().unlockAll || shopOwned('ret:' + r);
// desenho no icone e na Loja (caixa de 24): s = traco, f = preenchido (buracos pela regra evenodd)
const DOT = 'M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0';
export const RET_PATH = {
  horseshoe: { s: 'M7.5 18.5a8 8 0 1 1 9 0', f: DOT }, acog: { s: 'M6 13l6-6 6 6M12 11v9M9 16.5h6' }, german: { s: 'M12 13v9M2 12h7M15 12h7' }, triangle: { s: 'M12 4.5l7.5 13h-15z', f: DOT }, brackets: { s: 'M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4', f: DOT },
  star: { f: 'M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17.1 6.4 20.2l1.2-6.3L3 9.6l6.3-.8z' }, heart: { f: 'M12 20.5s-8.5-5-8.5-11.2a4.6 4.6 0 0 1 8.5-2.5a4.6 4.6 0 0 1 8.5 2.5c0 6.2-8.5 11.2-8.5 11.2z' },
  smile: { s: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17M7.5 14.5q4.5 4 9 0', f: 'M8 9.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0M13.2 9.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0' },
  skull: { f: 'M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3zM6.8 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM13.2 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0z' }, bolt: { f: 'M13.5 2L5 14h6l-1.5 8L19 9.5h-6z' },
  diamond: { s: 'M12 4l8 8-8 8-8-8z', f: DOT }, radar: { s: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 12l6-6' }, wings: { s: 'M3 9l7 3M21 9l-7 3M12 15v5', f: DOT }, ladder: { s: 'M12 3v18M5 7h14M8 12h8M9.5 16h5M10.5 19.5h3' }, artillery: { s: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 2v6M12 16v6M2 12h6M16 12h6', f: DOT },
  spiral: { s: 'M12 12c1-1 2.5 0 2 1.5s-3 2-4.5.5s-1-5 2-6s7 1 7.5 4.5s-2 7.5-6 8' }, crown: { f: 'M4 18L3 7l5 4 4-7 4 7 5-4-1 11z' }, eye: { s: 'M2.5 12q9.5-9 19 0q-9.5 9-19 0z', f: 'M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0' },
  clover: { f: 'M8.5 7.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M8.5 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M4 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M13 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0' }, moon: { f: 'M15 3a9 9 0 1 0 6 15a7.5 7.5 0 0 1-6-15z' },
};
export const RET_COLORS = { red: '#ff3b30', green: '#3cff6b', amber: '#ffb21a', white: '#ffffff', black: '#111111', pink: '#ff5fa2', cyan: '#39d7ff', violet: '#9b6bff', lime: '#b6f23c' }; // as 4 ultimas: Rovex Pass
export const retColorOwned = (k) => !RET_PASS[k] || !!progressInfo().unlockAll || passLevel() >= RET_PASS[k];
export const scopeTarget = { texture: null, mask: null };
// lunetas de sniper com identidade propria (01/11): reticula, vidro, borda e jeito de mirar diferentes.
// Caca = cruz fina e vidro limpo; Militar = mil-dot com marcas de queda e vidro ambar; Termica de tinta =
// imagem em papel e tinta com quem esta vivo em vermelho (respeita parede); Variavel = 2 zooms na rodinha/troca.
export const SCOPE_KIND = { sniper_scope_0: 'hunt', sniper_scope_1: 'mil', sniper_scope_2: 'thermal', fusil_scope_6: 'vari' };
const KIND_ID = { hunt: 0, mil: 1, thermal: 2, vari: 3 };
const KIND_RET = { hunt: 'duplex', mil: 'milbdc', thermal: 'cross', vari: 'duplex' };

function lensMaterial(big, ret, color, kind = null, retK = 1.45) {
  const ri = RETICLES.indexOf(ret), style = ret === 'milbdc' ? 7 : ri >= 7 ? ri + 1 : Math.max(0, ri); // 7 = milbdc da Militar; as novas vem do 8 em diante
  return lensOwn(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      tScope: { value: scopeTarget.texture }, uBig: { value: big ? 1 : 0 }, uOn: { value: 0 },
      uStyle: { value: style }, uCol: { value: new THREE.Color(RET_COLORS[color] || RET_COLORS.red) },
      uKind: { value: kind ? KIND_ID[kind] : -1 }, uStep: { value: 0 }, tMask: { value: scopeTarget.mask }, uRetK: { value: retK },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tScope, tMask; uniform float uBig, uOn, uStyle, uKind, uStep, uRetK; uniform vec3 uCol;
      varying vec2 vUv;
      float ln(float d, float w) { return smoothstep(w, w * 0.4, abs(d)); }
      float ring(vec2 p, float r, float w) { return smoothstep(w, w * 0.4, abs(length(p) - r)); }
      float dotp(vec2 p, vec2 c, float r) { return smoothstep(r, r * 0.5, length(p - c)); }
      float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
      float star5(vec2 p, float r, float rf) { const vec2 k1 = vec2(0.809017, -0.587785), k2 = vec2(-0.809017, -0.587785); p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r; vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r); return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y); }
      // reticulas de red dot; wk alarga os tracos (wk > 1 = halo do bloom)
      float retGlow(int s, vec2 q, float wk) {
        if (s == 0) return dotp(q, vec2(0.0), 0.06 * wk);
        if (s == 1) return max(ln(q.x, 0.02 * wk) * step(abs(q.y), 0.32), ln(q.y, 0.02 * wk) * step(abs(q.x), 0.32)) * step(0.06, length(q));
        if (s == 2) return max(ring(q, 0.42, 0.025 * wk), dotp(q, vec2(0.0), 0.05 * wk));
        if (s == 3) return ln(q.y + abs(q.x) * 0.9, 0.025 * wk) * step(abs(q.x), 0.25) * step(-0.25, q.y);
        if (s == 4) return max(ln(q.y, 0.02 * wk) * step(abs(q.x), 0.3), ln(q.x, 0.02 * wk) * step(q.y, 0.0) * step(-0.35, q.y));
        float d0 = dotp(q, vec2(0.0), 0.05 * wk);
        if (s == 8) return max(ring(q, 0.4, 0.025 * wk) * (1.0 - step(abs(q.x), 0.2) * step(q.y, 0.0)), d0);
        if (s == 9) return max(max(ln(q.y + abs(q.x) * 0.9, 0.022 * wk) * step(abs(q.x), 0.22) * step(-0.22, q.y), ln(q.x, 0.018 * wk) * step(q.y, -0.08) * step(-0.44, q.y)), ln(q.y + 0.3, 0.016 * wk) * step(abs(q.x), 0.12));
        if (s == 10) return max(ln(q.x, 0.03 * wk) * step(q.y, -0.05) * step(-0.46, q.y), ln(q.y, 0.02 * wk) * step(0.08, abs(q.x)) * step(abs(q.x), 0.44));
        if (s == 11) { vec2 c = q + vec2(0.0, 0.1); return max(ln(max(abs(c.x) * 0.866 + c.y * 0.5, -c.y) - 0.2, 0.02 * wk), d0); }
        if (s == 12) return max(ln(max(abs(q.x), abs(q.y)) - 0.34, 0.02 * wk) * step(0.17, min(abs(q.x), abs(q.y))), d0);
        if (s == 13) return 1.0 - smoothstep(-0.012, 0.012 * wk, star5(q, 0.38, 0.45));
        if (s == 14) { vec2 h = q / 0.34; h.y += 0.15; float a = dot(h, h) - 1.0; return 1.0 - smoothstep(-0.03, 0.03 * wk, a * a * a - h.x * h.x * h.y * h.y * h.y); }
        if (s == 15) return max(max(ring(q, 0.4, 0.022 * wk), ring(q, 0.24, 0.022 * wk) * step(q.y, -0.06)), max(dotp(q, vec2(-0.14, 0.12), 0.055 * wk), dotp(q, vec2(0.14, 0.12), 0.055 * wk)));
        if (s == 16) { float head = 1.0 - smoothstep(0.29, 0.3 + 0.012 * wk, length(q - vec2(0.0, 0.07))), jaw = step(abs(q.x), 0.16) * step(-0.36, q.y) * step(q.y, -0.1); return max(head, jaw) * (1.0 - max(dotp(q, vec2(-0.12, 0.07), 0.085), dotp(q, vec2(0.12, 0.07), 0.085))); }
        if (s == 18) return max(ln(abs(q.x) + abs(q.y) - 0.32, 0.02 * wk), d0);
        if (s == 19) return max(max(ring(q, 0.2, 0.016 * wk), ring(q, 0.42, 0.018 * wk)), 1.0 - smoothstep(0.012, 0.012 + 0.012 * wk, seg(q, vec2(0.0), vec2(0.29, 0.29))));
        if (s == 20) return max(max(ln(q.y - abs(q.x) * 0.4 + 0.02, 0.02 * wk) * step(0.1, abs(q.x)) * step(abs(q.x), 0.44), ln(q.x, 0.016 * wk) * step(q.y, -0.1) * step(-0.32, q.y)), d0);
        if (s == 21) { float L = max(ln(q.x, 0.014 * wk) * step(abs(q.y), 0.44), ln(q.y, 0.016 * wk) * step(abs(q.x), 0.3)); L = max(L, ln(q.y + 0.13, 0.013 * wk) * step(abs(q.x), 0.2)); L = max(L, ln(q.y + 0.25, 0.013 * wk) * step(abs(q.x), 0.13)); return max(L, ln(q.y + 0.36, 0.013 * wk) * step(abs(q.x), 0.07)); }
        if (s == 22) return max(max(ring(q, 0.38, 0.018 * wk), d0), max(ln(q.x, 0.016 * wk) * step(0.24, abs(q.y)) * step(abs(q.y), 0.48), ln(q.y, 0.016 * wk) * step(0.24, abs(q.x)) * step(abs(q.x), 0.48)));
        if (s == 23) { float r = length(q); return (1.0 - smoothstep(0.1, 0.1 + 0.04 * wk, abs(fract(r / 0.12 - atan(q.y, q.x) / 6.2832) - 0.5))) * step(r, 0.44); }
        if (s == 24) { float d = min(min(min(seg(q, vec2(-0.3, -0.2), vec2(-0.34, 0.18)), seg(q, vec2(-0.34, 0.18), vec2(-0.14, -0.02))), min(seg(q, vec2(-0.14, -0.02), vec2(0.0, 0.26)), seg(q, vec2(0.0, 0.26), vec2(0.14, -0.02)))), min(min(seg(q, vec2(0.14, -0.02), vec2(0.34, 0.18)), seg(q, vec2(0.34, 0.18), vec2(0.3, -0.2))), seg(q, vec2(-0.3, -0.2), vec2(0.3, -0.2)))); return 1.0 - smoothstep(0.018, 0.018 + 0.012 * wk, d); }
        if (s == 25) { float u = q.x / 0.42; return max(ln(abs(q.y) - 0.22 * (1.0 - u * u), 0.018 * wk) * step(abs(q.x), 0.42), dotp(q, vec2(0.0), 0.1 * wk)); }
        if (s == 26) { float d = min(min(length(q - vec2(0.15, 0.0)), length(q + vec2(0.15, 0.0))), min(length(q - vec2(0.0, 0.15)), length(q + vec2(0.0, 0.15)))); return 1.0 - smoothstep(0.13, 0.14 + 0.01 * wk, d); }
        if (s == 27) return (1.0 - smoothstep(0.33, 0.34 + 0.01 * wk, length(q))) * smoothstep(0.27, 0.28, length(q - vec2(0.15, 0.07)));
        if (s == 17) return 1.0 - smoothstep(0.03, 0.03 + 0.012 * wk, min(min(seg(q, vec2(0.1, 0.4), vec2(-0.14, -0.02)), seg(q, vec2(-0.14, -0.02), vec2(0.14, 0.02))), seg(q, vec2(0.14, 0.02), vec2(-0.1, -0.4))));
        return 0.0;
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        int s = int(uStyle + 0.5);
        float k = uBig > 0.5 ? 1.0 : uRetK; // red dot: reticula pequena no meio do vidro (estilo BO2)
        vec2 q = p * k;
        float ink = 0.0, glow = 0.0;
        float halo = 0.0;
        float rim = 0.0; // contorno fino de tinta: a reticula salta ate em fundo claro
        if (s <= 4 || s >= 8) { glow = retGlow(s, q, 1.0); halo = retGlow(s, q, 4.0) * 0.34; rim = clamp(retGlow(s, q, 2.0) - glow, 0.0, 1.0); }
        else if (s == 5) {
          ink = max(ln(p.x, 0.008), ln(p.y, 0.008));
          ink = max(ink, max(ln(p.x, 0.04) * step(0.5, abs(p.y)), ln(p.y, 0.04) * step(0.5, abs(p.x))));
          glow = dotp(p, vec2(0.0), 0.022);
        } else if (s == 7) {
          // militar: cruz fina, pontos mil-dot em cima e dos lados, marcas de queda da bala embaixo (cada vez menores)
          ink = max(ln(p.x, 0.005), ln(p.y, 0.005));
          ink = max(ink, max(ln(p.x, 0.035) * step(0.66, abs(p.y)), ln(p.y, 0.035) * step(0.66, abs(p.x))));
          for (int i = 1; i <= 3; i++) {
            float m = float(i) * 0.16;
            ink = max(ink, max(max(dotp(p, vec2(m, 0.0), 0.02), dotp(p, vec2(-m, 0.0), 0.02)), dotp(p, vec2(0.0, m), 0.02)));
            ink = max(ink, ln(p.y + m, 0.007) * step(abs(p.x), 0.15 - float(i) * 0.03));
          }
          glow = dotp(p, vec2(0.0), 0.014);
        } else {
          ink = max(ln(p.x, 0.006), ln(p.y, 0.006));
          for (int i = 1; i <= 4; i++) {
            float m = float(i) * 0.18;
            ink = max(ink, max(max(dotp(p, vec2(m, 0.0), 0.022), dotp(p, vec2(-m, 0.0), 0.022)), max(dotp(p, vec2(0.0, m), 0.022), dotp(p, vec2(0.0, -m), 0.022))));
          }
          glow = dotp(p, vec2(0.0), 0.016);
        }
        vec3 hot = min(uCol * 1.4, vec3(1.0)), c; float a; // 04/11 (pedido dele): cor cheia; misturar com branco virava rosa e o filme desbotava o resto
        if (uBig > 0.5) {
          // luneta: imagem ampliada com vinheta da lente; vidro escuro quando nao esta mirando
          int kd = int(uKind + 0.5);
          vec3 img = texture2D(tScope, vUv).rgb;
          float vig = 0.78;
          if (kd == 0) vig = 0.88; // caca: vidro limpo, borda fina
          if (kd == 1) { img *= vec3(1.07, 0.98, 0.8); vig = 0.72; } // militar: vidro ambar, tubo grosso
          if (kd == 2) {
            // termica de tinta: o mundo vira papel e tinta (hachura nas sombras); quem esta la dentro fica vermelho
            float l = dot(img, vec3(0.299, 0.587, 0.114));
            vec3 paperC = vec3(0.93, 0.91, 0.86), inkC = vec3(0.08, 0.07, 0.06);
            vec3 b = mix(inkC, paperC, smoothstep(0.28, 0.55, l));
            float hatch = step(0.55, fract((vUv.x + vUv.y) * 70.0)) * (1.0 - smoothstep(0.25, 0.5, l));
            b = mix(b, inkC, hatch * 0.6);
            float hot = texture2D(tMask, vUv).r;
            img = mix(b, vec3(1.0, 0.24, 0.14), hot);
            vig = 0.8;
          }
          img *= smoothstep(1.0, vig, r);
          // borda de cada luneta: militar com a regua de marcas, variavel com o marcador do zoom
          float ang = atan(p.y, p.x);
          if (kd == 1) img = mix(img, vec3(0.03), step(0.86, r) * step(r, 0.95) * step(0.82, fract(ang / 6.2832 * 36.0)));
          if (kd == 2) img = mix(img, vec3(0.93, 0.91, 0.86), smoothstep(0.9, 0.93, r));
          if (kd == 3) {
            float on0 = dotp(p, vec2(-0.07, -0.86), 0.03), on1 = dotp(p, vec2(0.07, -0.86), 0.03);
            float ring0 = ring(p - vec2(-0.07, -0.86), 0.03, 0.008), ring1 = ring(p - vec2(0.07, -0.86), 0.03, 0.008);
            img = mix(img, vec3(0.9), max(ring0, ring1));
            img = mix(img, uCol, uStep > 0.5 ? on1 : on0);
          }
          vec3 glass = mix(vec3(0.05, 0.07, 0.09), vec3(0.35, 0.45, 0.5), smoothstep(0.6, 0.0, length(p - vec2(-0.35, 0.4))));
          c = mix(glass, img, uOn);
          c = mix(c, vec3(0.02), ink * uOn);
          c = mix(c, hot * 0.22, rim * 0.85 * uOn);
          c = mix(c, mix(hot, vec3(1.0), glow * 0.1), max(glow, halo) * uOn);
          a = 1.0;
        } else {
          // laser projetado: miolo quase branco, halo fraquinho da mesma cor em volta
          c = mix(hot, vec3(1.0), glow * glow * 0.1); a = max(max(glow, ink), max(halo, rim * 0.85));
          c = mix(c, hot * 0.22, rim);
          c = mix(c, vec3(0.02), ink * (1.0 - glow));
          a = max(a, 0.06); // leve reflexo do vidro
          if (a < 0.07) c = vec3(0.7, 0.8, 0.9);
        }
        gl_FragColor = vec4(c, a);
      }`,
  }));
}

// boca do pente: centro da face de cima (onde ele entra no poco). Pente curvo tem a caixa adiantada em
// relacao a boca; alinhar pela caixa deixava todo pente trocado na frente do encaixe (pedido dele 30/10).
const mouths = {};
function magMouth(id) {
  if (mouths[id]) return mouths[id].clone();
  const P = parts[id], b = P.box, h = b.max.y - b.min.y, p = P.geo.attributes.position;
  let zs = 0, n = 0;
  for (let i = 0; i < p.count; i++) if (p.getY(i) >= b.max.y - h * 0.12) { zs += p.getZ(i); n++; }
  mouths[id] = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, n ? zs / n : (b.min.z + b.max.z) / 2);
  return mouths[id].clone();
}
// inclinacao do pente: angulo da linha boca -> centro do fundo (no plano do cano). Pente trocado gira em
// volta da boca ate bater com a do original (reto num poco inclinado ficava torto e saindo do encaixe)
// ajuste por pente (pedidos dele 30/10): flip = vira pro outro lado; noTilt = entra reto
const MAG_FIT = { sniper_charger_1: { flip: true },
  fusil_charguer_5: { noTilt: true, ins: 0.05 }, 'fusil_5|fusil_charguer_5': { noTilt: true, ins: 0.05, flip: true, back: -0.18 }, // Garoa: o pente 5 curvava pra tras e entrava no gatilho (piscava): virado e um tico pra frente (03/11)
  'fusil_5|fusil_charger_1': { noTilt: true, ins: 0.05, back: -0.18 } /* Garoa: pente 1 no mesmo angulo e lugar do pente de fabrica (pedido dele 03/11) */ }; // chave 'corpo|pente' vale so naquela arma; back = recua (fracao da profundidade do pente) // ins = quanto entra no poco (fracao da altura; padrao ate 25%)
// pentes que nao fazem sentido visual num corpo (conferidos na folha 30/10): nao aparecem pra escolher
const MAG_BAN = {
  fusil_1: ['fusil_charguer_5', 'fusil_charguer_7'], fusil_7: ['fusil_charguer_2'], fusil_11: ['fusil_charguer_2'],
  // palito fino (pente de pistola) em poco largo
  subfusil_1: ['subfusil_charguer_5', 'subfusil_charguer_6'], subfusil_2: ['subfusil_charguer_6'], subfusil_8: ['subfusil_charguer_5', 'subfusil_charguer_6'],
  subfusil_9: ['subfusil_charguer_6'], subfusil_10: ['subfusil_charguer_5', 'subfusil_charguer_6'],
};
const MAG_THIN = ['subfusil_charguer_5', 'subfusil_charguer_6']; // finos como pente de pistola: ficavam palito em qualquer outro poco
// o contrario: cabe visualmente mesmo fora da faixa de tamanho (pedido dele)
const MAG_ALLOW = {};
const tilts = {};
function magTilt(id) {
  if (tilts[id] !== undefined) return tilts[id];
  const P = parts[id], b = P.box, h = b.max.y - b.min.y, p = P.geo.attributes.position, top = magMouth(id);
  let zs = 0, n = 0;
  for (let i = 0; i < p.count; i++) if (p.getY(i) <= b.min.y + h * 0.12) { zs += p.getZ(i); n++; }
  return (tilts[id] = n ? Math.atan2((zs / n) - top.z, h) : 0);
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
  if (parts[body]?.grip) return (grips[body] = parts[body].grip); // WW2: cabo marcado a mao
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
const MAG_LOCK = ['sniper_2']; // Marretao: so o pente dele, sem troca (pedido dele 01/11)
const magCompat = {};
export function chargerOptions(body, cat) {
  const key = body + '|' + cat;
  if (magCompat[key]) return magCompat[key];
  const native = nativePart(body, 'charger');
  if (!native) return (magCompat[key] = []);
  const nb = parts[native].box, nw = nb.max.x - nb.min.x, nd = nb.max.z - nb.min.z;
  const top = anchor('charger', nb), gi = gripInfo(body);
  const out = [native];
  if (MAG_LOCK.includes(body)) return (magCompat[key] = out);
  for (const id of CATEGORY[cat].chargers) {
    if (id === native || !parts[id]) continue;
    const cb = parts[id].box, w = cb.max.x - cb.min.x, d = cb.max.z - cb.min.z;
    if (!MAG_ALLOW[body]?.includes(id) && (w / nw < 0.7 || w / nw > 1.5 || d / nd < 0.62 || d / nd > 1.5)) continue; // so o que cabe no poco (palito fino ou tijolo largo nao)
    if (MAG_BAN[body]?.includes(id)) continue;
    if (MAG_THIN.includes(id) && ownerBody(id) !== body) continue; // pente de palito so na arma dona dele
    // onde ele fica depois de encaixado (topo no topo do original)
    const dz = top.z - (cb.min.z + cb.max.z) / 2;
    const z0 = cb.min.z + dz, z1 = cb.max.z + dz;
    if (gi && z1 > gi.z0 + 0.02 && z0 < gi.z1 - 0.02) continue;
    out.push(id);
  }
  for (const [id, D] of Object.entries(DRUM_MAGS)) if (D.body === body && parts[id]) out.push(id);
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

// eixo do cano em X: o centro da caixa, a nao ser que o modelo tenha peca saindo de um lado (alavanca do ferrolho)
const axisX = (body) => parts[body].axisX ?? (parts[body].box.min.x + parts[body].box.max.x) / 2;
function bodySlot(body, slot) {
  const nat = nativePart(body, slot);
  if (nat) return slot === 'charger' ? magMouth(nat) : anchor(slot, parts[nat].box);
  const b = parts[body].box, len = b.max.z - b.min.z, cx = axisX(body);
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
  const fore = parts[body].fore;
  if (fore !== undefined) return new THREE.Vector3(cx, (parts[body].foreY ?? pr.lo[sliceOf(pr, fore)]) + 0.015, fore); // WW2 e suporte de fabrica: marcado a mao
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
// arma que saiu de vez (troca de arma de um boneco, arma largada que sumiu): libera os materiais que sao so dela.
// Geometria das pecas e compartilhada (cache das pecas), entao fica. (02/11: cada troca/largada vazava memoria de video)
export function disposeGun(g) {
  g?.traverse(o => { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) if (m?.userData?.gunOwn) m.dispose(); });
}
const lensOwn = (m) => { m.userData.gunOwn = true; return m; };

// previa da Loja (04/11, pedido dele): a mira de verdade, sozinha, com a reticula no vidro. O olho fica atras (+z)
export const SIGHT_SHOW = 'subfusil_scope_2';
export function buildSight(ret, color = 'red', id = SIGHT_SHOW) {
  const p = parts[id]; if (!p) return null;
  const L = id === 'fusil_scope_5' ? postRing(p) : p.lens, b = p.box, sh = b.max.y - b.min.y;
  const c = L ? L.c.clone() : new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + sh * 0.62, b.max.z);
  const r = (L ? L.r : sh * 0.3) * 0.96, holder = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(S); holder.add(inner);
  const m = new THREE.Mesh(p.geo, paintMaterial(null, null, null, true)); outline(m, 0.0055); m.position.copy(c).negate(); inner.add(m);
  const lens = new THREE.Mesh(geo(THREE.CircleGeometry, Math.round(r * 1e4) / 1e4, 32), lensMaterial(false, ret, color, null, 1));
  lens.position.set(0, 0, (L ? L.z : b.max.z) - c.z - 0.004); lens.renderOrder = 3; inner.add(lens);
  return holder;
}
export function buildGun(wpn, lo) {
  const g = buildGunParts(wpn, lo), fx = g?.userData.saber ? null : camoById(lo?.camo).fx; // sabre nao leva camo
  if (g && fx) attachCamoFx(g, fx);
  return g;
}
function buildGunParts(wpn, lo) {
  if (wpn === 'minigun' && parts.__minigun) return buildMinigun();
  if (wpn === 'rpg' && parts.__rpg) return buildRpg();
  if (wpn === 'melee') return buildMelee(lo);
  if (wpn === 'fists') return buildFists();
  const cat = CATEGORY[wpn];
  if (!cat || !arsenalReady()) return makeGun(wpn);
  lo = { ...defaultLoadout(wpn), ...(lo || {}) };
  if (!parts[lo.body]) lo.body = cat.bodies[0];
  const WS = lo.ws && WSKINS[lo.ws];
  if (WS && WS.of === lo.body && parts[WS.body]) lo = { ...lo, body: WS.body, charger: null }; // pente ja vem no modelo da skin
  if (wpn === 'sniper' && !lo.scope) lo.scope = nativePart(lo.body, 'scope') || cat.scopes[0]; // sniper so de luneta
  if (!lo.charger || !chargerOptions(lo.body, wpn).includes(lo.charger)) lo.charger = nativePart(lo.body, 'charger');
  if (!lo.scope && wpn !== 'sniper') lo.scope = DEFAULT_IRON; // sem mira = mira de trilho padrao (01/11)
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(S);
  holder.add(inner);
  // revolver: o metal (zona verde) e preto de fabrica e leva a camo por cima
  const camoGreen = !!parts[lo.body]?.camoGreen;
  const mat = paintMaterial(lo.paint || (camoGreen ? parts[lo.body].metal : null), lo.accent, lo.camo, false, camoGreen);
  const partMat = paintMaterial(lo.paint, lo.accent, null, true);
  const bodyBox = parts[lo.body].box;
  const len = bodyBox.max.z - bodyBox.min.z, h = bodyBox.max.y - bodyBox.min.y, cx = axisX(lo.body);
  const chargerSlot = bodySlot(lo.body, 'charger');
  // origem da arma = punho da mao direita (atras do carregador, embaixo)
  const isPistol = wpn === 'pistol';
  const gi = gripInfo(lo.body);
  const gripZ = parts[lo.body].grip ? gi.zc : isPistol ? chargerSlot.z : gi ? gi.zc : Math.min(bodyBox.max.z - len * 0.15, chargerSlot.z + len * 0.17);
  const origin = new THREE.Vector3(cx, bodyBox.min.y + h * (isPistol ? 0.45 : 0.42), gripZ);
  const add = (name, at, m0 = mat, geo = null) => {
    const p = parts[name];
    if (!p) return null;
    const m = new THREE.Mesh(geo || p.geo, m0);
    outline(m, 0.0055);
    const off = new THREE.Vector3();
    if (at) off.copy(at.target).sub(at.self);
    m.position.copy(off).sub(origin);
    inner.add(m);
    return m;
  };
  add(lo.body, null, mat, lo.handle && parts[lo.handle] && parts[lo.body].geoNoFore || null); // com empunhadura: suporte de fabrica sai, o punho entra reto
  // revolver: tambor e cao como pecas proprias (giram no tiro)
  const anim = {};
  for (const key of ['drum', 'hammer', 'bolt']) {
    const P = parts[lo.body][key];
    if (!P) continue;
    const piv = new THREE.Group(); piv.position.copy(P.pivot).sub(origin);
    const mm = new THREE.Mesh(P.geo, mat); outline(mm, key === 'drum' ? 0.0055 : 0.003); mm.position.copy(P.pivot).multiplyScalar(-1);
    piv.add(mm); inner.add(piv); anim[key] = piv;
  }
  let scopeInfo = null;
  // frente do pente montado (z minimo, espaco do corpo): gadget de baixo do cano nunca encosta nele (03/11)
  let magFrontZ = null, gadgetShift = null;
  const noteMag = (mm) => { if (!mm) return; mm.geometry.computeBoundingBox(); const z = mm.geometry.boundingBox.min.z + mm.position.z + origin.z; magFrontZ = magFrontZ == null ? z : Math.min(magFrontZ, z); };
  for (const slot of ['charger', 'scope', 'handle']) {
    const id = lo[slot];
    if (!id || !parts[id]) continue;
    const nat = ownerBody(id) === lo.body;
    if (slot === 'charger' && !nat) {
      const self = magMouth(id), target = bodySlot(lo.body, 'charger'), F = MAG_FIT[lo.body + '|' + id] || MAG_FIT[id] || {};
      if (F.back) target.z += (parts[id].box.max.z - parts[id].box.min.z) * F.back; // +z = pra tras (coronha)
      // assenta pela ENTRADA do poco (fundo do corpo ali): entra o mesmo tanto que o original, mas no maximo 25%
      // da propria altura (pente curto sumia dentro do corpo; comprido ficava com vao). Estendido entra pouco (fica comprido).
      const mh = parts[id].box.max.y - parts[id].box.min.y, prB = profile(lo.body), lip = prB.lo[sliceOf(prB, target.z)];
      if (Number.isFinite(lip)) target.y = lip + Math.min(Math.max(0, target.y - lip), mh * (F.ins ?? 0.25));
      const mm = add(id, { self, target }, partMat);
      noteMag(mm);
      const natM = nativePart(lo.body, 'charger');
      const th = !F.noTilt && natM && Math.abs(magTilt(natM)) > 0.09 ? Math.max(-0.6, Math.min(0.6, magTilt(id) - magTilt(natM))) : 0; // so gira se o poco original e' inclinado (pente em cunha enganava a conta)
      if (mm && (Math.abs(th) > 0.01 || F.flip)) {
        // gira em volta da boca: v' = P + R(v - self), P = boca no espaco da arma
        mm.rotation.set(th, F.flip ? Math.PI : 0, 0);
        const P = target.clone().sub(origin);
        mm.position.copy(P).sub(self.clone().applyQuaternion(mm.quaternion));
      }
      continue;
    }
    if (slot === 'handle' && parts[id].gadget) { // gadget: na frente do pente, assentado embaixo do corpo ali
      const hb = parts[id].box, self = anchor('handle', hb), target = bodySlot(lo.body, 'handle'), gap = (hb.max.z - hb.min.z) * 0.06;
      if (magFrontZ != null && hb.max.z + (target.z - self.z) > magFrontZ - gap) target.z = magFrontZ - gap - (hb.max.z - self.z);
      target.z = Math.max(target.z, bodyBox.min.z + (self.z - hb.min.z) * 0.6); // nao passa muito da boca do cano
      const prG = profile(lo.body), lip = prG.lo[sliceOf(prG, target.z)];
      if (Number.isFinite(lip)) target.y = lip + 0.004;
      gadgetShift = target.clone().sub(self);
      add(id, { self, target }, partMat);
      continue;
    }
    if (slot !== 'scope') { const mm = add(id, nat ? null : { self: anchor(slot, parts[id].box), target: bodySlot(lo.body, slot) }, partMat); if (slot === 'charger') noteMag(mm); continue; }
    {
      const b = parts[id].box, sl = b.max.z - b.min.z, sh = b.max.y - b.min.y;
      // eixo optico = centro da lente; olho fica na traseira da mira
      const L = id === 'fusil_scope_5' ? postRing(parts[id]) : parts[id].lens; // Mira de Poste: a reticula mora dentro do aro
      const lensC = L ? L.c.clone() : new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + sh * 0.62, 0);
      const shift = nat ? new THREE.Vector3() : bodySlot(lo.body, 'scope').sub(anchor('scope', b));
      // a mira nunca passa das pontas do corpo (cano na frente, coronha atras)
      const sight = parts[lo.body].sight, mid = parts[lo.body].mid, hand = (sight !== undefined || mid !== undefined) && !parts[lo.body].wskin; /* skin futurista: tampa alta e irregular, a mira assenta no ponto mais alto (afundava) */
      if (!nat && sight !== undefined) shift.z = sight - 0.01 - b.max.z; // traseira da mira na frente da alca
      if (!nat && mid !== undefined) shift.z = mid - (b.min.z + b.max.z) / 2; // centro da mira em cima do pente
      if (!nat) {
        const zMin = bodyBox.min.z + 0.01 - b.min.z, zMax = bodyBox.max.z - 0.01 - b.max.z;
        if (zMin <= zMax) shift.z = Math.min(zMax, Math.max(zMin, shift.z));
      }
      if (SCOPE_FWD[lo.body]) shift.z -= (bodyBox.max.z - bodyBox.min.z) * SCOPE_FWD[lo.body]; // luneta mais pro meio (Luneta, 01/11)
      const sw = Math.min((b.max.x - b.min.x) * 0.45, 0.12), scx = (b.min.x + b.max.x) / 2 + shift.x;
      let seat = hiUnder(lo.body, scx, sw, b.min.z + shift.z + 0.02, b.max.z + shift.z - 0.02);
      // WW2: assenta no corpo (topo tipico do receptor sob a mira), ignorando o relevo da alca/massa de mira
      // luneta comprida no Bacamarte tambem: o pe passava por cima da mira da ponta do cano e boiava
      if ((hand || LONG_SCOPE[lo.body]?.includes(id)) && !nat) {
        const pr = profile(lo.body), z0 = b.min.z + shift.z, z1 = b.max.z + shift.z, hs = [];
        for (let k = sliceOf(pr, z0); k <= sliceOf(pr, z1); k++) hs.push(pr.hi[k]);
        hs.sort((x, y) => x - y);
        if (hs.length) seat = hs[Math.floor(hs.length * 0.35)];
      }
      if ((!nat || SCOPE_FWD[lo.body]) && Number.isFinite(seat)) shift.y = seat - 0.006 - b.min.y; // mira que andou pra frente assenta de novo no corpo
      // janela livre: nada do corpo (massa de mira, ferrolho, alca) pode passar na frente da lente.
      // Se passar, a mira sobe e ganha um suporte (riser) embaixo.
      const lr = L ? L.r : sh * 0.3;
      let top = topInFront(lo.body, lensC.x + shift.x, lr * 0.75, (L ? L.z : b.max.z) + shift.z);
      // luneta: o corpo entre o olho e a lente tambem nao pode tampar a imagem
      if (sl >= 0.6 && !hand) top = Math.max(top, topInFront(lo.body, lensC.x + shift.x, lr * 0.75, b.max.z + shift.z, b.max.z + shift.z + 0.15));
      // alca marcada (WW2): mira rente ao corpo, na frente da alca; a massa da boca do cano nao levanta nada
      // luneta no Bacamarte (LONG_SCOPE): a mira da ponta do cano levantava a luneta e ela boiava; assenta no cano
      const lift = hand || LONG_SCOPE[lo.body]?.includes(id) ? 0 : Math.min(sh * 0.5, Math.max(0, top + 0.012 - (lensC.y + shift.y - lr * 0.82))); // teto: a luneta trocada (04/11) subia um poste na Pica-Pau
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
      const big = SCOPE_ZOOM[id] ? SCOPE_ZOOM[id] >= 2 : sl >= 0.6; // zoom fechado manda: 1,4x e mira de verdade (a distancia do olho e a do red dot), 3x e luneta
      // luneta: o vidro vai pra boca traseira do tubo (senao o olho enxerga o tunel da ocular por dentro)
      const lensZ = L ? (big && rearTube(id) ? Math.max(L.z, b.max.z - 0.006) : L.z) : b.max.z;
      const eye = new THREE.Vector3(lensC.x, lensC.y, lensZ).add(shift).sub(origin).multiplyScalar(S);
      // vidro com a reticula (e, na luneta, a imagem ampliada)
      const lensR = (L ? L.r : sh * 0.3) * 0.96;
      const kind = big ? SCOPE_KIND[id] || null : null;
      const ret = lo.ret && lo.ret !== 'auto' ? lo.ret : big ? KIND_RET[kind] || 'duplex' : 'dot';
      const lens = new THREE.Mesh(geo(THREE.CircleGeometry, Math.round(lensR * 1e4) / 1e4, 32), lensMaterial(big, ret, lo.retColor || 'red', kind));
      lens.position.set(lensC.x, lensC.y, lensZ - 0.004).add(shift).sub(origin);
      lens.renderOrder = 3;
      inner.add(lens);
      // inclinacao do eixo optico (frente x tras); a pose de mira compensa pra ficar reta
      const tilt = L && L.f ? Math.atan2(L.f.y - L.c.y, L.c.z - L.f.z) : 0;
      scopeInfo = { big, kind, zoom: SCOPE_ZOOM[id] || (big ? 2.6 + sl * 1.6 : 1.55), eye, len: sl * S, lensR: lensR * S, lens, lift, tilt };
    }
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(cx, bodyBox.max.y - h * 0.28, bodyBox.min.z).sub(origin).multiplyScalar(S);
  let mzInfo = null;
  if (lo.muzzle && MUZZLES[lo.muzzle] && muzzleFits(lo.body)) {
    // bocal no lugar da ponta: encaixa um pouco pra tras da boca (cobre o bico original) e sai pra frente (-z)
    const T = barrelTip(lo.body), pal = paletteReader(gunTex);
    const uvA = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvB = pal ? paletteUV(pal, [30, 30, 30]) : [0.4, 0.4];
    const ge = muzzleGeo(lo.muzzle, T.r, T.len, uvA, uvB); ge.rotateX(-Math.PI / 2); ge.computeBoundingBox();
    const m = new THREE.Mesh(ge, partMat); outline(m, 0.0045);
    const back = T.len * 0.008; // so encosta (entrar 2,5% cruzava a malha do cano e piscava: Bacamarte, 04/11)
    m.position.set(T.c.x, T.c.y, T.z + back).sub(origin); inner.add(m);
    // varias bocas (skin Fictional, 04/11): um bocal em cada (mesma peca, mesmo tamanho), a 1a e a de cima
    for (const mz of parts[lo.body].muzzles?.slice(1) || []) { const m2 = new THREE.Mesh(ge, partMat); outline(m2, 0.0045); m2.position.set(mz.x, mz.y, T.z + back).sub(origin); inner.add(m2); }
    const reach = -ge.boundingBox.min.z - back; // quanto passou da boca original
    muzzle.position.set(T.c.x, T.c.y, T.z - reach).sub(origin).multiplyScalar(S);
    mzInfo = { id: lo.muzzle, flash: MUZZLES[lo.muzzle].flash ?? 1, quiet: !!MUZZLES[lo.muzzle].quiet };
  }
  const gripR = new THREE.Object3D();
  gripR.position.set(0, -0.03, 0.02);
  const gripL = new THREE.Object3D();
  let hs;
  if (lo.handle && parts[lo.handle]) {
    const hb = parts[lo.handle].box, nat = ownerBody(lo.handle) === lo.body;
    const shift = gadgetShift || (nat ? new THREE.Vector3() : bodySlot(lo.body, 'handle').sub(anchor('handle', hb)));
    hs = hb.getCenter(new THREE.Vector3()).add(shift);
  } else {
    const pr = profile(lo.body), z = parts[lo.body].fore ?? bodyBox.min.z + len * 0.3; // marca do guarda-mao quando existe
    hs = new THREE.Vector3(cx, pr.lo[sliceOf(pr, z)] + 0.06, z);
  }
  gripL.position.copy(hs).sub(origin).multiplyScalar(S);
  if (isPistol) gripL.position.set(-0.03, -0.05, 0.01);
  // sem mira: a mira de ferro fica no topo do corpo
  const iron = IRONS[lo.scope] && lo.scope !== IRON_OWN ? addIrons(lo.scope, lo.body, inner, origin, partMat) : (lo.scope === IRON_OWN ? ownIronPoint(lo.body, cx) : new THREE.Vector3(cx, bodyBox.max.y + 0.06, bodyBox.min.z + len * 0.6)).sub(origin).multiplyScalar(S);
  // skin de modelo: o neon e uma malha a parte que nunca pega camo nem pintura (04/11)
  if (parts[lo.body].neon) { const nm = new THREE.Mesh(parts[lo.body].neon, NEON_MAT); nm.position.copy(origin).multiplyScalar(-1); inner.add(nm); }
  holder.add(muzzle, gripR, gripL);
  const laser = lo.laser && LASER_DEF[lo.laser] ? addLaser(holder, lo, origin, isPistol) : null;
  holder.userData = { id: wpn, muzzle, muzzleDev: mzInfo, gripR, gripL, spin: null, scope: scopeInfo, iron, mat, laser, stats: loadoutStats(wpn, lo), drum: anim.drum || null, hammer: anim.hammer || null, sawed: !!parts[lo.body]?.sawed, bolt: anim.bolt ? { g: anim.bolt, z0: anim.bolt.position.z, travel: parts[lo.body].bolt.travel } : null };
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
  // maos na MANOPLA (03/11, pedido dele): a moldura preta atras dos canos (barras dos lados, z ~ -0.08);
  // antes a direita ficava enfiada no tambor de municao e a esquerda solta no ar
  const gripR = new THREE.Object3D(); gripR.position.set(0.077, 0.08, -0.078);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.073, 0.13, -0.078);
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'minigun', muzzle, gripR, gripL, spin, spinAxis: axis, scope: null, stats: {} };
  return holder;
}

// Perfil de cada empunhadura (estilo COD: todo ganho cobra alguma coisa)
// Perfis de pente e de mira (pedido dele 30/10): toda peca tem um ganho e uma perda propria.
// Distribuidos em sequencia pela lista global de pecas (vizinhas nunca repetem); somam com a regra de tamanho.
// rate e' o intervalo entre tiros (maior = mais lento); zoomK multiplica o zoom da mira.
// Pentes (31/10, pedido dele, estilo COD): dois pentes de troca rapida (rapido e leve) e o resto com a recarga
// subindo em linha reta com a bala a mais (+10% de pente ~ +9% de tempo de recarga).
const MAG_STYLES = [
  { reload: 0.82, mag: 0.9 },                              // rapido: troca bem ligeiro, leva menos bala
  { mag: 1.14, reload: 1.12, adsTime: 1.06 },              // estendido: mais bala, pesa e troca mais devagar
  { reload: 0.9, adsTime: 0.93, move: 1.03, kick: 1.07 },  // leve: troca rapido, mira e anda solto, a arma pula mais
  { kick: 0.88, reload: 1.08 },                            // estavel: peso embaixo segura o recuo, troca um pouco devagar
  { mag: 1.22, reload: 1.2, move: 0.97 },                  // duplo: muita bala, recarga lenta
  { spread: 0.93, rate: 1.05 },                            // mola dura: bala mais certa, cadencia um pouco menor
];
const SCOPE_STYLES = [
  { adsTime: 0.88, zoomK: 0.9 },             // rapida: entra na mira ligeiro, menos zoom
  { zoomK: 1.15, adsTime: 1.1 },             // longa: mais zoom, demora pra mirar
  { spread: 0.88, move: 0.97 },              // estavel: mais precisao, pesa no passo
  { kick: 0.9, adsTime: 1.06 },              // firme: segura o recuo, mira mais lenta
  { hip: 0.9, zoomK: 0.94 },                 // aberta: melhor de quadril, zoom menor
];
// luneta de sniper: o mesmo jogo, mais forte
const LONG_STYLES = [
  { adsTime: 0.82, zoomK: 0.85 },            // de caca: mira rapida, zoom curto
  { zoomK: 1.2, adsTime: 1.12, move: 0.96 }, // de longe: zoom alto, pesada
  { spread: 0.85, kick: 1.08, zoomK: 0.8 },  // de precisao (termica): bala mais certa, coice maior, zoom menor
  { kick: 0.85, adsTime: 1.08 },             // amortecida: quase sem coice, mira lenta
];
let styleIdx = null;
const styleOf = (id, list) => {
  if (!styleIdx) { styleIdx = {}; for (const key of ['chargers', 'scopes']) { const all = [...new Set(Object.values(CATEGORY).flatMap(c => c[key]))].sort(); all.forEach((x, i) => { styleIdx[x] = i; }); } }
  return list[(styleIdx[id] ?? 0) % list.length];
};

// akimbo nas compridas: duas na mao, o dobro de bala, recarga bem mais lenta (troca os dois pentes), sem mirar
const AKIMBO_LONG = {
  smg: { mag: 2, rate: 0.78, dmg: 0.82, spread: 1.35, kick: 1.15, reload: 2.1, move: 0.95 },
  shotgun: { mag: 2, rate: 0.85, dmg: 0.9, spread: 1.2, kick: 1.1, reload: 1.9, move: 0.95 },
};
const GRIP_HOLD = { lmg: 0.45, rifle: 0.7, smg: 0.7 };
const GRIP_TRAITS = {
  gd_flame: { adsTime: 1.1, move: 0.97 },                                     // lanca-chamas: pesa na mira
  gd_shot: { adsTime: 1.08, kick: 1.05 },                                      // escopetinha: pesa um pouco
  subfusil_handle_2: { kick: 0.7, adsTime: 1.08, move: 0.98 },               // vertical: segura o recuo
  subfusil_handle_3: { adsTime: 0.86, kick: 0.88, spread: 1.05 },            // angulada: mira rapida
  subfusil_handle_6: { spread: 0.78, kick: 0.9, move: 0.97 },                // curta: tiro de quadril
  fusil_handle_2: { kick: 0.6, spread: 0.88, adsTime: 1.16, move: 0.93 },    // pesada: trava a arma
  akimbo: { mag: 2, rate: 0.72, dmg: 0.86, spread: 1.15, kick: 1.1, reload: 1.55, move: 0.97 }, // duas pistolas: dobra o pente e alterna as maos; sem mirar
};

// Arma branca: textura propria do glb; camuflagem cobre a peca toda. Origem = mao (perto do fim do cabo),
// ponta apontando pro -z (pra frente, como o cano das armas).
function meleeMaterial(map, camo) {
  const m = toon(0xffffff, map ? { map, unique: true } : { vertexColors: true, unique: true }); // espada: cor no vertice
  const glslCode = camoById(camo).code; // so a camo desta lamina entra no shader
  m.userData.u = { uCamo: { value: glslCode }, uTime: camoTime, uReact: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;\nattribute float aBlade;\nvarying float vBlade;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position * 0.22; vBlade = aBlade;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + camoGlsl(glslCode) + '\nvec3 gCamoGlow = vec3(0.0);\nvarying float vBlade;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gCamoGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (uCamo > 0.5 && vBlade > 0.5) { vec3 cg; float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = camoColor(int(uCamo + 0.5), vCamoPos, uTime, lum, cg); gCamoGlow = cg; }`);
  };
  m.customProgramCacheKey = () => 'melee' + glslCode;
  return m;
}
// Punhos (battle royale): nada na mao; as luvas dos bracos ficam em guarda de boxe (direita na frente)
function buildFists() {
  const holder = new THREE.Group();
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -0.3);
  const gripR = new THREE.Object3D(); gripR.position.set(0, 0, 0);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.24, 0.05, 0.1);
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'fists', muzzle, gripR, gripL, spin: null, scope: null, iron: new THREE.Vector3(0, 0.08, -0.1), melee: true, fists: true, stats: loadoutStats('fists', null) };
  return holder;
}

function buildMelee(lo) {
  const id = lo && parts[lo.body]?.melee ? lo.body : 'melee_10';
  const p = parts[id], holder = new THREE.Group();
  if (!p) return makeGun('pistol');
  const b = p.box, len = b.max.z - b.min.z, k = MELEE_LEN[Number(id.split('_')[1])] / len;
  const m = new THREE.Mesh(p.geo, meleeMaterial(p.map, p.saber ? null : lo?.camo));
  outline(m, 0.02);
  const saber = p.saber ? saberBlade(p.saber, lo?.accent) : null;
  if (saber) m.add(saber.mesh);
  // mao a 12% do fim do cabo; gira 180 no y pra ponta ir pro -z
  const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2;
  // espada (04/11): a mao vai no MEIO do cabo (do pomo ate onde a lamina comeca); 12% fixo deixava a luva fora do cabo da katana
  let handZ = b.min.z + len * 0.12, hiltTop = null;
  if (p.sword && p.geo.attributes.aBlade) { const P = p.geo.attributes.position, A = p.geo.attributes.aBlade; let z0 = Infinity; for (let i = 0; i < P.count; i++) if (A.getX(i) > 0.5) z0 = Math.min(z0, P.getZ(i)); if (Number.isFinite(z0) && z0 > b.min.z) { hiltTop = z0; handZ = b.min.z + (z0 - b.min.z) * 0.5; } }
  if (p.saber) { hiltTop = p.saber.z0; handZ = b.min.z + (hiltTop - b.min.z) * 0.5; } // meio do cabo
  m.position.set(-cx, -cy, -handZ);
  const inner = new THREE.Group(); inner.add(m); inner.scale.setScalar(k); inner.rotation.y = Math.PI;
  holder.add(inner);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -len * 0.88 * k);
  const gripR = new THREE.Object3D(); gripR.position.set(0, -0.01, 0.01);
  const gripL = new THREE.Object3D(); gripL.position.set(-0.05, -0.08, 0.12);
  if (p.sword && hiltTop != null) { // espada (04/11, pedido dele): duas maos no cabo, a direita junto da guarda e a esquerda perto do pomo
    // como se segura de verdade: direita logo abaixo da guarda, esquerda atras dela com ~2 dedos de folga. Distancia fixa
    // em metros (nao em % do cabo): as maos ficam juntas em qualquer espada
    const top = -(hiltTop - handZ) * k, end = -(b.min.z - handZ) * k;
    gripR.position.set(0, 0, top + 0.06); gripL.position.set(0, 0, Math.min(top + 0.175, end + 0.03));
  }
  holder.add(muzzle, gripR, gripL);
  holder.userData = { id: 'melee', muzzle, gripR, gripL, spin: null, scope: null, iron: new THREE.Vector3(0, 0.08, -0.1), melee: true, sword: !!p.sword, flipVm: !!p.flipEdge, saber, inner, mat: m.material, stats: loadoutStats('melee', lo) };
  return holder;
}

// Modulo laser: na lateral esquerda do guarda-mao (o lado que a camera ve), na pistola embaixo do cano.
// O feixe e' um cilindro aditivo que some ao longe; quem desenha o ponto no mundo e' o main.
let ATT_MAT = null;
const BEAM_LEN = 18; // feixe dos outros (era 12; mais longo pra ler a mira)
function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCol: { value: new THREE.Color(color) }, uOn: { value: 1 } },
    // vX = volta do cilindro: miolo claro no meio, cor nas bordas (le bem em cenario claro e escuro)
    vertexShader: 'varying float vT; varying float vX; void main(){ vT = 1.0 - uv.y; vX = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uCol; uniform float uOn; varying float vT; varying float vX; void main(){ float a = pow(vT, 1.4) * 0.95 * uOn; float core = pow(abs(sin(vX * 6.2832)), 6.0); gl_FragColor = vec4(mix(uCol, vec3(1.0), core * 0.6), a); }',
  });
}
// lado esquerdo (x minimo) do corpo so no trecho em volta de z (a caixa inteira pega peca saindo de outro ponto)
function sideAt(body, z) {
  const P = parts[body], pos = P.geo.attributes.position, tol = (P.box.max.z - P.box.min.z) * 0.035;
  let mn = Infinity; for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getZ(i) - z) < tol) mn = Math.min(mn, pos.getX(i));
  return Number.isFinite(mn) ? mn : P.box.min.x;
}
function addLaser(holder, lo, origin, isPistol) {
  const D = LASER_DEF[lo.laser], [w, h, d] = D.size;
  const b = parts[lo.body].box, pr = profile(lo.body), len = b.max.z - b.min.z, cx = axisX(lo.body);
  const z = b.min.z + len * (isPistol ? 0.16 : 0.27), sl = pr.lo[sliceOf(pr, z)], sh = pr.hi[sliceOf(pr, z)];
  const at = isPistol
    ? new THREE.Vector3(cx, sl, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(0, -h / 2 - 0.004, 0))
    : new THREE.Vector3(sideAt(lo.body, z), (sl + sh) / 2, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(-w / 2 - 0.004, 0, 0)); // encosta na lateral DAQUELE trecho (alavanca do ferrolho afastava)
  const g = new THREE.Group(); g.position.copy(at);
  let box;
  const AG = ATT[D.model];
  if (AG) { // peca do pacote de acessorios no tamanho do slot (comprimento manda, proporcao do modelo)
    const ge = AG.clone(); ge.computeBoundingBox(); const sz = ge.boundingBox.getSize(new THREE.Vector3()), k = Math.min(d / sz.z, w * 1.25 / sz.x, h * 1.6 / sz.y);
    ge.scale(k, k, k); box = new THREE.Mesh(ge, ATT_MAT ||= toon(0xffffff, { map: gunTex }));
  } else box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(0x2a2724));
  outline(box, 0.004); g.add(box);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(isPistol ? w * 0.7 : 0.008, isPistol ? 0.008 : h * 0.7, d * 0.7), toon(0x1c1a18));
  rail.position.set(isPistol ? 0 : w / 2 + 0.004, isPistol ? h / 2 + 0.004 : 0, 0); g.add(rail);
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.3, h * 0.3, 0.006, 12), new THREE.MeshBasicMaterial({ color: D.color }));
  eye.rotation.x = Math.PI / 2; eye.position.z = -d / 2 - 0.002; g.add(eye);
  // feixe: vT = 1 na boca do laser e 0 na ponta (some ao longe)
  const geo = new THREE.CylinderGeometry(0.003, 0.005, 1, 8, 1, true); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -0.5);
  const beam = new THREE.Mesh(geo, beamMaterial(D.color));
  beam.position.z = -d / 2 - 0.004; beam.scale.z = BEAM_LEN; beam.renderOrder = 4; beam.frustumCulled = false;
  beam.userData.noFx = true; // feixe de 18 m nao conta como superficie da arma (efeito da camo lendaria)
  g.add(beam);
  holder.add(g);
  if (D.light) { beam.visible = false; eye.scale.setScalar(1.5); } // lanterna: sem feixe colorido; a luz e da GunLights
  return { group: g, beam, eye, color: D.color, len: BEAM_LEN, light: !!D.light };
}

// Efeito das pecas nos atributos (multiplicadores sobre WEAPONS)
export function loadoutStats(wpn, lo, noStyle = false) {
  const st = { mag: 1, spread: 1, kick: 1, adsTime: 1, zoom: null, zoomK: 1, rate: 1, dmg: 1, reload: 1, move: 1, hip: 1, mode: null, burst: 0 };
  if (!lo || !arsenalReady() || !parts[lo.body]) return st;
  // perfil do modelo: modo de tiro e cadencia/dano/quadril proprios
  const bt = bodyTrait(lo.body);
  st.mode = bt.mode || null; st.burst = bt.burst || 0; st.pellets = bt.pellets || 0; // serrada: chumbo
  for (const k of ['rate', 'dmg', 'hip', 'kick', 'spread', 'mag', 'reload']) if (bt[k]) st[k] *= bt[k];
  const nat = nativePart(lo.body, 'charger');
  const drum = DRUM_MAGS[lo.charger];
  if (drum && parts[lo.charger]) { // tambor: balas fixas (sobre o pente base da categoria), pesa e troca devagar
    if (drum.magK) st.mag *= drum.magK; else st.mag = drum.rounds / (WEAPONS[wpn]?.mag || drum.rounds);
    for (const k of ['reload', 'adsTime', 'move', 'kick']) st[k] *= drum[k];
  } else if (lo.charger && nat && parts[lo.charger] && lo.charger !== nat) {
    const vol = (b) => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
    const m = st.mag = Math.max(0.7, Math.min(1.6, vol(parts[lo.charger].box) / vol(parts[nat].box)));
    // pente maior: mais balas, mas pesa (mira, recarga e passo mais lentos); menor: o contrario
    if (m > 1) { st.adsTime *= 1 + (m - 1) * 0.25; st.reload *= 1 + (m - 1) * 0.45; st.move *= 1 - (m - 1) * 0.06; }
    else { st.adsTime *= 1 - (1 - m) * 0.3; st.reload *= 1 - (1 - m) * 0.5; st.move *= 1 + (1 - m) * 0.05; }
    for (const [k, v] of Object.entries(styleOf(lo.charger, MAG_STYLES))) st[k] *= v; // jeito proprio do pente
  }
  if (lo.laser && LASER_DEF[lo.laser]) for (const [k, v] of Object.entries(LASER_DEF[lo.laser].traits)) st[k] *= v;
  // tipo de bala: so os status que ela mexe (fogo, marca, respingo e parede ficam nas regras do jogo)
  if (lo.ammo && AMMO[lo.ammo] && wpn !== 'melee') for (const k of ['dmg', 'mag', 'kick', 'rate']) if (AMMO[lo.ammo][k]) st[k] *= AMMO[lo.ammo][k];
  if (lo.handle) {
    const g = (lo.handle === 'akimbo' && AKIMBO_LONG[wpn]) || GRIP_TRAITS[lo.handle] || { spread: 0.8, kick: 0.72, adsTime: 1.08 };
    for (const k in g) st[k] *= g[k];
    // 04/11 (hotfix, pedido dele): empunhadura de verdade segura o tranco, mais ainda na Metralhadora (era so -30%: 12 tiros/s subiam igual)
    if (lo.handle !== 'akimbo' && !GADGETS[lo.handle]) st.kick *= GRIP_HOLD[wpn] ?? 0.75;
  }
  if (IRONS[lo.scope]) for (const [k, v] of Object.entries(IRONS[lo.scope])) st[k] *= v; // mira de ferro: entra rapido, sem zoom
  const mz = lo.muzzle && muzzleFits(lo.body) && MUZZLES[lo.muzzle];
  if (mz) for (const k of ['spread', 'kick', 'adsTime', 'move', 'dmg', 'hip']) if (mz[k]) st[k] *= mz[k];
  const kit = lo.conv && CONV_KITS[lo.body]?.[lo.conv];
  if (kit) for (const [k, v] of Object.entries(kit)) if (k === 'mode' || k === 'burst') st[k] = v; else st[k] *= v; // burst = balas por rajada (valor, nao fator)
  if (lo.handle === 'akimbo' && st.mode === 'burst') { st.mode = 'semi'; st.burst = 0; } // akimbo: cada bala sai de uma mao, intercalando (rajada viraria tiro duplo)
  if (lo.scope && parts[lo.scope]) {
    const b = parts[lo.scope].box, sl = b.max.z - b.min.z;
    st.zoom = sl >= 0.6 ? 2.6 + sl * 1.6 : 1.55;
    st.adsTime *= sl >= 0.6 ? 1.35 : 1.05;
    st.spread *= 0.85;
    // jeito proprio da mira (luneta tem os seus); o zoom muda com ele
    const li = CATEGORY.sniper.scopes.indexOf(lo.scope); // lunetas: uma por perfil, na ordem da lista de sniper
    const sty = noStyle ? {} : sl >= 0.6 && li >= 0 ? LONG_STYLES[li % LONG_STYLES.length] : styleOf(lo.scope, sl >= 0.6 ? LONG_STYLES : SCOPE_STYLES);
    for (const [k, v] of Object.entries(sty)) if (k === 'zoomK') st.zoomK = v; else st[k] *= v;
    st.zoom *= st.zoomK || 1;
    if (SCOPE_ZOOM[lo.scope]) st.zoom = SCOPE_ZOOM[lo.scope]; // zoom fechado por mira (pedido dele)
  }
  // corpo maior = mais preciso, um pouco mais lento (lamina fora: cada arquivo tem a sua escala, e o golpe usa a ficha)
  const cat = CATEGORY[wpn];
  const bl = parts[lo.body].box.max.z - parts[lo.body].box.min.z;
  const ref = parts[cat.bodies[0]].box.max.z - parts[cat.bodies[0]].box.min.z;
  const k = wpn === 'melee' ? 1 : bl / ref;
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
  // sniper sempre tem luneta: compara com a mesma luneta sem o jeito dela (mostra so o ganho e a perda)
  const snipe = slot === 'scope' && wpn === 'sniper' && id;
  const a = snipe ? loadoutStats(wpn, cand, true) : loadoutStats(wpn, base), b = loadoutStats(wpn, cand);
  // [chave do texto, quanto melhorou (positivo = bom)]
  const out = [
    ['st_ctrl', a.kick / b.kick - 1], ['st_acc', a.spread / b.spread - 1], ['st_hip', a.hip / b.hip - 1], ['st_ads', a.adsTime / b.adsTime - 1],
    ['st_reload', a.reload / b.reload - 1], ['st_move', b.move / a.move - 1], ['st_mag', b.mag / a.mag - 1],
    ['st_rate', a.rate / b.rate - 1], ['st_zoom', b.zoomK / a.zoomK - 1],
  ].filter(([, v]) => Math.abs(v) >= 0.01);
  return out.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
}

// ---------- loadouts salvos ----------
const KEY = 'rr_loadouts_v1';
export function getLoadouts() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { /* sem storage */ }
  let gone = false;
  for (const c of Object.keys(CATEGORY)) {
    const lo = { ...defaultLoadout(c), ...(s[c] || {}) };
    // modelo que saiu do jogo (Maquina de Escrever, subfusil_11): volta pro padrao e o save some com ele
    if (lo.body && !CATEGORY[c].bodies.includes(lo.body)) { lo.body = defaultLoadout(c).body; lo.charger = null; gone = true; }
    // save antigo (sem m1): equipa a mira gratis uma vez so; depois vale a escolha do jogador
    if (s[c] && !s[c].m1) { if (!lo.scope && !lo.bp) lo.scope = freeScope(c, lo.body); lo.m1 = 1; }
    s[c] = lo;
  }
  if (gone) { saveLoadouts(s); pushSoon(); }
  return s;
}
// variantes do jogador (02/11, pedido dele, estilo loadout do COD): montagem inteira salva com nome, por categoria
// { smg: [{ id, name, lo }] }. Equipada = lo.cv (id) + lo.cvName; mexer numa peca tira o selo (igual a variante de elite)
const VKEY = 'rr_variants_v1';
export const VARIANT_MAX = 6;
export function getVariants() { try { const v = JSON.parse(localStorage.getItem(VKEY)); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }
export function saveVariants(v) { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch { /* sem storage */ } pushSoon(); }
export function saveLoadouts(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sem storage */ } pushSoon(); } // sobe pra conta Rovex tambem (antes so ia junto com outro save)

// Na partida so vale o que ja foi desbloqueado; peca bloqueada volta pro padrao (o salvo fica intacto)
export function unlockedLoadout(cat, lo, partOpen, camoOpen, camoList) {
  const C = CATEGORY[cat];
  if (!C || !lo) return lo;
  const out = { ...lo };
  // valor que nao existe mais (ou gravado no slot errado pela lista travada do arsenal): volta pro padrao
  if (out.camo && !camoList.some(c => c.id === out.camo)) out.camo = null;
  if (out.bp && !BLUEPRINTS[out.bp]) delete out.bp;
  if (out.ws && (!wsOwned(out.ws))) delete out.ws; // skin de outro modelo ou nao comprada
  if (out.ret && !retOwned(out.ret)) delete out.ret; // reticula da Loja sem comprar
  if (out.retColor && !retColorOwned(out.retColor)) delete out.retColor; // cor do Rovex Pass antes do nivel
  // variante de elite liberada: a montagem dela vale mesmo com peca que o nivel ainda nao abriu
  const B = out.bp && BLUEPRINTS[out.bp];
  if (B && B.wpn === cat && bpUnlocked(out.bp)) {
    const cm = camoList.find(c => c.id === out.camo);
    return { ...out, ...bpLoadout(out.bp), camo: cm && !camoOpen(cat, cm) ? B.lo.camo : out.camo };
  }
  delete out.bp;
  const ok = (list, id) => { const i = list.indexOf(id ?? null); return i < 0 || partOpen(cat, i, id); };
  if (!ok(C.bodies, out.body)) { out.body = C.bodies[0]; out.charger = null; }
  if (out.scope && out.scope !== freeScope(cat, out.body) && !ok([null, ...C.scopes], out.scope)) out.scope = cat === 'sniper' ? nativePart(out.body, 'scope') : null;
  if (out.scope && !scopeFits(out.body, cat, out.scope)) out.scope = null; // mira que nao cabe nessa arma
  if (cat === 'sniper' && !out.scope) out.scope = nativePart(out.body, 'scope') || C.scopes[0]; // sniper sempre de luneta
  const mags = chargerOptions(out.body, cat);
  if (out.charger && (!mags.includes(out.charger) || !ok(mags, out.charger))) out.charger = null;
  if (out.handle && (!ok([null, ...C.handles], out.handle) || !handleFits(out.body, cat, out.handle))) out.handle = null;
  if (out.conv && !CONV_KITS[out.body]?.[out.conv]) out.conv = null; // trocou de corpo: o kit era do outro
  if (out.muzzle && !muzzleOptions(out.body).includes(out.muzzle)) out.muzzle = null; // bocal so onde existe
  if (out.muzzle && !partOpen(cat, 0, 'mz:' + out.muzzle)) out.muzzle = null; // bocal que o nivel da arma ainda nao abriu
  if (out.scope?.startsWith('iron_') && !IRONS[out.scope]) out.scope = null; // mira de ferro antiga (trocada pelas de trilho)
  if (out.laser && !ok([null, ...LASERS], out.laser)) out.laser = null;
  if (out.tracer && !partOpen(cat, 1, 'tr:' + out.tracer)) out.tracer = null;
  if (out.ammo && (!AMMO[out.ammo] || !partOpen(cat, 1, 'am:' + out.ammo))) out.ammo = null; // bala trancada volta pra normal
  const cm = camoList.find(c => c.id === out.camo);
  if (cm && !camoOpen(cat, cm)) out.camo = null;
  return out;
}
export const _dbg = { geoIslands: (g) => geoIslands(g.index ? g.toNonIndexed() : g), parts, profile: b => profile(b), nativePart, rearTube: id => rearTube(id) };
