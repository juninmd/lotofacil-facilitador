import { useState, useEffect } from 'react';
import { getGame, getLatestGames, getMostFrequentNumbers, type LotofacilResult } from './game';
import { generateSmartGame, generateMax15Game, generateKNNGame, generateMarkovGame, generateConsensusGame, backtestGame, simulateBacktest, getCycleMissingNumbers, calculateDelays, calculateConfidence, calculateProjectedStats, type BacktestResult, type SimulationResult, type ProjectedStats } from './utils/statistics';
import { generateGeneticGame } from './utils/genetic';
import { generateTensorFlowGame } from './utils/tensorflowStrategy';
import { generateRegressionGame } from './utils/regressionStrategy';
import LotteryBall from './LotteryBall';
import GameSearchForm from './GameSearchForm';

function App() {
  const NUM_RECENT_GAMES = 100; // Constante para o número de sorteios recentes (Aumentado para melhor estatística)

  const [gameResult, setGameResult] = useState<LotofacilResult | null>(null);
  const [latestGameResult, setLatestGameResult] = useState<LotofacilResult | null>(null);
  const [mostFrequentNumbers, setMostFrequentNumbers] = useState<{ number: number; count: number }[]>([]);
  const [allFetchedGames, setAllFetchedGames] = useState<LotofacilResult[]>([]);
  const [suggestedGame, setSuggestedGame] = useState<number[] | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [lastGameConfidence, setLastGameConfidence] = useState<number | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [projectedStats, setProjectedStats] = useState<ProjectedStats | null>(null);
  const [missingInCycle, setMissingInCycle] = useState<number[]>([]);
  const [delays, setDelays] = useState<{number: number, count: number}[]>([]); // New State
  const [algorithmType, setAlgorithmType] = useState<'smart' | 'max15' | 'knn' | 'genetic' | 'markov' | 'consensus' | 'tensorflow' | 'regression'>('smart');
  const [quantity, setQuantity] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [jsCopied, setJsCopied] = useState<boolean>(false);

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

          // Calculate Confidence of the Latest Draw (Prediction Quality Check)
          // We check the latest game (lastGames[0]) against the history starting from lastGames[1]
          if (lastGames.length > 1) {
              const historyForLast = lastGames.slice(1);
              const lastConf = calculateConfidence(lastGames[0].listaDezenas, historyForLast);
              setLastGameConfidence(lastConf);
          }
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

  const handleCopyJS = () => {
      if (!suggestedGame) return;
      const jsCode = `
(function(){
  const nums = [${suggestedGame.join(',')}];
  nums.forEach(n => {
    const id = 'n' + n.toString().padStart(2, '0');
    const el = document.getElementById(id);
    if(el) el.click();
  });
})();
      `.trim();

      navigator.clipboard.writeText(jsCode).then(() => {
          setJsCopied(true);
          const timer = setTimeout(() => setJsCopied(false), 2000);
          return () => clearTimeout(timer);
      }).catch(err => {
          console.error('Failed to copy JS: ', err);
      });
  };

  const generateSuggestedGame = async () => {
    if (allFetchedGames.length === 0) {
      setError("Não há dados suficientes para gerar um jogo sugerido.");
      setSuggestedGame(null);
      return;
    }

    // Set loading (reusing searching state to show activity on button if needed, or just let UI block)
    // Ideally we want a specific 'generating' state, but 'loading' works to disable buttons.
    const wasLoading = loading; // preserve
    if (!wasLoading) setLoading(true);

    try {
      let suggested: number[];

      if (algorithmType === 'max15') {
         suggested = generateMax15Game(allFetchedGames, quantity);
      } else if (algorithmType === 'knn') {
         suggested = generateKNNGame(allFetchedGames, quantity);
      } else if (algorithmType === 'genetic') {
         suggested = generateGeneticGame(allFetchedGames, quantity);
      } else if (algorithmType === 'markov') {
         suggested = generateMarkovGame(allFetchedGames, undefined, quantity);
      } else if (algorithmType === 'consensus') {
         suggested = generateConsensusGame(allFetchedGames, quantity);
      } else if (algorithmType === 'tensorflow') {
         suggested = await generateTensorFlowGame(allFetchedGames, quantity);
      } else if (algorithmType === 'regression') {
         suggested = generateRegressionGame(allFetchedGames, quantity);
      } else {
         // Utiliza o novo algoritmo "Smart"
         suggested = generateSmartGame(allFetchedGames, undefined, quantity);
      }

      setSuggestedGame(suggested);

      // Calculate Confidence
      const conf = calculateConfidence(suggested, allFetchedGames);
      setConfidence(conf);

      // Calculate Projected Stats
      const stats = calculateProjectedStats(suggested, allFetchedGames);
      setProjectedStats(stats);

      // Executa o Backtest automaticamente para este jogo específico contra a história
      const result = backtestGame(suggested, allFetchedGames, quantity);
      setBacktestResult(result);

    } catch (err) {
      console.error(err);
      setError("Erro ao gerar jogo.");
    } finally {
      if (!wasLoading) setLoading(false);
    }
  };

  const runSimulation = () => {
      if (allFetchedGames.length < 50) {
          setError("É preciso carregar mais jogos para simular a IA com precisão.");
          return;
      }
      setSimulating(true);

      // Use setTimeout to allow UI update before heavy async operation
      setTimeout(async () => {
          try {
              const result = await simulateBacktest(allFetchedGames, 20); // Simulate last 20 games
              setSimulationResult(result);
          } catch (e) {
              console.error(e);
              setError("Erro ao executar simulação.");
          } finally {
              setSimulating(false);
          }
      }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-6xl"> {/* Increased max-w */}
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-6">Lotofácil Facilitador</h1>

        {loading && <p className="text-center text-blue-600 mb-4" role="status">Carregando dados da Lotofácil...</p>}
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-center" role="alert">
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
                Escolha o algoritmo e gere uma sugestão baseada em estatísticas.
              </p>

              {/* Algorithm Selector */}
              <fieldset className="mb-6">
                 <legend className="sr-only">Selecione o algoritmo de geração</legend>
                 <div className="flex flex-col gap-2">
                   <div className="flex flex-col sm:flex-row gap-4">
                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'smart' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="smart"
                                  checked={algorithmType === 'smart'}
                                  onChange={() => setAlgorithmType('smart')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Smart (Estatístico)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Gaussiana e pesos.
                          </p>
                      </label>

                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'max15' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="max15"
                                  checked={algorithmType === 'max15'}
                                  onChange={() => setAlgorithmType('max15')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Max 15</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Padrão repetidos/ausentes.
                          </p>
                      </label>

                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'knn' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="knn"
                                  checked={algorithmType === 'knn'}
                                  onChange={() => setAlgorithmType('knn')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">KNN (Recorrente)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Jogos similares passados.
                          </p>
                      </label>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4">
                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'genetic' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="genetic"
                                  checked={algorithmType === 'genetic'}
                                  onChange={() => setAlgorithmType('genetic')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Genético (AI)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Evolução natural de candidatos.
                          </p>
                      </label>

                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'markov' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="markov"
                                  checked={algorithmType === 'markov'}
                                  onChange={() => setAlgorithmType('markov')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Padrão de Transição</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Cadeias de Markov (Probabilístico).
                          </p>
                      </label>

                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'tensorflow' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="tensorflow"
                                  checked={algorithmType === 'tensorflow'}
                                  onChange={() => setAlgorithmType('tensorflow')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Rede Neural (LSTM)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Machine Learning (TensorFlow).
                          </p>
                      </label>
                   </div>
                   <div className="flex flex-col sm:flex-row gap-4">
                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors hover:shadow-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 ${algorithmType === 'regression' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="regression"
                                  checked={algorithmType === 'regression'}
                                  onChange={() => setAlgorithmType('regression')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Regressão IA (Linear)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              Análise Combinatória (SGD).
                          </p>
                      </label>

                      <label className={`flex-1 p-3 rounded border cursor-pointer transition-colors ${algorithmType === 'consensus' ? 'bg-purple-100 border-purple-500 ring-1 ring-purple-500' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                          <div className="flex items-center gap-2">
                              <input
                                  type="radio"
                                  name="algorithm"
                                  value="consensus"
                                  checked={algorithmType === 'consensus'}
                                  onChange={() => setAlgorithmType('consensus')}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                              />
                              <span className="font-semibold text-gray-800">Consenso IA (Ensemble)</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 ml-6">
                              União de votos de todos os algoritmos.
                          </p>
                      </label>
                   </div>
                 </div>
              </fieldset>

              <div className="mb-6">
                 <label id="quantity-label" className="block text-sm font-medium text-gray-700 mb-2">Quantidade de Números na Aposta</label>
                 <div className="flex flex-wrap gap-2" role="group" aria-labelledby="quantity-label">
                    {[15, 16, 17, 18, 19, 20].map(q => {
                        const prices: Record<number, string> = { 15: "R$ 3,50", 16: "R$ 56,00", 17: "R$ 476,00", 18: "R$ 2.856,00", 19: "R$ 13.566,00", 20: "R$ 38.760,00" };
                        return (
                            <button
                                key={q}
                                type="button"
                                onClick={() => setQuantity(q)}
                                aria-pressed={quantity === q}
                                aria-label={`${q} números, valor ${prices[q]}`}
                                className={`px-4 py-2 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${quantity === q ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                <span className="font-bold">{q}</span>
                                <span className="block text-xs font-normal opacity-80">{prices[q]}</span>
                            </button>
                        );
                    })}
                 </div>
              </div>

              <div className="flex gap-4 mb-4 flex-wrap">
                  <button
                    onClick={generateSuggestedGame}
                    className="flex-1 bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
                    disabled={loading || mostFrequentNumbers.length === 0}
                  >
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    Gerar Palpite Otimizado
                  </button>

                  <button
                    onClick={runSimulation}
                    className="flex-1 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    disabled={loading || simulating || allFetchedGames.length < 20}
                  >
                    {simulating ? (
                      <>
                        <svg aria-hidden="true" className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Simulando...
                      </>
                    ) : (
                      <>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        Validar Algoritmo (Simulação)
                      </>
                    )}
                  </button>
              </div>

              {simulationResult && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                  <h3 className="font-semibold text-indigo-900 mb-4 text-center">
                    Comparativo de Eficiência (Últimos {simulationResult.smart.gamesSimulated} jogos)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Consensus Card */}
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-yellow-500 ring-1 ring-yellow-400">
                      <h4 className="font-bold text-yellow-800 mb-3 border-b border-yellow-200 pb-2 flex justify-between items-center">
                          Consenso IA
                          <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Recomendado</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-900 text-lg">{simulationResult.consensus?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.consensus?.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.consensus?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* TensorFlow Card */}
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-indigo-600 ring-1 ring-indigo-400">
                      <h4 className="font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2 flex justify-between items-center">
                          Rede Neural (LSTM)
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">ML</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-900 text-lg">{simulationResult.tensorflow?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.tensorflow?.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.tensorflow?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Regression Card (NEW) */}
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-purple-800 ring-1 ring-purple-400">
                      <h4 className="font-bold text-purple-900 mb-3 border-b border-purple-200 pb-2 flex justify-between items-center">
                          Regressão IA
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">SGD</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-900 text-lg">{simulationResult.regression?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.regression?.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.regression?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Smart Algorithm Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-600">
                      <h4 className="font-bold text-purple-700 mb-3 border-b pb-2">Smart (Estatístico)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.smart.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>14 Pts: <strong className="text-green-600">{simulationResult.smart.accuracyDistribution[14] || 0}</strong></span>
                          <span>15 Pts: <strong className="text-yellow-600">{simulationResult.smart.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Max 15 Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-teal-600">
                      <h4 className="font-bold text-teal-700 mb-3 border-b pb-2">Max 15</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.max15?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>14 Pts: <strong className="text-green-600">{simulationResult.max15?.accuracyDistribution[14] || 0}</strong></span>
                          <span>15 Pts: <strong className="text-yellow-600">{simulationResult.max15?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* KNN Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-pink-600">
                      <h4 className="font-bold text-pink-700 mb-3 border-b pb-2">KNN (Recorrente)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.knn?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>14 Pts: <strong className="text-green-600">{simulationResult.knn?.accuracyDistribution[14] || 0}</strong></span>
                          <span>15 Pts: <strong className="text-yellow-600">{simulationResult.knn?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Genetic Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-600">
                      <h4 className="font-bold text-orange-700 mb-3 border-b pb-2">Genético (AI)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.genetic?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.genetic?.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.genetic?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Markov Card (NEW) */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-cyan-600">
                      <h4 className="font-bold text-cyan-700 mb-3 border-b pb-2">Markov (Transição)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.markov?.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.markov?.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.markov?.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Random Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-gray-400">
                      <h4 className="font-bold text-gray-600 mb-3 border-b pb-2">Aleatório</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">Média Acertos:</span>
                          <span className="font-bold text-gray-800 text-lg">{simulationResult.random.averageHits.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                           <span>14 Pts: <strong className="text-green-600">{simulationResult.random.accuracyDistribution[14] || 0}</strong></span>
                           <span>15 Pts: <strong className="text-yellow-600">{simulationResult.random.accuracyDistribution[15] || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center text-sm text-indigo-900 bg-indigo-100 p-3 rounded border border-indigo-200">
                    Comparação de {simulationResult.smart.gamesSimulated} jogos simulados no passado recente.
                  </div>
                </div>
              )}

              {suggestedGame && (
                <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md" role="region" aria-label="Jogo sugerido">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold">Seu palpite otimizado:</p>
                    <div className="flex gap-2">
                        <button
                          onClick={handleCopyJS}
                          className="text-yellow-700 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded p-1 transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
                          aria-label="Copiar script para console"
                          title="Copiar código JS para autofill"
                        >
                          {jsCopied ? (
                             <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Script Copiado!
                             </span>
                          ) : (
                             <span className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Copiar Script
                             </span>
                          )}
                        </button>
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
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {suggestedGame.map((num) => (
                      <LotteryBall key={num} number={num} colorClass="bg-purple-600 text-white" />
                    ))}
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="p-2 bg-purple-50 rounded border border-purple-100 flex items-center justify-between">
                       <span className="text-sm font-semibold text-purple-900" id="confidence-label">Probabilidade Calculada (Fit):</span>
                       <div className="flex items-center gap-2">
                          <div
                            className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden"
                            role="progressbar"
                            aria-labelledby="confidence-label"
                            aria-valuenow={confidence}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                             <div
                               className="h-full bg-gradient-to-r from-purple-400 to-green-500"
                               style={{ width: `${confidence}%` }}
                             />
                          </div>
                          <span className="font-bold text-purple-700 text-sm" aria-hidden="true">{confidence}%</span>
                       </div>
                    </div>

                    {projectedStats && (
                        <div className="flex gap-2">
                            <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-100 flex flex-col items-center">
                                <span className="text-xs text-blue-800 uppercase font-semibold">Média Acertos</span>
                                <span className="text-lg font-bold text-blue-900">{projectedStats.averageHits.toFixed(2)}</span>
                                <span className="text-[10px] text-blue-600">Histórico Recente</span>
                            </div>
                            <div className="flex-1 p-2 bg-green-50 rounded border border-green-100 flex flex-col items-center">
                                <span className="text-xs text-green-800 uppercase font-semibold">Estimativa Prêmio</span>
                                <span className="text-lg font-bold text-green-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedStats.estimatedPrize)}
                                </span>
                                <span className="text-[10px] text-green-600">Média por Jogo</span>
                            </div>
                        </div>
                    )}
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

                      <div className="mt-6 border-t border-yellow-300 pt-4">
                        <h4 className="text-center font-bold text-yellow-900 mb-3">
                            Análise Financeira
                            <span className="block text-sm font-normal text-yellow-800 mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(backtestResult.totalCost / backtestResult.totalGames)} / aposta
                            </span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                            <div className="bg-white/40 p-3 rounded border border-yellow-200">
                                <span className="block text-xs text-yellow-800 uppercase tracking-wide">Custo Total</span>
                                <span className="text-xl font-semibold text-red-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(backtestResult.totalCost)}
                                </span>
                            </div>
                            <div className="bg-white/40 p-3 rounded border border-yellow-200">
                                <span className="block text-xs text-yellow-800 uppercase tracking-wide">Retorno (Prêmios)</span>
                                <span className="text-xl font-semibold text-green-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(backtestResult.totalPrize)}
                                </span>
                            </div>
                            <div className={`bg-white/40 p-3 rounded border ${backtestResult.netProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                                <span className="block text-xs text-gray-700 uppercase tracking-wide">Saldo Líquido</span>
                                <span className={`text-xl font-bold ${backtestResult.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(backtestResult.netProfit)}
                                </span>
                            </div>
                        </div>
                      </div>
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
                    <div className="flex flex-wrap gap-2 justify-center mb-3">
                      {latestGameResult.listaDezenas.map((num) => (
                        <LotteryBall key={num} number={num} colorClass="bg-blue-600 text-white" sizeClass="w-8 h-8 text-sm" />
                      ))}
                    </div>
                    {lastGameConfidence !== null && (
                        <div className="text-center text-sm border-t border-blue-200 pt-2 mt-2">
                            <span className="block text-blue-700 font-medium" id="last-game-confidence-label">Probabilidade Calculada (Smart):</span>
                            <div className="flex items-center justify-center gap-2 my-1">
                                <div
                                  className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden"
                                  role="progressbar"
                                  aria-labelledby="last-game-confidence-label"
                                  aria-valuenow={lastGameConfidence}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-400 to-cyan-500"
                                        style={{ width: `${lastGameConfidence}%` }}
                                    />
                                </div>
                                <span className="font-bold text-blue-900" aria-hidden="true">{lastGameConfidence}%</span>
                            </div>
                            <span className="block text-xs text-blue-600 mt-1">
                                (O quão "previsível" foi este resultado baseando-se no histórico anterior)
                            </span>
                        </div>
                    )}
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
