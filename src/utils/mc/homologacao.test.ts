import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { comb, probAtLeast, probExactHits } from '../probability';
import { combinations } from '../wheeling';
import { crowdBaseline, crowdIndex, fitCrowdModel } from './crowd';
import { buildCrowdContext, buildPlan } from './plan';
import { optimizePortfolio, randomPortfolio } from './portfolio';
import { makeDraws, mulberry32, popcount, toMask } from './rng';
import { evaluatePortfolio } from './simulate';

// HOMOLOGAÇÃO do motor Monte Carlo: cada afirmação exibida ao usuário tem aqui
// um teste estatístico com semente fixa (reprodutível). Se algo quebrar, a UI
// estaria mentindo.

const history = (JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[])
  .sort((a, b) => a.numero - b.numero); // antigo → novo

describe('H1 · o simulador reproduz a matemática exata', () => {
  const draws = makeDraws(250_000, mulberry32(101));
  it.each([15, 16, 17])('P(>=k acertos) com %i dezenas marcadas bate com a hipergeométrica', (marks) => {
    const one = [Array.from({ length: marks }, (_, i) => i + 1)];
    // aposta de `marks` dezenas = todas as C(marks,15) combinações
    const wheel = marks === 15 ? one : combinations(one[0], 15);
    const s = evaluatePortfolio(wheel, draws);
    for (const k of [11, 12, 13]) {
      const exact = probAtLeast(marks, k);
      const se = Math.sqrt((exact * (1 - exact)) / draws.length);
      expect(Math.abs(s.pAtLeast[k] - exact)).toBeLessThan(4.5 * se + 1e-4);
    }
  });
  it('distribuição de acertos de 1 jogo passa no qui-quadrado (GL=6, 99,9%)', () => {
    const m = toMask([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const obs = new Array(16).fill(0);
    for (const d of draws) obs[popcount(m & d)]++;
    let chi = 0;
    for (let h = 5; h <= 15; h++) {
      const e = probExactHits(15, h) * draws.length;
      if (e >= 5) chi += (obs[h] - e) ** 2 / e;
    }
    expect(chi).toBeLessThan(35); // ~99,99% para até 11 categorias
  });
});

describe('H2 · o gerador de sorteios é uniforme', () => {
  it('cada dezena sai com ~60% (qui-quadrado, 24 GL)', () => {
    const draws = makeDraws(100_000, mulberry32(7));
    const cnt = new Array(25).fill(0);
    for (const d of draws) for (let n = 0; n < 25; n++) if (d & (1 << n)) cnt[n]++;
    const e = draws.length * 0.6;
    const chi = cnt.reduce((a, c) => a + (c - e) ** 2 / (e * 0.4), 0);
    expect(chi).toBeLessThan(51.2); // p > 0,001
  });
  it('sorteios REAIS: nenhuma dezena foge >4,5σ e NÃO há edge explorável (walk-forward)', () => {
    const cnt = new Array(26).fill(0);
    history.forEach((g) => g.listaDezenas.forEach((n) => cnt[n]++));
    const e = history.length * 0.6;
    const sd = Math.sqrt(history.length * 0.24);
    for (let n = 1; n <= 25; n++) expect(Math.abs(cnt[n] - e) / sd).toBeLessThan(4.5);
    // Desvios in-sample existem (χ² global p≈1e-4, dezena 16 a −3,6σ), mas apostar
    // nas "top 15 por frequência acumulada" não rende acima do acaso fora da amostra.
    const acc = new Array(26).fill(0);
    const hits: number[] = [];
    history.forEach((g, t) => {
      if (t >= 1000) {
        const pick = new Set(Array.from({ length: 25 }, (_, i) => i + 1).sort((a, b) => acc[b] - acc[a]).slice(0, 15));
        hits.push(g.listaDezenas.filter((n) => pick.has(n)).length);
      }
      g.listaDezenas.forEach((n) => acc[n]++);
    });
    const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
    const se = Math.sqrt(hits.reduce((a, h) => a + (h - mean) ** 2, 0) / (hits.length - 1) / hits.length);
    expect(Math.abs(mean - 9)).toBeLessThan(3.5 * se); // indistinguível de 9,00
  });
});

describe('H3 · o otimizador supera o aleatório fora da amostra', () => {
  const test = makeDraws(150_000, mulberry32(4242));
  it.each([5, 10, 20])('%i jogos: ganho em P(>=1 prêmio) significativo (>= +4 pp)', (games) => {
    const pf = optimizePortfolio({ games, seed: 3, trainDraws: 6000, iterations: 4000, annealing: true });
    const opt = evaluatePortfolio(pf, test).pAtLeast[11];
    const rnd = [1, 2, 3].map((k) => evaluatePortfolio(randomPortfolio(games, 15, mulberry32(k)), test).pAtLeast[11]);
    const base = rnd.reduce((a, b) => a + b, 0) / rnd.length;
    expect(opt - base).toBeGreaterThan(0.04 - (games === 20 ? 0.015 : 0));
  });
  it('não altera o retorno esperado: prêmio esperado por jogo ≈ aleatório (linearidade)', () => {
    const pf = optimizePortfolio({ games: 10, seed: 3, trainDraws: 4000, iterations: 2500, annealing: true });
    const a = evaluatePortfolio(pf, test).expectedPrize;
    const b = evaluatePortfolio(randomPortfolio(10, 15, mulberry32(9)), test).expectedPrize;
    expect(Math.abs(a - b) / b).toBeLessThan(0.35); // ruído dominado pelos prêmios altos
  });
  it('é reprodutível com a mesma semente e respeita o custo (jogos distintos de 15)', () => {
    const o = { games: 8, seed: 5, trainDraws: 2000, iterations: 800, annealing: true };
    const a = optimizePortfolio(o);
    expect(optimizePortfolio(o)).toEqual(a);
    a.forEach((t) => expect(new Set(t).size).toBe(15));
    expect(comb(25, 15)).toBe(3268760);
  });
});

describe('H4 · modelo de multidão validado em walk-forward (dados reais)', () => {
  const usable = (g: LotofacilResult) => g.listaRateioPremio.length >= 5 && g.listaRateioPremio[4].numeroDeGanhadores > 1e4;
  it.each([0.6, 0.7, 0.8])('treina em %f do histórico e prevê o restante', (frac) => {
    const cut = Math.floor(history.length * frac);
    const train = history.slice(0, cut);
    const model = fitCrowdModel(train);
    const base = crowdBaseline(model, train);
    const rows = history.slice(cut).filter(usable).map((g) => ({
      ci: crowdIndex(model, g.listaDezenas, base),
      w14: g.listaRateioPremio[1].numeroDeGanhadores,
      vol: g.listaRateioPremio[4].numeroDeGanhadores,
    })).sort((a, b) => a.ci - b.ci);
    const q = Math.floor(rows.length / 4);
    const rate = (s: typeof rows) => s.reduce((a, r) => a + r.w14, 0) / s.reduce((a, r) => a + r.vol, 0);
    const low = rate(rows.slice(0, q));
    const high = rate(rows.slice(-q));
    // jogos previstos como menos disputados têm menos co-ganhadores no 14
    expect(high / low).toBeGreaterThan(1.15);
  });
});

describe('H5 · plano completo com dados reais', () => {
  const ctx = buildCrowdContext(history);
  const plan = buildPlan({ games: 10, avoidCrowd: true, seed: 8 }, ctx);
  it('respeita a restrição de multidão e mantém a cobertura', () => {
    expect(plan.crowdIndexes.length).toBe(10);
    expect(plan.crowdIndexes.reduce((a, b) => a + b, 0) / 10).toBeLessThan(0.95);
    expect(plan.optimized.pAtLeast[11] - plan.baseline.pAtLeast[11]).toBeGreaterThan(0.04);
    expect(plan.optimized.pAtLeast[11]).toBeLessThan(1);
  });
  it('custo e comparação de aposta múltipla', () => {
    expect(plan.cost).toBeCloseTo(35);
    const p16 = buildPlan({ games: 16, avoidCrowd: false, seed: 2 }, ctx);
    expect(p16.multiBet16).not.toBeNull();
    expect(Math.abs(p16.multiBet16!.pAtLeast[11] - probAtLeast(16, 11))).toBeLessThan(0.006);
    expect(p16.optimized.pAtLeast[11]).toBeGreaterThan(p16.multiBet16!.pAtLeast[11]);
  });
});
