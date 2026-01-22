import type { LotofacilResult } from '../game';
import {
    getDynamicStats,
    scoreCandidate,
    calculateMomentum,
    getWeightedRandomSubset,
    getCycleMissingNumbers
} from './statistics';

const POPULATION_SIZE = 50;
const GENERATIONS = 50;
const MUTATION_RATE = 0.1;
const TOURNAMENT_SIZE = 3;

export const generateGeneticGame = (history: LotofacilResult[], quantity: number = 15): number[] => {
    if (history.length < 20) return [];

    const stats = getDynamicStats(history);
    const momentum = calculateMomentum(history);
    // const delays = calculateDelays(history);
    const missingInCycle = getCycleMissingNumbers(history);
    const latestGameDezenas = history[0].listaDezenas;

    // 1. Build Initial Weights for seeding population
    // We reuse the logic from Smart Game to give the GA a good starting point
    const weights = new Map<number, number>();
    const frequencyMap = new Map<number, number>();
    history.forEach(g => g.listaDezenas.forEach(n => frequencyMap.set(n, (frequencyMap.get(n) || 0) + 1)));
    const numGames = history.length;

    for (let i = 1; i <= 25; i++) {
        const freq = frequencyMap.get(i) || 0;
        const normFreq = freq / numGames;
        const mom = momentum.get(i) || 0;

        let weight = 1.0 + (normFreq * 1.5);
        if (mom > 0) weight += mom * 0.3;

        // Boost cycle missing numbers heavily
        if (missingInCycle.includes(i)) weight += 5.0;

        weights.set(i, weight);
    }

    const allNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

    // 2. Initialize Population
    let population: number[][] = [];
    for (let i = 0; i < POPULATION_SIZE; i++) {
        // 80% Smart Seed, 20% Pure Random Seed for diversity
        if (i < POPULATION_SIZE * 0.8) {
            population.push(getWeightedRandomSubset(allNumbers, weights, quantity));
        } else {
             // Pure random fill
             const p = new Set<number>();
             while(p.size < quantity) p.add(Math.floor(Math.random() * 25) + 1);
             population.push(Array.from(p).sort((a,b) => a-b));
        }
    }

    // Helper: Fitness Wrapper
    const getFitness = (game: number[]) => scoreCandidate(game, stats, latestGameDezenas);

    // 3. Evolution Loop
    for (let gen = 0; gen < GENERATIONS; gen++) {
        // Sort by fitness
        population.sort((a, b) => getFitness(b) - getFitness(a));

        // Elitism: Keep top 2
        const nextGen: number[][] = [population[0], population[1]];

        while (nextGen.length < POPULATION_SIZE) {
            // Selection
            const parent1 = tournamentSelect(population, getFitness);
            const parent2 = tournamentSelect(population, getFitness);

            // Crossover
            let child = uniformCrossover(parent1, parent2, quantity);

            // Mutation
            if (Math.random() < MUTATION_RATE) {
                child = mutate(child);
            }

            nextGen.push(child);
        }

        population = nextGen;

        // Early exit if found perfect score (unlikely but possible)
        if (getFitness(population[0]) > 0.99) break;
    }

    // Return best
    population.sort((a, b) => getFitness(b) - getFitness(a));
    return population[0];
};

const tournamentSelect = (population: number[][], fitnessFn: (g: number[]) => number): number[] => {
    let best: number[] | null = null;
    let bestFit = -1;

    for (let i = 0; i < TOURNAMENT_SIZE; i++) {
        const ind = population[Math.floor(Math.random() * population.length)];
        const fit = fitnessFn(ind);
        if (fit > bestFit) {
            bestFit = fit;
            best = ind;
        }
    }
    return best || population[0];
};

const uniformCrossover = (p1: number[], p2: number[], size: number): number[] => {
    const combined = new Set([...p1, ...p2]);
    const p1Set = new Set(p1);
    const p2Set = new Set(p2);

    // Numbers present in both are highly likely to be good
    const intersection = p1.filter(n => p2Set.has(n));

    // Numbers in only one
    const symmetricDifference = [...combined].filter(n => !p1Set.has(n) || !p2Set.has(n));

    const child = new Set(intersection);

    // Fill the rest randomly from the difference pool
    while (child.size < size && symmetricDifference.length > 0) {
        const idx = Math.floor(Math.random() * symmetricDifference.length);
        child.add(symmetricDifference[idx]);
        symmetricDifference.splice(idx, 1);
    }

    // If still not full (rare, if parents are identical), fill from 1-25
    if (child.size < size) {
        const all = Array.from({ length: 25 }, (_, i) => i + 1);
        while (child.size < size) {
            const n = all[Math.floor(Math.random() * 25)];
            child.add(n);
        }
    }

    return Array.from(child).sort((a, b) => a - b);
};

const mutate = (game: number[]): number[] => {
    const newGame = new Set(game);
    const all = Array.from({ length: 25 }, (_, i) => i + 1);
    const outside = all.filter(n => !newGame.has(n));

    // Remove one random
    const toRemove = game[Math.floor(Math.random() * game.length)];
    newGame.delete(toRemove);

    // Add one random from outside
    const toAdd = outside[Math.floor(Math.random() * outside.length)];
    newGame.add(toAdd);

    return Array.from(newGame).sort((a, b) => a - b);
};
