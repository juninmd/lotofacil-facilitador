import type { LotofacilResult } from '../../game';
import { fromMask, makeDraws, toMask, type Rng } from '../mc/rng';

// Conjunto de dados para a perícia: sorteios como máscaras de 25 bits + rótulos
// de calendário + ordem de saída das bolas. `nullDataset` gera um "mundo
// uniforme" com a MESMA estrutura (mesmas datas), base do p-valor Monte Carlo.
export interface Dataset {
  N: number;
  masks: Int32Array;
  orders: number[][];
  dow: number[]; month: number[]; dom: number[]; year: number[]; numero: number[];
}

export const buildDataset = (history: LotofacilResult[]): Dataset => {
  const g = [...history].sort((a, b) => a.numero - b.numero);
  const date = g.map((x) => { const [d, m, y] = x.dataApuracao.split('/').map(Number); return new Date(y, m - 1, d); });
  return {
    N: g.length,
    masks: Int32Array.from(g.map((x) => toMask(x.listaDezenas))),
    orders: g.map((x) => x.ordemSorteio ?? x.listaDezenas),
    dow: date.map((d) => d.getDay()), month: date.map((d) => d.getMonth()),
    dom: date.map((d) => d.getDate()), year: date.map((d) => d.getFullYear()),
    numero: g.map((x) => x.numero),
  };
};

const shuffle = <T,>(a: T[], rng: Rng): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Mundo nulo: sorteios uniformes independentes, ordem de saída uniforme, mesmos rótulos. */
export const nullDataset = (real: Dataset, rng: Rng): Dataset => {
  const masks = makeDraws(real.N, rng);
  return { ...real, masks, orders: Array.from(masks, (m) => shuffle(fromMask(m), rng)) };
};

/** p-valor Monte Carlo (unilateral, estatística grande = extremo), com correção +1. */
export const mcP = (obs: number, sims: number[]): number => (1 + sims.filter((s) => s >= obs).length) / (sims.length + 1);

export const bits = (mask: number): number[] => fromMask(mask);
