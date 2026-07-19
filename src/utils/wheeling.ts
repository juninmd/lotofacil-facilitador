// Desdobramento (wheeling) da Lotofácil.
//
// Um desdobramento pega um "pool" de N dezenas (N > 15) e o distribui em vários
// jogos de 15. Diferente de previsão, a GARANTIA de desdobramento é matemática:
// "se W das minhas N dezenas forem sorteadas, garanto pelo menos X acertos em
// algum jogo". Este módulo gera desdobramentos e VERIFICA garantias por força
// bruta exata (a ferramenta correta de homologação/QA para wheels).

import { DRAWN } from './probability';

// Todas as combinações de tamanho k de `arr` (iterativo, sem recursão profunda).
export const combinations = <T>(arr: T[], k: number): T[][] => {
  const result: T[][] = [];
  if (k < 0 || k > arr.length) return result;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    result.push(idx.map((i) => arr[i]));
    let i = k - 1;
    while (i >= 0 && idx[i] === arr.length - k + i) i--;
    if (i < 0) break;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
  return result;
};

// Acertos de um jogo dado o conjunto de dezenas sorteadas.
export const ticketHits = (ticket: number[], drawn: number[]): number => {
  let count = 0;
  for (let i = 0; i < ticket.length; i++) {
    if (drawn.includes(ticket[i])) count++;
  }
  return count;
};

export const bestTicketHits = (tickets: number[][], drawn: number[]): number => {
  let best = 0;
  for (let i = 0; i < tickets.length; i++) {
    const h = ticketHits(tickets[i], drawn);
    if (h > best) best = h;
  }
  return best;
};

// Desdobramento COMPLETO: todos os C(pool, 15) jogos. Garante o máximo possível
// (cobre qualquer sorteio dentro do pool) ao custo de todas as combinações.
export const fullWheel = (pool: number[]): number[][] => combinations(pool, DRAWN);

export interface Guarantee {
  winnersInPool: number; // W: quantas dezenas do pool saíram
  guaranteedHits: number; // pior caso: acertos garantidos em algum jogo
}

// Verificação EXATA por força bruta: assumindo que exatamente W dezenas do pool
// foram sorteadas, qual o MENOR "melhor jogo" possível (pior caso do sorteio)?
// Enumera todos os subconjuntos de W vencedoras dentro do pool.
export const guaranteedHits = (tickets: number[][], pool: number[], winnersInPool: number): number => {
  const w = Math.min(winnersInPool, DRAWN, pool.length);
  const winnerSets = combinations(pool, w);
  let worst = Infinity;
  for (const winners of winnerSets) {
    const best = bestTicketHits(tickets, winners);
    if (best < worst) worst = best;
    if (worst === 0) break;
  }
  return worst === Infinity ? 0 : worst;
};

// Tabela de garantia para vários níveis de W (dezenas do pool sorteadas).
export const guaranteeTable = (
  tickets: number[][],
  pool: number[],
  levels: number[],
): Guarantee[] => levels.map((w) => ({ winnersInPool: w, guaranteedHits: guaranteedHits(tickets, pool, w) }));