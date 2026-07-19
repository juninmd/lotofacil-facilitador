import type { LotofacilResult } from '../game';

// Análise CRÍTICA de repetição/dependência entre concursos. Responde, com dados:
//  - Algum sorteio exato (as 15 dezenas) já se repetiu?
//  - Quantas dezenas repetem de um concurso para o próximo? É mais que o acaso?
//  - "Número atrasado" tem mais chance de sair? (teste da falácia do apostador)
//  - Sair agora aumenta a chance de sair no próximo? (autocorrelação)
//
// Base de comparação: num sorteio uniforme e independente, uma dezena qualquer
// tem 15/25 = 60% de chance de sair em cada concurso, INDEPENDENTE do passado.

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);
const BASE_RATE = 15 / 25; // 0.60

export interface RepetitionReport {
  concursos: number;
  sorteiosExatosRepetidos: number;
  repeticaoConsecutiva: { media: number; min: number; max: number; histograma: Record<number, number> };
  taxaRepeticaoObservada: number; // fração das dezenas que repetem no próximo
  taxaEsperada: number; // 0.60
}

// history: mais novo [0] ao mais antigo [N].
export const analyzeRepetition = (history: LotofacilResult[]): RepetitionReport => {
  // 1) Sorteios exatos repetidos.
  const seen = new Set<string>();
  let exact = 0;
  history.forEach((g) => {
    const key = [...g.listaDezenas].sort((a, b) => a - b).join(',');
    if (seen.has(key)) exact++;
    seen.add(key);
  });

  // 2) Repetição entre concursos consecutivos.
  const histograma: Record<number, number> = {};
  let sumRepeat = 0;
  let min = 15;
  let max = 0;
  let pairs = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const cur = new Set(history[i].listaDezenas);
    const older = history[i + 1].listaDezenas;
    const rep = older.filter((n) => cur.has(n)).length;
    histograma[rep] = (histograma[rep] || 0) + 1;
    sumRepeat += rep;
    if (rep < min) min = rep;
    if (rep > max) max = rep;
    pairs++;
  }
  const media = pairs ? sumRepeat / pairs : 0;

  return {
    concursos: history.length,
    sorteiosExatosRepetidos: exact,
    repeticaoConsecutiva: { media: +media.toFixed(3), min, max, histograma },
    taxaRepeticaoObservada: +(media / 15).toFixed(4),
    taxaEsperada: BASE_RATE,
  };
};

export interface DelayBucket {
  atraso: number; // concursos desde a última aparição
  amostras: number;
  taxaSaida: number; // P(sair no próximo | esse atraso)
}

// Testa a falácia do "número atrasado": agrupa por atraso e mede a taxa real de
// saída. Se o sorteio é independente, a taxa fica ~0.60 para QUALQUER atraso.
export const analyzeOverdue = (history: LotofacilResult[], maxDelay = 12): DelayBucket[] => {
  const counts = new Map<number, { hit: number; total: number }>();
  for (let d = 0; d <= maxDelay; d++) counts.set(d, { hit: 0, total: 0 });

  // Para cada alvo i, calcula o atraso de cada dezena (usando o passado i+1..)
  // e se ela saiu no alvo.
  for (let i = 0; i < history.length - maxDelay - 1; i++) {
    const target = new Set(history[i].listaDezenas);
    for (const n of ALL) {
      // atraso = quantos concursos desde a última aparição antes do alvo
      let delay = 0;
      for (let j = i + 1; j < history.length; j++) {
        if (history[j].listaDezenas.includes(n)) break;
        delay++;
      }
      const bucket = counts.get(Math.min(delay, maxDelay));
      if (bucket) {
        bucket.total++;
        if (target.has(n)) bucket.hit++;
      }
    }
  }

  return [...counts.entries()]
    .map(([atraso, c]) => ({
      atraso,
      amostras: c.total,
      taxaSaida: c.total ? +(c.hit / c.total).toFixed(4) : 0,
    }))
    .filter((b) => b.amostras > 0);
};

// Autocorrelação: P(sair no próximo | saiu agora) vs P(sair | NÃO saiu agora).
// Independência => ambas ~0.60.
export const analyzeAutocorrelation = (history: LotofacilResult[]): { dado: number; naoDado: number } => {
  let hitGivenIn = 0, totalIn = 0, hitGivenOut = 0, totalOut = 0;
  for (let i = 0; i < history.length - 1; i++) {
    const next = new Set(history[i].listaDezenas);
    const cur = new Set(history[i + 1].listaDezenas);
    for (const n of ALL) {
      if (cur.has(n)) { totalIn++; if (next.has(n)) hitGivenIn++; }
      else { totalOut++; if (next.has(n)) hitGivenOut++; }
    }
  }
  return {
    dado: totalIn ? +(hitGivenIn / totalIn).toFixed(4) : 0,
    naoDado: totalOut ? +(hitGivenOut / totalOut).toFixed(4) : 0,
  };
};
