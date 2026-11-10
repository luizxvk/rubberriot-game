// Memoria de video no celular (09/11): cada modelo do Tripo vem com textura de 2048 (cerca de 20 MB na placa). No celular elas viram 512
// ao carregar, sem tocar nos atlas das armas (ate 1024). Um remendo so aqui cobre todo GLTFLoader do jogo.
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const TOUCH = matchMedia('(pointer: coarse)').matches, LIMIT = 1024, SIZE = 512;
function shrink(tex) {
  const im = tex?.image; if (!im || tex.userData.shrunk || Math.max(im.width || 0, im.height || 0) <= LIMIT) return;
  const c = document.createElement('canvas'); c.width = c.height = SIZE; c.getContext('2d').drawImage(im, 0, 0, SIZE, SIZE);
  im.close?.(); tex.image = c; tex.userData.shrunk = true; tex.needsUpdate = true;
}
if (TOUCH) {
  const parse = GLTFLoader.prototype.parse;
  GLTFLoader.prototype.parse = function (data, path, onLoad, onError) {
    return parse.call(this, data, path, (g) => { g.scene.traverse(o => { for (const m of [o.material].flat()) if (m) for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) shrink(m[k]); }); onLoad(g); }, onError);
  };
}
