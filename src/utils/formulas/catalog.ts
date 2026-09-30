import { W, freqWindow, type Ctx } from './context';
import { LAMBDAS } from './context';

// Catálogo de fórmulas: cada uma dá um ESCORE por dezena (maior = mais provável
// segundo a hipótese testada). O harness pega as 15 maiores e mede acertos.
export type Scorer = (c: Ctx, t: number, rnd: () => number) => Float64Array;
export interface Formula { id: string; family: string; label: string; score: Scorer }

const per = (f: (n: number) => number): Float64Array => {
  const s = new Float64Array(W);
  for (let n = 1; n <= 25; n++) s[n] = f(n);
  return s;
};
const neg = (s: Float64Array): Float64Array => s.map((v) => -v);
const F: Formula[] = [];
const add = (id: string, family: string, label: string, score: Scorer) => F.push({ id, family, label, score });

for (const w of [5, 10, 20, 30, 50, 100, 200, 500, 0]) {
  const tag = w || 'todo';
  add(`quente_${tag}`, 'Frequência', `Mais frequentes (janela ${tag})`, (c, t) => per((n) => freqWindow(c, t, n, w)));
  add(`frio_${tag}`, 'Frequência', `Menos frequentes (janela ${tag})`, (c, t) => neg(per((n) => freqWindow(c, t, n, w))));
}
for (const l of LAMBDAS) {
  add(`ewma_${l}`, 'Decaimento', `EWMA quente λ=${l}`, (c, t) => per((n) => c.ewma.get(l)![t * W + n]));
  add(`ewma_frio_${l}`, 'Decaimento', `EWMA frio λ=${l}`, (c, t) => per((n) => -c.ewma.get(l)![t * W + n]));
}
add('atrasada', 'Atraso', 'Mais atrasadas (gap)', (c, t) => per((n) => c.gap[t * W + n]));
add('recente', 'Atraso', 'Saíram há pouco (menor gap)', (c, t) => per((n) => -c.gap[t * W + n]));
add('atraso_relativo', 'Atraso', 'Gap ÷ intervalo médio', (c, t) => per((n) => c.gap[t * W + n] / Math.max(1, t / Math.max(1, freqWindow(c, t, n, 0)))));
add('repete_anterior', 'Repetição', 'Dezenas do concurso anterior', (c, t) => per((n) => (t > 0 ? c.member[(t - 1) * W + n] : 0)));
add('repete_2', 'Repetição', 'Dezenas de 2 concursos atrás', (c, t) => per((n) => (t > 1 ? c.member[(t - 2) * W + n] : 0)));
add('nao_repete', 'Repetição', 'Fora do concurso anterior', (c, t) => per((n) => (t > 0 ? -c.member[(t - 1) * W + n] : 0)));
add('repete_ult3', 'Repetição', 'Soma dos 3 últimos concursos', (c, t) => per((n) => [1, 2, 3].reduce((a, k) => a + (t >= k ? c.member[(t - k) * W + n] : 0), 0)));
add('markov1', 'Markov', 'P(sair | estado anterior) por dezena', (c, t) => per((n) => {
  const inPrev = t > 0 ? c.member[(t - 1) * W + n] : 0;
  const pin = c.prevCum[t * W + n], both = c.bothCum[t * W + n];
  const pOut = t - 1 - pin, bothOut = freqWindow(c, t, n, 0) - both;
  return inPrev ? (both + 1) / (pin + 2) : (bothOut + 1) / (pOut + 2);
}));
for (const k of [50, 200, 1000]) {
  add(`eb_${k}`, 'Bayes', `Beta-binomial (prior ${k})`, (c, t) => per((n) => (freqWindow(c, t, n, 0) + 0.6 * k) / (t + k)));
}
add('hot_cold_mix', 'Mistas', '50% quente(50) + 50% frio(500)', (c, t) => per((n) => freqWindow(c, t, n, 50) / 50 - freqWindow(c, t, n, 500) / 500));
add('tendencia', 'Mistas', 'Freq(20) − Freq(200) (aceleração)', (c, t) => per((n) => freqWindow(c, t, n, 20) / 20 - freqWindow(c, t, n, 200) / 200));
add('ciclo', 'Ciclo', 'Faltam para fechar o ciclo', (c, t) => {
  const seen = new Set<number>();
  for (let k = 1; k <= t && seen.size < 25; k++) {
    const missing = c.draws[t - k].filter((n) => !seen.has(n));
    if (seen.size + missing.length >= 25 && k > 1) break;
    c.draws[t - k].forEach((n) => seen.add(n));
  }
  return per((n) => (seen.has(n) ? 0 : 1));
});
add('ordem_inicio', 'Ordem', 'Primeiras bolas do concurso anterior', (c, t) => per((n) => {
  const o = t > 0 ? c.order[t - 1] : undefined;
  return o ? (o.slice(0, 8).includes(n) ? 1 : 0) : 0;
}));
add('ordem_fim', 'Ordem', 'Últimas bolas do concurso anterior', (c, t) => per((n) => {
  const o = t > 0 ? c.order[t - 1] : undefined;
  return o ? (o.slice(8).includes(n) ? 1 : 0) : 0;
}));
const SETS: Record<string, number[]> = {
  primos: [2, 3, 5, 7, 11, 13, 17, 19, 23], fibonacci: [1, 2, 3, 5, 8, 13, 21], multiplos3: [3, 6, 9, 12, 15, 18, 21, 24],
  impares: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25], baixas: Array.from({ length: 13 }, (_, i) => i + 1),
  moldura: [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25],
};
for (const [id, set] of Object.entries(SETS)) add(`fixo_${id}`, 'Números fixos', `Só ${id}`, () => per((n) => (set.includes(n) ? 1 : 0)));
for (const s of [1, 2, 3]) add(`aleatorio_${s}`, 'Controle', `Aleatório (controle ${s})`, (_c, _t, rnd) => per(() => rnd()));

export const FORMULAS: Formula[] = F;
export const registerFormula = (f: Formula): void => { F.push(f); };
