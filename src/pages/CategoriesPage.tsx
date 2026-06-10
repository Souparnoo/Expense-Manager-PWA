import React, { useState } from 'react';
import {
  Box, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Fab, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import { useApp } from '../hooks/useApp';
import * as db from '../db';
import { generateId } from '../utils';
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

interface Props {
  onBack: () => void;
}

export default function CategoriesPage({ onBack }: Props) {
  const { categories, reloadCategories } = useApp();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#1565C0');
  const [iconInput, setIconInput] = useState('📦');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setNameInput('');
    setColorInput('#1565C0');
    setIconInput('📦');
    setOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setNameInput(cat.name);
    setColorInput(cat.color);
    setIconInput(cat.icon);
    setOpen(true);
  };

  const handleSave = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const cat: Category = {
      id: editing?.id || generateId(),
      name,
      icon: iconInput,
      color: colorInput,
      createdAt: editing?.createdAt || Date.now(),
      isDefault: editing?.isDefault,
    };
    await db.saveCategory(cat);
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
      <PageHeader title="Categories" subtitle={`${categories.length} categories`} onBack={onBack} />

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
            {categories.map(cat => (
              <ListItem
                key={cat.id}
                sx={{ borderRadius: 2, mb: 0.5, '&:hover': { backgroundColor: 'action.hover' } }}
              >
                <Box sx={{
                  width: 38, height: 38, borderRadius: 2,
                  backgroundColor: `${cat.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mr: 1.5, fontSize: '1.3rem', flexShrink: 0
                }}>
                  {cat.icon}
                </Box>
                <ListItemText
                  primary={<Typography fontWeight={600}>{cat.name}</Typography>}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: cat.color }} />
                      <Typography variant="caption" color="text.secondary">{cat.color}</Typography>
                      {cat.isDefault && (
                        <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>· default</Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => openEdit(cat)} sx={{ mr: 0.5 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {!cat.isDefault && (
                    <IconButton size="small" color="error" onClick={() => setDeleteId(cat.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Name" value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              fullWidth size="small" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />

            {/* Icon picker */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                ICON
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {PRESET_ICONS.map(icon => (
                  <Box
                    key={icon}
                    onClick={() => setIconInput(icon)}
                    sx={{
                      width: 36, height: 36, borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.3rem', cursor: 'pointer',
                      border: '2px solid',
                      borderColor: iconInput === icon ? 'primary.main' : 'transparent',
                      backgroundColor: iconInput === icon ? 'primary.main' + '22' : 'action.hover',
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
                  <Box
                    key={color}
                    onClick={() => setColorInput(color)}
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
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem'
              }}>
                {iconInput}
              </Box>
              <Typography fontWeight={600} sx={{ color: colorInput }}>
                {nameInput || 'Preview'}
              </Typography>
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
        title="Delete Category"
        message="Existing expenses using this category will show as 'Other'. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
