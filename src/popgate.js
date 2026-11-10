// Portao dos popups de abertura (10/11, pedido dele): nada abre por cima do loader. Espera a tela de entrada sair, a
// cortina do mapa abrir e mais um respiro pra ver o mapa. Ordem: Elite (parabens, depois o presente do mes) e so entao Novidades.
export function sceneReady() {
  const at = window.__rrBootGoneAt;
  if (!at || performance.now() - at < 1500) return false;
  // no PC a tela de entrada fica no documento escondida (so o celular remove): conta so se estiver VISIVEL
  const bt = document.getElementById('boot'); if (bt && !bt.classList.contains('out') && bt.offsetParent !== null && getComputedStyle(bt).visibility !== 'hidden' && +getComputedStyle(bt).opacity > 0.05) return false;
  if (document.querySelector('#mapCurtain.in')) return false;
  return true;
}
