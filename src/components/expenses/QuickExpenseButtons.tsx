import React, { useState, useRef } from 'react';
import { Box, Chip, Typography, IconButton, Menu, MenuItem, Snackbar, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import { useApp } from '../../hooks/useApp';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';
import { useTour } from '../../hooks/useTour';
import * as db from '../../db';
import { generateId } from '../../utils';
import { sendPaymentNotification } from '../../utils/notifications';
import { scheduleAutoBackup } from '../../utils/autoBackup';
import type { Expense, NotificationDirection } from '../../types';

interface Props { onManage: () => void; }

const INITIAL_CATEGORY = 'other';

export default function QuickExpenseButtons({ onManage }: Props) {
  const {
    quickExpenses, categories, friends,
    selectedDate, selectedTime, selectedPaidBy, selectedPaidFor, selectedPaidForMulti,
    selectedCategoryId, settings, reloadExpenses
  } = useApp();
  const { firebaseUser, refreshSentWatchers } = useFirebaseAuth();
  const { onQuickChipTapped, onQEFabTapped, phase, captured } = useTour();

  const [toast, setToast] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const getCat = (id: string) => categories.find(c => c.id === id);

  const sortedQuickExpenses = [...quickExpenses].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  // One expense for a single paidBy/paidFor pair — shared by single and
  // multi-select fan-out paths, including the notification flow.
  const createOneExpense = async (
    expenseName: string, amt: number, categoryId: string,
    paidBy: string, paidFor: string
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
      categoryId,
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

  const handleClick = async (qe: { id: string; name: string; amount: number; categoryId: string }) => {
    if (didLongPress.current) return;
    const userChangedCategory = selectedCategoryId !== INITIAL_CATEGORY;
    const resolvedCategoryId = userChangedCategory ? selectedCategoryId : (qe.categoryId || 'other');
    const catName = getCat(resolvedCategoryId)?.name ?? 'Other';
    const isMulti = selectedPaidForMulti.length > 1;

    if (isMulti) {
      const sentNames: string[] = [];
      const skippedNames: string[] = [];

      for (const friendId of selectedPaidForMulti) {
        const result = await createOneExpense(qe.name, qe.amount, resolvedCategoryId, 'me', friendId);
        if (result.sentTo) sentNames.push(result.sentTo);
        if (result.notNotified) skippedNames.push(result.notNotified);
      }

      await reloadExpenses();
      scheduleAutoBackup(settings);
      if (sentNames.length > 0) refreshSentWatchers();

      let msg = `${qe.name} ₹${qe.amount} → ${catName} added for ${selectedPaidForMulti.length} people!`;
      if (sentNames.length > 0) msg += ` Notified: ${sentNames.join(', ')}.`;
      setToast(msg);
      return;
    }

    const result = await createOneExpense(qe.name, qe.amount, resolvedCategoryId, selectedPaidBy, selectedPaidFor);
    await reloadExpenses();
    scheduleAutoBackup(settings);

    if (result.sentTo) {
      refreshSentWatchers();
      setToast(`${qe.name} ₹${qe.amount} → ${catName} · Sent to ${result.sentTo}`);
    } else if (result.notNotified) {
      setToast(`${qe.name} ₹${qe.amount} → ${catName} (${result.notNotified} not on app yet)`);
    } else {
      setToast(`${qe.name} ₹${qe.amount} → ${catName}`);
    }
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
        <IconButton size="small" data-tour="qe-fab"
          onClick={() => { if (phase === 'p2-quick-fab') onQEFabTapped(); onManage(); }}
          sx={{ opacity: 0.6 }}>
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
            const isTourTarget = phase === 'p5-quick-chip' && qe.name === captured.qeName;
            return (
              <Chip
                key={qe.id}
                data-tour={isTourTarget ? 'quick-chip-active' : undefined}
                label={`${cat?.icon ?? '📦'} ${qe.name} ₹${qe.amount}`}
                onClick={() => { if (isTourTarget) onQuickChipTapped(); handleClick(qe); }}
                onTouchStart={e => handleTouchStart(e, qe.id)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={e => handleContextMenu(e, qe.id)}
                variant="outlined" size="medium"
                sx={{
                  fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: isTourTarget ? 'warning.main' : (cat?.color ?? 'divider'),
                  boxShadow: isTourTarget ? '0 0 0 2px rgba(245,124,0,0.3)' : undefined,
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

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 3 }}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}