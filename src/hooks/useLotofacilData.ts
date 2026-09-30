import { useEffect, useMemo, useState } from 'react';
import { getGame, getLatestGames, getMostFrequentNumbers, type LotofacilResult } from '../game';
import { calculateDelays, getCycleMissingNumbers } from '../utils/statistics';

export const NUM_RECENT_GAMES = 100;

// Carrega o histórico recente e deriva as estatísticas exibidas no painel.
export const useLotofacilData = () => {
  const [games, setGames] = useState<LotofacilResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const latest = await getGame();
        if (!latest) throw new Error('sem dados');
        const all = await getLatestGames(NUM_RECENT_GAMES, latest);
        if (alive) setGames(all);
      } catch (e) {
        console.error('Erro ao buscar dados da Lotofácil:', e);
        if (alive) setError('Não foi possível carregar os dados da Lotofácil.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const derived = useMemo(() => {
    const frequency = getMostFrequentNumbers(games);
    const delays = [...calculateDelays(games).entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([number, count]) => ({ number, count }));
    // Concursos seguidos (mais recentes) sem ganhador de 15 acertos = jackpot acumulado.
    let accumulated = 0;
    for (const g of games) {
      if (g.listaRateioPremio?.[0]?.numeroDeGanhadores !== 0) break;
      accumulated++;
    }
    return { frequency, delays, missingInCycle: getCycleMissingNumbers(games), accumulated };
  }, [games]);

  return { games, latest: games[0] ?? null, loading, error, ...derived };
};
