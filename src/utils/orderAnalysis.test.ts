import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../game';
import {
  oddEvenDistribution,
  firstDrawnStats,
  parityByPosition,
  positionHeatmap,
  extremesDistribution,
} from './orderAnalysis';

const game = (numero: number, ordem: number[]): LotofacilResult => ({
  numero,
  listaDezenas: [...ordem].sort((a, b) => a - b),
  ordemSorteio: ordem,
  dataApuracao: '',
  listaRateioPremio: [],
});

// ordem A começa com 1 (ímpar); ordem B começa com 2 (par).
const A = [1, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 3, 5, 7];
const B = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 1, 3, 5];

describe('oddEvenDistribution', () => {
  it('calcula média e histograma de ímpares', () => {
    const r = oddEvenDistribution([game(1, A), game(2, A)]);
    // A tem 5 ímpares (1,3,5,7 + ... conta: 1,3,5,7 e demais pares) -> 5 ímpares
    const oddInA = A.filter((n) => n % 2 !== 0).length;
    expect(r.media).toBeCloseTo(oddInA, 5);
    expect(r.histograma[oddInA]).toBe(2);
  });
});

describe('firstDrawnStats', () => {
  it('mede paridade e heatmap da primeira bola', () => {
    const r = firstDrawnStats([game(1, A), game(2, B), game(3, A)]);
    expect(r.amostras).toBe(3);
    // 2 de 3 começam com ímpar (A,A) -> 66.7%
    expect(r.pctImpar).toBeCloseTo(66.7, 1);
    // número 1 foi primeiro 2x
    expect(r.heatmap.find((h) => h.numero === 1)?.vezesPrimeiro).toBe(2);
    expect(r.heatmap.find((h) => h.numero === 2)?.vezesPrimeiro).toBe(1);
  });

  it('ignora concursos sem ordemSorteio', () => {
    const semOrdem: LotofacilResult = { numero: 9, listaDezenas: A, dataApuracao: '', listaRateioPremio: [] };
    const r = firstDrawnStats([game(1, A), semOrdem]);
    expect(r.amostras).toBe(1);
  });
});

describe('parityByPosition', () => {
  it('retorna 15 posições', () => {
    const r = parityByPosition([game(1, A), game(2, B)]);
    expect(r).toHaveLength(15);
    expect(r[0].posicao).toBe(1);
    // posição 1: A=ímpar, B=par -> 50%
    expect(r[0].pctImpar).toBeCloseTo(50, 1);
  });
});

describe('positionHeatmap', () => {
  it('matriz 25x15', () => {
    const m = positionHeatmap([game(1, A)]);
    expect(m).toHaveLength(25);
    expect(m[0]).toHaveLength(15);
    // dezena 1 saiu na posição 1 (100%) em A
    expect(m[0][0]).toBe(100);
  });
});

describe('extremesDistribution', () => {
  it('acha menor e maior mais comuns', () => {
    const r = extremesDistribution([game(1, A), game(2, B)]);
    expect(r.menorMaisComum[0].numero).toBe(1); // A e B têm 1 como menor
    expect(r.maiorMaisComum[0].numero).toBe(24);
  });
});
