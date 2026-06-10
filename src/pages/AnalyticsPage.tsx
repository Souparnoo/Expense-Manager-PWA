import React, { useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, useTheme, MenuItem, TextField
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { useApp } from '../hooks/useApp';
import {
  getLast6Months, getMonthLabel, getMonthStart, getMonthEnd,
  calcPersonalTotal, calcFriendBalances, formatCurrency, getCurrentMonth
} from '../utils';
import PageHeader from '../components/common/PageHeader';

export default function AnalyticsPage() {
  const { expenses, settlements, friends, categories, settings } = useApp();
  const theme = useTheme();
  const last6Months = getLast6Months();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // ── Monthly trend ────────────────────────────────────────────────────────────
  const monthlyTrend = useMemo(() =>
    last6Months.map(month => {
      const start = getMonthStart(month);
      const end = getMonthEnd(month);
      const monthExpenses = expenses.filter(e => e.date >= start && e.date <= end);
      return { month: getMonthLabel(month), amount: calcPersonalTotal(monthExpenses) };
    }), [expenses, last6Months]);

  // ── Daily trend this month ───────────────────────────────────────────────────
  const currentMonthStart = getMonthStart();
  const currentMonthEnd = getMonthEnd();
  const dailyTrend = useMemo(() => {
    const days: Record<string, number> = {};
    for (const e of expenses.filter(e =>
      e.date >= currentMonthStart && e.date <= currentMonthEnd && e.paidFor === 'me'
    )) {
      days[e.date] = (days[e.date] || 0) + e.amount;
    }
    return Object.keys(days).sort().map(date => ({ date: date.slice(8), amount: days[date] }));
  }, [expenses, currentMonthStart, currentMonthEnd]);

  // ── Category breakdown for selected month ───────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const start = getMonthStart(selectedMonth);
    const end = getMonthEnd(selectedMonth);
    const monthExpenses = expenses.filter(
      e => e.date >= start && e.date <= end && e.paidFor === 'me'
    );
    const totals: Record<string, number> = {};
    for (const e of monthExpenses) {
      const cid = e.categoryId || 'other';
      totals[cid] = (totals[cid] || 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([id, amount]) => {
        const cat = categories.find(c => c.id === id) ?? categories.find(c => c.id === 'other');
        return { id, name: `${cat?.icon ?? '📦'} ${cat?.name ?? 'Other'}`, amount, color: cat?.color ?? '#757575' };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories, selectedMonth]);

  // ── All-time category totals for pie ────────────────────────────────────────
  const categoryPie = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses.filter(e => e.paidFor === 'me')) {
      const cid = e.categoryId || 'other';
      totals[cid] = (totals[cid] || 0) + e.amount;
    }
    return Object.entries(totals)
      .map(([id, value]) => {
        const cat = categories.find(c => c.id === id) ?? categories.find(c => c.id === 'other');
        return { name: `${cat?.icon} ${cat?.name}`, value, color: cat?.color ?? '#757575' };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses, categories]);

  // ── Top spending categories ──────────────────────────────────────────────────
  const topCategories = useMemo(() => categoryPie.slice(0, 5), [categoryPie]);

  // ── Friend balances ──────────────────────────────────────────────────────────
  const friendBalances = useMemo(
    () => calcFriendBalances(expenses, settlements, friends).filter(b => Math.abs(b.net) > 0.01),
    [expenses, settlements, friends]
  );

  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Analytics" subtitle="Spending insights" />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 2 }}>

        {/* ── Monthly Trend ─────────────────────────────────────────────────── */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Monthly Spending (6 months)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip formatter={(v: number) => [formatCurrency(v, settings.currency), 'Spent']} contentStyle={tooltipStyle} />
                <Bar dataKey="amount" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Daily trend ───────────────────────────────────────────────────── */}
        {dailyTrend.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Daily Spending – This Month
              </Typography>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <Tooltip formatter={(v: number) => [formatCurrency(v, settings.currency), 'Amount']} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="amount" stroke={theme.palette.secondary.main}
                    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Category Pie (all time) ───────────────────────────────────────── */}
        {categoryPie.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Category Breakdown (All Time)
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={categoryPie} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v, settings.currency), 'Total']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, justifyContent: 'center' }}>
                {categoryPie.map(c => (
                  <Box key={c.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c.color, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary">{c.name}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── Monthly Category Breakdown ───────────────────────────────────── */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Category Breakdown</Typography>
              <TextField select size="small" value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)} sx={{ minWidth: 130 }}>
                {last6Months.map(m => (
                  <MenuItem key={m} value={m}>{getMonthLabel(m)}</MenuItem>
                ))}
              </TextField>
            </Box>

            {categoryBreakdown.length === 0 ? (
              <Typography variant="body2" color="text.disabled">No expenses for this month.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {categoryBreakdown.map(cat => {
                  const max = categoryBreakdown[0].amount;
                  const pct = (cat.amount / max) * 100;
                  return (
                    <Box key={cat.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography variant="body2" fontWeight={500}>{cat.name}</Typography>
                        <Typography variant="body2" fontWeight={700}>{formatCurrency(cat.amount, settings.currency)}</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, backgroundColor: 'action.selected', overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: cat.color, borderRadius: 3, transition: 'width 0.4s' }} />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ── Top Categories ───────────────────────────────────────────────── */}
        {topCategories.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Top Spending Categories</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {topCategories.map((cat, i) => (
                  <Box key={cat.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: 'text.disabled', minWidth: 24 }}>
                      {i + 1}
                    </Typography>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: 2,
                      backgroundColor: `${cat.color}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {cat.name.split(' ')[0]}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{cat.name.split(' ').slice(1).join(' ')}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(cat.value, settings.currency)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── Friend Settlement Chart ──────────────────────────────────────── */}
        {friendBalances.length > 0 && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Friend Settlement Summary
              </Typography>
              <ResponsiveContainer width="100%" height={Math.max(150, friendBalances.length * 45)}>
                <BarChart layout="vertical"
                  data={friendBalances.map(b => ({ name: b.friend.name, net: b.net }))}
                  margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: theme.palette.text.primary }} width={70} />
                  <Tooltip
                    formatter={(v: number) => [
                      v > 0 ? `You owe ${formatCurrency(v, settings.currency)}` : `${formatCurrency(Math.abs(v), settings.currency)} owed to you`,
                      'Balance'
                    ]}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="net" radius={[0, 4, 4, 0]}>
                    {friendBalances.map((b, i) => (
                      <Cell key={i} fill={b.net > 0 ? theme.palette.warning.main : theme.palette.info.main} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary">You owe</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'info.main' }} />
                  <Typography variant="caption" color="text.secondary">Owed to you</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

      </Box>
    </Box>
  );
}
