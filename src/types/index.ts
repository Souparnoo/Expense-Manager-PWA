export interface Friend {
  id: string;
  name: string;
  active: boolean;
  linkedEmail?: string;   // Gmail for collaborative notifications
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  isDefault?: boolean;
}

export interface QuickExpense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  createdAt: number;
}

export type PaidBy = 'me' | string;
export type PaidFor = 'me' | string;

export type ConfirmationStatus = 'none' | 'pending' | 'accepted' | 'rejected' | 'expired';

export interface Expense {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  name: string;
  amount: number;
  paidBy: PaidBy;
  paidFor: PaidFor;
  categoryId: string;
  // Collaborative confirmation
  confirmationStatus: ConfirmationStatus;
  notificationId?: string;   // Firebase notification ID if sent
  createdAt: number;
  updatedAt: number;
}

export interface Settlement {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  friendId: string;
  amount: number;
  note: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  month: string;
  amount: number;
  updatedAt: number;
}

export interface DriveBackupMeta {
  email: string;
  name: string;
  picture: string;
  hint: string;
  connectedAt: number;
  lastBackupAt: number | null;
  lastBackupFileName: string | null;
  lastBackupSize: number | null;
  encryptionEnabled: boolean;
}

export interface AppSettings {
  id: string;
  darkMode: boolean;
  currency: string;
  driveBackup?: DriveBackupMeta;
  firebaseUid?: string;      // persisted Firebase UID for session awareness
  updatedAt: number;
}

// ── Firebase notification (lives in Firebase Realtime DB, NOT IndexedDB) ──────
export type NotificationDirection = 'i_paid_for_you' | 'you_paid_for_me';

export interface FirebaseNotification {
  id: string;                // Firebase push key
  fromUid: string;
  fromEmail: string;
  fromName: string;
  expenseId: string;         // local expense ID on sender's side
  expenseName: string;
  amount: number;
  date: string;
  time: string;
  categoryId: string;
  categoryName: string;
  direction: NotificationDirection;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  expiresAt: number;         // createdAt + 7 days
  recipientUid?: string;     // present only on the sender's own mirror copy
                              // (sentNotifications/{senderUid}/{id}) — lets the
                              // sender delete/reference the recipient's copy
                              // without an extra lookup
}

export interface DBSchema {
  friends: Friend;
  quickExpenses: QuickExpense;
  expenses: Expense;
  settlements: Settlement;
  budgets: Budget;
  settings: AppSettings;
  categories: Category;
}

export interface FriendBalance {
  friend: Friend;
  iOweFriend: number;
  friendOwesMe: number;
  net: number;
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
  categoryId: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food',          name: 'Food',          icon: '🍔', color: '#E53935', createdAt: 0, isDefault: true },
  { id: 'transport',     name: 'Transport',     icon: '🚌', color: '#1E88E5', createdAt: 0, isDefault: true },
  { id: 'shopping',      name: 'Shopping',      icon: '🛍️', color: '#8E24AA', createdAt: 0, isDefault: true },
  { id: 'rent',          name: 'Rent',          icon: '🏠', color: '#00897B', createdAt: 0, isDefault: true },
  { id: 'medical',       name: 'Medical',       icon: '💊', color: '#F4511E', createdAt: 0, isDefault: true },
  { id: 'education',     name: 'Education',     icon: '📚', color: '#F9A825', createdAt: 0, isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#3949AB', createdAt: 0, isDefault: true },
  { id: 'bills',         name: 'Bills',         icon: '💡', color: '#039BE5', createdAt: 0, isDefault: true },
  { id: 'other',         name: 'Other',         icon: '📦', color: '#757575', createdAt: 0, isDefault: true },
];
