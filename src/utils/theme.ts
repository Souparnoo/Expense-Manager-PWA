import { createTheme } from '@mui/material/styles';
export const getTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main:         '#F57C00',   // warm orange — wallet body
        light:        '#FFA726',   // amber highlight
        dark:         '#E65100',   // deep orange
        contrastText: '#ffffff'
      },
      secondary: {
        main:         '#2E7D32',   // rich green — money/bills
        light:        '#43A047',
        dark:         '#1B5E20',
        contrastText: '#ffffff'
      },
      error: {
        main:  '#E53935',
        light: '#EF5350',
        dark:  '#C62828'
      },
      warning: {
        main:  '#F9A825',   // gold — coins
        light: '#FFD54F',
        dark:  '#F57F17'
      },
      success: {
        main:  '#43A047',
        light: '#66BB6A',
        dark:  '#2E7D32'
      },
      info: {
        main:  '#0277BD',   // teal-blue — wallet strap
        light: '#039BE5',
        dark:  '#01579B'
      },
      background: {
        default: mode === 'dark' ? '#0D0F14' : '#FFF8F0',   // near-black / warm cream
        paper:   mode === 'dark' ? '#161A22' : '#FFFFFF'
      },
      text: {
        primary:   mode === 'dark' ? '#F0EAE0' : '#312211',
        secondary: mode === 'dark' ? '#8A8070' : '#6D5C44'
      },
      divider: mode === 'dark' ? 'rgba(245,176,0,0.1)' : 'rgba(180,100,0,0.1)'
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
            boxShadow: '0 2px 10px rgba(245,124,0,0.35)',
            '&:hover': { boxShadow: '0 4px 18px rgba(245,124,0,0.45)' }
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: mode === 'dark'
              ? '0 2px 14px rgba(0,0,0,0.5)'
              : '0 2px 12px rgba(180,100,0,0.1)',
            backgroundImage: 'none',
            border: mode === 'dark'
              ? '1px solid rgba(245,176,0,0.07)'
              : '1px solid rgba(180,100,0,0.08)'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': { borderRadius: 10 }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8 }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            backgroundImage: 'none',
            border: mode === 'dark' ? '1px solid rgba(245,176,0,0.1)' : 'none'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: mode === 'dark' ? '#161A22' : '#FFFFFF'
          }
        }
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            height: 64,
            backgroundColor: mode === 'dark' ? '#161A22' : '#FFFFFF',
            borderTop: `1px solid ${mode === 'dark' ? 'rgba(245,176,0,0.1)' : 'rgba(180,100,0,0.1)'}`
          }
        }
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 50,
            '&.Mui-selected': {
              color: '#F57C00'   // orange active state
            }
          }
        }
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(245,124,0,0.5)'
          }
        }
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 4 }
        }
      }
    }
  });
