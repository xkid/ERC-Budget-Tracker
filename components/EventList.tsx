import React, { useState, useEffect } from 'react';
import { EventExpense, Month, BadmintonConfig } from '../types';
import { Calendar, Gift, Plane, Trophy, Utensils, Trash2 } from 'lucide-react';
import { MONTH_ORDER } from '../constants';

interface EventListProps {
  events: EventExpense[];
  badmintonConfig: BadmintonConfig;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<EventExpense>) => void;
}

// Helper component for text-based number input to fix alignment and editing UX
const SimpleNumberInput = ({ 
  value, 
  onChange, 
  className, 
  placeholder 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  className?: string; 
  placeholder?: string;
}) => {
  // Initialize string state. If value is 0, show empty string if desired, or "0"
  // Here we default 0 to empty string for cleaner UI, unless user types "0"
  const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());

  useEffect(() => {
    // Sync with parent value if it changes externally (e.g. reset)
    // We parse localValue to compare with numeric value to avoid overwriting "10." with "10"
    const currentNumeric = parseFloat(localValue) || 0;
    if (currentNumeric !== value) {
      setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow digits and one decimal point
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setLocalValue(val);
      onChange(parseFloat(val) || 0);
    }
  };

  return (
    <input 
      type="text" 
      inputMode="decimal"
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
    />
  );
};

const getIcon = (type: string) => {
  switch (type) {
    case 'Birthday': return <Gift className="w-4 h-4 text-pink-500" />;
    case 'Trip': return <Plane className="w-4 h-4 text-sky-500" />;
    case 'Dinner': return <Utensils className="w-4 h-4 text-amber-500" />;
    case 'Sport': return <Trophy className="w-4 h-4 text-emerald-500" />;
    default: return <Calendar className="w-4 h-4 text-slate-500" />;
  }
};

export const EventList: React.FC<EventListProps> = ({ events, badmintonConfig, onDelete, onUpdate }) => {
  
  // Combine Regular Events with Badminton (Visual only)
  const allEvents = [...events];

  // Helper to check if a month has events
  const eventsByMonth = allEvents.reduce((acc, event) => {
    if (!acc[event.month]) acc[event.month] = [];
    acc[event.month].push(event);
    return acc;
  }, {} as Record<string, EventExpense[]>);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-800">Budget Tracker</h3>
        <div className="text-xs font-medium text-slate-500 flex gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Under Budget</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Over Budget</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold w-1/12 border-r border-slate-200 last:border-r-0">Month</th>
              <th className="p-4 font-semibold w-4/12 border-r border-slate-200 last:border-r-0">Event Details</th>
              <th className="p-4 font-semibold w-2/12 text-right border-r border-slate-200 last:border-r-0">Budget Plan</th>
              <th className="p-4 font-semibold w-3/12 text-right border-r border-slate-200 last:border-r-0">Actual Expenses</th>
              <th className="p-4 font-semibold w-1/12 text-center last:border-r-0">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONTH_ORDER.map((month) => {
              const monthlyEvents = eventsByMonth[month] || [];
              const settings = badmintonConfig.months[month];
              const isBadmintonActive = settings?.isSelected;
              
              // Calculate cost based on individual sessions
              const monthlyBadmintonCost = isBadmintonActive 
                ? settings.sessions.reduce((acc, s) => acc + (s.rate * s.courts * s.hours), 0)
                : 0;

              if (monthlyEvents.length === 0 && !isBadmintonActive) return null;

              return (
                <React.Fragment key={month}>
                  <tr className="bg-slate-100 border-y border-slate-200">
                    <td colSpan={5} className="px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                      {month}
                    </td>
                  </tr>

                  {/* Badminton Row */}
                  {isBadmintonActive && (
                    <tr className="group hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-400 border-r border-slate-100 last:border-r-0"></td>
                      <td className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100">
                            <Trophy className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">Badminton Session</p>
                            <p className="text-xs text-slate-400">
                              {settings.sessions.length} sessions • Varies
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-100 last:border-r-0">
                         <div className="flex items-center justify-end font-medium text-slate-600">
                           <span className="text-xs mr-1 text-slate-400">RM</span>
                           <span className="w-20 inline-block text-right">{monthlyBadmintonCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                         </div>
                      </td>
                      <td className="px-4 py-3 text-right border-r border-slate-100 last:border-r-0">
                        <span className="text-slate-400 text-xs italic">Included in Annual</span>
                      </td>
                      <td className="px-4 py-3 text-center last:border-r-0"></td>
                    </tr>
                  )}

                  {/* Event Rows */}
                  {monthlyEvents.map((event) => {
                    const hasActual = event.actualAmount !== undefined && event.actualAmount !== null;
                    const variance = hasActual ? (event.amount - (event.actualAmount || 0)) : 0;
                    const isOverBudget = variance < 0;
                    const isUnderBudget = variance > 0 && hasActual && event.actualAmount! > 0;

                    return (
                      <tr key={event.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500 font-medium border-r border-slate-100 last:border-r-0"></td>
                        <td className="px-4 py-3 border-r border-slate-100 last:border-r-0">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-white border border-slate-100 shadow-sm`}>
                              {getIcon(event.type)}
                            </div>
                            <div className="w-full">
                              <input 
                                type="text"
                                className="font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none w-full transition-colors leading-tight py-1"
                                value={event.name}
                                onChange={(e) => onUpdate(event.id, { name: e.target.value })}
                              />
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{event.type}</p>
                                {event.notes && <p className="text-xs text-rose-500">{event.notes}</p>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right border-r border-slate-100 last:border-r-0">
                           <div className="flex items-center justify-end">
                            <span className="text-slate-500 text-xs mr-1 mt-0.5">RM</span>
                            <SimpleNumberInput
                              className="font-bold text-slate-700 w-20 text-right bg-transparent border-b border-dashed border-slate-300 hover:border-slate-400 focus:border-emerald-500 focus:outline-none font-mono py-1"
                              value={event.amount}
                              onChange={(val) => onUpdate(event.id, { amount: val })}
                            />
                           </div>
                        </td>
                        <td className="px-4 py-3 text-right border-r border-slate-100 last:border-r-0">
                          <div className="flex items-center justify-end gap-2">
                            <div className="relative group/input">
                              <span className="absolute left-2 top-1.5 text-slate-400 text-xs">RM</span>
                              <SimpleNumberInput 
                                className={`w-24 text-right pl-6 pr-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono
                                  ${isOverBudget ? 'border-rose-200 bg-rose-50 text-rose-700 font-semibold' : 
                                    isUnderBudget ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold' : 
                                    'border-slate-200 text-slate-600'}`}
                                placeholder="0"
                                value={event.actualAmount || 0}
                                onChange={(val) => onUpdate(event.id, { actualAmount: val })}
                              />
                            </div>
                          </div>
                          {hasActual && (event.actualAmount || 0) > 0 && (
                            <div className={`text-[10px] font-medium mt-1 ${isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isOverBudget ? 'Over' : 'Saved'} RM {Math.abs(variance).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center last:border-r-0">
                          <button 
                            onClick={() => onDelete(event.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};