import { crowdIndex, type CrowdModel } from './crowd';
import { makeDraws, mulberry32, popcount, randomMask, fromMask, toMask, type Rng } from './rng';

// Otimizador de portfólio por Monte Carlo + busca local (hill climbing).
//
// O que é REAL aqui: com N jogos, o retorno esperado é fixo (linearidade), mas
// jogos ESPALHADOS (pouca sobreposição) elevam P(pelo menos um prêmio) — medido
// por Monte Carlo com números aleatórios comuns — e jogos POUCO POPULARES
// (índice de multidão baixo) dividem o prêmio com menos gente. O otimizador
// maximiza a primeira sob restrição da segunda. Nada aqui prevê o sorteio.

export type Objective = 'coverage' | 'tiered';

export interface OptimizeOptions {
  objective?: Objective;
  restarts?: number; // reinícios independentes; fica o melhor
  annealing?: boolean; // aceita pioras pequenas no início (foge de ótimos locais)
  games: number; // quantos jogos no portfólio
  size?: number; // dezenas por jogo (15 por padrão)
  pool?: number[]; // restringe as dezenas (desdobramento); padrão 1..25
  trainDraws?: number; // sorteios simulados usados na busca
  iterations?: number; // tentativas de troca
  crowd?: { model: CrowdModel; baseline: number; maxIndex: number };
  seed?: number;
}

// Placar por faixa: 11 acertos vale 1; faixas maiores valem mais (cobrir 12-13
// também importa); 9-10 dão gradiente à busca. 'coverage' = só P(>=11).
const TIERS: Record<Objective, number[]> = {
  coverage: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.04, 1, 1, 1, 1, 1],
  tiered: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.02, 0.04, 1, 1.6, 2.6, 6, 12],
};

const randomTicket = (rng: Rng, pool: number[], size: number): number[] => {
  const p = [...pool];
  for (let i = 0; i < size; i++) {
    const j = i + Math.floor(rng() * (p.length - i));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p.slice(0, size).sort((a, b) => a - b);
};

const optimizeOnce = (opts: OptimizeOptions, seed: number): { tickets: number[][]; value: number } => {
  const size = opts.size ?? 15;
  const pool = opts.pool ?? Array.from({ length: 25 }, (_, i) => i + 1);
  const D = opts.trainDraws ?? 6000;
  const tier = TIERS[opts.objective ?? 'coverage'];
  const rng = mulberry32(seed);
  const draws = makeDraws(D, rng);
  const ok = (t: number[]): boolean =>
    !opts.crowd || crowdIndex(opts.crowd.model, t, opts.crowd.baseline) <= opts.crowd.maxIndex;

  const draft = (): number[] => {
    for (let a = 0; a < 400; a++) { const t = randomTicket(rng, pool, size); if (ok(t)) return t; }
    return randomTicket(rng, pool, size);
  };
  const tickets = Array.from({ length: opts.games }, draft);
  const masks = tickets.map(toMask);
  const hits = masks.map((m) => Uint8Array.from(draws, (d) => popcount(m & d)));

  // Por sorteio: melhor acerto, quantos jogos o atingem e o 2º melhor. Assim o
  // "melhor sem o jogo i" sai em O(1) e cada troca custa O(D), não O(jogos·D).
  const top = new Uint8Array(D);
  const topCount = new Uint8Array(D);
  const second = new Uint8Array(D);
  let current = 0;
  const rebuild = (): void => {
    current = 0;
    for (let d = 0; d < D; d++) {
      let b1 = 0, c1 = 0, b2 = 0;
      for (const h of hits) {
        const v = h[d];
        if (v > b1) { b2 = b1; b1 = v; c1 = 1; } else if (v === b1) c1++; else if (v > b2) b2 = v;
      }
      top[d] = b1; topCount[d] = c1; second[d] = c1 > 1 ? b1 : b2;
      current += tier[b1];
    }
  };
  rebuild();
  let best = current;
  let bestTickets = tickets.map((t) => [...t]);
  const iters = opts.iterations ?? 1500;
  const t0 = opts.annealing ? Math.max(1, D * 0.0015) : 0; // temperatura inicial ~0,15% do placar
  for (let it = 0; it < iters; it++) {
    const i = Math.floor(rng() * tickets.length);
    const t = tickets[i];
    const out = t[Math.floor(rng() * t.length)];
    const cand = pool.filter((n) => !t.includes(n));
    if (!cand.length) continue;
    const inn = cand[Math.floor(rng() * cand.length)];
    const nt = t.map((n) => (n === out ? inn : n)).sort((a, b) => a - b);
    if (!ok(nt)) continue;
    const nm = toMask(nt);
    const hi = hits[i];
    let s = 0;
    for (let d = 0; d < D; d++) {
      const rest = hi[d] === top[d] && topCount[d] === 1 ? second[d] : top[d];
      const h = popcount(nm & draws[d]);
      s += tier[h > rest ? h : rest];
    }
    const temp = t0 * (1 - it / iters);
    if (s >= current || (temp > 0 && rng() < Math.exp((s - current) / temp))) {
      tickets[i] = nt; masks[i] = nm; hits[i] = Uint8Array.from(draws, (d) => popcount(nm & d));
      rebuild();
      if (current > best) { best = current; bestTickets = tickets.map((x) => [...x]); }
    }
  }
  return { tickets: bestTickets, value: best };
};

export const optimizePortfolio = (opts: OptimizeOptions): number[][] => {
  const seed = opts.seed ?? 1;
  let winner: { tickets: number[][]; value: number } | null = null;
  for (let r = 0; r < (opts.restarts ?? 1); r++) {
    const cand = optimizeOnce(opts, seed + r * 7919);
    // Restarts usam sorteios de treino distintos: value só é comparável dentro
    // do mesmo conjunto, então o vencedor é o de maior valor por sorteio.
    if (!winner || cand.value > winner.value) winner = cand;
  }
  return winner!.tickets;
};

/** Portfólio aleatório de referência (baseline honesto para medir o ganho). */
export const randomPortfolio = (games: number, size: number, rng: Rng, pool?: number[]): number[][] => {
  const p = pool ?? Array.from({ length: 25 }, (_, i) => i + 1);
  return Array.from({ length: games }, () => (size === 15 && !pool ? fromMask(randomMask(rng)) : randomTicket(rng, p, size)));
};
