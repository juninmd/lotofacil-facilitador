import { useState, useEffect } from 'react';
import { getGame, getLatestGames, getMostFrequentNumbers, type LotofacilResult } from './game';
import LotteryBall from './LotteryBall';
import './App.css';

function App() {
  const NUM_RECENT_GAMES = 30; // Constante para o número de sorteios recentes

  const [gameNumber, setGameNumber] = useState<string>('');
  const [gameResult, setGameResult] = useState<LotofacilResult | null>(null);
  const [latestGameResult, setLatestGameResult] = useState<LotofacilResult | null>(null);
  const [mostFrequentNumbers, setMostFrequentNumbers] = useState<{ number: number; count: number }[]>([]);
  const [suggestedGame, setSuggestedGame] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLotofacilData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch latest game
        const latest = await getGame();
        setLatestGameResult(latest);

        // Fetch last NUM_RECENT_GAMES and calculate most frequent numbers
        const lastGames = await getLatestGames(NUM_RECENT_GAMES, latest);
        if (lastGames.length > 0) {
          const frequent = getMostFrequentNumbers(lastGames);
          setMostFrequentNumbers(frequent);
        }
      } catch (err) {
        console.error("Erro ao buscar dados da Lotofácil:", err);
        setError("Não foi possível carregar os dados da Lotofácil.");
      } finally {
        setLoading(false);
      }
    };

    fetchLotofacilData();
  }, []);

  const handleSearchGame = async () => {
    setError(null);
    setGameResult(null);
    if (!/^\d+$/.test(gameNumber)) {
      setError('Número de jogo inválido. Por favor, digite apenas números.');
      return;
    }
    const game = parseInt(gameNumber);

    const result = await getGame(game);
    if (result) {
      setGameResult(result);
    } else {
      setError(`Não foi possível obter as dezenas para o jogo ${game}.`);
    }
  };

  const generateSuggestedGame = () => {
    if (mostFrequentNumbers.length === 0) {
      setError("Não há dados suficientes para gerar um jogo sugerido.");
      setSuggestedGame(null);
      return;
    }

    const suggested: number[] = [];
    const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1); // Numbers 1 to 25

    // Prioritize the most frequent numbers
    for (let i = 0; i < mostFrequentNumbers.length && suggested.length < 15; i++) {
      const num = mostFrequentNumbers[i].number;
      if (!suggested.includes(num)) {
        suggested.push(num);
      }
    }

    // Fill the rest with random numbers from the remaining pool
    const remainingNumbers = allNumbers.filter(num => !suggested.includes(num));
    while (suggested.length < 15 && remainingNumbers.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
      suggested.push(remainingNumbers[randomIndex]);
      remainingNumbers.splice(randomIndex, 1); // Remove to avoid duplicates
    }

    setSuggestedGame(suggested.sort((a, b) => a - b));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl"> {/* Increased max-w */}
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-6">Lotofácil Facilitador</h1>

        {loading && <p className="text-center text-blue-600 mb-4">Carregando dados da Lotofácil...</p>}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-center">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> {/* Changed grid layout */}
          {/* Coluna Principal - Buscar Jogo e Gerar Jogo */}
          <div className="lg:col-span-2 flex flex-col gap-6"> {/* Main content takes 2 columns on large screens */}
            {/* Área para inserção e validação de jogos */}
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Buscar Jogo</h2>
              <div className="flex flex-col gap-4">
                <label htmlFor="gameNumberInput" className="sr-only">Número do jogo</label>
                <input
                  id="gameNumberInput"
                  type="number"
                  placeholder="Digite o número do jogo (ex: 2500)"
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={gameNumber}
                  onChange={(e) => setGameNumber(e.target.value)}
                />
                <button
                  onClick={handleSearchGame}
                  className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition duration-200 focus-visible:ring-4 focus-visible:ring-blue-300"
                >
                  Buscar Jogo
                </button>
              </div>
              {gameResult && (
                <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-md" role="region" aria-label="Resultado da busca">
                  <p className="font-semibold mb-2">Dezenas do jogo {gameResult.numero} ({gameResult.dataApuracao}):</p>
                  <div className="flex flex-wrap gap-2">
                    {gameResult.listaDezenas.map((num) => (
                      <LotteryBall key={num} number={num} colorClass="bg-green-600 text-white" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Área para Gerar Jogo Sugerido */}
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gerar Jogo Sugerido</h2>
              <p className="text-gray-600 mb-4">
                Com base nos números mais sorteados dos últimos {NUM_RECENT_GAMES} sorteios, gere um jogo com maior probabilidade.
              </p>
              <button
                onClick={generateSuggestedGame}
                className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition duration-200"
                disabled={loading || mostFrequentNumbers.length === 0}
              >
                Gerar Jogo
              </button>
              {suggestedGame && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md" role="region" aria-label="Jogo sugerido">
                  <p className="font-semibold mb-2">Seu jogo sugerido:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedGame.map((num) => (
                      <LotteryBall key={num} number={num} colorClass="bg-purple-600 text-white" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side Bar Right - Estatísticas */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-md lg:col-span-1"> {/* Side bar takes 1 column */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Estatísticas da Lotofácil</h2>

            {latestGameResult && (
              <div className="mb-6 p-3 bg-blue-100 border border-blue-300 text-blue-800 rounded-md" role="region" aria-label="Último sorteio">
                <h3 className="text-xl font-semibold mb-2">Último Sorteio: {latestGameResult.numero}</h3>
                <p className="text-lg mb-2">Data: {latestGameResult.dataApuracao}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {latestGameResult.listaDezenas.map((num) => (
                    <LotteryBall key={num} number={num} colorClass="bg-blue-600 text-white" sizeClass="w-8 h-8 text-sm" />
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-xl font-semibold text-gray-800 mb-4">Números Mais Sorteados (Últimos {NUM_RECENT_GAMES} Sorteios)</h3>
            {mostFrequentNumbers.length > 0 ? (
              <ul className="list-disc list-inside text-gray-700">
                {mostFrequentNumbers.map((item, index) => (
                  <li key={index} className="mb-1">
                    <span className="font-semibold">{item.number}</span>: {item.count} vezes
                  </li>
                ))}
              </ul>
            ) : (
              !loading && <p className="text-gray-600">Nenhum dado disponível para os números mais sorteados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
