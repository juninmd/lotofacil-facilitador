import React from 'react';
import {
  Card as SonidoCard,
  CardHeader,
  CardTitle,
  ProgressBar,
  Spinner as SonidoSpinner,
  StatTile,
} from '@juninmd/sonido';

/** Card do app sobre o `Card` do Sonido: mesma casca (eyebrow/título/aside), superfície de vidro. */
export const Card: React.FC<{ title?: string; eyebrow?: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }> = ({ title, eyebrow, children, className = '', aside }) => (
  <SonidoCard surface="glass" padding="md" className={`animate-rise ${className}`}>
    {(title || eyebrow) && (
      <CardHeader className="mb-4">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          {title && <CardTitle>{title}</CardTitle>}
        </div>
        {aside}
      </CardHeader>
    )}
    {children}
  </SonidoCard>
);

/** `StatTile` do Sonido: valor pode ser texto formatado (R$, %, etc.). */
export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'gain' | 'loss' | 'warn'; sub?: string }> = ({ label, value, tone = 'default', sub }) => {
  const sonidoTone = {
    default: 'neutral',
    gain: 'success',
    loss: 'danger',
    warn: 'warning',
  } as const;
  return <StatTile label={label} value={value} hint={sub} tone={sonidoTone[tone]} className="lc-stat" />;
};

/** Barra de progresso acessível (0..1) — `ProgressBar` do Sonido com o tom do app. */
export const Meter: React.FC<{ value: number; label: string; color?: string }> = ({ value, label, color = 'from-violet-500 to-fuchsia-500' }) => {
  const tone = color.includes('emerald') ? 'gain' : color.includes('slate') ? 'neutral' : 'accent';
  return <ProgressBar value={value} label={label} size="sm" tone="accent" className={`lc-meter lc-meter--${tone}`} />;
};

export const Spinner: React.FC<{ size?: number }> = ({ size = 16 }) => <SonidoSpinner size={size} />;

export const Callout: React.FC<{ tone?: 'info' | 'warn'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <p className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${tone === 'warn' ? 'border-amber-400/30 bg-amber-400/10 text-amber-100/90' : 'border-violet-400/25 bg-violet-400/10 text-violet-100/90'}`}>{children}</p>
);
