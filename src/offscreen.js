// Renderizador fora da tela, UM so pro jogo todo (03/11, bateria de desempenho): a foto das armas (desbloqueio,
// listas do lobby) e a previa da Loja tinham um contexto WebGL cada, e cada contexto compila de novo os shaders e
// sobe de novo as texturas (arma, camo) na placa. Quem usa ajusta o tamanho antes de desenhar.
import * as THREE from 'three';

let R = null;
export function offscreen() {
  if (!R) { R = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); R.setPixelRatio(1); }
  return R;
}
