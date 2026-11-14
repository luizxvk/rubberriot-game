// Memoria de video (09/11): cada modelo do Tripo vem com textura de 2048 (cerca de 20 MB na placa). Um remendo so aqui cobre
// todo GLTFLoader do jogo.
// 14/11 (pedido dele): Ajustes > Video > Texturas. Automatica = como era (celular: acima de 1024 vira 512, atlas das armas ate
// 1024 ficam; PC: original). Baixa = no maximo 512, Media = no maximo 1024, Alta = original. Le o ajuste salvo ao abrir o jogo
// (a textura ja esta na placa: trocar vale ao reabrir). A proporcao da imagem e mantida.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const TOUCH = matchMedia('(pointer: coarse)').matches;
export const TEX_Q = (() => { try { return JSON.parse(localStorage.getItem('rr_settings') || '{}').texQ || 'auto'; } catch { return 'auto'; } })();
const RULE = TEX_Q === 'low' ? [512, 512] : TEX_Q === 'mid' ? [1024, 1024] : TEX_Q === 'high' ? null : TOUCH ? [1024, 512] : null; // [acima de, vira]
function shrink(tex) {
  const im = tex?.image, w = im?.width || 0, h = im?.height || 0, big = Math.max(w, h);
  if (!im || tex.userData.shrunk || big <= RULE[0]) return;
  const k = RULE[1] / big, c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  im.close?.(); tex.image = c; tex.userData.shrunk = true; tex.needsUpdate = true;
}
if (RULE) {
  const parse = GLTFLoader.prototype.parse;
  GLTFLoader.prototype.parse = function (data, path, onLoad, onError) {
    return parse.call(this, data, path, (g) => { g.scene.traverse(o => { for (const m of [o.material].flat()) if (m) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) shrink(m[k]); }); onLoad(g); }, onError);
  };
}

// Draco em TODO carregador (14/11, pedido dele: comprimir armas e modelos). Os .glb de public/models passaram por
// scripts/draco-modelos.mjs (geometria comprimida, materiais/texturas/nomes intactos). Quem ja tinha o seu DRACOLoader
// continua com ele; o resto ganha este, compartilhado (um decodificador so, nos workers).
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
let SHARED_DRACO = null;
const parseD = GLTFLoader.prototype.parse;
GLTFLoader.prototype.parse = function (data, path, onLoad, onError) {
  if (!this.dracoLoader) this.setDRACOLoader(SHARED_DRACO ||= new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + 'draco/'));
  return parseD.call(this, data, path, onLoad, onError);
};

// Cache de 1 ano dos modelos (14/11, pedido dele: rodar como se fosse local, no app e no navegador). O site respondia
// max-age=0 e o jogo perguntava por cada modelo a cada abertura. Agora o endereco leva a versao do jogo (?v=0.19.x) e o
// _headers manda guardar /models/* por 1 ano: abre do disco, sem rede. Versao nova = endereco novo = baixa 1 vez.
// REGRA: mudou um .glb, sobe a versao (shared/version.js), senao quem ja tem fica com o velho.
import { GAME_VERSION } from '../shared/version.js';
const loadV = GLTFLoader.prototype.load;
GLTFLoader.prototype.load = function (url, ...rest) {
  if (typeof url === 'string' && /\/models\//.test(url) && !/[?]/.test(url)) url += '?v=' + GAME_VERSION;
  return loadV.call(this, url, ...rest);
};
