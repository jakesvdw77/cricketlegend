import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Snackbar, Alert, CircularProgress,
  Tabs, Tab, Menu, MenuItem, IconButton, Tooltip, useTheme, useMediaQuery,
} from '@mui/material';
import { ArrowBack, Share, Sync, MoreVert, Visibility } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { playerApi } from '../../api/playerApi';
import { Match, MatchSide, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';
import TeamsheetTemplatesDialog from '../../components/match/TeamsheetTemplatesDialog';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const returnTo: string = (location.state as any)?.returnTo ?? '/admin/matches';
  const restrictToTeamId: number | undefined = (location.state as any)?.teamId;
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [squadsByTeam, setSquadsByTeam] = useState<Record<number, Player[]>>({});
  const [sides, setSides] = useState<MatchSide[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    Promise.all([
      matchApi.findById(id),
      matchApi.getTeamSheet(id),
      playerApi.findAll(),
    ]).then(([m, s, p]) => {
      setMatch(m);
      setSides(s);
      setAllPlayers(p);
      const teamIds = [m.homeTeamId, m.oppositionTeamId].filter(Boolean) as number[];
      Promise.all(teamIds.map(tid => teamApi.getSquad(tid).then(squad => ({ tid, squad }))))
        .then(results => {
          const map: Record<number, Player[]> = {};
          results.forEach(({ tid, squad }) => { map[tid] = squad; });
          setSquadsByTeam(map);
        });
    });
  }, [id]);

  const allTeamIds = match
    ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[]
    : [];
  const teamIds = restrictToTeamId
    ? allTeamIds.filter(id => id === restrictToTeamId)
    : allTeamIds;

  const getSquad = (teamId: number) => squadsByTeam[teamId] ?? [];

  const getTeamName = (teamId: number) =>
    teamId === match?.homeTeamId ? match?.homeTeamName ?? '' : match?.oppositionTeamName ?? '';

  const refreshCalendar = async () => {
    setSyncing(true);
    try {
      const refreshed = await matchApi.getTeamSheet(id);
      setSides(refreshed);
      const totalPlayers = refreshed.reduce((sum, s) => sum + (s.playingXi?.length ?? 0), 0);
      setSnackbar({
        open: true,
        message: totalPlayers > 0
          ? `Calendar entries refreshed for ${totalPlayers} player${totalPlayers !== 1 ? 's' : ''}.`
          : 'No players in the squad yet. Add players to update their calendars.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const eitherAnnounced = sides.some(s => s.teamAnnounced);

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo)} sx={{ flexShrink: 0 }}>
            {!isMobile && 'Back'}
          </Button>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={isMobile ? 'subtitle1' : 'h5'} noWrap>
              {isMobile
                ? `${match?.homeTeamName} vs ${match?.oppositionTeamName}`
                : `Team Sheet — ${match?.homeTeamName} vs ${match?.oppositionTeamName}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {match?.matchDate}{match?.fieldName ? ` | ${match.fieldName}` : ''}
            </Typography>
          </Box>
        </Box>

        {isMobile ? (
          <>
            <IconButton onClick={e => setMenuAnchor(e.currentTarget)} sx={{ flexShrink: 0 }}>
              <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu}>
              <Tooltip title={!eitherAnnounced ? 'Announce the team first to refresh calendars' : ''} placement="left">
                <span>
                  <MenuItem onClick={() => { closeMenu(); refreshCalendar(); }} disabled={syncing || !eitherAnnounced} sx={{ width: '100%' }}>
                    {syncing ? <CircularProgress size={16} sx={{ mr: 1 }} /> : <Sync fontSize="small" sx={{ mr: 1 }} />}
                    Refresh Calendar
                  </MenuItem>
                </span>
              </Tooltip>
              <Tooltip title={!eitherAnnounced ? 'Announce the team first to share' : ''} placement="left">
                <span>
                  <MenuItem onClick={() => { closeMenu(); setTemplatesOpen(true); }} disabled={!eitherAnnounced} sx={{ width: '100%' }}>
                    <Share fontSize="small" sx={{ mr: 1 }} /> Share / Templates
                  </MenuItem>
                </span>
              </Tooltip>
              <MenuItem onClick={() => { closeMenu(); navigate(`/matches/${id}/teamsheet`); }}>
                <Visibility fontSize="small" sx={{ mr: 1 }} /> View Team Sheet
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Tooltip title={!eitherAnnounced ? 'Announce the team first to refresh calendars' : ''}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
                  onClick={refreshCalendar}
                  disabled={syncing || !eitherAnnounced}
                >
                  Refresh Calendar
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={!eitherAnnounced ? 'Announce the team first to share' : ''}>
              <span>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={() => setTemplatesOpen(true)}
                  disabled={!eitherAnnounced}
                >
                  Share / Templates
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => navigate(`/matches/${id}/teamsheet`)}
            >
              View Team Sheet
            </Button>
          </Box>
        )}
      </Box>

      {teamIds.length > 1 && (
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 2, mb: 2 }}>
          {teamIds.map(teamId => (
            <Tab key={teamId} label={getTeamName(teamId)} />
          ))}
        </Tabs>
      )}

      {teamIds.map((teamId, idx) => (
        <Box key={teamId} hidden={activeTab !== idx} sx={{ mt: teamIds.length === 1 ? 2 : 0 }}>
          <TeamSidePanel
            matchId={id}
            teamId={teamId}
            teamName={getTeamName(teamId)}
            players={getSquad(teamId)}
          />
        </Box>
      ))}

      {match && (
        <TeamsheetTemplatesDialog
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          match={match}
          sides={sides}
          players={allPlayers}
        />
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
