import React, { useState } from 'react';
import { IncomeSource } from '../types';
import { MONTH_ORDER } from '../constants';
import { Wallet, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';

interface IncomeBreakdownProps {
  sources: IncomeSource[];
  carryOver: number;
  onUpdateCarryOver: (amount: number) => void;
  onUpdateIncome: (id: string, month: string, amount: number) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

export const IncomeBreakdown: React.FC<IncomeBreakdownProps> = ({ sources, carryOver, onUpdateCarryOver, onUpdateIncome }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const calculateSourceTotal = (source: IncomeSource) => {
    return Object.values(source.monthlyAmounts).reduce((a, b) => a + b, 0);
  };

  const yearlyTotal = sources.reduce((acc, curr) => acc + calculateSourceTotal(curr), 0);
  const totalBudget = yearlyTotal + carryOver;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-800">Budget Sources</h3>
      </div>
      
      <div className="space-y-6">
         {/* Carry Over Section */}
         <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
           <label className="block text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
             Previous Year Balance (2025)
           </label>
           <div className="flex items-center gap-2">
             <span className="text-amber-900 font-semibold">RM</span>
             <input 
               type="number"
               value={carryOver}
               onChange={(e) => onUpdateCarryOver(parseFloat(e.target.value) || 0)}
               className="bg-white/50 border-b-2 border-amber-200 focus:border-amber-500 outline-none text-xl font-bold text-amber-900 w-full px-2 py-1 transition-colors"
             />
           </div>
         </div>
         
         {/* Monthly Collections List */}
         <div className="space-y-3">
           <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Annual Collections (Breakdown)</p>
           {sources.map((source, idx) => {
             const annualAmount = calculateSourceTotal(source);
             const isExpanded = expandedId === source.id;

             return (
               <div key={source.id} className="border border-slate-100 rounded-lg overflow-hidden transition-all">
                 <div 
                   onClick={() => toggleExpand(source.id)}
                   className={`group flex justify-between items-center p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : ''}`}
                 >
                   <div className="flex items-center gap-3">
                     <div className="text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                     </div>
                     <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: COLORS[(idx + 1) % COLORS.length] }}></div>
                     <div>
                        <span className="block text-sm font-medium text-slate-700">{source.name}</span>
                        <span className="block text-xs text-slate-400">{source.category} • {source.subCategory}</span>
                     </div>
                   </div>
                   <div className="text-right">
                      <span className="block text-sm font-bold text-slate-800">RM {annualAmount.toLocaleString()}</span>
                      <span className="block text-[10px] text-slate-400">Annual Total</span>
                   </div>
                 </div>

                 {/* Monthly Breakdown Editor */}
                 {isExpanded && (
                   <div className="p-3 bg-slate-50/50 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in slide-in-from-top-1 duration-200">
                     {MONTH_ORDER.map(month => (
                       <div key={month} className="bg-white p-2 rounded border border-slate-100 shadow-sm">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{month}</label>
                         <div className="flex items-center gap-1">
                           <span className="text-[10px] text-slate-400">RM</span>
                           <input 
                             type="number"
                             value={source.monthlyAmounts[month] || 0}
                             onChange={(e) => onUpdateIncome(source.id, month, parseFloat(e.target.value) || 0)}
                             className="w-full text-xs font-semibold text-slate-700 outline-none border-b border-dashed border-slate-200 focus:border-emerald-500 bg-transparent text-right"
                           />
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             );
           })}
         </div>
         
         {/* Total Section */}
         <div className="pt-4 border-t-2 border-slate-100 mt-2">
           <div className="flex justify-between items-end">
             <span className="font-medium text-slate-500 text-sm">Total Available Budget</span>
             <div className="text-right">
                <span className="block text-2xl font-bold text-emerald-600 tracking-tight">RM {totalBudget.toLocaleString()}</span>
                <span className="text-xs text-emerald-600/70 font-medium">Fully Allocated</span>
             </div>
           </div>
         </div>
      </div>
    </div>
  );
};