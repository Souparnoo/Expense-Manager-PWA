import React, { useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, useTheme
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { useApp } from '../hooks/useApp';
import {
  getLast6Months, getMonthLabel, getMonthStart, getMonthEnd,
  calcPersonalTotal, calcFriendBalances, formatCurrency
} from '../utils';
import PageHeader from '../components/common/PageHeader';

export default function AnalyticsPage() {
  const { expenses, settlements, friends, settings } = useApp();
  const theme = useTheme();

  const last6Months = getLast6Months();

  // Monthly spending trend
  const monthlyTrend = useMemo(() =>
    last6Months.map(month => {
      const start = getMonthStart(month);
      const end = getMonthEnd(month);
      const monthExpenses = expenses.filter(e => e.date >= start && e.date <= end);
      return {
        month: getMonthLabel(month),
        amount: calcPersonalTotal(monthExpenses),
        total: monthExpenses.reduce((s, e) => s + e.amount, 0)
      };
    }), [expenses, last6Months]);

  // Daily trend for current month
  const currentMonthStart = getMonthStart();
  const currentMonthEnd = getMonthEnd();
  const dailyTrend = useMemo(() => {
    const currentMonthExpenses = expenses.filter(
      e => e.date >= currentMonthStart && e.date <= currentMonthEnd && e.paidFor === 'me'
    );
    const days: Record<string, number> = {};
    for (const e of currentMonthExpenses) {
      days[e.date] = (days[e.date] || 0) + e.amount;
    }
    return Object.keys(days).sort().map(date => ({
      date: date.slice(8), // day number
      amount: days[date]
    }));
  }, [expenses, currentMonthStart, currentMonthEnd]);

  // Top expense categories (by name frequency)
  const topExpenses = useMemo(() => {
    const nameMap: Record<string, number> = {};
    for (const e of expenses.filter(e => e.paidFor === 'me')) {
      const key = e.name.toLowerCase().trim();
      nameMap[key] = (nameMap[key] || 0) + e.amount;
    }
    return Object.entries(nameMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), amount }));
  }, [expenses]);

  // Friend settlement summary
  const friendBalances = useMemo(
    () => calcFriendBalances(expenses, settlements, friends).filter(b => Math.abs(b.net) > 0.01),
    [expenses, settlements, friends]
  );

  const PIE_COLORS = [
    theme.palette.primary.main,
    '#7B1FA2', '#00897B', '#F57C00', '#C62828',
    '#1565C0', '#2E7D32', '#AD1457'
  ];

  const cardSx = {
    mb: 2
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader title="Analytics" subtitle="Spending insights" />

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 2 }}>
        {/* Monthly Trend */}
        <Card sx={cardSx}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Monthly Spending (6 months)
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v, settings.currency), 'Personal Expense']}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="amount" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily trend this month */}
        {dailyTrend.length > 0 && (
          <Card sx={cardSx}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Daily Spending – This Month
              </Typography>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v, settings.currency), 'Amount']}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8
                    }}
                  />
                  <Line
                    type="monotone" dataKey="amount"
                    stroke={theme.palette.secondary.main}
                    strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Expenses Pie */}
        {topExpenses.length > 0 && (
          <Card sx={cardSx}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Top Expense Categories
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={topExpenses}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {topExpenses.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v, settings.currency), 'Total']}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Friend Balance Chart */}
        {friendBalances.length > 0 && (
          <Card sx={cardSx}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Friend Settlement Summary
              </Typography>
              <ResponsiveContainer width="100%" height={Math.max(150, friendBalances.length * 45)}>
                <BarChart
                  layout="vertical"
                  data={friendBalances.map(b => ({
                    name: b.friend.name,
                    net: b.net
                  }))}
                  margin={{ top: 5, right: 10, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: theme.palette.text.primary }} width={70} />
                  <Tooltip
                    formatter={(v: number) => [
                      v > 0 ? `You owe ${formatCurrency(v, settings.currency)}` : `${formatCurrency(Math.abs(v), settings.currency)} owed to you`,
                      'Balance'
                    ]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8
                    }}
                  />
                  <Bar
                    dataKey="net"
                    radius={[0, 4, 4, 0]}
                  >
                    {friendBalances.map((b, i) => (
                      <Cell
                        key={i}
                        fill={b.net > 0 ? theme.palette.warning.main : theme.palette.info.main}
                      />
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
