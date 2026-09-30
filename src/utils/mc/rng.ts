// Utilidades de Monte Carlo: PRNG semeado (reprodutível) e máscaras de bits.
// Cada jogo/sorteio vira um inteiro de 25 bits (bit n-1 = dezena n): interseção
// e contagem de acertos viram AND + popcount, ~50x mais rápido que Set/includes.

export type Rng = () => number;

// mulberry32: PRNG de 32 bits, rápido e de boa qualidade estatística p/ simulação.
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const popcount = (x: number): number => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24);
};

export const toMask = (nums: number[]): number => nums.reduce((m, n) => m | (1 << (n - 1)), 0);

export const fromMask = (mask: number): number[] => {
  const out: number[] = [];
  for (let n = 1; n <= 25; n++) if (mask & (1 << (n - 1))) out.push(n);
  return out;
};

// Sorteio uniforme de `k` dezenas entre 25 (Fisher-Yates parcial) como máscara.
export const randomMask = (rng: Rng, k = 15): number => {
  const pool = Array.from({ length: 25 }, (_, i) => i);
  let mask = 0;
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (25 - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    mask |= 1 << pool[i];
  }
  return mask;
};

export const makeDraws = (count: number, rng: Rng): Int32Array => {
  const draws = new Int32Array(count);
  for (let i = 0; i < count; i++) draws[i] = randomMask(rng);
  return draws;
};
