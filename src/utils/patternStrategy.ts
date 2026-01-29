import type { LotofacilResult } from '../game';

export const generatePatternGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    // We need at least a few games to find patterns.
    if (history.length < 10) {
        // Fallback to a simple random or range if no history
        const all = Array.from({length: 25}, (_, i) => i + 1);
        return all.slice(0, quantity);
    }

    // 1. Calculate Pair Frequencies (Co-occurrence Matrix)
    // matrix[i][j] = count of times i and j appeared together
    // indices 1-25.
    const matrix = Array.from({ length: 26 }, () => Array(26).fill(0));

    // We can limit history to 100 for relevance, or use all.
    // Let's use up to 100 recent games to capture current trends.
    const sample = history.slice(0, 100);

    sample.forEach(game => {
        const nums = game.listaDezenas;
        for (let i = 0; i < nums.length; i++) {
            for (let j = i + 1; j < nums.length; j++) {
                const n1 = nums[i];
                const n2 = nums[j];
                matrix[n1][n2]++;
                matrix[n2][n1]++;
            }
        }
    });

    // 2. Find the "Best Starting Pair"
    // The pair with the absolute highest frequency.
    let bestPair = [1, 2];
    let maxFreq = -1;

    for (let i = 1; i <= 25; i++) {
        for (let j = i + 1; j <= 25; j++) {
            if (matrix[i][j] > maxFreq) {
                maxFreq = matrix[i][j];
                bestPair = [i, j];
            }
        }
    }

    const selection = new Set<number>(bestPair);

    // 3. Construct the rest of the game
    // Greedily add the number that maximizes the "connection strength" to the EXISTING set.
    // Strength(Candidate) = Sum(matrix[Candidate][ExistingMember]) for all ExistingMembers

    while (selection.size < quantity) {
        let bestCandidate = -1;
        let bestScore = -1;

        for (let i = 1; i <= 25; i++) {
            if (selection.has(i)) continue;

            let currentScore = 0;
            selection.forEach(existing => {
                currentScore += matrix[i][existing];
            });

            // Tie-breaker: Individual frequency in the sample (Hotness)
            // Or simple random to avoid deterministic loops if scores are equal?
            // Let's add a tiny random factor to break ties.
            currentScore += Math.random() * 0.5;

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestCandidate = i;
            }
        }

        if (bestCandidate !== -1) {
            selection.add(bestCandidate);
        } else {
            // Should not happen unless quantity > 25
            break;
        }
    }

    return Array.from(selection).sort((a, b) => a - b);
};
