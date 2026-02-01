import type { LotofacilResult } from '../game';
import { getCycleMissingNumbers } from './statistics';

// --- Types ---

interface DataPoint {
  features: number[];
  label: number; // 0 or 1
  prediction?: number; // Current raw prediction (log odds)
}

interface TreeNode {
  isLeaf: boolean;
  value?: number;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

// --- Hyperparameters ---
const LEARNING_RATE = 0.1;
const N_ESTIMATORS = 50; // Increased from 30
const MAX_DEPTH = 4; // Increased from 3
const MIN_SAMPLES_SPLIT = 5;
const TRAINING_WINDOW = 100; // Look back 100 games for training

const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);

// --- Helper Functions ---

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

// --- Feature Extraction ---

const extractFeatures = (
  history: LotofacilResult[],
  targetIndex: number, // Index of the game we are predicting (so we use data AFTER this index)
  number: number,
  calculatedMomentum?: Map<number, number>
): number[] => {
    // History: [Newest ... Oldest]
    // If targetIndex is -1 (Future), we use history[0...]
    // If targetIndex is 0 (Latest), we use history[1...]
    const pastStart = targetIndex + 1;

    if (pastStart + 50 >= history.length) return [0,0,0,0,0,0,0,0];

    const past10 = history.slice(pastStart, pastStart + 10);
    const past50 = history.slice(pastStart, pastStart + 50);

    // 1. Freq 10
    let c10 = 0;
    past10.forEach(g => { if(g.listaDezenas.includes(number)) c10++; });
    const freq10 = c10 / 10.0;

    // 2. Freq 50
    let c50 = 0;
    past50.forEach(g => { if(g.listaDezenas.includes(number)) c50++; });
    const freq50 = c50 / 50.0;

    // 3. Delay
    let delay = 0;
    for(let i=pastStart; i<history.length; i++){
        if(history[i].listaDezenas.includes(number)) break;
        delay++;
    }
    const normDelay = Math.min(delay, 25) / 25.0;

    // 4. In Previous
    const prevGame = history[pastStart];
    const inPrev = prevGame && prevGame.listaDezenas.includes(number) ? 1.0 : 0.0;

    // 5. Missing In Cycle
    const cycleHistory = history.slice(pastStart);
    const missingNums = getCycleMissingNumbers(cycleHistory);
    const missing = missingNums.includes(number) ? 1.0 : 0.0;

    // 6. Momentum (Trend)
    let momentum = 0;
    if (calculatedMomentum) {
        momentum = calculatedMomentum.get(number) || 0;
    } else {
         const p10_20 = history.slice(pastStart+10, pastStart+20);
         let c10_20 = 0;
         p10_20.forEach(g => { if(g.listaDezenas.includes(number)) c10_20++; });
         momentum = c10 - c10_20;
    }
    const normMomentum = Math.max(-1, Math.min(1, momentum / 5.0));

    // 7. Is Prime (Static)
    const isPrime = PRIMES.has(number) ? 1.0 : 0.0;

    // 8. Is Odd (Static)
    const isOdd = number % 2 !== 0 ? 1.0 : 0.0;

    return [freq10, freq50, normDelay, inPrev, missing, normMomentum, isPrime, isOdd];
};


// --- Decision Tree Regressor (CART) ---

class DecisionTreeRegressor {
    root: TreeNode | null = null;

    train(data: DataPoint[], residuals: number[], depth: number = 0) {
        this.root = this.buildTree(data, residuals, depth);
    }

    predict(features: number[]): number {
        return this.traverse(this.root, features);
    }

    private buildTree(data: DataPoint[], residuals: number[], depth: number): TreeNode {
        const nSamples = data.length;

        // Leaf condition
        if (depth >= MAX_DEPTH || nSamples < MIN_SAMPLES_SPLIT) {
             const mean = residuals.reduce((a,b) => a+b, 0) / nSamples;
             return { isLeaf: true, value: mean };
        }

        let bestMSE = Infinity;
        let bestFeat = -1;
        let bestThresh = 0;

        // Try all features
        const nFeatures = data[0].features.length;
        for(let f=0; f<nFeatures; f++) {
             // Try random sample of thresholds
             for(let i=0; i<10; i++) {
                 const idx = Math.floor(Math.random() * nSamples);
                 const thresh = data[idx].features[f];

                 const leftIndices: number[] = [];
                 const rightIndices: number[] = [];

                 for(let j=0; j<nSamples; j++) {
                     if (data[j].features[f] <= thresh) leftIndices.push(j);
                     else rightIndices.push(j);
                 }

                 if(leftIndices.length === 0 || rightIndices.length === 0) continue;

                 // Calculate MSE split
                 const leftRes = leftIndices.map(x => residuals[x]);
                 const rightRes = rightIndices.map(x => residuals[x]);

                 const mse = this.calcMSE(leftRes) * leftRes.length + this.calcMSE(rightRes) * rightRes.length;

                 if(mse < bestMSE) {
                     bestMSE = mse;
                     bestFeat = f;
                     bestThresh = thresh;
                 }
             }
        }

        if (bestFeat === -1) {
            const mean = residuals.reduce((a,b) => a+b, 0) / nSamples;
            return { isLeaf: true, value: mean };
        }

        // Split Data
        const leftData: DataPoint[] = [];
        const leftRes: number[] = [];
        const rightData: DataPoint[] = [];
        const rightRes: number[] = [];

        for(let i=0; i<nSamples; i++) {
            if(data[i].features[bestFeat] <= bestThresh) {
                leftData.push(data[i]);
                leftRes.push(residuals[i]);
            } else {
                rightData.push(data[i]);
                rightRes.push(residuals[i]);
            }
        }

        return {
            isLeaf: false,
            featureIndex: bestFeat,
            threshold: bestThresh,
            left: this.buildTree(leftData, leftRes, depth+1),
            right: this.buildTree(rightData, rightRes, depth+1)
        };
    }

