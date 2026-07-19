import { describe, it, expect } from 'vitest';
import {
  comb,
  probExactHits,
  hitDistribution,
  expectedHits,
  probAtLeast,
  combosContained,
  ticketCost,
  probTopPrize,
  analyzeMarking,
} from './probability';
import {
  combinations,
  fullWheel,
  bestTicketHits,
  guaranteedHits,
} from './wheeling';

describe('comb (coeficiente binomial)', () => {
  it('valores conhecidos da Lotofácil', () => {
    expect(comb(25, 15)).toBe(3268760);
    expect(comb(6, 3)).toBe(20);
    expect(comb(16, 15)).toBe(16);
    expect(comb(18, 15)).toBe(816);
    expect(comb(5, 0)).toBe(1);
    expect(comb(4, 5)).toBe(0);
  });
});

describe('distribuição hipergeométrica', () => {
  it('probabilidades somam 1 para cada cartela 15..20', () => {
    for (let k = 15; k <= 20; k++) {
      const total = [...hitDistribution(k).values()].reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('P(cravar 15) marcando 15 = 1 / C(25,15)', () => {
    expect(probExactHits(15, 15)).toBeCloseTo(1 / 3268760, 15);
    expect(probTopPrize(15)).toBeCloseTo(1 / 3268760, 15);
  });

  it('esperança de acertos = 0.6 * marks', () => {
    expect(expectedHits(15)).toBeCloseTo(9, 10);
    expect(expectedHits(18)).toBeCloseTo(10.8, 10);
    expect(expectedHits(20)).toBeCloseTo(12, 10);
  });

  it('probabilidade nula fora do suporte', () => {
    expect(probExactHits(15, 16)).toBe(0);
    // marcando 20, o mínimo de acertos é 20-10 = 10
    expect(probExactHits(20, 9)).toBe(0);
    expect(probExactHits(20, 10)).toBeGreaterThan(0);
  });
});

describe('marcar mais dezenas AUMENTA a chance de acertar mais números', () => {
  it('P(>=14) é estritamente crescente em marks (15..20)', () => {
    let prev = -1;
    for (let k = 15; k <= 20; k++) {
      const p = probAtLeast(k, 14);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
  });

  it('P(cravar 15) cresce com marks', () => {
    expect(probTopPrize(16)).toBeGreaterThan(probTopPrize(15));
    expect(probTopPrize(20)).toBeGreaterThan(probTopPrize(16));
    // exato: marcando 16 => C(10,1)/C(25,16)
    expect(probTopPrize(16)).toBeCloseTo(10 / comb(25, 16), 15);
  });

  it('custo = combinações contidas * preço simples', () => {
    expect(combosContained(16)).toBe(16);
    expect(ticketCost(16)).toBeCloseTo(56, 6); // 16 * 3.50
    expect(ticketCost(18)).toBeCloseTo(2856, 6); // 816 * 3.50
  });

  it('analyzeMarking coerente', () => {
    const a = analyzeMarking(18);
    expect(a.expectedHits).toBeCloseTo(10.8, 10);
    expect(a.pAtLeast14).toBeGreaterThan(analyzeMarking(15).pAtLeast14);
    expect(a.oddsTopPrize).toBeCloseTo(1 / a.p15, 6);
  });
});

describe('desdobramento (wheeling) — garantia matemática exata', () => {
  it('combinations gera C(n,k) itens', () => {
    expect(combinations([1, 2, 3, 4, 5, 6], 3).length).toBe(20);
    expect(fullWheel(Array.from({ length: 16 }, (_, i) => i + 1)).length).toBe(16);
  });

  it('bestTicketHits acha o melhor jogo', () => {
    const tickets = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16],
    ];
    // sorteio inclui o 16 e exclui o 15 -> segundo jogo faz 15
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16];
    expect(bestTicketHits(tickets, drawn)).toBe(15);
  });

  it('desdobramento completo de 16 dezenas garante 15 se as 15 saírem do pool', () => {
    const pool = Array.from({ length: 16 }, (_, i) => i + 1);
    const wheel = fullWheel(pool);
    expect(guaranteedHits(wheel, pool, 15)).toBe(15); // pior caso ainda crava 15
    expect(guaranteedHits(wheel, pool, 14)).toBe(14);
  });

  it('desdobramento ABREVIADO troca custo por garantia menor', () => {
    const pool = Array.from({ length: 16 }, (_, i) => i + 1);
    const full = fullWheel(pool); // 16 jogos
    const abbreviated = full.slice(0, 4); // só 4 jogos (mais barato)
    const gFull = guaranteedHits(full, pool, 15);
    const gAbbr = guaranteedHits(abbreviated, pool, 15);
    expect(gAbbr).toBeLessThanOrEqual(gFull);
    expect(gFull).toBe(15);
  });
});
