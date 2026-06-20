import React, { useState } from 'react';
import {
  Box, BottomNavigation, BottomNavigationAction, Paper,
  AppBar, Toolbar, Typography, IconButton, useMediaQuery
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import HandshakeIcon from '@mui/icons-material/Handshake';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import FriendsPage from './pages/FriendsPage';
import SettlementPage from './pages/SettlementPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import CategoriesPage from './pages/CategoriesPage';
import QuickExpensesPage from './pages/QuickExpensesPage';
import FriendHistoryPage from './pages/FriendHistoryPage';
import InboxPage from './pages/InboxPage';
import NotificationBadge from './components/common/NotificationBadge';

type Tab = 'home' | 'history' | 'friends' | 'settlement' | 'analytics' | 'categories' | 'inbox' | 'settings';
type SubPage = 'quick-expenses' | 'friend-history' | null;

const TAB_LABELS: Record<Tab, string> = {
  home: 'Home', history: 'History', friends: 'Friends',
  settlement: 'Settle', analytics: 'Analytics',
  categories: 'Categories', inbox: 'Inbox', settings: 'Settings',
};

const BOTTOM_LABELS: Record<Tab, string> = {
  home: 'Home', history: 'Past', friends: 'Friends',
  settlement: 'Settle', analytics: 'Stats',
  categories: 'Tags', inbox: 'Inbox', settings: 'More',
};

const SIDEBAR_TABS: Tab[] = ['home', 'history', 'analytics', 'friends', 'settlement', 'categories', 'inbox', 'settings'];
const BOTTOM_TABS:  Tab[] = ['home', 'history', 'friends', 'settlement', 'analytics', 'inbox', 'categories', 'settings'];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [subPage, setSubPage] = useState<SubPage>(null);
  const isDesktop = useMediaQuery('(min-width:768px)');

  const handleTabChange = (_: React.SyntheticEvent, val: Tab) => {
    setTab(val); setSubPage(null);
  };

  const renderContent = () => {
    if (subPage === 'quick-expenses') return <QuickExpensesPage onBack={() => setSubPage(null)} />;
    if (subPage === 'friend-history') return <FriendHistoryPage />;
    switch (tab) {
      case 'home':       return <HomePage onManageQuickExpenses={() => setSubPage('quick-expenses')} />;
      case 'history':    return <HistoryPage />;
      case 'friends':    return <FriendsPage />;
      case 'settlement': return <SettlementPage />;
      case 'analytics':  return <AnalyticsPage />;
      case 'categories': return <CategoriesPage />;
      case 'inbox':      return <InboxPage />;
      case 'settings':   return <SettingsPage />;
    }
  };

  const tabIcon = (t: Tab) => {
    switch (t) {
      case 'home':       return <HomeIcon fontSize="small" />;
      case 'history':    return <HistoryIcon fontSize="small" />;
      case 'friends':    return <PeopleIcon fontSize="small" />;
      case 'settlement': return <HandshakeIcon fontSize="small" />;
      case 'analytics':  return <BarChartIcon fontSize="small" />;
      case 'categories': return <CategoryIcon fontSize="small" />;
      case 'inbox':      return <NotificationBadge />;
      case 'settings':   return <SettingsIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}>
      <AppBar position="static" elevation={0} sx={{
        backgroundColor: 'background.paper',
        borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary'
      }}>
        <Toolbar variant="dense" sx={{ minHeight: 52 }}>
          <Box
            component="img" src="favicon.svg" alt="Expense Manager"
            sx={{ width: 34, height: 34, borderRadius: 2, mr: 1.5, objectFit: 'contain' }}
          />
          <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
            Expense Manager
          </Typography>
          {tab === 'friends' && (
            <IconButton size="small"
              onClick={() => setSubPage(subPage === 'friend-history' ? null : 'friend-history')}>
              <PeopleAltIcon fontSize="small" />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {isDesktop ? (
          <Box sx={{ display: 'flex', width: '100%' }}>
            <Box sx={{
              width: 200, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider',
              display: 'flex', flexDirection: 'column', py: 2, gap: 0.5, overflowY: 'auto'
            }}>
              {SIDEBAR_TABS.map(t => {
                const active = tab === t && !subPage;
                return (
                  <Box key={t} onClick={() => { setTab(t); setSubPage(null); }}
                    sx={{
                      mx: 1, px: 2, py: 1.5, borderRadius: 2, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      backgroundColor: active ? 'primary.main' : 'transparent',
                      color: active ? 'white' : 'text.secondary',
                      transition: 'all 0.15s',
                      '&:hover': {
                        backgroundColor: active ? 'primary.dark' : 'action.hover',
                        color: active ? 'white' : 'text.primary'
                      }
                    }}
                  >
                    {tabIcon(t)}
                    <Typography variant="body2" fontWeight={600}>{TAB_LABELS[t]}</Typography>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderContent()}</Box>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderContent()}</Box>
        )}
      </Box>

      {!isDesktop && (
        <Paper elevation={0} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <BottomNavigation value={tab} onChange={handleTabChange} showLabels>
            {BOTTOM_TABS.map(t => (
              <BottomNavigationAction key={t} label={BOTTOM_LABELS[t]} value={t} icon={tabIcon(t)} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}