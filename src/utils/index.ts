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

export function isExpenseOnMe(expense: Expense): boolean {
  return expense.paidFor === 'me';
}

export function calcPersonalTotal(expenses: Expense[]): number {
  return expenses.filter(isExpenseOnMe).reduce((sum, e) => sum + e.amount, 0);
}

/**
 * NET SIGN CONVENTION
 * -------------------
 * net > 0  →  I owe friend      (display: "You owe X ₹N")
 * net < 0  →  Friend owes me    (display: "X owes you ₹N")
 * net = 0  →  Settled
 *
 * EXPENSE MATH (rawNet)
 * ---------------------
 * friend paid for me  → I owe friend more  → rawNet += amount   (net goes positive)
 * I paid for friend   → friend owes me     → rawNet -= amount   (net goes negative)
 *
 *   rawNet = iOweFriend - friendOwesMe
 *   e.g. I paid ₹45 for Umalulu → rawNet = 0 - 45 = -45  ✓ (Umalulu owes me)
 *
 * SETTLEMENT STORAGE (handleSettle in SettlementPage)
 * ----------------------------------------------------
 * "friend paid me ₹N"  → stored as  s.amount = +N
 * "I paid friend ₹N"   → stored as  s.amount = -N
 *
 * SETTLEMENT EFFECT ON NET
 * ------------------------
 * "friend paid me ₹45" (s.amount=+45):
 *   net was -45 (friend owes me), after settlement → 0
 *   net = rawNet + s.amount = -45 + 45 = 0  ✓
 *
 * "I paid friend ₹45" (s.amount=-45):
 *   net was +45 (I owe friend), after settlement → 0
 *   net = rawNet + s.amount = +45 + (-45) = 0  ✓
 *
 * FINAL FORMULA:  net = rawNet + sum(s.amount)
 */
export function calcFriendBalances(
  expenses: Expense[],
  settlements: Settlement[],
  friends: Friend[]
): FriendBalance[] {
  return friends.map(friend => {
    let iOweFriend = 0;
    let friendOwesMe = 0;

    for (const e of expenses) {
      if (e.paidBy === friend.id && e.paidFor === 'me') {
        iOweFriend += e.amount;
      } else if (e.paidBy === 'me' && e.paidFor === friend.id) {
        friendOwesMe += e.amount;
      }
    }

    // rawNet < 0 = friend owes me, rawNet > 0 = I owe friend
    const rawNet = iOweFriend - friendOwesMe;

    // Each settlement.amount: +N = friend paid me (shrinks negative rawNet toward 0)
    //                          -N = I paid friend  (shrinks positive rawNet toward 0)
    const settlementTotal = settlements
      .filter(s => s.friendId === friend.id)
      .reduce((sum, s) => sum + s.amount, 0);

    const net = rawNet + settlementTotal;

    return { friend, iOweFriend, friendOwesMe, net };
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
