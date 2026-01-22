
import { generateGeneticGame } from '../src/utils/genetic';
import { getGame } from '../src/game';
import type { LotofacilResult } from '../src/game';

// Polyfill fetch if needed
if (!globalThis.fetch) {
    console.error("Node 18+ required");
    process.exit(1);
}

async function fetchHistory(targetId: number, count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];
    console.log(`Fetching history for validation (Target: ${targetId})...`);

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
        await new Promise(r => setTimeout(r, 200));
    }

    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Lotofacil Genetic Algorithm Verification ===");

    // 1. Get Real Data
    let history: LotofacilResult[] = [];
    let target: LotofacilResult | null = null;
    const TARGET_ID = 3000; // Use a fixed past game

    try {
        const fetchedTarget = await getGame(TARGET_ID);
        if (fetchedTarget) target = fetchedTarget;

        history = await fetchHistory(TARGET_ID, 100);

        if (history.length < 50) {
            console.error("Failed to fetch enough history data. Aborting verification.");
            return;
        }
    } catch (e) {
        console.error("Error fetching data:", e);
        return;
    }

    if (!target) {
        console.error("Target game not found");
        return;
    }

    console.log(`\nTesting against Game ${target.numero}`);
    console.log(`Target Numbers: ${target.listaDezenas.join(', ')}`);

    // 2. Run Simulation
    const NUM_SIMULATIONS = 10;
    console.log(`\nGenerating ${NUM_SIMULATIONS} predictions using Genetic Algorithm...`);

    let totalHits = 0;
    let minHits = 15;
    let maxHits = 0;
    let successCount = 0; // >= 11 hits

    for (let i = 0; i < NUM_SIMULATIONS; i++) {
        const start = performance.now();
        const candidate = generateGeneticGame(history, 15);
        const duration = performance.now() - start;

        const hits = candidate.filter(n => target!.listaDezenas.includes(n)).length;

        totalHits += hits;
        if (hits < minHits) minHits = hits;
        if (hits > maxHits) maxHits = hits;
        if (hits >= 11) successCount++;

        console.log(`Gen #${i+1}: [${candidate.join(',')}] -> Hits: ${hits} (${duration.toFixed(0)}ms)`);
    }

    const avgHits = totalHits / NUM_SIMULATIONS;
    const successRate = (successCount / NUM_SIMULATIONS) * 100;

    console.log("\n=== Genetic Results ===");
    console.log(`Average Hits: ${avgHits.toFixed(2)}`);
    console.log(`Min Hits: ${minHits}`);
    console.log(`Max Hits: ${maxHits}`);
    console.log(`Success Rate (>= 11): ${successRate.toFixed(0)}%`);

    if (avgHits >= 9.0) {
        console.log("\nPASS: Genetic Algorithm functioning.");
    } else {
        console.log("\nWARN: Genetic Algorithm underperforming (might need tuning).");
    }
}

runVerification();
