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
const LEARNING_RATE = 0.05; // Lower learning rate
const N_ESTIMATORS = 100; // More trees
const MAX_DEPTH = 5; // Slightly deeper
const MIN_SAMPLES_SPLIT = 5;
const TRAINING_WINDOW = 100; // Look back 100 games for training
const LAMBDA = 1.0; // L2 Regularization
const SUBSAMPLE = 0.7; // Row subsampling
const COLSAMPLE = 0.8; // Feature subsampling

const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23]);
const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21]);
const FRAME = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

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

    if (pastStart + 50 >= history.length) return Array(10).fill(0);

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

    // 9. Is Fibonacci
    const isFib = FIBONACCI.has(number) ? 1.0 : 0.0;

    // 10. Is Frame
    const isFrame = FRAME.has(number) ? 1.0 : 0.0;

    return [freq10, freq50, normDelay, inPrev, missing, normMomentum, isPrime, isOdd, isFib, isFrame];
};


// --- Decision Tree Regressor (XGBoost Style) ---

class XGBoostTree {
    root: TreeNode | null = null;

    train(data: DataPoint[], residuals: number[], depth: number = 0) {
        this.root = this.buildTree(data, residuals, depth);
    }

    predict(features: number[]): number {
        return this.traverse(this.root, features);
    }

    private calcScore(residuals: number[]): number {
        // Score = (Sum(Residuals))^2 / (Count + Lambda)
        // Ignoring Hessian for simplicity (H=1 for MSE), so effectively L2 Regularized Mean
        if (residuals.length === 0) return 0;
        const sum = residuals.reduce((a,b) => a+b, 0);
        return (sum * sum) / (residuals.length + LAMBDA);
    }

    private calcWeight(residuals: number[]): number {
        // Weight = Sum(Residuals) / (Count + Lambda)
        if (residuals.length === 0) return 0;
        const sum = residuals.reduce((a,b) => a+b, 0);
        return sum / (residuals.length + LAMBDA);
    }

    private buildTree(data: DataPoint[], residuals: number[], depth: number): TreeNode {
        const nSamples = data.length;

        // Leaf condition
        if (depth >= MAX_DEPTH || nSamples < MIN_SAMPLES_SPLIT) {
             return { isLeaf: true, value: this.calcWeight(residuals) };
        }

        let bestGain = 0; // XGBoost split gain
        let bestFeat = -1;
        let bestThresh = 0;

        const currentScore = this.calcScore(residuals);

        // Feature Subsampling (Column Sampling)
        const nFeatures = data[0].features.length;
        const featureIndices = Array.from({length: nFeatures}, (_, i) => i);
        // Shuffle and pick subset
        for(let i = featureIndices.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [featureIndices[i], featureIndices[j]] = [featureIndices[j], featureIndices[i]];
        }
        const selectedFeatures = featureIndices.slice(0, Math.ceil(nFeatures * COLSAMPLE));

        // Try selected features
        for(const f of selectedFeatures) {
             // Histogram-like approximation: Try random sample of thresholds
             const thresholdsToCheck = 10;
             for(let i=0; i<thresholdsToCheck; i++) {
                 const idx = Math.floor(Math.random() * nSamples);
                 const thresh = data[idx].features[f];

                 const leftIndices: number[] = [];
                 const rightIndices: number[] = [];
                 const leftRes: number[] = [];
                 const rightRes: number[] = [];

                 for(let j=0; j<nSamples; j++) {
                     if (data[j].features[f] <= thresh) {
                         leftIndices.push(j);
                         leftRes.push(residuals[j]);
                     } else {
                         rightIndices.push(j);
                         rightRes.push(residuals[j]);
                     }
                 }

                 if(leftIndices.length === 0 || rightIndices.length === 0) continue;

                 // Calculate Gain
                 const leftScore = this.calcScore(leftRes);
                 const rightScore = this.calcScore(rightRes);

                 // Gain = 0.5 * [GL^2/(HL+L) + GR^2/(HR+L) - (G)^2/(H+L)] - Gamma
                 // Here simplified: ScoreLeft + ScoreRight - CurrentScore
                 const gain = leftScore + rightScore - currentScore;

                 if(gain > bestGain) {
                     bestGain = gain;
                     bestFeat = f;
                     bestThresh = thresh;
                 }
             }
        }

        if (bestFeat === -1 || bestGain <= 0) {
            return { isLeaf: true, value: this.calcWeight(residuals) };
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


// --- XGBoost Model ---

class XGBoostModel {
    trees: XGBoostTree[] = [];
    initialPrediction: number = 0; // Log odds

    train(data: DataPoint[]) {
        // 1. Initialize with log(p / (1-p))
        const mean = data.reduce((a,b) => a + b.label, 0) / data.length;
        const p = Math.max(0.01, Math.min(0.99, mean));
        this.initialPrediction = Math.log(p / (1 - p));

        data.forEach(d => d.prediction = this.initialPrediction);

        for(let i=0; i<N_ESTIMATORS; i++) {
            // Row Subsampling (Bagging)
            const sampleSize = Math.floor(data.length * SUBSAMPLE);
            const indices = Array.from({length: data.length}, (_, i) => i);
            // Shuffle
            for(let j=indices.length-1; j>0; j--){
                const k = Math.floor(Math.random() * (j+1));
                [indices[j], indices[k]] = [indices[k], indices[j]];
            }
            const sampleIndices = indices.slice(0, sampleSize);

            const sampleData = sampleIndices.map(idx => data[idx]);

            // Calculate Residuals for sample
            // r = label - sigmoid(prediction)
            // Using predictions from FULL model so far
            const residuals = sampleData.map(d => d.label - sigmoid(d.prediction!));

            // Fit Tree
            const tree = new XGBoostTree();
            tree.train(sampleData, residuals);
            this.trees.push(tree);

            // Update All Predictions (using new tree, scaled by learning rate)
            data.forEach(d => {
                const pred = tree.predict(d.features);
                d.prediction = d.prediction! + LEARNING_RATE * pred;
            });
        }
    }

    predictProb(features: number[]): number {
        let logOdds = this.initialPrediction;
        for(let i=0; i<this.trees.length; i++) {
             logOdds += LEARNING_RATE * this.trees[i].predict(features);
        }
        return sigmoid(logOdds);
    }
}


// --- Exported Strategy ---

export const generateXGBoostGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    // Need at least enough history to train
    if (history.length < TRAINING_WINDOW + 20) {
        // Fallback
        const all = Array.from({length: 25}, (_, i) => i + 1);
        return all.slice(0, quantity);
    }

    // 1. Prepare Training Data
    const trainingData: DataPoint[] = [];

    // Select a subset of games for training
    // Games 1 to 100
    for(let i=1; i<=100; i++) {
        const targetGame = history[i];
        if (!targetGame) break;
        for(let n=1; n<=25; n++) {
            const label = targetGame.listaDezenas.includes(n) ? 1 : 0;
            const features = extractFeatures(history, i, n);
            trainingData.push({ features, label });
        }
    }

    // 2. Train Model
    const xgb = new XGBoostModel();
    xgb.train(trainingData);

    // 3. Predict Next Draw (Future)
    const scores: { num: number, prob: number }[] = [];
    for(let n=1; n<=25; n++) {
        const features = extractFeatures(history, -1, n); // -1 = future
        const prob = xgb.predictProb(features);
        scores.push({ num: n, prob });
    }

    // 4. Select Top
    scores.sort((a, b) => b.prob - a.prob);

    return scores.slice(0, quantity).map(s => s.num).sort((a, b) => a - b);
};
