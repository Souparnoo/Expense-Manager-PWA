import React from 'react';
import { Box, Divider } from '@mui/material';
import TransactionSelectors from '../components/expenses/TransactionSelectors';
import CategorySelector from '../components/expenses/CategorySelector';
import QuickExpenseButtons from '../components/expenses/QuickExpenseButtons';
import ManualExpenseForm from '../components/expenses/ManualExpenseForm';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DriveBackupCard from '../components/settings/DriveBackupCard';

interface Props {
  onManageQuickExpenses: () => void;
}

export default function HomePage({ onManageQuickExpenses }: Props) {
  return (
    <Box sx={{ pb: 10, overflowY: 'auto', height: '100%' }}>

      <TransactionSelectors />
      <Divider sx={{ opacity: 0.4 }} />

      <Box data-tour="quick-add" sx={{ pt: 1.5 }}>
        <QuickExpenseButtons onManage={onManageQuickExpenses} />
      </Box>
      <Divider sx={{ opacity: 0.4, mx: 2 }} />

      <Box data-tour="category-selector" sx={{ pt: 1.5 }}>
        <CategorySelector />
      </Box>
      <Divider sx={{ opacity: 0.4, mx: 2 }} />

      <Box data-tour="manual-entry" sx={{ pt: 1.5 }}>
        <ManualExpenseForm />
      </Box>
      <Divider sx={{ opacity: 0.4 }} />

      <DashboardStats />
      <RecentTransactions />

      <Box sx={{ pt: 1 }}>
        <DriveBackupCard compact />
      </Box>
    </Box>
  );
}