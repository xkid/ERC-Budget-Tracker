import { EventExpense, IncomeSource, Month, BadmintonConfig, MonthlyBadmintonSettings, BadmintonSession } from './types';

export const INITIAL_CARRY_OVER = 0;

export const MONTH_ORDER = [
  Month.Jan, Month.Feb, Month.Mar, Month.Apr, Month.May, Month.Jun, 
  Month.Jul, Month.Aug, Month.Sep, Month.Oct, Month.Nov, Month.Dec, Month.JanNext
];

const createMonthlyMap = (amount: number) => {
  const map: Record<string, number> = {};
  MONTH_ORDER.forEach(m => map[m] = amount);
  return map;
};

// Helper to create a standard set of 4 sessions
const createStandardSessions = (): BadmintonSession[] => {
  return Array(4).fill(null).map((_, i) => ({
    id: `sess-${i}-${Math.random().toString(36).substr(2,5)}`,
    rate: 7.5,
    courts: 2,
    hours: 2
  }));
};

export const createInitialBadmintonConfig = (): BadmintonConfig => {
  const monthsConfig: Record<string, MonthlyBadmintonSettings> = {};
  MONTH_ORDER.forEach(month => {
    monthsConfig[month] = {
      isSelected: false,
      sessions: []
    };
  });
  return { months: monthsConfig };
};

export const createEmptyBadmintonConfig = (): BadmintonConfig => {
  const monthsConfig: Record<string, MonthlyBadmintonSettings> = {};
  MONTH_ORDER.forEach(month => {
    monthsConfig[month] = {
      isSelected: false,
      sessions: []
    };
  });
  return { months: monthsConfig };
};

export const INITIAL_INCOME_SOURCES: IncomeSource[] = [
  { id: '1', name: 'Elcomp Trading Sponsor', category: 'Company', subCategory: 'Trading', monthlyAmounts: createMonthlyMap(0) },
  { id: '2', name: 'Elcomp Tech Sponsor', category: 'Company', subCategory: 'Tech', monthlyAmounts: createMonthlyMap(0) },
  { id: '3', name: 'Elcomp Auto Sponsor', category: 'Company', subCategory: 'Automation', monthlyAmounts: createMonthlyMap(0) },
  { id: '4', name: 'Staff Trading Sponsor', category: 'Staff', subCategory: 'Trading', monthlyAmounts: createMonthlyMap(0) },
  { id: '5', name: 'Staff Tech Sponsor', category: 'Staff', subCategory: 'Tech', monthlyAmounts: createMonthlyMap(0) },
  { id: '6', name: 'Staff Auto Sponsor', category: 'Staff', subCategory: 'Automation', monthlyAmounts: createMonthlyMap(0) },
];

export const INITIAL_EVENTS: EventExpense[] = [];