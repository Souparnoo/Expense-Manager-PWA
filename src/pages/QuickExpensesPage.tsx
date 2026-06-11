import React, { useState, useRef } from 'react';
import {
  Box, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, InputAdornment, Typography, Menu, MenuItem, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';
import { useApp } from '../hooks/useApp';
import * as db from '../db';
import { generateId, formatCurrency } from '../utils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import type { QuickExpense } from '../types';

interface Props {
  onBack: () => void;
}

export default function QuickExpensesPage({ onBack }: Props) {
  const { quickExpenses, categories, settings, reloadQuickExpenses } = useApp();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuickExpense | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('other');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTarget, setMenuTarget] = useState<QuickExpense | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const openAdd = () => {
    setEditing(null);
    setNameInput('');
    setAmountInput('');
    setCategoryInput('other');
    setOpen(true);
  };

  const openEdit = (qe: QuickExpense) => {
    setEditing(qe);
    setNameInput(qe.name);
    setAmountInput(String(qe.amount));
    setCategoryInput(qe.categoryId || 'other');
    setOpen(true);
    setMenuAnchor(null);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    const amount = parseFloat(amountInput);
    if (!name || isNaN(amount) || amount <= 0) return;

    const qe: QuickExpense = {
      id: editing?.id || generateId(),
      name,
      amount,
      categoryId: categoryInput,
      createdAt: editing?.createdAt || Date.now()
    };
    await db.saveQuickExpense(qe);
    await reloadQuickExpenses();
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await db.deleteQuickExpense(deleteId);
    await reloadQuickExpenses();
    setDeleteId(null);
    setMenuAnchor(null);
  };

  const handleLongPress = (e: React.TouchEvent, qe: QuickExpense) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setMenuTarget(qe);
      setMenuAnchor(e.touches[0].target as HTMLElement);
    }, 600);
  };

  const getCat = (id: string) => categories.find(c => c.id === id) ?? categories.find(c => c.id === 'other');

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Quick Expenses" onBack={onBack} />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        {quickExpenses.length === 0 ? (
          <EmptyState
            icon={<BoltIcon />}
            title="No Quick Expenses"
            subtitle="Create shortcuts for frequent expenses like Tea, Bus, Lunch."
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
                Add Quick Expense
              </Button>
            }
          />
        ) : (
          <List sx={{ px: 1 }}>
            {quickExpenses.map(qe => {
              const cat = getCat(qe.categoryId || 'other');
              return (
                <ListItem
                  key={qe.id}
                  sx={{ borderRadius: 2, mb: 0.5, '&:hover': { backgroundColor: 'action.hover' } }}
                  onTouchStart={e => handleLongPress(e, qe)}
                  onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                  onContextMenu={e => { e.preventDefault(); setMenuTarget(qe); setMenuAnchor(e.currentTarget as HTMLElement); }}
                >
                  {/* Category icon badge */}
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    backgroundColor: `${cat?.color ?? '#757575'}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem', mr: 1.5, flexShrink: 0
                  }}>
                    {cat?.icon ?? '📦'}
                  </Box>
                  <ListItemText
                    primary={<Typography fontWeight={600}>{qe.name}</Typography>}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography variant="caption" fontWeight={700}>
                          {formatCurrency(qe.amount, settings.currency)}
                        </Typography>
                        <Chip
                          size="small"
                          label={cat?.name ?? 'Other'}
                          sx={{
                            height: 18, fontSize: '0.65rem',
                            backgroundColor: `${cat?.color ?? '#757575'}22`,
                            color: cat?.color ?? '#757575',
                          }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => openEdit(qe)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteId(qe.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      <Fab color="primary" onClick={openAdd} sx={{ position: 'fixed', bottom: 80, right: 20 }}>
        <AddIcon />
      </Fab>

      <Menu
        open={Boolean(menuAnchor && menuTarget)}
        anchorEl={menuAnchor}
        onClose={() => { setMenuAnchor(null); setMenuTarget(null); }}
      >
        <MenuItem onClick={() => menuTarget && openEdit(menuTarget)}>Edit</MenuItem>
        <MenuItem sx={{ color: 'error.main' }}
          onClick={() => { if (menuTarget) setDeleteId(menuTarget.id); setMenuAnchor(null); }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Quick Expense' : 'Add Quick Expense'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name" value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="e.g. Tea, Bus, Lunch"
              fullWidth size="small" autoFocus
            />
            <TextField
              label="Amount" type="number" value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              fullWidth size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">{settings.currency}</InputAdornment> }}
              inputProps={{ min: 0, step: '1' }}
            />
            {/* Category selector */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600}
                sx={{ mb: 0.75, display: 'block', letterSpacing: '0.06em' }}>
                DEFAULT CATEGORY
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {categories.map(cat => {
                  const sel = categoryInput === cat.id;
                  return (
                    <Chip
                      key={cat.id}
                      label={`${cat.icon} ${cat.name}`}
                      onClick={() => setCategoryInput(cat.id)}
                      size="small"
                      sx={{
                        fontWeight: 600, cursor: 'pointer',
                        border: '2px solid',
                        borderColor: sel ? cat.color : 'transparent',
                        backgroundColor: sel ? `${cat.color}22` : 'action.hover',
                        color: sel ? cat.color : 'text.secondary',
                        transition: 'all 0.1s',
                        '&:hover': { backgroundColor: `${cat.color}22`, borderColor: cat.color, color: cat.color },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editing ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Quick Expense"
        message="This will delete the shortcut. Historical transactions are not affected."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
