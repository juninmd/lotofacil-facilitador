import type { LotofacilResult } from '../game';

// Mineração de padrões da Lotofácil: extrai features de cada concurso e resume
// a distribuição histórica (mín/máx/média/desvio/percentis). Serve para:
//  - filtros data-driven ("nunca houve > N em sequência", "soma entre A e B");
//  - ponderar dezenas por frequência (recente e total).
// Tudo é calculado a partir do histórico fornecido — quanto mais concursos
// (idealmente desde o nº 1), mais estável a estatística.

const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
const FRAME = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
const MULT3 = new Set([3, 6, 9, 12, 15, 18, 21, 24]);

export interface GameFeatures {
  odd: number;
  sum: number;
  primes: number;
  fibonacci: number;
  mult3: number;
  frame: number;
  maxConsecutive: number;
  maxGap: number;
  decade1: number; // 1-10
  decade2: number; // 11-20
  decade3: number; // 21-25
  repeats: number; // repetidos vs concurso anterior (-1 se desconhecido)
}

export const FEATURE_KEYS: (keyof GameFeatures)[] = [
  'odd', 'sum', 'primes', 'fibonacci', 'mult3', 'frame',
  'maxConsecutive', 'maxGap', 'decade1', 'decade2', 'decade3', 'repeats',
];

const longestRun = (sorted: number[]): number => {
  let best = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    cur = sorted[i] === sorted[i - 1] + 1 ? cur + 1 : 1;
    if (cur > best) best = cur;
  }
  return sorted.length ? best : 0;
};

const biggestGap = (sorted: number[]): number => {
  let g = 0;
  for (let i = 1; i < sorted.length; i++) g = Math.max(g, sorted[i] - sorted[i - 1]);
  return g;
};

// Extrai as features de um jogo. `previous` habilita a contagem de repetidos.
export const extractFeatures = (numbers: number[], previous?: number[]): GameFeatures => {
  const s = [...numbers].sort((a, b) => a - b);
  const prevSet = previous ? new Set(previous) : null;
  return {
    odd: s.filter((n) => n % 2 !== 0).length,
    sum: s.reduce((a, b) => a + b, 0),
    primes: s.filter((n) => PRIMES.has(n)).length,
    fibonacci: s.filter((n) => FIBONACCI.has(n)).length,
    mult3: s.filter((n) => MULT3.has(n)).length,
    frame: s.filter((n) => FRAME.has(n)).length,
    maxConsecutive: longestRun(s),
    maxGap: biggestGap(s),
    decade1: s.filter((n) => n <= 10).length,
    decade2: s.filter((n) => n >= 11 && n <= 20).length,
    decade3: s.filter((n) => n >= 21).length,
    repeats: prevSet ? s.filter((n) => prevSet.has(n)).length : -1,
  };
};

export interface FeatureStat {
  min: number;
  max: number;
  mean: number;
  std: number;
  p01: number;
  p99: number;
}

const percentile = (sortedAsc: number[], p: number): number => {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.round(p * (sortedAsc.length - 1))));
  return sortedAsc[idx];
};

const summarize = (values: number[]): FeatureStat => {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, std: 0, p01: 0, p99: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    std: Math.sqrt(variance),
    p01: percentile(sorted, 0.01),
    p99: percentile(sorted, 0.99),
  };
};

export interface HistoryPatterns {
  count: number;
  numberFrequency: Map<number, number>; // frequência em todo o histórico
  recentFrequency: Map<number, number>; // frequência nos últimos `recentWindow`
  features: Record<keyof GameFeatures, FeatureStat>;
}

// Resume os padrões de todo o histórico. `history` esperado do mais novo [0]
// ao mais antigo [N]; a contagem de repetidos usa o par (i, i+1).
export const mineHistory = (history: LotofacilResult[], recentWindow = 50): HistoryPatterns => {
  const numberFrequency = new Map<number, number>();
  const recentFrequency = new Map<number, number>();
  for (let i = 1; i <= 25; i++) {
    numberFrequency.set(i, 0);
    recentFrequency.set(i, 0);
  }

  const collected: Record<keyof GameFeatures, number[]> = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, [] as number[]]),
  ) as Record<keyof GameFeatures, number[]>;

  history.forEach((game, i) => {
    game.listaDezenas.forEach((n) => {
      numberFrequency.set(n, (numberFrequency.get(n) || 0) + 1);
      if (i < recentWindow) recentFrequency.set(n, (recentFrequency.get(n) || 0) + 1);
    });
    const prev = history[i + 1]?.listaDezenas;
    const f = extractFeatures(game.listaDezenas, prev);
    FEATURE_KEYS.forEach((k) => {
      if (k === 'repeats' && f.repeats < 0) return; // sem anterior
      collected[k].push(f[k]);
    });
  });

  const features = Object.fromEntries(
    FEATURE_KEYS.map((k) => [k, summarize(collected[k])]),
  ) as Record<keyof GameFeatures, FeatureStat>;

  return { count: history.length, numberFrequency, recentFrequency, features };
};

// Verifica se um jogo respeita os limites empíricos observados (entre p01 e p99).
// Útil como filtro: descarta combinações que historicamente ~nunca ocorreram.
export const withinLearnedBounds = (
  numbers: number[],
  patterns: HistoryPatterns,
  previous?: number[],
): boolean => {
  const f = extractFeatures(numbers, previous);
  return FEATURE_KEYS.every((k) => {
    if (k === 'repeats' && f.repeats < 0) return true;
    const stat = patterns.features[k];
    return f[k] >= stat.p01 && f[k] <= stat.p99;
  });
};
