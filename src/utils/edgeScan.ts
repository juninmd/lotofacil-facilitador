import type { LotofacilResult } from '../game';

// Varredura EXAUSTIVA de "edges" (vantagens) preditivas. Para cada hipótese de
// padrão, roda um walk-forward (treina no passado, prevê o alvo) e mede a média
// de acertos COM intervalo de confiança 95%. Assim distinguimos vantagem real
// de flutuação aleatória: se o IC de uma estratégia não separa do aleatório,
// não há edge — por mais convincente que a média pareça.

const ALL = Array.from({ length: 25 }, (_, i) => i + 1);

// Escolhe as `q` dezenas de maior score (determinístico). Desempate: número menor.
const topByScore = (score: Map<number, number>, q: number): number[] =>
  [...ALL].sort((a, b) => (score.get(b)! - score.get(a)!) || a - b).slice(0, q).sort((a, b) => a - b);

const freqIn = (games: LotofacilResult[]): Map<number, number> => {
  const m = new Map<number, number>(ALL.map((n) => [n, 0]));
  games.forEach((g) => g.listaDezenas.forEach((n) => m.set(n, (m.get(n) || 0) + 1)));
  return m;
};

const delays = (games: LotofacilResult[]): Map<number, number> => {
  const d = new Map<number, number>(ALL.map((n) => [n, games.length]));
  const seen = new Set<number>();
  for (let i = 0; i < games.length && seen.size < 25; i++) {
    games[i].listaDezenas.forEach((n) => {
      if (!seen.has(n)) { d.set(n, i); seen.add(n); }
    });
  }
  return d;
};

// train: histórico ANTERIOR ao alvo (mais novo [0] ao mais antigo). Retorna 15 dezenas.
export type PickFn = (train: LotofacilResult[], rnd: () => number) => number[];

export const STRATEGIES: Record<string, PickFn> = {
  aleatorio: (_t, rnd) => topByScore(new Map(ALL.map((n) => [n, rnd()])), 15),
  quente_total: (t) => topByScore(freqIn(t), 15),
  quente_recente: (t) => topByScore(freqIn(t.slice(0, 50)), 15),
  frio_total: (t) => { const f = freqIn(t); return topByScore(new Map(ALL.map((n) => [n, -(f.get(n) || 0)])), 15); },
  atrasado: (t) => topByScore(delays(t), 15),
  markov_par: (t) => {
    // Score = quantas vezes cada dezena co-ocorreu com as do último concurso.
    const last = t[0]?.listaDezenas ?? [];
    const co = new Map<number, number>(ALL.map((n) => [n, 0]));
    t.forEach((g) => {
      const hit = g.listaDezenas.filter((n) => last.includes(n)).length;
      if (hit >= 8) g.listaDezenas.forEach((n) => co.set(n, (co.get(n) || 0) + 1));
    });
    return topByScore(co, 15);
  },
  repete_modal: (t) => {
    // Mantém as ~9 dezenas mais frequentes do último concurso (repetição típica)
    // e completa com as mais quentes de fora.
    const last = new Set(t[0]?.listaDezenas ?? []);
    const f = freqIn(t);
    const fromLast = [...last].sort((a, b) => (f.get(b)! - f.get(a)!)).slice(0, 9);
    const rest = ALL.filter((n) => !fromLast.includes(n)).sort((a, b) => (f.get(b)! - f.get(a)!)).slice(0, 6);
    return [...fromLast, ...rest].sort((a, b) => a - b);
  },
  soma_alvo: (t) => {
    // Prefere dezenas que aproximam a soma da média histórica (~187).
    const meanSum = t.reduce((s, g) => s + g.listaDezenas.reduce((a, b) => a + b, 0), 0) / Math.max(1, t.length);
    const ideal = meanSum / 15; // valor médio por dezena
    return topByScore(new Map(ALL.map((n) => [n, -Math.abs(n - ideal)])), 15);
  },
};

export interface EdgeResult {
  nome: string;
  alvos: number;
  media: number;
  erroPadrao: number;
  ic95: [number, number];
  melhor: number;
  faixa14: number;
  faixa15: number;
}

const makeRng = (seed: number) => {
  let x = seed >>> 0;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 0xffffffff;
};

// Roda o walk-forward para todas as estratégias sobre os `targets` concursos
// mais recentes; cada alvo treina em TODO o histórico anterior.
export const scanEdges = (history: LotofacilResult[], targets: number, quantity = 15): EdgeResult[] => {
  const names = Object.keys(STRATEGIES);
  const hitsByStrat: Record<string, number[]> = Object.fromEntries(names.map((n) => [n, []]));
  const rnd = makeRng(20240719);

  const limit = Math.min(targets, Math.max(0, history.length - 50));
  for (let i = 0; i < limit; i++) {
    const target = history[i];
    const train = history.slice(i + 1);
    if (train.length < 50) break;
    for (const name of names) {
      const pick = STRATEGIES[name](train, rnd).slice(0, quantity);
      hitsByStrat[name].push(pick.filter((n) => target.listaDezenas.includes(n)).length);
    }
  }

  return names
    .map((name) => {
      const arr = hitsByStrat[name];
      const n = arr.length || 1;
      const mean = arr.reduce((a, b) => a + b, 0) / n;
      const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
      const se = Math.sqrt(variance / n);
      return {
        nome: name,
        alvos: arr.length,
        media: +mean.toFixed(3),
        erroPadrao: +se.toFixed(3),
        ic95: [+(mean - 1.96 * se).toFixed(3), +(mean + 1.96 * se).toFixed(3)] as [number, number],
        melhor: Math.max(0, ...arr),
        faixa14: arr.filter((h) => h >= 14).length,
        faixa15: arr.filter((h) => h >= 15).length,
      };
    })
    .sort((a, b) => b.media - a.media);
};
