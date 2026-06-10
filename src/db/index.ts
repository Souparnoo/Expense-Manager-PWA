import { openDB, IDBPDatabase } from 'idb';
import type { Friend, QuickExpense, Expense, Settlement, Budget, AppSettings, Category } from '../types';
import { DEFAULT_CATEGORIES } from '../types';

const DB_NAME = 'expense-manager-db';
const DB_VERSION = 2;  // bumped for categories store

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── v1 stores (create if missing) ──────────────────────────────────────
      if (!db.objectStoreNames.contains('friends')) {
        const s = db.createObjectStore('friends', { keyPath: 'id' });
        s.createIndex('active', 'active');
        s.createIndex('name', 'name');
      }
      if (!db.objectStoreNames.contains('quickExpenses')) {
        db.createObjectStore('quickExpenses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('expenses')) {
        const s = db.createObjectStore('expenses', { keyPath: 'id' });
        s.createIndex('date', 'date');
        s.createIndex('timestamp', 'timestamp');
        s.createIndex('paidBy', 'paidBy');
        s.createIndex('paidFor', 'paidFor');
      }
      if (!db.objectStoreNames.contains('settlements')) {
        const s = db.createObjectStore('settlements', { keyPath: 'id' });
        s.createIndex('friendId', 'friendId');
        s.createIndex('date', 'date');
        s.createIndex('timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('budgets')) {
        const s = db.createObjectStore('budgets', { keyPath: 'id' });
        s.createIndex('month', 'month', { unique: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // ── v2: categories store ────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    },
    async blocked() {},
    async blocking() { dbInstance = null; }
  });

  // Seed default categories if store is empty
  const existing = await dbInstance.getAll('categories');
  if (existing.length === 0) {
    const tx = dbInstance.transaction('categories', 'readwrite');
    for (const cat of DEFAULT_CATEGORIES) {
      await tx.store.put(cat);
    }
    await tx.done;
  }

  return dbInstance;
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export async function getAllFriends(): Promise<Friend[]> {
  const db = await getDB();
  return db.getAll('friends');
}

export async function getActiveFriends(): Promise<Friend[]> {
  return (await getAllFriends()).filter(f => f.active);
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

// ─── Categories ──────────────────────────────────────────────────────────────

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  const all = await db.getAll('categories');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveCategory(cat: Category): Promise<void> {
  const db = await getDB();
  await db.put('categories', cat);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('categories', id);
}

// ─── Quick Expenses ───────────────────────────────────────────────────────────

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

// ─── Expenses ─────────────────────────────────────────────────────────────────

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
  return (await getAllExpenses()).filter(e => e.date >= startDate && e.date <= endDate);
}

// ─── Settlements ──────────────────────────────────────────────────────────────

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

// ─── Budget ───────────────────────────────────────────────────────────────────

export async function getBudgetForMonth(month: string): Promise<Budget | undefined> {
  const db = await getDB();
  return (await db.getAllFromIndex('budgets', 'month', month))[0];
}

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDB();
  return db.getAll('budgets');
}

export async function saveBudget(budget: Budget): Promise<void> {
  const db = await getDB();
  await db.put('budgets', budget);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  return db.get('settings', 'app-settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

export async function exportAllData() {
  const [friends, quickExpenses, expenses, settlements, budgets, categories] = await Promise.all([
    getAllFriends(),
    getAllQuickExpenses(),
    getAllExpenses(),
    getAllSettlements(),
    getAllBudgets(),
    getAllCategories(),
  ]);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    friends,
    quickExpenses,
    expenses,
    settlements,
    budgets,
    categories,
  };
}

export async function importAllData(data: any): Promise<void> {
  const db = await getDB();
  const stores = ['friends', 'quickExpenses', 'expenses', 'settlements', 'budgets', 'categories'] as const;
  const tx = db.transaction([...stores], 'readwrite');

  for (const s of stores) await tx.objectStore(s).clear();

  for (const f of data.friends ?? [])       await tx.objectStore('friends').put(f);
  for (const qe of data.quickExpenses ?? []) await tx.objectStore('quickExpenses').put(qe);
  for (const e of data.expenses ?? [])       await tx.objectStore('expenses').put(e);
  for (const s of data.settlements ?? [])    await tx.objectStore('settlements').put(s);
  for (const b of data.budgets ?? [])        await tx.objectStore('budgets').put(b);

  // Restore categories; if none in backup, re-seed defaults
  const cats = data.categories ?? [];
  if (cats.length > 0) {
    for (const c of cats) await tx.objectStore('categories').put(c);
  } else {
    for (const c of DEFAULT_CATEGORIES) await tx.objectStore('categories').put(c);
  }

  await tx.done;
}
