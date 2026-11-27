import React, { useState } from 'react';
import { Button } from '@juninmd/sonido';
import { ALGORITHMS, GROUPS, findAlgorithm, type AlgorithmId } from '../algorithms';
import type { LotofacilResult } from '../game';
import { backtestGame, calculateConfidence, calculateProjectedStats, type BacktestResult, type ProjectedStats } from '../utils/statistics';
import { ticketCost } from '../utils/probability';
import { formatBRL } from '../format';
import { Card } from './ui';
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
                <Button key={a.id} type="button" aria-pressed={algo === a.id} onClick={() => setAlgo(a.id)} size="sm" variant={algo === a.id ? 'primary' : 'ghost'} appearance={algo === a.id ? 'solid' : 'outline'} className="lc-algo">
                  <strong>{a.label}</strong>
                  <span>{a.hint}</span>
                </Button>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="mt-5 border-t border-white/10 pt-4">
          <p id="qty" className="mb-2 text-sm font-medium text-white/80">Dezenas na aposta</p>
          <div role="group" aria-labelledby="qty" className="flex flex-wrap gap-2">
            {SIZES.map((q) => (
              <Button key={q} type="button" aria-pressed={quantity === q} onClick={() => setQuantity(q)} aria-label={`${q} dezenas, ${formatBRL(ticketCost(q))}`} size="sm" variant={quantity === q ? 'primary' : 'ghost'} appearance={quantity === q ? 'solid' : 'outline'} className="lc-chip min-w-[5.5rem]">
                <strong className="text-base font-bold">{q}</strong>
                <span>{formatBRL(ticketCost(q))}</span>
              </Button>
            ))}
          </div>
        </div>
        <Button type="button" onClick={generate} loading={busy} disabled={disabled} size="lg" className="mt-5 w-full">
          {busy ? 'Gerando…' : '✨ Gerar palpite'}
        </Button>
        {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        {result && <GameResult {...result} />}
      </Card>
      <SimulationPanel games={games} disabled={disabled} />
    </div>
  );
};

export default GeneratorPanel;
