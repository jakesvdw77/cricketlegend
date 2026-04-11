import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert,
  ToggleButtonGroup, ToggleButton, Chip, Divider,
} from '@mui/material';
import { CheckCircle, Cancel, HelpOutline } from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import { pollApi } from '../../api/pollApi';
import { MatchPoll, AvailabilityStatus, PlayerAvailabilityEntry } from '../../types';

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  YES: 'Available',
  NO: 'Not Available',
  UNSURE: 'Unsure',
};

const STATUS_COLOR: Record<AvailabilityStatus, 'success' | 'error' | 'warning'> = {
  YES: 'success',
  NO: 'error',
  UNSURE: 'warning',
};

export const MatchAvailabilityPoll: React.FC = () => {
  const { matchId, teamId } = useParams<{ matchId: string; teamId: string }>();
  const [poll, setPoll] = useState<MatchPoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [myStatus, setMyStatus] = useState<AvailabilityStatus | null>(null);

  useEffect(() => {
    if (!matchId || !teamId) return;
    setLoading(true);
    pollApi.getPoll(Number(matchId), Number(teamId))
      .then(data => {
        setPoll(data);
        // Player's own status is reflected after submitting and re-fetching
      })
      .catch(() => setError('Poll not found or not available.'))
      .finally(() => setLoading(false));
  }, [matchId, teamId]);

  const handleStatusChange = async (_: React.MouseEvent, value: AvailabilityStatus | null) => {
    if (!value || !matchId || !teamId) return;
    setSaving(true);
    try {
      await pollApi.setMyAvailability(Number(matchId), Number(teamId), value);
      setMyStatus(value);
      // Refresh poll
      const updated = await pollApi.getPoll(Number(matchId), Number(teamId));
      setPoll(updated);
    } catch {
      setError('Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  if (!poll) return null;

  if (!poll.open) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
        <Alert severity="info">This availability poll is currently closed.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>Availability Poll</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6">{poll.homeTeamName} vs {poll.oppositionTeamName}</Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>{poll.matchDate}</Typography>
        <Typography variant="body2" color="text.secondary">Team: {poll.teamName}</Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Your Availability</Typography>
        <ToggleButtonGroup
          value={myStatus}
          exclusive
          onChange={handleStatusChange}
          disabled={saving}
          sx={{ gap: 1, flexWrap: 'wrap' }}
        >
          <ToggleButton value="YES" color="success" sx={{ px: 3 }}>
            <CheckCircle sx={{ mr: 1 }} /> Yes
          </ToggleButton>
          <ToggleButton value="NO" color="error" sx={{ px: 3 }}>
            <Cancel sx={{ mr: 1 }} /> No
          </ToggleButton>
          <ToggleButton value="UNSURE" color="warning" sx={{ px: 3 }}>
            <HelpOutline sx={{ mr: 1 }} /> Unsure
          </ToggleButton>
        </ToggleButtonGroup>
        {myStatus && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your response: <strong>{STATUS_LABELS[myStatus]}</strong>
          </Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Squad Availability ({poll.availability?.length ?? 0} members)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {poll.availability?.map((entry: PlayerAvailabilityEntry) => (
          <Box key={entry.playerId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.75 }}>
            <Typography variant="body2">{entry.playerName}</Typography>
            {entry.status ? (
              <Chip
                label={STATUS_LABELS[entry.status]}
                color={STATUS_COLOR[entry.status]}
                size="small"
              />
            ) : (
              <Chip label="No response" size="small" variant="outlined" />
            )}
          </Box>
        ))}
      </Paper>
    </Box>
  );
};
