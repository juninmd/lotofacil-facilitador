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

// Helper to check if a game matches typical Lotofacil patterns
const isValidPattern = (numbers: number[], previousGameDezenas?: number[]): boolean => {
  const oddCount = numbers.filter(n => n % 2 !== 0).length;
  const sum = numbers.reduce((a, b) => a + b, 0);

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

  return validParity && validSum && validRepeats;
};

// Weighted Random Selection Algorithm
const getWeightedRandomSubset = (
  items: number[],
  weights: Map<number, number>,
  count: number
): number[] => {
  const selection = new Set<number>();
  const pool = [...items];

  while (selection.size < count && pool.length > 0) {
    // Calculate total weight of currently available pool
    let totalWeight = 0;
    for (const num of pool) {
      // Base weight 1 + Frequency weight
      // We square the frequency to give even more weight to hot numbers ("Temperature" parameter)
      // Or keep linear. Linear is safer. Let's do Linear + Base.
      totalWeight += (weights.get(num) || 0) + 2; // +2 base weight to ensure cold numbers aren't impossible
    }

    let random = Math.random() * totalWeight;
    let selectedIndex = -1;

    for (let i = 0; i < pool.length; i++) {
      const num = pool[i];
      const weight = (weights.get(num) || 0) + 2;
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
        // Fallback for floating point errors
        selection.add(pool[0]);
        pool.shift();
    }
  }

  return Array.from(selection).sort((a, b) => a - b);
};


export const generateSmartGame = (history: LotofacilResult[]): number[] => {
  if (history.length === 0) return [];

  const latestGame = history[0];

  // 1. Calculate Frequencies from the provided history
  const frequencyMap = new Map<number, number>();
  // Initialize 1-25 with 0
  for (let i = 1; i <= 25; i++) frequencyMap.set(i, 0);

  history.forEach(game => {
      game.listaDezenas.forEach(num => {
          frequencyMap.set(num, (frequencyMap.get(num) || 0) + 1);
      });
  });

  const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  let bestCandidate: number[] = [];
  let attempts = 0;
  const maxAttempts = 5000;

  while (attempts < maxAttempts) {
    // Generate based on weights
    const selection = getWeightedRandomSubset(allNumbers, frequencyMap, 15);

    // Check if valid against pattern constraints
    if (isValidPattern(selection, latestGame?.listaDezenas)) {
      return selection;
    }

    if (attempts === 0) bestCandidate = selection;
    attempts++;
  }

  return bestCandidate;
};
