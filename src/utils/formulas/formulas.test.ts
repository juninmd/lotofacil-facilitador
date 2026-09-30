import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { buildContext, freqWindow, rankVector, topK } from './context';
import './catalog2';
import { FORMULAS } from './catalog';
import { holm, pTwoSided, runAll, runFormula } from './harness';

const hist = JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[];
const ctx = buildContext(hist.slice(0, 900)); // subconjunto: testes rápidos

describe('contexto walk-forward (sem vazamento do futuro)', () => {
  it('cum/gap em t só usam concursos anteriores a t', () => {
    for (const t of [1, 10, 250, 899]) for (const n of [1, 13, 25]) {
      let cnt = 0, last = -1;
      for (let u = 0; u < t; u++) if (ctx.draws[u].includes(n)) { cnt++; last = u; }
      expect(freqWindow(ctx, t, n, 0)).toBe(cnt);
      expect(ctx.gap[t * 26 + n]).toBe(last < 0 ? t + 1 : t - last);
    }
  });
  it('janela limita corretamente a contagem', () => {
    expect(freqWindow(ctx, 500, 7, 50)).toBe(ctx.draws.slice(450, 500).filter((d) => d.includes(7)).length);
  });
  it('topK devolve 15 dezenas distintas e rankVector é permutação de 1..25', () => {
    const s = Float64Array.from({ length: 26 }, (_, i) => Math.sin(i));
    expect(new Set(topK(s)).size).toBe(15);
    expect([...rankVector(s)].slice(1).sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });
});

describe('catálogo e harness', () => {
  it('ids únicos e escores finitos em todas as fórmulas', () => {
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(FORMULAS.length);
    expect(FORMULAS.length).toBeGreaterThanOrEqual(60);
    const rnd = () => 0.5;
    for (const f of FORMULAS) expect(Array.from(f.score(ctx, 400, rnd)).every(Number.isFinite), f.id).toBe(true);
  });
  it('pTwoSided calibrado', () => {
    expect(pTwoSided(1.96)).toBeCloseTo(0.05, 2);
    expect(pTwoSided(0)).toBeCloseTo(1, 3);
  });
  it('controles aleatórios não têm "edge" e a distribuição soma n', () => {
    const controls = FORMULAS.filter((f) => f.family === 'Controle').map((f) => runFormula(f, ctx, 300));
    controls.forEach((r) => { expect(Math.abs(r.z)).toBeLessThan(4); expect(r.hitsDist.reduce((a, b) => a + b, 0)).toBe(r.n); });
  });
  it('Holm: p ajustado >= p bruto e <= 1', () => {
    const res = runAll(ctx, 500, FORMULAS.slice(0, 12));
    const adj = holm(res);
    res.forEach((r) => { expect(adj.get(r.id)!).toBeGreaterThanOrEqual(r.p - 1e-12); expect(adj.get(r.id)!).toBeLessThanOrEqual(1); });
  });
});

describe('nenhuma fórmula de previsão supera o acaso nos dados reais completos', () => {
  it('após Holm-Bonferroni nenhuma fórmula é significativa (α=0,05)', () => {
    const full = buildContext(hist);
    const light = FORMULAS.filter((f) => !/knn|logit|hazard|par_|dia_|ens_/.test(f.id)); // rápidas
    const res = runAll(full, 1000, light);
    const adj = holm(res);
    expect(Math.min(...adj.values())).toBeGreaterThan(0.05);
  });
});
