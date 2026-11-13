// Adesivos de arma (13/11, pedido dele): o jogador escolhe no Arsenal e ARRASTA o adesivo em cima da arma 3D; ate 4 por
// modelo de arma. Salvo so neste aparelho (rr_stk), por corpo de arma, na posicao da propria arma (espaco local).
// So a SUA arma mostra (primeira pessoa, Arsenal, Loja): o boneco dos outros nunca carrega (regra dele: pesa a memoria).
// Desenho em canvas (fontes do jogo valem), com a borda branca de adesivo recortado. 4 de graca, o resto na Loja ('stk:<id>').
import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

export const STK_FREE = ['pow', 'estrela', 'coracao', 'raio'];
// 14/11 (pedido dele): 16 novos, todos ANIMADOS (e mais caros). STK_ANIM: modo do shader de cada um (ver stickerMat)
export const STK_ANIM = { bonk: 'pulse', plaft: 'shine', bigode: 'wobble', joinha: 'pulse', nota: 'wobble', lua: 'holo', sol: 'spin', cafe: 'float',
  disco: 'spin', claquete: 'shine', cartola: 'wobble', bomba: 'pulse', pirulito: 'hue', fantasma: 'float', cogumelo: 'hue', planeta: 'holo' };
export const STK_IDS = ['pow', 'estrela', 'coracao', 'raio', 'caveira', 'olho', 'tinta', 'bigorna', 'sorriso', 'chama', 'trevo', 'dado', 'dinamite', 'banana', 'coroa', 'alvo', ...Object.keys(STK_ANIM)];
export const STK_MAX = 4;
const INK = '#141210', PAPER = '#faf8f2';
const P = {
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
  skull: 'M12 2C6.48 2 2 6.03 2 11c0 2.77 1.39 5.24 3.56 6.89V21h3v-2h2v2h3v-2h2v2h3v-3.11C20.61 16.24 22 13.77 22 11c0-4.97-4.48-9-10-9z',
  flame: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z',
  crown: 'M3 18h18v2.5H3zM3 7l5 4.5L12 4l4 7.5L21 7l-2 9.5H5z',
  anvil: 'M2 7h13c.5 2 2.5 3 7 3v2c-3 0-5 .8-6 2v2h2v3.5H6V16h2v-2c-3.3 0-6-2-6-4.5z',
  banana: 'M3.5 5.5c.5 7.5 6 13 15.5 12.8 1.4 0 2-1.4 1-2.3-6.2-.4-10.6-4.6-12.4-10.6-.4-1.4-2-1.6-2.6-.8L4 4.2z',
};
// arte de cada adesivo em coordenadas 24x24 (Material Icons e formas simples desenhadas a mao)
const ART = {
  pow(g) { g.fillStyle = '#ffd23a'; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, r = i % 2 ? 7.2 : 11.4; g.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e0301e'; g.font = '400 7px Bowlby One, Grandstander, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 1.1; g.strokeText('POW!', 12, 12.5); g.fillText('POW!', 12, 12.5); },
  estrela(g) { g.fillStyle = '#ffd23a'; const p = new Path2D(P.star); g.fill(p); g.stroke(p); },
  coracao(g) { g.fillStyle = '#e0301e'; const p = new Path2D(P.heart); g.fill(p); g.stroke(p); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(7.5, 7.5, 1.6, 1, -0.6, 0, 7); g.fill(); },
  raio(g) { g.fillStyle = '#ffd23a'; const p = new Path2D(P.bolt); g.fill(p); g.stroke(p); },
  caveira(g) { g.fillStyle = PAPER; const p = new Path2D(P.skull); g.fill(p); g.stroke(p); g.fillStyle = INK; for (const x of [8.5, 15.5]) { g.beginPath(); g.arc(x, 11.5, 2.5, 0, 7); g.fill(); } },
  olho(g) { g.fillStyle = PAPER; g.beginPath(); g.ellipse(12, 12, 7, 10, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.ellipse(12.8, 13.5, 3.6, 5.4, 0, 0, 7); g.fill();
    g.fillStyle = PAPER; g.beginPath(); g.moveTo(12.8, 13.5); g.arc(12.8, 13.5, 5.4, -1.2, -0.6); g.closePath(); g.fill(); }, // olho de torta, o recorte classico dos anos 30
  tinta(g) { g.fillStyle = '#2f5b8a'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 6 : 9 + (i % 4 ? 0 : 1.6); g.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke();
    for (const [x, y, r] of [[3, 5, 1.3], [21, 19, 1.6], [20, 4, 1]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); } },
  bigorna(g) { g.fillStyle = '#5f6468'; const p = new Path2D(P.anvil); g.fill(p); g.stroke(p); },
  sorriso(g) { g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(12, 12, 10, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; for (const x of [8.6, 15.4]) { g.beginPath(); g.ellipse(x, 9.5, 1.3, 2.3, 0, 0, 7); g.fill(); }
    g.lineWidth = 1.6; g.beginPath(); g.arc(12, 12.5, 5.5, 0.35, 2.8); g.stroke(); },
  chama(g) { g.fillStyle = '#f08a2a'; const p = new Path2D(P.flame); g.fill(p); g.stroke(p); g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(12, 17, 2.6, 3.4, 0, 0, 7); g.fill(); },
  trevo(g) { g.fillStyle = '#47b04b'; for (const [x, y] of [[12, 6.5], [7, 12], [17, 12], [12, 15]]) { g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); g.stroke(); } g.lineWidth = 1.6; g.beginPath(); g.moveTo(12, 15); g.quadraticCurveTo(13, 20, 16, 22.5); g.stroke(); },
  dado(g) { g.fillStyle = PAPER; g.beginPath(); g.roundRect(3, 3, 18, 18, 4); g.fill(); g.stroke(); g.fillStyle = INK; for (const [x, y] of [[7.5, 7.5], [12, 12], [16.5, 16.5], [16.5, 7.5], [7.5, 16.5]]) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } },
  dinamite(g) { g.fillStyle = '#c23a2c'; g.save(); g.translate(12, 13); g.rotate(-0.5); g.beginPath(); g.roundRect(-3.5, -8, 7, 16, 2); g.fill(); g.stroke(); g.fillStyle = PAPER; g.fillRect(-3.5, -3, 7, 1.6); g.fillRect(-3.5, 2, 7, 1.6); g.restore();
    g.lineWidth = 1.2; g.beginPath(); g.moveTo(15.8, 6); g.quadraticCurveTo(18, 3, 20.5, 3.5); g.stroke(); g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(21, 3.4, 1.4, 0, 7); g.fill(); },
  banana(g) { g.fillStyle = '#ffd23a'; const p = new Path2D(P.banana); g.fill(p); g.stroke(p); g.fillStyle = '#6b4a2a'; g.fillRect(2.6, 3.4, 2, 2.4); },
  coroa(g) { g.fillStyle = '#e0b13a'; const p = new Path2D(P.crown); g.fill(p); g.stroke(p); g.fillStyle = '#e0301e'; for (const x of [8, 12, 16]) { g.beginPath(); g.arc(x, 15, 1.2, 0, 7); g.fill(); } },
  alvo(g) { for (const [r, c] of [[10, '#e0301e'], [7, PAPER], [4, '#e0301e'], [1.6, PAPER]]) { g.fillStyle = c; g.beginPath(); g.arc(12, 12, r, 0, 7); g.fill(); g.stroke(); } },
  // ---- animados (14/11) ----
  bonk(g) { burst(g, '#6fc4ff', 11.6, 7.6, 20); word(g, 'BONK!', 5.6, '#ffd23a'); },
  plaft(g) { g.fillStyle = '#ff8fb0'; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, r = i % 2 ? 7 : 9.6 + (i % 3) * 0.8; g.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r * 0.86); } g.closePath(); g.fill(); g.stroke();
    for (const [x, y, r] of [[2.4, 18, 1.2], [21.4, 6, 1.4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); } word(g, 'PLAFT!', 5, PAPER); },
  bigode(g) { g.fillStyle = '#3a2412'; const p = new Path2D('M12 10C9 7.6 5 8.6 4 11.8 3.3 13.8 1.8 14 1 12.6 1 16.2 5 17.4 8.2 15.4 10 14.2 11 13.2 12 13.2 13 13.2 14 14.2 15.8 15.4 19 17.4 23 16.2 23 12.6 22.2 14 20.7 13.8 20 11.8 19 8.6 15 7.6 12 10Z'); g.fill(p); g.stroke(p);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(7, 11.6, 2, 0.7, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(17, 11.6, 2, 0.7, 0.3, 0, 7); g.fill(); },
  joinha(g) { g.fillStyle = PAPER; g.beginPath(); g.roundRect(4, 11, 12, 10, 3.2); g.fill(); g.stroke(); g.beginPath(); g.roundRect(7.2, 2.6, 5.2, 11, 2.6); g.fill(); g.stroke();
    g.beginPath(); g.roundRect(15.4, 12, 4.6, 8, 1.6); g.fill(); g.stroke(); g.lineWidth = 0.8; for (const y of [14.5, 17.5]) { g.beginPath(); g.moveTo(4.6, y); g.lineTo(9, y); g.stroke(); } g.lineWidth = 1; },
  nota(g) { g.fillStyle = '#6b3fb3'; g.beginPath(); g.moveTo(9, 6); g.lineTo(19, 3.4); g.lineTo(19, 6.6); g.lineTo(9, 9.2); g.closePath(); g.fill(); g.stroke();
    g.fillRect(8.4, 6.4, 1.6, 12); g.fillRect(18.2, 4, 1.6, 12); g.strokeRect(8.4, 6.4, 1.6, 12); g.strokeRect(18.2, 4, 1.6, 12);
    for (const [x, y] of [[6.4, 18.6], [16.2, 16.2]]) { g.beginPath(); g.ellipse(x, y, 3.3, 2.5, -0.4, 0, 7); g.fill(); g.stroke(); } },
  lua(g) { const big = new Path2D(); big.arc(11, 12.5, 9.4, 0, 7); g.fillStyle = '#ffe08a'; g.fill(big); g.stroke(big);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(16.6, 8.6, 7.6, 0, 7); g.fill(); g.restore();
    g.save(); g.clip(big); g.beginPath(); g.arc(16.6, 8.6, 7.6, 0, 7); g.stroke(); g.restore();
    g.lineWidth = 1.1; g.beginPath(); g.arc(6.4, 13.6, 1.5, 0.2, 2.9); g.stroke(); g.lineWidth = 1; g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(8, 17, 1.2, 0, 7); g.fill(); },
  sol(g) { burst(g, '#f08a2a', 11.4, 7.4, 16);
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(12, 12, 6.4, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; for (const x of [9.6, 14.4]) { g.beginPath(); g.ellipse(x, 11, 0.9, 1.5, 0, 0, 7); g.fill(); }
    g.lineWidth = 1.1; g.beginPath(); g.arc(12, 12.6, 3, 0.4, 2.7); g.stroke(); g.lineWidth = 1; },
  cafe(g) { g.lineWidth = 1.1; for (const x of [8, 11.5, 15]) { g.beginPath(); g.moveTo(x, 8); g.bezierCurveTo(x - 1.6, 6.4, x + 1.6, 4.6, x, 2.6); g.stroke(); }
    g.lineWidth = 1; g.fillStyle = '#c23a2c'; g.beginPath(); g.roundRect(4, 9, 13, 12, 2.4); g.fill(); g.stroke(); g.lineWidth = 2.4; g.beginPath(); g.arc(17.4, 14.6, 3, -1.3, 1.3); g.stroke(); g.lineWidth = 1;
    g.fillStyle = '#5a3418'; g.beginPath(); g.ellipse(10.5, 10, 5.6, 1.1, 0, 0, 7); g.fill(); g.fillStyle = PAPER; g.fillRect(4, 14, 13, 2); },
  disco(g) { g.fillStyle = '#1d1b19'; g.beginPath(); g.arc(12, 12, 10.4, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#5b5752'; g.lineWidth = 0.4; for (const r of [8.6, 7.2, 5.8]) { g.beginPath(); g.arc(12, 12, r, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(12, 12, 8, -2.4, -1.6); g.stroke(); g.strokeStyle = INK;
    g.fillStyle = '#e0301e'; g.beginPath(); g.arc(12, 12, 3.8, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ffd23a'; g.fillRect(10.4, 10.2, 3.2, 1); g.fillStyle = PAPER; g.beginPath(); g.arc(12, 12, 0.8, 0, 7); g.fill(); },
  claquete(g) { g.fillStyle = '#26231f'; g.beginPath(); g.roundRect(3, 9.4, 18, 12, 1.4); g.fill(); g.stroke(); g.fillStyle = PAPER; g.fillRect(5, 13.2, 14, 1); g.fillRect(5, 16.4, 9, 1);
    g.save(); g.translate(3, 9); g.rotate(-0.36); g.fillStyle = '#26231f'; g.beginPath(); g.rect(0, -4, 18.4, 4); g.fill(); g.stroke(); g.fillStyle = PAPER; for (let x = 1; x < 18; x += 4.2) { g.beginPath(); g.moveTo(x, -4); g.lineTo(x + 2, -4); g.lineTo(x + 0.6, 0); g.lineTo(x - 1.4, 0); g.closePath(); g.fill(); } g.restore();
    g.fillStyle = '#26231f'; g.beginPath(); g.arc(3.4, 9.2, 1, 0, 7); g.fill(); },
  cartola(g) { g.fillStyle = '#26231f'; g.beginPath(); g.ellipse(12, 18.6, 10, 2.8, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(6.6, 18.4); g.lineTo(7, 4.4); g.quadraticCurveTo(12, 2.6, 17, 4.4); g.lineTo(17.4, 18.4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e0301e'; g.beginPath(); g.moveTo(6.8, 14); g.lineTo(17.2, 14); g.lineTo(17.3, 16.8); g.lineTo(6.7, 16.8); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(8.6, 5.6, 1.4, 7.6); },
  bomba(g) { g.lineWidth = 1.2; g.beginPath(); g.moveTo(16, 6.4); g.quadraticCurveTo(18.6, 2.4, 21, 3.6); g.stroke(); g.lineWidth = 1;
    g.fillStyle = '#26231f'; g.save(); g.translate(15.2, 7.4); g.rotate(0.7); g.beginPath(); g.rect(-2.2, -1.8, 4.4, 3.6); g.fill(); g.stroke(); g.restore(); g.beginPath(); g.arc(10.6, 14, 8, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(7.4, 10.8, 2.2, 1.2, -0.7, 0, 7); g.fill(); burst(g, '#ffd23a', 2.6, 1.2, 10, 21.2, 3.4); },
  pirulito(g) { g.fillStyle = PAPER; g.beginPath(); g.roundRect(11.1, 13, 1.8, 10, 0.8); g.fill(); g.stroke(); g.fillStyle = '#ff8fb0'; g.beginPath(); g.arc(12, 9.4, 8, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = '#e0301e'; g.lineWidth = 1.5; g.beginPath(); for (let a = 0; a < 14.5; a += 0.2) { const r = 0.5 + a * 0.47; g.lineTo(12 + Math.cos(a) * r, 9.4 + Math.sin(a) * r); } g.stroke(); g.strokeStyle = INK; g.lineWidth = 1; },
  fantasma(g) { g.fillStyle = PAPER; const p = new Path2D('M4.6 21.4V11a7.4 7.4 0 0 1 14.8 0v10.4l-2.47-2-2.47 2-2.46-2-2.47 2-2.47-2z'); g.fill(p); g.stroke(p);
    g.fillStyle = INK; for (const x of [9.4, 14.6]) { g.beginPath(); g.ellipse(x, 10.6, 1.4, 2.2, 0, 0, 7); g.fill(); } g.beginPath(); g.ellipse(12, 15.2, 1.5, 1.9, 0, 0, 7); g.fill();
    g.fillStyle = '#ff8fb0'; for (const x of [7.4, 16.6]) { g.beginPath(); g.arc(x, 13.4, 1, 0, 7); g.fill(); } },
  cogumelo(g) { g.fillStyle = PAPER; g.beginPath(); g.roundRect(8, 11.6, 8, 10, 2.4); g.fill(); g.stroke();
    g.fillStyle = '#e0301e'; g.beginPath(); g.moveTo(1.6, 12.6); g.bezierCurveTo(1.6, 1.4, 22.4, 1.4, 22.4, 12.6); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = PAPER; for (const [x, y, r] of [[12, 5.4, 2], [6, 9.2, 1.7], [18, 9.2, 1.7]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } },
  planeta(g) { const ring = (a0, a1) => { g.save(); g.translate(12, 12.4); g.rotate(-0.38); g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 11, 3.4, 0, a0, a1); g.stroke(); g.strokeStyle = '#ffd23a'; g.lineWidth = 1.6; g.stroke(); g.restore(); };
    ring(Math.PI, Math.PI * 2); g.fillStyle = '#6fc4ff'; g.beginPath(); g.arc(12, 12.4, 6.8, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(9.6, 9.8, 2, 1.1, -0.6, 0, 7); g.fill(); ring(0, Math.PI);
    for (const [x, y] of [[3, 4], [20.6, 20], [21, 5]]) burst(g, '#ffd23a', 1.6, 0.6, 8, x, y); },
};
// estrela de pontas (POW, BONK, faisca) e palavra de gibi no meio
function burst(g, col, R, r, n, cx = 12, cy = 12) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n; i++) { const a = i / n * 6.283, k = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * k, cy + Math.sin(a) * k); } g.closePath(); g.fill(); g.stroke(); }
function word(g, txt, px, col) { g.fillStyle = col; g.font = `400 ${px}px Bowlby One, Grandstander, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 1.1; g.strokeText(txt, 12, 12.5); g.fillText(txt, 12, 12.5); g.lineWidth = 1; }

// canvas do adesivo: arte + contorno preto + borda branca de recorte (silhueta engordada em volta)
const CACHE = new Map();
export function stickerCanvas(id, S = 256) {
  const key = id + S; if (CACHE.has(key)) return CACHE.get(key);
  const art = document.createElement('canvas'); art.width = art.height = S; const a = art.getContext('2d');
  a.save(); a.translate(S * 0.12, S * 0.12); a.scale(S * 0.76 / 24, S * 0.76 / 24); a.strokeStyle = INK; a.lineWidth = 1; a.lineJoin = 'round'; a.lineCap = 'round'; (ART[id] || ART.estrela)(a); a.restore();
  const sil = (col) => { const c = document.createElement('canvas'); c.width = c.height = S; const q = c.getContext('2d'); q.drawImage(art, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, S, S); return c; };
  const out = document.createElement('canvas'); out.width = out.height = S; const o = out.getContext('2d');
  const ring = (img, r) => { for (let i = 0; i < 16; i++) { const t = i / 16 * 6.283; o.drawImage(img, Math.cos(t) * r, Math.sin(t) * r); } };
  ring(sil('rgba(20,18,16,.85)'), S * 0.05); ring(sil('#ffffff'), S * 0.04); o.drawImage(art, 0, 0); // fio escuro, borda branca, arte
  CACHE.set(key, out); return out;
}
const TEX = new Map();
function stickerTex(id) {
  if (!TEX.has(id)) { const tx = new THREE.CanvasTexture(stickerCanvas(id)); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; TEX.set(id, tx); }
  return TEX.get(id);
}
export const stickerThumb = (id) => stickerCanvas(id, 96).toDataURL();

// adesivo ANIMADO (14/11): um shader so pra todos, um relogio so (uStkT, acertado no onBeforeRender de quem desenha) e uma
// textura por desenho. Modos: holo (arco-iris passando nas partes claras), shine (faixa de brilho), pulse (pulsa), hue (troca
// de cor nas partes coloridas), wobble (balanca), spin (gira), float (flutua). Fora do quadro do adesivo = transparente.
const MODES = { holo: 1, shine: 2, pulse: 3, hue: 4, wobble: 5, spin: 6, float: 7 };
const UT = { value: 0 };
const tick = () => { UT.value = performance.now() / 1000; };
const ANIM_GLSL = `
vec2 suv = vMapUv - 0.5; float st = uStkT;
#if STK_MODE == 3
suv /= 1.0 + 0.08 * sin(st * 5.0);
#elif STK_MODE == 5
{ float a = 0.2 * sin(st * 3.2); suv = mat2(cos(a), sin(a), -sin(a), cos(a)) * suv; }
#elif STK_MODE == 6
{ float a = st * 1.4; suv = mat2(cos(a), sin(a), -sin(a), cos(a)) * suv; }
#elif STK_MODE == 7
suv.y += 0.045 * sin(st * 2.6); suv.x += 0.015 * sin(st * 1.3);
#endif
suv += 0.5;
vec4 sampledDiffuseColor = texture2D(map, suv);
if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) sampledDiffuseColor.a = 0.0;
float lum = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
#if STK_MODE == 1
vec3 rb = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + (vMapUv.x + vMapUv.y) * 1.3 - st * 0.35));
sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * 0.45 + rb * 0.65, 0.6 * smoothstep(0.08, 0.35, lum));
#elif STK_MODE == 2
{ float d = abs((vMapUv.x - vMapUv.y) * 0.5 + 0.5 - (fract(st * 0.38) * 2.0 - 0.5)); sampledDiffuseColor.rgb += smoothstep(0.07, 0.0, d) * 0.75; }
#elif STK_MODE == 4
{ vec3 c = sampledDiffuseColor.rgb; float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)); float a = st * 1.5, ca = cos(a), sa = sin(a);
  vec3 k = vec3(0.57735); vec3 rot = c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
  sampledDiffuseColor.rgb = mix(c, rot, smoothstep(0.12, 0.3, mx - mn)); }
#endif
diffuseColor *= sampledDiffuseColor;`;
const MAT = new Map();
// material do adesivo (decalque na arma ou o cartao da Loja): parado pros 16 antigos, animado pros novos
export function stickerMat(id, opts = {}) {
  const key = id + JSON.stringify(opts);
  if (MAT.has(key)) return MAT.get(key);
  const m = new THREE.MeshBasicMaterial({ map: stickerTex(id), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false, ...opts });
  const mode = MODES[STK_ANIM[id]];
  if (mode) {
    m.defines = { STK_MODE: mode };
    m.onBeforeCompile = (sh) => { sh.uniforms.uStkT = UT; sh.fragmentShader = 'uniform float uStkT;\n' + sh.fragmentShader.replace('#include <map_fragment>', ANIM_GLSL); };
    m.customProgramCacheKey = () => 'stk' + mode;
    m.userData.anim = true;
  }
  MAT.set(key, m); return m;
}
// malha com o material do adesivo; se animado, acerta o relogio antes de desenhar
export function stickerMesh(geo, id, opts) {
  const mat = stickerMat(id, opts), mesh = new THREE.Mesh(geo, mat);
  if (mat.userData.anim) mesh.onBeforeRender = tick;
  return mesh;
}

// ---------- o que esta colado em cada arma (rr_stk: { corpo: [{ id, p, n, s, r }] }) ----------
const KEY = 'rr_stk';
const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const getStickers = (body) => (all()[body] || []).filter(s => STK_IDS.includes(s.id)).slice(0, STK_MAX);
export function setStickers(body, list) { const A = all(); A[body] = list.slice(0, STK_MAX); try { localStorage.setItem(KEY, JSON.stringify(A)); } catch { /* sem storage */ } }

// pecas da arma que recebem adesivo: malha opaca de verdade (fora fio, mira, laser, chaveiro, contador)
// tamanho da arma so pelas pecas de verdade (o feixe do laser tem metros na partida e inflava tudo)
function gunSize(T) { const b = new THREE.Box3(); for (const o of T) b.expandByObject(o); const v = b.getSize(new THREE.Vector3()); return Math.max(v.x, v.y, v.z) || 1; }
function targets(gun) { const out = []; gun.traverse(o => { if (o.isMesh && o.geometry && !o.userData.noFx && !o.userData.stk && !o.material?.transparent && o.material?.side !== THREE.BackSide && !o.isSkinnedMesh) out.push(o); }); return out; }
// raio dos dois lados: arma espelhada (escala negativa em algum pai) inverte o lado das faces pro raio do three e ele nao acertava nada
function cast(rc, T) { const sides = T.map(o => o.material.side); for (const o of T) o.material.side = THREE.DoubleSide; const h = rc.intersectObjects(T, false); T.forEach((o, i) => { o.material.side = sides[i]; }); return h; }
const ray = new THREE.Raycaster(), V = new THREE.Vector3(), N = new THREE.Vector3(), M4 = new THREE.Matrix4(), E = new THREE.Euler(), Q = new THREE.Quaternion(), Z = new THREE.Vector3(0, 0, 1);
// raio vindo de fora (a camera do Arsenal): ponto e normal na pele da arma, no espaco da arma
export function pickOnGun(gun, raycaster) {
  const h = cast(raycaster, targets(gun))[0]; if (!h) return null;
  N.copy(h.face.normal).transformDirection(h.object.matrixWorld);
  const p = gun.worldToLocal(h.point.clone()), n = N.clone().transformDirection(M4.copy(gun.matrixWorld).invert()).normalize();
  return { p: p.toArray().map(v => +v.toFixed(4)), n: n.toArray().map(v => +v.toFixed(3)) };
}
// cola os adesivos salvos: acha a peca no ponto (raio pela normal) e projeta o decalque nela; fica filho da arma
export function applyStickers(gun, list) {
  if (!gun) return;
  for (const m of gun.userData.stkMeshes || []) { m.removeFromParent(); m.geometry.dispose(); }
  gun.userData.stkMeshes = [];
  if (!list?.length) return;
  gun.updateWorldMatrix(true, true);
  const T = targets(gun), L = gunSize(T);
  const inv = M4.copy(gun.matrixWorld).invert().clone();
  for (const s of list) {
    const pw = new THREE.Vector3(...s.p).applyMatrix4(gun.matrixWorld), nw = new THREE.Vector3(...s.n).transformDirection(gun.matrixWorld).normalize();
    ray.set(pw.clone().addScaledVector(nw, L * 0.05), nw.clone().negate()); ray.far = L * 0.2;
    const h = cast(ray, T)[0]; if (!h) continue;
    Q.setFromUnitVectors(Z, nw); E.setFromQuaternion(Q); const e = new THREE.Euler().setFromQuaternion(Q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, s.r || 0)));
    const sz = L * (s.s || 0.12), geo = new DecalGeometry(h.object, h.point, e, new THREE.Vector3(sz, sz, sz * 1.2));
    geo.applyMatrix4(inv); // decalque nasce no mundo: passa pro espaco da arma (segue a arma quando ela anda)
    const mesh = stickerMesh(geo, s.id);
    mesh.userData.noFx = true; mesh.userData.stk = true; mesh.renderOrder = 2;
    gun.add(mesh); gun.userData.stkMeshes.push(mesh);
  }
}

// setinhas do Arsenal (13/11, pedido dele): empurra o adesivo pela pele da arma. dz = ao longo da arma, dy = altura (fracao do tamanho)
export function nudgeOnGun(gun, st, dz, dy) {
  gun.updateWorldMatrix(true, true);
  const T = targets(gun), L = gunSize(T);
  const n = new THREE.Vector3(...st.n), p = new THREE.Vector3(...st.p).add(new THREE.Vector3(0, dy * L, dz * L));
  const pw = p.clone().addScaledVector(n, L * 0.15).applyMatrix4(gun.matrixWorld), nw = n.clone().transformDirection(gun.matrixWorld).normalize();
  ray.set(pw, nw.negate()); ray.far = L * 0.4;
  const h = cast(ray, T)[0]; if (!h) return null; // saiu da arma: fica onde estava
  N.copy(h.face.normal).transformDirection(h.object.matrixWorld);
  return { p: gun.worldToLocal(h.point.clone()).toArray().map(v => +v.toFixed(4)), n: N.clone().transformDirection(M4.copy(gun.matrixWorld).invert()).normalize().toArray().map(v => +v.toFixed(3)) };
}
