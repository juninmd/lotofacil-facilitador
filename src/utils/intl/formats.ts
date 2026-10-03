import type { Draws, Format } from './lottery';

// Loterias públicas com histórico aberto (NY Open Data) e o formato ATUAL de
// cada uma. `from` evita misturar eras com universos diferentes.
export interface Source extends Format { name: string; url: string; from?: string }

const ny = (id: string) => `https://data.ny.gov/api/views/${id}/rows.csv?accessType=DOWNLOAD`;
export const SOURCES: Source[] = [
  { id: 'powerball', name: 'Powerball (5/69)', n: 69, k: 5, from: '2015-10-07', url: ny('d6yy-54nr') },
  { id: 'megamillions', name: 'Mega Millions (5/70)', n: 70, k: 5, from: '2017-10-28', url: ny('5xaw-6ayf') },
  { id: 'nylotto', name: 'NY Lotto (6/59)', n: 59, k: 6, url: ny('6nbc-h7bj') },
  { id: 'take5', name: 'Take 5 (5/39)', n: 39, k: 5, url: ny('dg63-4siq') },
  { id: 'cash4life', name: 'Cash4Life (5/60)', n: 60, k: 5, from: '2018-02-21', url: ny('kwxv-fwze') },
];

const splitCsv = (line: string): string[] => {
  const out: string[] = []; let cur = ''; let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

const toDate = (s: string): number => {
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return Date.UTC(+us[3], +us[1] - 1, +us[2]);
  const iso = Date.parse(s);
  return Number.isNaN(iso) ? NaN : iso;
};

/**
 * Lê CSV com uma coluna de data e colunas "...Winning Numbers" (números separados por espaço).
 * Pega os `k` primeiros (ignora bola extra), descarta sorteios com número fora de 1..n
 * ou anteriores a `from`; devolve do mais antigo ao mais novo.
 */
export const parseCsvDraws = (csv: string, f: Format, from?: string): Draws => {
  const [head, ...rows] = csv.split(/\r?\n/).filter((l) => l.trim());
  const cols = splitCsv(head);
  const numCols = cols.map((c, i) => (/winning numbers/i.test(c) ? i : -1)).filter((i) => i >= 0);
  const dateCol = Math.max(0, cols.findIndex((c) => /date/i.test(c)));
  const min = from ? Date.parse(from) : -Infinity;
  const out: { t: number; d: number[] }[] = [];
  for (const r of rows) {
    const cells = splitCsv(r); const t = toDate(cells[dateCol] ?? '');
    if (Number.isNaN(t) || t < min) continue;
    for (const ci of numCols.length ? numCols : [1]) {
      const nums = (cells[ci] ?? '').match(/\d+/g)?.map(Number) ?? [];
      if (nums.length < f.k) continue;
      const d = nums.slice(0, f.k);
      if (d.every((x) => x >= 1 && x <= f.n) && new Set(d).size === f.k) out.push({ t, d: d.sort((a, b) => a - b) });
    }
  }
  return out.sort((a, b) => a.t - b.t).map((x) => x.d);
};
