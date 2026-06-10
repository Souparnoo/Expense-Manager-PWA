import React, { useState } from 'react';
import { Box, TextField, Button, InputAdornment, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApp } from '../../hooks/useApp';
import * as db from '../../db';
import { generateId } from '../../utils';
import type { Expense } from '../../types';

export default function ManualExpenseForm() {
  const {
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
    selectedCategoryId, settings, reloadExpenses
  } = useApp();

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
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await db.saveExpense(expense);
    await reloadExpenses();
    setToast(`${name.trim()} ${settings.currency}${amt} added!`);
    setName('');
    setAmount('');
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <TextField
          placeholder="Expense name"
          size="small"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          error={Boolean(error && !name.trim())}
          sx={{ flex: 2 }}
        />
        <TextField
          placeholder="Amount"
          size="small"
          type="number"
          value={amount}
          onChange={e => { setAmount(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          error={Boolean(error && !amount)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.9rem' }}>₹</span>
              </InputAdornment>
            )
          }}
          sx={{ flex: 1 }}
          inputProps={{ min: 0, step: '0.01' }}
        />
        <Button
          variant="contained"
          onClick={handleAdd}
          sx={{ minWidth: 0, px: 2, py: '7.5px', borderRadius: 2.5 }}
        >
          <AddIcon />
        </Button>
      </Box>
      {error && (
        <Box sx={{ mt: 0.5 }}>
          <span style={{ fontSize: '0.75rem', color: '#E53935' }}>{error}</span>
        </Box>
      )}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2000}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast('')} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
