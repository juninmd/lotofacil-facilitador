import { probExactHits, probAtLeast, combosContained, ticketCost } from './probability';

// Chance EXATA de ganhar por tamanho de aposta (15..20 dezenas), via distribuição
// hipergeométrica. "Ganhar algo" = acertar >= 11 dezenas em alguma combinação
// contida na aposta (a Lotofácil premia 11, 12, 13, 14 e 15 acertos).
//
// Marcar mais dezenas aumenta a chance — ao custo de mais combinações (mais caro).

export interface PrizeOdds {
  dezenas: number;
  combinacoes: number; // apostas simples contidas = C(k,15)
  custo: number; // R$
  pGanharAlgo: number; // P(>=11 acertos)
  umEmQuantos: number; // 1 em N para ganhar algo
  p11: number;
  p12: number;
  p13: number;
  p14: number;
  p15: number;
  umEm15: number; // 1 em N para cravar as 15
}

export const prizeOdds = (dezenas: number, base = 3.5): PrizeOdds => {
  const pAlgo = probAtLeast(dezenas, 11);
  const p15 = probExactHits(dezenas, 15);
  return {
    dezenas,
    combinacoes: combosContained(dezenas),
    custo: +ticketCost(dezenas, base).toFixed(2),
    pGanharAlgo: pAlgo,
    umEmQuantos: pAlgo > 0 ? Math.round(1 / pAlgo) : Infinity,
    p11: probExactHits(dezenas, 11),
    p12: probExactHits(dezenas, 12),
    p13: probExactHits(dezenas, 13),
    p14: probExactHits(dezenas, 14),
    p15,
    umEm15: p15 > 0 ? Math.round(1 / p15) : Infinity,
  };
};

export const prizeOddsTable = (dezenasList: number[] = [15, 16, 17, 18, 19, 20], base = 3.5): PrizeOdds[] =>
  dezenasList.map((k) => prizeOdds(k, base));
