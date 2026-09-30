import { crowdIndex, type CrowdModel } from './crowd';
import { makeDraws, mulberry32, popcount, randomMask, fromMask, toMask, type Rng } from './rng';

// Otimizador de portfólio por Monte Carlo + busca local (hill climbing).
//
// O que é REAL aqui: com N jogos, o retorno esperado é fixo (linearidade), mas
// jogos ESPALHADOS (pouca sobreposição) elevam P(pelo menos um prêmio) — medido
// por Monte Carlo com números aleatórios comuns — e jogos POUCO POPULARES
// (índice de multidão baixo) dividem o prêmio com menos gente. O otimizador
// maximiza a primeira sob restrição da segunda. Nada aqui prevê o sorteio.

export interface OptimizeOptions {
  games: number; // quantos jogos no portfólio
  size?: number; // dezenas por jogo (15 por padrão)
  pool?: number[]; // restringe as dezenas (desdobramento); padrão 1..25
  trainDraws?: number; // sorteios simulados usados na busca
  iterations?: number; // tentativas de troca
  crowd?: { model: CrowdModel; baseline: number; maxIndex: number };
  seed?: number;
}

const WIN_MIN = 11;
// Placar suave: prêmio (>=11) vale 1; quase-prêmio (9-10) dá gradiente à busca.
const score = (best: number): number => (best >= WIN_MIN ? 1 : best >= 9 ? 0.02 * (best - 8) : 0);

const randomTicket = (rng: Rng, pool: number[], size: number): number[] => {
  const p = [...pool];
  for (let i = 0; i < size; i++) {
    const j = i + Math.floor(rng() * (p.length - i));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p.slice(0, size).sort((a, b) => a - b);
};

export const optimizePortfolio = (opts: OptimizeOptions): number[][] => {
  const size = opts.size ?? 15;
  const pool = opts.pool ?? Array.from({ length: 25 }, (_, i) => i + 1);
  const D = opts.trainDraws ?? 6000;
  const rng = mulberry32(opts.seed ?? 1);
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

  const total = (): number => {
    let s = 0;
    for (let d = 0; d < D; d++) { let b = 0; for (const h of hits) if (h[d] > b) b = h[d]; s += score(b); }
    return s;
  };
  let current = total();
  const iters = opts.iterations ?? 1500;
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
    const nh = Uint8Array.from(draws, (d) => popcount(nm & d));
    let s = 0;
    for (let d = 0; d < D; d++) {
      let b = nh[d];
      for (let k = 0; k < hits.length; k++) if (k !== i && hits[k][d] > b) b = hits[k][d];
      s += score(b);
    }
    if (s >= current) { current = s; tickets[i] = nt; masks[i] = nm; hits[i] = nh; }
  }
  return tickets;
};

/** Portfólio aleatório de referência (baseline honesto para medir o ganho). */
export const randomPortfolio = (games: number, size: number, rng: Rng, pool?: number[]): number[][] => {
  const p = pool ?? Array.from({ length: 25 }, (_, i) => i + 1);
  return Array.from({ length: games }, () => (size === 15 && !pool ? fromMask(randomMask(rng)) : randomTicket(rng, p, size)));
};
