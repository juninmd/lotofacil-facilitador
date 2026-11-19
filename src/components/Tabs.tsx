import React from 'react';

export const TABS = [
  { id: 'generator', label: 'Gerador', icon: '✨' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: '🎲' },
  { id: 'stats', label: 'Estatísticas', icon: '📊' },
  { id: 'odds', label: 'Chances', icon: '🧮' },
  { id: 'search', label: 'Concursos', icon: '🔎' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export const tabDomId = (id: TabId) => `tab-${id}`;
export const panelDomId = (id: TabId) => `panel-${id}`;

/** Padrão WAI-ARIA de abas: setas circulam, Home/End vão às pontas; outras teclas não mudam a aba. */
export function nextTabId(active: TabId, key: string): TabId | null {
  const i = TABS.findIndex((t) => t.id === active);
  if (i < 0) return null;
  const n = TABS.length;
  if (key === 'ArrowRight') return TABS[(i + 1) % n].id;
  if (key === 'ArrowLeft') return TABS[(i - 1 + n) % n].id;
  if (key === 'Home') return TABS[0].id;
  if (key === 'End') return TABS[n - 1].id;
  return null;
}

const Tabs: React.FC<{ active: TabId; onChange: (t: TabId) => void }> = ({ active, onChange }) => {
  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const next = nextTabId(active, e.key);
    if (!next) return;
    e.preventDefault();
    onChange(next);
    document.getElementById(tabDomId(next))?.focus();
  };
  return (
  <div role="tablist" aria-label="Seções" onKeyDown={onKeyDown} className="card mx-auto mb-6 flex w-full max-w-3xl gap-1 overflow-x-auto p-1.5">
    {TABS.map((t) => (
      <button
        key={t.id}
        id={tabDomId(t.id)}
        role="tab"
        aria-selected={active === t.id}
        aria-controls={panelDomId(t.id)}
        tabIndex={active === t.id ? 0 : -1}
        onClick={() => onChange(t.id)}
        className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-violet-400 ${active === t.id ? 'btn-primary text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
      >
        <span aria-hidden>{t.icon}</span>{t.label}
      </button>
    ))}
  </div>
  );
};

export default Tabs;
