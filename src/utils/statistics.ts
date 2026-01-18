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

// Identify numbers missing in the current cycle
// A cycle completes when all 25 numbers have been drawn.
// We look back until we find all 25. The numbers drawn since the start of that "cycle" are 'found'.
// The numbers NOT drawn since the start of the cycle are 'missing' and have high probability.
export const getCycleMissingNumbers = (history: LotofacilResult[]): number[] => {
    const drawnInCycle = new Set<number>();

    // Iterate backwards
    for (const game of history) {
        game.listaDezenas.forEach(n => drawnInCycle.add(n));
        if (drawnInCycle.size === 25) {
            // Cycle closed here.
            // But we want the CURRENT cycle.
            // Wait, if drawnInCycle size is 25, it means the cycle ENDED in this game (or before).
            // Actually, we need to find the numbers missing from the *current open cycle*.
            // So we go back until we find a game that *completed* the previous cycle?
            // Simplified logic: Start from latest game. Accumulate unique numbers.
            // If we hit 25, the cycle just closed. If we have < 25, we are in a cycle.
            break;
        }
    }

    // If we found 25 numbers, the cycle JUST closed. So the missing numbers are actually empty (new cycle starts).
    // However, usually "cycle analysis" means "which numbers haven't appeared since the last time the cycle was reset?".
    // Let's refine: The standard definition is we track drawn numbers from the last time a cycle closed.
    // If the set of all drawn numbers since game X is {1..25}, then the cycle closed at X.
    // We want the set of numbers drawn since the *last closure*.

    // Correct algorithm:
    // 1. Traverse games from oldest to newest (or finding the break point).
    // Actually simpler: Traverse newest to oldest. Accumulate set.
    // If set size < 25, the missing numbers are (1..25) - set.
    // If set size == 25, the cycle closed exactly at the game where it hit 25.
    // So if we just take the last few games until we hit 25 unique numbers? No.
    // Let's stick to the heuristic:
    // Go back in history. Accumulate numbers. When size == 25, STOP.
    // The numbers we accumulated are the ones that closed the cycle.
    // Wait, this is tricky to define programmatically without processing ALL history to find cycle boundaries.

    // Practical heuristic:
    // Take the last N games. See which numbers are missing.
    // If a number hasn't appeared in the last 10 games, it's very "cold".
    // But "Cycle" specifically refers to:
    // "Cycle 1 started Game 1. Ends when all 25 drawn. Cycle 2 starts next game."
    // Let's implement a forward pass on the provided history (assuming it's long enough) to find the current state.

    const sortedHistory = [...history].sort((a, b) => a.numero - b.numero); // Oldest to newest
    const currentCycleSet = new Set<number>();

    for (const game of sortedHistory) {
        game.listaDezenas.forEach(n => currentCycleSet.add(n));
        if (currentCycleSet.size === 25) {
            currentCycleSet.clear(); // Cycle closed, start new
        }
    }

    // currentCycleSet now contains the numbers drawn in the CURRENT open cycle.
    // Missing numbers are 1..25 minus currentCycleSet.
    const missing: number[] = [];
    for (let i = 1; i <= 25; i++) {
        if (!currentCycleSet.has(i)) {
            missing.push(i);
        }
    }

    return missing;
};


// Helper to check if a game matches typical Lotofacil patterns
const isValidPattern = (numbers: number[], previousGameDezenas?: number[]): boolean => {
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const sum = numbers.reduce((a, b) => a + b, 0);
  const primesCount = numbers.filter(n => PRIMES.has(n)).length;
  const fibCount = numbers.filter(n => FIBONACCI.has(n)).length;
  const borderCount = numbers.filter(n => BORDER.has(n)).length;

  // Pattern 1: Balanced Odd/Even (usually 8/7, 7/8, 9/6 or 6/9)
  const validParity = (oddCount >= 6 && oddCount <= 9);

  // Pattern 2: Sum range (usually 180 - 220)
  const validSum = (sum >= 170 && sum <= 230); // Slightly wider range for flexibility

  // Pattern 3: Repeats from previous game (usually 8, 9, or 10)
  let validRepeats = true;
  if (previousGameDezenas) {
    const repeats = numbers.filter(n => previousGameDezenas.includes(n)).length;
    // Tightened from 7-11 to 8-10 for higher "Smart" accuracy based on Bell Curve
    validRepeats = (repeats >= 8 && repeats <= 10);
  }

  // Additional Patterns
  const validPrimes = (primesCount >= 4 && primesCount <= 7); // Usually 5 or 6
  const validFib = (fibCount >= 3 && fibCount <= 6); // Usually 4 or 5
  const validBorder = (borderCount >= 8 && borderCount <= 11); // Usually 9 or 10

  return validParity && validSum && validRepeats && validPrimes && validFib && validBorder;
};

