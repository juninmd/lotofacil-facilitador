import React from 'react';

export type BallTone = 'brand' | 'hot' | 'cold' | 'hit' | 'ghost';
export type BallSize = 'sm' | 'md' | 'lg';

interface LotteryBallProps {
  number: number | string;
  tone?: BallTone;
  size?: BallSize;
  /** Atraso na animação de entrada (ms) — cria efeito cascata. */
  delay?: number;
}

const TONES: Record<BallTone, string> = {
  brand: 'from-violet-400 via-violet-600 to-fuchsia-700 text-white shadow-violet-900/60',
  hot: 'from-amber-300 via-orange-500 to-red-600 text-white shadow-orange-900/50',
  cold: 'from-sky-300 via-sky-500 to-indigo-700 text-white shadow-sky-900/50',
  hit: 'from-emerald-300 via-emerald-500 to-teal-700 text-white shadow-emerald-900/50',
  ghost: 'from-white/10 to-white/5 text-white/40 shadow-none',
};
const SIZES: Record<BallSize, string> = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-base', lg: 'w-14 h-14 text-xl' };

/** Bola de loteria com relevo: gradiente, brilho especular e sombra. */
const LotteryBall: React.FC<LotteryBallProps> = ({ number, tone = 'brand', size = 'md', delay = 0 }) => (
  <div
    role="img"
    aria-label={`Dezena ${number}`}
    style={{ animationDelay: `${delay}ms` }}
    className={`${SIZES[size]} pop relative inline-flex select-none items-center justify-center rounded-full bg-gradient-to-br font-bold tabular-nums shadow-lg ring-1 ring-white/20 ${TONES[tone]}`}
  >
    <span aria-hidden className="pointer-events-none absolute inset-x-[18%] top-[8%] h-[38%] rounded-full bg-white/40 blur-[1.5px]" />
    <span className="relative drop-shadow">{String(number).padStart(2, '0')}</span>
  </div>
);

export default LotteryBall;
