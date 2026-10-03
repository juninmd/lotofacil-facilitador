import { mulberry32, type Rng } from '../mc/rng';

// Perícia GENÉRICA para qualquer loteria "k números de n" (sem bits: n pode ser 70).
// Mesmos conceitos da Lotofácil: viés persistente por número, dependência serial,
// pares condicionais, tudo com p-valor Monte Carlo contra o mundo uniforme.
export interface Format { id: string; n: number; k: number }
export type Draws = number[][]; // cada sorteio: k números em 1..n, do mais antigo ao mais novo

export const randomDraws = (f: Format, count: number, rng: Rng): Draws =>
  Array.from({ length: count }, () => {
    const pool = Array.from({ length: f.n }, (_, i) => i + 1);
    for (let i = 0; i < f.k; i++) { const j = i + Math.floor(rng() * (f.n - i)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, f.k).sort((a, b) => a - b);
  });

const counts = (d: Draws, n: number): Float64Array => {
  const c = new Float64Array(n);
  for (const s of d) for (const x of s) c[x - 1]++;
  return c;
};

const corr = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  const n = a.length; let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let s = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return va > 0 && vb > 0 ? s / Math.sqrt(va * vb) : 0;
};

/** Estimador VPE generalizado: p̂ = p0 + s·(f − p0), p0 = k/n, s por Bayes empírico. */
export const vpeProbs = (d: Draws, f: Format): { probs: number[]; sigma: number; shrink: number } => {
  const p0 = f.k / f.n, noise = (p0 * (1 - p0)) / Math.max(1, d.length);
  const fr = Array.from(counts(d, f.n), (c) => c / Math.max(1, d.length));
  const varObs = fr.reduce((a, v) => a + (v - p0) ** 2, 0) / f.n;
  const sigma2 = Math.max(varObs - noise, 1e-10);
  const shrink = sigma2 / (sigma2 + noise);
  return { probs: fr.map((v) => p0 + shrink * (v - p0)), sigma: Math.sqrt(sigma2), shrink };
};

export interface Stats { [k: string]: number }

export const statistics = (d: Draws, f: Format): Stats => {
  const N = d.length, p0 = f.k / f.n, v0 = p0 * (1 - p0);
  const c = counts(d, f.n);
  const z = Array.from(c, (x) => (x - p0 * N) / Math.sqrt(v0 * N));
  const half = Math.floor(N / 2);
  const out: Stats = {
    'freq:chi2': z.reduce((a, v) => a + v * v, 0),
    'persistência:corr metades': corr(counts(d.slice(0, half), f.n), counts(d.slice(half), f.n)),
  };
  // Dependência serial número a número: x_t(n) × x_{t-1}(n), lags 1..3
  let maxLag = 0;
  for (let lag = 1; lag <= 3; lag++) for (let n = 1; n <= f.n; n++) {
    let s = 0;
    for (let t = lag; t < N; t++) s += ((d[t].includes(n) ? 1 : 0) - p0) * ((d[t - lag].includes(n) ? 1 : 0) - p0);
    maxLag = Math.max(maxLag, Math.abs(s / (v0 * Math.sqrt(N - lag))));
  }
  out['lag(n→n):max|z|'] = maxLag;
  // Soma do sorteio: autocorrelação lag 1 e variância (compara com o esperado k(n-k)(n+1)/12)
  const sums = d.map((s) => s.reduce((a, b) => a + b, 0)); const ms = sums.reduce((a, b) => a + b, 0) / N;
  const vs = sums.reduce((a, b) => a + (b - ms) ** 2, 0) / N;
  out['soma:|autocorr lag1|'] = Math.abs(corr(sums.slice(1), sums.slice(0, -1))) * Math.sqrt(N);
  out['soma:|razão de variância-1|'] = Math.abs(vs / ((f.k * (f.n - f.k) * (f.n + 1)) / 12) - 1) * Math.sqrt(N / 2);
  return out;
};

/** Ganho preditivo walk-forward do VPE (log-verossimilhança vs p0) a partir de `start`. */
export const vpeWalkForward = (d: Draws, f: Format, start: number): { z: number; hits: number; expected: number; n: number } => {
  const p0 = f.k / f.n; let s1 = 0, s2 = 0, hits = 0, n = 0;
  for (let t = start; t < d.length; t++) {
    const { probs } = vpeProbs(d.slice(0, t), f);
    const inDraw = new Set(d[t]); let ll = 0;
    probs.forEach((p, i) => { ll += inDraw.has(i + 1) ? Math.log(p / p0) : Math.log((1 - p) / (1 - p0)); });
    s1 += ll; s2 += ll * ll; n++;
    hits += probs.map((p, i) => [p, i + 1] as const).sort((a, b) => b[0] - a[0]).slice(0, f.k).filter(([, x]) => inDraw.has(x)).length;
  }
  const m = s1 / n;
  return { z: m / (Math.sqrt(Math.max(1e-18, s2 / n - m * m)) / Math.sqrt(n)), hits: hits / n, expected: (f.k * f.k) / f.n, n };
};

export interface Verdict { id: string; obs: number; p: number }

/** p-valores Monte Carlo de todas as estatísticas contra `sims` mundos uniformes do mesmo formato e tamanho. */
export const analyze = (d: Draws, f: Format, sims = 200, seed = 1): Verdict[] => {
  const obs = statistics(d, f), rng = mulberry32(seed);
  const nulls: Record<string, number[]> = Object.fromEntries(Object.keys(obs).map((k) => [k, []]));
  for (let s = 0; s < sims; s++) for (const [k, v] of Object.entries(statistics(randomDraws(f, d.length, rng), f))) nulls[k].push(v);
  return Object.keys(obs).map((id) => ({ id, obs: obs[id], p: (1 + nulls[id].filter((v) => v >= obs[id]).length) / (sims + 1) })).sort((a, b) => a.p - b.p);
};
