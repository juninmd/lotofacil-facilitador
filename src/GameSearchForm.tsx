import React, { useState } from 'react';

interface GameSearchFormProps {
  onSearch: (gameNumber: string) => void;
  searching: boolean;
}

const GameSearchForm: React.FC<GameSearchFormProps> = ({ onSearch, searching }) => {
  const [gameNumber, setGameNumber] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(gameNumber);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label htmlFor="gameNumberInput" className="sr-only">Número do jogo</label>
      <input
        id="gameNumberInput"
        type="number"
        inputMode="numeric"
        placeholder="Digite o número do jogo (ex: 2500)"
        className="p-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-shadow"
        value={gameNumber}
        onChange={(e) => setGameNumber(e.target.value)}
      />
      <button
        type="submit"
        disabled={searching}
        className={`bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:ring-4 focus-visible:ring-violet-300 flex justify-center items-center gap-2 ${
          searching ? 'opacity-75 cursor-not-allowed hover:translate-y-0' : ''
        }`}
        aria-busy={searching}
      >
        {searching ? (
          <>
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Buscando...
          </>
        ) : (
          'Buscar Jogo'
        )}
      </button>
    </form>
  );
};

export default GameSearchForm;
