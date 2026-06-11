import React, { useState } from 'react';
import {
  Box, Typography, Chip, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import { useApp } from '../../hooks/useApp';
import { CategoryForm } from '../../pages/CategoriesPage';
import * as db from '../../db';
import { generateId } from '../../utils';

export default function CategorySelector() {
  const { categories, selectedCategoryId, setSelectedCategoryId, reloadCategories } = useApp();

  const [addOpen, setAddOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [colorInput, setColorInput] = useState('#1565C0');
  const [iconInput, setIconInput] = useState('📦');

  const handleSaveNew = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const newId = generateId();
    await db.saveCategory({
      id: newId,
      name,
      icon: iconInput,
      color: colorInput,
      createdAt: Date.now(),
    });
    await reloadCategories();
    setSelectedCategoryId(newId);
    setAddOpen(false);
    setNameInput('');
    setColorInput('#1565C0');
    setIconInput('📦');
  };

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
        <CategoryIcon fontSize="small" sx={{ color: 'secondary.main' }} />
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          CATEGORY
        </Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton
          size="small"
          onClick={() => setAddOpen(true)}
          sx={{ opacity: 0.6 }}
          title="Add new category"
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Category chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {categories.map(cat => {
          const selected = selectedCategoryId === cat.id;
          return (
            <Chip
              key={cat.id}
              label={`${cat.icon} ${cat.name}`}
              onClick={() => setSelectedCategoryId(cat.id)}
              size="medium"
              sx={{
                fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                border: '2px solid',
                borderColor: selected ? cat.color : 'transparent',
                backgroundColor: selected ? `${cat.color}22` : 'action.hover',
                color: selected ? cat.color : 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': { backgroundColor: `${cat.color}22`, borderColor: cat.color, color: cat.color },
                '&:active': { transform: 'scale(0.95)' },
              }}
            />
          );
        })}
      </Box>

      {/* Quick add category dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Category</DialogTitle>
        <DialogContent>
          <CategoryForm
            editing={null}
            nameInput={nameInput} setNameInput={setNameInput}
            iconInput={iconInput} setIconInput={setIconInput}
            colorInput={colorInput} setColorInput={setColorInput}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setAddOpen(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSaveNew} variant="contained" disabled={!nameInput.trim()}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
