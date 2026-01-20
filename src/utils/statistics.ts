import type { LotofacilResult } from '../game';

export interface BacktestResult {
  11: number;
  12: number;
  13: number;
  14: number;
  15: number;
  totalGames: number;
  totalPrize: number;
  totalCost: number;
  netProfit: number;
}

export interface SimulationStats {
    gamesSimulated: number;
    averageHits: number;
    totalHits: number;
    accuracyDistribution: { [key: number]: number };
}

export interface SimulationResult {
    smart: SimulationStats;
    random: SimulationStats;
    max15: SimulationStats;
}

// Constants for Lotofacil Patterns
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

interface DynamicStats {
    meanOdd: number;
    stdDevOdd: number;
    meanSum: number;
    stdDevSum: number;
    meanPrime: number;
    stdDevPrime: number;
    meanRepeats: number;
    stdDevRepeats: number;
}

export const calculateStats = (games: LotofacilResult[]) => {
  const frequencyMap = new Map<number, number>();
  let totalSum = 0;
  let totalOdd = 0;
  let totalEven = 0;

  games.forEach(game => {
    let gameSum = 0;
    let gameOdd = 0;
    let gameEven = 0;

    game.listaDezenas.forEach(num => {
      frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
      gameSum += num;
      if (num % 2 !== 0) gameOdd++;
      else gameEven++;
    });

    totalSum += gameSum;
    totalOdd += gameOdd;
    totalEven += gameEven;
  });

  const sortedFrequency = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([num, count]) => ({ number: num, count }));

  return {
    frequency: sortedFrequency,
    avgSum: totalSum / games.length,
    avgOdd: totalOdd / games.length,
    avgEven: totalEven / games.length,
  };
};

export const calculateDelays = (history: LotofacilResult[]): Map<number, number> => {
  const delays = new Map<number, number>();
  for (let i = 1; i <= 25; i++) delays.set(i, 0);

  const found = new Set<number>();

  // History is assumed to be sorted descending (index 0 is latest game)
  for (let idx = 0; idx < history.length; idx++) {
      const game = history[idx];
      game.listaDezenas.forEach(n => {
          if (!found.has(n)) {
              delays.set(n, idx); // idx=0 means last drawn in most recent game (0 games ago)
              found.add(n);
          }
      });
      if (found.size === 25) break;
  }

  // For numbers not found in history, set delay to history length
  for (let i = 1; i <= 25; i++) {
      if (!found.has(i)) {
          delays.set(i, history.length);
      }
  }
  return delays;
};

export const backtestGame = (selection: number[], history: LotofacilResult[], betSize?: number): BacktestResult => {
  const result: BacktestResult = {
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
    totalGames: history.length,
    totalPrize: 0,
    totalCost: 0,
    netProfit: 0,
  };

  const selectionSet = new Set(selection);
  const quantity = betSize || selection.length;

  history.forEach(game => {
    let hits = 0;
    game.listaDezenas.forEach(num => {
      if (selectionSet.has(num)) hits++;
    });

    if (hits >= 11 && hits <= 15) {
      result[hits as 11 | 12 | 13 | 14 | 15]++;

      // Fixed prizes for 11, 12, 13 hits based on user input
      if (hits === 11) {
        result.totalPrize += 7.00;
      } else if (hits === 12) {
        result.totalPrize += 14.00;
      } else if (hits === 13) {
        result.totalPrize += 35.00;
      } else {
        // Faixa 1 = 15 hits, Faixa 2 = 14 hits
        const targetFaixa = 16 - hits;
        if (game.listaRateioPremio) {
          const premio = game.listaRateioPremio.find(p => p.faixa === targetFaixa);
          if (premio) {
            result.totalPrize += premio.valorPremio;
          }
        }
      }
    }
  });

  // Calculate Costs
  const prices: {[key: number]: number} = {
    15: 3.50,
    16: 56.00,
    17: 476.00,
    18: 2856.00,
    19: 13566.00,
    20: 38760.00
  };
  const costPerGame = prices[quantity] || 3.50;

  result.totalCost = result.totalGames * costPerGame;
  result.netProfit = result.totalPrize - result.totalCost;

  return result;
};

