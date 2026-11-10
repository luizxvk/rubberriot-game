// Arma na mao em primeira pessoa (pose COD). Cena propria, desenhada por cima.
// Estados: quadril, mira (ADS), corrida (arma cruzada pra baixo), disparada (arma
// erguida no ombro com o braco bombeando), recarga e troca.
import * as THREE from 'three';
import { umbrellaMesh } from './fieldview.js';
import { ink, toon, PAL, wordTexture } from './toon.js';
import { Hose } from './character.js';
import { buildGun } from './arsenal.js';
import { attachCharm, tickCharm } from './charms.js';
import { ovenTex } from './looks3d.js';
import { measureHands, buildWrap, wristPose } from './handwrap.js';

const VM_SCALE = 0.8;
// luva em volta do cabo: X da luva = lamina, Z = pro ombro (o braco sai reto do pulso), Y fecha a base
const SHOULDER_R = new THREE.Vector3(0.38, -0.55, 0.15), SHOULDER_L = new THREE.Vector3(-0.38, -0.6, 0.05);
const ID_Q = new THREE.Quaternion(), hX = new THREE.Vector3(), hY = new THREE.Vector3(), hZ = new THREE.Vector3(), hQ = new THREE.Quaternion(), hM = new THREE.Matrix4();
function holdHilt(glove, gun, shoulder) {
  gun.getWorldQuaternion(hQ); hX.set(0, 0, -1).applyQuaternion(hQ);
  hZ.copy(shoulder).sub(glove.position); hZ.addScaledVector(hX, -hZ.dot(hX)).normalize();
  hY.crossVectors(hZ, hX);
  glove.quaternion.setFromRotationMatrix(hM.makeBasis(hX, hY, hZ));
}
// Inspecionar, um por categoria. Chave: [t 0..1, x, y, z, rx, ry, rz, maoEsqX, maoEsqY, maoEsqZ]
// (somado a pose de quadril; mao esquerda em relacao ao punho dela). Curva Catmull-Rom = fluido.
const O = [0, 0, 0, 0, 0, 0, 0, 0, 0];
// espada: ergue, vira a lamina de chapa pra camera, inclina pra olhar o fio e volta (04/11)
const SWORD_INSPECT = { dur: 3, keys: [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.18, -0.08, 0.1, 0.05, 0.6, 0.2, -0.3, 0, 0, 0],
  [0.4, -0.1, 0.12, 0.05, 0.6, 1.4, -0.3, 0, 0, 0],
  [0.62, -0.06, 0.08, 0.02, 0.2, 1.5, 0.6, 0, 0, 0],
  [0.82, 0.02, 0, 0, 0.1, 0.3, 0.1, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]] };
const INSPECTS = {
  pistol: { dur: 2.8, keys: [
    [0, ...O],
    [0.14, -0.1, 0.05, 0.08, 0.15, 0.25, 0, 0, 0, 0],
    [0.32, -0.12, 0.06, 0.08, 0.1, 1.25, -0.3, 0, 0, 0],     // lado esquerdo
    [0.48, -0.12, 0.08, 0.06, 0.55, 0.3, -1.45, 0, 0, 0],    // deita mostrando o topo
    [0.62, -0.1, 0.05, 0.08, 0.1, -0.85, 0.45, 0, 0, 0],     // lado direito
    [0.84, -0.08, 0.04, 0.06, 0.05, Math.PI * 2 - 0.4, 0.15, 0, 0, 0], // giro de cowboy (volta inteira)
    [1, 0, 0, 0, 0, Math.PI * 2, 0, 0, 0, 0]] },
  smg: { dur: 3, keys: [
    [0, ...O],
    [0.15, -0.09, 0.04, 0.06, 0.12, 0.35, -0.2, 0, 0, 0],
    [0.33, -0.1, 0.05, 0.06, 0.08, 1.1, -0.45, 0, 0, 0],     // janela de ejecao
    [0.45, -0.1, 0.05, 0.06, 0.05, 1.0, -0.4, 0.02, 0.02, 0.1], // mao puxa o ferrolho
    [0.52, -0.1, 0.04, 0.07, 0.12, 1.02, -0.4, 0, 0, 0],     // solta (tranco)
    [0.7, -0.09, 0.05, 0.06, 0.2, -0.7, 0.35, 0, 0, 0],      // outro lado
    [0.84, -0.06, 0.03, 0.04, -0.1, -0.3, 0.15, 0, 0, 0],
    [1, ...O]] },
  rifle: { dur: 3.4, keys: [
    [0, ...O],
    [0.12, -0.1, 0.05, 0.05, 0.1, 0.3, -0.15, 0, 0, 0],
    [0.3, -0.12, 0.06, 0.04, 0.05, 1.05, -0.35, 0, 0, 0],    // lado esquerdo
    [0.42, -0.1, 0.1, 0.02, 0.55, 0.6, -0.2, 0, 0, 0],       // cano pra cima
    [0.52, -0.1, 0.02, 0.04, -0.15, 0.4, -0.1, 0, -0.07, 0.05], // mao bate no pente
    [0.58, -0.1, 0.03, 0.04, -0.1, 0.38, -0.1, 0, -0.02, 0.03],
    [0.76, -0.1, 0.05, 0.05, 0.12, -0.75, 0.4, 0, 0, 0],     // lado direito
    [0.9, -0.05, 0.02, 0.03, 0.04, -0.2, 0.1, 0, 0, 0],
    [1, ...O]] },
  shotgun: { dur: 3, keys: [
    [0, ...O],
    [0.14, -0.08, 0.05, 0.05, 0.2, 0.5, -0.25, 0, 0, 0],
    [0.3, -0.1, 0.06, 0.05, 0.15, 1.0, -0.4, 0, 0, 0],
    [0.4, -0.1, 0.05, 0.08, 0.12, 0.9, -0.35, 0, 0, 0.12],   // bomba pra tras
    [0.48, -0.1, 0.05, 0.05, 0.16, 0.9, -0.35, 0, 0, 0],     // e pra frente
    [0.66, -0.08, 0.04, 0.05, 0.35, -0.55, 0.3, 0, 0, 0],    // apoia no ombro
    [0.84, -0.05, 0.03, 0.03, 0.1, -0.15, 0.1, 0, 0, 0],
    [1, ...O]] },
  sniper: { dur: 3.6, keys: [
    [0, ...O],
    [0.14, -0.06, 0.04, -0.04, 0.08, 0.25, -0.1, 0, 0, 0],
    [0.3, -0.08, 0.05, -0.08, 0.02, 0.75, -0.25, 0, 0, 0],    // lado esquerdo, longo (afastado)
    [0.44, -0.08, 0.07, -0.04, 0.12, 0.2, 0.05, 0, 0, 0],     // ergue e mostra a luneta
    [0.56, -0.06, 0.03, -0.06, 0.1, 0.05, 0.75, 0, 0, 0],     // rola pro lado direito (girar jogaria a coronha na cara)
    [0.64, -0.06, 0.03, -0.06, 0.1, 0.05, 0.75, 0.05, 0.06, 0.08], // mao no ferrolho
    [0.72, -0.06, 0.03, -0.06, 0.12, 0.05, 0.72, 0, 0, 0],
    [0.88, -0.03, 0.02, -0.03, 0.05, 0.02, 0.2, 0, 0, 0],
    [1, ...O]] },
  melee: { dur: 2.6, keys: [
    [0, ...O],
    [0.16, -0.12, 0.08, 0.06, 0.4, 0.3, -0.2, 0, 0, 0],
    [0.34, -0.12, 0.1, 0.06, 0.3, 1.3, -0.4, 0, 0, 0],               // lado da lamina
    [0.5, -0.12, 0.1, 0.06, 0.3, 1.3 + Math.PI, 0.4, 0, 0, 0],       // vira na mao
    [0.7, -0.1, 0.06, 0.05, 0.5, Math.PI * 2 - 0.2, 0.2, 0, 0, 0],   // giro de volta
    [1, 0, 0, 0, 0, Math.PI * 2, 0, 0, 0, 0]] },
  minigun: { dur: 2.6, keys: [
    [0, ...O],
    [0.2, -0.04, 0.05, 0.03, 0.25, 0.25, -0.1, 0, 0, 0],     // ergue (pesado)
    [0.45, -0.06, 0.04, 0.03, 0.15, 0.7, -0.25, 0, 0, 0],
    [0.7, -0.05, 0.03, 0.03, 0.1, -0.35, 0.2, 0, 0, 0],
    [1, ...O]] },
};
// Catmull-Rom nas chaves: posicao e mao sem tranco entre os passos
// Inspect do akimbo (30/10): as duas mostram a lateral, a direita gira no dedo (giro de caubói), depois a
// esquerda, as duas viram pro outro lado e voltam. Valores: direita [x,y,z,rx,ry,rz] + esquerda [x,y,z,rx,ry,rz].
const AK0 = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const AKIMBO_INSPECT = { dur: 3.2, spinR: [0.27, 0.46], spinL: [0.5, 0.69], keys: [
  [0, ...AK0],
  [0.12, 0.01, 0.03, 0, 0.15, 0.1, -0.6, -0.01, 0.03, 0, 0.15, -0.1, 0.6],      // as duas deitam pra dentro
  [0.26, 0.02, 0.07, 0.02, 0.3, 0, -0.15, -0.01, 0.03, 0, 0.15, -0.1, 0.6],     // direita sobe pro giro
  [0.47, 0.02, 0.07, 0.02, 0.3, 0, -0.15, -0.02, 0.07, 0.02, 0.3, 0, 0.15],    // esquerda sobe
  [0.56, 0, 0.02, 0, 0.08, 0, -0.08, -0.02, 0.07, 0.02, 0.3, 0, 0.15],
  [0.7, 0, 0.02, 0, 0.08, 0, -0.08, 0, 0.02, 0, 0.08, 0, 0.08],
  [0.8, -0.03, 0.04, 0, 0.2, 0.15, 0.55, 0.03, 0.04, 0, 0.2, -0.15, -0.55],   // mostram o outro lado
  [0.92, -0.01, 0.01, 0, 0.05, 0.04, 0.12, 0.01, 0.01, 0, 0.05, -0.04, -0.12],
  [1, ...AK0]] };
// Inspect do akimbo comprido (Cuspideira/Espirro): sem giro no dedo (arma grande); as duas deitam pra dentro,
// sobem mostrando o lado de fora, cruzam um instante e voltam
const AKIMBO_LONG_INSPECT = { dur: 3.0, spinR: [9, 10], spinL: [9, 10], keys: [ // giro fora do tempo = nunca gira
  [0, ...AK0],
  [0.14, 0.01, 0.03, 0, 0.12, 0.1, -0.55, -0.01, 0.03, 0, 0.12, -0.1, 0.55],
  [0.36, 0.02, 0.06, 0.02, 0.25, -0.25, -0.2, -0.02, 0.06, 0.02, 0.25, 0.25, 0.2],
  [0.56, -0.02, 0.05, 0, 0.18, 0.2, 0.5, 0.02, 0.05, 0, 0.18, -0.2, -0.5],
  [0.78, -0.04, 0.02, 0.02, 0.1, 0.3, 0.35, 0.04, 0.02, 0.02, 0.1, -0.3, -0.35],
  [0.92, -0.01, 0.01, 0, 0.04, 0.05, 0.08, 0.01, 0.01, 0, 0.04, -0.05, -0.08],
  [1, ...AK0]] };
