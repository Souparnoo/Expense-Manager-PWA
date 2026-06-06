import { openDB, IDBPDatabase } from 'idb';
import type { Friend, QuickExpense, Expense, Settlement, Budget, AppSettings } from '../types';

const DB_NAME = 'expense-manager-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Friends store
      if (!db.objectStoreNames.contains('friends')) {
        const friendsStore = db.createObjectStore('friends', { keyPath: 'id' });
        friendsStore.createIndex('active', 'active');
        friendsStore.createIndex('name', 'name');
      }

      // Quick Expenses store
      if (!db.objectStoreNames.contains('quickExpenses')) {
        db.createObjectStore('quickExpenses', { keyPath: 'id' });
      }

      // Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('date', 'date');
        expenseStore.createIndex('timestamp', 'timestamp');
        expenseStore.createIndex('paidBy', 'paidBy');
        expenseStore.createIndex('paidFor', 'paidFor');
      }

      // Settlements store
      if (!db.objectStoreNames.contains('settlements')) {
        const settlementStore = db.createObjectStore('settlements', { keyPath: 'id' });
        settlementStore.createIndex('friendId', 'friendId');
        settlementStore.createIndex('date', 'date');
        settlementStore.createIndex('timestamp', 'timestamp');
      }

      // Budgets store
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('month', 'month', { unique: true });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    }
  });

  return dbInstance;
}

// ─── Friends ────────────────────────────────────────────────────────────────

export async function getAllFriends(): Promise<Friend[]> {
  const db = await getDB();
  return db.getAll('friends');
}

export async function getActiveFriends(): Promise<Friend[]> {
  const friends = await getAllFriends();
  return friends.filter(f => f.active);
}

export async function getFriend(id: string): Promise<Friend | undefined> {
  const db = await getDB();
  return db.get('friends', id);
}

export async function saveFriend(friend: Friend): Promise<void> {
  const db = await getDB();
  await db.put('friends', friend);
}

export async function deleteFriend(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('friends', id);
}

// ─── Quick Expenses ──────────────────────────────────────────────────────────

export async function getAllQuickExpenses(): Promise<QuickExpense[]> {
  const db = await getDB();
  const all = await db.getAll('quickExpenses');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveQuickExpense(qe: QuickExpense): Promise<void> {
  const db = await getDB();
  await db.put('quickExpenses', qe);
}

export async function deleteQuickExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('quickExpenses', id);
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await getDB();
  const all = await db.getAll('expenses');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getExpense(id: string): Promise<Expense | undefined> {
  const db = await getDB();
  return db.get('expenses', id);
}

export async function saveExpense(expense: Expense): Promise<void> {
  const db = await getDB();
  await db.put('expenses', expense);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('expenses', id);
}

export async function getExpensesByDate(date: string): Promise<Expense[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('expenses', 'date', date);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getExpensesByDateRange(startDate: string, endDate: string): Promise<Expense[]> {
  const expenses = await getAllExpenses();
  return expenses.filter(e => e.date >= startDate && e.date <= endDate);
}

// ─── Settlements ─────────────────────────────────────────────────────────────

export async function getAllSettlements(): Promise<Settlement[]> {
  const db = await getDB();
  const all = await db.getAll('settlements');
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getSettlementsByFriend(friendId: string): Promise<Settlement[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('settlements', 'friendId', friendId);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveSettlement(settlement: Settlement): Promise<void> {
  const db = await getDB();
  await db.put('settlements', settlement);
}

export async function deleteSettlement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('settlements', id);
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export async function getBudgetForMonth(month: string): Promise<Budget | undefined> {
  const db = await getDB();
  const all = await db.getAllFromIndex('budgets', 'month', month);
  return all[0];
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDB();
  return db.getAll('budgets');
}

export async function saveBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await db.put('budgets', budget);
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  return db.get('settings', 'app-settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

// ─── Backup / Restore ────────────────────────────────────────────────────────

export async function exportAllData() {
  const [friends, quickExpenses, expenses, settlements, budgets] = await Promise.all([
    getAllFriends(),
    getAllQuickExpenses(),
    getAllExpenses(),
    getAllSettlements(),
    getAllBudgets()
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    friends,
    quickExpenses,
    expenses,
    settlements,
    budgets
  };
}

export async function importAllData(data: ReturnType<typeof exportAllData> extends Promise<infer T> ? T : never): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['friends', 'quickExpenses', 'expenses', 'settlements', 'budgets'], 'readwrite');

  // Clear all stores
  await Promise.all([
    tx.objectStore('friends').clear(),
    tx.objectStore('quickExpenses').clear(),
    tx.objectStore('expenses').clear(),
    tx.objectStore('settlements').clear(),
    tx.objectStore('budgets').clear()
  ]);

  // Import all
  for (const f of data.friends) await tx.objectStore('friends').put(f);
  for (const qe of data.quickExpenses) await tx.objectStore('quickExpenses').put(qe);
  for (const e of data.expenses) await tx.objectStore('expenses').put(e);
  for (const s of data.settlements) await tx.objectStore('settlements').put(s);
  for (const b of data.budgets) await tx.objectStore('budgets').put(b);

  await tx.done;
}
