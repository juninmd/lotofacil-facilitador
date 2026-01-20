import { useState, useEffect } from 'react';
import { getGame, getLatestGames, getMostFrequentNumbers, type LotofacilResult } from './game';
import { generateSmartGame, backtestGame, simulateBacktest, getCycleMissingNumbers, calculateDelays, type BacktestResult, type SimulationResult } from './utils/statistics';
import LotteryBall from './LotteryBall';
import GameSearchForm from './GameSearchForm';

function App() {
  const NUM_RECENT_GAMES = 100; // Constante para o número de sorteios recentes (Aumentado para melhor estatística)

  const [gameResult, setGameResult] = useState<LotofacilResult | null>(null);
  const [latestGameResult, setLatestGameResult] = useState<LotofacilResult | null>(null);
  const [mostFrequentNumbers, setMostFrequentNumbers] = useState<{ number: number; count: number }[]>([]);
  const [allFetchedGames, setAllFetchedGames] = useState<LotofacilResult[]>([]);
  const [suggestedGame, setSuggestedGame] = useState<number[] | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [missingInCycle, setMissingInCycle] = useState<number[]>([]);
  const [delays, setDelays] = useState<{number: number, count: number}[]>([]); // New State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const maxFrequency = mostFrequentNumbers.length > 0 ? mostFrequentNumbers[0].count : 1;
  const maxDelay = delays.length > 0 ? delays[0].count : 1;

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
          setAllFetchedGames(lastGames);
          const frequent = getMostFrequentNumbers(lastGames);
          setMostFrequentNumbers(frequent);

          // Calculate Missing Cycle Numbers
          const missing = getCycleMissingNumbers(lastGames);
          setMissingInCycle(missing);

          // Calculate Delays
          const delaysMap = calculateDelays(lastGames);
          const sortedDelays = Array.from(delaysMap.entries())
              .sort((a, b) => b[1] - a[1]) // High delay first
              .slice(0, 10) // Top 10
              .map(([num, count]) => ({ number: num, count }));
          setDelays(sortedDelays);
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

  const handleSearchGame = async (gameNumberInput: string) => {
    setError(null);
    setGameResult(null);
    if (!/^\d+$/.test(gameNumberInput)) {
      setError('Número de jogo inválido. Por favor, digite apenas números.');
      return;
    }
    const game = parseInt(gameNumberInput);

    setSearching(true);
    try {
      const result = await getGame(game);
      if (result) {
        setGameResult(result);
      } else {
        setError(`Não foi possível obter as dezenas para o jogo ${game}.`);
      }
    } catch (err) {
      console.error(err);
      setError(`Erro ao buscar o jogo ${game}.`);
    } finally {
      setSearching(false);
    }
  };

  const handleCopySuggested = () => {
    if (!suggestedGame) return;
    const text = suggestedGame.join(' ');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer); // Note: this return is ignored here, just conceptually right.
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const generateSuggestedGame = () => {
    if (allFetchedGames.length === 0) {
      setError("Não há dados suficientes para gerar um jogo sugerido.");
      setSuggestedGame(null);
      return;
    }

    // Utiliza o novo algoritmo "Smart"
    const suggested = generateSmartGame(allFetchedGames);
    setSuggestedGame(suggested);

    // Executa o Backtest automaticamente para este jogo específico contra a história
    const result = backtestGame(suggested, allFetchedGames);
    setBacktestResult(result);
  };

  const runSimulation = () => {
      if (allFetchedGames.length < 50) {
          setError("É preciso carregar mais jogos para simular a IA com precisão.");
          return;
      }
      setSimulating(true);

      // Use setTimeout to allow UI update
      setTimeout(() => {
          const result = simulateBacktest(allFetchedGames, 20); // Simulate last 20 games
          setSimulationResult(result);
          setSimulating(false);
      }, 100);
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
              <GameSearchForm onSearch={handleSearchGame} searching={searching} />
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
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Gerar Jogo Inteligente (IA)</h2>
              <p className="text-gray-600 mb-4">
                Utiliza algoritmo otimizado (Frequência + Atraso + Ciclo + Pontuação Estatística).
              </p>

              <div className="flex gap-4 mb-4 flex-wrap">
                  <button
                    onClick={generateSuggestedGame}
                    className="flex-1 bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition duration-200 disabled:opacity-50"
                    disabled={loading || mostFrequentNumbers.length === 0}
                  >
                    Gerar Palpite Otimizado
                  </button>

                  <button
                    onClick={runSimulation}
                    className="flex-1 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
                    disabled={loading || simulating || allFetchedGames.length < 50}
                  >
                    {simulating ? 'Simulando...' : 'Validar Algoritmo (Simulação)'}
                  </button>
              </div>

              {simulationResult && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                  <h3 className="font-semibold text-indigo-900 mb-4 text-center">
                    Comparativo de Eficiência (Últimos {simulationResult.smart.gamesSimulated} jogos)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Smart Algorithm Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-600">
                      <h4 className="font-bold text-purple-700 mb-3 border-b pb-2">Algoritmo Inteligente</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média de Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.smart.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">14 Pontos:</span>
                          <span className="font-bold text-green-600">{simulationResult.smart.accuracyDistribution[14] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">15 Pontos:</span>
                          <span className="font-bold text-yellow-600">{simulationResult.smart.accuracyDistribution[15] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                           <span className="text-gray-500 text-xs">Precisão Global:</span>
                           <span className="font-bold text-blue-600 text-sm">
                               {((simulationResult.smart.totalHits / (simulationResult.smart.gamesSimulated * 15)) * 100).toFixed(1)}%
                           </span>
                        </div>
                      </div>
                    </div>

                    {/* Random Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
                      <h4 className="font-bold text-gray-600 mb-3 border-b pb-2">Palpite Aleatório</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média de Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.random.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">14 Pontos:</span>
                          <span className="font-bold text-green-600">{simulationResult.random.accuracyDistribution[14] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">15 Pontos:</span>
                          <span className="font-bold text-yellow-600">{simulationResult.random.accuracyDistribution[15] || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                           <span className="text-gray-500 text-xs">Precisão Global:</span>
                           <span className="font-bold text-blue-600 text-sm">
                               {((simulationResult.random.totalHits / (simulationResult.random.gamesSimulated * 15)) * 100).toFixed(1)}%
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center text-sm text-indigo-900 bg-indigo-100 p-3 rounded border border-indigo-200">
                    {simulationResult.smart.averageHits > simulationResult.random.averageHits ? (
                      <span>
                        🚀 O <strong>Algoritmo Inteligente</strong> teve um desempenho{' '}
                        <strong className="text-green-700">
                          {((simulationResult.smart.averageHits / simulationResult.random.averageHits - 1) * 100).toFixed(1)}% superior
                        </strong>{' '}
                        à escolha aleatória nesta simulação.
                      </span>
                    ) : (
                      <span>
                        O algoritmo teve desempenho similar ao aleatório nesta amostra. Tente simular mais jogos para ver a tendência de longo prazo.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {suggestedGame && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md" role="region" aria-label="Jogo sugerido">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold">Seu palpite otimizado:</p>
                    <button
                      onClick={handleCopySuggested}
                      className="text-yellow-700 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded p-1 transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
                      aria-label="Copiar jogo sugerido"
                      title="Copiar números"
                    >
                      {copied ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Copiado!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {suggestedGame.map((num) => (
                      <LotteryBall key={num} number={num} colorClass="bg-purple-600 text-white" />
                    ))}
                  </div>

                  {backtestResult && (
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <h3 className="font-semibold text-yellow-900 mb-2">Histórico deste jogo (Backtest)</h3>
                      <p className="text-sm text-yellow-800 mb-2">
                        Se você tivesse jogado estes números nos últimos {backtestResult.totalGames} concursos:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        <div className="bg-white/50 p-2 rounded">
                          <div className="font-bold text-lg text-yellow-900">
                            {backtestResult[11]} <span className="text-xs font-normal">({((backtestResult[11] / backtestResult.totalGames) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="text-xs text-yellow-800">11 Pontos</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <div className="font-bold text-lg text-yellow-900">
                            {backtestResult[12]} <span className="text-xs font-normal">({((backtestResult[12] / backtestResult.totalGames) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="text-xs text-yellow-800">12 Pontos</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <div className="font-bold text-lg text-yellow-900">
                            {backtestResult[13]} <span className="text-xs font-normal">({((backtestResult[13] / backtestResult.totalGames) * 100).toFixed(1)}%)</span>
                          </div>
                          <div className="text-xs text-yellow-800">13 Pontos</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded">
                          <div className="font-bold text-lg text-yellow-900">{backtestResult[14]}</div>
                          <div className="text-xs text-yellow-800">14 Pontos</div>
                        </div>
                        <div className="bg-white/50 p-2 rounded border border-yellow-400">
                          <div className="font-bold text-lg text-yellow-900">{backtestResult[15]}</div>
                          <div className="text-xs text-yellow-800">15 Pontos</div>
                        </div>
                      </div>

                      {backtestResult.totalPrize > 0 && (
                        <div className="mt-4 text-center">
                          <p className="text-sm text-yellow-800">Estimativa de prêmio total acumulado no período:</p>
                          <p className="text-2xl font-bold text-green-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(backtestResult.totalPrize)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Side Bar Right - Estatísticas */}
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-md lg:col-span-1 flex flex-col gap-4"> {/* Side bar takes 1 column */}
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Estatísticas</h2>

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
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ciclo das Dezenas</h3>
                <p className="text-sm text-gray-600 mb-2">Números que faltam sair para fechar o ciclo atual. Estatisticamente têm alta probabilidade.</p>
                {missingInCycle.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-3 bg-white rounded border border-gray-200">
                        {missingInCycle.map(num => (
                            <LotteryBall key={num} number={num} colorClass="bg-red-500 text-white" sizeClass="w-8 h-8 text-sm" />
                        ))}
                    </div>
                ) : (
                    <div className="p-3 bg-green-100 text-green-800 rounded border border-green-200 text-sm">
                        Ciclo fechado! Todos os números saíram recentemente. Um novo ciclo se inicia.
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Números mais atrasados</h3>
                 {delays.length > 0 ? (
                  <ul className="space-y-3 mb-6">
                    {delays.map((item) => (
                      <li key={item.number} className="relative overflow-hidden flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100 transition hover:shadow-md">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-red-50 transition-all duration-500 ease-out"
                          style={{ width: `${(item.count / maxDelay) * 100}%` }}
                          aria-hidden="true"
                        />
                        <div className="relative z-10 flex items-center gap-3">
                          <LotteryBall
                            number={item.number}
                            sizeClass="w-8 h-8 text-sm"
                            colorClass="bg-red-500 text-white"
                          />
                          <span className="sr-only">Número {item.number}</span>
                        </div>
                        <div className="relative z-10 flex items-center gap-1 bg-white/80 px-2 py-1 rounded border border-gray-100/50 backdrop-blur-[1px]">
                          <span className="text-sm font-bold text-gray-700">{item.count}</span>
                          <span className="text-xs text-gray-500">jogos</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !loading && <p className="text-gray-600">Calculando atrasos...</p>
                )}
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Números Quentes (Top 10)</h3>
                {mostFrequentNumbers.length > 0 ? (
                  <ul className="space-y-3">
                    {mostFrequentNumbers.slice(0, 10).map((item) => (
                      <li key={item.number} className="relative overflow-hidden flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100 transition hover:shadow-md">
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-orange-50 transition-all duration-500 ease-out"
                          style={{ width: `${(item.count / maxFrequency) * 100}%` }}
                          aria-hidden="true"
                        />
                        <div className="relative z-10 flex items-center gap-3">
                          <LotteryBall
                            number={item.number}
                            sizeClass="w-8 h-8 text-sm"
                            colorClass="bg-orange-500 text-white"
                          />
                          <span className="sr-only">Número {item.number}</span>
                        </div>
                        <div className="relative z-10 flex items-center gap-1 bg-white/80 px-2 py-1 rounded border border-gray-100/50 backdrop-blur-[1px]">
                          <span className="text-sm font-bold text-gray-700">{item.count}</span>
                          <span className="text-xs text-gray-500">vezes</span>
                        </div>
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
    </div>
  );
}

export default App;
