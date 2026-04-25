import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import { ArrowBack, Print, Sync } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { teamApi } from '../../api/teamApi';
import { Match, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [squadsByTeam, setSquadsByTeam] = useState<Record<number, Player[]>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    matchApi.findById(id).then(m => {
      setMatch(m);
      const teamIds = [m.homeTeamId, m.oppositionTeamId].filter(Boolean) as number[];
      Promise.all(teamIds.map(tid => teamApi.getSquad(tid).then(squad => ({ tid, squad }))))
        .then(results => {
          const map: Record<number, Player[]> = {};
          results.forEach(({ tid, squad }) => { map[tid] = squad; });
          setSquadsByTeam(map);
        });
    });
  }, [id]);

  const teamIds = match
    ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[]
    : [];

  const getSquad = (teamId: number) => squadsByTeam[teamId] ?? [];

  const getTeamName = (teamId: number) =>
    teamId === match?.homeTeamId ? match?.homeTeamName ?? '' : match?.oppositionTeamName ?? '';

  const refreshCalendar = async () => {
    setSyncing(true);
    try {
      const sides = await matchApi.getTeamSheet(id);
      const totalPlayers = sides.reduce((sum, s) => sum + (s.playingXi?.length ?? 0), 0);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">
            Team Sheet — {match?.homeTeamName} vs {match?.oppositionTeamName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {match?.matchDate} | {match?.fieldName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/admin/matches')}
          >
            Back
          </Button>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
            onClick={refreshCalendar}
            disabled={syncing}
          >
            Refresh Calendar
          </Button>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={() => navigate(`/matches/${id}/teamsheet`)}
          >
            Print / Export PDF
          </Button>
        </Box>
      </Box>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 2, mb: 2 }}>
        {teamIds.map(teamId => (
          <Tab key={teamId} label={getTeamName(teamId)} />
        ))}
      </Tabs>
      {teamIds.map((teamId, idx) => (
        <Box key={teamId} hidden={activeTab !== idx}>
          <TeamSidePanel
            matchId={id}
            teamId={teamId}
            teamName={getTeamName(teamId)}
            players={getSquad(teamId)}
          />
        </Box>
      ))}

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
