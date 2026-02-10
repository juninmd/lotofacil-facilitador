import type { LotofacilResult } from '../game';

// Q-Learning Parameters
const ALPHA = 0.1; // Learning Rate
const GAMMA = 0.9; // Discount Factor
const EPSILON = 0.1; // Exploration Rate (during training)
const REWARD_HIT = 10;
const REWARD_MISS = -10;
const REWARD_SKIP_HIT = -5; // Missed opportunity
const REWARD_SKIP_MISS = 1; // Good decision to skip

// State Representation
interface QState {
    recencyBucket: number; // 0=LastGame, 1=2GamesAgo, ...
    frequencyBucket: number; // Frequency in last 10 games
}

// Q-Table Key
const getStateKey = (state: QState): string => {
    return `${state.recencyBucket}:${state.frequencyBucket}`;
};

// Helper: Calculate State for a Number at a given point in history
const calculateState = (number: number, historySlice: LotofacilResult[]): QState => {
    // 1. Calculate Recency (Delay)
    let delay = 0;
    let found = false;
    // Iterate from newest (index 0) backwards
    for (let i = 0; i < historySlice.length; i++) {
        if (historySlice[i].listaDezenas.includes(number)) {
            delay = i;
            found = true;
            break;
        }
    }
    if (!found) delay = historySlice.length;

    // Bucketize Delay
    let recencyBucket = 0;
    if (delay === 0) recencyBucket = 0;
    else if (delay === 1) recencyBucket = 1;
    else if (delay === 2) recencyBucket = 2;
    else if (delay <= 5) recencyBucket = 3;
    else if (delay <= 10) recencyBucket = 4;
    else recencyBucket = 5;

    // 2. Calculate Frequency in last 10 games
    const recentGames = historySlice.slice(0, 10);
    let freq = 0;
    recentGames.forEach(g => {
        if (g.listaDezenas.includes(number)) freq++;
    });

    // Bucketize Frequency
    let frequencyBucket = freq;
    if (freq > 4) frequencyBucket = 4; // Cap at 4+

    return { recencyBucket, frequencyBucket };
};

export const generateQLearningGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    if (history.length < 20) return []; // Need history to train

    // Initialize Q-Table
    // Key: StateString, Value: [Q(Action=0), Q(Action=1)]
    const qTable = new Map<string, [number, number]>();

    const getQValues = (key: string): [number, number] => {
        if (!qTable.has(key)) {
            qTable.set(key, [0, 0]); // Initialize with 0
        }
        return qTable.get(key)!;
    };

    // Training Loop (Chronological: Oldest -> Newest)
    // We can't train on the very first few games because we need history to form a state.
    // Start from index (HistoryLength - 20) down to 0.
    // Actually, history is Newest[0] ... Oldest[N].
    // So we iterate i from (N-1) down to 0.
    // But we need "previous history" for state.
    // Let's say we start predicting at game i. The state is based on games (i+1 ... i+N).

    // Reverse history for easier chronological iteration
    const chronoHistory = [...history].reverse(); // Index 0 is Oldest, Index N is Newest

    // Start training after 20 games to build initial state
    for (let i = 20; i < chronoHistory.length; i++) {
        const targetGame = chronoHistory[i];
        const previousHistory = chronoHistory.slice(0, i).reverse(); // Back to Newest-first format for calculateState

        // For each number 1-25
        for (let num = 1; num <= 25; num++) {
            const state = calculateState(num, previousHistory);
            const key = getStateKey(state);
            const qValues = getQValues(key);

            // Choose Action (Epsilon-Greedy)
            let action = 0; // 0=Skip, 1=Pick
            if (Math.random() < EPSILON) {
                action = Math.random() < 0.5 ? 0 : 1;
            } else {
                action = qValues[1] > qValues[0] ? 1 : 0;
            }

            // Observe Reward
            const actuallyDrawn = targetGame.listaDezenas.includes(num);
            let reward = 0;

            if (action === 1 && actuallyDrawn) reward = REWARD_HIT;
            else if (action === 1 && !actuallyDrawn) reward = REWARD_MISS;
            else if (action === 0 && actuallyDrawn) reward = REWARD_SKIP_HIT;
            else if (action === 0 && !actuallyDrawn) reward = REWARD_SKIP_MISS;

            // Update Q-Value
            // Q(s,a) = Q(s,a) + alpha * (R + gamma * max(Q(s', a')) - Q(s,a))
            // Problem: We don't simulate the transition to s' explicitly here for the single-step prediction.
            // In this specific simplified RL for lottery, the "next state" is just the state for the next game.
            // But since we are iterating game by game, we can just do Q-Learning update based on the reward.
            // The "Next State" Max Q is tricky because the next state depends on the outcome (which is random).
            // So we use a simplified Q-Update (Bandit-style or simple TD(0) without next state max, or assume next state is similar).
            // Let's stick to standard Q-Learning: we need s'.
            // s' is the state of this number in the *next* game (i+1).
            // But we can only know s' if we know the outcome of game i. Which we do during training!

            const nextHistory = [targetGame, ...previousHistory]; // This is the history available for game i+1
            const nextState = calculateState(num, nextHistory);
            const nextKey = getStateKey(nextState);
            const nextQValues = getQValues(nextKey);
            const maxNextQ = Math.max(nextQValues[0], nextQValues[1]);

            const currentQ = qValues[action];
            const updatedQ = currentQ + ALPHA * (reward + GAMMA * maxNextQ - currentQ);

            qValues[action] = updatedQ;
            qTable.set(key, qValues);
        }
    }

    // Prediction Phase
    // Now we are at the "Present". We use the full history to calculate current state.
    // And use the trained Q-Table to pick the best numbers.
    const finalScores: { num: number, qScore: number }[] = [];

    for (let num = 1; num <= 25; num++) {
        const state = calculateState(num, history); // Current history (Newest[0])
        const key = getStateKey(state);
        const qValues = getQValues(key);
        // We want the Q-Value for Action 1 (Pick)
        // Or better: The advantage of picking vs skipping?
        // Let's use Q(s, 1) as the score.
        finalScores.push({ num, qScore: qValues[1] });
    }

    // Sort by Q-Score Descending
    finalScores.sort((a, b) => b.qScore - a.qScore);

    // Select top Quantity
    const selection = finalScores.slice(0, quantity).map(item => item.num);

    return selection.sort((a, b) => a - b);
};
