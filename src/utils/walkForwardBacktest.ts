import type { LotofacilResult } from '../game';
import { mineHistory, withinLearnedBounds, type HistoryPatterns } from './patternMining';

// Backtest WALK-FORWARD (dinâmico, sem lookahead): para cada concurso-alvo,
// treina APENAS com os concursos anteriores (janela expansível, "desde o nº 1")
// e mede os acertos. Compara três abordagens:
//  - dynamic: re-treina os padrões a cada concurso (o que o usuário pediu);
//  - static: um único palpite fixo reutilizado em todos os alvos;
//  - random: linha de base aleatória.
// É a forma correta de verificar se "re-treinar" traz vantagem real.

// Gera um palpite a partir dos padrões minerados: pondera dezenas por
// frequência (recente + total) e mantém apenas candidatos dentro dos limites
// empíricos aprendidos (pares/ímpares, soma, sequência, repetidos, etc.).
export const generateFromPatterns = (
  patterns: HistoryPatterns,
  previous: number[] | undefined,
  quantity: number,
  rnd: () => number,
): number[] => {
  const weights = new Map<number, number>();
  const recentTotal = [...patterns.recentFrequency.values()].reduce((a, b) => a + b, 0) || 1;
  for (let n = 1; n <= 25; n++) {
    const total = (patterns.numberFrequency.get(n) || 0) / Math.max(1, patterns.count);
    const recent = (patterns.recentFrequency.get(n) || 0) / recentTotal;
    weights.set(n, 0.2 + total + recent * 2); // recência tem peso maior
  }

  const sample = (): number[] => {
    const pool = Array.from({ length: 25 }, (_, i) => i + 1);
    const picked: number[] = [];
    while (picked.length < quantity && pool.length) {
      let tw = 0;
      for (const n of pool) tw += weights.get(n) || 0.01;
      let r = rnd() * tw;
      let idx = 0;
      for (let i = 0; i < pool.length; i++) {
        r -= weights.get(pool[i]) || 0.01;
        if (r <= 0) { idx = i; break; }
      }
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return picked.sort((a, b) => a - b);
  };

  let best: number[] | null = null;
  let bestScore = -1;
  for (let attempt = 0; attempt < 300; attempt++) {
    const cand = sample();
    const score = cand.reduce((a, n) => a + (weights.get(n) || 0), 0);
    const valid = withinLearnedBounds(cand, patterns, previous);
    if (valid && score > bestScore) {
      bestScore = score;
      best = cand;
    }
    if (!best && attempt === 299) best = cand; // fallback: aceita o último
  }
  return best ?? sample();
};

export interface WalkForwardStats {
  targets: number;
  avgHits: number;
  best: number;
  tier13: number;
  tier14: number;
  tier15: number;
}

export interface WalkForwardResult {
  dynamic: WalkForwardStats;
  static: WalkForwardStats;
  random: WalkForwardStats;
}

const emptyStats = (): WalkForwardStats => ({ targets: 0, avgHits: 0, best: 0, tier13: 0, tier14: 0, tier15: 0 });
const record = (s: WalkForwardStats, hits: number) => {
  s.targets++;
  s.avgHits += hits;
  if (hits > s.best) s.best = hits;
  if (hits >= 13) s.tier13++;
  if (hits >= 14) s.tier14++;
  if (hits >= 15) s.tier15++;
};
const finalize = (s: WalkForwardStats) => {
  if (s.targets > 0) s.avgHits = +(s.avgHits / s.targets).toFixed(3);
};

// PRNG determinístico (reprodutível) — não usa Math.random.
const makeRng = (seed: number) => {
  let x = seed >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 0xffffffff;
  };
};

// Executa o walk-forward. `history` do mais novo [0] ao mais antigo [N].
// Avalia os `targets` concursos mais recentes; cada um treina em TODO o
// histórico anterior a ele (expansível).
export const walkForwardBacktest = (
  history: LotofacilResult[],
  targets: number,
  quantity = 15,
): WalkForwardResult => {
  const rnd = makeRng(20240719);
  const dynamic = emptyStats();
  const staticStats = emptyStats();
  const random = emptyStats();

  // Palpite estático: treinado uma única vez com o histórico anterior à janela.
  const staticTrain = history.slice(targets);
  const staticPick =
    staticTrain.length >= 30
      ? generateFromPatterns(mineHistory(staticTrain), staticTrain[0]?.listaDezenas, quantity, rnd)
      : null;

  const limit = Math.min(targets, Math.max(0, history.length - 30));
  for (let i = 0; i < limit; i++) {
    const target = history[i];
    const train = history.slice(i + 1); // TODO o passado (até o concurso 1)
    if (train.length < 30) break;

    const patterns = mineHistory(train);
    const previous = train[0]?.listaDezenas;

    const dyn = generateFromPatterns(patterns, previous, quantity, rnd);
    record(dynamic, dyn.filter((n) => target.listaDezenas.includes(n)).length);

    if (staticPick) {
      record(staticStats, staticPick.filter((n) => target.listaDezenas.includes(n)).length);
    }

    const rand = Array.from({ length: 25 }, (_, k) => k + 1)
      .sort(() => rnd() - 0.5)
      .slice(0, quantity);
    record(random, rand.filter((n) => target.listaDezenas.includes(n)).length);
  }

  finalize(dynamic);
  finalize(staticStats);
  finalize(random);
  return { dynamic, static: staticStats, random };
};
