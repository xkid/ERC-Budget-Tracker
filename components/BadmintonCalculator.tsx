import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Check, Settings2, Plus, Trash2 } from 'lucide-react';
import { BadmintonConfig, Month, MonthlyBadmintonSettings, BadmintonSession } from '../types';
import { MONTH_ORDER } from '../constants';

interface BadmintonCalculatorProps {
  config: BadmintonConfig;
  onChange: (newConfig: BadmintonConfig) => void;
}

export const BadmintonCalculator: React.FC<BadmintonCalculatorProps> = ({ config, onChange }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [editTarget, setEditTarget] = useState<string>('all'); // 'all' or Month enum key
  
  // Local state for "Bulk Apply" inputs
  const [bulkRate, setBulkRate] = useState(7.5);
  const [bulkCourts, setBulkCourts] = useState(2);
  const [bulkHours, setBulkHours] = useState(2);
  const [bulkSessions, setBulkSessions] = useState(4);

  // Calculate annual cost based on monthly settings
  const annualCost = Object.values(config.months).reduce<number>((acc, settings: MonthlyBadmintonSettings) => {
    if (!settings.isSelected) return acc;
    return acc + settings.sessions.reduce((sAcc, s) => sAcc + (s.rate * s.courts * s.hours), 0);
  }, 0);

  const activeMonthsCount = Object.values(config.months).filter((m: MonthlyBadmintonSettings) => m.isSelected).length;

  const toggleMonth = (month: string) => {
    const newMonths = { ...config.months };
    newMonths[month] = { ...newMonths[month], isSelected: !newMonths[month].isSelected };
    onChange({ ...config, months: newMonths });
  };

  const handleBulkApply = () => {
    if (!window.confirm("This will overwrite all session data for ALL months. Continue?")) return;

    const newMonths = { ...config.months };
    MONTH_ORDER.forEach(m => {
      const newSessions: BadmintonSession[] = Array(bulkSessions).fill(null).map((_, i) => ({
        id: `bulk-${m}-${i}-${Date.now()}`,
        rate: bulkRate,
        courts: bulkCourts,
        hours: bulkHours
      }));
      newMonths[m] = { ...newMonths[m], sessions: newSessions, isSelected: true };
    });
    onChange({ ...config, months: newMonths });
  };

  const handleAddSession = (month: string) => {
    const newMonths = { ...config.months };
    const newSession: BadmintonSession = {
      id: `new-${Date.now()}`,
      rate: 7.5,
      courts: 2,
      hours: 2
    };
    newMonths[month] = { 
      ...newMonths[month], 
      sessions: [...newMonths[month].sessions, newSession] 
    };
    onChange({ ...config, months: newMonths });
  };

  const handleRemoveSession = (month: string, sessionId: string) => {
    const newMonths = { ...config.months };
    newMonths[month] = { 
      ...newMonths[month], 
      sessions: newMonths[month].sessions.filter(s => s.id !== sessionId) 
    };
    onChange({ ...config, months: newMonths });
  };

  const handleUpdateSession = (month: string, sessionId: string, field: keyof BadmintonSession, value: number) => {
    const newMonths = { ...config.months };
    newMonths[month] = { 
      ...newMonths[month], 
      sessions: newMonths[month].sessions.map(s => s.id === sessionId ? { ...s, [field]: value } : s)
    };
    onChange({ ...config, months: newMonths });
  };

  const getMonthTotal = (month: string) => {
    return config.months[month].sessions.reduce((acc, s) => acc + (s.rate * s.courts * s.hours), 0);
  };

  return (
    <div className="bg-indigo-50/50 p-6 rounded-2xl shadow-sm border border-indigo-100 border-dashed">
      <div 
        className="flex items-center justify-between mb-2 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-indigo-900">Badminton Calculator</h3>
        </div>
        <button className="text-indigo-400 hover:text-indigo-600 transition-colors">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="mb-6">
            <label className="block text-xs font-medium text-indigo-800 mb-2 flex justify-between">
              <span>Active Months</span>
              <span className="text-indigo-400">{activeMonthsCount} selected</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {MONTH_ORDER.map(month => {
                 const isSelected = config.months[month].isSelected;
                 return (
                  <button
                    key={month}
                    onClick={() => toggleMonth(month)}
                    className={`px-1 py-1.5 text-[10px] sm:text-xs rounded-md font-medium transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {month === Month.JanNext ? 'Jan (N)' : month}
                  </button>
                 );
              })}
            </div>
          </div>

          <div className="mb-4 bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
             <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-50">
               <div className="flex items-center gap-2">
                 <Settings2 className="w-4 h-4 text-indigo-500" />
                 <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Edit Configuration</span>
               </div>
               <select 
                 value={editTarget}
                 onChange={(e) => setEditTarget(e.target.value)}
                 className="text-xs bg-indigo-50 border-indigo-100 rounded-md px-2 py-1 text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
               >
                 <option value="all">Bulk Apply (Reset)</option>
                 <option disabled>--- Detailed Month Edit ---</option>
                 {MONTH_ORDER.map(m => (
                   <option key={m} value={m}>{m}</option>
                 ))}
               </select>
             </div>

             {editTarget === 'all' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 text-[10px] text-indigo-400 mb-1">
                    Define standard settings and apply to all months to reset variations.
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Rate / Hour</label>
                    <input type="number" value={bulkRate} onChange={e => setBulkRate(parseFloat(e.target.value)||0)} className="w-full px-2 py-1 bg-slate-50 border rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Courts</label>
                    <input type="number" value={bulkCourts} onChange={e => setBulkCourts(parseFloat(e.target.value)||0)} className="w-full px-2 py-1 bg-slate-50 border rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Hours / Sess</label>
                    <input type="number" value={bulkHours} onChange={e => setBulkHours(parseFloat(e.target.value)||0)} className="w-full px-2 py-1 bg-slate-50 border rounded-md text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Session Count</label>
                    <input type="number" value={bulkSessions} onChange={e => setBulkSessions(parseFloat(e.target.value)||0)} className="w-full px-2 py-1 bg-slate-50 border rounded-md text-xs" />
                  </div>
                  <button onClick={handleBulkApply} className="col-span-2 mt-2 bg-indigo-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700">Apply to All Months</button>
                </div>
             ) : (
                <div className="space-y-3">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-900">{editTarget} Sessions</span>
                      <button onClick={() => handleAddSession(editTarget)} className="text-[10px] flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100">
                        <Plus className="w-3 h-3" /> Add Session
                      </button>
                   </div>
                   <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                     {config.months[editTarget].sessions.length === 0 && (
                       <p className="text-xs text-slate-400 italic text-center py-2">No sessions planned.</p>
                     )}
                     {config.months[editTarget].sessions.map((session, idx) => (
                       <div key={session.id} className="grid grid-cols-12 gap-1 items-center bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="col-span-1 text-[10px] font-bold text-slate-400">#{idx+1}</div>
                          <div className="col-span-3">
                            <label className="block text-[9px] text-slate-400">Rate</label>
                            <input 
                              type="number" 
                              value={session.rate} 
                              onChange={(e) => handleUpdateSession(editTarget, session.id, 'rate', parseFloat(e.target.value)||0)}
                              className="w-full text-xs bg-white border border-slate-200 rounded px-1"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[9px] text-slate-400">Courts</label>
                            <input 
                              type="number" 
                              value={session.courts} 
                              onChange={(e) => handleUpdateSession(editTarget, session.id, 'courts', parseFloat(e.target.value)||0)}
                              className="w-full text-xs bg-white border border-slate-200 rounded px-1"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[9px] text-slate-400">Hours</label>
                            <input 
                              type="number" 
                              value={session.hours} 
                              onChange={(e) => handleUpdateSession(editTarget, session.id, 'hours', parseFloat(e.target.value)||0)}
                              className="w-full text-xs bg-white border border-slate-200 rounded px-1"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <button onClick={() => handleRemoveSession(editTarget, session.id)} className="text-rose-400 hover:text-rose-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                       </div>
                     ))}
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-indigo-50">
                     <span className="text-xs text-slate-500">Month Total:</span>
                     <span className="text-sm font-bold text-indigo-700">RM {getMonthTotal(editTarget).toFixed(2)}</span>
                   </div>
                </div>
             )}
          </div>
          
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
             <div>
                <span className="block text-xs text-indigo-500">Total Annual Cost</span>
                <span className="text-xl font-bold text-indigo-700">RM {annualCost.toLocaleString()}</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};