// Weighted Random Selection Algorithm
const getWeightedRandomSubset = (
  items: number[],
  weights: Map<number, number>,
  count: number
): number[] => {
  const selection = new Set<number>();
  const pool = [...items];

  // Safety check: ensure we have enough items
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
      pool.splice(selectedIndex, 1); // Remove from pool
    } else {
        // Fallback
        selection.add(pool[0]);
        pool.shift();
    }
  }

  return Array.from(selection).sort((a, b) => a - b);
};


export const generateSmartGame = (history: LotofacilResult[], previousGameOverride?: LotofacilResult): number[] => {
  if (history.length === 0) return [];

  // Use override if provided (for simulation), else latest from history
  const latestGame = previousGameOverride || history[0];

  // 1. Calculate Frequencies
  const frequencyMap = new Map<number, number>();
  // Initialize
  for (let i = 1; i <= 25; i++) frequencyMap.set(i, 0);

  const numGames = history.length;
  history.forEach(game => {
      game.listaDezenas.forEach(num => {
          frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
      });
  });

  // 2. Identify Cycle Missing Numbers
  const missingInCycle = getCycleMissingNumbers(history);

  // 3. Build Weights
  const weights = new Map<number, number>();
  for (let i = 1; i <= 25; i++) {
      const freq = frequencyMap.get(i) || 0;
      const normalizedFreq = freq / numGames; // 0 to 1

      let weight = 1.0; // Base

      // Frequency Weight: Up to +2.0
      weight += normalizedFreq * 2.0;

      // Cycle Weight: Huge boost if missing
      // If a number is missing in the cycle, it is highly likely to appear soon
      if (missingInCycle.includes(i)) {
          weight += 3.0;
      }

      weights.set(i, weight);
  }

  const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  let bestCandidate: number[] = [];
  let attempts = 0;
  const maxAttempts = 10000; // Increased attempts due to stricter filters

  while (attempts < maxAttempts) {
    // Generate based on weights
    const selection = getWeightedRandomSubset(allNumbers, weights, 15);

    // Check if valid against pattern constraints
    if (isValidPattern(selection, latestGame?.listaDezenas)) {
      return selection;
    }

    if (attempts === 0) bestCandidate = selection;
    attempts++;
  }

  // If we couldn't find a perfect match, return the first random one (better than nothing)
  return bestCandidate;
};

// Simulation / Walk-Forward Validation
export const simulateBacktest = (fullHistory: LotofacilResult[], numSimulations: number = 20): SimulationResult => {
    // We need at least (numSimulations + training_size) games.
    // Let's say we need 50 games for training stats.
    if (fullHistory.length < numSimulations + 10) {
        return {
            gamesSimulated: 0,
            averageHits: 0,
            totalHits: 0,
            accuracyDistribution: {}
        };
    }

    // Sort history oldest to newest for easier slicing, or keep newest to oldest (default) and slice carefully.
    // Default is newest [0] to oldest [N].
    // To predict game at index `i` (which is `fullHistory[i]`), we can only use `fullHistory[i+1 ... end]`.

    let totalHits = 0;
    const accuracyDistribution: { [key: number]: number } = {};
    let gamesSimulated = 0;

    // We simulate the *most recent* `numSimulations` games.
    // i goes from 0 to numSimulations - 1.
    for (let i = 0; i < numSimulations; i++) {
        const targetGame = fullHistory[i];
        const trainingData = fullHistory.slice(i + 1, i + 100); // Use previous 100 games for stats

        if (trainingData.length < 10) break; // Not enough data

        // Predict
        // We pass the "previous game" (which is fullHistory[i+1]) explicitly to generateSmartGame logic
        // But `generateSmartGame` takes `history` as the training data.
        // It uses history[0] as the "latest game" for repeat checks.
        // So passing `trainingData` works perfectly because `trainingData[0]` IS `fullHistory[i+1]`.

        const prediction = generateSmartGame(trainingData);

        // Check hits
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
