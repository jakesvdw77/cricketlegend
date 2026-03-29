import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar,
  Menu, MenuItem, Tooltip, Chip,
} from '@mui/material';
import { Menu as MenuIcon, SportsCricket, Person } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<Props> = ({ onToggleSidebar }) => {
  const { username, firstName, lastName, email, isAdmin, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || username.charAt(0).toUpperCase();

  return (
    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <IconButton color="inherit" edge="start" onClick={onToggleSidebar} sx={{ mr: 2 }}>
          <MenuIcon />
        </IconButton>
        <SportsCricket sx={{ mr: 1 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Cricket Legend
        </Typography>
        {isAdmin && (
          <Chip label="Admin" color="warning" size="small" sx={{ mr: 2, color: 'white' }} />
        )}
        <Tooltip title="Account">
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, fontSize: 14 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <Box sx={{ px: 2, py: 1, minWidth: 180 }}>
            <Typography fontWeight="bold">{`${firstName} ${lastName}`.trim() || username}</Typography>
            <Typography variant="body2" color="text.secondary">{email}</Typography>
            <Typography variant="caption" color="text.secondary">Role: {isAdmin ? 'Admin' : 'Player'}</Typography>
          </Box>
          <MenuItem divider disabled />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
            <Person fontSize="small" sx={{ mr: 1 }} /> My Profile
          </MenuItem>
          <MenuItem onClick={logout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
