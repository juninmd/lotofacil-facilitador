import React from 'react';
import { Tabs as SonidoTabs } from '@juninmd/sonido';

export const TABS = [
  { id: 'generator', label: 'Gerador', icon: '✨' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: '🎲' },
  { id: 'stats', label: 'Estatísticas', icon: '📊' },
  { id: 'odds', label: 'Chances', icon: '🧮' },
  { id: 'search', label: 'Concursos', icon: '🔎' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export const tabDomId = (id: TabId) => `tab-${id}`;
/** O Sonido liga cada aba ao painel com `${idPrefix}-panel-${key}`. */
export const panelDomId = (id: TabId) => `tab-panel-${id}`;

/** Contrato WAI-ARIA da navegação (setas circulam, Home/End vão às pontas). */
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

/** As setas/Home/End são tratadas pelo `Tabs` do Sonido, que mantém o foco itinerante. */
const Tabs: React.FC<{ active: TabId; onChange: (t: TabId) => void }> = ({ active, onChange }) => (
  <SonidoTabs
    items={TABS.map((t) => ({ key: t.id, label: t.label, icon: t.icon }))}
    value={active}
    onChange={onChange}
    label="Seções"
    variant="pill"
    idPrefix="tab"
    hasPanels
    className="lc-tabs mx-auto mb-6 max-w-3xl"
  />
);

export default Tabs;
