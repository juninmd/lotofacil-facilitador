import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { runBattery } from './battery';

// Gera o núcleo de docs/FORENSE.md (tabela da bateria). Demora ~5 min.
it('bateria forense completa', () => {
  const hist = JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[];
  const res = runBattery(hist, 1000, 200);
  const f = (x: number, d = 3) => x.toFixed(d).replace('.', ',');
  let md = `| Teste | Estatística | p (Monte Carlo) | p Bonferroni |\n|---|---:|---:|---:|\n`;
  res.forEach((r) => { md += `| ${r.id} | ${f(r.obs, 2)} | ${f(r.p, 4)} (${r.sims} mundos) | ${f(r.pBonf, 3)} |\n`; });
  writeFileSync('/tmp/battery-table.md', md);
  writeFileSync('/tmp/battery.json', JSON.stringify(res));
}, 900000);
