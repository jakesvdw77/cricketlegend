import { createTheme, Theme } from '@mui/material';

export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary:    { main: '#1a5276' },
    secondary:  { main: '#28b463' },
  },
});

export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#dce8dc', contrastText: '#0e1f0e' },
    secondary: { main: '#28b463' },
    background: {
      default: '#0e1f0e',
      paper:   '#1e3d1e',
    },
    text: {
      primary:   '#e4f4df',
      secondary: '#dddddd',
    },
    divider: 'rgba(100,180,90,0.18)',
    action: {
      hover:    'rgba(79,168,58,0.12)',
      selected: 'rgba(79,168,58,0.18)',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#0a160a' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#111f11', borderRight: '1px solid rgba(100,180,90,0.15)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#1e3a1e !important',
            color: '#e4f4df !important',
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root:nth-of-type(odd)': {
            backgroundColor: '#1a2e1a !important',
          },
          '& .MuiTableRow-root:nth-of-type(even)': {
            backgroundColor: '#162616 !important',
          },
          '& .MuiTableCell-root': {
            color: '#e4f4df',
            borderBottomColor: 'rgba(100,180,90,0.12)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: 'rgba(100,180,90,0.12)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        outlined: { borderColor: 'rgba(100,180,90,0.4)' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.7;
          cursor: pointer;
        }
      `,
    },
  },
});
