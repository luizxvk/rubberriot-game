// Camuflagens procedurais (estaticas e animadas). Nomes originais, nada de marca de outro jogo.
// O desenho roda no shader da arma, em espaco do objeto (fica preso na arma, nao na tela).
export const camoTime = { value: 0 };

export const CAMOS = [
  { id: 'none', code: 0 },
  // estaticas
  { id: 'tiger', code: 1, req: { wpn: 2 } },
  { id: 'digital', code: 2, req: { wpn: 4 } },
  { id: 'forest', code: 3, req: { wpn: 6 } },
  { id: 'urban', code: 4, req: { wpn: 8 } },
  { id: 'zebra', code: 13, req: { wpn: 3 } },
  { id: 'circus', code: 14, req: { wpn: 5 } },
  { id: 'polka', code: 15, req: { wpn: 7 } },
  { id: 'newsprint', code: 16, req: { wpn: 9 } },
  // animadas
  { id: 'gold', code: 5, anim: true, req: { wpn: 10 } },
  { id: 'diamond', code: 6, anim: true, req: { wpn: 13 } },
  { id: 'ink', code: 7, anim: true, req: { wpn: 16 } },
  { id: 'lava', code: 8, anim: true, req: { wpn: 18 } },
  { id: 'neonice', code: 9, anim: true, req: { wpn: 20 } },
  { id: 'rainbow', code: 10, anim: true, req: { player: 25 } },
  { id: 'aether', code: 11, anim: true, req: { player: 38 } },
  { id: 'void', code: 12, anim: true, req: { player: 50, wpn: 20 } },
  { id: 'filmreel', code: 17, anim: true, req: { wpn: 11 } },
  { id: 'toonfire', code: 18, anim: true, req: { wpn: 12 } },
  { id: 'electric', code: 19, anim: true, req: { wpn: 14 } },
  { id: 'hypno', code: 20, anim: true, req: { wpn: 15 } },
  { id: 'aquarium', code: 21, anim: true, req: { wpn: 17 } },
  { id: 'chrome', code: 22, anim: true, req: { wpn: 19 } },
  { id: 'phantom', code: 23, anim: true, req: { player: 30 } },
  // reativas: mudam de estagio a cada 2 abates na mesma vida (2, 4, 6)
  { id: 'ember', code: 24, anim: true, react: true, req: { player: 20, wpn: 16 } },
  { id: 'inkreact', code: 25, anim: true, react: true, req: { player: 42, wpn: 20 } },
  // Elite da Rovex: reativa exclusiva de quem assina (gratis enquanto a assinatura estiver ativa)
  { id: 'hexelite', code: 30, anim: true, react: true, elite: true },
  // lendarias: shader proprio + efeito FORA da arma (fx, ver camofx.js). So vem com a variante de elite.
  { id: 'hellfire', code: 26, anim: true, legend: true, fx: 'flame' },
  { id: 'tesla', code: 27, anim: true, legend: true, fx: 'storm' },
  { id: 'inkwell', code: 28, anim: true, legend: true, fx: 'drip' },
  { id: 'marquee', code: 29, anim: true, legend: true, fx: 'stars' },
];
export const camoById = (id) => CAMOS.find(c => c.id === id) || CAMOS[0];

