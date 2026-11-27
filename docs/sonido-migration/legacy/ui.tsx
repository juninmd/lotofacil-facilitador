import React from 'react';

export const Card: React.FC<{ title?: string; eyebrow?: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }> = ({ title, eyebrow, children, className = '', aside }) => (
  <section className={`card animate-rise p-5 sm:p-6 ${className}`}>
    {(title || eyebrow) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
          {title && <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>}
        </div>
        {aside}
      </header>
    )}
    {children}
  </section>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'gain' | 'loss' | 'warn'; sub?: string }> = ({ label, value, tone = 'default', sub }) => {
  const color = { default: 'text-white', gain: 'text-emerald-300', loss: 'text-rose-300', warn: 'text-amber-300' }[tone];
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/45">{sub}</p>}
    </div>
  );
};

/** Barra de progresso acessível (0..1). */
export const Meter: React.FC<{ value: number; label: string; color?: string }> = ({ value, label, color = 'from-violet-500 to-fuchsia-500' }) => (
  <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} className="h-2 overflow-hidden rounded-full bg-white/10">
    <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-[width] duration-700`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
  </div>
);

export const Spinner: React.FC = () => (
  <svg aria-hidden className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
    <path fill="currentColor" className="opacity-80" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
  </svg>
);

export const Callout: React.FC<{ tone?: 'info' | 'warn'; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <p className={`rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed ${tone === 'warn' ? 'border-amber-400/30 bg-amber-400/10 text-amber-100/90' : 'border-violet-400/25 bg-violet-400/10 text-violet-100/90'}`}>{children}</p>
);