// Inspect do revolver (Bang-Bang): deita mostrando o tambor, a esquerda da um tapa e ele gira 3 voltas,
// sobe e da um giro de cauboi no dedo. Mesmo formato do INSPECTS (x, y, z, rx, ry, rz, mao esquerda x, y, z).
const REV_INSPECT = { dur: 3.0, spinR: [0.67, 0.86], keys: [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.14, -0.04, 0.04, 0.02, 0.1, 0.2, -0.9, 0, 0, 0],
  [0.3, -0.05, 0.05, 0.02, 0.12, 0.25, -1.1, 0.05, 0.05, 0.05],
  [0.6, -0.05, 0.05, 0.02, 0.12, 0.25, -1.1, 0, 0, 0],
  [0.66, 0, 0.07, 0, 0.32, 0, -0.1, 0, 0, 0],
  [0.87, 0, 0.04, 0, 0.12, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]] };
// Serrada (03/11): ergue, tomba de lado mostrando os dois canos, a esquerda da um tapa na coronha que faz ela dar
// uma cambalhota pra frente (giro no dedo), e volta encaixando com um tranco
const SAWED_INSPECT = { dur: 3.0, spinR: [0.55, 0.78], keys: [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.14, -0.06, 0.06, 0.04, 0.35, 0.3, -0.25, 0, 0, 0],      // ergue apontando pra cima
  [0.3, -0.1, 0.05, 0.06, 0.1, 1.2, -0.4, 0, 0, 0],          // tomba: os dois canos de lado
  [0.42, -0.1, 0.04, 0.06, 0.05, 1.15, -0.4, 0.06, 0.04, 0.06], // tapa da esquerda na coronha
  [0.52, -0.02, 0.06, 0.02, 0.25, 0.1, -0.05, 0, 0, 0],      // sobe pra cambalhota
  [0.8, -0.02, 0.05, 0.02, 0.2, 0, 0, 0, 0, 0],
  [0.88, 0, -0.02, 0.03, -0.12, 0, 0, 0, 0, 0],               // encaixa com tranco
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]] };
// Serrada no akimbo: as duas cruzam na frente mostrando os canos, uma de cada vez da cambalhota e batem as coronhas
const SAWED_AKIMBO_INSPECT = { dur: 3.4, spinR: [0.3, 0.48], spinL: [0.52, 0.7], keys: [
  [0, ...AK0],
  [0.14, 0.03, 0.04, 0, 0.2, -0.35, -0.5, -0.03, 0.04, 0, 0.2, 0.35, 0.5],     // cruzam: canos de lado
  [0.28, 0.02, 0.07, 0.02, 0.35, 0, -0.1, -0.03, 0.04, 0, 0.2, 0.35, 0.5],     // direita sobe pra cambalhota
  [0.5, 0.01, 0.03, 0, 0.1, 0, 0, -0.02, 0.07, 0.02, 0.35, 0, 0.1],           // esquerda sobe
  [0.72, 0, 0.02, 0, 0.08, 0, 0, 0, 0.02, 0, 0.08, 0, 0],
  [0.84, 0.04, 0, 0.01, 0.05, 0.25, 0.2, -0.04, 0, 0.01, 0.05, -0.25, -0.2], // batem as coronhas
  [0.92, 0.01, 0.01, 0, 0.02, 0.05, 0.04, -0.01, 0.01, 0, 0.02, -0.05, -0.04],
  [1, ...AK0]] };
// giro no dedo: 0 -> 2pi com aceleracao e freio suaves dentro da janela [a, b] do inspect
const spinAt = (p, [a, b]) => { const u = THREE.MathUtils.clamp((p - a) / (b - a), 0, 1); return (u < 1 && u > 0) ? (u * u * u * (u * (u * 6 - 15) + 10)) * Math.PI * 2 : 0; };

