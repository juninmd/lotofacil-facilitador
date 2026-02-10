
import { generateQLearningGame } from '../src/utils/qLearningStrategy';
import { generateRandomGame, LotofacilResult } from '../src/utils/statistics';
import { getGame } from '../src/game';

// Polyfill fetch if needed
if (!globalThis.fetch) {
    console.error("Node 18+ required");
    process.exit(1);
}

async function fetchHistory(targetId: number, count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];
    console.log(`Fetching history for validation (Target ID: ${targetId}, History Size: ${count})...`);

    // We need targetId-1 down to targetId-count
    const batchSize = 10;
    for (let i = 1; i <= count; i += batchSize) {
        const promises = [];
        for (let j = 0; j < batchSize && (i + j) <= count; j++) {
            const id = targetId - (i + j);
            promises.push(getGame(id).catch(() => null));
        }
        const results = await Promise.all(promises);
        for (const res of results) {
            if (res) history.push(res);
        }
        // Small delay to avoid rate limit
        await new Promise(r => setTimeout(r, 200));
        process.stdout.write('.');
    }
    console.log(" Done.");

    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Q-Learning Strategy Verification ===");

    // 1. Get Target Game (Latest available)
    let target: LotofacilResult | null = null;
    try {
        console.log("Fetching latest game as target...");
        target = await getGame();
        if (!target) {
            console.error("Failed to fetch latest game.");
            return;
        }
    } catch (e) {
        console.error("Error fetching target:", e);
        return;
    }

    // 2. Fetch History relative to Target
    let history: LotofacilResult[] = [];
    try {
        history = await fetchHistory(target.numero, 100);
        if (history.length < 50) {
            console.error("Failed to fetch enough history data. Aborting verification.");
            return;
        }
    } catch (e) {
        console.error("Error fetching history:", e);
        return;
    }

    console.log(`\nTarget Game: ${target.numero} (${target.dataApuracao})`);
    console.log(`Target Numbers: ${target.listaDezenas.join(', ')}`);
    console.log(`History Range: ${history[history.length-1].numero} - ${history[0].numero}`);

    // 3. Run Simulation
    const NUM_SIMULATIONS = 20;
    console.log(`\nGenerating ${NUM_SIMULATIONS} predictions using Q-Learning...`);

    let totalHits = 0;
    let minHits = 15;
    let maxHits = 0;
    let successCount = 0; // >= 11 hits

    // Baseline (Random)
    let randomTotalHits = 0;

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        // Q-Learning is deterministic based on history if Epsilon is 0 during prediction.
        // But our implementation might have stochastic elements if we left Epsilon > 0 or if selection has randomness.
        // Looking at code: generateQLearningGame uses EPSILON inside the training loop.
        // The prediction phase:
        // `const qValues = getQValues(key);`
        // `finalScores.push({ num, qScore: qValues[1] });`
        // `selection = finalScores.slice(0, quantity)...`
        // This is DETERMINISTIC for a given history.
        // So running it 20 times on the SAME history will yield the SAME result.
        // Unless we want to simulate "training stability" (which involves random exploration).
        // The `generateQLearningGame` function retrains from scratch every call.
        // And inside, it uses `if (Math.random() < EPSILON)`.
        // So the training path is stochastic, thus the resulting Q-Table is stochastic.
        // So running it multiple times IS valid.

        const start = performance.now();
        const candidate = generateQLearningGame(history, 15);
        const duration = performance.now() - start;

        const hits = candidate.filter(n => target!.listaDezenas.includes(n)).length;

        totalHits += hits;
        if (hits < minHits) minHits = hits;
        if (hits > maxHits) maxHits = hits;
        if (hits >= 11) successCount++;

        // Random Baseline
        const randomCandidate = generateRandomGame(15);
        const randomHits = randomCandidate.filter(n => target!.listaDezenas.includes(n)).length;
        randomTotalHits += randomHits;

        console.log(`Sim ${i+1}: [${candidate.join(',')}] -> Hits: ${hits} (${duration.toFixed(0)}ms)`);
    }

    const avgHits = totalHits / NUM_SIMULATIONS;
    const avgRandomHits = randomTotalHits / NUM_SIMULATIONS;
    const successRate = (successCount / NUM_SIMULATIONS) * 100;

    console.log("\n=== Results ===");
    console.log(`Q-Learning Average Hits: ${avgHits.toFixed(2)}`);
    console.log(`Random Average Hits:     ${avgRandomHits.toFixed(2)}`);
    console.log(`Min Hits: ${minHits}`);
    console.log(`Max Hits: ${maxHits}`);
    console.log(`Success Rate (>= 11): ${successRate.toFixed(0)}%`);

    if (avgHits > avgRandomHits) {
        console.log("\nPASS: Q-Learning outperformed Random.");
    } else {
        console.log("\nWARN: Q-Learning did not outperform Random (may need tuning or more history).");
    }
}

runVerification();
