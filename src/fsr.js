// FSR 1.0 (14/11, pedido dele): com a Resolucao abaixo de 100% a cena e desenhada menor e AMPLIADA pela tecnica da AMD
// (EASU: amplia seguindo as bordas, sem borrar; RCAS: devolve a nitidez) em vez do esticado simples do navegador.
// DLSS nao existe em WebGL (e da NVIDIA, precisa das unidades de IA e do driver), FSR 1.0 e so shader: roda em qualquer placa.
// Uso: o composer desenha numa imagem propria (renderToScreen = false) e aqui ela vai pra janela ja no tamanho cheio.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// EASU: 12 amostras em volta, acha a direcao da borda e amplia com um filtro alongado nela (port do ffx_fsr1.h, versao em float)
const EASU = `
uniform sampler2D tDiffuse; uniform vec2 inSize; varying vec2 vUv;
vec3 T(vec2 p){ return texture2D(tDiffuse, p).rgb; }
float L(vec3 c){ return c.b * 0.5 + (c.r * 0.5 + c.g); }
void setD(inout vec2 dir, inout float len, float w, float lA, float lB, float lC, float lD, float lE){
  float dx = lD - lB, dy = lE - lA;
  float lx = clamp(abs(dx) / max(max(abs(lD - lC), abs(lC - lB)), 1e-5), 0.0, 1.0);
  float ly = clamp(abs(dy) / max(max(abs(lE - lC), abs(lC - lA)), 1e-5), 0.0, 1.0);
  dir += vec2(dx, dy) * w; len += (lx * lx + ly * ly) * w;
}
void tap(inout vec3 aC, inout float aW, vec2 off, vec2 dir, vec2 len2, float lob, float clp, vec3 c){
  vec2 v = vec2(off.x * dir.x + off.y * dir.y, off.x * -dir.y + off.y * dir.x) * len2;
  float d2 = min(dot(v, v), clp);
  float wB = 0.4 * d2 - 1.0, wA = lob * d2 - 1.0;
  wB *= wB; wA *= wA;
  wB = 1.5625 * wB - 0.5625;
  float w = wB * wA; aC += c * w; aW += w;
}
void main(){
  vec2 px = 1.0 / inSize, pp = vUv * inSize - 0.5, fp = floor(pp); pp -= fp;
  vec2 p0 = (fp + 0.5) * px;
  vec3 b = T(p0 + vec2(0.0, -1.0) * px), c = T(p0 + vec2(1.0, -1.0) * px);
  vec3 e = T(p0 + vec2(-1.0, 0.0) * px), f = T(p0), g = T(p0 + vec2(1.0, 0.0) * px), h = T(p0 + vec2(2.0, 0.0) * px);
  vec3 i = T(p0 + vec2(-1.0, 1.0) * px), j = T(p0 + vec2(0.0, 1.0) * px), k = T(p0 + vec2(1.0, 1.0) * px), l = T(p0 + vec2(2.0, 1.0) * px);
  vec3 n = T(p0 + vec2(0.0, 2.0) * px), o = T(p0 + vec2(1.0, 2.0) * px);
  float bL = L(b), cL = L(c), eL = L(e), fL = L(f), gL = L(g), hL = L(h), iL = L(i), jL = L(j), kL = L(k), lL = L(l), nL = L(n), oL = L(o);
  vec2 dir = vec2(0.0); float len = 0.0;
  setD(dir, len, (1.0 - pp.x) * (1.0 - pp.y), bL, eL, fL, gL, jL);
  setD(dir, len, pp.x * (1.0 - pp.y), cL, fL, gL, hL, kL);
  setD(dir, len, (1.0 - pp.x) * pp.y, fL, iL, jL, kL, nL);
  setD(dir, len, pp.x * pp.y, gL, jL, kL, lL, oL);
  float dr = dot(dir, dir); bool zro = dr < 1.0 / 32768.0;
  dir = zro ? vec2(1.0, 0.0) : dir * inversesqrt(dr);
  len *= 0.5; len *= len;
  float stretch = dot(dir, dir) / max(abs(dir.x), abs(dir.y));
  vec2 len2 = vec2(1.0 + (stretch - 1.0) * len, 1.0 - 0.5 * len);
  float lob = 0.5 + (0.21 - 0.5) * len, clp = 1.0 / lob;
  vec3 aC = vec3(0.0); float aW = 0.0;
  tap(aC, aW, vec2(0.0, -1.0) - pp, dir, len2, lob, clp, b);
  tap(aC, aW, vec2(1.0, -1.0) - pp, dir, len2, lob, clp, c);
  tap(aC, aW, vec2(-1.0, 1.0) - pp, dir, len2, lob, clp, i);
  tap(aC, aW, vec2(0.0, 1.0) - pp, dir, len2, lob, clp, j);
  tap(aC, aW, vec2(0.0, 0.0) - pp, dir, len2, lob, clp, f);
  tap(aC, aW, vec2(-1.0, 0.0) - pp, dir, len2, lob, clp, e);
  tap(aC, aW, vec2(1.0, 1.0) - pp, dir, len2, lob, clp, k);
  tap(aC, aW, vec2(2.0, 1.0) - pp, dir, len2, lob, clp, l);
  tap(aC, aW, vec2(2.0, 0.0) - pp, dir, len2, lob, clp, h);
  tap(aC, aW, vec2(1.0, 0.0) - pp, dir, len2, lob, clp, g);
  tap(aC, aW, vec2(1.0, 2.0) - pp, dir, len2, lob, clp, o);
  tap(aC, aW, vec2(0.0, 2.0) - pp, dir, len2, lob, clp, n);
  vec3 mn = min(min(f, g), min(j, k)), mx = max(max(f, g), max(j, k));
  gl_FragColor = vec4(clamp(aC / max(aW, 1e-5), mn, mx), 1.0);
}`;

