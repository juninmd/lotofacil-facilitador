import { buildDataset, mcP, nullDataset, type Dataset } from './dataset';
import { frequencyStats, lagStats, crossStats, nearDuplicateStats, pairStats, tripleStats, type Stats } from './statsA';
import { scalarStats } from './statsB';
import { calendarStats, driftStats, orderStats, spectralStats } from './statsC';
import { mulberry32 } from '../mc/rng';
import type { LotofacilResult } from '../../game';

// Bateria de perícia: cada estatística é calculada no histórico REAL e em
// `sims` mundos uniformes (Monte Carlo) para obter o p-valor sem suposições.
export interface TestResult { id: string; obs: number; p: number; sims: number; pBonf: number }

export const LIGHT: ((ds: Dataset) => Stats)[] = [
  frequencyStats, pairStats, lagStats, (d) => crossStats(d, 1), (d) => crossStats(d, 2),
  scalarStats, orderStats, driftStats, calendarStats, spectralStats,
];
export const HEAVY: ((ds: Dataset) => Stats)[] = [tripleStats, nearDuplicateStats];

export const family = (real: Dataset, fns: ((ds: Dataset) => Stats)[], sims: number, seed: number): { id: string; obs: number; p: number; sims: number }[] => {
  const obs: Stats = Object.assign({}, ...fns.map((f) => f(real)));
  const nulls: Record<string, number[]> = Object.fromEntries(Object.keys(obs).map((k) => [k, []]));
  const rng = mulberry32(seed);
  for (let s = 0; s < sims; s++) {
    const ds = nullDataset(real, rng);
    for (const f of fns) for (const [k, v] of Object.entries(f(ds))) nulls[k].push(v);
  }
  return Object.keys(obs).map((id) => ({ id, obs: obs[id], p: mcP(obs[id], nulls[id]), sims }));
};

export const runBattery = (history: LotofacilResult[], sims = 1000, heavySims = 200, seed = 20260930): TestResult[] => {
  const real = buildDataset(history);
  const all = [...family(real, LIGHT, sims, seed), ...family(real, HEAVY, heavySims, seed + 1)];
  return all.map((r) => ({ ...r, pBonf: Math.min(1, r.p * all.length) })).sort((a, b) => a.p - b.p);
};

export { crossStats, frequencyStats, lagStats };

export { buildDataset, nullDataset };
