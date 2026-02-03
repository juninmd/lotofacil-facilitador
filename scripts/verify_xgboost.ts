import { getLatestGames } from '../src/game';
import { generateSmartGame, generateConsensusGame } from '../src/utils/statistics';
import { generateGradientBoostingGame } from '../src/utils/gradientBoostingStrategy';
import { generateXGBoostGame } from '../src/utils/xgbStrategy';

async function verifyXGBoost() {
    console.log("Fetching latest games for verification...");
    // Fetch enough history: 20 for backtest + 100 for training = 120
    const history = await getLatestGames(120);

    if (history.length < 100) {
        console.error("Not enough history fetched.");
        process.exit(1);
    }

    console.log(`Fetched ${history.length} games.`);
    console.log("Starting Backtest Comparison (Last 20 Games)...");

    const stats = {
        smart: { hits: 0, games: 0, prizes: 0 },
        consensus: { hits: 0, games: 0, prizes: 0 },
        gb: { hits: 0, games: 0, prizes: 0 },
        xgb: { hits: 0, games: 0, prizes: 0 }
    };

    // Backtest loop
    // Predict game 'i' using games 'i+1' onwards
    const testCount = 20;

    console.log(`\nComp: Game | Smart | Cons | GBDT | XGB (New) | Result`);
    console.log(`--------------------------------------------------------`);

    for(let i=testCount - 1; i >= 0; i--) {
        const targetGame = history[i];
        const trainingData = history.slice(i + 1, i + 101); // Use 100 past games

        if (trainingData.length < 50) continue;

        // Run Algorithms
        const smart = generateSmartGame(trainingData);
        const cons = generateConsensusGame(trainingData);
        const gb = generateGradientBoostingGame(trainingData);
        const xgb = generateXGBoostGame(trainingData);

        // Score
        const score = (pred: number[]) => {
            return pred.filter(n => targetGame.listaDezenas.includes(n)).length;
        };

        const sHits = score(smart);
        const cHits = score(cons);
        const gHits = score(gb);
        const xHits = score(xgb);

        stats.smart.hits += sHits; stats.smart.games++;
        stats.consensus.hits += cHits; stats.consensus.games++;
        stats.gb.hits += gHits; stats.gb.games++;
        stats.xgb.hits += xHits; stats.xgb.games++;

        // Prize Check (Simple)
        if(sHits >= 11) stats.smart.prizes++;
        if(cHits >= 11) stats.consensus.prizes++;
        if(gHits >= 11) stats.gb.prizes++;
        if(xHits >= 11) stats.xgb.prizes++;

        console.log(`Game ${targetGame.numero}:   ${sHits}   |  ${cHits}   |  ${gHits}   |  ${xHits}        | [${targetGame.listaDezenas.slice(0,5).join(',')},...]`);
    }

    console.log(`\n--- FINAL RESULTS (Avg Hits) ---`);
    console.log(`Smart:     ${(stats.smart.hits / stats.smart.games).toFixed(2)}  (Prizes: ${stats.smart.prizes})`);
    console.log(`Consensus: ${(stats.consensus.hits / stats.consensus.games).toFixed(2)}  (Prizes: ${stats.consensus.prizes})`);
    console.log(`GBDT(Old): ${(stats.gb.hits / stats.gb.games).toFixed(2)}  (Prizes: ${stats.gb.prizes})`);
    console.log(`XGB(New):  ${(stats.xgb.hits / stats.xgb.games).toFixed(2)}  (Prizes: ${stats.xgb.prizes})`);

    if (stats.xgb.hits >= stats.gb.hits) {
        console.log("\nSUCCESS: XGBoost (New) matched or outperformed Gradient Boosting (Old).");
    } else {
        console.log("\nNOTE: XGBoost (New) slightly underperformed on this short test set. Tune parameters.");
    }
}

verifyXGBoost();
