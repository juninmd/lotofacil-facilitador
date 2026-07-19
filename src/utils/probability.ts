// Probabilidade EXATA da Lotofácil (sorteio uniforme: 15 dezenas sorteadas de 25).
//
// Como o sorteio é uniforme e independente, NÃO existe previsão com vantagem.
// A única forma matematicamente real de "acertar mais números" é marcar mais
// dezenas (cartela de 16..20) e/ou desdobrar. Este módulo quantifica isso com
// a distribuição hipergeométrica — sem achismo.

export const DRAWN = 15; // dezenas sorteadas
export const UNIVERSE = 25; // dezenas do volante
const BASE_PRICE = 3.5; // preço da aposta simples de 15 dezenas (R$)

// Coeficiente binomial C(n, r) exato (multiplicativo, estável até os valores da Lotofácil).
export const comb = (n: number, r: number): number => {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
};

// P(exatamente `hits` acertos ao marcar `marks` dezenas).
// Hipergeométrica: universo 25, "sucessos" = 15 sorteadas, amostra = marks.
export const probExactHits = (marks: number, hits: number): number => {
  if (marks < DRAWN || marks > UNIVERSE) {
    // Para cartelas de 15..20; fora disso a fórmula geral ainda vale para marks>=hits.
  }
  const lo = Math.max(0, marks - (UNIVERSE - DRAWN));
  const hi = Math.min(DRAWN, marks);
  if (hits < lo || hits > hi) return 0;
  return (comb(DRAWN, hits) * comb(UNIVERSE - DRAWN, marks - hits)) / comb(UNIVERSE, marks);
};

// Distribuição completa de acertos para uma cartela de `marks` dezenas.
export const hitDistribution = (marks: number): Map<number, number> => {
  const dist = new Map<number, number>();
  const hi = Math.min(DRAWN, marks);
  for (let x = 0; x <= hi; x++) {
    const p = probExactHits(marks, x);
    if (p > 0) dist.set(x, p);
  }
  return dist;
};

// Esperança de acertos = marks * 15 / 25 = 0.6 * marks.
export const expectedHits = (marks: number): number => (marks * DRAWN) / UNIVERSE;

// P(acertar >= threshold dezenas) com uma cartela de `marks`.
export const probAtLeast = (marks: number, threshold: number): number => {
  let p = 0;
  const hi = Math.min(DRAWN, marks);
  for (let x = threshold; x <= hi; x++) p += probExactHits(marks, x);
  return p;
};

// Quantas apostas simples de 15 dezenas estão contidas numa cartela de `marks`.
export const combosContained = (marks: number): number => comb(marks, DRAWN);

// Custo de uma cartela de `marks` dezenas (= nº de combinações * preço simples).
export const ticketCost = (marks: number, base: number = BASE_PRICE): number =>
  combosContained(marks) * base;

// P(prêmio máximo = cravar as 15) marcando `marks` dezenas.
// Só acontece se TODAS as 15 sorteadas estiverem entre as suas marks (hits === 15).
export const probTopPrize = (marks: number): number => probExactHits(marks, DRAWN);

export interface MarkingAnalysis {
  marks: number;
  combos: number;
  cost: number;
  expectedHits: number;
  p11: number;
  p12: number;
  p13: number;
  p14: number;
  p15: number;
  pAtLeast14: number;
  oddsTopPrize: number; // "1 em N"
}

// Resumo do tradeoff real de marcar `marks` dezenas.
export const analyzeMarking = (marks: number, base: number = BASE_PRICE): MarkingAnalysis => {
  const p15 = probExactHits(marks, DRAWN);
  return {
    marks,
    combos: combosContained(marks),
    cost: ticketCost(marks, base),
    expectedHits: expectedHits(marks),
    p11: probExactHits(marks, 11),
    p12: probExactHits(marks, 12),
    p13: probExactHits(marks, 13),
    p14: probExactHits(marks, 14),
    p15,
    pAtLeast14: probAtLeast(marks, 14),
    oddsTopPrize: p15 > 0 ? 1 / p15 : Infinity,
  };
};
