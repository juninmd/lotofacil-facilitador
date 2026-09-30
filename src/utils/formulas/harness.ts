import { topK, type Ctx } from './context';
import { FORMULAS, type Formula } from './catalog';
import { mulberry32 } from '../mc/rng';

// Sob H0 (sorteio uniforme) acertos ~ Hipergeométrica(25,15,15): média 9, variância 1,5.
export const NULL_MEAN = 9;
export const NULL_SD = Math.sqrt(15 * 0.6 * 0.4 * (10 / 24));

export interface FormulaResult {
  id: string; family: string; label: string; n: number;
  mean: number; z: number; p: number;
  zFirst: number; zSecond: number; // metades do período (confirmação)
  hitsDist: number[]; // contagem por nº de acertos 0..15
}

const erfc = (x: number): number => { // Abramowitz-Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const r = y * Math.exp(-x * x);
  return x >= 0 ? r : 2 - r;
};
export const pTwoSided = (z: number): number => erfc(Math.abs(z) / Math.SQRT2);

const zOf = (sum: number, n: number): number => (n ? (sum / n - NULL_MEAN) / (NULL_SD / Math.sqrt(n)) : 0);

/** Walk-forward: em cada concurso t >= start, escolhe 15 dezenas SÓ com o passado. */
export const runFormula = (f: Formula, c: Ctx, start: number, seed = 1): FormulaResult => {
  seed += [...f.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 977; // controles aleatórios independentes
  const rnd = mulberry32(seed);
  const dist = new Array(16).fill(0);
  const half = start + Math.floor((c.N - start) / 2);
  let s1 = 0, n1 = 0, s2 = 0, n2 = 0;
  for (let t = start; t < c.N; t++) {
    const pick = topK(f.score(c, t, rnd));
    let h = 0;
    for (const n of pick) h += c.member[t * 26 + n];
    dist[h]++;
    if (t < half) { s1 += h; n1++; } else { s2 += h; n2++; }
  }
  const n = n1 + n2;
  const z = zOf(s1 + s2, n);
  return { id: f.id, family: f.family, label: f.label, n, mean: NULL_MEAN + z * (NULL_SD / Math.sqrt(n)), z, p: pTwoSided(z), zFirst: zOf(s1, n1), zSecond: zOf(s2, n2), hitsDist: dist };
};

export const runAll = (c: Ctx, start = 1000, formulas: Formula[] = FORMULAS): FormulaResult[] =>
  formulas.map((f) => runFormula(f, c, start));

/** Ajuste de Holm-Bonferroni: p ajustado por fórmula (controla erro tipo I global). */
export const holm = (results: FormulaResult[]): Map<string, number> => {
  const sorted = [...results].sort((a, b) => a.p - b.p);
  const adj = new Map<string, number>();
  let running = 0;
  sorted.forEach((r, i) => { running = Math.max(running, Math.min(1, r.p * (sorted.length - i))); adj.set(r.id, running); });
  return adj;
};