export const getCycleMissingNumbers = (history: LotofacilResult[]): number[] => {
    const currentCycleSet = new Set<number>();

    // Sort oldest to newest to trace cycle
    // Assuming history is Newest [0] to Oldest [N]
    // We iterate backwards from end (Oldest) to 0 (Newest)
    const sortedHistory = [...history].sort((a, b) => a.numero - b.numero);

    for (const game of sortedHistory) {
        game.listaDezenas.forEach(n => currentCycleSet.add(n));
        if (currentCycleSet.size === 25) {
            currentCycleSet.clear(); // Cycle closed, start new
        }
    }

    const missing: number[] = [];
    for (let i = 1; i <= 25; i++) {
        if (!currentCycleSet.has(i)) {
            missing.push(i);
        }
    }

    return missing;
};

// Calculate mean and std dev dynamically from history
const getDynamicStats = (history: LotofacilResult[]): DynamicStats => {
    // We need at least 20 games to have decent stats
    const sample = history.slice(0, 100);

    const odds: number[] = [];
    const sums: number[] = [];
    const primes: number[] = [];
    const repeats: number[] = [];

    for (let i = 0; i < sample.length - 1; i++) {
        const game = sample[i];
        const prevGame = sample[i+1]; // History is desc

        const nums = game.listaDezenas;
        odds.push(nums.filter(n => n % 2 !== 0).length);
        sums.push(nums.reduce((a, b) => a + b, 0));
        primes.push(nums.filter(n => PRIMES.has(n)).length);
        repeats.push(nums.filter(n => prevGame.listaDezenas.includes(n)).length);
    }

    const calculateMeanStd = (values: number[]) => {
        if (values.length === 0) return { mean: 0, std: 1 };
        const mean = values.reduce((a,b) => a+b, 0) / values.length;
        const variance = values.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / values.length;
        return { mean, std: Math.sqrt(variance) };
    };

    const oddStats = calculateMeanStd(odds);
    const sumStats = calculateMeanStd(sums);
    const primeStats = calculateMeanStd(primes);
    const repeatStats = calculateMeanStd(repeats);

    return {
        meanOdd: oddStats.mean || 8,
        stdDevOdd: oddStats.std || 1.5,
        meanSum: sumStats.mean || 200,
        stdDevSum: sumStats.std || 15,
        meanPrime: primeStats.mean || 5,
        stdDevPrime: primeStats.std || 1.2,
        meanRepeats: repeatStats.mean || 9,
        stdDevRepeats: repeatStats.std || 1.0,
    };
};


// Gaussian scoring function
const gaussianScore = (value: number, mean: number, sigma: number): number => {
    if (sigma === 0) return value === mean ? 1 : 0;
    return Math.exp(-Math.pow(value - mean, 2) / (2 * Math.pow(sigma, 2)));
};

// Score a candidate game based on statistical ideal distribution
const scoreCandidate = (numbers: number[], stats: DynamicStats, previousGameDezenas?: number[]): number => {
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const primesCount = numbers.filter(n => PRIMES.has(n)).length;

    // Ideal values based on Dynamic Stats
    const scoreOdd = gaussianScore(oddCount, stats.meanOdd, stats.stdDevOdd);
    const scoreSum = gaussianScore(sum, stats.meanSum, stats.stdDevSum);
    const scorePrime = gaussianScore(primesCount, stats.meanPrime, stats.stdDevPrime);

    let scoreRepeats = 0;
    if (previousGameDezenas) {
        const repeatCount = numbers.filter(n => previousGameDezenas.includes(n)).length;
        scoreRepeats = gaussianScore(repeatCount, stats.meanRepeats, stats.stdDevRepeats);
    } else {
        scoreRepeats = 1; // Neutral if no prev game
    }

    // Weights: Repeats are very important in Lotofacil
    // Optimized for 3591 pattern (which had 9 repeats, exactly the mean)
    return (scoreOdd * 0.15) + (scoreSum * 0.15) + (scorePrime * 0.15) + (scoreRepeats * 0.55);
};

export const calculateConfidence = (game: number[], history: LotofacilResult[]): number => {
    if (history.length === 0) return 0;
    const stats = getDynamicStats(history);
    const latestGame = history[0];
    const score = scoreCandidate(game, stats, latestGame.listaDezenas);

    // Normalize score (theoretical max is approx 1.0)
    // We map 0.5 - 1.0 range to a percentage "confidence"
    let confidence = (score - 0.5) * 2 * 100;
    if (confidence < 0) confidence = 0;
    if (confidence > 99) confidence = 99;

    return Math.floor(confidence);
};

