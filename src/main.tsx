import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppProvider, useApp } from './hooks/useApp';
import { getTheme } from './utils/theme';
import App from './App';
import './index.css';

function ThemedApp() {
  const { settings } = useApp();
  const theme = getTheme(settings.darkMode ? 'dark' : 'light');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <ThemedApp />
    </AppProvider>
  </React.StrictMode>
);
