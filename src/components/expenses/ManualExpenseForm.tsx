import React, { useState } from 'react';
import { Box, TextField, Button, InputAdornment, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApp } from '../../hooks/useApp';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import * as db from '../../db';
import { generateId } from '../../utils';
import { sendPaymentNotification } from '../../utils/notifications';
import { scheduleAutoBackup } from '../../utils/autoBackup';
import type { Expense, NotificationDirection } from '../../types';

export default function ManualExpenseForm() {
  const {
    friends, categories,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor, selectedPaidForMulti,
    selectedCategoryId, settings, reloadExpenses
  } = useApp();
  const { firebaseUser, refreshSentWatchers } = useFirebaseAuth();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Creates one expense for a single paidBy/paidFor pair, including the
  // notification flow if the recipient is a Gmail-linked friend. Shared by
  // both the single-select path and the multi-select fan-out below so the
  // notification/confirmation logic only lives in one place.
  const createOneExpense = async (
    expenseName: string,
    amt: number,
    paidBy: string,
    paidFor: string
  ): Promise<{ sentTo: string | null; notNotified: string | null }> => {
    const expense: Expense = {
      id: generateId(),
      date: selectedDate,
      time: selectedTime,
      timestamp: new Date(`${selectedDate}T${selectedTime}`).getTime(),
      name: expenseName,
      amount: amt,
      paidBy,
      paidFor,
      categoryId: selectedCategoryId || 'other',
      confirmationStatus: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    let notifyFriendId: string | null = null;
    let direction: NotificationDirection | null = null;

    if (paidBy === 'me' && paidFor !== 'me') {
      notifyFriendId = paidFor;
      direction = 'i_paid_for_you';
    } else if (paidBy !== 'me' && paidFor === 'me') {
      notifyFriendId = paidBy;
      direction = 'you_paid_for_me';
    }

    if (notifyFriendId && direction && firebaseUser) {
      const friend = friends.find(f => f.id === notifyFriendId);
      if (friend?.linkedEmail) {
        expense.confirmationStatus = 'pending';
        await db.saveExpense(expense);

        const notifId = await sendPaymentNotification(expense, friend, {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName,
        }, categories, direction);

        if (notifId) {
          await db.saveExpense({ ...expense, notificationId: notifId });
          return { sentTo: friend.name, notNotified: null };
        }
        return { sentTo: null, notNotified: friend.name };
      }
    }

    await db.saveExpense(expense);
    return { sentTo: null, notNotified: null };
  };

  const handleAdd = async () => {
    if (!name.trim()) { setError('Enter expense name'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter valid amount'); return; }

    const trimmedName = name.trim();
    const isMulti = selectedPaidForMulti.length > 1;

    if (isMulti) {
      // Fan out: one identical expense per selected friend, each amt = the
      // value typed in the form (NOT split — same full amount each, per the
      // "we all ordered the same thing" use case).
      const sentNames: string[] = [];
      const skippedNames: string[] = [];

      for (const friendId of selectedPaidForMulti) {
        const result = await createOneExpense(trimmedName, amt, 'me', friendId);
        if (result.sentTo) sentNames.push(result.sentTo);
        if (result.notNotified) skippedNames.push(result.notNotified);
      }

      await reloadExpenses();
      scheduleAutoBackup(settings);
      if (sentNames.length > 0) refreshSentWatchers();

      const count = selectedPaidForMulti.length;
      let msg = `${trimmedName} ${settings.currency}${amt} added for ${count} people!`;
      if (sentNames.length > 0) msg += ` Notified: ${sentNames.join(', ')}.`;
      setToast(msg);
    } else {
      const result = await createOneExpense(trimmedName, amt, selectedPaidBy, selectedPaidFor);
      await reloadExpenses();
      scheduleAutoBackup(settings);

      if (result.sentTo) {
        refreshSentWatchers();
        setToast(`${trimmedName} ${settings.currency}${amt} added · Sent to ${result.sentTo} for confirmation`);
      } else if (result.notNotified) {
        setToast(`${trimmedName} ${settings.currency}${amt} added (${result.notNotified} not on app yet)`);
      } else {
        setToast(`${trimmedName} ${settings.currency}${amt} added!`);
      }
    }

    setName('');
    setAmount('');
    setError('');
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField
          placeholder="Expense name" size="small" value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          error={Boolean(error && !name.trim())} sx={{ flex: 2 }}
        />
        <TextField
          placeholder="Amount" size="small" type="number" value={amount}
          onChange={e => { setAmount(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          error={Boolean(error && !amount)}
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          sx={{ flex: 1 }} inputProps={{ min: 0, step: '0.01' }}
        />
        <Button variant="contained" onClick={handleAdd}
          sx={{ minWidth: 0, px: 2, py: '7.5px', borderRadius: 2.5 }}>
          <AddIcon />
        </Button>
      </Box>
      {error && <Box sx={{ mt: 0.5 }}><span style={{ fontSize: '0.75rem', color: '#E53935' }}>{error}</span></Box>}
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}