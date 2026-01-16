import type { LotofacilResult } from '../game';

export interface BacktestResult {
  11: number;
  12: number;
  13: number;
  14: number;
  15: number;
  totalGames: number;
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

export const backtestGame = (selection: number[], history: LotofacilResult[]): BacktestResult => {
  const result: BacktestResult = {
    11: 0,
    12: 0,
    13: 0,
    14: 0,
    15: 0,
    totalGames: history.length,
  };

  const selectionSet = new Set(selection);

  history.forEach(game => {
    let hits = 0;
    game.listaDezenas.forEach(num => {
      if (selectionSet.has(num)) hits++;
    });

    if (hits >= 11 && hits <= 15) {
      result[hits as 11 | 12 | 13 | 14 | 15]++;
    }
  });

  return result;
};

// Helper to check if a game matches typical Lotofacil patterns
const isValidPattern = (numbers: number[], previousGameDezenas?: number[]): boolean => {
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const sum = numbers.reduce((a, b) => a + b, 0);

  // Pattern 1: Balanced Odd/Even (usually 8/7 or 7/8, sometimes 9/6 or 6/9)
  const validParity = (oddCount >= 6 && oddCount <= 9);

  // Pattern 2: Sum range (usually 180 - 220)
  const validSum = (sum >= 170 && sum <= 230); // Slightly wider range for flexibility

  // Pattern 3: Repeats from previous game (usually 8, 9, or 10)
  let validRepeats = true;
  if (previousGameDezenas) {
    const repeats = numbers.filter(n => previousGameDezenas.includes(n)).length;
    validRepeats = (repeats >= 7 && repeats <= 11);
  }

  return validParity && validSum && validRepeats;
};

export const generateSmartGame = (history: LotofacilResult[]): number[] => {
  if (history.length === 0) return [];

  const latestGame = history[0]; // Assumes sorted descending (newest first)

  // Weighted selection helper
  // We give higher weight to numbers that appear more often, BUT we also want to mix in some "cold" numbers?
  // Actually, standard strategy is usually following the trend.
  // Let's use a simplified weight: Count in last X games.

  const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  let bestCandidate: number[] = [];
  let attempts = 0;
  const maxAttempts = 2000;

  while (attempts < maxAttempts) {
    // Shuffle with weights
    // Create a pool where numbers exist N times based on their weight?
    // Or just simple shuffle and check constraints?
    // Let's try a hybrid:
    // 1. Pick 9-10 numbers from the "Hot" half (top 15 frequent)
    // 2. Pick 5-6 numbers from the "Cold" half (bottom 10)
    // Then check patterns.

    // Actually, pure random with constraints is often very strong statistically because it mimics the randomness
    // but filters for the "bell curve" of probability distributions (sum, parity).

    const available = [...allNumbers];

    // We can use the frequency to slightly bias the shuffle if we want,
    // but let's try pure random + constraints first as it's cleaner.
    // If we want "AI" feel, we should maybe ensure we include some top frequent numbers.

    // Shuffle available
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    const selection = available.slice(0, 15).sort((a, b) => a - b);

    // Check if valid
    if (isValidPattern(selection, latestGame?.listaDezenas)) {
      return selection;
    }

    // Keep the first generated one just in case we never find a perfect one
    if (attempts === 0) bestCandidate = selection;
    attempts++;
  }

  return bestCandidate;
};
