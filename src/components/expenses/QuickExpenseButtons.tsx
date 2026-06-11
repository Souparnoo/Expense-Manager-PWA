import React, { useState, useRef } from 'react';
import { Box, Chip, Typography, IconButton, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import { useApp } from '../../hooks/useApp';
import * as db from '../../db';
import { generateId } from '../../utils';
import type { Expense } from '../../types';

interface Props {
  onManage: () => void;
}

// Default category id on first load — used to detect "user hasn't changed category"
const INITIAL_CATEGORY = 'other';

export default function QuickExpenseButtons({ onManage }: Props) {
  const {
    quickExpenses, categories,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
    selectedCategoryId, reloadExpenses
  } = useApp();

  const [toast, setToast] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const getCat = (id: string) => categories.find(c => c.id === id);

  const handleClick = async (qe: { id: string; name: string; amount: number; categoryId: string }) => {
    if (didLongPress.current) return;

    // Override rule: use selectedCategoryId only if user explicitly picked something
    // other than the default. Otherwise fall back to the quick expense's own category.
    const userChangedCategory = selectedCategoryId !== INITIAL_CATEGORY;
    const resolvedCategoryId = userChangedCategory ? selectedCategoryId : (qe.categoryId || 'other');

    const expense: Expense = {
      id: generateId(),
      date: selectedDate,
      time: selectedTime,
      timestamp: new Date(`${selectedDate}T${selectedTime}`).getTime(),
      name: qe.name,
      amount: qe.amount,
      paidBy: selectedPaidBy,
      paidFor: selectedPaidFor,
      categoryId: resolvedCategoryId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await db.saveExpense(expense);
    await reloadExpenses();

    const catName = getCat(resolvedCategoryId)?.name ?? 'Other';
    setToast(`${qe.name} ₹${qe.amount} → ${catName}`);
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setMenuItem(id);
      setMenuAnchor(e.touches[0].target as HTMLElement);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setMenuItem(id);
    setMenuAnchor(e.currentTarget as HTMLElement);
  };

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
        <BoltIcon fontSize="small" sx={{ color: 'warning.main' }} />
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          QUICK ADD
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onManage} sx={{ opacity: 0.6 }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      {quickExpenses.length === 0 ? (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5 }}>
          Tap + to add quick expenses
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {quickExpenses.map(qe => {
            const cat = getCat(qe.categoryId || 'other');
            return (
              <Chip
                key={qe.id}
                label={`${cat?.icon ?? '📦'} ${qe.name} ₹${qe.amount}`}
                onClick={() => handleClick(qe)}
                onTouchStart={e => handleTouchStart(e, qe.id)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={e => handleContextMenu(e, qe.id)}
                variant="outlined"
                size="medium"
                sx={{
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: cat?.color ?? 'divider',
                  '&:hover': {
                    backgroundColor: cat ? `${cat.color}22` : 'action.selected',
                    borderColor: cat?.color,
                    color: cat?.color,
                  },
                  '&:active': { transform: 'scale(0.96)' }
                }}
              />
            );
          })}
        </Box>
      )}

      <Menu
        open={Boolean(menuAnchor && menuItem)}
        anchorEl={menuAnchor}
        onClose={() => { setMenuAnchor(null); setMenuItem(null); }}
      >
        <MenuItem onClick={() => { onManage(); setMenuAnchor(null); }}>Edit</MenuItem>
        <MenuItem onClick={() => { onManage(); setMenuAnchor(null); }}>Delete</MenuItem>
      </Menu>

      <Snackbar
        open={Boolean(toast)} autoHideDuration={2000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