const getWeightedRandomSubset = (
  items: number[],
  weights: Map<number, number>,
  count: number
): number[] => {
  const selection = new Set<number>();
  const pool = [...items];

  if (pool.length < count) return pool;

  while (selection.size < count && pool.length > 0) {
    let totalWeight = 0;
    for (const num of pool) {
      totalWeight += (weights.get(num) || 0.1);
    }

    let random = Math.random() * totalWeight;
    let selectedIndex = -1;

    for (let i = 0; i < pool.length; i++) {
      const num = pool[i];
      const weight = (weights.get(num) || 0.1);
      random -= weight;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    if (selectedIndex !== -1) {
      selection.add(pool[selectedIndex]);
      pool.splice(selectedIndex, 1);
    } else {
        selection.add(pool[0]);
        pool.shift();
    }
  }

  return Array.from(selection).sort((a, b) => a - b);
};


export const generateSmartGame = (history: LotofacilResult[], previousGameOverride?: LotofacilResult, quantity: number = 15): number[] => {
  if (history.length === 0) return [];

  const latestGame = previousGameOverride || history[0];
  const dynamicStats = getDynamicStats(history);

  // 1. Calculate Frequencies
  const frequencyMap = new Map<number, number>();
  for (let i = 1; i <= 25; i++) frequencyMap.set(i, 0);

  const numGames = history.length;
  history.forEach(game => {
      game.listaDezenas.forEach(num => {
          frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
      });
  });

  // 2. Identify Cycle Missing Numbers
  const missingInCycle = getCycleMissingNumbers(history);

  // 3. Calculate Delays (Recency)
  const delays = calculateDelays(history);

  // 4. Build Weights
  const weights = new Map<number, number>();
  for (let i = 1; i <= 25; i++) {
      const freq = frequencyMap.get(i) || 0;
      const normalizedFreq = freq / numGames;
      const delay = delays.get(i) || 0;

      let weight = 1.0;

      // Frequency Weight: Up to +2.0
      weight += normalizedFreq * 2.0;

      // Cycle Weight: Huge boost
      if (missingInCycle.includes(i)) {
          weight += 4.0; // Increased weight for cycle
      }

      // Delay Weight: Boost numbers that are "due"
      if (delay > 2) {
          weight += Math.log(delay) * 0.5;
      }

      weights.set(i, weight);
  }

  const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  // Generate Multiple Candidates and Rank Them
  let bestCandidate: number[] = [];
  let bestScore = -1;

  let attempts = 0;
  const maxAttempts = 3000;

  while (attempts < maxAttempts) {
    const selection = getWeightedRandomSubset(allNumbers, weights, quantity);

    // We score against the LATEST KNOWN game (to optimize repeats from it)
    const score = scoreCandidate(selection, dynamicStats, latestGame?.listaDezenas);

    // Optimization: Keep the best score
    if (score > bestScore) {
        bestScore = score;
        bestCandidate = selection;
    }

    // Stop if we find a very high probability match
    if (bestScore > 0.96) break;

    attempts++;
  }

  return bestCandidate.length > 0 ? bestCandidate : allNumbers.slice(0, quantity);
};

export const generateRandomGame = (quantity: number = 15): number[] => {
    const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const selection: number[] = [];
    while (selection.length < quantity) {
        const idx = Math.floor(Math.random() * allNumbers.length);
        selection.push(allNumbers[idx]);
        allNumbers.splice(idx, 1);
    }
    return selection.sort((a, b) => a - b);
}

export const generateMax15Game = (history: LotofacilResult[], quantity: number = 15): number[] => {
  if (history.length === 0) return [];
  const latestGame = history[0];
  const previousNumbers = new Set(latestGame.listaDezenas);
  const absentNumbers = Array.from({ length: 25 }, (_, i) => i + 1).filter(n => !previousNumbers.has(n));

  // Calculate stats for ranking
  const frequencyMap = new Map<number, number>();
  history.forEach(g => g.listaDezenas.forEach(n => frequencyMap.set(n, (frequencyMap.get(n) || 0) + 1)));

  const delays = calculateDelays(history);

  // Helper to score numbers
  const scoreNumber = (n: number, isAbsent: boolean) => {
    let score = frequencyMap.get(n) || 0;
    if (isAbsent) {
        // Boost absent numbers by delay
        score += (delays.get(n) || 0) * 2;
    }
    return score;
  };

  // Sort pools
  const sortedPrevious = [...previousNumbers].sort((a, b) => scoreNumber(b, false) - scoreNumber(a, false));
  const sortedAbsent = [...absentNumbers].sort((a, b) => scoreNumber(b, true) - scoreNumber(a, true));

  // Determine ratio based on quantity. Default 9/6 for 15.
  // Ratio is approx 60% from previous.
  const targetPrevious = Math.round(quantity * 0.6);
  const targetAbsent = quantity - targetPrevious;

  // We take a slightly larger pool to randomize from
  const poolPrevious = sortedPrevious.slice(0, targetPrevious + 4);
  const poolAbsent = sortedAbsent.slice(0, targetAbsent + 3);

  let bestGame: number[] = [];
  let bestScore = -1;

  for(let i=0; i<500; i++) {
      // Pick numbers from poolPrevious
      const p = new Set<number>();
      while(p.size < targetPrevious) {
          const idx = Math.floor(Math.random() * poolPrevious.length);
          p.add(poolPrevious[idx]);
      }

      // Pick numbers from poolAbsent
      const a = new Set<number>();
      while(a.size < targetAbsent) {
          const idx = Math.floor(Math.random() * poolAbsent.length);
          a.add(poolAbsent[idx]);
      }

      const candidate = [...p, ...a].sort((x, y) => x - y);

      // Validate
      const oddCount = candidate.filter(n => n % 2 !== 0).length;
      const primeCount = candidate.filter(n => PRIMES.has(n)).length;
      const sum = candidate.reduce((acc, curr) => acc + curr, 0);

      let score = 0;
      // Strict constraints get high score
      if (oddCount >= 7 && oddCount <= 9) score += 2;
      if (primeCount >= 4 && primeCount <= 6) score += 2;
      if (sum >= 180 && sum <= 220) score += 2;

      // Add a bit of frequency score
      score += candidate.reduce((acc, n) => acc + (frequencyMap.get(n)||0), 0) / 1000;

      if (score > bestScore) {
          bestScore = score;
          bestGame = candidate;
      }
  }

  return bestGame;
};

export const simulateBacktest = (fullHistory: LotofacilResult[], numSimulations: number = 20): SimulationResult => {
    // We need training data (past games) for each simulation step
    // So we can only simulate up to fullHistory.length - 20 (approx)
    if (fullHistory.length < numSimulations + 20) {
         const emptyStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };
        return { smart: emptyStats, random: emptyStats, max15: emptyStats };
    }

    const smartStats: SimulationStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };
    const randomStats: SimulationStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };
    const max15Stats: SimulationStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };

    for (let i = 0; i < numSimulations; i++) {
        // Target is the game we are trying to predict (the "future")
        const targetGame = fullHistory[i];

        // Training data is everything AFTER this game (the "past")
        const trainingData = fullHistory.slice(i + 1, i + 101); // Use last 100 games relative to target

        if (trainingData.length < 50) break; // Need enough history

        // Smart Prediction
        const smartPrediction = generateSmartGame(trainingData);
        const smartHits = smartPrediction.filter(n => targetGame.listaDezenas.includes(n)).length;
        smartStats.totalHits += smartHits;
        smartStats.accuracyDistribution[smartHits] = (smartStats.accuracyDistribution[smartHits] || 0) + 1;

        // Max15 Prediction
        const max15Prediction = generateMax15Game(trainingData);
        const max15Hits = max15Prediction.filter(n => targetGame.listaDezenas.includes(n)).length;
        max15Stats.totalHits += max15Hits;
        max15Stats.accuracyDistribution[max15Hits] = (max15Stats.accuracyDistribution[max15Hits] || 0) + 1;

        // Random Prediction
        const randomPrediction = generateRandomGame();
        const randomHits = randomPrediction.filter(n => targetGame.listaDezenas.includes(n)).length;
        randomStats.totalHits += randomHits;
        randomStats.accuracyDistribution[randomHits] = (randomStats.accuracyDistribution[randomHits] || 0) + 1;

        smartStats.gamesSimulated++;
        randomStats.gamesSimulated++;
        max15Stats.gamesSimulated++;
    }

    if (smartStats.gamesSimulated > 0) smartStats.averageHits = smartStats.totalHits / smartStats.gamesSimulated;
    if (randomStats.gamesSimulated > 0) randomStats.averageHits = randomStats.totalHits / randomStats.gamesSimulated;
    if (max15Stats.gamesSimulated > 0) max15Stats.averageHits = max15Stats.totalHits / max15Stats.gamesSimulated;

    return {
        smart: smartStats,
        random: randomStats,
        max15: max15Stats
    };
};
