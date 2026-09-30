import { crowdIndex, type CrowdModel } from './crowd';
import { optimizePortfolio, randomPortfolio } from './portfolio';
import { mulberry32, popcount, toMask, type Rng } from './rng';

// Fórmulas de CONSTRUÇÃO de portfólio (mesmo custo = mesmo nº de jogos de 15).
// Todas produzem N jogos; o harness mede P(>=k) em sorteios inéditos.
export interface PortfolioMethod {
  id: string; label: string;
  build: (games: number, seed: number, crowd?: { model: CrowdModel; baseline: number }) => number[][];
}

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);
const cand = (rng: Rng, pool = ALL): number[] => randomPortfolio(1, 15, rng, pool)[0];

// Guloso: entre `tries` candidatos, adiciona o que minimiza a sobreposição total.
const greedyMinOverlap = (games: number, rng: Rng, tries = 300): number[][] => {
  const out = [cand(rng)];
  while (out.length < games) {
    let best = cand(rng); let bestScore = Infinity;
    for (let i = 0; i < tries; i++) {
      const c = cand(rng); const m = toMask(c);
      const s = out.reduce((a, t) => a + popcount(m & toMask(t)) ** 2, 0);
      if (s < bestScore) { bestScore = s; best = c; }
    }
    out.push(best);
  }
  return out;
};

// Balanceado: cada dezena aparece o mesmo nº de vezes (±1) no portfólio.
const balanced = (games: number, rng: Rng): number[][] => {
  const use = new Array(26).fill(0);
  return Array.from({ length: games }, () => {
    const order = [...ALL].sort((a, b) => use[a] - use[b] || rng() - 0.5).slice(0, 15);
    order.forEach((n) => use[n]++);
    return order.sort((a, b) => a - b);
  });
};

// Rotação cíclica: desloca uma janela de 15 dezenas pelo círculo 1..25.
const rotation = (games: number): number[][] =>
  Array.from({ length: games }, (_, i) => Array.from({ length: 15 }, (_, j) => ((i * 2 + j) % 25) + 1).sort((a, b) => a - b));

export const PORTFOLIO_METHODS: PortfolioMethod[] = [
  { id: 'aleatorio', label: 'Aleatório', build: (g, s) => randomPortfolio(g, 15, mulberry32(s)) },
  { id: 'rotacao', label: 'Rotação cíclica', build: (g) => rotation(g) },
  { id: 'balanceado', label: 'Balanceado (cada dezena igual)', build: (g, s) => balanced(g, mulberry32(s)) },
  { id: 'min_sobreposicao', label: 'Guloso mín. sobreposição', build: (g, s) => greedyMinOverlap(g, mulberry32(s)) },
  { id: 'pool18', label: 'Sorteio dentro de pool de 18', build: (g, s) => { const r = mulberry32(s); const pool = [...ALL].sort(() => r() - 0.5).slice(0, 18); return Array.from({ length: g }, () => cand(r, pool)); } },
  { id: 'mc_cobertura', label: 'Monte Carlo (cobertura)', build: (g, s) => optimizePortfolio({ games: g, seed: s, iterations: 6000, annealing: true }) },
  { id: 'mc_faixas', label: 'Monte Carlo (placar por faixa)', build: (g, s) => optimizePortfolio({ games: g, seed: s, iterations: 6000, annealing: true, objective: 'tiered' }) },
  { id: 'mc_multidao', label: 'Monte Carlo + menos disputados', build: (g, s, c) => optimizePortfolio({ games: g, seed: s, iterations: 6000, annealing: true, crowd: c ? { ...c, maxIndex: 0.9 } : undefined }) },
];

export const meanCrowd = (tickets: number[][], c: { model: CrowdModel; baseline: number }): number =>
  tickets.reduce((a, t) => a + crowdIndex(c.model, t, c.baseline), 0) / tickets.length;
