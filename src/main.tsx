import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AppProvider, useApp } from './hooks/useApp';
import { FirebaseAuthProvider } from './hooks/useFirebaseAuth';
import { TourProvider } from './hooks/useTour';
import { getTheme } from './utils/theme';
import App from './App';
import './index.css';

function ThemedApp() {
  const { settings, updateSettings } = useApp();
  const theme = getTheme(settings.darkMode ? 'dark' : 'light');

  const handleTourComplete = async () => {
    await updateSettings({ tourCompleted: true });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TourProvider onComplete={handleTourComplete}>
        <App />
      </TourProvider>
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
