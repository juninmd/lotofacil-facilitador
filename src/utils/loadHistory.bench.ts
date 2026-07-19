import { existsSync, readFileSync } from 'node:fs';
import type { LotofacilResult } from '../game';
import { getLatestGames } from '../game';

// Loader usado pelos benches (ambiente Node — usa node:fs). Nome *.bench.ts
// garante que fica FORA do build do app (tsconfig.app exclui *.bench.ts), evitando
// erros de "Cannot find module 'node:fs'" no Netlify.
// Prioriza o histórico COMPLETO versionado em src/data/lotofacil-history.json;
// se ausente, cai para a API ao vivo. Atualize com: node scripts/fetch_history.mjs
const DATA = 'src/data/lotofacil-history.json';

export const loadHistory = async (fallbackCount = 300): Promise<LotofacilResult[]> => {
  if (existsSync(DATA)) {
    const games = JSON.parse(readFileSync(DATA, 'utf8')) as LotofacilResult[];
    return games.sort((a, b) => b.numero - a.numero); // mais novo primeiro
  }
  return getLatestGames(fallbackCount);
};
