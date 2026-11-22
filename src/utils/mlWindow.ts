import type { LotofacilResult } from '../game';

// Os modelos de árvore (RF, GBDT, XGBoost) extraem features olhando 50 concursos
// para trás de cada exemplo de treino. Antes eles exigiam ≥120 concursos e, como
// o app entrega só 100, SEMPRE caíam no fallback "1..15". Aqui a janela de
// treino se adapta ao histórico disponível (achado do benchmark semanal 1).

export const FEATURE_LOOKBACK = 50;
export const MIN_TRAINING_ROWS = 10;

/** Quantos concursos-alvo dá para usar no treino sem features vazias. */
export const trainingWindow = (historyLength: number, max: number): number =>
  Math.max(0, Math.min(max, historyLength - FEATURE_LOOKBACK - 1));

/** Fallback honesto quando não há treino: dezenas mais frequentes do histórico dado. */
export const frequencyFallback = (history: LotofacilResult[], quantity: number): number[] => {
  const count = new Array(26).fill(0);
  for (const g of history) for (const n of g.listaDezenas) count[n]++;
  return Array.from({ length: 25 }, (_, i) => i + 1)
    .sort((a, b) => count[b] - count[a] || a - b)
    .slice(0, quantity)
    .sort((a, b) => a - b);
};
