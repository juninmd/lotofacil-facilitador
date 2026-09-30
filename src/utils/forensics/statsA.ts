import { popcount } from '../mc/rng';
import { bits, type Dataset } from './dataset';

// Estatísticas "de conjunto": frequências, pares, tríos, dependência entre
// concursos. Todas retornam valores onde MAIOR = mais suspeito.
export type Stats = Record<string, number>;

const chiMax = (z: number[]): [number, number] => [z.reduce((a, v) => a + v * v, 0), Math.max(...z.map(Math.abs))];

export const frequencyStats = (ds: Dataset): Stats => {
  const c = new Array(25).fill(0);
  for (const m of ds.masks) for (const n of bits(m)) c[n - 1]++;
  const [chi, max] = chiMax(c.map((v) => (v - 0.6 * ds.N) / Math.sqrt(0.24 * ds.N)));
  return { 'freq:chi2': chi, 'freq:max|z|': max };
};

const marginals = (ds: Dataset): number[] => {
  const c = new Array(25).fill(0);
  for (const m of ds.masks) for (const n of bits(m)) c[n - 1]++;
  return c.map((v) => v / ds.N);
};

// Interações CONDICIONAIS às frequências observadas de cada dezena (o viés de
// frequência isolado é testado à parte em freq:*): E_ij ∝ p_i·p_j, normalizado
// para somar C(15,2) pares por sorteio.
export const pairStats = (ds: Dataset): Stats => {
  const c = new Int32Array(625); const p = marginals(ds);
  for (const m of ds.masks) { const b = bits(m); for (let i = 0; i < 15; i++) for (let j = i + 1; j < 15; j++) c[b[i] * 25 - 25 + b[j] - 1]++; }
  let norm = 0;
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) norm += p[i] * p[j];
  const z: number[] = [];
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) {
    const e = (ds.N * 105 * p[i] * p[j]) / norm;
    z.push((c[i * 25 + j] - e) / Math.sqrt(e * (1 - e / ds.N)));
  }
  const [chi, max] = chiMax(z);
  return { 'pares|freq:chi2': chi, 'pares|freq:max|z|': max };
};

export const tripleStats = (ds: Dataset): Stats => {
  const c = new Int32Array(25 * 25 * 25); const p = marginals(ds);
  for (const m of ds.masks) {
    const b = bits(m);
    for (let i = 0; i < 15; i++) for (let j = i + 1; j < 15; j++) for (let k = j + 1; k < 15; k++) c[(b[i] - 1) * 625 + (b[j] - 1) * 25 + b[k] - 1]++;
  }
  let norm = 0;
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) for (let k = j + 1; k < 25; k++) norm += p[i] * p[j] * p[k];
  let max = 0;
  for (let i = 0; i < 25; i++) for (let j = i + 1; j < 25; j++) for (let k = j + 1; k < 25; k++) {
    const e = (ds.N * 455 * p[i] * p[j] * p[k]) / norm;
    max = Math.max(max, Math.abs((c[i * 625 + j * 25 + k] - e) / Math.sqrt(e * (1 - e / ds.N))));
  }
  return { 'trios|freq:max|z|': max };
};

/** Autocorrelação de cada dezena em lags 1..12 (a dezena n "lembra" de si?). */
export const lagStats = (ds: Dataset): Stats => {
  const x = Array.from({ length: 25 }, (_, n) => Uint8Array.from(ds.masks, (m) => (m >>> n) & 1));
  const z: number[] = [];
  for (let k = 1; k <= 12; k++) for (let n = 0; n < 25; n++) {
    let s = 0;
    for (let t = k; t < ds.N; t++) s += (x[n][t] - 0.6) * (x[n][t - k] - 0.6);
    z.push(s / (0.24 * Math.sqrt(ds.N - k)));
  }
  const [chi, max] = chiMax(z);
  return { 'lag(n→n):chi2': chi, 'lag(n→n):max|z|': max };
};

/** Dependência cruzada: dezena m em t−lag → dezena n em t (625 pares), dado o viés de frequência. */
export const crossStats = (ds: Dataset, lag: number): Stats => {
  const c = new Int32Array(625); const pa = new Array(25).fill(0); const pb = new Array(25).fill(0);
  for (let t = lag; t < ds.N; t++) {
    const A = bits(ds.masks[t - lag]), B = bits(ds.masks[t]);
    A.forEach((m) => { pa[m - 1]++; }); B.forEach((n) => { pb[n - 1]++; });
    for (const m of A) for (const n of B) c[(m - 1) * 25 + n - 1]++;
  }
  const N = ds.N - lag;
  const z = Array.from(c, (v, i) => { const q = (pa[Math.floor(i / 25)] / N) * (pb[i % 25] / N); return (v - N * q) / Math.sqrt(N * q * (1 - q)); });
  const [chi, max] = chiMax(z);
  return { [`cruzado lag${lag}|freq:chi2`]: chi, [`cruzado lag${lag}|freq:max|z|`]: max };
};

/** Pares de concursos quase idênticos (>=14 dezenas em comum): duplicatas "suspeitas". */
export const nearDuplicateStats = (ds: Dataset): Stats => {
  let near = 0;
  for (let i = 0; i < ds.N; i++) for (let j = i + 1; j < ds.N; j++) if (popcount(ds.masks[i] & ds.masks[j]) >= 14) near++;
  return { 'quase-duplicatas(>=14 em comum)': near };
};
