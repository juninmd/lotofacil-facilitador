import type { LotofacilResult } from '../game';

// Helper: Duplicate from statistics.ts to avoid circular dependency
const getCycleMissingNumbers = (history: LotofacilResult[]): number[] => {
    const currentCycleSet = new Set<number>();
    const sortedHistory = [...history].sort((a, b) => a.numero - b.numero);

    for (const game of sortedHistory) {
        game.listaDezenas.forEach(n => currentCycleSet.add(n));
        if (currentCycleSet.size === 25) {
            currentCycleSet.clear();
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

// Features configuration
interface Features {
    inLast: boolean;     // Was in t-1
    in2ndLast: boolean;  // Was in t-2
    isHot: boolean;      // Freq in last 10 > Avg
    isDue: boolean;      // Delay > Avg
    isMissingCycle: boolean;
}

// Data point for training
interface DataPoint {
    features: Features;
    appeared: boolean; // Did it appear in target game?
}

const extractFeatures = (
    history: LotofacilResult[],
    targetIndex: number, // The game index we are predicting FOR (so we use history from targetIndex+1...)
    number: number
): Features => {
    // history is desc: [0]=newest, [1]=older
    // targetIndex is the game we want to predict.
    // So we use history starting at pastStart = targetIndex + 1.

    const pastStart = targetIndex + 1;

    // Safety check
    if (pastStart + 12 >= history.length) {
         // Default fallback features
         return { inLast: false, in2ndLast: false, isHot: false, isDue: false, isMissingCycle: false };
    }

    const pastGame1 = history[pastStart]; // t-1
    const pastGame2 = history[pastStart + 1]; // t-2

    const inLast = pastGame1.listaDezenas.includes(number);
    const in2ndLast = pastGame2.listaDezenas.includes(number);

    // Calc Hot (Freq last 10 relative to pastStart)
    const recentGames = history.slice(pastStart, pastStart + 10);
    let freq = 0;
    recentGames.forEach(g => { if(g.listaDezenas.includes(number)) freq++; });
    const isHot = freq >= 6; // Avg is 15/25 * 10 = 6.

    // Calc Due (Delay)
    let delay = 0;
    for(let i = pastStart; i < history.length; i++) {
        if (history[i].listaDezenas.includes(number)) break;
        delay++;
    }
    // Avg delay is roughly 1.6 games (25/15). Let's say due if > 3.
    const isDue = delay > 3;

    // Missing Cycle
    const cycleHistory = history.slice(pastStart);
    const missing = getCycleMissingNumbers(cycleHistory);
    const isMissingCycle = missing.includes(number);

    return { inLast, in2ndLast, isHot, isDue, isMissingCycle };
};

// Naive Bayes Classifier (Bernoulli)
class NaiveBayesClassifier {
    // Counts for each feature being True when Class is True (Appeared) vs False (Not Appeared)
    // counts[featureName][0] -> Feature False, Class False
    // counts[featureName][1] -> Feature True, Class False
    // counts[featureName][2] -> Feature False, Class True
    // counts[featureName][3] -> Feature True, Class True
    stats: Record<keyof Features, number[]> = {
        inLast: [0,0,0,0],
        in2ndLast: [0,0,0,0],
        isHot: [0,0,0,0],
        isDue: [0,0,0,0],
        isMissingCycle: [0,0,0,0]
    };

    totalPositive = 0;
    totalNegative = 0;

    train(data: DataPoint[]) {
        data.forEach(point => {
            const isPositive = point.appeared;
            if (isPositive) this.totalPositive++;
            else this.totalNegative++;

            (Object.keys(point.features) as Array<keyof Features>).forEach(key => {
                const featVal = point.features[key];
                // Index mapping:
                // 0: neg class, feat false
                // 1: neg class, feat true
                // 2: pos class, feat false
                // 3: pos class, feat true
                let idx = 0;
                if (isPositive) idx += 2;
                if (featVal) idx += 1;

                this.stats[key][idx]++;
            });
        });
    }

    // Returns Log Odds (Higher is better probability)
    predictLogOdds(features: Features): number {
        // Prior Odds
        const total = this.totalPositive + this.totalNegative;
        if (total === 0) return 0;

        const probPos = this.totalPositive / total;
        const probNeg = this.totalNegative / total;

        let logOdds = Math.log(probPos / probNeg);

        // Update with Likelihoods
        (Object.keys(features) as Array<keyof Features>).forEach(key => {
            const val = features[key];

            // Laplace Smoothing (+1)
            const countPosTrue = this.stats[key][3] + 1;
            const countPosFalse = this.stats[key][2] + 1;
            const totalPos = this.totalPositive + 2;

            const countNegTrue = this.stats[key][1] + 1;
            const countNegFalse = this.stats[key][0] + 1;
            const totalNeg = this.totalNegative + 2;

            const p_Feat_Given_Pos = val ? (countPosTrue / totalPos) : (countPosFalse / totalPos);
            const p_Feat_Given_Neg = val ? (countNegTrue / totalNeg) : (countNegFalse / totalNeg);

            logOdds += Math.log(p_Feat_Given_Pos / p_Feat_Given_Neg);
        });

        return logOdds;
    }
}

export const generateBayesianGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    // Need enough history for training
    if (history.length < 50) {
        const all = Array.from({length: 25}, (_, i) => i + 1);
        return all.slice(0, quantity);
    }

    // 1. Train a Classifier for EACH number
    // Why separate? Because "being hot" might mean different things for number 1 vs number 25 (theoretically).
    // But typically in Lottery, numbers are symmetric.
    // Let's use a *Global* classifier model to learn general patterns (e.g., "Do hot numbers tend to stay hot?"),
    // but apply it to each number's specific features.
    // This gives us more training data (History Length * 25 samples).

    const classifier = new NaiveBayesClassifier();
    const trainingData: DataPoint[] = [];

    // Use last 100 games for training
    const trainingLimit = Math.min(history.length - 20, 100);

    for (let i = 1; i <= trainingLimit; i++) {
        const targetGame = history[i];

        for (let num = 1; num <= 25; num++) {
            const appeared = targetGame.listaDezenas.includes(num);
            const features = extractFeatures(history, i, num);
            trainingData.push({ features, appeared });
        }
    }

    classifier.train(trainingData);

    // 2. Predict for Next Game (Target Index -1, implies Future)
    // We want features relative to the very latest game (history[0]).
    // extractFeatures(history, -1, num) -> starts at -1 + 1 = 0. Correct.

    const scores: { num: number, score: number }[] = [];

    for (let num = 1; num <= 25; num++) {
        const features = extractFeatures(history, -1, num);
        const logOdds = classifier.predictLogOdds(features);
        scores.push({ num, score: logOdds });
    }

    // 3. Sort by Score (Log Odds)
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, quantity).map(s => s.num).sort((a, b) => a - b);
};
