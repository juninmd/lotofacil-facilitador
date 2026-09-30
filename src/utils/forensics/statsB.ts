import { makeDraws, mulberry32 } from '../mc/rng';
import { bits, type Dataset } from './dataset';
import type { Stats } from './statsA';

// Características escalares de cada sorteio; a distribuição esperada sai de um
// Monte Carlo grande (cache), e o qui-quadrado compara com o histórico.
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const FEATURES: Record<string, (b: number[]) => number> = {
  soma: (b) => b.reduce((a, v) => a + v, 0),
  consecutivos: (b) => b.filter((v) => b.includes(v + 1)).length,
  impares: (b) => b.filter((v) => v % 2).length,
  baixas: (b) => b.filter((v) => v <= 13).length,
  primos: (b) => b.filter((v) => PRIMES.has(v)).length,
  amplitude: (b) => b[14] - b[0],
  maior_linha: (b) => Math.max(...[0, 1, 2, 3, 4].map((r) => b.filter((v) => Math.floor((v - 1) / 5) === r).length)),
  maior_coluna: (b) => Math.max(...[0, 1, 2, 3, 4].map((c) => b.filter((v) => (v - 1) % 5 === c).length)),
  maior_salto: (b) => Math.max(...b.slice(1).map((v, i) => v - b[i])),
};

const expected = new Map<string, Map<number, number>>();
const expectedDist = (name: string): Map<number, number> => {
  if (!expected.has(name)) {
    const d = new Map<number, number>(); const draws = makeDraws(300_000, mulberry32(4711));
    for (const m of draws) { const v = FEATURES[name](bits(m)); d.set(v, (d.get(v) ?? 0) + 1 / draws.length); }
    expected.set(name, d);
  }
  return expected.get(name)!;
};

const chiHist = (vals: number[], dist: Map<number, number>): number => {
  const obs = new Map<number, number>(); vals.forEach((v) => obs.set(v, (obs.get(v) ?? 0) + 1));
  let chi = 0, restO = 0, restE = 0;
  for (const [v, p] of dist) {
    const e = p * vals.length;
    if (e >= 5) chi += ((obs.get(v) ?? 0) - e) ** 2 / e; else { restO += obs.get(v) ?? 0; restE += e; }
  }
  for (const v of obs.keys()) if (!dist.has(v)) restO += obs.get(v)!;
  return restE > 0 ? chi + (restO - restE) ** 2 / restE : chi;
};

export const scalarStats = (ds: Dataset): Stats => {
  const sets = Array.from(ds.masks, (m) => bits(m));
  const out: Stats = {};
  for (const name of Object.keys(FEATURES)) {
    const vals = sets.map(FEATURES[name]);
    out[`dist:${name}`] = chiHist(vals, expectedDist(name));
  }
  const rep = sets.slice(1).map((b, i) => b.filter((v) => sets[i].includes(v)).length);
  const repDist = expectedRepeat();
  out['dist:repetidos_do_anterior'] = chiHist(rep, repDist);
  // Correlação serial (lags 1..5) da soma e dos consecutivos
  for (const name of ['soma', 'consecutivos', 'impares']) {
    const v = sets.map(FEATURES[name]); const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const varr = v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length;
    let mx = 0;
    for (let k = 1; k <= 5; k++) { let s = 0; for (let t = k; t < v.length; t++) s += (v[t] - mean) * (v[t - k] - mean); mx = Math.max(mx, Math.abs(s / (varr * Math.sqrt(v.length - k)))); }
    out[`serial:${name}`] = mx;
  }
  return out;
};

let repCache: Map<number, number> | null = null;
const expectedRepeat = (): Map<number, number> => {
  if (!repCache) {
    const d = new Map<number, number>(); const draws = makeDraws(300_000, mulberry32(99));
    for (let i = 1; i < draws.length; i++) { const v = bits(draws[i]).filter((n) => (draws[i - 1] >>> (n - 1)) & 1).length; d.set(v, (d.get(v) ?? 0) + 1 / (draws.length - 1)); }
    repCache = d;
  }
  return repCache;
};
