import React, {useState} from 'react';
import {
    Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Collapse, Divider, IconButton, Toolbar, Box,
    useMediaQuery, useTheme,
} from '@mui/material';
import {
    EmojiEvents, Groups, Person, SportsScore, Assignment,
    ExpandLess, ExpandMore, ChevronLeft,
    History, Leaderboard, CalendarMonth, Grass, Shield, Star, Payments, HowToVote, ManageAccounts,
    PermMedia, Campaign, AdminPanelSettings, AccountBalance, Lock, Sensors, BarChart, AccountBalanceWallet, PieChart, Login, Event, Settings, Email, Psychology, QueryStats,
} from '@mui/icons-material';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';
import {useSidebar} from '../../context/SidebarContext';

const DRAWER_WIDTH = 240;

interface Props {
    open: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({open, onClose}) => {
    const navigate = useNavigate();
    const {isAdmin, isManager, isFinancialAdmin} = useAuth();
    const { autoCollapse } = useSidebar();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    type Section = 'capture' | 'financials' | 'access' | 'view' | 'matchCentre' | 'administration' | 'manageClub' | 'financeManager' | 'teamManager';
    const [openSection, setOpenSection] = useState<Section>('view');
    const toggle = (s: Section) => setOpenSection(prev => prev === s ? 'view' : s);

    const captureOpen        = openSection === 'capture';
    const financialsOpen     = openSection === 'financials';
    const accessOpen         = openSection === 'access';
    const viewOpen           = openSection === 'view';
    const matchCentreOpen    = openSection === 'matchCentre';
    const administrationOpen = openSection === 'administration';
    const manageClubOpen     = openSection === 'manageClub';
    const financeManagerOpen = openSection === 'financeManager';
    const teamManagerOpen    = openSection === 'teamManager';

    const go = (path: string) => { navigate(path); if (isMobile || autoCollapse) onClose(); };

    return (
        <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            anchor="left"
            open={open}
            onClose={onClose}
            sx={{width: !isMobile && open ? DRAWER_WIDTH : 0, flexShrink: 0, transition: 'width 0.2s', '& .MuiDrawer-paper': {width: DRAWER_WIDTH, display: 'flex', flexDirection: 'column'}}}
        >
            <Toolbar sx={{display: 'flex', justifyContent: 'space-between', flexShrink: 0, px: 1}}>
                <Box
                    component="img"
                    src="/cricket_legend_banner_final.svg"
                    alt="Cricket Legend"
                    sx={{ height: 40, width: 'auto', maxWidth: 160, opacity: 0.18, objectFit: 'contain' }}
                />
                <IconButton onClick={onClose}><ChevronLeft/></IconButton>
            </Toolbar>
            <Divider sx={{flexShrink: 0}}/>

            <Box sx={{overflowY: 'auto', flex: 1}}>

            <List disablePadding>
                <ListItemButton onClick={() => go('/profile')}>
                    <ListItemIcon><Person/></ListItemIcon>
                    <ListItemText primary="Player" primaryTypographyProps={{fontWeight: 'bold'}}/>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); toggle('view'); }}>
                        {viewOpen ? <ExpandLess/> : <ExpandMore/>}
                    </IconButton>
                </ListItemButton>
            </List>
            <Collapse in={viewOpen} timeout="auto" unmountOnExit>
                <List disablePadding>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-club')}>
                        <ListItemIcon><Shield/></ListItemIcon>
                        <ListItemText primary="My Club"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/teams')}>
                        <ListItemIcon><Groups/></ListItemIcon>
                        <ListItemText primary="My Teams"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-availability')}>
                        <ListItemIcon><HowToVote/></ListItemIcon>
                        <ListItemText primary="My Availability"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-schedule')}>
                        <ListItemIcon><CalendarMonth/></ListItemIcon>
                        <ListItemText primary="My Calendar"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/game-schedule')}>
                        <ListItemIcon><Assignment/></ListItemIcon>
                        <ListItemText primary="My Games"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/game-results')}>
                        <ListItemIcon><SportsScore/></ListItemIcon>
                        <ListItemText primary="My Results"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-wallet')}>
                        <ListItemIcon><AccountBalanceWallet/></ListItemIcon>
                        <ListItemText primary="My Wallet"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/field-directory')}>
                        <ListItemIcon><Grass/></ListItemIcon>
                        <ListItemText primary="Field Directory"/>
                    </ListItemButton>
                    <ListItemButton sx={{pl: 3}} onClick={() => go('/my-media')}>
                        <ListItemIcon><PermMedia/></ListItemIcon>
                        <ListItemText primary="Media Library"/>
                    </ListItemButton>
                </List>
            </Collapse>
            <Divider/>

            {(isAdmin || isManager) ? (
                <>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('manageClub')}>
                            <ListItemIcon><ManageAccounts/></ListItemIcon>
                            <ListItemText primary="Club Manager" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {manageClubOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={manageClubOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/club')}>
                                <ListItemIcon><Shield/></ListItemIcon>
                                <ListItemText primary="Manage Club"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/teams')}>
                                <ListItemIcon><Groups/></ListItemIcon>
                                <ListItemText primary="Manage Teams"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/players')}>
                                <ListItemIcon><Person/></ListItemIcon>
                                <ListItemText primary="Manage Players"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/events')}>
                                <ListItemIcon><Event/></ListItemIcon>
                                <ListItemText primary="Event Manager"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/send-notification')}>
                                <ListItemIcon><Campaign/></ListItemIcon>
                                <ListItemText primary="Notifications"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/media')}>
                                <ListItemIcon><PermMedia/></ListItemIcon>
                                <ListItemText primary="Media Library"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>

                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('teamManager')}>
                            <ListItemIcon><Groups/></ListItemIcon>
                            <ListItemText primary="Team Manager" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {teamManagerOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={teamManagerOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-tournaments')}>
                                <ListItemIcon><EmojiEvents/></ListItemIcon>
                                <ListItemText primary="Team Tournaments"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-schedule')}>
                                <ListItemIcon><Assignment/></ListItemIcon>
                                <ListItemText primary="Team Schedule"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-availability')}>
                                <ListItemIcon><HowToVote/></ListItemIcon>
                                <ListItemText primary="Team Availability"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-selection')}>
                                <ListItemIcon><Groups/></ListItemIcon>
                                <ListItemText primary="Team Selection"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-results')}>
                                <ListItemIcon><SportsScore/></ListItemIcon>
                                <ListItemText primary="Team Results"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/manage-club/team-rotation')}>
                                <ListItemIcon><QueryStats/></ListItemIcon>
                                <ListItemText primary="Team Stats"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            {(isAdmin || isFinancialAdmin) ? (
                <>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('financeManager')}>
                            <ListItemIcon><AccountBalance/></ListItemIcon>
                            <ListItemText primary="Finance Admin" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {financeManagerOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={financeManagerOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/finance/payments')}>
                                <ListItemIcon><Payments/></ListItemIcon>
                                <ListItemText primary="Payments"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/finance/allocation')}>
                                <ListItemIcon><PieChart/></ListItemIcon>
                                <ListItemText primary="Fund Allocation"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            {isAdmin ? (
                <>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('capture')}>
                            <ListItemIcon><AdminPanelSettings/></ListItemIcon>
                            <ListItemText primary="Administrator" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {captureOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={captureOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/clubs')}>
                                <ListItemIcon><Shield/></ListItemIcon>
                                <ListItemText primary="Clubs"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/fields')}>
                                <ListItemIcon><Grass/></ListItemIcon>
                                <ListItemText primary="Fields"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/tournaments')}>
                                <ListItemIcon><EmojiEvents/></ListItemIcon>
                                <ListItemText primary="Tournaments"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/players')}>
                                <ListItemIcon><Person/></ListItemIcon>
                                <ListItemText primary="Players"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/teams')}>
                                <ListItemIcon><Groups/></ListItemIcon>
                                <ListItemText primary="Teams"/>
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
                                <ListItemText primary="Notifications"/>
                            </ListItemButton>

                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/events')}>
                                <ListItemIcon><Event/></ListItemIcon>
                                <ListItemText primary="Events"/>
                            </ListItemButton>

                        </List>
                    </Collapse>
                    <Divider/>

                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('financials')}>
                            <ListItemIcon><AccountBalance/></ListItemIcon>
                            <ListItemText primary="Finance Admin" primaryTypographyProps={{fontWeight: 'bold'}}/>
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
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/fund-allocation')}>
                                <ListItemIcon><PieChart/></ListItemIcon>
                                <ListItemText primary="Fund Allocation"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/reports')}>
                                <ListItemIcon><BarChart/></ListItemIcon>
                                <ListItemText primary="Reports"/>
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
                                <ListItemText primary="Team Managers"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/financial-admins')}>
                                <ListItemIcon><AccountBalance/></ListItemIcon>
                                <ListItemText primary="Financial Admins"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>

                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('administration')}>
                            <ListItemIcon><AdminPanelSettings/></ListItemIcon>
                            <ListItemText primary="System Admin" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {administrationOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={administrationOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/setup')}>
                                <ListItemIcon><Settings/></ListItemIcon>
                                <ListItemText primary="Page Setup"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/email-settings')}>
                                <ListItemIcon><Email/></ListItemIcon>
                                <ListItemText primary="Email Settings"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/ai-settings')}>
                                <ListItemIcon><Psychology/></ListItemIcon>
                                <ListItemText primary="AI Settings"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/admin/login-history')}>
                                <ListItemIcon><Login/></ListItemIcon>
                                <ListItemText primary="Login History"/>
                            </ListItemButton>
                        </List>
                    </Collapse>
                    <Divider/>
                </>
            ) : null}

            {isAdmin && (
                <>
                    <Divider/>
                    <List disablePadding>
                        <ListItemButton onClick={() => toggle('matchCentre')}>
                            <ListItemIcon><SportsScore/></ListItemIcon>
                            <ListItemText primary="Match Centre" primaryTypographyProps={{fontWeight: 'bold'}}/>
                            {matchCentreOpen ? <ExpandLess/> : <ExpandMore/>}
                        </ListItemButton>
                    </List>
                    <Collapse in={matchCentreOpen} timeout="auto" unmountOnExit>
                        <List disablePadding>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/tournaments')}>
                                <ListItemIcon><EmojiEvents/></ListItemIcon>
                                <ListItemText primary="Tournaments"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/live')}>
                                <ListItemIcon><Sensors/></ListItemIcon>
                                <ListItemText primary="Live Matches"/>
                            </ListItemButton>
                            <ListItemButton sx={{pl: 3}} onClick={() => go('/matches/upcoming')}>
                                <ListItemIcon><CalendarMonth/></ListItemIcon>
                                <ListItemText primary="Matches"/>
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
                        </List>
                    </Collapse>
                </>
            )}

            </Box>
        </Drawer>
    );
};
