import type { LotofacilResult } from './game';
import { generateSmartGame, generateMax15Game, generateKNNGame, generateMarkovGame, generateConsensusGame } from './utils/statistics';
import { generateGeneticGame } from './utils/genetic';
import { generateTensorFlowGame } from './utils/tensorflowStrategy';
import { generateRegressionGame } from './utils/regressionStrategy';
import { generateNeuralNetGame } from './utils/neuralNetStrategy';
import { generateRandomForestGame } from './utils/randomForestStrategy';
import { generatePatternGame } from './utils/patternStrategy';
import { generateBayesianGame } from './utils/bayesianStrategy';
import { generateGradientBoostingGame } from './utils/gradientBoostingStrategy';
import { generateXGBoostGame } from './utils/xgbStrategy';
import { generateQLearningGame } from './utils/qLearningStrategy';
import { generateBiLstmGame } from './utils/biLstmStrategy';
import { generateOptimizedGame } from './utils/optimizedGenerator';
import { estimateBias, topByBias } from './utils/bias/biasModel';

// Registro único dos geradores (DRY): a UI itera sobre esta lista em vez de
// repetir um bloco de JSX por algoritmo.
export type AlgorithmId =
  | 'vpe' | 'smart' | 'optimized' | 'consensus' | 'max15' | 'knn' | 'genetic' | 'markov' | 'tensorflow'
  | 'regression' | 'neuralNet' | 'randomForest' | 'pattern' | 'bayesian' | 'gradientBoosting'
  | 'xgboost' | 'qlearning' | 'bilstm';

export interface Algorithm {
  id: AlgorithmId;
  label: string;
  hint: string;
  group: 'Estatístico' | 'Machine Learning' | 'Probabilístico';
  run: (history: LotofacilResult[], quantity: number) => number[] | Promise<number[]>;
}

// VPE usa o histórico COMPLETO (viés é sutil: precisa de milhares de concursos), carregado sob demanda.
let vpeModel: Promise<ReturnType<typeof estimateBias>> | null = null;
const loadVpe = () => (vpeModel ??= import('./data/lotofacil-history.json').then((m) =>
  estimateBias([...(m.default as unknown as LotofacilResult[])].sort((a, b) => a.numero - b.numero).map((g) => g.listaDezenas))));

export const ALGORITHMS: Algorithm[] = [
  { id: 'vpe', label: 'VPE (viés persistente)', hint: 'Bayes empírico, único com evidência', group: 'Estatístico', run: async (_h, q) => topByBias(await loadVpe(), q) },
  { id: 'smart', label: 'Smart', hint: 'Gaussiana e pesos', group: 'Estatístico', run: (h, q) => generateSmartGame(h, undefined, q) },
  { id: 'optimized', label: 'Padrões reais', hint: 'Filtra pelos limites empíricos', group: 'Estatístico', run: (h, q) => generateOptimizedGame(h, q) },
  { id: 'consensus', label: 'Consenso', hint: 'União ponderada dos melhores', group: 'Estatístico', run: (h, q) => generateConsensusGame(h, q) },
  { id: 'max15', label: 'Max 15', hint: 'Repetidos e ausentes', group: 'Estatístico', run: (h, q) => generateMax15Game(h, q) },
  { id: 'knn', label: 'KNN', hint: 'Concursos similares', group: 'Estatístico', run: (h, q) => generateKNNGame(h, q) },
  { id: 'pattern', label: 'Pares', hint: 'Associação e grafos', group: 'Estatístico', run: (h, q) => generatePatternGame(h, q) },
  { id: 'markov', label: 'Markov', hint: 'Cadeia de transição', group: 'Probabilístico', run: (h, q) => generateMarkovGame(h, undefined, q) },
  { id: 'bayesian', label: 'Bayesiana', hint: 'Naive Bayes', group: 'Probabilístico', run: (h, q) => generateBayesianGame(h, q) },
  { id: 'genetic', label: 'Genético', hint: 'Evolução de candidatos', group: 'Probabilístico', run: (h, q) => generateGeneticGame(h, q) },
  { id: 'qlearning', label: 'Q-Learning', hint: 'Aprendizado por reforço', group: 'Probabilístico', run: (h, q) => generateQLearningGame(h, q) },
  { id: 'regression', label: 'Regressão', hint: 'Logística (SGD)', group: 'Machine Learning', run: (h, q) => generateRegressionGame(h, q) },
  { id: 'randomForest', label: 'Random Forest', hint: 'Ensemble de árvores', group: 'Machine Learning', run: (h, q) => generateRandomForestGame(h, q) },
  { id: 'gradientBoosting', label: 'Gradient Boosting', hint: 'GBDT', group: 'Machine Learning', run: (h, q) => generateGradientBoostingGame(h, q) },
  { id: 'xgboost', label: 'XGBoost', hint: 'Boosting otimizado', group: 'Machine Learning', run: (h, q) => generateXGBoostGame(h, q) },
  { id: 'neuralNet', label: 'MLP', hint: 'Rede neural densa', group: 'Machine Learning', run: (h, q) => generateNeuralNetGame(h, q) },
  { id: 'tensorflow', label: 'LSTM', hint: 'TensorFlow.js', group: 'Machine Learning', run: (h, q) => generateTensorFlowGame(h, q) },
  { id: 'bilstm', label: 'Bi-LSTM', hint: 'Recorrente bidirecional', group: 'Machine Learning', run: (h, q) => generateBiLstmGame(h, q) },
];

export const GROUPS: Algorithm['group'][] = ['Estatístico', 'Probabilístico', 'Machine Learning'];
export const findAlgorithm = (id: AlgorithmId): Algorithm => ALGORITHMS.find((a) => a.id === id) ?? ALGORITHMS[0];
