export interface LotofacilResult {
  numero: number;
  listaDezenas: number[];
  dataApuracao: string;
  // Adicione outros campos relevantes se necessário
}

export const getGame = async (gameNumber?: number): Promise<LotofacilResult | null> => {
  try {
    const url = gameNumber
      ? `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${gameNumber}`
      : 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/';

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Erro na requisição: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: LotofacilResult = await response.json();

    if (data && data.listaDezenas && Array.isArray(data.listaDezenas)) {
      return data;
    } else {
      console.warn('Resposta da API não contém listaDezenas ou não é um array:', data);
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar dados do jogo:', error);
    return null;
  }
};

export const getLatestGames = async (count: number): Promise<LotofacilResult[]> => {
  const games: LotofacilResult[] = [];
  let latestGame = await getGame(); // Get the very latest game

  if (!latestGame) {
    console.error('Não foi possível obter o último sorteio.');
    return [];
  }

  games.push(latestGame);

  let currentNumber = latestGame.numero;

  // Fetch previous games
  for (let i = 1; i < count; i++) {
    currentNumber--;
    const game = await getGame(currentNumber);
    if (game) {
      games.push(game);
    } else {
      console.warn(`Não foi possível obter o sorteio número ${currentNumber}.`);
      // Stop if we can't get a previous game, to avoid infinite loops on missing data
      break;
    }
  }

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
