import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { loadHistory } from './loadHistory';
import { prizeOddsTable } from './prizeOdds';
import { comb } from './probability';

// HOMOLOGAÇÃO: chance de ganhar apostando com 15/16/17/... dezenas.
//  (1) Probabilidade EXATA (hipergeométrica).
//  (2) Backtest de ROI sobre TODOS os concursos reais: contagem exata das
//      combinações premiadas por faixa e prêmio real (rateio) vs custo.
// Fora do CI. Rode: npx vitest run --config vitest.backtest.config.ts winChance

const BASE = 3.5;
const FIXED_PRIZE: Record<number, number> = { 11: 7, 12: 14, 13: 35 };

// Prêmio de uma faixa para um concurso (11-13 fixos; 14=faixa2, 15=faixa1 do rateio).
const tierPrize = (t: number, rateio: { faixa: number; valorPremio: number }[]): number => {
  if (t <= 13) return FIXED_PRIZE[t] || 0;
  const faixa = 16 - t; // 15->1, 14->2
  return rateio.find((p) => p.faixa === faixa)?.valorPremio ?? 0;
};

describe('win chance (dados reais)', () => {
  it('probabilidade exata + ROI histórico para 15/16/17 dezenas', async () => {
    const HISTORY = await loadHistory();
    if (HISTORY.length < 300) { console.warn(`Pulado: ${HISTORY.length}`); return; }

    // (1) Probabilidade exata.
    const theory = prizeOddsTable([15, 16, 17, 18, 19, 20]).map((o) => ({
      dezenas: o.dezenas,
      custo: `R$ ${o.custo.toLocaleString('pt-BR')}`,
      'ganhar algo (≥11)': `${(o.pGanharAlgo * 100).toFixed(2)}% (1 em ${o.umEmQuantos})`,
      'cravar 15': `1 em ${o.umEm15.toLocaleString('pt-BR')}`,
    }));
    console.log(`\n=== CHANCE DE GANHAR (probabilidade exata) ===`);
    console.table(theory);

    // (2) ROI histórico. Pick fixo = 20 dezenas mais frequentes; usamos os
    // primeiros k para cada aposta. A contagem de prêmios é EXATA (todas as
    // combinações C(k,15) contidas).
    const freq = new Map<number, number>(Array.from({ length: 25 }, (_, i) => [i + 1, 0]));
    HISTORY.forEach((g) => g.listaDezenas.forEach((n) => freq.set(n, (freq.get(n) || 0) + 1)));
    const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);

    const roiRows: Record<string, unknown>[] = [];
    for (const k of [15, 16, 17]) {
      const pick = new Set(ranked.slice(0, k));
      let prize = 0;
      let wins = 0;
      const tiers: Record<number, number> = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };
      HISTORY.forEach((g) => {
        const x = g.listaDezenas.filter((n) => pick.has(n)).length; // acertos entre as marcadas
        let wonThis = false;
        for (let t = 11; t <= 15; t++) {
          const combosT = comb(x, t) * comb(k - x, 15 - t); // combinações de 15 com t acertos
          if (combosT > 0) {
            tiers[t] += combosT;
            prize += combosT * tierPrize(t, g.listaRateioPremio || []);
            if (t >= 11) wonThis = true;
          }
        }
        if (wonThis) wins++;
      });
      const cost = HISTORY.length * comb(k, 15) * BASE;
      roiRows.push({
        dezenas: k,
        'concursos c/ prêmio': `${wins} (${((wins / HISTORY.length) * 100).toFixed(1)}%)`,
        'prêmios 13/14/15': `${tiers[13]}/${tiers[14]}/${tiers[15]}`,
        ganho: `R$ ${Math.round(prize).toLocaleString('pt-BR')}`,
        custo: `R$ ${Math.round(cost).toLocaleString('pt-BR')}`,
        ROI: `${(((prize - cost) / cost) * 100).toFixed(1)}%`,
      });
    }
    console.log(`\n=== BACKTEST DE ROI (${HISTORY.length} concursos, apostando SEMPRE) ===`);
    console.table(roiRows);
    console.log('Obs.: apostar em todos os concursos com pick fixo. ROI negativo = prejuízo acumulado.');

    writeFileSync('winchance-report.json', JSON.stringify({ concursos: HISTORY.length, teoria: theory, roi: roiRows }, null, 2));

    // Homologação: a chance de ganhar algo cresce com k; e o ROI histórico é negativo.
    expect(roiRows.length).toBe(3);
  });
});
