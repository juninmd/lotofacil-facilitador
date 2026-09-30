import React, { useState } from 'react';
import { simulateBacktest, type SimulationResult } from '../utils/statistics';
import type { LotofacilResult } from '../game';
import { ALGORITHMS } from '../algorithms';
import { Callout, Card, Spinner } from './ui';

const NAMES: Record<string, string> = { random: 'Aleatório (controle)', ...Object.fromEntries(ALGORITHMS.map((a) => [a.id, a.label])) };

// Ranking walk-forward: cada algoritmo "joga" os últimos concursos treinando só
// com o passado. O controle aleatório mostra que todos empatam em ~9 acertos.
const SimulationPanel: React.FC<{ games: LotofacilResult[]; disabled: boolean }> = ({ games, disabled }) => {
  const [busy, setBusy] = useState(false);
  const [sim, setSim] = useState<SimulationResult | null>(null);

  const run = () => {
    setBusy(true);
    setTimeout(async () => {
      try { setSim(await simulateBacktest(games, 5)); } catch (e) { console.error(e); } finally { setBusy(false); }
    }, 60);
  };

  const rows = sim
    ? Object.entries(sim).filter(([, s]) => s && s.gamesSimulated > 0).map(([id, s]) => ({ id, avg: s.averageHits, p14: s.accuracyDistribution[14] || 0, p15: s.accuracyDistribution[15] || 0 })).sort((a, b) => b.avg - a.avg)
    : [];

  return (
    <Card eyebrow="Validação" title="Comparativo de algoritmos" aside={
      <button onClick={run} disabled={disabled || busy || games.length < 50} className="btn-ghost flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold">
        {busy ? <><Spinner /> Simulando…</> : 'Rodar simulação'}
      </button>
    }>
      {rows.length === 0 ? (
        <p className="text-sm text-white/55">Rode a simulação para comparar a média de acertos de cada método em concursos passados.</p>
      ) : (
        <>
          <ul className="grid gap-2">
            {rows.map((r) => (
              <li key={r.id} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div aria-hidden className="absolute inset-y-0 left-0 bg-violet-500/20" style={{ width: `${(r.avg / 15) * 100}%` }} />
                <div className="relative flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-white/90">{NAMES[r.id] ?? r.id}</span>
                  <span className="flex items-center gap-3 tabular-nums text-white/60">
                    <span className="text-[11px]">14: {r.p14} · 15: {r.p15}</span>
                    <strong className="text-white">{r.avg.toFixed(2)}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3"><Callout>Diferenças de centésimos entre métodos são ruído estatístico: o valor esperado ao marcar 15 dezenas é exatamente 9,00.</Callout></div>
        </>
      )}
    </Card>
  );
};

export default SimulationPanel;
