import type { LotofacilResult } from '../../game';
import { crowdBaseline, crowdIndex, fitCrowdModel, type CrowdModel } from './crowd';
import { optimizePortfolio, randomPortfolio } from './portfolio';
import { makeDraws, mulberry32 } from './rng';
import { evaluatePortfolio, type PortfolioStats } from './simulate';
import { ticketCost } from '../probability';
import { combinations } from '../wheeling';
import { calibrateReturnModel, expectedReturn, type ReturnModel } from './expectedReturn';

// Orquestra o plano Monte Carlo completo: otimiza o portfólio (sorteios de
// treino), mede o ganho em sorteios NOVOS (fora da amostra) contra portfólios
// aleatórios e calcula o quão "menos disputado" é cada jogo.

export interface PlanOptions { games: number; avoidCrowd: boolean; seed?: number; accumulated?: number }

export interface McPlan {
  tickets: number[][];
  crowdIndexes: number[]; // 1 = jogo típico; <1 = menos disputado
  optimized: PortfolioStats;
  baseline: PortfolioStats;
  cost: number;
  testDraws: number;
  /** Mesmo custo (16 jogos = R$56) como aposta múltipla de 16 dezenas (prêmios agrupados em eventos raros). */
  multiBet16: PortfolioStats | null;
  /** Retorno esperado ajustado (REA, R$/aposta) do portfólio vs um jogo típico, e após acúmulo. */
  rea: { perBet: number; typical: number; edgePct: number; roiPct: number };
}

export interface CrowdContext { model: CrowdModel; baseline: number; returns: ReturnModel }

export const buildCrowdContext = (history: LotofacilResult[]): CrowdContext => {
  const model = fitCrowdModel(history);
  return { model, baseline: crowdBaseline(model, history), returns: calibrateReturnModel(history) };
};

const TEST_DRAWS = 120_000;
const BASELINE_RUNS = 4;

export const buildPlan = (opts: PlanOptions, ctx: CrowdContext): McPlan => {
  const seed = opts.seed ?? Date.now() % 100000;
  const tickets = optimizePortfolio({
    games: opts.games,
    seed,
    trainDraws: 6000,
    iterations: 8000,
    annealing: true,
    crowd: opts.avoidCrowd ? { ...ctx, maxIndex: 0.9 } : undefined,
  });
  const test = makeDraws(TEST_DRAWS, mulberry32(seed ^ 0x9e3779b9));
  const optimized = evaluatePortfolio(tickets, test);
  const runs = Array.from({ length: BASELINE_RUNS }, (_, k) => evaluatePortfolio(randomPortfolio(opts.games, 15, mulberry32(seed + k + 1)), test));
  const avg = (f: (s: PortfolioStats) => number) => runs.reduce((a, s) => a + f(s), 0) / runs.length;
  const baseline: PortfolioStats = {
    ...runs[0],
    pAtLeast: Object.fromEntries([11, 12, 13, 14, 15].map((k) => [k, avg((s) => s.pAtLeast[k])])),
    meanBest: avg((s) => s.meanBest),
    expectedPrize: avg((s) => s.expectedPrize),
  };
  const crowdIndexes = tickets.map((t) => crowdIndex(ctx.model, t, ctx.baseline));
  const meanCrowd = crowdIndexes.reduce((a, b) => a + b, 0) / crowdIndexes.length;
  const mine = expectedReturn(ctx.returns, meanCrowd, opts.accumulated ?? 0);
  const typical = expectedReturn(ctx.returns, 1, opts.accumulated ?? 0).perBet;
  return {
    tickets,
    crowdIndexes,
    rea: { perBet: mine.perBet, typical, edgePct: typical > 0 ? (mine.perBet / typical - 1) * 100 : 0, roiPct: mine.roi * 100 },
    optimized,
    baseline,
    cost: opts.games * ticketCost(15),
    testDraws: TEST_DRAWS,
    multiBet16: opts.games === 16 ? evaluatePortfolio(combinations(Array.from({ length: 16 }, (_, i) => i + 1), 15), test) : null,
  };
};
