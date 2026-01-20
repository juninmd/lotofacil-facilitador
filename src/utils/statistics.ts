import type { LotofacilResult } from '../game';

export interface BacktestResult {
  11: number;
  12: number;
  13: number;
  14: number;
  15: number;
  totalGames: number;
  totalPrize: number;
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

export const backtestGame = (selection: number[], history: LotofacilResult[]): BacktestResult => {
  const result: BacktestResult = {
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
    totalGames: history.length,
    totalPrize: 0,
  };

  const selectionSet = new Set(selection);

  history.forEach(game => {
    let hits = 0;
    game.listaDezenas.forEach(num => {
      if (selectionSet.has(num)) hits++;
    });

    if (hits >= 11 && hits <= 15) {
      result[hits as 11 | 12 | 13 | 14 | 15]++;

      // Calculate prize
      // Faixa 1 = 15 hits, Faixa 2 = 14 hits, ..., Faixa 5 = 11 hits
      const targetFaixa = 16 - hits;

      if (game.listaRateioPremio) {
        const premio = game.listaRateioPremio.find(p => p.faixa === targetFaixa);
        if (premio) {
          result.totalPrize += premio.valorPremio;
        }
      }
    }
  });

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
    return (scoreOdd * 0.2) + (scoreSum * 0.2) + (scorePrime * 0.2) + (scoreRepeats * 0.4);
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


export const generateSmartGame = (history: LotofacilResult[], previousGameOverride?: LotofacilResult): number[] => {
  if (history.length === 0) return [];

  const latestGame = previousGameOverride || history[0];
  const dynamicStats = getDynamicStats(history);

  // 1. Calculate Frequencies (Global and Recent)
  const frequencyMap = new Map<number, number>();
  const recentFrequencyMap = new Map<number, number>();
  for (let i = 1; i <= 25; i++) {
      frequencyMap.set(i, 0);
      recentFrequencyMap.set(i, 0);
  }

  const numGames = history.length;
  history.forEach(game => {
      game.listaDezenas.forEach(num => {
          frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
      });
  });

  // Recent frequency (last 10 games)
  const recentHistory = history.slice(0, 10);
  recentHistory.forEach(game => {
      game.listaDezenas.forEach(num => {
          recentFrequencyMap.set(num, (recentFrequencyMap.get(num) || 0) + 1);
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
      const recentFreq = recentFrequencyMap.get(i) || 0;
      const delay = delays.get(i) || 0;

      let weight = 1.0;

      // Frequency Weight: Up to +3.0
      weight += normalizedFreq * 3.0;

      // Recent Frequency (Hotness): Up to +4.0 (e.g. 8/10 * 5 = 4.0)
      weight += (recentFreq / 10) * 5.0;

      // Cycle Weight: Boost
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
    // 1. Determine number of repeats (8, 9, or 10)
    const rand = Math.random();
    let repeatCount = 9;
    if (rand < 0.25) repeatCount = 8;
    else if (rand > 0.85) repeatCount = 10;

    // 2. Select from pools
    const selectionInside = getWeightedRandomSubset(insidePool, weights, repeatCount);
    const selectionOutside = getWeightedRandomSubset(outsidePool, weights, 15 - repeatCount);

    const selection = [...selectionInside, ...selectionOutside].sort((a, b) => a - b);

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

  return bestCandidate.length > 0 ? bestCandidate : allNumbers.slice(0, 15);
};

export const generateRandomGame = (): number[] => {
    const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);
    const selection: number[] = [];
    while (selection.length < 15) {
        const idx = Math.floor(Math.random() * allNumbers.length);
        selection.push(allNumbers[idx]);
        allNumbers.splice(idx, 1);
    }
    return selection.sort((a, b) => a - b);
}

export const simulateBacktest = (fullHistory: LotofacilResult[], numSimulations: number = 20): SimulationResult => {
    // We need training data (past games) for each simulation step
    // So we can only simulate up to fullHistory.length - 20 (approx)
    if (fullHistory.length < numSimulations + 20) {
         const emptyStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };
        return { smart: emptyStats, random: emptyStats };
    }

    const smartStats: SimulationStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };
    const randomStats: SimulationStats = { gamesSimulated: 0, averageHits: 0, totalHits: 0, accuracyDistribution: {} };

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

        // Random Prediction
        const randomPrediction = generateRandomGame();
        const randomHits = randomPrediction.filter(n => targetGame.listaDezenas.includes(n)).length;
        randomStats.totalHits += randomHits;
        randomStats.accuracyDistribution[randomHits] = (randomStats.accuracyDistribution[randomHits] || 0) + 1;

        smartStats.gamesSimulated++;
        randomStats.gamesSimulated++;
    }

    if (smartStats.gamesSimulated > 0) smartStats.averageHits = smartStats.totalHits / smartStats.gamesSimulated;
    if (randomStats.gamesSimulated > 0) randomStats.averageHits = randomStats.totalHits / randomStats.gamesSimulated;

    return {
        smart: smartStats,
        random: randomStats
    };
};
