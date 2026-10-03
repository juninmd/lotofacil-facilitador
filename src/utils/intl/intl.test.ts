import { describe, expect, it } from 'vitest';
import { analyze, randomDraws, statistics, vpeProbs, vpeWalkForward, type Format } from './lottery';
import { parseCsvDraws } from './formats';
import { mulberry32 } from '../mc/rng';

const F649: Format = { id: '6/49', n: 49, k: 6 };

// Amostragem 6/49 com viés (Gumbel-top-k) para testar o poder do pipeline.
const biased = (f: Format, count: number, amp: number, seed: number): number[][] => {
  const rng = mulberry32(seed);
  const bias = Array.from({ length: f.n }, (_, i) => amp * Math.sin(i * 2.399 + 1));
  return Array.from({ length: count }, () =>
    bias.map((b, i) => [b - Math.log(-Math.log(Math.max(1e-12, rng()))), i + 1] as const).sort((a, b) => b[0] - a[0]).slice(0, f.k).map((x) => x[1]).sort((a, b) => a - b));
};

describe('parser de CSV', () => {
  const csv = '"Draw Date","Winning Numbers","Multiplier"\n"10/09/2015","10 20 30 40 50 05","2"\n"10/14/2015","01 02 03 04 69 12","3"\n"10/07/2015","11 22 33 44 55 06","2"\n"09/01/2015","11 22 33 44 55 06","2"\n"10/21/2015","99 02 03 04 05 01","3"';
  const f: Format = { id: 'pb', n: 69, k: 5 };
  it('ordena por data, ignora bola extra, filtra era e números fora de 1..n', () => {
    const d = parseCsvDraws(csv, f, '2015-10-01');
    expect(d).toEqual([[11, 22, 33, 44, 55], [10, 20, 30, 40, 50], [1, 2, 3, 4, 69]]);
  });
});

describe('perícia genérica k-de-n', () => {
  it('sorteios uniformes 6/49: nada é sinalizado (p>0,01)', () => {
    const d = randomDraws(F649, 1500, mulberry32(3));
    analyze(d, F649, 80, 9).forEach((v) => expect(v.p, v.id).toBeGreaterThan(0.01));
  });
  it('viés injetado em 6/49 é detectado na frequência e na persistência', () => {
    const d = biased(F649, 2500, 0.25, 5);
    const r = analyze(d, F649, 80, 9);
    expect(r.find((v) => v.id === 'freq:chi2')!.p).toBeLessThan(0.02);
    expect(r.find((v) => v.id === 'persistência:corr metades')!.p).toBeLessThan(0.05);
  });
  it('VPE: ganho preditivo positivo com viés, ≈ nulo sem viés', () => {
    const withBias = vpeWalkForward(biased(F649, 2500, 0.25, 6), F649, 1200);
    expect(withBias.z).toBeGreaterThan(2);
    expect(withBias.hits).toBeGreaterThan(withBias.expected);
    expect(Math.abs(vpeWalkForward(randomDraws(F649, 2500, mulberry32(7)), F649, 1200).z)).toBeLessThan(3);
  });
  it('estimador não inventa viés em mundo uniforme (p̂ ≈ k/n)', () => {
    const { probs } = vpeProbs(randomDraws(F649, 2000, mulberry32(8)), F649);
    probs.forEach((p) => expect(Math.abs(p - 6 / 49)).toBeLessThan(0.015));
    expect(Object.keys(statistics(randomDraws(F649, 200, mulberry32(1)), F649)).length).toBeGreaterThanOrEqual(5);
  });
});
