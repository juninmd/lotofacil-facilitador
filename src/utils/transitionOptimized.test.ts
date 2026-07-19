import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
import { sumAutocorrelation, neighborTransition, repeatByFrequency } from './transitionAnalysis';
import { generateOptimizedGame } from './optimizedGenerator';

const mkRng = (seed: number) => {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
};
const rand15 = (rng: () => number) => {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 15).sort((a, b) => a - b);
};
const randomHistory = (n: number, seed = 11): LotofacilResult[] => {
  const rng = mkRng(seed);
  return Array.from({ length: n }, (_, i) => ({
    numero: 3000 - i,
    listaDezenas: rand15(rng),
    dataApuracao: '',
    listaRateioPremio: [],
  }));
};

describe('transitionAnalysis (independência anterior→próximo)', () => {
  const H = randomHistory(2000);

  it('autocorrelação da soma ~0', () => {
    expect(Math.abs(sumAutocorrelation(H))).toBeLessThan(0.1);
  });

  it('taxa dos vizinhos ~60% (sem efeito de proximidade)', () => {
    const r = neighborTransition(H);
    expect(r.taxaVizinho).toBeGreaterThan(0.53);
    expect(r.taxaVizinho).toBeLessThan(0.67);
  });

  it('quentes e frias repetem em taxa parecida (~60%)', () => {
    const r = repeatByFrequency(H);
    expect(Math.abs(r.quentesRepetem - r.friasRepetem)).toBeLessThan(0.1);
  });
});

describe('generateOptimizedGame', () => {
  it('retorna 15 dezenas únicas em 1..25', () => {
    const g = generateOptimizedGame(randomHistory(200), 15, mkRng(3));
    expect(g).toHaveLength(15);
    expect(new Set(g).size).toBe(15);
    g.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(25); });
  });

  it('respeita as âncoras: tem dezena baixa (<=4) e alta (>=22)', () => {
    for (let s = 1; s <= 5; s++) {
      const g = generateOptimizedGame(randomHistory(300, s), 15, mkRng(s * 7));
      expect(g.some((n) => n <= 4)).toBe(true);
      expect(g.some((n) => n >= 22)).toBe(true);
    }
  });
});
