const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (v: number): string => brl.format(v);
export const formatPct = (p: number, digits = 1): string => `${(p * 100).toFixed(digits).replace('.', ',')}%`;
export const formatInt = (n: number): string => n.toLocaleString('pt-BR');
