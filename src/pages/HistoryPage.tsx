import React, { useState, useMemo } from 'react';
import {
  Box, List, ListItem, ListItemText, ListItemButton,
  Typography, Chip, TextField, InputAdornment, MenuItem,
  Collapse, Divider, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { useApp } from '../hooks/useApp';
import {
  formatDateLong, formatCurrency,
  calcPersonalTotal, groupExpensesByDate, getFriendName
} from '../utils';
import PageHeader from '../components/common/PageHeader';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import * as db from '../db';
import type { Expense } from '../types';

type SortMode = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function HistoryPage() {
  const { expenses, friends, categories, settings, reloadExpenses } = useApp();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('me');
  const [editPaidFor, setEditPaidFor] = useState('me');
  const [editCategoryId, setEditCategoryId] = useState('other');

  const activeFriends = friends.filter(f => f.active);

  const getCategoryById = (id: string) =>
    categories.find(c => c.id === id) ?? categories.find(c => c.id === 'other');

  const filtered = useMemo(() => {
    let result = [...expenses];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => e.name.toLowerCase().includes(q));
    }
    if (startDate) result = result.filter(e => e.date >= startDate);
    if (endDate)   result = result.filter(e => e.date <= endDate);
    if (filterCategory !== 'all') result = result.filter(e => (e.categoryId || 'other') === filterCategory);
    return result;
  }, [expenses, search, startDate, endDate, filterCategory]);

  const grouped = useMemo(() => {
    const g = groupExpensesByDate(filtered);
    const dates = Object.keys(g);
    dates.sort((a, b) => {
      if (sortMode === 'oldest') return a.localeCompare(b);
      if (sortMode === 'newest') return b.localeCompare(a);
      const aT = calcPersonalTotal(g[a]);
      const bT = calcPersonalTotal(g[b]);
      return sortMode === 'highest' ? bT - aT : aT - bT;
    });
    return { dates, groups: g };
  }, [filtered, sortMode]);

  const openEdit = (e: Expense) => {
    setEditExpense(e);
    setEditName(e.name);
    setEditAmount(String(e.amount));
    setEditDate(e.date);
    setEditTime(e.time);
    setEditPaidBy(e.paidBy);
    setEditPaidFor(e.paidFor);
    setEditCategoryId(e.categoryId || 'other');
  };

  const handleEditPaidByChange = (v: string) => {
    setEditPaidBy(v);
    if (v !== 'me') setEditPaidFor('me');
  };
  const handleEditPaidForChange = (v: string) => {
    setEditPaidFor(v);
    if (v !== 'me') setEditPaidBy('me');
  };

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
      categoryId: editCategoryId,
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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="History" subtitle="All personal expenses" />

      {/* Filters */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField
          placeholder="Search expenses..."
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          fullWidth
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField label="From" type="date" size="small" value={startDate}
            onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="To" type="date" size="small" value={endDate}
            onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <TextField label="Category" select size="small" value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)} fullWidth>
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Sort" select size="small" value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)} fullWidth>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
            <MenuItem value="highest">Highest</MenuItem>
            <MenuItem value="lowest">Lowest</MenuItem>
          </TextField>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        {grouped.dates.length === 0 ? (
          <EmptyState icon={<HistoryIcon />} title="No Transactions" subtitle="Your expense history will appear here." />
        ) : (
          <List disablePadding sx={{ px: 1 }}>
            {grouped.dates.map(date => {
              const dayExpenses = grouped.groups[date];
              const dayTotal = calcPersonalTotal(dayExpenses);
              const isExpanded = expandedDate === date;
              return (
                <Box key={date} sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => setExpandedDate(isExpanded ? null : date)}
                    sx={{ borderRadius: 2, backgroundColor: 'action.selected', '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <ListItemText
                      primary={<Typography fontWeight={600}>{formatDateLong(date)}</Typography>}
                      secondary={`${dayExpenses.length} transactions`}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={700} color="primary.main">
                        {formatCurrency(dayTotal, settings.currency)}
                      </Typography>
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Box>
                  </ListItemButton>

                  <Collapse in={isExpanded}>
                    <List disablePadding sx={{ pl: 1, mt: 0.5 }}>
                      {dayExpenses.map((e, idx) => {
                        const cat = getCategoryById(e.categoryId || 'other');
                        return (
                          <React.Fragment key={e.id}>
                            <ListItem sx={{ borderRadius: 2, '&:hover': { backgroundColor: 'action.hover' }, pl: 1 }}>
                              {/* Category icon */}
                              <Box sx={{
                                width: 30, height: 30, borderRadius: 1.5,
                                backgroundColor: `${cat?.color ?? '#757575'}22`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', mr: 1, flexShrink: 0
                              }}>
                                {cat?.icon ?? '📦'}
                              </Box>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                                    <Chip size="small"
                                      label={`${getFriendName(e.paidBy, friends)} → ${getFriendName(e.paidFor, friends)}`}
                                      sx={{ height: 18, fontSize: '0.65rem', opacity: 0.7 }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" color="text.secondary">
                                    {e.time} · <span style={{ color: cat?.color }}>{cat?.name}</span>
                                  </Typography>
                                }
                              />
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="body2" fontWeight={700}
                                  color={e.paidFor === 'me' ? 'text.primary' : 'text.disabled'}>
                                  {formatCurrency(e.amount, settings.currency)}
                                </Typography>
                                <IconButton size="small" onClick={() => openEdit(e)}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteId(e.id)}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Box>
                            </ListItem>
                            {idx < dayExpenses.length - 1 && <Divider sx={{ opacity: 0.3 }} />}
                          </React.Fragment>
                        );
                      })}
                    </List>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}
      </Box>

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
            <TextField label="Category" select size="small" value={editCategoryId}
              onChange={e => setEditCategoryId(e.target.value)} fullWidth>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>)}
            </TextField>
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
