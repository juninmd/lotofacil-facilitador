import type { LotofacilResult } from '../../game';

// Estatísticas honestas de um gerador num backtest fora da amostra.
// Sob sorteio uniforme, os acertos de 1 jogo de 15 seguem a hipergeométrica
// (média 9, variância 1,5). O z compara a média observada contra 9: só um z
// alto e REPETIDO em períodos diferentes indica vantagem real.

export const EXPECTED_HITS = 9;
export const HIT_VARIANCE = 1.5; // 15·(15/25)·(10/25)·(10/24)
export const TICKET_COST = 3.5;

export interface HitStats {
  targets: number;
  avgHits: number;
  z: number; // (média − 9) / erro-padrão
  p11: number; // fração de concursos com ≥11 acertos (premiado)
  p13: number;
  best: number;
  returnPerReal: number; // R$ ganhos por R$ apostado, com o rateio REAL de cada concurso
}

export interface HitAccumulator {
  hits: number[];
  prize: number;
}

export const newAccumulator = (): HitAccumulator => ({ hits: [], prize: 0 });

/** Prêmio pago a `hits` acertos naquele concurso (rateio real; 0 se ausente). */
export const prizeFor = (game: LotofacilResult, hits: number): number => {
  if (hits < 11) return 0;
  const faixa = 16 - hits; // 15→1, 14→2, ..., 11→5
  return game.listaRateioPremio?.find((p) => p.faixa === faixa)?.valorPremio ?? 0;
};

export const countHits = (pick: number[], draw: number[]): number => pick.filter((n) => draw.includes(n)).length;

export const record = (acc: HitAccumulator, pick: number[], target: LotofacilResult): void => {
  const h = countHits(pick, target.listaDezenas);
  acc.hits.push(h);
  acc.prize += prizeFor(target, h);
};

export const summarize = (acc: HitAccumulator): HitStats => {
  const n = acc.hits.length;
  if (n === 0) return { targets: 0, avgHits: 0, z: 0, p11: 0, p13: 0, best: 0, returnPerReal: 0 };
  const avg = acc.hits.reduce((a, b) => a + b, 0) / n;
  const frac = (k: number) => acc.hits.filter((h) => h >= k).length / n;
  return {
    targets: n,
    avgHits: +avg.toFixed(4),
    z: +((avg - EXPECTED_HITS) / Math.sqrt(HIT_VARIANCE / n)).toFixed(2),
    p11: +frac(11).toFixed(4),
    p13: +frac(13).toFixed(4),
    best: Math.max(...acc.hits),
    returnPerReal: +(acc.prize / (n * TICKET_COST)).toFixed(4),
  };
};
