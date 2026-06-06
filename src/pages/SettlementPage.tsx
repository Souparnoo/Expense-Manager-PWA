import React, { useState, useMemo } from 'react';
import {
  Box, List, ListItem, ListItemText, Card, CardContent,
  Typography, Button, Chip, Collapse, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HandshakeIcon from '@mui/icons-material/Handshake';
import { useApp } from '../hooks/useApp';
import {
  formatCurrency, calcFriendBalances, formatDateLong,
  getTodayDate, getCurrentTime, getFriendName
} from '../utils';
import { generateId } from '../utils';
import * as db from '../db';
import type { Settlement } from '../types';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

export default function SettlementPage() {
  const { friends, expenses, settlements, settings, reloadSettlements } = useApp();

  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [settleDialog, setSettleDialog] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleDirection, setSettleDirection] = useState<'friend_paid_me' | 'i_paid_friend'>('friend_paid_me');
  const [deleteSettlementId, setDeleteSettlementId] = useState<string | null>(null);

  const balances = useMemo(
    () => calcFriendBalances(expenses, settlements, friends),
    [expenses, settlements, friends]
  );

  const handleSettle = async () => {
    if (!settleDialog) return;
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) return;

    const s: Settlement = {
      id: generateId(),
      date: getTodayDate(),
      time: getCurrentTime(),
      timestamp: Date.now(),
      friendId: settleDialog,
      // positive = friend paid me (reduces what I owe), negative = I paid friend
      amount: settleDirection === 'friend_paid_me' ? amt : -amt,
      note: settleNote.trim() || 'Settlement',
      createdAt: Date.now()
    };

    await db.saveSettlement(s);
    await reloadSettlements();
    setSettleDialog(null);
    setSettleAmount('');
    setSettleNote('');
  };

  const handleDeleteSettlement = async () => {
    if (!deleteSettlementId) return;
    await db.deleteSettlement(deleteSettlementId);
    await reloadSettlements();
    setDeleteSettlementId(null);
  };

  if (friends.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Settlements" />
        <EmptyState
          icon={<HandshakeIcon />}
          title="No Friends Yet"
          subtitle="Add friends to track settlements."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Settlements" subtitle="Track who owes whom" />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 1 }}>
        {balances.map(({ friend, net }) => {
          const friendSettlements = settlements.filter(s => s.friendId === friend.id);
          const isExpanded = expandedFriend === friend.id;
          const isNeutral = Math.abs(net) < 0.01;

          return (
            <Box key={friend.id} sx={{ mb: 1.5 }}>
              <Card>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography fontWeight={700} variant="h6">{friend.name}</Typography>
                      {isNeutral ? (
                        <Chip size="small" label="Settled up ✓" color="success" sx={{ mt: 0.5 }} />
                      ) : net > 0 ? (
                        <Chip
                          size="small"
                          label={`You owe ${friend.name} ${formatCurrency(net, settings.currency)}`}
                          color="warning"
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label={`${friend.name} owes you ${formatCurrency(Math.abs(net), settings.currency)}`}
                          color="info"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setSettleDialog(friend.id);
                          setSettleDirection(net > 0 ? 'friend_paid_me' : 'i_paid_friend');
                          setSettleAmount('');
                          setSettleNote('');
                        }}
                      >
                        Settle
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedFriend(isExpanded ? null : friend.id)}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
                      BREAKDOWN
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {expenses
                        .filter(e => e.paidBy === friend.id || e.paidFor === friend.id)
                        .map(e => {
                          const isIOweFriend = e.paidBy === friend.id && e.paidFor === 'me';
                          return (
                            <Box key={e.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatDateLong(e.date)} · {e.name}
                              </Typography>
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                color={isIOweFriend ? 'warning.main' : 'info.main'}
                              >
                                {isIOweFriend ? '+' : '-'}{formatCurrency(e.amount, settings.currency)}
                              </Typography>
                            </Box>
                          );
                        })}

                      {friendSettlements.length > 0 && (
                        <>
                          <Divider sx={{ my: 0.5, opacity: 0.4 }} />
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>SETTLEMENTS</Typography>
                          {friendSettlements.map(s => (
                            <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.25 }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatDateLong(s.date)} · {s.note}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  color={s.amount > 0 ? 'success.main' : 'error.main'}
                                >
                                  {s.amount > 0 ? '+' : ''}{formatCurrency(s.amount, settings.currency)}
                                </Typography>
                                <IconButton size="small" color="error" onClick={() => setDeleteSettlementId(s.id)}>
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* Settle Dialog */}
      <Dialog open={Boolean(settleDialog)} onClose={() => setSettleDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record Settlement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant={settleDirection === 'friend_paid_me' ? 'contained' : 'outlined'}
                onClick={() => setSettleDirection('friend_paid_me')}
                size="small"
              >
                {friends.find(f => f.id === settleDialog)?.name} paid me
              </Button>
              <Button
                fullWidth
                variant={settleDirection === 'i_paid_friend' ? 'contained' : 'outlined'}
                onClick={() => setSettleDirection('i_paid_friend')}
                size="small"
              >
                I paid {friends.find(f => f.id === settleDialog)?.name}
              </Button>
            </Box>
            <TextField
              label="Amount"
              type="number"
              value={settleAmount}
              onChange={e => setSettleAmount(e.target.value)}
              fullWidth size="small"
              InputProps={{ startAdornment: <InputAdornment position="start">{settings.currency}</InputAdornment> }}
              inputProps={{ min: 0, step: '1' }}
            />
            <TextField
              label="Note (optional)"
              value={settleNote}
              onChange={e => setSettleNote(e.target.value)}
              fullWidth size="small"
              placeholder="e.g. GPay, Cash"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setSettleDialog(null)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSettle} variant="contained" color="success">Record</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteSettlementId)}
        title="Delete Settlement"
        message="This will remove this settlement record."
        onConfirm={handleDeleteSettlement}
        onCancel={() => setDeleteSettlementId(null)}
      />
    </Box>
  );
}
