import { useState } from 'react';
import Header from './components/Header';
import Tabs, { type TabId } from './components/Tabs';
import GeneratorPanel from './components/GeneratorPanel';
import MonteCarloPanel from './components/MonteCarloPanel';
import StatsPanel from './components/StatsPanel';
import OddsPanel from './components/OddsPanel';
import SearchPanel from './components/SearchPanel';
import { Spinner } from './components/ui';
import { useLotofacilData } from './hooks/useLotofacilData';

function App() {
  const [tab, setTab] = useState<TabId>('generator');
  const data = useLotofacilData();

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Header latest={data.latest} />
      <Tabs active={tab} onChange={setTab} />
      {data.loading && <p role="status" className="mb-4 flex items-center justify-center gap-2 text-sm text-violet-300"><Spinner /> Carregando dados da Lotofácil…</p>}
      {data.error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-center text-sm text-rose-200">{data.error}</p>}
      <main>
        {tab === 'generator' && <GeneratorPanel games={data.games} disabled={data.loading || data.games.length === 0} />}
        {tab === 'montecarlo' && <MonteCarloPanel />}
        {tab === 'stats' && <StatsPanel latest={data.latest} frequency={data.frequency} delays={data.delays} missingInCycle={data.missingInCycle} total={data.games.length} />}
        {tab === 'odds' && <OddsPanel />}
        {tab === 'search' && <SearchPanel />}
      </main>
      <footer className="mt-10 text-center text-xs text-white/40">
        Aposta é entretenimento, não investimento. O sorteio é uniforme e independente — jogue com responsabilidade. +18.
      </footer>
    </div>
  );
}

export default App;
