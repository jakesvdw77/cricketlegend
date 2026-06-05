import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button,
  Avatar, Card, CardActionArea, Grid,
  Chip, MenuItem, TextField, Switch, FormControlLabel,
  IconButton, Tooltip, Menu,
} from '@mui/material';
import { ArrowBack, CheckCircle, Cancel, HelpOutline, NotificationsActive, WhatsApp, Share } from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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

interface MatchAvailabilityManagerProps {
  embedded?: boolean;
  matchIdProp?: number;
  preselectedTeamIdProp?: number;
  onAvailabilityCount?: (confirmed: number, total: number, pollOpen: boolean) => void;
}

export const MatchAvailabilityManager: React.FC<MatchAvailabilityManagerProps> = ({ embedded = false, matchIdProp, preselectedTeamIdProp, onAvailabilityCount }) => {
  const { matchId: matchIdParam } = useParams<{ matchId: string }>();
  const matchId = matchIdProp != null ? String(matchIdProp) : matchIdParam;
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;
  const preselectedTeamId: number | undefined = preselectedTeamIdProp ?? locationState?.teamId;
  const returnTo: string | undefined = locationState?.returnTo;
  const { teamIds: managerTeamIds, restrictByTeam } = useManagerTeams();
  const [match, setMatch] = useState<Match | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>(preselectedTeamId ?? '');
  const [poll, setPoll] = useState<MatchPoll | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'YES' | 'NO' | 'UNSURE' | 'NONE' | null>(null);
  const [overrideAnchor, setOverrideAnchor] = useState<{ el: HTMLElement; playerId: number } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [shareAnchor, setShareAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (matchId) matchApi.findById(Number(matchId)).then(setMatch);
  }, [matchId]);

  useEffect(() => {
    if (!onAvailabilityCount) return;
    const confirmed = poll?.availability?.filter(a => a.status === 'YES').length ?? 0;
    const total = poll?.availability?.length ?? 0;
    onAvailabilityCount(confirmed, total, poll?.open ?? false);
  }, [poll]);

  useEffect(() => {
    if (preselectedTeamId && matchId) loadPoll(preselectedTeamId);
  }, [preselectedTeamId, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleOverride = async (status: AvailabilityStatus) => {
    if (!matchId || !selectedTeamId || !overrideAnchor) return;
    const { playerId } = overrideAnchor;
    setOverrideAnchor(null);
    try {
      await pollApi.setPlayerAvailability(Number(matchId), selectedTeamId, playerId, status);
      loadPoll(selectedTeamId as number);
    } catch {
      setError('Failed to update player availability.');
    }
  };

  const displayedPlayers: PlayerAvailabilityEntry[] = poll?.availability?.filter(a =>
    statusFilter === null ? true :
    statusFilter === 'NONE' ? !a.status :
    a.status === statusFilter
  ) ?? [];

  return (
    <Box>
      {!embedded && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate(returnTo ?? '/admin/matches')}>
            Back
          </Button>
          <Typography variant="h5">Match Availability</Typography>
        </Box>
      )}

      <Paper sx={{ p: 2, mb: 3, position: 'relative' }}>
        {poll && (
          <>
            <Tooltip title="Share">
              <IconButton
                size="small"
                onClick={e => setShareAnchor(e.currentTarget)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <Share fontSize="small" />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={shareAnchor} open={!!shareAnchor} onClose={() => setShareAnchor(null)}>
              {poll.open && (
                <MenuItem
                  disabled={resending}
                  onClick={() => { setShareAnchor(null); handleResend(); }}
                >
                  {resending ? <CircularProgress size={16} sx={{ mr: 1 }} /> : <NotificationsActive fontSize="small" sx={{ mr: 1 }} />}
                  {resendSuccess ? 'Sent!' : 'Resend Notifications'}
                </MenuItem>
              )}
              <MenuItem onClick={() => { setShareAnchor(null); setWhatsAppOpen(true); }}>
                <WhatsApp fontSize="small" sx={{ mr: 1, color: '#25D366' }} />
                WhatsApp
              </MenuItem>
            </Menu>
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {!preselectedTeamId && (
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
          )}

          {poll && (
            <FormControlLabel
              control={
                <Switch
                  checked={poll.open}
                  onChange={e => handleTogglePoll(e.target.checked)}
                  color="success"
                  disabled={!!match?.matchCompleted}
                />
              }
              label={poll.open ? 'Poll Open' : 'Poll Closed'}
            />
          )}

          {!poll && selectedTeamId !== '' && !loading && !match?.matchCompleted && (
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
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {([
                { key: 'YES',    count: poll.availability?.filter(a => a.status === 'YES').length ?? 0,    label: 'Available',   color: 'success.main' },
                { key: 'NO',     count: poll.availability?.filter(a => a.status === 'NO').length ?? 0,     label: 'Unavailable', color: 'error.main' },
                { key: 'UNSURE', count: poll.availability?.filter(a => a.status === 'UNSURE').length ?? 0, label: 'Unsure',      color: 'warning.main' },
                { key: 'NONE',   count: poll.availability?.filter(a => !a.status).length ?? 0,             label: 'No Response', color: 'text.secondary' },
              ] as const).map(({ key, count, label, color }, i, arr) => {
                const active = statusFilter === key;
                return (
                  <Box
                    key={key}
                    onClick={() => setStatusFilter(active ? null : key)}
                    sx={{
                      px: 3, py: 1.25, textAlign: 'center', minWidth: 90, cursor: 'pointer',
                      borderRight: i < arr.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      bgcolor: active ? 'action.selected' : 'transparent',
                      transition: 'background-color 0.15s',
                      '&:hover': { bgcolor: active ? 'action.selected' : 'action.hover' },
                    }}
                  >
                    <Typography variant="h5" fontWeight="bold" sx={{ color, lineHeight: 1 }}>{count}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>{label}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          <Grid container spacing={2} justifyContent="center">
            {displayedPlayers.map(entry => {
              const canOverride = !match?.matchCompleted && poll?.open;
              const initials = entry.playerName
                .split(' ')
                .map(p => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const avatarBg =
                entry.status === 'YES' ? 'success.main' :
                entry.status === 'NO' ? 'error.main' :
                entry.status === 'UNSURE' ? 'warning.main' :
                'grey.400';
              return (
                <Grid item xs={6} sm={4} md={3} key={entry.playerId}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      bgcolor: 'background.paper',
                      borderColor:
                        entry.status === 'YES' ? 'success.main' :
                        entry.status === 'NO' ? 'error.main' :
                        entry.status === 'UNSURE' ? 'warning.main' :
                        'divider',
                    }}
                  >
                    <CardActionArea
                      disabled={!canOverride}
                      onClick={canOverride ? e => setOverrideAnchor({ el: e.currentTarget, playerId: entry.playerId }) : undefined}
                      sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, height: '100%' }}
                    >
                      <Avatar
                        src={entry.profilePictureUrl ?? undefined}
                        sx={{ bgcolor: avatarBg, width: 44, height: 44, fontSize: '0.9rem', fontWeight: 700 }}
                      >
                        {initials}
                      </Avatar>
                      <Typography variant="body2" align="center" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                        {entry.playerName}
                      </Typography>
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
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Menu
            anchorEl={overrideAnchor?.el}
            open={!!overrideAnchor}
            onClose={() => setOverrideAnchor(null)}
          >
            {(['YES', 'NO', 'UNSURE'] as AvailabilityStatus[]).map(s => (
              <MenuItem key={s} onClick={() => handleOverride(s)} selected={!!overrideAnchor && displayedPlayers.find(p => p.playerId === overrideAnchor.playerId)?.status === s}>
                <Chip label={STATUS_LABELS[s]} color={STATUS_COLOR[s]} size="small" sx={{ pointerEvents: 'none' }} />
              </MenuItem>
            ))}
          </Menu>
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
