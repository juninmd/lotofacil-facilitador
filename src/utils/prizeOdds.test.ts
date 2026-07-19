import { describe, it, expect } from 'vitest';
import { prizeOdds, prizeOddsTable } from './prizeOdds';
import { comb } from './probability';

describe('prizeOdds', () => {
  it('cravar 15 com 15 dezenas = 1 em C(25,15)', () => {
    const o = prizeOdds(15);
    expect(o.umEm15).toBe(comb(25, 15)); // 3.268.760
    expect(o.combinacoes).toBe(1);
    expect(o.custo).toBeCloseTo(3.5, 2);
  });

  it('chance de ganhar algo (>=11) cresce com mais dezenas', () => {
    const p15 = prizeOdds(15).pGanharAlgo;
    const p16 = prizeOdds(16).pGanharAlgo;
    const p17 = prizeOdds(17).pGanharAlgo;
    expect(p16).toBeGreaterThan(p15);
    expect(p17).toBeGreaterThan(p16);
  });

  it('custo acompanha o nº de combinações', () => {
    expect(prizeOdds(16).combinacoes).toBe(16);
    expect(prizeOdds(16).custo).toBeCloseTo(56, 2);
    expect(prizeOdds(17).combinacoes).toBe(136);
    expect(prizeOdds(17).custo).toBeCloseTo(476, 2);
  });

  it('tabela cobre 15..20', () => {
    const t = prizeOddsTable();
    expect(t.map((r) => r.dezenas)).toEqual([15, 16, 17, 18, 19, 20]);
  });
});
