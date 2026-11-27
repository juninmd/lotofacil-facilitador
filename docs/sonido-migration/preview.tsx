import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@juninmd/sonido/styles.css';
import '../../src/sonido-bridge.css';
import '../../src/index.css';
import { Badge, Button, DataTable, EmptyState, Skeleton, Switch, type Column } from '@juninmd/sonido';
import { Card as NewCard, Meter as NewMeter, Stat as NewStat } from '../../src/components/ui';
import NewTabs, { type TabId } from '../../src/components/Tabs';
import NewHeader from '../../src/components/Header';
import NewSearchForm from '../../src/GameSearchForm';
import LegacyHeader from './legacy/Header';
import LegacyTabs from './legacy/Tabs';
import LegacySearchForm from './legacy/GameSearchForm';
import { Card as LegacyCard, Meter as LegacyMeter, Stat as LegacyStat } from './legacy/ui';
import type { LotofacilResult } from '../../src/game';

// Dados fictícios: nenhum concurso real aparece nos prints.
const DRAW: LotofacilResult = {
  numero: 9999,
  dataApuracao: '01/01/2099',
  listaDezenas: [1, 2, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 22, 24, 25],
  listaRateioPremio: [],
};

interface OddsRow { dezenas: number; custo: string; pct: string; umEm: string }
const ROWS: OddsRow[] = [
  { dezenas: 15, custo: 'R$ 3,50', pct: '2,4%', umEm: '42' },
  { dezenas: 16, custo: 'R$ 56,00', pct: '13,1%', umEm: '8' },
  { dezenas: 17, custo: 'R$ 476,00', pct: '38,7%', umEm: '3' },
];
const COLUMNS: Column<OddsRow>[] = [
  { key: 'dezenas', label: 'Dezenas', render: (r) => <strong>{r.dezenas}</strong> },
  { key: 'custo', label: 'Custo', render: (r) => r.custo },
  { key: 'pct', label: 'Ganhar algo', render: (r) => <span className="text-emerald-300">{r.pct}</span> },
  { key: 'umEm', label: 'Cravar 15', render: (r) => <span className="text-amber-300">1 em {r.umEm}</span> },
];

const TabsDemo: React.FC<{ kind: 'legacy' | 'new' }> = ({ kind }) => {
  const [tab, setTab] = useState<TabId>('generator');
  return kind === 'legacy' ? <LegacyTabs active={tab} onChange={setTab} /> : <NewTabs active={tab} onChange={setTab} />;
};

const Section: React.FC<{ title: string; before: React.ReactNode; after: React.ReactNode }> = ({ title, before, after }) => (
  <section className="mt-8">
    <h2 className="mb-3 text-lg font-bold text-white">{title}</h2>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Antes · componente do lotofacil</p>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">{before}</div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-300">Depois · @juninmd/sonido</p>
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-3">{after}</div>
      </div>
    </div>
  </section>
);

const statCards = (Stat: React.FC<{ label: string; value: React.ReactNode; tone?: 'default' | 'gain' | 'loss' | 'warn' }>) => (
  <div className="grid gap-2 sm:grid-cols-3">
    <Stat label="Ganho medido" value="+2,1 pp" tone="gain" />
    <Stat label="Custo" value="R$ 35,00" />
    <Stat label="Cravar 15" value="1 em 3.268.760" tone="warn" />
  </div>
);

