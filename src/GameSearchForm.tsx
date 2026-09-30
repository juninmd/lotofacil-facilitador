import React, { useState } from 'react';
import { Spinner } from './components/ui';

interface GameSearchFormProps {
  onSearch: (gameNumber: string) => void;
  searching: boolean;
}

const GameSearchForm: React.FC<GameSearchFormProps> = ({ onSearch, searching }) => {
  const [gameNumber, setGameNumber] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(gameNumber); }} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="gameNumberInput" className="sr-only">Número do concurso</label>
      <input id="gameNumberInput" type="number" inputMode="numeric" placeholder="Número do concurso (ex: 2500)" className="field flex-1" value={gameNumber} onChange={(e) => setGameNumber(e.target.value)} />
      <button type="submit" disabled={searching} aria-busy={searching} className="btn-primary flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold text-white">
        {searching ? <><Spinner /> Buscando…</> : 'Buscar'}
      </button>
    </form>
  );
};

export default GameSearchForm;
