import { describe, it, expect } from 'vitest';
import { loadHistory } from './loadHistory.bench';
import {
  generateSmartGame,
  generateMarkovGame,
  generateKNNGame,
  generateConsensusGame,
  generateRandomGame,
} from './statistics';
import { generateGeneticGame } from './genetic';
import { generateBayesianGame } from './bayesianStrategy';
import { generateRegressionGame } from './regressionStrategy';
import { generateRandomForestGame } from './randomForestStrategy';
import { generateGradientBoostingGame } from './gradientBoostingStrategy';
import { generateXGBoostGame } from './xgbStrategy';
import { generateQLearningGame } from './qLearningStrategy';
import { generatePatternGame } from './patternStrategy';

// ---------------------------------------------------------------------------
// REAL-DATA BACKTEST (homologação honesta)
//
// Baixa o histórico real da Lotofácil e mede quantos acertos cada estratégia
// teria feito prevendo sorteios passados. Serve para calibrar expectativa:
// a esperança matemática de acertos ao marcar 15 dezenas é 15*15/25 = 9.0.
// Qualquer estratégia que fique perto de 9.0 NÃO tem vantagem real — como
// esperado, pois a Lotofácil é um sorteio uniforme e independente.
//
// Fora do CI (rede + não-determinístico). Rode com: npm run test:backtest
// ---------------------------------------------------------------------------

const hits = (pick: number[], draw: number[]) => pick.filter((n) => draw.includes(n)).length;

describe('real-data backtest', () => {
  it(
    'reports average hits per strategy (expected ~9.0 = no edge)',
    async () => {
      const HISTORY = (await loadHistory()).slice(0, 200);
      if (HISTORY.length < 130) {
        console.warn(`Backtest pulado: só ${HISTORY.length} concursos.`);
        return;
      }

      const SIMS = 30; // predict the 30 most recent draws
      const strategies: Record<string, (h: LotofacilResult[]) => number[]> = {
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
        consensus: (h) => generateConsensusGame(h),
        random: () => generateRandomGame(),
      };

      const totals: Record<string, number> = {};
      const best: Record<string, number> = {};
      for (const k of Object.keys(strategies)) {
        totals[k] = 0;
        best[k] = 0;
      }

      let completedSims = 0;
      for (let i = 0; i < SIMS; i++) {
        const target = HISTORY[i];
        const train = HISTORY.slice(i + 1, i + 101);
        if (train.length < 60) break;
        for (const [name, fn] of Object.entries(strategies)) {
          const h = hits(fn(train), target.listaDezenas);
          totals[name] += h;
          if (h > best[name]) best[name] = h;
        }
        completedSims++;
      }

      const rows = Object.keys(strategies)
        .map((k) => ({ estrategia: k, mediaAcertos: completedSims > 0 ? +(totals[k] / completedSims).toFixed(3) : 0, melhor: best[k] }))
        .sort((a, b) => b.mediaAcertos - a.mediaAcertos);

      console.log(`\n=== Backtest real: ${SIMS} sorteios (${HISTORY.length} jogos baixados) ===`);
      console.log('Esperança teórica marcando 15 dezenas: 9.000 acertos/jogo\n');
      console.table(rows);

      // Sanity: every strategy must sit in a plausible band around the mean.
      // (No strategy should be able to systematically beat random on a fair draw.)
      for (const r of rows) {
        expect(r.mediaAcertos).toBeGreaterThan(6.5);
        expect(r.mediaAcertos).toBeLessThan(11.5);
      }
    },
    600_000,
  );
});