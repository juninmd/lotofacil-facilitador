import { generateSmartGame } from '../src/utils/statistics';
import { generateRandomForestGame } from '../src/utils/randomForestStrategy';
import { generateGradientBoostingGame } from '../src/utils/gradientBoostingStrategy';
import type { LotofacilResult } from '../src/game';

// Minimal Fetch Implementation for Node (if strictly needed, but Node 18 has fetch)
// We will try to use the one from src/game, but simpler to just rewrite fetch here to avoid dep issues
// with caching/DOM specifics if any.

const getGames = async (count: number): Promise<LotofacilResult[]> => {
    // Fetch latest game number
    const resp = await fetch('https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/');
    if(!resp.ok) throw new Error("Failed to fetch latest");
    const latest = await resp.json() as LotofacilResult;

    // Convert strings to numbers if needed (API usually returns strings for numbers sometimes)
    // But type says number. The API actually returns strings in "listaDezenas" usually.
    // We must parse it.

    const parse = (g: LotofacilResult & { listaDezenas: (string | number)[] }): LotofacilResult => ({
        ...g,
        listaDezenas: g.listaDezenas.map((d: string | number) => Number(d))
    });

    const games: LotofacilResult[] = [parse(latest)];
    const latestNum = latest.numero;

    // Fetch previous in batch
    const promises: Promise<void>[] = [];

    // We want 'count' games total.
    for(let i=1; i<count; i++) {
        const num = latestNum - i;
        promises.push(
            fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${num}`)
            .then(r => r.json())
            .then(d => { games.push(parse(d)); })
            .catch(() => console.error(`Failed ${num}`))
        );
        // Throttle slightly
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
    }

    await Promise.all(promises);
    return games.sort((a, b) => b.numero - a.numero);
};

const run = async () => {
    console.log("Fetching History...");
    // Fetch 150 games to allow for 50 simulations with 100 training window
    const history = await getGames(150);
    console.log(`Fetched ${history.length} games.`);

    if(history.length < 110) {
        console.error("Not enough games fetched.");
        process.exit(1);
    }

    const simulations = 20; // Number of games to predict
    console.log(`Running ${simulations} comparative simulations...`);

    const stats = {
        smart: { hits: 0, 14: 0, 15: 0 },
        rf: { hits: 0, 14: 0, 15: 0 },
        gbdt: { hits: 0, 14: 0, 15: 0 }
    };

    for(let i=0; i<simulations; i++) {
        const target = history[i];
        // Training data: history[i+1 ... i+100]
        const train = history.slice(i+1, i+101);

        if (train.length < 50) break;

        // Smart
        const sGame = generateSmartGame(train, undefined, 15);
        const sHits = sGame.filter(n => target.listaDezenas.includes(n)).length;
        stats.smart.hits += sHits;
        if(sHits === 14) stats.smart[14]++;
        if(sHits === 15) stats.smart[15]++;

        // Random Forest
        const rGame = generateRandomForestGame(train, 15);
        const rHits = rGame.filter(n => target.listaDezenas.includes(n)).length;
        stats.rf.hits += rHits;
        if(rHits === 14) stats.rf[14]++;
        if(rHits === 15) stats.rf[15]++;

        // Gradient Boosting
        const gGame = generateGradientBoostingGame(train, 15);
        const gHits = gGame.filter(n => target.listaDezenas.includes(n)).length;
        stats.gbdt.hits += gHits;
        if(gHits === 14) stats.gbdt[14]++;
        if(gHits === 15) stats.gbdt[15]++;

        process.stdout.write(`.`);
    }

    console.log("\n\n--- Results (Avg Hits over 20 games) ---");
    console.log(`Smart: ${(stats.smart.hits / simulations).toFixed(2)} hits/game | 14pts: ${stats.smart[14]} | 15pts: ${stats.smart[15]}`);
    console.log(`Random Forest: ${(stats.rf.hits / simulations).toFixed(2)} hits/game | 14pts: ${stats.rf[14]} | 15pts: ${stats.rf[15]}`);
    console.log(`Gradient Boosting: ${(stats.gbdt.hits / simulations).toFixed(2)} hits/game | 14pts: ${stats.gbdt[14]} | 15pts: ${stats.gbdt[15]}`);
};

run();
