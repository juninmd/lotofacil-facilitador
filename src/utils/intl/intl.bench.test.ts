import { it } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { analyze, vpeProbs, vpeWalkForward } from './lottery';
import { SOURCES, parseCsvDraws } from './formats';

// Roda a perícia em cada CSV de data/intl/ (baixe com `node scripts/fetch_intl.mjs`)
// e gera docs/INTERNACIONAL.md. Sem CSVs, não faz nada.
it('perícia internacional', () => {
  const f = (x: number, d = 3) => x.toFixed(d).replace('.', ',');
  let md = '# Perícia em loterias internacionais\n\nMesmo método da Lotofácil (docs/FORENSE.md), sem usar nenhum dado brasileiro: p-valores Monte Carlo contra o mundo uniforme do mesmo formato e tamanho (300 mundos).\n\n';
  let any = false;
  for (const s of SOURCES) {
    const file = `data/intl/${s.id}.csv`;
    if (!existsSync(file)) continue;
    const d = parseCsvDraws(readFileSync(file, 'utf8'), s, s.from);
    if (d.length < 300) continue;
    any = true;
    const res = analyze(d, s, 300, 11);
    const wf = vpeWalkForward(d, s, Math.floor(d.length / 2));
    const v = vpeProbs(d, s);
    md += `## ${s.name} — ${d.length} sorteios\n\n| Teste | Estatística | p (MC) |\n|---|---:|---:|\n`;
    res.forEach((r) => { md += `| ${r.id} | ${f(r.obs, 2)} | ${f(r.p, 4)} |\n`; });
    md += `\nViés estimado (σ): ${f(v.sigma * 100, 2)} pp; encolhimento ${f(v.shrink, 2)}. VPE walk-forward (2ª metade, ${wf.n} sorteios): z=${f(wf.z, 2)}, acertos ${f(wf.hits, 4)} vs ${f(wf.expected, 4)} esperado.\n\n`;
  }
  if (any) writeFileSync('docs/INTERNACIONAL.md', md); else console.log('sem CSVs em data/intl — rode: node scripts/fetch_intl.mjs');
}, 900000);
