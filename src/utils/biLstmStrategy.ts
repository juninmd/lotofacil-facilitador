import * as tf from '@tensorflow/tfjs';
import type { LotofacilResult } from '../game';

// Constants
const NUMBERS_COUNT = 25;
const TIME_STEPS = 10; // Look back at 10 previous games to predict the next (increased context)
const EPOCHS = 40; // Slightly more training for deeper model

// Convert game numbers to a binary vector [0, 1, 0, 0, 1...]
const gameToVector = (numbers: number[]): number[] => {
  const vector = new Array(NUMBERS_COUNT).fill(0);
  numbers.forEach(n => {
    if (n >= 1 && n <= NUMBERS_COUNT) {
      vector[n - 1] = 1; // Normalized to 0-1 range
    }
  });
  return vector;
};

// Main function to generate game using Bi-Directional LSTM
export const generateBiLstmGame = async (
  history: LotofacilResult[],
  quantity: number = 15
): Promise<number[]> => {
  if (history.length < 20) {
    console.warn('Not enough history for Bi-LSTM training. Returning random.');
    return Array.from({ length: quantity }, () => Math.floor(Math.random() * 25) + 1);
  }

  // 1. Prepare Data
  // History is usually sorted Newest -> Oldest. We need Chronological (Oldest -> Newest) for training.
  const chronoHistory = [...history].reverse();
  const dataVectors = chronoHistory.map(g => gameToVector(g.listaDezenas));

  const inputs: number[][][] = [];
  const outputs: number[][] = [];

  // Create sequences
  for (let i = 0; i < dataVectors.length - TIME_STEPS; i++) {
    const sequence = dataVectors.slice(i, i + TIME_STEPS);
    const target = dataVectors[i + TIME_STEPS];
    inputs.push(sequence);
    outputs.push(target);
  }

  if (inputs.length === 0) {
      return Array.from({ length: quantity }, () => Math.floor(Math.random() * 25) + 1);
  }

  // Convert to Tensors
  const xs = tf.tensor3d(inputs);
  const ys = tf.tensor2d(outputs);

  // 2. Build Model (Bi-Directional LSTM)
  const model = tf.sequential();

  // Bi-Directional LSTM Layer
  // We wrap the LSTM layer with bidirectional()
  model.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({
          units: 64, // Increased units for better capacity
          returnSequences: false,
      }) as tf.layers.RNN,
      inputShape: [TIME_STEPS, NUMBERS_COUNT]
  }));

  // Dropout for regularization
  model.add(tf.layers.dropout({ rate: 0.3 }));

  // Dense Layer for intermediate feature extraction
  model.add(tf.layers.dense({
      units: 64,
      activation: 'relu'
  }));

  // Output Layer (Sigmoid for multi-label classification - probability of each number)
  model.add(tf.layers.dense({
    units: NUMBERS_COUNT,
    activation: 'sigmoid'
  }));

  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  // 3. Train Model
  await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: 16,
    shuffle: true,
    verbose: 0 // Silent training
  });

  // 4. Predict
  // Prepare the latest sequence (the most recent games)
  const lastSequence = dataVectors.slice(dataVectors.length - TIME_STEPS);
  const inputTensor = tf.tensor3d([lastSequence]);

  const predictionTensor = model.predict(inputTensor) as tf.Tensor;
  const predictionArray = (await predictionTensor.data()) as Float32Array;

  // Cleanup tensors
  xs.dispose();
  ys.dispose();
  inputTensor.dispose();
  predictionTensor.dispose();
  model.dispose(); // Important to free WebGL memory

  // 5. Select Top Numbers
  const candidates = Array.from(predictionArray).map((prob, index) => ({
    number: index + 1,
    prob: prob
  }));

  // Sort by probability descending
  candidates.sort((a, b) => b.prob - a.prob);

  // Take top quantity
  const selection = candidates.slice(0, quantity).map(c => c.number);

  return selection.sort((a, b) => a - b);
};
