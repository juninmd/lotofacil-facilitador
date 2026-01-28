import type { LotofacilResult } from '../game';
import { getCycleMissingNumbers } from './statistics';

// --- Types & Constants ---

interface DataPoint {
  features: number[];
  label: number; // 0 or 1
}

interface TreeNode {
  isLeaf: boolean;
  value?: number; // For leaf: probability (0.0 to 1.0)
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

const NUM_TREES = 10;
const MAX_DEPTH = 5;
const MIN_SAMPLES_SPLIT = 10;
const TRAINING_WINDOW = 100;

// --- Feature Extraction ---

const extractFeatures = (
  history: LotofacilResult[],
  targetIndex: number,
  number: number
): number[] => {
  // History is sorted Newest [0] -> Oldest [N].
  // We want to predict for game at 'targetIndex'.
  // We use data from 'pastStart' = targetIndex + 1 onwards.

  const pastStart = targetIndex + 1;

  // Safety check
  if (pastStart + 50 >= history.length) {
      return [0,0,0,0,0]; // Not enough history
  }

  const past10 = history.slice(pastStart, pastStart + 10);
  const past50 = history.slice(pastStart, pastStart + 50);

  // 1. Frequency last 10
  let count10 = 0;
  past10.forEach(g => { if (g.listaDezenas.includes(number)) count10++; });
  const freq10 = count10 / 10.0;

  // 2. Frequency last 50
  let count50 = 0;
  past50.forEach(g => { if (g.listaDezenas.includes(number)) count50++; });
  const freq50 = count50 / 50.0;

  // 3. Delay
  let delay = 0;
  for (let i = pastStart; i < history.length; i++) {
    if (history[i].listaDezenas.includes(number)) break;
    delay++;
  }
  const normDelay = Math.min(delay, 25) / 25.0;

  // 4. In Previous Game
  const prevGame = history[pastStart];
  const inPrevious = prevGame && prevGame.listaDezenas.includes(number) ? 1.0 : 0.0;

  // 5. Missing in Cycle
  // Note: This is computationally expensive if done for every sample.
  // We can approximate or just calculate for the target context.
  // For training, let's keep it simple.
  const cycleHistory = history.slice(pastStart);
  const missingNumbers = getCycleMissingNumbers(cycleHistory);
  const missingCycle = missingNumbers.includes(number) ? 1.0 : 0.0;

  return [freq10, freq50, normDelay, inPrevious, missingCycle];
};

// --- Decision Tree Implementation ---

class DecisionTree {
  root: TreeNode | null = null;

  train(data: DataPoint[], depth: number = 0) {
    this.root = this.buildTree(data, depth);
  }

  predict(features: number[]): number {
    return this.traverse(this.root, features);
  }

  private buildTree(data: DataPoint[], depth: number): TreeNode {
    const numSamples = data.length;
    const sumLabels = data.reduce((acc, d) => acc + d.label, 0);
    const meanLabel = sumLabels / numSamples;

    // Stopping criteria
    if (depth >= MAX_DEPTH || numSamples < MIN_SAMPLES_SPLIT || meanLabel === 0 || meanLabel === 1) {
      return { isLeaf: true, value: meanLabel };
    }

    // Find best split
    let bestGini = Infinity;
    let bestFeatureIndex = -1;
    let bestThreshold = 0;

    // Random feature subset (sqrt of total features) for Random Forest variance
    // We have 5 features, let's check 3 random features at each node
    const featureIndices = [0, 1, 2, 3, 4].sort(() => 0.5 - Math.random()).slice(0, 3);

    for (const featIdx of featureIndices) {
      // Check possible thresholds.
      // Optimization: Just check a few percentiles or random values from data
      // For simplicity, we pick 10 random samples and use their values as thresholds
      for (let i = 0; i < 10; i++) {
          const sample = data[Math.floor(Math.random() * data.length)];
          const threshold = sample.features[featIdx];

          const left = data.filter(d => d.features[featIdx] <= threshold);
          const right = data.filter(d => d.features[featIdx] > threshold);

          if (left.length === 0 || right.length === 0) continue;

          const gini = this.calculateGini(left) * left.length + this.calculateGini(right) * right.length;

          if (gini < bestGini) {
              bestGini = gini;
              bestFeatureIndex = featIdx;
              bestThreshold = threshold;
          }
      }
    }

    if (bestFeatureIndex === -1) {
         return { isLeaf: true, value: meanLabel };
    }

    const leftSplit = data.filter(d => d.features[bestFeatureIndex] <= bestThreshold);
    const rightSplit = data.filter(d => d.features[bestFeatureIndex] > bestThreshold);

    return {
        isLeaf: false,
        featureIndex: bestFeatureIndex,
        threshold: bestThreshold,
        left: this.buildTree(leftSplit, depth + 1),
        right: this.buildTree(rightSplit, depth + 1)
    };
  }

