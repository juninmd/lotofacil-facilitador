import React, { useState } from 'react';
import { Button, TextField } from '@juninmd/sonido';

interface GameSearchFormProps {
  onSearch: (gameNumber: string) => void;
  searching: boolean;
}

const GameSearchForm: React.FC<GameSearchFormProps> = ({ onSearch, searching }) => {
  const [gameNumber, setGameNumber] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSearch(gameNumber); }} className="flex flex-col items-stretch gap-3 sm:flex-row">
      <TextField
        id="gameNumberInput"
        label="Número do concurso"
        hideLabel
        type="number"
        inputMode="numeric"
        placeholder="Número do concurso (ex: 2500)"
        className="flex-1"
        value={gameNumber}
        onChange={(e) => setGameNumber(e.target.value)}
      />
      <Button type="submit" loading={searching} size="lg">
        {searching ? 'Buscando…' : 'Buscar'}
      </Button>
    </form>
  );
};

export default GameSearchForm;
