import React, { useState, useMemo } from 'react';
import {
  Box, Typography, TextField, InputAdornment, MenuItem,
  Card, CardContent, Collapse, List, ListItem, ListItemText,
  Chip, Divider, IconButton, ListItemButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useApp } from '../hooks/useApp';
import { formatCurrency, formatDateLong, groupExpensesByDate, getFriendName } from '../utils';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';

export default function FriendHistoryPage() {
  const { expenses, settlements, friends, settings } = useApp();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<string>('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const filteredFriends = useMemo(() => {
    if (!search.trim()) return friends;
    const q = search.toLowerCase();
    return friends.filter(f => f.name.toLowerCase().includes(q));
  }, [friends, search]);

  // Build date-wise transactions for friend view
  const dateWiseData = useMemo(() => {
    // Combine expenses involving friends + settlements
    type FriendTx = {
      date: string;
      time: string;
      timestamp: number;
      id: string;
      friendId: string;
      friendName: string;
      expenseName: string;
      amount: number;
      type: 'FRIEND_OWES_ME' | 'I_OWE_FRIEND' | 'SETTLEMENT';
    };

    const txs: FriendTx[] = [];

    for (const e of expenses) {
      if (e.paidBy === 'me' && e.paidFor !== 'me') {
        const f = friends.find(f => f.id === e.paidFor);
        if (!f) continue;
        if (selectedFriend !== 'all' && f.id !== selectedFriend) continue;
        if (startDate && e.date < startDate) continue;
        if (endDate && e.date > endDate) continue;
        txs.push({
          date: e.date, time: e.time, timestamp: e.timestamp,
          id: e.id, friendId: f.id, friendName: f.name,
          expenseName: e.name, amount: e.amount,
          type: 'FRIEND_OWES_ME'
        });
      } else if (e.paidBy !== 'me' && e.paidFor === 'me') {
        const f = friends.find(f => f.id === e.paidBy);
        if (!f) continue;
        if (selectedFriend !== 'all' && f.id !== selectedFriend) continue;
        if (startDate && e.date < startDate) continue;
        if (endDate && e.date > endDate) continue;
        txs.push({
          date: e.date, time: e.time, timestamp: e.timestamp,
          id: e.id, friendId: f.id, friendName: f.name,
          expenseName: e.name, amount: e.amount,
          type: 'I_OWE_FRIEND'
        });
      }
    }

    for (const s of settlements) {
      const f = friends.find(f => f.id === s.friendId);
      if (!f) continue;
      if (selectedFriend !== 'all' && f.id !== selectedFriend) continue;
      if (startDate && s.date < startDate) continue;
      if (endDate && s.date > endDate) continue;
      txs.push({
        date: s.date, time: s.time, timestamp: s.timestamp,
        id: s.id, friendId: f.id, friendName: f.name,
        expenseName: s.note || 'Settlement',
        amount: s.amount,
        type: 'SETTLEMENT'
      });
    }

    // Group by date
    const groups: Record<string, typeof txs> = {};
    for (const tx of txs) {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    }

    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return { dates, groups };
  }, [expenses, settlements, friends, selectedFriend, startDate, endDate]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Friend History" subtitle="Date-wise friend transactions" />

      {/* Filters */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField
            placeholder="Search friend..."
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            fullWidth
          />
          <TextField
            label="Friend" select size="small"
            value={selectedFriend} onChange={e => setSelectedFriend(e.target.value)}
            fullWidth
          >
            <MenuItem value="all">All Friends</MenuItem>
            {friends.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
          </TextField>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <TextField label="From" type="date" size="small"
            value={startDate} onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="To" type="date" size="small"
            value={endDate} onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }} fullWidth />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        {dateWiseData.dates.length === 0 ? (
          <EmptyState
            icon={<PeopleAltIcon />}
            title="No Friend Transactions"
            subtitle="Transactions involving friends will appear here."
          />
        ) : (
          <Box sx={{ px: 1 }}>
            {dateWiseData.dates.map(date => {
              const txs = dateWiseData.groups[date];
              const isExpanded = expandedDate === date;

              // Calculate net for this day (positive = I owe, negative = friend owes)
              const dayNet = txs.reduce((sum, tx) => {
                if (tx.type === 'I_OWE_FRIEND') return sum + tx.amount;
                if (tx.type === 'FRIEND_OWES_ME') return sum - tx.amount;
                return sum + tx.amount; // settlements
              }, 0);

              return (
                <Box key={date} sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => setExpandedDate(isExpanded ? null : date)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: 'action.selected',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600}>{formatDateLong(date)}</Typography>
                      <Typography variant="caption" color="text.secondary">{txs.length} transactions</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {Math.abs(dayNet) > 0.01 && (
                        <Chip
                          size="small"
                          label={dayNet > 0
                            ? `You owe ${formatCurrency(dayNet, settings.currency)}`
                            : `You get ${formatCurrency(Math.abs(dayNet), settings.currency)}`
                          }
                          color={dayNet > 0 ? 'warning' : 'info'}
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                  </ListItemButton>

                  <Collapse in={isExpanded}>
                    <List disablePadding sx={{ pl: 1, mt: 0.5 }}>
                      {txs.sort((a, b) => b.timestamp - a.timestamp).map((tx, idx) => (
                        <React.Fragment key={tx.id}>
                          <ListItem sx={{ borderRadius: 2, pl: 1 }}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" fontWeight={600}>{tx.expenseName}</Typography>
                                  <Chip
                                    size="small"
                                    label={tx.friendName}
                                    color={tx.type === 'FRIEND_OWES_ME' ? 'info' : tx.type === 'I_OWE_FRIEND' ? 'warning' : 'default'}
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                  <Chip
                                    size="small"
                                    label={tx.type === 'SETTLEMENT' ? 'SETTLEMENT' : tx.type.replace(/_/g, ' ')}
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                  />
                                </Box>
                              }
                              secondary={tx.time}
                            />
                            <Typography
                              variant="body2" fontWeight={700}
                              color={
                                tx.type === 'FRIEND_OWES_ME' ? 'info.main' :
                                tx.type === 'I_OWE_FRIEND' ? 'warning.main' : 'text.secondary'
                              }
                            >
                              {formatCurrency(Math.abs(tx.amount), settings.currency)}
                            </Typography>
                          </ListItem>
                          {idx < txs.length - 1 && <Divider sx={{ opacity: 0.3 }} />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
