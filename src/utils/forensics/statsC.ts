import { bits, type Dataset } from './dataset';
import type { Stats } from './statsA';

// Estatísticas de ORDEM de saída das bolas, deriva temporal, calendário e espectro.

/** Bolas saem em ordem uniforme? Posição×dezena, sucessor imediato e 1ª bola vs 1ª anterior. */
export const orderStats = (ds: Dataset): Stats => {
  const pos = new Int32Array(15 * 25), succ = new Int32Array(625), firstPrev = new Int32Array(625);
  ds.orders.forEach((o, t) => {
    o.forEach((n, p) => { pos[p * 25 + n - 1]++; if (p < 14) succ[(n - 1) * 25 + o[p + 1] - 1]++; });
    if (t > 0) firstPrev[(ds.orders[t - 1][0] - 1) * 25 + o[0] - 1]++;
  });
  const chi = (c: Int32Array, e: number, skipDiag = false) => c.reduce((a, v, i) => (skipDiag && i % 26 === 0 ? a : a + (v - e) ** 2 / e), 0);
  const N = ds.N;
  return {
    'ordem:posição×dezena chi2': chi(pos, N / 25),
    'ordem:sucessor chi2': chi(succ, (N * 14) / 600, true),
    'ordem:1ª bola vs 1ª anterior chi2': chi(firstPrev, (N - 1) / 625),
  };
};

/** Deriva: inclinação linear e CUSUM da frequência de cada dezena ao longo do tempo. */
export const driftStats = (ds: Dataset): Stats => {
  let maxSlope = 0, maxCusum = 0;
  const tm = (ds.N - 1) / 2; let stt = 0;
  for (let t = 0; t < ds.N; t++) stt += (t - tm) ** 2;
  for (let n = 0; n < 25; n++) {
    let s = 0, cum = 0;
    for (let t = 0; t < ds.N; t++) { const x = ((ds.masks[t] >>> n) & 1) - 0.6; s += x * (t - tm); cum += x; maxCusum = Math.max(maxCusum, Math.abs(cum) / Math.sqrt(0.24 * ds.N)); }
    maxSlope = Math.max(maxSlope, Math.abs(s / Math.sqrt(0.24 * stt)));
  }
  return { 'deriva:tendência max|z|': maxSlope, 'deriva:CUSUM sup': maxCusum };
};

const homogeneity = (ds: Dataset, label: number[], minGroup = 30): number => {
  const groups = new Map<number, number[]>(); const size = new Map<number, number>();
  const total = new Array(25).fill(0);
  label.forEach((l, t) => {
    const c = groups.get(l) ?? new Array(25).fill(0); groups.set(l, c); size.set(l, (size.get(l) ?? 0) + 1);
    for (const n of bits(ds.masks[t])) { c[n - 1]++; total[n - 1]++; }
  });
  let chi = 0;
  for (const [l, c] of groups) {
    const g = size.get(l)!; if (g < minGroup) continue;
    for (let n = 0; n < 25; n++) { const p = total[n] / ds.N; chi += (c[n] - g * p) ** 2 / (g * p * (1 - p)); }
  }
  return chi;
};

/** As dezenas dependem do dia da semana, mês, dia do mês, ano ou do resto do nº do concurso? */
export const calendarStats = (ds: Dataset): Stats => {
  const out: Stats = {
    'calendário:dia da semana': homogeneity(ds, ds.dow), 'calendário:mês': homogeneity(ds, ds.month),
    'calendário:dia do mês': homogeneity(ds, ds.dom), 'calendário:ano': homogeneity(ds, ds.year),
  };
  for (const m of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) out[`calendário:nº concurso mod ${m}`] = homogeneity(ds, ds.numero.map((n) => n % m));
  return out;
};

const fft = (re: Float64Array, im: Float64Array): void => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      const a = i + k, b = i + k + len / 2;
      const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
      re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
    }
  }
};

/** Periodicidade oculta: maior pico do periodograma (g de Fisher) entre as 25 séries. */
export const spectralStats = (ds: Dataset): Stats => {
  const size = 4096; let best = 0;
  for (let n = 0; n < 25; n++) {
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let t = 0; t < ds.N; t++) re[t] = ((ds.masks[t] >>> n) & 1) - 0.6;
    fft(re, im);
    let tot = 0, mx = 0;
    for (let k = 1; k < size / 2; k++) { const p = re[k] * re[k] + im[k] * im[k]; tot += p; if (p > mx) mx = p; }
    best = Math.max(best, mx / tot);
  }
  return { 'espectro:g de Fisher máx': best };
};
