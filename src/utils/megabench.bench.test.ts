import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { LotofacilResult } from '../game';
import { loadHistory } from './loadHistory';
import {
  generateSmartGame,
  generateMarkovGame,
  generateKNNGame,
  generateConsensusGame,
  generateRandomGame,
  generateMax15Game,
} from './statistics';
import { generateGeneticGame } from './genetic';
import { generateBayesianGame } from './bayesianStrategy';
import { generateRegressionGame } from './regressionStrategy';
import { generateRandomForestGame } from './randomForestStrategy';
import { generateGradientBoostingGame } from './gradientBoostingStrategy';
import { generateXGBoostGame } from './xgbStrategy';
import { generateQLearningGame } from './qLearningStrategy';
import { generatePatternGame } from './patternStrategy';
import { analyzeMarking, expectedHits, probAtLeast } from './probability';

// ---------------------------------------------------------------------------
// MEGA-BENCHMARK (homologação exaustiva, dados reais + Monte Carlo)
//
// Objetivo do usuário: "acertar mais números". Este benchmark testa milhares de
// possibilidades para descobrir empiricamente a MELHOR forma — e confirma o que
// a matemática já prova: prever não ajuda; marcar mais dezenas ajuda.
//
// Fora do CI. Rode: npm run test:backtest  (inclui *.bench.test.ts)
// ---------------------------------------------------------------------------


const hits = (pick: number[], draw: number[]) => pick.filter((n) => draw.includes(n)).length;
// PRNG determinístico p/ Monte Carlo reprodutível.
const rng = (() => {
  let s = 123456789;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
})();
const randomTicket = (k: number): number[] => {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k);
};

describe('mega-benchmark', () => {
  it(
    'testa milhares de possibilidades e elege a melhor forma de acertar mais',
    async () => {
      const HISTORY = (await loadHistory()).slice(0, 400);
      if (HISTORY.length < 150) {
        console.warn(`Pulado: só ${HISTORY.length} jogos.`);
        return;
      }
      const draws = HISTORY.map((g) => g.listaDezenas);

      // === PARTE 1: Monte Carlo — milhares de cartelas aleatórias por tamanho ===
      // Confirma que P(>=X) empírica bate com a teoria hipergeométrica em sorteios reais.
      const TICKETS = 4000;
      const mc: Record<number, { avg: number; p13: number; p14: number; p15: number }> = {};
      for (let k = 15; k <= 20; k++) {
        let sum = 0, c13 = 0, c14 = 0, c15 = 0, trials = 0;
        for (let t = 0; t < TICKETS; t++) {
          const ticket = randomTicket(k);
          for (const d of draws) {
            const h = hits(ticket, d);
            sum += h;
            if (h >= 13) c13++;
            if (h >= 14) c14++;
            if (h >= 15) c15++;
            trials++;
          }
        }
        mc[k] = { avg: sum / trials, p13: c13 / trials, p14: c14 / trials, p15: c15 / trials };
      }

      // === PARTE 2: Teoria exata (hipergeométrica) por tamanho de cartela ===
      const theory = [];
      for (let k = 15; k <= 20; k++) {
        const a = analyzeMarking(k);
        theory.push({
          dezenas: k,
          custoR$: +a.cost.toFixed(2),
          E_acertos: +expectedHits(k).toFixed(3),
          'P>=13': +probAtLeast(k, 13).toFixed(6),
          'P>=14': +a.pAtLeast14.toFixed(6),
          'P15 (1 em)': Math.round(a.oddsTopPrize),
          mc_E: +mc[k].avg.toFixed(3),
        });
      }

      // === PARTE 3: Backtest de todas as estratégias (cartela de 15) ===
      const fast: Record<string, (h: LotofacilResult[]) => number[]> = {
        smart: (h) => generateSmartGame(h),
        markov: (h) => generateMarkovGame(h),
        knn: (h) => generateKNNGame(h),
        genetic: (h) => generateGeneticGame(h),
        bayesian: (h) => generateBayesianGame(h),
        regression: (h) => generateRegressionGame(h),
        randomForest: (h) => generateRandomForestGame(h),
        gradientBoost: (h) => generateGradientBoostingGame(h),
        xgboost: (h) => generateXGBoostGame(h),
        qlearning: (h) => generateQLearningGame(h),
        pattern: (h) => generatePatternGame(h),
        max15: (h) => generateMax15Game(h),
        random: () => generateRandomGame(),
      };
      const SIMS = 80;
      const stratTotals: Record<string, number> = {};
      const stratBest: Record<string, number> = {};
      for (const k of Object.keys(fast)) { stratTotals[k] = 0; stratBest[k] = 0; }
      for (let i = 0; i < SIMS; i++) {
        const target = HISTORY[i];
        const train = HISTORY.slice(i + 1, i + 101);
        if (train.length < 60) break;
        for (const [name, fn] of Object.entries(fast)) {
          const h = hits(fn(train), target.listaDezenas);
          stratTotals[name] += h;
          if (h > stratBest[name]) stratBest[name] = h;
        }
      }
      // Consensus separado (mais lento), menos sims.
      let consSum = 0, consN = 0;
      for (let i = 0; i < 25; i++) {
        const train = HISTORY.slice(i + 1, i + 101);
        if (train.length < 60) break;
        consSum += hits(generateConsensusGame(train), HISTORY[i].listaDezenas);
        consN++;
      }
      const strategies = Object.keys(fast)
        .map((k) => ({ estrategia: k, mediaAcertos: +(stratTotals[k] / SIMS).toFixed(3), melhor: stratBest[k] }))
        .concat([{ estrategia: 'consensus', mediaAcertos: +(consSum / consN).toFixed(3), melhor: 0 }])
        .sort((a, b) => b.mediaAcertos - a.mediaAcertos);

      // === Relatório ===
      console.log(`\n===== MEGA-BENCHMARK (${HISTORY.length} jogos, ${TICKETS} cartelas/tamanho, ${SIMS} sims) =====`);
      console.log('\n[1] TEORIA vs MONTE CARLO — marcar mais dezenas:');
      console.table(theory);
      console.log('\n[2] ESTRATÉGIAS (cartela de 15) — todas empatam ~9.0 (esperança):');
      console.table(strategies);

      const report = {
        geradoEm: HISTORY[0]?.dataApuracao,
        ultimoConcurso: HISTORY[0]?.numero,
        jogosAnalisados: HISTORY.length,
        cartelasMonteCarlo: TICKETS,
        simulacoesEstrategia: SIMS,
        tradeoffDezenas: theory,
        estrategias: strategies,
      };
      writeFileSync('bench-report.json', JSON.stringify(report, null, 2));
      console.log('\nRelatório salvo em bench-report.json');

      // Homologação: teoria e Monte Carlo devem coincidir (sorteio é uniforme).
      for (let k = 15; k <= 20; k++) {
        expect(mc[k].avg).toBeCloseTo(expectedHits(k), 1);
      }
      // Nenhuma estratégia de 15 dezenas supera materialmente a esperança 9.0.
      for (const s of strategies) {
        expect(s.mediaAcertos).toBeGreaterThan(7.5);
        expect(s.mediaAcertos).toBeLessThan(10.5);
      }
    },
    600_000,
  );
});