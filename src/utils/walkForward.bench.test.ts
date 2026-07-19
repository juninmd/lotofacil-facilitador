import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { loadHistory } from './loadHistory.bench';
import { mineHistory, FEATURE_KEYS } from './patternMining';
import { walkForwardBacktest, generateFromPatterns } from './walkForwardBacktest';
import { scanEdges } from './edgeScan';
import { analyzeRepetition, analyzeOverdue, analyzeAutocorrelation } from './repetitionAnalysis';

// PRNG determinístico para a demonstração de 1 passo.
const mkRng = (seed: number) => {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff);
};

// BENCH walk-forward com dados REAIS: treina desde o concurso mais antigo baixado
// e re-treina a cada alvo. Mostra, sem inflar, se re-treinar traz vantagem.
// Fora do CI. Rode: npm run test:backtest

describe('walk-forward (dados reais)', () => {
  it(
    'compara dinâmico vs estático vs aleatório e minera padrões',
    async () => {
      // Fonte: histórico COMPLETO versionado (desde o concurso 1). Atualize
      // com `node scripts/fetch_history.mjs`. Fallback: API ao vivo.
      const HISTORY = await loadHistory();
      if (HISTORY.length < 200) {
        console.warn(`Pulado: só ${HISTORY.length} concursos.`);
        return;
      }
      console.log(`Dados: ${HISTORY.length} concursos (nº ${HISTORY[HISTORY.length - 1].numero}–${HISTORY[0].numero}).`);

      // 1) Padrões minerados de todo o histórico baixado (desde o mais antigo).
      const patterns = mineHistory(HISTORY);
      const rows = FEATURE_KEYS.map((k) => {
        const s = patterns.features[k];
        return { feature: k, min: s.min, max: s.max, media: +s.mean.toFixed(2), p01: s.p01, p99: s.p99 };
      });
      console.log(`\n=== PADRÕES minerados de ${HISTORY.length} concursos (nº ${HISTORY[HISTORY.length - 1].numero}–${HISTORY[0].numero}) ===`);
      console.table(rows);

      // Frequência: dezenas mais e menos sorteadas.
      const freq = [...patterns.numberFrequency.entries()].sort((a, b) => b[1] - a[1]);
      console.log('Top 5 quentes:', freq.slice(0, 5).map(([n, c]) => `${n}(${c}x)`).join(' '));
      console.log('Top 5 frias :', freq.slice(-5).map(([n, c]) => `${n}(${c}x)`).join(' '));

      // 1b) Exemplo pedido: treina até o penúltimo concurso e tenta prever o último.
      const target = HISTORY[0];
      const trainUpToPrev = HISTORY.slice(1); // tudo ATÉ o concurso anterior
      const pick = generateFromPatterns(mineHistory(trainUpToPrev), trainUpToPrev[0].listaDezenas, 15, mkRng(3738));
      const hitsLatest = pick.filter((n) => target.listaDezenas.includes(n)).length;
      console.log(`\n=== EXEMPLO: treino até o concurso ${trainUpToPrev[0].numero} → previsão do ${target.numero} ===`);
      console.log(`Palpite : [${pick.join(', ')}]`);
      console.log(`Sorteado: [${target.listaDezenas.join(', ')}]`);
      console.log(`ACERTOS : ${hitsLatest} / 15`);

      // 2) Walk-forward: cada alvo treina em TODO o histórico anterior.
      const targets = 150;
      const r = walkForwardBacktest(HISTORY, targets, 15);
      console.log(`\n=== WALK-FORWARD (${r.dynamic.targets} concursos, treino expansível) ===`);
      console.table({
        'Dinâmico (re-treina)': r.dynamic,
        'Estático (fixo)': r.static,
        'Aleatório': r.random,
      });
      console.log('Esperança teórica: 9.000 acertos/jogo (marcando 15).');

      // 3) Varredura EXAUSTIVA de edges (quente/frio/atrasado/markov/soma/...)
      //    com intervalo de confiança 95%.
      const edges = scanEdges(HISTORY, 500, 15);
      console.log(`\n=== EDGE SCAN (500 concursos, IC 95%) — média de acertos por estratégia ===`);
      console.table(edges.map((e) => ({ estrategia: e.nome, media: e.media, ic95: `${e.ic95[0]}–${e.ic95[1]}`, faixa14: e.faixa14, faixa15: e.faixa15 })));

      // 4) Análises críticas de repetição/dependência.
      const rep = analyzeRepetition(HISTORY);
      const overdue = analyzeOverdue(HISTORY, 12);
      const auto = analyzeAutocorrelation(HISTORY);
      console.log('\n=== REPETIÇÃO / DEPENDÊNCIA ===');
      console.log(`Sorteios exatos repetidos em ${rep.concursos} concursos: ${rep.sorteiosExatosRepetidos}`);
      console.log(`Dezenas que repetem no próximo: média ${rep.repeticaoConsecutiva.media}/15 (taxa ${(rep.taxaRepeticaoObservada * 100).toFixed(1)}% vs esperado ${(rep.taxaEsperada * 100).toFixed(0)}%)`);
      console.log(`Autocorrelação — P(sair | saiu agora)=${(auto.dado * 100).toFixed(1)}% vs P(sair | não saiu)=${(auto.naoDado * 100).toFixed(1)}% (esperado ~60% se independente)`);
      console.log('Falácia do "atrasado" — taxa de saída por atraso (esperado ~60% para todos):');
      console.table(overdue.map((b) => ({ atraso: b.atraso, amostras: b.amostras, taxaSaida: `${(b.taxaSaida * 100).toFixed(1)}%` })));

      writeFileSync(
        'walkforward-report.json',
        JSON.stringify({ concursos: HISTORY.length, ultimo: HISTORY[0].numero, padroes: rows, freqQuentes: freq.slice(0, 8), walkForward: r, edges, repeticao: rep, atrasado: overdue, autocorrelacao: auto }, null, 2),
      );
      console.log('\nRelatório salvo em walkforward-report.json');

      // Homologação honesta: nenhuma abordagem foge da faixa da esperança 9.0.
      for (const s of [r.dynamic, r.static, r.random]) {
        expect(s.avgHits).toBeGreaterThan(7);
        expect(s.avgHits).toBeLessThan(11);
      }
      // Nenhuma estratégia da varredura deve superar materialmente ~9.0.
      for (const e of edges) expect(e.media).toBeLessThan(10);
    },
    600_000,
  );
});
