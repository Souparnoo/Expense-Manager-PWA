import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { Expense, Friend, Settlement } from '../types';
import { getFriendName, formatDate } from './index';

function colWidths(data: string[][]): { wch: number }[] {
  if (!data.length) return [];
  const cols = data[0].length;
  return Array.from({ length: cols }, (_, i) => ({
    wch: Math.max(...data.map(row => String(row[i] || '').length), 10)
  }));
}

export function exportToExcel(
  expenses: Expense[],
  friends: Friend[],
  settlements: Settlement[]
): void {
  const wb = XLSX.utils.book_new();
  const sorted = [...expenses].sort((a, b) => a.timestamp - b.timestamp);

  // ── Sheet 1: ALL_HISTORY ────────────────────────────────────────────────
  const allHeaders = ['Date', 'Time', 'Expense Name', 'Amount', 'Paid By', 'Paid For'];
  const allRows = sorted.map(e => [
    formatDate(e.date),
    e.time,
    e.name,
    e.amount,
    getFriendName(e.paidBy, friends),
    getFriendName(e.paidFor, friends)
  ]);
  const totalTxn = sorted.length;
  const totalAmt = sorted.reduce((s, e) => s + e.amount, 0);
  const allData = [
    allHeaders,
    ...allRows,
    [],
    ['Total Transactions', totalTxn],
    ['Total Amount', totalAmt]
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(allData);
  ws1['!cols'] = colWidths(allData.map(r => r.map(String)));
  XLSX.utils.book_append_sheet(wb, ws1, 'ALL_HISTORY');

  // ── Sheet 2: MY_EXPENSES ────────────────────────────────────────────────
  const myExpenses = sorted.filter(e => e.paidFor === 'me');
  const myHeaders = ['Date', 'Time', 'Expense Name', 'Paid By', 'Amount'];
  const myRows = myExpenses.map(e => [
    formatDate(e.date),
    e.time,
    e.name,
    getFriendName(e.paidBy, friends),
    e.amount
  ]);
  const myTotal = myExpenses.reduce((s, e) => s + e.amount, 0);
  const myData = [
    myHeaders,
    ...myRows,
    [],
    ['Total Personal Expense', myTotal]
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(myData);
  ws2['!cols'] = colWidths(myData.map(r => r.map(String)));
  XLSX.utils.book_append_sheet(wb, ws2, 'MY_EXPENSES');

  // ── Per-Friend Sheets ────────────────────────────────────────────────────
  for (const friend of friends) {
    const friendExpenses = sorted.filter(
      e => e.paidBy === friend.id || e.paidFor === friend.id
    );
    const friendSettlements = settlements.filter(s => s.friendId === friend.id);

    const headers = ['Date', 'Time', 'Expense Name', 'Type', 'Paid By', 'Amount'];
    const rows: (string | number)[][] = [];

    for (const e of friendExpenses) {
      let type = '';
      let amount = 0;
      if (e.paidBy === friend.id && e.paidFor === 'me') {
        type = 'I_OWE_FRIEND';
        amount = e.amount; // positive: friend paid, I owe
      } else if (e.paidBy === 'me' && e.paidFor === friend.id) {
        type = 'FRIEND_OWES_ME';
        amount = -e.amount; // negative: I paid, friend owes
      }
      rows.push([
        formatDate(e.date),
        e.time,
        e.name,
        type,
        getFriendName(e.paidBy, friends),
        amount
      ]);
    }

    // Add settlements
    for (const s of friendSettlements) {
      rows.push([
        formatDate(s.date),
        s.time,
        s.note || 'Settlement',
        'SETTLEMENT',
        s.amount > 0 ? friend.name : 'Me',
        s.amount
      ]);
    }

    // Net balance
    let iOweFriend = friendExpenses
      .filter(e => e.paidBy === friend.id && e.paidFor === 'me')
      .reduce((s, e) => s + e.amount, 0);
    let friendOwesMe = friendExpenses
      .filter(e => e.paidBy === 'me' && e.paidFor === friend.id)
      .reduce((s, e) => s + e.amount, 0);
    const settlementNet = friendSettlements.reduce((s, se) => s + se.amount, 0);
    const rawNet = iOweFriend - friendOwesMe;
    const net = rawNet - settlementNet;

    let status = '';
    if (net > 0) status = `I owe ${friend.name} ${Math.abs(net).toFixed(2)}`;
    else if (net < 0) status = `${friend.name} owes me ${Math.abs(net).toFixed(2)}`;
    else status = 'Settled up';

    const sheetData = [
      headers,
      ...rows,
      [],
      ['Friend', friend.name],
      ['Net Balance', net],
      ['Status', status]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = colWidths(sheetData.map(r => r.map(String)));
    const sheetName = friend.name.toUpperCase().slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const fileName = `expense-manager-${dayjs().format('YYYY-MM-DD')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
