// Monta o visual do boneco (chapeu, olhos, oculos, luvas, camisa, estampa do short, efeito).
// Tudo procedural, no mesmo traco de tinta do resto (ink + toon). A cor do time fica no short e na fita.
import * as THREE from 'three';
import { ink, toon, PAL, smoothGeo } from './toon.js';
import { camoGlsl, camoTime } from './camos.js';
import { SKIN_CODE2, SKIN_GLSL2, SKIN_GLSL_HELP } from './skins3d.js';
export { buildSkinFx } from './skins3d.js';

// skin animada do corpo (Loja, 03/11): shader PROPRIO de cada skin (nao e o das camos), no corpo preto todo.
// Um material por skin pra todos os bonecos (o tempo e o mesmo uniform das camos). camoGlsl(0) = so as funcoes de
// apoio das camos (ruido, voronoi); skinColor desenha a skin e usa a borda (fr) pra um brilho de contorno.
export const SKIN_CODE = { lapis: 1, giz: 2, holograma: 3, discoteca: 4, massinha: 5, planta: 6, dragao: 7, tempestade: 8, papelao: 9, trico: 10, aquarela: 11, pixel: 12, ...SKIN_CODE2 };
// 03/11 (pedido dele): temas que NAO existem em nenhuma camo nem efeito do jogo (as 8 primeiras repetiam lava, galaxia...)
const SKIN_GLSL = /* glsl */`
vec3 skinColor(int k, vec3 p, vec3 n, float fr, float t, out vec3 glow) {
  glow = vec3(0.0);
  if (k == 1) { // rabisco a lapis: papel com hachura de grafite que "ferve" (redesenha 8x por segundo, igual desenho animado)
    float bt = floor(t * 8.0); vec3 q = p + vec3(c_h(vec3(bt, 1.0, 2.0)), c_h(vec3(bt, 3.0, 4.0)), 0.0) * 0.06;
    float shade = smoothstep(0.2, 0.8, 0.5 - n.y * 0.35 + n.x * 0.25);
    float h1 = abs(fract((q.x + q.y) * 9.0 + c_n(q * 3.0 + bt) * 0.7) - 0.5);
    float h2 = abs(fract((q.x - q.y) * 9.0 + c_n(q * 3.0 + bt + 5.0) * 0.7) - 0.5);
    float line = smoothstep(0.13, 0.05, h1) * (0.3 + shade * 0.7), cross = smoothstep(0.11, 0.04, h2) * smoothstep(0.5, 0.85, shade);
    return vec3(0.94, 0.92, 0.87) - vec3(0.6, 0.6, 0.62) * max(line, cross);
  }
  if (k == 2) { // giz de cera: manchas de cor de giz com os riscos da cera e o papel aparecendo nos buracos
    vec2 v = c_vor(p * 2.2);
    vec3 c = c_hue(fract(v.y * 0.9 + t * 0.02)) * 0.8 + 0.12;
    float stroke = 0.78 + 0.22 * sin((p.x * 0.7 + p.y) * 60.0 + c_n(p * 8.0) * 6.0);
    float gaps = smoothstep(0.55, 0.78, c_n(p * 22.0 + vec3(0.0, 0.0, v.y * 10.0)));
    return mix(c * stroke, vec3(0.95, 0.93, 0.88), gaps * 0.55);
  }
  if (k == 3) { // holograma: linhas de varredura subindo, faixa clara correndo e falha de sinal de vez em quando
    float scan = 0.6 + 0.4 * sin(p.y * 80.0 - t * 12.0);
    float band = smoothstep(0.94, 1.0, fract(p.y * 0.6 - t * 0.35));
    float glitch = step(0.97, c_h(vec3(floor(p.y * 12.0), floor(t * 10.0), 1.0)));
    vec3 hc = c_hue(fract(0.5 + p.y * 0.12 + t * 0.05 + glitch * 0.3)) * 0.35 + vec3(0.1, 0.65, 0.95) * 0.65;
    glow = hc * (fr * 1.6 + band * 1.2 + glitch * 0.8) * scan;
    return hc * scan * 0.55 + band * 0.5;
  }
  if (k == 4) { // bola de discoteca: ladrilhos de espelho que piscam com a luz girando e faiscas
    vec3 q = p * 7.0, id = floor(q), f = fract(q);
    float edge = smoothstep(0.42, 0.5, max(abs(f.x - 0.5), abs(f.y - 0.5)));
    float h = c_h(id), flash = pow(0.5 + 0.5 * sin(t * 3.0 + h * 20.0 + n.x * 4.0), 6.0);
    vec3 tint = mix(vec3(0.75, 0.78, 0.86), c_hue(fract(h + t * 0.1)), 0.35);
    float spark = step(0.985, c_h(id + floor(t * 6.0)));
    glow = (tint * flash * 0.6 + vec3(1.0) * spark * 2.0) * (1.0 - edge);
    return mix(tint * (0.45 + flash * 0.7), vec3(0.15), edge);
  }
  if (k == 5) { // massinha de modelar: tres cores de massinha remexendo devagar, com marca de dedo
    float k5 = fract(c_fbm(p * 1.6 + vec3(0.0, t * 0.08, t * 0.05)) * 3.0 + p.y * 0.4);
    vec3 a = vec3(0.95, 0.45, 0.35), b = vec3(0.35, 0.7, 0.95), c = vec3(0.98, 0.85, 0.3);
    vec3 col = mix(mix(a, b, smoothstep(0.3, 0.36, k5)), c, smoothstep(0.63, 0.69, k5));
    col = mix(col, a, smoothstep(0.94, 1.0, k5));
    float prints = 0.9 + 0.1 * sin(length(fract(p.xy * 1.5) - 0.5) * 90.0);
    return col * prints;
  }
  if (k == 6) { // planta azul: papel de projeto, grade fina e as linhas grossas sendo desenhadas
    vec3 g = abs(fract(p * 4.0) - 0.5), g2 = abs(fract(p) - 0.5);
    float fine = smoothstep(0.47, 0.5, max(g.x, g.y)), bold = smoothstep(0.46, 0.5, max(g2.x, g2.y));
    float draw = step(fract(p.y + p.x * 0.5 - t * 0.25), 0.55);
    glow = vec3(0.6, 0.8, 1.0) * bold * draw * 0.35;
    return vec3(0.1, 0.28, 0.6) + vec3(0.8, 0.9, 1.0) * (fine * 0.25 + bold * 0.7 * draw);
  }
  if (k == 7) { // pele de dragao: escamas em fileira com brilho furta-cor (verde -> ouro) que corre com a luz
    vec2 q = vec2(p.x * 5.0, p.y * 7.0); q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 f = fract(q) - vec2(0.5, 0.0); float d = length(f * vec2(1.0, 1.3));
    float edge = smoothstep(0.38, 0.5, d);
    float ir = 0.5 + 0.5 * sin(n.x * 3.0 + n.y * 2.0 + t * 1.5 + c_h(vec3(floor(q), 1.0)) * 3.0);
    vec3 col = mix(vec3(0.05, 0.35, 0.2), vec3(0.85, 0.7, 0.2), ir * 0.7);
    glow = vec3(1.0, 0.8, 0.3) * fr * 0.5 + vec3(0.3, 1.0, 0.5) * smoothstep(0.9, 1.0, ir) * (1.0 - edge) * 0.4;
    return mix(col * (0.7 + 0.3 * (1.0 - f.y)), vec3(0.03, 0.1, 0.06), edge);
  }
  if (k == 8) { // ceu de tempestade: nuvem escura rodando, chuva fina e relampago que acende o corpo
    float cl = c_fbm(p * 1.8 + vec3(t * 0.15, 0.0, -t * 0.1));
    vec3 col = mix(vec3(0.12, 0.14, 0.2), vec3(0.45, 0.5, 0.6), smoothstep(0.3, 0.75, cl));
    float fl = step(0.92, c_h(vec3(floor(t * 6.0), 7.0, 7.0)));
    float bolt = smoothstep(0.035, 0.0, abs(p.x * 0.8 + c_fbm(vec3(p.y * 4.0, floor(t * 6.0), 0.0)) * 0.8 - 0.4)) * fl;
    float rain = step(0.97, c_h(vec3(floor(p.x * 30.0), floor(p.y * 6.0 + t * 20.0), 0.0)));
    glow = vec3(0.7, 0.85, 1.0) * (bolt * 2.0 + fl * 0.4) + vec3(0.4, 0.5, 0.8) * fr * 0.4;
    return col + vec3(0.7, 0.8, 1.0) * (fl * 0.35 + bolt + rain * 0.2);
  }
  if (k == 9) { // papelao: ondulado marrom com a fita adesiva passando devagar
    float wave = 0.5 + 0.5 * sin(p.y * 46.0), fib = c_n(p * 14.0);
    vec3 c = mix(vec3(0.58, 0.42, 0.25), vec3(0.72, 0.55, 0.35), wave * 0.5 + fib * 0.5);
    float tape = step(abs(fract(p.x * 0.5 + p.y * 0.25 - t * 0.05) - 0.5), 0.07);
    return mix(c, vec3(0.86, 0.76, 0.52), tape * 0.7);
  }
  if (k == 10) { // trico: pontos em V de la, com as listras subindo devagar
    vec2 q = vec2(p.x * 9.0, p.y * 11.0);
    float row = fract(q.y + abs(fract(q.x) - 0.5) * 1.2);
    float st = smoothstep(0.0, 0.2, row) * (1.0 - smoothstep(0.75, 1.0, row));
    vec3 c = mod(floor(p.y * 1.4 - t * 0.12 + 40.0), 2.0) < 1.0 ? vec3(0.78, 0.2, 0.22) : vec3(0.95, 0.9, 0.8);
    return c * (0.55 + 0.5 * st);
  }
  if (k == 11) { // aquarela: tinta molhada se espalhando, com a borda mais escura de cada mancha
    float f = c_fbm(p * 1.4 + vec3(t * 0.06, -t * 0.04, 0.0));
    vec3 c = c_hue(fract(f * 1.6 + t * 0.02)) * 0.55 + 0.42;
    float rim = 1.0 - smoothstep(0.0, 0.035, abs(fract(f * 5.0) - 0.5));
    return mix(c, c * 0.62, rim) + c_n(p * 30.0) * 0.06;
  }
  if (k == 12) { // 8 bits: blocos de video game antigo trocando de cor no ritmo
    vec3 id = floor(p * 5.0), f = abs(fract(p * 5.0) - 0.5);
    float h = c_h(id + floor(t * 3.0 + c_h(id) * 4.0));
    vec3 c = h < 0.25 ? vec3(0.1, 0.12, 0.3) : h < 0.5 ? vec3(0.95, 0.25, 0.4) : h < 0.75 ? vec3(0.2, 0.85, 0.6) : vec3(1.0, 0.85, 0.25);
    float gap = smoothstep(0.44, 0.48, max(f.x, f.y));
    glow = c * 0.2 * (1.0 - gap);
    return mix(c, vec3(0.04), gap);
  }
  ${SKIN_GLSL2}
  return vec3(1.0);
}
`;
// 09/11 (bateria de desempenho): cada programa levava as 29 skins (37 mil caracteres) e a 1a partida do PC ficava 30 s
// parada traduzindo shader. Agora cada skin compila so o proprio bloco
function skinGlslOf(code) {
  const end = SKIN_GLSL.lastIndexOf('return vec3(1.0);'), parts = SKIN_GLSL.slice(0, end).split(/(?=\r?\n  if \(k == \d+\) \{)/);
  const own = parts.find(s => s.trimStart().startsWith(`if (k == ${code}) {`));
  return own ? parts[0] + own + '\n  ' + SKIN_GLSL.slice(end) : SKIN_GLSL;
}
const SKINMAT = new Map();
export function skinMat(id) {
  const code = SKIN_CODE[id];
  if (!code) return null;
  if (SKINMAT.has(id)) return SKINMAT.get(id);
  const m = toon(0xffffff, { unique: true });
  m.userData.u = { uCamo: { value: code }, uTime: camoTime, uReact: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCamoPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamoPos = position * 2.4;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + camoGlsl(0) + SKIN_GLSL_HELP + skinGlslOf(code) + '\nvec3 gCamoGlow = vec3(0.0);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gCamoGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 sg; vec3 nn = normalize(vNormal); float fr = pow(1.0 - abs(dot(nn, normalize(vViewPosition))), 2.0);
          diffuseColor.rgb = skinColor(int(uCamo + 0.5), vCamoPos, nn, fr, uTime, sg); gCamoGlow = sg; }`);
  };
  m.customProgramCacheKey = () => 'skinU' + code;
  SKINMAT.set(id, m);
  return m;
}

const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
};

// ---------- olhos (textura no rosto) ----------
const EYES = new Map();
export function eyeTex(style) {
  if (EYES.has(style)) return EYES.get(style);
  const t = canvasTex(256, 128, (g) => {
    const INK = '#141210', W = '#faf8f2';
    g.lineCap = 'round'; g.lineJoin = 'round';
    const white = () => { g.fillStyle = W; g.beginPath(); g.ellipse(128, 64, 120, 60, 0, 0, Math.PI * 2); g.fill(); };
    const pie = (x, y = 66, ry = 44) => { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, 26, ry, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = W; g.beginPath(); g.moveTo(x + 4, y - 14); g.lineTo(x + 18, y - 36); g.lineTo(x + 22, y - 14); g.fill(); };
    const heart = (x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s); g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4); g.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s); g.fill(); };
    const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
    if (style === 'knockout') {
      white(); g.strokeStyle = INK; g.lineWidth = 12;
      for (const x of [80, 176]) { g.beginPath(); g.moveTo(x - 24, 42); g.lineTo(x + 24, 90); g.moveTo(x + 24, 42); g.lineTo(x - 24, 90); g.stroke(); }
      return;
    }
    if (style === 'cyclops') {
      white(); g.fillStyle = INK; g.beginPath(); g.ellipse(128, 66, 40, 48, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = W; g.beginPath(); g.ellipse(142, 50, 10, 14, 0, 0, Math.PI * 2); g.fill();
      return;
    }
    if (style === 'laser') {
      g.fillStyle = INK; g.fillRect(6, 34, 244, 56); g.fillStyle = '#ff3a2a'; g.fillRect(16, 50, 224, 24);
      g.fillStyle = '#ffd0c8'; g.fillRect(16, 56, 224, 6);
      return;
    }
    white();
    if (style === 'sleepy') { for (const x of [80, 176]) { g.fillStyle = INK; g.beginPath(); g.ellipse(x, 74, 26, 30, 0, 0, Math.PI); g.fill(); g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 34, 70); g.lineTo(x + 34, 70); g.stroke(); } }
    else if (style === 'angry') { for (const x of [80, 176]) pie(x, 74, 34); g.strokeStyle = INK; g.lineWidth = 14; g.beginPath(); g.moveTo(40, 22); g.lineTo(112, 44); g.moveTo(216, 22); g.lineTo(144, 44); g.stroke(); }
    else if (style === 'wink') { pie(80); g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.arc(176, 78, 28, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else if (style === 'dizzy') { g.strokeStyle = INK; g.lineWidth = 7; for (const x of [80, 176]) { g.beginPath(); for (let a = 0; a < Math.PI * 6; a += 0.2) { const r = 3 + a * 2.1; g.lineTo(x + Math.cos(a) * r, 64 + Math.sin(a) * r); } g.stroke(); } }
    else if (style === 'hearts') { for (const x of [80, 176]) heart(x, 60, 30, '#c2392b'); }
    else if (style === 'stars') { for (const x of [80, 176]) star(x, 64, 36, '#d9a520'); g.strokeStyle = INK; g.lineWidth = 3; }
    else for (const x of [80, 176]) pie(x); // classic, specs, shades, monocle, goggles (o oculos vai por cima)
  });
  EYES.set(style, t);
  return t;
}

// ---------- oculos (malha na frente do rosto) ----------
// rosto (05/11): peca presa na cabeca. Nariz em (0, -0.08, -0.38), boca em (0, -0.17, -0.33); frente = -z
export function buildFace(id) {
  if (!id || id === 'none') return null;
  const g = new THREE.Group(), add = (geo, col, x, y, z, rx = 0, ry = 0, rz = 0, th = 0.006) => { const m = ink(geo, col, th); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  const INK = 0x141210, BROWN = 0x6b4326, GOLD = 0xd9a520;
  switch (id) {
    case 'olhoroxo': add(new THREE.TorusGeometry(0.075, 0.026, 6, 18), 0x5d3a86, 0.1, 0.045, -0.372, 0, Math.PI, 0, 0); add(new THREE.SphereGeometry(0.02, 6, 5), 0x8a6bb0, 0.17, 0.0, -0.345, 0, 0, 0, 0); break;
    case 'curativo': add(new THREE.BoxGeometry(0.15, 0.04, 0.012), 0xe7c9a0, 0.14, -0.04, -0.33, 0, -0.42, 0.7); add(new THREE.BoxGeometry(0.15, 0.04, 0.012), 0xe7c9a0, 0.14, -0.04, -0.33, 0, -0.42, -0.7); break;
    case 'bigodinho': add(new THREE.CapsuleGeometry(0.018, 0.09, 3, 8), INK, 0, -0.13, -0.355, 0, 0, Math.PI / 2, 0); break;
    case 'sardas': for (const [x, y] of [[0.13, -0.03], [0.17, -0.06], [0.11, -0.08], [-0.13, -0.03], [-0.17, -0.06], [-0.11, -0.08]]) add(new THREE.SphereGeometry(0.012, 6, 5), 0x8a5a33, x, y, -0.325 + Math.abs(x) * 0.14, 0, 0, 0, 0); break;
    case 'bigode': for (const s of [-1, 1]) { const m = add(new THREE.TorusGeometry(0.075, 0.021, 6, 14, Math.PI * 1.15), INK, s * 0.075, -0.13, -0.35, 0, 0, s > 0 ? Math.PI * 1.02 : -0.12, 0); m.scale.y = 0.7; } break;
    case 'charuto': add(new THREE.CylinderGeometry(0.024, 0.024, 0.2, 8), BROWN, 0.08, -0.17, -0.42, Math.PI / 2 - 0.25, 0, 0.4); add(new THREE.SphereGeometry(0.024, 8, 6), 0xff7a1a, 0.125, -0.15, -0.52, 0, 0, 0, 0); break;
    case 'dente': add(new THREE.BoxGeometry(0.05, 0.05, 0.02), GOLD, 0.05, -0.205, -0.335, 0, 0, 0, 0.004); break;
    case 'cachimbo': add(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), BROWN, 0.07, -0.19, -0.42, Math.PI / 2 - 0.3, 0, 0.35); add(new THREE.CylinderGeometry(0.05, 0.036, 0.08, 10), BROWN, 0.105, -0.17, -0.51, 0, 0, 0); break;
    case 'cavanhaque': { const m = add(new THREE.ConeGeometry(0.06, 0.15, 10), INK, 0, -0.32, -0.25, Math.PI + 0.25, 0, 0, 0); m.userData.detail = false; break; }
    case 'barba': { const m = add(new THREE.SphereGeometry(0.29, 14, 10, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44), 0x3a2a1c, 0, -0.04, -0.09, 0, 0, 0, 0.01); m.scale.set(1.02, 1.1, 0.98); break; }
    case 'tapa': add(new THREE.CircleGeometry(0.075, 14), INK, 0.1, 0.05, -0.385, 0, Math.PI, 0, 0); { const m = add(new THREE.TorusGeometry(0.37, 0.011, 5, 28), INK, 0, 0.08, 0, Math.PI / 2 + 0.2, 0, 0, 0); m.userData.detail = false; } break;
    case 'gargalhada': { add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), 0xfaf8f2, 0, -0.15, -0.32, -0.1, 0, 0, 0.01); break; }
    // ---- mascaras com casca (07-08/11, pedido dele: nada piscando, tudo simetrico, rosto respeitado) ----
    // Regra unica (stick): todo detalhe e orientado pela normal da superficie onde senta (rosto ou casca) e fica INTEIRO
    // `gap` metros na frente dela: nunca cruza a pele, a casca nem o plano dos olhos (cruzar quase em paralelo = pisca).
    // Os olhos desenhados ficam em x = +-0,079, y = 0,037 (textura 256 px, pupilas em 80/176, plano de 0,42 m).
    // Casca R 0,40 com folga de 5 cm do rosto e abaixo da aba do chapeu. Tudo em pares espelhados (sx = -1 e 1).
    case 'fantasma': case 'bandido': case 'mocinho': case 'palhaco': case 'gas': case 'luchador': {
      const EX = 0.079, EY = 0.037;
      // rosto do boneco: mascara branca (elipsoide), cranio (r 0,36) e o plano dos olhos 7 mm na frente
      const face = (x, y) => { const k = 1 - (x / 0.315) ** 2 - ((y + 0.06) / 0.255) ** 2, mz = k > 0 ? -0.14 - 0.24 * Math.sqrt(k) : 0, sk = -Math.sqrt(Math.max(0, 0.1296 - x * x - y * y)); const z = Math.min(mz, sk); return Math.abs(x) < 0.21 && Math.abs(y - 0.04) < 0.105 ? z - 0.007 : z; };
      const shellOf = (C, R) => (x, y) => C.z - Math.sqrt(Math.max(0, R * R - (x - C.x) ** 2 - (y - C.y) ** 2));
      const N = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, -1), Q = new THREE.Quaternion(), RQ = new THREE.Quaternion();
      const stick = (m, surf, x, y, half, gap = 0.004, roll = 0) => { // half = meia espessura da peca no eixo z local (ja com a escala)
        const e = 0.004, dx = (surf(x + e, y) - surf(x - e, y)) / (2 * e), dy = (surf(x, y + e) - surf(x, y - e)) / (2 * e);
        N.set(dx, dy, -1).normalize(); // pra fora (frente = -z)
        Q.setFromUnitVectors(Z, N); if (roll) Q.multiply(RQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll)); m.quaternion.copy(Q);
        m.position.set(x, y, surf(x, y)).addScaledVector(N, half + gap); return m; };
      const put = (geo, col, surf, x, y, half, sc = [1, 1, 1], gap, roll, th = 0) => { const m = ink(geo, col, th); m.scale.set(...sc); g.add(m); return stick(m, surf, x, y, half, gap, roll); };
      const shellMesh = (C, R, col, p0, pl, t0, tl) => { const m = ink(new THREE.SphereGeometry(R, 28, 16, p0, pl, t0, tl), col, 0.012); m.position.copy(C); g.add(m); return m; };
      const both = (fn) => { for (const sx of [-1, 1]) fn(sx); };
      if (id === 'fantasma' || id === 'gas' || id === 'luchador') g.userData.noNose = true; // casca na frente do nariz: o nariz do boneco sai (cruzaria a casca)
      if (id === 'fantasma') { // 08/11 (pedido dele): no estilo do Ghost: balaclava preta cobrindo o rosto todo + caveira branca
        // pintada (testa e macas numa 2a casca concentrica 5 mm pra fora: esferas concentricas nunca se cruzam), orbitas e nariz
        // pretos, mandibula com dentes. Tudo espelhado em x
        const C = new THREE.Vector3(0, -0.02, -0.05), sh = shellOf(C, 0.4), sk2 = shellOf(C, 0.405);
        shellMesh(C, 0.4, 0x1d1c1a, Math.PI + 0.06, Math.PI - 0.12, Math.PI * 0.28, Math.PI * 0.46); // balaclava (para em 0,74 pi: o peito)
        shellMesh(C, 0.405, 0xe9e4d8, Math.PI + 0.78, Math.PI - 1.56, Math.PI * 0.3, Math.PI * 0.27); // cranio pintado (testa ate o nariz)
        both(sx => put(new THREE.SphereGeometry(0.07, 16, 10), 0xe9e4d8, sk2, sx * 0.15, -0.09, 0.07 * 0.22, [1.1, 0.75, 0.22], 0.002, -sx * 0.5)); // macas do rosto
        both(sx => put(new THREE.SphereGeometry(0.07, 16, 10), 0x0b0a09, sk2, sx * EX * 1.15, EY, 0.07 * 0.22, [1.05, 1.2, 0.22], 0.003, -sx * 0.18)); // orbitas
        { const n = put(new THREE.ConeGeometry(0.042, 0.07, 3), 0x0b0a09, sk2, 0, -0.075, 0.042 * 0.22, [1, 1, 0.22], 0.003, Math.PI); n.userData.detail = false; } // nariz (triangulo de ponta pra cima)
        put(new THREE.CapsuleGeometry(0.03, 0.2, 4, 12), 0xe9e4d8, sh, 0, -0.2, 0.03 * 0.25, [1, 1.3, 0.25], 0.002, Math.PI / 2); // faixa da mandibula
        for (let i = -3; i <= 3; i++) put(new THREE.BoxGeometry(0.004, 0.06, 0.006), 0x0b0a09, sh, i * 0.034, -0.2, 0.003, [1, 1, 1], 0.002 + 0.03 * 0.25 * 2); // riscos dos dentes (na frente da faixa)
        both(sx => put(new THREE.CapsuleGeometry(0.014, 0.08, 3, 8), 0xe9e4d8, sh, sx * 0.15, -0.21, 0.014 * 0.3, [1, 1, 0.3], 0.002, Math.PI / 2 + sx * 0.5)); // canto da mandibula
      } else if (id === 'bandido') { // 08/11 (pedido dele): bandana de faroeste DANDO A VOLTA na cabeca (anel de pano do nariz pra baixo)
        // Medidas: rosto branco na frente vai ate z -0,37 (y -0,12) e -0,28 (y -0,27); cranio 0,36; peito (torso) 0,33 de raio
        // em y -0,28. Anel com centro z -0,02, raio 0,395 em cima e 0,37 embaixo: 2 a 4 cm de folga de tudo, sem cruzar nada
        const CY = -0.205, H = 0.15, RT = 0.395, RB = 0.37, CZ = -0.02;
        { const m = ink(new THREE.CylinderGeometry(RT, RB, H, 40, 1, true), 0xb3261e, 0.01); m.position.set(0, CY, CZ); m.material.side = THREE.DoubleSide; g.add(m); }
        const rAt = (y) => RB + (RT - RB) * ((y - (CY - H / 2)) / H), cyl = (x, y) => CZ - Math.sqrt(Math.max(0, rAt(y) ** 2 - x * x));
        for (const [x, y] of [[0, -0.17], [0.13, -0.17], [0.26, -0.17], [0.065, -0.24], [0.195, -0.24], [0.32, -0.23]]) for (const sx of x ? [-1, 1] : [1]) put(new THREE.SphereGeometry(0.015, 8, 6), 0xfaf8f2, cyl, sx * x, y, 0.015 * 0.4, [1, 1, 0.4], 0.002); // bolinhas
        { const m = ink(new THREE.ConeGeometry(0.13, 0.17, 3), 0xb3261e, 0.01); m.position.set(0, CY - H / 2 - 0.07, CZ - RB - 0.03); m.rotation.set(Math.PI + 0.25, 0, 0); m.scale.z = 0.3; g.add(m); } // ponta caida na frente (fora do peito)
        { const k = ink(new THREE.SphereGeometry(0.04, 12, 8), 0xb3261e, 0.006); k.position.set(0, CY + 0.02, CZ + RT + 0.01); k.scale.set(1, 0.85, 0.6); g.add(k); } // no colado na nuca (encosta no anel por fora)
        both(sx => { const m = ink(new THREE.CapsuleGeometry(0.026, 0.1, 3, 8), 0xb3261e, 0.006); m.position.set(sx * 0.055, CY - 0.05, CZ + RT + 0.02); m.rotation.z = sx * 0.55; m.scale.z = 0.5; g.add(m); }); // pontas do no
      } else if (id === 'mocinho') { // mascara de mocinho: aros nos olhos (olho a mostra) + ponte + fita na nuca
        both(sx => put(new THREE.TorusGeometry(0.062, 0.02, 8, 24), INK, face, sx * EX, EY, 0.02 * 0.5, [0.85, 1.2, 0.5], 0.004));
        put(new THREE.CapsuleGeometry(0.018, 0.03, 3, 8), INK, face, 0, EY + 0.01, 0.018 * 0.6, [1, 1, 0.6], 0.004, Math.PI / 2);
        both(sx => put(new THREE.CapsuleGeometry(0.02, 0.09, 3, 8), INK, face, sx * 0.17, EY + 0.012, 0.02 * 0.6, [1, 1, 0.6], 0.004, Math.PI / 2 - sx * 0.12)); // abas pros lados
        { const m = ink(new THREE.TorusGeometry(0.392, 0.02, 6, 30, Math.PI * 1.1), INK, 0); m.position.set(0, 0.05, 0); m.rotation.set(Math.PI / 2, 0, -Math.PI * 0.05); m.userData.detail = false; g.add(m); } // fita na nuca (cranio 0,36: 1,2 cm de folga)
        both(sx => { const m = ink(new THREE.CapsuleGeometry(0.022, 0.13, 3, 8), INK, 0.004); m.position.set(sx * 0.06, -0.02, 0.41); m.rotation.set(0.3, 0, sx * 0.5); m.scale.z = 0.6; g.add(m); });
      } else if (id === 'palhaco') { // nariz de palhaco ENGOLINDO o nariz do boneco + losangos em cima dos olhos + bochechas
        add(new THREE.SphereGeometry(0.115, 18, 14), 0xd8322a, 0, -0.08, -0.405, 0, 0, 0, 0.008); // nariz do boneco: 0,0975 x 0,075 x 0,075 (todo dentro)
        both(sx => put(new THREE.OctahedronGeometry(0.04, 0), 0x2f5b8a, face, sx * EX, EY + 0.12, 0.04 * 0.3, [0.7, 1.25, 0.3], 0.003));
        both(sx => put(new THREE.SphereGeometry(0.045, 14, 10), 0xe58a9a, face, sx * 0.2, -0.09, 0.045 * 0.25, [1, 0.8, 0.25], 0.003));
      } else if (id === 'gas') { // mascara de gas: capuz de lona, visores de latao com vidro escuro, focinho e filtro listrado, tiras
        const C = new THREE.Vector3(0, -0.02, -0.04), sh = shellOf(C, 0.4);
        shellMesh(C, 0.4, 0x5c6b3a, Math.PI + 0.18, Math.PI - 0.36, Math.PI * 0.32, Math.PI * 0.42); // termina em 0,74 pi: abaixo disso entraria no peito
        both(sx => { put(new THREE.SphereGeometry(0.06, 16, 10), 0x22303a, sh, sx * 0.105, EY, 0.06 * 0.25, [1, 1, 0.25], 0.002); put(new THREE.TorusGeometry(0.066, 0.02, 8, 24), 0xa8843a, sh, sx * 0.105, EY, 0.02 * 0.7, [1, 1, 0.7], 0.002); });
        const sn = put(new THREE.CylinderGeometry(0.06, 0.075, 0.1, 16).rotateX(Math.PI / 2), 0x4a5730, sh, 0, -0.17, 0.05, [1, 1, 1], 0.002, 0, 0.008); sn.userData.detail = false; // focinho (eixo na normal)
        const fp = sn.position.clone().addScaledVector(N.set(0, 0, 0).subVectors(sn.position, C).normalize(), 0.105);
        { const f = ink(new THREE.CylinderGeometry(0.07, 0.07, 0.11, 18).rotateX(Math.PI / 2), 0x7a7a6e, 0.008); f.position.copy(fp); f.quaternion.copy(sn.quaternion); g.add(f);
          for (const k of [-0.03, 0.02]) { const r = ink(new THREE.TorusGeometry(0.076, 0.009, 5, 20), 0x3f3f38, 0); r.position.copy(fp).addScaledVector(N, k); r.quaternion.copy(sn.quaternion); g.add(r); } }
        for (const yy of [0.1, -0.12]) { const m = ink(new THREE.TorusGeometry(0.396, 0.016, 5, 28, Math.PI * 1.05), 0x3a3a2e, 0); m.position.set(0, yy, 0); m.rotation.set(Math.PI / 2 + (yy > 0 ? 0.25 : -0.2), 0, -Math.PI * 0.025); m.userData.detail = false; g.add(m); }
      } else if (id === 'luchador') { // mascara de luchador: capuz azul, aro branco e vazado escuro nos olhos, chamas, boca
        const C = new THREE.Vector3(0, -0.02, -0.04), sh = shellOf(C, 0.4);
        shellMesh(C, 0.4, 0x2f5b8a, Math.PI + 0.1, Math.PI - 0.2, Math.PI * 0.3, Math.PI * 0.44);
        both(sx => {
          const x = sx * 0.1;
          put(new THREE.SphereGeometry(0.062, 14, 10), INK, sh, x, EY, 0.062 * 0.25, [1.15, 0.9, 0.25], 0.002, -sx * 0.4); // vazado
          put(new THREE.TorusGeometry(0.07, 0.02, 8, 24), 0xfaf8f2, sh, x, EY, 0.02 * 0.6, [1.15, 0.9, 0.6], 0.002, -sx * 0.4); // aro branco (fora do vazado)
          for (const [dx, dy, h, rl] of [[0.0, 0.1, 0.08, 0.05], [0.04, 0.095, 0.065, -0.25], [-0.04, 0.095, 0.065, 0.35]]) put(new THREE.ConeGeometry(0.022, h, 8), 0xe3a92b, sh, x + sx * dx, EY + dy, 0.022 * 0.45, [1, 1, 0.45], 0.002, sx * rl);
        });
        put(new THREE.SphereGeometry(0.075, 14, 10), 0x2f5b8a, sh, 0, -0.08, 0.075 * 0.45, [1.25, 1, 0.45], 0.0, 0, 0.008); // nariz do capuz
        put(new THREE.CapsuleGeometry(0.035, 0.12, 4, 10), INK, sh, 0, -0.2, 0.035 * 0.3, [1, 1, 0.3], 0.002, Math.PI / 2);
        put(new THREE.TorusGeometry(0.055, 0.012, 6, 20), 0xfaf8f2, sh, 0, -0.2, 0.012 * 0.6, [2.0, 0.9, 0.6], 0.002);
      }
      break; }
    case 'lingua': { const m = add(new THREE.CapsuleGeometry(0.05, 0.07, 4, 10), 0xe07a8a, 0.02, -0.25, -0.34, 0.25, 0, 0, 0.006); m.scale.z = 0.5; break; }
    default: return null;
  }
  return g;
}

export function buildEyewear(style) {
  const g = new THREE.Group();
  const rim = (x, r, col = PAL.ink, lens = null) => {
    const ring = ink(new THREE.TorusGeometry(r, 0.022, 6, 20), col, 0.006); ring.position.set(x, 0, 0); g.add(ring);
    if (lens !== null) { const l = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: lens, transparent: true, opacity: lens === 0x141210 ? 0.92 : 0.35 })); l.position.set(x, 0, -0.004); l.rotation.y = Math.PI; g.add(l); }
  };
  if (style === 'specs') { rim(-0.1, 0.085); rim(0.1, 0.085); }
  else if (style === 'shades') { rim(-0.1, 0.09, PAL.ink, 0x141210); rim(0.1, 0.09, PAL.ink, 0x141210); }
  else if (style === 'monocle') {
    rim(0.1, 0.095, 0xd4a017, 0xbfe3ff);
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4), new THREE.MeshBasicMaterial({ color: 0xd4a017 })); ch.position.set(0.17, -0.18, 0.02); ch.rotation.z = 0.35; g.add(ch);
    return place(g);
  }
  else if (style === 'goggles') {
    rim(-0.1, 0.095, 0x7a4a2a, 0xbfe3ff); rim(0.1, 0.095, 0x7a4a2a, 0xbfe3ff);
    const strap = ink(new THREE.TorusGeometry(0.36, 0.03, 6, 24, Math.PI), 0x7a4a2a, 0.006); strap.rotation.set(Math.PI / 2, 0, 0); strap.position.z = 0.33; g.add(strap);
  }
  else return null;
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4), new THREE.MeshBasicMaterial({ color: 0x141210 })); bridge.rotation.z = Math.PI / 2; g.add(bridge);
  return place(g);
  function place(o) { o.position.set(0, 0.04, -0.39); return o; }
}

// ---------- chapeus ----------
// sem tremido entre pecas (03/11, pedido dele + regra do vault): peca de acessorio colada em outra (fita na copa,
// glace no bolo, oculos no rosto, chapeu na cabeca) piscava (z-fighting). Cada malha ganha um deslocamento de
// profundidade crescente na ordem em que foi montada (a de cima ganha da de baixo) e o acessorio todo ganha da
// cabeca. Copia do material por nivel (o toon e o contorno sao compartilhados: nao mexe no original).
// WeakMap (03/11, bateria de desempenho): a chave era o uuid num Map comum, entao material criado a cada montagem
// (lente/corrente de oculos) ficava no cache pra sempre. Agora a copia vai embora junto com o original
const OFFMAT = new WeakMap();
function offMat(m, k) {
  let lv = OFFMAT.get(m); if (!lv) OFFMAT.set(m, lv = new Map());
  let c = lv.get(k);
  if (!c) { c = m.clone(); c.polygonOffset = true; c.polygonOffsetFactor = -k; c.polygonOffsetUnits = -k * 4; if (m.onBeforeCompile) { c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; } lv.set(k, c); }
  return c;
}
export function antiFlicker(root, base = 1) {
  if (!root) return root;
  let k = base;
  root.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const isLine = o.parent?.isMesh && o.material.side === THREE.BackSide; // contorno: mesmo nivel da peca dele
    const lv = isLine ? (o.parent.userData.offK ?? base) : Math.min(8, k++);
    o.userData.offK = lv;
    if (!o.material.polygonOffset) o.material = offMat(o.material, lv);
  });
  return root;
}

export function buildHat(id, teamCol) {
  const g = new THREE.Group();
  const band = (r, y, h = 0.06) => { const b = ink(new THREE.CylinderGeometry(r, r, h, 36), teamCol, 0); b.position.y = y; return b; }; // fita do time
  const add = (m, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  switch (id) {
    case 'none': return null;
    case 'boina': { // boina de diretor: A Grande Estreia, nivel 50
      const top = add(ink(new THREE.SphereGeometry(0.32, 16, 10), 0x3a1a1c, 0.02), 0.05, 0.07, 0.04); top.scale.set(1.1, 0.34, 1.05); top.rotation.z = -0.18;
      add(ink(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8), 0x3a1a1c, 0.008), 0.05, 0.2, 0.04);
      add(band(0.262, 0.018, 0.1)); // fita alta: encosta na boina e na cabeca, sem vao
      g.position.y = 0.27; return g;
    }
    case 'bowler': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 14), PAL.ink, 0.02));
      add(ink(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16), PAL.ink, 0.02), 0, -0.09);
      g.add(band(0.245, -0.04));
      g.position.set(0.1, 0.36, 0.05); g.rotation.z = -0.35; break;
    }
    case 'cap': {
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      const vis = add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 16, 1, false, 0, Math.PI), PAL.ink, 0.015), 0, 0.01, -0.22); vis.rotation.y = Math.PI / 2; vis.scale.set(1, 1, 1.4);
      add(ink(new THREE.SphereGeometry(0.04, 8, 6), PAL.white, 0.01), 0, 0.31);
      g.position.set(0, 0.2, 0); g.rotation.x = -0.12; break;
    }
    case 'laurel': {
      // coroa de louros (faixa Mestre): aro dourado + folhas verdes em volta + pedra violeta na testa
      const ring = add(ink(new THREE.TorusGeometry(0.3, 0.035, 6, 24), 0xf2c94c, 0.012)); ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.2 && Math.cos(a) > 0) continue; // vao na nuca
        const leaf = add(ink(new THREE.SphereGeometry(0.07, 6, 4), 0x7fb069, 0.01), Math.sin(a) * 0.31, 0.03, -Math.cos(a) * 0.31);
        leaf.scale.set(0.55, 0.5, 1.4); leaf.rotation.y = a; leaf.rotation.x = 0.5;
      }
      add(ink(new THREE.OctahedronGeometry(0.06), 0xc084fc, 0.01), 0, 0.05, -0.33);
      g.position.set(0, 0.24, 0); break;
    }
    case 'capcrown': {
      // coroa de tampinhas (meta da comunidade): aro dourado e tampinhas de garrafa em pe, serrilhadas, cores alternando
      const ring = add(ink(new THREE.CylinderGeometry(0.29, 0.3, 0.1, 18, 1, true), 0xe3a92b, 0.014), 0, 0.03);
      ring.userData.detail = false;
      const cols = [0xa83a2c, 0xece9e1, 0xe3a92b, 0x141210];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const cap = add(ink(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 21), cols[i % 4], 0.008), Math.sin(a) * 0.3, 0.13, -Math.cos(a) * 0.3);
        cap.rotation.set(Math.PI / 2, 0, 0); cap.rotation.y = -a; cap.userData.detail = true; // em pe, de frente pra fora
      }
      add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xffcf3a, 0.008), 0, 0.2, -0.31);
      g.position.set(0, 0.26, 0); break;
    }
    case 'rovexcap': {
      // bone violeta da Rovex: copa violeta, aba violeta escura (preta sumia no rosto preto) e o logo
      // "Rovex" (classic text) em branco na testa (31/10, pedido dele)
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x6d3df5, 0.02));
      const vis = add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 16, 1, false, 0, Math.PI), 0x3b1d9a, 0.015), 0, 0.01, -0.22); vis.rotation.y = Math.PI / 2; vis.scale.set(1, 1, 1.5); vis.rotation.x = 0.12;
      // logo colado na curva da frente: um pedaco de esfera um pouco maior que a copa (centro na frente, -z)
      const logo = new THREE.Mesh(new THREE.SphereGeometry(0.314, 24, 8, Math.PI * 1.5 - 0.62, 1.24, 0.92, 0.42), new THREE.MeshBasicMaterial({ map: rovexText(), transparent: true, depthWrite: false }));
      logo.renderOrder = 2; g.add(logo);
      add(ink(new THREE.SphereGeometry(0.04, 8, 6), PAL.white, 0.01), 0, 0.31);
      g.position.set(0, 0.2, 0); g.rotation.x = -0.12; break;
    }
    case 'beanie': {
      add(ink(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      { const b = band(0.335, 0.03, 0.09); b.material = toon(PAL.paper); g.add(b); }
      add(ink(new THREE.SphereGeometry(0.09, 10, 8), PAL.paper, 0.015), 0, 0.36);
      g.position.set(0, 0.16, 0.02); break;
    }
    case 'party': {
      const cone = add(ink(new THREE.ConeGeometry(0.17, 0.46, 14), teamCol, 0.02), 0, 0.2);
      const pom = add(ink(new THREE.SphereGeometry(0.07, 8, 6), 0xf2c94c, 0.012), 0, 0.45);
      for (let i = 0; i < 3; i++) { const d = add(ink(new THREE.TorusGeometry(0.15 - i * 0.045, 0.012, 4, 14), PAL.paper, 0), 0, 0.06 + i * 0.12); d.rotation.x = Math.PI / 2; }
      cone.userData.k = pom; g.position.set(0.08, 0.3, 0); g.rotation.z = -0.25; break;
    }
    case 'chef': {
      add(ink(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), PAL.white, 0.02), 0, 0.08);
      for (const [x, z] of [[0, 0], [0.12, 0.05], [-0.12, 0.05], [0, -0.12], [0.06, 0.12]]) add(ink(new THREE.SphereGeometry(0.15, 10, 8), PAL.white, 0.015), x, 0.26, z);
      g.add(band(0.225, 0, 0.05));
      g.position.set(0, 0.32, 0.03); break;
    }
    case 'tophat': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 16), PAL.ink, 0.02), 0, 0.2);
      add(ink(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 18), PAL.ink, 0.02));
      g.add(band(0.205, 0.07, 0.07));
      g.position.set(0.06, 0.34, 0.04); g.rotation.z = -0.18; break;
    }
    case 'cowboy': {
      add(ink(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 14), 0x7a4a2a, 0.02), 0, 0.08);
      const brim = add(ink(new THREE.TorusGeometry(0.34, 0.06, 6, 20), 0x7a4a2a, 0.015)); brim.rotation.x = Math.PI / 2; brim.scale.set(1, 1, 0.5);
      add(ink(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 18), 0x7a4a2a, 0.012));
      g.add(band(0.21, 0.02, 0.05));
      g.position.set(0, 0.34, 0.03); g.rotation.z = -0.1; break;
    }
    case 'antenna': {
      add(ink(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.012));
      const wire = []; for (let i = 0; i <= 8; i++) wire.push(new THREE.Vector3(Math.sin(i * 0.7) * 0.05, i * 0.06, 0));
      add(ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wire), 16, 0.012, 5), PAL.ink, 0));
      const ball = add(ink(new THREE.SphereGeometry(0.07, 10, 8), 0xf2c94c, 0.012), 0, 0.5);
      g.userData.bob = ball; g.position.set(0, 0.32, 0); break;
    }
    case 'propeller': {
      add(ink(new THREE.SphereGeometry(0.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      add(ink(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 6), PAL.ink, 0), 0, 0.36);
      const prop = new THREE.Group(); prop.position.y = 0.44; g.add(prop);
      for (const s of [0, 1]) { const b = ink(new THREE.BoxGeometry(0.42, 0.012, 0.07), s ? 0xf2c94c : PAL.red, 0.008); b.rotation.y = s * Math.PI / 2; prop.add(b); }
      g.userData.spin = prop; g.position.set(0, 0.2, 0); break;
    }
    case 'flowerpot': {
      add(ink(new THREE.CylinderGeometry(0.2, 0.15, 0.24, 14), 0xb5552e, 0.02), 0, 0.1);
      g.add(band(0.205, 0.2, 0.05));
      add(ink(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), 0x55603a, 0), 0, 0.36);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; add(ink(new THREE.SphereGeometry(0.05, 8, 6), PAL.white, 0.008), Math.cos(a) * 0.07, 0.52, Math.sin(a) * 0.07); }
      add(ink(new THREE.SphereGeometry(0.045, 8, 6), 0xf2c94c, 0.008), 0, 0.52);
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'pan': {
      const pan = add(ink(new THREE.CylinderGeometry(0.3, 0.26, 0.07, 18), 0x3a3632, 0.02)); pan.position.y = 0.04;
      const h = add(ink(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), 0x3a3632, 0.012), 0.46, 0.06); h.rotation.z = Math.PI / 2 - 0.1;
      g.add(band(0.27, 0.0, 0.03));
      g.position.set(0, 0.3, 0.02); g.rotation.z = -0.12; break;
    }
    case 'pirate': {
      const body = add(ink(new THREE.CylinderGeometry(0.3, 0.34, 0.18, 3), PAL.ink, 0.02), 0, 0.06); body.rotation.y = Math.PI;
      add(ink(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), PAL.ink, 0.02), 0, 0.12);
      const sk = add(ink(new THREE.SphereGeometry(0.05, 8, 6), PAL.white, 0.008), 0, 0.12, -0.28);
      g.add(band(0.21, 0.02, 0.04)); sk.userData.detail = true;
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'horns': {
      for (const s of [-1, 1]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(s * (0.18 + k * 0.16), k * 0.3 - k * k * 0.05, -k * 0.05)); }
        const h = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.05, 6), toon(PAL.paper)); g.add(h);
        const tip = add(ink(new THREE.ConeGeometry(0.05, 0.1, 8), PAL.paper, 0.01), s * 0.34, 0.3, -0.05); tip.rotation.z = -s * 0.5;
      }
      g.add(band(0.32, -0.02, 0.05));
      g.position.set(0, 0.22, 0); break;
    }
    case 'viking': {
      add(ink(new THREE.SphereGeometry(0.33, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a8f93, 0.02));
      g.add(band(0.335, 0.02, 0.07));
      for (const s of [-1, 1]) { const h = add(ink(new THREE.ConeGeometry(0.07, 0.34, 10), PAL.paper, 0.012), s * 0.36, 0.2); h.rotation.z = -s * 0.9; }
      add(ink(new THREE.BoxGeometry(0.05, 0.22, 0.04), 0x8a8f93, 0.01), 0, 0.0, -0.33);
      g.position.set(0, 0.16, 0); break;
    }
    case 'fez': {
      add(ink(new THREE.CylinderGeometry(0.15, 0.19, 0.26, 14), PAL.red, 0.02), 0, 0.1);
      g.add(band(0.192, -0.01, 0.05));
      const tas = add(ink(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), PAL.ink, 0), 0.12, 0.16); tas.rotation.z = 0.5;
      add(ink(new THREE.ConeGeometry(0.04, 0.08, 6), PAL.ink, 0), 0.18, 0.08);
      g.position.set(0.05, 0.34, 0.02); g.rotation.z = -0.2; break;
    }
    case 'halo': {
      const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffe28a })), 0, 0.55); r.rotation.x = Math.PI / 2;
      g.userData.bob = r; break;
    }
    case 'crown': {
      add(ink(new THREE.CylinderGeometry(0.25, 0.25, 0.14, 16, 1, true), 0xd4a017, 0.015), 0, 0.06);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = add(ink(new THREE.ConeGeometry(0.06, 0.14, 6), 0xd4a017, 0.01), Math.cos(a) * 0.24, 0.18, Math.sin(a) * 0.24); p.userData.detail = true; }
      add(ink(new THREE.SphereGeometry(0.05, 8, 6), teamCol, 0.008), 0, 0.07, -0.25);
      g.position.set(0, 0.32, 0.02); break;
    }
    case 'tvhead': {
      const tv = add(ink(new THREE.BoxGeometry(0.5, 0.36, 0.34), 0x7a4a2a, 0.02), 0, 0.1);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), new THREE.MeshBasicMaterial({ color: 0xbfe3ff })); scr.position.set(-0.03, 0.1, -0.172); scr.rotation.y = Math.PI; g.add(scr);
      for (const s of [-1, 1]) { const a = add(ink(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), PAL.ink, 0), s * 0.1, 0.4); a.rotation.z = s * 0.5; }
      add(ink(new THREE.SphereGeometry(0.03, 6, 4), teamCol, 0.006), 0.19, 0.0, -0.172);
      g.userData.screen = scr; g.position.set(0, 0.3, 0); tv.userData.tv = true; break;
    }
    case 'plunger': {
      const cup = add(ink(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x7a2a1f, 0.02), 0, 0.0); cup.scale.set(1, 0.7, 1);
      add(ink(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), 0x9d6b3a, 0.012), 0, 0.42);
      g.add(band(0.045, 0.2, 0.06));
      g.position.set(0.05, 0.3, 0.02); g.rotation.z = -0.28; break;
    }
    case 'jester': {
      add(ink(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), teamCol, 0.02));
      for (const [s, col] of [[-1, 0xf2c94c], [1, 0x55603a]]) {
        const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new THREE.Vector3(s * (0.1 + k * 0.32), 0.18 + Math.sin(k * 3) * 0.15, 0)); }
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.06 * 1, 6), toon(col)));
        add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xd4a017, 0.008), s * 0.42, 0.18 + Math.sin(3) * 0.15);
      }
      g.position.set(0, 0.2, 0); break;
    }
    // ---- chapeus da Loja (03/11): so comprando, animados ----
    case 'ufo': { // disco voador girando com luzinhas e a cupula de vidro
      const disc = new THREE.Group(); g.add(disc);
      const plate = ink(new THREE.CylinderGeometry(0.42, 0.3, 0.09, 20), 0xbfc4cc, 0.02); disc.add(plate);
      const dome = ink(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x9fe3f0, 0.015); dome.position.y = 0.04; disc.add(dome);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe14a : 0x3cff6b })); l.position.set(Math.cos(a) * 0.38, -0.01, Math.sin(a) * 0.38); disc.add(l); }
      g.userData.spin = disc; g.position.set(0, 0.42, 0); break;
    }
    case 'bolo': { // bolo de aniversario com glace escorrendo e a vela acesa
      add(ink(new THREE.CylinderGeometry(0.27, 0.29, 0.2, 18), 0xf3d6b0, 0.02));
      add(ink(new THREE.CylinderGeometry(0.285, 0.285, 0.05, 18), 0xff8fb8, 0.012), 0, 0.09);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, d = add(ink(new THREE.SphereGeometry(0.045, 6, 4), 0xff8fb8, 0.008), Math.cos(a) * 0.28, 0.04, Math.sin(a) * 0.28); d.scale.y = 1.6; }
      add(ink(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), 0x7fd1d8, 0.008), 0, 0.2);
      const fl = add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb21a })), 0, 0.31); fl.scale.y = 1.6;
      g.userData.bob = fl; g.position.set(0, 0.36, 0); break;
    }
    case 'nuvem': { // nuvenzinha de chuva flutuando em cima da cabeca
      const cl = new THREE.Group(); g.add(cl);
      for (const [x, y, r] of [[0, 0, 0.17], [-0.17, -0.03, 0.13], [0.17, -0.03, 0.13], [0.07, 0.07, 0.12]]) { const s = ink(new THREE.SphereGeometry(r, 12, 8), 0x8a8f9a, 0.015); s.position.set(x, y, 0); cl.add(s); }
      for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 2, 4), new THREE.MeshBasicMaterial({ color: 0x7fd1d8 })); d.position.set(-0.15 + i * 0.1, -0.2 - (i % 2) * 0.06, 0); cl.add(d); }
      g.userData.bob = cl; g.position.set(0, 0.62, 0); break;
    }
    case 'tubarao': { // barbatana de tubarao saindo da cabeca, com a fita do time na base
      const fin = new THREE.Shape(); fin.moveTo(-0.16, 0); fin.quadraticCurveTo(-0.02, 0.18, 0.1, 0.42); fin.quadraticCurveTo(0.08, 0.16, 0.18, 0); fin.lineTo(-0.16, 0);
      const m = add(ink(new THREE.ExtrudeGeometry(fin, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), 0x6c7f8f, 0.015));
      m.rotation.y = Math.PI / 2; m.position.set(-0.06, 0, 0.02);
      g.add(band(0.12, 0.01, 0.04));
      g.position.set(0, 0.3, 0.04); break;
    }
    case 'sorvete': { // duas bolas de sorvete com a cereja balancando
      add(ink(new THREE.CylinderGeometry(0.24, 0.27, 0.12, 14), 0xd9a55b, 0.02));
      add(ink(new THREE.SphereGeometry(0.22, 14, 10), 0xffb7cf, 0.018), 0, 0.2);
      add(ink(new THREE.SphereGeometry(0.17, 14, 10), 0xfff1c9, 0.016), 0.02, 0.44);
      g.userData.bob = add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xc8102e, 0.008), 0.02, 0.63);
      g.position.set(0, 0.34, 0); break;
    }
    case 'alavanca': { // alavanca de fliperama: base, dois botoes e a bola vermelha balancando
      add(ink(new THREE.BoxGeometry(0.5, 0.1, 0.4), 0x2a2d3a, 0.02));
      add(ink(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8), 0xbfc4cc, 0.006), 0, 0.17);
      for (const [x, c] of [[0.16, 0xffd23a], [-0.16, 0x39d7ff]]) add(ink(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), c, 0.006), x, 0.065, 0.08);
      g.userData.bob = add(ink(new THREE.SphereGeometry(0.08, 12, 8), 0xe0483a, 0.01), 0, 0.33);
      g.position.set(0, 0.32, 0); break;
    }
    case 'cogumelo': { // chapeu de cogumelo vermelho de bolinhas
      const cap = new THREE.Group(); g.add(cap);
      const top = ink(new THREE.SphereGeometry(0.38, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xc8322a, 0.02); top.scale.y = 0.85; cap.add(top);
      for (const [x, y, z, r] of [[0, 0.32, 0, 0.07], [0.22, 0.19, 0.08, 0.055], [-0.2, 0.2, 0.12, 0.05], [0.04, 0.2, -0.24, 0.06], [-0.1, 0.22, 0.22, 0.045], [0.14, 0.16, 0.26, 0.04]]) { const d = ink(new THREE.SphereGeometry(r, 8, 6), 0xf6f0df, 0.006); d.position.set(x, y, z); cap.add(d); }
      add(ink(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 16), 0xf0e4c8, 0.012), 0, -0.015);
      g.userData.bob = cap; g.position.set(0, 0.28, 0); break;
    }
    default: return buildHat('bowler', teamCol);
  }
  return g;
}

// ---------- luvas ----------
let OVEN = null;
export function ovenTex() {
  return OVEN ||= canvasTex(64, 64, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#faf8f2' : '#c2392b'; g.fillRect(x * 16, y * 16, 16, 16); } });
}
export function styleGlove(glove, style, color) {
  const col = style === 'golden' ? 0xd4a017 : style === 'oven' ? 0xffffff : hex(color);
  const mat = style === 'oven' ? toon(0xffffff, { map: ovenTex() }) : toon(col);
  for (const c of [...glove.children]) if (c.userData.gloveExtra) glove.remove(c);
  glove.material = mat;
  for (const c of glove.children) if (c.isMesh && !c.userData.outline && c.material?.isMeshToonMaterial) c.material = mat;
  const base = glove.userData.baseScale ||= glove.scale.clone(); // luva Mickey ja vem achatada: o estilo multiplica por cima
  glove.scale.copy(base).multiplyScalar(style === 'boxing' ? 1.35 : style === 'mitten' ? 1.1 : 1);
  for (const c of glove.children) if (c.userData.finger) c.visible = !['mitten', 'oven', 'boxing'].includes(style); // luva sem dedos esconde os dedos
  const fg = glove.userData.fingerGeo; // luva numa geometria so (03/11): troca pela versao sem dedos (e o contorno junto)
  if (fg) { const geo = fg[['mitten', 'oven', 'boxing'].includes(style) ? 1 : 0]; if (glove.geometry !== geo) { glove.geometry = geo; for (const c of glove.children) if (c.material?.isShaderMaterial) c.geometry = smoothGeo(geo); } }
  const add = (m) => { m.userData.gloveExtra = true; glove.add(m); return m; };
  if (style === 'oven') { glove.scale.copy(base).multiplyScalar(1.15); const th = add(ink(new THREE.SphereGeometry(0.05, 8, 6), 0xffffff, 0.012)); th.material = mat; th.position.set(0.1, 0.02, -0.04); }
  if (style === 'mitten') { const th = add(ink(new THREE.SphereGeometry(0.05, 8, 6), col, 0.012)); th.position.set(0.1, 0.02, -0.04); }
  if (style === 'boxing') { const lace = add(ink(new THREE.TorusGeometry(0.08, 0.012, 4, 10), PAL.white, 0)); lace.position.set(0, 0.1, -0.02); lace.rotation.x = Math.PI / 2; }
  if (style === 'spiked') {
    const band = add(ink(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 12), PAL.ink, 0.01)); band.position.y = 0.13;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const s = add(ink(new THREE.ConeGeometry(0.025, 0.07, 6), PAL.white, 0.006)); s.position.set(Math.cos(a) * 0.14, 0.13, Math.sin(a) * 0.14); s.rotation.set(0, 0, 0); s.lookAt(Math.cos(a) * 2, 0.13, Math.sin(a) * 2); s.rotateX(Math.PI / 2); }
  }
  if (style === 'claw') for (const x of [-0.06, 0, 0.06]) { const c = add(ink(new THREE.ConeGeometry(0.022, 0.12, 6), PAL.paper, 0.006)); c.position.set(x, -0.04, -0.13); c.rotation.x = -Math.PI / 2 - 0.3; }
  if (style === 'golden') { const ring = add(ink(new THREE.TorusGeometry(0.035, 0.012, 6, 12), 0xffe28a, 0)); ring.position.set(0.02, -0.02, -0.11); }
}

// ---------- estampa do short (multiplica pela cor do time) ----------
const PATS = new Map();
export function patternTex(id) {
  if (id === 'plain') return null;
  if (PATS.has(id)) return PATS.get(id);
  const t = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,18,16,.55)'; g.strokeStyle = 'rgba(20,18,16,.55)';
    if (id === 'stripes') for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 14, h);
    if (id === 'dots') for (let y = 8; y < h; y += 32) for (let x = 8 + ((y / 32) % 2) * 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); }
    if (id === 'checker') for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 32 : 0; x < w; x += 64) g.fillRect(x, y, 32, 32);
    if (id === 'zigzag') { g.lineWidth = 9; for (let y = 16; y < h; y += 32) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? -8 : 8)); g.stroke(); } }
    if (id === 'filme') { g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16); g.fillStyle = 'rgba(250,248,242,.9)'; for (let x = 4; x < w; x += 22) { g.fillRect(x, 4, 10, 8); g.fillRect(x, h - 12, 10, 8); } }
    if (id === 'cortina') for (let x = 0; x < w; x += 24) { const gr = g.createLinearGradient(x, 0, x + 24, 0); gr.addColorStop(0, 'rgba(20,18,16,.05)'); gr.addColorStop(1, 'rgba(20,18,16,.6)'); g.fillStyle = gr; g.fillRect(x, 0, 24, h); }
    if (id === 'stars') { g.fillStyle = 'rgba(250,248,242,.9)'; for (let y = 16; y < h; y += 42) for (let x = 16 + ((y / 42) % 2) * 20; x < w; x += 42) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 4 : 10; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); } }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2);
  PATS.set(id, t);
  return t;
}

// ---------- efeitos em volta do boneco ----------
const FXTEX = new Map();
// logo "Rovex" classic text em branco (bone da Rovex): carregado uma vez
let rovexTex = null;
function rovexText() {
  if (!rovexTex) { rovexTex = new THREE.TextureLoader().load(import.meta.env.BASE_URL + 'brand/rovex-classic-white.png'); rovexTex.colorSpace = THREE.SRGBColorSpace; rovexTex.anisotropy = 4; }
  return rovexTex;
}
function fxTex(kind) {
  if (FXTEX.has(kind)) return FXTEX.get(kind);
  const t = canvasTex(64, 64, (g) => {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (kind === 'spark') { g.strokeStyle = '#141210'; g.lineWidth = 9; const p = () => { g.beginPath(); g.moveTo(36, 4); g.lineTo(20, 32); g.lineTo(34, 32); g.lineTo(24, 60); }; p(); g.stroke(); g.strokeStyle = '#7fe6ff'; g.lineWidth = 4; p(); g.stroke(); }
    if (kind === 'fire') { const gr = g.createRadialGradient(32, 40, 2, 32, 36, 26); gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.5, '#ff7a1a'); gr.addColorStop(1, 'rgba(190,40,20,.85)'); g.strokeStyle = '#141210'; g.lineWidth = 4; g.fillStyle = gr; g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(58, 34, 32, 62); g.quadraticCurveTo(6, 34, 32, 2); g.fill(); }
    if (kind === 'water') { g.fillStyle = '#7fd1d8'; g.strokeStyle = '#141210'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 6); g.quadraticCurveTo(54, 36, 32, 58); g.quadraticCurveTo(10, 36, 32, 6); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(26, 38, 4, 8, 0.3, 0, Math.PI * 2); g.fill(); }
    if (kind === 'ether') { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(190,120,255,.95)'); gr.addColorStop(0.5, 'rgba(70,20,110,.7)'); gr.addColorStop(1, 'rgba(20,0,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill(); }
    if (kind === 'confetti') { const cs = ['#a83a2c', '#f2c94c', '#2f5b8a', '#7fb069', '#b07cc6']; for (let i = 0; i < 5; i++) { g.fillStyle = cs[i]; g.save(); g.translate(12 + i * 10, 14 + (i % 3) * 16); g.rotate(i); g.fillRect(-5, -3, 10, 6); g.restore(); } }
    if (kind === 'stink') { g.strokeStyle = '#7fb069'; g.lineWidth = 6; for (const x of [20, 36]) { g.beginPath(); for (let y = 60; y > 4; y -= 4) g.lineTo(x + Math.sin(y * 0.25) * 6, y); g.stroke(); } }
    if (kind === 'notes') { g.fillStyle = '#141210'; g.beginPath(); g.ellipse(22, 48, 10, 7, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(29, 10, 5, 38); g.beginPath(); g.moveTo(34, 10); g.quadraticCurveTo(54, 16, 50, 34); g.quadraticCurveTo(48, 22, 34, 22); g.fill(); }
  });
  FXTEX.set(kind, t);
  return t;
}

// cada efeito: N figurinhas que giram/sobem em volta do corpo; tick(dt, t) anima
export function buildFx(id) {
  if (!id || id === 'none') return null;
  const group = new THREE.Group();
  const N = id === 'confetti' ? 10 : id === 'ether' ? 9 : 8;
  const mat = new THREE.SpriteMaterial({ map: fxTex(id), transparent: true, depthWrite: false, blending: THREE.NormalBlending });
  const parts = [];
  for (let i = 0; i < N; i++) {
    const s = new THREE.Sprite(mat.clone()); s.scale.setScalar(id === 'confetti' ? 0.32 : 0.28);
    group.add(s); parts.push({ s, a: (i / N) * Math.PI * 2, k: Math.random(), sp: 0.6 + Math.random() * 0.8 });
  }
  const tick = (dt, t) => {
    for (const p of parts) {
      p.k = (p.k + dt * p.sp * (id === 'fire' ? 0.9 : 0.45)) % 1;
      const r = id === 'ether' ? 0.75 - p.k * 0.2 : 0.62, a = p.a + t * (id === 'spark' ? 2.6 : 0.9);
      const y = id === 'water' ? 2.2 - p.k * 2.0 : id === 'spark' ? 0.6 + ((p.k * 7) % 1.6) : 0.3 + p.k * 1.9;
      p.s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      p.s.material.opacity = id === 'spark' ? (Math.sin(t * 30 + p.a * 9) > 0.2 ? 1 : 0) : Math.sin(p.k * Math.PI);
      p.s.material.rotation = id === 'confetti' || id === 'notes' ? Math.sin(t * 3 + p.a) * 0.6 : 0;
    }
  };
  return { group, tick };
}
