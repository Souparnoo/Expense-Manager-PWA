import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Friend, QuickExpense, Expense, Settlement, Budget, AppSettings } from '../types';
import * as db from '../db';
import { getTodayDate, getCurrentTime, getCurrentMonth } from '../utils';

interface AppContextType {
  // Data
  friends: Friend[];
  quickExpenses: QuickExpense[];
  expenses: Expense[];
  settlements: Settlement[];
  budgets: Budget[];
  settings: AppSettings;

  // Loading
  loading: boolean;

  // Reload functions
  reloadFriends: () => Promise<void>;
  reloadQuickExpenses: () => Promise<void>;
  reloadExpenses: () => Promise<void>;
  reloadSettlements: () => Promise<void>;
  reloadBudgets: () => Promise<void>;
  reloadAll: () => Promise<void>;

  // Settings
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;

  // Form state (shared across home)
  selectedDate: string;
  selectedTime: string;
  selectedPaidBy: string;
  selectedPaidFor: string;
  setSelectedDate: (d: string) => void;
  setSelectedTime: (t: string) => void;
  setSelectedPaidBy: (v: string) => void;
  setSelectedPaidFor: (v: string) => void;
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
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState(getCurrentTime());
  const [selectedPaidBy, setSelectedPaidBy] = useState('me');
  const [selectedPaidFor, setSelectedPaidFor] = useState('me');

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

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      reloadFriends(),
      reloadQuickExpenses(),
      reloadExpenses(),
      reloadSettlements(),
      reloadBudgets()
    ]);
    setLoading(false);
  }, [reloadFriends, reloadQuickExpenses, reloadExpenses, reloadSettlements, reloadBudgets]);

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

  // Reset time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedTime(getCurrentTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{
      friends, quickExpenses, expenses, settlements, budgets, settings,
      loading,
      reloadFriends, reloadQuickExpenses, reloadExpenses, reloadSettlements, reloadBudgets, reloadAll,
      updateSettings,
      selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
      setSelectedDate, setSelectedTime, setSelectedPaidBy, setSelectedPaidFor
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
