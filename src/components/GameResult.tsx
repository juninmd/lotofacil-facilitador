import React, { useState } from 'react';
import LotteryBall from '../LotteryBall';
import { Callout, Meter, Stat } from './ui';
import { formatBRL } from '../format';
import type { BacktestResult, ProjectedStats } from '../utils/statistics';

interface Props { game: number[]; confidence: number; projected: ProjectedStats | null; backtest: BacktestResult | null }

const copy = async (text: string, flag: (v: boolean) => void) => {
  try { await navigator.clipboard.writeText(text); flag(true); setTimeout(() => flag(false), 1800); } catch { /* sem permissão de clipboard */ }
};

// Script de console que marca as dezenas no volante do site da Caixa.
const clickerScript = (g: number[]) =>
  `(function(){[${g.join(',')}].forEach(n=>{const el=document.getElementById('n'+String(n).padStart(2,'0'));if(el)el.click();});})();`;

const GameResult: React.FC<Props> = ({ game, confidence, projected, backtest }) => {
  const [copied, setCopied] = useState(false);
  const [jsCopied, setJsCopied] = useState(false);
  return (
    <div className="animate-rise mt-6 rounded-2xl border border-violet-400/25 bg-violet-500/[0.07] p-4 sm:p-5" role="region" aria-label="Palpite gerado">
      <div className="flex flex-wrap justify-center gap-2">
        {game.map((n, i) => <LotteryBall key={n} number={n} size="lg" delay={i * 45} />)}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">Aderência ao histórico</p>
          <p className="mt-1 text-2xl font-bold text-white">{confidence}%</p>
          <Meter value={confidence / 100} label="Aderência ao histórico" />
        </div>
        {projected && <Stat label="Acertos esperados" value={projected.averageHits.toFixed(2)} sub="média histórica do jogo" />}
        {projected && <Stat label="Prêmio médio" value={formatBRL(projected.estimatedPrize)} tone="warn" sub="por concurso (histórico)" />}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => copy(game.join(' '), setCopied)}>{copied ? '✓ Copiado' : 'Copiar dezenas'}</button>
        <button className="btn-ghost rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => copy(clickerScript(game), setJsCopied)}>{jsCopied ? '✓ Script copiado' : 'Copiar script do volante'}</button>
      </div>
      {backtest && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="mb-3 text-sm font-bold text-white/90">Backtest · últimos {backtest.totalGames} concursos</h3>
          <div className="grid grid-cols-5 gap-2 text-center">
            {([11, 12, 13, 14, 15] as const).map((k) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] py-2">
                <p className="text-lg font-bold tabular-nums text-white">{backtest[k]}</p>
                <p className="text-[11px] text-white/50">{k} pts</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Stat label="Custo" value={formatBRL(backtest.totalCost)} tone="loss" />
            <Stat label="Prêmios" value={formatBRL(backtest.totalPrize)} tone="gain" />
            <Stat label="Saldo" value={formatBRL(backtest.netProfit)} tone={backtest.netProfit >= 0 ? 'gain' : 'loss'} />
          </div>
          <div className="mt-3"><Callout tone="warn">Backtest descreve o passado. O sorteio é uniforme e independente: nenhum gerador altera a chance de acertar.</Callout></div>
        </div>
      )}
    </div>
  );
};

export default GameResult;
