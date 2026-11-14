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
import { SIGHT_KIND, sightGeoFor, loadComic, comicGeo, hasComic } from './sights.js';
import { t, wName } from './i18n.js';
import { camoGlsl, camoTime, camoById, rovexLogoU, bmUniforms } from './camos.js';
import { bodyTrait, bpMods, BLUEPRINTS, AMMO, WEAPONS, GADGETS, WSKINS, baseBody, INTEGRAL_SIL } from '../shared/weapons.js';
import { bpUnlocked, progressInfo, passLevel, passHasStamp } from './progress.js';
import { STAMPS, stampGlsl, stampCode } from './stamps.js';
import { RET_PASS } from './pass.js';
import { shopOwned } from './shopstore.js';
import TT_GUNS from './tt_guns.json'; // armas do TastyTony (06/11): o editor tools/arma-editor.html grava aqui
// skin de modelo da Loja (04/11): fica em lo.ws; so muda o VISUAL (o corpo, nivel e stats seguem os do modelo original)
export const wsOwned = (id) => !!WSKINS[id] && (!!progressInfo().unlockAll || shopOwned('wskin:' + id));
export const wsFor = (body) => Object.keys(WSKINS).filter(id => WSKINS[id].of === body);

const S = 0.32; // unidade do glb -> metros
const parts = {};  // nome -> { geo, box }
if (import.meta.env?.DEV) window.__parts = parts; // depuracao local (lente fora do lugar etc.)
let ready = null;
let allLoaded = false;
// 08/11 (bug em producao, iPad/Edge): o arsenal fica 'pronto' com o 1o pacote, mas metralhadora e pacotes extras chegam
// depois. Corpo que ainda nao chegou nao pode quebrar a montagem: entra outro corpo da categoria ou a arma provisoria
export const arsenalLoaded = () => allLoaded;
let gunTex = null;

