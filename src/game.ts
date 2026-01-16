export interface LotofacilResult {
  numero: number;
  listaDezenas: number[];
  dataApuracao: string;
  // Adicione outros campos relevantes se necessário
}

const apiCache = new Map<string, Promise<LotofacilResult | null>>();

export const getGame = async (gameNumber?: number): Promise<LotofacilResult | null> => {
  const cacheKey = gameNumber ? gameNumber.toString() : 'latest';

  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey)!;
  }

  const promise = (async () => {
    try {
      const url = gameNumber
        ? `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${gameNumber}`
        : 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/';

      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Erro na requisição: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: unknown = await response.json();

      if (
        data &&
        typeof data === 'object' &&
        'listaDezenas' in data &&
        Array.isArray((data as { listaDezenas: unknown[] }).listaDezenas)
      ) {
        const result = data as LotofacilResult;
        // Ensure dezenas are numbers
        result.listaDezenas = result.listaDezenas.map((d: string | number) => Number(d));

        // If we fetched the latest game, cache it by its number as well
        if (!gameNumber && result.numero) {
          apiCache.set(result.numero.toString(), Promise.resolve(result));
        }

        return result;
      } else {
        console.warn('Resposta da API não contém listaDezenas ou não é um array:', data);
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar dados do jogo:', error);
      return null;
    }
  })();

  apiCache.set(cacheKey, promise);

  const result = await promise;
  if (result === null) {
    apiCache.delete(cacheKey);
  }

  return result;
};

export const getLatestGames = async (count: number, providedLatestGame?: LotofacilResult | null): Promise<LotofacilResult[]> => {
  const games: LotofacilResult[] = [];
  const latestGame = providedLatestGame || await getGame(); // Get the very latest game if not provided

  if (!latestGame) {
    console.error('Não foi possível obter o último sorteio.');
    return [];
  }

  games.push(latestGame);

  // Fetch previous games in parallel
  const promises: Promise<LotofacilResult | null>[] = [];
  for (let i = 1; i < count; i++) {
    const previousGameNumber = latestGame.numero - i;
    if (previousGameNumber > 0) {
      promises.push(getGame(previousGameNumber));
    }
  }

  const results = await Promise.all(promises);
  results.forEach(game => {
    if (game) {
      games.push(game);
    }
  });

  return games.sort((a, b) => b.numero - a.numero); // Sort by game number descending
};

export const getMostFrequentNumbers = (games: LotofacilResult[]): { number: number; count: number }[] => {
  const frequencyMap = new Map<number, number>();

  games.forEach(game => {
    game.listaDezenas.forEach(number => {
      frequencyMap.set(number, (frequencyMap.get(number) || 0) + 1);
    });
  });

  const sortedNumbers = Array.from(frequencyMap.entries())
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number); // Sort by count descending, then by number ascending

  return sortedNumbers;
};
