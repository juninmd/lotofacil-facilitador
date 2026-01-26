import type { LotofacilResult } from '../game';
import { getCycleMissingNumbers } from './statistics';

// Constants
const NUMBERS_COUNT = 25;
const LEARNING_RATE = 0.05;
const EPOCHS = 100;
const TRAINING_WINDOW = 50; // Train on last 50 games

interface Features {
  freq10: number;
  freq50: number;
  delay: number;
  inPrevious: number;
  missingCycle: number;
  bias: number;
}

// Helper: Sigmoid Activation
const sigmoid = (z: number): number => {
  return 1 / (1 + Math.exp(-z));
};

// Helper: Extract Features for a specific number at a specific point in history
// targetIndex: The index in 'history' we are trying to predict (so we look at history[targetIndex+1...])
const extractFeatures = (
  history: LotofacilResult[],
  targetIndex: number,
  number: number
): Features => {
  // We need data *before* the targetIndex.
  // History is sorted Newest [0] -> Oldest [N].
  // So "past" relative to targetIndex starts at targetIndex + 1.

  const pastStart = targetIndex + 1;
  const past10 = history.slice(pastStart, pastStart + 10);
  const past50 = history.slice(pastStart, pastStart + 50);

  // 1. Frequency in last 10
  let count10 = 0;
  past10.forEach(g => { if (g.listaDezenas.includes(number)) count10++; });
  const freq10 = count10 / 10.0;

  // 2. Frequency in last 50
  let count50 = 0;
  past50.forEach(g => { if (g.listaDezenas.includes(number)) count50++; });
  const freq50 = count50 / 50.0; // Normalize (approx)

  // 3. Current Delay (Days since last appearance relative to pastStart)
  let delay = 0;
  // Scan backwards from pastStart
  for (let i = pastStart; i < history.length; i++) {
    if (history[i].listaDezenas.includes(number)) {
      break;
    }
    delay++;
  }
  // Normalize delay (e.g., divided by 20. If > 20, clamp it)
  const normDelay = Math.min(delay, 25) / 25.0;

  // 4. In Previous Game
  // The "previous" game relative to the target is history[pastStart]
  const prevGame = history[pastStart];
  const inPrevious = prevGame && prevGame.listaDezenas.includes(number) ? 1.0 : 0.0;

  // 5. Missing in Cycle
  // We calculate the cycle based on history starting from pastStart
  const cycleHistory = history.slice(pastStart);
  const missingNumbers = getCycleMissingNumbers(cycleHistory);
  const missingCycle = missingNumbers.includes(number) ? 1.0 : 0.0;

  return {
    freq10,
    freq50,
    delay: normDelay,
    inPrevious,
    missingCycle,
    bias: 1.0
  };
};

// Main function to generate game
export const generateRegressionGame = (
  history: LotofacilResult[],
  quantity: number = 15
): number[] => {
  if (history.length < TRAINING_WINDOW + 20) {
    // Fallback if not enough history
    const all = Array.from({ length: 25 }, (_, i) => i + 1);
    return all.slice(0, quantity);
  }

  // 1. Train Weights
  // We want to learn weights [w_freq10, w_freq50, w_delay, w_inPrev, w_missing, w_bias]
  let weights = [0.1, 0.1, 0.1, 0.1, 0.5, 0.0]; // Initialize with some heuristic guess

  // Training Loop
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    // Iterate over the training window (e.g., predict game 0, 1, 2... up to 50)
    // Actually, we simulate "past" predictions.
    // Let's predict games from index 1 to 50 (using data from i+1 onwards)

    let totalError = 0;

    for (let i = 1; i <= TRAINING_WINDOW; i++) {
      const targetGame = history[i]; // The game we want to predict result for

      // For each number 1-25
      for (let num = 1; num <= 25; num++) {
        const features = extractFeatures(history, i, num);

        // Calculate Prediction (Hypothesis)
        const z = (weights[0] * features.freq10) +
                  (weights[1] * features.freq50) +
                  (weights[2] * features.delay) +
                  (weights[3] * features.inPrevious) +
                  (weights[4] * features.missingCycle) +
                  (weights[5] * features.bias);

        const predictedProb = sigmoid(z);

        // Actual Result (1 if appeared, 0 if not)
        const actual = targetGame.listaDezenas.includes(num) ? 1.0 : 0.0;

        // Error (Difference)
        const error = predictedProb - actual;
        totalError += Math.abs(error);

        // Update Weights (Gradient Descent)
        // w = w - alpha * error * feature
        weights[0] -= LEARNING_RATE * error * features.freq10;
        weights[1] -= LEARNING_RATE * error * features.freq50;
        weights[2] -= LEARNING_RATE * error * features.delay;
        weights[3] -= LEARNING_RATE * error * features.inPrevious;
        weights[4] -= LEARNING_RATE * error * features.missingCycle;
        weights[5] -= LEARNING_RATE * error * features.bias;
      }
    }
  }

  // 2. Predict Next Game (Index -1 effectively, or using current history as past)
  // We use index -1 notation to imply we want features for the *upcoming* game
  // logic: extractFeatures takes 'targetIndex'.
  // If targetIndex is -1, it means "future".
  // Inside extractFeatures: pastStart = -1 + 1 = 0. So it uses history[0...] as past. Correct.

  const scores: { num: number, prob: number }[] = [];

  for (let num = 1; num <= 25; num++) {
    const features = extractFeatures(history, -1, num);
    const z = (weights[0] * features.freq10) +
              (weights[1] * features.freq50) +
              (weights[2] * features.delay) +
              (weights[3] * features.inPrevious) +
              (weights[4] * features.missingCycle) +
              (weights[5] * features.bias);

    const prob = sigmoid(z);
    scores.push({ num, prob });
  }

  // 3. Select Top Quantity
  scores.sort((a, b) => b.prob - a.prob);

  return scores.slice(0, quantity).map(s => s.num).sort((a, b) => a - b);
};
