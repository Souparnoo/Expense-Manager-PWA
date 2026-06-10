import React from 'react';
import { Box, Divider } from '@mui/material';
import TransactionSelectors from '../components/expenses/TransactionSelectors';
import CategorySelector from '../components/expenses/CategorySelector';
import QuickExpenseButtons from '../components/expenses/QuickExpenseButtons';
import ManualExpenseForm from '../components/expenses/ManualExpenseForm';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentTransactions from '../components/dashboard/RecentTransactions';

interface Props {
  onManageQuickExpenses: () => void;
}

export default function HomePage({ onManageQuickExpenses }: Props) {
  return (
    <Box sx={{ pb: 10, overflowY: 'auto', height: '100%' }}>
      <TransactionSelectors />
      <Divider sx={{ opacity: 0.4 }} />

      {/* Category selector */}
      <Box sx={{ pt: 1.5 }}>
        <CategorySelector />
      </Box>
      <Divider sx={{ opacity: 0.4, mx: 2 }} />

      {/* Quick Expenses */}
      <Box sx={{ pt: 1.5 }}>
        <QuickExpenseButtons onManage={onManageQuickExpenses} />
      </Box>
      <Divider sx={{ opacity: 0.4, mx: 2 }} />

      {/* Manual Entry */}
      <Box sx={{ pt: 1.5 }}>
        <ManualExpenseForm />
      </Box>
      <Divider sx={{ opacity: 0.4 }} />

      <DashboardStats />
      <RecentTransactions />
    </Box>
  );
}
