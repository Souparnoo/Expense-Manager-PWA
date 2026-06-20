import React, { useState, useMemo } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, InputAdornment, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useApp } from '../../hooks/useApp';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatCurrency, getFriendName, getTodayDate } from '../../utils';
import * as db from '../../db';
import type { Expense, ConfirmationStatus } from '../../types';

function ConfirmationBadge({ status }: { status: ConfirmationStatus }) {
  if (status === 'none') return null;
  if (status === 'pending') return (
    <Tooltip title="Waiting for confirmation">
      <HourglassEmptyIcon sx={{ fontSize: 14, color: 'warning.main' }} />
    </Tooltip>
  );
  if (status === 'accepted') return (
    <Tooltip title="Confirmed ✅">
      <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
    </Tooltip>
  );
  if (status === 'rejected') return (
    <Tooltip title="Rejected ❌">
      <CancelIcon sx={{ fontSize: 14, color: 'error.main' }} />
    </Tooltip>
  );
  return null;
}

export default function RecentTransactions() {
  const { expenses, friends, settings, reloadExpenses } = useApp();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('me');
  const [editPaidFor, setEditPaidFor] = useState('me');

  const today = getTodayDate();
  const todayExpenses = useMemo(
    () => expenses.filter(e => e.date === today).slice(0, 20),
    [expenses, today]
  );
  const activeFriends = friends.filter(f => f.active);

  // NOTE: Sent-notification status syncing (pending → accepted/rejected) is now
  // handled globally in useFirebaseAuth's FirebaseAuthProvider, which watches
  // ALL sent notifications for the lifetime of the app session — not just
  // today's expenses, and not only while this component happens to be mounted.

  const openEdit = (e: Expense) => {
    setEditExpense(e);
    setEditName(e.name);
    setEditAmount(String(e.amount));
    setEditDate(e.date);
    setEditTime(e.time);
    setEditPaidBy(e.paidBy);
    setEditPaidFor(e.paidFor);
  };

  const handleEditPaidByChange = (v: string) => { setEditPaidBy(v); if (v !== 'me') setEditPaidFor('me'); };
  const handleEditPaidForChange = (v: string) => { setEditPaidFor(v); if (v !== 'me') setEditPaidBy('me'); };

  const handleSaveEdit = async () => {
    if (!editExpense) return;
    const amt = parseFloat(editAmount);
    if (!editName.trim() || isNaN(amt) || amt <= 0) return;
    await db.saveExpense({
      ...editExpense,
      name: editName.trim(), amount: amt,
      date: editDate, time: editTime,
      timestamp: new Date(`${editDate}T${editTime}`).getTime(),
      paidBy: editPaidBy, paidFor: editPaidFor,
      updatedAt: Date.now()
    });
    await reloadExpenses();
    setEditExpense(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await db.deleteExpense(deleteId);
    await reloadExpenses();
    setDeleteId(null);
  };

  if (todayExpenses.length === 0) return null;

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
        TODAY'S TRANSACTIONS
      </Typography>
      <List disablePadding sx={{ mt: 0.5 }}>
        {todayExpenses.map((e, idx) => {
          const isPersonal = e.paidFor === 'me';
          return (
            <React.Fragment key={e.id}>
              <ListItem
                disablePadding
                sx={{ py: 1, borderRadius: 2, '&:hover': { backgroundColor: 'action.hover' }, px: 1 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                      <ConfirmationBadge status={e.confirmationStatus ?? 'none'} />
                      <Chip
                        size="small"
                        label={`${getFriendName(e.paidBy, friends)} → ${getFriendName(e.paidFor, friends)}`}
                        sx={{ height: 18, fontSize: '0.65rem', opacity: 0.7 }}
                      />
                    </Box>
                  }
                  secondary={e.time}
                />
                <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    variant="body2" fontWeight={700}
                    sx={{ color: isPersonal ? 'text.primary' : 'text.disabled' }}
                  >
                    {isPersonal ? formatCurrency(e.amount, settings.currency) : `(${formatCurrency(e.amount, settings.currency)})`}
                  </Typography>
                  <IconButton size="small" onClick={() => openEdit(e)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteId(e.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {idx < todayExpenses.length - 1 && <Divider sx={{ opacity: 0.4 }} />}
            </React.Fragment>
          );
        })}
      </List>

      <ConfirmDialog open={Boolean(deleteId)} title="Delete Transaction"
        message="This will permanently delete this transaction."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />

      <Dialog open={Boolean(editExpense)} onClose={() => setEditExpense(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Name" value={editName} onChange={e => setEditName(e.target.value)} fullWidth size="small" />
            <TextField label="Amount" type="number" value={editAmount}
              onChange={e => setEditAmount(e.target.value)} fullWidth size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">{settings.currency}</InputAdornment> }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="Date" type="date" size="small" value={editDate}
                onChange={e => setEditDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Time" type="time" size="small" value={editTime}
                onChange={e => setEditTime(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <TextField label="Paid By" select size="small" value={editPaidBy}
                onChange={e => handleEditPaidByChange(e.target.value)} disabled={editPaidFor !== 'me'} fullWidth>
                <MenuItem value="me">Me</MenuItem>
                {activeFriends.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
              </TextField>
              <TextField label="Paid For" select size="small" value={editPaidFor}
                onChange={e => handleEditPaidForChange(e.target.value)} disabled={editPaidBy !== 'me'} fullWidth>
                <MenuItem value="me">Me</MenuItem>
                {activeFriends.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setEditExpense(null)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
