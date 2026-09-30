import { makeWeightedDraws, mulberry32 } from '../mc/rng';

// VPE — Viés Persistente Encolhido.
//
// Achado da perícia (docs/FORENSE.md): a frequência de cada dezena tem um viés
// REAL e persistente de ~±1 pp em torno de 60% (correlação 0,48 entre 1ª e 2ª
// metade do histórico, p<0,01; ganho preditivo fora da amostra z≈2,5-3,3).
// O estimador ingênuo (frequência bruta) exagera o viés (ruído ≈ 0,8 pp), então
// aplicamos ENCOLHIMENTO Bayes-empírico:
//
//   σ_b² = máx(var_obs − 0,24/n_ef, ε)       (variância verdadeira do viés)
//   s    = σ_b² / (σ_b² + 0,24/n_ef)          (fator de confiança)
//   p̂_n  = 0,6 + s · (f_n − 0,6)
//
// Sem hiperparâmetros: s é estimado dos próprios dados a cada instante.

export interface BiasModel {
  probs: number[]; // p̂_n, n=1..25 (índice 0 = dezena 1)
  sigmaB: number; // desvio-padrão verdadeiro estimado do viés
  shrink: number; // fator de encolhimento s
  nEff: number;
  logW: Float64Array; // log-pesos que reproduzem p̂ na amostragem de 15/25
}

/** `draws`: listas de dezenas do mais ANTIGO ao mais NOVO. `lambda<1` dá mais peso ao recente. */
export const estimateBias = (draws: number[][], lambda = 1, calibrate = true): BiasModel => {
  const c = new Float64Array(25); let W = 0, W2 = 0;
  draws.forEach((d, i) => {
    const w = lambda ** (draws.length - 1 - i);
    for (const n of d) c[n - 1] += w;
    W += w; W2 += w * w;
  });
  const nEff = W > 0 ? (W * W) / W2 : 0;
  const f = Array.from(c, (v) => (W > 0 ? v / W : 0.6));
  const noise = 0.24 / Math.max(1, nEff);
  const varObs = f.reduce((a, v) => a + (v - 0.6) ** 2, 0) / 25;
  const sigma2 = Math.max(varObs - noise, 1e-8);
  const shrink = sigma2 / (sigma2 + noise);
  const probs = f.map((v) => 0.6 + shrink * (v - 0.6));
  return { probs, sigmaB: Math.sqrt(sigma2), shrink, nEff, logW: calibrate ? calibrateLogWeights(probs) : new Float64Array(25) };
};

const logit = (p: number): number => Math.log(p / (1 - p));

/** Acha log-pesos cuja amostragem sucessiva de 15/25 tem marginais ≈ `probs` (ponto fixo por Monte Carlo). */
export const calibrateLogWeights = (probs: number[], iters = 6, draws = 40_000): Float64Array => {
  const beta = new Float64Array(25);
  for (let it = 0; it < iters; it++) {
    const d = makeWeightedDraws(draws, mulberry32(1234 + it), beta);
    const m = new Float64Array(25);
    for (const x of d) for (let n = 0; n < 25; n++) m[n] += (x >>> n) & 1;
    for (let n = 0; n < 25; n++) beta[n] += 0.9 * (logit(probs[n]) - logit(Math.min(0.99, Math.max(0.01, m[n] / draws))));
  }
  return beta;
};

/** As 15 dezenas de maior p̂ (melhor jogo único sob o modelo). */
export const topByBias = (model: BiasModel, k = 15): number[] =>
  Array.from({ length: 25 }, (_, i) => i + 1).sort((a, b) => model.probs[b - 1] - model.probs[a - 1] || a - b).slice(0, k).sort((a, b) => a - b);

/** Acertos esperados de um jogo sob o modelo (uniforme = 9,00 para 15 dezenas). */
export const expectedHitsUnder = (model: BiasModel, ticket: number[]): number => ticket.reduce((a, n) => a + model.probs[n - 1], 0);
