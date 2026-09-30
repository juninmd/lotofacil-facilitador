import React, { useState } from 'react';
import { prizeOddsTable } from '../utils/prizeOdds';
import { compareBudgetPlans } from '../utils/budgetSimulator';
import { formatBRL, formatInt, formatPct } from '../format';
import { Callout, Card } from './ui';

const OddsPanel: React.FC = () => {
  const [budget, setBudget] = useState(200);
  const odds = prizeOddsTable();
  const plans = compareBudgetPlans(budget);
  return (
    <div className="grid gap-6">
      <Card eyebrow="Probabilidade exata" title="Chance por tamanho de aposta">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
              <th className="pb-2 font-semibold">Dezenas</th><th className="pb-2 font-semibold">Custo</th><th className="pb-2 font-semibold">Ganhar algo</th><th className="pb-2 font-semibold">Cravar 15</th></tr></thead>
            <tbody>
              {odds.map((o) => (
                <tr key={o.dezenas} className="border-t border-white/10 tabular-nums">
                  <td className="py-2.5 font-bold text-white">{o.dezenas}</td>
                  <td className="py-2.5 text-white/75">{formatBRL(o.custo)}</td>
                  <td className="py-2.5 text-emerald-300">{formatPct(o.pGanharAlgo)} <span className="text-white/40">· 1 em {formatInt(o.umEmQuantos)}</span></td>
                  <td className="py-2.5 text-amber-300">1 em {formatInt(o.umEm15)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <div className="mt-4"><Callout tone="warn">O retorno esperado é ~−57% em qualquer tamanho de aposta. Jogue como entretenimento, nunca como investimento.</Callout></div>
      </Card>
    </div>
  );
};

export default OddsPanel;
