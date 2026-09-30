import type { Dataset } from './dataset';

// Aprendizado supervisionado "com tudo": para cada dezena n, regressão logística
// (ridge, SGD) com os 25 sorteios-indicadores dos lags 1 e 2, a própria dezena
// nos lags 3..10, frequências recentes, atraso e dia da semana. Validação
// TEMPORAL (expanding window, re-treino a cada `step`). Compara log-loss e
// acertos do top-15 com o baseline "frequência histórica".
export interface MlResult {
  n: number; logLossModel: number; logLossBase: number; meanHits: number; zHits: number; dLogLossPerDraw: number;
}

const F = 25 * 2 + 8 + 3 + 7 + 1;

const features = (ds: Dataset, t: number, n: number, freq50: number, gap: number): Float64Array => {
  const x = new Float64Array(F); let i = 0;
  for (let lag = 1; lag <= 2; lag++) for (let m = 0; m < 25; m++) x[i++] = t >= lag ? ((ds.masks[t - lag] >>> m) & 1) - 0.6 : 0;
  for (let lag = 3; lag <= 10; lag++) x[i++] = t >= lag ? ((ds.masks[t - lag] >>> n) & 1) - 0.6 : 0;
  x[i++] = freq50 / 50 - 0.6; x[i++] = Math.min(gap, 10) / 10 - 0.3; x[i++] = 0;
  x[i + ds.dow[t]] = 1; i += 7; x[i] = 1;
  return x;
};

export const walkForwardLogit = (ds: Dataset, start = 1000, step = 250, epochs = 4, l2 = 0.02, lr = 0.02): MlResult => {
  const w = Array.from({ length: 25 }, () => new Float64Array(F));
  const feat: Float64Array[][] = Array.from({ length: 25 }, () => []);
  const y: Uint8Array[] = Array.from({ length: 25 }, () => new Uint8Array(ds.N));
  const gap = new Int32Array(25).fill(1);
  const cum = new Int32Array(25);
  const c50: Int32Array[] = [];
  let llM = 0, llB = 0, sumHits = 0, nEval = 0;
  for (let t = 0; t < ds.N; t++) {
    c50.push(cum.slice());
    for (let n = 0; n < 25; n++) {
      const f50 = cum[n] - (t >= 50 ? c50[t - 50][n] : 0);
      feat[n].push(features(ds, t, n, f50, gap[n]));
      y[n][t] = (ds.masks[t] >>> n) & 1;
    }
    if (t >= start && (t - start) % step === 0) {
      for (let n = 0; n < 25; n++) for (let e = 0; e < epochs; e++) for (let s = 0; s < t; s++) {
        const x = feat[n][s]; let z = 0;
        for (let k = 0; k < F; k++) z += w[n][k] * x[k];
        const err = y[n][s] - 1 / (1 + Math.exp(-z));
        for (let k = 0; k < F; k++) w[n][k] += lr * (err * x[k] - l2 * w[n][k]);
      }
    }
    if (t >= start) {
      const p = new Array(25); let hits = 0; const scores: [number, number][] = [];
      for (let n = 0; n < 25; n++) {
        let z = 0; for (let k = 0; k < F; k++) z += w[n][k] * feat[n][t][k];
        p[n] = 1 / (1 + Math.exp(-z)); const base = Math.min(0.99, Math.max(0.01, cum[n] / t));
        llM -= y[n][t] ? Math.log(p[n]) : Math.log(1 - p[n]);
        llB -= y[n][t] ? Math.log(base) : Math.log(1 - base);
        scores.push([p[n], n]);
      }
      scores.sort((a, b) => b[0] - a[0]);
      for (const [, n] of scores.slice(0, 15)) hits += y[n][t];
      sumHits += hits; nEval++;
    }
    for (let n = 0; n < 25; n++) { const on = y[n][t]; cum[n] += on; gap[n] = on ? 1 : gap[n] + 1; }
  }
  const mean = sumHits / nEval;
  return { n: nEval, logLossModel: llM / nEval, logLossBase: llB / nEval, meanHits: mean, zHits: (mean - 9) / (Math.sqrt(15 * 0.6 * 0.4 * (10 / 24)) / Math.sqrt(nEval)), dLogLossPerDraw: (llB - llM) / nEval };
};
