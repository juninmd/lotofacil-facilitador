import type { LotofacilResult } from '../../game';

// Contexto walk-forward: pré-calcula, para cada instante t, estatísticas que só
// usam sorteios ANTERIORES a t (sem vazamento do futuro). Formulas consultam
// em O(1)/O(25), permitindo testar dezenas delas em milhares de concursos.

export const W = 26; // índices 1..25 usados (0 ignorado)

export interface Ctx {
  N: number;
  draws: number[][]; // antigo → novo
  order: (number[] | undefined)[]; // ordem de sorteio (quando existe)
  dow: number[]; // dia da semana do concurso (0=dom)
  member: Uint8Array; // member[t*W+n] = n saiu no concurso t
  cum: Int32Array; // cum[t*W+n] = ocorrências de n nos concursos < t
  gap: Int32Array; // gap[t*W+n] = concursos desde a última vez (antes de t)
  ewma: Map<number, Float64Array>; // λ → valor de n antes de t
  bothCum: Int32Array; // (n em t-1 e em t) acumulado até t
  prevCum: Int32Array; // (n em t-1) acumulado até t
}

export const LAMBDAS = [0.9, 0.95, 0.98, 0.99, 0.995];

export const buildContext = (history: LotofacilResult[]): Ctx => {
  const sorted = [...history].sort((a, b) => a.numero - b.numero);
  const N = sorted.length;
  const draws = sorted.map((g) => g.listaDezenas);
  const member = new Uint8Array(N * W);
  draws.forEach((d, t) => d.forEach((n) => { member[t * W + n] = 1; }));
  const cum = new Int32Array((N + 1) * W);
  const gap = new Int32Array((N + 1) * W);
  const bothCum = new Int32Array((N + 1) * W);
  const prevCum = new Int32Array((N + 1) * W);
  const ewma = new Map<number, Float64Array>(LAMBDAS.map((l) => [l, new Float64Array((N + 1) * W).fill(0.6)]));
  const last = new Int32Array(W).fill(-1);
  for (let t = 0; t <= N; t++) {
    for (let n = 1; n <= 25; n++) {
      const i = t * W + n;
      gap[i] = last[n] < 0 ? t + 1 : t - last[n];
      if (t === 0) continue;
      const j = (t - 1) * W + n;
      cum[i] = cum[j] + member[j];
      const pin = t >= 2 ? member[(t - 2) * W + n] : 0;
      prevCum[i] = prevCum[j] + pin;
      bothCum[i] = bothCum[j] + (pin && member[j] ? 1 : 0);
      for (const [l, arr] of ewma) arr[i] = l * arr[j] + (1 - l) * member[j];
    }
    if (t < N) for (const n of draws[t]) last[n] = t;
  }
  const dow = sorted.map((g) => {
    const [d, m, y] = (g.dataApuracao || '01/01/2000').split('/').map(Number);
    return new Date(y, m - 1, d).getDay();
  });
  return { N, draws, dow, order: sorted.map((g) => g.ordemSorteio), member, cum, gap, ewma, bothCum, prevCum };
};

/** Frequência de n nos `win` concursos anteriores a t (win<=0: todo o passado). */
export const freqWindow = (c: Ctx, t: number, n: number, win: number): number => {
  const lo = win > 0 ? Math.max(0, t - win) : 0;
  return c.cum[t * W + n] - c.cum[lo * W + n];
};

/** As k dezenas de maior escore (desempate pelo menor número: determinístico). */
export const topK = (score: ArrayLike<number>, k = 15): number[] => {
  const idx = Array.from({ length: 25 }, (_, i) => i + 1);
  idx.sort((a, b) => score[b] - score[a] || a - b);
  return idx.slice(0, k).sort((a, b) => a - b);
};

/** Vetor de ranks (25 = melhor) preservando a ordem por escore — base de ensembles Borda. */
export const rankVector = (score: ArrayLike<number>): Float64Array => {
  const idx = Array.from({ length: 25 }, (_, i) => i + 1).sort((a, b) => score[b] - score[a] || a - b);
  const r = new Float64Array(26);
  idx.forEach((n, i) => { r[n] = 25 - i; });
  return r;
};
