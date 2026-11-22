import { describe, it, expect } from 'vitest';
import type { LotofacilResult } from '../../game';
import { countHits, prizeFor, newAccumulator, record, summarize } from './hitStats';
import { evaluate, runBenchmark, withSeed, type Contender } from './benchmark';
import { verdict, toMarkdown } from './report';
import { trainingWindow, frequencyFallback } from '../mlWindow';
import { generateRandomForestGame } from '../randomForestStrategy';

const game = (numero: number, dezenas: number[]): LotofacilResult => ({
  numero,
  listaDezenas: dezenas,
  dataApuracao: '',
  listaRateioPremio: [5, 4, 3, 2, 1].map((faixa) => ({ faixa, numeroDeGanhadores: 1, valorPremio: faixa === 5 ? 7 : 1000, descricaoFaixa: '' })),
});
const seq = (from: number) => Array.from({ length: 15 }, (_, i) => ((from + i) % 25) + 1).sort((a, b) => a - b);
const history = Array.from({ length: 120 }, (_, i) => game(120 - i, seq(i))); // mais novo primeiro

describe('hitStats', () => {
  it('conta acertos e paga o rateio real', () => {
    expect(countHits([1, 2, 3], [2, 3, 4])).toBe(2);
    expect(prizeFor(history[0], 11)).toBe(7);
    expect(prizeFor(history[0], 10)).toBe(0);
    const acc = newAccumulator();
    record(acc, history[0].listaDezenas, history[0]);
    const s = summarize(acc);
    expect(s.avgHits).toBe(15);
    expect(s.p13).toBe(1);
    expect(s.returnPerReal).toBeCloseTo(1000 / 3.5, 2);
  });
  it('resumo vazio é zero', () => expect(summarize(newAccumulator()).targets).toBe(0));
});

describe('benchmark', () => {
  const oracle: Contender = { id: 'oráculo-anterior', window: 5, targets: 20, run: (t) => t[0].listaDezenas };
  it('não vaza o futuro: o treino começa no concurso anterior ao alvo', async () => {
    const seen: number[] = [];
    await evaluate(history, { id: 'spy', window: 3, targets: 4, run: (t) => { seen.push(t[0].numero); return t[0].listaDezenas; } });
    expect(seen).toEqual([119, 118, 117, 116]);
  });
  it('é reprodutível (Math.random semeado) e restaura Math.random', async () => {
    const original = Math.random;
    const a = await withSeed(7, () => Math.random());
    const b = await withSeed(7, () => Math.random());
    expect(a).toBe(b);
    expect(Math.random).toBe(original);
  });
  it('ordena por média e calcula as metades', async () => {
    const rows = await runBenchmark(history, [oracle, { ...oracle, id: 'fixo', run: () => seq(0) }]);
    expect(rows).toHaveLength(2);
    expect(rows[0].avgHits).toBeGreaterThanOrEqual(rows[1].avgHits);
    expect(typeof rows[0].zOld).toBe('number');
    expect(verdict(rows[0])).toBe('pouco poder');
    expect(verdict({ ...rows[0], targets: 500, z: 3, zOld: 1, zNew: 1 })).toContain('consistente');
    expect(verdict({ ...rows[0], targets: 500, z: 1.2, zOld: 1, zNew: 1 })).toContain('fraco');
    expect(verdict({ ...rows[0], targets: 500, z: 0 })).toContain('acaso');
    expect(toMarkdown({ date: 'x', lastContest: 1, shortRun: rows, longRun: [] })).toContain('| fixo |');
  });
});

describe('mlWindow', () => {
  it('adapta a janela de treino ao histórico', () => {
    expect(trainingWindow(100, 100)).toBe(49);
    expect(trainingWindow(500, 100)).toBe(100);
    expect(trainingWindow(30, 100)).toBe(0);
  });
  it('fallback usa frequência, não 1..15', () => {
    expect(frequencyFallback([game(1, seq(10))], 15)).toEqual(seq(10));
  });
  it('Random Forest com 100 concursos (como no app) não devolve mais 1..15 fixo', () => {
    const real = history.slice(0, 100).map((g, i) => ({ ...g, listaDezenas: seq((i * 7) % 25) }));
    const pick = generateRandomForestGame(real, 15);
    expect(pick).toHaveLength(15);
    expect(pick).not.toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  });
});
