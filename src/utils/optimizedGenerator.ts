import type { LotofacilResult } from '../game';
import { mineHistory, withinLearnedBounds } from './patternMining';

// Gerador OTIMIZADO por todos os padrões reais encontrados:
//  - pondera dezenas por frequência (recente + total);
//  - exige repetição do concurso anterior na faixa modal (8..10);
//  - exige uma "âncora" baixa (1..4) e uma alta (22..25) — estatística de ordem
//    mostra que a menor dezena quase sempre é <=3 e a maior >=23;
//  - filtra por todos os limites empíricos (soma, ímpares, sequência, décadas,
//    primos, fibonacci, borda, gap) via withinLearnedBounds.
//
// IMPORTANTE: isto produz jogos "bem-formados" (com a mesma cara dos sorteios
// reais) e acerta ~9-10 dezenas em média — como QUALQUER seleção razoável, pois
// cada dezena tem 60% de chance por concurso. NÃO aumenta a chance dos prêmios
// altos (14/15): o sorteio é uniforme e independente.

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);

export const generateOptimizedGame = (
  history: LotofacilResult[],
  quantity = 15,
  rnd: () => number = Math.random,
): number[] => {
  if (history.length < 30) return ALL.slice(0, quantity);
  const patterns = mineHistory(history);
  const prev = history[0]?.listaDezenas ?? [];
  const prevSet = new Set(prev);

  const recentTotal = [...patterns.recentFrequency.values()].reduce((a, b) => a + b, 0) || 1;
  const weight = new Map<number, number>();
  for (const n of ALL) {
    const total = (patterns.numberFrequency.get(n) || 0) / Math.max(1, patterns.count);
    const recent = (patterns.recentFrequency.get(n) || 0) / recentTotal;
    weight.set(n, 0.2 + total + recent * 2);
  }

  const sample = (): number[] => {
    const pool = [...ALL];
    const picked: number[] = [];
    while (picked.length < quantity && pool.length) {
      let tw = 0;
      for (const n of pool) tw += weight.get(n) || 0.01;
      let r = rnd() * tw;
      let idx = 0;
      for (let i = 0; i < pool.length; i++) {
        r -= weight.get(pool[i]) || 0.01;
        if (r <= 0) { idx = i; break; }
      }
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return picked.sort((a, b) => a - b);
  };

  const passesExtras = (cand: number[]): boolean => {
    const hasLow = cand.some((n) => n <= 4);
    const hasHigh = cand.some((n) => n >= 22);
    const repeats = cand.filter((n) => prevSet.has(n)).length;
    const repeatOk = prev.length === 0 || (repeats >= 8 && repeats <= 10);
    return hasLow && hasHigh && repeatOk;
  };

  let best: number[] | null = null;
  let bestScore = -1;
  let fallback: number[] | null = null;
  for (let attempt = 0; attempt < 600; attempt++) {
    const cand = sample();
    fallback = cand;
    const score = cand.reduce((a, n) => a + (weight.get(n) || 0), 0);
    if (withinLearnedBounds(cand, patterns, prev) && passesExtras(cand) && score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best ?? fallback ?? sample();
};
