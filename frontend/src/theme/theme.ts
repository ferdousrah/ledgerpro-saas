import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#3C3ACC',
      light: '#6362d9',
      dark: '#2a2a9e',
    },
    secondary: {
      main: '#4caf50',
      light: '#66bb6a',
      dark: '#388e3c',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
    success: {
      main: '#4caf50',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
        containedSuccess: {
          color: '#ffffff',
        },
        containedError: {
          color: '#ffffff',
        },
        containedWarning: {
          color: '#ffffff',
        },
        containedInfo: {
          color: '#ffffff',
        },
        containedPrimary: {
          color: '#ffffff',
        },
        containedSecondary: {
          color: '#ffffff',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        filledSuccess: {
          color: '#ffffff',
        },
        filledError: {
          color: '#ffffff',
        },
        filledWarning: {
          color: '#ffffff',
        },
        filledInfo: {
          color: '#ffffff',
        },
        filledPrimary: {
          color: '#ffffff',
        },
        filledSecondary: {
          color: '#ffffff',
        },
      },
    },
  },
});
