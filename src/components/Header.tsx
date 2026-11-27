import React from 'react';
import { Badge } from '@juninmd/sonido';
import LotteryBall from '../LotteryBall';
import type { LotofacilResult } from '../game';

const Header: React.FC<{ latest: LotofacilResult | null }> = ({ latest }) => (
  <header className="animate-rise mb-8 text-center">
    <Badge tone="violet" dot live className="uppercase tracking-[0.16em]">Monte Carlo · Probabilidade exata</Badge>
    <h1 className="text-gradient mt-4 text-4xl font-black tracking-tight sm:text-6xl">Lotofácil Facilitador</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-white/60 sm:text-base">
      Portfólios otimizados por simulação, jogos menos disputados e matemática transparente —
      sem prometer o que nenhum método consegue entregar.
    </p>
    {latest && (
      <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3">
        <p className="flex items-center justify-center gap-2 text-xs text-white/50">
          Concurso <Badge appearance="count" tone="accent">{latest.numero}</Badge> · {latest.dataApuracao}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {latest.listaDezenas.map((n, i) => <LotteryBall key={n} number={n} size="sm" delay={i * 30} />)}
        </div>
      </div>
    )}
  </header>
);

export default Header;