// cor de amostra pra lista do arsenal (css)
export const CAMO_SWATCH = {
  none: 'repeating-linear-gradient(45deg,#ece9e1 0 6px,#dcd7cb 6px 12px)',
  tiger: 'repeating-linear-gradient(115deg,#d9822b 0 7px,#1b1916 7px 11px)',
  digital: 'conic-gradient(#5d6b4e 25%,#8a937a 0 50%,#3f4a32 0 75%,#b5b89f 0)',
  forest: 'radial-gradient(circle at 30% 30%,#4f6b33 30%,transparent 31%),radial-gradient(circle at 70% 60%,#6b5235 28%,transparent 29%),#2f4226',
  urban: 'radial-gradient(circle at 35% 40%,#9a9a96 30%,transparent 31%),radial-gradient(circle at 70% 65%,#4a4a48 26%,transparent 27%),#6e6e6a',
  gold: 'linear-gradient(120deg,#8a6312,#f6d36b 45%,#fff4c4 50%,#c9952b 60%,#7a5410)',
  diamond: 'linear-gradient(135deg,#bfe8ff,#f6c6ff 35%,#fff 50%,#b6ffd9 65%,#c7d2ff)',
  ink: 'radial-gradient(circle at 30% 40%,#141210 28%,transparent 30%),radial-gradient(circle at 70% 65%,#141210 22%,transparent 24%),#ece9e1',
  lava: 'radial-gradient(circle at 40% 50%,#ffb21a 8%,#ff4a1a 18%,#2a1210 40%),#1a0c0a',
  neonice: 'linear-gradient(140deg,#0f2a3d,#36d6ff 50%,#0f2a3d)',
  rainbow: 'linear-gradient(90deg,#ff3b30,#ffb21a,#e3e34a,#3cff6b,#36d6ff,#7a5bff,#ff3bd0)',
  aether: 'radial-gradient(circle at 40% 45%,#ff2d55 6%,#7a1bd6 22%,#120818 55%),#07040a',
  zebra: 'repeating-linear-gradient(120deg,#f2efe6 0 6px,#141210 6px 11px)',
  circus: 'conic-gradient(#a83a2c 25%,#ece9e1 0 50%,#a83a2c 0 75%,#ece9e1 0) 0 0/12px 12px',
  polka: 'radial-gradient(circle,#ece9e1 30%,transparent 32%) 0 0/10px 10px,#2f5b8a',
  newsprint: 'radial-gradient(circle,#141210 35%,transparent 38%) 0 0/5px 5px,#e8e2d2',
  filmreel: 'linear-gradient(#141210 0 18%,transparent 18% 82%,#141210 82%),repeating-linear-gradient(90deg,#d8d2c4 0 14px,#141210 14px 16px)',
  toonfire: 'linear-gradient(0deg,#a8180a,#ff6a00 40%,#ffd23a 75%,#fff2b0)',
  electric: 'linear-gradient(135deg,#0b1430 40%,#7fe6ff 48%,#fff 50%,#7fe6ff 52%,#0b1430 60%)',
  hypno: 'repeating-conic-gradient(#141210 0 20deg,#ece9e1 20deg 40deg)',
  aquarium: 'radial-gradient(circle at 30% 70%,#bff3ff 6%,transparent 8%),radial-gradient(circle at 60% 40%,#bff3ff 5%,transparent 7%),linear-gradient(#2aa3c8,#0c4f74)',
  chrome: 'linear-gradient(160deg,#f6f6f4,#8d8e92 30%,#ffffff 45%,#4a4b50 60%,#d9dade)',
  phantom: 'radial-gradient(circle at 50% 40%,#e9f7ff 20%,#9fc4dd 50%,#56708a)',
  ember: 'linear-gradient(135deg,#5a5652 30%,#ff6a1a 48%,#ffd23a 52%,#3a3633 70%)',
  inkreact: 'radial-gradient(circle at 35% 45%,#141210 22%,transparent 24%),radial-gradient(circle at 70% 65%,#a83a2c 14%,transparent 16%),#ece9e1',
  hexelite: 'radial-gradient(circle at 50% 50%,#b48cff 8%,transparent 10%) 0 0/12px 12px,linear-gradient(135deg,#2a1150,#6d3fd6 55%,#e3c14a)',
  hellfire: 'repeating-radial-gradient(circle at 50% 110%,#120806 0 5px,#ff6a1a 5px 6px,#120806 6px 9px),#120806',
  tesla: 'repeating-linear-gradient(90deg,#c9783f 0 4px,#7a3a18 4px 5px,#7fe6ff 5px 6px,#7a3a18 6px 7px)',
  inkwell: 'radial-gradient(ellipse 22% 30% at 32% 45%,#141210 30%,#ece9e1 34% 58%,transparent 62%),radial-gradient(ellipse 22% 30% at 68% 45%,#141210 30%,#ece9e1 34% 58%,transparent 62%),#08070a',
  marquee: 'radial-gradient(circle,#ffe7a0 30%,#ffb21a 45%,transparent 50%) 0 0/9px 9px,linear-gradient(#b8862b 0 18%,#a3201a 18% 82%,#b8862b 82%)',
  void: 'radial-gradient(circle at 30% 30%,#fff 1px,transparent 2px),radial-gradient(circle at 70% 60%,#fff 1px,transparent 2px),radial-gradient(circle at 50% 50%,#5b3fd6,#1b0f3d 55%,#05030d)',
};

