import React, { useEffect, useState } from 'react';
import { Box, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const version = import.meta.env.VITE_APP_VERSION;

export const AppLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
      </Box>
      {version && (
        <Typography
          variant="caption"
          sx={{
            position: 'fixed',
            bottom: 8,
            right: 12,
            color: 'text.disabled',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          v{version}
        </Typography>
      )}
    </Box>
  );
};
