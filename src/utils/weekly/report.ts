import type { ContenderResult } from './benchmark';

// Relatório em Markdown do benchmark semanal (vai para docs/benchmarks/).

const fmt = (n: number, d = 3) => n.toFixed(d).replace('.', ',');
const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')}%`;

/** Vantagem consistente: z ≥ 2 no total e z ≥ 1 em CADA metade (só uma metade boa = sobreajuste/sorte). */
export const verdict = (r: ContenderResult): string => {
  if (r.targets < 100) return 'pouco poder';
  if (r.z >= 2 && r.zOld >= 1 && r.zNew >= 1) return '✅ vantagem consistente';
  if (r.z >= 1 && r.zOld > 0 && r.zNew > 0) return '🟡 sinal fraco';
  return '⚪ igual ao acaso';
};

export const toMarkdownTable = (rows: ContenderResult[]): string => {
  const head = '| Gerador | Alvos | Acertos/jogo | z | z antigo | z recente | P(≥11) | P(≥13) | Retorno R$/R$ | ms | Veredito |';
  const sep = '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|';
  const body = rows.map((r) =>
    `| ${r.id} | ${r.targets} | ${fmt(r.avgHits)} | ${fmt(r.z, 2)} | ${fmt(r.zOld, 2)} | ${fmt(r.zNew, 2)} | ${pct(r.p11)} | ${pct(r.p13)} | ${fmt(r.returnPerReal)} | ${r.ms} | ${verdict(r)} |`);
  return [head, sep, ...body].join('\n');
};

export interface WeeklyReport {
  date: string;
  lastContest: number;
  shortRun: ContenderResult[];
  longRun: ContenderResult[];
}

export const toMarkdown = (r: WeeklyReport): string => `# Benchmark semanal: ${r.date}

Último concurso na base: **${r.lastContest}**. Walk-forward sem lookahead; esperança de 1 jogo aleatório = 9,000 acertos
e P(≥11) ≈ 10,1%. z = (média − 9) / erro-padrão. "z antigo" e "z recente" são as duas metades dos alvos: vantagem real
precisa aparecer nas duas (z ≥ 1 em cada; senão é sorte ou sobreajuste).

## Rodada curta: todos os geradores do app (janela de 100 concursos, como no app)

${toMarkdownTable(r.shortRun)}

## Rodada longa: candidatos baratos (todos os alvos desde o concurso 2001)

${toMarkdownTable(r.longRun)}
`;
