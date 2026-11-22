import { it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadHistory } from '../loadHistory.bench';
import { runBenchmark } from './benchmark';
import { appContenders, candidateContenders } from './contenders';
import { toMarkdown, type WeeklyReport } from './report';

// Benchmark SEMANAL (fora do CI). Rode:
//   npx vitest run --config vitest.backtest.config.ts src/utils/weekly
// Gera docs/benchmarks/latest.json e docs/benchmarks/<data>.md.
// Leia docs/LEARNINGS.md antes e registre lá o que aprendeu depois.

const SHORT_TARGETS = Number(process.env.BENCH_SHORT ?? 300);
const LONG_FROM = Number(process.env.BENCH_LONG_FROM ?? 2001);

it('benchmark semanal de todos os geradores', async () => {
  const history = await loadHistory();
  const longTargets = history.filter((g) => g.numero >= LONG_FROM).length;
  const report: WeeklyReport = {
    date: new Date().toISOString().slice(0, 10),
    lastContest: history[0].numero,
    shortRun: await runBenchmark(history, appContenders(SHORT_TARGETS)),
    longRun: await runBenchmark(history, candidateContenders(longTargets)),
  };
  mkdirSync('docs/benchmarks', { recursive: true });
  writeFileSync('docs/benchmarks/latest.json', JSON.stringify(report, null, 2));
  writeFileSync(`docs/benchmarks/${report.date}.md`, toMarkdown(report));
  console.log(toMarkdown(report));
  expect(report.shortRun.length).toBeGreaterThan(10);
}, 3_600_000);
