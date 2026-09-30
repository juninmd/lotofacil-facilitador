import type { LotofacilResult } from '../../game';
import { probExactHits } from '../probability';

// FÓRMULA PRÓPRIA — Retorno Esperado Ajustado (REA) por aposta simples de 15:
//
//   REA = Σ_{k=11..13} P_k · prêmio_k                          (valores fixos)
//       + P_14 · prêmio14 / c                                   (rateio ∝ 1/popularidade)
//       + P_15 · pool · (1 − e^{−λ·c}) / (λ·c)                  (jackpot dividido por 1+W, W~Poisson(λ·c))
//
// c = índice de multidão do jogo (1 = típico). O termo de 15 acertos usa a
// identidade E[1/(1+W)] = (1−e^{−μ})/μ. `pool` cresce quando o concurso anterior
// acumulou. Não muda P(acertar): só quanto você recebe QUANDO acerta.

export interface ReturnModel {
  fixed: [number, number, number]; // prêmios de 11, 12 e 13 acertos (R$)
  prize14: number; // prêmio médio de 14 acertos com c=1
  pool15: number; // prêmio total do jackpot sem acúmulo (concurso anterior teve ganhador)
  accumFactor: number; // multiplicador do jackpot por concurso acumulado (medido)
  lambda: number; // co-ganhadores esperados de 15 acertos com c=1
  bet: number;
}

// Calibra pelos últimos `recent` concursos (rateios reais).
export const calibrateReturnModel = (history: LotofacilResult[], recent = 1000): ReturnModel => {
  const asc = [...history].sort((a, b) => a.numero - b.numero).filter((g) => g.listaRateioPremio.length >= 5);
  const last = asc.slice(-recent);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const price = (i: number) => mean(last.map((g) => g.listaRateioPremio[i].valorPremio));
  const w15 = (g: LotofacilResult) => g.listaRateioPremio[0].numeroDeGanhadores;
  const pool = (g: LotofacilResult) => g.listaRateioPremio[0].valorPremio * w15(g);
  const fresh: number[] = []; const acc: number[] = [];
  last.forEach((g, i) => {
    if (i === 0 || w15(g) === 0) return;
    (w15(last[i - 1]) > 0 ? fresh : acc).push(pool(g));
  });
  const pool15 = mean(fresh);
  return {
    fixed: [price(4), price(3), price(2)],
    prize14: price(1),
    pool15,
    accumFactor: acc.length >= 5 ? Math.min(2, Math.max(0.5, mean(acc) / pool15 - 1)) : 1, // clamp: amostra pequena é ruidosa
    lambda: mean(last.filter((g) => w15(g) > 0).map(w15)),
    bet: 3.5,
  };
};

/** Jackpot esperado com `accumulated` concursos sem ganhador (cada um soma `accumFactor` × pool, medido nos dados). */
export const poolAfter = (m: ReturnModel, accumulated: number): number => m.pool15 * (1 + m.accumFactor * Math.max(0, accumulated));

export interface ReturnBreakdown { fixedPart: number; p14Part: number; jackpotPart: number; perBet: number; roi: number }

export const expectedReturn = (m: ReturnModel, crowd = 1, accumulated = 0): ReturnBreakdown => {
  const [f11, f12, f13] = m.fixed;
  const fixedPart = probExactHits(15, 11) * f11 + probExactHits(15, 12) * f12 + probExactHits(15, 13) * f13;
  const p14Part = (probExactHits(15, 14) * m.prize14) / crowd;
  const mu = Math.max(1e-9, m.lambda * crowd);
  const jackpotPart = probExactHits(15, 15) * poolAfter(m, accumulated) * ((1 - Math.exp(-mu)) / mu);
  const perBet = fixedPart + p14Part + jackpotPart;
  return { fixedPart, p14Part, jackpotPart, perBet, roi: perBet / m.bet - 1 };
};

/** Ganho relativo de REA de um portfólio com popularidade média `crowd` vs jogo típico. */
export const crowdEdge = (m: ReturnModel, crowd: number, accumulated = 0): number =>
  expectedReturn(m, crowd, accumulated).perBet / expectedReturn(m, 1, accumulated).perBet - 1;
