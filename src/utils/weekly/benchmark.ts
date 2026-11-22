import type { LotofacilResult } from '../../game';
import { mulberry32 } from '../mc/rng';
import { newAccumulator, record, summarize, type HitStats } from './hitStats';

// Backtest walk-forward SEM lookahead: para cada concurso-alvo, o gerador só vê
// concursos anteriores a ele. Math.random é semeado por alvo, então o mesmo
// código sempre produz o mesmo relatório (comparável semana a semana).

export interface Contender {
  id: string;
  /** Concursos de treino que o gerador recebe (o app usa 100). Infinity = todo o passado. */
  window: number;
  /** Quantos alvos avaliar (geradores lentos usam menos e ficam com pouco poder). */
  targets: number;
  run: (train: LotofacilResult[]) => number[] | Promise<number[]>;
}

export interface ContenderResult extends HitStats {
  id: string;
  ms: number; // tempo médio por palpite
  zOld: number; // z na metade mais antiga dos alvos
  zNew: number; // z na metade mais nova: vantagem real aparece nas DUAS
}

/** Troca Math.random por um PRNG semeado durante `fn` (restaura sempre). */
export const withSeed = async <T,>(seed: number, fn: () => T | Promise<T>): Promise<T> => {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return await fn();
  } finally {
    Math.random = original;
  }
};

/** `history`: mais novo primeiro. Avalia os `c.targets` concursos mais recentes. */
export const evaluate = async (history: LotofacilResult[], c: Contender, seed = 2026): Promise<ContenderResult> => {
  const acc = newAccumulator();
  const t0 = Date.now();
  const limit = Math.min(c.targets, history.length - 30);
  for (let i = 0; i < limit; i++) {
    const train = history.slice(i + 1, c.window === Infinity ? undefined : i + 1 + c.window);
    const pick = await withSeed(seed + history[i].numero, () => c.run(train));
    record(acc, pick, history[i]);
  }
  const stats = summarize(acc);
  const half = Math.floor(acc.hits.length / 2);
  const zOf = (hits: number[]) => summarize({ hits, prize: 0 }).z;
  return {
    id: c.id,
    ...stats,
    ms: stats.targets ? Math.round((Date.now() - t0) / stats.targets) : 0,
    zNew: zOf(acc.hits.slice(0, half)),
    zOld: zOf(acc.hits.slice(half)),
  };
};

export const runBenchmark = async (history: LotofacilResult[], contenders: Contender[], seed = 2026): Promise<ContenderResult[]> => {
  const out: ContenderResult[] = [];
  for (const c of contenders) out.push(await evaluate(history, c, seed));
  return out.sort((a, b) => b.avgHits - a.avgHits);
};
