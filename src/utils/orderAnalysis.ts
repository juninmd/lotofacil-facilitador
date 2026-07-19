import type { LotofacilResult } from '../game';

// Análises criativas de ORDEM do sorteio e paridade sobre todo o histórico.
// Requer o campo `ordemSorteio` (ordem real em que as dezenas saíram).
// Perguntas: existe viés par/ímpar? Todo sorteio começa com ímpar? Onde "começa"
// (mapa de calor da 1ª bola)? Alguma posição do sorteio favorece certas dezenas?
//
// Base de comparação (sorteio uniforme): a 1ª bola é uniforme em 1..25 (4% cada);
// como há 13 ímpares e 12 pares em 25, a chance da 1ª ser ímpar é 13/25 = 52%.

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);

export interface OddEvenDist {
  media: number;
  histograma: Record<number, number>; // qtd de ímpares (0..15) -> ocorrências
  pctParImparBalanceado: number; // % de jogos com 7 ou 8 ímpares
}

export const oddEvenDistribution = (history: LotofacilResult[]): OddEvenDist => {
  const histograma: Record<number, number> = {};
  let sum = 0;
  let balanced = 0;
  history.forEach((g) => {
    const odd = g.listaDezenas.filter((n) => n % 2 !== 0).length;
    histograma[odd] = (histograma[odd] || 0) + 1;
    sum += odd;
    if (odd === 7 || odd === 8) balanced++;
  });
  return {
    media: +(sum / Math.max(1, history.length)).toFixed(3),
    histograma,
    pctParImparBalanceado: +((balanced / Math.max(1, history.length)) * 100).toFixed(1),
  };
};

export interface FirstDrawnStats {
  amostras: number;
  pctImpar: number; // % de sorteios cuja 1ª bola é ímpar
  esperadoImpar: number; // 52 (13/25)
  heatmap: { numero: number; vezesPrimeiro: number; pct: number }[]; // ordenado desc
  chiQuadrado: number; // aderência à uniformidade da 1ª bola
  uniformeCritico5pct: number; // 36.4 (24 g.l.)
}

// Mapa de calor de qual dezena saiu PRIMEIRO + teste de uniformidade (qui-quadrado).
export const firstDrawnStats = (history: LotofacilResult[]): FirstDrawnStats => {
  const withOrder = history.filter((g) => g.ordemSorteio && g.ordemSorteio.length === 15);
  const count = new Map<number, number>(ALL.map((n) => [n, 0]));
  let odd = 0;
  withOrder.forEach((g) => {
    const first = g.ordemSorteio![0];
    count.set(first, (count.get(first) || 0) + 1);
    if (first % 2 !== 0) odd++;
  });
  const n = withOrder.length || 1;
  const expected = n / 25;
  const chi = ALL.reduce((acc, num) => {
    const o = count.get(num) || 0;
    return acc + (o - expected) ** 2 / expected;
  }, 0);
  const heatmap = ALL.map((numero) => ({
    numero,
    vezesPrimeiro: count.get(numero) || 0,
    pct: +(((count.get(numero) || 0) / n) * 100).toFixed(2),
  })).sort((a, b) => b.vezesPrimeiro - a.vezesPrimeiro);

  return {
    amostras: n,
    pctImpar: +((odd / n) * 100).toFixed(1),
    esperadoImpar: +((13 / 25) * 100).toFixed(1),
    heatmap,
    chiQuadrado: +chi.toFixed(2),
    uniformeCritico5pct: 36.42,
  };
};

// Paridade por POSIÇÃO do sorteio (1ª bola, 2ª, ...): % de ímpares em cada posição.
// Se independente/uniforme, todas ficam ~52%.
export const parityByPosition = (history: LotofacilResult[]): { posicao: number; pctImpar: number }[] => {
  const withOrder = history.filter((g) => g.ordemSorteio && g.ordemSorteio.length === 15);
  const odd = new Array(15).fill(0);
  withOrder.forEach((g) => {
    g.ordemSorteio!.forEach((num, pos) => {
      if (num % 2 !== 0) odd[pos]++;
    });
  });
  const n = withOrder.length || 1;
  return odd.map((o, pos) => ({ posicao: pos + 1, pctImpar: +((o / n) * 100).toFixed(1) }));
};

// Mapa de calor completo: matriz [dezena 1..25][posição 1..15] com % de vezes que
// a dezena saiu naquela posição do sorteio.
export const positionHeatmap = (history: LotofacilResult[]): number[][] => {
  const withOrder = history.filter((g) => g.ordemSorteio && g.ordemSorteio.length === 15);
  const matrix = ALL.map(() => new Array(15).fill(0));
  withOrder.forEach((g) => {
    g.ordemSorteio!.forEach((num, pos) => {
      if (num >= 1 && num <= 25) matrix[num - 1][pos]++;
    });
  });
  const n = withOrder.length || 1;
  return matrix.map((row) => row.map((c) => +((c / n) * 100).toFixed(2)));
};

// Distribuição da MENOR e da MAIOR dezena de cada sorteio (ordenado).
export const extremesDistribution = (history: LotofacilResult[]) => {
  const minCount = new Map<number, number>();
  const maxCount = new Map<number, number>();
  history.forEach((g) => {
    const s = [...g.listaDezenas].sort((a, b) => a - b);
    const lo = s[0];
    const hi = s[s.length - 1];
    minCount.set(lo, (minCount.get(lo) || 0) + 1);
    maxCount.set(hi, (maxCount.get(hi) || 0) + 1);
  });
  const top = (m: Map<number, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([numero, vezes]) => ({ numero, vezes }));
  return { menorMaisComum: top(minCount), maiorMaisComum: top(maxCount) };
};
