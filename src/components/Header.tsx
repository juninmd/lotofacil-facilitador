import React from 'react';
import LotteryBall from '../LotteryBall';
import type { LotofacilResult } from '../game';

const Header: React.FC<{ latest: LotofacilResult | null }> = ({ latest }) => (
  <header className="animate-rise mb-8 text-center">
    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Monte Carlo · Probabilidade exata
    </span>
    <h1 className="text-gradient mt-4 text-4xl font-black tracking-tight sm:text-6xl">Lotofácil Facilitador</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
      Portfólios otimizados por simulação, jogos menos disputados e matemática transparente —
      sem prometer o que nenhum método consegue entregar.
    </p>
    {latest && (
      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3">
        <p className="text-xs text-white/50">
          Concurso <strong className="text-white/90">{latest.numero}</strong> · {latest.dataApuracao}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {latest.listaDezenas.map((n, i) => <LotteryBall key={n} number={n} size="sm" delay={i * 30} />)}
        </div>
      </div>
    )}
  </header>
);

export default Header;
