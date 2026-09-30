import type { LotofacilResult } from '../../game';

// Modelo de "multidão": o prêmio de 14/15 acertos é RATEADO entre ganhadores.
// Jogos que muita gente aposta dividem o prêmio por mais pessoas. Estimamos, a
// partir dos rateios reais (nº de ganhadores por concurso, normalizado pelo
// volume de apostas), quais FORMATOS de jogo são populares — via regressão de
// Poisson. Não altera a chance de acertar; só aumenta o prêmio esperado
// CONDICIONAL a acertar (menos gente dividindo). Fonte: rateios da Caixa.

export const featuresOf = (nums: number[]): number[] => {
  const s = new Set(nums);
  const runs = nums.filter((n) => s.has(n + 1)).length; // pares consecutivos
  const rowCount = [0, 1, 2, 3, 4].map((r) => nums.filter((n) => Math.floor((n - 1) / 5) === r).length);
  const sum = nums.reduce((a, b) => a + b, 0) / 15;
  const z = (sum - 13) / 1.3;
  return [runs - 8.5, (runs - 8.5) ** 2, Math.min(...rowCount) <= 1 ? 1 : 0, Math.max(...rowCount) >= 5 ? 1 : 0, z, z * z];
};

const solve = (A: number[][], b: number[]): number[] => {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i] / M[i][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
};

export interface CrowdModel {
  coef: number[]; // [interceptW15, interceptW14, ...features]
}

// Poisson GLM (log-link) com ridge, via Newton/IRLS. Cada concurso gera duas
// observações (ganhadores de 15 e de 14) com offset = log(volume de apostas),
// aproximado pelos ganhadores de 11 acertos (~18% das apostas).
export const fitCrowdModel = (history: LotofacilResult[], ridge = 2): CrowdModel => {
  const obs: { x: number[]; y: number; off: number }[] = [];
  for (const g of history) {
    const w = g.listaRateioPremio.map((r) => r.numeroDeGanhadores);
    if (w.length < 5 || w[4] < 1e4) continue;
    const f = featuresOf(g.listaDezenas);
    const off = Math.log(w[4]);
    obs.push({ x: [1, 0, ...f], y: w[0], off }, { x: [0, 1, ...f], y: w[1], off });
  }
  const p = 2 + 6;
  let beta = new Array(p).fill(0);
  beta[0] = Math.log(3e-6);
  beta[1] = Math.log(5e-4);
  for (let it = 0; it < 25; it++) {
    const H = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j && i >= 2 ? ridge : 0)));
    const g = beta.map((b, i) => (i >= 2 ? -ridge * b : 0));
    for (const o of obs) {
      const mu = Math.exp(o.off + o.x.reduce((a, v, i) => a + v * beta[i], 0));
      for (let i = 0; i < p; i++) {
        g[i] += (o.y - mu) * o.x[i];
        for (let j = 0; j < p; j++) H[i][j] += mu * o.x[i] * o.x[j];
      }
    }
    const step = solve(H, g);
    beta = beta.map((b, i) => b + step[i]);
    if (step.every((s) => Math.abs(s) < 1e-7)) break;
  }
  return { coef: beta };
};

/** Popularidade relativa prevista (1 = média do histórico; <1 = menos disputado). */
export const crowdIndex = (model: CrowdModel, nums: number[], sampleMean = 1): number => {
  const f = featuresOf(nums);
  const eta = f.reduce((a, v, i) => a + v * model.coef[i + 2], 0);
  return Math.exp(eta) / sampleMean;
};

/** Média do índice sobre sorteios reais — normaliza para 1 = jogo "típico". */
export const crowdBaseline = (model: CrowdModel, history: LotofacilResult[]): number =>
  history.reduce((a, g) => a + crowdIndex(model, g.listaDezenas), 0) / Math.max(1, history.length);
