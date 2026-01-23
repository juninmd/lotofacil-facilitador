
import { generateMarkovGame, generateRandomGame } from '../src/utils/statistics';
import { getGame } from '../src/game';
import type { LotofacilResult } from '../src/game';

// Polyfill fetch if needed (Node 18+ has it)
if (!globalThis.fetch) {
    console.error("Node 18+ required");
    process.exit(1);
}

async function fetchLatestGames(count: number): Promise<LotofacilResult[]> {
    const history: LotofacilResult[] = [];

    // Get latest game first to know where to start
    const latest = await getGame();
    if (!latest) throw new Error("Could not fetch latest game");
    history.push(latest);

    console.log(`Latest Game: ${latest.numero}. Fetching previous ${count} games...`);

    const batchSize = 10;
    const targetCount = count;

    for (let i = 1; i <= targetCount; i += batchSize) {
        const promises = [];
        for (let j = 0; j < batchSize && (i + j) <= targetCount; j++) {
            const id = latest.numero - (i + j);
            if (id > 0) promises.push(getGame(id).catch(() => null));
        }

        const results = await Promise.all(promises);
        for (const res of results) {
            if (res) history.push(res);
        }
        // Small delay
        await new Promise(r => setTimeout(r, 100));
        process.stdout.write('.');
    }
    console.log("\nDownload complete.");

    return history.sort((a, b) => b.numero - a.numero);
}

async function runVerification() {
    console.log("=== Markov Chain Algorithm Verification (Backtest) ===");

    let history: LotofacilResult[] = [];
    try {
        // Fetch 120 games to allow testing last 20 with 100 history each
        history = await fetchLatestGames(120);
    } catch (e) {
        console.error("Error fetching data:", e);
        return;
    }

    if (history.length < 50) {
        console.error("Not enough data.");
        return;
    }

    const TEST_COUNT = 20;
    console.log(`\nTesting prediction on last ${TEST_COUNT} games...`);

    let markovTotalHits = 0;
    let randomTotalHits = 0;

    let markov14 = 0;
    let markov15 = 0;

    console.log(`\nGame | Markov Hits | Random Hits`);
    console.log(`-----|-------------|------------`);

    for (let i = 0; i < TEST_COUNT; i++) {
        // Target is the game we want to predict
        const target = history[i];

        // Training data is strictly from the past (i+1 onwards)
        const training = history.slice(i + 1, i + 101);

        if (training.length < 20) break;

        // Run Markov
        const markovPred = generateMarkovGame(training, undefined, 15);
        const mHits = markovPred.filter(n => target.listaDezenas.includes(n)).length;

        // Run Random
        const randomPred = generateRandomGame(15);
        const rHits = randomPred.filter(n => target.listaDezenas.includes(n)).length;

        markovTotalHits += mHits;
        randomTotalHits += rHits;

        if (mHits === 14) markov14++;
        if (mHits === 15) markov15++;

        console.log(`${target.numero} |      ${mHits}      |      ${rHits}`);
    }

    const markovAvg = markovTotalHits / TEST_COUNT;
    const randomAvg = randomTotalHits / TEST_COUNT;

    console.log("\n=== Results ===");
    console.log(`Markov Average Hits: ${markovAvg.toFixed(2)}`);
    console.log(`Random Average Hits: ${randomAvg.toFixed(2)}`);
    console.log(`Markov 14 Pts: ${markov14}`);
    console.log(`Markov 15 Pts: ${markov15}`);

    const improvement = ((markovAvg - randomAvg) / randomAvg) * 100;
    console.log(`Improvement over Random: ${improvement.toFixed(1)}%`);

    if (markovAvg > randomAvg) {
        console.log("SUCCESS: Markov outperformed Random.");
    } else {
        console.log("NOTE: Markov performed similar or worse than Random (Statistical Variance is high).");
    }
}

runVerification();
