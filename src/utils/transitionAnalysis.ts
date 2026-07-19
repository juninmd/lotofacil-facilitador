import type { LotofacilResult } from '../game';

// Análises de TRANSIÇÃO concurso anterior -> próximo. Compara cada sorteio com o
// seguinte para caçar dependências exploráveis:
//  - a soma de um concurso influencia a do próximo? (autocorrelação da soma)
//  - números "vizinhos" (±1) dos sorteados tendem a sair no próximo?
//  - quantos números repetem, e QUAIS repetem mais (os mais frequentes?)
//
// Referência de independência: cada dezena tem 60% (15/25) de sair em cada
// concurso, sem memória. Correlação ~0 e taxas ~60% = sem edge.

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);
const sumOf = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

// Correlação de Pearson entre a soma de concursos consecutivos.
export const sumAutocorrelation = (history: LotofacilResult[]): number => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    ys.push(sumOf(history[i].listaDezenas)); // próximo (mais novo)
    xs.push(sumOf(history[i + 1].listaDezenas)); // anterior
  }
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  return vx && vy ? +(cov / Math.sqrt(vx * vy)).toFixed(4) : 0;
};

// Vizinhos: entre as dezenas que são ±1 de alguma sorteada no anterior (e que NÃO
// saíram no anterior), qual a taxa de aparecer no próximo? Compara com 60%.
export const neighborTransition = (history: LotofacilResult[]): { taxaVizinho: number; base: number } => {
  let hit = 0, total = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const prev = new Set(history[i + 1].listaDezenas);
    const next = new Set(history[i].listaDezenas);
    const neighbors = new Set<number>();
    prev.forEach((n) => {
      [n - 1, n + 1].forEach((m) => { if (m >= 1 && m <= 25 && !prev.has(m)) neighbors.add(m); });
    });
    neighbors.forEach((m) => { total++; if (next.has(m)) hit++; });
  }
  return { taxaVizinho: total ? +(hit / total).toFixed(4) : 0, base: 0.6 };
};

// Repetição por identidade: entre as dezenas do anterior, as MAIS FREQUENTES
// (historicamente) repetem mais no próximo do que as menos frequentes?
export const repeatByFrequency = (history: LotofacilResult[]): { quentesRepetem: number; friasRepetem: number } => {
  // Frequência global.
  const freq = new Map<number, number>(ALL.map((n) => [n, 0]));
  history.forEach((g) => g.listaDezenas.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1)));
  const sortedByFreq = [...ALL].sort((a, b) => (freq.get(b)! - freq.get(a)!));
  const hot = new Set(sortedByFreq.slice(0, 8)); // 8 mais quentes
  const cold = new Set(sortedByFreq.slice(-8)); // 8 mais frias

  let hotIn = 0, hotRep = 0, coldIn = 0, coldRep = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const prev = history[i + 1].listaDezenas;
    const next = new Set(history[i].listaDezenas);
    prev.forEach((n) => {
      if (hot.has(n)) { hotIn++; if (next.has(n)) hotRep++; }
      if (cold.has(n)) { coldIn++; if (next.has(n)) coldRep++; }
    });
  }
  return {
    quentesRepetem: hotIn ? +(hotRep / hotIn).toFixed(4) : 0,
    friasRepetem: coldIn ? +(coldRep / coldIn).toFixed(4) : 0,
  };
};

export interface TransitionReport {
  autocorrelacaoSoma: number; // ~0 se independente
  vizinho: { taxaVizinho: number; base: number };
  repeticaoPorFreq: { quentesRepetem: number; friasRepetem: number };
}

export const analyzeTransitions = (history: LotofacilResult[]): TransitionReport => ({
  autocorrelacaoSoma: sumAutocorrelation(history),
  vizinho: neighborTransition(history),
  repeticaoPorFreq: repeatByFrequency(history),
});