const App = () => {
  const focus = new URLSearchParams(window.location.search).get('focus');
  return (
    <div className="mx-auto max-w-[1120px] px-6 py-10 pb-16">
      <p className="eyebrow">docs/sonido-migration</p>
      <h1 className="text-gradient mt-1 text-3xl font-black tracking-tight">Lotofácil × Sonido 2.4.0</h1>
      <p className="mt-2 text-sm text-white/55">Mesmos dados fictícios, mesma casca do app (CSS real), primitivas trocadas uma a uma.</p>

      <Section title="Header e Badge (contador de concurso)" before={<LegacyHeader latest={DRAW} />} after={<NewHeader latest={DRAW} />} />

      <Section title="Tabs" before={<TabsDemo kind="legacy" />} after={<TabsDemo kind="new" />} />

      {focus !== 'chrome' && (
        <>
          <Section
            title="Card, Stat e Meter"
            before={<LegacyCard eyebrow="Simulação" title="Chance de ao menos 1 prêmio">{statCards(LegacyStat)}<div className="mt-3"><LegacyMeter value={0.624} label="Otimizado" color="from-emerald-400 to-teal-500" /></div></LegacyCard>}
            after={<NewCard eyebrow="Simulação" title="Chance de ao menos 1 prêmio">{statCards(NewStat)}<div className="mt-3"><NewMeter value={0.624} label="Otimizado" color="from-emerald-400 to-teal-500" /></div></NewCard>}
          />

          <Section
            title="Tabela (DataTable)"
            before={<table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-white/45">
                <th className="pb-2">Dezenas</th><th className="pb-2">Custo</th><th className="pb-2">Ganhar algo</th><th className="pb-2">Cravar 15</th>
              </tr></thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.dezenas} className="border-t border-white/10 tabular-nums">
                    <td className="py-2 font-bold text-white">{r.dezenas}</td>
                    <td className="py-2 text-white/75">{r.custo}</td>
                    <td className="py-2 text-emerald-300">{r.pct}</td>
                    <td className="py-2 text-amber-300">1 em {r.umEm}</td>
                  </tr>
                ))}
              </tbody>
            </table>}
            after={<DataTable label="Chance por tamanho de aposta" columns={COLUMNS} rows={ROWS} rowKey={(r) => String(r.dezenas)} />}
          />
        </>
      )}

      <Section
        title="Buttons: denso (outline/xs), primário e loading"
        before={<div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary rounded-xl px-4 py-2 font-bold text-white">✨ Gerar palpite</button>
          <button className="chip rounded-xl px-3 py-2 text-sm">15 dezenas</button>
          <button className="btn-ghost rounded-xl px-3 py-2 text-sm">Copiar</button>
        </div>}
        after={<div className="flex flex-wrap items-center gap-2">
          <Button>✨ Gerar palpite</Button>
          <Button size="xs" appearance="outline" variant="ghost">15 dezenas</Button>
          <Button size="sm" variant="ghost">Copiar</Button>
          <Button size="sm" loading>Gerando…</Button>
        </div>}
      />

      {focus !== 'chrome' && (
        <>
          <Section
            title="Switch e busca (TextField + Button)"
            before={<div className="grid gap-2">
              <label className="chip flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5" aria-pressed>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-violet-500" readOnly />
                <span className="text-sm font-semibold text-white">Evitar jogos populares</span>
              </label>
              <LegacySearchForm onSearch={() => undefined} searching={false} />
            </div>}
            after={<div className="grid gap-3">
              <Switch checked onChange={() => undefined} label="Evitar jogos populares" description="Poisson nos rateios reais" />
              <NewSearchForm onSearch={() => undefined} searching={false} />
            </div>}
          />

          <Section
            title="EmptyState, Skeleton e Badge count"
            before={<>
              <p className="text-sm text-white/55">Rode a simulação para comparar a média de acertos de cada método.</p>
              <p className="mt-3 text-xs text-white/50">Concurso <strong className="text-white/90">9999</strong> · 01/01/2099</p>
            </>}
            after={<>
              <EmptyState icon={<span aria-hidden>📈</span>} title="Nenhuma simulação ainda" description="Rode a simulação para comparar os métodos." />
              <Skeleton rows={2} label="Carregando números fictícios." />
              <p className="mt-3 flex items-center gap-2 text-xs text-white/50">Concurso <Badge appearance="count" tone="accent">{DRAW.numero}</Badge> · {DRAW.dataApuracao}</p>
            </>}
          />
        </>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
