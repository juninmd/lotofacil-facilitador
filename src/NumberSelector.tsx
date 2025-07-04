import React from 'react';

interface NumberSelectorProps {
  selectedNumbers: number[];
  onNumberClick: (number: number) => void;
  maxNumbers: number;
}

const NumberSelector: React.FC<NumberSelectorProps> = ({
  selectedNumbers,
  onNumberClick,
  maxNumbers,
}) => {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {numbers.map((num) => (
        <button
          key={num}
          className={`
            w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold
            transition-colors duration-200 ease-in-out
            ${selectedNumbers.includes(num)
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-100'
            }
            ${(!selectedNumbers.includes(num) && selectedNumbers.length >= maxNumbers)
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
            }
          `}
          onClick={() => onNumberClick(num)}
          disabled={!selectedNumbers.includes(num) && selectedNumbers.length >= maxNumbers}
        >
          {num}
        </button>
      ))}
    </div>
  );
};

export default NumberSelector;