  private calculateGini(data: DataPoint[]): number {
      if (data.length === 0) return 0;
      const p1 = data.filter(d => d.label === 1).length / data.length;
      const p0 = 1 - p1;
      return 1 - (p1*p1 + p0*p0);
  }

  private traverse(node: TreeNode | null, features: number[]): number {
      if (!node) return 0.5;
      if (node.isLeaf) return node.value!;

      if (features[node.featureIndex!] <= node.threshold!) {
          return this.traverse(node.left || null, features);
      } else {
          return this.traverse(node.right || null, features);
      }
  }
}

// --- Random Forest Implementation ---

class RandomForest {
    trees: DecisionTree[] = [];

    train(data: DataPoint[]) {
        this.trees = [];
        for (let i = 0; i < NUM_TREES; i++) {
            // Bootstrap Sample (Bagging)
            const sample: DataPoint[] = [];
            for (let j = 0; j < data.length; j++) {
                sample.push(data[Math.floor(Math.random() * data.length)]);
            }

            const tree = new DecisionTree();
            tree.train(sample);
            this.trees.push(tree);
        }
    }

    predict(features: number[]): number {
        if (this.trees.length === 0) return 0;
        let sum = 0;
        for (const tree of this.trees) {
            sum += tree.predict(features);
        }
        return sum / this.trees.length;
    }
}

// --- Main Export ---

export const generateRandomForestGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    // 1. Gather Training Data
    // We treat all numbers (1-25) and their history as samples.
    // X = Features of Number N at Game G
    // Y = Did Number N appear in Game G?

    if (history.length < TRAINING_WINDOW + 20) {
        // Fallback
        const all = Array.from({length: 25}, (_, i) => i + 1);
        return all.slice(0, quantity);
    }

    const data: DataPoint[] = [];

    // We train on the last TRAINING_WINDOW games
    // For each game i (from 1 to TRAINING_WINDOW), we see if num appeared.
    // 'i' is the target index.

    for (let i = 1; i <= TRAINING_WINDOW; i++) {
        const targetGame = history[i];

        // Optimization: Don't use ALL 25 numbers for every game to keep training size manageable.
        // But for quality, we should. 25 * 100 = 2500 samples. It's fine for JS.
        for (let num = 1; num <= 25; num++) {
            const label = targetGame.listaDezenas.includes(num) ? 1 : 0;
            const features = extractFeatures(history, i, num);
            data.push({ features, label });
        }
    }

    // 2. Train Random Forest
    const rf = new RandomForest();
    rf.train(data);

    // 3. Predict Next Game (Index -1 effectively, future)
    // We want to predict for the "upcoming" game.
    // In our extractFeatures logic, targetIndex -1 means we use history[0...] as past.
    // But since extractFeatures(..., targetIndex, ...) uses targetIndex+1 as start,
    // we need to pass -1 so that start = 0.

    const scores: { num: number, prob: number }[] = [];

    for (let num = 1; num <= 25; num++) {
        const features = extractFeatures(history, -1, num);
        const prob = rf.predict(features);
        scores.push({ num, prob });
    }

    // 4. Select Top
    scores.sort((a, b) => b.prob - a.prob);

    return scores.slice(0, quantity).map(s => s.num).sort((a, b) => a - b);
};
