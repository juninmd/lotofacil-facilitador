import React, { useState } from 'react';
import { ALGORITHMS, GROUPS, findAlgorithm, type AlgorithmId } from '../algorithms';
import type { LotofacilResult } from '../game';
import { backtestGame, calculateConfidence, calculateProjectedStats, type BacktestResult, type ProjectedStats } from '../utils/statistics';
import { ticketCost } from '../utils/probability';
import { formatBRL } from '../format';
import { Card, Spinner } from './ui';
import GameResult from './GameResult';
import SimulationPanel from './SimulationPanel';

const SIZES = [15, 16, 17, 18, 19, 20];

const GeneratorPanel: React.FC<{ games: LotofacilResult[]; disabled: boolean }> = ({ games, disabled }) => {
  const [algo, setAlgo] = useState<AlgorithmId>('smart');
  const [quantity, setQuantity] = useState(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ game: number[]; confidence: number; projected: ProjectedStats; backtest: BacktestResult } | null>(null);

  const generate = async () => {
    setBusy(true); setError(null);
    try {
      const game = await findAlgorithm(algo).run(games, quantity);
      setResult({
        game,
        confidence: calculateConfidence(game, games),
        projected: calculateProjectedStats(game, games),
        backtest: backtestGame(game, games, quantity),
      });
    } catch (e) {
      console.error(e);
      setError('Erro ao gerar jogo.');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-6">
      <Card eyebrow="Gerador" title="Escolha o algoritmo">
        {GROUPS.map((g) => (
          <fieldset key={g} className="mb-4 last:mb-0">
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">{g}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {ALGORITHMS.filter((a) => a.group === g).map((a) => (
                <button key={a.id} type="button" aria-pressed={algo === a.id} onClick={() => setAlgo(a.id)} className="chip rounded-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-violet-400">
                  <span className="block text-sm font-semibold text-white">{a.label}</span>
                  <span className="block text-[11px] text-white/50">{a.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="mt-5 border-t border-white/10 pt-4">
          <p id="qty" className="mb-2 text-sm font-medium text-white/80">Dezenas na aposta</p>
          <div role="group" aria-labelledby="qty" className="flex flex-wrap gap-2">
            {SIZES.map((q) => (
              <button key={q} type="button" aria-pressed={quantity === q} onClick={() => setQuantity(q)} aria-label={`${q} dezenas, ${formatBRL(ticketCost(q))}`} className="chip min-w-[5.5rem] rounded-xl px-3 py-2 text-center focus-visible:outline-2 focus-visible:outline-violet-400">
                <span className="block text-base font-bold text-white">{q}</span>
                <span className="block text-[11px] text-white/55">{formatBRL(ticketCost(q))}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={disabled || busy} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white">
          {busy ? <><Spinner /> Gerando…</> : '✨ Gerar palpite'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && <GameResult {...result} />}
      </Card>
      <SimulationPanel games={games} disabled={disabled} />
    </div>
  );
};

export default GeneratorPanel;