// Armas brancas (melee.glb): ordem dos meshes do arquivo; comprimento real em metros por peca
export const MELEE_GONE = ['melee_2', 'melee_8', 'melee_10']; // 07/11 (pedido dele): Peixeira, Sobrevivente e Canivete sairam
export const DEFAULT_MELEE = 'melee_7'; // Facao (o Canivete era o padrao)
export const meleeBody = (id) => (id && !MELEE_GONE.includes(id) ? id : DEFAULT_MELEE);
export const MELEE = Array.from({ length: 19 }, (_, i) => 'melee_' + i).filter(id => !MELEE_GONE.includes(id)); // 15-17: espadas (04/11, sword_set.glb); 18: Sabre de Neon (light_saber.glb)
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
  pistol: { bodies: [...range('pistol_', 1, 6), 'pistol_7', 'pistol_8', 'pistol_9', 'pistol_10', 'pistol_11', 'pistol_12', 'pistol_13', 'pistol_14', 'pistol_15'], scopes: ['pistol_scope_5', 'subfusil_scope_2', 'subfusil_scope_6', 'subfusil_scope_9'], chargers: [...range('pistol_charger_', 1, 6), 'pistol_charger_7', 'pistol_charger_8', 'pistol_charger_9', 'pistol_charger_12', 'pistol_charger_14'], handles: ['akimbo'] }, // akimbo: segunda pistola na outra mao (abre no ultimo nivel da arma)
  smg: { bodies: [...range('subfusil_', 1, 10), 'subfusil_13', 'subfusil_14', 'subfusil_15', 'subfusil_16'] /* Tamborzao saiu (04/11); 14-16 leva 13/11 */, scopes: ['subfusil_scope_1', 'subfusil_scope_2', 'subfusil_scope_5', 'subfusil_scope_6', 'subfusil_scope_7', 'subfusil_scope_8', 'subfusil_scope_9', 'subfusil_scope_10', 'fusil_scope_1', 'fusil_scope_7'], chargers: [...range('subfusil_charguer_', 1, 10), 'subfusil_charger_11', 'subfusil_charger_14', 'subfusil_charger_15', 'subfusil_charger_16'], handles: ['akimbo', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'fusil_handle_2'] },
  rifle: { bodies: [...range('fusil_', 1, 7), /* Trovao de Lata (fusil_9) saiu 04/11 */ 'fusil_11', 'fusil_12', 'fusil_13', 'fusil_14', 'fusil_15', 'fusil_16'], scopes: ['fusil_scope_1', 'fusil_scope_2', 'fusil_scope_4', 'fusil_scope_5', 'fusil_scope_6', 'fusil_scope_7', 'subfusil_scope_5', 'subfusil_scope_7', 'sniper_scope_1'], chargers: ['fusil_charger_1', ...range('fusil_charguer_', 2, 7), 'fusil_charger_8', 'fusil_charger_9', 'fusil_charger_14', 'fusil_charger_15', 'fusil_charger_16'], handles: ['fusil_handle_2', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'gd_flame', 'gd_shot'] },
  // escopeta: as 3 lunetas do fim da lista so cabem no Bacamarte (LONG_SCOPE)
  shotgun: { bodies: ['shotgun_1', 'shotgun_2', 'shotgun_3', 'shotgun_4', 'shotgun_5', 'shotgun_6', 'shotgun_7'], scopes: ['subfusil_scope_2', 'subfusil_scope_6', 'fusil_scope_7', 'subfusil_scope_9', 'sniper_scope_1', 'sniper_scope_2'], chargers: ['shotgun_charguer_1'], handles: ['akimbo', 'subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6'] },
  melee: { bodies: MELEE, scopes: [], chargers: [], handles: [] },
  sniper: { bodies: ['sniper_0', 'sniper_1', 'sniper_2', 'sniper_3', 'sniper_4', 'sniper_5', 'sniper_6'], scopes: ['sniper_scope_1', 'sniper_scope_2', 'fusil_scope_6'] /* 07/11 (pedido dele): Luneta Convencional (sniper_scope_0) saiu; ficam Militar, Termica e Zoom */, chargers: ['sniper_charger_1', 'sniper_charger_2', 'sniper_charger_6'], handles: ['sniper_handle_1', 'sniper_handle_2', 'sniper_bipod_1', 'sniper_bipod_2', 'akimbo' /* so a Sentenca (AKIMBO_BODIES); no FIM pra nao mudar o nivel das outras */] },
};
// Metralhadora (04/11, pedido dele: categoria nova). Miras e empunhaduras do fuzil (sem gadget de baixo do cano: o
// pente enorme fica embaixo); o pente de cada uma vem do arquivo (lmg_charger_N)
CATEGORY.lmg = { bodies: ['lmg_1', 'lmg_2', 'lmg_3', 'lmg_4', 'lmg_5'], scopes: [...CATEGORY.rifle.scopes], chargers: ['lmg_charger_1', 'lmg_charger_2', 'lmg_charger_3', 'lmg_charger_5'], handles: CATEGORY.rifle.handles.filter(h => !h.startsWith('gd_')) };
// So uma peca (mira, pente, empunhadura), pintada como na arma: foto do banner de desbloqueio
export function buildPartPreview(id, lo = {}) {
  const p = parts[id];
  if (!p || !gunTex) return null;
  const holder = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(S); holder.add(inner);
  const m = new THREE.Mesh(p.geo, paintMaterial(lo.paint, lo.accent, null, true, false, false, lo.pat, lo.pat2));
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
export const LASERS = ['laser_1', 'laser_2', 'light_1', 'laser_3', 'laser_4']; // 13/11: roxo e amarelo no fim da progressao
const LASER_DEF = {
  laser_1: { color: 0xff2a2a, size: [0.03, 0.028, 0.085], model: 'laser', traits: { hip: 0.8, adsTime: 1.03 } },              // compacto vermelho
  laser_2: { color: 0x39ff5a, size: [0.04, 0.038, 0.12], model: 'laser', traits: { hip: 0.7, adsTime: 1.07, move: 0.98 } },  // tatico verde
  light_1: { color: 0xfff1d0, size: [0.042, 0.042, 0.15], model: 'light', light: true, traits: { hip: 0.92, adsTime: 1.04 } }, // lanterna tatica
  // 13/11 (pedido dele, modelos do Blender): atributos que os outros nao tem. Roxo = mira mais rapida (ajuda pouco no quadril);
  // amarelo = estabiliza o coice (mira um tico mais lenta)
  laser_3: { color: 0xb04bff, size: [0.036, 0.04, 0.1], model: 'laserP', traits: { hip: 0.9, adsTime: 0.95 } },              // Prisma roxo
  laser_4: { color: 0xffd23a, size: [0.042, 0.03, 0.09], model: 'laserY', twin: true, traits: { hip: 0.88, kick: 0.9, adsTime: 1.05 } },  // Duplo amarelo
};
export const laserColor = (id) => LASER_DEF[id]?.color ?? 0xff2a2a;
function range(p, a, b) { const r = []; for (let i = a; i <= b; i++) r.push(p + i); return r; }

export const PART_LABEL = {
  body: 'Corpo', scope: 'Mira', charger: 'Carregador', handle: 'Empunhadura',
};

// nome de exibicao das pecas (cartoon, nada de marca)
export function partName(slot, id) {
  if (!id) return slot === 'muzzle' ? t('muzzleNone') : slot === 'conv' ? t('convNone') : slot === 'scope' ? t('ir_iron_own') : slot === 'handle' ? t('noGrip') : slot === 'laser' ? t('noLaser') : t('stdPart');
  const n = id.match(/(\d+)$/)?.[1] ?? '0';
  if (slot === 'body' && id.startsWith('melee_')) return t('ml_' + n);
  if (slot === 'body' && WW2_BODIES.includes(id)) return t('ww_' + id);
  if (slot === 'body') { const k = 'bn_' + id, s = t(k); return s !== k ? s : wName(catOf(id)) + ' ' + t('model') + ' ' + n; }
  if (slot === 'scope' && IRONS[id]) return t('ir_' + id);
  if (slot === 'scope' && SNIPER_SCOPE_NAME[id]) return t(SNIPER_SCOPE_NAME[id]); // lunetas com nome do que fazem (01/11)
  if (slot === 'scope') { const big = !!parts[id] && sightLen(parts[id]) >= 0.6; return (big ? t('scopeBig') : t('scopeDot')) + ' ' + n + (id.startsWith('sniper') ? ' ' + t('long') : ''); }
  if (slot === 'charger' && id.startsWith('cmag_fusil_13_')) return t('magCurve' + id.slice(-1)); // Pipocadeira: tamanhos do pente curvo
  if (slot === 'charger' && DRUM_MAGS[id]?.name) return t(DRUM_MAGS[id].name);
  if (slot === 'charger' && id.startsWith('cmag_')) return t(['bmMagSmall', 'extMag', 'magShoe', 'magBottle', 'magRibbed', 'magWedge'][Number(id.slice(-1)) - 1] || 'extMag');
  if (slot === 'charger' && DRUM_MAGS[id]?.heatK) return t('coolMag');
  if (slot === 'charger' && DRUM_MAGS[id]?.ext) return t(id.endsWith('_2') ? 'extMag2' : 'extMag');
  if (slot === 'charger' && DRUM_MAGS[id]) return t('drumMag');
  if (slot === 'charger' && id.startsWith('lmg_')) return t('lmgBox'); // metralhadora: caixa de fita (04/11)
  if (slot === 'charger') { const k1 = 'mgi_' + id, s1 = t(k1); if (s1 !== k1) return s1; const k2 = 'mgn_' + n, s2 = t(k2); return s2 !== k2 ? s2 : t('mgn_13'); } // 08/11 (pedido dele): nome proprio, nada de "Pente 2"; 13/11: pente da leva nova com nome dele (mgi_), nunca a chave crua
  if (slot === 'conv') return t('conv_' + id);
  if (slot === 'muzzle') return t('mz_' + id);
  if (slot === 'laser') return t(id === 'light_1' ? 'lightTac' : id === 'laser_2' ? 'laserTac' : id === 'laser_3' ? 'laserPrisma' : id === 'laser_4' ? 'laserDuplo' : 'laserDot');
  if (id === 'akimbo') return t('akimbo');
  if (GADGETS[id]) return t(id);
  return t('gpn_' + id);
}
function catOf(id) { return id.startsWith('lmg') ? 'lmg' : id.startsWith('melee') ? 'melee' : id.startsWith('subfusil') ? 'smg' : id.startsWith('fusil') ? 'rifle' : id.startsWith('pistol') ? 'pistol' : id.startsWith('shotgun') ? 'shotgun' : 'sniper'; }

// Que mira cabe em que arma (pelo comprimento da mira): pistola e 12 so red dot pequeno, submetralhadora
// red dot/holografica, fuzil ate luneta media, sniper so luneta. A mira original do corpo sempre cabe.
// O indice na lista de miras continua o mesmo (e ele que decide o nivel de desbloqueio).
const SCOPE_LEN = { pistol: [0, 0.45], shotgun: [0, 0.45], smg: [0, 0.6], rifle: [0, 0.75], lmg: [0, 0.75], sniper: [0.6, 9] };
// corpos que aceitam luneta de sniper (31/10, pedido dele: lunetas no Bacamarte)
const LONG_SCOPE = { shotgun_1: ['sniper_scope_1', 'sniper_scope_2'] };
// kit de conversao (01/11, pedido dele): muda o jeito da arma atirar. Comeca pela Espirro virando automatica:
// cadencia bem maior, cada tiro mais fraco, abre mais e pula mais. Outras armas: so com o OK dele.
export const CONV_KITS = {
  shotgun_2: { auto: { mode: 'auto', rate: 0.55, dmg: 0.78, spread: 1.15, kick: 1.25, reload: 1.1 } },
  subfusil_8: { auto: { mode: 'auto', kick: 2.89 } }, // 09/11 (pedido dele): Controle vai pra 32% na barra; o alcance menor esta em CONV_RANGE
  sniper_2: { auto: { mode: 'auto', rate: 1.25, kick: 1.2, spread: 1.1 } }, // Marretao automatico (09/11, pedido dele): cadencia baixa
  fusil_7: { auto: { mode: 'auto', rate: 0.62, dmg: 0.72, spread: 1.1, kick: 1.2 } }, // Relampago automatica (02/11, pedido dele): cadencia de fuzil comum, cada tiro bem mais fraco que o semi
  subfusil_3: { convMax: { mode: 'auto', burst: 0, rate: 1.15, dmg: 0.9, kick: 1.2, spread: 1.05 } }, // Tres Tempos automatica (13/11, pedido dele): libera no ULTIMO nivel da arma; rajada vira fogo continuo, cada bala um pouco mais fraca
  fusil_12: { burst: { mode: 'burst', burst: 3, rate: 0.45, dmg: 0.6, kick: 0, spread: 0.9 } }, // Bico de Pena em rajada (03/11, pedido dele): 3 por puxada, coice ZERO, cada bala bem mais fraca
  // Dois Toques (SCAR-L) automatica: mesmo dano e cadencia da rajada, so o modo muda (pedido dele 01/11); libera no nivel do modelo
};
// 09/11 (pedido dele): na pistola o pe da mira abraca o ferrolho: o que assenta e a parte da mira em cima dele, nao as pontas que sobram dos lados
function sightUnder(id, cx, half, fb) { const a = parts[id].geo.attributes.position; let m = Infinity; for (let i = 0; i < a.count; i++) if (Math.abs(a.getX(i) - cx) < half) m = Math.min(m, a.getY(i)); return Number.isFinite(m) ? m : fb; }
export const convOptions = (body) => Object.keys(CONV_KITS[body] || {});
// akimbo: pistola toda; nas compridas so um modelo (pedido dele 01/11)
const AKIMBO_BODIES = { smg: ['subfusil_5', 'subfusil_16' /* Mac 10 (13/11, pedido dele) */], shotgun: ['shotgun_2'], sniper: ['sniper_5'] /* Sentenca (13/11, pedido dele) */ };
export const SPIN_LOAD = ['sniper_5']; // recarga = giro de 360 da arma (13/11)
export function handleFits(body, cat, id) { if (GADGETS[id]) return GADGETS[id].body === body; return id !== 'akimbo' || cat === 'pistol' || !!AKIMBO_BODIES[cat]?.includes(body); }
const NO_SCOPE = ['pistol_15']; // 13/11: Pederneira (pederneira de 1826): o cao atravessava toda mira; so a alca de ferro
export function scopeFits(body, cat, id) {
  if (!id) return cat !== 'sniper';
  if (NO_SCOPE.includes(body)) return IRONS[id] !== undefined || id === 'iron_own';
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
  if (cat === 'melee') return { body: DEFAULT_MELEE, camo: null };
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
  // 08/11 (desempenho): dois pacotes eram baixados e decodificados DUAS vezes (minigun + armas; bazuca + armas). Mesmo
  // endereco = mesma promessa; quem le so clona a geometria, entao compartilhar e seguro
  const rawLoad = loader.loadAsync.bind(loader), memo = new Map(); loader.loadAsync = (u, onP) => { if (!memo.has(u)) memo.set(u, rawLoad(u, onP)); return memo.get(u); };
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
      if (pal) for (const [name, p] of Object.entries(parts)) if (/scope/.test(name)) {
        p.lens = stripLens(p.geo, pal); levelScope(p); stripMount(p);
      }
    }).then(() => cutForeMounts()).then(() => loadWW2(loader)).then(() => loadRevolver(loader)).then(() => loadPack2(loader)).then(() => buildDrumMag()).then(() => buildExtMags()).then(() => loadComic(loader, import.meta.env.BASE_URL + 'models/src/comic/attach.glb')).then(() => swapSniperScopes()).then(() => loadLasersExtra(loader)).catch(e => console.warn('low_poly_guns.glb nao carregou', e)),
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
  ]).then(() => loadCmags(loader).catch(e => console.warn('pentes por modelo', e))).finally(() => { allLoaded = true; memo.clear(); if (!/arma-editor/.test(location.pathname)) for (const k in TT_SCN) delete TT_SCN[k]; }); // 08/11: todos os pacotes chegaram; os arquivos originais saem da memoria (as pecas ja viraram geometria propria; o editor de armas precisa deles) (arma provisoria pode ser trocada)
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
  { node: 'STG 44_28', id: 'fusil_9', cat: 'rifle', k: 1, grip: 0.66, mid: 0.44, fore: 0.29 },
  { node: 'M1911_13', mag: 'M1911 Maganize_17', fit: 'grip', id: 'pistol_7', cat: 'pistol', k: 1, grip: 0.81 },
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
const UV_CACHE = new WeakMap();
function paletteUV(pal, rgb) {
  let m = UV_CACHE.get(pal); if (!m) UV_CACHE.set(pal, m = new Map());
  const key = rgb.join(','); if (m.has(key)) return m.get(key).slice();
  const r = paletteUVRaw(pal, rgb); m.set(key, r); return r.slice();
}
function paletteUVRaw(pal, rgb) {
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
  { node: 'M249', id: 'lmg_1', cat: 'lmg', ref: 'rifle', alongZ: true, real: true, irons: false, k: 1.05, grip: 0.62, mid: 0.5, fore: 0.3, mag: 'M249_Magazine', well: 0.47, skip: ['M249_Top'], scopeCut: [0.2, 0.66], scopeCut2: [0, 0.22] } /* 04/11: o tubo inclinado (resto da alca) tambem sai */, // sem a alca/tampa e a massa da frente (tapavam as nossas miras, 04/11) // tampa do cofre aberta: tapava a mira
  { node: 'M60', id: 'lmg_2', cat: 'lmg', ref: 'rifle', alongZ: true, real: true, irons: false, k: 1.05, grip: 0.6, mid: 0.5, fore: 0.3, mag: 'M60_Magazine', well: 0.5, skip: ['M60_Top'], scopeCut: [0.36, 0.57], scopeCut2: [0, 0.22] } /* 04/11: ate 0,66 levava o fim do corpo (coronha ficava solta) */,
  { node: 'Deagle', id: 'pistol_3', cat: 'pistol', alongZ: true, real: true, k: 1, grip: 0.78, mid: 0.55, fore: 0.35, noCharger: true },
];
// 06/11 (pedido dele): as armas do pacote antigo (low_poly_guns.glb) trocam de MODELO pelas do "Low-Poly Weapon Asset Pack"
// (mais redondas). Stats, nomes e ids ficam iguais; so o desenho muda. magKeep = o pente fica onde o arquivo poe (ja encaixado
// no corpo) e vira o pente original. Sem par no pacote: subfusil_7..10 e shotgun_2 continuam com o modelo antigo (ele decide).
const SWAP = [
  { node: 'M1911', id: 'pistol_1', cat: 'pistol', mag: 'Pistol_Magazine' },
  { node: 'Glock17', id: 'pistol_2', cat: 'pistol', mag: 'Pistol_Magazine_2' },
  { node: 'Usp45_Silenced', id: 'pistol_4', cat: 'pistol', mag: 'Pistol_Magazine_4', cutAny: [0, 0.62] }, // silenciador colado sai (o nosso e acessorio)
  { node: 'Revolver', id: 'pistol_5', cat: 'pistol', noCharger: true },
  { node: 'LugerP08', id: 'pistol_6', cat: 'pistol', mag: 'LugerP08_Magazine' },
  { node: 'Mp5K', id: 'subfusil_1', cat: 'smg', mag: 'Mp5K_Magazine' , grip: 0.72},
  { node: 'Sten', id: 'subfusil_2', cat: 'smg', mag: 'StenMagazine', grip: 0.6 } /* Sten nao tem punho de pistola: mao no gatilho */,
  { node: 'Kriss_Vector', id: 'subfusil_3', cat: 'smg', mag: 'Kriss_Vector_Magazine' , grip: 0.49},
  { node: 'PPHS', id: 'subfusil_4', cat: 'smg', mag: 'PPHS_Magazine' , grip: 0.66},
  { node: 'Uzi', id: 'subfusil_5', cat: 'smg', mag: 'Uzi_Magazine' , grip: 0.62},
  { node: 'P90', id: 'subfusil_6', cat: 'smg', mag: 'P90_Magazine' , grip: 0.4},
  { node: 'M16A4', id: 'fusil_1', cat: 'rifle', mag: 'M16A4_Magazine' , grip: 0.7},
  { node: 'Famas', id: 'fusil_2', cat: 'rifle', mag: 'Famas_Magazine' , grip: 0.5}, // mira em cima da alca de transporte (como a de verdade)
  { node: 'ScarH', id: 'fusil_3', cat: 'rifle', mag: 'ScarH_Magazine' , grip: 0.68},
  { node: 'AK47', id: 'fusil_4', cat: 'rifle', mag: 'AK47_Magazine_Out' , grip: 0.68},
  { node: 'G36', id: 'fusil_5', cat: 'rifle', mag: 'G36_Magazine' , grip: 0.63},
  { node: 'FN2000', id: 'fusil_6', cat: 'rifle', mag: 'FN2000_Magazine' , grip: 0.47},
  { node: 'XM8', id: 'fusil_7', cat: 'rifle', mag: 'XM8_Magazine' , grip: 0.68},
  { node: 'Spas_12', id: 'shotgun_2', cat: 'shotgun', noCharger: true , grip: 0.72}, // Espirro (06/11: o Bacamarte volta pro modelo antigo)
  { node: 'L115_Awp', id: 'sniper_0', cat: 'sniper', mag: 'L115_Awp_Magazine', scopeCut: [0.3, 0.85] , grip: 0.74}, // luneta do arquivo sai (entram as nossas)
  { node: 'VSS_Sniper', id: 'sniper_1', cat: 'sniper', mag: 'VSS_Sniper_Magazine', scopeCut: [0.42, 0.7] , grip: 0.62},
].map(w => ({ alongZ: true, k: 1, magKeep: true, real: true, ...(w.cat === 'pistol' ? { grip: 0.78, mid: 0.55, fore: 0.35 } : { mid: 0.5 }), ...w })); // grip = punho de pistola em fracao a partir da boca, medido da arma de verdade (06/11); guarda-mao achado no desenho
// M107 (04/11, pedido dele; "Low Poly M107" de LowPolyCount, CC-BY 4.0 -> creditos): virou o modelo do Marretao.
// Vem sem luneta (as nossas entram), freio de boca proprio, pente separado (vira o pente original sniper_charger_2)
const M107 = [{ node: 'Root', id: 'sniper_2', cat: 'sniper', alongZ: true, k: 1.06, grip: 0.77, mid: 0.6, fore: 0.4, mag: 'Cube.001', well: 0.655 }];
// Acessorios do "Low Poly Attachments-Pistol" (04/11, pedido dele; CastleBravo, CC-BY 4.0 -> creditos): os dois
// silenciadores, o laser e a lanterna (as miras do pacote NAO entram). Deitados no Z, centrados, frente no -z (flip
// = o arquivo vem com a frente no +z). Textura de paleta: claro = destaque, o resto escuro
const ATT = {};
// bocas de emissao do modelo do Blender (tools/blender/lasers.py), ja no espaco da malha centrada: o feixe nasce nelas (14/11, pedido dele)
const ATT_EMIT = {}, EMIT_SRC = { laserY: [[-0.011, 0.065, 0.002], [0.011, 0.065, 0.002]] }; // Blender (x, y = frente, z = cima): lentes lado a lado, na boca do cano
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
// lasers do Blender (13/11, pedido dele): roxo Prisma e amarelo Duplo (tools/blender/lasers.py). A cor de cada peca vira a
// paleta da arma pela luminancia (clara / escura / preta), igual as pecas do pacote de acessorios
function loadLasersExtra(loader) {
  const pal = paletteReader(gunTex), uvOf = (L) => pal ? paletteUV(pal, L > 120 ? [178, 128, 84] : L > 45 ? [52, 50, 47] : [30, 30, 30]) : [0.5, 0.5];
  return Promise.all([['laserP', 'laser_prisma'], ['laserY', 'laser_duplo']].map(([k, f]) => loader.loadAsync(import.meta.env.BASE_URL + `models/src/${f}.glb`).then(g => {
    g.scene.updateMatrixWorld(true); const list = [];
    g.scene.traverse(o => { if (!o.isMesh) return; let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed();
      const c = o.material?.color || new THREE.Color(0.3, 0.3, 0.3), L = (0.3 * c.r + 0.59 * c.g + 0.11 * c.b) * 255 * 1.6, uv = uvOf(L), n = ge.attributes.position.count, a = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; }
      for (const key of Object.keys(ge.attributes)) if (key !== 'position' && key !== 'normal') ge.deleteAttribute(key);
      ge.setAttribute('uv', new THREE.BufferAttribute(a, 2)); list.push(ge); });
    if (!list.length) return; const geo = mergeGeometries(list); geo.computeBoundingBox(); const ce = geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-ce.x, -ce.y, -ce.z); geo.computeVertexNormals(); geo.computeBoundingBox(); ATT[k] = geo;
    if (EMIT_SRC[k]) ATT_EMIT[k] = EMIT_SRC[k].map(([x, y, z]) => new THREE.Vector3(x - ce.x, z - ce.y, -y - ce.z)); // glTF: (x, z, -y) do Blender
  }).catch(e => console.warn('laser extra', f, e))));
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
const SCOPE_ZOOM = { fusil_scope_4: 1.4, fusil_scope_5: 1.4, fusil_scope_2: 1.4, subfusil_scope_7: 3, subfusil_scope_10: 3.9, subfusil_scope_5: 1.4 }; // 04/11: Holografica Longa, Poste, Rampa e Combate
const SCOPE_NAMED = ['pistol_scope_5','subfusil_scope_2','subfusil_scope_6','subfusil_scope_9','subfusil_scope_1','subfusil_scope_5','subfusil_scope_7','subfusil_scope_8','subfusil_scope_10','fusil_scope_1','fusil_scope_7','fusil_scope_2','fusil_scope_4','fusil_scope_5'];
for (const id of SCOPE_NAMED) SNIPER_SCOPE_NAME[id] = 'scn_' + id;
export const IRONS = {
  iron_own: { adsTime: 0.9 },                     // so pistola (04/11, pedido dele): sem peca nenhuma, mira pela alca e massa do proprio modelo
};
const IRON_OWN = 'iron_own';
export const DEFAULT_IRON = 'iron_own'; // 05/11 (pedido dele): Mira de Trilho e Mira de Trilho com Aro sairam do jogo
export const ironOptions = (cat) => (cat === 'sniper' || cat === 'melee' ? [] : Object.keys(IRONS)); // alca propria: pistola, fuzil, submetralhadora e escopeta (04/11)
// alca do proprio modelo (04/11): a linha de mira passa na ponta da massa (o ponto mais alto da frente do corpo, perto do
// eixo); o ADS poe esse ponto no centro da tela, entao a massa fica rente ao crosshair
function ownIronPoint(body, cx) {
  const pr = profile(body), b = parts[body].box, N = pr.hi.length; let y = -Infinity, k = 0;
  for (let i = 0; i < Math.ceil(N * 0.8); i++) if (pr.hi[i] > y) { y = pr.hi[i]; k = i; } /* ate 80%: a parte mais alta antes da coronha (alca/ferrolho) nao pode tapar a linha */
  return new THREE.Vector3(cx, y + 0.008, b.min.z + (b.max.z - b.min.z) * 0.62);
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
const MUZZLE_BAN = ['sniper_0', 'sniper_2', 'sniper_3', 'pistol_5', 'pistol_11', 'pistol_12' /* PB: silenciador de fabrica (13/11) */, 'fusil_16' /* AS Val: idem */, 'sniper_5' /* Rolling Block */, 'pistol_15' /* Simeon North: pederneira (13/11) */, 'shotgun_4' /* Fox: cano duplo (13/11) */]; // + serrada (03/11) // Luneta, Marretao, Ping Velho e Bico Longo: sem bocal (pedido dele 01/11)
export const muzzleFits = (body) => !!body && !body.startsWith('melee') && !!parts[body] && !MUZZLE_BAN.includes(body);
export const muzzleOptions = (body) => (muzzleFits(body) ? Object.keys(MUZZLES) : []);
// ponta do cano no modelo: centro e raio dos vertices da frente (z minimo = boca)
const tips = {};
const TOON_BELL = false; // boca de corneta: desligada a pedido dele (06/11)
export const DEFAULT_PAINT = '#ece9e1'; // pintura padrao (07/11, pedido dele): branco
export const DEFAULT_ACCENT = '#8f8b84'; // destaque padrao (07/11, pedido dele): CINZA em toda arma (antes vinha a madeira da textura)
const TOON_HATCH = false; // 07/11 (pedido dele): sem o listrado (hachura) nas sombras da arma
const TOON_ALL = true; // arma de desenho (06/11): testada na Sanfona, ele aprovou e pediu em TODAS
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
      const best = body === 'shotgun_2' ? groups[groups.length - 1] : groups.reduce((a, g) => (wid(g) > wid(a) ? g : a)); // o mais largo = o cano (massa de mira e haste sao finas); Sneeze (08/11): o tubo de baixo e o carregador, o cano e o de cima
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
  // bocal comico (07/11, aprovado): modelado com boca de ~0,035 de raio; escala pelo raio do cano, comprimento ate 1/3 da arma
  const CG = hasComic('m_' + id) ? comicGeo('m_' + id, uvA, paletteReader(gunTex) ? paletteUV(paletteReader(gunTex), [178, 128, 84]) : uvB) : null;
  if (CG) { const g = CG.clone(); g.rotateX(Math.PI / 2); g.computeBoundingBox(); const L0 = g.boundingBox.max.y - g.boundingBox.min.y; const sc = Math.min(r / 0.035, len * 0.34 / L0); g.scale(sc, sc, sc); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); return g; }
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
  // tambores redondos (09/11, foto dele): Sanfona e Dois Toques, dois tamanhos
  cdrum_subfusil_13_1: { body: 'subfusil_13', rounds: 50, name: 'drumM', reload: 1.3, adsTime: 1.1, move: 0.97, kick: 0.96 }, cdrum_subfusil_13_2: { body: 'subfusil_13', rounds: 71, name: 'drumL', reload: 1.55, adsTime: 1.18, move: 0.93, kick: 0.92 },
  // Matraquinha (Tec-9, 13/11 pedido dele): tambor de 40 (Blender, comic_mags.py), tem akimbo
  cdrum_pistol_14_1: { body: 'pistol_14', rounds: 40, name: 'drumMag', reload: 1.45, adsTime: 1.12, move: 0.96, kick: 0.94 },
  cdrum_subfusil_8_1: { body: 'subfusil_8', rounds: 50, name: 'drumM', reload: 1.3, adsTime: 1.1, move: 0.97, kick: 0.96 }, cdrum_subfusil_8_2: { body: 'subfusil_8', rounds: 71, name: 'drumL', reload: 1.55, adsTime: 1.18, move: 0.93, kick: 0.92 },
  // pentes estendidos da Cuspideira (04/11, pedido dele): o pente de fabrica esticado pra baixo (mesma boca e largura:
  // encaixa no mesmo poco, sem malha cruzando). magK = multiplica o pente; ext = quanto estica a altura
  subfusil_ext_1: { body: 'subfusil_5', of: 'subfusil_charguer_5', ext: 1.45, magK: 1.4, reload: 1.12, adsTime: 1.05, move: 0.98, kick: 1 },
  subfusil_ext_2: { body: 'subfusil_5', of: 'subfusil_charguer_5', ext: 1.95, magK: 1.8, reload: 1.25, adsTime: 1.1, move: 0.96, kick: 0.97 },
  // caixa refrigerada da Metralhadora (05/11, pedido dele): mesmas balas, mas leva bem mais tiro ate esquentar. heatK = calor por tiro
  lmg_ext_1: { body: 'lmg_1', of: 'lmg_charger_1', ext: 1.22, magK: 1.8 /* 13/11 (pedido dele): 180 balas (era 100) */, heatK: 0.6, reload: 1.15, adsTime: 1.06, move: 0.97, kick: 1 },
  lmg_ext_2: { body: 'lmg_2', of: 'lmg_charger_2', ext: 1.22, magK: 1.3, heatK: 0.6, reload: 1.15, adsTime: 1.06, move: 0.97, kick: 1 },
};
// troca de modelo das lunetas (04/11, pedido dele): a Militar ganha o desenho da Termica e a Termica o da Militar.
// Troca so a peca (geometria, caixa, lente): id, nome, jeito de mirar, desafio e variantes continuam os mesmos
function swapSniperScopes() {
  const a = parts.sniper_scope_1, b = parts.sniper_scope_2;
  if (a && b) { parts.sniper_scope_1 = b; parts.sniper_scope_2 = a; }
  remodelSights();
}
// 07/11 (pedido dele): toda mira refeita por codigo (src/sights.js), depois de todos os pacotes (a Termica vem de outro arquivo)
function remodelSights() {
  const pal = paletteReader(gunTex), uv = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5];
  const uvL = pal ? paletteUV(pal, [178, 128, 84]) : uv;
  for (const name of Object.keys(SIGHT_KIND)) { const kind = SIGHT_KIND[name];
    const p = parts[name]; if (!p || p.remodeled) continue;
    p.geo.computeBoundingBox(); const box = p.geo.boundingBox; if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.z)) continue;
    p.len0 ??= box.max.z - box.min.z; // 07/11: comprimento ORIGINAL decide luneta x mira de perto (a comica e mais curta: luneta caia pra 1x)
    const S2 = sightGeoFor(name, kind, box, uv, uvL); p.geo = S2.geo; p.box = S2.geo.boundingBox.clone(); p.lens = S2.lens; p.ring = null; p.remodeled = true; p.comic = !!S2.comic;
  }
  for (const k of Object.keys(tubes)) delete tubes[k];
  // empunhaduras comicas (07/11, aprovadas): no lugar da peca, topo no topo dela, centro x/z iguais
  for (const h of ['subfusil_handle_2', 'subfusil_handle_3', 'subfusil_handle_6', 'fusil_handle_2']) {
    const p = parts[h]; if (!p || p.comic || !hasComic(h)) continue;
    const g = comicGeo(h, uv, uvL), b = p.box, gb = g.boundingBox;
    g.translate((b.min.x + b.max.x) / 2 - (gb.min.x + gb.max.x) / 2, b.max.y - gb.max.y, (b.min.z + b.max.z) / 2 - (gb.min.z + gb.max.z) / 2); g.computeBoundingBox();
    parts[h] = { ...p, geo: g, box: g.boundingBox.clone(), comic: true };
  }
  // snipers (09/11, pedido dele): empunhaduras e bipes do Blender, sem peca de fabrica por baixo
  for (const h of CATEGORY.sniper.handles) { if (parts[h] || !hasComic(h)) continue; const g = comicGeo(h, uv, uvL); g.computeBoundingBox(); parts[h] = { ...parts.subfusil_handle_2, geo: g, box: g.boundingBox.clone(), comic: true }; }
}
// estica o pente de fabrica pra baixo a partir da boca (topo fica no lugar); uma cinta na base marca o tamanho novo
function buildExtMags() {
  const pal = paletteReader(gunTex), uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5];
  for (const [id, D] of Object.entries(DRUM_MAGS)) {
    if (!D.ext || !parts[D.of]) continue;
    const src = parts[D.of];
    // 07/11 (pedido dele): sem o pente esticado a mao; o visual e o pente de FABRICA, so os atributos mudam (DRUM_MAGS)
    parts[id] = { geo: src.geo.clone(), box: src.box.clone(), ww2: src.ww2, extMag: true, tt: src.tt }; continue;
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
  parts.pistol_drum = { geo: nat.geo.clone(), box: nat.box.clone(), ww2: true, drumMag: true, tt: nat.tt }; return; // 07/11 (pedido dele): tambor feito a mao saiu; visual de fabrica, so os atributos de 40 balas
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
function loadPack2(loader) { return loadWSkins(loader).then(() => loadPackFile(loader, 'rifle_pack.glb', PACK2)).then(() => loadPackFile(loader, 'aa12.glb', AA12)).then(() => loadPackFile(loader, 'lowpoly_guns_package.glb', PACK3)).then(() => loadPackFile(loader, 'sawed_off.glb', SAWED)).then(() => loadPackFile(loader, 'low-poly_weapon_asset_pack.glb', [...WPACK, ...SWAP])).then(() => loadPackFile(loader, 'm107.glb', M107)).then(() => loadTT(loader)).then(() => loadAttach(loader)).then(() => loadRpg(loader)).then(() => buildGadgetParts()); }
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
      list.push(piece(new THREE.CylinderGeometry(0.014 * L, 0.014 * L, 0.25 * L, 12), uvDark, 0, -0.024 * L, -0.06 * L, Math.PI / 2)); // 09/11 (print dele): 1/3 menor
      list.push(piece(new THREE.CylinderGeometry(0.02 * L, 0.02 * L, 0.085 * L, 12), uvLight, 0, -0.024 * L, -0.03 * L, Math.PI / 2));
      list.push(piece(new THREE.BoxGeometry(0.02 * L, 0.018 * L, 0.18 * L), uvDark, 0, -0.005 * L, -0.045 * L));
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
const REFLEN = {}, IRON_LOG = {}; let PACKDIR;
function loadPackFile(loader, file, LIST) {
  return loader.loadAsync(import.meta.env.BASE_URL + 'models/src/' + file).then(g => {
    g.scene.updateMatrixWorld(true);
    const pal = paletteReader(gunTex);
    // metal principal na zona VERDE (como o revolver): a Pintura pinta ele e a camo cobre (camoGreen); claro = destaque
    const uvMetal = pal ? paletteUV(pal, [90, 170, 60]) : [0.5, 0.5], uvLight = pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5], uvDark = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5];
    const lum = (c) => c ? 0.3 * c.r + 0.59 * c.g + 0.11 * c.b : 0;
    // escala REAL do pacote (06/11, pedido dele "padronizadas"): dentro da categoria o tamanho segue a arma de verdade
    // (MP5K curta, P90 compacta); a MEDIA da categoria fica igual a dos corpos antigos
    const RAW = {}, rawAvg = {};
    for (const w of LIST) if (w.real) { const o = g.scene.getObjectByName(nodeName(w.node)); if (!o) continue; const sz = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); RAW[w.id] = w.alongZ ? sz.z : sz.x; (rawAvg[w.cat] ||= []).push(RAW[w.id]); }
    for (const kc of Object.keys(rawAvg)) rawAvg[kc] = rawAvg[kc].reduce((s0, x) => s0 + x, 0) / rawAvg[kc].length;
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
      let muzzleMinX = ext(b.min.x, b.min.x + len * 0.07) <= ext(b.max.x - len * 0.07, b.max.x);
      if (w.real) { if (PACKDIR === undefined) PACKDIR = muzzleMinX; else muzzleMinX = PACKDIR; } // pacote inteiro com o cano pro mesmo lado (06/11: a Kriss, com a frente grossa, saia virada)
      const rc = w.ref || w.cat; if (REFLEN[rc] === undefined) { const ls = CATEGORY[rc].bodies.filter(id => parts[id] && !parts[id].ww2).map(id => parts[id].box.max.z - parts[id].box.min.z); REFLEN[rc] = ls.reduce((s, x) => s + x, 0) / Math.max(1, ls.length); } // medida dos corpos ORIGINAIS (06/11: trocando todos, a media ficava vazia)
      const anc = w.cat === 'pistol' ? 'pistol' : 'rifle'; if (w.real && REFLEN[anc] === undefined) { const ls = CATEGORY[anc].bodies.filter(id => parts[id] && !parts[id].ww2).map(id => parts[id].box.max.z - parts[id].box.min.z); REFLEN[anc] = ls.reduce((s0, x) => s0 + x, 0) / Math.max(1, ls.length); }
      const k = w.real && RAW[w.id] && rawAvg[anc] ? REFLEN[anc] * w.k / rawAvg[anc] : REFLEN[rc] * w.k / len; // real: UM fator pras armas longas (ancorado no fuzil) e outro pras pistolas (06/11: a PPSh passava do fuzil) // real: mesmo fator pra categoria toda
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
      // mira de ferro (06/11, pedido dele: as nossas miras sentavam em cima dela): peca pequena (< 20% do comprimento) que sobe
      // acima do topo do receptor (mediana do perfil no miolo) e comeca perto dele. irons: false desliga
      const hiMid = pr0.hi.slice(12, 38).filter(Number.isFinite).sort((x, y) => x - y), railTop = hiMid[Math.floor(hiMid.length / 2)], hgt = bb0.max.y - bb0.min.y, blen0 = bb0.max.z - bb0.min.z;
      const ironRemoved = IRON_LOG[w.id] = [];
      const tol = (bb0.max.z - bb0.min.z) * 0.02, inZ = (bx, r) => { const [z0, z1] = [zAt0(r[0]), zAt0(r[1])].sort((x, y) => x - y); return bx.min.z >= z0 - tol && bx.max.z <= z1 + tol; };
      for (const gr of isl) {
        const cy = (gr.box.min.y + gr.box.max.y) / 2;
        if (w.real && w.irons !== false && gr.box.max.z - gr.box.min.z < blen0 * 0.2 && gr.box.max.y > railTop + hgt * 0.02 && gr.box.min.y > railTop - hgt * 0.22) { gr.tris.forEach(t => out.add(t)); ironRemoved.push(+(((gr.box.min.z + gr.box.max.z) / 2 - bb0.min.z) / blen0).toFixed(2)); }
        else if (w.magCut && inZ(gr.box, w.magCut) && cy < yAt(w.magCut[0] - 0.03, false)) { gr.tris.forEach(t => out.add(t)); magT.push(...gr.tris); }
        else if (w.cutAny && inZ(gr.box, w.cutAny)) gr.tris.forEach(t => out.add(t)); // peca inteira no trecho, em qualquer altura (silenciador colado)
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
      else if (w.real) { // punho de pistola achado no desenho (06/11): a parte que mais desce (o pente ja saiu do corpo), longe das pontas
        let sb = -1, yb = Infinity; for (let s0 = Math.floor(pr.lo.length * 0.25); s0 < Math.floor(pr.lo.length * 0.92); s0++) if (pr.lo[s0] < yb) { yb = pr.lo[s0]; sb = s0; }
        let a0 = sb, a1 = sb; const tolY = (bb.max.y - bb.min.y) * 0.12; while (a0 > 0 && pr.lo[a0 - 1] < yb + tolY) a0--; while (a1 < pr.lo.length - 1 && pr.lo[a1 + 1] < yb + tolY) a1++;
        const gz = pr.z0 + ((a0 + a1) / 2 + 0.5) * pr.dz; body.grip = { zc: gz, z0: pr.z0 + a0 * pr.dz, z1: pr.z0 + (a1 + 1) * pr.dz, lo: yb };
      }
      if (w.mid) body.mid = zAt(w.mid);
      if (w.fore) body.fore = zAt(w.fore);
      if (!magGeo && w.mag) { // pente que vem solto no arquivo
        const mo = g.scene.getObjectByName(nodeName(w.mag)), ml = [];
        mo?.traverse(o => { if (o.isMesh) { let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed(); for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k); ml.push(ge); } });
        if (ml.length) {
          magGeo = mergeGeometries(ml); if (w.zUp) magGeo.rotateX(Math.PI / 2); if (w.alongZ) magGeo.rotateY(Math.PI / 2); magGeo.applyMatrix4(m); if (w.tilt) magGeo.rotateX(w.tilt); magGeo.computeBoundingBox();
          const mb = magGeo.boundingBox, mc = mb.getCenter(new THREE.Vector3()), wz = zAt(w.well ?? 0.5), bh = bb.max.y - bb.min.y;
          if (!w.magKeep) magGeo.translate((w.zUp ? 0 : (bb.min.x + bb.max.x) / 2) - mc.x, pr.lo[sliceOf(pr, wz)] + bh * 0.06 - mb.max.y, wz - mc.z);
          magGeo.computeVertexNormals();
        }
      }
      if (magGeo) { setUV(magGeo, uvDark); magGeo.computeBoundingBox(); parts[w.id.replace(/_(\d+)$/, '_charger_$1')] = { geo: magGeo, box: magGeo.boundingBox.clone(), ww2: true }; }
      if (w.real && !w.fore && w.cat !== 'pistol') { // guarda-mao (06/11): onde a mao da frente e a empunhadura vao. Trecho entre a boca (+8%) e o que vier
        // primeiro de pente/punho (-5%); fica a parte mais baixa (o guarda-mao, nao o cano fino), a uns 60% do caminho ate o pente
        const mbx = magGeo ? magGeo.boundingBox : null, back = Math.min(mbx ? mbx.min.z : Infinity, body.grip ? body.grip.z0 : Infinity, bb.min.z + blen * 0.6) - blen * 0.05, front = bb.min.z + blen * 0.08;
        const s0 = sliceOf(pr, front), s1 = Math.max(s0, sliceOf(pr, back)); let best = Infinity; for (let q = s0; q <= s1; q++) best = Math.min(best, pr.lo[q]);
        const ideal = front + (back - front) * 0.6, tolY = (bb.max.y - bb.min.y) * 0.08; let pick = s1, pd = Infinity;
        for (let q = s0; q <= s1; q++) { if (pr.lo[q] > best + tolY) continue; const zc = pr.z0 + (q + 0.5) * pr.dz; if (Math.abs(zc - ideal) < pd) { pd = Math.abs(zc - ideal); pick = q; } }
        body.fore = pr.z0 + (pick + 0.5) * pr.dz;
      }
    }
  }).catch(e => console.warn(file + ' nao carregou', e));
}

