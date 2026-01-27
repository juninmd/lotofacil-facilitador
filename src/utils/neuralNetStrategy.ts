import * as tf from '@tensorflow/tfjs';
import type { LotofacilResult } from '../game';

// Constants
const NUMBERS_COUNT = 25;
const INPUT_WINDOW = 10; // Use last 10 games as input features
const EPOCHS = 50; // Moderate training

// Convert game numbers to a binary vector [0, 1, 0, 0, 1...]
const gameToVector = (numbers: number[]): number[] => {
  const vector = new Array(NUMBERS_COUNT).fill(0);
  numbers.forEach(n => {
    if (n >= 1 && n <= NUMBERS_COUNT) {
      vector[n - 1] = 1;
    }
  });
  return vector;
};

// Flatten a list of game vectors into a single input array
const flattenHistory = (vectors: number[][]): number[] => {
    // vectors[0] is most recent in the window?
    // We want the input to be deterministic. Let's say [Latest, ..., Oldest]
    return vectors.flat();
};

export const generateNeuralNetGame = async (
  history: LotofacilResult[],
  quantity: number = 15
): Promise<number[]> => {
  if (history.length < INPUT_WINDOW + 20) {
    console.warn('Not enough history for NeuralNet training. Returning random.');
    return Array.from({ length: quantity }, () => Math.floor(Math.random() * 25) + 1);
  }

  // 1. Prepare Data
  // History is sorted Newest -> Oldest.
  // We need to create pairs of (InputWindow -> Target).
  // Target is game at index `i`. Input is `i+1` to `i+INPUT_WINDOW`.

  const inputs: number[][] = [];
  const outputs: number[][] = [];

  // Iterate through history to create training samples
  // We can go up to history.length - INPUT_WINDOW
  for (let i = 0; i < history.length - INPUT_WINDOW; i++) {
      const targetGame = history[i];
      const inputWindowGames = history.slice(i + 1, i + 1 + INPUT_WINDOW);

      const targetVector = gameToVector(targetGame.listaDezenas);
      const inputVectors = inputWindowGames.map(g => gameToVector(g.listaDezenas));

      inputs.push(flattenHistory(inputVectors));
      outputs.push(targetVector);
  }

  // Convert to Tensors
  // Limit training data to recent history to keep it fast (e.g., last 200 games)
  const limit = 200;
  const limitedInputs = inputs.slice(0, limit);
  const limitedOutputs = outputs.slice(0, limit);

  const xs = tf.tensor2d(limitedInputs);
  const ys = tf.tensor2d(limitedOutputs);

  // 2. Build Model (MLP)
  const model = tf.sequential();

  // Input Layer + Hidden 1
  model.add(tf.layers.dense({
    units: 128,
    activation: 'relu',
    inputShape: [INPUT_WINDOW * NUMBERS_COUNT]
  }));

  model.add(tf.layers.dropout({ rate: 0.3 }));

  // Hidden 2
  model.add(tf.layers.dense({
    units: 64,
    activation: 'relu'
  }));

  // Output Layer (25 independent probabilities)
  model.add(tf.layers.dense({
    units: NUMBERS_COUNT,
    activation: 'sigmoid'
  }));

  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  // 3. Train
  await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: 32,
    shuffle: true,
    verbose: 0
  });

  // 4. Predict Next Game
  // Input is the MOST RECENT window (history[0]...history[INPUT_WINDOW-1])
  const currentWindowGames = history.slice(0, INPUT_WINDOW);
  const currentInputVectors = currentWindowGames.map(g => gameToVector(g.listaDezenas));
  const currentInputFlat = flattenHistory(currentInputVectors);

  const inputTensor = tf.tensor2d([currentInputFlat]);

  const predictionTensor = model.predict(inputTensor) as tf.Tensor;
  const predictionArray = (await predictionTensor.data()) as Float32Array;

  // Cleanup
  xs.dispose();
  ys.dispose();
  inputTensor.dispose();
  predictionTensor.dispose();
  model.dispose();

  // 5. Select
  const candidates = Array.from(predictionArray).map((prob, index) => ({
    number: index + 1,
    prob: prob
  }));

  candidates.sort((a, b) => b.prob - a.prob);

  const selection = candidates.slice(0, quantity).map(c => c.number);
  return selection.sort((a, b) => a - b);
};
