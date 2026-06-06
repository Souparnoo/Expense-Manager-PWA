import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Switch, FormControlLabel,
  Button, Divider, List, ListItem, ListItemText, Alert,
  Snackbar, CircularProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import TableChartIcon from '@mui/icons-material/TableChart';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import InfoIcon from '@mui/icons-material/Info';
import { useApp } from '../hooks/useApp';
import * as db from '../db';
import { exportToExcel } from '../utils/excel';
import PageHeader from '../components/common/PageHeader';

export default function SettingsPage() {
  const { settings, updateSettings, expenses, friends, settlements, reloadAll } = useApp();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExportJSON = async () => {
    setLoading(true);
    try {
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: 'Backup exported successfully!', type: 'success' });
    } catch {
      setToast({ msg: 'Export failed. Try again.', type: 'error' });
    }
    setLoading(false);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.expenses || !data.friends) throw new Error('Invalid backup file');
        await db.importAllData(data);
        await reloadAll();
        setToast({ msg: 'Data restored successfully!', type: 'success' });
      } catch (err) {
        setToast({ msg: 'Import failed. Invalid backup file.', type: 'error' });
      }
      setLoading(false);
    };
    input.click();
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(expenses, friends, settlements);
      setToast({ msg: 'Excel exported successfully!', type: 'success' });
    } catch {
      setToast({ msg: 'Excel export failed.', type: 'error' });
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Settings" />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 2 }}>
        {/* Appearance */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DarkModeIcon fontSize="small" color="primary" />
              <Typography fontWeight={700}>Appearance</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.darkMode}
                  onChange={e => updateSettings({ darkMode: e.target.checked })}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
          </CardContent>
        </Card>

        {/* Backup */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <DownloadIcon fontSize="small" color="primary" />
              <Typography fontWeight={700}>Backup & Restore</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
                onClick={handleExportJSON}
                disabled={loading}
                fullWidth
              >
                Export JSON Backup
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={handleImportJSON}
                disabled={loading}
                fullWidth
              >
                Import JSON Backup
              </Button>
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                Importing will overwrite all current data.
              </Alert>
            </Box>
          </CardContent>
        </Card>

        {/* Excel Export */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TableChartIcon fontSize="small" color="primary" />
              <Typography fontWeight={700}>Excel Export</Typography>
            </Box>
            <Button
              variant="contained"
              color="success"
              startIcon={<TableChartIcon />}
              onClick={handleExportExcel}
              fullWidth
            >
              Export to Excel (.xlsx)
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Includes: All History, My Expenses, one sheet per friend
            </Typography>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <InfoIcon fontSize="small" color="primary" />
              <Typography fontWeight={700}>About</Typography>
            </Box>
            <List disablePadding dense>
              <ListItem disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary="App"
                  secondary="Expense Manager"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary="Version"
                  secondary="1.0.0"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary="Storage"
                  secondary="IndexedDB (fully offline)"
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary="Records"
                  secondary={`${expenses.length} expenses · ${friends.length} friends`}
                  primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                  secondaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.type || 'success'}
          variant="filled"
          onClose={() => setToast(null)}
          sx={{ borderRadius: 3 }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
