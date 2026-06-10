import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import { useApp } from '../../hooks/useApp';

export default function CategorySelector() {
  const { categories, selectedCategoryId, setSelectedCategoryId } = useApp();

  return (
    <Box sx={{ px: 2, pb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
        <CategoryIcon fontSize="small" sx={{ color: 'secondary.main' }} />
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
          CATEGORY
        </Typography>
      </Box>
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
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: selected ? cat.color : 'transparent',
                backgroundColor: selected ? `${cat.color}22` : 'action.hover',
                color: selected ? cat.color : 'text.secondary',
                transition: 'all 0.15s',
                '&:hover': {
                  backgroundColor: `${cat.color}22`,
                  borderColor: cat.color,
                  color: cat.color,
                },
                '&:active': { transform: 'scale(0.95)' },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
