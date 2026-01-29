import { getLatestGames } from '../src/game';
import { generatePatternGame } from '../src/utils/patternStrategy';

async function main() {
    console.log("Verifying Pattern Strategy...");
    console.log("Fetching historical data...");

    try {
        const history = await getLatestGames(120);

        if (!history || history.length < 50) {
            console.error("Failed to fetch enough history. Check internet connection or API availability.");
            process.exit(1);
        }

        console.log(`Successfully fetched ${history.length} games.`);

        const testCount = 20;
        let totalHits = 0;
        const distribution = { 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, other: 0 };

        console.log(`\nBacktesting on the last ${testCount} games...`);
        console.log("---------------------------------------------------");
        console.log("Game  | Hits | Prediction");

        for (let i = 0; i < testCount; i++) {
            // Target is the game at index i (Newest is 0)
            const targetGame = history[i];

            // Training data is everything OLDER than the target
            const trainingData = history.slice(i + 1);

            const prediction = generatePatternGame(trainingData, 15);

            const hits = prediction.filter(n => targetGame.listaDezenas.includes(n)).length;
            totalHits += hits;

            if (hits >= 11 && hits <= 15) {
                distribution[hits as 11|12|13|14|15]++;
            } else {
                distribution.other++;
            }

            console.log(`#${targetGame.numero} |  ${hits}   | [${prediction.join(', ')}]`);
        }

        const avg = totalHits / testCount;
        console.log("---------------------------------------------------");
        console.log(`Average Hits: ${avg.toFixed(2)}`);
        console.log("Prize Distribution:");
        console.log(`15 pts: ${distribution[15]}`);
        console.log(`14 pts: ${distribution[14]}`);
        console.log(`13 pts: ${distribution[13]}`);
        console.log(`12 pts: ${distribution[12]}`);
        console.log(`11 pts: ${distribution[11]}`);
        console.log(`Other:  ${distribution.other}`);

    } catch (error) {
        console.error("An error occurred during verification:", error);
    }
}

main();
