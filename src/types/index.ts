export interface Friend {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
}

export interface QuickExpense {
  id: string;
  name: string;
  amount: number;
  createdAt: number;
}

export type PaidBy = 'me' | string; // 'me' or friend id
export type PaidFor = 'me' | string; // 'me' or friend id

export interface Expense {
  id: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  timestamp: number;   // epoch ms
  name: string;
  amount: number;
  paidBy: PaidBy;      // 'me' or friend id
  paidFor: PaidFor;    // 'me' or friend id
  createdAt: number;
  updatedAt: number;
}

export interface Settlement {
  id: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  timestamp: number;
  friendId: string;
  amount: number;      // positive = friend paid me, negative = I paid friend
  note: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  month: string;       // YYYY-MM
  amount: number;
  updatedAt: number;
}

export interface AppSettings {
  id: string;
  darkMode: boolean;
  currency: string;
  updatedAt: number;
}

export interface DBSchema {
  friends: Friend;
  quickExpenses: QuickExpense;
  expenses: Expense;
  settlements: Settlement;
  budgets: Budget;
  settings: AppSettings;
}

export interface FriendBalance {
  friend: Friend;
  iOweFriend: number;   // sum of friend paid for me
  friendOwesMe: number; // sum of I paid for friend
  net: number;          // positive = I owe friend, negative = friend owes me
}

export interface DashboardStats {
  todayExpense: number;
  monthExpense: number;
  todayCount: number;
  monthCount: number;
  budget: Budget | null;
}

export interface ExpenseFormData {
  date: string;
  time: string;
  name: string;
  amount: string;
  paidBy: string;
  paidFor: string;
}
