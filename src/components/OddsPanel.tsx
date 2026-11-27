import React, { useState } from 'react';
import { DataTable, type Column } from '@juninmd/sonido';
import { prizeOddsTable, type PrizeOdds } from '../utils/prizeOdds';
import { compareBudgetPlans } from '../utils/budgetSimulator';
import { formatBRL, formatInt, formatPct } from '../format';
import { Callout, Card } from './ui';

const oddsColumns: Column<PrizeOdds>[] = [
  { key: 'dezenas', label: 'Dezenas', render: (o) => <strong className="text-white">{o.dezenas}</strong> },
  { key: 'custo', label: 'Custo', render: (o) => <span className="text-white/75">{formatBRL(o.custo)}</span> },
  {
    key: 'pGanharAlgo',
    label: 'Ganhar algo',
    render: (o) => (
      <span className="text-emerald-300">
        {formatPct(o.pGanharAlgo)} <span className="text-white/40">· 1 em {formatInt(o.umEmQuantos)}</span>
      </span>
    ),
  },
  { key: 'umEm15', label: 'Cravar 15', render: (o) => <span className="text-amber-300">1 em {formatInt(o.umEm15)}</span> },
];

const OddsPanel: React.FC = () => {
  const [budget, setBudget] = useState(200);
  const odds = prizeOddsTable();
  const plans = compareBudgetPlans(budget);
  return (
    <div className="grid gap-6">
      <Card eyebrow="Probabilidade exata" title="Chance por tamanho de aposta">
        <DataTable label="Chance por tamanho de aposta" columns={oddsColumns} rows={odds} rowKey={(o) => String(o.dezenas)} />
      </Card>
      <Card eyebrow="Orçamento" title="Quanto você quer gastar?">
        <label htmlFor="budget" className="mb-2 flex justify-between text-sm font-medium text-white/80"><span>Orçamento</span><span className="tabular-nums text-violet-300">{formatBRL(budget)}</span></label>
        <input id="budget" type="range" min={10} max={2000} step={10} value={budget} onChange={(e) => setBudget(+e.target.value)} className="mb-5 w-full accent-violet-500" />
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.dezenas} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-white">{p.apostasNoMes}× aposta de {p.dezenas}</p>
              <p className="mt-1 text-2xl font-black text-emerald-300 tabular-nums">{formatPct(p.pGanharAlgoNoMes)}</p>
              <p className="text-[11px] text-white/50">chance de ganhar algum prêmio</p>
              <p className="mt-2 text-xs text-rose-300">Perda esperada: {formatBRL(p.perdaEsperadaMes)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4"><Callout tone="warn">O retorno esperado é ~-57% em qualquer tamanho de aposta. Jogue como entretenimento, nunca como investimento.</Callout></div>
      </Card>
    </div>
  );
};

export default OddsPanel;
