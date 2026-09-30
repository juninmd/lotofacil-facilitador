import React, { useState } from 'react';
import GameSearchForm from '../GameSearchForm';
import LotteryBall from '../LotteryBall';
import { getGame, type LotofacilResult } from '../game';
import { Card } from './ui';

const SearchPanel: React.FC = () => {
  const [result, setResult] = useState<LotofacilResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async (input: string) => {
    setError(null); setResult(null);
    if (!/^\d+$/.test(input)) { setError('Número de concurso inválido. Digite apenas números.'); return; }
    setSearching(true);
    try {
      const r = await getGame(parseInt(input, 10));
      if (r) setResult(r); else setError(`Não foi possível obter o concurso ${input}.`);
    } catch { setError(`Erro ao buscar o concurso ${input}.`); } finally { setSearching(false); }
  };

  return (
    <Card eyebrow="Consulta" title="Buscar concurso">
      <GameSearchForm onSearch={search} searching={searching} />
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      {result && (
        <div className="animate-rise mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4" role="region" aria-label="Resultado da busca">
          <p className="mb-3 text-sm font-semibold text-emerald-100">Concurso {result.numero} · {result.dataApuracao}</p>
          <div className="flex flex-wrap gap-2">{result.listaDezenas.map((n, i) => <LotteryBall key={n} number={n} tone="hit" delay={i * 30} />)}</div>
        </div>
      )}
    </Card>
  );
};

export default SearchPanel;
