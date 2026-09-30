import { DEFAULT_PRIZES, type PrizeModel } from '../budgetSimulator';
import { popcount, toMask } from './rng';

// Avalia um PORTFÓLIO de jogos contra sorteios simulados (Monte Carlo).
// Cada jogo concorre de forma independente; "best" = melhor jogo do sorteio.

export interface PortfolioStats {
  draws: number;
  tickets: number;
  /** P(ao menos um jogo com >= k acertos), k = 11..15. */
  pAtLeast: Record<number, number>;
  /** Erro-padrão de P(>=11) (para intervalo de confiança). */
  seAny11: number;
  meanBest: number;
  /** Prêmio esperado total por concurso (R$) sob o modelo de prêmios. */
  expectedPrize: number;
}

export const prizeFor = (hits: number, m: PrizeModel = DEFAULT_PRIZES): number =>
  hits === 11 ? m.p11 : hits === 12 ? m.p12 : hits === 13 ? m.p13 : hits === 14 ? m.avg14 : hits === 15 ? m.avg15 : 0;

export const evaluatePortfolio = (
  tickets: number[][],
  draws: Int32Array,
  prizes: PrizeModel = DEFAULT_PRIZES,
): PortfolioStats => {
  const masks = tickets.map(toMask);
  const atLeast = [0, 0, 0, 0, 0, 0]; // índices 0..4 => >=11..>=15
  let sumBest = 0;
  let prize = 0;
  for (let d = 0; d < draws.length; d++) {
    let best = 0;
    for (let t = 0; t < masks.length; t++) {
      const h = popcount(masks[t] & draws[d]);
      if (h > best) best = h;
      prize += prizeFor(h, prizes);
    }
    sumBest += best;
    for (let k = 11; k <= best && k <= 15; k++) atLeast[k - 11]++;
  }
  const n = draws.length;
  const p11 = atLeast[0] / n;
  return {
    draws: n,
    tickets: tickets.length,
    pAtLeast: { 11: p11, 12: atLeast[1] / n, 13: atLeast[2] / n, 14: atLeast[3] / n, 15: atLeast[4] / n },
    seAny11: Math.sqrt((p11 * (1 - p11)) / n),
    meanBest: sumBest / n,
    expectedPrize: prize / n,
  };
};
