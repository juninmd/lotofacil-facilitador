import React from 'react';

interface LotteryBallProps {
  number: number | string;
  colorClass?: string;
  sizeClass?: string;
}

/**
 * Bola de loteria com relevo: gradiente radial, brilho superior e sombra,
 * imitando uma esfera física. `colorClass` define cor de fundo/texto (mantém
 * compatibilidade com os usos existentes).
 */
const LotteryBall: React.FC<LotteryBallProps> = ({
  number,
  colorClass = 'bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white',
  sizeClass = 'w-11 h-11 text-lg'
}) => {
  return (
    <div
      className={`
        ${sizeClass} ${colorClass}
        relative rounded-full flex items-center justify-center font-bold
        shadow-md ring-1 ring-black/5
        transition-transform duration-150 hover:scale-110 hover:-translate-y-0.5
        select-none
      `}
      aria-label={`Número ${number}`}
    >
      {/* Brilho especular no topo da esfera */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 top-1 h-2/5 rounded-full bg-white/35 blur-[1px]"
      />
      <span className="relative drop-shadow-sm">{number}</span>
    </div>
  );
};

export default LotteryBall;