    private calcMSE(values: number[]): number {
        if(values.length === 0) return 0;
        const mean = values.reduce((a,b) => a+b, 0) / values.length;
        return values.reduce((a,b) => a + Math.pow(b-mean, 2), 0) / values.length;
    }

    private traverse(node: TreeNode | null, features: number[]): number {
        if (!node) return 0;
        if (node.isLeaf) return node.value || 0;
        if (features[node.featureIndex!] <= node.threshold!) {
            return this.traverse(node.left || null, features);
        } else {
            return this.traverse(node.right || null, features);
        }
    }
}


// --- Gradient Boosting Machine ---

class GradientBoostingClassifier {
    trees: DecisionTreeRegressor[] = [];
    initialPrediction: number = 0; // Log odds

    train(data: DataPoint[]) {
        // 1. Initialize with log(p / (1-p)) where p is mean label
        const mean = data.reduce((a,b) => a + b.label, 0) / data.length;
        // Clip mean to avoid log(0)
        const p = Math.max(0.01, Math.min(0.99, mean));
        this.initialPrediction = Math.log(p / (1 - p));

        // Set initial raw predictions
        data.forEach(d => d.prediction = this.initialPrediction);

        for(let i=0; i<N_ESTIMATORS; i++) {
            // Decay Learning Rate
            // Reduces aggressive updates as we add more trees
            // Simple decay: 0.1 -> 0.09...
            const currentLearningRate = LEARNING_RATE * (1 / (1 + 0.01 * i));

            // 2. Calculate Residuals
            // r = label - sigmoid(prediction)
            const residuals = data.map(d => d.label - sigmoid(d.prediction!));

            // 3. Fit Tree to Residuals
            const tree = new DecisionTreeRegressor();
            tree.train(data, residuals);
            this.trees.push(tree);

            // 4. Update Predictions
            data.forEach(d => {
                const pred = tree.predict(d.features);
                d.prediction = d.prediction! + currentLearningRate * pred;
            });
        }
    }

    predictProb(features: number[]): number {
        let logOdds = this.initialPrediction;
        for(let i=0; i<this.trees.length; i++) {
             const currentLearningRate = LEARNING_RATE * (1 / (1 + 0.01 * i));
             logOdds += currentLearningRate * this.trees[i].predict(features);
        }
        return sigmoid(logOdds);
    }
}


// --- Exported Strategy ---

export const generateGradientBoostingGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    // Need at least enough history to train
    if (history.length < TRAINING_WINDOW + 20) {
        // Fallback to naive random/last
        const all = Array.from({length: 25}, (_, i) => i + 1);
        return all.slice(0, quantity);
    }

    // 1. Prepare Training Data
    const trainingData: DataPoint[] = [];

    // Select a subset of games for training to keep it fast
    // Games 1 to 50
    for(let i=1; i<=50; i++) {
        const targetGame = history[i];
        for(let n=1; n<=25; n++) {
            const label = targetGame.listaDezenas.includes(n) ? 1 : 0;
            const features = extractFeatures(history, i, n);
            trainingData.push({ features, label });
        }
    }

    // 2. Train Model
    const gbm = new GradientBoostingClassifier();
    gbm.train(trainingData);

    // 3. Predict Next Draw (Future)
    const scores: { num: number, prob: number }[] = [];
    for(let n=1; n<=25; n++) {
        const features = extractFeatures(history, -1, n); // -1 = future
        const prob = gbm.predictProb(features);
        scores.push({ num: n, prob });
    }

    // 4. Select Top
    scores.sort((a, b) => b.prob - a.prob);

    return scores.slice(0, quantity).map(s => s.num).sort((a, b) => a - b);
};
