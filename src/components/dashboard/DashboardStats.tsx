import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, InputAdornment, Alert
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import { useApp } from '../../hooks/useApp';
import {
  getTodayDate, getMonthStart, getMonthEnd,
  getCurrentMonth, formatCurrency, calcPersonalTotal
} from '../../utils';
import * as db from '../../db';
import { generateId } from '../../utils';

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  onClick?: () => void;
}

function StatCard({ icon, label, value, sub, color = 'primary.main', onClick }: StatCardProps) {
  return (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s',
        '&:active': onClick ? { transform: 'scale(0.97)' } : {}
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.06em' }}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, color }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">{sub}</Typography>
            )}
          </Box>
          <Box sx={{
            p: 1, borderRadius: 2,
            backgroundColor: `${color}22`,
            color,
            display: 'flex', alignItems: 'center'
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardStats() {
  const { expenses, budgets, settings, reloadBudgets } = useApp();
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const today = getTodayDate();
  const month = getCurrentMonth();
  const monthStart = getMonthStart();
  const monthEnd = getMonthEnd();

  const stats = useMemo(() => {
    const todayExpenses = expenses.filter(e => e.date === today);
    const monthExpenses = expenses.filter(e => e.date >= monthStart && e.date <= monthEnd);

    return {
      todayExpense: calcPersonalTotal(todayExpenses),
      monthExpense: calcPersonalTotal(monthExpenses),
      todayCount: todayExpenses.length,
      monthCount: monthExpenses.length
    };
  }, [expenses, today, monthStart, monthEnd]);

  const budget = useMemo(
    () => budgets.find(b => b.month === month),
    [budgets, month]
  );

  const budgetPercent = budget ? Math.min((stats.monthExpense / budget.amount) * 100, 100) : 0;
  const remaining = budget ? budget.amount - stats.monthExpense : 0;
  const isNearLimit = budgetPercent >= 80;
  const isOverBudget = budgetPercent >= 100;

  const handleSaveBudget = async () => {
    const amt = parseFloat(budgetInput);
    if (isNaN(amt) || amt <= 0) return;
    const existing = budgets.find(b => b.month === month);
    await db.saveBudget({
      id: existing?.id || generateId(),
      month,
      amount: amt,
      updatedAt: Date.now()
    });
    await reloadBudgets();
    setBudgetDialog(false);
    setBudgetInput('');
  };

  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
        <StatCard
          icon={<TodayIcon fontSize="small" />}
          label="TODAY"
          value={formatCurrency(stats.todayExpense, settings.currency)}
          sub={`${stats.todayCount} transactions`}
          color="#1565C0"
        />
        <StatCard
          icon={<CalendarMonthIcon fontSize="small" />}
          label="THIS MONTH"
          value={formatCurrency(stats.monthExpense, settings.currency)}
          sub={`${stats.monthCount} transactions`}
          color="#7B1FA2"
        />
      </Box>

      {/* Budget Card */}
      <Card
        sx={{ cursor: 'pointer' }}
        onClick={() => { setBudgetDialog(true); setBudgetInput(String(budget?.amount || '')); }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWalletIcon fontSize="small" sx={{ color: 'warning.main' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
                MONTHLY BUDGET
              </Typography>
            </Box>
            <EditIcon fontSize="small" sx={{ opacity: 0.4 }} />
          </Box>

          {budget ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Spent: <strong>{formatCurrency(stats.monthExpense, settings.currency)}</strong>
                </Typography>
                <Typography variant="body2" color={isOverBudget ? 'error.main' : 'text.secondary'}>
                  {isOverBudget ? 'Over by: ' : 'Left: '}
                  <strong>{formatCurrency(Math.abs(remaining), settings.currency)}</strong>
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={budgetPercent}
                sx={{
                  height: 8, borderRadius: 4,
                  backgroundColor: 'action.selected',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: isOverBudget ? 'error.main' : isNearLimit ? 'warning.main' : 'primary.main'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {budgetPercent.toFixed(0)}% of {formatCurrency(budget.amount, settings.currency)}
              </Typography>
              {isNearLimit && !isOverBudget && (
                <Alert severity="warning" sx={{ mt: 1, py: 0.25, borderRadius: 2 }}>
                  Approaching budget limit!
                </Alert>
              )}
              {isOverBudget && (
                <Alert severity="error" sx={{ mt: 1, py: 0.25, borderRadius: 2 }}>
                  Budget exceeded!
                </Alert>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.disabled">
              Tap to set monthly budget
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={budgetDialog} onClose={() => setBudgetDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Set Monthly Budget</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Budget Amount"
            type="number"
            fullWidth
            value={budgetInput}
            onChange={e => setBudgetInput(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">{settings.currency}</InputAdornment>
            }}
            inputProps={{ min: 0, step: '100' }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setBudgetDialog(false)} color="inherit" variant="outlined">Cancel</Button>
          <Button onClick={handleSaveBudget} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
