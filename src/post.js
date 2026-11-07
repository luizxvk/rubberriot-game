// Pelicula de 1930: P&B (ou colorizado a mao), grao, riscos, poeira, tremulacao,
// balanco do quadro, vinheta e a IRIS de transicao.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.6 }, mode: { value: 1 }, flash: { value: 0 },
    aspect: { value: 1 }, iris: { value: 1.5 }, irisC: { value: new THREE.Vector2(0.5, 0.5) }, hurt: { value: 0 }, fade: { value: 0 }, smoke: { value: 0 }, // smoke: veu de dentro da fumaca (07/11). fade: 0 = imagem, 1 = preto (corte de tomada do lobby, 07/11)
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time, grain, mode, aspect, iris, hurt, flash, fade, smoke; uniform vec2 irisC;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), f.x), f.y); }
    void main(){
      float fr = floor(time * 18.0);
      vec2 uv = vUv + vec2(h(vec2(fr, 1.0)) - 0.5, h(vec2(fr, 2.0)) - 0.5) * 0.0012 * grain;
      vec3 c = texture2D(tDiffuse, uv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      l = smoothstep(0.0, 1.0, l * 1.06);
      vec3 silver = vec3(l) * vec3(1.0, 0.985, 0.95);
      vec3 col;
      if (mode < 0.5) col = silver;
      else if (mode < 1.5) col = mix(vec3(l), c, 0.55) * vec3(1.0, 0.985, 0.95);
      else col = mix(vec3(l), c, 1.08); // modo colorido: as cores inteiras (um tico mais vivas), so o filme por cima
      float filmK = 1.0;
      // tremulacao do projetor
      col *= 1.0 + (h(vec2(fr, 3.0)) - 0.5) * 0.07 * grain * filmK;
      // grao
      col += (h(vUv * 1000.0 + fr) - 0.5) * 0.13 * grain * filmK;
      // riscos verticais
      float sx = h(vec2(fr, 4.0));
      float scratch = smoothstep(0.0012, 0.0, abs(vUv.x - sx)) * step(0.55, h(vec2(fr, 5.0)));
      col = mix(col, vec3(0.92), scratch * 0.5 * grain);
      float sx2 = h(vec2(fr, 6.0));
      col = mix(col, vec3(0.08), smoothstep(0.0008, 0.0, abs(vUv.x - sx2)) * step(0.7, h(vec2(fr, 7.0))) * 0.5 * grain);
      // poeira
      vec2 dp = vec2(h(vec2(fr, 8.0)), h(vec2(fr, 9.0)));
      float dust = smoothstep(0.006, 0.0, length((vUv - dp) * vec2(aspect, 1.0))) * step(0.6, h(vec2(fr, 10.0)));
      col = mix(col, vec3(0.05), dust * grain);
      // vinheta + dano
      vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
      float v = smoothstep(0.95, 0.35, length(q) * (1.0 + hurt * 0.6));
      col *= mix(0.55, 1.0, v);
      // dano = MANCHA DE TINTA (07/11, pedido dele; era a borda vermelha): nanquim entra pelas bordas em borroes que fervem
      // de leve (troca a cada 1/6 s, igual desenho) e escorre do topo em pingos. Mais dano, mais tinta
      if (hurt > 0.01) {
        float fb = floor(time * 6.0);
        vec2 q2 = vUv * vec2(aspect, 1.0);
        float blob = (1.0 - v) + (vn(q2 * 5.0 + fb * 0.37) + vn(q2 * 11.0 - fb * 0.21) * 0.5) * 0.38;
        float inkA = smoothstep(1.02 - hurt * 0.7, 1.06 - hurt * 0.7, blob);
        float cx = floor(vUv.x * 36.0), dl = h(vec2(cx, 11.0)), dx = abs(fract(vUv.x * 36.0) - 0.5);
        float len = hurt * (0.08 + 0.32 * dl) * step(0.55, dl) * (0.85 + 0.15 * sin(time * 2.0 + cx));
        float drip = step(1.0 - vUv.y, len) * step(dx, 0.08 + 0.12 * dl * (1.0 - (1.0 - vUv.y) / max(len, 1e-3) * 0.5));
        col = mix(col, vec3(0.045, 0.04, 0.035), max(inkA, drip) * 0.94);
      }
      // flash: tela estoura em branco com estrelas de desenho
      if (flash > 0.0) {
        float st = step(0.985, h(floor(vUv * vec2(aspect, 1.0) * 30.0)));
        col = mix(col, vec3(1.0, 0.99, 0.95), min(1.0, flash * 1.2));
        col = mix(col, vec3(0.06), st * min(1.0, flash) * 0.6);
      }
      // iris
      vec2 ic = (vUv - irisC) * vec2(aspect, 1.0);
      col *= smoothstep(iris, iris - 0.006, length(ic));
      col = mix(col, vec3(0.83, 0.82, 0.79), smoke * 0.93);
      col *= 1.0 - fade;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function makePipeline(renderer, scene, camera, vm) {
  // 05/11 (pedido dele): o pos-processo desenhava sem antisserrilhado e toda borda de malha tremia andando. No toque fica sem (celular)
  // 07/11 (pedido dele): imagem intermediaria em 8 bits (era meia-precisao: o jogo nao usa HDR, o grao do filme ja esconde degrau de cor)
  // e o antisserrilhado mora SO aqui (o da janela saiu: o composer desenha numa imagem propria, o da janela nao servia pra nada).
  // Amostras = Ajustes > Video > Antisserrilhado (0, 2, 4, 8)
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(sz.x || 1, sz.y || 1, { type: THREE.UnsignedByteType, samples: matchMedia('(pointer: coarse)').matches ? 0 : 4 }));
  composer.addPass(new RenderPass(scene, camera));
  const vmPass = new RenderPass(vm.scene, vm.camera);
  vmPass.clear = false;
  vmPass.clearDepth = true;
  composer.addPass(vmPass);
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);
  composer.addPass(new OutputPass());
  // troca as amostras sem refazer o composer (o alvo e recriado no proximo desenho)
  const setAA = (n) => { for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== n) { rt.samples = n; rt.dispose(); } };
  return { composer, film, vmPass, setAA };
}

// telas de menu (Visual e Arsenal, 07/11): desenhavam direto na janela, que perdeu o antisserrilhado. Passam por aqui,
// com as mesmas amostras dos Ajustes
export function makeMenuPipeline(renderer) {
  const sz = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(sz.x || 1, sz.y || 1, { type: THREE.UnsignedByteType, samples: 4 }));
  const pass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(pass); composer.addPass(new OutputPass());
  const setAA = (n) => { for (const rt of [composer.renderTarget1, composer.renderTarget2]) if (rt.samples !== n) { rt.samples = n; rt.dispose(); } };
  return { composer, setAA, render(sc, cam) { pass.scene = sc; pass.camera = cam; composer.render(); } };
}

