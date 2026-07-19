import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
import { getMostFrequentNumbers } from '../game';
import {
  calculateStats,
  calculateDelays,
  getCycleMissingNumbers,
  backtestGame,
  scoreCandidate,
  getDynamicStats,
  getWeightedRandomSubset,
  calculateMomentum,
  calculateProjectedStats,
  calculateConfidence,
  generateRandomGame,
  generateSmartGame,
  generateMax15Game,
  generateMarkovGame,
  generateKNNGame,
  generateConsensusGame,
} from './statistics';
import { generateGeneticGame } from './genetic';
import { generatePatternGame } from './patternStrategy';
import { generateBayesianGame } from './bayesianStrategy';
import { generateRegressionGame } from './regressionStrategy';
import { generateRandomForestGame } from './randomForestStrategy';
import { generateGradientBoostingGame } from './gradientBoostingStrategy';
import { generateXGBoostGame } from './xgbStrategy';
import { generateQLearningGame } from './qLearningStrategy';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// Deterministic PRNG (mulberry32) so history is varied yet reproducible.
const makeRng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick15 = (rng: () => number): number[] => {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 15).sort((a, b) => a - b);
};

const makeHistory = (count: number, seed = 42): LotofacilResult[] => {
  const rng = makeRng(seed);
  const history: LotofacilResult[] = [];
  for (let i = 0; i < count; i++) {
    history.push({
      numero: 3000 - i, // descending: index 0 is newest
      listaDezenas: pick15(rng),
      dataApuracao: '01/01/2024',
      listaRateioPremio: [
        { faixa: 1, numeroDeGanhadores: 2, valorPremio: 1_500_000, descricaoFaixa: '15 acertos' },
        { faixa: 2, numeroDeGanhadores: 200, valorPremio: 1500, descricaoFaixa: '14 acertos' },
      ],
    });
  }
  return history;
};

const isValidGame = (game: number[], quantity = 15) => {
  expect(game).toHaveLength(quantity);
  expect(new Set(game).size).toBe(quantity); // unique
  game.forEach((n) => {
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(25);
  });
  // sorted ascending
  expect([...game].sort((a, b) => a - b)).toEqual(game);
};

const HISTORY = makeHistory(150);

// ---------------------------------------------------------------------------
// Pure statistical helpers
// ---------------------------------------------------------------------------

describe('getMostFrequentNumbers', () => {
  it('counts occurrences and sorts by frequency desc', () => {
    const games: LotofacilResult[] = [
      { numero: 1, listaDezenas: [1, 2, 3], dataApuracao: '', listaRateioPremio: [] },
      { numero: 2, listaDezenas: [1, 2, 4], dataApuracao: '', listaRateioPremio: [] },
      { numero: 3, listaDezenas: [1, 5, 6], dataApuracao: '', listaRateioPremio: [] },
    ];
    const freq = getMostFrequentNumbers(games);
    expect(freq[0]).toEqual({ number: 1, count: 3 });
    // 2 appears twice, then singles; ties broken by number asc
    expect(freq[1]).toEqual({ number: 2, count: 2 });
    const totalCount = freq.reduce((a, b) => a + b.count, 0);
    expect(totalCount).toBe(9);
  });
});

describe('calculateStats', () => {
  it('computes averages consistent with a fixed sample', () => {
    const games: LotofacilResult[] = [
      { numero: 1, listaDezenas: [1, 2, 3, 4], dataApuracao: '', listaRateioPremio: [] },
    ];
    const s = calculateStats(games);
    expect(s.avgSum).toBe(10);
    expect(s.avgOdd).toBe(2); // 1,3
    expect(s.avgEven).toBe(2); // 2,4
  });

  it('avgOdd + avgEven equals 15 for real lotofacil games', () => {
    const s = calculateStats(HISTORY);
    expect(s.avgOdd + s.avgEven).toBeCloseTo(15, 5);
  });
});

describe('calculateDelays', () => {
  it('reports 0 delay for numbers in the most recent game', () => {
    const delays = calculateDelays(HISTORY);
    HISTORY[0].listaDezenas.forEach((n) => expect(delays.get(n)).toBe(0));
    // every number 1..25 has an entry
    for (let i = 1; i <= 25; i++) expect(delays.has(i)).toBe(true);
  });

  it('caps unseen numbers at history length', () => {
    const single: LotofacilResult[] = [
      { numero: 1, listaDezenas: [1, 2, 3, 4, 5], dataApuracao: '', listaRateioPremio: [] },
    ];
    const delays = calculateDelays(single);
    expect(delays.get(25)).toBe(1); // never appeared → history.length
    expect(delays.get(1)).toBe(0);
  });
});

describe('getCycleMissingNumbers', () => {
  it('returns numbers not yet seen in the open cycle', () => {
    const missing = getCycleMissingNumbers(HISTORY);
    missing.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(25);
    });
    expect(new Set(missing).size).toBe(missing.length);
  });
});