// GLSL: devolve cor da camuflagem e um brilho proprio (emissivo) pras animadas
export const CAMO_GLSL = /* glsl */`
uniform float uCamo; uniform float uTime; uniform float uReact;
varying vec3 vCamoPos;
float c_h(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float c_n(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(c_h(i), c_h(i + vec3(1,0,0)), f.x), mix(c_h(i + vec3(0,1,0)), c_h(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(c_h(i + vec3(0,0,1)), c_h(i + vec3(1,0,1)), f.x), mix(c_h(i + vec3(0,1,1)), c_h(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float c_fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * c_n(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
vec3 c_hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
// celula de voronoi: x = distancia, y = id
vec2 c_vor(vec3 p) {
  vec3 i = floor(p), f = fract(p); float d = 9.0, id = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
    vec3 g = vec3(float(x), float(y), float(z)), o = vec3(c_h(i + g), c_h(i + g + 7.1), c_h(i + g + 3.3));
    float k = length(g + o - f); if (k < d) { d = k; id = c_h(i + g + 1.9); }
  }
  return vec2(d, id);
}
vec3 camoColor(int k, vec3 p, float t, float lum, out vec3 glow) {
  glow = vec3(0.0);
  float sh = clamp(lum * 2.6, 0.45, 1.25); // sombreado original da arma
  if (k == 1) { // tigre
    float s = sin(p.z * 9.0 + c_fbm(p * 3.0) * 6.0 + p.y * 3.0);
    return mix(vec3(0.85, 0.45, 0.12), vec3(0.05), smoothstep(0.35, 0.6, s)) * sh;
  }
  if (k == 2) { // digital: blocos
    vec3 q = floor(p * 14.0) / 14.0; float n = c_fbm(q * 3.0);
    return (n < 0.42 ? vec3(0.25, 0.3, 0.2) : n < 0.55 ? vec3(0.36, 0.42, 0.3) : n < 0.68 ? vec3(0.54, 0.58, 0.47) : vec3(0.7, 0.72, 0.62)) * sh;
  }
  if (k == 3) { // floresta
    float n = c_fbm(p * 2.6);
    return (n < 0.45 ? vec3(0.18, 0.26, 0.15) : n < 0.6 ? vec3(0.31, 0.42, 0.2) : vec3(0.42, 0.32, 0.21)) * sh;
  }
  if (k == 4) { // urbano
    float n = c_fbm(p * 2.8 + 4.0);
    return (n < 0.45 ? vec3(0.29) : n < 0.6 ? vec3(0.45) : vec3(0.62)) * sh;
  }
  if (k == 5) { // ouro polido com brilho correndo
    vec3 g = mix(vec3(0.55, 0.38, 0.07), vec3(1.0, 0.82, 0.4), c_fbm(p * 6.0) * 0.5 + lum * 1.6);
    float band = smoothstep(0.92, 1.0, sin((p.z - p.y) * 2.2 - t * 2.4));
    glow = vec3(1.0, 0.9, 0.55) * band * 0.9;
    return g;
  }
  if (k == 6) { // diamante: facetas prismaticas
    vec2 v = c_vor(p * 6.0);
    vec3 c = mix(vec3(0.85, 0.93, 1.0), c_hue(fract(v.y + t * 0.08)), 0.45) * (0.75 + v.x * 0.5);
    float sp = step(0.985, c_h(floor(p * 40.0) + floor(t * 6.0)));
    glow = c * 0.25 + vec3(sp) * 1.5;
    return c;
  }
  if (k == 7) { // tinta viva: manchas que nadam
    float n = c_fbm(p * 2.4 + vec3(0.0, t * 0.35, t * 0.2));
    float ink = smoothstep(0.5, 0.53, n);
    float rim = smoothstep(0.47, 0.5, n) - ink;
    return mix(vec3(0.93, 0.9, 0.84), vec3(0.04), ink) * (1.0 - rim * 0.4);
  }
  if (k == 8) { // lava: pedra escura com rachaduras incandescentes
    float n = c_fbm(p * 2.2 + vec3(0.0, -t * 0.25, 0.0));
    float crack = 1.0 - smoothstep(0.0, 0.06, abs(n - 0.5));
    float pulse = 0.7 + 0.3 * sin(t * 3.0 + p.z * 4.0);
    glow = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.75, 0.2), crack) * crack * pulse * 1.8;
    return mix(vec3(0.08, 0.04, 0.03), vec3(0.5, 0.1, 0.02), crack);
  }
  if (k == 9) { // gelo neon
    vec2 v = c_vor(p * 4.0);
    float edge = 1.0 - smoothstep(0.02, 0.09, v.x - 0.0) ;
    float line = smoothstep(0.06, 0.0, abs(c_fbm(p * 3.0 + t * 0.15) - 0.5));
    glow = vec3(0.2, 0.85, 1.0) * line * (0.6 + 0.4 * sin(t * 4.0 + p.z * 6.0)) * 1.6;
    return mix(vec3(0.05, 0.16, 0.26), vec3(0.55, 0.85, 1.0), v.y * 0.4 + edge * 0.2) * sh;
  }
  if (k == 10) { // arco-iris
    vec3 c = c_hue(fract(p.z * 0.6 + p.y * 0.3 - t * 0.25));
    glow = c * 0.35;
    return c * sh;
  }
  if (k == 11) { // eter sombrio: preto e roxo com veias de luz fluindo
    vec3 q = p * 1.8 + vec3(c_fbm(p * 1.5 + t * 0.2), c_fbm(p * 1.5 - t * 0.17), 0.0) * 1.6;
    float n = c_fbm(q);
    float vein = smoothstep(0.035, 0.0, abs(n - 0.5));
    float pulse = 0.6 + 0.4 * sin(t * 2.0 + n * 12.0);
    glow = mix(vec3(0.55, 0.1, 1.0), vec3(1.0, 0.12, 0.3), sin(t + p.z) * 0.5 + 0.5) * vein * pulse * 2.2;
    return mix(vec3(0.02, 0.01, 0.03), vec3(0.16, 0.05, 0.24), n);
  }
  if (k == 12) { // vazio estelar: nebulosa girando + estrelas piscando
    float a = t * 0.12;
    vec3 q = vec3(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a), p.z);
    float n = c_fbm(q * 1.6 + vec3(0.0, 0.0, t * 0.1));
    vec3 neb = mix(vec3(0.03, 0.02, 0.09), mix(vec3(0.25, 0.1, 0.55), vec3(0.1, 0.35, 0.85), c_fbm(q * 3.0)), smoothstep(0.35, 0.75, n));
    vec3 cell = floor(p * 26.0);
    float star = step(0.975, c_h(cell)) * (0.5 + 0.5 * sin(t * 5.0 + c_h(cell + 2.0) * 40.0));
    glow = neb * 0.55 + vec3(star) * 1.8;
    return neb;
  }
  if (k == 13) { // zebra: listras curvas
    float s = sin(p.z * 7.0 + sin(p.y * 4.0 + p.x * 3.0) * 1.6 + c_fbm(p * 2.0) * 3.0);
    return mix(vec3(0.94, 0.92, 0.86), vec3(0.06), smoothstep(-0.1, 0.1, s)) * sh;
  }
  if (k == 14) { // xadrez de circo, entortado
    vec3 q = p * 5.0 + vec3(sin(p.z * 2.0) * 0.6, 0.0, sin(p.y * 2.0) * 0.6);
    float c = mod(floor(q.y) + floor(q.z) + floor(q.x), 2.0);
    return mix(vec3(0.66, 0.2, 0.15), vec3(0.93, 0.9, 0.84), c) * sh;
  }
  if (k == 15) { // bolinhas vintage
    vec2 q = fract(vec2(p.z, p.y + p.x * 0.5) * 7.0) - 0.5;
    float dotv = smoothstep(0.3, 0.27, length(q));
    return mix(vec3(0.18, 0.36, 0.55), vec3(0.93, 0.9, 0.84), dotv) * sh;
  }
  if (k == 16) { // jornal: reticula de pontos que segue a sombra
    vec2 q = fract(vec2(p.z + p.x, p.y) * 22.0) - 0.5;
    float r = (1.0 - clamp(lum * 2.2, 0.0, 1.0)) * 0.55 + 0.08;
    float ink = smoothstep(r, r - 0.06, length(q));
    return mix(vec3(0.91, 0.88, 0.8), vec3(0.08, 0.07, 0.06), ink);
  }
  if (k == 17) { // rolo de filme: tira correndo com furos e quadro piscando
    float z = p.z * 2.4 - t * 0.9, fr = fract(z), row = abs(fract(p.y * 2.6) - 0.5);
    float holes = step(0.38, row) * step(0.5, fract(z * 4.0));
    float flick = 0.82 + 0.18 * c_h(vec3(floor(t * 12.0)));
    vec3 frame = mix(vec3(0.82, 0.79, 0.72), vec3(0.25), c_fbm(vec3(floor(z), p.y * 3.0, 0.0) * 2.0)) * flick;
    vec3 c = mix(frame, vec3(0.06), max(step(0.42, row), step(0.94, fr)));
    return mix(c, vec3(0.93), holes);
  }
  if (k == 18) { // fogo de desenho: chamas em faixas chapadas subindo
    float n = c_fbm(vec3(p.z * 2.0, p.y * 1.4 - t * 1.6, p.x)) + fract(p.y * 0.5) * 0.35;
    vec3 c = n < 0.45 ? vec3(0.6, 0.06, 0.02) : n < 0.6 ? vec3(1.0, 0.36, 0.0) : n < 0.75 ? vec3(1.0, 0.78, 0.15) : vec3(1.0, 0.96, 0.72);
    glow = c * smoothstep(0.55, 0.9, n) * 0.6;
    return c;
  }
  if (k == 19) { // eletrica: raios estalando sobre azul escuro
    float bolt = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i), seed = floor(t * 8.0 + fi * 3.1);
      float y = (c_h(vec3(seed, fi, 1.0)) - 0.5) * 0.8 + (c_n(vec3(p.z * 6.0, seed, fi)) - 0.5) * 0.35;
      float py = fract(p.y * 0.9 + fi * 0.33) - 0.5; // repete pela arma toda (a peca fica longe da origem)
      bolt = max(bolt, smoothstep(0.03, 0.0, abs(py - y)) * step(0.4, c_h(vec3(seed, fi, 7.0))));
    }
    glow = vec3(0.5, 0.9, 1.0) * bolt * 2.2;
    return mix(vec3(0.04, 0.07, 0.16), vec3(0.85, 0.97, 1.0), bolt) * (0.8 + 0.2 * sh);
  }
  if (k == 20) { // hipnose: espiral girando (olho de desenho antigo)
    vec2 q = fract(vec2(p.z, p.y) * 1.5) * 2.0 - 1.0;
    float a = atan(q.y, q.x), r = length(q);
    float s = sin(a + r * 14.0 - t * 5.0);
    return mix(vec3(0.94, 0.91, 0.84), vec3(0.07), step(0.0, s)) * sh;
  }
  if (k == 21) { // aquario: caustica de agua + bolhas subindo
    vec2 v = c_vor(vec3(p.z * 3.0, p.y * 3.0 + t * 0.3, t * 0.25));
    float caus = smoothstep(0.35, 0.0, v.x) * 0.6;
    vec2 b = vec2(p.z * 5.0, p.y * 5.0 - t * 1.4); vec2 cell = floor(b), f = fract(b) - 0.5;
    float bub = step(0.7, c_h(vec3(cell, 3.0))) * smoothstep(0.22, 0.18, length(f)) * smoothstep(0.1, 0.16, length(f));
    vec3 c = mix(vec3(0.03, 0.27, 0.42), vec3(0.15, 0.62, 0.78), fract(p.y * 0.4)) + caus * vec3(0.7, 1.0, 1.0);
    glow = vec3(0.7, 1.0, 1.0) * (caus * 0.3 + bub);
    return c;
  }
  if (k == 22) { // cromo liquido: reflexo escorrendo
    float n = c_fbm(p * 1.8 + vec3(0.0, -t * 0.4, t * 0.15));
    float band = sin((p.y + n * 1.5) * 9.0 - t * 1.2) * 0.5 + 0.5;
    vec3 c = mix(vec3(0.18, 0.19, 0.22), vec3(0.97), smoothstep(0.2, 0.85, band));
    glow = vec3(1.0) * smoothstep(0.93, 1.0, band) * 0.6;
    return c * (0.75 + lum * 0.6);
  }
  if (k == 23) { // fantasma: claro, ondulando, com veu que passa
    float n = c_fbm(p * 2.0 + vec3(t * 0.3, sin(t) * 0.3, 0.0));
    float veil = smoothstep(0.2, 0.0, abs(fract(p.z * 0.7 - t * 0.35) - 0.5));
    vec3 c = mix(vec3(0.55, 0.68, 0.8), vec3(0.95, 0.99, 1.0), n);
    glow = vec3(0.6, 0.85, 1.0) * (veil * 0.7 + n * 0.25);
    return c;
  }
  if (k == 24) { // reativa brasa: estagios 0..3 com os abates
    float n = c_fbm(p * 2.4 + vec3(0.0, -t * 0.3 * uReact, 0.0));
    float crack = 1.0 - smoothstep(0.0, 0.05 + 0.03 * uReact, abs(n - 0.5));
    vec3 ash = mix(vec3(0.3, 0.29, 0.28), vec3(0.5, 0.48, 0.46), n) * sh;
    if (uReact < 0.5) return ash;
    if (uReact < 1.5) { glow = vec3(1.0, 0.35, 0.05) * crack * 1.6; return mix(ash, vec3(0.6, 0.15, 0.03), crack); }
    if (uReact < 2.5) {
      float fl = c_fbm(vec3(p.z * 3.0, p.y * 2.0 - t * 2.0, p.x)) + fract(p.y * 0.5) * 0.3;
      vec3 c = fl < 0.55 ? mix(ash * 0.5, vec3(0.7, 0.12, 0.02), crack) : fl < 0.7 ? vec3(1.0, 0.4, 0.0) : vec3(1.0, 0.82, 0.25);
      glow = c * smoothstep(0.5, 0.85, fl) + vec3(1.0, 0.35, 0.05) * crack;
      return c;
    }
    vec3 gold = mix(vec3(0.6, 0.38, 0.06), vec3(1.0, 0.86, 0.45), c_fbm(p * 5.0 + t * 0.2) * 0.6 + lum);
    glow = vec3(1.0, 0.65, 0.2) * (0.25 + crack) + vec3(1.0, 0.9, 0.6) * smoothstep(0.93, 1.0, sin((p.z - p.y) * 2.5 - t * 3.0));
    return gold;
  }
  if (k == 25) { // reativa tinta: papel limpo -> respingos -> escorrendo -> tinta viva com vermelho
    float n = c_fbm(p * 2.6 + vec3(0.0, uReact > 2.5 ? t * 0.4 : 0.0, 0.0));
    float col = floor(p.z * 3.0);
    float drip = step(1.5, uReact) * smoothstep(0.55, 0.5, fract(p.z * 3.0 + c_h(vec3(col)) * 2.0)) * smoothstep(0.0, 0.6, fract(-p.y * 0.8 + t * 0.15));
    float th = 0.72 - uReact * 0.09;
    float ink = max(smoothstep(th, th + 0.02, n), drip);
    vec3 c = mix(vec3(0.93, 0.9, 0.84) * sh, vec3(0.05), ink);
    if (uReact > 2.5) { float red = smoothstep(0.62, 0.64, c_fbm(p * 3.3 - t * 0.2)); c = mix(c, vec3(0.62, 0.08, 0.06), red); glow = vec3(0.8, 0.05, 0.03) * red * 0.5; }
    return c;
  }
  if (k == 26) { // inferno de palco: madeira queimada com gravura art deco (leque e raios) em brasa
    vec2 q = vec2(p.z, p.y) * 1.7; vec2 cl = fract(q) - vec2(0.5, 0.0);
    float r = length(cl), a = atan(cl.x, cl.y);
    float arcs = abs(fract(r * 4.0 - t * 0.35) - 0.5);
    float rays = abs(fract(a * 1.6) - 0.5) * r * 2.4;
    float line = 1.0 - smoothstep(0.0, 0.07, min(arcs, rays));
    float flick = 0.55 + 0.45 * c_n(vec3(q * 3.0, t * 2.2));
    vec3 hot = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.82, 0.3), flick);
    float emb = step(0.985, c_h(floor(vec3(p.z * 14.0, p.y * 14.0 - t * 3.0, p.x * 14.0))));
    glow = hot * line * flick * 2.0 + vec3(1.0, 0.6, 0.15) * emb * 1.6;
    return mix(vec3(0.05, 0.03, 0.025), vec3(0.2, 0.08, 0.03), c_fbm(p * 3.0)) * sh * (1.0 - line * 0.5) + hot * line * 0.35;
  }
  if (k == 27) { // bobina tesla: fio de cobre enrolado; os vaos entre as voltas acendem quando o pulso passa
    float w = fract(p.z * 13.0 + p.y * 0.35);
    float wire = smoothstep(0.08, 0.4, w) * smoothstep(0.92, 0.6, w);
    vec3 copper = mix(vec3(0.32, 0.13, 0.05), vec3(0.98, 0.62, 0.36), wire) * (0.55 + lum * 0.9);
    float gap = 1.0 - smoothstep(0.0, 0.1, min(w, 1.0 - w));
    float pulse = smoothstep(0.86, 1.0, sin(p.z * 2.6 - t * 7.0)) + smoothstep(0.93, 1.0, sin(p.z * 5.1 + t * 4.3)) * 0.6;
    float spec = smoothstep(0.9, 1.0, wire) * 0.4;
    glow = vec3(0.35, 0.82, 1.0) * gap * (0.25 + pulse * 2.4) + vec3(1.0, 0.75, 0.5) * spec;
    return mix(copper, vec3(0.6, 0.9, 1.0), gap * pulse * 0.7);
  }
  if (k == 28) { // poco de nanquim: tinta preta brilhando, com olhos de desenho que piscam e olham em volta
    vec2 q = vec2(p.z, p.y) * 3.2; vec2 id = floor(q), f = fract(q) - 0.5;
    float hv = c_h(vec3(id, 5.0));
    vec3 ink = vec3(0.025, 0.022, 0.03) + vec3(0.25) * smoothstep(0.96, 1.0, sin((p.z + p.y * 0.6) * 4.0 - t * 1.3));
    if (hv > 0.55) {
      float blink = step(0.06, fract(t * 0.23 + hv * 7.0));
      vec2 e = f + vec2((hv - 0.75) * 0.3, 0.0);
      vec2 eye = e / vec2(0.2, 0.27 * blink + 0.015);
      float white = smoothstep(1.0, 0.9, length(eye));
      vec2 look = vec2(sin(t * 0.9 + hv * 20.0), cos(t * 0.7 + hv * 13.0)) * 0.07;
      float pupil = smoothstep(0.1, 0.085, length((e - look) / vec2(1.0, 1.25)));
      float rim = smoothstep(1.12, 1.0, length(eye)) - white;
      vec3 c = mix(ink, vec3(0.94, 0.91, 0.84), white);
      c = mix(c, vec3(0.02), max(pupil * white, rim));
      glow = vec3(0.9, 0.88, 0.8) * white * (1.0 - pupil) * 0.35;
      return c;
    }
    glow = ink * 0.5;
    return ink;
  }
  if (k == 29) { // letreiro de teatro: laca vermelha, frisos dourados e fileiras de lampadas correndo
    float row = fract(p.y * 2.4);
    float trim = 1.0 - smoothstep(0.06, 0.1, abs(row - 0.5));
    vec3 lac = mix(vec3(0.42, 0.04, 0.03), vec3(0.85, 0.12, 0.08), lum * 1.5) ;
    vec3 gold = mix(vec3(0.55, 0.37, 0.08), vec3(1.0, 0.85, 0.42), c_fbm(p * 6.0) * 0.5 + lum);
    vec2 b = vec2(fract(p.z * 9.0) - 0.5, (row - 0.5) * 3.2);
    float bulb = smoothstep(0.3, 0.22, length(b));
    float on = step(0.34, fract(floor(p.z * 9.0) / 3.0 - t * 1.8));
    vec3 c = mix(lac, gold, trim);
    vec3 lamp = mix(vec3(0.35, 0.22, 0.08), vec3(1.0, 0.92, 0.6), on);
    c = mix(c, lamp, bulb);
    glow = vec3(1.0, 0.75, 0.3) * bulb * on * 2.0 + gold * trim * smoothstep(0.95, 1.0, sin(p.z * 1.4 - t * 2.0)) * 0.8;
    return c;
  }
  if (k == 30) { // favo elite (reativa, assinante Elite da Rovex): favo violeta; bordas acendem, pulsam e douram
    vec2 q = vec2(p.z, p.y) * 4.0, rr = vec2(1.0, 1.732), hh = rr * 0.5;
    vec2 a = mod(q, rr) - hh, b = mod(q - hh, rr) - hh;
    vec2 g = dot(a, a) < dot(b, b) ? a : b, id = q - g;
    vec2 ap = abs(g); float hd = max(dot(ap, vec2(0.5, 0.866)), ap.x);
    float line = 1.0 - smoothstep(0.0, 0.05, 0.5 - hd);
    float cv = c_h(vec3(id, 1.0));
    vec3 base = mix(vec3(0.12, 0.05, 0.26), vec3(0.26, 0.12, 0.5), cv) * sh;
    vec3 c = mix(base, vec3(0.05, 0.02, 0.1), line);
    if (uReact < 0.5) return c;
    vec3 vio = vec3(0.62, 0.38, 1.0), gold = vec3(1.0, 0.8, 0.35);
    float wave = 0.5 + 0.5 * sin(id.x * 0.6 + id.y * 0.3 - t * 3.0);
    vec3 edge = uReact > 2.5 ? gold : vio;
    c = mix(c, edge, line);
    glow = edge * line * (uReact > 1.5 ? 0.8 + wave * 1.2 : 0.9);
    if (uReact > 1.5) glow += vio * smoothstep(0.7, 1.0, wave) * (0.25 + cv * 0.3);
    if (uReact > 2.5) glow += vec3(1.0, 0.9, 0.6) * step(0.985, c_h(vec3(id, floor(t * 5.0))));
    return c;
  }
  return vec3(1.0);
}
`;
