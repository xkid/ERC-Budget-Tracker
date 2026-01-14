import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  type: 'neutral' | 'positive' | 'negative' | 'info';
  icon?: React.ReactNode;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, type, icon }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' }).format(val);

  const getColors = () => {
    switch (type) {
      case 'positive': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'negative': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-white text-slate-700 border-slate-200';
    }
  };

  const DefaultIcon = type === 'positive' ? TrendingUp : type === 'negative' ? TrendingDown : DollarSign;
  const IconToRender = icon || <DefaultIcon className="w-5 h-5" />;

  return (
    <div className={`p-4 rounded-xl border ${getColors()} shadow-sm transition-all duration-200 hover:shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium opacity-80">{title}</h3>
        <div className="p-1.5 rounded-full bg-white/50 backdrop-blur-sm">
          {IconToRender}
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{formatCurrency(amount)}</p>
    </div>
  );
};
