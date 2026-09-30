import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { buildDataset } from './dataset';
import { family, frequencyStats } from './battery';
import { oracleGain, syntheticDataset } from './synthetic';
import { predictiveLogLikGain } from '../bias/evaluate';
import { walkForwardLogit } from './ml';
import { mulberry32 } from '../mc/rng';

// Poder: injeta vieses de tamanho conhecido num mundo sintético do MESMO tamanho
// do histórico (3738 concursos) e mede se a perícia/VPE os enxerga.
it('poder da perícia', () => {
  const real = buildDataset(JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[]);
  const f = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
  let md = `| σ do viés injetado | p (freq χ²) | ganho oráculo (acertos) | VPE: z fora da amostra | VPE: acertos (top-15) |\n|---:|---:|---:|---:|---:|\n`;
  for (const delta of [0, 0.005, 0.01, 0.02, 0.04]) {
    const d = syntheticDataset(real, { kind: 'marginal', delta }, mulberry32(100 + Math.round(delta * 1000)));
    const c = new Array(25).fill(0); for (const m of d.masks) for (let n = 0; n < 25; n++) c[n] += (m >>> n) & 1;
    const p = c.map((v) => v / d.N); const mean = p.reduce((a, b) => a + b, 0) / 25;
    const sigma = Math.sqrt(Math.max(0, p.reduce((a, v) => a + (v - mean) ** 2, 0) / 25 - 0.24 / d.N));
    const pv = family(d, [frequencyStats], 300, 5).find((r) => r.id === 'freq:chi2')!.p;
    const sets = Array.from(d.masks, (m) => { const b: number[] = []; for (let n = 1; n <= 25; n++) if ((m >>> (n - 1)) & 1) b.push(n); return b; });
    const pr = predictiveLogLikGain(sets, 2000);
    md += `| ${f(Math.max(0, sigma) * 100)} pp | ${f(pv, 3)} | ${f(oracleGain(d), 3)} | ${f(pr.z)} | ${f(pr.hits, 3)} |\n`;
  }
  const ds = real; const ml = walkForwardLogit(ds, 1500, 250, 3, 0.2, 0.01);
  md += `\nModelo grande (regressão logística por dezena com lags 1-10 de todas as dezenas, frequências, atraso e dia da semana), validação temporal em ${ml.n} concursos: Δ log-loss vs frequência histórica = ${f(ml.dLogLossPerDraw, 3)} por concurso (negativo = pior), acertos ${f(ml.meanHits, 3)} (z=${f(ml.zHits)}).\n`;
  writeFileSync('/tmp/power-table.md', md);
}, 900000);
