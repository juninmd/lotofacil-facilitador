import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import type { LotofacilResult } from '../../game';
import { buildContext } from './context';
import './catalog2';
import { FORMULAS } from './catalog';
import { holm, runAll } from './harness';
import { PORTFOLIO_METHODS, meanCrowd } from '../mc/portfolioFormulas';
import { buildCrowdContext } from '../mc/plan';
import { makeDraws, mulberry32 } from '../mc/rng';
import { evaluatePortfolio } from '../mc/simulate';
import { calibrateReturnModel, expectedReturn } from '../mc/expectedReturn';

// Gera docs/FORMULAS.md. Rodar: npx vitest run --config vitest.backtest.config.ts src/utils/formulas/report.bench.test.ts
const f2 = (x: number, d = 2) => x.toFixed(d).replace('.', ',');

it('relatório de fórmulas', () => {
  const hist = JSON.parse(readFileSync('src/data/lotofacil-history.json', 'utf8')) as LotofacilResult[];
  const ctx = buildContext(hist);
  const res = runAll(ctx, 1000);
  const adj = holm(res);
  const sig = res.filter((r) => r.p < 0.05).length;
  const byFirst = [...res].sort((a, b) => b.zFirst - a.zFirst).slice(0, 3);
  const confirm = byFirst.reduce((a, r) => a + r.zSecond, 0) / 3;
  let md = `# Laboratório de fórmulas\n\nGerado por \`report.bench.test.ts\`. ${res.length} fórmulas de escolha de dezenas testadas em **walk-forward** (cada concurso usa só o passado) de ${ctx.N - 1000} concursos reais (${ctx.N} no histórico, início no 1000º). Sob H0 os acertos têm média 9,00 e desvio 1,22.\n\n`;
  md += `**Resultado:** ${sig} de ${res.length} com p<0,05 (esperado por acaso ≈ ${f2(res.length * 0.05, 1)}); **nenhuma** sobrevive a Holm-Bonferroni (menor p ajustado = ${f2(Math.min(...adj.values()))}).\n\n`;
  md += `**Seleção fora da amostra:** as 3 melhores da 1ª metade (${byFirst.map((r) => r.id).join(', ')}) têm z médio ${f2(confirm)} na 2ª metade (esperado sob H0: 0).\n\n`;
  md += `| Fórmula | Família | Acertos (média) | z | p | p Holm | z 1ª metade | z 2ª metade |\n|---|---|---:|---:|---:|---:|---:|---:|\n`;
  [...res].sort((a, b) => b.z - a.z).forEach((r) => { md += `| ${r.label} | ${r.family} | ${f2(r.mean, 4)} | ${f2(r.z)} | ${f2(r.p, 3)} | ${f2(adj.get(r.id)!)} | ${f2(r.zFirst, 1)} | ${f2(r.zSecond, 1)} |\n`; });

  const crowd = buildCrowdContext(hist); const rm = calibrateReturnModel(hist);
  const test = makeDraws(200_000, mulberry32(555));
  md += `\n## Construção de portfólio (mesmo custo)\n\n200 mil sorteios inéditos, média de 3 sementes. REA = retorno esperado ajustado (R$ por aposta de R$ 3,50; fórmula em \`expectedReturn.ts\`).\n`;
  for (const games of [10, 16]) {
    md += `\n### ${games} jogos (R$ ${f2(games * 3.5)})\n\n| Método | P(≥11) | P(≥12) | P(≥13) | P(≥14) | Multidão | REA |\n|---|---:|---:|---:|---:|---:|---:|\n`;
    for (const m of PORTFOLIO_METHODS) {
      const a = { p11: 0, p12: 0, p13: 0, p14: 0, c: 0 };
      for (let s = 1; s <= 3; s++) {
        const pf = m.build(games, 100 + s, crowd); const e = evaluatePortfolio(pf, test);
        a.p11 += e.pAtLeast[11] / 3; a.p12 += e.pAtLeast[12] / 3; a.p13 += e.pAtLeast[13] / 3; a.p14 += e.pAtLeast[14] / 3; a.c += meanCrowd(pf, crowd) / 3;
      }
      md += `| ${m.label} | ${f2(a.p11 * 100, 1)}% | ${f2(a.p12 * 100, 1)}% | ${f2(a.p13 * 100)}% | ${f2(a.p14 * 100, 3)}% | ${f2(a.c)} | ${f2(expectedReturn(rm, a.c).perBet, 3)} |\n`;
    }
  }
  md += `\n## Retorno esperado por aposta (REA)\n\nCalibrado nos últimos 1000 concursos: pool do jackpot ≈ R$ ${Math.round(rm.pool15).toLocaleString('pt-BR')}, ${f2(rm.lambda)} co-ganhadores esperados, fator de acúmulo ${f2(rm.accumFactor)}.\n\n| Situação | Multidão | Acumulados | R$/aposta | Retorno |\n|---|---:|---:|---:|---:|\n`;
  for (const [label, c, a] of [['Jogo típico', 1, 0], ['Menos disputado', 0.78, 0], ['Típico, após 1 acúmulo', 1, 1], ['Menos disputado, após 1 acúmulo', 0.78, 1]] as [string, number, number][]) {
    const r = expectedReturn(rm, c, a);
    md += `| ${label} | ${f2(c)} | ${a} | ${f2(r.perBet, 3)} | ${f2(r.roi * 100, 1)}% |\n`;
  }
  md += `\nNenhuma situação chega a retorno positivo. ${FORMULAS.length} fórmulas + ${PORTFOLIO_METHODS.length} métodos de portfólio testados.\n`;
  writeFileSync('docs/FORMULAS.md', md);
}, 600000);
