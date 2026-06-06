import dayjs from 'dayjs';
import type { Expense, Friend, Settlement, FriendBalance } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string): string {
  return dayjs(date).format('DD-MM-YYYY');
}

export function formatDateLong(date: string): string {
  return dayjs(date).format('DD MMM YYYY');
}

export function formatDateTime(date: string, time: string): string {
  return `${formatDate(date)} ${time}`;
}

export function getTodayDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function getCurrentTime(): string {
  return dayjs().format('HH:mm');
}

export function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM');
}

export function getMonthStart(month?: string): string {
  const m = month || getCurrentMonth();
  return dayjs(m).startOf('month').format('YYYY-MM-DD');
}

export function getMonthEnd(month?: string): string {
  const m = month || getCurrentMonth();
  return dayjs(m).endOf('month').format('YYYY-MM-DD');
}

// Dashboard: expense ON ME (Me→Me or Friend→Me)
export function isExpenseOnMe(expense: Expense): boolean {
  return expense.paidFor === 'me';
}

// Calculate personal expense total for a set of expenses
export function calcPersonalTotal(expenses: Expense[]): number {
  return expenses.filter(isExpenseOnMe).reduce((sum, e) => sum + e.amount, 0);
}

// Calculate friend balances from expenses and settlements
export function calcFriendBalances(
  expenses: Expense[],
  settlements: Settlement[],
  friends: Friend[]
): FriendBalance[] {
  return friends.map(friend => {
    // Transactions involving this friend
    const friendExpenses = expenses.filter(
      e => e.paidBy === friend.id || e.paidFor === friend.id
    );

    let iOweFriend = 0;    // friend paid for me
    let friendOwesMe = 0;  // I paid for friend

    for (const e of friendExpenses) {
      if (e.paidBy === friend.id && e.paidFor === 'me') {
        // Friend paid for me → I owe friend
        iOweFriend += e.amount;
      } else if (e.paidBy === 'me' && e.paidFor === friend.id) {
        // I paid for friend → friend owes me
        friendOwesMe += e.amount;
      }
    }

    // Apply settlements
    const friendSettlements = settlements.filter(s => s.friendId === friend.id);
    let settlementNet = 0;
    for (const s of friendSettlements) {
      // positive amount = friend paid me (reduces what I owe or increases what friend owes)
      // negative amount = I paid friend (reduces what friend owes or increases what I owe)
      settlementNet += s.amount;
    }

    // net > 0: I owe friend, net < 0: friend owes me
    const rawNet = iOweFriend - friendOwesMe;
    const net = rawNet + settlementNet;

    return {
      friend,
      iOweFriend,
      friendOwesMe,
      net
    };
  });
}

export function getMonthLabel(month: string): string {
  return dayjs(month).format('MMM YYYY');
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    months.push(dayjs().subtract(i, 'month').format('YYYY-MM'));
  }
  return months;
}

export function groupExpensesByDate(expenses: Expense[]): Record<string, Expense[]> {
  const groups: Record<string, Expense[]> = {};
  for (const e of expenses) {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  }
  return groups;
}

export function getFriendName(id: string, friends: Friend[]): string {
  if (id === 'me') return 'Me';
  return friends.find(f => f.id === id)?.name || 'Unknown';
}
