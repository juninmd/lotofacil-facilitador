import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
import { analyzeRepetition, analyzeOverdue, analyzeAutocorrelation } from './repetitionAnalysis';
import { scanEdges, STRATEGIES } from './edgeScan';

const g = (numero: number, dezenas: number[]): LotofacilResult => ({
  numero,
  listaDezenas: dezenas,
  dataApuracao: '',
  listaRateioPremio: [],
});

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
const randomHistory = (n: number, seed = 5): LotofacilResult[] => {
  const rng = mkRng(seed);
  return Array.from({ length: n }, (_, i) => g(3000 - i, rand15(rng)));
};

describe('analyzeRepetition', () => {
  it('detecta sorteios exatos repetidos', () => {
    const dezenas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const hist = [g(3, dezenas), g(2, dezenas), g(1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16])];
    const r = analyzeRepetition(hist);
    expect(r.sorteiosExatosRepetidos).toBe(1);
  });

  it('mede repetição consecutiva corretamente', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17]; // 13 em comum com a
    const r = analyzeRepetition([g(2, a), g(1, b)]);
    expect(r.repeticaoConsecutiva.max).toBe(13);
  });

  it('num histórico uniforme, taxa de repetição ~60% (esperança)', () => {
    const r = analyzeRepetition(randomHistory(1500));
    expect(r.taxaRepeticaoObservada).toBeGreaterThan(0.5);
    expect(r.taxaRepeticaoObservada).toBeLessThan(0.7);
  });
});

describe('analyzeAutocorrelation (independência)', () => {
  it('P(sair|saiu) ~ P(sair|não saiu) ~ 60% em sorteio uniforme', () => {
    const a = analyzeAutocorrelation(randomHistory(2000));
    expect(Math.abs(a.dado - a.naoDado)).toBeLessThan(0.06); // sem dependência forte
    expect(a.dado).toBeGreaterThan(0.5);
    expect(a.dado).toBeLessThan(0.7);
  });
});

describe('analyzeOverdue (falácia do atrasado)', () => {
  it('taxa de saída fica ~60% em qualquer atraso (uniforme)', () => {
    const buckets = analyzeOverdue(randomHistory(2000), 8);
    expect(buckets.length).toBeGreaterThan(3);
    for (const b of buckets) {
      if (b.amostras > 200) {
        expect(b.taxaSaida).toBeGreaterThan(0.45);
        expect(b.taxaSaida).toBeLessThan(0.75);
      }
    }
  });
});

describe('scanEdges', () => {
  it('avalia todas as estratégias e nenhuma supera ~9.0 em dados uniformes', () => {
    const results = scanEdges(randomHistory(400), 120, 15);
    expect(results.length).toBe(Object.keys(STRATEGIES).length);
    for (const e of results) {
      expect(e.alvos).toBeGreaterThan(0);
      expect(e.media).toBeGreaterThan(7);
      expect(e.media).toBeLessThan(11);
      expect(e.ic95[0]).toBeLessThanOrEqual(e.media);
      expect(e.ic95[1]).toBeGreaterThanOrEqual(e.media);
    }
  });
});
