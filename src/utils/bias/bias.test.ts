import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { calibrateLogWeights, estimateBias, expectedHitsUnder, topByBias } from './biasModel';
import { predictiveLogLikGain } from './evaluate';
import { fromMask, makeDraws, makeWeightedDraws, mulberry32 } from '../mc/rng';

const asc = (JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[]).sort((a, b) => a.numero - b.numero);
const sets = asc.map((g) => g.listaDezenas);
const marg = (d: Int32Array) => Array.from({ length: 25 }, (_, n) => d.reduce((a, m) => a + ((m >>> n) & 1), 0) / d.length);

describe('amostragem ponderada e calibração', () => {
  it('pesos zero = sorteio uniforme (marginais ≈ 60%)', () => {
    marg(makeWeightedDraws(60000, mulberry32(1), new Float64Array(25))).forEach((p) => expect(Math.abs(p - 0.6)).toBeLessThan(0.012));
  });
  it('calibração reproduz as marginais-alvo (erro < 1 pp)', () => {
    const target = Array.from({ length: 25 }, (_, n) => 0.6 + 0.02 * Math.sin(n * 1.7));
    const logW = calibrateLogWeights(target);
    const got = marg(makeWeightedDraws(80000, mulberry32(2), logW));
    got.forEach((p, n) => expect(Math.abs(p - target[n])).toBeLessThan(0.01));
  });
});

describe('estimador VPE', () => {
  it('em mundo uniforme o encolhimento mantém p̂ perto de 60% (sem inventar viés)', () => {
    const draws = Array.from(makeDraws(3000, mulberry32(3)), (m) => fromMask(m));
    const m = estimateBias(draws, 1, false);
    m.probs.forEach((p) => expect(Math.abs(p - 0.6)).toBeLessThan(0.012));
  });
  it('em mundo com viés (σ≈1pp) recupera o padrão: correlação p̂×verdade > 0,5', () => {
    const truth = Array.from({ length: 25 }, (_, n) => 0.6 + 0.0135 * Math.sin(n * 2.1 + 0.5));
    const draws = Array.from(makeWeightedDraws(3000, mulberry32(4), calibrateLogWeights(truth)), (m) => fromMask(m));
    const est = estimateBias(draws, 1, false);
    const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    const a = est.probs, b = truth, ma = mean(a), mb = mean(b);
    const r = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    expect(r).toBeGreaterThan(0.5);
    expect(est.shrink).toBeGreaterThan(0.2); expect(est.shrink).toBeLessThan(1);
    expect(expectedHitsUnder(est, topByBias(est))).toBeGreaterThan(9.02);
  });
});

describe('HOMOLOGAÇÃO com dados reais: o viés persistente é real e preditivo', () => {
  it('desvios por dezena persistem entre 1ª e 2ª metade do histórico (corr > 0,2; nulo: 0±0,2)', () => {
    const half = Math.floor(sets.length / 2);
    const zv = (s: number[][]) => { const c = new Array(25).fill(0); s.forEach((d) => d.forEach((n) => c[n - 1]++)); const sd = Math.sqrt(s.length * 0.24); return c.map((v) => (v - 0.6 * s.length) / sd); };
    const a = zv(sets.slice(0, half)), b = zv(sets.slice(half));
    const ma = a.reduce((x, y) => x + y, 0) / 25, mb = b.reduce((x, y) => x + y, 0) / 25;
    const r = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0) / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    expect(r).toBeGreaterThan(0.2);
  });
  it('fora da amostra (concursos 2000+) o VPE ganha log-verossimilhança (z > 1,5) e acertos > 9,02', () => {
    const r = predictiveLogLikGain(sets, 2000);
    expect(r.gain).toBeGreaterThan(0);
    expect(r.z).toBeGreaterThan(1.5);
    expect(r.hits).toBeGreaterThan(9.02);
  });
  it('σ do viés estimado ≈ 1 pp e p̂ dentro de [0,57; 0,63]', () => {
    const m = estimateBias(sets, 1, false);
    expect(m.sigmaB).toBeGreaterThan(0.006); expect(m.sigmaB).toBeLessThan(0.014);
    m.probs.forEach((p) => { expect(p).toBeGreaterThan(0.57); expect(p).toBeLessThan(0.63); });
  });
});
