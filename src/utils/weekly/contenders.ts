import type { LotofacilResult } from '../../game';
import { ALGORITHMS } from '../../algorithms';
import { estimateBias, topByBias } from '../bias/biasModel';
import { sampleK } from '../mc/rng';
import type { Contender } from './benchmark';

// Quem disputa o benchmark semanal. Regras (ver docs/LEARNINGS.md):
//  - todo gerador do app entra, com a MESMA janela que o app usa (100 concursos);
//  - o VPE do app lê o JSON completo (inclui o futuro no backtest), então aqui
//    ele é recalculado só com o treino, para não haver lookahead;
//  - candidatos novos entram em CANDIDATES e só viram padrão se o z for alto
//    nas duas metades (zOld e zNew) do backtest longo.

const APP_WINDOW = 100;
const SLOW: Record<string, number> = { neuralNet: 25, tensorflow: 25, bilstm: 6 };
const oldestFirst = (train: LotofacilResult[]) => [...train].reverse().map((g) => g.listaDezenas);

/** VPE treinado só com o passado do alvo. `lambda<1` = decaimento por recência. */
export const vpePick = (train: LotofacilResult[], lambda = 1): number[] =>
  topByBias(estimateBias(oldestFirst(train), lambda, false), 15);

export const randomPick = (): number[] => sampleK(Array.from({ length: 25 }, (_, i) => i + 1), 15, Math.random);

/** Geradores do app (rodada curta: últimos `targets` concursos). */
export const appContenders = (targets: number): Contender[] => [
  { id: 'random (base)', window: APP_WINDOW, targets, run: randomPick },
  { id: 'vpe (histórico todo)', window: Infinity, targets, run: (t) => vpePick(t) },
  ...ALGORITHMS.filter((a) => a.id !== 'vpe').map((a) => ({
    id: a.id,
    window: APP_WINDOW,
    targets: Math.min(targets, SLOW[a.id] ?? targets),
    run: (t: LotofacilResult[]) => a.run(t, 15),
  })),
];

/** Estimadores baratos para o backtest longo (`targets` = todos os alvos desde o nº 2001). */
export const candidateContenders = (targets: number): Contender[] => [
  { id: 'random (base)', window: APP_WINDOW, targets, run: randomPick },
  { id: 'vpe', window: Infinity, targets, run: (t) => vpePick(t) },
  { id: 'vpe decay 0.9995', window: Infinity, targets, run: (t) => vpePick(t, 0.9995) },
  { id: 'vpe janela 500', window: 500, targets, run: (t) => vpePick(t) },
];
