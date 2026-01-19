import React, { useState, useMemo, useEffect, useRef } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { EventPlanner } from './components/EventPlanner';
import { Plus, Wallet, Receipt, Download, Upload, RotateCcw, AlertTriangle, Coins, DollarSign, FileText, FileDown, Loader2 } from 'lucide-react';

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
  
  // View State for Routing
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  // --- Calculations ---
  
  const yearlyIncome = useMemo(() => {
    return incomeSources.reduce<number>((total, source) => {
      const sourceTotal = (Object.values(source.monthlyAmounts) as number[]).reduce<number>((acc, val) => acc + val, 0);
      return total + sourceTotal;
    }, 0);
  }, [incomeSources]);

  const totalBudget = carryOver + yearlyIncome;

  const totalBadmintonCost = useMemo(() => {
    return Object.values(badmintonConfig.months).reduce<number>((acc, settings: MonthlyBadmintonSettings) => {
      if (!settings.isSelected) return acc;
      return acc + settings.sessions.reduce((sAcc, s) => sAcc + (s.rate * s.courts * s.hours), 0);
    }, 0);
  }, [badmintonConfig]);

  const totalEventPlanned = useMemo(() => {
    return events.reduce((acc, curr) => acc + curr.amount, 0);
  }, [events]);

  const totalActualSpent = useMemo(() => {
    return events.reduce((acc, curr) => acc + (curr.actualAmount || 0), 0);
  }, [events]);

  // Alert Logic
  const grandTotalPlanned = totalEventPlanned + totalBadmintonCost;
  const projectedBalance = totalBudget - grandTotalPlanned;
  const actualBalance = totalBudget - totalActualSpent;

  // Calculate Variance for events that have actuals
  const { variance, totalPlannedForCompleted, totalSavings, totalOverspend, savingsCount, overspendCount } = useMemo(() => {
    let plannedSum = 0;
    let actualSum = 0;
    let savings = 0;
    let overspend = 0;
    let sCount = 0;
    let oCount = 0;
    
    events.forEach(e => {
        if (e.actualAmount !== undefined && e.actualAmount > 0) {
            plannedSum += e.amount;
            actualSum += e.actualAmount;
            const diff = e.amount - e.actualAmount; // Positive = Savings, Negative = Overspend
            if (diff > 0) {
                savings += diff;
                sCount++;
            } else if (diff < 0) {
                overspend += Math.abs(diff);
                oCount++;
            }
        }
    });
    
    return {
        variance: plannedSum - actualSum, // Positive = Under Budget (Good), Negative = Over Budget (Bad)
        totalPlannedForCompleted: plannedSum,
        totalSavings: savings,
        totalOverspend: overspend,
        savingsCount: sCount,
        overspendCount: oCount
    };
  }, [events]);

  const isOverBudget = variance < 0;

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

  const handleExportCSV = () => {
    const escape = (val: string | number) => {
        if (typeof val === 'number') return val.toFixed(2);
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows: string[][] = [];
    rows.push(['SUMMARY']);
    rows.push(['Total Budget', 'Planned Expenses', 'Projected Balance', 'Actual Expenses', 'Actual Balance']);
    rows.push([totalBudget, grandTotalPlanned, projectedBalance, totalActualSpent, actualBalance].map(escape));
    rows.push([]);

    rows.push(['INCOME SOURCES']);
    const monthHeaders = MONTH_ORDER.map(m => m);
    rows.push(['Source', 'Category', 'SubCategory', ...monthHeaders, 'Total']);
    incomeSources.forEach(source => {
        const monthlyValues = MONTH_ORDER.map(m => source.monthlyAmounts[m] || 0);
        const sourceTotal = monthlyValues.reduce<number>((a, b) => a + b, 0);
        rows.push([source.name, source.category, source.subCategory, ...monthlyValues, sourceTotal].map(escape));
    });
    rows.push([]);

    rows.push(['EXPENSES (EVENTS & BADMINTON)']);
    rows.push(['Month', 'Description', 'Type', 'Planned Amount', 'Actual Amount', 'Variance']);
    MONTH_ORDER.forEach(month => {
        const badmSettings = badmintonConfig.months[month];
        if (badmSettings && badmSettings.isSelected) {
            const badmCost = badmSettings.sessions.reduce((acc, s) => acc + (s.rate * s.courts * s.hours), 0);
             rows.push([month, 'Badminton Sessions', 'Sport', badmCost, 0, badmCost].map(escape));
        }
        const monthEvents = events.filter(e => e.month === month);
        monthEvents.forEach(e => {
            const planned = e.amount;
            const actual = e.actualAmount || 0;
            const variance = planned - actual;
            rows.push([month, e.name, e.type, planned, actual, variance].map(escape));
        });
    });

    rows.push([]);
    rows.push(['EVENT PLANNER TASKS (DETAIL)']);
    rows.push(['Month', 'Event Name', 'Task', 'Description', 'Checklist', 'Assignee', 'Status', 'Estimated Cost']);
    MONTH_ORDER.forEach(month => {
        const monthEvents = events.filter(e => e.month === month);
        monthEvents.forEach(e => {
            if (e.tasks && e.tasks.length > 0) {
                e.tasks.forEach(task => {
                    const checklistStr = task.checklist 
                        ? task.checklist.map(i => `[${i.completed ? 'x' : ' '}] ${i.text}`).join('; ')
                        : '';
                    rows.push([month, e.name, task.title, task.description || '', checklistStr, task.assignee, task.status, task.budget].map(escape));
                });
            }
        });
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rec_club_budget_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setIsGeneratingPdf(true);
    // Give React time to render the loading state
    await new Promise(r => setTimeout(r, 100));

    const doc = new jsPDF();
    const fmtMoney = (num: number) => `RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

    let fontName = 'helvetica'; // Fallback
    const customFontName = 'SimHei';

    try {
      // Using SimHei TTF from a CDN. SimHei is a standard Chinese font widely compatible.
      // We use a GitHub raw link proxied via jsDelivr for reliability.
      const fontUrl = 'https://cdn.jsdelivr.net/gh/StellarCN/scp_zh@master/fonts/SimHei.ttf';
      
      const response = await fetch(fontUrl);
      if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
      
      const blob = await response.blob();
      const reader = new FileReader();
      
      await new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            const result = reader.result as string;
            // result is "data:font/ttf;base64,..."
            const base64 = result.split(',')[1];
            
            if (base64) {
              // Add the font to VFS
              doc.addFileToVFS('SimHei.ttf', base64);
              // Register the font
              doc.addFont('SimHei.ttf', customFontName, 'normal');
              // Set it as active immediately
              doc.setFont(customFontName);
              fontName = customFontName;
              resolve(true);
            } else {
              reject(new Error("Empty base64 result"));
            }
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Could not load Chinese font. PDF will use standard font.", e);
      alert("Note: Chinese characters may not display correctly because the font server could not be reached.");
    }

    // --- Generate Content ---

    // Title
    doc.setFont(fontName);
    doc.setFontSize(18);
    doc.text("Recreation Club Budget Summary", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);

    // Common style object to force usage of the custom font in autoTable
    const tableStyles = {
        font: fontName,
        fontStyle: 'normal'
    };

    // 1. Summary Table
    const summaryData = [
      ["Total Budget", fmtMoney(totalBudget)],
      ["Planned Expenses", fmtMoney(grandTotalPlanned)],
      ["Projected Balance", fmtMoney(projectedBalance)],
      ["Actual Expenses", fmtMoney(totalActualSpent)],
      ["Actual Balance", fmtMoney(actualBalance)],
    ];

    autoTable(doc, {
      startY: 35,
      head: [['Metric', 'Amount']],
      body: summaryData,
      theme: 'striped',
      // Apply styles to ALL sections to prevent fallback to Helvetica which triggers "No Unicode cmap"
      styles: { ...tableStyles },
      headStyles: { fillColor: [16, 185, 129], ...tableStyles },
      bodyStyles: { ...tableStyles },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } }
    });

    // 2. Income Table
    const incomeData = incomeSources.map(s => {
      const total = (Object.values(s.monthlyAmounts) as number[]).reduce((a, b) => a + b, 0);
      return [s.name, s.category, fmtMoney(total)];
    });
    // Add Carry Over
    incomeData.unshift(["Previous Year Balance (2025)", "Carry Over", fmtMoney(carryOver)]);
    // Add Total
    incomeData.push(["TOTAL INCOME", "", fmtMoney(totalBudget)]);

    doc.text("Income Sources", 14, (doc as any).lastAutoTable.finalY + 15);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Source', 'Category', 'Annual Total']],
      body: incomeData,
      theme: 'grid',
      styles: { ...tableStyles },
      headStyles: { fillColor: [59, 130, 246], ...tableStyles },
      bodyStyles: { ...tableStyles },
      columnStyles: { 2: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === incomeData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    // 3. Expenses Table
    const expenseData: any[] = [];
    MONTH_ORDER.forEach(month => {
      const badmSettings = badmintonConfig.months[month];
      if (badmSettings && badmSettings.isSelected) {
        const cost = badmSettings.sessions.reduce((acc, s) => acc + (s.rate * s.courts * s.hours), 0);
        expenseData.push([month, "Badminton Sessions", "Sport", fmtMoney(cost), fmtMoney(0)]);
      }
      const monthEvents = events.filter(e => e.month === month);
      monthEvents.forEach(e => {
        expenseData.push([month, e.name, e.type, fmtMoney(e.amount), fmtMoney(e.actualAmount || 0)]);
      });
    });

    expenseData.push(["TOTAL", "", "", fmtMoney(grandTotalPlanned), fmtMoney(totalActualSpent)]);

    doc.text("Expense Breakdown", 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Month', 'Description', 'Type', 'Planned', 'Actual']],
      body: expenseData,
      theme: 'grid',
      styles: { ...tableStyles },
      headStyles: { fillColor: [244, 63, 94], ...tableStyles },
      bodyStyles: { ...tableStyles },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === expenseData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    // 4. Detailed Tasks Table
    const taskData: any[] = [];
    MONTH_ORDER.forEach(month => {
        const monthEvents = events.filter(e => e.month === month);
        monthEvents.forEach(e => {
            if (e.tasks && e.tasks.length > 0) {
                e.tasks.forEach(task => {
                    const desc = task.description ? `\n(${task.description})` : '';
                    taskData.push([month, e.name, task.title + desc, task.assignee, task.status, fmtMoney(task.budget)]);
                });
            }
        });
    });

    if (taskData.length > 0) {
        doc.addPage();
        doc.text("Event Planner Details", 14, 20);
        
        autoTable(doc, {
            startY: 25,
            head: [['Month', 'Event', 'Task', 'Assignee', 'Status', 'Cost']],
            body: taskData,
            theme: 'striped',
            styles: { ...tableStyles },
            headStyles: { fillColor: [100, 116, 139], ...tableStyles },
            bodyStyles: { ...tableStyles },
            columnStyles: { 5: { halign: 'right' } }
        });
    }

    doc.save(`rec_club_summary_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsGeneratingPdf(false);
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
      setEvents([]);
      setIncomeSources(prev => prev.map(source => {
        const zeroedMonths: Record<string, number> = {};
        MONTH_ORDER.forEach(m => zeroedMonths[m] = 0);
        return { ...source, monthlyAmounts: zeroedMonths };
      }));
      setCarryOver(0);
      setBadmintonConfig(createEmptyBadmintonConfig());
      
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
      localStorage.removeItem(STORAGE_KEYS.INCOME);
      localStorage.removeItem(STORAGE_KEYS.CARRY_OVER);
      localStorage.removeItem(STORAGE_KEYS.BADMINTON);
    }
  };

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
      type: 'Event',
      tasks: []
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
  
  const handleFullUpdateEvent = (updatedEvent: EventExpense) => {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  // --- Income Handlers ---

  const handleUpdateIncome = (id: string, month: string, amount: number) => {
    setIncomeSources(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, monthlyAmounts: { ...s.monthlyAmounts, [month]: amount } };
    }));
  };

  const handleAddIncomeSource = () => {
    const newSource: IncomeSource = {
        id: `inc-${Date.now()}`,
        name: 'New Collection Source',
        category: 'Company',
        subCategory: 'Trading',
        monthlyAmounts: MONTH_ORDER.reduce((acc, m) => ({...acc, [m]: 0}), {})
    };
    setIncomeSources(prev => [...prev, newSource]);
  };

  const handleDeleteIncomeSource = (id: string) => {
      setIncomeSources(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateIncomeDetails = (id: string, name: string, category: string) => {
      setIncomeSources(prev => prev.map(s => s.id === id ? { ...s, name, category: category as IncomeSource['category'] } : s));
  };

  // --- View Switching ---

  if (activeEventId) {
    const activeEvent = events.find(e => e.id === activeEventId);
    if (activeEvent) {
      return (
        <EventPlanner 
          event={activeEvent} 
          onBack={() => setActiveEventId(null)}
          onUpdateEvent={handleFullUpdateEvent}
        />
      );
    }
  }

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
            
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Import Data"><Upload className="w-4 h-4" /></button>
            <button onClick={handleExport} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Export JSON"><Download className="w-4 h-4" /></button>
            <button onClick={handleExportCSV} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Export CSV"><FileText className="w-4 h-4" /></button>
            <button 
              onClick={handleExportPDF} 
              disabled={isGeneratingPdf}
              className={`p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ${isGeneratingPdf ? 'opacity-50 cursor-wait' : ''}`} 
              title="Export PDF"
            >
              {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            </button>
            <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reset to Empty"><RotateCcw className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <SummaryCard 
            title="Total Budget" 
            amount={totalBudget} 
            type="positive"
            icon={<Coins className="w-5 h-5" />}
          />
          <SummaryCard 
              title="Planned Expenses" 
              amount={grandTotalPlanned} 
              type="neutral"
              icon={<DollarSign className="w-5 h-5" />}
            />
          <SummaryCard 
            title="Projected Balance" 
            amount={projectedBalance} 
            type="info"
            icon={<Wallet className="w-5 h-5" />}
          />
          <SummaryCard 
              title="Actual Expenses" 
              amount={totalActualSpent} 
              type="neutral"
              icon={<Receipt className="w-5 h-5" />}
          />
          <SummaryCard 
            title="Actual Balance" 
            amount={actualBalance} 
            type="info"
            icon={<DollarSign className="w-5 h-5" />}
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
              onEventClick={(e) => setActiveEventId(e.id)}
              totalSavings={totalSavings}
              totalOverspend={totalOverspend}
              savingsCount={savingsCount}
              overspendCount={overspendCount}
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
              onAddSource={handleAddIncomeSource}
              onDeleteSource={handleDeleteIncomeSource}
              onUpdateSourceDetails={handleUpdateIncomeDetails}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;