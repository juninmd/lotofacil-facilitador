export interface LotofacilPremio {
  faixa: number;
  numeroDeGanhadores: number;
  valorPremio: number;
  descricaoFaixa: string;
}

export interface LotofacilResult {
  numero: number;
  listaDezenas: number[];
  dataApuracao: string;
  listaRateioPremio: LotofacilPremio[];
}

const gameCache = new Map<number, Promise<LotofacilResult | null>>();

export const getGame = async (gameNumber?: number): Promise<LotofacilResult | null> => {
  // If a specific game number is requested and it's in the cache, return the cached promise
  if (gameNumber && gameCache.has(gameNumber)) {
    return gameCache.get(gameNumber)!;
  }

  const fetchPromise = (async () => {
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

        // If we fetched the latest game (gameNumber undefined), cache it now that we know the number
        if (!gameNumber && result.numero) {
           gameCache.set(result.numero, Promise.resolve(result));
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

  // Cache the promise if a specific game number was requested
  if (gameNumber) {
    gameCache.set(gameNumber, fetchPromise);
  }

  // Wait for the result
  const result = await fetchPromise;

  // If the result is null (error), remove from cache so it can be retried
  if (result === null && gameNumber) {
    gameCache.delete(gameNumber);
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
