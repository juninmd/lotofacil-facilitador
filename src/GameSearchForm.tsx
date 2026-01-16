import React, { useState } from 'react';

interface GameSearchFormProps {
  onSearch: (gameNumber: string) => void;
  searching: boolean;
}

const GameSearchForm: React.FC<GameSearchFormProps> = ({ onSearch, searching }) => {
  const [gameNumber, setGameNumber] = useState<string>('');

  const handleSubmit = () => {
    onSearch(gameNumber);
  };

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="gameNumberInput" className="sr-only">Número do jogo</label>
      <input
        id="gameNumberInput"
        type="number"
        placeholder="Digite o número do jogo (ex: 2500)"
        className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={gameNumber}
        onChange={(e) => setGameNumber(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        disabled={searching}
        className={`bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition duration-200 focus-visible:ring-4 focus-visible:ring-blue-300 flex justify-center items-center gap-2 ${
          searching ? 'opacity-75 cursor-not-allowed' : ''
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
    </div>
  );
};

export default GameSearchForm;
