import React from 'react';
import LotteryBall from '../LotteryBall';
import { Callout, Card } from './ui';
import type { LotofacilResult } from '../game';

interface Props {
  latest: LotofacilResult | null;
  frequency: { number: number; count: number }[];
  delays: { number: number; count: number }[];
  missingInCycle: number[];
  total: number;
}

// Volante 5x5 colorido pela frequência: leitura imediata de quentes e frios.
const HeatGrid: React.FC<{ frequency: Props['frequency']; total: number }> = ({ frequency, total }) => {
  const byNum = new Map(frequency.map((f) => [f.number, f.count]));
  const max = Math.max(1, ...frequency.map((f) => f.count));
  const min = Math.min(...frequency.map((f) => f.count));
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
        const c = byNum.get(n) ?? 0;
        const t = max === min ? 0.5 : (c - min) / (max - min);
        return (
          <div key={n} title={`${n}: ${c} de ${total}`} className="relative flex aspect-square flex-col items-center justify-center rounded-xl border border-white/10 text-white" style={{ background: `linear-gradient(135deg, rgb(56 189 248 / ${0.55 - t * 0.4}), rgb(244 114 182 / ${0.15 + t * 0.6}))` }}>
            <span className="text-lg font-bold tabular-nums">{String(n).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/70">{((c / Math.max(1, total)) * 100).toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
};

const Ranking: React.FC<{ items: { number: number; count: number }[]; unit: string; tone: 'hot' | 'cold'; bar: string }> = ({ items, unit, tone, bar }) => {
  const max = Math.max(1, items[0]?.count ?? 1);
  return (
    <ul className="grid gap-2">
      {items.map((it) => (
        <li key={it.number} className="relative flex items-center justify-between overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pr-3">
          <div aria-hidden className={`absolute inset-y-0 left-0 ${bar}`} style={{ width: `${(it.count / max) * 100}%` }} />
          <LotteryBall number={it.number} size="sm" tone={tone} />
          <span className="relative text-sm tabular-nums text-white/80"><strong className="text-white">{it.count}</strong> {unit}</span>
        </li>
      ))}
    </ul>
  );
};

const StatsPanel: React.FC<Props> = ({ latest, frequency, delays, missingInCycle, total }) => (
  <div className="grid gap-6 lg:grid-cols-2">
    <Card eyebrow="Volante" title={`Frequência nos últimos ${total} concursos`} className="lg:row-span-2">
      <HeatGrid frequency={frequency} total={total} />
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/50"><span>◀ menos frequente</span><span>mais frequente ▶</span></div>
      <div className="mt-4"><Callout>Cada dezena tem 60% de chance por concurso. Variações de poucos pontos percentuais são o esperado do acaso.</Callout></div>
    </Card>
    <Card eyebrow="Ciclo" title="Dezenas que faltam no ciclo">
      {missingInCycle.length ? (
        <div className="flex flex-wrap gap-2">{missingInCycle.map((n) => <LotteryBall key={n} number={n} tone="hot" size="sm" />)}</div>
      ) : (
        <p className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">Ciclo fechado — todas as dezenas saíram. Um novo ciclo começa.</p>
      )}
      {latest && <p className="mt-3 text-xs text-white/45">Base: concurso {latest.numero} e anteriores.</p>}
    </Card>
    <Card eyebrow="Atrasos" title="Mais atrasadas"><Ranking items={delays.slice(0, 6)} unit="jogos" tone="cold" bar="bg-sky-400/20" /></Card>
    <Card eyebrow="Quentes" title="Mais sorteadas" className="lg:col-span-2"><Ranking items={frequency.slice(0, 6)} unit="vezes" tone="hot" bar="bg-orange-400/20" /></Card>
  </div>
);

export default StatsPanel;
