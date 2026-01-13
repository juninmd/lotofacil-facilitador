import React from 'react';

interface LotteryBallProps {
  number: number | string;
  colorClass?: string;
  sizeClass?: string;
}

const LotteryBall: React.FC<LotteryBallProps> = ({
  number,
  colorClass = 'bg-pink-600 text-white',
  sizeClass = 'w-10 h-10 text-lg'
}) => {
  return (
    <div
      className={`
        ${sizeClass} rounded-full flex items-center justify-center font-bold shadow-sm
        ${colorClass}
      `}
      aria-label={`Número ${number}`}
    >
      {number}
    </div>
  );
};

export default LotteryBall;
