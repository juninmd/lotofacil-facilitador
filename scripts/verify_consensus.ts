import { generateConsensusGame, simulateBacktest } from '../src/utils/statistics';
import type { LotofacilResult } from '../src/game';

// Helper to create dummy games
const createDummyGame = (num: number, dezenas: number[]): LotofacilResult => ({
    numero: num,
    listaDezenas: dezenas,
    dataApuracao: '01/01/2023',
    listaRateioPremio: []
});

// Create a history of 100 games (enough for simulation requirements)
const history: LotofacilResult[] = [];
for (let i = 0; i < 100; i++) {
    // Generate semi-random numbers
    const dezenas = Array.from({ length: 25 }, (_, k) => k + 1)
        .sort(() => Math.random() - 0.5)
        .slice(0, 15)
        .sort((a, b) => a - b);
    history.push(createDummyGame(30 - i, dezenas));
}

console.log('Running Consensus Algorithm Verification...');

try {
    const start = performance.now();
    const prediction = generateConsensusGame(history, 15);
    const end = performance.now();

    console.log(`Prediction generated in ${(end - start).toFixed(2)}ms`);
    console.log('Prediction:', prediction);

    if (prediction.length !== 15) {
        throw new Error(`Invalid prediction length: ${prediction.length}`);
    }

    const unique = new Set(prediction);
    if (unique.size !== 15) {
        throw new Error('Prediction contains duplicate numbers');
    }

    console.log('Running Simulation Backtest including Consensus...');
    const simulation = simulateBacktest(history, 5);

    console.log('Consensus Stats:', simulation.consensus);

    if (simulation.consensus.gamesSimulated !== 5) {
         throw new Error(`Simulation failed. Expected 5 games, got ${simulation.consensus.gamesSimulated}`);
    }

    console.log('✅ Verification Passed!');
} catch (error) {
    console.error('❌ Verification Failed:', error);
    process.exit(1);
}
