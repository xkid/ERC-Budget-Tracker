import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  INITIAL_CARRY_OVER, 
  INITIAL_INCOME_SOURCES, 
  INITIAL_EVENTS,
  MONTH_ORDER,
  createInitialBadmintonConfig,
  createEmptyBadmintonConfig
} from './constants';
import { EventExpense, BadmintonConfig, Month, MonthlyBadmintonSettings, AppData, IncomeSource } from './types';
import { SummaryCard } from './components/SummaryCard';
import { IncomeBreakdown } from './components/IncomeBreakdown';
import { EventList } from './components/EventList';
import { BadmintonCalculator } from './components/BadmintonCalculator';
import { Plus, Wallet, Receipt, Download, Upload, RotateCcw } from 'lucide-react';

const STORAGE_KEYS = {
  EVENTS: 'rec_club_events',
  INCOME: 'rec_club_income',
  CARRY_OVER: 'rec_club_carry_over',
  BADMINTON: 'rec_club_badminton'
};

const App: React.FC = () => {
  // --- State Initialization with LocalStorage ---
  
  const [events, setEvents] = useState<EventExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCOME);
    return saved ? JSON.parse(saved) : INITIAL_INCOME_SOURCES;
  });

  const [carryOver, setCarryOver] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CARRY_OVER);
    return saved ? JSON.parse(saved) : INITIAL_CARRY_OVER;
  });

  const [badmintonConfig, setBadmintonConfig] = useState<BadmintonConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BADMINTON);
    if (!saved) return createInitialBadmintonConfig();
    
    // Migration check: If stored data has old structure (no sessions array), reset to default
    const parsed = JSON.parse(saved);
    const firstMonth = parsed.months['Jan'];
    if (firstMonth && !Array.isArray(firstMonth.sessions)) {
      console.warn('Old badminton config detected, resetting to default structure.');
      return createInitialBadmintonConfig();
    }
    return parsed;
  });
  
  // Manual Input State
  const [newMonth, setNewMonth] = useState<Month>(Month.Jan);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence Effects ---

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INCOME, JSON.stringify(incomeSources));
  }, [incomeSources]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CARRY_OVER, JSON.stringify(carryOver));
  }, [carryOver]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BADMINTON, JSON.stringify(badmintonConfig));
  }, [badmintonConfig]);

  // --- Data Management Handlers ---

  const handleExport = () => {
    const data: AppData = {
      events,
      incomeSources,
      carryOver,
      badmintonConfig,
      lastUpdated: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rec-club-budget-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data: AppData = JSON.parse(json);

        if (data.events && data.incomeSources && typeof data.carryOver === 'number' && data.badmintonConfig) {
          if (confirm('This will overwrite current data. Are you sure?')) {
            setEvents(data.events);
            setIncomeSources(data.incomeSources);
            setCarryOver(data.carryOver);
            setBadmintonConfig(data.badmintonConfig);
            alert('Data imported successfully!');
          }
        } else {
          alert('Invalid file format. Missing required fields.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse JSON file.');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to CLEAR all data? This will set all values to zero and empty lists. This cannot be undone.')) {
      // Clear Events
      setEvents([]);
      
      // Zero out Income Sources (keep structure)
      setIncomeSources(prev => prev.map(source => {
        const zeroedMonths: Record<string, number> = {};
        MONTH_ORDER.forEach(m => zeroedMonths[m] = 0);
        return { ...source, monthlyAmounts: zeroedMonths };
      }));
      
      // Zero Carry Over
      setCarryOver(0);
      
      // Clear Badminton Config
      setBadmintonConfig(createEmptyBadmintonConfig());
      
      // Clear storage
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
      localStorage.removeItem(STORAGE_KEYS.INCOME);
      localStorage.removeItem(STORAGE_KEYS.CARRY_OVER);
      localStorage.removeItem(STORAGE_KEYS.BADMINTON);
    }
  };

  // --- Calculations ---
  
  const yearlyIncome = useMemo(() => {
    return incomeSources.reduce((total, source) => {
      const sourceTotal = Object.values(source.monthlyAmounts).reduce((acc, val) => acc + val, 0);
      return total + sourceTotal;
    }, 0);
  }, [incomeSources]);

  const totalBudget = carryOver + yearlyIncome;

  const totalBadmintonCost = useMemo(() => {
    return Object.values(badmintonConfig.months).reduce((acc, settings) => {
      if (!settings.isSelected) return acc;
      // Sum up individual session costs
      return acc + settings.sessions.reduce((sAcc, s) => sAcc + (s.rate * s.courts * s.hours), 0);
    }, 0);
  }, [badmintonConfig]);

  const totalEventExpenses = useMemo(() => {
    return events.reduce((acc, curr) => acc + curr.amount, 0);
  }, [events]);

  const totalActualSpent = useMemo(() => {
    return events.reduce((acc, curr) => acc + (curr.actualAmount || 0), 0);
  }, [events]);

  const grandTotalPlanned = totalEventExpenses + totalBadmintonCost;
  const remainingBudget = totalBudget - grandTotalPlanned;
  
  // --- Event Handlers ---
  
  const handleAddEvent = () => {
    if (!newName.trim()) return;
    
    const amountVal = parseFloat(newAmount) || 0;
    
    const newEvent: EventExpense = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      month: newMonth,
      amount: amountVal,
      actualAmount: 0,
      type: 'Event' 
    };

    setEvents(prev => [...prev, newEvent]);
    setNewName('');
    setNewAmount('');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateEvent = (id: string, updates: Partial<EventExpense>) => {
    setEvents(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updatedEvent = { ...e, ...updates };
      
      if (updates.amount && updates.amount > 0 && e.notes === 'Budget Pending') {
        updatedEvent.notes = undefined;
      }
      
      return updatedEvent;
    }));
  };

  const handleUpdateIncome = (id: string, month: string, amount: number) => {
    setIncomeSources(prev => prev.map(s => {
      if (s.id !== id) return s;
      return {
        ...s,
        monthlyAmounts: {
          ...s.monthlyAmounts,
          [month]: amount
        }
      };
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">E</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 leading-tight">
                ERC Budget Tracker
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">Planning 2025-2026</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json"
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Import Data"
            >
              <Upload className="w-4 h-4" />
            </button>

            <button 
              onClick={handleExport}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Export Data"
            >
              <Download className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>

            <button 
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Reset to Empty"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard 
            title="Total Available Budget" 
            amount={totalBudget} 
            type="info"
            icon={<Wallet className="w-5 h-5" />}
          />
          <SummaryCard 
            title="Total Planned Expenses" 
            amount={grandTotalPlanned} 
            type="neutral"
          />
          <SummaryCard 
            title="Event Actuals (YTD)" 
            amount={totalActualSpent} 
            type="neutral"
            icon={<Receipt className="w-5 h-5" />}
          />
          <SummaryCard 
            title="Projected Balance" 
            amount={remainingBudget} 
            type={remainingBudget >= 0 ? 'positive' : 'negative'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Timeline & Input */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Manual Input Box */}
            <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 text-white">
               <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                 <Plus className="w-4 h-4" /> Add New Event Plan
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                 <div className="sm:col-span-3">
                   <label className="block text-xs font-medium text-slate-400 mb-1">Month</label>
                   <select 
                     value={newMonth}
                     onChange={(e) => setNewMonth(e.target.value as Month)}
                     className="w-full px-3 py-2 rounded-lg bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                   >
                     {MONTH_ORDER.map(m => (
                       <option key={m} value={m}>{m}</option>
                     ))}
                   </select>
                 </div>
                 <div className="sm:col-span-5">
                   <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                   <input 
                     type="text"
                     placeholder="e.g. Team Building Lunch"
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm placeholder-slate-500"
                     onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                   />
                 </div>
                 <div className="sm:col-span-2">
                   <label className="block text-xs font-medium text-slate-400 mb-1">Budget</label>
                   <input 
                     type="number"
                     placeholder="0.00"
                     value={newAmount}
                     onChange={(e) => setNewAmount(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg bg-slate-700 border-slate-600 text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                     onKeyDown={(e) => e.key === 'Enter' && handleAddEvent()}
                   />
                 </div>
                 <div className="sm:col-span-2">
                   <button 
                     onClick={handleAddEvent}
                     className="w-full bg-slate-100 hover:bg-white text-slate-900 font-semibold py-2 px-3 rounded-lg transition-colors text-sm"
                   >
                     + Add Plan
                   </button>
                 </div>
               </div>
            </div>

            <EventList 
              events={events} 
              badmintonConfig={badmintonConfig}
              onDelete={handleDeleteEvent}
              onUpdate={handleUpdateEvent}
            />
          </div>

          {/* Right Column: Breakdown & Tools */}
          <div className="lg:col-span-4 space-y-6">
            <BadmintonCalculator 
              config={badmintonConfig}
              onChange={setBadmintonConfig}
            />
            <IncomeBreakdown 
              sources={incomeSources}
              carryOver={carryOver}
              onUpdateCarryOver={setCarryOver}
              onUpdateIncome={handleUpdateIncome}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;