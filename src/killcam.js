// Kill cam em quadrinhos: quando voce cai, tira duas fotos da cena (o rosto de quem te pegou e o que ele
// viu ate voce) num alvo pequeno do proprio renderizador e monta uma tira de 3 quadrinhos de jornal:
// 1) quem foi, 2) o tiro (onomatopeia + distancia), 3) PLAFT! com voce. Visual de gibi fica no CSS.
import * as THREE from 'three';

const W = 384, H = 256;
let rt = null, buf = null, cv = null;
const cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 300);

function snap(renderer, scene) {
  if (!rt) { rt = new THREE.WebGLRenderTarget(W, H); rt.texture.colorSpace = THREE.SRGBColorSpace; }
  buf ||= new Uint8Array(W * H * 4);
  cv ||= Object.assign(document.createElement('canvas'), { width: W, height: H });
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(prev);
  renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  const g = cv.getContext('2d'), img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // a leitura vem de cabeca pra baixo
  g.putImageData(img, 0, 0);
  return cv.toDataURL('image/jpeg', 0.82);
}

// k: { pos, yaw } de quem matou; v: posicao de quem caiu
export function shootPanels(renderer, scene, k, v) {
  const out = [];
  try {
    const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
    // 1) close no rosto: na frente dele, um pouco de lado e de baixo (angulo de heroi de gibi)
    cam.position.set(k.pos[0] + fx * 2.2 + fz * 0.6, k.pos[1] + 1.2, k.pos[2] + fz * 2.2 - fx * 0.6);
    cam.lookAt(k.pos[0], k.pos[1] + 1.45, k.pos[2]);
    out.push(snap(renderer, scene));
    // 2) por cima do ombro dele, olhando onde voce estava
    cam.position.set(k.pos[0] - fx * 1.1 - fz * 0.5, k.pos[1] + 1.9, k.pos[2] - fz * 1.1 + fx * 0.5);
    cam.lookAt(v[0], v[1] + 1, v[2]);
    out.push(snap(renderer, scene));
  } catch (e) { console.warn('kill cam falhou', e); }
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function stripHtml(imgs, { killer, wpn, dist, head, t }) {
  const sfx = head ? t('kc_head') : ['BANG!', 'POW!', 'BLAM!'][Math.floor(Math.random() * 3)];
  const p = (i, inner, cap) => `<figure class="kc-p kc-${i}">${inner}<figcaption>${cap}</figcaption></figure>`;
  return p(1, imgs[0] ? `<img src="${imgs[0]}" alt="">` : '<i class="kc-blank"></i>', esc(t('kc_who', { n: killer })))
    + p(2, (imgs[1] ? `<img src="${imgs[1]}" alt="">` : '<i class="kc-blank"></i>') + `<b class="kc-sfx">${esc(sfx)}</b>`, esc(t('kc_shot', { w: wpn, d: dist })))
    + p(3, `<i class="kc-blank"></i><b class="kc-sfx kc-big">PLAFT!</b>`, esc(t('kc_you')));
}
