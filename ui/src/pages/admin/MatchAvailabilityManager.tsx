import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip, MenuItem, TextField, Switch, FormControlLabel,
  IconButton, Tooltip,
} from '@mui/material';
import { ArrowBack, CheckCircle, Cancel, HelpOutline, Edit, NotificationsActive, WhatsApp } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { pollApi } from '../../api/pollApi';
import { matchApi } from '../../api/matchApi';
import { MatchPoll, PlayerAvailabilityEntry, AvailabilityStatus, Match } from '../../types';
import { useManagerTeams } from '../../hooks/useManagerTeams';
import PollWhatsAppDialog from './PollWhatsAppDialog';

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

export const MatchAvailabilityManager: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { teamIds: managerTeamIds, restrictByTeam } = useManagerTeams();
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [poll, setPoll] = useState<MatchPoll | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(false);
  const [overridePlayer, setOverridePlayer] = useState<number | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

  useEffect(() => {
    if (matchId) matchApi.findById(Number(matchId)).then(setMatch);
  }, [matchId]);

  const loadPoll = (teamId: number) => {
    if (!matchId) return;
    setLoading(true);
    setError(null);
    pollApi.getPoll(Number(matchId), teamId)
      .then(setPoll)
      .catch(() => setPoll(null))
      .finally(() => setLoading(false));
  };

  const handleTeamChange = (teamId: number) => {
    setSelectedTeamId(teamId);
    loadPoll(teamId);
  };

  const handleTogglePoll = async (open: boolean) => {
    if (!matchId || !selectedTeamId) return;
    try {
      const updated = await pollApi.togglePoll(Number(matchId), selectedTeamId, open);
      setPoll(updated);
    } catch {
      setError('Failed to update poll status.');
    }
  };

  const handleResend = async () => {
    if (!matchId || !selectedTeamId) return;
    setResending(true);
    setResendSuccess(false);
    try {
      await pollApi.resendNotifications(Number(matchId), selectedTeamId as number);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch {
      setError('Failed to resend notifications.');
    } finally {
      setResending(false);
    }
  };

  const handleOverride = async (playerId: number, status: AvailabilityStatus) => {
    if (!matchId || !selectedTeamId) return;
    try {
      await pollApi.setPlayerAvailability(Number(matchId), selectedTeamId, playerId, status);
      setOverridePlayer(null);
      loadPoll(selectedTeamId as number);
    } catch {
      setError('Failed to update player availability.');
    }
  };

  const displayedPlayers: PlayerAvailabilityEntry[] = poll?.availability?.filter(a =>
    !showOnlyConfirmed || a.status === 'YES'
  ) ?? [];

  const confirmedCount = poll?.availability?.filter(a => a.status === 'YES').length ?? 0;
  const totalCount = poll?.availability?.length ?? 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/admin/matches')}>
          Back
        </Button>
        <Typography variant="h5">Match Availability</Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Team"
            size="small"
            value={selectedTeamId}
            onChange={e => handleTeamChange(Number(e.target.value))}
            sx={{ minWidth: 200 }}
          >
            {match?.homeTeamId && (!restrictByTeam || managerTeamIds.has(match.homeTeamId)) && (
              <MenuItem value={match.homeTeamId}>{match.homeTeamName}</MenuItem>
            )}
            {match?.oppositionTeamId && (!restrictByTeam || managerTeamIds.has(match.oppositionTeamId)) && (
              <MenuItem value={match.oppositionTeamId}>{match.oppositionTeamName}</MenuItem>
            )}
          </TextField>

          {poll && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={poll.open}
                    onChange={e => handleTogglePoll(e.target.checked)}
                    color="success"
                  />
                }
                label={poll.open ? 'Poll Open' : 'Poll Closed'}
              />
              {poll.open && (
                <Tooltip title="Resend in-app and email notifications to all squad members">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={resending ? <CircularProgress size={16} /> : <NotificationsActive />}
                      onClick={handleResend}
                      disabled={resending}
                      color={resendSuccess ? 'success' : 'primary'}
                    >
                      {resendSuccess ? 'Sent!' : 'Resend Notifications'}
                    </Button>
                  </span>
                </Tooltip>
              )}
              <Tooltip title="Generate WhatsApp message for this poll">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<WhatsApp />}
                  onClick={() => setWhatsAppOpen(true)}
                  sx={{ color: '#25D366', borderColor: '#25D366', '&:hover': { borderColor: '#128C7E', color: '#128C7E' } }}
                >
                  WhatsApp
                </Button>
              </Tooltip>
            </>
          )}

          {!poll && selectedTeamId !== '' && !loading && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1, display: 'inline' }}>
                No poll exists yet.
              </Typography>
              <Chip
                label="Open Poll"
                color="primary"
                clickable
                onClick={() => handleTogglePoll(true)}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}

      {poll && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">{poll.homeTeamName} vs {poll.oppositionTeamName}</Typography>
            <Typography color="text.secondary">{poll.matchDate}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Confirmed available: <strong>{confirmedCount}</strong> / {totalCount}
            </Typography>
          </Paper>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyConfirmed}
                  onChange={e => setShowOnlyConfirmed(e.target.checked)}
                />
              }
              label="Show only confirmed (Yes)"
            />
          </Box>

          <TableContainer component={Paper}>
            <Table size="small" sx={{
              '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'primary.main', color: 'common.white', fontWeight: 'bold' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(odd)': { bgcolor: 'grey.50' },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': { bgcolor: 'common.white' },
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Availability</TableCell>
                  <TableCell>Override</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedPlayers.map(entry => (
                  <TableRow key={entry.playerId}>
                    <TableCell>{entry.playerName}</TableCell>
                    <TableCell>
                      {entry.status ? (
                        <Chip
                          label={STATUS_LABELS[entry.status]}
                          color={STATUS_COLOR[entry.status]}
                          size="small"
                          icon={
                            entry.status === 'YES' ? <CheckCircle /> :
                            entry.status === 'NO' ? <Cancel /> :
                            <HelpOutline />
                          }
                        />
                      ) : (
                        <Chip label="No response" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {overridePlayer === entry.playerId ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {(['YES', 'NO', 'UNSURE'] as AvailabilityStatus[]).map(s => (
                            <Chip
                              key={s}
                              label={STATUS_LABELS[s]}
                              color={STATUS_COLOR[s]}
                              size="small"
                              clickable
                              variant={entry.status === s ? 'filled' : 'outlined'}
                              onClick={() => handleOverride(entry.playerId, s)}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Tooltip title="Override availability">
                          <IconButton size="small" onClick={() => setOverridePlayer(entry.playerId)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {match && poll && (
        <PollWhatsAppDialog
          open={whatsAppOpen}
          onClose={() => setWhatsAppOpen(false)}
          match={match}
          poll={poll}
        />
      )}
    </Box>
  );
};
