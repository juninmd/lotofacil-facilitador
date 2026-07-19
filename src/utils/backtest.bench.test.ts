import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
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

const API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';

const parse = (d: { listaDezenas: (string | number)[] } & Record<string, unknown>): LotofacilResult => ({
  ...(d as unknown as LotofacilResult),
  listaDezenas: d.listaDezenas.map((x) => Number(x)),
});

const fetchGame = async (n?: number): Promise<LotofacilResult | null> => {
  try {
    const r = await fetch(n ? `${API}/${n}` : `${API}/`);
    if (!r.ok) return null;
    return parse(await r.json());
  } catch {
    return null;
  }
};

const fetchHistory = async (count: number): Promise<LotofacilResult[]> => {
  const latest = await fetchGame();
  if (!latest) return [];
  const games: LotofacilResult[] = [latest];
  for (let i = 1; i < count; i++) {
    const g = await fetchGame(latest.numero - i);
    if (g) games.push(g);
    if (i % 5 === 0) await new Promise((res) => setTimeout(res, 120)); // gentle throttle
  }
  return games.sort((a, b) => b.numero - a.numero);
};

const hits = (pick: number[], draw: number[]) => pick.filter((n) => draw.includes(n)).length;

describe('real-data backtest', () => {
  it(
    'reports average hits per strategy (expected ~9.0 = no edge)',
    async () => {
      const HISTORY = await fetchHistory(160);
      if (HISTORY.length < 130) {
        console.warn(`Backtest skipped: only fetched ${HISTORY.length} games.`);
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

      for (let i = 0; i < SIMS; i++) {
        const target = HISTORY[i];
        const train = HISTORY.slice(i + 1, i + 101);
        if (train.length < 60) break;
        for (const [name, fn] of Object.entries(strategies)) {
          const h = hits(fn(train), target.listaDezenas);
          totals[name] += h;
          if (h > best[name]) best[name] = h;
        }
      }

      const rows = Object.keys(strategies)
        .map((k) => ({ estrategia: k, mediaAcertos: +(totals[k] / SIMS).toFixed(3), melhor: best[k] }))
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
