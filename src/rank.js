// Rankeada (31/10): faixas, pontos e badges. Ganha pontos de rank (RP) no fim de cada partida da
// fila rankeada (Captura a Bandeira, Dominacao, Escolta). Sala completa com bots: vale menos (decisao dele):
// o ganho e a perda encolhem pela fracao de gente de verdade na partida. Cada faixa alcancada pela primeira
// vez libera um premio pra sempre (rkPeak), mesmo se cair de faixa depois.
import { rankData, rankApply } from './progress.js';

export const TIERS = [
  { id: 'bronze', rp: 0, c1: '#b8743a', c2: '#7a4520', reward: { slot: 'look', tab: 'shirt', id: '#a8692f' } },
  { id: 'prata', rp: 100, c1: '#d6dade', c2: '#8a9097', reward: { slot: 'look', tab: 'gloveCol', id: '#c9cdd2' } },
  { id: 'ouro', rp: 250, c1: '#f2c94c', c2: '#a8741a', reward: { slot: 'camo', id: 'rk_ouro' } },
  { id: 'diamante', rp: 450, c1: '#9fe3f0', c2: '#3a7d9c', reward: { slot: 'camo', id: 'rk_diamante' } },
  { id: 'mestre', rp: 700, c1: '#c084fc', c2: '#5b2a86', reward: { slot: 'look', tab: 'hat', id: 'laurel', camo: 'rk_mestre' } },
];
export const tierOf = (rp) => { let i = 0; while (i < TIERS.length - 1 && rp >= TIERS[i + 1].rp) i++; return i; };
// faixa pra mostrar (badge): -1 enquanto nunca jogou rankeada
export const myTier = () => { const r = rankData(); return r.games > 0 ? tierOf(r.rp) : -1; };
export const peakTier = () => rankData().peak;

// resultado de uma partida (31/10, pedido dele: poucos pontos, linear): vitoria = 10 + bonus de desempenho
// (ate 5); derrota = 0 (nao ganha nem perde). Sala com bots encolhe o ganho (so bots = 35%, metade gente ~67%).
// Uma faixa a cada ~10-25 vitorias.
export const RANK_WIN = 10, RANK_BONUS = 5;
export function rankResult(won, humanShare, perf = 0) {
  const k = 0.35 + 0.65 * Math.max(0, Math.min(1, humanShare));
  const bonus = won ? Math.min(RANK_BONUS, Math.max(0, Math.round(perf))) : 0;
  const delta = won ? Math.max(1, Math.round((RANK_WIN + bonus) * k)) : 0;
  return { delta, k, won, base: won ? Math.round(RANK_WIN * k) : 0, bonus: won ? delta - Math.round(RANK_WIN * k) : 0, ...rankApply(delta, tierOf) };
}

// badge em SVG: escudo com divisas (bronze 1, prata 2, ouro 3 + estrela), losango lapidado (diamante),
// hexagono com coroa e louros (mestre). Contorno de tinta grosso como o resto do jogo.
export function badgeSvg(tier, size = 22) {
  const T = TIERS[tier]; if (!T) return '';
  const g = `rk${tier}`, grad = `<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.c1}"/><stop offset="1" stop-color="${T.c2}"/></linearGradient></defs>`;
  const ink = 'stroke="#1b1916" stroke-width="4" stroke-linejoin="round"';
  const chev = (y) => `<path d="M18 ${y}l14 9 14-9" fill="none" stroke="#1b1916" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  let body;
  if (tier <= 2) {
    body = `<path d="M32 4l24 8v18c0 15-10 25-24 30C18 55 8 45 8 30V12z" fill="url(#${g})" ${ink}/>` + [22, 31, 40].slice(0, tier + 1).map(chev).join('')
      + (tier === 2 ? '<path d="M32 9l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.8-4.9 2.8 1.1-5.3-4-3.7 5.4-.6z" fill="#fff8d6" stroke="#1b1916" stroke-width="1.6"/>' : '');
  } else if (tier === 3) {
    body = `<path d="M32 4l24 22-24 34L8 26z" fill="url(#${g})" ${ink}/><path d="M8 26h48M20 26l12 34 12-34M20 26l12-22 12 22" fill="none" stroke="#1b1916" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 14l5-5" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
  } else {
    body = `<path d="M32 10l22 12v22L32 56 10 44V22z" fill="url(#${g})" ${ink}/>`
      + '<path d="M6 30c2 10 9 18 18 22M58 30c-2 10-9 18-18 22" fill="none" stroke="#1b1916" stroke-width="3"/>'
      + [0, 1, 2].map(i => `<ellipse cx="${8 + i * 3}" cy="${36 + i * 6}" rx="4" ry="2" transform="rotate(${50 - i * 15} ${8 + i * 3} ${36 + i * 6})" fill="#7fb069" stroke="#1b1916" stroke-width="1.5"/><ellipse cx="${56 - i * 3}" cy="${36 + i * 6}" rx="4" ry="2" transform="rotate(${-50 + i * 15} ${56 - i * 3} ${36 + i * 6})" fill="#7fb069" stroke="#1b1916" stroke-width="1.5"/>`).join('')
      + '<path d="M20 30l4-10 8 7 8-7 4 10z" fill="#f2c94c" stroke="#1b1916" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="40" r="4" fill="#fff8d6" stroke="#1b1916" stroke-width="2"/>';
  }
  return `<svg class="rk-badge rk-${T.id}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${grad}${body}</svg>`;
}
