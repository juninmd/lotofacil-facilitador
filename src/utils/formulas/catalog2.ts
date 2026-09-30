import { W, freqWindow, rankVector, type Ctx } from './context';
import { FORMULAS, registerFormula, type Scorer } from './catalog';

// Fórmulas com estado online (aprendem conforme t avança) e ensembles.
// `online` reinicia o estado se t voltar atrás (nova execução do harness).
const online = <S,>(init: (c: Ctx) => S, step: (s: S, c: Ctx, t: number) => void, score: (s: S, c: Ctx, t: number) => Float64Array): Scorer => {
  let st: S | null = null; let done = 0; let owner: Ctx | null = null;
  return (c, t) => {
    if (owner !== c || t < done) { st = init(c); done = 0; owner = c; }
    while (done < t) { step(st as S, c, done); done++; }
    return score(st as S, c, t);
  };
};
const per = (f: (n: number) => number): Float64Array => { const s = new Float64Array(W); for (let n = 1; n <= 25; n++) s[n] = f(n); return s; };
const add = (id: string, family: string, label: string, score: Scorer) => registerFormula({ id, family, label, score });

// Hazard por atraso: P(sair | dias sem sair = g) estimada de forma agrupada.
add('hazard_gap', 'Atraso', 'Hazard empírico por tamanho do atraso', online(
  () => ({ hit: new Float64Array(200), tot: new Float64Array(200) }),
  (s, c, t) => { for (let n = 1; n <= 25; n++) { const g = Math.min(199, c.gap[t * W + n]); s.tot[g]++; s.hit[g] += c.member[t * W + n]; } },
  (s, c, t) => per((n) => { const g = Math.min(199, c.gap[t * W + n]); return (s.hit[g] + 6) / (s.tot[g] + 10); }),
));

// Regressão logística online (SGD): features = 5 últimos sorteios + freq(50) + atraso.
const feats = (c: Ctx, t: number, n: number): number[] => [1, ...[1, 2, 3, 4, 5].map((k) => (t >= k ? c.member[(t - k) * W + n] : 0.6)), freqWindow(c, t, n, 50) / 50 - 0.6, Math.min(c.gap[t * W + n], 10) / 10];
add('logit_online', 'Aprendizado', 'Regressão logística online (SGD)', online(
  () => ({ w: new Float64Array(8) }),
  (s, c, t) => {
    if (t < 60) return;
    for (let n = 1; n <= 25; n++) {
      const x = feats(c, t, n); const z = x.reduce((a, v, i) => a + v * s.w[i], 0);
      const err = c.member[t * W + n] - 1 / (1 + Math.exp(-z));
      for (let i = 0; i < 8; i++) s.w[i] += 0.01 * err * x[i];
    }
  },
  (s, c, t) => per((n) => feats(c, t, n).reduce((a, v, i) => a + v * s.w[i], 0)),
));

// KNN: média dos SUCESSORES dos sorteios passados mais parecidos com o último.
for (const k of [20, 100]) add(`knn_${k}`, 'Vizinhos', `KNN (k=${k}) por Jaccard do último sorteio`, (c, t) => {
  if (t < k + 2) return new Float64Array(W);
  const last = new Set(c.draws[t - 1]);
  const sims: [number, number][] = [];
  for (let u = 0; u < t - 1; u++) sims.push([c.draws[u].filter((n) => last.has(n)).length, u]);
  sims.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const s = new Float64Array(W);
  for (const [, u] of sims.slice(0, k)) for (const n of c.draws[u + 1]) s[n]++;
  return s;
});

// Mesmo dia da semana (máquinas/bolas distintas por dia?) e mês.
add('dia_semana', 'Calendário', 'Frequência no mesmo dia da semana', (c, t) => per((n) => {
  let h = 0, tot = 0;
  for (let u = 0; u < t; u++) if (c.dow[u] === c.dow[t]) { tot++; h += c.member[u * W + n]; }
  return (h + 6) / (tot + 10);
}));
// Vizinhança no volante 5x5: dezenas cujos vizinhos saíram no último sorteio.
add('vizinhos_volante', 'Volante', 'Vizinhos (grade 5x5) do último sorteio', (c, t) => per((n) => {
  const r = Math.floor((n - 1) / 5), col = (n - 1) % 5; let s = 0;
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const rr = r + dr, cc = col + dc;
    if (rr >= 0 && rr < 5 && cc >= 0 && cc < 5 && t > 0) s += c.member[(t - 1) * W + rr * 5 + cc + 1];
  }
  return s;
}));
// Afinidade de pares: lift médio de (m no último sorteio → n no próximo).
add('par_afinidade', 'Pares', 'Lift de pares (último → próximo)', online(
  () => ({ pair: new Float64Array(26 * 26), prev: new Float64Array(W), cnt: new Float64Array(W), tot: 0 }),
  (s, c, t) => {
    if (t === 0) return;
    for (const m of c.draws[t - 1]) { s.prev[m]++; for (const n of c.draws[t]) s.pair[m * 26 + n]++; }
    for (const n of c.draws[t]) s.cnt[n]++; s.tot++;
  },
  (s, c, t) => per((n) => { let a = 0; if (t > 0) for (const m of c.draws[t - 1]) a += (s.pair[m * 26 + n] + 0.6) / (s.prev[m] + 1) - 0.6; return a; }),
));

// Ensembles por agregação de ranks (Borda) — inclui a fórmula própria.
const ensemble = (ids: string[], rnd0 = 0): Scorer => (c, t, rnd) => {
  const parts = ids.map((id) => rankVector(FORMULAS.find((f) => f.id === id)!.score(c, t, rnd)));
  return per((n) => parts.reduce((a, p) => a + p[n], 0) + rnd0 * rnd());
};
add('ens_estatistico', 'Ensemble', 'Borda: EB-1000 + Markov + atraso relativo', ensemble(['eb_1000', 'markov1', 'atraso_relativo']));
add('ens_aprendizado', 'Ensemble', 'Borda: logit + hazard + KNN-100', ensemble(['logit_online', 'hazard_gap', 'knn_100']));
add('ens_todos', 'Ensemble', 'Borda: 8 melhores famílias', ensemble(['eb_1000', 'markov1', 'atraso_relativo', 'logit_online', 'hazard_gap', 'knn_100', 'dia_semana', 'par_afinidade']));
