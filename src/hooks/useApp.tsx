import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Friend, QuickExpense, Expense, Settlement, Budget, AppSettings, Category } from '../types';
import * as db from '../db';
import { getTodayDate, getCurrentTime } from '../utils';

interface AppContextType {
  // Data
  friends: Friend[];
  quickExpenses: QuickExpense[];
  expenses: Expense[];
  settlements: Settlement[];
  budgets: Budget[];
  settings: AppSettings;
  categories: Category[];

  // Loading
  loading: boolean;

  // Reload functions
  reloadFriends: () => Promise<void>;
  reloadQuickExpenses: () => Promise<void>;
  reloadExpenses: () => Promise<void>;
  reloadSettlements: () => Promise<void>;
  reloadBudgets: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  reloadAll: () => Promise<void>;

  // Settings
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;

  // Form state
  selectedDate: string;
  selectedTime: string;
  selectedPaidBy: string;
  selectedPaidFor: string;
  selectedPaidForMulti: string[];   // when length > 1, expense fans out to each
  selectedCategoryId: string;
  setSelectedDate: (d: string) => void;
  setSelectedTime: (t: string) => void;
  setSelectedPaidBy: (v: string) => void;
  setSelectedPaidFor: (v: string) => void;
  setSelectedPaidForMulti: (v: string[]) => void;
  setSelectedCategoryId: (v: string) => void;
}

const defaultSettings: AppSettings = {
  id: 'app-settings',
  darkMode: true,
  currency: '₹',
  updatedAt: Date.now()
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [quickExpenses, setQuickExpenses] = useState<QuickExpense[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());
  const [selectedPaidBy, setSelectedPaidBy] = useState('me');
  const [selectedPaidFor, setSelectedPaidFor] = useState('me');
  const [selectedPaidForMulti, setSelectedPaidForMulti] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('other');

  const reloadFriends = useCallback(async () => {
    setFriends(await db.getAllFriends());
  }, []);

  const reloadQuickExpenses = useCallback(async () => {
    setQuickExpenses(await db.getAllQuickExpenses());
  }, []);

  const reloadExpenses = useCallback(async () => {
    setExpenses(await db.getAllExpenses());
  }, []);

  const reloadSettlements = useCallback(async () => {
    setSettlements(await db.getAllSettlements());
  }, []);

  const reloadBudgets = useCallback(async () => {
    setBudgets(await db.getAllBudgets());
  }, []);

  const reloadCategories = useCallback(async () => {
    setCategories(await db.getAllCategories());
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      reloadFriends(),
      reloadQuickExpenses(),
      reloadExpenses(),
      reloadSettlements(),
      reloadBudgets(),
      reloadCategories(),
    ]);
    setLoading(false);
  }, [reloadFriends, reloadQuickExpenses, reloadExpenses, reloadSettlements, reloadBudgets, reloadCategories]);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const updated: AppSettings = { ...settings, ...partial, updatedAt: Date.now() };
    setSettings(updated);
    await db.saveSettings(updated);
  }, [settings]);

  useEffect(() => {
    async function init() {
      await db.getDB();
      const savedSettings = await db.getSettings();
      if (savedSettings) setSettings(savedSettings);
      else await db.saveSettings(defaultSettings);
      await reloadAll();
    }
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      friends, quickExpenses, expenses, settlements, budgets, settings, categories,
      loading,
      reloadFriends, reloadQuickExpenses, reloadExpenses, reloadSettlements,
      reloadBudgets, reloadCategories, reloadAll,
      updateSettings,
      selectedDate, selectedTime, selectedPaidBy, selectedPaidFor, selectedPaidForMulti, selectedCategoryId,
      setSelectedDate, setSelectedTime, setSelectedPaidBy, setSelectedPaidFor, setSelectedPaidForMulti, setSelectedCategoryId
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}