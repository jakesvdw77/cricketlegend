import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar,
  Menu, MenuItem, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
  Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import { Menu as MenuIcon, SportsCricket, Person, HelpOutline, ExpandMore } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const HELP_SECTIONS = [
  {
    title: 'Matches',
    content: `Upcoming Matches shows all scheduled fixtures. Previous Matches shows completed games with results. Scorecards shows detailed match scorecards with innings breakdowns.`,
  },
  {
    title: 'Team Sheet',
    content: `View the playing XI for any match. Use the team toggle to switch between the home and opposition teams. Copy the team sheet to clipboard formatted for WhatsApp, or print / export to PDF. The Copy and Print buttons are disabled until the team has been announced.`,
  },
  {
    title: 'Teams',
    content: `Browse all registered teams and their squads. Expand a team to see its players and management details. Use the print icon to export a squad list as a PDF.`,
  },
  {
    title: 'Tournaments',
    content: `View all tournaments including format, pools, standings, results and sponsors. Use the Pools button to see group draw, Standings for the league table, Results for match outcomes, and Sponsors for tournament sponsor details.`,
  },
  {
    title: 'Player Statistics',
    content: `Browse batting and bowling statistics per player across all matches. Filter by tournament or team to narrow results.`,
  },
  {
    title: 'My Profile',
    content: `View and update your personal details including contact information and profile picture. Access this from the account menu in the top right corner.`,
  },
  {
    title: 'Admin — Teams & Players',
    content: `Manage teams, assign players to squads, and update team details including logo, home ground and management staff. Use the club filter to narrow the team list. The print icon on each row exports the squad PDF directly.`,
  },
  {
    title: 'Admin — Matches',
    content: `Create and manage fixtures. Assign the playing XI for each team via the Team Sheet icon. Capture match results using the Result icon. The print icon opens the printable team sheet directly.`,
  },
  {
    title: 'Admin — Tournaments',
    content: `Create tournaments, set up pools, assign teams to pools, and record the tournament winner. Manage sponsor associations from the tournament edit form.`,
  },
  {
    title: 'Admin — Sponsors',
    content: `Manage sponsor records including logo, website and contact details. Sponsors can be linked to tournaments and are displayed publicly on the landing page and tournament sponsor view.`,
  },
];

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<Props> = ({ onToggleSidebar }) => {
  const { username, firstName, lastName, email, isAdmin, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
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
        <Tooltip title="Help">
          <IconButton color="inherit" onClick={() => setHelpOpen(true)} sx={{ mr: 0.5 }}>
            <HelpOutline />
          </IconButton>
        </Tooltip>
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

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutline color="primary" /> Help
        </DialogTitle>
        <DialogContent dividers>
          {HELP_SECTIONS.map(s => (
            <Accordion key={s.title} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid', borderColor: 'divider' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography fontWeight="medium">{s.title}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {s.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
      </Dialog>
    </AppBar>
  );
};
