// Contador de abates na arma (13/11, pedido dele, referencia do contador do COD): 15 modelos tematicos feitos no Blender
// (tools/blender/killcounter.py -> public/models/src/kc_<id>.glb), presos no lado ESQUERDO da arma. A peca 'screen' de cada
// um recebe a contagem de abates COM AQUELE MODELO de arma (progress.js wpnTracked), desenhada no estilo do tema.
// So na SUA arma (primeira pessoa, Arsenal e Loja): o boneco dos outros nunca carrega nem mostra (regra dele: pesa a memoria).
// Vendido na Loja (shared/shop.js, give 'kc:<id>'); o equipado fica so neste aparelho (rr_kc).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toon, outline } from './toon.js';
import { attachCharm } from './charms.js';

// id -> como a tela desenha. Nada repete: cada tema tem fundo, letra e enfeite proprios
export const KC = {
  despertador: { r: 'raro' }, radio: { r: 'raro' }, letreiro: { r: 'lendario' }, tv: { r: 'epico' }, dinamite: { r: 'epico' },
  caveira: { r: 'epico' }, ferradura: { r: 'raro' }, tinta: { r: 'raro' }, trofeu: { r: 'lendario' }, bigorna: { r: 'raro' },
  fliperama: { r: 'lendario' }, engrenagem: { r: 'epico' }, xerife: { r: 'epico' }, taximetro: { r: 'raro' }, cartola: { r: 'lendario' },
};
export const KC_IDS = Object.keys(KC);
const KEY = 'rr_kc';
export const getKc = () => { try { const v = localStorage.getItem(KEY); return KC[v] ? v : 'none'; } catch { return 'none'; } };
export const setKc = (id) => { try { localStorage.setItem(KEY, KC[id] ? id : 'none'); } catch { /* sem storage */ } };

