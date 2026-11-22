import { describe, expect, it } from 'vitest';
import { mulberry32, sampleK } from './rng';

// sort(() => rng() - 0.5) is not a uniform shuffle; Random Forest subspaces and
// the random backtest baseline need every element to be equally likely.
describe('sampleK', () => {
  it('returns k distinct items from the input without mutating it', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const out = sampleK(items, 3, mulberry32(1));
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((x) => expect(items).toContain(x));
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('picks every element with frequency k/n (within 2%)', () => {
    const rng = mulberry32(42);
    const n = 7, k = 3, draws = 100_000;
    const counts = new Array(n).fill(0);
    for (let i = 0; i < draws; i++) for (const x of sampleK([0, 1, 2, 3, 4, 5, 6], k, rng)) counts[x]++;
    const expected = (draws * k) / n;
    counts.forEach((c) => expect(Math.abs(c - expected) / expected).toBeLessThan(0.02));
  });

  it('clamps k to the input size', () => {
    expect(sampleK([1, 2], 5, mulberry32(3)).sort()).toEqual([1, 2]);
    expect(sampleK([], 2, mulberry32(3))).toEqual([]);
  });
});
