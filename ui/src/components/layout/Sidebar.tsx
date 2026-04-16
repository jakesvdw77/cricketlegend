import React, {useState} from 'react';
import {
    Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Collapse, Divider, IconButton, Toolbar, Typography, Box,
    useMediaQuery, useTheme,
} from '@mui/material';
import {
    EmojiEvents, Groups, Person, SportsScore, Assignment,
    ExpandLess, ExpandMore, ChevronLeft, SportsCricket,
    History, Leaderboard, CalendarMonth, Grass, Shield, Star, Payments, HowToVote, ManageAccounts,
    PermMedia, Campaign, Home, AdminPanelSettings, AccountBalance, Lock, Sensors,
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    type Section = 'capture' | 'financials' | 'access' | 'view';
    const [openSection, setOpenSection] = useState<Section>('view');
    const toggle = (s: Section) => setOpenSection(prev => prev === s ? 'view' : s);

    const captureOpen   = openSection === 'capture';
    const financialsOpen = openSection === 'financials';
    const accessOpen    = openSection === 'access';
    const viewOpen      = openSection === 'view';

    const go = (path: string) => { navigate(path); if (isMobile) onClose(); };

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            anchor="left"
            open={open}
            onClose={onClose}
            sx={{width: !isMobile && open ? DRAWER_WIDTH : 0, flexShrink: 0, transition: 'width 0.2s', '& .MuiDrawer-paper': {width: DRAWER_WIDTH, display: 'flex', flexDirection: 'column'}}}
        >
            <Toolbar sx={{display: 'flex', justifyContent: 'space-between', flexShrink: 0}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    <SportsCricket color="primary"/>
                    <Typography variant="subtitle1" fontWeight="bold">Cricket Legend</Typography>
                </Box>
                <IconButton onClick={onClose}><ChevronLeft/></IconButton>
            </Toolbar>
            <Divider sx={{flexShrink: 0}}/>

            <Box sx={{overflowY: 'auto', flex: 1}}>

            <List disablePadding>
                <ListItemButton onClick={() => toggle('view')}>
                    <ListItemIcon><Home/></ListItemIcon>
                    <ListItemText primary="Home" primaryTypographyProps={{fontWeight: 'bold'}}/>
                    {viewOpen ? <ExpandLess/> : <ExpandMore/>}
                </ListItemButton>
            </List>
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
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/live')}>
                        <ListItemIcon><Sensors /></ListItemIcon>
                        <ListItemText primary="Live Matches"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/previous')}>
                        <ListItemIcon><History/></ListItemIcon>
                        <ListItemText primary="Results"/>
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
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-availability')}>
                        <ListItemIcon><HowToVote/></ListItemIcon>
                        <ListItemText primary="My Availability"/>
                    </ListItemButton>
                </List>
            </Collapse>
            <Divider/>

            {(isAdmin || isManager) ? (
                <>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('capture')}>
                            <ListItemIcon><AdminPanelSettings/></ListItemIcon>
                            <ListItemText primary="Administration" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {captureOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
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

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/media')}>
                                <ListItemIcon><PermMedia/></ListItemIcon>
                                <ListItemText primary="Media Library"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/send-notification')}>
                                <ListItemIcon><Campaign/></ListItemIcon>
                                <ListItemText primary="Send Notification"/>
                            </ListItemButton>

                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            {isAdmin ? (
                <>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('financials')}>
                            <ListItemIcon><AccountBalance/></ListItemIcon>
                            <ListItemText primary="Financials" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {financialsOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
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

                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('access')}>
                            <ListItemIcon><Lock/></ListItemIcon>
                            <ListItemText primary="Permissions" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {accessOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={accessOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/managers')}>
                                <ListItemIcon><ManageAccounts/></ListItemIcon>
                                <ListItemText primary="Managers"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/manager-teams')}>
                                <ListItemIcon><ManageAccounts/></ListItemIcon>
                                <ListItemText primary="Manager Teams"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            </Box>
        </Drawer>
    );
};
