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

export interface SimulationResult {
  gamesSimulated: number;
  averageHits: number;
  totalHits: number;
  accuracyDistribution: { [key: number]: number };
}

// Constants for Lotofacil Patterns
const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
const BORDER = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

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

// Gaussian scoring function
const gaussianScore = (value: number, mean: number, sigma: number): number => {
    return Math.exp(-Math.pow(value - mean, 2) / (2 * Math.pow(sigma, 2)));
};

// Score a candidate game based on statistical ideal distribution
const scoreCandidate = (numbers: number[], previousGameDezenas?: number[]): number => {
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const primesCount = numbers.filter(n => PRIMES.has(n)).length;
    const fibCount = numbers.filter(n => FIBONACCI.has(n)).length;

    // Ideal values based on Lotofácil statistics
    const scoreOdd = gaussianScore(oddCount, 8, 1.5); // Mean 8, Sigma 1.5
    const scoreSum = gaussianScore(sum, 200, 15);     // Mean 200, Sigma 15
    const scorePrime = gaussianScore(primesCount, 5, 1.2);
    const scoreFib = gaussianScore(fibCount, 4, 1.2);

    let scoreRepeat = 0;
    if (previousGameDezenas) {
        const repeatCount = numbers.filter(n => previousGameDezenas.includes(n)).length;
        scoreRepeat = gaussianScore(repeatCount, 9, 1.0); // Mean 9, Sigma 1.0 (Strict on 9)
    }

    if (previousGameDezenas) {
        // High weight on repeating structure as it's a strong predictor
        return (scoreOdd * 0.15) + (scoreSum * 0.15) + (scorePrime * 0.1) + (scoreFib * 0.1) + (scoreRepeat * 0.5);
    } else {
        return (scoreOdd * 0.3) + (scoreSum * 0.3) + (scorePrime * 0.2) + (scoreFib * 0.2);
    }
};

// Helper to check if a game matches typical Lotofacil patterns
const isValidPattern = (numbers: number[], previousGameDezenas?: number[]): boolean => {
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const sum = numbers.reduce((a, b) => a + b, 0);
  const primesCount = numbers.filter(n => PRIMES.has(n)).length;
  const fibCount = numbers.filter(n => FIBONACCI.has(n)).length;
  const borderCount = numbers.filter(n => BORDER.has(n)).length;

  const validParity = (oddCount >= 6 && oddCount <= 9);
  const validSum = (sum >= 170 && sum <= 230);

  let validRepeats = true;
  if (previousGameDezenas) {
    const repeats = numbers.filter(n => previousGameDezenas.includes(n)).length;
    validRepeats = (repeats >= 8 && repeats <= 10);
  }

  const validPrimes = (primesCount >= 4 && primesCount <= 7);
  const validFib = (fibCount >= 3 && fibCount <= 6);
  const validBorder = (borderCount >= 8 && borderCount <= 11);

  return validParity && validSum && validRepeats && validPrimes && validFib && validBorder;
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
          weight += 2.0;
      }

      // Delay Weight: Boost numbers that are "due" but not missing in cycle (cycle handles those)
      // Logarithmic boost for delay
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
  const maxAttempts = 5000; // Increased attempts for split strategy

  // Split pool strategy
  const insidePool = latestGame.listaDezenas;
  const outsidePool = allNumbers.filter(n => !insidePool.includes(n));

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

    if (isValidPattern(selection, latestGame?.listaDezenas)) {
        const score = scoreCandidate(selection, latestGame?.listaDezenas);

        // Optimization: Keep the best score
        if (score > bestScore) {
            bestScore = score;
            bestCandidate = selection;
        }
    }

    if (bestScore > 0.98) break;

    attempts++;
  }

  return bestCandidate.length > 0 ? bestCandidate : allNumbers.slice(0, 15);
};

export const simulateBacktest = (fullHistory: LotofacilResult[], numSimulations: number = 20): SimulationResult => {
    if (fullHistory.length < numSimulations + 10) {
        return {
            gamesSimulated: 0,
            averageHits: 0,
            totalHits: 0,
            accuracyDistribution: {}
        };
    }

    let totalHits = 0;
    const accuracyDistribution: { [key: number]: number } = {};
    let gamesSimulated = 0;

    for (let i = 0; i < numSimulations; i++) {
        const targetGame = fullHistory[i];
        const trainingData = fullHistory.slice(i + 1, i + 100);

        if (trainingData.length < 10) break;

        const prediction = generateSmartGame(trainingData);

        const hits = prediction.filter(n => targetGame.listaDezenas.includes(n)).length;

        totalHits += hits;
        accuracyDistribution[hits] = (accuracyDistribution[hits] || 0) + 1;
        gamesSimulated++;
    }

    return {
        gamesSimulated,
        averageHits: gamesSimulated > 0 ? totalHits / gamesSimulated : 0,
        totalHits,
        accuracyDistribution
    };
};
