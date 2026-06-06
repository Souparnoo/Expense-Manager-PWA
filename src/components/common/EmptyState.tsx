import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface Props {
  icon: React.ReactElement;
  title: string;
  subtitle?: string;
  action?: React.ReactElement;
}

export default function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', py: 8, px: 3, textAlign: 'center'
      }}
    >
      <Box sx={{ mb: 2, opacity: 0.35, '& svg': { fontSize: 64 } }}>
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 280 }}>
          {subtitle}
        </Typography>
      )}
      {action}
    </Box>
  );
}
