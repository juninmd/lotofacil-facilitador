import { describe, it, expect } from 'vitest';
import { simulateBudget, expectedReturnRate, compareBudgetPlans, DEFAULT_PRIZES } from './budgetSimulator';

describe('expectedReturnRate', () => {
  it('é negativo (aposta perde dinheiro em média)', () => {
    expect(expectedReturnRate(15)).toBeLessThan(0);
  });

  it('é praticamente o mesmo para 15/16/17/20 (linearidade)', () => {
    const r15 = expectedReturnRate(15);
    const r17 = expectedReturnRate(17);
    const r20 = expectedReturnRate(20);
    expect(Math.abs(r15 - r17)).toBeLessThan(1e-9);
    expect(Math.abs(r15 - r20)).toBeLessThan(1e-9);
  });
});

describe('simulateBudget', () => {
  it('calcula apostas cabíveis e gasto real', () => {
    const p = simulateBudget(100, 15); // R$3,50 por aposta
    expect(p.custoPorAposta).toBeCloseTo(3.5, 2);
    expect(p.apostasNoMes).toBe(28); // floor(100/3.5)
    expect(p.gastoReal).toBeCloseTo(98, 2);
  });

  it('chance de ganhar algo no mês cresce com mais apostas', () => {
    const poucas = simulateBudget(35, 15); // 10 apostas
    const muitas = simulateBudget(350, 15); // 100 apostas
    expect(muitas.pGanharAlgoNoMes).toBeGreaterThan(poucas.pGanharAlgoNoMes);
    expect(muitas.pGanharAlgoNoMes).toBeLessThanOrEqual(1);
  });

  it('perda esperada é uma fração positiva do gasto', () => {
    const p = simulateBudget(1000, 15);
    expect(p.perdaEsperadaMes).toBeGreaterThan(0);
    expect(p.perdaEsperadaMes).toBeLessThan(p.gastoReal);
    // retorno esperado bate com a perda (pct é exibido arredondado, então tolera ~R$1)
    expect(p.perdaEsperadaMes).toBeCloseTo(p.gastoReal * -p.retornoEsperadoPct / 100, 0);
  });

  it('orçamento insuficiente => 0 apostas', () => {
    const p = simulateBudget(2, 15);
    expect(p.apostasNoMes).toBe(0);
    expect(p.pGanharAlgoNoMes).toBe(0);
  });
});

describe('compareBudgetPlans', () => {
  it('só inclui tamanhos que cabem no orçamento', () => {
    const plans = compareBudgetPlans(100, [15, 16, 17, 18]);
    // R$100: cabe 15 (3,50) e 16 (56); 17 (476) e 18 (2856) não.
    expect(plans.map((p) => p.dezenas)).toEqual([15, 16]);
  });

  it('usa o modelo de prêmios padrão', () => {
    expect(DEFAULT_PRIZES.p13).toBe(35);
  });
});
