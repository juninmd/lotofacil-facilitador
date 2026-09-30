import type { Rng } from '../mc/rng';
import { toMask } from '../mc/rng';
import type { Dataset } from './dataset';

// Mundos sintéticos COM estrutura conhecida, para medir o poder da bateria:
// "se existisse um viés de tamanho X, nós o veríamos?". Amostragem de 15 entre
// 25 com pesos via Gumbel-top-k (equivale a amostragem sucessiva ponderada).
export type Scenario =
  | { kind: 'marginal'; delta: number } // dezenas com prob. 0,6±delta (padrão fixo)
  | { kind: 'sticky'; gamma: number } // dezena que saiu no concurso anterior ganha peso (1+gamma)
  | { kind: 'regime'; delta: number }; // viés só na 2ª metade do período

const gumbel = (rng: Rng): number => -Math.log(-Math.log(Math.max(1e-12, rng())));

export const biasVector = (delta: number): number[] =>
  Array.from({ length: 25 }, (_, n) => (Math.sin(n * 2.399 + 1) * delta) / 0.24); // ~ log-peso; escala aproximada de delta

export const syntheticDataset = (base: Dataset, scenario: Scenario, rng: Rng): Dataset => {
  const bias = biasVector(scenario.kind === 'sticky' ? 0 : scenario.delta);
  const masks = new Int32Array(base.N);
  for (let t = 0; t < base.N; t++) {
    const prev = t > 0 ? masks[t - 1] : 0;
    const on = scenario.kind !== 'regime' || t >= base.N / 2;
    const score = Array.from({ length: 25 }, (_, n) => {
      let lw = on ? bias[n] : 0;
      if (scenario.kind === 'sticky' && (prev >>> n) & 1) lw += Math.log(1 + scenario.gamma);
      return lw + gumbel(rng);
    });
    const top = score.map((s, n) => [s, n + 1] as const).sort((a, b) => b[0] - a[0]).slice(0, 15).map((x) => x[1]);
    masks[t] = toMask(top);
  }
  const orders = Array.from(masks, (m) => { const b: number[] = []; for (let n = 1; n <= 25; n++) if ((m >>> (n - 1)) & 1) b.push(n); return b; });
  return { ...base, masks, orders };
};

/** Ganho máximo de acertos por concurso se você CONHECESSE as probabilidades verdadeiras (top-15). */
export const oracleGain = (ds: Dataset): number => {
  const p = new Array(25).fill(0);
  for (const m of ds.masks) for (let n = 0; n < 25; n++) p[n] += (m >>> n) & 1;
  const q = p.map((v) => v / ds.N).sort((a, b) => b - a);
  return q.slice(0, 15).reduce((a, b) => a + b, 0) - 9;
};
