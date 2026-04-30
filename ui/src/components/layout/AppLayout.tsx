import React, { useEffect, useState } from 'react';
import { Box, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useColorMode } from '../../context/ColorModeContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const version = import.meta.env.VITE_APP_VERSION;

export const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { mode } = useColorMode();
  const isDark = mode === 'dark';
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <Box sx={{ display: 'flex' }}>
      <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 1.5, md: 2 },
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Outlet />
        <Box sx={{ height: 36 }} />
      </Box>
      <Box sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
        background: isDark
          ? 'linear-gradient(160deg, #0a160a 0%, #0e2a0e 100%)'
          : 'linear-gradient(160deg, #0d3349 0%, #1a5276 100%)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        py: 0.75, px: 2,
        textAlign: 'center',
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          © {new Date().getFullYear()} Cricket Legend. All rights reserved.
        </Typography>
        {version && (
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', ml: 2 }}>
            v{version}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
