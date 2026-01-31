
import { generateBayesianGame } from '../src/utils/bayesianStrategy';
import type { LotofacilResult } from '../src/game';

// Helper to generate synthetic history
const generateMockHistory = (count: number): LotofacilResult[] => {
    const history: LotofacilResult[] = [];
    for (let i = 0; i < count; i++) {
        // Generate random 15 numbers
        const numbers = new Set<number>();
        while (numbers.size < 15) {
            numbers.add(Math.floor(Math.random() * 25) + 1);
        }

        history.push({
            numero: 1000 - i,
            listaDezenas: Array.from(numbers).sort((a, b) => a - b),
            dataApuracao: '01/01/2023',
            listaRateioPremio: []
        });
    }
    return history;
};

async function runVerification() {
    console.log("=== Bayesian Strategy Verification ===");

    // 1. Generate Mock Data
    const history = generateMockHistory(100);
    console.log(`Generated ${history.length} mock games.`);

    // 2. Run Algorithm
    console.log("Running generateBayesianGame...");
    const start = performance.now();
    const result = generateBayesianGame(history, 15);
    const end = performance.now();

    console.log(`Result: [${result.join(', ')}]`);
    console.log(`Execution Time: ${(end - start).toFixed(2)}ms`);

    // 3. Validate Output
    let valid = true;
    if (result.length !== 15) {
        console.error(`ERROR: Expected 15 numbers, got ${result.length}`);
        valid = false;
    }

    result.forEach(n => {
        if (n < 1 || n > 25) {
            console.error(`ERROR: Number ${n} out of range (1-25)`);
            valid = false;
        }
    });

    const unique = new Set(result);
    if (unique.size !== result.length) {
        console.error("ERROR: Duplicate numbers found");
        valid = false;
    }

    if (valid) {
        console.log("PASS: Algorithm returned valid game structure.");
    } else {
        console.error("FAIL: Algorithm returned invalid structure.");
        process.exit(1);
    }
}

runVerification();
