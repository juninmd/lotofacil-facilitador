import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { loadHistory } from './loadHistory.bench';
import { analyzeTransitions } from './transitionAnalysis';
import { generateOptimizedGame } from './optimizedGenerator';
import { generateFromPatterns } from './walkForwardBacktest';
import { mineHistory } from './patternMining';

// Bench: análise de transição (anterior->próximo) + walk-forward comparando o
// gerador OTIMIZADO (todos os padrões) com o baseline e o aleatório.
// Fora do CI. Rode: npx vitest run --config vitest.backtest.config.ts optimized

const mkRng = (seed: number) => {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
};
const hits = (pick: number[], draw: number[]) => pick.filter((n) => draw.includes(n)).length;
const stat = (arr: number[]) => {
  const n = arr.length || 1;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const se = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n / n);
  return {
    media: +mean.toFixed(3),
    ic95: `${(mean - 1.96 * se).toFixed(2)}–${(mean + 1.96 * se).toFixed(2)}`,
    pctAcima9: +((arr.filter((h) => h >= 9).length / n) * 100).toFixed(1),
    faixa14: arr.filter((h) => h >= 14).length,
    faixa15: arr.filter((h) => h >= 15).length,
  };
};

describe('optimized (dados reais)', () => {
  it('transição anterior→próximo + walk-forward do gerador otimizado', async () => {
    const HISTORY = await loadHistory();
    if (HISTORY.length < 300) { console.warn(`Pulado: ${HISTORY.length}`); return; }

    const tr = analyzeTransitions(HISTORY);
    console.log(`\n=== TRANSIÇÃO anterior→próximo (${HISTORY.length} concursos) ===`);
    console.log(`Autocorrelação da soma: ${tr.autocorrelacaoSoma} (0 = sem memória)`);
    console.log(`Vizinhos (±1) saem no próximo: ${(tr.vizinho.taxaVizinho * 100).toFixed(1)}% (base ${tr.vizinho.base * 100}%)`);
    console.log(`Repetem no próximo — quentes: ${(tr.repeticaoPorFreq.quentesRepetem * 100).toFixed(1)}% | frias: ${(tr.repeticaoPorFreq.friasRepetem * 100).toFixed(1)}%`);

    const rnd = mkRng(20240719);
    const opt: number[] = [], base: number[] = [], rand: number[] = [];
    const T = 300;
    const limit = Math.min(T, HISTORY.length - 100);
    for (let i = 0; i < limit; i++) {
      const target = HISTORY[i].listaDezenas;
      const train = HISTORY.slice(i + 1);
      opt.push(hits(generateOptimizedGame(train, 15, rnd), target));
      base.push(hits(generateFromPatterns(mineHistory(train), train[0]?.listaDezenas, 15, rnd), target));
      rand.push(hits([...Array(25)].map((_, k) => k + 1).sort(() => rnd() - 0.5).slice(0, 15), target));
    }

    const rows = { 'Otimizado (todos padrões)': stat(opt), 'Baseline padrões': stat(base), 'Aleatório': stat(rand) };
    console.log(`\n=== WALK-FORWARD (${limit} concursos) ===`);
    console.table(rows);
    console.log('Cada dezena tem 60% de chance/concurso → ~9 acertos é o piso natural de qualquer bom jogo.');

    writeFileSync('optimized-report.json', JSON.stringify({ concursos: HISTORY.length, transicao: tr, walkForward: rows }, null, 2));

    // Honestidade: o otimizado nao supera materialmente o baseline/aleatorio.
    expect(stat(opt).media).toBeLessThan(10.5);
    expect(Math.abs(tr.autocorrelacaoSoma)).toBeLessThan(0.15);
  });
});