const pad = (n, k) => String(Math.max(0, Math.min(10 ** k - 1, n | 0))).padStart(k, '0');
const SKULL = 'M12 2C6.48 2 2 6.03 2 11c0 2.77 1.39 5.24 3.56 6.89V21h3v-2h2v2h3v-2h2v2h3v-3.11C20.61 16.24 22 13.77 22 11c0-4.97-4.48-9-10-9zM8.5 14C7.12 14 6 12.88 6 11.5S7.12 9 8.5 9 11 10.12 11 11.5 9.88 14 8.5 14zm7 0c-1.38 0-2.5-1.12-2.5-2.5S14.12 9 15.5 9 18 10.12 18 11.5 16.88 14 15.5 14z';
function skull(g, x, y, s, col) { g.save(); g.translate(x - s / 2, y - s / 2); g.scale(s / 24, s / 24); g.fillStyle = col; g.fill(new Path2D(SKULL)); g.restore(); }
function fit(g, txt, font, maxW, size) { let s = size; do { g.font = font.replace('{s}', s); s -= 2; } while (g.measureText(txt).width > maxW && s > 8); }
// cada tema desenha a contagem do seu jeito (W x H do canvas, n = abates)
const DRAW = {
  despertador(g, W, H, n) { // mostrador de relogio: marcas de hora, ponteiros e o numero no meio
    g.fillStyle = '#f4ecd6'; g.fillRect(0, 0, W, H); g.strokeStyle = '#141210'; g.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r1 = W * 0.44, r2 = W * (i % 3 ? 0.4 : 0.36); g.lineWidth = i % 3 ? 4 : 8; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); g.lineTo(W / 2 + Math.cos(a) * r2, H / 2 + Math.sin(a) * r2); g.stroke(); }
    g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2, H * 0.2); g.stroke();
    g.fillStyle = '#141210'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '800 {s}px Grandstander, sans-serif', W * 0.56, 96); g.fillText(String(n), W / 2, H * 0.6);
    skull(g, W / 2, H * 0.36, 30, '#c23a2c');
  },
  radio(g, W, H, n) { // dial ambar com escala e digitos de valvula
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffcf6b'); gr.addColorStop(1, '#e08a1e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(60,30,0,.55)'; g.lineWidth = 3; for (let i = 0; i <= 20; i++) { const x = W * 0.06 + i * W * 0.044; g.beginPath(); g.moveTo(x, H * 0.08); g.lineTo(x, H * (i % 5 ? 0.2 : 0.3)); g.stroke(); }
    g.fillStyle = '#3a1a00'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, pad(n, 4), '800 {s}px Bowlby One, Grandstander, sans-serif', W * 0.8, 92); g.fillText(pad(n, 4), W / 2, H * 0.64);
    g.fillStyle = '#c23a2c'; g.fillRect(W * (0.1 + Math.min(0.8, n / 1000 * 0.8)), H * 0.05, 5, H * 0.32); // agulha anda com os abates
  },
  letreiro(g, W, H, n) { // marquise de cinema: lampadas formando os digitos
    g.fillStyle = '#141210'; g.fillRect(0, 0, W, H);
    const c2 = document.createElement('canvas'); c2.width = 64; c2.height = 24; const q = c2.getContext('2d'); q.fillStyle = '#fff'; q.font = '800 22px Grandstander, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(String(n), 32, 13);
    const px = q.getImageData(0, 0, 64, 24).data, sx = W / 64, sy = H / 24;
    for (let y = 0; y < 24; y += 2) for (let x = 0; x < 64; x += 2) { const on = px[(y * 64 + x) * 4 + 3] > 90; g.fillStyle = on ? '#ffd23a' : 'rgba(255,210,58,.12)'; g.beginPath(); g.arc(x * sx + sx, y * sy + sy, Math.min(sx, sy) * 0.85, 0, 7); g.fill(); }
  },
  tv(g, W, H, n) { // fosforo verde com linhas de varredura
    g.fillStyle = '#0d2a14'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7dff9a'; g.shadowColor = '#7dff9a'; g.shadowBlur = 18; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '400 {s}px "Courier New", monospace', W * 0.8, 120); g.fillText(String(n), W / 2, H * 0.58);
    g.shadowBlur = 0; g.font = '700 26px "Courier New", monospace'; g.fillText('ABATES', W / 2, H * 0.17);
    g.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 3);
  },
  dinamite(g, W, H, n) { // cronometro de bomba: digitos de 7 segmentos vermelhos
    g.fillStyle = '#120404'; g.fillRect(0, 0, W, H); const s = pad(n, 4), cw = W / 4.6;
    const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
    for (let i = 0; i < 4; i++) { const x = W * 0.08 + i * cw * 1.05, y = H * 0.12, w = cw * 0.8, h = H * 0.76, t = w * 0.16;
      const R = { a: [x, y, w, t], b: [x + w - t, y, t, h / 2], c: [x + w - t, y + h / 2, t, h / 2], d: [x, y + h - t, w, t], e: [x, y + h / 2, t, h / 2], f: [x, y, t, h / 2], g: [x, y + h / 2 - t / 2, w, t] };
      for (const k of 'abcdefg') { g.fillStyle = SEG[s[i]].includes(k) ? '#ff3b2a' : 'rgba(255,59,42,.1)'; g.fillRect(...R[k]); } }
  },
  caveira(g, W, H, n) { // pergaminho pirata
    g.fillStyle = '#e8d6a8'; g.fillRect(0, 0, W, H); g.strokeStyle = '#6b4a2a'; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12);
    skull(g, H * 0.5, H / 2, H * 0.62, '#141210');
    g.fillStyle = '#7a1c12'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '400 {s}px Bowlby One, Grandstander, serif', W * 0.6, 84); g.fillText(String(n), W * 0.6, H * 0.55);
  },
  ferradura(g, W, H, n) { // plaquinha de latao gravada
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f0cf6a'); gr.addColorStop(1, '#a8741a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#5a3a08'; for (const [x, y] of [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]]) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, 'Nº ' + n, '800 {s}px Grandstander, serif', W * 0.84, 80);
    g.fillStyle = 'rgba(255,240,200,.6)'; g.fillText('Nº ' + n, W / 2 + 2, H / 2 + 3); g.fillStyle = '#4a2c04'; g.fillText('Nº ' + n, W / 2, H / 2);
  },
  tinta(g, W, H, n) { // rotulo da lata com respingo atras do numero
    g.fillStyle = '#faf8f2'; g.fillRect(0, 0, W, H); g.fillStyle = '#e0301e';
    g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, r = H * (i % 2 ? 0.28 : 0.44); g.lineTo(W / 2 + Math.cos(a) * r * 1.5, H / 2 + Math.sin(a) * r); } g.fill();
    g.fillStyle = '#141210'; g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.88, W, H * 0.12);
    g.fillStyle = '#faf8f2'; g.strokeStyle = '#141210'; g.lineWidth = 8; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '800 {s}px Grandstander, sans-serif', W * 0.7, 96); g.strokeText(String(n), W / 2, H * 0.53); g.fillText(String(n), W / 2, H * 0.53);
  },
  trofeu(g, W, H, n) { // placa preta de trofeu com letra dourada
    g.fillStyle = '#141210'; g.fillRect(0, 0, W, H); g.strokeStyle = '#e0b13a'; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = '#e0b13a'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '400 {s}px Bowlby One, Grandstander, serif', W * 0.7, 80); g.fillText(String(n), W / 2, H * 0.54);
    g.font = '800 18px Grandstander, sans-serif'; g.fillText('★', W * 0.12, H / 2); g.fillText('★', W * 0.88, H / 2);
  },
  bigorna(g, W, H, n) { // giz no ferro: tracinhos de contagem + o numero
    g.fillStyle = '#2b2e31'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(236,233,225,.9)'; g.lineWidth = 4; g.lineCap = 'round';
    const k = Math.min(n, 5); for (let i = 0; i < k; i++) { const x = W * 0.12 + i * 12; g.beginPath(); g.moveTo(x, H * 0.2); g.lineTo(x + 2, H * 0.8); g.stroke(); }
    if (k === 5) { g.beginPath(); g.moveTo(W * 0.08, H * 0.7); g.lineTo(W * 0.12 + 56, H * 0.3); g.stroke(); }
    g.fillStyle = 'rgba(236,233,225,.92)'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '700 {s}px Grandstander, sans-serif', W * 0.5, 80); g.fillText(String(n), W * 0.66, H * 0.54);
  },
  fliperama(g, W, H, n) { // placar de 8 bits
    g.fillStyle = '#0a1a4a'; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
    const c2 = document.createElement('canvas'); c2.width = 48; c2.height = 36; const q = c2.getContext('2d'); q.fillStyle = '#5cf2ff'; q.font = '700 13px monospace'; q.textAlign = 'center'; q.fillText('HI', 24, 11); q.fillStyle = '#fff'; q.font = '700 16px monospace'; q.fillText(pad(n, 5), 24, 29);
    g.drawImage(c2, 0, 0, W, H);
  },
  engrenagem(g, W, H, n) { // tambores de odometro de cobre
    g.fillStyle = '#3a1e0e'; g.fillRect(0, 0, W, H); const s = pad(n, 4), cw = W * 0.17;
    for (let i = 0; i < 4; i++) { const x = W * 0.16 + i * cw * 1.04, gr = g.createLinearGradient(0, H * 0.32, 0, H * 0.68); gr.addColorStop(0, '#6b3a1a'); gr.addColorStop(0.5, '#f2d6a2'); gr.addColorStop(1, '#6b3a1a');
      g.fillStyle = gr; g.fillRect(x, H * 0.32, cw, H * 0.36); g.fillStyle = '#2a1206'; g.font = `800 ${Math.round(H * 0.28)}px Grandstander, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s[i], x + cw / 2, H * 0.51); }
  },
  xerife(g, W, H, n) { // cartaz de PROCURADO
    g.fillStyle = '#e9d9b0'; g.fillRect(0, 0, W, H); g.fillStyle = '#5a3a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 30px Bowlby One, serif'; g.fillText('PROCURADO', W / 2, H * 0.22);
    fit(g, String(n), '400 {s}px Bowlby One, serif', W * 0.66, 92); g.fillText(String(n), W / 2, H * 0.6);
    g.font = '800 20px Grandstander, serif'; g.fillText('ABATES', W / 2, H * 0.85);
  },
  taximetro(g, W, H, n) { // visor de taximetro: tambores brancos em fundo preto, com "R$" de bandeirada
    g.fillStyle = '#0c0c0c'; g.fillRect(0, 0, W, H); const s = pad(n, 5), cw = W * 0.12;
    g.fillStyle = '#ffd23a'; g.font = '800 30px Grandstander, sans-serif'; g.textBaseline = 'middle'; g.fillText('R$', W * 0.05, H / 2);
    for (let i = 0; i < 5; i++) { const x = W * 0.28 + i * cw * 1.08; g.fillStyle = '#f4f1e8'; g.fillRect(x, H * 0.15, cw, H * 0.7); g.fillStyle = '#141210'; g.font = `800 ${Math.round(H * 0.5)}px "Courier New", monospace`; g.textAlign = 'center'; g.fillText(s[i], x + cw / 2, H * 0.53); g.textAlign = 'left'; }
  },
  cartola(g, W, H, n) { // faixa roxa de magico com estrelas e o numero dourado
    g.fillStyle = '#4b2a8a'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,224,120,.75)';
    for (const [x, y] of [[0.08, 0.3], [0.9, 0.7], [0.2, 0.8], [0.8, 0.25]]) { g.font = '700 22px serif'; g.fillText('✦', W * x, H * y); }
    g.fillStyle = '#ffd86b'; g.strokeStyle = '#2a124a'; g.lineWidth = 6; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, String(n), '400 {s}px Bowlby One, Grandstander, serif', W * 0.62, 96); g.strokeText(String(n), W / 2, H * 0.55); g.fillText(String(n), W / 2, H * 0.55);
  },
};

const LOAD = new Map(), loader = new GLTFLoader();
function model(id) {
  if (!LOAD.has(id)) LOAD.set(id, loader.loadAsync(import.meta.env.BASE_URL + `models/src/kc_${id}.glb`).then((gl) => {
    gl.scene.updateMatrixWorld(true);
    const parts = [], box = new THREE.Box3(); let scr = null;
    gl.scene.traverse((o) => { if (!o.isMesh) return; const geo = o.geometry.clone().applyMatrix4(o.matrixWorld).rotateX(Math.PI / 2); geo.computeBoundingBox(); box.union(geo.boundingBox); // rotateX: o glTF do Blender vira Z-cima em Y-cima; volta a frente pra +Z
      if (/^screen/.test(o.name) || o.material?.name === 'screen') scr = geo; else parts.push({ geo, col: o.material?.color?.clone() || new THREE.Color(0xcccccc) }); });
    const s = box.getSize(new THREE.Vector3()), k = 1 / Math.max(s.x, s.y), c = box.getCenter(new THREE.Vector3());
    for (const g of [...parts.map(p => p.geo), scr].filter(Boolean)) { g.translate(-c.x, -c.y, -box.min.z); g.scale(k, k, k); g.computeBoundingBox(); } // tamanho 1, costas no z = 0 (encosta na arma)
    return { parts, scr, depth: s.z * k };
  }).catch(e => { console.warn('contador', id, e); return null; }));
  return LOAD.get(id);
}

// tela: canvas na proporcao da peca 'screen'; redesenha so quando o numero muda
function makeScreen(geo, id) {
  const b = geo.boundingBox, w = b.max.x - b.min.x, h = b.max.y - b.min.y, W = 256, H = Math.max(64, Math.round(256 * h / w / 16) * 16);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); mesh.position.z += 0.004; // um tico pra frente: sem brigar com a peca de tras
  let last = -1;
  const draw = (n) => { if (n === last) return; last = n; const g = cv.getContext('2d'); g.save(); g.clearRect(0, 0, W, H); g.translate(0, H); g.scale(1, -1); /* o UV do Blender chega de cabeca pra baixo */ (DRAW[id] || DRAW.trofeu)(g, W, H, n); g.restore(); tex.needsUpdate = true; };
  return { mesh, draw };
}
// monta o contador solto (Loja e Arsenal): grupo com tamanho 1 de altura/largura, frente pra +Z
export function kcObject(id, kills = 0) {
  const root = new THREE.Group(); root.userData.noFx = true;
  root.userData.ready = model(id).then((M) => {
    if (!M) return;
    for (const p of M.parts) { const m = new THREE.Mesh(p.geo, toon(p.col.getHex())); outline(m, 0.0045); /* traco fino igual ao do chaveiro (13/11) */ m.userData.noFx = true; root.add(m); }
    if (M.scr) { const S = makeScreen(M.scr, id); S.draw(kills); S.mesh.userData.noFx = true; root.add(S.mesh); root.userData.kcDraw = S.draw; }
    root.traverse(o => { o.userData.noFx = true; }); // contorno incluso: nunca conta como peca da arma
  });
  root.userData.setKills = (n) => root.userData.kcDraw?.(n);
  return root;
}

const ray = new THREE.Raycaster(), RO = new THREE.Vector3(), RD = new THREE.Vector3();
const KC_SIZE = 0.075; // tamanho em relacao ao comprimento da arma (13/11, pedido dele: bem menor) (mexer so aqui)
const KC_TURN = 0.55, KC_TILT = 0.3; // vira pra camera de quem atira: pra tras e um pouco pra cima. 14/11 (pedido dele: "grudado"): 0,95 -> 0,55, girado demais so a quina encostava e o resto saia pra fora
// prende no lado esquerdo da arma (o que quem atira ve), na altura do corpo, entre o cabo e o meio
export function attachKc(gun, id, kills = 0) {
  if (!gun) return null;
  if (gun.userData.kc) { gun.remove(gun.userData.kc); gun.userData.kc = null; }
  if (!id || id === 'none' || !KC[id]) return null;
  gun.updateWorldMatrix(true, true);
  const inv = gun.matrixWorld.clone().invert(), box = new THREE.Box3(), part = new THREE.Box3(), rel = new THREE.Matrix4(); let n = 0;
  gun.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.userData.noFx || o.material?.isShaderMaterial || o.material?.transparent || o.material?.side === THREE.BackSide) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    part.copy(o.geometry.boundingBox).applyMatrix4(rel.multiplyMatrices(inv, o.matrixWorld)); box.union(part); n++;
  });
  if (!n) return null;
  const size = box.getSize(new THREE.Vector3()), L = Math.max(size.x, size.y, size.z), u = gun.userData, S = L * KC_SIZE;
  const zR = u.gripR?.position.z ?? box.max.z - size.z * 0.35, zL = u.gripL?.position.z ?? zR - size.z * 0.3, long = Math.abs(zL - zR) > size.z * 0.2;
  const zs = long ? zR + (zL - zR) * 0.48 : zR - size.z * 0.16; // 13/11: no meio do receptor (perto do cabo ficava colado na camera mirando e parecia solto)
  // raios de fora pra dentro na lateral esquerda contra TODAS as pecas (o pente de tambor/de lado e peca propria: antes so a maior
  // peca contava, o contador entrava no pente e piscava). Lado das faces nao importa (arma espelhada)
  const T = []; gun.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.noFx && !o.userData.stk && !o.material?.isShaderMaterial && !o.material?.transparent && o.material?.side !== THREE.BackSide) T.push(o); });
  const sides = T.map(o => o.material.side); for (const o of T) o.material.side = THREE.DoubleSide;
  RD.set(1, 0, 0).transformDirection(gun.matrixWorld);
  const probe = (z, y) => { RO.set(box.min.x - 1, y, z).applyMatrix4(gun.matrixWorld); ray.set(RO, RD); const h = ray.intersectObjects(T, false)[0]; return h ? gun.worldToLocal(h.point.clone()).x : null; };
  // procura do meio do receptor PRA TRAS primeiro (pedido dele: pente que atrapalha a vista = contador mais pra tras), depois pra frente.
  // Aceita so lateral LISA embaixo do contador inteiro (9 raios; nada saltado = nenhuma peca atravessando)
  let at = null, best = null; // best: o melhor ponto permitido quando nenhum e liso (mais raios na arma, menos relevo)
  search: for (const dz of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, ...Array.from({ length: 18 }, (_, i) => -0.5 * (i + 1))]) /* pra frente ate o guarda-mao */ {
    const back = zR > zL ? 1 : -1, z = zs + dz * S * back; // "pra tras" = pro lado do cabo
    if (z < box.min.z + S || z > box.max.z - S) continue;
    // arma comprida: nada em cima das maos (a luva tampava) nem passando do cabo pra coronha (saia da tela); entre as maos ou no guarda-mao
    const hg = S * 0.6 + 0.03; if (long && ((zR - z) * back < hg || Math.abs(z - zL) < hg)) continue;
    for (const yk of [0.42, 0.34, 0.5, 0.28, 0.58, 0.22, 0.66, 0.74]) {
      const y = box.min.y + size.y * yk, xs = [];
      for (const dzz of [-0.45, 0, 0.45]) for (const dy of [-0.4, 0, 0.4]) xs.push(probe(z + dzz * S, y + dy * S));
      const hit = xs.filter(v => v !== null); if (hit.length >= 5) { const sc = hit.length - (Math.max(...hit) - Math.min(...hit)) / S * 4; if (!best || sc > best.sc) best = { sc, at: new THREE.Vector3(Math.min(...hit), y, z) }; }
      if (hit.length < 8) continue; // a arma e uma malha so e o receptor tem 5 cm: 1 raio perdido (furo, quina) passa
      const mn = Math.min(...hit); if (Math.max(...hit) - mn > S * 0.45) continue;
      at = new THREE.Vector3(mn, y, z); break search;
    }
  }
  if (!at && best) at = best.at; // sem lateral lisa: o melhor ponto permitido (fora das maos), encostado no ponto mais saltado
  if (!at) for (const yk of [0.34, 0.42, 0.28, 0.5]) { const x = probe(zs, box.min.y + size.y * yk); if (x !== null) { at = new THREE.Vector3(x, box.min.y + size.y * yk, zs); break; } } // arma sem lateral lisa: o ponto antigo
  T.forEach((o, i) => { o.material.side = sides[i]; });
  if (!at) return null; // nenhum raio pegou a arma: melhor sem contador que solto no ar
  const k = kcObject(id, kills);
  k.scale.setScalar(S); k.position.copy(at); k.rotation.set(-KC_TILT, -Math.PI / 2 + KC_TURN, 0, 'YXZ'); // frente do lado esquerdo, virada pra quem segura a arma
  // sem flick (regra dele): girado, a quina de tras entrava na arma e as faces brigavam. Acha a quina mais pra dentro (+x)
  // da caixa do modelo (1 x 1 x ate 0,7 de fundo) e afasta tudo ate ela ficar fora da pele, com folga
  // conta exata quando o modelo chega: o vertice que mais entra na arma (+x) encosta na pele com uma folguinha
  k.position.x = at.x - S * 0.6; // provisorio (ainda sem malha)
  k.userData.ready?.then(() => {
    k.position.x = 0; k.updateMatrix(); let inX = -Infinity; const c = new THREE.Vector3();
    k.traverse(o => { const P = o.isMesh && o.geometry.attributes.position; if (!P) return; for (let i = 0; i < P.count; i++) { c.fromBufferAttribute(P, i).applyMatrix4(k.matrix); if (c.x > inX) inX = c.x; } });
    k.position.x = at.x - (Number.isFinite(inX) ? inX : S * 0.6) - S * 0.025;
  });
  gun.add(k); gun.userData.kc = k;
  // 14/11: o chaveiro sai da frente do contador (charms.js pula os pontos perto dele): pendura de novo, agora sabendo onde o contador ficou
  const C = gun.userData.charm; if (C) attachCharm(gun, C.id, C.side);
  return k;
}