describe('backtestGame', () => {
  it('scores fixed prizes and cost correctly', () => {
    // A selection that hits exactly 13 of a known game
    const game: LotofacilResult = {
      numero: 1,
      listaDezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      dataApuracao: '',
      listaRateioPremio: [],
    };
    // selection shares 13 numbers with the game (1..13) + 2 outside (20,21)
    const selection = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 21];
    const r = backtestGame(selection, [game]);
    expect(r[13]).toBe(1);
    expect(r.totalPrize).toBe(35); // fixed prize for 13 hits
    expect(r.totalCost).toBeCloseTo(3.5, 5); // 1 game * R$3.50 (15 dezenas)
    expect(r.netProfit).toBeCloseTo(35 - 3.5, 5);
  });

  it('reads faixa prizes from rateio for 14/15 hits', () => {
    const game: LotofacilResult = {
      numero: 1,
      listaDezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      dataApuracao: '',
      listaRateioPremio: [{ faixa: 2, numeroDeGanhadores: 10, valorPremio: 2000, descricaoFaixa: '14' }],
    };
    // 14 hits (miss #15, add #20)
    const selection = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20];
    const r = backtestGame(selection, [game]);
    expect(r[14]).toBe(1);
    expect(r.totalPrize).toBe(2000);
  });
});

describe('scoreCandidate hard constraints', () => {
  const stats = getDynamicStats(HISTORY);

  it('rejects out-of-range sums', () => {
    // sum way too low
    const bad = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // sum 120
    expect(scoreCandidate(bad, stats)).toBeLessThanOrEqual(0.001);
  });

  it('returns a positive score for a plausible balanced game', () => {
    // Construct a game inside the accepted envelope: sum ~195, 8 odd
    const good = [1, 3, 4, 6, 8, 10, 11, 13, 15, 16, 18, 20, 22, 23, 25];
    const score = scoreCandidate(good, stats, HISTORY[0].listaDezenas);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1.01);
  });
});

describe('getWeightedRandomSubset', () => {
  it('always returns the requested count of unique in-range items', () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const weights = new Map(items.map((n) => [n, n])); // heavier for higher
    for (let t = 0; t < 50; t++) {
      const subset = getWeightedRandomSubset(items, weights, 15);
      isValidGame(subset);
    }
  });
});

describe('calculateMomentum', () => {
  it('returns empty map with insufficient history', () => {
    expect(calculateMomentum(HISTORY.slice(0, 10)).size).toBe(0);
  });
  it('produces a value for each number with enough history', () => {
    const m = calculateMomentum(HISTORY);
    expect(m.size).toBe(25);
  });
});

describe('calculateProjectedStats & calculateConfidence', () => {
  it('projects average hits within 0..15', () => {
    const game = generateSmartGame(HISTORY);
    const p = calculateProjectedStats(game, HISTORY.slice(0, 100));
    expect(p.averageHits).toBeGreaterThanOrEqual(0);
    expect(p.averageHits).toBeLessThanOrEqual(15);
    expect(p.estimatedPrize).toBeGreaterThanOrEqual(0);
  });
  it('confidence is bounded 0..99', () => {
    const c = calculateConfidence(generateSmartGame(HISTORY), HISTORY);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(99);
  });
});

// ---------------------------------------------------------------------------
// Generator invariants — every strategy must produce a legal Lotofácil ticket.
// This is the core homologation: a violation here is a real bug.
// ---------------------------------------------------------------------------

describe('generator invariants (quantity=15)', () => {
  const generators: Array<[string, () => number[]]> = [
    ['random', () => generateRandomGame()],
    ['smart', () => generateSmartGame(HISTORY)],
    ['max15', () => generateMax15Game(HISTORY)],
    ['markov', () => generateMarkovGame(HISTORY)],
    ['knn', () => generateKNNGame(HISTORY)],
    ['consensus', () => generateConsensusGame(HISTORY)],
    ['genetic', () => generateGeneticGame(HISTORY)],
    ['pattern', () => generatePatternGame(HISTORY)],
    ['bayesian', () => generateBayesianGame(HISTORY)],
    ['regression', () => generateRegressionGame(HISTORY)],
    ['randomForest', () => generateRandomForestGame(HISTORY)],
    ['gradientBoosting', () => generateGradientBoostingGame(HISTORY)],
    ['xgboost', () => generateXGBoostGame(HISTORY)],
    ['qlearning', () => generateQLearningGame(HISTORY)],
  ];

  for (const [name, gen] of generators) {
    it(`${name} returns a valid 15-number ticket`, () => {
      isValidGame(gen(), 15);
    });
  }
});

describe('generator invariants (quantity=18)', () => {
  it('smart honors custom quantity', () => {
    isValidGame(generateSmartGame(HISTORY, undefined, 18), 18);
  });
  it('random honors custom quantity', () => {
    isValidGame(generateRandomGame(18), 18);
  });
});