// RCAS: nitidez adaptativa (afia menos onde ja tem contraste, nunca estoura o vizinho)
const RCAS = `
uniform sampler2D tDiffuse; uniform vec2 size; uniform float sharp; varying vec2 vUv;
vec3 T(vec2 p){ return texture2D(tDiffuse, p).rgb; }
float L(vec3 c){ return c.b * 0.5 + (c.r * 0.5 + c.g); }
void main(){
  vec2 px = 1.0 / size;
  vec3 b = T(vUv + vec2(0.0, -px.y)), d = T(vUv - vec2(px.x, 0.0)), e = T(vUv), f = T(vUv + vec2(px.x, 0.0)), h = T(vUv + vec2(0.0, px.y));
  float bL = L(b), dL = L(d), eL = L(e), fL = L(f), hL = L(h);
  float nz = 0.25 * (bL + dL + fL + hL) - eL;
  float rng = max(max(max(bL, dL), max(fL, hL)), eL) - min(min(min(bL, dL), min(fL, hL)), eL);
  nz = 1.0 - 0.5 * clamp(abs(nz) / max(rng, 1e-5), 0.0, 1.0);
  vec3 mn4 = min(min(b, d), min(f, h)), mx4 = max(max(b, d), max(f, h));
  vec3 hitMin = min(mn4, e) / max(4.0 * mx4, vec3(1e-5));
  vec3 hitMax = (1.0 - max(mx4, e)) / min(4.0 * mn4 - 4.0, vec3(-1e-5));
  vec3 lobeC = max(-hitMin, hitMax);
  float lobe = max(-0.1875, min(max(lobeC.r, max(lobeC.g, lobeC.b)), 0.0)) * sharp * nz;
  gl_FragColor = vec4((lobe * (b + d + f + h) + e) / (4.0 * lobe + 1.0), 1.0);
}`;

export function makeFsr(renderer) {
  const mk = (frag, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false });
  const easu = mk(EASU, { tDiffuse: { value: null }, inSize: { value: new THREE.Vector2(1, 1) } });
  const rcas = mk(RCAS, { tDiffuse: { value: null }, size: { value: new THREE.Vector2(1, 1) }, sharp: { value: 0.8 } });
  const quad = new FullScreenQuad(easu);
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  const out = new THREE.Vector2();
  const fsr = {
    on: false,
    // nitidez 0..1 (Ajustes): 0 = so amplia; 1 = o padrao da AMD (0 stops)
    setSharp(k) { rcas.uniforms.sharp.value = Math.max(0, Math.min(1, k)); },
    // liga o composer nesta ampliacao (ou devolve ele pra janela)
    attach(composer) {
      const draw = composer.render.bind(composer);
      composer.render = (dt) => {
        composer.renderToScreen = !fsr.on;
        draw(dt);
        if (fsr.on) fsr.present(composer.readBuffer);
      };
    },
    present(src) {
      renderer.getDrawingBufferSize(out);
      if (rt.width !== out.x || rt.height !== out.y) rt.setSize(out.x, out.y);
      const prev = renderer.getRenderTarget(), ac = renderer.autoClear;
      renderer.autoClear = false;
      src.texture.minFilter = src.texture.magFilter = THREE.LinearFilter;
      easu.uniforms.tDiffuse.value = src.texture; easu.uniforms.inSize.value.set(src.width, src.height);
      quad.material = easu; renderer.setRenderTarget(rt); quad.render(renderer);
      rcas.uniforms.tDiffuse.value = rt.texture; rcas.uniforms.size.value.set(out.x, out.y);
      quad.material = rcas; renderer.setRenderTarget(null); quad.render(renderer);
      renderer.setRenderTarget(prev); renderer.autoClear = ac;
    },
  };
  return fsr;
}
