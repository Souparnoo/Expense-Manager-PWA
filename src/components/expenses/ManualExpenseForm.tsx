import React, { useState } from 'react';
import { Box, TextField, Button, InputAdornment, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApp } from '../../hooks/useApp';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import * as db from '../../db';
import { generateId } from '../../utils';
import { sendPaymentNotification } from '../../utils/notifications';
import type { Expense, NotificationDirection } from '../../types';

export default function ManualExpenseForm() {
  const {
    friends, categories,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
    selectedCategoryId, settings, reloadExpenses
  } = useApp();
  const { firebaseUser, refreshSentWatchers } = useFirebaseAuth();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) { setError('Enter expense name'); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter valid amount'); return; }

    const expense: Expense = {
      id: generateId(),
      date: selectedDate,
      time: selectedTime,
      timestamp: new Date(`${selectedDate}T${selectedTime}`).getTime(),
      name: name.trim(),
      amount: amt,
      paidBy: selectedPaidBy,
      paidFor: selectedPaidFor,
      categoryId: selectedCategoryId || 'other',
      confirmationStatus: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Determine which friend (if any) is on the "other side" of this transaction,
    // and which direction the notification should describe.
    let notifyFriendId: string | null = null;
    let direction: NotificationDirection | null = null;

    if (selectedPaidBy === 'me' && selectedPaidFor !== 'me') {
      // I paid for a friend → "I paid for you" notification
      notifyFriendId = selectedPaidFor;
      direction = 'i_paid_for_you';
    } else if (selectedPaidBy !== 'me' && selectedPaidFor === 'me') {
      // A friend paid for me → "You paid for me" notification (so they can confirm)
      notifyFriendId = selectedPaidBy;
      direction = 'you_paid_for_me';
    }

    if (notifyFriendId && direction && firebaseUser) {
      const friend = friends.find(f => f.id === notifyFriendId);
      if (friend?.linkedEmail) {
        expense.confirmationStatus = 'pending';
        await db.saveExpense(expense);
        await reloadExpenses();

        const notifId = await sendPaymentNotification(expense, friend, {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName,
        }, categories, direction);

        if (notifId) {
          await db.saveExpense({ ...expense, notificationId: notifId });
          await reloadExpenses();
          refreshSentWatchers();
          setToast(`${name.trim()} ₹${amt} added · Sent to ${friend.name} for confirmation`);
        } else {
          setToast(`${name.trim()} ₹${amt} added (${friend.name} not on app yet)`);
        }
        setName(''); setAmount(''); setError('');
        return;
      }
    }

    await db.saveExpense(expense);
    await reloadExpenses();
    setToast(`${name.trim()} ${settings.currency}${amt} added!`);
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
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
