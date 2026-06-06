import { createTheme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: '#1565C0',
        light: '#1976D2',
        dark: '#0D47A1',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#00BFA5',
        light: '#1DE9B6',
        dark: '#00897B',
        contrastText: '#ffffff'
      },
      error: {
        main: '#E53935',
        light: '#EF5350',
        dark: '#C62828'
      },
      warning: {
        main: '#FB8C00',
        light: '#FFA726',
        dark: '#E65100'
      },
      success: {
        main: '#2E7D32',
        light: '#43A047',
        dark: '#1B5E20'
      },
      background: {
        default: mode === 'dark' ? '#0A0E1A' : '#F5F7FA',
        paper: mode === 'dark' ? '#131929' : '#FFFFFF'
      },
      text: {
        primary: mode === 'dark' ? '#E8EDF5' : '#0D1B2A',
        secondary: mode === 'dark' ? '#8A97B0' : '#546E7A'
      },
      divider: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    },
    typography: {
      fontFamily: '"DM Sans", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 600, letterSpacing: '-0.01em' },
      h4: { fontWeight: 600, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      body1: { fontWeight: 400, lineHeight: 1.6 },
      body2: { fontWeight: 400, lineHeight: 1.5 },
      caption: { fontWeight: 400, letterSpacing: '0.02em' },
      button: { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
      overline: { fontWeight: 600, letterSpacing: '0.1em' }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 20px',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' }
          },
          contained: {
            boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
            '&:hover': {
              boxShadow: '0 4px 16px rgba(21,101,192,0.4)'
            }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: mode === 'dark'
              ? '0 2px 12px rgba(0,0,0,0.4)'
              : '0 2px 12px rgba(0,0,0,0.08)',
            backgroundImage: 'none'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundImage: 'none'
          }
        }
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 64,
            borderTop: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
          }
        }
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 50,
            '&.Mui-selected': {
              color: '#1565C0'
            }
          }
        }
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(21,101,192,0.4)'
          }
        }
      }
    }
  });