// ---------- armas do TastyTony (06/11, pedido dele; CC-BY 4.0, credito em TT_GUNS[].credit) ----------
// Pecas prontas do tools/blender/tt_prep.py: glb em METROS (cano no -Z, cima +Y), uma peca por ilha p<n>_<zona>
// (paint = metal: pintura e camo | accent = madeira: destaque | dark = so destaque escuro | del = some | mag = pente)
// e vazios m_* (encaixes padrao). src/tt_guns.json manda: zones {p3:'accent'}, marks {grip:[x,y,z] metros}, adj (ajuste
// por encaixe: scope/handle/muzzle/laser/charger = {x,y,z (metros), s}), k (escala). O editor (tools/arma-editor.html)
// grava esse json e chama ttApply ao vivo.
const TT_M = { pistol: 0.25, rifle: 0.95 }; // tamanho real medio que vira o tamanho medio dos corpos originais
const TT_SCN = {};
export const TT_LIST = TT_GUNS;
function refLen(anc) {
  if (REFLEN[anc] === undefined) { const ls = CATEGORY[anc].bodies.filter(id => parts[id] && !parts[id].ww2).map(id => parts[id].box.max.z - parts[id].box.min.z); REFLEN[anc] = ls.length ? ls.reduce((s0, x) => s0 + x, 0) / ls.length : (anc === 'pistol' ? 0.9 : 2.6); }
  return REFLEN[anc];
}
export function ttUnit(id, k = 1) { const anc = id.startsWith('pistol') ? 'pistol' : 'rifle'; return refLen(anc) / TT_M[anc] * k; } // metros -> unidade do jogo
function ttForget(id, cid) { // tudo que foi medido no corpo/pente velho sai do cache
  for (const C of [profiles, grips, tips]) delete C[id];
  for (const C of [mouths, tilts]) delete C[cid];
  for (const k of Object.keys(magCompat)) if (k.startsWith(id + '|')) delete magCompat[k];
  for (const k of Object.keys(tops)) if (k.startsWith(id + '|')) delete tops[k];
}
// area vista DE LADO (07/11): a area total contava peca escondida por dentro (Garoa: o metal 'ganhava' da madeira)
function geoArea(ge) { const p = ge.attributes.position, ix = ge.index, n = ix ? ix.count : p.count, at = (i) => (ix ? ix.getX(i) : i), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(); let s0 = 0; for (let i = 0; i < n; i += 3) { a.fromBufferAttribute(p, at(i)); b.fromBufferAttribute(p, at(i + 1)).sub(a); c.fromBufferAttribute(p, at(i + 2)).sub(a); s0 += Math.abs(b.cross(c).x) / 2; } return s0; }
function geoBox(list) { const b = new THREE.Box3(); for (const g of list) { g.computeBoundingBox(); b.union(g.boundingBox); } return b; }
export function ttSwap(geos) { let pa = 0, ac = 0; for (const ge of geos) { const z = ge.userData.zn; if (z === 'paint') pa += geoArea(ge); else if (z === 'accent') ac += geoArea(ge); } return ac > pa; }
export function ttApply(cfg) {
  const scn = TT_SCN[cfg.id]; if (!scn) return false;
  const pal = paletteReader(gunTex), uv = { paint: pal ? paletteUV(pal, [90, 170, 60]) : [0.5, 0.5], accent: pal ? paletteUV(pal, [178, 128, 84]) : [0.5, 0.5], dark: pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5] };
  const u = ttUnit(cfg.id, cfg.k || 1), body = [], mag = [], iron = [], fixed = [], marks = {}; // fixed (09/11): peca que fica sempre na arma, fora do perfil (pente em cima marcado como ferro pelo tt_prep)
  scn.traverse(o => {
    if (o.isMesh) {
      const m = o.name.match(/^p(\d+)_([a-z]+)/); if (!m) return;
      // del automatico do tt_prep = mira de ferro: vira 'iron' (aparece so sem mira acoplada, 07/11 pedido dele); 'del' marcado no editor some de vez
      const zn = cfg.zones?.['p' + m[1]] || (m[2] === 'del' ? 'iron' : m[2] === 'cut' ? 'del' : m[2]); // cut = luneta de fabrica: some sempre
      if (zn === 'del') return;
      let ge = o.geometry.clone().applyMatrix4(o.matrixWorld); if (ge.index) ge = ge.toNonIndexed();
      for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k);
      ge.scale(u, u * (cfg.sy || 1), u); ge.userData.zn = zn === 'mag' ? 'dark' : zn === 'iron' || zn === 'fixed' ? 'paint' : zn;
      (zn === 'mag' ? mag : zn === 'iron' ? iron : zn === 'fixed' ? fixed : body).push(ge);
    } else if (/^m_/.test(o.name)) marks[o.name.slice(2)] = o.getWorldPosition(new THREE.Vector3()).multiplyScalar(u).multiply(new THREE.Vector3(1, cfg.sy || 1, 1));
  });
  for (const [k, v] of Object.entries(cfg.marks || {})) marks[k] = new THREE.Vector3(...v).multiplyScalar(u).multiply(new THREE.Vector3(1, cfg.sy || 1, 1)); // marcado no editor
  // regra dele (07/11, pra tudo): camuflagem na area MAIOR, destaque na MENOR. Se o destaque cobre mais que a pintura, as duas trocam
  // 07/11 (pedido dele): TODA arma tem area de destaque e de camuflagem. Modelo todo de metal (MP5, Thompson, Deagle...) pintava
  // inteiro: se o destaque cobre menos de 8%, o PUNHO (perto da marca da empunhadura, abaixo do meio) e a CORONHA (atras do punho) viram destaque
  { let pa = 0, ac = 0; for (const ge of body) { const a = geoArea(ge); if (ge.userData.zn === 'paint') pa += a; else if (ge.userData.zn === 'accent') ac += a; }
    if (marks.grip && ac < (pa + ac) * 0.08) {
      const bx = geoBox(body), bl = bx.max.z - bx.min.z, midY = (bx.min.y + bx.max.y) / 2, gz = marks.grip.z, pistol = cfg.id.startsWith('pistol');
      for (const ge of body) { if (ge.userData.zn !== 'paint') continue; ge.computeBoundingBox(); const c = ge.boundingBox.getCenter(new THREE.Vector3());
        if ((Math.abs(c.z - gz) < bl * (pistol ? 0.18 : 0.07) && c.y < midY) || (!pistol && c.z > gz + bl * 0.12)) ge.userData.zn = 'accent'; }
    } }
  // tipCut (13/11, pedido dele: Lupa): freio de boca do modelo sai quando um bocal nosso entra. Triangulos ate tipCut metros da
  // boca viram a peca 'tip' (so aparece sem bocal); o cano comprido que passa por dentro continua (o bocal encosta nele)
  const tip = [];
  if (cfg.tipCut) {
    const z0 = geoBox(body).min.z + cfg.tipCut * u;
    for (let gi = body.length - 1; gi >= 0; gi--) {
      const ge = body[gi], q = ge.attributes.position, nq = ge.attributes.normal, keep = [], cut = [];
      for (let i = 0; i < q.count; i += 3) (q.getZ(i) < z0 && q.getZ(i + 1) < z0 && q.getZ(i + 2) < z0 ? cut : keep).push(i);
      if (!cut.length) continue;
      const mk = (list) => { const g2 = new THREE.BufferGeometry(), P3 = [], N3 = []; for (const i of list) for (let k = 0; k < 3; k++) { P3.push(q.getX(i + k), q.getY(i + k), q.getZ(i + k)); N3.push(nq.getX(i + k), nq.getY(i + k), nq.getZ(i + k)); } g2.setAttribute('position', new THREE.Float32BufferAttribute(P3, 3)); g2.setAttribute('normal', new THREE.Float32BufferAttribute(N3, 3)); g2.userData.zn = ge.userData.zn; return g2; };
      tip.push(mk(cut)); if (keep.length) body[gi] = mk(keep); else body.splice(gi, 1);
    }
  }
  const swapZ = ttSwap(body);
  for (const ge of [...body, ...mag, ...iron, ...fixed, ...tip]) { let z = ge.userData.zn; if (swapZ && (z === 'paint' || z === 'accent')) z = z === 'paint' ? 'accent' : 'paint'; setUV(ge, uv[z] || uv.paint); }
  if (!body.length) return false;
  const id = cfg.id, cid = id.replace(/_(\d+)$/, '_charger_$1');
  ttForget(id, cid);
  const geo = mergeGeometries(body); geo.computeBoundingBox();
  const P = parts[id] = { magOwn: !!cfg.magOwn, noIron: !!cfg.noIron, geo, box: geo.boundingBox.clone(), ww2: true, camoGreen: true, metal: cfg.metal || '#2a2724', noCharger: !mag.length, tt: true, u, adj: cfg.adj || {} };
  if (fixed.length) P.fixedGeo = mergeGeometries(fixed);
  if (tip.length) P.tipGeo = mergeGeometries(tip);
  // 13/11 (pedido dele): magHand = a mao esquerda segura o PENTE (pente de lado da Sten/Zumbidor, MP28), nao o guarda-mao
  if (cfg.magHand && mag.length) { const mb = geoBox(mag); P.magHand = mb.getCenter(new THREE.Vector3()); P.magHand.y = mb.min.y + (mb.max.y - mb.min.y) * 0.45; }
  if (cfg.foreOnMag) P.tubeMag = true;
  if (cfg.foreOnMag && mag.length && marks.fore) marks.fore.y = geoBox(mag).min.y + 0.022; // 13/11 (Caracol): pente embaixo do cano, a empunhadura encosta no fundo dele (antes entrava no pente e piscava)
  if (cfg.cantZ != null) P.cantZ = cfg.cantZ * u; // onde a mira de 45 graus fica no comprimento da arma (metros do modelo)
  if (marks.muzzle) P.axisX = marks.muzzle.x; // eixo do cano: mira, bocal e laser centram nele
  const bb = P.box, blen = bb.max.z - bb.min.z, pr = profile(id);
  if (marks.grip) { const gz = marks.grip.z; P.grip = { zc: gz, z0: gz - blen * 0.04, z1: gz + blen * 0.04, lo: pr.lo[sliceOf(pr, gz)] }; }
  if (marks.rail0 && marks.rail1) P.mid = (marks.rail0.z + marks.rail1.z) / 2;
  if (marks.fore) { P.fore = marks.fore.z; P.foreY = marks.fore.y; }
  // mira de ferro: peca a parte (fora do perfil, entao a mira acoplada assenta no corpo). Linha de mira = topo da massa (a peca mais da frente)
  if (iron.length && !cfg.noIron) { // noIron (07/11): o desenho da arma tapa a linha de mira (alca de transporte, pente em cima): vem com mira acoplada
    for (const g of iron) g.computeBoundingBox();
    const czI = (g) => (g.boundingBox.min.z + g.boundingBox.max.z) / 2, cxI = (g) => (g.boundingBox.min.x + g.boundingBox.max.x) / 2, bl0 = geoBox(body), Lb = bl0.max.z - bl0.min.z;
    // 07/11 (Famas): orelhas e base em volta da massa/alca tambem viram ferro (sem traco preto); a peca que vale e a MAIS ALTA
    // do MEIO (a orelha de lado ficava mais alta e entortava a linha)
    const axis0 = P.axisX ?? cxI(iron[0]), mid = (list) => { const c = list.filter(g => Math.abs(cxI(g) - axis0) < Lb * 0.004); return c.length ? c : list; };
    const hiOf = (list) => list.reduce((a, g) => (g.boundingBox.max.y > a.boundingBox.max.y ? g : a));
    const fz00 = Math.min(...iron.map(czI)), front = hiOf(mid(iron.filter(g => czI(g) - fz00 < Lb * 0.05)));
    P.ironGeo = mergeGeometries(iron); P.ironGeo.computeBoundingBox();
    P.ironPt = new THREE.Vector3(P.axisX ?? cxI(front), front.boundingBox.max.y + 0.002 * u, czI(front));
    // alca de tras (07/11, pedido dele: ferro alinhado no centro da mira): a linha alca -> massa tem que ficar reta no olho.
    // Alca de entalhe = fundo do entalhe (topo da coluna do meio); de anel = centro do furo (maior vao na coluna do meio)
    // alca = a peca de ferro MAIS ALTA atras da massa (a mais de 15% do comprimento); a mais de tras as vezes era um pino da coronha
    const fz0 = czI(front);
    const back = iron.filter(g => czI(g) - fz0 > Lb * 0.15 && czI(g) - fz0 < Lb * 0.7);
    // ironRear (07/11, Winchester 1897): a de verdade so tem a bolinha na ponta; a "alca" e o sulco no topo da caixa da culatra.
    // Vira uma alca virtual: topo do corpo na coluna do meio, nessa fracao do comprimento (0 = boca)
    let rear = back.length ? hiOf(mid(back)) : front;
    if (rear === front && cfg.ironRear) {
      const zr = bl0.min.z + Lb * cfg.ironRear, fx0 = cxI(front), w0 = Math.max(0.0015 * u, Lb * 0.003); let ty = -Infinity;
      for (const g of body) { const q = g.attributes.position; for (let i = 0; i < q.count; i++) if (Math.abs(q.getZ(i) - zr) < Lb * 0.01 && Math.abs(q.getX(i) - fx0) < w0) ty = Math.max(ty, q.getY(i)); }
      if (ty > -Infinity) { const ge = new THREE.BufferGeometry(); ge.boundingBox = new THREE.Box3(new THREE.Vector3(fx0, ty - 0.004 * u, zr - 0.001 * u), new THREE.Vector3(fx0, ty, zr + 0.001 * u)); ge.setAttribute('position', new THREE.Float32BufferAttribute([fx0, ty, zr], 3)); rear = ge; }
    }
    const fz = P.ironPt.z, rz = czI(rear), blenI = Lb;
    if (rear !== front && rz - fz > blenI * 0.1) {
      const fx = cxI(front), ax = cxI(rear); // centro de lado da massa e da alca
      P.ironPt.x = fx; P.ironYaw = Math.atan2(fx - ax, rz - fz); // 07/11 (Sten): alca e massa fora de linha DE LADO: a arma gira pra elas ficarem retas
      const w = Math.max(0.0015 * u, (rear.boundingBox.max.x - rear.boundingBox.min.x) * 0.12), pa = rear.attributes.position, ys = [];
      for (let i = 0; i < pa.count; i++) if (Math.abs(pa.getX(i) - ax) < w) ys.push(pa.getY(i));
      ys.sort((a, b) => a - b);
      let ry = (ys.length ? ys[ys.length - 1] : rear.boundingBox.max.y) + 0.002 * u, gap = 0; // a linha passa 2 mm acima do meio da alca (no mesmo nivel a massa sumia atras dela)
      for (let i = Math.floor(ys.length / 3); i < ys.length - 1; i++) if (ys[i + 1] - ys[i] > gap) { gap = ys[i + 1] - ys[i]; if (gap > (rear.boundingBox.max.y - rear.boundingBox.min.y) * 0.25) ry = (ys[i] + ys[i + 1]) / 2; }
      // inclinacao da linha (sobe pra tras = m > 0). Regra dele (07/11): massa e alca SEMPRE visiveis e retas; nada do corpo
      // pode passar por cima da linha entre a massa e o olho (so a faixa do meio conta: pente de lado nao atrapalha)
      const fy = P.ironPt.y, half = Math.max(0.004 * u, (front.boundingBox.max.x - front.boundingBox.min.x) * 0.6), zEnd = rz + 0.22 / (S * 0.8); // ate o OLHO (a pose poe o olho 0,2 atras da alca; 0,8 = escala do viewmodel)
      // ironRoof (07/11, Famas): massa e alca moram DENTRO da alca de transporte; o teto passa por cima da linha, nao na frente dela
      const roofY = cfg.ironRoof ? Math.max(front.boundingBox.max.y, rear.boundingBox.max.y) + 0.003 * u : Infinity;
      let m = (ry - fy) / (rz - fz);
      for (const g of body) { const q = g.attributes.position; for (let i = 0; i < q.count; i++) { const z = q.getZ(i); if (z < fz + Lb * 0.05 || z > zEnd) continue; if (q.getY(i) > roofY) continue; const lx = fx + (ax - fx) * (z - fz) / (rz - fz); if (Math.abs(q.getX(i) - lx) > half) continue; const need = (q.getY(i) + 0.0015 * u - fy) / (z - fz); if (need > m) m = need; } }
      P.ironTilt = -Math.atan(m); // mesma convencao da luneta (frente mais alta = positivo)
      // 07/11 (bug: camera dentro da arma mirando no ferro): a mira continua pela massa da frente, mas o olho fica SEMPRE
      // atras da alca: ironDepth = distancia massa -> alca (a pose soma isso a distancia do olho)
      P.ironDepth = rz - fz;
      if (Math.abs(P.ironTilt) > 0.2) P.ironTilt = Math.sign(P.ironTilt) * 0.2; // teto: alca alta de distancia nao deita a arma
    }
  }
  if (mag.length) { const mg = mergeGeometries(mag); mg.computeBoundingBox(); parts[cid] = { geo: mg, box: mg.boundingBox.clone(), ww2: true, tt: true }; }
  else if (parts[cid]?.tt) delete parts[cid];
  return true;
}
function loadTT(loader) {
  return Promise.all(TT_GUNS.map(cfg => loader.loadAsync(import.meta.env.BASE_URL + 'models/src/tt_ready/' + cfg.id + '.glb')
    .then(g => { g.scene.updateMatrixWorld(true); TT_SCN[cfg.id] = g.scene; ttApply(cfg); })
    .catch(e => console.warn('TT: ' + cfg.id + ' nao carregou', e))));
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
const SABER_GREEN = '#46e06a', SABER_ON = 1.15; // 05/11, pedido dele: a lamina sobe mais devagar (era 0,55)
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

// 08/11 (desempenho na carga): cada chamada desenhava a textura num canvas e lia todos os pixels de novo (614 ms na carga,
// varias vezes isso no celular). A leitura fica guardada por textura; a cor achada fica guardada por (leitor, cor) no paletteUV
const PAL_CACHE = new WeakMap();
function paletteReader(tex) {
  const img = tex && tex.image;
  if (!img) return null;
  const hit = PAL_CACHE.get(img); if (hit) return hit;
  const fn = paletteReaderRaw(img); PAL_CACHE.set(img, fn); return fn;
}
function paletteReaderRaw(img) {
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
// 07/11 (pedido dele): as miras perdem a BASE (suporte/trilho de fabrica): so a mira fica, assentada direto no corpo.
// Base = o que fica abaixo da lente: pecas soltas inteiras ali embaixo e, na peca colada, os triangulos todo abaixo da linha
function stripMount(p) {
  const L = p.lens; if (!L || !(L.r > 0)) return;
  const ge = p.geo.index ? p.geo.toNonIndexed() : p.geo, pos = ge.attributes.position, nT = pos.count / 3, thr = L.c.y - L.r * 1.45, keep = [];
  for (const g of geoIslands(ge)) {
    if (g.box.max.y < thr) continue; // peca solta toda embaixo da lente: base
    for (const t of g.tris) if (Math.max(pos.getY(t * 3), pos.getY(t * 3 + 1), pos.getY(t * 3 + 2)) >= thr) keep.push(t);
  }
  if (keep.length < nT * 0.35 || keep.length === nT) return; // tirou demais (mira esquisita) ou nao tinha base
  keep.sort((a, b) => a - b);
  const out = geoTake(ge, keep); out.computeBoundingBox(); p.geo = out; p.box = out.boundingBox.clone();
}
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
export const stampOpen = (id) => STAMPS.some(s => s.id === id) && (!!progressInfo().unlockAll || shopOwned('stamp:' + id) || passHasStamp(id));
function paintMaterial(paint, accent, camo, part = false, camoGreen = false, hatch = false, pat = null, pat2 = null) {
  const m = toon(0xffffff, { map: gunTex, unique: true });
  m.userData.gunOwn = true; // so desta arma: disposeGun libera
  const st1 = 0, st2 = stampCode(pat2 || pat), hasSt = !!st2; /* 09/11 (regra dele): a estampa so existe na area da cor de destaque, no corpo e nas pecas; a da Pintura salva antes vale como a do Destaque */ // sem estampa o shader nem recebe o desenho (nao pesa no celular). Peca encaixada (09/11, pedido dele): leva a do Destaque ou, sem ela, a da Pintura
  // so a camo desta peca entra no shader (peca encaixada nunca leva camo)
  const glslCode = part ? 0 : camoById(camo).code;
  m.userData.u = {
    uPart: { value: part ? 1 : 0 },
    uPaint: { value: new THREE.Color(paint || '#ffffff') }, uPaintOn: { value: 1 }, // sem pintura escolhida: o verde de fabrica vira BRANCO (03/11, pedido dele)
    uAccent: { value: new THREE.Color(accent || '#ffffff') }, uAccentOn: { value: accent ? 1 : 0 },
    uCamo: { value: camoById(camo).code }, uTime: camoTime, uReact: { value: 0 }, uCamoGreen: { value: camoGreen ? 1 : 0 },
    ...(glslCode === 60 ? { uRovexLogo: rovexLogoU() } : {}),
    ...(glslCode === 70 ? bmUniforms(camo) : {}), // Mercado Negro: cores/desenho da variante
    ...(hasSt ? { uStampM: { value: new THREE.Matrix4().makeScale(1.8, 1.8, 1.8) } } : {}), // uStampM: da malha pro espaco unico da arma (stampSpace)
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;' + (hasSt ? ' uniform mat4 uStampM; varying vec3 vStampPos;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position * 1.8;' + (hasSt ? ' vStampPos = (uStampM * vec4(position, 1.0)).xyz;' : '')); // estampa menor (01/11): a arma mostrava so um pedaco da camo
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uPaint; uniform float uPaintOn; uniform vec3 uAccent; uniform float uAccentOn; uniform float uPart; uniform float uCamoGreen;\n' + (hasSt ? 'varying vec3 vStampPos;\n' + stampGlsl([st1, st2]) + '\n' : '') + camoGlsl(glslCode) + '\nvec3 gCamoGlow = vec3(0.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gCamoGlow;' + (glslCode === 70 ? '\n/* bloom levissimo (08/11, pedido dele): camo ANIMADA do Mercado Negro ganha halo na borda da silhueta e o brilho dela vaza um tico (sem pos-processo: nao pesa no celular) */ if (uBmP.w > 0.5 && uPart < 0.5) { float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.6); totalEmissiveRadiance += uBmC * fr * 0.32 + gCamoGlow * 0.35; }' : ''))
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
          vec3 pCol = uPaint * clamp(0.45 + lum * 0.75, 0.45, 1.0), aCol = uAccent * clamp(0.55 + lum * 0.45, 0.55, 1.0);
          ${hasSt ? `vec2 stQ = vec2(vStampPos.z, vStampPos.y + vStampPos.x * 0.35) * 5.5; /* 09/11: mesma escala e mesmo centro em todas as pecas (stampSpace) */
          ${st1 ? 'float stA = stampAt(' + st1 + ', stQ); pCol = mix(pCol, stampInk(pCol), stA);' : ''}
          ${st2 ? (st2 === st1 ? '' : 'float stB = stampAt(' + st2 + ', stQ);') + ' aCol = mix(aCol, stampInk(aCol), ' + (st2 === st1 ? 'stA' : 'stB') + ');' : ''}` : ''}
          diffuseColor.rgb = mix(tc, pCol, green * uPaintOn);
          diffuseColor.rgb = mix(diffuseColor.rgb, aCol, accent * uAccentOn);
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
    // arma de desenho (06/11, teste na Sanfona): hachura de nanquim nas sombras, presa na peca (nao escorre com a tela)
    if (hatch) sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `
        {
          float hl = dot(outgoingLight, vec3(0.299, 0.587, 0.114)) / max(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)), 0.03) * 0.5; // so a LUZ (nao a cor): peca preta nao vira listrada
          float ha = (vCamoPos.y + vCamoPos.z) * 34.0, hb = (vCamoPos.y - vCamoPos.z) * 34.0;
          float la = 1.0 - smoothstep(0.1, 0.1 + fwidth(ha) * 1.2, abs(fract(ha) - 0.5));
          float lb = 1.0 - smoothstep(0.1, 0.1 + fwidth(hb) * 1.2, abs(fract(hb) - 0.5));
          float d1 = 1.0 - smoothstep(0.32, 0.6, hl), d2 = 1.0 - smoothstep(0.16, 0.34, hl);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.08, 0.07, 0.06), max(la * d1, lb * d2) * 0.85);
        }
        #include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => 'paint' + glslCode + (hatch ? 'h' : '') + (hasSt ? 's' + st1 + '_' + st2 : '');
  m.userData.again = () => paintMaterial(paint, accent, camo, part, camoGreen, hatch, pat, pat2); // copia da pintura com matriz propria (stampSpace): divide o programa
  return m;
}

// 04/11 (pedido dele): militares e comicas novas, vendidas na Loja por Zions (RET_PAID; posse 'ret:<id>')
export const RET_PAID = ['horseshoe', 'acog', 'german', 'triangle', 'brackets', 'star', 'heart', 'smile', 'skull', 'bolt', 'diamond', 'radar', 'wings', 'ladder', 'artillery', 'spiral', 'crown', 'eye', 'clover', 'moon'];
// 05/11 (pedido dele): reticulas de luneta, a venda na Loja, na mesma quantidade das outras. A ordem e fixa: o numero do desenho no shader vem do lugar na lista
export const RET_SNIPER = ['sn_fio', 'sn_poste', 'sn_telemetro', 'sn_queda', 'sn_circulo', 'sn_halo', 'sn_tatica', 'sn_seta', 'sn_grosso', 'sn_quatro', 'sn_canto', 'sn_grade', 'sn_lua', 'sn_alvo', 'sn_flecha', 'sn_tres', 'sn_bang', 'sn_caveira', 'sn_coracao', 'sn_olho'];
export const RETICLES = ['dot', 'cross', 'circle', 'chevron', 'tee', 'duplex', 'mildot', ...RET_PAID, ...RET_SNIPER];
export const RET_ROW_SHORT = ['dot', 'cross', 'circle', 'chevron', 'tee', ...RET_PAID], RET_ROW_LONG = ['duplex', 'mildot', ...RET_SNIPER];
export const retOwned = (r) => (!RET_PAID.includes(r) && !RET_SNIPER.includes(r)) || !!progressInfo().unlockAll || shopOwned('ret:' + r);
// luneta (zoom fechado) ou mira de perto: decide a fileira que vem primeiro e a previa
const sightLen = (P) => P.len0 ?? (P.box.max.z - P.box.min.z); // comprimento da mira de fabrica (antes do remodelo comico)
export const sightIsBig = (id) => { const P = id && parts[id]; if (!P) return false; return SCOPE_ZOOM[id] ? SCOPE_ZOOM[id] >= 2 : sightLen(P) >= 0.6; };
// desenho no icone e na Loja (caixa de 24): s = traco, f = preenchido (buracos pela regra evenodd)
const DOT = 'M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0';
export const RET_PATH = {
  sn_fio: { s: 'M12 2v20M2 12h20' }, sn_poste: { s: 'M2 12h6.5M15.5 12H22', f: 'M10.8 13h2.4v9h-2.4z' }, sn_telemetro: { s: 'M12 3v18M3 12h18M15 10.5v3M18 10.5v3M10.5 15h3M10.5 18h3' }, sn_queda: { s: 'M12 3v18M3 9h18M8.5 13h7M9.5 16.5h5M10.5 20h3' },
  sn_circulo: { s: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 1v3M12 20v3M1 12h3M20 12h3', f: DOT }, sn_halo: { s: 'M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7M12 2v20M2 12h20' }, sn_tatica: { s: 'M12 2v20M2 12h20M6 10.5v3M9 10.5v3M15 10.5v3M18 10.5v3M10.5 6h3M10.5 9h3M10.5 15h3M10.5 18h3' }, sn_seta: { s: 'M7 15l5-5 5 5M12 15v7M2 12h5M17 12h5' },
  sn_grosso: { s: 'M12 8v8M8 12h8', f: 'M10.8 1h2.4v7h-2.4zM10.8 16h2.4v7h-2.4zM1 10.8h7v2.4H1zM16 10.8h7v2.4h-7z' }, sn_quatro: { f: DOT + 'M10.5 5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M10.5 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M3.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M17.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0' }, sn_canto: { s: 'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5', f: DOT }, sn_grade: { s: 'M4 8h16M4 12h16M4 16h16M8 4v16M12 4v16M16 4v16' },
  sn_lua: { s: 'M12 1v22M1 12h22', f: 'M16 5.5a7 7 0 1 0 0 13a8.5 8.5 0 0 1 0-13z' }, sn_alvo: { s: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20M12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 1 0 0-11', f: DOT }, sn_flecha: { s: 'M12 12v10M7 17l5-5 5 5M2 12h6M16 12h6' }, sn_tres: { s: 'M7 8l5 4 5-4M7 13l5 4 5-4M7 18l5 4 5-4M12 2v6' },
  sn_bang: { s: 'M12 1v6M12 17v6M1 12h6M17 12h6M4.5 4.5l4 4M15.5 15.5l4 4M19.5 4.5l-4 4M8.5 15.5l-4 4' }, sn_caveira: { s: 'M12 1v5M12 19v4M1 12h5M18 12h5', f: 'M12 6.5a5.5 5.5 0 0 0-3.5 9.7V19h7v-2.8A5.5 5.5 0 0 0 12 6.5zM8.8 11.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0zM12.4 11.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0z' }, sn_coracao: { s: 'M12 1v6M12 18v5M1 12h5M18 12h5', f: 'M12 17.5s-5.5-3.3-5.5-7.2a3 3 0 0 1 5.5-1.7a3 3 0 0 1 5.500 1.7c0 3.900-5.500 7.200-5.500 7.200z' }, sn_olho: { s: 'M3 12q9-8 18 0q-9 8-18 0zM12 1v6M12 17v6', f: 'M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0' },
  horseshoe: { s: 'M7.5 18.5a8 8 0 1 1 9 0', f: DOT }, acog: { s: 'M6 13l6-6 6 6M12 11v9M9 16.5h6' }, german: { s: 'M12 13v9M2 12h7M15 12h7' }, triangle: { s: 'M12 4.5l7.5 13h-15z', f: DOT }, brackets: { s: 'M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4', f: DOT },
  star: { f: 'M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.3L12 17.1 6.4 20.2l1.2-6.3L3 9.6l6.3-.8z' }, heart: { f: 'M12 20.5s-8.5-5-8.5-11.2a4.6 4.6 0 0 1 8.5-2.5a4.6 4.6 0 0 1 8.5 2.5c0 6.2-8.5 11.2-8.5 11.2z' },
  smile: { s: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17M7.5 14.5q4.5 4 9 0', f: 'M8 9.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0M13.2 9.5a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0' },
  skull: { f: 'M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3zM6.8 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM13.2 11a2 2 0 1 0 4 0a2 2 0 1 0-4 0z' }, bolt: { f: 'M13.5 2L5 14h6l-1.5 8L19 9.5h-6z' },
  diamond: { s: 'M12 4l8 8-8 8-8-8z', f: DOT }, radar: { s: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 12l6-6' }, wings: { s: 'M3 9l7 3M21 9l-7 3M12 15v5', f: DOT }, ladder: { s: 'M12 3v18M5 7h14M8 12h8M9.5 16h5M10.5 19.5h3' }, artillery: { s: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 2v6M12 16v6M2 12h6M16 12h6', f: DOT },
  spiral: { s: 'M12 12c1-1 2.5 0 2 1.5s-3 2-4.5.5s-1-5 2-6s7 1 7.5 4.5s-2 7.5-6 8' }, crown: { f: 'M4 18L3 7l5 4 4-7 4 7 5-4-1 11z' }, eye: { s: 'M2.5 12q9.5-9 19 0q-9.5 9-19 0z', f: 'M9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0' },
  clover: { f: 'M8.5 7.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M8.5 16.5a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M4 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0M13 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0' }, moon: { f: 'M15 3a9 9 0 1 0 6 15a7.5 7.5 0 0 1-6-15z' },
};
// brilho da reticula (14/11, pedido dele: opcao em Ajustes pra diminuir, com previa ao vivo): um uniform so pra todas as lentes;
// 1 = o brilho cheio de sempre (miolo branco + halo), 0 = so a cor, sem halo. main.js applySettings acerta
export const RET_GLOW = { value: 1 };
export const RET_COLORS = { red: '#ff3b30', green: '#3cff6b', amber: '#ffb21a', white: '#ffffff', black: '#111111', pink: '#ff5fa2', cyan: '#39d7ff', violet: '#9b6bff', lime: '#b6f23c' }; // as 4 ultimas: Rovex Pass
export const retColorOwned = (k) => !RET_PASS[k] || !!progressInfo().unlockAll || passLevel() >= RET_PASS[k];
export const scopeTarget = { texture: null, mask: null };
// lunetas de sniper com identidade propria (01/11): reticula, vidro, borda e jeito de mirar diferentes.
// Caca = cruz fina e vidro limpo; Militar = mil-dot com marcas de queda e vidro ambar; Termica de tinta =
// imagem em papel e tinta com quem esta vivo em vermelho (respeita parede); Variavel = 2 zooms na rodinha/troca.
export const SCOPE_KIND = { sniper_scope_0: 'hunt', sniper_scope_1: 'mil', sniper_scope_2: 'thermal', fusil_scope_6: 'vari' };
const KIND_ID = { hunt: 0, mil: 1, thermal: 2, vari: 3 };
const KIND_RET = { hunt: 'duplex', mil: 'milbdc', thermal: 'cross', vari: 'duplex' };

export const retLensMaterial = (ret, color) => lensMaterial(false, ret, color, null, 1); // previa do brilho nos Ajustes (main.js)
function lensMaterial(big, ret, color, kind = null, retK = 1.45) {
  const ri = RETICLES.indexOf(ret), style = ret === 'milbdc' ? 7 : ri >= 7 ? ri + 1 : Math.max(0, ri); // 7 = milbdc da Militar; as novas vem do 8 em diante
  return lensOwn(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8,
    uniforms: {
      tScope: { value: scopeTarget.texture }, uBig: { value: big ? 1 : 0 }, uOn: { value: 0 },
      uStyle: { value: style }, uCol: { value: new THREE.Color(RET_COLORS[color] || RET_COLORS.red) },
      uKind: { value: kind ? KIND_ID[kind] : -1 }, uStep: { value: 0 }, tMask: { value: scopeTarget.mask }, uRetK: { value: retK }, uGlow: RET_GLOW,
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tScope, tMask; uniform float uBig, uOn, uStyle, uKind, uStep, uRetK, uGlow; uniform vec3 uCol;
      varying vec2 vUv;
      float WK = 1.0; // 13/11 (pedido dele: fina e apagada nas miras pequenas): engrossa todo traco, anel e ponto
      float ln(float d, float w) { w *= WK; return smoothstep(w, w * 0.4, abs(d)); }
      float ring(vec2 p, float r, float w) { w *= WK; return smoothstep(w, w * 0.4, abs(length(p) - r)); }
      float dotp(vec2 p, vec2 c, float r) { r *= mix(1.0, WK, 0.6); return smoothstep(r, r * 0.5, length(p - c)); }
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
        // reticulas de luneta (05/11): traco fino, feitas pra encher o vidro
        if (s >= 28) {
          float hx = ln(q.x, 0.005 * wk), hy = ln(q.y, 0.005 * wk), hair = max(hx, hy);
          vec2 a = abs(q);
          if (s == 28) return hair;
          if (s == 29) return max(ln(q.x, 0.03) * step(q.y, -0.02), ln(q.y, 0.022) * step(0.14, a.x));
          if (s == 30) { float t = hair; for (int i = 1; i <= 6; i++) { float m = float(i) * 0.13; t = max(t, max(ln(q.x - m, 0.006) * step(a.y, 0.035), ln(q.y + m, 0.006) * step(a.x, 0.035))); } return t; }
          if (s == 31) { float t = max(hx, ln(q.y - 0.18, 0.005)); for (int i = 1; i <= 5; i++) { float m = float(i) * 0.14; t = max(t, ln(q.y + m - 0.18, 0.006) * step(a.x, 0.42 - float(i) * 0.07)); } return t; }
          if (s == 32) return max(max(ring(q, 0.55, 0.008 * wk), dotp(q, vec2(0.0), 0.02)), hair * step(0.55, length(q)) * step(length(q), 0.76)); // 13/11: tracinhos curtos fora do anel, igual a previa (antes iam ate a borda)
          if (s == 33) { float t = max(ring(q, 0.16, 0.006 * wk), hair * step(0.16, length(q))); for (int i = 2; i <= 6; i++) { float m = float(i) * 0.12; t = max(t, max(dotp(a, vec2(m, 0.0), 0.016), dotp(a, vec2(0.0, m), 0.016))); } return t; }
          if (s == 34) { float t = hair; for (int i = 1; i <= 7; i++) { float m = float(i) * 0.1; t = max(t, max(ln(a.x - m, 0.005) * step(a.y, 0.028), ln(a.y - m, 0.005) * step(a.x, 0.028))); } return t; }
          if (s == 35) return max(max(ln(q.y + a.x * 0.9, 0.012) * step(a.x, 0.14) * step(-0.14, q.y), hx * step(q.y, -0.13)), hy * step(0.2, a.x));
          if (s == 36) return max(hair * step(length(q), 0.5), max(ln(q.x, 0.05) * step(0.42, a.y), ln(q.y, 0.05) * step(0.42, a.x)));
          if (s == 37) return max(max(dotp(a, vec2(0.34, 0.0), 0.025), dotp(a, vec2(0.0, 0.34), 0.025)), dotp(q, vec2(0.0), 0.022));
          if (s == 38) return max(dotp(q, vec2(0.0), 0.018), max(ln(a.x - 0.46, 0.01) * step(0.28, a.y) * step(a.y, 0.46), ln(a.y - 0.46, 0.01) * step(0.28, a.x) * step(a.x, 0.46)));
          if (s == 39) { vec2 g = abs(fract(q / 0.2 + 0.5) - 0.5) * 0.2; return max(hair, 0.55 * max(ln(g.x, 0.003), ln(g.y, 0.003))); }
          if (s == 40) return max(hair, ln(length(q + vec2(0.04, 0.0)) - 0.3, 0.012) * step(0.0, length(q - vec2(0.13, 0.0)) - 0.28));
          if (s == 41) return max(max(ring(q, 0.62, 0.008 * wk), ring(q, 0.34, 0.008 * wk)), dotp(q, vec2(0.0), 0.022));
          if (s == 42) return max(max(ln(q.y + a.x, 0.012) * step(a.x, 0.17) * step(q.y, 0.0), hx * step(q.y, 0.0)), hy * step(0.2, a.x));
          if (s == 43) { float t = hx * step(0.0, q.y); for (int i = 0; i < 3; i++) { float y = q.y + float(i) * 0.16; t = max(t, ln(y + a.x * 0.8, 0.01) * step(a.x, 0.17)); } return t; }
          if (s == 44) { vec2 r = vec2(a.x - a.y, a.x + a.y) * 0.7071; float t = max(hair, ln(r.x, 0.006)); return t * step(0.14, length(q)) * step(length(q), 0.72); }
          if (s == 45) { float h = 1.0 - smoothstep(0.1, 0.108, length(q * vec2(1.0, 0.9))); h *= smoothstep(0.024, 0.03, length(a - vec2(0.045, -0.012))); return max(h, hair * step(0.14, length(q))); }
          if (s == 46) { vec2 h = q * vec2(1.0, 1.1) / 0.12; float d = h.x * h.x + pow(h.y + 0.15 - sqrt(abs(h.x)) * 0.7, 2.0); return max(1.0 - smoothstep(0.9, 1.0, d), hair * step(0.16, length(q))); }
          if (s == 47) { float e = abs(q.y) - 0.16 * (1.0 - pow(a.x / 0.34, 2.0)); return max(max(ln(e, 0.008) * step(a.x, 0.34), dotp(q, vec2(0.0), 0.05)), hx * step(0.2, a.y)); }
          return hair;
        }
        if (s == 17) return 1.0 - smoothstep(0.03, 0.03 + 0.012 * wk, min(min(seg(q, vec2(0.1, 0.4), vec2(-0.14, -0.02)), seg(q, vec2(-0.14, -0.02), vec2(0.14, 0.02))), seg(q, vec2(0.14, 0.02), vec2(-0.1, -0.4))));
        return 0.0;
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        int s = int(uStyle + 0.5);
        float k = uBig > 0.5 ? 1.0 : uRetK; // red dot: reticula pequena no meio do vidro (estilo BO2)
        WK = uBig > 0.5 ? 1.0 : 1.7;
        vec2 q = p * k;
        float ink = 0.0, glow = 0.0;
        float halo = 0.0;
        float rim = 0.0; // contorno fino de tinta: a reticula salta ate em fundo claro
        if (s <= 4 || s >= 8) { glow = retGlow(s, q, 1.0); halo = retGlow(s, q, uBig > 0.5 ? 4.0 : 5.6) * (uBig > 0.5 ? 0.45 : 0.72) * uGlow; /* 14/11 (pedido dele: "meio apagada"): leve bloom, halo mais largo e mais forte */ rim = clamp(retGlow(s, q, 2.0) - glow, 0.0, 1.0); }
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
        vec3 hot = min(uCol * mix(1.0, 1.4, uGlow), vec3(1.0)) * mix(0.72, 1.0, uGlow), c; float a; // brilho baixo: cor mais funda // 04/11 (pedido dele): cor cheia; misturar com branco virava rosa e o filme desbotava o resto
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
          c = mix(c, mix(hot, vec3(1.0), glow * 0.28 * uGlow), max(glow, halo) * uOn); // miolo puxando pro branco = brilho de luz forte
          a = 1.0;
        } else {
          // laser projetado: miolo quase branco, halo fraquinho da mesma cor em volta
          c = mix(hot, vec3(1.0), glow * glow * 0.32 * uGlow); a = max(max(glow, ink), max(halo, rim)); // 14/11: miolo mais quente (bloom) // contorno inteiro (antes 85%): salta mais no fundo claro
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
// corte da ponta do pente (13/11): raio pra CIMA saindo de dentro do pente acha o fundo do poco em cada fatia; o pente fica so
// TRIM_IN da altura do corpo pra dentro dele, e o que esta dentro afina 6% em volta do centro do pente (sem parede colada = sem piscar)
const trimCache = new Map(), rayBody = {};
function trimMag(mm, body, origin, cid) {
  mm.updateMatrix();
  const key = body + '|' + cid + '|' + mm.matrix.elements.map(v => v.toFixed(4)).join(',');
  if (trimCache.has(key)) return trimCache.get(key);
  const src = mm.geometry.index ? mm.geometry.toNonIndexed() : mm.geometry, M = mm.matrix.clone(), Mi = M.clone().invert();
  const pos = src.attributes.position, n = pos.count, W = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(M).add(origin); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
  const bx = new THREE.Box3(); for (let i = 0; i < n; i++) bx.expandByPoint(v.set(W[i * 3], W[i * 3 + 1], W[i * 3 + 2]));
  const rb = rayBody[body] ||= new THREE.Mesh(parts[body].geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const rc = new THREE.Raycaster(), up = new THREE.Vector3(0, 1, 0), NS = 12, cut = [], cxm = (bx.min.x + bx.max.x) / 2, czm = (bx.min.z + bx.max.z) / 2;
  const bb = parts[body].box, inset = (bb.max.y - bb.min.y) * 0.025;
  for (let k = 0; k <= NS; k++) {
    const z = bx.min.z + (bx.max.z - bx.min.z) * (0.04 + 0.92 * k / NS); let y = Infinity;
    for (const fx of [0.25, 0.5, 0.75]) { rc.set(new THREE.Vector3(bx.min.x + (bx.max.x - bx.min.x) * fx, bx.min.y - 0.001, z), up); const h = rc.intersectObject(rb, false)[0]; if (h) y = Math.min(y, h.point.y); }
    cut.push(y);
  }
  if (!cut.some(Number.isFinite)) { trimCache.set(key, null); return null; }
  for (let k = 0; k <= NS; k++) if (!Number.isFinite(cut[k])) { let j = 1; while (!Number.isFinite(cut[k]) && j <= NS) { for (const q of [k - j, k + j]) if (q >= 0 && q <= NS && Number.isFinite(cut[q])) { cut[k] = cut[q]; break; } j++; } }
  const yAt = (z) => { const t = Math.max(0, Math.min(NS, ((z - bx.min.z) / (bx.max.z - bx.min.z) - 0.04) / 0.92 * NS)), a = Math.floor(t), b2 = Math.min(NS, a + 1); return cut[a] + (cut[b2] - cut[a]) * (t - a); };
  const names = Object.keys(src.attributes), A = names.map(nm => src.attributes[nm]);
  const vert = (i) => ({ w: [W[i * 3], W[i * 3 + 1], W[i * 3 + 2]], a: A.map(at => { const o = []; for (let c = 0; c < at.itemSize; c++) o.push(at.array[i * at.itemSize + c]); return o; }) });
  const f = (P) => P.w[1] - yAt(P.w[2]);
  const lerp = (P, Q, t) => ({ w: P.w.map((x, c) => x + (Q.w[c] - x) * t), a: P.a.map((ar, j) => ar.map((x, c) => x + (Q.a[j][c] - x) * t)) });
  const clip = (poly, c, keepBelow) => { const out = []; for (let i = 0; i < poly.length; i++) { const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P) - c, fq = f(Q) - c, inP = keepBelow ? fp <= 0 : fp >= 0, inQ = keepBelow ? fq <= 0 : fq >= 0; if (inP) out.push(P); if (inP !== inQ) out.push(lerp(P, Q, fp / (fp - fq))); } return out; };
  const outW = [], outA = names.map(() => []); let changed = false;
  const emit = (poly, inside) => { for (let i = 1; i + 1 < poly.length; i++) for (const P of [poly[0], poly[i], poly[i + 1]]) {
    let w = P.w; if (inside && f(P) > 1e-6) { w = [cxm + (w[0] - cxm) * 0.94, w[1], czm + (w[2] - czm) * 0.94]; }
    outW.push(w); P.a.forEach((ar, j) => outA[j].push(...ar)); } };
  for (let i = 0; i < n; i += 3) {
    const T = [vert(i), vert(i + 1), vert(i + 2)], fs = T.map(f);
    if (fs.every(x => x <= 0)) { emit(T, false); continue; }
    changed = true;
    const keep = clip(T, inset, true); if (keep.length < 3) continue;
    const lo2 = clip(keep, 0, true), hi2 = clip(keep, 0, false);
    if (lo2.length >= 3) emit(lo2, false); if (hi2.length >= 3) emit(hi2, true);
  }
  if (!changed) { trimCache.set(key, null); return null; }
  const g = new THREE.BufferGeometry(), P3 = new Float32Array(outW.length * 3);
  outW.forEach((w, i) => { v.set(w[0], w[1], w[2]).sub(origin).applyMatrix4(Mi); P3[i * 3] = v.x; P3[i * 3 + 1] = v.y; P3[i * 3 + 2] = v.z; });
  names.forEach((nm, j) => g.setAttribute(nm, nm === 'position' ? new THREE.BufferAttribute(P3, 3) : new THREE.BufferAttribute(new Float32Array(outA[j]), A[j].itemSize)));
  g.computeBoundingBox(); trimCache.set(key, g); if (typeof window !== 'undefined' && window.__trimLog) window.__trimLog.push([body, cid, n, outW.length, +((bx.max.y - Math.max(...cut.filter(Number.isFinite))) / (bb.max.y - bb.min.y)).toFixed(3)]); return g;
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
// pentes por modelo (08/11, Blender: tools/blender/comic_mags.py): curto e longo de cada arma, na curva e na boca do pente original
const CMAGS = {};
async function loadCmags(loader) {
  const g = await loader.loadAsync(import.meta.env.BASE_URL + 'models/src/comic/mags.glb'); g.scene.updateMatrixWorld(true);
  const pal = paletteReader(gunTex), uv = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5];
  g.scene.traverse(o => { if (!o.isMesh || (o.name !== 'pdrum' && !o.name.startsWith('cmag_') && !o.name.startsWith('cdrum_'))) return; const ge = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld); setUV(ge, uv); ge.computeVertexNormals(); ge.computeBoundingBox(); if (o.name === 'pdrum') { parts.pistol_drum = { geo: ge, box: ge.boundingBox.clone(), ww2: true, drumMag: true, cmag: true }; return; } if (o.name.startsWith('cdrum_')) { parts[o.name] = { geo: ge, box: ge.boundingBox.clone(), ww2: true, drumMag: true, cmag: true }; return; } parts[o.name] = { geo: ge, box: ge.boundingBox.clone(), cmag: true }; const m = o.name.match(/^cmag_(.+)_\d$/); (CMAGS[m[1]] ||= []).push(o.name); });
  for (const k of Object.keys(CMAGS)) CMAGS[k].sort(); if (CMAGS.fusil_13) CMAGS.fusil_13.sort((a, b) => parts[a].box.min.y > parts[b].box.min.y ? -1 : 1); // pente curvo da Pipocadeira: do mais curto ao maior
  if (parts.cmag_subfusil_5_2) parts.subfusil_ext_1 = { ...parts.cmag_subfusil_5_2 }; if (parts.cmag_subfusil_5_6) parts.subfusil_ext_2 = { ...parts.cmag_subfusil_5_6 }; // 09/11 (print dele): estendidos da Cuspideira na largura certa do pente fino
  if (parts.cmag_lmg_2_6) parts.lmg_ext_2 = { ...parts.cmag_lmg_2_6 }; // 09/11: caixa de superaquecimento do Rolo Compressor: pente em cima, longo, do Blender
  for (const k of Object.keys(magCompat)) delete magCompat[k];
}
export function chargerOptions(body, cat) {
  const key0 = body + '|' + cat, listed = chargerOptions0(body, cat);
  return CMAGS[body] && listed.length ? (magCompat[key0 + '|c'] ||= [listed[0], ...CMAGS[body], ...listed.slice(1).filter(x => DRUM_MAGS[x])]) : listed;
}
function chargerOptions0(body, cat) {
  const key = body + '|' + cat;
  if (magCompat[key]) return magCompat[key];
  const native = nativePart(body, 'charger');
  if (!native) return (magCompat[key] = []);
  const nb = parts[native].box, nw = nb.max.x - nb.min.x, nd = nb.max.z - nb.min.z;
  const top = anchor('charger', nb), gi = gripInfo(body);
  const out = [native];
  if (MAG_LOCK.includes(body)) return (magCompat[key] = out);
  if (parts[body].magOwn) { for (const [id, D] of Object.entries(DRUM_MAGS)) if (D.body === body && parts[id]) out.push(id); return (magCompat[key] = out); } // 09/11: pente que era modelado no corpo (em cima, de lado, tambor): so o dele, os do modelo e o tambor proprio; pente de outra arma nao encaixa
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
// borda do corpo do lado direito, acima da altura yMin e dentro do trecho z0..z1 (mira de 45 graus: fica por fora dela)
function edgeRight(body, xc, yMin, z0, z1) {
  const pos = parts[body].geo.attributes.position; let best = xc;
  for (let i = 0; i < pos.count; i++) { const z = pos.getZ(i); if (z >= z0 && z <= z1 && pos.getY(i) >= yMin && pos.getX(i) > best) best = pos.getX(i); }
  return best;
}
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
// 08/11 (print dele, Buzzer sem empunhadura): arma remodelada guarda a peca do modelo antigo, em outro lugar. Medindo, a empunhadura
// nascia 3 unidades acima de Buzzer, Sapateado, Quadril e Trovoada. Peca nativa so vale se estiver encostada no corpo
// 08/11 (print dele): Twister e Hipshot tem punho dianteiro modelado junto com o corpo; a empunhadura entrava embaixo dele. Acha o trecho que
// desce abaixo da linha do cano na metade da frente e monta uma malha sem ele (a mesma ideia do FORE_MOUNTS, medida na hora)
const AUTO_FORE = { subfusil_4: 0.55, subfusil_6: 0.4, subfusil_5: 0.26 }; // ate onde procurar, em fracao do comprimento a partir da boca (Spitter: o corpo baixo comeca logo atras; Hipshot, 08/11: em 0,55 pegava o punho do gatilho, mais fundo que o da frente)
function ensureNoFore(body) {
  const P = parts[body]; if (!P || P.geoNoFore || P.noForeTried || !AUTO_FORE[body]) return;
  P.noForeTried = true;
  const pr = profile(body), b = P.box, len = b.max.z - b.min.z, h = b.max.y - b.min.y, s0 = sliceOf(pr, b.min.z + len * 0.05), s1 = sliceOf(pr, b.min.z + len * AUTO_FORE[body]), vals = [];
  for (let s = s0; s <= s1; s++) if (Number.isFinite(pr.lo[s])) vals.push(pr.lo[s]);
  if (!vals.length) return;
  const sorted = [...vals].sort((x, y) => x - y), base = sorted[sorted.length >> 1], deep = sorted[0]; if (deep > base - h * 0.12) return;
  let a = s0; for (let s = s0; s <= s1; s++) if (pr.lo[s] === deep) { a = s; break; }
  let z = a; while (a > s0 && pr.lo[a - 1] < base - h * 0.05) a--; while (z < s1 && pr.lo[z + 1] < base - h * 0.05) z++;
  const z0 = pr.z0 + (a - 1) * pr.dz, z1 = pr.z0 + (z + 2) * pr.dz, g = P.geo.index ? P.geo.toNonIndexed() : P.geo, pos = g.attributes.position, keep = [];
  for (let i = 0; i < pos.count; i += 3) { let y = 0, w = 0; for (let k = 0; k < 3; k++) { y += pos.getY(i + k) / 3; w += pos.getZ(i + k) / 3; } if (!(w > z0 && w < z1 && y < base - h * 0.02)) keep.push(i, i + 1, i + 2); }
  const out = new THREE.BufferGeometry();
  for (const [k, at] of Object.entries(g.attributes)) { const arr = new at.array.constructor(keep.length * at.itemSize); keep.forEach((v, j) => { for (let c = 0; c < at.itemSize; c++) arr[j * at.itemSize + c] = at.array[v * at.itemSize + c]; }); out.setAttribute(k, new THREE.BufferAttribute(arr, at.itemSize, at.normalized)); }
  out.computeBoundingBox(); P.geoNoFore = out; P.fore = (z0 + z1) / 2; P.foreY = base + 0.005;
}
function handleInBody(body, id) { const B = parts[body].box, h = parts[id]?.box; return !!h && h.min.y < B.max.y && h.max.y > B.min.y - (B.max.y - B.min.y) && h.max.z > B.min.z && h.min.z < B.max.z; }
function bodySlot(body, slot) {
  let nat = nativePart(body, slot);
  if (nat && slot === 'handle' && !handleInBody(body, nat)) nat = null;
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
    const opts = chargerOptions(lo.body, B.wpn).filter(c => parts[c] && !(B.bm && DRUM_MAGS[c])).sort((a, b) => vol(a) - vol(b)); // Mercado Negro: tambor nao (tem balas fixas)
    if (opts.length > 1) lo.charger = B.mag === 'big' ? opts[opts.length - 1] : opts[0];
  }
  // Mercado Negro (08/11, pedido dele): a variante vem MONTADA. O kit (shared/blackmarket.js) diz o que usa; a peca concreta
  // sai das que CABEM nesse modelo, sempre a mesma pelo seed. Tudo passa pelo loadoutStats, entao zoom, empunhadura, laser e bocal valem
  if (B.bm && B.kit && parts[lo.body]) {
    const C = CATEGORY[B.wpn], K = B.kit, pick = (arr, salt = 0) => (arr.length ? arr[(K.seed + salt) % arr.length] : null);
    if (K.scope) lo.scope = pick(C.scopes.filter(x => parts[x] && scopeFits(lo.body, B.wpn, x)));
    if (B.wpn === 'sniper' && !lo.scope) lo.scope = nativePart(lo.body, 'scope') || C.scopes[0];
    if (K.handle) lo.handle = pick((C.handles || []).filter(x => x !== 'akimbo' && !GADGETS[x] && parts[x] && handleFits(lo.body, B.wpn, x)), 3);
    if (K.muzzle) lo.muzzle = pick(muzzleOptions(lo.body), 5);
    lo.laser = K.laser && LASERS.includes(K.laser) ? K.laser : null;
  }
  return lo;
}

// Monta a arma. Devolve o mesmo formato do makeGun (userData: muzzle, gripR, gripL, spin, scope, stats)
// Camuflagem lendaria liga o efeito de fora da arma (fogo, raio, tinta, estrelas)
// arma que saiu de vez (troca de arma de um boneco, arma largada que sumiu): libera os materiais que sao so dela.
// Geometria das pecas e compartilhada (cache das pecas), entao fica. (02/11: cada troca/largada vazava memoria de video)
// 09/11 (travada ao trocar de arma): soltar o ultimo material de um shader apagava o programa, e a proxima arma igual compilava tudo de novo.
// O ultimo de cada programa fica guardado (poucos: PROGRAM_KEEP) e o shader segue pronto.
const PROGRAM_KEEP = matchMedia('(pointer: coarse)').matches ? 10 : 40, KEPT = new Map();
function releaseGunMat(m) {
  const k = m.customProgramCacheKey?.();
  if (!k || !/^paint/.test(k)) { m.dispose(); return; }
  if (KEPT.has(k)) { m.dispose(); const old = KEPT.get(k); KEPT.delete(k); KEPT.set(k, old); return; } // ja tem guardado: so renova a ordem
  KEPT.set(k, m);
  if (KEPT.size > PROGRAM_KEEP) { const [ok, om] = KEPT.entries().next().value; KEPT.delete(ok); om.dispose(); }
}
export function disposeGun(g) {
  const done = new Set();
  g?.traverse(o => {
    if (o.geometry?.userData.gunOwn) { o.geometry.dispose(); for (const c of o.children) if (c.geometry && c.material?.isShaderMaterial) c.geometry.dispose(); } // bocal e laser sao malha propria de cada montagem
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms) if (m?.userData?.gunOwn && !done.has(m)) { done.add(m); releaseGunMat(m); }
  });
}
const lensOwn = (m) => { m.userData.gunOwn = true; return m; };

// previa da Loja (04/11, pedido dele): a mira de verdade, sozinha, com a reticula no vidro. O olho fica atras (+z)
export const SIGHT_SHOW = 'subfusil_scope_2';
export function buildSight(ret, color = 'red', id = SIGHT_SHOW) {
  const p = parts[id]; if (!p) return null;
  const L = id === 'fusil_scope_5' && !p.comic ? postRing(p) : p.lens, b = p.box, sh = b.max.y - b.min.y;
  const c = L ? L.c.clone() : new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + sh * 0.62, b.max.z);
  const r = (L ? L.r : sh * 0.3) * 0.96, holder = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(S); holder.add(inner);
  const m = new THREE.Mesh(p.geo, paintMaterial(null, null, null, true)); outline(m, 0.0055); m.position.copy(c).negate(); inner.add(m);
  const long = sightIsBig(id), lz = (long && rearTube(id) ? Math.max(L ? L.z : b.max.z, b.max.z - 0.006) : (L ? L.z : b.max.z)) - c.z; // luneta: o vidro fica na boca de tras do tubo
  // luneta na vitrine: vidro claro atras da retícula; no tubo escuro o traco fino sumia
  const lens = new THREE.Mesh(geo(THREE.CircleGeometry, Math.round(r * 1e4) / 1e4, 32), lensMaterial(false, ret, color, null, 1));
  lens.position.set(0, 0, lz + 0.003); lens.renderOrder = 3; if (long) lens.material.depthTest = false; /* na vitrine o vidro inteiro aparece, sem a peca de tras cortar */ inner.add(lens);
  return holder;
}
export function buildGun(wpn, lo) {
  const g = buildGunParts(wpn, lo), fx = g?.userData.saber ? null : camoById(lo?.camo).fx; // sabre nao leva camo
  if (g && !allLoaded && CATEGORY[wpn]) g.userData.provisional = true; // montada antes de tudo chegar: pode ter saido com outro corpo
  // 05/11 (pedido dele): sem chama, estrela e faisca em volta da arma; a camo fica so na superficie
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
  if (!parts[lo.body]) lo.body = cat.bodies.find(b => parts[b]); // corpo pedido ainda nao chegou: o 1o da categoria que ja chegou
  if (!lo.body) { const g = makeGun(wpn); g.userData.provisional = true; return g; } // categoria inteira ainda baixando
  const WS = lo.ws && WSKINS[lo.ws];
  if (WS && WS.of === lo.body && parts[WS.body]) lo = { ...lo, body: WS.body, charger: null }; // pente ja vem no modelo da skin
  if (lo.scope === 'sniper_scope_0') lo.scope = null; // Luneta Convencional saiu do jogo (07/11): montagem salva com ela cai na de fabrica
  if (wpn === 'sniper' && !lo.scope) lo.scope = nativePart(lo.body, 'scope') || cat.scopes[0]; // sniper so de luneta
  if (!lo.charger || !chargerOptions(lo.body, wpn).includes(lo.charger)) lo.charger = nativePart(lo.body, 'charger');
  if (!lo.scope && wpn !== 'sniper') lo.scope = DEFAULT_IRON; // sem mira = mira de trilho padrao (01/11)
  if (lo.scope === DEFAULT_IRON && parts[lo.body]?.noIron) lo.scope = CATEGORY[wpn].scopes.find(id => scopeFits(lo.body, wpn, id)) || lo.scope; // sem ferro: entra a 1a mira que cabe
  // pente EM CIMA (07/11, pedido dele): a mira principal vai a 45 graus do lado (o pente tapa o topo) e e ela que mira por padrao;
  // nessas armas nao existe a mira angulada extra. Os atributos continuam os da mira escolhida (statsLo)
  const statsLo = lo, mainCant = topMag(lo.body) && lo.scope && parts[lo.scope] && !IRONS[lo.scope] && lo.scope !== IRON_OWN ? lo.scope : null;
  if (mainCant) lo = { ...lo, scope: null, canted: true };
  else if (topMag(lo.body)) lo = { ...lo, canted: false };
  // arma de desenho (06/11, teste so na Sanfona): fole no tiro, pente de borracha, boca de corneta, estrela de tinta,
  // contorno grosso e hachura. Viewmodel le userData.toon
  const toonGun = TOON_ALL;
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(S);
  holder.add(inner);
  // revolver: o metal (zona verde) e preto de fabrica e leva a camo por cima
  const camoGreen = !!parts[lo.body]?.camoGreen;
  const mat = paintMaterial(lo.paint || DEFAULT_PAINT, lo.accent || DEFAULT_ACCENT, lo.camo, false, camoGreen, TOON_HATCH, lo.pat, lo.pat2); // 07/11 (pedido dele): toda arma vem BRANCA de fabrica
  const partMat = paintMaterial(lo.paint, lo.accent || DEFAULT_ACCENT, null, true, false, TOON_HATCH, lo.pat, lo.pat2); partMat.polygonOffset = true; partMat.polygonOffsetFactor = -1; partMat.polygonOffsetUnits = -2; // 05/11: base da mira colada no corpo nao pisca
  const bodyBox = parts[lo.body].box;
  const len = bodyBox.max.z - bodyBox.min.z, h = bodyBox.max.y - bodyBox.min.y, cx = axisX(lo.body);
  const chargerSlot = bodySlot(lo.body, 'charger');
  // origem da arma = punho da mao direita (atras do carregador, embaixo)
  const isPistol = wpn === 'pistol';
  const gi = gripInfo(lo.body);
  const gripZ = parts[lo.body].grip ? gi.zc : isPistol ? chargerSlot.z : gi ? gi.zc : Math.min(bodyBox.max.z - len * 0.15, chargerSlot.z + len * 0.17);
  const origin = new THREE.Vector3(cx, bodyBox.min.y + h * (isPistol ? 0.45 : 0.42), gripZ);
  // ajuste por encaixe (arma do TastyTony, editor): deslocamento em metros e tamanho (s) de cada peca
  const BP = parts[lo.body], adjOf = (slot) => BP.adj?.[slot] || null;
  const adjV = (slot) => { const a = adjOf(slot); return a ? new THREE.Vector3(a.x || 0, a.y || 0, a.z || 0).multiplyScalar(BP.u || 1) : new THREE.Vector3(); };
  const adjS = (slot) => adjOf(slot)?.s || 1;
  const add = (name, at, m0 = mat, geo = null) => {
    const p = parts[name];
    if (!p) return null;
    const m = new THREE.Mesh(geo || p.geo, m0);
    outline(m, /scope/.test(name) ? 0.0015 /* mira: traco bem curto (07/11, pedido dele: perto do olho o traco grosso tampava a visao) */ : toonGun && (name === lo.body || name === lo.charger) ? 0.0042 : 0.0035); // 07/11 (pedido dele): traco da arma mais curto e fino (era 0,0065 / 0,005) // desenho: traco no corpo e no pente (07/11, pedido dele: era 0,012 e a arma parecia grossa e achatada)
    const off = new THREE.Vector3();
    if (at) off.copy(at.target).sub(at.self);
    m.position.copy(off).sub(origin);
    inner.add(m);
    return m;
  };
  if (lo.handle && parts[lo.handle] && !GADGETS[lo.handle] && lo.handle !== 'akimbo') ensureNoFore(lo.body);
  add(lo.body, null, mat, lo.handle && parts[lo.handle] && parts[lo.body].geoNoFore || null); // com empunhadura: suporte de fabrica sai, o punho entra reto
  const ironUp = !!parts[lo.body].ironGeo && (!lo.scope || !!IRONS[lo.scope]); // TT: ferro so aparece sem mira acoplada (com mira ele sai pra nao atrapalhar)
  if (ironUp) { const im = new THREE.Mesh(parts[lo.body].ironGeo, mat); /* 07/11 (pedido dele): mira de ferro SEM traco preto (perto do olho entupia o entalhe) */ im.position.copy(origin).multiplyScalar(-1); inner.add(im); }
  if (parts[lo.body].tipGeo && !(lo.muzzle && MUZZLES[lo.muzzle] && muzzleFits(lo.body))) { const tm = new THREE.Mesh(parts[lo.body].tipGeo, mat); tm.position.copy(origin).multiplyScalar(-1); outline(tm, 0.0045); inner.add(tm); } // 13/11: freio de fabrica (Lupa) so sem bocal
  if (parts[lo.body].fixedGeo) { const fm = new THREE.Mesh(parts[lo.body].fixedGeo, mat); fm.position.copy(origin).multiplyScalar(-1); outline(fm, 0.0055); inner.add(fm); } // 09/11 (pedido dele): pente em cima fica com qualquer mira
  // revolver: tambor e cao como pecas proprias (giram no tiro)
  const anim = {};
  for (const key of ['drum', 'hammer', 'bolt']) {
    const P = parts[lo.body][key];
    if (!P) continue;
    const piv = new THREE.Group(); piv.position.copy(P.pivot).sub(origin);
    const mm = new THREE.Mesh(P.geo, mat); outline(mm, key === 'drum' ? 0.0055 : 0.003); mm.position.copy(P.pivot).multiplyScalar(-1);
    piv.add(mm); inner.add(piv); anim[key] = piv;
  }
  let scopeInfo = null, scopeBack = (bodyBox.min.z + bodyBox.max.z) / 2, mainSight = null, gunSightGap = null;
  // frente do pente montado (z minimo, espaco do corpo): gadget de baixo do cano nunca encosta nele (03/11)
  let magFrontZ = null, gadgetShift = null, magMesh = null;
  // 08/11 (pedido dele): Luneta de Zoom sem a estaca e a bolinha soltas na ponta (duas ilhas da malha, a frente do tubo). Caixa fica igual: nao mexe no encaixe
  if (lo.scope === 'fusil_scope_6' && parts.fusil_scope_6?.comic && !parts.fusil_scope_6.tidy) { const P6 = parts.fusil_scope_6, ng = P6.geo.index ? P6.geo.toNonIndexed() : P6.geo, keep = geoIslands(ng).filter(i => !(i.tris.length < 300 && i.box.min.z < -3.68)).flatMap(i => i.tris); P6.geo = geoTake(ng, keep); P6.geo.computeBoundingBox(); P6.geo.computeVertexNormals(); P6.tidy = true; }
  const noteMag = (mm) => { if (!mm) return; magMesh = mm; mm.geometry.computeBoundingBox(); const z = mm.geometry.boundingBox.min.z + mm.position.z + origin.z; magFrontZ = magFrontZ == null ? z : Math.min(magFrontZ, z); };
  for (const slot of ['charger', 'scope', 'handle']) {
    const id = lo[slot];
    if (!id || !parts[id]) continue;
    const nat = ownerBody(id) === lo.body && (slot !== 'handle' || handleInBody(lo.body, id));
    if (slot === 'charger' && !nat) {
      if (parts[id].cmag) { // 08/11 (pedido dele, pistolas): pente do Blender ja nasce na posicao do original, na coordenada do corpo; entra sem deslocar (antes caia no poco calculado, longe do cabo)
        const at = magMouth(id), mm = add(id, { self: at, target: at.clone().add(adjV('charger')) }, partMat);
        if (mm && adjS('charger') !== 1) { mm.scale.setScalar(adjS('charger')); mm.position.copy(at).sub(origin).sub(at.clone().multiplyScalar(adjS('charger'))); }
        noteMag(mm); continue;
      }
      const self = magMouth(id), target = bodySlot(lo.body, 'charger'), F = MAG_FIT[lo.body + '|' + id] || MAG_FIT[id] || {};
      if (F.back) target.z += (parts[id].box.max.z - parts[id].box.min.z) * F.back; // +z = pra tras (coronha)
      // assenta pela ENTRADA do poco (fundo do corpo ali): entra o mesmo tanto que o original, mas no maximo 25%
      // da propria altura (pente curto sumia dentro do corpo; comprido ficava com vao). Estendido entra pouco (fica comprido).
      const mh = parts[id].box.max.y - parts[id].box.min.y, prB = profile(lo.body), lip = prB.lo[sliceOf(prB, target.z)];
      if (Number.isFinite(lip)) target.y = lip + Math.min(Math.max(0, target.y - lip), mh * (F.ins ?? 0.25));
      target.add(adjV('charger'));
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
      if (mm && adjS('charger') !== 1) { mm.scale.setScalar(adjS('charger')); mm.position.copy(target).sub(origin).sub(self.clone().multiplyScalar(adjS('charger')).applyQuaternion(mm.quaternion)); } // cresce a partir da boca do pente
      continue;
    }
    if (slot === 'handle' && parts[id].gadget) { // gadget: na frente do pente, assentado embaixo do corpo ali
      const hb = parts[id].box, self = anchor('handle', hb), target = bodySlot(lo.body, 'handle'), gap = (hb.max.z - hb.min.z) * 0.06;
      if (magFrontZ != null && hb.max.z + (target.z - self.z) > magFrontZ - gap) target.z = magFrontZ - gap - (hb.max.z - self.z);
      target.z = Math.max(target.z, bodyBox.min.z + (self.z - hb.min.z) * 0.6); // nao passa muito da boca do cano
      const prG = profile(lo.body), lip = prG.lo[sliceOf(prG, target.z)];
      if (Number.isFinite(lip)) target.y = lip + 0.004;
      target.add(adjV('handle'));
      gadgetShift = target.clone().sub(self);
      add(id, { self, target }, partMat);
      continue;
    }
    if (slot !== 'scope') {
      const self = slot === 'charger' && nat ? magMouth(id) : anchor(slot, parts[id].box), target = nat ? self.clone() : bodySlot(lo.body, slot);
      target.add(adjV(slot));
      const mm = add(id, { self, target }, partMat), sc = adjS(slot);
      if (mm && sc !== 1) { mm.scale.setScalar(sc); mm.position.copy(target).sub(origin).sub(self.clone().multiplyScalar(sc)); } // cresce a partir do encaixe (topo)
      if (slot === 'charger') noteMag(mm); continue;
    }
    {
      const b = parts[id].box, sl = b.max.z - b.min.z, sh = b.max.y - b.min.y;
      // eixo optico = centro da lente; olho fica na traseira da mira
      const L = id === 'fusil_scope_5' && !parts[id].comic ? postRing(parts[id]) : parts[id].lens; // Mira de Poste: a reticula mora dentro do aro
      const lensC = L ? L.c.clone() : new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + sh * 0.62, 0);
      const ancS = anchor('scope', b); if (L) ancS.x = lensC.x; // 07/11 (pedido dele: mira reta no trilho): o eixo e a LENTE, nao o centro da peca (chave/botao de um lado so puxava a mira pro lado)
      const shift = nat ? new THREE.Vector3() : bodySlot(lo.body, 'scope').sub(ancS);
      // a mira nunca passa das pontas do corpo (cano na frente, coronha atras)
      const sight = parts[lo.body].sight, mid = parts[lo.body].mid, hand = (sight !== undefined || mid !== undefined) && !parts[lo.body].wskin && !BP.tt; /* TT: assenta no topo REAL (sem ferro, nada pisca) */ /* skin futurista: tampa alta e irregular, a mira assenta no ponto mais alto (afundava) */
      if (!nat && sight !== undefined) shift.z = sight - 0.01 - b.max.z; // traseira da mira na frente da alca
      if (!nat && mid !== undefined) shift.z = mid - (b.min.z + b.max.z) / 2; // centro da mira em cima do pente
      if (!nat) {
        const zMin = bodyBox.min.z + 0.01 - b.min.z, zMax = bodyBox.max.z - 0.01 - b.max.z;
        if (zMin <= zMax) shift.z = Math.min(zMax, Math.max(zMin, shift.z));
      }
      if (SCOPE_FWD[lo.body]) shift.z -= (bodyBox.max.z - bodyBox.min.z) * SCOPE_FWD[lo.body]; // luneta mais pro meio (Luneta, 01/11)
      const sc = nat ? 1 : adjS('scope'), sA = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2), scl = (v) => v.clone().sub(sA).multiplyScalar(sc).add(sA); // tamanho: cresce a partir do pe da mira
      if (!nat) { const a = adjV('scope'); shift.x += a.x; shift.z += a.z; }
      const sw = Math.min((b.max.x - b.min.x) * 0.45 * sc, 0.12), scx = (b.min.x + b.max.x) / 2 + shift.x;
      let seat = hiUnder(lo.body, scx, sw, sA.z + (b.min.z - sA.z) * sc + shift.z + 0.02, sA.z + (b.max.z - sA.z) * sc + shift.z - 0.02);
      // WW2: assenta no corpo (topo tipico do receptor sob a mira), ignorando o relevo da alca/massa de mira
      // luneta comprida no Bacamarte tambem: o pe passava por cima da mira da ponta do cano e boiava
      if ((hand || BP.tt || LONG_SCOPE[lo.body]?.includes(id)) && !nat) { // TT (07/11): assenta no topo TIPICO do corpo (uma pecinha alta, tipo ponte do carregador, deixava a mira no ar)
        const pr = profile(lo.body), z0 = b.min.z + shift.z, z1 = b.max.z + shift.z, hs = [];
        for (let k = sliceOf(pr, z0); k <= sliceOf(pr, z1); k++) hs.push(pr.hi[k]);
        hs.sort((x, y) => x - y);
        if (hs.length) seat = hs[Math.floor(hs.length * (BP.tt ? 0.5 : 0.35))]; // TT: mediana (a checagem mede a mesma coisa)
      }
      if ((!nat || SCOPE_FWD[lo.body]) && Number.isFinite(seat)) shift.y = seat + (BP.tt ? 0.0015 * BP.u : -0.006) - (wpn === 'pistol' && !nat ? sightUnder(id, (b.min.x + b.max.x) / 2, (bodyBox.max.x - bodyBox.min.x) * 0.4, b.min.y) : b.min.y); // mira que andou pra frente assenta de novo no corpo; TT: base 1,5 mm ACIMA do topo real (anti-pisca)
      if (!nat) shift.y += adjV('scope').y;
      // janela livre: nada do corpo (massa de mira, ferrolho, alca) pode passar na frente da lente.
      // Se passar, a mira sobe e ganha um suporte (riser) embaixo.
      const lr = L ? L.r : sh * 0.3;
      let top = topInFront(lo.body, lensC.x + shift.x, lr * 0.75, (L ? L.z : b.max.z) + shift.z);
      // luneta: o corpo entre o olho e a lente tambem nao pode tampar a imagem
      if (sl >= 0.6 && !hand) top = Math.max(top, topInFront(lo.body, lensC.x + shift.x, lr * 0.75, b.max.z + shift.z, b.max.z + shift.z + 0.15));
      // alca marcada (WW2): mira rente ao corpo, na frente da alca; a massa da boca do cano nao levanta nada
      // luneta no Bacamarte (LONG_SCOPE): a mira da ponta do cano levantava a luneta e ela boiava; assenta no cano
      const lift = hand || BP.tt || LONG_SCOPE[lo.body]?.includes(id) ? 0 : /* TT (07/11, regra dele): a mira NUNCA sai do trilho; lente tapada se ajusta no editor */ Math.min(sh * 0.5, Math.max(0, top + 0.012 - (lensC.y + shift.y - lr * 0.82))); // teto: a luneta trocada (04/11) subia um poste na Pica-Pau
      shift.y += lift;
      { const mm = add(id, { self: new THREE.Vector3(), target: shift }, partMat); if (mm) { mm.userData.sight = 'main'; if (sc !== 1) { mm.scale.setScalar(sc); mm.position.add(sA.clone().multiplyScalar(1 - sc)); } } }
      // vao entre a mira e o corpo vira suporte (riser), nunca fica boiando
      const gap = Number.isFinite(seat) ? b.min.y + shift.y - seat : lift;
      if (gap > 0.012) {
        const rw = Math.min(b.max.x - b.min.x, 0.2), rd = Math.min(sl * 0.55, 0.5);
        const riser = new THREE.Mesh(new THREE.BoxGeometry(rw, gap + 0.02, rd), toon(0x2a2724)); riser.geometry.userData.gunOwn = true;
        outline(riser, 0.0055);
        riser.position.set(scx, b.min.y + shift.y - gap / 2 + 0.004, (b.min.z + b.max.z) / 2 + shift.z).sub(origin);
        inner.add(riser);
      }
      const big = SCOPE_ZOOM[id] ? SCOPE_ZOOM[id] >= 2 : sightLen(parts[id]) >= 0.6; // zoom fechado manda: 1,4x e mira de verdade (a distancia do olho e a do red dot), 3x e luneta
      // luneta: o vidro vai pra boca traseira do tubo (senao o olho enxerga o tunel da ocular por dentro)
      const lensZ = L ? (big && rearTube(id) ? Math.max(L.z, b.max.z - 0.006) : L.z) : b.max.z;
      const eye = scl(new THREE.Vector3(lensC.x, lensC.y, lensZ)).add(shift).sub(origin).multiplyScalar(S);
      // vidro com a reticula (e, na luneta, a imagem ampliada)
      const lensR = (L ? L.r : sh * 0.3) * 0.96 * sc;
      const kind = big ? SCOPE_KIND[id] || null : null;
      const ret = lo.ret && lo.ret !== 'auto' ? lo.ret : big ? KIND_RET[kind] || 'duplex' : 'dot';
      const lens = new THREE.Mesh(geo(THREE.CircleGeometry, Math.round(lensR * 1e4) / 1e4, 32), lensMaterial(big, ret, lo.retColor || 'red', kind));
      lens.position.copy(scl(new THREE.Vector3(lensC.x, lensC.y, lensZ))).add(shift).sub(origin); lens.position.z += 0.003; // 05/11: o vidro fica do lado do olho, com folga: no mesmo plano do modelo ele piscava
      lens.renderOrder = 3;
      inner.add(lens);
      // inclinacao do eixo optico (frente x tras); a pose de mira compensa pra ficar reta
      const tilt = L && L.f ? Math.atan2(L.f.y - L.c.y, L.c.z - L.f.z) : 0;
      scopeBack = sA.z + (b.max.z - sA.z) * sc + shift.z;
      { // validacao (07/11, regra dele): folga entre a base da mira e o topo MEDIANO do corpo embaixo dela
        const pr = profile(lo.body), z0 = sA.z + (b.min.z - sA.z) * sc + shift.z, z1 = sA.z + (b.max.z - sA.z) * sc + shift.z, hs = [];
        for (let k = sliceOf(pr, z0); k <= sliceOf(pr, z1); k++) hs.push(pr.hi[k]); hs.sort((x, y) => x - y);
        gunSightGap = hs.length ? { gap: b.min.y + shift.y - hs[Math.floor(hs.length / 2)], poke: hs[hs.length - 1] - (b.min.y + shift.y), h: sh * sc } : null; // poke = o quanto o ponto mais alto do corpo entra na mira
      }
      mainSight = { id, front: sA.z + (b.min.z - sA.z) * sc + shift.z, mid: (b.min.z + b.max.z) / 2 + shift.z, halfX: (b.max.x - b.min.x) / 2 * sc, x: (b.min.x + b.max.x) / 2 + shift.x };
      scopeInfo = { big, kind, zoom: SCOPE_ZOOM[id] || (big ? 2.6 + sightLen(parts[id]) * 1.6 : 1.55), eye, len: sl * sc * S, lensR: lensR * S, lens, lift, tilt };
    }
  }
  // 13/11 (pedido dele: pente da Lua Minguante piscando): a ponta do pente que entra no corpo e cortada (fica so um pouco dentro)
  // e o pedaco de dentro afina, entao a parede do pente nunca fica colada na parede do poco
  if (magMesh && !isPistol && !topMag(lo.body) && !parts[lo.body].magOwn && !parts[lo.body].magHand && !parts[lo.body].tubeMag && !DRUM_MAGS[lo.charger]) {
    const tg = trimMag(magMesh, lo.body, origin, lo.charger);
    if (tg) { for (const c of [...magMesh.children]) magMesh.remove(c); magMesh.geometry = tg; outline(magMesh, toonGun ? 0.0042 : 0.0035); }
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(cx, bodyBox.max.y - h * 0.28, bodyBox.min.z).sub(origin).multiplyScalar(S);
  let mzInfo = INTEGRAL_SIL.includes(lo.body) ? { id: 'integral', flash: 0.12, quiet: true } : null, mzFit = null; // PB (13/11): silenciador de fabrica = sem clarao
  if (lo.muzzle && MUZZLES[lo.muzzle] && muzzleFits(lo.body)) {
    // bocal no lugar da ponta: encaixa um pouco pra tras da boca (cobre o bico original) e sai pra frente (-z)
    const T = barrelTip(lo.body), pal = paletteReader(gunTex);
    const uvA = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], uvB = pal ? paletteUV(pal, [30, 30, 30]) : [0.4, 0.4];
    const ge = muzzleGeo(lo.muzzle, T.r, T.len, uvA, uvB); ge.rotateX(-Math.PI / 2); ge.computeBoundingBox(); ge.userData.gunOwn = true;
    const m = new THREE.Mesh(ge, partMat); outline(m, 0.0045); const msc = adjS('muzzle'), mad = adjV('muzzle'); m.scale.setScalar(msc);
    const back = T.len * 0.008; // so encosta (entrar 2,5% cruzava a malha do cano e piscava: Bacamarte, 04/11)
    m.position.set(T.c.x, T.c.y, T.z + back).add(mad).sub(origin); inner.add(m);
    // varias bocas (skin Fictional, 04/11): um bocal em cada (mesma peca, mesmo tamanho), a 1a e a de cima
    for (const mz of parts[lo.body].muzzles?.slice(1) || []) { const m2 = new THREE.Mesh(ge, partMat); outline(m2, 0.0045); m2.position.set(mz.x, mz.y, T.z + back).sub(origin); inner.add(m2); }
    const reach = -ge.boundingBox.min.z * msc - back; // quanto passou da boca original
    mzFit = { m, list: inner.children.slice(-((parts[lo.body].muzzles?.length || 1))), ge, msc, back, reach, axisY: (T.c.y + mad.y - origin.y) * S };
    muzzle.position.set(T.c.x, T.c.y, T.z - reach).add(mad).sub(origin).multiplyScalar(S);
    mzInfo = { id: lo.muzzle, flash: MUZZLES[lo.muzzle].flash ?? 1, quiet: !!MUZZLES[lo.muzzle].quiet };
  }
  // boca de corneta (desenho): o cano abre em sino; sem bocal escolhido, o tiro sai da boca do sino
  let bell = null;
  if (TOON_BELL && toonGun && !mzInfo) { // 06/11: ele pediu pra TIRAR (atrapalha os bocais); fica desligado
    const T = barrelTip(lo.body), r = Math.max(0.012, T.r), L = r * 4.5;
    const prof = [[r * 0.92, -r * 0.4], [r, 0], [r * 1.06, L * 0.45], [r * 1.5, L * 0.72], [r * 2.7, L], [r * 2.45, L * 1.03], [r * 1.5, L * 0.82]].map(([x, y]) => new THREE.Vector2(x, y));
    const ge = new THREE.LatheGeometry(prof, 20); ge.rotateX(-Math.PI / 2);
    const bm = toon(0x2e2a26, { unique: true }); bm.side = THREE.DoubleSide;
    bell = new THREE.Mesh(ge, bm); outline(bell, 0.009);
    bell.position.set(T.c.x, T.c.y, T.z).sub(origin); inner.add(bell);
    muzzle.position.set(T.c.x, T.c.y, T.z - L).sub(origin).multiplyScalar(S);
  }
  const gripR = new THREE.Object3D();
  gripR.position.set(0, -0.03, 0.02);
  const gripL = new THREE.Object3D();
  let hs;
  // 14/11 (pedido dele): bipe nao e empunhadura. A mao esquerda segura a sniper (guarda-mao do corpo), nunca as pernas do bipe
  const bipod = /_bipod/.test(lo.handle || '');
  if (lo.handle && parts[lo.handle] && !bipod) {
    const hb = parts[lo.handle].box, nat = ownerBody(lo.handle) === lo.body && handleInBody(lo.body, lo.handle);
    const shift = gadgetShift || (nat ? new THREE.Vector3() : bodySlot(lo.body, 'handle').sub(anchor('handle', hb)));
    const ha = anchor('handle', hb); hs = hb.getCenter(new THREE.Vector3()).sub(ha).multiplyScalar(gadgetShift ? 1 : adjS('handle')).add(ha).add(shift); if (!gadgetShift) hs.add(adjV('handle'));
  } else {
    const pr = profile(lo.body), z = parts[lo.body].fore ?? bodyBox.min.z + len * 0.3; // marca do guarda-mao quando existe
    hs = new THREE.Vector3(cx, pr.lo[sliceOf(pr, z)] + 0.06, z);
    if (parts[lo.body].magHand) hs = parts[lo.body].magHand.clone(); // 13/11: mao no pente (Zumbidor, MP28)
    if (parts[lo.body].magHand && magMesh) { // 13/11 b (pedido dele): a mao segura a PONTA do pente de lado, reta (como o soldado segura a Sten)
      magMesh.updateMatrix(); const mb = magMesh.geometry.boundingBox.clone().applyMatrix4(magMesh.matrix); mb.min.add(origin); mb.max.add(origin);
      hs = new THREE.Vector3(mb.min.x + (mb.max.x - mb.min.x) * 0.2, (mb.min.y + mb.max.y) / 2, (mb.min.z + mb.max.z) / 2);
    }
  }
  gripL.position.copy(hs).sub(origin).multiplyScalar(S);
  if (isPistol) gripL.position.set(-0.03, -0.05, 0.01);
  // sem mira: a mira de ferro fica no topo do corpo
  let cantedInfo = null;
  if (mainCant || (lo.canted && cantedFits(wpn))) {
    // 05/11 (pedido dele): AO LADO da mira atual, rente ao trilho, como nas armas de verdade, e nunca o mesmo modelo dela
    const cantedId = mainCant || cantedPart(lo.scope), P = parts[cantedId], b = P.box, sz = b.max.z - b.min.z, L = P.lens, bx = (b.min.x + b.max.x) / 2, lensUp = (L ? L.c.y - b.min.y : (b.max.y - b.min.y) * 0.62), lensR0 = L ? L.r : (b.max.y - b.min.y) * 0.3;
    // lado a lado com a mira atual; em luneta comprida, na metade da frente dela. Sem mira, um pouco a frente do meio do corpo
    const zWant = parts[lo.body].cantZ ?? (mainSight ? Math.min(mainSight.mid, mainSight.front + sz * 0.6) : (bodyBox.min.z + bodyBox.max.z) / 2 - (bodyBox.max.z - bodyBox.min.z) * 0.08);
    const zs = Math.max(bodyBox.min.z + sz * 0.5, Math.min(bodyBox.max.z - sz * 0.5, zWant));
    const seat = hiUnder(lo.body, cx, 0.04, zs - sz / 2, zs + sz / 2), y00 = Number.isFinite(seat) ? seat : bodyBox.max.y;
    // 05/11 (pedido dele): nada encosta nem pisca. O canto mais perto da mira deitada fica a uma folga medida do corpo e da mira atual
    const halfCant = (b.max.x - b.min.x) / 2, reach = lensUp * Math.SQRT1_2, gapX = 0.025, yFloor = y00 - 0.03;
    const edgeBody = edgeRight(lo.body, cx, yFloor, zs - sz / 2, zs + sz / 2), edgeMain = mainSight ? mainSight.x + mainSight.halfX : cx;
    const gx = Math.max(edgeBody, edgeMain) + gapX + halfCant * Math.SQRT1_2, lensX = gx + reach;
    // o que ainda ficar na frente do vidro (massa de mira, guarda-mao) levanta so o necessario
    const inFront = topInFront(lo.body, lensX, lensR0 * 0.75, zs - sz / 2), y0 = Math.max(yFloor, Number.isFinite(inFront) ? inFront + 0.012 + lensR0 * 0.82 - reach : -Infinity);
    const G = new THREE.Group(); G.position.set(gx, y0, zs).sub(origin); G.rotation.z = -CANTED_ROLL; G.userData.sight = 'canted';
    // suporte: braco deitado saindo de dentro do corpo, por baixo da mira atual; se a mira subiu, um poste do lado de fora
    { const x0 = edgeBody - 0.02, x1 = gx + 0.015, pal = paletteReader(gunTex), dk = pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5]; // 09/11 (pedido dele): suporte na celula escura da paleta = a camo da arma pinta ele
      const arm = new THREE.Mesh(setUV(new THREE.BoxGeometry(x1 - x0, 0.03, sz * 0.5), dk), mat); arm.position.set((x0 + x1) / 2, yFloor - 0.02, zs).sub(origin); arm.geometry.userData.gunOwn = true; outline(arm, 0.0055); inner.add(arm);
      if (y0 - yFloor > 0.01) { const h = y0 - yFloor + 0.03, post = new THREE.Mesh(setUV(new THREE.BoxGeometry(0.035, h, sz * 0.5), dk), mat); post.position.set(gx, yFloor - 0.02 + h / 2, zs).sub(origin); post.geometry.userData.gunOwn = true; outline(post, 0.0055); inner.add(post); } }
    const base = new THREE.Vector3(bx, b.min.y, (b.min.z + b.max.z) / 2), m = new THREE.Mesh(P.geo, partMat); m.position.copy(base).negate(); outline(m, 0.0015); G.add(m); // mira de 45: traco curto (07/11)
    const lc = L ? L.c : new THREE.Vector3(bx, b.min.y + (b.max.y - b.min.y) * 0.62, 0), lz = L ? L.z : b.max.z, lr = (L ? L.r : (b.max.y - b.min.y) * 0.3) * 0.96;
    const lens = new THREE.Mesh(geo(THREE.CircleGeometry, Math.round(lr * 1e4) / 1e4, 32), lensMaterial(false, mainCant ? (lo.ret && lo.ret !== 'auto' ? lo.ret : 'dot') : lo.ret45 && lo.ret45 !== 'auto' ? lo.ret45 : 'dot', (mainCant ? lo.retColor : lo.retColor45) || 'red', null)); lens.position.set(lc.x, lc.y, lz + 0.003).sub(base); lens.renderOrder = 3; G.add(lens);
    inner.add(G);
    const eye = new THREE.Vector3(lc.x, lc.y, lz).sub(base).applyAxisAngle(new THREE.Vector3(0, 0, 1), -CANTED_ROLL).add(G.position).multiplyScalar(S);
    cantedInfo = { part: cantedId, big: false, kind: null, zoom: 1.25, eye, len: sz * S, lensR: lr * S, lens, lift: 0, tilt: 0, roll: CANTED_ROLL };
    if (mainCant) { scopeInfo = { ...cantedInfo, zoom: Math.min(SCOPE_ZOOM[mainCant] || 1.4, 1.8) }; cantedInfo = null; } // a 45 graus e a mira principal (ADS ja deita a arma)
  }
  const iron = (lo.scope === IRON_OWN ? (ironUp && parts[lo.body].ironPt ? parts[lo.body].ironPt.clone() : ownIronPoint(lo.body, cx)) : new THREE.Vector3(cx, bodyBox.max.y + 0.06, bodyBox.min.z + len * 0.6)).sub(origin).multiplyScalar(S);
  // skin de modelo: o neon e uma malha a parte que nunca pega camo nem pintura (04/11)
  if (parts[lo.body].neon) { const nm = new THREE.Mesh(parts[lo.body].neon, NEON_MAT); nm.position.copy(origin).multiplyScalar(-1); inner.add(nm); }
  holder.add(muzzle, gripR, gripL);
  const laser = lo.laser && LASER_DEF[lo.laser] ? addLaser(holder, lo, origin, isPistol, magMesh, partMat) : null;
  holder.userData = { spinLoad: SPIN_LOAD.includes(lo.body) && lo.handle === 'akimbo' /* so no akimbo (pedido dele) */, sideMag: !lo.handle && !!parts[lo.body].magHand, sightGap: gunSightGap, body: lo.body, id: wpn, muzzle, muzzleDev: mzInfo, gripR, gripL, spin: null, scope: scopeInfo, canted: cantedInfo, iron, ironTilt: ironUp && lo.scope === IRON_OWN ? parts[lo.body].ironTilt || 0 : 0, ironDepth: ironUp && lo.scope === IRON_OWN ? (parts[lo.body].ironDepth || 0) * S : 0, ironYaw: ironUp && lo.scope === IRON_OWN ? parts[lo.body].ironYaw || 0 : 0, mat, laser, stats: loadoutStats(wpn, statsLo), drum: anim.drum || null, hammer: anim.hammer || null, sawed: !!parts[lo.body]?.sawed, gripCol: gi ? { z0: (gi.z0 - origin.z) * S, z1: (gi.z1 - origin.z) * S, lo: (gi.lo - origin.y) * S, top: (bodyBox.min.y + h * 0.42 - origin.y) * S } : null /* cabo detectado (mao que segura, 06/11) */, toon: toonGun ? { mag: magMesh, magTop: magMesh?.geometry.boundingBox.max.y ?? 0, magC: magMesh ? magMesh.geometry.boundingBox.getCenter(new THREE.Vector3()) : null, magP0: magMesh?.position.clone() || null, bell } : null, bolt: anim.bolt ? { g: anim.bolt, z0: anim.bolt.position.z, travel: parts[lo.body].bolt.travel } : null };
  // 08/11 (print dele: compensador gigante tampando o ADS): em arma de boca larga o bocal chegava a 11% do comprimento e em 8 armas
  // subia acima da linha de mira. Limita o diametro e, se ainda passar, encolhe ate ficar abaixo da linha do olho
  if (mzFit) {
    const { ge, msc, back, reach, axisY, list } = mzFit, bb = ge.boundingBox, Rg = Math.max(-bb.min.x, bb.max.x, -bb.min.y, bb.max.y) * msc;
    const eyeY = holder.userData.scope?.eye?.y ?? holder.userData.iron?.y, maxR = (isPistol ? 0.055 : 0.03) * (bodyBox.max.z - bodyBox.min.z);
    let k = Math.min(1, maxR / Rg);
    if (eyeY != null) k = Math.min(k, Math.max(0.35, (eyeY - 0.012 - axisY) / (bb.max.y * msc * k * S) * k));
    if (k < 1) { for (const x of list) x.scale.setScalar(msc * k); const nr = -bb.min.z * msc * k - back; muzzle.position.z += (reach - nr) * S; }
  }
  stampSpace(holder, mat, partMat, parts[lo.body].box.getCenter(new THREE.Vector3()).sub(origin).multiplyScalar(S));
  return holder;
}

// 09/11 (print dele: no laser o desenho vinha maior): cada peca tem escala e origem proprias, entao a estampa media diferente em cada uma.
// Agora todas leem a mesma coordenada, a da arma montada: o desenho tem um tamanho so e continua de uma peca pra outra.
// Malhas com a mesma matriz dividem o material; as copias usam o mesmo programa do shader (nao compilam de novo).
function stampSpace(holder, mat, partMat, center) {
  if (!mat.userData.u.uStampM && !partMat.userData.u.uStampM) return;
  holder.updateMatrixWorld(true);
  const inv = holder.matrixWorld.clone().invert(), toStamp = new THREE.Matrix4().makeScale(1.8 / S, 1.8 / S, 1.8 / S).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z)), seen = new Map();
  holder.traverse(o => {
    const base = o.isMesh && (o.material === mat || o.material === partMat) ? o.material : null;
    if (!base?.userData.u.uStampM) return;
    const M = toStamp.clone().multiply(inv).multiply(o.matrixWorld), key = (base === mat ? 'b' : 'p') + M.elements.map(v => v.toFixed(4)).join(',');
    let m = seen.get(key);
    if (!m) {
      const first = ![...seen.values()].includes(base); // a primeira matriz fica no material original (holder.userData.mat continua valendo)
      if (first) m = base;
      else { m = base.userData.again(); m.polygonOffset = base.polygonOffset; m.polygonOffsetFactor = base.polygonOffsetFactor; m.polygonOffsetUnits = base.polygonOffsetUnits; m.userData.u = { ...base.userData.u, uStampM: { value: new THREE.Matrix4() } }; }
      m.userData.u.uStampM.value.copy(M); seen.set(key, m);
    }
    o.material = m;
  });
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
// 09/11 (print dele: status iguais): pente do Blender vale pelo ESTILO (ultimo digito do id), nao pelo volume comparado ao nativo
const CMAG_STATS = {
  1: { mag: 0.75, reload: 0.8, adsTime: 0.9, move: 1.04 },                // curto: leva menos, troca e mira ligeiro
  2: { mag: 1.3, reload: 1.16, adsTime: 1.07, move: 0.98 },               // estendido
  3: { mag: 1.1, kick: 0.86, reload: 1.08, adsTime: 1.03 },               // sapata: peso embaixo segura o coice
  4: { mag: 1.42, reload: 1.26, spread: 1.05, move: 0.96 },               // garrafa: muita bala, abre o tiro
  5: { mag: 0.92, spread: 0.91, reload: 0.93 },                           // costelado: bala mais certa, troca boa
  6: { mag: 1.6, reload: 1.36, adsTime: 1.14, move: 0.94, kick: 1.05 },   // cunha: o maior, o mais pesado
};
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
// fator sobre a cadencia do akimbo: pistola pesada ganha mais com as duas maos, a automatica ja dispara rapido e ganha menos
const AKIMBO_PISTOL_RATE = { pistol_1: 0.95, pistol_2: 1.06, pistol_3: 0.8, pistol_4: 1, pistol_5: 0.86, pistol_6: 1.03, pistol_7: 0.92, pistol_8: 0.88, pistol_9: 0.97, pistol_10: 0.9, pistol_11: 0.84, pistol_12: 0.95, pistol_13: 0.86, pistol_14: 1.06, pistol_15: 0.8 };
const AKIMBO_LONG = {
  smg: { mag: 2, rate: 0.78, dmg: 0.82, spread: 1.35, kick: 1.15, reload: 2.1, move: 0.95 },
  shotgun: { mag: 2, rate: 0.85, dmg: 0.9, spread: 1.2, kick: 1.1, reload: 1.9, move: 0.95 },
  sniper: { mag: 2, rate: 1, dmg: 0.92, spread: 0.45, hip: 0.35, kick: 1.1, reload: 1, move: 0.95 }, // Sentenca nas duas maos (13/11): so atira do quadril, entao o quadril e bem preciso
};
const GRIP_HOLD = { lmg: 0.45, rifle: 0.7, smg: 0.7 };
const GRIP_TRAITS = {
  gd_flame: { adsTime: 1.1, move: 0.97 },                                     // lanca-chamas: pesa na mira
  gd_shot: { adsTime: 1.08, kick: 1.05 },                                      // escopetinha: pesa um pouco
  subfusil_handle_2: { kick: 0.7, adsTime: 1.08, move: 0.98 },               // vertical: segura o recuo
  subfusil_handle_3: { adsTime: 0.86, kick: 0.88, spread: 1.05 },            // angulada: mira rapida
  subfusil_handle_6: { spread: 0.78, kick: 0.9, move: 0.97 },                // curta: tiro de quadril
  fusil_handle_2: { kick: 0.6, spread: 0.88, adsTime: 1.16, move: 0.93 },    // pesada: trava a arma
  sniper_handle_1: { adsTime: 0.9, kick: 1.08 },                               // colher de pau: mira mais rapido, sacode mais
  sniper_handle_2: { kick: 0.78, adsTime: 1.05, move: 0.98 },                  // mola: segura o coice
  sniper_bipod_1: { spread: 0.75, kick: 0.7, adsTime: 1.12, move: 0.93 },      // bipe leve
  sniper_bipod_2: { spread: 0.6, kick: 0.5, adsTime: 1.24, move: 0.86 },       // bipe pesado: quase nao mexe, anda devagar
  akimbo: { mag: 2, rate: 0.72, dmg: 0.86, spread: 1.15, kick: 1.1, reload: 1.55, move: 0.97 }, // duas pistolas: dobra o pente e alterna as maos; sem mirar
};

// Arma branca: textura propria do glb; camuflagem cobre a peca toda. Origem = mao (perto do fim do cabo),
// ponta apontando pro -z (pra frente, como o cano das armas).
function meleeMaterial(map, camo) {
  const m = toon(0xffffff, map ? { map, unique: true } : { vertexColors: true, unique: true }); // espada: cor no vertice
  const glslCode = camoById(camo).code; // so a camo desta lamina entra no shader
  m.userData.u = { uCamo: { value: glslCode }, uTime: camoTime, uReact: { value: 0 }, ...(glslCode === 60 ? { uRovexLogo: rovexLogoU() } : {}) };
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
  const id = lo && parts[meleeBody(lo.body)]?.melee ? meleeBody(lo.body) : DEFAULT_MELEE;
  const p = parts[id], holder = new THREE.Group();
  if (!p) return makeGun('pistol');
  const b = p.box, len = b.max.z - b.min.z, k = MELEE_LEN[Number(id.split('_')[1])] / len;
  const m = new THREE.Mesh(p.geo, meleeMaterial(p.map, p.saber ? null : lo?.camo));
  outline(m, 0.008); // 07/11 (pedido dele): traco da faca mais fino (era 0,02)
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
// superficie real do corpo na lateral (raio contra os triangulos). Medir por vertice falhava no cano fino, que so tem vertice nas pontas:
// sem achar nada caia na largura da arma inteira e o laser ficava pendurado longe (print dele, 08/11). dir -1 = lado esquerdo
const SURF = new Map(), _ray = new THREE.Ray(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _h = new THREE.Vector3();
function surfaceX(body, y, z, hy, hz, dir) {
  const key = [body, y.toFixed(3), z.toFixed(3), dir].join('|'); if (SURF.has(key)) return SURF.get(key);
  const P = parts[body], g = P.geo, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count, far = dir < 0 ? P.box.min.x - 1 : P.box.max.x + 1;
  let best = null;
  for (const [dy, dz] of [[0, 0], [hy, 0], [-hy, 0], [0, hz], [0, -hz]]) {
    _ray.origin.set(far, y + dy, z + dz); _ray.direction.set(dir < 0 ? 1 : -1, 0, 0);
    for (let i = 0; i < n; i += 3) {
      const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
      _a.fromBufferAttribute(pos, ia); _b.fromBufferAttribute(pos, ib); _c.fromBufferAttribute(pos, ic);
      if (_ray.intersectTriangle(_a, _b, _c, false, _h)) best = best == null ? _h.x : dir < 0 ? Math.min(best, _h.x) : Math.max(best, _h.x);
    }
  }
  SURF.set(key, best); return best;
}
function addLaser(holder, lo, origin, isPistol, magMesh, partMat) {
  const D = LASER_DEF[lo.laser], [w, h, d] = D.size;
  const b = parts[lo.body].box, pr = profile(lo.body), len = b.max.z - b.min.z, cx = axisX(lo.body);
  const z = b.min.z + len * (isPistol ? 0.16 : 0.27), sl = pr.lo[sliceOf(pr, z)], sh = pr.hi[sliceOf(pr, z)];
  // pente saindo de lado (Sten): o laser vai pro lado oposto, nunca em cima dele
  let side = -1;
  if (magMesh && !isPistol) { holder.updateMatrixWorld(true); const mb = new THREE.Box3().setFromObject(magMesh), mc = (mb.min.x + mb.max.x) / 2, ax = (cx - origin.x) * S; if (mc < ax - (mb.max.x - mb.min.x) * 0.6) side = 1; }
  // 08/11 (Twister): punho de fabrica puxava o fundo do trecho pra baixo e o laser descia junto; fica na faixa de cima, a do trilho lateral
  const slTop = isPistol ? sl : Math.max(sl, sh - (b.max.y - b.min.y) * 0.3);
  let y = (slTop + sh) / 2, surf = null;
  if (!isPistol) for (const k of [0.5, 0.35, 0.65, 0.2, 0.8]) {
    const yy = slTop + (sh - slTop) * k, hy = h / S * 0.3, hz = d / S * 0.3; let x = surfaceX(lo.body, yy, z, hy, hz, side); if (x == null) continue;
    // pente lateral modelado junto com o corpo (Sten): esse lado fica bem mais longe do eixo que o outro; troca de lado
    const o = surfaceX(lo.body, yy, z, hy, hz, -side);
    if (o != null && Math.abs(x - cx) * S > 0.05 && Math.abs(x - cx) > Math.abs(o - cx) * 1.6) { side = -side; x = o; }
    y = yy; surf = x; break;
  }
  if (surf == null) surf = side < 0 ? sideAt(lo.body, z) : 2 * cx - sideAt(lo.body, z);
  const at = isPistol
    ? new THREE.Vector3(cx, sl, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(0, -h / 2 - 0.004, 0))
    : new THREE.Vector3(surf, y, z).sub(origin).multiplyScalar(S).add(new THREE.Vector3(side * (w / 2 + 0.004), 0, 0)); // encosta na lateral DAQUELE trecho
  const g = new THREE.Group(), LA = parts[lo.body].adj?.laser; g.position.copy(at);
  if (LA) g.position.add(new THREE.Vector3(LA.x || 0, LA.y || 0, LA.z || 0).multiplyScalar((parts[lo.body].u || 1) * S)); // ajuste do editor (TT)
  let box, kAtt = 1;
  // laser comico (07/11, aprovado): pe (presilha) virado pro corpo: de lado no fuzil, pra cima na pistola
  const pal = paletteReader(gunTex), CL = hasComic(lo.laser) ? comicGeo(lo.laser, pal ? paletteUV(pal, [52, 50, 47]) : [0.5, 0.5], pal ? paletteUV(pal, [128, 125, 118]) : [0.5, 0.5]) : null; // destaque cinza (padrao 07/11)
  if (CL) { CL.translate(0, -(CL.boundingBox.min.y + CL.boundingBox.max.y) / 2, 0); CL.rotateZ(isPistol ? Math.PI : side * -Math.PI / 2); }
  const AG = CL || ATT[D.model];
  if (AG) { // peca do pacote de acessorios no tamanho do slot (comprimento manda, proporcao do modelo)
    const ge = AG.clone(); ge.computeBoundingBox(); const sz = ge.boundingBox.getSize(new THREE.Vector3()), k = Math.min(d / sz.z, w * 1.25 / sz.x, h * 1.6 / sz.y);
    ge.scale(k, k, k); kAtt = k; ge.userData.gunOwn = true; box = new THREE.Mesh(ge, CL && partMat ? partMat : (ATT_MAT ||= toon(0xffffff, { map: gunTex }))); // 08/11 (pedido dele): laser pintado na cor de destaque, como as outras pecas
  } else box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(0x2a2724));
  // 08/11: a peca encosta de verdade no corpo, medido pela propria malha (o tamanho do slot deixava um vao e sobrava so a haste)
  if (CL) { box.geometry.computeBoundingBox(); const bb = box.geometry.boundingBox, q = LA?.s || 1;
    if (isPistol) box.position.y = h / 2 + 0.004 - bb.max.y * q + 0.002;
    else box.position.x = side < 0 ? w / 2 + 0.004 - bb.max.x * q + 0.002 : -w / 2 - 0.004 - bb.min.x * q - 0.002; }
  outline(box, 0.004); g.add(box); if (LA?.s) box.scale.setScalar(LA.s);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(isPistol ? w * 0.7 : 0.008, isPistol ? 0.008 : h * 0.7, d * 0.7), toon(0x1c1a18));
  rail.position.set(isPistol ? 0 : -side * (w / 2 + 0.004), isPistol ? h / 2 + 0.004 : 0, 0); if (!CL) g.add(rail); // o laser comico ja tem o pe dele
  const eye = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.3, h * 0.3, 0.006, 12), new THREE.MeshBasicMaterial({ color: D.color }));
  eye.rotation.x = Math.PI / 2; eye.position.set(box.position.x, box.position.y, -d / 2 - 0.002); g.add(eye);
  // feixe: vT = 1 na boca do laser e 0 na ponta (some ao longe)
  const geo = new THREE.CylinderGeometry(0.003, 0.005, 1, 8, 1, true); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, -0.5);
  const beam = new THREE.Mesh(geo, beamMaterial(D.color));
  beam.position.set(box.position.x, box.position.y, -d / 2 - 0.004); beam.scale.z = BEAM_LEN; beam.renderOrder = 4; beam.frustumCulled = false;
  beam.userData.noFx = true; // feixe de 18 m nao conta como superficie da arma (efeito da camo lendaria)
  g.add(beam);
  // Laser Duplo (14/11, pedido dele: saia um feixe so): dois feixes paralelos, um em cima do outro. O 2o e FILHO do 1o: herda o
  // comprimento (scale.z), o liga/desliga (mesmo material), a mira e o removeFromParent que o resto do codigo ja faz no feixe
  const EM = !CL && ATT_EMIT[D.model];
  if (D.twin && EM) { // as duas bocas do modelo, na mesma conta da malha (escala do encaixe e ajuste do editor): cada feixe sai da sua
    const q = kAtt * (LA?.s || 1), [p1, p2] = EM.map(v => v.clone().multiplyScalar(q).add(box.position));
    beam.position.set(p1.x, p1.y, p1.z - 0.002); eye.position.set(p1.x, p1.y, p1.z - 0.001);
    const b2 = new THREE.Mesh(geo, beam.material); b2.position.set(p2.x - p1.x, p2.y - p1.y, 0); b2.renderOrder = 4; b2.frustumCulled = false; b2.userData.noFx = true; beam.add(b2); // filho: herda comprimento, liga/desliga, mira
    const e2 = eye.clone(); e2.position.set(p2.x, p2.y, p2.z - 0.001); e2.scale.setScalar(EM ? 0.75 : 1); eye.scale.setScalar(0.75); g.add(e2); }
  g.traverse(o => { if (o.geometry) o.geometry.userData.gunOwn = true; }); // 09/11 (bateria: memoria de video subindo a cada renascimento): tudo do laser e so desta montagem
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
    if (drum.heatK) st.heatK = drum.heatK;
  } else if (lo.charger && nat && parts[lo.charger] && lo.charger !== nat && !BLUEPRINTS[lo.bp]?.bm) { // Mercado Negro: o numero do pente vem do perfil da variante (shared/blackmarket.js)
    if (lo.charger.startsWith('cmag_')) { for (const [k, v] of Object.entries(CMAG_STATS[lo.charger.slice(-1)] || {})) st[k] *= v; } else {
    const vol = (b) => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; };
    const m = st.mag = Math.max(0.7, Math.min(1.6, vol(parts[lo.charger].box) / vol(parts[nat].box)));
    // pente maior: mais balas, mas pesa (mira, recarga e passo mais lentos); menor: o contrario
    if (m > 1) { st.adsTime *= 1 + (m - 1) * 0.25; st.reload *= 1 + (m - 1) * 0.45; st.move *= 1 - (m - 1) * 0.06; }
    else { st.adsTime *= 1 - (1 - m) * 0.3; st.reload *= 1 - (1 - m) * 0.5; st.move *= 1 + (1 - m) * 0.05; }
    for (const [k, v] of Object.entries(styleOf(lo.charger, MAG_STYLES))) st[k] *= v; // jeito proprio do pente
    }
  }
  if (lo.laser && LASER_DEF[lo.laser]) for (const [k, v] of Object.entries(LASER_DEF[lo.laser].traits)) st[k] *= v;
  // tipo de bala: so os status que ela mexe (fogo, marca, respingo e parede ficam nas regras do jogo)
  if (lo.ammo && AMMO[lo.ammo] && wpn !== 'melee') for (const k of ['dmg', 'mag', 'kick', 'rate']) if (AMMO[lo.ammo][k]) st[k] *= AMMO[lo.ammo][k];
  if (lo.handle) {
    const g = (lo.handle === 'akimbo' && AKIMBO_LONG[wpn]) || GRIP_TRAITS[lo.handle] || { spread: 0.8, kick: 0.72, adsTime: 1.08 };
    for (const k in g) st[k] *= g[k];
    // 04/11 (hotfix, pedido dele): empunhadura de verdade segura o tranco, mais ainda na Metralhadora (era so -30%: 12 tiros/s subiam igual)
    if (lo.handle !== 'akimbo' && !GADGETS[lo.handle]) st.kick *= GRIP_HOLD[wpn] ?? 0.75;
    if (lo.handle === 'akimbo' && wpn === 'pistol') st.rate *= AKIMBO_PISTOL_RATE[lo.body] ?? 1; // 08/11 (pedido dele): cada pistola acelera do seu jeito
  }
  if (IRONS[lo.scope]) for (const [k, v] of Object.entries(IRONS[lo.scope])) st[k] *= v; // mira de ferro: entra rapido, sem zoom
  const mz = lo.muzzle && muzzleFits(lo.body) && MUZZLES[lo.muzzle];
  if (mz) for (const k of ['spread', 'kick', 'adsTime', 'move', 'dmg', 'hip']) if (mz[k]) st[k] *= mz[k];
  const kit = lo.conv && CONV_KITS[lo.body]?.[lo.conv];
  if (kit) for (const [k, v] of Object.entries(kit)) if (k === 'mode' || k === 'burst') st[k] = v; else st[k] *= v; // burst = balas por rajada (valor, nao fator)
  if (lo.handle === 'akimbo' && st.mode === 'burst') { st.mode = 'semi'; st.burst = 0; } // akimbo: cada bala sai de uma mao, intercalando (rajada viraria tiro duplo)
  if (lo.scope && parts[lo.scope]) {
    const sl = sightLen(parts[lo.scope]);
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
  const rb = parts[cat.bodies[0]]?.box || parts[lo.body].box, ref = rb.max.z - rb.min.z; // 1o corpo ainda baixando: compara consigo mesmo
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
    ['st_rate', a.rate / b.rate - 1], ['st_zoom', b.zoomK / a.zoomK - 1], ['st_heat', (a.heatK ?? 1) / (b.heatK ?? 1) - 1],
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
    if (lo.scope?.startsWith('iron_') && !IRONS[lo.scope]) lo.scope = c === 'sniper' ? null : IRON_OWN; // mira que saiu do jogo (05/11)
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
// mira de 45 graus estilo PUBG (05/11, pedido dele): um red dot de verdade inclinado no trilho, a direita. Na mira, um botao gira a arma 45 graus
// e o olho passa pro red dot. Zoom curto, pra perto, sem largar a luneta. Lamina e pistola nao levam
// a mais curta primeiro (caixinha de janela quadrada); perto da mira atual tem que dar pra ver que sao duas miras: nunca a mesma nem uma de cara igual
const CANTED_PARTS = ['fusil_scope_7', 'subfusil_scope_6', 'subfusil_scope_8'], CANTED_ROLL = Math.PI / 4, CANTED_LOOKALIKE = { fusil_scope_7: ['subfusil_scope_2', 'subfusil_scope_9'], subfusil_scope_6: ['subfusil_scope_8'], subfusil_scope_8: ['subfusil_scope_6'] };
const cantedPart = (mainScope) => CANTED_PARTS.find(id => parts[id] && id !== mainScope && !CANTED_LOOKALIKE[id]?.includes(mainScope));
// pente EM CIMA (07/11): o pente de fabrica fica acima do meio do corpo (Bren etc.)
const TOPMAG = {};
export function topMag(body) {
  if (!body || !parts[body]) return false;
  if (TOPMAG[body] !== undefined) return TOPMAG[body];
  // marca no tt_guns.json (topMag: true): a medida automatica errava (Bren: pente colado no corpo; MG42: caixa DO LADO)
  return (TOPMAG[body] = !!TT_GUNS.find(g => g.id === body)?.topMag);
}
export const cantedFits = (cat, body) => !!cat && cat !== 'melee' && cat !== 'pistol' && !!cantedPart(null) && !topMag(body);
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
  if (out.ret45 && !retOwned(out.ret45)) delete out.ret45;
  if (out.retColor45 && !retColorOwned(out.retColor45)) delete out.retColor45;
  // variante de elite liberada: a montagem dela vale mesmo com peca que o nivel ainda nao abriu
  const B = out.bp && BLUEPRINTS[out.bp];
  // 08/11 (2a ordem dele): variante do Mercado Negro vem MONTADA como as de elite (kit fixo + pente), nao com as pecas do jogador
  if (B && B.wpn === cat && bpUnlocked(out.bp)) {
    if (B.bm) return { ...out, ...bpLoadout(out.bp), camo: B.lo.camo, canted: null, conv: null }; // camo exclusiva sempre
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
  if (out.canted && (!cantedFits(cat, out.body) || !partOpen(cat, 1, 'canted'))) out.canted = null; // mira de 45 graus
  if (out.scope?.startsWith('iron_') && !IRONS[out.scope]) out.scope = null; // mira de ferro antiga (trocada pelas de trilho)
  if (out.laser && !ok([null, ...LASERS], out.laser)) out.laser = null;
  if (out.tracer && !partOpen(cat, 1, 'tr:' + out.tracer)) out.tracer = null;
  if (out.ammo && (!AMMO[out.ammo] || !partOpen(cat, 1, 'am:' + out.ammo))) out.ammo = null; // bala trancada volta pra normal
  const cm = camoList.find(c => c.id === out.camo);
  if (cm && !camoOpen(cat, cm)) out.camo = null;
  for (const k of ['pat', 'pat2']) if (out[k] && !stampOpen(out[k])) out[k] = null; // estampa sem posse volta pra cor solida
  return out;
}
export const _dbg = { ironLog: IRON_LOG, geoIslands: (g) => geoIslands(g.index ? g.toNonIndexed() : g), parts, profile: b => profile(b), nativePart, rearTube: id => rearTube(id) };
