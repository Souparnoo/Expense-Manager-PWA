import React, { useState, useMemo } from 'react';
import {
  Box, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Collapse, Divider, Chip,
  ListItemButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useApp } from '../hooks/useApp';
import * as db from '../db';
import { generateId, formatCurrency, formatDateLong, getFriendName } from '../utils';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import PageHeader from '../components/common/PageHeader';
import type { Category } from '../types';

const PRESET_COLORS = [
  '#E53935','#F4511E','#FB8C00','#F9A825','#43A047',
  '#00897B','#039BE5','#1E88E5','#3949AB','#8E24AA',
  '#D81B60','#757575','#1565C0','#2E7D32','#AD1457',
];

const PRESET_ICONS = [
  '🍔','🚌','🛍️','🏠','💊','📚','🎬','💡','📦','✈️',
  '🏋️','🎮','🍕','☕','🎵','💄','🐾','🏥','⛽','📱',
];

// Shared category form — used both here and in CategorySelector's quick-add
export function CategoryForm({
  editing,
  nameInput, setNameInput,
  iconInput, setIconInput,
  colorInput, setColorInput,
}: {
  editing: Category | null;
  nameInput: string; setNameInput: (v: string) => void;
  iconInput: string; setIconInput: (v: string) => void;
  colorInput: string; setColorInput: (v: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField
        label="Name" value={nameInput}
        onChange={e => setNameInput(e.target.value)}
        fullWidth size="small" autoFocus
      />

      {/* Icon picker */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
          ICON
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {PRESET_ICONS.map(icon => (
            <Box key={icon} onClick={() => setIconInput(icon)}
              sx={{
                width: 36, height: 36, borderRadius: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', cursor: 'pointer', border: '2px solid',
                borderColor: iconInput === icon ? 'primary.main' : 'transparent',
                backgroundColor: iconInput === icon ? 'primary.main22' : 'action.hover',
                transition: 'all 0.1s',
                '&:hover': { backgroundColor: 'action.selected' }
              }}
            >
              {icon}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Color picker */}
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
          COLOR
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {PRESET_COLORS.map(color => (
            <Box key={color} onClick={() => setColorInput(color)}
              sx={{
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: color, cursor: 'pointer',
                border: '3px solid',
                borderColor: colorInput === color ? 'background.paper' : color,
                boxShadow: colorInput === color ? `0 0 0 2px ${color}` : 'none',
                transition: 'all 0.1s',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Preview */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, backgroundColor: 'action.hover' }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          backgroundColor: `${colorInput}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
        }}>
          {iconInput}
        </Box>
        <Typography fontWeight={600} sx={{ color: colorInput }}>
          {nameInput || 'Preview'}
        </Typography>
      </Box>
    </Box>
  );
}

export default function CategoriesPage() {
  const { categories, expenses, friends, settings, reloadCategories } = useApp();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#1565C0');
  const [iconInput, setIconInput] = useState('📦');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Per-category stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    for (const e of expenses.filter(e => e.paidFor === 'me')) {
      const cid = e.categoryId || 'other';
      if (!stats[cid]) stats[cid] = { total: 0, count: 0 };
      stats[cid].total += e.amount;
      stats[cid].count += 1;
    }
    return stats;
  }, [expenses]);

  // Per-category transaction history (sorted newest first)
  const categoryExpenses = useMemo(() => {
    const map: Record<string, typeof expenses> = {};
    for (const cat of categories) {
      map[cat.id] = expenses
        .filter(e => (e.categoryId || 'other') === cat.id)
        .sort((a, b) => b.timestamp - a.timestamp);
    }
    return map;
  }, [expenses, categories]);

  const openAdd = () => {
    setEditing(null);
    setNameInput('');
    setColorInput('#1565C0');
    setIconInput('📦');
    setOpen(true);
  };

  const openEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(cat);
    setNameInput(cat.name);
    setColorInput(cat.color);
    setIconInput(cat.icon);
    setOpen(true);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    if (!name) return;
    await db.saveCategory({
      id: editing?.id || generateId(),
      name,
      icon: iconInput,
      color: colorInput,
      createdAt: editing?.createdAt || Date.now(),
      isDefault: editing?.isDefault,
    });
    await reloadCategories();
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await db.deleteCategory(deleteId);
    await reloadCategories();
    setDeleteId(null);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Categories" subtitle={`${categories.length} categories`} />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10 }}>
        {categories.length === 0 ? (
          <EmptyState
            icon={<CategoryIcon />}
            title="No Categories"
            subtitle="Add categories to organise your expenses."
            action={<Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Category</Button>}
          />
        ) : (
          <List sx={{ px: 1 }}>
            {categories.map(cat => {
              const stats = categoryStats[cat.id] || { total: 0, count: 0 };
              const txns = categoryExpenses[cat.id] || [];
              const isExpanded = expandedId === cat.id;

              return (
                <Box key={cat.id} sx={{ mb: 1 }}>
                  {/* Category row — clickable to expand */}
                  <ListItemButton
                    onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: isExpanded ? `${cat.color}18` : 'action.hover',
                      border: '1px solid',
                      borderColor: isExpanded ? `${cat.color}44` : 'transparent',
                      '&:hover': { backgroundColor: `${cat.color}18` }
                    }}
                  >
                    {/* Icon */}
                    <Box sx={{
                      width: 42, height: 42, borderRadius: 2,
                      backgroundColor: `${cat.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', mr: 1.5, flexShrink: 0
                    }}>
                      {cat.icon}
                    </Box>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={700} sx={{ color: isExpanded ? cat.color : 'text.primary' }}>
                            {cat.name}
                          </Typography>
                          {cat.isDefault && (
                            <Chip label="default" size="small" sx={{ height: 18, fontSize: '0.65rem', opacity: 0.5 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary">
                            {stats.count} transactions
                          </Typography>
                          <Typography variant="caption" fontWeight={700} sx={{ color: cat.color }}>
                            {formatCurrency(stats.total, settings.currency)}
                          </Typography>
                        </Box>
                      }
                    />

                    {/* Actions + expand */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={e => openEdit(cat, e)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error"
                        onClick={e => { e.stopPropagation(); setDeleteId(cat.id); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </Box>
                  </ListItemButton>

                  {/* Expanded: transaction history */}
                  <Collapse in={isExpanded}>
                    <Box sx={{
                      mt: 0.5, ml: 1, mr: 0.5, p: 1.5,
                      borderRadius: 2,
                      backgroundColor: 'action.hover',
                      border: '1px solid', borderColor: 'divider'
                    }}>
                      {/* Summary */}
                      <Box sx={{ display: 'flex', gap: 3, mb: 1.5 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                            TOTAL SPENT
                          </Typography>
                          <Typography variant="h6" fontWeight={800} sx={{ color: cat.color }}>
                            {formatCurrency(stats.total, settings.currency)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
                            TRANSACTIONS
                          </Typography>
                          <Typography variant="h6" fontWeight={800}>
                            {stats.count}
                          </Typography>
                        </Box>
                      </Box>

                      {txns.length === 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5, py: 1 }}>
                          <ReceiptIcon fontSize="small" />
                          <Typography variant="body2">No transactions yet</Typography>
                        </Box>
                      ) : (
                        <>
                          <Divider sx={{ mb: 1, opacity: 0.4 }} />
                          <Typography variant="caption" fontWeight={600} color="text.secondary"
                            sx={{ letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>
                            HISTORY
                          </Typography>
                          {txns.slice(0, 20).map((e, idx) => (
                            <React.Fragment key={e.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap>{e.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDateLong(e.date)} · {e.time} · {getFriendName(e.paidBy, friends)} → {getFriendName(e.paidFor, friends)}
                                  </Typography>
                                </Box>
                                <Typography
                                  variant="body2" fontWeight={700}
                                  sx={{ ml: 1, color: e.paidFor === 'me' ? 'text.primary' : 'text.disabled', flexShrink: 0 }}
                                >
                                  {formatCurrency(e.amount, settings.currency)}
                                </Typography>
                              </Box>
                              {idx < Math.min(txns.length, 20) - 1 && (
                                <Divider sx={{ opacity: 0.2 }} />
                              )}
                            </React.Fragment>
                          ))}
                          {txns.length > 20 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                              + {txns.length - 20} more — use History page to see all
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </List>
        )}
      </Box>

      <Fab color="primary" onClick={openAdd} sx={{ position: 'fixed', bottom: 80, right: 20 }}>
        <AddIcon />
      </Fab>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          <CategoryForm
            editing={editing}
            nameInput={nameInput} setNameInput={setNameInput}
            iconInput={iconInput} setIconInput={setIconInput}
            colorInput={colorInput} setColorInput={setColorInput}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">{editing ? 'Save' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Category"
        message="Expenses in this category will show as 'Other'. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
