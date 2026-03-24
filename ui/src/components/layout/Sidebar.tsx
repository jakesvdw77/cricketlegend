import React, {useState} from 'react';
import {
    Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Collapse, Divider, IconButton, Toolbar, Typography, Box,
} from '@mui/material';
import {
    EmojiEvents, Groups, Person, SportsScore, Assignment,
    ExpandLess, ExpandMore, ChevronLeft, SportsCricket,
    History, Leaderboard, CalendarMonth, Grass, Shield, Star, Payments,
} from '@mui/icons-material';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';

const DRAWER_WIDTH = 240;

interface Props {
    open: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({open, onClose}) => {
    const navigate = useNavigate();
    const {isAdmin, isManager} = useAuth();
    const [captureOpen, setCaptureOpen] = useState(true);
    const [viewOpen, setViewOpen] = useState(true);
    const [financialsOpen, setFinancialsOpen] = useState(true);

    const go = (path: string) => navigate(path);

    return (
        <Drawer
            variant="persistent"
            anchor="left"
            open={open}
            sx={{width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': {width: DRAWER_WIDTH}}}
        >
            <Toolbar sx={{display: 'flex', justifyContent: 'space-between'}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <SportsCricket color="primary"/>
                    <Typography variant="subtitle1" fontWeight="bold">Cricket Legend</Typography>
                </Box>
                <IconButton onClick={onClose}><ChevronLeft/></IconButton>
            </Toolbar>
            <Divider/>

            {(isAdmin || isManager) ? (
                <>
                    <ListItemButton onClick={() => setCaptureOpen(!captureOpen)}>
                        <ListItemText primary="Capture & View" primaryTypographyProps={{fontWeight: 'bold'}}/>
                        {captureOpen ? <ExpandLess/> : <ExpandMore/>}
                    </ListItemButton>
                    <Collapse in={captureOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/clubs')}>
                                <ListItemIcon><Shield/></ListItemIcon>
                                <ListItemText primary="Clubs"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/teams')}>
                                <ListItemIcon><Groups/></ListItemIcon>
                                <ListItemText primary="Teams"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/fields')}>
                                <ListItemIcon><Grass/></ListItemIcon>
                                <ListItemText primary="Fields"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/players')}>
                                <ListItemIcon><Person/></ListItemIcon>
                                <ListItemText primary="Players"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/tournaments')}>
                                <ListItemIcon><EmojiEvents/></ListItemIcon>
                                <ListItemText primary="Tournaments"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/matches')}>
                                <ListItemIcon><SportsScore/></ListItemIcon>
                                <ListItemText primary="Matches"/>
                            </ListItemButton>

                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            {isAdmin ? (
                <>
                    <ListItemButton onClick={() => setFinancialsOpen(!financialsOpen)}>
                        <ListItemText primary="Financials" primaryTypographyProps={{fontWeight: 'bold'}}/>
                        {financialsOpen ? <ExpandLess/> : <ExpandMore/>}
                    </ListItemButton>
                    <Collapse in={financialsOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/sponsors')}>
                                <ListItemIcon><Star/></ListItemIcon>
                                <ListItemText primary="Sponsors"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/payments')}>
                                <ListItemIcon><Payments/></ListItemIcon>
                                <ListItemText primary="Payments"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            <ListItemButton onClick={() => setViewOpen(!viewOpen)}>
                <ListItemText primary="View" primaryTypographyProps={{fontWeight: 'bold'}}/>
                {viewOpen ? <ExpandLess/> : <ExpandMore/>}
            </ListItemButton>
            <Collapse in={viewOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/teams')}>
                        <ListItemIcon><Groups/></ListItemIcon>
                        <ListItemText primary="Teams"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/tournaments')}>
                        <ListItemIcon><EmojiEvents/></ListItemIcon>
                        <ListItemText primary="Tournaments"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/previous')}>
                        <ListItemIcon><History/></ListItemIcon>
                        <ListItemText primary="Previous and Live Matches"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/scorecards')}>
                        <ListItemIcon><Assignment/></ListItemIcon>
                        <ListItemText primary="Scorecards"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/player/statistics')}>
                        <ListItemIcon><Leaderboard/></ListItemIcon>
                        <ListItemText primary="Player Statistics"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/upcoming')}>
                        <ListItemIcon><CalendarMonth/></ListItemIcon>
                        <ListItemText primary="Upcoming Matches"/>
                    </ListItemButton>
                </List>
            </Collapse>
        </Drawer>
    );
};
