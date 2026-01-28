
import { generateRandomForestGame } from '../src/utils/randomForestStrategy';
import { getGame } from '../src/game';
import type { LotofacilResult } from '../src/game';

// Minimal polyfill for fetch if needed (Node environment)
if (!globalThis.fetch) {
    console.error("Node 18+ required (fetch API)");
    process.exit(1);
}

// Fallback data
const FALLBACK_HISTORY: LotofacilResult[] = [
    { numero: 3591, listaDezenas: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], dataApuracao: "", listaRateioPremio: [] },
    { numero: 3590, listaDezenas: [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], dataApuracao: "", listaRateioPremio: [] },
    { numero: 3589, listaDezenas: [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], dataApuracao: "", listaRateioPremio: [] },
    { numero: 3588, listaDezenas: [1,3,5,7,9,11,13,15,17,19,21,23,2,4,6], dataApuracao: "", listaRateioPremio: [] },
    { numero: 3587, listaDezenas: [2,4,6,8,10,12,14,16,18,20,22,24,1,3,5], dataApuracao: "", listaRateioPremio: [] }
];

async function fetchHistory(targetId: number, count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];
    console.log(`Fetching history for validation (Target: ${targetId})...`);

    try {
        // Simple sequential fetch for validation script (no complex batching needed here really)
        // But let's be nice to the API
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
    } catch (e) {
        console.warn("Fetch failed, using mock data");
        // Generate synthetic data
        for(let i=0; i<count; i++) {
            history.push({
                numero: targetId - i - 1,
                listaDezenas: Array.from({length: 15}, () => Math.floor(Math.random() * 25) + 1),
                dataApuracao: "MOCK",
                listaRateioPremio: []
            });
        }
    }

    if (history.length === 0) return FALLBACK_HISTORY;
    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Random Forest Algorithm Verification ===");

    // 1. Get Data
    let targetId = 3592;
    try {
        const latest = await getGame();
        if (latest) targetId = latest.numero;
    } catch (e) {
        console.warn("Could not get latest game, using default target 3592");
    }

    // Need enough history for training (e.g. 100 + some buffer)
    const history = await fetchHistory(targetId, 150);
    const targetGame = await getGame(targetId) || { numero: targetId, listaDezenas: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], dataApuracao: "MOCK", listaRateioPremio: [] };

    console.log(`\nTesting against Game ${targetGame.numero}`);
    console.log(`History Size: ${history.length} games`);

    // 2. Run Single Prediction
    console.log(`\nTraining Random Forest and Generating Prediction...`);
    const start = performance.now();

    // Generate Game
    const candidate = generateRandomForestGame(history, 15);

    const duration = performance.now() - start;
    const hits = candidate.filter(n => targetGame.listaDezenas.includes(n)).length;

    console.log(`\nPrediction: [${candidate.join(', ')}]`);
    console.log(`Target:     [${targetGame.listaDezenas.join(', ')}]`);
    console.log(`Hits: ${hits}`);
    console.log(`Time taken: ${duration.toFixed(0)}ms`);

    // 3. Small Loop to check consistency/performance
    if (duration < 2000) {
        console.log("\nRunning small batch test (5 runs)...");
        let totalHits = 0;
        for(let i=0; i<5; i++) {
             const startI = performance.now();
             const c = generateRandomForestGame(history, 15);
             const h = c.filter(n => targetGame.listaDezenas.includes(n)).length;
             totalHits += h;
             process.stdout.write(`Run ${i+1}: ${h} hits (${(performance.now() - startI).toFixed(0)}ms). `);
        }
        console.log(`\nAverage Hits: ${totalHits/5}`);
    } else {
        console.log("\nSkipping batch test (single run took > 2s)");
    }
}

runVerification();
