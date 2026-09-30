import type { LotofacilResult } from '../../game';
import { optimizePortfolio, randomPortfolio } from '../mc/portfolio';
import { fromMask, makeWeightedDraws, mulberry32, popcount, toMask } from '../mc/rng';
import { estimateBias, topByBias } from './biasModel';

// Avaliação walk-forward em sorteios REAIS: a cada bloco, estima o modelo só com
// o passado, monta o portfólio de cada método e joga nos `step` concursos
// seguintes. Métricas por concurso permitem testes pareados entre métodos.
export type Method = 'aleatorio' | 'mc_uniforme' | 'mc_vpe' | 'vpe_amostrado' | 'vpe_top15';

export interface MethodScores { meanHits: number[]; win11: number[]; best: number[] }

export interface WalkForwardResult {
  n: number;
  scores: Record<Method, MethodScores>;
}

export const walkForwardPortfolio = (
  history: LotofacilResult[], games: number, methods: Method[], start = 2000, step = 100, seed = 7,
): WalkForwardResult => {
  const asc = [...history].sort((a, b) => a.numero - b.numero);
  const masks = asc.map((g) => toMask(g.listaDezenas));
  const sets = asc.map((g) => g.listaDezenas);
  const scores = Object.fromEntries(methods.map((m) => [m, { meanHits: [], win11: [], best: [] } as MethodScores])) as Record<Method, MethodScores>;
  for (let t0 = start; t0 < asc.length; t0 += step) {
    const model = estimateBias(sets.slice(0, t0));
    const rng = mulberry32(seed + t0);
    const build: Record<Method, () => number[][]> = {
      aleatorio: () => randomPortfolio(games, 15, rng),
      mc_uniforme: () => optimizePortfolio({ games, seed: seed + t0, iterations: 4000, annealing: true }),
      mc_vpe: () => optimizePortfolio({ games, seed: seed + t0, iterations: 4000, annealing: true, logWeights: model.logW }),
      vpe_amostrado: () => Array.from(makeWeightedDraws(games, rng, model.logW), (m) => fromMask(m)),
      vpe_top15: () => Array.from({ length: games }, () => topByBias(model)),
    };
    for (const m of methods) {
      const tickets = build[m]().map(toMask);
      for (let t = t0; t < Math.min(asc.length, t0 + step); t++) {
        let sum = 0, best = 0;
        for (const k of tickets) { const h = popcount(k & masks[t]); sum += h; if (h > best) best = h; }
        scores[m].meanHits.push(sum / tickets.length); scores[m].best.push(best); scores[m].win11.push(best >= 11 ? 1 : 0);
      }
    }
  }
  return { n: scores[methods[0]].meanHits.length, scores };
};

/** Diferença pareada média (a − b) e seu z, por concurso. */
export const pairedZ = (a: number[], b: number[]): { diff: number; z: number } => {
  const d = a.map((v, i) => v - b[i]); const n = d.length;
  const m = d.reduce((x, y) => x + y, 0) / n;
  const sd = Math.sqrt(d.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1));
  return { diff: m, z: sd > 0 ? m / (sd / Math.sqrt(n)) : 0 };
};

/**
 * Poder PREDITIVO do VPE: ganho médio de log-verossimilhança por concurso vs a
 * hipótese "todas as dezenas 60%", em walk-forward (estimador só com o passado).
 * Teste muito mais poderoso que contar acertos (usa as 25 indicadoras).
 */
export const predictiveLogLikGain = (sets: number[][], start: number): { gain: number; z: number; hits: number; n: number } => {
  let s1 = 0, s2 = 0, n = 0, hits = 0;
  for (let t = start; t < sets.length; t++) {
    const model = estimateBias(sets.slice(0, t), 1, false);
    const inDraw = new Set(sets[t]);
    let ll = 0;
    model.probs.forEach((p, i) => { ll += inDraw.has(i + 1) ? Math.log(p / 0.6) : Math.log((1 - p) / 0.4); });
    s1 += ll; s2 += ll * ll; n++;
    hits += topByBias(model).filter((k) => inDraw.has(k)).length;
  }
  const m = s1 / n;
  return { gain: m, z: m / (Math.sqrt(s2 / n - m * m) / Math.sqrt(n)), hits: hits / n, n };
};
