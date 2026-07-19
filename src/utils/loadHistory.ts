import { existsSync, readFileSync } from 'node:fs';
import type { LotofacilResult } from '../game';
import { getLatestGames } from '../game';

// Loader usado pelos benches (ambiente Node). Prioriza o histórico COMPLETO
// versionado em src/data/lotofacil-history.json (evita bater na API a cada run);
// se o arquivo não existir, cai para a API ao vivo.
// Atualize os dados com: node scripts/fetch_history.mjs
const DATA = 'src/data/lotofacil-history.json';

export const loadHistory = async (fallbackCount = 300): Promise<LotofacilResult[]> => {
  if (existsSync(DATA)) {
    const games = JSON.parse(readFileSync(DATA, 'utf8')) as LotofacilResult[];
    return games.sort((a, b) => b.numero - a.numero); // mais novo primeiro
  }
  return getLatestGames(fallbackCount);
};