function inspectPose(k, p) {
  let i = 0;
  while (i < k.length - 2 && p > k[i + 1][0]) i++;
  const a = k[Math.max(0, i - 1)], b = k[i], c = k[i + 1], d = k[Math.min(k.length - 1, i + 2)];
  const u = THREE.MathUtils.clamp((p - b[0]) / (c[0] - b[0] || 1), 0, 1);
  const e = u * u * (3 - 2 * u); // segura um tico em cada pose
  const out = [];
  for (let j = 1; j < b.length; j++) {
    const p0 = a[j], p1 = b[j], p2 = c[j], p3 = d[j];
    out.push(0.5 * ((2 * p1) + (-p0 + p2) * e + (2 * p0 - 5 * p1 + 4 * p2 - p3) * e * e + (-p0 + 3 * p1 - 3 * p2 + p3) * e * e * e));
  }
  return out;
}
// estrela de tinta (arma de desenho, 06/11): no lugar do clarao, estrela amarela de traco grosso com pingos voando
let inkStar = null;
function inkStarTex() {
  if (inkStar) return inkStar;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), cx = n / 2, cy = n / 2;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const star = (R, r, fill) => {
    g.beginPath();
    for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
    g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = n * 0.035; g.strokeStyle = '#141210'; g.stroke();
  };
  star(n * 0.4, n * 0.17, '#ffd23a');
  star(n * 0.2, n * 0.085, '#fff6d8');
  for (const [a, d, r] of [[0.3, 0.44, 0.035], [1.9, 0.42, 0.028], [3.4, 0.45, 0.04], [4.6, 0.4, 0.024], [5.6, 0.46, 0.03]]) {
    g.beginPath(); g.arc(cx + Math.cos(a) * n * d, cy + Math.sin(a) * n * d, n * r, 0, Math.PI * 2);
    g.fillStyle = '#ffd23a'; g.fill(); g.lineWidth = n * 0.018; g.strokeStyle = '#141210'; g.stroke();
  }
  inkStar = new THREE.CanvasTexture(c); inkStar.colorSpace = THREE.SRGBColorSpace;
  return inkStar;
}
const STREAK_DUR = 1.8; // chamar a sequencia: a arma sai de cena, o objeto aparece e a arma volta (01/11)
const STIM_DUR = 1.15;
const GRAB_DUR = 0.7;
// seringa de desenho: tubo de vidro com o liquido verde, agulha, embolo e as abas de apoiar os dedos
function syringeMesh() {
  const g = new THREE.Group();
  const tube = ink(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12), 0xd8e6ea, 0.006); g.add(tube);
  const juice = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.11, 10), new THREE.MeshBasicMaterial({ color: 0x5ee86a }));
  juice.position.y = 0; g.add(juice); g.userData.juice = juice;
  const tip = ink(new THREE.CylinderGeometry(0.008, 0.022, 0.02, 10), PAL.ink, 0.004); tip.position.y = -0.075; g.add(tip);
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07, 6), new THREE.MeshBasicMaterial({ color: 0xcfd4d6 })); needle.position.y = -0.12; g.add(needle);
  const wings = ink(new THREE.BoxGeometry(0.075, 0.008, 0.02), PAL.ink, 0.004); wings.position.y = 0.066; g.add(wings);
  const plunger = new THREE.Group(); plunger.position.y = 0.07; g.add(plunger); g.userData.plunger = plunger;
  const rod = ink(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), PAL.ink, 0.003); rod.position.y = 0.03; plunger.add(rod);
  const cap = ink(new THREE.CylinderGeometry(0.02, 0.02, 0.008, 12), PAL.red || 0xa83a2c, 0.004); cap.position.y = 0.062; plunger.add(cap);
  return g;
}
// golpe com a faca na mao (BO3): prepara a direita, corta atravessando pra esquerda e volta.
// Chave: [t, x, y, z, rx, ry, rz] somado a pose da faca.
const SLASH = [
  [0, 0, 0, 0, 0, 0, 0],
  [0.2, 0.05, 0.05, 0.05, 0.15, -0.55, -0.35],
  [0.48, -0.26, -0.03, -0.14, -0.1, 0.85, 0.55],
  [0.66, -0.3, -0.07, -0.08, -0.15, 0.95, 0.6],
  [1, 0, 0, 0, 0, 0, 0],
];
// espada (04/11, pedido dele, estilo BO3): arco largo na frente, alternando o lado a cada golpe (combo).
// Mesmo formato do SLASH: [t, x, y, z, rx, ry, rz] somados ao braco.
const SWORD_SLASH = [
  [[0, 0, 0, 0, 0, 0, 0], [0.18, 0.18, 0.1, 0.05, 0.25, -0.75, -0.7], [0.5, -0.32, -0.06, -0.12, -0.05, 0.95, 0.65], [0.7, -0.36, -0.1, -0.05, -0.1, 1.05, 0.7], [1, 0, 0, 0, 0, 0, 0]],
  [[0, 0, 0, 0, 0, 0, 0], [0.18, -0.2, 0.12, 0.05, 0.25, 0.8, 0.7], [0.5, 0.3, -0.08, -0.12, -0.05, -0.9, -0.6], [0.7, 0.34, -0.1, -0.05, -0.1, -1.0, -0.65], [1, 0, 0, 0, 0, 0, 0]],
];
// faca rapida com arma na mao: a lamina entra pela direita, corta na frente e sai baixa a esquerda.
// Chave: [t, x, y, z, rx, ry, rz] da faca em relacao a camera.
const QUICK = [
  [0, 0.42, -0.34, -0.58, -0.1, 0.7, -0.5],
  [0.22, 0.3, -0.14, -0.62, -0.05, 0.95, -0.35],
  [0.5, -0.04, -0.18, -0.64, 0.05, 1.3, -0.15],
  [0.72, -0.2, -0.28, -0.6, 0.1, 1.45, -0.05],
  [1, -0.3, -0.48, -0.52, 0.15, 1.55, 0.05],
];
// objetos dos chamados de sequencia (feitos no codigo, traco de tinta igual o resto)
function makeProp(kind) {
  const g = new THREE.Group(), hand = new THREE.Object3D();
  if (kind === 'uav') {
    // luneta de pirata: 3 gomos de latao
    [[0.022, 0.13, 0], [0.018, 0.1, -0.1], [0.014, 0.08, -0.18]].forEach(([r, l, z]) => {
      const c = ink(new THREE.CylinderGeometry(r, r, l, 12), 0xb8862b, 0.004); c.rotation.x = Math.PI / 2; c.position.z = z; g.add(c);
    });
    hand.position.set(0, -0.03, 0.06);
  } else if (kind === 'anvil') {
    // detonador de TNT: caixa de madeira + pistao em T
    const box = ink(new THREE.BoxGeometry(0.12, 0.08, 0.1), 0x8a4b22, 0.004); g.add(box);
    const lbl = ink(new THREE.BoxGeometry(0.07, 0.03, 0.002), 0xece9e1, 0.002); lbl.position.set(0, 0.0, 0.051); g.add(lbl);
    const pl = new THREE.Group(); pl.position.y = 0.09; pl.userData.y0 = 0.09;
    const rod = ink(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 8), 0x2a2724, 0.003); pl.add(rod);
    const bar = ink(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8), 0x2a2724, 0.003); bar.rotation.z = Math.PI / 2; bar.position.y = 0.045; pl.add(bar);
    g.add(pl); g.userData.plunger = pl;
    hand.position.set(0, 0.16, 0); pl.add(hand); hand.position.set(0, 0.06, 0);
  } else if (kind === 'nuke') {
    // Torta Atomica: forma de torta com creme e um botao vermelho enorme no meio (aperta igual a campainha)
    const tin = ink(new THREE.CylinderGeometry(0.075, 0.06, 0.03, 18), 0xbdb7ac, 0.004); g.add(tin);
    const cream = ink(new THREE.SphereGeometry(0.07, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf4efe2, 0.004); cream.scale.y = 0.45; cream.position.y = 0.014; g.add(cream);
    const bt = ink(new THREE.CylinderGeometry(0.022, 0.024, 0.02, 14), 0xa83a2c, 0.003); bt.position.y = 0.05; bt.userData.y0 = 0.05; g.add(bt);
    g.userData.button = bt;
    hand.position.set(0, 0.1, 0); bt.add(hand); hand.position.set(0, 0.03, 0);
  } else {
    // campainha de balcao: cupula dourada + botao
    const dome = ink(new THREE.SphereGeometry(0.05, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8b24a, 0.004); g.add(dome);
    const base = ink(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16), 0x2a2724, 0.003); base.position.y = -0.008; g.add(base);
    const bt = ink(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8), 0x2a2724, 0.003); bt.position.y = 0.06; bt.userData.y0 = 0.06; g.add(bt);
    g.userData.button = bt;
    hand.position.set(0, 0.11, 0); bt.add(hand); hand.position.set(0, 0.04, 0);
  }
  if (!hand.parent) g.add(hand);
  g.userData.hand = hand;
  g.visible = false;
  return g;
}
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6e6a63, 1.5));
    const d = new THREE.DirectionalLight(0xffffff, 2); d.position.set(1, 2, 1); this.scene.add(d);
    this.rig = new THREE.Group();     // pose geral
    this.scene.add(this.rig);
    this.holder = new THREE.Group();  // arma atual
    this.rig.add(this.holder);
    this.armR = new Hose(0.042, PAL.ink, 0.012);
    this.armL = new Hose(0.042, PAL.ink, 0.012);
    this.scene.add(this.armR.mesh, this.armL.mesh);
    // luva com duas maos: aberta (segurando arma de fogo) e fechada (punho: soco e cabo da faca)
    // luva estilo Mickey (01/11, pedido dele): mao mais quadrada (menos bola), 3 dedos gordos + polegar = 4,
    // 3 costuras pretas nas costas da mao e punho largo em sino com a borda dobrada
    const stitch = (parent, xs, y, z, len, rx = 0) => { for (const x of xs) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.003, len), new THREE.MeshBasicMaterial({ color: PAL.ink })); l.position.set(x, y, z); l.rotation.x = rx; parent.add(l); } };
    const glove = () => {
      const g = new THREE.Group(), open = new THREE.Group(), fist = new THREE.Group();
      const palm = ink(new THREE.SphereGeometry(0.05, 12, 10), PAL.white, 0.008);
      palm.scale.set(1.12, 0.62, 1.1); open.add(palm);
      for (let i = 0; i < 3; i++) {
        const f = ink(new THREE.CapsuleGeometry(0.019, 0.05, 3, 8), PAL.white, 0.006);
        f.position.set(-0.036 + i * 0.036, 0.008, -0.062); f.rotation.x = -1.25; f.userData.finger = true;
        open.add(f);
      }
      const th = ink(new THREE.CapsuleGeometry(0.018, 0.035, 3, 8), PAL.white, 0.006);
      th.position.set(0.05, 0.018, -0.018); th.rotation.z = -0.85; th.userData.finger = true; open.add(th);
      stitch(open, [-0.018, 0, 0.018], 0.031, 0.008, 0.045);
      // punho fechado: bloco arredondado, 3 nos grandes na frente e o polegar cruzando por baixo
      const ball = ink(new THREE.SphereGeometry(0.052, 12, 10), PAL.white, 0.008);
      ball.scale.set(1.12, 0.86, 1.05); fist.add(ball);
      for (let i = 0; i < 3; i++) {
        const k = ink(new THREE.CapsuleGeometry(0.021, 0.024, 3, 8), PAL.white, 0.007);
        k.position.set(-0.034 + i * 0.034, 0.026, -0.044); k.rotation.x = 0.9; // crista dos nos em cima (a camera ve o punho por tras)
        fist.add(k);
      }
      const tf = ink(new THREE.CapsuleGeometry(0.016, 0.04, 3, 6), PAL.white, 0.006);
      tf.position.set(-0.035, -0.005, -0.035); tf.rotation.z = Math.PI / 2; tf.rotation.y = 0.5; fist.add(tf); // polegar por dentro, dobrado sobre os dedos
      stitch(fist, [-0.017, 0.017], 0.044, -0.05, 0.03, 0.9); // riscos entre os nos
      stitch(fist, [-0.018, 0, 0.018], 0.044, 0.01, 0.04);    // costuras nas costas da mao
      // punho em sino: estreito no pulso, abre pro braco, com a borda enrolada
      const cuff = ink(new THREE.CylinderGeometry(0.056, 0.04, 0.045, 14), PAL.white, 0.008);
      cuff.position.set(0, -0.008, 0.058); cuff.rotation.x = Math.PI / 2; g.add(cuff);
      const rim = ink(new THREE.TorusGeometry(0.054, 0.008, 6, 16), PAL.white, 0.006);
      rim.position.set(0, -0.008, 0.08); cuff.userData.rim = rim; g.add(rim);
      // segurando cabo de espada (04/11, pedido dele): os dedos dao a volta no cabo. O cabo passa pela origem da luva, no
      // eixo X (polegar pro lado da lamina); o pulso fica no +Z, entao a palma encosta no cabo por tras
      const grip = new THREE.Group();
      const back = ink(new THREE.SphereGeometry(0.05, 12, 10), PAL.white, 0.008); back.scale.set(1.12, 0.86, 0.72); back.position.z = 0.05; grip.add(back);
      for (let i = 0; i < 3; i++) {
        const ge = new THREE.TorusGeometry(0.034, 0.0165, 8, 20, Math.PI * 1.6); ge.rotateZ(-Math.PI * 0.8);
        const f = ink(ge, PAL.white, 0.006); f.rotation.y = Math.PI / 2; f.position.x = -0.036 + i * 0.036; f.userData.finger = true; grip.add(f);
      }
      const gth = ink(new THREE.CapsuleGeometry(0.017, 0.04, 3, 8), PAL.white, 0.006); gth.rotation.z = Math.PI / 2; gth.position.set(0.058, 0.03, 0.006); gth.userData.finger = true; grip.add(gth);
      const mitt = ink(new THREE.CylinderGeometry(0.05, 0.05, 0.105, 14), PAL.white, 0.007); mitt.rotation.z = Math.PI / 2; mitt.userData.mitt = true; mitt.visible = false; grip.add(mitt); // luva sem dedos: um bloco so em volta do cabo
      stitch(grip, [-0.018, 0, 0.018], 0.036, 0.05, 0.04);
      grip.visible = false;
      fist.visible = false;
      g.add(open, fist, grip); g.userData = { open, fist, cuff, grip };
      return g;
    };
    this.gloveR = glove(); this.gloveL = glove();
    this.gloveR.scale.setScalar(0.72); this.gloveL.scale.setScalar(0.72);
    this.scene.add(this.gloveR, this.gloveL);

    // clarao respeita a profundidade: nunca passa por cima da propria arma
    const flashMat = new THREE.SpriteMaterial({ map: wordTexture('', { burst: true }), transparent: true, depthTest: true, depthWrite: false });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.renderOrder = 2;
    this.flash.visible = false;
    this.flashMap = flashMat.map;
    this.scene.add(this.flash);
    this.bel = 0; this.belV = 0; this.magS = 1; this.magV = 0; // arma de desenho: fole do corpo e pente de borracha (molas)

    this.s = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
    this.kick = 0; this.kickR = 0; this.swayX = 0; this.swayY = 0; this.land = 0;
    this.switchT = 0; this.throwT = 0; this.reloadT = 0; this.reloadDur = 1; this.flashT = 0; this.inspectT = 0; this.swingT = 0; this.boltT = 0; this.streakT = 0;
    this.bobT = 0; this.ads = 0; this.squash = 0;
    this.gun = null; this.wpn = null;
  }

  // mira que vale agora: a de 45 graus quando ligada, senao a principal
  sight() { const u = this.gun?.userData; return (this.canted && u?.canted) || u?.scope || null; }
  setWeapon(id, loadout, instant = false) {
    this.holder.clear(); this.canted = false;
    this.gun = buildGun(id, loadout);
    if (id !== 'melee' && id !== 'fists') attachCharm(this.gun, this.charm);
    // mao que segura (06/11): mede a arma ainda sem escala e monta os dedos contornando cabo e guarda-mao
    this.wrapR = this.wrapL = this.wrapAK = null;
    // 08/11 (pedido dele, referencia Krunker): sem casca moldada na malha (abria buraco e envolvia a coronha inteira). As duas luvas FECHADAS vao nos pontos de pega da arma
    const USE_WRAP = false;
    const handKey = id + '|' + [loadout?.body, loadout?.handle, loadout?.charger, loadout?.ws, loadout?.scope, loadout?.muzzle].join('|');
    if (USE_WRAP && id !== 'melee' && id !== 'fists') {
      const ak = loadout?.handle === 'akimbo';
      const H = measureHands(this.gun, { key: handKey, leftKind: id === 'pistol' || ak ? null : loadout?.handle ? 'grip' : 'fore' });
      this.wrapR = buildWrap(this.gun, H.R); this.wrapL = buildWrap(this.gun, H.L);
    }
    this.gun.scale.setScalar(VM_SCALE);
    // faca em pegada invertida (COD): lamina sai por baixo do punho, deitada apontando pro centro
    // espada (04/11): pegada normal, lamina pra cima e pra frente (estilo BO3)
    if (id === 'melee') { if (this.gun.userData.flipVm) this.gun.userData.inner.rotation.z = Math.PI; /* katana: fio pra frente na 1a pessoa (04/11) */ if (this.gun.userData.sword) this.gun.rotation.set(1.05, 0.1, -0.22); else this.gun.rotation.set(-0.75, 0, -1.35, 'ZXY'); }
    this.holder.add(this.gun);
    if (!instant) this.gun.userData.saber?.ignite(); // sabre: a lamina sobe do cabo ao equipar
    // akimbo: segunda pistola na mao esquerda, espelhando a pose da direita
    if (this.akimbo) { this.scene.remove(this.akimbo); this.akimbo = null; this.gun2 = null; }
    if (loadout?.handle === 'akimbo' && id !== 'melee') { // pistola, Cuspideira e Espirro
      this.gun2 = buildGun(id, { ...loadout, handle: null });
      if (USE_WRAP) this.wrapAK = buildWrap(this.gun2, measureHands(this.gun2, { key: handKey + '|ak', akimboLeft: true }).AK); // esquerda segura a 2a de verdade
      this.gun2.scale.setScalar(VM_SCALE);
      this.akimbo = new THREE.Group(); this.akimbo.add(this.gun2); this.scene.add(this.akimbo);
      this.kick2 = 0; this.akSide = false;
    }
    this.wpn = id;
    const tg = this.gun.userData.toon; this.bel = this.belV = this.magV = 0; this.magS = 1;
    this.flash.material.map = tg ? inkStarTex() : this.flashMap; this.flash.material.needsUpdate = true;
    this.isBp = !!loadout?.bp; // variante de elite: corre com a arma levantada
    this.switchT = instant ? 0 : 0.32;
  }

  fire(kick) {
    // akimbo: a mao da vez. PC/controle escolhem (forceSide: gatilho esquerdo = arma esquerda); no toque alterna
    const next = this.akimbo ? (this.forceSide ? this.forceSide === 'L' : !this.akSide) : false;
    this.forceSide = null;
    // revolver: o tambor da 1/6 de volta e o cao bate (na mao da vez, no akimbo)
    const rv = (this.akimbo && next ? this.gun2 : this.gun)?.userData;
    if (rv?.drum) { rv.drumA = (rv.drumA || 0) + Math.PI / 3; rv.hamT = 1; }
    if (this.akimbo) { this.akSide = next; if (next) { this.kick2 += kick * 1.6; this.flashT = 0.05; return; } }
    this.kick += kick * 1.6;
    this.kickR += kick * 3.2 + Math.random() * kick;
    this.flashT = 0.05;
    this.squash = 1;
    if (this.gun?.userData.toon) { this.belV -= 10; this.flashT = 0.07; } // fole: o corpo fecha no tiro e a mola abre de volta passando do ponto
  }

  reload(dur) { this.reloadT = dur; this.reloadDur = dur; }
  throwNade() { this.throwT = 0.5; }
  // estimulante (01/11): a mao esquerda sobe com a seringa, crava, o liquido desce e ela some (estilo COD)
  stim() { this.stimT = STIM_DUR; }
  // caixa de municao (05/11): o braco esquerdo estica ate o chao, pega e volta; a arma so abaixa um pouco
  grab() { this.grabT = GRAB_DUR; }
  // golpe de lamina: com arma na mao = faca rapida (a arma desce e a lamina entra pela direita);
  // com a lamina na mao = ela mesma corta
  meleeSwing(dur, lo) {
    this.swingDur = Math.max(0.32, Math.min(0.5, dur * 0.6)); this.swingT = this.swingDur; this.inspectT = 0;
    this.swingQuick = this.wpn !== 'melee' && this.wpn !== 'fists';
    if (this.wpn === 'fists') this.punchLeft = !this.punchLeft; // jab alternado
    if (this.gun?.userData.sword) this.swordSide = (this.swordSide || 0) ^ 1; // espada: combo, um golpe pra cada lado
    if (!this.swingQuick) return;
    const key = JSON.stringify(lo || {});
    if (this.knifeKey !== key) {
      if (this.knife) this.scene.remove(this.knife);
      this.knife = buildGun(lo?.fists ? 'fists' : 'melee', lo?.fists ? null : lo); // battle royale: soco rapido sem faca
      this.knife.scale.setScalar(VM_SCALE); this.knife.visible = false;
      this.scene.add(this.knife); this.knifeKey = key;
    }
    this.knife.userData.saber?.ignite(0.14); // golpe rapido: acende na hora
  }
  // ferrolho: depois do tiro a mao puxa e empurra o ferrolho
  // escopeta de bomba (01/11): depois do tiro a mao esquerda puxa a bomba pra tras e empurra de volta
  pump(t) { this.pumpDur = Math.max(0.32, Math.min(0.55, t * 0.7)); this.pumpT = this.pumpDur + 0.06; }
  bolt(t) { this.boltDur = Math.max(0.45, Math.min(1, t * 0.8)); this.boltT = this.boltDur + 0.12; }
  // escalada (01/11): a arma desce pro lado e a mao esquerda agarra a borda e empurra o corpo pra cima
  mantle(dur) { this.mantleDur = Math.max(0.3, dur); this.mantleT = this.mantleDur; this.inspectT = 0; }

  // chamar sequencia: a mao esquerda entra com um objeto de desenho antigo
  // uav = luneta de pirata, anvil = detonador de TNT, blimp = campainha de balcao
  callStreak(kind) {
    if (this.prop) this.scene.remove(this.prop);
    kind = kind === 'anvline' || kind === 'train' ? 'anvil' : kind === 'plane' || kind === 'bomber' || kind === 'hand' ? 'blimp' : kind; // detonador ou campainha (as grandes de 03/11 tambem)
    this.prop = makeProp(kind); this.propKind = kind;
    this.scene.add(this.prop);
    this.streakT = STREAK_DUR; this.inspectT = 0;
  }

  inspectDef() { const sw = this.gun?.userData.sawed; return this.gun?.userData.sword ? SWORD_INSPECT : this.akimbo ? (sw ? SAWED_AKIMBO_INSPECT : this.wpn === 'pistol' ? AKIMBO_INSPECT : AKIMBO_LONG_INSPECT) : sw ? SAWED_INSPECT : this.gun?.userData.drum ? REV_INSPECT : INSPECTS[this.wpn] || INSPECTS.rifle; }
  inspect() { if (this.inspectT <= 0 && this.switchT <= 0) this.inspectT = this.inspectDef().dur; }
  landed(v) { this.land = Math.min(0.08, v * 0.006); }
  // luva da primeira pessoa no visual: cor + estilo (mesmos estilos do boneco, medidos pra mao da camera)
  setGloves(look) {
    if (look?.charm !== this.charm) { this.charm = look?.charm; if (this.gun && this.wpn !== 'melee' && this.wpn !== 'fists') attachCharm(this.gun, this.charm); }
    const style = look?.glove || 'classic';
    const col = style === 'golden' ? 0xd4a017 : style === 'oven' ? 0xffffff : parseInt(String(look?.gloveCol || '#faf8f2').slice(1), 16);
    const mat = style === 'oven' ? toon(0xffffff, { map: ovenTex() }) : toon(col);
    for (const g of [this.gloveR, this.gloveL]) {
      if (!g) continue;
      if (g.userData.extra) { for (const m of g.userData.extra.userData.parts || []) m.removeFromParent(); g.remove(g.userData.extra); }
      const ex = g.userData.extra = new THREE.Group();
      g.add(ex);
      g.traverse(o => { if (o.isMesh && o.material?.isMeshToonMaterial) o.material = mat; if (o.userData.finger) o.visible = !['mitten', 'oven', 'boxing'].includes(style); if (o.userData.mitt) o.visible = ['mitten', 'oven', 'boxing'].includes(style); });
      const add = (m, c = mat) => { if (c) m.material = c; ex.add(m); return m; };
      // luva sem dedos (la, forno, boxe): uma aba so na frente da mao aberta
      if (['mitten', 'oven', 'boxing'].includes(style)) {
        const flap = add(ink(new THREE.SphereGeometry(0.04, 10, 8), col, 0.007)); flap.scale.set(1.25, 0.7, 1.15); flap.position.set(-0.004, 0.018, -0.055);
        g.userData.open.add(flap); flap.userData.styleFlap = true;
        const th = add(ink(new THREE.SphereGeometry(0.02, 8, 6), col, 0.006)); th.position.set(0.05, 0.02, -0.02); g.userData.open.add(th);
        ex.userData.parts = [flap, th];
      }
      if (style === 'boxing') { const lace = add(ink(new THREE.TorusGeometry(0.052, 0.006, 4, 12), PAL.white, 0), null); lace.position.set(0, -0.01, 0.05); }
      if (style === 'spiked') {
        const band = add(ink(new THREE.CylinderGeometry(0.058, 0.064, 0.04, 12), PAL.ink, 0.006), null); band.position.set(0, -0.01, 0.07); band.rotation.x = Math.PI / 2;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2, s = add(ink(new THREE.ConeGeometry(0.011, 0.03, 6), PAL.white, 0.004), null);
          s.position.set(Math.cos(a) * 0.072, -0.01 + Math.sin(a) * 0.072, 0.07); s.rotation.z = a - Math.PI / 2;
        }
      }
      if (style === 'claw') for (const x of [-0.03, 0, 0.03]) { const c = add(ink(new THREE.ConeGeometry(0.011, 0.07, 6), PAL.paper, 0.004), null); c.position.set(x, 0.04, -0.075); c.rotation.x = -Math.PI / 2 - 0.25; }
      if (style === 'golden') { const ring = add(ink(new THREE.TorusGeometry(0.019, 0.006, 6, 12), 0xffe28a, 0), null); ring.position.set(0, 0.024, -0.058); ring.rotation.x = -1.2; }
      g.scale.setScalar(0.72 * (style === 'boxing' ? 1.3 : style === 'oven' ? 1.12 : style === 'mitten' ? 1.06 : 1));
    }
  }

  // st: { dt, moving, speed, sprint, tac, ads(0..1 alvo), crouch, slide, air, lookDX, lookDY, firing }
  update(st) {
    if (this.gun) tickCharm(this.gun, arguments[0]?.dt ?? 0);
    const dt = st.dt, s = this.s, g = this.gun?.userData || {};
    this.ads = st.ads;
    if (this.gun) this.gun.userData.fxHidden = st.ads > 0.3; // efeito da camo lendaria some mirando
    // pose alvo
    let tx = 0.18, ty = -0.15, tz = -0.37, trx = 0.02, tryy = 0.05, trz = 0; // 07/11 (pedido dele): arma mais alta e perto (estava baixa e parecia pequena; era 0,19 / -0,19 / -0,4)
    // pistola de braco esticado (MW 2019): mais longe do rosto
    const pistol = this.wpn === 'pistol';
    if (pistol) { tx = 0.16; ty = -0.17; tz = -0.52; }
    // akimbo de arma comprida: cada uma mais pro seu lado e mais longe (no meio as duas se batiam)
    if (this.akimbo && !pistol) { tx = 0.25; ty = -0.2; tz = -0.5; }
    // faca na mao (pegada invertida): punho mais alto a direita pra lamina aparecer deitada
    if (this.wpn === 'melee') { tx = 0.19; ty = -0.17; tz = -0.44; trx = 0.18; tryy = 0.32; trz = 0.22; }
    if (this.wpn === 'melee' && this.gun?.userData.sword) { tx = 0.12; ty = -0.24; tz = -0.52; trx = 0; tryy = 0.08; trz = 0; } // espada na guarda, as duas maos no cabo a vista
    // variante de elite: a corrida normal usa a pose de arma levantada (MW 2019); as outras armas correm normal
    const bpRun = st.sprint && this.isBp && this.wpn !== 'melee' && this.wpn !== 'fists' && st.ads < 0.05;
    if (st.tac || bpRun) {
      // disparada estilo MW 2019: arma erguida de lado, cano pra cima, afastada a direita (o meio da tela fica livre)
      tx = 0.3; ty = -0.1; tz = -0.72; trx = 1.3; tryy = 0.25; trz = -0.4;
    } else if (st.sprint && this.akimbo) {
      // akimbo correndo (estilo COD): cada arma do seu lado, baixa, cano pra frente e pra cima; os bracos sobem e
      // descem alternando no ritmo do passo (abaixo). Antes cruzavam no meio da tela.
      tx = pistol ? 0.2 : 0.27; ty = -0.3; tz = pistol ? -0.4 : -0.46; trx = 0.45; tryy = -0.12; trz = -0.1;
    } else if (st.sprint && pistol) {
      // corrida de pistola (BO3): pistola erguida perto do peito, cano pra cima
      tx = 0.13; ty = -0.17; tz = -0.4; trx = 1.05; tryy = -0.12; trz = -0.28;
    } else if (st.sprint && this.wpn === 'melee') {
      tx = 0.2; ty = -0.27; tz = -0.42; trx = 0.6; tryy = 0.2; trz = 0.3;
      if (this.gun?.userData.sword) { tx = 0.24; ty = -0.34; tz = -0.45; trx = -0.5; tryy = 0.35; trz = 0.4; } // espada correndo: lamina pra tras
    } else if (st.sprint) {
      // corrida estilo COD: arma baixa no canto, cano caido pra esquerda (a do BO2 foi revertida 01/11, pedido dele)
      tx = 0.15; ty = -0.18; tz = -0.4; trx = -0.42; tryy = 0.72; trz = 0.36; // 07/11: corrida mais alta (era -0,23)
      // sniper: a mesma pose, so mais pro canto direito e mais baixa (inteira tampava a tela; a de 01/11 sumia dela)
      if (this.wpn === 'sniper') { tx = 0.22; ty = -0.21; tz = -0.42; trx = -0.38; tryy = 0.62; trz = 0.3; }
    } else if (st.ads > 0) {
      const sc = this.sight(), eye = ((sc && sc.eye) || g.iron || new THREE.Vector3(0, 0.08, -0.1)).clone().multiplyScalar(VM_SCALE), roll = sc?.roll || 0;
      // luneta: a lente ocupa ~55% da altura da tela; red dot: olho um pouco atras da janela
      // distancia do olho estilo COD: a lente ocupa uma fatia fixa da altura da tela
      // (luneta ~62%, red dot ~14%), calculada pelo raio real de cada lente
      const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / (sc?.big ? 1 : this.fovK || 1); // escala de FOV afasta a mira tambem; luneta segue enchendo a tela
      let relief = sc ? sc.lensR * VM_SCALE / (half * (sc.big ? 0.78 : 0.14)) : 0.42; // 08/11 (pedido dele): luneta perto do olho como no COD, com a borda do tubo a vista (era 0,62)
      if (pistol && !sc?.big) relief = Math.max(0.6, relief * 1.9);
      if (pistol && sc?.big) relief = sc.lensR * VM_SCALE / (half * 0.36); // 09/11 (pedido dele): luneta na pistola fica longe do olho, braco esticado; a das snipers nao muda
      if (!sc && g.ironDepth) relief = Math.max(relief, g.ironDepth * VM_SCALE + 0.2); // ferro do TT (07/11): o olho fica atras da alca, nunca dentro da arma
      relief = Math.max(relief, sc?.big ? 0.035 : sc ? 0.09 : 0.12); // luneta pode chegar mais perto (o corte da camera e 0,01)
      // antes: // 07/11 (regra dele): a camera nunca encosta na mira/arma (perto demais o corte da camera atravessava a malha e piscava)
      // eixo optico inclinado no modelo: gira a arma pra ele ficar reto no olho
      const tilt = -(sc ? sc.tilt || 0 : g.ironTilt || 0); // mira de ferro do TT (07/11): inclina pra alca e massa ficarem na mesma linha
      this.adsEyeRaw = null; if (roll) eye.applyAxisAngle(new THREE.Vector3(0, 0, 1), roll); // mira de 45 graus: a arma deita e o red dot fica de pe
      const yawI = sc ? 0 : g.ironYaw || 0; if (yawI) eye.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawI); // ferro TT: alca e massa alinhadas de lado (07/11)
      eye.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
      const ax = -eye.x, ay = -eye.y, az = -relief - eye.z;
      this.adsEye = eye.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), -tilt); if (yawI) this.adsEye.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yawI); if (roll) this.adsEye.applyAxisAngle(new THREE.Vector3(0, 0, 1), -roll);
      tx = THREE.MathUtils.lerp(tx, ax, st.ads); ty = THREE.MathUtils.lerp(ty, ay, st.ads); tz = THREE.MathUtils.lerp(tz, az, st.ads);
      // mirando: arma reta, sem inclinacao da pose de quadril
      trx = THREE.MathUtils.lerp(trx, tilt, st.ads); tryy = THREE.MathUtils.lerp(tryy, yawI, st.ads); trz = THREE.MathUtils.lerp(trz, roll, st.ads);
    }
    // 08/11 (pedido dele): TODA arma inclina pra baixo ao recarregar, entra e sai suave (o resto da recarga segue por cima desta pose)
    if (this.reloadT > 0 && this.wpn !== 'melee' && this.wpn !== 'fists') {
      const p = 1 - this.reloadT / this.reloadDur, sm = (x) => { const c = Math.min(1, Math.max(0, x)); return c * c * (3 - 2 * c); }, k = sm(p / 0.16) * sm((1 - p) / 0.18);
      trx -= 0.72 * k; ty -= 0.1 * k; tz += 0.04 * k; trz += 0.18 * k;
    }
    // inspecionar (pose por categoria); atirar, mirar, correr, recarregar ou granada cancela na hora
    let insp = null, akL = null, spinR = 0, spinL = 0;
    if (this.inspectT > 0) {
      if (st.firing || st.ads > 0.05 || st.sprint || st.tac || this.reloadT > 0 || this.throwT > 0) this.inspectT = 0;
      else {
        this.inspectT -= dt;
        const I = this.inspectDef();
        const ip = 1 - Math.max(0, this.inspectT) / I.dur;
        insp = inspectPose(I.keys, ip);
        tx += insp[0]; ty += insp[1]; tz += insp[2]; trx += insp[3]; tryy += insp[4]; trz += insp[5];
        if (this.akimbo) { akL = insp.slice(6, 12); insp = [...insp.slice(0, 6), 0, 0, 0]; spinR = spinAt(ip, I.spinR); spinL = spinAt(ip, I.spinL); }
        else if (I === REV_INSPECT || I === SAWED_INSPECT) spinR = spinAt(ip, I.spinR); // serrada tambem da cambalhota
      }
    }
    // revolver: tambor gira ate o proximo furo, cao volta armado; no inspect o tambor da 3 voltas rapidas
    for (const gg of [this.gun, this.gun2]) {
      const u = gg?.userData; if (!u?.drum) continue;
      const ins = this.inspectT > 0 ? spinAt(1 - Math.max(0, this.inspectT) / this.inspectDef().dur, [0.32, 0.62]) * 3 : 0;
      u.drumNow = damp(u.drumNow || 0, u.drumA || 0, 22, dt);
      u.drum.rotation.z = u.drumNow + ins;
      u.hamT = Math.max(0, (u.hamT || 0) - dt * 5);
      if (u.hammer) u.hammer.rotation.x = u.hamT > 0.5 ? (1 - u.hamT) * 2 * 0.6 : u.hamT * 2 * 0.6; // bate e volta armado
    }
    // akimbo: a esquerda tem pose propria no inspect (suavizada igual a direita) e os giros no dedo
    if (this.akimbo) {
      const tgt = akL || [0, 0, 0, 0, 0, 0], a = (this.akL ||= [0, 0, 0, 0, 0, 0]);
      for (let i = 0; i < 6; i++) a[i] = damp(a[i], tgt[i], i < 3 ? 16 : 14, dt);
      this.akSpinL = spinL;
    }
    this.akSpinR = spinR; // giro no dedo da arma da direita (akimbo e revolver)
    // deslize (31/10, pedido dele, estilo BO3): a direita segura a arma tombada pra esquerda com o cano subindo
    // e a mao esquerda solta e desce ate o chao, raspando. Mirando deslizando a pose some (atira normal)
    this.fSlide = damp(this.fSlide || 0, st.slide && st.ads < 0.3 && this.wpn !== 'fists' ? 1 : 0, st.slide ? 14 : 9, dt);
    if (this.fSlide > 0.001) {
      const f = this.fSlide;
      tx += (0.13 - tx) * f; ty += (-0.15 - ty) * f; tz += (-0.42 - tz) * f;
      trx += (0.1 - trx) * f; tryy += (0.12 - tryy) * f; trz += (0.34 - trz) * f; // fica na direita, tomba pra esquerda e o cano sobe
    }

    // depois de uma volta inteira, a rotacao volta pra faixa normal sem desenrolar
    if (!insp && Math.abs(s.ry) > Math.PI) s.ry -= Math.sign(s.ry) * Math.PI * 2;
    const k = st.ads > 0 && !st.sprint ? 18 : insp ? 16 : 10;
    s.x = damp(s.x, tx, k, dt); s.y = damp(s.y, ty, k, dt); s.z = damp(s.z, tz, k, dt);
    const rk = st.ads > 0.5 ? 18 : insp ? 14 : 9;
    s.rx = damp(s.rx, trx, rk, dt); s.ry = damp(s.ry, tryy, rk, dt); s.rz = damp(s.rz, trz, rk, dt);

    // balanco: andar = suave, corrida = oito, disparada = bombeado forte
    const rate = st.tac ? 12 : st.sprint ? 10 : 9.5; // igual a passada do jogador: cada quique da arma cai num passo
    if (st.moving && !st.air) this.bobT += dt * rate * Math.min(1.2, st.speed / 7);
    const adsK = 1 - st.ads * 0.9;
    let bx = 0, by = 0, brz = 0, brx = 0;
    if (st.moving && !st.air) {
      const amp = st.tac ? 0.04 : st.sprint ? 0.03 : 0.012;
      bx = Math.sin(this.bobT) * amp * adsK;
      by = -Math.abs(Math.cos(this.bobT)) * amp * 0.9 * adsK;
      brz = Math.sin(this.bobT) * (st.sprint || st.tac ? 0.08 : 0.02) * adsK;
      if (st.tac) brx = Math.sin(this.bobT * 2) * 0.1;
      // pistola erguida: o pulo do passo sobe e desce o cano no ritmo
      if (st.sprint && pistol) { by = -Math.abs(Math.sin(this.bobT)) * 0.035; brx = Math.abs(Math.sin(this.bobT)) * 0.12; brz = Math.sin(this.bobT) * 0.06; }
    } else {
      const t = performance.now() / 1000;
      by = Math.sin(t * 1.8) * 0.003 * adsK; bx = Math.cos(t * 0.9) * 0.002 * adsK;
    }
    // sway pelo mouse
    this.swayX = damp(this.swayX, THREE.MathUtils.clamp(-st.lookDX * 0.0009, -0.06, 0.06), 9, dt);
    this.swayY = damp(this.swayY, THREE.MathUtils.clamp(st.lookDY * 0.0009, -0.05, 0.05), 9, dt);
    // recuo de mola
    this.kick = damp(this.kick, 0, 14, dt);
    this.kickR = damp(this.kickR, 0, 12, dt);
    this.land = damp(this.land, 0, 8, dt);
    this.squash = damp(this.squash, 0, 18, dt);
    // troca: abaixa e sobe
    let sw = 0;
    if (this.switchT > 0) { this.switchT -= dt; sw = Math.max(0, this.switchT / 0.32); }
    // granada: abaixa a arma e a mao esquerda arremessa
    let th = 0;
    if (this.throwT > 0) { this.throwT -= dt; th = Math.sin((1 - this.throwT / 0.5) * Math.PI); }
    let gr = 0;
    if (this.grabT > 0) { this.grabT -= dt; const q = 1 - Math.max(0, this.grabT) / GRAB_DUR; gr = Math.min(1, q / 0.35, (1 - q) / 0.35); gr = gr * gr * (3 - 2 * gr); }
    // recarga: tomba a arma e volta
    let rl = 0;
    if (this.reloadT > 0) { if (!st.reloadPaused) this.reloadT -= dt; const p = 1 - this.reloadT / this.reloadDur; rl = Math.sin(Math.min(1, p) * Math.PI) * (st.reloadPaused ? 0.35 : 1); } // pausada correndo: a mao abaixa a arma

    // golpe de lamina (0..1) e ferrolho (0..1)
    let sw2 = 0, sp = 0;
    if (this.swingT > 0) { this.swingT -= dt; sp = 1 - Math.max(0, this.swingT) / this.swingDur; sw2 = Math.sin(sp * Math.PI); }
    let bo = 0;
    if (this.boltT > 0) { this.boltT -= dt; const bp = 1 - Math.max(0, this.boltT) / this.boltDur; bo = bp > 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0; }
    // ferrolho de verdade (sniper com peca de ferrolho): levanta a alavanca, puxa, empurra e baixa
    const gb = this.gun?.userData.bolt;
    if (gb) {
      const bp = this.boltT > 0 ? Math.min(1, Math.max(0, 1 - this.boltT / this.boltDur)) : 0;
      const q = (a, c) => Math.min(1, Math.max(0, (bp - a) / (c - a)));
      const up = bp < 0.5 ? q(0, 0.22) : 1 - q(0.78, 1), back = bp < 0.5 ? q(0.22, 0.5) : 1 - q(0.5, 0.78);
      gb.g.rotation.z = -up * 1.2;
      gb.g.position.z = gb.z0 + back * gb.travel;
    }
    // faca rapida: a arma sai rapido (15% do tempo), fica fora e so volta nos 20% finais
    const out = this.swingT > 0 ? Math.min(1, sp / 0.15, (1 - sp) / 0.2) : 0;
    const dipQ = this.swingQuick ? out : 0;
    const cut = this.swingT > 0 && !this.swingQuick && this.wpn !== 'fists' ? inspectPose(this.gun?.userData.sword ? SWORD_SLASH[this.swordSide || 0] : SLASH, sp) : null;
    let sk = 0, skp = 0;
    if (this.streakT > 0) { this.streakT -= dt; skp = 1 - Math.max(0, this.streakT) / STREAK_DUR; sk = Math.min(1, skp / 0.18, (1 - skp) / 0.18); }
    const kickAds = st.ads > 0.5 ? 0.45 : 1;
    // injecao (01/11, pedido dele): a arma sai de cena inteira e so volta quando a seringa termina
    let stp = 0, stD = 0;
    if (this.stimT > 0) { this.stimT -= dt; stp = 1 - Math.max(0, this.stimT) / STIM_DUR; stD = Math.min(1, stp / 0.15, (1 - stp) / 0.2); }
    this.stimP = stp; this.stimD = stD;
    let mlp = 0, mlD = 0;
    if (this.mantleT > 0) { this.mantleT -= dt; mlp = 1 - Math.max(0, this.mantleT) / this.mantleDur; mlD = Math.min(1, mlp / 0.15, (1 - mlp) / 0.3); }
    const c = cut || [0, 0, 0, 0, 0, 0];
    this.rig.position.set(
      s.x + bx + this.swayX * adsK + c[0],
      s.y + by - this.land - sw * 0.35 - rl * 0.06 - th * 0.22 + this.swayY * adsK - dipQ * 0.75 - sk * 0.7 - stD * 0.75 - gr * 0.1 + c[1],
      s.z + this.kick * kickAds + c[2]);
    this.rig.rotation.set(
      s.rx + brx + this.kickR * kickAds * 0.5 - sw * 0.9 + rl * 0.35 - dipQ * 1.1 - sk * 0.9 - stD * 0.9 + c[3],
      s.ry + this.swayX * 2 * adsK + c[4],
      s.rz + brz + rl * 0.7 + bo * 0.22 + c[5], 'YXZ');
    if (this.akSpinR) this.rig.rotation.x -= this.akSpinR; // giro de cauboi
    // corrida com duas: direita sobe enquanto a esquerda desce (e troca), no compasso do passo
    const akRun = this.akimbo && st.sprint && !st.tac ? Math.sin(this.bobT) * 0.055 : 0;
    if (akRun) { this.rig.position.y += akRun; this.rig.rotation.x += akRun * 1.6; }
    // gadget de baixo do cano em uso (03/11, estilo COD): a arma da uma levantada pra cima e volta suave
    this.gadK = (this.gadK || 0) + ((st.gadget ? 1 : 0) - (this.gadK || 0)) * (1 - Math.exp(-12 * st.dt));
    if (this.gadK > 0.002) { this.rig.rotation.x += this.gadK * 0.16; this.rig.position.y += this.gadK * 0.02; this.rig.position.z += this.gadK * 0.012; }
    // 09/11 (pedido dele): agachar e pular com a arma em movimento LINEAR (velocidade constante, sem mola). Mirando a pose some: a mira fica no centro
    { const toward = (v, to, r) => v + Math.max(-r, Math.min(r, to - v));
      this.crouchL = toward(this.crouchL || 0, st.crouch && !st.slide ? 1 : 0, st.dt / 0.16);
      this.airL = toward(this.airL || 0, st.air ? 1 : 0, st.dt / (st.air ? 0.14 : 0.11));
      const free = 1 - Math.min(1, st.ads);
      if (this.crouchL > 0) { this.rig.position.y -= this.crouchL * 0.03 * free; this.rig.position.x -= this.crouchL * 0.008 * free; this.rig.rotation.z += this.crouchL * 0.11 * free; this.rig.rotation.x -= this.crouchL * 0.035 * free; }
      if (this.airL > 0) { this.rig.position.y += this.airL * 0.022 * free; this.rig.position.z += this.airL * 0.012 * free; this.rig.rotation.x += this.airL * 0.075 * free; this.rig.rotation.z -= this.airL * 0.03 * free; } }
    if (mlD > 0) { this.rig.position.x += mlD * 0.07; this.rig.position.y -= mlD * 0.2; this.rig.rotation.x -= mlD * 0.45; this.rig.rotation.z -= mlD * 0.55; }
    if (this.akimbo) { // espelho da direita, com o recuo proprio
      this.kick2 = damp(this.kick2 || 0, 0, 12, dt);
      const a = this.akL || [0, 0, 0, 0, 0, 0], r = this.rig;
      // a pose de inspect da direita sai do espelho (cada mao tem a sua); o giro no dedo e por cima
      const ri = insp ? [insp[0], insp[1], insp[2], insp[3], insp[4], insp[5]] : [0, 0, 0, 0, 0, 0];
      this.akimbo.position.set(-(r.position.x - ri[0]) + a[0], r.position.y - ri[1] + a[1] - akRun * 2, r.position.z - ri[2] + a[2] + this.kick2);
      this.akimbo.rotation.set(r.rotation.x + (this.akSpinR || 0) - ri[3] + a[3] + this.kick2 * 0.5 - (this.akSpinL || 0) - akRun * 3.2, -(r.rotation.y - ri[4]) + a[4], -(r.rotation.z - ri[5]) + a[5], 'YXZ');
    }
    // mirando, o recuo e o balanco giram a arma EM VOLTA DO OLHO: o ponto da mira fica onde o tiro
    // vai. Antes girava em volta do punho e o ponto subia dezenas de pixels a cada rajada.
    if (st.ads > 0 && this.adsEye) {
      const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(s.rx, s.ry, s.rz, 'YXZ'));
      const drift = this.adsEye.clone().applyQuaternion(this.rig.quaternion).sub(this.adsEye.clone().applyQuaternion(qb));
      this.rig.position.addScaledVector(drift, -st.ads);
    }
    // achatado de desenho a cada tiro: so no quadril (mirando ele esticava a arma a partir do punho
    // e jogava a lente pra cima)
    const sq = this.squash * 0.12 * (1 - st.ads);
    const tg = g.toon;
    if (tg) {
      // fole (06/11): mola subamortecida = fecha, abre passando do ponto e balanca. Mirando, um terco (a mira nao pula)
      this.belV += (-900 * this.bel - 16 * this.belV) * dt; this.bel = THREE.MathUtils.clamp(this.bel + this.belV * dt, -0.35, 0.35);
      const b = this.bel * (1 - st.ads * 0.7);
      this.gun.scale.set(VM_SCALE * (1 - b * 0.55), VM_SCALE * (1 - b * 0.55), VM_SCALE * (1 + b));
      // pente de borracha: na recarga a mao puxa e ele estica como chiclete; solto, volta balancando
      if (tg.mag) {
        const rp = this.reloadT > 0 ? 1 - this.reloadT / this.reloadDur : -1, want = rp > 0.1 && rp < 0.5 ? 1.85 : 1;
        this.magV += (-(rp > 0.1 && rp < 0.5 ? 90 : 420) * (this.magS - want) - 9 * this.magV) * dt; this.magS = Math.max(0.6, this.magS + this.magV * dt);
        const ys = this.magS, xs = 1 / Math.sqrt(ys), m = tg.mag, c0 = tg.magC, p0 = tg.magP0;
        m.scale.set(xs, ys, xs);
        m.position.set(p0.x + c0.x * (1 - xs), p0.y + tg.magTop * (1 - ys), p0.z + c0.z * (1 - xs)); // a boca do pente fica presa na arma
      }
      this.holder.scale.set(1, 1, 1);
    } else this.holder.scale.set(1 + sq * 0.5, 1 + sq * 0.5, 1 - sq);

    // braco esquerdo solta da arma na recarga e na disparada (bomba no ritmo)
    this.rig.updateMatrixWorld(true);
    const pR = new THREE.Vector3(), pL = new THREE.Vector3();
    if (g.gripR) g.gripR.getWorldPosition(pR);
    if (g.gripL) g.gripL.getWorldPosition(pL);
    const pL0 = pL.clone(); // onde a esquerda fica quando so segura (pra saber se ela soltou)
    // bomba: a mao (e o guarda-mao junto) vai pra tras e volta; a arma da um tranco pequeno
    let pk = 0;
    if (this.pumpT > 0) { this.pumpT -= st.dt; const u = 1 - Math.min(1, Math.max(0, this.pumpT) / this.pumpDur); pk = u > 0 ? Math.sin(Math.min(1, u) * Math.PI) : 0; }
    if (pk > 0) { pL.z += pk * 0.085; pL.y -= pk * 0.01; this.rig.rotation.x += pk * 0.05; }
    if (st.sprint && pistol) pL.set(-0.24 + Math.sin(this.bobT) * 0.04, -0.4 + Math.cos(this.bobT) * 0.06, -0.3 + Math.sin(this.bobT) * 0.08);
    const bpHold = this.isBp && ['rifle', 'sniper', 'lmg'].includes(this.wpn); // 09/11 (pedido dele, foto do soldado): variante de fuzil, sniper e LMG corre com a mao de apoio segurando embaixo da arma
    if (!bpHold && (st.tac || (st.sprint && this.isBp && this.wpn !== 'melee' && this.wpn !== 'fists'))) pL.set(-0.2 + Math.sin(this.bobT) * 0.05, -0.2 + Math.cos(this.bobT) * 0.08, -0.35 + Math.sin(this.bobT) * 0.1);
    if (insp) pL.add(new THREE.Vector3(insp[6], insp[7], insp[8]).applyQuaternion(this.rig.quaternion));
    if (rl > 0) pL.lerp(new THREE.Vector3(pR.x - 0.02, pR.y - 0.12, pR.z + 0.02), rl);
    if (th > 0) pL.lerp(new THREE.Vector3(-0.12, -0.05 + th * 0.1, -0.5), th);
    // faca na mao: a esquerda fica fora da tela (baixa, de lado)
    const two = this.wpn === 'melee' && !!g.sword; // espada: as duas maos no cabo, em toda pose (golpe, inspect, corrida)
    if (two) { g.gripL.getWorldPosition(pL); if (th > 0) pL.lerp(new THREE.Vector3(-0.12, -0.05 + th * 0.1, -0.5), th); }
    else if (this.wpn === 'melee') pL.set(-0.34, -0.62, -0.25);
    if (this.akimbo && this.gun2?.userData.gripR) { this.akimbo.updateMatrixWorld(true); this.gun2.userData.gripR.getWorldPosition(pL); } // akimbo: a esquerda segura a 2a pistola
    // punhos: guarda de boxe balancando no ritmo; cada soco e um jab da mao da vez (alterna)
    const fists = this.wpn === 'fists';
    if (fists) {
      // punhos: guarda (respira) > andando (sobe e desce alternado no passo) > correndo (bombeia como no COD).
      // Os pesos misturam suave: nada de tranco ao comecar/parar de correr.
      this.fT = (this.fT || 0) + dt;
      this.fWalk = damp(this.fWalk || 0, st.moving && !st.air ? 1 : 0, 8, dt);
      this.fRun = damp(this.fRun || 0, st.sprint && !st.air ? 1 : 0, 7, dt);
      this.fAir = damp(this.fAir || 0, st.air ? 1 : 0, 10, dt);
      const ph = this.bobT, w = this.fWalk * (1 - this.fRun), r = this.fRun;
      const breath = Math.sin(this.fT * 3.2) * 0.01 * (1 - this.fWalk);
      const sw = Math.sin(ph), cw = Math.cos(ph);
      // guarda -> braco baixo e aberto da corrida
      pR.set(0.12 + 0.05 * r, -0.12 - 0.05 * r, -0.34 - 0.02 * r);
      pL.set(-0.12 - 0.05 * r, -0.10 - 0.07 * r, -0.31 - 0.05 * r);
      // andando: maos alternadas, leve vai-e-vem
      pR.y += breath + sw * 0.02 * w; pL.y += breath - sw * 0.02 * w;
      pR.z += cw * 0.018 * w; pL.z -= cw * 0.018 * w;
      pR.x += Math.abs(sw) * 0.006 * w; pL.x -= Math.abs(sw) * 0.006 * w;
      // correndo: bombeia em arco (frente e cima / tras e baixo), alternado
      pR.z -= sw * 0.1 * r; pR.y += sw * 0.045 * r - Math.abs(cw) * 0.015 * r;
      pL.z += sw * 0.1 * r; pL.y -= sw * 0.045 * r + Math.abs(cw) * 0.015 * r;
      // no ar: maos sobem um pouco (equilibrio)
      pR.y += 0.05 * this.fAir; pL.y += 0.06 * this.fAir;
      this.fPump = sw * r;
      this.punchK = 0;
      if (this.swingT > 0) {
        // soco de desenho (01/11): puxa pra tras (preparo), estoca rapido passando um pouco do ponto, segura e volta.
        // Jab (esquerda) vai reto; direto (direita) cruza pro meio. A outra mao recua de guarda.
        const wind = sp < 0.2 ? Math.sin(sp / 0.2 * Math.PI / 2) : Math.max(0, 1 - (sp - 0.2) / 0.1);
        const hit = sp < 0.2 ? 0 : sp < 0.36 ? 1 - (1 - (sp - 0.2) / 0.16) ** 3 : sp < 0.5 ? 1 + Math.sin((sp - 0.36) / 0.14 * Math.PI) * 0.12 : Math.max(0, 1 - (sp - 0.5) / 0.5) ** 1.6;
        const L = this.punchLeft, hand = L ? pL : pR, other = L ? pR : pL;
        hand.z += 0.06 * wind - 0.24 * hit; hand.y += -0.02 * wind + 0.04 * hit; hand.x += (L ? 0.05 : -0.12) * hit;
        other.z += 0.04 * hit; other.y -= 0.015 * hit;
        this.punchK = hit; // a luva estica no impacto (abaixo)
      }
    }
    if (this.prop) {
      this.prop.visible = this.streakT > 0;
      if (this.prop.visible) {
        // entra de baixo a esquerda, faz a acao e sai
        const base = new THREE.Vector3(-0.05, -0.14 + (sk - 1) * 0.4, -0.42); // mais pro meio: a arma saiu de cena
        this.prop.scale.setScalar(1.05);
        this.prop.position.copy(base);
        const act = Math.max(0, Math.min(1, (skp - 0.25) / 0.45)), beat = Math.sin(act * Math.PI);
        if (this.propKind === 'uav') { this.prop.position.y += 0.06 * sk; this.prop.rotation.set(0.1 + beat * 0.15, 0.7, 0.2 - beat * 0.2); }
        else if (this.propKind === 'anvil') { this.prop.rotation.set(0.25, 0.3, 0); const pl = this.prop.userData.plunger; if (pl) pl.position.y = pl.userData.y0 - (act > 0.5 ? 0.05 : act * 0.1); }
        else { this.prop.rotation.set(0.3, 0.2, 0); const bt = this.prop.userData.button; if (bt) bt.position.y = bt.userData.y0 - Math.abs(Math.sin(act * Math.PI * 3)) * 0.012; }
        this.prop.updateMatrixWorld(true);
        this.prop.userData.hand.getWorldPosition(pL);
      }
    }
    // escalada: a esquerda bate na borda la na frente e vai empurrando pra baixo enquanto o corpo sobe
    if (mlD > 0 && !this.akimbo) pL.lerp(new THREE.Vector3(-0.2, -0.1 - Math.min(1, mlp / 0.7) * 0.16, -0.48 + Math.min(1, mlp / 0.7) * 0.1), mlD);
    if (gr > 0 && !this.akimbo) pL.lerp(new THREE.Vector3(-0.15, -0.36, -0.78), gr);
    if (bo > 0) pR.add(new THREE.Vector3(0.03 * bo, 0.04 * bo, 0.1 * bo));
    if (this.knife) {
      this.knife.visible = this.swingQuick && this.swingT > 0;
      if (this.knife.visible) {
        // corte na frente, da direita pra esquerda (BO3), longe o bastante pra luva nao tampar a tela
        const q = inspectPose(QUICK, sp);
        this.knife.position.set(q[0], q[1], q[2]);
        this.knife.rotation.set(q[3], q[4], q[5], 'YXZ');
        this.knife.updateMatrixWorld(true);
        this.knife.userData.gripR.getWorldPosition(pR);
        pL.y -= dipQ * 0.6;
      }
    }
    // deslize: a direita continua no cabo e a esquerda solta da arma e vai pro chao, embaixo a esquerda
    const fs = this.fSlide || 0;
    if (fs > 0.001 && !fists && !two) {
      const drag = Math.sin((this.slideTT = (this.slideTT || 0) + dt) * 38) * 0.006;
      pL.lerp(new THREE.Vector3(-0.15 + drag, -0.21, -0.44 + drag * 2), fs); // canto de baixo a esquerda, dentro do quadro
    } else this.slideTT = 0;
    this.gloveR.position.copy(pR);
    this.gloveL.position.copy(pL);
    this.gloveR.quaternion.copy(this.rig.quaternion);
    this.gloveL.quaternion.copy(this.rig.quaternion);
    if (mlD > 0 && !this.akimbo) this.gloveL.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.35, 0.2, 0.1, 'YXZ')), mlD); // palma deitada na borda
    // punho fechado: no soco e segurando a faca (na mao ou no golpe rapido); aberta segurando arma
    const quickSw = !!(this.knife?.visible && this.knife.userData.sword), holdR = two || quickSw, holdL = two && th < 0.3;
    const onGun = !fists && this.wpn !== 'melee' && !(this.knife?.visible ?? false), fistR = (fists || this.wpn === 'melee' || (this.knife?.visible ?? false) || (onGun && bo < 0.02)) && !holdR, fistL = fists || (onGun && pL.distanceTo(pL0) < 0.006 && !holdL); // parada na arma = punho fechado no ponto de pega; soltou (recarga, granada) = aberta
    this.gloveR.userData.fist.visible = fistR; this.gloveR.userData.open.visible = !fistR && !holdR; this.gloveR.userData.grip.visible = holdR;
    this.gloveL.userData.fist.visible = fistL; this.gloveL.userData.open.visible = !fistL && !holdL; this.gloveL.userData.grip.visible = holdL;
    // mao esquerda fechada fica EMBAIXO do guarda-mao (o ponto de pega e dentro do cano: os nos subiam na frente da mira)
    if (fistL && !fists) { pL.add(new THREE.Vector3(0, -0.062 - 0.035 * st.ads, 0).applyQuaternion(this.rig.quaternion)); this.gloveL.position.copy(pL); }
    if (fists) { // impacto: luva estica pra frente e gira um pouco (rola no direto)
      const k = this.punchK || 0, g2 = this.punchLeft ? this.gloveL : this.gloveR;
      for (const gg of [this.gloveL, this.gloveR]) gg.userData.fist.scale.set(1, 1, 1);
      if (k > 0) { g2.userData.fist.scale.set(1 + k * 0.12, 1 + k * 0.12, 1 + k * 0.45); }
    }
    if (fists) { this.gloveR.quaternion.identity(); this.gloveL.quaternion.identity(); this.gloveL.rotateZ(-0.15); this.gloveR.rotateZ(0.15); const pmp = this.fPump || 0; this.gloveR.rotateX(-pmp * 0.5 - (this.fRun || 0) * 0.35); this.gloveL.rotateX(pmp * 0.5 - (this.fRun || 0) * 0.35); if (this.punchK && !this.punchLeft) this.gloveR.rotateZ(-0.5 * this.punchK); } // punho gira com a passada; o direto rola no impacto
    else if (this.akimbo) this.gloveL.quaternion.copy(this.akimbo.quaternion); // akimbo: a esquerda segue a 2a pistola
    else this.gloveL.rotateZ(-0.9);
    // 08/11 (print dele): na pistola o punho de costas cobria a arma; a mao fica de lado, com os nos pra direita
    if (fistR && !fists && this.wpn === 'pistol') this.gloveR.rotateZ(-1.35);
    if (fistL && !fists && this.wpn === 'pistol' && this.akimbo) this.gloveL.rotateZ(1.35 + 0.9);
    if (fs > 0.001 && !fists && !two) { // palma da esquerda virada pro chao, dedos pra frente
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25, -0.25, 0.3, 'YXZ'));
      this.gloveL.quaternion.slerp(q, fs);
    }
    if (holdR) holdHilt(this.gloveR, quickSw ? this.knife : this.gun, SHOULDER_R);
    if (holdL) holdHilt(this.gloveL, this.gun, SHOULDER_L);
    // guarda-chuva aberto: a mao esquerda segura o cabo, cupula na frente-esquerda tampando o tronco
    if (this.umbOn) {
      if (!this.umb) { this.umb = umbrellaMesh(); this.umb.scale.setScalar(0.3); this.scene.add(this.umb); }
      this.umb.visible = true;
      // cupula virada pra frente (ponta no -z), um pouco a esquerda: protege sem tampar a mira
      this.umb.position.set(-0.2, -0.06, -0.62); this.umb.rotation.set(-Math.PI / 2 + 0.12, 0.18, 0);
      this.umb.updateMatrixWorld(true);
      pL.set(-0.2, -0.13, -0.42);
      this.gloveL.position.copy(pL);
    } else if (this.umb) this.umb.visible = false;
    // seringa na mao esquerda: sobe de baixo, vira a agulha pro peito, crava, empurra o embolo e desce
    if (this.stimD > 0.001) {
      if (!this.syr) { this.syr = syringeMesh(); this.syr.scale.setScalar(0.62); this.scene.add(this.syr); }
      const p = this.stimP, d = this.stimD;
      const stab = THREE.MathUtils.smoothstep(p, 0.28, 0.4), push = THREE.MathUtils.smoothstep(p, 0.42, 0.78);
      // agulha virada pra VOCE (01/11, pedido dele: estava de lado): sobe na frente com a ponta pra tras e pra baixo,
      // e no golpe vem em direcao a camera e crava no peito
      const hx = -0.08 + stab * 0.03, hy = -0.36 + d * 0.16 - stab * 0.03, hz = -0.5 + stab * 0.1;
      this.syr.visible = true;
      this.syr.position.set(hx, hy + 0.05, hz);
      this.syr.rotation.set(-1.05 - stab * 0.25, 0, 0.3 - stab * 0.1);
      this.syr.userData.plunger.position.y = 0.07 - push * 0.09;
      const j = this.syr.userData.juice; j.scale.y = Math.max(0.02, 1 - push); j.position.y = -0.055 * push;
      this.syr.updateMatrixWorld(true);
      this.gloveL.position.set(hx + 0.01, hy, hz + 0.03);
      this.gloveL.quaternion.setFromEuler(new THREE.Euler(-0.25 - stab * 0.2, 0.35, -0.25, 'YXZ'));
    } else if (this.syr) this.syr.visible = false;
    // carga do Canhao de Carga: 8 bolinhas girando em volta do cano, mais rapidas e juntas conforme enche; cheia = vermelho pulsando
    const ch = this.charge || 0;
    if (ch > 0.001) {
      if (!this.chargeFx) {
        this.chargeFx = new THREE.Group();
        for (let i = 0; i < 8; i++) this.chargeFx.add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true })));
        this.scene.add(this.chargeFx);
      }
      const mz = g.muzzle; this.chargeFx.visible = !!mz;
      if (mz) {
        mz.getWorldPosition(this.chargeFx.position); this.chargeFx.quaternion.copy(this.rig.quaternion);
        this.chargeT2 = (this.chargeT2 || 0) + dt * (4 + ch * 18);
        const full = ch >= 0.999, R = 0.06 - ch * 0.03;
        this.chargeFx.children.forEach((b, i) => {
          const a = this.chargeT2 + i / 8 * Math.PI * 2, back = (i % 2) * 0.05 + ch * 0.02;
          b.position.set(Math.cos(a) * R, Math.sin(a) * R, back);
          b.scale.setScalar(0.6 + ch * 1.2 + (full ? Math.sin(this.chargeT2 * 3) * 0.4 : 0));
          b.material.color.setHex(full ? 0xff3a2a : 0xffd23a); b.material.opacity = 0.35 + ch * 0.65;
        });
      }
      // treme carregando: vibracao lisa e fraca (o chacoalho aleatorio, ampliado pela luneta, tremia demais; 01/11), menor ainda mirando
      const tq = 0.0007 * ch * ch * (1 - 0.6 * st.ads), tt = performance.now() / 1000;
      this.rig.position.x += Math.sin(tt * 31) * tq; this.rig.position.y += Math.sin(tt * 23 + 1.3) * tq;
    } else if (this.chargeFx) this.chargeFx.visible = false;
    const hideHands = false;
    if (g.scope?.lens) {
      g.scope.lens.material.uniforms.uOn.value = g.scope.big ? (this.canted ? 0 : THREE.MathUtils.smoothstep(st.ads, 0.55, 0.9)) : 1;
      // luneta na mira cheia: o vidro e' desenhado por cima da carcaca (sem o tunel da caixa por dentro)
      const over = g.scope.big && st.ads > 0.8 && !this.canted;
      if (g.scope.lens.material.depthTest === over) { g.scope.lens.material.depthTest = !over; g.scope.lens.renderOrder = over ? 9 : 3; }
    }
    // 04/11 (pedido dele): a luva acompanha o braco em toda pose: a boca dela (+z) gira pro ombro e o dedo fica onde a pose mandou
    // mao que segura (06/11): parada na arma = dedos contornando a malha (filhos da arma) e o punho atras da palma;
    // soltou (recarga, granada, inspect, faca, ferrolho, escalada...) = luva aberta animada de sempre
    {
      const wR = !!this.wrapR && !fists && this.wpn !== 'melee' && !(this.knife?.visible) && bo < 0.02;
      const akL = !!this.akimbo && !!this.wrapAK, okL = akL ? (fs < 0.01 && !(mlD > 0) && !(gr > 0)) : (pL.distanceTo(pL0) < 0.006);
      const wL = (akL || !!this.wrapL) && okL && !fists && !two && !this.umbOn && !(this.stimD > 0.001) && this.wpn !== 'melee';
      if (this.wrapR) this.wrapR.visible = wR && !(st.ads > 0.85 && g.ironDepth && this.wpn !== 'pistol'); // ferro do TT (07/11): mirando, a luva direita no pescoco da coronha tampava a mira
      if (this.wrapL) this.wrapL.visible = wL && !akL;
      if (this.wrapAK) this.wrapAK.visible = wL && akL;
      this.gloveR.userData.wrapped = wR; this.gloveL.userData.wrapped = wL;
      const hide = (gl) => { gl.userData.open.visible = gl.userData.fist.visible = gl.userData.grip.visible = false; };
      if (wR) { this.gun.updateMatrixWorld(true); wristPose(this.gun, this.wrapR, this.gloveR); hide(this.gloveR); pR.copy(this.gloveR.position); }
      if (wL) { const gg = akL ? this.gun2 : this.gun; gg.updateMatrixWorld(true); wristPose(gg, akL ? this.wrapAK : this.wrapL, this.gloveL); hide(this.gloveL); pL.copy(this.gloveL.position); }
    }
    if (!fists) for (const [gl, sh] of [[this.gloveR, SHOULDER_R], [this.gloveL, SHOULDER_L]]) {
      if (gl.userData.wrapped) continue;
      hZ.set(0, 0, 1).applyQuaternion(gl.quaternion); hX.copy(sh).sub(gl.position).normalize();
      gl.quaternion.premultiply(hQ.setFromUnitVectors(hZ, hX).slerp(ID_Q, 0.15));
    }
    // o antebraco sai do punho da luva na direcao dela: inclina junto com a arma (disparada, inspect, akimbo, soco)
    const arm = (glove, p, sh, mid0) => {
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(glove.quaternion);
      const wrist = p.clone().addScaledVector(dir, 0.05).add(new THREE.Vector3(0, -0.01, 0));
      const elbow = wrist.clone().addScaledVector(dir, 0.22).lerp(mid0.clone().lerp(p, 0.3), 0.35);
      return [sh, elbow, wrist];
    };
    const rArm = arm(this.gloveR, pR, new THREE.Vector3(0.38, -0.55, 0.15), new THREE.Vector3(0.35, -0.3, 0.05));
    // 09/11 (pedido dele): variante correndo com a arma erguida: o braco direito desce por baixo, sem cobrir a coronha
    this.bpArmK = damp(this.bpArmK || 0, this.isBp && ['rifle', 'sniper', 'lmg'].includes(this.wpn) && (st.tac || st.sprint) && st.ads < 0.05 ? 1 : 0, 12, st.dt);
    if (this.bpArmK > 0.001) { rArm[0] = rArm[0].clone().lerp(new THREE.Vector3(0.2, -1.05, 0), this.bpArmK); rArm[1] = rArm[1].clone().lerp(rArm[2].clone().add(new THREE.Vector3(-0.1, -0.3, 0.02)), this.bpArmK); }
    this.armR.set(...rArm);
    this.armL.set(...arm(this.gloveL, pL, new THREE.Vector3(-0.38, -0.6, 0.05), new THREE.Vector3(-0.3, -0.35, -0.1)));
    this.rig.visible = !hideHands;
    for (const o of [this.gloveR, this.gloveL, this.armR.mesh, this.armL.mesh]) o.visible = !hideHands;

    // laser: feixe longo na primeira pessoa (o ponto no mundo e' do main); correndo desliga
    if (g.laser && !g.laser.light) {
      const u = g.laser.beam.material.uniforms.uOn, b = g.laser.beam;
      // mirando some (o ponto no mundo continua); no quadril o feixe converge pro centro da mira
      u.value = damp(u.value, st.sprint || st.tac || this.inspectT > 0 || st.ads > 0.3 ? 0 : 1, 14, dt);
      b.parent.updateWorldMatrix(true, false);
      const from = b.getWorldPosition(new THREE.Vector3()), to = new THREE.Vector3(0, 0, -6);
      b.scale.z = 1;
      b.lookAt(to); b.rotateY(Math.PI); // a geometria aponta pra -z
      b.scale.z = from.distanceTo(to) / b.parent.getWorldScale(new THREE.Vector3()).z * 0.9; // quase ate o centro da mira: ajuda a precisao (pedido dele 30/10)
    }
    if (g.spin) {
      this.spinV = damp(this.spinV || 0, st.firing ? 40 : 0, 4, dt);
      if (g.spinAxis) g.spin.rotation.z += this.spinV * dt; else g.spin.rotation.z += this.spinV * dt;
    }
    // clarao da boca
    if (this.flashT > 0 && g.muzzle) {
      this.flashT -= dt;
      (this.akimbo && this.akSide && this.gun2?.userData.muzzle ? this.gun2.userData.muzzle : g.muzzle).getWorldPosition(this.flash.position);
      // um tico a frente da boca do cano, na direcao que a arma aponta
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.rig.quaternion);
      this.flash.position.addScaledVector(fwd, 0.06);
      const sc = (0.07 + Math.random() * 0.04) * (st.ads > 0.5 ? 0.55 : 1) * (0.25 + 0.75 * (g.muzzleDev?.flash ?? 1)) * (g.toon ? 1.5 : 1); // estrela de tinta: maior // bocal: silenciador e quebra-chama abafam o clarao
      this.flash.scale.set(sc, sc, 1);
      this.flash.material.rotation = Math.random() * 6;
      this.flash.visible = !(g.scope && st.ads > 0.85);
    } else this.flash.visible = false;
  }

  // ponto da boca do cano na tela, em coordenadas de camera (pra puxar o tracer do lugar certo)
  muzzleCam() {
    const p = new THREE.Vector3();
    const g2 = this.akimbo && this.akSide ? this.gun2 : null; // akimbo: o tiro sai da mao da vez
    if (g2?.userData.muzzle) g2.userData.muzzle.getWorldPosition(p);
    else if (this.gun?.userData.muzzle) this.gun.userData.muzzle.getWorldPosition(p);
    return p;
  }
}
