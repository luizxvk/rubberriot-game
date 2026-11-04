// Kill cam em quadrinhos: quando voce cai, tira uma foto da cena (o rosto de quem te pegou) num alvo pequeno do
// proprio renderizador e monta uma tira de 3 quadrinhos de jornal:
// 1) quem foi, 2) o tiro (onomatopeia + distancia), 3) PLAFT! com voce. Visual de gibi fica no CSS.
import * as THREE from 'three';

const W = 384, H = 256;
let rt = null, buf = null, cv = null, lastUrl = null;
const cam = new THREE.PerspectiveCamera(42, W / H, 0.05, 300);

// 03/11 (desempenho): a leitura da placa era sincrona (readRenderTargetPixels para tudo esperando a GPU) + toDataURL,
// no quadro da morte: ~150 ms de tela parada. Agora le assincrono (WebGL2) e codifica com toBlob
async function snap(renderer, scene) {
  if (!rt) { rt = new THREE.WebGLRenderTarget(W, H); rt.texture.colorSpace = THREE.SRGBColorSpace; }
  buf ||= new Uint8Array(W * H * 4);
  cv ||= Object.assign(document.createElement('canvas'), { width: W, height: H });
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(prev);
  if (renderer.readRenderTargetPixelsAsync && renderer.capabilities.isWebGL2) await renderer.readRenderTargetPixelsAsync(rt, 0, 0, W, H, buf);
  else renderer.readRenderTargetPixels(rt, 0, 0, W, H, buf);
  const g = cv.getContext('2d'), img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(buf.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // a leitura vem de cabeca pra baixo
  g.putImageData(img, 0, 0);
  if (lastUrl) URL.revokeObjectURL(lastUrl); // a foto da morte anterior sai da memoria
  return (lastUrl = await new Promise(r => cv.toBlob(b => r(b ? URL.createObjectURL(b) : null), 'image/jpeg', 0.82)));
}

// k: { pos, yaw } de quem matou; v: posicao de quem caiu. Uma foto so: o close no rosto (o 2o quadrinho e a arma,
// montada no main; a foto por cima do ombro era tirada e jogada fora)
export async function shootPanels(renderer, scene, k) {
  const out = [];
  try {
    const fx = -Math.sin(k.yaw), fz = -Math.cos(k.yaw);
    // close no rosto: na frente dele, um pouco de lado e de baixo (angulo de heroi de gibi)
    cam.position.set(k.pos[0] + fx * 2.2 + fz * 0.6, k.pos[1] + 1.2, k.pos[2] + fz * 2.2 - fx * 0.6);
    cam.lookAt(k.pos[0], k.pos[1] + 1.45, k.pos[2]);
    out.push(await snap(renderer, scene));
  } catch (e) { console.warn('kill cam falhou', e); }
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function stripHtml(imgs, { killer, wpn, dist, head, t, icon, lvl, variant }) {
  const sfx = head ? t('kc_head') : ['BANG!', 'POW!', 'BLAM!'][Math.floor(Math.random() * 3)];
  const p = (i, inner, cap, extra = '') => `<figure class="kc-p kc-${i}">${inner}<figcaption>${cap}</figcaption>${extra}</figure>`;
  return p(1, imgs[0] ? `<img src="${imgs[0]}" alt="">` : '<i class="kc-blank"></i>', esc(t('kc_who', { n: killer })), lvl ? `<b class="kc-lvl">${esc(t('kc_lvl', { n: lvl }))}</b>` : '')
    // meio: so a arma dele, inteira e de lado, com o nome do modelo (sem foto do tiro)
    // sequencia (Torta Atomica, bigornas, dirigivel...): o icone dela no lugar da arma (01/11)
    + p(2, imgs[1] ? `<img class="kc-gun" src="${imgs[1]}" alt="${esc(wpn)}">${variant ? `<b class="kc-var">${esc(variant)}</b>` : ''}<b class="kc-gname">${esc(wpn)}</b>` : icon ? `<svg class="kc-ico" viewBox="0 0 48 48" aria-hidden="true">${icon}</svg><b class="kc-gname">${esc(wpn)}</b>` : `<i class="kc-blank"></i><b class="kc-gname">${esc(wpn)}</b>`, esc(t('kc_dist', { d: dist })))
    + p(3, `<i class="kc-blank"></i><b class="kc-sfx kc-big">PLAFT!</b>`, esc(t('kc_you')));
}
