import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { buildDataset, mcP, nullDataset } from './dataset';
import { crossStats, family, frequencyStats, lagStats } from './battery';
import { oracleGain, syntheticDataset } from './synthetic';
import { mulberry32 } from '../mc/rng';

const hist = JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[];
const real = buildDataset(hist);
const small = { ...real, N: 1500, masks: real.masks.slice(0, 1500), orders: real.orders.slice(0, 1500), dow: real.dow.slice(0, 1500), month: real.month.slice(0, 1500), dom: real.dom.slice(0, 1500), year: real.year.slice(0, 1500), numero: real.numero.slice(0, 1500) };
const quick = [frequencyStats, lagStats, (d: typeof small) => crossStats(d, 1)];
const pOf = (ds: typeof small, id: string) => family(ds, quick, 120, 7).find((r) => r.id === id)!.p;

describe('perícia: infraestrutura', () => {
  it('mcP tem correção +1 e limites corretos', () => {
    expect(mcP(10, [1, 2, 3])).toBeCloseTo(0.25);
    expect(mcP(0, [1, 2, 3])).toBe(1);
  });
  it('mundo nulo preserva estrutura (N, rótulos) e sorteios têm 15 dezenas', () => {
    const n = nullDataset(small, mulberry32(1));
    expect(n.N).toBe(1500); expect(n.dow).toBe(small.dow);
    for (let t = 0; t < 50; t++) { expect(n.orders[t]).toHaveLength(15); expect(new Set(n.orders[t]).size).toBe(15); }
  });
  it('dados reais: 3738 concursos, todos distintos, cada um com 15 dezenas e ordem completa', () => {
    expect(real.N).toBe(hist.length);
    expect(new Set(real.masks).size).toBe(real.N);
    real.orders.forEach((o) => expect(o).toHaveLength(15));
  });
});

describe('perícia: PODER — vieses conhecidos SÃO detectados (a bateria não é cega)', () => {
  it('mundo uniforme não dispara nada (p > 0,01)', () => {
    const u = nullDataset(small, mulberry32(11));
    expect(pOf(u, 'freq:chi2')).toBeGreaterThan(0.01);
    expect(pOf(u, 'cruzado lag1|freq:chi2')).toBeGreaterThan(0.01);
  });
  it('viés de frequência de ±5 pp é detectado', () => {
    const d = syntheticDataset(small, { kind: 'marginal', delta: 0.05 }, mulberry32(12));
    expect(pOf(d, 'freq:chi2')).toBeLessThan(0.02);
    expect(oracleGain(d)).toBeGreaterThan(0.2); // e valeria >0,2 acerto/concurso
  });
  it('dependência serial ("pegajosa", γ=0,3) é detectada nos testes de lag/cruzado', () => {
    const d = syntheticDataset(small, { kind: 'sticky', gamma: 0.3 }, mulberry32(13));
    expect(Math.min(pOf(d, 'lag(n→n):chi2'), pOf(d, 'cruzado lag1|freq:chi2'))).toBeLessThan(0.02);
  });
});
