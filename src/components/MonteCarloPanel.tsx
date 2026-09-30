import React, { useState } from 'react';
import LotteryBall from '../LotteryBall';
import { useCrowdContext } from '../hooks/useCrowdContext';
import { buildPlan, type McPlan } from '../utils/mc/plan';
import { formatBRL, formatPct } from '../format';
import { Callout, Card, Meter, Spinner, Stat } from './ui';
import BiasCard from './BiasCard';

const MonteCarloPanel: React.FC<{ accumulated: number }> = ({ accumulated }) => {
  const { ctx, failed } = useCrowdContext(true);
  const [games, setGames] = useState(10);
  const [avoidCrowd, setAvoidCrowd] = useState(true);
  const [useBias, setUseBias] = useState(true);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<McPlan | null>(null);

  const run = () => {
    if (!ctx) return;
    setBusy(true);
    // setTimeout deixa o spinner pintar antes do cálculo (síncrono) começar.
    setTimeout(() => { setPlan(buildPlan({ games, avoidCrowd, accumulated, useBias }, ctx)); setBusy(false); }, 60);
  };

  const gain = plan ? plan.optimized.pAtLeast[11] - plan.baseline.pAtLeast[11] : 0;
  const crowdAvg = plan ? plan.crowdIndexes.reduce((a, b) => a + b, 0) / plan.crowdIndexes.length : 1;

  return (
    <div className="grid gap-6">
      <Card eyebrow="Otimizador" title="Portfólio Monte Carlo">
        <p className="mb-5 text-sm leading-relaxed text-white/60">
          Simula milhares de sorteios para montar jogos <strong className="text-white/85">espalhados</strong> (pouca sobreposição),
          o que eleva a chance de pegar <em>pelo menos um</em> prêmio. Opcionalmente evita formatos que muita gente aposta, para
          dividir 14/15 acertos com menos gente.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="mc-games" className="mb-2 flex justify-between text-sm font-medium text-white/80">
              <span>Número de jogos</span><span className="tabular-nums text-violet-300">{games} · {formatBRL(games * 3.5)}</span>
            </label>
            <input id="mc-games" type="range" min={2} max={40} value={games} onChange={(e) => setGames(+e.target.value)} className="w-full accent-violet-500" />
          </div>
          <div className="grid gap-2">
            <label className="chip flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5" aria-pressed={avoidCrowd}>
              <input type="checkbox" checked={avoidCrowd} onChange={(e) => setAvoidCrowd(e.target.checked)} className="h-4 w-4 accent-violet-500" />
              <span><span className="block text-sm font-semibold text-white">Evitar jogos populares</span>
                <span className="block text-[11px] text-white/55">Poisson nos rateios reais</span></span>
            </label>
            <label className="chip flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5" aria-pressed={useBias}>
              <input type="checkbox" checked={useBias} onChange={(e) => setUseBias(e.target.checked)} className="h-4 w-4 accent-violet-500" />
              <span><span className="block text-sm font-semibold text-white">Usar viés persistente (VPE)</span>
                <span className="block text-[11px] text-white/55">Bayes empírico sobre 3.738 concursos</span></span>
            </label>
          </div>
        </div>
        <button onClick={run} disabled={!ctx || busy} className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white">
          {busy ? <><Spinner /> Simulando 126 mil sorteios…</> : !ctx && !failed ? <><Spinner /> Carregando histórico…</> : '🎲 Otimizar portfólio'}
        </button>
        {failed && <p role="alert" className="mt-3 text-sm text-rose-300">Falha ao carregar o histórico local.</p>}
      </Card>

      {plan && (
        <>
          <Card eyebrow="Resultado" title="Chance de ao menos 1 prêmio (11+ acertos)">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 flex justify-between text-sm"><span className="text-white/70">Portfólio otimizado</span><strong className="text-emerald-300">{formatPct(plan.optimized.pAtLeast[11])}</strong></p>
                <Meter value={plan.optimized.pAtLeast[11]} label="Otimizado" color="from-emerald-400 to-teal-500" />
              </div>
              <div>
                <p className="mb-1 flex justify-between text-sm"><span className="text-white/70">Jogos aleatórios</span><strong className="text-white/80">{formatPct(plan.baseline.pAtLeast[11])}</strong></p>
                <Meter value={plan.baseline.pAtLeast[11]} label="Aleatório" color="from-slate-400 to-slate-500" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Ganho medido" value={`+${(gain * 100).toFixed(1).replace('.', ',')} pp`} tone="gain" sub={`IC95% ±${(plan.optimized.seAny11 * 200).toFixed(2)} pp`} />
              <Stat label="Custo" value={formatBRL(plan.cost)} sub={`${plan.tickets.length} jogos de 15`} />
              <Stat label="Divisão do prêmio" value={crowdAvg < 1 ? `−${Math.round((1 - crowdAvg) * 100)}%` : '≈ igual'} tone={crowdAvg < 1 ? 'gain' : 'default'} sub="co-ganhadores previstos" />
              <Stat label="Retorno esperado" value={`R$ ${plan.rea.perBet.toFixed(2).replace('.', ',')}`} tone={plan.rea.edgePct > 0 ? 'gain' : 'default'} sub={`por aposta de R$ 3,50 · ${plan.rea.edgePct >= 0 ? '+' : ''}${plan.rea.edgePct.toFixed(1).replace('.', ',')}% vs típico`} />
            </div>
            <div className="mt-3"><Callout tone={accumulated > 0 ? 'info' : 'warn'}>
              {accumulated > 0
                ? `O último concurso acumulou (${accumulated}×): o jackpot está maior, então o retorno esperado hoje é mais alto (${plan.rea.roiPct.toFixed(0)}% em vez de cerca de −60%). Ainda negativo.`
                : `Sem acúmulo: retorno esperado ≈ ${plan.rea.roiPct.toFixed(0)}%. Quando o jackpot acumula, ele sobe — mas nunca chega a positivo.`}
            </Callout></div>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
              {[11, 12, 13, 14, 15].map((k) => (
                <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] py-2">
                  <p className="font-bold tabular-nums text-white">{formatPct(plan.optimized.pAtLeast[k], k >= 14 ? 3 : 1)}</p>
                  <p className="text-white/45">≥ {k}</p>
                </div>
              ))}
            </div>
          </Card>
          <BiasCard bias={ctx!.bias} plan={plan} />
          {plan.multiBet16 && (
            <Card eyebrow="Mesmo custo" title="Espalhar 16 jogos × 1 aposta de 16 dezenas">
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="16 jogos otimizados" value={formatPct(plan.optimized.pAtLeast[11])} tone="gain" sub={`≥14: ${formatPct(plan.optimized.pAtLeast[14], 3)}`} />
                <Stat label="Aposta múltipla de 16" value={formatPct(plan.multiBet16.pAtLeast[11])} tone="warn" sub={`≥14: ${formatPct(plan.multiBet16.pAtLeast[14], 3)}`} />
              </div>
              <div className="mt-3"><Callout>Mesmo retorno esperado. Espalhar aumenta a chance de ganhar em todas as faixas; na aposta múltipla os prêmios vêm agrupados: eventos mais raros, porém vários prêmios de uma vez.</Callout></div>
            </Card>
          )}
          <Card eyebrow="Jogos" title={`${plan.tickets.length} apostas otimizadas`}>
            <ol className="grid gap-2.5">
              {plan.tickets.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <span className="w-6 text-xs font-bold text-white/40">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex flex-1 flex-wrap gap-1">{t.map((n) => <LotteryBall key={n} number={n} size="sm" tone={n <= 13 ? 'brand' : 'cold'} />)}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${plan.crowdIndexes[i] < 1 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
                    multidão {plan.crowdIndexes[i].toFixed(2)}×
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-4"><Callout tone="warn">
              Honestidade matemática: o retorno esperado por real apostado continua negativo (≈ −57% a −65%). O otimizador
              aumenta a <strong>frequência</strong> de prêmios pequenos e a fatia dos grandes — não prevê o sorteio.
            </Callout></div>
          </Card>
        </>
      )}
    </div>
  );
};

export default MonteCarloPanel;
