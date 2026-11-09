// Buraco Portatil (08/11, pedido dele): a tela comprime ate virar um ponto, a pessoa muda de lugar e a tela expande no outro buraco.
// So anima o canvas (nao redesenha o jogo), entao nao pesa. Movimento linear de proposito.
const IN = 170, OUT = 230, MIN = 'scale(0.02)';

export function tpSqueeze(mid) {
  const c = document.getElementById('gl');
  if (!c?.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { mid(); return; }
  const opts = (duration) => ({ duration, easing: 'linear', fill: 'both' });
  const shrink = c.animate([{ transform: 'scale(1)' }, { transform: MIN }], opts(IN));
  shrink.onfinish = () => {
    mid();
    const grow = c.animate([{ transform: MIN }, { transform: 'scale(1)' }], opts(OUT));
    shrink.cancel();
    grow.onfinish = () => grow.cancel(); // termina sem deixar transform no canvas
  };
}
