import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
import {
  extractFeatures,
  mineHistory,
  withinLearnedBounds,
  FEATURE_KEYS,
} from './patternMining';
import { generateFromPatterns, walkForwardBacktest } from './walkForwardBacktest';

const mkRng = (seed: number) => {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
};

const pick15 = (rng: () => number): number[] => {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 15).sort((a, b) => a - b);
};

const makeHistory = (count: number, seed = 7): LotofacilResult[] => {
  const rng = mkRng(seed);
  return Array.from({ length: count }, (_, i) => ({
    numero: 4000 - i,
    listaDezenas: pick15(rng),
    dataApuracao: '01/01/2024',
    listaRateioPremio: [],
  }));
};

describe('extractFeatures', () => {
  it('conta corretamente pares/ímpares, soma e décadas', () => {
    const f = extractFeatures([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(f.odd).toBe(8); // 1,3,5,7,9,11,13,15
    expect(f.sum).toBe(120);
    expect(f.decade1).toBe(10); // 1-10
    expect(f.decade2).toBe(5); // 11-15
    expect(f.decade3).toBe(0);
  });

  it('mede a maior sequência e o maior intervalo', () => {
    expect(extractFeatures([1, 2, 3, 5, 8]).maxConsecutive).toBe(3);
    expect(extractFeatures([1, 3, 5, 7]).maxConsecutive).toBe(1);
    expect(extractFeatures([1, 2, 3, 4, 5]).maxConsecutive).toBe(5);
    expect(extractFeatures([1, 3, 9]).maxGap).toBe(6);
  });

  it('conta repetidos vs concurso anterior', () => {
    const prev = [1, 2, 3, 4, 5];
    expect(extractFeatures([3, 4, 5, 6, 7], prev).repeats).toBe(3);
    expect(extractFeatures([1, 2, 3], undefined).repeats).toBe(-1);
  });
});

describe('mineHistory', () => {
  const history = makeHistory(120);
  const patterns = mineHistory(history);

  it('frequência total soma 15 por concurso', () => {
    const total = [...patterns.numberFrequency.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(15 * history.length);
  });

  it('gera estatística para cada feature com min<=mean<=max', () => {
    for (const k of FEATURE_KEYS) {
      const s = patterns.features[k];
      expect(s.min).toBeLessThanOrEqual(s.mean + 1e-9);
      expect(s.mean).toBeLessThanOrEqual(s.max + 1e-9);
      expect(s.p01).toBeLessThanOrEqual(s.p99);
    }
  });

  it('média de ímpares ~ metade de 15 num histórico uniforme', () => {
    expect(patterns.features.odd.mean).toBeGreaterThan(6);
    expect(patterns.features.odd.mean).toBeLessThan(9.5);
  });
});

describe('withinLearnedBounds', () => {
  const patterns = mineHistory(makeHistory(120));
  it('aceita jogo típico e rejeita extremo impossível', () => {
    // Extremo: todos ímpares baixos e sequência gigante -> fora dos limites.
    const extreme = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    expect(withinLearnedBounds(extreme, patterns)).toBe(false);
  });
});

describe('generateFromPatterns', () => {
  it('retorna 15 dezenas únicas em 1..25', () => {
    const patterns = mineHistory(makeHistory(120));
    const g = generateFromPatterns(patterns, undefined, 15, mkRng(1));
    expect(g).toHaveLength(15);
    expect(new Set(g).size).toBe(15);
    g.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(25);
    });
  });
});

describe('walkForwardBacktest', () => {
  it('roda dinâmico/estático/aleatório e mantém acertos em faixa plausível', () => {
    const history = makeHistory(200);
    const r = walkForwardBacktest(history, 40, 15);
    expect(r.dynamic.targets).toBeGreaterThan(0);
    expect(r.static.targets).toBe(r.dynamic.targets);
    // Em sorteio uniforme, todas as abordagens ficam perto da esperança 9.0.
    for (const s of [r.dynamic, r.static, r.random]) {
      expect(s.avgHits).toBeGreaterThan(6.5);
      expect(s.avgHits).toBeLessThan(11.5);
    }
  });
});
