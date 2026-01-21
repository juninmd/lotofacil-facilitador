
import { generateSmartGame, LotofacilResult } from '../src/utils/statistics';

// Mock Data for Game 3592 and preceding history (3591 down to 3492)
// This data is hardcoded to ensure the test is reproducible without external API calls.
const TARGET_GAME: LotofacilResult = {
    numero: 3592,
    listaDezenas: [1, 4, 5, 6, 7, 9, 12, 13, 17, 18, 20, 21, 22, 23, 25],
    dataApuracao: "20/01/2026",
    listaRateioPremio: []
};

// Simplified Mock History Generator (We only need numbers and IDs)
// We will generate "fake" history that mimics the statistical properties of the real history
// to allow the algorithm to run without a 50KB JSON file.
// Ideally, we would load the real JSON, but for this script to be standalone in the repo,
// we will rely on the algorithm's ability to handle general distributions.
// WAIT - The algorithm relies on SPECIFIC history (Repeats, Cycle).
// I cannot mock random history. I must fetch the real data.
// Since I cannot commit a large JSON, I will include a "fetch or fail" logic.

import { getGame } from '../src/game';

// Polyfill fetch if needed
if (!globalThis.fetch) {
    console.error("Node 18+ required");
    process.exit(1);
}

async function fetchHistory(targetId: number, count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];
    console.log(`Fetching history for validation (Target: ${targetId})...`);

    // We need 3591 down to 3591-count
    // We batch requests
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
    }

    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Lotofacil Algorithm Verification ===");

    // 1. Get Real Data
    let history: LotofacilResult[] = [];
    let target = TARGET_GAME;

    try {
        const fetchedTarget = await getGame(3592);
        if (fetchedTarget) target = fetchedTarget;

        history = await fetchHistory(3592, 100);

        if (history.length < 50) {
            console.error("Failed to fetch enough history data. Aborting verification.");
            return;
        }
    } catch (e) {
        console.error("Error fetching data:", e);
        return;
    }

    console.log(`\nTesting against Game ${target.numero}`);
    console.log(`Target Numbers: ${target.listaDezenas.join(', ')}`);
    console.log(`History Size: ${history.length} games (Latest: ${history[0].numero})`);

    // 2. Run Simulation
    const NUM_SIMULATIONS = 20;
    console.log(`\nGenerating ${NUM_SIMULATIONS} predictions...`);

    let totalHits = 0;
    let minHits = 15;
    let maxHits = 0;
    let successCount = 0; // >= 11 hits

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const start = performance.now();
        const candidate = generateSmartGame(history, undefined, 15);
        const duration = performance.now() - start;

        const hits = candidate.filter(n => target.listaDezenas.includes(n)).length;

        totalHits += hits;
        if (hits < minHits) minHits = hits;
        if (hits > maxHits) maxHits = hits;
        if (hits >= 11) successCount++;

        console.log(`Game ${i+1}: [${candidate.join(',')}] -> Hits: ${hits} (${duration.toFixed(0)}ms)`);
    }

    const avgHits = totalHits / NUM_SIMULATIONS;
    const successRate = (successCount / NUM_SIMULATIONS) * 100;

    console.log("\n=== Results ===");
    console.log(`Average Hits: ${avgHits.toFixed(2)}`);
    console.log(`Min Hits: ${minHits}`);
    console.log(`Max Hits: ${maxHits}`);
    console.log(`Success Rate (>= 11): ${successRate.toFixed(0)}%`);

    if (avgHits >= 9.5) {
        console.log("\nPASS: Algorithm quality is high.");
    } else {
        console.log("\nWARN: Algorithm quality is below target.");
    }
}

runVerification();
