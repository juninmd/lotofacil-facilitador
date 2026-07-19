
import { generateBiLstmGame } from '../src/utils/biLstmStrategy';
import { getGame } from '../src/game';
import type { LotofacilResult } from '../src/game';

// Minimal polyfill for fetch if needed (Node 18+ has native fetch)
if (!globalThis.fetch) {
    console.error("Node 18+ required");
    process.exit(1);
}

// Hardcoded fallback data (last 20 games) to ensure it runs even if fetch fails or for quick testing
// We need at least 20 games for the strategy to run without fallback to random
const FALLBACK_HISTORY: LotofacilResult[] = Array.from({length: 25}, (_, i) => ({
    numero: 3600 - i,
    listaDezenas: Array.from({length: 15}, () => Math.floor(Math.random() * 25) + 1), // Mock data
    dataApuracao: "MOCK",
    listaRateioPremio: []
}));

async function fetchHistory(targetId: number, count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];
    console.log(`Fetching history for validation (Target: ${targetId})...`);

    // Try to fetch real data
    try {
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
    } catch {
        console.warn("Fetch failed, using mock data");
    }

    if (history.length < 20) {
        console.warn("Insufficient real data fetched, using fallback mock data.");
        return FALLBACK_HISTORY;
    }

    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Bi-LSTM Algorithm Verification ===");

    // 1. Get Data
    // We try to get the latest game ID first to anchor our history
    let targetId = 3592;
    try {
        const latest = await getGame();
        if (latest) targetId = latest.numero;
    } catch {
        console.warn("Could not get latest game, using default target 3592");
    }

    // We need more history for Bi-LSTM (context window is 10, plus training)
    const history = await fetchHistory(targetId, 60);
    const targetGame = await getGame(targetId) || { numero: targetId, listaDezenas: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], dataApuracao: "MOCK", listaRateioPremio: [] };

    console.log(`\nTesting against Game ${targetGame.numero}`);
    console.log(`History Size: ${history.length} games`);

    // 2. Run Single Prediction (Training takes time)
    console.log(`\nTraining Model and Generating Prediction...`);
    const start = performance.now();

    // We use the history to predict the target
    // The strategy expects history sorted Newest -> Oldest
    const candidate = await generateBiLstmGame(history, 15);

    const duration = performance.now() - start;

    const hits = candidate.filter(n => targetGame.listaDezenas.includes(n)).length;

    console.log(`\nPrediction: [${candidate.join(', ')}]`);
    console.log(`Target:     [${targetGame.listaDezenas.join(', ')}]`);
    console.log(`Hits: ${hits}`);
    console.log(`Time taken: ${duration.toFixed(0)}ms`);

    // 3. Simple loop if fast enough
    if (duration < 5000) {
        console.log("\nRunning small batch test (3 runs)...");
        let totalHits = 0;
        for(let i=0; i<3; i++) {
             const c = await generateBiLstmGame(history, 15);
             const h = c.filter(n => targetGame.listaDezenas.includes(n)).length;
             totalHits += h;
             process.stdout.write(`Run ${i+1}: ${h} hits. `);
        }
        console.log(`\nAverage Hits: ${(totalHits/3).toFixed(2)}`);
    }
}

runVerification();
