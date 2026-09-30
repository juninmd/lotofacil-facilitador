import React from 'react';
import LotteryBall from '../LotteryBall';
import { Callout, Card, Stat } from './ui';
import { formatPct } from '../format';
import type { McPlan } from '../utils/mc/plan';
import type { BiasModel } from '../utils/bias/biasModel';

// Mapa 5x5 do viés estimado por dezena (p̂ − 60%), em pontos percentuais.
const BiasGrid: React.FC<{ probs: number[] }> = ({ probs }) => {
  const max = Math.max(...probs.map((p) => Math.abs(p - 0.6)), 1e-6);
  return (
    <div className="grid grid-cols-5 gap-1.5" role="img" aria-label="Viés estimado por dezena">
      {probs.map((p, i) => {
        const d = p - 0.6; const t = Math.abs(d) / max;
        const bg = d >= 0 ? `rgb(52 211 153 / ${0.12 + t * 0.55})` : `rgb(251 113 133 / ${0.12 + t * 0.55})`;
        return (
          <div key={i} title={`Dezena ${i + 1}: ${(p * 100).toFixed(1)}%`} className="flex aspect-square flex-col items-center justify-center rounded-lg border border-white/10 text-white" style={{ background: bg }}>
            <span className="text-sm font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[10px] tabular-nums text-white/75">{d >= 0 ? '+' : ''}{(d * 100).toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
};

const BiasCard: React.FC<{ bias: BiasModel; plan: McPlan }> = ({ bias, plan }) => (
  <Card eyebrow="Fórmula VPE" title="Viés persistente das dezenas">
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <BiasGrid probs={bias.probs} />
        <p className="mt-2 text-[11px] text-white/45">Desvio de cada dezena em relação a 60% (pontos percentuais), já encolhido.</p>
      </div>
      <div className="grid content-start gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Viés real estimado" value={`±${plan.vpe.sigmaPP.toFixed(2).replace('.', ',')} pp`} sub="desvio-padrão entre dezenas" />
          <Stat label="Acertos/jogo (modelo)" value={plan.vpe.hitsPerTicket.toFixed(3).replace('.', ',')} tone={plan.vpe.hitsPerTicket > 9 ? 'gain' : 'default'} sub="uniforme = 9,000" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/50">Melhor jogo único (VPE)</p>
          <div className="flex flex-wrap gap-1">{plan.vpe.single.map((n) => <LotteryBall key={n} number={n} size="sm" tone="hit" />)}</div>
          <p className="mt-2 text-xs text-white/60">P(≥11): <strong className="text-emerald-300">{formatPct(plan.vpe.pSingleModel, 2)}</strong> no modelo vs {formatPct(plan.vpe.pSingleUniform, 2)} uniforme</p>
        </div>
      </div>
    </div>
    <div className="mt-4"><Callout>
      A perícia (docs/FORENSE.md) mostrou que as dezenas <strong>não são perfeitamente uniformes</strong>: o viés persiste entre metades do
      histórico (p&lt;0,01) e rende ganho preditivo fora da amostra. É pequeno (~1 pp): vale cerca de +0,05 a +0,08 acertos por jogo.
    </Callout></div>
  </Card>
);

export default BiasCard;
