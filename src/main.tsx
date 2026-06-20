import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppProvider, useApp } from './hooks/useApp';
import { FirebaseAuthProvider } from './hooks/useFirebaseAuth';
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
      <FirebaseAuthProvider>
        <ThemedApp />
      </FirebaseAuthProvider>
    </AppProvider>
  </React.StrictMode>
);