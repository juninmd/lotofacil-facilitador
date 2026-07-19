import { probExactHits, probAtLeast, ticketCost } from './probability';

// Simulador de orçamento: dado quanto você quer gastar, mostra a chance real de
// ganhar algum prêmio e a perda esperada — com honestidade matemática.
//
// Fato importante (linearidade da esperança): o RETORNO ESPERADO por real
// apostado é praticamente o MESMO para 15, 16, 17... dezenas, porque uma aposta
// de k dezenas equivale a C(k,15) apostas simples. Marcar mais só concentra o
// gasto; não melhora o retorno esperado.

export interface PrizeModel {
  p11: number; p12: number; p13: number; // valores fixos (R$)
  avg14: number; avg15: number; // médias do rateio (variáveis) — aproximações
}

// Valores de referência (fixos oficiais para 11-13; médias aproximadas p/ 14-15).
export const DEFAULT_PRIZES: PrizeModel = { p11: 7, p12: 14, p13: 35, avg14: 1700, avg15: 1_700_000 };

// Prêmio esperado de UMA aposta simples de 15 dezenas.
const expectedPrizePer15 = (m: PrizeModel): number =>
  probExactHits(15, 11) * m.p11 +
  probExactHits(15, 12) * m.p12 +
  probExactHits(15, 13) * m.p13 +
  probExactHits(15, 14) * m.avg14 +
  probExactHits(15, 15) * m.avg15;

// Taxa de retorno esperada (ex.: -0,57 = perde 57% do que aposta). ~constante em k.
export const expectedReturnRate = (dezenas: number, base = 3.5, m: PrizeModel = DEFAULT_PRIZES): number => {
  const combos = ticketCost(dezenas, base) / base; // = C(k,15)
  const expectedPrize = combos * expectedPrizePer15(m);
  const cost = ticketCost(dezenas, base);
  return expectedPrize / cost - 1;
};

export interface BudgetPlan {
  orcamento: number;
  dezenas: number;
  custoPorAposta: number;
  apostasNoMes: number;
  gastoReal: number;
  pGanharAlgoPorAposta: number; // P(>=11) numa aposta
  pGanharAlgoNoMes: number; // 1-(1-p)^apostas
  pCravar15NoMes: number;
  retornoEsperadoPct: number; // negativo
  perdaEsperadaMes: number; // R$ que você tende a perder
}

export const simulateBudget = (
  orcamento: number,
  dezenas = 15,
  base = 3.5,
  m: PrizeModel = DEFAULT_PRIZES,
): BudgetPlan => {
  const custo = ticketCost(dezenas, base);
  const apostas = Math.floor(orcamento / custo);
  const p = probAtLeast(dezenas, 11);
  const p15 = probExactHits(dezenas, 15);
  const gasto = apostas * custo;
  const retorno = expectedReturnRate(dezenas, base, m);
  return {
    orcamento,
    dezenas,
    custoPorAposta: +custo.toFixed(2),
    apostasNoMes: apostas,
    gastoReal: +gasto.toFixed(2),
    pGanharAlgoPorAposta: +p.toFixed(4),
    pGanharAlgoNoMes: apostas > 0 ? +(1 - (1 - p) ** apostas).toFixed(4) : 0,
    pCravar15NoMes: apostas > 0 ? 1 - (1 - p15) ** apostas : 0,
    retornoEsperadoPct: +(retorno * 100).toFixed(1),
    perdaEsperadaMes: +(gasto * -retorno).toFixed(2),
  };
};

// Compara planos para o mesmo orçamento com diferentes tamanhos de aposta.
export const compareBudgetPlans = (
  orcamento: number,
  dezenasList: number[] = [15, 16, 17, 18],
  base = 3.5,
): BudgetPlan[] => dezenasList.filter((k) => ticketCost(k, base) <= orcamento).map((k) => simulateBudget(orcamento, k, base));
