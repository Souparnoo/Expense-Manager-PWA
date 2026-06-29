import React, { useEffect } from 'react';
import { Box, Divider } from '@mui/material';
import TransactionSelectors from '../components/expenses/TransactionSelectors';
import CategorySelector from '../components/expenses/CategorySelector';
import QuickExpenseButtons from '../components/expenses/QuickExpenseButtons';
import ManualExpenseForm from '../components/expenses/ManualExpenseForm';
import DashboardStats from '../components/dashboard/DashboardStats';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DriveBackupCard from '../components/settings/DriveBackupCard';
import TourOverlay from '../components/tour/TourOverlay';
import { useTour } from '../hooks/useTour';
import { useApp } from '../hooks/useApp';

interface Props {
  onManageQuickExpenses: () => void;
}

export default function HomePage({ onManageQuickExpenses }: Props) {
  const { advance } = useTour();
  const { paidByTouched, paidForTouched, categoryTouched } = useApp();

  // Watch touch counters — these increment on every interaction with the
  // selector even if the selected value doesn't change (e.g. "Me" re-selected).
  // Skip the initial mount (counter === 0) by only advancing when > 0.
  useEffect(() => {
    if (paidByTouched > 0) advance('paid-by');
  }, [paidByTouched]);

  useEffect(() => {
    if (paidForTouched > 0) advance('paid-for');
  }, [paidForTouched]);

  useEffect(() => {
    if (categoryTouched > 0) advance('category');
  }, [categoryTouched]);

  return (
    <Box sx={{ pb: 10, overflowY: 'auto', height: '100%' }}>
      <TourOverlay />

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