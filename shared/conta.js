// Contas que o SERVIDOR confere (11/11, seguranca): pontos da rankeada e nivel.
// O jogo e o servidor usam as mesmas contas daqui; o servidor nunca aceita rp/nivel vindos do cliente.

// rankeada: vitoria vale RANK_WIN + bonus de desempenho (score/200, ate RANK_BONUS), pesado pela parte de humanos na sala
export const RANK_WIN = 10, RANK_BONUS = 5;
// faixas (bronze, prata, ouro, diamante, mestre): o mesmo `rp` de cada TIERS em src/rank.js
export const RANK_TIER_RP = [0, 100, 250, 450, 700];
export function rankDelta(won, humanShare, perf = 0) {
  const k = 0.35 + 0.65 * Math.max(0, Math.min(1, humanShare));
  const bonus = won ? Math.min(RANK_BONUS, Math.max(0, Math.round(perf))) : 0;
  return { delta: won ? Math.max(1, Math.round((RANK_WIN + bonus) * k)) : 0, k };
}
export const rankTierOf = (rp) => { let i = 0; while (i < RANK_TIER_RP.length - 1 && rp >= RANK_TIER_RP[i + 1]) i++; return i; };

// nivel da conta: espelho de levelXp/level em src/progress.js (ate o 55 a curva quadratica, depois LV_STEP por nivel; pk = curva do prestigio)
export const ACC_MAX_LEVEL = 250, ACC_LV_STEP = 6000;
const lvBase = (n) => 600 * (n - 1) + 90 * (n - 1) ** 2;
export const accLevelXp = (n, pk = 1) => n <= 1 ? 0 : Math.round((n <= 55 ? lvBase(n) : lvBase(55) + ACC_LV_STEP * (n - 55)) * (pk || 1));
export function accLevel(xp, pk = 1) { let n = 1; while (n < ACC_MAX_LEVEL && xp >= accLevelXp(n + 1, pk)) n++; return n; }
