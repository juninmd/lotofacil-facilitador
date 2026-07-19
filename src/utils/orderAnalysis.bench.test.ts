import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { loadHistory } from './loadHistory';
import {
  oddEvenDistribution,
  firstDrawnStats,
  parityByPosition,
  positionHeatmap,
  extremesDistribution,
} from './orderAnalysis';

// Análises criativas de ordem/paridade sobre TODO o histórico. Fora do CI.
// Rode: npx vitest run --config vitest.backtest.config.ts orderAnalysis

describe('order analysis (dados reais)', () => {
  it('paridade, primeira bola (heatmap) e posições', async () => {
    const HISTORY = await loadHistory();
    if (HISTORY.length < 200) {
      console.warn(`Pulado: só ${HISTORY.length} concursos.`);
      return;
    }
    console.log(`\nAnalisando ${HISTORY.length} concursos (nº ${HISTORY[HISTORY.length - 1].numero}–${HISTORY[0].numero}).`);

    // 1) Pares/ímpares.
    const oe = oddEvenDistribution(HISTORY);
    console.log(`\n=== PARES/ÍMPARES ===`);
    console.log(`Média de ímpares: ${oe.media}/15 | jogos "balanceados" (7-8 ímpares): ${oe.pctParImparBalanceado}%`);
    console.table(oe.histograma);

    // 2) Primeira bola sorteada (mapa de calor + uniformidade).
    const fd = firstDrawnStats(HISTORY);
    console.log(`\n=== PRIMEIRA BOLA (ordem de sorteio) ===`);
    console.log(`Começa com ÍMPAR: ${fd.pctImpar}% (esperado ${fd.esperadoImpar}% se uniforme)`);
    console.log(`Qui-quadrado uniformidade: ${fd.chiQuadrado} (crítico 5% = ${fd.uniformeCritico5pct} → ${fd.chiQuadrado > fd.uniformeCritico5pct ? 'NÃO uniforme' : 'uniforme'})`);
    console.log('Top 5 dezenas que mais saíram PRIMEIRO:', fd.heatmap.slice(0, 5).map((h) => `${h.numero}(${h.pct}%)`).join(' '));
    console.log('Top 5 que menos saíram primeiro:', fd.heatmap.slice(-5).map((h) => `${h.numero}(${h.pct}%)`).join(' '));

    // 3) Paridade por posição do sorteio.
    const pp = parityByPosition(HISTORY);
    console.log(`\n=== % ÍMPAR POR POSIÇÃO DO SORTEIO (esperado ~52%) ===`);
    console.table(pp);

    // 4) Extremos.
    const ex = extremesDistribution(HISTORY);
    console.log(`\n=== EXTREMOS ===`);
    console.log('Menor dezena mais comum:', ex.menorMaisComum.map((e) => `${e.numero}(${e.vezes}x)`).join(' '));
    console.log('Maior dezena mais comum:', ex.maiorMaisComum.map((e) => `${e.numero}(${e.vezes}x)`).join(' '));

    const heatmap = positionHeatmap(HISTORY);
    writeFileSync(
      'order-report.json',
      JSON.stringify({ concursos: HISTORY.length, paridade: oe, primeiraBola: fd, paridadePorPosicao: pp, extremos: ex, heatmap }, null, 2),
    );
    console.log('\nRelatório salvo em order-report.json');

    // Homologação: a 1ª bola deve ser ~uniforme (sem viés forte de paridade).
    expect(Math.abs(fd.pctImpar - fd.esperadoImpar)).toBeLessThan(6);
    expect(oe.media).toBeGreaterThan(7);
    expect(oe.media).toBeLessThan(8.5);
  });
});
