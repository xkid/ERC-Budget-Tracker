
export enum Month {
  Jan = 'Jan',
  Feb = 'Feb',
  Mar = 'Mar',
  Apr = 'Apr',
  May = 'May',
  Jun = 'Jun',
  Jul = 'Jul',
  Aug = 'Aug',
  Sep = 'Sep',
  Oct = 'Oct',
  Nov = 'Nov',
  Dec = 'Dec',
  JanNext = 'Jan (Next Year)'
}

export interface IncomeSource {
  id: string;
  name: string;
  category: 'Company' | 'Staff';
  subCategory: 'Trading' | 'Tech' | 'Automation';
  monthlyAmounts: Record<string, number>; // Key is Month enum
}

export type TaskStatus = 'Todo' | 'InProgress' | 'Done';

export interface EventTask {
  id: string;
  title: string;
  assignee: string;
  budget: number;
  status: TaskStatus;
}

export interface EventExpense {
  id: string;
  name: string;
  month: Month;
  amount: number; // Planned Budget
  actualAmount?: number; // Actual Spent
  isRecurring?: boolean;
  notes?: string;
  type: 'Event' | 'Birthday' | 'Trip' | 'Dinner' | 'Sport';
  tasks?: EventTask[];
}

export interface BadmintonSession {
  id: string;
  rate: number;
  courts: number;
  hours: number;
}

export interface MonthlyBadmintonSettings {
  isSelected: boolean;
  sessions: BadmintonSession[];
}

export interface BadmintonConfig {
  months: Record<string, MonthlyBadmintonSettings>; // Key is Month enum
}

export interface BudgetSummary {
  carryOver: number;
  totalIncome: number;
  totalExpenses: number;
  remainingBudget: number;
}

export interface AppData {
  events: EventExpense[];
  incomeSources: IncomeSource[];
  carryOver: number;
  badmintonConfig: BadmintonConfig;
  lastUpdated: string;
}
