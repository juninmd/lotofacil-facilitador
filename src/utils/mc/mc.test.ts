import { describe, expect, it } from 'vitest';
import { mulberry32, makeDraws, popcount, toMask, fromMask, randomMask } from './rng';
import { evaluatePortfolio } from './simulate';
import { optimizePortfolio, randomPortfolio } from './portfolio';
import { fitCrowdModel, crowdIndex, crowdBaseline, featuresOf } from './crowd';
import { probAtLeast } from '../probability';
import type { LotofacilResult } from '../../game';

describe('rng / máscaras', () => {
  it('é reprodutível com a mesma semente', () => {
    expect(mulberry32(7)()).toBe(mulberry32(7)());
    expect(mulberry32(7)()).not.toBe(mulberry32(8)());
  });
  it('toMask/fromMask são inversas e popcount conta bits', () => {
    const t = [1, 5, 9, 25];
    expect(fromMask(toMask(t))).toEqual(t);
    expect(popcount(toMask(t))).toBe(4);
  });
  it('sorteia sempre 15 dezenas distintas', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) expect(popcount(randomMask(rng))).toBe(15);
  });
});

describe('simulação Monte Carlo', () => {
  it('converge para a hipergeométrica exata (P(>=11) de 1 jogo)', () => {
    const draws = makeDraws(200000, mulberry32(11));
    const s = evaluatePortfolio([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]], draws);
    expect(Math.abs(s.pAtLeast[11] - probAtLeast(15, 11))).toBeLessThan(4 * s.seAny11);
    expect(s.meanBest).toBeCloseTo(9, 1);
  });
});

describe('otimizador de portfólio', () => {
  it('gera jogos válidos e não perde para o aleatório (fora da amostra)', () => {
    const pf = optimizePortfolio({ games: 6, trainDraws: 3000, iterations: 600, seed: 5 });
    expect(pf).toHaveLength(6);
    pf.forEach((t) => { expect(new Set(t).size).toBe(15); expect(t.every((n) => n >= 1 && n <= 25)).toBe(true); });
    const test = makeDraws(60000, mulberry32(99));
    const opt = evaluatePortfolio(pf, test).pAtLeast[11];
    const rnd = evaluatePortfolio(randomPortfolio(6, 15, mulberry32(4)), test).pAtLeast[11];
    expect(opt).toBeGreaterThanOrEqual(rnd - 0.01);
  });
  it('respeita o pool (desdobramento)', () => {
    const pool = Array.from({ length: 18 }, (_, i) => i + 1);
    const pf = optimizePortfolio({ games: 4, pool, trainDraws: 1000, iterations: 200, seed: 2 });
    pf.flat().forEach((n) => expect(pool).toContain(n));
  });
});

describe('modelo de multidão', () => {
  const mk = (n: number, dz: number[], w15: number, w14: number): LotofacilResult => ({
    numero: n, listaDezenas: dz, dataApuracao: '', listaRateioPremio: [
      { faixa: 1, numeroDeGanhadores: w15, valorPremio: 0, descricaoFaixa: '' },
      { faixa: 2, numeroDeGanhadores: w14, valorPremio: 0, descricaoFaixa: '' },
      { faixa: 3, numeroDeGanhadores: 0, valorPremio: 0, descricaoFaixa: '' },
      { faixa: 4, numeroDeGanhadores: 0, valorPremio: 0, descricaoFaixa: '' },
      { faixa: 5, numeroDeGanhadores: 500000, valorPremio: 0, descricaoFaixa: '' },
    ],
  });
  it('features têm dimensão fixa e o ajuste converge a números finitos', () => {
    const rng = mulberry32(1);
    const hist = Array.from({ length: 120 }, (_, i) => mk(i, fromMask(randomMask(rng)), 3, 500));
    expect(featuresOf(hist[0].listaDezenas)).toHaveLength(6);
    const m = fitCrowdModel(hist);
    expect(m.coef.every(Number.isFinite)).toBe(true);
    expect(crowdIndex(m, hist[0].listaDezenas, crowdBaseline(m, hist))).toBeGreaterThan(0);
  });
});
