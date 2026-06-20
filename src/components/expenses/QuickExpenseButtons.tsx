import React, { useState, useRef } from 'react';
import { Box, Chip, Typography, IconButton, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import { useApp } from '../../hooks/useApp';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import * as db from '../../db';
import { generateId } from '../../utils';
import { sendPaymentNotification } from '../../utils/notifications';
import type { Expense, NotificationDirection } from '../../types';

interface Props { onManage: () => void; }

const INITIAL_CATEGORY = 'other';

export default function QuickExpenseButtons({ onManage }: Props) {
  const {
    quickExpenses, categories, friends,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor,
    selectedCategoryId, reloadExpenses
  } = useApp();
  const { firebaseUser, refreshSentWatchers } = useFirebaseAuth();

  const [toast, setToast] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const getCat = (id: string) => categories.find(c => c.id === id);

  // Alphabetical order on the home page (storage order is by createdAt — keep
  // that for the management page, but Home should be easy to scan A→Z)
  const sortedQuickExpenses = [...quickExpenses].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  const handleClick = async (qe: { id: string; name: string; amount: number; categoryId: string }) => {
    if (didLongPress.current) return;
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
      confirmationStatus: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const catName = getCat(resolvedCategoryId)?.name ?? 'Other';

    // Determine notification direction (covers BOTH Me→Friend and Friend→Me)
    let notifyFriendId: string | null = null;
    let direction: NotificationDirection | null = null;

    if (selectedPaidBy === 'me' && selectedPaidFor !== 'me') {
      notifyFriendId = selectedPaidFor;
      direction = 'i_paid_for_you';
    } else if (selectedPaidBy !== 'me' && selectedPaidFor === 'me') {
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
          setToast(`${qe.name} ₹${qe.amount} → ${catName} · Sent to ${friend.name}`);
        } else {
          setToast(`${qe.name} ₹${qe.amount} → ${catName} (${friend.name} not on app yet)`);
        }
        return;
      }
    }

    await db.saveExpense(expense);
    await reloadExpenses();
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

  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

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

      {sortedQuickExpenses.length === 0 ? (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 0.5 }}>
          Tap + to add quick expenses
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {sortedQuickExpenses.map(qe => {
            const cat = getCat(qe.categoryId || 'other');
            return (
              <Chip
                key={qe.id}
                label={`${cat?.icon ?? '📦'} ${qe.name} ₹${qe.amount}`}
                onClick={() => handleClick(qe)}
                onTouchStart={e => handleTouchStart(e, qe.id)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={e => handleContextMenu(e, qe.id)}
                variant="outlined" size="medium"
                sx={{
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: cat?.color ?? 'divider',
                  '&:hover': { backgroundColor: cat ? `${cat.color}22` : 'action.selected', borderColor: cat?.color, color: cat?.color },
                  '&:active': { transform: 'scale(0.96)' }
                }}
              />
            );
          })}
        </Box>
      )}

      <Menu open={Boolean(menuAnchor && menuItem)} anchorEl={menuAnchor}
        onClose={() => { setMenuAnchor(null); setMenuItem(null); }}>
        <MenuItem onClick={() => { onManage(); setMenuAnchor(null); }}>Edit</MenuItem>
        <MenuItem onClick={() => { onManage(); setMenuAnchor(null); }}>Delete</MenuItem>
      </Menu>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
