import React from 'react';

export const TABS = [
  { id: 'generator', label: 'Gerador', icon: '✨' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: '🎲' },
  { id: 'stats', label: 'Estatísticas', icon: '📊' },
  { id: 'odds', label: 'Chances', icon: '🧮' },
  { id: 'search', label: 'Concursos', icon: '🔎' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

const Tabs: React.FC<{ active: TabId; onChange: (t: TabId) => void }> = ({ active, onChange }) => (
  <nav role="tablist" aria-label="Seções" className="card mx-auto mb-6 flex w-full max-w-3xl gap-1 overflow-x-auto p-1.5">
    {TABS.map((t) => (
      <button
        key={t.id}
        role="tab"
        aria-selected={active === t.id}
        onClick={() => onChange(t.id)}
        className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-400 ${active === t.id ? 'btn-primary text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
      >
        <span aria-hidden>{t.icon}</span>{t.label}
      </button>
    ))}
  </nav>
);

export default Tabs;
