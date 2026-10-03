// Baixa históricos públicos (NY Open Data) para data/intl/*.csv.
// Uso: node scripts/fetch_intl.mjs   (requer acesso a data.ny.gov)
import { mkdirSync, writeFileSync } from 'node:fs';

const ny = (id) => `https://data.ny.gov/api/views/${id}/rows.csv?accessType=DOWNLOAD`;
const SOURCES = { powerball: ny('d6yy-54nr'), megamillions: ny('5xaw-6ayf'), nylotto: ny('6nbc-h7bj'), take5: ny('dg63-4siq'), cash4life: ny('kwxv-fwze') };
mkdirSync('data/intl', { recursive: true });
for (const [id, url] of Object.entries(SOURCES)) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    writeFileSync(`data/intl/${id}.csv`, text);
    console.log(`${id}: ${text.split('\n').length - 1} linhas`);
  } catch (e) {
    console.error(`${id}: falhou (${e.message})`);
  }
}
