import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Snackbar, Alert, CircularProgress } from '@mui/material';
import { Print, Sync } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi';
import { playerApi } from '../../api/playerApi';
import { Match, Player } from '../../types';
import { TeamSidePanel } from '../../components/match/TeamSidePanel';

export const Teamsheet: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const id = Number(matchId);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  useEffect(() => {
    matchApi.findById(id).then(setMatch);
    playerApi.findAll().then(setPlayers);
  }, [id]);

  const teamIds = match
    ? [match.homeTeamId, match.oppositionTeamId].filter(Boolean) as number[]
    : [];

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
      <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
        {teamIds.map(teamId => (
          <TeamSidePanel
            key={teamId}
            matchId={id}
            teamId={teamId}
            teamName={getTeamName(teamId)}
            players={players}
          />
        ))}
      </Box>

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
